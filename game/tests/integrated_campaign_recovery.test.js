'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {test} = require('node:test');
const root = path.join(__dirname, '..'), copy = value => JSON.parse(JSON.stringify(value));
function load(html) {
  const context = {console};
  const engine = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(engine.replace('root.BWEngine={', 'root.recoveryHooks={startProject};root.BWEngine={'), context);
  return {E: context.BWEngine, H: context.recoveryHooks};
}
const html = process.argv.includes('--source') ? require('../tools/build_game').assemble().html : fs.readFileSync(path.join(root, 'BRANCH_WARS.html'), 'utf8');
const {E, H} = load(html);
// A preserved, already-supported engine is the source of historical saves.
// Do not rebuild this reference or replace its states with current creation.
const old = load(fs.readFileSync(path.join(root, 'reports/reference-builds/BRANCH_WARS_departments_group6_57cc519e.html'), 'utf8')).E;
const base = {mode:'hotseat', seed:'integrated-recovery', created:1, name1:'Oak Bank', name2:'Cedar Bank'};
// Normalize once before the event under test: legacy migration intentionally
// removes the obsolete strategy mirror and adds ledgerVersion to fresh games.
const expanded = () => E.migrateCampaign(E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion', value:8}).options, ...base}));
const plan = p => ({focus:p.focus, allocation:{...p.allocation}, decision:'b', depositPolicy:'balanced', lendingPolicy:'balanced',
  capitalPolicy:'balanced', products:{...p.products}, newProjects:[], investments:{}, hires:0, competitiveAction:'none', opportunity:null});
function concede(g) {
  const key = Object.keys(g.territories).find(k => !g.players[0].branches[k] && g.players[1].branches[k] > 0);
  const t = g.territories[key]; t.shares = [5,95]; t.exitStreak[0] = 5;
  E.resolveMarketExits(g); assert.equal(t.exited[0], true);
  return key;
}
test('Group 8 real exit flags survive engine and client import without changing market shares', () => {
  const g = expanded(); concede(g);
  const before = copy(g), restored = E.migrateCampaign(copy(g));
  assert.deepEqual(copy(restored), before);
  const client = {E, console};
  vm.runInNewContext(html.slice(html.indexOf('function repairGame'), html.indexOf('function saveLocal')) + ';globalThis.restore=migrateGame;', client);
  assert.deepEqual(copy(client.restore(copy(g))), before);
  assert.deepEqual(copy(g), before);
  for (const seat of [0,1]) assert(E.validateCampaignRules(E.publicState(restored, seat), 'view').valid);
});
test('Group 8 can lock a plan in a withdrawn market and restore that pending plan', () => {
  const g = expanded(), key = concede(g), order = {...plan(g.players[0]), focus:key};
  E.submit(g, 0, order);
  const restored = E.migrateCampaign(copy(g));
  assert.equal(restored.players[0].submitted.focus, key);
  for (const world of [g, restored]) E.submit(world, 1, plan(world.players[1]));
  assert.deepEqual(copy(restored), copy(g));
});
test('Paid Group 8 re-entry clears withdrawal and grants time, not free market share', () => {
  const g = expanded(), key = concede(g), p = g.players[0], before = p.stats.cash, shares = copy(g.territories[key].shares);
  p.focus = key;
  H.startProject(g, p, 'branch');
  const project = p.projects.find(row => row.key === 'branch');
  assert(project, 'An eligible paid re-entry project must start');
  assert(p.stats.cash < before, 'Re-entry consumes actual cash');
  E.finishProject(g, p, project); p.projects = p.projects.filter(row => row !== project);
  assert.equal(g.territories[key].exited[0], false);
  assert(g.territories[key].reentryUntil[0] > g.cycle);
  assert.deepEqual(copy(g.territories[key].shares), shares);
  assert.equal(E.migrateCampaign(copy(g)).players[0].branches[key], 1);
});
test('Earlier rivalry versions still reject exit flags and malformed flags are not repaired', () => {
  const g = E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion', value:7}).options, ...base});
  g.territories.northside.exited[0] = true;
  assert.throws(() => E.migrateCampaign(copy(g)), /pilot market/);
  for (const flags of [[true], [true,0], [false,false,false], 'bad']) {
    const bad = expanded(); bad.territories.northside.exited = flags;
    assert.throws(() => E.migrateCampaign(copy(bad)), /pilot market/);
  }
});
for (const productProgramsVersion of [1,2]) for (const advertisingVersion of [0,1]) for (const regionalGrowthVersion of [0,1]) {
  test(`Historical modular products ${productProgramsVersion}, ads ${advertisingVersion}, growth ${regionalGrowthVersion}: import, replay, privacy and rematch`, () => {
    const options = {...old.previewFeatureSelection({}, {field:'featureRulesVersion', value:1}).options,
      ...base, productProgramsVersion, advertisingVersion, regionalGrowthVersion};
    const historic = old.migrateCampaign(old.createGame(options)), restored = E.migrateCampaign(copy(historic));
    assert.deepEqual(copy(restored), copy(historic));
    assert.equal(restored.version, productProgramsVersion === 1 ? '8.14' : '8.15');
    for (const seat of [0,1]) {
      const view = E.publicState(restored, seat);
      assert(E.validateCampaignRules(view, 'view').valid);
      assert.equal(view.featureRulesVersion, 1); assert.equal(view.rival.advertising, undefined);
    }
    for (const seat of [0,1]) { old.submit(historic, seat, plan(historic.players[seat])); E.submit(restored, seat, plan(restored.players[seat])); }
    assert.deepEqual(copy(restored), copy(historic), 'Historical settlement and RNG remain exact');
    assert.deepEqual(copy(E.migrateCampaign(copy(restored))), copy(restored));
    const rules = E.validateCampaignRules(restored, 'game'), caps = E.campaignCapabilities();
    assert.equal(E.peerRulesIssue(rules, caps), null);
    delete caps.featureRulesSupported;
    assert.equal(E.peerRulesIssue(rules, caps).field, 'featureRulesVersion');
    restored.gameOver = true;
    E.rematch(restored, 0); E.rematch(restored, 1);
    assert.equal(restored.featureRulesVersion, 1);
    assert.equal(restored.advertisingVersion, advertisingVersion || undefined);
    assert.equal(restored.regionalGrowthVersion, regionalGrowthVersion || undefined);
    assert(E.validateCampaignRules(restored, 'game').valid);
  });
}
test('Historical support does not restore modular selection or accept invalid combinations', () => {
  assert.equal(E.CAMPAIGN_FEATURES.find(feature => feature.field === 'featureRulesVersion').available, false);
  assert.throws(() => E.previewFeatureSelection({}, {field:'featureRulesVersion', value:1}), /Unsupported setup/);
  const g = expanded(); g.featureRulesVersion = 1;
  assert.throws(() => E.migrateCampaign(copy(g)), /not supported|matching/);
});
