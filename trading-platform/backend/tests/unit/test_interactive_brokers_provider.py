from dataclasses import dataclass, field
from datetime import UTC, datetime

import pytest

from app.core.types import Symbol
from app.modules.market_data.adapters.interactive_brokers_provider import (
    InteractiveBrokersMarketDataProvider,
)

MES = Symbol("MES")


@dataclass
class FakeBar:
    date: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass
class FakeIBClient:
    bars_to_return: list[FakeBar] = field(default_factory=list)
    last_call: dict | None = None

    def reqHistoricalData(
        self, contract, endDateTime, durationStr, barSizeSetting, whatToShow, useRTH, formatDate
    ):
        self.last_call = {
            "contract": contract,
            "endDateTime": endDateTime,
            "durationStr": durationStr,
            "barSizeSetting": barSizeSetting,
            "whatToShow": whatToShow,
            "useRTH": useRTH,
            "formatDate": formatDate,
        }
        return self.bars_to_return


def test_fetch_historical_builds_correct_contract_and_bar_size():
    ib = FakeIBClient(
        bars_to_return=[
            FakeBar(datetime(2026, 8, 5, 13, 30, tzinfo=UTC), 5500, 5502, 5499, 5501, 1200),
        ]
    )
    provider = InteractiveBrokersMarketDataProvider(ib)

    candles = list(
        provider.fetch_historical(
            MES, "1m", datetime(2026, 8, 5, 0, 0, tzinfo=UTC), datetime(2026, 8, 6, 0, 0, tzinfo=UTC)
        )
    )

    assert len(candles) == 1
    assert candles[0].source == "interactive_brokers"
    assert candles[0].open == 5500

    assert ib.last_call["barSizeSetting"] == "1 min"
    assert ib.last_call["whatToShow"] == "TRADES"
    assert ib.last_call["useRTH"] is False
    assert ib.last_call["contract"].symbol == "MES"
    assert ib.last_call["contract"].exchange == "CME"
    assert ib.last_call["contract"].currency == "USD"


def test_fetch_historical_filters_bars_outside_range():
    ib = FakeIBClient(
        bars_to_return=[
            FakeBar(datetime(2026, 8, 4, 23, 59, tzinfo=UTC), 1, 1, 1, 1, 1),  # before start
            FakeBar(datetime(2026, 8, 5, 12, 0, tzinfo=UTC), 2, 2, 2, 2, 2),  # in range
            FakeBar(datetime(2026, 8, 6, 0, 0, tzinfo=UTC), 3, 3, 3, 3, 3),  # at/after end
        ]
    )
    provider = InteractiveBrokersMarketDataProvider(ib)

    candles = list(
        provider.fetch_historical(
            MES, "1h", datetime(2026, 8, 5, 0, 0, tzinfo=UTC), datetime(2026, 8, 6, 0, 0, tzinfo=UTC)
        )
    )

    assert len(candles) == 1
    assert candles[0].open == 2


def test_fetch_historical_treats_naive_bar_dates_as_utc():
    ib = FakeIBClient(
        bars_to_return=[FakeBar(datetime(2026, 8, 5, 13, 30), 1, 1, 1, 1, 1)]  # noqa: DTZ001 — deliberately naive
    )
    provider = InteractiveBrokersMarketDataProvider(ib)

    candles = list(
        provider.fetch_historical(
            MES, "1d", datetime(2026, 8, 5, 0, 0, tzinfo=UTC), datetime(2026, 8, 6, 0, 0, tzinfo=UTC)
        )
    )

    assert candles[0].event_time.tzinfo is not None


def test_unsupported_timeframe_raises():
    provider = InteractiveBrokersMarketDataProvider(FakeIBClient())
    with pytest.raises(ValueError, match="unsupported timeframe"):
        list(
            provider.fetch_historical(
                MES, "3m", datetime(2026, 8, 5, tzinfo=UTC), datetime(2026, 8, 6, tzinfo=UTC)
            )
        )


@pytest.mark.parametrize(
    "start,end,expected",
    [
        (datetime(2026, 8, 5, tzinfo=UTC), datetime(2026, 8, 6, tzinfo=UTC), "1 D"),
        (datetime(2026, 8, 5, tzinfo=UTC), datetime(2026, 8, 15, tzinfo=UTC), "10 D"),
        (datetime(2025, 8, 5, tzinfo=UTC), datetime(2026, 8, 5, tzinfo=UTC), "365 D"),
        (datetime(2025, 8, 4, tzinfo=UTC), datetime(2026, 8, 5, tzinfo=UTC), "2 Y"),
    ],
)
def test_duration_str(start, end, expected):
    assert InteractiveBrokersMarketDataProvider._duration_str(start, end) == expected


def test_duration_str_rejects_non_positive_range():
    with pytest.raises(ValueError):
        InteractiveBrokersMarketDataProvider._duration_str(
            datetime(2026, 8, 6, tzinfo=UTC), datetime(2026, 8, 5, tzinfo=UTC)
        )
