# Checkpoint63 — contextual company loans and conditional forecasts

## Usable outcome

Explicit9.28 campaigns now have a working-capital offer ticket on the existing company/customer inspector. The player edits whole-dollar principal, annual rate, term and underwriting standard, reviews the entire loan queue, then stages or removes an offer. Discarding local edits preserves an already-staged offer. Current principal, unpaid interest, remaining payments, lender and credit status appear beside the company. Existing9.27 and historical campaigns keep the assessment-only screen; there is no silent upgrade or extra setup checkbox.

Review presents cash exchanged for loan assets separately from expenses, protected liquidity/capital room, shared underwriting time and remaining ordinary origination capacity. Borrower payment/coverage details explain the chosen standard. The monthly plan names loan changes, warns about unstaged forms and blocks invalid queued commitments with a link to the relevant customer. Stale draft, hotseat, reconnect and locked-turn handlers cannot stage an old offer.

## Shared forecast and accounting contract

The pure borrower origination step emits the same lender posting used by actual funding. Conditional forecasts apply only the owner's real ledger to a copy of public company statements; no rival bank book is fabricated. The comparison shows the same draft with no new offers versus all reviewed offers funding. It includes the named asset, actual company cash/debt, located operating deposits, coupons, repayments and reduced ordinary lending capacity. Principal is not charged as an expense. Other operating-forecast callers route queued loans through this same calculation and receive an explicit uncertainty description.

The all-funded scenario is not a prediction that the player wins every borrower. Rival offers, executive events and other stated operating-forecast exclusions remain unknown. Losing offers consume no origination work at actual settlement. Existing economic values, underwriting thresholds, borrower-choice ordering and historical goldens were not tuned.

## Exact artifact and verification

- Review artifact: [BRANCH_WARS_creditdesk63_review.html](../../output/BRANCH_WARS_creditdesk63_review.html), 192 assembly inputs.
- Artifact SHA-256: `ec9a84e55a443f9c144fd14b57fc86fa32adb3df9aab5607ae4cb839b6373db4`.
- Engine SHA-256: `31b1e3e5937e9e6c9a4dab5059fe3facbe58e4352e28499d23ecdca6b60bc664`.
- [Verification record](../../output/master-checkpoint63-verification.json): 41 targeted tests pass across credit domain, forecasts, campaign, inspector UI, orders, historical Core/Expanded boundaries and deposit location. Seven existing monthly-plan checks, source architecture/syntax and all three simulated transports also pass. The report records source input hashes and checks that they remain unchanged.
- Exact historical comparisons preserve prior origination results across company/term cases, and creation, AI, settlement, RNG, views and recovery for supported old campaign rules. Conditional owner forecasts match actual paired funding followed by the same operating calculation; tests also verify no mutation and repeatability. These are bounded cases, not universal correctness.
- [Early-campaign forecast timing](../../output/master-checkpoint63-forecast-timing.json): ten identical month3 single-offer calculations in Node VM, median101.4 ms and maximum106.3 ms; state/RNG unchanged and results identical. This is not a browser or mature-campaign performance benchmark.

Two development test-wiring errors were caught before the final gate: the initial forecast test lacked its public API export, and expanding an existing export line prevented older tests from installing their internal inspection hooks (seven order tests failed). The API was added separately, restoring those original hooks without weakening assertions or changing expected results. A report-runner quoting error failed before execution and created no artifact; the guarded retry produced the record above.

## Remaining gates and preservation

Ordinary Expanded creation remains9.27. Same-rule lending AI, terminal/bank-failure loan ownership acceptance and integrated enablement remain next; broader viable human/AI strategies,120/480-month balance, exact final Windows/package gates, browser layouts, manual/PDF and final local release are still required. A real two-computer playtest and subjective enjoyment remain separate human acceptance items. No new browser acceptance was possible in this batch; prior review-artifact access was denied.

The normal playable HTML remains `b4351e85160586e72a63519a1eb2fe6fecdfe9cba1c94cbdd8577231f5c78561`. Frozen packages, manuals, reference builds, saves and existing contributor changes are preserved. No commit, push, publication, deletion, release overwrite, balance tuning or goal-completion claim is part of this checkpoint.
