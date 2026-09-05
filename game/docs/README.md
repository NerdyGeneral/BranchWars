# Documentation

Start with one of these current documents; individual implementation batches are historical evidence, not separate current roadmaps.

| Need | Document |
|---|---|
| Install, play, host or reconnect | [Player guide](player-guide.md) |
| Understand mechanics and numbers | [Game reference](game-reference.md) |
| Know what is shipped and tested | [Release status](release-status.md) |
| See remaining blueprint work | [Roadmap](roadmap.md) |
| Run or maintain developer tools | [Tools](../tools/README.md) |
| Refactor safely or restore archived branches | [Architecture and maintenance](architecture.md) |
| Investigate prior decisions and checks | [Historical archive](archive/README.md) |

## Naming and maintenance

- Active docs live directly in `docs/`, using lowercase-kebab-case: `release-status.md`, not another `NEW_PHASE_STATUS_FINAL.md`.
- Update the existing roadmap and release status after a batch. Put detailed, dated batch evidence in `docs/archive/` only when it is worth retaining.
- `game-reference.md` is generated. Edit `tools/reference-template.md` or the engine, then run `node tools/build_reference.js` from the game folder.
- Keep test evidence in `reports/baselines/` and frozen engines in `reports/reference-builds/`; do not rewrite historical fingerprints or snapshots just to rename them.
- Existing uppercase runtime files and snake_case test/tool entry points are compatibility exceptions. No new date/version suffixes for ordinary docs; versions belong in content and release history.
- PR titles use `type(scope): summary`, for example `fix(multiplayer): recover delayed plans`. Descriptions distinguish implementation, validation and known limits. Merged PR descriptions describe their original changes, not subsequent branch work.

The outside dated workspace folders, ZIP backups and untracked architecture plan are user artifacts and were not renamed or deleted by this cleanup.
