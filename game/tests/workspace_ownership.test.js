'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const {test}=require('node:test'),assert=require('node:assert/strict'),{fresh:marketHarness}=require('./interface_markets_harness');
const fresh=()=>marketHarness({realRouter:true}),state=h=>h.run('JSON.stringify({game,draft})');
test('Expanded leaves old business forms at their single legacy homes and Core restores temporary shared mounts',()=>{
 const h=fresh();h.run(`document.body={classList:{add(){},remove(){}}};for(const id of ['staffAllocationPanel','bankProductsPanel','bankPricingPanel','lendingPolicyPanel','customerPipelinePanel']){
 const panel=$('#'+id),home={id:'home-'+id,insertBefore(child){child.parentElement=this;child.parentNode=this;}};home.insertBefore(panel);}
 const shared=$('#bankAnnouncements');shared.parentElement={id:'announcement-home',insertBefore(child){child.parentElement=this;}};shared.hidden=true;$('#testSharedMount').appendChild=function(child){child.parentElement=this};`);
 const before=state(h);h.run('reconcileWorkspaceOwnership(currentView())');for(const id of ['staffAllocationPanel','bankProductsPanel','bankPricingPanel','lendingPolicyPanel','customerPipelinePanel'])assert.equal(h.elements.get('#'+id).parentElement.id,'home-'+id);
 h.run(`interfaceMountPanel('bankAnnouncements','testSharedMount')`);assert.equal(h.elements.get('#bankAnnouncements').parentElement.id,'testSharedMount');h.run(`interfaceRestoreCore()`);assert.equal(h.elements.get('#bankAnnouncements').parentElement.id,'announcement-home');assert.equal(h.elements.get('#bankAnnouncements').hidden,true);assert.equal(state(h),before);
 h.run(`game=E.createGame({...E.previewCampaignEdition({},'core',{currentReporting:true,currentEconomics:true}).options,mode:'hotseat',created:1});newDraft(currentView());reconcileWorkspaceOwnership(currentView())`);assert.equal(h.run('expandedInterfaceEnabled(currentView())'),false);for(const id of ['staffAllocationPanel','bankProductsPanel','bankPricingPanel','lendingPolicyPanel','customerPipelinePanel'])assert.equal(h.elements.get('#'+id).parentElement.id,'home-'+id);assert.equal(h.elements.get('#customerPipelinePanel').getAttribute('data-workspace'),'markets');
});
test('Historical shortcuts resolve to the canonical editable home without changing plans',()=>{
 const h=fresh(),before=state(h);
 for(const [item,workspace,view]of [
  [{tab:'operations',target:'#staffGrid'},'people','staff'],[{tab:'markets',target:'#pipeline'},'banking','services'],
  [{tab:'products',target:'#productProgramsPanel',productDesk:'onboarding'},'banking','deposits'],
  [{tab:'operations',desk:'funding'},'banking','treasury'],[{tab:'operations',desk:'funding',target:'#lendingPolicies'},'banking','lending'],
  [{tab:'products',productDesk:'advertising'},'strategy','campaigns']]){
  h.c.shortcut=item;h.run('navigatePlanReview(shortcut)');assert.equal(h.run('interfaceCurrentRoute().workspace'),workspace);assert.equal(h.run('interfaceCurrentRoute().view'),view);
 }assert.equal(state(h),before);
});
test('Six primary workspaces have unique owners; Reports is secondary read-only navigation',()=>{
 const h=fresh();assert.deepEqual(JSON.parse(h.run('JSON.stringify(INTERFACE_WORKSPACES.map(x=>x[0]))')),['month','markets','banking','people','strategy','group']);const before=state(h);
 for(const [workspace,view]of [['people','staff'],['banking','deposits'],['banking','lending'],['banking','services'],['banking','treasury'],['strategy','campaigns'],['group','agency'],['reports','statements']]){h.c.next={workspace,view};h.run('openInterfaceWorkspace(next.workspace,next.view)');assert.equal(h.run('interfaceCurrentRoute().workspace'),workspace);assert.equal(h.run('interfaceCurrentRoute().view'),view);}assert.equal(state(h),before);
});
test('Product pricing, borrowing and credit shortcuts point to their respective banking editor',()=>{
 const h=fresh(),before=state(h);h.run(`openBankingContext('pricing',{product:'essential',market:'downtown'})`);assert.equal(h.run('interfaceCurrentRoute().workspace'),'banking');assert.equal(h.run('interfaceCurrentRoute().view'),'deposits');assert.equal(h.run('interfaceCurrentRoute().context.mode'),'terms');assert.equal(h.run('interfaceCurrentRoute().context.productId'),'essential');assert.equal(h.run('interfaceCurrentRoute().context.objectId'),'essential');
 h.run(`openBankingContext('pricing')`);assert.equal(h.run('interfaceCurrentRoute().context.objectId'),'base','Bank-wide pricing opens base deposit pricing, not the first product');
 h.run(`openBankingContext('policies')`);assert.equal(h.run('interfaceCurrentRoute().view'),'treasury');assert.equal(h.run('interfaceCurrentRoute().context.objectId'),'liquidity');
 h.run(`openBankingContext('portfolio')`);assert.equal(h.run('interfaceCurrentRoute().view'),'lending');assert.equal(h.run('interfaceCurrentRoute().context.objectId'),'portfolio');h.run(`navigatePlanReview({tab:'operations',target:'#monetaryPolicyPanel'})`);assert.equal(h.run('interfaceCurrentRoute().view'),'treasury');assert.equal(state(h),before);
});
test('Presentation route and pending edits reset between owners and never leak into saves, views or draft',()=>{
 const h=fresh();h.run(`openMarketOffice(currentView(),office.id,'staff')`);const field=h.c.imMount.querySelectorAll('[data-im-field]')[0];field.value='0.25';field.listeners.input();assert.equal(h.run('pendingInterfaceMarketsEdits(currentView()).length'),1);
 h.run(`seat=1;newDraft(currentView());interfaceIdentity(currentView())`);const before=state(h);assert.equal(h.run('interfaceCurrentRoute().workspace'),'month');assert.equal(h.run('pendingInterfaceMarketsEdits(currentView()).length'),0);assert.equal(state(h),before);assert.doesNotMatch(h.run('JSON.stringify(E.publicState(game,1))'),/interfaceMarketsState|interfaceState|subjectWorkspace/);assert.doesNotMatch(h.run('JSON.stringify(draft)'),/interfaceMarketsState|interfaceState|subjectWorkspace/);
});
test('Stale navigation cannot change a newly selected bank or replay another session return',()=>{
 const h=fresh();h.run(`openMarketOffice(currentView(),office.id,'staff')`);const old=h.c.imMount.querySelectorAll('[data-im-cross]')[0].listeners.click;h.run(`seat=1;newDraft(currentView());interfaceIdentity(currentView())`);const before=state(h),route=h.run('JSON.stringify(interfaceCurrentRoute())');old();assert.equal(h.run('JSON.stringify(interfaceCurrentRoute())'),route);assert.equal(state(h),before);
 h.run(`interfaceNavigate({workspace:'people',view:'staff'});connectionAttempt++`);assert.equal(h.run('interfaceReturn()'),false);
});
test('Cross-domain Return stores presentation context and keeps newer shared-draft changes',()=>{
 const h=fresh();h.run(`openInterfaceWorkspace('banking','deposits',{productId:'essential',marketId:'downtown',mode:'pricing'});interfaceNavigate({workspace:'people',view:'coverage',context:{function:'relationships'}});draft.depositPolicy='growth';interfaceReturn()`);
 assert.equal(h.run('interfaceCurrentRoute().workspace'),'banking');assert.equal(h.run('interfaceCurrentRoute().context.productId'),'essential');assert.equal(h.run('interfaceCurrentRoute().context.mode'),'pricing');assert.equal(h.run('draft.depositPolicy'),'growth');assert.equal(h.run('interfaceState.trail.length'),0);
});
