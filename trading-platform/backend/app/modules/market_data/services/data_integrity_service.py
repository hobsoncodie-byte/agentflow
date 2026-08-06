from datetime import timedelta

from app.core.clock import Clock
from app.core.types import Symbol
from app.modules.market_data.domain.models import DataIntegrityReport
from app.modules.market_data.domain.ports import LatestCandleSource


class DataIntegrityService:
    """Detects stale/missing data so the Rule Engine's 'data fresh' rule can
    fail closed rather than trade on stale candles (ARCHITECTURE.md §10).
    """

    def __init__(self, market_data: LatestCandleSource) -> None:
        self._market_data = market_data

    def check_staleness(
        self, symbol: Symbol, timeframe: str, max_age: timedelta
    ) -> DataIntegrityReport:
        latest = self._market_data.get_latest(symbol, timeframe)
        now = Clock.utcnow()
        is_stale = latest is None or (now - latest.event_time) > max_age
        return DataIntegrityReport(
            symbol=symbol,
            timeframe=timeframe,
            latest_event_time=latest.event_time if latest is not None else None,
            is_stale=is_stale,
            checked_at=now,
        )
