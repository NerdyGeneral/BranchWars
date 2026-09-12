# Feature register

A measured inventory of every catalogued item in the game: what exists, whether a UI
path can show it, and whether play ever reaches it.

Built against `BRANCH_WARS.html` at engine digest `42cdfc3f`, Group 8
(`financialGroupVersion: 8`), difficulty `chairman`.

**Method.** Content tables are enumerated from the assembled engine in a `vm` sandbox,
so the register reflects what ships, not what the source appears to declare.
Reachability is measured over **6 campaigns** — `balanced`, `growth`, `rate` x 2 seeds,
60 cycles, both seats driven by `chooseBot` — recording every content key the run
touches. Six campaigns is the project's minimum for any claim about magnitude; single
campaigns are used only to locate mechanisms.

## What exists

30 tables, **200 catalogued entries**.

| table | entries |
|---|---|
| `PROJECTS` | 33 |
| `EVENTS` | 26 |
| `CAMPAIGN_FEATURES` | 24 |
| `MANDATES` | 8 |
| `COMPETITIVE_ACTIONS` | 8 |
| `MILESTONES` | 6 |
| `OPPORTUNITY_TYPES` | 6 |
| `REGIONAL_MARKETS` | 6 |
| `ANCHOR_CLIENTS` | 6 |
| `STRATEGY_BRANCHES` / `STRATEGY_SPECIALIZATIONS` / `CAPABILITY_TIERS` | 5 each |
| `DOCTRINES` / `MACRO_REGIMES` / `CAPITAL_TIERS` | 5 each |
| `SCENARIOS` / `SCOPES` / `SPECIALIST_ROLES` | 4 each |
| `CUSTOMER_SEGMENTS`, `DEPOSIT_POLICIES`, `LENDING_POLICIES`, `CAPITAL_POLICIES`, `SERVICE_TYPES`, `AGENCY_PRODUCTS`, `PRODUCT_PORTFOLIOS`, `COLLECTION_APPROACHES`, `SERVICE_APPLICATIONS`, `CREDIT_TERMS`, `DEPARTMENT_LEADERS` | 3 each |
| `RETAIL_DEPLOYMENTS` | 2 |

`CAMPAIGN_FEATURES` holds **24** entries, not the 23 quoted in earlier working notes.

Endings are not a table. Only **3** distinct `endReason` values exist in the whole
engine — `receivership`, `domination`, `buyout` — assigned at 4 sites in
`competition.js` and `accounting-adapter.js`. Any earlier count of "24 endings" was
wrong.

## Can the UI show it?

**Yes, for all 24 content tables** — every one is read by at least one UI path, so no
table is dark. Verified per table against all 37 UI modules plus `page.html`.

A per-*key* source grep is the wrong instrument here and its result was discarded: it
reported 78 of 118 keys "undisclosed", but most content is rendered dynamically from the
view (for example `$('#eventName').textContent = v.event.name`), so a key legitimately
never appears in UI source. Per-key visibility needs DOM-level checking against a
rendered workspace, which Phase 3 does.

## Reachability

6 campaigns, 288 cycles, both seats driven by `chooseBot`.

| table | reached / total | never reached |
|---|---|---|
| `EVENTS` | **26 / 26** | — |
| `OPPORTUNITY_TYPES` offered | 6 / 6 | — |
| `OPPORTUNITY_TYPES` pursued | 6 / 6 | — |
| `MACRO_REGIMES` | 5 / 5 | — |
| `DEPOSIT_POLICIES` / `LENDING_POLICIES` / `CAPITAL_POLICIES` | 3 / 3 each | — |
| `COMPETITIVE_ACTIONS` | 6 / 8 | `liquidityDefense`, `takeoverDefense` |
| `DOCTRINES` | 3 / 5 | `digital`, `people` |
| `CREDIT_TERMS` | 2 / 3 | `consumer` |
| `MANDATES` achieved | 4 / 8 | `earnings`, `people`, `digital`, `network` |
| `MILESTONES` | 2 / 6 | `scale`, `builder`, `trusted`, `digital` |
| **`PROJECTS` started** | **5 / 33** | 28 types, including every branch model and every upgrade |
| **`CAPITAL_TIERS`** | **1 / 5** | `watch`, `consent`, `critical`, `failing` |
| **endings** | **0 / 3** | `receivership`, `domination`, `buyout` |

Strategy branches never pass **level 2**; 4 of 5 specialization branches are chosen.

Three findings stand out:

1. **No campaign ever ends.** None of the 3 terminal conditions fires in 48 cycles.
2. **The bank is always `strong`.** It never enters `watch`, `consent`, `critical` or
   `failing`, so the whole distress and receivership path — including
   `RECEIVERSHIP_CYCLES` and the capital-request board action — is unexercised.
