import contextvars
import logging
from collections.abc import MutableMapping
from typing import Any, cast

import structlog

from app.core.config import Settings

_correlation_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "correlation_id", default=None
)

# Field names that must never appear in logs in cleartext. Matched case-insensitively
# against any key in the event dict, however deeply the module chooses to nest it.
_SECRET_FIELD_NAMES = {
    "password",
    "secret",
    "token",
    "api_key",
    "apikey",
    "authorization",
    "broker_api_key",
    "broker_secret",
    "access_token",
    "refresh_token",
}

_REDACTED = "***REDACTED***"


def bind_correlation_id(correlation_id: str) -> None:
    """Attach a correlation/decision ID to all log lines emitted in this context."""
    _correlation_id.set(correlation_id)


def _add_correlation_id(
    logger: Any, method_name: str, event_dict: MutableMapping[str, Any]
) -> MutableMapping[str, Any]:
    cid = _correlation_id.get()
    if cid is not None:
        event_dict["correlation_id"] = cid
    return event_dict


def _redact_secrets(
    logger: Any, method_name: str, event_dict: MutableMapping[str, Any]
) -> MutableMapping[str, Any]:
    def scrub(value: Any) -> Any:
        if isinstance(value, dict):
            return {
                k: (_REDACTED if k.lower() in _SECRET_FIELD_NAMES else scrub(v))
                for k, v in value.items()
            }
        if isinstance(value, list):
            return [scrub(v) for v in value]
        return value

    return cast(MutableMapping[str, Any], scrub(event_dict))


def configure_logging(settings: Settings) -> None:
    logging.basicConfig(
        format="%(message)s",
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
    )

    renderer = (
        structlog.processors.JSONRenderer()
        if settings.log_format == "json"
        else structlog.dev.ConsoleRenderer()
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            _add_correlation_id,
            _redact_secrets,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.log_level.upper(), logging.INFO)
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> Any:
    return structlog.get_logger(name)
