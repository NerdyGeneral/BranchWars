# Relationship operations — connected follow-on batches

Historical batch report. See [Customer needs](CUSTOMER_NEEDS_STATUS.md) for the next opt-in addition; existing relationship-only campaigns retain this report's rules.

Date: 2026-09-05

## What changed

- **Client dossiers:** six existing anchor clients retain a public, rolling 12-month service record: prior provider, delivered/missed service, signed fee, renewal and resulting provider. Outside-provider delivery is explicitly unknown, not failed.
- **Earned retention:** consecutive serviced months add 0.25 incumbent bid strength, capped at 2 after eight months. Missed service or a provider change resets it. Existing price, capability, staffing, advertising and client-preference effects still apply. This creates no deposits or assets.
- **AI renewal pricing:** due mandates are quoted using current capacity and bid strength, with a bounded fee-versus-strength heuristic. The AI can select discount, standard or premium terms. Signed fees remain fixed until a renewal. This is not a calibrated win probability or a full strategic rival model.
- **Department scorecard:** Markets now has a collapsible allocation, service workload, direct/vendor/platform cost and executive-capacity view. Latest actual desk economics are separated from the next draft forecast. Shared payroll and credit losses remain bank-wide; desk net must not be added again to bank profit.
- **Compatibility:** new Living institution campaigns use management rules 2 and save format 8.2. Older management campaigns retain their mechanics. Older builds reject new saves instead of silently dropping the relationship rules. Linked peers must advertise relationship support. A browser-discovered Continue-button version mismatch was repaired and regression-covered.

## How to play

Start a new campaign with **Living institution preview** checked. Its two prerequisite previews are enabled automatically. The host chooses the rules for both players. Client dossiers and the department scorecard are in **Markets**; the broad Operations layout was not redesigned.

Export an existing campaign before updating. Use the same current build on both computers. The visible application label remains v8.1; 8.2 here identifies the newer save format, not a claim that every blueprint phase is complete.

## Verification

[Full regression report](reports/baselines/N-00-2026-09-05T11-24-52-662Z.json): **31/31 invocations passed**, source/test fingerprints unchanged throughout, repeated balance output identical. Includes engine/UI contracts, accounting, product lifecycles, relationship rules, saved-turn continuation, replay, transport and the Windows LAN health/create/join/relay/deduplication checks. The new-rules GitHub simulation completed 12 turns with 61 accepted writes and eight lost responses while maintaining state equality. No live GitHub account was used.

Current HTML SHA-256: `c0a9ee1398327ce91e640ed2a1adeb127a28c393fb9844bf5ac9af5c0cfe0f02`.

[Long-campaign report](reports/baselines/release-balance-2026-09-05T11-29-59-982Z.json): 16 campaigns, four scenarios, seeds 4–7, 180 turns each (2,880 total). All remained active. Accounting mirrors, customer/credit/local deposit books and regional contribution reconciled. Zero silently skipped initiatives; one cash-change cancellation was explicitly reported and uncharged. Largest public view was 640,017 bytes, below the relay's 1 MiB gate.

There were 248 provider changes, 134 after turn 60, and 2,154 competitive actions. The preceding management-v1 report had 347/176 provider changes over the same seed/scenario range. Retention is stronger, not permanent; these changed-policy simulations do not isolate causality or establish human balance. All campaigns remaining active is not proof of good victory pacing.

A separate comparison against the preserved pre-batch engine ran an existing management-v1 campaign for 12 turns: AI plans and complete game state matched exactly after excluding only the save-format version. This checks that old mechanics are not silently replaced.

Browser inspection at a 950px viewport verified readable populated dossiers and scorecard, no page-wide horizontal overflow, a completed monthly turn, the $6K outsourced-service cost in forecast and actual results, and Continue after reload with the client history intact. Browser warning/error logs were empty. This used a disposable loopback-only QA campaign, not the user's saved match.

## Boundaries and next work

These are incremental N-04/N-05/N-08 improvements, not completed blueprint packages. There are still only six authored anchor agreements and two pilot regions. Full customer segmentation, firm balance sheets, department leaders/training/budgets, insurance and brokerage subsidiaries, company ownership, and the authored national campaign remain outstanding. No full Operations or Strategy redesign was attempted.

Next sensible batch: customer-segment demand and product suitability tied to local income/employment and finite acquisition pools; then specialist department workloads and training. Subsidiary accounting and capital boundaries should precede insurance/brokerage or share-control transactions.

Human-versus-human pacing and fun still need playtesting. Simulated transport failures do not substitute for a physical two-computer session or live GitHub outage recovery. Local implementation only; not committed or pushed in this turn.

Pre-batch rollback: [preserved institution build](reports/reference-builds/BRANCH_WARS_institution_c1c10b4.html), SHA-256 `c1c10b4402613531c8a2341f7c45aa2dd0b51cbe953fa9798629369ef100e854`.
