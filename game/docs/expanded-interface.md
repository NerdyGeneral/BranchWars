# Expanded interface: control ownership and evidence

September 27, 2026 · local implementation candidate

The current [business consolidation](expanded-consolidation.md) adds versioned
Expanded 9.36 economics on top of this interface: campaigns/sponsorships,
central digital setup, modern recovery and holding-company capital orders.
Business services now has three canonical service records and searchable client
lists; household pursuits reach Deposits. The map shows physical-office counts,
construction separately, and one selected-market Build here action. Strategy's
legacy initiative tab is absent in new campaigns. Earlier evidence below remains
specific to its preceding UI-only builds; current receipts live in release status.

The later map/expansion/ticker follow-up restores original map art inside the
canonical Markets inspector, adds the Summary score graph and cosmetic ticker,
and keeps unopened subsidiaries behind their actual launch preparation.
Trust is a locked future placeholder. Bank securities offers belong in Treasury;
they do not require an owned brokerage. The follow-up evidence (local-only: `game/reports/local/map-expansions-ticker-20260927/README.md`)
and current release-status entry identify that newer artifact. The full-rebuild
receipts in the historical evidence section below retain their original hash.

The subsequent research shortcut follow-up restores +$50k and Stage max beside
the custom contribution and links Operating models to its capability's research.
Both shortcuts explicitly stage engine-bounded funding in the shared draft.
See shortcut evidence (local-only: `game/reports/local/research-shortcuts-20260927/README.md`)
and release status for that artifact's verification.

This document maps the implemented interface to its source and verification.
It is not a second release ledger. [Release status](release-status.md) owns final
build identities and gate receipts; the [player guide](player-guide.md) explains
play, and [architecture](architecture.md) defines maintainer contracts.

The original UI rebuild changed presentation on the then-current Core 8.20 and
Expanded 9.35 engines without introducing a campaign marker or parallel monthly
plan. The later business consolidation described above adds explicit 9.36 rules;
existing saves and rematches still keep their own rules. The [expanded research
outline](expanded-research-outline.md) remains a proposal, not new playable
content.

## Canonical homes

| Home and views | Editable subjects and authority | Entry and return |
| --- | --- | --- |
| This month: Summary, Executive decision, Announcement, Events | Executive choice and optional cosmetic announcement use the existing draft fields. Summary and recorded events are read-only. | Default entry; warning links open their responsible editor with a contextual return. |
| Markets: selected market and office | Build/improve a market; office staff time, maintenance/hub support, renovation, conversion, commercial suite and shared service spaces. Existing project, lifecycle and premises quotes govern eligibility and cost. | Map/directory selection preserves the market heading. Build here stays in the inspector. Compare offices is secondary. Local customers, campaigns and employers link to their real homes. |
| Banking: Deposits | Actual product terms, delivery/licensing, local sales, base policy, term funding, household retention, offers and applications. Protected contracts remain protected. | Product links select the actual product and appropriate editor, rather than a general policy page. Reports expose billed costs and flows separately. |
| Banking: Lending | Production portfolio, underwriting, collections, purchased customer books, loan opportunities and enabled company-credit offers. Existing loans retain their terms. | View portfolio opens the portfolio; credit-work and local-capacity links carry context to People or Markets. |
| Banking: Business services | Payroll, Merchant services and Corporate treasury; service setup, pricing, shared delivery and searchable clients. Existing customer work and shared time constrain new business. | Company or local opportunity links select the corresponding agreement/offer. Household opportunities go to Deposits; company ownership remains in Group. |
| Banking: Treasury | Liquidity/capital policy, eligible emergency board capital and enabled monetary-policy investment/rate controls. | This month's benchmark link opens Treasury. Scenarios are inspection until an explicit plan action. |
| People: Staff, Recruitment, Training, Work coverage, Leadership | Bank allocations and hiring, qualifications, training, function coverage/vendors, existing leader and delegation limits. Employer selection also reaches agency/investment staff and maintained permissions. | Context includes employer, role or function. Local office/room time stays in Markets; staffing links return to the originating subject. |
| Strategy: Research, Operating models, Campaigns, Initiatives, Mandates | Existing paid research, available specialization choices, recurring advertising, competitive action, strategic projects and existing management mandates. | Market campaigns start as working target choices. Research links reach the actual banking delivery/application; construction and subsidiary projects retain their canonical homes. |
| Financial Group: Parent & bank, Insurance agency, Investment business, Companies | Parent capital instructions, business formation/operations, investments and company ownership/control. Each retains its actual cash, qualification and permission restrictions. | Employer staffing links open People with agency/investment context, sharing the same working form. Public company information does not reveal rival orders. |

