from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import date

from app.core.database import get_db
from app.core.deps import require_user
from app.models.user import User
from app.models.filing import Filing
from app.schemas.filing import FilingCreate, FilingUpdate, FilingResponse

router = APIRouter()


@router.get("/", response_model=list[FilingResponse])
async def list_filings(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    type: str | None = Query(None),
    status: str | None = Query(None),
    period: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    """List filings with optional filters."""
    query = select(Filing).where(Filing.user_id == user.id)

    if type:
        query = query.where(Filing.type == type)
    if status:
        query = query.where(Filing.status == status)
    if period:
        query = query.where(Filing.period.ilike(f"%{period}%"))

    query = query.order_by(Filing.due_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=FilingResponse)
async def create_filing(
    data: FilingCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new filing."""
    filing = Filing(
        user_id=user.id,
        **data.dict(),
    )
    db.add(filing)
    await db.commit()
    await db.refresh(filing)
    return filing


@router.get("/{filing_id}", response_model=FilingResponse)
async def get_filing(
    filing_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific filing."""
    result = await db.execute(
        select(Filing).where(
            and_(
                Filing.id == filing_id,
                Filing.user_id == user.id,
            )
        )
    )
    filing = result.scalar_one_or_none()
    if not filing:
        raise HTTPException(status_code=404, detail="Filing not found")
    return filing


@router.patch("/{filing_id}", response_model=FilingResponse)
async def update_filing(
    filing_id: str,
    data: FilingUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a filing (mark as filed, add ack number, etc.)."""
    result = await db.execute(
        select(Filing).where(
            and_(
                Filing.id == filing_id,
                Filing.user_id == user.id,
            )
        )
    )
    filing = result.scalar_one_or_none()
    if not filing:
        raise HTTPException(status_code=404, detail="Filing not found")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(filing, key, value)

    await db.commit()
    await db.refresh(filing)
    return filing


@router.delete("/{filing_id}")
async def delete_filing(
    filing_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a filing."""
    result = await db.execute(
        select(Filing).where(
            and_(
                Filing.id == filing_id,
                Filing.user_id == user.id,
            )
        )
    )
    filing = result.scalar_one_or_none()
    if not filing:
        raise HTTPException(status_code=404, detail="Filing not found")

    await db.delete(filing)
    await db.commit()
    return {"message": "Filing deleted"}
