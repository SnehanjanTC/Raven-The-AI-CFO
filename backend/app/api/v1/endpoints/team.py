from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime

from app.core.database import get_db
from app.core.deps import require_user
from app.models.user import User
from app.models.team import Employee
from app.schemas.team import EmployeeCreate, EmployeeUpdate, EmployeeResponse

router = APIRouter()

# Professional Tax slabs by state (Monthly)
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
    "GJ": [  # Gujarat
        (0, 11500, 0),
        (11500, 15000, 100),
        (15000, float('inf'), 200),
    ],
    "RJ": [  # Rajasthan
        (0, 13000, 0),
        (13000, 20000, 100),
        (20000, float('inf'), 200),
    ],
    "UP": [  # Uttar Pradesh
        (0, 10000, 0),
        (10000, 20000, 100),
        (20000, float('inf'), 200),
    ],
    "AP": [  # Andhra Pradesh
        (0, 15000, 0),
        (15000, float('inf'), 200),
    ],
}


STATE_NAME_MAP = {
    "maharashtra": "MH", "mh": "MH",
    "karnataka": "KA", "ka": "KA",
    "west bengal": "WB", "wb": "WB",
    "delhi": "DL", "dl": "DL",
    "tamil nadu": "TN", "tn": "TN",
    "gujarat": "GJ", "gj": "GJ",
    "rajasthan": "RJ", "rj": "RJ",
    "uttar pradesh": "UP", "up": "UP",
    "andhra pradesh": "AP", "ap": "AP",
}

def calculate_ptax(state: str, monthly_salary: float) -> float:
    """Calculate monthly Professional Tax based on state and salary."""
    state_key = STATE_NAME_MAP.get(state.lower(), state.upper())
    slabs = PTAX_SLABS.get(state_key)
    if not slabs:
        return 0

    # Find applicable slab
    for min_sal, max_sal, tax in slabs:
        if min_sal <= monthly_salary < max_sal:
            return float(tax)

    return 0


@router.get("/", response_model=list[EmployeeResponse])
async def list_employees(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """List employees for the user."""
    result = await db.execute(
        select(Employee).where(Employee.user_id == user.id)
    )
    return result.scalars().all()


@router.post("/", response_model=EmployeeResponse)
async def create_employee(
    data: EmployeeCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new employee with auto-calculated Professional Tax."""
    # Calculate Professional Tax based on state and salary
    ptax_monthly = calculate_ptax(data.state, data.monthly_salary)

    employee = Employee(
        user_id=user.id,
        name=data.name,
        email=data.email,
        role=data.role,
        department=data.department,
        state=data.state,
        monthly_salary=data.monthly_salary,
        pan=data.pan,
        pf_number=data.pf_number,
        esi_number=data.esi_number,
        ptax_monthly=ptax_monthly,
        is_active=True,
        joined_at=datetime.utcnow(),
    )
    db.add(employee)
    await db.commit()
    await db.refresh(employee)
    return employee


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific employee."""
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.id == employee_id,
                Employee.user_id == user.id,
            )
        )
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: str,
    data: EmployeeUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an employee."""
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.id == employee_id,
                Employee.user_id == user.id,
            )
        )
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = data.dict(exclude_unset=True)

    # Recalculate PTAX if salary or state changed
    if "monthly_salary" in update_data or "state" in update_data:
        state = update_data.get("state", employee.state)
        salary = update_data.get("monthly_salary", employee.monthly_salary)
        employee.ptax_monthly = calculate_ptax(state, salary)

    for key, value in update_data.items():
        if key != "ptax_monthly":  # Don't override calculated ptax
            setattr(employee, key, value)

    await db.commit()
    await db.refresh(employee)
    return employee


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an employee."""
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.id == employee_id,
                Employee.user_id == user.id,
            )
        )
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    await db.delete(employee)
    await db.commit()
    return {"message": "Employee deleted"}


@router.get("/summary/payroll")
async def get_payroll_summary(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get payroll summary aggregating salary, PTAX, and PF costs."""
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.user_id == user.id,
                Employee.is_active == True,
            )
        )
    )
    employees = result.scalars().all()

    total_monthly_salary = sum(e.monthly_salary for e in employees)
    total_monthly_ptax = sum(e.ptax_monthly for e in employees)

    # Assume 12% PF contribution
    pf_rate = 0.12
    total_monthly_pf = total_monthly_salary * pf_rate

    total_monthly_cost = total_monthly_salary + total_monthly_ptax + total_monthly_pf

    return {
        "employee_count": len(employees),
        "total_monthly_salary": round(total_monthly_salary, 2),
        "total_monthly_ptax": round(total_monthly_ptax, 2),
        "total_monthly_pf": round(total_monthly_pf, 2),
        "total_monthly_cost": round(total_monthly_cost, 2),
        "annual_salary_cost": round(total_monthly_salary * 12, 2),
        "annual_ptax_cost": round(total_monthly_ptax * 12, 2),
        "annual_pf_cost": round(total_monthly_pf * 12, 2),
        "annual_total_cost": round(total_monthly_cost * 12, 2),
        "average_monthly_salary": round(total_monthly_salary / len(employees), 2) if employees else 0,
    }
