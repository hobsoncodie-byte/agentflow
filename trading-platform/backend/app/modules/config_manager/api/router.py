from collections.abc import Sequence
from datetime import datetime, time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import (
    ConfigNotFoundError,
    ConfigValidationError,
    RiskLimitChangeRequiresRestartError,
)
from app.db.base import get_session
from app.db.models.reference import Instrument, TradingSession
from app.modules.config_manager.domain.models import ConfigVersionRecord
from app.modules.config_manager.repositories.config_repository import (
    SqlAlchemyConfigVersionRepository,
)
from app.modules.config_manager.services.config_service import ConfigService
from app.modules.config_manager.services.registry import registry

router = APIRouter(prefix="/api/v1/config", tags=["config"])


def get_config_service(session: Session = Depends(get_session)) -> ConfigService:
    repo = SqlAlchemyConfigVersionRepository(session)
    return ConfigService(repo, registry)


def _error_response(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details or {}}}


class ConfigVersionResponse(BaseModel):
    id: int | None
    module: str
    version: int
    config: dict[str, Any]
    is_risk_limit_change: bool
    applied_by: str
    note: str | None
    applied_at: datetime | None


class ProposeConfigRequest(BaseModel):
    config: dict[str, Any]
    applied_by: str
    note: str | None = None
    acknowledge_restart: bool = False


class SessionResponse(BaseModel):
    id: int
    name: str
    start_time: time
    end_time: time
    timezone: str
    active: bool

    model_config = {"from_attributes": True}


class InstrumentResponse(BaseModel):
    id: int
    symbol: str
    exchange: str
    tick_size: float
    tick_value: float
    contract_multiplier: float
    currency: str
    active: bool

    model_config = {"from_attributes": True}


# NOTE: these fixed-path routes must be registered before the "/{module}"
# catch-all below, or a request to e.g. /sessions would be swallowed by the
# generic module-lookup route instead (FastAPI matches in declaration order).
@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(session: Session = Depends(get_session)) -> Sequence[TradingSession]:
    return session.execute(select(TradingSession)).scalars().all()


@router.get("/instruments", response_model=list[InstrumentResponse])
def list_instruments(session: Session = Depends(get_session)) -> Sequence[Instrument]:
    return session.execute(select(Instrument)).scalars().all()


@router.get("/{module}", response_model=ConfigVersionResponse)
def get_active_config(
    module: str, service: ConfigService = Depends(get_config_service)
) -> ConfigVersionRecord:
    try:
        record = service.get_active(module)
    except ConfigNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=_error_response("CONFIG_NOT_FOUND", str(exc)),
        ) from exc
    return record


@router.get("/{module}/history", response_model=list[ConfigVersionResponse])
def get_config_history(
    module: str, service: ConfigService = Depends(get_config_service)
) -> list[ConfigVersionRecord]:
    return service.get_history(module)


@router.put("/{module}", response_model=ConfigVersionResponse)
def propose_config(
    module: str,
    body: ProposeConfigRequest,
    service: ConfigService = Depends(get_config_service),
) -> ConfigVersionRecord:
    try:
        return service.propose_version(
            module=module,
            new_config=body.config,
            applied_by=body.applied_by,
            note=body.note,
            acknowledge_restart=body.acknowledge_restart,
        )
    except RiskLimitChangeRequiresRestartError as exc:
        raise HTTPException(
            status_code=409,
            detail=_error_response("RISK_LIMIT_CHANGE_REQUIRES_RESTART", str(exc)),
        ) from exc
    except ConfigValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=_error_response("CONFIG_VALIDATION_FAILED", str(exc)),
        ) from exc
