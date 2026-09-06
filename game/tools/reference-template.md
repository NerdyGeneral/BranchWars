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
| `specialistHires` | Workforce preview: additional hires by specialty. Generalists and specialists together may not exceed six. |
| `householdPolicy` | Household ownership preview: recurring retention time share and relative service priorities for Everyday, Connected and Reserve households. |
| `workforcePolicy` | Workforce preview: persistent department training ceilings and protected cash reserve. |
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
16. **Workforce development, capability investment and hiring** — paid specialist training matures, capability money lands, and new bankers arrive. Their benefits apply next month.
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

**Specialist workforce preview (N-05, save v8.5)** — optional for new customer
relationships campaigns; older campaigns keep their existing workforce rules.
Specialists are included in total headcount and share the six-recruit monthly
limit with generalists. Recruitment pays the normal combined-headcount fee plus
the premiums below. New recruits arrive after operations, at skill 20.

<!--{{SPECIALISTS}}-->

Only qualified staff assigned to their specialty add effective capacity:
`min(qualified, assigned) × (0.10 + 0.003 × skill)`. Business expertise is split
between reserved service delivery and sales, never counted twice. Salaries add
the listed premium to normal base pay; efficiency discounts do not reduce
specialist premiums.

Each department has a recurring training ceiling. A whole skill point costs
$1,000 per existing specialist; at most four points per month, up to skill 100.
Paid training improves skills for the following month, before new recruits
dilute the department average. A bank-wide cash reserve and capital limit protect
ordinary operating losses and later recruiting/research commitments: when the
combined training bill is unaffordable, all departments pause together.
Training is an operating expense, not a second fee or an event-multiplied benefit.
The Workforce tab shows forecast spend, capacity and realized costs; events,
project completions and rival actions can still change the final result.

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

### Expanded commercial services (separate preview option)

The next service slice connects dedicated commercial delivery capacity,
cross-capability deployments, and differentiated renewable mandates.

<!--{{SERVICE_DESK}}-->

Research applications appear in Strategy. Activation, staffing and renewal
prices are managed in Markets > Commercial Service Desk, rather than adding
another set of controls to Operations. Setup prices/work above are base values;
the existing project efficiency and shared execution rules still apply.

Each reserved Business banker supplies two service points but leaves ordinary
commercial production and opportunity acquisition; payroll remains payable.
Outsourcing supplies up to four additional points at $6K each per turn, used or
not. Contracts are serviced by earliest renewal, then stable ID. An unsupported
contract earns no fee but retains direct service expense. Two missed service
turns bring its next contest forward to the following cycle.

Payroll Automation requires Network + Operations tier one. While active, it
adds two payroll bid-strength points and reduces each payroll mandate's direct
servicing cost by $1.5K. Built treasury requires Commercial + Digital tier one;
the partner route needs only Commercial tier one and trades lower setup cost
for higher upkeep. Both unlock treasury bids only when active and adequately
staffed. A later build replaces a partner; an inactive application has no
platform subscription expense.

Standing price choices apply only at award/renewal: relationship pricing cuts
fees 20% for +2 bid strength; standard has no adjustment; premium adds 25% for
−2 strength. Signed fees remain fixed for the term. Incumbents defend
automatically unless declined at renewal. Challengers spend their relationship
pursuit instead of selecting an ordinary opportunity. Outside providers still
compete. Awards earn from the next turn and never create deposit/loan balances.

Select **Expanded commercial services preview** at setup to enable the new-game
flag `serviceExpansionVersion:1`. It is unchecked by default because campaign
pacing has not passed acceptance. The normal Regional Rivalry option retains
the prior service rules. Previous campaigns and rematches retain their old
rules. Multiplayer requires updated clients (pilot protocol 11).
Open **Delivery Comparison & Plan Resilience** in Markets to compare fully
staffed delivery mixes for the signed book or a hypothetical new mandate.
Estimates use the actual operating preview, include banker opportunity cost
in the current cycle, and leave signed fees and ownership untouched. Applying
a mix stages only staffing/outsourcing; it does not place a bid or activate a
platform. Bid capacity is paid now; an awarded mandate earns next turn.

The resilience readout subtracts funding-sale losses and all discretionary
commitments from projected operating profit, then compares equity with a 10% current-exposure reserve plus
$200K. This is advisory, not a new player restriction or a guaranteed forecast.
The preview AI now reevaluates reversible policies under stress and reapplies
that cautious reserve after all department plans. Existing fees, principal,
regulatory thresholds and failure timing are unchanged.

