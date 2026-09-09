# V3 usability implementation and acceptance ledger

## Scope and baseline

Active authority: September 9, 2026 user goal, **Complete the Branch Wars V3
usability overhaul and publish the verified release**. All five batches and the
55 recommendations below remain in scope. This is not a simulation expansion.
National Empire, underwriting, economic retuning and removal of options are
excluded. Reversible UI decisions are authorized; publication to the existing V3
catalog is authorized only after release gates pass.

- Source baseline: `c721ede4245016853f35c30761d9ff35971b154f`.
- Baseline portable SHA-256: `65f469e82f2d747f12334caf84a1079ea4eade2406cfa9635239e2049416644e`.
- Published catalog baseline: `fb6c424c74fe18ea04c1bfa637c561a017353863`, checked with `git ls-remote`.
- Original source tree remains in `BranchWars-v3.1-repair`; active work is in
  sibling `BranchWars-v3-usability`, branch `feat/v3-usability`.
- Full original working tree (913 files, 490,964,647 bytes, including untracked
  local reports/saves) preserved outside the repositories in
  `output/v3-usability-baseline-20260909/source-working-tree.tar`.
  Archive SHA-256: `3cf353dd333793d80595b5333ead668271f8a8b395728692e8f7064a9cd5dbf4`.
- Complete baseline Git history also preserved in verified `source-history.bundle`.
- Fresh baseline fast gate completed successfully against the unchanged original
  tree. Its log is in that same private baseline directory. This is baseline
  evidence, not the candidate's final full Windows release gate.
- Existing main default game and V2 are intentionally retained. Only V3 catalog
  entries/artifacts and related documentation will be updated at publication.
- Manual sources: `manual/build_v3_manual.py`, `manual/build_v31_manual.py`,
  and `docs/v31-manual-addendum.md`. Current published manual contains 51 pages.

No private save, token, checkpoint or baseline archive may be published.

## Recommendation coverage

Status starts **pending**. Mark implemented only with concrete source and test
evidence; browser, release and human acceptance are separate gates.

