# V3 release report

## Release assessment

V3 is a playable **regional banking / optional Financial Group preview release**,
not completion of the entire blueprint. Its clean player package contains six
allowlisted files and no development experiments, credentials or personal saves.
The V2 packages remain unchanged rollback copies.

- Distribution: **V3**. New Financial Group campaigns: **rules 6 / save 9.5**.
- Assembly: **134 inputs**.
- Portable SHA-256:
  `4d616ad43145baac692d49aa6f864fefe96e0fffa7396cc81554107ee21cd107`.
- Engine SHA-256:
  `12b73802ad5526f7629f5341a3d29fc2d1f6e591ed9e1394c8edbfd5e7e5c350`.
- Existing supported campaigns keep their original rules; no automatic upgrade.
- Publication was separately authorized by the user for this V3 snapshot.

### Exportable artifacts

The release is published on `feat/relationship-offers` with the immutable
`v3.0.0` tag; it does not merge or replace `main`. The tagged source contains
development history, while the player ZIP contains only the six runtime files.

| Artifact | SHA-256 |
|---|---|
| `releases/branch-wars-v3.zip` | `85dae43104c4c68f106b371b6ead8891a453bd08a4198162133a493e3a7ab28f` |
| `releases/branch-wars-v3-manual.pdf` | `b577325f9c4fd34a2e73a3feda41acd47dc4e0ecd7b2b3c3dfec568cb5b9e1ed` |

The ZIP was freshly extracted and all six files verified against its manifest.
The manual is 45 rendered pages with 35 chapters and 37 navigation bookmarks.
It covers the current playable systems, optional rules and multiplayer recovery,
and distinguishes catalog placeholders and deferred expansion content.

## Overnight change summary

Development window summarized: **September 8, 2026, approximately 00:00-08:00
America/Chicago (CDT)**. Release verification and manual production continued
after this window. The following separates playable changes from research code.

### Newly playable or materially deepened

1. **A staffed insurance agency.** Three commercial cover types compete across
   six operating companies. Launch capital, setup, recruitment, salaries,
   outreach, renewals, service capacity, carrier-funded commissions, distributions,
   capped parent support and failure/relaunch now have separate books. Insurance
   ownership is independent of a company's banking mandate. This is an agency,
   not an insurance underwriter.
2. **A developing facility network.** Identified locations support different
   purposes, real physical staffing, wear, maintenance, paid renovation,
   conversion, construction ramp-up and finite nearby hub support. A partially
   staffed building is not assumed to deliver its entire catalog capacity.
   Wealth offices remain license-blocked; the catalog is not proof a wealth
   subsidiary exists.
3. **Persistent leadership and departmental budgets.** Qualified existing
   specialists can take compensated leadership posts with different teaching
   strengths. Training uses paid time; appointment, severance and unpaid
   compensation remain obligations. Shared reserves and budget envelopes bound
   management suggestions without permitting autonomous major strategic actions.
4. **Eight actual departmental functions.** Sales/relationships, onboarding/service,
   credit administration, collections, technology, risk/compliance, treasury and
   people management now compete for a conserved workforce. Extra quarter-FTE
   allocations and paid finite vendor work flow into actual operating consumers.
   Vendors do not create headcount. Unused purchased work is still charged.
5. **More useful management explanations.** Functions/workload and leadership/budget
   desks, a retained-earnings bridge, and customer-capacity cards distinguish bank
   staff, paid vendors, expertise, effective throughput and remaining sales time.
   Preview/Stage/Adopt remain separate from submitting a turn.

### Defects repaired in the V3 runtime

- Productive facility staffing avoids wasting scarce physical staff on partial
  bundles that produce nothing, while protecting existing output and hub links.
- Group6 wider-facility construction now actually completes; it is not stopped
  by an older Group5-only completion guard.
- Valid saved institutional identity is preserved on import until the normal
  monthly update. A captured month-264 doctrine/replay mismatch is covered.
- Customer offers/onboarding use consistent paid staffing and frozen expertise;
  a captured month-37 reporting/reconciliation failure is covered. Legitimate
  mentor training and customer draft conflict recovery are retained.
