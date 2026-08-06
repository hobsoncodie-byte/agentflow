# API.md — Endpoint Definitions

Status: **Design only — no routes implemented yet.**
Framework: FastAPI. All endpoints versioned under `/api/v1`. All responses include the originating `decision_id`/`trade_id` where applicable so the frontend can deep-link to the full reasoning trail. Authentication/authorization scheme for the dashboard API is a v1.1 concern (single-operator system initially — see `KNOWN_ISSUES.md`); every endpoint below still sits behind a shared API key / session check from day one, never open.

## 1. Market Data Engine — `/api/v1/market-data`

| Method | Path | Purpose |
|---|---|---|
| GET | `/instruments` | List configured instruments and their specs |
| GET | `/candles` | Query candles by `instrument`, `timeframe`, `from`, `to` |
| GET | `/candles/latest` | Latest candle per instrument/timeframe (for dashboard live view) |
| POST | `/backfill` | Trigger historical backfill for an instrument/timeframe/date range |
| GET | `/data-integrity` | Report known gaps/staleness per instrument |

## 2. Indicator Engine — `/api/v1/indicators`

| Method | Path | Purpose |
|---|---|---|
| GET | `/values` | Query computed indicator values by `instrument`, `timeframe`, `indicator`, `from`, `to` |
| GET | `/definitions` | List available indicators and their configurable parameters |

## 3. ICT Analysis Engine — `/api/v1/ict`

| Method | Path | Purpose |
|---|---|---|
| GET | `/structure-events` | Query BOS/CHoCH/sweep/order-block/FVG events by instrument/timeframe/date range |
| GET | `/session-levels` | PDH/PDL/overnight range/IB high-low for a session date |
| GET | `/structure-events/{id}` | Single structure event detail, including invalidation status |

## 4. AI Analysis Engine — `/api/v1/ai-analysis`

| Method | Path | Purpose |
|---|---|---|
| GET | `/latest` | Most recent market report for an instrument (bias, probability, confidence, reasoning) |
| GET | `/{id}` | Full analysis record incl. `inputs_snapshot`, `evidence_for`/`evidence_against` |
| GET | `/history` | Historical analyses by instrument/date range (for review/backtesting UI) |
| POST | `/trigger` | Force an on-demand analysis run outside the normal schedule (research/debug use) |

## 5. News & Economic Calendar — `/api/v1/news`

| Method | Path | Purpose |
|---|---|---|
| GET | `/calendar` | Upcoming/past economic events by date range and impact level |
| GET | `/items` | News items by date range/tag |

## 6. Rule Engine — `/api/v1/rule-engine`

| Method | Path | Purpose |
|---|---|---|
| GET | `/evaluations` | Query rule evaluations by instrument/date range/outcome |
| GET | `/evaluations/{id}` | Single evaluation with full per-rule pass/fail breakdown |
| GET | `/config` | Current active rule configuration (thresholds, required confirmations) |
| GET | `/config/history` | Version history of rule configuration changes |

Rule Engine config **writes** happen only through the Configuration Manager endpoints (§12), never directly, so every change is versioned uniformly.

## 7. Risk Engine — `/api/v1/risk`

| Method | Path | Purpose |
|---|---|---|
| GET | `/evaluations` | Query risk evaluations by date range/outcome |
| GET | `/status` | Live risk state: daily P&L, drawdown, trade count, consecutive losses, kill-switch state |
| GET | `/limits` | Current active risk limits |
| POST | `/kill-switch` | Manually engage the kill switch (halts new entries immediately) — requires explicit confirmation payload |
| POST | `/kill-switch/release` | Manually release the kill switch — requires explicit confirmation payload and is itself logged as a `risk_events` row |
| GET | `/events` | Query risk events (limit hits, halts) by date range |

## 8. Execution Engine — `/api/v1/execution`

| Method | Path | Purpose |
|---|---|---|
| GET | `/trades` | Query trades by instrument/environment/status/date range |
| GET | `/trades/{id}` | Full trade detail incl. linked rule/risk evaluation and order events |
| GET | `/trades/{id}/orders` | Order lifecycle events for a trade |
| POST | `/trades/{id}/close` | Manual close/flatten of an open position (operator override, always logged) |
| GET | `/broker/health` | Broker adapter connectivity/heartbeat status |

Note: there is intentionally **no** `POST /trades` (manual trade creation) endpoint bypassing Rule/Risk Engine — the only path to a new trade is the internal Rule Engine → Risk Engine → Execution Engine pipeline.

## 9. Paper Trading Engine — `/api/v1/paper`

| Method | Path | Purpose |
|---|---|---|
| GET | `/trades` | Paper trade history (same shape as `/execution/trades`, filtered to `environment='paper'`) |
| GET | `/account` | Simulated account state (balance, equity, open exposure) |
| POST | `/reset` | Reset the paper account to its configured starting balance (research/testing use, logged) |