| ID | Recommendation / required outcome | Batch | Status / evidence |
|---|---|---|---|
| 01 | Unified People & Operations overview | 2 | Implemented five-desk workspace; mature browser and production navigation tests; final integration review open |
| 02 | Headcount allocation distinct from work coverage | 2 | Implemented: independent task-delivery and headcount measures; automated and mature browser evidence |
| 03 | Shared staff/time reservation explanation | 2 | Implemented initial role reconciliation table; remaining time explicitly precedes facilities/sales |
| 04 | Understandable staff units with exact detail | 2 | Partial: quarter-work explanation and exact-source task values; detailed editor wording remains |
| 05 | Consequence-first staffing shortages | 2 | Implemented initial task shortage table with business consequences; final integrated review open |
| 06 | Compare shortage remedies and displaced work | 2 | Partial: explicit remedy tradeoffs; numerical before/after remedy comparison remains |
| 07 | Unified generalist/specialist recruitment | 2 | Implemented shared five-type desk, actual incremental signing costs/limit, Operations shortcut and guarded staging |
| 08 | Staffing arrival/availability timeline | 2 | Partial: explicit arrival month and teaching reservations; integrated multi-source availability timeline remains |
| 09 | Training costs, benefits and timing | 2 | Implemented retained form plus actual before/after spend/skill/teaching preview and explicit Stage/Discard |
| 10 | Training pauses and effective budget limits | 2 | Implemented requested vs department ceilings, protection/eligibility explanations and lower-ceiling regression; final all-scenario UI review open |
| 11 | Readable leader cards and replacement consequences | 2 | Partial: dedicated reachable desk and clarified pre-delivery teaching/department-reserve scope; card density and per-choice comparisons remain |
| 12 | Readable bounded delegation proposals | 2 | Implemented named before/after instruction table and whole-plan cost comparison; allowed fields/authority unchanged |
| 13 | Task-oriented grouped navigation | 3 | Implemented four task groups, retained 11 mounts, contextual/remembered selection; 32 visibility combinations and mature browser verified; final laptop/zoom integration gate open |
| 14 | Attention inbox and healthy-system status | 3 | Implemented initial owner-only Required/Watch/Upcoming inbox, pagination, source-specific conditions and explicit no-listed-issues limits; additional stalled-work/debrief integrations remain |
| 15 | All submission blockers with direct links | 1 | Partial: independent readiness/quote blockers and links implemented; deeper per-subsystem validator enumeration remains |
| 16 | Required decisions separated from opportunities | 1 | Implemented initial review; `usability_plan_review.test.js`, early/mature browser; final integration gate open |
| 17 | Consistent current/form/staged/active lifecycle | 1 | Partial: review legend and retained unstaged Workforce status; cross-editor standardization remains |
| 18 | Monthly changes drawer with cost/timing/dependencies | 1 | Partial: opening-draft differences, timing and whole-plan undo quote implemented; richer system-specific cost/timing labels remain |
| 19 | Scoped undo and unfinished-form protection | 1 | Partial: guarded individual field/initiative undo plus Leadership/functions/training raw form retention; remaining editors pending |
| 20 | Contextual navigation and search | 3 | Implemented 34 searchable owner-scoped help topics, disabled-preview explanations and direct existing desk links; mature browser routes and native keyboard behavior checked; final integrated acceptance remains |
| 21 | Retained screen context and appropriate scroll/focus | 1 | Partial: fresh entry/Continue opens Overview at top; remaining per-workspace context pending |
| 22 | Precise financial measure names | 3 | Partial: owner financial overview separates current cash/equity, draft room and actual profit/earnings; remaining screen-wide copy audit open |
| 23 | Cash-to-spendable-room explanation | 3 | Implemented existing protected quote, obligations and capital constraints with bank/parent separation; actual mature-browser comparison verified |
| 24 | Decision-adjacent forecast comparisons | 3 | Pending |
| 25 | Consistent forecast scope and timing | 3 | Pending |
| 26 | Metric causes / why changed | 3 | Partial: recorded monthly earnings bridge and scoped deposit/credit movements; no fabricated causal history; wider metric drilldowns remain |
| 27 | Intentional numerical precision | 3 | Partial: new financial/inbox money uses whole dollars and unavailable rather than false zero; legacy screen-wide precision pass remains |
| 28 | Explicit map metric layers | 4 | Pending |
| 29 | Inspection separate from action targeting | 4 | Pending |
| 30 | Mature-market contestability presentation | 4 | Pending |
| 31 | Unified facility network and inspector | 4 | Pending |
| 32 | Facility filters and comparisons | 4 | Pending |
| 33 | Competitive decision briefs without private plans | 4 | Pending |
| 34 | Connected product management home | 4 | Pending |
| 35 | Actual product lifecycle states | 4 | Pending |
| 36 | Research-to-implementation explanations | 4 | Pending |
| 37 | Comparable strategic model choices | 4 | Pending |
| 38 | Project timing, bottlenecks and disruption | 4 | Pending |
| 39 | Marketing-to-delivered-relationship attribution | 4 | Pending |
| 40 | Distinct bank/subsidiary/consolidated dashboards | 4 | Pending |
| 41 | Owner-private unfinished draft recovery | 5 | Pending |
| 42 | Persistent actionable save failures | 5 | Pending |
| 43 | Separate repository/peer/ack health indicators | 5 | Pending |
| 44 | Actual turn-delivery progress and recovery guidance | 5 | Pending |
| 45 | Understandable lobby/setup complexity | 5 | Pending |
| 46 | Compact persistent interface elements | 5 | Partial: compact campaign header/KPIs and pinned two-level navigation; expanded spending removed from sticky area; overall planning chrome remains to streamline |
| 47 | Readable hierarchy and constraints | 5 | Pending |
| 48 | Table sorting/filtering/header/scroll usability | 5 | Pending |
| 49 | Consistent keyboard, labels and focus | 5 | Partial: task/subtab keyboard controls, help dialog focus containment and one-press Escape, sticky-safe contextual targets; wider editor/table audit remains |
| 50 | Presentation detail levels independent of rules | 5 | Pending |
| 51 | Grouped causal monthly debrief | 5 | Pending |
| 52 | Supported trends and actual campaign history | 5 | Pending |
| 53 | Informational watchlists and personal priorities | 5 | Pending |
| 54 | Measured mature-campaign responsiveness | 5 | Partial: one synchronous view per navigation and a reproducible month-481 routing benchmark; full renderer, sustained interactions and matched final performance gates remain |
| 55 | Contextual help and restrained visual polish | 5 | Partial: searchable modal and inline People/planning explanations; 1265px and 640px browser inspection; wider polish and final zoom gate remain |

