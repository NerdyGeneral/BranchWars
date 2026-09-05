'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const copy = value => JSON.parse(JSON.stringify(value));
const same = (a, b, label) => assert.equal(JSON.stringify(a), JSON.stringify(b), label);
function runtime(file) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const source = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
  const math = Object.create(Math); math.random = () => 0.314159;
  class Clock extends Date {static now() {return 123456789;}}
  const context = {console, Math: math, Date: Clock};
  const hooks = 'root.stageTest={withRandom,resolveCycle,validatePortfolioPlan,validatePilot,' +
    'contexts:()=>({accountingSuppressed,accountingSource,marketContext,marketTarget,marketBypass,creditWorld,creditBypass,depositWorld,depositBypass,ledgerContext})};\n';
  vm.runInNewContext(source.replace('root.BWEngine={', hooks + 'root.BWEngine={'), context);
  return {E: context.BWEngine, hooks: context.stageTest};
}
const current = runtime('BRANCH_WARS.html');
// Independent, frozen implementation. Never generated from the current engine.
const old = runtime('reports/reference-builds/BRANCH_WARS_goodwill_0ae290e.html');
const options = [
  {fundingRulesVersion: 1}, {fundingRulesVersion: 2},
  {campaignRulesVersion: 1, regionalEconomyVersion: 0},
  ...['marketEconomyVersion', 'creditLifecycleVersion', 'fundingCovenantVersion',
    'depositProductsVersion', 'termFundingVersion', 'retailLifecycleVersion',
    'productDeploymentVersion', 'contractRulesVersion', 'serviceExpansionVersion'].map(key => ({campaignRulesVersion: 1, [key]: 0})),
  {campaignRulesVersion: 1}, {campaignRulesVersion: 1, managementVersion: 1},
  {campaignRulesVersion: 1, managementVersion: 2, customerDemandVersion: 1},
  {campaignRulesVersion: 1, managementVersion: 2, customerDemandVersion: 2}
];
function outcome(run) {
  try {return {result: run()};} catch (error) {return {error: error.name + ': ' + error.message};}
}
let operations = 0, projects = 0, faults = 0;
function compare(game, action, label) {
  const a = copy(game), b = copy(game);
  const first = outcome(() => current.hooks.withRandom(a, 'state', () => action(current, a)));
  const second = outcome(() => old.hooks.withRandom(b, 'state', () => action(old, b)));
  same(first, second, label + ' return/error');
  same(a, b, label + ' state/RNG/accounting');
  same(current.hooks.contexts(), old.hooks.contexts(), label + ' scope cleanup');
  assert.equal(a.players.some(p => p._customerIntake), false, 'Transient intake escaped');
}
for (const [index, setting] of options.entries()) {
  const game = old.E.createGame({seed: 700 + index, created: 1, mode: 'hotseat', ...setting});
  for (const seat of [0, 1]) for (const preview of [false, true]) for (const deposit of ['margin', 'balanced', 'aggressive']) {
    const g = copy(game), p = g.players[seat];
    p.policies.deposit = deposit; p.turnEffects = {profit: 1.17, deposit: .84, credit: 1.23};
    if (p.termFunding) {
      p.termFunding.policy = {offer: 'six', maturity: deposit === 'margin' ? 'release' : 'renew'};
      const cohort = p.depositBook.cohorts[0];
      Object.assign(cohort, {locked: true, remaining: 1, quotedCycle: 0});
    }
    compare(g, ({E}, state) => E.operate(state, state.players[seat], preview), 'Operations ' + index + '/' + seat + '/' + preview + '/' + deposit);
    operations++;
  }
  for (const key of Object.keys(old.E.PROJECTS)) for (const seat of [0, 1]) {
    compare(game, ({E}, g) => E.finishProject(g, g.players[seat], {key, target: g.players[seat].focus, specialization: 'integrator'}), 'Project ' + index + '/' + key + '/' + seat);
    projects++;
  }
  for (const mutate of [
    g => {g.players[0].policies.deposit = 'invalid';},
    g => {if (g.players[0].termFunding) g.players[0].termFunding.policy.offer = 'invalid';},
    g => {if (g.marketEconomy) {delete g.marketEconomy; delete g.players[0].marketSnapshot;}},
    g => {if (g.players[0].creditBook) g.players[0].creditBook.cohorts[0].principal = -5;}
  ]) {
    const broken = copy(game); mutate(broken);
    compare(broken, ({E}, g) => E.operate(g, g.players[0]), 'Fault cleanup ' + index);
    // A rejected action must not poison the following valid campaign's scopes.
    compare(game, ({E}, g) => E.operate(g, g.players[1]), 'After fault ' + index);
    faults++;
  }
}
console.log(`Explicit runtime stages passed: ${operations} operations, ${projects} completions, ${faults} fault/recovery pairs against the frozen implementation.`);

let intents = 0, policies = 0, saves = 0;
for (const [index, setting] of options.entries()) {
  const game = old.E.createGame({seed: 900 + index, created: 1, mode: 'hotseat', ...setting});
  for (const seat of [0, 1]) for (const stress of [false, true]) {
    const g = copy(game);
    if (stress) {g.players[seat].stats.lastProfit = -250000; g.players[seat].stats.emergencyDebt = 2000000;}
    compare(g, ({E}, state) => E.chooseBot(state, seat), 'AI preparation ' + index + '/' + seat + '/' + stress);
    intents++;
  }
  const plan = copy(old.E.chooseBot(copy(game), 0));
  for (const mutate of [
    p => {}, p => {delete p.products;}, p => {p.products = {retail: 'invalid'};},
    p => {p.retailMix = {essential: -1};}, p => {p.termPolicy = {offer: 'invalid'};},
    p => {p.servicePolicy = {staff: -1};}, p => {p.management = {research: {budget: -1}};},
    p => {p.products = null; p.specializations = null;},
    p => {delete p.retailMix; delete p.termPolicy; delete p.servicePolicy; delete p.management;},
    p => {p.retailMix = {}; p.termPolicy = {}; p.servicePolicy = {}; p.management = {};}
  ]) {
    const p = copy(plan); mutate(p);
    compare(game, ({hooks}, g) => {
      const input = copy(p), result = outcome(() => hooks.validatePortfolioPlan(g.players[0], input));
      return {result, input};
    }, 'Policy normalization ' + index);
    policies++;
  }
  // Independent feature validators must all run even when a preceding optional
  // feature is absent. Error precedence and partial normalization are contractual.
  const flags = ['campaignRulesVersion', 'regionalEconomyVersion', 'marketEconomyVersion',
    'creditLifecycleVersion', 'fundingCovenantVersion', 'depositProductsVersion',
    'termFundingVersion', 'retailLifecycleVersion', 'productDeploymentVersion',
    'contractRulesVersion', 'serviceExpansionVersion', 'managementVersion', 'customerDemandVersion'];
  for (const key of flags) for (const bad of [undefined, 99]) {
    const g = copy(game); if (bad === undefined) delete g[key]; else g[key] = bad;
    compare(g, ({hooks}, state) => hooks.validatePilot(state), 'Save validation ' + index + '/' + key + '/' + bad);
    saves++;
  }
}
console.log(`Policy/AI stages passed: ${intents} AI preparations, ${policies} policy normalizations and ${saves} save-validation comparisons; error order and state/RNG effects preserved.`);
