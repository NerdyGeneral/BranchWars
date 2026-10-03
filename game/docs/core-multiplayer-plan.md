# Core: Continental map and four-bank campaigns

Approved scope, October 3, 2026: 24 fictional markets and online play from
separate locations, with two to four competing banks. Core keeps its banking,
research, products, staffing and monthly planning systems.

## Campaign contract

- A new Core campaign uses save version `10.1`, `coreMultiplayerVersion: 1`,
  and an explicit map. Historical Core and Expanded saves keep their rules.
- Continental has 24 markets, all open from the first month, and four
  economically equal founding hubs. Two banks start on opposite corners.
  National retains its authored 12 markets and unlock schedule.
- Each stable bank seat has a human or AI controller. Local play supports
  private handoffs; online players receive only their own private bank state.
- Humans submit simultaneous plans. AI banks use the same plan validation
  and spending constraints, then the month resolves once in a stable order.
- Competitive actions name a target bank. Market shares always total 100%.
  Eliminated banks stop submitting and operating; surviving banks continue.
- Reconnect restores the same bank. Disconnection keeps a human seat reserved
  and pauses the month until that player returns; it does not silently replace
  a person with AI or submit a plan on their behalf.
- The multiplayer HTTP server serves the game and room API from the same
  origin. Seat tokens authorize individual players. Optional durable room
  storage retains campaigns and authorization across server restarts.

## Delivery sequence

1. Define geography, new campaign creation and strict save validation.
2. Generalize Core settlement, competition, AI and public views to four banks.
3. Build local setup, map, standings, planning, handoff and save workflows.
4. Add online rooms, lobby readiness, private polling, commands and reconnect.
5. Exercise browser and protocol scenarios, historical replay and accounting;
   rebuild the portable game and generated reference.

## Acceptance

The implementation must demonstrate two, three and four-bank creation; human
and AI mixes; deterministic submission order; exact saved continuation;
separate private views; valid accounting; balanced starting locations;
whole-month settlement; target and elimination handling; duplicate and stale
network command rejection; room restart/reconnect; and actual desktop/mobile
browser play. Historical two-bank checks must continue to pass.

Public Internet use also requires a running host reachable over HTTPS. The
repository provides the server and its startup instructions; publishing a
public service is a separate deployment action. Direct P2P and Repository
Link retain their existing two-bank protocols in this version.

Implementation and verification status belongs in [release status](release-status.md).
