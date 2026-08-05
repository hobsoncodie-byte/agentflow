from datetime import UTC, datetime
from decimal import Decimal

from app.core.types import Symbol
from app.db.models.reference import Instrument
from app.modules.market_data.domain.models import Candle
from app.modules.market_data.repositories.candle_repository import SqlAlchemyCandleRepository

MES = Symbol("MES")


def _make_instrument(db_session) -> int:
    instrument = Instrument(
        symbol="MES", exchange="CME", tick_size=0.25, tick_value=1.25, contract_multiplier=5
    )
    db_session.add(instrument)
    db_session.commit()
    db_session.refresh(instrument)
    return instrument.id


def _make_candle(minute: int) -> Candle:
    return Candle(
        symbol=MES,
        timeframe="1m",
        event_time=datetime(2026, 8, 5, 13, 30 + minute, tzinfo=UTC),
        open=Decimal(5500),
        high=Decimal(5501),
        low=Decimal(5499),
        close=Decimal("5500.5"),
        volume=Decimal(1000),
        source="fixture",
    )


def test_add_many_is_idempotent(db_session):
    instrument_id = _make_instrument(db_session)
    repo = SqlAlchemyCandleRepository(db_session)
    candles = [_make_candle(0), _make_candle(1)]

    assert repo.add_many(instrument_id, candles) == 2
    # re-adding the same candles inserts nothing new
    assert repo.add_many(instrument_id, candles) == 0


def test_get_latest_returns_most_recent(db_session):
    instrument_id = _make_instrument(db_session)
    repo = SqlAlchemyCandleRepository(db_session)
    repo.add_many(instrument_id, [_make_candle(0), _make_candle(1), _make_candle(2)])

    latest = repo.get_latest(instrument_id, MES, "1m")

    assert latest is not None
    assert latest.event_time == datetime(2026, 8, 5, 13, 32, tzinfo=UTC)


def test_get_range_filters_correctly(db_session):
    instrument_id = _make_instrument(db_session)
    repo = SqlAlchemyCandleRepository(db_session)
    repo.add_many(instrument_id, [_make_candle(0), _make_candle(1), _make_candle(2)])

    result = repo.get_range(
        instrument_id, MES, "1m", datetime(2026, 8, 5, 13, 31, tzinfo=UTC), datetime(2026, 8, 6, tzinfo=UTC)
    )

    assert [c.event_time.minute for c in result] == [31, 32]


def test_get_latest_scoped_per_instrument(db_session):
    instrument_id = _make_instrument(db_session)
    repo = SqlAlchemyCandleRepository(db_session)
    repo.add_many(instrument_id, [_make_candle(0)])

    assert repo.get_latest(instrument_id + 999, MES, "1m") is None
