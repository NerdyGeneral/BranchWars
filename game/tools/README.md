# tools

The [documentation index](../docs/README.md) is the starting point. Run
`node tests/docs.test.js` from the game folder to verify document naming and
local links; this gate also runs in `tests/capture_baseline.js`.

## Stabilization gates

From the repository root:

```text
node game/tools/check.js          fast checks
node game/tools/check.js --full   complete Windows regression and balance audit
```

The fast gate includes committed behavioral expectations, saved-game continuation,
override ceilings, reference freshness, docs and transport. It does not replace the
full release gate or physical two-computer testing. `RUN_TESTS.bat` still runs the
complete suite. Golden updates are deliberate: see [contributing](../../CONTRIBUTING.md).
The original save fixtures must not be overwritten.

`RUN_TESTS.bat` delegates to `tools/check.js --full`, including newer checks added
after the original baseline runner. Each central run preserves an append-only
JSONL journal, captured output log and terminal JSON receipt in
`reports/baselines/`. Missing terminal receipts mean incomplete evidence, not a
pass. Partial `--from=tests/FILE.test.js` runs are explicitly labeled partial.
The runner fingerprints playable source, tests, tools and preserved references
before and after execution; changing those inputs invalidates the run.

Baseline subprocesses have a bounded 30-minute default timeout: the previous
10-minute limit was shorter than an observed 16.6-minute staffing test.
`BRANCH_WARS_TEST_TIMEOUT_MS` may explicitly set 60000–7200000 milliseconds;
this changes the execution allowance, not assertions or acceptance criteria.
CI retains JSONL and output logs as well as JSON reports. Automated gates still
do not substitute for visual review or real two-computer acceptance.

### Income checkpoint diagnostics

- `profile_campaign_snapshot.js SNAPSHOT.json.gz --current
  --output=unique-profile.json` profiles two actual AI plans from a preserved
  mature campaign and compares plans, world and RNG against the uninstrumented
  engine. Reports go under `output/` and existing reports are refused, not
  replaced. Inclusive function times overlap; these are engine diagnostics,
  not browser latency. Node's optional CPU profiler can identify work below
  those function boundaries without changing the playable source.

- `trace_campaign_economics.js 12 economics-unique-name` preserves a new ordinary
  Expanded baseline and source. It refuses to replace an existing run folder.
  Use `--bank-economics` for explicit9.32 (including servicing and workload
  prerequisites); no flag upgrades a resumed campaign.
- `verify_income_baseline.js economics-unique-name income-unique.json` replays
  its exact plans/results against current source and checks reporting/persistence.
- `income_strategy_lab.js 120 income-core-unique.json` compares three Core
  customer-facing staffing tilts, keeping the bot's Operations reservation.
  Compare equal-month checkpoints, not totals from different game lengths.
    Core accumulated operating earnings are not an all-in retained-equity measure.
    `--balance-sheet` instead runs Core8.19 and reports actual retained earnings,
    including strategic costs; it also validates the accounting book each month.
  `--bank-economics` runs the explicit8.18 salary/income correction; the earlier
  `--serviced` option still tests8.17 without enabling new economics.
- `extend_income_campaign.js 120 income-extended-unique` continues the preserved
  checkpoint65 month108 Balanced save against both V4 and current source. This
  is a specific continuation diagnostic, not a general save importer or a
  Regulatory stress test. Raw owner snapshots stay local.
- `income_economy_experiment.js 12 income-economy-unique` runs four private
  ordinary-AI source sensitivity experiments: unchanged economics and removal
  of abstract income at three base-payroll values. Supports12 or24 months,
  `--variants=current,no-bonuses,service-payroll12,service-payroll9`,
  `--seed=business-balance:1` (or2), and
  `--scenario=balanced` (or rate/regulatory/growth). Selected replacements are
  preflighted before play; source hashes, exact substitutions, failures, actual
  balances and causal reconciliation are recorded in a unique local folder.
  The playable build and saved campaign rules are never modified. These are
  numerical experiments, not supported alternate saves, release tests or a
    fixed-shock counterfactual: changed AI choices can change later RNG use.
    Explicit `--variants=provisional-current,service-pricing,service-workload`
    instead selects the supported8.18/9.32 economics foundation and bounded
    private fee/workload sensitivities. The latter two test $6K base pay and
    $250/$200 business/merchant fees; `service-workload` also tests20/50
    relationships per quarter. They are diagnostics, not accepted balance values.
