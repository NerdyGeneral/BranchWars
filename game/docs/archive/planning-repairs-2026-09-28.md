# Planning interface repairs — September 28, 2026

This batch changes presentation and command routing only. It follows the Core
balance/hiring work already on PR #33; it introduces no further engine or save
schema changes.

## Player paths

| Request | Implemented behavior |
| --- | --- |
| Core forecasts contain too many disclosure boxes | Overview, Income & loans, Hiring impact, Growth & limits, Commercial banking, and Balances & books are topic buttons. Income and book reports stay open inside their selected topic. |
| Executive decisions need clearer consequences | Each option shows cash paid, cash received, equity change, immediate effects and later effects. Event-specific text explains limits; the existing engine supplies all quoted amounts. |
| Strategy stops accepting funding after other spending | Core redraws Strategy controls after a draft change. Detached controls remain invalid, and fresh controls quote the latest available budget. |
| Spending report loses Reports | Spending & commitments stays in the Reports inspector, retaining the directory and mobile Back to list action. |
| Company selection should precede People tabs | Financial group selection appears first. Locked companies show only their locked state; active subsidiaries expose Staff & credentials without bank-only tabs. Launch staffing remains available through Financial Group expansion preparation. |
| Work/time allocation is confusing | Work coverage starts with department coverage cards and shortfall bars. Editors and staff proposal comparisons use employee-months in 0.25 steps; canonical quarter units remain internal. Pool tables show the shared employees and reservations. |
| Leadership and specialists are hard to read | Department overview cards show the leader, specialist count and assigned employees. Profile cards explain appointment costs and salary. Specialists are included in headcount; leadership promotes an existing specialist. |
| Building choice is overwhelming | Open a branch is the default. Expand an existing office, Specialist offices, and Large centers & hubs preserve every existing model and service path. Office staffing gains explicit reference-fill and clear controls that only change working inputs until Add. |

Expanded Reports also exposes the existing Hiring impact comparison directly,
with a shortcut from recruitment. No forecast is treated as a guaranteed result.

The branch grouping uses the existing building, service, renovation and conversion
mechanics. It does not migrate all office designs into a new universal building
model or alter existing construction costs.

## Verification

- Focused forecast, decision quote, Operations, Strategy, People, Banking & Group,
  Markets, shell, commercial locations, Core loan income, Core books and income
  review suites passed. Decision coverage includes 312 direct owner comparisons
  and 156 full event/choice resolutions. Regression cases include stale controls,
  retained working edits, exact quarter conversion, locked/active companies,
  funded expansion preparation, all seven office models, and explicit staging.
- Portable build freshness, architecture, engine boundary, documentation and
  release catalog checks passed. The engine fingerprint is unchanged by this batch.
- The [browser receipt](../../reports/qa/planning-repair-2026-09-28.json) records
  the exact portable SHA256, browser version, seven interaction checks, six
  viewport checks and zero script errors. Desktop and mobile screenshots were
  inspected for the new decisions, coverage, leadership and building layouts.
- Full GitHub Actions must pass on the updated PR head before merging. These
  focused checks do not establish full release or human multiplayer acceptance.

Reproduce the browser checks with `node game/tools/planning_repair_browser.js`
after installing Playwright and its Chromium browser. Optional environment
variables: `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE`, and
`BRANCH_WARS_REPAIR_OUTPUT`. The runner uses isolated in-memory storage and
blocks external requests. Its snapshot hook only reads the current draft/world.
