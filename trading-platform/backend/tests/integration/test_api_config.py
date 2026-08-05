from typing import ClassVar

from app.db.models.reference import Instrument, TradingSession
from app.modules.config_manager.domain.models import ModuleConfigSchema
from app.modules.config_manager.services.registry import registry


class _TestRiskConfig(ModuleConfigSchema):
    max_daily_loss: float
    risk_limit_fields: ClassVar[frozenset[str]] = frozenset({"max_daily_loss"})


registry.register("_test_risk_engine", _TestRiskConfig)


def test_health_endpoint(client):
    r = client.get("/api/v1/system/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_sessions_endpoint_not_shadowed_by_module_route(client, db_session):
    db_session.add(TradingSession(name="ICT_NY_OPEN", start_time="09:20", end_time="10:30"))
    db_session.commit()

    r = client.get("/api/v1/config/sessions")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["name"] == "ICT_NY_OPEN"


def test_instruments_endpoint_not_shadowed_by_module_route(client, db_session):
    db_session.add(
        Instrument(
            symbol="MES",
            exchange="CME",
            tick_size=0.25,
            tick_value=1.25,
            contract_multiplier=5,
        )
    )
    db_session.commit()

    r = client.get("/api/v1/config/instruments")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["symbol"] == "MES"


def test_get_config_for_unknown_module_returns_404(client):
    r = client.get("/api/v1/config/never_configured")
    assert r.status_code == 404
    assert r.json()["detail"]["error"]["code"] == "CONFIG_NOT_FOUND"


def test_risk_limit_change_requires_acknowledgement(client):
    body = {"config": {"max_daily_loss": 400}, "applied_by": "codie"}
    r = client.put("/api/v1/config/_test_risk_engine", json=body)
    assert r.status_code == 409
    assert r.json()["detail"]["error"]["code"] == "RISK_LIMIT_CHANGE_REQUIRES_RESTART"


def test_risk_limit_change_with_acknowledgement_succeeds(client):
    body = {"config": {"max_daily_loss": 400}, "applied_by": "codie", "acknowledge_restart": True}
    r = client.put("/api/v1/config/_test_risk_engine", json=body)
    assert r.status_code == 200
    assert r.json()["version"] == 1

    active = client.get("/api/v1/config/_test_risk_engine")
    assert active.status_code == 200
    assert active.json()["config"]["max_daily_loss"] == 400
