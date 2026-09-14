# Documentation index

## Start here: current development

1. [Approved master objective](expanded-edition-goal.md) — what must be finished and what is excluded.
2. [Implementation and acceptance ledger](v3-usability.md#master-requirement-inventory-and-finish-gates) — the **single current completed/remaining checklist**.
3. [Release status](release-status.md) — exact playable/source/package identities, known issues and release gates.
4. [Roadmap](roadmap.md) — sequencing and retained acceptance contracts, not a competing status report.

The frozen V3 ZIP/manual, V4 playtest and newer local development HTML are different artifacts. Read [which version is which](release-status.md#which-version-am-i-looking-at) before testing or distributing.

## One job per document

| Need | Document |
| --- | --- |
| Learn how to play, host or recover | [Player guide](player-guide.md) |
| Mechanics and numerical values | [Generated game reference](game-reference.md) — generated from the local playable HTML, not automatically from newer source |
| Frozen V3 handbook | [Matching field manual PDF](../../releases/branch-wars-v3-manual.pdf) |
| Current local handbook | [Development manual status](release-status.md#local-development-handbook--not-a-published-replacement) — guide-derived PDF; not a released replacement |
| Frozen V3 changes and original QA | [Edition-bound release report](v3-release-report.md) |
| Earlier V3.1 candidate evidence | [Stability report](v31-stability-report.md) and [manual addendum](v31-manual-addendum.md) — historical, not the current candidate |
| Maintain source and compatibility | [Architecture](architecture.md) and [tools](../tools/README.md) |
| Feature/version inventory | [Feature register](feature-register.md) |
| Release changes | [Changelog](changelog.md) |
| Detailed old tests, decisions and checkpoints | [Historical archive](archive/README.md) |
| Earlier UI proposal | [Superseded notice](ui-rework.md) — cadence bands are not the current direction |

## Maintenance rules

- Update the existing implementation ledger after each batch. Release status summarizes only the current candidate and its gates; roadmap preserves scope/order.
- Put detailed checkpoint narratives in an indexed archive. Do not prepend the same history to several live documents.
- Keep the ledger's handoff short and add new checkpoints to its evidence index. Keep artifact versions/hashes in release status; date test observations instead of treating a document's “running” statement as live process status.
- New active docs use lowercase-kebab-case. Dates/versions belong in historical evidence and edition-bound artifacts, not repeated `FINAL` filenames.
- Generated reference: edit the engine or `tools/reference-template.md`, then rebuild. Do not hand-edit the generated mechanics document.
- Preserve reference builds, saves, failure reproductions, unique reports and rollback packages. Check consumers before moving anything; this cleanup removed none of them.
- Documentation checks validate paths/names, not truth or full release readiness. Record exact-build evidence separately.
- Superseded decisions remain historical. They cannot restore expired publication authority or override the current approved goal.

## Cleanup verification

The [September 13 follow-up audit](archive/documentation-recheck-2026-09-13.md) records the earlier consolidation check at checkpoint56. Historical document counts and preservation manifests describe their original checkpoint, not a limit on future evidence.

The [latest documentation recheck](archive/documentation-recheck-2026-09-13.md#post-checkpoint64-follow-up) confirms that consolidation remains in place. No further bulk move or rename was needed. Use release status for changing candidate identities; this index does not maintain a second build-status summary. Historical counts describe their observation, not a maintenance target.
