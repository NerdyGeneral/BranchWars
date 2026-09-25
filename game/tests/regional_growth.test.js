'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), copy = x => JSON.parse(JSON.stringify(x));
// --source checks the assembled modules in memory while other contributors work;
// it never rebuilds or overwrites the portable artifact.
let engine;
if (process.argv.includes('--source')) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
  engine = fs.readFileSync(path.join(root, 'src', manifest.engine.shell), 'utf8').replace('/* @modules */', () =>
    manifest.engine.modules.map(file => fs.readFileSync(path.join(root, 'src', file), 'utf8')).join('\n'));
} else engine = fs.readFileSync(path.join(root, 'BRANCH_WARS.html'), 'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const hooks = `
const regionalGrowthTraces=[];
const originalGrowthSettlement=settleRegionalGrowth;
settleRegionalGrowth=function(g){
 const before=JSON.stringify(g.players),rng=JSON.stringify(g.rng),cycle=g.cycle,regime=g.economy.key;
 const unrelated=()=>JSON.stringify(Object.entries(g.marketEconomy.markets).map(([k,m])=>[k,
   Object.fromEntries(['community','union','total'].map(owner=>[owner,Object.fromEntries(['business','merchant','wealth'].map(r=>[r,m[owner][r]]))]))]));
 const other=unrelated();
 const lines=originalGrowthSettlement(g);
 regionalGrowthTraces.push({before,after:JSON.stringify(g.players),rng,rngAfter:JSON.stringify(g.rng),other,otherAfter:unrelated(),cycle,regime,lines:[...lines]});
 return lines;
};
root.regionalGrowthTest={settleRegionalGrowth,validateRegionalGrowthSave,regionalGrowthQuote,withMarket,delta,syncAccounts,
 settleDepartedTermDeposits,traces:regionalGrowthTraces};
`;
const ctx = { console }; vm.runInNewContext(engine.replace('root.BWEngine={', hooks + 'root.BWEngine={'), ctx);
const E = ctx.BWEngine, H = ctx.regionalGrowthTest;
const options = { regionalGrowthVersion: 1, advertisingVersion: 1, productProgramsVersion: 1, segmentDepositsVersion: 1,
  creditPerformanceVersion: 1, customerOwnershipVersion: 1, workforceVersion: 1, customerDemandVersion: 2,
  managementVersion: 2, serviceExpansionVersion: 1, campaignRulesVersion: 1, mode: 'hotseat', seed: 'regional-growth', created: 1 };
const fresh = extra => E.createGame({ ...options, ...extra });
const plan = p => ({ focus: p.focus, allocation: { ...p.allocation }, decision: 'b', depositPolicy: 'balanced',
  lendingPolicy: 'balanced', capitalPolicy: 'balanced', products: { ...p.products }, newProjects: [], investments: {}, hires: 0,
  competitiveAction: 'none', opportunity: null });
const normalize = x => { const out = copy(x); delete out.ledgerVersion; out.players.forEach(p => delete p.strategy); return out; };
function turn(g, reversed = false) {
  g.event = { ...E.EVENTS.find(e => e.key === 'quiet') }; g.opportunities = [];
  const plans = g.players.map(plan);
  for (const i of reversed ? [1, 0] : [0, 1]) E.submit(g, i, plans[i]);
  E.validatePilot(g); E.validateLedger(g); g.players.forEach(p => E.AccountingPrototype.check(p.accounting));
}
function drainOutside(g) {
  const p = g.players[0];
  H.withMarket(g, () => {
    H.delta(p, 'deposits', Object.values(g.marketEconomy.markets).reduce((n, m) => n + m.community.deposits + m.union.deposits, 0));
    H.delta(p, 'customers', Object.values(g.marketEconomy.markets).reduce((n, m) => n + m.community.customers + m.union.customers, 0));
  });
}
function conserved(g) {
  const state = g.regionalGrowth;
  for (const [k, m] of Object.entries(g.marketEconomy.markets)) for (const r of ['customers', 'deposits']) {
    const pools = r === 'customers' ? m.households : m.segmentDeposits;
    for (const s of Object.keys(E.CUSTOMER_SEGMENTS)) {
      const owned = g.players.reduce((n, p) => n + (r === 'customers' ? p.householdBook.markets[k][s] :
        p.depositBook.cohorts.filter(c => c.market === k && c.segment === s).reduce((a, c) => a + c.principal, 0)), 0);
      assert.equal(pools.total[s], state.openingWorld[k][r][s] + state.cumulativeIn[k][r][s] - state.cumulativeOut[k][r][s]);
      assert.equal(pools.total[s], pools.community[s] + pools.union[s] + owned);
    }
  }
}
const g = fresh();
assert.equal(g.version, '8.11'); assert.equal(g.regionalGrowth.lastCycle, 0); E.validatePilot(g);
assert.deepEqual(copy(E.REGIONAL_GROWTH_RATES.steady), { arrivals: 50, departures: 20 });
assert.throws(() => fresh({ regionalGrowthVersion: 2 }), /regional growth/i);
assert.throws(() => fresh({ advertisingVersion: 0 }), /requires/i);
const old = fresh({ regionalGrowthVersion: 0 });
assert.equal(old.version, '8.10'); assert.equal(old.regionalGrowth, undefined); assert.equal(E.regionalGrowthReview(old), null);
const oldBefore = JSON.stringify(old); assert.deepEqual(copy(H.settleRegionalGrowth(old)), []); assert.equal(JSON.stringify(old), oldBefore);

// Public review is a disposable outside-only projection, never future bank intake.
const pristine = JSON.stringify(g), review = E.regionalGrowthReview(g);
assert.deepEqual(Object.keys(review).sort(), ['forecast', 'lastCycle', 'report', 'version']);
assert.equal(review.report, null); assert.equal(review.forecast.conditional, true); assert.equal(review.forecast.cycle, 1);
assert.equal(review.forecast.totals.before.customers, 27000); assert.equal(review.forecast.totals.before.deposits, 120000000);
for (let i = 0; i < 3; i++) { E.regionalGrowthReview(g); E.operatingPreview(E.publicState(g, 0).me, plan(g.players[0]), g.economy); }
assert.equal(JSON.stringify(g), pristine);
review.forecast.rows.downtown.before.customers.everyday = -1; assert.equal(JSON.stringify(g), pristine);
const projected = E.publicState(g, 0);
assert(projected.regionalGrowth); assert.equal(projected.me.marketSnapshot.regionalGrowth, undefined);
assert.equal(projected.regionalGrowth.openingWorld, undefined); assert.equal(projected.regionalGrowth.carry, undefined);
assert.equal(projected.rival.householdBook, undefined); assert.equal(projected.me.marketSnapshot.markets.downtown.segmentDeposits.total, undefined);

// Both seats resolve the same world once, after ordinary operations have finished.
const reverse = copy(g); turn(g); turn(reverse, true); assert.deepEqual(normalize(g), normalize(reverse));
assert.equal(g.regionalGrowth.lastCycle, 1); conserved(g);
assert.equal(g.regionalGrowth.report.regime, H.traces.at(-1).regime);
for (const t of H.traces) { assert.equal(t.before, t.after, 'External flow changed a bank book/account'); assert.equal(t.rng, t.rngAfter, 'External flow consumed RNG'); }
const first = g.regionalGrowth.report;
assert.equal(first.totals.after.deposits - first.totals.before.deposits, first.totals.net.deposits);
assert(first.totals.arrivals.deposits > 0); assert.equal(g.regionalGrowth.regimeCycles[first.regime], 1);
const flowEvents = g.eventLedger.filter(e => e.category === 'economy.external');
assert.equal(flowEvents.length, 2); assert.deepEqual(copy(flowEvents.map(e => e.target)), copy(g.players.map(p => p.id)));
assert.deepEqual(copy(flowEvents[0].changes), copy(flowEvents[1].changes));
for (const event of flowEvents) {
  assert.equal(event.source, 'settleRegionalGrowth'); assert.equal(event.visibility, 'owner'); assert.deepEqual(copy(event.deltas), {});
  assert.deepEqual(Object.keys(event.changes), ['regionalFlow']); assert.equal(event.changes.regionalFlow.before, null);
  assert.deepEqual(Object.keys(event.changes.regionalFlow.after).sort(), ['cycle', 'regime', 'totals']);
  assert.deepEqual(copy(event.changes.regionalFlow.after.totals), copy(first.totals));
}

// Empty outside demand stays unavailable this month; explicit closing arrivals
// create next month's supply even when the remaining opening pool is zero.
const empty = fresh(); drainOutside(empty); E.validatePilot(empty);
const dryPreview = E.operatingPreview(E.publicState(empty, 0).me, plan(empty.players[0]), empty.economy);
assert.equal(dryPreview.customerAcquiredDeposits, 0);
turn(empty); assert(empty.players.every(p => p.operatingReport.customerAcquiredDeposits === 0));
assert(empty.regionalGrowth.report.totals.arrivals.deposits > 0);
assert(empty.regionalGrowth.report.totals.after.deposits > 0);
turn(empty); assert(empty.players.some(p => p.operatingReport.customerAcquiredDeposits > 0)); conserved(empty);

// A fully depleted closing book clips all requested exits, then admits new
// households/savings. Negative net demand is real when ample outside supply exists.
const clipped = fresh(); drainOutside(clipped); clipped.economy = { key: 'downturn', ...E.MACRO_REGIMES.downturn };
const beforeClip = JSON.stringify(clipped.players); H.settleRegionalGrowth(clipped);
const cr = clipped.regionalGrowth.report; assert.equal(cr.totals.departures.customers, 0); assert.equal(cr.totals.departures.deposits, 0);
assert.deepEqual(copy(cr.totals.clippedDepartures), copy(cr.totals.requestedDepartures));
assert.deepEqual(copy(cr.totals.after), copy(cr.totals.arrivals)); assert.equal(JSON.stringify(clipped.players), beforeClip);
clipped.gameOver = true; H.validateRegionalGrowthSave(clipped); conserved(clipped);
const idempotent = JSON.stringify(clipped); assert.deepEqual(copy(H.settleRegionalGrowth(clipped)), []); assert.equal(JSON.stringify(clipped), idempotent);
assert.equal(E.regionalGrowthReview(clipped).forecast, null);
const contraction = fresh(); contraction.economy = { key: 'downturn', ...E.MACRO_REGIMES.downturn };
H.settleRegionalGrowth(contraction); assert(contraction.regionalGrowth.report.totals.net.customers < 0); assert(contraction.regionalGrowth.report.totals.net.deposits < 0);
contraction.gameOver = true; H.validateRegionalGrowthSave(contraction); conserved(contraction);

// Carries preserve sub-household fractions and the Growth Coast's exact 1.2
// arrival multiplier across a changing sequence of announced regimes.
const seasons = fresh(); let resolved = 0;
for (const regime of ['steady', 'tight', 'expansion', 'downturn', 'recovery', 'steady', 'steady', 'steady']) {
  seasons.economy = { key: regime, ...E.MACRO_REGIMES[regime] }; turn(seasons); resolved++;
  assert.equal(seasons.regionalGrowth.report.regime, regime); assert.equal(seasons.regionalGrowth.lastCycle, resolved); conserved(seasons);
  for (const [k, row] of Object.entries(seasons.regionalGrowth.openingOutside)) for (const r of ['customers', 'deposits']) for (const s of Object.keys(E.CUSTOMER_SEGMENTS)) {
    const rateSum = Object.entries(seasons.regionalGrowth.regimeCycles).reduce((n, [key, cycles]) => n + cycles * E.REGIONAL_GROWTH_RATES[key].arrivals, 0);
    const numerator = row[r][s] * rateSum * (seasons.territories[k].region === 'growthCoast' ? 12 : 10);
    assert.equal(seasons.regionalGrowth.cumulativeIn[k][r][s], Math.floor(numerator / 100000));
    assert.equal(seasons.regionalGrowth.carry.arrivals[k][r][s], numerator % 100000);
  }
}
// The fourth completed month stores its OLD regime even if cycle five chooses a
// different macro; the next quote always uses the currently announced economy.
assert.equal(E.regionalGrowthReview(seasons).forecast.regime, seasons.economy.key);

// Returned former-customer term savings join the outside pool before the closing
// external outflow. The boundary never pays, unlocks or rewrites the bank account.
const term = fresh(); drainOutside(term);
const tp = term.players[0], cohort = tp.depositBook.cohorts.find(c => c.market === 'downtown' && c.segment === 'reserve');
cohort.locked = true; cohort.remaining = 1; cohort.quotedCycle = 0; cohort.exiting = 12345;
const termAmount = H.settleDepartedTermDeposits(term, tp), bankAfterPayout = JSON.stringify(term.players);
assert.equal(termAmount, 12345); term.economy = { key: 'downturn', ...E.MACRO_REGIMES.downturn };
H.settleRegionalGrowth(term); assert.equal(term.regionalGrowth.report.rows.downtown.before.deposits.reserve, 12345);
assert(term.regionalGrowth.report.rows.downtown.departures.deposits.reserve > 0); assert.equal(JSON.stringify(term.players), bankAfterPayout); conserved(term);

// Sealed plans, resumed carries and conservation anchors are preserved exactly.
const half = copy(seasons); E.submit(half, 0, plan(half.players[0])); const imported = E.migrateCampaign(half);
E.submit(half, 1, plan(half.players[1])); E.submit(imported, 1, plan(imported.players[1]));
assert.deepEqual(normalize(half), normalize(imported)); E.validatePilot(half); conserved(half);
for (const damage of [
  x => delete x.regionalGrowthVersion, x => x.regionalGrowthVersion = 2, x => x.version = '8.10', x => delete x.advertisingVersion,
  x => delete x.regionalGrowth, x => x.regionalGrowth.extra = true, x => x.regionalGrowth.lastCycle++,
  x => x.regionalGrowth.openingOutside.downtown.deposits.reserve++, x => x.regionalGrowth.openingWorld.downtown.customers.everyday++,
  x => x.regionalGrowth.cumulativeIn.downtown.deposits.everyday++, x => x.regionalGrowth.cumulativeOut.downtown.customers.reserve++,
  x => x.regionalGrowth.carry.arrivals.downtown.customers.reserve++, x => x.regionalGrowth.carry.departures.downtown.deposits.reserve = 100000,
  x => x.regionalGrowth.regimeCycles.steady++, x => x.regionalGrowth.report.regime = 'unknown',
  x => x.regionalGrowth.report.rows.downtown.after.deposits.reserve++, x => x.regionalGrowth.report.rows.downtown.arrivals.customers.reserve++,
  x => x.regionalGrowth.report.totals.net.deposits++, x => x.regionalGrowth.report.rows.extra = {},
  x => x.marketEconomy.markets.downtown.segmentDeposits.total.everyday++
]) {
  const invalid = copy(half); damage(invalid); const before = JSON.stringify(invalid);
  assert.throws(() => E.migrateCampaign(invalid)); assert.equal(JSON.stringify(invalid), before, 'Rejected import mutated the save');
}
const unsafe = fresh(); unsafe.regionalGrowth.carry.arrivals.downtown.deposits.everyday = Number.MAX_SAFE_INTEGER;
const unsafeBefore = JSON.stringify(unsafe); assert.throws(() => H.settleRegionalGrowth(unsafe)); assert.equal(JSON.stringify(unsafe), unsafeBefore, 'Rejected settlement partly mutated the world');

// Real final-month integration: receivership checks occur after the boundary.
const terminal = fresh();
for (const p of terminal.players) {
  const loss = p.stats.capital + 2000000;
  p.accounting = E.AccountingPrototype.post(p.accounting, 'test.terminal', { securities: -loss, equity: -loss }, -loss);
  H.syncAccounts(p); p.distress = E.RECEIVERSHIP_CYCLES;
}
turn(terminal); assert(terminal.gameOver); assert.equal(terminal.regionalGrowth.lastCycle, terminal.cycle);
const ended = JSON.stringify(terminal); H.settleRegionalGrowth(terminal); assert.equal(JSON.stringify(terminal), ended);
assert.equal(E.regionalGrowthReview(terminal).forecast, null); conserved(terminal);
const rematch = copy(half); rematch.gameOver = true; E.rematch(rematch, 0); E.rematch(rematch, 1);
assert.equal(rematch.regionalGrowthVersion, 1); assert.equal(rematch.regionalGrowth.lastCycle, 0); assert.equal(rematch.regionalGrowth.report, null); E.validatePilot(rematch);
for (const t of H.traces) { assert.equal(t.before, t.after); assert.equal(t.rng, t.rngAfter); assert.equal(t.other, t.otherAfter); }
console.log(JSON.stringify({ passed: true, months: resolved + 7, checks: ['month-end timing', 'empty-pool recovery', 'clipped contraction', 'segment conservation', 'exact carries', 'pure forecasts', 'private anchors', 'term-return timing', 'sealed resume', 'corrupt imports', 'atomic rejection', 'terminal idempotence', 'rematch'] }, null, 2));
