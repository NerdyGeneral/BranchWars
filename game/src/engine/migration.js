function repairSavedMetadata(g){
 g.mode=['ai','hotseat','lan','p2p'].includes(g.mode)?g.mode:'hotseat';
 g.scope=SCOPES[g.scope]?g.scope:'national';
 g.scenario=SCENARIOS[g.scenario]?g.scenario:'balanced';
 g.difficulty=['analyst','vp','chairman'].includes(g.difficulty)?g.difficulty:'vp';
 g.cycle=Number(g.cycle)||1;
 g.maxCycles=null;
 g.economy=g.economy&&MACRO_REGIMES[g.economy.key]?g.economy:{key:'steady',...MACRO_REGIMES.steady};
 g.trend=Array.isArray(g.trend)?g.trend:[];
 g.opportunities=Array.isArray(g.opportunities)?g.opportunities:[];
 g.resolution=Array.isArray(g.resolution)?g.resolution:[];
 g.log=Array.isArray(g.log)?g.log:[];
 g.rematchVotes=Array.isArray(g.rematchVotes)?g.rematchVotes:[];
 g.lastPlans=g.lastPlans&&typeof g.lastPlans==='object'?g.lastPlans:{};
 g.scoreDelta=g.scoreDelta&&typeof g.scoreDelta==='object'?g.scoreDelta:{};
 g.resolutionId=Number(g.resolutionId)||0;
 g.gameOver=!!g.gameOver;
 g.winnerId=g.winnerId||null;
 if(!g.event||!EVENTS.some(e=>e.key===g.event.key))g.event=EVENTS[0];
 for(const t of Object.values(g.territories)){if(!Array.isArray(t.shares)||t.shares.length!==2||!t.shares.every(Number.isFinite))t.shares=[50,50]}
}
function repairSavedPlayer(g,p,i){
 const savedDoctrineValid=Object.hasOwn(DOCTRINES,p.doctrine);
 p.id=p.id||'legacy-institution-'+i;
 p.name=String(p.name||(i?'Institution Two':'Institution One'));
 p.stats={...OPENING_STATS,...p.stats};
 for(const k of Object.keys(OPENING_STATS))if(!Number.isFinite(p.stats[k]))p.stats[k]=OPENING_STATS[k];
 p.upgrades={technology:0,training:0,analytics:0,wealth:0,operations:0,...p.upgrades};
 p.strategy={network:0,digital:0,commercial:0,operations:0,acquisition:0,...(p.strategy||{})};
 for(const k of Object.keys(STRATEGY_BRANCHES))p.strategy[k]=Math.max(0,Math.min(4,Math.round(Number(p.strategy[k])||0)));
 p.boardConcessions=Math.max(0,Math.round(Number(p.boardConcessions)||0));
 p.capitalRestriction=Math.max(0,Math.round(Number(p.capitalRestriction)||0));
 p.policies={deposit:'balanced',lending:'balanced',capital:'balanced',...p.policies};
 if(!DEPOSIT_POLICIES[p.policies.deposit])p.policies.deposit='balanced';
 if(!LENDING_POLICIES[p.policies.lending])p.policies.lending='balanced';
 if(!CAPITAL_POLICIES[p.policies.capital])p.policies.capital='balanced';
 if(!DOCTRINES[p.doctrine])p.doctrine=i?'commercial':'community';
 if(!MANDATES[p.mandate])p.mandate=Object.keys(MANDATES)[i];
 p.achievements=Array.isArray(p.achievements)?p.achievements:[];
 p.branches=p.branches&&typeof p.branches==='object'?p.branches:{};
 for(const k of Object.keys(g.territories))p.branches[k]=Number(p.branches[k])||0;
 p.allocation=p.allocation&&typeof p.allocation==='object'?p.allocation:{service:3,business:2,lending:2,operations:1};
 p.marketingTurns=Number(p.marketingTurns)||0;
 p.capability=p.capability&&typeof p.capability==='object'?p.capability:{};
 for(const key of Object.keys(STRATEGY_BRANCHES)){
  let spent=Number(p.capability[key]);
  if(!Number.isFinite(spent)||spent<0){
   const level=Math.max(0,Math.min(4,Math.round(Number(p.strategy&&p.strategy[key])||0)));
   spent=level>0?CAPABILITY_TIERS[key][level-1]:0;
  }
  p.capability[key]=spent;
 }
 delete p.strategy;
 p.primaryStrategy=leadCapability(p);
 // Doctrine has hysteresis and is settled at a specific monthly stage. A
 // valid saved value is gameplay state, not a derived cache to advance during
 // import; late hiring/other profile changes must wait for normal settlement.
 if(!savedDoctrineValid)syncDoctrine(p);
 p.lastCompetitiveAction=COMPETITIVE_ACTIONS[p.lastCompetitiveAction]?p.lastCompetitiveAction:'none';
 p.distress=Number(p.distress)||0;
 p.fundingGap=Number(p.fundingGap)||0;
 p.capitalRequests=Number(p.capitalRequests)||0;
 p.payrollSpend=Math.max(0,Number(p.payrollSpend)||0);
 p.buildSpend=Math.max(0,Number(p.buildSpend)||0);
 p.hiresTotal=Number(p.hiresTotal)||0;
 if(!Number.isFinite(p.stats.capital))p.stats.capital=Math.max(200000,Math.round((p.stats.loans+p.stats.deposits*.2)*.11));
 p.turnEffects=p.turnEffects&&typeof p.turnEffects==='object'?p.turnEffects:{};
 if(!g.territories[p.focus])p.focus=Object.keys(g.territories)[0];
 p.projects=Array.isArray(p.projects)?p.projects:(p.project?[p.project]:[]);
 delete p.project;
 p.projects=p.projects.filter(x=>x&&PROJECTS[x.key]&&Number.isFinite(x.progress)&&Number.isFinite(x.total)&&x.total>0);
 normalizeAllocation(p);
}
function repairSavedPortfolio(g,p){
 p.products={retail:'essential',business:'relationship',credit:'mortgage',...(p.products||{})};
 for(const[line,group]of Object.entries(PRODUCT_PORTFOLIOS))if(!group.options[p.products[line]])p.products[line]=Object.keys(group.options)[0];
 p.specializations=p.specializations&&typeof p.specializations==='object'?p.specializations:{};
 for(const[branch,key]of Object.entries(p.specializations))if(!STRATEGY_SPECIALIZATIONS[branch]||!STRATEGY_SPECIALIZATIONS[branch][key])delete p.specializations[branch];
 p.facilityMarkets=p.facilityMarkets&&typeof p.facilityMarkets==='object'?p.facilityMarkets:{};
 for(const market of Object.keys(g.territories)){
  const expected=Math.max(0,p.branches[market]||0);
  if(expected===0&&p.facilityMarkets[market]===undefined)continue;
  p.facilityMarkets[market]=Array.isArray(p.facilityMarkets[market])?p.facilityMarkets[market].filter(x=>(p.facilityNetwork?.version===2?FacilityNetwork.ALL_MODELS:['retail','commercial','digital']).includes(x)).slice(0,expected):[];
  while(p.facilityMarkets[market].length<expected)p.facilityMarkets[market].push('retail');
 }
 p.facilities=p.facilityNetwork?.version===2?Object.fromEntries(FacilityNetwork.ALL_MODELS.map(m=>[m,0])):{retail:0,commercial:0,digital:0};
 for(const models of Object.values(p.facilityMarkets))for(const type of models)p.facilities[type]++;
 p.projects.forEach(project=>{
  if(project.specialization){
   const def=PROJECTS[project.key],branch=def&&def.strategy;
   if(!branch||!STRATEGY_SPECIALIZATIONS[branch]||!STRATEGY_SPECIALIZATIONS[branch][project.specialization])delete project.specialization;
  }
 });
}
function repairSavedCampaign(g){
 repairSavedMetadata(g);
 g.players.forEach((p,i)=>repairSavedPlayer(g,p,i));
 g.version='8.1';
 g.players.forEach(p=>repairSavedPortfolio(g,p));
 return g;
}
function repairSavedRivalry(g){
 repairSavedCampaign(g);
 g.version=campaignVersion(g);
 g.maxCycles=null;
 g.act=Math.max(0,Math.min(2,Number(g.act)||0));
 g.buyoutPressure=Array.isArray(g.buyoutPressure)?g.buyoutPressure.slice(0,2):[0,0];
 while(g.buyoutPressure.length<2)g.buyoutPressure.push(0);
 g.consolidationStalemate=Math.max(0,Math.round(Number(g.consolidationStalemate)||0));
 for(const t of Object.values(g.territories)){
  t.exitStreak=Array.isArray(t.exitStreak)?t.exitStreak.slice(0,2):[0,0];
  t.exited=Array.isArray(t.exited)?t.exited.slice(0,2):[false,false];
  while(t.exitStreak.length<2)t.exitStreak.push(0);
  while(t.exited.length<2)t.exited.push(false);
  if(t.exited[0])t.shares=[0,100];
  else if(t.exited[1])t.shares=[100,0];
 }
 return g;
}
function migrateCampaign(g){
 if(!g||!Array.isArray(g.players)||g.players.length!==2||!g.territories||!Object.keys(g.territories).length)throw Error('Not a valid Branch Wars save.');
 if(g.financialGroupVersion!==undefined||g.featureRulesVersion!==undefined||g.productProgramsVersion===2||['8.14','8.15','9.0','9.1','9.2','9.3','9.4','9.5','9.6','9.7'].includes(g.version))validateCampaignRules(g,'game');
 else {
 if(g.onboardingVersion!==undefined&&g.version!=='8.13')throw Error('Onboarding requires a v8.13 save.');
 if(g.relationshipOffersVersion!==undefined&&g.version!==(g.onboardingVersion===1?'8.13':'8.12'))throw Error('Relationship offers requires a v8.12 save.');
 if(g.regionalGrowthVersion!==undefined&&g.version!==(g.onboardingVersion===1?'8.13':g.relationshipOffersVersion===1?'8.12':'8.11'))throw Error('Regional growth requires a v8.11 save.');
 if(g.advertisingVersion!==undefined&&g.version!==(g.onboardingVersion===1?'8.13':g.relationshipOffersVersion===1?'8.12':g.regionalGrowthVersion===1?'8.11':'8.10'))throw Error('Advertising requires a v8.10 save.');
 if(g.productProgramsVersion!==undefined&&g.version!==(g.onboardingVersion===1?'8.13':g.relationshipOffersVersion===1?'8.12':g.regionalGrowthVersion===1?'8.11':g.advertisingVersion===1?'8.10':'8.9'))throw Error('Product programmes requires a v8.9 save.');
 if(g.segmentDepositsVersion!==undefined&&g.version!==(g.onboardingVersion===1?'8.13':g.relationshipOffersVersion===1?'8.12':g.regionalGrowthVersion===1?'8.11':g.advertisingVersion===1?'8.10':g.productProgramsVersion===1?'8.9':'8.8'))throw Error('Segment deposits requires a v8.8 save.');
 if(g.creditPerformanceVersion!==undefined&&g.version!==(g.onboardingVersion===1?'8.13':g.relationshipOffersVersion===1?'8.12':g.regionalGrowthVersion===1?'8.11':g.advertisingVersion===1?'8.10':g.productProgramsVersion===1?'8.9':g.segmentDepositsVersion===1?'8.8':'8.7'))throw Error('Credit performance requires a v8.7 save.');
 if(g.customerOwnershipVersion!==undefined&&g.version!==(g.onboardingVersion===1?'8.13':g.relationshipOffersVersion===1?'8.12':g.regionalGrowthVersion===1?'8.11':g.advertisingVersion===1?'8.10':g.productProgramsVersion===1?'8.9':g.segmentDepositsVersion===1?'8.8':g.creditPerformanceVersion===1?'8.7':'8.6'))throw Error('Household ownership requires a v8.6 save.');
 if(g.workforceVersion!==undefined&&g.version!==(g.onboardingVersion===1?'8.13':g.relationshipOffersVersion===1?'8.12':g.regionalGrowthVersion===1?'8.11':g.advertisingVersion===1?'8.10':g.productProgramsVersion===1?'8.9':g.segmentDepositsVersion===1?'8.8':g.creditPerformanceVersion===1?'8.7':g.customerOwnershipVersion===1?'8.6':'8.5'))throw Error('Specialist workforce requires a v8.5 save.');
 if(!campaignVersionSupported(g.version))throw Error('Only v6.0 through v8.14 saves are supported.');
 }
 validateStoredDepartmentFunctionPolicies(g);
 g=JSON.parse(JSON.stringify(g));
 // Never repair over invalid accounting, ledger or funding versions.
 validateLedger(g);
 const fundingVersion=g.fundingRulesVersion===undefined?1:g.fundingRulesVersion;
 if(![1,2].includes(fundingVersion)||g.players.some(p=>p.fundingRulesVersion!==undefined&&p.fundingRulesVersion!==fundingVersion))throw Error('Unsupported or inconsistent funding rules version.');
 if(fundingVersion===2&&g.players.some(p=>!p.stats||!Number.isSafeInteger(p.stats.emergencyDebt)||p.stats.emergencyDebt<0))throw Error('Invalid saved emergency funding debt.');
 g.fundingRulesVersion=fundingVersion;
 g.players.forEach(p=>p.fundingRulesVersion=fundingVersion);
 validatePilot(g);
 if(g.version==='6.0'){
  g.trend=[];g.economy={key:'steady',...MACRO_REGIMES.steady};
  // Missing/invalid doctrine is reconstructed by repairSavedPlayer below;
  // do not turn its fallback into an apparently valid saved value early.
  g.players.forEach(p=>{p.achievements=[]});
 }
 return ensureSimulation(repairSavedRivalry(g));
}
// Monthly processing is deliberately ordered. Preview uses the same steps on
// private copies; only the legacy demand calculation consumes the world RNG.
