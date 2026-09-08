'use strict';
// Quarantined next-step kernel tests. Explicit workload/reservation fixtures,
// not full campaigns, feature registry/save compatibility, UI or live workload
// attribution. Nothing from this candidate is registered in the shipped build.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),ctx={console};
vm.createContext(ctx);vm.runInContext(read('src/engine/accounting.js')+'\n'+read('src/engine/group-accounting.js')+'\n'+read('experiments/institution/department-functions.js')+'\nthis.D=DepartmentFunctions;this.A=AccountingPrototype;this.G=GroupAccounting;',ctx);
const {D,A,G}=ctx,copy=x=>JSON.parse(JSON.stringify(x)),plain=x=>copy(x);let checks=0;
function test(name,fn){try{fn();checks++;}catch(error){error.message=name+': '+error.message;throw error;}}
function context(cycle=1){return {cycle,headcount:8,physicalQuarters:{service:12,business:8,lending:8,operations:4},
 retainedQuarters:Object.fromEntries(D.IDS.map(id=>[id,Object.fromEntries(D.ROLES.map(r=>[r,0]))])),
 workloads:Object.fromEntries(D.IDS.map(id=>[id,10])),vendorSupply:Object.fromEntries(D.IDS.map(id=>[id,4])),freeCash:500000};}
const base={id:'bank:fixture',accounting:A.opening(3),unrelated:{loans:'remain elsewhere'},stats:{staff:8}},p=D.initialize(base,1,true),supplier=G.opening('department:test-vendor');
const payment={supplier,pay(bank,provider,amount,id,source){const invoice=G.bankServiceInvoice(bank,provider,amount,id,source);return G.settleBankPayable(invoice.bank,invoice.provider,amount,id);}};
test('explicit enablement only',()=>{assert.deepEqual(plain(D.initialize(base,1,false)),plain(base));assert.equal(base.departmentFunctions,undefined);assert(D.validate(p));assert.equal(D.defaultPlan(base),null);
 const off=D.quote(base,undefined,undefined);assert.equal(off.enabled,false);assert.equal(off.vendorExpense,0);assert.equal(off.remainingPools,null);assert.throws(()=>D.quote(base,D.defaultPlan(p),context()),/disabled/);
 assert.throws(()=>D.initialize(p,1,false),/discard/);assert.throws(()=>D.initialize(p,1,true),/fresh/);assert.throws(()=>D.initialize(base,0,true));});
test('disabled settlement preserves all owner bytes and adds no supplier',()=>{const q=D.settle(base,null,null);assert.deepEqual(plain(q.owner),plain(base));assert.equal(q.supplier,null);assert.equal(q.owner.departmentFunctions,undefined);});
test('zero defaults preserve finite pools and expose real unmet work',()=>{const q=D.quote(p,undefined,context());assert(q.eligible);assert.deepEqual(plain(q.remainingPools),context().physicalQuarters);assert.equal(q.rows.length,8);assert(q.rows.every(r=>r.capacity===0&&r.shortfall===10&&r.served===0));});
test('retained work credited but subtracted only once',()=>{const c=context(),plan=D.defaultPlan(p);c.retainedQuarters.onboarding.service=4;c.retainedQuarters.collections.lending=2;c.retainedQuarters.relationships.business=4;
 plan.quotas.relationships.service=3;plan.quotas.credit.lending=2;plan.quotas.technology.operations=2;const q=D.quote(p,plan,c);
 assert(q.eligible);assert.deepEqual(plain(q.remainingPools),{service:5,business:4,lending:4,operations:2});
 for(const r of D.ROLES)assert.equal(q.retainedPools[r]+q.allocatedPools[r]+q.remainingPools[r],c.physicalQuarters[r]);
 assert.equal(q.rows.find(r=>r.id==='onboarding').capacity,4);assert.equal(q.rows.find(r=>r.id==='relationships').capacity,7);assert.equal(q.rows.find(r=>r.id==='relationships').shortfall,3);});
