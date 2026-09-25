'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{test}=require('node:test');
const ctx={},copy=x=>JSON.parse(JSON.stringify(x)),root=path.resolve(__dirname,'..');
vm.runInNewContext(['accounting','group-accounting','investment-cash-routes'].map(f=>fs.readFileSync(path.join(root,'src/engine/'+f+'.js'),'utf8')).join('\n')+'\nthis.R=InvestmentCashRoutes;this.A=AccountingPrototype;this.G=GroupAccounting;',ctx);
const {R,A,G}=ctx;
function fixture(){
 const banks=['bank:a','bank:b'].map(id=>({id,book:A.opening(4),work:10})),clients=[];
 // Identified customers move existing bank deposits into account cash. This
 // fixture does not declare an actual campaign permission or create cash.
 for(const b of banks)for(let n=0;n<2;n++){b.book=A.post(b.book,'fixture.customerWithdrawal',{cash:-10000,deposits:-10000});clients.push({id:b.id+':client:'+n,owner:b.id,cash:10000});}
 // Existing outside shareholder capital and securities are explicit fixture
 // endowments, not a recurring subsidy or a campaign initialization policy.
 const dealer=G.post(G.opening('investment:dealer'),'fixture.existingDealer','outside-shareholder',{cash:50000,businessAssets:100000,equity:150000});
 return {book:R.opening(clients),clients,banks,market:{dealer,units:1000,price:100}};
}
const cash=w=>w.clients.reduce((n,c)=>n+c.cash,0)+w.banks.reduce((n,b)=>n+b.book.accounts.cash,0)+w.book.external.accounts.cash+w.book.fund.book.accounts.cash+w.market.dealer.accounts.cash;
const units=w=>w.market.units+w.book.fund.securities;
function advance(w,orders=[]){const before=JSON.stringify(w),n=R.step(w,orders,w.book.month+1);assert.equal(JSON.stringify(w),before);assert.equal(cash(n),cash(w));assert.equal(units(n),units(w));R.validate(n.book,n.clients,n.banks,n.market);return n;}
const instructions=(w,mode,buffer=1000)=>w.clients.map(c=>({owner:c.owner,clientId:c.id,mode,buffer}));
const holdings=w=>w.clients.reduce((n,c)=>n+c.cash+R.value(w.book,c.id,w.market.price),0);
test('fee cash reservation is temporary, paid from claims and cannot rewrite consent',()=>{
 const a=fixture(),orders=instructions(a,'external',0),fees=a.clients.map(c=>({clientId:c.id,amount:75}));
 const b=R.step(a,orders,1,fees);assert(b.clients.every(c=>c.cash===75));assert(b.book.accounts.every(r=>r.buffer===0));
 R.validateHoldings(b.book,b.clients,b.banks.map(b=>b.id),b.market);
 const wrong=copy(b);wrong.banks[0].book=A.post(wrong.banks[0].book,'fixture.unrelatedWithdrawal',{cash:-wrong.banks[0].book.accounts.cash,deposits:-wrong.banks[0].book.accounts.cash});
 // Holdings-only checks cannot attest a bank ledger: full validation must still
 // reject a forged affiliated claim against insufficient real bank deposits.
 const affiliated=advance(a,instructions(a,'affiliated',0));affiliated.banks[0].book=fixture().banks[0].book;affiliated.banks[0].book=A.post(affiliated.banks[0].book,'fixture.withdrawAll',{cash:0,deposits:-affiliated.banks[0].book.accounts.deposits,equity:affiliated.banks[0].book.accounts.deposits});
 assert.throws(()=>R.validate(affiliated.book,affiliated.clients,affiliated.banks,affiliated.market),/claims/);
 assert.throws(()=>R.step(a,orders,1,[fees[0],fees[0]]),/fee cash/);
});

