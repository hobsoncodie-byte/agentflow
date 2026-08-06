from datetime import datetime, time
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Numeric,
    SmallInteger,
    String,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Instrument(Base):
    """Config-driven instrument specification — see DATABASE.md §2."""

    __tablename__ = "instruments"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    exchange: Mapped[str] = mapped_column(String, nullable=False)
    tick_size: Mapped[float] = mapped_column(Numeric, nullable=False)
    tick_value: Mapped[float] = mapped_column(Numeric, nullable=False)
    contract_multiplier: Mapped[float] = mapped_column(Numeric, nullable=False)
    currency: Mapped[str] = mapped_column(String, nullable=False, default="USD")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class TradingSession(Base):
    """Config-driven trading session window — see DATABASE.md §2."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    timezone: Mapped[str] = mapped_column(String, nullable=False, default="America/New_York")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ConfigVersion(Base):
    """Versioned configuration snapshot — see DATABASE.md §2 and ARCHITECTURE.md §8."""

    __tablename__ = "config_versions"
    __table_args__ = (UniqueConstraint("module", "version"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    module: Mapped[str] = mapped_column(String, nullable=False)
    version: Mapped[int] = mapped_column(nullable=False)
    config_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    is_risk_limit_change: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    applied_by: Mapped[str] = mapped_column(String, nullable=False)
    note: Mapped[str | None] = mapped_column(String, nullable=True)
