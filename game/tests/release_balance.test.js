'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const file=path.join(__dirname,'../BRANCH_WARS.html'),source=fs.readFileSync(file,'utf8'),ctx={console,Math,Date};
const attribution=process.argv.includes('--attribution')?require('./balance-attribution.js'):null,engine=source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
vm.runInNewContext(attribution?attribution.instrument(engine):engine,ctx);
const E=ctx.BWEngine,hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const serviceExpansionVersion=process.argv.includes('--previous-services')?0:1;
const onboardingVersion=process.argv.includes('--onboarding')?1:0;
const relationshipOffersVersion=onboardingVersion||process.argv.includes('--relationship-offers')?1:0; const regionalGrowthVersion=relationshipOffersVersion||process.argv.includes('--regional-growth')?1:0;
const advertisingVersion=regionalGrowthVersion||process.argv.includes('--advertising')?1:0;
const productProgramsVersion=advertisingVersion||process.argv.includes('--product-programs')?1:0;
const segmentDepositsVersion=productProgramsVersion||process.argv.includes('--segment-deposits')?1:0;
const creditPerformanceVersion=segmentDepositsVersion||process.argv.includes('--collections')?1:0;
const customerOwnershipVersion=creditPerformanceVersion||process.argv.includes('--households')?1:0;
const workforceVersion=customerOwnershipVersion||process.argv.includes('--workforce')?1:0;
const customerDemandVersion=workforceVersion||process.argv.includes('--customer-relationships')?2:process.argv.includes('--customer-needs')?1:0;
const managementVersion=customerDemandVersion||process.argv.includes('--relationships')?2:process.argv.includes('--management')?1:0;
const numberArg=(key,fallback)=>{const i=process.argv.indexOf(key),n=i<0?fallback:Number(process.argv[i+1]);assert(Number.isSafeInteger(n)&&n>=0,'Invalid '+key);return n};
const seedStart=numberArg('--seed-start',0),seedCount=numberArg('--seeds',4),turnLimit=numberArg('--turns',120);
const scenarioIndex=process.argv.indexOf('--scenario'),scenarioName=scenarioIndex<0?null:process.argv[scenarioIndex+1];
assert(scenarioIndex<0||typeof scenarioName==='string'&&Object.hasOwn(E.SCENARIOS,scenarioName),'Invalid --scenario; choose '+Object.keys(E.SCENARIOS).join(', '));
assert(process.argv.filter(x=>x==='--scenario').length<=1,'Specify --scenario only once.');
const scenarios=scenarioName?[scenarioName]:Object.keys(E.SCENARIOS),results=[],activity=[],skipped=[],cancelled=[];let turns=0,maxViewBytes=0;
const attributionReports=[];let attributionSelfTest=null;
const sharePercent=values=>{const total=values.reduce((n,v)=>n+v,0);return values.map(v=>total?v/total*100:0)};
function competitionMetrics(){return{samples:0,depositLeadChanges:0,maxDepositSharePercent:[0,0],longestDepositDominanceMonths:[0,0],below10CapitalMonths:[0,0],longestBelow10CapitalMonths:[0,0],capitalReturnsTo10:[0,0],lossMonths:[0,0],_leader:null,_dominance:[0,0],_below10:[0,0]}}
function observeCompetition(metrics,deposits,ratios,profits){
 const shares=sharePercent(deposits),leader=deposits[0]===deposits[1]?null:deposits[0]>deposits[1]?0:1;metrics.samples++;
 if(leader!==null){if(metrics._leader!==null&&metrics._leader!==leader)metrics.depositLeadChanges++;metrics._leader=leader;}
 for(let seat=0;seat<2;seat++){
  metrics.maxDepositSharePercent[seat]=Math.max(metrics.maxDepositSharePercent[seat],shares[seat]);
  metrics._dominance[seat]=shares[seat]>=80?metrics._dominance[seat]+1:0;
  metrics.longestDepositDominanceMonths[seat]=Math.max(metrics.longestDepositDominanceMonths[seat],metrics._dominance[seat]);
  if(ratios[seat]<10){metrics.below10CapitalMonths[seat]++;metrics._below10[seat]++;metrics.longestBelow10CapitalMonths[seat]=Math.max(metrics.longestBelow10CapitalMonths[seat],metrics._below10[seat]);}
  else{if(metrics._below10[seat])metrics.capitalReturnsTo10[seat]++;metrics._below10[seat]=0;}
  if(profits[seat]<0)metrics.lossMonths[seat]++;
 }
}
function reportedCompetition(metrics){const{_leader,_dominance,_below10,...report}=metrics;return report}
// Report-only fixtures: dominance is seat-specific, ties do not invent leaders,
// and one return to 10% is not a claim of sustained recovery or fair balance.
{
 const metrics=competitionMetrics();
 for(const row of [ [[80,20],[9,11],[-1,1]], [[90,10],[8,10],[0,-1]], [[50,50],[10,9],[1,1]], [[20,80],[11,8],[1,1]], [[10,90],[12,10],[1,1]], [[80,20],[9,10],[1,1]] ])observeCompetition(metrics,...row);
 assert.deepEqual(reportedCompetition(metrics),{samples:6,depositLeadChanges:2,maxDepositSharePercent:[90,90],longestDepositDominanceMonths:[2,2],below10CapitalMonths:[3,2],longestBelow10CapitalMonths:[2,2],capitalReturnsTo10:[1,1],lossMonths:[1,1]});
 assert.deepEqual(sharePercent([0,0]),[0,0]);
 const empty=competitionMetrics();observeCompetition(empty,[0,0],[10,10],[0,0]);assert.deepEqual(empty.longestDepositDominanceMonths,[0,0]);assert.equal(empty.depositLeadChanges,0);
}
for(const scenario of scenarios)for(let seed=seedStart;seed<seedStart+seedCount;seed++){
 const g=E.createGame({onboardingVersion,relationshipOffersVersion,regionalGrowthVersion,advertisingVersion,productProgramsVersion,segmentDepositsVersion,creditPerformanceVersion,customerOwnershipVersion,workforceVersion,customerDemandVersion,campaignRulesVersion:1,serviceExpansionVersion,managementVersion,mode:'hotseat',scenario,seed:'release-'+scenario+'-'+seed,created:1});
 const tracker=attribution?attribution.createTracker(E,ctx.balanceAuditTrace,g):null;
 if(attribution&&!attributionSelfTest)attributionSelfTest=attribution.verifyNoninterference(engine,{onboardingVersion,relationshipOffersVersion,regionalGrowthVersion,advertisingVersion,productProgramsVersion,segmentDepositsVersion,creditPerformanceVersion,customerOwnershipVersion,workforceVersion,customerDemandVersion,campaignRulesVersion:1,serviceExpansionVersion,managementVersion,mode:'hotseat',scenario,seed:'release-'+scenario+'-'+seed,created:1});
 const actions={scenario,seed,providerChanges:0,lateProviderChanges:0,initiatives:0,competitiveActions:0};
 const competition=competitionMetrics();
 if(onboardingVersion)actions.onboarding={activeMonths:0,generated:0,activated:0,expired:0,cancelled:0,deposits:0,cost:0,budgetLimited:0,stockLimited:0};
 if(relationshipOffersVersion)actions.relationshipOffers={months:0,converted:0,principal:0,cost:0,budgetLimited:0}; if(regionalGrowthVersion)actions.regionalFlows={arrivals:{customers:0,deposits:0},departures:{customers:0,deposits:0},clippedDepartures:{customers:0,deposits:0}};
 if(advertisingVersion)Object.assign(actions,{advertisingSpend:0,assistedDeposits:0,assistedHouseholds:0,advertisingMonths:0,advertisingPaused:0});
 if(productProgramsVersion)Object.assign(actions,{plannedProductLaunches:{build:0,partner:0},plannedProductRetirements:0,vendorCost:0,targetedAudiences:0});
 if(customerOwnershipVersion)Object.assign(actions,{householdDepartures:0,householdDepositOutflow:0,retentionShares:{25:0,50:0,75:0,100:0}});
 if(creditPerformanceVersion)Object.assign(actions,{creditEntered:0,creditCured:0,creditRecovery:0,creditLoss:0,collectionsCost:0,collectionsPolicies:{workout:0,balanced:0,recovery:0},maxDelinquencyRatio:0});
 if(workforceVersion)Object.assign(actions,{stagedSpecialists:0,trainingSpend:0,trainingPaused:0,maxSpecialists:0,maxSkill:0,maxPremiumPayroll:0});
 for(let month=0;month<turnLimit&&!g.gameOver;month++){
  const plans=[E.chooseBot(g,0),E.chooseBot(g,1)],cycle=g.cycle;
  const owners=g.serviceAgreements.map(c=>c.owner);
  if(productProgramsVersion)for(const plan of plans){
   for(const key of E.planInitiatives(plan)){const d=E.PRODUCT_PROGRAM_PROJECTS[key];if(d)actions.plannedProductLaunches[d.route]++;}
   actions.plannedProductRetirements+=plan.productProgramPolicy.retire.length;
  }
  if(workforceVersion)actions.stagedSpecialists+=plans.reduce((n,p)=>n+E.specialistHireCount(p),0);
  actions.initiatives+=plans.reduce((n,p)=>n+E.planInitiatives(p).length,0);actions.competitiveActions+=plans.filter(p=>p.competitiveAction!=='none').length;
  if(tracker)tracker.begin(plans);
  E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);turns++;
  if(tracker)tracker.observe();
  if(regionalGrowthVersion){
   const flow=E.regionalGrowthReview(g);assert.equal(flow.lastCycle,cycle);
   for(const kind of Object.keys(actions.regionalFlows))for(const resource of ['customers','deposits'])actions.regionalFlows[kind][resource]+=flow.report.totals[kind][resource];
  }
  observeCompetition(competition,g.players.map(p=>p.stats.deposits),g.players.map(p=>E.capitalRatio(p)),g.players.map(p=>p.stats.lastProfit));
  const changes=g.serviceAgreements.filter((c,i)=>c.owner!==owners[i]).length;actions.providerChanges+=changes;if(month>=60)actions.lateProviderChanges+=changes;
  E.validatePilot(g);E.validateLedger(g);
  for(let i=0;i<2;i++){
   const p=g.players[i],a=p.accounting.accounts;E.AccountingPrototype.check(p.accounting);
   if(onboardingVersion){const r=p.onboarding.report;if(r.policy.share)actions.onboarding.activeMonths++;for(const k of ['generated','activated','expired','cancelled'])actions.onboarding[k]+=r.totals[k].count;actions.onboarding.deposits+=r.totals.activated.principal;actions.onboarding.cost+=r.cost;if(r.budgetLimited)actions.onboarding.budgetLimited++;if(r.stockLimited)actions.onboarding.stockLimited++;}
   if(relationshipOffersVersion){const r=p.relationshipOffers.report;if(r.converted)actions.relationshipOffers.months++;for(const k of ['converted','principal','cost'])actions.relationshipOffers[k]+=r[k];if(r.budgetLimited)actions.relationshipOffers.budgetLimited++;} if(advertisingVersion){const r=p.advertising.report;actions.advertisingSpend+=r.spent;actions.assistedDeposits+=r.assistedDeposits;actions.assistedHouseholds+=r.assistedHouseholds;if(r.spent)actions.advertisingMonths++;if(r.paused)actions.advertisingPaused++;}
   if(productProgramsVersion){
    actions.vendorCost+=p.operatingReport.productProgramCost;
    actions.targetedAudiences+=Object.values(p.productPrograms.markets).flatMap(row=>Object.values(row)).filter(mix=>mix.rewards||mix.highYield).length;
   }
   if(customerOwnershipVersion){actions.householdDepartures+=p.householdBook.report.departed;actions.householdDepositOutflow+=p.householdBook.report.depositOutflow;actions.retentionShares[p.householdBook.policy.retention]++}
   if(creditPerformanceVersion){const r=p.creditPerformance.report;actions.creditEntered+=r.entered;actions.creditCured+=r.cured;actions.creditRecovery+=r.recovered;actions.creditLoss+=r.loss;actions.collectionsCost+=r.cost;actions.collectionsPolicies[p.creditPerformance.policy.approach]++;actions.maxDelinquencyRatio=Math.max(actions.maxDelinquencyRatio,E.collectionsReview(p).late.reduce((n,x)=>n+x,0)/Math.max(1,p.stats.loans));}
   if(workforceVersion){
    const rows=Object.values(p.workforce.departments);
    actions.trainingSpend+=p.operatingReport.workforceTraining;
    actions.trainingPaused+=p.operatingReport.workforceTrainingPaused;
    actions.maxSpecialists=Math.max(actions.maxSpecialists,rows.reduce((n,r)=>n+r.count,0));
    actions.maxSkill=Math.max(actions.maxSkill,...rows.map(r=>r.skill));
    actions.maxPremiumPayroll=Math.max(actions.maxPremiumPayroll,p.operatingReport.specialistPayroll);
   }
   for(const key of ['cash','deposits','loans','capital','emergencyDebt'])assert.equal(p.stats[key],a[key==='capital'?'equity':key]);
   assert.equal(p.depositBook.cohorts.reduce((n,c)=>n+c.principal,0),a.deposits);
   assert.equal(p.creditBook.cohorts.reduce((n,c)=>n+c.principal,0),a.loans);
   assert.equal(Object.values(p.marketBook.markets).reduce((n,m)=>n+m.deposits,0),a.deposits);
   assert.equal(Object.values(p.marketReport.rows).reduce((n,r)=>n+r.contribution,0)+p.marketReport.central,p.marketReport.profit);
   for(const key of E.planInitiatives(plans[i]))if(!g.resolution.some(x=>x.startsWith(p.name+' began '+E.PROJECTS[key].name))){
    const notice=g.resolution.find(x=>x.startsWith(p.name+' cancelled '+E.PROJECTS[key].name+': cash changed before execution')&&x.endsWith('No project cost was charged; select it again in a later plan.'));
    if(notice){cancelled.push({scenario,seed,cycle,seat:i,key,notice});continue;}
    const failure={scenario,seed,cycle,seat:i,key,tier:E.capitalTier(p).key,resolution:[...g.resolution]};skipped.push(failure);console.error(JSON.stringify({skippedInitiative:failure}));
   }
  }
  for(const seat of creditPerformanceVersion?[0,1]:[0]){maxViewBytes=Math.max(maxViewBytes,Buffer.byteLength(JSON.stringify(E.publicState(g,seat))));assert(maxViewBytes<1048576,`Player view exceeds 1 MiB: ${scenario} seed ${seed}, resolved month ${cycle}, seat ${seat}, ${maxViewBytes} bytes`);}
 }
 const households=customerOwnershipVersion?g.players.map(p=>Object.values(p.householdBook.markets).reduce((n,row)=>n+Object.values(row).reduce((a,v)=>a+v,0),0)):null;
 results.push({scenario,seed,cycle:g.cycle,ended:g.gameOver,reason:g.endReason||null,winner:g.players.findIndex(p=>p.id===g.winnerId),equity:g.players.map(p=>p.stats.capital),deposits:g.players.map(p=>p.stats.deposits),profit:g.players.map(p=>p.stats.lastProfit),
  capitalRatioPercent:g.players.map(p=>E.capitalRatio(p)),capitalTier:g.players.map(p=>E.capitalTier(p).key),cash:g.players.map(p=>p.stats.cash),emergencyDebt:g.players.map(p=>p.stats.emergencyDebt),depositSharePercent:sharePercent(g.players.map(p=>p.stats.deposits)),
  ...(households?{households,householdSharePercent:sharePercent(households)}:{}),...(regionalGrowthVersion?{outsideSupply:E.regionalGrowthReview(g).report.totals.after}:{}),competition:reportedCompetition(competition)});
 activity.push(actions);
 if(tracker)attributionReports.push({scenario,seed,...tracker.report()});
}
assert.equal(hash(source),hash(fs.readFileSync(file,'utf8')));
const report={passed:skipped.length===0,sourceSha256:hash(source),...(onboardingVersion?{onboardingVersion}:{}),...(relationshipOffersVersion?{relationshipOffersVersion}:{}),...(regionalGrowthVersion?{regionalGrowthVersion}:{}),...(advertisingVersion?{advertisingVersion}:{}),...(productProgramsVersion?{productProgramsVersion}:{}),...(segmentDepositsVersion?{segmentDepositsVersion}:{}),...(creditPerformanceVersion?{creditPerformanceVersion}:{}),...(customerOwnershipVersion?{customerOwnershipVersion}:{}),...(workforceVersion?{workforceVersion}:{}),campaignRulesVersion:1,serviceExpansionVersion,managementVersion,customerDemandVersion,seedStart,seedCount,turnLimit,turns,maxViewBytes,
 metricDefinitions:{version:1,samples:'After each resolved month, including terminal settlement; final balances are also after settlement.',shares:'Percent of the two player banks combined, excluding outside institutions; zero total produces zero shares.',dominance:'Consecutive sampled months at or above 80% of combined-player deposits, counted separately per seat.',depositLeadChanges:'Changes between non-tied deposit leaders; intervening ties are ignored.',capitalReturnsTo10:'A below-10% capital spell followed by one sampled month at or above 10%; not necessarily sustained recovery.',households:'Exact owned household counts, available only with the household ownership preview.'},
 ...(scenarioName?{scenario:scenarioName}:{}),...(attribution?{attributionSelfTest,attribution:attributionReports}:{}),skippedInitiatives:skipped,cancelledInitiatives:cancelled,results,activity};
if(process.argv.includes('--report')){
 const dir=path.join(__dirname,'../reports/baselines');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'release-balance-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify(report,null,2));
assert.equal(skipped.length,0,'Every planned initiative must start or have an explicitly tested cancellation rule.');
