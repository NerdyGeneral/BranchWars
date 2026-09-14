# Release status and known issues

**September 13, 2026 · implementation incomplete.** This page owns artifact identity, known issues and release gates. The [implementation ledger](v3-usability.md) owns the full completed/remaining checklist. Detailed prior test narratives are in the [release archive](archive/release-history-2026-09-13.md).

## Which version am I looking at?

| Artifact | Identity | Status |
| --- | --- | --- |
| [Frozen V3 player ZIP](../../releases/branch-wars-v3.zip) and [matching manual](../../releases/branch-wars-v3-manual.pdf) | Published-snapshot lineage: save9.5 /134 assembly inputs | Preserved distribution; not the newest development work. Local hashes still match the frozen report. |
| [Local playable HTML](../BRANCH_WARS.html) | Checkpoint37 / Expanded save9.22 | What the root/game launchers open. More recent than the frozen ZIP, older than source. |
| [Current source](../src/manifest.json) | Checkpoint59 /190 inputs; new Expanded starts9.27 | Qualified loan review and simultaneous paired funding are scoped-tested. Monthly campaign, customer controls, AI and save/peer enablement remain incomplete. |
| [Checkpoint59 review artifact](../output/BRANCH_WARS_creditorders59_review.html) | Source-matching loan-order integration snapshot /190 inputs | Developer review artifact; not a replacement for the player download or a full release pass. |

The existing PDF matches the frozen V3 package; it is **not yet the comprehensive manual for the final Expanded candidate**. Archive/tag/publication statements describe their original release. No remote state was changed or reverified by this cleanup.

## Exact local fingerprints

| File | SHA-256 |
| --- | --- |
| Frozen ZIP | `85dae43104c4c68f106b371b6ead8891a453bd08a4198162133a493e3a7ab28f` |
| Frozen manual PDF | `b577325f9c4fd34a2e73a3feda41acd47dc4e0ecd7b2b3c3dfec568cb5b9e1ed` |
| Frozen packaged HTML | `4d616ad43145baac692d49aa6f864fefe96e0fffa7396cc81554107ee21cd107` |
| Local playable HTML | `b4351e85160586e72a63519a1eb2fe6fecdfe9cba1c94cbdd8577231f5c78561` |
| Checkpoint51 Expanded artifact | `c22b610643d5b67174d0c0be0f9054e3180d6c031257435e86a726f5a5ed0bc7` |
| Checkpoint53 earnings repair | `8bf31b8f2725074c06b7dbbc1b1ccae8372f5ec09cea6a17292e47aa2dc7a329` |
| Checkpoint54 Credit workspace | `4a3de860a523d8754d0b2a5b2647c27f042ed375f806d1544bbeb71889ee90de` |
| Checkpoint55 Research delivery | `afde61a6409a0c176a8586f682431bf5817db8712eef1613beaab7e88562c001` |
| Checkpoint56 credit foundation | `dbb982bb7baa079b57cff752d1341873c73b07c26d27a38fcd7d96894cefd530` |
| Checkpoint57 credit trading | `2bc2ca41f6675d2cd0874219fffd7a24847927f27c99cd74e3c5100a4fc43cc2` |
| Checkpoint58 bank credit review artifact | `c364cf4266df44e46ba6266aa6455e0e550e1d811873c752215c7aa4e6dc838d` |
| Checkpoint59 loan orders / current assembled source | `1b4d0a594e964ada574813fb88640c10cde2205c7a777cc5b4377b80d5e3b214` |

Hashes identify bytes, not balance, usability or universal correctness.

The [checkpoint59 exact-build report](../output/master-checkpoint59-verification.json) records targeted verification of this source snapshot. The [checkpoint58 report](../output/master-checkpoint58-verification.json) and [checkpoint55 report](../output/master-checkpoint55-verification.json) retain earlier bank integration and research/delivery evidence. No playable or frozen package was overwritten; later source edits require a new comparison. Scoped checks do not replace the full Windows gate.

## Current verification evidence

