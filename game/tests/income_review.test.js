'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs');
class FixedClock extends Date {static now(){return 123456789;}}
function context(){const math=Object.create(Math);math.random=()=>.314159;return {Date:FixedClock,Math:math};}
const c=context();vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);
const E=c.BWEngine,R=E.IncomeReview,copy=x=>JSON.parse(JSON.stringify(x));
const event=(cycle,value,target='owner')=>({cycle,target,category:'operations.result',visibility:'owner',report:{cycle,loanIncome:value,chargeoff:2,commercialIncome:10}});
test('history is owner-only, deduplicated, bounded, cycle-aware and never backfilled',()=>{
 const v={cycle:21,me:{id:'owner'},operatingEvents:Array.from({length:20},(_,i)=>event(i+1,(i+1)*10))};
 v.operatingEvents.push(event(20,999,'rival'),event(21,888),{...event(20,777),visibility:'public'},event(19,190));
 v.operatingEvents=v.operatingEvents.filter(e=>e.cycle!==18);v.rival={operatingReport:{cycle:20,loanIncome:1000000}};
 const bytes=JSON.stringify(v),h=R.history(v);assert.equal(h.length,12);assert.equal(h[0].cycle,9);assert.equal(h.at(-1).loanIncome,200);assert.equal(h[9].loanIncome,null);
 assert.equal(JSON.stringify(v),bytes);assert.deepEqual(copy(R.history({cycle:1,me:{id:'owner'}})),[]);
 assert.equal(R.history({...v,gameOver:true}).at(-1).loanIncome,888);
 const pruned={cycle:3,me:{id:'owner',operatingReport:{cycle:2,loanIncome:90}},operatingEvents:[]};
 assert.equal(R.history(pruned)[0].available,false);assert.equal(R.history(pruned)[1].loanIncome,90);
 assert.equal(R.history({...pruned,me:{...pruned.me,operatingReport:{cycle:0,loanIncome:90}}}).length,0);
 const stale={cycle:5,me:{id:'owner',operatingReport:{cycle:1,loanIncome:90}}};
 assert.equal(R.compare(stale,{loanIncome:100},{loanIncome:100},'loanIncome').actual,null,'Do not label a stale report as the last completed month');
});
test('actual, forecast growth and draft effect are separate; zero/negative/missing baselines have no invented percentage',()=>{
 const v={cycle:3,me:{id:'owner'},operatingEvents:[event(1,100),event(2,150)]};
 const q=R.compare(v,{loanIncome:200},{loanIncome:200},'loanIncome');
 assert.equal(q.actualChange.amount,50);assert.equal(q.actualChange.percent,50);assert.equal(q.forecastChange.amount,50);assert.equal(q.draftChange.amount,0);
 assert.equal(R.change(10,0).percent,null);assert.equal(R.change(10,-10).percent,null);assert.equal(R.change(10,null).amount,null);assert.equal(R.change(NaN,1).amount,null);
 const sparse={...v,operatingEvents:[event(2,150)]};assert.equal(R.compare(sparse,{},{} ,'loanIncome').actualChange.amount,null);
 assert.equal(R.compare(v,{loanIncome:20,chargeoff:30},{loanIncome:20,chargeoff:30},'loanAfterLosses').draft,-10);
});
test('profit bridge identifies invoice losses, roundoff and genuine unmatched differences',()=>{
 const r={depositIncome:10,loanIncome:20,commercialIncome:30,otherIncome:40,fundingCost:5,expense:25,chargeoff:10,eventAdjustment:-2,corporateInvoiceLoss:3,profit:55};
 const b=R.reconciliation(r);assert.equal(b.calculated,55);assert.equal(b.residual,0);assert(b.reconciled);
 assert.equal(R.reconciliation({...r,profit:56}).residual,1);assert.equal(R.reconciliation({...r,profit:75}).reconciled,false);assert.equal(R.reconciliation({}),null);
});
test('principal history uses only recorded own balances and leaves missing previous-month changes unavailable',()=>{
 const v={cycle:4,me:{id:'owner'},trend:[{cycle:0,meLoans:100,rivalLoans:999},{cycle:1,meLoans:90},{cycle:3,meLoans:80},{cycle:4,meLoans:999}]},bytes=JSON.stringify(v),h=R.principalHistory(v);
 assert.equal(h.length,4);assert.equal(h[0].principal,100);assert.equal(h[1].change.amount,-10);assert.equal(h[2].principal,null);assert.equal(h[3].change.amount,null);assert.equal(JSON.stringify(v),bytes);
});
test('Core exact creation, turns, RNG, save and rematch remain identical to frozen V4',()=>{
 const old=context();vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../../releases/v4/BRANCH_WARS.html'),'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1],old);
 const g=E.createGame({mode:'hotseat',seed:'income-legacy',created:1}),baseline=old.BWEngine.createGame({mode:'hotseat',seed:'income-legacy',created:1});
 assert.equal(JSON.stringify(g),JSON.stringify(baseline));
 for(let month=0;month<12&&!g.gameOver;month++){
  for(let seat=0;seat<2;seat++){E.submit(g,seat,E.chooseBot(g,seat));old.BWEngine.submit(baseline,seat,old.BWEngine.chooseBot(baseline,seat));}
  assert.equal(JSON.stringify(g),JSON.stringify(baseline));
  const view=E.publicState(g,0),bytes=JSON.stringify(g);R.history(view);R.compare(view,{},{} ,'loanIncome');R.reconciliation(view.me.operatingReport);assert.equal(JSON.stringify(g),bytes);
  const resumed=E.migrateCampaign(copy(g));assert.deepEqual(copy(R.history(E.publicState(resumed,0))),copy(R.history(view)));
 }
 // Rematch is legal only after a terminal game. Identical terminal fixtures.
 g.gameOver=true;baseline.gameOver=true;
 assert.equal(JSON.stringify(E.rematch(g,0)),JSON.stringify(old.BWEngine.rematch(baseline,0)));
 assert.equal(JSON.stringify(E.rematch(g,1)),JSON.stringify(old.BWEngine.rematch(baseline,1)));
 assert.equal(JSON.stringify(g),JSON.stringify(baseline));
});
