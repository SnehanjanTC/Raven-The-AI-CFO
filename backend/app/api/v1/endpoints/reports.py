from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime
import json
import csv
import io

from app.core.database import get_db
from app.core.deps import require_user
from app.models.user import User
from app.models.report import Report
from app.models.transaction import Transaction
from app.schemas.report import ReportCreate, ReportResponse

router = APIRouter()


@router.get("/", response_model=list[ReportResponse])
async def list_reports(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    type: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    """List reports with optional type filter."""
    query = select(Report).where(Report.user_id == user.id)

    if type:
        query = query.where(Report.type == type)

    query = query.order_by(Report.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ReportResponse)
async def create_report(
    data: ReportCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new report."""
    report = Report(
        user_id=user.id,
        **data.dict(),
        status="draft",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


# Categories that COUNT as top-line revenue. Anything else (loans, grants,
# investor capital, refunds, interest income, tax refunds) is excluded —
# they inflate revenue otherwise and break gross-margin / valuation maths.
REVENUE_CATEGORIES = {
    "revenue", "sales", "service revenue", "product revenue",
    "saas", "saas license", "subscription", "license fee",
    "consulting", "professional services", "support",
}


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    data: ReportCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Auto-generate a report from transaction data."""
    # Fetch transactions for the user
    txn_result = await db.execute(
        select(Transaction).where(Transaction.user_id == user.id)
    )
    transactions = txn_result.scalars().all()

    def _cat(t) -> str:
        return (getattr(t, "category", "") or "").strip().lower()

    # Calculate P&L metrics — only whitelisted revenue categories count.
    revenue = sum(
        t.amount for t in transactions
        if t.type == "credit" and _cat(t) in REVENUE_CATEGORIES
    )
    expenses = sum(t.amount for t in transactions if t.type == "debit")
    gross_profit = revenue - expenses

    # Calculate tax metrics
    total_tds = sum(t.tds_amount for t in transactions if t.tds_amount)
    total_gst = sum(t.gst_amount for t in transactions if t.gst_amount)

    # Calculate margins
    gross_margin = (gross_profit / revenue * 100) if revenue > 0 else 0

    report_data = {
        "period": data.period,
        "revenue": revenue,
        "expenses": expenses,
        "gross_profit": gross_profit,
        "gross_margin_percent": round(gross_margin, 2),
        "total_transactions": len(transactions),
        "total_tds_liability": total_tds,
        "total_gst_liability": total_gst,
        "expense_categories": {},
    }

    # Build category breakdown
    for category in set(t.category for t in transactions if t.type == "debit"):
        cat_total = sum(
            t.amount for t in transactions
            if t.type == "debit" and t.category == category
        )
        report_data["expense_categories"][category] = cat_total

    report = Report(
        user_id=user.id,
        name=data.name,
        type=data.type,
        period=data.period,
        version=data.version,
        status="generated",
        data_json=json.dumps(report_data),
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific report."""
    result = await db.execute(
        select(Report).where(
            and_(
                Report.id == report_id,
                Report.user_id == user.id,
            )
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a report."""
    result = await db.execute(
        select(Report).where(
            and_(
                Report.id == report_id,
                Report.user_id == user.id,
            )
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    await db.delete(report)
    await db.commit()
    return {"message": "Report deleted"}


@router.get("/{report_id}/export")
async def export_report(
    report_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Export report as CSV."""
    result = await db.execute(
        select(Report).where(
            and_(
                Report.id == report_id,
                Report.user_id == user.id,
            )
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["Report Export"])
    writer.writerow(["Name", report.name])
    writer.writerow(["Type", report.type])
    writer.writerow(["Period", report.period])
    writer.writerow(["Status", report.status])
    writer.writerow(["Created", report.created_at])
    writer.writerow([])

    if report.data_json:
        data = json.loads(report.data_json)
        for key, value in data.items():
            if isinstance(value, dict):
                writer.writerow([key])
                for sub_key, sub_value in value.items():
                    writer.writerow(["  " + str(sub_key), sub_value])
            else:
                writer.writerow([key, value])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.csv"},
    )
