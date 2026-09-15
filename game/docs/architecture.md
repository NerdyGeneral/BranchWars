# Architecture and development

This is the maintainer guide, not another implementation timeline. Use the [implementation ledger](v3-usability.md) for completion, [release status](release-status.md) for verified build identity and [archived technical contracts](archive/architecture-history-2026-09-13.md) for version-specific design/evidence.

## Source of truth

Current player-facing creation calls `previewCampaignEdition` with
`currentEconomics:true,currentRivalry:true`, selecting Core8.19 or Expanded9.33. It composes the
existing authoritative scalars; the proposal option itself is never saved.
The default API and `currentReporting:true` remain historical/reporting-only
construction paths. Save import, Continue and rematch do not opt into new rules.
Keep edition selection in this engine proposal and DOM behavior in its UI adapter.

`bankRivalryVersion:1` is an explicit new Expanded boundary, not an inferred
upgrade. It requires current Expanded economics and the complete company-credit
profile. `bankRivalrySupported:1` is registry-derived and required from peers.
Initialization, private projection, save/view validation and rematch preserve the
scalar and owner mirror. Automatic score/market bank-control endings are disabled;
receivership, funding-covenant resolution and paid company transactions retain
their existing implementation. Terminal validation must admit both institutional
failure reasons (`receivership` and `funding_resolution`), but never `buyout`.
No new wrapper or override ceiling is introduced. Old9.32 creation, views, RNG,
economics and ending rules remain pinned to the preserved checkpoint68 reference.

`ui/workspace-ownership.js` owns presentation-only subject routing and live DOM
mounts. People owns allocation, Customers owns household/commercial relationships
and applications, Products owns banking policies/programmes, and Markets keeps
local inspectors/actions. Existing nodes and handlers move; no second draft is
created. Core restores original homes. Owner/campaign changes reset transient
selection; the monthly editor may temporarily borrow and return the same node.

New explicit9.31 operating reports add optional finite `incomeSource_*` diagnostic
fields at the source calculation, including actual opening-securities interest.
No money formula, saved rule, peer capability or bounded-history schema changes.
The flat numeric shape preserves the event ledger's numeric-report contract and
is accepted by the prior9.31 reader. Old reports retain missing fields; subsequent
new reports gain detail without reconstructing past balances. `IncomeReview.statement`
validates the complete component shape and reconciliation, separates unknown
residuals, and never posts, reallocates shared costs or treats client assets as income.

Explicit9.31 `creditWorkloadVersion:1` requires serviced income and complete
Expanded company-credit rules. The authoritative campaign scalar and owner
mirror are validated/projected through the existing income-rule lifecycle;
current Expanded setup selects it. Registry-derived peer capabilities require
`creditWorkloadSupported:1`. Rematch retains it; import never adds it.
`CreditWorkload.quote` counts principal plus distinct product/location portfolios
and named-company claims, not ordinary storage rows. Department preparation,
authorization, settlement and forecasts use that same quote. Vintage/arrears
books are never compacted or rewritten by this calculation. Collections remains
a separate exposure-driven task. All prior versions retain their old workloads.

For9.31 investment and product credit scenarios, `prepareCreditScenarioOwner` obtains
authorized Collections/Risk capacity and expertise from shared department
preparation. Only transient work evidence is copied: budget/recurring projections
already include provider cost. `ordinaryCreditOriginations` is shared by product
allocation, facility valuation and department/staffing acceptance. It excludes
named-credit advances, repayments and non-principal writeoffs. The original
frozen-staff/noncredit assumptions remain explicit; old-version valuations retain
their arithmetic. This is a private estimate, not a posting or resource grant.

Credit's owner-only `departmentCreditPreview` delegates to the existing prepared
department/customer owner and operating forecast. UI must not infer origination
staff by subtracting collections from headcount: other shared work and teaching
also consume time. This read model is neither saved nor added to network views.

