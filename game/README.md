# Branch Wars

A turn-based banking strategy game with Solo AI, Pass & Play, LAN and Repository Link multiplayer.

## Play

- **Solo / Pass & Play / Direct P2P:** run [OPEN_BRANCH_WARS.bat](OPEN_BRANCH_WARS.bat).
- **Local-network host:** run [OPEN_LAN_GAME.bat](OPEN_LAN_GAME.bat). Friends use the address and room code shown by the host.
- **GitHub multiplayer:** follow the [player guide](docs/player-guide.md). Update both computers and export saves before switching builds.

The deeper two-region banking systems are opt-in campaign previews. Existing saves retain their rules. The visible v8.1 title and save format 8.4 are different version identifiers; neither means the national blueprint is complete.

## Read

- [Game reference](docs/game-reference.md) — generated mechanics and values.
- [Current release status](docs/release-status.md) — shipped features, checks and known limits.
- [Blueprint roadmap](docs/roadmap.md) — what is implemented versus unfinished.
- [Documentation index](docs/README.md) — player guide, developer tools and historical archive.

## Validate

Run `RUN_TESTS.bat` for the standard checks. Developer commands and the complete regression runner are documented in [tools](tools/README.md).

Developers edit `src/` and run `node tools/build_game.js` from this folder. The generated `BRANCH_WARS.html` remains the portable game; players do not need the source files or Node. Source/output freshness is enforced by the checks.

New docs use lowercase-kebab-case; `README.md` is the entry-point exception. Stable game, launcher, server and test filenames are preserved for compatibility. The package is now `game/`; root launchers provide the main entry points. See the [architecture plan](docs/architecture.md) before structural work.
