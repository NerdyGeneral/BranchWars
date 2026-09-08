'use strict';
// Domain checks read actual current source. Full campaign and transport gates
// remain separate; this suite also tests malformed intermediate liability cases.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),sourceRoot=path.join(root,'src'),copy=x=>JSON.parse(JSON.stringify(x));
const manifest=JSON.parse(fs.readFileSync(path.join(sourceRoot,'manifest.json'),'utf8'));
const sources=new Map(manifest.engine.modules.map(file=>[file,fs.readFileSync(path.join(sourceRoot,file),'utf8').replace(/\r\n/g,'\n')]));
assert(sources.has('engine/departments.js'),'Department module must be in the authoritative manifest');
let code=manifest.engine.modules.map(name=>sources.get(name)).join('\n');
const testExportFields='initializeDepartments,defaultDepartmentPlan,normalizeDepartmentPlan,departmentLeadershipQuote,departmentProspectiveOwner,departmentBudgetQuote,departmentDraft,departmentTrainingRows,departmentProductiveAllocation,departmentDeliveryAllocation,settleDepartmentLeadership,settleDepartmentExperience,validateDepartmentSave,projectDepartments,validateDepartmentView,DEPARTMENT_LEADERS,planDepartments,';
code=code.replace('root.BWEngine={','root.BWEngine={'+testExportFields);
const ctx={console};vm.runInNewContext('(function(root){'+code+'})(globalThis);',ctx);const E=ctx.BWEngine;
const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:3}).options;
function fresh(){
 const g=E.createGame({...options,mode:'hotseat',seed:'departments',created:1});
 g.financialGroupVersion=4;g.version='9.3';E.initializeDepartments(g);return g;
}
function basicPlan(p){return {...E.defaultDepartmentPlan(p),allocation:{...p.allocation},investments:{},
 workforcePolicy:copy(p.workforce.policy),management:copy(p.management),servicePolicy:copy(p.serviceDesk.policy),
 contractBid:null,contractExit:null,newProjects:[],newProject:null,hires:0,capitalAction:false,competitiveAction:'none'};}
