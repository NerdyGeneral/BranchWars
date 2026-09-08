'use strict';
// Domain adapter gate, not a playable campaign: real bank/supplier postings and
// exact cloned-world rollback, with explicit opening office/report fixtures.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={},copy=x=>JSON.parse(JSON.stringify(x));
const sync=fs.readFileSync(path.join(root,'src/engine/accounting-adapter.js'),'utf8').split(/\r?\n/).find(line=>line.startsWith('function syncAccounts('));
assert(sync,'Use the actual accounting mirror adapter, not a test substitute');
vm.runInNewContext(['src/engine/accounting.js','src/engine/group-accounting.js','experiments/institution/facility-lifecycle.js','experiments/institution/facility-settlement.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n')+'\n'+sync+'\nthis.api={A:AccountingPrototype,G:GroupAccounting,L:FacilityLifecycle,S:FacilitySettlement};',ctx);
const {A,G,L,S}=ctx.api;
function opening(){return {financialGroupVersion:4,cycle:1,gameOver:false,players:[0,1].map(i=>{
 const book=A.opening(3),id='test-bank-'+i;
 return {id,accounting:book,stats:{cash:book.accounts.cash,capital:book.accounts.equity,lastProfit:0,earnings:0,loans:book.accounts.loans,deposits:book.accounts.deposits,emergencyDebt:0},buildSpend:0,
  facilityNetwork:{offices:[{id:id+':office:1',market:'downtown',model:i?'digital':'retail',openedCycle:1,closedCycle:null,conversion:null}]},
  operatingReport:{profit:0,expense:0},marketReport:{profit:0,central:0,rows:{downtown:{facility:0,contribution:0}}}};
 })};}
