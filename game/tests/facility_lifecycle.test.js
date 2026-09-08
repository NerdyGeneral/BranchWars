'use strict';
// Domain-only experiment: broader model identities are explicit inherited-roster
// fixtures, NOT proof those buildings can yet be constructed in the live game.
// Provisional calibration: full/basic/off wear 20/70/180 bp monthly, maintenance
// 12%/6%/0% of ordinary upkeep, paid renovation22% new price, two work units,
// one shared capacity, 50% throughput during work, activation next month.
// All capacity is supply potential, never a promise of customers or revenue.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={console},copy=x=>JSON.parse(JSON.stringify(x));
vm.runInNewContext(['src/engine/accounting.js','src/engine/group-accounting.js','experiments/institution/facility-lifecycle.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n')+'\nthis.L=FacilityLifecycle;this.A=AccountingPrototype;this.G=GroupAccounting;',ctx);
const {L,A,G}=ctx,same=(a,b)=>assert.deepEqual(copy(a),copy(b));let checks=0;
function test(label,fn){fn();checks++;console.log('PASS '+label);}
function fixture(models=['retail']){
 return {id:'bank:0',accounting:A.opening(3),provider:G.opening('external:facilities'),
  facilityNetwork:{offices:models.map((model,i)=>({id:'bank:0:office:'+(i+1),market:i===2?'far':'local'+(i%2),model,openedCycle:1,closedCycle:null,conversion:null}))},
  contracts:[{id:'existing',principal:340000}],customers:2000};
}
function context(cycle=1,extra={}){return {cycle,freeCash:2000000,freeExecution:1,workRate:1,
 availableStaffQuarters:Object.fromEntries(L.ROLES.map(r=>[r,400])),wealthLicensed:()=>false,
 nearby:(a,b)=>a===b||a.startsWith('local')&&b.startsWith('local'),
 payCash(p,amount,source){
  const invoice=G.bankServiceInvoice(p.accounting,p.provider,amount,p.id,source);
  const paid=G.settleBankPayable(invoice.bank,invoice.provider,amount,p.id);p.accounting=paid.bank;p.provider=paid.provider;
 },...extra};}
