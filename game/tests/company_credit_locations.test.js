'use strict';
// Historical pre-credit fixture: select its named rules, not the latest edition.
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const copy=x=>JSON.parse(JSON.stringify(x)),context={};
const engine=require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
vm.runInNewContext(engine.replace('Object.assign(root.BWEngine,{CompanyCreditBank});','Object.assign(root.BWEngine,{CompanyCreditBank,CompanyFinance,refreshCompanyCreditDeposits,refreshCompanyCreditOwnerDeposits,settleCommercialAccounts,settleCorporateEconomy,prepareCompanyCreditOperatingForecast});'),context);
const E=context.BWEngine,F=E.CompanyFinance,B=E.CompanyCreditBank;
function plan(g,i,target=null){
 const p=g.players[i],x=E.chooseBot(g,i);
 Object.assign(x,{newProjects:[],newProject:null,investments:{},hires:0,specialistHires:E.emptySpecialistOrders(),competitiveAction:'none',opportunity:null,contractBid:null,capitalAction:false});
 x.groupPolicy.bankDividend=0;x.groupPolicy.bankSupport=0;x.allocation={...p.allocation};x.servicePolicy=copy(p.serviceDesk.policy);x.servicePolicy.staff=0;
 x.departmentFunctionsPolicy=E.defaultDepartmentFunctionsPolicy(p);
 for(const row of Object.values(x.departmentFunctionsPolicy.quotas))for(const role of Object.keys(row))row[role]=0;
 for(const key of Object.keys(x.departmentFunctionsPolicy.vendors))x.departmentFunctionsPolicy.vendors[key]=0;
 x.departmentFunctionsPolicy.quotas.credit.operations=1;x.commercialAccountPolicy={target,staffQuarters:target?2:0};
 x.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,x).policy;return x;
}
function fresh(account=true){
 const g=E.createGame({...({...E.previewCampaignEdition({},'expanded').options,companyCreditVersion:0}),mode:'hotseat',seed:'credit-queue',created:1});
 if(account)for(let m=0;m<2;m++){E.submit(g,0,plan(g,0,'company:0'));E.submit(g,1,plan(g,1));E.validatePilot(g);}
 if(account)assert(g.players[0].commercialAccounts.accounts['company:0'],'Use real paid account development');
 // Explicit domain fixture, not a supported campaign migration or free capital.
 g.companyEconomy={...g.companyEconomy,version:7,credit:{version:1,month:g.companyEconomy.month,notes:[]},creditCashNet:0};
 for(const c of g.companyEconomy.companies)if(c.report)Object.assign(c.report,{creditInterest:0,creditInterestPaid:0,creditPrincipalDue:0,creditPrincipalPaid:0});
 F.validate(g.companyEconomy);g.players=g.players.map(p=>B.apply(p,g.companyEconomy,p.accounting));return g;
}
function fund(g,lender){
 const r=F.originateCredit(g.companyEconomy,g.players.map(p=>({id:p.id,book:p.accounting})),'company:0',g.players[lender].id,{principal:10000,months:48,annualRateBp:800,appetite:'balanced',product:'middleMarket'});
 return {...copy(g),companyEconomy:r.world,players:g.players.map(p=>B.apply(p,r.world,r.banks.find(b=>b.id===p.id).book))};
}
const cash=g=>g.players.reduce((n,p)=>n+p.stats.cash-E.commercialAccountBalance(p),0)+g.companyEconomy.companies.reduce((n,c)=>n+c.book.accounts.cash,0);

