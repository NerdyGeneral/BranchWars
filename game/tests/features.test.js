'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), copy = value => JSON.parse(JSON.stringify(value));
function load(file) {
  let script;
  if (file) script = fs.readFileSync(file, 'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
  else {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
    script = fs.readFileSync(path.join(root, 'src', manifest.engine.shell), 'utf8').replace('/* @modules */', () =>
      manifest.engine.modules.map(name => fs.readFileSync(path.join(root, 'src', name), 'utf8')).join('\n'));
  }
  const fixedMath = Object.create(Math); fixedMath.random = () => .375;
  const context = { console, Math: fixedMath, Date: class extends Date { static now() { return 123456; } } };
  vm.runInNewContext(script, context); return context.BWEngine;
}
const E = load(process.argv.includes('--source') ? null : path.join(root, 'BRANCH_WARS.html'));
assert.equal(new Set(E.CAMPAIGN_FEATURES.map(d => d.field)).size, E.CAMPAIGN_FEATURES.length);
const positions = new Map(E.CAMPAIGN_FEATURES.map((d, i) => [d.field, i]));
for (const def of E.CAMPAIGN_FEATURES) {
  assert(Object.isFrozen(def)); assert.equal(typeof def.label, 'string'); assert.equal(def.maturity, 'preview');
  for (const need of def.requires) assert(positions.get(need.field) < positions.get(def.field), 'Dependencies must precede consumers.');
}
const all = E.previewFeatureSelection({}, { field: 'onboardingVersion', value: 1 });
assert(all.rules.valid); assert.equal(all.rules.version, '8.15'); assert(all.requiresConfirmation);
assert.equal(all.options.customerDemandVersion, 2); assert.equal(all.options.managementVersion, 2);
const before = JSON.stringify(all.options), off = E.previewFeatureSelection(all.options, { field: 'advertisingVersion', value: 0 });
assert.equal(JSON.stringify(all.options), before); assert(off.requiresConfirmation); assert(off.rules.valid);
for (const key of ['advertisingVersion', 'regionalGrowthVersion', 'relationshipOffersVersion', 'onboardingVersion']) assert.equal(off.options[key], 0);
assert.equal(off.rules.version, '8.15'); assert.equal(off.options.productProgramsVersion, 2);
const onlySelected = E.previewFeatureSelection(off.options, { field: 'advertisingVersion', value: 1 });
assert(!onlySelected.requiresConfirmation); assert.equal(onlySelected.changes.length, 1);
assert.throws(() => E.previewFeatureSelection({}, { field: 'advertisingVersion', value: true }), /Unsupported/);
assert.throws(() => E.previewFeatureSelection({}, { field: 'fundingCovenantVersion', value: 1 }), /Unsupported/);
assert.throws(() => E.validateCampaignRules({ advertisingVersion: 1 }, 'lobby'), /requires/);
assert.throws(() => E.validateCampaignRules({ campaignRulesVersion: 0 }, 'creation'), /Unsupported campaign rules/);
assert.equal(E.validateCampaignRules({ campaignRulesVersion: 0 }, 'lobby').options.campaignRulesVersion, undefined);
assert.equal(E.campaignRules({}).options.fundingRulesVersion, 2);
const implicit = E.campaignRules({ campaignRulesVersion: 1 });
assert.equal(implicit.options.serviceExpansionVersion, 1); assert.equal(implicit.options.managementVersion, 0);
const explicitOff = E.campaignRules({ campaignRulesVersion: 1, creditLifecycleVersion: 0 });
assert.equal(explicitOff.options.creditLifecycleVersion, 0); assert.equal(explicitOff.options.depositProductsVersion, 0);
assert.equal(E.campaignRules({ ...all.options, managementVersion: 1 }).valid, false);
assert.throws(() => E.createGame({ campaignRulesVersion: 0 }), /Unsupported campaign rules/);
assert.throws(() => E.createGame({ customerDemandVersion: 9, onboardingVersion: 9 }), /customer demand version/);
assert.equal(E.peerRulesIssue(all.rules, E.campaignCapabilities()), null);
const caps = E.campaignCapabilities(); delete caps.onboardingSupported;
assert.equal(E.peerRulesIssue(all.rules, caps).field, 'onboardingVersion');
assert.equal(E.peerRulesIssue(all.rules, {}).message, 'Customer onboarding preview requires the updated game on both computers.');
assert.equal(E.campaignCapabilities().onboardingSupported, 1, 'Returned capabilities are detached.');
let dependencyEdges = 0, implicitCutoffs = 0;
for (const def of E.CAMPAIGN_FEATURES.filter(row => row.visible && row.available && row.field !== 'featureRulesVersion')) {
  const enabled = E.previewFeatureSelection({}, { field: def.field, value: def.setupVersion });
  assert(enabled.rules.valid);
  for (const required of def.requires) {
    assert(enabled.rules.options[required.field] >= required.version); dependencyEdges++;
  }
  for (const ancestor of enabled.rules.features.filter(row => row.enabled && row.visible && positions.get(row.field) < positions.get(def.field))) {
    const removed = E.previewFeatureSelection(enabled.options, { field: ancestor.field, value: 0 });
    assert(removed.rules.valid); assert(!removed.rules.options[def.field], 'Disabling ' + ancestor.field + ' retained dependent ' + def.field);
  }
}
for (const def of E.CAMPAIGN_FEATURES.filter(row => row.implicit)) {
  const cutoff = { campaignRulesVersion: 1, [def.field]: 0 }, g = E.createGame({ ...cutoff, seed: 'implicit-cutoff', created: 1 });
  const resolved = E.campaignRules(cutoff);
  assert(resolved.valid); assert.equal(resolved.options[def.field], 0); assert.equal(g[def.field], undefined);
  for (const row of E.CAMPAIGN_FEATURES.filter(row => row.implicit)) assert.equal(resolved.options[row.field], g[row.field] || 0);
  implicitCutoffs++;
}
const profiles = [{}];
let flags = { campaignRulesVersion: 1 }; profiles.push({ ...flags, serviceExpansionVersion: 0 }); profiles.push({ ...flags });
for (const [field, value] of [['serviceExpansionVersion', 1], ['managementVersion', 1], ['managementVersion', 2],
  ['customerDemandVersion', 1], ['customerDemandVersion', 2], ['workforceVersion', 1], ['customerOwnershipVersion', 1],
  ['creditPerformanceVersion', 1], ['segmentDepositsVersion', 1], ['productProgramsVersion', 1], ['advertisingVersion', 1],
  ['regionalGrowthVersion', 1], ['relationshipOffersVersion', 1], ['onboardingVersion', 1]]) {
  flags = { ...flags, [field]: value }; profiles.push(flags);
}
for (const [index, profile] of profiles.entries()) {
  const options = { ...profile, mode: 'hotseat', seed: 'feature-compat-' + index, created: 1 };
  const raw = JSON.stringify(options), game = E.createGame(options);
  assert.equal(JSON.stringify(options), raw);
  const rules = E.validateCampaignRules(game, 'game');
  assert.equal(E.validateCampaignRules(E.publicState(game, 0), 'view').signature, rules.signature);
  assert.equal(E.validateCampaignRules(options, 'creation').signature, rules.signature);
  assert.equal(JSON.stringify(E.createGame({ ...options, ...rules.options })), JSON.stringify(game), 'Resolved creation options preserve game creation.');
  assert.equal(E.validateCampaignRules(E.migrateCampaign(copy(game)), 'game').signature, rules.signature);
}
for (const damaged of [{ version: '8.14' }, { ...all.options, version: '8.13', featureRulesVersion: 2 },
  { ...all.options, version: '8.12' }, { version: '8.1', workforceVersion: 0 }])
  assert.throws(() => E.validateCampaignRules(damaged, 'game'));
const baselineIndex = process.argv.indexOf('--baseline');
let comparedMonths = 0;
if (baselineIndex !== -1) {
  const old = load(path.resolve(root, process.argv[baselineIndex + 1]));
  for (const [index, profile] of profiles.entries()) {
    const options = { ...profile, mode: 'hotseat', seed: 'feature-compat-' + index, created: 1 };
    const a = old.createGame(options), b = E.createGame(options);
    assert.equal(JSON.stringify(b), JSON.stringify(a), 'Legacy creation drift at profile ' + index);
    for (let month = 0; month < 4 && !a.gameOver; month++) {
      const pa = a.players.map((p, i) => old.chooseBot(a, i)), pb = b.players.map((p, i) => E.chooseBot(b, i));
      assert.equal(JSON.stringify(pb), JSON.stringify(pa), 'Legacy AI drift at profile ' + index);
      assert.equal(JSON.stringify(b), JSON.stringify(a), 'Legacy RNG drift at profile ' + index);
      for (let i = 0; i < 2; i++) { old.submit(a, i, pa[i]); E.submit(b, i, pb[i]); }
      assert.equal(JSON.stringify(b), JSON.stringify(a), 'Legacy resolution drift at profile ' + index);
      assert.equal(JSON.stringify(E.migrateCampaign(copy(b))), JSON.stringify(old.migrateCampaign(copy(a))));
      comparedMonths++;
    }
    for(let month=0;month<2&&!a.gameOver;month++){
      const human=world=>world.players.map(p=>({focus:p.focus,allocation:{...p.allocation},decision:'b',
        depositPolicy:month?'margin':'aggressive',lendingPolicy:'balanced',capitalPolicy:'balanced',
        products:{...p.products},newProjects:[],investments:{},hires:0,competitiveAction:'none'}));
      const pa=human(a),pb=human(b);
      for(const i of [1,0]){old.submit(a,i,pa[i]);E.submit(b,i,pb[i]);}
      assert.equal(JSON.stringify(b),JSON.stringify(a),'Legacy explicit human resolution drift at profile '+index);
      assert.equal(JSON.stringify(E.migrateCampaign(copy(b))),JSON.stringify(old.migrateCampaign(copy(a))));
      comparedMonths++;
    }
    a.gameOver = true; b.gameOver = true; old.rematch(a, 0); E.rematch(b, 0); old.rematch(a, 1); E.rematch(b, 1);
    assert.equal(JSON.stringify(b), JSON.stringify(a), 'Legacy rematch drift at profile ' + index);
  }
}
console.log(JSON.stringify({ passed: true, profiles: profiles.length, comparedMonths, dependencyEdges, implicitCutoffs, checks: ['registry graph', 'pure dependency cascade', 'implicit defaults', 'creation roundtrip', 'game-view agreement', 'save validation', 'peer capabilities', 'optional exact frozen baseline replay'] }));
