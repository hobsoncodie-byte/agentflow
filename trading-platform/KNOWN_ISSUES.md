# KNOWN_ISSUES.md

Open questions and decisions that need to be resolved — most before Milestone 1, some later — tracked here rather than guessed at, per the "never guess, never assume" principle.

## Decisions needed before Milestone 1 (Foundations)

1. **Market data vendor — decided: Interactive Brokers.** `InteractiveBrokersMarketDataProvider` (`modules/market_data/adapters/interactive_brokers_provider.py`) implements the `MarketDataProvider` port via `ib_async`, using `ContFuture` for continuous CME futures historical data. It is unit-tested against a fake IB client (contract construction, timeframe→bar-size mapping, duration-string calculation, bar translation, timezone handling — see `tests/unit/test_interactive_brokers_provider.py`), and wired in behind `market_data_provider` config (`"replay"` default, `"interactive_brokers"` to enable; connection is established once at app startup via `app.main`'s lifespan hook, not per-request). **What is NOT done: live verification.** This sandbox has no running TWS/IB Gateway, no IB account, and no network path to one — the roadmap gate for Milestone 2 ("demonstrated backfill + live ingestion against real vendor data") requires the user to run this against their own TWS/IB Gateway with valid CME market data permissions for MES. Also not yet built: chunking/pacing to stay under IB's historical-data rate and duration limits — deferred until real usage surfaces the actual constraints rather than guessed at.
2. **Broker for paper/live execution — decided: Interactive Brokers** (same account/connection as the data vendor above). The `execution` module's broker adapter is not yet built (that's Milestone 15 scope) — this only records the decision so Milestone 15 doesn't need to re-litigate it. Order-type/API details (bracket orders, native trailing stops) to be confirmed against IB's API when that module is built.
3. **Dashboard authentication.** `API.md` assumes a shared API key / session check "from day one" but does not specify the mechanism. This is a single-operator system per current scope (§11 of `ARCHITECTURE.md`), so a simple approach (e.g. a single long-lived API key + IP allowlist) may be sufficient — needs explicit confirmation rather than being assumed.
4. **Hosting/infrastructure target.** `ARCHITECTURE.md` §9 describes containerized deployment generically; no cloud provider or bare-metal target has been chosen. Matters for latency-sensitive Execution Engine placement (colocation vs. general cloud region) before Milestone 15.
5. **Paper-trading minimum sample size (N).** `PROJECT_ROADMAP.md`'s promotion checklist leaves this as a placeholder — needs to be set with the user, informed by the ICT NY Open setup's expected trade frequency, before Milestone 11 begins.

## Design notes carried forward (not blocking, but tracked)

6. **AI Analysis Engine model choice** (self-hosted vs. hosted LLM API, and which one) is deferred to Milestone 6 design — not decided here since it doesn't affect the schema or module boundaries, only the `ai_analysis` module's internal adapter.
7. **Retention/cold-storage tooling** for partitioned tables (`DATABASE.md` §11) — no partitions will ever be deleted, but the mechanism for moving old partitions to cheaper storage isn't chosen yet; revisit once data volume makes it a real cost concern rather than a theoretical one.
8. **Multi-instrument activation** (ES/MNQ/NQ) — schema and config are ready for it (`instruments` table, per-instrument specs) but no milestone activates them; treat as a follow-on roadmap item after MES is live and stable, requiring explicit approval like any other scope expansion.

## Explicitly deferred (non-goals restated from ARCHITECTURE.md §11)

- Multi-account/multi-tenant support.
- Automatic strategy self-modification from Pattern Discovery / Continuous Research output.
