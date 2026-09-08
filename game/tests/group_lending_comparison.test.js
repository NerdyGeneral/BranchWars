'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ctx={console},copy=x=>JSON.parse(JSON.stringify(x));
const script=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
vm.runInNewContext(script.replace('root.BWEngine={','root.BWEngine={prepareOperatingForecast,finishOperatingForecast,'),ctx);
const E=ctx.BWEngine,options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:1}).options;
let comparisons=0,rows=0;
for(const scenario of ['balanced','rate','regulatory','growth'])for(const distressed of [false,true]){
 const g=E.createGame({...options,mode:'hotseat',seed:19,created:1,scenario});
 if(distressed)for(const c of g.players[0].creditBook.cohorts){c.seasoning=0;c.late=[0,0,Math.floor(c.principal/4)];}
 const plan=E.chooseBot(g,0),view=E.publicState(g,0),before=JSON.stringify({g,view,plan});
 const review=E.groupLendingComparison(view.me,plan,g.economy);
 assert.equal(JSON.stringify({g,view,plan}),before);
 assert.equal(review.horizon,24);assert(review.rows.length>=7&&review.rows.length<=9);
 const signatures=new Set();
 for(const row of review.rows){
  const signature=Object.values(row.allocation).join();assert(!signatures.has(signature));signatures.add(signature);
  assert.equal(Object.values(row.allocation).reduce((a,b)=>a+b,0),100);
  for(const key of ['originations','profit','capitalRatio','futureContribution','projectedLoss','utility'])
    assert(Number.isFinite(row[key]));
  const trial={...plan,groupPolicy:{...plan.groupPolicy,creditAllocation:row.allocation}};
  const staged=E.prepareOperatingForecast(view.me,trial);
  E.finishOperatingForecast(staged,g.economy);
  const originated=staged.creditBook.cohorts.filter(c=>c.seasoning===2).reduce((n,c)=>n+c.principal,0);
  assert.equal(row.originations,originated,'Comparison counts actual new cohorts, including credit-loss months.');
  assert.equal(row.profit,staged.operatingReport.profit);
  assert(row.projectedLoss>=0);rows++;
 }
 const hidden=copy(g);hidden.players[1].stats.cash+=999999;hidden.players[1].submitted={unseen:true};
 assert.deepEqual(copy(E.groupLendingComparison(E.publicState(hidden,0).me,plan,g.economy)),copy(review));
 comparisons++;
}
assert.throws(()=>E.groupLendingComparison(E.createGame({seed:1}).players[0],{},{}),/Financial Group/);
console.log(JSON.stringify({passed:true,comparisons,rows,checks:['owner-only pure scenario','actual origination cohorts',
 'loss-month reconciliation','bounded candidates','persistent old loans','unchanged legacy refusal']}));
