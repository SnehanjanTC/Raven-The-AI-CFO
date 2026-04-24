import uuid
from datetime import datetime, date
from sqlalchemy import String, Float, DateTime, Date, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    invoice_no: Mapped[str] = mapped_column(String, index=True)
    client_name: Mapped[str] = mapped_column(String)
    client_gstin: Mapped[str | None] = mapped_column(String, nullable=True)
    issue_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Float)
    gst_amount: Mapped[float] = mapped_column(Float, default=0)
    tds_amount: Mapped[float] = mapped_column(Float, default=0)
    total_amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String, default="draft")  # draft, sent, paid, overdue, cancelled
    payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    hsn_code: Mapped[str | None] = mapped_column(String, nullable=True)
    place_of_supply: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
