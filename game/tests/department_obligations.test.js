'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),{createHash}=require('node:crypto');
const html=require('../tools/build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>createHash('sha256').update(x).digest('hex');
const patchEngine=require('../experiments/institution/patch-engine.cjs'),patches=['department-ai-affordability.patch','department-mandatory-obligations.patch'];
const candidateMode=process.argv.includes('--candidate-patch'),candidate=candidateMode?patchEngine(source,patches):source;
const baseline=candidateMode?source:patchEngine(source,patches,true);
function load(code){const ctx={console};vm.runInNewContext(code,ctx);return ctx.BWEngine;}
const E=load(candidate),old=load(baseline),options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options;
const g=E.createGame({...options,mode:'hotseat',seed:'mandatory-compensation',created:1});
function quiet(world){world.event=copy(E.EVENTS.find(e=>e.key==='quiet'));}
function plan(world,i){const q=E.chooseBot(world,i);Object.assign(q,{newProjects:[],newProject:null,investments:{},hires:0,competitiveAction:'none',opportunity:null,contractBid:null,contractExit:null,capitalAction:false,decision:'b'});
 for(const key of Object.keys(q.specialistHires))q.specialistHires[key]=0;
 for(const key of Object.keys(q.workforcePolicy.training))q.workforcePolicy.training[key]=0;
 q.facilityPolicy={convert:null,cancel:null};q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;
 q.agencyPolicy=E.defaultAgencyPlan(world.players[i]);q.advertisingPolicy.budget=0;q.relationshipOfferPolicy.share=0;q.onboardingPolicy.share=0;
 q.productProgramPolicy.retire=[];return q;}
function sync(p){Object.assign(p.stats,{cash:p.accounting.accounts.cash,capital:p.accounting.accounts.equity,earnings:p.accounting.retainedEarnings});}
function cashAt(p,cash){const move=p.accounting.accounts.cash-cash;
 p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.liquidityAllocation',{cash:-move,securities:move});sync(p);}
function valid(world){E.validatePilot(world);E.validateLedger(world);for(const seat of [0,1])E.validateFinancialGroupView(E.publicState(world,seat));}
let checks=0,months=0;
// Qualified-employee starting fixture: three specialists are among the original
// eight employees. Appointments below are actual funded simultaneous orders.
for(const role of ['service','business','operations']){g.players[0].workforce.departments[role].count=1;g.players[0].workforce.departments[role].skill=20;}
valid(g);quiet(g);const opening=[plan(g,0),plan(g,1)];
opening[0].departmentPolicy.envelopes.leadership=100000;
Object.assign(opening[0].leaderOrders,{service:'delivery',business:'delivery',operations:'controls'});
assert.equal(E.planBudget(g.players[0],opening[0]).mandatoryObligations,0);
assert.equal(E.planBudget(g.players[0],opening[0]).discretionaryCommitments,81500);
E.submit(g,0,opening[0]);E.submit(g,1,opening[1]);valid(g);months++;
assert.equal(g.players[0].departmentOffice.report.paid,81500);checks++;
const ordinary=[plan(g,0),plan(g,1)],positive=copy(g),p=positive.players[0];cashAt(p,20000);valid(positive);
const budget=E.planBudget(p,ordinary[0]);assert.equal(budget.total,12500);assert.equal(budget.mandatoryObligations,12500);
assert.equal(budget.discretionaryCommitments,0);assert.equal(budget.discretionaryCashAvailable,7500);checks++;
const spend=copy(ordinary[0]);spend.investments={network:8000};
assert.equal(E.projectPlanStatus(p,spend).eligible,false);
spend.investments.network=7000;assert.equal(E.projectPlanStatus(p,spend).eligible,true);checks++;
// Zero cash is obtained by buying existing balance-sheet securities, not by
// deleting money or giving the bank resources. The unchanged group still balances.
const broke=copy(g);cashAt(broke.players[0],0);valid(broke);quiet(broke);
const frozen=copy(ordinary[0]),zero=E.planBudget(broke.players[0],frozen);
assert.equal(zero.total,12500);assert.equal(zero.remaining,-12500);
assert.equal(zero.discretionaryCommitments,0);assert.equal(zero.discretionaryRemaining,0);
assert.equal(E.projectPlanStatus(broke.players[0],frozen).eligible,true);
assert.equal(old.projectPlanStatus(broke.players[0],frozen).eligible,false);checks++;
const ids=Object.values(broke.players[0].departmentOffice.leaders).filter(Boolean).map(x=>x.id);
E.submit(broke,0,frozen);E.submit(broke,1,copy(ordinary[1]));valid(broke);months++;
assert.equal(broke.players[0].departmentOffice.report.expense,12500);
assert.equal(broke.players[0].departmentOffice.report.paid,0);
assert.equal(broke.players[0].accounting.accounts.payables,12500);
assert.equal(broke.departmentEconomy.supplier.accounts.businessAssets,12500);
assert.deepEqual(Object.values(broke.players[0].departmentOffice.leaders).filter(Boolean).map(x=>x.id),ids);checks++;
const leadershipEntry=broke.eventLedger.findLast(e=>e.source==='settleDepartmentLeadership'&&e.target===broke.players[0].id);
assert.equal(leadershipEntry.deltas.emergencyDebt,undefined);assert.equal(leadershipEntry.deltas.cash,undefined);checks++;
// Existing payable claims already restrict pilotSpendingLimit. Reserve them once
// alongside the NEW month's wages: $20K cash cannot cover $25K total due.
const indebted=copy(broke);cashAt(indebted.players[0],20000);valid(indebted);
const due=E.planBudget(indebted.players[0],ordinary[0]);
assert.equal(due.capitalBudget,7500);assert.equal(due.mandatoryObligations,12500);
assert.equal(due.discretionaryCashAvailable,0);assert.equal(due.discretionaryRemaining,0);
assert.equal(E.projectPlanStatus(indebted.players[0],ordinary[0]).eligible,true);
const newSpend=copy(ordinary[0]);newSpend.investments={network:1000};
assert.equal(E.projectPlanStatus(indebted.players[0],newSpend).eligible,false);checks++;
// Costed demotion remains a liability; new discretionary replacement is barred.
const demote=copy(ordinary[0]);demote.leaderOrders.service='none';
assert.equal(E.planBudget(p,demote).mandatoryObligations,12500);
const replace=copy(ordinary[0]);replace.leaderOrders.service='mentor';
assert.throws(()=>E.normalizeDepartmentPlan(p,replace),/Leadership appointment exceeds/);checks++;
const dismissal=copy(broke);cashAt(dismissal.players[0],0);quiet(dismissal);
E.submit(dismissal,0,copy(demote));E.submit(dismissal,1,copy(ordinary[1]));valid(dismissal);months++;
assert.equal(dismissal.players[0].departmentOffice.leaders.service,null);
assert.equal(dismissal.players[0].departmentOffice.arrears.service,8000);
assert.equal(dismissal.players[0].accounting.accounts.payables,25000);
assert.equal(dismissal.departmentEconomy.supplier.accounts.businessAssets,25000);checks++;
// A real book impairment can make capital spending room zero while cash exists.
const weak=copy(g),w=weak.players[0],loss=w.stats.capital;
w.accounting=E.AccountingPrototype.post(w.accounting,'fixture.securitiesImpairment',{securities:-loss,equity:-loss},-loss);sync(w);valid(weak);
assert.equal(E.planBudget(w,ordinary[0]).capitalBudget,0);
assert.equal(E.projectPlanStatus(w,ordinary[0]).eligible,true);
const optional=copy(ordinary[0]);optional.investments={network:1000};assert.equal(E.projectPlanStatus(w,optional).eligible,false);checks++;
// Old supported group campaign states and resolutions are byte-for-byte equal.
for(const version of [1,2,3]){
 const rules=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options;
 const a=old.createGame({...rules,mode:'hotseat',seed:'obligation-legacy:'+version,created:1}),b=E.createGame({...rules,mode:'hotseat',seed:'obligation-legacy:'+version,created:1});
 assert.deepEqual(copy(a),copy(b));
 for(let turn=0;turn<2;turn++){const qa=a.players.map((p,i)=>old.chooseBot(a,i)),qb=b.players.map((p,i)=>E.chooseBot(b,i));assert.deepEqual(copy(qa),copy(qb));
  old.submit(a,0,qa[0]);old.submit(a,1,qa[1]);E.submit(b,0,qb[0]);E.submit(b,1,qb[1]);assert.deepEqual(copy(a),copy(b));}
 checks++;
}
console.log(JSON.stringify({suite:'department-mandatory-obligations',checks,months,legacyMonths:6,sourceEngineHash:hash(source),candidateEngineHash:hash(candidate),
 note:'Honest full commitments, payable accrual without manager borrowing, strict optional spending, no production writes.'}));
