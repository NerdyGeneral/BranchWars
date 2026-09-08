'use strict';
const assert=require('node:assert/strict'),Loan=require('./loan-contracts');
const copy=x=>JSON.parse(JSON.stringify(x));let cases=0,months=0;
function test(name,fn){fn();cases++;console.log('PASS '+name);}
function opened(product='businessLine',initialDrawBps=5000){
 const p=Loan.catalog[product],s={version:1,month:1,banks:['a','b'].map(id=>({id,cash:2000000,reserve:0,capital:1000000,minimumCapitalRatioBps:1000,riskWeightedAssets:0,originationLimit:1000000,creditWork:10,contractSlots:10000,sectorLimits:{general:2000000},sectorExposure:{general:0},deployments:[{product,market:'downtown',channel:'physical',status:'active'}]})),
  borrowers:[{id:'borrower',market:'downtown',segment:p.segment,sector:'general',cash:0,existingDebt:0,existingUndrawn:0,borrowingLimit:2000000,collateral:p.maxLtvBps?[{id:'property',value:1000000,pledgedValue:0}]:[]}],
  applications:[{id:'app',borrowerId:'borrower',product,amount:120000,maxAnnualRateBps:2000,minTermMonths:p.terms[0],collateralId:p.maxLtvBps?'property':null,initialDrawBps,channel:'physical'}]};
 const cs=Loan.clearOriginations(s,['a','b'].map(bankId=>({bankId,applicationId:'app',amount:120000,terms:{annualRateBps:1200,feeBps:0,termMonths:p.terms[0],underwriting:'balanced'}}))).contracts;
 return settle(cs,2,1000000);
}
function collateral(cs){return cs[0]?.collateral?[{id:'property',borrowerId:'borrower',value:1000000,pledgedValue:cs.reduce((n,c)=>n+(c.collateral?.releasedMonth===null?c.collateral.pledgedValue:0),0),externalPledgedValue:0}]:[];}
function settle(cs,month,cash){months++;return Loan.serviceContracts({version:1,month,contracts:cs,borrowers:[{id:'borrower',cash,protectedCash:0}],collateral:collateral(cs)}).contracts;}
function snapshot(cs,kind='draw',amount=10000){return{version:1,month:cs[0].servicing.lastMonth,contracts:cs,banks:['a','b'].map(id=>({id,cash:100000,protectedCash:1000,creditWork:5})),
 borrowers:[{id:'borrower',cash:1000000,protectedCash:1000}],collateral:collateral(cs),instructions:cs.map(c=>({contractId:c.id,borrowerId:c.borrowerId,kind,amount}))};}
function transact(s){
 const before=JSON.stringify(s),r=Loan.transactContracts(s);assert.equal(JSON.stringify(s),before,'pure');
 const reversed=copy(s);for(const k of ['contracts','banks','borrowers','collateral','instructions'])reversed[k].reverse();assert.deepEqual(Loan.transactContracts(reversed),r,'input order cannot choose outcome');
 for(const p of r.postings){assert.equal(p.bank.cash+p.borrower.cash,0);assert.equal(p.bank.loans,p.borrower.debt);assert.equal(p.bank.receivables,p.borrower.interestPayable);
  assert.equal(p.bank.cash+p.bank.loans+p.bank.receivables,p.bank.equity);assert.equal(p.borrower.cash-p.borrower.debt-p.borrower.interestPayable+p.borrower.interestExpense,0);}
 for(const b of s.banks){const ps=r.postings.filter(p=>p.bankId===b.id);assert(ps.reduce((n,p)=>n+p.draw,0)<=Math.max(0,b.cash-b.protectedCash));assert(ps.reduce((n,p)=>n+p.creditWork,0)<=b.creditWork);}
 for(const b of s.borrowers){const ps=r.postings.filter(p=>p.borrowerId===b.id);assert(ps.reduce((n,p)=>n+p.principalPaid+p.recognizedInterestPaid+p.suspendedInterestPaid,0)<=Math.max(0,b.cash-b.protectedCash));}
 return r;
}
test('purchased revolving basis survives par draws and amortizes only on funded repayment',()=>{
 for(const basis of [-1001,1001]){
  const cs=opened();cs[0].basisAdjustment=basis;
  const s=snapshot(cs),drawn=Loan.transactContracts(s);assert.equal(drawn.contracts[0].basisAdjustment,basis);assert.equal(drawn.postings[0].bank.earnings,0);
  const serviced=settle(drawn.contracts,3,1000000),r=Loan.transactContracts(snapshot(serviced,'repay',10000)),p=r.postings[0];
  assert.equal(p.bank.loanBasisAdjustment,-Number(BigInt(basis)*10000n/40000n));
  assert.equal(p.bank.cash+p.bank.loans+(p.bank.loanBasisAdjustment||0)+p.bank.receivables,p.bank.equity);
  assert.equal(p.borrower.interestExpense,0);assert.equal(p.bank.earnings,p.bank.loanBasisAdjustment);
  const next=settle(r.contracts,4,1000000),paid=Loan.transactContracts(snapshot(next,'repay',1000000));
  assert.equal(paid.contracts[0].basisAdjustment,0);assert.equal(paid.contracts[0].principal,0);assert.equal(paid.contracts[0].undrawn,60000);
 }
});