- Combined renovation/conversion budgeting and lifecycle forecasts respect the
  same opening funds, physical staff and delivery obligations.
- Multiplayer requires fresh bilateral Group6 staffing compatibility, including
  connection-bound challenges. Stale responses cannot silently re-enable ready,
  adopt incompatible state, or bypass async commit/reveal/session checks.
- Large browser saves and repository checkpoints use lossless structural
  deduplication plus compression. History is retained rather than silently
  truncated. Strict malformed-data and expansion limits remain enforced.
- The release audit then found a real checkpoint-version defect: a DAG-packed
  game with a small raw connection could be stamped as an uncompressed checkpoint
  and refused on resume. V3 recognizes both supported packed formats. New actual
  recovery cases cover DAG/raw, DAG/LZW, all-DAG and inconsistent outer versions.
- The actual 480-month campaign exposed a raw-text size ceiling after simulation
  itself passed. V3 raises that bounded ceiling from 32 to 64 million-scale
  string units, retains code/depth/expansion-bomb guards, and preserves the full
  captured campaign as a regression fixture. No ledger history is discarded.

### Checkpoint trail

| Local checkpoint | Time CDT | Content |
|---|---|---|
| `eea1d00` | 00:13 | Funded agency operations and compatible peer handshakes |
| `05926a1` | 03:25 | Group5 facility lifecycle and department groundwork |
| `8095eca` | 06:14 | Group6 department integration and earnings review |
| `c3ef80f` | 06:16 | Isolated funded loan contracts/private company statements |
| `6fad61b` | 07:03 | Isolated loan ownership, purchase basis and liquidation |
| `ed544d6` | 07:43 | Isolated company demand and private-safe service forecasts |

The final three checkpoints are **not playable features**. Their experiments
include seven-product contract structures, servicing, collateral, funded company
demand, loan transfers/liquidation and forecasts. They are absent from the
production assembly. The unpromoted AI origination selector is also excluded.

## Debug and regression evidence

The final Windows regression gate passed **167/167 suites** on **4d616ad4** in
about **40.4 minutes**, with no failed suite, unchanged captured source and
exactly reproduced seeded balance output. The native Windows LAN suite passed.
Evidence: `reports/baselines/N-00-2026-09-08T13-56-15-450Z.json`.
The final-build large-save recovery check also passed on the real 52MB campaign,
including exact resume, retained retry state, fresh handshake and failed-write
preservation. The separate outer release-balance stage is recorded below.

The audit trail is intentionally retained:

- **f9836bda:** the first run passed 165/166 suites. The failed test incorrectly
  fed a modern staffing report into a frozen unsupported reader. It was repaired
  to create a genuine historical campaign and reproduce the original identity
  bug, while retaining modern exact replay, idempotence, paid-hiring/accounting
  and explicit old-reader refusal. An independent review found no weakened
  current-replay assertion. Original report:
  `reports/baselines/N-00-2026-09-08T12-18-23-530Z.json`.
- **cee444d3:** after the GitHub checkpoint-label repair, a new complete Windows
  run passed **166/166**, with unchanged captured source, reproduced balance
  output and actual Windows LAN coverage. Its outer 1,920-month release-balance
  stage also passed. Reports:
  `reports/baselines/N-00-2026-09-08T13-13-59-165Z.json` and
  `reports/baselines/release-balance-2026-09-08T13-55-54-836Z.json`.
- The separate 480-month checkpoint then **failed autosave on cee444d3**, despite
  that engine/regression pass. This is recorded in
  `reports/qa/v3-long-save-verification.json`, not erased or called a pass.
- **4d616ad4:** integrates the bounded size repair and a permanent real-state
  regression. Its additional actual-code recovery evidence is
  `reports/qa/v3-final-long-save-verification.json`. Gameplay/engine bytes remain
  unchanged from f9836bda, but storage acceptance is tested on this final build.

No legacy golden or failed report was regenerated to obtain a pass.

### Coverage and limits

