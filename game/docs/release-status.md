# Current release status

Updated: 2026-09-05.

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
