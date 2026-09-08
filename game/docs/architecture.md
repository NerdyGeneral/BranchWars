# Architecture and development

Current regional development checkpoint, September 8, 2026. This describes implemented
boundaries, not every future blueprint system.

## Source of truth

Edit `src/`. The Group 6 source manifest has 131 ordered assembly inputs; the
preserved Group 5 portable was built from 124.
`tools/build_game.js` produces the standalone `BRANCH_WARS.html`, with no runtime
package dependencies. Never hand-edit the output, frozen engines or releases.

| Layer | Owns | Must not own |
|---|---|---|
| `src/content/` | Authored catalogs and market data | DOM, transport or saved player state |
| `engine/features.js` | Versions, dependencies and compatibility | Checkbox selectors or silent save upgrades |
| Engine domain modules | Rules, quotes, validation and reconciled books | Storage, timers or socket state |
| Engine coordinators | Explicit creation, intent and settlement order | Duplicate domain eligibility/prices |
| `src/ui/` and styles | Rendering, owner-local drafts and confirmation | Unapproved simulation mutations |
| `src/persistence/` | Storage/import and migration entry | Invented resources or changed campaign options |
| `src/network/` | Sessions, ordered delivery, retries and public messages | Financial settlement formulas |
| Windows LAN server | Authenticated relay, sequencing and deduplication | Empty-token access or game settlement |

## Rules and settlement

Transport-only turn authorization lives in `network/peer-codecs.js` and
`network/protocol.js`, not in engine rules. Modern peers exchange a guest
connection nonce and challenged host confirmation. State revisions prevent
rollback within that connection; plan/recall/rematch tokens bind instructions to
the current game/month/resolution. Accepted recall rotates the token. GitHub
commit/reveal retains its seal and gains the same authorization, including safe
identity checks after asynchronous hashing. Reconnect clears transient authority;
pending seals obtain fresh authority without changing plan or nonce. Older peers
retain explicitly supported legacy transport behavior, not modern guarantees.

- `campaign.js`: ordered initialization followed by final version stamping.
- `features.js`: scalar version fields remain authoritative. Missing and zero
  differ; management/customer fields retain multi-version semantics.
- `intent-coordinator.js`: explicit AI sequence using shared eligibility/reserves.
  Human and AI plans both use the normal validator.
- `cycle-coordinator.js` and `operation-coordinator.js`: domain settlement order.
- `accounting.js` / `accounting-adapter.js`: bank journals and legacy-stat bridge.
- `group-accounting.js`, `financial-group.js`, `company-finance.js` and
  `corporate-income.js`: parent capital, lending allocation and finite invoices.
  Receivables are not cash; paired losses reconcile.
- `agency.js`: Group rules 3 / save 9.2 adds a separately funded commercial
  insurance distributor, dedicated staff, renewable company-cover relationships,
  carrier commissions, supplier invoices and ring-fenced wind-down. It does not
  upgrade Group 1/2 campaigns or implement insurance underwriting.
- `ledger.js` and `migration.js`: causal reporting/replay and explicit old-save
  validation without upgrading campaign rules.

Company forecasts require public company statements in the existing corporate
forecast scope. Internal cash-planner helpers cannot run outside that scope.
UI callers use exported public APIs. Test-only helper exposure must not change
function bodies. Forecasts preserve owner/world/RNG state and cannot promise
concealed rival behavior or future economics.

### Commercial agency boundary — partial N-09

The existing opt-in Group selector creates rules 5 / save 9.4 in this working
candidate. Existing rules 1/save 9.0 through 4/save 9.3 retain their boundaries.
Initialization creates the versioned company economy before the agency; the
completed game is stamped afterward. Agency settlement runs once after company
operations and before final group-capital settlement. It uses existing parent
cash, never an expected same-month bank dividend, and reserves committed bank
support before allowing agency investment or standing support.

