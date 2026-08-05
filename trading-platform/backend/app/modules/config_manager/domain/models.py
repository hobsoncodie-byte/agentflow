from dataclasses import dataclass
from datetime import datetime
from typing import Any, ClassVar

from pydantic import BaseModel


class ModuleConfigSchema(BaseModel):
    """Base class every module's config schema must extend.

    A subclass lists which of its own fields are risk limits by overriding
    `risk_limit_fields`. Changing any of those fields is treated as a
    risk-limit change (ARCHITECTURE.md §8): it can never be silently
    hot-reloaded and must be explicitly acknowledged as requiring a restart.
    """

    risk_limit_fields: ClassVar[frozenset[str]] = frozenset()


@dataclass(frozen=True)
class ConfigVersionRecord:
    module: str
    version: int
    config: dict[str, Any]
    is_risk_limit_change: bool
    applied_by: str
    note: str | None = None
    id: int | None = None
    applied_at: datetime | None = None
