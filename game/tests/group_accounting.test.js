'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..'), ctx = { console };
const accounting = fs.readFileSync(path.join(root, 'src/engine/accounting.js'), 'utf8');
const group = fs.readFileSync(path.join(root, 'src/engine/group-accounting.js'), 'utf8');
vm.runInNewContext(accounting + '\n' + group + '\nthis.G=GroupAccounting;this.B=AccountingPrototype;', ctx);
const { G, B } = ctx, clone = x => JSON.parse(JSON.stringify(x)), same = (a,b) => assert.deepEqual(clone(a),clone(b));
let checks = 0;
function unchangedOnFailure(inputs, action, pattern) {
  const before = JSON.stringify(inputs); assert.throws(action, pattern); assert.equal(JSON.stringify(inputs),before); checks++;
}
let bank = B.opening(), parent = G.opening('parent');
parent = G.post(parent,'opening.bankOwnership','bank',{investments:bank.accounts.equity,equity:bank.accounts.equity});
const initial = G.consolidate(parent,[],bank);
assert.equal(initial.equity,bank.accounts.equity);assert.equal(initial.assets,B.check(bank).assets);
assert.equal(parent.accounts.cash,0);assert.equal(initial.retainedEarnings,0);checks++;
unchangedOnFailure([bank,parent],()=>G.bankDividend(bank,parent,1,{minimumCapital:1000000,minimumCash:1200000}),/retained/);
bank = B.transact(bank,'income',900000);
const beforeDividend=G.consolidate(parent,[],bank);
({bank,parent}=G.bankDividend(bank,parent,600000,{minimumCapital:1000000,minimumCash:1200000}));
same(G.consolidate(parent,[],bank),beforeDividend);assert.equal(parent.accounts.cash,600000);checks++;
for (const rules of [
  {minimumCapital:bank.accounts.equity,minimumCash:0},
  {minimumCapital:0,minimumCash:bank.accounts.cash},
  {minimumCapital:0,minimumCash:0,restricted:true},
  {minimumCapital:-1,minimumCash:0}
]) unchangedOnFailure([bank,parent],()=>G.bankDividend(bank,parent,1,rules),/safeguards|amount/);
const borrowed = B.transact(bank,'borrow',1);
unchangedOnFailure([borrowed,parent],()=>G.bankDividend(borrowed,parent,1,{minimumCapital:0,minimumCash:0}),/safeguards/);
let agency=G.opening('agency'), brokerage=G.opening('brokerage');
let invested=G.invest(parent,agency,200000);parent=invested.parent;agency=invested.entity;
assert.equal(G.consolidate(parent,[agency],bank).equity,beforeDividend.equity);
assert.equal(G.consolidate(parent,[agency],bank).retainedEarnings,beforeDividend.retainedEarnings);checks++;
unchangedOnFailure([parent,agency],()=>G.invest(parent,agency,parent.accounts.cash+1),/amount/);
unchangedOnFailure([parent,parent],()=>G.invest(parent,parent,1),/distinct/);
const custodyBefore=G.consolidate(parent,[agency,brokerage],bank);
brokerage=G.custody(brokerage,50000000,'customer-investments');
const custodyAfter=G.consolidate(parent,[agency,brokerage],bank);
assert.equal(custodyAfter.equity,custodyBefore.equity);
assert.equal(custodyAfter.operatingAssets,custodyBefore.operatingAssets);
assert.equal(brokerage.accounts.cash,0);assert.equal(custodyAfter.custodyAssets,50000000);checks++;
unchangedOnFailure([brokerage,agency],()=>G.servicePayment(brokerage,agency,1),/amount/);
unchangedOnFailure([brokerage],()=>G.custody(brokerage,-50000001,'customer-investments'),/amount/);
brokerage=G.custody(brokerage,-50000000,'customer-investments');
agency=G.post(agency,'commission.received','carrier',{cash:120000,equity:120000},120000);
const beforeAgencyDividend=G.consolidate(parent,[agency,brokerage],bank);
let distributed=G.dividend(agency,parent,100000,{due:10000,monthlyFixedCost:20000});
agency=distributed.entity;parent=distributed.parent;
same(G.consolidate(parent,[agency,brokerage],bank),beforeAgencyDividend);checks++;
unchangedOnFailure([agency,parent],()=>G.dividend(agency,parent,20001),/Dividend/);
agency=G.post(agency,'supplier.invoice','supplier',{payables:180000,equity:-180000},-180000);
assert.equal(G.distributionLimit(agency,0,0),0);checks++;
agency=G.settlePayable(agency,180000,'supplier');
assert.equal(agency.accounts.payables,0);assert.equal(agency.accounts.cash,40000);checks++;
// Explicit insolvency survives validation; it is not clamped away.
agency=G.post(agency,'supplier.invoice','supplier',{payables:60000,equity:-60000},-60000);
assert.equal(agency.accounts.equity,-20000);G.validate(agency);checks++;
unchangedOnFailure([agency],()=>G.settlePayable(agency,50000,'supplier'),/amount/);
const capitalBefore=G.consolidate(parent,[agency,brokerage],bank);
({bank,parent}=G.capitalizeBank(bank,parent,10000));
assert.equal(G.consolidate(parent,[agency,brokerage],bank).equity,capitalBefore.equity);
assert.equal(G.consolidate(parent,[agency,brokerage],bank).retainedEarnings,capitalBefore.retainedEarnings);checks++;
for(const mutate of [
 x=>x.accounts.cash++, x=>x.accounts.custodyAssets++, x=>x.accounts.equity=Infinity,
 x=>x.accounts.extra=0, x=>x.extra=0, x=>x.journal[0].counterparty='',
 x=>x.journal[0].changes.cash=1, x=>x.checkpoint.sequence++,
 x=>x.sequence++, x=>x.retainedEarnings++, x=>x.version=2
]) {const damaged=clone(parent);mutate(damaged);assert.throws(()=>G.validate(damaged));checks++;}
unchangedOnFailure([parent,agency],()=>G.consolidate(parent,[agency,agency],bank),/Duplicate/);
unchangedOnFailure([parent],()=>G.consolidate(parent,[]),/No entity/);
// Long journal rebasing preserves exact states and bounded serialization.
let long=G.opening('long'), resumed=clone(long);
for(let month=0;month<480;month++){
  const amount=1000+(month%19);
  for(const input of [long,resumed])G.validate(input);
  long=G.post(long,'external.receipt','modeled-payer',{cash:amount,equity:amount},amount);
  resumed=G.post(resumed,'external.receipt','modeled-payer',{cash:amount,equity:amount},amount);
  long=G.post(long,'payroll','outside-workers',{cash:-900,equity:-900},-900);
  resumed=G.post(resumed,'payroll','outside-workers',{cash:-900,equity:-900},-900);
  resumed=clone(resumed);same(long,resumed);
  assert(long.journal.length<=64);G.validate(long);
}
assert.equal(long.sequence,960);assert.equal(long.checkpoint.sequence,896);checks++;
assert(JSON.stringify(long).length<20000);
console.log(JSON.stringify({passed:true,checks,months:480,postings:960,serializedBytes:Buffer.byteLength(JSON.stringify(long)),scope:'entity accounting, not yet campaign/UI/subsidiary completion'}));
