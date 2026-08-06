# DATABASE.md — Schema Design

Status: **Design only — no migrations have been written yet.**
Engine: PostgreSQL. Time-series heavy tables are designed for native partitioning from the start (declarative `PARTITION BY RANGE` on a timestamp column) since "never discard historical information" means these tables grow without bound.

## 1. Design Principles

- Every row that represents a decision, evaluation, or event is **immutable** once written (append-only). Corrections are new rows referencing the original (`corrects_id`), never `UPDATE`/`DELETE` of history.
- Every table has `created_at timestamptz not null default now()`. Tables holding market events also carry the event's own `event_time timestamptz` distinct from `created_at` (ingestion time vs. market time).
- Foreign keys enforce that a trade/decision always traces back to the exact rule evaluation and AI analysis that produced it — the audit trail is relational, not just log lines.
- All monetary values stored as `numeric` (never `float`), with an explicit `currency` where relevant.
- All enums implemented as Postgres `enum` types (or lookup tables where the set is expected to grow) so invalid states are rejected at the DB layer, not just the application layer.

## 2. Core Reference Tables

```sql
-- Instrument specification (config-driven multi-instrument support)
instruments (
  id                  smallint primary key generated always as identity,
  symbol              text unique not null,          -- 'MES', 'ES', 'MNQ', 'NQ'
  exchange            text not null,                  -- 'CME'
  tick_size           numeric not null,
  tick_value          numeric not null,
  contract_multiplier numeric not null,
  currency            text not null default 'USD',
  active              boolean not null default true,
  created_at          timestamptz not null default now()
)

-- Trading sessions (config-driven session windows, not hardcoded)
sessions (
  id            smallint primary key generated always as identity,
  name          text unique not null,                -- 'ICT_NY_OPEN'
  start_time    time not null,                        -- 09:20 in session timezone
  end_time      time not null,                        -- 10:30
  timezone      text not null default 'America/New_York',
  active        boolean not null default true
)

-- Versioned configuration snapshots (Configuration Manager)
config_versions (
  id            bigint primary key generated always as identity,
  module        text not null,                        -- 'risk_engine', 'rule_engine', ...
  version       int not null,
  config_json   jsonb not null,
  is_risk_limit_change boolean not null default false,
  applied_at    timestamptz not null default now(),
  applied_by    text not null,
  note          text,
  unique (module, version)
)
```

## 3. Market Data (Market Memory DB)

```sql
-- Every candle, every timeframe, every instrument. Partitioned by month.
candles (
  id            bigint generated always as identity,
  instrument_id smallint not null references instruments(id),
  timeframe     text not null,                        -- '1m','5m','15m','1h','1d'
  event_time    timestamptz not null,                 -- candle open time
  open          numeric not null,
  high          numeric not null,
  low           numeric not null,
  close         numeric not null,
  volume        numeric not null,
  source        text not null,                        -- data vendor identifier
  created_at    timestamptz not null default now(),
  primary key (id, event_time)
) partition by range (event_time);

create unique index on candles (instrument_id, timeframe, event_time);

-- Raw ticks, optional, only if vendor + strategy require tick-level detail
ticks (
  id            bigint generated always as identity,
  instrument_id smallint not null references instruments(id),
  event_time    timestamptz not null,
  price         numeric not null,
  size          numeric not null,
  side          text,                                  -- 'buy'/'sell' if available
  source        text not null,
  primary key (id, event_time)
) partition by range (event_time);

-- Every raw response from a market data / broker / news API, for replay & audit
api_responses (
  id            bigint generated always as identity,
  provider      text not null,
  endpoint      text not null,
  request_meta  jsonb not null,
  response_body jsonb not null,
  status_code   int not null,
  event_time    timestamptz not null default now(),
  primary key (id, event_time)
) partition by range (event_time);
```

## 4. Indicators & ICT Analysis

