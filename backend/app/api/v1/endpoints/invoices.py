from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import date

from app.core.database import get_db
from app.core.deps import require_user
from app.models.user import User
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse

router = APIRouter()


@router.get("/", response_model=list[InvoiceResponse])
async def list_invoices(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    status: str | None = Query(None),
    client_name: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    """List invoices with optional filters."""
    query = select(Invoice).where(Invoice.user_id == user.id)

    if status:
        query = query.where(Invoice.status == status)
    if client_name:
        query = query.where(Invoice.client_name.ilike(f"%{client_name}%"))
    if date_from:
        query = query.where(Invoice.issue_date >= date_from)
    if date_to:
        query = query.where(Invoice.issue_date <= date_to)

    query = query.order_by(Invoice.issue_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=InvoiceResponse)
async def create_invoice(
    data: InvoiceCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new invoice."""
    invoice = Invoice(
        user_id=user.id,
        **data.dict(),
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific invoice."""
    result = await db.execute(
        select(Invoice).where(
            and_(
                Invoice.id == invoice_id,
                Invoice.user_id == user.id,
            )
        )
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an invoice."""
    result = await db.execute(
        select(Invoice).where(
            and_(
                Invoice.id == invoice_id,
                Invoice.user_id == user.id,
            )
        )
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(invoice, key, value)

    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an invoice."""
    result = await db.execute(
        select(Invoice).where(
            and_(
                Invoice.id == invoice_id,
                Invoice.user_id == user.id,
            )
        )
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    await db.delete(invoice)
    await db.commit()
    return {"message": "Invoice deleted"}
