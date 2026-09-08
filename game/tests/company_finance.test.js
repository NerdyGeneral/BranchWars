'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ctx={console},copy=x=>JSON.parse(JSON.stringify(x));
vm.runInNewContext(['accounting','group-accounting','company-finance'].map(name=>
 fs.readFileSync(path.join(root,'src/engine',name+'.js'),'utf8')).join('\n')+
 '\nthis.C=CompanyFinance;this.G=GroupAccounting;',ctx);
const {C,G}=ctx,profiles=Array.from({length:6},(_,i)=>({market:'market-'+i,baseFee:[18000,30000,50000][i%3]}));
let checks=0,months=0;
const same=(a,b)=>assert.deepEqual(copy(a),copy(b));
function failure(input,fn,pattern){const before=JSON.stringify(input);assert.throws(fn,pattern);
 assert.equal(JSON.stringify(input),before);checks++;}
const opening=C.opening(profiles),initial=C.validate(opening);
assert.equal(opening.companies.length,6);assert.equal(initial.payable,0);
for(const c of opening.companies){assert.equal(c.book.accounts.cash,6*c.baseFee);
 assert.equal(c.book.accounts.equity,60*c.baseFee);assert.equal(c.book.retainedEarnings,0);}
checks++;
const snapshot=JSON.stringify(opening),neutral=C.step(opening,{demand:1});
assert.equal(JSON.stringify(opening),snapshot);assert.equal(C.validate(neutral).cash,initial.cash);
for(const c of neutral.companies){
 const f=c.baseFee;
 assert.equal(c.report.sales,12*f);assert.equal(c.report.operatingCost,10*f);
 assert.equal(c.report.interest,.09*f);assert.equal(c.report.principalPaid,.5*f);
 assert.equal(c.report.servicePaid,f);assert.equal(c.report.profit,.91*f);
 assert.equal(c.book.accounts.cash,6*f+.41*f-c.report.dividend);
 assert.equal(c.book.accounts.equity,60*f+c.report.profit-c.report.dividend);
 assert.equal(c.book.retainedEarnings,c.report.profit-c.report.dividend);
}
checks++;
for(const demand of [NaN,Infinity,-1,4,'1'])failure(opening,()=>C.step(opening,{demand}),/demand/);
failure(opening,()=>C.step(opening,{demand:1,grant:100000}),/demand/);
for(const damage of [
 w=>w.outside.accounts.cash++,w=>w.openingCash++,w=>w.companies[0].baseFee=1,
 w=>w.companies[1].market=w.companies[0].market,w=>w.companies[0].interestArrears=1,
 w=>w.companies[0].principalArrears=999999999,w=>w.companies[0].book.entityId='not-a-company',
 w=>w.companies[0].report={month:0},w=>w.creditor.accounts.businessAssets++
]){const bad=copy(opening);damage(bad);failure(bad,()=>C.validate(bad),/corporate|company|reconcile|unbalanced/i);}
const scenarios=[
 ['neutral',()=>1],['contraction',()=>.5],['growth',()=>1.4],
 ['cycle',month=>month%48<12?.5:month%48<24?.8:month%48<36?1:1.4]
],results=[];
for(const [name,demandAt] of scenarios){
 let world=copy(opening),limited=0,arrears=0;
 const openingEquity=[world.outside,world.creditor,...world.companies.map(c=>c.book)].reduce((n,b)=>n+b.accounts.equity,0);
 for(let month=0;month<480;month++){
   world=C.step(world,{demand:demandAt(month)});months++;
   assert.equal(C.validate(world).cash,initial.cash);
   assert.equal(world.creditor.accounts.businessAssets,world.companies.reduce((n,c)=>n+c.book.accounts.debt+c.interestArrears,0));
   assert.equal(world.outside.accounts.businessAssets,world.recoveredAssets+world.companies.reduce((n,c)=>n+c.book.accounts.payables-c.interestArrears,0));
   assert.equal([world.outside,world.creditor,...world.companies.map(c=>c.book)].reduce((n,b)=>n+b.accounts.equity,0),
     openingEquity-world.companies.reduce((n,c)=>n+(c.resolution?.assetLoss||0),0));
   if(month%60===0)same(C.step(world,{demand:1}),C.step(copy(world),{demand:1}));
   for(const c of world.companies){if(c.report.cashLimited)limited++;arrears=Math.max(arrears,c.book.accounts.payables);
     assert(c.book.journal.length<=64);
     assert(c.resolution||c.book.accounts.payables<33*c.baseFee);
     if(c.resolution){assert.equal(c.book.accounts.cash,0);assert.equal(c.book.accounts.debt,0);
       assert.equal(c.book.accounts.payables,0);assert.equal(c.book.accounts.equity,0);
       if(c.resolution.month<world.month)assert.equal(c.report.sales+c.report.operatingCost+c.report.interest+c.report.serviceDue,0);}}
 }
 if(name==='contraction'){
  assert(world.companies.some(c=>c.resolution));
  assert(world.companies.some(c=>c.resolution.assetLoss>0));
 }
 results.push({name,months:480,limitedCompanyMonths:limited,maxArrears:arrears,
  outsideCash:world.outside.accounts.cash,resolvedCompanies:world.companies.filter(c=>c.resolution).length,
  assetLoss:world.companies.reduce((n,c)=>n+(c.resolution?.assetLoss||0),0),
  bytes:Buffer.byteLength(JSON.stringify(world))});
 checks++;
}
// Exhaust every actual purchaser and company cash balance by funded payments
// to the creditor boundary. No asset sales can now claim a fictional buyer.
let dry=copy(opening);
for(const c of dry.companies){const moved=G.servicePayment(c.book,dry.creditor,c.book.accounts.cash);
 c.book=moved.payer;dry.creditor=moved.provider;
 // Explicit previously incurred, unpaid service obligations exceed the
 // supplier stop; their receivable is recognized by the actual supplier.
 c.book=G.post(c.book,'test.priorInvoice',dry.outside.entityId,{payables:33*c.baseFee,equity:-33*c.baseFee},-33*c.baseFee);
 dry.outside=G.post(dry.outside,'test.priorReceivable',c.id,{businessAssets:33*c.baseFee,equity:33*c.baseFee},33*c.baseFee);}
