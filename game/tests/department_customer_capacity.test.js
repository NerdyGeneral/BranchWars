'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm'),crypto=require('node:crypto');
const html=require('../tools/build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx={console};
vm.runInNewContext(source.replace('root.BWEngine={','root.BWEngine={departmentCustomerPreview,departmentCustomerStaffingDetails,departmentFunctionTaskFte,departmentFunctionExpertise,departmentFunctionExpertBonus,departmentFunctionResidual,departmentFunctionFrozenBonus,validateDepartmentFunctionOwner,validateDepartmentFunctionsView,validateOnboardingSave,validateRelationshipOfferSave,prepareDepartmentFunctions,deliverDepartmentFunctions,settleDepartmentLeadership,applyHiring,applyDecision,specialistBonus,onboardingStaff,'),ctx);
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
function create(){return E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:6}).options,mode:'hotseat',scenario:'balanced',seed:'department-customer-capacity',created:1});}
function blank(){return {quotas:Object.fromEntries(E.DepartmentFunctions.IDS.map(id=>[id,Object.fromEntries(E.DepartmentFunctions.ROLES.map(r=>[r,0]))])),vendors:Object.fromEntries(E.DepartmentFunctions.IDS.map(id=>[id,0]))};}
function plans(g){return g.players.map((p,i)=>{
 const q=E.chooseBot(g,i);q.allocation=copy(p.allocation);q.newProjects=[];q.newProject=null;q.investments={};q.hires=0;q.specialistHires=E.emptySpecialistOrders();q.competitiveAction='none';q.facilityPolicy=E.defaultFacilityPolicy();q.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);
 q.householdPolicy.retention=25;q.collectionsPolicy.share=25;q.relationshipOfferPolicy.share=25;q.onboardingPolicy.share=25;q.servicePolicy.staff=0;q.servicePolicy.outsourcing=0;q.advertisingPolicy.budget=0;
 q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;q.agencyPolicy=E.defaultAgencyPlan(p);q.contractBid=null;q.opportunity=null;q.capitalAction=false;q.departmentFunctionsPolicy=blank();
 for(const r of E.DepartmentFunctions.ROLES){q.workforcePolicy.training[r]=0;q.leaderOrders[r]=null;}return q;
});}
const archive=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'fixtures/department-captured-regressions.json.gz'))));
const captured=archive.cases.find(c=>c.id==='onboarding-delivery-month37');assert(captured);
let repaired;
check('immutable actual month37 orders settle, validate, preserve capacity and release only authorized residual sales',()=>{
 const g=E.migrateCampaign(copy(captured.openingGame));E.validatePilot(g);
 const orders=copy(captured.pending);assert.equal(orders.length,2);
 E.submit(g,0,orders[0]);const resumed=E.migrateCampaign(copy(g));E.submit(g,1,orders[1]);E.submit(resumed,1,orders[1]);
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(resumed)).digest('hex'),crypto.createHash('sha256').update(JSON.stringify(g)).digest('hex'),'Half-ready canonical continuation must be exact');E.validatePilot(g);E.migrateCampaign(copy(g));
 const p=g.players.find(p=>p.id==='bank-c9c012ba'),r=p.onboarding.report;
 assert.equal(r.cycle,37);assert.equal(r.staffingVersion,2);assert.equal(r.assignedStaff,.125);assert.equal(r.capacity,2);assert.equal(r.salesStaff,.25);
 assert.equal(p.departmentFunctionDelivery.report.physical.unassigned.service,4);
 for(let i=0;i<2;i++){const v=E.publicState(g,i);E.validateDepartmentFunctionsView(v);assert(!('departmentFunctionDelivery' in v.rival));assert(!('departmentFunctionEconomy' in v));}
 repaired=g;
});
check('strict report version/evidence boundary and frozen expertise tampering rejected',()=>{
 const mutations=[p=>{delete p.onboarding.report.staffingVersion;},p=>{delete p.relationshipOffers.report.staffingVersion;},p=>{delete p.departmentFunctionDelivery.expertise;},
  p=>{p.onboarding.report.staffingVersion=1;},p=>{p.onboarding.report.salesStaff++;},p=>{p.onboarding.report.assignedStaff++;},
  p=>{p.departmentFunctionDelivery.expertise.extra=0;},p=>{p.departmentFunctionDelivery.expertise.roles.service.count=p.stats.staff+1;},
  p=>{p.departmentFunctionDelivery.expertise.roles.service.skill=101;},p=>{p.departmentFunctionDelivery.expertise.roles.service.allocation++;},
  p=>{p.departmentFunctionDelivery.expertise.roles.service.teaching=true;},p=>{p._departmentFunctionExpertise={};}];
 for(const mutate of mutations){const bad=copy(repaired);mutate(bad.players[0]);assert.throws(()=>E.validatePilot(bad));assert.throws(()=>E.migrateCampaign(copy(bad)));}
 for(const field of ['onboarding','relationshipOffers']){const view=E.publicState(repaired,0);view.me[field].report.salesStaff++;assert.throws(()=>E.validateDepartmentFunctionsView(view));}
 const old=copy(captured.openingGame);E.validatePilot(old);
 for(const field of ['onboarding','relationshipOffers']){const bad=copy(old);bad.players[0][field].report.staffingVersion=2;assert.throws(()=>E.validatePilot(bad));}
});
check('funded vendor customer throughput cannot consume or make residual staff negative',()=>{
 const g=create(),qs=plans(g);qs[0].allocation={service:0,business:2,lending:2,operations:4};qs[0].departmentFunctionsPolicy.vendors.relationships=16;qs[0].departmentFunctionsPolicy.vendors.onboarding=16;
 for(const office of Object.values(qs[0].facilityLifecyclePolicy.offices))for(const role of E.DepartmentFunctions.ROLES)office.staffQuarters[role]=0;
 const before=JSON.stringify(g),v=E.publicState(g,0),preview=E.departmentCustomerPreview(v.me,v,qs[0]);assert.equal(JSON.stringify(g),before);
 for(const id of ['relationshipOffers','onboarding']){const r=preview[id],s=preview.staffing[id];assert.equal(r.staffingVersion,2);assert(r.assignedStaff>=0);assert(r.salesStaff>=0);assert.equal(r.salesStaff,s.salesStaff);assert.equal(s.assignedStaff,s.physicalAssigned+s.vendorStaff+s.expertise);}
 E.submit(g,0,qs[0]);E.submit(g,1,qs[1]);E.validatePilot(g);
 const p=g.players[0];assert.equal(p.departmentFunctions.report.vendorExpense,16*3000+16*2200);
 const s=E.departmentCustomerStaffingDetails(p.departmentFunctionDelivery.report,p.departmentFunctionDelivery.expertise,'applicationProcessing');
 const offers=E.departmentCustomerStaffingDetails(p.departmentFunctionDelivery.report,p.departmentFunctionDelivery.expertise,'offerSales');
 assert(offers.vendorStaff>0||s.vendorStaff>0);assert.equal(p.onboarding.report.assignedStaff,s.assignedStaff);assert.equal(p.onboarding.report.salesStaff,s.salesStaff);
});
check('paid specialists and mentoring freeze actual delivery through subsequent skill/cash changes',()=>{
 // Explicit funded boundary fixture: existing bank cash pays the real hiring
 // API. This is not claimed as an ordinary completed campaign month.
 const g=create();E.applyHiring(g,g.players[0],2,{service:2});const qs=plans(g),p=g.players[0];
 qs[0].allocation={service:5,business:2,lending:2,operations:1};qs[0].workforcePolicy.training.service=20000;qs[0].leaderOrders.service='mentor';qs[0].departmentFunctionsPolicy.vendors.people=4;
 const actual=copy(g);E.validatePilot(actual);const preview=E.departmentCustomerPreview(E.publicState(actual,0).me,E.publicState(actual,0),qs[0]);
 E.submit(actual,0,qs[0]);E.submit(actual,1,qs[1]);E.validatePilot(actual);E.migrateCampaign(copy(actual));
 const closed=actual.players[0],history=closed.departmentFunctionDelivery.expertise.roles.service;
 assert(history.teaching);assert(closed.operatingReport.trainingGain_service>0);assert.equal(closed.workforce.departments.service.skill,history.skill+closed.operatingReport.trainingGain_service);
 assert.equal(closed.onboarding.report.assignedStaff,preview.onboarding.assignedStaff);
 assert.equal(closed.operatingReport.specialistBonus_service,E.departmentFunctionExpertBonus(closed.departmentFunctionDelivery.expertise,closed.departmentFunctionDelivery.actual.physicalQuarters,'service'));
 E.prepareDepartmentFunctions(g,qs);for(let i=0;i<2;i++){g.players[i].allocation=copy(qs[i].allocation);g.players[i].workforce.policy=copy(qs[i].workforcePolicy);}
 E.settleDepartmentLeadership(g,qs);E.deliverDepartmentFunctions(g);
 const e=p._departmentFunctionExpertise,r=p._departmentFunctionExecution;assert(e.roles.service.teaching);assert.equal(r.physical.available.service,16);
 const assigned=E.departmentFunctionTaskFte(p,'applicationProcessing',0),bonus=E.specialistBonus(p,'service');
 p.workforce.departments.service.skill=100;p._departmentTraining={paused:true};
 assert.equal(E.departmentFunctionTaskFte(p,'applicationProcessing',0),assigned);assert.equal(E.specialistBonus(p,'service'),bonus);
 const hypothetical={...p.allocation,service:p.allocation.service-1};assert.equal(E.departmentFunctionFrozenBonus(p,'service',hypothetical),null);
 const raw=copy(p);raw._departmentFunctionsRaw=true;assert.equal(E.departmentFunctionFrozenBonus(raw,'service'),null);
});
check('actual competitive staffing loss scales physical task evidence but not paid vendor work',()=>{
 const g=create(),qs=plans(g);qs[1].departmentFunctionsPolicy.vendors.onboarding=16;
 E.prepareDepartmentFunctions(g,qs);g.players.forEach((p,i)=>p.allocation=copy(qs[i].allocation));
 g.event=copy(E.EVENTS.find(e=>e.key==='board'));E.applyDecision(g,g.players[0],'a');
 E.resolveCompetitiveActions(g,[{...qs[0],competitiveAction:'talentRaid'},qs[1]]);E.deliverDepartmentFunctions(g);
 const p=g.players[1],saved=p.departmentFunctionDelivery;assert.equal(p.stats.staff,7);
 assert(Object.values(saved.report.physical.shortfall).some(n=>n>0));assert.equal(saved.report.vendors.paid.onboarding,16);
 for(const role of E.DepartmentFunctions.ROLES)assert.equal(saved.actual.physicalQuarters[role],4*(saved.expertise.roles[role].allocation-(saved.expertise.roles[role].teaching?1:0)));
 const assigned=E.onboardingStaff(p,qs[1].onboardingPolicy);assert(assigned.salesStaff>=0);assert.equal(assigned.staffingVersion,2);
});
console.log(JSON.stringify({suite:'department-customer-capacity',checks,engineSha256:crypto.createHash('sha256').update(source).digest('hex'),fixtureSourceReportSha256:captured.sourceReportSha256}));
