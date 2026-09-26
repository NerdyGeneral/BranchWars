# Checkpoint48 — shared occupancy and ordered subsidiary service

September 13, 2026. Previous goal turn: progress (documentation cleanup and
verified source/checkpoint distinction). The full objective was reread and
`feat/v3-economy` rechecked. Contributor changes, normal portable, frozen
distributions and historical reference bytes were preserved. No publication.

## Implemented and scoped-tested

- Investment settlement has separate pure `prepare` and `finish` phases. The
  existing `advance` composes them. Repeated preparation/service is rejected;
  caller input remains unchanged. Returning to central delivery discards the
  previous month's derived local budgets.
- Investment operations employees may work in wealth suites while using an
  external custodian. Real qualified time is still required; occupied time is
  not duplicated, worn premises reduce output, and no custody permission or
  negative custody capacity is created. Existing explicit custody contexts
  remain supported.
- A mandatory occupancy-default exit requires the actual unpaid internal
  creditor-release entry. A boolean alone cannot liquidate a solvent business.
  Extinguishing a defaulted rent claim does not restore selling or servicing
  that month. Client relationships are released and outside creditors receive
  only their own claims. Original voluntary/default closures are unchanged.
- Two twelve-month integration fixtures now use actual campaign bank, parent,
  agency, investment and company books. They expand an identified retail office,
  then finish a shared advisory wing before assigning its eight quarter-FTE
  seats. Both payrolls precede the same occupancy quote; each subsidiary pays its
  share once; agency and adviser work use separate, finite qualified budgets.
  The bank pays empty-space/shell overhead. Internal reimbursement creates no
  consolidated profit; every month conserves combined cash.

These are connected settlement-domain tests, **not full campaign play**. They
explicitly calculate rent offsets in ecosystem cash checks; those offsets are
not yet canonical campaign fields. No save version, peer capability or setup
selection was added. Expanded creation remains9.26.

## Observed funding outcome, not balance certification

The shared-office fixture agency starts with $200,000 and two professionals.
Without new support it fails while paying month12 payroll. That failure remains
an asserted regression case: the investment business continues, agency employees
are released and its external creditor claims reconcile. A comparison with an
explicit $50,000 contribution in month10 from existing parent cash remains
active through month12. No opening resources were invented to hide the failure.

This does not prove that a $50,000 contribution is a recommended player strategy
or that agency economics are balanced. These are prescribed settlement fixtures,
not ordinary-AI120 or480-month campaigns. Pricing was not tuned in this batch.

An initial test incorrectly requested insolvency closure after fully paid rent
in a solvent business. The existing safeguard correctly rejected it. The final
test uses a funded outside operating loss followed by a genuine unpaid rent
write-off; default requires the resulting journal evidence. The intermediate
artifact is preserved as failed-test evidence, not a release candidate.

## Terminal verification on final source

| Check | Result and scope |
| --- | --- |
| `shared_premises_delivery.test.js` | 11 groups; includes24 successive local-service months, split-phase replay, external-custodian operations and internal-default exit |
| `shared_premises_agency.test.js` | 9 groups; includes both twelve-month combined fixtures and earlier agency isolation/privacy-of-logs boundaries |
| `shared_premises.test.js` | 8 room/accounting groups |
| `shared_premises_boundary.test.js` | Exact checkpoint44 creation, independent AI, half-ready recovery, resolution and rematch in all4 scenarios; frozen reference unchanged |
| `investment_closure.test.js` | 10 groups /108 aggregate domain months, not a single long campaign |
| `investment_institution.test.js` | 9 groups /61 aggregate domain months |
| Source assembly |184 inputs; engine/client syntax passed; separate final artifact equals assembled source |

Final artifact: [premises48 verified snapshot](https://github.com/NerdyGeneral/BranchWars/blob/d795660/game/output/BRANCH_WARS_premises48_verified.html).
SHA-256: `c12fef86e2a5ec8b763cae9e064dcc2ea4873d931129944087335ec890f4218f`.
Engine SHA-256: `21fe68979c7fde0c623422bd84a215cbef1064ae36cc9d15d7e93bab430ae213`.
The [machine-readable record](../../output/master-checkpoint48-verification.json)
also identifies the intermediate failed-test artifact. No full Windows,
multiplayer, browser, performance or current long-campaign balance pass is claimed.

## Next integration gate

1. Wire the established ordering into the actual monthly campaign coordinator:
   agency preparation, protected bank/parent commitments, investment preparation,
   occupancy, paired default handling, then service and existing income/funding
   postprocessing. Avoid overwriting parent changes with an earlier snapshot.
2. Add explicit versioned premises books and ecosystem transfer counters. Agency
   cash plus circulated cash plus paid rent must reconcile to parent funding and
   premiums. Investment cash plus paid rent must reconcile to its existing funding
   sources. Do not disguise rent as parent capital or outside-supplier payments.
3. Derive residual time, protected cash, construction conflicts and condition
   from actual campaign objects. Report unavailable standing work after closures
   or qualification changes without silently repairing saved instructions or
   freezing ordinary turns. Validate new instructions atomically.
4. Connect projections, Continue/import/rematch, peer compatibility and contextual
   office controls before exposing the new campaign version. Finish the broader
   master requirements and final acceptance gates afterward.

No new user decision is required. [Current ledger](../v3-usability.md) remains
the authority for unfinished scope; this record is batch evidence.
