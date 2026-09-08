// Voluntary product switching within an existing segment-owned deposit book.
// Account equivalents are an allocation measure, never additional households.
const RELATIONSHIP_OFFER_SHARES = [0, 25, 50];
const RELATIONSHIP_OFFER_CAPACITY = 80, RELATIONSHIP_OFFER_COST = 40;
const relationshipOfferCopy = value => JSON.parse(JSON.stringify(value));
const relationshipOfferUint = value => Number.isSafeInteger(value) && value >= 0;
function relationshipOfferShape(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join() === [...keys].sort().join();
}
function defaultRelationshipOfferPolicy(p) { return { market: p.focus, segment: 'connected', product: 'essential', share: 0 }; }
function validateRelationshipOfferPolicy(p, policy) {
  if (!relationshipOfferShape(policy, ['market', 'segment', 'product', 'share']) || !Object.hasOwn(p.marketBook?.markets || {}, policy.market) ||
      !Object.hasOwn(CUSTOMER_SEGMENTS, policy.segment) || !Object.hasOwn(DEPOSIT_SERVICE, policy.product) || !RELATIONSHIP_OFFER_SHARES.includes(policy.share))
    throw Error('Choose a known relationship offer market, segment, product and 0%, 25% or 50% of sales time.');
  return policy;
}
function relationshipOfferOpen(p, policy, targets = p.productPrograms?.markets, retire = []) {
  return !!targets?.[policy.market]?.[policy.segment]?.[policy.product] && !retire.includes(policy.product) &&
    (policy.product === 'essential' || !!p.productDeployment?.ready?.[policy.product]);
}
function initializeRelationshipOffers(g, o) {
  if (o.relationshipOffersVersion !== 1) return g;
  if (g.regionalGrowthVersion !== 1) throw Error('Relationship offers requires the Regional growth preview and its prerequisites.');
  g.relationshipOffersVersion = 1; g.version = '8.12';
  for (const p of g.players) p.relationshipOffers = { version: 1, lastCycle: 0, policy: defaultRelationshipOfferPolicy(p), report: null };
  return g;
}
function normalizeRelationshipOfferPlan(p, plan) {
  if (!p.relationshipOffers) { if (plan.relationshipOfferPolicy !== undefined) throw Error('Relationship offers requires a new preview campaign.'); return; }
  const policy = relationshipOfferCopy(validateRelationshipOfferPolicy(p, plan.relationshipOfferPolicy || p.relationshipOffers.policy));
  if (!relationshipOfferOpen(p, policy, plan.productProgramPolicy?.markets || p.productPrograms.markets, plan.productProgramPolicy?.retire || [])) policy.share = 0;
  plan.relationshipOfferPolicy = policy;
}
function applyRelationshipOfferPolicy(p, policy) {
  if (!p.relationshipOffers) return;
  const input = { relationshipOfferPolicy: policy || p.relationshipOffers.policy }; normalizeRelationshipOfferPlan(p, input);
  p.relationshipOffers.policy = input.relationshipOfferPolicy;
}
function relationshipOfferSalesStaff(p, staff) {
  return p.relationshipOffers ? staff * (1 - p.relationshipOffers.policy.share / 100) : staff;
}
function relationshipOfferPortion(amount, numerator, denominator) {
  if (!denominator) return 0;
  return Number(BigInt(amount) * BigInt(numerator) / BigInt(denominator));
}
function relationshipOfferEligibility(p, policy) {
  const rows = p.depositBook.cohorts.filter(c => c.market === policy.market && c.segment === policy.segment);
  const eligible = rows.filter(c => !c.locked && c.remaining === 0 && c.product !== policy.product &&
    CUSTOMER_SEGMENTS[policy.segment].fit[policy.product] > CUSTOMER_SEGMENTS[policy.segment].fit[c.product]);
  const segmentPrincipal = rows.reduce((n, c) => n + c.principal, 0), eligiblePrincipal = eligible.reduce((n, c) => n + c.principal, 0);
  const excludedPrincipal = rows.filter(c => c.locked || c.remaining > 0).reduce((n, c) => n + c.principal, 0);
  const segmentHouseholds = p.householdBook.markets[policy.market][policy.segment];
  const eligibleEquivalents = relationshipOfferPortion(segmentHouseholds, eligiblePrincipal, segmentPrincipal);
  // householdSalesStaff already deducts this offer's share. Use the unreserved
  // non-retention amount directly so the same service time is never counted twice.
  const baseSalesStaff = workforceAllocation(p).service * (1 - p.householdBook.policy.retention / 100);
  const assignedStaff = relationshipOfferOpen(p, policy)&&policy.share>0 ? departmentFunctionTaskFte(p,'offerSales',baseSalesStaff * policy.share / 100) : 0;
  const capacity = Math.floor(assignedStaff * RELATIONSHIP_OFFER_CAPACITY), uptakeLimit = Math.floor(eligibleEquivalents / 10);
  return { eligible, segmentPrincipal, segmentHouseholds, eligiblePrincipal, excludedPrincipal, eligibleEquivalents,
    assignedStaff, salesStaff: baseSalesStaff - assignedStaff, capacity, uptakeLimit, requested: Math.min(capacity, uptakeLimit) };
}
function relationshipOfferDraft(p, plan) {
  const shadow = { ...p, allocation: plan.allocation || p.allocation,
    householdBook: { ...p.householdBook, policy: plan.householdPolicy || p.householdBook.policy },
    workforce: { ...p.workforce, policy: plan.workforcePolicy || p.workforce.policy },
    productPrograms: { ...p.productPrograms, markets: plan.productProgramPolicy?.markets || p.productPrograms.markets },
    relationshipOffers: { ...p.relationshipOffers } };
  const input = { relationshipOfferPolicy: plan.relationshipOfferPolicy || p.relationshipOffers.policy, productProgramPolicy: plan.productProgramPolicy };
  if(p.productPrograms.version===2)shadow.productPrograms.pricingBp={...(plan.productProgramPolicy?.pricingBp||p.productPrograms.pricingBp)};
  normalizeRelationshipOfferPlan(shadow, input); shadow.relationshipOffers.policy = input.relationshipOfferPolicy;
  return shadow;
}
function relationshipOfferBudget(p, plan) {
  if (!p.relationshipOffers) return 0;
  const shadow = relationshipOfferDraft(p, plan), policy = shadow.relationshipOffers.policy;
  return relationshipOfferEligibility(shadow, policy).requested * RELATIONSHIP_OFFER_COST;
}
function convertRelationshipOfferBook(p, report) {
  if (!report.principal) return;
  const eligible = relationshipOfferEligibility(p, report.policy).eligible;
  const parts = marketSplit(report.principal, Object.fromEntries(eligible.map((c, i) => [i, c.principal])));
  for (const [i, n] of Object.entries(parts)) eligible[i].principal -= n;
  p.depositBook.cohorts.push({ market: report.policy.market, segment: report.policy.segment, product: report.policy.product,
    principal: report.principal, exiting: 0, remaining: report.remaining, quotedCycle: report.cycle, rate: report.rate });
  compactDeposits(p);
}
function relationshipOfferReview(p, g, policy = p.relationshipOffers?.policy) {
  if (!p.relationshipOffers) return null;
  validateRelationshipOfferPolicy(p, policy);
  const eligible = relationshipOfferEligibility(p, policy), { eligible: ignored, ...counts } = eligible;
  const reserved = p._workforceReserved || 0, advertising = p._advertisingCycle?.spent ?? p.advertising?.policy?.budget ?? 0;
  const training = p._workforceCosts?.training?.total ?? workforceTrainingQuote(p, p.workforce.policy, reserved + advertising).total;
  const spendable = Math.max(0, Math.min(p.stats.cash - p.workforce.policy.reserve, pilotSpendingLimit(p)) - reserved - advertising - training - (p.onboarding ? p._onboardingBudget || 0 : 0));
  const available = Math.floor(spendable), budget = p._relationshipOfferBudget ?? counts.requested * RELATIONSHIP_OFFER_COST;
  if (!relationshipOfferUint(budget)) throw Error('Invalid relationship offer budget ceiling.');
  const converted = Math.min(counts.requested, Math.floor(Math.min(available, budget) / RELATIONSHIP_OFFER_COST));
  const principal = relationshipOfferPortion(counts.eligiblePrincipal, converted, counts.eligibleEquivalents);
  const open = relationshipOfferOpen(p, policy), budgetLimited = converted < counts.requested;
  const reason = !open ? 'closed' : !policy.share ? 'disabled' : !counts.segmentHouseholds ? 'no-households' : !counts.eligibleEquivalents ? 'no-better-fit' :
    !counts.requested ? 'no-capacity' : !converted ? 'cash-reserve' : budgetLimited ? 'budget-capped' : 'ready';
  const report = { cycle: g?.cycle || p.depositBook.asOfCycle + 1, policy: { ...policy }, ...counts, converted, principal,
    cost: converted * RELATIONSHIP_OFFER_COST, available, budget, paused: !open || (counts.requested > 0 && converted === 0), budgetLimited, reason,
    rate: depositRate(p, g || { economy: MACRO_REGIMES.steady }, policy.product), remaining: policy.product === 'highYield' ? 6 : 0 };
  const prior = depositSummary(p, g), after = relationshipOfferCopy(p); convertRelationshipOfferBook(after, report);
  const next = depositSummary(after, g);
  report.directCostBefore = prior.interest + prior.service - prior.fees;
  report.directCostAfter = next.interest + next.service - next.fees; report.runRateDelta = report.directCostAfter - report.directCostBefore;
  return report;
}
function settleRelationshipOffers(g, p) {
  if (!p.relationshipOffers) return null;
  const state = p.relationshipOffers, cycle = g.cycle || p.depositBook.asOfCycle + 1;
  if (state.lastCycle === cycle) return state.report;
  if (state.lastCycle !== cycle - 1) throw Error('Relationship offer month is out of sequence.');
  const report = relationshipOfferReview(p, g), shadow = relationshipOfferCopy(p);
  convertRelationshipOfferBook(shadow, report);
  // The pure quote performs all affordability and integer calculations before
  // committing the book. Principal/customer ownership and accounting do not move.
  for (const key of Object.keys(p.marketBook.markets)) if (shadow.depositBook.cohorts.filter(c => c.market === key).reduce((n, c) => n + c.principal, 0) !== p.marketBook.markets[key].deposits)
    throw Error('Relationship offer changed owned deposit principal.');
  p.depositBook.cohorts = shadow.depositBook.cohorts; state.lastCycle = cycle; state.report = report;
  return report;
}
function adjustRelationshipOfferReport(p, report) {
  if (!p.relationshipOffers) return;
  const offer = p.relationshipOffers.report;
  if (!offer) throw Error('Relationship offer settlement is missing.');
  if (report.relationshipOfferCost !== undefined) {
    if (report.relationshipOfferCost !== offer.cost) throw Error('Relationship offer expense disagrees.');
    return;
  }
  Object.assign(report, { relationshipOfferCost: offer.cost, relationshipOfferConverted: offer.converted,
    relationshipOfferPrincipal: offer.principal, relationshipOfferRunRateDelta: offer.runRateDelta });
  report.expense += offer.cost; report.profit -= offer.cost;
}
function validateRelationshipOfferSave(g) {
  const transient = p => p._relationshipOfferBudget !== undefined;
  if (g.relationshipOffersVersion === undefined) {
    if (g.players.some(p => p.relationshipOffers !== undefined || p.submitted?.relationshipOfferPolicy !== undefined || transient(p))) throw Error('Unversioned relationship offers.');
    return g;
  }
  if (g.relationshipOffersVersion !== 1 || g.regionalGrowthVersion !== 1 || g.version !== campaignVersion(g)) throw Error('Unsupported relationship offer save.');
  const fail = message => { throw Error('Invalid relationship offer ' + message); };
  for (const p of g.players) {
    const state = p.relationshipOffers;
    if (!relationshipOfferShape(state, ['version', 'lastCycle', 'policy', 'report']) || state.version !== 1 ||
        state.lastCycle !== g.cycle - (g.gameOver ? 0 : 1) || transient(p)) fail('state or lifecycle.');
    validateRelationshipOfferPolicy(p, state.policy);
    if (state.policy.share && !relationshipOfferOpen(p, state.policy)) fail('closed product policy.');
    if (p.submitted) { const plan = relationshipOfferCopy(p.submitted); normalizeRelationshipOfferPlan(p, plan); if (JSON.stringify(plan.relationshipOfferPolicy) !== JSON.stringify(p.submitted.relationshipOfferPolicy)) fail('submitted policy.'); }
    if (!state.lastCycle) { if (state.report !== null) fail('opening report.'); continue; }
    const r = state.report, integers = ['segmentPrincipal', 'segmentHouseholds', 'eligiblePrincipal', 'excludedPrincipal', 'eligibleEquivalents', 'capacity', 'uptakeLimit', 'requested', 'converted', 'principal', 'cost', 'available', 'budget', 'rate', 'remaining'];
    if (!relationshipOfferShape(r, ['cycle', 'policy', 'assignedStaff', 'salesStaff', ...integers, 'paused', 'budgetLimited', 'reason', 'directCostBefore', 'directCostAfter', 'runRateDelta']) ||
        r.cycle !== state.lastCycle || !integers.every(k => relationshipOfferUint(r[k])) || !['assignedStaff', 'salesStaff'].every(k => Number.isFinite(r[k]) && r[k] >= 0) ||
        !['directCostBefore', 'directCostAfter', 'runRateDelta'].every(k => Number.isSafeInteger(r[k])) || typeof r.paused !== 'boolean' || typeof r.budgetLimited !== 'boolean') fail('report shape.');
    validateRelationshipOfferPolicy(p, r.policy);
    const closed = !relationshipOfferOpen(p, r.policy);
    if (JSON.stringify(r.policy) !== JSON.stringify(state.policy) || (closed && r.policy.share !== 0) || r.excludedPrincipal + r.eligiblePrincipal > r.segmentPrincipal ||
        r.eligibleEquivalents !== relationshipOfferPortion(r.segmentHouseholds, r.eligiblePrincipal, r.segmentPrincipal) ||
        Math.abs(r.assignedStaff - (r.assignedStaff + r.salesStaff) * r.policy.share / 100) > 1e-8 ||
        r.capacity !== Math.floor(r.assignedStaff * RELATIONSHIP_OFFER_CAPACITY) || r.uptakeLimit !== Math.floor(r.eligibleEquivalents / 10) ||
        r.requested !== Math.min(r.capacity, r.uptakeLimit) || r.converted !== Math.min(r.requested, Math.floor(Math.min(r.available, r.budget) / RELATIONSHIP_OFFER_COST)) ||
        r.principal !== relationshipOfferPortion(r.eligiblePrincipal, r.converted, r.eligibleEquivalents) || r.cost !== r.converted * RELATIONSHIP_OFFER_COST ||
        r.budgetLimited !== (r.converted < r.requested) || r.paused !== (closed || (r.requested > 0 && r.converted === 0)) ||
        r.remaining !== (r.policy.product === 'highYield' ? 6 : 0) || r.rate > 100000 || r.runRateDelta !== r.directCostAfter - r.directCostBefore) fail('report reconciliation.');
    const reason = closed ? 'closed' : !r.policy.share ? 'disabled' : !r.segmentHouseholds ? 'no-households' : !r.eligibleEquivalents ? 'no-better-fit' :
      !r.requested ? 'no-capacity' : !r.converted ? 'cash-reserve' : r.budgetLimited ? 'budget-capped' : 'ready';
    if (r.reason !== reason || p.operatingReport?.relationshipOfferCost !== r.cost || p.operatingReport?.relationshipOfferConverted !== r.converted ||
        p.operatingReport?.relationshipOfferPrincipal !== r.principal || p.operatingReport?.relationshipOfferRunRateDelta !== r.runRateDelta) fail('operating totals.');
  }
  return g;
}
function planRelationshipOffers(g, index, input) {
  const p = g.players[index]; if (!p.relationshipOffers) return input;
  const plan = relationshipOfferCopy(input); plan.relationshipOfferPolicy = { ...p.relationshipOffers.policy, share: 0 };
  if (p.stats.lastProfit <= 0 || p.stats.cash < 500000 || capitalRatio(p) < 10 || fundingPosition(p).excess > 0) return plan;
  const offerPlan = relationshipOfferCopy(plan), shadow = relationshipOfferDraft(p, offerPlan), choices = [];
  if (shadow.householdBook.policy.retention === 100) {
    const policy = { ...shadow.householdBook.policy, retention: 75 };
    if (householdServiceReview(shadow, shadow.allocation, policy).coverage >= 1.05) {
      shadow.householdBook.policy = policy; offerPlan.householdPolicy = relationshipOfferCopy(policy);
    }
  }
  for (const [market, row] of Object.entries(shadow.productPrograms.markets)) for (const [segment, mix] of Object.entries(row))
    for (const [product, emphasis] of Object.entries(mix)) if (emphasis) {
      const policy = { market, segment, product, share: 25 }, q = relationshipOfferEligibility(shadow, policy);
      const fitGain = q.eligiblePrincipal ? q.eligible.reduce((n, c) => n + c.principal *
        (CUSTOMER_SEGMENTS[segment].fit[product] - CUSTOMER_SEGMENTS[segment].fit[c.product]), 0) / q.eligiblePrincipal : 0;
      if (q.requested) choices.push({ policy, value: q.requested * fitGain });
    }
  const forecast = next => operatingPreview({ ...p, marketSnapshot: g.marketEconomy }, next, g.economy);
  const baseline = forecast(plan); let best = plan, bestScore = baseline.profit - (baseline.fundingLoss || 0);
  for (const choice of choices.sort((a, b) => b.value - a.value).slice(0, 2)) {
    const candidate = { ...offerPlan, relationshipOfferPolicy: choice.policy }, budget = planBudget(p, candidate);
    if (budget.remaining < 300000) continue;
    const report = forecast(candidate);
    if (!report.relationshipOfferConverted || report.profit <= 0 || report.relationshipOfferCost > baseline.profit * .02 ||
        Math.max(0, report.relationshipOfferRunRateDelta) > baseline.profit * .005 || (report.fundingLoss || 0) > (baseline.fundingLoss || 0)) continue;
    // A bounded retention preference, not revenue or a measured lifetime value.
    const score = report.profit - (report.fundingLoss || 0) + report.relationshipOfferConverted * 60 - Math.max(0, report.relationshipOfferRunRateDelta) * 6;
    if (score > bestScore) { bestScore = score; best = candidate; }
  }
  return best;
}
