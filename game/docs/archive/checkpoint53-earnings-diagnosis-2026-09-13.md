# Checkpoint53 — reconciled diagnosis and repaired Expanded earnings summary

September 13, 2026. Reporting repair and diagnostic evidence, not balance acceptance or a final release. [Current ledger](../v3-usability.md).

## Usable repair

New Expanded campaigns could display “earnings bridge unavailable” because the summary's strict event whitelist omitted the shared-premises and company settlement stages. The accounts themselves still reconciled. Current shared-premises rules now recognize those exact category/source pairs. Unknown or inconsistent events still fail closed. Historical configurations retain their prior public projections.

The [new regression](../../tests/earnings_bridge_expanded.test.js) reproduces the failure against the preserved checkpoint51 reference, verifies both owners across two actual months, compares AI plans and full world/RNG exactly, checks that only the owner earnings summary changes, rejects a forged stage source, and compares a historical campaign's complete public views. The reference has not been regenerated.

## Ordinary-start diagnosis

[Diagnostic report and captured campaign](../../output/economics-checkpoint53-owner/report.json) used checkpoint51, the same Balanced scenario and `business-balance:1` seed as the long run. No resources or optimized policies were injected. Twenty-four months completed in185,930ms under concurrent background load. Forecast observations were checked for purity. Each month's top-level causal cash, loans and earnings deltas reconciled exactly against the observed opening and closing balances. Opening, six-month checkpoints and closing saves are retained beside the exact tested engine.

| First24 months | Bank0 | Bank1 |
| --- | ---: | ---: |
| Reported operating profit, cumulative | $610,652 | $667,533 |
| Closing retained earnings | -$744,723 | -$1,012,227 |
| Closing cash | $11,830,563 | $1,227,312 |
| Closing loans, from $9.5M opening | $3,375,844 | $3,244,040 |
| Scheduled principal returned to cash | $7,755,727 | $7,738,604 |
| New ordinary loans | $1,943,149 | $1,784,159 |
| Collections principal recovered | $164,553 | $161,235 |
| Credit losses | $147,025 | $140,280 |
| Executive-decision earnings effect | -$785,000 | -$588,000 |
| Project-start earnings effect | -$170,000 | -$600,000 |
| Facility-instruction earnings effect | -$60,375 | -$52,500 |
| Research earnings effect | $0 | -$85,415 |
| Competitive-action earnings effect | -$200,000 | -$200,000 |
| Risk-consequence earnings effect | -$140,000 | -$140,000 |

The $13,845 additional Bank1 shared-group settlement effect is separately identified in the causal report. Reported operating profit already includes its reported department/maintenance costs; do not subtract those ledger stages again. These are bank earnings, not group lifetime return. Principal repayment is not profit. The complete loan decline is explained by recorded operations in this window, with zero recorded funding-sale loss. Positive operating profit does not demonstrate a sustainable overall strategy.

Next: use the preserved real snapshots for bounded staffing/credit-capacity and executive-choice counterfactuals before changing AI or new-version balance. Opening scheduled amortization exceeds current production; later office/department commitments deserve prepared-plan inspection. Do not re-create an imaginary month120 state from summary statistics or rerun a completed unchanged campaign just to add instrumentation.

The first diagnostic invocation failed before month1 because the tool passed raw owner state rather than the public forecast context. Its failure report remains in `output/economics-checkpoint53`; the corrected run used the same public-owner forecast path as the UI. A test-only corruption fixture initially borrowed a live ledger reference; it was corrected to copy the fixture before corruption. Neither issue changed game rules.

## Exact-build checks and limits

- [Checkpoint53 review HTML](../../output/BRANCH_WARS_earnings53_review.html): SHA-256 `8bf31b8f2725074c06b7dbbc1b1ccae8372f5ec09cea6a17292e47aa2dc7a329`;187 inputs. Engine `16d1805296a747b3598650d5437e12c216b6baff25a662bcd68aaadaf42952bd`.
- Current source matches that artifact. Source architecture, existing10 earnings checks, new Expanded exact-state comparison, and GitHub/LAN/P2P simulated shared-premises lifecycle/privacy/duplicate checks passed. New regression is registered in both release runners. Runner/tool syntax checks passed.
- No balance rules, prices, settlement, saved fields or campaign markers changed. The checkpoint51 long process remains its own older exact-build evidence: Balanced120 complete, Regulatory last observed96 and process still live. This is not a terminal480 result.
- Normal playable checkpoint37 and frozen ZIP/manual remain unchanged. No publication, full Windows gate, real browser acceptance or physical two-computer playtest occurred in this checkpoint.
