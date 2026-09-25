'use strict';
// Read-only counterfactual diagnosis on an actual preserved campaign. Internal
// exports are instrumentation only; no candidate is submitted or installed.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),zlib=require('node:zlib');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const root=path.resolve(__dirname,'..'),arg=k=>process.argv.find(x=>x.startsWith('--'+k+'='))?.slice(k.length+3);
const html=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'),source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx={console};
vm.runInNewContext(source.replace('root.BWEngine={','root.BWEngine={withCorporateForecast,planDepartmentFunctionsCore,departmentOriginationFloorAcceptance,planFinalCashReserve,planFacilityLifecycle,'),ctx);
const E=ctx.BWEngine,file=path.resolve(arg('checkpoint')),bytes=fs.readFileSync(file),report=JSON.parse(file.endsWith('.gz')?zlib.gunzipSync(bytes):bytes);
const original=report.game||report.finalCheckpoints[0].game;E.validatePilot(original);
const identity={engineSha256:hash(source),checkpointSha256:hash(bytes),cycle:original.cycle,instrumented:true};
const gross=r=>Math.round(r.loanGrowth+(r.principalRepaid||0)+(r.creditRecovery||0)+(r.chargeoff||0));
function measure(g,i,plan){return E.withCorporateForecast(g,()=>{
 const p=g.players[i],q=E.departmentFunctionsQuote(g,p,plan);if(!q.status.eligible)return {error:q.status.reason};
 const r=E.operatingPreview({...p,marketSnapshot:g.marketEconomy},plan,g.economy);
 return {allocation:plan.allocation,hires:plan.hires,remaining:q.remainingPools,gross:gross(r),profit:r.profit,
  vendorExpense:q.vendorExpense,capitalRatio:r.capitalRatio,fundingLoss:r.fundingLoss,emergencyDebt:r.emergencyDebt,
  tasks:q.delivery.rows.map(t=>({id:t.id,work:t.workload,served:t.delivered.served})),budget:E.planBudget(p,plan)};
});}
const results=[];
for(const seat of [0,1]){
 const g=copy(original),p=g.players[seat],plan=E.chooseBot(g,seat),baseline=measure(g,seat,plan),candidates=[];
 const floor=E.withCorporateForecast(g,()=>E.departmentOriginationFloorAcceptance(g,p,plan,E.planDepartmentFunctionsCore(g,seat,copy(plan),true)));
 // Replace already allocated lending quarter-work with the same function's
 // paid vendor throughput. This tests a funded alternative, not free capacity.
 const outsource=copy(plan);let released=0;
 for(const id of E.DepartmentFunctions.IDS){
  const n=Math.min(2-released,outsource.departmentFunctionsPolicy.quotas[id].lending,
   E.DepartmentFunctions.RULES.maxVendorQuarters-outsource.departmentFunctionsPolicy.vendors[id]);
  if(n<=0)continue;
  outsource.departmentFunctionsPolicy.quotas[id].lending-=n;outsource.departmentFunctionsPolicy.vendors[id]+=n;released+=n;
 }
 candidates.push({kind:'fundedVendorReplacement',released,
  acceptance:E.withCorporateForecast(g,()=>E.departmentOriginationFloorAcceptance(g,p,plan,outsource)),...measure(g,seat,outsource)});
 for(const donor of E.DepartmentFunctions.ROLES)for(const recipient of ['lending','operations']){
  if(donor===recipient||plan.allocation[donor]<=1)continue;
  let q=copy(plan);q.allocation[donor]--;q.allocation[recipient]++;
  try{
   // Recalculate existing physical office orders after changing the real role
   // assignment; never count a worker twice or invent a new hire.
   q.departmentFunctionsPolicy={quotas:Object.fromEntries(E.DepartmentFunctions.IDS.map(id=>[id,Object.fromEntries(E.DepartmentFunctions.ROLES.map(role=>[role,0]))])),vendors:Object.fromEntries(E.DepartmentFunctions.IDS.map(id=>[id,0]))};
   q=E.withCorporateForecast(g,()=>E.planFacilityLifecycle(g,seat,q));
   q=E.withCorporateForecast(g,()=>E.planDepartmentFunctionsCore(g,seat,q,true));
   q=E.withCorporateForecast(g,()=>E.planFinalCashReserve(g,seat,q));
   candidates.push({donor,recipient,...measure(g,seat,q)});
  }catch(error){candidates.push({donor,recipient,error:error.message});}
 }
 results.push({seat,staff:p.stats.staff,cash:p.stats.cash,loans:p.stats.loans,capitalRatio:E.capitalRatio(p),baseline,floor,candidates});
}
const result={identity,results,limits:'Counterfactual quotes, not a settled candidate or acceptance of a tradeoff.'};
if(arg('report')){
 const name=arg('report');assert(/^[\w.-]+\.json$/.test(name),'Plain report filename required.');
 const directory=path.join(root,'reports','qa','v31');fs.mkdirSync(directory,{recursive:true});
 fs.writeFileSync(path.join(directory,name),JSON.stringify(result)+'\n',{flag:'wx'});
}
console.log(JSON.stringify(result,null,2));
