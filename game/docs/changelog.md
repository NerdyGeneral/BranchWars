# Changelog

## Local V3.1 candidate — technically verified, not published

### Group8 accounting book version4 — premises capitalised

- Buying an office moved cash straight out of equity: `delta(p,'cash',n)` posted
  `{cash:n,equity:n}` for every outflow, so a $644,000 branch destroyed $644,000
  of capital. Premises are an asset, not an expense.
- Group8 campaigns now open accounting book **version4**, adding a `premises`
  account alongside receivables and payables. `kind==='branch'` purchases are
  sourced as `capitalisePremises` and post `{cash:-x,premises:+x}` with no
  earnings effect. Research and remediation stay expensed, because they are
  expenses. Groups1-7 keep book version3 untouched.
- Follows the existing `withPayables` idiom exactly: `withPremises` is an
  explicit new-campaign boundary that never repairs or upgrades an imported
  book.

**Proven, and it changed nothing.** With capital injected so the planner's
headroom clears a branch, both groups expand 1 -> 5 offices in 14 cycles, and
Group8 ends holding **$1,933,340** of premises where Group7 holds $0. But the
capital and headroom curves of an ordinary campaign are byte-for-byte what they
were before the fix, because a bank that cannot afford its first expansion never
incurs capex to mis-account. The capex defect was real; it was not the binding
constraint.

**The binding constraint, measured.** Over 30 cycles a bank's equity falls
$1,800,000 -> $829,390 while operations *earn* $1,141,712. The drains are
discretionary: `applyInvestments` -$817,608, `startProject` -$520,000,
`transaction` -$220,000, `credit.resolution` -$149,480, `applyHiring` -$127,111,
`resolveCompetitiveActions` -$100,000. Deposits and loans shrink throughout, so
that spending returns nothing. **Investment spending does not pay for itself** -
that is the compounding failure behind both the flat loan ceiling and the
unreachable endings, and it is the next goal.

**Note for human play.** `pilotSpendingLimit` is AI self-restraint, not a rule:
`projectStartStatus` gates a human only on `p.stats.cash < terms.cost`. A human
starts with $2,400,000 against a $644,000 office, so two humans can expand and
reach the Group8 endings even though the bots will not.

### Group8 endings — reachable, but the campaign does not reach them

- **Group8 only.** Market exits now persist instead of being cleared every
  cycle, `buyoutPressure` and `consolidationStalemate` accumulate, and
  `evaluateStrategicEnd` keeps receivership on pilot terms (no free franchise)
  before deferring to the base rules for domination and hostile buyout.
  Groups1-7 still zero the counters every cycle and can only end in
  receivership, exactly as before.
- **Re-entry is priced, not forbidden.** The "permanently exited that market"
  refusal is lifted for Group8 and replaced with a premium scaled by rival
  share: `1 + rivalShare/100`. Buying back into a market a rival holds at 95%
  costs $1,255,800 against $644,000 normally. Completing the branch project
  clears the exit flag, so domination can be broken. The AI budgets the same
  premium it will be charged, so a bot can save for re-entry rather than being
  cancelled at execution.
- `projectCost(p,def,focus,premium)` gained explicit focus and premium
  arguments, both defaulting to the old behaviour. This also fixed a latent
  bug: `src/ui/dashboard.js` already passed a third `market` argument that the
  function ignored, so the quoted re-entry cost used the player's current focus
  rather than the market being quoted.

#### Measured over 24 campaigns per arm, 40 cycles each

| | market exits | re-entries | endings |
|---|---|---|---|
| Group8 | **55** | 0 | 0 |
| Group7 (control) | 0 | 0 | 0 |

A second Group8 arm at 60 cycles, after the act progression was opened, held
the same shape over its first six campaigns (15 exits, 0 re-entries, 0 endings)
and was stopped as redundant: the ending count cannot move while the capex loop
below prevents any bank from building a second office.

Consistent across all four scenarios (balanced14, growth17, rate12,
regulatory12 exits per six campaigns), 0 errors in either arm. The exit
mechanism works and is cleanly confined to Group8. **No ending fired in either
arm**, for the Act-gate reason recorded below; re-entry measured zero because a
bot that never builds never re-buys, not because the path is broken — the
clearing sits on the live branch-completion route and was verified directly.

