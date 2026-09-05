'use strict';

// One non-interactive entry point, usable from any working directory.
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--full')) throw Error('Usage: node tools/check.js [--full]');
const commands = args.includes('--full')
  ? [['tools/build_reference.js', '--check'], ['tests/capture_baseline.js'], ['tests/release_balance.test.js', '--report']]
  : [['tools/build_reference.js', '--check'], ['tests/reference-eol.test.js'], ['tests/docs.test.js'], ['tests/architecture.test.js'],
     ['tests/project-rules.test.js'], ['tests/behavior-golden.test.js'], ['tests/save-baseline.test.js'], ['tests/launcher-path.test.js'],
     ['tests/determinism.test.js'], ['tests/save_integrity.test.js'], ['tests/transport.test.js']];
for (const command of commands) {
  console.log('Checking ' + command.join(' '));
  const result = spawnSync(process.execPath, command, {cwd: root, stdio: 'inherit', windowsHide: true});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(args.includes('--full') ? 'Full checks passed.' : 'Fast checks passed (not full release acceptance).');
