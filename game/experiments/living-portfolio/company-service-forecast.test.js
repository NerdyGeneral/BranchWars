'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({});
for(const name of ['accounting','group-accounting','company-finance'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/engine/'+name+'.js'),'utf8'),ctx);
const {A,G,C}=vm.runInContext('({A:AccountingPrototype,G:GroupAccounting,C:CompanyFinance})',ctx),L=require('./loan-contracts');
const V=require('./company-finance-v4')({AccountingPrototype:A,GroupAccounting:G,legacy:C,loans:L});
const P=require('./company-loan-statement')({GroupAccounting:G,companyFinance:V});
const rawF=require('./company-service-forecast')({statement:P}),copy=x=>JSON.parse(JSON.stringify(x));
const expected=i=>({month:i.statement.world.month,ownerIndex:i.ownerIndex,outsideCash:i.outsideCash,ownerServiceClaims:copy(i.ownerServiceClaims),profiles:i.statement.world.companies.map(c=>({market:c.market,baseFee:c.baseFee})),services:copy(i.statement.services)});
const F={quote:i=>rawF.quote(i,expected(i))};
const profiles=Array.from({length:6},(_,i)=>({market:'market'+i,baseFee:10000+2*i}));
let checks=0,months=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const services=w=>w.companies.map((c,i)=>({provider:c.resolution?-1:i%3-1,fee:c.baseFee,served:!c.resolution}));
const opening=()=>({world:V.withLending(C.opening(profiles),['bankA','bankB']),contracts:[],collateral:[],banks:['bankA','bankB'].map(id=>({id,book:A.opening(3),legacyPrincipal:9500000,otherReceivables:0}))});
function snapshot(f,borrow=false){
  const c=f.world.companies[1],held=f.contracts.filter(x=>x.borrowerId===c.id);
  return {version:1,month:f.world.month,banks:f.banks.map(b=>({id:b.id,cash:b.book.accounts.cash,reserve:500000,capital:b.book.accounts.equity,minimumCapitalRatioBps:1000,
    riskWeightedAssets:b.legacyPrincipal+Math.ceil(b.book.accounts.securities*.2)+b.book.accounts.receivables+f.contracts.filter(x=>x.bankId===b.id).reduce((n,x)=>n+Math.ceil(x.commitment*x.originalTerms.riskWeightBps/10000),0),
    originationLimit:1000000,creditWork:10,contractSlots:10000-f.contracts.filter(x=>x.bankId===b.id).length,
    sectorLimits:{general:2000000},sectorExposure:{general:f.contracts.filter(x=>x.bankId===b.id).reduce((n,x)=>n+x.commitment,0)},
    deployments:[{product:'commercial',market:c.market,channel:'physical',status:'active'}]})),
    borrowers:borrow?[{id:c.id,market:c.market,segment:'company',sector:'general',cash:c.book.accounts.cash,existingDebt:c.book.accounts.debt,existingUndrawn:held.reduce((n,x)=>n+x.undrawn,0),borrowingLimit:2000000,collateral:[]}]:[],
    applications:borrow?[{id:'private-application',borrowerId:c.id,product:'commercial',amount:120000,maxAnnualRateBps:2000,minTermMonths:24,collateralId:null,initialDrawBps:10000,channel:'physical'}]:[]};
}
function seal(f,borrow=false){
  if(f.world.lending.activityMonth!==f.world.month)f=V.transact(f.world,{contracts:f.contracts,collateral:f.collateral,banks:f.banks,instructions:[],protectedCash:Object.fromEntries([...f.banks.map(b=>b.id),...f.world.companies.map(c=>c.id)].map(id=>[id,0])),creditWork:{bankA:10,bankB:10}});
  if(f.world.lending.originatedMonth!==f.world.month){const s=snapshot(f,borrow),offers=borrow?s.banks.map(b=>({bankId:b.id,applicationId:'private-application',amount:120000,terms:{annualRateBps:1000,feeBps:100,termMonths:24,underwriting:'balanced'}})):[];f=V.originate(f.world,{contracts:f.contracts,collateral:f.collateral,banks:f.banks,snapshot:s,offers});}
  V.validateSettled(f.world,f.contracts);return f;
}
function input(f,demand,ownerIndex,delivery=null){
  const signed=services(f.world);return {statement:P.project(f.world,f.contracts,signed),outsideCash:f.world.outside.accounts.cash,ownerIndex,ownerServiceClaims:f.world.companies.map(c=>c.bankArrears[ownerIndex]),demand,ownerDelivery:delivery||signed.map(s=>s.served)};
}
function advance(f,demand,delivery=null){
  const signed=services(f.world);if(delivery)for(const [i,s]of signed.entries())if(s.provider===0)s.served=delivery[i];
  months++;return V.step(f.world,{demand,services:signed},{contracts:f.contracts,collateral:f.collateral,banks:f.banks});
}
function compare(q,next){
  const actual=next.world.bankFlows[q.ownerIndex];
  for(const k of ['billed','cash','receivable'])assert.equal(q.totals[k],actual[k],k);
  assert(actual.recovered>=q.totals.recoveredBeforeLoans);
  const extra=actual.recovered-q.totals.recoveredBeforeLoans;
  assert(extra+actual.writtenOff<=q.uncertainty.jointClaimLimit);
  assert.equal(q.totals.remainingClaim-extra-actual.writtenOff,next.world.companies.reduce((n,c)=>n+c.bankArrears[q.ownerIndex],0));
}
test('Both owner seats match actual funded company service stages across economic scenarios',()=>{
  for(const demand of [0,.6,1,1.4,3]){
    let f=opening();
    for(let month=1;month<=12;month++){
      const before=JSON.stringify(f),a=F.quote(input(f,demand,0)),b=F.quote(input(f,demand,1));
      assert.equal(JSON.stringify(f),before);const next=advance(f,demand);compare(a,next);compare(b,next);f=seal(next);
    }
  }
});
test('A real two-lender borrower needs no private contracts in its owner service quote',()=>{
  let f=seal(advance(opening(),1),true);assert.equal(f.contracts.length,2);
  const i=input(f,1,0),before=JSON.stringify(i),q=F.quote(i);assert.equal(JSON.stringify(i),before);
  for(const secret of ['private-application','bankA','bankB','originalTerms','underwriting','contracts'])assert(!JSON.stringify(i).includes(secret),secret);
  const next=advance(f,1);compare(q,next);assert(next.world.lending.flows.some(x=>x.principalPaid>0));
});
test('Cash-starved funded loans and later liquidation remain explicit uncertainty, not invented recovery',()=>{
  let f=seal(advance(opening(),1),true),carrier=G.opening('carrier');
  const paid=V.payAgencyPremium(f.world,1,carrier,f.world.companies[1].book.accounts.cash,f.contracts);f.world=paid.world;carrier=paid.carrier;
  let seenClaim=false,seenResolution=false;
  for(let month=0;month<18;month++){
    const q=F.quote(input(f,0,0)),next=advance(f,0);compare(q,next);
    seenClaim||=q.totals.remainingClaim>0;seenResolution||=!!next.world.companies[1].resolution;
    assert.equal(q.stage,'before-living-loan-service');assert.equal(q.uncertainty.additionalRecovery.min,0);assert.equal(q.uncertainty.writeoff.min,0);
    f=seal(next);
  }
  assert(seenClaim);assert(seenResolution);
});
test('Only owner delivery can be revised; signed rival service terms remain untouched',()=>{
  const f=opening(),i=input(f,1,0);i.ownerDelivery[1]=false;
  const q=F.quote(i),next=advance(f,1,i.ownerDelivery);compare(q,next);assert.equal(q.rows[1].billed,0);
  const bad=input(f,1,0);bad.ownerDelivery[2]=false;assert.throws(()=>F.quote(bad),/rival delivery/);
});
test('Outside settlement cash is finite and sampled once rather than fabricated or recycled',()=>{
  const f=opening(),i=input(f,1,0);i.outsideCash=7;const q=F.quote(i);
  assert.equal(q.rows.reduce((n,r)=>n+r.sales,0),7);assert(q.rows.some(r=>r.sales<r.salesRequested));
  i.outsideCash=0;assert(F.quote(i).rows.every(r=>r.sales===0));
});
test('Malformed, stale-format and secret-bearing inputs are rejected without mutation',()=>{
  const base=input(opening(),1,0);
  for(const mutate of [x=>x.contracts=[],x=>x.ownerIndex=2,x=>x.outsideCash=-1,x=>x.outsideCash=Infinity,x=>x.outsideCash=Number.MAX_SAFE_INTEGER+1,x=>x.demand=4,x=>x.demand=NaN,x=>x.ownerServiceClaims[0]=1,x=>x.ownerDelivery.pop(),x=>x.ownerDelivery[0]=0,x=>x.ownerServiceClaims[1]=.5,x=>x.statement.world.companies[0].privateLoans=[],x=>x.statement.version=2]){
    const bad=copy(base);mutate(bad);assert.throws(()=>F.quote(bad));
  }
  assert.deepEqual(F.quote(copy(base)),F.quote(base));
});
test('An independent current-owner fence rejects otherwise valid stale or cross-owner quote inputs',()=>{
  const f=opening(),i=input(f,1,0),fence=expected(i),next=seal(advance(f,1));
  assert.throws(()=>rawF.quote(i),/snapshot fence/);
  assert.throws(()=>rawF.quote(i,expected(input(next,1,0))),/Stale/);
  assert.throws(()=>rawF.quote(input(f,1,1),fence),/current owner snapshot/);
  const altered=copy(i);altered.outsideCash--;assert.throws(()=>rawF.quote(altered,fence),/current owner snapshot/);
  const claims=copy(fence);claims.ownerServiceClaims[0]++;assert.throws(()=>rawF.quote(i,claims),/current owner snapshot/);
  const changed=copy(fence);changed.services[0].fee++;assert.throws(()=>rawF.quote(i,changed),/roster/);
  assert.deepEqual(rawF.quote(i,fence),F.quote(i));
});
test('Switching providers with unpaid supplier and both-bank claims preserves scarce-cash attribution',()=>{
  let f=seal(advance(opening(),1));
  const paid=V.payAgencyPremium(f.world,1,G.opening('carrier'),f.world.companies[1].book.accounts.cash,f.contracts);f.world=paid.world;
  let sawMixed=false,sawScarcity=false;
  for(let turn=0;turn<5;turn++){
    const signed=services(f.world);if(!f.world.companies[1].resolution)signed[1]={provider:turn%2,fee:100000,served:true};
    const quotes=[0,1].map(owner=>{
      const i=input(f,0,owner);i.statement=P.project(f.world,f.contracts,signed);i.ownerDelivery=signed.map(s=>s.served);return F.quote(i);
    });
    const company=f.world.companies[1],publicCompany=P.project(f.world,f.contracts,signed).world.companies[1];
    const mixed=company.bankArrears.every(n=>n>0)&&publicCompany.supplierPayables>0;
    sawMixed||=mixed;sawScarcity||=mixed&&company.book.accounts.cash+quotes[0].rows[1].sales<publicCompany.supplierPayables+publicCompany.bankServicePayables;
    months++;const next=V.step(f.world,{demand:0,services:signed},{contracts:f.contracts,collateral:f.collateral,banks:f.banks});
    for(const q of quotes)compare(q,next);
    f=seal(next);
  }
  assert(sawMixed,'Actual provider changes should retain unpaid claims to both banks and suppliers');
  assert(sawScarcity,'The shared old-claim pool must be larger than actual available cash');
});
console.log(JSON.stringify({status:'PASS',checks,fixtureMonths:months,scope:'Owner-safe pre-loan company-service forecast prerequisite; not an installed Group7 forecast or final liquidation prediction.'}));
