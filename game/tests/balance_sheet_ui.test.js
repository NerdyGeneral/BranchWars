'use strict';
// Real accounting and renderer: noncash claims must never disappear from totals.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const dashboard=read('src/ui/dashboard.js'),start=dashboard.indexOf('function renderBalanceSheet('),end=dashboard.indexOf('\nfunction renderDepositProducts(',start);
assert(start>=0&&end>start);
const context=vm.createContext({});
vm.runInContext(read('src/engine/accounting.js')+'\nconst E={AccountingPrototype};const money=n=>"$"+n;const esc=s=>String(s).replaceAll("<","&lt;").replaceAll(">","&gt;");\n'+dashboard.slice(start,end)+'\nglobalThis.api={A:AccountingPrototype,render:renderBalanceSheet};',context);
const {A,render}=context.api;
const row=(html,label,value)=>assert(html.includes('<span>'+label+'</span><b>$'+value+'</b>'),label+' must show '+value);
let checks=0;
for(const version of [1,2,3]){
 let book=A.opening(version);
 if(version>=2)book=A.transact(book,'invoice',12345);
 if(version>=3)book=A.transact(book,'incurPayable',7654);
 const before=JSON.stringify(book),html=render({me:{accounting:book}}),position=A.check(book);
 row(html,'Total assets',position.assets);row(html,'Liabilities + equity',position.liabilities+position.equity);
 row(html,'Equity',position.equity);assert.match(html,/Assets − liabilities − equity: \$0\./);
 assert.equal(html.includes('Corporate receivables'),version>=2);assert.equal(html.includes('Unpaid operating obligations'),version>=3);
 if(version>=2){row(html,'Corporate receivables',12345);assert.match(html,/receivables \$12345/);assert.match(html,/not spendable cash/);}
 if(version>=3){row(html,'Unpaid operating obligations',7654);assert.match(html,/payables \$7654/);assert.match(html,/already expensed liabilities/);}
 assert.equal(JSON.stringify(book),before,'Rendering cannot mutate the book');checks++;
 if(version>=2){
  const collected=A.transact(book,'collectInvoice',12345),out=render({me:{accounting:collected}});
  row(out,'Corporate receivables',0);row(out,'Cash',book.accounts.cash+12345);row(out,'Total assets',position.assets);row(out,'Equity',position.equity);checks++;
 }
 if(version>=3){
  const paid=A.transact(book,'settlePayable',7654),out=render({me:{accounting:paid}});
  row(out,'Unpaid operating obligations',0);row(out,'Cash',book.accounts.cash-7654);row(out,'Equity',position.equity);checks++;
 }
 const invalid=JSON.parse(before);invalid.accounts.cash++;
 assert.throws(()=>render({me:{accounting:invalid}}),/Unbalanced/);checks++;
}
assert.equal(render({me:{}}),'');checks++;
console.log(JSON.stringify({passed:true,checks,scope:'Actual accounting-v1/v2/v3 balance-sheet renderer, claims, payments, conservation, purity and malformed-book refusal; not full-browser acceptance.'}));
