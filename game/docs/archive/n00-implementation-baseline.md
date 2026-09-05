> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# N-00: implementation baseline

Date: 2026-09-04. Target design: BRANCH_WARS_UNIFIED_BLUEPRINT_v7.md in the enclosing workspace.

## Scope and preservation

This package adds a repeatable evidence runner and a current implementation inventory. No game economics, UI, save schema, AI, or transport rules are intentionally changed.

Verified repository HEAD at inspection: `d764495` (Fix seat bias, dead operating models, and branch/capability pricing).

The working tree already contained changes to BRANCH_WARS.html and tests/engine.test.js, plus banking-empire-roadmap.md, planning-upgrade-status.md, and an untracked tools directory. Those are preserved, not treated as a clean committed release. In particular, tools/build_reference.js was not modified.

## Repeatable evidence

Run `node tests/capture_baseline.js` from the game directory.

The runner records exact source SHA-256 hashes before and after checks, HEAD, initial status/diff statistics, runtime version, exit codes, errors, and full outputs. It runs engine tests, transport tests, the 800-game balance audit twice, and the Windows LAN suite. New timestamped JSON reports appear in ../../reports/baselines; existing reports are never overwritten.

Repeated audit equality proves reproducibility of that test harness's output, not deterministic saved-game continuation. The runner does not access credentials or push changes. Git configuration warnings are retained in evidence and must not be mistaken for a successful remote check.

## Verified implementation versus target

| System | Current source evidence | Remaining target work |
|---|---|---|
| Game distribution | Embedded engine and client in BRANCH_WARS.html; version 8.1 | Tested seams without a wholesale rewrite |
| Planning | Shared planBudget, fundingStep, operatingPreview, operatingReport; parallel initiatives and capability funding | Full causal ledger and end-of-turn cash bridge |
| Geography | 12 named territories; scope filters; two-player shares | Regions, local cohorts, supporting institutions, re-entry |
| Market loss | resolveMarketExits: below 12% for three turns closes facilities and assigns 100% to the rival; may grant a free branch | Remove permanent exclusion in national modes and replace unearned capture rewards |
| RNG | Engine rint/pick and multiple operations use Math.random; player IDs may use crypto; creation uses Date.now | Authoritative serialized RNG, explicit identity/time treatment, stable ordering |
| Replay tests | Harness replaces Math.random with a seeded stream outside game state | Resume/interleaving/replay tests with RNG inside each save |
| Reporting | Human resolution strings, trend snapshots, operating-stage report | Structured cause-linked events with visibility and reconciled postings |
| Accounting | riskAssets includes deposits * 0.2; settleFunding can draw directly from capital for residual need | N-02 exposure and funding semantics; do not normalize these as correct accounting |
| Difficulty | simulateMarkets grants chairman bots +1.5 strength | Future explicit difficulty-quality work; conflicts with no-hidden-bonus target |
| Products | Categorical product choices and policy presets | Simultaneous authored offers, maturity and loan cohorts |
| Operations | Four staffing roles, facility types, capacity and capability spending | Department workload, local contribution, managers and upgrades |
| Expansion businesses | No full group/entity or company-share model identified in current core | Subsidiaries, consolidation, custody segregation, share settlement |
| Multiplayer | Shared engine plus transport and LAN suites | Physical two-PC acceptance; honest trusted-host privacy model |

## N-01 implementation boundaries

Before replacing randomness, enumerate creation, AI planning, economic/events, opportunities, turn resolution, IDs, and repair/migration paths. Avoid an engine-global RNG that lets one game or preview affect another. Random comparator sorting in makeOpportunities needs stable sampling; its replacement intentionally changes seeded sequences and must be recorded.

Specify legacy-save seed initialization once, persist it, and test repeated migrations. Distinguish game-state identity from transport message nonces: do not weaken transport randomness while making simulation repeatable. Keep creation timestamps as explicit metadata or replay inputs rather than silently claiming byte-identical creation.

Build ledger schema and visibility rules before instrumenting mutations. A generic before/after diff is not a causal explanation. N-01 may need smaller subpackages (deterministic state, ledger plumbing, mutation coverage); report partial coverage honestly and do not label it complete until material paths are accounted for.

Required checks: identical seed/intents/version; interleaved independent campaigns; save/resume against uninterrupted execution; previews consume no RNG; stable event ordering; hidden plans remain private; migration and all transports preserve authoritative fields.

Non-goals for N-01: changing accounting coefficients, permanent exits, difficulty bonuses, national map content, products, or balance multipliers. Those remain separately scoped follow-ups.

## Readiness limits

## Captured results

Evidence: ../../reports/baselines/N-00-2026-09-05T00-21-40-118Z.json (UTC timestamp; local date September 4).

- Engine suite: PASS, including 48 long-run campaigns and existing migration/validation/UI-contract cases.
- Transport suite: PASS.
- Windows LAN server suite: PASS (health, creation, joining, relay, retry deduplication).
- Balance audit: two runs of 800 games, byte-identical stdout; zero unfinished at 500, zero exceeding 250.
- Outcomes per run: 774 buyouts, 16 receiverships, 10 domination endings. Median 55 turns overall; national median 52, p90 61.
- Source hashes unchanged across checks.
- Emergent identity samples are highly uneven (no People-First observations); these results do not establish balanced selectable strategies.

## Unverified acceptance

Baseline test passes do not establish accounting correctness, long-form fun, adversarial multiplayer privacy, current GitHub synchronization, or browser/physical two-PC acceptance. The unchanged game remains a local-scale ruleset despite its national scope label.
