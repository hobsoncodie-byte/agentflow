from datetime import datetime

from sqlalchemy import DateTime, Identity, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Candle(Base):
    """A single OHLCV bar — see DATABASE.md §3.

    Partitioned by `event_time` at the DDL level (see the hand-written
    migration in db/migrations/versions/); this ORM mapping only describes
    the columns for querying, it does not perform the partitioning itself.
    """

    __tablename__ = "candles"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    instrument_id: Mapped[int] = mapped_column(nullable=False)
    timeframe: Mapped[str] = mapped_column(String, nullable=False)
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    open: Mapped[float] = mapped_column(Numeric, nullable=False)
    high: Mapped[float] = mapped_column(Numeric, nullable=False)
    low: Mapped[float] = mapped_column(Numeric, nullable=False)
    close: Mapped[float] = mapped_column(Numeric, nullable=False)
    volume: Mapped[float] = mapped_column(Numeric, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
