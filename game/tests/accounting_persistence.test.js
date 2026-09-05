'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);const A=ctx.BWEngine.AccountingPrototype,copy=x=>JSON.parse(JSON.stringify(x));
let original=A.opening();for(let i=0;i<400;i++)original=A.transact(original,'income',i+1);
const before=JSON.stringify(original),save=A.snapshot(original);assert.equal(save.entries.length,256);assert.equal(save.checkpoint.sequence,144);
let resumed=A.restore(copy(save));assert.deepEqual(copy(resumed.accounts),copy(original.accounts));assert.equal(resumed.sequence,400);
for(let i=0;i<40;i++){original=A.transact(original,'expense',50);resumed=A.transact(resumed,'expense',50)}
assert.deepEqual(copy(resumed.accounts),copy(original.accounts));assert.equal(resumed.retainedEarnings,original.retainedEarnings);
assert.deepEqual(copy(A.snapshot(resumed)),copy(A.snapshot(original)));
for(const limit of [1,32,256]){const s=A.snapshot(resumed,limit);assert.equal(s.entries.length,limit);assert.deepEqual(copy(A.restore(s).accounts),copy(resumed.accounts))}
const empty=A.restore(A.snapshot(A.opening()));assert.equal(empty.journal.length,0);
const corruptions=[
 s=>s.format='future',s=>s.extra=true,s=>s.entries.push(...s.entries),
 s=>s.entries[0].id++,s=>s.entries[0].changes.cash++,
 s=>s.entries[0].changes.phantom=1,s=>s.entries[0].earnings=NaN,
 s=>s.entries[0].source='',s=>s.entries[0].privatePlan='hidden',
 s=>s.checkpoint.accounts.securities++,s=>s.checkpoint.sequence++,
 s=>s.closing.retainedEarnings++,s=>s.closing.accounts.cash++,
 s=>s.closing.extra='unknown',s=>s.checkpoint.accounts.cash=-1
];
for(const corrupt of corruptions){const s=copy(save);corrupt(s);assert.throws(()=>A.restore(s))}
const broken=copy(original);broken.journal.at(-1).changes.cash++;assert.throws(()=>A.snapshot(broken));
assert.throws(()=>A.snapshot(original,257));assert.throws(()=>A.snapshot(original,0));
assert.equal(JSON.stringify(A.restore(copy(save))),JSON.stringify(A.restore(copy(save))));
assert.equal(JSON.stringify(A.snapshot(JSON.parse(before))),JSON.stringify(save),'snapshot source remains stable');
assert.equal(JSON.stringify(save),JSON.stringify(A.snapshot(A.restore(save))),'snapshot round trip stable');
console.log('Accounting persistence tests passed: 256-entry snapshots, checkpoint reconciliation, exact continuation, repeated pruning, 15 corruptions, invalid histories and no campaign migration.');