## Release gates (all open)

1. All scoped implementations mapped above; no silently omitted requirement.
2. New interaction regressions: navigation/edit loss, staging, undo, blockers,
   scope isolation, draft recovery and keyboard behavior.
3. Exact final full Windows and existing regression gates, including supported
   feature combinations, historical save paths, deterministic replay and books.
4. Exact final simulated LAN/direct/GitHub transport, delay/reconnect/readiness,
   malformed-state and owner-privacy gates. Physical two-computer play remains
   separately disclosed, never inferred from simulation.
5. Matched long-campaign balance and performance comparison with the preserved
   baseline; unchanged simulation must be demonstrated, not assumed.
6. Actual browser early/mature walkthroughs, laptop layouts and text zoom.
7. Updated manual, rendered PDF review, link/content validation.
8. New portable package, fresh extraction, launch and inventory verification.
9. Scoped GitHub publication; no unrelated merge/delete/force push.
10. Downloaded published artifact hashes, extraction/launch/manual validation,
    GitHub checks, final release links and limitations.

## Provisional implementation decisions

- UI form scratch state is not a campaign rule or accounting book. It must not
  enter public views or transport payloads. Owner/month/session boundaries must
  discard stale forms; related staged changes supersede stale field values.
- In-memory preservation is not durable draft recovery. The latter remains
  separately open under item 41 until storage/revision/privacy tests pass.
- The first repair is deliberately small, but it does not reduce the five-batch
  objective. No release completion or broad usability acceptance is claimed.

## First implementation checkpoint — September 9

Candidate portable SHA-256:
`c43f5b9bb8058f2924ec96227b2bfaf8c85537f17e740672883689b8cdefa7e6`.
Engine SHA-256 remains exactly
`cc229f83d09b769461497646daa64ce68e0c63a364b68ab6b175fa712db40633`.
`usability_engine_boundary.test.js` pins this immutable baseline rather than
allowing accidental simulation drift to be absorbed into new goldens.

Implemented:

- Leadership preserves raw unstaged values across desk redraws, including blank
  and invalid number entries. Explicit Stage/Discard controls remain distinct.
- Function forms preserve raw inputs and invalidate reviewed quotes when other
  monthly instructions change. Owner, month, connection and related-policy
  boundaries clear stale scratch state; no scratch state enters game/network data.
- Monthly review aggregates the existing independent readiness, budget,
  initiative, lifecycle, function and action checks, with required/optional
  separation and contextual navigation. It does not yet enumerate every error
  inside each sequential engine validator; item 15 remains partial.
- Rendering no longer silently deletes a service bid when Business staffing is
  reduced to zero. The explicit order is retained with an actionable blocker.
- Missing focus no longer sends the Ready refresh into market-dependent
  forecasts; it displays required action instead of a rendering exception.
- Start/import/Continue entry opens Overview and resets scroll. Normal refresh
  retains the active desk.

Verification completed at this checkpoint:

- 7 new production form cases, 7 new plan-review cases and exact engine digest.
- Existing department UI/live-functions/workforce/obligation gates, protected
  budget UI, V3.1 stability UI, Operations navigation, Strategy UI, architecture,
  documentation and portable assembly checks passed during implementation.
- Local/network session transition regression gates passed after entry repair.
- Real browser: optional-off opening, required-decision shortcut, 46.6 MB mature
  save import, mentor selection -> Functions -> Leadership exact retention,
  explicit discard, and rebuilt mature Continue at top of Overview.
