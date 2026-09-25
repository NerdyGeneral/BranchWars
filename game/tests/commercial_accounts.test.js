'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const html=require('../tools/build_game').assemble().html,c={console};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);const E=c.BWEngine;
const copy=x=>JSON.parse(JSON.stringify(x));
function game(){return E.createGame({...E.previewFeatureSelection({}, {field:'commercialAccountsVersion',value:1}).options,mode:'hotseat',seed:'business-cash',created:1});}
function plan(g,i,target=null){
 const p=g.players[i],v=E.publicState(g,i),a=E.chooseBot(g,i);
 a.commercialAccountPolicy={target,staffQuarters:target?2:0};
 a.newProjects=[];a.newProject=null;a.hires=0;a.specialistHires=E.emptySpecialistOrders();a.investments={};a.competitiveAction='none';a.opportunity=null;a.contractBid=null;
 a.allocation={...p.allocation};a.servicePolicy=copy(p.serviceDesk.policy);
 a.servicePolicy.staff=0;a.departmentFunctionsPolicy=E.defaultDepartmentFunctionsPolicy(p);
 for(const row of Object.values(a.departmentFunctionsPolicy.quotas))for(const role of Object.keys(row))row[role]=0;
 for(const key of Object.keys(a.departmentFunctionsPolicy.vendors))a.departmentFunctionsPolicy.vendors[key]=0;
 a.facilityPolicy=E.defaultFacilityPolicy();a.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);
 a.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,a).policy;
 a.commercialAccountPolicy={target,staffQuarters:target?2:0};
 return a;
}
test('Business accounts are explicit new rules; old saves are not upgraded',()=>{
 const g=game();assert.equal(g.version,'9.10');assert.equal(g.commercialAccountsVersion,1);E.validatePilot(g);
 const old=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:10}).options,seed:1,created:1});
 assert.equal(old.version,'9.9');assert.equal(E.migrateCampaign(copy(old)).commercialAccountsVersion,undefined);
 assert.throws(()=>E.createGame({commercialAccountsVersion:1,seed:1,created:1}));
 assert.throws(()=>E.migrateCampaign({...copy(g),commercialAccountsVersion:0}));
 const v=E.publicState(g,0);E.validateFinancialGroupView(v);assert(!v.rival.commercialAccounts);
 assert(v.commercialAccountMarket.rows.every(r=>typeof r.progress==='number'));
});

test('Account work uses physical Business time once, without crediting treasury or buying imaginary officers',()=>{
 const g=game(),p=g.players[0],a=plan(g,0,'company:0');
 // Existing two Business bankers: eight quarter-months, no added resources.
 assert.equal(p.allocation.business,2);
 for(const standing of [0,8])for(const requested of [0,1,4,8]){
  p.commercialAccounts.policy={target:'company:0',staffQuarters:standing};
  a.commercialAccountPolicy={target:'company:0',staffQuarters:requested};
  const before=JSON.stringify({g,a}),quote=E.departmentFunctionsQuote(g,p,a),owner=E.departmentCustomerPreview(p,g,a).owner,
   review=E.commercialAccountReview(g,p,a);
  assert.equal(quote.attribution.exactRetainedTasks.commercialDelivery.business,0,'Accounts cannot earn treasury/service delivery credit');
  assert.equal(quote.delivery.remainingPools.business,8,'Department reservation excludes the separate account desk');
  assert.equal(review.capacity,8);assert.equal(review.quarters,requested,'Increasing requested work must not reduce delivered work');
  assert.equal(E.commercialSalesStaff(owner),2-requested/4,'Only one deduction from ordinary sales');
  assert.equal(E.facilityLifecycleStaff(owner).business,8-requested,'Offices cannot reuse account officers');
  assert.equal(E.lifecycleInstructionQuote(g,p,a).availableStaffQuarters.business,8-requested,'Draft, not standing policy, controls office availability');
  assert.equal(JSON.stringify({g,a}),before,'All staffing quotes remain pure');
 }
 a.commercialAccountPolicy.staffQuarters=8;
 a.servicePolicy.staff=1;
 let review=E.commercialAccountReview(g,p,a);
 assert.equal(review.capacity,4);assert.equal(review.quarters,4,'Service desk work consumes the same physical pool first');
 a.departmentFunctionsPolicy.quotas.relationships.business=2;
 a.departmentFunctionsPolicy.vendors.relationships=2;
 review=E.commercialAccountReview(g,p,a);
 assert.equal(review.capacity,2);assert.equal(review.quarters,2,'Allocated relationship work and vendors cannot also become account officers');
});

