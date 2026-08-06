# TESTING.md — Testing Strategy

No test suite exists yet — this defines the strategy each milestone in `PROJECT_ROADMAP.md` must satisfy before its approval gate.

## 1. Test Pyramid

| Layer | Scope | Tooling |
|---|---|---|
| Unit | Single module's domain/service logic in isolation, all collaborators mocked via the module's declared ports | `pytest` |
| Integration | Module + real Postgres (ephemeral test DB/container), verifying repository queries and cross-module event flow | `pytest` + `pytest-postgresql` or a docker-compose test service |
| Contract | Verifies a module's adapter (e.g. a broker or data-vendor adapter) satisfies its port's interface using recorded fixtures | `pytest` + recorded HTTP fixtures (no live network calls in CI) |
| System / End-to-End | Full pipeline (Market Data → ... → Risk Engine → simulated Execution) run against a fixed historical dataset, asserting exact expected trades/rejections | `pytest`, run in Backtesting mode |
| Frontend | Dashboard component and page tests | Whatever the Next.js dashboard project settles on (e.g. Vitest/Playwright) — decided at Milestone 12 |

## 2. Module-Specific Requirements

Every module's test suite must cover, at minimum:

- **Market Data Engine:** vendor outage handling, duplicate candle handling (idempotent ingestion), gap detection.
- **Indicator Engine:** each indicator validated against a hand-computed or reference-tool value for a fixed input series.
- **ICT Analysis Engine:** each detector (BOS, CHoCH, sweep, FVG, order block) tested against hand-annotated fixture chart data with known expected detections — both positive and negative cases (structure that should *not* trigger).
- **AI Analysis Engine:** deterministic parts of the pipeline (input assembly, explanation formatting) fully unit tested; the model-driven synthesis step is tested for *shape and constraint* (confidence in [0,1], required fields present, evidence lists non-empty when confidence exceeds threshold) rather than for a single "correct" output, since it is inherently probabilistic.
- **Rule Engine:** every configured rule gets an explicit pass-case and fail-case test; a rule with a missing/null required input must resolve to fail, never pass (direct test of the "NO TRADE on missing info" requirement).
- **Risk Engine:** boundary tests for every limit (e.g. exactly at daily loss limit, one cent over/under); kill-switch engagement blocks new entries but does not interfere with closing existing positions; config changes to risk limits require the audited path (§8 of `ARCHITECTURE.md`) — a test asserts the non-audited path does not exist / is rejected.
- **Execution Engine:** order lifecycle state machine tested for every transition (submitted → acknowledged → filled/partial/rejected/cancelled); broker adapter swap (simulated vs. real) covered by the contract test layer so the same test suite runs against both.
- **Backtesting Engine:** no-lookahead test — a fixture deliberately includes a future price move that must not influence any decision computed before that bar's `event_time`; determinism test — same inputs produce byte-identical results on repeated runs.
- **Performance Analytics:** each metric (Sharpe, Sortino, profit factor, expectancy, etc.) verified against a hand-built trade fixture with a known correct answer.
- **Trade Review / Pattern Discovery / Continuous Research:** verified to only ever write to their own report tables — an integration test asserts zero writes to `config_versions` or any Rule Engine table from these modules.

## 3. Backtest Validation Methodology

Before any strategy configuration is proposed for paper trading (Milestone 11), it must pass through the Strategy Research Lab with:

1. **In-sample backtest** over a defined historical window.
2. **Out-of-sample validation** over a separate, later historical window not used for any parameter tuning.
3. **Walk-forward analysis** — rolling window re-optimization to check parameter stability over time rather than a single lucky fit.
4. **Monte Carlo resampling** of the trade sequence to estimate the distribution of possible drawdowns/outcomes, not just the single realized backtest path.

A strategy config that only has an in-sample result is explicitly **not** eligible for paper trading — this is enforced procedurally (roadmap gate) since it cannot be enforced by the type system alone.

## 4. Paper Trading Validation Gates

See `PROJECT_ROADMAP.md` §Paper → Live Promotion Checklist — paper trading is itself a test phase for the strategy, running the full production code path (Rule Engine, Risk Engine, real-time data) against a simulated broker adapter, and is subject to the same minimum-sample-size and performance-threshold requirements as any other test before promotion.

## 5. Risk Engine — Deliberate Failure-Mode Testing

Because the Risk Engine is the capital-preservation backstop, its test suite additionally includes deliberate fault injection:
- Simulated broker disconnect mid-trade → verify kill switch engages and Notification Engine fires.
- Simulated abnormal behavior (e.g. rapid repeated rejections in a short window) → verify the halt condition triggers per configured thresholds.
- Simulated config load failure at startup → verify the system refuses to start in a state with undefined risk limits (fail closed, never fail open).

## 6. CI Pipeline

GitHub Actions workflow (added alongside Milestone 1):

1. `lint` — ruff/flake8 (backend), ESLint (frontend, reuses repo convention from `npm run lint`)
2. `typecheck` — mypy (backend), `tsc` (frontend)
3. `unit-tests` — pytest unit layer, no external services
4. `integration-tests` — pytest integration layer against an ephemeral Postgres service container
5. `build` — Docker image build for backend/frontend/worker
6. (staging only) deploy on merge; (production) manual approval required — see `ARCHITECTURE.md` §9.

No milestone's approval gate is considered satisfied until its tests are green in this pipeline, not just locally.

## 7. Non-Goals / Explicitly Out of Scope for v1 Testing

- Load/performance testing of the API layer (single-operator system; revisit if/when multi-user or higher-frequency strategies are added).
- Fuzz testing of broker adapter wire formats beyond the contract-fixture approach above (revisit if a broker integration proves unstable).