If an event or rival action invalidates a queued initiative before it starts,
the expanded preview reports the cancellation in the turn results. A cancelled
start charges no project cost; it must be selected again in a later plan.

See [service planning status](../docs/archive/service-planning-status.md) for the latest tests
and limits; [the earlier expansion report](../docs/archive/service-expansion-status.md) records
the previous batch and remaining blueprint work.

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
combination. See release-status.md for current evidence and limits.

Generated source excerpts elsewhere in this reference show base function
definitions. Versioned pilot overrides can change their behavior; the pilot
status documents and tests describe those additional rules.
# Living institution preview (opt-in)

## Relationship operations extension

New Living institution campaigns use management rules v2. Each client keeps
12 public monthly service records. An incumbent earns +0.25 bid strength per
consecutive serviced month, capped at +2; a missed month or provider change
resets it. This adds to existing bid drivers, not a guaranteed renewal.
Outside-provider service quality is unknown, not automatically recorded as failure.

AI renewal quotes compare discounted, standard and premium fees using a bounded
strength-based heuristic. It sees its own bank and public contract information,
not sealed rival plans. The heuristic is not a calibrated win probability.
Quotes affect renewal only; fees on signed terms remain unchanged.

Markets includes client dossiers and Department Workload & Delivery Economics.
The scorecard distinguishes operational service capacity from executive project
capacity and shows desk net before shared payroll. Bank profit already includes
desk economics. Realized and draft values cover different periods, not forecast
error. No invented department-level profit allocation is made.

Living institution saves now use format 8.2, which older importers reject.
Loading an earlier v1 Living institution save preserves its mechanics and stamps
the safer format when saved again; it does not add relationship histories.
New relationship games require an additional relationship-capability handshake.

New campaigns can additionally enable Living institution. Six named anchor
clients attach price, internal-service or controls preferences to the existing
renewable mandates. They are not yet simulated corporate balance sheets or
separate deposit/loan customers. No ownership stake grants a contract.

Strategy > Recurring Research & Service Manager holds persistent draft mandates.
Research uses a total monthly cap, ordered priorities, per-capability tier
targets, a minimum cash reserve and the planning advisory capital reserve.
Amounts round down to $1K; completed targets receive no further automatic funds.
Unused budget remains cash. Manual draft commitments are never removed.

The service manager compares fully supported delivery of the signed book,
bounded by reserved staff, vendor points and a sales-staff floor. It can prefer
current bank profit or fewer vendors. It does not hire, activate applications,
reprice or bid. If constraints are infeasible, it reports an exception and keeps
the current mix. Explicit bids pause delivery automation. All suggestions are
visible and editable before turn lock; no manager runs on sealed human plans.

Mandates remain private and save with the campaign. Older games do not acquire
this new rules flag. Linked hosts require the management capability handshake
from both builds; protocol 11 remains unchanged for older pilot campaigns.

## Customer needs preview

An additional opt-in preview adds local prospect-flow composition: everyday
households, digitally active customers and reserve savers. It requires Living
institution relationship rules. Existing saves keep their original behavior.

Markets > Customer Needs & Product Fit compares all six districts. The shares
describe monthly prospect demand, not an additional population or segment
ownership ledger. Composition responds to the macro demand/rate regime.
Essential Banking, Rewards Checking and High-Yield Savings have different fit;
retail/digital offices improve their matching channel. Fit is not win probability.

Reach-weighted fit changes organic acquisition and poor fit reduces local
approachable quotas. Finite outside supply and branch capacity still constrain
growth. New account balances split by sales emphasis times local suitability;
closed offers get no new allocation. Signed/locked existing terms are unchanged.

Organic inflows actually acquired incur onboarding expense of $1.50/$2.50/$1.00
per $1,000 for everyday/digital/reserve demand, weighted by attracted mix.
This is included once in bank operating profit, separately from recurring
servicing and platform costs. Draft and latest actual totals are displayed.
The AI compares eligible offer mixes using operating profit and a bounded
franchise-growth preference; this is not a guarantee of optimal decisions.

New saves use format 8.3; older builds reject them. Linked peers must advertise
customer-demand support. Segment-owned books, explicit income/employment,
cross-selling and specialist department staffing remain later work.

