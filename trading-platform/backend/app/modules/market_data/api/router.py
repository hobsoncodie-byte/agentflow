from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import InstrumentNotFoundError
from app.core.events import EventBus
from app.core.types import Symbol
from app.db.base import get_session
from app.modules.market_data.adapters.csv_replay_provider import CsvReplayMarketDataProvider
from app.modules.market_data.adapters.interactive_brokers_provider import (
    InteractiveBrokersMarketDataProvider,
)
from app.modules.market_data.domain.models import Candle, DataIntegrityReport
from app.modules.market_data.domain.ports import MarketDataProvider
from app.modules.market_data.repositories.candle_repository import SqlAlchemyCandleRepository
from app.modules.market_data.repositories.instrument_lookup import SqlAlchemyInstrumentLookup
from app.modules.market_data.services.data_integrity_service import DataIntegrityService
from app.modules.market_data.services.market_data_service import MarketDataService

router = APIRouter(prefix="/api/v1/market-data", tags=["market-data"])

# Shared for the process lifetime — swap for a real vendor's EventBus wiring
# once one is chosen; nothing else in this router changes when that happens.
_event_bus = EventBus()


def _build_provider(request: Request, settings: Settings) -> MarketDataProvider:
    if settings.market_data_provider == "interactive_brokers":
        ib = getattr(request.app.state, "ib", None)
        if ib is None:
            raise RuntimeError(
                "market_data_provider=interactive_brokers but no IB connection was "
                "established at startup — check ib_host/ib_port/ib_client_id and that "
                "TWS/IB Gateway is running (see app.main's lifespan hook)"
            )
        return InteractiveBrokersMarketDataProvider(ib)
    return CsvReplayMarketDataProvider(Path(settings.market_data_replay_dir))


def get_market_data_service(
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MarketDataService:
    provider = _build_provider(request, settings)
    repository = SqlAlchemyCandleRepository(session)
    instruments = SqlAlchemyInstrumentLookup(session)
    return MarketDataService(provider, repository, instruments, events=_event_bus)


def get_data_integrity_service(
    market_data: MarketDataService = Depends(get_market_data_service),
) -> DataIntegrityService:
    return DataIntegrityService(market_data)


def _error_response(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details or {}}}


class _SymbolResponseModel(BaseModel):
    """Base for response models whose `symbol` field comes from our Symbol
    value object rather than a plain str."""

    symbol: str

    @field_validator("symbol", mode="before")
    @classmethod
    def _stringify_symbol(cls, v: object) -> str:
        return str(v)


class CandleResponse(_SymbolResponseModel):
    timeframe: str
    event_time: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    source: str


class BackfillRequest(BaseModel):
    symbol: str
    timeframe: str
    start: datetime
    end: datetime


class BackfillResponse(BaseModel):
    inserted: int


class DataIntegrityResponse(_SymbolResponseModel):
    timeframe: str
    latest_event_time: datetime | None
    is_stale: bool
    checked_at: datetime


@router.get("/candles", response_model=list[CandleResponse])
def get_candles(
    symbol: str,
    timeframe: str,
    from_: datetime = Query(..., alias="from"),
    to: datetime = Query(...),
    service: MarketDataService = Depends(get_market_data_service),
) -> list[Candle]:
    try:
        return service.get_range(Symbol(symbol), timeframe, from_, to)
    except InstrumentNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=_error_response("INSTRUMENT_NOT_FOUND", str(exc))
        ) from exc


@router.get("/candles/latest", response_model=CandleResponse | None)
def get_latest_candle(
    symbol: str,
    timeframe: str,
    service: MarketDataService = Depends(get_market_data_service),
) -> Candle | None:
    try:
        return service.get_latest(Symbol(symbol), timeframe)
    except InstrumentNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=_error_response("INSTRUMENT_NOT_FOUND", str(exc))
        ) from exc


@router.post("/backfill", response_model=BackfillResponse)
def backfill(
    body: BackfillRequest,
    service: MarketDataService = Depends(get_market_data_service),
) -> BackfillResponse:
    try:
        inserted = service.backfill_historical(
            Symbol(body.symbol), body.timeframe, body.start, body.end
        )
    except InstrumentNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=_error_response("INSTRUMENT_NOT_FOUND", str(exc))
        ) from exc
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=424, detail=_error_response("NO_DATA_SOURCE", str(exc))
        ) from exc
    return BackfillResponse(inserted=inserted)


@router.get("/data-integrity", response_model=DataIntegrityResponse)
def data_integrity(
    symbol: str,
    timeframe: str,
    max_age_seconds: int = 120,
    service: DataIntegrityService = Depends(get_data_integrity_service),
) -> DataIntegrityReport:
    try:
        return service.check_staleness(Symbol(symbol), timeframe, timedelta(seconds=max_age_seconds))
    except InstrumentNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail=_error_response("INSTRUMENT_NOT_FOUND", str(exc))
        ) from exc
