from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.core.types import Symbol
from app.modules.market_data.domain.models import Candle
from app.modules.market_data.services.data_integrity_service import DataIntegrityService

MES = Symbol("MES")


class FakeLatestCandleSource:
    def __init__(self, candle: Candle | None) -> None:
        self._candle = candle

    def get_latest(self, symbol: Symbol, timeframe: str) -> Candle | None:
        return self._candle


def make_candle(event_time: datetime) -> Candle:
    return Candle(
        symbol=MES,
        timeframe="1m",
        event_time=event_time,
        open=Decimal(5500),
        high=Decimal(5501),
        low=Decimal(5499),
        close=Decimal("5500.5"),
        volume=Decimal(1000),
        source="fixture",
    )


def test_no_data_is_reported_stale():
    service = DataIntegrityService(FakeLatestCandleSource(None))

    report = service.check_staleness(MES, "1m", timedelta(seconds=60))

    assert report.is_stale is True
    assert report.latest_event_time is None


def test_fresh_candle_is_not_stale():
    fresh = make_candle(datetime.now(UTC) - timedelta(seconds=5))
    service = DataIntegrityService(FakeLatestCandleSource(fresh))

    report = service.check_staleness(MES, "1m", timedelta(seconds=60))

    assert report.is_stale is False
    assert report.latest_event_time == fresh.event_time


def test_old_candle_is_stale():
    old = make_candle(datetime.now(UTC) - timedelta(seconds=600))
    service = DataIntegrityService(FakeLatestCandleSource(old))

    report = service.check_staleness(MES, "1m", timedelta(seconds=60))

    assert report.is_stale is True
