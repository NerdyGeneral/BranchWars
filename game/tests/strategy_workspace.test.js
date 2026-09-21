'use strict';
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js');let checks=0;
function test(name,fn){try{fn();checks++;}catch(e){throw Error(name+': '+e.stack);}}
function fresh(group=9){const h=harness();h.run(`const original=document.querySelector;document.querySelector=s=>{const el=original(s);el.addEventListener=function(event,fn){this.listeners[event]=fn};el.remove=()=>{el.innerHTML=''};el.insertAdjacentHTML=(where,html)=>{if(where==='beforebegin'||where==='afterend')el.adjacentHTML=html;else el.innerHTML+=html};return el};
 game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${group}}).options,mode:'hotseat',seed:'strategy-workspace',created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='strategy';newDraft(currentView());draft.decision='b';errors=[];toast=t=>errors.push(t);renderStrategy(currentView());`);return h;}
const html=h=>h.elements.get('#strategyTree').innerHTML,bytes=h=>h.run('JSON.stringify({game,draft})'),click=(h,id)=>h.elements.get('#'+id).listeners.click();
function tierOne(h,branch='network'){h.c.branch=branch;h.run('game.players[0].capability[branch]=E.CAPABILITY_TIERS[branch][0];newDraft(currentView());draft.decision="b";renderStrategy(currentView())');}

