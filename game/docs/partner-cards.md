# Partner-issued cards — Expanded 9.39

This local implementation adds **Banking → Cards** to new Expanded campaigns.
Core and imported/rematched campaigns retain their original rules. Bank-issued
cards remain a separate future feature.

## Contract and player decisions

Complete Digital Architecture ($100,000) and Relationship Planning ($50,000),
then license the program for $2,500. Deployment becomes usable the following
month. Open or close intake and set an optional recurring acquisition budget
from $0 to $1,000 in $100 steps. Launch and wind-down require closed intake and
zero marketing. Working edits do not change the shared plan until staged.

Cedar Reserve Bank is issuer, funder, receivable owner and collections servicer.
Its existing acquisition-finance book also funds outside advances and cards;
there is no second lender balance. Card Network provides the contracted
processing platform and support. The distributing player bank receives 1.5%
of settled purchases and 25% of interest actually collected, paid by Cedar.
The 3% merchant discount funds purchase compensation. Settled processing fees
are nonrefundable even when a later refund occurs. No compensation is paid for
reversed or failed purchases, uncollected interest, or charged-off principal.

The bank prepays $100 per active month plus $3 per live account and any funded
marketing. Insufficient protected cash suspends purchases; it creates no vendor
arrears. Collections continue. Wind-down permanently stops purchases and intake,
waives further platform charges, and retains debts until repayment or recovery.
Cedar retains responsibility for its remaining receivables and losses.

## Customer and settlement conventions

The launch uses a bounded, separate card-market sample: 80 outside individuals,
at most 40 live accounts per bank and six acquisitions per bank per month.
These individuals are not added to existing deposit-customer counts. Each begins
with a recorded $10,000 outside cash endowment; merchants begin with $200,000.
These opening equity postings total $1 million of outside cash. No further
outside money is created: wages recycle actual merchant receipts; living costs,
card purchases and repayments transfer recorded cash between counterparties.
The opening endowment is a simulation calibration, not bank income or funding.

Customer profiles are full payers, revolving borrowers and financially stressed
borrowers. Intake requires at least $2,500 of outside wallet cash; the fixed
$5,000 limit is no more than twice that opening liquid balance. This is a simple
game underwriting rule, not a real-world credit approval model. Profiles drive
payment behavior and seasonal cash stress; cash affordability always caps payment.
Marketing and delivered central capacity bound applications. New accounts first
spend in the following month. Closed accounts are not recycled into prospects.

Each account has a $5,000 limit and 24% annual APR. Monthly statements fall due
the following month. Minimum payment is the smaller of the statement or the
larger of $25 and 5%. Full statement payment preserves/restores grace. Otherwise
2% interest, rounded up to a dollar, applies to unpaid opening principal.
There is no interest on interest, current purchases, or disputed amounts.
There are no annual fees, late fees, rewards, cash advances or balance transfers.
The product therefore has no reward liability or unbacked redemption promise.

Payments clear only from available customer cash, interest first. A returned
payment posts nothing. Purchases reserve a transient authorization hold, then
reverse, fail for insufficient issuer cash, or settle once to merchants.
No holds survive the atomic monthly boundary; persistent receipts reconcile
authorized amounts to reversals, declines and settlements. Refunds use actual
merchant cash and reduce principal. Disputes resolve next month through merchant
cash or a Cedar-funded credit; Cedar absorbs any shortfall, never the player.

An overdue account cannot buy. Two missed minimums suspend interest accrual;
provisions progress through 10%, 50%, and 100% with delinquency. Four misses
charge the remaining debt off Cedar's net assets. The customer obligation remains
for cash-funded recoveries, reported separately as Cedar income. Loss reserves
and charged-off claims reconcile independently; a charge-off is not a payment.

## Capacity, ordering and reporting

An active/paused program adds 2.5% of one employee plus 0.125% per live account
to **each** shared Technology and Risk workload. At 40 accounts that is 7.5%
per function, or 15% of one employee across both functions. Cedar and the
processor perform the contracted issuance, processing and collections work. Existing
Department Functions dispatch supplies finite staff/vendor coverage for these
tasks. This competes with other consumers of the same tasks. The lower delivered
coverage limits purchases and intake; no new staff or duplicate capacity appears.
The UI translates this into employee percentages. Cedar's bundled collections
contract services the bounded 80-account market; this version has no additional
unbounded collections customers or player-managed collector staffing.

