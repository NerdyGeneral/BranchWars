# Checkpoint59 — qualified company-loan review and paired funding

September 13, 2026. This is scoped implementation evidence, **not a completed campaign lending feature or release certification**.

## Delivered behavior

- One pure queue review uses the actual prepared department, collections, facility and product state. Existing account development or a currently serviced banking agreement qualifies the relationship; ownership alone does not.
- Up to six distinct company offers share remaining physical Lending quarters and the same gross origination capacity used by ordinary lending. Credit-administration coverage and facility throughput still constrain that capacity. A small advance consumes at least one quarter's throughput; unused capacity in that slice is not sold again.
- Current commitments, payables, liquidity reserves, requested bank dividends and an 8% capital safeguard constrain cash-funded offers. Expected parent support is not treated as already received cash. Unsupported terms, stale months and ended games are refused.
- The pure funding stage validates both queues before committing anything, selects one lender per company, and returns paired bank/company books. It creates neither deposits nor ordinary loan cohorts and does not borrow automatically. Both returned bank books and the world must be adopted together by the future campaign adapter.
- Borrowers provisionally prefer more eligible funding, then a lower annual rate, then a longer term. Exact ties rotate across stable bank IDs. Message arrival order is irrelevant. Unsuccessful bids do not retain an origination-capacity reservation.
- Repeating funding on the returned operating-stage state is refused. This transient guard is not yet a complete saved/network exactly-once contract.

These are provisional game choices, not legal or lending advice. No legacy coefficients or balance values were tuned. The ordinary origination formula was extracted into a shared calculation; the unused duplicate formula was removed.

## Verification and fixture boundaries

[Exact-build report](../../output/master-checkpoint59-verification.json): 32 targeted tests passed, plus source architecture/syntax checks with unchanged ceilings. Coverage includes order review, paired funding, loan accounting/trading, arrears/writeoffs, public assessment UI and exact historical Core/Expanded creation, AI, settlement, RNG, views and recovery comparisons against the unchanged checkpoint55 reference.

The order test now develops a real funded operating account through two submitted turns in supported Expanded rules. At that checkpoint it explicitly constructs a version7 credit-world **test fixture**, with no new cash, employees, customers or claims. This is not a permitted migration of an existing campaign. A $10,000 approved advance then moves bank cash to company cash, raises the matching loan/debt, preserves ordinary cohorts, and leaves the other bank's ledger untouched. Invalid second-bank instructions leave both inputs unchanged.

Earlier attempts exposed three test-setup issues: independently advancing account months left department history stale; the newer report schema required explicit zero credit-flow fields; and removing all credit-administration coverage correctly left no origination capacity. The fixture now uses real submitted development and explicit existing staff coverage. Chronological and capacity checks were retained, not weakened to accept the shortcuts.

The inherited borrower-domain stress test still records actual company failures and unpaid lender claims. That is not a full-bank 120/480-month balance certification. Neither the borrower-choice unit test nor the funding-stage replay test substitutes for simulated transport or actual two-computer coverage.

## Exact identity and preservation

- Review artifact: [BRANCH_WARS_creditorders59_review.html](https://github.com/NerdyGeneral/BranchWars/blob/d795660/game/output/BRANCH_WARS_creditorders59_review.html), 190 assembly inputs.
- Artifact SHA-256: `1b4d0a594e964ada574813fb88640c10cde2205c7a777cc5b4377b80d5e3b214`.
- Engine SHA-256: `cce4f9f4694f6dcbfe3387f51563aceb764f9f568425ad9f8f83844c93395328`.
- Normal playable remains checkpoint37: `b4351e85160586e72a63519a1eb2fe6fecdfe9cba1c94cbdd8577231f5c78561`.
- Historical references, previous reports, frozen release packages and manuals were not overwritten. No publication occurred.

## Next integration gate

Connect this stage to authoritative normalized/submitted orders, the monthly coordinator and ordinary lending reservations. Finish operating-deposit cash routing, already-posted income/loss reporting, consolidation, borrower-only pure forecasts without private rival ledgers, same-rule AI, customer-screen staging, and versioned creation/save/recovery/peer validation. Only then enable the playable workflow in new Expanded campaigns. Current source still creates the existing9.27 rules and rejects unsupported credit-world imports.
