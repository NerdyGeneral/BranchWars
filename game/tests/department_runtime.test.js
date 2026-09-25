'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const html=require('../tools/build_game').assemble().html,ctx={console};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={awardOpportunity,withMarket,validateDepartmentFunctionsView,applyHiring,departmentPlanOperatingQuote,prepareDepartmentFunctions,deliverDepartmentFunctions,applyDecision,departmentProductiveAllocation,departmentFunctionCoverage,departmentFunctionTaskFte,departmentFunctionResidual,planBudgetBase,'),ctx);
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
const g=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:6}).options,mode:'hotseat',scenario:'balanced',seed:'department-runtime',created:1});
assert.equal(g.version,'9.5');
const plan=E.chooseBot(g,0),original=JSON.stringify(g),quote=E.departmentFunctionsQuote(g,g.players[0],plan);
assert(quote.status.eligible,quote.status.reason);assert.equal(JSON.stringify(g),original,'planning quote must be pure');
console.log('PASS actual Group6 creation and pure function quote');
for(let month=0;month<3&&!g.gameOver;month++){
  for(let seat=0;seat<2;seat++){const draft=E.chooseBot(g,seat);E.submit(g,seat,draft);}
  E.migrateCampaign(copy(g));
  console.log('PASS actual month '+month);
}
function create(){return E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:6}).options,mode:'hotseat',scenario:'balanced',seed:'department-runtime',created:1});}
function blank(){return {quotas:Object.fromEntries(E.DepartmentFunctions.IDS.map(id=>[id,Object.fromEntries(E.DepartmentFunctions.ROLES.map(r=>[r,0]))])),vendors:Object.fromEntries(E.DepartmentFunctions.IDS.map(id=>[id,0]))};}
function plans(world){return world.players.map((p,i)=>{
 const q=E.chooseBot(world,i);q.allocation=copy(p.allocation);q.newProjects=[];q.newProject=null;q.investments={};q.hires=0;q.specialistHires=E.emptySpecialistOrders();q.competitiveAction='none';q.facilityPolicy=E.defaultFacilityPolicy();q.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);
 q.householdPolicy.retention=25;q.collectionsPolicy.share=25;q.relationshipOfferPolicy.share=0;q.onboardingPolicy.share=0;q.servicePolicy.staff=0;q.servicePolicy.outsourcing=0;q.advertisingPolicy.budget=0;
 q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;q.agencyPolicy=E.defaultAgencyPlan(p);q.contractBid=null;q.opportunity=null;q.capitalAction=false;
 q.departmentFunctionsPolicy=blank();for(const r of E.DepartmentFunctions.ROLES){q.workforcePolicy.training[r]=0;q.leaderOrders[r]=null;}
 return q;
});}
{
 const world=create(),qs=plans(world);qs[0].departmentFunctionsPolicy.vendors.credit=4;qs[1].departmentFunctionsPolicy.vendors.risk=2;
 const before=world.players.map(p=>p.accounting.accounts.cash),sum=before.reduce((a,b)=>a+b,0),cost=qs.map((q,i)=>E.planBudget(world.players[i],q).departmentFunctions);
 E.prepareDepartmentFunctions(world,qs);
 assert.equal(world.departmentFunctionEconomy.supplier.accounts.cash,cost[0]+cost[1]);
 world.players.forEach((p,i)=>{assert.equal(p.accounting.accounts.cash,before[i]-cost[i]);assert.equal(p.departmentFunctions.paid,cost[i]);assert.equal(E.planBudget(p,qs[i]).departmentFunctions,0);});
 assert.equal(world.players.reduce((n,p)=>n+p.accounting.accounts.cash,world.departmentFunctionEconomy.supplier.accounts.cash),sum);
 const paid=JSON.stringify(world);assert.throws(()=>E.prepareDepartmentFunctions(world,qs));assert.equal(JSON.stringify(world),paid);
 console.log('PASS actual paired vendor cash/equity conservation, once-only budget and duplicate refusal');
}
{
 const world=create(),qs=plans(world);qs[1].departmentFunctionsPolicy.vendors.credit=17;
 const before=JSON.stringify(world);assert.throws(()=>E.prepareDepartmentFunctions(world,qs));assert.equal(JSON.stringify(world),before);
 console.log('PASS malformed second-bank order is atomic');
}
{
 const world=create(),qs=plans(world),p=world.players[0];qs[0].departmentFunctionsPolicy.quotas.people.operations=2;
 const baseline=E.planBudget(p,{...qs[0],departmentFunctionsPolicy:blank()}),changed=E.planBudget(p,qs[0]);
 assert(changed.capacity<baseline.capacity);assert.equal(E.departmentFunctionsQuote(world,p,qs[0]).delivery.remainingPools.operations,2);
 const before=JSON.stringify(world);E.operatingPreview(E.publicState(world,0).me,qs[0],world.economy);assert.equal(JSON.stringify(world),before);
 console.log('PASS function work removes project/office capacity and forecasts are pure');
}
{
 const world=create(),qs=plans(world);qs[1].departmentFunctionsPolicy.vendors.risk=2;
 E.prepareDepartmentFunctions(world,qs);world.players.forEach((p,i)=>p.allocation=copy(qs[i].allocation));
 world.event=copy(E.EVENTS.find(e=>e.key==='board'));E.applyDecision(world,world.players[0],'a');
 assert(E.competitiveActionStatus(world.players[0],'talentRaid').eligible);
 const lines=E.resolveCompetitiveActions(world,[{...qs[0],competitiveAction:'talentRaid'},{...qs[1],competitiveAction:'none'}]);
 assert(lines.some(line=>/recruited a senior banker/.test(line)));
 E.deliverDepartmentFunctions(world);const victim=world.players[1],r=victim.departmentFunctionDelivery.report;
 assert.equal(victim.stats.staff,7);assert(Object.values(r.physical.shortfall).some(n=>n>0));assert.equal(r.vendors.paid.risk,2);
 for(const role of E.DepartmentFunctions.ROLES)assert(r.physical.delivered[role]<=r.physical.available[role]);
 assert.deepEqual(copy(victim.departmentFunctions.policy),qs[1].departmentFunctionsPolicy);
 console.log('PASS actual talent raid reduces delivered work without rewriting policy or unpaid vendors');
}
{
 const base=create(),qs=plans(base),unfunded=copy(base),funded=copy(base),paid=copy(qs);
 paid[0].departmentFunctionsPolicy.vendors.credit=6;paid[0].departmentFunctionsPolicy.vendors.risk=2;paid[0].departmentFunctionsPolicy.vendors.technology=2;paid[0].departmentFunctionsPolicy.vendors.treasury=4;
 paid[0].termPolicy.offer='six';qs[0].termPolicy.offer='six';
 for(let i=0;i<2;i++){E.submit(unfunded,i,qs[i]);E.submit(funded,i,paid[i]);}
 assert(funded.players[0].operatingReport.loanGrowth>unfunded.players[0].operatingReport.loanGrowth);
 assert.equal(unfunded.players[0].operatingReport.termOpened,0);assert(funded.players[0].operatingReport.termOpened>0);
 assert(funded.players[0].operatingReport.departmentFunctionExpense>0);
 assert.equal(funded.players[0].departmentFunctionDelivery.report.vendors.paidExpense,funded.players[0].operatingReport.departmentFunctionExpense);
 E.migrateCampaign(copy(funded));const view=E.publicState(funded,0);assert(view.me.departmentFunctions);assert.equal(view.rival.departmentFunctions,undefined);assert.equal(view.rival.departmentFunctionDelivery,undefined);assert.equal(view.departmentFunctionEconomy,undefined);
 const bad=copy(funded);bad.players[0].departmentFunctionDelivery.actual.paidVendorQuarters.credit=5;assert.throws(()=>E.migrateCampaign(bad));
 console.log('PASS live credit/treasury effects, owner privacy, paid evidence and strict restore');
}
{
 const world=create(),q=plans(world)[0],p=world.players[0];
 // Explicit boundary fixture, not a claim that these bankers were freely
 // acquired in gameplay. Four physical roles remain below existing office caps.
 p.stats.staff=120;p.allocation={service:30,business:30,lending:30,operations:30};q.allocation=copy(p.allocation);
 const quoted=E.departmentFunctionsQuote(world,p,q);assert(quoted.status.eligible,quoted.status.reason);assert.equal(quoted.context.headcount,120);
 assert.equal(Object.values(quoted.attribution.rawAfterTeachingQuarters).reduce((n,x)=>n+x,0),480);
 console.log('PASS over-100 total banker boundary retains distinct physical role pools');
}
{
 const world=create();let activated=0;
 for(let month=0;month<3;month++){
  const qs=plans(world),p=world.players[0],q=qs[0];q.onboardingPolicy.share=25;q.departmentFunctionsPolicy.vendors.onboarding=16;
  const quote=E.departmentFunctionsQuote(world,p,q);assert(quote.status.eligible,quote.status.reason);
  const shadow=copy(p);shadow._departmentFunctionExecution=quote.delivery;
  const budget=E.planBudget(p,q);assert.equal(budget.onboarding,E.onboardingBudget(shadow,q));
  assert.equal(budget.departmentFunctions,35200);
  const before=JSON.stringify(world),view=E.publicState(world,0),review=E.servicePlanReview(view.me,q,world.economy);
  assert.equal(JSON.stringify(world),before);assert(review.includedOperatingSpend>=35200);
  for(let i=0;i<2;i++)E.submit(world,i,qs[i]);
  assert(world.players[0].onboarding.report.cost<=budget.onboarding);activated+=world.players[0].onboarding.report.totals.activated.count;
  E.migrateCampaign(copy(world));
 }
 assert(activated>0,'Paid department intake must process real applications, not just show a workload bonus');
 console.log('PASS three live intake months, actual activation fee envelope and one included vendor expense');
}
{
 const world=create(),p=world.players[0];E.applyHiring(world,p,2,{operations:2});
 const q=plans(world)[0];q.allocation={service:3,business:2,lending:2,operations:3};q.workforcePolicy.training.operations=20000;q.leaderOrders.operations='mentor';q.departmentFunctionsPolicy.quotas.risk.operations=2;q.departmentFunctionsPolicy.vendors.people=4;
 const quote=E.departmentFunctionsQuote(world,p,q);assert(quote.status.eligible,quote.status.reason);assert.equal(quote.attribution.paidTeacherQuarters.operations,4);
 const budget=E.planBudget(p,q),staged=E.departmentPlanOperatingQuote(p,q,budget.total-budget.training).owner;staged._departmentFunctionExecution=quote.delivery;
 assert.equal(E.executionCapacity(staged,q.allocation),budget.capacity,'Specialist output and the one paid teacher must match actual execution');
 assert.equal(quote.delivery.remainingPools.operations,6);
 console.log('PASS paid specialist hiring/teacher reservation has identical quoted and delivered execution capacity');
}
{
 const base=create(),qs=plans(base),loan=base.opportunities.find(o=>o.type==='loan');assert(loan);
 const blocked=copy(base),funded=copy(base),paid=copy(qs);
 for(let i=0;i<2;i++){qs[i].opportunity=loan.id;paid[i].opportunity=loan.id;paid[i].departmentFunctionsPolicy.vendors.credit=16;}
 const quote=E.departmentFunctionsQuote(base,base.players[0],paid[0]);assert(quote.opportunity.eligible);assert.equal(quote.opportunity.required,Math.ceil(loan.value/250000));
 for(let i=0;i<2;i++){E.submit(blocked,i,qs[i]);E.submit(funded,i,paid[i]);}
 assert.equal(blocked.players.reduce((n,p)=>n+p.stats.opportunityWins,0),0);assert(blocked.resolution.some(s=>/insufficient unused department/.test(s)));
 assert.equal(funded.players.reduce((n,p)=>n+p.stats.opportunityWins,0),1);
 const winners=funded.players.filter(p=>p.departmentFunctionDelivery.opportunity?.awarded);assert.equal(winners.length,1);
 for(const p of funded.players){const w=p.departmentFunctionDelivery.opportunity;assert(['won','lost'].includes(w.result));assert(w.quote.vendorQuarters<=p.departmentFunctionDelivery.report.idleByFunction.credit.delivered.vendor);}
 E.migrateCampaign(copy(funded));assert(!funded.resolution.some(s=>/Department service orders paid/.test(s)));
 const before=JSON.stringify(funded);E.withMarket(funded,()=>E.awardOpportunity(winners[0],loan));assert.equal(JSON.stringify(funded),before,'Repeated deal award must not duplicate assets/fees');
 const tampered=copy(funded);tampered.players[0].departmentFunctionDelivery.opportunity.quote.vendorQuarters++;assert.throws(()=>E.migrateCampaign(tampered));
 console.log('PASS pipeline needs unused paid credit work, simultaneous one-winner clearing, duplicate/reforged award refusal and private vendor resolution');
}
{
 const old=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options,mode:'hotseat',scenario:'balanced',seed:'department-legacy',created:1});
 const p=E.chooseBot(old,0);E.submit(old,0,p);E.migrateCampaign(copy(old));
 const bad=copy(old);bad.players[0].submitted.departmentFunctionsPolicy=blank();assert.throws(()=>E.migrateCampaign(bad));
 for(const field of ['_departmentFunctionExecution','_departmentFunctionOpening','_departmentFunctionPaidCycle','_departmentFunctionsRaw','_departmentFunctionForecastExpense']){const malformed=copy(old);malformed.players[0][field]={};assert.throws(()=>E.migrateCampaign(malformed));}
 const view=E.publicState(old,0);view.me.submitted={departmentFunctionsPolicy:blank()};assert.throws(()=>E.validateDepartmentFunctionsView(view));
 console.log('PASS legacy half-ready restore and view reject new instructions/transients without upgrade');
}
{
 const world=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:6}).options,mode:'hotseat',scenario:'growth',seed:'department-A',created:1});
 for(let month=0;month<3;month++)for(let i=0;i<2;i++){const q=E.chooseBot(world,i),budget=E.planBudget(world.players[i],q);assert(budget.freeCapacity>=0,'AI must protect existing execution before assigning function work');E.submit(world,i,q);}
 console.log('PASS growth/department-A regression reserves committed office/project execution');
}
{
 const world=create(),orders=plans(world);delete orders[0].departmentFunctionsPolicy;
 E.submit(world,0,orders[0]);assert(world.players[0].submitted.departmentFunctionsPolicy,'Interactive omission must be normalized before commitment');
 E.migrateCampaign(copy(world));
 for(const value of [undefined,null,{quotas:{},vendors:{}}]){
  const bad=copy(world);if(value===undefined)delete bad.players[0].submitted.departmentFunctionsPolicy;else bad.players[0].submitted.departmentFunctionsPolicy=value;
  assert.throws(()=>E.validatePilot(bad));assert.throws(()=>E.migrateCampaign(bad));
 }
 E.submit(world,1,orders[1]);E.migrateCampaign(copy(world));
 for(const value of [undefined,null,{quotas:{},vendors:{}}]){
  const bad=copy(world);for(const p of bad.players){if(value===undefined)delete bad.lastPlans[p.id].departmentFunctionsPolicy;else bad.lastPlans[p.id].departmentFunctionsPolicy=value;}
  assert.throws(()=>E.validatePilot(bad));assert.throws(()=>E.migrateCampaign(bad));
  const view=E.publicState(world,0);if(value===undefined)delete view.lastPlans[view.me.id].departmentFunctionsPolicy;else view.lastPlans[view.me.id].departmentFunctionsPolicy=value;
  assert.throws(()=>E.validateDepartmentFunctionsView(view));
 }
 console.log('PASS actual half-ready and settled save/view require canonical function orders; interactive omission still defaults');
}
if(process.argv.includes('--checkpoint')){
 const fixture=require('../reports/qa/department-group6-matrix192-first.json').failureCheckpoint,world=copy(fixture.openingGame),seat=fixture.submittingSeat;
 const q=E.chooseBot(world,seat),budget=E.planBudget(world.players[seat],q);assert(budget.freeCapacity>=0);E.submit(world,seat,q);
 console.log('PASS exact captured conversion failure checkpoint now produces legal AI plan '+JSON.stringify({capacity:budget.capacity,load:budget.load,convert:q.facilityPolicy.convert}));
}
