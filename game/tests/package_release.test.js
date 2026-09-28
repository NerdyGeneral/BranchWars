'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { build } = require('../tools/build_game');
const { packageRelease, verifyPackage, RUNTIME_FILES, INVENTORY, README } = require('../tools/package_release');
const { verify: verifyRuntime } = require('../tools/verify_v4_package');
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
  // The ZIP is independently hashed here; runtime verification explicitly does
  // not claim an archive-entry/extraction comparison. Final packaging does that.
  const archive = path.join(temporary, 'local-review.zip');
  fs.writeFileSync(archive, 'archive hash fixture, not an extraction test');
  const structural = verifyPackage(output);
  assert.equal(structural.verification, 'manifest-integrity');
  assert.equal(structural.provenanceVerified, false);assert.equal(structural.sourceCompared, false);
  assert.equal(structural.expectedReadmeVerified, false);
  assert.equal(verifyPackage(output, { expectedReadme: README }).expectedReadmeVerified, true);
  const current = verifyRuntime(output, archive, { release: 'local-packaging-test' });
  assert.equal(current.verification, 'current-source-and-runtime');assert.equal(current.profile, 'current');
  assert.equal(current.release, 'local-packaging-test');assert.equal(current.package, 'local-review.zip');
  assert.equal(current.sha256, digest(fs.readFileSync(archive)));assert.equal(current.archiveContentVerified, false);
  assert.equal(current.sourceCompared, true);assert.equal(current.sourceMatches, true);assert.equal(current.expectedReadmeVerified, true);
  assert.equal(current.runtimeFilesCompared, true);
  assert.equal(current.pinnedHtmlSha256, null);
  assert.deepEqual(current.checks.map(check => [check.edition, check.version]), [['core', '8.20'], ['expanded', '9.41']]);
  assert.equal(current.checks[0].research.legalPaidAcquisition, true);
  assert.equal(current.checks[0].research.model, 'standing');assert.equal(current.checks[0].research.permanentChoiceEnforced, true);
  for (const check of current.checks) {
    assert.equal(check.halfReadyRecovery, true);assert.equal(check.ownerViewsMatch, true);assert.equal(check.rivalPrivateFieldsAbsent, true);
    assert.equal(check.rematch.rulesPreserved, true);assert.equal(check.rematch.paidResearchReset, true);assert.equal(check.rematch.twoVotesRequired, true);
  }
  function replaceFixtureContent(directory, name, bytes) {
    fs.writeFileSync(path.join(directory, name), bytes);
    const updated = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
    Object.assign(updated.files.find(entry => entry.name === name), { bytes: Buffer.byteLength(bytes), sha256: digest(bytes) });
    fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(updated, null, 2) + '\n');
  }
  replaceFixtureContent(second, 'README.txt', 'Historical README fixture\n');
  assert.equal(verifyPackage(second).files, 6, 'Structural verification accepts self-consistent historical text');
  assert.throws(() => verifyRuntime(second, archive), /README/);
  replaceFixtureContent(second, 'README.txt', README);
  replaceFixtureContent(second, 'BRANCH_WARS.html', Buffer.concat([sourceBytes.get('BRANCH_WARS.html'), Buffer.from('\n<!-- stale bytes -->')]));
  assert.equal(verifyPackage(second).files, 6);
  assert.throws(() => verifyRuntime(second, archive), /differs from current assembled source/);
  replaceFixtureContent(second, 'BRANCH_WARS.html', sourceBytes.get('BRANCH_WARS.html'));
  replaceFixtureContent(second, 'OPEN_LAN_GAME.bat', Buffer.concat([sourceBytes.get('OPEN_LAN_GAME.bat'), Buffer.from('\r\nrem changed fixture\r\n')]));
  assert.equal(verifyPackage(second).files, 6);
  assert.throws(() => verifyRuntime(second, archive), /runtime file differs from current source/);
  assert.throws(() => verifyRuntime(output, archive, { expectedHtmlSha256: result.portableSha256 }), /must compare assembled source/);
  assert.throws(() => verifyRuntime(output, archive, { profile: 'unknown' }), /Unknown package profile/);
  assert.throws(() => verifyRuntime(output, archive, { profile: 'rc3' }), /explicit expected HTML SHA-256/);
  assert.throws(() => verifyRuntime(output, archive, { profile: 'rc3', expectedHtmlSha256: '0'.repeat(64) }), /pinned historical HTML/);
  const frozen = path.join(gameRoot, '..', 'releases', 'v4-rc3');
  const frozenSha = digest(fs.readFileSync(path.join(frozen, 'BRANCH_WARS.html')));
  assert.equal(frozenSha, 'a3c293cfe58ac21f97df256fe28bc06e35f14f14518015d2fd2cd26479052ccf');
  const historicalReport = path.join(temporary, 'historical-runtime.json');
  const historicalCli = spawnSync(process.execPath, [path.join(gameRoot, 'tools', 'verify_v4_package.js'), frozen, archive, historicalReport,
    '--profile', 'rc3', '--expected-html-sha256', frozenSha], { encoding: 'utf8' });
  assert.equal(historicalCli.status, 0, historicalCli.stderr);
  const historical = JSON.parse(fs.readFileSync(historicalReport, 'utf8'));
  assert.equal(historical.verification, 'pinned-archive-and-runtime');assert.equal(historical.release, null);
  assert.equal(historical.sourceCompared, false);assert.equal(historical.sourceMatches, null);assert.equal(historical.expectedReadmeVerified, false);
  assert.equal(historical.runtimeFilesCompared, false);
  assert.equal(historical.pinnedHtmlSha256, frozenSha);
  assert.deepEqual(historical.checks.map(check => check.version), ['8.19', '9.33']);
  assert(historical.checks.every(check => check.rematch === undefined), 'Historical smoke must not imply current research/rematch coverage');
  assert.equal(digest(fs.readFileSync(path.join(frozen, 'BRANCH_WARS.html'))), frozenSha, 'Historical verification cannot modify its input');
  const frozenRc2 = path.join(gameRoot, '..', 'releases', 'v4'),rc2Sha = digest(fs.readFileSync(path.join(frozenRc2, 'BRANCH_WARS.html')));
  assert.throws(() => verifyRuntime(frozenRc2, archive, { profile: 'rc3', expectedHtmlSha256: rc2Sha }), /package profile version/);
  const historicalRc2 = verifyRuntime(frozenRc2, archive, { profile: 'rc2', expectedHtmlSha256: rc2Sha });
  assert.equal(historicalRc2.verification, 'pinned-archive-and-runtime');assert.equal(historicalRc2.release, null);
  assert.deepEqual(historicalRc2.checks.map(check => check.version), ['8.19', '9.32']);
  const invalidCli = spawnSync(process.execPath, [path.join(gameRoot, 'tools', 'verify_v4_package.js'), frozen, archive, path.join(temporary, 'invalid.json'), '--profile', 'rc3', '--profile', 'rc2'], { encoding: 'utf8' });
  assert.notEqual(invalidCli.status, 0);assert.match(invalidCli.stderr, /unique/);assert(!fs.existsSync(path.join(temporary, 'invalid.json')));
  console.log('Release packaging PASS: six-file allowlist, spaced output, immutable copies, deterministic manifest, no private workspace files, stale/overwrite/in-repo rejection, extra/tamper verification, packaged creation/resume and CLI verification.');
  console.log('Package runtime PASS: explicit current 8.20/9.41 and pinned rc3 profiles, legal research reload/permanence, two-vote rematch, half-ready/privacy, strict current README/source matching and evidence-scope receipts.');
} finally {
  const resolved = fs.realpathSync(temporary), tempRoot = fs.realpathSync(os.tmpdir());
  assert.equal(path.dirname(resolved), tempRoot);assert(path.basename(resolved).startsWith('branchwars-package-test-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}
