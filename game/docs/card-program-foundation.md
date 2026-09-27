# Future card programs: implementation contract

**September 27 update:** The bounded partner-issued model is implemented in
[Expanded 9.39](partner-cards.md), with calibrated costs, fixed customer terms
and no rewards. Existing 9.38 contracts retain their original economics.
The text below preserves the original design contract. Bank-issued cards and
additional product types remain future work; this document alone is not evidence
of verification. Consult [release status](release-status.md) for current checks.

The original 9.37 scope was a specification, not a playable card launch. Its
one-month outside-bank advance was a funding foundation, not a
revolving-card receivable engine.

| Role | Partner-issued model | Bank-issued model |
| --- | --- | --- |
| Issuer | Cedar Reserve Bank (`company:acquisition-lender`) | Player's regulated bank, not its holding company |
| Receivable owner and funder | Outside bank; purchases consume its actual available cash | Player bank; purchases consume actual protected lending funds |
| Servicer | Explicit contract; may be outside bank or player | Player or a separately priced servicing vendor |
| Processor | Contracted transaction infrastructure | Contracted infrastructure; no receivable ownership or default risk merely from processing |

Partner-issued compensation must be an explicit earned fee or revenue share
paid by the outside issuer. The player bears its own acquisition, staffing,
processing and contractual costs. Cardholder principal and issuer receivables
must not appear as player-bank income or owned loans. Bank-issued purchases
create player-bank receivables with matched cash settlement to a funded merchant
counterparty; a processor fee does not transfer ownership or credit risk.

Reuse existing components deliberately:

- `OutsideFunding` identity and finite shared lender book for the partner
  counterparty; future card funding must compete with its existing commitments.
- `AccountingPrototype` and `GroupAccounting` paired postings and equity checks.
  A separate card subledger must reconcile to the actual receivable owner's book.
- `CompanyFinance` cash counterparties and `CompanyCredit` examples of scheduled
  debt, accrued interest, cash payment, arrears, write-offs and recovery.
- `CreditProducts`, portfolio capital/liquidity limits and owner-private planning.
- DepartmentFunctions/Dispatch/Delivery for finite sales, servicing, fraud and
  exception handling; existing deployment projects for build/license work.
- The shared draft, Review, campaign version registry, migration, public-view
  privacy, ledger and save/reload tests.

Original implementation obligations, before launch:

1. **Limits and underwriting:** whole-dollar account limits, used/available
   credit, authorization holds, affordability and credit risk. Unused lines are
   commitments, not cash or outstanding receivables.
2. **Purchases and clearing:** authorizations, reversals, settled purchases,
   funded merchant payments, processor fees and failed settlement; prevent the
   same funds or available credit being spent twice.
3. **Statements and interest:** statement dates/balances, due dates, minimum
   payments, grace periods and their loss/restoration, daily/monthly interest
   convention, disputed amounts and transparent estimates versus earned income.
4. **Payments:** actual payer cash, allocation between principal/interest/fees,
   returned payments, refunds and credits; conserve principal and lender claims.
5. **Rewards:** funded reward liability, earning, redemption, expiry and who
   bears the cost. Never pay rewards from an unrecorded source.
6. **Delinquency and losses:** age buckets, limits on further authorizations,
   servicing capacity, accrual suspension, provisions/charge-offs, recoveries and
   cessation/wind-down of a program with outstanding cardholder obligations.
7. **Contracts and reporting:** issuer/funder/servicer/processor identities,
   compensation, liabilities, consumer balances and retained owner records.
   Separate principal, accrued income, cash collected, direct costs and any
   explicitly labelled allocation of shared costs.

The future platform must demonstrate funded purchase → statement → actual
payment and default paths, boundary versions, persistence, matching counterparty
accounting, privacy and legal AI access. A license fee, button or forecast is
insufficient evidence that Cards works. Ownership stakes and correspondent
contracts remain independent: neither borrowing nor processing creates shares.
