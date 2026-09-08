'use strict';
// Actual assembled engine with quarantined adapters injected in memory only.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>assert.deepEqual(copy(a),copy(b));
const html=require('../tools/build_game').assemble().html,ctx={console};
const code=['department-functions.js','department-function-context.js','department-dispatch.js','department-delivery.js'].map(f=>fs.readFileSync(path.join(root,'experiments/institution',f),'utf8')).join('\n');
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={',code+'\nroot.BWEngine={DepartmentFunctions,DepartmentFunctionContext,DepartmentDispatch,DepartmentDelivery,departmentProductiveAllocation,applyDecision,'),ctx);
const E=ctx.BWEngine,D=E.DepartmentFunctions,C=E.DepartmentFunctionContext,T=E.DepartmentDispatch,V=E.DepartmentDelivery;
const roles=fn=>Object.fromEntries(D.ROLES.map(r=>[r,fn(r)])),vendors=n=>Object.fromEntries(D.IDS.map(id=>[id,n]));let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function fixture(i=0){
 const g=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options,mode:'hotseat',scenario:'balanced',seed:'department-runtime-delivery',created:1});
 const p=g.players[i],plan=E.chooseBot(g,i);plan.allocation=copy(p.allocation);plan.newProjects=[];plan.newProject=null;plan.investments={};plan.hires=0;
 plan.specialistHires=E.emptySpecialistOrders();plan.competitiveAction='none';plan.facilityPolicy=E.defaultFacilityPolicy();plan.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);
 plan.agencyPolicy=E.defaultAgencyPlan(p);plan.groupPolicy.bankDividend=0;plan.groupPolicy.bankSupport=0;plan.contractBid=null;plan.opportunity=null;plan.capitalAction=false;
 plan.advertisingPolicy.budget=0;plan.servicePolicy.staff=0;plan.householdPolicy.retention=25;plan.relationshipOfferPolicy.share=25;plan.onboardingPolicy.share=25;plan.collectionsPolicy.share=25;
 for(const role of D.ROLES){plan.workforcePolicy.training[role]=0;plan.leaderOrders[role]=null;}
 const source=C.build(g,p,plan,{vendorSupply:vendors(16)}),owner=D.initialize(p,1,true),policy=D.defaultPlan(owner);
 policy.quotas.onboarding.service=2;policy.quotas.credit.lending=2;policy.quotas.technology.operations=2;policy.quotas.treasury.business=1;
 policy.vendors.onboarding=2;policy.vendors.credit=1;
 const quote=D.quote(owner,policy,source.context),dispatch=T.dispatch(quote,source.attribution,source.taskWorkloads);
 return {g,p,plan,source,policy,dispatch,actual:{headcount:p.stats.staff,physicalQuarters:copy(source.attribution.rawAfterTeachingQuarters),paidVendorQuarters:copy(policy.vendors)}};
}
function run(f){return V.deliver(f.dispatch,f.source.attribution,f.actual);}
function conserved(r){for(const role of D.ROLES){
 const work=r.rows.reduce((n,row)=>n+row.delivered.retained[role]+row.delivered.additional[role],0),idle=Object.values(r.idleByFunction).reduce((n,row)=>n+row.delivered.staff[role],0);
 assert(Math.abs(work+idle+r.remainingPools[role]+r.physical.deliveredRoundingHold[role]+r.physical.residualQuantizationHold[role]-r.physical.delivered[role])<1e-8);
 assert(r.physical.delivered[role]<=r.physical.available[role]);
 assert(Math.abs(r.physical.delivered[role]+r.physical.unassigned[role]-r.physical.available[role])<1e-8);
 }
 for(const id of D.IDS)assert(Math.abs(r.rows.filter(x=>x.department===id).reduce((n,x)=>n+x.delivered.vendor,0)+r.idleByFunction[id].delivered.vendor-r.vendors.paid[id])<1e-8);
}
test('Undisrupted dispatch preserves exact retained fractions, additional work and physical residual',()=>{
 const f=fixture(),before=JSON.stringify(f),r=run(f);assert.equal(JSON.stringify(f),before);same(run(f),r);
 for(const row of r.rows){same(row.planned.retained,row.delivered.retained);same(row.planned.additional,row.delivered.additional);assert.equal(row.planned.capacity,row.delivered.capacity);}
 same(r.remainingPools,f.dispatch.remainingPools);conserved(r);
 assert.equal(r.physical.plannedRoundingHold.service,.0625);assert.equal(r.physical.retainedFractionsAlreadyDispatched.service,.9375);
});
test('One reduced role scales retained, additional, idle and residual together without changing other disciplines',()=>{
 const f=fixture(),initial=run(f);f.actual.physicalQuarters.service=8;f.actual.headcount=7;const before=JSON.stringify(f),r=run(f);
 assert.equal(r.physical.ratio.service,2/3);for(const row of r.rows){assert.equal(row.delivered.retained.service,row.planned.retained.service*2/3);assert.equal(row.delivered.additional.service,row.planned.additional.service*2/3);}
 for(const role of ['business','lending','operations'])for(const [i,row]of r.rows.entries()){assert.equal(row.delivered.retained[role],initial.rows[i].delivered.retained[role]);assert.equal(row.delivered.additional[role],initial.rows[i].delivered.additional[role]);}
 assert.equal(JSON.stringify(f),before);conserved(r);
});
test('No bankers delivers no physical work but confirmed paid vendors remain finite separate throughput',()=>{
 const f=fixture();f.actual.headcount=0;f.actual.physicalQuarters=roles(()=>0);const r=run(f);
 assert(r.rows.every(row=>Object.values(row.delivered.retained).every(n=>n===0)&&Object.values(row.delivered.additional).every(n=>n===0)));
 assert(r.rows.some(row=>row.delivered.vendor>0));same(r.remainingPools,roles(()=>0));conserved(r);
});
test('Succession/new staff cannot automatically increase strategic allocations',()=>{
 const f=fixture(),before=run(f);f.actual.headcount++;f.actual.physicalQuarters.service+=4;const r=run(f);
 same(r.rows,before.rows);same(r.remainingPools,before.remainingPools);assert.equal(r.physical.unassigned.service,4);conserved(r);
});
test('Unpaid or partly paid vendors produce no unpurchased work and never replenish lost physical staff',()=>{
 const f=fixture();f.actual.physicalQuarters.service=0;f.actual.headcount=5;f.actual.paidVendorQuarters.onboarding=1;f.actual.paidVendorQuarters.credit=0;
 const r=run(f);assert.equal(r.vendors.paidExpense,2200);assert.equal(r.vendors.plannedExpense,7200);assert.equal(r.remainingPools.service,0);conserved(r);
 f.actual.paidVendorQuarters=vendors(0);assert(run(f).rows.every(row=>row.delivered.vendor===0));
});
test('Every service/operations shortage grid conserves fractional tasks and quarantines fractional residual',()=>{
 const f=fixture();for(let service=0;service<=12;service++)for(let operations=0;operations<=4;operations++){
  f.actual.physicalQuarters={...f.actual.physicalQuarters,service,operations};const r=run(f);conserved(r);
  assert(Number.isInteger(r.remainingPools.service));assert(r.physical.residualQuantizationHold.service>=0&&r.physical.residualQuantizationHold.service<1);
  same(run(f),r);
 }
});
test('Actual talent-raid rule transfers a real employee; delivery follows the normalized victim role pool',()=>{
 const f=fixture(1),before=JSON.stringify(f.policy),total=f.g.players.reduce((n,p)=>n+p.stats.staff,0);
 // Fixed existing executive event and actual combat action, not a cash/staff gift
 // or a claim of a complete multiplayer turn. Board influence funds eligibility.
 f.g.event=copy(E.EVENTS.find(e=>e.key==='board'));E.applyDecision(f.g,f.g.players[0],'a');
 const attack={...copy(f.plan),competitiveAction:'talentRaid',focus:'downtown'},defense={...copy(f.plan),competitiveAction:'none',focus:'downtown'};
 assert(E.competitiveActionStatus(f.g.players[0],'talentRaid').eligible);
 const messages=E.resolveCompetitiveActions(f.g,[attack,defense]);assert(messages.some(x=>/recruited a senior banker/.test(x)));
 assert.equal(f.g.players.reduce((n,p)=>n+p.stats.staff,0),total);assert.equal(f.p.stats.staff,7);
 f.actual.headcount=f.p.stats.staff;f.actual.physicalQuarters=roles(role=>E.departmentProductiveAllocation(f.p)[role]*4);
 const r=run(f);assert(Object.values(r.physical.shortfall).some(n=>n>0));assert.equal(JSON.stringify(f.policy),before);conserved(r);
});
test('Actual paid-teaching attribution is the physical baseline, never subtracted again at delivery',()=>{
 const f=fixture();f.p.workforce.departments.business.count=2;f.p.workforce.departments.business.skill=20;
 f.plan.leaderOrders.business='mentor';f.plan.workforcePolicy.training.business=20000;
 f.source=C.build(f.g,f.p,f.plan,{vendorSupply:vendors(16)});assert.equal(f.source.attribution.paidTeacherQuarters.business,4);
 const owner=D.initialize(f.p,1,true),quote=D.quote(owner,f.policy,f.source.context);f.dispatch=T.dispatch(quote,f.source.attribution,f.source.taskWorkloads);
 f.actual.physicalQuarters=copy(f.source.attribution.rawAfterTeachingQuarters);const r=run(f);
 assert.equal(r.physical.delivered.business,4);assert.equal(r.physical.ratio.business,1);conserved(r);
});
test('Malformed, multiplied, stale-attribution and unauthorized paid-vendor claims reject without mutation',()=>{
 for(const mutate of [f=>f.actual.headcount=-1,f=>f.actual.physicalQuarters.service=401,f=>f.actual.physicalQuarters.service=NaN,
  f=>f.actual.headcount=0,f=>f.actual.paidVendorQuarters.people=1,f=>f.source.attribution.residualRoundingHold.service=1,
  f=>f.dispatch.rows[0].retained.service++,f=>f.dispatch.remainingPools.service++,f=>f.dispatch.vendorExpense++,
  f=>f.dispatch.rows.push(copy(f.dispatch.rows[0])),f=>f.actual.borrow=100000,f=>f.dispatch.rows[0].additional.operations=1]){
  const f=fixture();mutate(f);const before=JSON.stringify(f);assert.throws(()=>run(f));assert.equal(JSON.stringify(f),before);
 }
});
console.log(JSON.stringify({suite:'experimental-department-delivery',checks,integrated:false,scope:'Conserved per-role disruption delivery, exact retained fractions, explicit paid vendors, no automatic staff assignments; includes actual source talent-raid and paid-teaching fixtures.'}));