Verification: `node tools/check.js` green, `node tools/check.js --full` green
("Full checks passed"), all seven compatibility fixtures pass unregenerated and
no file under `tests/fixtures/` changed.

#### Decisions taken

- **Ceding an uncontested market counts as an exit.** Approved: no branches and
  no customers is being out of a market.
- **Dominance earns no franchise dividend, and that is now deliberate.** Taking
  a market already hands over its customers through `pushShare`; a separate
  per-cycle dividend would pay twice for the same win. The goal's taper was
  moot because `franchiseDividends` returns `[]` for every Group1-8 campaign,
  so the $1.58M/cycle figure never applied to a modern campaign at all.
- **Group8 runs the real three-act progression.** The pilot overrode both
  `campaignAct` and `updateCampaignAct` to freeze every campaign in a single
  act ("Only institutional failure ends this pilot"). Act III gates every
  buyout path, so no ending but receivership was reachable by design.
  Groups1-7 stay frozen.

#### Two structural blockers found, one fixed, one not

- **The exit counter almost never started.** It required `branches[key]>0` —
  you could only exit a market you owned an office in and were then crushed in.
  Players hold offices in one or two of six markets, so in a 60-cycle campaign
  the streak never left 0 even with a rival pinned at the 5% share floor. In
  Group8, ceding counts too: rival operating, you not, under 12% for six
  cycles. Measured effect in a real campaign: **0 market exits before, 3 after.**
- **The campaign never leaves Act I, so no buyout can fire.** Act III gates
  every buyout path and needs strategy>=5, three controlled markets, or $36M
  deposits. Over 60 cycles the bots' deposits *fell* from $24M to $17M and each
  built two offices. Total domination has the same problem from the other side:
  it needs one player operating in all six markets, which the bots never reach.
  **This is an economy and AI-growth problem, not an endings problem, and it is
  outside this goal.** The endings are now mechanically reachable; AI-vs-AI
  campaigns still will not reach them.

### Group8 / save9.7 — rules boundary registered (feat/v3-economy)

- Register `financialGroupVersion:8`, stamped save `9.7`, as an opt-in rules
  boundary that is a functional clone of Group7. Nothing about Groups1-7
  changes; the new group exists so later economy work has somewhere to land
  that older campaigns can never be dragged into.
- Every open-ended version gate that topped out at7 now also admits8
  (`[..,7].includes(x)`, `x===7`, `x!==7` across31 source files). Closed
  windows that deliberately exclude7 — `[2,3]`, `[4,5]`, `[3,4,5,6]` — were
  left alone, so Group8 inherits exactly Group7's behaviour and none of the
  superseded rules.
- `relationships.js` pairs each save-version string with its group number, so
  it gained a separate `9.7`/Group8 clause rather than a widened gate.
- Peer handshake advertises `financialGroupSupported:8`. The capability is
  range-checked, so a Group7 campaign against a peer advertising7 still
  links; a Group8 campaign against that peer is refused rather than
  downgraded.
- **Engine digest moved, sanctioned:**
  `cc229f83…` → `f6fc59bd…` in `tests/usability_engine_boundary.test.js`.
  Registering a new boundary necessarily re-hashes the assembled engine. This
  is the intended boundary move, not drift.
- Seven kinds of assertion encoded the old Group7 ceiling, across twelve test
  files: the assembled engine digest; the advertised peer capability; the
  `hello`/`hello_request` wire frames; the setup checkbox default
  (`feature_setup`, `facility_ui`); the creation ceiling (`v31_version_boundary`,
  which now refuses Group9); and four `v31_*` tests that pin the **literal
  engine source text** of a gate, such as
  `if(g.financialGroupVersion===7)plan=planExecutionReserve(...)`. Those four
  did their job — they caught the rewrite — but they make any future gate
  refactor a multi-file edit, which is worth knowing before a Group9.
- Two copy defects were fixed because Group8 made them wrong rather than merely
  terse: `corporate-circulation.js` told the player a malformed save
  "requires a new Group7 campaign" when Group8 reaches the same guard.
- **Trajectory identity proved at depth.** Group7 and Group8 on the same seed,
  4 scenarios x 3 seeds, full serialised game state hashed every turn with only
  the version stamps normalised: 12/12 byte-identical over 36 turns per
  campaign, 0 divergent, 0 errors.
