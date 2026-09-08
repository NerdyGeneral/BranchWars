# Branch Wars

Turn-based banking strategy for solo and friend-versus-friend play.

**V3 regional banking / Financial Group preview.** This is a playable snapshot,
not the completed expansion blueprint. Real two-computer multiplayer acceptance
is still pending; automated checks are not a zero-bug or balance guarantee.

Download [the V3 player ZIP](releases/branch-wars-v3.zip), extract it, and keep its
six files together. No development tools are needed. Read the
[45-page V3 field manual](releases/branch-wars-v3-manual.pdf) and
[V3 changes, debug and balance report](game/docs/v3-release-report.md).
The unpacked player copy is in [releases/v3](releases/v3/README.txt).
The [V2 stabilization RC](releases/v2-stabilization-rc1/README.txt) and
[original V2 package](V2%20release/README.md) remain unchanged rollback artifacts.

Run [OPEN_BRANCH_WARS.bat](OPEN_BRANCH_WARS.bat) to play, or [OPEN_LAN_GAME.bat](OPEN_LAN_GAME.bat) to host a local-network game.

- [Player guide](game/docs/player-guide.md)
- [Current release status](game/docs/release-status.md)
- [Blueprint roadmap](game/docs/roadmap.md)
- [Game reference](game/docs/game-reference.md)
- [Architecture and maintenance](game/docs/architecture.md)
- [Changelog](game/docs/changelog.md)
- [Documentation index](game/docs/README.md)

The runnable package lives in `game/`. Its HTML, server and launchers retain their established names. Existing bookmarks or shortcuts into the old versioned folder must be updated; use the root launchers above. Export saves before switching URLs or replacing a download: browser storage belongs to its original origin. Both friends should use the same build.

Development: run `node game/tools/check.js` for the fast gate, or `node game/tools/check.js --full` for complete regression and balance checks. No Node installation or build step is required to play.
