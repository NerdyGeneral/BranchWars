# Current release status

Updated: 2026-09-06.

## Existing-customer offers — v8.12 tested preview

Release branch: `feat/relationship-offers`, stacked on regional-demand
[PR #17](https://github.com/NerdyGeneral/BranchWars/pull/17), whose hosted fast
and full Windows workflow has now passed. This opt-in
N-06/N-08 slice enables voluntary **product switching within existing owned
deposit books**, not multiple-product cross-selling or a completed onboarding
funnel. Old saves keep their rules; new campaigns require Regional demand and
its prerequisites, and both multiplayer seats must support v8.12.

- Products now has an **Existing customers** subview: select an independent
  market, customer segment, available product and 0%/25%/50% of non-retention
  Retail sales time. Quotes show eligible account equivalents, capacity, switched
  principal, one-time conversion expense and ongoing bank-cost change. Actuals
  remain visible after settlement and reload.
- Only better-fit, withdrawable, unpromised balances are eligible. Switching
  conserves deposits and household ownership; locked/promotional promises cannot
  be broken. New promotional terms start when a switch settles. Better product
  fit feeds the existing service-goodwill calculation; no free loyalty, revenue
  or fictional customer balances are created.
- Conversions cost $40 each and consume the selected sales time, reducing new
  acquisition capacity. The opening-plan cost is a hard spending ceiling; later
  maturity releases cannot silently increase the bill. Protected cash, other
  commitments, training and advertising are respected. The ordinary operating
  report charges the expense once.
- Product closure/retirement auto-pauses the offer. Shared rules cover preview,
  validation, monthly settlement, AI candidates, saves and all three transports.
  Private policy and exact offer reports are owner-only, including resolved-plan
  redaction and GitHub checkpoint recovery.

Candidate artifact SHA-256:
`9e633281a41efe67827e69894e959222caa736a391b5ca8bd0037e54783f6176`.
The portable build has 96 ordered inputs. Frozen legacy fixtures are unchanged.
Focused engine/UI tests, lifecycle tests and relationship-offer, regional-demand
and advertising transport/relay checks pass. The active-offer relay test covers
12 months, accepted-write response loss, reloads and 176 actual conversions.

[Browser acceptance](../reports/baselines/relationship-offers-browser-2026-09-06.json)
uses a paid Rewards launch, local deployment and a real saved Solo campaign.
Its offer quote and actual both show 15 conversions, $137,114 switched,
$600 one-time expense and $68 additional recurring direct cost. Policy and
report survive reload. The offer desk was visually inspected at desktop and
500px widths; the latter has 485px document/client widths, with no horizontal
overflow. No game console warnings/errors appeared in this path. A later
cross-tab audit found stale residual-sales previews in Advertising and Customers:
both now apply the staged offer policy. Regression tests and a repeat browser
check confirm 50% offers shows 0.38 available bankers in both tabs, versus 0.75
when paused; the same $15,000 advertisement shows 10.6% versus 21.3% targeting
bonus. The initial layout run predates that UI-only repair; the report separately
identifies the rebuilt artifact used for the cross-tab follow-up. This is not
whole-game UI acceptance; setup and Operations still need broader decluttering.

The [eight-campaign 120-month audit](../reports/baselines/release-balance-2026-09-06T08-08-09-128Z.json)
passes 960 months with all banks surviving, zero skipped/cancelled initiatives
and a 730,675-byte maximum owner view. **It records zero AI offer activations**:
the conservative staffing/economic planner leaves this new option off. Thus
this sample validates compatibility with the enabled rules, not meaningful
AI use or a balanced return on product switching. Household concentration still
reaches 82.15%; enduring competition, offer value and human two-PC acceptance
remain open work. Do not interpret passing technical gates as balanced gameplay.

The [four-scenario 480-month audit](../reports/baselines/release-balance-2026-09-06T08-17-20-048Z.json)
adds 1,920 resolved months, all banks surviving, no skipped/cancelled initiatives
and an 845,444-byte maximum owner view. AI offer use appears later: 203 active
bank-months, 1,212 conversion equivalents and $48,480 expense. That corrects any
interpretation that the tool is completely unused. **Late concentration remains
a release limitation:** Regulatory seed 20 peaks at 89.54% player-deposit share,
ends at 86.98%, and has a 72-month spell above 80%. Survival alone is not healthy
competition; this is not an accepted balance baseline.

A separate [controlled-policy stress comparison](../reports/baselines/relationship-offers-controlled-2026-09-06.json)
compares two 120-month campaigns from identical openings. A paid Rewards rollout
and 25% offer policy switches $4,361,239 / 383 equivalents for $15,320 across
42 active months. All 480 conversion-boundary conservation checks and 240 monthly
book, ledger and save checks pass. Both banks survive both arms; no emergency
borrowing or funding-sale loss occurs. Subsequent decisions/economic paths differ,
so ending balances are not causal ROI or evidence that this policy is optimal.

These extended simulations used pre-repair artifact `56bfb0c3…36ee45d`.
Its engine body and the current artifact's engine body are byte-identical:
SHA-256 `b1ddc1ef53f38ac8057ce105d6fbea3c17fc70f380c6f8ef6b4862a086af82f5`.
Only the two UI capacity previews changed afterward. The full Windows gate was
restarted on the rebuilt artifact; the interrupted earlier run is not a pass.

The completed [78-suite Windows regression](../reports/baselines/N-00-2026-09-06T08-20-43-301Z.json)
passes on the rebuilt artifact, including LAN. All 173 monitored fingerprints
remain unchanged during the run and the legacy balance output reproduces.
The subsequent [standard-rule release audit](../reports/baselines/release-balance-2026-09-06T08-39-43-940Z.json)
also passes: 16 campaigns / 1,920 months, all banks survive, zero skipped or
cancelled initiatives, 559,901-byte maximum owner view. `node tools/check.js --full`
finishes with exit code zero. Together with the separate new-rule and controlled
samples above, this is technical regression evidence, not national-game or
human balance acceptance. Publication verifies staged source/build identity and
documentation link targets against the Git index; local saves and unrelated
user proposals are excluded.

Next design work should expose when better fit actually changes the modeled
service/retention outcome, and address early staffing constraints and late-game
concentration. Do not force AI adoption with an inflated utility reward or label
switching as profitable cross-selling. Group/subsidiary accounting and authored
national progression remain later blueprint work.

## Regional demand — v8.11 verified batch

Release branch: `feat/regional-demand`, following product/recovery
[PR #16](https://github.com/NerdyGeneral/BranchWars/pull/16). PR #16 was pushed as
`4bea538`, followed by documentation-only `344bc53`: clean-checkout GitHub CI
found a link to an intentionally unpublished diagnostic helper. The link is now
an explicit local-only note; both the clean-checkout fast gate and GitHub's
rerun fast job pass. Its hosted Windows rerun has also passed. No game
bytes changed in that repair; publication does not merge the dependency stack.

This is an N-04 external-demand slice, **not completion of the regional or
national blueprint**:

- Opt-in monthly household/savings arrivals and departures through outside
  community banks and credit unions. Opening outside books anchor the fictional
  rates, so exhausted pools can replenish; downturns can contract available
  outside demand. Departures are capped to actual outside holdings.
- Settlement occurs after all bank activity and before ending/regime transition.
  Arrivals become available next month. Bank accounts, locked term promises,
  equity and current acquisition quotas are untouched.
- Versioned conservation anchors, integer remainders, strict import validation,
  atomic candidate settlement and duplicate-cycle protection. Public reports
  and owner ledger summaries omit private conservation records.
- A read-only Markets panel distinguishes current supply, previous actuals and
  conditional next-closing flows. Region/market detail is collapsed by default.
  Browser QA caught and fixed a narrow-screen grid overflow: at a 500px viewport,
  the document stays within 485px and the 880px table scrolls inside 393px.
- Setup prerequisites, lobby settings, rematches, Direct/LAN/GitHub capabilities
  and checkpoint recovery preserve the flag. Old saves keep their previous rules;
  old peers cannot join a v8.11 game.

Verified artifact SHA-256:
`706a5853883bb6039f7b34cbfa39449ebe7a7f257916d489aca61a1fa8a3d670`.
The manifest has 94 ordered inputs; no frozen legacy fixture was regenerated.
Focused engine/UI, transport and legacy lifecycle tests pass. The lifecycle
gate caught and prevented a changed error order for invalid old creation input.

Completed evidence on this artifact:

- [Full Windows regression](../reports/baselines/N-00-2026-09-06T07-15-25-913Z.json):
  all 74 suites pass, including LAN; all 169 monitored fingerprints remain
  unchanged and the old balance output reproduces.
- [Default-rule release audit](../reports/baselines/release-balance-2026-09-06T07-35-07-502Z.json):
  16 campaigns / 1,920 months, all survive, no skipped/cancelled initiatives,
  559,901-byte maximum owner view. `node tools/check.js --full` finishes with
  exit code zero.

- [Browser acceptance](../reports/baselines/regional-demand-browser-2026-09-06.json):
  setup, desktop/narrow Markets report, visible month settlement and reload.
- [Eight campaigns x 120 months](../reports/baselines/release-balance-2026-09-06T07-20-54-516Z.json):
  960 months, all survive, no skipped/cancelled initiatives, maximum owner view
  718,773 bytes.
- [Balanced seed 20 x 480 months](../reports/baselines/release-balance-2026-09-06T07-18-58-175Z.json):
  both survive, no skipped/cancelled initiatives, 811,536-byte maximum view.
  Twelve deposit-leader changes; 31 mandate changes after month 60. Closing
  outside supply remains 365 households and $711,060; replenishment is working,
  not a guarantee that outside institutions retain substantial market share.
- [Previously vulnerable Growth seed 2 x 120](../reports/baselines/release-balance-2026-09-06T07-23-05-331Z.json):
  both survive, no skipped/cancelled initiatives; closing capital ratios
  13.25%/12.43%, and deposit shares 42.85%/57.15%.
- [All four seed-20 scenarios x 480](../reports/baselines/release-balance-2026-09-06T07-36-25-301Z.json):
  1,920 months, all survive, no skipped/cancelled initiatives, 828,145-byte
  maximum owner view. Closing deposit leaders range from 53.38% to 72.72%;
  the highest sampled deposit share is 76.06%. Every scenario retains outside
  supply at its final closing. The earlier Balanced probe is repeated here and
  is not counted twice.

Together the new-rule samples cover 13 distinct campaign configurations and
3,000 resolved months, plus 1,920 default-rule regression months. These are
bounded AI samples, not human balance certification. The prior 70-suite
publication pass below is historical, not the current artifact's gate.
Sampled 120-month household leaders still reach 82.15%, despite no 80% deposit
dominance spell. Households and deposit balances remain separate aggregates;
substantial late-game cash accumulation, richer product/customer linkage and
competitive use of capital still need design work. No forced equalization,
cross-selling, firm-income simulation, subsidiaries or national content was added.
Real two-computer GitHub play and human balance acceptance remain outstanding.

Publication checks additionally compare all 94 staged source inputs and the
portable artifact with the assembled build, and resolve documentation targets
against the Git index rather than local disk. Selected test reports are included;
raw diagnostic helpers and the user's separate architecture proposal remain
unpublished.

## Product programmes, advertising and recovery — verified release batch

Release branch: `feat/product-lifecycle`, stacked on `feat/segment-deposits`
(PR #15). This consolidates the product/advertising batches below with the recovery
follow-up. Publication is a branch/PR update, not an automatic merge of its
prerequisites. No remote CI or physical two-computer acceptance is asserted here.

Publication recheck on 2026-09-06: a fresh
[70-suite Windows run](../reports/baselines/N-00-2026-09-06T06-35-05-753Z.json)
passes with unchanged source and reproduced balance output, followed by a
[1,920-month default-rule audit](../reports/baselines/release-balance-2026-09-06T06-54-12-172Z.json)
with zero skipped/cancelled initiatives. `node tools/check.js --full` finishes
successfully. All 164 source/test fingerprints still match the previous full
sweep; all 91 staged source inputs match after line-ending normalization and
the staged portable artifact has the exact SHA-256 below. The repeated default
sample is not counted again as independent balance evidence. Stale README/save
label and architecture input-count wording were corrected; game rules did not
change during publication checks. Selected inspected reports are included;
user proposals, raw snapshots, local saves and diagnostic helpers are excluded.

- Added **Overview → Compare recovery options** for product-programme campaigns.
  Estimates include known executive costs, distinguish cash from equity and
  compare paused commitments, supported lower-cost responses and limited spare
  staff reallocation. Stage/Undo affect only the unlocked draft. No free equity,
  forgiven debt, changed failure threshold or forced equalization is added.
- v8.9/v8.10 AI now reviews capital recovery after its domain planners. The prior
  Growth seed-2 failure had abundant cash but exhausted equity; repeated optional
  executive bills outstripped thin recurring earnings. The planner protects
  existing household/service capacity and avoids known dangerous cheap responses.
  Audit, succession, manager and fintech checks include conservative same-turn
  workload buffers. Future rival shocks remain uncertain.
- Corrected service-plan equity estimates that counted advertising/training
  again after they were included in operating profit. No expense is refunded.
- Added a simulated GitHub test in which both seats reload a sealed pending turn,
  followed by another host reload after an accepted state-write response is lost.
  Checks preserve commitment, exact resolution, identities and private reports.
  The [player guide](player-guide.md#two-computer-acceptance-checklist) now gives
  the actual two-PC checklist and clear stop/recovery criteria.
- Balance reports now distinguish deposit dominance from bank health: both
  capital ratios, cash/debt, exact household shares, below-10% spells and returns,
  loss months, lead changes and duration of 80% player-deposit dominance. All
  player shares exclude outside institutions and are not victory criteria.

### Current candidate verification

Artifact SHA-256:
`a2cf1aab9ddd13b48de0d4ddfd0f328da5bb294f77e21ad18cc42ec4f85174c9`.
The fresh [full Windows sweep](../reports/baselines/N-00-2026-09-06T06-03-50-077Z.json)
passes all 70 suites, including Windows LAN, saved-game/legacy compatibility,
accounting and resource reconciliation, recovery engine/UI, lobby identities
and simulated GitHub relay/checkpoint recovery. The report confirms unchanged
source and reproduced legacy balance output. `node tools/check.js --full`
finishes successfully, including build/reference checks and the default release
campaign audit. The previous batch's 67-suite/7,640-turn result below is historical.

Completed same-artifact extended audits:

| Rules and sample | Resolved months | Result | Largest owner view |
|---|---:|---|---:|
| [Default release rules, 16 campaigns x 120](../reports/baselines/release-balance-2026-09-06T06-23-17-604Z.json) | 1,920 | All survive; zero skipped/cancelled initiatives | 559,901 bytes |
| [Advertising, 16 campaigns x 120](../reports/baselines/release-balance-2026-09-06T06-14-55-271Z.json) | 1,920 | All survive; zero skipped/cancelled initiatives | 717,153 bytes |
| [Advertising, four seed-20 campaigns x 480](../reports/baselines/release-balance-2026-09-06T06-16-42-118Z.json) | 1,920 | All survive; zero skipped/cancelled initiatives | 815,843 bytes |
| [Product programmes, four seed-20 campaigns x 480](../reports/baselines/release-balance-2026-09-06T06-16-10-761Z.json) | 1,920 | All survive; zero skipped/cancelled initiatives | 827,206 bytes |

Together these are 40 campaign runs and 7,680 resolved months, separate from
suite-level simulations and the old-save continuation probes below. Every run
checks accounting/cohort/local-book reconciliation, the ledger and owner-view
size limits against this exact artifact. No sampled campaign ends in receivership;
this is a bounded AI sample, not proof that all player strategies are viable.

The original Advertising Growth seed-2 case now completes 120 months with
$2.17M/$3.07M equity and 12.24%/12.46% capital ratios. Deposits finish 49.13%/
50.87%, with ten deposit-leader changes. Across the 16 advertising campaigns,
there are 1,089 competitive actions, 1,256 initiatives and 68 provider changes
after month 60. No sampled seat reaches 80% player-deposit share in that
120-month sample. This does not imply the longer-game concentration is fixed.

**Pacing remains unresolved.** Advertising Balanced seed 20 peaks at 92.91%
player deposits and stays at or above 80% for 178 consecutive months, before
the former leader ends at 35.34% versus 64.66%. Household ownership ends
50.91%/49.09%, capital ratios 12.45%/10.99%, with 21 deposit-leader changes and
39 late provider changes. Product-programme rules without advertising also
produce an 89.93% peak and an 85-month dominance spell. These are individual
normal-AI trajectories, not a controlled advertising-strength experiment.

Deposit dominance is not enterprise dominance: the Advertising Growth seed-20
deposit leader finishes at 74.27% but loses $31K that month while its rival earns
$446K and holds a 32.09% capital ratio. Recovery and contract turnover remain
possible; the current evidence does not establish engaging human counterplay
or acceptable time-to-recovery. More seeds and human recovery sessions must
measure local customer/service control and profitability alongside deposits
before changing dominance caps or adding catch-up bonuses.

In the advertising balanced extension the two players eventually hold all 31,100
households and $167,999,670 of the initial $168M deposit pool. Late competition
is mostly redistribution within the six-market pilot. The next pacing pass
should trace dominance onset/peak/reversal by funding flow, cost, local service
coverage and available player counters, then test human recovery time. Renewing
demand and national expansion remain separate blueprint-scale work.

Dedicated recovery engine/UI, AI cash planning, architecture, portable build,
service planning and the new GitHub checkpoint test pass. The latter resolves
three months across three reloads, 17 accepted simulated writes and one lost
accepted-write response. It is not a live repository or physical two-PC test.

Read-only normal-AI continuation probes imported three deep snapshots from the
original failing campaign and resolved 36 months each (108 total) on this hash.
Migration, accounting, ledger and pilot validation pass at import and after
each month. Both previously used board rescues stay consumed, with no additional
board aid or emergency borrowing. These are ad-hoc probes, not a separately
published baseline or isolated causal experiment.

| Starting snapshot | Starting equity / capital ratio | After 36 months |
|---|---|---|
| Month 65 | $688,667 / 8.20% | $596,921 / 7.72%; survives but remains weak |
| Month 75 | $449,251 / 5.71% | $991,405 / 13.39% |
| Month 78 | $152,673 / 2.04% | $994,002 / 13.04% |

The month-78 continuation briefly dips to 1.92% before recovering. Its deposits
contract from about $81.89M to $58.22M. Recovery is possible with ordinary game
tradeoffs, not guaranteed and not evidence that human comeback pacing is accepted.

Browser QA on the final build verifies Overview placement, comparison, draft-only
staging and Undo ($15K advertising commitment to $0 and back), and unchanged bank
balances. At a 500px viewport the body is 485px wide, the card 361px wide with no
internal overflow, and buttons are 40.7px high. No page warnings/errors were
captured. The temporary QA tab/server were closed and viewport override reset.

## Advertising attribution and final cash planning — prior local batch

Implemented locally on `feat/product-lifecycle`; not committed or pushed. This
continues the uncommitted product-programme batch below. No remote merge or CI
status is asserted. Enable **Advertising attribution preview** in a new v8.10
campaign; the setup selects prerequisites. Both peers must update. Existing
campaigns retain their rule versions; v8.9 AI receives the cash-planning repair.

- Products now has an **Advertising & attribution** view. Choose one recurring
  market/audience/offer campaign at $0 / $15K / $40K / $80K per month. Awareness
  decays, repeated reach saturates, and offer suitability plus spare Retail sales
  time govern the bounded targeting effect. Closing an offer pauses its campaign.
- Advertising redirects ordinary intake inside existing quotas. It creates no
  customer money or relationships. Costs enter operating profit/accounts once,
  share the plan budget, and are protected from double-spending by training.
  Advertising remains central expense rather than inflating facility costs.
  Owner-only reports distinguish observed intake from model-attributed assisted
  intake; they do not claim incremental lift, ROI or matched individual accounts.
- The AI's final spending check includes the known executive-call expense, then
  protects cash/capital and forecast-loss cushions after all planners. It trims
  unfunded commitments before submission; unpredictable execution cancellations
  remain safe and explicit. Older pre-product AI plans remain unchanged.
- Extended testing reproduced an invalid AI service bid at balanced seed 20,
  month 286. Adding Business generalists diluted a specialist delivery bonus
  after an earlier bid reservation. The final planner now rechecks shared
  service eligibility and reserves existing delivery capacity or withdraws the
  unfundable bid; the engine's capacity rule is unchanged.
- Fixed incremental Products decommit: reducing an overcommitted plan no longer
  fails merely because other commitments still need removing. Additions and
  product targets remain validated; Ready stays blocked until the full plan works.
- New save/version negotiation covers all transports and rematches. Integration
  testing caught and repaired a missing v8.10 relationship-save format entry and
  a retirement-preview interaction with an existing advertising instruction.
- Source build: 89 ordered inputs, no new runtime replacement layer, no external
  dependency. Frozen reference engines and golden fixtures were not regenerated.

### Current candidate validation

Candidate artifact SHA-256:
`b92656daa756b740a7ef66f04a48323c3c24553ae816397222fc6d12cdd39d3c`.

The fresh [full Windows sweep](../reports/baselines/N-00-2026-09-06T05-23-43-640Z.json)
passed all 67 suites, including Windows LAN, simulated GitHub relay recovery,
save/identity/privacy, accounting, deterministic legacy compatibility, new
advertising rules and final AI cash planning. The report confirms unchanged
source and reproduced legacy balance output. Build and generated-reference
checks also passed. The first combined run was interrupted after the extended
audit exposed the month-286 bid failure above; that run is not a pass. After
repair, source and tests were frozen and all checks restarted on this artifact.

Completed unchanged-artifact audits:

- [Default release rules, 120 months](../reports/baselines/release-balance-2026-09-06T05-44-22-702Z.json):
  16 campaigns / 1,920 turns, all reaching month 120. Zero skipped or cancelled
  initiatives; maximum owner view 559,901 bytes. Together with the three audits
  below, this is 7,640 resolved campaign turns, separate from the suite-level
  stress and regression runs.
- [Advertising, 120-month sample](../reports/baselines/release-balance-2026-09-06T05-33-13-935Z.json):
  16 campaigns / 1,880 resolved turns. Fifteen reach 120; Growth seed 2 ends in
  receivership at month 80. No skipped or cancelled initiatives; maximum owner
  view 718,816 bytes. There are 985 competitive actions, 166 provider changes
  (51 after month 60), and 41 paid advertising months / $615,000 spend.
- [Advertising, 480-month extension](../reports/baselines/release-balance-2026-09-06T05-35-49-302Z.json):
  four seed-20 campaigns / 1,920 turns, all completing 480 months. Zero skipped
  or cancelled initiatives. Maximum owner view 846,322 bytes, below 1 MiB.
  Competition remains active: 1,780 actions and 168 provider changes, including
  140 after month 60. AI buys 181 campaign-months ($2,715,000); one request pauses
  for reserves. Assisted intake totals $2,458,425 and 1,844 model-attributed
  relationships. Those amounts are not incremental profit or an ROI measure.
- [Existing product-programme rules, 480 months](../reports/baselines/release-balance-2026-09-06T05-35-04-855Z.json):
  four seed-20 campaigns / 1,920 turns, all reaching month 480. Zero skipped or
  cancelled initiatives versus 42 explicit cash cancellations in the prior
  extension. Maximum view 845,616 bytes; 1,915 competitive actions and 114
  late provider changes. This intentionally changes v8.9 AI decisions while
  retaining its game rules; it is not a claim of unchanged v8.9 outcomes.

These audits check account/cohort/local-book reconciliation, conserved resources,
validated resolved saves, causal ledgers and both seat projections. They do not
establish human balance. The final Advertising Growth seed-20 leader holds 81.4%
of combined player deposits; the corresponding v8.9 case reaches 82.3%. The
month-80 receivership and continued concentration require recovery/pacing
playtests. Early 96-turn AI tests find no paid campaigns because service staff
are occupied; a staffed fixture and the long runs establish actual reachability.

Browser QA exercised a real paid $15K turn, operating-forecast cost, actual
attribution, paused draft and saved-game Continue. The final artifact preserves
that report on reload, with no captured page warnings/errors. Tablet navigation
stays non-sticky. At 500px, controls are 395px wide / 39px high and the body is
485px wide; the page does not overflow. The temporary tab/server were closed and
viewport settings reset. No live GitHub room or physical two-PC game was used.

### Remaining scope

This is an attribution-first N-08 slice, not the complete marketing funnel.
Delayed application queues, named channels, creative testing, cross-selling,
customer lifetime value and configurable product families remain ahead. Existing
commercial advertising and market-wide reputation initiatives are separate.
Group accounting, subsidiaries, company shares, national management and human
competition/recovery acceptance remain substantial later packages. No physical
two-computer or live repository-room test is claimed for this batch.


## Product programmes — N-04/N-06/N-07 preview

Local implementation on `feat/product-lifecycle`, based on segment-deposit
commit `8999aa0` ([PR #15](https://github.com/NerdyGeneral/BranchWars/pull/15)).
This batch has not been committed or pushed. No current remote merge/CI status
is asserted. Enable **Product programmes preview** for a new v8.9 campaign;
setup enables prerequisites. Existing saves keep their rules. Update both peers.

- Rewards Checking and High-Yield Savings can be built in-house after tier-one
  research, or licensed sooner for less initial capital and recurring vendor
  charges. Both consume shared project capacity; completion creates no deposits.
  A licensed product can later be converted in-house without repricing accounts.
- Local sales instructions cover all six markets and three customer segments.
  Actual intake uses local fit; aggregate acquisition effects are weighted by
  reachable outside supply. There is no tiny-market bank-wide bonus.
- Paid retirement closes sales, not obligations: existing accounts, savings
  guarantees and locked funding remain serviced. Availability charges end;
  licensed balance charges continue until balances leave or convert in-house.
  One-time retirement spend shares the normal plan's cash/capital budget.
- Products separates Development & retirement from Local sales targets, with
  current-book costs and explicit eligibility reasons. Operations retains
  business/credit/term policy and the full operating forecast. The taller
  v8.9 navigation stops sticking at tablet widths; financial tables scroll
  inside their panels on narrow screens.
- AI compares target policies, can license or build, and can retire a losing
  unused platform. Its growth mandate can accept lower forecast earnings while
  retaining at least half the current-policy profit, a $500,000 opening cash
  buffer and no added funding loss; intake must improve by $5,000 and 5%.
  New rollouts preserve extra planning headroom. This does not replace the broader AI cash-reserve/retry work.
- New rules use explicit creation/validation/monthly/project stages, private
  owner projections, sealed saves, rematches and all three transports.
  Build inventory is 87 ordered inputs; no new runtime replacement layer.

### Product candidate verification

The [full Windows sweep](../reports/baselines/N-00-2026-09-06T04-16-13-146Z.json)
passed 61 of 62 suites, including Windows LAN, with unchanged fingerprints and
reproduced seeded output. The remaining engine suite first stopped at an old
project-count assertion. Its rerun also caught an old workspace-count assertion
and a genuine v6-save import bug: the new feature-presence probe read a missing
project list before legacy repair supplied it. The two inventories now include
the new projects/workspace explicitly, and the presence guard checks for an array.
The [targeted follow-up](../reports/baselines/N-00-product-followup-2026-09-06T04-45-16-030Z.json)
passes all 14 checks, including the engine suite, creation/import comparisons,
fixed campaigns, preserved saves, product rules, both network harnesses,
build/reference and architecture checks. It verifies all 154 original
fingerprints and exact reverse patches: only the guard, its generated HTML,
and the two inventory assertions differ. Source stayed unchanged during reruns.
All 62 suites are covered across the full run and targeted follow-up; this is
**not** a fresh all-green `check.js --full` invocation. The original failed
report is preserved. The fingerprint proof and reruns used the local diagnostic
runner `product-programmes-followup.cjs`, which is not included in this published
checkout.

Current artifact SHA-256:
`011b21486a3fb5e2c725eda947734742e842803303fd5338ef24805fdab8bbdb`.

Earlier diagnostics are not counted as final-candidate acceptance. An earlier 1,920-turn
run passed accounting and transport-size checks but revealed zero AI product
targeting despite paid launches. That was not balance acceptance. The forecast's
one-month preference was replaced with a bounded, explicit growth mandate, and
the dedicated suite now requires actual targeting (1,272 targeted audience-turns
in its 96-turn sample). The interrupted full/480-month diagnostics are not passes.
The completed product audits below used the pre-import-guard artifact:
`813fc740c9535210c774c4a501bcbc0914662767528b18c953a2e724f0ece325`.

- [120-month audit](../reports/baselines/release-balance-2026-09-06T04-25-15-307Z.json):
  16 campaigns / 1,920 turns, all reaching month 120; no cancellations or silent
  skips. Both seats stay below 1 MiB (maximum 707,276 bytes). There are 23 in-house
  and 56 licensed rollout starts, 35 planned retirements, and 23,784 targeted
  audience-turns. Competition continues through 448 actions and 183 service
  provider changes, including 58 after month 60.
- [480-month extension](../reports/baselines/release-balance-2026-09-06T04-25-29-692Z.json):
  four campaigns / 1,656 turns. Balanced and Rate seed 20 reach month 480;
  Regulatory ends in receivership at 406 and Growth at 290. Both seats stay below
  1 MiB (maximum 802,897 bytes). Zero silent skips; 42 explicit uncharged
  cancellations after cash changes. The run records 472 competitive actions,
  116 provider changes (92 after month 60), 10 in-house and 14 licensed planned
  launches, six planned retirements and 25,512 targeted audience-turns.

Both audits fingerprint their unchanged artifact. Since those runs, the only
runtime change is the legacy-save presence guard above; normal project-array
states follow the same path. The targeted follow-up proves the exact source
change and reruns affected validation/gameplay checks. These audits validate
mechanical integrity and feature reachability, not equal route strength or enjoyable
endgame pacing. In the extreme Regulatory/Growth endings, one bank holds over
98% of combined player deposits. Cash-reserve/retry behavior and comeback
acceptance remain unfinished.

Dedicated checks pass for paid delivery, capacity stalls, research/route
conflicts, local intake, vendor-cost reconciliation, guaranteed-term retirement,
preview purity, sealed imports, corrupt-save rejection, owner privacy and UI
draft staging. LAN/Direct simulated plans execute launch, targeting and
retirement for both seats. The GitHub relay simulation passes 12 sealed turns,
66 accepted writes and nine lost responses, with exact owner-state comparisons.
No live repository room was written.

The [final default-rules audit](../reports/baselines/release-balance-2026-09-06T04-42-45-906Z.json)
passed 16 campaigns / 1,920 turns on the current artifact, with zero cancellations
or skips and a maximum view of 559,901 bytes. Every result/activity field exactly
matches the preceding release's default audit; only the artifact hash differs.

The auxiliary previous-version comparison against `8999aa0` passed 160 turns
with Product programmes OFF on the pre-import-guard gameplay artifact (complete
creation states, AI plans and resolved states). Frozen fixtures and reference
engines were not regenerated.

Computer-use browser QA verified new campaign setup, paid launch through a
normal turn, Products subviews, local fit/target changes, unaffected other-market
instructions, retirement quotes and saved-game Continue. The tablet navigation
overlap was repaired; at 500px the 650px target table stays inside its 395px
scroll panel without widening the page. No captured page warnings/errors.
Temporary viewport, tab and local server were reset/closed. The final AI-only
repair and corrected research-destination hint are additionally covered by
source/build and automated checks; the browser walk-through preceded them.

### Product scope limits and next step

This is a lifecycle and delivery choice for two existing retail offers, not a
complete product designer, commercial/retail split or per-customer cross-sell
system. Quotes are current-book run rates, not complete segment profitability.
Research still needs a broader capability web. Existing Operations navigation
still needs a larger decluttering pass. No live GitHub room or physical two-PC
game has been exercised for this batch.

Next: connect advertising spend to a visible, finite audience funnel and
attribution, then broaden product designs. Holding companies, insurance agency,
brokerage/wealth, shares and national management remain substantial later work.
N-04/N-06/N-07 have progressed; none is declared complete by this slice.

## Segment-owned deposit accounts — N-04/N-06 preview

This batch is on `feat/segment-deposits`, based on the pending credit
[PR #14](https://github.com/NerdyGeneral/BranchWars/pull/14). It is not merged
into `main`. Enable **Segment deposits preview** for a new v8.8 campaign;
the setup enables all prerequisite previews. Both computers must update.
Existing saves retain their rules.

- Deposit cohorts retain Everyday, Connected or Reserve ownership. Opening
  relative balances are fictional 1 / 1.5 / 4 weights per relationship.
  Finite outside intake, withdrawals, rival transfers and book acquisitions
  conserve each segment's money, not just the bank-wide total.
- Service neglect withdraws the departing segment's unlocked average balance.
  Its locked share stays until contractual maturity, then pays out before any
  renewal. Pending exits cannot be counted twice; an acquisition carries them.
  Payouts change cash and deposit liabilities, not profit. Funding-sale losses
  remain separate expenses.
- Existing product terms and segment-specific product fit survive sales-mix
  changes. Monthly interest, primary-account fees and service/platform costs
  reconcile across products and segments. Zero-balance platforms still cost
  money; segment rows do not pretend to be full allocated bank profit.
- Customers has **Service & retention** and **Deposit accounts** views.
  Inspect local balances, locked funding, exact monthly costs, product ownership
  and pending maturity exits without changing plan targets.
- New rules have explicit creation/import validation, rematch propagation,
  owner-private books and capability checks on all three transports. The owner
  snapshot omits total segment deposit pools to avoid revealing the rival's
  detailed balances by subtraction. Compact causal history records ownership.
- One new engine module: 84 ordered build inputs, no added runtime replacements.

### Candidate verification

The [full Windows run](../reports/baselines/N-00-2026-09-06T02-36-28-570Z.json)
passed 57 of 59 suites, with unchanged source fingerprints and reproduced
seeded balance output. Its only failures were two test expectations still
naming v8.7 in the unsupported-save error. Both were corrected to v8.8 and
[passed on rerun](../reports/baselines/N-00-followup-2026-09-06T02-57-26-620Z.json).
The follow-up verifies every original fingerprint: only those two test files
changed, and restoring their version text reproduces their original hashes.
All 59 suites are covered across the run and its two reruns, including Windows
LAN and nine GitHub relay configurations. This is **not** a new clean
`check.js --full` invocation; its original failed result is preserved.
No runtime repair or golden-fixture regeneration was needed for these failures.

The separately completed [default-rules audit](../reports/baselines/release-balance-2026-09-06T02-56-57-574Z.json)
passed 16 campaigns / 1,920 turns, with zero cancellations/skips and a maximum
view of 559,901 bytes. Results exactly match the preceding default audit except
the artifact hash. Automated checks do not establish human balance acceptance.

Candidate SHA-256:
`adfe98aadf3823dfb80336608522fc25c1188b5dadf9a496c5bb5b6b0dda1e15`.

- [120-month audit](../reports/baselines/release-balance-2026-09-06T02-44-14-356Z.json):
  16 campaigns / 1,909 turns. Fifteen reach month 120; Balanced seed 0 ends
  in receivership at month 109. Both seats checked; maximum view 694,180 bytes.
  Zero silent initiative skips; two explicit, uncharged cancellations.
  533 competitive actions, 185 provider changes, 48 after month 60.
- [480-month extension](../reports/baselines/release-balance-2026-09-06T02-44-38-580Z.json):
  four additional campaigns / 1,494 turns. Rate and Regulatory seed 20 reach
  month 480; Balanced ends at 293 and Growth at 241, both in receivership.
  Both seats stay below 1 MiB; maximum view 794,099 bytes. Zero silent skips;
  35 explicit uncharged cancellations. 406 competitive actions and 105 provider
  changes, 82 after month 60. The stressed Growth run reaches 7.40% delinquency;
  across the extended sample the AI chooses workout 13, balanced 2,890 and
  recovery 85 times. This demonstrates reachability, not equal policy strength.
- An auxiliary comparison against credit commit `5bf6265` matches AI plans
  and complete campaign states exactly across 160 turns with the new rules OFF.
  Preserved fixtures and frozen reference engines were not regenerated.

The preliminary long diagnostic was stopped before completion to finish the
UI/causal-history changes; it is not counted as passing. Both linked audits
above ran against the final candidate and verified its unchanged source hash.

Browser QA on the isolated local candidate verified creation, reload/Continue,
service/account switching, market inspection and a monthly term-funding plan.
Desktop and 950px layouts fit; 500px financial tables scroll inside their panel
without widening the page. No captured warnings/errors. Temporary viewport,
tab and server were reset/closed. No real room or save was modified.

### Limits and next step

This is segment-owned pooled funding, not individual households or separate
commercial/retail balance sheets. Customer counts and financial balances can
still move independently; per-customer cross-selling and complete profitability
attribution remain future work. Broader operating navigation still needs a
decluttering pass, especially the tall sticky navigation at tablet widths.
The 37 uncharged AI cancellations across the two audits remain a cash-reserve/
retry limitation. Several long campaigns concentrate deposits heavily; ongoing
activity alone does not establish enjoyable recovery or endgame pacing.

Next: product development/retirement and segment-targeted deployment, then
advertising attribution. Group subsidiaries, company shares, national content
and physical two-computer/multi-session acceptance remain ahead. N-04/N-06
are deeper, not complete.

## Delayed delinquency and collections — N-06 credit preview

This batch is on `feat/credit-collections`, stacked on the pending household
[PR #13](https://github.com/NerdyGeneral/BranchWars/pull/13), not merged into
`main`. Enable **Credit performance preview** before opening a new campaign.
It creates v8.7 rules and enables the required household/workforce previews.
Both linked clients must update; existing saves keep their original rules.

- New loan cohorts retain product, yield and underwriting risk. Operations
  expertise improves new origination risk, not previously written loans.
  Two seasoning reviews precede eligibility for new arrears. Opening loans
  are already seasoned. Uncured principal ages through 30/60/90+ day groups;
  a newly arrived 90+ balance cannot resolve in that same review.
- Delinquent principal stops interest and scheduled payments. Cures resume
  normal amortization without invented back-interest. Maturity never deletes
  unpaid principal. Acquisitions preserve aging; funding sales remove it
  proportionally alongside the loan asset. Funding and regulatory sales add
  portfolio-weighted aging discounts, closing the near-par default-sale loophole.
- A recurring mandate allocates Lending time to collections versus new loans.
  Credit specialists strengthen that finite team. Workouts cure more early
  arrears and preserve more value; accelerated recovery resolves old defaults
  faster with larger losses. Understaffing impairs both. External case costs
  remain real expenses even for automatic recovery with no staff assigned.
- Recovered principal increases cash, not profit. The written-off part reduces
  loans and equity once. Case handling is posted once outside event profit
  multipliers. Market reports assign those losses to their actual loan market.
- A separate Credit workspace shows quality by product/market, retained risk,
  staff coverage, policy parameters, opening-book forecasts and realized totals.
  Inspecting a market does not retarget the plan. The mandate and detailed
  loan book are owner-only. Nine optional/core tabs now wrap into readable rows.
- Three modules bring the ordered build to 83 inputs. Explicit coordinator
  calls preserve the architecture ceiling; no new runtime replacements.

### Validation evidence

Candidate SHA-256 (canonical LF output):
`491873af3e31748455463557b8d0e35d8ed9243303e0c373d747fb84cbe9cd4f`.

[Final Windows regression](../reports/baselines/N-00-2026-09-06T01-41-01-994Z.json):
**56/56 invocations passed**, including Windows LAN and eight simulated GitHub
relay configurations. Source/test fingerprints are unchanged and all match
the final candidate; repeated seeded balance output reproduces exactly.
`node tools/check.js --full` completed successfully, including its final
[compatibility campaign audit](../reports/baselines/release-balance-2026-09-06T01-59-05-889Z.json):
16 campaigns / 1,920 turns, no skipped/cancelled initiatives. Every report field
except the source SHA matches the prior default-rules audit. Build/reference
freshness, documentation links and architecture guards also pass. Hosted checks
for the predecessor PR #13 have succeeded; this new PR's hosted result is separate.
Targeted credit tests cover seasoning/aging, non-accrual, maturity persistence,
exact resolution accounting, actual acquisition/funding-sale paths, staff
tradeoffs, preview purity, sealed-save continuation, invalid imports, privacy,
real renderer/handler staging and 96 AI turns. Early fast checks and the final
targeted credit suite pass. Fixed fixtures and reference engines are unchanged.

[Credit campaign audit](../reports/baselines/release-balance-2026-09-06T01-47-15-536Z.json):
16 campaigns / 1,920 turns, all reaching month 120. Accounting, cohort totals,
market contribution and private-view size checks pass; maximum player view
671,738 bytes across both seats, below 1 MiB. There were no silent initiative skips and three
explicit, uncharged cancellations after cash changed. Totals across both banks:
$102.428M entered arrears, $46.424M cured, $25.599M recovered, $26.090M realized
credit losses and $188,978 external case expenses. There were 468 competitive
actions and 188 commercial-provider changes, including 53 after month 60.
The AI chose balanced/workout/recovery in 3,804/36/0 bank-months; maximum total
delinquency was 2.38% of loans. Therefore this natural-play audit does **not**
prove varied recovery strategies. Targeted stressed books exercise all policies;
adversarial human strategy tuning remains ahead.

[Household compatibility audit](../reports/baselines/release-balance-2026-09-06T01-47-09-417Z.json):
16 campaigns / 1,920 turns with credit performance OFF. Every report field
except the artifact SHA exactly matches the previous household batch; no skipped
or cancelled initiatives, maximum player view 833,779 bytes.

[Long-session extension](../reports/baselines/release-balance-2026-09-06T01-49-58-278Z.json):
four additional seeded campaigns / 1,920 turns, all reaching month 480. Both
seats remain under 1 MiB, with maximum view size 757,269 bytes after the history
repair. There are no silently skipped initiatives; 36 explicit uncharged
cancellations (35 remediation, one marketing) still expose imperfect AI
reserves/retries. The run contains 424 competitive actions and 118 provider
changes, 96 after month 60. Collections remains overwhelmingly balanced:
3,826 balanced / 14 workout / zero recovery bank-months. Longevity, accounting
checks and reachable interaction pass; engaging human pacing and strategy
diversity are not established by these results. The final credit audits cover
20 distinct campaigns / 3,840 turns, not including diagnostic replays.

An initial campaign audit was invalidated by an intervening UI rebuild: its
final artifact-hash check failed. It is not counted as passing evidence; the
frozen-build rerun is authoritative. The next validation attempt was deliberately
stopped to repair the flat forced-sale discount on delinquent loans; completed
intermediate audits do not stand in for the final candidate. Targeted tests now
verify a fully 90+ book quotes a 76% funding / 77% regulatory haircut, mixed aging
quotes 21% in the seeded case, and real sale losses use that quote. An auxiliary
comparison against the previous v8.6 engine at `46f2fbc` passes exact AI-plan and
full-state equality over four campaigns / 160 turns with credit performance OFF.
Browser-first QA, following the
computer-use guidance, used a separate loopback campaign: setup, policy edits,
target-preserving inspection, first-month aging, reload/Continue and desktop,
950px and 500px layouts passed. Tables scroll internally without page overflow.
No warnings/errors were captured. The test tab/server were closed and viewport
override reset. No real save or live multiplayer room was modified.

The extended 480-month audit then caught a real size failure. An isolated replay
of Growth seed 20 reproduced a 1,053,286-byte player view after month 360; causal
history alone occupied 585,186 bytes. The fix budgets only the already-limited
owner causal-history projection to 256 KiB of UTF-8, preserving its newest
contiguous entries and exposing the omitted count/first included ID. All current
loans, the trend and the host's retained journal remain unchanged. A synthetic
Unicode-heavy case verifies the byte budget, owner privacy, newest-entry
retention and non-mutation. Long campaign audits now check **both seats**.
The interrupted regression attempts and earlier 120-month passes are not
substitutes for the final post-repair validation.

### Limits and next batch

This is principal-at-risk aging, not an individual borrower, collateral,
allowance/reserve, legal recovery or negotiated workout model. Exceptional
existing watchlist events can still create direct losses outside the monthly
aging report. Collections forecasts exclude rival actions and prior funding
sales; the integrated operating preview handles its own funding effects.
The AI uses aggregate workload and delinquency thresholds, not an optimal
credit strategy. Human competition/recovery acceptance and physical two-PC
tests remain required. Hosted PR checks are separate from local results.

N-04/N-06 are still partial. Next: **segment-owned deposit accounts**, replacing
the interim local-average withdrawal estimate. Group subsidiaries, company
shares, national content and delegated regional management remain ahead.

## Household ownership and retention — validated N-04 / N-06 preview

This batch is on `feat/household-retention`, stacked on the pending specialist
workforce [PR #12](https://github.com/NerdyGeneral/BranchWars/pull/12), not merged
into `main`. Enable **Household ownership preview** before starting a new game;
it creates v8.6 campaigns and enables the specialist/customer prerequisites.
Both linked clients need this build. Existing saves keep their original rules.

- Everyday, Connected and Reserve household counts persist by market and owner.
  Sales, raids and acquisitions move existing people between both players,
  community banks and credit unions. Each segment is conserved; changing the
  offer mix changes future intake, not the customers already owned.
- A recurring mandate splits effective Retail staffing between retention and
  acquisition, with separate segment priorities. Retail/digital offices and
  local service upgrades relieve differentiated workload. Specialist capacity
  is split once, not granted in full to both activities.
- Persistent neglect reduces goodwill before causing gradual departures.
  Restoring adequate service cuts the departure rate while trust rebuilds.
  Departing households return to outside institutions with a local-average
  deposit estimate, capped to withdrawable balances. Term locks are respected;
  outflow moves cash and deposits together, not operating profit. Funding asset
  sales can realize equity losses and are included in forecasts and actuals.
- A dedicated Customers workspace shows ownership, workload, service coverage,
  goodwill, forecast departures and realized outflow. Market inspection does not
  retarget the plan. It replaces the legacy goodwill panel for these campaigns,
  without adding more controls to Operations. Service mandates remain private.
- Engine/UI/style modules bring the ordered build to 80 inputs, with explicit
  movement and coordinator calls and no added runtime replacement assignments.

Candidate SHA-256 (canonical LF output):
`cc4e8366fc74ecbcbc85600b261c05acbceaaefeaffbaf0107e5794380033f3a`.

The [initial full Windows run](../reports/baselines/N-00-2026-09-06T00-12-53-528Z.json)
passed 52/53 invocations, with unchanged source/test fingerprints and reproduced
seeded balance output. The only failure expected the importer's error to say
"through v8.4" rather than the newly supported v8.6. That assertion was corrected
and the targeted engine suite then passed all 48 long-run campaigns and its
validation/migration/UI cases. No game code changed for this correction.
[Complete Windows rerun](../reports/baselines/N-00-2026-09-06T00-27-20-903Z.json):
**53/53 invocations passed**, all fingerprinted source/test files unchanged,
and repeated seeded balance output reproduced. This includes Windows LAN and
seven simulated GitHub relay configurations. Final fast checks, reference/build
freshness, private views and all three lobby transports also passed. The full
gate's regression runner and separate previous-rules campaign audit were run
independently rather than serially; all required components passed on the same
game artifact. Hosted PR checks remain separate. Fixed campaign/save expectations and frozen engines are
unchanged. The frozen importer comparison maps only its obsolete version-range
error to v8.6; the static markup contract now expects six core tabs plus two
optional workspaces.

[Household audit](../reports/baselines/release-balance-2026-09-06T00-13-59-452Z.json):
16 campaigns / 1,920 turns, all reaching month 120 with no skipped or cancelled
initiatives. Across both banks: 37,423 service-related departures and $459.335M
cumulative deposit outflow, 413 competitive actions, and 167 commercial-provider
changes (40 after month 60). Maximum player-view size was 833,779 bytes, below
the 1 MiB gate. The AI chose retention shares of 25/50/75/100 percent in
83/1,202/907/1,648 bank-months respectively; it uses an aggregate workload rule,
not sophisticated segment targeting or optimal recovery management.

[Long-session extension](../reports/baselines/release-balance-2026-09-06T00-35-18-102Z.json):
four additional seeded campaigns / 1,445 turns. Balanced and Rate reached month
480; Regulatory and Growth ended in receivership at months 215 and 270.
Accounting, segment conservation and view-size checks passed, with no silently
skipped initiatives. Twenty-nine initiatives were explicitly cancelled after
cash changed, without charging project cost; recurring cancellation still marks
AI reserve/retry behavior as unfinished. Maximum player-view size stayed at
938,726 bytes, below 1 MiB. The earlier [240-month run](../reports/baselines/release-balance-2026-09-06T00-30-21-416Z.json)
uses the same seeds and is not counted as four more independent campaigns.
The Balanced sample reversed the deposit lead between months 240 and 480; that
demonstrates a reachable comeback, not generally satisfactory competitive pacing.

[Previous-rules audit](../reports/baselines/release-balance-2026-09-06T00-14-55-726Z.json):
16 campaigns / 1,920 turns with management/customer previews OFF. Every field
except the source fingerprint exactly matches the prior specialist-batch audit.
An additional comparison with the previous v8.5 engine at `0aff94d` passed exact
AI-plan and full-state equality for four campaigns / 160 turns with household
ownership OFF. Old campaigns have not been silently rebalanced.

An auxiliary retention comparison ran four fixed settings in both player seats
for 60 months each (one shared seed; eight campaigns / 480 turns). Higher
retention reduced cumulative departures in that sample but did not consistently
maximize customers or equity. This is a small responsive-AI comparison, not
evidence of a universally optimal setting or equal strategies. The long-run
sample still contains large bank disparities and one bank near capital failure.
The Regulatory extension's failed bank had positive operating profit in its
last eight months but thin cash, rival deposit losses and regulatory loan sales;
retention was not its only source of pressure. No single-cause explanation or
human recovery acceptance is inferred from this replay.

Isolated browser QA verified setup, service/priority changes, market inspection,
one resolved month, and reload/Continue persistence. Default, 950px and 500px
layouts were inspected; the narrow table scrolls internally without page-wide
horizontal overflow. No browser warnings/errors were captured. No existing user
campaign or live repository room was touched. Physical two-PC and human pacing
acceptance remain outstanding; hosted CI is separate from local evidence.

N-04 and N-06 remain partial. Counts have ownership, but deposit accounts are
still pooled by market; goodwill product fit also uses that pooled deposit mix.
This is not individual household finance or cross-selling. Next: delayed loan
delinquency and collections, then actual segment-owned deposit accounts.
Leaders, full product lifecycle, subsidiaries, shares and national management
remain unfinished; this batch does not complete the blueprint.

## Specialist workforce — validated N-05 preview

This gameplay slice is on `feat/specialist-workforce`, based on the pending
explicit-runtime branch. It is not automatically merged into `main`.
The opt-in **Specialist workforce preview** creates v8.5 campaigns and requires
the Customer needs preview and its prerequisites. Both multiplayer clients must
support it; existing campaigns keep their original workforce and save rules.

- Four specialist roles have separate signing/salary premiums and persistent
  department skill. They are included in total bank headcount, share the six-hire
  limit, and add capacity only when assigned to their specialty.
- Recurring department training ceilings buy next-month expertise. Skill starts
  at 20 and caps at 100; training costs $1K per point per specialist, up to four
  points monthly. Recruiting dilutes average skill rather than inheriting free
  expertise. Generalist attrition and specialist talent transfers conserve staff.
- Training is an operating expense, not an event-multiplied bonus. Affordability
  is rechecked after production, protecting a configurable cash reserve, current
  capital requirements, ordinary losses and later hiring/research commitments.
  Every department pauses together when the combined training bill cannot be
  funded. Premium salaries remain payable even when specialists are reassigned.
- A separate Workforce workspace shows staffing, cost breakdowns, skill timing,
  forecast profit and realized expenses. The shared plan bar separates base pay
  from specialist premiums. The older service recruiting planner now adds one
  generalist without double-counting staged specialists.

Candidate SHA-256 (canonical LF output):
`031103150fd23cba0ac016056e793fdeff4d9d81fe63665dfa664efb70dc888d`.
[Full Windows regression](../reports/baselines/N-00-2026-09-05T23-01-08-715Z.json):
**50/50 invocations passed**, with all fingerprinted source/test files unchanged
and repeated seeded balance output reproduced. Includes Windows LAN, six GitHub
relay configurations, workforce/save/privacy, fixed campaign/save expectations,
and architecture/build checks. The final fast gate also passed; the subsequent
tab-contract correction passed both targeted suites and this full rerun.

The full gate's build/reference freshness checks, regression runner and separate
previous-rules campaign audit all passed. The rerun executed the latter two
components in parallel; it did not remove a test. Hosted PR checks remain
separate from this local evidence.

[Previous-rules campaign audit](../reports/baselines/release-balance-2026-09-05T23-02-20-530Z.json):
16 expanded-services campaigns / 1,920 turns passed with management/customer
previews OFF. Every non-source-fingerprint field matches the prior architecture
audit, and no initiative was skipped or cancelled. This is the separate campaign
audit required by the full check gate, not a substitute for workforce testing.

The [initial full run](../reports/baselines/N-00-2026-09-05T22-45-11-288Z.json)
passed 49/50 invocations, with unchanged source fingerprints and reproducible
seeded balance output. The only failure was the legacy assertion that markup
must contain exactly six workspace buttons. The updated test expects six core
tabs plus Workforce; an additional real-renderer test verifies the seventh tab
is hidden for legacy campaigns and shown for workforce campaigns. Game code and
fixed golden/save expectations were not changed for this test correction.

[Workforce campaign audit](../reports/baselines/release-balance-2026-09-05T22-48-54-146Z.json):
16 campaigns / 1,868 turns passed the accounting, cohort, local-book and
initiative-execution checks. Fifteen campaigns reached month 120; Growth seed 0
ended in receivership at month 68. No initiatives were skipped or cancelled.
AI plans staged 439 specialist hires and paid $8.209M in training across the
sample; 63 bank-months paused training for affordability. There were 432
competitive actions and 159 service-provider changes, 37 after month 60.
The largest serialized player view was 681,221 bytes, below the 1 MiB test limit.

The failed bank's final months had one specialist, no elective training or new
hires, and persistent operating losses followed by regulatory loan sales.
This is not evidence that training itself caused the failure, nor proof that AI
recovery is satisfactory. Opening-bank marginal previews also show specialist
premiums can outweigh immediate earnings, especially at capacity limits:
expertise must be used to relieve a real workload. Role value and endgame pacing
remain provisional, not certified equal or enjoyable by these simulations.

An isolated local browser campaign verified setup dependencies, recruiting,
paid skill growth from 20 to 24, reload/Continue persistence and the payroll
breakdown. Default, 950px and 500px layouts were inspected; the narrow table
scrolls inside its panel without page-wide horizontal overflow. No browser
warnings/errors were captured. This is not physical two-PC or human balance
acceptance. No existing user campaign or live Repository Link room was changed.

N-05 remains partial: department leaders, facility condition/conversion and
broader operating budgets remain ahead. Group accounting, subsidiaries, company
shares, national management and underwriting are not part of this batch.

## Explicit runtime and modular source — validated delivery

The approved four-step architecture batch is implemented and published in [PR #11](https://github.com/NerdyGeneral/BranchWars/pull/11) on `refactor/explicit-runtime`, following the separate lobby delivery in [PR #10](https://github.com/NerdyGeneral/BranchWars/pull/10). Monthly operations and project settlement now have explicit processing steps; AI preparation, save validators and portfolio normalization no longer replace previous implementations. This removes 53 runtime layers and folds one redundant API assignment into the initial export. Save versions, mechanics and fixed golden/reference fixtures are unchanged. The PRs remain open, not merged into `main`.

Editable code lives in `src/`, grouped into engine/content, UI/styles, network and persistence modules. The dependency-free builder generates the same standalone `BRANCH_WARS.html`; both test gates reject stale output. This is an ordered source-module architecture with shared private scopes, not full ES-module isolation. Other engine feature adapters and client/CSS coupling remain; see [architecture](architecture.md).

Candidate SHA-256 (canonical LF output): `87af2287e599092c787b3baffbc3e58d3904e1e92227cfda0330c06223b2d4ac`.

Fast checks passed, including 20 fixed campaigns / 790 turns, three preserved save continuations, creation/migration/project-rule comparisons, transport/lobby, build reproducibility and the new runtime suite. That suite compares 192 operations, 864 completions, 64 fault/recovery pairs, 64 AI preparations, 160 policy normalizations and 416 damaged-save validations against the frozen implementation. The fast gate also passed in a fresh Windows Git worktree at committed code `d624336`, including CRLF checkout behavior.

- [Full Windows regression](../reports/baselines/N-00-2026-09-05T20-58-23-657Z.json): **47/47 invocations passed** at `d624336`. All fingerprinted game/source/test files stayed unchanged; repeated seeded balance output matched. This includes Windows LAN, five simulated GitHub relay configurations, lobby, runtime/build, accounts, customer relationships and compatibility checks.
- [Expanded-services audit](../reports/baselines/release-balance-2026-09-05T21-15-44-621Z.json): 16 campaigns / 1,920 turns, management/customer previews OFF, completing the full check command after the 47 regression invocations. Every field except the source fingerprint matches the prior lifecycle audit.
- [Latest-preview audit](../reports/baselines/release-balance-2026-09-05T20-10-23-533Z.json): eight campaigns / 960 turns with management/customer relationships ON. Every non-source-fingerprint field matches a [fresh pre-architecture comparison](../reports/baselines/release-balance-2026-09-05T20-11-08-076Z.json) using the LF-normalized game from `afd0de7` (`0155cf7b...`).
- Across these 24 campaign samples / 2,880 turns, all campaigns remain active at turn 120 with no skipped or cancelled initiatives. These are unchanged simulated outcomes, not proof of equal strategies or satisfying human victory pacing. The legacy character audit still has uneven, self-selected strategy samples; this architecture batch does not rebalance them.
- The [initial full run](../reports/baselines/N-00-2026-09-05T20-02-20-405Z.json) passed 46/47, not 47/47. Its only failure was an obsolete service-option source-spelling assertion after lobby extraction. Commit `d624336` replaces it with nine actual lobby-start cases (three transports times omitted/off/on options); the original service mechanics suite then passes 324 turns. The test-only correction also passed on the separate multiplayer branch and was backported as `a96df9d`. No game logic or golden expectations changed to obtain the rerun pass.

This is a behavior-preserving refactor, not a balance redesign, UI redesign or national-blueprint completion. There is no fresh physical two-PC acceptance in this batch. The source extraction preserved client/markup/style bytes, and the local two-tab lobby evidence below applies to the unchanged client. Hosted fast checks at `d624336` have passed; full hosted checks are still running as of this entry. Local full acceptance must not be presented as a completed hosted run.

## Multiplayer patch — separate delivery branch

Patch source SHA-256: `245a1ee3c527c7718072eaaf8301f98382238065be04325c0cd5b498c8e3bced`; LF-normalized: `0155cf7b9610bc0b4000c272b798d8cd783096fdd849a23f62642f9edecacb10`.

New linked campaigns now stop in a shared pre-game lobby on Repository Link, LAN and Direct P2P. Each player edits their own bank name/color; the host may revise campaign size and economy. Preview rule choices remain visible but are selected before opening the room. Similar opening colors are separated automatically, subsequent clashes are refused, and identity/settings changes reset both confirmations. Only the host can start after both players confirm the current revision.

Successful GitHub polls with no new messages no longer turn the connection yellow. The status says **repository reachable**, not that the friend's browser is live. Missing peer files remain pending; access/transport failures and cooldowns retain their warning/error paths. Lobby checkpoints and pending confirmations survive same-tab Repository Resume without storing tokens in the checkpoint. New rooms require the lobby-capable build on both computers; running campaigns retain the existing reconnect path and saved identities.

Local validation: the fast gate, bank identity suite, 48-campaign engine suite, Windows LAN suite, and five GitHub relay configurations passed. The relay tests now enter through the lobby before playing 12 turns per configuration, including lost accepted-write responses. Targeted lobby tests cover all three message transports, seat authority, readiness revisions, duplicate starts/hellos, color clashes, version mismatches, reload and repeated idle polls. The simulation engine remains byte-equivalent after line-ending normalization to the lifecycle commit; no mechanics or balance fixtures were changed.

Browser acceptance used two isolated local LAN tabs: lobby arrival, custom guest color, both confirmations, host start and seat-relative identities were verified visually with no captured browser warnings/errors. This is not a fresh real-GitHub/two-physical-computer acceptance or a standalone full release/balance run of the multiplayer branch. The patch is published in PR #10 on `fix/multiplayer-lobby`, based on the pending lifecycle refactor. The combined architecture artifact has separate full/balance evidence above; hosted checks remain separate from local acceptance. Existing campaigns with matching colors are not silently recolored.

## Prior lifecycle build

The current game is the two-region Living Bank preview with accounting/funding, persistent rivalry, product/credit books, commercial service contracts, capability deployments, customer goodwill and the Service Workforce Planner. See [roadmap](roadmap.md) for incomplete packages. Specialist training budgets, financial-group subsidiaries, company shares and full national management remain ahead.

Prior lifecycle game SHA-256: `dfebd6409b783dcd8d3284da130375d7de478cc5c2e7756a71b2c3bfc0a68232`. LF-normalized source SHA-256: `9567c23532f8e5abcb71c50fef91ef87b3c07f924907dc490ea577fc12f07dca`; these fingerprints predate the local lobby patch. Checkout line endings can change raw bytes.

The lifecycle batch removes sixteen creation overrides and one browser repair override, following the prior twelve project/validation layers. Save migration is now engine-owned. See [architecture](architecture.md) for exact boundaries. Fixed campaign and save expectations have not been regenerated; no balance or save-rule change is intended.

The package path is `game/`; use the repository-root launchers and retarget old filesystem shortcuts. This batch does not add national/group gameplay or complete the blueprint.

## Lifecycle evidence and limits

- The lifecycle suite passes 1,387 independent creation comparisons and 41 migration comparisons with the preserved implementation, including all optional-stage combinations, random consumption, both seats' sealed plans, legacy repairs and non-mutating rejection.
- [Lifecycle full regression](../reports/baselines/N-00-2026-09-05T18-42-11-641Z.json): 44/44 invocations passed, including fixed campaigns/save continuations, lifecycle comparisons, accounting, Windows LAN and simulated GitHub recovery. Source/runtime fingerprints stayed unchanged and repeated balance output matched.
- [Lifecycle campaign audit](../reports/baselines/release-balance-2026-09-05T18-58-35-399Z.json): 16 expanded-services campaigns / 1,920 turns passed with no skipped/cancelled initiatives. Every non-source-fingerprint field matches the prior project-rule audit; all campaigns remain active at turn 120. This audit has management/customer previews OFF; their separate regression and fixed-campaign coverage remains active.
- The generated game reference remains current without regeneration: this batch changes no documented product, pricing or mechanics tables.
- This batch has no fresh screenshot or physical two-computer acceptance. Passing simulations are not proof of equal strategies or satisfying human victory pacing.

## Prior project-rule evidence

The reports in this section cover source `132168f234a891f9dcabce409dc5d4289de5cf769977858f369020b5879ef128`, not the lifecycle refactor above.

- The shared-project-rule suite passes 1,296 comparisons with the preserved pre-refactor engine, plus invalid project IDs, regional entry pricing, conflicting deployments, execution-time resource changes, seat-relative exits and real UI handlers in DOM sinks.
- Twenty fixed campaigns / 790 turns and three preserved half-ready save imports/continuations pass unchanged. Core engine, service-workforce and override-ceiling suites passed separately.
- [Project-rule full regression](../reports/baselines/N-00-2026-09-05T18-02-53-761Z.json): 43/43 invocations passed, including LF/CRLF reference generation, shared project rules, Windows LAN and simulated GitHub recovery. Source/runtime fingerprints remained unchanged and repeated seeded balance output matched.
- [Project-rule campaign audit](../reports/baselines/release-balance-2026-09-05T18-17-49-829Z.json): 16 expanded-services campaigns / 1,920 turns passed, with zero skipped/cancelled initiatives and all campaigns still active at turn 120. Every report field except the source fingerprint matches the foundation audit. Management/customer previews are OFF in this audit; their dedicated regression and fixed-campaign coverage remain separate.
- This batch has no fresh screenshot or physical two-computer acceptance. Passing simulations are not proof of equal strategies or satisfying human victory pacing. AI reserve/retry quality, real two-computer acceptance and multi-session national play remain outstanding.

## Historical evidence

The reports below cover the previous source hash `ff15fce9f8e4af3ebb6024c0b4d984dba3cededee0d8a4f7e5bb2f245a62453c`, not the refactored source above.

- [Stabilization full regression](../reports/baselines/N-00-2026-09-05T15-09-38-214Z.json): 39/39 invocations passed from the relocated package; runtime/source fingerprints remained unchanged during the run. This includes the 20-campaign / 790-turn committed behavior baseline and Windows LAN.
- Additional fixed saved-game outcome and Windows root-launcher tests passed separately, then were added to the foundation runner (41 invocations at that point). The historical 39-test report is not relabeled as a later larger run.
- An isolated relocated LAN server served byte-identical HTML at both the root route and `/BRANCH_WARS.html`. This is local acceptance, not a physical two-computer test.
- [Stabilization campaign audit](../reports/baselines/release-balance-2026-09-05T15-24-31-371Z.json): 16 expanded-services campaigns / 1,920 turns passed; no skipped or cancelled initiatives in this sample, and all campaigns remained active at turn 120. This run uses management/customer previews OFF; it does not replace the goodwill evidence below.
- An initial Windows hosted failure exposed mixed-line-ending formatting in the reference generator; commit `e890596` normalizes inputs and tests all eight LF/CRLF combinations. Its hosted rerun passed all 42 regression invocations, then hit the 40-minute job timeout during the separate campaign audit. Commit `56113e6` increases the job budget to 60 minutes without removing any test. The refreshed foundation and project-rule workflows are running; a cancelled full workflow is not a full hosted pass.

- [Earlier mechanics regression](../reports/baselines/N-00-2026-09-05T13-43-26-566Z.json): 36/36 invocations passed on the previous game bytes, including replay, saves, ledger, simulated GitHub recovery and Windows LAN checks.
- [Same-source long audit](../reports/baselines/release-balance-2026-09-05T13-48-56-199Z.json): 16 campaigns / 2,880 turns; accounts reconciled and all campaigns remained active. Four cash-change cancellations were explicit and uncharged.
- [Workforce batch details](archive/service-workforce-status.md): browser layout, draft actions and save continuation checks, plus scope limits.

The architecture foundation protects incremental refactoring through committed expectations, preserved save fixtures, an override-debt guard and automated PR checks. The current candidate completes the selected monthly/project/AI/validation cleanup, not every engine feature adapter or shared context.

## GitHub delivery

PRs #1–#6 are merged. Seven retired branch tips were preserved in verified archive tags before their names were deleted; recovery details are in the architecture document. Review the pending stack in dependency order: [foundation #7](https://github.com/NerdyGeneral/BranchWars/pull/7), [shared project rules #8](https://github.com/NerdyGeneral/BranchWars/pull/8), [lifecycle #9](https://github.com/NerdyGeneral/BranchWars/pull/9), [multiplayer lobby #10](https://github.com/NerdyGeneral/BranchWars/pull/10), then [explicit runtime/source modules #11](https://github.com/NerdyGeneral/BranchWars/pull/11). Retarget each dependent PR after its prerequisite merges. These PRs are not automatically merged and the refactors are not yet on `main`.
