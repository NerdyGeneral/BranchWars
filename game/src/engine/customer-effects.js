// Owner-only, on-demand comparisons. These projections do not change campaign
// rules or AI decisions, and the private forecast bank never crosses the API.
function customerEffectsCopy(value) { return JSON.parse(JSON.stringify(value)); }
function customerEffectsSegment(p, target) {
  const row = householdServiceReview(p).rows.find(r => r.market === target.market && r.segment === target.segment);
  const cohorts = p.depositBook.cohorts.filter(c => c.market === target.market && c.segment === target.segment);
  return { households: row.count, fit: row.fit, coverage: row.coverage, goodwill: row.current,
    withdrawablePrincipal: cohorts.filter(c => !c.locked).reduce((n, c) => n + c.principal, 0),
    lockedPrincipal: cohorts.filter(c => c.locked).reduce((n, c) => n + c.principal, 0) };
}
function customerEffectsRetention(p, target, economy) {
  const shadow = customerEffectsCopy(p), before = customerEffectsSegment(shadow, target).withdrawablePrincipal;
  // A zero cycle advances the copied household book by exactly one boundary.
  // The real settler handles integer allocation and marks locked exits without
  // paying them early. No production, maturity, offer or RNG step runs here.
  const report = settleHouseholdRetention({ economy, cycle: 0 }, shadow, true);
  return { departures: report.rows[target.market].departures[target.segment],
    withdrawableOutflow: before - customerEffectsSegment(shadow, target).withdrawablePrincipal };
}
function customerEffectsBusinessGuard(p, plan) {
  const remaining = plan.allocation.business - 1;
  if (remaining < 1) return 'Keep at least one Business banker; no spare Business banker is available.';
  if (remaining < (p.workforce.departments.business?.count || 0)) return 'This move would displace a Business specialist from their department.';
  const desk = plan.servicePolicy;
  if (remaining < desk.staff) return 'This move would remove a banker reserved for signed commercial services.';
  const before = prepareOperatingForecast(p, plan), next = customerEffectsCopy(plan);
  next.allocation.business--; next.allocation.service++;
  const after = prepareOperatingForecast(p, next), prior = serviceLoad(before), proposed = serviceLoad(after);
  const served = new Set(proposed.rows.filter(r => r.served).map(r => r.id));
  if (prior.rows.some(r => r.served && !served.has(r.id)) || proposed.capacity + 1e-9 < prior.capacity)
    return 'This move would reduce signed-service or bid delivery capacity.';
  if (plan.contractBid && commercialSalesStaff(after) < 1) return 'Keep a Business sales banker for the explicit service bid.';
  return '';
}
function customerEffectsComparison(p, draft, economy) {
  const labels = { baseline: 'No existing-customer offer', offers: 'Selected offer',
    staffing: 'One Business banker to Retail', combined: 'Retail reassignment and selected offer' };
  const assumptions = [
    'Opening, closing and retention figures describe the selected market and segment; profit, funding loss and budget describe the whole bank.',
    'Current retention settles before switching. Closing fit and goodwill include estimated ordinary intake as well as the offer; an offer cannot prevent departures already settled this month.',
    'Next retention is a conditional single-boundary check on the estimated closing book with unchanged staffing and policies. It excludes maturities, another offer, new intake, training gains, hires, rival actions, opportunities and changes in the economy.',
    'Operating estimates exclude executive-call effects, later project completions, regulatory sales and full monthly competition. Deposits retained are customer funding, not income; these comparisons are not measured lifetime value or guaranteed savings.',
    'Reassignment moves one existing Business banker to Retail, not a recruit. It leaves retention policy, Lending and Operations unchanged and may reduce future Business sales.'
  ];
  const result = { supported: !!p.relationshipOffers, target: null, rows: [], assumptions,
    reassignment: { from: 'business', to: 'service', count: 1, eligible: false, reason: '' } };
  if (!result.supported) return result;
  if (p.onboarding) assumptions.push('The same staged onboarding policy runs in every row. Closing figures include conditional activations and their cost; pending applications are not owned customers or deposits. The next-retention-only check excludes onboarding.');
  const failed = reason => {
    result.reassignment.reason = reason;
    result.rows = Object.entries(labels).map(([key, label]) => ({ key, label, eligible: false, reason, patch: {}, metrics: null }));
    return result;
  };
  let plan, owner;
  try {
    plan = customerEffectsCopy(draft);
    if (!plan || !plan.allocation || Object.keys(ROLES).some(k => !Number.isSafeInteger(plan.allocation[k]) || plan.allocation[k] < 0) ||
        Object.keys(ROLES).reduce((n, k) => n + plan.allocation[k], 0) !== p.stats.staff)
      return failed('Allocate every existing banker before comparing customer effects.');
    if (!p.marketSnapshot?.markets) return failed('The owner market snapshot is required to compare customer effects.');
    if (!Object.hasOwn(p.marketBook.markets, plan.focus)) return failed('Choose a known focus market.');
    if (!Object.hasOwn(DEPOSIT_POLICIES, plan.depositPolicy) || !Object.hasOwn(LENDING_POLICIES, plan.lendingPolicy) || !Object.hasOwn(CAPITAL_POLICIES, plan.capitalPolicy))
      return failed('Choose valid deposit, lending and capital policies.');
    owner = { ...p, focus: plan.focus };
    normalizeProductProgramPlan(owner, plan); normalizeHouseholdPlan(owner, plan);
    normalizeCollectionsPlan(owner, plan); normalizeWorkforcePlan(owner, plan); normalizeRelationshipOfferPlan(owner, plan);
    normalizeOnboardingPlan(owner, plan);
    plan.servicePolicy = customerEffectsCopy(plan.servicePolicy || p.serviceDesk.policy);
    validateServicePolicy(owner, plan.servicePolicy, plan.allocation);
    const selected = plan.relationshipOfferPolicy;
    result.target = { market: selected.market, segment: selected.segment, product: selected.product };
  } catch (error) { return failed(error.message); }
  const off = { ...plan.relationshipOfferPolicy, share: 0 }, selected = { ...plan.relationshipOfferPolicy };
  const base = { ...plan, relationshipOfferPolicy: off };
  let guard;
  try { guard = customerEffectsBusinessGuard(owner, base); } catch (error) { guard = error.message; }
  result.reassignment.eligible = !guard; result.reassignment.reason = guard;
  result.rows = Object.entries(labels).map(([key, label]) => {
    const moved = key === 'staffing' || key === 'combined', offered = key === 'offers' || key === 'combined';
    const patch = { relationshipOfferPolicy: { ...(offered ? selected : off) } };
    if (moved) patch.allocation = { ...plan.allocation, business: plan.allocation.business - 1, service: plan.allocation.service + 1 };
    const row = { key, label, eligible: false, reason: '', patch, metrics: null };
    if (moved && guard) { row.reason = guard; return row; }
    try {
      const next = { ...plan, ...patch }, status = projectPlanStatus(owner, next);
      if (!status.eligible) { row.reason = status.reason; return row; }
      if (status.quote.load > status.quote.capacity + 1e-9) { row.reason = 'The plan exceeds available execution capacity.'; return row; }
      const prepared = prepareOperatingForecast(owner, next), openingMetrics = customerEffectsSegment(prepared, result.target);
      const currentRetention = customerEffectsRetention(prepared, result.target, economy);
      const closingBank = finishOperatingForecast(prepared, economy), closing = customerEffectsSegment(closingBank, result.target);
      const nextRetention = customerEffectsRetention(closingBank, result.target, economy);
      const report = projectOperatingForecast(closingBank), offer = closingBank.relationshipOffers.report, budget = status.quote;
      row.metrics = { opening: openingMetrics, closing, currentRetention, nextRetention,
        bank: { profit: report.profit, fundingLoss: report.fundingLoss || 0, netOperating: report.profit - (report.fundingLoss || 0),
          depositGrowth: report.depositGrowth, loanGrowth: report.loanGrowth },
        offer: { converted: offer.converted, principal: offer.principal, cost: offer.cost, runRateDelta: offer.runRateDelta },
        budget: { total: budget.total, remaining: budget.remaining, capacity: budget.capacity, load: budget.load } };
      row.eligible = true;
      if (offered && !selected.share) row.reason = 'The selected offer is paused or closed; this matches the corresponding no-offer plan.';
      else if (offered && !offer.converted) row.reason = 'No conversions are forecast under the selected capacity and funding limits.';
    } catch (error) { row.reason = error.message; }
    return row;
  });
  return result;
}
