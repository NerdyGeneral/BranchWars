'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'BRANCH_WARS.html'), 'utf8');
const previous = fs.readFileSync(path.join(root, 'reports/reference-builds/BRANCH_WARS_goodwill_0ae290e.html'), 'utf8');
const copy = x => JSON.parse(JSON.stringify(x));
const same = (a, b, message) => assert.deepEqual(copy(a), copy(b), message);
function load(html) {
  const c = {console};
  const script = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1]
    .replace('root.BWEngine={', 'root.BWEngine={__validatePlan:validatePlan,__validatePortfolioPlan:validatePortfolioPlan,__startProject:startProject,__projectBarred:projectBarred,');
  vm.runInNewContext(script, c);
  return c.BWEngine;
}
const E = load(source), Old = load(previous);
function plan(g, seat = 0) {
  const p = g.players[seat];
  return {...E.chooseBot(g, seat), focus: p.focus, allocation: copy(p.allocation),
    newProject: null, newProjects: [], investments: {}, hires: 0, competitiveAction: 'none',
    capitalAction: false, contractBid: null, contractExit: null, opportunity: null, decision: 'b'};
}
function validation(engine, g, p, intent) {
  const proposed = copy(intent);
  try {engine.__validatePortfolioPlan(p, proposed); engine.__validatePlan(g, p, proposed); return null;}
  catch (error) {return error.message;}
}
const profiles = [{fundingRulesVersion: 1}, {fundingRulesVersion: 2},
  {campaignRulesVersion: 1, serviceExpansionVersion: 0},
  {campaignRulesVersion: 1, managementVersion: 2, customerDemandVersion: 2}];
assert.deepEqual(Object.keys(E.PROJECTS).filter(k=>!Old.PROJECTS[k]).sort(),['licenseHighYield','licenseRewards']);
let compared = 0;
for (const [index, options] of profiles.entries()) {
  const g = E.createGame({...options, seed: 'project-rules-' + index, created: 1, mode: 'hotseat'});
  const intent = plan(g);
  const focusMarkets = Object.keys(g.territories).filter(k => g.territories[k].unlock <= g.cycle).slice(0, 2);
  for (const focus of focusMarkets) for (const variation of ['normal', 'cash', 'capital', 'board', 'capacity', 'full']) {
    const p = copy(g.players[0]);
    if (variation === 'cash') p.stats.cash = 1;
    if (variation === 'capital') p.stats.capital = 1;
    if (variation === 'board') p.capitalRestriction = 2;
    if (variation === 'capacity') p.allocation = {service: p.stats.staff, business: 0, lending: 0, operations: 0};
    if (variation === 'full') p.branches[focus] = 3;
    // Preserve the complete frozen project set. New opt-in routes have their own suite.
    for (const key of Object.keys(Old.PROJECTS)) {
      const proposed = {...copy(intent), focus, allocation: copy(p.allocation), newProject: key, newProjects: [key]};
      const owner = {...p, focus}, before = JSON.stringify({p, proposed});
      const terms = E.projectTerms(p, key, focus), status = E.projectPlanStatus(p, proposed);
      assert.equal(JSON.stringify({p, proposed}), before, 'Terms/status must be pure');
      assert.equal(terms.cost, Old.projectCost(owner, Old.PROJECTS[key]), key + ': price drift');
      assert.equal(terms.barred, Old.__projectBarred(owner, key), key + ': restriction drift');
      same(status.quote, Old.planBudget(p, proposed), key + ': budget drift');
      // Independent reference engine; do not merely compare two new implementations.
      const current = validation(E, g, copy(p), proposed), prior = validation(Old, g, copy(p), proposed);
      assert.equal(current === null, prior === null, key + ': accepted-plan set changed');
      assert.equal(status.eligible, current === null, key + ': UI/server project disagreement');
      compared++;
    }
  }
}

const g = E.createGame({campaignRulesVersion: 1, managementVersion: 2, customerDemandVersion: 2,
  seed: 'rule-edges', created: 1, mode: 'hotseat'}), p = g.players[0], base = plan(g);
// The chosen market, not the previous focus, determines branch entry pricing.
const local = {...base, focus: 'county_seat', newProject: 'branch', newProjects: ['branch']};
assert.equal(E.projectPlanStatus(p, local).quote.projects, E.projectTerms(p, 'branch', 'county_seat').cost);
assert.notEqual(E.projectTerms(p, 'branch', 'county_seat').cost, E.projectTerms(p, 'branch', 'downtown').cost);
// Inherited object keys are not legitimate project IDs and must not poison a quote.
for (const key of ['missing', 'constructor', '__proto__', 'toString']) {
  const intent = {...base, newProject: key, newProjects: [key]};
  const status = E.projectPlanStatus(p, intent);
  assert.equal(status.code, 'unknown'); assert(Number.isFinite(status.quote.total));
  assert(validation(E, g, copy(p), intent));
}
const rich = copy(p);
rich.stats.cash = 20000000; rich.stats.capital = 10000000;
rich.allocation = {service: 0, business: 0, lending: 0, operations: rich.stats.staff};
const richPlan = {...base, allocation: rich.allocation, focus: rich.focus};
assert.equal(E.projectPlanStatus(rich, {...richPlan, newProjects: ['branch', 'branchAutomation']}).code, 'office-conflict');
for (const lane of Object.keys(rich.capability)) rich.capability[lane] = E.CAPABILITY_TIERS[lane][0];
const pair = Object.keys(E.SERVICE_APPLICATIONS).filter(k => E.SERVICE_APPLICATIONS[k].app === 'treasury');
assert(pair.length >= 2);
assert.equal(E.projectPlanStatus(rich, {...richPlan, newProjects: pair.slice(0, 2)}).code, 'application-conflict');
const untrained = copy(p), rollout = E.RETAIL_DEPLOYMENTS.highYield.project;
const sameCycle = {...base, investments: {digital: E.CAPABILITY_TIERS.digital[0]}, newProjects: [rollout]};
assert.equal(E.projectPlanStatus(untrained, sameCycle).code, 'barred', 'Funding is not instant deployment eligibility');

