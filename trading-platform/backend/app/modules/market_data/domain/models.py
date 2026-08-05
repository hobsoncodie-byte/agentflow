from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from app.core.types import Symbol


@dataclass(frozen=True)
class Candle:
    """A single OHLCV bar for one instrument/timeframe — see DATABASE.md §3."""

    symbol: Symbol
    timeframe: str
    event_time: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    source: str

    def __post_init__(self) -> None:
        if self.event_time.tzinfo is None:
            raise ValueError("Candle.event_time must be timezone-aware")
        if not self.timeframe:
            raise ValueError("Candle.timeframe must not be empty")
        if self.high < self.low:
            raise ValueError(f"Candle.high ({self.high}) must be >= Candle.low ({self.low})")


@dataclass(frozen=True)
class DataIntegrityReport:
    """Whether the latest known candle for a symbol/timeframe is fresh enough
    to trust — see ARCHITECTURE.md §10 (silent data gaps risk)."""

    symbol: Symbol
    timeframe: str
    latest_event_time: datetime | None
    is_stale: bool
    checked_at: datetime


@dataclass(frozen=True)
class InstrumentRef:
    """Minimal instrument identity/spec as seen by the Market Data Engine.

    Market Data Engine reads instrument reference data (owned by the
    Configuration Manager's `instruments` table) but never writes it —
    see ARCHITECTURE.md §4.
    """

    id: int
    symbol: Symbol
    tick_size: Decimal
