'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const html=require('../tools/build_game').assemble().html,engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const code=['department-functions.js','department-function-context.js','department-dispatch.js'].map(f=>read('experiments/institution/'+f)).join('\n'),ctx={console};
vm.runInNewContext(engine.replace('root.BWEngine={',code+'\nroot.BWEngine={DepartmentFunctions,DepartmentFunctionContext,DepartmentDispatch,'),ctx);
const E=ctx.BWEngine,D=E.DepartmentFunctions,C=E.DepartmentFunctionContext,T=E.DepartmentDispatch;let checks=0;
const test=(name,fn)=>{try{fn();checks++;}catch(e){e.message=name+': '+e.message;throw e;}};
function fixture(){
 const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options,g=E.createGame({...options,mode:'hotseat',scenario:'balanced',seed:'department-task-dispatch',created:1}),p=g.players[0],plan=E.chooseBot(g,0);
 plan.allocation=copy(p.allocation);plan.newProjects=[];plan.newProject=null;plan.investments={};plan.hires=0;plan.specialistHires=E.emptySpecialistOrders();plan.competitiveAction='none';
 plan.facilityPolicy=E.defaultFacilityPolicy();plan.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);plan.agencyPolicy=E.defaultAgencyPlan(p);plan.groupPolicy.bankDividend=0;plan.groupPolicy.bankSupport=0;
 plan.contractBid=null;plan.opportunity=null;plan.capitalAction=false;plan.advertisingPolicy.budget=0;plan.servicePolicy.staff=0;
 plan.householdPolicy.retention=25;plan.relationshipOfferPolicy.share=25;plan.onboardingPolicy.share=25;plan.collectionsPolicy.share=0;
 for(const role of D.ROLES){plan.workforcePolicy.training[role]=0;plan.leaderOrders[role]=null;}
 const source=C.build(g,p,plan,{vendorSupply:Object.fromEntries(D.IDS.map(id=>[id,16]))});
 return {g,p,plan,source,owner:D.initialize(p,1,true)};
}
function run(f,policy=D.defaultPlan(f.owner)){
 const q=D.quote(f.owner,policy,f.source.context);return {q,dispatch:T.dispatch(q,f.source.attribution,f.source.taskWorkloads)};
}
test('actual sequential retained tasks conserve exact fractions without triple use',()=>{
 const f=fixture(),before=JSON.stringify(f),{dispatch:r}=run(f),tasks=Object.fromEntries(r.rows.map(row=>[row.id,row]));
 assert.equal(tasks.householdSupport.retained.service,3);assert.equal(tasks.offerSales.retained.service,2.25);assert.equal(tasks.applicationProcessing.retained.service,1.6875);
 const retained=r.rows.reduce((n,row)=>n+row.retained.service,0);assert.equal(retained,6.9375);
 assert.equal(retained+f.source.attribution.residualExactQuarters.service,12);assert.equal(JSON.stringify(f),before);
 assert.equal(tasks.commercialDelivery.retained.service,0);assert.equal(tasks.householdSupport.retained.business,0);
});
test('additional business work cannot become retail support or application capacity',()=>{
 const f=fixture(),policy=D.defaultPlan(f.owner);policy.quotas.onboarding.business=2;const {dispatch:r}=run(f,policy);
 assert.equal(r.rows.find(row=>row.id==='householdSupport').additional.business,0);assert.equal(r.rows.find(row=>row.id==='applicationProcessing').additional.business,0);
 assert.equal(r.idleByFunction.onboarding.staff.business,2,'No actual commercial contract workload exists yet; incompatible spare bankers stay idle.');
 assert.equal(r.remainingPools.business,f.source.context.physicalQuarters.business-2);
});
test('one paid vendor unit is divided once across tasks and never becomes a banker',()=>{
 const f=fixture(),policy=D.defaultPlan(f.owner);policy.vendors.onboarding=1;const {q,dispatch:r}=run(f,policy);
 const used=r.rows.filter(row=>row.department==='onboarding').reduce((n,row)=>n+row.vendor,0);
 assert(Math.abs(used+r.idleByFunction.onboarding.vendor-1)<1e-10);assert(used<=1);assert.equal(r.vendorExpense,2200);
 assert.deepEqual(copy(r.remainingPools),copy(q.remainingPools));assert.equal(r.rows.find(row=>row.id==='commercialDelivery').vendor,0);
});
test('every function conserves funded vendor and compatible additional staff allocations',()=>{
 const f=fixture(),policy=D.defaultPlan(f.owner);for(const id of D.IDS)policy.vendors[id]=4;
 policy.quotas.onboarding.service=2;policy.quotas.credit.lending=2;policy.quotas.technology.operations=2;policy.quotas.treasury.business=1;
 const before=JSON.stringify({f,policy}),{dispatch:r}=run(f,policy);assert.equal(JSON.stringify({f,policy}),before);
 for(const id of D.IDS){const rows=r.rows.filter(row=>row.department===id);
  assert(Math.abs(rows.reduce((n,row)=>n+row.vendor,0)+r.idleByFunction[id].vendor-policy.vendors[id])<1e-9);
  for(const role of D.ROLES)assert(Math.abs(rows.reduce((n,row)=>n+row.additional[role],0)+r.idleByFunction[id].staff[role]-policy.quotas[id][role])<1e-9);
 }
 for(const row of r.rows){assert(row.served<=row.workload);assert(row.shortfall>=0);for(const role of D.ROLES)if(row.additional[role]>0)assert(T.TASKS[row.id].roles.includes(role));}
 assert.equal(f.p.departmentFunctions,undefined);assert.equal(f.owner.accounting.accounts.cash,f.p.accounting.accounts.cash);
});
test('duplicated retained work, changed workload and ineligible quote reject without repair',()=>{
 const f=fixture(),{q}=run(f),a=copy(f.source.attribution),work=copy(f.source.taskWorkloads);
 a.exactRetainedTasks.applicationProcessing.service++;assert.throws(()=>T.dispatch(q,a,work),/duplicated or lost/);
 const wrong=copy(f.source.attribution);wrong.exactRetainedTasks.commercialDelivery.service=1;assert.throws(()=>T.dispatch(q,wrong,work),/discipline/);
 work.householdSupport+=10;assert.throws(()=>T.dispatch(q,f.source.attribution,work),/reconcile/);
 assert.throws(()=>T.dispatch({...q,eligible:false},f.source.attribution,f.source.taskWorkloads),/Eligible/);
});
console.log(JSON.stringify({suite:'experimental-department-dispatch',checks,integrated:false,scope:'Actual opening books and exact task fractions; conserved compatible additions and paid vendor throughput. Live consumer wiring and staffing-disruption delivery remain pending.'}));
