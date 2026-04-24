import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String)
    department: Mapped[str | None] = mapped_column(String, nullable=True)
    state: Mapped[str] = mapped_column(String)  # MH, KA, DL, etc.
    monthly_salary: Mapped[float] = mapped_column(Float)
    pan: Mapped[str | None] = mapped_column(String, nullable=True)
    pf_number: Mapped[str | None] = mapped_column(String, nullable=True)
    esi_number: Mapped[str | None] = mapped_column(String, nullable=True)
    ptax_monthly: Mapped[float] = mapped_column(Float, default=0)
    is_active: Mapped[bool] = mapped_column(default=True)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
