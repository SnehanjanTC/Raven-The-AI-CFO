"""
Zoho Books API Integration
OAuth 2.0 Self-Client flow: exchange grant token → access + refresh tokens.
All Zoho API calls are proxied through this backend to keep credentials secure.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import httpx
import time
import json

from app.core.security import encrypt_value, decrypt_value

router = APIRouter()

# ── In-memory token store (per-session; persisted via encrypted DB in production) ─
_token_store: dict = {}

# ── Region → URL mapping ──────────────────────────────────────────────────────────
ACCOUNTS_URLS = {
    "us": "https://accounts.zoho.com",
    "eu": "https://accounts.zoho.eu",
    "in": "https://accounts.zoho.in",
    "au": "https://accounts.zoho.com.au",
    "jp": "https://accounts.zoho.jp",
    "ca": "https://accounts.zoho.ca",
}

API_URLS = {
    "us": "https://www.zohoapis.com",
    "eu": "https://www.zohoapis.eu",
    "in": "https://www.zohoapis.in",
    "au": "https://www.zohoapis.com.au",
    "jp": "https://www.zohoapis.jp",
    "ca": "https://www.zohoapis.ca",
}


# ── Schemas ────────────────────────────────────────────────────────────────────────

class ZohoConnectRequest(BaseModel):
    client_id: str
    client_secret: str
    grant_token: str
    region: str = "in"  # default India


class ZohoRefreshRequest(BaseModel):
    client_id: str
    client_secret: str
    refresh_token: str
    region: str = "in"


class ZohoTokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    expires_in: int
    api_domain: Optional[str] = None
    token_type: str = "Zoho-oauthtoken"


# ── Helpers ────────────────────────────────────────────────────────────────────────

def _accounts_url(region: str) -> str:
    return ACCOUNTS_URLS.get(region, ACCOUNTS_URLS["in"])


def _api_url(region: str) -> str:
    return API_URLS.get(region, API_URLS["in"])


def _get_active_token() -> Optional[str]:
    """Return stored access token if not expired."""
    if not _token_store:
        return None
    expires_at = _token_store.get("expires_at", 0)
    if time.time() >= expires_at - 60:  # 60s safety margin
        return None
    return _token_store.get("access_token")


async def _refresh_access_token() -> str:
    """Use stored refresh token to get a new access token."""
    if not _token_store.get("refresh_token"):
        raise HTTPException(status_code=401, detail="No refresh token stored. Please reconnect Zoho Books.")

    accounts_url = _accounts_url(_token_store.get("region", "in"))
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{accounts_url}/oauth/v2/token",
            data={
                "client_id": _token_store["client_id"],
                "client_secret": _token_store["client_secret"],
                "grant_type": "refresh_token",
                "refresh_token": _token_store["refresh_token"],
            },
        )

    data = resp.json()
    if "access_token" not in data:
        raise HTTPException(status_code=401, detail=f"Token refresh failed: {data.get('error', 'unknown error')}")

    _token_store["access_token"] = data["access_token"]
    _token_store["expires_at"] = time.time() + data.get("expires_in", 3600)
    return data["access_token"]


async def _get_token() -> str:
    """Get a valid access token, refreshing if needed."""
    token = _get_active_token()
    if token:
        return token
    return await _refresh_access_token()


async def _zoho_get(path: str, params: dict = None) -> dict:
    """Make authenticated GET request to Zoho Books API."""
    token = await _get_token()
    region = _token_store.get("region", "in")
    org_id = _token_store.get("organization_id")
    base = _api_url(region)

    request_params = params or {}
    if org_id:
        request_params["organization_id"] = org_id

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{base}/books/v3{path}",
            headers={"Authorization": f"Zoho-oauthtoken {token}"},
            params=request_params,
            timeout=30.0,
        )

    if resp.status_code == 401:
        # Token expired mid-request, refresh and retry once
        token = await _refresh_access_token()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{base}/books/v3{path}",
                headers={"Authorization": f"Zoho-oauthtoken {token}"},
                params=request_params,
                timeout=30.0,
            )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Zoho API error: {resp.text}")

    return resp.json()


# ── Auth Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/connect", response_model=ZohoTokenResponse)
async def connect_zoho(data: ZohoConnectRequest):
    """Exchange a self-client grant token for access + refresh tokens."""
    accounts_url = _accounts_url(data.region)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{accounts_url}/oauth/v2/token",
            data={
                "client_id": data.client_id,
                "client_secret": data.client_secret,
                "grant_type": "authorization_code",
                "code": data.grant_token,
            },
        )

    token_data = resp.json()

    if "access_token" not in token_data:
        raise HTTPException(
            status_code=400,
            detail=f"Token exchange failed: {token_data.get('error', 'unknown error')}",
        )

    # Store tokens in memory
    _token_store.update({
        "access_token": token_data["access_token"],
        "refresh_token": token_data.get("refresh_token"),
        "expires_at": time.time() + token_data.get("expires_in", 3600),
        "api_domain": token_data.get("api_domain"),
        "client_id": data.client_id,
        "client_secret": data.client_secret,
        "region": data.region,
    })

    return ZohoTokenResponse(
        access_token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        expires_in=token_data.get("expires_in", 3600),
        api_domain=token_data.get("api_domain"),
    )


@router.post("/refresh", response_model=ZohoTokenResponse)
async def refresh_zoho(data: ZohoRefreshRequest):
    """Refresh an access token using a stored refresh token."""
    accounts_url = _accounts_url(data.region)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{accounts_url}/oauth/v2/token",
            data={
                "client_id": data.client_id,
                "client_secret": data.client_secret,
                "grant_type": "refresh_token",
                "refresh_token": data.refresh_token,
            },
        )

    token_data = resp.json()

    if "access_token" not in token_data:
        raise HTTPException(
            status_code=400,
            detail=f"Token refresh failed: {token_data.get('error', 'unknown error')}",
        )

    _token_store.update({
        "access_token": token_data["access_token"],
        "expires_at": time.time() + token_data.get("expires_in", 3600),
        "client_id": data.client_id,
        "client_secret": data.client_secret,
        "refresh_token": data.refresh_token,
        "region": data.region,
    })

    return ZohoTokenResponse(
        access_token=token_data["access_token"],
        expires_in=token_data.get("expires_in", 3600),
        api_domain=token_data.get("api_domain"),
    )


@router.get("/status")
async def zoho_status():
    """Check current Zoho connection status."""
    if not _token_store.get("access_token"):
        return {"connected": False, "message": "Not connected"}

    token = _get_active_token()
    return {
        "connected": True,
        "token_valid": token is not None,
        "organization_id": _token_store.get("organization_id"),
        "region": _token_store.get("region", "in"),
        "expires_at": _token_store.get("expires_at"),
    }


@router.post("/disconnect")
async def disconnect_zoho():
    """Clear stored Zoho tokens."""
    _token_store.clear()
    return {"message": "Zoho Books disconnected"}


# ── Organization ───────────────────────────────────────────────────────────────────

@router.get("/organizations")
async def list_organizations():
    """List Zoho organizations to pick organization_id."""
    token = await _get_token()
    region = _token_store.get("region", "in")
    base = _api_url(region)

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{base}/books/v3/organizations",
            headers={"Authorization": f"Zoho-oauthtoken {token}"},
            timeout=30.0,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Failed to list organizations: {resp.text}")

    data = resp.json()
    orgs = data.get("organizations", [])

    # Auto-select first org if only one
    if len(orgs) == 1:
        _token_store["organization_id"] = orgs[0]["organization_id"]

    return {"organizations": orgs}


@router.post("/organizations/{org_id}/select")
async def select_organization(org_id: str):
    """Set active organization."""
    _token_store["organization_id"] = org_id
    return {"message": f"Organization {org_id} selected", "organization_id": org_id}


# ── Invoices ───────────────────────────────────────────────────────────────────────

@router.get("/invoices")
async def list_invoices(page: int = 1, per_page: int = 200, status: Optional[str] = None):
    """List invoices from Zoho Books."""
    params = {"page": page, "per_page": per_page}
    if status:
        params["status"] = status
    return await _zoho_get("/invoices", params)


@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str):
    """Get a single invoice."""
    return await _zoho_get(f"/invoices/{invoice_id}")


# ── Bills ──────────────────────────────────────────────────────────────────────────

@router.get("/bills")
async def list_bills(page: int = 1, per_page: int = 200, status: Optional[str] = None):
    """List bills from Zoho Books."""
    params = {"page": page, "per_page": per_page}
    if status:
        params["status"] = status
    return await _zoho_get("/bills", params)


@router.get("/bills/{bill_id}")
async def get_bill(bill_id: str):
    """Get a single bill."""
    return await _zoho_get(f"/bills/{bill_id}")


# ── Contacts (Customers + Vendors) ────────────────────────────────────────────────

@router.get("/contacts")
async def list_contacts(
    page: int = 1,
    per_page: int = 200,
    contact_type: Optional[str] = None,
):
    """List contacts from Zoho Books. contact_type: customer or vendor."""
    params = {"page": page, "per_page": per_page}
    if contact_type:
        params["contact_type"] = contact_type
    return await _zoho_get("/contacts", params)


@router.get("/contacts/{contact_id}")
async def get_contact(contact_id: str):
    """Get a single contact."""
    return await _zoho_get(f"/contacts/{contact_id}")


# ── Chart of Accounts ─────────────────────────────────────────────────────────────

@router.get("/chartofaccounts")
async def list_chart_of_accounts(
    account_type: Optional[str] = None,
    filter_status: Optional[str] = None,
):
    """List chart of accounts. filter_status: Status.Active or Status.Inactive."""
    params = {}
    if account_type:
        params["account_type"] = account_type
    if filter_status:
        params["filter_status"] = filter_status
    return await _zoho_get("/chartofaccounts", params)


@router.get("/chartofaccounts/{account_id}")
async def get_account(account_id: str):
    """Get a single account."""
    return await _zoho_get(f"/chartofaccounts/{account_id}")


@router.get("/chartofaccounts/{account_id}/transactions")
async def get_account_transactions(account_id: str, page: int = 1, per_page: int = 200):
    """List transactions for a specific account."""
    return await _zoho_get(f"/chartofaccounts/{account_id}/transactions", {"page": page, "per_page": per_page})


# ── Bank Transactions ──────────────────────────────────────────────────────────────

@router.get("/banktransactions")
async def list_bank_transactions(page: int = 1, per_page: int = 200):
    """List bank transactions."""
    return await _zoho_get("/banktransactions", {"page": page, "per_page": per_page})


@router.get("/banktransactions/{transaction_id}")
async def get_bank_transaction(transaction_id: str):
    """Get a single bank transaction."""
    return await _zoho_get(f"/banktransactions/{transaction_id}")


# ── Journals ───────────────────────────────────────────────────────────────────────

@router.get("/journals")
async def list_journals(page: int = 1, per_page: int = 200):
    """List journal entries."""
    return await _zoho_get("/journals", {"page": page, "per_page": per_page})


@router.get("/journals/{journal_id}")
async def get_journal(journal_id: str):
    """Get a single journal entry."""
    return await _zoho_get(f"/journals/{journal_id}")


# ── Sync / Dashboard Data Pull ─────────────────────────────────────────────────────

@router.post("/sync")
async def sync_all():
    """
    Pull summary data from Zoho Books for the dashboard.
    Returns counts and recent items from key modules.
    """
    results = {}

    try:
        inv = await _zoho_get("/invoices", {"page": 1, "per_page": 5})
        results["invoices"] = {
            "recent": inv.get("invoices", []),
            "total": inv.get("page_context", {}).get("total", 0),
        }
    except Exception:
        results["invoices"] = {"error": "Failed to fetch invoices"}

    try:
        bills = await _zoho_get("/bills", {"page": 1, "per_page": 5})
        results["bills"] = {
            "recent": bills.get("bills", []),
            "total": bills.get("page_context", {}).get("total", 0),
        }
    except Exception:
        results["bills"] = {"error": "Failed to fetch bills"}

    try:
        contacts = await _zoho_get("/contacts", {"page": 1, "per_page": 5})
        results["contacts"] = {
            "recent": contacts.get("contacts", []),
            "total": contacts.get("page_context", {}).get("total", 0),
        }
    except Exception:
        results["contacts"] = {"error": "Failed to fetch contacts"}

    try:
        coa = await _zoho_get("/chartofaccounts")
        results["chart_of_accounts"] = {
            "accounts": coa.get("chartofaccounts", []),
            "total": len(coa.get("chartofaccounts", [])),
        }
    except Exception:
        results["chart_of_accounts"] = {"error": "Failed to fetch chart of accounts"}

    return {"message": "Sync complete", "data": results}
