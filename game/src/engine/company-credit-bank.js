// Bank-side asset attribution for explicit company credit. The company world's
// register owns loan terms; this small owner projection is reconciled to it.
// Ordinary cohort routines must never amortize or sell these same claims again.
function companyCreditPrincipal(p,market=null){
 if(p.companyCredit===undefined)return 0;
 return p.companyCredit.claims.filter(n=>market===null||n.market===market).reduce((sum,n)=>sum+n.principal,0);
}
function ordinaryLoanPrincipal(p,market=null){
 const total=market===null?p.stats.loans:p.marketBook.markets[market].loans;
 return Math.max(0,total-companyCreditPrincipal(p,market));
}
const CompanyCreditBank=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x));
 function projection(world,bankId){
  if(world.version!==7)throw Error('Named-company bank claims require the explicit credit world.');
  CompanyFinance.validate(world);
  return {version:1,month:world.month,claims:world.credit.notes.filter(n=>n.bankId===bankId&&(n.principal||n.interestDue))
   .map(n=>({companyId:n.companyId,market:n.market,principal:n.principal,interestDue:n.interestDue}))};
 }
 function validate(p,world){
  const expected=projection(world,p.id);
  if(JSON.stringify(p.companyCredit)!==JSON.stringify(expected))throw Error('Named-company bank assets disagree with borrower claims.');
  AccountingPrototype.check(p.accounting);
  if(!p.creditBook||!p.marketBook)throw Error('Company credit requires an existing local loan portfolio.');
  for(const [market,m]of Object.entries(p.marketBook.markets)){
   const ordinary=p.creditBook.cohorts.filter(c=>c.market===market).reduce((sum,c)=>sum+c.principal,0);
   if(ordinary+companyCreditPrincipal(p,market)!==m.loans)throw Error('Named and ordinary local loans do not reconcile.');
  }
  const principal=Object.values(p.marketBook.markets).reduce((sum,m)=>sum+m.loans,0);
  if(principal!==p.accounting.accounts.loans||principal!==p.stats.loans||expected.claims.some(n=>!p.marketBook.markets[n.market])||
   expected.claims.reduce((sum,n)=>sum+n.interestDue,0)>p.accounting.accounts.receivables)throw Error('Company loan assets exceed the bank ledger.');
  return expected;
 }
 function apply(p,world,bankBook){
  const next=copy(p),projected=projection(world,p.id),previous=p.companyCredit||{version:1,month:world.month,claims:[]};
  AccountingPrototype.check(bankBook);
  // Accept only the paired credit postings since this exact bank checkpoint.
  // Borrowing, ordinary income or unrelated asset edits cannot hitch a ride.
  let replay=copy(p.accounting);
  for(const entry of bankBook.journal.filter(e=>e.id>p.accounting.sequence)){
   const d=entry.changes,keys=Object.keys(d).sort().join(),source=entry.source;
   const valid=source==='companyCredit.advance'?keys==='cash,loans'&&d.loans>0&&d.cash===-d.loans&&entry.earnings===0:
    source==='companyCredit.interest'?keys==='equity,receivables'&&d.receivables>0&&d.equity===d.receivables&&entry.earnings===d.equity:
    ['companyCredit.payment','companyCredit.recovery'].includes(source)?keys==='cash,loans,receivables'&&d.loans<=0&&d.receivables<=0&&d.cash===-d.loans-d.receivables&&entry.earnings===0:
    source==='companyCredit.writeoff'?keys==='equity,loans,receivables'&&d.loans<=0&&d.receivables<=0&&d.equity===d.loans+d.receivables&&entry.earnings===d.equity:false;
   if(!valid||entry.id!==replay.sequence+1)throw Error('Unexpected posting in named-company credit settlement.');
   replay=AccountingPrototype.post(replay,source,d,entry.earnings);
  }
  if(JSON.stringify(replay)!==JSON.stringify(bankBook))throw Error('Company-credit bank checkpoint does not match.');
  if(previous.version!==1||!Array.isArray(previous.claims)||previous.month>world.month||world.month>previous.month+1)throw Error('Stale named-company bank settlement.');
  const sum=(claims,key)=>claims.reduce((s,n)=>s+n[key],0);
  if(bankBook.accounts.loans-p.accounting.accounts.loans!==sum(projected.claims,'principal')-sum(previous.claims,'principal')||
   bankBook.accounts.receivables-p.accounting.accounts.receivables!==sum(projected.claims,'interestDue')-sum(previous.claims,'interestDue'))throw Error('Bank posting is not the matching company-credit asset movement.');
  for(const n of [...previous.claims,...projected.claims])if(!next.marketBook?.markets[n.market])throw Error('Company loan has no matching market.');
  for(const n of previous.claims)next.marketBook.markets[n.market].loans-=n.principal;
  for(const n of projected.claims)next.marketBook.markets[n.market].loans+=n.principal;
  next.companyCredit=projected;next.accounting=copy(bankBook);syncAccounts(next);validate(next,world);return next;
 }
 function movements(before,after){
  const flow={interest:0,principalPaid:0,interestPaid:0,recoveredPrincipal:0,recoveredInterest:0,principalWrittenOff:0,interestWrittenOff:0};
  for(const e of after.journal.filter(e=>e.id>before.sequence)){
   if(e.source==='companyCredit.interest')flow.interest+=e.earnings;
   else if(e.source==='companyCredit.payment'){flow.principalPaid-=e.changes.loans;flow.interestPaid-=e.changes.receivables;}
   else if(e.source==='companyCredit.recovery'){flow.recoveredPrincipal-=e.changes.loans;flow.recoveredInterest-=e.changes.receivables;}
   else if(e.source==='companyCredit.writeoff'){flow.principalWrittenOff-=e.changes.loans;flow.interestWrittenOff-=e.changes.receivables;}
   else throw Error('Unexpected posting in the company-credit income bridge.');
  }
  return flow;
 }
 function forecast(p,world,options){
  validate(p,world);
  const result=CompanyFinance.forecast(world,options);let book=copy(p.accounting);
  for(const e of result.creditPostings.filter(e=>e.bankId===p.id))book=AccountingPrototype.post(book,e.source,e.changes,e.earnings);
  return {world:result.world,owner:apply(p,result.world,book),flow:movements(p.accounting,book),report:result.creditReport.filter(r=>r.bankId===p.id)};
 }
 return Object.freeze({projection,validate,apply,movements,forecast});
})();