- Browser screenshot still shows crowded persistent navigation/header. This is
  expected unfinished scope under batches 3/5, not visual acceptance of the overhaul.
- Final full Windows, long-run comparison, three-transport UI integration,
  manual, packaging and publication gates remain open. No new release published.

Test maintenance: the isolated obligations UI harness now loads the actual new
plan-review dependency. Its historical **submission wording** equality is
intentionally superseded by the approved UX rewrite; budget/action markup and
readiness/accounting equality remain checked. No simulation golden or save
fixture changed. Two historical report hyperlinks were converted to clearly
identified local evidence paths because those ignored private reports do not
exist in a clean worktree; report hashes and findings are retained.

### Next implementation work

1. Monthly staged-changes drawer and guarded per-order undo, with full owner,
   month, session, sealed/stale and dependent-order tests.
2. Complete cross-editor form/staging consistency and validation coverage.
3. Unified Workforce overview and hiring/training/reservation workflow, using
   existing quotes rather than new employee pools or bonuses.
4. Continue the remaining four batches and release gates; the full 55-item
   scope is still the completion criterion.

The original baseline fast gate in execution session `43117` completed with
exit code 0 and `Fast checks passed (not full release acceptance).` The completed
handle was polled directly; no duplicate baseline run was started.

## Second implementation checkpoint — monthly changes and People overview

Candidate portable SHA-256:
`91345ed581567ebf9279f1c38f26dbbb1f07a98306ba179a3de214e6b5433945`.
The exact engine digest remains the unchanged baseline above.

- The monthly drawer compares staged instructions with the opening draft after
  bounded management defaults, not with an invented copy of last month's rules.
  No opening-draft metadata enters saves or public/transport views.
- Individual nested fields, research allocations and individual initiatives can
  be reviewed and undone. The legacy initiative alias follows the remaining list.
  Other orders are preserved. New review conflicts appear before confirmation;
  cancellation changes nothing, and stale/locked/owner/month/session proposals
  cannot apply. Costs are explicitly whole-plan quotes, not fabricated per-order
  charges. Confirmation/cancellation restore keyboard focus.
- People & Operations summarizes actual employees, headcount assignment, exact
  task coverage and next-month recruitment from current canonical quotes. Its
  role-time table reconciles assigned, teaching, retained, extra and fractional
  reservations. Remaining time is not labeled idle or available twice.
- Household service, credit administration and other shortage rows explain the
  affected business. Remedy options describe displacement, costs and timing,
  without hiring, outsourcing or changing the player's plan automatically.
- The older function desk now calls its measure **Aggregate quota shortfall**:
  zero grouped quota shortfall does not establish coverage for every task.
  The mature browser exposed this distinction (50/50 employees assigned, zero
  grouped quota shortfall, household physical task coverage 48/53.170).
- The recruitment summary now reads the shared engine limit instead of hardcoding
  six in the presentation. No limit or economic formula changed.

Verification: 10 new change/undo groups and 7 new People groups pass against the
assembled production client/engine. Existing forms (7), plan review (7), live
functions (16), department workforce (5), obligations (12), local transitions,
network lifecycle, architecture and reference checks pass. Normalization occurs
on a clone, including partial drafts; rendering does not repair the real draft.
The isolated workforce harness gained the actual game binding required by its
new navigation guard; no existing economic assertions or goldens were removed.

Actual loopback browser: early decision -> drawer -> dependency review -> Cancel
retains response -> Confirm restores required decision and disables Ready. A
preserved 46.6 MB month-481 save imports and opens the new People overview with
50 employees, 30 generalists/20 specialists, and task-level shortages. No turn
was submitted. The final grammar/aggregate label clarification was subsequently
rebuilt and tested; final all-screen visual acceptance remains open.

Next: finish workforce consolidation (hiring, training/leadership and bounded
proposal comparisons), remaining form consistency and richer per-order labels;
then grouped navigation/attention, connected workflows and full release gates.
No batch or release is declared complete. Manual, final balance/performance,
transport release validation, packaging and GitHub publication remain pending.

