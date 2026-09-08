'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { harness } = require('./github_resilience.test.js');
const copy = value => JSON.parse(JSON.stringify(value)), h = harness();
const ids = { campaignRulesVersion: 'rivalryPilot', serviceExpansionVersion: 'serviceExpansion', managementVersion: 'institutionManagement',
  customerDemandVersion: 'customerNeeds', workforceVersion: 'specialistWorkforce', customerOwnershipVersion: 'householdOwnership',
  creditPerformanceVersion: 'creditPerformance', segmentDepositsVersion: 'segmentDeposits', productProgramsVersion: 'productPrograms',
  advertisingVersion: 'advertisingPreview', regionalGrowthVersion: 'regionalGrowthPreview', relationshipOffersVersion: 'relationshipOffersPreview', onboardingVersion: 'onboardingPreview' };
const read = peer => copy(peer.run('readSetupFeatureOptions()'));
const initial = read(h), markup = peer => peer.elements.get('#setupFeatureOptions').innerHTML;
assert.equal(h.run('Object.keys(readSetupFeatureOptions()).length'), 14);
assert.equal(initial.financialGroupVersion,0,'The approved group preview remains unchecked.');
assert.equal(h.elements.get('#financialGroupPreview').checked,false);
const groupSetup=harness();
groupSetup.changeFeature('#financialGroupPreview',true);
assert(groupSetup.run('featureSelectionPending()'));
assert.equal(groupSetup.run('readSetupFeatureOptions().financialGroupVersion'),0);
groupSetup.run('cancelFeatureSelectionConfirmation()');
assert.equal(groupSetup.run('readSetupFeatureOptions().financialGroupVersion'),0);
groupSetup.changeFeature('#financialGroupPreview',true);assert(groupSetup.confirmFeatures());
assert.equal(groupSetup.run('readSetupFeatureOptions().financialGroupVersion'),2);
assert.equal(groupSetup.run('readSetupFeatureOptions().onboardingVersion'),1);
assert.equal(groupSetup.run('readSetupFeatureOptions().productProgramsVersion'),2);
groupSetup.changeFeature('#onboardingPreview',false);assert(groupSetup.run('featureSelectionPending()'));
assert.match(groupSetup.elements.get('#featureSelectionAffected').innerHTML,/Financial Group/);
assert(groupSetup.confirmFeatures());assert.equal(groupSetup.run('readSetupFeatureOptions().financialGroupVersion'),0);
assert.equal(h.run('readSetupFeatureOptions().campaignRulesVersion'), undefined);
for (const [field, id] of Object.entries(ids)) {
  assert.equal(h.elements.get('#' + id).checked, false, 'unchanged unchecked default: ' + field);
  if (field !== 'campaignRulesVersion') assert.equal(initial[field], 0);
}
assert.equal(initial.featureRulesVersion, undefined, 'the opt-in marker is never added on load');
assert.match(markup(h), /No optional systems/);
assert.match(markup(h), /Requires:/);
assert.match(markup(h), /feature-maturity/);
assert.match(markup(h), /Modular combinations preview/);
const modularAvailable = h.run('modularFeatureSelectionAvailable()');
assert.equal(h.elements.get('#modularCombinationsPreview').disabled, !modularAvailable);

// Previewing a forward cascade restores every control until explicit consent.
h.run('game=E.createGame({seed:73,created:1});beforeFeatureGame=JSON.stringify(game)');
h.changeFeature('#onboardingPreview', true);
assert(h.run('featureSelectionPending()'));
assert.deepEqual(read(h), initial);
assert.match(h.elements.get('#featureSelectionAffected').innerHTML, /Regional Rivalry/);
assert.match(h.elements.get('#featureSelectionAffected').innerHTML, /Product programmes/);
assert.equal(h.run('JSON.stringify(game)'), h.run('beforeFeatureGame'), 'setup previews do not mutate a live game or RNG');
assert.equal(h.run('cancelFeatureSelectionConfirmation()'), false);
assert(!h.run('featureSelectionPending()')); assert.deepEqual(read(h), initial);