Hosted workflow allowances were raised to 60 minutes for the source gate and
180 minutes for Windows. The local preflight baseline took 41 minutes before
outer balance, and the earlier measured Windows hosted multiplier was about
2.6. No tests or per-test safety timeouts were removed. This is scheduling
headroom, not a claim that remote CI has completed.

Multiplayer remains a **trusted-host game**, not a competitive anti-cheat service.
Privacy tests cover the rendered/public views and normal protocol messages; the
authoritative host still runs the full engine. They do not make an untrusted
host or a broadly shared repository credential safe.

| Area | Evidence | Limit |
|---|---|---|
| Engine/accounting | Reconciliation, funded postings, paired transfers, obligations, forecasts, malformed states | Does not establish a complete real-world banking model |
| Compatibility | Frozen old engines, original rules and prior Group generations, imports/rematches, exact replay fixtures | Old executables are not required to read newly introduced feature reports |
| Multiplayer | LAN, direct and repository simulations; colors, lobbies, peer compatibility, stale/duplicate messages, retry/checkpoint recovery, sealed plans and privacy | No actual two-computer or external repository-room acceptance in this release audit |
| Windows LAN | Actual PowerShell server suite: health, create/join/authentication, malformed messages, relay and retry deduplication | Not a test of the user's router/firewall |
| Large saves | Captured month37, month264 and completed month480 campaigns; actual autosave and GitHub checkpoint code under 5MiB quota adapters | Browser quotas vary; storage is still finite and synchronous |
| Browser UI | Final 4d616ad4: setup confirm/cancel, six-market override, actual month4 resolution, reload/Continue at cycle5, retained identities, Group/agency/workforce desks, 500px layout and zero observed console warnings/errors | No complete usability/accessibility or human-fun acceptance |
| Packaging | Exact six-file allowlist, hashes, spaces in paths, no-overwrite/stale-build rejection, packaged replay | A hash detects a changed file; it does not authenticate an untrusted distributor |

The captured month264 JSON was about **30.5 million characters**. The new local
save occupied **1,038,596 UTF-16 bytes**, with a **1,456,252-byte** host checkpoint
in that test. Exact reconstruction and failed-write preservation passed. Raw
decode and expansion limits still exist; export regularly and retain old backups.
The added DAG/raw-connection recovery case occupies **1,039,600 bytes** and resumes
through the actual GitHub recovery code with a fresh peer handshake required.
The final raw-text limit is **67,108,864 JavaScript string units** (64MiB of ASCII
JSON), not unlimited campaign memory. The compressed-code ceiling remains
2,097,152 units, with a depth limit and reference-expansion checks retained.

## Balance assessment

### Established regional-service profile

Final V3 **4d616ad4** passed **16 cases / 1,920 months**, covering four
scenarios and four seeds, with no terminal campaigns, skipped initiatives or
cancelled initiatives. Maximum owner-view size was **559,901 bytes**. Peak
combined-player deposit share was **74.23%**. This profile does not enable all
new Group6 systems; it is compatibility/balance evidence for the established game,
not a substitute for the following Group6 checks. Evidence:
`reports/baselines/release-balance-2026-09-08T14-38-33-306Z.json`.
Together with the Group6 192-, 120- and 480-month checks, the selected balance
characterizations cover **26 campaigns / 2,712 resolved months**, in addition to
the other engine and historical-rule sweeps within the regression gate.

### Base-rule strategy identity audit

The full gate also repeated an **800-campaign** emergent-identity audit exactly:
median length **59 cycles**, 90th percentile **85**, maximum **235**, with
771 buyouts and 29 domination endings. A separate historical-funding sweep also
passed. These are established ending-enabled rules, not the open-ended Group6
characterization below, and are not counted in the selected 2,712-month matrix.

Observed identity win rates were community 47.2% (1,406 bank appearances),
commercial 68.4% (19), digital 79.6% (147), and efficiency 21.4% (28); no bank
finished with the people identity. Identities emerge during play, so these are
unequal, selection-biased groups, not a controlled starting-strategy tournament.
They nevertheless flag identity diversity and strategy effectiveness for a
proper paired-policy investigation. An exact repeated result is not evidence
that every strategy is equally viable or that a closed-rule campaign is long
enough for the user's preferred open-ended experience.

