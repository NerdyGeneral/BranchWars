# Branch Wars

Turn-based banking strategy for solo and friend-versus-friend play.

## V4 rc5 — Core Research & Stabilization

Download the six-file [rc5 game ZIP](https://github.com/NerdyGeneral/BranchWars/releases/download/v4.0.0-rc5/branch-wars-v4-rc5.zip) from the [v4.0.0-rc5 prerelease](https://github.com/NerdyGeneral/BranchWars/releases/tag/v4.0.0-rc5). Extract it and run `OPEN_BRANCH_WARS.bat` on Windows, or open `BRANCH_WARS.html` in a browser. Keep all six files together. This is the byte-identical package verified during local stabilization; earlier frozen releases are preserved.

The repair preserves paid research on reload and campaign rules on rematch, supports context-based Core operating-model adoption, corrects research descriptions, and opens the actual service controls from Strategy. [Release notes](releases/v4-rc5-notes.md) · [verification summary](releases/v4-rc5-verification.json) · [Claude Code review summary](CLAUDE_CODE_REVIEW.md).

To start **Core 8.20**, click **Core edition** and confirm even if Core appears selected. In Research, check for six capabilities including **RISK & CAPITAL**. Starting without that confirmation retains Core 8.19. Confirm Expanded for 9.33. Imports and rematches retain saved rules.

**Verification: 278 exact maintained standard commands have passing evidence across qualified runs.** The original full gate remains failed at 3/44, with its sole baseline failure resolved by the independently justified engine-pin update and complete standalone retest. `fullGatePassed:false` and `continuousStandardGatePassed:false` remain intentional. Package contents, extraction and current-profile runtime smoke passed. Browser/human acceptance, physical two-computer play and strategic balance remain open.

## Working copy and preserved releases

- Root [OPEN_BRANCH_WARS.bat](OPEN_BRANCH_WARS.bat) and [OPEN_LAN_GAME.bat](OPEN_LAN_GAME.bat) launch the working `game/` copy. Building source does not update frozen packages.
- [Frozen rc4](releases/v4-rc4/README.txt) is the original Core research snapshot and still contains the reviewed reload/rematch defects. Use rc5 for the stabilization fixes.
- [Frozen rc3](releases/v4-rc3/README.txt) and [its ZIP](releases/branch-wars-v4.zip) contain checkpoint68b, with Core 8.19 / Expanded 9.33. [releases/v4](releases/v4/README.txt) is the preserved rc2 compatibility reference. Tags retain their historical packages.
- The [V3 ZIP](releases/branch-wars-v3.zip), [unpacked V3](releases/v3/README.txt), [45-page V3 manual](releases/branch-wars-v3-manual.pdf), [V2 stabilization RC](releases/v2-stabilization-rc1/README.txt), and [original V2](V2%20release/README.md) remain historical/rollback artifacts. Their manuals and verification apply to their own versions.

Export and retain saves from the original build/browser before switching folders or URLs. Both friends should use the same package. An operating model already stripped by the original rc4 loader needs an earlier intact export to recover it.

## Development starting points

1. [Approved master objective](game/docs/expanded-edition-goal.md)
2. [Implementation checklist](game/docs/v3-usability.md#master-requirement-inventory-and-finish-gates)
3. [Release status and evidence](game/docs/release-status.md)
4. [Roadmap and scope](game/docs/roadmap.md)
5. [Documentation index](game/docs/README.md)

[Player guide](game/docs/player-guide.md) · [Game reference](game/docs/game-reference.md) · [Architecture](game/docs/architecture.md) · [Changelog](game/docs/changelog.md)

Development: `node game/tools/check.js` runs the fast gate; `node game/tools/check.js --full` runs the full required gate. The rc5 qualification and retained failure are explained in the [repair status](game/docs/rc4-local-repair.md). Passing one build's checks does not certify newer source. Full Expanded blueprint completion remains outside this prerelease.
