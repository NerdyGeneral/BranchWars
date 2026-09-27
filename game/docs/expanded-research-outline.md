# Expanded research overhaul — full design outline

September 26, 2026 · Proposal for the next Expanded milestone

This is a design outline, not an implemented feature or a calibrated balance
specification. The current playable baseline is Expanded 9.35 with Federal Funds.
The proposed research rules would apply to new Expanded campaigns. Core and
existing saved campaigns retain their rules.

## 1. Player outcome

Research should let the player build a recognizable kind of bank: a local
relationship bank, a digital lender, a commercial specialist, an efficient
regional network, an acquisition-focused group, or a diversified institution.

Every purchase must answer four questions:

1. What will the bank become able to do?
2. What changes in the actual operating model?
3. What cash, staff time, implementation work and ongoing expense does it require?
4. Under what circumstances will that choice help, hurt, or provide no benefit?

The desired depth comes from different paths, combinations and implementation
choices. Basic banking remains viable without completing the entire tree.

## 2. What exists, and what needs to change

The current [catalogue](../src/content/catalog.js) gives Expanded five research
families, four sequential milestones per family and two operating models each.
Core's [research programme](../src/engine/research-program.js) adds Risk & Capital,
third operating models, combined capabilities and product gates. The
[feature registry](../src/engine/features.js) explicitly restricts that programme
to Core.

Expanded already has paid product development, licensed alternatives, commercial
service platforms, staffing requirements, recurring research mandates and actual
customer adoption. The [research workspace](../src/ui/strategy-workspace.js)
already exposes parts of this lifecycle. Preserve these working systems.

Port the useful structure and concepts from Core, then attach each effect to
Expanded's own simulation. Core's programme also changes lending deployment,
relationship growth and whole-bank multipliers; enabling those formulas directly
would risk duplicating Expanded's existing economics. Its one-time customer
grants are also unsuitable as a substitute for Expanded's finite market supply.

The initial audit must trace each existing milestone, specialization, project
discount and application to its actual calculation. A description that promises
a benefit is not evidence that the benefit is currently delivered.

## 3. Three distinct layers

| Layer | What the player acquires | Persistence and tradeoffs |
| --- | --- | --- |
| Research | Permanent knowledge or an operational capability | Completed research stays learned. Compatible research stacks. Some capabilities improve an existing process directly; others unlock implementation. |
| Operating model | A selected way of running one part of the bank | One model per family, with named benefits and costs. Other families remain active. A later switch requires a paid, timed transition. |
| Implementation | A working platform, procedure or service deployment | Uses cash and the existing shared delivery capacity. Benefits depend on activation, eligible activity and any required servicing or upkeep. |

Not every small improvement needs a separate project. Direct process improvements
can activate after research completes. New platforms, material organizational
changes and product launches need implementation. The node must say which case
applies before the player spends money.

Learning a capability never creates customer balances, loan principal, investment
assets, equity or guaranteed earnings. Those still require real activity and
funding. Basic statements, risk warnings and the existing Fed comparison desk
remain available without buying research.

## 4. Tree structure and target size

Proposed complete target: **eight families, six research nodes per family**,
with **eight combinations between families**. That is 48 individual research
nodes and eight combined capabilities, delivered in stages. Operating models
are choices within those families, not additional research currencies.

Each family has this shape:

```text
                    Foundation (F)
                    /            \
              Path A1            Path B1
                 |                  |
              Path A2            Path B2
                    \            /
                     Capstone (X)
```

- F unlocks both paths.
- A2 requires A1; B2 requires B1.
- X requires either advanced node, plus a relevant completed deployment or
  demonstrated operating requirement specified on that capstone.
- Both paths can be learned. Choosing one first is a budget and timing decision.
- A combination may require nodes from two families. It does not require buying
  every node in either family.
- An operating model becomes available after F and at least one first-path node.
- Basic operations and existing entry-level products remain available before
  specialization. Optional group businesses remain optional.

The names and effects below are proposed content. A node enters the playable
catalogue only when its effect has a real engine consumer and can be demonstrated.
Do not pad the first delivery with disabled promises or several copies of one
percentage bonus.

## 5. The eight research families

### N. Network & Markets

Purpose: make office location, service design and expansion strategy matter.

