# Unified blueprint v7 — current position

Reviewed against source and the workspace's preserved v7 blueprint on 2026-09-06.

The v6 crosswalk in the screenshot maps old packages into the newer plan; it is not a completion checklist. We are building the two-region **Living Bank** prototype. A sequence of small batches is not equivalent to completing N-00 through N-14.

| Package | Current implementation | Still required before calling the package complete |
|---|---|---|
| N-00–N-02 Foundations | Regression runner, versioned simulation/replay, causal ledger, reconciled bank accounting and funding mechanisms | Keep acceptance gates active; broader group accounting comes later |
| N-03 Persistent rivalry | Opt-in removal of permanent exclusion and score buyouts; priced office re-entry; outside competitors; owner recovery comparisons and cost-aware v8.9+ AI | Human recovery/competition acceptance and a satisfying campaign/endgame contract |
| N-04 Regional customers | Two regions, six markets, finite outside books, local demand mixes, product fit, persistent service goodwill; opt-in conserved household counts and segment-owned deposit balances; v8.11 regional arrivals/departures replenish or contract outside household/savings supply at month-end | Human calibration of external-flow rates; cross-selling, richer firm/household economy, adjacency and fuller entry economics |
| N-05 Branches/departments | Office models, local upgrades/closure, capacity/contribution; commercial service reservations/vendors; basic service delegation; retail staffing planner; opt-in specialists with persistent skill, paid training and premium payroll | Leaders, facility conversion/condition, fuller department ownership and broader operating budgets; human acceptance of specialist tradeoffs |
| N-06 Products/cohorts | Simultaneous retail offers, deployments, account books, promotional/term funding, amortizing loan cohorts and funding covenants; segment-owned deposit accounts and term-maturity exits; household retention; opt-in delayed delinquency, non-accrual and capacity-constrained collections; v8.9 in-house/licensed retail development, local segment sales and paid retirement preserving account promises | Authored product families and configurable terms, full lifecycle/cross-selling, treasury stress tooling, borrower/collateral detail and allowance accounting; human credit-policy acceptance |
| N-07 Research/deployment | Open capabilities, recurring capped research, milestone limits, cross-capability service applications with build/partner routes; retail in-house versus vendor delivery with research gates and recurring costs | Wider capability web, more business/region deployments and validated competing development paths |
| N-08 Relationships/advertising | Priced renewable mandates, named client preferences, delivery history, bounded retention advantage, targeted contract advertising; v8.10 local retail campaign budgets, decaying audience/offer awareness and measured assisted intake | Delayed application/activation queues, cross-sell and lifetime-value attribution, richer channel choices and human balance acceptance |
| N-09 Group/subsidiaries | Not implemented as a reconciled financial group | Holding company, insurance agency, brokerage/wealth, segregated client assets and consolidation |
| N-10 Equity/M&A | Existing competitor book acquisitions are not company-equity ownership | Fictional company shares, bounded clearing, financed control deals, defense and integration |
| N-11 National management | Legacy 12-market scope exists; current deep pilot remains six markets | Authored national regions, institutions, regional shocks, managers/templates and scalable progression |
| N-12 Command experience | Workspace tabs, operating previews, map and targeted collapsible tools; separate Products development/targeting views and non-sticky tablet navigation for v8.9 | Further Operations decluttering, stronger strategic navigation, integrated group/national drilldown and scale/accessibility QA |
| N-13 National validation | Continuous automated debug/balance checks, local browser QA and relay simulations | Real two-PC, paired-seat and multi-session human acceptance of the national game |
| N-14 Underwriting | Not implemented | Insurance underwriting/reserves/claims/reinsurance after group and national acceptance |

## Next implementation order

The v8.12 follow-up adds a bounded N-06/N-08 **existing-customer product switching**
slice: better-fit offers consume non-retention Retail time, move eligible owned
balances, preserve guarantees and expose one-time/ongoing cost tradeoffs in
Products. It is not the complete cross-sell or onboarding funnel. Configurable
terms, multiple-product ownership, application queues and reconciled subsidiaries
remain ahead. The six-market pilot and human validation limits are unchanged.

