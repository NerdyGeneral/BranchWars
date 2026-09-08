'use strict';
// Read-only API timing on cloned states. No hardware-independent speed claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2),copy=x=>JSON.parse(JSON.stringify(x));
assert(args.length===2&&args[0]==='--baseline','Usage: node tools/pricing_performance.js --baseline ABSOLUTE_PRESERVED_HTML');
assert(path.isAbsolute(args[1]),'Choose an explicit preserved artifact');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function load(file){const bytes=fs.readFileSync(file),ctx={console};vm.runInNewContext(bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);return {file,sha256:sha(bytes),E:ctx.BWEngine};}
const engines={baseline:load(args[1]),candidate:load(path.join(root,'BRANCH_WARS.html'))};
assert.notEqual(engines.baseline.file,engines.candidate.file);
const common={campaignRulesVersion:1,serviceExpansionVersion:1,managementVersion:2,customerDemandVersion:2,workforceVersion:1,
 customerOwnershipVersion:1,creditPerformanceVersion:1,segmentDepositsVersion:1,advertisingVersion:1,regionalGrowthVersion:1,
 relationshipOffersVersion:1,onboardingVersion:1,mode:'hotseat',seed:'pricing-performance',created:1};
const observations=[],checks={exactLegacyCalls:0,pureCalls:0,pricedCalls:0};
const measure=fn=>{const t=performance.now(),result=fn();return {ms:performance.now()-t,result};};
function operation(E,method,g,seat,request){
 if(method==='chooseBot')return E.chooseBot(g,seat);
 if(method==='publicState')return E.publicState(g,seat);
 const me=E.publicState(g,seat).me;
 return method==='pricingComparison'?E.productPricingComparison(me,request,g.economy):E.operatingPreview(me,request,g.economy);
}
for(const priced of [false,true]){
 const origin=priced?engines.candidate:engines.baseline,E=origin.E,g=E.createGame({...common,productProgramsVersion:priced?2:1});
 for(let month=0;month<=12;month++){
  if(month===0||month===12)for(const seat of [0,1]){
   const request=E.chooseBot(copy(g),seat),methods=['chooseBot','publicState','operatingPreview',...(priced?['pricingComparison']:[])];
   for(const method of methods)for(let iteration=-1;iteration<7;iteration++){
    const pair={};for(const key of (iteration%2===0?['candidate','baseline']:['baseline','candidate'])){
     if(priced&&key==='baseline')continue;
     const state=copy(g),before=JSON.stringify(state),run=measure(()=>operation(engines[key].E,method,state,seat,request));
     if(method!=='chooseBot'){assert.equal(JSON.stringify(state),before,method+' mutated its input');checks.pureCalls++;}
     pair[key]={result:copy(run.result),state:copy(state)};
     if(iteration>=0)observations.push({priced,key,month,seat,method,ms:run.ms});
    }
    if(!priced){assert.deepEqual(pair.candidate,pair.baseline,'Legacy API/post-state changed');checks.exactLegacyCalls++;}
    else checks.pricedCalls++;
   }
  }
  if(month<12){const plans=g.players.map((p,i)=>E.chooseBot(g,i));E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);assert(!g.gameOver);}
 }
}
const grouped={};for(const r of observations){const key=[r.priced?'priced':'legacy',r.key,r.method].join('/');(grouped[key]??=[]).push(r.ms);}
const summaries=Object.fromEntries(Object.entries(grouped).map(([key,values])=>{const rows=values.sort((a,b)=>a-b);return [key,{count:rows.length,p50:rows[Math.floor(rows.length*.5)],p95:rows[Math.floor(rows.length*.95)],max:rows.at(-1)}];}));
for(const artifact of Object.values(engines))assert.equal(sha(fs.readFileSync(artifact.file)),artifact.sha256,'Measured artifact changed');
const report={passed:true,created:new Date().toISOString(),artifacts:Object.fromEntries(Object.entries(engines).map(([k,v])=>[k,{path:v.file,sha256:v.sha256}])),checks,summaries,
 method:{snapshots:[0,12],seats:2,warmupIterations:1,measuredIterations:7,order:'Alternating baseline/candidate on identical legacy states; new priced states measured separately'},
 limitations:'API-only wall-clock samples under possible concurrent load; not a causal speedup percentage, browser frame-time or hardware-independent latency guarantee. New pricing has no historical equivalent. No performance threshold or balance parameter was changed.'};
const target=path.join(root,'reports','local','pricing-performance-'+report.created.replace(/[:.]/g,'-')+'.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:target,...report},null,2));
