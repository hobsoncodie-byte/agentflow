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
    # Data vendor selected: Interactive Brokers (KNOWN_ISSUES.md #1). "replay"
    # stays the default so existing dev/test flows are unaffected until this
    # is explicitly turned on for an environment with a real TWS/IB Gateway.
    market_data_provider: Literal["replay", "interactive_brokers"] = "replay"
    # TWS API connects to an already-running, already-logged-in TWS/IB Gateway
    # process on localhost — there is no API key/secret in this protocol, so
    # these defaults are not credentials. 7497 is TWS's default paper-trading
    # socket port; 4002 is IB Gateway's paper port, 7496/4001 are live.
    ib_host: str = "127.0.0.1"
    ib_port: int = 7497
    ib_client_id: int = 1


@lru_cache
def get_settings() -> Settings:
    # database_url etc. are supplied via the environment/.env at runtime;
    # mypy can't see that BaseSettings fills required fields from env vars.
    return Settings()  # type: ignore[call-arg]
