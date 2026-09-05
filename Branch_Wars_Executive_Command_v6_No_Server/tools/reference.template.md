# Branch Wars — Game Reference

<!--{{STAMP}}-->

Two banks compete for the same markets. Both write a plan for the month in
secret; both plans resolve at once. There is no turn order and no reactive play
inside a cycle — you commit, and then you find out.

---

## 1. Playing a campaign

### Modes

| Mode | Engine key | How it works |
|---|---|---|
| Solo vs Corporate AI | `ai` | You submit; the bot's plan is generated and the cycle resolves immediately. |
| Pass & Play | `hotseat` | Both plans are sealed on one computer. Neither side sees the other's until both are locked. |
| Intranet Room | `lan` | Room code against the bundled PowerShell server on port 8765. |
| Direct P2P | `p2p` | WebRTC link between two browsers, no server. |
| Repository Link | `repo` | Plays across sites by exchanging state through a shared repository. |

`lan`, `p2p` and `repo` accept plans from a peer, so every plan is validated as
untrusted input. See §9.

### Setup

Campaign scope decides how many markets are in play; the scenario sets the
opening economy. Neither side picks a character or a strategy at setup — those
are consequences of play (§8).

**Scopes**

<!--{{SCOPES}}-->

**Scenarios**

<!--{{SCENARIOS}}-->

**Opening position** — identical for both institutions:

<!--{{OPENING}}-->

Both banks open with one retail branch: seat one in Downtown holding 56/44,
seat two in Northside holding 56/44. The two markets are deliberately worth the
same; when they were not, seat one won 55% of campaigns.

### Campaign arc

Markets unlock over time and the contest sharpens by act.

<!--{{ACTS}}-->

---

## 2. The monthly plan

A plan is one object. Everything in it is optional except a focus market, a
staff allocation covering every banker, and an answer to any executive call.

| Field | Meaning |
|---|---|
| `focus` | The market this month's pricing and outreach concentrate on. |
| `allocation` | Every banker assigned to a role. Must sum exactly to headcount. |
| `depositPolicy` / `lendingPolicy` / `capitalPolicy` | Persist until changed. |
| `products` | Retail, business and credit models. Persist until changed. |
| `decision` | `a` or `b` answer to this month's executive call. |
| `competitiveAction` | One attack or defense, or `none`. |
| `opportunity` | One contested deal to pursue. |
| `newProjects` | Initiatives to start, limited by execution capacity and cash. |
| `hires` | Bankers to recruit this cycle. |
| `investments` | Money into capability lanes, capped per lane per cycle. |
| `specializations` | Operating model per capability lane, permanent once set. |
| `capitalAction` | Emergency board capital request. |

Hiring, building, funding capabilities and running an attack all draw on the
same cash in the same cycle. Nothing is gated behind choosing a path — the
constraint is money and execution capacity, never permission.

---

## 3. How a cycle resolves

Both plans are applied in one deterministic pass. Order matters, so it is listed
exactly as `resolveCycle` runs it.

1. **Commit the plan** — allocation, policies, products and focus are written to each bank.
2. **Executive decision** — the answer to this month's event is applied.
3. **Emergency board capital** — if requested and permitted.
4. **Competitive actions** — attacks and defenses resolve against each other.
5. **Start initiatives** — cost is paid now; work begins.
6. **Operate** — the month's revenue, expenses, credit losses and balance-sheet growth.
7. **Deleverage** — forced shrinkage if the bank is short of capital.
8. **Deposit contest** — the two banks' market pull is compared and deposits move.
9. **Settle funding** — rate-sensitive money reprices and runs off.
10. **Opportunities** — contested deals are won or lost.
11. **Simulate markets** — market share moves.
12. **Market exits** — a bank that cannot hold a market withdraws from it.
13. **Franchise dividends** — income from absorbed franchises.
14. **Advance initiatives** — work in flight progresses, or stalls if capacity was withdrawn.
15. **Consequences** — outages, cyber incidents, compliance and morale effects.
16. **Capability investment** — money lands, tiers unlock, operating models are adopted, character is re-read, then hiring.
17. **Milestones and act change**.
18. **Ending check** — receivership, domination or buyout.

