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
 // Match the former outer-to-inner checks, including errors on disabled features.
 if(o.customerDemandVersion!==undefined&&![0,1,2].includes(o.customerDemandVersion))throw Error('Unsupported customer demand version');
 if(o.managementVersion!==undefined&&![0,1,2].includes(o.managementVersion))throw Error('Unsupported institution management');
 if(o.serviceExpansionVersion!==undefined&&![0,1].includes(o.serviceExpansionVersion))throw Error('Unsupported service expansion');
 if(o.contractRulesVersion!==undefined&&![0,1].includes(o.contractRulesVersion))throw Error('Unsupported service contracts');
 if(o.productDeploymentVersion!==undefined&&![0,1].includes(o.productDeploymentVersion))throw Error('Unsupported product deployment');
 if(o.retailLifecycleVersion!==undefined&&![0,1].includes(o.retailLifecycleVersion))throw Error('Unsupported retail lifecycle');
 if(o.termFundingVersion!==undefined&&![0,1].includes(o.termFundingVersion))throw Error('Unsupported term funding');
 if(o.depositProductsVersion!==undefined&&![0,1].includes(o.depositProductsVersion))throw Error('Unsupported deposit products');
 if(o.fundingCovenantVersion!==undefined&&![0,1].includes(o.fundingCovenantVersion))throw Error('Unsupported funding covenant');
 if(o.creditLifecycleVersion!==undefined&&![0,1].includes(o.creditLifecycleVersion))throw Error('Unsupported credit lifecycle');
 if(o.marketEconomyVersion!==undefined&&![0,1].includes(o.marketEconomyVersion))throw Error('Unsupported market economy');
 if(o.regionalEconomyVersion!==undefined&&![0,1].includes(o.regionalEconomyVersion))throw Error('Unsupported regional economy version');
 if(o.campaignRulesVersion!==undefined&&o.campaignRulesVersion!==1)throw Error('Unsupported campaign rules');
}
function createGame(o){
 validateCreationOptions(o);
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
 return g;
}
function addLog(g,text,kind='WIRE'){g.logSequence=(g.logSequence||0)+1;g.log.unshift({cycle:g.cycle,text,kind,ts:g.created+g.logSequence});g.log=g.log.slice(0,100)}
