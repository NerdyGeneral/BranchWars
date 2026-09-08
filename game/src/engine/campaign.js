function createBaseCampaign(o){
 const scope=SCOPES[o.scope]?o.scope:'national';

 const g={version:'8.1',mode:o.mode,scope,scenario:o.scenario||'balanced',difficulty:o.difficulty||'vp',
  cycle:1,maxCycles:null,act:0,buyoutPressure:[0,0],consolidationStalemate:0,event:null,economy:null,opportunities:[],
  players:[player(o.name1,false),player(o.name2||'Synergy Holdings AI',o.mode==='ai')],
  territories:{},trend:[],lastPlans:{},scoreDelta:{},resolution:[],resolutionId:0,log:[],
  gameOver:false,winnerId:null,rematchVotes:[],created:o.created===undefined?Date.now():o.created};
 g.players.forEach((p,i)=>p.color=bankColor(i?o.color2:o.color1,i));
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
 addLog(g,`${g.players[0].name} and ${g.players[1].name} entered an open-ended market war. Opening regime: ${g.economy.name}.`,'SYSTEM');
 captureTrend(g,0);
 return g;
}
function validateCreationOptions(o){
 validateCampaignCreationValues(o);
}
function createGame(o){
 validateCreationOptions(o);
 if(o.financialGroupVersion!==undefined||o.featureRulesVersion===1||o.productProgramsVersion===2)validateCampaignRules(o,'creation');
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
 if(g.financialGroupVersion===6)initializeDepartmentFunctions(g);
 // The complete rules marker is stamped only after every required book exists.
 // Initializers use creation prerequisites, not completed-save validation.
 if(o.featureRulesVersion===1)g.featureRulesVersion=1;
 if(o.featureRulesVersion===1||o.productProgramsVersion===2){g.version=campaignVersion(g);validatePilot(g)}
 return g;
}
function addLog(g,text,kind='WIRE'){g.logSequence=(g.logSequence||0)+1;g.log.unshift({cycle:g.cycle,text,kind,ts:g.created+g.logSequence});g.log=g.log.slice(0,100)}
