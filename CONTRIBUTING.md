# Contributing

## Branches and folders

- Start short-lived `feat/`, `fix/`, `refactor/` or `docs/` branches from current `main`. One coherent change per PR; do not keep adding releases to merged branches.
- Delete a merged branch only after checking its latest tip. Preserve unmatched history with a verified archive tag before deleting a name.
- Edit the runnable package in `game/`. Do not edit frozen engines in `game/reports/reference-builds/` or dated external backups.
- Do not publish local saves, tokens or diagnostic dumps. New baseline reports are ignored by default; explicitly stage selected, inspected release evidence.

## Rules and architecture

- Change a function's definition; do not add another runtime wrapper or override. Existing override counts are debt ceilings, not a pattern to copy.
- Shared eligibility and costing belong in the engine. UI, AI and network callers must use the same rules. Recheck resource-dependent execution and report cancellations without charging for an unstarted action.
- Keep save migrations explicit and backward compatible. Do not remove a legacy path merely because new campaigns do not use it.
- Keep simulation and random streams independent of DOM, transport timing and wall time. Preview functions must not mutate game state or consume world randomness.
- Add reachability, adverse-case and multiplayer/privacy tests for new mechanics. Separate behavior-preserving refactors from balance changes.

## Checks

From the repository root:

```text
node game/tools/check.js
node game/tools/check.js --full
```

The full Windows gate includes the local LAN server suite. The fast gate is not release acceptance.

Golden fixtures are committed expectations, not two current runs agreeing. Never regenerate them just to make a failing refactor pass. For an intentional mechanics change, explain the affected scenarios and rule version in the PR, then run `node game/tests/behavior-golden.test.js --update-goldens` and review the fixture diff. This command does not update preserved save fixtures.

Rebuild the reference with `node game/tools/build_reference.js` after changing mechanics or tables, and inspect its diff. Update [release status](game/docs/release-status.md) and [roadmap](game/docs/roadmap.md), not another competing status document.

GitHub checks run with read-only repository permissions and without game-relay credentials. Passing checks do not establish human balance, two-computer reliability, or blueprint completion.
