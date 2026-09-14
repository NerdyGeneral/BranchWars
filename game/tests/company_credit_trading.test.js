'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const context={},copy=x=>JSON.parse(JSON.stringify(x));
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);
const domain={};
vm.runInNewContext(['accounting','group-accounting','company-credit','company-finance','corporate-circulation'].map(name=>fs.readFileSync(path.join(__dirname,'../src/engine',name+'.js'),'utf8')).join('\n')+'\nthis.F=CompanyFinance;this.R=CorporateCirculation;',domain);
const E=context.BWEngine,F=domain.F,C=E.CompanyCredit,R=domain.R;
function fresh(){
 const g=E.createGame({...E.previewCampaignEdition({},'expanded').options,mode:'hotseat',seed:'credit-trading',created:1});
 return {world:F.withCredit(g.companyEconomy),banks:g.players.map(p=>({id:p.id,book:p.accounting})),sources:R.IDS.map(id=>E.GroupAccounting.opening(id)),holder:E.GroupAccounting.opening('test:outside-holder')};
}
function advance(s,index=0,principal=100000){
 const company=s.world.companies[index],terms={principal,months:48,annualRateBp:800,appetite:'balanced',product:C.assess(company).product};
 return {...s,...F.originateCredit(s.world,s.banks,company.id,s.banks[index%2].id,terms)};
}
function next(s,demand=1){
 const result=F.step(s.world,{demand,banks:s.banks}),circulated=R.step(result.world,s.sources),routed=F.payShareholder(circulated.world,s.holder,0);
 return {...s,...result,world:routed.world,sources:circulated.sources,holder:routed.recipient};
}
const cash=s=>[s.world.outside,s.world.creditor,...s.world.companies.map(c=>c.book),...s.banks.map(b=>b.book),...s.sources,s.holder].reduce((a,b)=>a+b.accounts.cash,0);
const equity=s=>[s.world.outside,s.world.creditor,...s.world.companies.map(c=>c.book),...s.banks.map(b=>b.book),...s.sources,s.holder].reduce((a,b)=>a+b.accounts.equity,0);
test('actual corporate trading repays only each lender own principal and interest before dividends',()=>{
 let s=advance(fresh()),initial=copy(s),initialCash=cash(s),initialEquity=equity(s),paid=0,interest=0;
 for(let month=1;month<=48;month++){
  const before=JSON.stringify(s),oldDebt=s.world.companies[0].book.accounts.debt-s.world.credit.notes[0].principal;
  const replay=next(copy(s)),result=next(s);assert.equal(JSON.stringify(s),before);s=result;assert.equal(JSON.stringify(replay),JSON.stringify(s));
  const c=s.world.companies[0],n=s.world.credit.notes[0];
  assert.equal(c.report.interest,Math.round(oldDebt*.005),'Outside lender never earns interest on the bank advance');
  assert.equal(c.book.accounts.debt,Math.max(0,oldDebt-c.report.principalPaid)+n.principal);
  assert.equal(s.world.creditor.accounts.businessAssets,s.world.companies.reduce((v,c)=>v+c.book.accounts.debt+c.interestArrears,0)-s.world.credit.notes.reduce((v,n)=>v+n.principal,0));
  assert.equal(c.report.profit,c.report.sales-c.report.operatingCost-c.report.interest-c.report.serviceDue-c.report.creditInterest+c.report.resolutionEarnings);
  assert.equal(C.assess(c).cashAfterDebt,c.report.sales-c.report.operatingCost-c.report.serviceDue-c.report.interest-c.report.creditInterest-c.report.principalDue-c.report.creditPrincipalDue);
  assert.equal(cash(s),initialCash);assert.equal(equity(s),initialEquity);
  assert.equal(s.banks[0].book.accounts.deposits,initial.banks[0].book.accounts.deposits);
  paid+=c.report.creditPrincipalPaid;interest+=c.report.creditInterestPaid;
 }
 assert.equal(paid,100000);assert.equal(s.world.credit.notes[0].status,'repaid');
 assert.equal(s.banks[0].book.accounts.cash,initial.banks[0].book.accounts.cash+paid+interest);
 assert.equal(s.world.creditCashNet,interest);
});
test('credit-enabled company worlds reject inconsistent claims, cash boundaries and missing lender books',()=>{
 const s=advance(fresh()),before=JSON.stringify(s);
 for(const edit of [x=>x.creditCashNet++,x=>x.credit.month++,x=>x.credit.notes[0].principal++,x=>x.credit.notes[0].interestDue++,x=>x.credit.notes[0].bankId='']){
  const bad=copy(s.world);edit(bad);assert.throws(()=>F.validate(bad));
 }
 assert.throws(()=>F.step(s.world,{demand:1}),/demand/);
 assert.throws(()=>F.step(s.world,{demand:1,banks:[]}),/credit/);
 assert.throws(()=>F.withCredit(s.world),/creation/);
 assert.throws(()=>C.originate(s.world.credit,s.world.companies,undefined,'company:0','bank:0',{}),/Lender books/);
 assert.equal(JSON.stringify(s),before);
});
test('trading stress stops dividends in arrears and resolves real funded bank claims without duplicate supplier losses',t=>{
 let s=advance(advance(fresh(),0,200000),1,200000),initialCash=cash(s),initialEquity=equity(s),arrears=false,resolved=false;
 for(let month=1;month<=120;month++){
  const prior=s;s=next(s,.35);F.validate(s.world);C.validate(s.world.credit,s.world.companies,s.banks);
  assert.equal(cash(s),initialCash);
  assert.equal(equity(s),initialEquity-s.world.companies.reduce((v,c)=>v+(c.resolution?.assetLoss||0),0),'Only actual productive-asset haircuts destroy aggregate equity');
  for(const [index,b] of s.banks.entries()){
   const flows=s.creditReport.filter(f=>f.bankId===b.id),owned=s.world.credit.notes.filter(n=>n.bankId===b.id),closing=owned.map(n=>s.world.companies.find(c=>c.id===n.companyId)).filter(c=>c.resolution?.month===month);
   assert.equal(b.book.accounts.cash-prior.banks[index].book.accounts.cash,flows.reduce((v,f)=>v+f.principalPaid+f.interestPaid,0)+closing.reduce((v,c)=>v+c.resolution.creditRecovery,0));
   assert.equal(b.book.accounts.equity-prior.banks[index].book.accounts.equity,flows.reduce((v,f)=>v+f.interest,0)-closing.reduce((v,c)=>v+c.resolution.creditWriteoff,0));
   assert.equal(b.book.accounts.loans-prior.banks[index].book.accounts.loans,owned.reduce((v,n)=>v+n.principal,0)-prior.world.credit.notes.filter(n=>n.bankId===b.id).reduce((v,n)=>v+n.principal,0));
  }
  for(const n of s.world.credit.notes){const c=s.world.companies.find(c=>c.id===n.companyId);
   if(n.principalPastDue||n.interestDue){arrears=true;assert.equal(c.report.dividend,0);}
   if(c.resolution){resolved=true;assert.equal(n.principal+n.interestDue,0);assert.equal(c.book.accounts.debt,0);assert.equal(c.book.accounts.payables,0);}
  }
 }
 assert(arrears,'Stress must exercise arrears, not only healthy repayment');assert(resolved,'Stress must exercise actual company liquidation');
 assert(s.world.companies.some(c=>c.resolution?.creditWriteoff>0),'Unsecured bank lending must share losses with other unsecured creditors');
 t.diagnostic(JSON.stringify({months:120,demand:.35,loans:s.world.credit.notes.map(n=>({company:n.companyId,status:n.status,resolution:s.world.companies.find(c=>c.id===n.companyId).resolution})),cashConserved:true}));
});
test('an unintegrated credit world cannot be imported into an existing Expanded campaign',()=>{
 const g=E.createGame({...E.previewCampaignEdition({},'expanded').options,mode:'hotseat',seed:'reject-premature-credit',created:1});
 g.companyEconomy=F.withCredit(g.companyEconomy);const before=JSON.stringify(g);
 assert.throws(()=>E.migrateCampaign(copy(g)));assert.equal(JSON.stringify(g),before);
});
test('partial cash liquidation recovers before writing off only the unpaid lender claim',()=>{
 let s=advance(fresh()),world=s.world,c=world.companies[0];
 const paid=E.GroupAccounting.servicePayment(c.book,s.sources[0],c.book.accounts.cash-1234);c.book=paid.payer;s.sources[0]=paid.provider;
 // This test exercises the paired recovery domain, independently of the world
 // liquidation trigger; CompanyFinance stress above exercises the actual order.
 const before=cash(s),banksBefore=copy(s.banks),r=C.recover(world.credit,world.companies,s.banks,c.id);
 assert.throws(()=>C.recover(world.credit,world.companies,s.banks,c.id,1235),/allocated borrower cash/);
 assert.equal(r.paid,1234);assert.equal(r.loss,98766);assert.equal(r.book.notes[0].status,'writtenOff');
 assert.equal(r.banks[0].book.accounts.cash,banksBefore[0].book.accounts.cash+1234);
 assert.equal(r.banks[0].book.accounts.equity,banksBefore[0].book.accounts.equity-r.loss);
 s={...s,world:{...world,companies:r.companies,credit:r.book},banks:r.banks};assert.equal(cash(s),before);
 assert.throws(()=>C.recover(r.book,r.companies,r.banks,c.id),/No outstanding/);
});
