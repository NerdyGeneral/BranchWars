> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# Deposit Products — N-06 funding-product slice

Implemented locally September 4, 2026 (UTC evidence timestamps September 5). Partial product-lifecycle delivery, not completion of N-06 or the national blueprint. No commit or push.

## Play / compatibility

Start a NEW Regional Rivalry pilot. New games include depositProductsVersion=1 on top of the existing funding-covenant, credit-lifecycle and regional rules. Previous saves and rematches without this flag retain the preceding economy. Both linked clients require the updated HTML; pilot capability is now 6.

## Delivered

- Deposits no longer earn the old automatic balance-based income. They provide funding; loans, securities and fee businesses must earn a spread over funding and operating costs.
- Deposit income now consists of modeled account fees. Added servicing costs are booked as expenses, not subtracted only from a score.
- Product deposits are tracked in local cohorts that reconcile to local market balances and the accounting liability.
- High-yield savings gives a six-month rate guarantee. These are withdrawable promotional savings, NOT locked term deposits or CDs.
- Existing non-guaranteed balances move into the selected retail product at monthly repricing. Selecting high-yield therefore also guarantees repricing balances, not just newly recruited deposits.
- Guaranteed balances keep their rate/product until expiry even if the player selects another product or changes deposit pricing. At expiry, remaining balances renew into the then-selected product and pricing.
- Customers may leave during a guarantee. Ordinary competitive switches get the receiving bank's terms; acquisitions preserve the seller's remaining guarantees.
- A timing fix prevents deposits arriving before operations from immediately losing a month of their newly quoted guarantee.
- A collapsible Operations panel shows balances, funding interest, annualized blended rate, fees, servicing expense and guarantees expiring next turn. Draft forecasts include the new expense/income lines.
- Compact rate-commitment/cost summaries appear in the causal event ledger. Rival detailed deposit cohorts are not exposed.
- UI and engine current-book estimates agree, including the Community Franchise funding discount.

## Current model parameters and conventions

| Product | Monthly modeled fee per customer | Monthly servicing per customer |
| --- | ---: | ---: |
| Essential | $6 | $12 |
| Rewards | $12 | $20 |
| High-yield | $0 | $8 |

An additional monthly servicing charge of 0.006% of product balances applies. Customers are allocated to products in proportion to deposit balances; there are not yet actual account-level or demographic product segments. These are game parameters, not banking-industry guidance.

Rates use the existing policy-rate/pricing/product multiplier formula, fixed at quotation for high-yield guarantees. The displayed annualized rate is a simple monthly-rate equivalent, not compounded APY. Interest is a cash expense; it is not automatically capitalized into the deposit principal.

Operations uses the starting customer count for modeled fees/servicing, allocated over the balances after that operation's deposit movements. The product panel instead describes the current book, before future flows. Later opportunities, competition and events can therefore change the final balances and subsequent estimates. New servicing expense stays in the regional report's central residual instead of inflating the facility-expense allocation.

## Verification

Final BRANCH_WARS.html SHA256:
ddbd4aac19dc76244fd2fca94c0e296a42a62180d01c29cad3666bf07b910617

Final targeted report:
../../reports/baselines/deposit-products-2026-09-05T04-03-06-809Z.json

tests/deposit_products.test.js passed:
- Script syntax; current/public cost-summary agreement.
- Forecast purity and new fee/servicing lines.
- Existing guarantees resist product/pricing/rate changes.
- Renewal, acquisition term preservation and conserved local competitive transfers.
- Pre-operation receipts retain their full initial guarantee.
- Invalid/unversioned imports, prior saves and rematches.
- Six campaigns: two seeds, each with an AI control and lending staff shifted into service on either seat.
- 595 resolved turns, including paired save/resume continuation checks.
- Accounting, local deposits/loans, regional contribution and causal ledgers reconcile on sampled turns.
- Largest sampled public view: 411,106 bytes.

Other suites rerun successfully this batch: engine (48 campaigns), prior funding covenants (726 turns), prior credit lifecycle (484 turns), accounting, accounting activities, accounting persistence, bank identity, determinism, ledger (276 turns), save integrity, transport, and PowerShell LAN-server health/create/join/relay/idempotency. Most general regressions preceded the final deposit-only timing/UI corrections; the targeted suite validates the final exact bytes. git diff --check passed.

Computer-use skill QA: new solo pilot; high-yield selection changes the forecast; month resolves to cycle 2; product table renders at 1280px with no horizontal page overflow; guarantees and annualized rate display correctly. The final timing-fixed build was also started and resolved through the UI. A saved-game reload was checked after that resolution. No warning/error logs in the checked browser session. Temporary test tab/server closed afterward.

Not verified: mobile layout, live GitHub or physical two-computer LAN, a fresh two-browser game, exhaustive balance permutations or human playtime/enjoyment. Passing transport tests does not certify those live paths.

## Balance findings

The six-game sample no longer uniformly runs forever: receivership occurred at cycles 45 and 66, while four campaigns remained active at cycle 122. These are observations, not a guaranteed campaign length.

Service-heavy play still tends to gain a large deposit franchise. However, those banks had lower final sampled operating profit than their rivals, and one failed despite holding more deposits. Large deposit balances no longer automatically imply a more profitable or solvent bank.

This does not establish a balanced competitive game: the sample is only two seed pairs; the service variant changes staffing rather than performing a full strategy optimization; current AI, fee businesses, scenarios and capital awards still affect results.

## Remaining / next batch

1. Actual locked term-deposit products with maturity/renewal decisions and explicit early-withdrawal behavior. The new promotional guarantees are a foundation, not this feature.
2. Customer and borrower segments with product-level demand, churn and service requirements, rather than proportional customer allocation.
3. Treasury asset deployment and interest-rate-risk choices so surplus deposits have deliberate uses beyond existing automatic flows.
4. Broader paired-seat balance tests and human playtests before increasing the national map or claiming a 120–200-turn strategic campaign.

Insurance, brokerage, share ownership and the full national management layer remain later packages.
