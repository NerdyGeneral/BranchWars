'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const {test}=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./github_resilience.test');
function fresh(edition='expanded'){
 const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'${edition}',{currentReporting:true,currentEconomics:true}).options,startingWorkforce:'covered',mode:'hotseat',seed:'ownership68',created:1});seat=0;gh.active=false;newDraft(currentView());$('#pipeline').insertAdjacentHTML=function(position,html){this.innerHTML+=html};`);return h;
}
const state=h=>h.run('JSON.stringify({game,draft})');
function structure(h){
 h.run(`testHomes={};for(const id of ['staffAllocationPanel','bankProductsPanel','bankPricingPanel','customerPipelinePanel']){
  const panel=$('#'+id),home={id:'home-'+id,insertBefore(child){child.parentElement=this;child.parentNode=this;}};home.insertBefore(panel);testHomes[id]=home;
 }
 for(const id of ['peopleAllocationMount','productPolicyMount','customerCommercialMount','monthlyEditorBody']){
  const mount=$('#'+id);mount.insertBefore=function(child){child.parentElement=this;child.parentNode=this;};mount.appendChild=function(child){this.insertBefore(child)};
 }`);
}
test('Expanded moves one live editor per subject and Core restores its original containers',()=>{
 const h=fresh();structure(h);const before=state(h);h.run('reconcileWorkspaceOwnership(currentView())');
 for(const [id,mount]of [['staffAllocationPanel','peopleAllocationMount'],['bankProductsPanel','productPolicyMount'],['bankPricingPanel','productPolicyMount'],['customerPipelinePanel','customerCommercialMount']])assert.equal(h.elements.get('#'+id).parentElement,h.elements.get('#'+mount));
 assert.equal(state(h),before);
 h.run("game=E.createGame({...E.previewCampaignEdition({},'core',{currentReporting:true,currentEconomics:true}).options,mode:'hotseat',created:1});newDraft(currentView());reconcileWorkspaceOwnership(currentView())");
 for(const id of ['staffAllocationPanel','bankProductsPanel','bankPricingPanel','customerPipelinePanel'])assert.equal(h.elements.get('#'+id).parentElement.id,'home-'+id);
 assert.equal(h.elements.get('#customerPipelinePanel').getAttribute('data-workspace'),'markets');
});
test('Help and historical shortcuts resolve to the actual owning controls without rewriting plans',()=>{
 const h=fresh(),before=state(h);
 for(const [item,tab,field,key]of [
  [{tab:'operations',target:'#staffGrid'},'workforce','peopleDesk','overview'],
  [{tab:'markets',target:'#pipeline'},'customers','customerDesk','commercial'],
  [{tab:'products',target:'#productProgramsPanel',productDesk:'onboarding'},'customers','customerDesk','onboarding'],
  [{tab:'operations',desk:'funding'},'products','productSubject','policies']]){
  const route=JSON.parse(h.run(`JSON.stringify(subjectRoute(${JSON.stringify(item)},currentView()))`));assert.equal(route.tab,tab);assert.equal(route[field],key);
 }
 assert.equal(state(h),before);
});
test('People overview owns allocation; its other desks do not repeat the form',()=>{
 const h=fresh();structure(h);h.run("setPeopleDesk('overview')");assert.equal(h.elements.get('#peopleAllocationMount').hidden,false);
 h.run("setPeopleDesk('coverage')");assert.equal(h.elements.get('#peopleAllocationMount').hidden,true);
 const before=state(h);h.run("navigatePlanReview({tab:'operations',target:'#staffGrid'})");assert.equal(h.run('workspaceTab'),'workforce');assert.equal(h.run('peopleWorkspaceState.desk'),'overview');assert.equal(state(h),before);
});
test('Customers owns offers and applications; Products has one subject navigation row',()=>{
 const h=fresh(),before=state(h);h.run("selectCustomerSubject('onboarding')");
 assert.match(h.elements.get('#customerGrowthPanel').innerHTML,/APPLICATIONS &amp; ONBOARDING/);assert.equal(h.elements.get('#customerHouseholdMount').hidden,true);
 h.run("selectProductSubject('catalogue')");
 assert.doesNotMatch(h.elements.get('#productProgramsPanel').innerHTML,/id="product-desk-(relationships|onboarding|development)"/);
 assert.match(h.elements.get('#productSubjectNavigation').innerHTML,/Pricing & bank policies/);
 h.run("selectProductSubject('policies')");assert.equal(h.elements.get('#productPolicyMount').hidden,false);assert.equal(h.elements.get('#productProgramsPanel').hidden,true);
 assert.equal(state(h),before);
});
test('Subject inspection resets between seats and never leaks into campaigns or plans',()=>{
 const h=fresh();h.run("selectCustomerSubject('onboarding');selectProductSubject('policies');seat=1;newDraft(currentView())");const before=state(h);h.run('reconcileWorkspaceOwnership(currentView())');
 assert.equal(h.run('subjectWorkspace.customers'),'households');assert.equal(h.run('subjectWorkspace.products'),'catalogue');assert.equal(state(h),before);
 const route=h.run("JSON.stringify(E.publicState(game,1))");assert(!route.includes('subjectWorkspace'));assert(!h.run('JSON.stringify(draft)').includes('subjectWorkspace'));
});
test('A stale navigation callback cannot change another bank view',()=>{
 const h=fresh();h.run('reconcileWorkspaceOwnership(currentView());oldSubjectClick=$("#customerSubjectNavigation").onclick;$("#customerSubjectNavigation").contains=()=>true;seat=1;newDraft(currentView());reconcileWorkspaceOwnership(currentView())');
 const before=state(h);h.run("oldSubjectClick({target:{closest:()=>({dataset:{subjectDesk:'commercial'}})}})");assert.equal(h.run('subjectWorkspace.customers'),'households');assert.equal(state(h),before);
});
test('Pricing and advertising shortcuts reveal their owning panel after another product desk was selected',()=>{
 const h=fresh(),before=state(h);h.run("selectProductSubject('policies');openProductDesk('pricing')");
 assert.equal(h.run('subjectWorkspace.products'),'catalogue');assert.equal(h.elements.get('#productProgramsPanel').hidden,false);
 assert.match(h.elements.get('#productProgramsPanel').innerHTML,/Compare this price plan/);
 h.run("openProductDesk('onboarding')");assert.equal(h.run('workspaceTab'),'customers');assert.equal(h.run('subjectWorkspace.customers'),'onboarding');assert.equal(state(h),before);
});
