function chooseOpenBot(g, index) {
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
  return planSpecialistWorkforce(g, index, plan);
}
function validatePilot(g) {
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
  return g;
}
function validatePortfolioPlan(p, plan) {
  normalizePortfolioProducts(p, plan);
  validateDeploymentPolicy(p, plan);
  normalizeServicePolicy(p, plan);
  normalizeManagementPolicy(p, plan);
  normalizeWorkforcePlan(p, plan);
}
