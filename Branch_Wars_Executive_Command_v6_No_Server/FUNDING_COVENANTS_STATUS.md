# Funding Covenants — recovery and rivalry batch

Follow-up: DEPOSIT_PRODUCTS_STATUS.md documents the next funding-product slice. New pilots now also use depositProductsVersion=1 and handshake capability 6; the remainder of this document records the preceding covenant build.

Implemented locally September 4, 2026; evidence timestamps use UTC September 5. Partial funding/rivalry delivery, not completion of the national blueprint. No commit or push.

## Use / compatibility

Start a NEW Regional Rivalry pilot. New campaigns use fundingCovenantVersion=1 on top of creditLifecycleVersion=1. Existing saves without the flag keep previous funding behavior, including on rematch. Both linked clients need the updated HTML: pilot handshake capability is 5.

## Mechanics

- Emergency funding covenant: max($250,000, 5% of deposits + 50% of positive equity).
- This is NOT a hard transaction-time borrowing cap. Required obligations still settle through explicit, reconciled bridge debt after the existing asset-sale sequence. No liabilities disappear and no balancing cash is invented.
- Three consecutive month-end breaches cause bank resolution. Evaluation occurs after the month's operations, competition, treasury settlement, projects, consequences and capital awards. Repeated evaluation in the same month cannot advance the counter.
- A bank below the ceiling at month-end resets its breach streak. Existing capital-failure receivership remains active. Simultaneous failures are a draw; survivors receive no free failed-bank assets.
- While currently above the ceiling, discretionary project/research/hiring/competitive spending has a zero budget. Existing obligations, events and normal operations continue. This is not a total expenditure or origination freeze.
- Excess borrowing reduces deposit pull by 1–3 points according to excess relative to limit. This feeds the existing local player contest and outside-institution competition; transfers remain constrained to actual local balances.
- Treasury repayment reserves for this version: Build Liquidity 2%, Balanced 5%, Reinvest 8% of deposits. Cash above the reserve repays debt. These are game-specific debt-repayment thresholds, not regulatory ratios.
- An overextended AI chooses Build Liquidity and conservative underwriting, shifts lending staff into service and stops prioritizing new loan opportunities. No extra resources are granted.
- Operations shows a collapsible current debt/limit/excess/breach summary and recovery explanation. Forecasts add debt and covenant excess AFTER OPERATIONS, BEFORE treasury repayments and later events. They are not promises of the final month-end breach result.
- Own funding state survives save/public view/rematch boundaries; compact covenant state is attributed through the existing event ledger.

## Evidence

Final HTML SHA256:
cef28d20da627c769641783f21bf760b782a5f19fc8995a7a6cf335a12a0cffb

Targeted test: tests/funding_covenants.test.js
Reports: reports/baselines/funding-covenants-*.json (timestamped, not overwritten).

Final-engine targeted run: 726 turns, two seeds each with an unstressed control and stress applied separately to each seat; 120-month loops plus paired save/resume checks. Largest sampled public view 437,419 bytes. All sampled local loan books, account balances and ledgers validated. Unit checks cover:
- Borrowing/limit arithmetic and reduced deposit pull.
- Zero discretionary budget and forecast purity.
- Single-count monthly breach progression, failure, simultaneous failure/draw.
- Recovery through existing loan principal and debt repayment without equity gifts.
- Invalid imported covenant versions/counters, retained legacy rules, rematches.
- AI recovery selection and persisted funding-resolution endings.

Other rerun suites passed: engine (48 campaigns), credit lifecycle (484 turns), funding (1,927 turns), accounting, accounting activities, accounting persistence, bank identity, determinism, save integrity, ledger (276 turns), transport and PowerShell LAN-server health/create/join/relay/idempotency. The final source change after most regressions was only converting the explanatory panel into collapsible details; the targeted suite parses all final script bodies and verifies the final source hash. git diff --check passed.

Computer-use skill QA: new solo pilot, saved campaign reload, compact summary expand/collapse, rendered panel at 1280px with no horizontal page overflow, live month resolution to cycle 2 and no warning/error logs. Temporary test tab/server closed afterward.

Not rerun this batch: physical two-computer LAN, live GitHub session, two-browser gameplay handshake, full release baseline, mobile layout, older regional/market-specific long suites, or a human competitive campaign. Transport and capability contract tests are not substitutes for those live checks.

## Balance findings — still unfinished

Before the AI recovery adjustment, three of four deliberately overborrowed banks failed by month 3 and one recovered. With the recovery response, all four recovered and all six sampled campaigns remained active at cycle 122, with zero debt. Direct failure-path tests still pass.

The recovering banks then became dominant deposit competitors. This suggests service/deposit concentration remains too rewarding relative to lending; this batch does NOT establish a balanced comeback system, satisfying endgame or a longer meaningful campaign. The two seed pairs are a limited diagnostic sample, not a comprehensive balance study.

The covenant primarily governs emergency debt. Healthy but small banks can still persist without borrowing, so winning most deposits does not automatically force a rival's failure. It is deliberately not a score-based bankruptcy shortcut.

## Next batch

Proceed with deposit-product lifecycles and segment profitability: term funding, renewal/runoff choices, explicit account servicing costs, and funding-versus-lending margin comparisons. Test whether all-service staffing remains dominant and whether rivals can compete for profitable niches after market concentration. Then expand borrower segments and regional scale. Insurance, brokerage, equity ownership and full national expansion remain separate later packages.
