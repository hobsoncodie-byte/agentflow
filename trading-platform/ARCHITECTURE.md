# ARCHITECTURE.md — AI-Assisted Futures Trading Platform

Status: **Design phase — no application code written yet.**
Location: This system lives entirely under `/trading-platform` in the `agentflow` repo, isolated from the unrelated Flownz Next.js app at the repo root. It has its own stack, its own dependency manifests, and its own CI jobs. Nothing here imports from or modifies `src/` (Flownz).

## 1. Core Philosophy → Architectural Consequences

The spec's philosophy translates directly into binding architectural constraints:

| Philosophy statement | Architectural consequence |
|---|---|
| Capital preservation is highest priority | Risk Engine is the only module with veto power over execution; it cannot be bypassed by config, by the AI, or by any other module. It runs in-process on the same call path as execution — never as an optional sidecar that can be skipped. |
| The AI is an analyst, the Rule Engine is the trader | AI Analysis Engine and Rule Engine are separate services with a one-way dependency: Rule Engine may *read* AI output, AI Analysis Engine has no reference to, and cannot call, the Execution Engine. |
| No hidden behaviour / explainable | Every module that produces a decision (accept, reject, size, confidence) must emit a structured `Decision` record with `inputs`, `reasoning`, and `evidence_for` / `evidence_against` fields, persisted before the decision is acted on. |
| Everything must be modular, replaceable, testable | Modular monolith (see §3) with strict interface boundaries (ports/adapters). Modules communicate through typed interfaces and an internal event bus, never by reaching into each other's internals or database tables directly. |
| Stop after every module, never continue automatically | This is a *process* constraint on the engineering workflow (see `PROJECT_ROADMAP.md`), not a runtime constraint — captured here so it isn't lost: each roadmap milestone ends in an explicit approval gate. |
| Default to NO TRADE on low confidence / missing data | Enforced at the Rule Engine boundary: absence of a required input is treated as a failing rule, not as a null/skip. There is no code path where "unknown" resolves to "allow". |

## 2. Target Market & Session Scope (v1)

- Primary instrument: **MES** (Micro E-mini S&P 500). Symbol handling is config-driven so ES, MNQ, NQ, and other CME futures can be added without code changes to the engines — only new instrument config entries and a data-vendor contract mapping.
- Primary session: **ICT New York Open**, trading window 9:20–10:30 AM ET, execution focus 9:30 AM cash open.
- Outside the configured session window, the system runs in **observation mode**: Market Data, Indicator, ICT Analysis, and AI Analysis engines keep running and logging; the Rule Engine automatically fails the "session valid" rule, so Execution never fires. This is a config default (`session.enforce_window: true`), not a hardcoded behavior, so future sessions/instruments can be added.

## 3. System Style: Modular Monolith (Ports & Adapters), Not Microservices — For Now

**Decision:** v1 ships as a single Python/FastAPI process composed of strictly isolated modules, each following a ports-and-adapters (hexagonal) internal structure. Modules talk to each other only through typed interfaces (`Protocol`/ABC) and a lightweight in-process event bus for fire-and-forget notifications (e.g. "new candle closed").

**Why not microservices from day one:**
- The spec demands every module be independently testable and replaceable — hexagonal boundaries inside one process deliver that without distributed-systems overhead (network calls, partial failure, service discovery) that would slow down the research→backtest→paper→live progression this project is built around.
- A single process guarantees a single, consistent view of "what time is it / what candle just closed / is the kill switch on" — critical for a system whose top priority is capital preservation. Distributed consistency bugs are exactly the kind of hidden behavior the philosophy forbids.
- Every module still gets its own package, own tests, own persistence tables, and communicates only through its declared interface — so extracting any module into its own service later (e.g. Execution Engine onto a colocated low-latency host) is a deployment change, not a rewrite.

**Module boundary rule:** a module may depend on another module's public interface (defined in that module's `domain/ports.py`) and on shared kernel types in `core/`. It may never import another module's `services/`, `repositories/`, or ORM models directly.

## 4. Module List and Responsibilities

