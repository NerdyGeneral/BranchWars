'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const copy = x => JSON.parse(JSON.stringify(x)), html = fs.readFileSync(path.join(__dirname, '../BRANCH_WARS.html'), 'utf8'), ctx = { console };
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={', 'root.advertisingTest={beginAdvertisingCycle,advertisingSupply,advertisingProductWeights,advertisingHouseholdWeights,captureAdvertisingIntake,captureAdvertisingHouseholds,adjustAdvertisingReport,finishAdvertisingCycle,cleanupAdvertisingCycle,planAdvertising,withMarket,startProject,advanceProjects,openSegmentDeposits};root.BWEngine={'), ctx);
const E = ctx.BWEngine, H = ctx.advertisingTest;
const options = { advertisingVersion: 1, productProgramsVersion: 1, segmentDepositsVersion: 1, creditPerformanceVersion: 1, customerOwnershipVersion: 1, workforceVersion: 1, customerDemandVersion: 2, managementVersion: 2, serviceExpansionVersion: 1, campaignRulesVersion: 1, mode: 'hotseat', seed: 42, created: 1 };
const fresh = extra => E.createGame({ ...options, ...extra });
const plan = p => ({ focus: p.focus, allocation: { ...p.allocation }, decision: 'b', depositPolicy: 'balanced', lendingPolicy: 'balanced', capitalPolicy: 'balanced', products: { ...p.products }, newProjects: [], investments: {}, hires: 0, competitiveAction: 'none' });
const campaign = (p, budget = 15000, extra = {}) => ({ ...plan(p), advertisingPolicy: { market: p.focus, segment: 'everyday', product: 'essential', budget, ...extra } });
const stable = x => { const y = copy(x); delete y.ledgerVersion; y.players.forEach(p => delete p.strategy); return y; };
const g = fresh(), p = g.players[0];
assert.equal(g.version, '8.10'); E.validatePilot(g);
assert.throws(() => fresh({ advertisingVersion: 2 }), /version/);
assert.throws(() => fresh({ productProgramsVersion: 0 }), /requires/);
const old = fresh({ advertisingVersion: 0 }); assert.equal(old.version, '8.9'); assert.equal(old.players[0].advertising, undefined);
assert.throws(() => E.submit(old, 0, campaign(old.players[0])), /requires/);
// Read-only quote, finite reachable audience, diminishing awareness and shared costs.
const policy = campaign(p).advertisingPolicy, pristine = JSON.stringify(g), quote = E.advertisingPreview(p, g, policy);
assert.equal(JSON.stringify(g), pristine); assert.equal(quote.spent, 15000); assert(quote.reached > 0 && quote.reached <= quote.audience); assert(quote.after > 0 && quote.after <= 10000);
assert.equal(E.planBudget(p, campaign(p)).advertising, 15000);
assert.equal(E.planBudget(p, campaign(p)).total - E.planBudget(p, plan(p)).total, 15000);
const rich = copy(p); rich.advertising.awareness[p.focus].everyday.essential = 9000;
const saturated = E.advertisingPreview(rich, g, policy); assert(saturated.after - Math.floor(saturated.before * .75) < quote.after);
const understaffed = copy(p); understaffed.householdBook.policy.retention = 100;
assert.equal(E.advertisingPreview(understaffed, g, policy).boost, 0);
const poor = copy(p); poor.stats.cash = poor.workforce.policy.reserve + 14999;
assert.equal(E.advertisingPreview(poor, g, policy).spent, 0); assert.equal(E.advertisingPreview(poor, g, policy).paused, true);
// Strict request schema. Invalid keys/budgets fail before locking either seat.
for (const damage of [q => q.advertisingPolicy.budget = -1, q => q.advertisingPolicy.budget = 1, q => q.advertisingPolicy.market = 'outside', q => q.advertisingPolicy.segment = '__proto__', q => q.advertisingPolicy.product = 'term', q => q.advertisingPolicy.extra = true]) {
  const world = fresh(), q = campaign(world.players[0]); damage(q); const before = JSON.stringify(world);
  assert.throws(() => E.submit(world, 0, q)); assert.equal(JSON.stringify(world), before);
}
// Closing a product automatically pauses its standing campaign, but keeps the
// audience selection so retirement does not become a plan-submission dead end.
const licensed = fresh(), lp = licensed.players[0]; H.startProject(licensed, lp, 'licenseRewards'); H.advanceProjects(licensed);
const opening = campaign(lp, 15000, { product: 'rewards', segment: 'connected' }); opening.productProgramPolicy = E.productProgramPolicy(lp); opening.productProgramPolicy.markets[lp.focus].connected = { essential: 1, rewards: 4, highYield: 0 };
E.normalizeProductProgramPlan(lp, opening); E.normalizeAdvertisingPlan(lp, opening); assert.equal(opening.advertisingPolicy.budget, 15000);
const closing = copy(opening); closing.productProgramPolicy.retire = ['rewards']; closing.productProgramPolicy.markets[lp.focus].connected = { essential: 4, rewards: 0, highYield: 0 };
E.normalizeProductProgramPlan(lp, closing); E.normalizeAdvertisingPlan(lp, closing); assert.equal(closing.advertisingPolicy.budget, 0);
E.applyProductProgramPolicy(lp, opening.productProgramPolicy); E.applyAdvertisingPolicy(lp, opening.advertisingPolicy);
const retirementPreview = copy(closing); delete retirementPreview.advertisingPolicy;
const beforeRetirementPreview = JSON.stringify(licensed);
assert.equal(E.operatingPreview(E.publicState(licensed, 0).me, retirementPreview, licensed.economy).advertisingCost, 0);
assert.equal(JSON.stringify(licensed), beforeRetirementPreview);
// Campaign expense remains central, not a fictitious increase in facility costs.
const contributionCase=fresh();E.submit(contributionCase,0,plan(contributionCase.players[0]));E.submit(contributionCase,1,plan(contributionCase.players[1]));
const contributionOwner=contributionCase.players[0],baseContribution=E.marketContribution(contributionOwner),adContributionOwner=copy(contributionOwner);
adContributionOwner.operatingReport.expense+=80000;adContributionOwner.operatingReport.profit-=80000;adContributionOwner.operatingReport.advertisingCost+=80000;
const adContribution=E.marketContribution(adContributionOwner);
for(const key of Object.keys(baseContribution.rows))assert.equal(adContribution.rows[key].facility,baseContribution.rows[key].facility);
assert.equal(adContribution.central,baseContribution.central-80000);
// Quotas are redistributed, not enlarged; local frozen ceilings also survive.
E.applyAdvertisingPolicy(p, policy); H.beginAdvertisingCycle(g, p);
const freeze = E.marketSupply(g, p, true); p.marketQuota = copy(freeze);
const initial = copy(freeze); for (const r of ['customers', 'deposits']) for (const k of Object.keys(initial[r])) initial[r][k] = Math.floor(initial[r][k] * .7);
const beforeSupply = JSON.stringify(initial), shifted = H.advertisingSupply(g, p, initial);
assert.equal(JSON.stringify(initial), beforeSupply);
for (const r of ['customers', 'deposits']) {
  assert.equal(Object.values(initial[r]).reduce((a, b) => a + b, 0), Object.values(shifted[r]).reduce((a, b) => a + b, 0));
  assert(shifted[r][p.focus] > initial[r][p.focus]);
  for (const k of Object.keys(shifted[r])) assert(shifted[r][k] >= 0 && shifted[r][k] <= freeze[r][k]);
}
assert.deepEqual(copy(H.advertisingSupply(g, p, initial, true)), initial);
const segmentWeights = { everyday: 1, connected: 1, reserve: 1 }, boostedSegments = H.advertisingHouseholdWeights(p, p.focus, segmentWeights);
assert(boostedSegments.everyday > 1); assert.equal(boostedSegments.connected, 1); assert.deepEqual(segmentWeights, { everyday: 1, connected: 1, reserve: 1 });
const productWeights = H.advertisingProductWeights(p, p.focus, 'everyday', { essential: 1, rewards: 0, highYield: 0 }); assert(productWeights.essential > 1); assert.equal(productWeights.rewards, 0);
const report = { expense: 100, profit: 1000 }; H.adjustAdvertisingReport(p, report); assert.equal(report.expense, 15100); assert.equal(report.profit, -14000);
assert.throws(() => H.adjustAdvertisingReport(p, report), /exactly once/);
H.captureAdvertisingIntake(p, p.focus, 'everyday', 'essential', 'deposits', 100000);
H.captureAdvertisingHouseholds(p, p.focus, { everyday: 20, connected: 0, reserve: 0 });
const actuals = H.finishAdvertisingCycle(g, p); assert.equal(actuals.depositIntake, 100000); assert(actuals.assistedDeposits > 0 && actuals.assistedDeposits < 100000); assert.equal(actuals.householdIntake, 20);
H.cleanupAdvertisingCycle(p); delete p.marketQuota;
// Direct book creation is not organic acquisition: term/maturity/opportunity
// helpers must never be counted as advertising merely because awareness exists.
const isolated = fresh(), ip = isolated.players[0]; E.applyAdvertisingPolicy(ip, campaign(ip).advertisingPolicy); H.beginAdvertisingCycle(isolated, ip);
H.openSegmentDeposits(ip, isolated, ip.focus, { everyday: 10000, connected: 0, reserve: 0 });
assert(ip._advertisingCycle.rows.every(r => r.deposits === 0)); H.cleanupAdvertisingCycle(ip);
// Actual paid cycle: the report observes limited intake and reconciles expense;
// a cloned sealed save produces exactly the same result and private views redact it.
const paid = fresh(), paidPlan = campaign(paid.players[0]); const untouched = JSON.stringify(paid);
const preview = E.operatingPreview(E.publicState(paid, 0).me, paidPlan, paid.economy); assert.equal(preview.advertisingCost, 15000); assert.equal(JSON.stringify(paid), untouched);
E.submit(paid, 0, paidPlan); const restored = E.migrateCampaign(paid);
E.submit(paid, 1, campaign(paid.players[1])); E.submit(restored, 1, campaign(restored.players[1])); assert.deepEqual(stable(paid), stable(restored));
E.validatePilot(paid); E.validateLedger(paid);
for (const bank of paid.players) {
  const r = bank.advertising.report;
  assert.equal(r.spent, 15000); assert.equal(bank.operatingReport.advertisingCost, r.spent); assert(r.depositIntake > 0); assert(r.assistedDeposits > 0);
  assert(r.assistedDeposits <= r.depositIntake && r.depositIntake <= bank.operatingReport.customerAcquiredDeposits);
  E.AccountingPrototype.check(bank.accounting); assert.equal(bank._advertisingCycle, undefined);
}
for (const seat of [0, 1]) { const view = E.publicState(paid, seat); assert(view.me.advertising); assert.equal(view.rival.advertising, undefined); assert.equal(view.lastPlans[paid.players[1 - seat].id].advertisingPolicy, undefined); }
for (const damage of [x => delete x.advertisingVersion, x => x.advertisingVersion = 2, x => x.version = '8.9', x => delete x.players[0].advertising,
  x => x.players[0]._advertisingCycle = {}, x => x.players[0].advertising.awareness.downtown.everyday.essential = 10001,
  x => x.players[0].advertising.report.spent = 80000, x => x.players[0].advertising.report.assistedDeposits++, x => x.players[0].advertising.report.rows.push(copy(x.players[0].advertising.report.rows[0])),
  x => x.players[0].advertising.report.rows[0].boost = 1, x => x.players[0].advertising.report.rows = [],
  x => { delete x.advertisingVersion; x.players.forEach(p => delete p.advertising); }]) {
  const bad = copy(paid); damage(bad); const before = JSON.stringify(bad); assert.throws(() => E.migrateCampaign(bad)); assert.equal(JSON.stringify(bad), before);
}
// No campaign can conjure an outside customer or balance from an empty market.
const depleted = fresh(), dp = depleted.players[0];
for (const m of Object.values(depleted.marketEconomy.markets)) { for (const owner of ['community', 'union']) { m[owner].deposits = 0; m[owner].customers = 0; for (const s of Object.keys(E.CUSTOMER_SEGMENTS)) { m.households[owner][s] = 0; m.segmentDeposits[owner][s] = 0; } } }
const empty = E.advertisingPreview(dp, depleted, campaign(dp, 80000).advertisingPolicy); assert.equal(empty.audience, 0); assert.equal(empty.reached, 0);
const rematch = copy(paid); rematch.gameOver = true; E.rematch(rematch, 0); E.rematch(rematch, 1); assert.equal(rematch.version, '8.10'); E.validatePilot(rematch);
// Reachability does not require forcing ads into an understaffed opening bank.
// A profitable team with genuine service slack can allocate 25% to sales.
const staffed = fresh(), sp = staffed.players[1]; sp.stats.staff = 20; sp.stats.lastProfit = 100000;
sp.allocation = { service: 12, business: 2, lending: 2, operations: 4 }; sp.householdBook.policy.retention = 100;
const servicePlan = plan(sp); servicePlan.householdPolicy = copy(sp.householdBook.policy);
const advertPlan = H.planAdvertising(staffed, 1, servicePlan);
assert.equal(advertPlan.advertisingPolicy.budget, 15000); assert.equal(advertPlan.householdPolicy.retention, 75);
assert(E.householdServiceReview(sp, advertPlan.allocation, advertPlan.householdPolicy).coverage >= 1);
assert.equal(sp.householdBook.policy.retention, 100);
E.submit(staffed, 0, plan(staffed.players[0])); E.submit(staffed, 1, advertPlan); E.validatePilot(staffed);
assert.equal(sp.advertising.report.spent, 15000); assert(sp.advertising.report.assistedDeposits > 0);
let turns = 0, paidCycles = 0, attributed = 0;
for (const scenario of Object.keys(E.SCENARIOS)) {
  const world = fresh({ scenario, seed: 'advertising-' + scenario });
  for (let i = 0; i < 24 && !world.gameOver; i++) {
    const plans = [E.chooseBot(world, 0), E.chooseBot(world, 1)];
    E.submit(world, 0, plans[0]); E.submit(world, 1, plans[1]); E.validatePilot(world); E.validateLedger(world);
    for (const bank of world.players) { E.AccountingPrototype.check(bank.accounting); paidCycles += bank.advertising.report.spent > 0; attributed += bank.advertising.report.assistedDeposits; }
    for (const seat of [0, 1]) assert(Buffer.byteLength(JSON.stringify(E.publicState(world, seat))) < 1048576);
    turns++;
  }
}
if (paidCycles) assert(attributed > 0, 'AI paid campaigns must reach actual ordinary intake');
console.log(JSON.stringify({ passed: true, turns, paidCycles, attributed, staffedAiCampaigns: 1, checks: ['strict plans', 'pure preview', 'auto-pause closed offers', 'staff and fit', 'fixed finite quotas', 'expense exactly once', 'observed assisted intake', 'no grant attribution', 'sealed deterministic replay', 'owner privacy', 'corrupt saves', 'staffed AI reachability'] }, null, 2));
