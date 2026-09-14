# Checkpoint49 — saved shared-premises campaign settlement

September 13, 2026. Previous goal turn was progress: ordered subsidiary phases,
qualified shared delivery and retained funding/default cases. The full objective,
`feat/v3-economy` branch and dirty worktree were rechecked before implementation.

## What now works

- Explicit `sharedPremisesVersion: 1` campaigns use save9.27. Existing versions
  and normal Expanded creation remain unchanged at9.26. No existing campaign is
  upgraded. The new rules are internally selectable for testing; office UI and
  normal setup enablement remain pending.
- Each bank owns a saved premises book, standing allocation policy, cumulative
  construction/outside-payment/rent/default counters and unavailable-work notices.
  One-time construction/cancel/remove orders do not become repeating policies.
- Full monthly settlement prepares agency payroll, resolves bank/parent funding,
  prepares investment payroll, settles paired occupancy, handles internal defaults,
  then performs subsidiary service and existing investment income/funding flows.
  Intermediate parent changes are not overwritten by earlier snapshots.
- Fit-out and upkeep go to the existing facility supplier, whose cash continues
  through regional circulation. Its cash and outstanding claims reconcile to
  actual payments and invoices. Agency and investment cash checks include their
  actual rent paid to the bank; rent is not mislabeled as parent capital.
- Construction uses the shared planning cash/capital envelope and execution
  remaining after conversions, renovations, commercial suites and projects.
  Completed jobs do not release already-used monthly capacity for a second job.
- Actual staff, qualifications, entity ownership, room seats, existing commercial
  space, condition and conflicting construction are rechecked. Saved policies may
  outlive staff/permission availability; unavailable work is explicitly reported.
  Foreign entities, wrong professional roles, duplicate rows and impossible room
  allocations are rejected as saved-state inconsistencies, not silently repaired.
- The owner-only causal ledger includes premises changes. Save restoration,
  half-ready replay and public projections now understand the new settlement
  category. Transient execution data is never accepted as saved state.
- Peer capability `sharedPremisesSupported: 1` is derived through the registry.
  Older peers are refused for9.27, rather than silently downgrading shared rules.

## Terminal evidence

Final source assembles185 inputs into
[checkpoint49 campaign artifact](../../output/BRANCH_WARS_premises49_campaign.html).
SHA-256: `9832d2ca315e68ce61a3bd0c0a79bd9e5a1dc59523dba7759ad580845d1ebd7a`.
Engine SHA-256: `7347850181574d866903facec80c11a217660ad990333f6c75f26f0b55376f7c`.

| Check | Result |
| --- | --- |
| `shared_premises_campaign.test.js` |5 groups: explicit rules, rejected malformed saves, private projections, real construction, half-ready replay, conflicting instructions, agency rent and investment rent through complete campaign turns |
| `shared_premises_network.test.js` |GitHub-room, LAN and direct-link simulations: old-peer refusal; two real resolved months per transport; paid construction; half-ready reload; private instructions; duplicate/stale-plan protection |
| `shared_premises_boundary.test.js` |Exact checkpoint44 creation, independent AI, half-ready recovery, resolution and rematch in all4 scenarios; goldens unchanged |
| Existing room delivery / agency / commercial-suite checks |11 investment-delivery,9 agency and3 commercial-suite groups pass during integration; includes24 consecutive local-service months and earlier shared funding/default fixtures |
| Assembly |Engine/client syntax and separate source artifact pass; normal portable not overwritten |

The campaign tests use prescribed plans and transfers of **existing** bank equity
to the parent before subsidiary formation. They do not certify ordinary-start
AI diversification or long-run viability. An initial $800,000 bank-capital return
correctly made further fit-out unaffordable. The investment test uses a smaller
$350,000 return and $250,000 subsidiary capitalization; it does not weaken the
bank safeguard or add outside fixture money.

Initial integration failures were repaired: missing explicit ledger identity on
new campaigns, an unregistered saved event category and late execution data left
on the institution. A network fixture also needed staffing recalculated after
changing its plan, rather than reusing a conflicting old staffing allocation.
No legacy goldens or architecture ceilings were changed to accommodate these.

See [machine-readable verification](../../output/master-checkpoint49-verification.json).
This is not the full Windows gate, a current120/480 balance matrix, browser
acceptance or real two-computer certification. No publication occurred.

## Next required work

1. Add contextual extension/occupancy controls to the existing office inspector,
   including immediate and recurring costs, professional time, current versus
   standing/staged work, unavailable-work remedies and owner-only receipts.
2. Complete adversarial integration around bank/subsidiary failure, exhausted
   external supplier funding, qualification changes, conversion/closure,
   rematch/reconnect and mature multi-office allocation. Existing domain tests
   are evidence, not substitutes for all final campaign paths.
3. Add same-rule bounded AI decisions and pure player-facing quotes; expose9.27
   through the one Expanded selection only after the usable workflow gate.
4. Continue remaining connected management/content requirements, full balance,
   exact-package checks, manual/PDF and local release deliverables.

No new scope or user decision is needed. National expansion, underwriting and
publication remain reserved. The [implementation ledger](../v3-usability.md)
retains the complete unfinished goal.
