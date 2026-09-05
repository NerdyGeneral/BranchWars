'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,A=E.AccountingPrototype,copy=x=>JSON.parse(JSON.stringify(x));
const b=A.opening(),original=JSON.stringify(b);
assert.equal(A.check(b).assets,25800000);assert.equal(b.accounts.securities,13900000);
function transaction(type,amount,expected,earnings=0){
 const out=A.transact(b,type,amount);A.check(out);
 for(const [key,delta] of Object.entries(expected))assert.equal(out.accounts[key]-b.accounts[key],delta,type+':'+key);
 assert.equal(out.retainedEarnings,earnings);assert.equal(out.journal.length,1);
 assert.equal(JSON.stringify(b),original,'postings must not mutate inputs');
 return out;
}
transaction('deposit',10,{cash:10,deposits:10,equity:0});
transaction('withdraw',10,{cash:-10,deposits:-10,equity:0});
transaction('originate',10,{cash:-10,loans:10,equity:0});
transaction('repayLoan',10,{cash:10,loans:-10,equity:0});
transaction('income',10,{cash:10,equity:10},10);
transaction('expense',10,{cash:-10,equity:-10},-10);
transaction('chargeoff',10,{loans:-10,equity:-10},-10);
transaction('issueEquity',10,{cash:10,equity:10});
transaction('borrow',10,{cash:10,emergencyDebt:10});
transaction('buySecurities',10,{cash:-10,securities:10});
const debt=A.transact(b,'borrow',100),paid=A.transact(debt,'repayDebt',100);
assert.deepEqual(copy(paid.accounts),copy(b.accounts));assert.equal(paid.retainedEarnings,0);
for(const asset of ['loans','securities'])for(const amount of [1,9,999,1001,100000]){
 const s=A.sell(b,asset,amount,asset==='loans'?600:200),loss=Math.round(amount*(asset==='loans'?.06:.02));
 assert.equal(s.accounts.cash-b.accounts.cash,amount-loss);assert.equal(s.accounts.equity-b.accounts.equity,0-loss);A.check(s);
}
assert.throws(()=>A.transact(b,'withdraw',2500000),/accounting amount/);
for(const n of [-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>A.transact(b,'income',n));
assert.throws(()=>A.post(b,'unbalanced',{cash:1}),/Unbalanced/);
assert.throws(()=>A.post(b,'unknown',{otherAssets:1}),/Unknown/);
assert.throws(()=>A.transact(b,'toString',1),/Unknown/);
assert.throws(()=>A.sell(b,'cash',1,0),/Invalid/);
assert.throws(()=>A.sell(b,'loans',1,10001),/Invalid/);
const ruined=A.funded(b,'expense',3000000);assert.equal(ruined.accounts.equity,-1200000);assert.equal(ruined.accounts.emergencyDebt,600000);A.check(ruined);
const recipient=A.opening(),pair=A.transfer(b,recipient,3000000);
assert.equal(pair.from.accounts.deposits+pair.to.accounts.deposits,48000000);
assert.equal(pair.from.accounts.equity,b.accounts.equity);assert.equal(pair.to.accounts.equity,recipient.accounts.equity);
assert.equal(pair.from.accounts.emergencyDebt,600000);
assert.throws(()=>A.transfer(b,recipient,25000000));assert.equal(JSON.stringify(b),original);
assert.throws(()=>A.transfer(b,b,1));
const flows={depositIn:100000,depositOut:200000,loanOriginations:300000,loanRepayments:50000,cashIncome:80000,cashExpense:60000,creditLoss:10000};
const op=A.operations(b,flows);assert.equal(op.profit,10000);assert.equal(op.book.accounts.equity-b.accounts.equity,10000);
assert.equal(op.cashChange,-330000);assert.equal(op.book.accounts.loans-b.accounts.loans,240000);
assert.equal(op.borrowed,0);assert.equal(op.book.accounts.securities,b.accounts.securities,'no automatic securities yield or sale');
let replay=copy(b.accounts),earned=0;
for(const entry of op.book.journal){for(const [k,n] of Object.entries(entry.changes))replay[k]+=n;earned+=entry.earnings}
assert.deepEqual(replay,copy(op.book.accounts));assert.equal(earned,op.book.retainedEarnings);
assert.throws(()=>A.operations(b,{...flows,creditLoss:20000000}));assert.equal(JSON.stringify(b),original);
// Exercise the actual report bridge across all 27 deposit/lending/capital policies.
let previews=0;
const game=E.createGame({seed:'accounting',created:1,mode:'hotseat',scope:'national'});
const plan=E.chooseBot(game,0),bank=game.players[0],saved=JSON.stringify(game);
for(const depositPolicy of ['margin','balanced','aggressive'])for(const lendingPolicy of ['conservative','balanced','growth'])for(const capitalPolicy of ['liquid','balanced','reinvest']){
 const report=E.operatingPreview(bank,{...plan,depositPolicy,lendingPolicy,capitalPolicy},game.economy);
 const result=A.fromOperatingReport(b,report);assert.equal(result.profit,report.profit);
 assert.equal(result.book.accounts.equity-b.accounts.equity,report.profit);
 assert.equal(result.book.accounts.deposits-b.accounts.deposits,report.depositGrowth);
 A.check(result.book);previews++;
 const corrupt={...report,profit:report.profit+100};assert.throws(()=>A.fromOperatingReport(b,corrupt),/does not reconcile/);
}
assert.equal(JSON.stringify(game),saved,'accounting prototype must never change campaign state');
assert.equal(JSON.stringify(b),original);
// Deterministic transaction stress with no RNG dependency or residual account.
let stress=A.opening();
for(let i=1;i<=500;i++){
 stress=A.transact(stress,'deposit',i*37);
 stress=A.funded(stress,'originate',i*19);
 stress=A.transact(stress,'income',i*3);
 stress=A.funded(stress,'expense',i*2);
 A.check(stress);
}
assert.equal(stress.journal.length,2000);
console.log('Accounting prototype tests passed: opening reconciliation, atomic postings, transfers, loan funding, retained profits, noncash losses, debt, securities sales, '+previews+' real previews and 2000 reconciled stress postings. Campaign rules remain unchanged.');
