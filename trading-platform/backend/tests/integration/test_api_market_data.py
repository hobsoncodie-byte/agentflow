from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.db.base import get_session
from app.db.models.reference import Instrument
from app.main import app


def write_fixture(dir_path: Path) -> None:
    (dir_path / "MES_1m.csv").write_text(
        "event_time,open,high,low,close,volume\n"
        "2026-08-05T13:30:00+00:00,5500.00,5502.00,5499.50,5501.25,1200\n"
        "2026-08-05T13:31:00+00:00,5501.25,5503.00,5500.75,5502.50,980\n"
    )


@pytest.fixture
def market_data_client(db_session, tmp_path: Path):
    write_fixture(tmp_path)

    def _override_get_session():
        yield db_session

    def _override_get_settings() -> Settings:
        return Settings(
            database_url="unused-because-session-is-overridden",
            market_data_replay_dir=str(tmp_path),
        )

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_settings] = _override_get_settings
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_session, None)
        app.dependency_overrides.pop(get_settings, None)


def _seed_instrument(db_session) -> None:
    db_session.add(
        Instrument(symbol="MES", exchange="CME", tick_size=0.25, tick_value=1.25, contract_multiplier=5)
    )
    db_session.commit()


def test_backfill_then_query_candles(market_data_client, db_session):
    _seed_instrument(db_session)

    r = market_data_client.post(
        "/api/v1/market-data/backfill",
        json={
            "symbol": "MES",
            "timeframe": "1m",
            "start": "2026-08-05T00:00:00Z",
            "end": "2026-08-06T00:00:00Z",
        },
    )
    assert r.status_code == 200
    assert r.json() == {"inserted": 2}

    r = market_data_client.get(
        "/api/v1/market-data/candles",
        params={"symbol": "MES", "timeframe": "1m", "from": "2026-08-05T00:00:00Z", "to": "2026-08-06T00:00:00Z"},
    )
    assert r.status_code == 200
    assert len(r.json()) == 2

    r = market_data_client.get(
        "/api/v1/market-data/candles/latest", params={"symbol": "MES", "timeframe": "1m"}
    )
    assert r.status_code == 200
    assert r.json()["event_time"] == "2026-08-05T13:31:00Z"


def test_backfill_is_idempotent_via_api(market_data_client, db_session):
    _seed_instrument(db_session)
    body = {
        "symbol": "MES",
        "timeframe": "1m",
        "start": "2026-08-05T00:00:00Z",
        "end": "2026-08-06T00:00:00Z",
    }

    first = market_data_client.post("/api/v1/market-data/backfill", json=body)
    second = market_data_client.post("/api/v1/market-data/backfill", json=body)

    assert first.json() == {"inserted": 2}
    assert second.json() == {"inserted": 0}


def test_backfill_unknown_instrument_returns_404(market_data_client):
    r = market_data_client.post(
        "/api/v1/market-data/backfill",
        json={
            "symbol": "ES",
            "timeframe": "1m",
            "start": "2026-08-05T00:00:00Z",
            "end": "2026-08-06T00:00:00Z",
        },
    )
    assert r.status_code == 404
    assert r.json()["detail"]["error"]["code"] == "INSTRUMENT_NOT_FOUND"


def test_backfill_missing_fixture_returns_424(market_data_client, db_session):
    _seed_instrument(db_session)
    r = market_data_client.post(
        "/api/v1/market-data/backfill",
        json={
            "symbol": "MES",
            "timeframe": "5m",
            "start": "2026-08-05T00:00:00Z",
            "end": "2026-08-06T00:00:00Z",
        },
    )
    assert r.status_code == 424
    assert r.json()["detail"]["error"]["code"] == "NO_DATA_SOURCE"


def test_data_integrity_endpoint(market_data_client, db_session):
    _seed_instrument(db_session)
    market_data_client.post(
        "/api/v1/market-data/backfill",
        json={
            "symbol": "MES",
            "timeframe": "1m",
            "start": "2026-08-05T00:00:00Z",
            "end": "2026-08-06T00:00:00Z",
        },
    )

    r = market_data_client.get(
        "/api/v1/market-data/data-integrity", params={"symbol": "MES", "timeframe": "1m"}
    )
    assert r.status_code == 200
    assert r.json()["latest_event_time"] == "2026-08-05T13:31:00Z"
