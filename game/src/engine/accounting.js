const AccountingPrototype=(()=>{
 const keys=['cash','loans','securities','deposits','emergencyDebt','equity'];
 const assets=['cash','loans','securities'],liabilities=['deposits','emergencyDebt'];
 const bookKeys=b=>b.version===3?[...keys,'receivables','payables']:b.version===2?[...keys,'receivables']:keys;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const dollar=(n,signed=false)=>{if(!Number.isSafeInteger(n)||(!signed&&n<0))throw new Error('Invalid accounting amount');return n};
 function check(b){
  if(!b||![1,2,3].includes(b.version)||!b.accounts||Object.keys(b.accounts).length!==bookKeys(b).length)throw new Error('Invalid accounting book');
  if(b.version===3&&Object.keys(b).sort().join()!==['version','accounts','retainedEarnings','sequence','journal',...(Object.hasOwn(b,'journalBase')?['journalBase']:[])].sort().join())throw new Error('Invalid payable accounting fields');
  for(const k of bookKeys(b))dollar(b.accounts[k],k==='equity');
  dollar(b.retainedEarnings,true);dollar(b.sequence);
  const a=assets.reduce((n,k)=>n+b.accounts[k],0)+([2,3].includes(b.version)?b.accounts.receivables:0),l=liabilities.reduce((n,k)=>n+b.accounts[k],0)+(b.version===3?b.accounts.payables:0);
  if(!Number.isSafeInteger(a)||!Number.isSafeInteger(l)||!Number.isSafeInteger(l+b.accounts.equity)||a!==l+b.accounts.equity)throw new Error('Unbalanced accounting book');
  if(!Array.isArray(b.journal))throw new Error('Invalid accounting journal');
  return {assets:a,liabilities:l,equity:b.accounts.equity,residual:0};
 }
 function opening(version=1){
  const b={version,accounts:{cash:2400000,loans:9500000,securities:13900000,deposits:24000000,emergencyDebt:0,equity:1800000,...([2,3].includes(version)?{receivables:0}:{}),...(version===3?{payables:0}:{})},retainedEarnings:0,sequence:0,journal:[]};
  check(b);return b;
 }
 // Signed account changes, not debit/credit labels. Every entry balances before commit.
 function post(book,source,changes,earnings=0){
  check(book);dollar(earnings,true);
  if(typeof source!=='string'||!source.length||source.length>100||!changes||!Object.keys(changes).length)throw new Error('Invalid accounting posting');
  const next=copy(book),entry={id:book.sequence+1,source,changes:{},earnings};
  dollar(entry.id);
  for(const [k,n] of Object.entries(changes)){if(!bookKeys(book).includes(k))throw new Error('Unknown accounting account');dollar(n,true);next.accounts[k]+=n;entry.changes[k]=n}
  next.retainedEarnings+=earnings;next.sequence=entry.id;next.journal.push(entry);check(next);return next;
 }
 function transact(book,type,amount){
  dollar(amount);
  const entries={
   deposit:{cash:amount,deposits:amount},withdraw:{cash:-amount,deposits:-amount},
   originate:{cash:-amount,loans:amount},repayLoan:{cash:amount,loans:-amount},
   income:{cash:amount,equity:amount},expense:{cash:-amount,equity:-amount},
   chargeoff:{loans:-amount,equity:-amount},issueEquity:{cash:amount,equity:amount},
   borrow:{cash:amount,emergencyDebt:amount},repayDebt:{cash:-amount,emergencyDebt:-amount},
   buySecurities:{cash:-amount,securities:amount},
   ...([2,3].includes(book.version)?{invoice:{receivables:amount,equity:amount},
     collectInvoice:{cash:amount,receivables:-amount},
     writeOffInvoice:{receivables:-amount,equity:-amount}}:{}),
   ...(book.version===3?{incurPayable:{payables:amount,equity:-amount},
     settlePayable:{cash:-amount,payables:-amount}}:{})
  };
  if(!Object.hasOwn(entries,type))throw new Error('Unknown accounting transaction');
  const earnings=['income','invoice'].includes(type)?amount:['expense','chargeoff','writeOffInvoice','incurPayable'].includes(type)?-amount:0;
  return post(book,type,entries[type],earnings);
 }
 function sell(book,asset,face,haircutBps){
  if(!['loans','securities'].includes(asset))throw new Error('Invalid sale asset');
  dollar(face);dollar(haircutBps);if(haircutBps>10000)throw new Error('Invalid sale haircut');
  const loss=Math.round(face*(haircutBps/10000));
  return post(book,'sell.'+asset,{[asset]:-face,cash:face-loss,equity:-loss},-loss);
 }
 // A model input, not a lender-eligibility policy. Borrowing is separately visible.
 function funded(book,type,amount){
  dollar(amount);check(book);
  if(!['withdraw','originate','expense'].includes(type))throw new Error('Invalid funded transaction');
  const gap=Math.max(0,amount-book.accounts.cash);
  return transact(gap?transact(book,'borrow',gap):book,type,amount);
 }
 function transfer(from,to,amount){
  dollar(amount);check(from);check(to);if(from===to)throw new Error('Cannot transfer to same bank');
  // Pure functions make a failed receiver/sender posting atomic for both inputs.
  return {from:funded(from,'withdraw',amount),to:transact(to,'deposit',amount)};
 }
 function operations(book,flows){
  const names=['depositIn','depositOut','loanOriginations','loanRepayments','cashIncome','cashExpense','creditLoss'];
  if(!flows||Object.keys(flows).some(k=>!names.includes(k)))throw new Error('Invalid operating flows');
  for(const k of names)dollar(flows[k]);
  let next=book;
  for(const [type,key,needsFunding] of [['deposit','depositIn'],['withdraw','depositOut',true],['repayLoan','loanRepayments'],['originate','loanOriginations',true],['income','cashIncome'],['expense','cashExpense',true],['chargeoff','creditLoss']]){
   if(flows[key])next=needsFunding?funded(next,type,flows[key]):transact(next,type,flows[key]);
  }
  check(next);
  return {book:copy(next),profit:flows.cashIncome-flows.cashExpense-flows.creditLoss,cashChange:next.accounts.cash-book.accounts.cash,borrowed:next.accounts.emergencyDebt-book.accounts.emergencyDebt};
 }
 // Bridge current demand/profit previews into explicit flows, without writing back
 // to a campaign. Chargeoffs are noncash; deposit balances are funding, not revenue.
 function fromOperatingReport(book,r){
  const names=['depositIncome','loanIncome','commercialIncome','otherIncome','fundingCost','expense','chargeoff','eventAdjustment','profit','depositGrowth','loanGrowth','depositRunoff'];
  if(!r||names.some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k])))throw new Error('Invalid operating report');
  const round=n=>dollar(Math.round(n),true);
  const depositOut=round(r.depositRunoff),depositIn=round(r.depositGrowth+r.depositRunoff),loanOriginations=round(r.loanGrowth+r.chargeoff),creditLoss=round(r.chargeoff);
  const revenue=round(r.depositIncome+r.loanIncome+r.commercialIncome+r.otherIncome);
  const cost=round(r.fundingCost+r.expense),event=round(r.eventAdjustment);
  const roundingAdjustment=round(r.profit)-(revenue-cost+event-creditLoss);
  if(Math.abs(roundingAdjustment)>2)throw new Error('Operating report profit does not reconcile');
  const adjustment=event+roundingAdjustment;
  const result=operations(book,{depositIn,depositOut,loanOriginations,loanRepayments:0,cashIncome:revenue+Math.max(0,adjustment),cashExpense:cost+Math.max(0,-adjustment),creditLoss});
  return {...result,roundingAdjustment};
 }
 // Named adapters are shared by migration tests and future authoritative turns.
 // Discretionary plans cannot silently borrow; mandatory penalties may use funding.
 function activity(book,kind,amount){
  dollar(amount);check(book);
  const expenses=['hiring','research','project','competitiveAction','decisionExpense'];
  if(expenses.includes(kind))return post(book,'activity.'+kind,{cash:-amount,equity:-amount},-amount);
  if(kind==='penalty'){
   const gap=Math.max(0,amount-book.accounts.cash),fundedBook=gap?transact(book,'borrow',gap):book;
   return post(fundedBook,'activity.penalty',{cash:-amount,equity:-amount},-amount);
  }
  if(['grant','franchiseIncome'].includes(kind))return post(book,'activity.'+kind,{cash:amount,equity:amount},amount);
  if(['boardCapital','milestoneCapital'].includes(kind))return post(book,'activity.'+kind,{cash:amount,equity:amount});
  throw new Error('Unknown accounting activity');
 }
 function opportunity(book,offer){
  const t=opportunityTerms(offer);let next=book;
  if(t.deposits)next=post(next,'opportunity.'+offer.type+'.deposits',{cash:t.deposits,deposits:t.deposits});
  if(t.loans)next=funded(next,'originate',t.loans);
  if(t.feeIncome)next=post(next,'opportunity.'+offer.type+'.fees',{cash:t.feeIncome,equity:t.feeIncome},t.feeIncome);
  check(next);return copy(next);
 }
 function franchise(book,cashIncome,depositInflow){
  dollar(cashIncome);dollar(depositInflow);
  let next=activity(book,'franchiseIncome',cashIncome);
  if(depositInflow)next=post(next,'franchise.deposits',{cash:depositInflow,deposits:depositInflow});
  return next;
 }
 function acquisition(buyer,seller,terms){
  check(buyer);check(seller);
  if(buyer===seller||!terms||Object.keys(terms).some(k=>!['deposits','loans','premium'].includes(k)))throw new Error('Invalid accounting acquisition');
  const {deposits,loans,premium}=terms;dollar(deposits);dollar(loans);dollar(premium);
  if(deposits>seller.accounts.deposits||loans>seller.accounts.loans)throw new Error('Acquisition exceeds seller book');
  // Positive settlement means the seller supplies backing cash to the buyer.
  // Premium is paid to the seller and conservatively expensed by the buyer.
  const settlement=deposits-loans-premium;dollar(settlement,true);
  let b=buyer,s=seller;
  const sellerGap=Math.max(0,settlement-s.accounts.cash),buyerGap=Math.max(0,-settlement-b.accounts.cash);
  if(sellerGap)s=transact(s,'borrow',sellerGap);
  if(buyerGap)b=transact(b,'borrow',buyerGap);
  b=post(b,'acquisition.buyer',{cash:settlement,loans,deposits,equity:-premium},-premium);
  s=post(s,'acquisition.seller',{cash:-settlement,loans:-loans,deposits:-deposits,equity:premium},premium);
  return {buyer:b,seller:s,settlement,sellerBorrowed:sellerGap,buyerBorrowed:buyerGap};
 }
 function gameAcquisition(buyerBook,sellerBook,g,buyer,target,premium=0){
  const t=acquisitionTerms(g,buyer,target);
  return acquisition(buyerBook,sellerBook,{deposits:t.depositTake,loans:t.loanTake,premium});
 }
 // Ordered, all-or-nothing batch: no input book is mutated on any failure.
 function activities(book,events){
  if(!Array.isArray(events)||events.length>100)throw new Error('Invalid accounting activity batch');
  let next=book;
  for(const event of events){
   if(!event||typeof event.kind!=='string')throw new Error('Invalid accounting event');
   if(event.kind==='opportunity')next=opportunity(next,event.offer);
   else if(event.kind==='franchise')next=franchise(next,event.cashIncome,event.depositInflow);
   else next=activity(next,event.kind,event.amount);
  }
  check(next);return copy(next);
 }
 // Budget bridge is a quote, not a replacement for plan/capacity validation.
 function planSpending(book,p,plan){
  const quote=planBudget(p,plan);
  const events=[{kind:'competitiveAction',amount:quote.action},{kind:'project',amount:quote.projects},{kind:'research',amount:quote.research},{kind:'hiring',amount:quote.recruiting}].filter(e=>e.amount);
  return {book:activities(book,events),quote:{...quote},expense:quote.total};
 }
 // Prototype-only persistence boundary. Campaign import does not consume this.
 const stateOf=b=>({accounts:copy(b.accounts),retainedEarnings:b.retainedEarnings,sequence:b.sequence});
 function fromState(s,version=1){
  if(!s||Object.keys(s).sort().join(',')!=='accounts,retainedEarnings,sequence')throw new Error('Invalid accounting checkpoint');
  const b={version,...copy(s),journal:[]};check(b);return b;
 }
 function replayEntry(book,e){
  if(!e||Object.keys(e).sort().join(',')!=='changes,earnings,id,source'||e.id!==book.sequence+1)throw new Error('Invalid accounting journal entry');
  return post(book,e.source,e.changes,e.earnings);
 }
 function sameState(a,b){
  return a.version===b.version&&a.sequence===b.sequence&&a.retainedEarnings===b.retainedEarnings&&bookKeys(a).every(k=>a.accounts[k]===b.accounts[k]);
 }
 function snapshot(book,limit=256){
  check(book);if(!Number.isInteger(limit)||limit<1||limit>256)throw new Error('Invalid accounting history limit');
  let replay=book.journalBase?fromState(book.journalBase,book.version):opening(book.version),checkpoint=stateOf(replay);
  const cut=Math.max(0,book.journal.length-limit);
  for(let i=0;i<book.journal.length;i++){replay=replayEntry(replay,book.journal[i]);if(i+1===cut)checkpoint=stateOf(replay)}
  if(!sameState(replay,book))throw new Error('Accounting journal does not reconcile');
  return {format:'bw-accounting-'+book.version,checkpoint,entries:copy(book.journal.slice(cut)),closing:stateOf(book)};
 }
 function restore(snapshotValue){
  if(!snapshotValue||Object.keys(snapshotValue).sort().join(',')!=='checkpoint,closing,entries,format'||!['bw-accounting-1','bw-accounting-2','bw-accounting-3'].includes(snapshotValue.format)||!Array.isArray(snapshotValue.entries)||snapshotValue.entries.length>256)throw new Error('Invalid accounting snapshot');
  const version=Number(snapshotValue.format.slice(-1));
  let b=fromState(snapshotValue.checkpoint,version);const end=fromState(snapshotValue.closing,version);
  for(const entry of snapshotValue.entries)b=replayEntry(b,entry);
  if(!sameState(b,end))throw new Error('Accounting snapshot does not reconcile');
  b.journalBase=copy(snapshotValue.checkpoint);return b;
 }
 // Explicit new-campaign initialization only. Never invoked by legacy imports.
 // The validated old balance becomes the opening checkpoint of the new format.
 function withReceivables(book){
  const validated=restore(snapshot(book));if([2,3].includes(validated.version))return validated;
  const next={...validated,version:2,accounts:{...validated.accounts,receivables:0},journal:[]};
  next.journalBase=stateOf(next);check(next);return next;
 }
 // Explicit new-campaign boundary; never repair or upgrade an imported book.
 function withPayables(book){
  const validated=restore(snapshot(book));if(validated.version===3)return validated;
  const next={...validated,version:3,accounts:{...validated.accounts,...(validated.version===1?{receivables:0}:{}),payables:0},journal:[]};
  next.journalBase=stateOf(next);check(next);return next;
 }
 return Object.freeze({opening,check,post,transact,sell,funded,transfer,operations,fromOperatingReport,activity,opportunity,franchise,acquisition,gameAcquisition,activities,planSpending,snapshot,restore,withReceivables,withPayables});
})();
// Save repair is engine-owned. Validate the cloned save before legacy defaults.
// Repair helpers mutate their argument; migrateCampaign gives them a private clone.
// Browser/storage/transport code stays outside.
