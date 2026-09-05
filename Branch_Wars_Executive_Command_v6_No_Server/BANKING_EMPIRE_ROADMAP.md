# Banking empire expansion proposal

Status: design proposal, not implemented mechanics. Builds on the completed planning and operating-visibility upgrade.

## Intended experience

A long campaign in which two friends grow financial institutions, contest customers and companies, and manage different regions. Losing a local franchise should hurt without removing every future decision there. Winning an acquisition should create integration and management decisions. Session saves and recovery must preserve ongoing commitments.

## 1. Keep competition alive

- Add an Empire campaign alongside the existing elimination rules. Existing saves keep their original victory rules.
- Replace permanent local exclusion in Empire campaigns with retrenchment: close uneconomic facilities, incur losses, and permit a funded return after a recovery period. Digital entry, an anchor-company relationship, and a new branch should be distinct return routes.
- Treat local dominance as a customer position, not ownership of every account. Customer preferences, service quality, pricing, and switching costs determine retention.
- Replace automatic uncontested-franchise payments with income from actual local customers and facilities. Preserve incumbent advantages without paying an unrelated bonus simply because the competitor withdrew.
- Require an explicit takeover offer, financing, defense window, and integration plan. Disable forced split-map auctions in Empire mode. A campaign can continue after acquiring an AI institution; handling a defeated human must be a visible pre-game rule.
- Keep serious failure possible. Re-entry consumes cash, staff, and time; it does not restore lost assets for free.

## 2. Local banking economy

- Model households, affluent customers, small businesses, and large companies as separate customer groups.
- Give each group account balances, service needs, rate sensitivity, loyalty, fees, and credit demand.
- Track bank/customer-group balances per market. Transfers must subtract from one holder when adding to another; market growth is a separately recorded source.
- Branches have capacity, assigned staff, quality, upkeep, and local profitability. Provide conversion, closure, and upgrade paths rather than only three additional generic facilities.
- Upgrade dimensions: service capacity, business relationship teams, advisory services, automation, resilience. Upgrades consume execution capacity and can add permanent costs.

## 3. Products and funding

- Permit simultaneous checking, savings, term deposits, business operating accounts, and treasury services.
- Set rates, fees, eligibility, and campaign budgets per product/customer group. Display contribution margin, runoff sensitivity, and capacity demand.
- Preserve deposit cohorts: a term deposit retains its rate until maturity, while a promotional offer has a stated expiry. Repricing cannot rewrite yesterday's contracts.
- Track loan books by product, risk cohort, and maturity; underwriting changes affect new originations. Credit losses should develop from earlier lending decisions.
- Add a treasury desk for liquid securities and term funding. Show maturity concentrations and stress scenarios; higher yield consumes liquidity or adds risk.

## 4. Company ownership

- Start with a bounded roster of fictional employers, merchants, property businesses, and technology providers with operational income, debt, cash, and shares outstanding.
- Company accounts create deposit, payroll, lending, and merchant opportunities. Equity ownership and banking relationships are separate contracts.
- Minority stakes give dividends and exposure to business performance; larger stakes create governance opportunities. Control requires an offer and integration costs, not a free threshold bonus.
- Resolve simultaneous orders consistently, with limited liquidity, transaction costs, and price impact. Prevent unlimited risk-free round trips and purchases against stale prices.
- Track ownership without creating duplicate shares. A bank owning a company that also borrows from it must carry correlated credit and equity risk. Limit circular ownership in the first release.
- The rival bank's shares and hostile control belong to a later extension after the simpler company exchange reconciles correctly.

## 5. Research and development

- Retain open capability funding. Add optional programs requiring combinations of capabilities and operational prerequisites.
- Examples: Digital + Commercial unlocks automated treasury services; Network + Operations supports regional service hubs; Acquisition + Operations supports an integration office.
- Programs change what can be sold or operated, with deployment capacity, training, and upkeep. They should not simply stack permanent growth multipliers.
- Add recurring funding orders, editable priorities, exact amounts, and milestone schedules. Automatically stop completed orders and show their future cash commitment.
- Keep investments relevant through changing economic circumstances, not by arbitrarily removing purchased progress.

## 6. Advertising and relationships

- Campaigns specify audience, region, channel, duration, budget, and promise. Track acquisition cost, retention, and profitability after the promotion ends.
- Separate awareness, conversion, retention, and reputation campaigns. Saturation creates diminishing returns; service overload can cause attrition after a successful campaign.
- Sponsorship and payroll contracts provide durable, contestable relationships. Renewal windows create reasons to revisit mature markets.

## 7. National scale and management

- Use a national region view with local city/branch detail, not one enlarged city board. Regions differ in industries, income, credit conditions, funding costs, and competitive presence.
- Expand through a charter, anchor relationship, acquisition, or operating hub. Expansion requires management capacity and cash; market access is no longer only a cycle timer.
- Add smaller AI banks and independent companies as acquisition targets and sources of competition. Generalize ownership/share arrays before enabling more than two human players.
- Regional managers execute saved policies; players intervene on exceptions and strategic opportunities. Bulk orders, filters, saved plans, and alerts are necessary as the institution grows.
- Long play comes from business development, maturities, renewals, and integration, not simply slower progress bars. Provide configurable objectives and milestone reviews without forcing an end at every milestone.

## Delivery order and acceptance

1. Persistent competition and explicit campaign endings, with migration tests for old saves and two-player re-entry tests.
2. Local customer balances, branch economics, and upgrade/closure actions, with conservation and cash-flow reconciliation tests.
3. Deposit/loan cohorts, product pricing, and measurable advertising, with tests for repricing and delayed defaults.
4. Fictional company exchange and ownership, with share conservation, simultaneous-order, liquidity, and valuation tests.
5. Cross-capability programs and regional expansion, with deliberately distinct AI strategies, mirrored-seat simulations, and human LAN sessions.

Do not use final emergent character alone as proof of strategy balance. Record intended bot policy, realized portfolio, action usage, customer mix, cash generation, ending type, and time spent without a meaningful competitive option.
