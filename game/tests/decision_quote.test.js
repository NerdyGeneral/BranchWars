'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const html=process.argv.includes('--source')?require('../tools/build_game.js').assemble().html:fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8');
const script=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const context={console};
vm.runInNewContext(script.replace('root.BWEngine={','root.decisionTest={applyDecision,syncAccounts,withMarket};root.BWEngine={'),context);
const E=context.BWEngine,H=context.decisionTest;
const cumulative={campaignRulesVersion:1,serviceExpansionVersion:1,managementVersion:2,customerDemandVersion:2,workforceVersion:1,customerOwnershipVersion:1,creditPerformanceVersion:1,segmentDepositsVersion:1,productProgramsVersion:1,advertisingVersion:1,regionalGrowthVersion:1,relationshipOffersVersion:1,onboardingVersion:1};
const profiles=[{}, {fundingRulesVersion:1}, cumulative];
const fresh=options=>E.createGame({mode:'hotseat',created:1,seed:'decision-quote',...options});
const intent=(p,choice)=>({focus:p.focus,allocation:{...p.allocation},depositPolicy:p.policies.deposit,lendingPolicy:p.policies.lending,capitalPolicy:p.policies.capital,products:{...p.products},decision:choice,newProjects:[],investments:{},hires:0,competitiveAction:'none',opportunity:null,capitalAction:false});
let direct=0,resolved=0;
for(const options of profiles)for(const event of E.EVENTS)for(const choice of ['a','b']){
 const g=fresh(options);g.event=copy(event);
 for(const seat of [0,1]){
  const owner=E.publicState(g,seat).me,initial=JSON.stringify({g,owner,event}),q=E.decisionQuote(owner,event,choice);
  assert.equal(JSON.stringify({g,owner,event}),initial,'quote cannot mutate owner, world, event, ledger or RNG');
  assert.deepEqual(copy(E.decisionQuote(owner,event,choice)),copy(q),'repeat quote is exact');
  const actual=copy(g.players[seat]),before=copy(actual.stats);H.applyDecision({event},actual,choice);
  const changes=Object.fromEntries(Object.keys(E.OPENING_STATS).map(k=>[k,actual.stats[k]-before[k]]).filter(([,n])=>n));
  assert.deepEqual(copy(q.changes),changes,'public-owner quote matches actual private decision stage');
  assert.equal(q.cashAfter,actual.stats.cash);assert.equal(q.equityChange,actual.stats.capital-before.capital);
  assert.equal(q.paid,Math.max(0,-q.cashChange),'liquid opening case has no forced funding');
  direct++;
 }
 const reference=copy(g),before=JSON.stringify(g),plans=g.players.map(p=>intent(p,choice));
 for(const seat of [0,1])E.decisionQuote(E.publicState(g,seat).me,event,choice);
 assert.equal(JSON.stringify(g),before);
 for(const seat of [0,1]){E.submit(g,seat,copy(plans[seat]));E.submit(reference,seat,copy(plans[seat]));}
 assert.deepEqual(copy(g),copy(reference),'advisory calls cannot alter full monthly settlement or random stream');
 for(const seat of [0,1]){
  const quoted=E.decisionQuote(E.publicState(fresh(options),seat).me,event,choice);
  const entry=g.eventLedger.find(e=>e.category==='decision'&&e.target===g.players[seat].id);
  assert.deepEqual(copy(entry?.deltas||{}),copy(quoted.changes),'quote matches recorded actual resolution decision boundary');
 }
 resolved++;
}
// Private book reconciliation remains correct when announced spending must
// sell securities, then distressed credit, then borrow. No nominal price map.
for(const funding of ['securities','loans','debt']){
 const g=fresh(cumulative),p=g.players[0],A=E.AccountingPrototype;
 if(funding!=='securities')p.accounting=A.sell(p.accounting,'securities',p.accounting.accounts.securities,200);
 if(funding==='debt')p.accounting=A.sell(p.accounting,'loans',p.accounting.accounts.loans,600);
 p.accounting=A.transact(p.accounting,'expense',p.accounting.accounts.cash-1000);H.syncAccounts(p);
 if(funding==='loans')for(const c of p.creditBook.cohorts)c.late=[0,0,Math.floor(c.principal/2)];
 const owner=E.publicState(g,0).me,initial=JSON.stringify({g,owner}),event=E.EVENTS.find(x=>x.key==='viral'),q=E.decisionQuote(owner,event,'a');
 assert.equal(q.paid,75000);assert(q.cashChange>=-1000,'funding masks some/all net cash decline, not the price');
 if(funding==='securities'){assert(q.securitiesSold>0);assert.equal(q.loansSold,0);}
 if(funding==='loans'){assert(q.loansSold>0);assert(q.fundingLoss>40000,'aging haircut is reflected');}
 if(funding==='debt'){assert(q.borrowed>0);assert.equal(q.fundingLoss,0);}
 assert.equal(q.equityChange,-q.paid-q.fundingLoss);assert.equal(q.spendingLimitAfter,0);
 assert.equal(JSON.stringify({g,owner}),initial,'funding quote cannot alter live books or outside resources');
 const actual=copy(p);H.withMarket(copy(g),()=>H.applyDecision({event},actual,'a'));
 assert.equal(q.cashAfter,actual.stats.cash);assert.equal(q.equityChange,actual.stats.capital-p.stats.capital);
}
assert.throws(()=>E.decisionQuote(fresh({}).players[0],{key:'unknown'},'a'),/known executive/);
assert.throws(()=>E.decisionQuote(fresh({}).players[0],E.EVENTS[0],'bad'),/known executive/);
// Rendered cost labels use the same quote; this is synthetic DOM coverage,
// not the separately required real rendered desktop/narrow acceptance.
const {harness}=require('./github_resilience.test.js'),h=harness();
h.run("game=E.createGame({mode:'hotseat',seed:19,created:1});game.event=E.EVENTS.find(x=>x.key==='viral');view=E.publicState(game,0);newDraft(view);renderAnalytics=()=>{};renderDecision(view)");
let markup=h.elements.get('#decisionGrid').innerHTML;
assert(markup.includes('Immediate cash paid $75,000'));assert(markup.includes('Cash balance change −$75,000'));
assert(markup.includes('outside the plan-budget total'));assert(markup.includes('delayed consequences'));
const state=h.run('JSON.stringify({game,draft})');h.run('renderDecision(view)');assert.equal(h.run('JSON.stringify({game,draft})'),state);
h.run('draft.investments={network:game.players[0].stats.cash};renderDecision(view)');
assert(h.elements.get('#decisionGrid').innerHTML.includes('Draft commitments exceed cash'));
console.log('Decision quote: '+direct+' direct owner comparisons; '+resolved+' full event/choice resolutions; forced securities/credit/debt funding; invalid inputs and UI advisory checks passed.');
