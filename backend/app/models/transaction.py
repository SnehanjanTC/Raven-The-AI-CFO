import uuid
from datetime import datetime, date
from sqlalchemy import String, Float, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    date: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(String)
    amount: Mapped[float] = mapped_column(Float)
    type: Mapped[str] = mapped_column(String)  # debit, credit
    category: Mapped[str] = mapped_column(String)
    subcategory: Mapped[str | None] = mapped_column(String, nullable=True)
    vendor: Mapped[str | None] = mapped_column(String, nullable=True)
    invoice_no: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending, reconciled, cleared
    tds_section: Mapped[str | None] = mapped_column(String, nullable=True)
    tds_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    tds_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    gst_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    gst_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    hsn_code: Mapped[str | None] = mapped_column(String, nullable=True)
    bank_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    integration_id: Mapped[str | None] = mapped_column(String, nullable=True)  # source integration
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
