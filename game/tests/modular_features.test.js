'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), copy = value => JSON.parse(JSON.stringify(value));
const crypto = require('node:crypto'), portablePath = path.join(root, 'BRANCH_WARS.html');
const sha = input => crypto.createHash('sha256').update(input).digest('hex');
const reportMode = process.argv.includes('--report');
assert(!(reportMode && process.argv.includes('--source')), 'Release balance reports must use the final portable artifact, not changing source modules.');
const portableHash = reportMode ? sha(fs.readFileSync(portablePath)) : null;
let script;
if (process.argv.includes('--source')) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
  script = fs.readFileSync(path.join(root, 'src', manifest.engine.shell), 'utf8').replace('/* @modules */', () =>
    manifest.engine.modules.map(name => fs.readFileSync(path.join(root, 'src', name), 'utf8')).join('\n'));
} else script = fs.readFileSync(path.join(root, 'BRANCH_WARS.html'), 'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const hooks = 'root.modularTests={settleRegionalGrowth,regionalGrowthQuote,validateRegionalGrowthState,withMarket,delta};';
const context = { console }; vm.runInNewContext(script.replace('root.BWEngine={', hooks + 'root.BWEngine={'), context);
const E = context.BWEngine, H = context.modularTests;
const base = { campaignRulesVersion: 1, serviceExpansionVersion: 1, managementVersion: 2, customerDemandVersion: 2,
  workforceVersion: 1, customerOwnershipVersion: 1, creditPerformanceVersion: 1, segmentDepositsVersion: 1, productProgramsVersion: 1,
  relationshipOffersVersion: 0, onboardingVersion: 0, mode: 'hotseat', created: 1, seed: 'modular-matrix' };
const fresh = extra => E.createGame({ ...base, featureRulesVersion: 1, ...extra });
const plan = p => ({ focus: p.focus, allocation: { ...p.allocation }, decision: 'b', depositPolicy: 'balanced', lendingPolicy: 'balanced',
  capitalPolicy: 'balanced', products: { ...p.products }, newProjects: [], investments: {}, hires: 0, competitiveAction: 'none', opportunity: null });
const normalized = game => { const out = copy(game); delete out.featureRulesVersion; out.version = 'same-rules'; return out; };
const ownership = game => copy({ rng: game.rng, players: game.players.map(p => ({ stats: p.stats, accounting: p.accounting,
  marketBook: p.marketBook, householdBook: p.householdBook, depositBook: p.depositBook, creditBook: p.creditBook })), marketEconomy: game.marketEconomy, growth: game.regionalGrowth });
function valid(g) { E.validatePilot(g); E.validateLedger(g); E.validateCampaignRules(g, 'game'); }
function submitBoth(g, plans, reversed = false) { for (const i of reversed ? [1, 0] : [0, 1]) E.submit(g, i, plans[i]); valid(g); }
let months = 0, exactExistingMonths = 0;
for (const scenario of ['balanced', 'rate', 'regulatory', 'growth']) for (const advertisingVersion of [0, 1]) for (const regionalGrowthVersion of [0, 1]) {
  const options = { ...base, scenario, advertisingVersion, regionalGrowthVersion }, game = fresh(options);
  assert.equal(game.version, '8.14'); assert.equal(game.featureRulesVersion, 1); valid(game);
  assert.equal(game.advertisingVersion, advertisingVersion || undefined); assert.equal(game.regionalGrowthVersion, regionalGrowthVersion || undefined);
  assert.equal(game.players[0].onboarding, undefined); assert.equal(game.players[0].relationshipOffers, undefined);
  assert.equal(E.validateCampaignRules(options.featureRulesVersion ? options : { ...options, featureRulesVersion: 1 }).signature,
    E.validateCampaignRules(E.publicState(game, 0), 'view').signature);
  const comparable = !regionalGrowthVersion || advertisingVersion ? E.createGame(options) : null;
  if (comparable) { valid(comparable); assert.deepEqual(normalized(game), normalized(comparable)); }
  for (let month = 0; month < 8 && !game.gameOver; month++) {
    const snapshot = JSON.stringify(game);
    for (let seat = 0; seat < 2; seat++) {
      const owner = E.publicState(game, seat).me;
      E.operatingPreview(owner, plan(owner), game.economy);
      if (regionalGrowthVersion) E.regionalGrowthReview(game);
    }
    assert.equal(JSON.stringify(game), snapshot, 'Pure forecasts changed state or RNG.');
    const plans = game.players.map((p, i) => E.chooseBot(game, i));
    const reverse = month === 0 ? copy(game) : null;
    if (comparable) {
      const oldPlans = comparable.players.map((p, i) => E.chooseBot(comparable, i));
      assert.deepEqual(copy(plans), copy(oldPlans)); submitBoth(comparable, oldPlans);
    }
    if (!advertisingVersion) plans.forEach(p => assert.equal(p.advertisingPolicy, undefined));
    submitBoth(game, plans);
    if (reverse) { submitBoth(reverse, copy(plans), true); assert.deepEqual(normalized(game), normalized(reverse), 'Submission arrival order changed resolution.'); }
    if (comparable) { assert.deepEqual(normalized(game), normalized(comparable)); exactExistingMonths++; }
    const resumed = E.migrateCampaign(copy(game));
    assert.equal(resumed.featureRulesVersion, 1); assert.equal(resumed.version, '8.14'); valid(resumed);
    assert.equal(E.validateCampaignRules(resumed, 'game').signature, E.validateCampaignRules(game, 'game').signature);
    months++;
  }
  const rematch = copy(game); rematch.gameOver = true; E.rematch(rematch, 0); E.rematch(rematch, 1);
  assert.equal(rematch.featureRulesVersion, 1); assert.equal(rematch.version, '8.14'); valid(rematch);
  assert.equal(rematch.advertisingVersion, advertisingVersion || undefined); assert.equal(rematch.regionalGrowthVersion, regionalGrowthVersion || undefined);
}
// No hidden Ad object is needed. Paid-off Advertising must have the same economic
// effect as absent Advertising under identical manual policies.
const growthOnly = fresh({ advertisingVersion: 0, regionalGrowthVersion: 1 }), zeroAd = fresh({ advertisingVersion: 1, regionalGrowthVersion: 1 });
for (let month = 0; month < 4; month++) {
  const a = growthOnly.players.map(plan), b = zeroAd.players.map(plan);
  submitBoth(growthOnly, a); submitBoth(zeroAd, b);
  assert.deepEqual(ownership(growthOnly), ownership(zeroAd));
}
// Completing growth is an outside-world operation. It never creates bank money,
// consumes campaign randomness, or applies a second time in the same month.
const isolated = fresh({ advertisingVersion: 0, regionalGrowthVersion: 1 });
const players = JSON.stringify(isolated.players), rng = JSON.stringify(isolated.rng);
H.settleRegionalGrowth(isolated); H.validateRegionalGrowthState(isolated, true);
assert.equal(JSON.stringify(isolated.players), players); assert.equal(JSON.stringify(isolated.rng), rng);
const once = JSON.stringify(isolated); H.settleRegionalGrowth(isolated); assert.equal(JSON.stringify(isolated), once);
// A fully depleted outside book still conserves arrivals and clips departures.
const exhausted = fresh({ advertisingVersion: 0, regionalGrowthVersion: 1 }), owner = exhausted.players[0];
H.withMarket(exhausted, () => {
  H.delta(owner, 'deposits', Object.values(exhausted.marketEconomy.markets).reduce((n, m) => n + m.community.deposits + m.union.deposits, 0));
  H.delta(owner, 'customers', Object.values(exhausted.marketEconomy.markets).reduce((n, m) => n + m.community.customers + m.union.customers, 0));
});
exhausted.economy = { key: 'downturn', ...E.MACRO_REGIMES.downturn };
const drained = JSON.stringify(exhausted.players); H.settleRegionalGrowth(exhausted); H.validateRegionalGrowthState(exhausted, true);
assert.equal(JSON.stringify(exhausted.players), drained); assert(exhausted.regionalGrowth.report.totals.clippedDepartures.customers > 0);
// Strict profile gates: no silent opt-ins, missing prerequisites, mismatched
// save markers, or disabled-module state smuggled into a new ruleset.
for (const input of [{ ...base, featureRulesVersion: 1, productProgramsVersion: 0 },
  { ...base, featureRulesVersion: 1, relationshipOffersVersion: 1 }, { ...base, featureRulesVersion: 1, onboardingVersion: 1 },
  { ...base, featureRulesVersion: 2 }, { ...base, advertisingVersion: 0, regionalGrowthVersion: 1 }]) assert.throws(() => E.createGame(input));
for (const damage of [g => delete g.featureRulesVersion, g => g.featureRulesVersion = 0, g => g.featureRulesVersion = 2,
  g => g.version = '8.11', g => delete g.productProgramsVersion, g => g.advertisingVersion = 0,
  g => g.players[0].advertising = {}, g => g.players[0].relationshipOffers = {}, g => g.players[0].onboarding = {}]) {
  const broken = fresh({ advertisingVersion: 0, regionalGrowthVersion: 1 }); damage(broken);
  assert.throws(() => E.migrateCampaign(broken));
}
const enter = E.previewFeatureSelection({ ...base, regionalGrowthVersion: 1, advertisingVersion: 1, relationshipOffersVersion: 1, onboardingVersion: 1 }, { field: 'featureRulesVersion', value: 1 });
assert(enter.rules.valid); assert(enter.requiresConfirmation); assert.equal(enter.options.relationshipOffersVersion, 0); assert.equal(enter.options.onboardingVersion, 0);
const pair = E.previewFeatureSelection(enter.options, { field: 'advertisingVersion', value: 0 });
assert(pair.rules.valid); assert.equal(pair.options.regionalGrowthVersion, 1); assert(!pair.requiresConfirmation);
const leave = E.previewFeatureSelection(pair.options, { field: 'featureRulesVersion', value: 0 });
assert(leave.rules.valid); assert(leave.requiresConfirmation); assert.equal(leave.options.regionalGrowthVersion, 1); assert.equal(leave.options.advertisingVersion, 1);
const caps = E.campaignCapabilities(); delete caps.featureRulesSupported;
assert.equal(E.peerRulesIssue(pair.rules, caps).field, 'featureRulesVersion');
assert.equal(E.peerRulesIssue(pair.rules, E.campaignCapabilities()), null);
console.log(JSON.stringify({ passed: true, profiles: 16, months, exactExistingMonths,
  checks: ['four pairs and economic scenarios', 'unchanged existing rules', 'AI and pure previews', 'legacy refusal', 'marker save/view/rematch', 'off-state ownership', 'settlement-phase guards', 'outside conservation', 'pilot transition cascade', 'peer refusal'] }));
if (reportMode) {
  const cases = [], results = [], skipped = [], cancelled = [], failures = [];
  for (const scenario of ['balanced', 'rate', 'regulatory', 'growth']) for (const advertisingVersion of [0, 1]) for (const regionalGrowthVersion of [0, 1])
    for (const seed of [0, 1]) cases.push({ scenario, advertisingVersion, regionalGrowthVersion, seed, limit: 24, group: 'four-pair-matrix' });
  for (const advertisingVersion of [0, 1]) for (const regionalGrowthVersion of [0, 1])
    cases.push({ scenario: 'balanced', advertisingVersion, regionalGrowthVersion, seed: 0, limit: 120, group: 'four-pair-campaign' });
  for (const advertisingVersion of [0, 1]) cases.push({ scenario: 'regulatory', advertisingVersion, regionalGrowthVersion: 1, seed: 20, limit: 480, group: 'growth-pair-soak' });
  const duration = start => Number(process.hrtime.bigint() - start) / 1e6;
  const distribution = values => {
    const ordered = [...values].sort((a, b) => a - b);
    return { count: ordered.length, p50: ordered[Math.floor((ordered.length - 1) * .5)] || 0,
      p95: ordered[Math.floor((ordered.length - 1) * .95)] || 0, max: ordered.at(-1) || 0 };
  };
  const elapsed = process.hrtime.bigint(), planningMs = [], resolutionMs = [], projectionMs = [];
  let simulatedMonths = 0, maxViewBytes = 0;
  for (const scenarioCase of cases) {
    const g = fresh({ ...scenarioCase, seed: 'release-' + scenarioCase.scenario + '-' + scenarioCase.seed });
    const competition = { depositLeadChanges: 0, maxDepositSharePercent: [0, 0], longestDepositDominanceMonths: [0, 0],
      below10CapitalMonths: [0, 0], capitalReturnsTo10: [0, 0], lossMonths: [0, 0] };
    const activity = { initiatives: 0, competitiveActions: 0, providerChanges: 0, advertisingSpend: 0, advertisingMonths: 0,
      arrivals: { customers: 0, deposits: 0 }, departures: { customers: 0, deposits: 0 }, householdDepartures: 0,
      creditLoss: 0, collectionCost: 0, trainingCost: 0 };
    let leader = null, count = 0; const dominance = [0, 0], lowCapital = [false, false];
    for (; count < scenarioCase.limit && !g.gameOver; count++) {
      try {
        let timer = process.hrtime.bigint(); const plans = g.players.map((p, i) => E.chooseBot(g, i)); planningMs.push(duration(timer));
        const cycle = g.cycle, owners = g.serviceAgreements.map(c => c.owner);
        timer = process.hrtime.bigint(); submitBoth(g, plans); resolutionMs.push(duration(timer)); simulatedMonths++;
        const sum = g.players.reduce((n, p) => n + p.stats.deposits, 0), shares = g.players.map(p => sum ? p.stats.deposits / sum * 100 : 0);
        const nextLeader = shares[0] === shares[1] ? null : shares[0] > shares[1] ? 0 : 1;
        if (nextLeader !== null) { if (leader !== null && leader !== nextLeader) competition.depositLeadChanges++; leader = nextLeader; }
        activity.providerChanges += g.serviceAgreements.filter((c, i) => c.owner !== owners[i]).length;
        if (g.regionalGrowthVersion === 1) for (const kind of ['arrivals', 'departures']) for (const resource of ['customers', 'deposits'])
          activity[kind][resource] += g.regionalGrowth.report.totals[kind][resource];
        for (let seat = 0; seat < 2; seat++) {
          const p = g.players[seat], account = p.accounting.accounts;
          competition.maxDepositSharePercent[seat] = Math.max(competition.maxDepositSharePercent[seat], shares[seat]);
          dominance[seat] = shares[seat] >= 80 ? dominance[seat] + 1 : 0;
          competition.longestDepositDominanceMonths[seat] = Math.max(competition.longestDepositDominanceMonths[seat], dominance[seat]);
          const below = E.capitalRatio(p) < 10;
          if (below) competition.below10CapitalMonths[seat]++; else if (lowCapital[seat]) competition.capitalReturnsTo10[seat]++;
          lowCapital[seat] = below; if (p.stats.lastProfit < 0) competition.lossMonths[seat]++;
          E.AccountingPrototype.check(p.accounting);
          for (const key of ['cash', 'deposits', 'loans', 'capital', 'emergencyDebt']) assert.equal(p.stats[key], account[key === 'capital' ? 'equity' : key]);
          assert.equal(p.depositBook.cohorts.reduce((n, c) => n + c.principal, 0), account.deposits);
          assert.equal(p.creditBook.cohorts.reduce((n, c) => n + c.principal, 0), account.loans);
          assert.equal(Object.values(p.marketReport.rows).reduce((n, row) => n + row.contribution, 0) + p.marketReport.central, p.marketReport.profit);
          activity.householdDepartures += p.householdBook.report.departed;
          activity.creditLoss += p.creditPerformance.report.loss; activity.collectionCost += p.creditPerformance.report.cost;
          activity.trainingCost += p.operatingReport.workforceTraining;
          if (p.advertising) { activity.advertisingSpend += p.advertising.report.spent; if (p.advertising.report.spent) activity.advertisingMonths++; }
          if (plans[seat].competitiveAction !== 'none') activity.competitiveActions++;
          for (const key of E.planInitiatives(plans[seat])) {
            activity.initiatives++;
            if (!g.resolution.some(line => line.startsWith(p.name + ' began ' + E.PROJECTS[key].name))) {
              const notice = g.resolution.find(line => line.startsWith(p.name + ' cancelled ' + E.PROJECTS[key].name + ': cash changed before execution') && line.endsWith('No project cost was charged; select it again in a later plan.'));
              (notice ? cancelled : skipped).push({ ...scenarioCase, cycle, seat, key, ...(notice ? { notice } : {}) });
            }
          }
          timer = process.hrtime.bigint(); const bytes = Buffer.byteLength(JSON.stringify(E.publicState(g, seat))); projectionMs.push(duration(timer));
          maxViewBytes = Math.max(maxViewBytes, bytes); assert(bytes < 1048576, 'Player projection exceeds 1 MiB.');
        }
      } catch (error) { failures.push({ ...scenarioCase, cycle: g.cycle, message: error.message }); break; }
    }
    const totalDeposits = g.players.reduce((n, p) => n + p.stats.deposits, 0);
    results.push({ ...scenarioCase, completedMonths: count, ended: g.gameOver, reason: g.endReason || null,
      capitalRatio: g.players.map(p => E.capitalRatio(p)), equity: g.players.map(p => p.stats.capital), cash: g.players.map(p => p.stats.cash),
      deposits: g.players.map(p => p.stats.deposits), depositSharePercent: g.players.map(p => totalDeposits ? p.stats.deposits / totalDeposits * 100 : 0),
      profits: g.players.map(p => p.stats.lastProfit), competition, activity });
    console.log(JSON.stringify({ modularBalanceProgress: results.length, cases: cases.length, group: scenarioCase.group, scenario: scenarioCase.scenario,
      seed: scenarioCase.seed, advertisingVersion: scenarioCase.advertisingVersion, regionalGrowthVersion: scenarioCase.regionalGrowthVersion, completedMonths: count, ended: g.gameOver }));
  }
  assert.equal(sha(fs.readFileSync(portablePath)), portableHash, 'Portable changed during the balance run.');
  const report = { passed: failures.length === 0 && skipped.length === 0, sourceSha256: portableHash, node: process.version, featureRulesVersion: 1,
    requestedCases: cases.length, requestedMonthSlots: cases.reduce((n, row) => n + row.limit, 0), simulatedMonths, maxViewBytes,
    elapsedMs: duration(elapsed), performanceMs: { planning: distribution(planningMs), resolution: distribution(resolutionMs), projection: distribution(projectionMs) },
    definitions: { dominance: 'Consecutive resolved months with at least 80% of combined-player deposits, outside institutions excluded.',
      capitalReturnsTo10: 'A sampled below-10% capital period followed by one resolved month at or above 10%; not a sustained comeback claim.',
      passed: 'Accounting, conservation, lifecycle, projection budget and initiative execution gates; not human balance or two-computer acceptance.' },
    skippedInitiatives: skipped, cancelledInitiatives: cancelled, failures, results };
  const directory = path.join(root, 'reports/baselines'); fs.mkdirSync(directory, { recursive: true });
  const reportPath = path.join(directory, 'modular-balance-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ reportPath, passed: report.passed, sourceSha256: portableHash, simulatedMonths, maxViewBytes,
    failures: failures.length, skipped: skipped.length, cancelled: cancelled.length, earlyEnded: results.filter(row => row.ended).length }));
  assert(report.passed, 'Modular balance invariant or initiative execution gate failed.');
}
