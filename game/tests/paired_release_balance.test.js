'use strict';
// Scripted controller/seat crossover diagnostic, not a fairness or fun target.
// resolutionLogNonstarts counts absent saved-resolution strings only. The UI
// can derive owner-only non-start feedback without changing those saved strings.
// Starting geography, identities, balances and RNG are never mirrored/edited.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),args=process.argv.slice(2),allowed=new Set(['--source','--quick','--report']);
assert(args.every(x=>allowed.has(x)),'Usage: node tests/paired_release_balance.test.js [--source] [--quick] [--report]');
assert(!(args.includes('--source')&&args.includes('--report')),'Release reports require the identified portable, not a source assembly.');
const portable=path.join(root,'BRANCH_WARS.html'),bytes=args.includes('--source')?require('../tools/build_game.js').assemble().html:fs.readFileSync(portable),sha=x=>crypto.createHash('sha256').update(x).digest('hex'),artifactHash=sha(bytes);
const ctx={console};vm.runInNewContext(String(bytes).match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);const E=ctx.BWEngine;
const copy=x=>JSON.parse(JSON.stringify(x)),now=()=>process.hrtime.bigint(),ms=start=>Number(now()-start)/1e6;
const profiles={default:{},cumulative:{campaignRulesVersion:1,serviceExpansionVersion:1,managementVersion:2,customerDemandVersion:2,workforceVersion:1,customerOwnershipVersion:1,creditPerformanceVersion:1,segmentDepositsVersion:1,productProgramsVersion:1,advertisingVersion:1,regionalGrowthVersion:1,relationshipOffersVersion:1,onboardingVersion:1}};
const styles={margin:{depositPolicy:'margin',lendingPolicy:'conservative',capitalPolicy:'balanced'},growth:{depositPolicy:'aggressive',lendingPolicy:'growth',capitalPolicy:'reinvest'}};
assert.notDeepEqual(styles.margin,styles.growth,'Controllers must request materially different existing policies.');
const scenarios=args.includes('--quick')?['balanced']:['balanced','rate','regulatory','growth'],seeds=args.includes('--quick')?[0]:[0,1],cases=[];
for(const profile of Object.keys(profiles))for(const scenario of scenarios)for(const seed of seeds)cases.push({profile,scenario,seed,limit:args.includes('--quick')?6:24,group:'scenario-matrix'});
if(!args.includes('--quick'))for(const profile of Object.keys(profiles))for(const scenario of ['balanced','regulatory'])cases.push({profile,scenario,seed:20,limit:120,group:'long-campaign'});
const started=new Date().toISOString(),timer=now(),results=[],pairs=[],failures=[],cancellations=[],resolutionLogNonstarts=[];
const timings={planning:[],settlement:[],validation:[],view:[],quote:[]};let resolvedMonths=0,maxViewBytes=0;
function distribution(values){const n=[...values].sort((a,b)=>a-b);return {count:n.length,p50:n[Math.floor((n.length-1)*.5)]||0,p95:n[Math.floor((n.length-1)*.95)]||0,max:n.at(-1)||0};}
function fractions(g){const total=g.players.reduce((n,p)=>n+p.stats.deposits,0);return g.players.map(p=>total?p.stats.deposits/total*100:0);}
function verifyState(g){
 E.validatePilot(g);E.validateLedger(g);E.validateCampaignRules(g,'game');
 for(const p of g.players){
  for(const [key,n]of Object.entries(p.stats))assert(Number.isFinite(n),'Non-finite '+key);
  if(p.accounting){const a=p.accounting.accounts;E.AccountingPrototype.check(p.accounting);for(const key of ['cash','loans','deposits','emergencyDebt','capital'])assert.equal(p.stats[key],a[key==='capital'?'equity':key]);}
  if(p.marketBook)for(const resource of ['deposits','loans','customers','business','merchant','wealth'])assert.equal(Object.values(p.marketBook.markets).reduce((n,m)=>n+m[resource],0),p.stats[resource],'Owned local '+resource+' reconciliation');
  if(p.depositBook)assert.equal(p.depositBook.cohorts.reduce((n,c)=>n+c.principal,0),p.stats.deposits);
  if(p.creditBook)assert.equal(p.creditBook.cohorts.reduce((n,c)=>n+c.principal,0),p.stats.loans);
  if(p.householdBook)assert.equal(Object.values(p.householdBook.markets).reduce((n,m)=>n+Object.values(m).reduce((a,b)=>a+b,0),0),p.stats.customers);
  if(p.marketReport)assert.equal(Object.values(p.marketReport.rows).reduce((n,r)=>n+r.contribution,0)+p.marketReport.central,p.marketReport.profit);
 }
}
for(const spec of cases){
 const crossover=[];let startingHash=null;
 for(const controllers of [['margin','growth'],['growth','margin']]){
  const g=E.createGame({...profiles[spec.profile],mode:'hotseat',scenario:spec.scenario,seed:'paired-'+spec.scenario+'-'+spec.seed,created:1,name1:'Seat One Bank',name2:'Seat Two Bank'});
  const opening=sha(JSON.stringify(g));if(startingHash===null)startingHash=opening;else assert.equal(opening,startingHash,'Controller swap must preserve the exact authored starting world.');
  const activity=controllers.map(controller=>({controller,requestedPolicyMonths:0,stressPlannerMonths:0,changedFromPlannerMonths:0,normalizedPolicyChanges:0,settledPolicyChanges:0,stressReasons:{supervision:0,loss:0,covenant:0},initiatives:0,competitiveActions:0,hiresRequested:0,researchRequested:0,researchNotExecuted:0,advertisingSpend:0,onboardingActivated:0}));
  const minimumCapital=[Infinity,Infinity],maximumShare=[0,0],lossMonths=[0,0];let count=0,lastLeader=null,leadChanges=0,failed=false;
  try{
   verifyState(g);
   for(;count<spec.limit&&!g.gameOver;count++){
    const cycle=g.cycle;let tick=now();
    const plans=g.players.map((p,seat)=>{
     const baseline=E.chooseBot(g,seat),plan=copy(baseline),a=activity[seat];
     const stress={supervision:E.tierRank(p)>=1,loss:p.stats.lastProfit<0,covenant:!!p.fundingCovenant&&E.fundingPosition(p).excess>0};
     if(Object.values(stress).some(Boolean)){a.stressPlannerMonths++;for(const [key,active]of Object.entries(stress))if(active)a.stressReasons[key]++;}
     else{Object.assign(plan,styles[controllers[seat]]);a.requestedPolicyMonths++;if(Object.keys(styles.margin).some(key=>plan[key]!==baseline[key]))a.changedFromPlannerMonths++;}
     a.initiatives+=E.planInitiatives(plan).length;a.competitiveActions+=plan.competitiveAction!=='none'?1:0;a.hiresRequested+=E.planHires(plan);a.researchRequested+=Object.values(plan.investments||{}).reduce((n,v)=>n+v,0);
     return plan;
    });timings.planning.push(ms(tick));
    const requested=plans.map(p=>Object.fromEntries(Object.keys(styles.margin).map(k=>[k,p[k]]))),capability=g.players.map(p=>copy(p.capability));
    if(count%6===0&&E.decisionQuote){
     const before=JSON.stringify(g);tick=now();for(const seat of [0,1]){const owner=E.publicState(g,seat).me,original=JSON.stringify(owner);E.decisionQuote(owner,g.event,plans[seat].decision);assert.equal(JSON.stringify(owner),original);}
     timings.quote.push(ms(tick));assert.equal(JSON.stringify(g),before,'Advisory quote changes no world, RNG or owner state.');
    }
    // Both submissions use the public validator/normalizer; no planner-only
    // acceptance path. Order is constant so the crossover isolates assignment.
    tick=now();E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);timings.settlement.push(ms(tick));resolvedMonths++;
    for(const seat of [0,1]){
     const p=g.players[seat],a=activity[seat],last=g.lastPlans[p.id];
     if(Object.keys(styles.margin).some(key=>last[key]!==requested[seat][key]))a.normalizedPolicyChanges++;
     if(p.policies.deposit!==last.depositPolicy||p.policies.lending!==last.lendingPolicy||p.policies.capital!==last.capitalPolicy)a.settledPolicyChanges++;
     assert.equal(a.normalizedPolicyChanges,0,'Shared normalizer unexpectedly changed controller policies');assert.equal(a.settledPolicyChanges,0,'Actual settlement ignored accepted policies');
     for(const key of E.planInitiatives(last))if(!g.resolution.some(line=>line.startsWith(p.name+' began '+E.PROJECTS[key].name))){
      const notice=g.resolution.find(line=>line.startsWith(p.name+' cancelled '+E.PROJECTS[key].name+':'));
      (notice?cancellations:resolutionLogNonstarts).push({...spec,controllers,cycle,seat,controller:a.controller,kind:'project',key,...(notice?{notice}:{})});
     }
     if(E.planHires(last)&&!g.resolution.some(line=>line.startsWith(p.name+' hired '))){const notice=g.resolution.find(line=>line.startsWith(p.name+' cancelled hiring:'));(notice?cancellations:resolutionLogNonstarts).push({...spec,controllers,cycle,seat,controller:a.controller,kind:'hiring',count:E.planHires(last),...(notice?{notice}:{})});}
     for(const [key,amount]of Object.entries(last.investments||{}))a.researchNotExecuted+=Math.max(0,amount-(p.capability[key]-capability[seat][key]));
     if(p.advertising)a.advertisingSpend+=p.advertising.report.spent;if(p.onboarding)a.onboardingActivated+=p.onboarding.report.totals.activated.count;
    }
    tick=now();verifyState(g);timings.validation.push(ms(tick));
    const shares=fractions(g),leader=shares[0]===shares[1]?null:shares[0]>shares[1]?0:1;
    if(leader!==null){if(lastLeader!==null&&lastLeader!==leader)leadChanges++;lastLeader=leader;}
    for(const seat of [0,1]){
     minimumCapital[seat]=Math.min(minimumCapital[seat],E.capitalRatio(g.players[seat]));maximumShare[seat]=Math.max(maximumShare[seat],shares[seat]);if(g.players[seat].stats.lastProfit<0)lossMonths[seat]++;
     tick=now();const size=Buffer.byteLength(JSON.stringify(E.publicState(g,seat)));timings.view.push(ms(tick));maxViewBytes=Math.max(maxViewBytes,size);assert(size<1048576,'Owner view exceeds1 MiB');
    }
   }
  }catch(error){failed=true;failures.push({...spec,controllers,cycle:g.cycle,message:error.message});}
  const shares=fractions(g),row={...spec,controllers,startingWorldSha256:opening,resolvedMonths:count,failed,ended:g.gameOver,earlyEnd:!!g.gameOver&&count<spec.limit,endReason:g.endReason||null,winnerSeat:g.players.findIndex(p=>p.id===g.winnerId),
   minimumCapitalPercent:minimumCapital.map(n=>Number.isFinite(n)?n:null),maximumDepositSharePercent:maximumShare,lossMonths,depositLeadChanges:leadChanges,
   final:g.players.map((p,seat)=>({seat,controller:controllers[seat],deposits:p.stats.deposits,depositSharePercent:shares[seat],equity:p.stats.capital,capitalRatioPercent:E.capitalRatio(p),profit:p.stats.lastProfit,staff:p.stats.staff,emergencyDebt:p.stats.emergencyDebt})),activity};
  results.push(row);crossover.push(row);console.log('Paired '+spec.profile+' '+spec.scenario+' seed'+spec.seed+' '+controllers.join('/')+' '+count+'/'+spec.limit+(g.gameOver?' ended: '+g.endReason:'')+(failed?' FAILED':''));
 }
 pairs.push({...spec,startingWorldSha256:startingHash,controllers:Object.keys(styles).map(controller=>{const observations=crossover.map(run=>run.final.find(row=>row.controller===controller));return {controller,observations,averageFinalDepositSharePercent:observations.reduce((n,r)=>n+r.depositSharePercent,0)/observations.length,seatOneMinusSeatTwoSharePoints:observations.find(r=>r.seat===0).depositSharePercent-observations.find(r=>r.seat===1).depositSharePercent};})});
}
if(!args.includes('--source'))assert.equal(sha(fs.readFileSync(portable)),artifactHash,'Portable changed during paired diagnostic.');
assert(results.every(run=>run.activity.every(a=>a.requestedPolicyMonths>0&&a.changedFromPlannerMonths>0)),'Each controller must actually apply a distinct policy at least once in each run.');
const report={passed:failures.length===0,started,finished:new Date().toISOString(),artifact:args.includes('--source')?'source-assembly':'portable',sourceSha256:artifactHash,quick:args.includes('--quick'),
 profiles,styles,method:'Normal AI proposals plus existing healthy-bank policy requests. Controller assignments genuinely swap across unchanged authored seats; submission order remains 0 then 1. Under supervision, last-month loss or excess funding covenant debt, the normal AI proposal is preserved and counted. No resources, starting books, markets, RNG or opponent information are manufactured.',
 limitations:['Scripted economic styles are not complete competitive human strategies or a skill-matched tournament.','Deposit shares exclude outside institutions; averages do not establish fairness, comeback quality or a dominance target.','Starting positions and seat-specific AI behavior remain authored; paired results measure both controller and position interactions, not a causal effect isolated from all other systems.','Policy overrides follow the AI cash planner; later economic effects can legitimately cancel commitments. Reported cancellations and research not executed require interpretation, not automatic balance tuning.','Long runs use one fixed seed per scenario/profile; separate modular480-month stress gates provide additional coverage.','Default legacy campaigns do not have finite outside books; resource conservation checks apply to enabled owned/accounting books.','Performance includes validation/instrumentation overhead and concurrent machine load, not interactive frame rate.'],
 runs:results.length,pairs: pairs.length,resolvedMonths,maxViewBytes,elapsedMs:ms(timer),timings:Object.fromEntries(Object.entries(timings).map(([key,n])=>[key,distribution(n)])),failures,cancellations,resolutionLogNonstarts,results,pairedResults:pairs};
if(args.includes('--report')){const dir=path.join(root,'reports/baselines');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,'paired-release-balance-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log('Report: '+file);}
console.log(JSON.stringify({passed:report.passed,runs:report.runs,pairs:report.pairs,resolvedMonths,maxViewBytes,earlyEnds:results.filter(r=>r.earlyEnd).length,cancellations:cancellations.length,resolutionLogNonstarts:resolutionLogNonstarts.length,failures,sourceSha256:artifactHash,timings:report.timings},null,2));
assert.equal(failures.length,0,'Paired controller diagnostics found invalid plans, states or unbounded owner views.');
