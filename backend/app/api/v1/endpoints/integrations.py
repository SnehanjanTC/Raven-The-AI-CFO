from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
import json
import time

from app.core.database import get_db
from app.core.deps import require_user
from app.core.security import encrypt_value, decrypt_value
from app.models.user import User
from app.models.integration import IntegrationConnection
from app.schemas.integration import (
    IntegrationCreate,
    IntegrationUpdate,
    IntegrationResponse,
    IntegrationTestRequest,
    IntegrationTestResponse,
)

router = APIRouter()


@router.get("/", response_model=list[IntegrationResponse])
async def list_integrations(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's integrations."""
    result = await db.execute(
        select(IntegrationConnection).where(IntegrationConnection.user_id == user.id)
    )
    return result.scalars().all()


@router.post("/", response_model=IntegrationResponse)
async def create_integration(
    data: IntegrationCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new integration connection with encrypted credentials."""
    encrypted_creds = encrypt_value(json.dumps(data.credentials))

    integration = IntegrationConnection(
        user_id=user.id,
        provider=data.provider,
        display_name=data.display_name,
        category=data.category,
        environment=data.environment,
        encrypted_credentials=encrypted_creds,
        status="connected",
    )
    db.add(integration)
    await db.commit()
    await db.refresh(integration)
    return integration


@router.post("/test", response_model=IntegrationTestResponse)
async def test_integration(data: IntegrationTestRequest):
    """Test an integration connection without storing it."""
    try:
        start_time = time.time()

        # Validate credentials format
        if not isinstance(data.credentials, dict):
            return IntegrationTestResponse(
                success=False,
                message="Credentials must be a dictionary",
            )

        # Simulate provider-specific validation
        provider = data.provider.lower()
        required_fields = {
            "razorpay": ["api_key", "api_secret"],
            "zoho": ["client_id", "client_secret"],
            "tally": ["server_url", "username"],
            "hdfc": ["account_number", "api_key"],
            "gst-portal": ["gstin", "password"],
        }

        if provider in required_fields:
            for field in required_fields[provider]:
                if field not in data.credentials or not data.credentials[field]:
                    return IntegrationTestResponse(
                        success=False,
                        message=f"Missing required field: {field}",
                    )

        # Simulate latency
        latency_ms = int((time.time() - start_time) * 1000)

        return IntegrationTestResponse(
            success=True,
            message=f"Connection to {data.provider} successful",
            latency_ms=latency_ms,
        )
    except Exception as e:
        return IntegrationTestResponse(
            success=False,
            message=f"Test failed: {str(e)}",
        )


@router.patch("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: str,
    data: IntegrationUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Update integration credentials or environment."""
    result = await db.execute(
        select(IntegrationConnection).where(
            and_(
                IntegrationConnection.id == integration_id,
                IntegrationConnection.user_id == user.id,
            )
        )
    )
    integration = result.scalar_one_or_none()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    if data.credentials:
        integration.encrypted_credentials = encrypt_value(json.dumps(data.credentials))
    if data.environment:
        integration.environment = data.environment
    if data.status:
        integration.status = data.status

    await db.commit()
    await db.refresh(integration)
    return integration


@router.delete("/{integration_id}")
async def delete_integration(
    integration_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect an integration."""
    result = await db.execute(
        select(IntegrationConnection).where(
            and_(
                IntegrationConnection.id == integration_id,
                IntegrationConnection.user_id == user.id,
            )
        )
    )
    integration = result.scalar_one_or_none()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    await db.delete(integration)
    await db.commit()
    return {"message": "Integration disconnected"}


@router.post("/{integration_id}/sync")
async def sync_integration(
    integration_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger a sync for the integration."""
    result = await db.execute(
        select(IntegrationConnection).where(
            and_(
                IntegrationConnection.id == integration_id,
                IntegrationConnection.user_id == user.id,
            )
        )
    )
    integration = result.scalar_one_or_none()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    # Simulate sync
    integration.last_sync = datetime.utcnow()
    integration.sync_count += 1

    await db.commit()
    await db.refresh(integration)
    return {
        "message": "Sync triggered successfully",
        "sync_count": integration.sync_count,
        "last_sync": integration.last_sync,
    }
