> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# Commercial services expansion — N-05 / N-07 / N-08

Date: 2026-09-05

Historical report for the first service preview. See
[Service planning and recovery](service-planning-status.md) for the following
batch's current implementation and verification; the evidence below is retained.

## Scope and acceptance

Implemented three connected mechanics, not three completed blueprint packages:
dedicated commercial service capacity, cross-capability applications with
build/partner choices, and differentiated priced renewal contracts.

**This is an opt-in mechanics preview, not a balanced long-campaign release.**
The setup option **Expanded commercial services preview** is unchecked by
default. Selecting it also selects Regional Rivalry. Leaving it off preserves
the prior pilot's service rules. Existing saves and rematches retain their
versioned rules; none are silently converted.

The larger Operations redesign is deferred. New policies live in Markets >
Commercial Service Desk; the new deployments live in Strategy, not in another
Operations card grid.

## 1. Dedicated service capacity — N-05 slice

- Reserve Business bankers for service delivery. Each supplies two service
  points and is removed from ordinary commercial production and ordinary
  opportunity acquisition. Their existing payroll remains payable.
- Purchase zero to four outsourced points at $6K each per turn. This is a
  standing expense, including unused capacity, not a permanent capacity reward.
- The desk displays fees, direct servicing, outsourcing, platform upkeep,
  capacity utilization, and net contribution before shared payroll.
- Contracts are serviced by earliest renewal date, then stable contract ID.
  Unsupported contracts earn no fee but retain direct expenses. Staff losses
  reduce effective reservations; they do not create replacement employees.

This is one operational department with staffing and a bounded vendor budget,
not the complete department/leadership/delegation system.

## 2. Cross-capability applications — N-07 slice

| Application | Completed tier-one prerequisites | Base setup | Base work / execution load | Active upkeep |
| --- | --- | --- | --- | --- |
| Payroll Automation | Network + Operations | $160K | 3 cycles / 2 | $4K per turn |
| Built Corporate Treasury | Commercial + Digital | $220K | 3 cycles / 2 | $6K per turn |
| Partnered Corporate Treasury | Commercial | $60K | 1 cycle / 1 | $18K per turn |

Payroll Automation adds two payroll bid-strength points and reduces each
payroll mandate's direct service expense by $1.5K. Treasury platforms permit
treasury bids only while active, with enough service capacity.

Deployment consumes the existing shared execution queue and capital-safe
spending budget. Ordinary cost/duration efficiencies apply. Research completed
this turn cannot enable a same-turn deployment. Deployment does not create
customers, deposits or fee revenue and does not automatically activate a
previously inactive platform. Activation begins in the next planning cycle.

An internal treasury build may replace a partner platform, reducing subsequent
active upkeep. Competing deployment routes cannot be selected together or run
concurrently. An existing active partner remains active after replacement;
there is no second subscription or same-turn retroactive refund.

This adds useful cross-applications and a partner alternative; it is not the
full capability web, recurring research-order system or all product R&D.

## 3. Priced renewable mandates — N-08 slice

The six existing contests now contain two mandates of each type:

| Mandate | Standard fee / turn | Direct cost / turn | Service load |
| --- | --- | --- | --- |
| Employer Payroll | $18K | $3K | 1 |
| Merchant Settlement | $30K | $6K | 2 |
| Corporate Treasury | $50K | $9K | 3 |

Choose standing renewal prices by type: relationship pricing lowers fees by
20% and adds two bid-strength points; premium pricing raises fees by 25% and
subtracts two points. Standard pricing has no adjustment. Existing signed fees
stay fixed until their next award/renewal; pricing does not rewrite the book.

Normal terms remain six turns. Incumbents defend automatically unless the
player declines a due renewal. A challenger uses its existing relationship
pursuit slot instead of an ordinary opportunity. Outside providers still bid.
Two missed service turns bring the next contest forward to the following
cycle, so poor service creates a real competitive opening.

Awards resolve after operations. The prior provider earns the final term fee;
the next provider begins earning next turn. Fees and expenses enter the
operating/accounting pipeline exactly once. These contracts do not create
deposit or loan balances or transfer company ownership.

Bid strength is explicit in Markets: 5 + unreserved Business staff x1.5 +
reserved staff + up to three local branches x1.5 + Commercial tier +
reputation /40 + price adjustment. A fully serviced incumbent gets +2;
an understaffed incumbent gets -3. Active Payroll Automation adds +2 on
payroll; existing targeted advertising adds +3 locally. Contenders receive
0-4 seeded uncertainty, with outside providers starting at 10. No guaranteed
award or secret AI bonus was added.

AI uses bounded outsourcing before diverting sales staff, avoids idle
speculative reservations and treasury subscriptions, and can fund/build
applications. This remains a heuristic, not a profitability-optimized planner
or proof that different strategies are equally viable.

## Compatibility and UI checks

State flag: serviceExpansionVersion:1, dependent on contractRulesVersion:1.
The owner-only service desk is included in saves and causal ledger snapshots;
public awards disclose provider, price, type, date and missed-service count,
not the rival's sealed staffing/pricing policy. Pilot multiplayer protocol is
11; both clients must update.