### Financial Group6, 120-month balanced campaign

Frozen f9836bda source/portable, with an engine byte-identical to final V3;
**120 resolved months, 11 exact replay checks**,
both banks still operating, all six companies active. There were two
constructions, four conversions, three renovations and one agency launch.

| Metric at month120 | Bank 1 | Bank 2 |
|---|---:|---:|
| Cash | $1,076,667 | $1,299,887 |
| Deposits | $7,297,939 | $13,100,809 |
| Combined-player deposit share | 35.78% | 64.22% |
| Loans | $505,036 | $746,347 |
| Staff | 5 | 5 |
| Capital ratio | 155.41% | 27.72% |
| Agency | Active, no failures | Not launched |

Peak deposit share during this sample was **69.92%**, and the lowest capital
ratio was **5.27%**. There were no leadership arrears. A high closing capital
ratio can reflect a very small risk-bearing loan book, not superior growth.

### Wider Group6 checks

The four-scenario/two-seed Group6 matrix passed **8 campaigns / 192 months**
with **24 exact replay checks**, unchanged frozen source, no terminal campaigns
and all six companies active in every result. Lowest observed capital ratio:
**7.53%**. Highest observed combined-player deposit share: **59.37%**. There were
three constructions and seventeen conversions, but no specialist hires,
appointments, agency launches or renovations in these short runs.

These engine-only checks use frozen f9836bda, whose engine is byte-identical to
the final V3 runtime. They do not exercise the later checkpoint wrapper repair.
The **480-month Regulatory Siege** campaign completed with **41 exact replay
checks**, no engine invariant/replay failure and both banks still operating.
However, **all six corporate clients had resolved**, and both agencies were
failed at the end. There were 64 constructions, 37 conversions, 25 renovations,
6 appointments, 91 specialist hires and 5 agency launches across the campaign.

| Metric at month480 | Bank 1 | Bank 2 |
|---|---:|---:|
| Cash | $102,666,468 | $77,919,582 |
| Deposits | $117,411,236 | $92,478,075 |
| Combined-player deposit share | 55.94% | 44.06% |
| Loans | $7,674,827 | $8,797,226 |
| Staff / active leaders | 42 / 3 | 42 / 3 |
| Capital ratio | 13.29% | 14.29% |
| Final network | 9 ATMs | 9 ATMs |
| Agency failures during run | 1 | 4 |

Minimum observed capital was **7.87%** and peak combined-player deposit share
was **77.89%**. The full instrumented run took about **80.7 minutes**; that includes
both AI plans and repeated validation/replay, not just turn settlement.

Crucially, the final campaign also reproduced a **real V3-candidate autosave
failure**: its 52,227,013-character state exceeded the old 32MiB raw safety limit.
The engine PASS did not establish recoverability. A bounded 64MiB ceiling was
then verified in an isolated candidate using the actual autosave/checkpoint code:
1,164,222-byte local record, 1,618,172-byte repository record, exact reconstruction,
retained retry queue, fresh handshake, corrupt-checkpoint refusal and failed-write
preservation under 5MiB quota adapters. Final integration evidence is recorded
in `reports/qa/v3-final-long-save-verification.json` and passed on **4d616ad4**;
no failed report was overwritten.

### Important unresolved balance issues

1. **Lending starvation / shrinking bank portfolios.** Both banks began with
   $9.5M of loans. Their final $505K/$746K books reveal substantial runoff.
   In the retained final40 months, zero origination occurred in 38/29 months;
   nearly all coincided with no remaining lending time after administration.
   High administrative coverage alone does not demonstrate a healthy origination
   strategy. A possible AI selector repair exists only as an experiment.
