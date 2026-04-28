from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.core.database import get_db
from app.core.deps import require_user
from app.models.user import User
from app.models.company_profile import CompanyProfile
from app.schemas.company_profile import (
    CompanyProfileCreate,
    CompanyProfileUpdate,
    CompanyProfileResponse,
)

router = APIRouter()


@router.get("/", response_model=CompanyProfileResponse)
async def get_company_profile(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's company profile. Creates empty profile if none exists."""
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        # Create empty profile for user
        profile = CompanyProfile(user_id=user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return profile


@router.put("/", response_model=CompanyProfileResponse)
async def update_company_profile(
    data: CompanyProfileUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's company profile. Creates if not exists (upsert)."""
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        # Create new profile
        profile = CompanyProfile(user_id=user.id)
        db.add(profile)

    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    profile.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(profile)

    return profile


@router.get("/completeness", response_model=dict)
async def get_profile_completeness(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's profile completeness percentage."""
    result = await db.execute(
        select(CompanyProfile).where(CompanyProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        return {"completeness": 0, "user_id": user.id}

    return {"completeness": profile.profile_completeness, "user_id": user.id}