Cards settle after bank operations and acquisition activity, while actual shared
department delivery is available, and before new outside advances. Bank priority
alternates each month. Every authorization rechecks Cedar's remaining cash.
Paid fees, direct costs and contribution appear in Cards → Results, with twelve
months of retained history. Shared payroll is bank-wide and is not allocated as
card direct costs. The bank earnings bridge includes the card stage outside the
ordinary operating subtotal. Cedar's principal, accrued interest, provisions,
charge-offs and recoveries are shown separately from player earnings.

## Compatibility and evidence

`partnerCardsVersion: 1` retains the original 9.38 contract. New Expanded setup
also selects `cardEconomicsVersion: 1` / `cardEconomicsSupported: 1`, stamping
9.39. API callers opt in with `currentCardEconomics: true` in addition to the
existing partner-card prerequisites. Old saves and rematches keep their contract:
$25,000 setup, $500/month, $10/account, $0–$5,000 advertising in $500 steps, and
the old larger staffing demand. Peers lacking the new capability are refused.
No previously paid license is repriced, refunded or silently upgraded.
The private owner projection includes only its own card accounts and pending
instruction. Rival account books and outside customer wallets are not sent.
Shared lender aggregate cash/assets remain public, as in the earlier rules.

The local source backup and verification receipts are in
`reports/local/partner-cards-20260927/`. Automated kernel tests distinguish adverse
fixtures from the paid-research, normal-submission launch journey. Real gameplay
balance and two-physical-computer multiplayer acceptance require human play;
technical checks do not establish either.

### Historical 9.38 eighteen-month result

The same legal plans were replayed against the final portable build. Both banks
paid for research and licensing, marketed at $2,000/month during months 4–9,
then stopped marketing while retaining open intake. Both reached 27 accounts.
One earned $6,046 in card fees against $46,930 of direct program costs; the other
earned $5,631 against the same costs. Their month-18 contributions were −$143
and −$165 before shared payroll. These young programs had **not** broken even.
This is one seed and a constrained plan, not a recommended strategy or evidence
that the acquisition budget is balanced. The numbers include the card license
but exclude the shared research cost and bank-wide payroll. Receivables, cash
payments and both earnings bridges reconciled. Default, recovery and issuer
cash-exhaustion paths were tested separately with explicitly funded fixtures.

## 9.39 balance pass

The 40-account bank limit and shared 80-person pool remain unchanged. Marketing
adds application capacity at one per $200 before actual coverage is applied;
organic capacity is one, total intake is capped at six/month, and eligible
customers and open account slots still constrain intake. Advertising is paid
even when it produces no acquisition. The AI reduces advertising after 25 live
accounts and requires adequate quoted delivery before using a paid budget.

Results now retain lifetime fees, setup, delivery and marketing totals in 9.39,
independently of the twelve-month table. Monthly operating contribution excludes
the one-time license; cumulative contribution includes it. The payback scenario
holds the latest operating contribution constant and is explicitly not a forecast.
Shared research ($150,000), payroll and overhead are excluded. These existing
capabilities serve other products; standalone card-only investment payback has
not been established. Older campaigns have no invented lifetime history.

The controlled 36-month comparison uses paid prerequisites, legal submissions,
existing staff and no-card opponents. Cautious growth uses no paid advertising;
faster acquisition uses the maximum until reaching 30 accounts, then stops;
continued maximum advertising is the adverse spending comparison. Across the
measured cases, cautious growth recovered direct costs in month 26 and ended
at $4,854 contribution; faster acquisition recovered them in month 19 and ended
at $13,392; continued maximum advertising ended at a $13,395 loss. No-card
controls had zero card income and zero card expense. These are direct-program
results, not total bank profit or evidence that the program pays for new staff.

The same card schedules under full coverage yield identical card outcomes
across the selected world seeds: household profiles are deterministic. This
checks different bank environments and seats, not independent customer samples.
Kernel tests separately cover zero delivery, depleted cash and malformed saves.
Lender credit losses remain real and are not shifted to the player bank.

A hypothetical wage increase was rejected: it exhausted merchant cash rather
than resolving the cost mismatch. Opening money, issuer funding, card terms,
payment behavior, merchant fees and the player's revenue share are unchanged.
See reports/local/card-balance-20260927 for raw evidence and source identities.