- [Checkpoint59](archive/checkpoint59-company-credit-orders-2026-09-13.md): 32 targeted loan-order, funding, bank/trading, domain, assessment-UI and exact historical-boundary tests passed, plus source architecture/syntax checks. Tests establish the operating relationship through actual submitted turns, then use an explicit credit-world fixture; this is not yet playable campaign lending or a supported save upgrade. Full monthly/reporting, UI, AI, recovery and network integration remain open.
- [Checkpoint58](archive/checkpoint58-company-credit-bank-2026-09-13.md): 25 targeted tests and source architecture pass. Named assets reconcile with ordinary amortization, collections, funding-sale limits and department workload. Player orders, full campaign cash/reporting, versioned peers and release acceptance remain unfinished.
- [Checkpoint57](archive/checkpoint57-company-credit-trading-2026-09-13.md): 19 targeted credit/trading/UI/historical-boundary tests and source architecture passed. Healthy48-month repayment and120-month borrower stress conserve cash and expose real lender losses. This is not full-bank campaign balance; player loan instructions and their campaign/network adapter remain unfinished.
- [Checkpoint55](archive/checkpoint55-research-delivery-2026-09-13.md): all six combined funded research/delivery cases passed across54 resolved months, including product adoption, Treasury migration and Payroll maintenance. Prepared service-use display and targeted source UI/architecture checks passed. This is functional acceptance, not matched long-run profitability or a full release pass.
- [Checkpoint54](archive/checkpoint54-credit-workspace-2026-09-13.md): prepared Credit staffing, explained loan flows, contextual remedies and stale-control protection. Targeted engine/UI/architecture checks passed with unchanged AI and saved simulation. Final broader/human acceptance remains open.
- [Checkpoint53](archive/checkpoint53-earnings-diagnosis-2026-09-13.md): current Expanded earnings-summary repair, exact-state/RNG and historical public-view comparisons, source architecture and simulated GitHub/LAN/P2P privacy/recovery checks passed. A separate24-month checkpoint51 diagnostic reconciles all monthly financial movements; executive spending and repayments materially explain losses and shrinking loans. Further strategy/capacity investigation remains. No balance tuning or final release gate is claimed.
- [Checkpoint51 long-run report](../output/master-checkpoint51-commercial-expanded-long.json) is terminal, exit0. Balanced120 survived with retained losses and shrinking loans. Regulatory ended at month263 of480 requested, with one bank at negative capital; no validation exception. This is an early-ending balance result, not a480-month pass. [Recorded terminal observation and limitations](archive/checkpoint55-research-delivery-2026-09-13.md#completed-older-stress-observation).
- Earlier scoped passes and failed funding fixtures remain in the [checkpoint evidence index](v3-usability.md#evidence-index) and [historical archive](archive/README.md#subsequent-implementation-evidence). They are not fresh tests of this candidate.
- [Completed ordinary Balanced120 report](../output/master-checkpoint44-commercial-expanded-120.json): terminal, not running. No validation or bank failure; both banks retained cumulative losses and shrinking loan books. Neither opened investment operations or acquired control.
- Forecast visibility, independent construction destinations and five-benefit Expanded confirmation passed seven targeted portable checks plus GitHub/LAN/direct-link simulated construction tests.
- Documentation cleanup checks are separate from game debug/release checks. No new full gameplay gate is claimed here.

## Known issues and release blockers

| Issue / missing gate | Required action |
| --- | --- |
| Shared-premises final acceptance | New Expanded9.27 includes same-rule AI, peer handling and contextual office controls. Paid two-office closure/replay and qualified staff-loss tests pass; whole-campaign viability, final combined reconciliation and real-browser layout acceptance remain open. |
| Long-run economic concerns | Explain and address cumulative losses, shrinking loans and ordinary-start diversification viability; retain legitimate dominance and no free catch-up. |
| Remaining approved management/product/customer/research interactions | Finish the [master checklist](v3-usability.md#master-requirement-inventory-and-finish-gates); do not replace working mechanics with placeholders. |
| Browser/UI acceptance | Inspect early and mature workflows at laptop and larger sizes. Prior local review-artifact URL access was denied; current layout acceptance remains unverified. |
| Exact final integration / packaging | Run the final Windows, lifecycle, privacy, multiplayer, conservation, performance and120/480-month strategy gates on the delivered bytes. |
| Final manual and local release package | Complete help/manual, render and visually inspect the PDF, package with matching reports and known issues. |

## Human acceptance and authority

Real two-computer multiplayer, long-session recovery and subjective enjoyment remain human acceptance items. Simulated peers cannot certify them. No claim of bug-free multiplayer is made.

No new user content decision blocks the next approved implementation step. National Empire, insurance underwriting, scope expansion/removal and publication remain separately reserved. This documentation cleanup authorizes no push, release update, merge, branch deletion or overwrite of frozen packages.

## Historical evidence

Use the [release history](archive/release-history-2026-09-13.md), [checkpoint index](archive/README.md#september-13-documentation-consolidation), [frozen V3 report](v3-release-report.md) and [rollback packages](../../releases/v2-stabilization-rc1/README.txt). Preserve unique failed tests, saves, reference builds and their matching manuals.