test('contracted revolving draw moves actual lender cash and no income',()=>{
 const s=snapshot(opened()),r=transact(s);assert.equal(r.postings.reduce((n,p)=>n+p.draw,0),20000);
 for(let i=0;i<r.contracts.length;i++){const c=r.contracts[i];assert.equal(c.principal,s.contracts[i].principal+10000);assert.equal(c.undrawn,s.contracts[i].undrawn-10000);assert.equal(c.commitment,s.contracts[i].commitment);assert.deepEqual(c.originalTerms,s.contracts[i].originalTerms);}
 assert(r.postings.every(p=>p.bank.earnings===0));
});
test('repayment restores revolving availability, then redraw remains funded',()=>{
 let cs=transact(snapshot(opened(),'repay',10000)).contracts;assert(cs.every(c=>c.undrawn===40000&&c.principal===20000));
 cs=settle(cs,3,1000000);const r=transact(snapshot(cs,'draw',40000));assert(r.contracts.every(c=>c.principal===60000&&c.undrawn===0&&c.commitment===60000));
});
test('optional secured payoff releases existing collateral exactly once',()=>{
 const s=snapshot(opened('auto',10000),'repay',1000000),r=transact(s);assert(r.contracts.every(c=>c.principal===0&&c.collateral.releasedMonth===2));assert.equal(r.collateral[0].pledgedValue,0);
 const later=transact(snapshot(settle(r.contracts,3,1000000),'repay',1000000));assert(later.postings.every(p=>p.collateralReleaseValue===0&&p.principalPaid===0));
});
test('mandatory servicing precedes activity and same-month replay rejects',()=>{
 const s=snapshot(opened()),r=transact(s);assert.throws(()=>Loan.transactContracts({...s,contracts:r.contracts}),/already resolved/);
 const wrong=copy(s);wrong.month++;assert.throws(()=>Loan.transactContracts(wrong),/Nonsequential/);
 const invalid=copy(s);invalid.contracts[0].servicing.activityMonth=999;assert.throws(()=>Loan.transactContracts(invalid),/activity fence/);
});
test('released historical collateral may transfer, be repledged or leave the live registry',()=>{
 const paid=transact(snapshot(opened('auto',10000),'repay',1000000));
 const input={version:1,month:3,contracts:paid.contracts,borrowers:[{id:'borrower',cash:1000,protectedCash:0},{id:'buyer',cash:2000,protectedCash:0}],collateral:copy(paid.collateral)};
 input.collateral[0].borrowerId='buyer';input.collateral[0].pledgedValue=50000;input.collateral[0].externalPledgedValue=50000;
 const before=copy(input),r=Loan.serviceContracts(input);months++;
 assert.deepEqual(input,before);assert.deepEqual(r.collateral,input.collateral);
 assert(r.contracts.every(c=>c.collateral.releasedMonth===2&&c.borrowerId==='borrower'));
 assert(r.postings.every(p=>p.collateralReleaseValue===0&&p.principalPaid===0&&p.interestPaid===0));
 const absent=Loan.serviceContracts({...input,collateral:[]});months++;assert.deepEqual(absent.contracts,r.contracts);
 const activity=snapshot(r.contracts,'repay',1000000);activity.borrowers=input.borrowers;activity.collateral=r.collateral;
 assert.deepEqual(transact(activity).collateral,input.collateral);
 const live=snapshot(opened('auto',10000));live.borrowers.push({id:'buyer',cash:2000,protectedCash:0});live.collateral[0].borrowerId='buyer';
 assert.throws(()=>Loan.transactContracts(live),/Collateral ownership mismatch/);
 live.collateral=[];assert.throws(()=>Loan.transactContracts(live),/Collateral ownership mismatch/);
});
test('empty activity still seals this month, without new work or cash',()=>{
 const s=snapshot(opened());s.instructions=[];const r=transact(s);assert.deepEqual(r.postings,[]);assert.throws(()=>Loan.transactContracts({...s,contracts:r.contracts}),/already resolved/);
});
test('funding and processing bottlenecks cap draws, never overdraft',()=>{
 const s=snapshot(opened(),'draw',100000);s.banks[0].cash=6000;s.banks[0].protectedCash=1000;s.banks[1].creditWork=0;
 const r=transact(s);assert.deepEqual(r.decisions.map(d=>d.filled),[5000,0]);assert.equal(r.postings[0].creditWork,1);
});
test('finite repayment pool shares across rival lenders without seat priority',()=>{
 const s=snapshot(opened(),'repay',10000);s.borrowers[0].cash=2001;s.borrowers[0].protectedCash=1000;
 const r=transact(s),paid=r.postings.map(p=>p.principalPaid);assert.equal(paid[0]+paid[1],1001);assert.equal(Math.abs(paid[0]-paid[1]),1);
});
test('same-pass draws and repayments cannot finance one another',()=>{
 const s=snapshot(opened(),'repay',20000);s.instructions[0].kind='draw';s.borrowers[0].cash=1000;s.borrowers[0].protectedCash=1000;
 const r=transact(s);assert.equal(r.decisions[0].filled,20000);assert.equal(r.decisions[1].filled,0);
 // Two contracts at one bank, one paying and one drawing: incoming payment is
 // not a substitute for actual opening bank liquidity.
 const both=copy(s);both.contracts[1].bankId='a';both.contracts[1].originatorBankId='a';both.contracts[1].applicationId='other';both.contracts[1].id='loan:1:5:other:1:a';both.instructions[1].contractId=both.contracts[1].id;
 both.banks[0].cash=1000;both.borrowers[0].cash=50000;const second=transact(both);
 assert.equal(second.postings.find(p=>p.kind==='draw').draw,0);assert.equal(second.postings.find(p=>p.kind==='repay').principalPaid,20000);
});
test('arrears block draws; cash cure pays recognized and suspended interest once',()=>{
 let cs=opened();for(let m=3;m<=6;m++)cs=settle(cs,m,0);
 const refused=transact(snapshot(cs,'draw',10000));assert(refused.postings.every(p=>p.draw===0));
 cs=settle(refused.contracts,7,0);const paid=transact(snapshot(cs,'repay',1000000));
 assert(paid.postings.every(p=>p.recognizedInterestPaid>0&&p.suspendedInterestPaid>0&&p.bank.earnings===p.suspendedInterestPaid));assert(paid.contracts.every(c=>c.servicing.missedMonths===0&&c.principal===0&&c.undrawn===60000));
});
test('matured lines retain drawn debt, cannot draw or restore expired availability',()=>{
 let cs=opened();for(let m=3;m<=13;m++)cs=settle(cs,m,0);
 assert(cs.every(c=>c.remainingMonths===0&&c.undrawn===0&&c.principal===30000));
 const s=snapshot(cs,'repay',1000000);s.instructions[0].kind='draw';const r=transact(s);
 assert.equal(r.postings[0].draw,0);assert.equal(r.contracts[1].commitment,0);assert.equal(r.contracts[1].undrawn,0);
});
test('term loans do not redraw, and zero-funded prepayment preserves obligations',()=>{
 const s=snapshot(opened('installment',10000),'draw',10000);assert(transact(s).postings.every(p=>p.draw===0));
 s.instructions.forEach(a=>a.kind='repay');s.borrowers[0].protectedCash=s.borrowers[0].cash;const r=transact(s);assert(r.postings.every(p=>p.principalPaid===0));assert.deepEqual(r.contracts.map(c=>c.principal),s.contracts.map(c=>c.principal));
});
test('forged borrower identity, malformed instructions and missing lenders reject',()=>{
 for(const mutate of [s=>s.instructions[0].borrowerId='other',s=>s.instructions.push(copy(s.instructions[0])),s=>s.instructions[0].kind='forgive',s=>s.instructions[0].amount=-1,s=>s.instructions[0].amount=1.5,s=>s.banks.pop(),s=>s.instructions[0].extra=true,s=>delete s.contracts[0].servicing.activityMonth]){
  const s=snapshot(opened());mutate(s);assert.throws(()=>Loan.transactContracts(s));
 }
});
console.log(JSON.stringify({passed:true,cases,months,scope:'isolated funded borrower transactions; not integrated customer/economy or release acceptance'}));
