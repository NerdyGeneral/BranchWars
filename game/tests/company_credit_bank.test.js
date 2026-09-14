'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const copy=x=>JSON.parse(JSON.stringify(x)),context={};
// Expose existing lexical functions for focused integration tests; no alternate
// accounting, amortization, funding or collection implementation is supplied.
const engine=require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
vm.runInNewContext(engine.replace('Object.assign(root.BWEngine,{CompanyCreditBank});','Object.assign(root.BWEngine,{CompanyCreditBank,CompanyFinance,CorporateCirculation,repayCredit,creditSummary,reconcileCredit,provideCash,validateCreditSave,settleCreditPerformance,acquisitionTerms,syncAccounts});'),context);
const E=context.BWEngine,F=E.CompanyFinance,B=E.CompanyCreditBank;
function fresh(){
 const g=E.createGame({...E.previewCampaignEdition({},'expanded').options,mode:'hotseat',seed:'credit-bank-assets',created:1});
 const world=F.withCredit(g.companyEconomy);return {g,world,players:g.players.map(copy)};
}
function fund(s,i=0){
 const p=s.players[i],c=s.world.companies[i],r=F.originateCredit(s.world,s.players.map(p=>({id:p.id,book:p.accounting})),c.id,p.id,{principal:100000,months:48,annualRateBp:800,appetite:'balanced',product:E.CompanyCredit.assess(c).product});
 return {...s,world:r.world,players:s.players.map((p,j)=>B.apply(p,r.world,r.banks[j].book))};
}
test('funded named credit adds one local loan asset, no synthetic ordinary cohorts or deposit income',()=>{
 const s=fresh(),before=JSON.stringify(s),r=fund(s),old=s.players[0],p=r.players[0];
 assert.equal(JSON.stringify(s),before);assert.deepEqual(copy(p.creditBook),copy(old.creditBook));
 assert.equal(p.stats.loans,old.stats.loans+100000);assert.equal(p.stats.cash,old.stats.cash-100000);
 assert.equal(p.stats.capital,old.stats.capital);assert.equal(p.stats.deposits,old.stats.deposits);
 assert.equal(p.marketBook.markets[r.world.companies[0].market].loans,old.marketBook.markets[r.world.companies[0].market].loans+100000);
 for(const owner of r.players)B.validate(owner,r.world);
 E.validateCreditSave({...s.g,players:r.players});
 assert.throws(()=>E.migrateCampaign({...copy(s.g),players:copy(r.players)}),/not enabled/);
});
test('ordinary scheduled repayments and collections do not repay or charge off company claims',()=>{
 const s=fund(fresh()),p=s.players[0],ordinary=copy(s.g.players[0]),named=copy(p.companyCredit),before=p.stats.cash;
 const expected=E.repayCredit(ordinary),paid=E.repayCredit(p);
 assert.equal(paid,expected);assert.equal(p.stats.cash-before,expected);assert.equal(p.stats.loans-ordinary.stats.loans,100000);
 assert.deepEqual(copy(p.companyCredit),named);B.validate(p,s.world);
 const g={...s.g,players:s.players};E.settleCreditPerformance(g,p);E.settleCreditPerformance({...s.g,players:[ordinary,s.g.players[1]]},ordinary);
 assert.equal(p.stats.loans-ordinary.stats.loans,100000);assert.deepEqual(copy(p.companyCredit),named);B.validate(p,s.world);
 assert.equal(E.creditSummary(p).monthlyInterest,E.creditSummary(ordinary).monthlyInterest,'Ordinary coupon calculation cannot pay the named coupon again');
});
test('bank and borrower payments reconcile while ordinary portfolios continue amortizing',()=>{
 let s=fund(fresh()),sources=E.CorporateCirculation.IDS.map(id=>E.GroupAccounting.opening(id)),holder=E.GroupAccounting.opening('test:holder');
 for(let month=1;month<=12;month++){
  for(const p of s.players)E.repayCredit(p);
  const cohorts=s.players.map(p=>JSON.stringify(p.creditBook)),r=F.step(s.world,{demand:1,banks:s.players.map(p=>({id:p.id,book:p.accounting}))});
  s.players=s.players.map((p,i)=>B.apply(p,r.world,r.banks[i].book));
  const circulated=E.CorporateCirculation.step(r.world,sources);sources=circulated.sources;
  const routed=F.payShareholder(circulated.world,holder,0);s.world=routed.world;holder=routed.recipient;
  for(const [i,p] of s.players.entries()){assert.equal(JSON.stringify(p.creditBook),cohorts[i]);B.validate(p,s.world);}
  assert.equal(s.players[0].companyCredit.claims[0].principal,s.world.credit.notes[0].principal);
 }
});
test('automatic funding sales and portfolio acquisitions cannot silently erase or clone an individual claim',()=>{
 const s=fund(fresh()),p=s.players[0],claim=copy(p.companyCredit),needed=p.stats.cash+p.accounting.accounts.securities+p.accounting.accounts.loans+100000;
 E.provideCash(p,needed);
 assert.equal(p.stats.loans,100000);assert.deepEqual(copy(p.companyCredit),claim);assert.equal(p.creditBook.cohorts.length,0);
 assert(p.stats.emergencyDebt>0,'Funding shortfall remains explicit; named principal is not free sale cash');B.validate(p,s.world);
 const g={...s.g,players:s.players},terms=E.acquisitionTerms(g,s.players[1],s.world.companies[0].market);assert.equal(terms.loanTake,0);
 const before=JSON.stringify(p);assert.throws(()=>B.apply(p,s.world,E.AccountingPrototype.transact(p.accounting,'income',100)),/Unexpected posting/);assert.equal(JSON.stringify(p),before);
});
test('replayed bank projections are idempotent and stale or mismatched postings fail without mutation',()=>{
 const s=fund(fresh()),p=s.players[0],before=JSON.stringify(p),again=B.apply(p,s.world,p.accounting);
 assert.equal(JSON.stringify(again),before);
 const changed=copy(s.world);changed.credit.notes[0].principal++;assert.throws(()=>B.apply(p,changed,p.accounting));
 const stale=copy(p);stale.companyCredit.month=2;assert.throws(()=>B.apply(stale,s.world,stale.accounting),/Stale/);
 const mismatch=copy(p);mismatch.companyCredit.claims[0].principal++;assert.throws(()=>B.validate(mismatch,s.world),/disagree/);
 assert.equal(JSON.stringify(p),before);
});
test('existing departmental credit and risk workloads include named loan balances without adding staff',()=>{
 const s=fund(fresh()),p=s.players[0],plan=E.chooseBot(s.g,0),before=JSON.stringify({s,plan});
 const old=E.DepartmentFunctionContext.build(s.g,s.g.players[0],plan),current=E.DepartmentFunctionContext.build(s.g,p,plan);
 assert.equal(current.workloadSources.loanPrincipal-old.workloadSources.loanPrincipal,100000);
 assert.equal(current.workloadSources.loanVintages-old.workloadSources.loanVintages,1);
 assert.equal(current.workloadSources.employedBankers,old.workloadSources.employedBankers);
 assert.equal(JSON.stringify({s,plan}),before);
});
