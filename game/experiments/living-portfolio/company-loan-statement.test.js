'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({});
for(const name of ['accounting','group-accounting','company-finance'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/engine/'+name+'.js'),'utf8'),context);
const {A,G,C}=vm.runInContext('({A:AccountingPrototype,G:GroupAccounting,C:CompanyFinance})',context),L=require('./loan-contracts');
const V=require('./company-finance-v4')({AccountingPrototype:A,GroupAccounting:G,legacy:C,loans:L});
const factory=require('./company-loan-statement'),P=factory({GroupAccounting:G,companyFinance:V}),copy=x=>JSON.parse(JSON.stringify(x));
let checks=0,months=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const profiles=Array.from({length:6},(_,i)=>({market:'market'+i,baseFee:10000}));
const services=world=>world.companies.map((c,i)=>({provider:c.resolution?-1:i%2,fee:c.baseFee,served:!c.resolution}));
function opening(){return {world:V.withLending(C.opening(profiles),['bankA','bankB']),contracts:[],collateral:[],banks:['bankA','bankB'].map(id=>({id,book:A.opening(3),legacyPrincipal:9500000,otherReceivables:0}))};}
function snapshot(f,applications=false,amount=120000){
 const c=f.world.companies[0];return {version:1,month:f.world.month,banks:f.banks.map(b=>({id:b.id,cash:b.book.accounts.cash,reserve:500000,capital:b.book.accounts.equity,minimumCapitalRatioBps:1000,riskWeightedAssets:b.legacyPrincipal+Math.ceil(b.book.accounts.securities*.2)+b.book.accounts.receivables+f.contracts.filter(x=>x.bankId===b.id).reduce((n,x)=>n+Math.ceil(x.commitment*x.originalTerms.riskWeightBps/10000),0),originationLimit:1000000,creditWork:10,contractSlots:10000-f.contracts.filter(x=>x.bankId===b.id).length,sectorLimits:{general:2000000},sectorExposure:{general:f.contracts.filter(x=>x.bankId===b.id).reduce((n,x)=>n+x.commitment,0)},deployments:[{product:'commercial',market:c.market,channel:'physical',status:'active'}]})),borrowers:applications?[{id:c.id,market:c.market,segment:'company',sector:'general',cash:c.book.accounts.cash,existingDebt:c.book.accounts.debt,existingUndrawn:0,borrowingLimit:2000000,collateral:[]}]:[],applications:applications?[{id:'private-application',borrowerId:c.id,product:'commercial',amount,maxAnnualRateBps:2000,minTermMonths:24,collateralId:null,initialDrawBps:10000,channel:'physical'}]:[]};
}
function activity(f){return V.transact(f.world,{contracts:f.contracts,collateral:f.collateral,banks:f.banks,instructions:[],protectedCash:Object.fromEntries([...f.banks.map(b=>b.id),...f.world.companies.map(c=>c.id)].map(id=>[id,0])),creditWork:{bankA:10,bankB:10}});}
function seal(f,originate=false,amount=120000){
 if(f.world.lending.activityMonth!==f.world.month)f=activity(f);
 if(f.world.lending.originatedMonth!==f.world.month){const s=snapshot(f,originate,amount),offers=originate?s.banks.map(b=>({bankId:b.id,applicationId:'private-application',amount,terms:{annualRateBps:1000,feeBps:100,termMonths:24,underwriting:'balanced'}})):[];f=V.originate(f.world,{contracts:f.contracts,collateral:f.collateral,banks:f.banks,snapshot:s,offers});}
 V.validateSettled(f.world,f.contracts);return f;
}
function step(f,demand=1){f=seal(f);months++;return V.step(f.world,{demand,services:services(f.world)},{contracts:f.contracts,collateral:f.collateral,banks:f.banks});}
// Explicit existing-rule opening endowments. This is a funded domain fixture,
// not evidence of a human/AI earning a launch inside an integrated campaign.
const start=opening(),funded=seal(step(start),true),statement=P.project(funded.world,funded.contracts,services(funded.world));
test('Actual two-lender funded principal and cash survive the public projection',()=>{
 const c=statement.world.companies[0],actual=funded.world.companies[0];assert.equal(funded.contracts.length,2);
 assert.equal(c.bankLoans.principal,120000);assert.equal(c.book.accounts.debt,c.externalDebt+120000);assert.equal(c.book.accounts.cash,actual.book.accounts.cash);
 assert.equal(c.book.accounts.payables,actual.book.accounts.payables);assert.equal(c.report.loanFee,1200);P.validate(statement,{month:funded.world.month,profiles,services:services(funded.world)});
});
test('Projection and independent validation are pure, with no private contracts required',()=>{
 const before=JSON.stringify(funded),p=P.project(funded.world,funded.contracts,services(funded.world));assert.equal(JSON.stringify(funded),before);
 const publicOnly=factory({GroupAccounting:G,companyFinance:{validate(){throw Error('Private validation forbidden');},validateSettled(){throw Error('Private validation forbidden');}}});
 const bytes=JSON.stringify(p);publicOnly.validate(p);assert.equal(JSON.stringify(p),bytes);
 for(const c of p.world.companies){G.validate(c.book);assert.equal(c.book.journal.length,0);assert.deepEqual(copy(c.book.checkpoint),{accounts:copy(c.book.accounts),retainedEarnings:c.book.retainedEarnings,sequence:c.book.sequence});}
 for(const secret of ['bankA','bankB','private-application','originalTerms','underwriting','loanRecovery','loanWriteoff','bankFlows','cashNet','contracts','bankIds'])assert(!bytes.includes(secret),'Private payload '+secret);
 for(const c of funded.contracts)assert(!bytes.includes(c.id));assert(Buffer.byteLength(bytes)<18000);
});
test('Every public layer rejects unknown and nested private payloads',()=>{
 const mutations=[s=>s.contracts=[],s=>s.world.lending={},s=>s.world.companies[0].bankIds=['secret'],s=>s.world.companies[0].bankLoans.contracts=[],s=>s.world.companies[0].bankLoans.byBank={},s=>s.world.companies[0].book.private={},s=>s.world.companies[0].book.accounts.loanTerms={},s=>s.world.companies[0].book.checkpoint.private={},s=>s.world.companies[0].report.bankFlows=[],s=>s.services[0].sealedPlan={},s=>s.world.companies[0].report.loanInterest={terms:'secret'}];
 for(const mutate of mutations){const bad=copy(statement);mutate(bad);assert.throws(()=>P.validate(bad));}
 const leaked=copy(statement);leaked.world.companies[0].book=copy(funded.world.companies[0].book);assert.throws(()=>P.validate(leaked),/compact/);
 const badServices=services(funded.world);badServices[0].sealedPlan={};assert.throws(()=>P.project(funded.world,funded.contracts,badServices));
});
test('Debt, payables, report earnings, company identity and compact journals reconcile strictly',()=>{
 const mutations=[s=>s.world.companies[0].bankLoans.principal++,s=>s.world.companies[0].externalDebt++,s=>s.world.companies[0].bankLoans.recognizedInterest++,s=>s.world.companies[0].supplierPayables++,s=>s.world.companies[0].report.profit++,s=>s.world.companies[0].externalPrincipalArrears=9999999,s=>s.world.companies[0].bankLoans.undrawn=-1,s=>s.world.companies[0].bankLoans.suspendedInterest=NaN,s=>s.world.companies[0].clientIndex=1,s=>s.world.companies[0].book.checkpoint.accounts.cash++,s=>s.world.companies[0].book.retainedEarnings++,s=>s.world.companies[0].resolution=false];
 for(const mutate of mutations){const bad=copy(statement);mutate(bad);assert.throws(()=>P.validate(bad));}
 assert.throws(()=>P.validate(statement,{month:2,profiles,services:services(funded.world)}),/Stale/);
 const wrong=services(funded.world);wrong[0].provider=1;assert.throws(()=>P.validate(statement,{month:1,profiles,services:wrong}),/roster/);
 const bad=copy(funded.contracts);bad[0].principal++;assert.throws(()=>P.project(funded.world,bad,services(funded.world)));
 assert.throws(()=>P.project(C.opening(profiles),[],services(funded.world)),/v4/);
});
test('Recognized versus suspended interest and company liquidation stay aggregate and funded',()=>{
 let f=copy(funded),carrier=G.opening('carrier');const paid=V.payAgencyPremium(f.world,0,carrier,f.world.companies[0].book.accounts.cash,f.contracts);f.world=paid.world;carrier=paid.carrier;
 let sawInterest=false,sawSuspended=false,closed=null;
 for(let i=0;i<16&&!closed;i++){
  f=seal(step(f,0));const p=P.project(f.world,f.contracts,services(f.world)),c=p.world.companies[0];P.validate(p);
  sawInterest||=c.bankLoans.recognizedInterest>0;sawSuspended||=c.bankLoans.suspendedInterest>0;
  assert.equal(c.bankLoans.recognizedInterest,f.contracts.reduce((n,x)=>n+x.servicing.interestDue,0));assert.equal(c.bankLoans.suspendedInterest,f.contracts.reduce((n,x)=>n+x.servicing.suspendedInterest,0));
  if(c.resolution){closed=p;assert.equal(c.resolution.bankLoanWriteoff,f.world.companies[0].resolution.loanWriteoff.reduce((n,x)=>n+x,0));assert(Object.values(c.bankLoans).every(x=>x===0));}
 }
 assert(sawInterest);assert(sawSuspended);assert(closed,'Bounded stressed fixture must reach the existing liquidation path');
 for(const mutate of [s=>s.world.companies[0].resolution.loanRecovery=[1,2],s=>s.world.companies[0].resolution.bankLoanWriteoff={},s=>s.world.companies[0].resolution.proceeds++,s=>s.world.companies[0].resolution.bankLoanWriteoff++]){const bad=copy(closed);mutate(bad);assert.throws(()=>P.validate(bad));}
});
test('Public statements cannot masquerade as private worlds for the current forecast engine',()=>{
 assert.throws(()=>C.step(statement.world,{demand:1}));assert.throws(()=>V.validate(statement.world,[]));
 assert(P.limitations.some(s=>s.includes('corporateIncomeFlow')));assert(P.limitations.some(s=>s.includes('rival loan terms')));
});
test('Funded insolvency retains positive opening cash and reconciles every liquidation dollar',()=>{
 // Same bounded domain route as the v4 regression: a funded $1M loan and
 // an actual $700K paid carrier expense. No direct balance/claim mutations.
 let f=seal(step(opening()),true,1000000),carrier=G.opening('carrier');
 const cash=()=>[f.world.outside,f.world.creditor,...f.world.companies.map(c=>c.book),...f.banks.map(b=>b.book),carrier].reduce((n,b)=>n+b.accounts.cash,0),total=cash();
 const paid=V.payAgencyPremium(f.world,0,carrier,700000,f.contracts);f.world=paid.world;carrier=paid.carrier;
 assert(f.world.companies[0].book.accounts.equity<0);assert(f.world.companies[0].book.accounts.cash>0);assert.equal(cash(),total);
 f=seal(step(f));assert.equal(cash(),total);
 const p=P.project(f.world,f.contracts,services(f.world)),r=p.world.companies[0].resolution;assert(r);assert(r.openingCash>0);
 assert.equal(r.cashAvailable,r.openingCash+r.proceeds);assert(r.cashAvailable>r.proceeds);
 assert.equal(r.cashAvailable,r.creditorRecovery+r.supplierRecovery+r.equityDistribution+r.bankServiceRecovery+r.bankLoanRecovery);
 assert.equal(r.openingCash,f.world.companies[0].resolution.openingCash);P.validate(p);
 for(const mutate of [r=>r.openingCash++,r=>r.cashAvailable++,r=>r.proceeds++,r=>r.bankLoanRecovery++,r=>delete r.openingCash,r=>r.openingCash={bankA:1}]){const bad=copy(p);mutate(bad.world.companies[0].resolution);assert.throws(()=>P.validate(bad));}
});
console.log(JSON.stringify({status:'PASS',checks,fixtureMonths:months,scope:'Isolated v4 funded-company loan statement boundary; actual accounting validation, no live forecast/UI/transport integration or campaign balance claim.'}));
