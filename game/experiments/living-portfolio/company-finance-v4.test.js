'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context=vm.createContext({});
for(const file of ['accounting','group-accounting','company-finance'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/engine/'+file+'.js'),'utf8'),context);
const {A,G,C}=vm.runInContext('({A:AccountingPrototype,G:GroupAccounting,C:CompanyFinance})',context);
const L=require('./loan-contracts');
const V=require('./company-finance-v4')({AccountingPrototype:A,GroupAccounting:G,legacy:C,loans:L});
const B4=require('./bank-accounting-v4')({legacy:A,GroupAccounting:G});
const V4=require('./company-finance-v4')({AccountingPrototype:B4,GroupAccounting:G,legacy:C,loans:L});
const Ownership=require('./loan-ownership')({accounting:B4,loans:L});
const copy=x=>JSON.parse(JSON.stringify(x));
const equal=(a,b)=>assert.deepEqual(copy(a),copy(b));
const profiles=Array.from({length:6},(_,i)=>({market:'market'+i,baseFee:10000}));
let checks=0,months=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function original(version=2){const w=C.opening(profiles);return version===3?C.withAgency(w):w;}
function fixture(basis=false){
  // Explicit existing-rule opening endowments, not an earned campaign or a grant.
  return {world:V.withLending(original(),['bankA','bankB']),contracts:[],collateral:[],banks:['bankA','bankB'].map(id=>({id,book:basis?B4.opening(4):A.opening(3),legacyPrincipal:9500000,otherReceivables:0}))};
}
const engine=f=>f.banks.some(b=>b.book.version===4)?V4:V;
function seal(f){
  if(f.world.lending.activityMonth!==f.world.month)f=transact(f,[]);
  if(f.world.lending.originatedMonth!==f.world.month){const s=snapshot(f);s.borrowers=[];s.applications=[];f=engine(f).originate(f.world,{contracts:f.contracts,collateral:f.collateral,banks:f.banks,snapshot:s,offers:[]});}
  engine(f).validateSettled(f.world,f.contracts);return f;
}
function step(f,demand=1,services){f=seal(f);const result=engine(f).step(f.world,{demand,...(services?{services}:{})},{contracts:f.contracts,collateral:f.collateral,banks:f.banks});months++;return result;}
function cash(f,extra=[]){return [f.world.outside,f.world.creditor,...f.world.companies.map(c=>c.book),...f.banks.map(b=>b.book),...extra].reduce((n,b)=>n+b.accounts.cash,0);}
function snapshot(f,product='commercial',amount=120000){
  const c=f.world.companies[0];
  return {version:1,month:f.world.month,banks:f.banks.map(b=>({id:b.id,cash:b.book.accounts.cash,reserve:500000,capital:b.book.accounts.equity,minimumCapitalRatioBps:1000,
    riskWeightedAssets:b.legacyPrincipal+Math.ceil(b.book.accounts.securities*.2)+b.book.accounts.receivables+f.contracts.filter(c=>c.bankId===b.id).reduce((n,c)=>n+Math.ceil(c.commitment*c.originalTerms.riskWeightBps/10000),0),
    originationLimit:1000000,creditWork:10,contractSlots:10000-f.contracts.filter(c=>c.bankId===b.id).length,sectorLimits:{general:2000000},sectorExposure:{general:f.contracts.filter(c=>c.bankId===b.id).reduce((n,c)=>n+c.commitment,0)},deployments:[{product,market:c.market,channel:'physical',status:'active'}]})),
    borrowers:[{id:c.id,market:c.market,segment:'company',sector:'general',cash:c.book.accounts.cash,existingDebt:c.book.accounts.debt,existingUndrawn:f.contracts.filter(x=>x.borrowerId===c.id).reduce((n,x)=>n+x.undrawn,0),borrowingLimit:2000000,
      collateral:f.collateral.filter(p=>p.borrowerId===c.id).map(p=>({id:p.id,value:p.value,pledgedValue:p.pledgedValue}))}],
    applications:[{id:'application'+f.world.month,borrowerId:c.id,product,amount,maxAnnualRateBps:2000,minTermMonths:L.catalog[product].terms[0],collateralId:L.catalog[product].maxLtvBps?'property':null,initialDrawBps:10000,channel:'physical'}]};
}
function originate(f,product='commercial',amount=120000){
  if(f.world.lending.activityMonth!==f.world.month)f=transact(f,[]);
  const s=snapshot(f,product,amount),offers=s.banks.map(b=>({bankId:b.id,applicationId:s.applications[0].id,amount,terms:{annualRateBps:1000,feeBps:100,termMonths:L.catalog[product].terms[0],underwriting:'balanced'}}));
  return engine(f).originate(f.world,{contracts:f.contracts,collateral:f.collateral,banks:f.banks,snapshot:s,offers});
}
function transact(f,instructions){return engine(f).transact(f.world,{contracts:f.contracts,collateral:f.collateral,banks:f.banks,instructions,protectedCash:Object.fromEntries([...f.banks.map(b=>b.id),...f.world.companies.map(c=>c.id)].map(id=>[id,0])),creditWork:{bankA:10,bankB:10}});}
function purchase(f,ratio=.9){const c=f.contracts.find(c=>c.bankId==='bankA'),result=Ownership.transfer({contracts:f.contracts,institutions:f.banks.map(b=>({...b,protectedCash:0})),trades:[{contractId:c.id,sellerId:'bankA',buyerId:'bankB',price:Math.round(c.principal*ratio)+c.servicing.interestDue}]});return {...f,contracts:result.contracts,banks:result.institutions.map(({protectedCash,...b})=>b)};}
test('v2/v3 creation and 96 historical monthly settlements remain byte-exact',()=>{
  for(const version of [2,3])for(const demand of [0,.8,1,1.3]){
    let a=original(version),b=copy(a);
    equal(V.opening(profiles),C.opening(profiles));
    for(let i=0;i<12;i++){
      const options={demand,services:profiles.map((p,j)=>({provider:(i+j)%3-1,fee:p.baseFee,served:(i+j)%4!==0}))};
      a=C.step(a,options);b=V.step(b,options);equal(a,b);equal(V.validate(b),C.validate(a));
    }
  }
});
test('only explicit creation enables lending and preserves old opening books',()=>{
  const before=original(),f=fixture();V.validate(f.world,[]);
  equal(f.world.companies.map(c=>c.book),before.companies.map(c=>c.book));
  equal(f.world.creditor,before.creditor);assert.equal(f.world.lending.cashNet[0],0);
  assert.throws(()=>V.withLending(C.step(before,{demand:1}),['bankA','bankB']));
  assert.throws(()=>V.withLending(f.world,['bankA','bankB']));
  assert.throws(()=>V.withLending(before,['bankA','bankA']));
});
test('service, explicit activity and origination seal are mandatory even with no loans',()=>{
  const f=step(fixture()),boundary={contracts:f.contracts,collateral:f.collateral,banks:f.banks},s=snapshot(f);
  V.validate(f.world,[]);assert.throws(()=>V.validateSettled(f.world,[]));
  assert.throws(()=>V.originate(f.world,{...boundary,snapshot:s,offers:[]}));
  assert.throws(()=>V.step(f.world,{demand:1},boundary));
  const activity=transact(f,[]);assert.throws(()=>V.step(activity.world,{demand:1},{contracts:activity.contracts,collateral:activity.collateral,banks:activity.banks}));
  const settled=seal(activity);V.validateSettled(settled.world,[]);assert.equal(step(settled).world.month,2);
  const malformed=copy(settled.world);malformed.companies[0].resolution=false;assert.throws(()=>V.validate(malformed,[]));
});
test('ordinary corporate fees credit actual bank books once',()=>{
  const f=fixture(),before=cash(f),services=profiles.map((p,i)=>({provider:i%2,fee:p.baseFee,served:true})),r=step(f,1,services);
  assert.equal(cash(r),before);for(const b of r.banks){assert.equal(b.book.accounts.cash,2430000);assert.equal(b.book.retainedEarnings,30000);}
  assert.equal(r.world.lending.cashNet[0],0);assert.equal(r.world.bankCashPaid[0],30000);assert.equal(f.world.month,0);
});
test('funded simultaneous corporate loans create only matching principal and paid fee',()=>{
  const f=step(fixture()),before=copy(f),r=originate(f);equal(f,before);
  assert.equal(cash(r),cash(f));assert.equal(r.contracts.length,2);
  assert.equal(r.world.companies[0].book.accounts.debt-f.world.companies[0].book.accounts.debt,120000);
  assert.equal(r.world.companies[0].book.accounts.cash-f.world.companies[0].book.accounts.cash,118800);
  assert.equal(r.world.companies[0].report.loanFee,1200);equal(r.world.creditor,f.world.creditor);
  for(const b of r.banks){assert.equal(b.book.accounts.loans,9560000);assert.equal(b.book.retainedEarnings,600);}
  assert.throws(()=>originate(r));V.validate(r.world,r.contracts);
});
test('cash, debt, bank attribution and property snapshots cannot be invented',()=>{
  const f=transact(step(fixture()),[]),s=snapshot(f),boundary={contracts:[],collateral:[],banks:f.banks,snapshot:s,offers:[]};
  for(const change of [x=>x.snapshot.borrowers[0].cash++,x=>x.snapshot.borrowers[0].existingDebt--,x=>x.snapshot.banks[0].cash++,x=>x.snapshot.banks[0].riskWeightedAssets--,x=>x.banks[0].legacyPrincipal--]){
    const bad=copy(boundary);change(bad);assert.throws(()=>V.originate(f.world,bad));
  }
  const r=originate(f),bad=copy(r.contracts);bad[0].principal++;bad[0].commitment++;assert.throws(()=>V.validate(r.world,bad));
  assert.throws(()=>V.validate(original(),r.contracts));
});
test('mandatory principal and recognized interest pair without external double charging',()=>{
  const f=originate(step(fixture())),before=cash(f),external=f.world.companies[0].externalDebt,r=step(f);
  assert.equal(cash(r),before);assert.equal(r.world.companies[0].report.interest,Math.round(external*.005));
  assert.equal(r.world.companies[0].report.loanInterest,1000);
  assert(r.world.companies[0].report.loanPrincipalPaid>0);
  assert.equal(r.world.companies[0].book.accounts.debt,r.world.companies[0].externalDebt+r.contracts.reduce((n,c)=>n+c.principal,0));
  assert.equal(r.world.lending.flows.reduce((n,f)=>n+f.accruedInterest,0),1000);
});
test('retained loan exposure cannot be erased or relabeled for subsequent origination',()=>{
  const f=transact(step(originate(step(fixture()))),[]),s=snapshot(f),base={contracts:f.contracts,collateral:f.collateral,banks:f.banks,snapshot:s,offers:[]};
  const missing=copy(base);missing.snapshot.banks[0].sectorExposure.general=0;assert.throws(()=>V.originate(f.world,missing));
  const relabel=copy(base);relabel.snapshot.borrowers[0].sector='invented';assert.throws(()=>V.originate(f.world,relabel));
  V.originate(f.world,base);
});
test('optional repayment consumes actual borrower cash after mandatory service only once',()=>{
  const f=step(originate(step(fixture()))),before=cash(f),contract=f.contracts[0],r=transact(f,[{contractId:contract.id,borrowerId:contract.borrowerId,kind:'repay',amount:10000}]);
  assert.equal(cash(r),before);assert.equal(f.world.companies[0].book.accounts.cash-r.world.companies[0].book.accounts.cash,10000);
  assert.equal(contract.principal-r.contracts.find(c=>c.id===contract.id).principal,10000);
  assert.throws(()=>transact(r,[]));V.validate(r.world,r.contracts);
});
test('agency transfers remain a separate signed company boundary and legacy path is exact',()=>{
  const carrier=G.opening('third-party-carrier'),f=originate(step(fixture())),before=cash(f,[carrier]),paid=V.payAgencyPremium(f.world,0,carrier,10000,f.contracts);
  assert.equal(cash({...f,world:paid.world},[paid.carrier]),before);assert.equal(paid.world.agencyCashNet,10000);equal(paid.world.lending,f.world.lending);
  const legacy=C.step(original(3),{demand:1});equal(V.payAgencyPremium(legacy,0,carrier,1000),C.payAgencyPremium(legacy,0,carrier,1000));
});
test('CRE pledges use existing company assets and release only after full payment',()=>{
  let f=step(fixture());f.collateral=[{id:'property',borrowerId:'company:0',value:400000,pledgedValue:0,externalPledgedValue:0}];
  const r=originate(f,'cre'),bad=copy(f);bad.collateral[0].value=800000;assert.throws(()=>originate(bad,'cre'));
  assert(r.collateral[0].pledgedValue>0);f=step(r);const paid=transact(f,f.contracts.map(c=>({contractId:c.id,borrowerId:c.borrowerId,kind:'repay',amount:c.principal+c.servicing.interestDue})));
  assert.equal(paid.collateral[0].pledgedValue,0);assert(paid.contracts.every(c=>c.principal===0&&c.collateral.releasedMonth===paid.world.month));
  // Released loan history cannot claim perpetual ownership of a sold property.
  const sold=copy(paid);sold.collateral[0].borrowerId='company:1';assert.equal(step(sold).world.month,3);
});
test('external collateral liens release when the actual outside debt has amortized',()=>{
  let f=fixture();f.collateral=[{id:'external-property',borrowerId:'company:0',value:400000,pledgedValue:200000,externalPledgedValue:200000}];
  const total=cash(f);for(let i=0;i<36;i++){f=step(f);assert.equal(cash(f),total);}
  assert.equal(f.world.companies[0].externalDebt,0);assert.equal(f.collateral[0].externalPledgedValue,0);assert.equal(f.collateral[0].pledgedValue,0);
});
test('cash stress produces actual arrears/nonaccrual and funded creditor liquidation',()=>{
  let f=originate(step(fixture()),'commercial',120000),carrier=G.opening('third-party-carrier');
  const paid=V.payAgencyPremium(f.world,0,carrier,f.world.companies[0].book.accounts.cash,f.contracts);f.world=paid.world;carrier=paid.carrier;
  const total=cash(f,[carrier]);let sawArrears=false,sawSuspended=false;
  for(let i=0;i<24&&!f.world.companies[0].resolution;i++){
    f=step(f,0);assert.equal(cash(f,[carrier]),total);sawArrears ||=f.contracts.some(c=>c.servicing.missedMonths>0);sawSuspended ||=f.contracts.some(c=>c.servicing.suspendedInterest>0);
  }
  assert(sawArrears);assert(sawSuspended);assert(f.world.companies[0].resolution);
  assert(f.contracts.every(c=>!c.principal&&!c.undrawn&&!c.servicing.interestDue&&!c.servicing.suspendedInterest));
  assert(Object.values(f.world.companies[0].book.accounts).every(n=>n===0));
  assert(f.world.companies[0].resolution.loanWriteoff.some(n=>n>0));
  const recoveries=f.bankPostings.filter(p=>Object.hasOwn(p,'principalWrittenOff'));assert.equal(recoveries.length,2);
  assert(recoveries.some(p=>p.suspendedInterestPaid>0),'actual liquidation recovers some previously unrecognized interest');
  for(const p of recoveries){
    assert.equal(p.bank.loans,-p.principalPaid-p.principalWrittenOff);
    assert.equal(p.bank.receivables,-p.recognizedInterestPaid-p.interestWrittenOff);
    assert.equal(p.bank.cash,p.principalPaid+p.recognizedInterestPaid+p.suspendedInterestPaid);
    assert.equal(p.bank.earnings,p.suspendedInterestPaid-p.principalWrittenOff-p.interestWrittenOff);
  }
  assert.equal(f.world.companies[0].report.loanInterest,f.world.lending.flows.reduce((n,p)=>n+p.accruedInterest+p.suspendedInterestPaid,0));
  const closed=step(f,1);assert.equal(cash(closed,[carrier]),total);assert.equal(closed.world.companies[0].report.profit,0);
});
test('secured liquidation allocates funded asset proceeds and releases collateral once',()=>{
  let f=step(fixture());f.collateral=[{id:'property',borrowerId:'company:0',value:400000,pledgedValue:0,externalPledgedValue:0}];
  f=originate(f,'cre',240000);let carrier=G.opening('third-party-carrier');
  const paid=V.payAgencyPremium(f.world,0,carrier,f.world.companies[0].book.accounts.cash,f.contracts);f.world=paid.world;carrier=paid.carrier;const total=cash(f,[carrier]);
  for(let i=0;i<24&&!f.world.companies[0].resolution;i++){f=step(f,0);assert.equal(cash(f,[carrier]),total);}
  const resolved=f.world.companies[0].resolution;assert(resolved);assert.equal(resolved.proceeds,360000);assert(resolved.loanRecovery.every(n=>n>0));
  assert.equal(f.collateral[0].value,0);assert.equal(f.collateral[0].pledgedValue,0);assert(f.contracts.every(c=>c.collateral.releasedMonth===f.world.month));
  const before=copy(f.world.companies[0].resolution),next=step(f);equal(next.world.companies[0].resolution,before);assert.equal(cash(next,[carrier]),total);
});
test('cash-rich insolvency distributes existing cash as well as funded asset sale proceeds',()=>{
  // An intentionally extreme, actually paid carrier expense creates insolvency
  // without deleting borrower cash. This is a finance boundary, not an authored
  // insurance product price or an earned-gameplay balance claim.
  let f=originate(step(fixture()),'commercial',1000000);let carrier=G.opening('third-party-carrier');
  const paid=V.payAgencyPremium(f.world,0,carrier,700000,f.contracts);f.world=paid.world;carrier=paid.carrier;
  assert(f.world.companies[0].book.accounts.equity<0);assert(f.world.companies[0].book.accounts.cash>0);
  const total=cash(f,[carrier]);f=step(f);const r=f.world.companies[0].resolution;assert(r);assert(r.openingCash>0);
  assert.equal(r.cashAvailable,r.openingCash+r.proceeds);
  assert.equal(r.cashAvailable,r.creditorRecovery+r.supplierRecovery+r.bankRecovery.reduce((a,b)=>a+b,0)+r.loanRecovery.reduce((a,b)=>a+b,0)+r.equityDistribution);
  assert(r.cashAvailable>r.proceeds);assert.equal(cash(f,[carrier]),total);V.validate(f.world,f.contracts);
  for(const field of ['openingCash','cashAvailable']){const bad=copy(f.world);bad.companies[0].resolution[field]++;assert.throws(()=>V.validate(bad,f.contracts),/Liquidation cash/);}
});
test('actual purchased corporate claims service and prepay without charging borrower basis',()=>{
  const original=originate(step(fixture(true))),f=purchase(original),before=cash(f),purchased=f.contracts.find(c=>c.originatorBankId==='bankA'),buyer=f.banks.find(b=>b.id==='bankB');
  assert.equal(cash(f),cash(original));assert.equal(purchased.basisAdjustment,-6000);assert.equal(buyer.book.accounts.loanBasisAdjustment,-6000);
  equal(f.world,original.world);let r=step(f);assert.equal(cash(r),before);const held=r.contracts.find(c=>c.id===purchased.id);
  assert.equal(r.world.companies[0].report.loanInterest,1000);assert(held.basisAdjustment>-6000);
  assert.equal(r.banks.find(b=>b.id==='bankB').book.retainedEarnings-buyer.book.retainedEarnings,1000+held.basisAdjustment+6000);
  const interest=r.world.companies[0].report.loanInterest;r=transact(r,[{contractId:held.id,borrowerId:held.borrowerId,kind:'repay',amount:1000}]);
  assert.equal(r.world.companies[0].report.loanInterest,interest);assert.equal(cash(r),before);assert(r.contracts.find(c=>c.id===held.id).basisAdjustment>held.basisAdjustment);
  r=step(r);r=transact(r,r.contracts.map(c=>({contractId:c.id,borrowerId:c.borrowerId,kind:'repay',amount:c.principal+c.servicing.interestDue+c.servicing.suspendedInterest})));
  assert(r.contracts.every(c=>!c.principal&&!c.basisAdjustment));assert(r.banks.every(b=>!b.book.accounts.loanBasisAdjustment));assert.equal(cash(r),before);V4.validate(r.world,r.contracts);
});
test('legacy bank accounting cannot conceal offsetting nonzero purchase bases',()=>{
  const f=originate(step(fixture())),a=f.banks.find(b=>b.id==='bankA'),b=f.banks.find(b=>b.id==='bankB'),claim=f.contracts.find(c=>c.bankId==='bankA');
  // Funded par sale establishes both face claims at B. The following invented,
  // offsetting purchase marks intentionally model a malformed imported state.
  a.book=A.post(a.book,'fixture.parSale',{cash:claim.principal,loans:-claim.principal});b.book=A.post(b.book,'fixture.parPurchase',{cash:-claim.principal,loans:claim.principal});claim.bankId='bankB';
  f.contracts[0].basisAdjustment=100;f.contracts[1].basisAdjustment=-100;assert.equal(f.contracts.reduce((n,c)=>n+c.basisAdjustment,0),0);
  assert.throws(()=>step(f),/purchase basis/);
  const actual=purchase(originate(step(fixture(true)))),buyer=actual.banks.find(b=>b.id==='bankB');
  buyer.book=B4.post(buyer.book,'fixture.invalidBasisMark',{loanBasisAdjustment:1,equity:1},1);assert.throws(()=>step(actual),/purchase basis/);
});
test('purchased CRE retains the same real collateral lien and original borrower ownership',()=>{
  let f=step(fixture(true));f.collateral=[{id:'property',borrowerId:'company:0',value:400000,pledgedValue:0,externalPledgedValue:0}];f=originate(f,'cre');
  const property=copy(f.collateral),liens=f.contracts.map(c=>({id:c.id,collateral:copy(c.collateral)})),r=purchase(f);
  equal(r.collateral,property);for(const c of r.contracts)equal(c.collateral,liens.find(p=>p.id===c.id).collateral);
  const settled=step(r);assert.equal(settled.collateral[0].pledgedValue,property[0].pledgedValue);assert.equal(settled.collateral[0].borrowerId,'company:0');V4.validate(settled.world,settled.contracts);
});
test('discount/premium corporate liquidation writes off bank carrying value, borrower face debt',()=>{
  let baseline=null;
  for(const ratio of [.9,1.1]){
    let f=purchase(originate(step(fixture(true)),'commercial',1000000),ratio),carrier=G.opening('third-party-carrier');
    const paid=V4.payAgencyPremium(f.world,0,carrier,700000,f.contracts);f.world=paid.world;carrier=paid.carrier;const total=cash(f,[carrier]);f=step(f);
    const company=f.world.companies[0];assert(company.resolution);assert.equal(cash(f,[carrier]),total);assert(f.banks.every(b=>!b.book.accounts.loanBasisAdjustment));assert(f.contracts.every(c=>!c.basisAdjustment));
    const entry=f.bankPostings.find(p=>Object.hasOwn(p,'basisReleased'));assert(entry);assert.equal(entry.bank.loanBasisAdjustment,-entry.basisReleased);
    assert.equal(entry.bank.earnings,entry.suspendedInterestPaid-entry.principalWrittenOff-entry.interestWrittenOff-entry.basisReleased);
    assert.equal(company.resolution.loanWriteoff.reduce((n,x)=>n+x,0),f.bankPostings.filter(p=>Object.hasOwn(p,'principalWrittenOff')).reduce((n,p)=>n+p.principalWrittenOff+p.interestWrittenOff,0));
    if(baseline)equal(company,baseline);else baseline=copy(company);V4.validate(f.world,f.contracts);
  }
});
console.log(JSON.stringify({checks,corporateLoanMonths:months,legacyExactMonths:96,scope:'isolated explicit-endowment fixtures, not live/earned gameplay or all-borrower integration'}));
