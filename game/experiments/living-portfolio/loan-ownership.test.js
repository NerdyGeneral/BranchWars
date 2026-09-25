'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({});for(const file of ['accounting','group-accounting'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/engine/'+file+'.js'),'utf8'),context);
const {A,G}=vm.runInContext('({A:AccountingPrototype,G:GroupAccounting})',context);
const B=require('./bank-accounting-v4')({legacy:A,GroupAccounting:G}),L=require('./loan-contracts'),O=require('./loan-ownership')({accounting:B,loans:L});
const clone=x=>JSON.parse(JSON.stringify(x));let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function fixture(product='commercial',amount=100000,originator='a'){
  // Explicit bank opening-rule fixture. Each borrower dollar comes from an
  // actual posted bank advance, not a cash adjustment to force a purchase.
  const institutions=['a','b'].map(id=>({id,book:B.opening(4),legacyPrincipal:9500000,otherReceivables:0,protectedCash:0}));
  const snapshot={version:1,month:1,banks:institutions.map(b=>({id:b.id,cash:b.book.accounts.cash,reserve:500000,capital:b.book.accounts.equity,minimumCapitalRatioBps:1000,riskWeightedAssets:12280000,originationLimit:1000000,creditWork:10,contractSlots:10000,sectorLimits:{general:2000000},sectorExposure:{general:0},deployments:[{product,market:'market',channel:'physical',status:'active'}]})),borrowers:[{id:'borrower',market:'market',segment:L.catalog[product].segment,sector:'general',cash:0,existingDebt:0,existingUndrawn:0,borrowingLimit:2000000,collateral:[]}],applications:[{id:'application',borrowerId:'borrower',product,amount,maxAnnualRateBps:2000,minTermMonths:L.catalog[product].terms[0],collateralId:null,initialDrawBps:product==='businessLine'?5000:10000,channel:'physical'}]};
  const result=L.clearOriginations(snapshot,[{bankId:originator,applicationId:'application',amount,terms:{annualRateBps:1000,feeBps:0,termMonths:L.catalog[product].terms[0],underwriting:'balanced'}}]);
  let borrower=G.opening('borrower');for(const p of result.postings){const bank=institutions.find(b=>b.id===p.bankId),{earnings,...changes}=p.bank;bank.book=B.post(bank.book,'fixture.actualLoan',changes,earnings);borrower=G.post(borrower,'fixture.actualLoan',p.bankId,{cash:p.borrower.cash,debt:p.borrower.debt,equity:-p.fee},-p.fee);}
  return {institutions,contracts:result.contracts,borrower,collateral:[]};
}
function purchase(f,price){return {...f,...O.transfer({contracts:f.contracts,institutions:f.institutions,trades:[{contractId:f.contracts[0].id,sellerId:'a',buyerId:'b',price}]})};}
function cash(f){return f.institutions.reduce((n,b)=>n+b.book.accounts.cash,f.borrower.accounts.cash);}
function service(f){
  const result=L.serviceContracts({version:1,month:f.contracts[0].servicing.lastMonth+1,contracts:f.contracts,collateral:f.collateral,borrowers:[{id:'borrower',cash:f.borrower.accounts.cash,protectedCash:0}]});
  f=clone(f);for(const p of result.postings){const bank=f.institutions.find(b=>b.id===p.bankId),{earnings,...changes}=p.bank;bank.book=B.post(bank.book,'fixture.actualService',changes,earnings);f.borrower=G.post(f.borrower,'fixture.actualService',p.bankId,{cash:p.borrower.cash,debt:p.borrower.debt,payables:p.borrower.interestPayable,equity:-p.borrower.interestExpense},-p.borrower.interestExpense);}
  f.contracts=result.contracts;f.collateral=result.collateral;return f;
}
test('funded canonical purchase changes only holder/basis and preserves immutable origination',()=>{
  for(const price of [90000,100000,110000]){
    const f=fixture(),before=JSON.stringify(f),r=purchase(f,price);assert.equal(JSON.stringify(f),before);assert.equal(cash(r),cash(f));
    const expected=clone(f.contracts[0]);expected.bankId='b';expected.basisAdjustment=price-100000;assert.deepEqual(r.contracts[0],expected);
    assert.equal(r.contracts[0].originatorBankId,'a');assert.equal(r.contracts[0].id,f.contracts[0].id);assert.equal(r.institutions.find(b=>b.id==='b').book.retainedEarnings,0);
    assert(r.institutions.every(b=>!Object.hasOwn(b,'positions')),'no shadow positions returned or stored');L.validateContract(r.contracts[0]);
  }
});
test('servicing pays new holder and releases its basis against actual repayment',()=>{
  const f=purchase(fixture(),90000),r=service(f);assert.equal(cash(r),cash(f));
  assert.equal(r.institutions.find(b=>b.id==='a').book.accounts.cash,f.institutions.find(b=>b.id==='a').book.accounts.cash);
  assert(r.institutions.find(b=>b.id==='b').book.accounts.cash>f.institutions.find(b=>b.id==='b').book.accounts.cash);
  assert(r.contracts[0].basisAdjustment>-10000);assert.equal(r.institutions.find(b=>b.id==='b').book.accounts.loanBasisAdjustment,r.contracts[0].basisAdjustment);
  O.transfer({contracts:r.contracts,institutions:r.institutions,trades:[]});
});
test('resale preserves original IDs and realizes only remaining carrying-value difference',()=>{
  const f=service(purchase(fixture(),90000)),c=f.contracts[0],price=c.principal+c.servicing.interestDue-5000;
  const r=O.transfer({contracts:f.contracts,institutions:f.institutions,trades:[{contractId:c.id,sellerId:'b',buyerId:'a',price}]});
  assert.equal(r.contracts[0].id,c.id);assert.equal(r.contracts[0].originatorBankId,'a');assert.equal(r.contracts[0].bankId,'a');assert.equal(r.contracts[0].basisAdjustment,-5000);
  assert.equal(r.postings[0].seller.earnings,-5000-c.basisAdjustment);assert.deepEqual(r.contracts[0].servicing,c.servicing);
});
test('duplicate loans, wrong sellers, mutable originators and phantom bank books are rejected atomically',()=>{
  const f=fixture(),base={contracts:f.contracts,institutions:f.institutions,trades:[{contractId:f.contracts[0].id,sellerId:'a',buyerId:'b',price:90000}]};
  for(const mutate of [x=>x.contracts.push(clone(x.contracts[0])),x=>x.trades.push(clone(x.trades[0])),x=>x.trades[0].sellerId='b',x=>x.contracts[0].originatorBankId='b',x=>x.institutions[0].legacyPrincipal--,x=>x.institutions[0].positions=[]]){
    const bad=clone(base);mutate(bad);const before=clone(bad);assert.throws(()=>O.transfer(bad));assert.deepEqual(bad,before);
  }
});
test('revolving purchases inherit undrawn obligations and reserve opening liquidity',()=>{
  const f=fixture('businessLine',100000),buyer=f.institutions.find(b=>b.id==='b');
  buyer.book=B.post(buyer.book,'fixture.reserveCash',{cash:60000-buyer.book.accounts.cash,securities:buyer.book.accounts.cash-60000});
  assert.equal(f.contracts[0].principal,50000);assert.equal(f.contracts[0].undrawn,50000);
  assert.throws(()=>purchase(f,45000),/opening liquidity/);
  buyer.book=B.post(buyer.book,'fixture.releaseSecurities',{cash:40000,securities:-40000});
  const r=purchase(f,45000);assert.equal(r.contracts[0].undrawn,50000);assert.equal(r.contracts[0].commitment,100000);assert.equal(cash(r),cash(f));
});
test('explicit protected cash is preserved, exact boundary succeeds and a one-dollar shortfall refuses',()=>{
  const zero=fixture(),z=purchase(zero,90000);assert.equal(z.institutions.find(b=>b.id==='b').protectedCash,0);
  const exact=fixture(),buyer=exact.institutions.find(b=>b.id==='b');buyer.protectedCash=buyer.book.accounts.cash-90000;
  const before=JSON.stringify(exact),result=purchase(exact,90000);assert.equal(JSON.stringify(exact),before);
  const acquired=result.institutions.find(b=>b.id==='b');assert.equal(acquired.book.accounts.cash,acquired.protectedCash);assert.equal(acquired.protectedCash,buyer.protectedCash);
  assert(!Object.hasOwn(acquired.book,'protectedCash'));assert(!Object.hasOwn(acquired.book.accounts,'protectedCash'));
  for(const reserve of [buyer.protectedCash+1,buyer.book.accounts.cash+1]){
    const f=clone(exact);f.institutions.find(b=>b.id==='b').protectedCash=reserve;const saved=JSON.stringify(f);assert.throws(()=>purchase(f,90000),/protected opening liquidity/);assert.equal(JSON.stringify(f),saved);
  }
});
test('missing and unsafe reserves are rejected rather than defaulted or clamped',()=>{
  for(const value of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,null]){
    const f=fixture();f.institutions[1].protectedCash=value;const before=JSON.stringify(f);assert.throws(()=>purchase(f,90000),/ownership institution/);assert.equal(JSON.stringify(f),before);
  }
  const absent=fixture();delete absent.institutions[1].protectedCash;assert.throws(()=>purchase(absent,90000),/ownership institution/);
});
test('reciprocal sales cannot recycle proceeds or release opening undrawn reservations',()=>{
  const f=fixture('businessLine',100000,'a'),second=fixture('businessLine',100000,'b');
  f.institutions[1]=second.institutions[1];f.contracts.push(second.contracts[0]);
  f.borrower=G.post(f.borrower,'fixture.actualSecondLoan','b',{cash:50000,debt:50000});
  for(const b of f.institutions){const reclass=b.book.accounts.cash-200000;b.book=B.post(b.book,'fixture.cashToSecurities',{cash:-reclass,securities:reclass});b.protectedCash=60000;}
  const trades=f.contracts.map(c=>({contractId:c.id,sellerId:c.bankId,buyerId:c.bankId==='a'?'b':'a',price:50000}));
  const before=JSON.stringify(f);assert.throws(()=>O.transfer({contracts:f.contracts,institutions:f.institutions,trades}),/protected opening liquidity/);assert.equal(JSON.stringify(f),before);
  // At $50K reserve the exact $200K opening envelope covers reserve, own
  // undrawn, inherited undrawn and price. Neither sale can improve that quote.
  for(const b of f.institutions)b.protectedCash=50000;
  const result=O.transfer({contracts:f.contracts,institutions:f.institutions,trades});assert.equal(cash({...f,...result}),cash(f));
  assert(result.institutions.every(b=>b.protectedCash===50000));assert(result.contracts.every(c=>c.bankId!==c.originatorBankId&&c.undrawn===50000));
  assert.deepEqual(O.transfer({contracts:f.contracts.slice().reverse(),institutions:f.institutions.slice().reverse(),trades:trades.slice().reverse()}),result);
  // With no undrawn commitments, prices still cannot spend incoming sale cash.
  const full=fixture(),another=fixture('commercial',100000,'b');full.institutions[1]=another.institutions[1];full.contracts.push(another.contracts[0]);
  full.borrower=G.post(full.borrower,'fixture.actualSecondLoan','b',{cash:100000,debt:100000});
  for(const b of full.institutions){const amount=b.book.accounts.cash-100000;b.book=B.post(b.book,'fixture.cashToSecurities',{cash:-amount,securities:amount});b.protectedCash=1;}
  assert.throws(()=>O.transfer({contracts:full.contracts,institutions:full.institutions,trades:full.contracts.map(c=>({contractId:c.id,sellerId:c.bankId,buyerId:c.bankId==='a'?'b':'a',price:100000}))}),/protected opening liquidity/);
});
console.log(JSON.stringify({checks,scope:'isolated full canonical transfers; no live acquisition or fire-sale claim'}));
