'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
const copy=x=>JSON.parse(JSON.stringify(x));
function select(h,edition,container='#setupFeatureOptions',prefix=''){
 h.c.edition=edition;h.c.editionContainer=container;h.c.editionControl=prefix?prefix+'facilityExtensionsVersion':'facilityExtensionsPreview';
 h.run(`{const selector=document.querySelector('#'+editionControl);selector._editionRequest=edition;selector.checked=edition==='expanded';document.querySelector(editionContainer).listeners.change({target:selector});}`);
}
test('one Expanded choice exposes the complete investment stack without opening a subsidiary or mutating Core',()=>{
 const h=harness(),E=h.c.window.BWEngine,core=copy(h.run('readSetupFeatureOptions()')),before=JSON.stringify(core);
 const q=E.previewCampaignEdition(core,'expanded');assert.equal(JSON.stringify(core),before);assert.equal(q.rules.version,'9.28');assert(q.requiresConfirmation);
 for(const suffix of ['Services','Assets','Cash','Sweep','Choice','Income','Suitability','Trading','Notes'])assert.equal(q.options['investment'+suffix+'Version'],1);
 for(const field of ['companySharesVersion','companyControlVersion','companyConsolidationVersion','companyControlStrategyVersion','sharedPremisesVersion','companyCreditVersion'])assert.equal(q.options[field],1,'Expanded must include '+field);
 const caps=E.campaignCapabilities();delete caps.companyCreditSupported;
 assert.equal(E.peerRulesIssue(q.rules,caps).field,'companyCreditVersion','Peers cannot silently omit the new lending rules');
 for(const mode of ['ai','hotseat']){const g=E.createGame({...q.options,mode,seed:73,created:1});assert.equal(g.version,'9.28');assert.equal(Object.keys(g.territories).length,6);assert(g.players.every(p=>p.investmentBusiness.status==='unopened'&&p.investmentBusiness.book.accounts.cash===0&&p.sharedPremises.book.rooms.length===0));assert.equal(g.investmentEconomy.world.notes.issued,0);E.validatePilot(g);}
 const reset=E.previewCampaignEdition(q.options,'core');assert(reset.rules.enabled.length===0);assert.deepEqual(copy(E.createGame({...reset.options,mode:'ai',seed:73,created:1})),copy(E.createGame({...core,mode:'ai',seed:73,created:1})));
 assert.throws(()=>E.previewCampaignEdition(core,'unknown'));
});
test('confirmation, cancellation, hidden scalar retention and returning to Core work through setup',()=>{
 const h=harness(),initial=copy(h.run('readSetupFeatureOptions()'));select(h,'expanded');assert(h.run('featureSelectionPending()'));assert.deepEqual(copy(h.run('readSetupFeatureOptions()')),initial);
 h.run('cancelFeatureSelectionConfirmation()');assert.deepEqual(copy(h.run('readSetupFeatureOptions()')),initial);
 select(h,'expanded');assert(h.confirmFeatures());assert.equal(h.run('readSetupFeatureOptions().investmentNotesVersion'),1);assert.equal(h.run('readSetupFeatureOptions().sharedPremisesVersion'),1);assert.equal(h.run('E.createGame({...readSetupFeatureOptions(),seed:1,created:1}).version'),'9.28');assert.match(h.elements.get('#featureSelectionAffected').innerHTML,/brokerage and custody/);assert.match(h.elements.get('#featureSelectionAffected').innerHTML,/shared service rooms/);
 const selected=copy(h.run('readSetupFeatureOptions()'));select(h,'core');h.run('cancelFeatureSelectionConfirmation()');assert.deepEqual(copy(h.run('readSetupFeatureOptions()')),selected);
 select(h,'core');assert(h.confirmFeatures());assert.equal(h.run('E.campaignRules(readSetupFeatureOptions()).enabled.length'),0);assert.equal(h.run('readSetupFeatureOptions().investmentNotesVersion'),undefined);
});
test('Expanded confirmation explains the edition instead of listing internal dependencies',()=>{
 const h=harness();select(h,'expanded');const content=h.elements.get('#featureSelectionAffected').innerHTML;
 assert.match(content,/qualified company lending/);assert.equal((content.match(/<li>/g)||[]).length,5);
 assert.doesNotMatch(content,/required dependency|companyCreditVersion/);
 h.run('cancelFeatureSelectionConfirmation()');assert.equal(h.run('readSetupFeatureOptions().companyCreditVersion'),undefined);
});
module.exports={select};
