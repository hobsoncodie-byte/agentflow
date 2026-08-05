from dataclasses import dataclass

from app.modules.market_data.domain.models import Candle


@dataclass(frozen=True)
class CandleClosed:
    """Published whenever a new candle is persisted — consumed by Indicator
    Engine, ICT Analysis Engine, etc. (ARCHITECTURE.md §4)."""

    instrument_id: int
    candle: Candle