const pool={service:12,business:8,lending:8,operations:8,wealth:0};
const context=(g,p)=>({cycle:g.cycle,freeCash:p.stats.cash,freeExecution:1,workRate:1,availableStaffQuarters:pool,wealthLicensed:()=>false,nearby:(a,b)=>a===b});
const plans=g=>g.players.map(p=>({facilityLifecyclePolicy:L.allocateStaff(p,pool).plan}));
const advance=g=>S.advance(g,context).game;
const nextMonth=g=>S.activate({...g,cycle:g.cycle+1,players:g.players.map(p=>({...p,operatingReport:{profit:0,expense:0},marketReport:{profit:0,central:0,rows:{downtown:{facility:0,contribution:0}}}}))}).game;
const totalCash=g=>g.players.reduce((n,p)=>n+p.accounting.accounts.cash,0)+g.facilityEconomy.supplier.accounts.cash;
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
test('Explicit initialization preserves original financial books and creates no outside cash',()=>{
 const old=opening(),before=JSON.stringify(old),g=S.initialize(old);
 assert.equal(JSON.stringify(old),before);assert.equal(totalCash(g),4800000);assert.equal(g.facilityEconomy.supplier.accounts.cash,0);
 for(let i=0;i<2;i++)assert.deepEqual(copy(g.players[i].accounting),copy(old.players[i].accounting));
 S.validate(g);assert.throws(()=>S.initialize(g));
 const legacy={...old,financialGroupVersion:3};assert.deepEqual(copy(S.initialize(legacy)),copy(legacy));
});
test('Two banks pay one supplier exactly once and report only incremental maintenance',()=>{
 let g=S.initialize(opening());g=S.prepare(g,plans(g),context).game;g=advance(g);
 const before=JSON.stringify(g),result=S.settle(g,context),paid=result.reports.reduce((n,r)=>n+r.paid,0),next=result.game;
 assert.equal(JSON.stringify(g),before);assert.equal(totalCash(next),totalCash(g));assert.equal(next.facilityEconomy.supplier.accounts.cash,paid);
 assert.equal(paid,Math.round(22000*.12)+Math.round(12000*.12));
 for(let i=0;i<2;i++){
  const p=next.players[i],cost=result.reports[i].paid;
  assert.equal(p.accounting.accounts.cash,g.players[i].accounting.accounts.cash-cost);assert.equal(p.accounting.accounts.payables,0);
  assert.equal(p.accounting.retainedEarnings,-cost);assert.equal(p.stats.earnings,-cost);assert.equal(p.operatingReport.expense,cost);assert.equal(p.operatingReport.profit,-cost);
  assert.equal(p.stats.lastProfit,-cost);assert.equal(p.marketReport.rows.downtown.facility,cost);
  assert.equal(p.marketReport.rows.downtown.contribution+p.marketReport.central,p.marketReport.profit);
 }
 assert.deepEqual(copy(S.settle(next,context).game),copy(next),'Repeated month must neither pay nor expense twice');
 S.validate(nextMonth(next));
});
test('A second-bank failure rolls back first-bank and supplier attempts atomically',()=>{
 let g=S.initialize(opening());g=S.prepare(g,plans(g),context).game;g=advance(g);delete g.players[1].operatingReport;
 const before=JSON.stringify(g);assert.throws(()=>S.settle(g,context),/operating report/);assert.equal(JSON.stringify(g),before);
});
test('Unfunded maintenance is physical deterioration, not invented payable or borrowing',()=>{
 let g=S.initialize(opening());g=S.prepare(g,plans(g),context).game;g=advance(g);
 const next=S.settle(g,(world,p)=>({...context(world,p),freeCash:p.id==='test-bank-0'?0:p.stats.cash})).game;
 const bank=next.players[0];assert.equal(bank.accounting.accounts.cash,g.players[0].accounting.accounts.cash);assert.equal(bank.accounting.accounts.payables,0);
 assert.equal(bank.accounting.accounts.emergencyDebt,0);assert.equal(bank.facilityLifecycle.report.paid,0);
 assert.equal(bank.facilityLifecycle.report.unfunded,2640);assert.equal(bank.facilityLifecycle.records['test-bank-0:office:1'].conditionBp,9820);
 assert.equal(totalCash(next),4800000);
});
test('Renovation commits real paired cash but is not added to ordinary operating profit',()=>{
 let g=S.initialize(opening());g=S.prepare(g,plans(g),context).game;g=nextMonth(S.settle(advance(g),context).game);
 const orders=plans(g);orders[0].facilityLifecyclePolicy.renovate='test-bank-0:office:1';
 const before=JSON.stringify(g),result=S.prepare(g,orders,context),next=result.game,cost=Math.round(650000*.22);
 assert.equal(JSON.stringify(g),before);assert.equal(totalCash(next),totalCash(g));
 assert.equal(next.players[0].accounting.accounts.cash,g.players[0].accounting.accounts.cash-cost);assert.equal(next.players[0].buildSpend,cost);
 assert.equal(next.players[0].operatingReport.profit,0);assert.equal(next.facilityEconomy.renovationPaid,cost);
 assert.deepEqual(copy(S.prepare(next,orders,context).game),copy(next));
 const bad=copy(orders);bad[1].facilityLifecyclePolicy.renovate='unknown';assert.throws(()=>S.prepare(g,bad,context));assert.equal(JSON.stringify(g),before);
});
test('Supplier identity and accumulated payments are validated against its actual ledger',()=>{
 const g=S.initialize(opening());const bad=copy(g);bad.facilityEconomy.maintenancePaid++;
 assert.throws(()=>S.validate(bad),/suppliers/);
 const wrong=copy(g);wrong.facilityEconomy.supplier=G.opening('other');assert.throws(()=>S.validate(wrong),/suppliers/);
 const stale=copy(g);stale.players[0].stats.earnings++;assert.throws(()=>S.validate(stale),/mirrors/);
 const legacy={...g,financialGroupVersion:3};assert.throws(()=>S.validate(legacy),/Unversioned/);
});
test('Shared renovation progress is replay-safe and activates only after the closing month',()=>{
 let g=S.initialize(opening());g=S.prepare(g,plans(g),context).game;g=nextMonth(S.settle(advance(g),context).game);
 const orders=plans(g);orders[0].facilityLifecyclePolicy.renovate='test-bank-0:office:1';g=S.prepare(g,orders,context).game;
 const stalled=S.advance(g,(world,p)=>({...context(world,p),freeExecution:0}));
 assert.equal(stalled.usedCapacity['test-bank-0'],0);assert.equal(stalled.game.players[0].facilityLifecycle.records['test-bank-0:office:1'].renovation.work,0);
 const advanced=S.advance(g,context),again=S.advance(advanced.game,context);
 assert.equal(advanced.usedCapacity['test-bank-0'],1);assert.deepEqual(copy(again.usedCapacity),copy(advanced.usedCapacity));
 assert.deepEqual(copy(again.game),copy(advanced.game));
 g=nextMonth(S.settle(advanced.game,context).game);g=S.prepare(g,plans(g),context).game;
 const completed=S.advance(g,context);assert.equal(completed.game.players[0].facilityLifecycle.records['test-bank-0:office:1'].renovation.readyCycle,g.cycle+1);
 assert.equal(completed.game.players[0].facilityLifecycle.records['test-bank-0:office:1'].renovations,0);
 g=nextMonth(S.settle(completed.game,context).game);assert.equal(g.players[0].facilityLifecycle.records['test-bank-0:office:1'].renovations,1);
 assert.equal(g.players[0].facilityLifecycle.records['test-bank-0:office:1'].conditionBp,10000);S.validate(g);
 const cash=totalCash(g);assert.deepEqual(copy(S.activate(g).game),copy(g));assert.equal(totalCash(g),cash);
});
console.log(JSON.stringify({passed:true,checks,scope:'Experimental paired facility settlement; no manifest/campaign/UI/transport integration claim.'}));
