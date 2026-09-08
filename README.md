# Branch Wars

Turn-based banking strategy for solo and friend-versus-friend play.

**V2 stabilization release candidate.** Real two-computer multiplayer acceptance
is still pending; automated checks are not a zero-bug guarantee. Current evidence
and remaining limits are in the [release status](game/docs/release-status.md).

For a clean player-only copy, keep the six files in
[releases/v2-stabilization-rc1](releases/v2-stabilization-rc1/README.txt) together.
The original [V2 package](V2%20release/README.md) remains an unchanged rollback
artifact, not the recommended build for these multiplayer fixes.

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