// Execute after resource changes; keep cancellation private and uncharged.
for (const condition of ['normal', 'cash', 'capacity', 'running', 'board']) {
  const a = E.createGame({campaignRulesVersion: 1, managementVersion: 2, seed: 'start-' + condition, created: 1});
  const q = a.players[0], key = 'branch';
  if (condition === 'cash') q.stats.cash = 1;
  if (condition === 'capacity') q.allocation = {service: q.stats.staff, business: 0, lending: 0, operations: 0};
  if (condition === 'running') q.projects.push({key, target: q.focus, progress: 0, total: 3});
  if (condition === 'board') q.capitalRestriction = 2;
  const before = JSON.stringify(q), oldGame = copy(a);
  const status = E.projectStartStatus(a, q, key);
  assert.equal(JSON.stringify(q), before, 'Execution quote must be pure');
  const result = E.__startProject(a, q, key, {}), prior = Old.__startProject(oldGame, oldGame.players[0], key, {});
  assert.equal(result, prior, condition + ': public result drift');
  same(a, oldGame, condition + ': accounting/start side effects drift');
  if (!status.eligible) {assert.equal(JSON.stringify(q), before); assert(!result.includes('$'));}
}
// Public territory arrays are seat-relative; both seats must see the right exit.
for (const seat of [0, 1]) {
  const legacy = E.createGame({seed: 'exit-' + seat, created: 1});
  const who = legacy.players[seat], market = who.focus;
  legacy.territories[market].exited = [false, false]; legacy.territories[market].exited[seat] = true;
  const v = E.publicState(legacy, seat);
  assert(E.projectTargetIssue(legacy, who, E.PROJECTS.branch, market));
  assert.equal(E.projectTargetIssue(v, v.me, E.PROJECTS.branch, market),
    E.projectTargetIssue(legacy, who, E.PROJECTS.branch, market));
}

// Real UI helpers and project renderer, exercised through inert DOM sinks.
const v = E.publicState(g, 0), sinks = new Map(), callbacks = [];
const node = selector => {
  if (!sinks.has(selector)) sinks.set(selector, {innerHTML: '', textContent: '', disabled: false,
    classList: {toggle() {}}, addEventListener() {}, insertAdjacentHTML() {}});
  return sinks.get(selector);
};
const c = {E, draft: copy(base), esc: String, money: String, toast() {}, capacityLine: () => '',
  renderProjectEffect: () => '', renderCampaignBuff() {}, renderCompetitiveActions() {}, renderWorkforce() {}, renderProductPrograms() {},
  renderStaff() {}, renderPlanBudget() {}, renderOperatingPreview() {}, renderPipeline() {},
  unassigned: () => 0, planReady: () => true,
  $: node, $$: selector => selector === '[data-project]' ? [{dataset: {project: 'branch'}, addEventListener: (_, f) => callbacks.push(f)}] : []};
vm.runInNewContext(source.slice(source.indexOf('function projectChoiceStatus('), source.indexOf('function renderDetails(')) +
  ';globalThis.choice=projectChoiceStatus;globalThis.toggle=toggleInitiative;globalThis.draw=renderProjects;globalThis.ready=renderReady;', c);
c.draw(v); assert(sinks.get('#projectGrid').innerHTML.includes('data-project="branch"'));
same(c.choice(v, 'branch').quote, E.projectPlanStatus(v.me, {...base, newProjects: ['branch'], newProject: 'branch'}).quote);
c.draft.newProjects = ['branch']; c.draft.newProject = 'branch';
const poorView = {...v, me: {...v.me, stats: {...v.me.stats, cash: 0}}};
assert(c.choice(poorView, 'branch').eligible, 'An unaffordable selected project can be removed');
c.toggle('branch', poorView); assert.equal(c.draft.newProjects.length, 0);
assert(!c.choice(poorView, 'branch').eligible);
c.toggle('branch', poorView); assert.equal(c.draft.newProjects.length, 0, 'Stale click cannot add an invalid project');
const locked = {...v, me: {...v.me, submitted: true}};
c.toggle('branch', locked); assert.equal(c.draft.newProjects.length, 0);
c.draft.newProjects = ['branch', 'branchAutomation']; c.draft.newProject = 'branch';
c.ready(v); assert(node('#readyBtn').disabled); assert(node('#submitMsg').textContent.length > 0);
console.log('Shared project rules passed: ' + compared + ' independent legacy comparisons, regional quotes, forged IDs, conflicts, timing, execution accounting, seat privacy and real UI handlers.');
