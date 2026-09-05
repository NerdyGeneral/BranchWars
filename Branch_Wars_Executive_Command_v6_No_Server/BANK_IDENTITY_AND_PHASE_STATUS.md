# Bank identity and N-02 persistence update

Local implementation, September 4, 2026. No commit or push performed.

## Playable color feature

New-campaign setup has two native color pickers: your/local-player-1 bank, and AI/local-player-2 bank. In LAN, direct P2P and repository modes, each participant uses the first picker for their own bank before hosting/joining; the second picker applies only to local opponents. Current campaign colors cannot be edited mid-session in this package.

Colors are saved on the bank, included in owner and rival public views, and preserved in rematches. The UI maps bank colors to the current viewer's perspective. Old saves without colors use the original seat-based blue/red defaults; malformed color values are rendered through a strict six-digit hexadecimal fallback, never inserted as arbitrary CSS.

Colors now drive map ownership, share rings, branch markers, chart lines/dots, portfolio bars and legends. Header and map legends name both institutions. Solid/dashed lines and circle/square identity swatches distinguish roles even when colors match. Warning/success colors and ordinary blue navigation selections deliberately retain their semantic meanings.

No new economic/RNG behavior depends on the selected color. Both friends need the updated HTML to see this feature. Old clients may ignore the additional cosmetic fields; cross-build compatibility was not certified.

## Accounting work: prototype snapshots

AccountingPrototype.snapshot and restore provide a separate versioned envelope, bw-accounting-1. Each exported snapshot retains at most 256 journal entries plus a reconciled checkpoint and closing state. Snapshot creation replays the supplied journal and refuses an inconsistent closing book. Restore validates the format, account balances, retained earnings, sequence and every retained posting before returning a new book.

Tests verify exact continued results after pruning and restore, repeated snapshots, and 15 malformed snapshot cases. A checkpoint is a trusted starting balance, not cryptographic proof of unretained history. The full in-memory prototype journal is not automatically bounded during posting; the serialized snapshot is bounded. These APIs do not accept a full game save, and the campaign importer does not activate them.

N-02 is NOT complete. Authoritative full-turn routing, funding/asset design decisions, campaign save-version integration, AI/forecast/UI adoption and whole-economy balance checks remain. This update did not activate the replacement economy.

## Verification

All ten separately executed suites passed: engine (48 campaigns), funding (24 campaigns / 1,927 turns), accounting foundation, accounting activities, accounting persistence, bank identity, determinism, stage ledger (276 turns), save integrity and transport. git diff --check passed. The baseline runner now includes both new suites; the full runner/800-game balance audit was not rerun.

Browser verification on isolated loopback port 8897:
- Green/purple choices appeared on the map and share rings with both names.
- Desktop screenshot inspected; no horizontal document overflow in tested viewport.
- Solo reload/continue preserved the selected colors.
- Two real browser clients joined one LAN room and agreed on green Emerald Test Bank / purple Violet Test Bank from opposite seats.
- No browser warning/error logs were observed during those checks.
- Test tabs and loopback server were closed afterward.

This is same-computer two-client acceptance, not physical two-PC networking, live GitHub acceptance or a comprehensive mobile/accessibility audit. Automated tests cover rematches, legacy defaults, malformed values, matching colors and color-neutral seeded simulation.

## Blueprint count

The v7 blueprint has 15 numbered work packages, N-00 through N-14. N-00 and core N-01 are delivered, with the previously documented wider replay/release gates still applicable. N-02 is underway.

There are 12 remaining package completions through national release, including unfinished N-02:
- N-02: finish accounting and funding.
- N-03 to N-05: persistent rivalry, regional customers, branches/departments.
- N-06 to N-08: products/cohorts, research/deployment, contracts/advertising.
- N-09 to N-10: financial-service subsidiaries, company ownership/deliberate M&A.
- N-11 to N-13: national management/content, integrated UI, release validation.

N-14 insurance underwriting is one additional later expansion. Accounting a/b/c and persistence are subdivisions of N-02, not additions to that count. Package count is not a time estimate: later packages differ substantially in scope.

The next player-facing blueprint milestone remains persistent rivalry with re-entry, followed by a playable two-region foundation. The complete national conglomerate target has not shipped.