function specialists(p,role,count){
 // Existing qualified-employee fixture, not an appointment adding free staff.
 p.workforce.departments[role].count=count;p.workforce.departments[role].skill=20;
 p.allocation={service:0,business:0,lending:0,operations:0};p.allocation[role]=count;
 p.allocation[role==='service'?'operations':'service']=p.stats.staff-count;
}
function finish(g){
 for(const p of g.players){if(!p.operatingReport)p.operatingReport={};E.settleDepartmentExperience(g,p);}
 g.cycle++;E.validateDepartmentSave(g);
}
const same=(a,b)=>assert.deepEqual(copy(a),copy(b));let checks=0;
const opening=fresh();E.validateDepartmentSave(opening);
assert.equal(opening.departmentEconomy.supplier.accounts.cash,0);
assert.equal(opening.players[0].accounting.accounts.payables,0);
assert(opening.players.every(p=>Object.values(p.departmentOffice.leaders).every(x=>x===null)));checks++;
const old=E.createGame({...options,mode:'hotseat',seed:'old',created:1}),oldBefore=JSON.stringify(old);
E.initializeDepartments(old);same(E.settleDepartmentLeadership(old,[]),[]);assert.equal(JSON.stringify(old),oldBefore);
assert.throws(()=>E.normalizeDepartmentPlan(old.players[0],{departmentPolicy:{}}),/require/);checks++;
for(const field of ['departmentPolicy','leaderOrders']){
 const invalid=copy(old);invalid.lastPlans={[invalid.players[0].id]:{[field]:{}}};
 assert.throws(()=>E.validateDepartmentSave(invalid),/Unversioned/);
 const invalidView=E.publicState(old,0);invalidView.lastPlans={[invalidView.me.id]:{[field]:{}}};
 assert.throws(()=>E.validateDepartmentView(invalidView),/Unversioned/);checks++;
}
const g=fresh(),p=g.players[0];specialists(p,'business',3);
const plan=basicPlan(p);plan.leaderOrders.business='delivery';plan.workforcePolicy.training.business=20000;
E.normalizeDepartmentPlan(p,plan);
const quote=E.departmentLeadershipQuote(p,plan);assert.equal(quote.total,26000);
const clean=JSON.stringify(p),preview=E.departmentProspectiveOwner(p,plan);
assert.equal(JSON.stringify(p),clean);assert.equal(preview.stats.cash,p.stats.cash-26000);
assert.equal(preview.departmentOffice.leaders.business.profile,'delivery');
const rows=[{role:'business',count:3,skill:20,gain:4,spend:12000}];
const trained=E.departmentTrainingRows(preview,plan.workforcePolicy,rows);
assert.equal(trained[0].gain,5);assert.equal(trained[0].spend,15000);same(rows,[{role:'business',count:3,skill:20,gain:4,spend:12000}]);
assert.equal(E.departmentProductiveAllocation(preview,plan.allocation).business,2);
same(E.departmentDeliveryAllocation(preview,1),{total:2,sales:1,service:1});
same(E.departmentDeliveryAllocation(preview,3),{total:2,sales:0,service:2});
preview._workforceCosts={training:{paused:true,rows:[]}};
assert.equal(E.departmentProductiveAllocation(preview,plan.allocation).business,3);checks++;
delete preview._workforceCosts;preview.departmentOffice.policy.reserve=10000000;
assert.equal(E.departmentProductiveAllocation(preview,plan.allocation).business,3);
same(E.departmentDeliveryAllocation(preview,3),{total:3,sales:0,service:3});checks++;
const bankBefore=p.accounting.accounts.cash,capitalBefore=p.accounting.accounts.equity,staffBefore=p.stats.staff;
E.settleDepartmentLeadership(g,[plan,basicPlan(g.players[1])]);
assert.equal(p.accounting.accounts.cash,bankBefore-26000);assert.equal(p.accounting.accounts.equity,capitalBefore-26000);
assert.equal(g.departmentEconomy.supplier.accounts.cash,26000);assert.equal(g.departmentEconomy.supplier.accounts.businessAssets,0);
assert.equal(p.stats.staff,staffBefore);assert.equal(p.workforce.departments.business.count,3);
assert.equal(p.accounting.accounts.emergencyDebt,0);assert.throws(()=>E.settleDepartmentLeadership(g,[plan,{}]),/already/);
p.workforce.policy=copy(plan.workforcePolicy);p.operatingReport={trainingSpend_business:15000,trainingGain_business:5};
finish(g);assert.equal(p.departmentOffice.leaders.business.experience,5);assert.equal(p.departmentOffice.leaders.business.classes,1);checks++;
// Employment persists and incurs compensation without a fresh promotion. Loss
// of liquidity creates a matched supplier claim, never emergency borrowing.
const leaderId=p.departmentOffice.leaders.business.id;
p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.existingOperatingLoss',{cash:-p.accounting.accounts.cash,equity:-p.accounting.accounts.cash},-p.accounting.accounts.cash);
p.stats.cash=p.accounting.accounts.cash;p.stats.capital=p.accounting.accounts.equity;
const debtBefore=p.accounting.accounts.emergencyDebt;
E.settleDepartmentLeadership(g,g.players.map(basicPlan));
assert.equal(p.departmentOffice.arrears.business,4000);assert.equal(p.accounting.accounts.payables,4000);
assert.equal(g.departmentEconomy.supplier.accounts.businessAssets,4000);
assert.equal(p.accounting.accounts.emergencyDebt,debtBefore);assert.equal(p._departmentTeaching.business,false);
assert.equal(p.departmentOffice.leaders.business.id,leaderId);finish(g);checks++;
// Costed demotion accrues severance but never forgives previously earned wages.
const dismiss=basicPlan(p);dismiss.leaderOrders.business='none';E.normalizeDepartmentPlan(p,dismiss);
E.settleDepartmentLeadership(g,[dismiss,basicPlan(g.players[1])]);
assert.equal(p.departmentOffice.leaders.business,null);assert.equal(p.accounting.accounts.payables,8000);
assert.equal(p.departmentOffice.arrears.business,8000);finish(g);checks++;
const noHead=fresh(),bad=basicPlan(noHead.players[0]);bad.leaderOrders.lending='controls';
assert.throws(()=>E.normalizeDepartmentPlan(noHead.players[0],bad),/existing qualified/);checks++;
// A valid submitted promotion can lose its funding during simultaneous events.
// Recheck settlement cash instead of creating a discretionary appointment debt.
const squeezed=fresh(),sp=squeezed.players[0],splan=basicPlan(sp);
sp.workforce.departments.business.count=2;splan.leaderOrders.business='delivery';
E.normalizeDepartmentPlan(sp,splan);
sp.accounting=E.AccountingPrototype.post(sp.accounting,'fixture.preLeadershipLoss',
 {cash:-sp.accounting.accounts.cash,equity:-sp.accounting.accounts.cash},-sp.accounting.accounts.cash);
