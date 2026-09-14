# Checkpoint61 — company-loan cash location and internal group claims

September 13, 2026. Scoped adapter verification, not playable company-loan enablement or a full release pass.

## Outcome

Actual advances and borrower trading now relocate company cash into existing operating accounts before it is available for ordinary bank spending. The same financial relocation code runs at the normal account-settlement stage. Early relocation does not repeat development, competitive acquisition or servicing. Opening ownership/balances survive until the monthly report; successful closing removes the temporary opening record.

A $10,000 advance to a company with an existing operating account places $5,000 there under the unchanged half-cash rule. If the lender owns the account, its net cash falls $5,000 and its deposit liability rises $5,000. If the account is at the rival, the lender pays $10,000 and that rival receives $5,000 against an equal liability. Company cash already includes its bank claim: aggregate physical cash subtracts that claim rather than counting it twice. Companies without an operating account receive no new deposit relationship automatically.

Public-only owner forecasts use the same cash-location calculation and match actual loan payment/deposit entries. Consolidation cancels the controlled company's loan principal and accrued interest against the owning bank's corresponding claims. It does not transfer cash or forgive the actual debt. Full ownership's internal interest income/expense cancels; outside-company and other-bank obligations remain external.

No growth rates, borrowing prices, qualification rules, servicing quotas, takeover rules or support safeguards were tuned.

## Verification

[Exact artifact and test report](../../output/master-checkpoint61-verification.json): 31 passing test results across two commands, plus source architecture/syntax checks. Source assembly and the separate [review artifact](../../output/BRANCH_WARS_creditlocations61_review.html) match SHA-256 `b6bbcfcf1ba2518c5aa74fb701d80985a56874068e7540de4572e399af2a6ea7`; 190 assembly inputs. Engine SHA-256: `6fcd14a997ca139b07b8b59bc55833df89d31d2d7297346105134c4515131aa4`.

- Loan order, borrower forecast and exact historical Core/Expanded boundary checks pass.
- Frozen Group10 comparison covers four economies and 12 total resolved months, plus creation, human/AI instructions, RNG, half-ready recovery, private views and rematch. No goldens changed.
- New tests establish the account through two actual paid campaign turns, then use an explicit credit-world fixture. This is not a supported save migration.
- Same-bank/rival-bank lending, no-account lending, unchanged-cash idempotence, owner-only forecast parity, monthly opening/closing reports and duplicate closing refusal pass.
- Closed-company deposit release is a targeted closure-boundary fixture, not a new full-bankruptcy campaign test.
- Internal principal/interest elimination, strict malformed amounts, combined fee/interest limits and wholly owned group earnings checks pass; existing paid-control campaign tests also pass.

Test summaries were captured from terminal results; the report records exact test/source hashes. The normal checkpoint37 playable retained its protected hash. No release package, manual, old reference build or remote state was replaced.

## Required next integration

The funding caller must atomically adopt `world`, `players`, `marketEconomy`, `commercialAccounts` and `_companyCreditAccountOpening`, retaining actual work reservations through ordinary production. The opening marker is settlement-only, not a new saved feature or recoverable campaign checkpoint.

Finish the supported new-campaign version, submitted orders, creation/save/view validation, preserved ownership through failure/transfers, customer controls, same-rule AI and peer/recovery contract. Existing campaigns still reject the unfinished credit world. Current targeted tests do not establish full Windows, long-campaign balance, multiplayer or browser acceptance.