| Node | Proposed capability and operating effect |
| --- | --- |
| F — Market Planning | Improve the effectiveness of eligible local acquisition work against actual available demand; show the limiting office and staff capacity. |
| A1 — Local Service Design | Improve household service throughput at supported office types, using their assigned staff time. |
| A2 — Relationship Retention | Reduce avoidable customer loss when local service commitments are met. Poor prices and unserved customers still matter. |
| B1 — Hub Network Planning | Improve coordination among eligible offices in an existing market network; publish which locations qualify. |
| B2 — Standard Office Rollout | Reduce eligible construction or conversion implementation work. Pay the remaining cash cost and respect the minimum completion time. |
| X — Integrated Network | Enable a paid rollout of the selected network model across chosen offices, with location-level readiness and results. |

Operating models: **Local Service**, **Regional Hubs**, **Selective Footprint**.
Their tradeoffs concern service intensity, fixed costs, coordination and reach.
None automatically grants another market or creates customers.

### D. Digital Systems

Purpose: improve actual onboarding, servicing and decision workflows.

| Node | Proposed capability and operating effect |
| --- | --- |
| F — Digital Architecture | Establish the shared technical foundation for internal product and workflow implementations. Improve a named existing administrative workload. |
| A1 — Self-Service Onboarding | Increase eligible application-processing capacity; actual adoption still depends on product terms, demand and service readiness. |
| A2 — Omnichannel Servicing | Allow supported customer work to move between digital and physical service capacity without counting the same staff twice. |
| B1 — Workflow Automation | Reduce manual work for explicitly supported, deployed workflows. Platform upkeep and exception handling remain. |
| B2 — Validated Credit Analytics | Improve new-loan screening under the selected credit policy, with model maintenance and review costs. It does not rewrite old loans. |
| X — Integrated Digital Bank | Coordinate the selected digital delivery model across deployed channels and eligible offices. |

Operating models: **Customer Experience**, **Automation**, **Credit Analytics**.
Customer growth, expense control and credit quality compete for implementation
attention and recurring support resources.

### C. Commercial Banking

Purpose: deepen real business relationships and the services they use.

| Node | Proposed capability and operating effect |
| --- | --- |
| F — Relationship Planning | Improve qualified matching between existing customer needs and products; preserve sales and onboarding work. |
| A1 — Cash-Management Design | Improve delivery of operating-account and treasury relationships; retain distinct deposits, fees and service expenses. |
| A2 — Payments Integration | Support more efficient merchant, payroll and treasury workflows once the relevant platforms are deployed. |
| B1 — Sector Underwriting | Improve new commercial-loan evaluation in selected existing sectors, with specialist capacity and concentration tradeoffs. |
| B2 — Relationship Pricing | Enable coordinated offers across eligible new or renewing business services, with an explicit margin-versus-retention comparison. |
| X — Corporate Service Delivery | Coordinate a broader service package for suitable existing opportunities, backed by actual staff, funding and client acceptance. |

Operating models: **Relationship Banking**, **Treasury & Payments**,
**Credit-Led Relationships**. More services require more capacity; a business
relationship does not automatically become a loan or a fee-paying contract.

### O. Operations & Delivery

Purpose: make a growing bank manageable while keeping shared staff finite.

| Node | Proposed capability and operating effect |
| --- | --- |
| F — Process Mapping | Reduce a named administrative workload and expose the affected operations in the quote. |
| A1 — Service Queue Design | Improve allocation of available capacity to customer commitments, within the player's priorities. |
| A2 — Standardized Delivery | Improve throughput for eligible implementation work; execution capacity, departmental work and office staffing remain distinct constraints. |
| B1 — Operational Controls | Reduce modeled operational errors or remediation work where those events and costs exist. |
| B2 — Continuity Planning | Improve recovery from modeled disruptions, at an ongoing readiness cost. |
| X — Scalable Operations | Deploy the chosen operating model across eligible departments, preserving their budgets and service obligations. |

Operating models: **Lean Delivery**, **Resilient Operations**, **Delivery Capacity**.
Lower cost, spare capacity and resilience have different price tags. An efficient
employee remains one employee; the UI reports work capacity separately from
whole-person headcount.

### A. Acquisitions & Integration

Purpose: make existing acquisition mechanics more deliberate and less detached
from the bank that must absorb the acquired business.

