'use strict';
// Actual assembled engine + unintegrated adapters, injected before its public API
// inside the same closure. Prices, spending limits and staffing helpers are real.
// Broader-model and experienced-specialist rosters below are labelled schema
// fixtures, not a claim that those new offices can already be built in gameplay.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
const html=require('../tools/build_game').assemble().html;
const experimental=['facility-lifecycle.js','facility-lifecycle-quotes.js'].map(f=>fs.readFileSync(path.join(root,'experiments/institution',f),'utf8')).join('\n');
const api='FacilityLifecycle,lifecycleInstructionQuote,defaultFacilityLifecyclePlan,facilityLifecycleStaffProposal,facilityLifecycleDraftCommitment,facilityLifecycleModelTerms,facilityLifecyclePlanningContext,facilityLifecycleNearby,departmentPlanOperatingQuote,departmentProductiveAllocation,';
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={',experimental+'\nroot.BWEngine={'+api),ctx);
const E=ctx.BWEngine,L=E.FacilityLifecycle,options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options;
const same=(a,b)=>assert.deepEqual(copy(a),copy(b));let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function fixture(){
 const g=E.createGame({...options,mode:'hotseat',scenario:'balanced',seed:'lifecycle-quotes',created:1});
 const p=g.players[0],q=E.chooseBot(g,0);
 q.newProjects=[];q.newProject=null;q.investments={};q.hires=0;q.specialistHires=E.emptySpecialistOrders();
 q.competitiveAction='none';q.facilityPolicy=E.defaultFacilityPolicy();Object.assign(q,E.defaultDepartmentPlan(p));
 q.agencyPolicy=E.defaultAgencyPlan(p);q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;
 // Explicit prototype init only, not a migration or actual creation claim.
 g.players[0]=L.initialize(p,1,true);q.allocation=copy(p.allocation);q.servicePolicy.staff=0;
 q.householdPolicy.retention=25;q.relationshipOfferPolicy.share=0;q.onboardingPolicy.share=0;q.collectionsPolicy.share=0;
 q.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(g.players[0]);
 return {g,p:g.players[0],q};
}
function worn(p){const id=p.facilityNetwork.offices[0].id;p.facilityLifecycle.records[id].conditionBp=8000;return id;}
function staffed(g,p,q){q.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,q).policy;return q;}

test('Actual new Group4 owner quotes are pure; the legacy owner never gains a lifecycle book',()=>{
 const {g,p,q}=fixture(),before=JSON.stringify(g),draft=JSON.stringify(q);
 const a=E.lifecycleInstructionQuote(g,p,q),b=E.lifecycleInstructionQuote(g,p,q);
 assert(a.status.eligible,a.status.reason);same(a,b);assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(q),draft);
 const old=copy(p);delete old.facilityLifecycle;assert.equal(E.defaultFacilityLifecyclePlan(old),null);
 assert.equal(E.lifecycleInstructionQuote(g,old,q).status.eligible,false);assert.equal(old.facilityLifecycle,undefined);
});
test('Retained office quote uses exact actual project pricing, local upgrades and raw undisrupted capacity',()=>{
 const {g,p,q}=fixture(),id=worn(p),o=p.facilityNetwork.offices[0];
 p.regionalOperations.markets[o.market]={service:2,automation:2};staffed(g,p,q);
 const raw=E.facilityRawOfficeMetrics(p,o),terms=E.facilityLifecycleModelTerms(p,o);
 assert.equal(terms.cost,E.facilityNewOfficeCost(p,o.market,o.model));assert.equal(terms.upkeep,Math.round(raw.expense));
 assert.equal(terms.capacity.depositCapacity,raw.depositCapacity);assert.equal(terms.capacity.serviceCapacity,raw.serviceCapacity);
 q.facilityLifecyclePolicy.renovate=id;const result=E.lifecycleInstructionQuote(g,p,q);
 assert(result.status.eligible,result.status.reason);assert.equal(result.quote.renovationCost,Math.round(terms.cost*.22));
 assert.equal(result.quote.maintenance,Math.round(terms.upkeep*.12));
 assert.equal(result.quote.metrics.totals.capacity.depositCapacity,result.quote.beforeMetrics.totals.capacity.depositCapacity*.5);
 assert.equal(result.quote.metrics.totals.upkeep,result.quote.beforeMetrics.totals.upkeep);
 assert(result.quote.afterMetrics.totals.capacity.depositCapacity>result.quote.beforeMetrics.totals.capacity.depositCapacity);
});
test('Budget field presence includes lifecycle costs and capacity exactly once, not by saved flags',()=>{
 const {g,p,q}=fixture();q.facilityLifecyclePolicy.renovate=worn(p);
 const b=E.planBudget(p,q),cost=E.facilityLifecycleDraftCommitment(p,q),missing=E.facilityLifecyclePlanningContext(g,p,q,b);
 const integrated={...b,total:b.total+cost.total,remaining:b.remaining-cost.total,freeCapacity:b.freeCapacity-cost.capacity,
  facilityLifecycle:cost.total,facilityLifecycleCapacity:cost.capacity};
 const present=E.facilityLifecyclePlanningContext(g,p,q,integrated);
 assert.equal(present.context.freeCash,missing.context.freeCash);assert.equal(present.context.freeExecution,missing.context.freeExecution);
 assert.equal(cost.total,cost.renovation+cost.maintenance);assert.equal(cost.capacity,1);
 assert.throws(()=>E.facilityLifecyclePlanningContext(g,p,q,{...integrated,facilityLifecycle:0}),/disagrees/);
 assert.throws(()=>E.facilityLifecyclePlanningContext(g,p,q,{...integrated,facilityLifecycleCapacity:0}),/disagrees/);
 // Structural helper itself is independent of allocation/teacher/forecast rules.
 same(E.facilityLifecycleDraftCommitment(p,{facilityLifecyclePolicy:q.facilityLifecyclePolicy}),cost);
});
test('Other research and recruitment spend and actual reserves block renovation without creating cash',()=>{
 const {g,p,q}=fixture(),id=worn(p);q.facilityLifecyclePolicy.renovate=id;
 const before=E.lifecycleInstructionQuote(g,p,q);assert(before.status.eligible,before.status.reason);
 q.investments={network:5000000};const blocked=E.lifecycleInstructionQuote(g,p,q);
 assert.equal(blocked.status.eligible,false);assert.match(blocked.status.reason,/cash|commitment|funds|envelope/i);
 q.investments={};q.departmentPolicy.reserve=p.stats.cash;assert.equal(E.lifecycleInstructionQuote(g,p,q).status.eligible,false);
 assert.equal(p.accounting.accounts.cash,p.stats.cash);assert.equal(p.facilityLifecycle.records[id].renovation,null);
});
test('Physical staffing subtracts retention, offers, onboarding, contracts and collections exactly once',()=>{
 const {g,p,q}=fixture();q.allocation={service:4,business:2,lending:1,operations:1};
 q.householdPolicy.retention=50;q.relationshipOfferPolicy.share=50;q.onboardingPolicy.share=50;
 q.servicePolicy.staff=1;q.collectionsPolicy.share=50;
 const r=E.lifecycleInstructionQuote(g,p,q);assert(r.status.eligible,r.status.reason);
 same(r.availableStaffQuarters,{service:2,business:4,lending:2,operations:4,wealth:0});
 q.servicePolicy.staff=2;q.collectionsPolicy.share=100;q.householdPolicy.retention=100;
 same(E.lifecycleInstructionQuote(g,p,q).availableStaffQuarters,{service:0,business:0,lending:0,operations:4,wealth:0});
});
test('Paid specialist teaching consumes a real head, while unaffordable training does not create a phantom teacher',()=>{
 const {g,p,q}=fixture();
 // Existing qualified-worker schema fixture: still the same eight employed
 // bankers. The actual department helper pays appointment/salary on its clone.
 p.workforce.departments.business.count=3;p.workforce.departments.business.skill=20;
 q.allocation={service:3,business:3,lending:1,operations:1};q.leaderOrders.business='delivery';
 q.workforcePolicy.training.business=20000;q.servicePolicy.staff=1;
 const result=E.lifecycleInstructionQuote(g,p,q);assert(result.status.eligible,result.status.reason);
 assert.equal(result.availableStaffQuarters.business,4,'3 physical minus 1 teacher minus 1 delivery');
 const structural=E.facilityLifecycleDraftCommitment(p,q),budget=E.planBudget(p,q);
 const prepared=E.departmentPlanOperatingQuote(p,q,budget.total-budget.training+structural.total);
 assert(prepared.training.total>0);assert(prepared.owner.stats.cash<p.stats.cash);assert.equal(p.departmentOffice.leaders.business,null);
 q.workforcePolicy.reserve=p.stats.cash-budget.departmentLeadership-structural.total-1000;
 const paused=E.lifecycleInstructionQuote(g,p,q);assert(paused.status.eligible,paused.status.reason);
 assert.equal(paused.availableStaffQuarters.business,8,'Unaffordable class must not withdraw a teacher');
 q.workforcePolicy.training.business=0;assert.equal(E.lifecycleInstructionQuote(g,p,q).availableStaffQuarters.business,8);
});
test('Bulk allocation preserves maintenance, hub and work instructions and stays within actual residual staff',()=>{
 const {g,p,q}=fixture(),id=worn(p);q.facilityLifecyclePolicy.offices[id].maintenance='basic';q.facilityLifecyclePolicy.renovate=id;
 const before=JSON.stringify({g,q}),r=E.facilityLifecycleStaffProposal(g,p,q);
 assert.equal(r.policy.renovate,id);assert.equal(r.policy.offices[id].maintenance,'basic');assert.equal(r.policy.offices[id].hubId,null);
 for(const role of L.ROLES){const total=Object.values(r.policy.offices).reduce((n,x)=>n+x.staffQuarters[role],0);
  assert(total<=r.availableStaffQuarters[role]);assert.equal(total+r.unused[role],r.availableStaffQuarters[role]);}
 assert.equal(JSON.stringify({g,q}),before);
});
test('Proposed conversion and existing conversion each disrupt once and prevent overlapping renovation',()=>{
 const {g,p,q}=fixture(),id=worn(p);staffed(g,p,q);
 const normal=E.lifecycleInstructionQuote(g,p,q).quote.metrics.totals.capacity.depositCapacity;
 q.facilityPolicy.convert={officeId:id,model:'digital'};
 const conversion=E.lifecycleInstructionQuote(g,p,q);assert(conversion.status.eligible,conversion.status.reason);
 assert.equal(conversion.quote.metrics.totals.capacity.depositCapacity,normal*.5);
 q.facilityLifecyclePolicy.renovate=id;assert.equal(E.lifecycleInstructionQuote(g,p,q).status.eligible,false);
 q.facilityPolicy=E.defaultFacilityPolicy();q.facilityLifecyclePolicy.renovate=null;
 p.facilityNetwork.offices[0].conversion={model:'digital',cost:100000,work:0,startedCycle:1,readyCycle:null};
 assert.equal(E.lifecycleInstructionQuote(g,p,q).quote.metrics.totals.capacity.depositCapacity,normal*.5);
});
test('Authored local hub neighbors never cross regions; wider model quotes require no fake wealth license',()=>{
 const {g,p,q}=fixture(),o=p.facilityNetwork.offices[0];
 assert(E.facilityLifecycleNearby(g,'downtown','industrial'));assert(E.facilityLifecycleNearby(g,'suburbs','university'));
 assert.equal(E.facilityLifecycleNearby(g,'downtown','suburbs'),false);assert.equal(E.facilityLifecycleNearby(g,'unknown','unknown'),false);
 for(const model of ['atm','wealth','financialCenter','regionalHub']){
  const candidate={...o,model},d=L.CATALOG[model],t=E.facilityLifecycleModelTerms(p,candidate),r=E.REGIONAL_MARKETS[o.market];
  assert.equal(t.cost,E.projectCost({...p,focus:o.market},{kind:'branch',cost:d.cost}));
  assert.equal(t.upkeep,Math.round(d.upkeep*r.rent));assert.equal(t.capacity.loanCapacity,d.capacity.loanCapacity*r.loans);
 }
 // Broader identified roster fixture, not live construction: preserve identity,
 // replace only the model to exercise license-aware capacity, never gift assets.
 o.model='wealth';p.wealthLicensed=true;p.agency.status='active';staffed(g,p,q);
 const wealth=E.lifecycleInstructionQuote(g,p,q);assert(wealth.status.eligible,wealth.status.reason);
 assert.equal(wealth.availableStaffQuarters.wealth,0);same(wealth.quote.metrics.totals.capacity,{depositCapacity:0,loanCapacity:0,serviceCapacity:0,advisoryCapacity:0});
});
test('Malformed instructions, staffing and owner chronology stay visibly blocked',()=>{
 for(const mutate of [
  ({q})=>{q.facilityLifecyclePolicy=null;},
  ({q})=>{q.facilityLifecyclePolicy.offices={};},
  ({q})=>{q.allocation.service=-1;},
  ({p})=>{p.facilityLifecycle.records[p.facilityNetwork.offices[0].id].ageMonths=10;},
  ({q})=>{q.collectionsPolicy.share=-25;}
 ]){const f=fixture();mutate(f);const before=JSON.stringify(f);assert.equal(E.lifecycleInstructionQuote(f.g,f.p,f.q).status.eligible,false);assert.equal(JSON.stringify(f),before);}
});
test('Existing renovation UI comparison exposes actual before/during/after rows and remains pure on owner-only views',()=>{
 const {g,p,q}=fixture(),id=worn(p);staffed(g,p,q);
 // Active-work schema fixture. No cost is booked here, and this is not a claim
 // of whole-world payment; FacilitySettlement tests own paired payment proof.
 p.facilityLifecycle.records[id].renovation={cost:100000,work:1,startedCycle:1,readyCycle:null};
 const before=JSON.stringify({g,q}),result=E.lifecycleInstructionQuote(g,p,q),r=result.renovationComparisons[id];
 assert(result.status.eligible,result.status.reason);assert(r.before&&r.during&&r.after);
 assert.equal(r.before.officeId,id);assert.equal(r.during.capacity.depositCapacity,r.before.capacity.depositCapacity*.5);
 assert(r.after.capacity.depositCapacity>r.before.capacity.depositCapacity);assert.equal(r.during.upkeep,r.before.upkeep);
 const v=E.publicState(g,0);v.me.facilityLifecycle=copy(p.facilityLifecycle); // explicit prototype-only projection boundary
 same(E.lifecycleInstructionQuote(v,v.me,q),result);assert.equal(JSON.stringify({g,q}),before);
 q.facilityLifecyclePolicy.cancel=id;const cancel=E.lifecycleInstructionQuote(g,p,q);
 assert(cancel.quote.metrics.totals.capacity.depositCapacity>result.quote.metrics.totals.capacity.depositCapacity);
 assert.equal(cancel.quote.renovationCost,0);
});
test('Changing selected office recalculates actual local costs without precomputing every hypothetical alternative',()=>{
 const {g,p,q}=fixture(),first=worn(p),serial=2;
 // One inherited additional retail office schema fixture, no asset/cash gift.
 const office={id:p.id+':office:'+serial,market:'northside',model:'retail',openedCycle:1,closedCycle:null,conversions:0,conversion:null};
 p.facilityNetwork.offices.push(office);p.facilityNetwork.nextId=3;
 const registered=L.register(p,office.id,1);p.facilityLifecycle=registered.facilityLifecycle;
 p.facilityLifecycle.records[office.id].conditionBp=7000;
 p.workforce.departments.business.count=3;p.workforce.departments.business.skill=20;
 q.allocation={service:3,business:3,lending:1,operations:1};q.leaderOrders.business='delivery';q.workforcePolicy.training.business=20000;
 q.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);staffed(g,p,q);q.facilityLifecyclePolicy.renovate=first;
 const together=E.lifecycleInstructionQuote(g,p,q);
 const alternative=copy(q);alternative.facilityLifecyclePolicy.renovate=office.id;
 const alone=E.lifecycleInstructionQuote(g,p,alternative);
 assert(alone.quote&&together.quote);assert.notEqual(together.quote.renovationCost,alone.quote.renovationCost);
 assert.equal(alone.quote.renovationCost,Math.round(E.facilityNewOfficeCost(p,office.market,office.model)*.22));
 same(alone.renovationComparisons,{});same(E.lifecycleInstructionQuote(g,p,q),together);
});
test('Hub selector shows only owned authored neighbors without promising unsupported wealth capacity',()=>{
 const {g,p,q}=fixture(),id=p.facilityNetwork.offices[0].id;
 for(const [n,market]of [[2,'northside'],[3,'suburbs']]){
  p.facilityNetwork.offices.push({id:p.id+':office:'+n,market,model:'regionalHub',openedCycle:1,closedCycle:null,conversions:0,conversion:null});
  p.facilityLifecycle=L.register(p,p.id+':office:'+n,1).facilityLifecycle;
 }
 q.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);const r=E.lifecycleInstructionQuote(g,p,q);
 same(r.nearbyHubIds[id],[p.id+':office:2']);same(r.nearbyHubIds[p.id+':office:2'],[]);
 q.facilityLifecyclePolicy.offices[id].hubId=p.id+':office:3';assert.equal(E.lifecycleInstructionQuote(g,p,q).status.eligible,false);
});
console.log(JSON.stringify({status:'PASS',checks,scope:'Actual assembled engine quote adapter; no production integration or broad-model construction claim'}));