Only capabilities already enabled in a saved campaign appear. An older Expanded
save can use the interface without acquiring new research, loans, subsidiaries,
rooms or monetary-policy mechanics. Core keeps its retained interface and
original workspace controls.

## Supporting destinations

**Review month** is the single plan review and submission home. It shows spending
room from the engine quote, changed instructions, blockers, warnings and unstaged
working edits. Edit opens the responsible subject. Remove restores that changed
field's opening monthly value; ongoing obligations are not silently cancelled.
Ready and Recall retain the existing submission/transport handlers. Both
institutions must be ready before resolution.

**Reports** is read-only: Income & earnings, Standing & plan forecast, Spending &
commitments, Financial position, History, Portfolios, Deposit statements, Lending
income & principal, Markets & offices, Operating capacity, Financial Group and
Rival intelligence. It uses recorded engine reports and existing quote/read-model
APIs, not UI-created accounting. Principal is not income, client assets are not
bank spending cash, and missing history is Unavailable rather than an invented
zero. Its management links open canonical editors.

**Save & help** exposes the existing campaign export, connection recovery, exit
and reference guide. This rebuild does not add a financial CSV/PDF export.
Campaign JSON export and owner/host permissions retain their existing meaning.

## Working forms and shared resources

Ordinary selectors and action choices are visible in a focused inspector;
routine work does not require nested accordions. Detailed diagnostic/history
disclosures may remain. Tables scroll within their own area on narrow screens.

There is one authoritative monthly `draft`. An editor's unfinished values are
owner-local presentation state, including invalid text that still needs repair.
Navigation is not Add, Discard or submission. Dirty fields survive ordinary
navigation and same-month guest refreshes; untouched fields can rebase from the
latest draft. Quotes are refreshed before a valid Add/Update patches the owned
paths into that latest draft. The agency and investment business share working
forms with their People editors, so staffing and business/funding changes do not
overwrite each other.

Working forms are not new save fields. They are scoped to the current owner,
campaign and month; they are not promised to survive a browser restart. Action
callbacks reject stale owners, cycles, connections and routes, and submitted or
finished campaigns. Contextual Return restores the subject/location, not an old
copy of the plan.

Payroll headcount remains whole employees. An allocation such as one full month
plus 75% of another is staff time. Existing quarter-month units remain engine
units; the UI does not round them into fictional hires or invent individual
bank employee records. Office work, teaching, retained service, shared functions
and subsidiary premises still consume their existing finite qualified pools.

## Source and test map

All paths below are relative to `game/`. Source order is registered in
`src/manifest.json`; `BRANCH_WARS.html` remains generated output.

| Responsibility | Source | Focused regression suite |
| --- | --- | --- |
| Shell, header, month, return routing, review, utilities and Core fallback | `src/ui/interface-shell.js`, `interface-plan.js`, `dashboard.js`, `draft.js`, `workspace-navigation.js`, `workspace-ownership.js`, `state.js`; `src/styles/interface-shell.css` | `tests/interface_shell.test.js` |
| Market/office inspectors, target retention, finite staff and premises | `src/ui/interface-markets.js` with existing project/lifecycle/premises quote helpers; `src/styles/interface-markets.css` | `tests/interface_markets.test.js` and `interface_markets_harness.js` |
| Banking, subsidiaries, ownership and employer working forms | `src/ui/interface-banking-group.js`; `src/styles/interface-banking-group.css` | `tests/interface_banking_group.test.js` |
| People, Strategy and read-only Reports | `src/ui/interface-people-strategy.js`, existing workforce/department/management and advertising helpers; `src/styles/interface-people-strategy.css` | `tests/interface_people_strategy.test.js` |

The principal hooks are `renderExpandedInterface`, `renderInterfaceMarkets`,
`renderInterfaceBanking`, `renderInterfaceGroup`, `renderInterfacePeopleStrategy` and
`renderInterfaceEmployerPeople`. `openInterfaceWorkspace` selects an ordinary
route; `interfaceNavigate` records a contextual return. `interfaceCurrentRoute`
and presentation/session tokens protect callbacks. Pending-editor hooks supply
the unstaged-work warnings in Review month. These APIs route presentation;
engine authorization, normalization, costing, projection and settlement remain
the only economic authority.