sp.stats.cash=0;sp.stats.capital=sp.accounting.accounts.equity;
E.settleDepartmentLeadership(squeezed,[splan,basicPlan(squeezed.players[1])]);
assert.equal(sp.departmentOffice.leaders.business,null);assert.equal(sp.accounting.accounts.payables,0);
assert.equal(splan.leaderOrders.business,'delivery');finish(squeezed);checks++;
// Envelope edits are limits, not cash or a second accumulated spending balance.
const limits=fresh(),lp=limits.players[0],lplan=basicPlan(lp);lplan.departmentPolicy.envelopes.research=1000;lplan.investments={digital:2000};
assert.throws(()=>E.normalizeDepartmentPlan(lp,lplan),/Research instructions/);
lplan.investments={};lplan.departmentPolicy.envelopes.vendors=0;lplan.servicePolicy.outsourcing=1;
assert.throws(()=>E.normalizeDepartmentPlan(lp,lplan),/outsourcing/);checks++;
const manual=basicPlan(lp);manual.capitalAction=true;manual.newProjects=['branch'];manual.contractBid='deliberate';
const untouched=JSON.stringify(lp),draft=E.departmentDraft(lp,manual,limits.economy);
same(draft.plan,manual);assert.equal(JSON.stringify(lp),untouched);checks++;
// Strict schema guards saved liabilities, leader identity, private report fields.
for(const damage of [
 x=>x.departmentEconomy.paid++,x=>x.players[0].departmentOffice.arrears.business++,
 x=>x.players[0].departmentOffice.policy.mandate.borrow=true,x=>x.players[0].departmentOffice._private={},
 x=>x.players[0].departmentOffice.history.push({}),x=>x.players[0]._departmentTeaching={}
]){const bad=copy(g);damage(bad);assert.throws(()=>E.validateDepartmentSave(bad));checks++;}
const view={financialGroupVersion:4,cycle:g.cycle,gameOver:false,me:copy(g.players[0]),rival:{id:g.players[1].id},lastPlans:{[g.players[1].id]:{departmentPolicy:{private:1},leaderOrders:{private:1}}}};
E.projectDepartments(g,view,0);E.validateDepartmentView(view);
assert.equal(view.lastPlans[g.players[1].id].departmentPolicy,undefined);
assert.equal(view.lastPlans[g.players[1].id].leaderOrders,undefined);
view.rival.departmentOffice=copy(p.departmentOffice);assert.throws(()=>E.validateDepartmentView(view),/Private/);checks++;
console.log(JSON.stringify({suite:'department-domain-foundation',checks,source:'current manifest',
 note:'Domain checks are not a substitute for complete Group4 campaign, UI and multiplayer acceptance.'}));
