"""
Agent proposal endpoints.

The founder-facing side of the "AI proposes, human approves" pattern. Lists
pending proposals, and lets the founder approve or reject one at a time.

- POST is deliberately absent here: proposals are created by the agent loop,
  not by direct API calls. There is no way for a client to fabricate a
  proposal on behalf of another user.
- All state changes go through app.services.proposals, which is the sole
  writer to `transactions` and `metrics` for agent-initiated changes.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.deps import require_user
from app.models.user import User
from app.services import proposals as proposal_service

router = APIRouter()


class ProposalReviewRequest(BaseModel):
    note: Optional[str] = Field(default=None, max_length=2000)


@router.get("/pending", summary="List pending agent proposals")
async def list_pending(
    user: User = Depends(require_user),
    limit: int = Query(50, ge=1, le=200),
):
    try:
        rows = await proposal_service.list_pending_proposals(
            user_id=str(user.id), limit=limit,
        )
    except proposal_service.NotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return {"proposals": rows, "count": len(rows)}


@router.get("/recent", summary="List recent agent proposals (all statuses)")
async def list_recent(
    user: User = Depends(require_user),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None, pattern="^(pending|approved|rejected|expired)$"),
):
    try:
        rows = await proposal_service.list_recent_proposals(
            user_id=str(user.id),
            limit=limit,
            status=status,  # type: ignore[arg-type]
        )
    except proposal_service.NotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return {"proposals": rows, "count": len(rows)}


@router.post("/{proposal_id}/approve", summary="Approve a pending proposal")
async def approve(
    proposal_id: str,
    body: ProposalReviewRequest = ProposalReviewRequest(),
    user: User = Depends(require_user),
):
    try:
        updated = await proposal_service.approve_proposal(
            proposal_id=proposal_id,
            reviewer_user_id=str(user.id),
            reviewer_note=body.note,
        )
    except proposal_service.NotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except proposal_service.ProposalError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return updated


@router.post("/{proposal_id}/reject", summary="Reject a pending proposal")
async def reject(
    proposal_id: str,
    body: ProposalReviewRequest = ProposalReviewRequest(),
    user: User = Depends(require_user),
):
    try:
        updated = await proposal_service.reject_proposal(
            proposal_id=proposal_id,
            reviewer_user_id=str(user.id),
            reviewer_note=body.note,
        )
    except proposal_service.NotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except proposal_service.ProposalError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return updated
