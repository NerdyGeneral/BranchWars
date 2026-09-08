'use strict';

// Unlike two current runs agreeing, these outcomes were captured from the
// published pre-refactor engine. Preserve them across structural changes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../BRANCH_WARS.html'), 'utf8');
const fixtures = path.join(__dirname, 'fixtures');
const baseline = JSON.parse(fs.readFileSync(path.join(fixtures, 'save-continuation.json'), 'utf8'));
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));
function normalized(game) {
  const g = copy(game);
  delete g.ledgerVersion;
  for (const player of g.players) delete player.strategy;
  return g;
}
assert.equal(baseline.afterHalfReadyCompletionAndTurns, 12);
assert.equal(Object.keys(baseline.expected).length, 3);
for (const [file, expected] of Object.entries(baseline.expected)) {
  assert(['legacy-half-ready.json', 'pilot-half-ready.json', 'goodwill-half-ready.json'].includes(file));
  const context = {console};
  vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1], context);
  const E = context.BWEngine, client = {E, console};
  vm.runInNewContext(source.slice(source.indexOf('function repairGame'), source.indexOf('function saveLocal')) +
    ';globalThis.migrate=migrateGame;', client);
  const fixture = JSON.parse(fs.readFileSync(path.join(fixtures, file), 'utf8'));
  const original = JSON.stringify(fixture.game), g = client.migrate(fixture.game);
  assert.equal(JSON.stringify(fixture.game), original, 'Import mutated preserved save');
  E.submit(g, 1, E.chooseBot(g, 1));
  for (let turn = 0; turn < 12 && !g.gameOver; turn++) {
    const plans = [E.chooseBot(g, 0), E.chooseBot(g, 1)], first = turn % 2;
    E.submit(g, first, plans[first]); E.submit(g, 1 - first, plans[1 - first]);
  }
  assert.equal(digest(normalized(g)), expected, 'Preserved save outcome changed: ' + file);
}
console.log('Published-save baselines passed: three real imports match fixed pre-refactor continuation outcomes.');