| Node | Proposed capability and operating effect |
| --- | --- |
| F — Deal Diligence | Improve the funded due-diligence process for supported deals. Basic deal terms and known liabilities stay visible without research. |
| A1 — Acquisition Valuation | Improve transaction preparation and the estimate of integration commitments; no guaranteed discount or hidden rival-bank disclosure. |
| A2 — Negotiation Preparation | Improve eligible negotiation outcomes within published deal rules and a bounded effect. The seller still has to transact. |
| B1 — Customer Transition | Reduce avoidable customer losses during eligible transfers when transition work is staffed. |
| B2 — Operating Integration | Reduce duplicated operating work or integration duration after actual consolidation. Savings begin when the work is completed. |
| X — Repeatable Acquisition Programme | Permit a standing integration plan within the player's limits; every major acquisition still requires an explicit decision and funding. |

Operating models: **Deal Sourcing**, **Customer Retention**, **Cost Integration**.
List eligible deal types on every effect. Existing book acquisitions and operating
company purchases must not silently acquire identical discounts. Human-bank
shares and outside-bank stakes require their own later ownership system.

### R. Risk & Capital

Purpose: separate risk capability from generic Operations bonuses and make
growth-versus-resilience choices visible.

| Node | Proposed capability and operating effect |
| --- | --- |
| F — Underwriting Standards | Improve qualification of new lending, with a visible effect on approvals, work and expected losses. |
| A1 — Credit Monitoring | Improve servicing and earlier intervention for eligible deteriorating accounts, using actual staff capacity. |
| A2 — Workout Methods | Improve funded collections or restructuring outcomes through the existing recovery system. Losses remain possible. |
| B1 — Portfolio Limits | Enable player-defined concentration and liquidity guardrails with actionable warnings and enforcement. |
| B2 — Capital Planning | Coordinate planned lending, payouts and investment with existing capital requirements; research creates no capital and lowers no mandatory minimum. |
| X — Integrated Risk Controls | Apply the chosen risk model consistently across new lending and eligible ongoing monitoring. |

Operating models: **Conservative Underwriting**, **Balanced Risk**,
**Growth Capacity**. Benefits can include lower expected losses or better use of
resources; costs can include rejected volume, extra review work and larger cash
buffers. Existing fixed loan coupons and historical losses are preserved.

### T. Treasury & Funding

Purpose: connect research to Federal Funds, liquidity and the bank's own
investments.

| Node | Proposed capability and operating effect |
| --- | --- |
| F — Liquidity Procedures | Improve the processing of eligible cash-management work; this requires an explicit workload hook before release. Existing cash and rate reports remain free. |
| A1 — Maturity Ladders | Enable more precise distribution of new fixed purchases across supported maturity dates. Existing securities keep their contracts. |
| A2 — Reinvestment Rules | Coordinate future reinvestment with scheduled maturities and planned funding needs, within cash and capital safeguards. |
| B1 — Funding-Mix Planning | Enable bounded cash-buffer and funding targets, displaying the opportunity cost of holding additional liquidity. |
| B2 — Rate-Response Mandate | Optionally adjust future investment instructions to published conditions within player limits. No access to future Fed draws. |
| X — Asset–Liability Management | Coordinate the permitted funding and reinvestment rules in one paid operational rollout. |

Keep **Liquid**, **Balanced** and **Longer Fixed** as the existing canonical
investment policies. This family extends their implementation; it does not add a
second conflicting treasury-policy selector or gate those three current choices.
Research cannot erase duration losses, rewrite coupons, create liquidity, change
the shared Fed rate or bypass the emergency-funding rules. The first delivery
does not add derivatives, hedging or an interbank lending market.

### G. Group Services

Purpose: improve the investment and insurance-agency businesses already modeled.

| Node | Proposed capability and operating effect |
| --- | --- |
| F — Service Governance | Improve suitable-client and provider workflows with measurable servicing effects and paid oversight. |
| A1 — Investment Servicing | Improve eligible investment-account service capacity; client assets remain client assets. |
| A2 — Portfolio Operations | Improve funded dealing, reconciliation and portfolio-service workflows without manufacturing trades or returns. |
| B1 — Agency Workflow | Improve insurance-agency application handling under actual provider and staff limits. |
| B2 — Renewal Management | Improve staffed renewal and retention work, with commission and servicing costs shown together. |
| X — Group Service Integration | Coordinate eligible shared functions and referrals, preserving entity accounts, occupancy costs and customer identity. |

