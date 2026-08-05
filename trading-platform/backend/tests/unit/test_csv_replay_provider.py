from datetime import UTC, datetime
from pathlib import Path

import pytest

from app.core.types import Symbol
from app.modules.market_data.adapters.csv_replay_provider import CsvReplayMarketDataProvider

MES = Symbol("MES")


def write_fixture(dir_path: Path) -> None:
    (dir_path / "MES_1m.csv").write_text(
        "event_time,open,high,low,close,volume\n"
        "2026-08-05T13:30:00+00:00,5500.00,5502.00,5499.50,5501.25,1200\n"
        "2026-08-05T13:31:00+00:00,5501.25,5503.00,5500.75,5502.50,980\n"
    )


def test_fetch_historical_filters_by_range(tmp_path: Path):
    write_fixture(tmp_path)
    provider = CsvReplayMarketDataProvider(tmp_path)

    candles = list(
        provider.fetch_historical(
            MES, "1m", datetime(2026, 8, 5, 13, 31, tzinfo=UTC), datetime(2026, 8, 5, 14, 0, tzinfo=UTC)
        )
    )

    assert len(candles) == 1
    assert candles[0].event_time == datetime(2026, 8, 5, 13, 31, tzinfo=UTC)
    assert candles[0].source == "replay:MES_1m.csv"


def test_missing_fixture_raises_file_not_found(tmp_path: Path):
    provider = CsvReplayMarketDataProvider(tmp_path)

    with pytest.raises(FileNotFoundError):
        list(
            provider.fetch_historical(
                MES, "1m", datetime(2026, 8, 5, tzinfo=UTC), datetime(2026, 8, 6, tzinfo=UTC)
            )
        )


def test_naive_timestamp_in_fixture_raises(tmp_path: Path):
    (tmp_path / "MES_1m.csv").write_text(
        "event_time,open,high,low,close,volume\n2026-08-05T13:30:00,5500,5502,5499.5,5501.25,1200\n"
    )
    provider = CsvReplayMarketDataProvider(tmp_path)

    with pytest.raises(ValueError, match="not timezone-aware"):
        list(
            provider.fetch_historical(
                MES, "1m", datetime(2026, 8, 5, tzinfo=UTC), datetime(2026, 8, 6, tzinfo=UTC)
            )
        )
