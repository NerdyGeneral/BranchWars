# Branch Wars

Turn-based banking strategy for solo and friend-versus-friend play.

## Choose your version

The existing game on `main` is preserved. The root launch buttons below still
open that game, not V2 or V3. The newer editions are separate, downloadable
packages; extract a ZIP and use the launcher inside its own folder.

| Edition | Play/download | Matching guide |
|---|---|---|
| Current main game (preserved) | Root launchers below / [game](game/BRANCH_WARS.html) | [Main player guide](game/docs/player-guide.md) |
| V2 — Company Banking, stabilization RC1 | [Download V2 ZIP](releases/branch-wars-v2.zip) / [V2 files](releases/v2/README.txt) | [V2 player guide](releases/v2-player-guide.md) |
| V3 — V3.1 long-campaign stability update / Financial Group preview | [Download V3 ZIP](releases/branch-wars-v3.zip) / [V3 files](releases/v3/README.txt) | [Download full 51-page PDF](https://github.com/NerdyGeneral/BranchWars/raw/refs/heads/main/releases/branch-wars-v3-manual.pdf) / [Manual ZIP fallback](https://github.com/NerdyGeneral/BranchWars/raw/refs/heads/main/releases/branch-wars-v3-manual.zip) |

The updated manual contains six V3.1 revision pages followed by all 45 original
V3 handbook pages. Read the revision first: new Financial Group games use
Group 7 / save 9.6; old campaigns are not automatically upgraded.
[GitHub's PDF preview](releases/branch-wars-v3-manual.pdf)
initially shows five pages and requires **More Pages** to continue. If the preview
is blank or incomplete, use the full download or extract the manual ZIP above.

See the [version catalog and source links](releases/README.md) and
[V3.1 changes, debug and balance review](releases/v3-release-report.md).
Export your campaign before changing editions or browser addresses. Both friends
must use the same package. A newer preview is not a guarantee of perfect balance
or two-computer acceptance, and older executables may refuse newer saves.

## Play the preserved main game

Run [OPEN_BRANCH_WARS.bat](OPEN_BRANCH_WARS.bat) to play, or [OPEN_LAN_GAME.bat](OPEN_LAN_GAME.bat) to host a local-network game.

- [Player guide](game/docs/player-guide.md)
- [Current release status](game/docs/release-status.md)
- [Blueprint roadmap](game/docs/roadmap.md)
- [Game reference](game/docs/game-reference.md)
- [Architecture and maintenance](game/docs/architecture.md)
- [Documentation index](game/docs/README.md)

The runnable package lives in `game/`. Its HTML, server and launchers retain their established names. Existing bookmarks or shortcuts into the old versioned folder must be updated; use the root launchers above. Export saves before switching URLs or replacing a download: browser storage belongs to its original origin. Both friends should use the same build.

Development: run `node game/tools/check.js` for the fast gate, or `node game/tools/check.js --full` for complete regression and balance checks. No Node installation or build step is required to play.
