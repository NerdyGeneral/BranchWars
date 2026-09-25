'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={};vm.runInNewContext(['accounting.js','group-accounting.js','investment-suitability.js','investment-notes.js'].map(f=>fs.readFileSync(path.join(__dirname,'../src/engine',f),'utf8')).join('\n')+';this.N=InvestmentNotes;this.A=GroupAccounting;this.S=InvestmentSuitability;',context);
const {N,A}=context,copy=x=>JSON.parse(JSON.stringify(x));
function fixture(cash=200000){let dealer=A.post(A.opening('investment:dealer'),'fixture.capital','fixture.shareholder',{cash,equity:cash});dealer=A.post(dealer,'fixture.inventory','fixture.seller',{cash:-100000,businessAssets:100000});return {book:N.opening(),dealer,clients:[{id:'a',cash:100000},{id:'b',cash:100000}]};}
const cash=x=>x.dealer.accounts.cash+x.clients.reduce((n,c)=>n+c.cash,0);
const instruction=(clientId,product,amount)=>({clientId,product,amount});

test('note quotes count existing locked claims, reserve fees and refuse a long lock for near-term mandates',()=>{
 const {S}=context,clients=Array.from({length:10},(_,i)=>({id:'quote:'+i,cash:10000,units:0}));
 const liquid=clients.find(c=>S.mandate(c).key==='liquidity');assert(liquid);
 assert.equal(N.quote(liquid,100,{deposit:0,value:0},'long',100,400).reason,'horizon');
 for(const c of clients){const q=N.quote(c,100,{deposit:0,value:0},'short',10000,400);assert(q.amount+q.fee<=c.cash);assert(q.amount<=Math.floor((c.cash-q.fee)*S.mandate(c).maximumBp/10000));const locked=N.quote(c,100,{deposit:0,value:100000},'short',10000,400);assert.equal(locked.amount,0);assert.equal(locked.reason,'suitability');}
});

test('notes originate from client cash into matching issuer debt without manufacturing income or assets',()=>{
 let f=fixture(),initial=cash(f);assert.equal(N.room(f.dealer),80000);assert.equal(f.book.positions.length,0);
 f=N.advance(f,1);const before=JSON.stringify(f),out=N.subscribe(f,[instruction('a','short',10000),instruction('b','long',10000)],400);
 assert.equal(JSON.stringify(f),before);assert.equal(cash(out),initial);assert.equal(out.dealer.accounts.debt,20000);assert.equal(out.dealer.accounts.equity,f.dealer.accounts.equity);assert.equal(out.book.interestPaid,0);
 assert.equal(out.clients[0].cash,90000);assert.equal(N.claims(out.book,'a'),10000);assert.deepEqual(copy(out.book.positions.map(p=>[p.product,p.annualBp,p.matures])),[['short',350,7],['long',500,25]]);
 assert.throws(()=>N.subscribe(out,[],400),/already cleared/);assert.throws(()=>N.advance(out,1),/repeated/);
});

test('fixed coupons, distinct maturity dates and actual cash payments survive repeated save/resume',()=>{
 let f=N.subscribe(N.advance(fixture(),1),[instruction('a','short',12000),instruction('b','long',12000)],400),initial=cash(f);
 for(let month=2;month<=25;month++){
  f=N.advance(copy(f),month);assert.equal(cash(f),initial);N.validate(f.book,f.clients,f.dealer);
  if(month===6){assert.equal(f.book.principalPaid,0);assert.equal(f.book.positions[0].annualBp,350);}
  if(month===7){assert.equal(f.book.principalPaid,12000);assert.equal(f.book.positions.length,1);assert.equal(f.clients[0].cash,100210);}
 }
 assert.equal(f.book.positions.length,0);assert.equal(f.book.principalPaid,24000);assert.equal(f.book.interestPaid,1410);assert.equal(f.dealer.accounts.debt,0);assert.equal(f.dealer.accounts.payables,0);
 assert.equal(f.clients[1].cash,101200);assert.equal(f.dealer.retainedEarnings,-1410);
});

