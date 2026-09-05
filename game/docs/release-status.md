# Current release status

Updated: 2026-09-05.

## Implemented build

The current game is the two-region Living Bank preview with accounting/funding, persistent rivalry, product/credit books, commercial service contracts, capability deployments, customer goodwill and the Service Workforce Planner. See [roadmap](roadmap.md) for incomplete packages. Specialist training budgets, financial-group subsidiaries, company shares and full national management remain ahead.

Game source SHA-256: `ff15fce9f8e4af3ebb6024c0b4d984dba3cededee0d8a4f7e5bb2f245a62453c`. The stabilization foundation does not change game bytes, save rules or simulation behavior. The package path changed to `game/`; use the new repository-root launchers and retarget old filesystem shortcuts.

## Evidence and limits

- [Stabilization full regression](../reports/baselines/N-00-2026-09-05T15-09-38-214Z.json): 39/39 invocations passed from the relocated package; runtime/source fingerprints remained unchanged during the run. This includes the 20-campaign / 790-turn committed behavior baseline and Windows LAN.
- Additional fixed saved-game outcome and Windows root-launcher tests passed separately, then were added to the runner (now 41 invocations). The historical 39-test report is not relabeled as a 41-test run. The final fast gate and GitHub PR checks cover the added wiring.
- An isolated relocated LAN server served byte-identical HTML at both the root route and `/BRANCH_WARS.html`. This is local acceptance, not a physical two-computer test.
- [Stabilization campaign audit](../reports/baselines/release-balance-2026-09-05T15-24-31-371Z.json): 16 expanded-services campaigns / 1,920 turns passed; no skipped or cancelled initiatives in this sample, and all campaigns remained active at turn 120. This run uses management/customer previews OFF; it does not replace the goodwill evidence below.
- The final fast command passed after adding both supplemental tests. Final 41-invocation automated validation is configured for the PR; a configured check is not a confirmed hosted pass.

- [Last complete mechanics regression](../reports/baselines/N-00-2026-09-05T13-43-26-566Z.json): 36/36 invocations passed on the game bytes above, including replay, saves, ledger, simulated GitHub recovery and Windows LAN checks.
- [Same-source long audit](../reports/baselines/release-balance-2026-09-05T13-48-56-199Z.json): 16 campaigns / 2,880 turns; accounts reconciled and all campaigns remained active. Four cash-change cancellations were explicit and uncharged.
- [Workforce batch details](archive/service-workforce-status.md): browser layout, draft actions and save continuation checks, plus scope limits.
- Passing simulations are not proof of equal strategies or satisfying human victory pacing. AI reserve/retry quality, real two-computer acceptance and multi-session national play remain outstanding.

The [architecture foundation](architecture.md) adds 20 committed campaign expectations, three preserved half-ready save fixtures, an override-debt guard and automated PR checks. This is protection for the coming refactor, not completion of the engine cleanup or new blueprint gameplay.

## GitHub delivery

PRs #1–#6 are merged. The latest banking releases and documentation cleanup are on `main`. Seven retired branch tips were preserved in verified archive tags before their names were deleted; recovery details are in the architecture document. Stabilization work uses `refactor/stabilization-foundation` and is submitted separately for review, without automatic merge.
