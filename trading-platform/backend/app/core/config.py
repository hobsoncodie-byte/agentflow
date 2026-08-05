from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Process-wide settings, loaded from environment variables only.

    No secret or credential ever has a default value here — anything
    security-sensitive must be supplied via the environment or the process
    fails to start (fail closed, per ARCHITECTURE.md's risk philosophy).
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    environment: Literal["dev", "research", "backtest", "paper", "staging", "production"] = "dev"
    database_url: str
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "json"
    session_enforce_window: bool = True
    # No real market data vendor is selected yet (KNOWN_ISSUES.md #1); this
    # points at CSV fixtures for the CsvReplayMarketDataProvider.
    market_data_replay_dir: str = "data/replay"


@lru_cache
def get_settings() -> Settings:
    # database_url etc. are supplied via the environment/.env at runtime;
    # mypy can't see that BaseSettings fills required fields from env vars.
    return Settings()  # type: ignore[call-arg]
