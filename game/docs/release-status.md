# Current release status

Updated: 2026-09-05.

## Implemented build

The current game is the two-region Living Bank preview with accounting/funding, persistent rivalry, product/credit books, commercial service contracts, capability deployments, customer goodwill and the Service Workforce Planner. See [roadmap](roadmap.md) for incomplete packages. Specialist training budgets, financial-group subsidiaries, company shares and full national management remain ahead.

Game source SHA-256: `132168f234a891f9dcabce409dc5d4289de5cf769977858f369020b5879ef128` (also the LF-normalized text hash; a CRLF checkout has different raw bytes). The shared-project-rule batch changes source structure and UI eligibility handling, not intended valid-campaign behavior or save rules. Twelve project/validation overrides are removed; see [architecture](architecture.md) for exact boundaries. Fixed campaign and save expectations have not been regenerated.

The package path is `game/`; use the repository-root launchers and retarget old filesystem shortcuts. This batch does not add national/group gameplay or complete the blueprint.

## Current-source evidence and limits

- The shared-project-rule suite passes 1,296 comparisons with the preserved pre-refactor engine, plus invalid project IDs, regional entry pricing, conflicting deployments, execution-time resource changes, seat-relative exits and real UI handlers in DOM sinks.
- Twenty fixed campaigns / 790 turns and three preserved half-ready save imports/continuations pass unchanged. Core engine, service-workforce and override-ceiling suites passed separately.
- [Current full regression](../reports/baselines/N-00-2026-09-05T18-02-53-761Z.json): 43/43 invocations passed, including LF/CRLF reference generation, shared project rules, Windows LAN and simulated GitHub recovery. Source/runtime fingerprints remained unchanged and repeated seeded balance output matched.
- [Current campaign audit](../reports/baselines/release-balance-2026-09-05T18-17-49-829Z.json): 16 expanded-services campaigns / 1,920 turns passed, with zero skipped/cancelled initiatives and all campaigns still active at turn 120. Every report field except the source fingerprint matches the foundation audit. Management/customer previews are OFF in this audit; their dedicated regression and fixed-campaign coverage remain separate.
- This batch has no fresh screenshot or physical two-computer acceptance. Passing simulations are not proof of equal strategies or satisfying human victory pacing. AI reserve/retry quality, real two-computer acceptance and multi-session national play remain outstanding.

## Historical evidence

The reports below cover the previous source hash `ff15fce9f8e4af3ebb6024c0b4d984dba3cededee0d8a4f7e5bb2f245a62453c`, not the refactored source above.

- [Stabilization full regression](../reports/baselines/N-00-2026-09-05T15-09-38-214Z.json): 39/39 invocations passed from the relocated package; runtime/source fingerprints remained unchanged during the run. This includes the 20-campaign / 790-turn committed behavior baseline and Windows LAN.
- Additional fixed saved-game outcome and Windows root-launcher tests passed separately, then were added to the foundation runner (41 invocations at that point). The historical 39-test report is not relabeled as a later larger run.
- An isolated relocated LAN server served byte-identical HTML at both the root route and `/BRANCH_WARS.html`. This is local acceptance, not a physical two-computer test.
- [Stabilization campaign audit](../reports/baselines/release-balance-2026-09-05T15-24-31-371Z.json): 16 expanded-services campaigns / 1,920 turns passed; no skipped or cancelled initiatives in this sample, and all campaigns remained active at turn 120. This run uses management/customer previews OFF; it does not replace the goodwill evidence below.
- The foundation fast command passed after adding both supplemental tests. An initial Windows hosted failure exposed mixed-line-ending formatting in the reference generator; commit `e890596` normalizes inputs and adds all eight LF/CRLF input combinations. The hosted fast rerun passes; the Windows rerun remains in progress.

- [Earlier mechanics regression](../reports/baselines/N-00-2026-09-05T13-43-26-566Z.json): 36/36 invocations passed on the previous game bytes, including replay, saves, ledger, simulated GitHub recovery and Windows LAN checks.
- [Same-source long audit](../reports/baselines/release-balance-2026-09-05T13-48-56-199Z.json): 16 campaigns / 2,880 turns; accounts reconciled and all campaigns remained active. Four cash-change cancellations were explicit and uncharged.
- [Workforce batch details](archive/service-workforce-status.md): browser layout, draft actions and save continuation checks, plus scope limits.

The architecture foundation protects incremental refactoring through committed expectations, preserved save fixtures, an override-debt guard and automated PR checks. Creation/migration, operations, project completion and most AI layers still remain; this is not completion of the engine cleanup.

## GitHub delivery

PRs #1–#6 are merged. Seven retired branch tips were preserved in verified archive tags before their names were deleted; recovery details are in the architecture document. The foundation is submitted as [PR #7](https://github.com/NerdyGeneral/BranchWars/pull/7), without automatic merge. Shared project rules are being prepared on `refactor/shared-project-rules`, based on the unmerged foundation branch; neither batch is yet on `main`.
