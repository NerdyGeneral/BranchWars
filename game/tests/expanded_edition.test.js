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
 assert.equal(core.incomeHistoryVersion,1);assert.equal(E.createGame({...core,seed:73,created:1}).version,'8.20');
 assert.equal(E.createGame({seed:73,created:1}).version,'8.1','Legacy direct creation is unchanged');
 const q=E.previewCampaignEdition(core,'expanded',{currentEconomics:true});assert.equal(JSON.stringify(core),before);assert.equal(q.rules.version,'9.32');assert(q.requiresConfirmation);
 for(const suffix of ['Services','Assets','Cash','Sweep','Choice','Income','Suitability','Trading','Notes'])assert.equal(q.options['investment'+suffix+'Version'],1);
 for(const field of ['companySharesVersion','companyControlVersion','companyConsolidationVersion','companyControlStrategyVersion','sharedPremisesVersion','companyCreditVersion'])assert.equal(q.options[field],1,'Expanded must include '+field);
 const caps=E.campaignCapabilities();delete caps.companyCreditSupported;
 assert.equal(E.peerRulesIssue(q.rules,caps).field,'companyCreditVersion','Peers cannot silently omit the new lending rules');
 for(const mode of ['ai','hotseat']){const g=E.createGame({...q.options,mode,seed:73,created:1});assert.equal(g.version,'9.32');assert.equal(Object.keys(g.territories).length,6);assert(g.players.every(p=>p.investmentBusiness.status==='unopened'&&p.investmentBusiness.book.accounts.cash===0&&p.sharedPremises.book.rooms.length===0&&p.incomeHistory.records.length===0));assert.equal(g.investmentEconomy.world.notes.issued,0);E.validatePilot(g);}
 const reset=E.previewCampaignEdition(q.options,'core',{currentEconomics:true});assert.deepEqual(copy(reset.rules.enabled),['incomeHistoryVersion','commercialServiceVersion','bankEconomicsVersion']);assert.deepEqual(copy(E.createGame({...reset.options,mode:'ai',seed:73,created:1})),copy(E.createGame({...core,researchProgramVersion:undefined,mode:'ai',seed:73,created:1})));
 assert.throws(()=>E.previewCampaignEdition(core,'unknown'));
});
test('confirmation, cancellation, hidden scalar retention and returning to Core work through setup',()=>{
 const h=harness(),initial=copy(h.run('readSetupFeatureOptions()'));select(h,'expanded');assert(h.run('featureSelectionPending()'));assert.deepEqual(copy(h.run('readSetupFeatureOptions()')),initial);
 h.run('cancelFeatureSelectionConfirmation()');assert.deepEqual(copy(h.run('readSetupFeatureOptions()')),initial);
 select(h,'expanded');assert(h.confirmFeatures());assert.equal(h.run('readSetupFeatureOptions().investmentNotesVersion'),1);assert.equal(h.run('readSetupFeatureOptions().sharedPremisesVersion'),1);assert.equal(h.run('readSetupFeatureOptions().bankRivalryVersion'),1);assert.equal(h.run('readSetupFeatureOptions().balanceSheetLendingVersion'),1);assert.equal(h.run('readSetupFeatureOptions().expandedBusinessVersion'),1);assert.equal(h.run('E.createGame({...readSetupFeatureOptions(),seed:1,created:1}).version'),'9.40');assert.match(h.elements.get('#featureSelectionAffected').innerHTML,/brokerage and custody/);assert.match(h.elements.get('#featureSelectionAffected').innerHTML,/shared service rooms/);
 const selected=copy(h.run('readSetupFeatureOptions()'));select(h,'core');h.run('cancelFeatureSelectionConfirmation()');assert.deepEqual(copy(h.run('readSetupFeatureOptions()')),selected);
 select(h,'core');assert(h.confirmFeatures());assert.equal(h.run('E.campaignRules(readSetupFeatureOptions()).enabled.length'),4);assert.equal(h.run('readSetupFeatureOptions().incomeHistoryVersion'),1);assert.equal(h.run('readSetupFeatureOptions().investmentNotesVersion'),undefined);assert.equal(h.run('readSetupFeatureOptions().expandedBusinessVersion'),undefined);
});
test('Expanded confirmation explains the edition instead of listing internal dependencies',()=>{
 const h=harness();select(h,'expanded');const content=h.elements.get('#featureSelectionAffected').innerHTML;
 assert.match(content,/qualified company lending/);assert.equal((content.match(/<li>/g)||[]).length,5);
 assert.doesNotMatch(content,/required dependency|companyCreditVersion/);
 h.run('cancelFeatureSelectionConfirmation()');assert.equal(h.run('readSetupFeatureOptions().companyCreditVersion'),undefined);
});
test('historical custom proposals explicitly remove incompatible reporting without repairing imported rules',()=>{
 const h=harness(),E=h.c.window.BWEngine,core=copy(h.run('readSetupFeatureOptions()')),before=JSON.stringify(core);
 const custom=E.previewFeatureSelection(core,{field:'campaignRulesVersion',value:1});
 assert(custom.rules.valid);assert(custom.requiresConfirmation);assert.equal(custom.options.incomeHistoryVersion,undefined);
 assert(custom.changes.some(x=>x.field==='incomeHistoryVersion'&&x.from===1&&x.to===0));
 assert.equal(JSON.stringify(core),before);
 assert.throws(()=>E.createGame({...custom.options,incomeHistoryVersion:1,seed:1,created:1}),/requires Core/);
 const restored=E.previewCampaignEdition(custom.options,'core',{currentReporting:true});assert.equal(restored.options.incomeHistoryVersion,1);assert.equal(restored.rules.version,'8.16');
 const legacy=E.previewCampaignEdition({},'expanded');assert.equal(legacy.rules.version,'9.28');assert.equal(legacy.options.incomeHistoryVersion,undefined,'Historical engine API construction is not upgraded');
});
module.exports={select};
test('current economy selection is explicit and does not change historical reporting API or saves',()=>{
 const E=harness().c.window.BWEngine,source={scope:'local'},before=JSON.stringify(source);
 for(const edition of ['core','expanded']){
  const current=E.previewCampaignEdition(source,edition,{currentEconomics:true});
  const old=E.previewCampaignEdition(source,edition,{currentReporting:true});
  assert.equal(current.rules.version,edition==='core'?'8.19':'9.32');
  assert.equal(old.rules.version,edition==='core'?'8.16':'9.29');
  assert(!Object.hasOwn(current.options,'currentEconomics'));
  const saved=E.createGame({...old.options,seed:41,created:1,mode:'hotseat'}),version=saved.version;
  assert.equal(E.migrateCampaign(copy(saved)).version,version);
 }
 assert.equal(JSON.stringify(source),before);
});
test('current edition choices replay the previously verified explicit economic rules exactly',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
 const html=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_core_books_3730536d.html'),'utf8'),prior={};
 assert.equal(createHash('sha256').update(html).digest('hex'),'3730536d4680180367f23956cfb5cd4fc2b95d54b37654380a7b72627c9274ff');
 vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],prior);
 const old=prior.BWEngine,E=harness().c.window.BWEngine;
 for(const edition of ['core','expanded']){
  const fixed={mode:'hotseat',seed:'current-edition-replay',created:1};
  const a=old.createGame({...old.previewCampaignEdition({},edition,{currentReporting:true}).options,commercialServiceVersion:1,bankEconomicsVersion:edition==='core'?2:1,...(edition==='expanded'?{creditWorkloadVersion:1}:{}),...fixed});
  const b=E.createGame({...E.previewCampaignEdition({},edition,{currentEconomics:true}).options,...fixed});
  assert.deepEqual(copy(b),copy(a));
  for(let month=1;month<=2;month++){
   const x=a.players.map((_,i)=>old.chooseBot(a,i)),y=b.players.map((_,i)=>E.chooseBot(b,i));assert.deepEqual(copy(y),copy(x));
   for(const seat of [0,1]){old.submit(a,seat,x[seat]);E.submit(b,seat,y[seat]);}
   assert.deepEqual(copy(b),copy(a));for(const seat of [0,1])assert.deepEqual(copy(E.publicState(b,seat)),copy(old.publicState(a,seat)));
  }
 }
});
