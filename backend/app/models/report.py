import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)  # P&L, Tax, Forecast, Audit
    period: Mapped[str] = mapped_column(String)
    version: Mapped[str] = mapped_column(String, default="v1.0")
    status: Mapped[str] = mapped_column(String, default="draft")  # draft, generated, approved, failed
    icon: Mapped[str] = mapped_column(String, default="FileText")
    data_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON metrics/content
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
