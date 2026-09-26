'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const ctx={};vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const G=ctx.BWEngine.GroupAccounting,A=ctx.BWEngine.CompanyAuction,asset='businessAssets',base='baseAssets',copy=x=>JSON.parse(JSON.stringify(x));
function fresh(cash=500000){
 const issuers=Array.from({length:6},(_,i)=>({id:'company:'+i,issued:100000,referenceCents:1000,suspended:false}));
 const holders=['bank-a','bank-b','outside'].map(id=>{const external=id==='outside',positions=Object.fromEntries(issuers.map(i=>[i.id,{shares:external?100000:0,basis:external?1000000:0}]));
  // Transparent opening shareholder endowments for a domain test. Campaign
  // integration must supply existing corporate funds, not execute this fixture.
  const amount=external?1500000:cash,basis=external?6000000:0;
  return {id,[base]:0,positions,book:G.post(G.opening(id),'fixture.founders','external-founders',{cash:amount,[asset]:basis,equity:amount+basis})};});
 return A.opening(issuers,holders);
}
const buy=(holder,shares=2000,limitCents=1100,issuer='company:0')=>({holder,issuer,side:'buy',shares,limitCents});
const cash=s=>s.holders.reduce((n,h)=>n+h.book.accounts.cash,0)+s.exchange.accounts.cash;
test('outside liquidity is funded, bounded and not replenished; prices respect limits',()=>{
 let s=fresh(),opening=cash(s);for(let month=1;month<=55;month++){
  const orders=[buy('bank-a',2000)],before=JSON.stringify(s);let next;
  try{next=A.settle(s,orders,month);}catch(e){assert.match(e.message,/cash/);next=A.settle(s,[],month);}
  assert.equal(JSON.stringify(s),before);A.validate(next);assert.equal(cash(next),opening);
  const receipt=next.receipts.find(r=>r.holder==='bank-a');if(receipt){assert(receipt.shares<=2000);assert(receipt.priceCents<=1100);}
  s=next;
 }
 assert(s.holders.find(h=>h.id==='bank-a').positions['company:0'].shares>0);
 assert(s.holders.find(h=>h.id==='bank-a').book.accounts.cash<500000);
});
test('simultaneous equal-price buyers receive proportional partial fills, independent of seat/order layout',()=>{
 const s=fresh(),orders=[buy('bank-a',2001),buy('bank-b',2001)],one=A.settle(s,orders,1),two=A.settle(s,orders.slice().reverse(),1);
 assert.deepEqual(one,two);assert.equal(one.receipts.filter(r=>r.side==='buy').reduce((n,r)=>n+r.shares,0),2000);
 assert.deepEqual(copy(one.receipts.filter(r=>r.side==='buy').map(r=>r.shares)),[1000,1000]);
 const uneven=A.settle(s,[buy('bank-a',1500),buy('bank-b',500)],1);assert.deepEqual(copy(uneven.receipts.filter(r=>r.side==='buy').map(r=>r.shares)),[1500,500]);
 const noFill=A.settle(s,[buy('bank-a',1000,1000)],1);assert.equal(noFill.receipts.length,0);assert.equal(noFill.feesPaid,0);
});
test('whole-plan reserves reject overspending, selling unowned shares and using unsettled proceeds',()=>{
 let s=fresh(23000);const before=JSON.stringify(s);
 assert.throws(()=>A.reservations(s,[buy('bank-a'),buy('bank-a',2000,1100,'company:1')]),/cash/);
 assert.throws(()=>A.reservations(s,[buy('bank-a')],{'bank-a':2000}),/cash/);
 assert.throws(()=>A.reservations(s,[],{outside:2000}),/parent cash/);
 assert.throws(()=>A.reservations(s,[{...buy('bank-a'),side:'sell'}]),/unowned/);
 assert.throws(()=>A.reservations(s,[buy('bank-a'),buy('bank-a')]),/One order/);
 assert.equal(JSON.stringify(s),before);
 s=A.settle(s,[buy('bank-a')],1);
 assert.throws(()=>A.reservations(s,[{...buy('bank-a'),side:'sell'},buy('bank-a',1000,1100,'company:1')]),/cash/);
 const empty=A.settle(s,[],2);assert.equal(empty.feesPaid,s.feesPaid,'Unfilled/cancelled orders have no fee');
});
test('indivisible residual-share priority rotates rather than always favoring the first bank',()=>{
 const s=fresh(1500000),a=s.holders.find(h=>h.id==='bank-a'),outside=s.holders.find(h=>h.id==='outside');
 // An explicit already-completed founder sale leaves 1,999 outside shares.
 a.positions['company:0']={shares:98001,basis:980010};outside.positions['company:0']={shares:1999,basis:19990};
 a.book=G.post(a.book,'fixture.purchase','outside',{cash:-980010,[asset]:980010});outside.book=G.post(outside.book,'fixture.sale','bank-a',{cash:980010,[asset]:-980010});A.validate(s);
 const orders=[buy('bank-a'),buy('bank-b')],first=A.settle(s,orders,1),second=A.settle(A.settle(s,[],1),orders,2);
 const fills=x=>Object.fromEntries(x.receipts.filter(r=>r.side==='buy').map(r=>[r.holder,r.shares]));
 assert.deepEqual(fills(first),{'bank-a':999,'bank-b':1000});assert.deepEqual(fills(second),{'bank-a':1000,'bank-b':999});
});
test('fractional-dollar clearing, sales basis and exchange fees reconcile without manufacturing cents',()=>{
 let s=fresh();s.issuers[0].referenceCents=101;
 s=A.settle(s,[buy('bank-a',1,110),buy('bank-b',2,110)],1);
 assert.equal(s.receipts.filter(r=>r.side==='buy').reduce((n,r)=>n+r.consideration,0),s.receipts.filter(r=>r.side==='sell').reduce((n,r)=>n+r.consideration,0));
 assert.equal(cash(s),s.openingCash);
 const old=s.holders.find(h=>h.id==='bank-b').positions['company:0'].basis,priorFees=s.exchange.accounts.cash;
 s=A.settle(s,[{...buy('bank-b',2,98),side:'sell'}],2);
 const sale=s.receipts.find(r=>r.holder==='bank-b');assert.equal(sale.basisReleased,old);assert.equal(s.holders.find(h=>h.id==='bank-b').positions['company:0'].basis,0);
 assert.equal(s.exchange.accounts.cash,s.receipts.reduce((n,r)=>n+r.fee,0)+priorFees,'Each filled side pays its rounded fee once');
});
test('invalid saves, duplicate months and malformed orders fail without mutation; marks are not operating profit',()=>{
 const s=fresh(),before=JSON.stringify(s);
 for(const mutate of [x=>x.holders[0].positions['company:0'].shares++,x=>x.holders[0].positions['company:0'].basis++,x=>x.feesPaid++,x=>x.holders[1].id=x.holders[0].id,x=>x.exchange.entityId='bank-a']){const n=copy(s);mutate(n);assert.throws(()=>A.validate(n));}
 for(const o of [{...buy('bank-a'),shares:1.5},{...buy('bank-a'),limitCents:0},{...buy('bank-a'),shares:Infinity},{...buy('bank-a'),side:'short'},{...buy('bank-a'),holder:'outside'}])assert.throws(()=>A.reservations(s,[o]));
 assert.throws(()=>A.settle(s,[],0),/month/);assert.throws(()=>A.settle(s,[],2),/month/);
 const n=A.settle(s,[buy('bank-a')],1),saved=JSON.stringify(n),earnings=n.holders[0].book.retainedEarnings;
 for(const mutate of [x=>x.receipts.push(copy(x.receipts[0])),x=>x.receipts[0].shares++,x=>x.receipts[0].priceCents++]){const bad=copy(n);mutate(bad);assert.throws(()=>A.validate(bad));}
 const m=A.marks(n);assert.equal(n.holders[0].book.retainedEarnings,earnings);assert.equal(JSON.stringify(n),saved);assert(m[0].positions[0].shares>0);assert.equal(JSON.stringify(s),before);
 assert.throws(()=>A.settle(n,[buy('bank-a')],1),/month/);
});
test('reference uses issuer equity and observed operating earnings; dividends require funded profits and reserves',()=>{
 const q=A.reference(1000000,[10000,20000,-10000]);assert.equal(q.referenceCents,1040);assert.equal(q.monthsObserved,3);
 assert.equal(A.reference(-1000,[-100]).nonpositive,true);assert.equal(A.reference(-1000,[-100]).referenceCents,0);
 assert.throws(()=>A.reference(1,[NaN]));assert.throws(()=>A.reference(1,Array(7).fill(0)));
 const s=A.settle(fresh(),[buy('bank-a'),buy('bank-b')],1);
 let issuer=G.post(G.opening('company:0'),'fixture.founders','external-founder',{cash:100000,equity:100000});
 assert.equal(A.dividendQuote(s,'company:0',issuer,100000,10000).amount,0,'Opening equity is not retained profit');
 issuer=G.post(issuer,'fixture.sales','external-customer',{cash:30000,equity:30000},30000);
 const before=JSON.stringify({s,issuer}),dividend=A.dividendQuote(s,'company:0',issuer,30000,10000);
 assert.equal(dividend.amount,9000);assert.equal(Object.values(dividend.payments).reduce((n,x)=>n+x,0),9000);
 assert(dividend.payments['bank-a']>0);assert(dividend.payments.outside>dividend.payments['bank-a']);
 assert.equal(A.dividendQuote(s,'company:0',issuer,30000,50000).amount,0,'Cash reserve limits distributions');
 assert.equal(A.dividendQuote(s,'company:0',issuer,30000,10000,1).amount,0,'Arrears block discretionary dividends');
 assert.equal(JSON.stringify({s,issuer}),before,'Income quote cannot pay anyone');
});
test('120 seeded auction months preserve every share and dollar through six issuers, thin liquidity and varying limits',()=>{
 let s=fresh(1500000),seed=75;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let month=1;month<=120;month++){
  const orders=[];
  for(const holder of ['bank-a','bank-b'])for(const issuer of s.issuers){
   const position=s.holders.find(h=>h.id===holder).positions[issuer.id],sell=position.shares&&rand(2),order={holder,issuer:issuer.id,side:sell?'sell':'buy',shares:sell?Math.min(position.shares,1+rand(2500)):1+rand(3000),limitCents:900+rand(201)};
   try{A.reservations(s,orders.concat(order));orders.push(order);}catch(error){assert.match(error.message,/cash/);}
  }
  const before=JSON.stringify(s),next=A.settle(s,orders,month),again=A.settle(copy(s),orders.slice().reverse(),month);
  assert.deepEqual(next,again);assert.equal(JSON.stringify(s),before);assert.equal(cash(next),s.openingCash);
  for(const receipt of next.receipts){
   if(receipt.holder==='outside')assert(receipt.shares<=2000);
   else {const order=orders.find(o=>o.holder===receipt.holder&&o.issuer===receipt.issuer);assert(receipt.shares<=order.shares);assert(order.side==='buy'?receipt.priceCents<=order.limitCents:receipt.priceCents>=order.limitCents);}
  }
  s=next;
 }
 assert(s.feesPaid>0);assert.equal(s.month,120);
});
