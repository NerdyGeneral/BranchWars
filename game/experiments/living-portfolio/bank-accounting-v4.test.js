'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({});for(const file of ['accounting','group-accounting'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/engine/'+file+'.js'),'utf8'),context);
const {A,G}=vm.runInContext('({A:AccountingPrototype,G:GroupAccounting})',context);
const V=require('./bank-accounting-v4')({legacy:A,GroupAccounting:G});
const clone=x=>JSON.parse(JSON.stringify(x));const equal=(a,b)=>assert.deepEqual(clone(a),clone(b));
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
function bank(id){return {id,book:V.opening(4),legacyPrincipal:9500000,otherReceivables:0,positions:[]};}
function fixture(interest=0){
  // Explicit accounting endowments; the loan itself advances real bank cash to
  // the borrower. This is not an earned-gameplay or production-balance fixture.
  const seller=bank('seller'),buyer=bank('buyer');let borrower=G.opening('borrower');
  seller.book=V.post(seller.book,'fixture.fundedLoan',{cash:-100000,loans:100000});
  borrower=G.post(borrower,'fixture.fundedLoan','seller',{cash:100000,debt:100000});
  if(interest){seller.book=V.post(seller.book,'fixture.interestAccrued',{receivables:interest,equity:interest},interest);borrower=G.post(borrower,'fixture.interestAccrued','seller',{payables:interest,equity:-interest},-interest);}
  seller.positions=[{contractId:'contract',borrowerId:'borrower',principal:100000,recognizedInterest:interest,basisAdjustment:0}];
  V.institution(seller);return {seller,buyer,borrower};
}
function trade(price=100000,interest=0){const f=fixture(interest),result=V.acquireLoansBatch([f.seller,f.buyer],[{contractId:'contract',sellerId:'seller',buyerId:'buyer',price}]);return {...f,...result};}
const totalCash=(banks,borrower)=>banks.reduce((n,b)=>n+b.book.accounts.cash,borrower.accounts.cash);
test('all historical versions delegate exact posts, transactions and persistence',()=>{
  for(const version of [1,2,3]){
    let a=A.opening(version),v=V.opening(version);equal(a,v);
    for(let i=0;i<12;i++){
      a=A.post(a,'legacy.expense',{cash:-100,equity:-100},-100);v=V.post(v,'legacy.expense',{cash:-100,equity:-100},-100);equal(a,v);
      a=A.transact(a,'deposit',1000);v=V.transact(v,'deposit',1000);equal(a,v);equal(A.check(a),V.check(v));
      equal(A.snapshot(a,4),V.snapshot(v,4));equal(A.restore(A.snapshot(a,4)),V.restore(V.snapshot(v,4)));
    }
  }
});
test('new basis only enters a verified explicit opening book',()=>{
  for(const version of [1,2,3]){const old=A.opening(version),before=clone(old),v=V.withLoanBasis(old);equal(old,before);assert.equal(v.accounts.loanBasisAdjustment,0);assert.equal(v.accounts.loans,old.accounts.loans);assert.equal(v.accounts.equity,old.accounts.equity);V.check(v);}
  assert.throws(()=>V.withLoanBasis(A.post(A.opening(3),'spent',{cash:-1,equity:-1},-1)));
  assert.throws(()=>V.withLoanBasis(V.opening(4)));
});
test('par, discount and premium purchases preserve gross claims without buyer windfalls',()=>{
  for(const price of [90000,100000,110000]){
    const f=fixture(),before=clone(f),r=V.acquireLoansBatch([f.seller,f.buyer],[{contractId:'contract',sellerId:'seller',buyerId:'buyer',price}]);equal(f,before);
    const buyer=r.banks.find(b=>b.id==='buyer'),seller=r.banks.find(b=>b.id==='seller');
    assert.equal(buyer.book.accounts.loans,9600000);assert.equal(buyer.book.accounts.loanBasisAdjustment,price-100000);
    assert.equal(buyer.book.retainedEarnings,0);assert.equal(buyer.book.accounts.equity,1800000);
    assert.equal(seller.book.retainedEarnings,price-100000);assert.equal(seller.book.accounts.loanBasisAdjustment,0);
    assert.equal(totalCash(r.banks,f.borrower),totalCash([f.seller,f.buyer],f.borrower));
    equal(r,V.acquireLoansBatch([f.buyer,f.seller],[{contractId:'contract',sellerId:'seller',buyerId:'buyer',price}]));
  }
});
test('recognized interest transfers at par and is not recognized a second time',()=>{
  const r=trade(95000,5000),buyer=r.banks.find(b=>b.id==='buyer');
  assert.equal(buyer.book.accounts.receivables,5000);assert.equal(buyer.book.accounts.loanBasisAdjustment,-10000);assert.equal(buyer.book.retainedEarnings,0);
  const paid=V.repayLoan(buyer,r.borrower,'contract',{principalPaid:0,recognizedInterestPaid:5000});
  assert.equal(paid.bank.book.retainedEarnings,0);assert.equal(paid.bank.book.accounts.receivables,0);assert.equal(paid.bank.book.accounts.loanBasisAdjustment,-10000);
  assert.equal(paid.borrower.retainedEarnings,r.borrower.retainedEarnings);assert.equal(totalCash([paid.bank],paid.borrower),totalCash([buyer],r.borrower));
  const f=fixture(5000);assert.throws(()=>V.acquireLoansBatch([f.seller,f.buyer],[{contractId:'contract',sellerId:'seller',buyerId:'buyer',price:4999}]));
});
test('actual partial principal collection amortizes basis and final payoff clears rounding',()=>{
  for(const price of [89999,100000,110001]){
    let r=trade(price),current=r.banks.find(b=>b.id==='buyer'),borrower=r.borrower;const total=totalCash([current],borrower);
    for(const principalPaid of [33333,33333,33334]){
      const before=current.positions[0],paid=V.repayLoan(current,borrower,'contract',{principalPaid,recognizedInterestPaid:0});
      assert.equal(paid.amortization.basisReleased,principalPaid===before.principal?before.basisAdjustment:Number(BigInt(before.basisAdjustment)*BigInt(principalPaid)/BigInt(before.principal)));
      current=paid.bank;borrower=paid.borrower;assert.equal(totalCash([current],borrower),total);V.institution(current);G.validate(borrower);
    }
    assert.equal(current.positions[0].principal,0);assert.equal(current.book.accounts.loanBasisAdjustment,0);assert.equal(current.book.retainedEarnings,100000-price);assert.equal(borrower.accounts.debt,0);
  }
});
test('resale recognizes only gain/loss relative to prior carrying value',()=>{
  const first=trade(90000),second=V.acquireLoansBatch(first.banks,[{contractId:'contract',sellerId:'buyer',buyerId:'seller',price:95000}]);
  const reseller=second.banks.find(b=>b.id==='buyer'),newBuyer=second.banks.find(b=>b.id==='seller');
  assert.equal(reseller.book.retainedEarnings,5000);assert.equal(reseller.book.accounts.loanBasisAdjustment,0);
  assert.equal(newBuyer.positions[0].basisAdjustment,-5000);assert.equal(newBuyer.book.retainedEarnings,-10000);
});
test('insolvent, insufficient cash and unsafe purchase inputs refuse without mutation',()=>{
  const f=fixture();f.buyer.book=V.post(f.buyer.book,'fixture.cashToSecurities',{cash:-2350000,securities:2350000});const before=clone(f);
  assert.throws(()=>V.acquireLoansBatch([f.seller,f.buyer],[{contractId:'contract',sellerId:'seller',buyerId:'buyer',price:100000}]),/opening cash/);equal(f,before);
  const poor=fixture();poor.buyer.book=V.post(poor.buyer.book,'fixture.fundedLoss',{cash:-1800000,equity:-1800000},-1800000);
  assert.throws(()=>V.acquireLoansBatch([poor.seller,poor.buyer],[{contractId:'contract',sellerId:'seller',buyerId:'buyer',price:100000}]),/Insolvent/);
  for(const price of [-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>trade(price));
  assert.throws(()=>V.acquireLoansBatch([f.seller,f.seller],[]));
  const bad=clone(f.seller);bad.positions[0].principal--;assert.throws(()=>V.institution(bad));
});
test('simultaneous sales cannot fund purchases in the same clearing pass',()=>{
  const f=fixture();const other={contractId:'other',borrowerId:'borrower',principal:100000,recognizedInterest:0,basisAdjustment:0};
  f.buyer.book=V.post(f.buyer.book,'fixture.secondFundedLoan',{cash:-100000,loans:100000});f.buyer.positions.push(other);
  f.borrower=G.post(f.borrower,'fixture.secondFundedLoan','buyer',{cash:100000,debt:100000});
  for(const b of [f.seller,f.buyer]){const amount=b.book.accounts.cash-50000;b.book=V.post(b.book,'fixture.cashToSecurities',{cash:-amount,securities:amount});}
  const orders=[{contractId:'contract',sellerId:'seller',buyerId:'buyer',price:100000},{contractId:'other',sellerId:'buyer',buyerId:'seller',price:100000}];
  assert.throws(()=>V.acquireLoansBatch([f.seller,f.buyer],orders),/opening cash/);
});
test('actual borrower cash and matched liabilities bound repayments',()=>{
  const r=trade(90000),b=r.banks.find(b=>b.id==='buyer'),before=clone({b,borrower:r.borrower});
  assert.throws(()=>V.repayLoan(b,r.borrower,'contract',{principalPaid:100001,recognizedInterestPaid:0}));
  assert.throws(()=>V.repayLoan(b,r.borrower,'contract',{principalPaid:0,recognizedInterestPaid:1}));
  const empty=G.post(r.borrower,'fixture.supplierPayment','supplier',{cash:-100000,equity:-100000},-100000);
  assert.throws(()=>V.repayLoan(b,empty,'contract',{principalPaid:1,recognizedInterestPaid:0}),/not funded/);
  equal({b,borrower:r.borrower},before);assert.equal(V.amortizeBasis(b.positions[0],0).basisReleased,0);
});
test('v4 snapshots replay exact basis histories and reject malformed checkpoints',()=>{
  const r=trade(110001);let b=r.banks.find(b=>b.id==='buyer').book;
  for(let i=0;i<10;i++)b=V.post(b,'fixture.expense',{cash:-1,equity:-1},-1);
  for(const limit of [1,3,256]){const saved=V.snapshot(b,limit),restored=V.restore(saved);V.check(restored);equal(restored.accounts,b.accounts);assert.equal(restored.retainedEarnings,b.retainedEarnings);equal(V.snapshot(restored,limit),saved);}
  const snapshot=V.snapshot(b,3);
  const reordered=clone(snapshot);reordered.closing.accounts=Object.fromEntries(Object.entries(reordered.closing.accounts).reverse());V.restore(reordered);
  for(const mutate of [s=>s.closing.accounts.loanBasisAdjustment++,s=>s.entries[0].id++,s=>s.entries[0].changes.unknown=0,s=>s.checkpoint.accounts.cash=NaN,s=>s.extra=true]){const bad=clone(snapshot);mutate(bad);assert.throws(()=>V.restore(bad));}
  const bad=clone(b);bad.journal[0].earnings++;assert.throws(()=>V.check(bad));
  assert.throws(()=>V.post(b,'unsafe',{loanBasisAdjustment:Number.MAX_SAFE_INTEGER,equity:Number.MAX_SAFE_INTEGER}));
  assert.throws(()=>V.post(b,'negative carrying',{loanBasisAdjustment:-20000000,equity:-20000000},-20000000));
});
test('long journal histories advance exact checkpoints instead of unbounded replay',()=>{
  let b=trade(90000).banks.find(b=>b.id==='buyer').book;
  for(let i=0;i<300;i++)b=V.post(b,'fixture.boundedExpense',{cash:-1,equity:-1},-1);
  assert.equal(b.journal.length,256);assert.equal(b.sequence,301);assert.equal(b.journalBase.sequence,45);assert.equal(b.retainedEarnings,-300);
  const restored=V.restore(V.snapshot(b));equal(restored.accounts,b.accounts);assert.equal(restored.retainedEarnings,b.retainedEarnings);assert.equal(restored.sequence,b.sequence);V.check(restored);
});
console.log(JSON.stringify({checks,legacyExactOperations:72,scope:'isolated paired accounting fixtures; no production upgrade, fees or balance tuning'}));
