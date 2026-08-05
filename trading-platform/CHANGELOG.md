# CHANGELOG.md

All notable changes to the AI-Assisted Futures Trading Platform are recorded here. Format: date, milestone, summary.

## Unreleased — Milestone 0: Architecture & Design

- Added `ARCHITECTURE.md`: system style (modular monolith, ports & adapters), module list and responsibilities, folder structure, environment progression (research/backtest/paper/live), explainability contract, deployment strategy, risks and mitigations.
- Added `DATABASE.md`: full PostgreSQL schema covering reference data, market data (partitioned), ICT/indicator outputs, AI analyses, rule/risk evaluations, trades, order events, risk events, post-trade intelligence, and performance rollups.
- Added `API.md`: complete `/api/v1` endpoint surface for every module.
- Added `PROJECT_ROADMAP.md`: 16 milestones from foundations through live execution and hardening, each with an explicit approval gate; paper-to-live promotion checklist.
- Added `TESTING.md`: test pyramid, per-module test requirements, backtest validation methodology, paper trading validation gates, Risk Engine failure-mode testing, CI pipeline.
- Added `KNOWN_ISSUES.md`: open decisions and risks tracked ahead of implementation.
- No application code written in this milestone, per project workflow (design → approval → next milestone).

## Unreleased — Milestone 1: Foundations

- Scaffolded `backend/` (Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, structlog, pydantic-settings), matching the folder structure in `ARCHITECTURE.md` §5.
- Added `core/` shared kernel: `config.py` (env-driven settings, fail-closed on missing required values), `clock.py` (single source of truth for "now" and session-window containment, including a passing test for the ICT NY Open window and midnight-wrapping windows), `types.py` (`Money`, `Symbol`, `RMultiple` value objects), `events.py` (in-process pub/sub `EventBus`), `errors.py` (shared exception hierarchy, including `RiskLimitChangeRequiresRestartError`).
- Added the Logging Engine (`core/logging.py`): structured JSON/console logging via structlog, correlation-ID propagation, and a secret-redaction processor covering known credential field names.
- Added DB layer (`db/base.py`, `db/models/`) and the first Alembic migration, creating the reference and system tables from `DATABASE.md` §2/§10: `instruments`, `sessions`, `config_versions`, `error_log`, `notifications_log`. Verified end-to-end against a real PostgreSQL 16 instance (autogenerate + upgrade).
- Implemented the Configuration Manager module (`modules/config_manager/`): a schema registry other modules register their config shape into, a versioning service that enforces the ARCHITECTURE.md §8 rule that risk-limit field changes must be explicitly acknowledged rather than silently hot-reloaded, a Postgres-backed repository, and the `/api/v1/config` routes from `API.md` §12 (including `/sessions` and `/instruments`).
- Fixed a routing-order bug caught during manual verification: `/sessions` and `/instruments` were originally declared after the generic `/{module}` route and would have been swallowed by it; fixed-path routes are now registered first, with a comment explaining why.
- Added 32 tests (unit: kernel + config service against a fake repository; integration: config repository and API routes against a real Postgres instance) — all passing. `ruff check` and `mypy --strict` both clean.
- No divergence from `ARCHITECTURE.md`/`DATABASE.md` design — implementation matches the documented schema and module boundaries.