## 10. Backtesting Engine — `/api/v1/backtest`

| Method | Path | Purpose |
|---|---|---|
| POST | `/runs` | Start a new backtest run over a date range with a given strategy config |
| GET | `/runs/{id}` | Backtest run status/progress |
| GET | `/runs/{id}/results` | Full results: trade list, equity curve, performance metrics |
| GET | `/runs` | List past backtest runs |

## 11. Strategy Research Lab — `/api/v1/research`

| Method | Path | Purpose |
|---|---|---|
| POST | `/walk-forward` | Start a walk-forward validation run |
| POST | `/monte-carlo` | Start a Monte Carlo simulation over a trade/backtest sample |
| POST | `/optimize` | Start a parameter optimization sweep |
| GET | `/runs/{id}` | Status/results for any research run type (`research_runs` table) |
| GET | `/runs` | List research runs by type/date/status |
| GET | `/compare` | Compare two or more strategy configs' backtest results side by side |

All endpoints in this section write only to `research_runs`/report tables — never to live Rule Engine configuration.

## 12. Configuration Manager — `/api/v1/config`

| Method | Path | Purpose |
|---|---|---|
| GET | `/{module}` | Current active config for a module |
| GET | `/{module}/history` | Version history for a module's config |
| PUT | `/{module}` | Propose a new config version (non-risk-limit fields hot-reload; risk-limit fields require restart — see ARCHITECTURE.md §8) |
| GET | `/sessions` | Configured trading sessions |
| GET | `/instruments` | Configured instruments (mirrors `/market-data/instruments`, canonical source here) |

## 13. Performance Analytics — `/api/v1/performance`

| Method | Path | Purpose |
|---|---|---|
| GET | `/summary` | Overall win rate, profit factor, expectancy, drawdown, Sharpe, Sortino, avg R |
| GET | `/by-setup` | Breakdown by setup type |
| GET | `/by-weekday` | Breakdown by weekday |
| GET | `/by-session` | Breakdown by session |
| GET | `/by-regime` | Breakdown by market regime |
| GET | `/monthly` | Monthly rollups |
| GET | `/yearly` | Yearly rollups |
| GET | `/equity-curve` | Time series of cumulative P&L/equity for charting |

## 14. Trade Review AI — `/api/v1/trade-review`

| Method | Path | Purpose |
|---|---|---|
| GET | `/{trade_id}` | Review for a specific trade (predicted vs. actual, scores, mistakes) |
| GET | `/` | List reviews by date range/score range |
| POST | `/{trade_id}/regenerate` | Re-run review generation for a trade (e.g. after review logic improves) |

## 15. Pattern Discovery AI — `/api/v1/pattern-discovery`

| Method | Path | Purpose |
|---|---|---|
| GET | `/reports` | List generated pattern discovery reports |
| GET | `/reports/{id}` | Full report detail |
| POST | `/reports/generate` | Trigger an on-demand discovery run over a scope (weekday, regime, etc.) |

## 16. Continuous Research Engine — `/api/v1/continuous-research`

| Method | Path | Purpose |
|---|---|---|
| GET | `/status` | Last/next scheduled run, current status |
| GET | `/reports` | List reports generated by scheduled off-hours runs |
| POST | `/run-now` | Manually trigger an off-hours-style research pass on demand |

## 17. Notifications — `/api/v1/notifications`

| Method | Path | Purpose |
|---|---|---|
| GET | `/log` | Query sent notifications by channel/category/date range |
| GET | `/settings` | Current notification routing config |
| PUT | `/settings` | Update notification routing (which events go to which channel) |

## 18. Dashboard-Support / Aggregate — `/api/v1/dashboard`

| Method | Path | Purpose |
|---|---|---|
| GET | `/overview` | Single aggregate payload: account state, open trades, today's risk status, latest AI bias — for the dashboard landing page |
| GET | `/journal` | Combined trade + review + rule/risk evaluation feed for the trade journal view |

## 19. System / Health — `/api/v1/system`

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness/readiness probe for orchestration |
| GET | `/errors` | Query `error_log` by severity/module/date range |
| GET | `/version` | Deployed version/build info |

## 20. Error Response Contract

All non-2xx responses share one shape:

```json
{
  "error": {
    "code": "RISK_LIMIT_EXCEEDED",
    "message": "Daily loss limit reached; new entries blocked.",
    "details": { "daily_pnl": -450.00, "limit": -400.00 }
  }
}
```

`code` values are stable, documented identifiers the frontend can switch on (not raw exception messages), so the dashboard can render risk/rule rejections with the same explanatory detail the database stores.