3. **28 of 33 project types are never built.**

**Caveat, and it matters.** Both seats are AI. The AI is independently known not to
build or buy upgrades, so the `PROJECTS` and `CAPITAL_TIERS` rows are a ceiling on *AI*
play, not proof about human play — a human who builds reaches more of them, and a
reckless human could reach the distress tiers. The endings row is less contaminated:
terminal conditions depend on board state, not only on one seat's spending. Treat rows 1
and 3 as "needs a human-play or scripted-play run to confirm", which Phase 2 should do
before deleting anything.

## Layout

Measured in a real browser at 1280x720, 900x720 and 700x720; the repo's own
`tools/measure_navigation.js` stubs `offsetHeight`, so it cannot see layout.

**Chrome before content** (top of viewport to bottom of the workspace nav):

| viewport | command bar ends | nav ends |
|---|---|---|
| 1280x720 | 70px | **149px** |
| 900x720 | 209px | **319px** |
| 700x720 | 209px | **398px** |

The command bar triples in height once it wraps below ~1050px, so the narrow-viewport
chrome cost is 319-398px of a 720px screen. Recorded for Phase 3; the earlier
700px -> 247px pass measured the shell at one width only.

### How to measure overlap here, and how not to

**`getBoundingClientRect()` is not evidence of an overlap.** A closed `<details>` keeps
reporting geometry for its content: measured live, the command bar's collapsed "More
figures" grid reports a **419px** box, `display:grid`, `contentVisibility:visible` — and
is **not painted and not hit-testable**. Chrome hides it by an internal mechanism that
none of those properties reveal.

An overlap claim needs **hit-testing**: `document.elementsFromPoint(x,y)` at a point
proven to be inside both the element's rect and the viewport, with an opened control as
a positive control. Two traps caught real errors here: the page may be **scrolled** (the
rect's `top` went negative and every probe silently returned `[]`), and a probe point
clamped to the viewport can fall outside the element.

A rect-based pass over the collapsed disclosure produced "25-28 overlapping elements at
three viewports" and a commit. Hit-testing then showed the content was never painted and
never intercepted a click: the boxes were phantom geometry and the commit was reverted
(`e5d6392`, reverted by `a0ca595`). **No visible overlap has been found yet.**

The useful instrument for Phase 3 is narrower and actionable: for each interactive
control, is it hit-testable at its own centre? If not, something really does cover it.
**It must skip any control inside a closed `<details>`** — those have rects but are not
painted, and including them produces large false counts (49 on `markets`, 18 on
`strategy`, both dropping to 0 once excluded).

### Result: no visible overlap reproduced

Covered-control sweep, Group 8 Expanded at 1024x768, whole-page scroll at each
workspace, closed disclosures excluded, with an opened control as positive control:

| workspace | probes | covered controls |
|---|---|---|
| `overview` | 71 | 0 |
| `credit` | 59 | 0 |
| `group` | 44 | 0 |
| `markets` | 85 | 0 |
| `operations` | 58 | 0 |
| `strategy` | 74 | 0 |

Horizontal overflow is negative at every workspace (no page-level overflow). The sticky
workspace nav (`position:sticky`, `top:8px`, `z-index:18`) covers **0** controls at any
scroll offset.

So a reported overlap at the top of the screen is **not reproduced** by any instrument
tried: rect intersection (phantom), covered controls, sticky-nav coverage, or horizontal
overflow. Remaining untested: the other 5 workspaces, window sizes other than 1024x768
and the three measured above, and later campaign cycles. This needs a concrete pointer —
which screen, what it looks like, and the window size — before more guessing.

### Setup and workspace availability — no defect

All **11 workspaces are reachable** once Expanded is enabled: `overview`, `credit`,
`group`, `markets`, `customers`, `products`, `operations`, `workforce`, `strategy`,
`competition`, `intelligence`.

An earlier reading of "6 of 11 reachable" was a harness error, not a defect. The
Core/Expanded buttons sit inside a collapsed `<details>`, so a click driven by
coordinates never reaches them and the feature selection silently stays off. Driven
correctly — open the disclosure, click **Expanded rules**, confirm the dialog — it
enables **14 systems** and lists **22 affected** in the confirmation.

`availableWorkspaces` (`ui/workspace-navigation.js:17`) gates 5 tabs on a player book
existing: `credit`→`creditPerformance`, `group`→`financialGroup`,
`customers`→`householdBook`, `products`→`productPrograms`, `workforce`→`workforce`. All
are present under Group 8, so the gate behaves.
