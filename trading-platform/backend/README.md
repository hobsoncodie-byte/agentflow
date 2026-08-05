# Backend — AI-Assisted Futures Trading Platform

Python 3.11 / FastAPI / SQLAlchemy / PostgreSQL. See `../ARCHITECTURE.md` for the full system design.

## Setup

```bash
uv venv .venv && source .venv/bin/activate
uv pip install -e ".[dev]"
cp .env.example .env   # then fill in DATABASE_URL for your local Postgres
alembic upgrade head
```

## Run

```bash
uvicorn app.main:app --reload
```

## Test

```bash
export DATABASE_URL="postgresql+psycopg://trading:trading@localhost:5432/trading_platform"
pytest
ruff check app tests
mypy app
```

Integration tests require a reachable Postgres matching `DATABASE_URL`; they create and clean up their own rows in the reference/system tables.
