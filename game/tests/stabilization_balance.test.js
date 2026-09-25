'use strict';
// Bounded release diagnostic. Controllers stage existing orders; no economy,
// resources, underwriting or campaign options are patched to make them succeed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2),quick=args.includes('--quick');
const value=(key,fallback)=>args.includes(key)?Number(args[args.indexOf(key)+1]):fallback;
const shard=value('--shard',0),shards=value('--shards',1);
assert(Number.isInteger(shard)&&Number.isInteger(shards)&&shard>=0&&shard<shards&&shards<=8);
const bytes=fs.readFileSync(path.join(root,'BRANCH_WARS.html')),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const engine=bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx={console};
// Expose existing private planner helpers only in this diagnostic; their bodies
// and the shipped engine remain untouched. Final plans use normal E.submit.
vm.runInNewContext(engine.replace('root.BWEngine={','root.BWEngine={withCorporateForecast,planFinalCashReserve,capabilityRemaining,'),ctx);
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
const styles={
 cautious:{depositPolicy:'margin',lendingPolicy:'conservative',capitalPolicy:'liquid',credit:[100,0,0],lane:'operations',spend:.5},
 aggressive:{depositPolicy:'aggressive',lendingPolicy:'growth',capitalPolicy:'reinvest',credit:[0,50,50],lane:'acquisition',spend:1},
 service:{depositPolicy:'balanced',lendingPolicy:'conservative',capitalPolicy:'balanced',credit:[75,25,0],lane:'commercial',spend:1,service:true},
 commercial:{depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'balanced',credit:[25,75,0],lane:'commercial',spend:1},
 digital:{depositPolicy:'aggressive',lendingPolicy:'balanced',capitalPolicy:'balanced',credit:[25,0,75],lane:'digital',spend:1},
 expansion:{depositPolicy:'balanced',lendingPolicy:'growth',capitalPolicy:'reinvest',credit:[50,50,0],lane:'network',spend:1,expand:true}
};
const matchups=[['cautious','aggressive'],['service','commercial'],['digital','expansion'],['cautious','commercial'],['service','digital'],['aggressive','expansion'],['commercial','digital'],['cautious','cautious']];
const scenarios=['balanced','rate','regulatory','growth'],cases=[];
for(const [pair,controllers]of matchups.entries())for(const scenario of scenarios)
 for(const swap of [false,true])cases.push({pair,controllers:swap?[...controllers].reverse():controllers,scenario,seed:'stabilization:'+pair+':'+scenario,months:quick?2:120,swap,long:false});
if(!quick)for(const [i,scenario]of scenarios.entries())for(const swap of [false,true]){
 const controllers=matchups[i];cases.push({pair:i,controllers:swap?[...controllers].reverse():controllers,scenario,seed:'stabilization:long:'+scenario,months:480,swap,long:true});
}
const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:2}).options;
const report={passed:true,sourceSha256:sha(bytes),engineSha256:sha(engine),shard,shards,quick,started:new Date().toISOString(),styles,plannedCampaigns:cases.length,
 method:'64 fixed-seed 120-month campaigns: eight controller matchups, four economies, two unchanged-seat controller assignments; eight 480-month cases. Current Financial Group rules2. Healthy banks stage existing pricing, lending mix, research priorities, service reservations and affordable expansion. Existing AI recovery takes over below 10% capital, under supervision or covenant stress. No forced ending, catch-up or injected resources. Monthly normal validators; annual forecast/save checks and reversed submission checks. Same-controller pairs isolate repeatability separately from authored starting geography. Costs include ordinary recurring charges; this diagnostic does not isolate project payback or company loss attribution.',
 months:0,maxViewBytes:0,maxSaveBytes:0,runs:[],failures:[],timings:{plan:[],settle:[],view:[],save:[]}};
