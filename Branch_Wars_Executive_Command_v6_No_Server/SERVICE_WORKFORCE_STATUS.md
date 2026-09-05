# Service workforce planner — N-05 decision-support slice

Date: 2026-09-05

## Delivered

Markets > **Service Workforce Planner** compares the current draft with six one-banker reallocations between Retail & Service and Business/Lending/Operations. Each eligible option uses the real operating preview for post-growth coverage, bank profit after funding-sale losses, net deposits/loans and focus-market goodwill pull.

- Reports today's minimum service staffing and distinguishes actual shortfall from covered capacity, including near-100% values.
- Preserves total staff, reserved commercial-service bankers, sales capacity for an explicit service bid and committed project execution capacity.
- An explicit click stages only the allocation. It does not submit a turn, cancel bids, change research or add payroll.
- Recruitment is a separate draft action with incremental recruiting cost, future base payroll, hiring/cash/capital limits and next-cycle arrival clearly stated. It grants no capacity in this turn's preview.
- Collapsed by default; the seven previews are calculated only when opened. The panel stays open through relevant draft updates and remains full-width in Markets, rather than adding another Operations grid.
- Locked plans cannot be edited through these controls. Live state, player data, RNG and other draft intents are not mutated by comparison.

This batch makes existing staffing mechanics actionable; it does **not** introduce specialist career tracks, persistent training budgets or a new bank department. It does not complete N-05. The earlier staffing/training proposal is therefore only partly addressed. See [blueprint progress](BLUEPRINT_PROGRESS.md).

## Compatibility and limits

Available in customer-demand rules-2 / save-8.4 campaigns with persistent goodwill, including existing such saves. No new rules, save-format change or transport protocol was introduced. AI and simulation outcomes are intentionally unchanged when players keep the same plans. Both players should update to get the same planning tools.

Forecasts exclude executive events, rival actions, opportunities and new project completions. More short-term profit is not necessarily safer or strategically better. Hiring uses the established generic banker system, automatic allocation normalization and morale effects; review the next turn's allocation after recruits report. AI reserve/retry quality, human pacing, specialist training and the Operations redesign remain outstanding.

## Verification

Focused tests cover real-engine forecast equality, input purity, staff conservation, reservations, explicit bid and project-capacity protection, invalid allocation handling, hiring limits/cost/timing, actual UI handler execution and locked-plan guards. Four 20-turn scenarios compare full state and AI plans against the preserved prior goodwill build, including comparisons opened during play.

Preserved rollback: [goodwill build](reports/reference-builds/BRANCH_WARS_goodwill_0ae290e.html), SHA-256 `0ae290ef37cc65951396abadb04e175cd3e975dcd49ac48ca30c239643491f53`.

HTML SHA-256: `ff15fce9f8e4af3ebb6024c0b4d984dba3cededee0d8a4f7e5bb2f245a62453c`.

[Final-source long audit](reports/baselines/release-balance-2026-09-05T13-48-56-199Z.json): 16 campaigns, four scenarios, seeds 4–7, 180 turns each (2,880 turns). All remained active; accounting, local/deposit/credit books and contribution checks passed. Results, activity, cancellations and maximum payload were exactly equal to the prior release's same-seed report. There were 326 provider changes (207 after turn 60), 2,192 competitive actions, zero silently skipped initiatives and four explicitly uncharged cash-change cancellations. Largest public state: 678,013 bytes. This demonstrates unchanged simulation behavior, not newly improved AI balance or human pacing.

[Final-source full regression](reports/baselines/N-00-2026-09-05T13-43-26-566Z.json): **36/36 invocations passed**, source/test fingerprints unchanged, repeated balance output identical. Covers engine/UI contracts, accounting, product lifecycles, planner behavior, old-rule compatibility, deterministic replay, save/ledger validation, simulated GitHub recovery and Windows LAN health/create/join/relay/retry-deduplication. Passing automation is not physical two-computer or human balance acceptance.

Final-review correction: invalid staff allocations now keep the explanatory panel open. A focused UI-handler assertion and a fresh browser test on the final bytes verified this path. The earlier full runner was stopped and verification restarted after this correction; the interrupted run is not a passing release gate.

Release target: `NerdyGeneral/BranchWars`, existing `claude/emergent-doctrine` branch. Only this batch's code, documentation, tests, rollback and final evidence are included. The architecture plan and intermediate diagnostic reports remain local. Publication is verified separately by matching the remote commit to local HEAD.

Browser QA through the computer-use skill used a disposable loopback campaign on port 8917. The full-width table fit a 950px viewport without page-wide horizontal overflow. A Lending-to-Retail transfer and one recruit updated the existing planning/Operations controls without submitting the plan. Explicit Ready then resolved the turn; nine staff, including five Retail & Service bankers after normal allocation, persisted through reload/Continue. Warning/error logs were empty. The test tab/server were closed, leaving the user's game untouched.
