// Atomic, paired book movements for an approved control offer. Campaign code
// retains these records; passing an already completed record cannot pay twice.
const CompanyControlSettlement = (() => {
 const copy=x=>JSON.parse(JSON.stringify(x)),R=CompanyControl.RULES;
 const whole=n=>Number.isSafeInteger(n)&&n>=0;
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 const fee=n=>Math.ceil(n*25/10000);
 function distinct(books){const ids=new Set();for(const b of books){GroupAccounting.validate(b);if(ids.has(b.entityId))throw Error('Control counterparties must be distinct.');ids.add(b.entityId);}}
 function pending(ctx,offer,diligence){
  CompanyControl.review(ctx,offer,diligence,{allowPendingConsent:true});
  if(offer.submittedMonth!==ctx.month)throw Error('An offer must be staged in the current month.');
  return {version:1,offer:copy(offer),diligence:copy(diligence),status:'review',reviewMonth:ctx.month+1,defended:false,closedMonth:null,settlement:null,loan:null,integration:null};
 }
 function validate(record){
  if(!exact(record,['version','offer','diligence','status','reviewMonth','defended','closedMonth','settlement','loan','integration'])||record.version!==1||!['review','cancelled','closed'].includes(record.status)||typeof record.defended!=='boolean'||!whole(record.reviewMonth)||record.reviewMonth!==record.offer?.submittedMonth+1+(record.defended?1:0))throw Error('Invalid control review record.');
  CompanyControl.validateDiligence(record.diligence);CompanyControl.validateOffer(record.offer);
  if(record.offer.issuer!==record.diligence.issuer)throw Error('Control review and diligence target differ.');
  if(record.status!=='closed'){if(record.closedMonth!==null||record.settlement!==null||record.loan!==null||record.integration!==null)throw Error('Unclosed offer contains settlement records.');}
  else {if(!whole(record.closedMonth)||record.closedMonth<record.reviewMonth)throw Error('Invalid control closing month.');validateLoan(record.loan);validateIntegration(record.integration);if(record.loan.startedMonth!==record.closedMonth||record.integration.startedMonth!==record.closedMonth)throw Error('Inconsistent control settlement clocks.');
   const purchase=Math.ceil(record.offer.shares*record.offer.priceCents/100);
   const receipt=record.settlement;
   if(!exact(receipt,['purchase','buyerFee','sellers'])||receipt.purchase!==purchase||receipt.buyerFee!==fee(purchase)||!Array.isArray(receipt.sellers)||!receipt.sellers.length||receipt.sellers.length>2||new Set(receipt.sellers.map(s=>s.seller)).size!==receipt.sellers.length)throw Error('Invalid control settlement receipt.');
   for(const s of receipt.sellers)if(!exact(s,['seller','shares','consideration','basisReleased','realized','fee'])||typeof s.seller!=='string'||!s.seller||s.seller===record.offer.buyer||!whole(s.shares)||!s.shares||!whole(s.consideration)||!whole(s.basisReleased)||s.realized!==s.consideration-s.basisReleased||s.fee!==fee(s.consideration))throw Error('Invalid paid seller receipt.');
   if(receipt.sellers.reduce((n,s)=>n+s.shares,0)!==record.offer.shares||receipt.sellers.reduce((n,s)=>n+s.consideration,0)!==purchase)throw Error('Paid control shares and purchase cash do not reconcile.');
   if(record.loan.original!==record.offer.borrow||record.loan.borrower!==record.diligence.owner||record.integration.owner!==record.diligence.owner||record.integration.totalCost!==Math.ceil(purchase*R.integrationBp/10000))throw Error('Control obligations differ from the funded offer.');
  }
 }
 function cancel(record){validate(record);if(record.status!=='review')throw Error('Only a pending offer can be cancelled.');return {...copy(record),status:'cancelled'};}
 function defend(record,parent,provider,company,ownerShares,month,protectedCash=0){
  validate(record);const published=CompanyControl.diligenceQuote(company,month);
  if(record.status!=='review'||record.defended||record.offer.issuer!==company.id||!whole(ownerShares)||ownerShares<=company.issued/2||ownerShares>company.issued||month>record.reviewMonth||month<record.offer.submittedMonth||!whole(protectedCash))throw Error('Only the current controlling shareholder can buy one timely review delay.');
  const amount=Math.ceil(company.equity/100);GroupAccounting.validate(parent);
  if(parent.accounts.cash<amount+protectedCash)throw Error('Review defense requires unreserved owner funds.');
  const paid=GroupAccounting.servicePayment(parent,provider,amount),next=copy(record);next.defended=true;next.reviewMonth++;
  return {record:next,parent:paid.payer,provider:paid.provider,fee:amount,capitalRevision:published.capitalRevision};
 }
 function close(record,ctx,input){
  validate(record);if(record.status!=='review'||ctx.month<record.reviewMonth)throw Error('Offer is not ready for a first settlement.');
  const quote=CompanyControl.review(ctx,record.offer,record.diligence),o=record.offer;
  if(!Array.isArray(input.holders)||input.holders.length!==3||new Set(input.holders.map(h=>h.id)).size!==3)throw Error('Invalid closing shareholders.');
  distinct([...input.holders.map(h=>h.book),input.lender,input.exchange]);
  const data=copy(input),buyer=data.holders.find(h=>h.id===o.buyer);
  if(!buyer||buyer.book.entityId!==ctx.buyerEntityId||buyer.book.accounts.cash!==ctx.parentCash||data.lender.accounts.cash!==ctx.lenderCash)throw Error('Closing must use current parent and lender cash.');
  for(const h of data.holders){const owned=ctx.ownership.find(p=>p.id===h.id),p=h.positions?.[o.issuer];
   if(!owned||!p||!whole(p.shares)||!whole(p.basis)||p.shares!==owned.shares||!p.shares&&p.basis||h.book.accounts.businessAssets<Object.values(h.positions).reduce((n,p)=>n+p.basis,0))throw Error('Closing shares or basis do not reconcile.');}
  if(o.borrow){buyer.book=GroupAccounting.post(buyer.book,'control.loanReceived',data.lender.entityId,{cash:o.borrow,debt:o.borrow});data.lender=GroupAccounting.post(data.lender,'control.loanIssued',buyer.book.entityId,{cash:-o.borrow,businessAssets:o.borrow});}
  // Apportion a single integer-dollar consideration. Independently rounding
  // each seller would create a second purchase amount at fractional prices.
  const sellers=quote.sellers.map(s=>({...s,amount:Math.floor(quote.purchase*s.shares/o.shares),remainder:quote.purchase*s.shares%o.shares}));
  let residue=quote.purchase-sellers.reduce((n,s)=>n+s.amount,0);
  for(const s of sellers.slice().sort((a,b)=>b.remainder-a.remainder||a.id.localeCompare(b.id)))if(residue>0){s.amount++;residue--;}
  const receipts=[];let fees=quote.buyerFee;
  for(const s of sellers){const seller=data.holders.find(h=>h.id===s.id),position=seller.positions[o.issuer],basis=s.shares===position.shares?position.basis:Math.floor(position.basis*s.shares/position.shares),saleFee=fee(s.amount),realized=s.amount-basis;
   seller.book=GroupAccounting.post(seller.book,'control.sharesSold',buyer.book.entityId,{cash:s.amount-saleFee,businessAssets:-basis,equity:realized-saleFee},realized-saleFee);
   position.shares-=s.shares;position.basis-=basis;fees+=saleFee;receipts.push({seller:s.id,shares:s.shares,consideration:s.amount,basisReleased:basis,realized,fee:saleFee});
  }
  buyer.book=GroupAccounting.post(buyer.book,'control.sharesPurchased',o.issuer,{cash:-quote.purchase-quote.buyerFee,businessAssets:quote.purchase,equity:-quote.buyerFee},-quote.buyerFee);
  buyer.positions[o.issuer].shares+=o.shares;buyer.positions[o.issuer].basis+=quote.purchase;
  data.exchange=GroupAccounting.post(data.exchange,'control.exchangeFees',o.id,{cash:fees,equity:fees},fees);
  const next=copy(record);next.status='closed';next.closedMonth=ctx.month;
  next.settlement={purchase:quote.purchase,buyerFee:quote.buyerFee,sellers:copy(receipts)};
  next.loan={borrower:buyer.book.entityId,lender:data.lender.entityId,original:o.borrow,principalPaid:0,interestDue:0,startedMonth:ctx.month,servicedThrough:ctx.month,missedMonths:0};
  next.integration={owner:buyer.book.entityId,totalCost:quote.integrationCost,paid:0,workDone:0,startedMonth:ctx.month,processedThrough:ctx.month};validate(next);
  return {...data,record:next,quote,receipts,fees};
 }
 function validateLoan(l){if(!exact(l,['borrower','lender','original','principalPaid','interestDue','startedMonth','servicedThrough','missedMonths'])||typeof l.borrower!=='string'||!l.borrower||typeof l.lender!=='string'||!l.lender||l.borrower===l.lender||Object.entries(l).some(([k,n])=>!['borrower','lender'].includes(k)&&!whole(n))||l.original>400000000||l.principalPaid>Math.floor(l.original*Math.min(R.term,l.servicedThrough-l.startedMonth)/R.term)||l.servicedThrough<l.startedMonth||l.missedMonths>l.servicedThrough-l.startedMonth||!l.original&&(l.principalPaid||l.interestDue||l.missedMonths))throw Error('Invalid acquisition debt record.');}
 function serviceDebt(parent,lender,loan,month,protectedCash=0){
  validateLoan(loan);distinct([parent,lender]);
  if(parent.entityId!==loan.borrower||lender.entityId!==loan.lender)throw Error('Acquisition debt belongs to different counterparties.');
  if(!whole(month)||month!==loan.servicedThrough+1||!whole(protectedCash))throw Error('Acquisition debt must settle once in month order.');
  const next=copy(loan),outstanding=loan.original-loan.principalPaid,interest=Math.ceil(outstanding*R.interestBp/10000);
  if(parent.accounts.debt<outstanding||parent.accounts.payables<loan.interestDue||lender.accounts.businessAssets<outstanding+loan.interestDue)throw Error('Acquisition obligations do not reconcile with books.');
  let p=parent,l=lender;
  if(interest){p=GroupAccounting.post(p,'control.interestAccrued',l.entityId,{payables:interest,equity:-interest},-interest);l=GroupAccounting.post(l,'control.interestReceivable',p.entityId,{businessAssets:interest,equity:interest},interest);}
  next.interestDue+=interest;
  const principalDue=Math.max(0,Math.min(loan.original,Math.floor(loan.original*Math.min(R.term,month-loan.startedMonth)/R.term))-loan.principalPaid),available=Math.max(0,p.accounts.cash-protectedCash),interestPaid=Math.min(available,next.interestDue),principalPaid=Math.min(available-interestPaid,principalDue),paid=interestPaid+principalPaid;
  if(paid){p=GroupAccounting.post(p,'control.debtService',l.entityId,{cash:-paid,debt:-principalPaid,payables:-interestPaid});l=GroupAccounting.post(l,'control.debtReceived',p.entityId,{cash:paid,businessAssets:-paid});}
  next.principalPaid+=principalPaid;next.interestDue-=interestPaid;next.servicedThrough=month;next.missedMonths=next.interestDue||principalPaid<principalDue?next.missedMonths+1:0;validateLoan(next);
  return {parent:p,lender:l,loan:next,interest,interestPaid,principalDue,principalPaid,arrears:next.interestDue+principalDue-principalPaid};
 }
 function validateIntegration(i){if(!exact(i,['owner','totalCost','paid','workDone','startedMonth','processedThrough'])||typeof i.owner!=='string'||!i.owner||Object.entries(i).some(([k,n])=>k!=='owner'&&!whole(n))||i.totalCost>10000000||i.workDone>R.integrationWork||i.paid!==Math.floor(i.totalCost*i.workDone/R.integrationWork)||i.processedThrough<i.startedMonth||i.workDone>i.processedThrough-i.startedMonth)throw Error('Invalid persistent integration record.');}
 function integrate(parent,provider,integration,month,workAvailable,paused=false,protectedCash=0){
  validateIntegration(integration);distinct([parent,provider]);
  if(parent.entityId!==integration.owner)throw Error('Integration belongs to a different owner.');
  if(!whole(month)||month!==integration.processedThrough+1||!Number.isFinite(workAvailable)||workAvailable<0||typeof paused!=='boolean'||!whole(protectedCash))throw Error('Integration must settle once with finite available work.');
  const next=copy(integration);next.processedThrough=month;
  const due=next.workDone<R.integrationWork?Math.floor(next.totalCost*(next.workDone+1)/R.integrationWork)-next.paid:0;
  if(paused||workAvailable<1||next.workDone===R.integrationWork||parent.accounts.cash<due+protectedCash)return {parent:copy(parent),provider:copy(provider),integration:next,workUsed:0,paid:0};
  const paid=GroupAccounting.servicePayment(parent,provider,due);next.workDone++;next.paid+=due;validateIntegration(next);
  return {parent:paid.payer,provider:paid.provider,integration:next,workUsed:1,paid:due};
 }
 return {pending,validate,cancel,defend,close,validateLoan,serviceDebt,validateIntegration,integrate};
})();
