'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const html=require('../tools/build_game').assemble().html,ctx={console};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={',
 'root.BWEngine={facilityDraftSpend,departmentProspectiveOwner,departmentTrainingRows,departmentProductiveAllocation,departmentDeliveryAllocation,workforceAllocation,specialistBusinessBonus,validateDepartmentSave,'),ctx);
const E=ctx.BWEngine,options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options;
const fresh=(extra={})=>E.createGame({...options,mode:'hotseat',seed:'department-integration',created:1,...extra});
const same=(a,b)=>assert.deepEqual(copy(a),copy(b));let checks=0,months=0;
function valid(g){E.validatePilot(g);E.validateLedger(g);for(const i of [0,1])E.validateFinancialGroupView(E.publicState(g,i));}
const g=fresh();valid(g);
assert.equal(g.version,'9.3');assert(g.players.every(p=>p.accounting.version===3&&p.departmentOffice));checks++;
// Existing qualified-bankers fixture. Headcount remains the actual eight bank
// employees; appointment must not add another employee or specialist to it.
const p=g.players[0];p.workforce.departments.business.count=3;p.workforce.departments.business.skill=20;
p.allocation={service:3,business:3,lending:1,operations:1};valid(g);
const plans=g.players.map((p,i)=>E.chooseBot(g,i));
for(const q of plans){q.investments={};q.newProjects=[];q.newProject=null;q.hires=0;
 for(const role of Object.keys(q.specialistHires))q.specialistHires[role]=0;
 q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;q.agencyPolicy=E.defaultAgencyPlan(g.players[plans.indexOf(q)]);
}
Object.assign(plans[0],{allocation:{...p.allocation},contractBid:null,opportunity:null});
plans[0].leaderOrders.business='delivery';plans[0].workforcePolicy.training.business=20000;
plans[0].servicePolicy.staff=3;plans[0].servicePolicy.outsourcing=0;
const owner=E.publicState(g,0).me,unchanged=JSON.stringify(owner),gameBefore=JSON.stringify(g);
const preview=E.departmentProspectiveOwner(owner,plans[0]);
assert.equal(JSON.stringify(owner),unchanged);assert.equal(JSON.stringify(g),gameBefore);
assert.equal(preview.stats.cash,owner.stats.cash-26000);
const training=E.workforceTrainingQuote(preview,plans[0].workforcePolicy);
assert.equal(training.rows.find(r=>r.role==='business').gain,5);
assert.equal(training.rows.find(r=>r.role==='business').spend,15000);
preview._workforceCosts={training};preview.serviceDesk.policy=copy(plans[0].servicePolicy);
assert.equal(E.departmentProductiveAllocation(preview).business,2);
assert.equal(E.workforceAllocation(preview).business,2.32);
assert.equal(E.specialistBusinessBonus(preview,true),.32);
assert.equal(E.serviceLoad(preview).staff,2);assert.equal(E.serviceLoad(preview).capacity,4.64);
assert.equal(E.commercialSalesStaff(preview),0);checks++;
const quote=E.departmentBudgetQuote(owner,plans[0]);assert.equal(quote.training.total,15000);
assert.equal(quote.productiveAllocation.business,2);
const frozen=JSON.stringify(owner);E.operatingPreview(owner,plans[0],g.economy);assert.equal(JSON.stringify(owner),frozen);checks++;
// Combined funded conversion + appointment near the reserve boundary must be
// validated once against opening cash, not charged and reserved a second time.
const combined=copy(plans[0]);combined.facilityPolicy={cancel:null,
 convert:{officeId:owner.facilityNetwork.offices[0].id,model:'commercial'}};
