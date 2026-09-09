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
files.push('OPEN_BRANCH_WARS.bat','OPEN_LAN_GAME.bat','tests/portable-launcher.test.js');
files.push('tests/storage_capacity.test.js','tests/storage_recovery.js','tests/storage_guest_recovery.test.js');
files.push('tests/project-rules.test.js');
files.push('tests/campaign-lifecycle.test.js');
files.push('tests/multiplayer_lobby.test.js');
files.push('tests/network_lifecycle.test.js','tests/local_session_transition.test.js','tests/strategy_release_ui.test.js','tests/operations_workspace.test.js','tests/game_overlay.test.js','tests/decision_quote.test.js','tests/initiative_feedback.test.js','tests/paired_release_balance.test.js','tests/package_release.test.js','tools/package_release.js');
files.push('tests/features.test.js','tests/feature_setup.test.js','tests/feature_lobby.test.js','tests/feature_network.test.js','tests/modular_features.test.js');
files.push('tests/runtime-stages.test.js');
files.push('tests/recovery_planning.test.js','tests/recovery_ui.test.js','tests/github_recovery_acceptance.test.js');
files.push('tests/households.test.js');
files.push('tests/regional_growth.test.js','tests/regional_growth_ui.test.js');
files.push('tests/relationship_offers.test.js','tests/relationship_offers_ui.test.js');
files.push('tests/onboarding.test.js','tests/onboarding_ui.test.js','tests/onboarding_network.test.js');
files.push('tests/customer_effects.test.js','tests/customer_effects_ui.test.js','tests/balance-attribution.js');
files.push('tests/deposit_pricing.test.js','tests/deposit_pricing_ui.test.js','tests/deposit_pricing_balance.test.js','tests/deposit_pricing_adversarial.test.js');
files.push('tests/deposit_pricing_transitions.test.js');
files.push('tests/group_accounting.test.js','tests/financial_group.test.js','tests/financial_group_ui.test.js');
files.push('tests/company_finance.test.js');
files.push('tests/company_agency_boundary.test.js','tests/agency.test.js','tests/agency_ui.test.js','tests/agency_legacy_compat.test.js','tests/agency_peer_compat.test.js');
const institutionChecks=['accounting_payables.test.js','facility_network.test.js','facilities_integration.test.js','facility_ui.test.js','facility_ai_conflicts.test.js',
  'departments.test.js','departments_integration.test.js','department_ui.test.js','department_workforce_ui.test.js','department_execution.test.js','balance_sheet_ui.test.js','institution_legacy_compat.test.js','institution_network.test.js'];
institutionChecks.push('department_ai_affordability.test.js','department_obligations.test.js','department_obligations_ui.test.js');
institutionChecks.push('facility_lifecycle_legacy_compat.test.js','facility_lifecycle_integration.test.js','facility_conversion_lifecycle.test.js','facility_hub_transitions.test.js','facility_lifecycle_network.test.js','facility_lifecycle_ui.test.js','facility_submission.test.js');
institutionChecks.push('usability_plan_review.test.js','usability_changes.test.js','usability_people.test.js','usability_people_workflows.test.js','usability_navigation.test.js','usability_engine_boundary.test.js');
files.push(...institutionChecks.map(f=>'tests/'+f),'reports/reference-builds/BRANCH_WARS_agency_group3_c3af45b3.html');
const functionChecks=['usability_forms.test.js','v31_version_boundary.test.js','v31_funded_origination.test.js','v31_circulation.test.js','v31_recruitment.test.js','v31_staffing_recovery.test.js','v31_staffing_priority.test.js','v31_facility_planning.test.js','v31_facility_investment.test.js','v31_facility_cash.test.js','v31_budget_ui.test.js','v31_forecast_copy.test.js','v31_stability_ui.test.js','v31_staffing_network.test.js','v31_adversarial_network.test.js','department_functions.test.js','department_provider.test.js','department_function_context.test.js',
  'department_dispatch.test.js','department_delivery.test.js','department_functions_ui.test.js',
  'department_functions_live_ui.test.js','earnings_bridge.test.js','department_ai_lending.test.js','facility_staff_planning.test.js','doctrine_resume.test.js','department_planning_contract.test.js','department_runtime.test.js',
  'department_group5_compat.test.js','department_functions_network.test.js',
  'department_customer_capacity.test.js','department_customer_capacity_ui.test.js','department_staffing_network.test.js',
  'department_captured_replay.test.js','department_storage_capacity.test.js','department_storage_recovery.test.js','department_long_storage.test.js'];
