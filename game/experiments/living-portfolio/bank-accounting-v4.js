'use strict';

// Isolated acquisition prerequisite. Not in the production manifest.
// Position arrays are transient canonical-contract attributions, never a second
// saved loan book. Gross principal, purchase basis and accrued interest differ.
module.exports=function createBankAccountingV4({legacy:A,GroupAccounting:G}){
  const clone=x=>JSON.parse(JSON.stringify(x));
  const keys=['cash','loans','securities','deposits','emergencyDebt','equity','receivables','payables','loanBasisAdjustment'];
  const historyLimit=256;
  const exact=(x,names)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===names.slice().sort().join('|');
  const integer=(n,signed=false)=>{if(!Number.isSafeInteger(n)||!signed&&n<0)throw Error('Invalid purchase-basis amount');return n;};
  const sum=values=>values.reduce((n,x)=>integer(n+x,true),0);
  function shape(x,names,label){if(!exact(x,names))throw Error('Invalid '+label);}
  function identity(s){if(typeof s!=='string'||!/^[A-Za-z0-9_.:|%-]{1,250}$/.test(s))throw Error('Invalid accounting identity');}
  function state(book){return {accounts:clone(book.accounts),retainedEarnings:book.retainedEarnings,sequence:book.sequence};}
  function sameState(a,b){return a.retainedEarnings===b.retainedEarnings&&a.sequence===b.sequence&&keys.every(k=>a.accounts[k]===b.accounts[k]);}
  function checkState(s){
    shape(s,['accounts','retainedEarnings','sequence'],'basis checkpoint');shape(s.accounts,keys,'basis accounts');
    for(const k of keys)integer(s.accounts[k],['equity','loanBasisAdjustment'].includes(k));integer(s.retainedEarnings,true);integer(s.sequence);
    const a=s.accounts,carryingLoans=sum([a.loans,a.loanBasisAdjustment]);
    if(carryingLoans<0||!a.loans&&a.loanBasisAdjustment)throw Error('Invalid loan carrying value');
    const assets=sum([a.cash,carryingLoans,a.securities,a.receivables]),liabilities=sum([a.deposits,a.emergencyDebt,a.payables]);
    if(assets!==sum([liabilities,a.equity]))throw Error('Unbalanced purchase-basis book');
    return {assets,liabilities,equity:a.equity,residual:0};
  }
  function apply(s,e){
    checkState(s);shape(e,['id','source','changes','earnings'],'basis journal entry');
    if(e.id!==integer(s.sequence+1)||typeof e.source!=='string'||!e.source.length||e.source.length>100||!e.changes||typeof e.changes!=='object'||Array.isArray(e.changes)||!Object.keys(e.changes).length)throw Error('Invalid basis posting');
    integer(e.earnings,true);const next=clone(s);
    for(const [key,n]of Object.entries(e.changes)){if(!keys.includes(key))throw Error('Unknown basis account');integer(n,true);next.accounts[key]=integer(next.accounts[key]+n,true);}
    next.sequence=e.id;next.retainedEarnings=integer(next.retainedEarnings+e.earnings,true);checkState(next);return next;
  }
  function check(book){
    if(book?.version!==4)return A.check(book);
    shape(book,['version','accounts','retainedEarnings','sequence','journal','journalBase'],'basis book');
    if(!Array.isArray(book.journal)||book.journal.length>historyLimit)throw Error('Invalid basis journal');
    const result=checkState(state(book));let replay=clone(book.journalBase);checkState(replay);
    for(const e of book.journal)replay=apply(replay,e);
    if(!sameState(replay,book))throw Error('Basis journal does not reconcile');
    return result;
  }
  function withLoanBasis(book){
    if(![1,2,3].includes(book?.version))throw Error('Explicit legacy creation boundary required');
    const verified=A.restore(A.snapshot(book));
    if(verified.sequence!==0||verified.journal.length)throw Error('Purchase basis cannot upgrade an existing campaign');
    const next={version:4,accounts:{...verified.accounts,...(verified.version===1?{receivables:0}:{}),...(verified.version!==3?{payables:0}:{}),loanBasisAdjustment:0},retainedEarnings:verified.retainedEarnings,sequence:0,journal:[]};
    next.journalBase=state(next);check(next);return next;
  }
  function opening(version=1){return version===4?withLoanBasis(A.opening(3)):A.opening(version);}
  function post(book,source,changes,earnings=0){
    if(book?.version!==4)return A.post(book,source,changes,earnings);
    check(book);const e={id:integer(book.sequence+1),source,changes:clone(changes),earnings},closing=apply(state(book),e);
    const next={...clone(book),...closing};next.journal.push(e);
    while(next.journal.length>historyLimit)next.journalBase=apply(next.journalBase,next.journal.shift());
    check(next);return next;
  }
  function snapshot(book,limit=256){
    if(book?.version!==4)return A.snapshot(book,limit);check(book);
    if(!Number.isInteger(limit)||limit<1||limit>256)throw Error('Invalid basis history limit');
    const cut=Math.max(0,book.journal.length-limit);let checkpoint=clone(book.journalBase);
    for(const e of book.journal.slice(0,cut))checkpoint=apply(checkpoint,e);
    return {format:'bw-accounting-4',checkpoint,entries:clone(book.journal.slice(cut)),closing:state(book)};
  }
  function restore(value){
    if(value?.format!=='bw-accounting-4')return A.restore(value);
    shape(value,['format','checkpoint','entries','closing'],'basis snapshot');
    if(!Array.isArray(value.entries)||value.entries.length>256)throw Error('Invalid basis snapshot entries');
    let closing=clone(value.checkpoint);checkState(closing);checkState(value.closing);
    for(const e of value.entries)closing=apply(closing,e);
    if(!sameState(closing,value.closing))throw Error('Basis snapshot does not reconcile');
    const book={version:4,...closing,journal:clone(value.entries),journalBase:clone(value.checkpoint)};check(book);return book;
  }
  function position(p){
    shape(p,['contractId','borrowerId','principal','recognizedInterest','basisAdjustment'],'attributed position');identity(p.contractId);identity(p.borrowerId);
    integer(p.principal);integer(p.recognizedInterest);integer(p.basisAdjustment,true);
    if(sum([p.principal,p.basisAdjustment])<0||!p.principal&&p.basisAdjustment)throw Error('Invalid attributed carrying value');return p;
  }
  function institution(b){
    shape(b,['id','book','legacyPrincipal','otherReceivables','positions'],'attributed institution');identity(b.id);check(b.book);
    if(b.book.version!==4||!Array.isArray(b.positions)||b.positions.length>10000)throw Error('Purchase basis requires attributed v4 bank');
    integer(b.legacyPrincipal);integer(b.otherReceivables);const ids=new Set();
    for(const p of b.positions){position(p);if(ids.has(p.contractId))throw Error('Duplicate position');ids.add(p.contractId);}
    if(b.book.accounts.loans!==sum([b.legacyPrincipal,...b.positions.map(p=>p.principal)])||b.book.accounts.receivables!==sum([b.otherReceivables,...b.positions.map(p=>p.recognizedInterest)])||b.book.accounts.loanBasisAdjustment!==sum(b.positions.map(p=>p.basisAdjustment)))throw Error('Bank and canonical position attribution disagree');
    return b;
  }
  function acquireLoansBatch(input,trades){
    if(!Array.isArray(input)||input.length<2||input.length>2||!Array.isArray(trades)||trades.length>20000)throw Error('Invalid funded loan market');
    const ids=new Set(),owned=new Set();for(const b of input){institution(b);if(ids.has(b.id))throw Error('Duplicate funded bank');ids.add(b.id);for(const p of b.positions){if(owned.has(p.contractId))throw Error('Duplicate held loan');owned.add(p.contractId);}}
    const banks=clone(input),byId=new Map(banks.map(b=>[b.id,b])),openingById=new Map(input.map(b=>[b.id,b])),spending=new Map(input.map(b=>[b.id,0])),seen=new Set(),prepared=[];
    for(const t of trades){
      shape(t,['contractId','sellerId','buyerId','price'],'funded purchase');identity(t.contractId);integer(t.price);
      const seller=openingById.get(t.sellerId),buyer=openingById.get(t.buyerId),p=seller?.positions.find(p=>p.contractId===t.contractId);
      if(!seller||!buyer||seller===buyer||!p||seen.has(t.contractId))throw Error('Unknown or repeated purchased claim');seen.add(t.contractId);
      if(seller.book.accounts.equity<=0||buyer.book.accounts.equity<=0)throw Error('Insolvent bank cannot negotiate a loan purchase');
      if(!p.principal||t.price<p.recognizedInterest)throw Error('Accrued interest must transfer at par; principal must be live');
      const newBasis=integer(t.price-p.principal-p.recognizedInterest,true),sellerGain=integer(t.price-p.principal-p.recognizedInterest-p.basisAdjustment,true);
      spending.set(t.buyerId,sum([spending.get(t.buyerId),t.price]));
      prepared.push({...t,position:clone(p),newBasis,sellerGain});
    }
    // Opening cash is the only spending source. Proceeds, fees, and gains from
    // this simultaneous clearing pass cannot finance another purchase.
    for(const [id,spent]of spending)if(spent>openingById.get(id).book.accounts.cash)throw Error('Loan purchase exceeds opening cash');
    const postings=[];
    for(const t of prepared.sort((a,b)=>a.contractId<b.contractId?-1:a.contractId>b.contractId?1:0)){
      const buyer=byId.get(t.buyerId),seller=byId.get(t.sellerId),p=t.position;
      const buyerEntry={cash:-t.price,loans:p.principal,receivables:p.recognizedInterest,loanBasisAdjustment:t.newBasis};
      const sellerEntry={cash:t.price,loans:-p.principal,receivables:-p.recognizedInterest,loanBasisAdjustment:-p.basisAdjustment,equity:t.sellerGain};
      buyer.book=post(buyer.book,'loan.purchase',buyerEntry,0);seller.book=post(seller.book,'loan.sale',sellerEntry,t.sellerGain);
      seller.positions=seller.positions.filter(x=>x.contractId!==p.contractId);buyer.positions.push({...p,basisAdjustment:t.newBasis});
      postings.push({contractId:p.contractId,buyerId:buyer.id,sellerId:seller.id,price:t.price,buyer:{changes:buyerEntry,earnings:0},seller:{changes:sellerEntry,earnings:t.sellerGain},basisAdjustment:t.newBasis});
    }
    for(const b of banks){b.positions.sort((a,b)=>a.contractId<b.contractId?-1:a.contractId>b.contractId?1:0);institution(b);if(b.book.accounts.equity<=0)throw Error('Purchase would render a bank insolvent');}
    banks.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);return {banks,postings};
  }
  function amortizeBasis(p,principalPaid){
    position(p);integer(principalPaid);if(principalPaid>p.principal)throw Error('Repayment exceeds actual principal');
    const released=principalPaid===p.principal?p.basisAdjustment:p.principal?Number(BigInt(p.basisAdjustment)*BigInt(principalPaid)/BigInt(p.principal)):0;
    return {basisReleased:released,basisAdjustment:p.basisAdjustment-released,earnings:-released};
  }
  function repayLoan(input,borrower,contractId,payment){
    institution(input);G.validate(borrower);shape(payment,['principalPaid','recognizedInterestPaid'],'funded borrower payment');
    integer(payment.principalPaid);integer(payment.recognizedInterestPaid);const p=input.positions.find(p=>p.contractId===contractId);
    if(!p||p.borrowerId!==borrower.entityId||payment.recognizedInterestPaid>p.recognizedInterest)throw Error('Unknown borrower principal/interest claim');
    const amortization=amortizeBasis(p,payment.principalPaid),cash=sum([payment.principalPaid,payment.recognizedInterestPaid]);
    if(cash>borrower.accounts.cash||payment.principalPaid>borrower.accounts.debt||payment.recognizedInterestPaid>borrower.accounts.payables)throw Error('Borrower payment is not funded');
    const b=clone(input),updated=b.positions.find(p=>p.contractId===contractId),changes={cash,loans:-payment.principalPaid,receivables:-payment.recognizedInterestPaid,loanBasisAdjustment:-amortization.basisReleased,equity:amortization.earnings};
    b.book=post(b.book,'loan.fundedRepayment',changes,amortization.earnings);
    const payer=G.post(borrower,'loan.fundedRepayment',input.id,{cash:-cash,debt:-payment.principalPaid,payables:-payment.recognizedInterestPaid});
    updated.principal-=payment.principalPaid;updated.recognizedInterest-=payment.recognizedInterestPaid;updated.basisAdjustment=amortization.basisAdjustment;institution(b);
    return {bank:b,borrower:payer,position:clone(updated),amortization,posting:{changes,earnings:amortization.earnings}};
  }
  return Object.freeze({...A,opening,check,post,snapshot,restore,withLoanBasis,institution,acquireLoansBatch,amortizeBasis,repayLoan,
    limitations:Object.freeze(['Isolated accounting prerequisite, not live acquisition gameplay.','Transient positions must be sourced from and merged into canonical contracts; no saved parallel loan map.','Only principal purchase basis is supported; recognized accrued interest transfers at par.','Fees, transaction approvals, liquidity buffers, minimum-capital policy, servicing rights, participation splits and public projection require their engine adapters.','No automatic borrowing, allowance system or emergency receivership transaction is introduced.'])});
};
