> Historical batch record. Claims and hashes below refer to that batch, not today's build. See [current release status](../release-status.md) and [roadmap](../roadmap.md).

# Regional Rivalry pilot — N-02 / N-03 / N-04 bundle

Update: new pilots now also use the partial Regional Operations package. See regional-operations-status.md for current additions and remaining work. The rules and evidence below describe the original pilot version, still retained by existing saves.

Implemented locally September 4, 2026 (audit timestamp September 5 UTC).
Status: playable opt-in pilot, not a completed national release. No commit or push.

## How to play

Open BRANCH_WARS.html and check **Try Regional Rivalry pilot** before starting a new campaign. This overrides the size selector with six markets in two regions. The host selects the rule set for linked games; both computers must use this updated build. Bank color selection still works.

Existing saves remain on their existing economics/endgame. No legacy balance sheet is guessed or converted. The pilot persists campaignRulesVersion=1 alongside fundingRulesVersion=2; unsupported or inconsistent accounting saves are rejected. Rematches preserve the selected rule set.

## Delivered

### Active accounting

This is no longer only an isolated accounting prototype. The pilot's authoritative player accounts drive cash, loans, deposits, emergency debt, equity, and retained earnings through the live turn.

- Opening assets: 2.4M cash, 9.5M loans, 13.9M explicitly allocated securities; funded by 24M deposits and 1.8M equity.
- Deposits create cash and liabilities, not income. Withdrawals settle immediately and are not charged again later.
- Loan origination consumes funding. Credit losses reduce loans and equity, without a second cash loss.
- Operating profit is fully retained. The old free cash adjustment for the liquidity policy is absent.
- Expenses for decisions, hiring, research, projects and competitive actions reduce equity. Board and milestone capital are issuance, not operating earnings.
- Acquisitions transfer actual loan/deposit balances with a backing-cash settlement; no duplicated balance sheet. The upfront project cost is expensed; there is no additional goodwill valuation.
- Funding priority is cash, securities sold with a 2% haircut, loans sold with a 6% haircut, then explicit emergency debt. Mandatory regulatory loan sales retain their 7% haircut.
- Securities earn the current annual policy-rate percentage divided by 1,200 monthly. Capital exposure is loans plus 20% of securities.
- Emergency debt costs 1% monthly and is repaid from cash above the existing 10%/5%/2% policy reserve. New borrowing is charged from the following operating period.
- Last-resort debt remains uncapped. This is a declared game abstraction, not a collateral/eligibility simulation or regulatory model.
- A closing snapshot preserves a checkpoint plus the latest 96 postings per bank. Import validates retained postings and agreement between account balances and the statistics used by the game.
- The owner sees a balance sheet, operating forecast including closing cash/equity and funding-sale losses, and recent accounting entries. Rival account journals are not exposed.

The current product/demand income formulas remain simplified. This package does not introduce loan maturities/vintages, branch asset capitalization/depreciation, brokerage custody, or subsidiary consolidation.

### Persistent rivalry

- No score-ratio buyouts, forced consolidation auctions, or map-exhaustion victories.
- Below 12% share for three cycles can close a bank's offices, but never permanently locks it out.
- A rival receives no free branch or passive conquest dividend.
- New office construction remains available at the normal project price and duration. Opening into an empty footprint grants at least 15% launch share and a four-cycle establishment window before withdrawal can recur.
- That launch-share rule also applies to first-time entry, not only return after withdrawal.
- The AI can allocate an affordable project to entry/re-entry.
- Institutional failure after the existing critical-capital streak ends this pilot. Dual failure produces no winner. No survivor receives free failed-bank assets; they remain in resolution.
- There is no separate objective victory or financed whole-bank takeover yet. Scores are comparative information, not an ending trigger.

### Two-region foundation

Heartland: Downtown, Northside, Industrial Corridor.
Growth Coast: Suburban Growth Belt, County Seat, University District.

All six markets are open immediately. Regional cards show named markets, office counts and unweighted average market share. The existing isometric map has a six-market layout with regional grouping.

This is a region/market hierarchy and playable map foundation, NOT full N-04. Finite local customer pools, external institutions, geographic/sector portfolio attribution, adjacency and differentiated regional entry costs remain to be implemented. Region cards do not invent local deposit balances from global bank totals.

## Planning safety and AI

The first uncorrected audit failed all 12 AI campaigns within 4–13 turns: the old AI spent available deposit-funded cash without protecting equity.

Pilot validation now limits discretionary spending to cash and equity remaining above an 8% current-exposure reserve. This is not a guarantee against subsequent event/credit losses.

The AI uses a more cautious 10% exposure reserve plus 200K and two cycles of forecast operating losses. It cuts unaffordable initiatives/investment/actions and only hires when forecast profit covers the additional burden. The UI displays the separate capital-aware limit.

All spending is still a meaningful opportunity cost; there is no automatic recapitalization to make a strategy pass tests.

## Evidence

Final targeted audit:
../../reports/baselines/regional-pilot-2026-09-05T01-59-00-195Z.json

Source SHA-256:
220b5ef377db2dd3338b4cfe5a5a4514a774f0d1eae46d0513076df24061d006

The audit verified unchanged source, 1,920 turns across 12 seeded two-seat campaigns, reconciled accounts and causal ledgers each turn, real client import/resume equivalence, preview purity, paid project postings, reversible withdrawal, and no fabricated acquisition after dual failure.

All 12 campaigns were still active after 160 turns. This is a right-censored horizon, NOT a measured completed-game duration or proof of fun. Per campaign: 26–41 office-withdrawal messages, 30–48 entry/re-entry completions (includes first entry), and 141–159 deposit contests. The repetition indicates that entry/withdrawal churn needs human playtesting rather than being declared balanced.

Largest sampled single-player public view: 282,169 bytes, below the LAN 1 MiB request boundary. This does not certify every possible full-save/repository payload or worst-case campaign.

The other ten separately run regression suites passed: engine (48 legacy long campaigns), funding (24 legacy/current funding campaigns, 1,927 turns), both accounting foundation/activity suites, accounting persistence, bank identity, determinism, ledger, save integrity and transport. The Windows LAN test passed health/create/join/relay/retry deduplication. git diff --check passed.

Browser checks on isolated loopback port 8898:
- Opt-in setup launched a six-market pilot at 14.7% opening capital.
- Account totals and zero balance-sheet residual displayed correctly.
- Two live solo turns resolved; latest code showed explicit securities income and funding losses.
- Reload/continue retained the pilot, accounts and cycle.
- Regional map/summaries visually inspected; no desktop horizontal overflow in the tested viewport.
- Two browser clients created/joined a pilot LAN room, submitted simultaneous plans, advanced to cycle 2 and displayed identical resolution text.
- No browser warning/error logs observed in those checks.

This was same-computer two-client testing, not physical two-PC or live GitHub acceptance. No full 800-game legacy/modern paired-seat audit, comprehensive mobile audit or multi-session human playtest was performed for this bundle.

## Where the blueprint stands now

N-02's accounting path and N-03's core persistent-rivalry rules are active in the pilot; they still need broader balance/acceptance before replacing the default rules. N-04 has started, not finished. Do not mark N-02 through N-04 as three fully completed release phases.

Next: playtest this pilot, reduce repetitive withdrawal/rebuild loops if necessary, and implement finite local customer pools, supporting competitors and differentiated entry economics. Those give regional competition more substance before growing the map or adding new business lines.
