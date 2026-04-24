import uuid
from datetime import datetime, date
from sqlalchemy import String, Float, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Filing(Base):
    __tablename__ = "filings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String)  # TDS-26Q, GSTR-1, GSTR-3B, PT-Return, ITR, ROC
    period: Mapped[str] = mapped_column(String)  # e.g., "Q4 FY2025-26", "March 2026"
    due_date: Mapped[date] = mapped_column(Date)
    filed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending, filed, overdue, rejected
    amount: Mapped[float] = mapped_column(Float, default=0)
    penalty: Mapped[float] = mapped_column(Float, default=0)
    ack_number: Mapped[str | None] = mapped_column(String, nullable=True)
    portal: Mapped[str | None] = mapped_column(String, nullable=True)  # GST Portal, TRACES, MCA
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