test('Preserved candidate reproduces the full-team zero-work defect; the repair does not replace that evidence',()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),
  bytes=fs.readFileSync(path.resolve(__dirname,'../reports/reference-builds/BRANCH_WARS_business1_bb6ae726.html'));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'bb6ae726ed5db903681ce340bd9d60efc7baf1d28e5964004e032a3e3f5da514');
 const ctx={console};vm.runInNewContext(bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
 const old=ctx.BWEngine,g=old.createGame({...old.previewFeatureSelection({},{field:'commercialAccountsVersion',value:1}).options,seed:'work-audit',created:1}),
  p=g.players[0],a=plan(g,0,'company:0');
 p.commercialAccounts.policy={target:'company:0',staffQuarters:8};a.commercialAccountPolicy=copy(p.commercialAccounts.policy);
 assert.equal(old.commercialAccountReview(g,p,a).quarters,0,'Frozen candidate must retain the failing-before example');
 assert.equal(old.departmentFunctionsQuote(g,p,a).attribution.exactRetainedTasks.commercialDelivery.business,8);
 assert.equal(E.commercialAccountReview(g,p,a).quarters,8,'Same saved state and draft now deliver the available team');
 assert.equal(E.departmentFunctionsQuote(g,p,a).attribution.exactRetainedTasks.commercialDelivery.business,0);
});
test('Ordinary banks qualify accounts over time and reconcile actual company funding',()=>{
 const g=game();let funded=false;
 for(let month=0;month<5;month++){
  const a=plan(g,0,'company:0'),b=plan(g,1,null),v=E.publicState(g,0),before=JSON.stringify(g);
  // Repeating a full-team order catches the old standing-policy double debit;
  // reducing it later checks draft changes reach the actual settlement too.
  if(month<2)a.commercialAccountPolicy.staffQuarters=8;
  const q=E.commercialAccountReview(v,v.me,a);assert.equal(JSON.stringify(g),before);assert(q.quarters>0);
  E.submit(g,0,a);const checkpoint=E.migrateCampaign(copy(g));assert.equal(checkpoint.players[0].submitted.commercialAccountPolicy.target,'company:0');
  E.submit(g,1,b);E.validatePilot(g);
  const row=g.commercialAccounts.rows[0],p=g.players[0];
  assert.equal(p.commercialAccounts.report.quarters,q.quarters,'Preview and actual shared work must agree for this unchanged staffing plan');
  if(row.owner===p.id){funded=true;assert.equal(row.balance,Math.floor(g.companyEconomy.companies[0].book.accounts.cash/2));assert.equal(E.commercialAccountBalance(p),row.balance);}
  assert.equal(p.stats.deposits,p.depositBook.cohorts.reduce((n,c)=>n+c.principal,0)+E.commercialAccountBalance(p));
  console.log('business month',month+1,'cash',row.balance,'qualification',row.progress[0],'work',p.commercialAccounts.report.quarters);
 }
 assert(funded,'An ordinary bank must reach a funded account without injected cash/staff');
 for(let i=0;i<3;i++){E.submit(g,0,plan(g,0,null));E.submit(g,1,plan(g,1,null));E.validatePilot(g);}
 assert.equal(g.commercialAccounts.rows[0].owner,null,'Three missed service months must withdraw the account');
 assert.equal(E.commercialAccountBalance(g.players[0]),0);
});
test('Simultaneous qualified offers, finite work, corporate closure and invalid policy rules',()=>{
 const g=game(),D=E.CommercialAccounts,companies=copy(g.companyEconomy.companies),ids=g.players.map(p=>p.id);
 let book=D.opening(companies);
 const banks=ids.map((id,i)=>({id,policy:{target:'company:0',staffQuarters:1},quarters:1,score:i?5:3,reachable:['downtown'],treasury:[]}));
 const before=JSON.stringify({book,companies,banks});const first=D.step(book,companies,banks,1);assert.equal(JSON.stringify({book,companies,banks}),before);
 assert.equal(first.rows[0].owner,null);book=D.step(first,companies,banks,2);assert.equal(book.rows[0].owner,ids[1]);
 assert.equal(book.rows[0].balance,Math.floor(companies[0].book.accounts.cash/2));
 assert.throws(()=>D.step(book,companies,banks,2),'No duplicate settlement');
 const closed=copy(companies);closed[0].resolution={month:3};closed[0].book.accounts.cash=0;
 const next=D.step(book,closed,banks,3);assert.equal(next.rows[0].owner,null);assert.equal(next.rows[0].balance,0);
 for(const policy of [null,{}, {target:'unknown',staffQuarters:1},{target:null,staffQuarters:9},{target:null,staffQuarters:.5}])assert.throws(()=>D.checkPolicy(policy,companies.map(c=>c.id)));
 const p=g.players[0];assert.throws(()=>E.normalizeCommercialAccountPlan(p,{commercialAccountPolicy:null}));
 const forged=copy(g);forged.commercialAccounts.cycle=1;assert.throws(()=>E.migrateCampaign(forged));
});
