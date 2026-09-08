// Local advertising v1. Awareness redirects ordinary, quota-limited intake.
// Assisted attribution is a modelled share of actual intake, not causal lift/ROI.
const ADVERTISING_BUDGETS = [0, 15000, 40000, 80000];
const ADVERTISING_CONTACT_COST = { everyday: 15, connected: 12, reserve: 30 };
const ADVERTISING_DECAY = .75;
function defaultAdvertisingPolicy(p) { return { market: p.focus, segment: 'everyday', product: 'essential', budget: 0 }; }
function validateAdvertisingPolicy(p, policy, targets = p.productPrograms?.markets) {
  if (!policy || Object.keys(policy).sort().join() !== 'budget,market,product,segment' ||
      !Object.hasOwn(p.marketBook?.markets || {}, policy.market) || !Object.hasOwn(CUSTOMER_SEGMENTS, policy.segment) ||
      !Object.hasOwn(DEPOSIT_SERVICE, policy.product) || !ADVERTISING_BUDGETS.includes(policy.budget)) throw Error('Choose a known advertising market, audience, product and budget.');
  if (policy.budget && !targets?.[policy.market]?.[policy.segment]?.[policy.product]) throw Error('Advertising requires an open product for the selected local audience.');
  return policy;
}
function initializeAdvertising(g, o) {
  if (o.advertisingVersion !== 1) return g;
  if (![1, 2].includes(g.productProgramsVersion)) throw Error('Advertising requires the Product programmes preview and its prerequisites.');
  g.advertisingVersion = 1; g.version = '8.10';
  for (const p of g.players) p.advertising = { version: 1, lastCycle: 0, policy: defaultAdvertisingPolicy(p), report: null,
    awareness: Object.fromEntries(Object.keys(p.marketBook.markets).map(k => [k,
      Object.fromEntries(Object.keys(CUSTOMER_SEGMENTS).map(s => [s, { essential: 0, rewards: 0, highYield: 0 }]))])) };
  return g;
}
function normalizeAdvertisingPlan(p, plan) {
  if (!p.advertising) { if (plan.advertisingPolicy !== undefined) throw Error('Advertising requires a new advertising campaign.'); return; }
  const policy = JSON.parse(JSON.stringify(plan.advertisingPolicy || p.advertising.policy));
  validateAdvertisingPolicy(p, { ...policy, budget: 0 });
  if (!ADVERTISING_BUDGETS.includes(policy.budget)) throw Error('Choose a valid advertising budget.');
  const targets = plan.productProgramPolicy?.markets || p.productPrograms.markets;
  // Product closure is authoritative. A standing campaign pauses automatically
  // rather than blocking retirement or spending against an unavailable offer.
  if (policy.budget && !targets[policy.market][policy.segment][policy.product]) policy.budget = 0;
  plan.advertisingPolicy = validateAdvertisingPolicy(p, policy, targets);
}
function applyAdvertisingPolicy(p, policy) {
  if (!p.advertising) return;
  const input = { advertisingPolicy: policy || p.advertising.policy };
  normalizeAdvertisingPlan(p, input);
  p.advertising.policy = { ...input.advertisingPolicy };
}
function advertisingFit(p, market, segment, product) {
  const models = marketFacilities(p, market), channel = segment === 'everyday' && models.includes('retail') ? .08 : segment === 'connected' && models.includes('digital') ? .1 : 0;
  return CUSTOMER_SEGMENTS[segment].fit[product] + channel;
}
function advertisingSalesStaff(p) { return householdSalesStaff(p, workforceAllocation(p).service); }
function advertisingBoost(p, market, segment, product, awareness = p.advertising?.awareness?.[market]?.[segment]?.[product] || 0) {
  if (!p.advertising || !productTargetMix(p, market, segment)[product]) return 0;
  return Math.min(.5, awareness / 10000 * .4 * advertisingFit(p, market, segment, product) * Math.min(1, advertisingSalesStaff(p)));
}
function advertisingPreview(p, g, policy = p.advertising?.policy) {
  if (!p.advertising) return null;
  validateAdvertisingPolicy(p, policy);
  const world = g?.marketEconomy || marketContext?.marketEconomy || p.marketSnapshot;
  if (!world?.markets?.[policy.market]) throw Error('Advertising needs a local market snapshot.');
  const market = world.markets[policy.market], audience = market.households.community[policy.segment] + market.households.union[policy.segment];
  const before = p.advertising.awareness[policy.market][policy.segment][policy.product], retained = Math.floor(before * ADVERTISING_DECAY);
  const available = Math.max(0, Math.min(p.stats.cash - (p.workforce?.policy.reserve || 0), pilotSpendingLimit(p)) - (p._workforceReserved || 0) - (p.onboarding ? (p._relationshipOfferBudget || 0) + (p._onboardingBudget || 0) : 0));
  const paused = policy.budget > available, spent = paused ? 0 : policy.budget;
  const reached = Math.min(audience, Math.floor(spent / ADVERTISING_CONTACT_COST[policy.segment]));
  const after = retained + (audience ? Math.floor((10000 - retained) * reached / audience) : 0);
  return { policy: { ...policy }, audience, before, after, reached, requested: policy.budget, spent, paused,
    staff: advertisingSalesStaff(p), fit: advertisingFit(p, policy.market, policy.segment, policy.product),
    boost: advertisingBoost(p, policy.market, policy.segment, policy.product, after) };
}
function beginAdvertisingCycle(g, p, preview = false) {
  if (!p.advertising) return;
  const cycle = g.cycle || p.advertising.lastCycle + 1;
  if (p.advertising.lastCycle >= cycle || p._advertisingCycle) throw Error('Advertising cycle already settled or in progress.');
  const quote = advertisingPreview(p, g);
  for (const row of Object.values(p.advertising.awareness)) for (const mix of Object.values(row))
    for (const key of Object.keys(mix)) mix[key] = Math.floor(mix[key] * ADVERTISING_DECAY);
  p.advertising.awareness[quote.policy.market][quote.policy.segment][quote.policy.product] = quote.after;
  const rows = [];
  for (const [market, row] of Object.entries(p.advertising.awareness)) for (const [segment, mix] of Object.entries(row))
    for (const [product, awareness] of Object.entries(mix)) if (awareness) rows.push({ market, segment, product, awareness,
      boost: advertisingBoost(p, market, segment, product), deposits: 0, households: 0, assistedDeposits: 0, assistedHouseholds: 0 });
  p._advertisingCycle = { cycle, ...quote, rows, charged: false };
}
function advertisingSupply(g, p, supply, freeze = false) {
  if (!p.advertising || !p._advertisingCycle || freeze) return supply;
  const world = g?.marketEconomy || marketContext?.marketEconomy || p.marketSnapshot;
  const out = JSON.parse(JSON.stringify(supply));
  for (const resource of ['customers', 'deposits']) {
    // Transfer allocation, never add it. A market also keeps its frozen ceiling;
    // two banks cannot use advertising to drain more than their existing quotas.
    const bonuses = {};
    for (const [market, row] of Object.entries(p.advertising.awareness)) {
      const weights = resource === 'customers' ? world.markets[market].households : world.markets[market].segmentDeposits;
      let weight = 0, boost = 0;
      for (const [segment, mix] of Object.entries(row)) {
        const n = weights.community[segment] + weights.union[segment], offers = productTargetMix(p, market, segment), total = Object.values(offers).reduce((a, b) => a + b, 0);
        weight += n;
        boost += n * Object.keys(mix).reduce((a, product) => a + offers[product] / total * advertisingBoost(p, market, segment, product), 0);
      }
      bonuses[market] = weight ? boost / weight : 0;
    }
    const donorKeys = Object.keys(out[resource]).filter(k => bonuses[k] === 0), donorTotal = donorKeys.reduce((n, k) => n + out[resource][k], 0);
    if (!donorTotal) continue;
    const requests = {};
    for (const [market, bonus] of Object.entries(bonuses)) {
      const available = world.markets[market].community[resource] + world.markets[market].union[resource];
      const ceiling = Math.min(available, p.marketQuota?.[resource]?.[market] ?? Math.floor(available * .05 * marketReach(p, market)));
      requests[market] = Math.min(Math.max(0, ceiling - out[resource][market]), Math.floor(out[resource][market] * bonus));
    }
    const wanted = Object.values(requests).reduce((a, b) => a + b, 0), allocationShift = Math.min(wanted, Math.floor(donorTotal * .2));
    if (!allocationShift) continue;
    const additions = marketSplit(allocationShift, requests), deductions = marketSplit(allocationShift, Object.fromEntries(donorKeys.map(k => [k, out[resource][k]])));
    for (const [key, n] of Object.entries(additions)) out[resource][key] += n;
    for (const [key, n] of Object.entries(deductions)) out[resource][key] -= n;
  }
  return out;
}
function advertisingProductWeights(p, market, segment, weights) {
  if (!p.advertising || !p._advertisingCycle) return weights;
  return Object.fromEntries(Object.entries(weights).map(([product, n]) => [product, n * (1 + advertisingBoost(p, market, segment, product))]));
}
function advertisingHouseholdWeights(p, market, weights) {
  if (!p.advertising || !p._advertisingCycle) return weights;
  return Object.fromEntries(Object.entries(weights).map(([segment, n]) => {
    const mix = productTargetMix(p, market, segment), total = Object.values(mix).reduce((a, b) => a + b, 0);
    const boost = Object.entries(mix).reduce((a, [product, w]) => a + w / total * advertisingBoost(p, market, segment, product), 0);
    return [segment, n * (1 + boost)];
  }));
}
function captureAdvertisingIntake(p, market, segment, product, resource, amount) {
  if (!p._advertisingCycle || !amount) return;
  if (!['deposits', 'households'].includes(resource) || !Number.isSafeInteger(amount) || amount < 0) throw Error('Invalid advertising intake observation.');
  const row = p._advertisingCycle.rows.find(r => r.market === market && r.segment === segment && r.product === product);
  if (row) row[resource] += amount;
}
function captureAdvertisingHouseholds(p, market, amounts) {
  if (!p._advertisingCycle) return;
  // The segment transfer is observed. Product attribution for households uses
  // the same opening mix; the model has no individual household account IDs.
  for (const [segment, n] of Object.entries(amounts)) {
    const mix = productTargetMix(p, market, segment), base = Object.fromEntries(Object.entries(mix).map(([product, emphasis]) => [product, emphasis * CUSTOMER_SEGMENTS[segment].fit[product]]));
    for (const [product, amount] of Object.entries(marketSplit(n, advertisingProductWeights(p, market, segment, base))))
      captureAdvertisingIntake(p, market, segment, product, 'households', amount);
  }
}
function adjustAdvertisingReport(p, report) {
  if (!p.advertising) return;
  const current = p._advertisingCycle;
  if (!current || current.charged) throw Error('Advertising expense must settle exactly once.');
  current.charged = true; report.advertisingCost = current.spent;
  report.expense += current.spent; report.profit -= current.spent;
}
function finishAdvertisingCycle(g, p) {
  if (!p.advertising) return;
  const current = p._advertisingCycle;
  if (!current || !current.charged) throw Error('Advertising report needs settled operating expense.');
  const report = JSON.parse(JSON.stringify(current)); delete report.charged; delete report.boost;
  for (const row of report.rows) {
    const fraction = row.boost / (1 + row.boost);
    row.assistedDeposits = Math.floor(row.deposits * fraction); row.assistedHouseholds = Math.floor(row.households * fraction);
  }
  for (const [total, key] of Object.entries({ depositIntake: 'deposits', householdIntake: 'households', assistedDeposits: 'assistedDeposits', assistedHouseholds: 'assistedHouseholds' }))
    report[total] = report.rows.reduce((n, row) => n + row[key], 0);
  p.advertising.report = report; p.advertising.lastCycle = report.cycle;
  return report;
}
function cleanupAdvertisingCycle(p) { if (p.advertising) delete p._advertisingCycle; }
function planAdvertising(g, index, input) {
  const p = g.players[index]; if (!p.advertising) return input;
  const plan = JSON.parse(JSON.stringify(input));
  plan.advertisingPolicy = { ...p.advertising.policy, budget: 0 };
  // Advertising is a modest periodic growth budget, never an investment return
  // forecast. Preserve funding/operating reserves; final AI cash planning may cut it.
  if (g.cycle % 3 !== index || p.stats.lastProfit < 75000 || p.stats.cash < 750000 || fundingPosition(p).excess > 0) return plan;
  const shadow = { ...p, allocation: plan.allocation, householdBook: { ...p.householdBook, policy: plan.householdPolicy || p.householdBook.policy },
    productPrograms: { ...p.productPrograms, markets: plan.productProgramPolicy?.markets || p.productPrograms.markets } };
  if (advertisingSalesStaff(shadow) < .5 && shadow.householdBook.policy.retention === 100) {
    const policy = { ...shadow.householdBook.policy, retention: 75 };
    // Spare service capacity may support a campaign; never create a service
    // deficit simply to make the new feature appear in an AI run.
    if (householdServiceReview(shadow, shadow.allocation, policy).coverage >= 1) shadow.householdBook.policy = policy;
  }
  if (advertisingSalesStaff(shadow) < .5) return plan;
  let best = null, score = 0;
  for (const [market, row] of Object.entries(shadow.productPrograms.markets)) for (const [segment, mix] of Object.entries(row)) for (const [product, emphasis] of Object.entries(mix)) if (emphasis) {
    const policy = { market, segment, product, budget: 15000 }, quote = advertisingPreview(shadow, g, policy);
    const value = quote.audience * marketReach(p, market) * quote.fit * emphasis / Object.values(mix).reduce((a, b) => a + b, 0) * (1 - quote.before / 10000);
    if (quote.audience >= 100 && !quote.paused && value > score) { score = value; best = policy; }
  }
  if (best) {
    plan.advertisingPolicy = best;
    if (planBudget(p, plan).remaining < 300000) plan.advertisingPolicy.budget = 0;
    else plan.householdPolicy = JSON.parse(JSON.stringify(shadow.householdBook.policy));
  }
  return plan;
}
function validateAdvertisingSave(g) {
  const has = p => p.advertising !== undefined || p._advertisingCycle !== undefined || p.submitted?.advertisingPolicy !== undefined;
  if (g.advertisingVersion === undefined) { if (g.players.some(has)) throw Error('Unversioned advertising'); return g; }
  if (g.advertisingVersion !== 1 || ![1, 2].includes(g.productProgramsVersion) || g.version !== campaignVersion(g)) throw Error('Unsupported advertising save');
  const uint = n => Number.isSafeInteger(n) && n >= 0, bps = n => uint(n) && n <= 10000;
  for (const p of g.players) {
    const state = p.advertising;
    if (!state || Object.keys(state).sort().join() !== 'awareness,lastCycle,policy,report,version' || state.version !== 1 ||
        state.lastCycle !== g.cycle - (g.gameOver ? 0 : 1) || p._advertisingCycle !== undefined ||
        !state.awareness || Object.keys(state.awareness).sort().join() !== Object.keys(p.marketBook.markets).sort().join()) throw Error('Invalid advertising state');
    validateAdvertisingPolicy(p, state.policy);
    for (const row of Object.values(state.awareness)) {
      if (!row || Object.keys(row).sort().join() !== 'connected,everyday,reserve') throw Error('Invalid advertising audience');
      for (const mix of Object.values(row)) if (!mix || Object.keys(mix).sort().join() !== 'essential,highYield,rewards' || !Object.values(mix).every(bps)) throw Error('Invalid advertising awareness');
    }
    if (!state.lastCycle) { if (state.report !== null) throw Error('Unexpected opening advertising report'); }
    else {
      const r = state.report;
      if (!r || Object.keys(r).sort().join() !== 'after,assistedDeposits,assistedHouseholds,audience,before,cycle,depositIntake,fit,householdIntake,paused,policy,reached,requested,rows,spent,staff' || r.cycle !== state.lastCycle ||
          ![r.requested, r.spent].every(n => ADVERTISING_BUDGETS.includes(n)) || typeof r.paused !== 'boolean' || r.spent !== (r.paused ? 0 : r.requested) ||
          ![r.audience, r.reached, r.depositIntake, r.householdIntake, r.assistedDeposits, r.assistedHouseholds].every(uint) || ![r.before, r.after].every(bps) || r.reached > r.audience ||
          !Number.isFinite(r.staff) || r.staff < 0 || !Number.isFinite(r.fit) || r.fit <= 0 || !Array.isArray(r.rows) || r.rows.length > Object.keys(p.marketBook.markets).length * 9 ||
          p.operatingReport?.advertisingCost !== r.spent) throw Error('Invalid advertising report');
      validateAdvertisingPolicy(p, { ...r.policy, budget: 0 });
      if (r.policy.budget !== r.requested) throw Error('Advertising spend disagrees with the policy');
      const seen = new Set();
      for (const row of r.rows) {
        const key = [row.market, row.segment, row.product].join('|');
        if (!row || Object.keys(row).sort().join() !== 'assistedDeposits,assistedHouseholds,awareness,boost,deposits,households,market,product,segment' ||
            !Object.hasOwn(p.marketBook.markets, row.market) || !Object.hasOwn(CUSTOMER_SEGMENTS, row.segment) || !Object.hasOwn(DEPOSIT_SERVICE, row.product) || seen.has(key) ||
            !bps(row.awareness) || row.awareness === 0 || state.awareness[row.market][row.segment][row.product] !== row.awareness ||
            !Number.isFinite(row.boost) || row.boost < 0 || row.boost > .5 || ![row.deposits, row.households, row.assistedDeposits, row.assistedHouseholds].every(uint) ||
            row.assistedDeposits !== Math.floor(row.deposits * (row.boost / (1 + row.boost))) || row.assistedHouseholds !== Math.floor(row.households * (row.boost / (1 + row.boost)))) throw Error('Invalid advertising attribution row');
        seen.add(key);
      }
      const awareRows = Object.values(state.awareness).flatMap(row => Object.values(row)).flatMap(mix => Object.values(mix)).filter(Boolean).length;
      if (seen.size !== awareRows || r.after !== state.awareness[r.policy.market][r.policy.segment][r.policy.product]) throw Error('Advertising report omits active awareness');
      for (const [total, key] of Object.entries({ depositIntake: 'deposits', householdIntake: 'households', assistedDeposits: 'assistedDeposits', assistedHouseholds: 'assistedHouseholds' }))
        if (r[total] !== r.rows.reduce((n, row) => n + row[key], 0)) throw Error('Advertising attribution totals disagree');
      if (r.depositIntake > p.operatingReport.customerAcquiredDeposits) throw Error('Advertising cannot claim more deposits than ordinary acquisition');
    }
    if (p.submitted) normalizeAdvertisingPlan(p, JSON.parse(JSON.stringify(p.submitted)));
  }
  return g;
}
