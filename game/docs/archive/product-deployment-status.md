> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# Product deployment — N-06 / N-07 integration slice
Date: 2026-09-05

## What changed
New opt-in Regional Rivalry pilots now distinguish capability research, product deployment, and opening sales.

| Offer | Research prerequisite | Base deployment expense | Base duration | Execution load |
| --- | --- | --- | --- | --- |
| Rewards Checking | Branch Network tier 1 ($280K cumulative research) | $180K | 3 cycles | 2 |
| High-Yield Savings | Digital Platform tier 1 ($320K cumulative research) | $220K | 3 cycles | 2 |

Research remains incremental, limited by existing per-cycle absorption and capital-safe spending. A milestone reached this turn cannot unlock a same-turn deployment. Use Strategy to fund research, then Operations > Operating Initiatives to deploy. Completion enables sales in the next planning cycle; it neither creates deposits nor automatically opens the offer. Essential Banking is available from the start.

Deployment uses the existing shared execution queue: staffing shortages stall progress, projects compete with branch work, and operations capability can reduce duration/cost under existing rules. Duration above is a base work requirement, not a guaranteed calendar finish. Cash and capital limits include the expense. There is no repeat purchase after completion.

Opening and closing deployed offers still uses the previous retail mix controls. Existing deposit balances, acquired contracts, promotional guarantees, term locks, and ongoing servicing are preserved. Deployed-but-closed products incur no open-offer platform surcharge. Rewards and High-Yield retain their $12K/$10K monthly platform charges when open.

The AI now respects locked products and can fund/deploy an institutional specialty when profitable and within existing spending and capacity limits. Its specialization preference is simple and seat-based, not a fully strategic product-selection AI.

## Compatibility and multiplayer
New rule flag: productDeploymentVersion:1. Prior saves and their rematches keep prior rules; they are not silently upgraded. Start a new opt-in pilot to use deployment.
Pilot protocol support is now 9; both multiplayer clients must use the updated HTML. GitHub recovery logic remains intact. No live GitHub writes, commit, push, package rebuild, or physical two-computer test was performed.

## Current verification
BRANCH_WARS.html SHA-256:
08768673fbf4d8a7a078bcb711b9afa5f465d70a9c4102498906fdf633788dd1

- product_deployment.test.js: prerequisite and same-turn bypass rejection, staffing/capacity limits, $180K budget quote, stalled queue, completion without automatic sales, recurring charges only when open, exact in-flight save/resume, privacy, invalid save rejection, and old/new rematches. Four AI campaigns ran 80 turns each (320 total); each bank deployed its preferred specialty. All remained active at cycle 81. Largest public view: 436,515 bytes.
- retail_lifecycle.test.js: 323 turns with the prior deployment-free rules explicitly pinned; deposit balances and economic outcomes match the previous batch. The same early receivership warning remains in those older-rule scenarios.
- engine.test.js: 48 long-run campaigns plus validation, migration, rematch, direct-link, and UI contracts. This caught and prompted repair of an older-save case with no projects array.
- save_integrity, accounting_persistence, and determinism tests passed.
- GitHub resilience passed on final source: 12 simulated engine turns, 61 accepted writes, eight lost responses. Transport tests also passed before the final UI/legacy-save guard edits.
- Browser skill QA: pilot creation/resume, disabled undeployed offers, prerequisite/cost text, research unlock guidance, spending feedback, and a live research-funded turn. $250K research persisted, $30K remained to the milestone, and sales stayed locked. No warning/error logs or horizontal overflow at 1280px. Full deployment timing was verified in the engine harness, not clicked through end-to-end in the browser.
- New suite registered in capture_baseline.js. Full baseline runner was not executed this batch.

## Limits and next work
This is a bounded integration slice, not completion of N-06 or N-07. It gates two existing offers; it does not yet add product variants, segmented customer demand, a separate development department, product retirement/migration projects, or a richer research graph.

The four AI runs are reliability evidence, not proof of strategic fairness or long-session fun. Deployment adds meaningful shared-capacity and spending choices but also delays access; human playtesting must check that it does not feel like busywork.

Next recommended batch: persistent customer contracts with renewal contests and targeted advertising, so competition continues in mature markets. Then expand product variants and cross-capability research unlocks around those customer needs. Nationwide geography, subsidiaries, insurance/brokerage, and shares remain later blueprint packages.