function staffed(models=['retail']){
 let p=L.initialize(fixture(models),1,true),plan=L.allocateStaff(p,context().availableStaffQuarters).plan;
 return L.prepare(p,plan,context()).owner;
}
function condition(p,id,value){p.facilityLifecycle.records[id].conditionBp=value;}
function settle(p,c){
 if(p.facilityLifecycle.lastSettledCycle===c.cycle)return L.settle(p,c);
 if(p.facilityLifecycle.lastActivatedCycle!==c.cycle)p=L.activate(p,c.cycle).owner;
 if(p.facilityLifecycle.lastPreparedCycle!==c.cycle)p=L.prepare(p,L.defaultPlan(p),c).owner;
 if(p.facilityLifecycle.lastAdvancedCycle!==c.cycle)p=L.advance(p,c).owner;
 return L.settle(p,c);
}
test('Explicit initialization never changes balances, customers, contracts or identities',()=>{
 const before=fixture(),saved=copy(before),off=L.initialize(before,1,false);same(off,before);
 const p=L.initialize(before,1,true);same(before,saved);same(p.accounting,before.accounting);same(p.facilityNetwork,before.facilityNetwork);
 assert.equal(p.customers,before.customers);same(p.contracts,before.contracts);L.validate(p,1,true);
 assert.throws(()=>L.initialize(p,1,true));assert.throws(()=>L.validate(p,1,false));
 assert(Object.values(p.facilityLifecycle.records).every(r=>Object.values(r.staffQuarters).every(n=>n===0)));
});
test('Catalog roles are distinct; available staff constrains real throughput',()=>{
 assert.deepEqual(Object.keys(L.CATALOG),['atm','retail','commercial','digital','wealth','financialCenter','regionalHub']);
 const measures={};for(const model of Object.keys(L.CATALOG)){
  const p=staffed([model]);measures[model]=L.metrics(p,context()).rows[0];
  assert(measures[model].upkeep>0);assert(Object.values(L.CATALOG[model].staffQuarters).some(n=>n>0));
 }
 assert.equal(measures.atm.capacity.loanCapacity,0);assert(measures.commercial.capacity.loanCapacity>measures.retail.capacity.loanCapacity);
 assert(measures.retail.capacity.depositCapacity>measures.commercial.capacity.depositCapacity);
 assert(measures.digital.upkeep<measures.retail.upkeep);
 const p=staffed();p.facilityLifecycle.records['bank:0:office:1'].staffQuarters.operations=0;
 assert(Object.values(L.metrics(p,context()).rows[0].capacity).every(n=>n===0));
 const plan=L.defaultPlan(p);plan.offices['bank:0:office:1'].staffQuarters.service=401;assert.throws(()=>L.normalize(p,plan,context()));
 const poor=context(1,{availableStaffQuarters:Object.fromEntries(L.ROLES.map(r=>[r,0]))});
 assert.throws(()=>L.normalize(staffed(),L.defaultPlan(staffed()),poor));
});
test('Wealth office cannot produce unlicensed output; licensed entity capacity is explicit',()=>{
 const p=staffed(['wealth']),before=JSON.stringify(p),off=L.metrics(p,context()),on=L.metrics(p,context(1,{wealthLicensed:()=>true}));
 assert(Object.values(off.rows[0].capacity).every(n=>n===0));assert(on.rows[0].capacity.advisoryCapacity>0);
 assert.equal(off.rows[0].upkeep,on.rows[0].upkeep);assert.equal(JSON.stringify(p),before);
 const center=staffed(['financialCenter']);assert.equal(L.metrics(center,context()).rows[0].capacity.advisoryCapacity,0);
 assert(L.metrics(center,context()).rows[0].capacity.depositCapacity>0);
});
test('Hub links move finite staffed service capacity only across authored nearby markets',()=>{
 let p=settle(staffed(['regionalHub','retail','atm']),context()).owner;p=L.activate(p,2).owner;
 const plan=L.defaultPlan(p),base=L.metrics(p,context(2));
 plan.offices['bank:0:office:2'].hubId='bank:0:office:1';
 p=L.prepare(p,plan,context(2)).owner;const linked=L.metrics(p,context());
 assert.equal(linked.totals.capacity.serviceCapacity,base.totals.capacity.serviceCapacity);
 assert.equal(linked.rows[0].supportSent,linked.rows[1].supportReceived);assert(linked.rows[1].supportReceived>0);
 assert.equal(linked.rows[0].capacity.serviceCapacity+linked.rows[0].supportSent,base.rows[0].capacity.serviceCapacity);
 const remote=L.defaultPlan(p);remote.offices['bank:0:office:3'].hubId='bank:0:office:1';assert.throws(()=>L.normalize(p,remote,context()));
 const wear=copy(p);condition(wear,'bank:0:office:1',0);assert.equal(L.metrics(wear,context()).rows[1].supportReceived,0);
 const inactive=copy(p);condition(inactive,'bank:0:office:2',0);assert.equal(L.metrics(inactive,context()).rows[1].supportReceived,0);
});
test('Routine maintenance pays a real external counterparty exactly once, not ordinary upkeep twice',()=>{
 let p=staffed(),before=copy(p),requested=L.metrics(p,context()).totals.maintenance;
 const settled=settle(p,context());p=settled.owner;
 assert.equal(p.accounting.accounts.cash,before.accounting.accounts.cash-requested);assert.equal(p.provider.accounts.cash,requested);
 assert.equal(p.accounting.accounts.cash+p.provider.accounts.cash,2400000);assert.equal(p.accounting.retainedEarnings,-requested);
 assert.equal(p.accounting.accounts.payables,0);assert.equal(p.provider.accounts.businessAssets,0);
 assert.equal(settled.report.paid,Math.round(L.CATALOG.retail.upkeep*.12));
 assert.equal(p.facilityLifecycle.records['bank:0:office:1'].conditionBp,9980);
 same(settle(p,context()).owner,p);same(before,staffed());L.validate(p,1,true);
});
test('Cash shortage defers physical work without money creation, borrowing or invented financial debt',()=>{
 let p=staffed(['retail','digital','atm']);p.facilityLifecycle.records['bank:0:office:3'].maintenance='off';
 const total=L.metrics(p,context()).totals.maintenance;
 const result=settle(p,context(1,{freeCash:1}));
 assert.equal(result.report.paid,1);assert.equal(result.report.unfunded,total-1);
 assert.equal(result.report.rows[2].paid,0,'Rounding cannot charge a zero-maintenance office');
 assert.equal(result.owner.accounting.accounts.cash,2399999);assert.equal(result.owner.accounting.accounts.emergencyDebt,0);assert.equal(result.owner.accounting.accounts.payables,0);
 assert(Object.values(result.owner.facilityLifecycle.records).every(r=>r.deferredWearBp>0));L.validate(result.owner,1,true);
 const zero=settle(p,context(1,{freeCash:0}));assert.equal(zero.owner.provider.accounts.cash,0);assert.equal(zero.report.paid,0);
});
test('Paid renovation has real tradeoffs, shared work, next-month restoration and idempotent settlement',()=>{
 let p=settle(staffed(),context()).owner;p=L.activate(p,2).owner;
 const cashBefore=p.accounting.accounts.cash;let id='bank:0:office:1';condition(p,id,6000);p.facilityLifecycle.records[id].deferredWearBp=2500;
 let plan=L.defaultPlan(p);plan.renovate=id;const before=JSON.stringify(p),q=L.quote(p,plan,context(2));
 assert(q.eligible);assert.equal(q.renovationCost,Math.round(650000*.22));assert.equal(q.metrics.rows[0].upkeep,q.beforeMetrics.rows[0].upkeep);
 assert.equal(q.metrics.rows[0].capacity.depositCapacity,q.beforeMetrics.rows[0].capacity.depositCapacity*.5);
 assert(q.afterMetrics.rows[0].capacity.depositCapacity>q.beforeMetrics.rows[0].capacity.depositCapacity);assert.equal(JSON.stringify(p),before);
 assert.throws(()=>L.quote(p,plan,context(2,{freeExecution:0})));assert.equal(L.quote(p,plan,context(2,{freeCash:q.total-1})).eligible,false);
 p=L.prepare(p,plan,context(2)).owner;assert.equal(p.accounting.accounts.cash,cashBefore-q.renovationCost);
 same(L.prepare(p,plan,context(2)).owner,p);
 const stalled=L.advance(p,context(2,{freeExecution:0}));assert.equal(stalled.usedCapacity,0);assert.equal(stalled.events[0].type,'renovation.stalled');p=stalled.owner;
 p=settle(p,context(2)).owner;p=L.activate(p,3).owner;p=L.prepare(p,L.defaultPlan(p),context(3)).owner;
 p=L.advance(p,context(3)).owner;assert.equal(p.facilityLifecycle.records[id].renovation.work,1);
 p=settle(p,context(3)).owner;p=L.activate(p,4).owner;p=L.prepare(p,L.defaultPlan(p),context(4)).owner;
 p=L.advance(p,context(4)).owner;assert.equal(p.facilityLifecycle.records[id].renovation.readyCycle,5);
 p=settle(p,context(4)).owner;p=L.activate(p,4).owner;assert.equal(p.facilityLifecycle.records[id].conditionBp,5940,'Routine wear persists during renovation work');
 p=L.activate(p,5).owner;assert.equal(p.facilityLifecycle.records[id].conditionBp,10000);assert.equal(p.facilityLifecycle.records[id].deferredWearBp,0);
 assert.equal(p.facilityLifecycle.records[id].renovations,1);assert.equal(p.facilityLifecycle.records[id].renovation,null);
 same(L.activate(p,5).owner,p);same(p.contracts,fixture().contracts);assert.equal(p.customers,2000);L.validate(p,5,true);
});
test('Cancellation, closure and conversion retain wear and obligations; no automatic refunds',()=>{
 let p=settle(staffed(),context()).owner;p=L.activate(p,2).owner;
 let id='bank:0:office:1';condition(p,id,6520);let plan=L.defaultPlan(p);plan.renovate=id;p=L.prepare(p,plan,context(2)).owner;
 p=settle(p,context(2)).owner;p=L.activate(p,3).owner;
 const cash=p.accounting.accounts.cash;plan=L.defaultPlan(p);plan.cancel=id;p=L.prepare(p,plan,context(3)).owner;
 assert.equal(p.accounting.accounts.cash,cash);assert.equal(p.facilityLifecycle.records[id].conditionBp,6500);
 p.facilityNetwork.offices[0].model='commercial';assert.equal(L.metrics(p,context()).rows[0].conditionBp,6500,'Conversion cannot erase wear for free');
 p.facilityNetwork.offices[0].closedCycle=3;p=L.close(p,id);L.validate(p,3,true);
 assert.equal(p.accounting.accounts.cash,cash);assert.equal(L.metrics(p,context()).totals.maintenance,0);assert.equal(p.facilityLifecycle.records[id].conditionBp,6500);
});
test('Newly registered canonical office ramps without creating identity, cash or customers',()=>{
 let p=settle(staffed(),context()).owner;p=L.activate(p,2).owner;
 const before=copy(p.accounting),o={id:'bank:0:office:2',market:'local1',model:'atm',openedCycle:2,closedCycle:null,conversion:null};
 p.facilityNetwork.offices.push(o);p=L.register(p,o.id,2);same(p.accounting,before);assert.equal(p.facilityNetwork.offices.length,2);
 let plan=L.allocateStaff(p,context().availableStaffQuarters).plan;p=L.prepare(p,plan,context(2)).owner;
 assert.equal(L.metrics(p,context()).rows[1].ramp,.25);
 for(let cycle=2;cycle<5;cycle++)p=settle(p,context(cycle)).owner;
 assert.equal(L.metrics(p,context()).rows[1].ramp,1);assert.equal(p.customers,2000);L.validate(p,5,true);
 assert.throws(()=>L.register(p,o.id,2));
});
test('Failed real-cash posting is atomic; callbacks cannot mutate the caller owner',()=>{
 const p=staffed(),saved=JSON.stringify(p);assert.throws(()=>settle(p,context(1,{payCash(next){next.customers=0;throw Error('Counterparty rejected');}})));
 assert.equal(JSON.stringify(p),saved);
 assert.throws(()=>settle(p,context(1,{payCash(){}})),'An empty adapter cannot manufacture a paid maintenance report');
 assert.equal(JSON.stringify(p),saved);
 const poor=copy(p);poor.accounting=A.transact(poor.accounting,'buySecurities',poor.accounting.accounts.cash);
 const frozen=JSON.stringify(poor);assert.throws(()=>settle(poor,context()));assert.equal(JSON.stringify(poor),frozen);
});
test('Contribution attribution partitions actual market books without income or customer duplication',()=>{
 const p=staffed(['retail','commercial','atm']);p.facilityNetwork.offices[1].market='local0';
 const books={local0:{customers:301,deposits:1000003,loans:700003,revenue:12003,expense:8003},empty:{customers:17,deposits:123,loans:456,revenue:789,expense:12}};
 const before=JSON.stringify(p),a=L.attribute(p,context(),books);
 for(const field of Object.keys(books.local0))assert.equal(a.rows.reduce((n,r)=>n+r[field],0)+Object.values(a.unattributed).reduce((n,r)=>n+r[field],0),Object.values(books).reduce((n,r)=>n+r[field],0));
 assert.equal(a.rows.reduce((n,r)=>n+r.contribution,0),books.local0.revenue-books.local0.expense);assert.equal(JSON.stringify(p),before);
});
test('Malformed versions, identity bindings, staff, renovation and reports are rejected without repair',()=>{
 const p=settle(staffed(),context()).owner;
 for(const mutate of [x=>{x.facilityLifecycle.version=2;},x=>{delete x.facilityLifecycle.records['bank:0:office:1'];},
  x=>{x.facilityLifecycle.records['bank:0:office:1'].conditionBp=10001;},x=>{x.facilityLifecycle.records['bank:0:office:1'].staffQuarters.service=.5;},
  x=>{x.facilityLifecycle.records['bank:0:office:1'].hubId='missing';},x=>{x.facilityLifecycle.report.paid++;},
  x=>{x.facilityLifecycle.history[0].rows[0].conditionAfter++;},x=>{x.facilityLifecycle.lastSettledCycle=2;}]){
  const bad=copy(p);mutate(bad);const before=JSON.stringify(bad);assert.throws(()=>L.validate(bad,1,true));assert.equal(JSON.stringify(bad),before);
 }
 same(copy(p),p);L.validate(copy(p),1,true);
});
test('Phase order rejects skipped, future and stale closings while replay preserves consumed execution',()=>{
 let p=staffed(),id='bank:0:office:1';
 assert.throws(()=>L.settle(p,context()),'A prepared month must advance its shared execution before closing');
 assert.throws(()=>L.prepare(p,L.defaultPlan(p),context(3)));assert.throws(()=>L.advance(p,context(2)));
 assert.throws(()=>L.activate(p,2),'Cannot activate a future month before current closing');
 p=settle(p,context()).owner;p=L.activate(p,2).owner;condition(p,id,6500);
 const plan=L.defaultPlan(p);plan.renovate=id;p=L.prepare(p,plan,context(2)).owner;
 const first=L.advance(p,context(2,{workRate:2}));assert.equal(first.usedCapacity,1);
 const repeated=L.advance(first.owner,context(2,{freeExecution:0}));same(repeated.owner,first.owner);
 assert.equal(repeated.usedCapacity,1,'Completed-but-not-activated job still consumed this month execution');
 assert.equal(repeated.events.length,0);p=L.settle(repeated.owner,context(2)).owner;
 assert.equal(L.advance(p,context(2)).usedCapacity,1);same(L.settle(p,context(2)).owner,p);
 p=L.activate(p,3).owner;assert.equal(p.facilityLifecycle.records[id].renovation,null);
 assert.throws(()=>L.advance(p,context(2)),'A new planning month cannot replay earlier capacity as fresh work');
 const fresh=L.initialize(fixture(),1,true);assert.throws(()=>L.advance(fresh,context()),'Unprepared work cannot advance');
 const future=fixture();future.facilityNetwork.offices[0].openedCycle=4;assert.throws(()=>L.initialize(future,1,true));
});
test('Plan contexts reject invalid cash, execution, month, wear, occupancy and shared pools',()=>{
 const p=staffed(),plan=L.defaultPlan(p);
 for(const override of [{cycle:0},{cycle:.5},{cycle:Infinity},{freeCash:-1},{freeCash:.5},{freeCash:NaN},
  {freeExecution:-1},{freeExecution:Infinity},{extraWearBp:NaN},{extraWearBp:-1},{extraWearBp:201},
  {occupiedMarkets:'local0'},{occupiedMarkets:[null]},{restriction:{}},{availableStaffQuarters:{service:4}}]){
  const c=context(1,override);assert.throws(()=>L.normalize(p,plan,c));assert.throws(()=>L.quote(p,plan,c));
 }
 for(const override of [{workRate:-1},{workRate:Infinity},{freeExecution:NaN}])assert.throws(()=>L.advance(p,context(1,override)));
 assert.throws(()=>L.settle(p,context(1,{extraWearBp:NaN})));assert.throws(()=>L.prepare(p,plan,context(1,{freeCash:-1})), 'Even idempotent preparations validate context');
});
test('Age, ramp, registration, phase counters and closing-history tampering cannot be silently accepted',()=>{
 const p=settle(staffed(),context()).owner,id='bank:0:office:1';
 for(const mutate of [x=>{x.facilityLifecycle.records[id].ageMonths=0;},x=>{x.facilityLifecycle.records[id].initialRampMonths=0;},
  x=>{x.facilityLifecycle.records[id].registeredCycle=2;},x=>{x.facilityLifecycle.lastPreparedCycle=0;},
  x=>{x.facilityLifecycle.lastAdvancedCycle=0;},x=>{x.facilityLifecycle.lastAdvanceCapacity=4097;},
  x=>{x.facilityLifecycle.history=[];},x=>{x.facilityLifecycle.history[0].cycle=2;},x=>{x.facilityLifecycle.startedCycle=2;}]){
  const bad=copy(p);mutate(bad);const before=JSON.stringify(bad);assert.throws(()=>L.validate(bad,1,true));assert.equal(JSON.stringify(bad),before);
 }
 const opened=L.initialize(fixture(),1,true);opened.facilityLifecycle.records[id].ageMonths=1;assert.throws(()=>L.validate(opened,1,true));
});
test('Workforce losses reduce physical throughput and unlicensed hubs cannot manufacture advisory service',()=>{
 const p=staffed(['regionalHub','wealth']),plan=L.defaultPlan(p);plan.offices['bank:0:office:2'].hubId='bank:0:office:1';
 let linked=settle(p,context()).owner;linked=L.activate(linked,2).owner;linked=L.prepare(linked,plan,context(2)).owner;
 const unlicensed=L.metrics(linked,context(2));assert.equal(unlicensed.rows[1].supportReceived,0);assert.equal(unlicensed.rows[1].capacity.serviceCapacity,0);
 const licensed=L.metrics(linked,context(2,{wealthLicensed:()=>true}));assert(licensed.rows[1].supportReceived>0);
 const pool=copy(context().availableStaffQuarters);pool.operations=1;pool.service=1;
 const constrained=L.metrics(linked,context(2,{wealthLicensed:()=>true,availableStaffQuarters:pool}));
 assert(constrained.totals.capacity.serviceCapacity<licensed.totals.capacity.serviceCapacity);
 assert(constrained.rows.reduce((n,r)=>n+r.effectiveStaffQuarters.operations,0)<=pool.operations);
 assert(constrained.rows.reduce((n,r)=>n+r.effectiveStaffQuarters.service,0)<=pool.service);
});
test('Extreme safe dollar apportionment conserves cents-free quantities and rejects overflow economics',()=>{
 const p=staffed(['retail','commercial','atm']);p.facilityNetwork.offices.forEach(o=>o.market='local0');
 p.facilityLifecycle.records['bank:0:office:3'].staffQuarters=Object.fromEntries(L.ROLES.map(r=>[r,0]));
 const max=Number.MAX_SAFE_INTEGER,books={local0:{customers:max,deposits:max,loans:max,revenue:max,expense:max}};
 const report=L.attribute(p,context(),books);
 for(const field of Object.keys(books.local0))assert.equal(report.rows.reduce((n,r)=>n+BigInt(r[field]),0n)+BigInt(report.unattributed.local0[field]),BigInt(max));
 assert.equal(report.rows[2].customers,0);assert.equal(report.rows[2].deposits,0);assert.equal(report.rows[2].revenue,0,'Zero throughput must not receive rounding leftovers');
 const huge=context(1,{modelTerms:()=>({cost:max,upkeep:max,capacity:{depositCapacity:1,loanCapacity:1,serviceCapacity:1,advisoryCapacity:0}})});
 assert.throws(()=>L.metrics(p,huge),'Aggregate upkeep cannot exceed integer ledger range');
 assert.throws(()=>L.attribute(p,context(),{a:books.local0,b:books.local0}),'Aggregate attribution cannot exceed safe ledger range');
});
test('120-month care policies diverge persistently and 480-month funded care remains deterministic',()=>{
 const results={};for(const mode of ['off','basic','full']){
  let p=staffed(['atm']);p.facilityLifecycle.records['bank:0:office:1'].maintenance=mode;
  for(let cycle=1;cycle<=120;cycle++)p=settle(p,context(cycle,{freeCash:p.accounting.accounts.cash})).owner;
  results[mode]=p;L.validate(p,120,true);
 }
 assert(results.off.facilityLifecycle.records['bank:0:office:1'].conditionBp<results.basic.facilityLifecycle.records['bank:0:office:1'].conditionBp);
 assert(results.basic.facilityLifecycle.records['bank:0:office:1'].conditionBp<results.full.facilityLifecycle.records['bank:0:office:1'].conditionBp);
 assert(results.off.provider.accounts.cash<results.basic.provider.accounts.cash);assert(results.basic.provider.accounts.cash<results.full.provider.accounts.cash);
 let a=staffed(['atm']),b=copy(a);for(let cycle=1;cycle<=480;cycle++){
  a=settle(a,context(cycle,{freeCash:a.accounting.accounts.cash})).owner;b=settle(b,context(cycle,{freeCash:b.accounting.accounts.cash})).owner;
  assert.equal(a.accounting.accounts.cash+a.provider.accounts.cash,2400000);L.validate(a,cycle,true);
 }same(a,b);assert.equal(a.facilityLifecycle.history.length,48);assert.equal(a.customers,2000);
});
console.log(JSON.stringify({passed:true,checks,maintenanceMonths:1320,scope:'Unintegrated lifecycle/catalog domain, real paired cash primitives, finite staffing/support/attribution, no free wealth or customers. Root must integrate canonical broader models, monthly upkeep/capacity/UI and saved-state compatibility.'}));