test('affiliated and external cash placements are matched deposits, never institutional income',()=>{
 for(const mode of ['affiliated','external']){
  const a=fixture(),b=advance(a,instructions(a,mode));assert.equal(holdings(b),holdings(a));
  assert.equal(b.clients.reduce((n,c)=>n+c.cash,0),4000);assert.equal(b.book.received,36000);
  for(const bank of b.banks){const old=a.banks.find(p=>p.id===bank.id);assert.equal(bank.book.accounts.equity,old.book.accounts.equity);assert.equal(bank.book.accounts.deposits-old.book.accounts.deposits,mode==='affiliated'?18000:0);}
  assert.equal(b.book.external.accounts.deposits,mode==='external'?36000:0);
  const restored=advance(b,instructions(b,'hold'));assert.equal(restored.book.returned,36000);assert.equal(holdings(restored),40000);assert(restored.book.accounts.every(r=>!r.deposit&&r.bankId===null));
 }
});
test('money-market shares own paid-for inventory and redeem actual dealer cash without duplication',()=>{
 const a=fixture(),b=advance(a,instructions(a,'moneyMarket'));
 assert.equal(b.book.fund.shares,36000);assert(b.book.fund.securities>0);assert.equal(b.book.fund.book.accounts.cash,3600);
 assert.equal(holdings(b),holdings(a));assert.equal(b.book.external.accounts.deposits,0);
 const r=advance(b,instructions(b,'hold'));assert.equal(r.book.fund.shares,0);assert.equal(r.book.fund.securities,0);assert.equal(r.book.fund.book.accounts.cash,0);assert.equal(holdings(r),40000);
});
test('qualified residual work is finite and existing placements have priority',()=>{
 const a=fixture();a.banks.forEach(b=>b.work=0);const n=advance(a,instructions(a,'external'));
 assert.equal(n.book.received,0);assert(n.book.report.every(r=>r.blocked&&r.reason==='capacity'&&!r.work));
 n.banks.forEach(b=>b.work=1);const b=advance(n);assert.equal(b.book.received,18000);assert.equal(b.book.report.reduce((n,r)=>n+r.work,0),2);
 const c=advance(b,instructions(b,'hold'));assert.equal(c.book.returned,18000);assert.equal(c.book.report.reduce((n,r)=>n+r.work,0),2);
});
test('illiquid banks share limited withdrawals proportionally and preserve unredeemed claims',()=>{
 let w=fixture();w=advance(w,instructions(w,'affiliated',0));
 for(const b of w.banks)b.book=A.post(b.book,'fixture.bankAssetAllocation',{cash:500-b.book.accounts.cash,securities:b.book.accounts.cash-500});
 const a=advance(w,instructions(w,'hold',0)),b=advance(w,instructions(w,'hold',0).reverse());assert.deepEqual(copy(a),copy(b));
 assert.equal(a.book.returned,1000);assert(a.clients.every(c=>c.cash===250));assert(a.book.accounts.every(r=>r.deposit===9750));assert(a.book.report.every(r=>r.blocked&&r.reason==='liquidity'));
});
test('fund liquidity shortages retain shares instead of inventing redemptions',()=>{
 let w=fixture();w=advance(w,instructions(w,'moneyMarket',0));
 w.market.dealer=G.post(w.market.dealer,'fixture.dealerDistribution','outside-shareholder',{cash:-w.market.dealer.accounts.cash,equity:-w.market.dealer.accounts.cash});
 const n=advance(w,instructions(w,'hold',0));assert.equal(n.book.returned,4000);assert.equal(n.book.fund.shares,36000);assert(n.book.report.every(r=>r.blocked));assert.equal(n.book.fund.securities,360);
});
test('mark-to-market changes claims, not cash; losses and funded gains survive redemption',()=>{
 for(const price of [80,120]){
  const a=fixture(),invested=advance(a,instructions(a,'moneyMarket',0));
  const marked=R.reprice(invested,price);assert.equal(cash(marked),cash(invested));assert.equal(units(marked),units(invested));
  assert.equal(holdings(marked)-holdings(invested),invested.book.fund.securities*(price-100));
  const out=advance(marked,instructions(marked,'hold',0));assert.equal(out.book.fund.shares,0);assert.equal(holdings(out),holdings(marked));
 }
});
test('foreign orders, malformed claims and duplicate months fail without changing inputs',()=>{
 const a=fixture(),before=JSON.stringify(a);
 for(const orders of [[{owner:'bank:b',clientId:a.clients[0].id,mode:'external',buffer:0}],instructions(a,'unknown'),[instructions(a,'hold')[0],instructions(a,'hold')[0]]])assert.throws(()=>R.step(a,orders,1));
 const b=advance(a,instructions(a,'moneyMarket'));assert.throws(()=>R.step(b,[],b.book.month));
 for(const mutate of [x=>x.book.accounts[0].shares++,x=>x.book.received++,x=>x.book.external.accounts.deposits++,x=>x.book.accounts[0].bankId='foreign',x=>x.banks[0].work=-1]){const bad=copy(b);mutate(bad);assert.throws(()=>R.validate(bad.book,bad.clients,bad.banks,bad.market));}
 assert.equal(JSON.stringify(a),before);
});
test('provider loss preserves assets and winning advice does not silently win the bank deposits',()=>{
 let w=fixture();w=advance(w,instructions(w,'affiliated',0));
 const id=w.clients[0].id;w.clients[0].owner=null;const held=advance(w);assert.equal(R.value(held.book,id,100),10000);assert.equal(held.book.accounts[0].bankId,'bank:a');
 held.clients[0].owner='bank:b';const acquired=advance(held);assert.equal(acquired.book.accounts[0].bankId,'bank:a');assert.equal(acquired.book.report[0].placed,0);
 const chosen=advance(acquired,[{owner:'bank:b',clientId:id,mode:'affiliated',buffer:0}]);assert.equal(chosen.book.accounts[0].bankId,'bank:b');assert.equal(chosen.book.report[0].placed,10000);assert.equal(R.value(chosen.book,id,100),10000);
});
test('120 monthly switches retain every dollar and security with all three routes active',()=>{
 let w=fixture();const originalCash=cash(w),originalUnits=units(w),originalHoldings=holdings(w);
 for(let month=1;month<=120;month++){
  const modes=['hold','affiliated','external','moneyMarket'];
  const orders=w.clients.map((c,i)=>({owner:c.owner,clientId:c.id,mode:modes[(month+i)%4],buffer:300+(month%5)*100}));
  const forward=advance(w,orders),reverse=advance(w,orders.slice().reverse());assert.deepEqual(copy(forward),copy(reverse));w=forward;
  assert.equal(cash(w),originalCash);assert.equal(units(w),originalUnits);assert.equal(holdings(w),originalHoldings);
 }
});
