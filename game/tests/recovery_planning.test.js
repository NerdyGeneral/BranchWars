'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),context={console};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={',
  'root.recoveryTest={planBankRecovery,syncAccounts,applyDecision,consequences,recoveryDecisionSafe};root.BWEngine={'),context);
const E=context.BWEngine,H=context.recoveryTest,copy=x=>JSON.parse(JSON.stringify(x));
const settings={advertisingVersion:1,productProgramsVersion:1,segmentDepositsVersion:1,creditPerformanceVersion:1,
  customerOwnershipVersion:1,workforceVersion:1,customerDemandVersion:2,managementVersion:2,
  serviceExpansionVersion:1,campaignRulesVersion:1,mode:'hotseat',seed:'recovery-boundaries',created:1};
const fresh=extra=>E.createGame({...settings,...extra});
function equity(p,amount){const change=amount-p.stats.capital;p.accounting=E.AccountingPrototype.post(p.accounting,'test.equity',{cash:change,equity:change});H.syncAccounts(p);}
function plan(g){const q=E.chooseBot(g,0);Object.assign(q,{newProjects:[],newProject:null,investments:{},hires:0,competitiveAction:'none',capitalAction:false});
  for(const k of Object.keys(q.specialistHires))q.specialistHires[k]=0;for(const k of Object.keys(q.workforcePolicy.training))q.workforcePolicy.training[k]=0;
  q.advertisingPolicy.budget=0;q.productProgramPolicy.retire=[];return q;}
