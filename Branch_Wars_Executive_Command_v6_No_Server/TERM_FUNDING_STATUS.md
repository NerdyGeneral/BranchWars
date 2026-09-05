# Term funding batch / current blueprint position

Implemented September 4, 2026 (local date). This is a bounded N-06 slice, not completion of N-06 or the national game.

## Build and access
- Game: BRANCH_WARS.html.
- Verified source SHA-256: 222edfcc2d59bdb76f8ebdc6eb9d68388eba4a27d5380f4a08bb9d244ed89099.
- Start a **new Regional Rivalry pilot**, then Operations > Six-month term funding.
- New pilot flag: termFundingVersion: 1. Defaults to subscriptions closed, maturity release.
- Older saves lacking this flag retain their existing deposit rules, including rematches. No forced migration.
- Linked pilot handshake now requires capability 7 on both clients. Both friends need the updated HTML.
- No commit, push, deployment, or distributable-package refresh performed.

## Mechanics and trade-offs
- Offer six-month deposits alongside ordinary retail products. Up to 10% of eligible unguaranteed demand balances converts each operations phase, limited by headroom to 30% of bank deposits. This is simplified customer uptake, not arbitrary cash creation.
- Newly received balances and just-released contracts cannot immediately resubscribe in the same operations phase. Existing promotional savings are not converted while guaranteed.
- Opening quote is 125% of the current high-yield monthly rate, then fixed for six payments. Existing pricing policy and institutional pricing modifier apply to the opening/renewal quote.
- Contracts open in month 1 pay their sixth coupon in month 6, then renew/release before month 7 operations. Changing savings products or closing subscriptions cannot terminate them.
- Renewal is a separate persistent instruction: renew at the then-current six-month quote, or release to the selected current savings product. Closing subscriptions does not override renewal instructions.
- Ordinary withdrawals and rival deposit transfers can only consume unlocked deposits. An acquisition preserves the acquired contract's principal, quote, and remaining payments.
- Renewals and acquired contracts are honored even if the locked share exceeds the new-subscription cap after withdrawals/acquisitions.
- Conversion changes the liability mix, not cash or equity. Interest is an operating expense; locked balances receive the current simplified high-yield servicing/fee assumptions.
- Reporting separates locked terms from promotional savings, shows maturity exposure, and forecasts opening/renewal/release amounts. A release is availability for withdrawal, not an automatic cash payment to every depositor.
- AI uses a bounded profit-sensitive offer/renewal policy. It is not an optimized treasury planner.

## Verification performed this batch
- New term suite: 484 simulated turns, four paired-seat campaigns (two seeds), plus exact six-payment timing, release, renewal, raid/outside-withdrawal protection, acquisition inheritance, preview purity, corrupt saves, legacy/rematch, privacy, accounting and ledger checks.
- All four term campaigns reached cycle 122 without ending. Public-view maximum: 447,826 bytes. This establishes tested continuation, not engaging 120-turn gameplay.
- Deposit-products compatibility suite: 595 turns; funding-covenant compatibility suite: 726 turns.
- Engine suite: 48 long-run campaigns, before the final reporting-only row separation.
- Final-build accounting, activity accounting, persistence, determinism, save-integrity, transport and PowerShell LAN relay tests passed.
- Browser: isolated loopback campaign, offer selection changed projected funding expense/profit, month 1 resolved to month 2, reload/Continue restored $2.40M locked and subscription policy. Final-build panel visually inspected at 1280px, no horizontal overflow or warning/error logs.
- git diff --check passed (line-ending warnings only).
- Not performed: physical two-computer acceptance, live GitHub match, mobile QA, full baseline runner, release-package verification, 5,000-pair balance study, human fun/long-session tests.

## Where we actually are
| Blueprint area | Current position |
|---|---|
| N-00–N-02 foundations | Baselines, deterministic replay, causal ledger and accounting/funding foundations exist; keep regression gates active. |
| N-03 persistent rivalry | Opt-in pilot removes permanent exclusion and automatic score buyouts; institutional failure remains. Human recovery/fun acceptance still outstanding. |
| N-04 regional economy | Two regions / six markets, local books and finite outside pools. Economic growth/contraction and richer supporting firms remain incomplete. |
| N-05 branches/departments | Branch types, local upgrades/closure, capacity and contribution exist. Full department budgets, leaders and manager delegation remain incomplete. |
| N-06 living products | Active work: amortizing loan cohorts, origination terms, funding covenants, promotional savings and now locked term deposits. Product development/deployment/retirement, richer segmentation and delayed delinquency still missing. |
| N-07–N-08 | Existing capability and advertising controls are not the full cross-capability deployment web, targeted acquisition funnel or renewable contract system. |
| N-09–N-10 | Group accounting, insurance agency, brokerage/wealth, bounded company share clearing and deliberate control transactions still ahead. |
| N-11–N-14 | Authored national scale, delegated management, integrated scale-tested UI, release/human acceptance, then underwriting remain ahead. |

Do not present this as six of fifteen phases fully completed. We are strengthening the two-region prototype and working inside the Living Bank milestone. National content and the 120–200 meaningful-turn target are not validated.

## Recommended next batches
1. Finish the N-06 product lifecycle: separate acquisition offers from existing portfolios, deployment/retirement and a compact product contribution/maturity workspace. Add delinquency/collections before broader loan complexity.
2. Complete N-05 management prerequisites and move into N-07 cross-capability applications with deployment costs/upkeep. Avoid more parallel percentage ladders.
3. N-08 renewable payroll/treasury contracts and targeted product campaigns. Mature markets need recurring competition, not permanent ownership.
4. Then group subsidiaries/ownership and finally authored national expansion with delegation.

Known abstraction: unique customers and product servicing still use proportional balance attribution; term lock does not lock an entire household relationship or prevent switching unrelated services. Renewals are modeled as a standing contract instruction, with no early-redemption penalty/withdrawal option in this slice.
