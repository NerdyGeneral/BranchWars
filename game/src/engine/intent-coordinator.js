function chooseOpenBot(g,index){return withCorporateForecast(g,()=>chooseOpenBotCore(g,index));}
function chooseOpenBotCore(g, index) {
  const initial = () => {
    let plan = withRandom(g, 'aiState', () => chooseBaselinePlan(g, index));
    plan = planPilotReserve(g, index, plan);
    return planRegionalOffice(g, index, plan);
  };
  // Only initial selection needs a live market scope; later previews use snapshots.
  let plan = g.marketEconomy ? withMarket(g, initial) : initial();
  plan = planFundingRecovery(g, index, plan);
  plan = planTermFunding(g, index, plan);
  plan = planRetailMix(g, index, plan);
  plan = planProductDeployment(g, index, plan);
  plan = planContractBid(g, index, plan);
  plan = planServiceDesk(g, index, plan);
  plan = planServiceReserve(g, index, plan);
  plan = planInstitutionManagement(g, index, plan);
  if (g.managementVersion === 2) plan = renewalPricingPlan(g, g.players[index], plan).plan;
  plan = customerMixPlan(g, g.players[index], plan);
  plan = planProductPrograms(g, index, plan);
  plan = planSpecialistWorkforce(g, index, plan);
  plan = planHouseholdService(g, index, plan);
  plan = planAdvertising(g, index, plan);
  plan = planRelationshipOffers(g, index, plan);
  plan = planOnboarding(g, index, plan);
  plan = collectionsPlan(g, index, plan);
  plan = planBankRecovery(g, index, plan);
  plan = planFinalCashReserve(g, index, plan);
  plan = reconsiderOnboardingPending(g, index, plan);
  plan=g.productProgramsVersion===2?planFinalCashReserve(g,index,planProductPricing(g,index,plan)):plan;
  plan=planFinancialGroup(g,index,plan);
  // A changed loan mix can change the loss reserve after the earlier pricing
  // pass. Recheck only new group campaigns; old AI order remains byte-exact.
  return [1,2].includes(g.financialGroupVersion)?planFinalCashReserve(g,index,plan):plan;
}
function aiCashPlanningReview(g, index, plan) {
  if (![1, 2].includes(g.productProgramsVersion)) return null;
  const p = g.players[index], decisionOwner = JSON.parse(JSON.stringify(p));
  // The announced executive call is public. Dry-run its existing settlement on
  // a private copy so this reserve cannot drift from a second table of prices.
  // Do not count event windfalls, board aid, or hidden rival plans as funding.
  applyDecision({ event: g.event }, decisionOwner, plan.decision);
  const decisionExpense = Math.max(0, p.stats.capital - decisionOwner.stats.capital);
  const forecastPlan = JSON.parse(JSON.stringify(plan));
  if (forecastPlan.advertisingPolicy) forecastPlan.advertisingPolicy.budget = 0;
  if (forecastPlan.relationshipOfferPolicy) forecastPlan.relationshipOfferPolicy.share = 0;
  if (forecastPlan.onboardingPolicy) forecastPlan.onboardingPolicy.share = 0;
  if (forecastPlan.workforcePolicy) for (const role of Object.keys(forecastPlan.workforcePolicy.training)) forecastPlan.workforcePolicy.training[role] = 0;
  const forecast = operatingPreview({ ...p, focus: plan.focus, marketSnapshot: g.marketEconomy }, forecastPlan, g.economy);
  const operatingLoss = Math.max(0, -forecast.profit + (forecast.fundingLoss || 0));
  const cashReserve = 250000, capitalReserve = 200000 + 2 * operatingLoss;
  const limit = Math.max(0, Math.min(p.stats.cash - decisionExpense - cashReserve,
    pilotSpendingLimit(p, .10, capitalReserve + decisionExpense)));
  return { decisionExpense, cashReserve, capitalReserve, operatingLoss, limit };
}
function planFinalCashReserve(g, index, input) {
  // Earlier versions keep their exact planner order and decisions. This final
  // pass closes the reserve gap left when later product/staff planners add spend.
  if (![1, 2].includes(g.productProgramsVersion)) return input;
  const p = g.players[index], plan = JSON.parse(JSON.stringify(input));
  if (plan.contractBid && p.serviceDesk) {
    const bid = g.serviceAgreements.find(c => c.id === plan.contractBid);
    const proposed = policy => ({ ...p, allocation: plan.allocation, serviceDesk: { ...p.serviceDesk, policy } });
    if (!bid || bid.due !== g.cycle || bid.owner === p.id) plan.contractBid = null;
    else if (!serviceBidStatus(proposed(plan.servicePolicy), bid).eligible) {
      // Recovery may add Business generalists after a bid was selected. That
      // can dilute the specialist bonus assigned to its reserved delivery staff.
      // Reconcile the FINAL mix through shared capacity rules; no future hire or
      // unfinished platform is treated as already available. Prefer reserving an
      // existing banker before adding paid vendor capacity, or leave the bid out.
      const demand = p.serviceDesk.contracts.filter(c => c.id !== bid.id).reduce((n, c) => n + SERVICE_TYPES[c.kind].load, 0) + SERVICE_TYPES[bid.kind].load;
      let repaired = null;
      for (let outsourcing = plan.servicePolicy.outsourcing; outsourcing <= 4 && !repaired; outsourcing++) {
        for (let staff = plan.servicePolicy.staff; staff <= Math.min(plan.allocation.business, Math.ceil(demand / 2)); staff++) {
          const policy = { ...plan.servicePolicy, staff, outsourcing };
          if (serviceBidStatus(proposed(policy), bid).eligible) { repaired = policy; break; }
        }
      }
      if (repaired) plan.servicePolicy = repaired;
      else plan.contractBid = null;
    }
  }
  const review = aiCashPlanningReview(g, index, plan);
  const excess = () => Math.max(0, planBudget(p, plan).total - review.limit);
  for (const key of Object.keys(plan.investments || {})) {
    plan.investments[key] = Math.max(0, plan.investments[key] - Math.ceil(excess()));
    if (plan.investments[key] < 1000) delete plan.investments[key];
  }
  if (excess() && plan.workforcePolicy) for (const role of Object.keys(plan.workforcePolicy.training)) plan.workforcePolicy.training[role] = 0;
  if (excess() && plan.advertisingPolicy) plan.advertisingPolicy.budget = 0;
  if (excess() && plan.relationshipOfferPolicy) plan.relationshipOfferPolicy.share = 0;
  if (excess() && plan.onboardingPolicy) plan.onboardingPolicy.share = 0;
  if (excess()) { plan.hires = 0; if (plan.specialistHires) for (const role of Object.keys(plan.specialistHires)) plan.specialistHires[role] = 0; }
  plan.newProjects = [...planInitiatives(plan)];
  while (plan.newProjects.length && excess()) plan.newProjects.pop();
  plan.newProject = plan.newProjects[0] || null;
  if (excess()) plan.competitiveAction = 'none';
  if (excess() && plan.productProgramPolicy) plan.productProgramPolicy.retire = [];
  if (input.advertisingPolicy?.budget && !plan.advertisingPolicy.budget) {
    // A cancelled campaign must not leave its temporary sales-time release in
    // place. Reprice the reserve once with the ordinary retention mandate; the
    // zero ad budget makes this retry bounded to one additional pass.
    return planFinalCashReserve(g, index, planHouseholdService(g, index, plan));
  }
  // No persistent retry queue: an unfunded initiative stays unstaged until a
  // later plan can fund it. Execution checks still handle unpredictable shocks.
  return plan;
}
function validatePilot(g) {
  if (g.financialGroupVersion !== undefined || g.featureRulesVersion !== undefined || ['8.14', '8.15', '9.0', '9.1'].includes(g.version)) validateCampaignRules(g, 'game');
  validateAccountingSave(g);
  validateRegionalSave(g);
  validateMarketSave(g);
  validateCreditSave(g);
  validateFundingSave(g);
  validateDepositSave(g);
  validateTermSave(g);
  validateRetailSave(g);
  validateDeploymentSave(g);
  validateContractSave(g);
  validateServiceSave(g);
  validateManagementSave(g);
  validateRelationshipSave(g);
  validateCustomerSave(g);
  validateGoodwillSave(g);
  validateWorkforceSave(g);
  validateHouseholdSave(g);
  validateCreditPerformanceSave(g);
  validateSegmentDepositSave(g);
  validateProductProgramSave(g);
  validateAdvertisingSave(g);
  validateRegionalGrowthSave(g);
  validateRelationshipOfferSave(g);
  validateOnboardingSave(g);
  validateFinancialGroupSave(g);
  validateCorporateSave(g);
  return g;
}
function validatePortfolioPlan(p, plan) {
  normalizeProductProgramPlan(p, plan);
  normalizeAdvertisingPlan(p, plan);
  normalizeRelationshipOfferPlan(p, plan);
  normalizeOnboardingPlan(p, plan);
  normalizePortfolioProducts(p, plan);
  validateDeploymentPolicy(p, plan);
  normalizeServicePolicy(p, plan);
  normalizeManagementPolicy(p, plan);
  normalizeWorkforcePlan(p, plan);
  normalizeHouseholdPlan(p, plan);
  normalizeCollectionsPlan(p, plan);
  normalizeGroupPlan(p, plan);
}
