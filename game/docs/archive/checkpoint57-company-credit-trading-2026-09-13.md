# Checkpoint57 — company credit connected to borrower trading

September 13, 2026. This advances the checkpoint56 assessment/credit foundation;
it does **not** complete player-bank lending or the Expanded release.

## Implemented

- Explicit CompanyFinance version7 creation boundary, with a single retained
  named-company credit register and signed cumulative cash-transfer boundary.
  Existing campaigns remain version6 or earlier; imports reject premature version7.
- Funded advances pair borrower cash/debt with actual lender cash/loan assets.
  The outside creditor retains only its own claim. Bank interest is not counted
  again as supplier receivables or outside-lender income.
- Company sales, operating expenses, existing senior debt and banking services
  settle before bank-loan payments; interest reduces company earnings and unpaid
  loan obligations prevent dividends. Assessments include observed bank debt service.
- Arrears, nonaccrual, cash-funded recovery and paired write-offs feed into real
  company trading and liquidation. Repeat recovery is refused.
- Cash circulation and shareholder routing accept the explicit domain version
  without enabling it in campaigns. No new checkbox, saved campaign marker,
  automatic migration or player funding button was introduced.

## Provisional design correction

The first tested liquidation order paid new bank credit ahead of every supplier.
In the contraction case, this recovered the entire bank claim while suppliers
absorbed losses. These are unsecured working-capital loans: the corrected rule
retains the existing senior creditor, then splits remaining funded cash among
supplier invoices, bank service invoices and bank credit in proportion to claims.
Interest is recovered before principal within the allocated loan recovery.
This is an intentional new-version game rule, not legal guidance. Existing
campaign priority and numerical rules were not changed.

## Exact verification

[Raw commands, output and fingerprints](../../output/master-checkpoint57-verification.json).
All 19 targeted tests passed, plus source architecture with unchanged ceilings.

- Core and historical Expanded creation, independent AI choices, half-ready/full
  resolution, RNG, public views and save recovery compare exactly with the unchanged
  checkpoint55 reference over two submitted months each.
- Healthy company trading repays a $100,000 advance over 48 months, with a replay
  comparison each month. Cash, equity, separate creditor claims, interest, principal
  and earnings reconcile; lender deposit liabilities do not change.
- A 120-month borrower-domain contraction run (demand0.35, two $200,000 advances)
  exercises arrears, dividend stops and actual liquidation. Company0 closes in
  month18: $84,218 loan recovery and $98,531 credit write-off. Company1 closes in
  month17: $93,139 recovery and $98,110 write-off. These are closing claims after
  previous payments/accrual, not percentages of original principal. Every monthly
  bank cash/loan/equity movement reconciles. Aggregate cash is conserved; aggregate
  equity declines only by actual productive-asset haircuts.
- A separately allocated partial recovery retains $1,234 of actual borrower cash
  and writes off only the remaining $98,766 claim; excessive allocation and repeat
  recovery fail. Malformed cash/claim/version boundaries and absent lender books fail.
- The company-inspector assessment remains read-only. No browser acceptance or
  simulated-transport certification of new lending is claimed.

Development failures retained in this account: the initial test harness assumed
CompanyFinance was exported in the public API. The harness now loads the actual
domain sources rather than expanding the public API for a test. The initial
priority experiment and its zero-bank-loss result motivated the explicit rule
correction above; no expected legacy result was regenerated.

## Artifact and preservation

Review HTML: [credittrading57](../../output/BRANCH_WARS_credittrading57_review.html).
SHA-256: `2bc2ca41f6675d2cd0874219fffd7a24847927f27c99cd74e3c5100a4fc43cc2`.
Engine SHA-256: `89574ccfa4801a53f4928cef071169c4fd20329eb6581b6e58dd476b64a5f922`.
188 assembly inputs; source and review bytes match. The normal playable remains
`b4351e85160586e72a63519a1eb2fe6fecdfe9cba1c94cbdd8577231f5c78561`.
Frozen releases, older review builds and historical compatibility references were
not replaced. No publication occurred.

## Remaining acceptance

Connect qualified relationship development, protected capital and the shared
origination/servicing workforce to a real reviewed loan instruction. Integrate
ordinary bank cohorts without duplicate interest, amortization or loan sales;
preserve loan ownership during transfers and bank failure; reconcile company
cash located in deposits and group eliminations. Then enable explicit new saved
rules, compatible peers, same-rule AI, pure forecasts and contextual actions.

This run models company trading and lender ledgers, not complete banks choosing
and operating through a campaign. It does not replace representative120-month
or selected480-month full Expanded balance runs, the full Windows gate, browser
workflow checks, two-computer acceptance, final manual or exportable release.
