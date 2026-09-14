# Checkpoint47 — agency delivery and internal occupancy wind-down

September 13, 2026. Previous goal turn: progress, with actual investment delivery
and scoped tests implemented. This turn reread the full objective, verified
`feat/v3-economy` and the dirty tree, and continued the same integration.

## What changed

- Actual insurance policy acquisition/service consumes local and central pools
  built from the funded agency's registered producers and servicing specialists.
  Time assigned locally is removed from headquarters. Ordinary bankers are not
  accepted as producers; registration expiry and education reduce availability.
- Local acquisition requires an appropriate producer, not just service capacity.
  Outside the central focus market, a local team must supply the work. Existing
  central service remains available to retained remote clients. Original carrier
  premiums, commissions, finite company identities, term lengths and tie order
  are unchanged on the legacy path.
- Invalid local instructions are rejected atomically: no partial payroll,
  parent contribution, premium or relationship result is adopted.
- Agency preparation and finishing are distinct, once-only phases. This permits
  occupancy to be settled after staff/operating costs and before selling policies
  without hiring or paying the same team twice.
- `SharedPremises.releaseTenant` separates an internal bank-rent claim from
  outside operating payables. Liquid cash is shared proportionately with other
  due creditors; unpaid bank claims are extinguished on both books. Combined
  equity and cash remain unchanged by extinguishing internal claims. The actual
  existing agency wind-down then pays/write-offs only the outside obligations.

The simplified pro-rata creditor order is a provisional game rule, not a legal
insolvency model. Local producer acquisition quotas are two policies per full
producer-month, rounded down per work pool. This preserves the existing total
quota but makes small split assignments and condition matter. Comparative
facility/agency viability still needs the integrated balance gate.

## Verification

Seven new `shared_premises_agency.test.js` groups pass: two-market funded sales;
no-producer/worn-office limits; retained service and commissions; registration
and education; atomic rejection; once-only prepare/service; and actual agency
wind-down with separately settled bank occupancy. The tests conserve cash across
the bank, parent, agency, carriers, premises supplier and company counterparties.

Also passed: nine existing professional groups /three full-engine months, eight
investment-premises groups including24 successive service months, eight existing
room/accounting groups, and exact44 creation/AI/half-ready recovery/settlement/
private-view/rematch comparisons in all four scenarios.

The new fixture initially omitted corporate circulation between months, and the
existing validator correctly rejected it. The test was corrected to call the
actual circulation settlement, retaining its real funded payments and counters.
No validator or legacy expected result was relaxed.

The Group0–9 historical matrix finished with exit0:40 configurations /120 total
comparison months, covering frozen creation, human/AI plans, RNG, half-ready
recovery, private views and rematch. These are many short exact comparisons,
not a120-month current-version balance campaign. No golden was regenerated.

## Artifact and remaining work

- [Development artifact](../../output/BRANCH_WARS_premises47_agency.html),184 inputs.
- HTML SHA-256 `7fcc3edaa0a88155a53948258be1d5b72a19bb288959233916509c0064b5e4c1`.
- Engine SHA-256 `a0e1baf2e9ae3a2563bf1e5d75a5da10c7988c010c9d23b49a0f85d48bf802f6`.
- [Exact-build verification report](../../output/master-checkpoint47-verification.json).
- All script blocks compile; assembled source matches the separate artifact.
- Documentation names/paths pass; whitespace check passes.
- Normal portable remains37 /`b4351e85160586e72a63519a1eb2fe6fecdfe9cba1c94cbdd8577231f5c78561`.

**Not campaign-enabled.** Expanded still starts9.26. Tests invoke explicit
integration boundaries; the new paired occupancy flows are not yet reconciled
through the entire campaign's old agency/investment cash counters. Thus these
test fixtures are not claimed to be exportable supported campaign saves.

Next: one combined ordered coordinator for bank premises and both subsidiary
types, including protected cash, preparation, occupancy, permission refresh,
distress/closure, flow counters and consolidated eliminations. Then finish
creation/save/view/peer/rematch version handling, office controls and whole-path
tests before enabling the feature. Historical campaign rules remain untouched.

Full Windows/source architecture, integrated120/480 balance, browser/human
acceptance, final manual and local packaging remain open. No publication or
remote operations occurred; old builds and frozen cleanup snapshots are intact.
