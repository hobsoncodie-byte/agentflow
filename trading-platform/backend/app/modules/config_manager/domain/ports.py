from typing import Protocol

from app.modules.config_manager.domain.models import ConfigVersionRecord


class ConfigVersionRepository(Protocol):
    def get_latest(self, module: str) -> ConfigVersionRecord | None: ...

    def get_history(self, module: str) -> list[ConfigVersionRecord]: ...

    def add(self, record: ConfigVersionRecord) -> ConfigVersionRecord: ...
