'use strict';
// Actual client commands and engine. The inert DOM below checks wiring/content,
// not layout, keyboard acceptance or real two-computer play.
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test');
const {harness}=require('./github_resilience.test');
function fresh(version=9){
 const h=harness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options,mode:'hotseat',seed:'market-workspace',created:1});
  seat=0;gh.active=false;p2pRole='';newDraft(currentView());errors=[];toast=s=>errors.push(s);
  originalRenderMarkets=renderMarkets;renderProjects=()=>{};renderReady=()=>{};renderMarkets=v=>renderMarketInspector(v);
  testTarget=Object.keys(currentView().territories).find(k=>k!==draft.focus&&marketActionProposal(currentView(),k,'branchDigital').status.eligible);`);
 assert(h.run('!!testTarget'),'Ordinary starting bank has an eligible local project');return h;
}
test('Restored action focus is revealed inside the scrollable inspector',()=>{
 const h=fresh();h.run(`focusEvents=[];focusTarget=document.querySelector('button[data-local-project="branchDigital"]');
  focusTarget.focus=()=>focusEvents.push('focus');focusTarget.scrollIntoView=options=>focusEvents.push(options);
  restoreMarketActionFocus('branchDigital');`);
 assert.deepEqual(JSON.parse(h.run('JSON.stringify(focusEvents)')),['focus',{block:'nearest',inline:'nearest',behavior:'instant'}]);
});

test('Inspecting markets does not retarget projects, policies, staff or the game',()=>{
 const h=fresh(),before=h.run('JSON.stringify({game,draft})');
 assert(h.run('inspectMarket(currentView(),testTarget)'));
 assert.equal(h.run('inspectedMarket(currentView())'),h.run('testTarget'));
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
 assert.match(h.elements.get('#marketInspector').innerHTML,/Inspection only/);
 assert.match(h.elements.get('#marketInspector').innerHTML,/data-local-project="branchDigital"/);
 assert(!h.elements.get('#marketInspector').innerHTML.includes('id="marketConstruction" open'));
 assert.equal(h.elements.get('#marketInspector').dataset.market,undefined,'Only map buttons own data-market; inspector clicks must not bubble into map inspection');
});
test('Local construction atomically confirms a focus change; cancellation changes nothing',()=>{
 const h=fresh(),before=h.run('JSON.stringify({game,draft})');
 assert(h.run("requestMarketAction(currentView(),testTarget,'branchDigital')"));
 assert.equal(h.run('JSON.stringify({game,draft})'),before,'No early staging or spending');
 h.run('cancelMarketAction()');assert.equal(h.run('JSON.stringify({game,draft})'),before);
 h.run("requestMarketAction(currentView(),testTarget,'branchDigital')");assert(h.run('confirmMarketAction()'));
 assert.equal(h.run('draft.focus'),h.run('testTarget'));assert.equal(h.run('draft.newProject'),'branchDigital');
 assert.equal(h.run('JSON.stringify(game)'),JSON.stringify(JSON.parse(before).game));
 assert(h.run('E.projectPlanStatus(currentView().me,draft).eligible'));
});
test('Changing a proposal requires refreshed confirmation; stale owner/month/session cannot stage',()=>{
 const h=fresh();h.run("requestMarketAction(currentView(),testTarget,'branchDigital');draft.hires=1");
 const edited=h.run('JSON.stringify(draft)');assert.equal(h.run('confirmMarketAction()'),false);assert.equal(h.run('JSON.stringify(draft)'),edited);
 assert(h.run('confirmMarketAction()'));assert.equal(h.run('draft.hires'),1);
 for(const change of ['seat=1;newDraft(currentView())','game.cycle++','game=JSON.parse(JSON.stringify(game))']){
  const other=fresh();other.run("requestMarketAction(currentView(),testTarget,'branchDigital')");other.run(change);
  const before=other.run('JSON.stringify({game,draft})');assert.equal(other.run('confirmMarketAction()'),false);assert.equal(other.run('JSON.stringify({game,draft})'),before);
 }
});
test('Existing staged targets are listed and invalid retargets are rejected without deletion',()=>{
 const h=fresh();h.run("toggleInitiative('branchDigital',currentView());draft.competitiveAction='none'");
 const result=h.run('marketActionProposal(currentView(),testTarget)');
 assert(result.status.eligible);assert(result.effects.some(x=>x.includes('Digital Advisory Studio (staged) moves')));
 const before=h.run('JSON.stringify(draft)');h.run("game.players[0].stats.cash=0");
 assert.equal(h.run('requestMarketAction(currentView(),testTarget)'),false);
 assert.equal(h.run('JSON.stringify(draft)'),before);
 assert(h.run("toggleInitiative('branchDigital',currentView())"),'Removal is possible despite a cash shortfall');
 assert.equal(h.run('draft.newProjects.length'),0);
});
test('Local and Operations initiative commands use identical validation and staged plans',()=>{
 const local=fresh(),operations=fresh();
 assert(local.run("requestMarketAction(currentView(),draft.focus,'branchDigital')"));
 assert(operations.run("toggleInitiative('branchDigital',currentView())"));
 assert.equal(local.run('JSON.stringify(draft)'),operations.run('JSON.stringify(draft)'));
 const before=local.run('JSON.stringify(draft)');local.run('game.players[0].submitted={sealed:true}');
 assert.equal(local.run("requestMarketAction(currentView(),draft.focus,'branchDigital')"),false);
 assert.equal(local.run('JSON.stringify(draft)'),before);
});
test('Map remains inspectable when planning is locked and preserves true withdrawal shares',()=>{
 const h=fresh();h.run(`game.territories[testTarget].exited[0]=true;game.territories[testTarget].shares=[27,73];
  game.players[0].submitted={sealed:true};originalRenderMarkets(currentView());`);
 const map=h.elements.get('#marketMap').innerHTML;
 assert.match(map,/YOUR? |YOU /);assert.match(map,/YOU 27\.0% · RIVAL 73\.0%/);
 assert(!map.includes('RIVAL 100%'));assert(!/<button[^>]*data-market="[^"]+"[^>]*disabled/.test(map));
 assert.match(h.elements.get('#marketInspector').innerHTML,/Planning is locked/);
});
test('Office entry points preserve the plan and open the identified office control',()=>{
 const h=fresh(),id=h.run('currentView().me.facilityNetwork.offices[0].id');
 h.c.testOffice=id;h.run('renderFacilityLifecycle=()=>{};renderFacilityNetwork=()=>{};focusWorkspaceTarget=target=>lastOfficeTarget=target.id');
 const before=h.run('JSON.stringify({game,draft})');assert(h.run("openMarketOffice(currentView(),testOffice,'staff')"));
 assert.equal(h.run('lifecycleUi.office'),id);assert.equal(h.run('lastOfficeTarget'),'officeDetailTitle');
 assert(h.run("openMarketOffice(currentView(),testOffice,'convert')"));assert.equal(h.run('facilityNetworkSelection.office'),id);
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
});
test('Inspecting another market retains unsubmitted office form edits without staging them',()=>{
 const h=fresh();h.run(`lifecycleUi.owner=currentView().me.id;lifecycleUi.cycle=currentView().cycle;lifecycleUi.signature=JSON.stringify(draft);
  lifecycleUi.form={marker:'previous'};lifecycleReadForm=()=>({marker:'edited maintenance'});`);
 const before=h.run('JSON.stringify({game,draft})');h.run('inspectMarket(currentView(),testTarget)');
 assert.equal(h.run('lifecycleUi.form.marker'),'edited maintenance');assert.equal(h.run('JSON.stringify({game,draft})'),before);
});

test('Local campaign inspection and cancellation do not move the standing or staged target',()=>{
 const h=fresh(),before=h.run('JSON.stringify({game,draft})');
 h.run('inspectMarket(currentView(),testTarget);marketWorkspace.advertisingOpen=true;renderMarketAdvertising(currentView())');
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
 assert.match(h.elements.get('#marketCampaignPanel').innerHTML,/Draft target: <b>Downtown/);
 assert(h.run('requestMarketAdvertisingTarget(currentView())'));
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
 h.elements.get('#cancelMarketAdvertising').listeners.click();assert.equal(h.run('JSON.stringify({game,draft})'),before);
});

test('A local campaign stages the shared proposal, keeps focus, and never pays or submits',()=>{
 const h=fresh(),before=h.run('JSON.stringify(game)'),focus=h.run('draft.focus');
 h.run('inspectMarket(currentView(),testTarget);marketWorkspace.advertisingOpen=true;expected=advertisingChangeProposal(currentView(),draft,"market",testTarget)');
 assert(h.run('requestMarketAdvertisingTarget(currentView())'));assert(h.run('confirmMarketAdvertisingTarget()'));
 assert.equal(h.run('JSON.stringify(draft)'),h.run('JSON.stringify(expected)'));assert.equal(h.run('draft.focus'),focus);
 assert.equal(h.run('JSON.stringify(game)'),before);assert.equal(h.run('game.players[0].submitted'),null);
 assert.equal(h.run('draft.onboardingPolicy.market'),focus,'Application targeting is not silently moved');
});

test('Market campaign confirmation is revision-aware and old handlers cannot cross month or owner',()=>{
 const h=fresh();h.run('inspectMarket(currentView(),testTarget);marketWorkspace.advertisingOpen=true;requestMarketAdvertisingTarget(currentView());draft.advertisingPolicy.budget=15000');
 const before=h.run('JSON.stringify(draft)');assert.equal(h.run('confirmMarketAdvertisingTarget()'),false);assert.equal(h.run('JSON.stringify(draft)'),before);
 assert(h.run('confirmMarketAdvertisingTarget()'));assert.equal(h.run('draft.advertisingPolicy.budget'),15000);
 for(const change of ['seat=1;newDraft(currentView())','game.cycle++','game.players[0].submitted={sealed:true}']){
  const other=fresh();other.run('inspectMarket(currentView(),testTarget);marketWorkspace.advertisingOpen=true;requestMarketAdvertisingTarget(currentView())');
  other.run(change);const unchanged=other.run('JSON.stringify({game,draft})');assert.equal(other.run('confirmMarketAdvertisingTarget()'),false);
  assert.equal(other.run('JSON.stringify({game,draft})'),unchanged);
 }
});

test('Returning from Products refreshes the market campaign after editing the shared budget',()=>{
 const h=fresh();h.run("marketWorkspace.advertisingOpen=true;draft.advertisingPolicy.budget=80000;renderMarketAdvertising(currentView())");
 assert.match(h.elements.get('#marketCampaignPanel').innerHTML,/\$80,000\/month/);
 h.run("applyAdvertisingChange(currentView(),'budget',0);setWorkspaceTab('markets')");
 assert.equal(h.run('draft.advertisingPolicy.budget'),0);
 assert.match(h.elements.get('#marketCampaignPanel').innerHTML,/Draft campaign expense<\/small><b>\$0\/month/);
 assert(!h.elements.get('#marketCampaignPanel').innerHTML.includes('No additional reach at this budget'));
});
