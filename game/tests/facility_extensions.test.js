'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const html=require('../tools/build_game').assemble().html,c={console};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);const E=c.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
function game(){return E.createGame({...E.previewFeatureSelection({},{field:'facilityExtensionsVersion',value:1}).options,mode:'hotseat',seed:'office-suites',created:1});}
function plan(g,i){
 const p=g.players[i],a=E.chooseBot(g,i);
 a.newProjects=[];a.newProject=null;a.investments={};a.hires=0;a.specialistHires=E.emptySpecialistOrders();a.competitiveAction='none';a.opportunity=null;a.contractBid=null;
 a.facilityPolicy=E.defaultFacilityPolicy();a.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);a.facilityExtensionPolicy={start:null,cancel:null};
 a.commercialAccountPolicy={target:null,staffQuarters:0};a.servicePolicy.staff=0;
 a.allocation={...p.allocation};
 for(const row of Object.values(a.departmentFunctionsPolicy.quotas))for(const role of Object.keys(row))row[role]=0;
 for(const k of Object.keys(a.departmentFunctionsPolicy.vendors))a.departmentFunctionsPolicy.vendors[k]=0;
 a.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,a).policy;
 return a;
}
test('Suites have explicit canonical rules, no historical auto-upgrade, and private books',()=>{
 const g=game();assert.equal(g.version,'9.11');E.validatePilot(g);
 const v=E.publicState(g,0);assert.equal(v.facilityExtensionsVersion,1);assert(!v.rival.facilityExtensions);E.validateFinancialGroupView(v);
 const old=E.createGame({...E.previewFeatureSelection({},{field:'commercialAccountsVersion',value:1}).options,seed:1,created:1});
 assert.equal(old.version,'9.10');assert(!E.migrateCampaign(copy(old)).facilityExtensionsVersion);
 assert.throws(()=>E.createGame({facilityExtensionsVersion:1}));
 assert.throws(()=>E.migrateCampaign({...copy(g),version:'9.10'}));
 assert.throws(()=>E.migrateCampaign({...copy(g),facilityExtensionsVersion:2}));
 assert.throws(()=>E.validateFinancialGroupView({...copy(v),rival:{...copy(v.rival),facilityExtensions:copy(v.me.facilityExtensions)}}));
});
test('A paid suite uses the existing location, finite staffing and real construction before activation',()=>{
 const g=game();let p=g.players[0];const id=p.facilityNetwork.offices[0].id,a=plan(g,0);
 const before=JSON.stringify(g),q=E.facilityExtensionQuote(g,p,a,id);
 assert(q.eligible,q.reason);assert.equal(JSON.stringify(g),before);
 assert.equal(E.planBudget(p,q.plan,g).total-E.planBudget(p,a,g).total,180000);
 // Direct preparation verifies the paired transaction independently of other
 // monthly company flows. Its fences prevent a duplicate message paying twice.
 const transaction=copy(g),plans=[q.plan,plan(g,1)],cash=transaction.players[0].stats.cash,
   supplier=transaction.facilityEconomy.supplier.accounts.cash;
 E.prepareFacilityExtensions(transaction,plans);
 assert.equal(transaction.players[0].stats.cash,cash-180000);
 assert.equal(transaction.facilityEconomy.supplier.accounts.cash,supplier+180000);
 assert.equal(E.facilityExtensionCommitment(transaction.players[0],q.plan).cost,0,'Already paid construction is not reserved twice');
 const once=JSON.stringify(transaction);E.prepareFacilityExtensions(transaction,plans);assert.equal(JSON.stringify(transaction),once);
 const officeCount=p.facilityNetwork.offices.length,branches=copy(p.branches);
 for(let month=0;month<3;month++){
   const orders=[plan(g,0),plan(g,1)];if(!month)orders[0].facilityExtensionPolicy={start:id,cancel:null};
   E.submit(g,0,orders[0]);E.submit(g,1,orders[1]);E.validatePilot(g);
   p=g.players[0];
   assert.equal(p.facilityNetwork.offices.length,officeCount);assert.deepEqual(copy(p.branches),branches);
   const v=E.publicState(g,0);E.validateFinancialGroupView(v);assert(!v.lastPlans?.[v.rival.id]?.facilityExtensionPolicy);
 }
 assert(E.facilityExtensionActive(p,id),JSON.stringify(p.facilityExtensions));assert.equal(p.facilityNetwork.offices[0].model,'retail');
 const metric=owner=>E.FacilityLifecycle.metrics(owner,E.facilityLifecycleLiveContext(owner)).rows[0];
 const current=copy(p),bare=copy(p);delete bare.facilityExtensions;
 assert.equal(metric(current).upkeep-metric(bare).upkeep,6000);
 assert.equal(metric(current).maintenance-metric(bare).maintenance,720);
 // Isolate the physical kernel with an explicit existing-time allocation.
 const context=E.facilityLifecycleLiveContext(current);context.availableStaffQuarters={service:8,business:4,lending:4,operations:3,wealth:0};
 current.facilityLifecycle.records[id].staffQuarters={...context.availableStaffQuarters};
 bare.facilityLifecycle.records[id].staffQuarters={service:8,business:0,lending:2,operations:2,wealth:0};
 const full=E.FacilityLifecycle.metrics(current,context).rows[0],base=E.FacilityLifecycle.metrics(bare,context).rows[0];
 assert(full.capacity.loanCapacity>base.capacity.loanCapacity);
 assert.deepEqual(copy(full.effectiveStaffQuarters),context.availableStaffQuarters,'Combined services do not invent time');
 current.facilityLifecycle.records[id].staffQuarters.business=0;
 assert(E.FacilityLifecycle.metrics(current,context).rows[0].capacity.loanCapacity<full.capacity.loanCapacity,'An unstaffed suite has no own output');
 current.facilityLifecycle.records[id].conditionBp=1500;
 assert.equal(E.FacilityLifecycle.metrics(current,context).rows[0].capacity.loanCapacity,0,'Host condition also disables the suite');
});
test('Shared location, space, funding and cancellation guards preserve the full plan',()=>{
 const g=game(),p=g.players[0],id=p.facilityNetwork.offices[0].id,a=plan(g,0),q=E.facilityExtensionQuote(g,p,a,id);
 assert(q.eligible,q.reason);
 const conflict=copy(q.plan);conflict.newProjects=['branchAtm'];conflict.newProject='branchAtm';conflict.projectTargets={branchAtm:p.focus};
 assert.match(E.projectLocationsIssue(g,p,conflict),/suite construction/);
 assert.throws(()=>E.normalizeFacilityExtensionPlan(g,p,conflict),/construction job/);
 const poor=copy(p);poor.stats.cash=0;assert(!E.facilityExtensionQuote(g,poor,a,id).eligible);
 assert(!E.facilityExtensionQuote(g,p,a,g.players[1].facilityNetwork.offices[0].id).eligible,'Foreign offices are not valid targets');
 const t=copy(g);E.prepareFacilityExtensions(t,[q.plan,plan(g,1)]);
 const owner=t.players[0],duplicate=copy(a);duplicate.facilityExtensionPolicy={start:id,cancel:null};
 assert.throws(()=>E.normalizeFacilityExtensionPlan(t,owner,duplicate),/already has/);
 // Prepare is idempotent, and cancel requires a later planning month. Advance
 // with no Operations work to test a genuinely unfinished, paid work order.
 owner.allocation.operations=0;owner._facilityExecutionUsed=E.executionCapacity(owner);
 E.advanceFacilityExtensions(t);assert.equal(owner.facilityExtensions.offices[id].work,0);
 const priorCash=owner.stats.cash,priorSupplier=t.facilityEconomy.supplier.accounts.cash;
 t.cycle++;owner.facilityLifecycle.lastActivatedCycle=t.cycle;
 const cancellation=copy(a);cancellation.facilityExtensionPolicy={start:null,cancel:id};
 // Only exercise this bank: counterpart preparation still has its own fence.
 t.players[1].facilityLifecycle.lastActivatedCycle=t.cycle;
 E.normalizeFacilityExtensionPlan(t,owner,cancellation);E.prepareFacilityExtensions(t,[cancellation,plan(g,1)]);
 assert(!owner.facilityExtensions.offices[id]);assert.equal(owner.stats.cash,priorCash);assert.equal(t.facilityEconomy.supplier.accounts.cash,priorSupplier);
});
