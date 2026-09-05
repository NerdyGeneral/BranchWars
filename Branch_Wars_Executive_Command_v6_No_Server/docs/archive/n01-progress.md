> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# N-01 progress: deterministic campaigns and initial operating ledger

Implemented September 4, 2026. N-01 is partially complete, not the full causal-accounting milestone.

## Delivered

- Authoritative `simulationVersion: 1` and `rng` state (algorithm, initial seed, world state, AI state) serialize with campaigns.
- Engine entry points establish synchronous RNG context with try/finally restoration; state belongs to each campaign. Interleaving games does not mix streams.
- Explicit `seed` and `created` creation inputs support repeatable fixtures. Ordinary new games still obtain a fresh seed and timestamp. Rematches are fresh campaigns, not replay fixtures.
- AI planning consumes its separate stream. World outcomes depend on world RNG and submitted intents, not how many AI planning calls were made.
- Stable Fisher-Yates opportunity sampling replaces random-comparator sorting. This intentionally changes seeded outcomes; no economic coefficients were tuned.
- New bank IDs derive from simulation creation randomness; transport IDs, room nonces, and credential behavior are unchanged.
- Log `ts` values are now logical ordering values anchored at creation, not wall-clock event timestamps. Creation time remains metadata.
- Legacy saves initialize a deterministic RNG once from existing identity/cycle metadata through migration or an authoritative entry point. Unknown simulation versions and malformed RNG values are rejected. Historical pre-upgrade random outcomes cannot be reconstructed.
- Initial structured `operations.result` events record own operating reports after resolution, with monotonic ID, cycle, source, target, and owner visibility. Public projection clones and filters these entries. RNG is not exposed through publicState.
- Retain at most 2,000 operating entries with an explicit pruned-through marker; public projection supplies the latest 100 owned entries. This is bounded recent reporting, not a complete archival replay system.

## Tests and changed outcomes

`node tests/determinism.test.js` covers explicit creation, interleaved campaigns, JSON save/resume, preview purity, separate AI randomness, redacted/copy-safe event projection, deterministic legacy initialization, invalid/future RNG rejection, and context restoration after an error.

`node tests/capture_baseline.js` now includes the determinism suite and hashes it alongside game/test sources. Reports retain all individual command outcomes; rerun on final bytes rather than relying on an earlier pass.

The new seeded audit observes 781 buyouts, 6 receiverships, and 13 domination endings in 800 games; median 56 turns overall and 55 nationally. These differ from N-00 because random sampling/stream consumption changed. Buyout dominance remains a known design problem, not a problem fixed by this package.

## Resolution-stage ledger extension (September 4)

The ledger now brackets named resolution functions and records their actual net stat changes plus selected structural changes. Categories cover executive decisions, emergency capital, competitive actions, project starts, operations, deleveraging, deposit contests, funding settlement, relationships, market competition/exits/dividends, project advancement/completion, risk consequences, research, hiring, milestones, and terminal resolution. Each record links to its owner's resolution-start parent. This attributes changes at the responsible function boundary, not only the final turn difference.

`tests/ledger.test.js` verifies complete stat-delta reconciliation across 220 turns spanning all four scenarios, parent links, owner-only projection, deep-copy isolation, sealed-plan silence, and the history ceiling. The baseline runner includes it.

Structural records include projects, facilities, branches, capabilities, staffing allocation, achievements, market shares/exits, distress and selected operational counters. Stage snapshots are NOT a full event-sourced save replacement. For example, policy adoption, institutional-identity synchronization, new opportunity generation, and individual intermediate mutations within a stage are not all represented as independent ledger entries. Project completions inside advanceProjects are attributed to project.advance; acquisition transfers inherit that source rather than individual deal postings.

The new `causalEvents` public field contains only the requesting owner's records, never an unfiltered pair of bank snapshots. It includes up to 200 recent records; parents older than the retained window may be absent. `ledgerPrunedThrough` explicitly marks authoritative truncation at 2,000 total entries. Reports remain recent-history evidence, not an archival journal. Existing operatingEvents remain available for compatibility.

