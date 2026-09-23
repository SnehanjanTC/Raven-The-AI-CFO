"""
Proposal service — the sole gate for committed writes triggered by the agent.

Ports Conformity's rule that "compliant" is written in exactly one file. Here
the equivalent is: agent-initiated writes to `transactions` or `metrics` happen
ONLY inside `_commit_transaction` / `_commit_metric_update` below.

An agent tool call NEVER writes to `transactions` or `metrics` directly. It
`create_proposal(...)`, which lands a row in `agent_proposals` with
`status = 'pending'`. Only `approve_proposal(...)` — called from an authenticated
user endpoint — flips the proposal to `approved` and performs the committed
write in the same transaction (well, same request; Postgres single-statement
atomicity where it matters).

Invariant test (tests/test_invariant.py) source-scans the codebase for INSERT/
UPDATE against transactions/metrics and asserts they appear only in this file.
Direct manual entry via the ledger UI stays out of the agent flow entirely; the
regression test's allowlist excludes that path explicitly.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Literal, Optional

import httpx

from app.core.config import settings
from app.services.audit import log_action, AGENT_ACTOR

logger = logging.getLogger(__name__)


ProposalKind = Literal["add_transaction", "update_metric"]
ProposalStatus = Literal["pending", "approved", "rejected", "expired"]


class ProposalError(Exception):
    """Raised when a proposal can't be created or resolved."""


class NotConfiguredError(ProposalError):
    """Raised when Supabase creds are missing — surfaces cleanly to users."""


# ---------------------------------------------------------------------------
# Public API — the ONLY functions callers should use
# ---------------------------------------------------------------------------


async def create_proposal(
    *,
    user_id: str,
    kind: ProposalKind,
    payload: dict,
    reason: Optional[str] = None,
    conversation_id: Optional[str] = None,
    proposed_by: str = AGENT_ACTOR,
) -> dict:
    """
    Log an AI-proposed write for human review. Never touches the real
    transactions/metrics tables.
    """
    _require_configured()
    _validate_payload(kind, payload)

    row = {
        "user_id": user_id,
        "conversation_id": conversation_id,
        "kind": kind,
        "status": "pending",
        "proposed_by": proposed_by,
        "reason": (reason or "")[:2000] or None,
        "payload": payload,
    }
    created = await _pg_post("agent_proposals", row)
    return created


async def approve_proposal(
    *,
    proposal_id: str,
    reviewer_user_id: str,
    reviewer_note: Optional[str] = None,
) -> dict:
    """
    Human sign-off. Flips the proposal to `approved`, then performs the
    committed write. Both steps happen from this function only.
    """
    _require_configured()
    proposal = await _pg_get_proposal(proposal_id, reviewer_user_id)
    if proposal["status"] != "pending":
        raise ProposalError(
            f"Proposal is {proposal['status']}, not pending — cannot approve."
        )

    kind = proposal["kind"]
    payload = proposal["payload"]
    committed_id: Optional[str] = None

    if kind == "add_transaction":
        committed_id = await _commit_transaction(reviewer_user_id, payload)
    elif kind == "update_metric":
        await _commit_metric_update(reviewer_user_id, payload)
    else:
        raise ProposalError(f"Unknown proposal kind: {kind}")

    updated = await _pg_patch_proposal(
        proposal_id,
        {
            "status": "approved",
            "reviewed_by": f"user:{reviewer_user_id}",
            "reviewed_at": datetime.utcnow().isoformat(),
            "reviewer_note": (reviewer_note or "")[:2000] or None,
            "committed_id": committed_id,
        },
    )
    await log_action(
        actor=f"user:{reviewer_user_id}",
        user_id=reviewer_user_id,
        tool_name=f"approve_proposal:{kind}",
        input={"proposal_id": proposal_id, "reviewer_note": reviewer_note},
        output={"committed_id": committed_id},
        conversation_id=proposal.get("conversation_id"),
    )
    return updated


async def reject_proposal(
    *,
    proposal_id: str,
    reviewer_user_id: str,
    reviewer_note: Optional[str] = None,
) -> dict:
    """Reject without committing anything."""
    _require_configured()
    proposal = await _pg_get_proposal(proposal_id, reviewer_user_id)
    if proposal["status"] != "pending":
        raise ProposalError(
            f"Proposal is {proposal['status']}, not pending — cannot reject."
        )
    updated = await _pg_patch_proposal(
        proposal_id,
        {
            "status": "rejected",
            "reviewed_by": f"user:{reviewer_user_id}",
            "reviewed_at": datetime.utcnow().isoformat(),
            "reviewer_note": (reviewer_note or "")[:2000] or None,
        },
    )
    await log_action(
        actor=f"user:{reviewer_user_id}",
        user_id=reviewer_user_id,
        tool_name=f"reject_proposal:{proposal['kind']}",
        input={"proposal_id": proposal_id, "reviewer_note": reviewer_note},
        conversation_id=proposal.get("conversation_id"),
    )
    return updated


