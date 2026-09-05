# Credit Lifecycle — N-06 first product/cohort slice

Follow-up: FUNDING_COVENANTS_STATUS.md records the next funding/recovery batch. New pilots now also include fundingCovenantVersion=1 and handshake capability 5. The details below document the preceding credit-lifecycle build.

Implemented locally September 4, 2026 (test report timestamps are UTC September 5). This is a partial N-06 delivery, not completion of the unified blueprint or a balanced national release. No commit or push.

## Play and compatibility

Start a NEW campaign with **Regional Rivalry pilot** checked. New pilots include creditLifecycleVersion=1, layered on marketEconomyVersion=1, regionalEconomyVersion=1 and campaignRulesVersion=1. Existing saves without the credit flag retain their original rules. Rematches preserve the originating version. Internal tests can request creditLifecycleVersion=0 to retain the preceding market economy.

Both linked players need this HTML. The pilot handshake capability is now 4 for LAN, direct and repository connections. No historical loan terms are fabricated for old imported saves.

## Delivered

- A local loan-cohort book reconciled to each market's loan assets and the bank's accounting book.
- Straight-line monthly principal repayments: cash increases and loan assets decrease equally. Repayment does not create equity or earnings.
- New mortgage production amortizes over 120 turns, middle-market production over 48, consumer production over 24. Monthly turns are game months.
- Opening loans are explicitly staggered into 12/24/36/48-month remaining terms. This is a starting-scenario assumption, not a realistic full mortgage amortization model.
- Each cohort retains its product, remaining term, fixed origination yield, and origination product/underwriting risk. Switching to a safe product no longer cleans up the old loan book; switching to a high-yield product no longer reprices old loans.
- Current macro credit conditions, servicing/operations controls and applicable event/business modifiers continue to affect losses.
- Acquisitions transfer the seller's actual loan terms. Liquidity sales, regulatory sales and credit losses reduce surviving cohort principal instead of resetting its age.
- Normal originations, loan opportunities and other loan-asset increases receive current origination terms. Matching cohorts are combined to limit growth.
- The Operations credit panel shows current product balances, remaining-term bands and next scheduled principal. The operating forecast and resolution narrative distinguish repayment from profit.
- Own-bank cohort data is included in public-state forecasts; rival detailed cohorts are not exposed. The causal ledger records a compact credit summary rather than duplicating full cohort histories.

## Verification

Final BRANCH_WARS.html SHA256:
132308e110b7e014a1d4b3bd81d70593b60936857c280d4e3d9b883219e9d694

Primary targeted report:
reports/baselines/credit-lifecycle-2026-09-05T03-31-53-586Z.json

Credit lifecycle tests passed:
- Exact cash/principal/equity accounting and full runoff of the opening book after 48 repayment-only steps.
- Fixed existing-loan income and risk when future product/underwriting choices change.
- New consumer loan terms and loss factor.
- Preservation of acquired remaining terms.
- Forced loan sales and a liquidity-stressed acquisition seller.
- Invalid/unversioned cohort imports, public-state privacy, forecast purity, legacy saves and rematches.
- Four 120-turn AI campaigns plus four paired resume checks: 484 tested turns. Exact continuation after migration.
- Every tested turn reconciled accounting, local principal, regional contribution and causal-ledger validation.
- Largest tested public view: 447,633 bytes; largest cohort book: 727 cohorts.

Current regression gates also passed: engine (48 campaigns), accounting, accounting activities, accounting persistence, bank identity, funding (1,927 turns), determinism, ledger (276 turns), save integrity, transport, regional pilot (1,920 turns), regional operations (808 turns including resume), prior market economy (968 turns), and PowerShell LAN-server health/create/join/relay/idempotency. All script bodies parse. git diff --check passed.

Live browser checks using the computer-use skill:
- New solo pilot opened; Operations panel visually inspected at 1280px width with no horizontal page overflow.
- One month resolved with explicit principal repayment; reload/Continue restored cycle 2 and the same loan/repayment summary.
- Two local browser clients connected through port 8901, with only the host checking the pilot option. Both displayed the new credit panel, submitted simultaneous plans, reached cycle 2 and showed identical resolution text.
- No warning/error logs in the checked solo/host/guest clients.
- Test tabs and temporary loopback server closed afterward.

Not verified: two separate physical computers, fresh live GitHub exchange, mobile layout, full capture_baseline runner, exhaustive paired-seat balance audit, or human campaign enjoyment.

## Balance findings and limitations

All four new-credit audit campaigns remained active at cycle 122. Repayments were material (roughly 44M–63M across both banks over the sampled monthly turns), but this does not establish a satisfying endgame. Three of four outcomes still had a large deposit leader. Do not describe this as fixing snowballing or guaranteeing 120 meaningful turns.

Loans still use a simplified portfolio model: no finite borrower pool, individual delinquency/default/recovery stages, adjustable-rate resets, prepayment decisions, collateral, term extensions or borrower-level pricing. Losses/sales reduce local cohorts proportionally; they do not select individual defaulting borrowers by risk. Interest uses the operating-stage portfolio convention, not daily accrual around every intraturn asset sale.

The new amortization durations are gameplay parameters, not validated banking realism. Customer deposits still use the existing aggregate sensitivity/pricing model; term deposits and repricing cohorts are not implemented. Regional loan-income contribution remains a management allocation by local balances, not exact cohort-level profitability. Emergency borrowing remains insufficiently constrained.

## Recommended next batch

1. Sustained rivalry and funding constraints: constrain emergency borrowing, strengthen economic routes to pressure or rescue a bank, and measure recoveries with paired-seat tests. Avoid arbitrary free catch-up capital.
2. Deposit product lifecycle: term funding, maturity ladders, renewal/runoff decisions and transparent funding-cost projections against this loan book.
3. Finite borrower segments and differentiated origination capacity/pricing, then expand the regional/national map once mature markets remain strategically interesting.

Insurance, brokerage subsidiaries, company share ownership and the full national management layer remain later packages. More map territory alone will not fix the current late-game concentration.
