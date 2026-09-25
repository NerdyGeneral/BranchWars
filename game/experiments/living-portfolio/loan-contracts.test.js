'use strict';
const assert=require('node:assert/strict');
const Loan=require('./loan-contracts');
const copy=x=>JSON.parse(JSON.stringify(x));
let cases=0;
function test(name,fn){fn();cases++;console.log('PASS '+name);}
function bank(id){return{id,cash:2000000,reserve:500000,capital:1000000,minimumCapitalRatioBps:1000,riskWeightedAssets:0,originationLimit:1000000,creditWork:10,contractSlots:10000,sectorLimits:{general:2000000},sectorExposure:{general:0},deployments:Object.keys(Loan.catalog).map(product=>({product,market:'downtown',channel:'physical',status:'active'}))};}
function fixture(product='installment',amount=200000){
  const p=Loan.catalog[product];
  return {version:1,month:1,banks:[bank('a'),bank('b')],borrowers:[{id:'borrower',market:'downtown',segment:p.segment,sector:'general',cash:50000,existingDebt:0,existingUndrawn:0,borrowingLimit:2000000,
    collateral:p.maxLtvBps?[{id:'property',value:1000000,pledgedValue:0}]:[]}],applications:[{id:'application',borrowerId:'borrower',product,amount,maxAnnualRateBps:2000,minTermMonths:p.terms[0],collateralId:p.maxLtvBps?'property':null,initialDrawBps:p.repayment==='revolving'?5000:10000,channel:'physical'}]};
}
function offer(s,bankId='a',extra={}){return{bankId,applicationId:s.applications[0].id,amount:s.applications[0].amount,terms:{annualRateBps:1000,feeBps:100,termMonths:Loan.catalog[s.applications[0].product].terms[0],underwriting:'balanced'},...extra};}
function audit(s,r){
  const totals=new Map(s.banks.map(b=>[b.id,{cash:0,loans:0,equity:0,commitment:0,work:0,rwa:0}]));
  for(const p of r.postings){
    assert.equal(p.bank.cash+p.borrower.cash,0,'paired cash');assert.equal(p.bank.loans,p.borrower.debt,'paired principal');
    assert.equal(p.bank.cash+p.bank.loans,p.bank.equity,'bank entry balances');assert.equal(p.bank.earnings,p.fee);
    const t=totals.get(p.bankId);for(const k of ['cash','loans','equity'])t[k]+=p.bank[k];t.commitment+=p.commitment;t.work+=p.creditWork;t.rwa+=p.riskWeightedAssets;
  }
  for(const b of s.banks){const t=totals.get(b.id);assert(t.commitment<=Math.max(0,b.cash-b.reserve));assert(t.commitment<=b.originationLimit);assert(t.work<=b.creditWork);
    assert(t.rwa<=Math.max(0,Math.floor(Math.max(0,b.capital)*10000/b.minimumCapitalRatioBps)-b.riskWeightedAssets));assert(b.cash+t.cash>=b.reserve||!t.commitment);}
  for(const a of s.applications){const cs=r.contracts.filter(c=>c.applicationId===a.id);assert(cs.reduce((n,c)=>n+c.commitment,0)<=a.amount);}
  for(const borrower of s.borrowers){
    const cs=r.contracts.filter(c=>c.borrowerId===borrower.id);assert(cs.reduce((n,c)=>n+c.commitment,0)<=Math.max(0,borrower.borrowingLimit-borrower.existingDebt-borrower.existingUndrawn));
    for(const collateral of borrower.collateral){const held=cs.filter(c=>c.collateral?.id===collateral.id).reduce((n,c)=>n+c.collateral.pledgedValue,0);assert(held+collateral.pledgedValue<=collateral.value);}
  }
  for(const c of r.contracts){Loan.validateContract(c);assert.equal(c.principal+c.undrawn,c.commitment);assert.equal(c.principal,c.originalPrincipal);assert.equal(c.commitment,c.originalCommitment);}
}
test('seven distinct funded offers retain original terms and paired postings',()=>{
  assert.equal(Object.keys(Loan.catalog).length,7);
  for(const product of Object.keys(Loan.catalog)){
    const s=fixture(product),o=offer(s),before=JSON.stringify({s,o}),r=Loan.clearOriginations(s,[o]);audit(s,r);
    assert.equal(r.contracts.length,1);assert.equal(r.contracts[0].offerProduct,product);assert.equal(r.contracts[0].product,Loan.catalog[product].family);
    assert.equal(JSON.stringify({s,o}),before,'pure forecast');
    o.terms.annualRateBps=1700;o.terms.underwriting='growth';assert.equal(r.contracts[0].originalTerms.annualRateBps,1000);assert.equal(r.contracts[0].originalTerms.underwriting,'balanced');
  }
});
test('equal-price fills are seat/input-order independent with rotating odd dollar',()=>{
  const s=fixture('installment',200001),offers=[offer(s,'a'),offer(s,'b')],r=Loan.clearOriginations(s,offers);audit(s,r);
  const reversed=copy(s);reversed.banks.reverse();assert.deepEqual(Loan.clearOriginations(reversed,offers.slice().reverse()),r);
  assert.equal(r.contracts.find(c=>c.bankId==='a').commitment,100001);
  s.month=2;const next=Loan.clearOriginations(s,offers);assert.equal(next.contracts.find(c=>c.bankId==='b').commitment,100001);
});
test('customer price preference uses fee and rate; lower price fills first',()=>{
  const s=fixture(),a=offer(s,'a'),b=offer(s,'b');a.terms.feeBps=500;b.terms.feeBps=0;
  const r=Loan.clearOriginations(s,[a,b]);assert.equal(r.contracts.length,1);assert.equal(r.contracts[0].bankId,'b');audit(s,r);
});
test('simultaneous applications share funding, capital, staff and concentration',()=>{
  const s=fixture('installment',800000);s.applications.push({...s.applications[0],id:'second'});
  s.banks[0].cash=950000;s.banks[0].creditWork=1;s.banks[0].sectorLimits.general=400000;
  s.banks[1].capital=10000;s.banks[1].riskWeightedAssets=10000;
  const offers=s.applications.flatMap(a=>s.banks.map(b=>({...offer(s,b.id),applicationId:a.id})));
  const r=Loan.clearOriginations(s,offers);audit(s,r);
  assert.equal(r.banks.find(b=>b.id==='a').committed,250000);assert.equal(r.banks.find(b=>b.id==='b').committed,90000);
  const rev=copy(s);rev.applications.reverse();rev.borrowers.reverse();rev.banks.reverse();assert.deepEqual(Loan.clearOriginations(rev,offers.reverse()),r);
});
test('zero work, insolvent capital and retained excess exposures block new lending',()=>{
  for(const change of [b=>b.creditWork=0,b=>b.capital=-1,b=>b.sectorExposure.general=3000000,b=>b.reserve=b.cash]){
    const s=fixture();change(s.banks[0]);assert.equal(Loan.clearOriginations(s,[offer(s)]).contracts.length,0);
  }
});
test('borrower ceiling shared across applications; no new customers',()=>{
  const s=fixture();s.borrowers[0].existingDebt=1950000;s.applications.push({...s.applications[0],id:'second'});
  const offers=s.applications.map(a=>({...offer(s),applicationId:a.id})),r=Loan.clearOriginations(s,offers);audit(s,r);
  assert.equal(r.contracts.reduce((n,c)=>n+c.principal,0),50000);assert.equal(new Set(r.contracts.map(c=>c.borrowerId)).size,1);
});
test('collateral cannot be reused by rival banks, including indivisible rounding',()=>{
  for(const value of [1,2,3,4,7,101,250001]){
    const s=fixture('auto',200000);s.borrowers[0].collateral[0].value=value;
    audit(s,Loan.clearOriginations(s,[offer(s,'a'),offer(s,'b')]));
  }
  const s=fixture('auto',800000);s.borrowers[0].collateral[0].pledgedValue=900000;
  const r=Loan.clearOriginations(s,[offer(s,'a'),offer(s,'b')]);audit(s,r);assert.equal(r.contracts.reduce((n,c)=>n+c.commitment,0),80000);
});
test('undrawn lines reserve gross funding and capital but create no cash or asset',()=>{
  const s=fixture('businessLine',400000);s.applications[0].initialDrawBps=0;
  const r=Loan.clearOriginations(s,[offer(s)]);audit(s,r);assert.equal(r.contracts[0].principal,0);assert.equal(r.contracts[0].undrawn,400000);
  assert.equal(r.postings[0].bank.cash,0);assert.equal(r.postings[0].bank.loans,0);assert.equal(r.postings[0].fee,0);assert.equal(r.banks[0].committed,400000);
});
test('existing undrawn obligations remain part of borrower eligibility',()=>{
  const s=fixture();s.borrowers[0].existingUndrawn=2000000;assert.equal(Loan.clearOriginations(s,[offer(s)]).contracts.length,0);
});
test('fees are paid by borrowers and cannot finance more same-month lending',()=>{
  const s=fixture('installment',1000000);s.banks[0].cash=1500000;
  s.applications.push({...s.applications[0],id:'second'});const offers=s.applications.map(a=>({...offer(s),applicationId:a.id}));offers.forEach(o=>o.terms.feeBps=500);
  const r=Loan.clearOriginations(s,offers);audit(s,r);assert.equal(r.banks[0].committed,1000000);assert.equal(r.postings.reduce((n,p)=>n+p.fee,0),50000);
});
test('customer rate and minimum term preferences are real eligibility limits',()=>{
  const s=fixture();s.applications[0].maxAnnualRateBps=900;assert.equal(Loan.clearOriginations(s,[offer(s)]).contracts.length,0);
  s.applications[0].maxAnnualRateBps=2000;s.applications[0].minTermMonths=36;assert.equal(Loan.clearOriginations(s,[offer(s)]).contracts.length,0);
});
test('product retirement and absent market/channel deployment stop new production only',()=>{
  for(const change of [b=>b.deployments=[],b=>b.deployments.forEach(d=>d.status='retired'),b=>b.deployments.forEach(d=>d.status='paused'),b=>b.deployments.forEach(d=>d.market='other'),b=>b.deployments.forEach(d=>d.channel='digital')]){
    const s=fixture();change(s.banks[0]);assert.equal(Loan.clearOriginations(s,[offer(s)]).contracts.length,0);
  }
  const s=fixture(),old=Loan.clearOriginations(s,[offer(s)]).contracts;s.banks[0].deployments=[];
  const r=Loan.serviceContracts({version:1,month:2,contracts:old,borrowers:[{id:'borrower',cash:1000000,protectedCash:0}],collateral:[]});assert(r.postings[0].principalPaid>0);
});
test('full portfolio never drops old contracts or creates beyond supplied slots',()=>{
  const s=fixture();s.banks[0].contractSlots=0;assert.equal(Loan.clearOriginations(s,[offer(s)]).contracts.length,0);
  s.banks[0].contractSlots=1;s.applications.push({...s.applications[0],id:'second'});
  const r=Loan.clearOriginations(s,s.applications.map(a=>({...offer(s),applicationId:a.id})));assert.equal(r.contracts.length,1);assert.equal(r.banks[0].remainingContractSlots,0);
});
test('colon-containing bank/application identities cannot alias a funded contract',()=>{
  const s=fixture();s.banks[0].id='y:z';s.banks[1].id='z';s.applications[0].id='x';s.applications.push({...s.applications[0],id:'x:y'});
  const offers=[offer(s,'y:z'),{...offer(s,'z'),applicationId:'x:y'}],r=Loan.clearOriginations(s,offers);audit(s,r);
  assert.equal(new Set(r.contracts.map(c=>c.id)).size,2);
  Loan.serviceContracts({version:1,month:2,contracts:r.contracts,borrowers:[{id:'borrower',cash:1000000,protectedCash:0}],collateral:[]});
});
test('underwater existing collateral remains valid but cannot secure additional lending',()=>{
  const s=fixture('auto');s.borrowers[0].collateral[0].value=100000;s.borrowers[0].collateral[0].pledgedValue=200000;
  const r=Loan.clearOriginations(s,[offer(s)]);assert.equal(r.contracts.length,0);assert.equal(r.decisions[0].unfilled,s.applications[0].amount);
});
test('malformed, duplicate, unsupported and overflow inputs reject without repair',()=>{
  const invalid=[s=>s.version=2,s=>s.month=0,s=>s.banks[0].capital=NaN,s=>s.banks[0].cash=Infinity,s=>s.borrowers[0].cash=Number.MAX_SAFE_INTEGER,
    s=>s.banks.push(copy(s.banks[0])),s=>s.applications.push(copy(s.applications[0])),s=>s.applications[0].product='__proto__',s=>s.extra=true,s=>s.banks[0].extra=true];
  for(const mutate of invalid){const s=fixture(),o=offer(s);mutate(s);assert.throws(()=>Loan.clearOriginations(s,[o]));}
  const s=fixture();assert.throws(()=>Loan.clearOriginations(s,[offer(s),offer(s)]));
  assert.throws(()=>Loan.terms('mortgage',{annualRateBps:1000,feeBps:0,termMonths:999,underwriting:'balanced'}));
});
test('one-dollar capital headroom respects each product risk weight without fee-funded capacity',()=>{
  for(const product of Object.keys(Loan.catalog)){
    const s=fixture(product,1000000),b=s.banks[0],weight=Loan.catalog[product].riskWeightBps;
    b.capital=101;b.minimumCapitalRatioBps=1300;b.riskWeightedAssets=775;
    const before=JSON.stringify(s),o=offer(s);o.terms.feeBps=500;
    const result=Loan.clearOriginations(s,[o]),headroom=Number(BigInt(b.capital)*10000n/BigInt(b.minimumCapitalRatioBps))-b.riskWeightedAssets;
    assert.equal(headroom,1);assert.equal(result.decisions[0].committed,Math.floor(10000/weight));audit(s,result);
    assert.equal(JSON.stringify(s),before);
    // Even a positive contractual fee is not equity until a funded advance.
    // An opening bank already at its risk ceiling cannot bootstrap origination.
    b.riskWeightedAssets=776;const blocked=Loan.clearOriginations(s,[o]);
    assert.equal(blocked.contracts.length,0);assert.equal(blocked.postings.length,0);
    assert.equal(blocked.banks[0].remainingCreditWork,b.creditWork);
  }
});

test('bounded seeded combination sweep preserves flows and input-order equality',()=>{
  let seed=89123;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  for(let i=0;i<600;i++){
    const product=Object.keys(Loan.catalog)[random(7)],s=fixture(product,1+random(1500000));s.month=1+random(480);
    s.banks.forEach(b=>{b.creditWork=random(11);b.originationLimit=random(1200000);b.cash=b.reserve+random(1500000);b.capital=random(150000);b.sectorLimits.general=random(900000);});
    s.borrowers[0].borrowingLimit=random(2000000);if(s.borrowers[0].collateral.length)s.borrowers[0].collateral[0].value=random(1000000);
    const offers=[offer(s,'a'),offer(s,'b')];offers.forEach(o=>{o.terms.annualRateBps=500+random(1800);o.terms.feeBps=random(501);});
    const r=Loan.clearOriginations(s,offers);audit(s,r);const reversed=copy(s);reversed.banks.reverse();assert.deepEqual(Loan.clearOriginations(reversed,offers.reverse()),r);
  }
});
console.log(JSON.stringify({passed:true,cases,combinationCases:600,scope:'isolated contract/origination candidate; no integrated gameplay or balance claim'}));
