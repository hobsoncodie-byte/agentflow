from datetime import UTC, datetime
from typing import ClassVar

import pytest

from app.core.errors import (
    ConfigNotFoundError,
    ConfigValidationError,
    RiskLimitChangeRequiresRestartError,
)
from app.modules.config_manager.domain.models import ConfigVersionRecord, ModuleConfigSchema
from app.modules.config_manager.services.config_service import ConfigService
from app.modules.config_manager.services.registry import ConfigSchemaRegistry


class FakeConfigVersionRepository:
    def __init__(self) -> None:
        self._records: dict[str, list[ConfigVersionRecord]] = {}

    def get_latest(self, module: str) -> ConfigVersionRecord | None:
        history = self._records.get(module, [])
        return history[-1] if history else None

    def get_history(self, module: str) -> list[ConfigVersionRecord]:
        return list(self._records.get(module, []))

    def add(self, record: ConfigVersionRecord) -> ConfigVersionRecord:
        stored = ConfigVersionRecord(
            id=len(self._records.get(record.module, [])) + 1,
            module=record.module,
            version=record.version,
            config=record.config,
            is_risk_limit_change=record.is_risk_limit_change,
            applied_by=record.applied_by,
            note=record.note,
            applied_at=datetime.now(UTC),
        )
        self._records.setdefault(record.module, []).append(stored)
        return stored


class RiskEngineConfig(ModuleConfigSchema):
    max_daily_loss: float
    max_trades_per_day: int

    risk_limit_fields: ClassVar[frozenset[str]] = frozenset({"max_daily_loss", "max_trades_per_day"})


class NotificationConfig(ModuleConfigSchema):
    channel: str


@pytest.fixture
def service() -> ConfigService:
    registry = ConfigSchemaRegistry()
    registry.register("risk_engine", RiskEngineConfig)
    registry.register("notifications", NotificationConfig)
    return ConfigService(FakeConfigVersionRepository(), registry)


def test_get_active_raises_when_no_config_exists(service: ConfigService):
    with pytest.raises(ConfigNotFoundError):
        service.get_active("risk_engine")


def test_unregistered_module_raises_validation_error(service: ConfigService):
    with pytest.raises(ConfigValidationError):
        service.propose_version("unknown_module", {}, applied_by="codie")


def test_invalid_config_shape_raises_validation_error(service: ConfigService):
    with pytest.raises(ConfigValidationError):
        service.propose_version("notifications", {"channel": 123}, applied_by="codie")


def test_first_version_with_risk_fields_requires_acknowledgement(service: ConfigService):
    with pytest.raises(RiskLimitChangeRequiresRestartError):
        service.propose_version(
            "risk_engine",
            {"max_daily_loss": 400, "max_trades_per_day": 3},
            applied_by="codie",
        )


def test_first_version_with_acknowledgement_succeeds(service: ConfigService):
    record = service.propose_version(
        "risk_engine",
        {"max_daily_loss": 400, "max_trades_per_day": 3},
        applied_by="codie",
        acknowledge_restart=True,
    )
    assert record.version == 1
    assert record.is_risk_limit_change is True


def test_non_risk_field_change_hot_reloads_without_acknowledgement(service: ConfigService):
    service.propose_version(
        "risk_engine",
        {"max_daily_loss": 400, "max_trades_per_day": 3},
        applied_by="codie",
        acknowledge_restart=True,
    )
    # a hypothetical non-risk field would hot-reload; here we just re-submit
    # identical risk values to confirm "unchanged" is not treated as a change
    record = service.propose_version(
        "risk_engine",
        {"max_daily_loss": 400, "max_trades_per_day": 3},
        applied_by="codie",
    )
    assert record.version == 2
    assert record.is_risk_limit_change is False


def test_changing_risk_field_without_acknowledgement_is_rejected(service: ConfigService):
    service.propose_version(
        "risk_engine",
        {"max_daily_loss": 400, "max_trades_per_day": 3},
        applied_by="codie",
        acknowledge_restart=True,
    )
    with pytest.raises(RiskLimitChangeRequiresRestartError):
        service.propose_version(
            "risk_engine",
            {"max_daily_loss": 200, "max_trades_per_day": 3},
            applied_by="codie",
        )


def test_non_risk_module_never_requires_acknowledgement(service: ConfigService):
    record = service.propose_version("notifications", {"channel": "slack"}, applied_by="codie")
    assert record.is_risk_limit_change is False
