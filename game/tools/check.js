'use strict';

// One non-interactive entry point, usable from any working directory.
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const fs=require('node:fs'),crypto=require('node:crypto');
const {createEvidence,fingerprintFiles}=require('./gate_evidence');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const fromArgs=args.filter(arg=>arg.startsWith('--from=')),shardArgs=args.filter(arg=>arg.startsWith('--shard=')),listOnly=args.includes('--list');
// --shard=k/n runs every nth fast-gate command so CI can spread the fast gate over
// parallel runners; a pull request passes only when all n shards pass. Shards are
// a CI transport for the same command list, not a smaller gate.
const shard=shardArgs.length===1?shardArgs[0].slice('--shard='.length).match(/^([1-9][0-9]*)\/([1-9][0-9]*)$/):null;
if(args.some(arg=>!['--full','--list'].includes(arg)&&!arg.startsWith('--from=')&&!arg.startsWith('--shard='))||fromArgs.length>1||fromArgs.length&&args.includes('--full')||
 shardArgs.length>1||shardArgs.length&&(!shard||Number(shard[1])>Number(shard[2])||fromArgs.length||args.includes('--full')))
 throw Error('Usage: node tools/check.js [--full | --from=tests/name.test.js | --shard=k/n] [--list]');
const commands = args.includes('--full')
  ? [['tools/build_game.js', '--check'], ['tools/build_reference.js', '--check'], ['tests/capture_baseline.js'], ['tests/release_balance.test.js', '--report']]
  : [['tools/build_game.js', '--check'], ['tests/build.test.js'], ['tools/build_reference.js', '--check'], ['tests/reference-eol.test.js'], ['tests/docs.test.js'], ['tests/architecture_scope.test.js'], ['tests/architecture.test.js'],
     ['tests/group_accounting.test.js'], ['tests/accounting_receivables.test.js'], ['tests/company_finance.test.js'], ['tests/company_bank_funding.test.js'], ['tests/corporate_income.test.js'], ['tests/group_foundation_compat.test.js'], ['tests/financial_group.test.js'], ['tests/financial_group_ui.test.js'], ['tests/group_lending_comparison.test.js'], ['tests/deposit_pricing.test.js'], ['tests/deposit_pricing_ui.test.js'], ['tests/features.test.js'], ['tests/feature_setup.test.js'], ['tests/feature_lobby.test.js'], ['tests/feature_network.test.js'], 
     ['tests/network_lifecycle.test.js'], ['tests/local_session_transition.test.js'], ['tests/strategy_release_ui.test.js'], ['tests/operations_workspace.test.js'], ['tests/game_overlay.test.js'], ['tests/decision_quote.test.js'], ['tests/initiative_feedback.test.js'], ['tests/package_release.test.js'], ['tests/paired_release_balance.test.js','--quick'],
     ['tests/project-rules.test.js'], ['tests/campaign-lifecycle.test.js'], ['tests/runtime-stages.test.js'], ['tests/behavior-golden.test.js'], ['tests/save-baseline.test.js'], ['tests/launcher-path.test.js'], ['tests/portable-launcher.test.js'], ['tests/storage_capacity.test.js','--quick'],
     ['tests/determinism.test.js'], ['tests/save_integrity.test.js'], ['tests/transport.test.js'], ['tests/multiplayer_lobby.test.js'], ['tests/specialist_workforce.test.js'], ['tests/workforce_network.test.js'], ['tests/households.test.js'], ['tests/workforce_network.test.js', '--households'], ['tests/collections.test.js'], ['tests/workforce_network.test.js', '--collections'], ['tests/segment_deposits.test.js'], ['tests/workforce_network.test.js','--segment-deposits'], ['tests/product_programs.test.js'], ['tests/product_draft.test.js'], ['tests/ai_cash_planning.test.js'], ['tests/recovery_planning.test.js'], ['tests/recovery_ui.test.js'], ['tests/github_recovery_acceptance.test.js'], ['tests/onboarding.test.js'], ['tests/onboarding_ui.test.js'], ['tests/onboarding_network.test.js'], ['tests/customer_effects.test.js'], ['tests/customer_effects_ui.test.js'], ['tests/release_balance.test.js','--relationship-offers','--attribution','--scenario','regulatory','--seeds','1','--turns','3'], ['tests/relationship_offers.test.js'], ['tests/relationship_offers_ui.test.js'], ['tests/workforce_network.test.js','--relationship-offers'], ['tests/github_resilience.test.js','--relationship-offers'], ['tests/regional_growth.test.js'], ['tests/regional_growth_ui.test.js'], ['tests/workforce_network.test.js','--regional-growth'], ['tests/github_resilience.test.js','--regional-growth'], ['tests/advertising.test.js'], ['tests/workforce_network.test.js','--advertising'], ['tests/workforce_network.test.js','--product-programs']];