const drained=G.servicePayment(dry.outside,dry.creditor,dry.outside.accounts.cash);
dry.outside=drained.payer;dry.creditor=drained.provider;C.validate(dry);
const dryBefore=JSON.stringify(dry),failed=C.step(dry,{demand:.5});
assert.equal(JSON.stringify(dry),dryBefore);
assert(failed.companies.every(c=>c.resolution?.proceeds===0&&c.resolution.creditorWriteoff>0&&c.resolution.supplierWriteoff>0));
assert.equal(failed.creditor.accounts.businessAssets,0);assert.equal(failed.outside.accounts.businessAssets,0);
assert.equal(C.validate(failed).cash,initial.cash);
const closed=C.step(failed,{demand:3});
for(const c of closed.companies){assert.equal(c.report.sales,0);assert.equal(c.report.profit,0);
 same(c.book,failed.companies[c.clientIndex].book);}
same(C.step(closed,{demand:1}),C.step(copy(closed),{demand:1}));checks+=3;
for(const damage of [w=>w.recoveredAssets++,w=>w.companies[0].resolution.proceeds++,
 w=>w.companies[0].resolution.month=999,w=>w.companies[0].report.resolutionEarnings++]){
 const bad=copy(closed);damage(bad);failure(bad,()=>C.validate(bad),/corporate|company|reconcile/i);}
console.log(JSON.stringify({passed:true,checks,months,results,
 scope:'Pure six-company settlement kernel; not yet active campaign companies, banking-provider integration or ownership/auctions.'}));
