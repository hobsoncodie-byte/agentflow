import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://trading:trading@localhost:5432/trading_platform"
)

import pytest
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.db.base import make_engine

_engine = make_engine(get_settings())
_SessionLocal = sessionmaker(bind=_engine)

# Repository code under test calls session.commit() itself, which rules out the
# usual SAVEPOINT-rollback isolation trick without extra event-listener plumbing.
# Truncating after each test is simpler and just as safe for this table set.
_TEST_TABLES = ("config_versions", "instruments", "sessions", "error_log", "notifications_log")


@pytest.fixture
def db_session():
    session = _SessionLocal()
    try:
        yield session
    finally:
        session.close()
        cleanup = _SessionLocal()
        try:
            for table in _TEST_TABLES:
                cleanup.execute(text(f"DELETE FROM {table}"))
            cleanup.commit()
        finally:
            cleanup.close()


@pytest.fixture
def client(db_session):
    from fastapi.testclient import TestClient

    from app.db.base import get_session
    from app.main import app

    def _override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = _override_get_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_session, None)