`agencyEconomy` owns 18 relationships: six stable company identities multiplied
by property, liability and benefits cover. These are independent of banking
mandates and company ownership. Companies pay premiums to a finite carrier book;
the carrier pays the earned commission to the agency. Agency setup, recruitment
and recurring expenses create supplier invoices and paired cash payments.
Dedicated agency employees are not counted again in bank staff allocation.
Parent/agency investments and distributions eliminate in consolidated books;
wind-down pays creditors, returns actual residual cash and recognizes the
unrecovered investment. Fully funded relaunch retains the failure count.

`defaultAgencyPlan`, `normalizeAgencyPlan` and `agencyQuote` are shared by UI/AI.
Policy fields are exactly `launch`, `capital`, `staff`, `target`, `outreach`,
`supportCap` and `dividend`. Launch/investment/distribution are explicit one-month
orders; staffing, targeting, outreach and the default-off support cap persist.
Quotes are pure current-book schedules, not full-company or rival forecasts.
Public snapshots expose company cover owners/remaining terms; subsidiary books,
staff, profitability and sealed instructions remain owner-private.

Group 3 uses presentation-only Capital / Insurance agency / Companies desks in
`ui/financial-group.js` and `ui/agency.js`. Switching desks retains the shared
draft and unstaged form values; render/preview cannot launch or spend. Atomic
staging checks competing group commitments and rejects obsolete owner, month,
campaign, draft or submitted controls. Legacy Group 1/2 layouts are unchanged.

This is a commercial-agency slice, not complete N-09: household distribution,
broader share-of-wallet, selectable carrier contracts, carrier/claim events,
brokerage, wealth and their custody/service/failure obligations remain unfinished.
The carrier book models premium/commission funding, not claims or underwriting.

### Institution boundary — partial N-05

`facility-network.js` is a pure identified-office domain, with prices/accounting
and execution supplied through `facility-adapter.js`. Existing branch/model
arrays are strict derived mirrors, not a second authority. Conversions consume
shared execution before ordinary projects, retain old upkeep and half capacity,
and activate on the following planning month. No import repairs or new offices
are inferred from malformed mirrors. Public views preserve owner-private orders.

`departments.js` owns versioned envelopes, leader identities/history, compensation
and paired supplier claims. Bank accounting v3 adds payables; actual payment
reduces the existing liability and never expenses it twice. Forecasts use private
prepared copies with the same transaction order and no new money. Workforce and
service helpers share paid-training/teaching capacity. UI modules provide collapsed
Network and Departments desks, canonical draft fields and explicit staging.
Group 5 adds `facility-lifecycle.js` (pure condition/staff/maintenance/renovation),
`facility-lifecycle-quotes.js` (shared planning context), `facility-settlement.js`
(paired bank/supplier cash) and `facility-lifecycle-adapter.js` (ordered runtime,
forecasts, AI and privacy). Network schema v1 remains three models for Group 4;
v2 offers seven for Group 5. A wealth office remains blocked until an actual
licensed operating subsidiary exists; agency status never supplies a license.
Maintenance consumes existing protected cash, with no borrowing or fabricated
payable when deferred. Renovation uses remaining execution after conversions,
before ordinary projects; repeated advance never reserves capacity twice.
Quarter-FTE staffing uses actual residual staff after teaching/servicing, not
specialist productivity as extra employees. Hub support transfers finite service
capacity across the authored six-market adjacency. Forecasts use private copies.
The wider department/leadership catalog and licensed wealth operations remain
unfinished; actual Group 5 UI, long-run and release acceptance are separate gates.

Group 6/save 9.5 source adds a separate department-function boundary; it does not
upgrade existing campaigns. `department-functions.js` validates canonical manual
quotas and bounded history; `department-function-context.js` attributes real book
workloads and retained physical time; dispatch and delivery modules split work
once and reconcile actual post-disruption staff. `department-provider.js` posts
paired finite vendor payments. `department-runtime.js` coordinates ordered
settlement, forecasts, owner projection, validation and bounded AI proposals.
The function supplier is `departmentFunctionEconomy`, distinct from the existing
leadership supplier `departmentEconomy`. Owner books and delivery evidence stay
private; no parallel saved feature map is introduced.

