from collections.abc import Iterable
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.types import Symbol
from app.db.models.market_data import Candle as CandleRow
from app.modules.market_data.domain.models import Candle


class SqlAlchemyCandleRepository:
    """Postgres-backed CandleRepository — see DATABASE.md §3."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def add_many(self, instrument_id: int, candles: Iterable[Candle]) -> int:
        rows = [
            {
                "instrument_id": instrument_id,
                "timeframe": c.timeframe,
                "event_time": c.event_time,
                "open": c.open,
                "high": c.high,
                "low": c.low,
                "close": c.close,
                "volume": c.volume,
                "source": c.source,
            }
            for c in candles
        ]
        if not rows:
            return 0

        stmt = (
            insert(CandleRow)
            .values(rows)
            .on_conflict_do_nothing(index_elements=["instrument_id", "timeframe", "event_time"])
            .returning(CandleRow.id)
        )
        result = self._session.execute(stmt)
        inserted = len(result.fetchall())
        self._session.commit()
        return inserted

    def get_latest(self, instrument_id: int, symbol: Symbol, timeframe: str) -> Candle | None:
        stmt = (
            select(CandleRow)
            .where(CandleRow.instrument_id == instrument_id, CandleRow.timeframe == timeframe)
            .order_by(CandleRow.event_time.desc())
            .limit(1)
        )
        row = self._session.execute(stmt).scalar_one_or_none()
        return self._to_domain(row, symbol) if row is not None else None

    def get_range(
        self, instrument_id: int, symbol: Symbol, timeframe: str, start: datetime, end: datetime
    ) -> list[Candle]:
        stmt = (
            select(CandleRow)
            .where(
                CandleRow.instrument_id == instrument_id,
                CandleRow.timeframe == timeframe,
                CandleRow.event_time >= start,
                CandleRow.event_time < end,
            )
            .order_by(CandleRow.event_time.asc())
        )
        rows = self._session.execute(stmt).scalars().all()
        return [self._to_domain(row, symbol) for row in rows]

    @staticmethod
    def _to_domain(row: CandleRow, symbol: Symbol) -> Candle:
        return Candle(
            symbol=symbol,
            timeframe=row.timeframe,
            event_time=row.event_time,
            open=Decimal(str(row.open)),
            high=Decimal(str(row.high)),
            low=Decimal(str(row.low)),
            close=Decimal(str(row.close)),
            volume=Decimal(str(row.volume)),
            source=row.source,
        )
