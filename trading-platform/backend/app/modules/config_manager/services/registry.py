
from app.core.errors import ConfigValidationError
from app.modules.config_manager.domain.models import ModuleConfigSchema


class ConfigSchemaRegistry:
    """Maps module name -> its config schema class.

    Each module registers its own schema when it starts up; the Configuration
    Manager itself has no hardcoded knowledge of any other module's fields,
    keeping module boundaries intact per ARCHITECTURE.md §3.
    """

    def __init__(self) -> None:
        self._schemas: dict[str, type[ModuleConfigSchema]] = {}

    def register(self, module: str, schema: type[ModuleConfigSchema]) -> None:
        self._schemas[module] = schema

    def get(self, module: str) -> type[ModuleConfigSchema]:
        try:
            return self._schemas[module]
        except KeyError as exc:
            raise ConfigValidationError(f"no config schema registered for module '{module}'") from exc

    def is_registered(self, module: str) -> bool:
        return module in self._schemas


# Process-wide singleton: modules register their schema here at import time.
# Config Manager itself never hardcodes another module's schema (ARCHITECTURE.md §3).
registry = ConfigSchemaRegistry()
