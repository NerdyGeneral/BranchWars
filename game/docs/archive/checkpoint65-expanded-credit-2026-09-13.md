# Checkpoint65 — company lending in ordinary Expanded setup

## Playable result

The single Expanded selection now includes qualified company lending under save9.28. Players do not need a development-only creation option or another checkbox. The existing customer inspector provides terms, review, funding/capacity consequences, staging and removal. The confirmation remains five player-facing benefits, now explicitly mentioning company lending; it does not list internal dependencies.

Core stays unchanged. Existing campaigns retain their authoritative saved rules. Selecting Expanded creates the connected rules, not free loans, subsidiaries or customers. The six-market override remains explicit. New company lending still requires a qualified relationship, legitimate borrower need, available staff, cash and protected capital. No balance values changed.

## Compatibility and test fixtures

Host changes remain private until applied. Apply increments the shared revision and clears both ready flags. A guest missing company-credit support rejects the new snapshot before adoption, while the host visibly blocks ready/start; stale earlier confirmations cannot authorize the newer rules. Compatible GitHub, LAN and direct-link simulations start9.28, preserve owner-private claims and resolve actual plans.

Historical tests must not inherit whichever rules the latest Expanded button selects. Pre-credit tests now explicitly omit/disable the credit marker. The9.21 product fixture starts from immutable9.20 options plus its intended credit-products scalar; the9.22 investment fixture excludes later rules. No golden file or engine validator was weakened. A domain-only lender-claim rejection assertion now names the actual campaign version-boundary error rather than the earlier pre-integration wording.

## Exact-build evidence

- Review artifact: [Expanded65 HTML](../../reports/reference-builds/BRANCH_WARS_expanded65_review.html),193 assembly inputs; SHA-256 `1c488be30061e6729b56bc0a6bf81f838aec7dc039916284429509a06659df00`.
- [Initial integration report](../../output/master-checkpoint65-verification.json):126 tests across32 affected files;119 passed and seven historical-fixture setup failures were retained. Five transport command groups, source architecture and documentation checks passed.
- [Fixture recheck](../../output/master-checkpoint65-fixture-recheck.json): all nine tests in the two corrected files pass, covering all seven earlier failures and repeating two earlier passes. Production source did not change.
- [Shared setup regressions](../../output/master-checkpoint65-setup-regression.json): registry, setup, lobby and network commands pass, including legacy compatibility, strict received-state validation, recovery handshakes and stale-message fences. The registry report's optional baseline replay was not requested; exact historical replay is covered by the affected subsystem tests.
- [Combined acceptance record](../../output/master-checkpoint65-acceptance.json): all126 distinct affected tests are covered. Source/artifact hashes match; only the two rechecked test files differ from the initial test inventory. The normal playable HTML is unchanged. This is a scoped integration pass, not the full Windows/release gate.

## Next acceptance work

The ordinary-AI balance experiment was launched against this artifact: Balanced120 and Regulatory up to480 months, fixed seed, no resource grants. At V4 publication preparation, its process handle is missing and no matching live process remains. The [public interrupted-run summary](../../output/master-checkpoint65-balance-interrupted.json) records the last108 Balanced months, not a completed120/480-month pass. Original reports and recoverable snapshots are retained locally, not uploaded as raw campaign dumps.

Long-run strategy comparisons, final accounting/performance/release gates, real-browser workflows, comprehensive manual/PDF and the final local package remain required. Real two-computer play and enjoyment remain separate human acceptance. No normal playable, frozen package or manual was overwritten; nothing was published.
