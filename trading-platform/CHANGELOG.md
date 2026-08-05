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

## Unreleased — Milestone 2: Market Data Engine

- Added the `market_data` module (`modules/market_data/`): domain models (`Candle`, `InstrumentRef`, `DataIntegrityReport`), ports (`MarketDataProvider`, `CandleRepository`, `InstrumentLookup`, `LatestCandleSource`), `MarketDataService` (historical backfill + live single-bar ingestion, idempotent on duplicate candles, publishes `CandleClosed` via the core `EventBus`), and `DataIntegrityService` (staleness detection for the future Rule Engine's "data fresh" check, ARCHITECTURE.md §10).
- Added the partitioned `candles` table (`DATABASE.md` §3/§11): native Postgres `PARTITION BY RANGE (event_time)` with a `DEFAULT` partition so writes never fail for lack of a pre-created monthly partition; verified against a real Postgres 16 instance. A scheduled job to create real monthly partitions ahead of time (per `ARCHITECTURE.md` §5's `workers/`) is follow-up work, not required for this milestone.
- Added `/api/v1/market-data` routes (`GET /candles`, `GET /candles/latest`, `POST /backfill`, `GET /data-integrity`) per `API.md` §1.
- **Vendor decision still open (`KNOWN_ISSUES.md` #1):** rather than guess at a vendor, the module was built vendor-agnostically and is backed today by `CsvReplayMarketDataProvider`, a fixture-file adapter — not a stand-in for real vendor integration. **This means the roadmap gate for this milestone ("demonstrated backfill + live ingestion against real vendor data") is not met yet** — flagging honestly rather than claiming completion. Swapping in a real vendor adapter once one is chosen requires no change to `MarketDataService` or anything downstream (ports-and-adapters, `ARCHITECTURE.md` §3).
- Found and fixed a real bug during manual verification: FastAPI's response serialization couldn't validate the `Symbol` value object against a plain `str` response field; fixed with a shared `_SymbolResponseModel` base carrying a `field_validator` that stringifies it.
- Added 20 new tests (unit: `MarketDataService`, `DataIntegrityService`, `CsvReplayMarketDataProvider` against fakes; integration: `CandleRepository` and the market-data API against a real Postgres instance, including idempotency and missing-fixture/unknown-instrument error paths) — 52 total, all passing. `ruff check` and `mypy --strict` both clean.
