# Living institution — three connected slices

Historical batch report. For the current follow-on and save-compatibility repair, see [Relationship operations](RELATIONSHIP_OPERATIONS_STATUS.md).
Date: 2026-09-05

## Scope and release status

This batch advances N-04/N-08 anchor relationships, N-07 recurring research,
and N-05 department delegation. It does not complete those blueprint packages.
No national-map, subsidiary, share-trading or broad Operations redesign was added.

Enable **Living institution preview** when opening a new campaign. The checkbox
also enables the Regional Rivalry and expanded-service prerequisites. It remains
unchecked by default. Existing saves are not silently converted.

The preserved pre-batch game is
[planning build](reports/reference-builds/BRANCH_WARS_planning_0704591.html),
SHA-256 0704591cc274b02936521b36c53f1353f44b9d6da55624c104ad897d1f1e1d90.
Unrelated user work, including ARCHITECTURE_PLAN.md, is preserved.

## Slice 1 — differentiated anchor clients

Six existing renewable mandates now have stable named clients and sectors.
Each service has two clients with different preferences, rather than making
every payroll or merchant customer behave identically.

- Price-sensitive firms double the normal discount/premium bid adjustment:
  +4 for relationship pricing, -4 for premium pricing.
- Internal-service firms add +2 when reserved bankers alone cover the whole
  existing book plus the proposed mandate.
- Controls-oriented firms add up to +2 from Operations capability.

Markets shows each preference and the draft-specific adjustment. Existing
uncertainty, outside providers, eligibility, signed fees, costs, renewal timing
and service-failure rules remain. No preference guarantees an award.

These are anchor-service client profiles, NOT a full household/business cohort
model or corporate simulation. Firms do not yet have employees, balance sheets,
growth shocks, multiple separately contested products or tradable equity.
The profiles create no deposits, loans or free ownership.

AI bid scoring includes the client adjustments and it uses the bounded manager,
but its inherited service planner still normally quotes standard prices. This
is not a fully adaptive segment-pricing opponent; paired human/AI testing and
more selective renewal pricing remain necessary.

## Slice 2 — recurring capability budgets

Strategy > Recurring Research & Service Manager provides:
- An enabled/paused standing instruction.
- A total monthly funding cap, not five independent unlimited budgets.
- Editable priority order (move any capability to the front).
- A stop tier for each capability, including do-not-fund.
- A minimum cash balance after explicit commitments.

Draft preparation also respects legal plan affordability, the prior advisory
capital reserve, the per-capability absorption cap and remaining target cost.
Amounts round down to $1K. Milestones stop future automatic funding without
diverting money to a new unapproved target. Any remaining ordered targets are
explicitly authorized; unused budget stays in cash.

New-turn drafts are prepared automatically from saved mandates. Changing a
mandate does not rewrite the current draft: use **Prepare draft within these
limits** explicitly. The existing funding controls remain authoritative for
manual edits. Turning off a mandate does not remove already staged commitments;
the UI distinguishes future limits from this-turn funding.

Research executes through existing investment/accounting code. It does not
deploy applications, activate platforms or change signed customer terms.
Later execution shocks can still prevent an investment; this is not guaranteed
future spending or a promised reserve after rival actions and events.

## Slice 3 — bounded service-department manager

Choose manual control, current bank profit, or minimum vendor use. Bound new
suggestions by reserved Business staff, outsourced points and a sales-staff
floor. Vendor points retain their existing $6K/month cost.

The manager compares feasible fully supported delivery of the signed book
through the real operating preview. It never hires, reallocates other
departments, places bids, changes prices or activates a platform. Explicit bids
pause delivery automation. If limits cannot support the book, the current mix
is retained and an exception is shown; obligations are not silently cancelled.

This is a narrow department mandate, not a named leader or full departmental
budget system. Profit ranking is short-horizon and can miss future relationships.

## State, timing and visibility

The opt-in rules add managementVersion=1, stable clientIndex on the six mandates,
and each bank's private management settings. Settings are staged inside the
explicit simultaneous plan and persist when the turn resolves. Draft generation
is pure and occurs before lock. No human sealed plan is rewritten by a manager.

