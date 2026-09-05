# Current release status

Updated: 2026-09-05.

## Implemented build

The current game is the two-region Living Bank preview with accounting/funding, persistent rivalry, product/credit books, commercial service contracts, capability deployments, customer goodwill and the Service Workforce Planner. See [roadmap](roadmap.md) for incomplete packages. Specialist training budgets, financial-group subsidiaries, company shares and full national management remain ahead.

Checked workspace game SHA-256: `dfebd6409b783dcd8d3284da130375d7de478cc5c2e7756a71b2c3bfc0a68232`. LF-normalized source SHA-256: `9567c23532f8e5abcb71c50fef91ef87b3c07f924907dc490ea577fc12f07dca`; checkout line endings can change raw bytes.

The lifecycle batch removes sixteen creation overrides and one browser repair override, following the prior twelve project/validation layers. Save migration is now engine-owned. See [architecture](architecture.md) for exact boundaries. Fixed campaign and save expectations have not been regenerated; no balance or save-rule change is intended.

The package path is `game/`; use the repository-root launchers and retarget old filesystem shortcuts. This batch does not add national/group gameplay or complete the blueprint.

## Current-source evidence and limits

- The lifecycle suite passes 1,387 independent creation comparisons and 41 migration comparisons with the preserved implementation, including all optional-stage combinations, random consumption, both seats' sealed plans, legacy repairs and non-mutating rejection.
- [Lifecycle full regression](../reports/baselines/N-00-2026-09-05T18-42-11-641Z.json): 44/44 invocations passed, including fixed campaigns/save continuations, lifecycle comparisons, accounting, Windows LAN and simulated GitHub recovery. Source/runtime fingerprints stayed unchanged and repeated balance output matched.
- [Lifecycle campaign audit](../reports/baselines/release-balance-2026-09-05T18-58-35-399Z.json): 16 expanded-services campaigns / 1,920 turns passed with no skipped/cancelled initiatives. Every non-source-fingerprint field matches the prior project-rule audit; all campaigns remain active at turn 120. This audit has management/customer previews OFF; their separate regression and fixed-campaign coverage remains active.
- The generated game reference remains current without regeneration: this batch changes no documented product, pricing or mechanics tables.
- This batch has no fresh screenshot or physical two-computer acceptance. Passing simulations are not proof of equal strategies or satisfying human victory pacing.

## Prior project-rule evidence

The reports in this section cover source `132168f234a891f9dcabce409dc5d4289de5cf769977858f369020b5879ef128`, not the lifecycle refactor above.

- The shared-project-rule suite passes 1,296 comparisons with the preserved pre-refactor engine, plus invalid project IDs, regional entry pricing, conflicting deployments, execution-time resource changes, seat-relative exits and real UI handlers in DOM sinks.
- Twenty fixed campaigns / 790 turns and three preserved half-ready save imports/continuations pass unchanged. Core engine, service-workforce and override-ceiling suites passed separately.
- [Project-rule full regression](../reports/baselines/N-00-2026-09-05T18-02-53-761Z.json): 43/43 invocations passed, including LF/CRLF reference generation, shared project rules, Windows LAN and simulated GitHub recovery. Source/runtime fingerprints remained unchanged and repeated seeded balance output matched.
- [Project-rule campaign audit](../reports/baselines/release-balance-2026-09-05T18-17-49-829Z.json): 16 expanded-services campaigns / 1,920 turns passed, with zero skipped/cancelled initiatives and all campaigns still active at turn 120. Every report field except the source fingerprint matches the foundation audit. Management/customer previews are OFF in this audit; their dedicated regression and fixed-campaign coverage remain separate.
- This batch has no fresh screenshot or physical two-computer acceptance. Passing simulations are not proof of equal strategies or satisfying human victory pacing. AI reserve/retry quality, real two-computer acceptance and multi-session national play remain outstanding.

## Historical evidence

The reports below cover the previous source hash `ff15fce9f8e4af3ebb6024c0b4d984dba3cededee0d8a4f7e5bb2f245a62453c`, not the refactored source above.

- [Stabilization full regression](../reports/baselines/N-00-2026-09-05T15-09-38-214Z.json): 39/39 invocations passed from the relocated package; runtime/source fingerprints remained unchanged during the run. This includes the 20-campaign / 790-turn committed behavior baseline and Windows LAN.
- Additional fixed saved-game outcome and Windows root-launcher tests passed separately, then were added to the foundation runner (41 invocations at that point). The historical 39-test report is not relabeled as a later larger run.
- An isolated relocated LAN server served byte-identical HTML at both the root route and `/BRANCH_WARS.html`. This is local acceptance, not a physical two-computer test.
- [Stabilization campaign audit](../reports/baselines/release-balance-2026-09-05T15-24-31-371Z.json): 16 expanded-services campaigns / 1,920 turns passed; no skipped or cancelled initiatives in this sample, and all campaigns remained active at turn 120. This run uses management/customer previews OFF; it does not replace the goodwill evidence below.
- An initial Windows hosted failure exposed mixed-line-ending formatting in the reference generator; commit `e890596` normalizes inputs and tests all eight LF/CRLF combinations. Its hosted rerun passed all 42 regression invocations, then hit the 40-minute job timeout during the separate campaign audit. Commit `56113e6` increases the job budget to 60 minutes without removing any test. The refreshed foundation and project-rule workflows are running; a cancelled full workflow is not a full hosted pass.

- [Earlier mechanics regression](../reports/baselines/N-00-2026-09-05T13-43-26-566Z.json): 36/36 invocations passed on the previous game bytes, including replay, saves, ledger, simulated GitHub recovery and Windows LAN checks.
- [Same-source long audit](../reports/baselines/release-balance-2026-09-05T13-48-56-199Z.json): 16 campaigns / 2,880 turns; accounts reconciled and all campaigns remained active. Four cash-change cancellations were explicit and uncharged.
- [Workforce batch details](archive/service-workforce-status.md): browser layout, draft actions and save continuation checks, plus scope limits.

The architecture foundation protects incremental refactoring through committed expectations, preserved save fixtures, an override-debt guard and automated PR checks. Monthly operations, project completion, remaining policy validators and most AI layers still remain; this is not completion of the engine cleanup.

## GitHub delivery

PRs #1–#6 are merged. Seven retired branch tips were preserved in verified archive tags before their names were deleted; recovery details are in the architecture document. The foundation is [PR #7](https://github.com/NerdyGeneral/BranchWars/pull/7) and shared project rules are [PR #8](https://github.com/NerdyGeneral/BranchWars/pull/8). Lifecycle work uses `refactor/campaign-lifecycle`, based on the project-rule branch. These PRs are not automatically merged and the refactors are not yet on `main`.