Operating models: **Investment Focus**, **Agency Focus**, **Diversified Services**.
Use existing businesses rather than adding insurance underwriting. Trust services
can extend this family when their customer assets, duties, fees and operating
costs are implemented.

## 6. Combinations between families

Research prerequisites make these available. The table specifies whether a paid
rollout or an adopted operating procedure is needed. Unlocking a combination
alone does not issue a second generic income multiplier.

| Combined capability | Proposed prerequisites | How it becomes useful |
| --- | --- | --- |
| Digital Treasury Services | C.A2 + D.B1 | Improve the existing internal treasury-platform route. Reuse its deployment and servicing accounts; do not charge for a duplicate platform. |
| Straight-Through Processing | D.B1 + O.A2 | A paid workflow rollout reduces handling work in explicitly eligible queues; remaining staff and funding constraints still bind. |
| Stable Funding Relationships | N.A2 + R.B1 | An adopted relationship procedure reduces avoidable runoff when actual service standards are met. It does not change promised deposit rates. |
| Integrated Office Rollout | N.B2 + A.B2 | Improve eligible new-office or acquired-office implementation; show separate effects for each supported project type. |
| Disciplined Specialist Lending | C.B1 + R.A1 | Deploy underwriting standards for new eligible lending; attach effects to new cohorts, with funding and concentration limits intact. |
| Coordinated Asset–Liability Management | T.A2 + R.B2 | Unlock the advanced target rules used by T.X; fund one implementation, not separate copies of the same programme. |
| Digital Investment Service | G.A2 + D.A2 | Deploy a supported client-service workflow that improves capacity or costs on actual investment accounts. |
| Agency Renewal Operations | G.B2 + O.A1 | Deploy a staffed renewal workflow; earn commissions only from retained or newly accepted business. |

Existing in-house, licensed, outsourced and partner routes remain alternatives
where they already exist. They differ in setup cost, delivery time, support
requirements, recurring fees and control. Research can make an internal route
available without removing a viable licensed route.

## 7. Stacking rules and operating-model changes

1. Compatible completed research remains active. A later node does not erase an
   earlier node's benefit merely because the UI has moved to a new tier.
2. Only one operating model within a family is active at a time. Models from
   different families can combine.
3. A learned capability persists through a model switch. The switch changes only
   the named model effects and eligible applications.
4. Effects act on named components: a specific workload, expense, conversion
   process, runoff term or new-loan parameter. Avoid broad multipliers that also
   discount payroll, interest and vendor royalties unintentionally.
5. Independent percentage effects on the same eligible term multiply in a fixed
   order. For example, a hypothetical 10% and 15% cost reduction leave
   100 × 0.90 × 0.85 = 76.5, a 23.5% total reduction. These are illustrative values,
   not proposed balance numbers.
6. Duplicate routes to the same effect do not stack twice. Each effect has a
   stable identity, eligibility rule and one authoritative consumer.
7. Caps, diminishing returns and minimum work requirements are explicit in the
   quote. Staff cannot perform negative work, expenses cannot become a subsidy,
   and a risk reduction cannot make lending risk-free.
8. Preserve the difference between productivity and headcount, bank income and
   client assets, an estimate and a settled result.

Recommendation: allow paid model changes in the new Expanded rules instead of
permanent lifetime locks. Use a proposed two-to-three-month transition, subject
to pacing tests, with a quoted cash cost and shared implementation requirement.
The old model remains active until completion; the new model replaces it once.
There is no month when both models' benefits apply. Existing customer and funding
contracts remain in force. Before completion, cancellation retains learned
research and any incurred costs, and the old model remains active.

If a deployed platform becomes inactive or loses required coverage, only its
conditional operating benefit stops. Completed knowledge remains, and existing
customer-servicing duties, vendor liabilities and contract promises still need
to be handled explicitly.

The interface should show an effect breakdown such as:
**Base workload → completed research → operating model → deployed platform →
capacity limit → effective workload**. If the bank cannot use an upgrade yet,
say why: no eligible business, missing implementation, insufficient coverage,
inactive platform or an already-reached limit.

## 8. Funding, pacing and monthly timing

- Keep cash-funded research and persistent partial progress. Use ordinary bank
  accounting; research spending is an expense under the existing treatment.
- Add node-level funding priorities and targets. Retain one monthly research
  budget, a cash reserve and existing capital safeguards.
