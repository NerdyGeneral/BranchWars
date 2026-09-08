'use strict';
// Bounded scenario lab for the priced ruleset. Financial distress/dominance are
// observations, not excuses to alter approved economics or guarantee survival.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),file=path.join(root,'BRANCH_WARS.html'),bytes=fs.readFileSync(file),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const artifactSha256=hash(bytes),ctx={console};
vm.runInNewContext(bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
const base={campaignRulesVersion:1,serviceExpansionVersion:1,managementVersion:2,customerDemandVersion:2,
 workforceVersion:1,customerOwnershipVersion:1,creditPerformanceVersion:1,segmentDepositsVersion:1,productProgramsVersion:2,
 mode:'hotseat',created:1,name1:'Cedar Lab',name2:'Harbor Lab'};
const profiles=[
 {name:'products',flags:{}},
 {name:'advertising',flags:{advertisingVersion:1}},
 {name:'growth',flags:{advertisingVersion:1,regionalGrowthVersion:1}},
 {name:'offers',flags:{advertisingVersion:1,regionalGrowthVersion:1,relationshipOffersVersion:1}},
 {name:'onboarding',flags:{advertisingVersion:1,regionalGrowthVersion:1,relationshipOffersVersion:1,onboardingVersion:1}}
];
for(const advertisingVersion of [0,1])for(const regionalGrowthVersion of [0,1])
 profiles.push({name:'modular-'+advertisingVersion+regionalGrowthVersion,flags:{featureRulesVersion:1,advertisingVersion,regionalGrowthVersion}});
const args=process.argv.slice(2),modes=['--quick','--matrix','--long','--stress','--cycling'];
assert(args.length===1&&modes.includes(args[0]),'Use one of '+modes.join(', '));
const cases=[];
function add(profile,scenario,seed,seat,limit,controller){cases.push({profile:profile.name,flags:profile.flags,scenario,seed,seat,limit,controller});}
if(args[0]==='--quick')for(const profile of profiles)add(profile,'balanced',0,0,6,'pressure');
if(args[0]==='--matrix')for(const profile of profiles)for(const scenario of ['balanced','rate','regulatory','growth'])
 for(const seed of [0,1])for(const seat of [0,1])add(profile,scenario,seed,seat,24,'pressure');
if(args[0]==='--long')for(const profile of profiles)for(const seat of [0,1])add(profile,'balanced',0,seat,120,'pressure');
if(args[0]==='--stress')for(const name of ['modular-01','modular-11','onboarding'])for(const seat of [0,1])
 add(profiles.find(p=>p.name===name),'regulatory',20,seat,480,'pressure');
if(args[0]==='--cycling')for(const profile of [profiles[0],profiles[4]])for(const seat of [0,1])for(const controller of ['pressure','cycling','ai'])
 add(profile,'balanced',0,seat,24,controller);
const timing={planning:[],settlement:[],validation:[],view:[],comparison:[]},results=[],failures=[];
let resolvedMonths=0,maxViewBytes=0,maxDepositCohorts=0,maxCreditCohorts=0;
function measure(kind,fn){const start=performance.now();try{return fn()}finally{timing[kind].push(performance.now()-start);}}
for(const [index,test]of cases.entries()){
 const g=E.createGame({...base,...test.flags,scenario:test.scenario,seed:test.seed});
 const interest=[0,0],profits=[0,0],competitive=[0,0];let months=0,peakShare=.5,minCapital=Infinity;
 try{
  E.validatePilot(g);
  for(;months<test.limit&&!g.gameOver;months++){
   const plans=measure('planning',()=>g.players.map((p,i)=>E.chooseBot(g,i)));
   if(test.controller!=='ai'){
    const p=g.players[test.seat],plan=plans[test.seat],bp=test.controller==='cycling'&&months%2?-25:25;
    plan.productProgramPolicy.pricingBp.essential=bp;
    if(p.productDeployment.ready.rewards&&!plan.productProgramPolicy.retire.includes('rewards'))plan.productProgramPolicy.pricingBp.rewards=bp;
   }
   if(months===0||months===23||months===119||months===479){
    const before=JSON.stringify(g);
    const view=E.publicState(g,test.seat);
    measure('comparison',()=>E.productPricingComparison(view.me,plans[test.seat],g.economy));
    assert.equal(JSON.stringify(g),before,'Price comparison changed simulation or RNG.');
   }
   measure('settlement',()=>{E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);});
   measure('validation',()=>{E.validatePilot(g);E.validateLedger(g);E.validateCampaignRules(g,'game');});
   for(const [i,p]of g.players.entries()){
    interest[i]+=p.operatingReport.depositInterest;profits[i]+=p.operatingReport.profit;
    competitive[i]+=Object.values(p.productPrograms.review.flows.rivalTransfers).reduce((n,x)=>n+x,0);
    maxDepositCohorts=Math.max(maxDepositCohorts,p.depositBook.cohorts.length);
    maxCreditCohorts=Math.max(maxCreditCohorts,p.creditBook.cohorts.length);
    minCapital=Math.min(minCapital,E.capitalRatio(p));
    const view=measure('view',()=>E.publicState(g,i));E.validateProductPricingView(view);
    maxViewBytes=Math.max(maxViewBytes,Buffer.byteLength(JSON.stringify(view)));
    assert(!view.rival.productPrograms,'Rival private product book crossed the view boundary.');
   }
   const total=g.players.reduce((n,p)=>n+p.stats.deposits,0);
   peakShare=Math.max(peakShare,...g.players.map(p=>p.stats.deposits/Math.max(1,total)));
   assert(maxViewBytes<=1024*1024,'View exceeded 1 MiB.');
   assert(maxDepositCohorts<=5000&&maxCreditCohorts<=10000,'Cohort bounds exceeded.');
   if(months===3){const resumed=E.migrateCampaign(copy(g));assert.deepEqual(copy(E.migrateCampaign(resumed)),copy(resumed));}
   resolvedMonths++;
  }
  results.push({...test,flags:undefined,months,earlyEnd:months<test.limit,endReason:g.endReason||null,
   interest,profits,competitive,peakShare,minCapital,ending:g.players.map(p=>({deposits:p.stats.deposits,cash:p.stats.cash,equity:p.stats.capital,profit:p.stats.lastProfit,pricing:p.productPrograms.pricingBp}))});
 }catch(error){failures.push({...test,flags:undefined,month:g.cycle,error:error.stack});}
 if(index%8===0||index===cases.length-1)console.log('Pricing lab '+args[0]+': '+(index+1)+'/'+cases.length+' cases, '+resolvedMonths+' months, '+failures.length+' failures.');
 if(failures.length)break;
}
const quantiles=values=>{const sorted=values.slice().sort((a,b)=>a-b);return {count:sorted.length,p50:sorted[Math.floor(sorted.length*.5)]||0,p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]||0,max:sorted.at(-1)||0};};
const report={passed:!failures.length&&results.length===cases.length,artifactSha256,mode:args[0],requestedCases:cases.length,resolvedMonths,
 maxViewBytes,maxDepositCohorts,maxCreditCohorts,earlyEnds:results.filter(r=>r.earlyEnd).length,
 timing:Object.fromEntries(Object.entries(timing).map(([k,v])=>[k,quantiles(v)])),results,failures,
 limitations:'Synthetic controller lab, not human enjoyment or physical multiplayer acceptance. Pressure/cycling controllers override only permitted prices; all other plans use the ordinary constrained AI. No balance tuning.',
 portableChanged:hash(fs.readFileSync(file))!==artifactSha256};
const out=path.join(root,'reports','pricing-lab-'+args[0].slice(2)+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:out,...report,results:undefined,failures:failures.map(f=>({profile:f.profile,month:f.month,error:f.error}))},null,2));
if(!report.passed||report.portableChanged)process.exitCode=1;
