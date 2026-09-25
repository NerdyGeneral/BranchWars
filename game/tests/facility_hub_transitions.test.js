'use strict';
// Actual paid construction/conversion, finite accounts and normal monthly turns.
// No supplied cash, free office roster, condition rewrite or migration repair.
const vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const html=require('../tools/build_game').assemble().html,c={console},copy=x=>JSON.parse(JSON.stringify(x));
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={facilityLifecycleLiveContext,'),c);const E=c.BWEngine;
const same=(a,b)=>assert.deepEqual(copy(a),copy(b));let checks=0,months=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function quiet(g,i){
 const p=g.players[i],q=E.chooseBot(g,i);
 q.newProject=null;q.newProjects=[];q.investments={};q.hires=0;q.specialistHires=E.emptySpecialistOrders();q.competitiveAction='none';
 q.facilityPolicy=E.defaultFacilityPolicy();Object.assign(q,E.defaultDepartmentPlan(p));q.agencyPolicy=E.defaultAgencyPlan(p);
 q.groupPolicy.bankSupport=0;q.groupPolicy.bankDividend=0;q.allocation={service:p.stats.staff-5,business:1,lending:2,operations:2};
 q.householdPolicy.retention=25;q.servicePolicy.staff=0;q.collectionsPolicy.share=0;q.relationshipOfferPolicy.share=0;q.onboardingPolicy.share=0;
 q.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,q).policy;return q;
}
function advance(g,edit=()=>{}){
 const plans=[quiet(g,0),quiet(g,1)];edit(plans[0],g.players[0]);
 for(const [i,p]of plans.entries()){const s=E.projectPlanStatus(g.players[i],p);assert(s.eligible,s.reason);const l=E.lifecycleInstructionQuote(g,g.players[i],p);assert(l.status.eligible,l.status.reason);}
 E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);months++;E.validatePilot(g);E.validateLedger(g);return plans;
}
function waitOrder(g,edit,limit=36){
 for(let n=0;n<limit;n++){
  const p=g.players[0],q=quiet(g,0);edit(q,p);
  const a=E.projectPlanStatus(p,q),b=E.facilityInstructionQuote(g,p,q),l=E.lifecycleInstructionQuote(g,p,q);
  if(a.eligible&&b.status.eligible&&l.status.eligible&&E.planBudget(p,q).discretionaryRemaining>=0){advance(g,edit);return;}
  advance(g);
 }
 throw Error('Paid order did not become affordable/eligible.');
}
function conversion(g,id,model){const cost=E.facilityNewOfficeCost(g.players[0],E.FacilityNetwork.office(g.players[0],id).market,model)*.35,spent=g.players[0].buildSpend;
 waitOrder(g,q=>{q.facilityPolicy.convert={officeId:id,model};});
 for(let n=0;E.FacilityNetwork.office(g.players[0],id).conversion&&n<6;n++)advance(g);
 assert.equal(E.FacilityNetwork.office(g.players[0],id).model,model);assert.equal(g.players[0].buildSpend-spent,Math.round(cost));
}
const original=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options,mode:'hotseat',scenario:'balanced',seed:'hub-transitions',created:1});
const hub=original.players[0].facilityNetwork.offices[0].id;
conversion(original,hub,'regionalHub');
waitOrder(original,q=>{q.focus='industrial';q.newProject='branchAtm';q.newProjects=['branchAtm'];});
const recipient=original.players[0].facilityNetwork.offices.find(o=>o.market==='industrial'&&o.closedCycle===null).id;
waitOrder(original,q=>{q.focus='northside';q.newProject='branchAtm';q.newProjects=['branchAtm'];});
const otherRecipient=original.players[0].facilityNetwork.offices.find(o=>o.market==='northside'&&o.closedCycle===null).id;
advance(original,q=>{q.facilityLifecyclePolicy.offices[recipient].hubId=hub;q.facilityLifecyclePolicy.offices[otherRecipient].hubId=hub;});
test('Normal paid hub conversion and adjacent ATM construction preserve identity and a valid selected link',()=>{
 assert.equal(original.players[0].facilityLifecycle.records[recipient].hubId,hub);
 same(E.migrateCampaign(copy(original)),E.migrateCampaign(copy(E.migrateCampaign(copy(original)))));
});
test('A paid outgoing hub conversion releases incoming support links at activation, not during work',()=>{
 const g=copy(original);waitOrder(g,q=>{q.facilityPolicy.convert={officeId:hub,model:'atm'};});
 assert.equal(g.players[0].facilityLifecycle.records[recipient].hubId,hub,'Source remains a hub throughout construction.');
 for(let n=0;E.FacilityNetwork.office(g.players[0],hub).conversion&&n<6;n++)advance(g);
 assert.equal(E.FacilityNetwork.office(g.players[0],hub).model,'atm');
 assert.equal(g.players[0].facilityLifecycle.records[recipient].hubId,null);
 same(E.migrateCampaign(copy(g)),E.migrateCampaign(copy(E.migrateCampaign(copy(g)))));
});
test('A paid recipient conversion into a hub clears only its own outgoing assignment',()=>{
 const g=copy(original);conversion(g,recipient,'regionalHub');
 const p=g.players[0];assert.equal(p.facilityLifecycle.records[recipient].hubId,null);
 assert.equal(p.facilityLifecycle.records[otherRecipient].hubId,hub);
 E.FacilityLifecycle.validate(p,g.cycle,true);E.migrateCampaign(copy(g));
 const forged=copy(g);forged.players[0].facilityLifecycle.records[recipient].hubId=hub;
 assert.throws(()=>E.migrateCampaign(forged),/hub link/i,'Import must not silently reconcile a forged hub-to-hub link.');
});
test('Recipient-to-hub preview does not promise incoming support that ends on activation',()=>{
 const g=copy(original),p=g.players[0],q=quiet(g,0);staffedSupport(g,q);
 q.facilityPolicy.convert={officeId:recipient,model:'regionalHub'};
 const before=JSON.stringify({g,q}),quote=E.facilityInstructionQuote(g,p,q);assert(quote.quote);
 // Same physical assignment/model-only counterfactual; no campaign mutation or
 // granted office. The model transition disconnects only this recipient.
 const owner=copy(p);for(const[id,row]of Object.entries(q.facilityLifecyclePolicy.offices))Object.assign(owner.facilityLifecycle.records[id],row);
 E.FacilityNetwork.office(owner,recipient).model='regionalHub';owner.facilityLifecycle.records[recipient].hubId=null;
 const metric=E.FacilityLifecycle.metrics(owner,E.facilityLifecycleLiveContext(owner)).rows.find(r=>r.officeId===recipient);
 assert.equal(quote.quote.after.serviceCapacity,metric.capacity.serviceCapacity);
 assert.equal(metric.supportReceived,0);assert.equal(JSON.stringify({g,q}),before);
});
test('Paid source and recipient closures disconnect only affected links and preserve tombstone history',()=>{
 for(const id of [hub,recipient]){
  const g=copy(original),market=E.FacilityNetwork.office(g.players[0],id).market;
  waitOrder(g,q=>{q.focus=market;q.newProject='branchClose';q.newProjects=['branchClose'];});
  for(let n=0;E.FacilityNetwork.office(g.players[0],id).closedCycle===null&&n<5;n++)advance(g);
  const p=g.players[0];assert.notEqual(E.FacilityNetwork.office(p,id).closedCycle,null);
  assert(p.facilityLifecycle.records[id]);assert.equal(p.facilityLifecycle.records[recipient].hubId,null);
  assert.equal(p.facilityLifecycle.records[otherRecipient].hubId,id===hub?null:hub);
  E.migrateCampaign(copy(g));
  const forged=copy(g);forged.players[0].facilityLifecycle.records[otherRecipient].hubId=id;
  assert.throws(()=>E.migrateCampaign(forged),/hub link/i);
 }
});
function staffedSupport(g,q){
 const rows=q.facilityLifecyclePolicy.offices;
 for(const id of [recipient,otherRecipient])rows[id].staffQuarters={service:1,business:0,lending:0,operations:1,wealth:0};
 rows[hub].staffQuarters={service:7,business:4,lending:4,operations:6,wealth:0};
}
test('Operational support is a finite transfer, and renovating a hub preserves valid links through paid activation',()=>{
 const g=copy(original),p=g.players[0],plan=quiet(g,0);staffedSupport(g,plan);
 const linked=E.lifecycleInstructionQuote(g,p,plan);assert(linked.status.eligible,linked.status.reason);
 const noLinks=copy(plan);noLinks.facilityLifecyclePolicy.offices[recipient].hubId=null;noLinks.facilityLifecyclePolicy.offices[otherRecipient].hubId=null;
 const unlinked=E.lifecycleInstructionQuote(g,p,noLinks),rows=linked.quote.metrics.rows;
 const units=n=>Math.round(n*1000000),total=x=>x.rows.reduce((n,r)=>n+units(r.capacity.serviceCapacity),0);
 assert(rows.find(r=>r.officeId===hub).supportSent>0,'Real staffed hub must transfer actual service.');
 assert.equal(total(linked.quote.metrics),total(unlinked.quote.metrics));
 assert.equal(rows.reduce((n,r)=>n+units(r.supportSent),0),rows.reduce((n,r)=>n+units(r.supportReceived),0));
 waitOrder(g,q=>{staffedSupport(g,q);q.facilityLifecyclePolicy.renovate=hub;});
 assert(g.players[0].facilityLifecycle.records[hub].renovation);
 assert.equal(g.players[0].facilityLifecycle.records[recipient].hubId,hub);
 const during=quiet(g,0);staffedSupport(g,during);
 const d=E.lifecycleInstructionQuote(g,g.players[0],during),comp=d.renovationComparisons[hub];
 assert(comp.during.supportAvailable<=comp.before.supportAvailable*.5+1e-6);
 for(let n=0;g.players[0].facilityLifecycle.records[hub].renovation&&n<6;n++)advance(g,q=>staffedSupport(g,q));
 assert.equal(g.players[0].facilityLifecycle.records[hub].renovation,null);
 assert.equal(g.players[0].facilityLifecycle.records[recipient].hubId,hub);
 assert.equal(g.players[0].facilityLifecycle.records[otherRecipient].hubId,hub);
 E.migrateCampaign(copy(g));
});
console.log(JSON.stringify({status:'PASS',checks,months,candidateSha256:createHash('sha256').update(html).digest('hex')}));
