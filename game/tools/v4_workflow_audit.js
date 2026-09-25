'use strict';
// Isolated diagnostic runtimes only. No instrumentation enters the portable game.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>createHash('sha256').update(x).digest('hex');
const name=process.argv[2];
if(!/^v4-workflow-[a-z0-9-]+$/.test(name||''))throw Error('Use a unique v4-workflow-name report directory under output.');
const folder=path.join(root,'output',name);if(fs.existsSync(folder))throw Error('Preserve existing audit output; choose another name.');
fs.mkdirSync(folder);
const current=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'),prior=fs.readFileSync(path.join(root,'../releases/v4/BRANCH_WARS.html'),'utf8');
assert.equal(hash(prior),'ac5753947ebbc9106c4fff5df2c0fcd893476826b52c202c477bade61e288f92','Frozen rc2 reference must not drift');
const engine=html=>html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const stages=['planBankRecovery','planFinalCashReserve','planExecutionReserve','planFacilityInvestment','planCommercialAccounts','planCompanyCredit','planDepartmentFunctions'];
const quotes=['projectPlanStatus','lifecycleInstructionQuote','departmentFunctionsQuote','facilityInstructionQuote','serviceBidStatus'];
function load(html,instrument=false){
 const c={performance,trace:{stages:{},rejections:{},recovery:{calls:0,stressed:0,minHeadroom:null,maxHeadroom:null}}},code=engine(html);
 let wrapped='';
 if(instrument)wrapped='const actionVector=plan=>plan?{projects:planInitiatives(plan).length,hires:planHires(plan),research:Object.values(plan.investments||{}).reduce((a,b)=>a+b,0),advertising:plan.advertisingPolicy?.budget||0,bid:plan.contractBid?1:0,competition:plan.competitiveAction&&plan.competitiveAction!=="none"?1:0}:{};'+
 stages.map(n=>'{const original='+n+';'+n+'=function(...args){const before=actionVector(args[2]),result=original.apply(this,args),after=actionVector(result),row=trace.stages['+JSON.stringify(n)+']||(trace.stages['+JSON.stringify(n)+']={calls:0,reduced:{},added:{}});row.calls++;for(const key of Object.keys(before)){if(after[key]<before[key])row.reduced[key]=(row.reduced[key]||0)+1;if(after[key]>before[key])row.added[key]=(row.added[key]||0)+1}return result;};}').join('\n')+
 quotes.map(n=>'{const original='+n+';'+n+'=function(...args){const result=original.apply(this,args),status=result?.status||result;if(status?.eligible===false){const key='+JSON.stringify(n+' :: ')+'+(status.reason||status.code||"not eligible");trace.rejections[key]=(trace.rejections[key]||0)+1;}return result;};}').join('\n');
 if(instrument)wrapped+='{const original=bankRecoveryReview;bankRecoveryReview=function(...args){const result=original.apply(this,args),row=trace.recovery;row.calls++;if(result.stressed)row.stressed++;if(Number.isFinite(result.headroom)){row.minHeadroom=row.minHeadroom===null?result.headroom:Math.min(row.minHeadroom,result.headroom);row.maxHeadroom=row.maxHeadroom===null?result.headroom:Math.max(row.maxHeadroom,result.headroom);}return result;};}';
 vm.runInNewContext(code.replace('root.BWEngine={',wrapped+'\nroot.BWEngine={validatePlan,validatePortfolioPlan,'),c);return c;
}
const a=load(prior).BWEngine,b=load(current).BWEngine,report={portableSha256:hash(current),engineSha256:hash(engine(current)),priorPortableSha256:hash(prior),scope:'Exact legacy world/plan/RNG comparisons; per-invocation cache timing; candidate rejection and action-removal diagnostics. Counts include nested exploratory calls, not unique final decisions. No altered reserves or action floor.',replay:[],performance:[],running:true};
const save=()=>fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');
save();
try{
 for(const edition of ['core','expanded'])for(const seed of [1,2]){
  const opts={...b.previewCampaignEdition({},edition,{currentEconomics:true}).options,mode:'hotseat',seed:'workflow-'+seed,created:1};
  const x=a.createGame(opts),y=b.createGame(opts);assert.deepEqual(copy(x),copy(y));
  for(let month=0;month<3;month++){
   const xp=x.players.map((_,i)=>a.chooseBot(x,i)),yp=y.players.map((_,i)=>b.chooseBot(y,i));
   assert.deepEqual(copy(yp),copy(xp));for(const i of [0,1]){a.submit(x,i,xp[i]);b.submit(y,i,yp[i]);}assert.deepEqual(copy(y),copy(x));a.validatePilot(x);a.validateLedger(x);b.validatePilot(y);b.validateLedger(y);
  }
  report.replay.push({edition,seed,months:3,exact:true});save();
 }
 const early=b.createGame({...b.previewCampaignEdition({},'expanded',{currentEconomics:true}).options,startingWorkforce:'covered',mode:'hotseat',seed:'workflow-timing',created:1});
 const maturePath=path.join(root,'output/pricing-snapshot-121-ea2b0e91.json.gz');
 const snapshots=[{label:'opening-covered-human-policy',state:early},...(fs.existsSync(maturePath)?[{label:'preserved-month-121',state:JSON.parse(zlib.gunzipSync(fs.readFileSync(maturePath))),snapshotSha256:hash(fs.readFileSync(maturePath))}]:[])];
 for(const sample of snapshots){
  const timings={prior:[],current:[]};let expected;
  for(let repeat=0;repeat<3;repeat++)for(const [label,E] of [['prior',a],['current',b]]){
   const g=copy(sample.state),t=performance.now(),plans=g.players.map((_,i)=>E.chooseBot(g,i));timings[label].push(performance.now()-t);
   for(const i of [0,1]){E.validatePortfolioPlan(g.players[i],plans[i],g);E.validatePlan(g,g.players[i],plans[i]);}
   const outcome=JSON.stringify({g,plans});if(expected===undefined)expected=outcome;else assert.equal(outcome,expected,'Same plans and RNG at '+sample.label);
  }
  const traced=load(current,true),g=copy(sample.state),plans=g.players.map((_,i)=>traced.BWEngine.chooseBot(g,i));
  assert.equal(JSON.stringify({g,plans}),expected,'Instrumentation changed behavior');
  report.performance.push({label:sample.label,cycle:sample.state.cycle,snapshotSha256:sample.snapshotSha256||hash(JSON.stringify(sample.state)),timingsMs:timings,medianMs:Object.fromEntries(Object.entries(timings).map(([k,v])=>[k,[...v].sort((a,b)=>a-b)[1]])),trace:traced.trace,exact:true});
  save();
 }
 report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;process.exitCode=1;}
report.running=false;save();console.log(JSON.stringify({folder,passed:report.passed,failure:report.failure,replay:report.replay,performance:report.performance.map(x=>({label:x.label,medianMs:x.medianMs,trace:x.trace}))},null,2));