## Persistent customer relationships

New Customer needs campaigns use demand rules 2 and save format 8.4. Existing
demand-rules-1 saves keep their mechanics. The new layer tracks service goodwill
by need and market on a 0–100 scale, starting at neutral 50. This is not a new
customer-count or ownership ledger.

Retail staffing and legacy training support the customer workload. The local
existing deposit-product book determines fit for each need; changing sales mix
does not instantly change existing-book goodwill. Local service upgrades help.
Understaffing erodes quality, sustained service can rebuild it, and empty books
drift toward neutral. Demand-weighted goodwill adds at most +/-1.5 local deposit
pull through existing funded/capped competition and outside-bank defenses.

Markets > Customer Relationships shows current quality, a draft trend holding
the existing book fixed, the formula, and current competitive effect. Actual
growth or portfolio changes may differ from that trend. Rival internal quality
is private. New linked games require customer-demand capability 2; older clients
refuse the 8.4 save format. Department specialization and segment-owned books are
still future work.

### Service workforce planning

Goodwill campaigns now have Markets > Service Workforce Planner. The current
draft and six one-banker reallocations are compared through the operating engine:
after-growth service coverage, bank profit after funding-sale losses, net deposit
and loan growth, and focus-market goodwill pull. Moving bankers conserves staff
and payroll; the planner protects commercial-service reservations, sales capacity
for an explicit service bid and existing/planned execution loads.

Stage allocation changes only the draft. Recruitment is separate: it quotes
incremental recruiting cost and future base payroll, respects hiring/cash/capital
limits, and grants no current-turn staff. Review the next turn's allocation after
recruits arrive. Previews exclude events, rival actions, opportunities and project
completions. The comparison is calculated only while the panel is open.

This original staffing planner does not itself change saved rules. Specialist
workforce and household ownership are separate opt-in previews. See roadmap.md
for the remaining package-level work.

### Household ownership and retention — v8.6 preview

Requires Specialist workforce and its prerequisites. Existing campaigns keep
their saved rules. The public market pools and the two private bank books track
exact household counts for Everyday, Connected and Reserve segments; each
segment is conserved across all four owners in every market. Ordinary intake,
departures, raids and book acquisitions transfer actual existing households.
Organic intake favors the bank's open-product suitability, capped to available
segment counts. Changing an offer never relabels the existing customer book.

Customers has the recurring mandate, local ownership and a workload drilldown.
Retention reserves 25/50/75/100% of effective Retail staff; the remainder supports
banker-led acquisition. Existing office sales reach remains. Legacy training
adds 0.3 retention capacity per level. Priorities 0–3 weight that finite capacity
by segment workload; at least one priority must be positive. A specialist's
effective time is split once, not credited in full to both retention and sales.

<!--{{HOUSEHOLD_WORKLOAD}}-->

Workload is count / 900 times the segment factor. A retail office reduces local
Everyday demand by 10%; a digital office reduces Connected demand by 20%. Each
local service upgrade reduces demand by 10% (two-level existing cap). Priorities
allocate proportionally to weighted demand; over-service is not auto-reassigned.
Goodwill uses the same coverage bands and existing-local-product fit thresholds
as the prior rules, but owned segment counts now weight the bank's deposit pull.
The separate flat goodwill bonus from local upgrades is replaced by workload
relief; an empty segment drifts toward neutral 50.

Before monthly maturities and production, goodwill below 45 produces a departure
rate of min(1.5%, (45 - goodwill) / 2000), floored to whole households. Coverage
at least 100% cuts that rate by 60%, not instantly to zero. Departures go to
community banks and credit unions in a 3:2 split and reopen finite prospects.
The bank's local-average deposit estimate leaves with them, capped to unlocked
funding. Deposits remain **pooled by market**, not genuinely segment-owned or
person-owned financial accounts. Locked term balances remain in place.

Cash and deposit liabilities fall together: outflows are not operating expense.
Necessary funding sales can realize losses; those appear separately and are
included in forecast funding-loss totals. Reports and the causal ledger record
actual departures/outflows. Private priorities and goodwill are not exposed in
rival views or rival last plans. The AI selects the lowest retention share that
covers 105% of current aggregate workload, or 100% if none can; it does not yet
optimize segment priorities or fully solve staffing recovery. Delayed loan
delinquency, collections, household incomes and cross-selling remain ahead.
