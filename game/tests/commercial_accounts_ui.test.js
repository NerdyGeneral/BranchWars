'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
test('Company account actions stage shared work, preserve cash and reject stale handlers',()=>{
 const h=harness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'commercialAccountsVersion',value:1}).options,mode:'hotseat',seed:1,created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());
  renderPipeline=()=>{};renderReady=()=>{};errors=[];toast=x=>errors.push(x);agreement=currentView().serviceAgreements[0];
  mount=document.querySelector('#accountPanelTest');mount.insertAdjacentHTML=(where,html)=>mount.innerHTML+=html;renderCommercialAccountPanel(currentView(),agreement,mount);`);
 assert.match(h.elements.get('#accountPanelTest').innerHTML,/operating cash account/);
 assert.doesNotMatch(h.elements.get('#accountPanelTest').innerHTML,/<select/);
 assert.match(h.elements.get('#accountPanelTest').innerHTML,/employee-months eligible after other Business commitments/);
 assert.match(h.elements.get('#accountPanelTest').innerHTML,/Review Business work coverage/);
 const original=h.run('JSON.stringify(game)');
 h.run(`document.querySelector('#businessAccountPursue').listeners.click()`);assert.equal(h.run('draft.commercialAccountPolicy.target'),'company:0');
 h.run(`renderCommercialAccountPanel(currentView(),agreement,mount);document.querySelector('#businessWorkMore').listeners.click()`);
 assert.equal(h.run('draft.commercialAccountPolicy.staffQuarters'),1);assert.equal(h.run('JSON.stringify(game)'),original);
 h.run(`renderCommercialAccountPanel(currentView(),agreement,mount);const stale=document.querySelector('#businessWorkMore').listeners.click;draft.commercialAccountPolicy.target=null;stale()`);
 assert.equal(h.run('draft.commercialAccountPolicy.staffQuarters'),1);
 h.run('renderBankRecovery=()=>{};renderOperatingPreview(currentView())');
 assert.match(h.elements.get('#operatingPreview').innerHTML,/Business operating deposits/);assert.doesNotMatch(h.elements.get('#operatingPreview').innerHTML,/not separately tracked/);
 assert.match(h.elements.get('#operatingPreview').innerHTML,/Business deposits · last completed month/);
 assert.match(h.elements.get('#operatingPreview').innerHTML,/No completed month yet/);
 // Presentation fixture only: do not submit the fabricated report as a save.
 h.run('game.players[0].commercialAccounts.report={before:50000,after:40000,cycle:1,quarters:1};renderOperatingPreview(currentView())');
 assert.match(h.elements.get('#operatingPreview').innerHTML,/−\$10K net change \(month 1\)/);
});