test('all five capabilities and twenty milestones are reachable through one dropdown-free inspector',()=>{
 const h=fresh(),before=bytes(h);let count=0;
 for(const branch of h.run('Object.keys(E.STRATEGY_BRANCHES)')){click(h,'strategy-select-'+branch);assert.equal((html(h).match(/id="strategyDetailTitle"/g)||[]).length,1);assert.equal((html(h).match(/id="strategy-select-/g)||[]).length,5);assert(!html(h).includes('<select'));count+=(html(h).match(/class="capability-milestone /g)||[]).length;}
 assert.equal(count,20);assert.equal(bytes(h),before);
});
test('funding buttons use the exact shared quote and never spend authoritative cash',()=>{
 const h=fresh(),world=h.run('JSON.stringify(game)'),expected=h.run('E.fundingStep(currentView().me,draft,"network",50000,currentView())');click(h,'fund-network-more');
 assert.equal(h.run('draft.investments.network'),expected);assert.equal(h.run('JSON.stringify(game)'),world);click(h,'fund-network-less');assert.equal(h.run('draft.investments.network||0'),0);
});
test('model review/cancel/adopt/remove is explicit and permanent choices cannot be overwritten',()=>{
 const h=fresh();tierOne(h);click(h,'strategy-desk-model');const before=bytes(h);click(h,'model-network-retailDensity');assert.equal(bytes(h),before);assert.match(html(h),/id="confirmStrategyModel"/);click(h,'cancelStrategyModel');assert.equal(bytes(h),before);
 click(h,'model-network-retailDensity');const oldConfirm=h.elements.get('#confirmStrategyModel').listeners.click;click(h,'confirmStrategyModel');assert.equal(h.run('draft.specializations.network'),'retailDensity');assert.equal(h.run('game.players[0].specializations.network'),undefined);
 const staged=bytes(h);oldConfirm();assert.equal(bytes(h),staged);click(h,'removeStrategyModel');assert.equal(h.run('draft.specializations.network'),undefined);
 h.run('game.players[0].specializations.network="regionalHub";newDraft(currentView());renderStrategy(currentView())');const locked=bytes(h);click(h,'model-network-retailDensity');assert.equal(bytes(h),locked);assert(!html(h).includes('id="removeStrategyModel"'));
});
test('every stale planning context refuses funding and old model confirmations',()=>{
 for(const change of ['seat=1;newDraft(currentView())','game.cycle++','game=JSON.parse(JSON.stringify(game))','draft.hires=1','featureConnectionGeneration++','connectionAttempt++','linkSession="new-link"','gh={...gh}','lan={...lan}','gh.active=true;gh.paused=true','game.players[0].submitted=true']){
  const h=fresh();const fund=h.elements.get('#fund-network-more').listeners.click;tierOne(h);click(h,'strategy-desk-model');click(h,'model-network-retailDensity');const confirm=h.elements.get('#confirmStrategyModel').listeners.click;h.run(change);const before=bytes(h);fund();confirm();assert.equal(bytes(h),before,change);
 }
});
test('deployment lists preserve all product and multi-capability service choices',()=>{
 const h=fresh(),before=bytes(h),keys=new Set();
 for(const branch of h.run('Object.keys(E.STRATEGY_BRANCHES)')){click(h,'strategy-select-'+branch);click(h,'strategy-desk-applications');for(const match of html(h).matchAll(/id="strategy-app-([^"]+)"/g))keys.add(match[1]);}
 assert.deepEqual([...keys].sort(),['rewards','highYield','deployPayrollDesk','buildTreasuryDesk','partnerTreasuryDesk'].sort());assert.equal(bytes(h),before);
 click(h,'strategy-select-commercial');click(h,'strategy-app-buildTreasuryDesk');assert.match(html(h),/COMMERCIAL BANK tier 1 \(needed\) \+ DIGITAL PLATFORM tier 1 \(needed\)/);assert.match(html(h),/id="strategyDeployApplication"[^>]*disabled/);click(h,'strategyDeployApplication');assert.equal(bytes(h),before);
});
test('a paid service rollout stages once at the exact quote and remains removable after capacity changes',()=>{
 const h=fresh();tierOne(h,'commercial');click(h,'strategy-select-commercial');click(h,'strategy-desk-applications');click(h,'strategy-app-partnerTreasuryDesk');const world=h.run('JSON.stringify(game)'),quote=h.run('E.projectStartTerms(currentView(),currentView().me,"partnerTreasuryDesk",draft.focus)');assert(html(h).includes(h.run('money('+quote.cost+')')));click(h,'strategyDeployApplication');assert(h.run('draft.newProjects.includes("partnerTreasuryDesk")'));assert.equal(h.run('JSON.stringify(game)'),world);
 h.run('draft.allocation={service:4,business:2,lending:2,operations:0};renderStrategy(currentView())');click(h,'strategyDeployApplication');assert(!h.run('draft.newProjects.includes("partnerTreasuryDesk")'));assert.equal(h.run('JSON.stringify(game)'),world);
});

if(harness().run('typeof strategyServiceUseContent')==='function')test('service research shows existing use and prepared draft fees without inventing outcomes',()=>{
 const h=fresh();h.run('game=E.createGame({...E.previewCampaignEdition({},"expanded").options,mode:"hotseat",seed:"research-use",created:1});seat=0;newDraft(currentView());draft.decision="b";renderStrategy(currentView())');
 click(h,'strategy-select-commercial');click(h,'strategy-desk-applications');click(h,'strategy-app-partnerTreasuryDesk');
 const before=bytes(h);assert.match(html(h),/Existing signed agreements/);assert.match(html(h),/Served under this draft/);assert.match(html(h),/not realized receipts or profit/);assert.equal(bytes(h),before);
 // UI-only specimen: no simulated award or balance claim is made by this fixture.
 h.run('game.players[0].serviceDesk.contracts=[{id:"display-only",kind:"treasury",fee:40000,due:10,misses:0}];renderStrategy(currentView())');
 assert.match(html(h),/Signed fees, if fully served<\/small><b>\$40K\/month/);assert.match(html(h),/Served under this draft<\/small><b>0 \/ 1/);
 const world=bytes(h);click(h,'strategyServiceLink');assert.equal(h.run('workspaceTab'),'customers');assert.equal(h.run('subjectWorkspace.customers'),'commercial');assert.equal(h.elements.get('#servicePricing').open,true);assert.equal(bytes(h),world);
 h.run('draft.departmentFunctionsPolicy.quotas.technology.operations=999;unavailableUse=strategyServiceUseContent(currentView(),"treasury")');assert.match(h.run('unavailableUse'),/Service estimate unavailable/);
});
test('product applications distinguish staged instructions and actual implementation',()=>{
 const h=fresh();h.run('draft.newProjects=["licenseRewards"];draft.newProject="licenseRewards";renderStrategy(currentView())');click(h,'strategy-desk-applications');assert.match(html(h),/Staged · not started/);
 h.run('draft.newProjects=[];draft.newProject=null;game.players[0].projects.push({key:"licenseRewards",target:null,progress:1,total:2});renderStrategy(currentView())');assert.match(html(h),/In progress · 50%/);assert(!html(h).includes('Staged · not started'));
});
test('product/research navigation opens the exact object without changing the plan',()=>{
 const h=fresh();h.run('workspaceTab="products";productDeskView="development";renderProductPrograms(currentView())');click(h,'product-select-highYield');const before=bytes(h);click(h,'productResearchLink');assert.equal(h.run('strategyWorkspace.branch'),'digital');assert.equal(h.run('workspaceTab'),'strategy');
 click(h,'strategy-desk-applications');click(h,'strategy-app-highYield');click(h,'strategyProductLink');assert.equal(h.run('productWorkspace.product'),'highYield');assert.equal(h.run('workspaceTab'),'products');assert.equal(bytes(h),before);
});
test('a missing treasury platform opens its real research deployment rather than a removed panel',()=>{
 const h=fresh();h.run('inspectServiceAgreement(currentView(),currentView().serviceAgreements.find(c=>c.kind==="treasury").id)');const before=bytes(h);click(h,'serviceInspectorPlatforms');assert.equal(h.run('workspaceTab'),'strategy');assert.equal(h.run('strategyWorkspace.branch'),'commercial');assert.equal(h.run('strategyWorkspace.desk'),'applications');assert.match(html(h),/id="strategy-app-buildTreasuryDesk"/);assert.match(html(h),/id="strategy-app-partnerTreasuryDesk"/);assert.equal(bytes(h),before);
});
test('inspection does not silently remove a conflicting project instruction or rewrite its public view',()=>{
 const h=fresh();h.run('draft.newProjects=["marketing"];draft.newProject="marketing";game.players[0].projects.push({key:"marketing",target:null,progress:0,total:2});providedView=currentView();providedBefore=JSON.stringify(providedView);');const before=bytes(h);h.run('serviceProjectsUI(providedView)');assert.equal(bytes(h),before);assert.equal(h.run('JSON.stringify(providedView)'),h.run('providedBefore'));
});
test('selections reset by campaign and owner but remain when inspecting another desk',()=>{
 const h=fresh();click(h,'strategy-select-commercial');click(h,'strategy-desk-applications');click(h,'strategy-app-partnerTreasuryDesk');h.run('workspaceTab="markets";renderStrategy(currentView());workspaceTab="strategy";renderStrategy(currentView())');assert.equal(h.run('strategyWorkspace.application'),'partnerTreasuryDesk');
 h.run('seat=1;newDraft(currentView());renderStrategy(currentView())');assert.equal(h.run('strategyWorkspace.branch'),'network');assert.equal(h.run('strategyWorkspace.desk'),'milestones');assert.equal(h.run('strategyWorkspace.application'),null);
});

// Model the real panel parents: an open details element can still be hidden by
// its owning customer mount, which a workspace-name-only assertion misses.
function serviceRouteFixture(kind='expanded'){
 const h=fresh();h.c.routeKind=kind;
 h.run(`const routeOptions=routeKind==='legacy'
  ?E.previewFeatureSelection({}, {field:'serviceExpansionVersion',value:1}).options
  :E.previewCampaignEdition({},routeKind,{currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true}).options;
  game=E.createGame({...routeOptions,mode:'hotseat',seed:'strategy-service-owner',created:1});seat=0;newDraft(currentView());draft.decision='b';
  const panel=$('#customerPipelinePanel');
  serviceMarketHome={id:'original-market-home',insertBefore(child){child.parentElement=this;child.parentNode=this;}};serviceMarketHome.insertBefore(panel);
  const mount=$('#customerCommercialMount');mount.insertBefore=function(child){child.parentElement=this;child.parentNode=this;};
  $('#pipeline').parentElement=panel;$('#servicePricing').parentElement=$('#pipeline');
  if(currentView().me.serviceDesk)renderPipeline(currentView());
  setWorkspaceTab('strategy',currentView());renderStrategy(currentView());`);
 click(h,'strategy-select-commercial');click(h,'strategy-desk-applications');
 if(h.run('!!currentView().me.serviceDesk'))click(h,'strategy-app-partnerTreasuryDesk');
 return h;
}

test('Expanded service shortcut reveals its real customer owner and renders the service controls',()=>{
 const h=serviceRouteFixture();
 assert.equal(h.run('game.version'),'9.33');
 assert.match(html(h),/id="strategyServiceLink"/);
 assert.equal(h.elements.get('#customerCommercialMount').hidden,true,'Households initially hides the commercial mount');
 h.elements.get('#pipeline').innerHTML='';
 const before=bytes(h);click(h,'strategyServiceLink');
 assert.equal(h.elements.get('#customerCommercialMount').hidden,false,'Opening details must also reveal its owning mount');
 assert.equal(h.run('workspaceTab'),'customers');assert.equal(h.run('subjectWorkspace.customers'),'commercial');
 assert.equal(h.elements.get('#customerPipelinePanel').parentElement,h.elements.get('#customerCommercialMount'));
 assert.match(h.elements.get('#customerSubjectNavigation').innerHTML,/data-subject-desk="commercial" aria-pressed="true"/);
 assert.match(h.elements.get('#pipeline').innerHTML,/id="servicePricing"/);
 assert.match(h.elements.get('#pipeline').innerHTML,/data-service-active="treasury"/);
 assert.equal(h.elements.get('#servicePricing').open,true);
 assert.equal(bytes(h),before,'Inspection cannot change the game or the staged plan');
});

test('legacy service-only campaigns keep their Markets-owned shortcut',()=>{
 const h=serviceRouteFixture('legacy'),before=bytes(h);
 assert.equal(h.run('!!currentView().me.householdBook'),false);assert.match(html(h),/id="strategyServiceLink"/);
 click(h,'strategyServiceLink');
 assert.equal(h.run('workspaceTab'),'markets');
 assert.equal(h.elements.get('#customerPipelinePanel').parentElement,h.run('serviceMarketHome'));
 assert.equal(h.elements.get('#customerPipelinePanel').getAttribute('data-workspace'),'markets');
 assert.match(h.elements.get('#pipeline').innerHTML,/data-service-active="treasury"/);
 assert.equal(h.elements.get('#servicePricing').open,true);assert.equal(bytes(h),before);
});

test('Core research does not expose an unsupported service shortcut',()=>{
 const h=serviceRouteFixture('core'),before=bytes(h);assert.equal(h.run('game.version'),'8.20');
 assert.equal(h.run('!!currentView().me.serviceDesk'),false);
 for(const branch of h.run('Object.keys(currentView().strategyBranches)')){
  click(h,'strategy-select-'+branch);click(h,'strategy-desk-applications');
  assert.doesNotMatch(html(h),/id="strategyServiceLink"/);
 }
 assert.equal(bytes(h),before);
});

test('stale service shortcuts cannot navigate another bank, month, plan or connection',()=>{
 for(const change of ['seat=1;newDraft(currentView())','game.cycle++','game=JSON.parse(JSON.stringify(game))','draft.hires=1','connectionAttempt++']){
  const h=serviceRouteFixture(),handler=h.elements.get('#strategyServiceLink').listeners.click;
  h.run(change);const before=bytes(h),navigation=h.run('JSON.stringify({workspaceTab,desk:subjectWorkspace.customers,hidden:$("#customerCommercialMount").hidden})');
  handler();assert.equal(bytes(h),before,change);
  assert.equal(h.run('JSON.stringify({workspaceTab,desk:subjectWorkspace.customers,hidden:$("#customerCommercialMount").hidden})'),navigation,change);
 }
});
console.log(JSON.stringify({suite:'strategy-workspace',checks,scope:'Selected-capability workflow, pure inspection, model review and exact funding/deployment commands, stale contexts, lifecycle state and cross-object navigation. No new simulation rules.'}));
