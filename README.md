# Branch Wars

Turn-based banking strategy for solo and friend-versus-friend play.

## Play

Download or clone this repository, then open **[OPEN_BRANCH_WARS.bat](OPEN_BRANCH_WARS.bat)**
on Windows, or open [game/BRANCH_WARS.html](game/BRANCH_WARS.html) in any browser. No install,
no account, no server. Choose *Solo vs Corporate AI* or *Pass & Play* for local play.

To hand a friend one folder, download the six-file
[rc5 ZIP](https://github.com/NerdyGeneral/BranchWars/releases/download/v4.0.0-rc5/branch-wars-v4-rc5.zip)
from the [v4.0.0-rc5 prerelease](https://github.com/NerdyGeneral/BranchWars/releases/tag/v4.0.0-rc5).
Both players should use the same build. The frozen [releases/v4-rc4](releases/v4-rc4/README.txt)
package is kept for reference only: its loader strips Risk & Capital and third operating models
from a Core save on reload.

## What you are playing

**V4, after rc5.** This working copy carries the rc5 stabilization repairs plus later setup,
multiplayer-resume and mandate work. A new **Core edition** campaign creates save `8.20`:

- Six capability branches, including **Risk & Capital**, each owning one part of the result.
- Three permanent operating models per branch. Each is a trade, not an upgrade.
- Five **combined capabilities** that need two branches at once.
- Stronger products are earned by research; the first option on every line is always available.
- Lending deploys the balance sheet rather than capping on headcount.
- Commercial relationships are limited by your branch presence.

**Expanded edition** (save `9.34`) is the larger rule set. New Expanded campaigns now lend
from the balance sheet as well: Lending bankers can lend part of the gap between loans and
deposits beyond what offices originate, and the computer opponent no longer converts its last
full-service branch into an ATM. A `9.33` save keeps its old rules. The rc5 ZIP still starts
Expanded at `9.33` and cannot join a `9.34` campaign.

Paid research and operating models survive save and reload, and a rematch keeps the campaign's
rules. The Core bot chooses among all 18 operating models from its operating context.

Read the [rc4 notes](releases/v4-rc4-notes.md) for the research design and the
[rc5 notes](releases/v4-rc5-notes.md) for the repairs. In game, open Help and search
*loan deposit ratio*, *relationships branches capacity* or *combined capability*.

## Multiplayer

**Core · larger map & 2–4 banks** adds the Continental map, any mix of human and
AI banks, and shared online rooms. Choose it on the start screen for local play.
For players in separate locations, run the included Node server on a reachable
HTTPS host; see [online setup and recovery](game/docs/online-multiplayer.md).
The new campaign uses save version `10.1`; existing campaigns keep their rules.

LAN/Intranet, Direct P2P and Repository Link are all supported from the lobby. The host can
also **resume a campaign from a save** in the lobby instead of starting a new one.

## Known rough edges

- An extreme lending tilt -- most bankers on Lending, almost none on Service -- scores badly.
  A moderate lending tilt is healthy; the extreme starves the deposits that fund it.
- Balance was measured against simulated opponents. Human playtesting is still wanted.
- A two-computer multiplayer acceptance session remains unverified.

Export your campaign before changing builds or browser addresses. Browser storage belongs to
its original origin. A model already stripped by the rc4 loader needs an earlier intact export
to recover it.

## History

V2 and V3 player packages were removed from the working tree to keep the repository small.
They remain available from their git tags and from this repository history. The copies still
present are compatibility fixtures that tests load; see [releases/README.md](releases/README.md).

## Development starting points

1. [Approved master objective](game/docs/expanded-edition-goal.md)
2. [Current implementation checklist](game/docs/v3-usability.md#master-requirement-inventory-and-finish-gates)
3. [Release status and gates](game/docs/release-status.md)
4. [Roadmap and scope](game/docs/roadmap.md)
5. [Documentation index](game/docs/README.md)

[Player guide](game/docs/player-guide.md) · [Game reference](game/docs/game-reference.md) · [Architecture](game/docs/architecture.md) · [Changelog](game/docs/changelog.md)

Development: `node game/tools/check.js` runs the fast gate; `node game/tools/check.js --full` runs the full required gate. Passing one build's tests does not certify newer source. Remote publication and release changes require separate approval.
