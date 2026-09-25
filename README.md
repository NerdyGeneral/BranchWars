# Branch Wars

Turn-based banking strategy for solo and friend-versus-friend play.

## Play

Download or clone this repository, then open **[OPEN_BRANCH_WARS.bat](OPEN_BRANCH_WARS.bat)**
on Windows, or open [game/BRANCH_WARS.html](game/BRANCH_WARS.html) in any browser. No install,
no account, no server. Choose *Solo vs Corporate AI* or *Pass & Play* for local play.

A packaged copy of the same build lives at **[releases/v4-rc4](releases/v4-rc4/README.txt)** if
you would rather hand a friend one folder. Both players should use the same build.

## What you are playing

**V4 rc4.** Choosing **Core edition** in setup creates campaign save :

- Six capability branches, including **Risk & Capital**, each owning one part of the result.
- Three permanent operating models per branch. Each is a trade, not an upgrade.
- Five **combined capabilities** that need two branches at once.
- Stronger products are earned by research; the first option on every line is always available.
- Lending deploys the balance sheet rather than capping on headcount.
- Commercial relationships are limited by your branch presence.

**Expanded edition** (save ) is the larger rule set and is unchanged in this release.

Read the [rc4 notes](releases/v4-rc4-notes.md) for what changed and what is still rough. In
game, open Help and search *loan deposit ratio*, *relationships branches capacity* or
*combined capability*.

## Multiplayer

LAN/Intranet, Direct P2P and Repository Link are all supported from the lobby. The host can
also **resume a campaign from a save** in the lobby instead of starting a new one.

## Known rough edges

- An extreme lending tilt -- most bankers on Lending, almost none on Service -- scores badly.
  A moderate lending tilt is healthy; the extreme starves the deposits that fund it.
- Balance was measured against simulated opponents. Human playtesting is still wanted.
- A two-computer multiplayer acceptance session remains unverified.

Export your campaign before changing builds or browser addresses. Browser storage belongs to
its original origin.

## History

V2 and V3 packages were removed from the working tree to keep the repository small. They
remain available from their git tags and from this repository history.

## Development starting points

1. [Approved master objective](game/docs/expanded-edition-goal.md)
2. [Current implementation checklist](game/docs/v3-usability.md#master-requirement-inventory-and-finish-gates)
3. [Release status and gates](game/docs/release-status.md)
4. [Roadmap and scope](game/docs/roadmap.md)
5. [Documentation index](game/docs/README.md)

[Player guide](game/docs/player-guide.md) · [Game reference](game/docs/game-reference.md) · [Architecture](game/docs/architecture.md) · [Changelog](game/docs/changelog.md)

Development: `node game/tools/check.js` runs the fast gate; `node game/tools/check.js --full` runs the full required gate. Passing one build's tests does not certify newer source. Remote publication and release changes require separate approval.
