'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), copy = x => JSON.parse(JSON.stringify(x));
let engine;
if (process.argv.includes('--source')) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
  engine = fs.readFileSync(path.join(root, 'src', manifest.engine.shell), 'utf8').replace('/* @modules */', () =>
    manifest.engine.modules.map(file => fs.readFileSync(path.join(root, 'src', file), 'utf8')).join('\n'));
} else engine = fs.readFileSync(path.join(root, 'BRANCH_WARS.html'), 'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const hooks = `
const offerTraces=[],originalOfferSettlement=settleRelationshipOffers;
settleRelationshipOffers=function(g,p){
 const snapshot=()=>JSON.stringify({stats:p.stats,accounting:p.accounting,households:p.householdBook.markets,markets:p.marketBook,world:g.marketEconomy,rng:g.rng});
 const before=snapshot(),result=originalOfferSettlement(g,p);offerTraces.push({before,after:snapshot()});return result;
};
root.relationshipOfferTest={settleRelationshipOffers,adjustRelationshipOfferReport,validateRelationshipOfferSave,relationshipOfferSalesStaff,
 relationshipOfferEligibility,relationshipOfferDraft,planRelationshipOffers,applyHouseholdPolicy,applyWorkforcePolicy,withMarket,delta,offerTraces};
`;
const ctx = { console }; vm.runInNewContext(engine.replace('root.BWEngine={', () => hooks + 'root.BWEngine={'), ctx);
const E = ctx.BWEngine, H = ctx.relationshipOfferTest;
const options = { relationshipOffersVersion: 1, regionalGrowthVersion: 1, advertisingVersion: 1, productProgramsVersion: 1,
  segmentDepositsVersion: 1, creditPerformanceVersion: 1, customerOwnershipVersion: 1, workforceVersion: 1,
  customerDemandVersion: 2, managementVersion: 2, serviceExpansionVersion: 1, campaignRulesVersion: 1,
  mode: 'hotseat', seed: 'relationship-offers', created: 1 };
const fresh = extra => E.createGame({ ...options, ...extra });
const plan = (p, extra = {}) => ({ focus: p.focus, allocation: { ...p.allocation }, decision: 'b', depositPolicy: 'balanced',
  lendingPolicy: 'balanced', capitalPolicy: 'balanced', products: { ...p.products }, newProjects: [], investments: {}, hires: 0,
  competitiveAction: 'none', opportunity: null, ...extra });
const policy = (share = 25, extra = {}) => ({ market: 'downtown', segment: 'connected', product: 'rewards', share, ...extra });
function target(g, p, product = 'rewards', segment = 'connected') {
  E.finishProject(g, p, { key: product === 'rewards' ? 'licenseRewards' : 'licenseHighYield', target: null });
  const targets = E.productProgramPolicy(p); targets.markets.downtown[segment] = { essential: 1, rewards: 0, highYield: 0, [product]: 4 };
  E.applyProductProgramPolicy(p, targets); p.allocation = { service: 4, business: 2, lending: 1, operations: 1 };
  H.applyHouseholdPolicy(p, { ...p.householdBook.policy, retention: 25 });
  E.applyRelationshipOfferPolicy(p, policy(25, { product, segment }));
}
function turn(g, extras = [{}, {}]) {
  g.event = { ...E.EVENTS.find(e => e.key === 'quiet') }; g.opportunities = [];
  g.players.forEach((p, i) => E.submit(g, i, plan(p, extras[i])));
  E.validatePilot(g); E.validateLedger(g); g.players.forEach(p => E.AccountingPrototype.check(p.accounting));
}
const normalize = x => { const value = copy(x); delete value.ledgerVersion; value.players.forEach(p => delete p.strategy); return value; };
const g = fresh(), p = g.players[0]; assert.equal(g.version, '8.12'); assert.equal(p.relationshipOffers.report, null); E.validatePilot(g);
assert.throws(() => fresh({ relationshipOffersVersion: 2 }), /relationship offers/i);
assert.throws(() => fresh({ regionalGrowthVersion: 0 }), /requires/i);
const old = fresh({ relationshipOffersVersion: 0 }); const prior = JSON.stringify(old);
assert.equal(old.version, '8.11'); assert.equal(E.relationshipOfferReview(old.players[0], old), null);
assert.equal(E.relationshipOfferBudget(old.players[0], plan(old.players[0])), 0); assert.equal(H.settleRelationshipOffers(old, old.players[0]), null);
assert.equal(JSON.stringify(old), prior); assert.equal(H.relationshipOfferSalesStaff(old.players[0], 3), 3);
assert.throws(() => E.submit(old, 0, plan(old.players[0], { relationshipOfferPolicy: policy() })), /requires/i);

target(g, p); const original = JSON.stringify(g), quote = E.relationshipOfferReview(p, g);
assert(quote.converted > 0); assert(quote.principal > 0); assert.equal(quote.cost, quote.converted * 40);
assert.equal(quote.assignedStaff, .75); assert.equal(quote.salesStaff, 2.25); assert.equal(quote.capacity, 60);
assert.equal(quote.requested, Math.min(60, Math.floor(quote.eligibleEquivalents / 10)));
assert.equal(H.relationshipOfferSalesStaff(p, 3), 2.25);
assert.equal(E.relationshipOfferBudget(p, plan(p)), quote.requested * 40);
const offPlan = plan(p, { relationshipOfferPolicy: policy(0) }), onPlan = plan(p, { relationshipOfferPolicy: policy() });
assert.equal(E.planBudget(p, onPlan).relationshipOffers, quote.requested * 40);
assert.equal(E.planBudget(p, onPlan).total - E.planBudget(p, offPlan).total, quote.requested * 40);
for (let i = 0; i < 3; i++) { E.relationshipOfferReview(p, g); E.operatingPreview(E.publicState(g, 0).me, onPlan, g.economy); }
assert.equal(JSON.stringify(g), original, 'Review/preview mutated bank, world or RNG');
quote.policy.share = 50; assert.equal(p.relationshipOffers.policy.share, 25);

// All eligibility boundaries: strictly better fit, primary relationships present,
// and neither locked principal nor a still-outstanding promotional guarantee.
const inferior = copy(p); E.applyRelationshipOfferPolicy(inferior, policy(50, { segment: 'everyday', product: 'essential' }));
assert.equal(E.relationshipOfferReview(inferior, g).converted, 0);
const noPeople = copy(p); noPeople.householdBook.markets.downtown.connected = 0;
assert.equal(E.relationshipOfferReview(noPeople, g).reason, 'no-households'); assert.equal(E.relationshipOfferReview(noPeople, g).cost, 0);
const protectedBank = copy(p), protectedRow = protectedBank.depositBook.cohorts.find(c => c.market === 'downtown' && c.segment === 'connected');
protectedRow.product = 'highYield'; protectedRow.remaining = 1; protectedRow.locked = true;
const protectedQuote = E.relationshipOfferReview(protectedBank, g); assert.equal(protectedQuote.converted, 0); assert.equal(protectedQuote.excludedPrincipal, protectedRow.principal);
delete protectedRow.locked; protectedRow.product = 'essential'; protectedRow.remaining = 1;
assert.equal(E.relationshipOfferReview(protectedBank, g).converted, 0, 'Outstanding guarantee became eligible early');
const noTime = copy(p); noTime.householdBook.policy.retention = 100;
assert.equal(E.relationshipOfferReview(noTime, g).capacity, 0); assert.equal(E.relationshipOfferBudget(noTime, plan(noTime)), 0);

// Opening nominal ceiling, later commitments, advertising, training and reserves
// share actual cash. Switching never makes a borrowing request.
const limited = copy(p); limited._relationshipOfferBudget = 80;
const lq = E.relationshipOfferReview(limited, g); assert.equal(lq.converted, 2); assert.equal(lq.cost, 80); assert(lq.budgetLimited);
const stopped = copy(p); stopped._workforceReserved = stopped.stats.cash;
const stopQuote = E.relationshipOfferReview(stopped, g); assert.equal(stopQuote.cost, 0); assert(stopQuote.paused); assert.equal(stopQuote.reason, 'cash-reserve');
const spend = E.relationshipOfferReview(p, g).available, reserved = copy(p);
reserved._workforceReserved = 111; reserved._advertisingCycle = { spent: 222 }; reserved._workforceCosts = { training: { total: 333 } };
assert.equal(E.relationshipOfferReview(reserved, g).available, spend - 666);
const nominal = copy(p); nominal._relationshipOfferBudget = 0;
assert.equal(E.relationshipOfferReview(nominal, g).converted, 0, 'Newly eligible funds exceeded the opening quoted ceiling');

// Isolated conversion changes product cohorts only and quoted high-yield terms
// are new promises. Vendor balances and recurring costs follow the actual switch.
const local = copy(g), lp = local.players[0], beforeAccounts = JSON.stringify(lp.accounting), beforeHouseholds = JSON.stringify(lp.householdBook.markets);
const localQuote = E.relationshipOfferReview(lp, local), feeBefore = E.productProgramCosts(lp).rows.rewards.royalty;
const actual = H.settleRelationshipOffers(local, lp);
assert.equal(actual.principal, localQuote.principal); assert.equal(JSON.stringify(lp.accounting), beforeAccounts); assert.equal(JSON.stringify(lp.householdBook.markets), beforeHouseholds);
assert(E.productProgramCosts(lp).rows.rewards.royalty > feeBefore);
const direct = E.depositSummary(lp, local); assert.equal(actual.directCostAfter, direct.interest + direct.service - direct.fees);
const afterSettlement = JSON.stringify(local); H.settleRelationshipOffers(local, lp); assert.equal(JSON.stringify(local), afterSettlement);
const operating = { expense: 10, profit: 10000 }; H.adjustRelationshipOfferReport(lp, operating); const charged = JSON.stringify(operating);
H.adjustRelationshipOfferReport(lp, operating); assert.equal(JSON.stringify(operating), charged); assert.equal(operating.expense, 10 + actual.cost);
const savings = fresh(); target(savings, savings.players[0], 'highYield', 'reserve');
const sr = H.settleRelationshipOffers(savings, savings.players[0]); assert(sr.principal > 0);
const opened = savings.players[0].depositBook.cohorts.find(c => c.product === 'highYield' && c.segment === 'reserve' && c.quotedCycle === 1);
assert.equal(opened.remaining, 6); assert.equal(opened.rate, sr.rate); assert.equal(opened.locked, undefined);

// Malformed and unavailable orders: schema errors reject; ordinary product
// closure and paid retirement both pause and remain valid after settlement/save.
for (const damage of [x => x.share = 30, x => x.product = '__proto__', x => x.segment = 'missing', x => x.market = 'missing', x => x.extra = 1]) {
  const bad = policy(); damage(bad); assert.throws(() => E.normalizeRelationshipOfferPlan(p, { relationshipOfferPolicy: bad }));
}
turn(g); assert(g.players[0].relationshipOffers.report.converted > 0); assert.equal(g.players[0].operatingReport.relationshipOfferCost, g.players[0].relationshipOffers.report.cost);
const closed = copy(g), cp = closed.players[0], closure = E.productProgramPolicy(cp); closure.markets.downtown.connected = { essential: 4, rewards: 0, highYield: 0 };
turn(closed, [{ productProgramPolicy: closure, relationshipOfferPolicy: policy() }, {}]);
assert.equal(cp.relationshipOffers.policy.share, 0); assert(cp.relationshipOffers.report.paused); assert.equal(cp.relationshipOffers.report.reason, 'closed');
E.migrateCampaign(closed);
const retired = copy(g), rp = retired.players[0], retirement = E.productProgramPolicy(rp); retirement.retire = ['rewards'];
for (const row of Object.values(retirement.markets)) for (const mix of Object.values(row)) { mix.rewards = 0; if (!Object.values(mix).some(Boolean)) mix.essential = 4; }
turn(retired, [{ productProgramPolicy: retirement, relationshipOfferPolicy: policy() }, {}]);
assert.equal(rp.relationshipOffers.policy.share, 0); assert.equal(rp.relationshipOffers.report.cost, 0); assert.equal(rp.relationshipOffers.report.reason, 'closed'); E.migrateCampaign(retired);

// Public projection and half-ready continuation preserve only each owner's offer.
const view = E.publicState(g, 0); assert(view.me.relationshipOffers); assert.equal(view.rival.relationshipOffers, undefined);
view.me.relationshipOffers.policy.share = 50; assert.equal(g.players[0].relationshipOffers.policy.share, 25);
const half = copy(g); E.submit(half, 0, plan(half.players[0], { relationshipOfferPolicy: policy(50) }));
assert.equal(E.publicState(half, 1).lastPlans[half.players[0].id]?.relationshipOfferPolicy, undefined);
const imported = E.migrateCampaign(half); E.submit(half, 1, plan(half.players[1])); E.submit(imported, 1, plan(imported.players[1]));
assert.deepEqual(normalize(half), normalize(imported)); E.validatePilot(half);
for (const damage of [x => delete x.relationshipOffersVersion, x => x.relationshipOffersVersion = 2, x => x.version = '8.11',
  x => delete x.regionalGrowthVersion, x => delete x.players[0].relationshipOffers, x => x.players[0]._relationshipOfferBudget = 1,
  x => x.players[0].relationshipOffers.lastCycle++, x => x.players[0].relationshipOffers.policy.share = 99,
  x => x.players[0].relationshipOffers.report.converted++, x => x.players[0].relationshipOffers.report.eligibleEquivalents++,
  x => x.players[0].relationshipOffers.report.principal++, x => x.players[0].relationshipOffers.report.cost++,
  x => x.players[0].relationshipOffers.report.runRateDelta++, x => x.players[0].relationshipOffers.report.budget = -1,
  x => x.players[0].relationshipOffers.report.reason = 'ready-ish', x => x.players[0].operatingReport.relationshipOfferCost++]) {
  const invalid = copy(half); damage(invalid); const beforeInvalid = JSON.stringify(invalid);
  assert.throws(() => E.migrateCampaign(invalid)); assert.equal(JSON.stringify(invalid), beforeInvalid);
}
const rematch = copy(half); rematch.gameOver = true; E.rematch(rematch, 0); E.rematch(rematch, 1);
assert.equal(rematch.version, '8.12'); assert.equal(rematch.players[0].relationshipOffers.lastCycle, 0); E.validatePilot(rematch);

// Human action is reachable through ordinary paid rollout, targeting and sealed
// plans; AI compares only a bounded shortlist and stays off under financial stress.
const human = fresh(); turn(human, [{ newProjects: ['licenseRewards'] }, {}]);
assert(human.players[0].productDeployment.ready.rewards);
const humanTargets = E.productProgramPolicy(human.players[0]); humanTargets.markets.downtown.connected = { essential: 1, rewards: 4, highYield: 0 };
turn(human, [{ allocation: { service: 4, business: 2, lending: 1, operations: 1 }, householdPolicy: { ...human.players[0].householdBook.policy, retention: 25 },
  productProgramPolicy: humanTargets, relationshipOfferPolicy: policy() }, {}]);
assert(human.players[0].relationshipOffers.report.converted > 0);
const stressed = copy(g); stressed.players[0].stats.cash = 0;
assert.equal(H.planRelationshipOffers(stressed, 0, plan(stressed.players[0])).relationshipOfferPolicy.share, 0);
for (const trace of H.offerTraces) assert.equal(trace.before, trace.after, 'Switching changed cash, ownership counts, world resources or RNG');
console.log(JSON.stringify({ passed: true, checks: ['voluntary better-fit switching', 'sales-time reservation', 'integer uptake/nominal ceilings', 'shared operating reserves',
  'no financial/customer creation', 'guarantees and term exclusion', 'new promotion terms', 'vendor/run-rate costs', 'expense once', 'pure previews',
  'closure and retirement pauses', 'private owner reports', 'sealed replay', 'corruption rejection', 'rematch', 'human paid-rollout reachability'] }, null, 2));
