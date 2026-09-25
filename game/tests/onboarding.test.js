'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), copy = value => JSON.parse(JSON.stringify(value));
let engine;
if (process.argv.includes('--source')) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
  engine = fs.readFileSync(path.join(root, 'src', manifest.engine.shell), 'utf8').replace('/* @modules */', () =>
    manifest.engine.modules.map(file => fs.readFileSync(path.join(root, 'src', file), 'utf8')).join('\n'));
} else engine = fs.readFileSync(path.join(root, 'BRANCH_WARS.html'), 'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const hooks = `root.onboardingTest={initializeOnboarding,settleOnboarding,adjustOnboardingReport,validateOnboardingSave,
  onboardingCalculate,onboardingDraft,depositRate,applyHouseholdPolicy,planAdvertising,planOnboarding,onboardingPlanForecast,onboardingContinuation,onboardingCheckBoundary,withMarket,delta,syncAccounts,
  reconsiderOnboardingPending,planFinalCashReserve,aiCashPlanningReview,
  traceFinalChoice(g,index,withoutRetry=false){
    const retry=reconsiderOnboardingPending,trim=planFinalCashReserve;let retries=0,cashPasses=0;
    reconsiderOnboardingPending=function(...args){retries++;return withoutRetry?args[2]:retry(...args)};
    planFinalCashReserve=function(...args){cashPasses++;return trim(...args)};
    try{return{plan:root.BWEngine.chooseBot(g,index),retries,cashPasses}}finally{reconsiderOnboardingPending=retry;planFinalCashReserve=trim}
  }};\n`;
const context = { console }; vm.runInNewContext(engine.replace('root.BWEngine={', () => hooks + 'root.BWEngine={'), context);
const E = context.BWEngine, H = context.onboardingTest;
const options = { onboardingVersion: 1, relationshipOffersVersion: 1, regionalGrowthVersion: 1, advertisingVersion: 1, productProgramsVersion: 1,
  segmentDepositsVersion: 1, creditPerformanceVersion: 1, customerOwnershipVersion: 1, workforceVersion: 1,
  customerDemandVersion: 2, managementVersion: 2, serviceExpansionVersion: 1, campaignRulesVersion: 1,
  mode: 'hotseat', seed: 'onboarding-core', created: 1 };
const fresh = extra => E.createGame({ ...options, ...extra });
const plan = (p, extra = {}) => ({ focus: p.focus, allocation: { ...p.allocation }, decision: 'b', depositPolicy: 'balanced',
  lendingPolicy: 'balanced', capitalPolicy: 'balanced', products: { ...p.products }, newProjects: [], investments: {}, hires: 0,
  competitiveAction: 'none', opportunity: null, ...extra });
const policy = (share = 50, extra = {}) => ({ market: 'downtown', segment: 'connected', product: 'essential', share, ...extra });
function target(g, p, selected = policy()) {
  if (selected.product !== 'essential') E.finishProject(g, p, { key: selected.product === 'rewards' ? 'licenseRewards' : 'licenseHighYield', target: null });
  const targets = E.productProgramPolicy(p); targets.markets[selected.market][selected.segment] = { essential: 1, rewards: 0, highYield: 0, [selected.product]: 4 };
  E.applyProductProgramPolicy(p, targets); p.allocation = { service: 4, business: 2, lending: 1, operations: 1 };
  H.applyHouseholdPolicy(p, { ...p.householdBook.policy, retention: 25 }); E.applyOnboardingPolicy(p, selected);
}
function isolated(g) {
  for (const p of g.players) {
    H.settleOnboarding(g, p); p.operatingReport = { expense: 0, profit: 100000, depositGrowth: 0 };
    H.adjustOnboardingReport(p, p.operatingReport); p.depositBook.asOfCycle = g.cycle;
    delete p.marketQuota; delete p.marketSupply; delete p._onboardingBudget;
  }
  g.cycle++; H.validateOnboardingSave(g); g.players.forEach(p => E.AccountingPrototype.check(p.accounting));
}
function turn(g, extras = [{}, {}]) {
  g.event = { ...E.EVENTS.find(e => e.key === 'quiet') }; g.opportunities = [];
  const capacities = g.players.map(p => E.regionalBranchMetrics(p).depositCapacity);
  g.players.forEach((p, i) => E.submit(g, i, plan(p, extras[i])));
  E.validatePilot(g); E.validateLedger(g); g.players.forEach(p => E.AccountingPrototype.check(p.accounting));
  g.players.forEach((p, i) => assert(p.operatingReport.customerAcquiredDeposits + p.operatingReport.onboardingDeposits <= capacities[i], 'Combined ordinary and onboarding intake exceeded branch capacity'));
}
function owned(p) { return copy({ stats: p.stats, accounting: p.accounting, marketBook: p.marketBook, households: p.householdBook.markets, cohorts: p.depositBook.cohorts }); }
const g = fresh(), p = g.players[0]; assert.equal(g.version, '8.13'); assert.equal(p.onboarding.report, null); assert.deepEqual(copy(p.onboarding.pending), []); E.validatePilot(g);
assert.throws(() => fresh({ onboardingVersion: 2 }), /onboarding/i);
assert.throws(() => fresh({ relationshipOffersVersion: 0 }), /requires/i);
const old = fresh({ onboardingVersion: 0 }), oldBefore = JSON.stringify(old);
assert.equal(old.version, '8.12'); assert.equal(E.onboardingReview(old.players[0], old), null); assert.equal(H.settleOnboarding(old, old.players[0]), null);
assert.equal(E.onboardingBudget(old.players[0], {}), 0); assert.equal(E.onboardingSalesStaff(old.players[0], 3), 3); assert.equal(JSON.stringify(old), oldBefore);
assert.throws(() => E.normalizeOnboardingPlan(old.players[0], { onboardingPolicy: policy() }), /requires/i);
for (const damage of [x => x.share = 30, x => x.product = '__proto__', x => x.segment = 'absent', x => x.market = 'absent', x => x.extra = 1]) {
  const bad = policy(); damage(bad); assert.throws(() => E.normalizeOnboardingPlan(p, { onboardingPolicy: bad }));
}

// An application changes neither ownership, funding nor guarantees. The quote
// has no RNG, side effects or hidden-bank data and is a detached projection.
target(g, p); const initial = JSON.stringify(g), initialOwned = owned(p), initialWorld = copy(g.marketEconomy);
const quote = E.onboardingReview(p, g); assert.equal(quote.assignedStaff, 1.5); assert.equal(quote.salesStaff, 1.5); assert.equal(quote.capacity, 30);
assert.equal(quote.totals.activated.count, 0); assert.equal(quote.totals.generated.count, 18); assert.equal(quote.cost, 0); assert.equal(quote.budget, 0);
assert.equal(quote.response, .6000000000000001); assert.equal(E.onboardingSalesStaff(p, 3), 1.5);
for (let i = 0; i < 3; i++) E.onboardingReview(p, g); assert.equal(JSON.stringify(g), initial);
assert(!JSON.stringify(quote).includes('accounting')); assert(!JSON.stringify(quote).includes('community')); assert(!JSON.stringify(quote).includes('union'));
quote.policy.share = 0; assert.equal(p.onboarding.policy.share, 50);
const first = H.settleOnboarding(g, p); assert.deepEqual(owned(p), initialOwned); assert.deepEqual(copy(g.marketEconomy), initialWorld);
assert.equal(first.generatedBatch.createdCycle, 1); assert.equal(first.generatedBatch.eligibleCycle, 2); assert.equal(first.generatedBatch.expiresCycle, 4);
assert(first.generatedBatch.principal <= first.generatedBatch.count * E.ONBOARDING_MAX_PRINCIPAL);
const firstSnapshot = JSON.stringify(g); H.settleOnboarding(g, p); assert.equal(JSON.stringify(g), firstSnapshot, 'Duplicate settlement generated twice');
isolated(g); const due = E.onboardingReview(p, g), principalBefore = p.stats.deposits, peopleBefore = p.stats.customers, equityBefore = p.stats.capital, cashBefore = p.stats.cash;
assert(due.totals.activated.count > 0); assert.equal(E.onboardingBudget(p, {}), due.budget);
const accountsBefore = copy(p.accounting), sourceBefore = copy(g.marketEconomy), cohortsBefore = copy(p.depositBook.cohorts), active = H.settleOnboarding(g, p);
assert.equal(p.stats.customers - peopleBefore, active.totals.activated.count); assert.equal(p.stats.deposits - principalBefore, active.totals.activated.principal);
assert.equal(p.stats.cash - cashBefore, active.totals.activated.principal); assert.equal(p.stats.capital, equityBefore); assert.equal(p.stats.emergencyDebt, accountsBefore.accounts.emergencyDebt);
assert.equal(p.marketQuota.customers.downtown, E.marketSupply({ ...g, marketEconomy: sourceBefore }, { ...p, marketQuota: undefined }, true).customers.downtown - active.totals.activated.count);
for (const key of Object.keys(sourceBefore.markets)) assert.deepEqual(copy(g.marketEconomy.markets[key].total), sourceBefore.markets[key].total);
for (const c of cohortsBefore) assert(p.depositBook.cohorts.some(row => JSON.stringify(row) === JSON.stringify(c)), 'Existing account promise changed');
const report = { expense: 10, profit: 1000, depositGrowth: 30, customerAcquiredDeposits: 17 }; H.adjustOnboardingReport(p, report);
assert.equal(report.expense, 10 + active.cost); assert.equal(report.profit, 1000 - active.cost); assert.equal(report.depositGrowth, 30 + active.totals.activated.principal);
assert.equal(report.customerAcquiredDeposits, 17); const charged = JSON.stringify(report); H.adjustOnboardingReport(p, report); assert.equal(JSON.stringify(report), charged);
assert.throws(() => H.adjustOnboardingReport(p, { ...report, onboardingCost: report.onboardingCost + 1 }), /disagrees/);

// Both quotas and selected segment stocks must fund the same activation; a
// shortage of either clips jointly, preserving the unfunded request remainder.
const limited = fresh(); target(limited, limited.players[0]); isolated(limited); const lp = limited.players[0], pendingBefore = copy(lp.onboarding.pending[0]);
lp.marketQuota = E.marketSupply(limited, lp, true); lp.marketQuota.customers.downtown = 3; lp.marketQuota.deposits.downtown = Math.floor(pendingBefore.principal / pendingBefore.count * 2);
const limitQuote = E.onboardingReview(lp, limited); assert(limitQuote.totals.activated.count <= 2); assert(limitQuote.stockLimited);
const limitActual = H.settleOnboarding(limited, lp); assert.deepEqual(copy(limitActual), copy(limitQuote)); assert(lp.marketQuota.deposits.downtown >= 0); assert(lp.marketQuota.customers.downtown >= 0);
const empty = fresh(); target(empty, empty.players[0]); isolated(empty); const ep = empty.players[0];
ep.marketQuota = E.marketSupply(empty, ep, true); ep.marketQuota.deposits.downtown = 0;
const emptyBefore = owned(ep), emptyQuote = H.settleOnboarding(empty, ep); assert.equal(emptyQuote.totals.activated.count, 0); assert.deepEqual(owned(ep), emptyBefore);

// Cash, equity headroom, committed costs and nominal ceilings cannot be funded
// by new deposits or emergency borrowing. Released reserves do not raise quotes.
const budget = fresh(); target(budget, budget.players[0]); isolated(budget); const bp = budget.players[0], nominal = E.onboardingBudget(bp, {});
assert(nominal > 0); bp._onboardingBudget = 0; assert.equal(E.onboardingReview(bp, budget).totals.activated.count, 0);
bp._onboardingBudget = nominal; bp._workforceReserved = bp.stats.cash;
const stopped = E.onboardingReview(bp, budget); assert.equal(stopped.cost, 0); assert(stopped.budgetLimited); assert.equal(stopped.reason, 'cash-reserve');
delete bp._workforceReserved; const available = E.onboardingReview(bp, budget).available;
bp._workforceReserved = 111; bp._advertisingCycle = { spent: 222 }; bp._workforceCosts = { training: { total: 333 } }; bp._relationshipOfferBudget = 444;
assert.equal(E.onboardingReview(bp, budget).available, available - 111 - 222 - 333 - 444);
bp.relationshipOffers.report = { cycle: budget.cycle, cost: 77 }; assert.equal(E.onboardingReview(bp, budget).available, available - 111 - 222 - 333 - 77);
const noTime = copy(bp); noTime.householdBook.policy.retention = 100; assert.equal(E.onboardingReview(noTime, budget).capacity, 0);
const offers = copy(bp); offers.relationshipOffers.policy.share = 50; assert.equal(E.onboardingReview(offers, budget).assignedStaff, .75);

// Pending age advances even while disabled. Closure cancels rather than changing
// the requested product. Full retirement remains saveable after settlement.
const expiry = fresh(); target(expiry, expiry.players[0]); isolated(expiry); const xp = expiry.players[0], expCount = xp.onboarding.pending[0].count;
E.applyOnboardingPolicy(xp, policy(0)); isolated(expiry); assert.equal(xp.onboarding.report.totals.due.count, expCount); assert.equal(xp.onboarding.pending.length, 1);
isolated(expiry); assert.equal(xp.onboarding.pending.length, 1); isolated(expiry); assert.equal(xp.onboarding.report.totals.expired.count, expCount); assert.equal(xp.onboarding.pending.length, 0);
const retired = fresh(); target(retired, retired.players[0], policy(50, { product: 'rewards' })); isolated(retired); const rp = retired.players[0], retirement = E.productProgramPolicy(rp);
retirement.retire = ['rewards']; for (const row of Object.values(retirement.markets)) for (const mix of Object.values(row)) { mix.rewards = 0; mix.essential = 4; }
E.applyProductProgramPolicy(rp, retirement); E.applyOnboardingPolicy(rp, rp.onboarding.policy); isolated(retired);
assert.equal(rp.onboarding.policy.share, 0); assert(rp.onboarding.report.totals.cancelled.count > 0); assert.equal(rp.onboarding.pending.length, 0);
assert.equal(E.onboardingBudget(rp, plan(rp, { productProgramPolicy: retirement })), 0, 'Prepared retirement was executed twice in budget');

// Rates are quoted on activation, not application. No term sweep or expired
// promotional promise is reapplied to newly opened high-yield accounts.
const savings = fresh(); target(savings, savings.players[0], policy(50, { product: 'highYield', segment: 'reserve' })); isolated(savings);
savings.economy = copy(E.MACRO_REGIMES.tight); const sp = savings.players[0]; sp.policies.deposit = 'aggressive';
const sensitiveBefore = sp.stats.rateSensitiveDeposits, rate = H.depositRate(sp, savings, 'highYield'), savingsActual = H.settleOnboarding(savings, sp);
assert(savingsActual.totals.activated.count > 0); const opened = sp.depositBook.cohorts.find(c => c.product === 'highYield' && c.quotedCycle === savings.cycle);
assert.equal(opened.rate, rate); assert.equal(opened.remaining, 6); assert.equal(opened.locked, undefined); assert.equal(opened.exiting, 0);
assert.equal(sp.stats.rateSensitiveDeposits - sensitiveBefore, Math.round(savingsActual.totals.activated.principal * (.3 + .16)));
assert(sp.stats.rateSensitiveDeposits <= sp.stats.deposits);

// Invalid patches fail before any mutation; state/report corruption is rejected.
const corrupt = fresh(); target(corrupt, corrupt.players[0]); isolated(corrupt);
corrupt.marketEconomy.markets.downtown.segmentDeposits.community.connected--;
const corruptBefore = JSON.stringify(corrupt); assert.throws(() => H.settleOnboarding(corrupt, corrupt.players[0]), /disagree/); assert.equal(JSON.stringify(corrupt), corruptBefore);
const valid = fresh(); target(valid, valid.players[0]); isolated(valid); isolated(valid); H.validateOnboardingSave(valid);
for (const damage of [x => x.onboarding.pending.push({ ...x.onboarding.pending[0] }), x => x.onboarding.pending[0].principal++,
  x => x.onboarding.report.cost++, x => x.onboarding.report.workUsed++, x => x.onboarding.report.totals.before.count++,
  x => x.onboarding.report.rows[0].activatedPrincipal++, x => x.onboarding.report.generatedBatch.expiresCycle++,
  x => x.onboarding.lastCycle--, x => x._onboardingBudget = 0, x => x.onboarding.report.rows[0].rival = {}]) {
  const bad = copy(valid); damage(bad.players[0]); assert.throws(() => H.validateOnboardingSave(bad));
}
const terminal = copy(valid); terminal.gameOver = true; terminal.cycle--; H.validateOnboardingSave(terminal);
const terminalBefore = JSON.stringify(terminal); H.settleOnboarding(terminal, terminal.players[0]); assert.equal(JSON.stringify(terminal), terminalBefore);
assert.equal(E.onboardingReview(terminal.players[0], terminal).cycle, terminal.cycle + 1, 'Terminal review is conditional next boundary, not duplicate settlement');
const disabled = fresh(); isolated(disabled);
for (const damage of [x => x.generatedBatch = false, x => x.generatedBatch = 0, x => x.generatedBatch = '', x => x.reason = 'cash-reserve', x => x.budgetLimited = true, x => x.stockLimited = true]) {
  const bad = copy(disabled); damage(bad.players[0].onboarding.report); assert.throws(() => H.validateOnboardingSave(bad));
}

// Full monthly chronology, private public-state forecasts and replay. Ordinary
// acquisition and onboarding share remaining quotas; both remain conserved.
const replay = fresh(); target(replay, replay.players[0], policy(50, { product: 'rewards' })); target(replay, replay.players[1], policy(50, { product: 'rewards' }));
turn(replay); assert(replay.players[0].onboarding.pending.length); const replayCopy = copy(replay);
const publicBank = E.publicState(replay, 0).me, forecastPlan = plan(publicBank), pureBefore = JSON.stringify(replay);
const forecast = E.operatingPreview(publicBank, forecastPlan, replay.economy); assert(forecast.onboardingActivated > 0); assert.equal(JSON.stringify(replay), pureBefore);
assert.equal(forecast.onboardingDeposits, E.onboardingReview(publicBank, replay).totals.activated.principal);
// Onboarding activation expense is already included in operating profit. The
// recovery and service/staffing helpers must not subtract its nominal budget a
// second time as an investment, including when a real pending batch is funded.
const financePlan = plan(publicBank, { onboardingPolicy: copy(publicBank.onboarding.policy), householdPolicy: copy(publicBank.householdBook.policy),
  workforcePolicy: copy(publicBank.workforce.policy), servicePolicy: copy(publicBank.serviceDesk.policy) });
const financeBefore = JSON.stringify({ publicBank, financePlan, replay }), financeBudget = E.planBudget(publicBank, financePlan),
  financeForecast = E.operatingPreview(publicBank, financePlan, replay.economy), recovery = E.bankRecoveryReview(publicBank, financePlan, replay.economy),
  serviceFinance = E.servicePlanReview(publicBank, financePlan, replay.economy);
assert(financeBudget.onboarding > 0); assert(financeForecast.onboardingActivated > 0); assert(financeForecast.onboardingCost > 0);
assert.equal(financeBudget.onboarding, financeForecast.onboardingCost);
const included = financeBudget.advertising + financeBudget.training + financeBudget.relationshipOffers + financeBudget.onboarding;
assert.equal(recovery.operatingSpend, included); assert.equal(recovery.nonOperatingSpend, financeBudget.total - included); assert.equal(recovery.nonOperatingSpend, 0);
assert.equal(recovery.netAfterSpend, financeForecast.profit - (financeForecast.fundingLoss || 0)); assert.equal(recovery.equityAfterPlan, financeForecast.closingEquity);
assert.equal(serviceFinance.includedOperatingSpend, included); assert.equal(serviceFinance.nonOperatingSpend, 0);
assert.equal(serviceFinance.netAfterSpend, financeForecast.profit - (financeForecast.fundingLoss || 0));
const workforceComparison = E.serviceWorkforceOptions(publicBank, financePlan, replay.economy), currentWorkforce = workforceComparison.options.find(row => row.id === 'current');
assert.equal(currentWorkforce.budget.onboarding, financeBudget.onboarding); assert.equal(currentWorkforce.forecast.onboardingCost, financeForecast.onboardingCost);
assert.equal(currentWorkforce.bankProfit, financeForecast.profit - (financeForecast.fundingLoss || 0));
assert.equal(JSON.stringify({ publicBank, financePlan, replay }), financeBefore, 'Financial comparisons mutated owned books, draft or RNG');

// The actual discretionary-pause alternative decommits the recurring channel,
// not an owned asset. Pending applications still age/expire and cannot create a
// refund or income. Include an unstarted investment to expose the safe option.
const committedPlan = { ...financePlan, investments: { digital: 10000 } }, pauseBefore = JSON.stringify({ publicBank, committedPlan, replay });
const pause = E.bankRecoveryOptions(publicBank, committedPlan, replay.economy).options.find(row => row.key === 'commitments');
assert(pause); assert.equal(pause.plan.onboardingPolicy.share, 0); assert(pause.changes.some(text => text.includes('applications still expire')));
assert.equal(pause.plan.investments.digital, undefined); assert.equal(pause.review.nonOperatingSpend, 0);
const pausedForecast = E.operatingPreview(publicBank, pause.plan, replay.economy);
assert.equal(pausedForecast.onboardingActivated, 0); assert.equal(pausedForecast.onboardingDeposits, 0); assert.equal(pausedForecast.onboardingCost, 0);
assert.equal(pause.review.netAfterSpend, pausedForecast.profit - (pausedForecast.fundingLoss || 0));
assert.equal(JSON.stringify({ publicBank, committedPlan, replay }), pauseBefore);
const pausedWorld = copy(replay), pausedOwner = pausedWorld.players[0]; E.applyOnboardingPolicy(pausedOwner, pause.plan.onboardingPolicy);
const pausedOwned = owned(pausedOwner), pausedOutside = copy(pausedWorld.marketEconomy), pausedActual = H.settleOnboarding(pausedWorld, pausedOwner);
assert(pausedActual.totals.due.count > 0); assert.equal(pausedActual.totals.activated.count, 0); assert.equal(pausedActual.cost, 0);
assert.deepEqual(owned(pausedOwner), pausedOwned); assert.deepEqual(copy(pausedWorld.marketEconomy), pausedOutside);
assert.equal(pausedActual.totals.after.count, pausedActual.totals.before.count);
for (let i = 0; i < 3; i++) isolated(pausedWorld);
assert(pausedOwner.onboarding.report.totals.expired.count > 0); assert.equal(pausedOwner.onboarding.pending.length, 0);
assert.deepEqual(owned(pausedOwner), pausedOwned, 'Expiry of nonbinding requests created income or cash');
for (let i = 0; i < 5; i++) { turn(replay); turn(replayCopy); assert.deepEqual(copy(replay), copy(replayCopy)); }
assert(replay.players.some(bank => bank.operatingReport.onboardingActivated > 0)); E.migrateCampaign(copy(replay));
const botBefore = JSON.stringify(replay); H.planOnboarding(replay, 0, plan(replay.players[0])); assert.equal(JSON.stringify(replay), botBefore);
const retirePlan = E.productProgramPolicy(replay.players[0]); retirePlan.retire = ['rewards'];
for (const row of Object.values(retirePlan.markets)) for (const mix of Object.values(row)) { mix.rewards = 0; mix.essential = 4; }
const retirementSnapshot = JSON.stringify({ p: replay.players[0], plan: retirePlan });
for (let i = 0; i < 3; i++) E.planBudget(replay.players[0], plan(replay.players[0], { productProgramPolicy: retirePlan }));
assert.equal(JSON.stringify({ p: replay.players[0], plan: retirePlan }), retirementSnapshot, 'Shallow budget staging mutated nested retirement availability or pending books');
assert.doesNotThrow(() => E.operatingPreview(E.publicState(replay, 0).me, plan(replay.players[0], { productProgramPolicy: retirePlan }), replay.economy));

// Build actual profitable operating history, not a fabricated lastProfit or an
// unbalanced cash override. This also leaves a real generation-cadence boundary.
const ai = fresh({ scenario: 'growth' }); target(ai, ai.players[0], policy(0));
ai.players[0].allocation = { service: 2, business: 1, lending: 4, operations: 1 };
H.applyHouseholdPolicy(ai.players[0], { ...ai.players[0].householdBook.policy, retention: 100 });
for (let i = 0; i < 32; i++) turn(ai, [{ lendingPolicy: 'growth', products: { ...ai.players[0].products, credit: 'consumer' } }, {}]);
ai.players[0].allocation = { service: 4, business: 2, lending: 1, operations: 1 };
H.applyHouseholdPolicy(ai.players[0], { ...ai.players[0].householdBook.policy, retention: 75 });
assert(ai.players[0].stats.lastProfit > 50000); assert.equal(ai.cycle % 3, 0); E.validatePilot(ai);
function aiChoice(world, input = plan(world.players[0])) {
  const publicBefore = JSON.stringify(E.publicState(world, 0)), before = JSON.stringify({ world, input });
  const chosen = H.planOnboarding(world, 0, input), repeated = H.planOnboarding(world, 0, input);
  assert.deepEqual(copy(repeated), copy(chosen), 'AI follow-through must be deterministic');
  assert.equal(JSON.stringify({ world, input }), before, 'AI comparison mutated the authoritative bank, input or RNG');
  assert.equal(JSON.stringify(E.publicState(world, 0)), publicBefore, 'AI comparison changed the owner projection');
  E.validatePilot(world); E.validateLedger(world); world.players.forEach(bank => E.AccountingPrototype.check(bank.accounting));
  return chosen;
}
const aiPlan = aiChoice(ai);
assert.equal(aiPlan.onboardingPolicy.share, 25, 'a funded, serviceable generation candidate should remain reachable');
assert(E.householdServiceReview(ai.players[0], aiPlan.allocation, aiPlan.householdPolicy || ai.players[0].householdBook.policy).coverage >= 1.05);
const completion = copy(ai); turn(completion, [aiPlan, {}]);
assert(completion.players[0].onboarding.report.totals.generated.count > 0);
assert.equal(completion.players[0].onboarding.report.totals.activated.count, 0);
const pendingCount = completion.players[0].onboarding.pending.reduce((n, row) => n + row.count, 0);
H.applyHouseholdPolicy(completion.players[0], { ...completion.players[0].householdBook.policy, retention: 100 });
const pendingPlan = aiChoice(completion);
assert(pendingPlan.onboardingPolicy.share > 0, 'valid pending work can reclaim genuinely spare service time');
assert.equal(pendingPlan.householdPolicy.retention, 75);
assert(E.householdServiceReview(completion.players[0], pendingPlan.allocation, pendingPlan.householdPolicy).coverage >= 1.05);
const completionForecast = E.operatingPreview(E.publicState(completion, 0).me, pendingPlan, completion.economy);
assert(completionForecast.onboardingActivated > 0, 'pending acceptance requires activation, not merely another generated batch');
turn(completion, [pendingPlan, {}]);
assert.equal(completion.players[0].onboarding.report.totals.activated.count, pendingCount, 'the real next boundary can complete this conditionally supported queue');
assert(E.householdServiceReview(completion.players[0]).coverage >= 1.05);

// Advertising's existing 1.00 service-release guard is intentionally weaker
// than onboarding's 1.05 follow-through guard. Build both sides of that boundary
// using conserved household transfers followed by a real resolved month.
const serviceWarm = copy(ai);
H.applyHouseholdPolicy(serviceWarm.players[0], { ...serviceWarm.players[0].householdBook.policy, retention: 100 });
for (let i = 0; i < 2; i++) {
  serviceWarm.economy = { key: 'tight', ...copy(E.MACRO_REGIMES.tight) };
  turn(serviceWarm, [{ depositPolicy: 'margin' }, {}]);
}
function advertisedFixture(customers) {
  const world = copy(serviceWarm), bank = world.players[0];
  H.withMarket(world, () => H.delta(bank, 'customers', customers - bank.stats.customers));
  world.economy = { key: 'tight', ...copy(E.MACRO_REGIMES.tight) };
  turn(world, [{ depositPolicy: 'margin' }, {}]);
  assert(bank.stats.lastProfit > 75000, 'advertising eligibility must come from actual operating income');
  assert.equal(world.cycle % 3, 0);
  const input = plan(bank, { depositPolicy: 'margin' }), before = JSON.stringify({ world, input });
  const advertised = H.planAdvertising(world, 0, input);
  assert.equal(JSON.stringify({ world, input }), before);
  assert.equal(advertised.advertisingPolicy.budget, 15000);
  assert.equal(advertised.householdPolicy.retention, 75);
  return { world, bank, advertised, coverage: E.householdServiceReview(bank, advertised.allocation, advertised.householdPolicy).coverage };
}
const marginal = advertisedFixture(2679);
assert(marginal.coverage >= 1 && marginal.coverage < 1.05, 'fixture must isolate advertising-only service headroom');
const marginalChoice = aiChoice(marginal.world, marginal.advertised);
assert.equal(marginalChoice.onboardingPolicy.share, 0, 'an advertised 1.00–1.05 release must not create an onboarding queue');
assert.deepEqual(copy(marginalChoice.advertisingPolicy), copy(marginal.advertised.advertisingPolicy), 'onboarding does not rewrite the independent advertising decision');

const closingTight = advertisedFixture(2615);
assert(closingTight.coverage >= 1.05, 'the rejection must not be caused by insufficient opening service');
const closingCandidate = { ...closingTight.advertised, onboardingPolicy: policy(25, { segment: 'everyday' }) };
const closingOwner = { ...closingTight.bank, marketSnapshot: closingTight.world.marketEconomy };
const closingBudget = E.planBudget(closingTight.bank, closingCandidate), closingBefore = JSON.stringify({ closingOwner, closingCandidate, closingBudget });
const tightClosing = H.onboardingPlanForecast(closingOwner, closingCandidate, closingTight.world.economy);
const noChannel = E.operatingPreview(closingOwner, { ...closingCandidate, onboardingPolicy: { ...closingCandidate.onboardingPolicy, share: 0 } }, closingTight.world.economy);
assert(tightClosing.onboarding.report.totals.generated.count > 0);
assert(tightClosing.operatingReport.profit > 0 && tightClosing.operatingReport.profit >= noChannel.profit * .98, 'current profit alone would accept the candidate');
assert((tightClosing.operatingReport.fundingLoss || 0) <= (noChannel.fundingLoss || 0));
assert(tightClosing.operatingReport.onboardingCost <= noChannel.profit * .02);
const tightSnapshot = JSON.stringify(tightClosing), continuation = H.onboardingContinuation(tightClosing, closingCandidate, closingBudget);
assert.equal(continuation.eligible, false); assert.equal(continuation.reason, 'service-capacity');
assert.equal(continuation.retention, 100); assert(continuation.pending > continuation.capacity);
assert.equal(aiChoice(closingTight.world, closingTight.advertised).onboardingPolicy.share, 0, 'a current profitable quote cannot substitute for next-month completion capacity');
assert.equal(JSON.stringify(tightClosing), tightSnapshot); assert.equal(JSON.stringify({ closingOwner, closingCandidate, closingBudget }), closingBefore);
const unsafePending = copy(closingTight.world); turn(unsafePending, [closingCandidate, {}]);
const unsafePendingBank = unsafePending.players[0];
assert(unsafePendingBank.onboarding.pending.length, 'human rules still permit a deliberately chosen application pipeline');
H.applyHouseholdPolicy(unsafePendingBank, { ...unsafePendingBank.householdBook.policy, retention: 100 });
assert(E.householdServiceReview(unsafePendingBank, unsafePendingBank.allocation, { ...unsafePendingBank.householdBook.policy, retention: 75 }).coverage < 1.05);
assert.equal(aiChoice(unsafePending).onboardingPolicy.share, 0, 'pending requests cannot override the same service safeguard');

// The private closing estimate has paid operating expenses, not investments.
// Charge an ordinary one-time commitment once and do not repeat it next month.
const safeOwner = { ...ai.players[0], marketSnapshot: ai.marketEconomy }, safeClosing = H.onboardingPlanForecast(safeOwner, aiPlan, ai.economy);
const safeBudget = E.planBudget(ai.players[0], aiPlan), oneOffPlan = { ...aiPlan, investments: { digital: 10000 } }, oneOffBudget = E.planBudget(ai.players[0], oneOffPlan);
assert.equal(oneOffBudget.total - safeBudget.total, 10000);
assert(E.projectPlanStatus(ai.players[0], oneOffPlan).eligible);
const feeBefore = JSON.stringify({ safeClosing, aiPlan, safeBudget, oneOffPlan, oneOffBudget });
const safeContinuation = H.onboardingContinuation(safeClosing, aiPlan, safeBudget), committedContinuation = H.onboardingContinuation(safeClosing, oneOffPlan, oneOffBudget);
assert(safeContinuation.eligible && committedContinuation.eligible);
assert.equal(committedContinuation.cost, safeContinuation.cost);
assert.equal(committedContinuation.available, safeContinuation.available - 10000);
assert.equal(committedContinuation.remaining, safeContinuation.remaining - 10000, 'one-time spending must not be budgeted twice');
assert.equal(JSON.stringify({ safeClosing, aiPlan, safeBudget, oneOffPlan, oneOffBudget }), feeBefore);

// A larger human-generated queue can justify the existing 50% catch-up setting
// only when it really processes more requests than 25%, under the same guards.
const catchUp = copy(ai); turn(catchUp, [{ onboardingPolicy: policy(50, { segment: 'everyday' }) }, {}]);
const catchUpBank = catchUp.players[0], catchUpCount = catchUpBank.onboarding.pending.reduce((n, row) => n + row.count, 0);
H.applyHouseholdPolicy(catchUpBank, { ...catchUpBank.householdBook.policy, retention: 100 });
const catchUpPlan = aiChoice(catchUp), quarterPlan = { ...catchUpPlan, onboardingPolicy: { ...catchUpPlan.onboardingPolicy, share: 25 } };
assert.equal(catchUpPlan.onboardingPolicy.share, 50);
assert(E.householdServiceReview(catchUpBank, catchUpPlan.allocation, catchUpPlan.householdPolicy).coverage >= 1.05);
const catchUpOwner = E.publicState(catchUp, 0).me;
const quarter = E.operatingPreview(catchUpOwner, quarterPlan, catchUp.economy), half = E.operatingPreview(catchUpOwner, catchUpPlan, catchUp.economy);
assert(half.onboardingActivated > quarter.onboardingActivated);
turn(catchUp, [catchUpPlan, {}]);
assert.equal(catchUp.players[0].onboarding.report.totals.activated.count, catchUpCount);

// The optional rule is an exact no-op for older games, preserving the input
// identity as well as values and both campaign random streams.
const optOutPlan = plan(old.players[0]), optOutBefore = JSON.stringify({ old, optOutPlan });
assert.equal(H.planOnboarding(old, 0, optOutPlan), optOutPlan);
assert.equal(JSON.stringify({ old, optOutPlan }), optOutBefore);

// Financial and resource adversity uses the actual transaction adapters. Cash
// is invested in securities and outside stock transfers to the rival; no money,
// customers or ledger balances are deleted to manufacture an unsafe fixture.
const noCash = copy(ai), noCashBank = noCash.players[0];
noCashBank.accounting = E.AccountingPrototype.transact(noCashBank.accounting, 'buySecurities', noCashBank.stats.cash - 500000);
H.syncAccounts(noCashBank); assert.equal(noCashBank.stats.cash, 500000);
assert.equal(aiChoice(noCash).onboardingPolicy.share, 0, 'a cash-constrained bank must not generate future obligations');
for (const resource of ['customers', 'deposits']) {
  const noStock = copy(ai), selected = policy(25, { market: 'university', segment: 'everyday' });
  assert.equal(noStock.players[0].branches.university, 0);
  turn(noStock, [{ onboardingPolicy: selected }, {}]);
  assert(noStock.players[0].onboarding.pending.length);
  const total = Object.values(noStock.marketEconomy.markets).reduce((n, m) => n + m.community[resource] + m.union[resource], 0);
  H.withMarket(noStock, () => H.delta(noStock.players[1], resource, total));
  // Settle a real boundary before inspecting the new planning state. Outside
  // growth/runoff may replenish some stock; it does not guarantee enough local
  // quota to fund the existing application's original principal and headcount.
  turn(noStock, [{ onboardingPolicy: { ...selected, share: 0 } }, {}]);
  const activeQuote = E.onboardingReview(noStock.players[0], noStock, selected);
  assert(activeQuote.totals.due.count > 0); assert.equal(activeQuote.totals.activated.count, 0);
  assert.equal(aiChoice(noStock).onboardingPolicy.share, 0, 'an active queue without safe current ' + resource + ' intake cannot justify generating another batch');
}
const noCapacity = copy(ai);
noCapacity.players[0].allocation = { service: 0, business: 5, lending: 2, operations: 1 };
assert.equal(Object.values(noCapacity.players[0].allocation).reduce((n, count) => n + count, 0), noCapacity.players[0].stats.staff);
assert.equal(aiChoice(noCapacity).onboardingPolicy.share, 0, 'missing service capacity is not repaired by silently inventing staff');

function rejectFinalRetry(world, finalPlan, message) {
  const before = JSON.stringify({ world, finalPlan }), publicBefore = JSON.stringify(E.publicState(world, 0));
  assert.equal(H.reconsiderOnboardingPending(world, 0, finalPlan), finalPlan, message);
  assert.equal(JSON.stringify({ world, finalPlan }), before, 'rejected retry mutated books, final choices or RNG');
  assert.equal(JSON.stringify(E.publicState(world, 0)), publicBefore);
  E.validatePilot(world); world.players.forEach(bank => E.AccountingPrototype.check(bank.accounting));
}
const freshFinal = plan(ai.players[0], { onboardingPolicy: { ...ai.players[0].onboarding.policy, share: 0 } });
assert.equal(ai.cycle % 3, 0); assert.equal(ai.players[0].onboarding.pending.length, 0);
assert(H.planOnboarding(ai, 0, freshFinal).onboardingPolicy.share > 0);
rejectFinalRetry(ai, freshFinal, 'fresh-demand cadence alone never authorizes the final pending-only retry');
rejectFinalRetry(old, optOutPlan, 'the final retry is also an exact no-op for opted-out campaigns');

const retryGenerating = copy(ai); turn(retryGenerating, [{ onboardingPolicy: policy(25) }, {}]);
const generationFinal = plan(retryGenerating.players[0], { onboardingPolicy: { ...retryGenerating.players[0].onboarding.policy, share: 0 }, householdPolicy: copy(retryGenerating.players[0].householdBook.policy) });
const generationCandidate = H.planOnboarding(retryGenerating, 0, generationFinal);
assert(generationCandidate.onboardingPolicy.share > 0);
const generationClose = H.onboardingPlanForecast({ ...retryGenerating.players[0], marketSnapshot: retryGenerating.marketEconomy }, generationCandidate, retryGenerating.economy);
assert(generationClose.operatingReport.onboardingActivated > 0 && generationClose.onboarding.report.totals.generated.count > 0);
rejectFinalRetry(retryGenerating, generationFinal, 'processing some old work cannot authorize extra new requests in the final retry');

const retryRelease = copy(ai); turn(retryRelease, [{ onboardingPolicy: policy(25, { segment: 'everyday' }) }, {}]);
const releaseFinal = plan(retryRelease.players[0], { onboardingPolicy: { ...retryRelease.players[0].onboarding.policy, share: 0 }, householdPolicy: { ...retryRelease.players[0].householdBook.policy, retention: 100 } });
const releaseCandidate = H.planOnboarding(retryRelease, 0, releaseFinal);
assert(releaseCandidate.onboardingPolicy.share > 0); assert.equal(releaseCandidate.householdPolicy.retention, 75);
const releaseClose = H.onboardingPlanForecast({ ...retryRelease.players[0], marketSnapshot: retryRelease.marketEconomy }, releaseCandidate, retryRelease.economy);
assert(releaseClose.operatingReport.onboardingActivated > 0); assert.equal(releaseClose.onboarding.report.totals.generated.count, 0);
rejectFinalRetry(retryRelease, releaseFinal, 'even safe processing cannot reopen finalized retention or staffing choices');
rejectFinalRetry(retryRelease, releaseCandidate, 'an already-active final instruction must not be retried');

// Spend down equity and cash together through the real expense adapter until
// the final 10% reserve limit has no room for the fee. The ordinary 8% plan
// budget remains eligible, making the final-limit rejection independently real.
const retryLimit = copy(retryRelease), limitBank = retryLimit.players[0];
const limitFinal = plan(limitBank, { onboardingPolicy: { ...limitBank.onboarding.policy, share: 0 }, householdPolicy: copy(limitBank.householdBook.policy) });
const oldLimit = H.aiCashPlanningReview(retryLimit, 0, limitFinal).limit, finalSpend = E.planBudget(limitBank, limitFinal).total;
assert(oldLimit > finalSpend); H.delta(limitBank, 'cash', -(oldLimit - finalSpend));
const limitedCandidate = H.planOnboarding(retryLimit, 0, limitFinal), finalLimit = H.aiCashPlanningReview(retryLimit, 0, limitFinal).limit;
assert(limitedCandidate.onboardingPolicy.share > 0, 'this fixture must pass ordinary onboarding safeguards');
assert(E.projectPlanStatus(limitBank, limitedCandidate).eligible);
assert(E.planBudget(limitBank, limitedCandidate).total > finalLimit);
rejectFinalRetry(retryLimit, limitFinal, 'a plan affordable under ordinary limits still cannot exceed the finalized cash reserve');

// Real final-coordinator regression: this unmodified two-bot campaign generates
// five high-yield applications in M57. Later reserve trimming can release the
// $16 activation fee after the earlier onboarding planner has already paused it.
// A test-only identity retry gives the previous finalized plan on the same RNG.
function assertWorld(world) {
  E.validatePilot(world); E.validateLedger(world);
  world.players.forEach(bank => E.AccountingPrototype.check(bank.accounting));
}
function resolveBotPlans(world, plans) {
  E.submit(world, 0, plans[0]); E.submit(world, 1, plans[1]); assertWorld(world);
}
const naturalRetry = fresh({ scenario: 'balanced', seed: 'release-balanced-0' });
for (let month = 1; month <= 57; month++) {
  assert.equal(naturalRetry.cycle, month);
  resolveBotPlans(naturalRetry, [E.chooseBot(naturalRetry, 0), E.chooseBot(naturalRetry, 1)]);
}
assert.equal(naturalRetry.cycle, 58);
assert.equal(naturalRetry.players[0].onboarding.report.totals.generated.count, 5);
assert.equal(naturalRetry.players[0].onboarding.pending[0].product, 'highYield');
assert.equal(naturalRetry.players[0].onboarding.pending[0].market, 'county_seat');
const retryReference = copy(naturalRetry);
const withoutPolicy = value => { const detached = copy(value); delete detached.onboardingPolicy; return detached; };
const otherBudget = value => Object.fromEntries(Object.entries(copy(value)).filter(([key]) => !['onboarding', 'total', 'remaining'].includes(key)));
function finalRetryPair(world, reference) {
  const plain = [H.traceFinalChoice(reference, 0, true), H.traceFinalChoice(reference, 1, true)];
  const retried = [H.traceFinalChoice(world, 0), H.traceFinalChoice(world, 1)];
  for (let index = 0; index < 2; index++) {
    assert.equal(retried[index].retries, 1, 'the coordinator retries at most once per final plan');
    assert.equal(retried[index].cashPasses, plain[index].cashPasses, 'pending retry must not recursively invoke reserve trimming');
  }
  assert.deepEqual(copy(world), copy(reference), 'retry cannot change world state or either random stream while planning');
  const bank = world.players[0], before = plain[0].plan, after = retried[0].plan;
  assert.equal(before.onboardingPolicy.share, 0); assert(after.onboardingPolicy.share > 0);
  assert.deepEqual(withoutPolicy(after), withoutPolicy(before), 'all finalized choices, including retention and staffing, stay exact');
  const priorBudget = E.planBudget(bank, before), nextBudget = E.planBudget(bank, after);
  assert.deepEqual(otherBudget(nextBudget), otherBudget(priorBudget), 'training and every other quoted expense stay exact');
  assert.equal(nextBudget.onboarding, 16); assert.equal(nextBudget.total - priorBudget.total, 16);
  assert.equal(nextBudget.remaining, priorBudget.remaining - 16);
  const priorReserve = H.aiCashPlanningReview(world, 0, before), nextReserve = H.aiCashPlanningReview(world, 0, after);
  assert.equal(nextReserve.limit, priorReserve.limit); assert(nextBudget.total <= priorReserve.limit);
  assert(E.projectPlanStatus(bank, after).eligible);
  const quoted = H.onboardingPlanForecast({ ...bank, marketSnapshot: world.marketEconomy }, after, world.economy);
  assert.equal(quoted.operatingReport.onboardingActivated, 5);
  assert.equal(quoted.onboarding.report.totals.generated.count, 0, 'a final retry cannot start any new applications');
  const snapshot = JSON.stringify({ world, before });
  assert.deepEqual(copy(H.reconsiderOnboardingPending(world, 0, before)), copy(after));
  assert.equal(JSON.stringify({ world, before }), snapshot, 'direct retry is pure');
  return { plain: plain.map(row => row.plan), retried: retried.map(row => row.plan) };
}
const month58 = finalRetryPair(naturalRetry, retryReference);
resolveBotPlans(naturalRetry, month58.retried);
assert.equal(naturalRetry.players[0].onboarding.report.totals.activated.count, 5);
assert.equal(naturalRetry.players[0].onboarding.report.cost, 16);
assert.equal(naturalRetry.players[0].onboarding.report.totals.generated.count, 0);
// Retain the no-retry branch for the last eligible M59 opportunity; the new M58
// activation legitimately changes later state, so it is not a frozen fixture.
resolveBotPlans(retryReference, month58.plain);
assert.equal(retryReference.cycle, 59); assert(retryReference.players[0].onboarding.pending.length);
const lastChance = copy(retryReference), month59 = finalRetryPair(lastChance, copy(retryReference));
resolveBotPlans(lastChance, month59.retried);
assert.equal(lastChance.players[0].onboarding.report.totals.activated.count, 5);
assert.equal(lastChance.players[0].onboarding.report.totals.expired.count, 0);
console.log('PASS onboarding: delayed joint finite-stock transfers, quotas, costs, promises, expiry, corruption, pure previews, replay and safe AI follow-through');
