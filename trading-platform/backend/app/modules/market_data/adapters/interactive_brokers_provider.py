import math
from collections.abc import Iterable
from datetime import UTC, datetime
from decimal import Decimal
from typing import Protocol

from app.core.types import Symbol
from app.modules.market_data.domain.models import Candle

_BAR_SIZE_BY_TIMEFRAME = {
    "1m": "1 min",
    "5m": "5 mins",
    "15m": "15 mins",
    "1h": "1 hour",
    "1d": "1 day",
}


class _IBBar(Protocol):
    date: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class _IBContract(Protocol):
    ...


class _IBClient(Protocol):
    """The subset of ib_async.IB this adapter actually uses.

    Kept narrow and structural (not importing ib_async's IB class directly
    in the type) so unit tests can inject a fake without a real TWS/Gateway
    connection or the ib_async dependency's network stack.
    """

    def reqHistoricalData(
        self,
        contract: _IBContract,
        endDateTime: datetime,
        durationStr: str,
        barSizeSetting: str,
        whatToShow: str,
        useRTH: bool,
        formatDate: int,
    ) -> list[_IBBar]: ...


class InteractiveBrokersMarketDataProvider:
    """MarketDataProvider backed by Interactive Brokers via ib_async.

    IMPORTANT — not yet verified against a live IB connection. This adapter
    was implemented and unit-tested against a fake IB client (contract
    construction, bar-size mapping, duration-string calculation, and bar
    translation are all covered), but this sandbox has no running TWS/IB
    Gateway, no IB account, and no network path to one. Closing out
    Milestone 2's "demonstrated backfill + live ingestion against real
    vendor data" gate requires the user to run this against their own
    TWS/IB Gateway with valid CME market data permissions for the target
    instrument — see KNOWN_ISSUES.md #1.

    Requires an already-connected `ib_async.IB` instance; connecting is the
    caller's responsibility (see `app.modules.market_data.adapters.ib_connection`).

    Known limitation: does not chunk requests to stay under IB's historical
    data pacing/size limits (e.g. ~6 requests/10s, per-bar-size max duration).
    For v1 this is left as a follow-up once real usage patterns are known —
    building elaborate rate-limit handling against rules that can't be
    verified here risks guessing at behavior the philosophy explicitly warns
    against.
    """

    def __init__(self, ib: _IBClient, exchange: str = "CME", currency: str = "USD") -> None:
        self._ib = ib
        self._exchange = exchange
        self._currency = currency

    def fetch_historical(
        self, symbol: Symbol, timeframe: str, start: datetime, end: datetime
    ) -> Iterable[Candle]:
        bar_size = _BAR_SIZE_BY_TIMEFRAME.get(timeframe)
        if bar_size is None:
            raise ValueError(
                f"unsupported timeframe for Interactive Brokers: {timeframe!r} "
                f"(supported: {sorted(_BAR_SIZE_BY_TIMEFRAME)})"
            )

        contract = self._build_contract(symbol)
        duration = self._duration_str(start, end)

        bars = self._ib.reqHistoricalData(
            contract,
            endDateTime=end,
            durationStr=duration,
            barSizeSetting=bar_size,
            whatToShow="TRADES",
            useRTH=False,
            formatDate=2,  # UTC datetimes
        )

        for bar in bars:
            event_time = bar.date if bar.date.tzinfo is not None else bar.date.replace(tzinfo=UTC)
            if not (start <= event_time < end):
                continue
            yield Candle(
                symbol=symbol,
                timeframe=timeframe,
                event_time=event_time,
                open=Decimal(str(bar.open)),
                high=Decimal(str(bar.high)),
                low=Decimal(str(bar.low)),
                close=Decimal(str(bar.close)),
                volume=Decimal(str(bar.volume)),
                source="interactive_brokers",
            )

    def _build_contract(self, symbol: Symbol) -> _IBContract:
        from ib_async import ContFuture

        return ContFuture(symbol=symbol.value, exchange=self._exchange, currency=self._currency)

    @staticmethod
    def _duration_str(start: datetime, end: datetime) -> str:
        if end <= start:
            raise ValueError(f"end ({end}) must be after start ({start})")
        days = max(1, math.ceil((end - start).total_seconds() / 86400))
        if days <= 365:
            return f"{days} D"
        return f"{math.ceil(days / 365)} Y"
