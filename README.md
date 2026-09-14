# Branch Wars

Turn-based banking strategy for solo and friend-versus-friend play.

## Test V4 Expanded

The [V4 playtest ZIP](releases/branch-wars-v4.zip) contains the current integrated Expanded snapshot. Extract it before playing. Read the [V4 quick-start](releases/branch-wars-v4-guide.md) and [verification limits](releases/v4-playtest-notes.md). This is a prerelease for testing, not completion of the blueprint. V2/V3 remain preserved below.

## Play the frozen V3 distribution

Download [the V3 player ZIP](releases/branch-wars-v3.zip), extract it, and keep its six files together. Read its matching [45-page field manual](releases/branch-wars-v3-manual.pdf) and [frozen changes/debug/balance report](game/docs/v3-release-report.md). The unpacked copy is in [releases/v3](releases/v3/README.txt). No development tools are needed.

This is a preserved regional banking / Financial Group preview snapshot—not completion of the Expanded blueprint and **not the latest working source**. Real two-computer acceptance remains separate from automated checks.

## Working copy versus release

- Root [OPEN_BRANCH_WARS.bat](OPEN_BRANCH_WARS.bat) and [OPEN_LAN_GAME.bat](OPEN_LAN_GAME.bat) launch the local `game/` copy, **not the frozen download**.
- The local playable HTML is rebuilt from checkpoint65 source for the V4 playtest. New Expanded campaigns include integrated company lending, shared-premises settlement, contextual office controls and qualified-workforce AI. Long-run balance, broader release gates and human acceptance remain unfinished. Exact versions belong in [release status](game/docs/release-status.md#which-version-am-i-looking-at).
- Building source replaces the local playable HTML; it does not update the frozen ZIP or its manual. See [current artifact identities and known issues](game/docs/release-status.md) before rebuilding or sharing.
- The [V2 stabilization RC](releases/v2-stabilization-rc1/README.txt) and [original V2 package](V2%20release/README.md) remain preserved rollback artifacts.

Export saves before changing builds or URLs. Browser storage belongs to its original origin; supported saves retain their rules. Both friends should use the same build. Automated checks are not a zero-bug or balance guarantee.

## Development starting points

1. [Approved master objective](game/docs/expanded-edition-goal.md)
2. [Current implementation checklist](game/docs/v3-usability.md#master-requirement-inventory-and-finish-gates)
3. [Release status and gates](game/docs/release-status.md)
4. [Roadmap and scope](game/docs/roadmap.md)
5. [Documentation index](game/docs/README.md)

[Player guide](game/docs/player-guide.md) · [Game reference](game/docs/game-reference.md) · [Architecture](game/docs/architecture.md) · [Changelog](game/docs/changelog.md)

Development: `node game/tools/check.js` runs the fast gate; `node game/tools/check.js --full` runs the full required gate. Passing one build's tests does not certify newer source. Remote publication and release changes require separate approval.