- `trace_core_funding.js income-core-funding-unique [legacy|serviced|economics|balance-sheet]`
  reproduces the Rate/income-core:2 balanced-staffing matrix case, recording
  every month's plans, actual reports and causal funding movements. The default
  is explicit Core8.18; alternatives use8.16/8.17 or8.19 (`balance-sheet`).
  Core8.19 records retained earnings, not the older cumulative-profit counter.
  Preserves source and opening/
  closing saves in a new folder, never replacing prior evidence. Completed months
  count actual resolved rows, including a terminal month that does not increment
  the campaign clock. Different early endings are not equal-horizon comparisons.

- `edition_balance_lab.js NAME` plays ordinary same-rule AI in both seats of
  current Core and Expanded setups (`--variants=expanded,expanded-933,core`,
  default 36 months, seeds 1-3, Balanced and Rate) and records, per checkpoint,
  deposits, loans, cash, loan-to-deposit ratio, capital ratio, operating profit,
  offices by model and which lending cap binds (staff, spare cash or offices).
  `--tune=targetLoanToDeposit=.7,deploymentRate=.15` measures 9.34 constants in
  a private copy; the report records the tuning and the engine hash measured.
  Each campaign runs in its own process and refuses to start if the source
  changed after the run began. Expanded AI turns take seconds, so a 36-month
  campaign takes about ten minutes. Writes `output/edition-balance-NAME.json`
  and never replaces an earlier report.

These tools are not full release gates. Unique output names preserve failed
experiments and their actual build hashes alongside successful runs.

### Offline architecture checks

