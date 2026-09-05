> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# Customer needs — local prospect demand and product suitability

Date: 2026-09-05

Historical batch record. The current release adds opt-in service goodwill and uses save format 8.4 for new customer-needs campaigns. See [Customer relationships status](customer-relationships-status.md); the 8.3 mechanics and evidence below describe the preserved earlier build.

## Implemented slice

This batch advances N-04/N-06 prospect demand and product interaction. It is not the full customer-cohort, department or national-economy package.

- Three prospect needs: everyday households, digitally active customers and reserve savers.
- Six authored local mixes, modified by macro demand and interest rates. Essential Banking has a Northside niche, Rewards Checking a University District niche, and High-Yield Savings a reserve-heavy County Seat niche.
- Retail/digital offices improve matching channel access. Reach-weighted fit affects organic deposit/customer acquisition, and poor local fit lowers the approachable quota. Existing finite outside institutions, frozen turn quotas and facility capacity still bound acquisition.
- New deposit-account allocation uses open-offer emphasis multiplied by local suitability. Closed products receive no new allocation. Existing signed/locked terms are not changed by editing sales emphasis.
- Organic deposits actually acquired incur an explicit onboarding expense, once, inside operating profit. The weighted rates are $1.50/$2.50/$1.00 per $1,000 for everyday/digital/reserve demand. Existing recurring servicing and product-platform costs remain separate. Special opportunities, rival raids and acquisitions are not charged this organic onboarding expense.
- AI compares its current and eligible alternative mixes using bank operating profit plus a 0.5% preference for new franchise balances. That preference is only an AI ranking, never income, equity or spendable cash. AI respects deployment locks and cannot open every offer for free.
- Markets has a collapsible full-width **Customer Needs & Product Fit** table, showing local composition, each offer's fit, draft mix fit, remaining outside balances, and draft/latest actual onboarding expense. The Operations layout was not broadly redesigned.

Fit is not a win probability. Capacity may bind before better fit increases production. More expensive offers can attract appropriate prospects yet still be less profitable. Department staffing, pricing, facilities and the macro economy continue to interact with those outcomes.

## Enable and compatibility

Check **Customer needs preview** on a new campaign; it enables all three prerequisites. It is off by default. New games use customer-demand rules 1, relationship rules 2 and save format 8.3. Existing campaigns are not silently converted. Rematches preserve the flag; linked guests must advertise customer-demand support. Older builds reject new saves. Use the same updated build on both computers and export before updating.

The visible application title still says v8.1; 8.3 identifies this save format, not blueprint completion. No commit or push was requested or performed for this batch.

## What this does not claim

The segment percentages partition **monthly prospect demand**, not ownership or an additional pool of unique people. Customer counts still use the existing conserved local franchise system. Segment-owned deposit books, persistent segment loyalty/churn, explicit household income/employment, cross-selling and specialist staffing are not implemented here. National expansion, insurance/brokerage entities and share-control transactions remain later blueprint work.

Next: persistent segment relationships and retention with reconciling ownership boundaries, followed by specialist service workloads and training. Do not treat a prospect-fit score as evidence that these deeper systems already exist.

## Verification

[Full regression report](../../reports/baselines/N-00-2026-09-05T12-48-22-480Z.json): **33/33 invocations passed** on unchanged source/test fingerprints; repeated balance output matched. Includes engine/UI contracts, accounting, product lifecycles, replay, saves, new customer-demand rules, simulated GitHub relay and Windows LAN health/create/join/relay/deduplication. The new-rules GitHub relay completed 12 turns, 61 accepted writes and eight lost responses with state equality. No live GitHub account was accessed.

Focused tests include distinct product niches, macro sensitivity, closed offers, non-mutating preview, finite exhausted supply, exact old-campaign continuation, half-submitted save import, older-build rejection, Continue visibility, corrupt-state rejection, rematches and four 120-turn accounting runs. Passing automation is not physical two-computer or human-balance acceptance.

Pre-batch rollback: [relationship build](../../reports/reference-builds/BRANCH_WARS_relationship_c0a9ee1.html), SHA-256 `c0a9ee1398327ce91e640ed2a1adeb127a28c393fb9844bf5ac9af5c0cfe0f02`.

Current HTML SHA-256: `2d7bbca84b30100cb710c7a44d36dc5ab9f3f13a2e21c9f624f60fd63fe972b3`.

[Current long-campaign report](../../reports/baselines/release-balance-2026-09-05T12-54-16-354Z.json): 16 campaigns across four scenarios and seeds 4–7, all active after 180 turns (2,880 turns total). Accounting mirrors, deposit/credit/local books and regional contribution checks passed. Largest public state: 683,498 bytes, below the 1 MiB relay gate. There were 240 provider changes, including 123 after turn 60, and 2,177 competitive actions. These observations do not establish equal strategy strength or enjoyable human victory pacing.

Zero silently skipped initiatives. Four cash-change cancellations were reported and uncharged. In growth/seed 7, one AI retried Compliance Remediation at turns 161–163 before another later branch cancellation. Adaptive retry/reserve behavior remains an AI-quality follow-up; passing the cancellation safety check is not a claim that this behavior is optimal.

A supplementary isolated-engine check on these exact bytes verified actual newly created Rewards balances against each market's suitability-weighted allocation. With savings closed to sales, existing $1,000 promotional and $1,000 locked balances retained their quoted rates/principal and advanced from six to five remaining months. Accounting remained balanced. This check exposed the operating function only inside the test VM; no production debug API was added.

Browser QA used a disposable loopback campaign on port 8915. Checked opt-in prerequisites, the full-width collapsible comparison at a 950px viewport (no page-wide horizontal overflow), a completed turn, realized onboarding expense of $963, and continuation after reload with that result intact. Browser warning/error logs were empty. The comparison initially inherited an opportunity-grid column; visual QA corrected it to span the full width. The temporary tab and server were closed. This does not substitute for a physical two-computer match or broad mobile/desktop acceptance.