Two ordering facts worth remembering, because both have caused bugs:

- **Capability money lands after the month is operated (16, not 5).** A lane funded
  this cycle affects next cycle, not this one.
- **Hiring lands last.** New bankers report next cycle. Payroll and morale
  dilution start immediately.

---

## 4. Economy

Each Service, Business and Lending banker earns fee income; Operations bankers
earn none and instead buy execution capacity and risk control. Facilities carry
recurring upkeep. Every banker carries payroll.

Revenue and expense are computed in `operate`, which combines fee income,
deposit spread, funding cost, loan income, commercial fee income, wealth and
digital income, then applies an efficiency multiplier to costs.

**Capital ratio** — the number the regulator watches:

<!--{{SRC_capitalRatio}}-->

**Capital tiers**

<!--{{CAPITAL_TIERS}}-->

Three consecutive cycles at the bottom tier ends the campaign in receivership.

**Economic regimes** — the scenario picks a starting regime and it moves during play.

<!--{{REGIMES}}-->

---

## 5. Workforce and execution capacity

Execution capacity is the ceiling on how much initiative work can run at once.
It comes from the executive team, from Operations bankers, and from tiers of the
Operational Excellence lane.

<!--{{SRC_executionCapacity}}-->

Capacity is judged against **the allocation being submitted**, not last month's,
so staffing a second team and using it in the same plan works. Withdraw the
bankers and work in flight stalls rather than continuing — and a stalled
initiative does not consume budget, so a smaller one behind it may still proceed.

<!--{{SRC_advanceProjects}}-->

**Roles**

<!--{{ROLES}}-->

**Recruiting** — cost rises with headcount, and hiring several at once dilutes morale.

<!--{{SRC_hireCost}}-->

---

## 6. Markets

**Deposit pull** decides the contest in each market. It reads the *format* of
what you built, not merely how many branches you have.

<!--{{SRC_depositPull}}-->

The two banks' pull is compared per market; the difference moves deposits, capped
per act. A bank that keeps losing a market eventually exits it permanently.

<!--{{TERRITORIES}}-->

**Contested opportunities** — if both banks chase the same one, the stronger
position wins outright; otherwise it is a probability check.

<!--{{OPPORTUNITIES}}-->

---

## 7. What you can build and fund

### Initiatives

Cost is paid on starting. Both cost and duration are reduced by relevant
capability tiers.

<!--{{PROJECTS}}-->

<!--{{SRC_projectCost}}-->

<!--{{SRC_projectCycles}}-->

**Retired initiatives** — defined only for save compatibility:

<!--{{RETIRED}}-->

### Regional Rivalry pilot initiatives

These exist only under the pilot ruleset (§13) and are refused outright in a
normal campaign. Listed separately because they are costed and described like
ordinary initiatives but a standard game can never build them.

<!--{{PILOT_PROJECTS}}-->

### Capability lanes

Fund any lane, in any order, for as long as you want. There is no primary lane,
no lock at tier two, and no premium for spreading across lanes. Depth costs
money, not permission.

<!--{{CAPABILITIES}}-->

### Competitive actions

One per cycle. Attacks are blunted by the matching defense.

<!--{{ACTIONS}}-->

---

## 8. Institutional character

Character is **read from the bank you built**, not chosen. It is recomputed every
cycle from staffing tilt, capability spending, facility mix, payroll share and
morale, then smoothed so it does not flicker.

<!--{{SRC_doctrineProfile}}-->

<!--{{CHARACTERS}}-->

Two properties are enforced by test and must survive any change here:

- **Reachable** — a player who commits to a playstyle reads as that character.
  All five currently hit 100%.
- **Not a consequence of winning** — a character must not predict the result. If
  a trait is read from a quantity that grows *because* you are winning
  (headcount, cumulative hires), the winner drifts into it late and it appears
  to be the strongest character. Share-of-spend measures survive this; absolute
  totals do not.

That is why people-first is payroll's share of discretionary spend rather than
headcount, and why the threshold sits above what incidental hiring produces.

---

## 9. Plan validation

