'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
vm.runInNewContext(['src/engine/accounting.js','src/engine/group-accounting.js','experiments/institution/department-functions.js','experiments/institution/department-provider.js'].map(read).join('\n')+'\nthis.api={D:DepartmentFunctions,P:DepartmentProvider,A:AccountingPrototype};',ctx);
const {D,P,A}=ctx.api;let checks=0;
const test=(name,fn)=>{try{fn();checks++;}catch(e){e.message=name+': '+e.message;throw e;}};
function fixture(){
 const owners=['bank:z','bank:a'].map(id=>D.initialize({id,stats:{staff:8},accounting:A.opening(3)},1,true));
 const contexts=owners.map(()=>({cycle:1,headcount:8,physicalQuarters:{service:12,business:8,lending:8,operations:4},
  retainedQuarters:Object.fromEntries(D.IDS.map(id=>[id,Object.fromEntries(D.ROLES.map(r=>[r,0]))])),
  workloads:Object.fromEntries(D.IDS.map(id=>[id,20])),vendorSupply:P.supply(),freeCash:1000000}));
 return {owners,contexts,policies:owners.map(p=>D.defaultPlan(p)),provider:P.initialize(1)};
}
function settle(f){return P.settle(f.provider,f.owners,f.policies,f.contexts);}
test('empty outside book adds no cash and finite slots are independent of sealed plans',()=>{
 const f=fixture(),before=JSON.stringify(f),r=settle(f);assert.equal(JSON.stringify(f),before);
 assert.equal(f.provider.supplier.accounts.cash,0);assert.equal(r.provider.paid,0);assert.equal(r.provider.month,1);
 assert.deepEqual(copy(r.players.map(p=>p.accounting)),copy(f.owners.map(p=>p.accounting)));assert.equal(r.provider.supplier.sequence,0);
 assert(Object.values(P.supply()).every(n=>n===16));assert(Object.values(r.provider.report.used).every(n=>n===0));
});
test('simultaneous full slot requests respect outside capacity and pay exactly once',()=>{
 const f=fixture();for(const p of f.policies)for(const id of D.IDS)p.vendors[id]=16;
 const before=JSON.stringify(f),r=settle(f),bill=16*Object.values(D.FUNCTIONS).reduce((n,row)=>n+row.vendorRate,0);
 assert.equal(JSON.stringify(f),before);assert.equal(r.provider.paid,bill*2);assert.equal(r.provider.supplier.accounts.cash,bill*2);
 for(let i=0;i<2;i++){assert.equal(f.owners[i].accounting.accounts.cash-r.players[i].accounting.accounts.cash,bill);assert.equal(r.players[i].departmentFunctions.paid,bill);assert.equal(r.players[i].stats.staff,8);}
 assert(Object.values(r.provider.report.used).every(n=>n===32));assert(P.validate(r.provider));
 assert.throws(()=>P.settle(r.provider,r.players,f.policies,f.contexts),/Current guaranteed/);
});
test('reversing seats produces the identical supplier journal and owner books',()=>{
 const f=fixture();f.policies[0].vendors.people=3;f.policies[1].vendors.credit=5;f.policies[1].quotas.technology.operations=2;
 const a=settle(f),b=P.settle(f.provider,[...f.owners].reverse(),[...f.policies].reverse(),[...f.contexts].reverse());
 assert.deepEqual(copy(a.provider),copy(b.provider));assert.deepEqual(copy(a.players),copy(b.players.reverse()));
 assert.deepEqual(copy(a.reports),copy(b.reports.reverse()));
});
test('invalid second plan never pays the first bank or partially advances books',()=>{
 const f=fixture();f.policies[0].vendors.credit=3;f.policies[1].vendors.people=1;f.contexts[1].freeCash=0;
 const before=JSON.stringify(f);assert.throws(()=>settle(f),/funded cash/);assert.equal(JSON.stringify(f),before);
 f.contexts[1].freeCash=50000;f.owners[1].accounting=A.post(f.owners[1].accounting,'fixture.reallocate',{cash:-2400000,securities:2400000});
 const second=JSON.stringify(f);assert.throws(()=>settle(f),/actual bank cash/);assert.equal(JSON.stringify(f),second);
});
test('unknown versions, authority fields, forged capacity and provider funds reject',()=>{
 for(const mutate of [f=>f.provider.version=2,f=>f.provider.borrow=1000,f=>f.provider.paid=1,f=>f.provider.supplier.entityId='wrong',f=>f.contexts[0].vendorSupply.credit=17,f=>f.contexts[1].cycle=2,f=>f.policies[0].vendors.credit=17,f=>f.owners[1].id=f.owners[0].id]){
  const f=fixture();mutate(f);assert.throws(()=>settle(f));
 }
 const f=fixture();f.contexts[0].vendorSupply=Object.fromEntries(Object.entries(f.contexts[0].vendorSupply).reverse());assert.equal(settle(f).provider.month,1);
});
test('serialized resume preserves persistent orders and cumulative paired cash for sixty months',()=>{
 let f=fixture();f.policies[0].vendors.people=1;f.policies[1].vendors.credit=1;
 const initial=f.owners.reduce((n,p)=>n+p.accounting.accounts.cash,0);
 for(let month=1;month<=60;month++){
  f.contexts.forEach(c=>c.cycle=month);const r=settle(f);
  assert.equal(r.provider.supplier.accounts.cash+r.players.reduce((n,p)=>n+p.accounting.accounts.cash,0),initial);
  assert.equal(r.provider.paid,month*(2400+2800));assert(r.players.every(p=>D.validate(p)));assert(P.validate(r.provider));
  f={...f,provider:copy(r.provider),owners:copy(r.players),policies:r.players.map(p=>D.defaultPlan(p))};
 }
 assert.equal(f.owners[0].departmentFunctions.history.length,24);
 const bad=copy(f.provider);bad.report.used.credit++;assert.throws(()=>P.validate(bad),/capacity/);
});
console.log(JSON.stringify({suite:'experimental-department-provider',checks,months:60,integrated:false,scope:'Two-bank finite guaranteed slots, atomic paired payment, owner-order invariance and serialized history; not production integration.'}));