test('no specialist bonus can become headcount',()=>{const c=context();c.physicalQuarters.service=13;assert.throws(()=>D.quote(p,undefined,c),/headcount/);c.physicalQuarters.service=12;c.specialistMultiplier=2;assert.throws(()=>D.quote(p,undefined,c),/context/);});
test('even internally consistent context cannot invent employed staff',()=>{const c=context();c.headcount=9;c.physicalQuarters.service=16;assert.throws(()=>D.quote(p,undefined,c),/employed physical/);const bad=copy(p);bad.stats.staff=1.5;assert.throws(()=>D.quote(bad,undefined,context()),/physical workforce/);});
test('teaching reductions and prior reservations constrain the same pool',()=>{const c=context(),plan=D.defaultPlan(p);c.physicalQuarters.service=8;c.retainedQuarters.onboarding.service=5;plan.quotas.relationships.service=4;
 const q=D.quote(p,plan,c);assert.equal(q.eligible,false);assert.equal(q.overcommittedPools.service,1);assert.equal(q.remainingPools.service,0);assert.match(q.reason,/service staff/);assert.throws(()=>D.settle(p,plan,c),/service staff/);
 c.retainedQuarters.onboarding.service=9;assert.throws(()=>D.quote(p,plan,c),/Retained/);});
test('wrong physical disciplines and malformed scalar versions rejected',()=>{for(const bad of [null,[],{}, {quotas:{},vendors:{}}])assert.throws(()=>D.quote(p,bad,context()));
 for(const value of [-1,.5,NaN,Infinity,'1',401]){const plan=D.defaultPlan(p);plan.quotas.relationships.service=value;assert.throws(()=>D.quote(p,plan,context()));}
 const plan=D.defaultPlan(p);plan.quotas.technology.service=1;assert.throws(()=>D.quote(p,plan,context()),/physical-role/);
 const bad=copy(p);bad.departmentFunctions.version=2;assert.throws(()=>D.validate(bad),/book/);});
test('every prerequisite field exact, no silent instruction stripping',()=>{const plan=D.defaultPlan(p);plan.borrow=500000;assert.throws(()=>D.quote(p,plan,context()));
 const c=context();c.retainedQuarters.onboarding.extra=1;assert.throws(()=>D.quote(p,undefined,c));
 for(const field of ['headcount','freeCash','cycle']){const bad=context();delete bad[field];assert.throws(()=>D.quote(p,undefined,bad));}});
test('vendors are finite purchased throughput, never physical pool',()=>{const plan=D.defaultPlan(p);plan.vendors.onboarding=4;const c=context(),q=D.quote(p,plan,c);
 assert.equal(q.vendorExpense,8800);assert.equal(q.rows.find(r=>r.id==='onboarding').capacity,4);assert.deepEqual(plain(q.remainingPools),c.physicalQuarters);assert.equal(q.remainingVendorSupply.onboarding,0);
 plan.vendors.onboarding=5;assert.match(D.quote(p,plan,c).reason,/Finite vendor/);plan.vendors.onboarding=17;assert.throws(()=>D.quote(p,plan,c),/vendor quota/);});
test('vendor idle capacity still charged; no fabricated customers or profit',()=>{const c=context(),plan=D.defaultPlan(p);c.workloads.technology=0;plan.vendors.technology=2;const q=D.quote(p,plan,c),r=q.rows.find(r=>r.id==='technology');
 assert.equal(r.served,0);assert.equal(r.idle,2);assert.equal(q.vendorExpense,7000);assert(!('deposits' in q));assert(!('executionCapacity' in q));assert(!('customers' in q));});
test('all finite function rows priced independently',()=>{const plan=D.defaultPlan(p);for(const id of D.IDS)plan.vendors[id]=1;const q=D.quote(p,plan,context());assert.equal(q.vendorExpense,Object.values(D.FUNCTIONS).reduce((sum,row)=>sum+row.vendorRate,0));});
test('unfunded vendor work cannot activate and no-spend month can',()=>{const c=context(),plan=D.defaultPlan(p);c.freeCash=0;plan.vendors.people=1;assert.match(D.quote(p,plan,c).reason,/funded cash/);assert.throws(()=>D.settle(p,plan,c,payment),/funded cash/);
 plan.vendors.people=0;const q=D.settle(p,plan,c);assert.equal(q.owner.departmentFunctions.lastCycle,1);assert.equal(q.owner.departmentFunctions.paid,0);assert.deepEqual(plain(q.owner.accounting),plain(p.accounting));});
test('quote and returned preview objects are immutable relative to inputs',()=>{const plan=D.defaultPlan(p),c=context(),before=JSON.stringify({p,plan,c});const q=D.quote(p,plan,c);q.policy.quotas.people.operations=4;q.remainingPools.service=99;q.basis.workloads.people=999;
 assert.equal(JSON.stringify({p,plan,c}),before);assert.equal(D.defaultPlan(p).quotas.people.operations,0);});
