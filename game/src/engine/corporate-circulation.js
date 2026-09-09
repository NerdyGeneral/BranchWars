// Group7 only. Previously every dollar received by these outside providers was
// permanently warehoused. They now spend 1/50 of actual closing CASH on local
// household/supplier goods and services. The recipient is the EXISTING outside
// corporate customer pool, not a new company, bank deposit or shareholder gift.
// No receivable, custody asset, unpaid invoice or future receipt funds spending.
// Third-party carrier operating purchases do not simulate insurance claims or
// authorize player underwriting. Each external source retains its other 98%.
const CorporateCirculation=(()=>{
 const IDS=Object.freeze(['agency:carriers','agency:suppliers','facility:suppliers','department:providers','department:service-network']);
 const copy=x=>JSON.parse(JSON.stringify(x)),whole=n=>Number.isSafeInteger(n)&&n>=0;
 function opening(world){
  CompanyFinance.validate(world);
  if(world.version!==3||world.month!==0)throw Error('Circulation rules require a new Group7 campaign.');
  const next=copy(world);next.version=4;
  next.circulation={version:1,month:0,externalReturned:0,creditorSpent:0,lastExternal:0,lastCreditor:0};
  CompanyFinance.validate(next);return next;
 }
 function step(world,sources){
  CompanyFinance.validate(world);
  if(world.version!==4||world.month!==world.circulation.month+1)throw Error('Corporate circulation requires one unsettled completed month.');
  if(!Array.isArray(sources)||sources.length!==IDS.length)throw Error('Five funded outside counterparties are required.');
  for(const [i,book]of sources.entries()){
   GroupAccounting.validate(book);if(book.entityId!==IDS[i])throw Error('Unexpected circulation payer.');
  }
  const next=copy(world),payers=copy(sources),payments=[];
  const before=[world.outside,world.creditor,...sources].reduce((n,b)=>n+BigInt(b.accounts.cash),0n);
  const purchase=book=>{
   const amount=Math.floor(book.accounts.cash/50);
   if(!amount)return {book,amount};
   // Named entries make the transfer visible in both bounded journals.
   const payer=GroupAccounting.post(book,'regional.circulation',next.outside.entityId,{cash:-amount,equity:-amount},-amount);
   next.outside=GroupAccounting.post(next.outside,'regional.circulation',book.entityId,{cash:amount,equity:amount},amount);
   return {book:payer,amount};
  };
  const creditor=purchase(next.creditor);next.creditor=creditor.book;
  for(const [i,book]of payers.entries()){const paid=purchase(book);payers[i]=paid.book;payments.push(paid.amount);}
  const external=payments.reduce((a,b)=>a+b,0),r=next.circulation;
  r.month=next.month;r.lastExternal=external;r.lastCreditor=creditor.amount;
  r.externalReturned+=external;r.creditorSpent+=creditor.amount;
  if(!whole(external))throw Error('Circulation total exceeds integer dollars.');
  const after=[next.outside,next.creditor,...payers].reduce((n,b)=>n+BigInt(b.accounts.cash),0n);
  if(after!==before)throw Error('Corporate circulation did not conserve cash.');
  CompanyFinance.validate(next);
  return {world:next,sources:payers,payments,external,creditor:creditor.amount};
 }
 return Object.freeze({IDS,opening,step});
})();
function initializeCorporateCirculation(g){
 if(g.financialGroupVersion!==7)return;
 g.companyEconomy=CorporateCirculation.opening(g.companyEconomy);
 g.agencyEconomy.version=2;g.agencyEconomy.circulated={carrier:0,supplier:0};
 for(const key of ['facilityEconomy','departmentEconomy','departmentFunctionEconomy']){g[key].version=2;g[key].circulated=0;}
}
function validateCorporateCirculation(g){
 if(g.financialGroupVersion!==7)return;
 const e=g.agencyEconomy,others=['facilityEconomy','departmentEconomy','departmentFunctionEconomy'].map(k=>g[k]);
 const counters=[e?.circulated?.carrier,e?.circulated?.supplier,...others.map(x=>x?.circulated)];
 if(e?.version!==2||others.some(x=>x?.version!==2)||counters.some(n=>!Number.isSafeInteger(n)||n<0)||
  !g.companyEconomy?.circulation||g.companyEconomy.circulation.month!==g.companyEconomy.month||
  counters.reduce((n,x)=>n+BigInt(x),0n)!==BigInt(g.companyEconomy.circulation.externalReturned))
  throw Error('Corporate receipts do not match funded counterparty spending.');
}
function settleCorporateCirculation(g){
 if(g.financialGroupVersion!==7)return [];
 const result=CorporateCirculation.step(g.companyEconomy,[g.agencyEconomy.carrier,g.agencyEconomy.supplier,
  g.facilityEconomy.supplier,g.departmentEconomy.supplier,g.departmentFunctionEconomy.supplier]);
 const next={...g,companyEconomy:result.world,agencyEconomy:{...g.agencyEconomy,carrier:result.sources[0],supplier:result.sources[1],
  circulated:{carrier:g.agencyEconomy.circulated.carrier+result.payments[0],supplier:g.agencyEconomy.circulated.supplier+result.payments[1]}}};
 for(const [i,key]of ['facilityEconomy','departmentEconomy','departmentFunctionEconomy'].entries())
  next[key]={...g[key],supplier:result.sources[i+2],circulated:g[key].circulated+result.payments[i+2]};
 validateCorporateCirculation(next);
 for(const key of ['companyEconomy','agencyEconomy','facilityEconomy','departmentEconomy','departmentFunctionEconomy'])g[key]=next[key];
 return ['Outside counterparties spent $'+(result.external+result.creditor).toLocaleString()+
  ' of existing cash locally. It is available to fund next month’s company sales, not a grant to either bank.'];
}
