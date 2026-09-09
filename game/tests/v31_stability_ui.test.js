'use strict';
const assert=require('node:assert/strict');
// Test the assembled candidate while a protected published-V3 baseline run
// may still be reading the canonical portable file.
if(!process.argv.includes('--source'))process.argv.push('--source');
const {harness}=require('./github_resilience.test.js');
for(const version of [6,7]){
 const h=harness();
 h.run("const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:"+version+"}).options;"+
  "game=E.createGame({...options,mode:'hotseat',seed:'v31-ui',created:1});seat=0;workspaceTab='workforce';newDraft(currentView());"+
  "renderReady=()=>{};renderWorkforce(currentView());");
 const before=h.run('JSON.stringify(game)'),draft=h.run('JSON.stringify(draft)');
 const content=h.elements.get('#workforcePanel').innerHTML;
 assert.equal(content.includes('id="workforceMorale"'),version===7);
 if(version===7){
  assert.match(content,/Low morale does not prohibit hiring/);
  assert.match(content,/Recruits cost cash, add recurring payroll and arrive next month/);
  assert.match(content,/before the 0–100 bounds, executive events, rival actions and consequences/);
  h.run("workspaceTab='group';renderFinancialGroup(currentView());");
  assert.match(h.elements.get('#financialGroupPanel').innerHTML,/corporateCirculationSummary/);
 }
 assert.equal(h.run('JSON.stringify(game)'),before,'Rendering must not settle spending or change morale');
 assert.equal(h.run('JSON.stringify(draft)'),draft,'Rendering cannot restage hiring or allocations');
 h.run("const mm=E.operatingWorkloadMorale({doctrine:'commercial'},{service:3,business:2,lending:2,operations:1});"+
  "if(mm.change!==-1||mm.serviceShortfall!==2||mm.operationsShortfall!==1)throw Error('Shared workload estimate drift');");
}
console.log('PASS V3.1 owner workforce/circulation explanations, unchanged Group6 presentation, shared morale estimate and render purity. DOM harness only; browser layout acceptance remains separate.');
