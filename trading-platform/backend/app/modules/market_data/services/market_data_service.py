from datetime import datetime

from app.core.errors import InstrumentNotFoundError
from app.core.events import EventBus
from app.core.types import Symbol
from app.modules.market_data.domain.events import CandleClosed
from app.modules.market_data.domain.models import Candle, InstrumentRef
from app.modules.market_data.domain.ports import (
    CandleRepository,
    InstrumentLookup,
    MarketDataProvider,
)


class MarketDataService:
    """Use cases for the Market Data Engine: historical backfill and live ingestion.

    Provider-agnostic by design (ARCHITECTURE.md §3/§6) — the concrete
    MarketDataProvider adapter is the only thing that changes per vendor or
    per environment (research/backtest/paper/live).
    """

    def __init__(
        self,
        provider: MarketDataProvider,
        repository: CandleRepository,
        instruments: InstrumentLookup,
        events: EventBus | None = None,
    ) -> None:
        self._provider = provider
        self._repository = repository
        self._instruments = instruments
        self._events = events

    def _resolve_instrument(self, symbol: Symbol) -> InstrumentRef:
        instrument = self._instruments.get_by_symbol(symbol)
        if instrument is None:
            raise InstrumentNotFoundError(f"no active instrument for symbol '{symbol}'")
        return instrument

    def backfill_historical(
        self, symbol: Symbol, timeframe: str, start: datetime, end: datetime
    ) -> int:
        """Fetch and persist historical candles. Idempotent: re-running over an
        overlapping range never creates duplicate rows (unique index on
        instrument_id/timeframe/event_time, DATABASE.md §3).
        """
        instrument = self._resolve_instrument(symbol)
        candles = self._provider.fetch_historical(symbol, timeframe, start, end)
        return self._repository.add_many(instrument.id, candles)

    async def ingest_bar(self, candle: Candle) -> Candle:
        """Persist a single incoming live bar and publish CandleClosed."""
        instrument = self._resolve_instrument(candle.symbol)
        self._repository.add_many(instrument.id, [candle])
        if self._events is not None:
            await self._events.publish(CandleClosed(instrument_id=instrument.id, candle=candle))
        return candle

    def get_latest(self, symbol: Symbol, timeframe: str) -> Candle | None:
        instrument = self._resolve_instrument(symbol)
        return self._repository.get_latest(instrument.id, symbol, timeframe)

    def get_range(
        self, symbol: Symbol, timeframe: str, start: datetime, end: datetime
    ) -> list[Candle]:
        instrument = self._resolve_instrument(symbol)
        return self._repository.get_range(instrument.id, symbol, timeframe, start, end)
