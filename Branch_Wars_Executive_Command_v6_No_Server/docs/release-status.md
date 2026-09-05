# Current release status

Updated: 2026-09-05.

## Implemented build

The current game is the two-region Living Bank preview with accounting/funding, persistent rivalry, product/credit books, commercial service contracts, capability deployments, customer goodwill and the Service Workforce Planner. See [roadmap](roadmap.md) for incomplete packages. Specialist training budgets, financial-group subsidiaries, company shares and full national management remain ahead.

Game source SHA-256: `ff15fce9f8e4af3ebb6024c0b4d984dba3cededee0d8a4f7e5bb2f245a62453c`. This documentation cleanup does not change the game, saves, launch targets or simulation rules.

## Evidence and limits

- [Last complete mechanics regression](../reports/baselines/N-00-2026-09-05T13-43-26-566Z.json): 36/36 invocations passed on the game bytes above, including replay, saves, ledger, simulated GitHub recovery and Windows LAN checks.
- [Same-source long audit](../reports/baselines/release-balance-2026-09-05T13-48-56-199Z.json): 16 campaigns / 2,880 turns; accounts reconciled and all campaigns remained active. Four cash-change cancellations were explicit and uncharged.
- [Workforce batch details](archive/service-workforce-status.md): browser layout, draft actions and save continuation checks, plus scope limits.
- Passing simulations are not proof of equal strategies or satisfying human victory pacing. AI reserve/retry quality, real two-computer acceptance and multi-session national play remain outstanding.

Cleanup-specific checks cover generated-reference freshness, Markdown links and naming, engine regression, transport and unchanged runtime fingerprints. Their current result is recorded in the cleanup PR; historical reports were not relabeled as new runs.

## GitHub delivery

PRs #1–#5 are merged historical changes. Recent banking releases continued on `claude/emergent-doctrine` after #5; they need a new PR to reach `main`. Repository housekeeping standardizes PR metadata without rewriting merge history. The new release PR is left for explicit review/merge, not automatically merged.