## Third implementation checkpoint — unified recruitment and explicit development

Candidate portable SHA-256:
`4cc4c6256d30f8c0d73800a14aa814a3007d7b7f8711f67b71f36e8b3cd62f04`.
The engine remains exactly `cc229f83d09b769461497646daa64ce68e0c63a364b68ab6b175fa712db40633`.

- Workforce has Overview, Work coverage, Recruitment, Development, and Leadership
  desks. Only the selected desk is displayed. Unavailable systems do not gain
  dummy controls: standalone workforce has three desks; older department rules
  omit function coverage. Owner/campaign changes reset the presentation context.
- Recruitment combines generalists and all four specialist roles. Incremental
  signing costs come from engine plan-budget differences, with the shared limit,
  current headcount, next productive month, salary premiums and explicit blocked
  reasons. Operations links here instead of retaining a second generalist editor.
- Training ceilings and reserves are now raw unstaged forms. Input alone does
  not alter the plan. Preview compares actual quoted expense, projected skill,
  teaching time, and department ceilings; Stage applies the reviewed policy and
  Discard retains the previously staged policy. Blank values are not zero.
  Related-policy/month/owner changes invalidate forms; unrelated plan edits keep
  raw fields but invalidate the old quote. Paused/reconnected/sealed write tokens
  cannot apply. These are private in-memory forms, not durable recovery yet.
- Leadership/delegation use readable before/after instruction rows, not raw JSON.
  Allowed service/research/training fields and strategic prohibitions remain
  unchanged. Leadership teaching potential and department reserve are now labeled
  separately from delivery-adjusted skill and the effective shared reserve.
- If a post-staging redraw throws, recruiting/training report that staging
  succeeded and the screen needs recovery; they no longer falsely claim the
  accepted order was rejected. No settlement or bank resource is changed by UI.

Eleven new production workflow groups pass, covering optional standalone/Group
rules, keyboard navigation, hiring limits and marginal costs, stale/paused/sealed
guards, retained blank training fields, actual lower department ceilings, explicit
staging, redraw failures, and one recruitment destination. Existing department UI,
workforce (5), forms (7), live functions (16), monthly review (7), changes (10),
obligations (12), protected-budget, Operations workspace, architecture and exact
engine-boundary checks passed during this checkpoint. The isolated workforce
harness now loads the real new adapter and supplies its DOM/session bindings;
its accounting/teaching assertions are unchanged.

Browser on the D50B precursor: mature Continue completed despite a three-second
input observation timeout (re-observation confirmed month 481; no repeated click).
All five desks were reachable with unrelated panels absent. One retail recruit
staged a $262,222 signing commitment without advancing the month or headcount.
A $20,000 raw training ceiling survived Recruitment -> Development; Preview
quoted $14,000 class spend and one teaching banker. Explicit Stage updated the
shared budget, productive Retail staff 12 -> 11, and projected skill 20 -> 21.
No turn was submitted. The subsequent 4CC4 build adds redraw-result protection
and the leadership scope clarifications; these pass targeted automated checks
but still need final rebuilt browser acceptance.

The rolling fast regression started against D50B in exec session `76479`, with
output `../output/v3-usability-workflows-fast.log`. It ended with exit 1 in
`feature_setup.test.js`: the persistence harness extracted only the first line
of the now-multiline `enterGame`. Extraction now includes the complete real
handler. The affected suite passes against both portable bytes and source;
local transition and network lifecycle regressions also pass after the repair.
Earlier engine/accounting/corporate/compatibility gates in the run passed.
This was **not** an exact-final-build release gate: later small UI fixes changed
source during it. Future lengthy checkpoint runs should use a detached snapshot,
so subsequent implementation cannot change their input. The finished release
still needs its own full Windows run against frozen final bytes.

Still open: live unsaved-form warnings at submission, general navigation/focus
polish (including recruitment grammar), cross-editor preservation, numeric remedy
comparisons, compact leadership cards and the remaining batches. The overall
game/manual/package/publication goal is active; no usability batch is signed off.

