# Release status and known issues

**September 13, 2026 · implementation incomplete.** This page owns artifact identity, known issues and release gates. The [implementation ledger](v3-usability.md) owns the full completed/remaining checklist. Detailed prior test narratives are in the [release archive](archive/release-history-2026-09-13.md).

## Which version am I looking at?

| Artifact | Identity | Status |
| --- | --- | --- |
| [Frozen V3 player ZIP](../../releases/branch-wars-v3.zip) and [matching manual](../../releases/branch-wars-v3-manual.pdf) | Published-snapshot lineage: save9.5 /134 assembly inputs | Preserved distribution; not the newest development work. Local hashes still match the frozen report. |
| [Local playable HTML](../BRANCH_WARS.html) and [V4 playtest package](../../releases/branch-wars-v4.zip) | Checkpoint65 / Expanded save9.28 | Rebuilt for the explicitly requested V4 playtest publication. Matches current source; not a final release gate pass. |
| [Current source](../src/manifest.json) | Checkpoint65 /193 inputs; ordinary Expanded starts9.28 | Setup/lobby and affected-subsystem integration pass. Long-run viability and final release acceptance remain open. |
| [Checkpoint65 review artifact](../output/BRANCH_WARS_expanded65_review.html) | Source-matching integrated Expanded lending /193 inputs | Developer review artifact with ordinary Core/Expanded selection. Not a final player release or full gate pass. |
| [Checkpoint64 review artifact](../output/BRANCH_WARS_creditrival64_review.html) | Preserved company-credit rival workflow /193 inputs; no longer matches current source | Developer review artifact; company lending here still requires explicit9.28 creation. Not a player release or full gate pass. |

The existing PDF matches the frozen V3 package; it is **not yet the comprehensive manual for the final Expanded candidate**. Archive/tag/publication statements describe their original release. No remote state was changed or reverified by this cleanup.

## Exact local fingerprints

| File | SHA-256 |
| --- | --- |
| Frozen ZIP | `85dae43104c4c68f106b371b6ead8891a453bd08a4198162133a493e3a7ab28f` |
| Frozen manual PDF | `b577325f9c4fd34a2e73a3feda41acd47dc4e0ecd7b2b3c3dfec568cb5b9e1ed` |
| Frozen packaged HTML | `4d616ad43145baac692d49aa6f864fefe96e0fffa7396cc81554107ee21cd107` |
| Local playable HTML / V4 packaged HTML | `1c488be30061e6729b56bc0a6bf81f838aec7dc039916284429509a06659df00` |
| Checkpoint51 Expanded artifact | `c22b610643d5b67174d0c0be0f9054e3180d6c031257435e86a726f5a5ed0bc7` |
| Checkpoint53 earnings repair | `8bf31b8f2725074c06b7dbbc1b1ccae8372f5ec09cea6a17292e47aa2dc7a329` |
| Checkpoint54 Credit workspace | `4a3de860a523d8754d0b2a5b2647c27f042ed375f806d1544bbeb71889ee90de` |
| Checkpoint55 Research delivery | `afde61a6409a0c176a8586f682431bf5817db8712eef1613beaab7e88562c001` |
| Checkpoint56 credit foundation | `dbb982bb7baa079b57cff752d1341873c73b07c26d27a38fcd7d96894cefd530` |
| Checkpoint57 credit trading | `2bc2ca41f6675d2cd0874219fffd7a24847927f27c99cd74e3c5100a4fc43cc2` |
| Checkpoint58 bank credit review artifact | `c364cf4266df44e46ba6266aa6455e0e550e1d811873c752215c7aa4e6dc838d` |
| Checkpoint59 loan orders | `1b4d0a594e964ada574813fb88640c10cde2205c7a777cc5b4377b80d5e3b214` |
| Checkpoint60 credit forecast artifact | `0788b9570739bafd7db1725e4406f72d0fc383ecc91dff359da68fde10b5ec90` |
| Checkpoint61 cash location | `b6bbcfcf1ba2518c5aa74fb701d80985a56874068e7540de4572e399af2a6ea7` |
| Checkpoint62 campaign integration | `316558349a6548a7ce35f67aaa8a2c621a4be6dc0094c1f0e80e043ed3d3cfc2` |
| Checkpoint63 customer loan desk | `ec9a84e55a443f9c144fd14b57fc86fa32adb3df9aab5607ae4cb839b6373db4` |
| Checkpoint64 rival credit artifact | `59b0a937acbebb28e93c699041a6d9aa70b7cf0ff5ef999b8aec5df6d3cf4b40` |
| Checkpoint65 review artifact / current assembled source | `1c488be30061e6729b56bc0a6bf81f838aec7dc039916284429509a06659df00` |

Hashes identify bytes, not balance, usability or universal correctness.

The [checkpoint62 initial report](../output/master-checkpoint62-verification.json) retains 26 passing tests and architecture, plus an unseeded network-test failure when underwriting correctly refused the scripted loan. The [fixed-seed network recheck](../output/master-checkpoint62-network-recheck.json) passes all three simulated transports against the same source/artifact, without changing gameplay. Both records are required; the initial report was not rewritten. Earlier [checkpoint61](../output/master-checkpoint61-verification.json), [checkpoint60](../output/master-checkpoint60-verification.json) and [checkpoint55](../output/master-checkpoint55-verification.json) reports retain prior evidence. No normal playable or frozen package was overwritten; later source edits require a new comparison. Scoped checks do not replace the full Windows gate.

