'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=require('../tools/build_game').assemble().html,ctx={};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.coreProbe={delta,settleFunding,postMonthlyOperations,applyProjectEffects,absorbFranchise,calculateLegacyOperations,researchRelationshipCapacity};root.BWEngine={'),ctx);
const E=ctx.BWEngine,P=ctx.coreProbe,copy=x=>JSON.parse(JSON.stringify(x));
const options={incomeHistoryVersion:1,commercialServiceVersion:1,bankEconomicsVersion:2,created:1,seed:'core-funding',mode:'hotseat'};
test('Core opening accounts represent existing resources, separately from Expanded geography',()=>{
 for(const scenario of ['balanced','rate','regulatory','growth']){
  const g=E.createGame({...options,scenario}),old=E.createGame({...options,scenario,bankEconomicsVersion:1});
  assert.equal(g.version,'8.19');assert.equal(g.campaignRulesVersion,undefined);assert.equal(Object.keys(g.territories).length,12);
  g.players.forEach((p,i)=>{assert.deepEqual(copy(p.stats),copy(old.players[i].stats));E.AccountingPrototype.check(p.accounting);});
  E.validatePilot(g);
 }
});
test('Core deposits and funded loans conserve their corresponding balance-sheet movements',()=>{
 const g=E.createGame(options),p=g.players[0],s=copy(p.stats);
 P.delta(p,'deposits',400000);assert.equal(p.stats.cash,s.cash+400000);assert.equal(p.stats.capital,s.capital);
 P.delta(p,'loans',250000);assert.equal(p.stats.cash,s.cash+150000);assert.equal(p.stats.loans,s.loans+250000);
 P.delta(p,'deposits',-400000);assert.equal(p.stats.cash,s.cash-250000);
 assert.equal(p.stats.earnings,0);E.AccountingPrototype.check(p.accounting);
});
test('Core prices securities and loans once, and funded credit brings bounded deposit relationships',()=>{
 const g=E.createGame({...options,researchProgramVersion:1}),p=g.players[0],before=p.stats.deposits;
 const plans=g.players.map((_,i)=>E.chooseBot(g,i));for(const i of [0,1])E.submit(g,i,plans[i]);
 E.validatePilot(g);
 assert.equal(p.operatingReport.depositIncome,0);
 assert(p.operatingReport.incomeSource_securitiesInterest>0);
 assert(p.operatingReport.loanIncome>0);
 assert(p.stats.deposits>before);
 const near=copy(p);delete near.accounting;
 near.stats.business=P.researchRelationshipCapacity(near)-near.stats.merchant-1;
 P.calculateLegacyOperations(g,near,true);
 assert(near.stats.business+near.stats.merchant<=P.researchRelationshipCapacity(near));
 const margin=copy(p),balanced=copy(p);delete margin.accounting;delete balanced.accounting;
 margin.policies.deposit='margin';balanced.policies.deposit='balanced';
 margin.stats.rateSensitiveDeposits=balanced.stats.rateSensitiveDeposits=1000000;
 P.calculateLegacyOperations(g,margin,true);P.calculateLegacyOperations(g,balanced,true);
 assert(margin.operatingReport.depositRunoff>balanced.operatingReport.depositRunoff);
});
test('Core alone assigns durable research franchise value',()=>{
 const g=E.createGame({...options,researchProgramVersion:1}),p=g.players[0],old=E.createGame(options),legacy=old.players[0],tier=E.CAPABILITY_TIERS.network[0];
 const before=E.baseScore(g,0),oldBefore=E.baseScore(old,0);
 p.capability.network=tier;legacy.capability.network=tier;
 assert.equal(Math.round(E.baseScore(g,0)-before),135);
 assert.equal(Math.round(E.baseScore(old,0)-oldBefore),18);
});
test('Core preview is pure and actual campaigns settle and restore with private books',()=>{
 const g=E.createGame(options);
 for(let month=1;month<=12&&!g.gameOver;month++){
  const plans=g.players.map((_,i)=>E.chooseBot(g,i)),before=JSON.stringify(g);
  for(const seat of [0,1]){const v=E.publicState(g,seat);E.validateIncomeHistoryView(v);assert.equal(v.rival.accounting,undefined);E.operatingPreview(v.me,plans[seat],v.economy,v);}
  assert.equal(JSON.stringify(g),before);
  E.submit(g,0,plans[0]);const loaded=E.migrateCampaign(copy(g));
  E.submit(g,1,plans[1]);E.submit(loaded,1,copy(plans[1]));E.validatePilot(g);E.validateLedger(g);
  assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(E.migrateCampaign(copy(loaded))));
 }
});
test('Core balance-sheet rules reject downgrades, missing books, unsupported peers and Expanded combinations',()=>{
 const g=E.createGame(options),bad=copy(g);delete bad.players[0].accounting;assert.throws(()=>E.migrateCampaign(bad),/Core balance sheet/);
 const mismatch=copy(g);mismatch.bankEconomicsVersion=1;assert.throws(()=>E.migrateCampaign(mismatch),/rules|version/i);
 const caps=E.campaignCapabilities();delete caps.coreAccountingSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'bankEconomicsVersion');
 const oldRules=E.createGame({...options,bankEconomicsVersion:1});assert.equal(E.peerRulesIssue(E.campaignRules(oldRules,{context:'game'}),caps),null);assert.equal(caps.bankEconomicsSupported,1);
 assert.throws(()=>E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true}).options,commercialServiceVersion:1,creditWorkloadVersion:1,bankEconomicsVersion:2}),/Core balance-sheet/);
 assert.throws(()=>E.createGame({...options,fundingRulesVersion:1}),/Core balance-sheet/);
 const v=E.publicState(g,0);v.me.stats.cash++;assert.throws(()=>E.validateIncomeHistoryView(v),/disagree/);
});
test('Core acquisitions and ending absorption transfer funded books rather than cloning assets',()=>{
 for(const absorption of [false,true]){
  const g=E.createGame(options),[buyer,seller]=g.players,initial=g.players.map(p=>copy(p.stats));
  if(absorption)P.absorbFranchise(g,buyer,seller);else P.applyProjectEffects(g,buyer,{key:'acquisition',target:'northside'});
  for(const key of ['deposits','loans','customers','business'])assert.equal(buyer.stats[key]+seller.stats[key],initial[0][key]+initial[1][key],key);
  for(const p of g.players)E.AccountingPrototype.check(p.accounting);
  assert(buyer.stats.deposits>initial[0].deposits);assert(seller.stats.deposits<initial[1].deposits);
  const loss=initial.reduce((n,s)=>n+s.capital,0)-g.players.reduce((n,p)=>n+p.stats.capital,0);
  assert(loss>=0);assert.equal(g.players.reduce((n,p)=>n+p.stats.earnings,0),0-loss);
 }
});
test('Core rematches open a fresh balanced book without carrying the previous journal',()=>{
 const g=E.createGame(options);P.delta(g.players[0],'cash',100);
 g.gameOver=true;E.rematch(g,0);E.rematch(g,1);
 assert.equal(g.version,'8.19');assert.equal(g.bankEconomicsVersion,2);E.validatePilot(g);
 assert.equal(g.players[0].accounting.sequence,0);assert.equal(g.players[0].accounting.retainedEarnings,0);
});
test('Core liquid-policy cash is explained by funded growth and profit, with no automatic cash grant',()=>{
 const g=E.createGame(options),plan=E.chooseBot(g,0),v=E.publicState(g,0);
 plan.capitalPolicy='liquid';const r=E.operatingPreview(v.me,plan,v.economy,v);
 assert.equal(r.fundingLoss,0);
 assert.equal(r.closingCash-v.me.stats.cash,Math.round(r.depositGrowth)-Math.round(r.loanGrowth)+r.profit);
 assert.equal(r.closingEquity-v.me.stats.capital,r.profit);
});
