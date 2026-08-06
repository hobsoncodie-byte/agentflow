import csv
from collections.abc import Iterable
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from app.core.types import Symbol
from app.modules.market_data.domain.models import Candle


class CsvReplayMarketDataProvider:
    """Reads candles from local CSV fixtures instead of a live vendor.

    No real market data vendor has been selected yet (KNOWN_ISSUES.md #1),
    so this is the only MarketDataProvider implementation that exists today.
    It is deliberately not a substitute for a real vendor integration: it
    exists so the ingestion pipeline, Backtesting Engine, and tests can run
    end-to-end against known, reproducible data. Swapping in a real vendor
    adapter later requires no change to MarketDataService or anything
    downstream of it (ARCHITECTURE.md §3).

    Expects one CSV file per (symbol, timeframe) at
    `{data_dir}/{symbol}_{timeframe}.csv` with header:
    event_time,open,high,low,close,volume
    where event_time is ISO 8601 with a UTC offset.
    """

    def __init__(self, data_dir: Path) -> None:
        self._data_dir = data_dir

    def fetch_historical(
        self, symbol: Symbol, timeframe: str, start: datetime, end: datetime
    ) -> Iterable[Candle]:
        path = self._data_dir / f"{symbol.value}_{timeframe}.csv"
        if not path.is_file():
            raise FileNotFoundError(
                f"no replay fixture for {symbol}/{timeframe} at {path} — "
                "this adapter only serves data that has been placed there; "
                "it does not fall back to a live vendor"
            )

        with path.open(newline="") as f:
            for row in csv.DictReader(f):
                event_time = datetime.fromisoformat(row["event_time"])
                if event_time.tzinfo is None:
                    raise ValueError(f"{path}: event_time '{row['event_time']}' is not timezone-aware")
                if not (start <= event_time < end):
                    continue
                yield Candle(
                    symbol=symbol,
                    timeframe=timeframe,
                    event_time=event_time,
                    open=Decimal(row["open"]),
                    high=Decimal(row["high"]),
                    low=Decimal(row["low"]),
                    close=Decimal(row["close"]),
                    volume=Decimal(row["volume"]),
                    source=f"replay:{path.name}",
                )
