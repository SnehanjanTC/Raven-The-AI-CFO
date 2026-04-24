from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.deps import require_user
from app.models.user import User
from app.models.filing import Filing
from app.models.transaction import Transaction
from app.schemas.compliance import (
    TDSCalculationRequest,
    TDSCalculationResponse,
    GSTCalculationRequest,
    GSTCalculationResponse,
    PTaxCalculationRequest,
    PTaxCalculationResponse,
    ComplianceHealthResponse,
    DeadlineResponse,
)

router = APIRouter()

# TDS rates for different sections (Indian tax rules)
TDS_RATES = {
    "194C": {"rate": 1.0, "threshold": 30000, "description": "Contractor/Professional fees"},
    "194J": {"rate": 10.0, "threshold": 30000, "description": "Professional fees"},
    "194H": {"rate": 5.0, "threshold": 25000, "description": "Commission/Brokerage"},
    "194I": {"rate": 5.0, "threshold": 100000, "description": "Rent"},
    "194A": {"rate": 10.0, "threshold": 40000, "description": "Interest on securities"},
}

# GST rates
GST_RATES = {
    "0": 0.0,
    "5": 5.0,
    "12": 12.0,
    "18": 18.0,
    "28": 28.0,
}

# Professional Tax rates by state (Monthly)
PTAX_SLABS = {
    "MH": [  # Maharashtra
        (0, 10000, 0),
        (10000, 20000, 150),
        (20000, float('inf'), 200),
    ],
    "KA": [  # Karnataka
        (0, 9000, 0),
        (9000, 30000, 200),
        (30000, float('inf'), 300),
    ],
    "WB": [  # West Bengal
        (0, 12000, 0),
        (12000, float('inf'), 170),
    ],
    "DL": [  # Delhi
        (0, 15000, 0),
        (15000, 25000, 150),
        (25000, float('inf'), 200),
    ],
    "TN": [  # Tamil Nadu
        (0, 10000, 0),
        (10000, float('inf'), 200),
    ],
}


@router.post("/tds/calculate", response_model=TDSCalculationResponse)
async def calculate_tds(data: TDSCalculationRequest):
    """Calculate TDS based on section and amount."""
    section_info = TDS_RATES.get(data.section)
    if not section_info:
        raise ValueError(f"Unknown TDS section: {data.section}")

    base_rate = section_info["rate"]
    threshold = section_info["threshold"]

    # Apply rate only if amount exceeds threshold
    if data.amount <= threshold:
        tds_amount = 0
        applicable_rate = 0
    else:
        applicable_amount = data.amount - threshold
        tds_amount = applicable_amount * (base_rate / 100)
        applicable_rate = base_rate

    # Add surcharge (25% for non-residents)
    surcharge = (tds_amount * 0.25) if not data.is_resident else 0

    # Add cess (4% on surcharge)
    cess = (surcharge * 0.04)

    total_deduction = tds_amount + surcharge + cess

    explanation = (
        f"{data.section} - {section_info['description']}. "
        f"Threshold: ₹{threshold:,.0f}. "
        f"Rate: {base_rate}% (applicable above threshold). "
        f"PAN Available: {data.pan_available}. "
        f"Resident: {data.is_resident}."
    )

    return TDSCalculationResponse(
        section=data.section,
        base_rate=base_rate,
        applicable_rate=applicable_rate,
        tds_amount=round(tds_amount, 2),
        surcharge=round(surcharge, 2),
        cess=round(cess, 2),
        total_deduction=round(total_deduction, 2),
        threshold=threshold,
        explanation=explanation,
    )


@router.post("/gst/calculate", response_model=GSTCalculationResponse)
async def calculate_gst(data: GSTCalculationRequest):
    """Calculate GST based on amount and HSN code."""
    # Determine applicable rate based on HSN code or default
    rate = 18.0  # Default rate

    if data.hsn_code:
        hsn_prefix = data.hsn_code[:2] if len(data.hsn_code) >= 2 else ""
        # Simplified GST rate assignment
        if hsn_prefix in ["01", "02", "03", "04", "05"]:
            rate = 5.0  # Food items
        elif hsn_prefix in ["61", "62", "63", "64", "65"]:
            rate = 12.0  # Textiles
        elif hsn_prefix in ["30", "31", "32"]:
            rate = 0.0  # Medicines
        else:
            rate = 18.0

    # For composition scheme, no GST
    if data.is_composition:
        cgst_rate = 0
        sgst_rate = 0
        igst_rate = 0
        cgst_amount = 0
        sgst_amount = 0
        igst_amount = 0
        total_gst = 0
    elif data.is_interstate:
        # IGST only
        cgst_rate = 0
        sgst_rate = 0
        igst_rate = rate
        cgst_amount = 0
        sgst_amount = 0
        igst_amount = data.amount * (rate / 100)
        total_gst = igst_amount
    else:
        # CGST + SGST (intrastate)
        cgst_rate = rate / 2
        sgst_rate = rate / 2
        igst_rate = 0
        cgst_amount = data.amount * (cgst_rate / 100)
        sgst_amount = data.amount * (sgst_rate / 100)
        igst_amount = 0
        total_gst = cgst_amount + sgst_amount

    total_with_gst = data.amount + total_gst

    explanation = (
        f"Taxable Amount: ₹{data.amount:,.2f}. "
        f"GST Rate: {rate}%. "
        f"Interstate: {data.is_interstate}. "
        f"Composition: {data.is_composition}."
    )

    return GSTCalculationResponse(
        taxable_amount=data.amount,
        cgst_rate=cgst_rate,
        sgst_rate=sgst_rate,
        igst_rate=igst_rate,
        cgst_amount=round(cgst_amount, 2),
        sgst_amount=round(sgst_amount, 2),
        igst_amount=round(igst_amount, 2),
        total_gst=round(total_gst, 2),
        total_with_gst=round(total_with_gst, 2),
        explanation=explanation,
    )


