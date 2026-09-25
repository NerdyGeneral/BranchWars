'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(root, 'BRANCH_WARS.html'), 'utf8');
const copy = x => JSON.parse(JSON.stringify(x));
const context = { console };
const hooks = 'root.workforceTest={applyHiring,settleWorkforceTraining,settleWorkforceOperatingExpense,workforceOperatingCosts,workforceAllocation,specialistBusinessBonus,transferSpecialistTalent,reconcileSpecialistHeadcount};';
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={', hooks + 'root.BWEngine={'), context);
const E = context.BWEngine, H = context.workforceTest;
const options = { workforceVersion: 1, customerDemandVersion: 2, managementVersion: 2, campaignRulesVersion: 1, mode: 'hotseat', seed: 'specialist-workforce', created: 1 };
const fresh = extra => E.createGame({ ...options, ...extra });
function plan(p, extra = {}) {
  return { focus: p.focus, allocation: { ...p.allocation }, decision: 'b', depositPolicy: p.policies.deposit, lendingPolicy: p.policies.lending,
    capitalPolicy: p.policies.capital, products: { ...p.products }, newProjects: [], newProject: null, investments: {}, hires: 0,
    competitiveAction: 'none', opportunity: null, ...extra };
}
function turn(g, plans) {
  g.event = { ...E.EVENTS.find(e => e.key === 'quiet') };
  g.opportunities = [];
  E.submit(g, 0, plans[0]); E.submit(g, 1, plans[1]); E.validatePilot(g); E.validateLedger(g);
  for (const p of g.players) {
    E.AccountingPrototype.check(p.accounting);
    assert.equal(p.stats.capital, p.accounting.accounts.equity);
    assert.equal(p.depositBook.cohorts.reduce((n, c) => n + c.principal, 0), p.stats.deposits);
    assert.equal(p.creditBook.cohorts.reduce((n, c) => n + c.principal, 0), p.stats.loans);
  }
}
const g = fresh(), p = g.players[0];
assert.equal(g.version, '8.5'); E.validatePilot(g);
assert.equal(E.specialistPayroll(p), 0);
assert.throws(() => fresh({ workforceVersion: 2 }), /workforce version/);
assert.throws(() => fresh({ customerDemandVersion: 1 }), /requires/);
const legacy = fresh({ workforceVersion: 0 });
assert.equal(legacy.version, '8.4'); assert.equal(legacy.players[0].workforce, undefined);
assert.equal(E.migrateCampaign(legacy).players[0].workforce, undefined);
assert.throws(() => E.submit(legacy, 0, plan(legacy.players[0], { specialistHires: { service: 0 } })), /new workforce/);

// New recruits do not produce, receive premiums or train before next cycle.
const control = copy(g), policy = E.defaultWorkforcePolicy(); policy.training.service = 5000;
const hire = plan(p, { specialistHires: { service: 1 }, workforcePolicy: policy });
const quote = E.planBudget(p, hire);
assert.equal(quote.recruiting, E.hireCost(p, 1) + 30000); assert.equal(quote.basePayrollAdded, 18000); assert.equal(quote.specialistPayrollAdded, 4000);
assert.equal(quote.training, 0); assert.equal(E.planHires(hire), 1);
turn(g, [hire, plan(g.players[1])]);
turn(control, [plan(control.players[0], { hires: 1 }), plan(control.players[1])]);
assert.equal(p.stats.staff, 9); assert.equal(p.workforce.departments.service.count, 1); assert.equal(p.workforce.departments.service.skill, 20);
assert.equal(p.operatingReport.specialistPayroll, 0); assert.equal(p.operatingReport.workforceTraining, 0);
assert.equal(p.stats.capital, control.players[0].stats.capital - 30000);
assert.equal(p.operatingReport.profit, control.players[0].operatingReport.profit);
const withoutTraining = copy(g), dryPolicy = copy(policy); dryPolicy.training.service = 0;
const beforeForecast = JSON.stringify(g), beforeRandom = JSON.stringify(g.simulation);
const previewPlan = plan(p, { workforcePolicy: policy });
const forecast = E.operatingPreview(E.publicState(g, 0).me, previewPlan, g.economy);
assert.equal(JSON.stringify(g), beforeForecast); assert.equal(JSON.stringify(g.simulation), beforeRandom);
assert.equal(forecast.specialistPayroll, 4000); assert.equal(forecast.workforceTraining, 4000);
assert.equal(forecast.trainingGain_service, 4);
const review = E.workforceReview(E.publicState(g, 0).me, previewPlan, g.economy);
assert.equal(review.training.total, review.forecast.workforceTraining);
assert.equal(review.rows[0].nextSkill, p.workforce.departments.service.skill + forecast.trainingGain_service);
turn(g, [previewPlan, plan(g.players[1])]);
turn(withoutTraining, [plan(withoutTraining.players[0], { workforcePolicy: dryPolicy }), plan(withoutTraining.players[1])]);
assert.equal(p.workforce.departments.service.skill, 24);
assert.equal(p.workforce.departments.service.trainingSpend, 4000);
assert.equal(p.operatingReport.profit, withoutTraining.players[0].operatingReport.profit - 4000);
assert.equal(p.operatingReport.specialistBonus_service, .16, 'new skill is not used in the training month');
assert.equal(p.workforce.lastCycle, g.cycle - 1);
const trained = JSON.stringify(p.workforce); H.settleWorkforceTraining({ ...g, cycle: g.cycle - 1 }, p); assert.equal(JSON.stringify(p.workforce), trained);
assert(g.eventLedger.some(e => e.category === 'staff.training'));

// Department-specific benefit, capped skill, no duplicate Business capacity.
for (const role of Object.keys(E.SPECIALIST_ROLES)) {
  const bank = copy(fresh().players[0]); bank.workforce.departments[role] = { count: 1, skill: 100, trainingSpend: 0 };
  const before = JSON.stringify(bank);
  assert.equal(E.specialistBonus(bank, role), .4);
  for (const other of Object.keys(E.SPECIALIST_ROLES)) if (other !== role) assert.equal(E.specialistBonus(bank, other), 0);
  assert.equal(E.specialistBonus(bank, role, { ...bank.allocation, [role]: 0 }), 0);
  const policy = E.defaultWorkforcePolicy(); policy.training[role] = 80000;
  assert.equal(E.workforceTrainingQuote(bank, policy).total, 0);
  assert.equal(JSON.stringify(bank), before);
}
const business = copy(p); business.allocation.business = 4; business.workforce.departments.business = { count: 4, skill: 100, trainingSpend: 0 };
business.serviceDesk.policy.staff = 2;
assert.equal(H.specialistBusinessBonus(business) + H.specialistBusinessBonus(business, true), 1.6);
assert.equal(E.serviceLoad(business).capacity, 5.6);
const risk = copy(p); risk.workforce.departments.operations = { count: 1, skill: 100, trainingSpend: 0 };
assert.equal(Math.round((E.executionCapacity(risk) - E.executionCapacity(p)) * 10), 8);

// Training never liquidates assets or borrows just to meet an elective budget.
const paused = copy(g), pausedPolicy = copy(policy); pausedPolicy.reserve = 10000000;
const initialSkill = paused.players[0].workforce.departments.service.skill;
turn(paused, [plan(paused.players[0], { workforcePolicy: pausedPolicy }), plan(paused.players[1])]);
assert.equal(paused.players[0].operatingReport.workforceTraining, 0);
assert.equal(paused.players[0].operatingReport.workforceTrainingPaused, 1);
assert.equal(paused.players[0].workforce.departments.service.skill, initialSkill);
assert(paused.resolution.some(x => /paused department training/.test(x)));
const pausedReview = E.workforceReview(E.publicState(g, 0).me, plan(p, { workforcePolicy: pausedPolicy }), g.economy);
assert.equal(pausedReview.training.total, 0); assert.equal(pausedReview.rows[0].nextSkill, p.workforce.departments.service.skill);
// Production depleted cash after the opening reservation: no elective deficit.
const late = copy(p);
late._workforceCosts = H.workforceOperatingCosts(late);
assert.equal(late._workforceCosts.training.total, 4000);
late.stats.cash = late.workforce.policy.reserve + 5000;
const lateReport = { profit: -3000, expense: 3000 };
H.settleWorkforceOperatingExpense(late, lateReport);
assert.equal(lateReport.workforceTraining, 0); assert.equal(lateReport.workforceTrainingPaused, 1);
assert.equal(lateReport.profit, -3000); assert.equal(lateReport.expense, 3000);
const mixedPlan = plan(p, { hires: 1, specialistHires: { service: 2 } });
const serviceOptions = E.serviceWorkforceOptions(E.publicState(g, 0).me, mixedPlan, g.economy);
assert.equal(serviceOptions.hiring.total, 4, 'service recruiting adds exactly one generalist to the combined draft');
assert.equal(serviceOptions.hiring.incrementalCost, E.hireCost(p, 4) - E.hireCost(p, 3));
assert.equal(serviceOptions.hiring.basePayrollAdded, 18000);
assert(E.serviceWorkforceOptions(E.publicState(g, 0).me, plan(p, { specialistHires: { service: 6 } }), g.economy).hiring.blocked);
const combined = plan(p, { hires: 5, specialistHires: { operations: 2 } });
assert.throws(() => E.submit(copy(g), 0, combined), /six-banker/);
for (const orders of [{ service: -1 }, { service: 1.5 }, { service: '1' }, { fake: 1 }, [1], { service: Infinity }]) {
  assert.throws(() => E.normalizeWorkforcePlan(p, plan(p, { specialistHires: orders })), /whole specialist/);
}
for (const n of [-1, 3000, NaN, Infinity]) {
  const invalid = copy(policy); invalid.training.service = n;
  assert.throws(() => E.normalizeWorkforcePlan(p, plan(p, { workforcePolicy: invalid })), /training ceilings/);
}
const broke = fresh(), poor = broke.players[0];
poor.stats.cash = 1; poor.accounting.accounts.cash = 1; // direct hiring boundary, not a saved campaign
const cash = poor.stats.cash, staff = poor.stats.staff;
assert.match(H.applyHiring(broke, poor, 1, { service: 1 }), /cancelled hiring/);
assert.equal(poor.stats.cash, cash); assert.equal(poor.stats.staff, staff); assert.equal(poor.workforce.departments.service.count, 0);

// Headcount changes cannot duplicate or retain nonexistent expertise.
const donor = fresh().players[0], recipient = fresh().players[1];
donor.workforce.departments.service = { count: 8, skill: 60, trainingSpend: 0 };
H.transferSpecialistTalent(donor, recipient); donor.stats.staff--; recipient.stats.staff++;
E.normalizeAllocation(donor); E.normalizeAllocation(recipient);
assert.equal(donor.workforce.departments.service.count, 7); assert.equal(recipient.workforce.departments.service.count, 1);
assert.equal(recipient.workforce.departments.service.skill, 60);
donor.stats.staff = 0; E.normalizeAllocation(donor);
assert.equal(donor.workforce.departments.service.count, 0); assert.equal(donor.workforce.departments.service.skill, 0);

// Owner-only policy/skills, including last-cycle plans; view edits never touch state.
const pub = E.publicState(g, 0);
assert.equal(pub.rival.workforce, undefined);
assert.equal(pub.lastPlans[g.players[1].id].workforcePolicy, undefined);
assert.equal(pub.lastPlans[g.players[1].id].specialistHires, undefined);
pub.me.workforce.departments.service.skill = 0;
assert.equal(p.workforce.departments.service.skill, 24);
const half = copy(g), first = plan(half.players[0]); delete first.hires; E.submit(half, 0, first);
assert.equal(half.players[0].submitted.hires, 0, 'omitted recruiting persists as an explicit zero in a sealed plan');
const restored = E.migrateCampaign(half), second = plan(half.players[1]);
E.submit(half, 1, copy(second)); E.submit(restored, 1, copy(second));
const normalized = x => { const n = copy(x); delete n.ledgerVersion; n.players.forEach(p => delete p.strategy); return n; };
assert.deepEqual(normalized(restored), normalized(half));
for (const damage of [x => delete x.players[0].workforce, x => x.workforceVersion = 2, x => x.version = '8.4', x => x.players[0].workforce.departments.service.count = 999,
  x => x.players[0].workforce.departments.service.skill = 101, x => x.players[0].workforce.policy.training.service = 3000, x => x.players[0]._workforceCosts = {},
  x => x.players[0].workforce.departments.extra = {}, x => x.players[0].workforce.lastCycle = 999,
  x => delete x.players[0].operatingReport.specialistPayroll, x => x.players[0].operatingReport.trainingGain_service = Infinity,
  x => x.players[0].operatingReport.trainingSpend_service++]) {
  const invalid = copy(g); damage(invalid); const before = JSON.stringify(invalid);
  assert.throws(() => E.migrateCampaign(invalid)); assert.equal(JSON.stringify(invalid), before);
}
const rematch = copy(g); rematch.gameOver = true; E.rematch(rematch, 0); E.rematch(rematch, 1);
assert.equal(rematch.version, '8.5'); assert.equal(rematch.workforceVersion, 1); assert.equal(rematch.players[0].workforce.departments.service.count, 0);

// Real UI handlers on DOM sinks: staging is explicit, pure, budgeted and lock-safe.
const { harness } = require('./github_resilience.test.js');
const ui = harness(); ui.c.world = copy(g);
ui.run("navHidden=null;$('#workforceNav').classList.toggle=(_,hidden)=>{navHidden=hidden};renderWorkforce({me:{}})");
assert.equal(ui.run('navHidden'), true, 'legacy campaigns hide the optional seventh workspace');
ui.run("game=world;seat=0;workspaceTab='workforce';newDraft(E.publicState(game,0));renderProjects=()=>{};renderReady=()=>{};toast=()=>{};renderWorkforce(E.publicState(game,0))");
assert.equal(ui.run('navHidden'), false, 'workforce campaigns expose the dedicated workspace');
assert(ui.elements.get('#workforcePanel').innerHTML.includes('WORKFORCE &amp; DEPARTMENT DEVELOPMENT'));
const originalState = JSON.stringify(ui.state().game);
assert(ui.run("stageSpecialistHire(E.publicState(game,0),'lending',1)"));
assert.equal(ui.run('draft.specialistHires.lending'), 1); assert.equal(ui.run('draft.hires'), 0);
assert(ui.run("stageWorkforcePolicy(E.publicState(game,0),'lending',10000,500000)"));
assert.equal(JSON.stringify(ui.state().game), originalState);
ui.run('game.players[0].submitted={}');
assert.equal(ui.run("stageSpecialistHire(E.publicState(game,0),'lending',1)"), false);

// A bounded current-rules run makes sure AI can fund and retain real specialists.
let turns = 0, recruited = 0, trainedSpend = 0;
for (const scenario of Object.keys(E.SCENARIOS)) {
  const campaign = fresh({ scenario, seed: 'workforce-ai-' + scenario });
  for (let i = 0; i < 30 && !campaign.gameOver; i++) {
    const plans = [E.chooseBot(campaign, 0), E.chooseBot(campaign, 1)];
    E.submit(campaign, 0, plans[0]); E.submit(campaign, 1, plans[1]);
    E.validatePilot(campaign); E.validateLedger(campaign); turns++;
    for (const bank of campaign.players) { E.AccountingPrototype.check(bank.accounting); assert(!bank._workforceCosts); assert(!bank._workforceReserved); }
    assert(Buffer.byteLength(JSON.stringify(E.publicState(campaign, 0))) < 1048576);
  }
  for (const bank of campaign.players) for (const row of Object.values(bank.workforce.departments)) { recruited += row.count; trainedSpend += row.trainingSpend; }
}
assert(recruited > 0, 'AI actually recruits specialists'); assert(trainedSpend > 0, 'AI actually funds training');
console.log(JSON.stringify({ passed: true, turns, retainedSpecialists: recruited, trainingSpend: trainedSpend,
  checks: ['hiring timing and costs', 'paid next-month training', 'role isolation and caps', 'no duplicated business capacity', 'cash/capital pauses', 'shared hiring limit', 'attrition and poaching', 'save and sealed-plan continuation', 'owner privacy', 'UI staging and locks', 'AI reachability'] }, null, 2));
