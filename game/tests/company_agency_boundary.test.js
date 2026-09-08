'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),context={console},copy=x=>JSON.parse(JSON.stringify(x));
vm.runInNewContext(['accounting','group-accounting','company-finance'].map(name=>
  fs.readFileSync(path.join(root,'src/engine',name+'.js'),'utf8')).join('\n')+
  '\nthis.C=CompanyFinance;this.G=GroupAccounting;',context);
const {C,G}=context;
const old=C.opening(Array.from({length:6},(_,i)=>({market:'market-'+i,baseFee:18000+i*2000})));
const snapshot=JSON.stringify(old),created=C.withAgency(old);
assert.equal(JSON.stringify(old),snapshot,'Selecting new rules must not mutate an existing world.');
assert.equal(created.version,3);assert.equal(created.agencyCashNet,0);
assert.equal(C.validate(created).cash,C.validate(old).cash);
assert.throws(()=>C.withAgency(created),/creation/);
assert.throws(()=>C.withAgency(C.step(old,{demand:1})),/creation/);
let world=C.step(created,{demand:1}),carrier=G.opening('agency:carrier');
const before=copy(world),premium=9000;
const paid=C.payAgencyPremium(world,0,carrier,premium);
assert.deepEqual(copy(world),before,'Payment quote boundary must be atomic.');
assert.equal(carrier.accounts.cash,0);
world=paid.world;carrier=paid.carrier;
assert.equal(world.companies[0].report.agencyExpense,premium);
assert.equal(world.companies[0].report.profit,before.companies[0].report.profit-premium);
assert.equal(world.companies[0].book.accounts.cash,before.companies[0].book.accounts.cash-premium);
assert.equal(world.companies[0].book.accounts.equity,before.companies[0].book.accounts.equity-premium);
assert.equal(world.agencyCashNet,premium);assert.equal(carrier.accounts.cash,premium);
assert.equal(C.validate(world).cash+carrier.accounts.cash,world.openingCash);
for(const amount of [-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER,'1']) {
  const frozen=JSON.stringify(world);
  assert.throws(()=>C.payAgencyPremium(world,0,carrier,amount));
  assert.equal(JSON.stringify(world),frozen);
}
for(const damage of [w=>delete w.agencyCashNet,w=>w.agencyCashNet++,
  w=>w.version=2,w=>w.companies[0].report.agencyExpense++,
  w=>w.companies[0].report.profit++]) {
  const bad=copy(world);damage(bad);assert.throws(()=>C.validate(bad));
}
for(let month=0;month<24;month++) {
  world=C.step(world,{demand:month%4===0?.8:1});
  for(const company of world.companies)assert.equal(company.report.agencyExpense,0);
  for(let index=0;index<6;index++) {
    if(world.companies[index].resolution)continue;
    const amount=Math.min(1000,world.companies[index].book.accounts.cash);
    ({world,carrier}=C.payAgencyPremium(world,index,carrier,amount));
  }
  assert.equal(C.validate(world).cash+carrier.accounts.cash,world.openingCash);
}
const legacy=C.step(old,{demand:1});
assert.equal(legacy.version,2);assert.equal(legacy.agencyCashNet,undefined);
assert.equal(legacy.companies[0].report.agencyExpense,undefined);
console.log(JSON.stringify({passed:true,months:25,scope:'Versioned company premium cash, earnings, mutation refusal and legacy field presence'}));