## Current verification evidence

- [Checkpoint65](archive/checkpoint65-expanded-credit-2026-09-13.md): [combined exact-build acceptance](../output/master-checkpoint65-acceptance.json) covers126 affected tests after the retained initial failures and targeted historical-fixture corrections. Shared setup regressions, five transport command groups and source architecture pass. The ordinary-AI120/480-month experiment has been launched; no terminal balance result is claimed here. This does not substitute for the full Windows/package or human gates.
- [Checkpoint64](archive/checkpoint64-company-credit-rival-2026-09-13.md): [terminal exact-build record](../output/master-checkpoint64-verification.json) passes28 targeted strategy/ending, campaign, UI, old-rule, order and forecast tests, source architecture and all three simulated transports. Qualified AI lending funds once and restores exactly; actual ending-stage triggers preserve bank/company claims. Eight ordinary AI months remained valid with zero loan offers. This is not a long-run balance or final integration pass; ordinary Expanded enablement remains next.
- [Checkpoint63](archive/checkpoint63-company-credit-desk-2026-09-13.md): [exact-build record](../output/master-checkpoint63-verification.json) passes41 targeted tests, seven monthly-plan checks, source architecture and all three simulated transports. Contextual review/stage/cancel/remove, stale/locked/hotseat guards, conditional forecast funding parity and exact historical comparisons pass. [Early forecast timing](../output/master-checkpoint63-forecast-timing.json) records about101 ms median for ten month3 single-offer calculations, not browser or mature-game performance. No balance tuning, ordinary Expanded enablement or final release acceptance is claimed.
- [Checkpoint62](archive/checkpoint62-company-credit-campaign-2026-09-13.md): real paid development, submitted funding, half-ready exact replay, later repayments and rematch under9.28. Strict markers/claims/transients, numeric operating ledgers, preserved pricing traces and private views pass. Fixed-seed GitHub/LAN/direct-link simulations pass missing-capability refusal and delayed-message protection. Customer UI, AI, long-bank balance and final release acceptance remain open.
- [Checkpoint61](archive/checkpoint61-company-credit-location-2026-09-13.md): 31 targeted results plus source architecture/syntax pass. Paid account-development fixtures verify same/rival lender cash location, public-owner forecast parity and once-only deposit reporting. Controlled loan principal/interest and wholly owned group earnings reconcile. Existing Group10, Core/Expanded and paid-control tests pass. No supported credit campaign, full-bank balance, new multiplayer or browser acceptance is claimed.
- [Checkpoint60](archive/checkpoint60-company-credit-forecast-2026-09-13.md): 39 targeted tests and source architecture/syntax pass. Public-only forecasts match real lender books through healthy/stressed company trading; actual monthly banking reports reconcile without duplicated loan income. Business-loan forecasts include named claims. These explicit credit-world tests are not supported campaign enablement, full-bank balance or multiplayer acceptance.
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
| Shared-premises final acceptance | New Expanded9.28 retains same-rule AI, peer handling and contextual office controls. Paid two-office closure/replay and qualified staff-loss tests pass; whole-campaign viability, final combined reconciliation and real-browser layout acceptance remain open. |
| Long-run economic concerns | Explain and address cumulative losses, shrinking loans and ordinary-start diversification viability; retain legitimate dominance and no free catch-up. |
| Remaining approved management/product/customer/research interactions | Finish the [master checklist](v3-usability.md#master-requirement-inventory-and-finish-gates); do not replace working mechanics with placeholders. |
| Browser/UI acceptance | Inspect early and mature workflows at laptop and larger sizes. Prior local review-artifact URL access was denied; current layout acceptance remains unverified. |
| Exact final integration / packaging | Run the final Windows, lifecycle, privacy, multiplayer, conservation, performance and120/480-month strategy gates on the delivered bytes. |
| Final manual and local release package | Complete help/manual, render and visually inspect the PDF, package with matching reports and known issues. |

## Human acceptance and authority

The user explicitly authorized committing current work and publishing the V4 testing snapshot. [V4 playtest notes](../../releases/v4-playtest-notes.md) describe its limits. This does not certify implementation completion or authorize future unrelated publication; V2/V3 and main remain preserved.

Real two-computer multiplayer, long-session recovery and subjective enjoyment remain human acceptance items. Simulated peers cannot certify them. No claim of bug-free multiplayer is made.

No new user content decision blocks the next approved implementation step. National Empire, insurance underwriting, scope expansion/removal and publication remain separately reserved. This documentation cleanup authorizes no push, release update, merge, branch deletion or overwrite of frozen packages.

## Historical evidence

Use the [release history](archive/release-history-2026-09-13.md), [checkpoint index](archive/README.md#september-13-documentation-consolidation), [frozen V3 report](v3-release-report.md) and [rollback packages](../../releases/v2-stabilization-rc1/README.txt). Preserve unique failed tests, saves, reference builds and their matching manuals.
