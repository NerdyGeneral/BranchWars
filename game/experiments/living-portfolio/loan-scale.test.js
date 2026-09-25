'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const Loan=require('./loan-contracts');
const count=10000,amount=1000,banks=['a','b'].map(id=>({id,cash:20000000,reserve:1000000,capital:5000000,minimumCapitalRatioBps:1000,riskWeightedAssets:0,
  originationLimit:10000000,creditWork:10000,contractSlots:10000,sectorLimits:{general:10000000},sectorExposure:{general:0},deployments:[{product:'installment',market:'downtown',channel:'physical',status:'active'}]}));
const borrowers=Array.from({length:count},(_,i)=>({id:'b'+i,market:'downtown',segment:'household',sector:'general',cash:0,existingDebt:0,existingUndrawn:0,borrowingLimit:amount,collateral:[]}));
const applications=borrowers.map((b,i)=>({id:'a'+i,borrowerId:b.id,product:'installment',amount,maxAnnualRateBps:2000,minTermMonths:12,collateralId:null,initialDrawBps:10000,channel:'physical'}));
const offers=applications.flatMap(a=>banks.map(b=>({bankId:b.id,applicationId:a.id,amount,terms:{annualRateBps:1200,feeBps:0,termMonths:12,underwriting:'balanced'}})));
const started=performance.now(),r=Loan.clearOriginations({version:1,month:1,banks,borrowers,applications},offers),originationMs=performance.now()-started;
assert.equal(r.contracts.length,20000);assert.equal(r.contracts.reduce((n,c)=>n+c.principal,0),10000000);
assert(r.banks.every(b=>b.remainingContractSlots===0));
const serviceStart=performance.now(),s=Loan.serviceContracts({version:1,month:2,contracts:r.contracts,borrowers:borrowers.map(b=>({id:b.id,cash:1000,protectedCash:0})),collateral:[]}),servicingMs=performance.now()-serviceStart;
assert.equal(s.contracts.length,20000);assert.equal(s.postings.reduce((n,p)=>n+p.principalPaid,0)+s.contracts.reduce((n,c)=>n+c.principal,0),10000000);
assert.equal(s.postings.reduce((n,p)=>n+p.bank.cash+p.borrower.cash,0),0);
const transactionStart=performance.now(),t=Loan.transactContracts({version:1,month:2,contracts:s.contracts,
 banks:banks.map(b=>({id:b.id,cash:1000000,protectedCash:100000,creditWork:10000})),borrowers:borrowers.map(b=>({id:b.id,cash:1000,protectedCash:100})),collateral:[],
 instructions:s.contracts.map(c=>({contractId:c.id,borrowerId:c.borrowerId,kind:'repay',amount:100}))}),transactionMs=performance.now()-transactionStart;
assert.equal(t.postings.length,20000);assert.equal(t.postings.reduce((n,p)=>n+p.principalPaid,0),2000000);
assert.equal(t.postings.reduce((n,p)=>n+p.bank.cash+p.borrower.cash,0),0);
console.log(JSON.stringify({passed:true,applications:count,contracts:r.contracts.length,originationMs:Math.round(originationMs),servicingMs:Math.round(servicingMs),
  transactionMs:Math.round(transactionMs),
  serializedContractBytes:Buffer.byteLength(JSON.stringify(s.contracts)),moduleSha256:crypto.createHash('sha256').update(fs.readFileSync(require.resolve('./loan-contracts'))).digest('hex'),
  limitations:'Synthetic kernel ceiling only. Full campaign, transport limits and compact retained-term representation still require integration; this is not a portable-size or whole-game performance pass.'}));