Frozen checkpoint follow-up: commit `e371ec3` has a detached verification worktree
at `../output/v3-usability-checkpoint3` (relative to the implementation root).
Its fast gate was started in exec session `74151`; the log is
`../output/v3-usability-checkpoint3-fast.log`. The run was confirmed live after
build/reference/docs/architecture and early accounting gates passed. Do not edit
this detached snapshot; poll its process/handle before interpreting a quiet log.
It is a checkpoint test, not the eventual finished-release acceptance gate.

## Fourth checkpoint — task-group navigation and compact chrome

Portable SHA-256:
`4ddf27dbb0995e35c095b776ca355d283dd3309d5bd86e71678ac964950508c0`.
There are 141 source files. The pinned engine digest remains unchanged; no
economic formulas, state fields, defaults or transport payloads were edited.

- Eleven workspace destinations now sit under four tasks: Bank & finance,
  Customers & markets, Run the bank, Growth & competition. Only the selected
  group's one-to-three supported destinations are shown. Existing control IDs
  and form mounts remain, including for older campaigns without previews.
- Returning to a group restores its last selected destination; contextual links
  reveal the appropriate parent group. Preferences reset between hotseat owners.
  Main groups support arrow/Home/End focus, while secondary tabs use roving
  keyboard selection. Group selection scrolls to content below the menu, honors
  reduced motion and rejects delayed scrolls after a different selection/owner.
- Campaign-only brand/header/KPI spacing is reduced. Detailed shared spending
  stays available but is no longer part of the sticky menu. Old Financial Group
  and Products rules that disabled sticky navigation were removed after actual
  browser inspection exposed their conflict with the new compact menu.
- New `usability_navigation.test.js` exercises all 32 optional-screen visibility
  combinations, unique retained mounts, keyboard/ARIA behavior, owner reset,
  draft/view purity, binding once, delayed scroll and reduced motion. It is in
  both gate entry points.

The frozen `74151` run is **terminal exit 1** at `project-rules.test.js` after
earlier company, compatibility, network, packaging and quick paired tests passed.
That isolated project UI harness had not loaded the new `monthlyPlanReview`
dependency. It now executes the real shared review; its 1,296 independent legacy
comparisons remain unchanged and pass. The shared simulated-browser harness also
now provides DOM attribute storage used by the new accessible navigation. No
legacy golden was regenerated, and no validation assertion was removed.

Targeted passes: navigation, project rules, Strategy release UI, retained forms,
monthly review and undo, workforce workflows, protected spending, Operations
workspace, build/architecture, exact engine boundary, repository resilience
(12 relay turns, nine lost responses), local transitions and network lifecycle.
These do not replace the full exact-final Windows gate.

Actual browser inspection at 1265 x 712 used the preserved month-481/50-employee
campaign. Continue completed despite the known three-second input-observation
timeout; it was re-observed rather than clicked again. Four groups and supported
subtabs rendered correctly. The rebuilt sticky menu stayed visible above
Operations after scrolling, with executive choices in view; People remained
reachable with all five desks. No orders were submitted and all task QA tabs
were closed. Broader early/zoom/editor walkthroughs remain release work.

Next: attention inbox, financial explanation/forecast/help integration, remaining
workforce/planning polish and connected business workflows. All five batches and
all 55 recommendations remain the goal; no entire batch or release is signed off.

Frozen fourth-checkpoint verification: detached commit `07b0054` in
`../output/v3-usability-checkpoint4`, exec session `88302`, log
`../output/v3-usability-checkpoint4-fast.log`. The fast regression was confirmed
running after build/reference/docs/architecture and early accounting checks.
Keep this snapshot immutable and poll the same handle; final release acceptance
still requires the complete finished build, not this intermediate checkpoint.

## Fifth checkpoint — owner attention and financial explanations

Portable SHA-256:
`2ef121c2e5ce8c248d982a442c3512837bc34ff42b6f6f622b01fac7439213e2`.
142 source files; the pinned simulation digest is still unchanged.

