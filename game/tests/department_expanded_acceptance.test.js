'use strict';
// Current whole-campaign checks: no injected money, headcount or qualifications.
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const c={};vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);
const E=c.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
function plan(g,i){const p=g.players[i],a=E.chooseBot(g,i);
 Object.assign(a,{newProjects:[],newProject:null,investments:{},hires:0,specialistHires:E.emptySpecialistOrders(),competitiveAction:'none',opportunity:null,contractBid:null,
  allocation:copy(p.allocation),facilityPolicy:E.defaultFacilityPolicy(),facilityLifecyclePolicy:E.defaultFacilityLifecyclePlan(p),facilityExtensionPolicy:{start:null,cancel:null},
  commercialAccountPolicy:{target:null,staffQuarters:0},investmentPolicy:E.defaultInvestmentPlan(p),agencyPolicy:E.defaultAgencyPlan(p),companyShareOrders:[],
  companyControlPolicy:E.defaultCompanyControlPlan(p),sharedPremisesPolicy:copy(p.sharedPremises.policy),leaderOrders:E.defaultDepartmentPlan(p).leaderOrders});
 a.groupPolicy.bankDividend=0;a.groupPolicy.bankSupport=0;a.servicePolicy.staff=0;
 for(const row of Object.values(a.departmentFunctionsPolicy.quotas))for(const role of Object.keys(row))row[role]=0;
 for(const k of Object.keys(a.departmentFunctionsPolicy.vendors))a.departmentFunctionsPolicy.vendors[k]=0;
 for(const role of Object.keys(a.workforcePolicy.training))a.workforcePolicy.training[role]=0;
 a.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,a).policy;return a;
}
function advance(g,a,b=plan(g,1)){E.submit(g,0,a);E.submit(g,1,b);E.validatePilot(g);E.validateLedger(g);for(const i of [0,1])E.validateFinancialGroupView(E.publicState(g,i));return E.migrateCampaign(copy(g));}
test('Expanded departments connect real recruitment, paid leadership, delivered training, target stops and demotion',()=>{
 let g=E.createGame({...E.previewCampaignEdition({},'expanded').options,mode:'hotseat',seed:'department-acceptance52',created:1});
 const staff=g.players[0].stats.staff;
 let a=plan(g,0);a.specialistHires.business=2;g=advance(g,a);
 assert.equal(g.players[0].stats.staff,staff+2);assert.equal(g.players[0].workforce.departments.business.count,2);
 a=plan(g,0);a.leaderOrders.business='delivery';a.workforcePolicy.training.business=10000;
 a.departmentFunctionsPolicy.quotas.people.operations=3;
 a.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,g.players[0],a).policy;
 const before=JSON.stringify(g),q=E.departmentBudgetQuote(g.players[0],a,g);assert.equal(JSON.stringify(g),before);
 assert.equal(q.leadership.appointments,E.DEPARTMENT_LEADERS.delivery.appointment);
 assert.equal(q.leadership.salary,E.DEPARTMENT_LEADERS.delivery.salary);
 g=advance(g,a);let p=g.players[0],leader=p.departmentOffice.leaders.business;
 assert(leader,'An assigned qualified specialist can be promoted');assert.equal(p.stats.staff,staff+2,'Promotion does not add a worker');
 assert(leader.experience>0,'Actual delivered training develops the named leader');assert.equal(leader.classes,1);
 assert(p.workforce.departments.business.skill>20);assert(p.operatingReport.trainingSpend_business>0);
 const preserved=copy(leader),skill=p.workforce.departments.business.skill;
 a=plan(g,0);a.departmentPolicy.mandate.training=true;a.departmentPolicy.mandate.trainingTarget=skill;
 a.workforcePolicy.training.business=10000;
 const original=copy(a),ownerBefore=JSON.stringify(p),proposal=E.departmentDraft(p,a,g.economy,g);
 assert.equal(proposal.plan.workforcePolicy.training.business,0,'Reached skill target stops delegated purchases');
 assert.deepEqual(copy(a),original);assert.equal(JSON.stringify(p),ownerBefore);
 for(const key of Object.keys(a).filter(k=>!['servicePolicy','investments','workforcePolicy'].includes(k)))assert.deepEqual(copy(proposal.plan[key]),copy(a[key]),'Manager cannot change '+key);
 g=advance(g,proposal.plan);p=g.players[0];assert.equal(p.departmentOffice.policy.mandate.trainingTarget,skill);
 assert.equal(p.departmentOffice.leaders.business.experience,preserved.experience,'No experience from a nonexistent class');
 assert.equal(p.departmentOffice.leaders.business.id,preserved.id,'Leadership identity persists through saves and months');
 a=plan(g,0);a.leaderOrders.business='none';const demotion=E.departmentBudgetQuote(g.players[0],a,g).leadership;assert.equal(demotion.severance,E.DEPARTMENT_LEADERS.delivery.salary);
 g=advance(g,a);p=g.players[0];assert.equal(p.departmentOffice.leaders.business,null);assert.equal(p.stats.staff,staff+2);
 assert(p.departmentOffice.history.some(h=>h.id===preserved.id&&h.event==='demoted'&&h.experience===preserved.experience));
 assert.equal(p.departmentOffice.arrears.business,0);
});
