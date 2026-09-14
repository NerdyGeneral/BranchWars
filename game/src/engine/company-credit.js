// Corporate credit assessment and paired-book domain. Funding is deliberately
// not installed in campaign settlement until its new-version adapter covers
// borrower operations, bank cohorts, failure, transfers and peer compatibility.
// Assessment is read-only and can describe existing public company statements.
const CompanyCredit=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),whole=n=>Number.isSafeInteger(n)&&n>=0;
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 const PRODUCTS=['middleMarket','smallBusiness'];
 const LIMITS=Object.freeze({reserveMonths:2,maxFeeMonths:12,minPrincipal:1000,maxAnnualRateBp:1800,minAnnualRateBp:400,terms:Object.freeze([12,24,36,48]),coverage:Object.freeze({conservative:1.5,balanced:1.2,growth:1})});
 function companyCheck(c){
  if(!c||!/^company:[0-5]$/.test(c.id)||c.clientIndex!==Number(c.id.slice(-1))||typeof c.market!=='string'||!c.market||c.book?.entityId!==c.id||!whole(c.baseFee)||!c.baseFee||c.baseFee>100000||!whole(c.principalDue)||!whole(c.principalArrears)||!whole(c.interestArrears))throw Error('A valid named company statement is required.');
  if(c.report!==null&&(!c.report||['month','operatingCost','sales','serviceDue','interest'].some(k=>!whole(c.report[k]))||c.report.agencyExpense!==undefined&&!whole(c.report.agencyExpense)))throw Error('A valid settled company cash-flow report is required.');
  GroupAccounting.validate(c.book);
 }
 function assess(c){
  companyCheck(c);
  const a=c.book.accounts,r=c.report,operatingCost=r?r.operatingCost:10*c.baseFee,
   sales=r?r.sales:12*c.baseFee,services=r?r.serviceDue:c.baseFee,insurance=r?.agencyExpense||0,
   interest=r?r.interest+(r.creditInterest||0):Math.round(a.debt*.005),principal=r&&Object.hasOwn(r,'creditPrincipalDue')?r.principalDue+r.creditPrincipalDue:Math.min(a.debt,c.principalDue+c.principalArrears),
   reserve=operatingCost*LIMITS.reserveMonths,shortfall=Math.max(0,reserve-a.cash),
   requested=c.resolution?0:Math.floor(Math.min(shortfall,LIMITS.maxFeeMonths*c.baseFee,Math.max(0,a.equity)*.25)/1000)*1000,
   cashAfterDebt=sales-operatingCost-services-insurance-interest-principal;
  return {companyId:c.id,market:c.market,product:[1,4,5].includes(c.clientIndex)?'smallBusiness':'middleMarket',
   purpose:'Operating liquidity',cash:a.cash,debt:a.debt,unpaidBills:a.payables,operatingCost,reserve,shortfall,requested,
   cashAfterDebt,sourceMonth:r?.month??0,closed:!!c.resolution,
   basis:r?'Last settled company cash flow; not a forecast of new sales.':'Opening profile estimate; no settled trading history yet.'};
 }
 function quote(c,terms){
  const need=assess(c);
  if(!exact(terms,['principal','months','annualRateBp','appetite','product'])||!whole(terms.principal)||terms.principal<LIMITS.minPrincipal||
   !LIMITS.terms.includes(terms.months)||!whole(terms.annualRateBp)||terms.annualRateBp<LIMITS.minAnnualRateBp||terms.annualRateBp>LIMITS.maxAnnualRateBp||
   !Object.hasOwn(LIMITS.coverage,terms.appetite)||!PRODUCTS.includes(terms.product))throw Error('Choose supported corporate credit terms.');
  const monthlyPrincipal=Math.ceil(terms.principal/terms.months),monthlyInterest=Math.floor(terms.principal*terms.annualRateBp/120000),
   monthlyPayment=monthlyPrincipal+monthlyInterest,coverage=monthlyPayment?Math.max(0,need.cashAfterDebt)/monthlyPayment:0;
  let reason='';
  if(need.closed)reason='This company has stopped trading.';
  else if(terms.product!==need.product)reason='This offer does not fit the company financing profile.';
  else if(terms.principal>need.requested)reason='The advance exceeds the company operating-cash need or exposure limit.';
  else if(c.book.accounts.equity<=0||c.principalArrears||c.interestArrears||need.unpaidBills)reason='Existing unpaid obligations require recovery, not a new growth advance.';
  else if(coverage<LIMITS.coverage[terms.appetite])reason='Observed cash flow does not cover this offer under the selected underwriting standard.';
  return {need,terms:copy(terms),monthlyPrincipal,monthlyInterest,monthlyPayment,coverage,requiredCoverage:LIMITS.coverage[terms.appetite],eligible:!reason,reason};
 }
 const opening=()=>({version:1,month:0,notes:[]});
 const noteKeys=['id','companyId','bankId','market','product','original','principal','remaining','annualRateBp','interestDue','interestCarry','principalPastDue','misses','opened','lastSettled','status'];
 function validateBorrowers(book,companies,banks=null){
  if(!exact(book,['version','month','notes'])||book.version!==1||!whole(book.month)||!Array.isArray(book.notes)||book.notes.length>6)throw Error('Invalid named-company credit register.');
  if(!Array.isArray(companies)||banks!==null&&!Array.isArray(banks)||new Set(companies.map(c=>c.id)).size!==companies.length||banks!==null&&new Set(banks.map(b=>b.id)).size!==banks.length)throw Error('Duplicate or missing credit counterparties.');
  companies.forEach(companyCheck);banks?.forEach(b=>{if(typeof b.id!=='string'||!b.id||![2,3,4].includes(b.book?.version))throw Error('Corporate lending requires a bank receivables ledger.');AccountingPrototype.check(b.book);});
  const seen=new Set();
  for(const n of book.notes){
   const c=companies.find(c=>c.id===n.companyId),b=banks?.find(b=>b.id===n.bankId);
   if(!exact(n,noteKeys)||!c||banks!==null&&!b||typeof n.bankId!=='string'||!n.bankId||seen.has(n.companyId)||n.id!=='credit:'+n.companyId||n.market!==c.market||!PRODUCTS.includes(n.product)||
    ['original','principal','remaining','annualRateBp','interestDue','interestCarry','principalPastDue','misses','opened','lastSettled'].some(k=>!whole(n[k]))||
    n.original<1000||n.principal>n.original||n.remaining>48||n.annualRateBp<400||n.annualRateBp>1800||n.interestCarry>=120000||n.principalPastDue>n.principal||
    n.opened>book.month||n.lastSettled!==book.month||!['performing','arrears','nonperforming','repaid','writtenOff'].includes(n.status)||
    (['repaid','writtenOff'].includes(n.status)?n.principal||n.interestDue||n.principalPastDue:n.principal+n.interestDue===0)||
    n.principal>c.book.accounts.debt||n.interestDue>c.book.accounts.payables||
    n.status==='performing'&&(n.misses||n.interestDue||n.principalPastDue)||
    n.status==='arrears'&&(!n.misses||n.misses>=3||!n.interestDue&&!n.principalPastDue)||
    n.status==='nonperforming'&&(n.misses<3||!n.interestDue&&!n.principalPastDue)||
    n.status==='repaid'&&n.misses)throw Error('Corporate credit does not match its borrower or retained terms.');
   seen.add(n.companyId);
  }
  for(const b of banks||[]){const own=book.notes.filter(n=>n.bankId===b.id);if(own.reduce((s,n)=>s+n.principal,0)>b.book.accounts.loans||own.reduce((s,n)=>s+n.interestDue,0)>b.book.accounts.receivables)throw Error('Corporate credit exceeds the lender asset ledger.');}
  return book;
 }
 function validate(book,companies,banks){if(!Array.isArray(banks))throw Error('Lender books are required.');return validateBorrowers(book,companies,banks);}
 function originate(input,companies,banks,companyId,bankId,terms){
  validate(input,companies,banks);const book=copy(input),cs=copy(companies),bs=copy(banks),c=cs.find(c=>c.id===companyId),b=bs.find(b=>b.id===bankId);
  if(!c||!b)throw Error('Select the existing borrower and lender.');
  if(book.notes.some(n=>n.companyId===companyId&&n.status!=='repaid'))throw Error('This company has an outstanding or written-off facility; it cannot receive another new advance.');
  const q=quote(c,terms);if(!q.eligible)throw Error(q.reason);
  // Capital, local origination and employee limits also belong to the future
  // authoritative campaign quote. This domain never borrows automatically.
  if(terms.principal>b.book.accounts.cash||b.book.accounts.equity<=0)throw Error('The bank cannot fund this advance from its available cash.');
  c.book=GroupAccounting.post(c.book,'companyCredit.advance',bankId,{cash:terms.principal,debt:terms.principal});
  b.book=AccountingPrototype.post(b.book,'companyCredit.advance',{cash:-terms.principal,loans:terms.principal});
  book.notes=book.notes.filter(n=>n.companyId!==companyId);
  book.notes.push({id:'credit:'+companyId,companyId,bankId,market:c.market,product:terms.product,original:terms.principal,principal:terms.principal,
   remaining:terms.months,annualRateBp:terms.annualRateBp,interestDue:0,interestCarry:0,principalPastDue:0,misses:0,opened:book.month,lastSettled:book.month,status:'performing'});
  book.notes.sort((a,b)=>a.companyId.localeCompare(b.companyId));validate(book,cs,bs);return {book,companies:cs,banks:bs};
 }
 // Forecasts use the same borrower settlement and emitted lender postings as
 // real execution. They require neither private bank books nor dummy balances.
 function postLenders(banks,postings){
  const bs=copy(banks);
  for(const e of postings){const b=bs.find(b=>b.id===e.bankId);if(!b)throw Error('Missing actual lender book.');b.book=AccountingPrototype.post(b.book,e.source,e.changes,e.earnings);}
  return bs;
 }
 function stepBorrowers(input,companies,month){
  validateBorrowers(input,companies);if(month!==input.month+1)throw Error('Corporate credit must settle once in month order.');
  const book=copy(input),cs=copy(companies),postings=[],report=[];book.month=month;
  for(const n of book.notes){
   n.lastSettled=month;if(['repaid','writtenOff'].includes(n.status))continue;
   const c=cs.find(c=>c.id===n.companyId),post=(source,changes,earnings=0)=>postings.push({companyId:c.id,bankId:n.bankId,source,changes,earnings});
   if(c.resolution)throw Error('Resolve this loan claim before closing its borrower.');
   // Nonperforming notes stop accrual. Fractional dollars carry on the same
   // obligation; they are not rounded into extra income each month.
   const numerator=n.status==='nonperforming'?0:n.principal*n.annualRateBp+n.interestCarry,interest=Math.floor(numerator/120000);
   if(n.status!=='nonperforming')n.interestCarry=numerator%120000;
   if(interest){c.book=GroupAccounting.post(c.book,'companyCredit.interest',n.bankId,{payables:interest,equity:-interest},-interest);post('companyCredit.interest',{receivables:interest,equity:interest},interest);n.interestDue+=interest;}
   const due=Math.min(n.principal,n.principalPastDue+Math.ceil((n.principal-n.principalPastDue)/Math.max(1,n.remaining))),interestPaid=Math.min(n.interestDue,c.book.accounts.cash),principalPaid=Math.min(due,c.book.accounts.cash-interestPaid);
   if(interestPaid||principalPaid){c.book=GroupAccounting.post(c.book,'companyCredit.payment',n.bankId,{cash:-interestPaid-principalPaid,payables:-interestPaid,debt:-principalPaid});post('companyCredit.payment',{cash:interestPaid+principalPaid,receivables:-interestPaid,loans:-principalPaid});}
   n.interestDue-=interestPaid;n.principal-=principalPaid;n.principalPastDue=due-principalPaid;n.remaining=Math.max(0,n.remaining-1);
   n.misses=n.interestDue||n.principalPastDue?n.misses+1:0;
   n.status=!n.principal&&!n.interestDue?'repaid':n.misses>=3?'nonperforming':n.misses?'arrears':'performing';
   report.push({companyId:n.companyId,bankId:n.bankId,interest,interestPaid,principalDue:due,principalPaid,principal:n.principal,interestDue:n.interestDue,status:n.status});
  }
  validateBorrowers(book,cs);return {book,companies:cs,postings,report};
 }
 function step(input,companies,banks,month){
  validate(input,companies,banks);const result=stepBorrowers(input,companies,month),bs=postLenders(banks,result.postings);
  validate(result.book,result.companies,bs);return {book:result.book,companies:result.companies,banks:bs,report:result.report};
 }
 function writeOffBorrower(input,companies,companyId){
  validateBorrowers(input,companies);const book=copy(input),cs=copy(companies),n=book.notes.find(n=>n.companyId===companyId);
  if(!n||['repaid','writtenOff'].includes(n.status))throw Error('No outstanding claim to write off.');
  const c=cs.find(c=>c.id===companyId),loss=n.principal+n.interestDue;
  c.book=GroupAccounting.post(c.book,'companyCredit.writeoff',n.bankId,{debt:-n.principal,payables:-n.interestDue,equity:loss},loss);
  const postings=[{companyId,bankId:n.bankId,source:'companyCredit.writeoff',changes:{loans:-n.principal,receivables:-n.interestDue,equity:-loss},earnings:-loss}];
  Object.assign(n,{principal:0,interestDue:0,principalPastDue:0,interestCarry:0,status:'writtenOff'});
  validateBorrowers(book,cs);return {book,companies:cs,postings,loss};
 }
 function writeOff(input,companies,banks,companyId){
  validate(input,companies,banks);const result=writeOffBorrower(input,companies,companyId),bs=postLenders(banks,result.postings);
  validate(result.book,result.companies,bs);return {book:result.book,companies:result.companies,banks:bs,loss:result.loss};
 }
 function recoverBorrower(input,companies,companyId,limit){
  validateBorrowers(input,companies);const book=copy(input),cs=copy(companies),postings=[],n=book.notes.find(n=>n.companyId===companyId);
  if(!n||['repaid','writtenOff'].includes(n.status))throw Error('No outstanding claim to recover.');
  const c=cs.find(c=>c.id===companyId);
  if(limit!==undefined&&(!whole(limit)||limit>c.book.accounts.cash))throw Error('Recovery exceeds allocated borrower cash.');
  const available=limit??c.book.accounts.cash,interestPaid=Math.min(available,n.interestDue),principalPaid=Math.min(available-interestPaid,n.principal),paid=interestPaid+principalPaid;
  if(paid){c.book=GroupAccounting.post(c.book,'companyCredit.recovery',n.bankId,{cash:-paid,payables:-interestPaid,debt:-principalPaid});postings.push({companyId,bankId:n.bankId,source:'companyCredit.recovery',changes:{cash:paid,receivables:-interestPaid,loans:-principalPaid},earnings:0});}
  n.principal-=principalPaid;n.interestDue-=interestPaid;n.principalPastDue=Math.min(n.principal,n.principalPastDue);
  if(!n.interestDue&&!n.principalPastDue){n.status='performing';n.misses=0;}
  if(!n.principal&&!n.interestDue){Object.assign(n,{status:'repaid',misses:0,principalPastDue:0,interestCarry:0});validateBorrowers(book,cs);return {book,companies:cs,postings,paid,loss:0};}
  // Liquidation has accelerated the entire obligation. Release only the actual
  // unpaid claim, paired with the lender's loss; never discard funded recovery.
  const next=writeOffBorrower(book,cs,companyId);return {...next,postings:[...postings,...next.postings],paid};
 }
 function recover(input,companies,banks,companyId,limit){
  validate(input,companies,banks);const result=recoverBorrower(input,companies,companyId,limit),bs=postLenders(banks,result.postings);
  validate(result.book,result.companies,bs);return {book:result.book,companies:result.companies,banks:bs,paid:result.paid,loss:result.loss};
 }
 return Object.freeze({LIMITS,assess,quote,opening,validate,validateBorrowers,originate,step,writeOff,recover,stepBorrowers,recoverBorrower});
})();
