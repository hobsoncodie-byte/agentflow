class TradingPlatformError(Exception):
    """Base class for all errors raised by application code (never a bare Exception)."""


class ConfigValidationError(TradingPlatformError):
    """A proposed configuration value failed schema validation."""


class RiskLimitChangeRequiresRestartError(TradingPlatformError):
    """A risk-limit config field was submitted for hot-reload.

    Per ARCHITECTURE.md §8, risk-limit changes are a distinct, audited
    category that must never be silently hot-reloaded — this error is the
    enforcement point.
    """


class ConfigNotFoundError(TradingPlatformError):
    """No configuration exists yet for the requested module."""


class StaleConfigVersionError(TradingPlatformError):
    """A config write was attempted against an outdated version (optimistic lock)."""


class InstrumentNotFoundError(TradingPlatformError):
    """No active instrument matches the requested symbol."""
