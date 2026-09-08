// Applications are nonbinding requests, never owned customers or escrowed cash.
// Only activation jointly transfers finite household and segment-deposit stock.
const ONBOARDING_SHARES = [0, 25, 50], ONBOARDING_CAPACITY = 20;
const ONBOARDING_MAX_APPLICATIONS = 1000, ONBOARDING_MAX_PRINCIPAL = 12500;
const onboardingCopy = value => JSON.parse(JSON.stringify(value));
const onboardingUint = value => Number.isSafeInteger(value) && value >= 0;
const onboardingShape = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join() === [...keys].sort().join();
const onboardingAmount = () => ({ count: 0, principal: 0 });
const onboardingAdd = (to, count, principal) => { to.count += count; to.principal += principal; };
const onboardingPortion = (amount, count, total) => total ? Number(BigInt(amount) * BigInt(count) / BigInt(total)) : 0;
function onboardingFee(principal, segment) {
  return Number((BigInt(principal) * BigInt(Math.round(CUSTOMER_SEGMENTS[segment].onboarding * 10000)) + 5000n) / 10000n);
}
function validateOnboardingPolicy(p, policy) {
  if (!onboardingShape(policy, ['market', 'segment', 'product', 'share']) || !Object.hasOwn(p.marketBook?.markets || {}, policy.market) ||
      !Object.hasOwn(CUSTOMER_SEGMENTS, policy.segment) || !Object.hasOwn(DEPOSIT_SERVICE, policy.product) || !ONBOARDING_SHARES.includes(policy.share))
    throw Error('Choose a known onboarding market, segment, product and 0%, 25% or 50% of remaining sales time.');
  return policy;
}
function onboardingOpen(p, policy, targets = p.productPrograms?.markets, retire = []) {
  return !!targets?.[policy.market]?.[policy.segment]?.[policy.product] && !retire.includes(policy.product) &&
    (policy.product === 'essential' || !!p.productDeployment?.ready?.[policy.product]);
}
function initializeOnboarding(g, o) {
  if (o.onboardingVersion !== 1) return g;
  if (g.relationshipOffersVersion !== 1) throw Error('Onboarding requires Existing customer offers and its prerequisites.');
  g.onboardingVersion = 1; g.version = '8.13';
  for (const p of g.players) p.onboarding = { version: 1, lastCycle: 0,
    policy: { market: p.focus, segment: 'connected', product: 'essential', share: 0 }, pending: [], report: null };
  return g;
}
function normalizeOnboardingPlan(p, plan) {
  if (!p.onboarding) { if (plan.onboardingPolicy !== undefined) throw Error('Onboarding requires a new onboarding campaign.'); return; }
  const policy = onboardingCopy(validateOnboardingPolicy(p, plan.onboardingPolicy || p.onboarding.policy));
  if (!onboardingOpen(p, policy, plan.productProgramPolicy?.markets || p.productPrograms.markets, plan.productProgramPolicy?.retire || [])) policy.share = 0;
  plan.onboardingPolicy = policy;
}
function applyOnboardingPolicy(p, policy) {
  if (!p.onboarding) return;
  const plan = { onboardingPolicy: policy || p.onboarding.policy }; normalizeOnboardingPlan(p, plan); p.onboarding.policy = plan.onboardingPolicy;
}
function onboardingSalesStaff(p, staff) { return p.onboarding ? staff * (1 - p.onboarding.policy.share / 100) : staff; }
function onboardingStaff(p, policy) {
  const base = workforceAllocation(p).service * (1 - p.householdBook.policy.retention / 100) * (1 - p.relationshipOffers.policy.share / 100);
  const assignedStaff = onboardingOpen(p, policy)&&policy.share>0 ? departmentFunctionTaskFte(p,'applicationProcessing',base * policy.share / 100) : 0;
  return { assignedStaff, salesStaff: base - assignedStaff, capacity: Math.floor(assignedStaff * ONBOARDING_CAPACITY) };
}
function onboardingDraft(p, plan) {
  // Only policy branches are writable here. Journals, cohorts, pending requests
  // and history are read-only, so routine budget calls need not clone them all.
  const shadow = { ...p, allocation: { ...(plan.allocation || p.allocation) }, householdBook: { ...p.householdBook }, workforce: { ...p.workforce },
    productPrograms: { ...p.productPrograms, products: Object.fromEntries(Object.entries(p.productPrograms.products).map(([key, value]) => [key, { ...value }])) },
    productDeployment: { ...p.productDeployment, ready: { ...p.productDeployment.ready } },
    relationshipOffers: { ...p.relationshipOffers }, onboarding: { ...p.onboarding } };
  applyHouseholdPolicy(shadow, plan.householdPolicy); applyWorkforcePolicy(shadow, plan.workforcePolicy);
  // Budget callers may already have applied this retirement to a forecast copy.
  // Stage its resulting availability, never execute the lifecycle command twice.
  if (plan.productProgramPolicy) {
    if(p.productPrograms.version===2)shadow.productPrograms.pricingBp={...(plan.productProgramPolicy.pricingBp||p.productPrograms.pricingBp)};
    shadow.productPrograms.markets = onboardingCopy(plan.productProgramPolicy.markets);
    for (const product of plan.productProgramPolicy.retire || []) {
      shadow.productPrograms.products[product].retired = true; shadow.productDeployment.ready[product] = false;
    }
  }
  applyRelationshipOfferPolicy(shadow, plan.relationshipOfferPolicy);
  applyOnboardingPolicy(shadow, plan.onboardingPolicy);
  return shadow;
}
function onboardingBudget(p, plan = {}) {
  if (!p.onboarding) return 0;
  const shadow = onboardingDraft(p, plan), policy = shadow.onboarding.policy, cycle = p.onboarding.lastCycle + 1;
  let left = onboardingStaff(shadow, policy).capacity, cost = 0;
  if (!policy.share) return 0;
  for (const row of shadow.onboarding.pending) if (row.eligibleCycle <= cycle && cycle < row.expiresCycle && onboardingOpen(shadow, row)) {
    const count = Math.min(left, row.count); cost += onboardingFee(onboardingPortion(row.principal, count, row.count), row.segment); left -= count;
  }
  return cost;
}
function onboardingBatchValid(p, row) {
  return onboardingShape(row, ['createdCycle', 'eligibleCycle', 'expiresCycle', 'market', 'segment', 'product', 'count', 'principal', 'awareness']) &&
    ['createdCycle', 'eligibleCycle', 'expiresCycle', 'count', 'principal', 'awareness'].every(k => onboardingUint(row[k])) && row.createdCycle > 0 &&
    row.eligibleCycle === row.createdCycle + 1 && row.expiresCycle === row.createdCycle + 3 && row.count > 0 && row.count <= ONBOARDING_MAX_APPLICATIONS &&
    row.principal >= row.count && row.principal <= row.count * ONBOARDING_MAX_PRINCIPAL && row.awareness <= 10000 &&
    Object.hasOwn(p.marketBook.markets, row.market) && Object.hasOwn(CUSTOMER_SEGMENTS, row.segment) && Object.hasOwn(DEPOSIT_SERVICE, row.product);
}
function onboardingCheckPending(p, rows, cycle) {
  if (!Array.isArray(rows) || rows.length > 3 || rows.some((row, i) => !onboardingBatchValid(p, row) || row.createdCycle >= cycle ||
      row.createdCycle < cycle - 3 || (i && rows[i - 1].createdCycle >= row.createdCycle))) throw Error('Invalid onboarding pending applications.');
}
function onboardingMaximum(limit, allowed) {
  let low = 0, high = limit;
  while (low < high) { const mid = Math.floor((low + high + 1) / 2); if (allowed(mid)) low = mid; else high = mid - 1; }
  return low;
}
function onboardingCalculate(p, g, policy) {
  validateOnboardingPolicy(p, policy);
  const cycle = Math.max(g?.cycle || 0, p.onboarding.lastCycle + 1);
  onboardingCheckPending(p, p.onboarding.pending, cycle);
  const source = g?.marketEconomy || marketContext?.marketEconomy || p.marketSnapshot;
  if (!source) throw Error('Onboarding requires a local market snapshot.');
  const world = onboardingCopy(source), context = { ...g, marketEconomy: world }, supply = onboardingCopy(p.marketSupply || marketSupply(context, p));
  const quota = onboardingCopy(p.marketQuota || marketSupply(context, p, true)), staff = onboardingStaff(p, policy);
  const depositCapacity = Math.floor(regionalBranchMetrics(p).depositCapacity);
  const reserved = p._workforceReserved || 0, advertising = p._advertisingCycle?.spent ?? p.advertising.policy.budget;
  const nominalOffer = p._relationshipOfferBudget ?? relationshipOfferBudget(p, {}), budget = p._onboardingBudget ?? onboardingBudget(p, { onboardingPolicy: policy });
  if (![budget, nominalOffer].every(onboardingUint)) throw Error('Invalid onboarding budget ceiling.');
  const training = p._workforceCosts?.training?.total ?? workforceTrainingQuote(p, p.workforce.policy, reserved + advertising + nominalOffer + budget).total;
  const offer = p.relationshipOffers.report?.cycle === cycle ? p.relationshipOffers.report.cost : nominalOffer;
  const available = Math.floor(Math.max(0, Math.min(p.stats.cash - p.workforce.policy.reserve, pilotSpendingLimit(p)) - reserved - advertising - training - offer));
  const totals = Object.fromEntries(['before', 'due', 'activated', 'generated', 'expired', 'cancelled', 'after'].map(k => [k, onboardingAmount()]));
  const rows = [], pending = [], transfers = []; let left = staff.capacity, cost = 0, budgetLimited = false, stockLimited = false;
  for (const batch of p.onboarding.pending) {
    onboardingAdd(totals.before, batch.count, batch.principal);
    const row = { ...batch, requested: 0, stockCount: 0, activated: 0, activatedPrincipal: 0, cost: 0, rate: 0, remaining: 0, reason: 'waiting' };
    rows.push(row);
    if (cycle >= batch.expiresCycle) { row.reason = 'expired'; onboardingAdd(totals.expired, batch.count, batch.principal); continue; }
    if (!onboardingOpen(p, batch)) { row.reason = 'cancelled'; onboardingAdd(totals.cancelled, batch.count, batch.principal); continue; }
    if (cycle < batch.eligibleCycle) { pending.push({ ...batch }); continue; }
    onboardingAdd(totals.due, batch.count, batch.principal);
    const m = world.markets[batch.market], segment = batch.segment;
    const households = m.households.community[segment] + m.households.union[segment], deposits = m.segmentDeposits.community[segment] + m.segmentDeposits.union[segment];
    const asked = policy.share ? Math.min(left, batch.count) : 0;
    const householdLimit = Math.min(asked, households, supply.customers[batch.market], quota.customers[batch.market]);
    const depositLimit = Math.min(deposits, supply.deposits[batch.market], quota.deposits[batch.market], Math.max(0, depositCapacity - totals.activated.principal));
    const stockCount = onboardingMaximum(householdLimit, n => onboardingPortion(batch.principal, n, batch.count) <= depositLimit);
    const count = onboardingMaximum(stockCount, n => onboardingFee(onboardingPortion(batch.principal, n, batch.count), segment) <= Math.max(0, Math.min(available, budget) - cost));
    const principal = onboardingPortion(batch.principal, count, batch.count), fee = onboardingFee(principal, segment);
    stockLimited ||= stockCount < asked; budgetLimited ||= count < stockCount;
    row.reason = !policy.share ? 'disabled' : !left ? 'no-capacity' : !households ? 'no-audience' : !deposits || !stockCount ? 'no-deposits' :
      !count ? 'cash-reserve' : count < stockCount ? 'budget-capped' : stockCount < asked ? 'stock-capped' : 'ready';
    Object.assign(row, { requested: asked, stockCount, activated: count, activatedPrincipal: principal, cost: fee,
      rate: count ? depositRate(p, context, batch.product) : 0, remaining: count && batch.product === 'highYield' ? 6 : 0 });
    if (count) {
      const householdParts = marketSplit(count, { community: m.households.community[segment], union: m.households.union[segment] });
      const depositParts = marketSplit(principal, { community: m.segmentDeposits.community[segment], union: m.segmentDeposits.union[segment] });
      for (const owner of ['community', 'union']) {
        m.households[owner][segment] -= householdParts[owner]; m[owner].customers -= householdParts[owner];
        m.segmentDeposits[owner][segment] -= depositParts[owner]; m[owner].deposits -= depositParts[owner];
      }
      for (const limits of [quota, supply]) { limits.customers[batch.market] -= count; limits.deposits[batch.market] -= principal; }
      transfers.push(row); left -= count; cost += fee; onboardingAdd(totals.activated, count, principal);
    }
    if (count < batch.count) pending.push({ ...batch, count: batch.count - count, principal: batch.principal - principal });
  }
  const open = onboardingOpen(p, policy), awareness = p.advertising.awareness[policy.market][policy.segment][policy.product];
  const response = Math.min(1, .8 * CUSTOMER_SEGMENTS[policy.segment].fit[policy.product] * (1 + awareness / 10000 * .4));
  const selected = world.markets[policy.market], audience = selected.households.community[policy.segment] + selected.households.union[policy.segment];
  const deposits = selected.segmentDeposits.community[policy.segment] + selected.segmentDeposits.union[policy.segment];
  const alreadyWaiting = pending.filter(r => r.market === policy.market && r.segment === policy.segment).reduce((n, r) => n + r.count, 0);
  const unit = Math.min(ONBOARDING_MAX_PRINCIPAL, audience ? Math.floor(deposits / audience) : 0);
  const generated = policy.share && open && unit ? Math.min(ONBOARDING_MAX_APPLICATIONS, Math.floor(left * response), Math.max(0, audience - alreadyWaiting)) : 0;
  const generatedBatch = generated ? { createdCycle: cycle, eligibleCycle: cycle + 1, expiresCycle: cycle + 3,
    market: policy.market, segment: policy.segment, product: policy.product, count: generated, principal: generated * unit, awareness } : null;
  if (generatedBatch) { pending.push(generatedBatch); onboardingAdd(totals.generated, generated, generatedBatch.principal); }
  for (const batch of pending) onboardingAdd(totals.after, batch.count, batch.principal);
  const reason = !open ? 'closed' : !policy.share ? 'disabled' : !staff.capacity ? 'no-capacity' : budgetLimited ? (totals.activated.count ? 'budget-capped' : 'cash-reserve') :
    stockLimited ? 'stock-capped' : totals.activated.count || generated ? 'ready' : !audience ? 'no-audience' : !unit ? 'no-deposits' : 'waiting';
  const report = { cycle, policy: { ...policy }, ...staff, workUsed: totals.activated.count + generated, available, budget, cost, response, awareness, audience, unitPrincipal: unit, depositCapacity,
    paused: !open || !policy.share || !staff.capacity, reason, budgetLimited, stockLimited, totals, rows, generatedBatch };
  return { report, pending, transfers, world, quota, supply };
}
function onboardingReview(p, g, policy = p.onboarding?.policy) {
  return p.onboarding ? onboardingCalculate(p, g, policy).report : null;
}
function onboardingCheckBoundary(p, world) {
  AccountingPrototype.check(p.accounting);
  for (const [key, m] of Object.entries(world.markets)) {
    const book = p.marketBook.markets[key];
    if (p.depositBook.cohorts.filter(c => c.market === key).reduce((n, c) => n + c.principal, 0) !== book.deposits ||
        Object.values(p.householdBook.markets[key]).reduce((n, c) => n + c, 0) !== book.customers) throw Error('Onboarding owner books disagree.');
    for (const owner of ['community', 'union']) for (const [field, resource] of [['households', 'customers'], ['segmentDeposits', 'deposits']])
      if (!Object.values(m[field][owner]).every(onboardingUint) || Object.values(m[field][owner]).reduce((n, c) => n + c, 0) !== m[owner][resource]) throw Error('Onboarding outside books disagree.');
  }
  for (const resource of ['deposits', 'customers']) if (Object.values(p.marketBook.markets).reduce((n, m) => n + m[resource], 0) !== p.stats[resource]) throw Error('Onboarding bank totals disagree.');
  if (p.accounting.accounts.deposits !== p.stats.deposits || p.accounting.accounts.cash !== p.stats.cash) throw Error('Onboarding accounts disagree.');
}
function settleOnboarding(g, p) {
  if (!p.onboarding) return null;
  const cycle = g.cycle || p.onboarding.lastCycle + 1;
  if (p.onboarding.lastCycle === cycle) return p.onboarding.report;
  if (p.onboarding.lastCycle !== cycle - 1) throw Error('Onboarding month is out of sequence.');
  const source = g.marketEconomy || marketContext?.marketEconomy || p.marketSnapshot;
  onboardingCheckBoundary(p, source);
  const result = onboardingCalculate(p, g, p.onboarding.policy), shadow = onboardingCopy(p);
  for (const row of result.transfers) {
    shadow.marketBook.markets[row.market].customers += row.activated; shadow.marketBook.markets[row.market].deposits += row.activatedPrincipal;
    shadow.householdBook.markets[row.market][row.segment] += row.activated;
    shadow.depositBook.cohorts.push({ market: row.market, segment: row.segment, product: row.product, principal: row.activatedPrincipal,
      exiting: 0, remaining: row.remaining, quotedCycle: cycle, rate: row.rate });
  }
  compactDeposits(shadow);
  const activated = result.report.totals.activated;
  if (activated.principal) {
    shadow.accounting = AccountingPrototype.post(shadow.accounting, 'onboarding.activate', { cash: activated.principal, deposits: activated.principal });
    syncAccounts(shadow); shadow.stats.customers += activated.count;
    const sensitivity = result.transfers.reduce((n, row) => n + Math.round(row.activatedPrincipal *
      ({ margin: .01, balanced: .06, aggressive: .3 }[p.policies.deposit] + (PRODUCT_PORTFOLIOS.retail.options[row.product].sensitive || 0))), 0);
    shadow.stats.rateSensitiveDeposits = Math.min(shadow.stats.deposits, shadow.stats.rateSensitiveDeposits + sensitivity);
  }
  onboardingCheckBoundary(shadow, result.world);
  for (const [key, m] of Object.entries(source.markets)) for (const segment of Object.keys(CUSTOMER_SEGMENTS)) {
    const next = result.world.markets[key], beforeDeposits = p.depositBook.cohorts.filter(c => c.market === key && c.segment === segment).reduce((n, c) => n + c.principal, 0),
      afterDeposits = shadow.depositBook.cohorts.filter(c => c.market === key && c.segment === segment).reduce((n, c) => n + c.principal, 0);
    if (m.households.community[segment] + m.households.union[segment] + p.householdBook.markets[key][segment] !==
        next.households.community[segment] + next.households.union[segment] + shadow.householdBook.markets[key][segment] ||
        m.segmentDeposits.community[segment] + m.segmentDeposits.union[segment] + beforeDeposits !== next.segmentDeposits.community[segment] + next.segmentDeposits.union[segment] + afterDeposits ||
        JSON.stringify(m.total) !== JSON.stringify(next.total) || JSON.stringify(m.households.total) !== JSON.stringify(next.households.total) || JSON.stringify(m.segmentDeposits.total) !== JSON.stringify(next.segmentDeposits.total))
      throw Error('Onboarding conservation failed.');
  }
  // All arithmetic, accounting and conservation checks precede this commit.
  for (const key of ['accounting', 'stats', 'marketBook', 'householdBook', 'depositBook']) p[key] = shadow[key];
  source.markets = result.world.markets; p.marketQuota = result.quota; p.marketSupply = result.supply;
  p.onboarding.pending = result.pending; p.onboarding.lastCycle = cycle; p.onboarding.report = result.report;
  return result.report;
}
function adjustOnboardingReport(p, report) {
  if (!p.onboarding) return;
  const current = p.onboarding.report;
  if (!current) throw Error('Onboarding settlement is missing.');
  if (report.onboardingCost !== undefined) {
    if (report.onboardingCost !== current.cost || report.onboardingActivated !== current.totals.activated.count || report.onboardingDeposits !== current.totals.activated.principal) throw Error('Onboarding expense disagrees.');
    return;
  }
  report.onboardingCost = current.cost; report.onboardingActivated = current.totals.activated.count; report.onboardingDeposits = current.totals.activated.principal;
  report.expense += current.cost; report.profit -= current.cost; report.depositGrowth += current.totals.activated.principal;
}
function validateOnboardingSave(g) {
  const transient = p => p._onboardingBudget !== undefined;
  if (g.onboardingVersion === undefined) {
    if (g.players.some(p => p.onboarding !== undefined || p.submitted?.onboardingPolicy !== undefined || transient(p))) throw Error('Unversioned onboarding.');
    return g;
  }
  if (g.onboardingVersion !== 1 || g.relationshipOffersVersion !== 1 || g.version !== campaignVersion(g)) throw Error('Unsupported onboarding save.');
  const fail = () => { throw Error('Invalid onboarding state or report.'); };
  for (const p of g.players) {
    const state = p.onboarding;
    if (!onboardingShape(state, ['version', 'lastCycle', 'policy', 'pending', 'report']) || state.version !== 1 || state.lastCycle !== g.cycle - (g.gameOver ? 0 : 1) || transient(p)) fail();
    validateOnboardingPolicy(p, state.policy); if (state.policy.share && !onboardingOpen(p, state.policy)) fail();
    onboardingCheckPending(p, state.pending, state.lastCycle + 1);
    if (state.pending.some(row => row.expiresCycle <= state.lastCycle)) fail();
    if (p.submitted) { const plan = onboardingCopy(p.submitted); normalizeOnboardingPlan(p, plan); if (JSON.stringify(plan.onboardingPolicy) !== JSON.stringify(p.submitted.onboardingPolicy)) fail(); }
    if (!state.lastCycle) { if (state.report !== null || state.pending.length) fail(); continue; }
    const r = state.report, integers = ['capacity', 'workUsed', 'available', 'budget', 'cost', 'awareness', 'audience', 'unitPrincipal', 'depositCapacity'];
    if (!onboardingShape(r, ['cycle', 'policy', 'assignedStaff', 'salesStaff', ...integers, 'response', 'paused', 'reason', 'budgetLimited', 'stockLimited', 'totals', 'rows', 'generatedBatch']) ||
        r.cycle !== state.lastCycle || JSON.stringify(r.policy) !== JSON.stringify(state.policy) || !integers.every(k => onboardingUint(r[k])) ||
        !['assignedStaff', 'salesStaff', 'response'].every(k => Number.isFinite(r[k]) && r[k] >= 0) || !['paused', 'budgetLimited', 'stockLimited'].every(k => typeof r[k] === 'boolean') ||
        r.awareness > 10000 || r.unitPrincipal > ONBOARDING_MAX_PRINCIPAL || r.response !== Math.min(1, .8 * CUSTOMER_SEGMENTS[r.policy.segment].fit[r.policy.product] * (1 + r.awareness / 10000 * .4)) ||
        r.capacity !== Math.floor(r.assignedStaff * ONBOARDING_CAPACITY) || r.workUsed > r.capacity || r.cost > Math.min(r.available, r.budget) ||
        Math.abs(r.assignedStaff - (r.assignedStaff + r.salesStaff) * r.policy.share / 100) > 1e-8 || !Array.isArray(r.rows) || r.rows.length > 3) fail();
    const totalKeys = ['before', 'due', 'activated', 'generated', 'expired', 'cancelled', 'after'];
    if (!onboardingShape(r.totals, totalKeys) || Object.values(r.totals).some(t => !onboardingShape(t, ['count', 'principal']) || !Object.values(t).every(onboardingUint))) fail();
    const totals = Object.fromEntries(totalKeys.map(k => [k, onboardingAmount()])), pending = []; let cost = 0, stockLimited = false, budgetLimited = false;
    for (const [i, row] of r.rows.entries()) {
      const { requested, stockCount, activated, activatedPrincipal, cost: fee, rate, remaining, reason, ...batch } = row;
      if (!onboardingBatchValid(p, batch) || batch.createdCycle >= r.cycle || batch.createdCycle < r.cycle - 3 || (i && r.rows[i - 1].createdCycle >= row.createdCycle) ||
          ![requested, stockCount, activated, activatedPrincipal, fee, rate, remaining].every(onboardingUint) || activated > stockCount || stockCount > requested || requested > batch.count ||
          activatedPrincipal !== onboardingPortion(batch.principal, activated, batch.count) || fee !== onboardingFee(activatedPrincipal, batch.segment) ||
          rate > 100000 || remaining !== (activated && batch.product === 'highYield' ? 6 : 0) || (!activated && rate) ||
          !['expired', 'cancelled', 'waiting', 'disabled', 'no-capacity', 'no-audience', 'no-deposits', 'cash-reserve', 'budget-capped', 'stock-capped', 'ready'].includes(reason)) fail();
      onboardingAdd(totals.before, batch.count, batch.principal);
      if (reason === 'expired' || reason === 'cancelled') {
        if (requested || activated || (reason === 'expired') !== (r.cycle >= batch.expiresCycle) || (reason === 'cancelled' && onboardingOpen(p, batch))) fail();
        onboardingAdd(totals[reason], batch.count, batch.principal); continue;
      }
      if (r.cycle >= batch.expiresCycle || !onboardingOpen(p, batch) || (!r.policy.share && activated)) fail();
      if (batch.eligibleCycle <= r.cycle) {
        onboardingAdd(totals.due, batch.count, batch.principal);
        const capacityLeft = r.capacity - totals.activated.count;
        if (requested !== (r.policy.share ? Math.min(capacityLeft, batch.count) : 0) ||
            activated !== onboardingMaximum(stockCount, n => onboardingFee(onboardingPortion(batch.principal, n, batch.count), batch.segment) <= Math.max(0, Math.min(r.available, r.budget) - cost))) fail();
        const expected = !r.policy.share ? 'disabled' : !capacityLeft ? 'no-capacity' : !stockCount ? null :
          !activated ? 'cash-reserve' : activated < stockCount ? 'budget-capped' : stockCount < requested ? 'stock-capped' : 'ready';
        if (expected ? reason !== expected : !['no-audience', 'no-deposits'].includes(reason)) fail();
        stockLimited ||= stockCount < requested; budgetLimited ||= activated < stockCount;
      } else if (requested || activated || reason !== 'waiting') fail();
      cost += fee;
      onboardingAdd(totals.activated, activated, activatedPrincipal);
      if (activated < batch.count) pending.push({ ...batch, count: batch.count - activated, principal: batch.principal - activatedPrincipal });
    }
    const alreadyWaiting = pending.filter(row => row.market === r.policy.market && row.segment === r.policy.segment).reduce((n, row) => n + row.count, 0);
    const generated = r.policy.share && onboardingOpen(p, r.policy) && r.unitPrincipal ? Math.min(ONBOARDING_MAX_APPLICATIONS,
      Math.floor((r.capacity - totals.activated.count) * r.response), Math.max(0, r.audience - alreadyWaiting)) : 0;
    if (r.generatedBatch !== null) {
      if (!onboardingBatchValid(p, r.generatedBatch) || r.generatedBatch.createdCycle !== r.cycle || !r.policy.share || !onboardingOpen(p, r.policy) ||
          ['market', 'segment', 'product'].some(k => r.generatedBatch[k] !== r.policy[k]) || r.generatedBatch.awareness !== r.awareness ||
          r.generatedBatch.count !== generated || r.generatedBatch.principal !== generated * r.unitPrincipal) fail();
      pending.push(r.generatedBatch); onboardingAdd(totals.generated, r.generatedBatch.count, r.generatedBatch.principal);
    } else if (generated) fail();
    for (const row of pending) onboardingAdd(totals.after, row.count, row.principal);
    const reason = !onboardingOpen(p, r.policy) ? 'closed' : !r.policy.share ? 'disabled' : !r.capacity ? 'no-capacity' : budgetLimited ? (totals.activated.count ? 'budget-capped' : 'cash-reserve') :
      stockLimited ? 'stock-capped' : totals.activated.count || generated ? 'ready' : !r.audience ? 'no-audience' : !r.unitPrincipal ? 'no-deposits' : 'waiting';
    if (JSON.stringify(totals) !== JSON.stringify(r.totals) || JSON.stringify(pending) !== JSON.stringify(state.pending) || cost !== r.cost ||
        r.workUsed !== totals.activated.count + totals.generated.count || totals.activated.principal > r.depositCapacity || r.reason !== reason || r.budgetLimited !== budgetLimited || r.stockLimited !== stockLimited ||
        r.paused !== (!onboardingOpen(p, r.policy) || !r.policy.share || !r.capacity) || p.operatingReport?.onboardingCost !== r.cost ||
        p.operatingReport?.onboardingActivated !== totals.activated.count || p.operatingReport?.onboardingDeposits !== totals.activated.principal) fail();
  }
  return g;
}
function onboardingPlanForecast(p, plan, economy) {
  return finishOperatingForecast(prepareOperatingForecast(p, plan), economy);
}
function onboardingContinuation(closingBank, candidate, currentBudget) {
  const cycle = closingBank.onboarding.lastCycle + 1;
  const pending = closingBank.onboarding.pending.filter(row => row.eligibleCycle <= cycle && row.expiresCycle > cycle && onboardingOpen(closingBank, row));
  const count = pending.reduce((n, row) => n + row.count, 0), principal = pending.reduce((n, row) => n + row.principal, 0);
  const cost = pending.reduce((n, row) => n + onboardingFee(row.principal, row.segment), 0);
  const policy = { ...closingBank.householdBook.policy };
  let coverage = 0;
  // Reapply ordinary service needs to the closing book. A temporary advertising
  // release is not evidence that the same sales time exists next planning turn.
  for (const retention of [25, 50, 75, 100]) {
    policy.retention = retention; coverage = householdServiceReview(closingBank, candidate.allocation, policy).coverage;
    if (coverage >= 1.05) break;
  }
  const result = { eligible: false, reason: 'service-capacity', retention: policy.retention, coverage, capacity: 0,
    pending: count, principal, cost, available: 0, remaining: 0 };
  if (!count) return { ...result, eligible: true, reason: 'no-pending' };
  if (coverage < 1.05) return result;
  // Operations already paid advertising/training/offer/activation expense, but
  // the private operating forecast has not paid this turn's one-off commitments.
  // Account for them once, then do not repeat them as next month's spending.
  const oneTime = currentBudget.total - (currentBudget.advertising || 0) - (currentBudget.training || 0) -
    (currentBudget.relationshipOffers || 0) - (currentBudget.onboarding || 0);
  const continuationBank = onboardingCopy(closingBank);
  if (oneTime > continuationBank.stats.cash) return { ...result, reason: 'cash-reserve' };
  if (oneTime) {
    continuationBank.accounting = AccountingPrototype.post(continuationBank.accounting, 'onboarding.planCommitments', { cash: -oneTime, equity: -oneTime }, -oneTime);
    syncAccounts(continuationBank);
  }
  const nextPlan = { ...onboardingCopy(candidate), allocation: { ...candidate.allocation }, householdPolicy: policy,
    newProjects: [], newProject: null, investments: {}, hires: 0, specialistHires: emptySpecialistOrders(), competitiveAction: 'none', capitalAction: false,
    productProgramPolicy: productProgramPolicy(continuationBank), advertisingPolicy: { ...continuationBank.advertising.policy, budget: 0 } };
  const planned = onboardingDraft(continuationBank, nextPlan), capacity = onboardingStaff(planned, planned.onboarding.policy).capacity;
  result.capacity = capacity;
  if (count > capacity) return result;
  const budget = planBudget(continuationBank, nextPlan);
  result.available = Math.floor(Math.max(0, Math.min(continuationBank.stats.cash - planned.workforce.policy.reserve, pilotSpendingLimit(continuationBank)) -
    (budget.advertising || 0) - (budget.training || 0) - (budget.relationshipOffers || 0)));
  result.remaining = budget.remaining;
  if (continuationBank.stats.lastProfit <= 50000 || continuationBank.stats.cash < 750000 || capitalRatio(continuationBank) < 10 || fundingPosition(continuationBank).excess > 0)
    return { ...result, reason: 'closing-funding' };
  if (budget.onboarding !== cost || cost > result.available || budget.remaining < 300000) return { ...result, reason: 'cash-reserve' };
  // This is a capacity/fee check, not another simulated month. It credits no
  // future stock, project completion, recruit, campaign or guaranteed revenue.
  return { ...result, eligible: true, reason: 'ready' };
}
function planOnboarding(g, index, input) {
  const p = g.players[index]; if (g.onboardingVersion !== 1 || p.onboarding?.version !== 1) return input;
  const plan = onboardingCopy(input); plan.onboardingPolicy = { ...p.onboarding.policy, share: 0 };
  if (p.stats.lastProfit <= 50000 || p.stats.cash < 750000 || capitalRatio(p) < 10 || fundingPosition(p).excess > 0) return plan;
  const shadow = onboardingDraft(p, plan); let chosen = null, householdPolicy = null;
  const active = p.onboarding.pending.find(row => row.expiresCycle > g.cycle && onboardingOpen(shadow, row));
  if (active) {
    chosen = { market: active.market, segment: active.segment, product: active.product, share: 25 };
    if (shadow.householdBook.policy.retention === 100) {
      const released = { ...shadow.householdBook.policy, retention: 75 };
      if (householdServiceReview(shadow, shadow.allocation, released).coverage >= 1.05) {
        householdPolicy = onboardingCopy(released); shadow.householdBook.policy = released;
      }
    }
  }
  else if (g.cycle % 3 === index) {
    let score = 0;
    for (const [market, row] of Object.entries(shadow.productPrograms.markets)) for (const [segment, mix] of Object.entries(row)) for (const [product, emphasis] of Object.entries(mix)) if (emphasis) {
      const pool = g.marketEconomy.markets[market], audience = pool.households.community[segment] + pool.households.union[segment];
      const value = audience * marketReach(shadow, market) * CUSTOMER_SEGMENTS[segment].fit[product];
      if (value > score) { score = value; chosen = { market, segment, product, share: 25 }; }
    }
  }
  if (!chosen || householdServiceReview(shadow).coverage < 1.05) return plan;
  const owner = { ...p, marketSnapshot: g.marketEconomy };
  let base = null, best = plan, bestActivated = 0;
  // Only pending work can justify the larger existing channel setting. Do not
  // search every product through expensive operating forecasts or invent ROI.
  for (const share of active ? [25, 50] : [25]) {
    const candidate = { ...plan, ...(householdPolicy ? { householdPolicy } : {}), onboardingPolicy: { ...chosen, share } }, planned = onboardingDraft(p, candidate);
    const budget = planBudget(p, candidate);
    if (onboardingStaff(planned, candidate.onboardingPolicy).capacity < 2 || budget.remaining < 300000) continue;
    const quote = onboardingReview({ ...planned, marketSnapshot: g.marketEconomy }, g);
    if (active ? quote.totals.activated.count <= bestActivated : !quote.totals.generated.count) continue;
    if (!base) base = operatingPreview(owner, plan, g.economy);
    const closed = onboardingPlanForecast(owner, candidate, g.economy), forecast = closed.operatingReport;
    if (active ? forecast.onboardingActivated <= bestActivated : !closed.onboarding.report.totals.generated.count) continue;
    if (forecast.profit <= 0 || forecast.profit < base.profit * .98 || (forecast.fundingLoss || 0) > (base.fundingLoss || 0) || forecast.onboardingCost > base.profit * .02) continue;
    if (!onboardingContinuation(closed, candidate, budget).eligible) continue;
    best = candidate; bestActivated = forecast.onboardingActivated;
  }
  return best;
}
function reconsiderOnboardingPending(g, index, finalPlan) {
  const p = g.players[index];
  if (g.onboardingVersion !== 1 || p.onboarding?.version !== 1 || finalPlan.onboardingPolicy?.share !== 0) return finalPlan;
  const staged = onboardingDraft(p, finalPlan);
  if (!p.onboarding.pending.some(row => row.eligibleCycle <= g.cycle && row.expiresCycle > g.cycle && onboardingOpen(staged, row))) return finalPlan;
  // A later reserve pass may remove the commitment that originally blocked
  // pending work. Reconsider once, without reopening any other final decision.
  const candidate = planOnboarding(g, index, finalPlan);
  if (!candidate.onboardingPolicy?.share) return finalPlan;
  const unchangedPlan = value => JSON.stringify(Object.entries(value).filter(([key]) => key !== 'onboardingPolicy'));
  if (unchangedPlan(candidate) !== unchangedPlan(finalPlan)) return finalPlan;
  const beforeBudget = planBudget(p, finalPlan), afterBudget = planBudget(p, candidate);
  // Training quotes can silently pause when another cost is added. Comparing
  // every other budget field prevents financing this fee by clipping training
  // or any present/future component, even when the plan itself is unchanged.
  const unchangedBudget = value => JSON.stringify(Object.entries(value).filter(([key]) => !['onboarding', 'total', 'remaining'].includes(key)));
  if (unchangedBudget(afterBudget) !== unchangedBudget(beforeBudget)) return finalPlan;
  const beforeReserve = aiCashPlanningReview(g, index, finalPlan), afterReserve = aiCashPlanningReview(g, index, candidate);
  if (!beforeReserve || !afterReserve || afterReserve.limit !== beforeReserve.limit || afterBudget.total > beforeReserve.limit) return finalPlan;
  const closingBank = onboardingPlanForecast({ ...p, marketSnapshot: g.marketEconomy }, candidate, g.economy);
  if (!(closingBank.operatingReport.onboardingActivated > 0) || closingBank.onboarding.report.totals.generated.count !== 0) return finalPlan;
  // No fresh-demand restart and no second trimming pass: actual execution still
  // applies the shared stock, affordability, service and expiry rules.
  return candidate;
}