test('liquidity shortfalls retain unpaid claims; principal has priority and subscriptions cannot finance earlier payment',()=>{
 let f=N.subscribe(N.advance(fixture(),1),[instruction('a','short',12000),instruction('b','long',12000)],400);
 // A real issuer inventory purchase moves cash to the outside seller. It does
 // not create a client payout or erase issuer assets/equity.
 const spent=f.dealer.accounts.cash;f.dealer=A.post(f.dealer,'fixture.inventory','fixture.seller',{cash:-spent,businessAssets:spent});
 const before=JSON.stringify(f);f=N.advance(f,2);assert.notEqual(JSON.stringify(f),before);assert.equal(f.book.interestPaid,0);assert.equal(f.dealer.accounts.payables,85);
 assert.equal(N.claims(f.book,'a'),12035);assert.equal(f.clients[0].cash,88000);
 for(let month=3;month<=7;month++)f=N.advance(f,month);
 assert.equal(f.book.report[0].overdue,12210);assert.equal(f.dealer.accounts.debt,24000);
 f.dealer=A.post(f.dealer,'fixture.inventorySale','fixture.buyer',{cash:100,businessAssets:-100});
 f=N.advance(f,8);assert.equal(f.book.report[0].principal,100);assert.equal(f.book.report[0].interest,0);assert.equal(f.book.positions[0].interestDue,210,'Matured note must not invent penalty coupons');
 assert.equal(f.book.report[1].interest,0);assert.equal(f.dealer.accounts.debt,23900);
});

test('simultaneous allocations are stable, bounded by opening collateral and independent of order arrival',()=>{
 let f=N.advance(fixture(),1),orders=[instruction('b','long',60000),instruction('a','short',60000)];
 const out=N.subscribe(f,orders,400);assert.deepEqual(copy(out),copy(N.subscribe(f,orders.slice().reverse(),400)));assert.equal(out.book.issued,80000);assert.equal(out.clients[0].cash,60000);
 assert.equal(N.room(out.dealer),0,'Subscription cash cannot increase that issue allowance');
 f=N.advance(fixture(100000),1);const empty=N.subscribe(f,[],400);assert.throws(()=>N.subscribe(empty,[],400),/already cleared/);
});

test('malformed products, duplicates, forged obligations and unsupported versions are rejected without repair',()=>{
 const f=N.advance(fixture(),1),before=JSON.stringify(f);
 for(const orders of [[instruction('foreign','short',100)],[instruction('a','unknown',100)],[instruction('a','short',101)],[instruction('a','short',100100)],[instruction('a','short',100),instruction('a','long',100)]])assert.throws(()=>N.subscribe(f,orders,400));
 assert.equal(JSON.stringify(f),before);const live=N.subscribe(f,[instruction('a','short',1000)],400);
 for(const mutate of [x=>x.book.version=2,x=>x.book.positions[0].principal++,x=>x.book.positions[0].matures++,x=>x.book.positions.push(copy(x.book.positions[0])),x=>x.book.interestAccrued++]){const bad=copy(live);mutate(bad);assert.throws(()=>N.validate(bad.book,bad.clients,bad.dealer));}
});

test('480-month repeated subscriptions and maturities conserve cash and bound active positions',()=>{
 let f=fixture(),initial=cash(f),largest=0;
 for(let month=1;month<=480;month++){
  f=N.advance(copy(f),month);
  const orders=f.clients.filter(c=>c.cash>=1000).map((c,i)=>instruction(c.id,(month+i)%2?'short':'long',1000));
  f=N.subscribe(f,orders,month%36<18?400:700);N.validate(f.book,f.clients,f.dealer);assert.equal(cash(f),initial);largest=Math.max(largest,f.book.positions.length);
 }
 assert(largest<=30);assert(f.book.principalPaid>100000);assert(f.book.interestPaid>0);assert(f.book.sequence>100);assert(f.book.report.length<=32);
});
