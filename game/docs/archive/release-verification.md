> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# Release verification — 2026-09-05

## Result

The current build passed the complete automated regression runner and an additional current-pilot balance reconciliation audit. No release-blocking defect was found in these checks. This is a verified development build, not a claim that every strategy is equally strong, every multiplayer environment works, or the national-game blueprint is complete.

Verified game: `BRANCH_WARS.html`, 423,017 bytes.

SHA-256: `db4db4183d1e58a61975763d8c4ed6c1933df863df012447f54502df61f707b0`.

Publication target: the existing `claude/emergent-doctrine` branch. This document records pre-publication verification; GitHub's commit history records the actual publication.

## Automated evidence

- [Complete baseline](../../reports/baselines/N-00-2026-09-05T05-52-56-418Z.json): **25/25 test invocations passed**, with unchanged source fingerprints and identical repeated seeded balance-audit output. Coverage includes engine validation, accounting, persistence, bank identity, regional operations, market economy, credit and deposit lifecycles, funding covenants, products, service agreements, determinism, save integrity, transport, GitHub recovery, and the actual Windows LAN relay.
- [Expanded release balance audit](../../reports/baselines/release-balance-2026-09-05T05-58-54-507Z.json): **16 current-pilot campaigns, 1,735 resolved turns**, across all four scenarios. Every turn checked ledger/accounting validity; cash, deposits, loans, equity and emergency-debt agreement between displayed stats and accounting accounts; deposit and credit cohort totals; regional deposit totals; and regional profit attribution. No selected initiative was silently skipped. Largest tested public state: **505,311 bytes**, below the test's 1 MiB threshold.
- The baseline's GitHub recovery harness completed 12 engine turns through the real transport/message functions with simulated HTTP: 61 accepted writes and eight deliberately lost responses. It did not contact a live game repository.
- The engine suite includes 48 long-run campaigns. The regional pilot compatibility suite separately exercised 1,920 turns. Accounting tests include 2,000 reconciled stress postings and 27 actual operation previews.
- Generated-reference freshness and staged whitespace checks passed. The staged game bytes matched the tested working file exactly.

The [first baseline attempt](../../reports/baselines/N-00-2026-09-05T05-42-47-347Z.json) passed every test but correctly rejected its overall result because the game changed during its snapshot window. It is retained as rejected evidence, not a passing release gate. The complete runner was repeated against the stable hash above.

## Browser and connection checks

Two local browser clients created/joined a new pilot LAN room, submitted their separate plans, and reached matching cycle-one results. Own/rival identity and ready-state presentation were checked. At 1280px, the inspected views had no horizontal overflow or browser warning/error logs, and the resolution panel was readable.

This was a loopback two-client test, not a physical two-computer test. GitHub publishing credentials were checked using a successful push dry-run. That confirms repository publishing access, not a sustained authenticated GitHub game session.

Still unverified: the friend's original failed room, physical intranet/firewall behavior, sustained live GitHub play, and real sleep/resume or storage-exhaustion conditions.

## Balance and design limits

Thirteen of the 16 new-pilot games completed 120 turns without ending. Three aggressive-growth games entered receivership at displayed cycles 56, 56 and 63. A separate focused service-agreement test also contains an earlier cycle-38 ending. These did not produce accounting failures, but early failure and recovery pacing still need human playtesting and broader paired-seat strategy trials.

The older/default campaign audit covered 800 games: median length 59, 90th percentile 85, maximum 235, with 771 buyout and 29 domination endings. A repeated run matched exactly. An additional 800-game legacy-funding audit passed. These are not current-pilot length guarantees. The audit's emergent character labels are outcomes of play, not controlled strategy assignments; their win percentages do not establish causal strategy fairness.

Current service agreements provide recurring contests, but they remain simplified fee mandates with aggregate staffing. Segmented customers, committed service capacity, richer AI bidding/advertising, renewal pricing, insurance/brokerage subsidiaries, share ownership and a fully authored national campaign remain future work.

## Release preparation changes

- Added the expanded pilot reconciliation audit and saved its evidence.
- Updated `RUN_TESTS.bat` to run reference freshness, the full baseline and the expanded release audit instead of the abbreviated test subset.
- Corrected quick-start/reference descriptions of pilot modes, planning, office closure economics and runtime overrides. Removed an unconfirmed silent-project-failure claim; the current audit did not reproduce it.
- No game-rule changes were made during this release-verification pass.

Earlier phase-status documents are historical snapshots; their statements that a full baseline or publication had not yet happened apply to those earlier phases. This report supplies the current verification evidence.

## Playing this build

Both players must use the updated HTML (pilot multiplayer protocol 10). Start a new game with **Regional Rivalry** enabled to use the latest two-region, six-market pilot and renewable service agreements. Older saves/rematches intentionally retain their prior rules.

Export an existing host campaign before updating. Do not overwrite an active session without a backup. For an updated repository session, use the existing same-tab **Resume Repository Session** flow after reload; an exported campaign is not a reconstruction of the old GitHub room.

No ZIP/distribution package or installer was rebuilt in this pass.