Owner-facing public views and causal snapshots include that bank's mandate;
the rival view does not reveal it. Save validation rejects malformed limits,
unsupported versions, unversioned fields and changed client identities.

Existing pilot protocol 11 is retained. Hosts enabling these rules additionally
require managementSupported=1 in the handshake, including reconnects. Older
clients are refused for this preview rather than silently using different rules.
No GitHub credentials, repositories or firewall settings were changed.

Do not open new Living institution saves in older builds. A read-only check
confirmed the prior engine validator accepts unknown management fields rather
than refusing the new rules. The handshake protects linked sessions, not manual
backward file imports. A universal forward-save compatibility envelope is still
a release-hardening dependency; this opt-in preview is not a replacement package.

## Verification

Final HTML SHA-256:
c1c10b4402613531c8a2341f7c45aa2dd0b51cbe953fa9798629369ef100e854

All 29 regression invocations now have passing evidence for the final game
source. This is a composite verification, not a claim that the first full run
passed: the [frozen-source run](reports/baselines/N-00-2026-09-05T08-14-46-988Z.json)
passed 28/29. Its static selector scan could not see dynamically rendered IDs.
The corrected engine test executes the management renderer into DOM sinks,
checks generated IDs rather than exempting them, and passed standalone.
Only that test file changed; the game and all other fingerprinted files match
the full run. See the [verification addendum](reports/baselines/LIVING-INSTITUTION-c1c10b4-verification.json).

Coverage includes 48 engine campaigns, four Living institution scenarios to
120 turns, 20-turn exact comparison with the preserved prior build when the
new flag is off, private mandates, corrupt saves, target stops, reserve limits,
pure draft preparation, fixed-intent saved replay, simulated GitHub recovery
with new settings and old-client refusal, and the Windows loopback LAN relay.
Repeated seeded balance output reproduced exactly. The generated game reference
is current; `git diff --check` passed with line-ending warnings only.

The [final-source 180-turn audit](reports/baselines/release-balance-2026-09-05T08-19-56-506Z.json)
passed all per-turn accounting, cohort, local-book and ledger checks across
16 campaigns (four scenarios, seeds 4–7), totaling 2,880 turns. All 16 remained
active at turn 180. The largest owner view was 642,316 bytes, below 1 MiB.
It recorded 347 provider changes (176 after turn 60) and 2,085 competitive
actions. These counts indicate activity, not strategic fairness or enjoyment.
The audit recorded no unexplained initiative skips and three explicit
cash-change cancellations of Compliance Remediation in growth seed 5
(cycles 132, 138 and 146). These were not charged and remain player-visible;
the planner does not guarantee execution after intervening cash use.

Browser QA on isolated loopback port 8913 exercised new-game opt-in, enabled
research, changed priority, prepared $50K of Commercial funding, resolved a
turn, reloaded the saved campaign and observed the next $50K draft prepared
from the retained mandate. Service-manager mode also survived reload.
Named client preferences and draft adjustments were visible in Markets.
The disclosure stayed open after editing. At a 950px viewport the document
width was 935px; no page-level horizontal overflow or console warnings/errors.
The existing strategy lane scroller remains; a full responsive tree redesign
is not part of this batch. The computer-use review kept the new controls in
collapsible Strategy/Markets sections rather than adding more Operations cards.
The isolated test tab and loopback server were closed after verification.

## Remaining gates and next work

Human paired-seat balance and actual two-computer/GitHub play are not accepted
by automated tests. Campaign survival alone does not prove a compelling ending,
fair strategies or useful management choices.

Next dependencies:
1. Actual local household/business segments with reconciliation boundaries.
2. Multiple service relationships per named firm and attributable demand changes.
3. Operational workload, training and budget histories beyond the service desk.
4. More cross-capability deployments; named leaders and regional delegation.
5. Group accounting before insurance agency, brokerage, wealth or company shares.

The full blueprint remains unfinished. Work is local/uncommitted, with no push,
replacement ZIP or deployment performed.
