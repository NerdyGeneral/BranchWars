# Architecture and development

This is the maintainer guide, not another implementation timeline. Use the [implementation ledger](v3-usability.md) for completion, [release status](release-status.md) for verified build identity and [archived technical contracts](archive/architecture-history-2026-09-13.md) for version-specific design/evidence.

## Source of truth

Credit's owner-only `departmentCreditPreview` delegates to the existing prepared
department/customer owner and operating forecast. UI must not infer origination
staff by subtracting collections from headcount: other shared work and teaching
also consume time. This read model is neither saved nor added to network views.

Edit `src/`. The ordered [manifest](../src/manifest.json) defines assembly inputs; their current count and verified artifact identity belong in [release status](release-status.md#which-version-am-i-looking-at). The standalone `BRANCH_WARS.html` is generated; the normal playable copy intentionally trails development source. Do not overwrite it or freeze a new reference merely to make freshness checks pass.

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

New Expanded creation selects9.27; old campaigns retain their saved scalars. The [premises rival planner](../src/engine/shared-premises-strategy.js) consumes owner-visible demand and the pure shared quote, never a human draft or rival private books. It reserves finite qualified time and protected operating funds. The coordinator calls it only under the saved premises marker, after other AI operating choices; it does not introduce manager authority to submit or acquire.

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
arrears and funded liquidation to actual company trading. Only the assessment
is called by the company inspector. The lending functions are **not installed into campaign settlement**;
do not attach their output to an existing save or treat domain tests as a working
company-lending feature. There is no new campaign marker or automatic upgrade yet.

The pending adapter must share actual lending capacity, protected capital and
qualified work; reconcile company cash/debt with bank loan principal and interest;
exclude named obligations from duplicate generic amortization/interest; preserve
ownership through asset transfers and bank/company failure; and correctly handle
company cash located in operating deposits. It must integrate consolidation,
pure previews, AI, saved-version validation and peer capability checks before
enabling a funding action. The original outside-creditor book must not keep a
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
existing campaign imports reject version7 rather than silently adopting it.

[CompanyCreditBank](../src/engine/company-credit-bank.js) now applies paired
credit-only postings to bank/local ledgers and maintains a borrower-reconciled
owner claim projection. Ordinary cohorts exclude these claims; generic funding
sales and bulk acquisitions cannot remove them. Department workload and facility
scenario capital include their exposure. The projection is still refused in
campaign saves/views pending complete versioned orchestration. The pending
coordinator must also reserve origination work, settle operating-deposit cash,
report already-posted income/losses once, and support the final ownership and
preview acceptance cases before exposing orders.

[Company-credit orders](../src/engine/company-credit-orders.js) provides the
prepared qualification/capital/cash/work review and a pure two-bank funding
stage. It shares `loanProductionCapacity` with ordinary operations. Successful
funding returns paired world/player books and transient origination reservations;
the monthly coordinator must adopt them atomically and retain the reservation
through ordinary production. The current stage guard prevents duplicate calls
on its returned state, but is not a persisted recovery contract. Do not expose
the funding function or serialize its transient fields before the versioned
coordinator is complete. Borrower-only forecasts must not require or fabricate
private rival bank books.

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

Reference builds, legacy fixtures, rollback releases, failure reproductions and user saves are evidence, not disposable clutter. Their names may be loaded by tests. Any cleanup requires a dependency check and separate authority for destructive changes.

- [Archived architecture/version contracts](archive/architecture-history-2026-09-13.md)
- [Earlier architecture and branch-recovery history](archive/architecture-pre-stabilization-2026-09-07.md)
- [Approved master objective](expanded-edition-goal.md)
