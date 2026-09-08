'use strict';
// Actual assembled Group5 campaigns, with quarantined code injected in memory.
// No manifest mutation, campaign flag rewrite or live department effects.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const html=require('../tools/build_game').assemble().html,engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const prototypes=read('experiments/institution/department-functions.js')+'\n'+read('experiments/institution/department-function-context.js'),ctx={console};
vm.runInNewContext(engine.replace('root.BWEngine={',prototypes+'\nroot.BWEngine={DepartmentFunctions,DepartmentFunctionContext,facilityLifecyclePlanningContext,departmentProductiveAllocation,'),ctx);
const E=ctx.BWEngine,D=E.DepartmentFunctions,C=E.DepartmentFunctionContext;let checks=0,months=0,combinations=0,positiveEvidence=null;
const settings=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options;
function test(name,fn){try{fn();checks++;}catch(error){error.message=name+': '+error.message;throw error;}}
function fixture(scenario='balanced',seed='context-attribution'){return E.createGame({...settings,mode:'hotseat',scenario,seed,created:1});}
function quiet(g){g.event=copy(E.EVENTS.find(e=>e.key==='quiet'));}
function plan(g,i=0){const p=g.players[i],q=E.chooseBot(g,i);q.allocation=copy(p.allocation);q.newProjects=[];q.newProject=null;q.investments={};q.hires=0;q.specialistHires=E.emptySpecialistOrders();q.competitiveAction='none';
 q.facilityPolicy=E.defaultFacilityPolicy();q.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);q.agencyPolicy=E.defaultAgencyPlan(p);q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;
 q.contractBid=null;q.opportunity=null;q.capitalAction=false;q.decision='b';q.advertisingPolicy.budget=0;
 q.servicePolicy.staff=0;q.householdPolicy.retention=25;q.relationshipOfferPolicy.share=0;q.onboardingPolicy.share=0;q.collectionsPolicy.share=0;
 for(const role of D.ROLES){q.workforcePolicy.training[role]=0;q.leaderOrders[role]=null;}return q;}
function inspect(g,p,q){
 const before=JSON.stringify({g,p,q}),result=C.build(g,p,q),actual=E.lifecycleInstructionQuote(g,p,q).availableStaffQuarters;
 assert(result.enabled);assert.equal(JSON.stringify({g,p,q}),before,'Attribution must not mutate or draw RNG.');
 const trial=D.initialize(p,g.cycle,true),kernel=D.quote(trial,undefined,result.context);
 for(const r of D.ROLES){const a=result.attribution,exactRetained=Object.values(a.exactRetainedQuarters).reduce((n,row)=>n+row[r],0),quantizedRetained=Object.values(result.context.retainedQuarters).reduce((n,row)=>n+row[r],0);
  assert.equal(a.facilityPools[r],actual[r]);assert.equal(kernel.remainingPools[r],actual[r]);
  assert.equal(a.assignedQuarters[r],a.paidTeacherQuarters[r]+a.rawAfterTeachingQuarters[r]);
  assert(Math.abs(a.rawAfterTeachingQuarters[r]-exactRetained-a.facilityPools[r]-a.residualRoundingHold[r])<1e-8);
  assert.equal(a.rawAfterTeachingQuarters[r],quantizedRetained+kernel.remainingPools[r]+a.uncreditedQuantizationHold[r]);
  assert(a.uncreditedQuantizationHold[r]>=0);assert.equal(kernel.overcommittedPools[r],0);
 }
 assert.equal(result.context.headcount,p.stats.staff);assert.equal(p.departmentFunctions,undefined);assert(Object.values(result.context.vendorSupply).every(n=>n===0));return result;
}
test('actual creation and owner-public attribution match without rival data',()=>{const g=fixture(),q=plan(g),r=inspect(g,g.players[0],q),view=E.publicState(g,0),a=C.build(view,view.me,q);
 assert.deepEqual(copy(a),copy(r));assert.equal(g.version,'9.4');assert.equal(r.workloadSources.loanPrincipal,g.players[0].stats.loans);assert.equal(r.workloadSources.depositPrincipal,g.players[0].stats.deposits);
 assert.equal(r.workloadSources.businessRelationships,58);assert.equal(r.workloadSources.merchantRelationships,38);assert.equal(r.workloadSources.riskPoints,12);
 assert.equal(r.context.workloads.people,1);assert.equal(r.context.workloads.credit,5);assert.equal(r.context.workloads.risk,2);assert.equal(r.context.workloads.treasury,2);
 assert.equal(Object.values(r.context.workloads).reduce((a,b)=>a+b,0),23,'Opening proxy workload must leave aggregate room for the physical office, not demand fifteen employees from eight.');
 assert(r.context.workloads.technology>0);});