const conversion=E.facilityDraftSpend(owner,combined),combinedBudget=E.planBudget(owner,combined);
combined.departmentPolicy.reserve=owner.stats.cash-combinedBudget.total-1000;
assert.doesNotThrow(()=>E.operatingPreview(owner,combined,g.economy));
assert.equal(E.departmentBudgetQuote(owner,combined).projectedCash,owner.stats.cash-conversion-26000);
assert.equal(JSON.stringify(owner),frozen);checks++;
const inverse=copy(g);E.submit(g,0,plans[0]);const resumed=E.migrateCampaign(copy(g));
E.submit(g,1,plans[1]);E.submit(resumed,1,copy(plans[1]));
E.submit(inverse,1,copy(plans[1]));E.submit(inverse,0,copy(plans[0]));valid(g);valid(resumed);valid(inverse);months++;
same(E.migrateCampaign(copy(g)),E.migrateCampaign(copy(resumed)));
same(E.migrateCampaign(copy(g)),E.migrateCampaign(copy(inverse)));checks++;
assert.equal(g.players[0].departmentOffice.report.expense,26000);
assert.equal(g.players[0].departmentOffice.report.paid,26000);
assert.equal(g.players[0].operatingReport.departmentExpense,26000);
assert.equal(g.players[0].marketReport.profit,g.players[0].operatingReport.profit);
assert.equal(g.players[0].marketReport.central+Object.values(g.players[0].marketReport.rows).reduce((n,r)=>n+r.contribution,0),g.players[0].operatingReport.profit);
assert.equal(g.departmentEconomy.supplier.accounts.cash,26000);
assert.equal(g.players[0].workforce.departments.business.skill,25);
assert.equal(g.players[0].departmentOffice.leaders.business.experience,5);
assert.equal(g.players[0].stats.staff,8);assert.equal(g.players[0]._departmentTeaching,undefined);checks++;
// Persistent leadership, not a repeated appointment fee. Salary is paid once.
const next=g.players.map((p,i)=>E.chooseBot(g,i));
E.submit(g,0,next[0]);E.submit(g,1,next[1]);valid(g);months++;
assert.equal(g.players[0].departmentOffice.report.expense,4000);
assert.equal(g.players[0].operatingReport.departmentExpense,4000);
assert.equal(g.departmentEconomy.supplier.accounts.cash,30000);checks++;
const publicOwner=E.publicState(g,1),rivalId=g.players[0].id;
assert.equal(publicOwner.rival.departmentOffice,undefined);assert.equal(publicOwner.departmentEconomy,undefined);
assert.equal(publicOwner.lastPlans[rivalId].departmentPolicy,undefined);assert.equal(publicOwner.lastPlans[rivalId].leaderOrders,undefined);checks++;
// A common reserve that cannot fund training cannot promise a teacher or gains.
const pausedPlan=copy(next[0]);pausedPlan.leaderOrders.business=null;
pausedPlan.departmentPolicy.reserve=10000000;pausedPlan.workforcePolicy.training.business=20000;
const paused=E.departmentBudgetQuote(E.publicState(g,0).me,pausedPlan);
assert.equal(paused.training.paused,true);assert.equal(paused.training.total,0);
assert.equal(paused.rows.find(r=>r.role==='business').teaching,false);
assert.equal(paused.productiveAllocation.business,pausedPlan.allocation.business);checks++;
for(const damage of [x=>delete x.players[0].departmentOffice,x=>x.departmentEconomy.paid++,
 x=>x.players[0].departmentOffice.arrears.business++,x=>x.players[0].departmentOffice.leaders.business.id+='x']){
 const bad=copy(g);damage(bad);assert.throws(()=>E.migrateCampaign(bad));checks++;
}
for(const scenario of ['balanced','rate','regulatory','growth']) {
 const campaign=fresh({scenario,seed:'department:'+scenario});
 for(let i=0;i<4&&!campaign.gameOver;i++){
  const q=campaign.players.map((p,seat)=>E.chooseBot(campaign,seat));
  E.submit(campaign,0,q[0]);E.submit(campaign,1,q[1]);valid(campaign);months++;
 }
 assert.equal(campaign.cycle,5);checks++;
}
console.log(JSON.stringify({suite:'departments-integration',checks,months,source:'actual assembled source',
 note:'Human UI acceptance and physical two-computer multiplayer remain separate.'}));
