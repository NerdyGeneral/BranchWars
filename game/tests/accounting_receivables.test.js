'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={},copy=x=>JSON.parse(JSON.stringify(x));
vm.runInNewContext(fs.readFileSync(path.join(root,'src/engine/accounting.js'),'utf8')+'\nthis.A=AccountingPrototype;',ctx);
const A=ctx.A;let checks=0;
const old=A.transact(A.opening(),'income',10000),saved=JSON.stringify(old),oldSnapshot=A.snapshot(old);
const bank=A.withReceivables(old);assert.equal(JSON.stringify(old),saved);assert.equal(bank.version,2);
assert.equal(bank.accounts.receivables,0);assert.equal(bank.accounts.cash,old.accounts.cash);
assert.equal(bank.accounts.equity,old.accounts.equity);assert.equal(bank.retainedEarnings,old.retainedEarnings);
assert.equal(oldSnapshot.format,'bw-accounting-1');assert.equal(A.snapshot(bank).format,'bw-accounting-2');checks++;
let next=A.transact(bank,'invoice',18000);
assert.equal(next.accounts.cash,bank.accounts.cash);assert.equal(next.accounts.receivables,18000);
assert.equal(next.accounts.equity,bank.accounts.equity+18000);assert.equal(next.retainedEarnings,bank.retainedEarnings+18000);checks++;
next=A.transact(next,'collectInvoice',8000);
assert.equal(next.accounts.cash,bank.accounts.cash+8000);assert.equal(next.accounts.receivables,10000);
assert.equal(next.retainedEarnings,bank.retainedEarnings+18000);checks++;
next=A.transact(next,'writeOffInvoice',10000);
assert.equal(next.accounts.cash,bank.accounts.cash+8000);assert.equal(next.accounts.receivables,0);
assert.equal(next.accounts.equity,bank.accounts.equity+8000);assert.equal(next.retainedEarnings,bank.retainedEarnings+8000);checks++;
for(const kind of ['invoice','collectInvoice','writeOffInvoice']){
 assert.throws(()=>A.transact(old,kind,1),/Unknown accounting/);checks++;
}
for(const kind of ['collectInvoice','writeOffInvoice']){
 const before=JSON.stringify(next);assert.throws(()=>A.transact(next,kind,1),/amount/);
 assert.equal(JSON.stringify(next),before);checks++;
}
for(let month=0;month<480;month++){
 next=A.transact(next,'invoice',1000+month);next=A.transact(next,'collectInvoice',500+month);
 if(month%5===0)next=A.transact(next,'writeOffInvoice',Math.min(200,next.accounts.receivables));
 const snap=A.snapshot(next,32),resumed=A.restore(copy(snap));
 assert.deepEqual(copy(A.snapshot(resumed,32)),copy(snap));
 assert.equal(A.check(next).residual,0);assert(snap.entries.length<=32);next=resumed;
}
checks++;
for(const damage of [s=>s.format='bw-accounting-1',s=>s.closing.accounts.receivables++,
 s=>s.checkpoint.accounts.receivables=-1,s=>s.entries[0].changes.receivables=999999]){
 const bad=copy(A.snapshot(next,32));damage(bad);const before=JSON.stringify(bad);
 assert.throws(()=>A.restore(bad));assert.equal(JSON.stringify(bad),before);checks++;
}
assert.deepEqual(copy(A.snapshot(A.restore(oldSnapshot))),copy(oldSnapshot));checks++;
// Until a campaign rule explicitly enables the format, replacing a legacy
// campaign book must be rejected rather than silently broadening its rules.
const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'),'utf8'));
const engine=fs.readFileSync(path.join(root,'src',manifest.engine.shell),'utf8').replace('/* @modules */',()=>
 manifest.engine.modules.map(file=>fs.readFileSync(path.join(root,'src',file),'utf8')).join('\n'));
const gameContext={console};vm.runInNewContext(engine,gameContext);const E=gameContext.BWEngine;
const game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:1}).options,seed:17,created:1});
game.players[0].accounting=E.AccountingPrototype.withReceivables(game.players[0].accounting);
assert.throws(()=>E.migrateCampaign(game),/accounting book/);checks++;
const view=E.publicState(game,0);assert.throws(()=>E.validateFinancialGroupView(view),/accounting view/);checks++;
console.log(JSON.stringify({passed:true,checks,months:480,scope:'Explicit receivables accounting; campaign integration still pending.'}));
