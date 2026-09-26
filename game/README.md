# Branch Wars

A turn-based banking strategy game with Solo AI, Pass & Play, LAN and Repository Link multiplayer.

## Play

- **Solo / Pass & Play / Direct P2P:** run [OPEN_BRANCH_WARS.bat](OPEN_BRANCH_WARS.bat).
- **Local-network host:** run [OPEN_LAN_GAME.bat](OPEN_LAN_GAME.bat). Friends use the address and room code shown by the host.
- **GitHub multiplayer:** follow the [player guide](docs/player-guide.md). Update both computers and export saves before switching builds.

New campaigns present Core or integrated Expanded. Historical modular saves retain their original rules; there is no automatic upgrade. The visible edition label and the version stored in a campaign save are different identifiers; neither means the national blueprint is complete. See the current release status for the latest preview and its acceptance limits.

The local playable HTML and source are different development checkpoints; neither is the frozen V3 download. See [artifact identities](docs/release-status.md#which-version-am-i-looking-at) before rebuilding or sharing. The packaged [V3 ZIP/manual](https://github.com/NerdyGeneral/BranchWars/blob/v3.0.0/releases/v3/README.txt) remain separate preserved artifacts.

## Read

- [Game reference](docs/game-reference.md) — generated mechanics and values.
- [Current release status](docs/release-status.md) — distinguishes the frozen release, playable build, tested checkpoint and unfinished source.
- [Implementation ledger](docs/v3-usability.md) — the authoritative completed/remaining checklist.
- [Approved master objective](docs/expanded-edition-goal.md) — scope and finish criteria.
- [Blueprint roadmap](docs/roadmap.md) — approved scope and sequencing.
- [Documentation index](docs/README.md) — player guide, developer tools and historical archive.

## Validate

Run `RUN_TESTS.bat` for the standard checks. Developer commands and the complete regression runner are documented in [tools](tools/README.md).

Developers edit `src/` and run `node tools/build_game.js` from this folder. The generated `BRANCH_WARS.html` remains the portable game; players do not need the source files or Node. Source/output freshness is enforced by the checks.

New docs use lowercase-kebab-case; `README.md` is the entry-point exception. Stable game, launcher, server and test filenames are preserved for compatibility. The package is now `game/`; root launchers provide the main entry points. See the [architecture plan](docs/architecture.md) before structural work.
