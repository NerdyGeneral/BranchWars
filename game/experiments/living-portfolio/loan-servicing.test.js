'use strict';
const assert=require('node:assert/strict'),Loan=require('./loan-contracts');
const copy=x=>JSON.parse(JSON.stringify(x));let cases=0,months=0;
function test(name,fn){fn();cases++;console.log('PASS '+name);}
function contracts(product='installment',amount=120000,rate=1200){
  const p=Loan.catalog[product],s={version:1,month:1,banks:['a','b'].map(id=>({id,cash:2000000,reserve:0,capital:1000000,minimumCapitalRatioBps:1000,riskWeightedAssets:0,originationLimit:1000000,creditWork:10,contractSlots:10000,sectorLimits:{general:2000000},sectorExposure:{general:0},deployments:[{product,market:'downtown',channel:'physical',status:'active'}]})),
    borrowers:[{id:'borrower',market:'downtown',segment:p.segment,sector:'general',cash:0,existingDebt:0,existingUndrawn:0,borrowingLimit:2000000,collateral:p.maxLtvBps?[{id:'property',value:1000000,pledgedValue:0}]:[]}],
    applications:[{id:'app',borrowerId:'borrower',product,amount,maxAnnualRateBps:2000,minTermMonths:p.terms[0],collateralId:p.maxLtvBps?'property':null,initialDrawBps:10000,channel:'physical'}]};
  return Loan.clearOriginations(s,['a','b'].map(bankId=>({bankId,applicationId:'app',amount,terms:{annualRateBps:rate,feeBps:0,termMonths:p.terms[0],underwriting:'growth'}}))).contracts;
}
function service(cs,month,cash,protectedCash=0){
  const collateral=cs[0].collateral?[{id:'property',borrowerId:'borrower',value:1000000,pledgedValue:cs.reduce((n,c)=>n+(c.collateral?.releasedMonth===null?c.collateral.pledgedValue:0),0),externalPledgedValue:0}]:[];
  const input={version:1,month,contracts:cs,borrowers:[{id:'borrower',cash,protectedCash}],collateral},before=JSON.stringify(input),r=Loan.serviceContracts(input);months++;
  assert.equal(JSON.stringify(input),before,'pure servicing');
  const paid=r.postings.reduce((n,p)=>n+p.bank.cash,0);assert(paid<=Math.max(0,cash-protectedCash));
  for(const p of r.postings){assert.equal(p.bank.cash+p.borrower.cash,0);assert.equal(p.bank.loans,p.borrower.debt);assert.equal(p.bank.receivables,p.borrower.interestPayable);
    assert.equal(p.bank.cash+p.bank.loans+p.bank.receivables,p.bank.equity);assert.equal(p.bank.earnings,p.accruedInterest+p.suspendedInterestPaid);assert.equal(p.bank.cash,p.principalPaid+p.interestPaid);
    assert.equal(p.borrower.cash-p.borrower.debt-p.borrower.interestPayable+p.borrower.interestExpense,0);}
  const rev=copy(input);rev.contracts.reverse();rev.borrowers.reverse();assert.deepEqual(Loan.serviceContracts(rev),r,'servicing order independent');
  return r;
}
test('purchase basis follows actual principal payments without changing borrower obligations',()=>{
 for(const basis of [-60000,-1001,0,1001,60000]){
  let cs=contracts(),original=copy(cs);cs[0].basisAdjustment=basis;let released=0;
  for(let month=2;month<=13;month++){
   const snapshot={version:1,month,contracts:cs,borrowers:[{id:'borrower',cash:1000000,protectedCash:0}],collateral:[]},
    par=Loan.serviceContracts({...snapshot,contracts:original}),r=Loan.serviceContracts(snapshot);months++;
   for(let i=0;i<cs.length;i++){
    const p=r.postings[i],q=par.postings[i],movement=p.bank.loanBasisAdjustment||0;
    assert.deepEqual(p.borrower,q.borrower);assert.equal(p.bank.cash,q.bank.cash);
    assert.equal(p.bank.cash+p.bank.loans+movement+p.bank.receivables,p.bank.equity);
    assert.equal(p.bank.earnings,q.bank.earnings+movement);
    const expected=-Number(BigInt(cs[i].basisAdjustment)*BigInt(p.principalPaid)/BigInt(cs[i].principal))||0;assert.equal(movement,expected);
    if(!cs[i].basisAdjustment)assert(!Object.hasOwn(p.bank,'loanBasisAdjustment'));
    released+=movement;
   }
   cs=r.contracts;original=par.contracts;
  }
  assert.equal(released,-basis||0);assert(cs.every(c=>c.basisAdjustment===0&&c.principal===0));
 }
 const cs=contracts();cs[0].basisAdjustment=-1001;
 const r=Loan.serviceContracts({version:1,month:2,contracts:cs,borrowers:[{id:'borrower',cash:0,protectedCash:0}],collateral:[]});months++;
 assert.equal(r.contracts[0].basisAdjustment,-1001);assert(!Object.hasOwn(r.postings[0].bank,'loanBasisAdjustment'));
});