// Keep the section open across a confirmed update, rather than collapsing it.
h.elements.get('#setupFeatureOptions').listeners.toggle({ target: { dataset: { featurePrefix: '' }, open: true } });
h.changeFeature('#onboardingPreview', true); assert(h.confirmFeatures());
assert.match(markup(h), /data-feature-prefix="" open/);
for (const [field, id] of Object.entries(ids)) assert.equal(h.elements.get('#' + id).checked, true, field + ' enabled by the shared proposal');
const full = read(h);
assert.equal(full.managementVersion, 2); assert.equal(full.customerDemandVersion, 2);
assert.equal(h.run('E.createGame({...readSetupFeatureOptions(),seed:1,created:1}).version'), '8.15');
assert.match(markup(h), /six markets/);

// A highest-level disable has no collateral changes and needs no extra modal.
h.changeFeature('#onboardingPreview', false);
assert(!h.run('featureSelectionPending()')); assert.equal(read(h).onboardingVersion, 0);
assert.equal(read(h).relationshipOffersVersion, 1);
h.changeFeature('#onboardingPreview', true);
assert(!h.run('featureSelectionPending()')); assert.equal(read(h).onboardingVersion, 1);

// Reverse early dependencies used to leave higher early previews selected.
h.changeFeature('#rivalryPilot', false);
assert(h.run('featureSelectionPending()')); assert.deepEqual(read(h), full);
assert.match(h.elements.get('#featureSelectionAffected').innerHTML, /Living institution/);
assert.match(h.elements.get('#featureSelectionAffected').innerHTML, /Customer needs/);
assert(h.confirmFeatures()); assert.deepEqual(read(h), initial);
h.changeFeature('#institutionManagement', true); assert(h.confirmFeatures());
h.changeFeature('#serviceExpansion', false);
assert(h.run('featureSelectionPending()')); assert(h.confirmFeatures());
assert.equal(read(h).campaignRulesVersion, 1); assert.equal(read(h).managementVersion, 0);
assert.equal(read(h).serviceExpansionVersion, 0);
assert(h.run("E.campaignRules(readSetupFeatureOptions(),{context:'creation'}).valid"));

// Shared lobby-style adapter: one binding, revision guard, no publication on
// Cancel, and a fresh proposal after rejecting a stale confirmation.
const lobby = harness();
lobby.run(`fixtureSettings=readSetupFeatureOptions();fixtureRevision=8;fixtureCommits=[];fixtureErrors=[];fixtureEditable=true;
 fixtureContainer=document.querySelector('#fixtureFeatures');
 function renderFixture(){fixtureContainer.innerHTML=renderFeatureSelection(fixtureSettings,{prefix:'fixture-'});}
 function bindFixture(){bindFeatureSelection(fixtureContainer,{read:()=>({...fixtureSettings}),getRevision:()=>fixtureRevision,
 canEdit:()=>fixtureEditable,onError:message=>fixtureErrors.push(message),
 commit:(options,revision)=>{fixtureCommits.push({options,revision});fixtureSettings={...options};renderFixture();}});}
 renderFixture();bindFixture();bindFixture();`);
function changeFixture(id, checked) {
  const control = lobby.elements.get('#fixture-' + id); control.checked = checked;
  lobby.elements.get('#fixtureFeatures').listeners.change({ target: control });
}
changeFixture('onboardingVersion', true);
assert(lobby.run('featureSelectionPending()')); assert.equal(lobby.run('fixtureCommits.length'), 0);
lobby.run("fixtureSettings=E.previewFeatureSelection(fixtureSettings,{field:'productProgramsVersion',value:1}).options;fixtureRevision++;renderFixture();bindFixture();");
const newer = lobby.run('JSON.stringify(fixtureSettings)');
assert.equal(lobby.confirmFeatures(), false);
assert.equal(lobby.run('JSON.stringify(fixtureSettings)'), newer);
assert.equal(lobby.run('fixtureCommits.length'), 0);
assert.match(lobby.run('fixtureErrors.at(-1)'), /Settings changed/);
changeFixture('onboardingVersion', true);
assert(lobby.run('featureSelectionPending()'), 'freshly recomputed changes require a new explicit confirmation');
const freshAffected = lobby.elements.get('#featureSelectionAffected').innerHTML;
assert.doesNotMatch(freshAffected, /Regional Rivalry|Living institution|Product programmes/);
assert.match(freshAffected, /Advertising attribution|Regional growth|Relationship offers/);
assert(lobby.confirmFeatures()); assert.equal(lobby.run('fixtureCommits.length'), 1, 'rebinding cannot stack change handlers');
assert.equal(lobby.run('fixtureCommits[0].revision'), 9);

