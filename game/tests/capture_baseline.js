'use strict';

// N-00: read-only game inspection and reproducible regression evidence.
// Writes a new timestamped report only; never modifies the game or prior reports.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const files = ['BRANCH_WARS.html', 'BRANCH_WARS_LAN_SERVER.ps1', 'tests/engine.test.js', 'tests/accounting.test.js', 'tests/accounting_activities.test.js', 'tests/accounting_persistence.test.js', 'tests/bank_identity.test.js', 'tests/regional_pilot.test.js', 'tests/regional_operations.test.js', 'tests/market_economy.test.js', 'tests/credit_lifecycle.test.js', 'tests/funding_covenants.test.js', 'tests/deposit_products.test.js', 'tests/term_funding.test.js', 'tests/retail_lifecycle.test.js', 'tests/product_deployment.test.js', 'tests/service_contracts.test.js', 'tests/service_expansion.test.js', 'tests/service_planning.test.js', 'tests/institution_management.test.js', 'tests/relationship_operations.test.js', 'reports/reference-builds/BRANCH_WARS_institution_c1c10b4.html', 'reports/reference-builds/BRANCH_WARS_planning_0704591.html', 'tests/funding.test.js', 'tests/determinism.test.js', 'tests/ledger.test.js', 'tests/save_integrity.test.js', 'tests/transport.test.js', 'tests/github_resilience.test.js', 'tests/balance_audit.js', 'tests/lan_server.test.ps1', 'tests/capture_baseline.js'];
files.push('tests/customer_needs.test.js','reports/reference-builds/BRANCH_WARS_relationship_c0a9ee1.html','tests/customer_relationships.test.js','reports/reference-builds/BRANCH_WARS_customer_2d7bbca.html');
files.push('tests/service_workforce.test.js','reports/reference-builds/BRANCH_WARS_goodwill_0ae290e.html');
files.push('tests/docs.test.js','tools/build_reference.js','tools/reference-template.md','docs/game-reference.md');
files.push('tests/behavior-golden.test.js','tests/architecture.test.js','tests/fixtures/behavior-golden.json','tests/fixtures/override-ceilings.json','tests/fixtures/legacy-half-ready.json','tests/fixtures/pilot-half-ready.json','tests/fixtures/goodwill-half-ready.json','tools/check.js');
files.push('tests/save-baseline.test.js','tests/launcher-path.test.js','tests/fixtures/save-continuation.json');
files.push('tests/reference-eol.test.js');
files.push('tests/project-rules.test.js');
files.push('tests/campaign-lifecycle.test.js');
files.push('tests/multiplayer_lobby.test.js');
function run(label, command, args) {
  process.stdout.write(`Running ${label}...\n`);
  const start = Date.now();
  const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 600000, maxBuffer: 8 * 1024 * 1024 });
  return { label, command: [command, ...args], exitCode: r.status, signal: r.signal, error: r.error ? r.error.message : null, elapsedMs: Date.now() - start, stdout: r.stdout || '', stderr: r.stderr || '' };
}
const report = {
  package: 'N-00', createdAt: new Date().toISOString(), node: process.version, platform: process.platform,
  filesBefore: Object.fromEntries(files.map(f => [f, hash(f)])),
  head: run('git HEAD', 'git', ['rev-parse', 'HEAD']),
  statusBefore: run('git status', 'git', ['status', '--short']),
  diffStat: run('git diff stat', 'git', ['diff', '--stat']), tests: []
};
for (const file of ['engine.test.js', 'accounting.test.js', 'accounting_activities.test.js', 'accounting_persistence.test.js', 'bank_identity.test.js', 'regional_pilot.test.js', 'regional_operations.test.js', 'market_economy.test.js', 'credit_lifecycle.test.js', 'funding_covenants.test.js', 'deposit_products.test.js', 'term_funding.test.js', 'retail_lifecycle.test.js', 'product_deployment.test.js', 'service_contracts.test.js', 'service_expansion.test.js', 'service_planning.test.js', 'institution_management.test.js', 'relationship_operations.test.js', 'funding.test.js', 'determinism.test.js', 'ledger.test.js', 'save_integrity.test.js', 'transport.test.js', 'github_resilience.test.js', 'balance_audit.js', 'balance_audit.js']) {
  report.tests.push(run(file, process.execPath, [path.join('tests', file)]));
}
report.tests.push(run('service_workforce.test.js', process.execPath, ['tests/service_workforce.test.js']));
report.tests.push(run('docs.test.js', process.execPath, ['tests/docs.test.js']));
report.tests.push(run('reference-eol.test.js', process.execPath, ['tests/reference-eol.test.js']));
report.tests.push(run('project-rules.test.js', process.execPath, ['tests/project-rules.test.js']));
report.tests.push(run('campaign-lifecycle.test.js', process.execPath, ['tests/campaign-lifecycle.test.js']));
report.tests.push(run('multiplayer_lobby.test.js', process.execPath, ['tests/multiplayer_lobby.test.js']));
report.tests.push(run('architecture.test.js', process.execPath, ['tests/architecture.test.js']));
report.tests.push(run('behavior-golden.test.js', process.execPath, ['tests/behavior-golden.test.js']));
report.tests.push(run('save-baseline.test.js', process.execPath, ['tests/save-baseline.test.js']));
report.tests.push(run('launcher-path.test.js', process.execPath, ['tests/launcher-path.test.js']));
report.tests.push(run('customer_needs.test.js', process.execPath, ['tests/customer_needs.test.js']));
report.tests.push(run('Customer needs GitHub relay', process.execPath, ['tests/github_resilience.test.js', '--customer-needs']));
report.tests.push(run('customer_relationships.test.js', process.execPath, ['tests/customer_relationships.test.js']));
report.tests.push(run('Customer relationships GitHub relay', process.execPath, ['tests/github_resilience.test.js', '--customer-relationships']));
report.tests.push(run('Relationship operations GitHub relay', process.execPath, ['tests/github_resilience.test.js', '--relationships']));
report.tests.push(run('Living institution GitHub relay', process.execPath, ['tests/github_resilience.test.js', '--management']));
report.tests.push(run('legacy funding balance audit', process.execPath, ['tests/balance_audit.js', '--legacy-funding']));
if (process.platform === 'win32') report.tests.push(run('Windows LAN', 'powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'tests/lan_server.test.ps1']));
else report.lanNotRun = 'Windows acceptance suite requires Windows; not a pass.';
report.filesAfter = Object.fromEntries(files.map(f => [f, hash(f)]));
report.sourceUnchanged = JSON.stringify(report.filesBefore) === JSON.stringify(report.filesAfter);
const audits = report.tests.filter(t => t.label === 'balance_audit.js');
report.balanceOutputReproduced = audits.every(t => t.exitCode === 0) && audits[0].stdout === audits[1].stdout;
report.passed = report.tests.every(t => t.exitCode === 0 && !t.error) && report.sourceUnchanged && report.balanceOutputReproduced && !report.lanNotRun;
report.limitations = ['Passing regression suites does not certify accounting correctness or strategic balance.', 'Repeated seeded harness output does not prove saved-game RNG/replay determinism.', 'No browser or physical two-computer acceptance was performed by this runner.'];
const dir = path.join(root, 'reports', 'baselines');
fs.mkdirSync(dir, { recursive: true });
const target = path.join(dir, `N-00-${report.createdAt.replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: report.passed, sourceUnchanged: report.sourceUnchanged, balanceOutputReproduced: report.balanceOutputReproduced, report: target, tests: report.tests.map(t => ({ label: t.label, exitCode: t.exitCode, stdout: t.stdout, stderr: t.stderr })) }, null, 2));
process.exitCode = report.passed ? 0 : 1;
