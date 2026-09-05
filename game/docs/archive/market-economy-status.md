> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# Market Economy — N-04 customer-franchise foundation

Follow-up: see credit-lifecycle-status.md for the subsequent N-06 loan-lifecycle slice. New pilots now also use creditLifecycleVersion=1 and handshake capability 4; the remainder of this document records the preceding market-economy batch.

Implemented locally September 4, 2026. This advances the regional foundation; it does not complete the national game or all N-04/N-05 acceptance. No commit or push.

## How to play / compatibility
Start a NEW campaign with the Regional Rivalry pilot checkbox checked. The new rules use marketEconomyVersion=1, on top of regionalEconomyVersion=1 and campaignRulesVersion=1. Existing saves without this version retain their previous economy; the game does not guess a local balance-sheet history. Rematches retain their originating version. Both linked players must update the HTML; the pilot handshake capability is now 3.

## Delivered
### Conserved local franchises
Each of the six markets contains player-owned books plus a community-bank and credit-union book. Deposits, household/customer relationships, business relationships, merchant relationships and wealth relationships each have a conserved market total. These categories overlap; they are not unique population counts.

Each player starts with half its bank's balances/relationships in its home market and one tenth in each other market, representing an opening remote franchise. Loans receive the same explicit opening allocation. This is a new-game scenario assumption, not an inferred conversion of old saves.

Each market starts with:
- Community bank: 12M deposits, 2,000 household relationships, 100 business, 100 merchant, 30 wealth.
- Credit union: 8M deposits, 2,500 household relationships, 40 business, 40 merchant, 15 wealth.

Balanced-economy aggregate deposits are 168M: 48M player deposits plus 120M outside deposits. Rate-shock starts also include the existing explicit additional player deposits. There is no population or money-supply growth yet.

Organic production draws from outside books, subject to staffing/product demand, branch throughput and accessible local supply. Each player's organic quota is frozen before either operates: 5% of outside resources times local reach. Office count, local service upgrades and digital capability affect reach. This prevents the first operating seat from claiming the entire pool. It is not a full simultaneous auction or a complete seat-fairness guarantee.

Withdrawals return resources to outside books. Positive and negative movements are distributed in whole units with deterministic remainder allocation. Marketing/construction relationship rewards also come from actual outside supply. Branch closure does not confiscate a customer's deposit balance.

### Local competition and acquisition
Deposit competition now transfers balances market by market, capped at 2.5% of the losing bank's LOCAL deposits per contest. It no longer nets unrelated markets into a global transfer. Rate-sensitive balances are carried proportionally in these rival transfers.

Commercial raids transfer only the target market's actual household/business/merchant relationships; a raid cannot invent relationships when the target book is empty. Existing defenses and costs remain.

Deposit-based opportunity rewards are capped by remaining outside deposits in their selected market. An exhausted deposit opportunity issues no reward and reports exhaustion. Opportunities are separate from the organic recruitment quota; they can move larger books.

Competitor acquisitions are capped by the rival's deposits, loans and household relationships in the target market. The existing price is expensed and the backing-cash/loan/deposit settlement remains explicit. The funding helper now reserves loans promised in the deal rather than selling them to raise the deal's cash settlement. Loan sales needed to fund a deal are reconciled to the remaining local portfolio.

Supporting banks and credit unions win back local deposits when their defensive pull exceeds a player's. Defense increases when outside ownership falls below 65%, and again below 40%. They are reactive customer-book competitors, NOT independent fully accounted banks with capital, payroll, research or bankruptcy. They cannot yet be negotiated with or acquired as entire institutions.

### Regional reporting / UI
Markets now offers separate collapsible sections for:
- Four-way actual deposit ownership and the owner's local household/business counts.
- Regional operating contribution.
- The preceding branch operating-cost and capacity dashboard.

Map rings and regional averages are explicitly labeled influence, NOT deposit ownership. Tables are collapsed by default so they do not push the map down.

