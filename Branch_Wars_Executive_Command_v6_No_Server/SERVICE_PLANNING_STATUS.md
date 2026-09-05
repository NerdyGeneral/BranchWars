# Service planning and recovery — next connected batch

Historical batch report. See [Living institution status](LIVING_INSTITUTION_STATUS.md)
for the subsequent opt-in client/research/department slices and their evidence.

Date: 2026-09-05

## Scope

This batch strengthens N-03 recovery and the N-05–N-08 service loop. It does
not complete those packages or add national geography, insurance or brokerage.
The separate **Expanded commercial services preview** remains unchecked by
default. Broad Operations/Strategy redesign remains deferred.

The prior local preview is preserved at
`reports/reference-builds/BRANCH_WARS_service_preview_8919743.html`.
Its SHA-256 is `8919743bf146b915c08447af7df74221cbe87ba6ceb9f08156b1f51889291084`.
Existing user changes, including `ARCHITECTURE_PLAN.md`, were preserved.

## Implemented

### Final whole-bank AI review

The earlier planner checked reserves before newer departments added their
deployments/research. A new final pass now checks the complete commitment set.
It preserves a cautious 10% current-exposure reserve plus $200K and two turns
of forecast operating/funding-sale losses before discretionary spending.
This changes AI choices, not the human 8% legal spending limit.

Under low capital, weak projected earnings or a funding-covenant breach, the
recovery selector compares a bounded set of reversible operating plans:
margin/balanced deposit pricing, liquid capital policy, conservative lending,
closed term subscriptions with release at maturity, essential-only new retail
acquisition, and limited moves from retail to business staffing or lending
runoff to Operations. It keeps the existing plan unless the immediate net
operating forecast improves by more than $1K. It does not cancel locked
deposit/loan terms, grant aid, erase losses or extend receivership timing.

This is a short-horizon heuristic, not an optimized long-term strategy. It may
miss the future value of relationships, research, liquidity and product breadth.

### Delivery comparison and plan resilience

In **Markets > Delivery Comparison & Plan Resilience**, compare feasible
banker/outsourcing mixes for the existing book or a hypothetical additional
mandate. Each option shows reserved staff, vendor points, direct desk net and
bank-wide profit estimated through the existing operating engine. The latter
includes payroll, immediate lost sales production and funding-sale losses.

Quotes preserve signed fees, require treasury activation, and support the
entire resulting book. Hypothetical awards create no actual income, accounts
or ownership. Options are ranked by immediate profit; future relationships and
award uncertainty are explicitly excluded. Applying a mix stages only staff
and outsourcing. It never places a bid or activates a platform, and removes
an existing bid if the new mix cannot support it.

The resilience readout calculates projected equity change as operating profit
minus funding-sale losses and all discretionary commitments. It compares the
result with the advisory reserve above. Executive events, rival actions,
opportunities, regulatory sales and new-project benefits remain excluded.
New-hire payroll starts later and is not included in this current-turn view.

### Visible execution cancellations

A longer audit exposed an accepted Compliance Remediation order that did not
start at cycle 135 (balanced scenario, seed 7): intervening cash use made it
unaffordable. The existing no-charge cancellation was silent. The expanded
preview now reports why an initiative could not start and says to select it
again in a later plan. Public notices do not expose the bank's private cash.
No project charge or automatic retry is added. A focused cash-shock test
verifies the notice, absent project and unchanged construction spend.

## Compatibility and browser checks

No new serialized state or transport commands were added; service expansion
rules remain version 1 and pilot protocol remains 11. Old preview saves use
the improved AI when resumed; their financial terms and human plans are not
migrated. Preview-off campaigns continue through the prior planner/rules path.
The comparison selection is transient UI state, not part of a sealed intent.

Browser checks exercised payroll/treasury quotes, an unavailable treasury
platform, applying capacity without bidding, clearing an unsupported bid,
actual simultaneous resolution, save/reload and release of idle outsourcing.
The AI won the observed payroll contest, demonstrating that a quote is not an
award promise. The saved standing capacity persisted on the next turn.

At a 1265px content width the page had no horizontal overflow. The comparison
disclosure remained open after edits. The final build resumed the same test
save, rendered the funding-loss correction and reported no console warnings
or errors. The computer-use check kept changes inside the small Markets
disclosure; it did not redesign Operations. Temporary QA tabs/server were
closed. No physical two-computer or live GitHub match was performed this batch.

## Final verification

Final HTML SHA-256:
`0704591cc274b02936521b36c53f1353f44b9d6da55624c104ad897d1f1e1d90`.

The [complete frozen-source regression run](reports/baselines/N-00-2026-09-05T07-50-03-509Z.json)
passed all 27 test invocations, including the new planning tests, save/replay,
simulated GitHub recovery and the Windows loopback LAN relay. All fingerprinted
source/test files were unchanged during the run, and repeated seeded balance
audit output reproduced exactly. Intermediate runs are not release gates.

Final-source campaign evidence:

| Audit | Result | Report |
| --- | --- | --- |
| Expanded preview, four scenarios, seeds 0–3 | 16/16 still active at 120 turns; 1,920 turns checked | [120-turn audit](reports/baselines/release-balance-2026-09-05T07-52-03-832Z.json) |
| Expanded preview, four scenarios, additional seeds 4–7 | 16/16 still active at 180 turns; 2,880 turns checked | [180-turn audit](reports/baselines/release-balance-2026-09-05T07-53-20-488Z.json) |
| Preview off, seeds 0–3 | 1,735 turns; 13/16 active; campaign result arrays exactly match the earlier published reference | [Compatibility audit](reports/baselines/release-balance-2026-09-05T07-51-29-181Z.json) |

The prior local preview left only 4/16 of the same seeds active at 120 turns
([prior report](reports/baselines/release-balance-2026-09-05T06-30-54-734Z.json)).
These runs exercise AI-managed campaigns, not human multiplayer strategy.

The final 180-turn audit recorded 357 contract-provider changes, including 193
after turn 60, and 2,016 competitive actions. This shows continued recorded
activity, not that each decision was interesting or that rivals were balanced.
All per-turn accounting, loan/deposit cohort, market and ledger checks passed.
The largest public view was 599,320 bytes, below the harness's 1 MiB limit.
There were no unexplained skipped initiatives; one cash-shock cancellation
occurred with the explicit, tested notice described above. The 120-turn and
preview-off audits had no initiative cancellations or unexplained skips.

The generated game reference is current and `git diff --check` passed (only
line-ending conversion warnings). No release ZIP was generated or tested.

## Remaining gates and next work

More survival time is not proof of good competition. This batch does not pass
the blueprint's human fun gate or its major-release paired-seat balance gate.
Human sessions must check recovery routes, planning burden and whether there
are genuinely distinct viable approaches. Longer campaigns may reveal passive
stalemates, dominant strategies or poor late-game capital allocation.

The older emergent-character audit also remains a warning, not a balance pass:
its current-funding run labels digital finishers at 79.6% wins (117/147),
efficiency at 21.4% (6/28), and no people finishers. These are end-state labels,
not controlled strategy assignments; they cannot establish a causal advantage.
That audit does not enable the expanded-service preview and cannot certify it.

Next connected feature batch: local customer/firm segments and differentiated
contract demand, then recurring research budgets and department management.
These should turn mature markets into recurring choices before adding more
geography. The full capability web, named firms, subsidiaries, company shares,
national management and integrated UI remain ahead.

The published Git build remains `8181c2a`. This batch and the preceding service
preview remain local: no commit, push or replacement ZIP was made.
