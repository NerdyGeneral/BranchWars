# V4 Expanded playtest — v4.0.0-rc2

September 14, 2026. This development playtest is **not implementation-complete or balance-certified**. Source and package are published on `release/v4-playtest`; main and V2/V3 are not overwritten. The previous `v4.0.0-rc1` tag preserves the prior V4 package.

## What changed since rc1

- Bank statements distinguish loan interest, commercial/service fees, sustaining expenses and legacy abstract income. Actual results, standing policies, proposed plans and history have distinct presentations.
- Credit and commercial servicing consume shared finite workforce capacity. Current-version economic rules remove unsupported automatic income and use provisionally revised base payroll. Core has explicit balance-sheet support; older supported saves retain their original rules.
- Funding review separates organic deposit growth from recorded competitive movements. Missing records are unavailable, not invented zeroes.
- Contextual office/client controls and workforce explanations are refined. Historical service agreements without company profiles no longer crash the directory, inspector or bid review.
- The Windows launcher now uses the central test gate, with incremental failure receipts and source-change detection.

Earlier V4 features remain: multi-market construction, company deposits/loans, research and delivery, qualified departments/leadership, advertising, agency, investment businesses, shared premises and company ownership/control. The Expanded confirmation describes five benefits instead of internal prerequisites.

## Exact game identity and evidence

The199-input game HTML SHA256 is `ac5753947ebbc9106c4fff5df2c0fcd893476826b52c202c477bade61e288f92`. Engine SHA256 is `b5e431190d86109aaa4a3fc6dd6a47ddd0d5b5a4557bec107f1ba95857641642`. New campaigns use Core8.19 / Expanded9.32; supported older campaigns retain their saved rules.

- The targeted continuation completed21/21 commands with unchanged sources, including reporting, accounting/workload and simulated network/privacy checks.
- The engine suite,18 reporting/legacy UI tests and324-turn service regression pass on the exact current portable. Service testing recorded47 ownership changes.
- Packaging regressions verify the six-file allowlist, tamper rejection and immutable copies.
- A separately extracted copy of the staged GitHub source passes build, documentation, architecture, reference-byte, current-edition, funding/legacy UI and packaging checks without local untracked diagnostics.
- The preceding complete Windows baseline **failed:208/210** on the older UI artifact. The two failing areas were repaired and rechecked, but that does not create a new full-suite pass. Its original failed receipt is preserved.

The [V4 package verification](v4-verification.json) records this ZIP's hash and exact extracted-file/runtime checks. Broader evidence and failed experiments remain in [release status](../game/docs/release-status.md); targeted checks do not certify the full release.

## UI, balance and outstanding checks

- UI actions and financial explanations are better connected, but workforce clarity, mature-bank density and real visual acceptance are unfinished. Automated rendering tests do not establish intuitive gameplay.
- Conventional lending versus fee-based strategies remains the main balance concern. A cautious lender survived24 Balanced months with$9.38M cash but lost$939K cumulatively and its loan book fell to$5.42M. A separate fee-oriented Rate campaign reached120 months with much stronger fee than loan-interest income. These are policy-specific experiments, not proof that every lender fails or every commercial strategy wins. Deposit dominance is not itself a bug.
- Automatic score/stalemate endings still prevent some solvent long campaigns from continuing; changing these rules remains a separate decision. An early-ended campaign is not a480-month pass.
- The final complete Windows gate, mature performance checks and actual two-computer acceptance remain pending.
- A comprehensive updated manual/PDF remains pending. The V4 quick-start is supplied; the V3 PDF is preserved with its older release.
- National Empire and insurance underwriting are not included.

Raw campaign/diagnostic dumps, access tokens and unrelated temporary files are not part of the release. Existing local copies remain preserved.
