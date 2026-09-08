'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const scriptPath = path.join(root, 'tools/build_reference.js');
const source = fs.readFileSync(scriptPath, 'utf8');
const paths = ['BRANCH_WARS.html', 'tools/reference-template.md', 'docs/game-reference.md'].map(p => path.join(root, p));
const canonical = paths.map(p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'));
for (let combination = 0; combination < 8; combination++) {
  const inputs = new Map(paths.map((p, i) => [p, combination & (1 << i) ? canonical[i].replace(/\n/g, '\r\n') : canonical[i]]));
  const logs = [];
  const fakeFs = {...fs, readFileSync: (p, ...args) => inputs.has(p) ? inputs.get(p) : fs.readFileSync(p, ...args),
    writeFileSync: () => { throw Error('Freshness check must not write files'); }};
  const context = {
    require: name => name === 'fs' ? fakeFs : require(name),
    __dirname: path.join(root, 'tools'),
    console: {log: (...parts) => logs.push(parts.join(' ')), error: (...parts) => logs.push(parts.join(' '))},
    process: {argv: ['node', scriptPath, '--check'], exit: code => { throw Error('Generator exit ' + code); }}
  };
  assert.doesNotThrow(() => vm.runInNewContext(source, context), 'EOL combination ' + combination + ': ' + logs.join('; '));
  assert(logs.some(line => line.includes('is current.')));
}
console.log('Reference checks passed for all eight LF/CRLF source, template and output combinations.');
