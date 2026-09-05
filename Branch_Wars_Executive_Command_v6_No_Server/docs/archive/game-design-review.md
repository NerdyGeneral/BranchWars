> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# Branch Wars v8.1 — Current Design Status

## What already worked

The original game had a strong foundation: simultaneous sealed planning, persistent operating choices, organic market-share movement, and a dry corporate voice that gives the game its identity. It also avoided reflex-heavy play, making it suitable for a group around a table or separate office computers.

## Earlier depth ceiling

The earlier short campaign ended before long investments could create distinct institutional histories. Most choices fed the same small group of metrics, projects were linear, economic conditions were fixed at setup, and two-computer play depended on a manual WebRTC offer/answer exchange. Later revisions added the strategic systems but still allowed divided maps to deadlock and national campaigns to reach consolidation too early.

## Current v8.1 design

- Four open-ended scopes stage four, six, eight, or twelve markets without an arbitrary final-cycle score check.
- Five permanent doctrines create asymmetric institutional identities.
- Economic regimes change every four cycles and alter funding pressure, loan demand, rates, and credit losses.
- Capital strategy introduces a third persistent policy tradeoff alongside deposits and lending.
- Five four-tier strategy lanes now fork into two locked operating models at tier two, so the same research lane can support materially different banks.
- Three persistent product portfolios—retail, business banking, and credit—change customer acquisition, deposit growth, funding cost, fee income, loan production, and losses every cycle.
- Branch expansion offers full-service financial centers, commercial offices, and digital advisory studios. Each has different recurring economics and performs differently against a district's specialties.
- Career milestones reward broad development without replacing the confidential end-game mandate.
- Twenty-six events now interact with staffing, technology, training, controls, reputation, influence, and the macro cycle.
- A room-code intranet relay makes two-computer play practical while preserving sealed simultaneous plans.
- Repository Link uses an ordered GitHub queue with retry reconciliation and a commit/reveal seal, so a remote plan is not published until both institutions are committed.
- Six command-center workspaces replace the full-page planning scroll while keeping the Ready bar persistent across Overview, Markets, Operations, Competition, Strategy, and Intelligence.
- Eight simultaneous competitive-action choices create direct attack/counter play across deposits, commercial relationships, staff, funding defense, and hostile takeovers.
- A public threat board explains visible capital, liquidity, market-exit, relationship, and takeover pressure without exposing a currently sealed rival plan.
- Market exits permanently transfer local franchises, acquisitions remove assets from the rival, and deposit contests transfer both deposits and the cash that funds them.
- Receivership, total domination, hostile buyout, and a regulator-supervised franchise auction provide pursuable endings and prevent permanent split-map stalemates.
- Consolidation and total domination cannot occur until the selected scope's entire map is open. Competition is normalized by scope so twelve-market campaigns do not resolve faster simply because more districts are processed each cycle.

## Balance and pacing evidence

The deterministic audit runs 800 AI-versus-AI campaigns across every ordered doctrine pairing and all four scopes. After adding portfolios, facility models, and research forks, the current seed produces doctrine win rates from 40.6% to 59.1%. Overall campaign length has a median of 53 cycles and a 90th percentile of 83; national campaigns have a median of 53 and a 90th percentile of 83. All 800 campaigns resolved, with two unusually long games crossing cycle 250 and the longest ending at cycle 295. The audit also reports action frequency by doctrine, making unused actions and pathological AI habits visible. This is a strong regression signal rather than proof that every possible human-created state terminates.

## UI assessment

The original monochrome operations-terminal presentation was organized but visually flat. It hid systemic depth in text and treated the supposed map as a card grid. That made the game feel more like a form than a city strategy game.

The revised interface uses a contemporary strategy/tycoon language. Its central view is a code-native isometric city with land, water, streets, district platforms, parks, skyline blocks, facility markers, staged unlocks, and blue/red market influence. District cards remain directly selectable but are layered over the city as compact labels rather than substituting for the map. The game is organized into six command-center workspaces, so analytics, map play, monthly operations, competitive maneuvers, research, and intelligence are separate purposeful views rather than one long form. The Operations workspace now exposes the product portfolio and its exact tradeoffs, while Strategy shows explicit tier-two forks and distinct facility projects. The Ready bar remains outside the tabs, selections survive navigation, and attacks and counters have a dedicated Competition war room.

## Remaining work

- Run a real two-computer LAN acceptance test across the intended router and Windows firewall configuration. The automated relay test passes locally, but that is not equivalent to a second physical machine.
- Make geographic adjacency, roads, and regional expansion mechanically meaningful. The isometric city currently communicates market state well, but route connections are primarily visual.
- Extend the threat forecast with projected ranges only after enough playtest evidence exists to keep those estimates honest; the current board deliberately reports state and counters rather than pretending to know a sealed rival plan.
- Expand nationwide play into regional portfolios only if the map concept is settled; avoid hard-coding city-specific adjacency rules that would have to be discarded.
- Consider additional human seats only as a major rules revision. Hidden plans, share ownership, timing, and elimination would all need to be generalized together.