test('fully funded installment amortizes and never calls repayment earnings',()=>{
  let cs=contracts(),principal=0,interest=0;
  for(let month=2;month<=13;month++){const r=service(cs,month,1000000);cs=r.contracts;principal+=r.postings.reduce((n,p)=>n+p.principalPaid,0);interest+=r.postings.reduce((n,p)=>n+p.interestPaid,0);}
  assert.equal(principal,120000);assert(interest>0);assert(cs.every(c=>c.principal===0&&c.remainingMonths===0&&c.servicing.interestDue===0));
});
test('finite borrower cash shared fairly between lenders and protected reserve retained',()=>{
  const r=service(contracts(),2,1500,500);assert.equal(r.postings.reduce((n,p)=>n+p.bank.cash,0),1000);assert.equal(r.postings[0].bank.cash,500);assert.equal(r.postings[1].bank.cash,500);
  assert(r.contracts.every(c=>c.servicing.principalDue>0&&c.servicing.missedMonths===1));
});
test('unpaid interest is a receivable, not money; 90-day delinquency stops accrual',()=>{
  let cs=contracts();for(let month=2;month<=5;month++){const r=service(cs,month,0);cs=r.contracts;assert(r.postings.every(p=>p.bank.cash===0));if(month<=4)assert(r.postings.every(p=>p.accruedInterest>0));else assert(r.postings.every(p=>p.accruedInterest===0));}
  assert(cs.every(c=>c.servicing.missedMonths===4));assert.equal(cs.reduce((n,c)=>n+c.principal,0),120000);
  const cure=service(cs,6,1000000);assert(cure.contracts.every(c=>c.servicing.missedMonths===0));
  assert(cure.postings.every(p=>p.accruedInterest===0&&p.suspendedInterestPaid>0&&p.bank.earnings===p.suspendedInterestPaid),'old recognized interest is not recognized twice; suspended interest earns only when paid');
});
test('balloon principal remains until actual maturity; no automatic debt erasure',()=>{
  let cs=contracts('cre'),repaid=0;
  for(let month=2;month<=37;month++){const r=service(cs,month,month===37?0:1000000);cs=r.contracts;repaid+=r.postings.reduce((n,p)=>n+p.principalPaid,0);}
  assert.equal(repaid,0);assert(cs.every(c=>c.remainingMonths===0&&c.servicing.principalDue===c.principal));
  const paid=service(cs,38,1000000);assert.equal(paid.postings.reduce((n,p)=>n+p.principalPaid,0),120000);assert(paid.contracts.every(c=>c.principal===0));
});
test('collateral releases only after funded payoff, exactly once, preserving vintage',()=>{
  let cs=contracts('auto'),released=0,original=cs.map(c=>copy(c.collateral));
  for(let month=2;month<=25;month++){const r=service(cs,month,1000000);cs=r.contracts;released+=r.postings.reduce((n,p)=>n+p.collateralReleaseValue,0);}
  assert.equal(released,original.reduce((n,c)=>n+c.pledgedValue,0));assert(cs.every(c=>c.collateral.releasedMonth===25));
  const after=service(cs,26,1000000);assert(after.postings.every(p=>p.collateralReleaseValue===0));assert.equal(after.contracts[0].originalTerms.underwriting,'growth');
});
test('long mortgage retains 120-month contract and fully funded terminal principal',()=>{
  let cs=contracts('mortgage'),repaid=0;
  for(let month=2;month<=121;month++){const r=service(cs,month,1000000);cs=r.contracts;repaid+=r.postings.reduce((n,p)=>n+p.principalPaid,0);}
  assert.equal(repaid,120000);assert(cs.every(c=>c.principal===0&&c.remainingMonths===0));
});
test('revolving maturity expires undrawn availability, not drawn debt',()=>{
  let cs=contracts('businessLine');cs.forEach(c=>{c.principal=30000;c.originalPrincipal=30000;c.undrawn=30000;});
  for(let month=2;month<=13;month++)cs=service(cs,month,0).contracts;
  assert(cs.every(c=>c.undrawn===0&&c.principal===30000&&c.commitment===30000));
});
test('duplicate, skipped, replayed, malformed and forged contracts reject',()=>{
  const cs=contracts(),input={version:1,month:2,contracts:cs,borrowers:[{id:'borrower',cash:100000,protectedCash:0}],collateral:[]};
  for(const mutate of [s=>s.month=1,s=>s.month=3,s=>s.contracts.push(copy(s.contracts[0])),s=>s.contracts[0].principal=-1,s=>delete s.contracts[0].originalTerms,
    s=>s.contracts[0].originalTerms.lossSensitivityBps=1,s=>s.contracts[0].servicing.principalDue=999999999,s=>s.borrowers=[],s=>s.contracts[0].extra=1]){
    const s=copy(input);mutate(s);assert.throws(()=>Loan.serviceContracts(s));
  }
  const r=Loan.serviceContracts(input);assert.throws(()=>Loan.serviceContracts({...input,contracts:r.contracts}));
});
test('retained maturity, commitments and delinquency cannot be silently rewritten',()=>{
  const base=contracts()[0];
  for(const mutate of [c=>{c.servicing.lastMonth=13;c.remainingMonths=12;},c=>{c.servicing.principalDue=1;},c=>{c.servicing.lastMonth=2;c.remainingMonths=11;c.servicing.missedMonths=1;},
    c=>c.commitment++,c=>{c.principal=0;c.commitment=0;c.originalPrincipal=0;c.originalCommitment=0;}]){
    const c=copy(base);mutate(c);assert.throws(()=>Loan.validateContract(c));
  }
  const line=contracts('businessLine')[0];line.servicing.lastMonth=13;line.remainingMonths=0;line.principal-=100;line.undrawn=100;assert.throws(()=>Loan.validateContract(line));
});
test('actual collateral ledger prevents duplicate ownership/claims and pairs release',()=>{
  const cs=contracts('auto'),pledged=cs.reduce((n,c)=>n+c.collateral.pledgedValue,0),input={version:1,month:2,contracts:cs,borrowers:[{id:'borrower',cash:1000000,protectedCash:0}],
    collateral:[{id:'property',borrowerId:'borrower',value:50000,pledgedValue:pledged,externalPledgedValue:0}]};
  // A market markdown makes collateral underwater, not invalid or forgiven.
  assert.equal(Loan.serviceContracts(input).collateral[0].value,50000);
  const doubled=copy(input);for(const c of doubled.contracts){c.collateral.pledgedValue*=2;c.collateral.originationLtvBps=Math.ceil(c.originalCommitment*10000/c.collateral.pledgedValue);}
  assert.throws(()=>Loan.serviceContracts(doubled),/claims do not reconcile/);
  const wrongOwner=copy(input);wrongOwner.borrowers.push({id:'other',cash:0,protectedCash:0});wrongOwner.collateral[0].borrowerId='other';assert.throws(()=>Loan.serviceContracts(wrongOwner),/ownership/);
  const unknown=copy(input);unknown.collateral=[];assert.throws(()=>Loan.serviceContracts(unknown),/ownership/);
});
test('suspended interest remains owed and is recognized once only on actual payment',()=>{
  let cs=contracts();for(let month=2;month<=5;month++)cs=service(cs,month,0).contracts;
  assert.equal(cs.reduce((n,c)=>n+c.servicing.suspendedInterest,0),1200);
  const paid=service(cs,6,1000000);assert.equal(paid.postings.reduce((n,p)=>n+p.suspendedInterestPaid,0),2400);
  assert.equal(paid.postings.reduce((n,p)=>n+p.bank.earnings,0),2400);assert(paid.contracts.every(c=>c.servicing.suspendedInterest===0));
});
console.log(JSON.stringify({passed:true,cases,servicingMonths:months,scope:'isolated funded repayment/accrual candidate, not integrated loss accounting or balance acceptance'}));
