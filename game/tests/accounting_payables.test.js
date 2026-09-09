'use strict';
// Proves accounting-v3 against the immutable pre-payables agency checkpoint.
// Integration/version wiring and campaign/network acceptance remain separate gates.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const game = path.resolve(__dirname, '..');
const repo = path.dirname(game);
const baseline = 'eea1d0068f5f4a9a963f93d5c12cccf9d1e803ef';
const patchPath = path.join(game, 'experiments/institution/accounting-payables.patch');
const clone = value => JSON.parse(JSON.stringify(value));
const equal = (a, b) => assert.deepEqual(clone(a), clone(b));
const patchTargets = new Set(['src/engine/accounting.js','src/engine/group-accounting.js','src/engine/accounting-adapter.js','src/engine/financial-group.js']);
function patchTarget(relative) {
  assert(patchTargets.has(relative), 'Only the four authored game-relative patch targets are supported');
  const target = path.resolve(game, relative);
  assert(target.startsWith(game + path.sep), 'Patch target must stay inside game');
  return target;
}
for (const invalid of ['../accounting.js','/tmp/accounting.js','C:/outside/accounting.js','src/engine/../../accounting.js','src/engine/other.js'])
  assert.throws(() => patchTarget(invalid), /authored game-relative/);
const sources = new Map();
const original = new Map();
const lines = fs.readFileSync(patchPath, 'utf8').replace(/\r\n/g, '\n').trimEnd().split('\n');
assert.equal(lines.shift(), '*** Begin Patch');
assert.equal(lines.pop(), '*** End Patch');
let target;
for (let i = 0; i < lines.length;) {
  const line = lines[i++];
  if (line.startsWith('*** Update File: ')) {
    target = patchTarget(line.slice(17));
    const relative = path.relative(repo,target).split(path.sep).join('/');
    const source = execFileSync('git',['-c','safe.directory='+repo,'show',baseline+':'+relative],{cwd:repo,encoding:'utf8'}).replace(/\r\n/g, '\n');
    original.set(path.basename(target), source);
    sources.set(path.basename(target), source);
    continue;
  }
  assert.equal(line, '@@', 'Only exact replacement hunks are supported');
  const before = [], after = [];
  while (i < lines.length && lines[i] !== '@@' && !lines[i].startsWith('*** Update File: ')) {
    const hunk = lines[i++];
    assert.ok([' ', '-', '+'].includes(hunk[0]), 'Malformed patch hunk');
    if (hunk[0] !== '+') before.push(hunk.slice(1));
    if (hunk[0] !== '-') after.push(hunk.slice(1));
  }
  const key = path.basename(target), source = sources.get(key), needle = before.join('\n');
  assert.ok(needle.length > 0);
  const at = source.indexOf(needle);
  assert.ok(at >= 0, `Patch drift: ${key}: ${needle.slice(0, 100)}`);
  assert.equal(source.indexOf(needle, at + needle.length), -1, 'Ambiguous patch hunk');
  sources.set(key, source.slice(0, at) + after.join('\n') + source.slice(at + needle.length));
}
function load(map) {
  const context = vm.createContext({});
  const adapter = map.get('accounting-adapter.js');
  const group = map.get('financial-group.js');
  const oneLine = (text, prefix) => text.split('\n').find(line => line.startsWith(prefix));
  const quote = group.slice(group.indexOf('function groupCapitalQuote('), group.indexOf('function defaultGroupPlan('));
  const settle = adapter.slice(adapter.indexOf('settleFunding=function('), adapter.indexOf('\n};', adapter.indexOf('settleFunding=function(')) + 3);
  const harness = `
    function riskAssets(p){return p.testRisk;}
    function tierRank(p){return p.testTier||0;}
    function fundingPosition(p){return {excess:p.testExcess||0};}
    function pilotSettle(){return ['legacy'];}
    function bookPost(p,type,amount){p.accounting=AccountingPrototype.transact(p.accounting,type,amount);syncAccounts(p);}
    let settleFunding;
    ${oneLine(adapter, 'function syncAccounts(')}
    ${oneLine(adapter, 'function pilotSpendingLimit(')}
    ${oneLine(group, 'const GROUP_SAFEGUARDS')}
    ${quote}
    ${settle}
    globalThis.api={A:AccountingPrototype,G:GroupAccounting,quote:groupCapitalQuote,spending:pilotSpendingLimit,settle:settleFunding,sync:syncAccounts};
  `;
  vm.runInContext(map.get('accounting.js') + '\n' + map.get('group-accounting.js') + harness, context);
  return context.api;
}
const current = new Map([...sources.keys()].map(name=>[name,fs.readFileSync(path.join(game,'src/engine',name),'utf8').replace(/\r\n/g,'\n')]));
const old = load(original), now = load(current), { A, G } = now;
let checks = 0;
function test(label, fn) { fn(); checks++; console.log('PASS ' + label); }
function player(book) {
  const p = { name: 'Test Bank', accounting: book, stats: {}, testRisk: 10000000,
    policies: {capital:'balanced'}, financialGroup:{parent:G.opening('bank:parent')} };
  now.sync(p); return p;
}
test('Every prepared patch hunk applies uniquely to the immutable pre-payables checkpoint', () => {
  assert.equal(sources.size, 4);
  const prepared=load(sources);
  equal(prepared.A.opening(3),A.opening(3));
  equal(prepared.A.snapshot(prepared.A.transact(prepared.A.opening(3),'incurPayable',200)),A.snapshot(A.transact(A.opening(3),'incurPayable',200)));
});
test('Historical v1/v2 transaction, journal, snapshot and restore bytes are exact', () => {
  for (const version of [1, 2]) {
    let before = old.A.opening(version), after = A.opening(version);
    equal(before, after);
    const actions = [['deposit',800000],['withdraw',100000],['originate',150000],['repayLoan',45000],
      ['income',75000],['expense',12000],['chargeoff',1500],['issueEquity',30000],['borrow',25000],
      ['repayDebt',25000],['buySecurities',50000], ...(version === 2 ? [['invoice',30000],['collectInvoice',10000],['writeOffInvoice',5000]] : [])];
    for (const [kind, amount] of actions) {
      before = old.A.transact(before, kind, amount); after = A.transact(after, kind, amount); equal(before, after);
      equal(old.A.snapshot(before, 4), A.snapshot(after, 4));
      equal(old.A.restore(old.A.snapshot(before, 4)), A.restore(A.snapshot(after, 4)));
    }
    equal(old.A.withReceivables(before), A.withReceivables(after));
    equal(old.A.sell(before, 'loans', 10000, 700), A.sell(after, 'loans', 10000, 700));
    equal(old.A.funded(before, 'expense', before.accounts.cash + 20000), A.funded(after, 'expense', after.accounts.cash + 20000));
    equal(old.quote(player(before)), now.quote(player(after)));
    equal(old.spending(player(before)), now.spending(player(after)));
    const p1=player(old.A.transact(before,'borrow',20000)),p2=player(A.transact(after,'borrow',20000));
    equal(old.settle({},p1,0),now.settle({},p2,0)); equal(p1,p2);
  }
});
test('Explicit v3 opening and upgrade preserve legacy assets and obligations', () => {
  const book = A.opening(3); assert.equal(A.check(book).residual, 0); assert.equal(book.accounts.payables, 0);
  for (const version of [1, 2]) {
    let previous = A.transact(A.opening(version), 'borrow', 45000);
    if (version === 2) previous = A.transact(previous, 'invoice', 12345);
    const unchanged=clone(previous), next=A.withPayables(previous);
    equal(previous, unchanged); assert.equal(next.version, 3);
    for(const [key,value] of Object.entries(previous.accounts))assert.equal(next.accounts[key],value);
    assert.equal(next.accounts.payables, 0); assert.equal(next.sequence,previous.sequence);
    equal(A.snapshot(A.restore(A.snapshot(next))),A.snapshot(next));
    equal(A.withReceivables(next), A.restore(A.snapshot(next)));
  }
});
test('Service invoice accrues bank expense and provider receivable with no new cash', () => {
  const bank=A.opening(3),provider=G.opening('external:leadership'),inputs=clone({bank,provider});
  const next=G.bankServiceInvoice(bank,provider,500000,'bank:0');
  equal({bank,provider},inputs);
  assert.equal(next.bank.accounts.cash,bank.accounts.cash);
  assert.equal(next.bank.accounts.payables,500000); assert.equal(next.bank.retainedEarnings,-500000);
  assert.equal(next.provider.accounts.cash,0); assert.equal(next.provider.accounts.businessAssets,500000);
  assert.equal(next.provider.retainedEarnings,500000);
  assert.equal(next.bank.accounts.equity+next.provider.accounts.equity,bank.accounts.equity);
  assert.equal(A.check(next.bank).residual,0);assert.equal(G.validate(next.provider).residual,0);
});
test('Partial settlement transfers existing cash and never records a second expense', () => {
  const invoice=G.bankServiceInvoice(A.opening(3),G.opening('provider'),500000,'bank:0');
  const paid=G.settleBankPayable(invoice.bank,invoice.provider,200000,'bank:0');
  assert.equal(paid.bank.accounts.payables,300000); assert.equal(paid.provider.accounts.businessAssets,300000);
  assert.equal(paid.bank.accounts.cash+paid.provider.accounts.cash,2400000);
  assert.equal(paid.bank.retainedEarnings,invoice.bank.retainedEarnings);
  assert.equal(paid.provider.retainedEarnings,invoice.provider.retainedEarnings);
  assert.equal(paid.bank.accounts.emergencyDebt,0);
  equal(A.snapshot(A.restore(A.snapshot(paid.bank))),A.snapshot(paid.bank));
});
test('Explicit creditor write-off is a paired noncash loss and liability-release gain', () => {
  const invoice=G.bankServiceInvoice(A.opening(3),G.opening('provider'),500000,'bank:0');
  const result=G.writeOffBankPayable(invoice.bank,invoice.provider,100000,'bank:0');
  assert.equal(result.bank.accounts.payables,400000);assert.equal(result.provider.accounts.businessAssets,400000);
  assert.equal(result.bank.accounts.cash,invoice.bank.accounts.cash);assert.equal(result.provider.accounts.cash,0);
  assert.equal(result.bank.retainedEarnings,-400000);assert.equal(result.provider.retainedEarnings,400000);
  assert.equal(result.bank.accounts.equity+result.provider.accounts.equity,1800000);
  assert.throws(()=>A.transact(invoice.bank,'forgivePayable',100000));
});
test('Inadequate cash or creditor claim fails atomically without borrowing or asset sale', () => {
  const invoice=G.bankServiceInvoice(A.opening(3),G.opening('provider'),3000000,'bank:0'),before=clone(invoice);
  assert.throws(()=>G.settleBankPayable(invoice.bank,invoice.provider,2500000,'bank:0'));
  equal(invoice,before);
  assert.throws(()=>G.settleBankPayable(invoice.bank,G.opening('wrong-provider'),100,'bank:0'));
  assert.throws(()=>G.writeOffBankPayable(invoice.bank,invoice.provider,3000001,'bank:0'));
  equal(invoice,before);assert.equal(invoice.bank.accounts.emergencyDebt,0);
});
test('Payable primitives reject old books and malformed amounts or counterparties', () => {
  for(const version of [1,2]) {
    const bank=A.opening(version),provider=G.opening('provider');
    for(const fn of ['bankServiceInvoice','settleBankPayable','writeOffBankPayable'])assert.throws(()=>G[fn](bank,provider,1,'bank:0'));
    assert.throws(()=>A.transact(bank,'incurPayable',1));assert.throws(()=>A.transact(bank,'settlePayable',1));
  }
  for(const amount of [-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>G.bankServiceInvoice(A.opening(3),G.opening('provider'),amount,'bank:0'));
  for(const id of ['',null,{},'a'.repeat(101)])assert.throws(()=>G.bankServiceInvoice(A.opening(3),G.opening('provider'),1,id));
});
test('Strict v3 schema and balance validation reject inconsistent books and versions', () => {
  for(const mutate of [b=>{b.version=4;},b=>{b.accounts.payables=-1;},b=>{delete b.accounts.payables;},
    b=>{b.accounts.extra=0;},b=>{b.extra=true;},b=>{b.accounts.payables=1;},b=>{b.accounts.receivables=1;},
    b=>{b.accounts.payables=.1;},b=>{b.accounts.cash=Number.MAX_SAFE_INTEGER;}]) {
    const book=A.opening(3);mutate(book);assert.throws(()=>A.check(book));assert.throws(()=>A.withPayables(book));
  }
  for(const version of [0,4,'3',null])assert.throws(()=>A.opening(version));
});
test('Compacted v3 journal replays invoices and settlements without re-expensing', () => {
  let bank=A.opening(3);
  for(let n=0;n<150;n++){bank=A.transact(bank,'incurPayable',10);bank=A.transact(bank,'settlePayable',4);}
  const snap=A.snapshot(bank,32),restored=A.restore(snap);
  assert.equal(snap.entries.length,32);assert.equal(restored.accounts.payables,900);assert.equal(restored.retainedEarnings,-1500);
  equal(A.snapshot(restored,32),snap);
  for(const mutate of [s=>{s.format='bw-accounting-2';},s=>{s.format='bw-accounting-4';},
    s=>{s.closing.accounts.payables++;},s=>{s.entries[0].earnings++;},s=>{s.entries[0].id++;},
    s=>{s.checkpoint.accounts.extra=0;},s=>{s.extra=true;}]) {
    const malformed=clone(snap);mutate(malformed);assert.throws(()=>A.restore(malformed));
  }
});
test('Consolidation includes accrued expense and liability without counting external receivable', () => {
  const bank=A.opening(3),parent=G.post(G.opening('parent'),'ownership','bank:0',{investments:1800000,equity:1800000});
  const before=G.consolidate(parent,[],bank),invoice=G.bankServiceInvoice(bank,G.opening('provider'),500000,'bank:0');
  const after=G.consolidate(parent,[],invoice.bank);
  assert.equal(after.assets,before.assets);assert.equal(after.liabilities,before.liabilities+500000);
  assert.equal(after.equity,before.equity-500000);assert.equal(after.retainedEarnings,-500000);assert.equal(after.residual,0);
});
function profitablePayable() {
  let bank=A.opening(3);bank=A.transact(bank,'income',3000000);bank=A.transact(bank,'buySecurities',3000000);
  return A.transact(bank,'incurPayable',1000000);
}
test('Dividends and discretionary spending protect owed cash without double-counting capital expense', () => {
  const p=player(profitablePayable()),before=clone(p),quote=now.quote(p);
  equal(p,before);assert.equal(quote.duePayables,1000000);assert.equal(quote.dividendLimit,200000);
  assert.equal(now.spending(p),1400000);
  assert.throws(()=>G.bankDividend(p.accounting,p.financialGroup.parent,200001,quote));
  const paid=G.bankDividend(p.accounting,p.financialGroup.parent,200000,quote);
  assert.equal(paid.bank.accounts.cash,2200000);assert.equal(paid.bank.accounts.payables,1000000);
  assert.equal(paid.parent.accounts.cash,200000);equal(p,before);
});
test('Automatic emergency debt repayment cannot consume payable reserves', () => {
  let book=profitablePayable();book=A.transact(book,'borrow',1000000);book=A.transact(book,'buySecurities',1000000);
  const p=player(book);now.settle({},p,0);
  assert.equal(p.accounting.accounts.emergencyDebt,800000);assert.equal(p.accounting.accounts.cash,2200000);
  assert.equal(p.accounting.accounts.payables,1000000);assert.equal(p.accounting.retainedEarnings,2000000);
  assert.throws(()=>now.settle({},p,1));equal(now.settle({}, {stats:{}},0),['legacy']);
});
console.log(`${checks} accounting-payables checks passed against current source and immutable ${baseline} baseline. Group4 campaign integration remains a separate gate.`);
