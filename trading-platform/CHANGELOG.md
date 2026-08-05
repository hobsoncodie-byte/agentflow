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
