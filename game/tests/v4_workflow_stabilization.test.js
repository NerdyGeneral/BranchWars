'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness}=require('./github_resilience.test'),copy=x=>JSON.parse(JSON.stringify(x));
function fresh(edition='expanded',covered=true){
 const h=harness();h.run("gh.active=false;p2pRole='';seat=0;const query=document.querySelector;document.querySelector=selector=>{const el=query(selector);el.insertAdjacentHTML=(position,html)=>el.innerHTML+=html;el.remove=()=>{el.innerHTML=''};return el;};");
 h.c.edition=edition;h.c.covered=covered;
 h.run("game=E.createGame({...E.previewCampaignEdition({},edition,{currentEconomics:true}).options,...(covered?{startingWorkforce:'covered'}:{}),mode:'hotseat',created:1,seed:'stabilization-human'});newDraft(currentView());draft.decision='b';");
 return h;
}
test('fresh human Expanded defaults cover essential work with finite existing people, not vendors',()=>{
 const h=fresh(),before=h.run('JSON.stringify(game)');
 assert(h.run('E.departmentFunctionsQuote(currentView(),currentView().me,draft).status.eligible'));
 assert.equal(h.run('draft.departmentFunctionsPolicy.quotas.credit.lending'),4);
 assert.equal(h.run('draft.departmentFunctionsPolicy.quotas.relationships.business'),1);
 assert.equal(h.run('Object.values(draft.departmentFunctionsPolicy.vendors).reduce((a,b)=>a+b,0)'),0);
 assert.equal(h.run('currentView().me.stats.staff'),8);
 assert(h.run('Object.values(E.departmentFunctionsQuote(currentView(),currentView().me,draft).remainingPools).every(n=>n>=0)'));
 const r=h.run('E.operatingPreview(currentView().me,draft,currentView().economy,currentView(),true)');
 assert(r.commercialIncome>0);assert(h.c.BWEngine.loanProductionBreakdown(r).ordinary>0);
 assert.equal(h.run('JSON.stringify(game)'),before);
});
test('local setup uses covered defaults, and Core remains byte-identical',()=>{
 const h=harness();h.run("const options=E.previewCampaignEdition({},'expanded',{currentEconomics:true}).options;readSetupFeatureOptions=()=>options;$('#aiName').value='Local';$('#aiScope').value='regional';$('#aiScenario').value='balanced';$('#aiDifficulty').value='vp';startLocal('ai');");
 assert.equal(h.run('game.players[0].departmentFunctions.policy.quotas.credit.lending'),4);
 const a=fresh('core'),b=fresh('core',false);assert.equal(a.run('JSON.stringify(game)'),b.run('JSON.stringify(game)'));
 assert.throws(()=>a.run("E.createGame({startingWorkforce:'auto'})"),/starting workforce/i);
});
test('explicit new rematch gets covered work without changing historical rematch defaults',()=>{
 for(const covered of [false,true]){const h=fresh();h.run('game.gameOver=true;game.mode="ai";');h.c.coveredRematch=covered;
  assert(h.run('E.rematch(game,0,coveredRematch?{startingWorkforce:"covered"}:undefined)'));
  assert.equal(h.run('game.version'),'9.32');assert.equal(h.run('game.players[0].departmentFunctions.policy.quotas.credit.lending'),covered?4:0);
  h.run('E.validatePilot(game)');
 }
});
test('legacy and deliberately zero production policies survive migrate, new draft and forecast',()=>{
 const h=fresh('expanded',false),before=h.run('JSON.stringify(game)');
 h.run('game=E.migrateCampaign(JSON.parse(JSON.stringify(game)));newDraft(currentView());draft.decision="b";');
 assert.equal(h.run('JSON.stringify(game)'),before);
 assert.equal(h.run('draft.departmentFunctionsPolicy.quotas.credit.lending'),0);
 const r=h.run('E.operatingPreview(currentView().me,draft,currentView().economy,currentView(),true)');
 assert.equal(h.c.BWEngine.loanProductionBreakdown(r).ordinary,0);assert.equal(r.commercialIncome,0);
 const healthy=fresh();healthy.run('draft.departmentFunctionsPolicy.quotas.credit.lending=0;draft.departmentFunctionsPolicy.quotas.relationships.business=0;');
 const stopped=healthy.run('E.operatingPreview(currentView().me,draft,currentView().economy,currentView(),true)');
 assert.equal(healthy.c.BWEngine.loanProductionBreakdown(stopped).ordinary,0);
 assert.equal(stopped.commercialIncome,0);assert(!healthy.run('monthlyPlanReview(currentView()).blockers.length'));
});
test('loan components reconcile without converting unavailable history into zero',()=>{
 const E=fresh().c.BWEngine;
 assert.deepEqual(copy(E.loanProductionBreakdown(null)),{available:false});
 assert(!E.loanProductionBreakdown({loanGrowth:0,principalRepaid:null}).available);
 const r={loanGrowth:210,principalRepaid:40,creditRecovery:10,chargeoff:20,companyCredit:{advanced:100,principalPaid:30,recoveredPrincipal:5,interestWrittenOff:5}};
 const b=E.loanProductionBreakdown(r);assert(b.available);assert.equal(b.ordinary,210);
 assert.equal(b.ordinary+b.named-b.scheduled-b.collections-b.losses,b.net);
 assert(!E.loanProductionBreakdown({loanGrowth:-100}).available);
});
test('current Expanded recovery subtracts already forecast recurring costs exactly once',()=>{
 const h=fresh();h.run('draft.departmentFunctionsPolicy.vendors.technology=1;');
 const before=h.run('JSON.stringify({game,draft})'),data=h.run('(()=>{const v=currentView(),p=v.me;return {forecast:E.operatingPreview(p,draft,v.economy,v),budget:E.planBudget(p,draft,v),review:E.bankRecoveryReview(p,draft,v.economy,v.event,v)}})()');
 const {forecast:r,budget:q,review}=data;
 assert(r.departmentFunctionExpense>0);assert(r.facilityMaintenance>0);
 const included=(q.advertising||0)+(q.training||0)+(q.relationshipOffers||0)+(q.onboarding||0)+Math.min(q.departmentFunctions||0,r.departmentFunctionExpense||0)+Math.min(q.departmentLeadership||0,r.departmentExpense||0)+Math.min(q.facilityLifecycle||0,r.facilityMaintenance||0);
 assert.equal(review.nonOperatingSpend,q.total-included);
 assert.equal(review.equityAfterPlan,r.closingEquity-review.decisionExpense-review.nonOperatingSpend);
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
});
test('AI submission rejects an invalid generated plan and restores locks and RNG',()=>{
 const h=fresh('core'),html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
 const c={};vm.runInNewContext(source.replace('root.BWEngine={','root.BWEngine={setBotForTest:fn=>{chooseOpenBot=fn},'),c);
 const E=c.BWEngine,g=copy(h.run('game'));g.mode='ai';const plan=copy(h.run('draft')),rng=copy(g.rng),cycle=g.cycle;
 E.setBotForTest(()=>{g.rng.aiState=1;return {...copy(plan),allocation:{service:900,business:0,lending:0,operations:0}}});
 assert.throws(()=>E.submit(g,0,plan));
 assert.equal(g.players[0].submitted,null);assert.equal(g.players[1].submitted,null);assert.equal(g.cycle,cycle);assert.deepEqual(copy(g.rng),rng);
});
test('inline editor moves a single live mount, restores its home, retains draft and closes on owner/month/lock change',()=>{
 const h=fresh();h.run('const inlineHome={insertBefore(node){node.parentElement=this;node.parentNode=this;}};const inlinePanel={parentElement:inlineHome,parentNode:inlineHome,hidden:false,classList:{contains(){return false},remove(){},add(){}}};$("#decisionGrid").parentElement=inlinePanel;$("#monthlyEditorBody").appendChild=function(node){node.parentElement=this;node.parentNode=this;};');
 const before=h.run('JSON.stringify(draft)');
 assert(h.run("openMonthlyEditor({id:'decision',title:'Answer call'})"));
 assert(h.run('monthlyEditorState.panel===inlinePanel'));assert(h.run('inlinePanel.parentElement===$("#monthlyEditorBody")'));
 h.run('closeMonthlyEditor()');assert(h.run('inlinePanel.parentElement===inlineHome'));
 assert.equal(h.run('JSON.stringify(draft)'),before);
 for(const change of ['game.cycle++','game.players[0].submitted=JSON.parse(JSON.stringify(draft))','seat=1']){
  const x=fresh();x.run('const home={insertBefore(node){node.parentElement=this;}};const panel={parentElement:home,hidden:false,classList:{contains(){return false},remove(){},add(){}}};$("#decisionGrid").parentElement=panel;$("#monthlyEditorBody").appendChild=function(node){node.parentElement=this};openMonthlyEditor({id:"decision"});'+change+';reconcileMonthlyEditor(currentView(),{blockers:[]});');
  assert(x.run('monthlyEditorState===null'));
 }
});
test('rendering and staffing forecasts preserve state and explicit disclosure choice',()=>{
 const h=fresh();const before=h.run('JSON.stringify({game,draft})');
 // Compatibility contract for the retained disclosure and forecast component.
 // Expanded's replacement Review is exercised by interface_shell and Chromium.
 h.run('expandedInterfaceEnabled=()=>false;');
 h.run('renderReady(currentView());$("#monthlyReviewDetails").open=false;renderReady(currentView());');
 assert.equal(h.elements.get('#monthlyReviewDetails').open,false);
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
 assert.match(h.elements.get('#operatingPreview').innerHTML,/New ordinary loans/);
 assert.doesNotMatch(h.elements.get('#attentionInbox').innerHTML,/Allocated staff does not mean all work is covered/);
});
