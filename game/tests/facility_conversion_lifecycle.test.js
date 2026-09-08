'use strict';
// Current assembled engine. Counterfactual role/condition rosters below test
// quotations only; they are not free construction or campaign balance evidence.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const html=require('../tools/build_game').assemble().html,copy=x=>JSON.parse(JSON.stringify(x));
function load(text){const c={console};vm.runInNewContext(text.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const E=load(html),same=(a,b)=>assert.deepEqual(copy(a),copy(b));let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function fixture(version=5){
 const g=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options,mode:'hotseat',scenario:'balanced',seed:'conversion-quotes',created:1});
 const p=g.players[0],plan=E.chooseBot(g,0);
 plan.newProjects=[];plan.newProject=null;plan.investments={};plan.hires=0;plan.specialistHires=E.emptySpecialistOrders();
 plan.competitiveAction='none';plan.facilityPolicy=E.defaultFacilityPolicy();Object.assign(plan,E.defaultDepartmentPlan(p));
 plan.allocation=copy(p.allocation);plan.servicePolicy.staff=0;plan.householdPolicy.retention=25;
 plan.relationshipOfferPolicy.share=0;plan.onboardingPolicy.share=0;plan.collectionsPolicy.share=0;
 if(version===5)plan.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,plan).policy;
 return {g,p,plan,id:p.facilityNetwork.offices[0].id};
}
test('Conditioned, retained-staff before row agrees with live lifecycle and during is exactly one disruption',()=>{
 const {g,p,plan,id}=fixture();p.facilityLifecycle.records[id].conditionBp=8000;
 const normal=E.lifecycleInstructionQuote(g,p,plan).quote.metrics.rows.find(r=>r.officeId===id);
 plan.facilityPolicy.convert={officeId:id,model:'digital'};
 const before=JSON.stringify({g,plan}),result=E.facilityInstructionQuote(g,p,plan);assert(result.status.eligible,result.status.reason);
 for(const key of ['depositCapacity','loanCapacity','serviceCapacity','advisoryCapacity']){
  assert.equal(result.quote.before[key],normal.capacity[key]);assert.equal(result.quote.during[key],normal.capacity[key]*.5);
 }
 assert.equal(result.quote.before.expense,normal.upkeep);assert.equal(result.quote.during.expense,normal.upkeep);
 assert(result.quote.before.depositCapacity<E.facilityRawOfficeMetrics(p,p.facilityNetwork.offices[0]).depositCapacity);
 assert.equal(JSON.stringify({g,plan}),before);same(E.facilityInstructionQuote(g,p,plan),result);
});
test('Destination capacity retains real staffing rather than inventing a new commercial team',()=>{
 const {g,p,plan,id}=fixture();plan.facilityPolicy.convert={officeId:id,model:'commercial'};
 const q=E.facilityInstructionQuote(g,p,plan).quote,staff=plan.facilityLifecyclePolicy.offices[id].staffQuarters;
 assert.equal(staff.business,0);assert.equal(q.after.depositCapacity,0);assert.equal(q.after.serviceCapacity,0);
 const raw=E.facilityRawOfficeMetrics(p,{...p.facilityNetwork.offices[0],model:'commercial'});
 assert.equal(q.after.loanCapacity,raw.loanCapacity*Math.min(1,staff.lending/6));
});
test('Malformed role instructions fail as a visible quote without mutation or uncaught rendering error',()=>{
 const {g,p,plan,id}=fixture();plan.facilityPolicy.convert={officeId:id,model:'digital'};
 plan.facilityLifecyclePolicy.offices[id].staffQuarters.operations=-1;
 const before=JSON.stringify({g,plan}),result=E.facilityInstructionQuote(g,p,plan);
 assert.equal(result.status.eligible,false);assert.match(result.status.reason,/staff/i);
 assert.equal(JSON.stringify({g,plan}),before);
});
test('Paid teacher and protected training reserve affect the quoted destination through the same physical pool',()=>{
 const {g,p,plan,id}=fixture();p.workforce.departments.business.count=3;p.workforce.departments.business.skill=20;
 plan.allocation={service:3,business:3,lending:1,operations:1};plan.leaderOrders.business='delivery';
 plan.workforcePolicy.training.business=20000;plan.servicePolicy.staff=1;
 plan.facilityPolicy.convert={officeId:id,model:'commercial'};
 // Explicit staffed destination instruction; no new employee is created.
 plan.facilityLifecyclePolicy.offices[id].staffQuarters.business=4;
 const paid=E.facilityInstructionQuote(g,p,plan);assert(paid.status.eligible,paid.status.reason);
 const paidPool=E.lifecycleInstructionQuote(g,p,plan).availableStaffQuarters;assert.equal(paidPool.business,4);
 plan.workforcePolicy.training.business=0;
 plan.facilityLifecyclePolicy.offices[id].staffQuarters.business=8;
 const unpaid=E.facilityInstructionQuote(g,p,plan);assert(unpaid.status.eligible,unpaid.status.reason);
 assert.equal(E.lifecycleInstructionQuote(g,p,plan).availableStaffQuarters.business,8);
 assert.equal(unpaid.quote.after.depositCapacity,paid.quote.after.depositCapacity*2);
 plan.departmentPolicy.reserve=p.stats.cash;
 assert.equal(E.lifecycleInstructionQuote(g,p,plan).status.eligible,false,'Protected obligations/reserves still block optional work.');
});
test('Original Group4 raw quotation and AI remain byte-exact against the frozen actual engine',()=>{
 const frozen=fs.readFileSync(path.resolve(__dirname,'../reports/reference-builds/BRANCH_WARS_institution_group4_7cd113e1.html'),'utf8');
 assert.equal(createHash('sha256').update(frozen).digest('hex'),'7cd113e1112b98ff639f2a2c9abd22d2dee8cf049ae89976d972e7c1b2061f7c');
 const old=load(frozen),{g,p,plan,id}=fixture(4);
 for(const model of ['digital','commercial']){
  plan.facilityPolicy.convert={officeId:id,model};same(E.facilityInstructionQuote(g,p,plan),old.facilityInstructionQuote(copy(g),copy(p),copy(plan)));
 }
 same(E.chooseBot(copy(g),0),old.chooseBot(copy(g),0));
});
test('Paid conversion progress renders distinct staffed before/during/after rows without a second disruption',()=>{
 const {g,p,plan,id}=fixture();plan.facilityPolicy.convert={officeId:id,model:'commercial'};
 const startCash=p.stats.cash;
 E.submit(g,0,plan);E.submit(g,1,E.chooseBot(g,1));
 assert.equal(g.cycle,2);assert(p.facilityNetwork.offices.find(o=>o.id===id).conversion);
 const view=E.publicState(g,0),draft=E.chooseBot(copy(g),0),office=view.me.facilityNetwork.offices.find(o=>o.id===id);
 draft.facilityPolicy=E.defaultFacilityPolicy();draft.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(view.me);
 const snapshot=JSON.stringify({g,view,draft}),rows=E.facilityProgressComparison(view,view.me,office,draft);
 for(const key of ['depositCapacity','loanCapacity','serviceCapacity'])assert.equal(rows.during[key],rows.before[key]*.5);
 assert.notEqual(rows.before.loanCapacity,rows.after.loanCapacity);
 assert.equal(rows.before.expense,rows.during.expense);
 assert.equal(JSON.stringify({g,view,draft}),snapshot);
 // Render the actual progress UI with the ordinary paid campaign, not a stubbed
 // metric provider. It must use the engine comparison rather than re-looking-up
 // the unchanged canonical model three times.
 const ui={E,draft,esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'),integer:n=>Number(n).toLocaleString(),view,office};
 vm.createContext(ui);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../src/ui/facility-network.js'),'utf8'),ui);
 const markup=vm.runInContext('facilitySelectionContent(view,office)',ui);
 assert.match(markup,/CONVERSION IN PROGRESS/);assert.match(markup,/missing required staff can reduce capacity to zero/);
 for(const n of [rows.before.loanCapacity,rows.during.loanCapacity,rows.after.loanCapacity])assert(markup.includes('$'+Math.round(n).toLocaleString()));
 assert.equal(JSON.stringify({g,view,draft}),snapshot);
 assert(office.conversion.cost>0&&startCash>office.conversion.cost);
});

test('Capacity detection reconstructs gross loan production without changing historical Group4 weights',()=>{
 const c={console},source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1]
  .replace('root.BWEngine={','root.BWEngine={planFacilityNetwork,')
  .replace('const lendingTight=loanProduction>=metrics.loanCapacity*.85;','const lendingTight=loanProduction>=metrics.loanCapacity*.85;root.lastProduction={loanProduction,lendingTight,capacity:metrics.loanCapacity};');
 vm.runInNewContext(source,c);const X=c.BWEngine;
 for(const version of [4,5]){
  const {g,p,plan}=fixture(version);p.stats.lastProfit=1;
  const capacity=X.regionalBranchMetrics(p).loanCapacity;
  p.operatingReport={loanGrowth:-100000,principalRepaid:capacity+100000,chargeoff:0,creditRecovery:0,depositGrowth:0};
  X.chooseBot(g,0);assert(c.lastProduction);
  assert.equal(c.lastProduction.loanProduction,version===5?capacity:-100000);
  assert.equal(c.lastProduction.lendingTight,version===5);
 }
});
console.log(JSON.stringify({status:'PASS',checks,candidateSha256:createHash('sha256').update(html).digest('hex'),scope:'Actual conversion quotations, retained staffing/condition, teacher/reserve interaction, gross-production scoring and frozen Group4 comparison; not a full balance campaign.'}));