```sql
-- Computed indicator values, keyed like candles so they can be joined 1:1
indicator_values (
  id            bigint generated always as identity,
  instrument_id smallint not null references instruments(id),
  timeframe     text not null,
  event_time    timestamptz not null,
  indicator     text not null,                        -- 'atr_14','ema_20','volume_profile',...
  value         jsonb not null,                        -- scalar or structured value
  primary key (id, event_time)
) partition by range (event_time);

-- ICT structural detections
market_structure_events (
  id              bigint generated always as identity,
  instrument_id   smallint not null references instruments(id),
  timeframe       text not null,
  event_time      timestamptz not null,
  event_type      text not null,                       -- 'BOS','CHOCH','LIQUIDITY_SWEEP','ORDER_BLOCK','FVG'
  direction       text not null,                        -- 'bullish'/'bearish'
  price_high      numeric,
  price_low       numeric,
  metadata        jsonb not null default '{}',          -- e.g. FVG gap size, sweep wick size
  invalidated_at  timestamptz,                           -- set when structure is later invalidated
  primary key (id, event_time)
) partition by range (event_time);

-- Daily/session reference levels (PDH/PDL, overnight range, etc.)
session_levels (
  id            bigint generated always as identity,
  instrument_id smallint not null references instruments(id),
  session_date  date not null,
  level_type    text not null,                          -- 'PDH','PDL','ON_HIGH','ON_LOW','IB_HIGH','IB_LOW'
  price         numeric not null,
  created_at    timestamptz not null default now(),
  unique (instrument_id, session_date, level_type)
)
```

## 5. News & Economic Calendar

```sql
economic_events (
  id            bigint primary key generated always as identity,
  event_time    timestamptz not null,
  name          text not null,
  country       text not null,
  impact        text not null,                          -- 'low','medium','high'
  actual        text,
  forecast      text,
  previous      text,
  source        text not null,
  created_at    timestamptz not null default now()
);

news_items (
  id            bigint primary key generated always as identity,
  published_at  timestamptz not null,
  headline      text not null,
  summary       text,
  source        text not null,
  tags          text[] not null default '{}',
  ai_relevance_score numeric,                            -- how relevant AI judged it to the instrument
  created_at    timestamptz not null default now()
);
```

## 6. Decisions — The Explainability Backbone

```sql
-- One row per AI market analysis output (see Explainability Contract in ARCHITECTURE.md)
ai_analyses (
  id                bigint primary key generated always as identity,
  instrument_id     smallint not null references instruments(id),
  session_id        smallint references sessions(id),
  event_time        timestamptz not null,
  bias              text not null,                        -- 'bullish','bearish','neutral'
  probability        numeric,                             -- estimated probability of bias playing out
  confidence         numeric not null,                    -- 0-1
  inputs_snapshot     jsonb not null,                       -- structure/indicator/news inputs considered
  evidence_for        text[] not null default '{}',
  evidence_against     text[] not null default '{}',
  reasoning            text not null,
  report_markdown      text,                               -- full human-readable report
  created_at           timestamptz not null default now()
);

-- One row per rule engine evaluation (whether or not a trade resulted)
rule_evaluations (
  id                bigint primary key generated always as identity,
  instrument_id     smallint not null references instruments(id),
  ai_analysis_id    bigint references ai_analyses(id),
  event_time        timestamptz not null,
  config_version_id bigint references config_versions(id),
  outcome           text not null,                          -- 'accept','reject'
  rule_results      jsonb not null,                          -- [{rule, passed, expected, actual}, ...]
  rejection_reason  text,
  created_at        timestamptz not null default now()
);

-- One row per risk engine evaluation, always tied to a rule_evaluation
risk_evaluations (
  id                  bigint primary key generated always as identity,
  rule_evaluation_id  bigint not null references rule_evaluations(id),
  event_time          timestamptz not null,
  outcome             text not null,                        -- 'approved','rejected'
  proposed_size       numeric,
  approved_size       numeric,
  rejection_reason    text,
  risk_snapshot       jsonb not null,                        -- daily P&L, drawdown, trade count, etc. at decision time
  created_at          timestamptz not null default now()
);

-- Trades rejected before execution (from either engine) — never discarded
rejected_trades (
  id                    bigint primary key generated always as identity,
  instrument_id         smallint not null references instruments(id),
  rule_evaluation_id    bigint references rule_evaluations(id),
  risk_evaluation_id    bigint references risk_evaluations(id),
  rejected_by           text not null,                        -- 'rule_engine','risk_engine'
  reason                text not null,
  event_time            timestamptz not null,
  created_at            timestamptz not null default now()
);
```

## 7. Execution & Trades

