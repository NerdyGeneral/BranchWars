# Checkpoint58 — bank-side company loan attribution

September 13, 2026. Company lending remains in progress, not enabled for player
orders or saved campaigns. This checkpoint connects the prior borrower domain
to the actual bank ledger and existing ordinary loan routines.

## Outcome

- A named advance updates one bank loan asset and the correct local market.
  It does not fabricate an ordinary cohort or change deposits, staff or equity.
- A small owner claim projection reconciles exactly to the company register.
  Borrower terms remain authoritative there; the owner projection contains only
  company identity, market, principal and interest receivable. It is not a new
  feature-selection map or an independent lending policy.
- Applying settlement replays only valid paired credit postings from the exact
  bank checkpoint. Unrelated income, borrowing and mismatched asset changes fail
  without mutating the caller. Reapplying an identical result is idempotent.
- Ordinary amortization and collections operate on ordinary cohorts only.
  Company principal participates in bank/local totals and departmental credit
  and risk workload, without double coupons, repayments or free staffing.
- Generic funding sales and bulk portfolio acquisition quotes use the ordinary
  transferable balance. They cannot silently sell part of an identified company
  claim and leave its borrower owing a different lender. Liquidity shortfalls
  remain explicit emergency borrowing under the existing funding rules.
- Facility investment scenarios retain company-credit exposure in their capital
  requirement rather than treating it as spare lending headroom. They do not yet
  project the company's future payments.
- Saves and public views still refuse the unintegrated company-credit fields.
  There is no new campaign marker, automatic upgrade or peer enablement yet.

## Verified on the exact review build

[Raw verification report](../../output/master-checkpoint58-verification.json):
25 targeted tests pass, including six new bank integration checks and the prior
credit/trading/UI/exact-legacy checks. Source architecture passes with unchanged
ceilings. The bank tests execute actual lexical engine functions, not replacement
accounting or repayment stubs.

The new checks cover funded local attribution; no fabricated ordinary cohorts;
ordinary repayment/collection exclusion; twelve months of simultaneous ordinary
amortization and real borrower trading; forced liquidity sales; bulk acquisition
limits; exact/idempotent bank projections; malformed or stale postings; and
departmental loan workload without new employees. Core and supported historical
Expanded rules still compare exactly to the unchanged checkpoint55 reference for
creation, AI, submitted resolution, RNG, public state and save recovery.

The retained120-month borrower stress case from checkpoint57 still reconciles
actual bank losses. This is not a120-month full-bank strategy test, and the
funding stress fixture is not evidence of a viable human strategy.

## Artifact

[Checkpoint58 review HTML](https://github.com/NerdyGeneral/BranchWars/blob/d795660/game/output/BRANCH_WARS_creditbank58_review.html):
`c364cf4266df44e46ba6266aa6455e0e550e1d811873c752215c7aa4e6dc838d`.
Engine: `7b90e5e192d59097d8d88d433a97200af77bacc99f40f03a77fa808837bdf6fa`.
189 source inputs. The normal playable remains
`b4351e85160586e72a63519a1eb2fe6fecdfe9cba1c94cbdd8577231f5c78561`.
No frozen package, previous artifact or reference build was overwritten. No push.

## Next required integration

Finish the reviewed lending instruction: qualified relationship, product fit,
cash/capital protection and a reservation within the **same** origination budget
as ordinary lending. Apply the bank/borrower coordinator at the ordered monthly
boundary, reconcile cash located in company operating deposits, and include loan
income/losses in operating and consolidated reports without reposting them.
Wire owner-safe previews, loan-book summaries, AI, strict saved rules and live
peer validation; test closure, recovery and asset-ownership continuity end to end.
Any transfer of an identified claim must explicitly preserve its actual owner;
the current bulk-sale exclusion is not proof of that broader acceptance gate.

Do not enable a UI loan button or select a new campaign version until these
pieces exist. Final release/balance/browser/multiplayer/manual/package gates
remain those in the master objective, not this targeted suite.