`IncomeReview` is a pure adapter over the already authorized owner view. It
does not run the economy, change saved fields, post money or reconstruct old
income. Income history uses owner `operations.result` entries plus the current
actual report; principal history uses `trend.meLoans`. Missing calendar months
stay missing, and duplicate cycles do not create extra points. Keep economic
forecasting in `operatingPreview` and presentation in `ui/income-review.js`.
Explicit `incomeHistoryVersion:1` adds the separate `IncomeHistory` contract:
Core8.16 or integrated Expanded9.29, with twelve consecutive completed records
per owner and an opening balance reference. It is not automatically added to
existing saves or historical custom rules. Normal new-game setup selects this
reporting boundary for Core and Expanded, without another checkbox.
Only the post-resolution submit fence appends records; half-ready saves do not.
Rematch initializes empty books, and received owner views reject duplicate,
missing, out-of-order, nonfinite or leaked rival records. The registry supplies
`incomeHistorySupported:1`; these campaigns require a fresh compatible handshake.
Keep the scalar authoritative, not a second feature map. This reporting-only
boundary changes no prices, balances, money flows or AI strategy.
`previewCampaignEdition(source, edition, {currentReporting:true})` is the
player-facing creation proposal. The historical two-argument engine API keeps
its prior defaults for replay and explicit legacy construction. Changing a
historical compatibility control may propose removing an incompatible reporting
marker; this is included in confirmation, never silently applied on import.

Explicit `commercialServiceVersion:1` requires the reporting foundation and
creates Core8.17/Expanded9.30; current editions include these servicing rules.
The campaign scalar is authoritative; its owner mirror is validated on saves
and private views. `commercialRelationshipWork` preserves the original
left-associated offer/business/merchant arithmetic and supplies both dispatch
workloads and fee coverage; keep these consumers on the same calculation.
`CommercialFeeEconomics` bills opening-operation relationship
counts through finite service capacity. Expanded uses its already paid,
dispatched `commercialRelationships` task; Core reserves that work from the same
Business allocation before selling. No additional payroll charge or client book
is created. Existing fee rates remain provisional and unchanged. Current-step
acquisitions begin earning in the following operating step; acquisitions already
activated before operations are in the opening serviced population.
AI may add bounded paid provider capacity only when a pure, current-cash-funded
comparison improves net earnings and preserves other work and funding protections.
Current setup includes the correction through its edition choice, not a new checkbox.

