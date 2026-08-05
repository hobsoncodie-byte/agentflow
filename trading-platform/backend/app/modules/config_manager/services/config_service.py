from typing import Any

from pydantic import ValidationError

from app.core.errors import (
    ConfigNotFoundError,
    ConfigValidationError,
    RiskLimitChangeRequiresRestartError,
)
from app.modules.config_manager.domain.models import ConfigVersionRecord
from app.modules.config_manager.domain.ports import ConfigVersionRepository
from app.modules.config_manager.services.registry import ConfigSchemaRegistry


class ConfigService:
    """The Configuration Manager's core use cases: read active config, read
    history, and propose new versions with risk-limit-change enforcement.
    """

    def __init__(self, repo: ConfigVersionRepository, registry: ConfigSchemaRegistry) -> None:
        self._repo = repo
        self._registry = registry

    def get_active(self, module: str) -> ConfigVersionRecord:
        record = self._repo.get_latest(module)
        if record is None:
            raise ConfigNotFoundError(f"no configuration exists yet for module '{module}'")
        return record

    def get_history(self, module: str) -> list[ConfigVersionRecord]:
        return self._repo.get_history(module)

    def propose_version(
        self,
        module: str,
        new_config: dict[str, Any],
        applied_by: str,
        note: str | None = None,
        acknowledge_restart: bool = False,
    ) -> ConfigVersionRecord:
        schema = self._registry.get(module)
        try:
            validated = schema.model_validate(new_config)
        except ValidationError as exc:
            raise ConfigValidationError(str(exc)) from exc

        validated_dict = validated.model_dump(mode="json")
        current = self._repo.get_latest(module)
        risk_fields = schema.risk_limit_fields

        if current is None:
            changed_fields = set(validated_dict.keys())
        else:
            changed_fields = {
                key
                for key, value in validated_dict.items()
                if current.config.get(key) != value
            }

        is_risk_limit_change = bool(changed_fields & risk_fields)

        if is_risk_limit_change and not acknowledge_restart:
            raise RiskLimitChangeRequiresRestartError(
                f"module '{module}': fields {sorted(changed_fields & risk_fields)} are risk "
                "limits and require an explicit restart acknowledgement, not a hot-reload"
            )

        next_version = (current.version + 1) if current is not None else 1

        record = ConfigVersionRecord(
            module=module,
            version=next_version,
            config=validated_dict,
            is_risk_limit_change=is_risk_limit_change,
            applied_by=applied_by,
            note=note,
        )
        return self._repo.add(record)
