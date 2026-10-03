function resolveMonthlySteps(g) {
  const eachBank=run=>g.players.forEach((p,i)=>{if(!coreMultiplayer(g)||!p.eliminated)run(p,i)});
  const plans = g.players.map((p,i) => ({ ...(p.submitted||(coreMultiplayer(g)?defaultCoreMultiplayerPlan(g,i):null)), allocation: { ...p.submitted?.allocation } })),
    before = g.players.map((_,i)=>baseScore(g,i)),
    L = [];
  if(g.companyCreditVersion===1)L.push(...recordLedgerStage(g,'settleCompanyCreditOrders','companies.credit',()=>settleCompanyCreditOrders(g,plans)));
  if(g.expandedBusinessVersion===1)L.push(...recordLedgerStage(g,'settleHoldingCapital','group.ownership',()=>HoldingCapital.settle(g,plans)));
  if(g.companySharesVersion===1)L.push(...recordLedgerStage(g,'settleCompanyShareAuction','companies.shares',()=>settleCompanyShareAuction(g,plans)));
  if(g.companyControlVersion===1)L.push(...recordLedgerStage(g,'settleCompanyControl','companies.control',()=>settleCompanyControl(g,plans)));
  // Both local-work instructions were authorized against one opening envelope.
  // Paying a renovation must not reserve its cost again during conversion.
  // Retain the owner snapshot too: the metrics provider stages staff lazily,
  // and must not observe already-created renovation work against this budget.
  const openingOfficeContexts=[5,6,7,8,9,10].includes(g.financialGroupVersion)
    ?g.players.map((p,i)=>facilityContext(g,JSON.parse(JSON.stringify(p)),plans[i])):null;
  const openingLifecycleContexts=[6,7,8,9,10].includes(g.financialGroupVersion)?g.players.map((p,i)=>facilityLifecyclePlanningContext(g,p,plans[i]).context):null;
  if([6,7,8,9,10].includes(g.financialGroupVersion))L.push(...recordLedgerStage(g,'prepareDepartmentFunctions','departments.functions',()=>prepareDepartmentFunctions(g,plans)));
  L.push(...prepareFacilityLifecycle(g,plans,openingLifecycleContexts));
  L.push(...prepareFacilityInstructions(g,plans,openingOfficeContexts));
  if(g.facilityExtensionsVersion===1)L.push(...recordLedgerStage(g,'prepareFacilityExtensions','facilities.extensions',()=>prepareFacilityExtensions(g,plans)));
  eachBank((p, i) => {
    p.allocation = Object.fromEntries(Object.keys(ROLES).map((k) => [k, plans[i].allocation[k]]));
    p.policies = {
      deposit: plans[i].depositPolicy,
      lending: plans[i].lendingPolicy,
      capital: plans[i].capitalPolicy
    };
    p.products = { ...p.products, ...plans[i].products };
    if(MonetaryPolicy.enabled(p)&&plans[i].treasuryPolicy!==undefined)p.treasury.policy=plans[i].treasuryPolicy;
    if(p.financialGroup)recordLedgerStage(g,'applyGroupPortfolio','group.portfolio',()=>applyGroupPortfolio(p,plans[i]));
    if (p.termFunding && plans[i].termPolicy) p.termFunding.policy = { ...plans[i].termPolicy };
    if(p.productPrograms)recordLedgerStage(g,'applyProductProgramPolicy','products.policy',()=>applyProductProgramPolicy(p, plans[i].productProgramPolicy, true));
    if(p.productPrograms&&plans[i].productProgramPolicy?.retire.length)L.push(p.name+' retired '+plans[i].productProgramPolicy.retire.map(k=>RETAIL_DEPLOYMENTS[k].name).join(' and ')+' for $'+(plans[i].productProgramPolicy.retire.length*PRODUCT_RETIRE_COST).toLocaleString()+'. Existing accounts remain serviced.');
    if(p.advertising)recordLedgerStage(g,'applyAdvertisingPolicy','advertising.policy',()=>applyAdvertisingPolicy(p,plans[i].advertisingPolicy));
    if(p.expandedBusinessVersion===1)recordLedgerStage(g,'applyBrandCampaigns','advertising.branding',()=>BrandCampaigns.apply(p,plans[i].brandCampaignPolicy));
    if (p.retailLifecycle) applyRetailMix(p, plans[i].retailMix || p.retailLifecycle.mix);
    applyServicePolicy(p, plans[i].servicePolicy);
    if(p.commercialAccounts)p.commercialAccounts.policy=JSON.parse(JSON.stringify(plans[i].commercialAccountPolicy||p.commercialAccounts.policy));
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
    if(coreMultiplayer(g))p.rivalId=g.players[coreRivalIndex(g,i,p.focus,plans[i].rivalId)].id;
    applyDecision(g, p, plans[i].decision);
    const aid = applyCapitalRequest(g, p, !!plans[i].capitalAction);
    if (aid) L.push(aid);
  });
  L.push(...resolveCompetitiveActions(g, plans));
  if([6,7,8,9,10].includes(g.financialGroupVersion)){
    L.push(...recordLedgerStage(g,'settleDepartmentLeadership','departments.leadership',()=>settleDepartmentLeadership(g,plans)));
    recordLedgerStage(g,'deliverDepartmentFunctions','departments.dispatch',()=>deliverDepartmentFunctions(g));
  }
  eachBank((p, i) => {
    for (const key of planInitiatives(plans[i])) {
      const msg = startProject(g, p, key, plans[i].specializations, projectPlanTarget(plans[i],key));
      if (msg) L.push(msg);
    }
  });
  if([4,5].includes(g.financialGroupVersion))L.push(...recordLedgerStage(g,'settleDepartmentLeadership','departments.leadership',()=>settleDepartmentLeadership(g,plans)));
  L.push(...recordLedgerStage(g,'settleCorporateEconomy','companies.settlement',()=>settleCorporateEconomy(g)));
  // Route already-paid issuer distributions before later corporate spending
  // can reuse that cash. Final valuation still includes all later expenses.
  if(g.companySharesVersion===1)L.push(...recordLedgerStage(g,'settleCompanyDistributions','companies.shareIncome',()=>settleCompanyDistributions(g)));
  eachBank((p) => {
    if(p.commercialAccounts)p._commercialAccountQuarters=commercialAccountWork(p);
    const production=operate(g,p);
    L.push(p.departmentOffice?production+' Production profit excludes separately reported head-office department costs.':production);
  });
  L.push(...recordLedgerStage(g,'finishCorporateEconomy','companies.contracts',()=>finishCorporateEconomy(g)));
  eachBank((p) => {
    const msg = deleverage(g, p);
    if (msg) L.push(msg);
  });
  const contest = depositContest(g);
  L.push(...contest.lines);
  eachBank((p, i) => L.push(...settleFunding(g, p, contest.outflow[i])));
  L.push(...resolveOpportunities(g, plans));
  L.push(...simulateMarkets(g));
  L.push(...resolveMarketExits(g));
  L.push(...franchiseDividends(g));
  L.push(...advanceInstitutionProjects(g));
  L.push(...settleFacilityLifecycle(g,plans));
  eachBank((p) => L.push(...consequences(g, p)));
  eachBank((p, i) => {
    const trained = settleWorkforceTraining(g, p);
    if (trained) L.push(trained);
    if(p.departmentOffice)recordLedgerStage(g,'settleDepartmentExperience','departments.experience',()=>{
      settleDepartmentExperience(g,p);
      addDepartmentOperatingReport(p);
    });
    L.push(...applyInvestments(g, p, plans[i].investments, plans[i].specializations));
    if(DigitalCommercial.enabled(p))L.push(...recordLedgerStage(g,'settleDigitalCommercial','research.capability',()=>DigitalCommercial.settle(g,p,plans[i])));
    const late = plans[i].specializations || {};
    for (const key of researchBranches(p))
      if (
        strategyLevel(p, key) >= 1 &&
        !p.specializations[key] &&
        late[key] &&
        researchModelTable(p)[key][late[key]]
      ) {
        p.specializations[key] = late[key];
        L.push(
          `${p.name} adopted the ${researchModelTable(p)[key][late[key]].name} operating model in ${researchBranchTable(p)[key].name}.`
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
  g.lastPlans = Object.fromEntries(g.players.flatMap((p,i)=>coreMultiplayer(g)&&p.eliminated?[]:[[p.id,plans[i]]]));
  eachBank((p, i) => {
    if (!plans[i].capitalAction && p.capitalRestriction > 0) p.capitalRestriction--;
    p.submitted = null;
    p.turnEffects = {};
  });
  g.scoreDelta = Object.fromEntries(g.players.map((p,i)=>[p.id,Math.round((baseScore(g,i)-before[i])*10)/10]));
  L.push(...settleRegionalGrowthWithLedger(g));
  if(g.sharedPremisesVersion===1)L.push(...recordLedgerStage(g,'settleSharedPremisesGroup','group.premises',()=>settleSharedPremisesGroup(g,plans)));
  else {
  if([3,4,5,6,7,8,9,10].includes(g.financialGroupVersion))L.push(...recordLedgerStage(g,'settleAgency','group.agency',()=>settleAgency(g,plans)));
  L.push(...recordLedgerStage(g,'settleGroupCapital','group.capital',()=>settleGroupCapital(g,plans)));
  if(g.investmentServicesVersion===1)L.push(...recordLedgerStage(g,'settleInvestmentServices','group.investment',()=>settleInvestmentServices(g,plans)));
  }
  if(g.companySharesVersion===1)L.push(...recordLedgerStage(g,'finishCompanyShares',g.companyConsolidationVersion===1?'companies.valuation':'companies.shareIncome',()=>finishCompanyShares(g)));
  for(const p of g.players)finishProductPricingReview(g,p);
  if(PartnerCards.enabled(g))L.push(...recordLedgerStage(g,'settlePartnerCards','cards.settlement',()=>PartnerCards.settle(g,plans)));
  if([6,7,8,9,10].includes(g.financialGroupVersion))L.push(...recordLedgerStage(g,'finishDepartmentFunctions','departments.delivery',()=>finishDepartmentFunctions(g)));
  L.push(...settleCorporateCirculation(g));
  if(g.commercialAccountsVersion===1)L.push(...recordLedgerStage(g,'settleCommercialAccounts','companies.operatingDeposits',()=>settleCommercialAccounts(g)));
  if(OutsideFunding.enabled(g))L.push(...recordLedgerStage(g,'settleOutsideFunding','funding.outside',()=>OutsideFunding.settle(g,plans)));
  if(MonetaryPolicy.enabled(g))for(const p of g.players){const line=MonetaryPolicy.finish(g,p);if(line)L.push(line);}
  HoldingCapital.finish(g);
  const ending = evaluateStrategicEnd(g);
  if (ending) L.push(ending);
  if(g.expandedBusinessVersion===1)L.unshift(...g.players.flatMap(p=>p.brandCampaigns.events.filter(e=>['start','end','cancel'].includes(e.type)).map(e=>e.text)));
  L.unshift(...BankAnnouncements.publish(g,plans));
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
    const fed=MonetaryPolicy.advance(g);
    if(fed){
      const firstEconomic=g.announcements?.length||0;
      L.splice(firstEconomic,0,fed);addLog(g,fed,'FEDERAL FUNDS');
    }
    g.event = chooseEvent(g);
    g.opportunities = makeOpportunities(g);
  }
  return g;
}
