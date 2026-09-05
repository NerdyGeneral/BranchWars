> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# Regional Operations — first slice of N-04 / N-05

Follow-up: newly created pilots now include the Market Economy foundation. See market-economy-status.md for current conserved local books, supporting competitors, regional reporting, evidence and balance limitations. The remainder below records the preceding version, retained by existing saves.

Implemented locally September 4, 2026. This is a partial batch, not completion of N-04 or N-05. No commit or push.

## Play
Start a NEW campaign with the Regional Rivalry pilot checkbox checked. The host selects this for a linked game. Both players must use the updated HTML. Existing pilot saves without regionalEconomyVersion retain their previous rules; no silent economic migration. Rematches retain their originating regional version.

New pilot saves use regionalEconomyVersion=1 and each bank's regionalOperations.version=1. Invalid upgrade levels and inconsistent versioning are rejected. Own upgrade data is included in the owner's public view; rival internal upgrade state is not exposed. The handshake capability was bumped to 2 to reject old pilot clients.

## Delivered
- Six differentiated locations: entry-cost multiplier, rent multiplier, deposit and loan onboarding capacity. Sector names describe those profiles; they are not sector-specific loan books or macro exposure models.
- Full-service, commercial and digital offices contribute different throughput. Staff, products and policies still generate prospective production, now capped by network onboarding capacity. Central servicing contributes 100K monthly capacity for deposits and loans independently.
- Relationship Service Upgrade: 140K base, two cycles, two levels per market. Each level adds 15% of base local deposit capacity, 0.8 competitive deposit pull while an office exists, and 2K monthly expense per office.
- Branch Workflow Automation: 180K base, three cycles, two levels per market. Each level removes 12% of rent-adjusted base facility expense.
- Consolidate One Office: 40K base, one cycle. Removes the last-opened office, its recurring cost and capacity; no sale proceeds or customer deposit disappearance. Closing the final office removes its market upgrades.
- Existing capability discounts, execution speed, cash/equity expense postings and bank-wide operating efficiency still apply. Upgrades finish after operations and affect subsequent operations.
- One construction/upgrade/closure at a time per market. Failed upgrade completion after loss of the office is explicitly reported, without refunding the original expense.
- New entry/re-entry earns no artificial minimum market share. Eight-cycle establishment protection replaces the old four-cycle window.
- Three consecutive exposed cycles below 12% influence produce a warning; six close ONE office, not every office. Establishment protection resets the warning streak. No permanent exclusion, free rival office or conquest dividend.
- AI filters overlapping office work, quotes the selected market and considers affordable upgrades while retaining capital reserves. It does not yet optimize a full geographic profitability model.
- Collapsible Branch Operating Network under Markets shows office costs, capacities, upgrade levels and full-service entry prices. Project cards in Operations show cost/capacity changes on completion. The selected market controls both displayed and validated project prices.
- Legacy project catalogue test retains 18 non-regional definitions; three gated new definitions are counted separately.

## Important economic boundaries
This is NOT a finite customer-pool implementation. Monthly throughput renews; accumulated customers, relationships and book balances still use the existing bank-level simulation. Opportunities and acquisitions are separate from organic throughput and are not capped by it. Customer segments, supporting banks/credit unions, conserved regional deposits and local loan vintages remain absent.

Facility expense is NOT regional profit. Shared payroll, income, funding costs and credit losses have not been allocated to markets. The UI labels this explicitly instead of manufacturing local P&L from influence percentages.

Initial Downtown/Northside locations have distinct economics. This has not passed a paired-seat fairness audit. All eight sampled AI campaigns remained active after 101 resolved turns each, so the test establishes neither satisfying endings nor enjoyable campaign length. Withdrawal still occurred 66 times across the sampled primary loops; this is not a matched comparison against the older pilot.

## Verification
Targeted report: ../../reports/baselines/regional-operations-2026-09-05T02-28-31-839Z.json
HTML SHA256: 95734e91ae5ed63899529920e066179afbc4a66cb7c6f066b11d24743423b8ce

New tests cover location quotes, upgrade effects, preview purity, real paid service-project completion, paid closure, overlap rejection, warning/withdrawal timing, no free re-entry influence, own-view privacy, malformed import rejection, legacy version preservation and deterministic save continuation. Eight seeded campaigns: 800 main-loop turns plus eight resume-comparison turns; reconciled books and causal ledgers checked.

Separately passed during this implementation: engine (48 campaigns), original pilot (1,920 turns), funding (1,927 turns), accounting foundation/activity/persistence, bank identity, determinism, causal ledger, save integrity, transport and Windows LAN health/create/join/relay/deduplication. The baseline runner now includes the new suite; the complete baseline/800-game balance runner was not run.

Computer-use browser QA on isolated loopback port 8899:
- New pilot launch and reload/continue worked.
- A service upgrade was paid for, advanced and completed through two ordinary solo turns.
- Updated project cards displayed completion effects.
- Changing focus to County Seat showed the correct 476K full-service quote and blocked upgrades where no office existed.
- The economics table was visually inspected, then made collapsed by default to avoid pushing the map down.
- No desktop horizontal overflow in the tested viewport; no browser warning/error logs in the inspected session.

Not performed: physical two-PC play, live GitHub room acceptance, mobile visual sweep, comprehensive human balance/playtime testing.

## Remaining in this batch
1. Authoritative market/segment customer pools, including opening allocation, organic recruitment, runoff, both-bank transfers, opportunities and acquisitions.
2. Supporting institutions that own real customer balances and respond to competitors.
3. Reconciled local income/funding/credit attribution, then regional P&L and AI geographic planning.
4. Further branch formats/conversion and department budgets/delegation.
5. Matched balance/churn tests and human competitive playtesting.

Then continue N-06 product/cohort depth and N-07 research/deployment. Subsidiaries and equity ownership depend on those economic foundations.
