'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), copy = x => JSON.parse(JSON.stringify(x));
let engine;
if (process.argv.includes('--source')) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
  engine = fs.readFileSync(path.join(root, 'src', manifest.engine.shell), 'utf8').replace('/* @modules */', () =>
    manifest.engine.modules.map(file => fs.readFileSync(path.join(root, 'src', file), 'utf8')).join('\n'));
} else engine = fs.readFileSync(path.join(root, 'BRANCH_WARS.html'), 'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
// Captured v8.12 implementation, before the behavior-preserving helper split.
// Kept only in this test: shared helpers must not become their own reference.
const hooks = `
function previousOperatingPreview(p,plan,economy){
 const copy=JSON.parse(JSON.stringify(p));copy.doctrine=typeof copy.doctrine==='object'?copy.doctrine.key:copy.doctrine;
 copy.allocation={...plan.allocation};copy.policies={deposit:plan.depositPolicy,lending:plan.lendingPolicy,capital:plan.capitalPolicy};
 applyHouseholdPolicy(copy,plan.householdPolicy);
 applyCollectionsPolicy(copy,plan.collectionsPolicy);
 applyProductProgramPolicy(copy,plan.productProgramPolicy);
 applyAdvertisingPolicy(copy,plan.advertisingPolicy);
 applyRelationshipOfferPolicy(copy,plan.relationshipOfferPolicy);
 copy.products={...copy.products,...plan.products};if(copy.termFunding&&plan.termPolicy)copy.termFunding.policy={...plan.termPolicy};if(copy.retailLifecycle&&plan.retailMix&&!copy.productPrograms)applyRetailMix(copy,plan.retailMix);applyServicePolicy(copy,plan.servicePolicy);copy.turnEffects={};copy.fundingGap=0;
 if(copy.workforce){applyWorkforcePolicy(copy,plan.workforcePolicy);const q=planBudget(copy,plan);copy._workforceReserved=q.total-(q.training||0)-(q.advertising||0)-(q.relationshipOffers||0)}
 if(copy.relationshipOffers)copy._relationshipOfferBudget=relationshipOfferBudget(copy,plan);
 operate({economy,cycle:0},copy,true);
 return {...copy.operatingReport,capitalRatio:capitalRatio(copy),rateSensitiveDeposits:copy.stats.rateSensitiveDeposits};
}
root.customerEffectsTest={previousOperatingPreview,prepareOperatingForecast,finishOperatingForecast,projectOperatingForecast,
 customerEffectsSegment,customerEffectsRetention,settleHouseholdRetention,customerEffectsBusinessGuard};
`;
const ctx = { console }; vm.runInNewContext(engine.replace('root.BWEngine={', () => hooks + 'root.BWEngine={'), ctx);
const E = ctx.BWEngine, H = ctx.customerEffectsTest;
const options = { relationshipOffersVersion: 1, regionalGrowthVersion: 1, advertisingVersion: 1, productProgramsVersion: 1,
  segmentDepositsVersion: 1, creditPerformanceVersion: 1, customerOwnershipVersion: 1, workforceVersion: 1,
  customerDemandVersion: 2, managementVersion: 2, serviceExpansionVersion: 1, campaignRulesVersion: 1,
  mode: 'hotseat', seed: 'customer-effects', created: 1 };
const fresh = extra => E.createGame({ ...options, ...extra });
const planFor = (p, extra = {}) => ({ focus: p.focus, allocation: { ...p.allocation }, decision: 'b', depositPolicy: 'balanced',
  lendingPolicy: 'balanced', capitalPolicy: 'balanced', products: { ...p.products }, newProjects: [], investments: {}, hires: 0,
  competitiveAction: 'none', opportunity: null, ...extra });
function fixture() {
  const g = fresh(), p = g.players[0];
  E.finishProject(g, p, { key: 'licenseRewards', target: null });
  const targets = E.productProgramPolicy(p); targets.markets.downtown.connected = { essential: 1, rewards: 4, highYield: 0 };
  E.applyProductProgramPolicy(p, targets);
  const owner = E.publicState(g, 0).me;
  const draft = planFor(owner, { allocation: { service: 3, business: 3, lending: 1, operations: 1 },
    householdPolicy: { ...copy(owner.householdBook.policy), retention: 75 },
    relationshipOfferPolicy: { market: 'downtown', segment: 'connected', product: 'rewards', share: 25 } });
  return { g, owner, draft };
}
function row(result, key) { return result.rows.find(r => r.key === key); }
let equivalence = 0;
for (const config of [{}, { ...options, relationshipOffersVersion: 0, regionalGrowthVersion: 0, advertisingVersion: 0 },
  { ...options, relationshipOffersVersion: 0 }, options]) {
  const g = E.createGame({ mode: 'hotseat', created: 1, seed: 'forecast-equivalence', ...config });
  for (const seat of [0, 1]) for (const depositPolicy of ['margin', 'balanced', 'aggressive']) {
    const p = E.publicState(g, seat).me, plan = planFor(p, { depositPolicy, focus: Object.keys(g.territories).find(k => k !== p.focus) });
    const before = JSON.stringify({ g, p, plan });
    assert.equal(JSON.stringify(E.operatingPreview(p, plan, g.economy)), JSON.stringify(H.previousOperatingPreview(p, plan, g.economy)), 'Legacy projection or focus behavior changed');
    assert.equal(JSON.stringify({ g, p, plan }), before); equivalence++;
  }
}
const { g, owner, draft } = fixture(), initial = JSON.stringify({ g, owner, draft });
const comparison = E.customerEffectsComparison(owner, draft, g.economy);
assert.deepEqual(Object.keys(comparison).sort(), ['assumptions', 'reassignment', 'rows', 'supported', 'target']);
assert(comparison.supported); assert.deepEqual(copy(comparison.target), { market: 'downtown', segment: 'connected', product: 'rewards' });
assert.deepEqual(comparison.rows.map(r => r.key).join(','), 'baseline,offers,staffing,combined');
for (const r of comparison.rows) assert(r.eligible, r.key + ': ' + r.reason);
assert(row(comparison, 'offers').metrics.offer.converted > 0);
assert.equal(row(comparison, 'baseline').metrics.offer.cost, 0);
assert(row(comparison, 'combined').metrics.offer.converted >= row(comparison, 'offers').metrics.offer.converted);
assert.equal(row(comparison, 'baseline').metrics.opening.fit, row(comparison, 'offers').metrics.opening.fit);
assert.deepEqual(copy(row(comparison, 'baseline').metrics.currentRetention), copy(row(comparison, 'offers').metrics.currentRetention), 'Offers changed pre-switch retention');
for (const r of comparison.rows) {
  const plan = { ...copy(draft), ...copy(r.patch) }, focused = { ...owner, focus: draft.focus };
  const previous = H.previousOperatingPreview(focused, plan, g.economy), forecast = E.operatingPreview(focused, plan, g.economy);
  assert.equal(JSON.stringify(forecast), JSON.stringify(previous)); equivalence++;
  assert.equal(r.metrics.bank.profit, previous.profit); assert.equal(r.metrics.bank.fundingLoss, previous.fundingLoss || 0);
  assert.equal(r.metrics.bank.netOperating, previous.profit - (previous.fundingLoss || 0));
  assert.equal(r.metrics.offer.cost, previous.relationshipOfferCost);
  assert.equal(r.metrics.offer.runRateDelta, previous.relationshipOfferRunRateDelta);
  assert.equal(r.metrics.budget.total, E.planBudget(focused, plan).total);
  assert.deepEqual(Object.keys(r.metrics).sort(), ['bank', 'budget', 'closing', 'currentRetention', 'nextRetention', 'offer', 'opening']);
  const schemas = { opening: ['households', 'fit', 'coverage', 'goodwill', 'withdrawablePrincipal', 'lockedPrincipal'],
    closing: ['households', 'fit', 'coverage', 'goodwill', 'withdrawablePrincipal', 'lockedPrincipal'],
    currentRetention: ['departures', 'withdrawableOutflow'], nextRetention: ['departures', 'withdrawableOutflow'],
    bank: ['profit', 'fundingLoss', 'netOperating', 'depositGrowth', 'loanGrowth'],
    offer: ['converted', 'principal', 'cost', 'runRateDelta'], budget: ['total', 'remaining', 'capacity', 'load'] };
  for (const [field, keys] of Object.entries(schemas)) {
    assert.deepEqual(Object.keys(r.metrics[field]).sort(), keys.sort());
    for (const value of Object.values(r.metrics[field])) assert(Number.isFinite(value));
  }
  assert.deepEqual(Object.keys(r).sort(), ['eligible', 'key', 'label', 'metrics', 'patch', 'reason']);
  assert(r.metrics.currentRetention.withdrawableOutflow <= r.metrics.opening.withdrawablePrincipal);
  assert(r.metrics.nextRetention.withdrawableOutflow <= r.metrics.closing.withdrawablePrincipal);
  assert.deepEqual(Object.keys(r.patch).sort(), r.key === 'staffing' || r.key === 'combined' ? ['allocation', 'relationshipOfferPolicy'] : ['relationshipOfferPolicy']);
  if (r.patch.allocation) {
    assert.equal(r.patch.allocation.business, draft.allocation.business - 1); assert.equal(r.patch.allocation.service, draft.allocation.service + 1);
    assert.equal(r.patch.allocation.operations, draft.allocation.operations); assert.equal(r.patch.allocation.lending, draft.allocation.lending);
  }
}
for (let i = 0; i < 3; i++) assert.equal(JSON.stringify(E.customerEffectsComparison(owner, draft, g.economy)), JSON.stringify(comparison));
assert.equal(JSON.stringify({ g, owner, draft }), initial, 'Comparison changed owner, input, world, ledger or RNG');
const changedResult = copy(comparison); changedResult.rows[1].patch.relationshipOfferPolicy.share = 50;
assert.equal(draft.relationshipOfferPolicy.share, 25);
assert(!JSON.stringify(comparison).includes('cohorts')); assert(!JSON.stringify(comparison).includes('accounting'));
assert(!JSON.stringify(comparison).includes('marketSnapshot')); assert(!JSON.stringify(comparison).includes('aiState'));
const paidOwner = copy(owner); paidOwner.workforce.departments.service = { count: 1, skill: 20, trainingSpend: 0 };
const paidPlan = copy(draft);
paidPlan.advertisingPolicy = { ...copy(owner.advertising.policy), ...draft.relationshipOfferPolicy,
  budget: E.ADVERTISING_BUDGETS.find(n => n > 0) }; delete paidPlan.advertisingPolicy.share;
paidPlan.workforcePolicy = copy(owner.workforce.policy); paidPlan.workforcePolicy.training.service = E.WORKFORCE_TRAINING_BUDGETS.find(n => n > 0);
paidPlan.investments = { operations: 1000 };
const paidBefore = JSON.stringify({ paidOwner, paidPlan }), paidComparison = E.customerEffectsComparison(paidOwner, paidPlan, g.economy);
for (const r of paidComparison.rows) {
  assert(r.eligible, r.reason);
  const staged = { ...copy(paidPlan), ...copy(r.patch) }, previous = H.previousOperatingPreview(paidOwner, staged, g.economy);
  assert.equal(r.metrics.bank.profit, previous.profit); assert.equal(r.metrics.offer.cost, previous.relationshipOfferCost); equivalence++;
}
assert.equal(JSON.stringify({ paidOwner, paidPlan }), paidBefore, 'Draft advertising/training/reservations mutated owner or plan');

// Explicit selected-segment retention math follows the real settler, including
// guaranteed-but-withdrawable savings and locked principal that cannot pay early.
const neglected = copy(owner); neglected.customerRelationships.markets.downtown.connected = 20;
const openingTarget = H.customerEffectsSegment(neglected, comparison.target), dry = H.customerEffectsRetention(neglected, comparison.target, g.economy);
const serviceRow = E.householdServiceReview(neglected).rows.find(r => r.market === 'downtown' && r.segment === 'connected');
assert.equal(dry.departures, serviceRow.departures);
assert.equal(dry.withdrawableOutflow, Math.floor(openingTarget.withdrawablePrincipal * dry.departures / openingTarget.households));
const locked = copy(neglected);
for (const c of locked.depositBook.cohorts.filter(c => c.market === 'downtown' && c.segment === 'connected')) { c.locked = true; c.remaining = 3; c.exiting = 0; }
const lockBefore = JSON.stringify(locked), lockDry = H.customerEffectsRetention(locked, comparison.target, g.economy);
assert(lockDry.departures > 0); assert.equal(lockDry.withdrawableOutflow, 0); assert.equal(JSON.stringify(locked), lockBefore);
const lockComparison = E.customerEffectsComparison(locked, draft, g.economy);
assert.equal(row(lockComparison, 'offers').metrics.offer.converted, 0);
assert.equal(row(lockComparison, 'offers').metrics.currentRetention.withdrawableOutflow, 0);
const lockedMetrics = row(lockComparison, 'offers').metrics;
assert(lockedMetrics.closing.lockedPrincipal > 0);
assert.equal(lockedMetrics.nextRetention.withdrawableOutflow, Math.floor(lockedMetrics.closing.withdrawablePrincipal *
  lockedMetrics.nextRetention.departures / lockedMetrics.closing.households), 'Only ordinary new withdrawable intake may leave next boundary');

const promised = copy(owner);
for (const c of promised.depositBook.cohorts.filter(c => c.market === 'downtown' && c.segment === 'connected')) { c.product = 'highYield'; c.remaining = 1; }
const promiseComparison = E.customerEffectsComparison(promised, draft, g.economy);
assert.equal(row(promiseComparison, 'offers').metrics.offer.converted, 0, 'Expiring guarantees became eligible before their proper boundary');
const noTime = E.customerEffectsComparison(owner, { ...copy(draft), householdPolicy: { ...copy(draft.householdPolicy), retention: 100 } }, g.economy);
for (const r of noTime.rows) assert.equal(r.metrics.offer.converted, 0, 'Comparison silently released retention time');
const paused = E.customerEffectsComparison(owner, { ...copy(draft), relationshipOfferPolicy: { ...draft.relationshipOfferPolicy, share: 0 } }, g.economy);
assert.deepEqual(copy(row(paused, 'baseline').metrics), copy(row(paused, 'offers').metrics)); assert(row(paused, 'offers').eligible);

// Small fit gains need not change modeled goodwill. A frozen closing-book check
// is different from merely converting opening balances and ignoring ordinary intake.
const low = copy(owner); low.customerRelationships.markets.downtown.connected = 0;
const small = E.customerEffectsComparison(low, draft, g.economy), b = row(small, 'baseline').metrics, o = row(small, 'offers').metrics;
assert(o.closing.fit > b.closing.fit); assert.equal(o.closing.goodwill, b.closing.goodwill);
assert.equal(o.nextRetention.departures, b.nextRetention.departures);
const sample = copy(owner), target = comparison.target;
const selected = sample.depositBook.cohorts.filter(c => c.market === target.market && c.segment === target.segment);
const principal = selected.reduce((n, c) => n + c.principal, 0), seedCohort = copy(selected[0]);
sample.depositBook.cohorts = sample.depositBook.cohorts.filter(c => c.market !== target.market || c.segment !== target.segment);
sample.depositBook.cohorts.push({ ...seedCohort, product: 'essential', principal: Math.floor(principal * .84), remaining: 0 },
  { ...seedCohort, product: 'rewards', principal: principal - Math.floor(principal * .84), remaining: 0 });
sample.customerRelationships.markets.downtown.connected = 19;
const near = E.customerEffectsComparison(sample, { ...copy(draft), relationshipOfferPolicy: { ...draft.relationshipOfferPolicy, share: 50 } }, g.economy);
const nearBase = row(near, 'baseline').metrics, nearOffer = row(near, 'offers').metrics;
assert(nearBase.closing.fit < .85 && nearOffer.closing.fit >= .85);
assert.equal(nearOffer.closing.goodwill, nearBase.closing.goodwill + 1);
assert(nearOffer.nextRetention.departures < nearBase.nextRetention.departures);
assert.deepEqual(copy(nearOffer.currentRetention), copy(nearBase.currentRetention));
assert(nearOffer.bank.profit < nearBase.bank.profit, 'Visible retention benefit must not be presented as free profit');
const alreadyImproving = copy(sample), improvingCohorts = alreadyImproving.depositBook.cohorts.filter(c => c.market === target.market && c.segment === target.segment);
improvingCohorts.find(c => c.product === 'essential').principal = Math.floor(principal * .81);
improvingCohorts.find(c => c.product === 'rewards').principal = principal - Math.floor(principal * .81);
const ordinaryIntake = E.customerEffectsComparison(alreadyImproving, draft, g.economy), natural = row(ordinaryIntake, 'baseline').metrics, offered = row(ordinaryIntake, 'offers').metrics;
assert(natural.opening.fit < .85 && natural.closing.fit >= .85, 'Fixture must cross the fit threshold through ordinary intake alone');
assert.equal(natural.closing.goodwill, offered.closing.goodwill);

// Full monthly transitions exercise matured guarantees, aged credit and existing
// reports while the refactored preview remains identical to the captured body.
const replay = fresh();
for (let month = 0; month < 10; month++) {
  const plans = replay.players.map((p, seat) => {
    const view = E.publicState(replay, seat).me, plan = planFor(view), before = JSON.stringify({ replay, view, plan });
    assert.equal(JSON.stringify(E.operatingPreview(view, plan, replay.economy)), JSON.stringify(H.previousOperatingPreview(view, plan, replay.economy)));
    assert.equal(JSON.stringify({ replay, view, plan }), before); equivalence++;
    return plan;
  });
  replay.players.forEach((p, seat) => E.submit(replay, seat, plans[seat])); E.validatePilot(replay); E.validateLedger(replay);
}

// Donor and obligation guards do not commandeer another department or recruit.
const oneBusiness = { ...copy(draft), allocation: { service: 5, business: 1, lending: 1, operations: 1 } };
const blocked = E.customerEffectsComparison(owner, oneBusiness, g.economy);
assert(!blocked.reassignment.eligible); assert(row(blocked, 'offers').eligible); assert.equal(row(blocked, 'staffing').metrics, null);
const specialists = copy(owner); specialists.workforce.departments.business.count = 3;
assert.match(E.customerEffectsComparison(specialists, draft, g.economy).reassignment.reason, /specialist/i);
const reserved = copy(draft); reserved.servicePolicy = { ...copy(owner.serviceDesk.policy), staff: 3 };
assert.match(E.customerEffectsComparison(owner, reserved, g.economy).reassignment.reason, /reserved/i);
const bidding = copy(draft); bidding.servicePolicy = { ...copy(owner.serviceDesk.policy), staff: 2 }; bidding.contractBid = 'explicit-bid';
assert.match(E.customerEffectsComparison(owner, bidding, g.economy).reassignment.reason, /sales banker/i);
const signed = copy(owner); signed.serviceDesk.contracts = [{ id: 'signed', kind: 'merchant', fee: 30000, due: 2, misses: 0 }];
const deliveryDraft = { ...copy(draft), servicePolicy: { ...copy(owner.serviceDesk.policy), staff: 1 } };
assert(E.customerEffectsComparison(signed, deliveryDraft, g.economy).reassignment.eligible);
const lackingSnapshot = copy(owner); delete lackingSnapshot.marketSnapshot;
assert(E.customerEffectsComparison(lackingSnapshot, draft, g.economy).rows.every(r => !r.eligible && !r.metrics));
assert(E.customerEffectsComparison(owner, {}, g.economy).rows.every(r => !r.eligible));
const invalid = copy(draft); invalid.relationshipOfferPolicy.segment = 'unknown';
assert(E.customerEffectsComparison(owner, invalid, g.economy).rows.every(r => !r.eligible));
const unaffordable = copy(owner); unaffordable.stats.cash = 0;
assert(!row(E.customerEffectsComparison(unaffordable, draft, g.economy), 'offers').eligible);
const old = fresh({ relationshipOffersVersion: 0 }), oldOwner = E.publicState(old, 0).me;
assert.equal(E.customerEffectsComparison(oldOwner, planFor(oldOwner), old.economy).supported, false);

// Committed retirement remains a draft instruction; forecasts cannot mutate the
// license or silently invent a replacement target/positive conversion budget.
const retired = copy(draft); retired.productProgramPolicy = E.productProgramPolicy(owner);
retired.productProgramPolicy.retire = ['rewards'];
for (const book of Object.values(retired.productProgramPolicy.markets)) for (const mix of Object.values(book)) { mix.essential = 1; mix.rewards = 0; }
const retireBefore = JSON.stringify({ owner, retired }), retirement = E.customerEffectsComparison(owner, retired, g.economy);
for (const r of retirement.rows) { assert(r.eligible, r.reason); assert.equal(r.metrics.offer.converted, 0); assert.equal(r.patch.relationshipOfferPolicy.share, 0); }
assert.equal(JSON.stringify({ owner, retired }), retireBefore);
assert.equal(JSON.stringify({ g, owner, draft }), initial);
console.log('Customer effects PASS: four sanitized scenarios, retention timing, obligations, purity, and ' + equivalence + ' captured-preview equivalence cases.');