2. **Corporate-content exhaustion / closed-pool drain.** All six firms resolved
   in months **383-384** of the stress campaign. That removes this release's commercial-agency
   customer base and much of its corporate mandate contest. This is a significant
   long-game design issue, even if each individual failure was correctly funded.
   The corporate pool began with $48.216M; at month480 only $284,158 remained in
   its outside customer/supplier account. $19,824,594 had crossed the bank boundary
   and $24,249,700 net had crossed the insurance boundary (including carrier
   premiums, not merely agency revenue). $3,857,548 remained with creditors.
   These amounts reconcile exactly. Source review shows shared finite sales cash
   and no equivalent consumer-spending return from those boundary flows. This
   supports a structural cash-recirculation investigation, not merely six
   unrelated unlucky companies. Investigate funded economic renewal and agency
   relaunch policy; do not solve it with immortal firms or conjured money.
3. **Underused strategic systems.** Neither AI hired specialists or appointed
   leaders in the 120-month sample. Only one agency launched. Customer offers
   and application activity were sparse. Passing feature tests does not mean
   the AI uses those features well in an ordinary campaign. The 480-month run
   did use specialists and leaders, so this is scenario/horizon-dependent,
   not a claim that those AI actions never work.
4. **Facility variety is not established.** The 120-month final network had two
   ATMs and one retail office. Cheap networks can be rational, but this does not
   prove commercial offices, hubs and complex departments are attractive paths.
   Both 480-month banks ended with nine ATMs and no other office models, despite
   substantial building/conversion activity. Their loan/deposit ratios were
   only about 6.54% and 9.51%; large cash piles are not evidence of good deployment.
5. **Dominance is allowed, not automatically a defect.** Shares above 50% can
   be earned. The unresolved question is whether weaker players retain meaningful
   choices and achievable profitable niches, not whether results are forced equal.
6. **Performance depends on campaign complexity/history.** The 120-month
   instrumentation took about 944 seconds, including two AI plans, accounting,
   privacy and replay checks. This is harness time, not a measured human-click
   latency. The first isolated 52MB storage pack/unpack probe took about 8.4 seconds
   in Node. Storage remains synchronous and bounded, so long-history browser
   responsiveness is a real remaining acceptance/performance concern.

## What remains outside V3

Brokerage/wealth operating subsidiaries, player company-share auctions and
financed corporate takeovers, the full identified-borrower seven-product lending
system, and a universal research/implementation/adoption/maintenance framework
remain incomplete. National Empire and insurance underwriting remain deferred.
The current three-family cohort lending system is playable; experiments are not
being advertised as a replacement for it.

## Recommended two-player acceptance session

1. Both players export any existing campaign and use the same V3 package.
2. Create a repository lobby with separate authorized tokens; choose visibly
   different names/colors and review shared preview settings.
3. Verify host edits clear readiness and guests cannot change shared rules.
4. Complete several ordinary simultaneous turns, including an agency or facility
   instruction if enabled. Check both seats' month, public totals and identities.
5. Reload the guest before both plans lock, then test host Resume/Retry recovery.
   Confirm no duplicate turn, lost sealed plan, private instruction leak or
   permanently incorrect connected/paused indication.
6. Export and import the host campaign. Continue it, verify its rule selections,
   then assess whether managing the same bank is understandable and enjoyable.

These human checks are explicitly outstanding. V3 is not described as bug-free.

## Reproducing the checks

From the repository root, run `node game/tools/check.js --full`. It captures new
timestamped evidence and does not overwrite the original baseline. The three
Group6 characterization commands below run from `game/`; report filenames must
be new, and long runs can take substantial time:

```text
node tests/department_balance.test.js --report=v3-repeat-matrix192.json
node tests/department_balance.test.js --scenario=balanced --seed=department-A --turns=120 --report=v3-repeat-balanced120.json
node tests/department_balance.test.js --scenario=regulatory --seed=department-A --turns=480 --report=v3-repeat-regulatory480.json
```

These reports retain exact build identities and complete engine checkpoints.
Only compact, hashed summaries are published with V3 to avoid including tens of
megabytes of test campaign state. Manual source and its render/verification tools
are in `game/manual/`; the compiled PDF requires no Python or fonts to read.