Planning has an explicit raw-budget boundary before dispatch, then accounts for
customer-processing expenses and execution displaced by the selected work.
Vendor throughput is never physical headcount or project execution. Any unresolved
staff/cash conflict blocks the draft rather than clearing user orders; forecasts
show an unavailable notice instead of invented zero-cost results. This integration
remains under acceptance testing; the last-passing portable is still Group 5.

## Multiplayer reliability

The host owns the simulation; guests receive owner-filtered views. Lobby changes
publish one revision and clear both readiness flags. Pending edits prevent start.
Fresh capability approval is connection-local, never restored from a checkpoint.

GitHub uses immutable commit/reveal. GitHub and LAN queues snapshot messages;
retry uses the same identity and cannot execute a turn twice. LAN polling is
single-flight, ordered and acknowledged after processing. Obsolete handlers
cannot advance replacement sessions. Malformed JSON/order is a visible failure.
Modern recalls carry their cycle, preventing old recalls cancelling new plans.

The LAN server rejects blank/invalid credentials and malformed envelopes. It is
a trusted-intranet helper, not an internet-facing hardened server. Rooms live in
memory. GitHub health indicates repository reachability, not a live friend.

Large browser saves use the lossless, size-bounded `storage-codec.js` envelope.
It preserves every ledger entry and lives outside the engine: exports and wire
messages remain ordinary campaign JSON. Old raw browser records still load.
GitHub checkpoints use storage version 2 only when compressed; version/marker
mismatches and damaged records are rejected before adoption. The checksum detects
accidental damage, not malicious modification. Unchanged large checkpoint parts
are cached in three bounded slots; no peer capability is restored from storage.
Export before rolling back to an older executable that cannot read this envelope.

## Safe extension checklist

1. Put authored content in its catalog; define explicit version boundaries when
   economics or saved structure change. Keep historical games fixed.
2. Define books, funding sources, ownership, eligibility and invariant checks in
   the domain engine. UI and AI share those quotes, not copied formulas.
3. Wire initialization, normal plan validation, ordered settlement and migration.
4. Deliberately allowlist public versus owner-private projections; reject
   malformed imports and incompatible peers before adopting state.
5. Explain costs, delays and disabled controls; keep one draft across workspaces.
6. Test conservation, exact replay, half-ready resume, pure forecasts, legacy
   fixtures, disabled systems and all three transports.
7. Rebuild portable/manual and verify a clean player package.

Future facilities extend local capacity/projects; products extend cohorts,
pricing/funding/servicing; subsidiaries extend separately funded group books and
customer mandates. The commercial agency is now an operating entity; its presence
does not imply that the broader subsidiary, customer-wallet or group scope is done.

## Commands

From `game/`:

```text
node tools/build_game.js
node tools/build_reference.js
node tools/check.js
node tools/check.js --full
node tests/stabilization_balance.test.js --quick --report
node tests/stabilization_balance.test.js --report
```

The full strategy lab supports `--shard N --shards 4`, N=0..3. Aggregate all
identified-build reports; quick mode is not long-campaign acceptance.
Keep source, test fixtures, generated output and player packages separate.
Never regenerate compatibility fixtures merely to hide drift.

Historical wrapper layers, dense functions and explicit cross-domain coordination
remain bounded debt. Override ceilings prevent adding more wrappers. Further
optimization requires a measured bottleneck and before/after replay proof, not a
framework rewrite. Distinguish engine timing from browser/tool round trips and
concurrent machine load.

See [release evidence](release-status.md), [roadmap](roadmap.md), and
[preserved architecture/refactor/branch-recovery history](archive/architecture-pre-stabilization-2026-09-07.md).