// Revision alone is insufficient: an unapplied draft edit or loss of host
// authority also invalidates a displayed proposal.
changeFixture('campaignRulesVersion', false);
lobby.run("fixtureSettings={...fixtureSettings,scenario:'growth'};");
assert.equal(lobby.confirmFeatures(), false); assert.equal(lobby.run('fixtureCommits.length'), 1);
changeFixture('campaignRulesVersion', false); lobby.run('fixtureEditable=false');
assert.equal(lobby.confirmFeatures(), false); assert.equal(lobby.run('fixtureCommits.length'), 1);
lobby.run('fixtureEditable=true;renderFixture();');
changeFixture('campaignRulesVersion', false); lobby.run('cancelFeatureSelectionConfirmation()');
assert.equal(lobby.run('fixtureCommits.length'), 1);

// Both local modes use the same flat flags; no duplicated setup cascade may
// change a host's rules implicitly while creation is awaiting confirmation.
const starts = harness();
starts.run("createdFeatureOptions=[];E.createGame=options=>{createdFeatureOptions.push(options);return {}};validName=id=>id;");
starts.changeFeature('#onboardingPreview', true); starts.run("startLocal('ai')");
assert.equal(starts.run('createdFeatureOptions.length'), 0);
starts.run('cancelFeatureSelectionConfirmation()'); starts.run("startLocal('ai');startLocal('hotseat')");
assert.equal(starts.run('createdFeatureOptions.length'), 2);
for (const field of Object.keys(ids)) assert.equal(starts.run('createdFeatureOptions[0].' + field), starts.run('createdFeatureOptions[1].' + field));
assert.equal(starts.run('createdFeatureOptions[0].onboardingVersion'), 0);

const focus = harness();
focus.run(`featureFocusEvents=[];
 document.querySelector('#onboardingPreview').focus=()=>featureFocusEvents.push('original');
 const focusBinding=document.querySelector('#setupFeatureOptions')._featureSelectionBinding,originalFeatureCommit=focusBinding.commit;
 focusBinding.commit=(...args)=>{const result=originalFeatureCommit(...args);featureFocusEvents.push('commit');
 document.querySelector('#onboardingPreview').focus=()=>featureFocusEvents.push('new-control');return result;};`);
focus.changeFeature('#onboardingPreview', true); assert(focus.confirmFeatures());
assert.deepEqual(copy(focus.run('featureFocusEvents')), ['original', 'commit', 'new-control'], 'Confirm focuses the newly rendered checkbox after commit');

if (modularAvailable) {
  const modular = harness(); modular.changeFeature('#modularCombinationsPreview', true);
  assert(modular.run('featureSelectionPending()')); assert.equal(read(modular).featureRulesVersion, undefined);
  assert(modular.confirmFeatures()); assert.equal(read(modular).featureRulesVersion, 1);
  assert.equal(read(modular).productProgramsVersion, 2);
  assert.equal(read(modular).advertisingVersion, 0); assert.equal(read(modular).regionalGrowthVersion, 0);
  assert(modular.elements.get('#relationshipOffersPreview').disabled); assert(modular.elements.get('#onboardingPreview').disabled);
  modular.changeFeature('#regionalGrowthPreview', true);
  assert(!modular.run('featureSelectionPending()')); assert.equal(read(modular).advertisingVersion, 0);
  assert.equal(read(modular).regionalGrowthVersion, 1);
  modular.changeFeature('#advertisingPreview', true); modular.changeFeature('#advertisingPreview', false);
  assert(!modular.run('featureSelectionPending()')); assert.equal(read(modular).regionalGrowthVersion, 1);
  assert(modular.run("E.campaignRules(readSetupFeatureOptions(),{context:'creation'}).valid"));
  modular.changeFeature('#modularCombinationsPreview', false);
  assert(modular.run('featureSelectionPending()'), 'leaving the pilot cannot silently leave invalid independent growth');
  modular.run('cancelFeatureSelectionConfirmation()'); assert.equal(read(modular).featureRulesVersion, 1);
}

