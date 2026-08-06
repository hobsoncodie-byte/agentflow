from app.modules.config_manager.domain.models import ConfigVersionRecord
from app.modules.config_manager.repositories.config_repository import (
    SqlAlchemyConfigVersionRepository,
)


def test_add_and_get_latest_roundtrip(db_session):
    repo = SqlAlchemyConfigVersionRepository(db_session)

    assert repo.get_latest("rule_engine") is None

    record = ConfigVersionRecord(
        module="rule_engine",
        version=1,
        config={"min_confidence": 0.7},
        is_risk_limit_change=False,
        applied_by="codie",
    )
    stored = repo.add(record)

    assert stored.id is not None
    assert stored.applied_at is not None

    latest = repo.get_latest("rule_engine")
    assert latest is not None
    assert latest.version == 1
    assert latest.config == {"min_confidence": 0.7}


def test_get_history_returns_versions_in_order(db_session):
    repo = SqlAlchemyConfigVersionRepository(db_session)

    for version_config in ({"min_confidence": 0.6}, {"min_confidence": 0.7}, {"min_confidence": 0.8}):
        repo.add(
            ConfigVersionRecord(
                module="rule_engine",
                version=repo.get_latest("rule_engine").version + 1
                if repo.get_latest("rule_engine")
                else 1,
                config=version_config,
                is_risk_limit_change=False,
                applied_by="codie",
            )
        )

    history = repo.get_history("rule_engine")
    assert [r.version for r in history] == [1, 2, 3]
    assert [r.config["min_confidence"] for r in history] == [0.6, 0.7, 0.8]


def test_get_latest_is_scoped_per_module(db_session):
    repo = SqlAlchemyConfigVersionRepository(db_session)
    repo.add(
        ConfigVersionRecord(
            module="rule_engine", version=1, config={"a": 1}, is_risk_limit_change=False, applied_by="codie"
        )
    )
    assert repo.get_latest("risk_engine") is None
