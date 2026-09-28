'use strict';
// Actual Expanded renderer, engine and routing. Inert DOM checks contracts;
// layout, focus and live peer acceptance require separate browser testing.
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{fresh:marketHarness}=require('./interface_markets_harness');
function fresh(version=9){const h=marketHarness({version,realRouter:true});h.run(`testTarget=Object.keys(currentView().territories).find(k=>k!==draft.focus&&marketActionProposal(currentView(),k,'branchDigital').status.eligible)`);assert(h.run('!!testTarget'));return h;}
const bytes=h=>h.run('JSON.stringify({game,draft})');
test('Legacy action focus is revealed in the Core inspector',()=>{
 const h=fresh();h.run(`focusEvents=[];focusTarget=document.querySelector('button[data-local-project="branchDigital"]');focusTarget.focus=()=>focusEvents.push('focus');focusTarget.scrollIntoView=options=>focusEvents.push(options);restoreMarketActionFocus('branchDigital');`);
 assert.deepEqual(JSON.parse(h.run('JSON.stringify(focusEvents)')),['focus',{block:'nearest',inline:'nearest',behavior:'instant'}]);
});
test('Inspecting markets preserves every plan field and the simulation',()=>{
 const h=fresh(),before=bytes(h);assert(h.run('inspectMarket(currentView(),testTarget)'));assert.equal(h.run('inspectedMarket(currentView())'),h.run('testTarget'));assert.equal(bytes(h),before);
 assert.match(h.c.imMount.innerHTML,/Inspecting only/);assert.match(h.c.imMount.innerHTML,/>Build an office<\/button>/);assert.match(h.c.imMount.innerHTML,/Your offices here/);
 const build=h.c.imMount.querySelectorAll('[data-im-view="build"]');assert.equal(build.length,1,'One contextual construction entry');assert.equal(JSON.parse(build[0].dataset.imContext).market,h.run('testTarget'));
 build[0].listeners.click();assert.match(h.c.imMount.innerHTML,/New office types/);assert.equal(bytes(h),before);
});
test('Historical Expanded construction previews required focus change; cancel by leaving preserves plan',()=>{
 const h=fresh(),before=bytes(h);h.run(`reviewMarketConstruction(currentView(),testTarget,'branchDigital')`);assert.match(h.c.imMount.innerHTML,/Monthly focus changes from/);assert.equal(bytes(h),before);h.click('back');assert.equal(bytes(h),before);
 h.run(`reviewMarketConstruction(currentView(),testTarget,'branchDigital')`);h.click('project');assert.equal(h.run('draft.focus'),h.run('testTarget'));assert.equal(h.run('draft.newProject'),'branchDigital');assert.equal(h.run('JSON.stringify(game)'),JSON.stringify(JSON.parse(before).game));
});
test('Modern construction uses its own target without moving monthly focus',()=>{
 const h=fresh(10),focus=h.run('draft.focus');h.run(`reviewMarketConstruction(currentView(),testTarget,'branchDigital')`);h.click('project');assert.equal(h.run('draft.focus'),focus);assert.equal(h.run('draft.projectTargets.branchDigital'),h.run('testTarget'));
});
test('Add uses latest shared plan; stale owner/month/session/render handlers cannot stage',()=>{
 const h=fresh();h.run(`reviewMarketConstruction(currentView(),testTarget,'branchDigital');draft.hires=1`);h.click('project');assert.equal(h.run('draft.hires'),1);
 for(const change of ['seat=1;newDraft(currentView())','game.cycle++','game=JSON.parse(JSON.stringify(game))','connectionAttempt++','renderExpandedInterface()',"interfaceNavigate({workspace:'people',view:'staff'})"]){const other=fresh();other.run(`reviewMarketConstruction(currentView(),testTarget,'branchDigital')`);const old=other.c.imMount.querySelector('[data-im-action="project"]').listeners.click;other.run(change);const before=bytes(other);old();assert.equal(bytes(other),before,change);}
});
test('Invalid retarget preserves staged orders and removal remains available after cash shortfall',()=>{
 const h=fresh();h.run(`toggleInitiative('branchDigital',currentView());draft.competitiveAction='none'`);const result=h.run('marketActionProposal(currentView(),testTarget)');assert(result.status.eligible);assert(result.effects.some(x=>x.includes('Digital Advisory Studio (staged) moves')));
 const before=h.run('JSON.stringify(draft)');h.run('game.players[0].stats.cash=0');assert.equal(h.run('marketActionProposal(currentView(),testTarget).status.eligible'),false);assert.equal(h.run('JSON.stringify(draft)'),before);assert(h.run(`toggleInitiative('branchDigital',currentView())`));
});
test('Focused and shared initiative commands produce identical validated plans',()=>{
 const local=fresh(),other=fresh();local.run(`reviewMarketConstruction(currentView(),draft.focus,'branchDigital')`);local.click('project');assert(other.run(`toggleInitiative('branchDigital',currentView())`));assert.equal(local.run('JSON.stringify(draft)'),other.run('JSON.stringify(draft)'));
 const before=local.run('JSON.stringify(draft)');local.run('game.players[0].submitted={sealed:true}');local.click('project');assert.equal(local.run('JSON.stringify(draft)'),before);
});
test('Locked maps stay inspectable and display actual withdrawn-market influence',()=>{
 const h=fresh();h.run(`game.territories[testTarget].exited[0]=true;game.territories[testTarget].shares=[27,73];game.players[0].submitted={sealed:true};inspectMarket(currentView(),testTarget)`);const html=h.c.imMount.innerHTML;
 assert.match(html,/Your influence<\/dt><dd>27\.0%/);assert.match(html,/Rival influence<\/dt><dd>73\.0%/);assert.doesNotMatch(html,/RIVAL 100%/);assert(h.c.imMount.querySelectorAll('[data-im-market]').every(el=>!el.disabled));assert.match(html,/Planning is locked/);
});
test('Office entry points and market changes retain identified local working edits without staging',()=>{
 const h=fresh(),before=bytes(h);assert(h.run(`openMarketOffice(currentView(),office.id,'staff')`));assert.equal(h.run('interfaceCurrentRoute().context.office'),h.run('office.id'));assert.match(h.c.imMount.innerHTML,/Assign bank staff time/);
 const field=h.c.imMount.querySelectorAll('[data-im-field]')[0];field.value='0.25';field.listeners.input();h.run(`inspectMarket(currentView(),testTarget);openMarketOffice(currentView(),office.id,'staff')`);assert.equal(h.c.imMount.querySelectorAll('[data-im-field]')[0].value,'0.25');assert.equal(bytes(h),before);
});
test('Market campaign uses canonical Strategy context; Return restores market without retargeting',()=>{
 const h=fresh(),before=bytes(h);h.run('inspectMarket(currentView(),testTarget)');const link=h.c.imMount.querySelectorAll('[data-im-cross]').find(el=>JSON.parse(el.dataset.imCross).workspace==='strategy');assert(link);link.listeners.click();
 assert.equal(h.run('interfaceCurrentRoute().workspace'),'strategy');assert.equal(h.run('interfaceCurrentRoute().view'),'campaigns');assert.equal(h.run('interfaceCurrentRoute().context.market'),h.run('testTarget'));assert.equal(bytes(h),before);assert(h.run('interfaceReturn()'));assert.equal(h.run('interfaceCurrentRoute().context.market'),h.run('testTarget'));
});
test('Campaign target proposal preserves focus, application target, cash and submission state',()=>{
 const h=fresh(),before=h.run('JSON.stringify(game)'),focus=h.run('draft.focus');h.run('draft=advertisingChangeProposal(currentView(),draft,"market",testTarget)');assert.equal(h.run('draft.advertisingPolicy.market'),h.run('testTarget'));assert.equal(h.run('draft.focus'),focus);assert.equal(h.run('draft.onboardingPolicy.market'),focus);assert.equal(h.run('JSON.stringify(game)'),before);assert.equal(h.run('game.players[0].submitted'),null);
});
test('Local discovery links preserve exact agreement/opportunity identifiers and acquisition target',()=>{
 const h=fresh(10),before=bytes(h);h.run(`inspectMarket(currentView(),currentView().opportunities[0].market)`);
 const links=h.c.imMount.querySelectorAll('[data-im-cross]').map(el=>JSON.parse(el.dataset.imCross)),opportunity=h.run('currentView().opportunities[0]'),link=links.find(row=>row.context.opportunityId===opportunity.id);
 assert(link);assert.equal(link.workspace,'banking');assert.equal(link.view,opportunity.type==='loan'?'lending':'services');assert.equal(link.context.marketId,opportunity.market);
 const acquisition=links.find(row=>row.context.objectId==='acquisition');assert(acquisition);assert.equal(acquisition.context.marketId,opportunity.market);assert.equal(bytes(h),before);
});