- **No fixture was regenerated.** `behavior-golden`, `group_foundation_compat`,
  `institution_legacy_compat`, `agency_legacy_compat`, `department_group5_compat`
  and `facility_lifecycle_legacy_compat` all pass against their existing bytes,
  which is the evidence that version isolation held.

- Final September9 verification:185/185 full Windows checks; separate16-case
  release suite;8 matched480-month campaigns,3,840 months and328 exact replays.
  Published V3 comparison failures are preserved, not extrapolated.
- Verify actual packaged46.6MB cycle481 import, Workforce and Forecast layouts;
  retain separate terminal/rematch and two-browser LAN evidence. Complete the
  before/after report, manual addendum and physical two-computer checklist.
- Local ZIP `BranchWars-v3.1-export-a1c386f.zip` is the final65F candidate.
  No GitHub publication. Remaining human acceptance and balance caveats are
  explicit in [release status](release-status.md). Historical pending-test notes
  below describe development checkpoints, not unfinished current test runs.

- Correct actual-browser terminal-result wording for accounting pilots: a win
  through receivership does not grant the failed bank's assets or franchise.
  Explain funding-covenant resolution separately. Preserve legacy non-pilot copy,
  final cards and rematch behavior. This is display-only; engine bytes and balance
  values are unchanged. Add before/after display regression and real terminal
  import/two-seat rematch evidence.

- Reproduce the real Balanced/Chairman month318 failure: paid teaching reduces
  execution after early project selection. Group7 now defers excess unstarted
  initiatives using final shared capacity, then recomputes funded quotas.
  Preserve existing paid work, training, resources and legacy behavior. Add
  actual half-ready fixture, protected-delivery, ordinary settlement and exact
  replay regression. Earlier seven480 passes do not certify this changed build.

- Validate deferred research/project plans before facility forecasting: freed
  funds may resume training, reserving teachers and invalidating old work quotas.
  Reject the infeasible alternative without changing the original legal plan.
- Add the genuine Growth month284 failure, paid-teaching explanation, pure
  rejection, legal settlement and exact replay regression. Preserve the older
  QA ZIP; its incomplete full gate was cancelled, not reported as a pass.

- Reject mutually conflicting renovation/conversion counterfactuals before
  operating forecasts. Preserve selected work and use shared lifecycle rules.
- Group7 AI no longer proposes new local branch projects over existing paid
  renovations; prior campaign planning remains behind its compatibility boundary.
- Pin the genuine month92 failed campaign and verify normal AI settlement and
  exact replay. Preserve the separate V3 month227 failure as baseline evidence.
- Improve the protected-budget warning's contrast after actual browser review;
  record strategy identity and correct simultaneous credit allocations in the
  long-campaign characterization harness. No balance prices or resources changed.

- Preserve Group1–6 campaigns; new optional Financial Group campaigns use
  Group7/save9.6, with explicit peer compatibility and no automatic save upgrade.
- Add funded outside-provider cash circulation through paired accounting books.
  Provider payments can support future company demand; firms still can fail.
- Prototype paid administrative outsourcing and affordable AI recruitment before
  discretionary research/project spending. Long-campaign viability is not yet
  accepted; early candidates still show weak staffing and ATM-only networks.
- Explain workload-driven morale in Workforce using the shared engine formula;
  show aggregate funded circulation in the corporate panel.
- Preserve funded Group7 hires through the later pilot budget pass; under
  staffing distress, postpone unstarted projects and non-emergency actions before
  replacement hiring. Keep cash/payroll/capital safeguards and real costs.
- Add bounded one-person workload recovery proposals protecting current work,
  plus AI-only post-conversion staffing estimates from existing physical staff.
  These are candidate heuristics; long-run balance is not yet accepted.
- Add preserved-state recruitment regression, circulation conservation/failure,
  compatibility, owner UI purity and Group7 simulated transport tests.
- Avoid a redundant mature-bank copy on no-conversion forecast paths; paired
  mature-state AI/RNG/quote/settlement checks preserve exact behavior. Browser
  performance and the final-build full suite remain outstanding.
- Add provisional Group7 facility capital budgeting after actual department
  staffing: 60-month credit/runoff/loss and funded cash/equity scenarios, two
  shortlisted models, actual costs and capital accumulation without free offices.
  This defers only unstarted research/projects; legacy AI is unchanged.
