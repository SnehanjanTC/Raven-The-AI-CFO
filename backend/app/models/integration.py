import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class IntegrationConnection(Base):
    __tablename__ = "integration_connections"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    provider: Mapped[str] = mapped_column(String)  # razorpay, zoho, tally, hdfc, gst-portal, etc.
    display_name: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)  # banking, payments, accounting, government, hr
    status: Mapped[str] = mapped_column(String, default="connected")  # connected, error, disconnected
    encrypted_credentials: Mapped[str] = mapped_column(Text)  # Fernet-encrypted JSON
    environment: Mapped[str] = mapped_column(String, default="sandbox")  # sandbox, production
    last_sync: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sync_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