No new ledger UI ships in this extension, and no rules, pricing, targets, or economic coefficients were intentionally changed. Source-level attribution is groundwork for the future Explain screen, not a finished player-facing cause narrative.

Final extension evidence: `../../reports/baselines/N-00-2026-09-05T00-41-42-359Z.json`. Engine, determinism, ledger, transport, and Windows LAN suites passed. Both 800-game audits reproduced the prior N-01 output exactly (781 buyouts, 6 receiverships, 13 domination endings; median 56). Source hashes were unchanged during validation; `git diff --check` passed.

A sample seeded 65-turn AI campaign took 135 ms of engine resolution time, retained 1,412 entries, serialized to 763,873 bytes, and produced a 219,272-byte public view. This is a sample, not a worst-case guarantee. The LAN server enforces a 1 MiB request-body limit; scale/retention tests must include complete transport envelopes before a national release. No live browser or physical two-PC acceptance was performed in this extension.

## Remaining N-01 work

Ledger validation/import hardening is now implemented (see below). Finer causal coverage for intermediate postings and metadata transitions remains before declaring the full archival N-01 contract complete. N-02's accounting journal must distinguish cash, liabilities, equity, realized losses, and transfers; these source-attributed net deltas do not establish accounting correctness.

Add engine-version compatibility negotiation before claiming mixed-client multiplayer support. Existing transports still share the authoritative engine, but simulationVersion is not a substitute for a network handshake. The trusted-friends privacy limitation remains.

Add full browser save/import/reconnect acceptance, physical two-PC acceptance, and replay fixtures with actual client migration (which includes legacy repair logic). Current JSON continuation tests do not certify every client repair transformation. No UI redesign or new ledger screen is shipped in this step.

Accounting repair, market re-entry, difficulty-bonus removal, national content, and balance retuning remain separate packages. Changes are local and uncommitted.

## Save-integrity phase (September 4)

- Added ledger version validation, category/source matching, owner identity checks, monotonic IDs and sequence/pruning validation, parent references, finite numeric data, and allowed field checks. Unversioned operating-only histories remain supported. A retained suffix may refer to an explicitly pruned parent.
- Client migration validates a copy before repair; rejected imports leave the caller's original save untouched.
- A simulation-versioned save missing its RNG is rejected rather than silently reseeded. Genuine pre-RNG saves still initialize deterministically.
- Fixed repair adding unnecessary empty facility records to valid saves. Actual client migration followed by further turns now matches uninterrupted simulation (apart from the documented legacy tier-field removal and ledger-version metadata).
- Preserved zero capital on import instead of automatically recapitalizing a failed bank. Missing/non-finite legacy capital still uses the existing repair path; operating economic coefficients were not changed.
- Added tests/save_integrity.test.js: actual client migration/resume, a half-submitted turn, idempotence, old histories, pruned histories, 13 ledger corruptions, missing RNG, zero-capital preservation and non-mutating rejection. Included in the regression runner.
- Browser smoke used an isolated loopback origin on port 8894: started a solo game, resolved cycle 1, reloaded, continued with matching displayed balances at cycle 2, then resolved cycle 2. Browser warning/error log was empty. One automated click during workspace scrolling did not select the decision; refreshed accessibility state and a direct control activation succeeded. No code workaround was introduced for that automation miss.

This verifies autosave/continue and actual migration code in tests, not a browser file-picker export/import roundtrip, cross-version handshake, physical two-PC reconnect, or worst-case transport size. Those remain release acceptance work. N-02_ACCOUNTING_REPAIR_PLAN.md records the inspected next engine package; it is not an implemented accounting fix.

Final save-integrity regression evidence: ../../reports/baselines/N-00-2026-09-05T00-49-57-321Z.json. All six named test families plus both 800-game audits passed; audit stdout reproduced unchanged, source hashes stayed fixed, and diff whitespace checks passed. The isolated test tab and server were closed afterward.
