'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'BRANCH_WARS.html'), 'utf8');
const engine = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const file = path.join(__dirname, 'fixtures', 'override-ceilings.json');
function counts(text) {
  // Conservative source smoke check, not a JavaScript parser. Detect assignments
  // (including arrow replacements) to names declared with function syntax.
  // Data-member writes such as player.stats are not assignments to the stats
  // function. Keep counting replacements on the exported engine API.
  const names = [...new Set([...text.matchAll(/\bfunction\s+([\w$]+)\s*\(/g)].map(m => m[1]))].sort();
  return Object.fromEntries(names.map(name => [name,
    [...text.matchAll(new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\s*=(?!=|>)', 'g'))]
      .filter(match => {
        const prefix = text.slice(0, match.index).trimEnd();
        return !prefix.endsWith('.') || /root\.BWEngine\.$/.test(prefix);
      }).length
  ]).filter(([, count]) => count));
}
const current = counts(engine);
if (process.argv.includes('--capture-ceilings')) {
  assert(!fs.existsSync(file), 'Do not overwrite the debt ceiling; ratchet individual counts down after a refactor.');
  fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
  console.log('Captured current override debt; this is not architectural approval.');
  process.exit(0);
}
assert.equal(process.argv.length, 2, 'Unknown architecture-check argument');
const ceiling = JSON.parse(fs.readFileSync(file, 'utf8'));
function check(actual) {
  for (const [name, count] of Object.entries(actual)) {
    assert(count <= (ceiling[name] || 0), 'New engine override for ' + name + ': ' + count + ' > ' + (ceiling[name] || 0));
  }
}
check(current);
assert.throws(() => check(counts(engine + '\noperate = function () {};')), /override/);
assert.throws(() => check(counts(engine + '\nroot.BWEngine.operate = function () {};')), /override/);
assert.throws(() => check(counts(engine + '\nfunction freshRule() {} freshRule = () => 1;')), /override/);
assert.equal(counts(engine + '\nplayer.operate = function () {};').operate, current.operate,
  'Member assignments must not masquerade as runtime function overrides');
for (const script of html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
for (const launcher of ['OPEN_BRANCH_WARS.bat', 'OPEN_LAN_GAME.bat']) {
  const wrapper = fs.readFileSync(path.join(root, '..', launcher), 'utf8');
  assert(wrapper.includes('call "%~dp0game\\' + launcher + '"'), 'Root launcher must target the packaged launcher');
  assert(fs.existsSync(path.join(root, launcher)));
}
const workflow = fs.readFileSync(path.join(root, '../.github/workflows/checks.yml'), 'utf8');
assert(workflow.includes('contents: read'));
assert(!workflow.includes('pull_request_target'));
for (const match of workflow.matchAll(/uses: ([^\s]+)/g)) assert(/@[a-f0-9]{40}$/.test(match[1]), 'Pin action to a verified commit');
console.log('Architecture checks passed: override ceilings, gate sensitivity, script syntax, root launchers and CI safety contract.');
