> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# N-02a: corrected funding semantics

Implemented locally September 4, 2026. This is the first accounting correction, not completion of N-02 or a reconciled full balance sheet.

## Rules and save boundary

New campaigns default to fundingRulesVersion 2. The campaign and both players persist the version. Imports with no version remain legacy version 1; inconsistent/unknown versions are rejected. Rematches retain the prior campaign's funding version. Do not mix old and new HTML builds between friends: transport version negotiation is not yet implemented.

Version 1 retains its previous economic formulas for ongoing saves. The existing engine suite now explicitly exercises that legacy contract; funding.test.js separately exercises version 2 and 24 full modern campaigns. This avoids deleting old assertions simply to make changed rules pass.

## Version 2 changes

- Capital ratio uses current loan exposure, not deposits as a risk asset. With the existing opening capital/loan balances, the opening ratio is 18.9% rather than 12.6%. This remains a simplified loan-exposure measure; it is NOT a complete regulatory risk-weighted-asset model.
- Ordinary contested deposit outflows do not impose the old automatic 5% equity penalty. Loan/deposit/customer book acquisition also no longer applies the old unexplained 2.5% deposit-based equity loss to its target. Other acquisition mechanics are unchanged.
- Funding settlement uses available cash, then sells loans with an explicit 6% haircut, then records residual funding as emergencyDebt. Borrowed money is immediately used to settle the external outflow rather than credited a second time to usable cash.
- Small gaps are no longer silently forgiven. Whole-dollar loan sale rounding leaves genuine surplus proceeds in cash. Focused tests reconcile the changes in cash + loans - deposits - emergency debt - equity for these transactions.
- Emergency debt costs 1% per monthly cycle, added to funding expense in both operating preview and actual operation. This is a provisional game parameter, not a real-world financing quote. New debt begins costing interest on the next operating stage.
- When there is no current funding shortfall, cash above the capital-policy reserve automatically repays debt: 10% of deposits for Build Liquidity, 5% for Balanced, 2% for Reinvest. Repayment reduces both cash and debt; it is not an expense or equity loss. There is no discretionary debt-trading UI in this patch.
- Version 2 capital and cumulative earnings may be negative; explicit realized losses are not clamped away. The existing critical-capital streak still governs receivership. If both institutions reach terminal failure, neither is declared the winner based on being slightly less insolvent.
- Operations displays the saved rules version, loan-exposure meaning, owned emergency debt, interest and repayment policy. Rival emergency debt is not added to public stats.

## Verification

Funding tests cover default/invalid version, legacy compatibility, cash-funded deposit conservation and equity preservation, 1/9/999/1000/1001/100000-dollar funding gaps, haircut/debt reconciliation, negative equity, interest previews, repayment reserve, privacy, invalid outflow and simultaneous failure. They also run 24 modern campaigns to an audit horizon and validate their ledger history.

The full runner includes the new tests, two modern 800-game audits and one explicitly legacy 800-game audit. Modern balance is measured separately; the legacy audit should reproduce the prior N-01 economic output. No strategic multiplier tuning is mixed into this patch.

Browser smoke uses an isolated loopback origin: new campaign displays 18.9% and the Funding Rules 2 notice, a turn resolves, and reload/continue preserves the new rules. No console errors were observed. This is not physical two-PC acceptance or a mixed-version compatibility guarantee.

### Captured results

Full regression evidence: ../../reports/baselines/N-00-2026-09-05T00-59-22-328Z.json. All suites passed; two modern 800-game audits produced identical output, and the legacy audit reproduced the preceding N-01 output.

Modern outcomes: 771 buyouts, 29 domination, zero receiverships; all 800 completed before 500 turns, none exceeded 250. Length median 59 overall, 62 nationally (national p90 83, max 235). Legacy national median remained 55. The dominance of buyouts and absence of receivership in this AI sample are follow-up balance findings, not proof that the new economy is balanced or that long-form rivalry is solved.

After the captured audit, an import-only guard was added to reject missing/non-finite/negative/non-integer emergency debt in version 2 instead of silently repairing it away. Tests also check unversioned saves remain version 1 and inconsistent player/campaign funding versions fail. Engine, funding, determinism, ledger, save-integrity and transport suites were rerun on the final source; the browser restore check passed again. The audit calculations were not changed by that final import guard. Final BRANCH_WARS.html SHA-256: 04072BFDC3A59992D3F712F85E7EAB029AEAA62965A1BBE3752B0416FDE4BFDC.

## Not yet solved

The opening 13.9M unrepresented asset gap remains. We did not create a balancing asset and pretend it was earned income or freely spendable cash. The next accounting work must explicitly represent opening assets and route all production, lending, expenses, awards, acquisitions, and capital changes through account postings. Retained-profit rules and legacy operating cash generation are still simplified and do not satisfy full double-entry accounting.

Emergency lending is currently an uncapped last-resort liability with an interest burden, not a complete lender eligibility/collateral model. Origination, collateral, and repayment refinement belongs with the represented asset/funding accounts. A bank cannot indefinitely evade signed-equity losses by converting a funding shortfall into debt, but this design still needs economic stress balancing.

Market exclusion, automatic buyout thresholds, map size, products, research, departments, insurance and brokerage are unchanged. N-03 persistent rivalry and N-04 regions remain future work. Changes are uncommitted and not pushed.
