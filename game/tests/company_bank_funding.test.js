'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={},copy=x=>JSON.parse(JSON.stringify(x));
vm.runInNewContext(['accounting','group-accounting','company-finance'].map(name=>
 fs.readFileSync(path.join(root,'src/engine',name+'.js'),'utf8')).join('\n')+
 '\nthis.A=AccountingPrototype;this.C=CompanyFinance;',ctx);
const {A,C}=ctx,profiles=Array.from({length:6},(_,i)=>({market:'market-'+i,baseFee:[18000,30000,50000][i%3]}));
const services=profiles.map((p,i)=>({provider:i%2,fee:p.baseFee,served:true}));
const totals=(world,banks)=>({cash:[world.outside,world.creditor,...world.companies.map(c=>c.book),...banks].reduce((n,b)=>n+b.accounts.cash,0),
 equity:[world.outside,world.creditor,...world.companies.map(c=>c.book),...banks].reduce((n,b)=>n+b.accounts.equity,0)});
let checks=0,months=0;const results=[];
for(const [name,demand] of [['neutral',1],['contraction',.5],['growth',1.4]]){
 let world=C.opening(profiles),banks=[A.opening(2),A.opening(2)],opening=totals(world,banks),losses=0,collected=0;
 for(let month=0;month<120;month++){
  const before=JSON.stringify(world),instructions=services.map(s=>({...s}));
  // Ownership moves independently of outstanding claims: the old provider
  // continues to own its unpaid invoices after a rival wins the service.
  if(month>=12)instructions.forEach(s=>s.provider=1-s.provider);
  const next=C.step(world,{demand,services:instructions});assert.equal(JSON.stringify(world),before);
  banks=banks.map((bank,i)=>{
   const f=next.bankFlows[i];losses+=f.writtenOff;collected+=f.recovered;
   return A.restore(A.snapshot(A.post(bank,'corporate.monthlySettlement',
    {cash:f.cash+f.recovered,receivables:f.receivable-f.recovered-f.writtenOff,
      equity:f.billed-f.writtenOff},f.billed-f.writtenOff),96));
  });
  for(const i of [0,1])assert.equal(banks[i].accounts.receivables,next.companies.reduce((n,c)=>n+c.bankArrears[i],0));
  const closing=totals(next,banks);assert.equal(closing.cash,opening.cash);
  assert.equal(closing.equity,opening.equity-next.companies.reduce((n,c)=>n+(c.resolution?.assetLoss||0),0));
  assert.equal(C.validate(next).cash+next.bankCashPaid[0]+next.bankCashPaid[1],next.openingCash);
  if(month%24===0)assert.deepEqual(copy(C.step(next,{demand,services:instructions})),copy(C.step(copy(next),{demand,services:instructions})));
  world=next;months++;
 }
 results.push({name,months:120,cashPaid:world.bankCashPaid,receivables:banks.map(b=>b.accounts.receivables),
  losses,collected,closed:world.companies.filter(c=>c.resolution).length});checks++;
}
assert(results.some(r=>r.losses>0),'A stressed unpaid bank invoice must produce a real creditor loss.');checks++;
const opening=C.opening(profiles),idle=C.step(opening,{demand:1,services:services.map(s=>({...s,served:false}))});
assert(idle.bankFlows.every(f=>Object.values(f).every(n=>n===0)));assert(idle.companies.every(c=>c.report.serviceDue===0));checks++;
for(const damage of [s=>s[0].provider=2,s=>s[0].fee=-1,s=>s[0].fee=100001,s=>s[0].served=1,s=>s.push(s[0]),s=>s[0].extra=true]){
 const bad=copy(services);damage(bad);const before=JSON.stringify(opening);
 assert.throws(()=>C.step(opening,{demand:1,services:bad}),/service/);assert.equal(JSON.stringify(opening),before);checks++;
}
console.log(JSON.stringify({passed:true,checks,months,results,
 scope:'Company-to-bank cash/invoice/default boundary; live campaign and UI wiring still pending.'}));
