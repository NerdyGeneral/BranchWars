'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const html=require('../tools/build_game').assemble().html;
const engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
// Reviewed checkpoint digest. Changes require explicit goal authority and
// independent historical replay evidence, never merely a failing hash test.
//
// Sanctioned move, 2026-09-11 (feat/v3-economy, docs/changelog.md 9.7):
//   cc229f83  V3.1 c721ede, campaign ceiling Group 7 / save 9.6
//   7b5d48e7  adds the Group 8 / save 9.7 rules boundary, and its endings
//   7b5d48e7  retires the Modular combinations pilot
//   42cdfc3f  builds the Group 8 wealth advisory office
// Registering a new opt-in boundary necessarily re-hashes the assembled
// engine. Groups 1-7 are unchanged and still pinned by the compatibility
// fixtures, none of which were regenerated for this move.
// Authorized recovery repair, 2026-09-12 (docs/v3-usability.md checkpoint 1):
//   c6f72664  historical modular support despite hidden selection; strict Group8
//             exit metadata, unchanged shares at load and paid re-entry planning.
// Prior reference engines/goldens remain untouched. Verification includes
// integrated_campaign_recovery (eight exact historical combinations) and
// v31_version_boundary (published Group1-6 AI/RNG/settlement/views). No balance
// retuning is part of this checkpoint. Later economics needs a new boundary.
// Authorized shared-staffing boundary, 2026-09-12 (checkpoint 2):
//   296b775b Group9/save9.8 uses one business pool for commercial + wealth
//            assignments, lifecycle2 validation and current peer capabilities.
// Published Group1-6 and contributor Group7/8 creation/AI/RNG/settlement/views
// were compared exactly against preserved builds. The latter comparison was
// repeated against this engine after all version-gate edits (12 months each).
// The four 24-month Group9 scenario/recovery cases also completed; this is not
// a whole-game balance or release-acceptance pin. No golden was regenerated.
// Authorized entry-pricing repair (checkpoint 4): Group9 whole-plan budgets,
// AI reserves and forecasts receive explicit campaign/view ownership context.
// Only new office entry pays the Group9 surcharge. No new saved price cache.
// Eight regression groups include actual charges, UI prices and half-ready
// replay. Published Group1-6 exact comparisons and contributor Group7/8 exact
// 12-month replays pass against this engine (275s final contributor run).
// Historical quote/execution rules and every frozen golden remain unchanged.
// Authorized commercial-mandate repair (checkpoint 7): unpublished Group9
// originates a middle-market vintage, withholding its fee from the advance.
// Funding sales precede origination; ordinary portfolio allocation is unchanged.
// Five regression groups include a real two-bank contest, subsequent amortization,
// duplicate-award refusal and exact Group7/8 award journals. Final engine Group7/8
// creation, 12-month AI/RNG/settlement and public views match contributor 0159b9c
// exactly (278.7s run). No preserved fixture or golden was regenerated.
// Authorized qualified-agency boundary (checkpoint13): Group10/save9.9 adds
// real producer/servicing employees, paid registration lead time and recurring
// qualifications. Group0-9 exact creation, AI/human, RNG, half-ready recovery,
// public views and rematch match immutable 1bb3e687 in 40 profiles/120 months.
// The final simulation digest below was compared after strict role validation
// and canonical role ordering. Historical fixtures were not regenerated.
// Checkpoint14: explicit Group10 project destinations, correctly priced and
// passed through accounting/settlement wrappers; optional pure commercial
// forecast projection. Forty Group0-9 profiles / 120 months again match the
// immutable 1bb3e687 engine exactly. Three simulated transports verify separate
// targets, checkpoint recovery and exactly-once cost. No golden regenerated.
// The final connection capability also rejects older Group10 clients that
// would otherwise discard independent locations. Final 40-profile replay passed.
// Checkpoint15: explicit commercialAccountsVersion1/save9.10, matched company
// cash-location and bank deposit subledgers, finite shared work and owner-private
// plans. Final Group0-9 replay matches immutable 1bb3e687 (40 profiles/120 months);
// final Group10 replay matches immutable 2af5dba7 (4 profiles/12 months).
// Both include creation, human/AI, RNG, half-ready save, views and rematch.
// No golden changed. Four 24-month scenarios and three simulated transports
// reconcile this engine; long balance and real-player acceptance remain separate.
// Checkpoint16: repaired the preserved Group8-10 terminal crash caused by an
// aggregate award without market context. Victory retains separate final books;
// Core endings remain exact. Seven focused groups and three funded-account peer
// endings verify settlement, recovery, views, rematch and duplicate fences.
// Final normal replay: Group0-9 40 profiles/120 months, Group10 4/12 and business
// accounts v1 4/12, all exact against immutable references. The formerly crashing
// terminal path is explicitly changed and tested, not hidden by golden updates.
// Checkpoint17: commercial officers use residual physical quarters once, never
// vendor/expertise throughput or treasury service attribution. Draft office
// availability and consecutive full-team settlement agree; the immutable bb6
// engine still reproduces zero delivered work for its eight-quarter request.
// Final-source historical replay: Group0-9 40 profiles/120 months; Group10
// without accounts 4/12; business1 with account work explicitly off 4/12.
// Active business1 behavior intentionally changes for this unreleased defect;
// its physical/consecutive-month tests and portable three-transport gates pass.
// Capability2 blocks the buggy old account client. No reference was regenerated.
// Checkpoint18: explicit facilityExtensions1/save9.11, paid commercial fit-out,
// shared physical role time and bounded final AI office/account staffing repair.
// Group0-9 40 profiles/120 months and Group10 without accounts 4/12 match their
// immutable engines. Active business2 4/12 matches preserved checkpoint17 exactly,
// repeated after the marked-only AI correction. No golden regenerated.
// New-domain tests, all three portable simulated transports and eight six-month
// scenario controls pass. Negative earnings and an older month188 pricing failure
// remain recorded; this fingerprint is not full-game balance/release acceptance.
// Checkpoint22: explicit company-domain version5, dealer capital and paired
// securities cost-basis/cash boundary. Current campaigns still require version4
// and reject the unselected investment rules. Corporate versions2-4 match the
// immutable checkpoint18 domain exactly for72 months; current active business2
// four-scenario creation/human/AI/RNG/half-ready/view/rematch comparisons pass
// for12 months on this engine. No historical fixture or ceiling was changed.
// The connected investment prototype and closure tests are not release acceptance.
// Checkpoint24 integrates explicit investmentServices1 / save9.12. Four frozen
// business2 scenarios still match exactly for12 months; new normal submission,
// funding, pricing conservation, save/replay and three-transport tests pass.
// Historical goldens and override ceilings are unchanged. Wider investment
// products and final release/balance acceptance remain outstanding.
// Checkpoint25 adds explicit investmentAssets1/save9.13: bank-funded dealer
// inventory, proportional offers and customer purchases from unlocked savings.
// Frozen9.12 creation/AI/RNG/turn/save/view comparisons pass for three months;
// active business2 four-scenario twelve-month frozen comparisons also pass.
// Backed settlement, rematch, owner privacy and all three transports pass.
// The source-backed securities path is not full investment/balance acceptance.
// Checkpoint26: explicit investmentCash1/save9.14 returns actual client cash
// to its funded source deposits. Normal settlement, fees, unchanged household
// counts/equity, partial fills, half-ready restore and rematch pass. Frozen9.13
// creation/AI/RNG/turn/views remain exact for two months; frozen9.12 three-month
// and qualified backed purchases also pass. No golden was regenerated.
// Checkpoint27: explicit investmentSweep1/save9.15 connects all three standing
// routes to real banks, custody, finite operations and service-fee liquidity.
// Frozen9.14 and9.13 each match creation/AI/RNG/turn/views for two months;
// funded9.15 placement/fees/reversal/half-ready restore/closure/rematch and
// three simulated transports pass. Historical fixtures/ceilings are unchanged.
// This scoped pin is not full campaign balance or final release acceptance.
// Final scope-preserving cleanup gives two local delta variables unique names
// so the unchanged override scanner does not mistake them for engine overrides.
// September13 integration gate: recognize exact investment/deposit events in
// new9.15 earnings summaries. Historical projection/replay remains identical;
// 9.14 frozen two-month comparison passes unchanged. All three funded cash
// routes now assert their known opening and closing earnings each resolved
// month; strict missing-history and unknown-source refusals remain tested.
// Checkpoint30: explicit9.16 customer-choice boundary, no automatic upgrades.
// Preserved900f62d2 portable matches9.15 creation, funded operations, AI/RNG,
// both private views and half-ready resume exactly over four months. New
// funded departure preserves actual assets and swept deposit claims; three
// transports cover the new marker and incompatible-peer refusal. No goldens
// or architecture ceilings changed. Preference weights remain provisional.
// Checkpoint31: explicit9.17 funded income. Preserved90d0d4e1 matches9.16
// funded creation, four-month AI/RNG/servicing/resume and both public views.
// Actual security/fund distributions, zero/partial issuer cash, redemption,
// reversed submissions and strict marker/peer checks pass. No legacy fixtures
// were regenerated. Ledger-only480 months is not a campaign balance claim.
// Checkpoint32: explicit9.18 customer mandates, not a historical rules change.
// Preserved8d4a9fda matches9.17 funded creation, four-month AI/RNG/servicing,
// half-ready resume and both views exactly. New funded purchase/refusal,
// cash-placement conservation, owner privacy and all three transports pass.
// Existing goldens/reference files and architecture ceilings are unchanged.
// Checkpoint33: explicit9.19 client cash-funded buy/sell instructions.
// Preserved078a2834 matches9.18 funded creation and six months of AI/RNG,
// operations, half-ready recovery and both private views exactly. New paired
// trading, finite qualified work, dealer constraints and rejection checks pass.
// Seven actual funded months on each simulated transport preserve canonical
// resolution, sealed instructions, private receipts and exactly-once fees.
// No preserved fixtures, legacy expected results or architecture ceilings changed.
// Checkpoint34: explicit9.20 term-note debt, fixed coupons and maturity payments.
// Preserved84b55d3d matches9.19 creation, seven funded AI/RNG buy/sell months,
// half-ready recovery and both views exactly. New13-month actual campaign
// maturity,480-month domain conservation and all three funded transports pass.
// Legacy expected results and reference builds remain untouched.
// Checkpoint35: pure new-campaign edition proposal exposes the completed stack.
// Core byte-equivalent creation, explicit unchanged13-month note campaign and
// seven-month preserved9.19 comparison pass. No settlement/version rules change.
// Three transports pass host draft/apply/readiness/privacy tests. Final local
// prerequisite-helper rename avoids an architecture-name collision only.
// Checkpoint36: explicit lending1/save9.21. Four economies/24 funded months,
// four ordinary AI months, and exact immutable35 comparison across four
// economies/12 legacy months pass. Three simulated new-version transports pass.
// Checkpoint37: explicit investment-strategy1/save9.22. Sixteen funded months
// exercise ordinary AI formation, permissions, clients, cash funding and paid
// trades. The fixed withdrawal planner uses liquidity, not spending-equity
// headroom. Four economies/12 months of immutable36 AI/human turns, RNG,
// half-ready saves, views and rematch match exactly; legacy goldens unchanged.
// Authorized income-stabilization checkpoint66 (September14): reporting8.16/
// 9.29, serviced fees8.17/9.30 and explicit9.31 portfolio administration.
// Scoped exact creation/AI/RNG/settlement/views against immutable5309a5ef and
// 0033ac47 references preserve the older reporting/servicing versions; prior
// Group0-9 and intermediate version replays remain separate frozen tests.
// Three credit-investment regressions verify paid collections/risk preparation,
// no duplicate supplier charge and exclusion of named-credit principal/interest
// movements from ordinary projected originations. New-rule three-transport
// recovery/privacy checks pass. No historical golden/reference was regenerated.
// This review pin does not waive the still-open full release or balance gate.
// Follow-through: product comparisons and staffing acceptance now share the same
// 9.31-only principal bridge; products also use paid collection/risk preparation.
// Four targeted regressions, four workload tests (including exact0033 replay),
// three new-rule transports and legacy product/UI/architecture checks pass.
// No historical fixture regenerated; long-run balance remains an open gate.
// Reporting-only follow-through: optional numeric9.31 source terms preserve the
// ledger contract and old reader acceptance. Three months of exact04f118ef
// economics/AI/RNG/state (excluding only new diagnostic fields), seven UI tests,
// four workload tests and three current simulated transports pass. No old golden
// was regenerated; full release and long-run balance acceptance remain open.
// Explicit8.18/9.32 service-based economics removes automatic bonuses and
// centralizes the provisional12K salary, retaining18K on all older campaigns.
// Three actual new-rule months match the captured private experiment; old-rule
// creation/AI/RNG/state/views replay exactly against immutabledd9c768a. Strict
// recovery/rematch/peer and actual recruitment UI tests pass. No golden changed.
// Shared relationship workload preserves the original left-to-right arithmetic.
// Fractional/offer cases, actual fee/context checks and two-month Core8.18 and
// Expanded9.32 creation/AI/RNG/state/private-view replay match immutable225d28be.
// No rates, rules, old reference bytes or goldens changed in this consolidation.
// Explicit Core8.19 / bank economics2 uses the existing accounting engine for
// funded growth, full retained earnings and backed portfolio transfers. Legacy
// Core8.18 and Expanded9.32 replay exactly against preserved225d28be; older
// economics also replay againstdd9c768a. Core lifecycle, pure UI/forecast,
// transaction, three simulated transports and24 strategy cases are scoped
// evidence only, not full release acceptance. No old golden was regenerated.
// Existing edition buttons now select those verified economic rules. Historical
// direct/reporting-only proposals retain their defaults. Current Core8.19 and
// Expanded9.32 create/AI/RNG/state/private views replay exactly against unchanged
// 3730536d explicit-rule reference; setup, cancellation and six current lobby
// pairs pass. This changes creation choices, not settlement or old goldens.
// Authorized V4 workflow stabilization, checkpoint67 (September14): explicit
// finite new-human starting work, applicable AI submission validation, pure
// loan-flow reporting, invocation-local reserve caching and the current-only
// duplicate recovery-cost repair. No save marker, rates or score weights added.
// v4-workflow-final67 preserves exact rc2 creation/plans/world/RNG across four
// Core/Expanded seed profiles and12 months. Nine focused workflow checks cover
// old defaults/saves, paid capacity, rematch, recovery and AI rollback. The48
// legacy long campaigns also pass. Existing historical fixtures are untouched.
// The pin records these authorized changes, not a waiver of remaining sweep,
// gameplay, long-run strategy or physical multiplayer acceptance.
// Checkpoint68: explicit9.33 persistent bank rivalry, new setup only. No
// financial/rate changes. bank_rivalry.test replays old9.32 creation, AI,
// settlement, RNG and private views against byte-checked1cb80c01; it reproduces
// the old auction and validates new-rule persistence, receivership and privacy.
// New/current lobby pairs and old-peer refusal pass on all three transports.
// Follow-up terminal validation admits both existing institutional failure
// reasons. A funded three-month covenant failure, ended save, both owner views
// and rematch pass. Old9.32 exact replay and three transport pairs were rerun;
// the completed120-month9.33 snapshot restores exactly under the correction.
// This pin is not long-run strategic or physical two-computer acceptance.
// rc4 re-pin. Core gains researchProgramVersion (save 8.20) behind an explicit
// edition opt-in; un-opted Core 8.19 and Expanded 9.33 both replay exactly against
// their recorded reference builds. Scoped checks rerun before this fingerprint
// moved: behavior-golden, runtime-stages, determinism, campaign-lifecycle,
// bank_economics, bank_rivalry, expanded_edition, expanded_edition_network, build,
// engine and research_program; the full suite, with every remaining failure
// confirmed pre-existing on rc3; and game/BRANCH_WARS.html rebuilt from source to
// the byte-identical portable hash shipped in releases/v4-rc4.
// This pin is still not long-run strategic or physical two-computer acceptance.
// September 20 authorized rc4 defect repair: preserve acquired research models
// at migration and research rules at rematch; integrate gated AI products without
// override debt; remove unreachable Core recovery code. Final-source historical
// bank economics/rivalry, golden behavior, runtime stages, determinism, campaign
// lifecycle and edition/network compatibility commands passed (21 Node entries).
// Legal acquired-model/rematch and UI/AI regression checks pass separately.
// No preserved reference, golden or architecture ceiling was changed.
// September 20, 2026 authorized current-Core AI model repair: the engine delta
// is confined to ai.js. Reverting only that file and reassembling reproduces
// 330309e8cf4c8590e7e688019e62472928aa9cea9053fa98507c24135dac3e72 exactly.
// Current Core gains deterministic operating-context choices and earned/funded
// adoption; older profiles retain the exact chooser and RNG. No economic
// formula or investment priority changed. Named final-source checks passed
// before this move: behavior-golden, runtime-stages, determinism,
// campaign-lifecycle, bank_economics, bank_rivalry, expanded_edition,
// expanded_edition_network, tests/build.test.js, research_program and research_bot.
// No historical reference, golden or architecture ceiling was changed.
// This pin does not convert a failed gate into a pass or certify game balance.
// rc4 fixes re-pin. Default Core setup now opts into the research programme, and
// previewFeatureSelection drops that Core-only marker when a selection moves off
// Core economics instead of invalidating the whole proposal. Scoped checks rerun:
// behavior-golden, runtime-stages, determinism, campaign-lifecycle, bank_economics,
// bank_rivalry, expanded_edition, expanded_edition_network, feature_setup,
// github_resilience, build, engine and research_program.
// Mandate rescale re-pin. Every mandate threshold was set for the old economy and sat
// far below the 25th percentile of a finished bank (deposits $40M against p25 $580M),
// so all 12 measured campaigns achieved theirs. Thresholds now sit near the measured
// median; achievement across the eight mandates ranges 30-75% instead of 100%. The
// engine-level chooseBot override added for product gating was also removed: bot
// policy moved into ai.js, which architecture.test.js requires. Scoped checks rerun:
// behavior-golden, runtime-stages, determinism, campaign-lifecycle, bank_economics,
// bank_rivalry, expanded_edition(+_network), campaign-lifecycle, build, engine,
// architecture, feature_setup, github_resilience, research_program, agency_legacy_compat,
// agency_peer_compat and v31_version_boundary.
// rc5 merge re-pin. The published rc5 repair (tag v4.0.0-rc5, never merged to main)
// joins main's later work. ai.js keeps main's shared researchAllowedProducts gate and
// takes rc5's context-based chooser for all 18 Core models; migration validates models
// against the campaign's own table, so reload no longer strips Risk & Capital or third
// models; rematch re-initialises the research marker; unreachable Core recovery code is
// removed. research_bot proves plans and RNG match the published rc4 bot except for the
// model choice. Scoped checks rerun: build, architecture, behavior-golden, runtime-stages,
// determinism, campaign-lifecycle, bank_economics, bank_rivalry, expanded_edition(+_network),
// engine, research_program(+_ui), research_bot, feature_setup, github_resilience,
// agency_legacy_compat, agency_peer_compat, v31_version_boundary, strategy_workspace,
// package_release and income_review. No reference build, golden or ceiling changed.
// Display-name re-pin. The 8.20 combined capability "Deposit Franchise" shared its
// name with the long-standing Network tier-3 milestone; it is now "Stable Funding
// Base". Its key, requirements and effects are unchanged. Scoped checks rerun:
// behavior-golden, runtime-stages, determinism, campaign-lifecycle, bank_economics,
// bank_rivalry, expanded_edition(+_network), research_program(+_ui), research_bot,
// build, engine, strategy_release_ui, strategy_workspace, income_review_ui and
// usability_help. No reference build, golden or ceiling changed.
// Dead-code re-pin. agencyReview (an alias of agencyQuote), commercialMarketDeposits
// and departmentPlanTrainingQuote were referenced nowhere, tests included; removing
// them changes no behaviour. Scoped checks rerun: behavior-golden, runtime-stages,
// determinism, campaign-lifecycle, bank_economics, bank_rivalry, expanded_edition,
// research_program, research_bot, build, engine, architecture(+_scope), agency(+_ui,
// _legacy_compat, _peer_compat), commercial_accounts(+_ui), departments,
// department_obligations, department_ai_affordability, department_functions_ui,
// accounting_payables, company_auction_kernel, shared_premises_boundary,
// company_consolidation_legacy(+ --consolidation), v31_version_boundary and docs.
// Expanded 9.34 re-pin. balanceSheetLendingVersion:1 adds central deployment of the
// funded deposit gap, the AI's last-full-service-office guard, deposit growth in its
// conversion value and a recovery search that keeps lending through a thin month.
// Every change is gated on the marker: balance_sheet_lending replays 9.33 against the
// frozen rc4 package. Scoped checks rerun: behavior-golden, runtime-stages,
// determinism, campaign-lifecycle, bank_economics(+_ui), bank_rivalry,
// expanded_edition(+_network), research_program(+_ui), research_bot,
// research_delivery_expanded, build, engine, v31_version_boundary, balance_sheet_lending,
// package_release, income_review(+_ui), facility_conversion_lifecycle,
// facility_lifecycle_legacy_compat, facility_extensions_ui, department_runtime,
// department_ai_lending, usability_help, architecture(+_scope) and docs. No reference
// build, golden or ceiling changed.
// September26 user-authorized multiplayer personality: optional preset identities
// and exactly-once plain-text announcements. No prices, staff supply, AI choices
// or campaign rule versions change. Independent replay against the untouched
// pre-edit PR26 portable (9a1a39dd) verifies exact absent-feature creation,
// AI plans/RNG, half-ready migration, actual settlement/restored continuation
// and both views for legacy8.1/Core8.20/Expanded9.33/9.34. announcements.test
// checks used-message economic/RNG neutrality, privacy and once-only publishing;
// bank_logos.test checks optional identity validation and save/transport flow.
// Evidence: reports/local/market-personality-20260926/absent-feature-replay.json.
// No frozen reference, historical golden or architecture ceiling changed.
// September26 optional JPG extension: strict embedded JPEG byte/dimension bounds,
// retaining every preset/absent identity field shape. Exact pre-JPG replay covers
// legacy8.1/Core8.20/Expanded9.33/9.34 creation, AI/RNG, half-ready migration,
// settlement and both views. JPEG-active tests cover neutral results, rematch,
// private lobby edits and three simulated transports. No golden changed.
// Evidence: reports/local/jpg-logos-20260926/absent-feature-replay.json.
// September26 authorized Expanded Federal Funds implementation, explicit9.35.
// Fixed/repricing securities and funded maturities, market-valued early sales,
// opening-debt interest, calendar/RNG, private quotes and peer/save boundaries.
// Exact pre-Fed replay against preserved48bfd475 covers legacy8.1/Core8.20/
// Expanded9.33/9.34 creation, AI/RNG, half-ready restore, settlement and both
// views. Domain/UI tests and three simulated transports pass; no historical
// reference, golden or override ceiling changed. This is not human acceptance.
// Evidence: reports/local/federal-funds-20260926/absent-feature-replay.json.
// September27 user-authorized Expanded business consolidation, explicit9.36
// and expandedBusinessVersion:1. Adds paid advertising/sponsorship obligations,
// shared digital delivery, modern recovery and funded holding-company orders;
// retires obsolete launches only in new rules. Core and historical boundaries
// retain their original state, AI/RNG, paid projects, settlement and private views.
// Independent replay against the preserved pre-consolidation9.35 portable
// (10adb666, engine e348b9f3) passed expanded_business7/7 and holding_capital11/11,
// including actual legacy paid work, funded company trades and half-ready restore.
// Both durable local-replay receipts verify unchanged current/baseline sources.
// Focused new engine/UI suites and54 isolated portable browser checks also pass.
// Evidence: reports/local/expanded-consolidation-20260927/README.md, the
// expanded-business-local-replay and holding-capital-local-replay receipts there.
// No historical golden, reference build or architecture ceiling was changed.
// The complete fast gate is recorded separately; this pin is not release balance
// or physical multiplayer acceptance.
// Authorized 9.37 paid capability/funding milestone: six-month exact 9.36 replay
// plus complete paid customer journey and focused funding checks, recorded in
// reports/local/digital-commercial-20260927/. Historical fixtures unchanged.
// Authorized 9.38 partner-card boundary: Cedar-funded customer receivables,
// finite central delivery and paired fees/costs only in explicitly new campaigns.
// Six-month Core8.20 and Expanded9.37 creation, AI/RNG, half-ready recovery,
// settlement and owner views match the preserved polished9.37 portable exactly.
// Evidence: reports/local/partner-cards-20260927/historical-replay.json.
// Focused source/portable, actual browser and eighteen-month legal replay checks
// passed. No preserved reference, historical golden or ceiling was changed.
// This reviewed fingerprint is not balance or human multiplayer acceptance.
// Authorized 9.39 card calibration: explicit cardEconomicsVersion1 scales
// outsourced-program costs and oversight, and retains lifetime contribution.
// Exact Core8.20 and Expanded9.38 AI/recovery/private-view comparisons plus
// eight months of the earned active9.38 card contract pass against preserved9.38.
// See reports/local/card-balance-20260927/historical-replay.json. Existing
// frozen references, historical goldens and architecture ceilings are unchanged.
// Controlled profitability checks exclude shared research/payroll; no human
// balance or physical multiplayer acceptance is inferred from this digest.
// September28 playtest follow-up. Stored bank logos may be 400 x 400 pixels and
// 150 KB; the monthly deposit gain is written as three named terms with identical
// arithmetic; and forecast-drivers.js adds a read-only Growth & limits forecast that
// records those terms only while a forecast asks. Seeded Core8.20 and Expanded9.34
// and9.39 campaigns replay identically against the 9.39 engine (e0fe9597) for five
// months in Balanced and Rate. Scoped checks rerun: behavior-golden, runtime-stages,
// determinism, campaign-lifecycle, bank_economics(+_ui), bank_rivalry,
// expanded_edition(+_network), research_program(+_ui), research_bot,
// research_delivery_expanded, build, engine, v31_version_boundary,
// balance_sheet_lending, package_release, income_review(+_ui), core_loan_income_ui,
// core_balance_sheet(+_ui), monetary_policy(+_ui,_network), expanded_business,
// holding_capital, partner_cards, partner_card_economics, digital_commercial,
// outside_funding, announcements, bank_logos, bank_logo_uploads, forecast_drivers,
// interface_shell, interface_markets, interface_banking_group,
// interface_people_strategy, operations_workspace, workspace_ownership,
// usability_help, architecture(+_scope), docs, agency_legacy_compat,
// agency_peer_compat, facility_lifecycle_quotes, facility_conversion_lifecycle,
// department_runtime and department_ai_lending. No reference build, golden or
// ceiling changed.
// Expanded 9.40 bank-issued cards. bankCardsVersion1 adds a second card route in which
// the bank funds, owns and services its card book; the partner route is the 9.39
// contract. Seeded 9.38 and 9.39 partner-card campaigns replay byte-identically against
// the 9.39 engine for 16 months, including wind-down. Scoped checks rerun: bank_cards,
// partner_cards, partner_card_economics, expanded_edition(+_network),
// monetary_policy(+_network), facility_extensions_ui, package_release,
// interface_banking_group, interface_shell, interface_markets, interface_people_strategy,
// digital_commercial, outside_funding, corporate_income, feature_network, feature_setup,
// features, forecast_drivers, behavior-golden, runtime-stages, determinism,
// campaign-lifecycle, save_integrity, v31_version_boundary, engine, bank_economics,
// bank_rivalry, research_program, announcements, bank_logos, holding_capital,
// expanded_business, operations_workspace, workspace_ownership, balance_sheet_lending,
// company_bank_funding, income_review, usability_help, build, architecture(+_scope) and
// docs. Version expectations moved to 9.40 in five tests, deliberately. No reference
// build, golden or ceiling changed.
// Card programs below the capital reserve. A running program the bank cannot pay for is
// no longer a plan commitment (it pauses at settlement, as before), and the AI does not
// stage a launch the reserve would reject. Only states in which the reserve rejected
// every plan that kept the program change: seeded 9.38, 9.39 and 9.40 card campaigns
// (16 months) and Core 8.20 and Expanded 9.39 Balanced and Rate campaigns (5 months)
// replay byte-identically against the previous engine. Scoped checks rerun:
// card_capital_reserve (fails on the previous engine with the original error),
// bank_cards, partner_cards, partner_card_economics, interface_people_strategy,
// interface_shell, interface_banking_group, interface_markets, research_program_ui,
// strategy_workspace, strategy_release_ui, digital_commercial, operations_workspace,
// workspace_ownership, core_balance_sheet_ui, usability_help and docs.
// Expanded 9.41 research tree. New Expanded campaigns fund a 36-node tree; every
// research consumer multiplies by ResearchTree terms that are exactly 1 outside a
// tree campaign. Seeded Expanded 9.40, 9.39 and Core 8.20 campaigns replay
// byte-identically against the previous engine. Scoped checks rerun: research_tree,
// interface_people_strategy, research_program, research_program_ui, research_bot,
// digital_commercial, bank_cards, card_capital_reserve, partner_cards, expanded
// edition and version tests, usability_help and docs.
const expected="7e03acf1ad5bb54f1f4f58aa578cf0a363c30741fdf8d2a9cb7d1e97935f2eb5";
assert.equal(createHash('sha256').update(engine).digest('hex'),expected,'The reviewed integration engine changed; repeat scoped compatibility and repair checks before updating its fingerprint');
console.log(JSON.stringify({suite:'usability-engine-boundary',engineSha256:expected,scope:'Exact assembled simulation byte preservation; not UI, runtime or release acceptance.'}));
