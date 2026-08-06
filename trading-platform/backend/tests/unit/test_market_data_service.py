from collections.abc import Iterable
from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.core.errors import InstrumentNotFoundError
from app.core.events import EventBus
from app.core.types import Symbol
from app.modules.market_data.domain.models import Candle, InstrumentRef
from app.modules.market_data.services.market_data_service import MarketDataService


def make_candle(symbol: Symbol, minute: int) -> Candle:
    return Candle(
        symbol=symbol,
        timeframe="1m",
        event_time=datetime(2026, 8, 5, 13, 30 + minute, tzinfo=UTC),
        open=Decimal(5500),
        high=Decimal(5501),
        low=Decimal(5499),
        close=Decimal("5500.5"),
        volume=Decimal(1000),
        source="fixture",
    )


class FakeInstrumentLookup:
    def __init__(self, known: dict[str, InstrumentRef]) -> None:
        self._known = known

    def get_by_symbol(self, symbol: Symbol) -> InstrumentRef | None:
        return self._known.get(symbol.value)


class FakeMarketDataProvider:
    def __init__(self, candles: list[Candle]) -> None:
        self._candles = candles

    def fetch_historical(
        self, symbol: Symbol, timeframe: str, start: datetime, end: datetime
    ) -> Iterable[Candle]:
        return [c for c in self._candles if start <= c.event_time < end]


class FakeCandleRepository:
    def __init__(self) -> None:
        self._rows: dict[tuple[int, str, datetime], Candle] = {}

    def add_many(self, instrument_id: int, candles: Iterable[Candle]) -> int:
        inserted = 0
        for c in candles:
            key = (instrument_id, c.timeframe, c.event_time)
            if key not in self._rows:
                self._rows[key] = c
                inserted += 1
        return inserted

    def get_latest(self, instrument_id: int, symbol: Symbol, timeframe: str) -> Candle | None:
        matches = [
            c for (iid, tf, _et), c in self._rows.items() if iid == instrument_id and tf == timeframe
        ]
        return max(matches, key=lambda c: c.event_time) if matches else None

    def get_range(
        self, instrument_id: int, symbol: Symbol, timeframe: str, start: datetime, end: datetime
    ) -> list[Candle]:
        matches = [
            c
            for (iid, tf, et), c in self._rows.items()
            if iid == instrument_id and tf == timeframe and start <= et < end
        ]
        return sorted(matches, key=lambda c: c.event_time)


MES = Symbol("MES")
MES_REF = InstrumentRef(id=1, symbol=MES, tick_size=Decimal("0.25"))


def make_service(candles: list[Candle] | None = None, events: EventBus | None = None) -> MarketDataService:
    return MarketDataService(
        provider=FakeMarketDataProvider(candles or []),
        repository=FakeCandleRepository(),
        instruments=FakeInstrumentLookup({"MES": MES_REF}),
        events=events,
    )


def test_backfill_historical_persists_and_returns_count():
    candles = [make_candle(MES, 0), make_candle(MES, 1)]
    service = make_service(candles)

    inserted = service.backfill_historical(
        MES, "1m", datetime(2026, 8, 5, 0, 0, tzinfo=UTC), datetime(2026, 8, 6, 0, 0, tzinfo=UTC)
    )

    assert inserted == 2
    assert service.get_latest(MES, "1m") == candles[1]


def test_backfill_historical_is_idempotent():
    candles = [make_candle(MES, 0)]
    service = make_service(candles)
    args = (MES, "1m", datetime(2026, 8, 5, 0, 0, tzinfo=UTC), datetime(2026, 8, 6, 0, 0, tzinfo=UTC))

    assert service.backfill_historical(*args) == 1
    assert service.backfill_historical(*args) == 0


def test_backfill_unknown_symbol_raises():
    service = make_service([])
    with pytest.raises(InstrumentNotFoundError):
        service.backfill_historical(
            Symbol("ES"), "1m", datetime(2026, 8, 5, tzinfo=UTC), datetime(2026, 8, 6, tzinfo=UTC)
        )


async def test_ingest_bar_persists_and_publishes_event():
    events = EventBus()
    received = []
    from app.modules.market_data.domain.events import CandleClosed

    events.subscribe(CandleClosed, lambda e: received.append(e))
    service = make_service(events=events)
    candle = make_candle(MES, 0)

    result = await service.ingest_bar(candle)

    assert result == candle
    assert service.get_latest(MES, "1m") == candle
    assert len(received) == 1
    assert received[0].candle == candle
    assert received[0].instrument_id == MES_REF.id


def test_get_range_delegates_to_repository():
    candles = [make_candle(MES, 0), make_candle(MES, 1), make_candle(MES, 2)]
    service = make_service(candles)
    service.backfill_historical(
        MES, "1m", datetime(2026, 8, 5, tzinfo=UTC), datetime(2026, 8, 6, tzinfo=UTC)
    )

    result = service.get_range(
        MES, "1m", datetime(2026, 8, 5, 13, 31, tzinfo=UTC), datetime(2026, 8, 6, tzinfo=UTC)
    )

    assert result == candles[1:]