- Start with a suggested queue of two active research nodes. Treat this as a
  manageable default; any hard concurrency limit must reflect actual delivery
  capacity and be visible, rather than an unexplained restriction.
- Manual funding and recurring funding share the same budget and target book.
  Stop exactly at a target; keep excess cash in the bank. Avoid paying twice or
  silently diverting money into a different branch.
- Partial research can be paused and resumed. Spent money is not refunded.
  Unspent staged instructions can be removed before Ready.
- Use existing employees and delivery systems for implementation and organizational
  changes. Do not add a mandatory Research department or allow one employee's
  time to fund two simultaneous roles.
- Standing mandates can prepare proposals within explicit limits. They cannot
  independently switch models, acquire companies, borrow or submit the turn.

Recommended timing rule: all research funding settles with the monthly plan;
newly completed capabilities become available in the next planning month. A
deployment that requires newly completed research cannot begin in the same
settlement. Implementation benefits likewise start in the next planning month
after completion. Quotes must distinguish this month's effects from future ones.

Pacing targets for calibration, not promises: a first useful capability in roughly
2–4 months, a recognizable specialization in 6–12 months, and substantial advanced
combinations over 18–36 months. Test these against actual available capital and
ordinary earnings. Final costs, work requirements and percentages are intentionally
left for the effect audit and funded campaign trials, rather than copied from Core.

## 9. Interface outline

Use the game's existing colors, typography and compact panels.

**Research overview:** a small budget strip, active research/implementation queue,
and a flat list of eight families with their current focus and progress. No nested
dropdowns. Do not show all 48 nodes and every model at once.

**Selected family:** its six-node branch diagram and one inline inspector. On a
narrow window, the inspector sits below the selected node. Keep the selected
family visible when inspecting costs, models or applications.

**Selected node inspector:** show purpose, prerequisites, progress, total and
remaining research cost, activation timing, direct effects, implementation needs,
ongoing expense and the current limiting factor. Use simple status labels:
Locked, Available, Funding, Completed. Show deployment status separately.

**Operating model:** show the three choices as visible comparison cards within
the selected family. Benefits, costs and switching terms are shown together.
Treasury uses its existing policy controls and contextual return.

**Actions:** Inspect → Review funding/rollout/model change → Stage in the shared
draft. Cancel returns to the same location without losing unrelated edits.
Current, working, staged and settled states must be distinguishable.

**Contextual links:** a research application opens the actual product terms,
service, lending policy, treasury desk or selected office. Return restores the
research selection and preserves the shared draft. A missing prerequisite should
link to its exact remedy, without moving the player to an unrelated top-level tab.

**Effect evidence:** display the current engine quote and a conditional comparison
when the proposed effect can be calculated. After deployment, report actual
activity and attributable costs. Do not call a forecast guaranteed profit or
reconstruct an invented earnings history. Basic bank-wide reports remain in
their existing homes.

## 10. Example player journey

A player wants a bank focused on commercial relationships with efficient digital
service.

1. Inspect Commercial Banking and fund Relationship Planning.
2. See the cash cost and next-month availability before staging.
3. Continue through Cash-Management Design and Payments Integration while
   developing Digital Architecture and Workflow Automation.
4. Review Digital Treasury Services: prerequisites are met, but a working platform
   and service capacity are still needed.
5. Compare the existing partner route with an internal build. Pick a funded route
   that fits available delivery capacity.
6. Activate the finished service and compete for a suitable customer mandate.
7. Earn the contract's actual fee while paying staff, provider and platform costs.
8. Inspect the result: research and automation reduce eligible work, but idle
   capacity or a lack of customers can still make the investment unprofitable.

The player's research decisions affect both what the bank can offer and how
efficiently it delivers it. Completing a node alone never awards that contract.

## 11. AI, multiplayer and save compatibility

The AI should pursue a coherent specialization, react to its own bottlenecks and
published conditions, and retain enough liquidity for ordinary operations. It
must value rollout and upkeep costs alongside research cost. It should avoid
funding capabilities it cannot implement or use, and stop recurring expenditure
at achieved targets. It uses the same legal plans and prices as the human.

Keep research allocations, unfinished progress, queued projects and pending model
changes owner-private unless an existing public result legitimately reveals them.
Define the public visibility of completed models explicitly; do not widen the
rival view incidentally. Quotes and inspection never advance RNG or mutate plans.

