# KNOWN_ISSUES.md

Open questions and decisions that need to be resolved — most before Milestone 1, some later — tracked here rather than guessed at, per the "never guess, never assume" principle.

## Decisions needed before Milestone 1 (Foundations)

1. **Market data vendor — still open.** No data vendor has been selected (options offered: Interactive Brokers, Tradovate, Databento). Milestone 2 (Market Data Engine) was built vendor-agnostically per its ports-and-adapters design so it didn't have to block on this: the `MarketDataProvider` port, ingestion services, partitioned storage, and API are all in place, backed today by a `CsvReplayMarketDataProvider` that reads local CSV fixtures instead of a live feed. **This means Milestone 2's roadmap gate — "demonstrated backfill + live ingestion against real vendor data" — is not yet met.** A real vendor adapter is a small, isolated addition once one is chosen (implement `MarketDataProvider`, wire it into `get_market_data_service` in place of the CSV adapter); nothing else in the module changes. Still needs a decision before Milestone 15 (live) at the latest, and before any real historical backfill.
2. **Broker for paper/live execution.** No broker has been selected. Determines the `execution` module's adapter and what order types/APIs are available (e.g. bracket orders, native trailing stops). Needs a decision before Milestone 11 (paper) and is a hard requirement before Milestone 15 (live).
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
