'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../BRANCH_WARS.html'), 'utf8'), copy = x => JSON.parse(JSON.stringify(x));
const c = { console }, hooks = 'root.householdTest={withMarket,delta,transferMarket,settleHouseholdRetention,moveHouseholdCounts,householdSalesStaff,validateHouseholdSave,syncAccounts};';
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={', hooks + 'root.BWEngine={'), c);
const E = c.BWEngine, H = c.householdTest;
const options = { customerOwnershipVersion: 1, workforceVersion: 1, customerDemandVersion: 2, managementVersion: 2, campaignRulesVersion: 1, mode: 'hotseat', seed: 'household-test', created: 1 };
const fresh = extra => E.createGame({ ...options, ...extra });
function plan(p, extra = {}) { return { focus: p.focus, allocation: { ...p.allocation }, decision: 'b', depositPolicy: 'balanced', lendingPolicy: 'balanced', capitalPolicy: 'balanced', products: { ...p.products }, newProjects: [], investments: {}, hires: 0, competitiveAction: 'none', ...extra }; }
function turn(g, plans) { g.event = { ...E.EVENTS.find(e => e.key === 'quiet') }; g.opportunities = []; E.submit(g, 0, plans[0]); E.submit(g, 1, plans[1]); E.validatePilot(g); E.validateLedger(g); for (const p of g.players) E.AccountingPrototype.check(p.accounting); }
function totals(g) { return Object.fromEntries(Object.entries(g.marketEconomy.markets).map(([k, m]) => [k, Object.fromEntries(Object.keys(E.CUSTOMER_SEGMENTS).map(s => [s, m.households.community[s] + m.households.union[s] + g.players.reduce((n, p) => n + p.householdBook.markets[k][s], 0)]))])); }
const g = fresh(), p = g.players[0], initial = totals(g);
assert.equal(g.version, '8.6'); E.validatePilot(g);
assert.throws(() => fresh({ customerOwnershipVersion: 2 }), /ownership version/);
assert.throws(() => fresh({ workforceVersion: 0 }), /requires/);
const old = fresh({ customerOwnershipVersion: 0 }); assert.equal(old.version, '8.5');
assert.equal(old.players[0].householdBook, undefined); assert.equal(E.migrateCampaign(old).version, '8.5');
assert.throws(() => E.submit(old, 0, plan(old.players[0], { householdPolicy: E.defaultHouseholdPolicy() })), /new household/);

// All ordinary movement routes conserve each segment, not just aggregate counts.
H.withMarket(g, () => {
  H.delta(p, 'customers', 55); H.delta(p, 'customers', -35);
  H.transferMarket(g, p, g.players[1], 'downtown', 'customers', 71);
});
assert.deepEqual(totals(g), initial); E.validatePilot(g);
E.finishProject(g, p, { key: 'acquisition', target: 'northside' });
assert.deepEqual(totals(g), initial); E.validatePilot(g);
const from = { everyday: 1, connected: 100, reserve: 3 }, to = { everyday: 0, connected: 0, reserve: 0 };
H.moveHouseholdCounts(from, to, 99, { everyday: 1000, connected: .1, reserve: 1 });
assert.equal(Object.values(to).reduce((a, b) => a + b, 0), 99); assert(Object.values(from).every(n => n >= 0));
assert.throws(() => H.moveHouseholdCounts(from, to, 6), /exceeds/);

// Priority changes trade capacity, not ownership. Existing product fit is not
// relabeled when the sales mix changes. Specialists' time is never duplicated.
const before = JSON.stringify(p), balanced = E.householdServiceReview(p);
const priority = E.defaultHouseholdPolicy(); priority.priority = { everyday: 3, connected: 1, reserve: 0 };
const focused = E.householdServiceReview(p, p.allocation, priority);
assert(focused.rows.filter(r => r.segment === 'reserve' && r.count).every(r => r.coverage === 0));
assert(focused.rows.find(r => r.segment === 'everyday').coverage > balanced.rows.find(r => r.segment === 'everyday').coverage);
assert.equal(JSON.stringify(p), before);
const resales = copy(p); resales.retailLifecycle.mix = { essential: 0, rewards: 0, highYield: 4 };
assert.deepEqual(copy(E.householdServiceReview(resales)), copy(balanced));
const specialist = copy(p); specialist.workforce.departments.service = { count: 2, skill: 100, trainingSpend: 0 };
const capacity = E.householdServiceReview(specialist); assert.equal(capacity.capacity + capacity.salesStaff, 3.8);
assert.equal(H.householdSalesStaff(specialist, 3.8), capacity.salesStaff);
const previewPlan = plan(p, { householdPolicy: priority });
const unchanged = JSON.stringify(g), forecast = E.operatingPreview(E.publicState(g, 0).me, previewPlan, g.economy);
assert(Number.isFinite(forecast.householdDepartures)); assert.equal(JSON.stringify(g), unchanged);

// Poor service has delayed costs; returning a segment to adequate coverage
// reduces departures but does not instantly restore trust.
const bad = fresh(), bank = bad.players[0];
for (const row of Object.values(bank.customerRelationships.markets)) for (const k of Object.keys(row)) row[k] = 20;
bank.householdBook.policy.retention = 25; bank.allocation = { service: 0, business: 5, lending: 2, operations: 1 };
const neglected = E.householdServiceReview(bank), rescued = E.householdServiceReview(bank, { service: 8, business: 0, lending: 0, operations: 0 }, { ...E.defaultHouseholdPolicy(), retention: 100 });
assert(neglected.rows.reduce((n, r) => n + r.departures, 0) > rescued.rows.reduce((n, r) => n + r.departures, 0));
const beforeBalance = copy(bank.accounting.accounts), beforeTotal = totals(bad), startCustomers = bank.stats.customers;
const report = H.settleHouseholdRetention(bad, bank);
assert(report.departed > 0); assert.equal(bank.stats.customers, startCustomers - report.departed);
assert.equal(bank.stats.deposits, beforeBalance.deposits - report.depositOutflow);
assert.equal(bank.stats.cash, beforeBalance.cash - report.depositOutflow);
assert.equal(bank.stats.capital, beforeBalance.equity); assert.deepEqual(totals(bad), beforeTotal);
const settled = JSON.stringify(bad); H.settleHouseholdRetention(bad, bank); assert.equal(JSON.stringify(bad), settled, 'same-month retention is idempotent');

const squeeze = fresh(), sq = squeeze.players[0];
for (const row of Object.values(sq.customerRelationships.markets)) for (const k of Object.keys(row)) row[k] = 0;
sq.accounting = E.AccountingPrototype.transact(sq.accounting, 'buySecurities', sq.stats.cash); H.syncAccounts(sq);
const priorEquity = sq.stats.capital, squeezed = H.settleHouseholdRetention(squeeze, sq);
assert(squeezed.fundingLoss > 0); assert.equal(sq.stats.capital, priorEquity - squeezed.fundingLoss); E.AccountingPrototype.check(sq.accounting);

const delay = fresh(), dp = delay.players[0];
let delayedDepartures = 0;
for (let month = 0; month < 7; month++) {
  turn(delay, [plan(dp, { allocation: { service: 0, business: 5, lending: 2, operations: 1 } }), plan(delay.players[1])]);
  if (month < 2) assert.equal(dp.householdBook.report.departed, 0, 'neutral customers do not immediately abandon the bank');
  delayedDepartures += dp.householdBook.report.departed;
}
assert(delayedDepartures > 0, 'sustained neglect reaches real departure consequences');

const locked = fresh(), lp = locked.players[0];
for (const row of Object.values(lp.customerRelationships.markets)) for (const k of Object.keys(row)) row[k] = 0;
for (const cohort of lp.depositBook.cohorts) { cohort.locked = true; cohort.remaining = 6; }
const lockedBefore = JSON.stringify(lp.depositBook), principal = lp.stats.deposits;
const lr = H.settleHouseholdRetention(locked, lp); assert(lr.departed > 0); assert.equal(lr.depositOutflow, 0); assert.equal(lp.stats.deposits, principal); assert.equal(JSON.stringify(lp.depositBook), lockedBefore);

// Full resolution, owner privacy, sealed save continuation and corrupt imports.
turn(g, [plan(p, { householdPolicy: priority }), plan(g.players[1])]);
assert.deepEqual(totals(g), initial);
const pub = E.publicState(g, 0); assert.equal(pub.rival.householdBook, undefined); assert.equal(pub.lastPlans[g.players[1].id].householdPolicy, undefined);
pub.me.householdBook.markets.downtown.everyday = 0; assert.notEqual(p.householdBook.markets.downtown.everyday, 0);
const half = copy(g); E.submit(half, 0, plan(half.players[0])); const imported = E.migrateCampaign(half), next = plan(half.players[1]);
E.submit(half, 1, copy(next)); E.submit(imported, 1, copy(next));
const normal = x => { const y = copy(x); delete y.ledgerVersion; y.players.forEach(p => delete p.strategy); return y; };
assert.deepEqual(normal(half), normal(imported));
for (const damage of [x => delete x.players[0].householdBook, x => x.customerOwnershipVersion = 2, x => x.version = '8.5',
  x => x.players[0].householdBook.markets.downtown.everyday++, x => x.marketEconomy.markets.downtown.households.community.connected++,
  x => x.players[0].householdBook.policy.retention = 99, x => x.players[0].householdBook.policy.priority.everyday = -1,
  x => x.players[0].householdBook.lastCycle = 999, x => x.players[0].householdBook.report.departed++,
  x => x.players[0].operatingReport.householdDepositOutflow++, x => x.players[0].householdBook.markets.extra = {},
  x => delete x.customerOwnershipVersion]) {
  const invalid = copy(half); damage(invalid); const before = JSON.stringify(invalid); assert.throws(() => E.migrateCampaign(invalid)); assert.equal(JSON.stringify(invalid), before);
}
for (const invalid of [{ retention: 25, priority: { everyday: 0, connected: 0, reserve: 0 } }, { retention: '75', priority: { everyday: 1, connected: 1, reserve: 1 } }]) assert.throws(() => E.validateHouseholdPolicy(invalid));
const rematch = copy(g); rematch.gameOver = true; E.rematch(rematch, 0); E.rematch(rematch, 1); assert.equal(rematch.version, '8.6'); assert.equal(rematch.players[0].householdBook.lastCycle, 0); E.validatePilot(rematch);

// Real client staging. Changes are private, persist only on lock, and a market
// inspection never changes a project/opportunity target.
const { harness } = require('./github_resilience.test.js'), ui = harness(); ui.c.world = fresh();
ui.run("game=world;seat=0;workspaceTab='customers';newDraft(E.publicState(game,0));renderReady=()=>{};toast=()=>{};renderHouseholds(E.publicState(game,0))");
assert(ui.elements.get('#householdPanel').innerHTML.includes('CUSTOMERS &amp; RETENTION'));
const gameBefore = JSON.stringify(ui.state().game), target = ui.run('draft.focus');
assert(ui.run("stageHouseholdPolicy(E.publicState(game,0),50,{everyday:2,connected:1,reserve:1})"));
assert.equal(JSON.stringify(ui.state().game), gameBefore); assert.equal(ui.run('draft.householdPolicy.retention'), 50);
ui.run("selectedHouseholdMarket='university';renderHouseholds(E.publicState(game,0))"); assert.equal(ui.run('draft.focus'), target);
ui.run('game.players[0].submitted={}'); assert.equal(ui.run("stageHouseholdPolicy(E.publicState(game,0),75,{everyday:1,connected:1,reserve:1})"), false);
let turns = 0;
for (const scenario of Object.keys(E.SCENARIOS)) {
  const game = fresh({ scenario, seed: 'household-ai-' + scenario }), conserved = totals(game);
  for (let t = 0; t < 24 && !game.gameOver; t++) {
    const plans = [E.chooseBot(game, 0), E.chooseBot(game, 1)]; E.submit(game, 0, plans[0]); E.submit(game, 1, plans[1]);
    E.validatePilot(game); E.validateLedger(game); assert.deepEqual(totals(game), conserved); turns++;
    assert(Buffer.byteLength(JSON.stringify(E.publicState(game, 0))) < 1048576);
  }
}
console.log(JSON.stringify({ passed: true, turns, checks: ['exact segment conservation', 'outside movement and acquisitions', 'capped weighted intake', 'service/sales tradeoff', 'specialist time conservation', 'delayed churn', 'locked deposits', 'accounting', 'pure preview', 'sealed save', 'invalid imports', 'owner privacy', 'UI staging', 'AI reachability'] }, null, 2));