| Module | Responsibility | May call | Must never call |
|---|---|---|---|
| Market Data Engine | Ingests live + historical bars/ticks/volume from data vendor(s); normalizes; publishes `CandleClosed` events | Database, Notification Engine | Execution Engine |
| Indicator Engine | Computes technical indicators (MAs, ATR, volume profile, volatility, momentum) from candle data | Market Data Engine (read), Database | Execution Engine, Risk Engine |
| ICT Analysis Engine | Detects structure, liquidity sweeps, FVGs, order blocks, BOS/CHoCH, PDH/PDL, overnight range | Market Data Engine, Indicator Engine | Execution Engine |
| AI Analysis Engine | Synthesizes the above + news/macro into a market report: bias, probability, confidence, explanation | ICT Analysis, Indicator Engine, Market Data Engine, News/Calendar module | Execution Engine, Risk Engine, Rule Engine (read-only consumer only — never invoked by AI) |
| Rule Engine | Deterministic pass/fail evaluation of every configured rule against current AI report + market state; emits Accept/Reject decision with reasons | AI Analysis Engine (read), ICT Analysis (read), Config Manager | Nothing execution-side directly — hands decision to Risk Engine |
| Risk Engine | Position sizing, daily/max loss limits, drawdown limits, trade/loss counters, kill switch; **final gate** before execution | Rule Engine output, Account/Position state, Config Manager | — (this is the last stop; if it rejects, nothing downstream runs) |
| Execution Engine | Places/manages orders with the broker only after Rule Engine + Risk Engine both pass | Risk Engine (must show approval token), Broker adapter | AI Analysis Engine, Rule Engine internals |
| Paper Trading Engine | Simulated fills using the same Rule/Risk/Execution call path as live, swapping the broker adapter for a simulated one | Execution Engine (via simulated broker adapter) | — |
| Backtesting Engine | Replays historical data through Indicator/ICT/AI/Rule/Risk logic to produce historical performance, without touching any broker adapter | All analysis modules (read), Market Memory DB | Execution Engine (live/paper broker adapters) |
| Strategy Research Lab | Isolated sandbox for walk-forward tests, Monte Carlo, parameter optimization, out-of-sample validation, strategy comparison | Backtesting Engine, Market Memory DB | Rule Engine's live configuration (research never writes production config) |
| Performance Analytics | Computes win rate, profit factor, expectancy, drawdown, Sharpe/Sortino, R-multiple, and breakdowns by setup/weekday/session/regime | Market Memory DB (read) | — |
| Trade Review AI | Post-trade replay: predicted vs. actual outcome, execution quality, mistake tagging, setup quality score | Market Memory DB (read/write review results) | Execution Engine |
| Pattern Discovery AI | Statistical mining across historical trades for recurring edges; research-report output only | Market Memory DB (read), Performance Analytics | Rule Engine config (read-only findings, human applies changes) |
| Continuous Research Engine | Off-hours scheduled job: runs Trade Review AI + Pattern Discovery AI + Backtesting Engine, produces reports | All read-only analytics modules | Any write path to live Rule Engine config |
| Notification Engine | Delivers alerts (trade events, risk events, kill-switch triggers, daily reports) via configured channels | Database (read) | — |
| Dashboard (API + Next.js frontend) | Presents live account, trades, performance, AI reasoning, research reports | All modules via read-only query interfaces / dedicated read API | Any engine's internals directly (goes through API layer only) |
| Database / Market Memory | Durable store for candles, decisions, trades, rule evaluations, errors, API responses | — | — |
| Configuration Manager | Loads, validates, versions all module configuration; single source of truth for thresholds, session windows, risk limits | — | — |
| Logging Engine | Structured, queryable logs for every module, correlated by a request/decision ID | — | — |

## 5. Folder Structure

