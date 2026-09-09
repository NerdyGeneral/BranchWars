function resolveMonthlySteps(g) {
  const plans = g.players.map((p) => ({ ...p.submitted, allocation: { ...p.submitted.allocation } })),
    before = [baseScore(g, 0), baseScore(g, 1)],
    L = [];
  // Both local-work instructions were authorized against one opening envelope.
  // Paying a renovation must not reserve its cost again during conversion.
  // Retain the owner snapshot too: the metrics provider stages staff lazily,
  // and must not observe already-created renovation work against this budget.
  const openingOfficeContexts=[5,6,7].includes(g.financialGroupVersion)
    ?g.players.map((p,i)=>facilityContext(g,JSON.parse(JSON.stringify(p)),plans[i])):null;
  const openingLifecycleContexts=[6,7].includes(g.financialGroupVersion)?g.players.map((p,i)=>facilityLifecyclePlanningContext(g,p,plans[i]).context):null;
  if([6,7].includes(g.financialGroupVersion))L.push(...recordLedgerStage(g,'prepareDepartmentFunctions','departments.functions',()=>prepareDepartmentFunctions(g,plans)));
  L.push(...prepareFacilityLifecycle(g,plans,openingLifecycleContexts));
  L.push(...prepareFacilityInstructions(g,plans,openingOfficeContexts));
  g.players.forEach((p, i) => {
    p.allocation = Object.fromEntries(Object.keys(ROLES).map((k) => [k, plans[i].allocation[k]]));
    p.policies = {
      deposit: plans[i].depositPolicy,
      lending: plans[i].lendingPolicy,
      capital: plans[i].capitalPolicy
    };
    p.products = { ...p.products, ...plans[i].products };
    if(p.financialGroup)recordLedgerStage(g,'applyGroupPortfolio','group.portfolio',()=>applyGroupPortfolio(p,plans[i]));
    if (p.termFunding && plans[i].termPolicy) p.termFunding.policy = { ...plans[i].termPolicy };
    if(p.productPrograms)recordLedgerStage(g,'applyProductProgramPolicy','products.policy',()=>applyProductProgramPolicy(p, plans[i].productProgramPolicy, true));
    if(p.productPrograms&&plans[i].productProgramPolicy?.retire.length)L.push(p.name+' retired '+plans[i].productProgramPolicy.retire.map(k=>RETAIL_DEPLOYMENTS[k].name).join(' and ')+' for $'+(plans[i].productProgramPolicy.retire.length*PRODUCT_RETIRE_COST).toLocaleString()+'. Existing accounts remain serviced.');
    if(p.advertising)recordLedgerStage(g,'applyAdvertisingPolicy','advertising.policy',()=>applyAdvertisingPolicy(p,plans[i].advertisingPolicy));
    if (p.retailLifecycle) applyRetailMix(p, plans[i].retailMix || p.retailLifecycle.mix);
    applyServicePolicy(p, plans[i].servicePolicy);
    applyManagementPolicy(p, plans[i].management);
    applyWorkforcePolicy(p, plans[i].workforcePolicy);
    applyHouseholdPolicy(p, plans[i].householdPolicy);
    applyCollectionsPolicy(p, plans[i].collectionsPolicy);
    if(p.relationshipOffers)recordLedgerStage(g,'applyRelationshipOfferPolicy','customers.offers',()=>applyRelationshipOfferPolicy(p,plans[i].relationshipOfferPolicy));
    if(p.relationshipOffers)p._relationshipOfferBudget=relationshipOfferBudget(p,plans[i]);
    if(p.onboarding)recordLedgerStage(g,'applyOnboardingPolicy','customers.onboarding',()=>applyOnboardingPolicy(p,plans[i].onboardingPolicy));
    if(p.onboarding)p._onboardingBudget=onboardingBudget(p,plans[i]);
    if (p.workforce) p._workforceReserved = workforceLateReserve(p, plans[i]);
    p.focus = plans[i].focus;
    applyDecision(g, p, plans[i].decision);
    const aid = applyCapitalRequest(g, p, !!plans[i].capitalAction);
    if (aid) L.push(aid);
  });
  L.push(...resolveCompetitiveActions(g, plans));
  if([6,7].includes(g.financialGroupVersion)){
    L.push(...recordLedgerStage(g,'settleDepartmentLeadership','departments.leadership',()=>settleDepartmentLeadership(g,plans)));
    recordLedgerStage(g,'deliverDepartmentFunctions','departments.dispatch',()=>deliverDepartmentFunctions(g));
  }
  g.players.forEach((p, i) => {
    for (const key of planInitiatives(plans[i])) {
      const msg = startProject(g, p, key, plans[i].specializations);
      if (msg) L.push(msg);
    }
  });
  if([4,5].includes(g.financialGroupVersion))L.push(...recordLedgerStage(g,'settleDepartmentLeadership','departments.leadership',()=>settleDepartmentLeadership(g,plans)));
  L.push(...recordLedgerStage(g,'settleCorporateEconomy','companies.settlement',()=>settleCorporateEconomy(g)));
  g.players.forEach((p) => {
    const production=operate(g,p);
    L.push(p.departmentOffice?production+' Production profit excludes separately reported head-office department costs.':production);
  });
  L.push(...recordLedgerStage(g,'finishCorporateEconomy','companies.contracts',()=>finishCorporateEconomy(g)));
  g.players.forEach((p) => {
    const msg = deleverage(g, p);
    if (msg) L.push(msg);
  });
  const contest = depositContest(g);
  L.push(...contest.lines);
  g.players.forEach((p, i) => L.push(...settleFunding(g, p, contest.outflow[i])));
  L.push(...resolveOpportunities(g, plans));
  L.push(...simulateMarkets(g));
  L.push(...resolveMarketExits(g));
  L.push(...franchiseDividends(g));
  L.push(...advanceInstitutionProjects(g));
  L.push(...settleFacilityLifecycle(g,plans));
  g.players.forEach((p) => L.push(...consequences(g, p)));
  g.players.forEach((p, i) => {
    const trained = settleWorkforceTraining(g, p);
    if (trained) L.push(trained);
    if(p.departmentOffice)recordLedgerStage(g,'settleDepartmentExperience','departments.experience',()=>{
      settleDepartmentExperience(g,p);
      addDepartmentOperatingReport(p);
    });
    L.push(...applyInvestments(g, p, plans[i].investments, plans[i].specializations));
    const late = plans[i].specializations || {};
    for (const key of Object.keys(STRATEGY_BRANCHES))
      if (
        strategyLevel(p, key) >= 1 &&
        !p.specializations[key] &&
        late[key] &&
        STRATEGY_SPECIALIZATIONS[key][late[key]]
      ) {
        p.specializations[key] = late[key];
        L.push(
          `${p.name} adopted the ${STRATEGY_SPECIALIZATIONS[key][late[key]].name} operating model in ${STRATEGY_BRANCHES[key].name}.`
        );
      }
    syncPrimaryStrategy(p);
    syncDoctrine(p);
    const msg = applyHiring(g, p, planHires(plans[i]), plans[i].specialistHires);
    if (msg) L.push(msg);
  });
  L.push(...awardMilestones(g));
  const actMessage = updateCampaignAct(g);
  if (actMessage) L.push(actMessage);
  g.lastPlans = { [g.players[0].id]: plans[0], [g.players[1].id]: plans[1] };
  g.players.forEach((p, i) => {
    if (!plans[i].capitalAction && p.capitalRestriction > 0) p.capitalRestriction--;
    p.submitted = null;
    p.turnEffects = {};
  });
  g.scoreDelta = {
    [g.players[0].id]: Math.round((baseScore(g, 0) - before[0]) * 10) / 10,
    [g.players[1].id]: Math.round((baseScore(g, 1) - before[1]) * 10) / 10
  };
  L.push(...settleRegionalGrowthWithLedger(g));
  if([3,4,5,6,7].includes(g.financialGroupVersion))L.push(...recordLedgerStage(g,'settleAgency','group.agency',()=>settleAgency(g,plans)));
  L.push(...recordLedgerStage(g,'settleGroupCapital','group.capital',()=>settleGroupCapital(g,plans)));
  for(const p of g.players)finishProductPricingReview(g,p);
  if([6,7].includes(g.financialGroupVersion))L.push(...recordLedgerStage(g,'finishDepartmentFunctions','departments.delivery',()=>finishDepartmentFunctions(g)));
  const ending = evaluateStrategicEnd(g);
  if (ending) L.push(ending);
  g.resolution = L;
  g.resolutionId++;
  addLog(g, `CYCLE ${g.cycle} // ${L.join(' ')}`, 'RESOLUTION');
  captureTrend(g, g.cycle);
  if (g.gameOver) addLog(g, ending, 'FINAL');
  else {
    g.cycle++;
    activateFacilityInstructions(g);
    activateFacilityLifecycle(g);
    const newly = activeTerritories(g)
      .filter(([, t]) => t.unlock === g.cycle)
      .map(([, t]) => t.name);
    if (newly.length) addLog(g, `EXPANSION AUTHORIZED // ${newly.join(' and ')} are now open.`, 'EXPANSION');
    if ((g.cycle - 1) % 4 === 0) {
      chooseEconomy(g);
      addLog(g, `ECONOMIC REGIME // ${g.economy.name}: ${g.economy.text}`, 'ECONOMY');
    }
    g.event = chooseEvent(g);
    g.opportunities = makeOpportunities(g);
  }
  return g;
}
