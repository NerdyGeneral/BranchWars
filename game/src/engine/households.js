// Household ownership v1. Counts are conserved; deposits remain pooled by market.
const HOUSEHOLD_SERVICE = { everyday: 1.1, connected: .65, reserve: 1.3 };
function defaultHouseholdPolicy() { return { retention: 75, priority: { everyday: 1, connected: 1, reserve: 1 } }; }
function validateHouseholdPolicy(policy) {
  if (!policy || Object.keys(policy).sort().join() !== 'priority,retention' ||
      ![25, 50, 75, 100].includes(policy.retention) || !policy.priority ||
      Object.keys(policy.priority).sort().join() !== 'connected,everyday,reserve' ||
      Object.values(policy.priority).some(n => !Number.isInteger(n) || n < 0 || n > 3) ||
      !Object.values(policy.priority).some(n => n > 0)) throw Error('Choose a retention share and at least one valid household service priority.');
  return policy;
}
function normalizeHouseholdPlan(p, plan) {
  if (!p.householdBook) {
    if (plan.householdPolicy !== undefined) throw Error('Household service priorities require a new household ownership campaign.');
    return;
  }
  plan.householdPolicy = JSON.parse(JSON.stringify(validateHouseholdPolicy(plan.householdPolicy || p.householdBook.policy)));
}
function applyHouseholdPolicy(p, policy) {
  if (p.householdBook) p.householdBook.policy = JSON.parse(JSON.stringify(validateHouseholdPolicy(policy || p.householdBook.policy)));
}
function initializeHouseholds(g, o) {
  if (o.customerOwnershipVersion !== 1) return g;
  if (g.workforceVersion !== 1) throw Error('Household ownership requires the specialist workforce preview and its prerequisites.');
  g.customerOwnershipVersion = 1; g.version = '8.6';
  for (const p of g.players) p.householdBook = { version: 1, lastCycle: 0, policy: defaultHouseholdPolicy(), report: null,
    markets: Object.fromEntries(Object.entries(p.marketBook.markets).map(([k, m]) => [k, marketSplit(m.customers, CUSTOMER_MARKETS[k])])) };
  for (const [key, m] of Object.entries(g.marketEconomy.markets)) {
    const community = marketSplit(m.community.customers, CUSTOMER_MARKETS[key]), union = marketSplit(m.union.customers, CUSTOMER_MARKETS[key]);
    m.households = { community, union, total: Object.fromEntries(Object.keys(CUSTOMER_SEGMENTS).map(s =>
      [s, community[s] + union[s] + g.players.reduce((n, p) => n + p.householdBook.markets[key][s], 0)])) };
  }
  return g;
}
function householdSalesStaff(p, staff) { return p.householdBook ? staff * (1 - p.householdBook.policy.retention / 100) : staff; }
function householdAcquisitionWeights(p, key) {
  const mix = p.retailLifecycle.mix, total = Object.values(mix).reduce((n, v) => n + v, 0);
  return Object.fromEntries(Object.entries(CUSTOMER_SEGMENTS).map(([s, def]) =>
    [s, Object.entries(mix).reduce((n, [product, emphasis]) => n + emphasis * def.fit[product], 0) / total]));
}
function moveHouseholdCounts(from, to, amount, preference = null) {
  const keys = Object.keys(CUSTOMER_SEGMENTS), available = keys.reduce((n, k) => n + from[k], 0);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > available) throw Error('Household transfer exceeds the owned book.');
  // Capped weighted allocation: preferences cannot create customers or overdraw
  // a small segment. Deterministic remainder allocation, no campaign RNG.
  let left = amount;
  while (left) {
    const weights = Object.fromEntries(keys.map(k => [k, from[k] * (preference ? preference[k] : 1)]));
    if (!Object.values(weights).some(n => n > 0)) for (const k of keys) weights[k] = from[k];
    const parts = marketSplit(left, weights);
    let moved = 0;
    for (const k of keys) { const n = Math.min(from[k], parts[k]); from[k] -= n; to[k] += n; moved += n; }
    if (!moved) throw Error('Household transfer made no progress.');
    left -= moved;
  }
}
function moveOutsideHouseholds(p, key, outside, positive, limited) {
  if (!p.householdBook) return;
  const pools = marketContext.marketEconomy.markets[key].households, own = p.householdBook.markets[key];
  for (const institution of ['community', 'union']) moveHouseholdCounts(
    positive ? pools[institution] : own, positive ? own : pools[institution], outside[institution],
    positive && limited ? householdAcquisitionWeights(p, key) : null);
}
function transferHouseholds(from, to, key, amount) {
  if (from.householdBook) moveHouseholdCounts(from.householdBook.markets[key], to.householdBook.markets[key], amount);
}
function householdServiceReview(p, allocation = p.allocation, policy = p.householdBook?.policy) {
  if (!p.householdBook) return null;
  validateHouseholdPolicy(policy);
  const staff = allocation.service + specialistBonus(p, 'service', allocation), capacity = staff * policy.retention / 100 + (p.upgrades.training || 0) * .3;
  const rows = [];
  for (const [market, book] of Object.entries(p.householdBook.markets)) {
    const models = marketFacilities(p, market), upgrade = p.regionalOperations.markets[market].service;
    const cohorts = p.depositBook.cohorts.filter(c => c.market === market), deposits = cohorts.reduce((n, c) => n + c.principal, 0);
    for (const [segment, count] of Object.entries(book)) {
      const channel = segment === 'connected' && models.includes('digital') ? .8 : segment === 'everyday' && models.includes('retail') ? .9 : 1;
      const demand = count / 900 * HOUSEHOLD_SERVICE[segment] * channel * (1 - upgrade * .1);
      const fit = deposits ? cohorts.reduce((n, c) => n + c.principal * CUSTOMER_SEGMENTS[segment].fit[c.product], 0) / deposits : 1;
      rows.push({ market, segment, count, demand, fit, current: p.customerRelationships.markets[market][segment] });
    }
  }
  const weighted = rows.reduce((n, r) => n + r.demand * policy.priority[r.segment], 0), demand = rows.reduce((n, r) => n + r.demand, 0);
  for (const r of rows) {
    r.assigned = weighted ? capacity * r.demand * policy.priority[r.segment] / weighted : 0;
    r.coverage = r.demand ? r.assigned / r.demand : 1;
    const change = !r.count ? Math.sign(50 - r.current) : (r.coverage < .8 ? -3 : r.coverage < 1 ? -1 : 1) + (r.fit >= 1.05 ? 1 : r.fit < .85 ? -1 : 0);
    r.next = clamp(r.current + change, 0, 100); r.change = r.next - r.current;
    // Neglect takes several months to erode goodwill before it causes departures.
    r.churnRate = Math.min(.015, Math.max(0, (45 - r.current) / 2000)) * (r.coverage < 1 ? 1 : .4);
    r.departures = Math.floor(r.count * r.churnRate);
  }
  return { rows, demand, capacity, coverage: demand ? capacity / demand : 1, salesStaff: staff * (1 - policy.retention / 100) };
}
function settleHouseholdRetention(g, p, preview = false) {
  if (!p.householdBook) return null;
  const book = p.householdBook, cycle = g.cycle || book.lastCycle + 1;
  if (book.lastCycle >= cycle) return book.report;
  const householdWorld = g.marketEconomy || marketContext?.marketEconomy || p.marketSnapshot;
  const world = { ...g, marketEconomy: preview ? JSON.parse(JSON.stringify(householdWorld)) : householdWorld };
  if (!world.marketEconomy) throw Error('Household retention requires the local market snapshot.');
  return withMarket(world, () => {
    const review = householdServiceReview(p), sequence = p.accounting.sequence, rows = {};
    for (const key of Object.keys(book.markets)) {
      const source = book.markets[key], local = p.marketBook.markets[key], pools = world.marketEconomy.markets[key];
      const departures = Object.fromEntries(review.rows.filter(r => r.market === key).map(r => [r.segment, r.departures]));
      const count = Object.values(departures).reduce((n, v) => n + v, 0), before = local.customers;
      // Deposits have no individual/segment owner yet. Use the local average,
      // capped to withdrawable funding. Locked term balances never break early.
      const requested = before ? Math.min(withdrawableDeposits(p, key), Math.round(local.deposits * count / before)) : 0;
      for (const [segment, n] of Object.entries(departures)) {
        const split = marketSplit(n, { community: 3, union: 2 });
        source[segment] -= n;
        for (const institution of ['community', 'union']) {
          pools.households[institution][segment] += split[institution]; pools[institution].customers += split[institution];
        }
      }
      local.customers -= count; marketDelta(p, 'customers', -count);
      const old = marketTarget; marketTarget = key;
      const beforeDeposits = p.stats.deposits;
      try { delta(p, 'deposits', -requested); } finally { marketTarget = old; }
      const outflow = beforeDeposits - p.stats.deposits;
      p.stats.rateSensitiveDeposits = Math.min(p.stats.rateSensitiveDeposits, p.stats.deposits);
      rows[key] = { before, departures, depositOutflow: outflow };
    }
    const fundingLoss = p.accounting.journal.filter(e => e.id > sequence && e.source.startsWith('sell.')).reduce((n, e) => n - e.earnings, 0);
    book.lastCycle = cycle;
    book.report = { cycle, rows, departed: Object.values(rows).reduce((n, r) => n + Object.values(r.departures).reduce((a, b) => a + b, 0), 0),
      depositOutflow: Object.values(rows).reduce((n, r) => n + r.depositOutflow, 0), fundingLoss };
    return book.report;
  });
}
function planHouseholdService(g, index, input) {
  const p = g.players[index];
  if (!p.householdBook) return input;
  // A transparent capacity rule, not an omniscient prediction of the rival.
  const policy = defaultHouseholdPolicy();
  for (const retention of [25, 50, 75, 100]) {
    policy.retention = retention;
    if (householdServiceReview(p, input.allocation, policy).coverage >= 1.05) break;
  }
  return { ...input, householdPolicy: policy };
}
function validateHouseholdSave(g) {
  if (g.customerOwnershipVersion === undefined) {
    if (g.players.some(p => p.householdBook !== undefined || p.submitted?.householdPolicy !== undefined) ||
        Object.values(g.marketEconomy?.markets || {}).some(m => m.households !== undefined)) throw Error('Unversioned household ownership');
    return g;
  }
  if (g.customerOwnershipVersion !== 1 || g.workforceVersion !== 1 || g.version !== '8.6') throw Error('Unsupported household ownership save');
  const keys = Object.keys(g.territories).sort().join(), uint = n => Number.isSafeInteger(n) && n >= 0;
  const counts = row => row && Object.keys(row).sort().join() === 'connected,everyday,reserve' && Object.values(row).every(uint);
  for (const p of g.players) {
    const b = p.householdBook;
    if (!b || Object.keys(b).sort().join() !== 'lastCycle,markets,policy,report,version' || b.version !== 1 ||
        b.lastCycle !== g.cycle - (g.gameOver ? 0 : 1) || !b.markets || Object.keys(b.markets).sort().join() !== keys) throw Error('Invalid household book');
    validateHouseholdPolicy(b.policy);
    if (p.submitted) validateHouseholdPolicy(p.submitted.householdPolicy);
    for (const [k, row] of Object.entries(b.markets)) if (!counts(row) || Object.values(row).reduce((n, v) => n + v, 0) !== p.marketBook.markets[k].customers) throw Error('Household counts disagree with local customers');
    if (!b.lastCycle) { if (b.report !== null) throw Error('Unexpected opening household report'); }
    else {
      const r = b.report;
      if (!r || Object.keys(r).sort().join() !== 'cycle,departed,depositOutflow,fundingLoss,rows' || r.cycle !== b.lastCycle ||
          ![r.departed, r.depositOutflow, r.fundingLoss].every(uint) || !r.rows || Object.keys(r.rows).sort().join() !== keys) throw Error('Invalid household retention report');
      let departed = 0, outflow = 0;
      for (const row of Object.values(r.rows)) {
        if (!row || Object.keys(row).sort().join() !== 'before,departures,depositOutflow' || !counts(row.departures) || !uint(row.before) || !uint(row.depositOutflow)) throw Error('Invalid local retention report');
        const n = Object.values(row.departures).reduce((a, b) => a + b, 0);
        if (n > row.before) throw Error('Retention losses exceed the opening book');
        departed += n; outflow += row.depositOutflow;
      }
      if (departed !== r.departed || outflow !== r.depositOutflow || p.operatingReport?.householdDepartures !== r.departed ||
          p.operatingReport?.householdDepositOutflow !== r.depositOutflow || p.operatingReport?.householdFundingLoss !== r.fundingLoss) throw Error('Household retention totals disagree');
    }
  }
  for (const [key, m] of Object.entries(g.marketEconomy.markets)) {
    const h = m.households;
    if (!h || Object.keys(h).sort().join() !== 'community,total,union' || !Object.values(h).every(counts)) throw Error('Invalid outside household pools');
    for (const owner of ['community', 'union', 'total']) if (Object.values(h[owner]).reduce((a, b) => a + b, 0) !== m[owner].customers) throw Error('Outside household totals disagree');
    for (const s of Object.keys(CUSTOMER_SEGMENTS)) if (h.community[s] + h.union[s] + g.players.reduce((n, p) => n + p.householdBook.markets[key][s], 0) !== h.total[s]) throw Error('Household segment conservation failed');
  }
  return g;
}