STATE_NAME_MAP = {
    "maharashtra": "MH", "mh": "MH",
    "karnataka": "KA", "ka": "KA",
    "west bengal": "WB", "wb": "WB",
    "delhi": "DL", "dl": "DL",
    "tamil nadu": "TN", "tn": "TN",
}

@router.post("/ptax/calculate", response_model=PTaxCalculationResponse)
async def calculate_ptax(data: PTaxCalculationRequest):
    """Calculate Professional Tax based on state and salary."""
    state_key = STATE_NAME_MAP.get(data.state.lower(), data.state.upper())
    slabs = PTAX_SLABS.get(state_key)
    if not slabs:
        raise HTTPException(status_code=400, detail=f"Unknown state: {data.state}. Supported: MH, KA, WB, DL, TN")

    # Find applicable slab
    monthly_ptax = 0
    slab_desc = "Nil"
    for min_sal, max_sal, tax in slabs:
        if min_sal <= data.monthly_salary < max_sal:
            monthly_ptax = tax
            slab_desc = f"₹{min_sal:,.0f} - ₹{max_sal:,.0f}: ₹{tax}"
            break

    annual_ptax = monthly_ptax * 12

    explanation = (
        f"{data.state} - Monthly Salary: ₹{data.monthly_salary:,.2f}. "
        f"Applicable Slab: {slab_desc}. "
        f"Monthly PT: ₹{monthly_ptax:,.0f}. "
        f"Annual PT: ₹{annual_ptax:,.0f}."
    )

    return PTaxCalculationResponse(
        state=data.state,
        monthly_salary=data.monthly_salary,
        monthly_ptax=monthly_ptax,
        annual_ptax=annual_ptax,
        slab=slab_desc,
        explanation=explanation,
    )


@router.get("/health", response_model=ComplianceHealthResponse)
async def get_compliance_health(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get compliance health scores from filing data."""
    result = await db.execute(
        select(Filing).where(Filing.user_id == user.id)
    )
    filings = result.scalars().all()

    if not filings:
        return ComplianceHealthResponse(
            tds_score=100,
            gst_score=100,
            ptax_score=100,
            gaap_score=100,
            overall_score=100,
            total_overdue=0,
            critical_deadlines=0,
        )

    # Score calculation
    total_filings = len(filings)
    filed_filings = sum(1 for f in filings if f.status == "filed")
    pending_filings = sum(1 for f in filings if f.status == "pending")
    overdue_filings = sum(1 for f in filings if f.status == "overdue")
    rejected_filings = sum(1 for f in filings if f.status == "rejected")

    # Calculate scores (0-100)
    base_score = (filed_filings / total_filings * 100) if total_filings > 0 else 100
    overdue_penalty = overdue_filings * 10
    rejected_penalty = rejected_filings * 20

    tds_filings = [f for f in filings if "TDS" in f.type or "26Q" in f.type]
    tds_score = max(0, base_score - (len([f for f in tds_filings if f.status in ["overdue", "rejected"]]) * 15))

    gst_filings = [f for f in filings if "GST" in f.type or "GSTR" in f.type]
    gst_score = max(0, base_score - (len([f for f in gst_filings if f.status in ["overdue", "rejected"]]) * 15))

    ptax_filings = [f for f in filings if "PT" in f.type]
    ptax_score = max(0, base_score - (len([f for f in ptax_filings if f.status in ["overdue", "rejected"]]) * 15))

    gaap_score = max(0, 100 - (overdue_filings * 5 + rejected_filings * 10))

    overall_score = (tds_score + gst_score + ptax_score + gaap_score) / 4

    # Count critical deadlines (due within 7 days)
    critical_deadlines = sum(
        1 for f in filings
        if f.status == "pending"
        and f.due_date <= datetime.utcnow().date() + timedelta(days=7)
    )

    return ComplianceHealthResponse(
        tds_score=int(max(0, min(100, tds_score))),
        gst_score=int(max(0, min(100, gst_score))),
        ptax_score=int(max(0, min(100, ptax_score))),
        gaap_score=int(max(0, min(100, gaap_score))),
        overall_score=int(max(0, min(100, overall_score))),
        total_overdue=overdue_filings,
        critical_deadlines=critical_deadlines,
    )


@router.get("/deadlines", response_model=list[DeadlineResponse])
async def get_deadlines(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get upcoming compliance deadlines."""
    result = await db.execute(
        select(Filing).where(Filing.user_id == user.id)
    )
    filings = result.scalars().all()

    today = datetime.utcnow().date()
    deadlines = []

    for filing in filings:
        if filing.status in ["pending", "overdue"]:
            days_until = (filing.due_date - today).days

            if days_until < 0:
                urgency = "critical"
            elif days_until <= 7:
                urgency = "urgent"
            elif days_until <= 30:
                urgency = "warning"
            else:
                urgency = "normal"

            deadlines.append(
                DeadlineResponse(
                    id=filing.id,
                    title=f"{filing.type} - {filing.period}",
                    description=filing.notes or f"Due by {filing.due_date}",
                    due_date=filing.due_date.isoformat(),
                    urgency=urgency,
                    type=filing.type,
                    is_completed=filing.status == "filed",
                )
            )

    # Sort by due date
    deadlines.sort(key=lambda x: x.due_date)
    return deadlines