async def list_pending_proposals(
    *,
    user_id: str,
    limit: int = 50,
) -> list[dict]:
    _require_configured()
    url = (
        f"{settings.SUPABASE_URL}/rest/v1/agent_proposals"
        f"?user_id=eq.{user_id}&status=eq.pending"
        f"&order=created_at.desc&limit={min(int(limit), 200)}"
    )
    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.get(url, headers=_headers())
        response.raise_for_status()
        return response.json()


async def list_recent_proposals(
    *,
    user_id: str,
    limit: int = 100,
    status: Optional[ProposalStatus] = None,
) -> list[dict]:
    _require_configured()
    q = f"user_id=eq.{user_id}"
    if status:
        q += f"&status=eq.{status}"
    url = (
        f"{settings.SUPABASE_URL}/rest/v1/agent_proposals?{q}"
        f"&order=created_at.desc&limit={min(int(limit), 500)}"
    )
    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.get(url, headers=_headers())
        response.raise_for_status()
        return response.json()


# ---------------------------------------------------------------------------
# THE COMMIT LAYER — the only place agent-initiated writes hit the real tables
# ---------------------------------------------------------------------------


async def _commit_transaction(user_id: str, payload: dict) -> str:
    """Sole insertion point for agent-proposed transactions."""
    row = {
        "user_id": user_id,
        "date": payload.get("date"),
        "description": payload.get("description"),
        "amount": float(payload.get("amount", 0)),
        "type": payload.get("type", "expense"),
        "category": payload.get("category", "Other"),
        "status": "cleared",
    }
    created = await _pg_post("transactions", row)
    return created["id"]


async def _commit_metric_update(user_id: str, payload: dict) -> None:
    """
    Sole update point for agent-proposed metric changes.

    metrics rows are unique-keyed by label; upsert on conflict.
    """
    label = payload.get("label")
    if not label:
        raise ProposalError("update_metric payload missing 'label'")
    row = {k: v for k, v in payload.items() if k in {
        "label", "value", "change", "trend", "subtext", "category", "source",
    }}
    row["source"] = row.get("source") or "computed"
    url = (
        f"{settings.SUPABASE_URL}/rest/v1/metrics"
        f"?on_conflict=label"
    )
    headers = {**_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"}
    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.post(url, headers=headers, json=row)
        if response.status_code >= 300:
            raise ProposalError(
                f"metric upsert failed: {response.status_code} {response.text[:200]}"
            )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _headers() -> dict:
    key = settings.SUPABASE_SERVICE_KEY or ""
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _require_configured() -> None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise NotConfiguredError(
            "Supabase is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_KEY, then re-deploy the backend."
        )


def _validate_payload(kind: ProposalKind, payload: dict) -> None:
    if kind == "add_transaction":
        required = {"date", "description", "amount", "type", "category"}
        missing = required - set(payload.keys())
        if missing:
            raise ProposalError(f"add_transaction missing fields: {sorted(missing)}")
        if payload["type"] not in {"income", "expense"}:
            raise ProposalError("add_transaction.type must be income or expense")
    elif kind == "update_metric":
        if "label" not in payload or "value" not in payload:
            raise ProposalError("update_metric requires 'label' and 'value'")


async def _pg_post(table: str, row: dict) -> dict:
    url = f"{settings.SUPABASE_URL}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.post(url, headers=_headers(), json=row)
        if response.status_code >= 300:
            raise ProposalError(
                f"{table} insert failed: {response.status_code} {response.text[:200]}"
            )
        body = response.json()
        return body[0] if isinstance(body, list) else body


async def _pg_get_proposal(proposal_id: str, expected_user_id: str) -> dict:
    url = (
        f"{settings.SUPABASE_URL}/rest/v1/agent_proposals"
        f"?id=eq.{proposal_id}&limit=1"
    )
    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.get(url, headers=_headers())
        response.raise_for_status()
        rows = response.json()
    if not rows:
        raise ProposalError("Proposal not found")
    proposal = rows[0]
    if proposal["user_id"] != expected_user_id:
        raise ProposalError("Not authorised for this proposal")
    return proposal


async def _pg_patch_proposal(proposal_id: str, patch: dict) -> dict:
    url = (
        f"{settings.SUPABASE_URL}/rest/v1/agent_proposals"
        f"?id=eq.{proposal_id}"
    )
    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.patch(url, headers=_headers(), json=patch)
        if response.status_code >= 300:
            raise ProposalError(
                f"proposal patch failed: {response.status_code} {response.text[:200]}"
            )
        body = response.json()
        return body[0] if isinstance(body, list) else body
