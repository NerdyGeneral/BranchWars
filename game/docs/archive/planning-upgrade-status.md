> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# Planning and operating visibility upgrade

Implemented against d764495 (2026-09-04).

## Delivered

- Save migration preserves every valid active initiative rather than truncating the list to two.
- A shared plan quote includes every initiative, hiring, capability funding, and competitive action. It also reports uncommitted cash, execution capacity, and added base payroll.
- The quote appears in command navigation and Competition. Funding and hiring refresh it immediately.
- Research steps respect available cash, the next milestone, and the per-cycle limit; a Fund to milestone button avoids repeated clicks. Invalid and excessive peer investment amounts are rejected.
- Operations contains recruiting, construction, and remediation. Strategy opens directly onto capabilities. Emergency board assistance appears when eligible.
- Operating previews use the same operating function as actual resolution, on a copy of the bank, without consuming game randomness. They compare products, staffing, and policies under the current economy. They exclude events, competition, opportunities, forced sales, and new project completions.
- Actual operating reports reconcile income, funding expense, payroll/facility expense, credit losses, and the profit event adjustment. They are private to the bank; they are not a full cash-flow statement.
- Direct-link response handling preserves the reconnect flag.

## Verification

Engine, migration, funding-boundary, budget, preview-purity, report-reconciliation, transport, and local LAN tests pass. The deterministic 800-campaign audit retains the prior results: zero unfinished games; median 55 cycles; maximum 156. This does not establish balance across deliberate human strategies: the bot audit still mostly produces Community institutions and buyout endings.

## Next implementation stages

1. Add a complete cash-movement ledger and multi-metric history charts. Separate organic business from rival transfers, investment, events, and forced asset sales.
2. Introduce branch-level demand, capacity, costs, and profitability, then conversion and closure decisions. Keep geography extensible for regional play.
3. Add cross-capability programs with deployment requirements and ongoing costs, backed by distinct strategic bot policies and mirrored-seat tests.
4. Build regional portfolios and local economic differences before enlarging the national map or adding more human seats.

No new branch-level simulation, cross-capability program, regional map, or multiplayer seat count is included in this upgrade.