if (!args.includes('--full')) commands.push(['tests/investment_trading_network.test.js','--notes']);
if (!args.includes('--full')) commands.push(['tests/partner_cards.test.js'],['tests/partner_cards.test.js','--portable'],['tests/partner_card_economics.test.js'],['tests/partner_card_economics.test.js','--portable'],['tests/bank_cards.test.js'],['tests/bank_cards.test.js','--portable'],['tests/card_capital_reserve.test.js'],['tests/card_capital_reserve.test.js','--portable']);
if (!args.includes('--full')) commands.push(...['interface_shell','interface_markets','interface_banking_group','interface_people_strategy'].flatMap(name=>[['tests/'+name+'.test.js','--source'],['tests/'+name+'.test.js','--portable']]));
if (!args.includes('--full')) commands.push(['tests/company_agency_boundary.test.js'],
  ['tests/agency.test.js'], ['tests/agency_ui.test.js'], ['tests/agency_legacy_compat.test.js'], ['tests/agency_peer_compat.test.js']);
if (!args.includes('--full')) commands.push(['tests/accounting_payables.test.js'],
  ['tests/facility_network.test.js'], ['tests/facilities_integration.test.js'], ['tests/facility_ui.test.js'], ['tests/facility_ai_conflicts.test.js'],
  ['tests/departments.test.js'], ['tests/department_expanded_acceptance.test.js'], ['tests/departments_integration.test.js'], ['tests/department_ui.test.js'], ['tests/department_workforce_ui.test.js'], ['tests/department_execution.test.js'], ['tests/balance_sheet_ui.test.js'],
  ['tests/department_ai_affordability.test.js'], ['tests/department_obligations.test.js'], ['tests/department_obligations_ui.test.js'],
  ['tests/institution_legacy_compat.test.js'], ['tests/institution_network.test.js'],
  ['tests/facility_catalog.test.js','--integrated'], ['tests/facility_lifecycle_legacy_compat.test.js'],
  ['tests/facility_lifecycle_integration.test.js'], ['tests/facility_lifecycle_quotes.test.js'], ['tests/facility_conversion_lifecycle.test.js'], ['tests/facility_hub_transitions.test.js'], ['tests/facility_lifecycle_network.test.js'], ['tests/facility_lifecycle_ui.test.js'], ['tests/facility_submission.test.js']);