for(const lender of [0,1])test('a bank '+lender+' loan locates cash at the actual account bank without duplication',()=>{
 const g=fresh(),before=JSON.stringify(g),funded=fund(g,lender),n=E.refreshCompanyCreditDeposits(funded);
 assert.equal(JSON.stringify(g),before);assert.equal(cash(n),cash(g));
 assert.equal(n.players[0].stats.deposits,g.players[0].stats.deposits+5000);
 assert.equal(n.players[0].stats.cash,g.players[0].stats.cash+5000-(lender===0?10000:0));
 assert.equal(n.players[1].stats.cash,g.players[1].stats.cash-(lender===1?10000:0));
 assert.equal(n.players[1].stats.deposits,g.players[1].stats.deposits);
 assert.equal(n.players[lender].stats.loans,g.players[lender].stats.loans+10000);
 for(const p of n.players)B.validate(p,n.companyEconomy);
 assert.deepEqual(copy(E.refreshCompanyCreditDeposits(n)),copy(n),'Re-reading unchanged cash cannot post a second deposit');
 assert.deepEqual(copy(n._companyCreditAccountOpening),copy(g.commercialAccounts.rows));
 assert.deepEqual(copy(n.commercialAccounts.rows.map(r=>[r.progress,r.misses,r.owner])),copy(g.commercialAccounts.rows.map(r=>[r.progress,r.misses,r.owner])),'Relocation is not acquisition or servicing');
});

test('a loan without an operating relationship creates no bank deposit or account',()=>{
 const g=fresh(false),n=E.refreshCompanyCreditDeposits(fund(g,1));
 assert.equal(cash(n),cash(g));
 for(let i=0;i<2;i++){assert.equal(n.players[i].stats.deposits,g.players[i].stats.deposits);assert.equal(E.commercialAccountBalance(n.players[i]),0);}
 assert(n.commercialAccounts.rows.every(r=>r.owner===null));
});

for(const lender of [0,1])test('public owner forecast and actual trading agree on loan payments and account cash for lender '+lender,()=>{
 const g=E.refreshCompanyCreditDeposits(fund(fresh(),lender)),before=JSON.stringify(g),statement=E.corporateStatement(g),previews=g.players.map(p=>{
  const own={...copy(p),marketSnapshot:copy(g.marketEconomy),companySnapshot:copy(statement)};
  E.prepareCompanyCreditOperatingForecast({economy:g.economy},own);return own;
 });
 assert.equal(JSON.stringify(g),before,'Owner-only preparation cannot mutate actual company or rival books');
 E.settleCorporateEconomy(g);
 for(let i=0;i<2;i++){
  assert.deepEqual(copy(previews[i].accounting),copy(g.players[i].accounting));
  assert.deepEqual(copy(previews[i].commercialAccounts.accounts),copy(g.players[i].commercialAccounts.accounts));
  assert.deepEqual(copy(previews[i]._companyCreditPayment),copy(g.players[i]._companyCreditPayment));
 }
 assert.equal(E.commercialAccountBalance(g.players[0]),Math.floor(g.companyEconomy.companies[0].book.accounts.cash/2));
 const opening=g._companyCreditAccountOpening[0].balance,bankBefore=copy(g.players[0].accounting);
 g.players[0]._commercialAccountQuarters=1;g.players[1]._commercialAccountQuarters=0;
 E.settleCommercialAccounts(g);
 assert.equal(g._companyCreditAccountOpening,undefined);
 assert.equal(g.commercialAccounts.report[0].before,opening);
 assert.equal(g.players[0].commercialAccounts.report.before,opening);
 assert.deepEqual(copy(g.players[0].accounting),bankBefore,'The normal closing stage cannot charge the earlier cash relocation again');
 assert.throws(()=>E.settleCommercialAccounts(g),/once in order/);
});

test('a closed company releases its deposit once and preserves the opening owner in the monthly report',()=>{
 const g=E.refreshCompanyCreditDeposits(fund(fresh(),0)),opening=copy(g._companyCreditAccountOpening),world=copy(g.companyEconomy);
 // Boundary fixture for a closed borrower; no full company validation claim.
 world.companies[0].resolution={closed:true};
 const before=g.players[0].accounting.accounts.cash,balance=E.commercialAccountBalance(g.players[0]);
 const n=E.refreshCompanyCreditDeposits({...g,companyEconomy:world});
 assert.equal(E.commercialAccountBalance(n.players[0]),0);assert.equal(n.players[0].stats.cash,before-balance);
 assert.equal(n.commercialAccounts.rows[0].owner,null);assert.deepEqual(copy(n._companyCreditAccountOpening),opening);
 assert.deepEqual(copy(E.refreshCompanyCreditDeposits(n)),copy(n));
});
