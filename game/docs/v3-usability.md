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
- Fresh baseline fast gate running against the unchanged original tree; its log
  is in that same private baseline directory. Result not yet accepted.
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
| 01 | Unified People & Operations overview | 2 | Pending |
| 02 | Headcount allocation distinct from work coverage | 2 | Pending |
| 03 | Shared staff/time reservation explanation | 2 | Pending |
| 04 | Understandable staff units with exact detail | 2 | Pending |
| 05 | Consequence-first staffing shortages | 2 | Pending |
| 06 | Compare shortage remedies and displaced work | 2 | Pending |
| 07 | Unified generalist/specialist recruitment | 2 | Pending |
| 08 | Staffing arrival/availability timeline | 2 | Pending |
| 09 | Training costs, benefits and timing | 2 | Pending |
| 10 | Training pauses and effective budget limits | 2 | Pending |
| 11 | Readable leader cards and replacement consequences | 2 | Pending |
| 12 | Readable bounded delegation proposals | 2 | Pending |
| 13 | Task-oriented grouped navigation | 3 | Pending |
| 14 | Attention inbox and healthy-system status | 3 | Pending |
| 15 | All submission blockers with direct links | 1 | Partial: independent readiness/quote blockers and links implemented; deeper per-subsystem validator enumeration remains |
| 16 | Required decisions separated from opportunities | 1 | Implemented initial review; `usability_plan_review.test.js`, early/mature browser; final integration gate open |
| 17 | Consistent current/form/staged/active lifecycle | 1 | Partial: review legend and retained unstaged Workforce status; cross-editor standardization remains |
| 18 | Monthly changes drawer with cost/timing/dependencies | 1 | Pending |
| 19 | Scoped undo and unfinished-form protection | 1 | Partial: Leadership/functions raw fields retained and explicit discard tested; plan-level undo and remaining editors pending |
| 20 | Contextual navigation and search | 3 | Pending |
| 21 | Retained screen context and appropriate scroll/focus | 1 | Partial: fresh entry/Continue opens Overview at top; remaining per-workspace context pending |
| 22 | Precise financial measure names | 3 | Pending |
| 23 | Cash-to-spendable-room explanation | 3 | Pending |
| 24 | Decision-adjacent forecast comparisons | 3 | Pending |
| 25 | Consistent forecast scope and timing | 3 | Pending |
| 26 | Metric causes / why changed | 3 | Pending |
| 27 | Intentional numerical precision | 3 | Pending |
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
| 46 | Compact persistent interface elements | 5 | Pending |
| 47 | Readable hierarchy and constraints | 5 | Pending |
| 48 | Table sorting/filtering/header/scroll usability | 5 | Pending |
| 49 | Consistent keyboard, labels and focus | 5 | Pending |
| 50 | Presentation detail levels independent of rules | 5 | Pending |
| 51 | Grouped causal monthly debrief | 5 | Pending |
| 52 | Supported trends and actual campaign history | 5 | Pending |
| 53 | Informational watchlists and personal priorities | 5 | Pending |
| 54 | Measured mature-campaign responsiveness | 5 | Pending |
| 55 | Contextual help and restrained visual polish | 5 | Pending |

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

The original baseline fast gate is still running in execution session `43117`
against the preserved original tree. Revalidate that handle or inspect the
baseline log/process before starting another baseline run; do not infer a stop
from a quiet log. No finished baseline result is claimed yet.