if (!args.includes('--full')) commands.push(...[
'integrated_campaign_recovery.test.js',
'integrated_staffing.test.js',
'advertising_controls.test.js',
'advertising_integrated.test.js',
'market_workspace.test.js',
'commercial_locations_ui.test.js',
'commercial_accounts.test.js',
'facility_extensions.test.js',
'facility_extensions_ui.test.js',
'facility_extensions_network.test.js',
'commercial_accounts_ui.test.js',
'commercial_accounts_network.test.js',
'commercial_ending_integrity.test.js',
'pricing_terminal_boundary.test.js',
'pricing_captured_boundary.test.js',
'investment_institution.test.js',
'investment_clients.test.js',
'investment_closure.test.js',
'investment_corporate_market.test.js',
'investment_bank_funding.test.js',
'investment_campaign.test.js',
'investment_assets.test.js',
'investment_cash.test.js',
'investment_cash_routes.test.js',
'investment_sweeps.test.js',
'investment_choice.test.js',
'investment_income.test.js',
'investment_suitability.test.js',
'investment_trading.test.js',
'investment_trading_network.test.js',
'investment_notes.test.js',
'investment_notes_campaign.test.js',
'expanded_edition.test.js',
'expanded_edition_network.test.js',
'credit_products.test.js',
'credit_products_ui.test.js',
'credit_planning_ui.test.js',
'research_delivery_expanded.test.js',
'company_credit.test.js',
'company_credit_boundary.test.js',
'company_credit_ui.test.js',
'company_credit_trading.test.js',
'company_credit_bank.test.js',
'company_credit_orders.test.js',
'company_credit_forecast.test.js',
'company_credit_locations.test.js',
'company_credit_campaign.test.js',
'company_credit_strategy.test.js',
'company_credit_network.test.js',
'investment_strategy.test.js',
'company_auction_kernel.test.js',
'company_shares.test.js',
'company_shares_ui.test.js',
'company_shares_network.test.js',
'company_strategy.test.js',
'company_control.test.js',
'company_control_campaign.test.js',
'company_control_network.test.js',
'company_control_ui.test.js',
'company_consolidation.test.js',
'company_consolidation_ui.test.js',
'company_control_strategy.test.js',
'company_consolidation_legacy.test.js',
'investment_network.test.js',
'investment_cash_network.test.js',
'investment_ui.test.js',
'commercial_accounts_legacy.test.js',
'construction_locations.test.js',
'opportunity_workspace.test.js',
'commercial_opportunity.test.js',
'service_workspace.test.js',
'group_workspace.test.js',
'agency_professionals.test.js',
'agency_professionals_ui.test.js',
'agency_professionals_network.test.js',
'agency_professionals_legacy.test.js',
'agency_professionals_balance.test.js',
'object_workspaces.test.js',
'project_reentry_quote.test.js',
'usability_forms.test.js',
'usability_plan_review.test.js',
'usability_changes.test.js',
'usability_people.test.js',
'usability_people_workflows.test.js',
'people_object_workspaces.test.js',
'product_workspace.test.js',
'strategy_workspace.test.js',
'usability_navigation.test.js',
'usability_bank_overview.test.js',
'usability_help.test.js',
'usability_engine_boundary.test.js',
'v31_facility_conflicts.test.js',
'v31_training_deferral.test.js',
'v31_execution_reserve.test.js',
'v31_final_results.test.js',
'v31_version_boundary.test.js','v31_funded_origination.test.js','v31_circulation.test.js','v31_recruitment.test.js','v31_staffing_recovery.test.js','v31_staffing_priority.test.js','v31_facility_planning.test.js','v31_facility_investment.test.js','v31_facility_cash.test.js','v31_budget_ui.test.js','v31_forecast_copy.test.js','v31_stability_ui.test.js','v31_staffing_network.test.js','v31_adversarial_network.test.js',
  'department_functions.test.js','department_provider.test.js','department_function_context.test.js',
  'department_dispatch.test.js','department_delivery.test.js','department_functions_ui.test.js',
  'department_functions_live_ui.test.js','earnings_bridge.test.js','earnings_bridge_expanded.test.js','department_ai_lending.test.js','facility_staff_planning.test.js','doctrine_resume.test.js','department_planning_contract.test.js','department_runtime.test.js',
  'department_group5_compat.test.js','department_functions_network.test.js',
  'department_customer_capacity.test.js','department_customer_capacity_ui.test.js','department_staffing_network.test.js',
  'department_captured_replay.test.js','department_storage_capacity.test.js','department_storage_recovery.test.js','department_long_storage.test.js'
].map(file=>['tests/'+file]));
if(!args.includes('--full'))commands.push(['tests/commercial_accounts_legacy.test.js','--accounts']);
commands.push(['tests/company_control_network.test.js','--consolidation']);
commands.push(['tests/company_control_network.test.js','--strategy'],['tests/company_consolidation_legacy.test.js','--consolidation']);
commands.push(['tests/shared_premises.test.js'],['tests/shared_premises_boundary.test.js']);
commands.push(['tests/shared_premises_delivery.test.js']);
commands.push(['tests/shared_premises_agency.test.js']);
commands.push(['tests/shared_premises_campaign.test.js']);
commands.push(['tests/shared_premises_network.test.js']);
commands.push(['tests/shared_premises_ui.test.js']);
commands.push(['tests/shared_premises_strategy.test.js']);
commands.push(['tests/legacy_services_ui.test.js'],['tests/funding_movement_ui.test.js'],['tests/income_review.test.js'],['tests/income_review_ui.test.js'],['tests/income_history.test.js'],['tests/income_history_network.test.js']);
commands.push(['tests/commercial_fee_economics.test.js']);
commands.push(['tests/credit_workload.test.js']);
commands.push(['tests/credit_investment_staffing.test.js']);
commands.push(['tests/income_statement.test.js']);
commands.push(['tests/bank_economics.test.js']);
commands.push(['tests/bank_economics_ui.test.js']);
commands.push(['tests/commercial_workload_shared.test.js']);
commands.push(['tests/core_balance_sheet.test.js'],['tests/core_balance_sheet_ui.test.js']);
commands.push(['tests/income_history_network.test.js','--core-balance']);
commands.push(['tests/income_history_network.test.js','--bank-economics']);
commands.push(['tests/income_history_network.test.js','--credit-workload']);
commands.push(['tests/income_history_network.test.js','--commercial']);
commands.push(['tests/income_banking_trial.test.js']);
commands.push(['tests/gate_evidence.test.js']);
commands.push(['tests/v4_workflow_stabilization.test.js','--portable']);
commands.push(['tests/workspace_ownership.test.js','--portable'],['tests/stabilization_banking_trial.test.js']);
commands.push(['tests/bank_rivalry.test.js'],['tests/income_history_network.test.js','--bank-rivalry']);
commands.push(['tests/research_program.test.js'],['tests/research_bot.test.js'],['tests/research_program_ui.test.js']);
commands.push(['tests/balance_sheet_lending.test.js']);
commands.push(['tests/forecast_drivers.test.js']);
commands.push(['tests/lobby_resume_network.test.js']);
for(const name of ['monetary_policy','monetary_policy_ui','monetary_policy_network']){
 commands.push(['tests/'+name+'.test.js']);commands.push(['tests/'+name+'.test.js','--portable']);
}
for(const name of ['expanded_business','brand_campaigns','brand_campaigns_ui','holding_capital','digital_commercial','outside_funding']){
 commands.push(['tests/'+name+'.test.js','--source']);commands.push(['tests/'+name+'.test.js','--portable']);
}
if(!args.includes('--full'))commands.push(...['announcements','bank_logos','bank_logo_uploads','banking_navigation','market_office_context'].map(name=>['tests/'+name+'.test.js','--portable']));
const from=fromArgs[0]?.slice('--from='.length),start=from===undefined?0:commands.findIndex(command=>command[0]===from);
if(start<0)throw Error('Unknown resume point: '+from);
// Every shard first proves the portable build matches source; the rest are dealt
// round-robin so each shard gets a similar mix of short and long checks.
const [shardIndex,shardCount]=shard?[Number(shard[1]),Number(shard[2])]:[1,1];
const selected=shard?[commands[0],...commands.slice(1).filter((_,i)=>i%shardCount===shardIndex-1)]:commands.slice(start);
// One write and a plain return: process.exit() truncates piped stdout.
if(listOnly){process.stdout.write(selected.map(command=>command.join(' ')+'\n').join('')+selected.length+' of '+commands.length+' commands'+(shard?' in shard '+shardIndex+'/'+shardCount:'')+'\n');return;}
const fingerprint=()=>crypto.createHash('sha256').update(require('./build_game').assemble().html).digest('hex');
const inputEntries=['src','tests','tools','experiments','reports/reference-builds','BRANCH_WARS.html','BRANCH_WARS_LAN_SERVER.ps1','RUN_TESTS.bat','docs/game-reference.md'];
const expected=selected,before=fingerprint(),inputsBefore=fingerprintFiles(root,inputEntries),evidence=createEvidence(path.join(root,'reports','baselines'),'gate',{mode:from!==undefined?'partial':args.includes('--full')?'full':shard?'fast-shard':'fast',from,shard:shard?shardIndex+'/'+shardCount:undefined,portableSha256:before,inputEntries,inputsSha256:inputsBefore,commands:expected});
let completed=0,gateFinished=false;
console.log('Durable gate output: '+evidence.log);
process.on('exit',exitCode=>{if(!gateFinished)evidence.finish({passed:false,incomplete:completed<expected.length,exitCode,completed,expected:expected.length});});
if(from!==undefined)console.log('Partial diagnostic resume from '+from+'. Earlier checks are not rerun; this is not a complete gate.');
for (const command of expected) {
  console.log('Checking ' + command.join(' '));
  evidence.append('command-started',{command});
  fs.writeSync(evidence.logFd,'\nChecking '+command.join(' ')+'\n');
  const outputStart=fs.fstatSync(evidence.logFd).size;
  const result = spawnSync(process.execPath, command, {cwd: root, stdio: ['ignore',evidence.logFd,evidence.logFd], windowsHide: true});
  completed++;evidence.append('command-finished',{command,exitCode:result.status,signal:result.signal,error:result.error?.message||null});
  if (result.error) throw result.error;
  if (result.status !== 0) {
    // Command output goes only to the durable log; CI shows only this console,
    // so repeat the failing command's own tail here or the failure is unreadable.
    const size=fs.fstatSync(evidence.logFd).size,length=Math.min(size-outputStart,64*1024),tail=Buffer.alloc(Math.max(0,length));
    if(length>0)fs.readSync(fs.openSync(evidence.log,'r'),tail,0,length,size-length);
    console.error('\nFAILED '+command.join(' ')+' (exit '+(result.status??result.signal)+'). Last output:\n'+tail.toString('utf8').split('\n').slice(-80).join('\n'));
    process.exit(result.status || 1);
  }
}
const after=fingerprint(),inputsAfter=fingerprintFiles(root,inputEntries),sourceUnchanged=before===after&&inputsBefore===inputsAfter;
evidence.finish({passed:sourceUnchanged,incomplete:false,completed,expected:expected.length,sourceUnchanged,portableAfterSha256:after,inputsAfterSha256:inputsAfter});gateFinished=true;
if(!sourceUnchanged)throw Error('Playable source changed during the gate; see '+evidence.summary);
console.log(from!==undefined?'Resumed checks passed (partial diagnostic run, not a complete gate).':shard?'Fast gate shard '+shardIndex+'/'+shardCount+' passed; the fast gate passes only when every shard passes.':args.includes('--full') ? 'Full checks passed.' : 'Fast checks passed (not full release acceptance).');
