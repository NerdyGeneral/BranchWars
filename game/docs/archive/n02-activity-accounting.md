> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# N-02c: activity accounting adapters

Implemented locally September 4, 2026. This extends the isolated N-02b prototype. It does **not** activate a new campaign economy or convert existing saves.

## What is connected

- The live opportunity reward function and accounting opportunity adapter now share opportunityTerms. Deposit, business, loan, wealth, payroll and public opportunities therefore use the same principal and fee calculations.
- The live acquisition completion function and accounting acquisition adapter now share acquisitionTerms, including strategy-level and market-share effects.
- The accounting spending quote uses the live planBudget for project prices, capability investment, hiring and competitive actions. It is a quote, not proof that a plan passes target, capacity, eligibility or investment-cap validation.
- Named adapters cover ordinary discretionary spending, mandatory cash penalties, grants, franchise income and deposit growth, board issuance and milestone capital.
- Ordered batches and bilateral settlements return new books only. A failure does not partially modify either input.

Only term calculations are shared with live gameplay. Production functions still mutate their original version 1/2 statistics. No accounting book is attached to a campaign, no new accounting save format is accepted, and no corrected balances are silently copied into an existing bank.

## Acquisition settlement

Let D be transferred deposits, L transferred loan principal and P the explicit premium.

Seller-to-buyer cash settlement = D - L - P.

A positive value means the seller transfers cash backing the assumed deposits. A negative value means the buyer pays the seller. If the payer lacks cash, the prototype explicitly books emergency borrowing first. Deposits and loans transfer without duplication; combined equity and cash less borrowing are conserved.

For this prototype, P is immediately expensed by the buyer and recognized as seller income. There is no invented goodwill account or resale valuation. The default P is zero. The existing project's upfront cost is separate: the spending adapter treats it as a project expense, not an automatic second premium. No live acquisition pricing or transfer behavior is changed by this package.

Examples:
- D=1,000,000, L=400,000, P=50,000: seller supplies 550,000 cash; buyer equity falls 50,000 and seller equity rises 50,000.
- D=0, L=900,000, P=50,000: buyer pays 950,000 cash for the loan book.

Branches, customer relationships, market share and attention remain nonfinancial game state. Their transfer behavior is unchanged, not independently valued by this model.

## Spending and income classification

Hiring, research, projects, competitive actions and paid executive decisions are immediate expenses. This is a deliberately conservative first model: there is no branch-property capitalization, depreciation, research intangible or salvage value yet. These discretionary adapters reject insufficient cash rather than borrowing automatically.

Mandatory penalties can explicitly borrow, then reduce cash and equity. Board and milestone capital increase cash and equity without becoming operating earnings. Grants and franchise operating income are income; franchise deposit growth separately increases both cash and liabilities.

The current wealth opportunity still represents a deposit inflow because that is what the live game defines. This patch does not pretend it has implemented brokerage assets under management or client-asset segregation.

## Verification

tests/accounting_activities.test.js checks:
- All expense/capital classifications and insufficient-cash behavior.
- 24 actual opportunity rewards against shared terms and reconciled books.
- 20 actual acquisition completions across both funding versions, both seats and all five strategy levels.
- Both directions of settlement, borrowing, no duplicated deposits/loans, combined equity and net-cash conservation.
- Invalid/oversized transfers, input immutability and all-or-nothing batches.
- Every current project key through the actual spending-budget quote.
- Journal reconstruction and separation of income from capital issuance.

All eight separately run suites passed: accounting activities, accounting foundation, engine (48 long-run campaigns), funding (24 campaigns / 1,927 turns), determinism, stage-ledger (276 turns), save-integrity and transport. git diff --check passed. The baseline runner includes the new suite, but the full runner was not rerun. No UI changes, browser acceptance, physical two-computer check, or new 800-game balance audit are claimed by this package.

## Remaining activation work

N-02 is still incomplete. Before switching new campaigns:
1. Wire every authoritative stage to its named postings, including all executive outcomes, risk consequences, market exits and terminal franchise absorption. Current adapters do not automatically intercept those mutations.
2. Resolve securities yield/liquidity/exposure weights, funding eligibility and priority, and the treatment of long-lived branch assets.
3. Add a versioned, bounded, validated accounting-book save format and a single authoritative turn path; do not reconcile missing entries with a residual asset.
4. Make the operating preview, AI affordability checks and player balance-sheet/cash-flow UI use that same path.
5. Run complete-turn invariants, save/transport/browser acceptance and paired-seed economy audits.

Persistent rivalry, regional expansion and new business lines remain later packages. No commit or push was performed.
