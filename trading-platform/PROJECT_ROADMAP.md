# PROJECT_ROADMAP.md

Development proceeds **one module at a time**: build → test → document → review → **stop and wait for explicit approval** before the next milestone starts. No milestone below is to be started automatically on completion of the previous one.

## Milestone 0 — Architecture & Design (this milestone)

- [x] Complete system architecture (`ARCHITECTURE.md`)
- [x] Complete database schema (`DATABASE.md`)
- [x] Complete API endpoint definitions (`API.md`)
- [x] Roadmap and milestone plan (this file)
- [x] Testing strategy (`TESTING.md`)
- [x] Deployment strategy (`ARCHITECTURE.md` §9)
- [x] Risks and mitigations (`ARCHITECTURE.md` §10)
- **Gate:** No application code is written until this document set is explicitly approved.

## Milestone 1 — Foundations

- Configuration Manager (schema validation, versioning, hot-reload rules)
- Database migrations for reference + system tables (§2, §10 of `DATABASE.md`)
- Logging Engine (structured logging, correlation IDs)
- `core/` shared kernel (clock, event bus, error types, value objects)
- **Gate:** unit tests green, `ARCHITECTURE.md`/`DATABASE.md` amended if reality diverged from design, review, approval.

## Milestone 2 — Market Data Engine

- Historical backfill for MES from the selected data vendor
- Live candle ingestion + `CandleClosed` event publishing
- Data integrity / staleness detection
- Candle/tick partitioned tables live
- **Gate:** demonstrated backfill + live ingestion against real vendor data in a dev environment, approval.

## Milestone 3 — Indicator Engine

- Core indicator set: moving averages, ATR, volatility, momentum, volume profile
- Indicator value persistence keyed to candles
- **Gate:** indicator outputs validated against a known reference (e.g. a spreadsheet/TradingView cross-check for a sample date range), approval.

## Milestone 4 — ICT Analysis Engine

- Market structure detection: BOS, CHoCH
- Liquidity sweep detection
- Fair Value Gap detection
- Order block detection
- PDH/PDL, overnight range, session levels
- **Gate:** manual review of detections against a hand-annotated sample of historical sessions, approval.

## Milestone 5 — News & Economic Calendar Module

- Economic calendar ingestion
- News ingestion + relevance scoring
- **Gate:** approval.

## Milestone 6 — AI Analysis Engine

- Synthesis of structure + indicators + news into bias/probability/confidence
- Full explainability record (`ai_analyses` table populated per §7 of `ARCHITECTURE.md`)
- Report generation (markdown)
- **Gate:** side-by-side review of AI reports against a human analyst's read of the same sessions, approval.

## Milestone 7 — Rule Engine

- Deterministic rule evaluation against configured thresholds
- Session-window enforcement (observation mode outside window)
- Full per-rule pass/fail logging
- **Gate:** every configured rule individually unit-tested with pass and fail cases, approval.

## Milestone 8 — Risk Engine

- Dynamic position sizing
- Daily loss/profit limits, max drawdown, max trades/day, max consecutive losses
- Breakeven automation, trailing stop, partial profit-taking
- Kill switch, abnormal-behavior halt
- **Gate:** every limit individually tested including edge/boundary conditions; this milestone gets the deepest test scrutiny of the whole project since it's the capital-preservation backstop. Approval required before any execution wiring exists.

## Milestone 9 — Backtesting Engine

- Bar-by-bar replay of Indicator → ICT → AI → Rule → Risk pipeline with strict point-in-time data access (no lookahead)
- Historical fill simulator
- Equity curve + performance metrics output
- **Gate:** backtest run reproduced deterministically twice from the same inputs (no hidden randomness/state leak), approval.

## Milestone 10 — Performance Analytics

- Win rate, profit factor, expectancy, drawdown, Sharpe, Sortino, avg R
- Breakdowns by setup/weekday/session/regime, monthly/yearly rollups
- **Gate:** metrics cross-checked by hand against a small fixture trade set, approval.

## Milestone 11 — Paper Trading Engine

- Simulated broker adapter (order ack/partial/fill/reject modeling)
- Full pipeline wired end-to-end in the paper environment
- **Gate:** minimum paper-trading run of **[N trading days / M trades — to be set with the user before this milestone starts]** with performance meeting the configured promotion thresholds (see §Paper→Live Promotion below), approval.

## Milestone 12 — Dashboard (Frontend)

- Overview, open/closed trades, performance, equity curve, trade journal, AI reasoning, risk exposure, research reports views
- Backed entirely by the read APIs defined in `API.md`
- **Gate:** usability review, approval.

## Milestone 13 — Notification Engine

- Alert routing (trade events, risk events, kill-switch, daily reports)
- **Gate:** approval.

## Milestone 14 — Advanced Intelligence Modules

- Trade Review AI
- Pattern Discovery AI
- Strategy Research Lab (walk-forward, Monte Carlo, optimization, out-of-sample validation)
- Continuous Research Engine (off-hours scheduled reporting)
- **Gate:** each sub-module reviewed individually; confirm none has a write path into live Rule Engine config, approval.

## Milestone 15 — Execution Engine (Live)

- Real broker adapter integration
- Order lifecycle handling, broker health/heartbeat monitoring
- **This milestone only begins after Milestone 11's paper-trading promotion gate is explicitly approved by the user.**
- **Gate:** live-readiness checklist (below) signed off, approval. Initial live deployment runs at minimum size / minimum risk configuration.

## Milestone 16 — Hardening & Deployment

- Full CI/CD pipeline, staging/production environment separation
- Secrets management review
- Disaster recovery / rollback drill
- **Gate:** approval.

## Paper → Live Promotion Checklist (Milestone 11 → 15 Gate)

Live trading does not begin until **all** of the following are true and explicitly confirmed by the user:

1. Paper trading has run for a minimum sample size sufficient for statistical significance at the strategy's expected trade frequency (exact N to be agreed with the user before Milestone 11 begins; ICT NY Open setups are low-frequency, so this will likely be measured in weeks/months, not days).
2. Paper performance meets or exceeds the profit factor / expectancy / max-drawdown thresholds defined in the active Risk Engine config.
3. No unresolved `error_log` entries at `critical` severity from the paper run.
4. Risk Engine limits for live have been explicitly configured and reviewed (not simply copied from paper defaults).
5. Broker adapter for live has passed a connectivity/health-check dry run with no real orders.
6. The user has explicitly approved moving to Milestone 15 in writing (chat/PR approval).

## Recurring / Non-Milestone Work

- **Documentation maintenance:** `CHANGELOG.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `TESTING.md`, `KNOWN_ISSUES.md` are updated as part of every milestone, not deferred.
- **Continuous Research Engine** output (Milestone 14) informs future roadmap additions but never auto-applies changes to earlier milestones' shipped modules.