Create an explicit new Expanded research rule marker and campaign version during
implementation. Do not reuse Core's marker to turn on unrelated Core economics.
Preserve old saves, half-ready restoration, export/import, rematches and deterministic
replay. Rematches retain the selected rules but begin with normal new-campaign
research state. Unsupported peers receive a clear compatibility refusal.

## 12. Implementation sequence

| Phase | Deliverable | Completion evidence |
| --- | --- | --- |
| 0 — Effect audit | Catalogue every current research/model/application effect, its consumer, eligible activity and stacking behavior. Map existing paid routes into the new design. | Traceable effect matrix; confirmed defects separated from misleading descriptions or unused capacity. |
| 1 — Shared research rules | Versioned node progress, dependencies, stacking, funding targets, model transitions and pure quotes. | Small vertical slice with real funding, one deployment, one cross-family combination, saved progress and exact old-campaign replay. |
| 2 — Research workspace | Compact family directory, branch diagram, effect inspector and Review/Stage/Cancel flows in the existing style. | Visible workflow review plus draft-preservation, keyboard, narrow-window and stale-state checks. |
| 3 — Existing bank families | Network, Digital, Commercial, Operations, Acquisitions and Risk; each connected to its actual Expanded consumer. | Every node has a funded usable path and an honest zero-benefit explanation where applicable. Existing platforms are not duplicated. |
| 4 — Treasury and Group Services | Fed-connected treasury procedures and existing investment/agency capabilities. | Contract and accounting reconciliation, client-asset separation, owner privacy and usable operating comparisons. |
| 5 — Strategy trials and stabilization | All applicable combinations, coherent AI strategies, balance calibration and final local build. | Final-build campaign comparisons, complete regression results, save/network tests and separate human playtest findings. |

Recommended first implementation slice: Digital + Commercial with the existing
treasury-service platform. It exercises permanent research, a genuine alternative
delivery route, shared staff, client adoption and actual fee/cost reporting before
the whole catalogue is expanded. It is an internal milestone, not a claim that
the eight-family feature is complete.

## 13. Acceptance criteria

- Every advertised effect reaches its intended calculation exactly once, and the
  player can inspect both its eligibility and effective result.
- Compatible research remains active after later purchases and model changes;
  exclusive model effects do not coexist during transitions.
- No research purchase manufactures customers, principal, capital or guaranteed
  income. Market supply, funding and staff constraints remain authoritative.
- Direct effects, deployment completion and contract changes use the documented
  month boundary. Quotes and actual settlement agree for the same modeled step.
- Partial funding, pause/resume, target stops, blocked projects and cancellation
  have deterministic, resource-safe outcomes.
- A platform lacking customers can lose money; a conservative strategy can
  sacrifice growth; an aggressive strategy can incur losses. No path dominates
  all scenarios simply through stacked global multipliers.
- Basic banking remains viable without optional insurance or investment services.
- Compare ordinary, digital, commercial, acquisition, conservative and treasury
  strategies over multiple seeds and rate environments. Record capital/staffing
  refusals and early endings as outcomes, not completed long campaigns.
- Run compatibility, accounting, forecast, source/build, save and simulated-network
  checks against the final unchanged build. Test research choices during half-ready
  recovery and after reconnects.
- Verify the actual rendered workspace at common window sizes and perform a
  two-player workflow playtest. Automated DOM tests and simulated transports are
  not visual or physical multiplayer acceptance.

## 14. How this connects to the remaining wishlist

Research supplies capabilities for the later features; it does not stand in for
their implementation.

1. **Financial Group forecasts:** consistent tables for insurance, investments and
   eventually trust, using actual revenue, servicing expense, funding and capital.
2. **Trust management and credit cards:** each needs its own customers/contracts,
   servicing, funding or client-asset boundary, income and risk. Add usable research
   nodes when those systems are delivered.
3. **Bank relationships and ownership:** outside-bank stakes, correspondent
   relationships and human-rival shares need an explicit ownership/settlement
   design. Research may improve diligence or integration; it grants no ownership.
4. **Additional markets:** connect market opportunities, demand and office choices
   to the current map inspector. Research can improve how presence develops,
   without making research completion create an entire market or a free office.

The outstanding hands-on Fed-desk playtest and longer balance work remain separate
from this design deliverable. No playable source changes or publication are part
of this outline.