Browser QA found all five Strategy lanes populated in the current build, with
research funding persisting across turns. The reported empty tree was not
reproduced; no cause is asserted. A live sequence funded Commercial tier one,
won a discounted payroll mandate, deployed a treasury partnership, resumed
after reload, and activated it with the expected $18K preview expense.

Two local LAN browser clients also completed a turn with the new rules. The
guest left preview selection unchecked at setup and correctly received the
host's enabled rules. Distinct service policies were accepted, both clients
showed identical resolution text, and neither reported warning/error logs.
This is loopback acceptance, not physical two-computer or live GitHub testing.

The pricing disclosure initially collapsed on edits. It now preserves its
open state during plan rerenders. Broad tab layout, brightness, and the larger
research visualization are still deferred.

Deferred UI direction, after the underlying systems stabilize: divide Operations
into Treasury & Funding, People & Departments, Products & Pricing, and Execution
subviews. Keep one shared plan/cash/capacity summary visible so decisions remain
connected without displaying every editor simultaneously. Strategy should show
capability-to-application prerequisites, running deployments and their operating
costs; it should not become another catalogue of disconnected upgrade cards.
This is a proposed layout, not an implemented redesign or a diagnosis of the
reported empty tree.

## Verification and remaining balance gate

Final HTML SHA-256:
`8919743bf146b915c08447af7df74221cbe87ba6ceb9f08156b1f51889291084`.

The [final-source expanded balance audit](../../reports/baselines/release-balance-2026-09-05T06-30-54-734Z.json)
passed 1,236 turns across 16 campaigns. Cash, deposits, loans, equity, emergency
funding, deposit/credit cohorts and regional totals reconciled at every turn.
No selected initiative was silently skipped. Largest public view: 557,382 bytes.

Only four campaigns reached 120 completed turns. Twelve entered receivership
at displayed cycles 37-110. These runs do **not** pass long-campaign pacing or
strategic fairness acceptance. The previous published service-v1 audit had
13 of 16 games reach 120 turns; different random-call paths mean individual
seed comparisons are not controlled causal estimates, but the aggregate
shortening is still a warning worth addressing rather than hiding.

The [preview-off comparison on the same final build](../../reports/baselines/release-balance-2026-09-05T06-45-40-822Z.json)
passed 1,735 reconciled turns, with 13 of 16 campaigns reaching 120 turns.
All 16 recorded outcomes, end cycles, equity, deposit and profit values match
the published service-v1 audit exactly. The preview switch therefore preserves
the previous pilot's simulated economics in this tested scenario/seed set.
It does not establish that either ruleset meets human fun or fairness goals.
Reproduce this comparison with `node tests/release_balance.test.js --previous-services --report`;
omit `--previous-services` to audit the expanded preview.

The [complete final regression run](../../reports/baselines/N-00-2026-09-05T06-43-08-027Z.json)
passed all 26 test invocations, including Windows LAN, GitHub relay recovery,
save/migration integrity, deterministic replay, ledger checks and repeated
current/legacy funding simulations. All fingerprinted source/test files stayed
unchanged during the run, and repeated balance-audit output matched exactly.
The new service suite covered 253 simulated turns and 24 provider changes, plus
targeted capacity, quoted pricing, renewal, deployment, privacy and save tests.
The generated reference check and `git diff --check` also passed.

The earlier full run is retained as failed evidence: three assertions required
updates for the new service-only project category, protocol 11, and the new
setup checkbox's event listener in the mocked DOM. Those tests were repaired,
with a checkbox-behavior assertion added, then passed individually and in the
complete rerun. No game source changed between these two full runs.

These are mechanical/compatibility passes, not strategic-balance approval.

Earlier trial simulations exposed shorter games and poor AI capacity choices.
The wasteful reservations were corrected, but this does not pass the blueprint's
120-200-meaningful-turn target. Institutional failure remains possible, and
the new preview is deliberately not the normal pilot default.

Before graduating the preview: run larger paired-seat strategy trials and
human sessions, compare outsourcing versus internal service economics, improve
AI recovery and contract selection, and check whether the added commitments
produce interesting recovery decisions rather than just earlier failure.

## Current blueprint position / next work

- N-00-N-02: foundations and regression gates remain active.
- N-03-N-04: persistent two-region rivalry and finite market books exist;
  human recovery acceptance and richer local customer segments remain.
- N-05: facility economics plus this service department exist; broader budgets,
  specialist functions, leaders, training and delegation remain.
- N-06: deposit/loan cohorts, offer lifecycle and deployments exist; delayed
  delinquency, richer customer segmentation and treasury asset choices remain.
- N-07: open research plus these cross-applications exist; the complete web,
  recurring capped orders and additional business deployments remain.
- N-08: differentiated priced renewals and local advertising exist; named
  firms, acquisition/retention attribution and a fuller campaign funnel remain.
- N-09-N-10: group accounting, insurance agency, brokerage/wealth, company
  equity and deliberate acquisitions remain ahead.
- N-11-N-14: national management/content, integrated UI, human release
  validation and later underwriting remain ahead.

Next connected implementation: segmented customers/contract demand and a
proper service workload model, then recurring research budgets and department
management. Correct the pacing gate before expanding geography or introducing
subsidiaries on top of unstable economics.

The prior published build remains in Git at 8181c2a. This batch has not been
committed, pushed or packaged as a ZIP.