```
trading-platform/
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── PROJECT_ROADMAP.md
├── TESTING.md
├── CHANGELOG.md
├── KNOWN_ISSUES.md
├── backend/
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── app/
│   │   ├── main.py                      # FastAPI app assembly, router registration
│   │   ├── core/                        # shared kernel — no business logic
│   │   │   ├── config.py                # settings loader (env-driven, no hardcoded secrets)
│   │   │   ├── logging.py               # structured logging setup
│   │   │   ├── events.py                # in-process event bus (publish/subscribe)
│   │   │   ├── errors.py                # shared exception types
│   │   │   ├── clock.py                 # single source of truth for "now" / session windows
│   │   │   └── types.py                 # shared value objects (Money, RMultiple, Symbol, etc.)
│   │   ├── modules/
│   │   │   ├── market_data/
│   │   │   │   ├── domain/              # entities, value objects, ports (interfaces)
│   │   │   │   ├── services/            # use cases (ingest bar, backfill history)
│   │   │   │   ├── adapters/            # vendor-specific implementations of ports
│   │   │   │   ├── repositories/        # persistence implementations
│   │   │   │   ├── api/                 # FastAPI routers for this module
│   │   │   │   └── tests/
│   │   │   ├── indicators/            (same internal shape)
│   │   │   ├── ict_analysis/          (same internal shape)
│   │   │   ├── ai_analysis/           (same internal shape)
│   │   │   ├── news_calendar/         (same internal shape)
│   │   │   ├── rule_engine/           (same internal shape)
│   │   │   ├── risk_engine/           (same internal shape)
│   │   │   ├── execution/             (same internal shape; broker adapters live here)
│   │   │   ├── paper_trading/         (same internal shape)
│   │   │   ├── backtesting/           (same internal shape)
│   │   │   ├── research_lab/          (same internal shape)
│   │   │   ├── performance_analytics/ (same internal shape)
│   │   │   ├── trade_review/          (same internal shape)
│   │   │   ├── pattern_discovery/     (same internal shape)
│   │   │   ├── continuous_research/   (same internal shape)
│   │   │   ├── notifications/         (same internal shape)
│   │   │   └── config_manager/        (same internal shape)
│   │   ├── db/
│   │   │   ├── base.py                  # SQLAlchemy base, session management
│   │   │   ├── models/                  # ORM models, one file per module's tables
│   │   │   └── migrations/              # Alembic migrations
│   │   └── workers/
│   │       ├── scheduler.py             # session-window aware scheduler
│   │       ├── ingestion_worker.py      # continuous market data ingestion
│   │       └── research_worker.py       # off-hours Continuous Research Engine job
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── fixtures/
├── frontend/                            # dedicated Next.js dashboard (separate from Flownz)
│   ├── package.json
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── overview/
│   │   │   ├── trades/
│   │   │   ├── performance/
│   │   │   ├── journal/
│   │   │   ├── research/
│   │   │   └── risk/
│   │   └── api/                         # BFF routes proxying to FastAPI, if needed
│   ├── components/
│   └── lib/
└── infra/
    ├── docker-compose.yml               # postgres, backend, frontend, worker
    ├── docker-compose.prod.yml
    └── ci/
        └── github-actions notes (see TESTING.md)
```

Each `modules/<name>/` package is self-contained: its own domain models, its own tests, its own router. No module reaches into another module's `repositories/` or ORM models — cross-module reads go through the other module's declared service interface.

## 6. Environment Progression (Research → Backtest → Paper → Live)

Four environments, same codebase, different config + adapter wiring:

1. **Research** — Strategy Research Lab + Backtesting Engine only. No broker adapter loaded at all (not even simulated). Reads historical data from Market Memory DB.
2. **Backtest** — Full analysis pipeline (Indicator → ICT → AI → Rule → Risk) replayed bar-by-bar over history, Execution Engine wired to a `HistoricalFillSimulator` adapter.
3. **Paper** — Full pipeline live, Execution Engine wired to a `SimulatedBrokerAdapter` that mimics real order lifecycle (ack, partial fill, reject) against live market data.
4. **Live** — Full pipeline live, Execution Engine wired to the real broker adapter. Promotion from Paper → Live is a manual, documented, config-gated action — never automatic (see `PROJECT_ROADMAP.md` §Milestones and `KNOWN_ISSUES.md` for the promotion checklist).

The Execution Engine's broker adapter is the **only** thing that changes between Backtest/Paper/Live; Rule Engine and Risk Engine logic is identical in all three, which is what makes backtest/paper results trustworthy predictors of live behavior.

## 7. Explainability Contract

Every module that outputs a decision persists a `Decision` record (see `DATABASE.md`) with:
- `decision_id`, `module`, `timestamp`, `symbol`, `session_id`
- `inputs` (JSON snapshot of everything considered)
- `output` (accept/reject/value)
- `confidence` (0–1, where applicable)
- `evidence_for` / `evidence_against` (list of strings)
- `reasoning` (free text explanation)
- `rule_results` (for Rule Engine: per-rule pass/fail with the specific value compared against threshold)

The Dashboard's "AI reasoning" and trade journal views read directly from this table — there is no separate "explanation generation" step bolted on after the fact.

## 8. Configuration Manager

