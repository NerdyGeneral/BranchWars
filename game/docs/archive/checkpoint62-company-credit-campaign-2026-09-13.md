# Checkpoint62 — versioned company-credit campaigns and simulated peers

September 13, 2026. The explicit 9.28 engine campaign now executes real submitted company loans. Ordinary Core/Expanded setup stays unchanged (Expanded9.27) until customer controls, same-rule AI and final integration are finished. This is not a new player-selectable mode or an automatic upgrade.

## Implemented

- Registry-owned `companyCreditVersion:1`, save9.28 and `companyCreditSupported:1`, requiring shared premises and its existing foundations. Missing/zero creation preserves old campaigns and their book shapes.
- Ordered opening initializes CompanyFinance7 and reconciled owner claims, then stamps the final campaign version. Company-deposit and investment-market boundaries recognize the explicit world without relaxing old-version validation.
- Submitted loan queues use the existing qualification, cash, capital and finite underwriting review. Both queues fund simultaneously before ordinary spending. The complete paired company/bank/market/account result commits together and reserves ordinary origination capacity.
- Company cash, deposits, principal, interest and repayments flow through the real monthly coordinator. Owner identity is preserved when committing pure domain results, retaining pricing WeakMap traces. This fixes a concrete full-turn failure that isolated adapter tests did not expose.
- Operating-event ledgers keep their numeric schema by flattening named-loan detail into identified numeric fields; owner operating reports retain their detailed loan breakdown. The causal earnings bridge recognizes only the explicitly versioned loan stage.
- Creation, validation, half-ready restore, delayed-message handling, owner views and rematch retain the new rules. Missing/wrong markers, mismatched claims, unknown lenders, rival orders and unfinished settlement fields are rejected. Existing campaigns do not inherit the marker.

## Evidence and failures preserved

[Review artifact](https://github.com/NerdyGeneral/BranchWars/blob/d795660/game/output/BRANCH_WARS_creditcampaign62_review.html), 191 inputs, SHA-256 `316558349a6548a7ce35f67aaa8a2c621a4be6dc0094c1f0e80e043ed3d3cfc2`; engine SHA-256 `57120bbc790ff9cf3bf7a2f4a31ad19a8e12a6a350863bde3d59e9cd38eb2e1e`.

The [initial exact-build report](../../output/master-checkpoint62-verification.json) retains 26 passing campaign/order/forecast/cash-location/historical tests and a passing source architecture/syntax gate. Its first network run failed: an unseeded campaign entered conditions in which the scripted offer correctly failed underwriting. That report remains failed, not rewritten as a pass.

The [network recheck](../../output/master-checkpoint62-network-recheck.json) fixes only the test's creation seed (`credit-queue`, created1), preserving the artifact and lending rules. GitHub, LAN and direct-link simulations all pass required-capability refusal, paid relationship development, a real $10,000 loan, half-ready restoration, owner privacy and delayed plan/reveal replay protection. This is simulated-client evidence, not actual two-computer acceptance.

The funded campaign test develops its account over two ordinary paid turns, submits the offer, restores the half-ready save, compares both resolved states exactly, advances repayments three more turns and rematches. No company cash, new staff or loan asset is injected. Tests also retain exact historical Core/Expanded creation, AI, settlement, RNG, views and recovery comparisons against unchanged reference bytes.

Earlier test-development failures caught the pricing-trace identity bug and the nested numeric-ledger violation; both were repaired in source. A rejection-test snapshot was moved after bot planning because bot planning legitimately consumes its deterministic RNG; it now isolates rejected submission without weakening its no-game-mutation assertion.

## Remaining

Finish contextual customer loan controls and draft forecast/commitment presentation, same-rule lending AI, terminal/failure/transfer acceptance and wider interaction/balance coverage before switching new Expanded setup to9.28. Current UI still shows assessment-only company credit; do not distribute this review as the completed player experience.

No fresh full Windows suite, 120/480-month full-bank balance, browser acceptance, final manual or release package is claimed. Normal checkpoint37 playable and all frozen release files remain untouched; no remote publication occurred.
