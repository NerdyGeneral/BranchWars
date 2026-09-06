# Current release status

Updated: 2026-09-05.

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
