import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Deadline(Base):
    __tablename__ = "deadlines"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    due_date: Mapped[date] = mapped_column(Date)
    urgency: Mapped[str] = mapped_column(String, default="normal")  # critical, warning, normal
    type: Mapped[str] = mapped_column(String)  # tds, gst, ptax, roc, itr
    filing_id: Mapped[str | None] = mapped_column(String, ForeignKey("filings.id"), nullable=True)
    is_completed: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
