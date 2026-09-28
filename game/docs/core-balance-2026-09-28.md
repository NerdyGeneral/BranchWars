# Core balance pass, September 28, 2026

This pass applies to opted-in Core 8.20 (`researchProgramVersion:1`,
`bankEconomicsVersion:2`). Saved earlier rule profiles and Expanded retain their
economics. The preceding Core map review and available-to-spend header are in
commit `6d7d02a`, included with this branch.

## Rule changes

- The Core balance sheet already earns interest on its securities. The separate
  legacy deposit-income proxy paid a second return on the deposit base; Core no
  longer books it. Loan yield rises from the legacy `0.0047` coefficient to
  `0.0068`, before the existing rate, product, research and loss terms. The
  actual income view omits the now-zero modeled deposit-margin line.
- Core lending originations bring operating deposits equal to at most 70% of
  funded production when four or more lending bankers are available, scaled
  down with fewer bankers. These deposits pass the existing demand path, add a
  matching liability and cash, and face runoff. Core's outside supply is still
  unbounded.
  Loan production remains cash-funded and subject to the reserve limit.
- Protect Margin now puts 12% of newly won Core deposits into the
  rate-sensitive bucket rather than 1%, and that bucket runs off at 12% rather
  than 10% under the same macro multiplier. This models customers leaving a
  lower-priced bank instead of locking in its cheapest deposits forever.
- Ordinary Core business and merchant acquisition stops at the remaining
  relationship capacity of `100 + 50 × branch levels`. Existing business and
  paid transfers are not deleted. The prior soft saturation allowed unlimited
  growth past the intended office capacity.
- Completed Core research tiers contribute 135 enterprise-value points and a
  capstone 100, rather than the earlier 18 and 30. This values a durable
  capability while retaining its cash cost and operating tradeoffs. Earlier
  campaigns use their original score weights.

## Measured campaigns

`tools/core_strategy_lab.js` runs a strategy against the ordinary same-rule AI
on each seed from both seats. It changes one policy or a documented staffing
mix, uses the same starting options and validates the accounting after every
month. The reported margin is strategy score minus opponent score; zero is
parity. These are diagnostic AI policies, not optimal human play. Source hashes,
individual runs, books, score and checkpoint data are in the adjacent
`reports/qa/core-balance-2026-09-28/` JSON files.

| Strategy, 48 months | Before, 2 seeds × 2 seats | After, same 2 seeds × 2 seats | After, 4 seeds × 2 seats |
| --- | ---: | ---: | ---: |
| Skip research | +588 | −150 | −217 |
| Business staffing tilt | +420 | +608 | +312 |
| Protect Margin | +2,311 | +114 | +235 |
| Lending staffing plus Growth policy | −3,218 | — | — |
| Lending staffing plus Network research | — | −215 | −498 |

The 72-month candidate run (two seeds, both seats) gave no research −307,
business staffing +2,111 and lending plus Network −1,332. One margin run ended
at month 71, so its terminal average is **not** a comparable 72-month result.
The 120-month diagnostics likewise include buyouts and franchise absorption;
post-absorption score margins must not be read as ordinary strategy returns.

The repaired lab lets a focused strategy diversify its research after the
chosen branch is complete. This avoids falsely modeling a long-run lending
bank as one that stops investing altogether.

## Remaining balance gap

The two originally dominant plays are substantially closer at month 48, and
research has a durable score contribution. A bank that concentrates too much
staff in lending can still fall behind as its deposit gathering and office
growth lag. Business staffing can still lead after month 72. Core has no
finite outside customer/deposit book, so these paths can compound sharply and
may trigger early buyouts. This pass is not a claim that every strategy is
equally strong or that 120-month balance is settled. A later Core economy pass
should add a conserved market supply and test adaptive staffing policies over
more seeds before declaring long-run balance accepted.

## Verification

The Core balance sheet and research tests cover reconciled loan/securities
income, deposit and loan movements, the relationship ceiling, the margin-runoff
tradeoff, research value and old-rule isolation. Markets and interface suites
also exercise the staged map review and header changes. The portable
`BRANCH_WARS.html` is rebuilt from the edited source.