The contribution report is a management allocation captured after operations:
- Deposit income and funding expense follow local deposit balances.
- Loan income and credit losses follow local loan balances.
- Commercial income follows business/merchant relationship mix.
- Local facility expense includes existing bank-wide efficiency.
- Central/shared is the reconciled remainder, including shared payroll, treasury/other income, event effects and rounding.

Regional contribution plus central equals the stored operating profit in whole dollars. The UI uses full-dollar amounts for this report so displayed subtotals can be added. This is not standalone branch net profit: project spending and funding-sale losses are outside operating profit, and product/cohort cash-flow attribution is not implemented.

AI opportunity ranking now considers available local deposit balances and the entry-cost profile, while retaining capital-aware project/hiring checks. This is an improvement to opportunity selection, not a geographic profitability optimizer.

## Integrity and evidence
Current HTML SHA256:
d7f6614ce028e9d62f15e6b2095bbf5b2de249d4b40539c094c3815626d8a035

Final targeted report:
../../reports/baselines/market-economy-2026-09-05T02-54-19-036Z.json

The new suite verifies:
- Whole-market resource conservation and agreement between local books and bank totals.
- Reconciled accounts and stage ledgers.
- Preview purity and no organic deposit creation when outside supply is exhausted.
- Target-local acquisitions, capped raids, funding a deal while reserving its loans, and service-upgrade access effects.
- Real client save migration/resume equivalence, rematch version preservation, owner view isolation, malformed books and conservation violations.
- Eight seeded campaigns, 968 resolved turns total (121 per campaign), all still active at the test horizon.
- Largest sampled public view: 357,799 bytes, below the LAN 1 MiB request boundary. Not a worst-case full-save size certification.

Separately run regressions passed during this batch: engine (48 campaigns), original pilot (1,920 turns), prior regional operations (808 campaign turns), funding (1,927 turns), accounting foundation/activity/persistence, identity, determinism, ledger, save integrity and transport. Windows LAN health/create/join/relay/deduplication passed.

Browser checks on isolated loopback port 8900:
- New pilot launch, forecast and ordinary solo turn.
- Saved local books/report reloaded at cycle 2.
- Ownership and contribution tables inspected; influence is labeled separately.
- Two browser clients hosted/joined room SEA5N4, submitted both plans and reached cycle 2 with identical resolution text.
- No warnings/errors in the checked browser logs.
This is same-computer two-client LAN testing, NOT physical two-PC or live GitHub acceptance. Comprehensive mobile visual testing and human competitive playtesting remain unperformed.

## Balance findings — not resolved by passing tests
All eight sampled campaigns remained active at cycle 122. They are unfinished games, not measured completion times or proof of fun.

At that horizon, the dominant player's deposits ranged roughly 140.9M–159.9M of the fixed 168M. The outside institutions collectively held only about 18K–508K. Office withdrawals were 3–9 per sampled game. Supporting competitors can therefore become marginal, and substantial financial concentration does not necessarily cause an ending.

These results are not a paired-seat balance audit. Fixed opening locations have different economics, rounding uses stable market order, and some existing opportunity/project resolution rules remain sequential.

## What remains / next batch
1. N-06 loan/product lifecycles: maturities, principal repayment, vintages, local underwriting demand, deposit cohorts and repricing. Loans are locally tracked but borrowers/credit demand are NOT a conserved pool.
2. Stronger comeback and endgame design without automatic score buyouts or free assets. Consider deliberate financed takeovers/objectives when the ownership phase is ready.
3. N-05 department budgets, delegation, branch conversion and capacity utilization.
4. N-07 research/deployment choices that alter products and operational systems.
5. Further supporting-institution behavior, market/segment heterogeneity, demographic growth and longer-run regional scenarios.

Insurance, brokerage custody, subsidiaries, equity holdings and a larger national map remain later work. Do not label this as a completed full national-economy or fully balanced release.
