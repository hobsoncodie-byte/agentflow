from collections.abc import Iterable
from datetime import datetime
from typing import Protocol

from app.core.types import Symbol
from app.modules.market_data.domain.models import Candle, InstrumentRef


class MarketDataProvider(Protocol):
    """A source of market data — implemented per vendor (see KNOWN_ISSUES.md #1).

    Swapping the provider implementation is the only thing that changes
    between vendors or between backtest/paper/live environments; the rest of
    the Market Data Engine is provider-agnostic.
    """

    def fetch_historical(
        self, symbol: Symbol, timeframe: str, start: datetime, end: datetime
    ) -> Iterable[Candle]:
        """Return closed candles for [start, end), in ascending event_time order."""
        ...


class CandleRepository(Protocol):
    def add_many(self, instrument_id: int, candles: Iterable[Candle]) -> int:
        """Persist candles, skipping any that already exist (idempotent on
        (instrument_id, timeframe, event_time)). Returns the count actually inserted.
        """
        ...

    def get_latest(self, instrument_id: int, symbol: Symbol, timeframe: str) -> Candle | None: ...

    def get_range(
        self, instrument_id: int, symbol: Symbol, timeframe: str, start: datetime, end: datetime
    ) -> list[Candle]: ...


class InstrumentLookup(Protocol):
    def get_by_symbol(self, symbol: Symbol) -> InstrumentRef | None: ...


class LatestCandleSource(Protocol):
    """What DataIntegrityService needs — satisfied by MarketDataService
    without coupling it to that concrete class."""

    def get_latest(self, symbol: Symbol, timeframe: str) -> Candle | None: ...
