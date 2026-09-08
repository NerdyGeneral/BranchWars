'use strict';

// One non-interactive entry point, usable from any working directory.
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--full')) throw Error('Usage: node tools/check.js [--full]');
const commands = args.includes('--full')
  ? [['tools/build_game.js', '--check'], ['tools/build_reference.js', '--check'], ['tests/capture_baseline.js'], ['tests/release_balance.test.js', '--report']]
  : [['tools/build_game.js', '--check'], ['tests/build.test.js'], ['tools/build_reference.js', '--check'], ['tests/reference-eol.test.js'], ['tests/docs.test.js'], ['tests/architecture.test.js'],
     ['tests/project-rules.test.js'], ['tests/campaign-lifecycle.test.js'], ['tests/runtime-stages.test.js'], ['tests/behavior-golden.test.js'], ['tests/save-baseline.test.js'], ['tests/launcher-path.test.js'],
     ['tests/determinism.test.js'], ['tests/save_integrity.test.js'], ['tests/transport.test.js'], ['tests/multiplayer_lobby.test.js'], ['tests/specialist_workforce.test.js'], ['tests/workforce_network.test.js'], ['tests/households.test.js'], ['tests/workforce_network.test.js', '--households'], ['tests/collections.test.js'], ['tests/workforce_network.test.js', '--collections'], ['tests/segment_deposits.test.js'], ['tests/workforce_network.test.js','--segment-deposits'], ['tests/product_programs.test.js'], ['tests/product_draft.test.js'], ['tests/ai_cash_planning.test.js'], ['tests/recovery_planning.test.js'], ['tests/recovery_ui.test.js'], ['tests/github_recovery_acceptance.test.js'], ['tests/advertising.test.js'], ['tests/workforce_network.test.js','--advertising'], ['tests/workforce_network.test.js','--product-programs']];
for (const command of commands) {
  console.log('Checking ' + command.join(' '));
  const result = spawnSync(process.execPath, command, {cwd: root, stdio: 'inherit', windowsHide: true});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(args.includes('--full') ? 'Full checks passed.' : 'Fast checks passed (not full release acceptance).');