Edit `src/`. The ordered [manifest](../src/manifest.json) defines assembly inputs; their current count and verified artifact identity belong in [release status](release-status.md#which-version-am-i-looking-at). The standalone `BRANCH_WARS.html` is generated and may trail source. Rebuild it deliberately when selecting a local candidate; do not replace frozen release artifacts or regenerate historical golden references merely to make checks pass.

| Layer | Owns | Must not own |
| --- | --- | --- |
| `src/content/` | Authored catalogs and market data | DOM, transport or saved player state |
| [Feature registry](../src/engine/features.js) | Editions, scalar versions, prerequisites and peer capabilities | Checkbox selectors, silent save upgrades |
| Engine domain modules | Pure rules, quotes, validation and reconciled books | Storage, timers or sockets |
| Engine coordinators | Explicit creation, intent and settlement order | Duplicated domain prices/eligibility |
| `src/ui/` and styles | Rendering, owner-local drafts, inspection, confirmation | Financial settlement or unapproved campaign mutations |
| `src/persistence/` | Storage/import and migration entry | Invented resources or changed rules |
| `src/network/` | Sessions, delivery, retries and public messages | Financial formulas |
| Windows LAN server | Authenticated relay, sequencing and deduplication | Game settlement or empty-token access |

## Rules and settlement

- Keep existing scalar version fields authoritative, including missing-versus-zero semantics and multi-version values. Do not add a competing saved feature map.
- New-game selection may propose prerequisite changes. Import/network validation rejects inconsistent rules without silently repairing or downgrading them.
- Preserve ordered initialization, settlement and RNG behavior. Keep intentional new-version behavior separate from behavior-preserving refactors.
- All entry points use the same authoritative plan validation, protected budgets and shared capacity. A rendered quote must not charge money or mutate a campaign.
- Prepare forecasts from the correct owner/draft context. Invalidate derived values when plan, month, campaign, ownership or connection changes.
- `sharedPremisesPlanReview` is the pure owner quote used by office controls and month-end review. It shares authoritative submission validation, protected spending and qualified-time preparation. `ui/shared-premises.js` owns only its local editor and staging; edits are invalidated across connection attempts and undone as one complete space/staff instruction. Planned commercial space and maintenance enter the same quote, not UI-specific formulas.
- Keep bank cash, parent cash, subsidiary funds and client assets distinct. Pair transactions with their actual counterparty; eliminate internal claims/transfers without duplicating income, investments or resources.
- Buildings are not legal entities or permissions. Professional roles are not interchangeable with ordinary bankers.
- Preserve responsibilities of existing domains rather than introducing global function overrides.

### Current extension seam

New Expanded creation selects9.28 from checkpoint65; old campaigns retain their saved scalars. The [premises rival planner](../src/engine/shared-premises-strategy.js) consumes owner-visible demand and the pure shared quote, never a human draft or rival private books. It reserves finite qualified time and protected operating funds. The coordinator calls it only under the saved premises marker, after other AI operating choices; it does not introduce manager authority to submit or acquire.

Explicit9.27 campaigns now use [the premises campaign adapter](../src/engine/shared-premises-campaign.js) for saved owner books, protected planning, sequential payroll/occupancy/service, canonical transfer totals and owner-private projection. Outside payments reuse the facility supplier and its circulation; internal rent is not parent capital. Construction uses remaining actual execution and cannot leave transient fields in saved state. See [checkpoint49](archive/checkpoint49-premises-campaign-2026-09-13.md) for scoped full-turn/transport evidence and [checkpoint50](archive/checkpoint50-premises-office-2026-09-13.md) for the contextual office editor. Older rules do not automatically adopt these paths.

Investment `prepare` / `finish` boundaries allow both subsidiary payrolls before shared occupancy. Existing `advance` composes the same phases; old creation and settlement rules remain unchanged. External-custodian operations may use suites without a custody license. Mandatory occupancy-default closure requires the actual unpaid internal-creditor release entry, not an arbitrary boolean. See [checkpoint48](archive/checkpoint48-shared-occupancy-2026-09-13.md) for ordering evidence; canonical campaign counters were subsequently connected in checkpoint49.

[Shared premises](../src/engine/shared-premises.js) requires identified hosts, condition, qualified residual time, permissions, protected cash and shared execution. Its `investmentDelivery` preparation requotes the rooms and checks reservations against newly prepared investment employees, including education and migration deductions. The explicit9.27 campaign path supplies local delivery through the prepared settlement flow; older callers retain their existing behavior. This is an internal integration contract, not a second saved feature map or permission to change an existing campaign.

Reserved adviser/broker time is removed from central work. Service, acquisition, portfolio orders and notes consume the same local-market balances; unused local time cannot acquire customers in an unrelated market. Portfolio clearing receives copied local budgets and returns their residuals while retaining its simultaneous dealer-cash/inventory limits. Operations remain institution-wide backend work with condition deductions, not a second allocation of staff.

`SharedPremises.agencyDelivery` similarly checks actual agency registration, qualified roles and education time. Local/central pools constrain real policy service and producer acquisition. `prepareAgencySettlement` and `finishAgencySettlement` expose the once-only payroll-before-service interval needed for occupancy integration; the legacy `settleAgency` entry still performs the same original ordered work. Its optional premises path adopts only successful prepared results, so invalid local instructions cannot partially charge payroll or parent funding.

Before invoking an existing subsidiary's outside-creditor wind-down, `SharedPremises.releaseTenant` settles the identified bank-rent claim pro rata with other due payables and extinguishes any remainder on both books. It neither pays the bank claim to the outside supplier nor creates consolidated income. The combined campaign coordinator and complete flow counters/eliminations remain unfinished; do not add internal rent directly to the old supplier-only payable handling.

The existing [commercial suites](../src/engine/facility-extensions.js), facility lifecycle, [commercial accounts](../src/engine/commercial-accounts.js), investment and agency domains remain separate authoritative books. Preserve historical version boundaries and their tests while joining them.

### Named-company credit integration in progress

[CompanyCredit](../src/engine/company-credit.js) currently provides a pure public
statement assessment and a paired borrower/lender accounting domain. The explicit
CompanyFinance version7 domain now connects advances, interest, repayment,
arrears and funded liquidation to actual company trading. Historical inspectors
retain assessment-only behavior; explicit9.28 company inspectors now review and
stage terms through `companyCreditVersion:1` and the shared conditional forecast.
Same-rule AI and monthly ending-stage ownership checks now pass; ordinary Expanded
selects9.28 from checkpoint65, with scoped setup/lobby integration evidence. Do not
attach these books to an existing save or treat scoped tests as release acceptance.

The integration contract requires shared lending capacity, protected capital and
qualified work; reconcile company cash/debt with bank loan principal and interest;
exclude named obligations from duplicate generic amortization/interest; preserve
ownership through asset transfers and bank/company failure; and correctly handle
company cash located in operating deposits. It must integrate consolidation,
pure previews, AI, saved-version validation and peer capability checks before
ordinary Expanded enablement. The original outside-creditor book must not keep a
claim already moved to a player bank. The domain's cash-only funding check is not
a substitute for the full campaign capital and workforce quote.

Version7 retains one canonical credit register in the company world, with a
signed cumulative bank-credit cash boundary; lender books remain external and
are required for settlement. Outside-creditor principal excludes bank loans,
and supplier receivables exclude bank-loan interest. Sales and existing operating,
senior-debt and service obligations settle before bank credit; loan arrears block
dividends. In liquidation, the existing senior creditor is paid first and new
unsecured advances share the remaining funded cash proportionally with supplier
and service-invoice claims. This is a provisional fictional priority rule, not
a statement of insolvency law. Only unpaid bank claims are written off, with
paired borrower release/lender loss. Version2–6 behavior remains preserved;
existing campaign imports reject version7 unless their explicit9.28 marker and
complete company/bank state match; older campaigns never acquire it automatically.

[CompanyCreditBank](../src/engine/company-credit-bank.js) now applies paired
credit-only postings to bank/local ledgers and maintains a borrower-reconciled
owner claim projection. Ordinary cohorts exclude these claims; generic funding
sales and bulk acquisitions cannot remove them. Department workload and facility
scenario capital include their exposure. The projection is still refused in
older campaign saves/views. The9.28 coordinator reserves origination work, settles
operating-deposit cash and reports already-posted income/losses once. Final
ordinary setup/lobby acceptance remains required before the single Expanded
selection exposes this workflow.

[Company-credit orders](../src/engine/company-credit-orders.js) provides the
prepared qualification/capital/cash/work review and a pure two-bank funding
stage. It shares `loanProductionCapacity` with ordinary operations. Successful
funding returns paired world/player books and transient origination reservations;
the monthly coordinator adopts them atomically before ordinary spending and
retains reservations through production. Half-ready recovery stores the sealed
orders, not partially funded settlement. Saved states reject transient fields.
Pure domain results commit into the existing live owner objects, preserving
turn-scoped WeakMap identities (notably product-pricing traces). Borrower-only
forecasts must not require or fabricate private rival bank books.

`companyCreditPlanForecast` reviews the complete draft queue and uses the same
borrower origination/posting step as actual execution. It applies only the owner
ledger to copied public statements, reconciles owned operating-deposit cash and
reserves the shared origination budget before operating forecasts. The comparison
is explicitly conditional on all own offers funding, not knowledge of rival
orders. `operatingPreview` routes queued loans through this calculation; empty
and historical plans retain their prior path. UI edits are local until reviewed
and staged, and owner/month/draft/connection/readiness guards reject stale actions.

`planCompanyCredit` runs after the rival's other planners and obtains the complete
`root.BWEngine.publicState` projection, not the partial internal view. Its pure
review uses the same human quote and conditional forecast, protecting cash and
ordinary origination. It accepts only positive incremental operating earnings,
never principal as income. Its provisional allocation/term/rate choices and the
short ordinary-start limitation are recorded in the [checkpoint64 evidence](archive/checkpoint64-company-credit-rival-2026-09-13.md).

The company-credit borrower settlement now emits lender postings. Actual
execution applies them to required real books; `CompanyFinance.forecast` uses
the same borrower calculation without bank ledgers. `CompanyCreditBank.forecast`
applies only owner postings to an owner copy. The monthly corporate adapter
atomically adopts paired world/player books before ordinary operations; the
operating report bridge explains interest/repayment/losses without reposting
them. Forecasts use the existing public company/market statement shapes and
clear temporary owner state. Explicit creation/save/peer enablement and submitted
orders are tested; customer UI staging, draft-offer forecasts, AI and final
failure/transfer acceptance remain required. New paths never upgrade existing saves.

Early company-credit cash relocation and normal commercial-account closing share
`applyCommercialAccountBalances`. Funding now returns the matching market and
account books as well as world/player books; callers must adopt the complete
result atomically. `_companyCreditAccountOpening` retains original account rows
through early cash movements, and normal closing consumes it for the once-only
monthly report. It is rejected by the saved-state lifecycle boundary, including
when no credit marker is present. Relocation does not run acquisition or servicing.
Owner forecasts need only public company/market statements and their own claims.
Consolidation optionally includes strict internal loan principal/interest in its
existing paired elimination, without changing legacy worksheet output shapes.

## Multiplayer and recovery

- Preserve host authority, lobby revision/readiness and fixed campaign rules.
- Peer capabilities are transient: reconnect/resume requires a fresh session-bound handshake.
- Validate rules before adopting snapshots, first views or restored checkpoints.
- Late, duplicate, stale, malformed and out-of-order messages must not duplicate settlement or reveal private plans.
- Keep credentials out of reports, exports and public state.
- Distinguish drafts, submitted plans, resolved results and persistence checkpoints. Neither UI rendering nor retry may perform a second financial action.

Detailed historical transport and institution contracts remain [archived](archive/architecture-history-2026-09-13.md#multiplayer-reliability); their checkpoint status is not a current release claim.

## Safe extension checklist

1. Preserve dirty contributor work and the exact starting build.
2. Define a coherent player outcome and its resource/accounting invariants.
3. Implement shared domain validation/quotes and explicit settlement hooks.
4. Add owner-safe projections, versioned creation/recovery and peer capability coverage.
5. Put actions beside their objects; show costs, staffing, capacity, timing and consequences before staging.
6. Test positive, boundary, failure, pure-preview and duplicate/recovery cases.
7. Compare supported legacy states against unchanged references. Never regenerate expected values to hide drift.
8. Update the ledger and add indexed evidence. Move forward once the requirement passes.

## Commands

Run from `game/`:

| Command | Purpose / limitation |
| --- | --- |
| `node tools/build_game.js --check` | Check portable/source freshness; a deliberate older playable copy is not a fresh source build. |
| `node tools/build_game.js` | Rebuilds the normal playable HTML. Preserve it first and rebuild only at the intended integration step. |
| `node tests/architecture.test.js` | Checks the normal portable, not arbitrary newer source. |
| `node tests/architecture.test.js --source` | Checks assembled source with scope-aware override detection and unchanged ceilings. |
| `node tests/architecture_scope.test.js` | Checks shadowing, parameters, direct/destructured/API writes and pinned offline parser integrity. |
| `node tests/docs.test.js` | Checks local documentation paths/names; not complete anchor or factual validation. |
| `node tools/check.js` | Fast gate, not full release acceptance. |
| `node tools/check.js --full` | Full required gate; run on the final assembled candidate. |
| `node tools/build_reference.js` | Generates the mechanics reference; don't hand-edit that output. |

See [developer tools](../tools/README.md) for packaging and specialized checks. `tools/architecture_overrides.js` resolves lexical bindings using the pinned, development-only Acorn parser. Separate local declarations and parameter defaults are not engine replacements; actual binding/API writes still count against the unchanged ceiling. Static analysis does not prove the absence of dynamic eval or API-alias mutations. Do not raise ceilings or suppress failures to pass a release. Archive detailed results rather than duplicating them here.

## Preservation and historical contracts

Core8.19 extends the existing scalar to `bankEconomicsVersion:2`, without a
second feature map. It uses AccountingPrototype1 independently of the regional
pilot. Opening composition is recorded in a journal base; saved books are never
backfilled. Core owner/account mirrors are validated on import and projection.
Core AI uses the existing post-spending reserve gate; monthly journals compact
through the same accounting snapshot path. New acquisition/absorption adapters
retain authored nonfinancial effects while posting one backed book transfer.
`coreAccountingSupported:1` is additive: do not raise the older fixed
`bankEconomicsSupported:1` field and accidentally reject valid old peers.

The explicit service-based economics boundary is `bankEconomicsVersion:1`:
Core8.18 requires serviced income; Expanded9.32 additionally requires credit
workload1. The registry owns versions/capabilities; the income-history validation
and projection boundary checks campaign/owner mirrors. No second feature map or
automatic save upgrade is introduced. `bankBasePayroll` is authoritative for
salary, hire quotes, AI affordability, local cost allocation and recruitment UI.
`bankAbstractIncome` preserves the old arithmetic order while disabling only the
five unsupported revenue terms on the explicit new rules. Do not move shared
salary into specialist premiums or treat lower pay as free extra capacity.
The captureddd9c768a reference remains immutable. Core's existing importer can
remove obsolete strategy metadata: recovery tests compare canonical saves without
discarding any balances, orders, RNG or operating results.

Reference builds, legacy fixtures, rollback releases, failure reproductions and user saves are evidence, not disposable clutter. Their names may be loaded by tests. Any cleanup requires a dependency check and separate authority for destructive changes.

- [Archived architecture/version contracts](archive/architecture-history-2026-09-13.md)
- [Earlier architecture and branch-recovery history](archive/architecture-pre-stabilization-2026-09-07.md)
- [Approved master objective](expanded-edition-goal.md)
