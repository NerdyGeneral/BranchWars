# Renewable service agreements — partial N-08
Date: 2026-09-05

## Delivered
New opt-in pilots have one renewable service-fee agreement per market. The six initial contests are staggered across cycles 1–6, then each returns every six turns regardless of market influence. Outside providers begin as incumbents.

Markets > Renewable Service Agreements shows providers, contest dates, bid selection, costs, and the strength formula. A challenger may pursue the agreement due this cycle instead of the existing new-customer opportunity. The UI clears the competing selection; the engine rejects plans containing both. Incumbents defend automatically through their current staffing.

Bid strength is Business allocation ×2 + Operations allocation ×0.5 + local branches (capped at three) ×1.5 + Commercial capability tier + reputation /40. A fully staffed incumbent gets +2; an understaffed incumbent gets −3. Each participant adds 0–4 seeded uncertainty. Outside providers start at 10 before uncertainty; ties do not displace the existing best score.

Each held agreement costs $2K per turn. Up to one agreement per Business banker earns an $8K service fee, for $6K net before shared payroll. Excess agreements still cost $2K but earn no fee. Awards take effect after operations: the new provider starts earning next turn; the previous provider receives the final term's fee on the renewal turn. Fee revenue and service expense enter the existing operating/accounting pipeline exactly once. Winning does not create deposits, loans, or free customer balances.

Operations adds Targeted Relationship Advertising: $24K base expense, one base cycle, one execution capacity, selected focus market. Completion grants +3 agreement-bid strength in that market for the following four turns. It replaces the previous targeted campaign and does not stack, guarantee a win, or give a broad market bonus. Normal project efficiency adjustments apply; the UI quotes adjusted cost.

The AI compares its strength against a basic threshold before pursuing a renewable agreement, giving up its normal opportunity when it does. It does not yet plan targeted advertising timing strategically.

## Compatibility
contractRulesVersion:1 is enabled only in newly created product-deployment pilots. Older saves/rematches retain their existing rules; the new advertising project is unavailable there. New games need the opt-in Regional Rivalry checkbox.
Multiplayer pilot protocol is now 10. Both clients need the updated HTML. No live GitHub writes, commit, push, distribution rebuild, or physical two-computer acceptance was performed.

## Verification
Final BRANCH_WARS.html SHA-256:
db4db4183d1e58a61975763d8c4ed6c1933df863df012447f54502df61f707b0

- service_contracts.test.js passed on final source: bid validation/exclusivity, ownership changes, no invented deposit/loan balances, fee/cost preview reconciliation, preview purity, understaffing, local advertising bonus and expiry, paid advertising through normal turn resolution, ownership corruption rejection, old/new rematches, and exact save/resume.
- Four seeded campaigns produced 281 simulated turns and 89 provider changes (including movements to/from outside providers). Three reached cycle 82 active; one ended at cycle 38. Largest tested public view: 434,194 bytes.
- Engine regression passed 48 long-run campaigns plus migration/validation/UI contracts before final CSS-only contrast corrections.
- Final-source save-integrity, accounting-persistence, determinism, and GitHub-resilience suites passed. The GitHub harness exercised 12 engine turns, 61 accepted writes, and eight lost responses without contacting live repositories.
- Transport checks passed before the final selected-text color adjustment.
- Previous deployment rules passed 320 compatibility turns with contracts disabled, before the final pursuit-slot restriction (which applies only to new contract games).
- Browser skill QA: pilot creation/resume, opportunity-to-contract exclusive selection, six-date renewal board, live bid resolution to next contest cycle 7, and no warning/error logs. Visual inspection caught and corrected selected-card contrast.
- Registered the suite in capture_baseline.js. The complete baseline runner was not executed.

## Status and limits
This is an N-08 slice, not completion of the blueprint. Agreements are simplified fee-service mandates, not identified deposit contracts, credit facilities, or a full segmented customer model. Business staffing supports the contract portfolio through an aggregate ceiling; it is not yet reserved away from other commercial production. There is no adjustable contract pricing, cancellation/exit choice, midterm service breach, or AI advertising planner.

Provider turnover proves the contest is recurring, not that it is fair or fun. Early campaign failure remains a pacing concern. The small fee pool does not solve national scale, richer rival strategy, or long-session goals by itself.

Next recommended work: differentiated contract/customer segments and service capacity commitments, with product/research fit and explicit renewal pricing. Build those interactions before adding more map regions or more identical agreements.