test('missing payment adapter, no-op, invoice-only and forged funds rejected',()=>{const plan=D.defaultPlan(p);plan.vendors.risk=1;const c=context();
 for(const pay of [undefined,(bank,provider)=>({bank,provider}),(bank,provider,n,id,source)=>G.bankServiceInvoice(bank,provider,n,id,source),
  (bank,provider,n,id,source)=>{const q=payment.pay(bank,provider,n,id,source);q.bank=A.transact(q.bank,'deposit',n);return q;}]){
  const before=JSON.stringify({p,supplier});assert.throws(()=>D.settle(p,plan,c,{supplier,pay}));assert.equal(JSON.stringify({p,supplier}),before);
 }
 const poor=copy(p),cash=poor.accounting.accounts.cash;poor.accounting=A.post(poor.accounting,'fixture.assetReallocation',{cash:-cash,securities:cash});assert.throws(()=>D.settle(poor,plan,c,payment),/actual bank cash/);});
test('actual paired supplier payment conserves resources and charges once',()=>{const plan=D.defaultPlan(p);plan.vendors.onboarding=2;plan.quotas.people.operations=1;const before=JSON.stringify({p,supplier}),q=D.settle(p,plan,context(),payment),expense=4400;
 assert.equal(JSON.stringify({p,supplier}),before);assert.equal(p.accounting.accounts.cash-q.owner.accounting.accounts.cash,expense);assert.equal(q.supplier.accounts.cash-supplier.accounts.cash,expense);
 assert.equal(q.owner.accounting.accounts.cash+q.supplier.accounts.cash,p.accounting.accounts.cash+supplier.accounts.cash);
 assert.equal(q.owner.accounting.accounts.deposits,p.accounting.accounts.deposits);assert.equal(q.owner.accounting.accounts.loans,p.accounting.accounts.loans);
 assert.equal(q.owner.accounting.retainedEarnings,p.accounting.retainedEarnings-expense);assert.equal(q.owner.departmentFunctions.paid,expense);assert.deepEqual(plain(q.owner.unrelated),plain(p.unrelated));
 A.check(q.owner.accounting);G.validate(q.supplier);assert(D.validate(q.owner));assert.throws(()=>D.settle(q.owner,plan,context(),{...payment,supplier:q.supplier}),/next unsettled/);});
test('callback failure cannot mutate the input books',()=>{const plan=D.defaultPlan(p);plan.vendors.people=1;const before=JSON.stringify({p,supplier});assert.throws(()=>D.settle(p,plan,context(),{supplier,pay(bank,provider){bank.accounts.cash=0;provider.accounts.cash=0;throw Error('adapter-failed');}}),/adapter-failed/);assert.equal(JSON.stringify({p,supplier}),before);});
test('persistent manual policies and reports survive long strict sequential history',()=>{let owner=copy(p),provider=copy(supplier);const plan=D.defaultPlan(p);plan.quotas.treasury.business=1;plan.vendors.people=1;
 for(let cycle=1;cycle<=60;cycle++){const result=D.settle(owner,cycle===1?plan:undefined,context(cycle),{...payment,supplier:provider});owner=result.owner;provider=result.supplier;assert(D.validate(owner));}
 assert.equal(owner.departmentFunctions.paid,60*2400);assert.equal(owner.departmentFunctions.historyBasePaid,36*2400);assert.equal(owner.departmentFunctions.history.length,24);
 assert.equal(D.defaultPlan(owner).quotas.treasury.business,1);assert.equal(owner.departmentFunctions.report.rows.find(r=>r.id==='treasury').shortfall,9);
 assert.equal(owner.accounting.accounts.cash+provider.accounts.cash,p.accounting.accounts.cash+supplier.accounts.cash);
 const resumed=JSON.parse(JSON.stringify(owner));assert(D.validate(resumed));assert.deepEqual(plain(D.quote(resumed,undefined,context(61))),plain(D.quote(owner,undefined,context(61))));
 for(const mutate of [b=>b.report.rows[0].served++,b=>b.history[0].basis.physicalQuarters.service++,b=>b.paid++,b=>b.historyBasePaid++,b=>b.policy.vendors.people=0,b=>b.history.pop()]){const bad=copy(owner);mutate(bad.departmentFunctions);assert.throws(()=>D.validate(bad));}});
