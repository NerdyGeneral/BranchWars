function createBaseCampaign(o){
 const scope=SCOPES[o.scope]?o.scope:'national';

 const g={version:'8.1',mode:o.mode,scope,scenario:o.scenario||'balanced',difficulty:o.difficulty||'vp',
  cycle:1,maxCycles:null,act:0,buyoutPressure:[0,0],consolidationStalemate:0,event:null,economy:null,opportunities:[],
  players:o.coreMultiplayerVersion===1?o.players.map(p=>({...player(p.name,p.isBot),eliminated:false})):[player(o.name1,false),player(o.name2||'Synergy Holdings AI',o.mode==='ai')],
  territories:{},trend:[],lastPlans:{},scoreDelta:{},resolution:[],resolutionId:0,log:[],
  gameOver:false,winnerId:null,rematchVotes:[],created:o.created===undefined?Date.now():o.created};
 g.players.forEach((p,i)=>p.color=bankColor(o.coreMultiplayerVersion===1?o.players[i].color:i?o.color2:o.color1,i));
 initializeBankIdentities(g,o);
 for(const[k,t]of Object.entries(TERRITORIES))if(t.tier<=SCOPES[scope].maxTier)g.territories[k]={...t,shares:[50,50],exitStreak:[0,0],exited:[false,false]};
 g.players[0].focus='downtown';
 g.players[1].focus='northside';
 for(const p of g.players)for(const k of Object.keys(g.territories))p.branches[k]=0;
 g.players[0].branches.downtown=1;
 g.players[1].branches.northside=1;
 g.players[0].facilityMarkets.downtown=['retail'];
 g.players[1].facilityMarkets.northside=['retail'];
 g.territories.downtown.shares=[56,44];
 g.territories.northside.shares=[44,56];
 if(o.coreMultiplayerVersion===1){initializeCoreMap(g,o);g.buyoutPressure=Array(g.players.length).fill(0);}
 if(g.scenario==='rate')g.players.forEach(p=>{delta(p,'deposits',1600000);
 delta(p,'cash',250000)});
 if(g.scenario==='regulatory')g.players.forEach(p=>{p.stats.compliance=23;
 p.stats.attention=14});
 if(g.scenario==='growth')g.players.forEach(p=>{p.stats.cash=2850000;
 p.stats.morale=73;
 p.stats.momentum=58});
 g.players.forEach(syncDoctrine);
 chooseEconomy(g,true);
 g.event=chooseEvent(g);
 g.opportunities=makeOpportunities(g);
 addLog(g,`${o.coreMultiplayerVersion===1?g.players.map(p=>p.name).join(', '):g.players[0].name+' and '+g.players[1].name} entered an open-ended market war. Opening regime: ${g.economy.name}.`,'SYSTEM');
 captureTrend(g,0);
 return g;
}
function validateCreationOptions(o){
 validateCampaignCreationValues(o);
 for(const identity of [o.identity1,o.identity2])if(identity!==undefined)validateBankIdentity(identity);
 if(o.startingWorkforce!==undefined&&o.startingWorkforce!=='covered')throw Error('Unsupported starting workforce instruction.');
}
function createGame(o){
 if(o?.coreMultiplayerVersion!==undefined)o=prepareCoreMultiplayerOptions(o);
 validateCreationOptions(o);
 if(o.cardEconomicsVersion!==undefined||o.bankCardsVersion!==undefined||o.researchTreeVersion!==undefined)validateCampaignRules(o,'creation');
 if(o.bankRivalryVersion!==undefined||o.balanceSheetLendingVersion!==undefined||o.monetaryPolicyVersion!==undefined)validateCampaignRules(o,'creation');
 if(o.researchProgramVersion!==undefined)validateCampaignRules(o,'creation');
 if(o.bankEconomicsVersion!==undefined||o.creditWorkloadVersion!==undefined||o.commercialServiceVersion!==undefined||o.incomeHistoryVersion!==undefined||o.financialGroupVersion!==undefined||o.featureRulesVersion===1||o.productProgramsVersion===2)validateCampaignRules(o,'creation');
 // A pilot has always forced regional scope and funding v2. Do not mutate options.
 const baseOptions=o.campaignRulesVersion===1?{...o,scope:'regional',fundingRulesVersion:2}:o;
 const g=createSeededCampaign(baseOptions);
 // Order is part of the save/replay contract. Later stages depend on earlier books.
 initializeRegionalPilot(g,o);
 initializeRegionalOffices(g,o);
 initializeMarketBooks(g,o);
 initializeCreditBooks(g,o);
 initializeFundingCovenants(g,o);
 initializeDepositBooks(g,o);
 initializeTermFunding(g,o);
 initializeRetailOffers(g,o);
 initializeProductDeployments(g,o);
 initializeServiceContracts(g,o);
 initializeServiceDesk(g,o);
 initializeManagement(g,o);
 initializeRelationships(g,o);
 initializeCustomerDemand(g,o);
 initializeCustomerGoodwill(g,o);
 initializeWorkforce(g,o);
 initializeHouseholds(g,o);
 initializeCreditPerformance(g,o);
 initializeSegmentDeposits(g,o);
 initializeProductPrograms(g,o);
 initializeAdvertising(g,o);
 initializeRegionalGrowth(g,o);
 initializeRelationshipOffers(g,o);
 initializeOnboarding(g,o);
 initializeFinancialGroup(g,o);
 initializeCorporateEconomy(g);
 initializeAgency(g);
 initializeFacilityNetwork(g);
 initializeDepartments(g);
 initializeFacilityLifecycle(g);
 if([6,7,8,9,10].includes(g.financialGroupVersion))initializeDepartmentFunctions(g);
 initializeCorporateCirculation(g);
 initializeCommercialAccounts(g,o);
 initializeFacilityExtensions(g,o);
 initializeInvestmentServices(g,o);
 initializeCreditProducts(g,o);
 if(o.investmentStrategyVersion===1)g.investmentStrategyVersion=1;
 initializeCompanyShares(g,o);
 initializeCompanyControl(g,o);
 initializeCompanyConsolidation(g,o);
 if(o.companyControlStrategyVersion===1)g.companyControlStrategyVersion=1;
 initializeSharedPremises(g,o);
 initializeCompanyCredit(g,o);
 initializeIncomeHistory(g,o);
 initializeCommercialService(g,o);
 initializeCreditWorkload(g,o);
 initializeBankEconomics(g,o);
 initializeBankRivalry(g,o);
 initializeBalanceSheetLending(g,o);
 MonetaryPolicy.initialize(g,o);
 ExpandedBusiness.initialize(g,o);
 DigitalCommercial.initialize(g,o);
 ResearchTree.initialize(g,o);
 OutsideFunding.initialize(g,o);
 PartnerCards.initialize(g,o);
 BrandCampaigns.initialize(g,o);
 HoldingCapital.initialize(g,o);
 initializeResearchProgram(g,o);
 // The complete rules marker is stamped only after every required book exists.
 // Initializers use creation prerequisites, not completed-save validation.
 if(o.featureRulesVersion===1)g.featureRulesVersion=1;
 // Creation instruction only: persisted policies are canonical. Imports and
 // historical createGame calls never run this optional starting allocation.
 applyStartingWorkforce(g,o.startingWorkforce);
 if(o.coreMultiplayerVersion===1)validateLedger(g);
 if(o.incomeHistoryVersion===1||o.featureRulesVersion===1||o.productProgramsVersion===2){g.version=campaignVersion(g);validatePilot(g)}
 return g;
}
function addLog(g,text,kind='WIRE'){g.logSequence=(g.logSequence||0)+1;g.log.unshift({cycle:g.cycle,text,kind,ts:g.created+g.logSequence});g.log=g.log.slice(0,100)}
function applyStartingWorkforce(g,instruction){
 if(instruction==='covered'&&g.bankEconomicsVersion===1&&g.creditWorkloadVersion===1){
  for(const p of g.players){
   const policy=DepartmentFunctions.defaultPlan(p),credit=Math.ceil(CreditWorkload.quote(p).workload),relationships=Math.ceil(commercialRelationshipWork(p.stats.business,p.stats.merchant));
   const office=role=>Object.values(p.facilityLifecycle.records).reduce((n,r)=>n+(r.staffQuarters?.[role]||0),0);
   if(credit>p.allocation.lending*4-office('lending')||relationships>p.allocation.business*4-office('business'))throw Error('Starting staff cannot cover essential work and existing offices.');
   policy.quotas.credit.lending=credit;policy.quotas.relationships.business=relationships;
   p.departmentFunctions.policy=DepartmentFunctions.validatePolicy(policy);
  }
 }
}
