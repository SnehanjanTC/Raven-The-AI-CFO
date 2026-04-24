"""
Zoho MCP (Model Context Protocol) Integration

The Zoho MCP server uses OAuth 2.0 with Dynamic Client Registration (DCR) + PKCE,
which is the standard MCP HTTP transport auth flow. We:
  1. Discover the auth endpoints from /.well-known/oauth-protected-resource
  2. Register a public client via DCR
  3. Build a PKCE-protected authorization URL the user opens in their browser
  4. Capture the redirect with the code
  5. Exchange code for an access_token
  6. Use the token as a Bearer when calling the /message endpoint
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from typing import Optional, Any
import httpx
import uuid
import secrets
import hashlib
import base64
import json as _json
from urllib.parse import urlencode, urlparse
import logging

logger = logging.getLogger("zohomcp")

router = APIRouter()

# ── Distributor remap cache config ────────────────────────────────────────────
# Even though distributor invoice line-items are essentially immutable, we still
# want a TTL so a manual edit in Zoho (or a remap-keyword expansion) eventually
# invalidates a stale entry. 30 days is short enough to self-heal, long enough
# to keep the cache hit rate at ~100%.
_DISTRIBUTOR_CACHE_TTL_SECONDS = 30 * 24 * 3600  # 30 days

# Persisted token store (single user demo). In production: encrypt + per-user.
import os
_TOKEN_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "zoho_mcp_tokens.json")
_TOKEN_FILE = os.path.abspath(_TOKEN_FILE)


def _load_config() -> dict:
    if os.path.exists(_TOKEN_FILE):
        try:
            with open(_TOKEN_FILE) as f:
                return _json.load(f)
        except Exception:
            return {}
    return {}


def _save_config(cfg: dict) -> None:
    try:
        with open(_TOKEN_FILE, "w") as f:
            _json.dump(cfg, f)
    except Exception:
        pass


_mcp_config: dict = _load_config()
_oauth_state: dict = {}  # in-flight OAuth handshakes
REDIRECT_URI = "http://localhost:8000/api/v1/zohomcp/oauth/callback"

# In-memory cache for /revenue (Zoho MCP responses are slow SSE streams).
# TTL keeps the dashboard snappy; pass ?refresh=true to bypass.
_REVENUE_CACHE_TTL_SECONDS = 300  # 5 minutes
_revenue_cache: dict = {"data": None, "ts": 0.0}
import asyncio as _asyncio
_revenue_lock = _asyncio.Lock()  # collapse concurrent refreshes into one


# ── Schemas ────────────────────────────────────────────────────────────────────

class MCPConnectRequest(BaseModel):
    endpoint_url: str
    api_key: str


class MCPToolCallRequest(BaseModel):
    tool_name: str
    arguments: dict = {}


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _mcp_request(method: str, params: Optional[dict] = None) -> dict:
    """Send a JSON-RPC 2.0 request to the configured Zoho MCP server."""
    if not _mcp_config:
        raise HTTPException(status_code=400, detail="Zoho MCP not connected. POST /api/v1/zohomcp/connect first.")

    payload = {
        "jsonrpc": "2.0",
        "id": str(uuid.uuid4()),
        "method": method,
    }
    if params is not None:
        payload["params"] = params

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    access_token = _mcp_config.get("access_token")
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(_mcp_config["endpoint_url"], json=payload, headers=headers)

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Zoho MCP error: {resp.text}")

    # Handle SSE-formatted responses (data lines can be split across multiple events)
    text = resp.text
    if "data:" in text[:100]:
        # Concatenate ALL data: lines (SSE permits multi-line data fields)
        data_chunks = []
        for line in text.splitlines():
            if line.startswith("data:"):
                data_chunks.append(line[5:].lstrip())
        joined = "".join(data_chunks)
        try:
            data = _json.loads(joined)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse SSE response: {e}")
        if "error" in data:
            raise HTTPException(status_code=400, detail=f"MCP error: {data['error']}")
        return data.get("result", data)

    data = resp.json()
    if "error" in data:
        raise HTTPException(status_code=400, detail=f"MCP error: {data['error']}")
    return data.get("result", data)


def _flatten_tool_result(result: Any) -> Any:
    """MCP tool/call returns {content: [{type, text}]}. Try to parse JSON inside text."""
    if isinstance(result, dict) and "content" in result:
        items = result.get("content", [])
        parsed = []
        for item in items:
            if isinstance(item, dict) and item.get("type") == "text":
                txt = item.get("text", "")
                try:
                    import json as _json
                    parsed.append(_json.loads(txt))
                except Exception:
                    parsed.append(txt)
            else:
                parsed.append(item)
        if len(parsed) == 1:
            return parsed[0]
        return parsed
    return result


# ── Connection Management ─────────────────────────────────────────────────────

async def _discover_oauth(endpoint_url: str) -> dict:
    """Discover OAuth metadata from the MCP server's well-known endpoints."""
    parsed = urlparse(endpoint_url)
    base = f"{parsed.scheme}://{parsed.netloc}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Get protected resource metadata to find authorization servers
        prm = await client.get(f"{base}/.well-known/oauth-protected-resource")
        prm_data = prm.json()
        auth_servers = prm_data.get("authorization_servers", [base])

        # Get authorization server metadata
        asm = await client.get(f"{auth_servers[0]}/.well-known/oauth-authorization-server")
        return asm.json()


