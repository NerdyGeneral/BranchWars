'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {assemble, build, normalize} = require('../tools/build_game');
const root = path.resolve(__dirname, '..');
const actual = assemble();
assert.equal(actual.html, assemble().html, 'Repeated assembly must be byte-identical');
build({check: true});
assert(!/<script[^>]+src\s*=|<link[^>]+(?:rel=["']?stylesheet|href=["'][^"']+\.css)/i.test(actual.html), 'Portable game acquired external code/styles');
const engine = actual.html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const context = {console, Math, Date}; // No DOM, storage, timers, or transport globals.
vm.runInNewContext(engine, context);
const E = context.BWEngine;
const game = E.createGame({seed: 'module-boundary', created: 1, mode: 'hotseat', campaignRulesVersion: 1, managementVersion: 2, customerDemandVersion: 2});
for (const seat of [0, 1]) E.submit(game, seat, E.chooseBot(game, seat));
assert.equal(game.cycle, 2);
for (const name of actual.manifest.engine.modules) {
  const source = fs.readFileSync(path.join(root, 'src', name), 'utf8');
  assert(!/\b(?:document|localStorage|sessionStorage|fetch|XMLHttpRequest|WebSocket|RTCPeerConnection|setTimeout|setInterval)\b/.test(source), 'Browser dependency in pure engine module: ' + name);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'branchwars-build-test-'));
try {
  const sourceRoot = path.join(temp, 'src'), output = path.join(temp, 'game.html');
  fs.cpSync(path.join(root, 'src'), sourceRoot, {recursive: true});
  const source = name => path.join(sourceRoot, name);
  const manifestFile = source('manifest.json'), originalManifest = fs.readFileSync(manifestFile, 'utf8');
  const manifestCase = (change, error) => {
    const manifest = JSON.parse(originalManifest); change(manifest);
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    assert.throws(() => assemble(sourceRoot), error);
    fs.writeFileSync(manifestFile, originalManifest);
  };
  manifestCase(m => {m.version = 99;}, /manifest/);
  manifestCase(m => {m.engine.modules.push(m.engine.modules[0]);}, /Duplicate/);
  manifestCase(m => {m.engine.modules[0] = '../outside.js';}, /Invalid source path/);
  manifestCase(m => {m.engine.modules = [];}, /Empty/);
  manifestCase(m => {m.styles.pop();}, /Unfilled|Unlisted/);
  build({sourceRoot, output});
  assert.equal(fs.readFileSync(output, 'utf8'), actual.html);
  fs.appendFileSync(output, '<!-- stale edit -->');
  const stale = fs.readFileSync(output, 'utf8');
  assert.throws(() => build({sourceRoot, output, check: true}), /stale/);
  assert.equal(fs.readFileSync(output, 'utf8'), stale, 'Check mode overwrote the artifact');
  build({sourceRoot, output});
  const module = source('engine/primitives.js'), original = fs.readFileSync(module, 'utf8');
  fs.appendFileSync(module, '\n// source changed\n');
  assert.throws(() => build({sourceRoot, output, check: true}), /stale/);
  fs.writeFileSync(module, original + '\nfunction {');
  assert.throws(() => assemble(sourceRoot), SyntaxError);
  fs.writeFileSync(module, original + '\n</script>');
  assert.throws(() => assemble(sourceRoot), /Closing script/);
  fs.writeFileSync(module, original);
  const template = source('page.html'), markup = fs.readFileSync(template, 'utf8');
  fs.appendFileSync(template, '/* @engine */');
  assert.throws(() => assemble(sourceRoot), /one build slot/);
  fs.writeFileSync(template, markup);
  // Every checked-out input may have CRLF; output remains canonical LF.
  for (const file of assemble(sourceRoot).files) fs.writeFileSync(file, normalize(fs.readFileSync(file, 'utf8')).replace(/\n/g, '\r\n'));
  assert.equal(assemble(sourceRoot).html, actual.html);
  fs.writeFileSync(output, actual.html.replace(/\n/g, '\r\n'));
  build({sourceRoot, output, check: true});
  fs.writeFileSync(source('forgotten.js'), '// unwired module');
  assert.throws(() => assemble(sourceRoot), /Unlisted source file/);
} finally {
  // Only this test's mkdtemp directory is removed; never the workspace/source tree.
  assert(path.dirname(temp) === os.tmpdir() && path.basename(temp).startsWith('branchwars-build-test-'));
  fs.rmSync(temp, {recursive: true, force: true});
}
console.log('Portable build passed: deterministic assembly, source/output freshness, EOL parity, module inventory, invalid-source rejection and DOM-free engine execution.');
