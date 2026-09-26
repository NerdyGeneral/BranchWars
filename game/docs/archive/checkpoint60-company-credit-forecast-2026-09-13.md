# Checkpoint60 — company-credit forecasts and monthly earnings

September 13, 2026. Scoped integration evidence; **company lending is not yet enabled in supported campaigns**.

## Delivered behavior

- Borrower repayment and recovery calculations now emit the lender postings used by both actual settlement and forecasts. The actual path still requires and validates real bank ledgers. The forecast path accepts public company statements, demand and service assumptions; it neither reads private rival ledgers nor invents replacement bank balances.
- Owner forecasts apply only that owner's emitted postings to an owner copy. Loan assets, receivables, cash and equity reconcile with the borrower register. Public forecasts refuse private-bank options and malformed metadata.
- The monthly company adapter now atomically adopts the updated world and both real bank books, then reserves each owner's loan cash/income explanation before ordinary operations.
- The operating report adds already-posted company interest, principal repayment, liquidation recovery and losses without posting them again. Duplicate reporting is refused. Completed actual/forecast stages clear their corresponding temporary state.
- The complete prepared operating forecast includes company coupons and repayments. Its commercial business-loan total now includes named-company claims, with a separate named-loan balance/change in the read model; ordinary loan cohorts remain separate.

No rates, repayment arithmetic, creditor priorities or old-campaign coefficients were tuned. This is an integration/forecast repair, not a new source of growth or income.

## Verification

[Exact-build report](../../output/master-checkpoint60-verification.json): 39 targeted tests passed, plus source architecture/syntax checks with unchanged ceilings.

The seven new tests cover:

1. Twenty-four normal-demand months comparing public-only forecasts, actual lender books and the preserved checkpoint59 implementation.
2. Twenty-four low-demand months with the same comparisons, exercising actual arrears, liquidation recovery and unpaid loan writeoffs.
3. Invalid metadata, refusal of private-bank forecast options, and mandatory actual bank books for real settlement.
4. The actual monthly company adapter, its duplicate guard, and a report bridge that does not post cash/equity again.
5. Owner-only operating preparation, immutable inputs and duplicate forecast preparation.
6. The complete prepared operating forecast, including a $200,000 note's $1,333 first-month interest, $4,167 scheduled principal, and $195,833 remaining named business-loan balance.
7. Actual monthly banking operations: company interest appears once in the journal, ordinary coupon income remains distinct, the change in retained earnings reconciles to reported profit after identified outside losses, and settlement temporary fields are cleared.

The company-world/owner fixtures remain explicit test inputs, not supported save upgrades. The complete forecast test supplies the same public market/company statement shapes used by existing projections; passing it does not prove the unfinished versioned public-state/network adapter. The two 24-month comparisons are company/lender integration tests, not whole-bank long-campaign balance acceptance. Existing Core/Expanded exact creation, AI, resolution, RNG, view and recovery comparisons still pass against the unchanged checkpoint55 baseline.

Initial test harness failures were corrected without changing simulation rules: the old reference cannot export newly introduced helpers, and a raw bank object lacks the public market snapshot required by the established forecast entry point. The final tests use the actual old/new helper sets and explicit owner-view statements.

## Exact identity and preservation

- [Review HTML](https://github.com/NerdyGeneral/BranchWars/blob/d795660/game/output/BRANCH_WARS_creditforecast60_review.html), 190 assembly inputs.
- Artifact SHA-256: `0788b9570739bafd7db1725e4406f72d0fc383ecc91dff359da68fde10b5ec90`.
- Engine SHA-256: `f610e77f746047c0de87490bdb62f85b45a484f90687d2d37f0e96293ce47190`.
- Normal playable remains checkpoint37: `b4351e85160586e72a63519a1eb2fe6fecdfe9cba1c94cbdd8577231f5c78561`.
- Checkpoint59 was copied byte-for-byte to [an immutable test reference](../../reports/reference-builds/BRANCH_WARS_creditorders59_1b4d0a59.html); its SHA-256 remains `1b4d0a594e964ada574813fb88640c10cde2205c7a777cc5b4377b80d5e3b214`. The test and capture manifest explicitly retain it. No earlier reference was regenerated or removed.
- Frozen releases/manuals and normal playable were not overwritten. No GitHub publication occurred.

## Remaining gate

Connect qualified orders to submitted plans and the correct funding stage; reconcile company cash held as operating deposits and internal company-loan balances in consolidation; finish versioned creation, validation, private projections, recovery and all three simulated transports; add same-rule AI and customer-screen staging. Keep old campaigns fixed and unsupported credit-world imports rejected until that integrated gate passes. Final balance/performance, full Windows release checks, browser/human acceptance, manual and packaging remain open.