- Overview now has an owner-only attention inbox: Required, Watch and Upcoming
  filters, ten-item pages and context-specific Review links. Checks include
  existing submission blockers/form warnings, capital distress, unpaid
  obligations, recorded operating/earnings losses, consecutive deposit snapshots,
  quoted task/execution shortages, owned service renewals/misses, expiring
  applications, recorded arrears/cures and authored critical office condition.
  No alerts are inferred from rival private plans or unrecorded history. A clear
  filtered list explicitly does not promise safety or future profitability.
- The financial overview separates bank cash, quoted optional spending room,
  bank equity and the last recorded operating profit. Expandable explanations
  cover obligations, reserves, capital room, retained earnings and the separate
  parent/consolidated position. Existing quotes and accounting checks are used;
  missing actual results are unavailable, not an invented zero-profit month.
- Group totals are labeled balance-sheet positions, not group monthly profit.
  The existing valid owner earnings bridge is shown when supported; unsupported
  versions do not acquire a new book or reconstructed history.
- Monthly plan details collapse behind a count-bearing review summary. The
  required decision/ready status remains visible. The shared coverage warning
  was corrected to read dispatched task shortfalls, not aggregate quota spare
  capacity. People and the monthly review now agree; the inbox does not duplicate
  the same coverage warning.
- Financial disclosures stay open across inbox filter redraws. Browser QA found
  and fixed selected-filter white-on-white hover text. Navigation links are
  owner/month/snapshot guarded and stage no orders.

Ten new production model/workflow test groups pass across original and Group1–7
versions: exact quotes, no book/plan mutation, task warnings, owned renewal
privacy, pending-vs-owned requests, stage-specific losses, nonconsecutive-history
refusal, authored facility thresholds, pagination, a real simultaneous resolution,
bank/group reconciliation, hostile text escaping and guarded navigation callbacks.
The suite is included in both gate entry points. Existing planning, undo, forms,
People, workforce workflows, Operations, navigation, earnings bridge (9), protected
budget, balance-sheet UI (10), architecture and exact simulation-boundary tests
also pass. Onboarding network checks pass against both source and portable bytes.

Frozen checkpoint 4 (`88302`) is **terminal exit 1** in
`onboarding_network.test.js`: another isolated persistence harness extracted only
the first line of the multiline entry handler. It now restores the complete real
handler from the tested artifact. The complete onboarding network cases pass,
including visible Continue, half-ready hotseat privacy, three negotiated transports
and private queues. Searches found only the two affected entry restoration loops;
the feature-setup loop was already repaired. No frozen golden was regenerated or
old comparison removed. This is not a completed full regression/release gate.

Browser inspection at 1265 x 712 used the preserved month-481 campaign. The
inbox showed one required executive call, one task shortage, one owned Treasury
renewal and recorded credit-flow pressure. Upcoming filtering worked; its Review
link opened actual renewal pricing with no staged bid or turn submission.
Verified actual figures: bank cash $93,884,537; optional room $1,178,150; equity
$4,215,396; month-480 operating profit $65,870. The retained earnings bridge showed
opening $1,913,615 + profit $65,870 + other net -$64,089 = closing $1,915,396
(net +$1,781). The disclosure stayed expanded across filtering and selected text
was readable. Final post-browser changes only normalize shortage-label case and
the singular warning suffix; targeted tests pass. All task QA tabs were closed.

Still open: searchable/contextual help, screen-wide forecast/precision labels,
financial decision-adjacent comparisons, remaining batch 1/2 editor safeguards,
connected business workflows, presentation/recovery/performance work, the matching
manual and all exact-final release/publication gates. No whole batch is signed off.

Frozen fifth-checkpoint verification: detached `ca0bf16` in
`../output/v3-usability-checkpoint5`; fast-gate exec session `12012`, log
`../output/v3-usability-checkpoint5-fast.log`. Confirmed live after build,
reference, docs, architecture and early accounting checks. Do not edit this
snapshot or restart a quiet live process; poll the same handle. This remains
an intermediate regression, not finished-release acceptance.

## Sixth implementation checkpoint — September 9

