# Bank-issued cards — Expanded 9.40

New Expanded campaigns can choose who issues their credit cards. The
[partner-issued program](partner-cards.md) is unchanged: Cedar Reserve funds,
owns and services the balances and pays your bank a share. The new
**bank-issued** route makes your bank the issuer: it pays merchants, owns the
balances, earns the interest and interchange, and bears the losses.

Core, and Expanded campaigns created before 9.40 (including their rematches),
keep their rules. A 9.39 campaign has no route choice; a 9.40 campaign offers
both routes.

## Choosing a route

Both routes need the same research (Digital Architecture and Relationship
Planning) and serve the same shared card market: 80 outside households, up to
40 live accounts per bank, the same $5,000 limit, 24% APR, payment behavior,
disputes and delinquency rules. The route is chosen in the launch instruction
and is fixed for the life of the program.

| | Partner-issued (Cedar Reserve) | Bank-issued (your bank) |
| --- | --- | --- |
| Launch | $2,500 license | $15,000 card-issuing platform |
| Running cost | $100 a month + $3 per live account | $300 a month + $4 per live account |
| Who funds purchases | Cedar's cash | Your protected cash |
| Who owns balances | Cedar | Your bank, as receivables net of loss allowance |
| Your income | 1.5% of purchases + 25% of interest collected | 2.2% of purchases (interchange) + all interest earned + recoveries |
| Losses (provisions, disputes, charge-offs) | Cedar | Your bank |
| Capital | Not on your balance sheet | Balances count as risk assets |
| Capital ratio needed | 8% for new accounts | 10% to launch and for new accounts |
| Technology and Risk time, each | 2.5% of one employee + 0.125% per account | 5% of one employee + 0.3125% per account |

Of the 3% merchant discount, the issuing bank keeps 2.2%; the card processor
keeps 0.8%. On the partner route Cedar keeps the whole discount and pays your
bank its 1.5% share.

## How the bank-issued book works

- **Purchases.** Each purchase is paid to the merchant from your bank's
  protected cash: cash above 2% of deposits, payables and your department
  reserve, and within the bank's spending limit. A purchase that does not fit is
  declined and recorded as failed settlement. Payments collected earlier in the
  same month can fund later purchases.
- **Balances.** Principal and accrued interest are your bank's receivables. The
  loss allowance is netted against them, so the balance sheet shows what the
  bank expects to collect. Card balances count toward risk assets and so lower
  the capital ratio.
- **Income.** Card income after losses is interest accrued, interchange kept
  and recoveries, less provisions and dispute losses. Charge-offs are covered
  by provisions already taken, so they are not deducted twice.
- **Losses.** Provisions rise with delinquency (10%, 50%, 100%). Four missed
  minimums charge the balance off against the bank; later recoveries are
  income. A dispute the merchant cannot refund is a loss to the bank.
- **Pausing and wind-down.** If protected cash cannot cover the monthly running
  cost, the program pauses: no purchases or new accounts, collections continue.
  New accounts also stop while the capital ratio is below 10%. Wind-down stops
  purchases and intake permanently; the bank keeps collecting its balances.

The monthly contribution in **Cards → Results** is card income after losses
less the platform, running and marketing costs. It excludes shared research,
payroll and overhead, and the funding cost of the cash tied up in balances.

## Compatibility

- `bankCardsVersion: 1` / `bankCardsSupported: 1` stamps 9.40. It requires the
  9.39 card economics (`cardEconomicsVersion: 1`). API callers opt in with
  `currentBankCards: true`.
- A 9.40 card instruction must name its `route` (`partner` or `bank`). Peers
  without the capability are refused before a 9.40 campaign links; 9.39 and
  older campaigns still link to them.
- The partner route in 9.40 uses the 9.39 contract unchanged. Seeded 9.38 and
  9.39 partner-card campaigns replay byte-identically on the 9.40 engine for 16
  months, including wind-down.
- The owner's view carries only its own program and route; rival card books,
  routes and customer wallets are not sent.
- The AI issues its own cards only with a capital ratio of at least 14% and
  more than $1.2 million of cash; otherwise it uses the partner route.

## Measured comparison

Card-only results over 36 months on the settle kernel, with full Technology and
Risk coverage and a no-card opponent, the same method as the
[9.39 balance pass](partner-cards.md#939-balance-pass). Cautious growth never
advertises; faster growth advertises $1,000 a month until 30 live accounts.
Household behavior is deterministic, so these are one outcome, not a range.

| 36 months | Partner-issued | Bank-issued |
| --- | --- | --- |
| Cautious: cumulative contribution | +$6,074 (repaid month 23) | −$10,047 (not repaid) |
| Cautious: last 12 months | +$5,710 | +$7,192 |
| Faster: cumulative contribution | +$14,905 (repaid month 17) | +$11,277 (repaid month 30) |
| Faster: last 12 months, 40 accounts | +$9,786 | +$27,750 |

At a full book (40 accounts, about $183,000 of balances) the bank earns about
2.8 times the partner share: $38,363 of interest and $4,750 of interchange,
less $10,555 of provisions and $5,508 of running costs, over the last year.
A small book does not repay the platform within three years. The partner
route is the cheap, safe choice; issuing your own cards pays when the bank
grows the book and can carry it. These figures exclude shared research and
payroll, and the funding cost of the cash held in card balances.

Whole-game runs on seed `bank-cards`, with the AI planner running both banks
and the card schedule forced, gave two results:

- At the earlier $20,000 price, the bank route with faster growth ran all 36
  months with every plan valid and every ledger reconciled, repaying its
  platform in month 33. That result is why the platform price was lowered to
  $15,000.
- At $15,000 the same seed diverged. At month 31 the bank, at a 7.83% capital
  ratio after its own executive decisions, produced a plan that failed the
  capital reserve check.

### Card programs below the capital reserve (fixed)

Both whole-game failures had one cause, present since 9.38. Once a bank's
spending limit (capital above 8% of risk assets, within cash) could not cover
its card program's running cost, that cost still counted as a plan commitment.
Every plan except a permanent wind-down then failed the reserve check, for a
human as well as the AI, although settlement would simply have paused the
program without charge. The AI never winds down, so in AI mode the human's month
could not resolve.

Now, for every card campaign version:

- A running program the bank cannot pay for is not a commitment. It pauses at
  settlement exactly as before: no running charge, purchases or new accounts;
  collections continue, and it resumes once capital and cash allow. Cards →
  Program says so before the month resolves.
- The AI does not stage a launch the reserve would reject.

Only states in which the reserve already rejected every plan that kept the
program behave differently, so campaigns that could continue before are
unchanged. Seeded 9.38, 9.39 and 9.40 card campaigns and Core 8.20 and Expanded
AI campaigns replay byte-identically against the unfixed engine.
`card_capital_reserve` covers a human below the reserve, an AI-mode month and
AI launch affordability, and fails on the unfixed engine with the original error.
