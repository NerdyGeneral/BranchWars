# Customer relationships — persistent service goodwill

Date: 2026-09-05

Historical mechanics batch. The follow-on [service workforce planner](SERVICE_WORKFORCE_STATUS.md) makes staffing comparisons actionable without changing these rules. See [blueprint progress](BLUEPRINT_PROGRESS.md) for the current package-level position.

## This batch

Partial N-04/N-05/N-06 expansion: customer relationships now remember service quality across turns instead of responding only to this month's sales choices.

- Each bank has private, persistent 0–100 quality scores for everyday, digitally active and reserve needs in six markets, starting at neutral 50.
- Retail staffing and existing legacy Training must keep up with customer workload. Existing local deposit products determine suitability; local service upgrades help. Editing sales emphasis cannot instantly repair an existing relationship.
- Quality changes monthly, not on preview or rerender. Demand-weighted quality adds at most ±1.5 to local deposit competition. Existing capped, funded transfers and outside-provider defense still settle balances; goodwill creates no free assets or guaranteed retention.
- Markets has a collapsible full-width **Customer Relationships · Service Goodwill** table with current scores, draft trends, actual competitive pull and the formula. Its trend holds the current book/customer count fixed; actual growth and project completions can change the result.
- State is saved, validated, recorded in the causal ledger and sent only to its owning player. Rival internal quality is not exposed.

This is a service-quality index, not segment-owned customer counts or a separate balance sheet. Specialist hiring, training budgets, segment-owned books, cross-selling, national geography, insurance/brokerage and share-control transactions remain unfinished blueprint work. Operations decluttering remains deferred rather than claimed solved.

## Enable and update

For a new campaign, check **Customer needs preview · product fit and persistent service relationships**. It enables its prerequisite previews and remains off by default. New campaigns use customer-demand rules 2 and save format 8.4. Existing saves retain their original rules; rematches retain the selected rules and start new neutral relationships.

Both friends must update before starting this preview together. Older peers cannot join its new-rules host; older builds reject its saves. Export your existing campaign before updating. The visible v8.1 application label is distinct from the save format and does not indicate blueprint completion.

## Verification

HTML SHA-256: `0ae290ef37cc65951396abadb04e175cd3e975dcd49ac48ca30c239643491f53`.

Pre-batch rollback: [customer-needs build](reports/reference-builds/BRANCH_WARS_customer_2d7bbca.html), SHA-256 `2d7bbca84b30100cb710c7a44d36dc5ab9f3f13a2e21c9f624f60fd63fe972b3`.

Focused tests passed: positive/negative service effects, product-book rather than sales-mix suitability, bounded pressure, non-mutating previews, privacy/deep copies, corrupt-state rejection, rematches, half-sealed import/resolution and four 120-turn accounting campaigns. A preserved customer-demand rules-1 game produced identical AI plans and complete state for 12 turns on old and new engines.

The new-rules simulated GitHub relay passed 12 turns with 61 accepted writes and eight lost responses, maintaining state equality. This tests retry/recovery logic; it is not a physical two-computer match or a live game-token acceptance test.

[Long-campaign audit](reports/baselines/release-balance-2026-09-05T13-16-01-886Z.json): 16 campaigns across four scenarios and seeds 4–7, all active after 180 turns (2,880 turns total). Accounting mirrors, loan/deposit/local books and regional contribution reconciled. Maximum public-state size was 678,013 bytes, below the 1 MiB gate. Zero silently skipped initiatives; four cash-change cancellations were explicit and uncharged. AI reserve/retry quality remains a follow-up. Continued survival and activity are not proof of equal strategies or satisfying victory pacing.

Browser QA used a disposable loopback campaign on port 8916: preview prerequisites, full-width table at a 950px viewport with no page-wide horizontal overflow, completed turn and reload/Continue persistence passed. Actual post-growth scores were 50/48/48 and remained so after reload. Warning/error logs were empty. The test tab and server were closed; the user's existing tab was not modified. The computer-use skill guided isolated UI-based verification.

The long audit recorded 326 service-provider changes, including 207 after turn 60, and 2,192 competitive actions. These are activity measures, not win probabilities or a proof that stronger banks can be defeated reliably.

[Full regression report](reports/baselines/N-00-2026-09-05T13-09-52-058Z.json): **35/35 invocations passed**, with source/test fingerprints unchanged and repeated balance output identical. Includes engine/UI contracts, accounting, product lifecycles, old-rule compatibility, saved-turn continuation, deterministic replay, ledger validation, simulated GitHub recovery and Windows LAN health/create/join/relay/retry-deduplication.

Release target: existing `claude/emergent-doctrine` branch in `NerdyGeneral/BranchWars`. This release includes the preceding unpublished service, management, relationship and customer-needs batches, their tests and cited historical evidence. The separate `ARCHITECTURE_PLAN.md` and unused diagnostic reports are excluded. GitHub publication is verified separately by comparing the pushed commit with the remote branch; passing simulated relay tests alone does not prove publication.

Next recommended batch: specialist service capacity and training with recurring budgets, paired with AI reserve/retry improvements. Then implement reconciling segment-owned customer books before claiming a full loyalty/churn system. Human multiplayer pacing and an eventual Operations workspace redesign remain acceptance work.