Peers supply plans over `lan`, `p2p` and `repo`, so plans are untrusted. A plan
is rejected if it allocates staff it does not have or pads the allocation with
unknown roles, commits more cash than the bank holds across all spending
combined, exceeds execution capacity, hires beyond the per-cycle limit, funds a
lane beyond the per-cycle cap or with a negative amount, starts an initiative
that is already running, starts a retired initiative, or names something that
does not exist.

---

## 10. How a campaign ends

There is no cycle limit. A campaign ends one of three ways:

| Ending | Condition |
|---|---|
| **Receivership** | A bank spends three consecutive cycles at critical capital. The survivor absorbs the franchise. |
| **Domination** | Every open market has permanently exited one bank. |
| **Buyout** | A bank holds a takeover position for two consecutive cycles — distressed, settled or regulator-mandated. Shareholder Defense breaks the position for that cycle. |

Buyout ends roughly 97% of bot-vs-bot campaigns.

**Enterprise value** is the running score:

<!--{{SRC_baseScore}}-->

**Mandates** — campaign objectives worth a bonus at the end:

<!--{{MANDATES}}-->

**Milestones** — one-off awards during play:

<!--{{MILESTONES}}-->

---

## 11. Reference data

### Constants

<!--{{CONSTANTS}}-->

### Policies

<!--{{POLICIES}}-->

### Product models

<!--{{PRODUCTS}}-->

### Executive events

<!--{{EVENTS}}-->

---

## 12. Balance reference points

Measured values to compare against after a change. Method and pitfalls are in
`tools/README.md`.

| Property | Expected | How to check |
|---|---|---|
| Seat symmetry | 50% ± 2 SE over 800 campaigns | Opening `baseScore` must be identical for both seats |
| Branch format value | Within ~1.3x per dollar | Paired against building nothing from the same snapshot |
| Capability lane value | Within ~1.3x, order shuffling between runs | Lane funded out of band so it does not compete for cash |
| Character reachability | All five at 100% | Commit to a playstyle, check what it reads as |
| Character causality | No character predicts the result | Sample at cycle 15 and at the end |
| Invariants | Zero violations over 500 campaigns | Shares sum to 100, no negative stats, allocation equals headcount |

Balance numbers here are measured against a bot-driven harness. Bots rarely
diversify, so roughly 92% of bot institutions read as Community Franchise; that
is a limitation of the opponent, not of the character model.

---

## 13. Regional Rivalry pilot

A second, opt-in ruleset that layers over the base game. It is enabled by the
**"Try Regional Rivalry pilot"** checkbox, available for Solo AI, Pass & Play,
and hosting linked games. Over LAN or a direct link both
computers must be running a build that supports it or the connection is refused.

Engine-side it is `createGame({ campaignRulesVersion: 1 })`, which also sets
`regionalEconomyVersion: 1` and gives each bank a `regionalOperations` record.

What changes:

- **Two regions, six markets**, all open from the start, with paid re-entry after
  exiting a market rather than permanent exit.
- **Different accounting** — exposure counts loans plus 20% of securities, and
  funding draws on cash.
- **A capital-safe spending limit** replaces plain uncommitted cash as the budget
  the desk offers. It reserves 8% of current exposure when validating a plan;
  later events, losses, and growth can still reduce the actual capital ratio.
- **Branch upgrades and closure** — improve service or automation in a market you
  already operate in (max 2 each), or pay to consolidate an office and save its
  future running cost. Closing does not generate asset-sale proceeds.
- **Product deployment and service contracts** — deploy a retail product as an
  initiative, or buy bid strength for future service agreements in one market.

The 2026-09-05 release audit completed 1,735 current-pilot turns across all four
economy scenarios with reconciled accounts and no silently skipped planned
initiatives. Dedicated tests also exercise paid advertising and product rollout.
An earlier draft reported silent starts for these projects; that claim was not
reproduced by these tests and is not a confirmed defect of this release.

The engine still checks legality again at execution time: events and rival
actions can change a bank after planning. Tests cannot rule out every such
combination. See RELEASE_VERIFICATION.md for current evidence and limits.

Generated source excerpts elsewhere in this reference show base function
definitions. Versioned pilot overrides can change their behavior; the pilot
status documents and tests describe those additional rules.
