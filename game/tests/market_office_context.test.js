'use strict';
// Source engine/renderer/router with a small event DOM. These are contract
// checks, separate from real browser layout, focus and keyboard acceptance.
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test'),{fresh:marketHarness}=require('./interface_markets_harness');
const fresh=()=>marketHarness({realRouter:true}),bytes=h=>h.run('JSON.stringify({game,draft})');
test('Expanded initializes one focused inspector without borrowing hidden legacy office panels',()=>{
 const h=fresh(),before=bytes(h);h.run(`setWorkspaceTab('markets',currentView())`);assert.match(h.c.imMount.innerHTML,/im-inspector/);for(const id of ['facilityLifecyclePanel','facilityNetworkPanel'])assert.equal(h.c.document.querySelector('#'+id).innerHTML,'');assert.equal(bytes(h),before);
});
test('Switching offices retains local working fields without copying them to another office',()=>{
 const h=fresh();h.run(`second=E.FacilityNetwork.open(game.players[0],office.market,'digital',game.cycle);game.players[0].facilityLifecycle=E.FacilityLifecycle.register(game.players[0],second.id,game.cycle).facilityLifecycle;newDraft(currentView());draft.decision='b';openMarketOffice(currentView(),office.id,'staff')`);
 const before=bytes(h),field=h.c.imMount.querySelectorAll('[data-im-field]')[0];field.value='0.25';field.listeners.input();h.run(`openMarketOffice(currentView(),second.id,'staff')`);assert.equal(h.c.imMount.querySelectorAll('[data-im-field]')[0].value,'0');h.run(`openMarketOffice(currentView(),office.id,'staff')`);assert.equal(h.c.imMount.querySelectorAll('[data-im-field]')[0].value,'0.25');assert.equal(bytes(h),before);
});
test('Changing inspector replaces content instead of stacking or moving the old editor',()=>{
 const h=fresh();h.run(`openMarketOffice(currentView(),office.id,'staff')`);assert.match(h.c.imMount.innerHTML,/Assign bank staff time/);h.run('showMarketOverview(currentView())');assert.doesNotMatch(h.c.imMount.innerHTML,/Assign bank staff time/);assert.equal(h.c.imMount.querySelectorAll('[data-im-field]').length,0);assert.equal((h.c.imMount.innerHTML.match(/class="im-inspector"/g)||[]).length,1);
});
test('Core retains engine focus confirmation and no invented identified-office state',()=>{
 const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'core',{currentReporting:true,currentEconomics:true}).options,mode:'hotseat',seed:'core-market-fallback',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());renderReady=()=>{};renderProjects=()=>{};target=Object.keys(currentView().territories).find(k=>k!==draft.focus&&marketActionProposal(currentView(),k,'branchDigital').status.eligible)`);const before=bytes(h);
 assert(h.run('!!target'));h.run(`openMarketConstruction(currentView(),target);reviewMarketConstruction(currentView(),target,'branchDigital')`);assert.equal(bytes(h),before);assert(h.run('!!marketWorkspace.pending'));assert(h.run('confirmMarketAction()'));assert.equal(h.run('draft.focus'),h.run('target'));assert.equal(h.run('currentView().me.facilityNetwork'),undefined);
});
test('Return preserves current draft edits and exact private office working form across workspaces',()=>{
 const h=fresh();h.run(`openMarketOffice(currentView(),office.id,'staff')`);const field=h.c.imMount.querySelectorAll('[data-im-field]')[0];field.value='0.25';field.listeners.input();h.run(`interfaceNavigate({workspace:'people',view:'staff',context:{office:office.id}},{remember:true});draft.depositPolicy='growth';interfaceReturn()`);
 assert.equal(h.run('interfaceCurrentRoute().view'),'staff');assert.equal(h.run('interfaceCurrentRoute().context.office'),h.run('office.id'));assert.equal(h.run('draft.depositPolicy'),'growth');assert.equal(h.c.imMount.querySelectorAll('[data-im-field]')[0].value,'0.25');assert(!h.run('JSON.stringify(E.publicState(game,1)).includes("interfaceMarketsState")'));
 h.run(`interfaceNavigate({workspace:'people',view:'staff'},{remember:true});seat=1;newDraft(currentView())`);const other=bytes(h);assert.equal(h.run('interfaceReturn()'),false);assert.equal(bytes(h),other);
});
test('Help and review links reveal the intended editor even before the office was opened',()=>{
 for(const [target,view,content]of [['#facilityLifecyclePanel','staff','Assign bank staff time'],['#facilityNetworkPanel','convert','Convert this office'],['#sharedPremisesDesk','services','Installed services']]){const h=fresh();h.c.helpTarget=target;h.run(`navigatePlanReview({tab:'markets',target:helpTarget})`);assert.equal(h.run('interfaceCurrentRoute().workspace'),'markets');assert.equal(h.run('interfaceCurrentRoute().view'),view);assert.match(h.c.imMount.innerHTML,new RegExp(content));}
});
test('Guest same-month snapshots retain office selection and unstaged assignments privately',()=>{
 const h=fresh();h.run(`view=E.publicState(game,1);game=null;p2pRole='guest';newDraft(currentView());office=currentView().me.facilityNetwork.offices[0];openMarketOffice(currentView(),office.id,'staff')`);const field=h.c.imMount.querySelectorAll('[data-im-field]')[0];field.value='0.25';field.listeners.input();const before=h.run('JSON.stringify(draft)');h.run(`view=JSON.parse(JSON.stringify(view));view.rival.submitted=true;renderExpandedInterface()`);assert.equal(h.run('interfaceCurrentRoute().context.office'),h.run('office.id'));assert.equal(h.c.imMount.querySelectorAll('[data-im-field]')[0].value,'0.25');assert.equal(h.run('JSON.stringify(draft)'),before);
});
test('Review revisits canonical editor with working inputs and never borrows a hidden panel',()=>{
 const h=fresh();h.run(`openMarketOffice(currentView(),office.id,'staff')`);const field=h.c.imMount.querySelectorAll('[data-im-field]')[0];field.value='0.25';field.listeners.input();const before=bytes(h);h.run(`openInterfaceWorkspace('review','plan');interfaceNavigate({workspace:'markets',view:'staff',context:{office:office.id}})`);assert.equal(h.c.imMount.querySelectorAll('[data-im-field]')[0].value,'0.25');assert.equal(h.run('monthlyEditorState'),null);assert.equal(bytes(h),before);
});
test('Returning to conversion retains proposed model without staging it',()=>{
 const h=fresh();h.run(`openMarketOffice(currentView(),office.id,'convert')`);const choice=h.c.imMount.querySelector('[data-im-model="digital"]');assert(choice);choice.listeners.click();const before=bytes(h);h.run(`openMarketOffice(currentView(),office.id,'services');openMarketOffice(currentView(),office.id,'convert')`);assert.equal(h.c.imMount.querySelector('[data-im-model="digital"]').attributes['aria-pressed'],'true');assert.equal(bytes(h),before);
});