`architecture_overrides.js` uses a pinned [Acorn parser](https://github.com/acornjs/acorn)
to distinguish real function/API writes from unrelated local variables, comments,
strings and parameter defaults. `tests/architecture_scope.test.js` covers scope
boundaries, destructuring/compound/loop writes and parser integrity. Both fast and
full gates include these regressions; override ceilings are not regenerated.

The development-only parser is vendored in `tools/vendor/acorn.js` under its MIT
license (`acorn-license.txt`). `acorn-provenance.json` records the exact version,
registry tarball integrity and file fingerprints. Git preserves those bytes.
No package installation or network is needed to run the checks. The parser is
not part of the game manifest, playable HTML or player runtime. This static check
is not a call graph or proof against dynamic eval/API-alias mutation.

## `build_game.js`

Edit `src/` modules, then run these commands from the repository root:

```text
node game/tools/build_game.js
node game/tools/build_game.js --check
```

`src/manifest.json` lists ordered engine/content, UI, network, persistence and style inputs. The builder produces the existing portable `BRANCH_WARS.html`; playing still requires no Node, bundler, package installation or external assets. Check mode is read-only. Missing/duplicate/unlisted modules, invalid script syntax and stale output fail validation. CRLF and LF inputs produce identical LF output.

The engine and browser shell have separate private scopes connected by `BWEngine`. Within each scope these are ordered source modules, **not isolated ES modules**; legacy feature adapters and browser session state still share bindings. This is documented debt, not a claim that file extraction removed all coupling. See [architecture](../docs/architecture.md).

## `build_reference.js`

Builds `../docs/game-reference.md` from the live engine.

```
node tools/build_reference.js           rebuild
node tools/build_reference.js --check   fail if the committed file is stale
```

Every number, name and description in the generated sections is read out of
`BRANCH_WARS.html` at build time, and several sections embed the actual function
source, so the reference cannot describe rules the game no longer has. Prose
lives in `reference-template.md`; that is the only part written by hand.

`--check` runs inside `tests/engine.test.js` and at the top of `RUN_TESTS.bat`,
so changing a cost without rebuilding is a test failure rather than something to
remember. To add a generated section, add it to `sections` in the builder and
place a `<!--{{TOKEN}}-->` marker in the template — the builder fails if a token
is unknown or if a generated section is never placed.

## Measuring balance without fooling yourself

Campaigns are deterministic: `createGame({ seed })` replays identically. Use it.
Every pitfall below cost real time in past sessions.

**Pair within a snapshot.** Comparing medians across independent campaigns is far
too noisy. An unpaired test once said branches produced no lift at all; paired
against the same mid-game state the same change was +11M to +42M deposits, all
significant.

**Hold the budget constant.** Capability lanes looked worthless when measured with
building disabled — the project-multiplier lanes had nothing to multiply — and
negative when measured with building enabled, because capability spend crowded
out branches. Historical attribution experiments used out-of-band funding to
isolate a multiplier; that is not a playable balance result. Release acceptance
controllers must pay normal costs from actual resources and preserve books.

**Equalise everything except the variable.** A playstyle matchup matrix inverted
almost completely — one archetype went from 10% to 82% — once every archetype was
allowed to build. The first version was measuring builders against non-builders.

**Check monotonicity.** A price sweep that does not improve as price falls is
noise. The network capability lane failed this (68 → 117 → 61 → 134 with error
bars to ±137) and was correctly left untuned.

**Watch for reverse causality.** Anything read from a quantity that grows because
you are winning — headcount, cumulative hires — will make the winner "become"
that thing late, and it will look like the strongest strategy. Share-of-spend
measures survive this; absolute totals do not.

**Report error bars, and re-run.** If the ordering shuffles between runs, that is
parity, not a defect to tune.

**Watch the realm.** The engine runs under `vm.runInNewContext`, so arrays derived
from game state carry the sandbox's prototypes. `assert.deepStrictEqual` against
a locally built array fails on identical contents.

## Local release packaging

After the release gates pass, create a new directory outside the repository:

```text
node tools/package_release.js --output C:/absolute/existing-parent/new-release
node tools/package_release.js --verify C:/absolute/existing-parent/new-release
```

The parent must already exist and the release directory must not. The tool checks
the portable through the normal builder, then copies only the HTML, two Windows
launchers and LAN server, with a generated README and SHA-256 manifest. It never
merges with an old release or copies the developer workspace, private saves,
reports, credentials or checkpoints. Verification rejects extra, missing or
modified files. It does not publish anything to GitHub.

`tests/paired_release_balance.test.js --report` separately compares two scripted
policy controllers in genuine swapped-seat pairs on identical starting worlds.
Neither controller receives free funding or mirrored assets. Reported dominance
and existing early endings are observations, not automatic balance failures.

`tests/stabilization_balance.test.js --report` is the bounded six-controller
release diagnostic: 64 campaigns through 120 months and eight through 480,
unless a legitimate ending occurs. `--shard N --shards 4 --report` partitions the
same case list across four separate processes; `--quick` runs two months per
short case and is only a harness smoke test. It uses normal plan submission,
four scenarios, paired controller assignments and fixed seeds. It does not
replace optional-feature/network regression gates or human balance acceptance.
This extended matrix is a release exercise, not an extra run of every CI job.

## Reference points

Current expected values are in `../docs/game-reference.md` §12.

## Captured ordinary-campaign economics

`node tools/trace_campaign_economics.js 24 economics-unique-name` runs ordinary
Expanded AI from the fixed Balanced `business-balance:1` start. Use a new name;
the tool refuses to replace an existing output directory. It records the exact
engine, opening/six-month/closing compressed saves, actual plans, pure owner-view
forecasts and top-level causal financial movements. Cash, loans and earnings
must reconcile every month. It adds no resources or alternative strategy and
does not replace long-run balance, UI or multiplayer acceptance. Compare
reported operating profit with other earnings movements without subtracting
already-included operating costs twice. Recorded principal repayments return
cash, not income. Runs accept1–480 months; preserve failures as evidence.
Use `--resume=economics-prior-folder` with a new output name to continue a
terminal successful saved run toward an absolute target month. Rule-selection
flags cannot accompany resume. The tool verifies the predecessor source/closing
hashes, retains saved rules and records the starting month and lineage. It never
restarts a live run or reopens an ended campaign; reported continuation months
are distinct from total completed campaign months.

For a new trace, `--seed=business-balance:2` and `--scenario=regulatory` select
another reproducible ordinary start. Defaults remain the original seed1/Balanced
case. Resume rejects all creation overrides; it keeps the saved seed/scenario.

`node tools/income_mature_probe.js income-mature-unique.json` compares three
lending policies on the retained `output/income-extended-66/closing.json.gz`
world. It records the exact source/snapshot hashes, staffing available for
origination, facility ceiling, principal movement and operating forecast. It
does not settle a turn or change staff/resources. AI instructions are obtained
on a separate copy to keep its legitimate AI-random consumption off the inspected
world. This local diagnostic requires that preserved snapshot and is not a
clean-checkout test, balance tournament or claim that policies have equal future
risk. Outputs refuse to overwrite existing files.

Add `--facilities` to inspect the existing 60-month conversion valuation for
each available model. This exposes the real engine review inside its required
corporate-forecast context, without changing the exported runtime or executing
construction. It does not yet optimize staffing and construction jointly.

`--joint` compares conversions paired with three bounded allocations of the
same employees and conservative/balanced/growth policies, re-quoting department
and office work. Probe version2 reports next-operating-stage estimates only.
Its long-run value is unavailable: the original fixed-staff stream cannot value
later staffing changes. Existing earlier outputs remain historical evidence,
not proof no joint strategy works. `--commercial` compares current, unserved and
purchased relationship service. Neither changes campaign state, saved rules,
the AI stream or money. Detailed uniquely named JSON is kept; terminal output
is a compact receipt.

`--snapshot=output-folder` selects another preserved closing snapshot without
upgrading it. `--throughput=2` or`3` is an explicitly unsaved sensitivity
experiment limited to workload-corrected snapshots; it substitutes one production
coefficient only in a private runtime and records its separate engine hash.
It never changes game source, saved rules or the normal artifact, and is not a
realized balance run or an approved rate adjustment.

`node tools/income_branch_trial.js economics-servicebased66 income-branch-unique 12`
runs three actual-turn continuations from the same hash-verified, active closing
save: ordinary AI; deferral of unstarted research/projects; and the same deferral
plus a paid ATM-to-retail conversion with up to two existing employees moved to
lending (only if available above one Business and one Retail employee). Shared
department and office planners reassign finite work; ordinary AI still manages
the rival and other choices. It does not install projected facilities, create
staff, upgrade saves or revive ended games. All plans pass authoritative
validation; rejected interventions are reported rather than counted as adoption.
Each settled month checks accounting/ledger validity, report reconciliation and
cash/loan/earnings causal movements. The unique output folder retains exact
source, starting and closing saves, actual plans, expenses and incremental
results. A one-month smoke comparison is supported;12/24/120-month horizons are
diagnostics, not substitutes for the new-game balance matrix or human acceptance.

`--serviced` on `income_strategy_lab.js` or `trace_campaign_economics.js` explicitly
creates Core8.17/Expanded9.30 servicing candidates without upgrading comparison
saves or changing normal setup defaults.

`node tools/income_banking_trial.js 24 income-banking-unique`
compares ordinary AI with paid Lending- and Business-focused plans against an
ordinary rival in new Expanded9.32 campaigns. Optional creation flags are
`--scenario=balanced|rate|regulatory|growth`, `--seed=business-balance:1|2` and
`--strategies=ordinary,lending,commercial`. The deliberate plans rebuild finite
work and try funded hiring/construction; they do not change yields, create
resources or require subsidiaries. The additional buffer protects actual cash
plus six months of added payroll, not an extra regulatory-capital reserve.
Authoritative capital and staffing validation still applies. Rejected optional
steps are recorded, not counted as completed investments.

`node tools/income_banking_trial.js 120 income-banking-continuation --resume=income-banking-unique`
continues a terminal version2 or version3 trial through the absolute target month, with no
creation overrides. Engine, captured policy and closing-save hashes must match.
Ended arms stay ended. Reports retain predecessor identity, cumulative totals
and only the newly settled monthly records; outputs never replace predecessors.
The earlier extra-capital-buffer trial is deliberately incompatible. A two-month
uninterrupted run matched one month plus resume exactly for all three complete
campaign states, including RNG. Eleven focused policy tests are in the future
regression gate. Neither those tests nor a completed diagnostic proves balance.

`--service=protected` labels a separate version3 **diagnostic policy**, not a
campaign/save feature. It reviews finite relationship-service vendors after the
deliberate staffing plan. Current cash must cover all quoted commitments, a
$250K reserve and six months of added payroll. Existing task delivery/teaching,
capital and funding checks remain protected; the forecast must improve net
earnings after vendor costs. Ordinary AI is unchanged. Reports preserve the
policy hash, accepted/rejected reviews and actual settled financial results.
Version3 resume requires its marker and exact policy fingerprint; it cannot
silently resume as the old strategy. The covered first two months matched full
state/RNG after resume; longer actual purchases are tested in the separate
service-aware campaign reports. Do not promote these policies into the game
without evidence and a compatible new-rule boundary.

`--credit-workload` on `trace_campaign_economics.js` explicitly creates9.31,
including serviced income and portfolio-based loan administration. The same
flag on `income_history_network.test.js` verifies three Expanded transport pairs.
`credit_workload.test.js` checks fragmentation-invariant workload, shared
staffing, strict persistence/privacy and exact old-rule replay against the
preserved0033ac47 candidate. None of these flags upgrades a saved campaign.

`tests/income_statement.test.js` verifies additive9.31
source reporting, exact unchanged economics/AI/RNG versus preserved04f118ef,
three actual resolved months, current/previous-reader restoration, honest missing
detail and no double-counted costs. This is not a complete balance acceptance.

`tests/income_history.test.js` covers explicit Core8.16/Expanded9.29 private
reporting books, exact economic equivalence, resume, rematch, malformed records
and 480 bounded domain appends. That last check is **not** a 480-month campaign.
`tests/income_history_network.test.js` covers both editions across three simulated
transports, actual old-peer refusal, two resolved months per pair, half-ready
checkpoint recovery, fresh reconnects, duplicate messages and private views.
Normal Core/Expanded setup includes reporting. `--commercial` on the network
test separately verifies the newer explicit servicing boundary. Six engine
tests in `commercial_fee_economics.test.js` cover capacity, activation timing,
pure paid-work proposals, settlement/recovery and exact historical replay.

### Local candidate handbook

The current manual source is `docs/player-guide.md`. The older
`manual/build_v3_manual.py` and its catalogue remain frozen-release tooling.
`manual/build_candidate_manual.py` reuses their typography and original bank art
without changing or prepending to a published PDF. It requires an exact runtime
fingerprint and refuses to overwrite an existing output or sidecar manifest.

With ReportLab, pypdf and the existing Windows fonts available:

```powershell
python manual/test_candidate_manual.py
python manual/build_candidate_manual.py --guide docs/player-guide.md --runtime BRANCH_WARS.html --expect-runtime-sha EXACT_SHA256 --output output/pdf/unique-candidate.pdf
python manual/verify_v3_manual.py output/pdf/unique-candidate.pdf tmp/pdfs/unique-candidate
python manual/verify_candidate_content.py output/pdf/unique-candidate.pdf --guide docs/player-guide.md --runtime BRANCH_WARS.html
```

Use the bundled Python/Poppler paths if they are not on PATH. The renderer checks
text bounds and produces every page plus contact sheets; inspect those images
before delivery. Content verification checks current runtime/guide/PDF hashes,
section/bookmark counts, internal destinations and retained source words. These
checks do not certify gameplay accuracy, legal completeness or release readiness.
Keep the generated source manifest next to its candidate PDF; never substitute
the older published manual for a newly verified candidate.
