'use strict';
process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{groupHarness}=require('./group_ui_harness');
test('group capital separates owned equity, outside shareholders, noncash goodwill and reconciliations',()=>{
 const h=groupHarness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded').options,companyControlVersion:1,companyConsolidationVersion:1,seed:5,created:1,mode:'hotseat'});seat=0;gh.active=false;p2pRole='';workspaceTab='group';newDraft(currentView());draft.decision='b';renderReady=()=>{};`);
 const before=h.run('JSON.stringify({game,draft})');h.run('renderFinancialGroup(currentView())');assert.equal(h.run('JSON.stringify({game,draft})'),before);
 const markup=h.elements.get('#financialGroupPanel').innerHTML;
 for(const text of ['Your group’s equity','Outside shareholders','Acquisition goodwill','Internal deposits','No controlled companies','not a cash transfer','does not underwrite insurance'])assert(markup.includes(text),text);
 assert.doesNotMatch(markup,/company-share systems remain in development/);
 h.run(`testView=currentView();testView.me.groupSummary.controlledCompanies=[{issuer:'company:0',shares:60000,netAssets:1000000,outsideEquity:400000,goodwill:120000}];disclosure=companyConsolidationDisclosure(testView);`);
 assert.match(h.run('disclosure'),/60.000%/);assert.match(h.run('disclosure'),/Controlled operating companies/);
 h.run('delete testView.companyConsolidationVersion');assert.equal(h.run('companyConsolidationDisclosure(testView)'),'');
});
