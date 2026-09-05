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

New docs use lowercase-kebab-case; `README.md` is the entry-point exception. Stable game, launcher, server and test filenames are preserved for compatibility. Do not rename the HTML or versioned package folder without also updating launchers, server routes and tests.
