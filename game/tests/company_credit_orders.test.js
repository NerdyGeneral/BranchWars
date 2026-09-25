'use strict';
// Historical pre-credit fixture: select its named rules, not the latest edition.
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const copy=x=>JSON.parse(JSON.stringify(x)),context={};
const engine=require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
vm.runInNewContext(engine.replace('Object.assign(root.BWEngine,{companyCreditOrderReview});','Object.assign(root.BWEngine,{companyCreditOrderReview,prepareCompanyCreditOrders,CompanyFinance,loanProductionCapacity,availableLoanProduction,fundCompanyCreditOrders,chooseCompanyCreditOffer});'),context);
const E=context.BWEngine;
function cleanPlan(g,i,target=null){
 const p=g.players[i],plan=E.chooseBot(g,i);
 Object.assign(plan,{newProjects:[],newProject:null,investments:{},hires:0,specialistHires:E.emptySpecialistOrders(),competitiveAction:'none',opportunity:null,contractBid:null,capitalAction:false});
 plan.groupPolicy.bankDividend=0;plan.groupPolicy.bankSupport=0;
 plan.allocation={...p.allocation};plan.servicePolicy=copy(p.serviceDesk.policy);plan.servicePolicy.staff=0;
 plan.departmentFunctionsPolicy=E.defaultDepartmentFunctionsPolicy(p);
 for(const row of Object.values(plan.departmentFunctionsPolicy.quotas))for(const role of Object.keys(row))row[role]=0;
 for(const key of Object.keys(plan.departmentFunctionsPolicy.vendors))plan.departmentFunctionsPolicy.vendors[key]=0;
 plan.departmentFunctionsPolicy.quotas.credit.operations=1;
 plan.commercialAccountPolicy={target,staffQuarters:target?2:0};
 plan.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,plan).policy;
 return plan;
}
function fresh(qualified=false){
 const g=E.createGame({...({...E.previewCampaignEdition({},'expanded').options,companyCreditVersion:0}),mode:'hotseat',seed:'credit-queue',created:1});
 if(qualified)for(let month=0;month<2;month++){
  const plans=[cleanPlan(g,0,'company:0'),cleanPlan(g,1)];
  E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);
 }
 const plan=cleanPlan(g,0,qualified?'company:0':null),rivalPlan=cleanPlan(g,1);
 if(qualified)assert(Object.hasOwn(g.players[0].commercialAccounts.accounts,'company:0'),'Actual funded development must qualify the borrower');
 // Explicit domain fixture at a real campaign checkpoint, not a supported save
 // migration. No cash, employees, customers or loan claims are injected.
 g.companyEconomy={...g.companyEconomy,version:7,credit:{version:1,month:g.companyEconomy.month,notes:[]},creditCashNet:0};
 for(const c of g.companyEconomy.companies)if(c.report)Object.assign(c.report,{creditInterest:0,creditInterestPaid:0,creditPrincipalDue:0,creditPrincipalPaid:0});
 E.CompanyFinance.validate(g.companyEconomy);
 g.players=g.players.map(p=>E.CompanyCreditBank.apply(p,g.companyEconomy,p.accounting));
 return {g,plan,rivalPlan,p:g.players[0]};
}
function order(id='company:0',principal=10000){return {companyId:id,principal,months:48,annualRateBp:800,appetite:'balanced',product:id==='company:0'?'middleMarket':'smallBusiness'};}
test('a business without an existing qualified relationship cannot skip development by submitting a loan',()=>{
 const s=fresh(),before=JSON.stringify(s),r=E.companyCreditOrderReview(s.g,s.p,s.plan,[order()]);
 assert.equal(r.eligible,false);assert.match(r.reason,/Develop an operating account/);assert.equal(JSON.stringify(s),before);
});
test('a developed account receives a pure shared underwriting and funding review',()=>{
 const s=fresh(true),before=JSON.stringify(s),prepared=E.prepareCompanyCreditOrders(s.g,s.p,s.plan,[order()]),r=prepared.review;
 assert(r.eligible,r.reason);assert.equal(r.quotes[0].qualification,'Operating account');assert.equal(r.principal,10000);
 assert(r.reservedQuarters>=1);assert(r.reservedCapacity>=10000);assert.equal(r.ordinaryCapacity+r.reservedCapacity,r.capacity);
 assert(E.availableLoanProduction(s.g,prepared.owner)<=r.ordinaryCapacity+1,'The reservation cannot remain available to ordinary originations');
 assert.equal(JSON.stringify(s),before);assert.equal(s.g.companyEconomy.credit.notes.length,0,'Review is not origination');
 const empty=E.prepareCompanyCreditOrders(s.g,s.p,s.plan,[]);assert.equal(E.availableLoanProduction(s.g,empty.owner),E.loanProductionCapacity(s.g,empty.owner));
});
test('queue review refuses duplicate borrowers and unaffordable or oversized advances atomically',()=>{
 const s=fresh(true),before=JSON.stringify(s);
 assert.match(E.companyCreditOrderReview(s.g,s.p,s.plan,[order(),order()]).reason,/one complete loan offer/);
 assert.equal(E.companyCreditOrderReview(s.g,s.p,s.plan,[order('company:0',200000)]).eligible,false);
 assert.equal(E.companyCreditOrderReview(s.g,s.p,s.plan,[{...order(),months:0}]).eligible,false);
 const reserved=copy(s.plan);reserved.departmentPolicy.reserve=s.p.stats.cash;
 assert.equal(E.companyCreditOrderReview(s.g,s.p,reserved,[order()]).eligible,false);
 assert.equal(JSON.stringify(s),before);
});
test('changes to staffing invalidate previous capacity rather than reusing a stale approval',()=>{
 const s=fresh(true),ready=E.companyCreditOrderReview(s.g,s.p,s.plan,[order()]);assert(ready.eligible,ready.reason);
 const plan=copy(s.plan);plan.allocation.service+=plan.allocation.lending;plan.allocation.lending=0;
 const blocked=E.companyCreditOrderReview(s.g,s.p,plan,[order()]);assert.equal(blocked.eligible,false);
 assert.equal(E.companyCreditOrderReview(s.g,s.p,s.plan,[order()]).eligible,true);
});

