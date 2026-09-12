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

## Version gates — healthier than assumed

Measured across `src/engine` and `src/ui`: **44 files** carry `.includes(...)` version
gates. Open-ended gates (top at 8) number **136**:

| gate | sites |
|---|---|
| `[6,7,8]` | 40 |
| `[7,8]` | 34 |
| `[5,6,7,8]` | 24 |
| `[3,4,5,6,7,8]` | 11 |
| `[4,5,6,7,8]` | 10 |
| `[2,3,4,5,6,7,8]` | 9 |
| `[1,2,3,4,5,6,7,8]` | 8 |

The apparently risky family is the closed windows that exclude 8 — `[4,5,6,7]` x3,
`[3,4,5,6]` x2, `[4,5]` x1. **All are correct.** Every one is a version-to-book mapping
whose chain handles 8 in an earlier ternary arm, for example
`accounting-adapter.js:194`:

```js
p.accounting.version !== (g.financialGroupVersion===8 ? 4 : [4,5,6,7].includes(...) ? 3 : ...)
```

Same shape at `corporate-income.js:111`, `:127`, `:155` and `financial-group.js:138`.
`monthly.js:55`'s `[4,5]` is a legacy settlement path with its `[6,7,8]` counterpart
directly above. And `ui/lobby.js:9`'s `[1,3,5]` is **hex colour parsing, not a gate** — a
naive array-literal grep produces false positives, so count gates by
`.includes(groupVersion)` rather than by literal shape.

So the debt is not the 136 sites; it is the **pattern**. The mapping from campaign group
to book version is expressed as ternary chains of array literals scattered over 5 files.
Adding a Group 9 means editing every chain, and nothing fails loudly if one is missed —
which is exactly how a gate hid behind a renamed parameter (`groupVersion` rather than
`g.financialGroupVersion`) and survived a grep earlier in this work. **The fix is one
table mapping group version to each book version, consulted everywhere**, not 136 edits.

Earlier working notes cited "153 sites across 37 files"; the measured figures are 136
open-ended sites across 44 gate-carrying files. Use these.

## Commercial deposits and loans — not already solved

Phase 5 assumed `feat/segment-deposits` might hold the design. It does not. That branch
is already an **ancestor** of this one (`8999aa0`), and `segmentDepositsVersion` is among
the 14 systems Expanded enables. What it adds is a `segment` field on deposit cohorts
over `CUSTOMER_SEGMENTS` — `everyday`, `connected`, `reserve` — which are **retail
household segments**. `business` and `merchant` still have no deposit or loan flow: they
feed only `commercialIncome` as `s.business*760 + s.merchant*650`. Commercial operating
balances and commercial borrowing are new work.

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

1. **No campaign ends within 48 months**, and the bank never leaves tier `strong`, so
   the distress path is unexercised at this horizon. Longer-horizon evidence already in
   the repo shows this is rarity, not impossibility — see below before concluding
   anything.
2. **28 of 33 project types are never built.**

### Why no campaign ends, and why the bank is always healthy

These two findings are the same finding. The capital tiers are gated on the capital
ratio:

| tier | min ratio | effect |
|---|---|---|
| `strong` | **8** | no restrictions |
| `watch` | 6 | branch and acquisition projects suspended |
| `consent` | 4 | deposit growth capped, loan book must shrink each cycle |
| `critical` | 2 | all new projects barred |
| `failing` | — | 3 consecutive cycles forces receivership |

The post-spending capital reserve in `pilotSpendingLimit` (`accounting-adapter.js:163`)
uses a buffer of **`.08`** — the same number as the `strong` floor. Any plan that would
take the bank below an 8% ratio is refused, so **the bank is mechanically prevented from
ever leaving `strong`.** Measured ratio never leaves 12.0-14.7%. The AI is stricter
still: `planPilotReserve` uses a `.10` buffer.

Every terminal condition depends on the tiers moving:

- `distress` increments only in tier `failing` (`projects.js`), and `RECEIVERSHIP_CYCLES`
  is 3, so `receivership` needs three consecutive cycles below a 2% ratio.
- `distressedBuyout` requires the target at `consent` or worse (`targetRank>=2`).
- `settledBuyout` and `mandatedAuction` additionally require `settled` — act three plus
  *every* open market exited by someone.
- `domination` requires one player to have exited every unlocked market.

**These are rare, not unreachable — do not read the 0/3 above as "impossible".** The
reserve gates only *discretionary* spending; it does nothing about involuntary erosion
from operating losses, chargeoffs, funding losses and event costs, which is how the bank
actually reaches the distress tiers. `docs/release-status.md` records the project's own
longer-horizon evidence:

| evidence | endings |
|---|---|
| 4 scenarios x 24 months | no early endings |
| 63 short runs to 120 months | **1 receivership, at month 98** |
| 8 long runs to 480 months | none reached a terminal condition |
| one month318 failed-save continuation | receivership at month 461 |

So the honest reading is: **terminal conditions occur at roughly 1 in 63 over 120
months and never in 48**, and no `domination` or `buyout` is recorded anywhere in that
evidence. Campaigns here are open-ended by design (`maxCycles: null`, and long campaigns
are an explicit design goal), so a 48-month sample is a short campaign and this register
row says little about the intended horizon.

What does stand is narrower and still worth knowing: the reserve's buffer and the
`strong` floor are the same 8%, so **no voluntary plan can ever spend the bank out of
`strong`** — every tier transition must come from losses the player did not choose. That
is a design decision to put to the owner rather than a bug: it means the downside of the
game is never something you can walk into, only something that happens to you.

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

**Chrome before content** — top of viewport to the bottom of the workspace nav, in a
running Group 8 Expanded campaign. The masthead correctly hides itself in-game at every
size, so this is command bar plus workspace nav.

| viewport | command bar | nav | chrome total | content left | % chrome |
|---|---|---|---|---|---|
| 1280x720 | 62 | 75 | 149 | 571 | 21% |
| 1024x768 | 108 | 75 | 196 | 572 | 25% |
| 900x720 | **187** | 104 | **319** | 401 | **44%** |
| 700x720 | 187 | **183** | **398** | 322 | **55%** |

**At 700px wide the player sees 322px of content out of 720 — 55% of the screen is
chrome.** Two compounding causes: the command bar wraps below ~1050px and triples
(62 -> 187), and the workspace nav more than doubles (75 -> 183) as its 4-column group
grid drops to 2 columns at <=700px and the destination tabs wrap onto their own rows.

No horizontal overflow at any width. The earlier 700px -> 247px pass measured the shell
at one width only, which is why this went unseen. This is the main Phase 3 target.

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
| `customers` | 53 | 0 |
| `products` | 44 | 0 |
| `operations` | 58 | 0 |
| `workforce` | 42 | 0 |
| `strategy` | 74 | 0 |
| `competition` | 44 | 0 |
| `intelligence` | 22 | 0 |

All **11 of 11** workspaces: zero covered controls.

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