Single source of truth for:
- Session windows, instrument list, per-instrument tick/contract specs
- Rule Engine thresholds (confidence minimum, RR minimum, required confirmations)
- Risk Engine limits (per-trade risk %, daily loss/profit limits, max drawdown, max trades/day, max consecutive losses)
- Feature flags per environment (research/backtest/paper/live)

Config is versioned (every change recorded with timestamp + author) and loaded at startup + hot-reloadable for non-risk parameters; **risk limit changes require an explicit restart and are logged as a distinct audit event**, never silently hot-reloaded, since a silent risk-limit change is exactly the kind of hidden behavior the philosophy forbids.

## 9. Deployment Strategy

- **Containerization:** each of backend, frontend, and worker processes gets its own Dockerfile; `infra/docker-compose.yml` wires them together with a Postgres service for local/dev use.
- **Environments:** `dev` (docker-compose, local Postgres), `staging` (paper trading, cloud Postgres, no real broker credentials), `production` (live trading, real broker credentials, strictest access controls).
- **Secrets:** all credentials (broker API keys, data vendor keys, DB URL) via environment variables injected at deploy time; `.env.example` documents required keys with no real values committed, matching the existing repo convention for `.env.local`.
- **CI/CD:** GitHub Actions pipeline — lint → type-check → unit tests → integration tests (against an ephemeral Postgres service container) → build Docker images. Deployment to staging is automatic on merge to the trading-platform's integration branch; deployment to production is a manual, approved step only (mirrors the "never continue automatically" philosophy at the infra level).
- **Rollback:** every production deploy tagged; rollback is `docker compose pull <previous-tag> && up -d`. Database migrations are additive-first (expand/contract pattern) so rollback never requires a destructive down-migration on a live system.

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AI Analysis Engine hallucinates a plausible-sounding but wrong market read | Bad trade signal | Rule Engine treats AI output as one structured input among several deterministic checks (structure, sweep, FVG, session); AI confidence alone can never satisfy the Rule Engine — at least one deterministic ICT condition must also pass. |
| Silent data gap from market data vendor (missed candle) | Indicators/ICT analysis computed on stale data | Market Data Engine flags gaps explicitly (`data_integrity` events); Rule Engine's "session valid" / "data fresh" rule fails closed if the latest candle is older than the configured staleness threshold. |
| Config change silently loosens risk limits | Catastrophic loss | Risk-limit changes are a distinct, audited config category requiring restart + logged approval (see §8); Risk Engine unit tests assert limits monotonically tighten or require explicit sign-off to loosen. |
| Backtest results don't transfer to live (overfitting / lookahead bias) | False confidence in a losing strategy | Backtesting Engine enforces strict point-in-time data access (no future bar visible to any module during replay); Strategy Research Lab requires out-of-sample validation before any strategy is proposed for paper trading. |
| Paper-to-live promotion happens prematurely | Real capital loss from an unproven strategy | Promotion checklist is a manual gate (tracked in roadmap milestones), requires minimum paper-trading sample size and performance thresholds defined in `PROJECT_ROADMAP.md`, never automatic. |
| Broker/data vendor outage during session window | Missed exits, stuck positions | Execution Engine implements a heartbeat/health check on the broker adapter; on failed heartbeat, Risk Engine's kill switch halts new entries and Notification Engine alerts immediately; existing position management falls back to broker-native stop orders (not dependent on the platform being up). |
| Single-process monolith becomes a scaling bottleneck | Latency in execution path | Ports-and-adapters boundaries mean the highest-latency-sensitive module (Execution Engine) can be extracted to its own deployment without touching other modules' code — deferred until real evidence of need. |
| Database grows unbounded (every candle/decision stored forever) | Storage cost, query slowdown | Time-series partitioning on high-volume tables (candles, decisions) from day one (see `DATABASE.md` §Partitioning); cold data moved to cheaper storage tier, never deleted, per the "never discard historical information" requirement. |
| Secrets leak via logs or error messages | Broker account compromise | Logging Engine redacts known secret field names centrally; integration tests include a "no secret in log output" assertion. |

## 11. Explicit Non-Goals (v1)

- No multi-account / multi-tenant support. Single trading account per deployment.
- No automatic strategy self-modification. Pattern Discovery and Continuous Research produce *reports* only; a human applies any resulting config change.
- No support for instruments outside CME futures in v1 (MES first; ES/MNQ/NQ config-ready but not activated until explicitly approved).