test('funding an approved borrower pairs cash and the funded deposit location without creating ordinary cohorts',()=>{
 const s=fresh(true),before=JSON.stringify(s),queues=[{bankId:s.p.id,plan:s.plan,orders:[order()]},{bankId:s.g.players[1].id,plan:s.rivalPlan,orders:[]}],
  funded=E.fundCompanyCreditOrders(s.g,queues),bank=funded.players[0],company=funded.world.companies[0],original=s.g.companyEconomy.companies[0];
 assert.equal(JSON.stringify(s),before);assert.equal(funded.report.length,1);
 assert.equal(bank.stats.cash,s.p.stats.cash-5000);assert.equal(bank.stats.loans,s.p.stats.loans+10000);
 assert.equal(company.book.accounts.cash,original.book.accounts.cash+10000);assert.equal(company.book.accounts.debt,original.book.accounts.debt+10000);
 assert.equal(bank.stats.deposits,s.p.stats.deposits+5000,'Half the actual advance is located in the existing operating account');assert.equal(bank.stats.capital,s.p.stats.capital);
 assert.equal(E.commercialAccountBalance(bank),E.commercialAccountBalance(s.p)+5000);
 assert.equal(bank.stats.cash+company.book.accounts.cash-E.commercialAccountBalance(bank),s.p.stats.cash+original.book.accounts.cash-E.commercialAccountBalance(s.p),'Company cash includes its bank claim, not a second physical cash pile');
 assert.deepEqual(copy(bank.creditBook),copy(s.p.creditBook),'The funded note is not also an ordinary cohort');
 assert.deepEqual(copy(funded.players[1].accounting),copy(s.g.players[1].accounting));
 assert.equal(bank._companyCreditOrigination,funded.reservations[0].capacity);assert(bank._companyCreditOrigination>=10000);
 assert.equal(funded.players[1]._companyCreditOrigination,0);
 for(const p of funded.players)E.CompanyCreditBank.validate(p,funded.world);
 assert.deepEqual(copy(funded),copy(E.fundCompanyCreditOrders(s.g,[...queues].reverse())),'Message arrival order cannot change funded results');
 assert.throws(()=>E.fundCompanyCreditOrders({...s.g,companyEconomy:funded.world,players:funded.players},queues),/already ran/);
 const invalid=copy(queues);invalid[1].orders=[order()];
 assert.throws(()=>E.fundCompanyCreditOrders(s.g,invalid),/Develop an operating account/);
 assert.equal(JSON.stringify(s),before,'One rejected queue cannot partially advance the other bank');
});

test('borrower choice rewards suitable funding and price; exact ties rotate independently of arrival order',()=>{
 const a={bankId:'a',order:order()},b={bankId:'b',order:order()};
 assert.equal(E.chooseCompanyCreditOffer([a,b],1,0).bankId,'b');
 assert.equal(E.chooseCompanyCreditOffer([b,a],2,0).bankId,'a');
 assert.equal(E.chooseCompanyCreditOffer([a,{...b,order:{...b.order,annualRateBp:700}}],2,0).bankId,'b');
 assert.equal(E.chooseCompanyCreditOffer([{...a,order:{...a.order,principal:20000}},b],1,0).bankId,'a');
 assert.equal(E.chooseCompanyCreditOffer([{...a,order:{...a.order,months:24}},b],2,0).bankId,'b');
});

test('stale, ended and malformed offer queues fail before creating an asset',()=>{
 const s=fresh(),before=JSON.stringify(s);
 assert.match(E.companyCreditOrderReview({...s.g,cycle:s.g.cycle+1},s.p,s.plan,[]).reason,/current unsettled month/);
 assert.match(E.companyCreditOrderReview({...s.g,gameOver:true},s.p,s.plan,[]).reason,/current unsettled month/);
 for(const orders of [null,{},[null],[{...order(),principal:NaN}],[{...order(),principal:-1}],[{...order(),hidden:'extra'}]])assert.equal(E.companyCreditOrderReview(s.g,s.p,s.plan,orders).eligible,false);
 assert.throws(()=>E.fundCompanyCreditOrders(s.g,[]),/Both existing banks/);
 assert.equal(JSON.stringify(s),before);
});
