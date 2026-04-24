from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from datetime import date
import csv
import io

from app.core.database import get_db
from app.core.deps import get_current_user, require_user
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse

router = APIRouter()


@router.get("/", response_model=list[TransactionResponse])
async def list_transactions(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    type: str | None = Query(None),
    category: str | None = Query(None),
    status: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    """List transactions with optional filters."""
    query = select(Transaction).where(Transaction.user_id == user.id)

    if type:
        query = query.where(Transaction.type == type)
    if category:
        query = query.where(Transaction.category == category)
    if status:
        query = query.where(Transaction.status == status)
    if date_from:
        query = query.where(Transaction.date >= date_from)
    if date_to:
        query = query.where(Transaction.date <= date_to)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Transaction.description.ilike(search_term),
                Transaction.vendor.ilike(search_term),
                Transaction.invoice_no.ilike(search_term),
            )
        )

    query = query.order_by(Transaction.date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    data: TransactionCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new transaction."""
    transaction = Transaction(
        user_id=user.id,
        **data.dict(),
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific transaction."""
    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.id == transaction_id,
                Transaction.user_id == user.id,
            )
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a transaction."""
    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.id == transaction_id,
                Transaction.user_id == user.id,
            )
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(transaction, key, value)

    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a transaction."""
    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.id == transaction_id,
                Transaction.user_id == user.id,
            )
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    await db.delete(transaction)
    await db.commit()
    return {"message": "Transaction deleted"}


@router.get("/export/csv")
async def export_transactions_csv(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Export transactions as CSV."""
    result = await db.execute(
        select(Transaction).where(Transaction.user_id == user.id).order_by(Transaction.date.desc())
    )
    transactions = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Description", "Amount", "Type", "Category", "Subcategory",
        "Vendor", "Invoice No", "Status", "TDS Section", "TDS Rate", "TDS Amount",
        "GST Rate", "GST Amount", "HSN Code", "Bank Ref", "Notes",
    ])

    for txn in transactions:
        writer.writerow([
            txn.date,
            txn.description,
            txn.amount,
            txn.type,
            txn.category,
            txn.subcategory or "",
            txn.vendor or "",
            txn.invoice_no or "",
            txn.status,
            txn.tds_section or "",
            txn.tds_rate or "",
            txn.tds_amount or "",
            txn.gst_rate or "",
            txn.gst_amount or "",
            txn.hsn_code or "",
            txn.bank_ref or "",
            txn.notes or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )
