'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {runtime,bankingProposal,serviceAwareProposal}=require('../tools/income_banking_trial'),copy=x=>JSON.parse(JSON.stringify(x));
const {E}=runtime(require('../tools/build_game').assemble().html);
function start(){
 const g=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true,currentEconomics:true}).options,mode:'hotseat',created:1,scenario:'balanced',seed:'business-balance:1'});
 return {g,base:E.chooseBot(copy(g),0)};
}
test('ordinary control is exactly the original order, not a hidden policy rewrite',()=>{
 const {g,base}=start(),before=JSON.stringify({g,base}),result=bankingProposal(E,g,0,base,'ordinary');
 assert.equal(result.plan,base);assert(result.accepted);assert.deepEqual(result.steps,[]);assert.equal(JSON.stringify({g,base}),before);
});
for(const strategy of ['lending','commercial'])test(strategy+' trial uses legal finite work and separately reviewed spending',()=>{
 const {g,base}=start(),before=JSON.stringify({g,base}),result=bankingProposal(E,g,0,base,strategy);
 assert(result.accepted,result.reason);assert.equal(JSON.stringify({g,base}),before);
 const plan=result.plan,p=g.players[0];assert.equal(Object.values(plan.allocation).reduce((a,b)=>a+b,0),p.stats.staff);
 assert(plan.allocation[strategy==='lending'?'lending':'business']>plan.allocation[strategy==='lending'?'business':'lending']);
 E.validatePortfolioPlan(p,plan,g);E.validatePlan(g,p,plan);
 assert.equal(plan.hires,1);assert(result.steps.some(row=>row.action==='one-paid-recruit'&&row.accepted));
 assert(result.steps.some(row=>row.action==='paid-commercial-office'&&row.accepted),'Cash protection must not reserve an extra $600K of regulatory capital');
 assert.deepEqual(copy(plan.newProjects),['branchCommercial']);assert.deepEqual(copy(plan.investments),{});
 const budget=E.planBudget(p,plan,g);
 assert(budget.discretionaryRemaining>=0,'Actual capital protection still applies');
 assert(budget.discretionaryCashAvailable-budget.discretionaryCommitments>=600000+budget.basePayrollAdded*6);
 assert.equal(p.stats.staff,8,'Staging the trial did not create an employee');
});
test('failed work proposal explicitly falls back without concealing rejection or altering the original plan',()=>{
 const {g,base}=start(),before=JSON.stringify({g,base});
 const result=bankingProposal({...E,planDepartmentFunctionsCore(){throw Error('synthetic work rejection');}},g,0,base,'lending');
 assert(!result.accepted);assert.equal(result.reason,'synthetic work rejection');assert.equal(result.plan,base);
 assert.equal(result.steps[0].accepted,false);assert.equal(JSON.stringify({g,base}),before);
});

function unserved(){
 const {g,base}=start(),selected=bankingProposal(E,g,0,base,'lending');
 for(const role of Object.keys(selected.plan.departmentFunctionsPolicy.quotas.relationships))selected.plan.departmentFunctionsPolicy.quotas.relationships[role]=0;
 selected.plan.departmentFunctionsPolicy.vendors.relationships=0;
 return {g,selected};
}
test('service-aware comparison buys finite work without changing any other instructions or forecast state',()=>{
 const {g,selected}=unserved(),before=JSON.stringify({g,selected}),q=serviceAwareProposal(E,g,0,selected),step=q.steps.at(-1);
 assert(step.accepted,step.reason);assert(step.additionalExpense>0);assert(step.afterFees>step.beforeFees);assert(step.afterProfit>step.beforeProfit);
 assert.equal(JSON.stringify({g,selected}),before);
 const restored=copy(q.plan);restored.departmentFunctionsPolicy.vendors.relationships=0;
 assert.deepEqual(restored,copy(selected.plan));E.validatePlan(g,g.players[0],q.plan);
 const again=serviceAwareProposal(E,g,0,q);assert(!again.steps.at(-1).accepted);assert.match(again.steps.at(-1).reason,/covered/);
 assert.deepEqual(copy(again.plan),copy(q.plan),'Covered book does not buy the same work twice');
});
test('service-aware comparison cannot spend projected fees instead of available cash',()=>{
 const {g,selected}=unserved(),before=JSON.stringify({g,selected});
 const q=serviceAwareProposal({...E,planBudget(...args){return {...E.planBudget(...args),discretionaryCashAvailable:0};}},g,0,selected);
 assert(!q.steps.at(-1).accepted);assert.match(q.steps.at(-1).reason,/Current cash/);assert.equal(q.plan,selected.plan);
 assert.equal(JSON.stringify({g,selected}),before);
});
test('service-aware comparison respects supplier limits and rejected original plans',()=>{
 const {g,selected}=unserved(),before=JSON.stringify({g,selected});
 const q=serviceAwareProposal({...E,DepartmentProvider:{...E.DepartmentProvider,ENTITLEMENT:0}},g,0,selected);
 assert(!q.steps.at(-1).accepted);assert.match(q.steps.at(-1).reason,/finite provider/);assert.equal(JSON.stringify({g,selected}),before);
 const rejected={...selected,accepted:false};assert.equal(serviceAwareProposal(E,g,0,rejected),rejected);
});
for(const [name,change,reason] of [
 ['unprofitable service',r=>({...r,profit:-1e9}),/improve earnings/],
 ['new funding loss',r=>({...r,fundingLoss:1,profit:1e9}),/funding stress/],
 ['new emergency borrowing',r=>({...r,emergencyDebt:1,profit:1e9}),/funding stress/],
 ['inadequate forecast capital',r=>({...r,capitalRatio:9,profit:1e9}),/Capital protection/]
])test('service-aware comparison rejects '+name+' without changing the original order',()=>{
 const {g,selected}=unserved(),before=JSON.stringify({g,selected});let forecasts=0;
 const q=serviceAwareProposal({...E,operatingPreview(...args){const r=E.operatingPreview(...args);return ++forecasts===2?change(r):r;}},g,0,selected);
 assert.equal(forecasts,2);assert(!q.steps.at(-1).accepted);assert.match(q.steps.at(-1).reason,reason);
 assert.equal(q.plan,selected.plan);assert.equal(JSON.stringify({g,selected}),before);
});
