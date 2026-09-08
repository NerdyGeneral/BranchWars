'use strict';

// Advisory review artifact only. Not part of the source manifest or game rules.
module.exports = Object.freeze({
  "status": "Read-only integration review; isolated prototype is not installed or a seven-product gameplay completion.",
  "scope": "Minimum authoritative adapter for future Financial Group 7; preserve Group 1-6 and existing selection defaults.",
  "counterparties": [
    {
      "source": "src/engine/company-finance.js:25-94",
      "authoritative": "company:0..5 have GroupAccounting cash, debt, payables, business assets, finite sales and expenses. corporate:outside and corporate:creditors are real counterparties.",
      "constraint": "All existing corporate debt and interest arrears currently belong to corporate:creditors. Existing operating assets are aggregate assets, not an identified CRE collateral register."
    },
    {
      "source": "src/engine/households.js:25-34; src/engine/segment-deposits.js",
      "authoritative": "Conserved household counts and market/segment deposit ownership.",
      "constraint": "No individual borrower cash/debt/income/property books. Counts and deposit liabilities cannot be relabeled as spendable cash. Use stable existing population references; do not create duplicate customers."
    },
    {
      "source": "src/engine/market-economy.js:1,58-72",
      "authoritative": "Finite community/union deposit and relationship pools.",
      "constraint": "No outside-bank settlement cash or borrower debt. MARKET_RESOURCES intentionally excludes loans. Small-business/merchant counts are not funded operating-company books."
    },
    {
      "source": "src/engine/accounting.js:17-18; src/engine/credit.js:32-42",
      "authoritative": "Each bank starts with $9.5M canonical credit, spread into market cohorts and 12/24/36/48 remaining maturities.",
      "constraint": "These loans have no borrower identity. They are not the six anchor companies' separately endowed outside-creditor debt."
    }
  ],
  "minimumBoundary": {
    "identity": "Use Group7 only, explicit creation-time initialization, strict peer support and save-version mapping. No automatic import upgrade, second saved feature map, or extra checkbox. Preserve exact Group1-6 fixtures.",
    "canonicalPrincipal": "Extend p.creditBook once with a strict discriminated legacy-opening/cohort and living-contract union. Sum every principal exactly once to marketBook.markets[k].loans and accounting.accounts.loans. A borrower registry may hold liabilities/cash, but never another bank asset-principal book.",
    "borrowerSnapshot": "buildLoanPartySnapshot(g) resolves company IDs by reference to CompanyFinance, not copied mutable cash. ExistingDebt includes outside debt plus both banks' canonical claims; existingUndrawn includes every lender. Borrowing limits, sector and collateral are explicitly authored/validated, not inferred wealth from deposits.",
    "noncompanyFoundation": "Before activating household and small-business offers, add funded borrower wallets and matched debt with ownership references to conserved populations, plus identified payer-funded income/spending flows. New loan proceeds may seed cash via the real bank transfer; recurring income cannot be fabricated. Any opening wallet allocation must be an explicit reclassification of existing modeled assets, not a second copy of deposits. Without this foundation only corporate commercial/CRE can be honestly connected first.",
    "collateral": "Identify actual assets and owner once; any corporate CRE assets must partition the existing 72*baseFee businessAssets without adding asset value. Reconcile live pledged portions across both banks and outside creditors; underwater existing claims remain valid but block excess new lending.",
    "prepare": "prepareLivingCreditMonth(g,plans) validates and freezes one shared borrower/collateral snapshot and both banks' actually paid origination/admin capacity, cash reserves, all optional commitments, undrawn liquidity obligations, sector and capital headroom. No provideCash(), automatic borrowing, or sequential seat advantage.",
    "servicing": "serviceLivingCreditOnce(g,month) computes both lenders together from one funded payer budget, after authored corporate income/obligation priority and before new advances. Post paired bank/borrower principal and interest claims atomically, never generic cash-income deltas. Separate accrued receivable, suspended contractual interest and realized recovery.",
    "origination": "clearLivingCreditOnce(g,plans,snapshot) returns accepted contracts, declines, paired movements and consumed capacity. Commit all results transactionally and idempotently only after full validation. Opening origination budgets must not recycle same-pass fees or a rival's execution order.",
    "reporting": "Owner quotes explain gross production, scheduled repayments, principal recovery, losses, interest accrued/paid/suspended, undrawn commitments, funding and capital used. Reconcile bank and group profit without reposting. Public views contain approved aggregate borrower evidence only, not rival offers or private individual finances."
  },
  "companyChanges": {
    "proposedBoundary": "New CompanyFinance version for Group7, preserving existing v2/v3. Partition external-creditor principal/interest from new bank-loan principal/interest and retain existing service-fee arrears independently.",
    "cash": "Add a dedicated signed lendingCashNet per bank: corporate-world cash + existing bankCashPaid + agencyCashNet + sum(lendingCashNet) equals openingCash. Advance into company cash is a negative outward flow; repayment/fees to bank are positive. Never misuse bankCashPaid or agencyCashNet.",
    "debt": "Company total debt equals retained outside-creditor debt plus canonical live bank principal; corporate:creditors.businessAssets matches only its own principal and accrued claim. Do not run the old .005 interest/principal schedule on new bank debt too.",
    "receivables": "Bank receivables need exact attributed sum of corporate service fees and contract accrued interest (plus any other approved claim class). Current validateCorporatePlayer requires equality to service-fee arrears alone.",
    "failure": "Extend actual liquidation claim priority/recovery/writes-offs to every lender and secured collateral before claiming company lending integrated; current resolution pays only corporate:creditors, suppliers and fee arrears."
  },
  "legacyOpening": {
    "safeInterim": "Retain the $9.5M opening book as explicitly grandfathered legacy cohorts in the same canonical bank book, with historical terms/run-off untouched; new contracts are separately tagged, not a duplicated asset book.",
    "limitation": "Legacy repayments/collections currently credit bank cash without funded borrower debits. Keeping this compatibility path is not global funded-household conservation. Do not invent borrowers, cash, collateral or retrospective origination history to disguise it.",
    "completion": "If full Group7 funded servicing of opening credit is required, first author an explicit opening borrower/debt/funded-payment allocation and test whole-world reconciliation. It cannot be inferred from current customer counts or the six company debts."
  },
  "dispatchRequired": [
    {
      "source": "src/engine/operation-coordinator.js:33-36",
      "change": "Dispatch settleCreditPerformance and repayCredit only to legacy cohorts. Living contracts must not get automatic legacy amortization, aging, recovery or charge-offs."
    },
    {
      "source": "src/engine/accounting-adapter.js:43-92",
      "change": "Suppress legacy formula new loan delta and generic cohort interest cash posting for living origination/servicing. Feed actual loan-stage reports into operating totals without charging twice."
    },
    {
      "source": "src/engine/credit.js:8-28",
      "change": "compactCredit cannot merge different borrower/contract identities or discard paid principal when unpaid interest remains. reconcileCredit must assert living equalities, not silently invent/remove contracts to balance market totals."
    },
    {
      "source": "src/engine/project-coordinator.js:48-102; src/engine/accounting-adapter.js:8-14,98-105",
      "change": "Acquisition, regulatory sale and liquidity sale must preserve legal borrower contract and original terms while transferring lender participation. Current generated ID encodes bankId, so originator identity and current holder must be distinguished. Arbitrary pro-rata takeCredit cannot safely split pledged contracts."
    },
    {
      "source": "src/engine/institution.js:5; src/engine/department-function-context.js:71",
      "change": "Use actual product risk weights and undrawn obligations in global capital/funding checks. Separate origination capacity from ongoing admin/collection workload and preserve physical staff once."
    }
  ],
  "acceptance": [
    "Exact Group1-6 creation, human/AI settlement, RNG, resume, rematch, public projection and existing golden fixtures unchanged.",
    "Fresh Group7 opening principal exactly $9.5M per bank, zero accidental new debt/assets/cash, explicit legacy boundary.",
    "One real funded company advance, borrower-paid fee, funded service, arrears, nonaccrual, recovery and liquidation; competing bank claims share one payer and collateral registry.",
    "Every household/business offer remains visibly unavailable until its actual funded counterparty foundation exists; do not call seven offers integrated because catalog rows render.",
    "Bank loans == local loans == canonical principal; borrower liabilities == creditor assets; bank receivables == attributed unpaid claims; world cash crosses only signed paired boundaries.",
    "Same-month duplicate/reordered messages, half-ready save/resume, old-peer refusal, private quotes, loan acquisition and emergency asset-sale preservation.",
    "Respect current 10000-cohort bank limit and prototype 20000-contract combined limit. 360-month maturities and zero-principal unpaid claims need new validators; no dropped contracts to pass capacity.",
    "Compact stable term references and bounded storage must pass real portable/save/GitHub frame limits. Synthetic kernel timing and 11.5MB contract serialization are not transport acceptance."
  ]
});
