'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const fixtureDir = path.join(__dirname, 'fixtures');
const source = fs.readFileSync(path.join(root, 'BRANCH_WARS.html'), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sourceHash = crypto.createHash('sha256').update(source.replace(/\r\n/g, '\n')).digest('hex');
const args = process.argv.slice(2);
assert(args.every(x => ['--update-goldens', '--capture-saves'].includes(x)), 'Unknown golden test option');
assert(!(args.includes('--capture-saves') && args.includes('--update-goldens')), 'Capture and update separately');
function runtime() {
  const context = {console};
  vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1], context);
  const E = context.BWEngine, client = {E, console};
  vm.runInNewContext(source.slice(source.indexOf('function repairGame'), source.indexOf('function saveLocal')) +
    ';globalThis.migrate=migrateGame;', client);
  return {E, migrate: client.migrate};
}
const profiles = [
  {name: 'town-v1', options: {scope: 'town', fundingRulesVersion: 1}},
  {name: 'regional-v2', options: {scope: 'regional'}},
  {name: 'state-v2', options: {scope: 'state'}},
  {name: 'national-v2', options: {scope: 'national'}},
  {name: 'regional-pilot', options: {campaignRulesVersion: 1, serviceExpansionVersion: 0}},
  {name: 'services', options: {campaignRulesVersion: 1, serviceExpansionVersion: 1}},
  {name: 'management', options: {campaignRulesVersion: 1, managementVersion: 1}},
  {name: 'relationships', options: {campaignRulesVersion: 1, managementVersion: 2}},
  {name: 'customer-needs', options: {campaignRulesVersion: 1, managementVersion: 2, customerDemandVersion: 1}},
  {name: 'goodwill', options: {campaignRulesVersion: 1, managementVersion: 2, customerDemandVersion: 2}}
];
const cases = profiles.flatMap((profile, i) => [0, 1].map(seatOrder => ({
  name: profile.name + '-' + seatOrder, seatOrder,
  options: {...profile.options, seed: 'foundation-' + profile.name + '-' + seatOrder,
    created: 1, mode: 'hotseat', name1: 'North Bank', name2: 'South Bank',
    scenario: ['balanced', 'rate', 'regulatory', 'growth'][(i + seatOrder) % 4]}
})));
// Only legacy import metadata is normalized, matching the existing save-integrity contract.
function normalized(game) {
  const g = copy(game);
  delete g.ledgerVersion;
  for (const p of g.players) delete p.strategy;
  return g;
}
function resolve(E, g, order) {
  const plans = [E.chooseBot(g, 0), E.chooseBot(g, 1)];
  E.submit(g, order, plans[order]);
  E.submit(g, 1 - order, plans[1 - order]);
  return plans;
}
function measure(testCase) {
  const {E, migrate} = runtime(), g = E.createGame(testCase.options);
  const trajectory = crypto.createHash('sha256'), checkpoints = [];
  let resumed = null, turns = 0;
  trajectory.update(JSON.stringify(g));
  for (; turns < 40 && !g.gameOver; turns++) {
    const plans = resolve(E, g, testCase.seatOrder);
    if (resumed) {
      const replayPlans = resolve(E, resumed, testCase.seatOrder);
      assert.equal(digest(replayPlans), digest(plans), testCase.name + ': resumed AI differs');
      assert.equal(digest(normalized(resumed)), digest(normalized(g)), testCase.name + ': resumed state differs');
    }
    // Public output and full private state are both part of the behavioral contract.
    trajectory.update(JSON.stringify({plans, game: g, views: [E.publicState(g, 0), E.publicState(g, 1)]}));
    if ((turns + 1) % 10 === 0) checkpoints.push({turn: turns + 1, state: digest(g)});
    if (turns === 11) resumed = migrate(copy(g));
  }
  return {name: testCase.name, options: testCase.options, seatOrder: testCase.seatOrder,
    turns, trajectory: trajectory.digest('hex'), checkpoints, final: digest(g)};
}
const saveFiles = ['legacy-half-ready.json', 'pilot-half-ready.json', 'goodwill-half-ready.json'];
if (args.includes('--capture-saves')) {
  // Baseline-only command: never overwrite an existing historical save.
  assert(saveFiles.every(file => !fs.existsSync(path.join(fixtureDir, file))), 'Save fixtures already exist; preserve them.');
  fs.mkdirSync(fixtureDir, {recursive: true});
  [cases[0], cases[8], cases[18]].forEach((testCase, i) => {
    const {E} = runtime(), game = E.createGame(testCase.options);
    for (let t = 0; t < 8 && !game.gameOver; t++) resolve(E, game, 0);
    assert(!game.gameOver);
    E.submit(game, 0, E.chooseBot(game, 0));
    fs.writeFileSync(path.join(fixtureDir, saveFiles[i]), JSON.stringify({sourceHash, options: testCase.options, game}, null, 2) + '\n');
  });
  console.log('Captured three immutable half-ready save fixtures.');
  process.exit(0);
}
const measured = {format: 1, cases: cases.map(measure)};
const goldenFile = path.join(fixtureDir, 'behavior-golden.json');
if (args.includes('--update-goldens')) {
  fs.mkdirSync(fixtureDir, {recursive: true});
  fs.writeFileSync(goldenFile, JSON.stringify({...measured, baselineSource: sourceHash}, null, 2) + '\n');
  console.log('Updated behavioral expectations. Review and justify this diff; not evidence of unchanged behavior.');
} else {
  const expected = JSON.parse(fs.readFileSync(goldenFile, 'utf8'));
  for (let i = 0; i < measured.cases.length; i++) assert.deepEqual(measured.cases[i], expected.cases[i], 'Behavior changed: ' + measured.cases[i].name);
  assert.equal(measured.cases.length, expected.cases.length);
}
for (const file of saveFiles) {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDir, file), 'utf8'));
  const {E, migrate} = runtime(), original = copy(fixture.game), serialized = JSON.stringify(original);
  const restored = migrate(original);
  assert.equal(JSON.stringify(original), serialized, 'Migration mutated fixture: ' + file);
  assert.equal(digest(normalized(restored)), digest(normalized(original)), 'Imported fixture differs: ' + file);
  // Complete the preserved half-ready turn through the real importer.
  const plan = E.chooseBot(original, 1), resumedPlan = E.chooseBot(restored, 1);
  assert.equal(digest(plan), digest(resumedPlan));
  E.submit(original, 1, plan); E.submit(restored, 1, resumedPlan);
  for (let turn = 0; turn < 12; turn++) {
    assert.equal(digest(normalized(original)), digest(normalized(restored)), 'Continuation differs: ' + file);
    if (original.gameOver) break;
    assert.equal(digest(resolve(E, original, turn % 2)), digest(resolve(E, restored, turn % 2)));
  }
  assert.equal(digest(normalized(original)), digest(normalized(restored)), 'Final continuation differs: ' + file);
}
console.log('Behavior gates passed: 20 fixed campaigns / ' + measured.cases.reduce((n, c) => n + c.turns, 0) +
  ' turns, resumed campaigns, both submit orders and three preserved half-ready saves.');
