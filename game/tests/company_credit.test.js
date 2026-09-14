'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const context={},copy=x=>JSON.parse(JSON.stringify(x));
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);
const E=context.BWEngine,C=E.CompanyCredit;
function fresh(){const g=E.createGame({...E.previewCampaignEdition({},'expanded').options,mode:'hotseat',seed:'company-credit-domain',created:1});return {book:C.opening(),companies:g.companyEconomy.companies,banks:g.players.map(p=>({id:p.id,book:p.accounting}))};}
function terms(s,i=0,extra={}){return {principal:20000,months:24,annualRateBp:800,appetite:'balanced',product:C.assess(s.companies[i]).product,...extra};}
const cash=s=>s.companies.reduce((n,c)=>n+c.book.accounts.cash,0)+s.banks.reduce((n,b)=>n+b.book.accounts.cash,0);
const equity=s=>s.companies.reduce((n,c)=>n+c.book.accounts.equity,0)+s.banks.reduce((n,b)=>n+b.book.accounts.equity,0);
function fund(s,i=0,extra={}){return C.originate(s.book,s.companies,s.banks,s.companies[i].id,s.banks[i%2].id,terms(s,i,extra));}
test('company needs use actual cash, unpaid bills and a differentiated financing profile',()=>{
 const s=fresh(),before=JSON.stringify(s),needs=s.companies.map(c=>C.assess(c));
 assert.deepEqual(copy(needs.map(n=>n.product)),['middleMarket','smallBusiness','middleMarket','middleMarket','smallBusiness','smallBusiness']);
 assert(needs.every(n=>n.requested>0&&n.requested<=s.companies.find(c=>c.id===n.companyId).baseFee*12));
 const c=copy(s.companies[0]);c.book=E.GroupAccounting.post(c.book,'test.retainedTrading','outside',{cash:1000000,equity:1000000},1000000);assert.equal(C.assess(c).requested,0);
 assert.equal(JSON.stringify(s),before);
 assert.throws(()=>C.LIMITS.terms.push(120),e=>e.name==='TypeError'&&/not extensible/.test(e.message));assert.equal(C.LIMITS.terms.length,4);
 const malformed=copy(s.companies[0]);malformed.report={month:1,operatingCost:NaN,sales:1,serviceDue:1,interest:1};assert.throws(()=>C.assess(malformed),/cash-flow report/);
});
test('underwriting refuses mismatched, oversized, distressed and unsupported offers without mutation',()=>{
 const s=fresh(),c=s.companies[0],before=JSON.stringify(s);
 for(const changed of [{product:'smallBusiness'},{principal:1000000},{principal:C.assess(c).requested,months:12,appetite:'conservative'}])assert.equal(C.quote(c,terms(s,0,changed)).eligible,false);
 for(const changed of [{annualRateBp:-1},{annualRateBp:1801},{months:120},{principal:1},{appetite:'anything'},{surprise:true}])assert.throws(()=>C.quote(c,terms(s,0,changed)),/supported/);
 const late=copy(c);late.book=E.GroupAccounting.post(late.book,'test.invoice','supplier',{payables:100,equity:-100},-100);assert.match(C.quote(late,terms(s)).reason,/unpaid/);
 assert.equal(JSON.stringify(s),before);
});
test('funded loans pair actual bank cash/assets and company cash/debt; deposits and equity do not change',()=>{
 const s=fresh(),before=JSON.stringify(s),n=fund(s),amount=terms(s).principal;
 assert.equal(JSON.stringify(s),before);assert.equal(cash(n),cash(s));assert.equal(equity(n),equity(s));
 assert.equal(n.banks[0].book.accounts.cash,s.banks[0].book.accounts.cash-amount);
 assert.equal(n.banks[0].book.accounts.loans,s.banks[0].book.accounts.loans+amount);
 assert.equal(n.banks[0].book.accounts.deposits,s.banks[0].book.accounts.deposits);
 assert.equal(n.companies[0].book.accounts.debt,s.companies[0].book.accounts.debt+amount);
 assert.throws(()=>fund(n),/outstanding/);
 const broke=copy(s);broke.banks[0].book=E.AccountingPrototype.transact(broke.banks[0].book,'buySecurities',broke.banks[0].book.accounts.cash);assert.throws(()=>fund(broke),/available cash/);
});
for(const months of [12,24,36,48])test('principal and interest reconcile through '+months+' monthly payments with no repeated settlement',()=>{
 const initial=fresh();let s=fund(initial,0,{months,principal:20003,annualRateBp:731}),paid=0,interest=0,interestNumerator=0;
 const totalCash=cash(s),totalEquity=equity(s),loanBase=initial.banks[0].book.accounts.loans;
 for(let month=1;month<=months;month++){
  const before=JSON.stringify(s);interestNumerator+=s.book.notes[0].principal*731;const n=C.step(s.book,s.companies,s.banks,month);assert.equal(JSON.stringify(s),before);s=n;
  paid+=s.report[0].principalPaid;interest+=s.report[0].interestPaid;
  assert.equal(cash(s),totalCash);assert.equal(equity(s),totalEquity);assert.throws(()=>C.step(s.book,s.companies,s.banks,month),/once/);
 }
 assert.equal(paid,20003);assert.equal(s.book.notes[0].status,'repaid');assert.equal(s.banks[0].book.accounts.loans,loanBase);
 assert.equal(s.banks[0].book.retainedEarnings-initial.banks[0].book.retainedEarnings,interest);
 assert.equal(s.companies[0].book.retainedEarnings-initial.companies[0].book.retainedEarnings,-interest);
 assert.equal(interest,Math.floor(interestNumerator/120000),'Interest fractions carry rather than becoming repeated rounding income');
});
test('funded customer receipts cure arrears and resume accrual without a duplicate advance',()=>{
 let s=fund(fresh());const c=s.companies[0],spent=c.book.accounts.cash;
 const spentPair=E.GroupAccounting.servicePayment(c.book,s.companies[1].book,spent);c.book=spentPair.payer;s.companies[1].book=spentPair.provider;
 const totalCash=cash(s),totalEquity=equity(s);
 for(let month=1;month<=3;month++)s=C.step(s.book,s.companies,s.banks,month);
 assert.equal(s.book.notes[0].status,'nonperforming');
 const receipt=E.GroupAccounting.servicePayment(s.companies[1].book,s.companies[0].book,15000);s.companies[1].book=receipt.payer;s.companies[0].book=receipt.provider;
 s=C.step(s.book,s.companies,s.banks,4);assert.equal(s.book.notes[0].status,'performing');assert.equal(s.report[0].interest,0);
 s=C.step(s.book,s.companies,s.banks,5);assert(s.report[0].interest>0);assert.equal(cash(s),totalCash);assert.equal(equity(s),totalEquity);assert.throws(()=>fund(s),/outstanding/);
});
test('arrears become nonperforming, stop accrual and require explicit paired writeoff',()=>{
 let s=fund(fresh());const c=s.companies[0],spent=c.book.accounts.cash;
 c.book=E.GroupAccounting.post(c.book,'test.paidOperatingCosts','outside',{cash:-spent,equity:-spent},-spent);
 const totalCash=cash(s),totalEquity=equity(s);
 for(let month=1;month<=4;month++)s=C.step(s.book,s.companies,s.banks,month);
 assert.equal(s.book.notes[0].status,'nonperforming');assert.equal(s.report[0].interest,0);assert.equal(cash(s),totalCash);assert.equal(equity(s),totalEquity);
 const before=JSON.stringify(s),n=C.writeOff(s.book,s.companies,s.banks,c.id);assert.equal(JSON.stringify(s),before);
 assert.equal(n.book.notes[0].status,'writtenOff');assert.equal(equity(n),totalEquity);assert.equal(cash(n),totalCash);
 assert.throws(()=>C.writeOff(n.book,n.companies,n.banks,c.id),/No outstanding/);assert.throws(()=>fund(n),/written-off/);
});
test('two separate company loans cannot spend the same bank money and corrupt retained claims fail',()=>{
 let s=fund(fresh());s=fund(s,1);const cashBefore=cash(s);s=C.step(s.book,s.companies,s.banks,1);assert.equal(s.report.length,2);assert.equal(cash(s),cashBefore);
 for(const edit of [x=>x.book.notes.push(copy(x.book.notes[0])),x=>x.book.notes[0].principal=-1,x=>x.book.notes[0].interestCarry=120000,x=>x.book.notes[0].lastSettled=0,x=>x.book.notes[0].companyId='company:unknown',x=>x.book.notes[0].product='mortgage']){
  const bad=copy(s);edit(bad);assert.throws(()=>C.validate(bad.book,bad.companies,bad.banks));
 }
});

test('a repaid register remains replayable and bounded through 120 months',()=>{
 let s=fund(fresh());const totalCash=cash(s),totalEquity=equity(s);
 for(let month=1;month<=120;month++){
  const replay=C.step(copy(s.book),copy(s.companies),copy(s.banks),month),next=C.step(s.book,s.companies,s.banks,month);
  assert.deepEqual(copy(next),copy(replay));s=next;assert.equal(cash(s),totalCash);assert.equal(equity(s),totalEquity);
 }
 assert.equal(s.book.notes.length,1);assert.equal(s.book.notes[0].status,'repaid');assert(JSON.stringify(s.book).length<600);
});