```sql
-- One row per accepted trade idea that reached execution (paper or live)
trades (
  id                    bigint primary key generated always as identity,
  instrument_id         smallint not null references instruments(id),
  environment           text not null,                        -- 'paper','live'
  rule_evaluation_id    bigint not null references rule_evaluations(id),
  risk_evaluation_id    bigint not null references risk_evaluations(id),
  direction             text not null,                          -- 'long','short'
  entry_time            timestamptz,
  entry_price           numeric,
  stop_price            numeric,
  target_price          numeric,
  size                  numeric not null,
  exit_time             timestamptz,
  exit_price            numeric,
  exit_reason           text,                                    -- 'target','stop','manual','breakeven','trailing','eod'
  pnl                   numeric,
  r_multiple            numeric,
  status                text not null default 'open',            -- 'open','closed','cancelled'
  created_at            timestamptz not null default now()
);

-- Individual broker order lifecycle events per trade (acks, fills, cancels)
order_events (
  id            bigint primary key generated always as identity,
  trade_id      bigint not null references trades(id),
  event_time    timestamptz not null,
  event_type    text not null,                                  -- 'submitted','acknowledged','partial_fill','filled','cancelled','rejected'
  broker_order_id text,
  price         numeric,
  size          numeric,
  raw_payload   jsonb,
  created_at    timestamptz not null default now()
);

-- Risk control events (kill switch, halt, daily limit hit) — always explained
risk_events (
  id            bigint primary key generated always as identity,
  event_time    timestamptz not null,
  event_type    text not null,                                  -- 'kill_switch','daily_loss_limit','daily_profit_target','max_drawdown','max_trades','max_consecutive_losses','abnormal_behavior_halt'
  details       jsonb not null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);
```

## 8. Post-Trade Intelligence

```sql
trade_reviews (
  id                bigint primary key generated always as identity,
  trade_id          bigint not null references trades(id),
  predicted_outcome jsonb not null,                              -- from the originating ai_analyses row
  actual_outcome    jsonb not null,
  execution_quality_score numeric,
  setup_quality_score     numeric,
  mistakes          text[] not null default '{}',
  review_markdown   text not null,
  created_at        timestamptz not null default now()
);

pattern_discovery_reports (
  id            bigint primary key generated always as identity,
  generated_at  timestamptz not null default now(),
  scope         text not null,                                    -- e.g. 'weekday','volatility_regime','fvg_size'
  findings_json jsonb not null,
  report_markdown text not null
);

research_runs (
  id              bigint primary key generated always as identity,
  run_type        text not null,                                  -- 'walk_forward','monte_carlo','optimization','out_of_sample'
  strategy_config jsonb not null,
  parameters      jsonb not null,
  started_at      timestamptz not null,
  completed_at    timestamptz,
  status          text not null default 'running',
  results_json    jsonb,
  report_markdown text
);
```

## 9. Performance Analytics

```sql
-- Precomputed rollups (recomputed on schedule; never the source of truth — trades table is)
performance_rollups (
  id            bigint primary key generated always as identity,
  scope_type    text not null,                                    -- 'overall','by_setup','by_weekday','by_session','by_regime','monthly','yearly'
  scope_key     text not null,                                    -- e.g. 'Monday', '2026-08', 'FVG_continuation'
  period_start  date,
  period_end    date,
  win_rate            numeric,
  profit_factor       numeric,
  expectancy          numeric,
  max_drawdown        numeric,
  sharpe_ratio        numeric,
  sortino_ratio       numeric,
  avg_r_multiple      numeric,
  trade_count         int,
  computed_at         timestamptz not null default now(),
  unique (scope_type, scope_key, period_start, period_end)
);
```

## 10. System Tables

```sql
error_log (
  id            bigint primary key generated always as identity,
  event_time    timestamptz not null default now(),
  module        text not null,
  severity      text not null,                                    -- 'warning','error','critical'
  message       text not null,
  context       jsonb,
  created_at    timestamptz not null default now()
);

notifications_log (
  id            bigint primary key generated always as identity,
  event_time    timestamptz not null default now(),
  channel       text not null,                                    -- 'email','slack','push'
  category      text not null,                                    -- 'trade','risk_event','daily_report'
  payload       jsonb not null,
  delivery_status text not null default 'pending'
);
```

## 11. Partitioning & Retention

- `candles`, `ticks`, `indicator_values`, `market_structure_events`, `api_responses` are `RANGE`-partitioned by `event_time`, one partition per calendar month, created ahead of time by a scheduled maintenance job.
- **Retention policy: none by default.** Per the spec's "never discard historical information," no partition is ever dropped automatically. Older partitions may be moved to a cheaper Postgres tablespace/cold storage, but data is never deleted without an explicit, separately-approved operational decision (tracked in `KNOWN_ISSUES.md` if/when that becomes necessary).
- Indexes on all `event_time` columns and on `(instrument_id, event_time)` composites to keep both backtest replay scans and dashboard range queries fast.

## 12. Referential Integrity as Audit Trail

The chain `ai_analyses → rule_evaluations → risk_evaluations → trades → trade_reviews` is enforced with foreign keys so that for any trade (or any rejection), the full decision history is a single set of joins — this is what makes "every recommendation must explain its reasoning" verifiable in the database itself, not just in logs.