const g=fresh(),p=g.players[0];equity(p,650000);g.event={...g.event,key:'audit'};p.stats.compliance=0;p.stats.attention=20;
const q=plan(g);q.decision='a';q.newProjects=['remediation'];q.newProject='remediation';
const frozen=JSON.stringify(g),input=JSON.stringify(q),owner={...p,marketSnapshot:g.marketEconomy};
const result=E.bankRecoveryOptions(owner,q,g.economy,g.event),current=result.current;
assert(current.supported&&current.stressed);assert.equal(current.decisionExpense,130000);
assert(result.options.some(o=>o.key==='executive'));assert(result.options.some(o=>o.key==='commitments'));
const cheaper=result.options.find(o=>o.key==='executive');assert.equal(cheaper.plan.decision,'b');
assert.equal(cheaper.review.equityAfterPlan-current.equityAfterPlan,130000);
assert.equal(cheaper.review.nonOperatingSpend,current.nonOperatingSpend);
assert.equal(JSON.stringify(g),frozen);assert.equal(JSON.stringify(q),input);
for(let i=0;i<4;i++)assert.deepEqual(copy(E.bankRecoveryOptions(owner,q,g.economy,g.event)),copy(result));
assert.equal(JSON.stringify(g),frozen,'pure suggestions preserve world/RNG/accounts/ledger');
const chosen=H.planBankRecovery(g,0,q);assert.equal(chosen.decision,'b');assert.deepEqual(copy(E.planInitiatives(chosen)),[]);
const hidden=copy(g);hidden.players[1].submitted={competitiveAction:'depositRaid',decision:'b'};
assert.deepEqual(copy(H.planBankRecovery(hidden,0,q)),copy(chosen),'concealed rival input cannot inform recovery');
// Repeated cash-funded executive purchases drove the original month-80 failure.
// Existing controls make this bill optional, even when cash looks abundant.
const cashRich=fresh(),cp=cashRich.players[0];equity(cp,650000);
cp.accounting=E.AccountingPrototype.transact(cp.accounting,'deposit',50000000);H.syncAccounts(cp);
cp.stats.morale=100;cashRich.event={...cashRich.event,key:'succession'};
const succession=plan(cashRich);succession.decision='b';const sr=E.bankRecoveryOptions({...cp,marketSnapshot:cashRich.marketEconomy},succession,cashRich.economy,cashRich.event);
assert(cp.stats.cash>50000000);assert.equal(sr.current.decisionExpense,210000);
assert(sr.options.some(o=>o.key==='executive'&&o.plan.decision==='a'));
assert.equal(H.planBankRecovery(cashRich,0,succession).decision,'a');
// Cheapest is not automatically safe: preserve a needed audit, cyber protection
// or weak succession plan instead of claiming omitted consequences are savings.
for(const [event,decision,mutate] of [
  ['audit','a',p=>{p.stats.compliance=90;}],['audit','a',p=>{p.stats.compliance=28;p.stats.attention=95;}],['cyber','a',p=>{p.upgrades.technology=0;p.upgrades.training=0;p.upgrades.operations=0;}],
  ['succession','b',p=>{p.stats.morale=10;p.upgrades.training=0;}],['losses','a',()=>{}]
]){
  const bad=fresh(),bp=bad.players[0];equity(bp,650000);mutate(bp);bad.event={...bad.event,key:event};
  const bq=plan(bad);bq.decision=decision;bq.allocation={service:3,business:2,lending:2,operations:1};
  const options=E.bankRecoveryOptions({...bp,marketSnapshot:bad.marketEconomy},bq,bad.economy,bad.event);
  assert(!options.options.some(o=>o.key==='executive'||o.key==='combined'),event+' must not recommend a known dangerous cheap alternative');
}
// The call happens before operating workload. Exactly 78 morale is NOT enough
// when this allocation loses one morale before the internal succession check.
const boundary=fresh(),boundaryOwner=boundary.players[0];boundary.event={...boundary.event,key:'succession'};
boundaryOwner.stats.morale=78;boundaryOwner.allocation={service:3,business:2,lending:2,operations:1};
const boundaryPlan=plan(boundary);boundaryPlan.decision='b';boundaryPlan.allocation={...boundaryOwner.allocation};
assert(!H.recoveryDecisionSafe(boundaryOwner,boundaryPlan,'a',boundary.event));
const hypothetical=copy(boundary),hp=hypothetical.players[0];H.applyDecision(hypothetical,hp,'a');
E.operate(hypothetical,hp,true);assert.equal(hp.stats.morale,77);
assert(H.consequences(hypothetical,hp).some(line=>line.includes('succession plan exposed a leadership gap')));
boundary.event={...boundary.event,key:'manager'};boundaryOwner.stats.morale=74;
assert(!H.recoveryDecisionSafe(boundaryOwner,boundaryPlan,'b',boundary.event),'known workload precedes manager morale threshold');
boundary.event={...boundary.event,key:'fintech'};boundaryOwner.stats.reputation=70;
assert(!H.recoveryDecisionSafe(boundaryOwner,boundaryPlan,'b',boundary.event),'known service reputation decline precedes fintech threshold');
// Training/advertising costs enter operations once, never a second time as
// discretionary investment. Preserve signed business and already-running work.
const paid=fresh(),pp=paid.players[0];equity(pp,5000000);paid.event={...paid.event,key:'quiet'};
pp.workforce.departments.service.count=1;pp.workforce.departments.service.skill=0;
const pq=plan(paid);pq.decision='a';pq.advertisingPolicy.budget=15000;pq.workforcePolicy.training.service=20000;
const paidOwner={...pp,marketSnapshot:paid.marketEconomy},pr=E.bankRecoveryReview(paidOwner,pq,paid.economy,paid.event),budget=E.planBudget(pp,pq);
const preview=E.operatingPreview(paidOwner,pq,paid.economy);
assert.equal(pr.operatingSpend,budget.advertising+budget.training);assert.equal(pr.nonOperatingSpend,0);
assert.equal(pr.equityAfterPlan,preview.closingEquity);assert.equal(pr.netAfterSpend,preview.profit-(preview.fundingLoss||0));
const serviceReview=E.servicePlanReview(paidOwner,pq,paid.economy);
assert.equal(serviceReview.includedOperatingSpend,budget.advertising+budget.training);
assert.equal(serviceReview.nonOperatingSpend,0);
assert.equal(serviceReview.netAfterSpend,preview.profit-(preview.fundingLoss||0));
assert(!pr.stressed);assert.strictEqual(H.planBankRecovery(paid,0,pq),pq,'healthy plan is unchanged');
// Suggestions never promise rescue proceeds and old rule versions keep their AI.
const rescue=copy(g);rescue.players[0].capitalRequests=2;const rq=copy(q);rq.capitalAction=true;
assert.equal(E.bankRecoveryReview({...rescue.players[0],marketSnapshot:rescue.marketEconomy},rq,rescue.economy,rescue.event).equityAfterPlan,current.equityAfterPlan);
const old={...g,productProgramsVersion:undefined};assert.strictEqual(H.planBankRecovery(old,0,q),q);
assert.equal(E.bankRecoveryReview({...p,productPrograms:undefined},q,g.economy,g.event).supported,false);
// Owner projection can drive the human UI, and suggestions never leak into the
// rival projection or alter accepted plans merely by rendering a review.
const view=E.publicState(g,0),viewBefore=JSON.stringify(view);
assert.deepEqual(copy(E.bankRecoveryReview(view.me,q,view.economy,view.event)),copy(current));
assert.equal(JSON.stringify(view),viewBefore);assert.equal(view.rival.productPrograms,undefined);
console.log(JSON.stringify({passed:true,checks:['cash versus equity','known executive costs','safe alternatives','pure owner projections','commitment pause','no operating double count','hidden intent isolation','healthy and legacy unchanged']},null,2));
