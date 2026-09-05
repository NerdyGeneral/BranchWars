# Retail offer lifecycle — partial N-06
Date: 2026-09-05

## Delivered
New opt-in pilot campaigns can sell Essential Checking, Rewards Checking, and High-Yield Savings simultaneously. Operations > Retail Offer Mix sets each offer's relative sales emphasis from 0 (closed) to 4 (priority). At least one offer must remain open. Weights divide new acquisition; they do not multiply staffing or market demand.

Closing an offer stops new sales without relabeling existing balances. Existing checking balances remain serviced. High-yield guarantees retain their remaining quoted periods, then closed offers roll into the highest-emphasis open offer. Promotional savings remain withdrawable; existing locked term-deposit protections remain separate. Acquisitions preserve the seller's actual deposit contracts.

Each open Rewards offer costs $12,000 per month in platform support; High-Yield costs $10,000; Essential adds no platform surcharge. Existing balance servicing still costs money after sales close. The product book shows balances, interest, fees, servicing including platform cost, and net funding cost. This is not product profit: allocated asset earnings and shared overhead are not included. Forecasts include these charges.

## Compatibility
The new retailLifecycleVersion:1 flag requires a new opt-in pilot. Older saves are not silently upgraded, and rematches preserve their rules. Multiplayer pilot protocol support is now 8: both friends must use the updated HTML. GitHub recovery behavior from the preceding batch is retained.

## Verification
Final BRANCH_WARS.html SHA-256:
fd63291527dee48746eb5eb570405103ead6d947463613837c132676530b6056

- New retail lifecycle suite passed 323 simulated turns across four campaigns. It checks mix validation, balance conservation, accounting, previews, contract preservation, acquisition transfers, privacy, save/resume, and compatibility. Largest tested public state: 462,557 bytes.
- Final deposit-product compatibility suite passed 595 simulated turns.
- Engine suite passed, including 48 long-run campaigns.
- GitHub fault-recovery suite passed against the final source: 12 simulated real-engine turns, 61 accepted writes, eight accepted-write/lost-response cases. No live GitHub credentials or remote writes were used.
- Transport and accounting-persistence suites passed against the final source.
- Term-funding compatibility passed 484 turns with the preceding rules explicitly selected. Save-integrity and determinism suites also passed before final UI-only changes.
- Live browser: opened a mixed offer, observed its forecast cost, resolved a turn, reloaded/resumed, and inspected the product book at 1280px. No page overflow or browser warning/error logs were observed.
- The new suite is registered in capture_baseline.js. The entire baseline runner was not rerun this batch.

## Balance warning
Two of the four new mixed-versus-single-offer campaigns ended in receivership around cycles 40–41; the other two reached cycle 122 active. Early failure was not confined to the mixed-offer bank. This small sample does not establish fairness, optimal AI, fun, or adequate campaign length. Expanded offerings are a cost/growth trade-off, not a free bonus.

## Still missing / next bounded batch
N-06 is partial, not complete. This slice does not add product development projects, deployment capacity, launch fees, full customer segmentation, or a migration/retirement program for checking balances. Next, tie product development and rollout to research and departmental capacity, then deepen credit servicing/collections and renewable customer contracts. National management, subsidiaries, and securities ownership remain separate later work.

No commit, push, distribution rebuild, or physical two-computer acceptance was performed this batch.