- Reject facility-investment scenarios that would leave existing department
  vendor work unaffordable before forecasting construction or activation;
  regress the actual captured month58 crash and ordinary save/replay.
- Make the budget strip use the same protected cash reserve as readiness;
  identify the reserve/shortfall and existing policy controls without lowering
  player reserves or changing cash, capital, obligations or legacy rules.
- Make the historical accounting fixture portable across worktrees using a
  strict four-file relative-path allowlist; retain its exact historical code
  hunks. Update the new-setup assertion to Group7 while testing old Group5/6 saves.
- See [working evidence](v31-stability-report.md) and
  [draft manual addendum](v31-manual-addendum.md). No final ZIP or publication yet.

## V3 Regional Command snapshot — September 8, 2026

- Staffed, separately funded commercial insurance agency with actual costs,
  carrier-funded commissions, independent client covers and capped parent support.
- Physical facility networks, conversions, maintenance, condition, renovation,
  construction ramp and bounded nearby hub support.
- Persistent compensated leadership and eight department functions sharing real
  staff, paid vendor capacity, reserves and settlement obligations.
- Retained-earnings bridge, workload/budget desks and clearer customer capacity.
- Fixed captured month37/customer and month264/import regressions, productive
  staff assignment and Group6 facility completion.
- Hardened fresh peer staffing compatibility and lossless large save/checkpoint
  recovery; corrected the outer compression version for DAG-packed GitHub games.
- Preserved the actual 480-month stress campaign and fixed its raw-text autosave
  ceiling without removing history or relaxing corruption/reference-bomb checks.
- Preserved old campaign rules and V2 rollback packages. New Group campaigns use
  rules6/save9.5 through the existing unchecked Financial Group preview.
- Clean player ZIP, original 45-page retro manual, and comprehensive
  [V3 debug/balance report](v3-release-report.md). Publication separately approved.
- Broader loan/equity experiments are not playable; blueprint completion,
  two-computer acceptance and enjoyable late-game balance are not claimed.

## V2 stabilization RC1 — local technical gates passed

- Reinforced LAN authentication, JSON/timeouts, validation and ordered polling.
- Immutable LAN/GitHub retries and cycle-fenced modern recall requests.
- Lossless large-campaign browser-save/checkpoint compression; raw legacy records
  remain readable. Corrupt or mismatched storage envelopes are rejected before
  adoption. Exported campaign JSON and game rules remain unchanged.
- Reproduced a real browser quota failure on a 14.29 MB campaign; the repaired
  3.17 MB browser record survived reload with the complete state intact.
- Fixed premature generated-URL expansion in the portable Windows launcher;
  added native batch-parser coverage and safe missing-address/URL fallback.
- Adversarial regressions, native authentication tests and bounded six-strategy lab.
- Consolidated active architecture/roadmap/status; preserved history.
- Added a six-file player-only candidate beside the unchanged original V2 package;
  clean extraction and source-tree checks keep local-only files out of releases.
- No economics, campaign versions or optional defaults changed.
- 115 final Windows suites plus a separate guest-checkpoint regression passed;
  the additional guest check is included in subsequent full CI runs.
- 72 strategy campaigns / 11,498 months completed, including eight 480-month
  campaigns; no economic tuning. One legitimate capital-driven receivership.
- Real two-computer acceptance pending; release candidate, not stable certification.
- Hosted Linux run 21 reached its 15-minute job limit during passing regressions.
  Increased that allowance to 30 minutes; no test was removed or skipped.
- The hosted Windows sample took 14.4 minutes versus 5.6 locally for the same
  tests. Its full-job allowance is 90 minutes; existing per-test limits remain.

## V2 Connected Company Banking — September 7, 2026

Published at `d82eebc` in the preserved V2 release folder. Operating companies,
funded service fees/receivables/collections/losses, parent capital and simultaneous
lending. Financial Group rules 2 / save 9.1; historical campaigns unchanged.

## Earlier work

Pricing/programmes, modular registry/lobbies, onboarding/customer effects,
workforce, credit and regional systems remain. See the [archive](archive/README.md)
for dated decisions and [release status](release-status.md) for current evidence.