test('sequential reservation grid conserves exact residual without cumulative ceiling losses',()=>{const g=fixture(),p=g.players[0],q=plan(g);
 for(const retention of [25,50,75,100])for(const offers of [0,25,50])for(const onboarding of [0,25,50])for(const collections of [0,25,50,75,100]){
  q.householdPolicy.retention=retention;q.relationshipOfferPolicy.share=offers;q.onboardingPolicy.share=onboarding;q.collectionsPolicy.share=collections;
  const r=inspect(g,p,q);assert.equal(r.attribution.facilityPools.service,Math.floor(q.allocation.service*4*(1-retention/100)*(1-offers/100)*(1-onboarding/100)));combinations++;
 }
 // 3 bankers, 25% retention, 25% offers, 25% onboarding:5.0625 remaining
 // quarters floors to5, not4 from separate ceiling reservations.
 q.householdPolicy.retention=25;q.relationshipOfferPolicy.share=25;q.onboardingPolicy.share=25;
 const r=inspect(g,p,q);assert.equal(r.attribution.facilityPools.service,5);assert.equal(r.attribution.residualRoundingHold.service,.0625);assert.equal(r.attribution.uncreditedQuantizationHold.service,1);
 assert.equal(r.context.physicalQuarters.service,11,'One uncredited quantization quarter is explicit, never a departed employee.');assert.equal(r.context.headcount,8);
});
test('paid teacher consumes one actual banker; specialty skill never multiplies pool',()=>{const g=fixture(),p=g.players[0];p.workforce.departments.business.count=2;p.workforce.departments.business.skill=20;p.allocation={service:3,business:3,lending:1,operations:1};E.validatePilot(g);
 const q=plan(g);q.allocation=copy(p.allocation);q.leaderOrders.business='mentor';q.workforcePolicy.training.business=20000;
 const a=inspect(g,p,q);assert.equal(a.attribution.paidTeacherQuarters.business,4);assert.equal(a.attribution.facilityPools.business,8);assert.equal(a.workloadSources.paidTrainingRoles,1);
 q.servicePolicy.staff=3;const b=inspect(g,p,q);assert.equal(b.attribution.facilityPools.business,0);assert.equal(b.context.retainedQuarters.onboarding.business,8,'When service fills the whole role the teacher comes out of service, not negative sales.');
 q.servicePolicy.staff=0;q.departmentPolicy.reserve=10000000;const paused=inspect(g,p,q);assert.equal(paused.attribution.paidTeacherQuarters.business,0);assert.equal(paused.attribution.facilityPools.business,12);assert.equal(paused.workloadSources.paidTrainingRoles,0);
});
test('specialist productivity and legacy vendor capacity never become office bankers',()=>{const g=fixture(),p=g.players[0],q=plan(g);p.workforce.departments.service.count=2;p.workforce.departments.service.skill=90;p.workforce.departments.business.count=1;p.workforce.departments.business.skill=90;E.validatePilot(g);
 q.servicePolicy.staff=1;const baseline=inspect(g,p,q);q.servicePolicy.outsourcing=4;const outsourced=inspect(g,p,q);
 assert.deepEqual(copy(outsourced.attribution),copy(baseline.attribution));assert.equal(outsourced.attribution.facilityPools.business,(q.allocation.business-1)*4);
});
test('every physical role can fund one teacher without multiplying people or operations',()=>{const g=fixture(),p=g.players[0];p.allocation={service:2,business:2,lending:2,operations:2};
 for(const role of D.ROLES){p.workforce.departments[role].count=2;p.workforce.departments[role].skill=20;}E.validatePilot(g);
 const q=plan(g);q.departmentPolicy.envelopes.leadership=200000;for(const role of D.ROLES){q.leaderOrders[role]='mentor';q.workforcePolicy.training[role]=20000;}
 const result=inspect(g,p,q);for(const role of D.ROLES){assert.equal(result.attribution.paidTeacherQuarters[role],4);assert.equal(result.attribution.rawAfterTeachingQuarters[role],4);}
 assert.equal(result.attribution.facilityPools.operations,4);assert.equal(result.context.headcount,8);assert.equal(result.workloadSources.paidTrainingRoles,4);assert.equal(result.context.workloads.people,5);
});
test('zero offer/onboarding/collections shares reserve zero respective work',()=>{const g=fixture(),q=plan(g),r=inspect(g,g.players[0],q);
 assert.equal(r.attribution.exactRetainedQuarters.relationships.service,0);assert.equal(r.attribution.exactRetainedQuarters.collections.lending,0);
 assert.equal(r.attribution.exactRetainedQuarters.onboarding.service,q.allocation.service);assert.equal(r.workloadSources.pendingApplications,0);
});
test('new vendors require explicit authored supply and net shared funds',()=>{const g=fixture(),p=g.players[0],q=plan(g),supply=Object.fromEntries(D.IDS.map(id=>[id,id==='technology'?2:0]));
 const before=JSON.stringify(supply),result=C.build(g,p,q,{vendorSupply:supply});assert.equal(JSON.stringify(supply),before);assert.equal(result.context.vendorSupply.technology,2);
 const shared=E.facilityLifecyclePlanningContext(g,p,q);assert.equal(result.context.freeCash,Math.max(0,Math.floor(shared.remaining)));
 q.departmentPolicy.reserve=10000000;assert.equal(C.build(g,p,q).context.freeCash,0);
 assert.throws(()=>C.build(g,p,q,{autoHire:true}));supply.people=17;assert.throws(()=>C.build(g,p,q,{vendorSupply:supply}));
});
test('invalid role allocations refused instead of phantom staff repair',()=>{const g=fixture(),q=plan(g);q.allocation.operations=99;assert.throws(()=>C.build(g,g.players[0],q),/headcount|bankers|allocation|staff/i);});
test('older supported configurations return disabled without installing books',()=>{for(const version of [1,3,4]){const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options,g=E.createGame({...options,mode:'hotseat',seed:'context-off:'+version,created:1}),q=E.chooseBot(g,0),before=JSON.stringify(g);
 const r=C.build(g,g.players[0],q);assert.equal(r.enabled,false);assert.equal(r.context,null);assert.equal(JSON.stringify(g),before);assert.equal(g.players[0].departmentFunctions,undefined);}});
