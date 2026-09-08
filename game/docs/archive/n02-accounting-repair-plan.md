> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# N-02: next implementation package

Status: Active accounting is now implemented in the opt-in Regional Rivalry pilot. Legacy campaigns retain their original rules. Earlier N-02a/b/c notes describe the preceding foundation; see regional-rivalry-pilot.md for current activation, N-03 rivalry changes, N-04 region foundation, tests and remaining acceptance work. September 4, 2026.

## Where development stands

- N-00 baseline: complete.
- N-01 deterministic simulation, stage-level causal records, and import validation: implemented locally, with automated coverage. Browser autosave/continue smoke checked in an isolated localhost campaign.
- N-01 full archival replay, every intermediate causal posting, protocol version negotiation and physical two-PC acceptance: not certified. Intermediate accounting postings belong in the next journal work; broader release gates remain explicit.
- N-02a funding corrections: versioned new-campaign rules for deposit equity preservation, loan-exposure capital, explicit emergency debt and signed losses. Full N-02 opening-account reconciliation and operating postings remain next.
- N-03 persistent rivalry and N-04 regional markets: not started. No national map, new business lines, or longer-campaign rules have shipped.

## Why this is not a one-line capital-ratio fix

The current opening bank has cash 2.4M, loans 9.5M, deposits 24M, and capital 1.8M. Tracked cash plus loans is 11.9M, while deposits plus capital is 25.8M. The 13.9M difference is not represented by an explicit asset account. Merely removing deposits from riskAssets would change the opening capital ratio from about 12.6% to 18.9% without reconciling the balance sheet.

Design the opening balance sheet and migration together. One candidate is an explicitly modeled 13.9M opening securities/other-asset portfolio, but its liquidity, yield, valuation, and risk weights must be specified; do not silently turn a balancing residual into free spendable cash or free income. Preserve old campaigns behind a documented accounting-version boundary if conversion cannot maintain honest semantics.

## Bounded implementation sequence

1. Define entity accounts and posting helpers; add opening reconciliation tests before routing production mutations.
2. Route deposit inflows/outflows through liabilities and liquid assets. Remove direct equity damage from ordinary deposit competition; preserve separately booked losses.
3. Route loan origination/repayment, operating accruals/cash, credit losses, expenses, grants and investments through explicit posting rules.
4. Replace residual 'draw directly from capital' liquidity settlement with a represented source of financing or explicit unresolved failure. Equity is not a cash drawer.
5. Replace the deposit-based risk denominator with documented exposure weights, and reconcile capital changes to earnings/losses/issuance.
6. Version saves, add signed-equity/dual-failure checks, expose the new account meanings in forecasts/reports, and update AI choices only where old choices become illegal.
7. Run accounting invariants, deterministic continuation, transports, paired-seed balance comparisons and live turn/restore acceptance. Report changes without unrelated multiplier tuning.

## Required tests

Opening and every posted transition reconcile assets = liabilities + equity; ordinary deposit transfer preserves equity absent a booked loss; buyer/seller transfers reconcile; securities/loan sales apply explicit haircuts; borrowing creates a liability; losses can produce signed equity; restoring a failed bank cannot recapitalize it; simultaneous failure does not fabricate a surviving acquirer. Full-turn ledger totals and operating previews must agree with the same account functions.

Non-goals: re-entry, national content, research expansion, subsidiaries, advertising, share trading, transport redesign, or a broad UI redesign. These are still planned, not implemented features.