test('input feature and enabled book presence cannot be faked',()=>{for(const value of [null,false,0,{},[]]){const bad=copy(base);bad.departmentFunctions=value;assert.throws(()=>D.quote(bad,undefined,context()));}
 const c=context();c.cycle=2;assert.throws(()=>D.quote(p,undefined,c),/next unsettled/);});
function mandate(extra={}){return {priorities:[...D.IDS],maxAdditionalQuarters:8,maxVendorExpense:0,floorQuarters:{service:2,business:2,lending:2,operations:1},...extra};}
test('review-only proposal/cancel/determinism preserve every input and strategic owner field',()=>{const plan=D.defaultPlan(p),c=context(),m=mandate(),before=JSON.stringify({p,plan,c,m});
 plan.quotas.people.operations=1;const original=JSON.stringify({p,plan,c,m}),a=D.propose(p,plan,c,m),b=D.propose(p,plan,c,m);
 assert.equal(JSON.stringify({p,plan,c,m}),original);assert.deepEqual(plain(a),plain(b));assert(a.eligible);assert.equal(a.additionalQuarters,8);assert.equal(a.policy.quotas.people.operations,1);assert(a.changes.every(row=>row.kind==='staff'));
 assert(a.reasons.some(s=>s.includes('Preview only')));assert.equal(p.departmentFunctions.lastCycle,0);assert.equal(p.departmentFunctions.paid,0);
 // Cancel means discarding this return value: no rollback call or debit exists.
 a.policy.quotas.people.operations=99;a.remainingPools.operations=99;assert.equal(JSON.stringify({p,plan,c,m}),original);assert.notEqual(original,before);
});
test('staff floors and existing retained reservations conserve all four role pools',()=>{const c=context(),plan=D.defaultPlan(p);c.retainedQuarters.onboarding.service=3;c.retainedQuarters.collections.lending=2;plan.quotas.treasury.business=1;
 const m=mandate({maxAdditionalQuarters:400}),a=D.propose(p,plan,c,m),q=D.quote(p,a.policy,c);assert(a.eligible);
 for(const role of D.ROLES){assert(a.remainingPools[role]>=m.floorQuarters[role]);assert.equal(q.retainedPools[role]+q.allocatedPools[role]+a.remainingPools[role],c.physicalQuarters[role]);}
 for(const id of D.IDS)for(const role of D.ROLES)assert(a.policy.quotas[id][role]>=plan.quotas[id][role]);
 assert.equal(a.additionalQuarters,a.changes.reduce((n,row)=>n+row.quarters,0));
});
test('measured shortfall only: zero work and exhausted limits are no-op',()=>{const c=context(),plan=D.defaultPlan(p);for(const id of D.IDS)c.workloads[id]=0;
 const a=D.propose(p,plan,c,mandate({maxVendorExpense:500000}));assert(a.eligible);assert.deepEqual(plain(a.policy),plain(plan));assert.equal(a.changes.length,0);
 const capped=D.propose(p,plan,context(),mandate({maxAdditionalQuarters:0,maxVendorExpense:0}));assert(capped.eligible);assert.equal(capped.changes.length,0);assert(capped.shortfalls.every(r=>r.before===r.after));
 const held=D.propose(p,plan,context(),mandate({floorQuarters:copy(context().physicalQuarters)}));assert(held.eligible);assert.equal(held.additionalQuarters,0);assert.equal(held.changes.length,0);
});
test('priority is explicit and only compatible physical disciplines are used',()=>{const c=context(),plan=D.defaultPlan(p),order=['technology',...D.IDS.filter(id=>id!=='technology')];
 const a=D.propose(p,plan,c,mandate({priorities:order,maxAdditionalQuarters:4}));assert.equal(a.changes[0].id,'technology');assert.equal(a.changes[0].role,'operations');assert.equal(a.changes[0].quarters,3);
 for(const change of a.changes.filter(x=>x.kind==='staff'))assert(D.FUNCTIONS[change.id].roles.includes(change.role));
 assert.equal(a.policy.quotas.technology.service,0);assert.equal(a.remainingPools.operations,1);
});
test('existing vendor orders count toward total envelope and quotes do not charge',()=>{const plan=D.defaultPlan(p),c=context();plan.vendors.relationships=1;
 const m=mandate({maxAdditionalQuarters:0,maxVendorExpense:7400}),before=JSON.stringify({p,plan,c}),a=D.propose(p,plan,c,m);
 assert(a.eligible);assert.equal(a.totalVendorExpense,6000);assert.equal(a.additionalVendorExpense,3000);assert.equal(a.policy.vendors.relationships,2);assert.equal(a.remainingVendorSupply.relationships,2);
 assert.equal(JSON.stringify({p,plan,c}),before);assert(a.totalVendorExpense<=m.maxVendorExpense);
 const q=D.settle(p,a.policy,c,payment);assert.equal(p.accounting.accounts.cash-q.owner.accounting.accounts.cash,6000);assert.equal(q.supplier.accounts.cash-supplier.accounts.cash,6000);
});
test('finite supply and protected cash block vendor additions without free capacity',()=>{const plan=D.defaultPlan(p),c=context();c.freeCash=3500;c.vendorSupply.relationships=1;
 const a=D.propose(p,plan,c,mandate({maxAdditionalQuarters:0,maxVendorExpense:500000}));assert(a.eligible);assert.equal(a.totalVendorExpense,3000);assert.equal(a.policy.vendors.relationships,1);assert.equal(a.remainingVendorSupply.relationships,0);
 assert.equal(a.additionalQuarters,0);assert.deepEqual(plain(a.remainingPools),c.physicalQuarters);
 c.freeCash=0;const none=D.propose(p,plan,c,mandate({maxAdditionalQuarters:0,maxVendorExpense:500000}));assert.equal(none.changes.length,0);assert.equal(none.totalVendorExpense,0);
 for(const id of D.IDS)c.vendorSupply[id]=0;c.freeCash=500000;assert.equal(D.propose(p,plan,c,mandate({maxAdditionalQuarters:0,maxVendorExpense:500000})).changes.length,0);
});
test('pre-existing conflicts are not silently repaired by deleting explicit instructions',()=>{const c=context(),plan=D.defaultPlan(p);plan.quotas.relationships.service=12;
 const floor=D.propose(p,plan,c,mandate());assert.equal(floor.eligible,false);assert.equal(floor.changes.length,0);assert.deepEqual(plain(floor.policy),plain(plan));assert.match(floor.reasons[0],/protected floor/);
 plan.quotas.relationships.service=13;const over=D.propose(p,plan,c,mandate());assert.equal(over.eligible,false);assert.equal(over.changes.length,0);assert.match(over.reasons[0],/repaired explicitly/);
 plan.quotas.relationships.service=0;plan.vendors.people=1;const cost=D.propose(p,plan,c,mandate({maxVendorExpense:1000}));assert.equal(cost.eligible,false);assert.equal(cost.policy.vendors.people,1);assert.match(cost.reasons[0],/vendor orders exceed/);
});
test('strict mandate schema rejects omitted priorities, duplicate systems, negatives and authority expansions',()=>{for(const change of [m=>m.priorities.pop(),m=>m.priorities[0]=m.priorities[1],m=>m.priorities[0]='borrow',m=>m.maxAdditionalQuarters=.5,m=>m.maxVendorExpense=-1,m=>m.floorQuarters.operations=NaN,m=>m.borrow=100000,m=>delete m.floorQuarters]){
 const m=mandate();change(m);assert.throws(()=>D.propose(p,undefined,context(),m),/mandate/);
 }
 const off=D.propose(base,null,null,mandate());assert.equal(off.enabled,false);assert.equal(off.policy,null);assert.equal(off.changes.length,0);assert.equal(off.totalVendorExpense,0);
});
test('reported exact changes reconstruct the proposed policy without hidden adoption',()=>{const plan=D.defaultPlan(p),c=context(),a=D.propose(p,plan,c,mandate({maxVendorExpense:50000})),replay=copy(plan);
 for(const change of a.changes){if(change.kind==='staff'){assert.equal(replay.quotas[change.id][change.role],change.from);replay.quotas[change.id][change.role]=change.to;assert.equal(change.to-change.from,change.quarters);}
 else{assert.equal(replay.vendors[change.id],change.from);replay.vendors[change.id]=change.to;assert.equal(change.expense,change.quarters*D.FUNCTIONS[change.id].vendorRate);}}
 assert.deepEqual(replay,plain(a.policy));assert(a.shortfalls.every(r=>r.after<=r.before));assert.equal(a.additionalVendorExpense,a.totalVendorExpense);
});
console.log(JSON.stringify({suite:'experimental-department-functions',checks,months:60,integrated:false,scope:'Pure explicit quotas, retained reservations, workloads, finite paid vendors and returned facility pools. Actual accounting adapters tested; no live campaign/UI/save/transport integration or balance acceptance.'}));
