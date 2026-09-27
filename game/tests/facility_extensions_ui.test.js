'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
test('The office inspector stages and removes a quoted suite without changing the bank or other plans',()=>{
 const h=harness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,mode:'hotseat',seed:'suite-ui',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());draft.decision='b';notices=[];toast=m=>notices.push(m);renderReady=()=>{};renderFacilityLifecycle(currentView());`);
 const panel=h.elements.get('#facilityLifecyclePanel').innerHTML;
 assert.match(panel,/Add a commercial banking suite/);assert.match(panel,/180,000/);assert.match(panel,/Lending — 50% of a month/);assert.match(panel,/approval and funding/);
 assert.match(panel,/<section[^>]+id="officeSuiteOffer"/);assert.doesNotMatch(panel,/<details[^>]+id="officeSuiteOffer"/);
 assert.doesNotMatch(panel,/id="stageOfficeSuite" disabled/);
 const before=h.run('JSON.stringify(game)'),form=h.run('JSON.stringify(draft.facilityLifecyclePolicy)');
 h.run(`for(const role of E.FacilityLifecycle.ROLES)document.querySelector('#lifecycleStaff-'+role).value=String(lifecycleUi.form.offices[lifecycleUi.office].staffQuarters[role]/4);document.querySelector('#lifecycleMaintenance').value='full';document.querySelector('#lifecycleStaff-service').value='1.25'`);
 h.run(`suiteFocus=[];document.querySelector('#clearOfficeSuite').focus=()=>suiteFocus.push('remove');document.querySelector('#stageOfficeSuite').focus=()=>suiteFocus.push('stage')`);
 const stage=h.elements.get('#stageOfficeSuite').listeners.click;stage();
 assert.equal(h.run('suiteFocus.at(-1)'),'remove','Staging keeps keyboard focus on the replacement action');
 assert.equal(h.run('draft.facilityExtensionPolicy.start'),h.run('game.players[0].facilityNetwork.offices[0].id'));
 assert.equal(h.run('JSON.stringify(game)'),before);assert.equal(h.run('JSON.stringify(draft.facilityLifecyclePolicy)'),form);
 assert.equal(h.run('lifecycleUi.form.offices[lifecycleUi.office].staffQuarters.service'),5,'Unstaged office form survives separate suite staging');
 assert.match(h.elements.get('#facilityLifecyclePanel').innerHTML,/Remove staged suite/);
 h.elements.get('#clearOfficeSuite').listeners.click();assert.equal(h.run('draft.facilityExtensionPolicy.start'),null);
 const current=h.run('JSON.stringify(draft)');stage();assert.equal(h.run('JSON.stringify(draft)'),current,'Detached stale action is refused');
 h.run('game.players[0].stats.cash=0;renderFacilityLifecycle(currentView())');
 assert.match(h.elements.get('#facilityLifecyclePanel').innerHTML,/id="stageOfficeSuite" disabled/);
});
test('Core and historical offices keep their existing controls; latest Expanded remains one package choice',()=>{
 const h=harness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:10}).options,mode:'hotseat',created:1,seed:1});seat=0;gh.active=false;newDraft(currentView());renderFacilityLifecycle(currentView())`);
 assert.doesNotMatch(h.elements.get('#facilityLifecyclePanel').innerHTML,/commercial banking suite/);
 h.c.Event=class{constructor(type,options){this.type=type;Object.assign(this,options);}};
 h.run(`document.querySelector('#facilityExtensionsPreview').dispatchEvent=function(event){event.target=this;document.querySelector('#setupFeatureOptions').listeners[event.type](event)}`);
 h.run(`const setup=document.querySelector('#setupFeatureOptions'),originalQuery=setup.querySelector;setup.querySelector=selector=>selector==='[data-feature-field="facilityExtensionsVersion"]'?document.querySelector('#facilityExtensionsPreview'):originalQuery(selector)`);
 h.run(`document.querySelector('#setupFeatureOptions').listeners.click({target:{dataset:{featureMode:'expanded'}}})`);
 assert(h.run('featureSelectionPending()'));assert.equal((h.elements.get('#featureSelectionAffected').innerHTML.match(/<li>/g)||[]).length,5);
 assert(h.confirmFeatures());assert.equal(h.run('readSetupFeatureOptions().facilityExtensionsVersion'),1);
 // This tests the current integrated selection, not the historical suite-only
 // campaign. Current Expanded includes reporting, persistent rivalry and
 // balance-sheet lending, Federal Funds and bank-wide business delivery (9.39);
 // historical suite creation below remains9.11.
 assert.equal(h.run('E.campaignRules(readSetupFeatureOptions(),{context:"lobby"}).version'),'9.39');
 assert.equal(h.run('readSetupFeatureOptions().expandedBusinessVersion'),1);
 assert.equal(h.run('readSetupFeatureOptions().bankEconomicsVersion'),1);
 assert.equal(h.run('readSetupFeatureOptions().creditWorkloadVersion'),1);
 assert.equal(h.run('E.campaignRules(E.previewFeatureSelection({}, {field:"facilityExtensionsVersion",value:1}).options,{context:"lobby"}).version'),'9.11','Historical suite creation retains its original boundary');
});
