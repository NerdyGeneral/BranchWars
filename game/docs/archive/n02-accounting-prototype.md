> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# N-02b: accounting prototype and operating-flow bridge

Implemented locally September 4, 2026. This is a tested engine foundation, NOT an enabled campaign economy. Existing version 1/2 campaigns, saves, UI, victory rules and AI behavior are unchanged.

## Delivered

The embedded engine exports AccountingPrototype. Its functions are pure: they return a new book and never write into a campaign or mutate either side of a failed transfer.

The proposed opening book explicitly allocates assets rather than deriving a balancing residual at runtime:

| Account | Opening dollars |
|---|---:|
| Cash | 2,400,000 |
| Loans | 9,500,000 |
| Securities | 13,900,000 |
| Total assets | 25,800,000 |
| Deposits | 24,000,000 |
| Emergency borrowing | 0 |
| Equity | 1,800,000 |

The securities allocation is a **proposed new-game assumption**, not a discovery of assets held by existing saved banks. It is not an import conversion. There is no residual/other-assets plug or automatic top-up.

Securities have zero automatic income, no automatic maturity or valuation changes, and cannot be spent as cash. A sale must explicitly specify principal and a haircut in basis points; a purchase consumes cash. The tests exercise a 2% securities haircut and a 6% loan haircut, but these are test inputs, not activated campaign policy. Exposure weights and portfolio yields remain decisions for production integration; the prototype does not calculate a capital ratio.

## Transactions

- Deposits increase both cash and deposit liabilities; withdrawals reduce both.
- Loan origination exchanges cash for loans. Principal repayments reverse that exchange and are not income.
- Cash income and expenses change cash and equity dollar-for-dollar.
- Credit losses reduce loans and equity, not cash a second time.
- New equity increases cash and equity without being retained earnings.
- Borrowing increases cash and debt. Repayment reduces both without becoming an expense.
- Asset sales remove principal, credit actual proceeds, and recognize the specified loss in equity and retained earnings.
- Every posting checks whole-dollar safe integers, nonnegative assets/liabilities, signed equity, and the balance-sheet identity before returning.
- Journal entries identify the transaction and signed changes. These are net account changes, not a debit/credit presentation.

Insufficient cash is rejected by ordinary transactions. The explicit funded helper instead records a separate emergency borrowing entry before a withdrawal, origination or expense. This is provisional uncapped financing, not a completed collateral/eligibility model. It does not automatically sell securities or loans.

## Operating-flow bridge

The bridge consumes an existing operatingPreview report without changing its formulas or writing projected balances back to the player. It reconstructs gross deposit inflows/runoff and loan originations, separates noncash credit losses, retains the entire resulting profit as equity, and records any required borrowing.

Current report revenue categories are treated as supplied cash-income assumptions. This does NOT certify that the old deposit-income yield or other revenue formulas are economically appropriate. It does not add the old liquid-policy free cash grant. Independent dollar rounding is reported explicitly, allowed only within two dollars; a materially inconsistent profit report is rejected.

This bridge is useful for testing and comparing the replacement model. It is deliberately not presented to players as their authoritative forecast until all turn stages use the same accounting rules.

## Verification

New tests/accounting.test.js covers opening reconciliation, all transaction types, insufficient funds, invalid amounts/accounts, signed insolvency, borrowing, transfer atomicity, asset sales including dollar-sized rounding, full profit retention, journal reconstruction, 27 real policy previews, corrupt report rejection, campaign immutability and 2,000 stress postings.

The baseline runner now includes this suite. All seven separately run suites passed: accounting, engine (48 long-run campaigns), funding (24 campaigns / 1,927 turns), determinism, stage-ledger (276 turns), save-integrity and transport. git diff --check passed. The full baseline runner and 800-game balance audit were not rerun for this isolated addition. This package does not alter UI, does not claim browser/physical-two-PC acceptance, and does not claim improved campaign duration or balance.

Prototype books are not accepted through save import. Its journal is currently an in-memory testing structure without a size cap or archival restore validator; production persistence must address this before activation.

## Exact next work

1. Map executive decisions, opportunities, hires, research, projects, grants, dividends, penalties and acquisitions to explicit transactions. Decide expense versus capitalization for each investment, rather than reconciling unexplained differences after a turn.
2. Specify securities yield/risk/liquidity, loan funding limits, funding priority and debt eligibility.
3. Activate the entire model together behind a new accounting-rules save boundary; preserve existing campaigns rather than guessing a conversion.
4. Display an authoritative balance sheet, income/cash-flow breakdown and funding forecast using that model.
5. Run full-turn accounting invariants, restore/transport acceptance and paired-seed economy audits before calling N-02 complete.

N-03 persistent rivalry and N-04 regions remain after that switch. National expansion, products, subsidiaries and deeper research have not shipped in this package.
