from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ErrorLogEntry(Base):
    """Every error, from every module — see DATABASE.md §10."""

    __tablename__ = "error_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    module: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)  # 'warning','error','critical'
    message: Mapped[str] = mapped_column(String, nullable=False)
    context: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class NotificationLogEntry(Base):
    """Every notification sent, for audit — see DATABASE.md §10."""

    __tablename__ = "notifications_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    channel: Mapped[str] = mapped_column(String, nullable=False)  # 'email','slack','push'
    category: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    delivery_status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
