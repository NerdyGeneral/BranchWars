'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const ctx={console};vm.runInNewContext(fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1]
 .replace('root.BWEngine={','root.BWEngine={consequences,settleGroupCapital,evaluateStrategicEnd,syncAccounts,'),ctx);
const E=ctx.BWEngine,options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:1}).options;
const fresh=extra=>E.createGame({...options,mode:'hotseat',seed:'group-core',created:1,...extra});
let checks=0,months=0;
const same=(a,b)=>assert.deepEqual(copy(a),copy(b));
function valid(g){E.validatePilot(g);E.validateLedger(g);for(const seat of [0,1])E.validateFinancialGroupView(E.publicState(g,seat));}
function plan(g,seat){const q=E.chooseBot(g,seat);q.groupPolicy.creditAllocation={mortgage:50,middleMarket:25,consumer:25};return q;}
const created=fresh();valid(created);assert.equal(created.version,'9.0');
for(const p of created.players){
 assert.equal(p.financialGroup.parent.accounts.cash,0);
 assert.equal(E.GroupAccounting.consolidate(p.financialGroup.parent,[],p.accounting).equity,p.stats.capital);
}checks++;
assert.equal(E.peerRulesIssue(E.validateCampaignRules(created,'game'),E.campaignCapabilities()),null);
const oldCaps={...E.campaignCapabilities()};delete oldCaps.financialGroupSupported;
assert.equal(E.peerRulesIssue(E.validateCampaignRules(created,'game'),oldCaps).field,'financialGroupVersion');checks++;
assert.throws(()=>fresh({productProgramsVersion:1}),/requires/);
// Still refused, for a new reason: the modular pilot is retired, so the version
// itself is rejected rather than the Financial Group combination.
assert.throws(()=>fresh({featureRulesVersion:1}),/not supported|matching|Unsupported modular/);checks++;
for(const damage of [
 g=>delete g.financialGroupVersion,g=>g.financialGroupVersion=2,g=>g.version='8.15',
 g=>g.players[0].financialGroup.parent.accounts.cash++,
 g=>g.players[0].financialGroup.parent.entityId='another-parent',
 g=>g.players[0].creditPortfolio.allocation.mortgage=25,
 g=>g.players[0].creditPortfolio.allocation.extra=0
]){
 const bad=copy(created);damage(bad);const before=JSON.stringify(bad);
 assert.throws(()=>E.migrateCampaign(bad));assert.equal(JSON.stringify(bad),before);checks++;
}
for(const allocation of [
 {mortgage:50,middleMarket:25,consumer:0},{mortgage:50,middleMarket:25,consumer:25,extra:0},
 {mortgage:50,middleMarket:25,consumer:'25'},{mortgage:40,middleMarket:30,consumer:30}
]){
 const p=created.players[0],q={groupPolicy:{...E.defaultGroupPlan(p),creditAllocation:allocation}};
 assert.throws(()=>E.normalizeGroupPlan(p,q));checks++;
}
for(const scenario of ['balanced','rate','regulatory','growth'])for(const seat of [0,1]){
 let g=fresh({scenario,seed:seat+':'+scenario});
 const openingPrincipal=g.players[seat].stats.loans;
 for(let month=0;month<12;month++){
  const q=[plan(g,0),plan(g,1)],before=JSON.stringify(g);
  const preview=E.operatingPreview(E.publicState(g,seat).me,q[seat],g.economy);
  assert.equal(JSON.stringify(g),before,'Forecast changed authoritative group or loan books.');
  assert(Number.isFinite(preview.profit));
  E.submit(g,0,q[0]);const resumed=E.migrateCampaign(copy(g));
  assert.equal(E.publicState(g,1).rival.financialGroup,undefined);
  E.submit(g,1,q[1]);E.submit(resumed,1,copy(q[1]));valid(g);valid(resumed);
  same(E.migrateCampaign(g),E.migrateCampaign(resumed));months++;
 }
 const owner=g.players[seat],products=new Set(owner.creditBook.cohorts.map(c=>c.product));
 assert.equal(products.size,3);assert(owner.stats.loans!==openingPrincipal);
 same(owner.creditPortfolio.allocation,{mortgage:50,middleMarket:25,consumer:25});
 const view=E.publicState(g,seat);assert.equal(view.lastPlans[g.players[1-seat].id].groupPolicy,undefined);
 g.gameOver=true;E.rematch(g,0);E.rematch(g,1);valid(g);assert.equal(g.financialGroupVersion,1);
 assert.equal(g.players[0].financialGroup.parent.accounts.cash,0);checks++;
}
// End-of-month transfers must reconcile the combined entity, including reductions
// after planned operating obligations. Earnings are earned by normal turns.
let funding=fresh({seed:'capital-transfer'});
for(let month=0;month<18;month++){
 const q=[plan(funding,0),plan(funding,1)];
 for(const seat of [0,1]){q[seat].newProjects=[];q[seat].newProject=null;q[seat].investments={};q[seat].hires=0;
   if(q[seat].specialistHires)for(const key of Object.keys(q[seat].specialistHires))q[seat].specialistHires[key]=0;}
 if(month>2){q[0].groupPolicy.bankDividend=Math.min(10000,E.groupCapitalQuote(funding.players[0]).dividendLimit);}
 if(month>6){q[1].groupPolicy.bankDividend=Math.min(10000,E.groupCapitalQuote(funding.players[1]).dividendLimit);}
 E.submit(funding,0,q[0]);E.submit(funding,1,q[1]);valid(funding);months++;
}
assert(funding.players.some(p=>p.financialGroup.parent.accounts.cash>0),'Actual profitable play must reach a dividend.');
const p=funding.players[0],q=[plan(funding,0),plan(funding,1)];
q[0].groupPolicy.bankSupport=Math.min(10000,p.financialGroup.parent.accounts.cash);
const parentCash=p.financialGroup.parent.accounts.cash;
E.submit(funding,0,q[0]);E.submit(funding,1,q[1]);valid(funding);months++;
assert.equal(p.financialGroup.parent.accounts.cash,parentCash-q[0].groupPolicy.bankSupport);checks++;
// Regression: consequences can increment distress before a funded month-end
// rescue. Reassess only a real cure, never reset a still-failing bank or debt.
for(const support of [0,100,20000]){
 const g=fresh({seed:'funded-rescue'}),owner=g.players[0],income=100000;
 owner.accounting=E.AccountingPrototype.post(owner.accounting,'test.priorIncome',
   {cash:income,equity:income},income);E.syncAccounts(owner);
 const moved=E.GroupAccounting.bankDividend(owner.accounting,owner.financialGroup.parent,20000,E.groupCapitalQuote(owner));
 owner.accounting=moved.bank;owner.financialGroup.parent=moved.parent;E.syncAccounts(owner);
 const capital=Math.floor(owner.stats.capital/E.capitalRatio(owner)*1.99),loss=owner.stats.capital-capital;
 owner.accounting=E.AccountingPrototype.post(owner.accounting,'test.priorLoss',{cash:-loss,equity:-loss},-loss);
 E.syncAccounts(owner);owner.distress=2;E.consequences(g,owner);assert.equal(owner.distress,3);
 const plans=g.players.map(x=>({groupPolicy:E.defaultGroupPlan(x)}));plans[0].groupPolicy.bankSupport=support;
 const equity=E.GroupAccounting.consolidate(owner.financialGroup.parent,[],owner.accounting).equity;
 E.settleGroupCapital(g,plans);E.evaluateStrategicEnd(g);
 assert.equal(owner.financialGroup.parent.accounts.cash,20000-support);
 assert.equal(E.GroupAccounting.consolidate(owner.financialGroup.parent,[],owner.accounting).equity,equity);
 assert.equal(g.gameOver,support<20000);
 assert.equal(owner.distress,support<20000?3:0);checks++;
 // A capital cure does not erase independently breached borrowing covenants.
 if(support===20000){owner.fundingCovenant.streak=3;
   owner.accounting=E.AccountingPrototype.transact(owner.accounting,'borrow',10000000);E.syncAccounts(owner);
   owner.fundingCovenant.lastCycle=0;E.evaluateStrategicEnd(g);
   assert.equal(g.gameOver,true);assert.equal(g.endReason,'funding_resolution');checks++;}
}
console.log(JSON.stringify({passed:true,checks,months,scope:'first group capital and simultaneous lending batch; subsidiaries and shares still incomplete'}));