Legacy renderer fixtures that explicitly pin `expandedInterfaceEnabled` false
still test supported old DOM paths. They are labelled compatibility regression,
not acceptance of the rebuilt Expanded interface. This includes the standalone
regional-growth dashboard fixture, whose minimal world is a mutation sentinel,
not a complete save. Its existing timing, feature-off, escaping, no-randomness
and no-draft/world-mutation assertions remain intact.

## Evidence and remaining acceptance

The final playable portable used for the receipts below has SHA-256
`4fa6e7c4190033ddf2801017921c6973b45af6c5a11a55a3718ec3f71ffe4f7e`.
The complete 300-command fast gate passed across all 16 canonical shards
(315 invocations with repeated build checks). Every terminal receipt confirms
identical source-input and portable hashes. The verification summary (local-only: `game/reports/local/interface-rebuild-20260927/verification-summary.json`)
records complete command coverage and checks the final current fingerprint.
[Release status](release-status.md) retains the build identity and limits.
This does not claim the separate full release/calibration gate passed.

The four focused controller suites cover 54 cases across the shell, Markets,
Banking/Group and People/Strategy/Reports, including 20 People/Strategy cases.
They exercise explicit staging, scoped removal, invalid input, dirty-form
retention, finite work, quote/budget guards, owner/connection/route fences and
read-only reports. Source and portable runs are separate commands. These VM/DOM
fixtures do not themselves prove layout, native launching or human usability.

The final isolated Chromium receipts are in the ignored developer folder
`reports/local/interface-rebuild-20260927/`. Each browser receipt below identifies
the same portable hash and reports success with no browser page errors:

| Receipt | Verified scope |
| --- | --- |
| Main browser (local-only: `game/reports/local/interface-rebuild-20260927/browser/receipt.json`) | 30 routed views, 59 layout checks and 29 screenshots. Actual setup, announcement working-text retention and explicit staging, once-only publication, three UI-submitted resolved months, campaign export/import and retained Core startup. |
| Focused workflows (local-only: `game/reports/local/interface-rebuild-20260927/browser-workflows-portable/receipt.json`) | Five flows, six check groups and ten screenshots. Actual deposit pricing, People recruitment, research, office staffing/construction, scoped Review Edit/Remove, employer funding/staffing continuity and the hotseat privacy transition. Agency funding uses an engine-generated earned-dividend fixture. |
| Keyboard and focus (local-only: `game/reports/local/interface-rebuild-20260927/browser/keyboard-focus-receipt.json`) | 45 keyboard/geometry checks at 1366, 1024 and 480 pixels. Enter opens selected inspectors; forward/reverse Tab stays unobscured; narrow Back returns to the record list; long-name headers and sticky-header clearance are measured. Includes CSS 125% focus stress. |
| Mature campaign (local-only: `game/reports/local/interface-rebuild-20260927/mature/browser-receipt.json`) | 24 checks and six screenshots after actual UI import of a validated month-13 fixture. Three operating offices, a completed service room, funded operating subsidiaries, seven retained investment clients, paid research progress and non-default pricing. Valid room time requires explicit Update, excessive time is refused, Review/navigation retain edits, employer Return retains the room, and before/after UI exports preserve the settled campaign. |

The main layout run samples 1920×1080, 1366×768, 1024×768 and 480×900. Its
reported page widths match the viewports, and sampled routine routes have no
nested accordions. The mature run also checks the narrow Group client inspector
without page-width overflow. Screenshots accompany both sets of receipts.

The mature campaign is explicitly synthetic and funded: $3M in labelled external
parent capital, followed by $1.5M of bank capitalization through the existing
accounting API. Offices, the room, permissions and client relationships then
arise through 12 controlled engine settlements, with ledger, pilot, migration
and both-owner projection validation. It demonstrates mature UI paths, not
ordinary-opening balance or AI strategy. The mature evidence notes (local-only: `game/reports/local/interface-rebuild-20260927/mature/README.md`)
record those limits and the earlier correctly refused underfunded-tenant case.

These runs load the portable with Chromium `page.setContent`, use in-memory
browser storage and block network requests. Actual campaign JSON import/export
and download paths are exercised, but native double-click launch, durable
localStorage after restart and file-origin behavior are not established. CSS
125% stress is not native browser zoom. Keyboard/focus behavior has automated
browser coverage; human keyboard comfort and screen-reader acceptance remain
separate. Diagnostic exports and screenshots are local evidence, not release
package contents.

Remaining acceptance includes native launch/save/Continue after restart,
native browser zoom, physical
two-computer submission/disconnect/recovery and human assessment of clarity,
accessibility and economics. Mature editing and automated keyboard checks now
have the bounded evidence above. Publication remains a separate action.