institutionChecks.push(...functionChecks);
institutionChecks.push('v31_facility_conflicts.test.js');
institutionChecks.push('v31_training_deferral.test.js');
institutionChecks.push('v31_execution_reserve.test.js');
institutionChecks.push('v31_final_results.test.js');
files.push('tests/v31_final_results.test.js');
files.push('tests/v31_execution_reserve.test.js','tests/fixtures/v31-group7-balanced317.json.gz');
files.push('tests/v31_training_deferral.test.js','tests/fixtures/v31-group7-growth283.json.gz');
files.push('tests/v31_facility_conflicts.test.js','tests/fixtures/v31-group7-regulatory91.json.gz');
files.push(...functionChecks.map(f=>'tests/'+f),'reports/reference-builds/BRANCH_WARS_facility_group5_ba759abc.html',
  'experiments/institution/department-functions-ui.js');
files.push('tests/fixtures/department-matrix192-second.json.gz',
  'tests/fixtures/v31-v3-balanced120.json.gz',
  'tests/fixtures/v31-group7-growth24.json.gz',
  'tests/fixtures/v31-group7-staffing120.json.gz',
  'tests/fixtures/v31-group7-regulatory57.json.gz',
  'reports/reference-builds/BRANCH_WARS_departments_group6_57cc519e.html','tools/package_department_fixture.js');