async def _register_client(registration_endpoint: str) -> dict:
    """Dynamic Client Registration (DCR) — register a public client with PKCE."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            registration_endpoint,
            json={
                "client_name": "FinOS",
                "redirect_uris": [REDIRECT_URI],
                "grant_types": ["authorization_code", "refresh_token"],
                "response_types": ["code"],
                "token_endpoint_auth_method": "none",
                "scope": "ZohoBooks.invoices.READ ZohoBooks.contacts.READ ZohoBooks.bills.READ ZohoBooks.banking.READ ZohoBooks.expenses.READ ZohoBooks.settings.READ ZohoBooks.accountants.READ ZohoMCP.tool.execute",
            },
            headers={"Content-Type": "application/json"},
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=400, detail=f"Client registration failed: {resp.text}")
    return resp.json()


def _gen_pkce() -> tuple[str, str]:
    """Generate PKCE verifier + S256 challenge."""
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge


@router.post("/connect")
async def connect_mcp(data: MCPConnectRequest):
    """
    Start the OAuth flow for the given MCP endpoint URL.
    Returns an authorization URL that the user must open in their browser.
    """
    # Discover OAuth endpoints
    oauth_meta = await _discover_oauth(data.endpoint_url)

    # Register a client dynamically
    client_info = await _register_client(oauth_meta["registration_endpoint"])

    # Generate PKCE
    verifier, challenge = _gen_pkce()
    state = secrets.token_urlsafe(16)

    # Stash everything for the callback
    _oauth_state[state] = {
        "endpoint_url": data.endpoint_url,
        "verifier": verifier,
        "client_id": client_info["client_id"],
        "client_secret": client_info.get("client_secret"),
        "token_endpoint": oauth_meta["token_endpoint"],
    }

    # Build authorization URL
    params = {
        "response_type": "code",
        "client_id": client_info["client_id"],
        "redirect_uri": REDIRECT_URI,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "state": state,
        "scope": "ZohoBooks.invoices.READ ZohoBooks.contacts.READ ZohoBooks.bills.READ ZohoBooks.banking.READ ZohoBooks.expenses.READ ZohoBooks.settings.READ ZohoBooks.accountants.READ ZohoMCP.tool.execute",
    }
    auth_url = f"{oauth_meta['authorization_endpoint']}?{urlencode(params)}"

    return {
        "authorization_url": auth_url,
        "state": state,
        "message": "Open authorization_url in your browser to complete OAuth",
    }


@router.get("/oauth/callback")
async def oauth_callback(code: str = "", state: str = "", error: str = ""):
    """OAuth redirect target. Exchanges the code for an access_token."""
    if error:
        return HTMLResponse(f"<h2>OAuth error: {error}</h2>", status_code=400)

    if state not in _oauth_state:
        return HTMLResponse("<h2>Invalid state. Restart the connect flow.</h2>", status_code=400)

    pending = _oauth_state.pop(state)

    # Exchange code for token
    token_payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": pending["client_id"],
        "code_verifier": pending["verifier"],
    }
    if pending.get("client_secret"):
        token_payload["client_secret"] = pending["client_secret"]

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            pending["token_endpoint"],
            data=token_payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if resp.status_code != 200:
        return HTMLResponse(
            f"<h2>Token exchange failed</h2><pre>{resp.text}</pre>",
            status_code=400,
        )

    token_data = resp.json()

    # Store the access token
    _mcp_config["endpoint_url"] = pending["endpoint_url"]
    _mcp_config["access_token"] = token_data["access_token"]
    _mcp_config["refresh_token"] = token_data.get("refresh_token")
    _mcp_config["token_endpoint"] = pending["token_endpoint"]
    _mcp_config["client_id"] = pending["client_id"]
    _mcp_config["client_secret"] = pending.get("client_secret")
    _save_config(_mcp_config)

    return HTMLResponse("""
        <html><head><title>Zoho MCP Connected</title></head>
        <body style="font-family:system-ui;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h1 style="color:#10b981;">✓ Zoho Books Connected</h1>
            <p>You can close this tab and return to FinOS.</p>
            <script>setTimeout(() => window.close(), 2000);</script>
          </div>
        </body></html>
    """)


@router.get("/status")
async def mcp_status():
    """Check connection status."""
    return {
        "connected": bool(_mcp_config),
        "endpoint": _mcp_config.get("endpoint_url"),
    }


@router.post("/disconnect")
async def disconnect_mcp():
    """Clear stored MCP credentials."""
    _mcp_config.clear()
    if os.path.exists(_TOKEN_FILE):
        os.remove(_TOKEN_FILE)
    return {"message": "Disconnected"}


# ── MCP Protocol Endpoints ────────────────────────────────────────────────────

@router.get("/tools")
async def list_tools():
    """List all available tools on the connected Zoho MCP server."""
    result = await _mcp_request("tools/list")
    return result


@router.post("/tools/call")
async def call_tool(data: MCPToolCallRequest):
    """Invoke a specific tool by name with arguments."""
    result = await _mcp_request("tools/call", {
        "name": data.tool_name,
        "arguments": data.arguments,
    })
    return {"tool": data.tool_name, "result": _flatten_tool_result(result)}


# ── Distributor remapping ─────────────────────────────────────────────────────
#
# Some "customers" in Zoho are actually distributors / resellers. The real
# end-customer for these invoices lives in the line item description, e.g.:
#
#   customer_name: "STARLIGHT DATA SOLUTIONS PRIVATE LIMITED"
#   line_items[0].description: "GRC Automation Tool for MCX"
#   line_items[0].description: "For CDSL Ventures\n8 Compliance Frameworks..."
#
# We detect distributors by substring match on customer_name and re-attribute
# the invoice to the parsed end-customer for top-customer rankings.

DISTRIBUTOR_KEYWORDS = {"starlight"}


def _is_distributor(customer_name: str) -> bool:
    n = (customer_name or "").lower()
    return any(k in n for k in DISTRIBUTOR_KEYWORDS)


def _extract_end_customer(line_items: list) -> Optional[str]:
    """Pull the real end-customer name out of line item descriptions."""
    import re
    for li in line_items or []:
        desc = (li.get("description") or "").strip()
        if not desc:
            continue
        # Take the first non-empty line
        first = next((ln.strip() for ln in desc.splitlines() if ln.strip()), "")
        if not first:
            continue
        # Patterns we've seen:
        #   "For CDSL Ventures"
        #   "GRC Automation Tool for MCX"
        m = re.search(r"\bfor\s+([A-Z][\w&.\- ]+?)(?:\s*$|\s*\n)", first, re.IGNORECASE)
        if m:
            name = m.group(1).strip().rstrip(".,;")
            # Drop trailing role-words that sometimes follow
            name = re.sub(r"\s+(Pvt|Private|Ltd|Limited|Inc|LLC)\.?$", "", name, flags=re.IGNORECASE).strip()
            if name:
                return name
        # Fallback: if the whole first line is short and looks like a name
        if 2 < len(first) < 60 and not any(c.isdigit() for c in first):
            return first
    return None


async def _resolve_distributor_invoices(invoices: list, org_id: Optional[str]) -> dict:
    """For each distributor invoice, fetch line items and extract end-customer.
    Returns a mapping of invoice_id -> end_customer_name.

    Results are cached on disk (in the token file) so we only hit Zoho once per
    distributor invoice, ever — distributor line item descriptions don't change
    after creation, so this is safe.
    """
    if not org_id:
        return {}
    targets = [
        inv for inv in invoices
        if isinstance(inv, dict) and _is_distributor(inv.get("customer_name", ""))
    ]
    if not targets:
        return {}

    # Disk-backed cache, now timestamped for TTL/invalidation:
    #   { invoice_id: { "name": "...", "ts": <epoch_seconds> } }
    # Also tolerates the legacy bare-string format from older deployments.
    import time as _time
    disk_cache_raw = _mcp_config.get("distributor_remap_cache", {}) or {}
    now_ts = _time.time()

    def _is_fresh(entry: Any) -> bool:
        if isinstance(entry, dict) and "ts" in entry:
            return (now_ts - float(entry["ts"])) < _DISTRIBUTOR_CACHE_TTL_SECONDS
        # Legacy entries (bare strings) have no timestamp — treat as stale so
        # they get refreshed once and migrated to the new format.
        return False

    def _name(entry: Any) -> Optional[str]:
        if isinstance(entry, dict):
            return entry.get("name")
        if isinstance(entry, str):
            return entry
        return None

    result: dict = {}
    to_fetch: list = []
    expired_count = 0
    for inv in targets:
        iid = inv.get("invoice_id")
        if not iid:
            continue
        entry = disk_cache_raw.get(iid)
        if entry is not None and _is_fresh(entry):
            n = _name(entry)
            if n:
                result[iid] = n
                continue
        if entry is not None:
            expired_count += 1
        to_fetch.append(inv)
    if expired_count:
        logger.info("zohomcp.distributor_cache: %d entries expired/legacy → refetching", expired_count)

    if not to_fetch:
        return result

    import asyncio

    async def fetch_one(inv):
        inv_id = inv.get("invoice_id")
        if not inv_id:
            return inv_id, None
        try:
            raw = await _mcp_request("tools/call", {
                "name": "ZohoBooks_get_invoice",
                "arguments": {
                    "path_variables": {"invoice_id": str(inv_id)},
                    "query_params": {"organization_id": str(org_id)},
                },
            })
            data = _flatten_tool_result(raw)
            invoice = data.get("invoice") if isinstance(data, dict) else None
            if not invoice:
                return inv_id, None
            return inv_id, _extract_end_customer(invoice.get("line_items", []))
        except Exception:
            return inv_id, None

    fetched = await asyncio.gather(*(fetch_one(i) for i in to_fetch))
    for iid, name in fetched:
        if name:
            result[iid] = name
            disk_cache_raw[iid] = {"name": name, "ts": now_ts}

    # Persist the updated cache so subsequent restarts skip the fetch
    if fetched:
        _mcp_config["distributor_remap_cache"] = disk_cache_raw
        _save_config(_mcp_config)

    return result


# ── High-Level Helpers (Revenue / Invoices) ───────────────────────────────────

def _resolve_org_id() -> str:
    return (
        os.environ.get("ZOHO_ORG_ID")
        or _mcp_config.get("organization_id")
        or "60021349810"
    )


async def _list_invoices_via_mcp(org_id: str) -> list:
    """Call ZohoBooks_list_invoices with the required org_id and return the list."""
    raw = await _mcp_request("tools/call", {
        "name": "ZohoBooks_list_invoices",
        "arguments": {"query_params": {"organization_id": str(org_id)}},
    })
    parsed = _flatten_tool_result(raw)
    if isinstance(parsed, dict):
        return parsed.get("invoices") or parsed.get("data") or parsed.get("items") or []
    if isinstance(parsed, list):
        return parsed
    return []


@router.get("/revenue")
async def get_revenue(refresh: bool = False):
    """
    Pull invoices via MCP and aggregate revenue, with distributor remapping
    so that real end-customers (parsed from line item descriptions) appear
    in the top-customers ranking.

    Cached in-memory for 5 minutes (the underlying Zoho MCP SSE call is slow);
    pass ?refresh=true to bypass and force a fresh fetch.
    """
    import time

    now = time.time()
    cached = _revenue_cache.get("data")
    cached_age = now - _revenue_cache.get("ts", 0.0)
    if not refresh and cached is not None and cached_age < _REVENUE_CACHE_TTL_SECONDS:
        # Stamp the response so the client can show "X seconds ago"
        return {**cached, "_cache": {"hit": True, "age_seconds": round(cached_age, 1)}}

    # Collapse concurrent refreshes (e.g. multiple dashboard tabs) into one
    async with _revenue_lock:
        # Re-check after acquiring the lock — another caller may have just refreshed
        now = time.time()
        cached = _revenue_cache.get("data")
        cached_age = now - _revenue_cache.get("ts", 0.0)
        if not refresh and cached is not None and cached_age < _REVENUE_CACHE_TTL_SECONDS:
            return {**cached, "_cache": {"hit": True, "age_seconds": round(cached_age, 1)}}

        result = await _compute_revenue()
        _revenue_cache["data"] = result
        _revenue_cache["ts"] = time.time()
        return {**result, "_cache": {"hit": False, "age_seconds": 0}}


async def _compute_revenue() -> dict:
    """The actual aggregation pipeline. Wrapped by `get_revenue` for caching."""
    org_id = _resolve_org_id()
    invoices = await _list_invoices_via_mcp(org_id)
    invoice_tool = "ZohoBooks_list_invoices"
    parsed = None  # unused below but kept for symmetry

    # Resolve real end-customers for distributor invoices
    distributor_remap = await _resolve_distributor_invoices(invoices, org_id)

    # Aggregate revenue
    from datetime import date

    total_revenue = 0.0
    paid_revenue = 0.0
    outstanding = 0.0
    outstanding_unknown_count = 0  # invoices we couldn't classify (no balance + non-paid status)
    by_status: dict = {}
    by_month: dict = {}                    # all invoiced revenue
    by_month_recurring: dict = {}          # smoothed recurring revenue (computed below)
    by_customer: dict = {}
    # per-customer monthly billings: { customer: { "YYYY-MM": amount, ... } }
    customer_months: dict = {}

    # Statuses we EXCLUDE from every aggregation: void/draft are not real revenue.
    # Everything else (sent, overdue, partially_paid, paid, closed, viewed, …) counts.
    EXCLUDED_STATUSES = {"void", "voided", "draft"}

    for inv in invoices:
        if not isinstance(inv, dict):
            continue
        status = (inv.get("status") or "unknown").lower()
        # Track raw status counts even for excluded statuses (for visibility)
        amount = float(inv.get("total") or inv.get("amount") or inv.get("invoice_total") or 0)
        by_status[status] = by_status.get(status, 0) + amount
        if status in EXCLUDED_STATUSES:
            continue

        date_str = inv.get("date") or inv.get("invoice_date") or inv.get("created_time") or ""
        # Balance: ONLY trust the explicit `balance` field. Falling back to
        # `amount` when Zoho omits it is wrong — we'd double-count fully paid
        # invoices that simply lack the field. If balance is missing we leave
        # it as None and use status to decide what to do (see below).
        bal_raw = inv.get("balance")
        balance: Optional[float] = float(bal_raw) if bal_raw is not None else None

        # Customer attribution with distributor remap
        raw_customer = inv.get("customer_name") or "Unknown"
        end_customer = distributor_remap.get(inv.get("invoice_id")) or raw_customer
        is_via_distributor = end_customer != raw_customer

        total_revenue += amount

        if status in ("paid", "closed"):
            paid_revenue += amount
        else:
            if balance is not None:
                outstanding += balance
            else:
                # Status says unpaid but Zoho gave us no balance field. We
                # refuse to guess — log it so it's visible in ops, and skip
                # the contribution. Better to under-report than to inflate.
                outstanding_unknown_count += 1
                logger.warning(
                    "zohomcp.outstanding: invoice %s status=%s missing balance field; skipping",
                    inv.get("invoice_id") or inv.get("invoice_number") or "?",
                    status,
                )

        # Group by month (YYYY-MM)
        month = None
        if date_str and len(date_str) >= 7:
            month = date_str[:7]
            by_month[month] = by_month.get(month, 0) + amount

        # Per-customer monthly billings (used for recurring heuristic)
        if month:
            cm = customer_months.setdefault(end_customer, {})
            cm[month] = cm.get(month, 0.0) + amount

        # Group by (remapped) customer
        bucket = by_customer.setdefault(end_customer, {
            "customer": end_customer,
            "revenue": 0.0,
            "invoice_count": 0,
            "via_distributor": None,
        })
        bucket["revenue"] += amount
        bucket["invoice_count"] += 1
        if is_via_distributor:
            bucket["via_distributor"] = raw_customer

    top_customers = sorted(
        ({**v, "revenue": round(v["revenue"], 2)} for v in by_customer.values()),
        key=lambda x: x["revenue"],
        reverse=True,
    )[:10]

    # ── MRR / run-rate computation ───────────────────────────────────────────
    # Exclude the current (incomplete) month so a partial month doesn't deflate
    # the metric.
    today = date.today()
    current_month = f"{today.year:04d}-{today.month:02d}"

    sorted_months = sorted(by_month.keys())
    completed_months = [m for m in sorted_months if m < current_month]

    last_full_month = completed_months[-1] if completed_months else None
    last_full_month_revenue = by_month.get(last_full_month, 0.0) if last_full_month else 0.0

    # ── Headline MRR: TTM (Trailing-Twelve-Month average) ─────────────────────
    # The right invariant for any billing cadence (monthly direct, quarterly ÷3,
    # annual ÷12) is: TTM-billed-revenue / 12. This automatically normalizes:
    #   • Monthly customer (12 invoices): 12 × monthly / 12 = monthly value
    #   • Quarterly customer (~4 invoices): 4 × quarterly / 12 = quarterly ÷ 3
    #   • Annual customer (1 invoice):     1 × annual / 12     = annual ÷ 12
    # Includes one-shot deals because they're real billed revenue this year.
    last12_months = completed_months[-12:]
    prev12_months = completed_months[-24:-12]
    trailing_12mo_total = sum(by_month.get(m, 0.0) for m in last12_months)
    prev_12mo_total = sum(by_month.get(m, 0.0) for m in prev12_months)
    mrr_ttm = trailing_12mo_total / 12.0
    arr_ttm = trailing_12mo_total  # ARR = TTM revenue

    # Smoothed YoY: compare last-12mo total against previous 12-month total
    yoy_pct: Optional[float] = None
    if prev_12mo_total > 0:
        yoy_pct = ((trailing_12mo_total - prev_12mo_total) / prev_12mo_total) * 100.0

    # Trailing 3-month and prior 3-month windows (for smoothed MoM)
    last3 = completed_months[-3:]
    prev3 = completed_months[-6:-3]
    avg_monthly_revenue = (
        sum(by_month.get(m, 0.0) for m in last3) / len(last3) if last3 else 0.0
    )
    avg_monthly_revenue_prev = (
        sum(by_month.get(m, 0.0) for m in prev3) / len(prev3) if prev3 else 0.0
    )

    # ── Recurring MRR via cadence-aware heuristic ────────────────────────────
    # Zoho's `recurring_invoice_id` field is empty for this org (everyone bills
    # manually), so we infer cadence per-customer from invoice timing.
    #
    # Invariant: MRR contribution = customer's trailing-12-month billings / 12.
    #   - Monthly billed (12 invoices): 12 × monthly / 12 = monthly value ✓
    #   - Quarterly billed (4 invoices): 4 × quarterly / 12 = quarterly ÷ 3 ✓
    #   - Annual billed (1 invoice):     1 × annual / 12     = annual ÷ 12   ✓
    #
    # Classification combines BOTH count and inter-arrival regularity:
    #   1. Count buckets the customer into a candidate cadence (monthly/quarterly/annual).
    #   2. Interval check verifies the spacing between invoices roughly matches
    #      that cadence (mean ± 50%). A customer with 4 invoices clustered in
    #      one quarter is NOT quarterly — they're a one-time spike.
    #
    # Buckets:
    #   • ≥6 distinct billing months in last 12             → candidate monthly  (~30d)
    #   • 2–5 distinct billing months in last 12            → candidate quarterly(~90d)
    #   • 1 month in last 12 AND ≥1 month in months 13–24   → candidate annual   (~365d)
    #   • otherwise                                          → one-time, excluded
    last12 = set(completed_months[-12:])
    prev12 = set(completed_months[-24:-12])

    # Helper: convert "YYYY-MM" → ordinal day (mid-month) so we can compute
    # inter-invoice intervals in days without needing the actual invoice dates.
    def _month_to_day(m: str) -> int:
        from datetime import date as _date
        y, mo = int(m[:4]), int(m[5:7])
        return _date(y, mo, 15).toordinal()

    def _interval_regularity(active_months: list[str]) -> tuple[float, float]:
        """Return (mean_days_between, coefficient_of_variation).
        CoV = stdev/mean; lower = more regular. For 1 sample returns (0, 0).
        """
        if len(active_months) < 2:
            return 0.0, 0.0
        days = sorted(_month_to_day(m) for m in active_months)
        gaps = [days[i + 1] - days[i] for i in range(len(days) - 1)]
        mean = sum(gaps) / len(gaps)
        if mean == 0:
            return 0.0, 0.0
        var = sum((g - mean) ** 2 for g in gaps) / len(gaps)
        stdev = var ** 0.5
        return mean, (stdev / mean)

    # Acceptable mean-gap windows (days) per cadence. Wide enough for real-world
    # slippage (30 → 25-45, 90 → 60-150, 365 → 240-540) but narrow enough to
    # reject misclassified one-off bursts.
    CADENCE_GAP_RANGES = {
        "monthly":   (25, 45),
        "quarterly": (60, 150),
        "annual":    (240, 540),
    }

    recurring_mrr = 0.0
    recurring_customer_list: list[dict] = []
    for cust, months_dict in customer_months.items():
        active_last12 = [m for m in months_dict.keys() if m in last12]
        active_prev12 = [m for m in months_dict.keys() if m in prev12]

        if not active_last12:
            continue  # no activity in last 12 months → not currently recurring

        n_active = len(active_last12)
        if n_active >= 6:
            candidate = "monthly"
        elif 2 <= n_active <= 5:
            candidate = "quarterly"
        elif n_active == 1 and len(active_prev12) >= 1:
            candidate = "annual"
        else:
            continue  # 1 invoice in last 12 with no prior history → one-time

        # Validate cadence by inter-invoice spacing. For "annual" we look at
        # months across the full 24-month window since there's only 1 in last12.
        if candidate == "annual":
            sample = active_last12 + active_prev12
        else:
            sample = active_last12
        mean_gap, cov = _interval_regularity(sample)
        gap_lo, gap_hi = CADENCE_GAP_RANGES[candidate]

        # Single-sample (annual with no prior, or monthly oddities) → can't
        # validate intervals; trust the count classification.
        if len(sample) >= 2:
            if not (gap_lo <= mean_gap <= gap_hi):
                logger.info(
                    "zohomcp.cadence: %s rejected as %s — mean gap %.0fd outside %s",
                    cust, candidate, mean_gap, (gap_lo, gap_hi),
                )
                continue
            # Very irregular spacing (cov > 1.0 = stdev > mean) suggests
            # bursty/unpredictable billing. Demote to one-time.
            if cov > 1.0:
                logger.info(
                    "zohomcp.cadence: %s rejected as %s — cov %.2f too irregular",
                    cust, candidate, cov,
                )
                continue

        cadence = candidate
        trailing_12_total = sum(months_dict[m] for m in active_last12)
        monthly_avg = trailing_12_total / 12.0
        recurring_mrr += monthly_avg
        recurring_customer_list.append({
            "customer": cust,
            "cadence": cadence,
            "active_months_last12": n_active,
            "mean_gap_days": round(mean_gap, 1),
            "interval_cov": round(cov, 2),
            "trailing_12mo_revenue": round(trailing_12_total, 2),
            "monthly_avg": round(monthly_avg, 2),
        })
    recurring_customer_list.sort(key=lambda x: x["monthly_avg"], reverse=True)

    # Smoothed MoM (3-month vs prior 3-month average) — much less noisy than raw
    def _mom(curr: float, prev: float) -> Optional[float]:
        if prev <= 0:
            return None
        return ((curr - prev) / prev) * 100.0

    revenue_mom = _mom(avg_monthly_revenue, avg_monthly_revenue_prev)

    # Build by_month_recurring (sum of recurring customers' billings per month)
    recurring_set = {c["customer"] for c in recurring_customer_list}
    for cust in recurring_set:
        for m, amt in customer_months.get(cust, {}).items():
            by_month_recurring[m] = by_month_recurring.get(m, 0.0) + amt

    # Annualised (sub-metrics)
    arr_recurring = recurring_mrr * 12
    arr_run_rate = avg_monthly_revenue * 12

    # One-time revenue = TTM total minus the qualified-recurring portion.
    # If recurring > TTM that's an arithmetic impossibility — it means a
    # customer's per-customer billing total drifted from the global by_month
    # total (e.g. distributor remap collapsed two customers, or rounding).
    # Log loudly and clamp to zero so the dashboard never shows negatives.
    raw_one_time = mrr_ttm - recurring_mrr
    if raw_one_time < -0.01:  # tolerate sub-cent float drift
        logger.warning(
            "zohomcp.one_time_mrr: recurring (%.2f) exceeds TTM MRR (%.2f); clamping to 0. "
            "This usually indicates a customer-attribution bug.",
            recurring_mrr, mrr_ttm,
        )
    one_time_mrr = max(0.0, raw_one_time)
    assert one_time_mrr >= 0.0, "one_time_mrr must be non-negative"

    return {
        "tool_used": invoice_tool,
        "invoice_count": len(invoices),
        "total_revenue": round(total_revenue, 2),
        "paid_revenue": round(paid_revenue, 2),
        "outstanding": round(outstanding, 2),
        "outstanding_unknown_count": outstanding_unknown_count,
        "by_status": {k: round(v, 2) for k, v in by_status.items()},
        "by_month": dict(sorted({k: round(v, 2) for k, v in by_month.items()}.items())),
        "by_month_recurring": dict(sorted({k: round(v, 2) for k, v in by_month_recurring.items()}.items())),
        "top_customers": top_customers,
        "distributor_remap": distributor_remap,
        "recent_invoices": invoices[:10],
        # ── Metrics ───────────────────────────────────────────────────────────
        "metrics": {
            "current_month": current_month,
            "last_full_month": last_full_month,
            "last_full_month_revenue": round(last_full_month_revenue, 2),
            "trailing_months": last3,
            "prev_trailing_months": prev3,
            # ── Headline (TTM-based, the ones the dashboard should show) ──
            "mrr": round(mrr_ttm, 2),
            "arr": round(arr_ttm, 2),
            "trailing_12mo_total": round(trailing_12mo_total, 2),
            "prev_12mo_total": round(prev_12mo_total, 2),
            "yoy_pct": round(yoy_pct, 2) if yoy_pct is not None else None,
            # ── Composition: how much of TTM MRR is qualified recurring ──
            "recurring_mrr": round(recurring_mrr, 2),
            "one_time_mrr": round(one_time_mrr, 2),
            "recurring_pct_of_mrr": round((recurring_mrr / mrr_ttm) * 100, 1) if mrr_ttm > 0 else None,
            "arr_recurring": round(arr_recurring, 2),
            # ── Run-rate sub-metric (3-month trailing avg) ──
            "avg_monthly_revenue": round(avg_monthly_revenue, 2),
            "avg_monthly_revenue_prev": round(avg_monthly_revenue_prev, 2),
            "arr_run_rate": round(arr_run_rate, 2),
            "revenue_mom_pct": round(revenue_mom, 2) if revenue_mom is not None else None,
            # ── Customer-level recurring breakdown ──
            "recurring_customers_count": len(recurring_customer_list),
            "recurring_customers": recurring_customer_list[:20],
            "mrr_method": (
                "Headline MRR = trailing-12mo billings / 12 (TTM). This normalizes any "
                "billing cadence: monthly direct, quarterly ÷3, annual ÷12. The "
                "recurring/one-time split classifies customers by billing pattern: "
                "≥6/12 months → monthly; 2–5/12 → quarterly; 1/12 with prior renewal → annual."
            ),
        },
    }


@router.get("/invoices")
async def get_invoices():
    """Raw invoice list via the Zoho Books MCP."""
    org_id = _resolve_org_id()
    invoices = await _list_invoices_via_mcp(org_id)
    return {"tool": "ZohoBooks_list_invoices", "count": len(invoices), "data": invoices}
