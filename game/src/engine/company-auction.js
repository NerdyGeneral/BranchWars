// Company equity clearing. New campaign adapters provide actual books and votes.
const CompanyAuction = (() => {
 const assetAccount='businessAssets';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const whole=n=>Number.isSafeInteger(n)&&n>=0;
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 const fee=amount=>Math.ceil(amount*25/10000);
 const checked=n=>{if(!whole(n))throw Error('Unsafe auction amount.');return n;};
 const cost=(shares,cents)=>Math.ceil(checked(shares*cents)/100);
 const RULES=Object.freeze({issued:100000,outsideMonthly:2000,feeBp:25,outsideSpreadBp:200,maxOrderShares:100000,maxPriceCents:1000000});
 function validate(s) {
  if(!exact(s,['version','month','issuers','holders','exchange','openingCash','feesPaid','receipts'])||s.version!==1||!whole(s.month)||
   !Array.isArray(s.issuers)||s.issuers.length!==6||!Array.isArray(s.holders)||s.holders.length!==3||!whole(s.openingCash)||!whole(s.feesPaid)||!Array.isArray(s.receipts)||s.receipts.length>18)throw Error('Invalid company auction state.');
  const ids=s.issuers.map(i=>i.id),owners=s.holders.map(h=>h.id);
  if(new Set(ids).size!==6||new Set(owners).size!==3||owners.filter(id=>id==='outside').length!==1)throw Error('Duplicate issuer or shareholder.');
  for(const i of s.issuers)if(!exact(i,['id','issued','referenceCents','suspended'])||typeof i.id!=='string'||!i.id||i.issued!==RULES.issued||!whole(i.referenceCents)||i.referenceCents>RULES.maxPriceCents||typeof i.suspended!=='boolean')throw Error('Invalid issuer quote.');
  GroupAccounting.validate(s.exchange);if(s.exchange.entityId!=='company:exchange'||s.exchange.accounts.cash!==s.feesPaid||s.exchange.accounts.equity!==s.feesPaid||s.exchange.retainedEarnings!==s.feesPaid||Object.entries(s.exchange.accounts).some(([key,n])=>!['cash','equity'].includes(key)&&n))throw Error('Exchange fees do not reconcile.');
  const entities=[s.exchange.entityId];
  for(const h of s.holders){
   if(!exact(h,['id','book','baseAssets','positions'])||typeof h.id!=='string'||!h.id||!whole(h.baseAssets)||!exact(h.positions,ids))throw Error('Invalid shareholder book.');
   GroupAccounting.validate(h.book);entities.push(h.book.entityId);
   for(const p of Object.values(h.positions))if(!exact(p,['shares','basis'])||!whole(p.shares)||p.shares>RULES.issued||!whole(p.basis)||!p.shares&&p.basis)throw Error('Invalid owned shares.');
   if(h.book.accounts[assetAccount]!==h.baseAssets+Object.values(h.positions).reduce((n,p)=>n+p.basis,0))throw Error('Share cost basis does not reconcile with entity investments.');
  }
  if(new Set(entities).size!==4)throw Error('Auction counterparties must be distinct.');
  for(const id of ids)if(s.holders.reduce((n,h)=>n+h.positions[id].shares,0)!==RULES.issued)throw Error('Issued shares were duplicated or lost.');
  if(s.holders.reduce((n,h)=>n+h.book.accounts.cash,0)+s.exchange.accounts.cash!==s.openingCash)throw Error('Auction cash is not conserved.');
  for(const r of s.receipts)if(!exact(r,['month','issuer','holder','side','shares','priceCents','consideration','fee','basisReleased','realized'])||r.month!==s.month||!ids.includes(r.issuer)||!owners.includes(r.holder)||!['buy','sell'].includes(r.side)||!r.shares||!whole(r.shares)||!whole(r.priceCents)||!whole(r.consideration)||r.fee!==fee(r.consideration)||!whole(r.basisReleased)||!Number.isSafeInteger(r.realized)||r.side==='buy'&&(r.basisReleased||r.realized)||r.side==='sell'&&r.realized!==r.consideration-r.basisReleased)throw Error('Invalid auction receipt.');
  const receiptIds=new Set();for(const r of s.receipts){const key=r.issuer+'/'+r.holder;
   if(!s.month||r.shares>RULES.issued||!r.priceCents||r.priceCents>RULES.maxPriceCents||receiptIds.has(key)||r.holder==='outside'&&r.shares>RULES.outsideMonthly)throw Error('Invalid duplicate or excessive auction fill.');receiptIds.add(key);}
  for(const id of ids){const rows=s.receipts.filter(r=>r.issuer===id),sum=(side,field)=>rows.filter(r=>r.side===side).reduce((n,r)=>n+r[field],0);
   if(sum('buy','shares')!==sum('sell','shares')||sum('buy','consideration')!==sum('sell','consideration')||new Set(rows.map(r=>r.priceCents)).size>1)throw Error('Auction fills do not clear at one price.');}
  return true;
 }
 function opening(issuers,holders){
  const s={version:1,month:0,issuers:clone(issuers),holders:clone(holders),exchange:GroupAccounting.opening('company:exchange'),openingCash:holders.reduce((n,h)=>n+h.book.accounts.cash,0),feesPaid:0,receipts:[]};
  validate(s);return s;
 }
 // Largest-remainder allocation. Tie priority rotates with month and issuer,
 // then uses stable holder identity; array order can never grant host priority.
 function split(total,items,weight,month,issuer){
  const sum=items.reduce((n,x)=>n+weight(x),0),result=new Map(items.map(x=>[x.id,0]));if(!sum||!total)return result;
  const sorted=items.slice().sort((a,b)=>a.id.localeCompare(b.id)),rotation=(month+issuer)%sorted.length;
  const rank=new Map(sorted.map((x,i)=>[x.id,(i-rotation+sorted.length)%sorted.length]));
  let used=0;const remainder=[];
  for(const x of items){const product=checked(total*weight(x)),q=Math.floor(product/sum);result.set(x.id,q);used+=q;remainder.push({id:x.id,r:product%sum});}
  remainder.sort((a,b)=>b.r-a.r||rank.get(a.id)-rank.get(b.id));
  for(let i=0;i<total-used;i++)result.set(remainder[i].id,result.get(remainder[i].id)+1);
  return result;
 }
 function orderQuote(issuers,h,orders,protectedCash=0){
  GroupAccounting.validate(h.book);
  if(h.id==='outside'||!whole(protectedCash)||!Array.isArray(orders)||orders.length>6)throw Error('Invalid parent order quote.');
  const seen=new Set();let cash=0;
  for(const o of orders){
   if(!exact(o,['holder','issuer','side','shares','limitCents'])||o.holder!==h.id||!['buy','sell'].includes(o.side)||!whole(o.shares)||!o.shares||o.shares>RULES.maxOrderShares||!whole(o.limitCents)||!o.limitCents||o.limitCents>RULES.maxPriceCents)throw Error('Invalid whole-share limit order.');
   const i=issuers.find(i=>i.id===o.issuer),key=o.issuer;
   if(!i||i.suspended||seen.has(key))throw Error('One order per parent and active issuer.');seen.add(key);
   if(o.side==='sell'){if(o.shares>h.positions[o.issuer].shares)throw Error('Cannot sell unowned shares.');}
   else {const amount=cost(o.shares,o.limitCents);cash+=amount+fee(amount);}
  }
  if(cash+protectedCash>h.book.accounts.cash)throw Error('Buy orders exceed existing unreserved parent cash; unsettled sales cannot fund purchases.');
  return {cash,protectedCash,remaining:h.book.accounts.cash-cash-protectedCash};
 }
 function reservations(s,orders,protectedCash={}){
  validate(s);if(!Array.isArray(orders)||orders.length>12)throw Error('Too many company orders.');
  for(const [id,n]of Object.entries(protectedCash))if(id==='outside'||!s.holders.some(h=>h.id===id)||!whole(n))throw Error('Invalid protected parent cash.');
  if(orders.some(o=>!o||o.holder==='outside'||!s.holders.some(h=>h.id===o.holder)))throw Error('Invalid order owner.');
  const cash={outside:0};for(const h of s.holders.filter(h=>h.id!=='outside'))cash[h.id]=orderQuote(s.issuers,h,orders.filter(o=>o.holder===h.id),protectedCash[h.id]||0).cash;
  return cash;
 }
 function outsideOrders(s){
  const h=s.holders.find(h=>h.id==='outside'),buys=[];let available=h.book.accounts.cash;
  // Divide the actual outside budget among all quoted issuers before clearing.
  // No later issuer can reuse sales proceeds from an earlier issuer.
  const ids=s.issuers.slice().sort((a,b)=>a.id.localeCompare(b.id)),rot=s.month%ids.length;
  const order=ids.slice(rot).concat(ids.slice(0,rot)),result=[];
  for(const i of order){if(i.suspended||!i.referenceCents)continue;
   const ask=Math.min(RULES.maxPriceCents,Math.ceil(i.referenceCents*1.02)),bid=Math.floor(i.referenceCents*.98);
   if(h.positions[i.id].shares)result.push({holder:'outside',issuer:i.id,side:'sell',shares:Math.min(RULES.outsideMonthly,h.positions[i.id].shares),limitCents:ask});
   if(!bid)continue;
   const allocation=Math.floor(available/(order.length-buys.length)),max=RULES.outsideMonthly;
   let low=0,high=max;while(low<high){const mid=Math.ceil((low+high)/2),paid=cost(mid,bid);if(paid+fee(paid)<=allocation)low=mid;else high=mid-1;}
   buys.push(i.id);if(low){const amount=cost(low,bid);available-=amount+fee(amount);result.push({holder:'outside',issuer:i.id,side:'buy',shares:low,limitCents:bid});}
  }
  return result;
 }
 function priceFor(issuer,orders){
  const candidates=[...new Set([issuer.referenceCents,...orders.map(o=>o.limitCents)])].filter(n=>n>0);
  return candidates.map(price=>{const buy=orders.filter(o=>o.side==='buy'&&o.limitCents>=price).reduce((n,o)=>n+o.shares,0),sell=orders.filter(o=>o.side==='sell'&&o.limitCents<=price).reduce((n,o)=>n+o.shares,0);return {price,volume:Math.min(buy,sell),imbalance:Math.abs(buy-sell),distance:Math.abs(price-issuer.referenceCents)};})
   .sort((a,b)=>b.volume-a.volume||a.imbalance-b.imbalance||a.distance-b.distance||a.price-b.price)[0]||{price:0,volume:0};
 }
 function fillSide(orders,side,price,volume,month,index){
  const eligible=orders.filter(o=>o.side===side&&(side==='buy'?o.limitCents>=price:o.limitCents<=price)),filled=new Map();let left=volume;
  const levels=[...new Set(eligible.map(o=>o.limitCents))].sort((a,b)=>side==='buy'?b-a:a-b);
  for(const level of levels){const group=eligible.filter(o=>o.limitCents===level).map(o=>({...o,id:o.holder})),qty=Math.min(left,group.reduce((n,o)=>n+o.shares,0));const prorata=split(qty,group,o=>o.shares,month,index);
   for(const [id,n]of prorata)if(n)filled.set(id,n);left-=qty;if(!left)break;}
  return filled;
 }
 function settle(input,orders,month,protectedCash={}){
  reservations(input,orders,protectedCash);if(month!==input.month+1)throw Error('Auction month is duplicate, stale or skipped.');
  const s=clone(input),all=orders.concat(outsideOrders(input));s.month=month;s.receipts=[];
  for(const [index,i]of s.issuers.slice().sort((a,b)=>a.id.localeCompare(b.id)).entries()){
   const local=all.filter(o=>o.issuer===i.id),q=priceFor(i,local);if(!q.volume)continue;
   const sides=['buy','sell'].map(side=>fillSide(local,side,q.price,q.volume,month,index));
   // Both sides split the identical whole-dollar pool, so fractional-dollar
   // rounding never creates money. A buyer pays at most its rounded limit.
   const pool=Math.floor(checked(q.volume*q.price)/100);
   for(const [sideIndex,side]of ['buy','sell'].entries()){
    const fills=[...sides[sideIndex]].map(([id,shares])=>({id,shares})).sort((a,b)=>a.id.localeCompare(b.id)),payments=split(pool,fills,x=>x.shares,month,index);
    for(const f of fills){const h=s.holders.find(h=>h.id===f.id),position=h.positions[i.id],amount=payments.get(f.id),charge=fee(amount);
     const basis=side==='sell'?(f.shares===position.shares?position.basis:Math.floor(checked(position.basis*f.shares)/position.shares)):0;
     const realized=side==='sell'?amount-basis:0;
     h.book=GroupAccounting.post(h.book,'company.auction.'+side,i.id,side==='buy'?{cash:-amount,[assetAccount]:amount}:{cash:amount,[assetAccount]:-basis,equity:realized},realized);
     position.shares+=side==='buy'?f.shares:-f.shares;position.basis+=side==='buy'?amount:-basis;
     if(charge){const transfer=GroupAccounting.servicePayment(h.book,s.exchange,charge);h.book=transfer.payer;s.exchange=transfer.provider;s.feesPaid+=charge;}
     s.receipts.push({month,issuer:i.id,holder:h.id,side,shares:f.shares,priceCents:q.price,consideration:amount,fee:charge,basisReleased:basis,realized});
    }
   }
  }
  validate(s);return s;
 }
 function reference(equity,profits){
  if(!Number.isSafeInteger(equity)||!Array.isArray(profits)||profits.length>6||profits.some(n=>!Number.isSafeInteger(n)))throw Error('Use settled issuer equity and at most six actual monthly profits.');
  const average=profits.length?profits.reduce((n,p)=>n+p,0)/profits.length:0;
  if(!Number.isSafeInteger(profits.reduce((n,p)=>n+p,0)))throw Error('Unsafe issuer earnings.');
  const valuation=equity+6*Math.max(0,average),cents=Math.max(0,Math.min(RULES.maxPriceCents,Math.round(valuation*100/RULES.issued)));
  return {referenceCents:cents,equity,averageMonthlyProfit:average,monthsObserved:profits.length,nonpositive:valuation<=0};
 }
 function dividendQuote(s,issuer,book,profit,baseFee,principalArrears=0,interestArrears=0){
  validate(s);GroupAccounting.validate(book);
  if(!s.issuers.some(i=>i.id===issuer)||book.entityId!==issuer||!Number.isSafeInteger(profit)||!whole(baseFee)||!baseFee||!whole(principalArrears)||!whole(interestArrears))throw Error('Invalid funded issuer dividend inputs.');
  const amount=principalArrears||interestArrears?0:Math.min(Math.floor(Math.max(0,profit)*.3),GroupAccounting.distributionLimit(book,0,baseFee));
  const allocation=split(amount,s.holders,h=>h.positions[issuer].shares,s.month+1,s.issuers.map(i=>i.id).sort().indexOf(issuer));
  return {issuer,amount,reserve:3*baseFee,payments:Object.fromEntries(allocation)};
 }
 function marks(s){validate(s);return s.holders.map(h=>({holder:h.id,positions:s.issuers.map(i=>({issuer:i.id,shares:h.positions[i.id].shares,basis:h.positions[i.id].basis,markedValue:Math.floor(checked(h.positions[i.id].shares*i.referenceCents)/100),unrealized:Math.floor(checked(h.positions[i.id].shares*i.referenceCents)/100)-h.positions[i.id].basis}))}));}
 function allocateDistribution(s,issuer,amount){validate(s);checked(amount);if(!s.issuers.some(i=>i.id===issuer))throw Error('Unknown distribution issuer.');return Object.fromEntries(split(amount,s.holders,h=>h.positions[issuer].shares,s.month,s.issuers.map(i=>i.id).sort().indexOf(issuer)));}
 return Object.freeze({RULES,opening,validate,reservations,orderQuote,outsideOrders,settle,marks,reference,dividendQuote,allocateDistribution});
})();