Multiplayer acceptance interrupted the architecture sequence for a focused repair: a shared pre-game identity/readiness lobby and truthful idle Repository Link status. That patch is separately published in PR #10, not automatically merged. It is not a new blueprint phase or proof of physical two-computer acceptance. See [release status](release-status.md) for checks and remaining limits.

The approved [four-step architecture batch](architecture.md) is implemented: separate multiplayer delivery, explicit monthly/project settlement, consolidated AI/policy validation, and modular source with a reproducible portable build. This batch removes 53 runtime replacement layers plus one redundant API assignment; it follows the earlier shared-project and creation/import work. Other shared contexts and feature/UI adapters remain documented debt. These stabilization batches do not advance a gameplay package or complete N-00–N-14.

1. Validate the N-05 specialist slice: four roles, recurring department training ceilings and a protected cash reserve, with role-specific capacity and next-month skill gains. The new Workforce workspace is separate from Operations; v8.5 is opt-in for new campaigns and requires both peers to update. Existing saves retain their rules. Full department operating budgets and leaders are not yet implemented.
2. N-04/N-06: v8.6 conserves household counts and links retention time to acquisition capacity, goodwill and real outflows. The v8.7 credit slice adds retained origination risk, 30/60/90+ day aging, non-accrual, explicit recoveries/losses and a collections versus new-lending staffing mandate. Its separate Credit workspace exposes policy tradeoffs and actuals. The v8.8 slice now assigns deposit cohorts to segments, conserves their balances across institutions, charges segment/product costs, and pays departed customers' locked savings at maturity. Customers separates Service & retention from Deposit accounts. The v8.9 slice adds a Products workspace, in-house versus licensed rollouts, segment/market sales instructions, and paid retirement with existing guarantees and servicing preserved. Validate these rules before expanding product families. Counts and financial balances remain aggregate resources, not completed cross-selling or individual household finance. Collections is not an individual-borrower negotiation, collateral or allowance system.
3. N-07/N-08: the v8.10 attribution-first slice now ties local campaign spending to audience/offer awareness, staffing and observed ordinary intake without growing market quotas. A final v8.9+ AI cash pass now protects announced executive-call costs and operating reserves after all planners. Validate these together, then add configurable product terms and application/onboarding queues. Assisted intake is not measured causal growth or a complete acquisition/retention funnel; the recovery follow-up now exposes known executive expense, postponement/staffing tradeoffs and draft-only staging/undo in Overview. Validate recovery and sustained rivalry before adding map content.
4. N-09/N-10: reconciled service subsidiaries, then shares and deliberate control transactions.
5. N-11–N-13: national content, delegated regional management, integrated UI and human release acceptance. N-14 follows separately.

No trustworthy completion percentage is assigned: the later group/nation packages are substantially larger than a single UI or mechanics slice. Current simulation activity does not prove enjoyable endgame pacing.

The preceding N-04 slice is v8.11 Regional demand preview, published separately
in PR #17 on `feat/regional-demand` after product/recovery PR #16. External
arrivals and departures settle once at month-end through outside institutions;
current bank quotes and acquisition quotas remain unchanged. It directly addresses
exhausted late-game outside pools, but does not repair concentration by fiat or
complete N-04. Review the current release entry for verification; keep old rules,
the new pilot's calibration and eventual national expansion distinct.

The current v8.12 slice is on `feat/relationship-offers`, following that branch.
Before expanding the offer system, validate actual retention value against its
conversion cost, recurring product cost and diverted sales capacity. Early AI
use is weak; later AI use is observed but is not proof of profitable switching.
The next bounded improvement belongs in the existing offer panel: shared
comparisons of the selected offer, a safe Retail reassignment and their combined
effect on closing fit/goodwill and the conditional next retention check. Current
departures occur before switching; forecasts must preserve that timing and
distinguish retained principal from profit. Balance reports also need stronger
flow attribution before changing the rules behind long dominance spells.
Further product families should build on measured customer needs, not just add
more buttons.

See [current release status](release-status.md), [earlier staffing planner](archive/service-workforce-status.md) and [prior goodwill batch](archive/customer-relationships-status.md) for exact scope and evidence.