Candidate portable SHA-256:
`06ded73809ef63d18d0a92d38e26101cbcee01233c68655933767c804adc0c90`.
The 143-source portable build retains the exact pinned V3.1 engine bytes.

- Added **Help & find controls** beside the active workspace tabs. Its 34 topics
  explain actual enabled systems, including shared staffing, funds, research,
  products, onboarding, subsidiaries, multiplayer and save distinctions.
- Search includes system identifiers as well as plain-language titles and
  synonyms. All entered words must match; query length is bounded. Current
  workspace topics are preferred, and missing previews remain visibly
  unavailable rather than changing options or fabricating books.
- Links select existing workspaces and product/People/household/group desks.
  They do not stage actions, change targets, submit turns or expose private
  rival information. People and monthly planning also have inline help links.
- Dialog focus is contained, Escape closes in one press, and valid opener focus
  is restored. Owner/month/seat/snapshot/connection guards reject stale routes.
  Handoffs, resolution overlays and leaving gameplay dismiss help. Only minimal
  feature availability is captured; typing does not reconstruct or quote the
  large campaign state.
- Contextual destination headings now clear sticky navigation. Ordinary tab
  routing reuses one synchronous view; no view is cached across events, turns
  or owners. Group-scroll guards no longer build another public view.

Eight new help test groups pass, including every catalog prerequisite omission,
product-pricing version boundaries, all topic identifiers, hostile/unmatched
queries, focus/close behavior, stale callbacks, and real production destination
painters across original and Group1–7 campaigns with unchanged plans/books.
Navigation tests count one routing view per supported tab/group and still cover
all 32 optional-screen combinations. Existing build, architecture, engine pin,
Operations, overlay, People, workforce, forms, undo, plan review, financial inbox,
setup/lobby, onboarding network and local-session tests pass. The help suite is
included in both standard verification entry points. No legacy golden changed.

Actual browser checks used the preserved month-481 campaign at 1265 x 712 and
640 x 800. Search and People/onboarding routes worked without orders or a month
being submitted. The browser exposed and prompted fixes for a sticky-obscured
destination heading, native-search Escape clearing instead of closing, and
backwards focus leaving the dialog; each correction was rechecked. No browser
console errors were recorded. The final identifier-search addition and routing
optimization followed those visual checks and have automated coverage; the
finished-build full visual/zoom gate remains open. Temporary viewport overrides
were reset and the task QA tab was closed.

Reproducible routing benchmark:
`node game/tools/measure_navigation.js --baseline 301e99c --save <preserved raw month-481 save>`.
Save: 46,641,574 bytes, SHA-256
`2ca8137bb6f4aab0115d4b719174b93e339b2390fed29f5273b79d7c94665d88`.
Baseline routing source SHA-256:
`f24d21c64a5f49d4ed2b5ebb09e0006b0392b660ba3a75a5adf3a48b45049073`.
Both variants use the same engine/data and inert business painters. Five trials
per action; median routing/public-view work:

| Action | Before views / median | After views / median |
| --- | --- | --- |
| Products | 3 / 44.795 ms | 1 / 15.665 ms |
| People | 3 / 43.730 ms | 1 / 14.918 ms |
| Overview | 2 / 28.882 ms | 1 / 14.209 ms |
| Customers task group | 5 / 71.994 ms | 1 / 14.458 ms |

This is a bounded routing microbenchmark, **not** total browser frame time,
full renderer latency, balance acceptance or a substitute for real play. Full
campaign/plan hashes were unchanged. A separate 1,000-search static-help run
took about 76 ms total; it likewise excludes browser painting.

Frozen checkpoint 5 remains live at exec session `12012` in its unchanged
`ca0bf16` worktree. It has passed through the earlier onboarding failure,
the new fifth-checkpoint UI suites and V3.1 boundaries, and is running the long
funded-circulation scenarios. Do not equate progress with a finished gate or
restart this quiet live run. Remaining editor safeguards, adjacent forecasts,
connected workflows, recovery/presentation, manual and all final publication
requirements remain in scope; no whole batch is signed off.
