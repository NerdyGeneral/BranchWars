# Checkpoint54 — truthful Credit staffing and loan-book movement

September 13, 2026. [Current implementation ledger](../v3-usability.md). No settlement, AI, price, balance, saved-state or campaign-version changes.

## Repaired player workflow

Credit previously called the raw collections forecast on an unprepared owner. Its “remaining Lending bankers” display subtracted collections but not other department work. The simulation already used the prepared finite workforce. The new owner-only `departmentCreditPreview` uses the existing department/customer preparation and operating forecast, including paid teaching, shared department dispatch, specialist expertise and office instructions. The screen now reports the actual remaining origination pool rather than unused headcount.

Credit also shows a compact last-month/current-draft table separating new loans, scheduled principal repayments, collections principal recovery, credit losses and net operating loan movement. It explicitly excludes separate funding/regulatory sales, executive events, rival actions, opportunity wins and project completions; it is not a guaranteed closing balance. There is no reconstructed historical data when the report is absent.

Work-coverage and local-office buttons lead to existing contextual controls. Collections edits reject stale owners, changed drafts, connection generations, locked campaigns and paused GitHub sessions. Invalid plans show an unavailable explanation with work-coverage navigation and an explicit draft-only restore-standing-collections action, not fabricated forecast figures. The old non-department rendering path remains available.

## Captured-month diagnosis

Using the actual closing snapshot from [checkpoint53's24-month run](../../output/economics-checkpoint53-owner/report.json), ordinary Bank0 planning for month25 had1.00 effective origination staff and $100,000 base lending capacity. Reallocating two credit-administration quarters to the existing paid provider increased effective origination staff to1.50, but both drafts forecast exactly $100,000 new loans. Net operating profit fell from $34,154 to $32,554. Both quotes were eligible and the entire source world remained unchanged.

This bank's sole active facility was an ATM. The existing capacity model includes the central $100,000 base; extra staffing alone cannot bypass it. This observation does not prove that a commercial conversion is affordable or a profitable long-run alternative. An attempted standalone private conversion probe lacked the corporate forecast context; its result was not used. Subsequent comparison used the supported owner-preview API only.

The announced month25 staffing response chosen by AI cost $70,000 and carried a deferred effect. The free alternative reduced reputation and morale. Immediate expense alone therefore does not prove that the paid response is wrong. Do not remove paid strategic decisions or force higher loan balances without testing their consequences.

## Verification

- [Credit planning/UI regression](../../tests/credit_planning_ui.test.js): two groups passed. Real Expanded creation/ordinary AI, prepared finite-work comparison, reproduction of the old sales-staff overstatement, forecast equality, world/draft purity, invalid quota refusal, signed arithmetic, missing report behavior, action route and stale/paused/reconnect protections.
- Existing five-product UI test passed.
- Expanded earnings regression passed on current source: independent preserved51 AI/world/RNG comparison over two actual months; only the earlier53 owner-summary fix differs; historical public views remain exact.
- Source architecture passed with unchanged ceilings. Existing department UI checks and both release-runner syntax checks passed. The new regression is registered in both runners.
- [Complete review artifact](../../output/BRANCH_WARS_credit54_complete.html): SHA-256 `4a3de860a523d8754d0b2a5b2647c27f042ed375f806d1544bbeb71889ee90de`; engine `0c361c9efa3dbcb97643bea25774c1f8724f8123b24109dade92007633dc66ef`;187 inputs. The earlier `BRANCH_WARS_credit54_review.html` is preserved separately; the final wording identifies the central desk's capacity and no longer labels all non-collections time as origination time. The three Credit engine/UI groups passed again on the complete artifact's source.
- Normal playable checkpoint37 remains unchanged. No frozen release/manual overwrite or publication occurred.

The separate checkpoint51 Regulatory480 process was live and last reported168 completed months during this checkpoint; this is not a terminal480 result or verification of the newer UI. Real-browser layout acceptance, final full Windows gate, broader strategy comparisons and final package/manual remain open.

Next: use existing funded facility and executive-choice mechanisms in paired actual campaigns before modifying their AI selection. Continue remaining commercial/customer/research/warning integration; do not reopen the repaired Credit arithmetic without contrary evidence.