files.push('tests/fixtures/department-captured-regressions.json.gz','tools/package_department_regressions.js');
files.push('tests/fixtures/department-regulatory480.json.gz','tools/package_department_long_fixture.js');
files.push('experiments/institution/department-ai-affordability.patch','experiments/institution/department-mandatory-obligations.patch','experiments/institution/patch-engine.cjs');
files.push('experiments/institution/department-obligations-ui.patch','tests/facility_catalog.test.js','reports/reference-builds/BRANCH_WARS_institution_group4_7cd113e1.html');
files.push('tests/facility_lifecycle_balance.test.js','tools/institution_qa_fixture.js');
files.push('tests/accounting_receivables.test.js');
files.push('tests/company_bank_funding.test.js','tests/corporate_income.test.js');
files.push('tests/group_foundation_compat.test.js','reports/reference-builds/BRANCH_WARS_group_822b386.html');
files.push('tests/group_lending_comparison.test.js','tests/financial_group_balance.test.js','tests/group_planning_candidate.js');
files.push('tests/advertising.test.js','tests/ai_cash_planning.test.js','tests/product_draft.test.js','tests/collections.test.js','tests/segment_deposits.test.js','tests/product_programs.test.js');
files.push('tests/specialist_workforce.test.js','tests/workforce_network.test.js','tests/release_balance.test.js');
files.push('tools/build_game.js','tests/build.test.js');
files.push(...require('../tools/build_game').assemble().files.map(file => path.relative(root, file).replace(/\\/g, '/')));
function run(label, command, args) {
  // Trust only this already selected checkout for this invocation. Never edit
  // global Git configuration merely to capture metadata under a Windows user
  // different from the account that created the workspace.
  if(command==='git')args=['-c','safe.directory='+path.resolve(root,'..').replace(/\\/g,'/'),...args];
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
for(const file of institutionChecks)report.tests.push(run(file,process.execPath,['tests/'+file]));
report.tests.push(run('facility_catalog.test.js integrated',process.execPath,['tests/facility_catalog.test.js','--integrated']));
report.tests.push(run('docs.test.js', process.execPath, ['tests/docs.test.js']));
for (const file of ['network_lifecycle.test.js','local_session_transition.test.js','strategy_release_ui.test.js','operations_workspace.test.js','game_overlay.test.js','decision_quote.test.js','initiative_feedback.test.js','package_release.test.js','portable-launcher.test.js','storage_capacity.test.js','storage_guest_recovery.test.js'])
  report.tests.push(run(file, process.execPath, ['tests/'+file]));
report.tests.push(run('Paired controller balance smoke',process.execPath,['tests/paired_release_balance.test.js','--quick']));
report.tests.push(run('reference-eol.test.js', process.execPath, ['tests/reference-eol.test.js']));
report.tests.push(run('project-rules.test.js', process.execPath, ['tests/project-rules.test.js']));
report.tests.push(run('campaign-lifecycle.test.js', process.execPath, ['tests/campaign-lifecycle.test.js']));
report.tests.push(run('multiplayer_lobby.test.js', process.execPath, ['tests/multiplayer_lobby.test.js']));
for(const file of ['features.test.js','feature_setup.test.js','feature_lobby.test.js','feature_network.test.js','modular_features.test.js'])
  report.tests.push(run(file, process.execPath, ['tests/'+file]));
report.tests.push(run('runtime-stages.test.js', process.execPath, ['tests/runtime-stages.test.js']));
report.tests.push(run('households.test.js', process.execPath, ['tests/households.test.js']));
report.tests.push(run('Regional demand rules', process.execPath, ['tests/regional_growth.test.js']));
report.tests.push(run('Existing-customer offers', process.execPath, ['tests/relationship_offers.test.js']));
report.tests.push(run('Existing-customer offers UI', process.execPath, ['tests/relationship_offers_ui.test.js']));
report.tests.push(run('Application pipeline', process.execPath, ['tests/onboarding.test.js']));
report.tests.push(run('Application pipeline UI', process.execPath, ['tests/onboarding_ui.test.js']));
report.tests.push(run('Application pipeline network', process.execPath, ['tests/onboarding_network.test.js']));
report.tests.push(run('Customer effects comparison', process.execPath, ['tests/customer_effects.test.js']));
report.tests.push(run('Customer effects UI', process.execPath, ['tests/customer_effects_ui.test.js']));
report.tests.push(run('Balance attribution invariants', process.execPath, ['tests/release_balance.test.js','--relationship-offers','--attribution','--scenario','regulatory','--seeds','1','--turns','3']));
report.tests.push(run('Existing-customer offers network', process.execPath, ['tests/workforce_network.test.js','--relationship-offers']));
report.tests.push(run('Existing-customer offers GitHub relay', process.execPath, ['tests/github_resilience.test.js','--relationship-offers']));
report.tests.push(run('Regional demand UI', process.execPath, ['tests/regional_growth_ui.test.js']));
report.tests.push(run('Regional demand network', process.execPath, ['tests/workforce_network.test.js','--regional-growth']));
report.tests.push(run('Regional demand GitHub relay', process.execPath, ['tests/github_resilience.test.js','--regional-growth']));
report.tests.push(run('segment_deposits.test.js', process.execPath, ['tests/segment_deposits.test.js']));
report.tests.push(run('Advertising rules', process.execPath, ['tests/advertising.test.js']));
report.tests.push(run('AI cash planning', process.execPath, ['tests/ai_cash_planning.test.js']));
report.tests.push(run('Bank recovery planning', process.execPath, ['tests/recovery_planning.test.js']));
report.tests.push(run('Bank recovery UI', process.execPath, ['tests/recovery_ui.test.js']));
report.tests.push(run('GitHub checkpoint recovery acceptance', process.execPath, ['tests/github_recovery_acceptance.test.js']));
report.tests.push(run('Product draft repair', process.execPath, ['tests/product_draft.test.js']));
report.tests.push(run('Advertising network', process.execPath, ['tests/workforce_network.test.js','--advertising']));
report.tests.push(run('Advertising GitHub relay', process.execPath, ['tests/github_resilience.test.js','--advertising']));
report.tests.push(run('product_programs.test.js', process.execPath, ['tests/product_programs.test.js']));
report.tests.push(run('deposit_pricing.test.js', process.execPath, ['tests/deposit_pricing.test.js']));
report.tests.push(run('deposit_pricing_ui.test.js', process.execPath, ['tests/deposit_pricing_ui.test.js']));
report.tests.push(run('Pricing boundary books', process.execPath, ['tests/deposit_pricing_adversarial.test.js']));
report.tests.push(run('Pricing contract transitions', process.execPath, ['tests/deposit_pricing_transitions.test.js']));
report.tests.push(run('Group entity accounting', process.execPath, ['tests/group_accounting.test.js']));
report.tests.push(run('Explicit bank receivables', process.execPath, ['tests/accounting_receivables.test.js']));
report.tests.push(run('Corporate finance kernel', process.execPath, ['tests/company_finance.test.js']));
report.tests.push(run('Agency corporate payment boundary', process.execPath, ['tests/company_agency_boundary.test.js']));
report.tests.push(run('Agency operating business', process.execPath, ['tests/agency.test.js']));
report.tests.push(run('Agency controls and privacy', process.execPath, ['tests/agency_ui.test.js']));
report.tests.push(run('Agency legacy exact compatibility', process.execPath, ['tests/agency_legacy_compat.test.js']));
report.tests.push(run('Agency actual V2 peer compatibility', process.execPath, ['tests/agency_peer_compat.test.js']));
report.tests.push(run('Company bank funding boundary', process.execPath, ['tests/company_bank_funding.test.js']));
report.tests.push(run('Live corporate banking', process.execPath, ['tests/corporate_income.test.js']));
report.tests.push(run('Preserved group foundation', process.execPath, ['tests/group_foundation_compat.test.js']));
report.tests.push(run('Group capital and simultaneous lending', process.execPath, ['tests/financial_group.test.js']));
report.tests.push(run('Group capital UI', process.execPath, ['tests/financial_group_ui.test.js']));
report.tests.push(run('Group lending comparison', process.execPath, ['tests/group_lending_comparison.test.js']));
report.tests.push(run('Group four-scenario smoke', process.execPath, ['tests/financial_group_balance.test.js','--quick']));
report.tests.push(run('Pricing nine-profile smoke', process.execPath, ['tests/deposit_pricing_balance.test.js','--quick']));
report.tests.push(run('Product programmes network', process.execPath, ['tests/workforce_network.test.js','--product-programs']));
report.tests.push(run('Product programmes GitHub relay', process.execPath, ['tests/github_resilience.test.js','--product-programs']));
report.tests.push(run('Segment deposits network', process.execPath, ['tests/workforce_network.test.js','--segment-deposits']));
report.tests.push(run('Segment deposits GitHub relay', process.execPath, ['tests/github_resilience.test.js','--segment-deposits']));
report.tests.push(run('collections.test.js', process.execPath, ['tests/collections.test.js']));
report.tests.push(run('Collections network', process.execPath, ['tests/workforce_network.test.js', '--collections']));
report.tests.push(run('Collections GitHub relay', process.execPath, ['tests/github_resilience.test.js', '--collections']));
report.tests.push(run('Household network', process.execPath, ['tests/workforce_network.test.js', '--households']));
report.tests.push(run('Household GitHub relay', process.execPath, ['tests/github_resilience.test.js', '--households']));
report.tests.push(run('specialist_workforce.test.js', process.execPath, ['tests/specialist_workforce.test.js']));
report.tests.push(run('workforce_network.test.js', process.execPath, ['tests/workforce_network.test.js']));
report.tests.push(run('Specialist workforce GitHub relay', process.execPath, ['tests/github_resilience.test.js', '--workforce']));
report.tests.push(run('build.test.js', process.execPath, ['tests/build.test.js']));
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
report.gitMetadataCaptured = [report.head,report.statusBefore,report.diffStat].every(t=>t.exitCode===0&&!t.error);
report.passed = report.tests.every(t => t.exitCode === 0 && !t.error) && report.sourceUnchanged && report.balanceOutputReproduced && report.gitMetadataCaptured && !report.lanNotRun;
report.limitations = ['Passing regression suites does not certify accounting correctness or strategic balance.', 'Repeated seeded harness output does not prove saved-game RNG/replay determinism.', 'No browser or physical two-computer acceptance was performed by this runner.'];
const dir = path.join(root, 'reports', 'baselines');
fs.mkdirSync(dir, { recursive: true });
const target = path.join(dir, `N-00-${report.createdAt.replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: report.passed, sourceUnchanged: report.sourceUnchanged, balanceOutputReproduced: report.balanceOutputReproduced, report: target, tests: report.tests.map(t => ({ label: t.label, exitCode: t.exitCode, stdout: t.stdout, stderr: t.stderr })) }, null, 2));
process.exitCode = report.passed ? 0 : 1;