function prepare(g,seat,name,activity){
 const p=g.players[seat],plan=E.chooseBot(g,seat),style=styles[name],before=JSON.stringify(plan);
 if(E.capitalRatio(p)<10||E.tierRank(p)>=1||(p.fundingCovenant&&E.fundingPosition(p).excess>0)){activity.recoveryMonths++;return plan;}
 activity.strategyMonths++;
 for(const key of ['depositPolicy','lendingPolicy','capitalPolicy'])plan[key]=style[key];
 plan.groupPolicy.creditAllocation=Object.fromEntries(['mortgage','middleMarket','consumer'].map((key,i)=>[key,style.credit[i]]));
 const available=Math.min(E.CAPABILITY_CAP_PER_CYCLE,Math.floor(Object.values(plan.investments||{}).reduce((n,v)=>n+v,0)*style.spend),E.capabilityRemaining(p,style.lane));
 plan.investments=available>=1000?{[style.lane]:available}:{};
 if(style.service&&plan.servicePolicy)plan.servicePolicy.staff=plan.allocation.business;
 if(style.expand&&!plan.capitalAction){
  const candidate={...plan,newProjects:['branch'],newProject:'branch'},owner={...p,focus:plan.focus};
  if(!E.projectTargetIssue(g,p,E.PROJECTS.branch,plan.focus)&&E.projectPlanStatus(owner,candidate).eligible){plan.newProjects=candidate.newProjects;plan.newProject='branch';}
 }
 const result=E.withCorporateForecast(g,()=>E.planFinalCashReserve(g,seat,plan));
 if(JSON.stringify(result)!==before)activity.changedPlans++;
 activity.creditMixes[Object.values(result.groupPolicy.creditAllocation).join('/')]=(activity.creditMixes[Object.values(result.groupPolicy.creditAllocation).join('/')]||0)+1;
 activity.researchRequested+=Object.values(result.investments||{}).reduce((n,v)=>n+v,0);
 activity.serviceStaffMonths+=result.servicePolicy?.staff||0;
 activity.branchesRequested+=E.planInitiatives(result).filter(k=>E.PROJECTS[k]?.kind==='branch').length;
 return result;
}
function validate(g){
 E.validatePilot(g);E.validateLedger(g);E.validateCampaignRules(g,'game');
 for(const p of g.players){
  E.AccountingPrototype.check(p.accounting);
  for(const n of Object.values(p.stats))assert(Number.isFinite(n));
  const a=p.accounting.accounts;for(const k of ['cash','loans','deposits','emergencyDebt','capital'])assert.equal(p.stats[k],a[k==='capital'?'equity':k]);
  if(p.creditBook)assert.equal(p.creditBook.cohorts.reduce((n,c)=>n+c.principal,0),p.stats.loans);
  if(p.depositBook)assert.equal(p.depositBook.cohorts.reduce((n,c)=>n+c.principal,0),p.stats.deposits);
 }
}
for(const [index,spec]of cases.entries()){
 if(index%shards!==shard)continue;
 let g=E.createGame({...options,mode:'hotseat',created:1,seed:spec.seed,scenario:spec.scenario,name1:'Seat One Bank',name2:'Seat Two Bank'});
 const row={...spec,openingHash:sha(JSON.stringify(g)),resolved:0,earlyEnd:false,activity:spec.controllers.map(controller=>({controller,strategyMonths:0,recoveryMonths:0,changedPlans:0,researchRequested:0,serviceStaffMonths:0,branchesRequested:0,creditMixes:{}})),
  minimumCapital:[Infinity,Infinity],maximumShare:[50,50],lossMonths:[0,0],emergencyDebtPeak:[0,0],lowShareViableMonths:[0,0],lowShareActionMonths:[0,0],providerChanges:0,samples:[]};
 try{
  for(let month=0;month<spec.months&&!g.gameOver;month++){
   let tick=performance.now();const plans=spec.controllers.map((name,s)=>prepare(g,s,name,row.activity[s]));report.timings.plan.push(performance.now()-tick);
   if(month%12===0){
    const before=JSON.stringify(g);tick=performance.now();const resumed=E.migrateCampaign(copy(g));assert.equal(JSON.stringify(g),before);report.timings.save.push(performance.now()-tick);
    const reversed=copy(resumed);E.submit(resumed,0,copy(plans[0]));E.submit(resumed,1,copy(plans[1]));E.submit(reversed,1,copy(plans[1]));E.submit(reversed,0,copy(plans[0]));
    assert.deepEqual(copy(resumed),copy(reversed),'Submission order changed outcome');
    for(const s of [0,1]){const v=E.publicState(g,s);E.operatingPreview(v.me,plans[s],g.economy);}
    assert.equal(JSON.stringify(g),before,'Forecast mutated campaign');
   }
   const owners=g.serviceAgreements.map(c=>c.owner);tick=performance.now();E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);report.timings.settle.push(performance.now()-tick);row.resolved++;report.months++;validate(g);
   row.providerChanges+=g.serviceAgreements.filter((c,i)=>c.owner!==owners[i]).length;
   const total=g.players.reduce((n,p)=>n+p.stats.deposits,0);
   for(const [s,p]of g.players.entries()){
    const share=total?p.stats.deposits/total*100:0,ratio=E.capitalRatio(p);row.minimumCapital[s]=Math.min(row.minimumCapital[s],ratio);row.maximumShare[s]=Math.max(row.maximumShare[s],share);row.lossMonths[s]+=p.stats.lastProfit<0?1:0;row.emergencyDebtPeak[s]=Math.max(row.emergencyDebtPeak[s],p.stats.emergencyDebt);
    if(share<40&&ratio>=8){row.lowShareViableMonths[s]++;if(E.planInitiatives(plans[s]).length||plans[s].competitiveAction!=='none'||plans[s].contractBid)row.lowShareActionMonths[s]++;}
    tick=performance.now();const v=E.publicState(g,s);report.maxViewBytes=Math.max(report.maxViewBytes,Buffer.byteLength(JSON.stringify(v)));report.timings.view.push(performance.now()-tick);
    assert(report.maxViewBytes<1048576,'Owner view exceeds transport budget');
    assert.equal(v.rival.corporate,undefined,'Private corporate records leaked');
   }
   if(month%12===11||month===spec.months-1){const save=JSON.stringify(g);report.maxSaveBytes=Math.max(report.maxSaveBytes,Buffer.byteLength(save));row.samples.push({month:row.resolved,banks:g.players.map(p=>({equity:p.stats.capital,profit:p.stats.lastProfit,deposits:p.stats.deposits,customers:p.stats.customers,capitalRatio:E.capitalRatio(p),cash:p.stats.cash,staff:p.stats.staff,capability:copy(p.capability),branches:copy(p.branches)}))});}
  }
  row.earlyEnd=!!g.gameOver&&row.resolved<spec.months;row.endReason=g.endReason||null;
  row.final=g.players.map(p=>({equity:p.stats.capital,deposits:p.stats.deposits,profit:p.stats.lastProfit,capitalRatio:E.capitalRatio(p),emergencyDebt:p.stats.emergencyDebt,staff:p.stats.staff}));
 }catch(error){report.failures.push({index,...spec,cycle:g.cycle,error:error.stack});report.passed=false;}
 report.runs.push(row);console.log('Stabilization '+index+' '+spec.controllers.join('/')+' '+spec.scenario+' '+row.resolved+'/'+spec.months+(row.endReason?' '+row.endReason:'')+(report.failures.some(f=>f.index===index)?' FAILED':''));
}
assert.equal(sha(fs.readFileSync(path.join(root,'BRANCH_WARS.html'))),report.sourceSha256,'Runtime changed during audit');
report.finished=new Date().toISOString();
for(const [key,values]of Object.entries(report.timings)){const n=values.sort((a,b)=>a-b);report.timings[key]={count:n.length,p50:n[Math.floor(n.length*.5)]||0,p95:n[Math.floor(n.length*.95)]||0,max:n.at(-1)||0};}
if(args.includes('--report')){const dir=path.join(root,'reports/baselines');fs.mkdirSync(dir,{recursive:true});report.reportPath=path.join(dir,'stabilization-balance-'+Date.now()+'-shard'+shard+'.json');fs.writeFileSync(report.reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
console.log(JSON.stringify({passed:report.passed,runs:report.runs.length,months:report.months,failures:report.failures,reportPath:report.reportPath,maxViewBytes:report.maxViewBytes,timings:report.timings}));
assert(report.passed,'Stabilization balance found a failed invariant or invalid controller order');
