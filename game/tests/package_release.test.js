'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { build } = require('../tools/build_game');
const { packageRelease, verifyPackage, RUNTIME_FILES, INVENTORY } = require('../tools/package_release');
const gameRoot = path.resolve(__dirname, '..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function engine(bytes) {
  const match = bytes.toString('utf8').match(/<script id="engine">([\s\S]*?)<\/script>/);
  assert(match, 'Packaged portable includes the engine');
  const context = { console, Math, Date };
  vm.runInNewContext(match[1], context);
  return context.BWEngine;
}
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'branchwars-package-test-'));
try {
  const fixture = path.join(temporary, 'fixture', 'game');
  fs.mkdirSync(fixture, { recursive: true });
  fs.cpSync(path.join(gameRoot, 'src'), path.join(fixture, 'src'), { recursive: true });
  for (const name of RUNTIME_FILES) fs.copyFileSync(path.join(gameRoot, name), path.join(fixture, name));
  build({ sourceRoot: path.join(fixture, 'src'), output: path.join(fixture, 'BRANCH_WARS.html') });
  // Prove packaging is not a recursive developer-workspace copy.
  fs.mkdirSync(path.join(fixture, 'reports'));
  fs.writeFileSync(path.join(fixture, 'reports', 'private-save.json'), '{"fictionalPrivateSave":true}');
  fs.writeFileSync(path.join(fixture, '.env'), 'FAKE_PRIVATE_TEST_VALUE=excluded');
  const sourceBytes = new Map(RUNTIME_FILES.map(name => [name, fs.readFileSync(path.join(fixture, name))]));
  const output = path.join(temporary, 'Player Release With Spaces');
  const result = packageRelease({ output, gameRoot: fixture });
  assert.equal(result.files, 6);assert.equal(result.portableSha256, digest(sourceBytes.get('BRANCH_WARS.html')));
  assert.deepEqual(fs.readdirSync(output).sort(), INVENTORY);
  for (const name of RUNTIME_FILES) assert(fs.readFileSync(path.join(output, name)).equals(sourceBytes.get(name)), name + ' changed bytes');
  const manifest = fs.readFileSync(path.join(output, 'manifest.json'));
  assert(!manifest.toString().includes(temporary), 'Manifest must not disclose a developer path');
  assert(!manifest.toString().includes('FAKE_PRIVATE_TEST_VALUE'));
  const second = path.join(temporary, 'Second Release');packageRelease({ output: second, gameRoot: fixture });
  assert(fs.readFileSync(path.join(second, 'manifest.json')).equals(manifest), 'Manifest is deterministic');
  assert.throws(() => packageRelease({ output, gameRoot: fixture }), /already exists/);
  assert(fs.readFileSync(path.join(output, 'manifest.json')).equals(manifest), 'Existing package was modified');
  assert.throws(() => packageRelease({ output: 'relative-output', gameRoot: fixture }), /absolute/);
  assert.throws(() => packageRelease({ output: path.join(fixture, 'bad-output'), gameRoot: fixture }), /outside/);
  assert(!fs.existsSync(path.join(fixture, 'bad-output')));
  const alias = path.join(temporary, 'Repository Alias');
  fs.symlinkSync(path.dirname(fixture), alias, 'junction');
  assert.throws(() => packageRelease({ output: path.join(alias, 'escaped-output'), gameRoot: fixture }), /outside/);
  assert(!fs.existsSync(path.join(path.dirname(fixture), 'escaped-output')), 'A junction must not bypass repository exclusion');
  fs.unlinkSync(alias);
  assert.throws(() => packageRelease({ gameRoot: fixture }), /absolute/);
  const staleOutput = path.join(temporary, 'Stale must not publish');
  fs.appendFileSync(path.join(fixture, 'BRANCH_WARS.html'), '\n<!-- stale fixture -->');
  const staleBytes = fs.readFileSync(path.join(fixture, 'BRANCH_WARS.html'));
  assert.throws(() => packageRelease({ output: staleOutput, gameRoot: fixture }), /stale/);
  assert(!fs.existsSync(staleOutput));assert(fs.readFileSync(path.join(fixture, 'BRANCH_WARS.html')).equals(staleBytes), 'Packaging must not repair the portable');
  fs.writeFileSync(path.join(fixture, 'BRANCH_WARS.html'), sourceBytes.get('BRANCH_WARS.html'));
  fs.writeFileSync(path.join(second, 'PRIVATE_TEST_SAVE.json'), '{"fictional":true}');
  assert.throws(() => verifyPackage(second), /inventory/);
  fs.unlinkSync(path.join(second, 'PRIVATE_TEST_SAVE.json'));
  fs.appendFileSync(path.join(second, 'OPEN_LAN_GAME.bat'), '\r\nrem corrupted fixture\r\n');
  assert.throws(() => verifyPackage(second), /hash mismatch/);
  fs.writeFileSync(path.join(second, 'OPEN_LAN_GAME.bat'), sourceBytes.get('OPEN_LAN_GAME.bat'));
  assert.equal(verifyPackage(second).portableSha256, result.portableSha256);
  const expectedEngine = engine(sourceBytes.get('BRANCH_WARS.html'));
  const packagedEngine = engine(fs.readFileSync(path.join(output, 'BRANCH_WARS.html')));
  for (const options of [{}, { campaignRulesVersion: 1, managementVersion: 2, customerDemandVersion: 2 }]) {
    const setup = { ...options, seed: 'package-runtime', created: 1, mode: 'hotseat' };
    let expected = expectedEngine.createGame(setup), actual = packagedEngine.createGame(setup);
    assert.equal(JSON.stringify(actual), JSON.stringify(expected), 'Packaged creation drifted');
    for (let month = 0; month < 2; month++) {
      const expectedPlans = [0, 1].map(seat => expectedEngine.chooseBot(expected, seat));
      const actualPlans = [0, 1].map(seat => packagedEngine.chooseBot(actual, seat));
      for (const seat of [0, 1]) { expectedEngine.submit(expected, seat, expectedPlans[seat]);packagedEngine.submit(actual, seat, actualPlans[seat]); }
      expected = expectedEngine.migrateCampaign(JSON.parse(JSON.stringify(expected)));
      actual = packagedEngine.migrateCampaign(JSON.parse(JSON.stringify(actual)));
      assert.equal(JSON.stringify(actual), JSON.stringify(expected), 'Packaged resolve/resume drifted');
      for (const seat of [0, 1]) assert.equal(JSON.stringify(packagedEngine.publicState(actual, seat)), JSON.stringify(expectedEngine.publicState(expected, seat)));
    }
  }
  const cli = spawnSync(process.execPath, [path.join(gameRoot, 'tools', 'package_release.js'), '--verify', output], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);assert.equal(JSON.parse(cli.stdout).portableSha256, result.portableSha256);
  const missingArgument = spawnSync(process.execPath, [path.join(gameRoot, 'tools', 'package_release.js')], { encoding: 'utf8' });
  assert.notEqual(missingArgument.status, 0);assert.match(missingArgument.stderr, /Usage/);
  console.log('Release packaging PASS: six-file allowlist, spaced output, immutable copies, deterministic manifest, no private workspace files, stale/overwrite/in-repo rejection, extra/tamper verification, packaged creation/resume and CLI verification.');
} finally {
  const resolved = fs.realpathSync(temporary), tempRoot = fs.realpathSync(os.tmpdir());
  assert.equal(path.dirname(resolved), tempRoot);assert(path.basename(resolved).startsWith('branchwars-package-test-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}
