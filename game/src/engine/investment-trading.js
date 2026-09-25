// Existing-asset portfolio orders. Clearing reserves opening dealer cash and
// inventory independently: another order's proceeds cannot finance a circular
// same-month fill. Only the paired client adapter commits accounting entries.
const InvestmentTrading=(()=>{
 const whole=n=>Number.isSafeInteger(n)&&n>=0,copy=x=>JSON.parse(JSON.stringify(x));
 const exact=(x,keys)=>{if(!x||typeof x!=='object'||Array.isArray(x))return false;const own=Object.keys(x);if(own.length!==keys.length)return false;const set=new Set(keys);if(set.size!==keys.length)return false;for(let i=0;i<own.length;i++)if(!set.has(own[i]))return false;return true;};
 const FEE=5,WORK=5;
 const reasons=Object.freeze(['','relationship','capacity','cash','holdings','suitability','dealer liquidity','dealer inventory']);
 function investmentTradingOrders(orders){
  if(!Array.isArray(orders)||orders.length>32||new Set(orders.map(o=>o?.clientId)).size!==orders.length||orders.some(o=>!exact(o,['owner','clientId','side','amount'])||typeof o.owner!=='string'||!o.owner||typeof o.clientId!=='string'||!o.clientId||o.clientId.length>80||!['buy','sell'].includes(o.side)||!whole(o.amount)||!o.amount||o.amount>1000000))throw Error('Invalid or duplicate portfolio orders.');
 }
 function investmentTradingQuote(client,price,position,side,amount){
  if(!['buy','sell'].includes(side)||!whole(amount)||!amount||amount>1000000)throw Error('Choose a valid portfolio order.');
  const fit=InvestmentSuitability.assess(client,price,position),requested=Math.floor(amount/price);
  let wanted=0,reason='';
  if(side==='buy'){
   const cashUnits=Math.max(0,Math.floor((client.cash-FEE)/price));
   const safeValue=Math.max(0,Number(BigInt(Math.max(0,fit.total-FEE))*BigInt(fit.maximumBp)/10000n)-fit.exposure);
   const fitUnits=Math.floor(safeValue/price);wanted=Math.min(requested,cashUnits,fitUnits);
   if(wanted<requested)reason=fitUnits<Math.min(requested,cashUnits)?'suitability':'cash';
  }else{wanted=Math.min(requested,client.units);if(wanted<requested)reason='holdings';}
  if(!requested)reason=side==='buy'?'cash':'holdings';
  return {requested,wanted,fee:wanted?FEE:0,gross:wanted*price,cashChange:wanted?(side==='buy'?-wanted*price-FEE:wanted*price-FEE):0,reason};
 }
 function investmentTradingSplit(total,weights,ids){
  const sum=weights.reduce((n,x)=>n+BigInt(x),0n);if(!sum)return weights.map(()=>0);
  const paid=weights.map(n=>Number(BigInt(total)*BigInt(n)/sum)),remainders=weights.map((n,i)=>({i,left:BigInt(total)*BigInt(n)%sum})).sort((a,b)=>a.left===b.left?(ids[a.i]<ids[b.i]?-1:1):a.left>b.left?-1:1);
  const remaining=total-paid.reduce((a,b)=>a+b,0);for(let i=0;i<remaining;i++)paid[remainders[i].i]++;
  return paid;
 }
 function investmentTradingClear(input,orders,locations){
  investmentTradingOrders(orders);
  if(!exact(input,['clients','price','dealerCash','dealerUnits','capacity'])||!Array.isArray(input.clients)||new Set(input.clients.map(c=>c.id)).size!==input.clients.length||!whole(input.dealerCash)||!whole(input.dealerUnits)||!whole(input.price)||input.price<10||input.price>10000||!Array.isArray(input.capacity)||new Set(input.capacity.map(c=>c.owner)).size!==input.capacity.length)throw Error('Invalid portfolio market.');
  const capacity=copy(input.capacity);
  for(const c of capacity)if(!exact(c,['owner','advice','brokerage','operations','custody'])||typeof c.owner!=='string'||!['advice','brokerage','operations','custody'].every(k=>whole(c[k])))throw Error('Invalid portfolio work budget.');
  if(orders.some(o=>!capacity.some(b=>b.owner===o.owner)||!input.clients.some(c=>c.id===o.clientId)))throw Error('Portfolio order has no known institution or client.');
  for(const c of input.clients)if(!exact(c,['id','owner','cash','units','service','serviced','ownedCustody','position'])||!['advice','brokerage'].includes(c.service)||typeof c.serviced!=='boolean'||typeof c.ownedCustody!=='boolean'||c.owner!==null&&!capacity.some(b=>b.owner===c.owner))throw Error('Invalid portfolio client authorization.');
  let local;
  if(locations!==undefined){
   if(!exact(locations,['version','markets','local'])||locations.version!==1||!Array.isArray(locations.markets)||locations.markets.length!==input.clients.length||
    new Set(locations.markets.map(c=>c.id)).size!==input.clients.length||locations.markets.some(c=>!exact(c,['id','market'])||!input.clients.some(x=>x.id===c.id)||typeof c.market!=='string'||!c.market)||
    !Array.isArray(locations.local)||locations.local.length!==capacity.length)throw Error('Invalid portfolio service locations.');
   local=copy(locations.local);
   for(const [i,r]of local.entries())if(!exact(r,['owner','markets'])||r.owner!==capacity[i].owner||!Array.isArray(r.markets)||r.markets.length>4096||new Set(r.markets.map(m=>m.market)).size!==r.markets.length||
    r.markets.some(m=>!exact(m,['market','advice','brokerage'])||typeof m.market!=='string'||!m.market||!whole(m.advice)||!whole(m.brokerage)))throw Error('Invalid local portfolio work budget.');
  }
  const receipts=orders.slice().sort((a,b)=>a.clientId<b.clientId?-1:1).map(o=>{
   const r={...copy(o),units:0,gross:0,fee:0,work:0,reason:''},c=input.clients.find(c=>c.id===o.clientId),budget=capacity.find(c=>c.owner===o.owner);
   if(!c||c.owner!==o.owner||!c.serviced||!budget){r.reason='relationship';return r;}
   const q=investmentTradingQuote(c,input.price,c.position,o.side,o.amount);
   if(!q.wanted){r.reason=q.reason;return r;}
   const site=local?.find(x=>x.owner===o.owner)?.markets.find(m=>m.market===locations.markets.find(x=>x.id===c.id).market),localAvailable=site?.[c.service]||0;
   if(budget[c.service]+localAvailable<WORK||budget.operations<1||c.ownedCustody&&budget.custody<1){r.reason='capacity';return r;}
   // Reserve qualified work for the attempted order, even if dealer resources
   // later limit the fill. This is not reusable acquisition time this month.
   const localUsed=Math.min(WORK,localAvailable);if(site)site[c.service]-=localUsed;
   budget[c.service]-=WORK-localUsed;budget.operations--;if(c.ownedCustody)budget.custody--;
   r.work=WORK;r.units=q.wanted;r.reason=q.reason;return r;
  });
  for(const side of ['buy','sell']){
   const rows=receipts.filter(r=>r.side===side),wanted=rows.map(r=>r.units),total=wanted.reduce((n,x)=>n+x,0),available=side==='buy'?input.dealerUnits:Math.floor(input.dealerCash/input.price);
   const fills=investmentTradingSplit(Math.min(total,available),wanted,rows.map(r=>r.clientId));
   rows.forEach((r,i)=>{if(fills[i]<r.units)r.reason=side==='buy'?'dealer inventory':'dealer liquidity';r.units=fills[i];r.gross=r.units*input.price;r.fee=r.units?FEE:0;});
  }
  return {receipts,capacity,...(local?{local}:{})};
 }
 function investmentTradingValidate(book,month,clients,owners){
  if(!exact(book,['version','month','receipts'])||book.version!==1||book.month!==month||!Array.isArray(book.receipts)||book.receipts.length>32||!month&&book.receipts.length)throw Error('Invalid portfolio receipts.');
  const seen=new Set();for(const r of book.receipts){
   if(!exact(r,['owner','clientId','side','amount','units','gross','fee','work','reason'])||!owners.includes(r.owner)||!clients.some(c=>c.id===r.clientId)||seen.has(r.clientId)||!['buy','sell'].includes(r.side)||!['amount','units','gross','fee','work'].every(k=>whole(r[k]))||!r.amount||r.amount>1000000||r.gross>r.amount||r.fee!==(r.units?FEE:0)||![0,WORK].includes(r.work)||r.units&&!r.work||!r.units&&r.gross||!reasons.includes(r.reason))throw Error('Invalid portfolio execution receipt.');
   seen.add(r.clientId);
  }
  return true;
 }
 return Object.freeze({FEE,WORK,reasons,orders:investmentTradingOrders,quote:investmentTradingQuote,clear:investmentTradingClear,validate:investmentTradingValidate});
})();