test('positive earned product/application, term, application-queue and delinquency source coverage',()=>{
 const g=fixture('balanced','function-positive-books'),costs={research:0,products:0,applications:0},seen={pending:0,late:0,term:0,contracts:0,applicationBill:0,productBill:0};let activeEvidence;
 for(let month=0;month<9;month++){
  quiet(g);const plans=g.players.map((_,i)=>plan(g,i)),p=g.players[0],q=plans[0];q.termPolicy={offer:'six',maturity:'renew'};q.onboardingPolicy.share=50;
  const needed=Math.max(0,E.CAPABILITY_TIERS.commercial[0]-E.capabilitySpend(p,'commercial'));
  if(needed){q.investments.commercial=Math.min(needed,E.CAPABILITY_CAP_PER_CYCLE);q.specializations.commercial=Object.keys(E.STRATEGY_SPECIALIZATIONS.commercial)[0];costs.research+=q.investments.commercial;}
  if(month===0){q.newProjects=['licenseRewards'];costs.products+=E.projectCost(p,E.PROJECTS.licenseRewards);}
  if(E.strategyLevel(p,'commercial')>=1&&!p.serviceDesk.applications.treasury&&!p.projects.some(x=>x.key==='partnerTreasuryDesk')){
   q.newProjects=['partnerTreasuryDesk'];costs.applications+=E.projectCost(p,E.PROJECTS.partnerTreasuryDesk);
  }
  if(p.serviceDesk.applications.treasury)q.servicePolicy.treasury=true;
  q.servicePolicy.staff=1;q.servicePolicy.outsourcing=1;
  const proposed={...p,allocation:q.allocation,serviceDesk:{...p.serviceDesk,policy:q.servicePolicy}};
  const target=g.serviceAgreements.find(c=>c.owner!==p.id&&E.serviceBidStatus(proposed,c).eligible);if(target)q.contractBid=target.id;
  const reviewed=inspect(g,p,q);if(reviewed.workloadSources.activeProducts&&reviewed.workloadSources.activeApplications)activeEvidence={g:copy(g),q:copy(q),reviewed:copy(reviewed)};
  E.submit(g,0,q);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);months++;
  const owner=g.players[0],next=plan(g),r=inspect(g,owner,next),sources=r.workloadSources;
  seen.pending=Math.max(seen.pending,sources.pendingApplications);seen.late=Math.max(seen.late,sources.latePrincipal);seen.term=Math.max(seen.term,sources.termVintages);seen.contracts=Math.max(seen.contracts,sources.contractLoad);
  seen.applicationBill=Math.max(seen.applicationBill,owner.operatingReport.servicePlatform||0);seen.productBill=Math.max(seen.productBill,owner.operatingReport.productProgramCost||0);
  assert.equal(sources.pendingApplications,owner.onboarding.pending.reduce((n,row)=>n+row.count,0));
  assert.equal(sources.loanPrincipal,owner.creditBook.cohorts.reduce((n,row)=>n+row.principal,0));assert.equal(sources.loanPrincipal,owner.accounting.accounts.loans);
  assert.equal(sources.latePrincipal,owner.creditBook.cohorts.reduce((n,row)=>n+row.late.reduce((a,b)=>a+b,0),0));
  const terms=owner.depositBook.cohorts.filter(c=>c.locked===true);assert(terms.every(c=>c.product==='highYield'&&c.remaining>=1&&c.remaining<=6));
  assert.equal(sources.termVintages,terms.length);assert.equal(E.termSummary(owner).locked,terms.reduce((n,c)=>n+c.principal,0));
  assert.equal(sources.contractLoad,owner.serviceDesk.contracts.reduce((n,c)=>n+E.SERVICE_TYPES[c.kind].load,0));
 }
 assert(costs.research>0&&costs.products>0&&costs.applications>0);assert.equal(costs.research,E.CAPABILITY_TIERS.commercial[0]);
 for(const [name,value]of Object.entries(seen))assert(value>0,'Positive real '+name+' book must be exercised');assert(activeEvidence,'Paid deployed product and activated application must both be present');
 const {g:active,q,reviewed}=activeEvidence,p=active.players[0];assert.equal(p.productPrograms.products.rewards.route,'partner');assert.equal(p.productDeployment.ready.rewards,true);assert.equal(p.serviceDesk.applications.treasury,'partner');
 assert(reviewed.workloadSources.activeProducts>=1);assert(reviewed.workloadSources.activeApplications>=1);assert(p.buildSpend>=costs.products+costs.applications,'Project starts must be paid, not finishProject grants');
 const off=copy(q);off.servicePolicy.treasury=false;const offQuote=C.build(active,p,off);assert.equal(reviewed.rawWorkloads.technology-offQuote.rawWorkloads.technology,2,'An actually deployed but switched-off app is not counted active');
 const retired=copy(q);retired.productProgramPolicy.retire=['rewards'];for(const market of Object.values(retired.productProgramPolicy.markets))for(const mix of Object.values(market)){mix.essential=4;mix.rewards=0;}
 const retireQuote=C.build(active,p,retired);assert.equal(reviewed.workloadSources.activeProducts-retireQuote.workloadSources.activeProducts,1,'Staged retirement removes active maintenance workload without deleting existing accounts');
 positiveEvidence={months:9,costs,maxima:seen,activeProducts:reviewed.workloadSources.activeProducts,activeApplications:reviewed.workloadSources.activeApplications};
});
test('positive borrowed-funding accounting fixture maps liabilities, not free profit',()=>{
 // Explicit accounting-boundary fixture, NOT a claim that the department
 // prototype can order borrowing. Existing engine borrow posts cash+debt with
 // unchanged equity; no gift, arbitrary stats edit or new production action.
 const g=fixture(),p=g.players[0],q=plan(g),before=inspect(g,p,q),equity=p.accounting.accounts.equity,cash=p.accounting.accounts.cash;
 p.accounting=E.AccountingPrototype.transact(p.accounting,'borrow',250000);p.stats.cash=p.accounting.accounts.cash;p.stats.emergencyDebt=p.accounting.accounts.emergencyDebt;
 E.validatePilot(g);E.AccountingPrototype.check(p.accounting);const after=inspect(g,p,q);
 assert.equal(p.accounting.accounts.cash-cash,250000);assert.equal(p.accounting.accounts.equity,equity);assert.equal(after.workloadSources.emergencyDebt,250000);
 assert(Math.abs(after.rawWorkloads.treasury-before.rawWorkloads.treasury-1)<1e-12,'Fractional workload estimates have normal binary floating-point precision; cash/debt checks above remain exact.');
 assert.equal(after.context.workloads.treasury-before.context.workloads.treasury,1);
 assert.deepEqual(copy(after.attribution),copy(before.attribution));
});
test('real deterministic campaigns preserve owner workload/conservation checks across months',()=>{for(const scenario of ['balanced','rate','regulatory','growth'])for(const seed of ['function-A','function-B']){
 const g=fixture(scenario,seed);for(let month=0;month<3;month++){assert(!g.gameOver);quiet(g);const plans=g.players.map((p,i)=>plan(g,i));plans[0].onboardingPolicy.share=25;plans[0].relationshipOfferPolicy.share=25;
  for(let i=0;i<2;i++)inspect(g,g.players[i],plans[i]);E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);months++;
  const saved=copy(g);E.migrateCampaign(saved);E.validatePilot(saved);assert.equal(g.players[0].departmentFunctions,undefined);
 }
}});
console.log(JSON.stringify({suite:'experimental-department-function-context',checks,combinations,months,positiveEvidence,sourceEngineHash:createHash('sha256').update(engine).digest('hex'),integrated:false,scope:'Actual Group5 planning, funded projects/products, shared staff/cash and positive book-derived workload evidence. Explicit specialist/borrow accounting fixtures; quantization hold visible. No function effects, save schema, UI or transport integration.'}));