const page = fs.readFileSync(path.join(__dirname, '../src/page.html'), 'utf8');
assert.match(page, /<dialog[^>]*id="featureSelectionDialog"[^>]*aria-labelledby="featureSelectionTitle"/);
assert.match(page, /id="featureSelectionAffected"/); assert.match(page, /id="featureSelectionCancel"/);
for (const id of Object.values(ids)) assert.equal([...page.matchAll(new RegExp('id="' + id + '"', 'g'))].length, 1, 'preserve each original checkbox id exactly once');
assert.match(page, /id="lobbyFeatureOptions"/); assert.match(page, /id="lobbyFeatureSummary"/); assert.match(page, /id="lobbyDiscardSettings"/);

const runtimeHtml = process.argv.includes('--source') ? require('../tools/build_game.js').assemble().html : fs.readFileSync(path.join(__dirname, '../BRANCH_WARS.html'), 'utf8');
function storageHarness() {
  const peer = harness();
  // Restore the real tested artifact/source-assembly handlers that the network
  // harness normally stubs. Only browser I/O and final painting are simulated.
  for (const name of ['saveLocal', 'enterGame']) {
    const body = runtimeHtml.match(new RegExp('^function ' + name + '\\([^\\n]*$', 'm'));
    assert(body, 'real handler exists: ' + name); peer.run(body[0]);
  }
  for (const id of ['#continueBtn', '#startScreen', '#connectScreen', '#lobbyScreen', '#gameScreen', '#gameOver', '#privacyScreen']) {
    const element = peer.c.document.querySelector(id), classes = new Set(['hidden']);
    element.classList = { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)),
      toggle(name, force) { const enabled = force === undefined ? !classes.has(name) : !!force; if (enabled) classes.add(name); else classes.delete(name); return enabled; },
      contains: name => classes.has(name) };
  }
  peer.run("gh.active=false;lan.active=false;p2pRole='';game=null;view=null;draft=null;renderedSeats=[];render=()=>{renderedSeats.push(seat);if(game&&!draft)newDraft(E.publicState(game,seat))}");
  const binding = "$('#continueBtn').addEventListener('click',continueSave);";
  assert(runtimeHtml.includes(binding)); peer.run(binding);
  peer.c.Blob = Blob;
  peer.c.URL = { createObjectURL(blob) { peer.exportedBlob = blob; return 'blob:feature-save-test'; }, revokeObjectURL() {} };
  peer.c.document.createElement = tag => { assert.equal(tag, 'a'); return { click() { peer.exportedName = this.download; } }; };
  peer.c.FileReader = class { readAsText(file) { this.result = file.contents; this.onload(); } };
  return peer;
}
// Migration may add ledger metadata; the campaign's actual rule scalars cannot change.
const savedRuleFields = new Set(['version', 'fundingRulesVersion', ...h.c.window.BWEngine.CAMPAIGN_FEATURES.map(feature => feature.field)]);
function savedRules(game) { return Object.fromEntries(Object.entries(game).filter(([key]) => savedRuleFields.has(key))); }
async function modularLocalPersistence() {
  if (!modularAvailable) return;
  for (const advertisingVersion of [0, 1]) for (const regionalGrowthVersion of [0, 1]) {
    for (const localMode of ['ai', 'hotseat']) for (const halfReady of localMode === 'hotseat' ? [false, true] : [false]) {
      const saved = storageHarness(), E = saved.c.window.BWEngine;
      const selected = E.previewFeatureSelection({}, { field: 'featureRulesVersion', value: 1 }).options;
      const game = E.createGame({ ...selected, advertisingVersion, regionalGrowthVersion, mode: localMode, seed: 117, created: 1 });
      const planFor = player => ({ focus: player.focus, allocation: { ...player.allocation }, products: { ...player.products },
        depositPolicy: 'balanced', lendingPolicy: 'balanced', capitalPolicy: 'balanced', newProjects: [], investments: {}, hires: 0,
        competitiveAction: 'none', decision: 'b' });
      E.submit(game, 0, planFor(game.players[0])); if (game.cycle === 1) E.submit(game, 1, planFor(game.players[1]));
      if (halfReady) E.submit(game, 0, planFor(game.players[0]));
      E.validatePilot(game);
      const rules = savedRules(game), sealed = copy(game.players[0].submitted);
      saved.c.persisted = game; saved.run('game=persisted;saveLocal()');
      const raw = saved.storage.get('branchWarsV7Save'); assert(raw, 'actual saveLocal persists v8.14');
      const reload = storageHarness(); for (const [key, value] of saved.storage) reload.storage.set(key, value);
      reload.run('updateContinue()');
      assert.equal(reload.elements.get('#continueBtn').classList.contains('hidden'), false, 'v8.14 Continue visible in a fresh client');
      reload.elements.get('#continueBtn').listeners.click();
      const resumed = reload.state().game; assert(resumed); assert.deepEqual(savedRules(resumed), rules);
      assert.deepEqual(copy(resumed.players[0].submitted), sealed); assert.equal(resumed.mode, localMode); E.validatePilot(resumed);
      if (halfReady) {
        assert.equal(reload.elements.get('#privacyScreen').classList.contains('hidden'), false);
        assert.equal(reload.run('renderedSeats.length'), 0, 'Continue preserves the half-ready privacy handoff');
        assert.equal(reload.run('draft'), null);
        reload.run('const continueHandoff=privacyNext;privacyNext=null;continueHandoff()');
        assert.equal(reload.run('seat'), 1); assert.equal(reload.run('draftOwner'), resumed.players[1].id);
        assert.deepEqual(copy(reload.run('renderedSeats')), [1]);
        assert.deepEqual(copy(reload.run('draft.householdPolicy')), copy(resumed.players[1].householdBook.policy));
        assert.deepEqual(copy(resumed.players[0].submitted), sealed);
      } else assert.deepEqual(copy(reload.run('renderedSeats')), [0]);
      reload.run('exportSave()'); assert(reload.exportedBlob); assert.match(reload.exportedName, /Save\.json$/);
      const exported = await reload.exportedBlob.text(); assert.deepEqual(savedRules(JSON.parse(exported)), rules);
      const imported = storageHarness(); imported.c.importedFile = { contents: exported }; imported.run('importSave(importedFile)');
      assert(imported.state().game, imported.c.document.querySelector('#startMsg').textContent);
      assert.deepEqual(savedRules(imported.state().game), rules); assert.deepEqual(copy(imported.state().game.players[0].submitted), sealed);
      assert.deepEqual(savedRules(JSON.parse(imported.storage.get('branchWarsV7Save'))), rules);
      if (halfReady) {
        assert.equal(imported.elements.get('#privacyScreen').classList.contains('hidden'), false, 'v8.14 import preserves the sealed hotseat curtain');
        assert.equal(imported.run('renderedSeats.length'), 0); assert.equal(imported.run('draft'), null);
        imported.run('const importHandoff=privacyNext;privacyNext=null;importHandoff()');
        assert.equal(imported.run('seat'), 1); assert.equal(imported.run('draftOwner'), imported.state().game.players[1].id);
        assert.deepEqual(copy(imported.run('renderedSeats')), [1]);
        assert.equal(imported.elements.get('#privacyScreen').classList.contains('hidden'), true);
        assert.deepEqual(copy(imported.run('draft.householdPolicy')), copy(imported.state().game.players[1].householdBook.policy));
        assert.deepEqual(copy(imported.state().game.players[0].submitted), sealed, 'Only the receiving bank is drafted; sealed instruction unchanged');
      } else assert.deepEqual(copy(imported.run('renderedSeats')), [0]);
      imported.run('game.gameOver=true;game.rematchVotes=[];seat=0;requestRematch()');
      if (localMode === 'hotseat') imported.run('seat=1;requestRematch()');
      const rematched = imported.state().game;
      assert.equal(rematched.cycle, 1); assert.equal(rematched.gameOver, false); assert.deepEqual(savedRules(rematched), rules);
      assert.equal(rematched.featureRulesVersion, 1); assert.equal(rematched.advertisingVersion || 0, advertisingVersion);
      assert.equal(rematched.regionalGrowthVersion || 0, regionalGrowthVersion); E.validatePilot(rematched);
      assert.deepEqual(savedRules(JSON.parse(imported.storage.get('branchWarsV7Save'))), rules, 'actual rematch autosave retains the exact pair');
    }
  }
  const unsupported = storageHarness();
  unsupported.storage.set('branchWarsV7Save', JSON.stringify({ version: '8.99', gameOver: false })); unsupported.run('updateContinue()');
  assert(unsupported.elements.get('#continueBtn').classList.contains('hidden'));
}
modularLocalPersistence().then(() => console.log('Feature setup PASS: unchanged opt-in defaults, current pricing-enabled creation, dependency confirmation/cancellation, reverse cascades, stale revisions, mode parity, and all four modular pairs through real autosave/Continue/export/import/rematch.'))
  .catch(error => { console.error(error); process.exitCode = 1; });
