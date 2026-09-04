'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'BRANCH_WARS.html'), 'utf8');
const match = html.match(/<script id="engine">([\s\S]*?)<\/script>/);
assert(match, 'embedded engine script must exist');
for (const script of html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)) {
  new vm.Script(script[1], { filename: 'embedded-script-syntax-check.js' });
}

const context = { console, Math, Date, globalThis: null };
context.globalThis = context;
vm.runInNewContext(match[1], context, { filename: 'embedded-engine.js' });
const E = context.BWEngine;
assert(E, 'BWEngine must be exported');

assert.equal(Object.keys(E.TERRITORIES).length, 12);
assert.equal(E.SCOPES.national.cycles, undefined, 'campaign scopes must not carry a cycle limit');
assert.equal(E.CAMPAIGN_ACTS.length, 3);
assert.equal(Object.keys(E.PROJECTS).length, 16);
assert.equal(Object.keys(E.STRATEGY_BRANCHES).length, 5);
for (const branch of Object.values(E.STRATEGY_BRANCHES)) assert.equal(branch.nodes.length, 4, `${branch.name} has four tiers`);
assert.equal(E.EVENTS.length, 26);
assert.equal(Object.keys(E.MILESTONES).length, 6);

// Every project that grants a capability level must name a real upgrade slot.
const UPGRADE_SLOTS = Object.keys({ technology: 0, training: 0, analytics: 0, wealth: 0, operations: 0 });
for (const [key, def] of Object.entries(E.PROJECTS)) {
  if (def.max) {
    assert(def.upgrade, `project ${key} declares a max but no upgrade slot`);
    assert(UPGRADE_SLOTS.includes(def.upgrade), `project ${key} points at unknown upgrade slot ${def.upgrade}`);
  }
  if (def.upgrade) assert(def.max, `project ${key} grants an upgrade but declares no max`);
}

// lastProfit is the one signed stat: a losing month is a legitimate outcome.
const SIGNED_STATS = new Set(['lastProfit']);

function checkGame(g) {
  assert.equal(g.version, '8.0');
  assert.equal(g.maxCycles, null, 'campaigns are open-ended');
  assert(Array.isArray(g.trend));
  assert(g.trend.length >= 1, 'campaign trend must retain at least the opening snapshot');
  assert(E.MACRO_REGIMES[g.economy.key]);
  for (const territory of Object.values(g.territories)) {
    assert(Math.abs(territory.shares[0] + territory.shares[1] - 100) < 0.01);
    assert(territory.shares.every(Number.isFinite));
    assert(territory.shares.every((s) => s >= 0 && s <= 100), 'shares stay inside the full market range');
    assert(Array.isArray(territory.exitStreak) && territory.exitStreak.length === 2);
    assert(Array.isArray(territory.exited) && territory.exited.length === 2);
    assert(!territory.exited.every(Boolean), 'a transferred market must retain one active owner');
    if (territory.exited[0]) assert.deepEqual(Array.from(territory.shares), [0, 100]);
    if (territory.exited[1]) assert.deepEqual(Array.from(territory.shares), [100, 0]);
  }
  for (const player of g.players) {
    assert.equal(Object.keys(E.ROLES).length, Object.keys(player.allocation).length, 'allocation carries exactly the four roles');
    assert.equal(Object.values(player.allocation).reduce((a, b) => a + b, 0), player.stats.staff);
    assert(E.DOCTRINES[player.doctrine]);
    assert(E.CAPITAL_POLICIES[player.policies.capital]);
    assert.equal(Object.keys(player.strategy).length, 5, 'every player carries all five strategy lanes');
    for (const level of Object.values(player.strategy)) assert(level >= 0 && level <= 4, 'strategy tiers stay within 0-4');
    if (player.primaryStrategy) assert(E.STRATEGY_BRANCHES[player.primaryStrategy], 'primary strategy names a real lane');
    assert(Number.isInteger(player.boardConcessions) && player.boardConcessions >= 0);
    assert(Number.isInteger(player.capitalRestriction) && player.capitalRestriction >= 0);
    assert(Array.isArray(player.projects), 'players carry a list of running projects');
    assert(player.projects.length <= 2, 'no more than two projects ever run at once');
    assert.equal(new Set(player.projects.map((x) => x.key)).size, player.projects.length, 'the same project never runs twice');
    for (const project of player.projects) {
      assert(E.PROJECTS[project.key], `running project ${project.key} exists in the catalog`);
      assert(Number.isFinite(project.progress) && project.progress >= 0);
      assert(project.total >= 1);
    }
    for (const [key, value] of Object.entries(player.stats)) {
      assert(Number.isFinite(value), `stat ${key} must remain finite`);
      if (!SIGNED_STATS.has(key)) assert(value >= 0, `stat ${key} must remain nonnegative`);
    }
    for (const slot of UPGRADE_SLOTS) {
      assert(player.upgrades[slot] >= 0 && player.upgrades[slot] <= 3, `upgrade ${slot} stays within 0-3`);
    }
  }
}

const scenarios = Object.keys(E.SCENARIOS);
const difficulties = ['analyst', 'vp', 'chairman'];
const eventsSeen = new Set();
for (let run = 0; run < 48; run++) {
  const g = E.createGame({
    mode: 'ai',
    name1: `Test Bank ${run}`,
    name2: 'Simulation Rival',
    scope: run % 2 ? 'national' : 'state',
    scenario: scenarios[run % scenarios.length],
    difficulty: difficulties[run % difficulties.length],
    doctrine1: Object.keys(E.DOCTRINES)[run % Object.keys(E.DOCTRINES).length],
  });
  checkGame(g);
  let resolved = 0;
  while (!g.gameOver && resolved < 60) {
    eventsSeen.add(g.event.key);
    E.submit(g, 0, E.chooseBot(g, 0));
    resolved++;
    checkGame(g);
  }
  assert(g.winnerId === null || g.players.some((p) => p.id === g.winnerId));
  assert.notEqual(g.endReason, 'horizon', 'elapsed time must never end an open-ended campaign');
  const view = E.publicState(g, 0);
  assert.equal(view.trend.length, resolved + 1, 'public trend includes opening plus every resolved cycle');
  if (view.gameOver) assert(view.final[g.players[0].id]);
  else assert.equal(g.cycle, resolved + 1, 'an unfinished campaign continues to the next cycle');
}
assert.equal(eventsSeen.size, E.EVENTS.length, 'every executive call should appear across the sample');

// --- Privacy contract -------------------------------------------------------
const versus = E.createGame({ mode: 'hotseat', name1: 'Alpha', name2: 'Beta', scope: 'town', doctrine1: 'digital', doctrine2: 'people' });
const alphaPlan = E.chooseBot(versus, 0);
E.submit(versus, 0, alphaPlan);
const betaView = E.publicState(versus, 1);
assert.equal(betaView.rival.submitted, true);
assert.equal(betaView.rival.policies, undefined, 'rival policies stay private');
assert.equal(betaView.rival.focus, undefined, 'rival focus stays private');
assert.equal(betaView.rival.projects, undefined, 'rival projects stay private');
assert.equal(betaView.rival.projectSlots, undefined, 'rival project capacity stays private');
assert(Array.isArray(betaView.me.projects), 'you can see your own running projects');
assert.equal(betaView.rival.mandate, undefined, 'rival mandate stays private');
assert.equal(betaView.territories.downtown.shares[0], versus.territories.downtown.shares[1], 'each seat reads its own share first');
E.submit(versus, 1, E.chooseBot(versus, 1));
assert.equal(versus.cycle, 2);

// --- Capability levels cannot be bought past their maximum -------------------
function basePlan(g, p) {
  return {
    focus: p.focus,
    allocation: { ...p.allocation },
    depositPolicy: 'balanced',
    lendingPolicy: 'balanced',
    capitalPolicy: 'balanced',
    opportunity: null,
    newProject: null,
    decision: 'a',
  };
}
for (const [key, def] of Object.entries(E.PROJECTS)) {
  if (!def.max) continue;
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'national' });
  const p = g.players[0];
  p.upgrades[def.upgrade] = def.max;
  p.stats.cash = 9e6;
  assert.throws(
    () => E.submit(g, 0, { ...basePlan(g, p), newProject: key }),
    /maximum level/,
    `${key} must be refused once ${def.upgrade} is maxed`
  );
}

// --- Staff allocation cannot be faked with extra keys -----------------------
{
  const g = E.createGame({ mode: 'lan', name1: 'A', name2: 'B', scope: 'town' });
  const p = g.players[0];
  assert.throws(
    () => E.submit(g, 0, { ...basePlan(g, p), allocation: { service: 120, business: 0, lending: 0, operations: 0, ghost: -112 } }),
    /Allocate all/,
    'a padded allocation object must not pass validation'
  );
  E.submit(g, 0, { ...basePlan(g, p), allocation: { service: 3, business: 2, lending: 2, operations: 1, ghost: 99 } });
  E.submit(g, 1, basePlan(g, g.players[1]));
  assert.deepEqual(Object.keys(g.players[0].allocation).sort(), Object.keys(E.ROLES).sort(), 'resolved allocation keeps only real roles');
}

// --- Unknown projects report the real problem -------------------------------
{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'town' });
  assert.throws(() => E.submit(g, 0, { ...basePlan(g, g.players[0]), newProject: 'moonbase' }), /does not exist/);
}

// --- Branch goals scale with map size, not a campaign deadline ---------------
{
  const seen = {};
  for (const scope of ['town', 'regional', 'state', 'national']) {
    const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope });
    g.players[0].mandate = 'network';
    const goal = Number(E.mandateStatus(g, 0).progress.split('/')[1].trim().split(' ')[0]);
    const builderDesc = E.publicState(g, 0).milestoneDefinitions.builder.desc;
    const builderGoal = Number(builderDesc.match(/\d+/)[0]);
    assert.equal(g.maxCycles, null);
    seen[scope] = [goal, builderGoal];
  }
  assert(seen.town[1] < seen.national[1], 'larger maps must ask for a larger branch network');
}

// --- Event market effects are multipliers, not flat points ------------------
{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'town' });
  const src = match[1];
  assert(!/\(p\.turnEffects\.market\|\|1\)-1/.test(src), 'market turn effects must not be applied as a flat bonus');
  assert(/x\*=\(p\.turnEffects\.market\|\|1\)/.test(src), 'market turn effects must scale district strength');
  assert(g.territories.downtown.shares[0] > g.territories.downtown.shares[1]);
}

// --- The bot can pursue every strategy lane without selecting retired upgrades
{
  const picked = new Set();
  const doctrines = Object.keys(E.DOCTRINES);
  for (let run = 0; run < 60; run++) {
    const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'national', doctrine1: doctrines[run % doctrines.length], doctrine2: doctrines[(run + 2) % doctrines.length] });
    for (let cycle = 0; cycle < 60 && !g.gameOver; cycle++) {
      g.players[0].stats.cash = Math.max(g.players[0].stats.cash, 4e6);
      g.players[1].stats.cash = Math.max(g.players[1].stats.cash, 4e6);
      // Cash alone never puts the bot under compliance pressure, so exercise that branch too.
      if (g.cycle % 5 === 0) g.players[0].stats.compliance = 55;
      const a = E.chooseBot(g, 0);
      const b = E.chooseBot(g, 1);
      if (a.newProject) picked.add(a.newProject);
      if (b.newProject) picked.add(b.newProject);
      E.submit(g, 0, a);
      E.submit(g, 1, b);
    }
  }
  const roadmap = Object.entries(E.PROJECTS).filter(([, def]) => def.strategy).map(([key]) => key);
  const unreachable = roadmap.filter((key) => !picked.has(key));
  assert.deepEqual(unreachable, [], 'the executive AI must be able to choose every strategy lane');
  const retired = Object.entries(E.PROJECTS).filter(([, def]) => def.legacy).map(([key]) => key);
  assert.equal(retired.some((key) => picked.has(key)), false, 'the executive AI never starts a retired upgrade project');
}

// --- Legacy Operations capability remains valid for migrated saves ----------
{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'national' });
  const p = g.players[0];
  const branch = E.PROJECTS.branch;   // 3 cycles
  const hire = E.PROJECTS.hire;       // 2 cycles

  // Level 0: no discount anywhere.
  assert.equal(E.projectCycles(p, branch), 3);
  assert.equal(E.projectCycles(p, hire), 2);
  assert.equal(E.projectCost(p, branch), branch.cost);
  assert.equal(E.projectSlots(p), 1);

  // Level 1: large builds land a cycle sooner; short utility projects do not.
  p.upgrades.operations = 1;
  assert.equal(E.projectCycles(p, branch), 2, 'level 1 must shorten a 3-cycle project');
  assert.equal(E.projectCycles(p, hire), 2, 'level 1 must not trivialise 2-cycle projects');
  assert.equal(E.projectSlots(p), 1, 'level 1 does not yet grant a second team');

  // Level 2: a second team, but only while it is actually staffed.
  p.upgrades.operations = 2;
  p.allocation = { service: 6, business: 1, lending: 1, operations: 0 };
  assert.equal(E.projectSlots(p), 1, 'an unstaffed second team does not count');
  p.allocation = { service: 4, business: 1, lending: 1, operations: 2 };
  assert.equal(E.projectSlots(p), 2, 'two Operations bankers staff the second team');

  // Level 3: projects get cheaper.
  p.upgrades.operations = 3;
  assert.equal(E.projectCost(p, branch), Math.round(branch.cost * 0.85));
  assert(E.projectCost(p, branch) < branch.cost);
}

// Executive events can hire, fire and re-normalise staff, which would silently move the slot
// count out from under these checks. Pin the quiet event and rebuild the allocation each cycle.
const QUIET = E.EVENTS.find((e) => e.key === 'quiet');
function opsCycle(g, newProject) {
  const p = g.players[0];
  g.event = QUIET;
  p.stats.cash = 9e6;
  const operations = Math.min(2, p.stats.staff);
  const allocation = { service: p.stats.staff - operations, business: 0, lending: 0, operations };
  return { ...basePlan(g, p), allocation, newProject: newProject || null };
}

// Two projects genuinely run side by side, and an unstaffed one stalls instead of advancing.
{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'national' });
  const p = g.players[0];
  p.upgrades.operations = 2;

  // Four-cycle builds, so neither finishes while we are still inspecting them.
  E.submit(g, 0, opsCycle(g, 'acquisition'));
  E.submit(g, 1, E.chooseBot(g, 1));
  assert.equal(p.projects.length, 1);
  assert.equal(E.projectSlots(p), 2, 'the second team is staffed');

  E.submit(g, 0, opsCycle(g, 'operationsCenter'));
  E.submit(g, 1, E.chooseBot(g, 1));
  assert.equal(p.projects.length, 2, 'a staffed second team runs a second project');

  // Only one new project may be committed per cycle, even with a free team.
  assert.throws(() => E.submit(g, 0, opsCycle(g, 'hire')), /already committed|already active/);

  // Pull the second team off the line: the trailing project must stop advancing.
  const trailing = p.projects[1].key;
  const before = p.projects[1].progress;
  const leadBefore = p.projects[0].progress;
  const stripped = opsCycle(g, null);
  stripped.allocation = { service: p.stats.staff, business: 0, lending: 0, operations: 0 };
  E.submit(g, 0, stripped);
  E.submit(g, 1, E.chooseBot(g, 1));
  const stalled = p.projects.find((x) => x.key === trailing);
  assert(stalled, 'a stalled project is not discarded');
  assert.equal(stalled.progress, before, 'an unstaffed second project stalls');
  const lead = p.projects.find((x) => x.key !== trailing);
  assert(!lead || lead.progress > leadBefore, 'the primary project keeps moving');
}

// The same project cannot be run twice at once.
{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'national' });
  g.players[0].upgrades.operations = 2;
  E.submit(g, 0, opsCycle(g, 'acquisition'));
  E.submit(g, 1, E.chooseBot(g, 1));
  assert.equal(g.players[0].projects.length, 1);
  assert.throws(() => E.submit(g, 0, opsCycle(g, 'acquisition')), /already under way/);
}

// Project capacity follows the allocation being submitted, not last cycle's staffing.
{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'national' });
  const p = g.players[0];
  p.upgrades.operations = 2;
  p.stats.cash = 9e6;
  p.projects = [{ key: 'acquisition', target: 'downtown', progress: 0, total: 4 }];
  p.allocation = { service: 3, business: 2, lending: 2, operations: 1 };
  const staffUp = { ...basePlan(g, p), allocation: { service: 2, business: 2, lending: 2, operations: 2 }, newProject: 'training' };
  assert.doesNotThrow(() => E.submit(g, 0, staffUp), 'staffing the second team and using it in one plan must work');
  E.submit(g, 1, basePlan(g, g.players[1]));
  assert(p.projects.some((x) => x.key === 'training'), 'the validated second project must actually start');

  const h = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'national' });
  const q = h.players[0];
  q.upgrades.operations = 2;
  q.stats.cash = 9e6;
  q.projects = [{ key: 'acquisition', target: 'downtown', progress: 0, total: 4 }];
  q.allocation = { service: 2, business: 2, lending: 2, operations: 2 };
  const staffDown = { ...basePlan(h, q), allocation: { service: 4, business: 2, lending: 2, operations: 0 }, newProject: 'training' };
  assert.throws(() => E.submit(h, 0, staffDown), /already active/, 'removing the second team must reject a second project before lock-in');
}

// Aggressive deposits create visible funding cost and a rate-sensitive liability.
{
  const g = E.createGame({ mode: 'hotseat', name1: 'Aggressive', name2: 'Balanced', scope: 'town' });
  g.event = QUIET;
  const a = { ...basePlan(g, g.players[0]), depositPolicy: 'aggressive' };
  const b = { ...basePlan(g, g.players[1]), depositPolicy: 'balanced' };
  E.submit(g, 0, a);
  E.submit(g, 1, b);
  const aggressive = g.players[0].stats;
  const balanced = g.players[1].stats;
  assert(aggressive.rateSensitiveDeposits > balanced.rateSensitiveDeposits, 'aggressive pricing creates materially more volatile funding');
  assert(aggressive.fundingCost > balanced.fundingCost, 'aggressive pricing pays a higher carrying cost');
  const sensitiveBefore = aggressive.rateSensitiveDeposits;
  g.event = QUIET;
  E.submit(g, 0, { ...basePlan(g, g.players[0]), depositPolicy: 'margin' });
  E.submit(g, 1, basePlan(g, g.players[1]));
  assert(aggressive.depositRunoff > 0, 'repricing a hot deposit book toward margin produces runoff');
  assert(aggressive.rateSensitiveDeposits < sensitiveBefore, 'runoff reduces the rate-sensitive balance');
}

// The per-viewer catalog prices and times projects for the player who receives it.
{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'national' });
  g.players[0].upgrades.operations = 3;
  const view = E.publicState(g, 0);
  assert.equal(view.projects.branch.cycles, 2, 'the catalog shows the shortened duration');
  assert.equal(view.projects.branch.cost, Math.round(E.PROJECTS.branch.cost * 0.85), 'the catalog shows the discounted cost');
  assert.equal(E.PROJECTS.branch.cycles, 3, 'the shared catalog itself is not mutated');
  assert.equal(E.publicState(g, 1).projects.branch.cycles, 3, 'the rival sees undiscounted numbers');
}

// --- Enterprise strategy tree commits a primary lane and limits secondaries -
{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'national' });
  const p = g.players[0];
  p.stats.cash = 9e6;
  assert.equal(E.strategyTotal(p), 0);
  assert.equal(E.projectCost(p, E.PROJECTS.roadmapDigital), E.STRATEGY_BRANCHES.digital.nodes[0].cost, 'tier one has no cross-lane premium');

  // Completing tier two establishes the permanent primary strategy.
  p.strategy.network = 1;
  p.projects = [{ key: 'roadmapNetwork', target: null, progress: 0, total: 1 }];
  g.event = QUIET;
  E.submit(g, 0, basePlan(g, p));
  E.submit(g, 1, basePlan(g, g.players[1]));
  assert.equal(p.strategy.network, 2);
  assert.equal(p.primaryStrategy, 'network');

  const digitalBase = E.STRATEGY_BRANCHES.digital.nodes[0].cost;
  assert(E.projectCost(p, E.PROJECTS.roadmapDigital) > digitalBase, 'a secondary lane becomes more expensive after commitment');
  p.strategy.digital = 2;
  assert.match(E.strategyBarred(p, 'roadmapDigital'), /stop at tier two/i, 'secondary strategies cannot advance to tier three');
  assert.throws(() => E.submit(g, 0, { ...basePlan(g, p), newProject: 'roadmapDigital' }), /stop at tier two/i);

  p.strategy.network = 3;
  assert.equal(E.strategyBarred(p, 'roadmapNetwork'), '', 'the primary lane may pursue its capstone');
  p.strategy.network = 4;
  assert.equal(E.strategyCapstone(p), 'network');
}

// --- Regulatory capital, escalation and receivership ------------------------
{
  // Tier boundaries must be contiguous and ordered, and cover every ratio.
  const mins = E.CAPITAL_TIERS.map((t) => t.min);
  for (let i = 1; i < mins.length; i++) assert(mins[i] < mins[i - 1], 'capital tiers descend');
  assert.equal(E.CAPITAL_TIERS.at(-1).min, -Infinity, 'the worst tier catches every ratio');
  for (const t of E.CAPITAL_TIERS) assert(t.key && t.name && t.short && t.text, `tier ${t.key} is fully described`);

  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'national' });
  const p = g.players[0];
  assert(Number.isFinite(p.stats.capital) && p.stats.capital > 0, 'institutions open with regulatory capital');
  assert(E.capitalRatio(p) > 8, 'a fresh institution opens well capitalized');
  assert.equal(E.capitalTier(p).key, 'strong');

  // Ratio responds the right way to each side of the balance sheet.
  const base = E.capitalRatio(p);
  p.stats.deposits += 20000000;
  assert(E.capitalRatio(p) < base, 'taking deposits without earnings dilutes the ratio');
  p.stats.deposits -= 20000000;
  p.stats.loans += 20000000;
  assert(E.capitalRatio(p) < base, 'growing the loan book dilutes the ratio');
  p.stats.loans -= 20000000;
  assert(Math.abs(E.capitalRatio(p) - base) < 1e-9, 'the ratio is a pure function of the balance sheet');

  // Each tier is actually reachable, and tierRank orders them.
  for (const tier of E.CAPITAL_TIERS) {
    const target = tier.min === -Infinity ? 1 : tier.min + 0.5;
    p.stats.capital = Math.round((p.stats.loans + p.stats.deposits * 0.2) * (target / 100));
    assert.equal(E.capitalTier(p).key, tier.key, `ratio ${target}% maps to ${tier.key}`);
  }
  assert(E.tierRank(p) === E.CAPITAL_TIERS.length - 1, 'tierRank tracks the tier list');
}

// Regulatory standing gates expansion, and the whole catalog once undercapitalized.
{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'national' });
  const p = g.players[0];
  p.stats.cash = 9e6;
  const setRatio = (pct) => { p.stats.capital = Math.round((p.stats.loans + p.stats.deposits * 0.2) * (pct / 100)) };

  setRatio(7);   // enhanced supervision
  assert.equal(E.capitalTier(p).key, 'watch');
  assert.throws(() => E.submit(g, 0, { ...basePlan(g, p), newProject: 'branch' }), /suspended/, 'branches are suspended under supervision');
  assert.doesNotThrow(() => E.submit(g, 0, { ...basePlan(g, p), newProject: 'training' }), 'non-expansion projects still run under supervision');
  g.players[0].submitted = null;

  setRatio(3);   // undercapitalized
  assert.equal(E.capitalTier(p).key, 'critical');
  assert.throws(() => E.submit(g, 0, { ...basePlan(g, p), newProject: 'training' }), /barred/, 'everything is barred once undercapitalized');
}

// Emergency board capital is a crisis action, not a repeatable project.
{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'national' });
  const p = g.players[0];
  assert.equal(E.capitalRequestStatus(p).eligible, false, 'healthy institutions cannot treat board capital as routine funding');
  assert.throws(() => E.submit(g, 0, { ...basePlan(g, p), capitalAction: true }), /unlocks only/i);
  assert.throws(() => E.submit(g, 0, { ...basePlan(g, p), newProject: 'capital' }), /emergency board action/i, 'the retired capital project cannot be started');

  p.stats.cash = 100000;
  p.stats.capital = 500000;
  p.stats.influence = 9;
  assert.throws(() => E.submit(g, 0, { ...basePlan(g, p), capitalAction: true }), /10 executive influence/i);
  p.stats.influence = 30;
  assert.throws(() => E.submit(g, 0, { ...basePlan(g, p), capitalAction: true, newProject: 'branch' }), /cannot be combined with an expansion/i);
  const capitalBefore = p.stats.capital;
  const scoreBefore = E.baseScore(g, 0);
  assert.doesNotThrow(() => E.submit(g, 0, { ...basePlan(g, p), capitalAction: true }));
  E.submit(g, 1, basePlan(g, g.players[1]));
  assert(p.stats.capital > capitalBefore, 'board assistance adds regulatory capital immediately');
  assert.equal(p.boardConcessions, 1, 'board assistance creates a permanent value concession');
  assert.equal(p.capitalRestriction, 3, 'board assistance begins three cycles of oversight');
  assert(E.baseScore(g, 0) < scoreBefore + 100, 'the concession prevents emergency funding from being free enterprise value');
  assert.throws(() => E.submit(g, 0, { ...basePlan(g, p), newProject: 'branch' }), /Board assistance suspends expansion/i);
  p.capitalRequests = 2;
  p.capitalRestriction = 0;
  assert.match(E.capitalRequestStatus(p).reason, /third rescue/i, 'board assistance has a hard campaign limit');
}

// Reckless balance-sheet management ends in receivership; the campaign stops immediately
// and the survivor takes the franchise.
{
  let receivership = 0, earliest = Infinity;
  const RUNS = 40;
  for (let r = 0; r < RUNS; r++) {
    const g = E.createGame({ mode: 'hotseat', name1: 'Reckless', name2: 'Control', scope: 'national' });
    for (let guard = 0; guard < 120 && !g.gameOver; guard++) {
      const p = g.players[0];
      const bot = E.chooseBot(g, 0);
      const lending = Math.max(1, Math.floor(p.stats.staff * 0.6));
      const business = Math.max(1, p.stats.staff - lending - 1);
      const plan = {
        ...bot,
        allocation: { service: Math.max(0, p.stats.staff - lending - business), business, lending, operations: 0 },
        depositPolicy: 'aggressive', lendingPolicy: 'growth', capitalPolicy: 'reinvest',
        capitalAction: false,
        newProject: ['capital', 'remediation', 'operationsCenter'].includes(bot.newProject) ? null : bot.newProject,
      };
      try { E.submit(g, 0, plan) } catch { E.submit(g, 0, { ...plan, newProject: null }) }
      if (!g.gameOver && !g.players[1].submitted) E.submit(g, 1, E.chooseBot(g, 1));
    }
    if (g.endReason === 'receivership') {
      receivership++;
      earliest = Math.min(earliest, g.cycle);
      assert.equal(g.failedId, g.players[0].id, 'the reckless institution is the one that fails');
      assert.equal(g.winnerId, g.players[1].id, 'the survivor assumes the franchise');
      assert(g.log.some((x) => x.kind === 'FINAL' && /RECEIVERSHIP/.test(x.text)), 'the wire reports the failure');
      const view = E.publicState(g, 1);
      assert.equal(view.endReason, 'receivership');
      assert.equal(view.gameOver, true);
      assert(view.final, 'a receivership still produces final cards');
    }
  }
  assert(receivership / RUNS > 0.5, `reckless play should usually end in receivership (got ${receivership}/${RUNS})`);
  assert(earliest >= 6, `receivership must never arrive without warning (earliest cycle ${earliest})`);
}

// Two competent institutions remain solvent through a long campaign unless another
// strategic ending has already decided it.
{
  let receivership = 0;
  const RUNS = 60;
  for (let r = 0; r < RUNS; r++) {
    const g = E.createGame({
      mode: 'hotseat', name1: 'A', name2: 'B',
      scope: ['town', 'regional', 'state', 'national'][r % 4],
      scenario: Object.keys(E.SCENARIOS)[r % 4],
    });
    for (let cycle = 0; cycle < 60 && !g.gameOver; cycle++) {
      E.submit(g, 0, E.chooseBot(g, 0));
      E.submit(g, 1, E.chooseBot(g, 1));
    }
    if (g.endReason === 'receivership') receivership++;
    assert.notEqual(g.endReason, 'horizon', 'elapsed cycles never decide a campaign');
    checkGame(g);
  }
  assert(receivership / RUNS < 0.2, `competent play should rarely produce a bank failure (got ${receivership}/${RUNS})`);
}

// --- Open-ended competitive endings ----------------------------------------
{
  const g = E.createGame({ mode: 'hotseat', name1: 'Buyer', name2: 'Seller', scope: 'town' });
  const buyer = g.players[0], seller = g.players[1];
  buyer.strategy.acquisition = 3;
  const before = {
    deposits: buyer.stats.deposits + seller.stats.deposits,
    loans: buyer.stats.loans + seller.stats.loans,
    customers: buyer.stats.customers + seller.stats.customers,
  };
  const message = E.finishProject(g, buyer, { key: 'acquisition', target: 'northside' });
  assert.match(message, /directly from Seller/, 'an acquisition identifies the rival whose book was taken');
  assert.equal(buyer.stats.deposits + seller.stats.deposits, before.deposits, 'acquisitions transfer rather than mint deposits');
  assert.equal(buyer.stats.loans + seller.stats.loans, before.loans, 'acquisitions transfer rather than mint loans');
  assert.equal(buyer.stats.customers + seller.stats.customers, before.customers, 'acquisitions transfer rather than mint customers');
  assert.equal(seller.branches.northside, 0, 'a developed acquisition strategy can remove a rival branch');
}

{
  const g = E.createGame({ mode: 'hotseat', name1: 'Leader', name2: 'Rival', scope: 'town' });
  const market = g.territories.downtown;
  market.shares = [91, 9];
  E.resolveMarketExits(g);
  E.resolveMarketExits(g);
  assert.equal(market.exited[1], false, 'two weak cycles produce a warning, not an immediate closure');
  const lines = E.resolveMarketExits(g);
  assert.equal(market.exited[1], true);
  assert.deepEqual(Array.from(market.shares), [100, 0]);
  assert(lines.some((line) => /closed every branch/.test(line)));
  const rivalView = E.publicState(g, 1);
  assert.deepEqual(Array.from(rivalView.territories.downtown.exited), [true, false], 'exit state is oriented to each player');
}

{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'town' });
  assert.equal(g.act, 0);
  g.players[0].stats.deposits = 33000000;
  assert.match(E.updateCampaignAct(g), /ACT II BEGINS/);
  assert.equal(g.act, 1);
  g.players[1].stats.capital = 1;
  assert.match(E.updateCampaignAct(g), /ACT III BEGINS/);
  assert.equal(g.act, 2);
}

{
  const g = E.createGame({ mode: 'hotseat', name1: 'Acquirer', name2: 'Target', scope: 'town' });
  const acquirer = g.players[0], target = g.players[1];
  g.act = 2;
  acquirer.stats.deposits = 90000000;
  acquirer.stats.loans = 75000000;
  acquirer.stats.capital = 18000000;
  acquirer.stats.cash = 12000000;
  acquirer.stats.influence = 80;
  target.stats.deposits = 8000000;
  target.stats.loans = 5000000;
  target.stats.capital = 350000;
  target.stats.cash = 150000;
  assert.equal(E.evaluateStrategicEnd(g), '', 'a hostile buyout requires a sustained position');
  assert.equal(g.buyoutPressure[0], 1);
  assert.match(E.evaluateStrategicEnd(g), /HOSTILE BUYOUT/);
  assert.equal(g.endReason, 'buyout');
  assert.equal(g.winnerId, acquirer.id);
  assert.equal(target.stats.deposits, 8000000, 'the target record remains available for final reporting');
  assert(acquirer.stats.deposits > 90000000, 'the acquirer absorbs part of the target franchise');
}

{
  const g = E.createGame({ mode: 'hotseat', name1: 'Winner', name2: 'Defeated', scope: 'town' });
  for (const territory of Object.values(g.territories)) {
    territory.exited[1] = true;
    territory.shares = [100, 0];
  }
  assert.match(E.evaluateStrategicEnd(g), /TOTAL MARKET DOMINATION/);
  assert.equal(g.endReason, 'domination');
  assert.equal(g.winnerId, g.players[0].id);
}

// Both sides can read each other's regulatory standing -- that is the point of the system.
{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'state' });
  const view = E.publicState(g, 0);
  for (const side of [view.me, view.rival]) {
    assert(Number.isFinite(side.capitalRatio), 'capital ratio is public');
    assert(side.capitalTier && side.capitalTier.name, 'regulatory tier is public');
    assert(Number.isFinite(side.distress), 'distress countdown is public');
  }
  assert.equal(view.rival.stats.policies, undefined, 'public standing does not leak private policy');
  assert.equal(view.receivershipCycles, E.RECEIVERSHIP_CYCLES);
}

// --- Save migration produces a state the client can actually render ---------
{
  const clientSource = html.slice(html.indexOf('function repairGame'), html.indexOf('function saveLocal'));
  assert(clientSource.includes('function migrateGame'), 'migrateGame must live between repairGame and saveLocal');
  const migrationContext = { E, Array, JSON, Error, Object, Number, String, console };
  vm.runInNewContext(`${clientSource};globalThis.migrateGame=migrateGame;`, migrationContext, { filename: 'embedded-migration.js' });
  const migrateGame = migrationContext.migrateGame;

  const fresh = E.createGame({ mode: 'ai', name1: 'Legacy Bank', name2: 'Old Rival', scope: 'state' });
  E.submit(fresh, 0, E.chooseBot(fresh, 0));

  const legacy = JSON.parse(JSON.stringify(fresh));
  legacy.version = '6.0';
  for (const key of ['trend', 'economy', 'rematchVotes', 'scoreDelta', 'resolutionId', 'difficulty']) delete legacy[key];
  for (const p of legacy.players) {
    delete p.doctrine;
    delete p.achievements;
    delete p.marketingTurns;
    delete p.mandate;
    delete p.stats.chargeoffs;
    delete p.stats.opportunityWins;
    delete p.upgrades.analytics;
    delete p.upgrades.wealth;
    delete p.upgrades.operations;
    delete p.strategy;
    delete p.primaryStrategy;
    delete p.boardConcessions;
    delete p.capitalRestriction;
    delete p.policies.capital;
  }
  const migrated = migrateGame(legacy);
  assert.equal(migrated.version, '8.0');
  const migratedView = E.publicState(migrated, 0);
  assert(migratedView.me.mandate.name, 'a migrated save still has a readable mandate');
  assert.equal(migratedView.rematchReady, false);
  E.submit(migrated, 0, E.chooseBot(migrated, 0));
  checkGame(migrated);

  const damaged = JSON.parse(JSON.stringify(fresh));
  damaged.event = null;
  damaged.economy = { key: 'nonsense' };
  damaged.log = null;
  damaged.rematchVotes = null;
  damaged.players[0].policies.capital = 'infinite-money';
  damaged.players[0].focus = 'atlantis';
  damaged.players[1].projects = [
    { key: 'moonbase', progress: 1, total: 2 },      // unknown project key
    { key: 'branch', progress: 'soon', total: 3 },   // unusable progress value
  ];
  const repaired = migrateGame(damaged);
  E.publicState(repaired, 0);
  E.publicState(repaired, 1);
  checkGame(repaired);
  assert(Array.isArray(repaired.players[1].projects), 'a legacy single project slot becomes a list');
  assert.equal(repaired.players[1].projects.length, 0, 'a project pointing at an unknown key is dropped');
  assert.equal(repaired.players[1].project, undefined, 'the old single slot is removed');

  // A save written before the operations rework carries one in-flight project object.
  const preRework = JSON.parse(JSON.stringify(fresh));
  delete preRework.players[0].projects;
  preRework.players[0].project = { key: 'branch', target: 'downtown', progress: 1, total: 3 };
  const carried = migrateGame(preRework);
  // Compared field by field: repairGame runs in its own vm realm, so its arrays have a
  // different Array.prototype and would fail a deepStrictEqual against a local literal.
  assert.equal(carried.players[0].projects.length, 1, 'an in-flight project survives the migration');
  assert.equal(carried.players[0].projects[0].key, 'branch');
  assert.equal(carried.players[0].projects[0].total, 3);

  // A save written before the solvency model has no capital account at all.
  const preSolvency = JSON.parse(JSON.stringify(fresh));
  for (const p of preSolvency.players) {
    delete p.stats.capital;
    delete p.distress;
    delete p.fundingGap;
    delete p.capitalRequests;
  }
  const recapped = migrateGame(preSolvency);
  for (const p of recapped.players) {
    assert(Number.isFinite(p.stats.capital) && p.stats.capital > 0, 'migration issues an opening capital account');
    assert.equal(p.distress, 0);
    assert.equal(p.capitalRequests, 0);
    assert.deepEqual(Object.keys(p.strategy), Object.keys(E.STRATEGY_BRANCHES), 'migration installs every strategy lane');
    assert.equal(p.primaryStrategy, null);
    assert.equal(p.boardConcessions, 0);
    assert.equal(p.capitalRestriction, 0);
  }
  const recappedView = E.publicState(recapped, 0);
  assert(recappedView.me.capitalRatio > 2, 'a migrated institution is not born insolvent');
  assert(recappedView.me.capitalTier.key, 'a migrated institution has a readable regulatory tier');
  E.submit(recapped, 0, E.chooseBot(recapped, 0));
  E.submit(recapped, 1, E.chooseBot(recapped, 1));
  checkGame(recapped);
  E.publicState(carried, 0);
  checkGame(carried);

  assert.throws(() => migrateGame({ version: '5.0', players: [{}, {}], territories: { downtown: {} } }), /v6.0, v7.0, v7.1, and v8.0/);
  assert.throws(() => migrateGame({ version: '7.0', players: [{}], territories: {} }), /not a valid/i);
}

// --- Rematch keeps the campaign settings ------------------------------------
{
  const g = E.createGame({ mode: 'hotseat', name1: 'A', name2: 'B', scope: 'town', scenario: 'growth', difficulty: 'chairman', doctrine1: 'digital', doctrine2: 'people' });
  for (const territory of Object.values(g.territories)) {
    territory.exited[1] = true;
    territory.shares = [100, 0];
  }
  E.evaluateStrategicEnd(g);
  assert.equal(g.endReason, 'domination');
  assert.equal(E.rematch(g, 0), false, 'one vote is not enough');
  assert.equal(E.rematch(g, 1), true);
  assert.equal(g.cycle, 1);
  assert.equal(g.gameOver, false);
  assert.equal(g.scope, 'town');
  assert.equal(g.scenario, 'growth');
  assert.equal(g.difficulty, 'chairman');
  assert.equal(g.players[0].doctrine, 'digital');
  checkGame(g);
}

// --- HTML contract ----------------------------------------------------------
assert(html.includes('id="lanSetup"'));
assert(html.includes('id="capitalPolicies"'));
assert(html.includes('id="isometric-city-overhaul"'));
assert(html.includes('function districtArt'));
assert(html.includes('id="trendChart"'));
assert(html.includes('BRANCH WARS v8.0'));
assert(html.includes('ENTERPRISE STRATEGY TREE'));
assert(html.includes('EMERGENCY BOARD CAPITAL'));
assert(html.includes('function renderCampaignBuff'), 'the advertising buff must be shown to the player');

// A later duplicate silently shadows the earlier definition and the page still
// parses, so a redefined client function is a real defect the syntax check misses.
{
  const client = html.slice(html.indexOf('<script>', html.indexOf('</script>')));
  const seen = new Map();
  for (const match of client.matchAll(/^\s*(?:async\s+)?function ([A-Za-z0-9_$]+)\(/gm)) {
    seen.set(match[1], (seen.get(match[1]) || 0) + 1);
  }
  const duplicated = [...seen].filter(([, count]) => count > 1).map(([name]) => name);
  assert.deepEqual(duplicated, [], 'no client function may be declared twice');
}

// --- direct-link (P2P) session contract -------------------------------------
// A green "connected" peer says nothing about the data channel the game runs on.
// These guard the fixes for a link that connects but never advances a cycle.
function clientFn(name) {
  const start = html.indexOf(`function ${name}(`);
  assert(start >= 0, `client function ${name} must exist`);
  const end = html.indexOf('\nfunction ', start + 1);
  return html.slice(start, end === -1 ? html.length : end);
}

// The transport is chosen by the transport that is actually open, never by the
// setup screen the player last looked at.
const sendBody = clientFn('send');
assert(sendBody.includes('lan.active'), 'send() must route on the live transport');
assert(!/if\(mode==='lan'\)/.test(sendBody), 'send() must not route on the UI mode flag');
for (const fn of ['createOffer', 'createAnswer']) {
  assert(clientFn(fn).includes("mode='p2p'"), `${fn}() must own the session mode`);
}

// The rival's copy of the state leaves before the host redraws itself, so a
// display failure on the host can never strand the guest on a stale cycle.
const syncBody = clientFn('syncPeers');
assert(
  syncBody.indexOf("send({type:'state'") < syncBody.indexOf('render()'),
  'syncPeers() must transmit the rival state before redrawing the host view',
);

// The handshake is retried and watched: a single dropped hello used to hang the
// session forever behind a green "DIRECT LINK CONNECTED".
assert(clientFn('startHandshake').includes('setInterval'), 'the handshake must retry');
const watchBody = clientFn('armLinkWatch');
assert(watchBody.includes("dc.readyState!=='open'"), 'the watchdog must check the data channel, not just the peer');
assert(watchBody.includes('DIRECT LINK STALLED'), 'a stalled link must say so on screen');
assert(
  clientFn('wireChannel').includes("if(dc.readyState==='open')opened()"),
  'a channel handed over already open must still start the handshake',
);

// A guest plan is provisional until the host confirms it.
const submitBody = clientFn('submitPlan');
assert(submitBody.includes('planAckTimer'), 'a guest plan must be confirmed or released');
assert(
  !clientFn('recallPlan').includes('view.me.submitted=false'),
  'only the host may unlock a submitted plan',
);
const messageBody = clientFn('handleMessage');
assert(
  messageBody.includes("m.type==='error'") && messageBody.includes('view.me.submitted=false'),
  'a rejected plan must release the guest instead of locking it forever',
);
assert(messageBody.includes('lan.active?'), 'the host must open the campaign on the live transport');

// --- repository link --------------------------------------------------------
// Neither computer connects to the other: each writes only its own file, so two
// writers never touch one file and no merge can occur.
assert(clientFn('ghPath').includes('${side}'), 'each side must own a separate file');
const flushBody = clientFn('ghFlush');
assert(flushBody.includes('gh.side'), 'a player may only write their own side');
assert(flushBody.includes('gh.sha'), 'writes must carry the expected version');
assert(clientFn('ghRead').includes('If-None-Match'), 'polling must be conditional to stay inside the rate limit');
assert(clientFn('ghRead').includes('gh.branch'), 'repository reads must use the discovered default branch');
assert(!clientFn('ghRead').includes('ref=HEAD'), 'HEAD is not a reliable Contents API ref');
assert(clientFn('ghPoll').includes("gh.side==='host'?'guest':'host'"), 'each side reads only the other');
// A token is a credential: it is never handed to the rival, and it is forgettable.
assert(!clientFn('ghCreateRoom').match(/pack\('BW7-ROOM-',\{[^}]*token/), 'the join code must never carry a token');
assert(!clientFn('ghCreateRoom').match(/pack\('BW7-ROOM-',\{[^}]*api/), 'a join code must never choose where the rival sends a token');
assert(clientFn('ghJoinRoom').includes('Never use your rival'), 'the guest must be told to use their own token');
assert(clientFn('ghJoinRoom').includes('ghNormalizeApi'), 'the guest must type and validate their own API address');
assert(clientFn('ghForget').includes('removeItem'), 'a saved token must be removable');
assert(clientFn('ghRemember').includes('sessionStorage'), 'tokens must be session-scoped rather than permanently stored');
assert(!clientFn('ghRemember').match(/localStorage\.setItem\([^;]*token/), 'tokens must never be written to permanent local storage');
assert(clientFn('send').indexOf('gh.active') < clientFn('send').indexOf('lan.active'),
  'messages must route to the repository room when one is open');
assert(clientFn('ghCheckRepo').includes('default_branch'), 'the repository default branch must be discovered before room I/O');
assert(clientFn('ghCheckRepo').includes('permissions.push'), 'write permission must be checked before opening a room');
assert(clientFn('ghNormalizeApi').includes("parsed.protocol!=='https:'"), 'repository credentials may only be sent to an HTTPS API address');
assert(clientFn('ghHeaders').includes("2026-03-10"), 'GitHub requests must pin the current REST API version');
assert(flushBody.includes('while(gh.active&&gh.published<gh.mine)'), 'messages arriving during a write must be flushed before the sender goes idle');
assert(flushBody.includes('queued for retry'), 'a failed write must remain queued for retry');
assert(flushBody.includes('if(gh.sendFailures)'), 'a retry must reconcile the room file in case GitHub accepted a write whose response was lost');
assert(clientFn('ghWrite').includes("response.status===409"), 'write conflicts must be retried');
assert(!clientFn('ghWrite').includes("response.status===409||response.status===422"), 'validation errors must not be mistaken for write conflicts');
for (const [status, why] of [['401','a rejected token'],['404','a missing repository'],['403','a refused request']])
  assert(clientFn('ghFail').includes(status), `${why} must be explained`);

// LAN sends have an application-level id so retrying after a lost acknowledgement
// cannot submit the same plan twice. The queue is drained serially and backed off.
assert(clientFn('lanSend').includes('messageId()'), 'every LAN message must have an idempotency id');
assert(clientFn('lanFlush').includes('while(lan.active&&lan.outbox.length)'), 'LAN messages must be sent in order');
assert(clientFn('lanFlush').includes('queued for retry'), 'an interrupted LAN send must remain queued');
assert(clientFn('lanRequest').includes('AbortController'), 'a dead LAN request must time out instead of hanging forever');

// --- connection code handling -----------------------------------------------
// Codes travel through chat and mail, which wrap lines, quote replies and
// rewrite punctuation. base64url survives that; + / and = do not.
const packBody = clientFn('pack');
assert(packBody.includes("g,'-')") && packBody.includes("g,'_')"),
  'codes must be base64url so chat and mail cannot corrupt them');
const cleanBody = clientFn('cleanCode');
for (const [pattern, why] of [
  ['\\s+', 'wrapped lines must be repaired'],
  ['^[>\\s]+', 'quoted replies must be unwrapped'],
  ['u200B', 'zero-width characters must be removed'],
  ['u201C', 'smart quotes must be removed'],
]) assert(cleanBody.includes(pattern), why);

// Every rejection names what is actually wrong, so nobody is left guessing.
const unpackBody = clientFn('unpack');
assert(unpackBody.includes('indexOf(prefix)'), 'a code must be found anywhere in a pasted blob');
assert(unpackBody.includes('It belongs in the other box'), 'the wrong kind of code must be named');
assert(unpackBody.includes('Only part of the code'), 'a truncated code must be named');
assert(clientFn('decodeCode').includes('altered in transit'), 'a corrupted code must be named');
assert(clientFn('applyAnswer').includes('older invitation'), 'a superseded code must be named');
// An invitation absorbs exactly one response. Pressing connect again used to reach
// WebRTC and surface "Called in wrong state: stable", which explains nothing.
{
  const body = clientFn('applyAnswer');
  const guard = body.indexOf("signalingState!=='have-local-offer'");
  assert(guard >= 0, 'applyAnswer must check the peer state before using a response');
  assert(guard < body.indexOf('setRemoteDescription'),
    'the state check must come before setRemoteDescription so WebRTC cannot throw at the player');
  assert(body.includes('already connected'), 'a link already up must say so');
  assert(body.includes('NEW LINK CODE'), 'a consumed invitation must point at the fix');
}

// A reconnect replaces the transport and keeps the campaign.
for (const fn of ['createOffer', 'createAnswer']) {
  assert(clientFn(fn).includes('rejoin'), `${fn}() must support reconnecting mid-campaign`);
  assert(clientFn(fn).includes("$('#outCode').value=''"),
    `${fn}() must clear the previous code so a stale one is never copied`);
}
// Completion belongs to the link, not to whether a campaign happens to exist,
// or a reconnect would never re-introduce the players to each other.
assert.equal(clientFn('handshakeDone').includes('game'), false,
  'handshake completion must not be inferred from game state');

// A brief drop is given time to heal; a failed one needs codes only a human can carry.
const peerBody = clientFn('newPeer');
assert(peerBody.includes("s==='disconnected'") && peerBody.includes('dropGrace'),
  'a brief disconnect must be given time to recover');
assert(clientFn('linkLost').includes('new pair of codes'), 'an unrecoverable link must say what is needed');
assert(clientFn('waitIce').includes('onProgress'), 'route discovery must report progress');

// Browsers hide local addresses from pages, which is what stops a direct link
// forming across subnets. The launcher supplies it; the page adds a candidate
// naming it and keeps the mDNS one as a fallback.
const addressBody = clientFn('withLocalAddress');
assert(addressBody.includes('typ host'), 'only host candidates may be rewritten');
assert(addressBody.includes('.local'), 'only mDNS candidates may be replaced');
assert(addressBody.includes('lines.slice(at)'), 'the original candidates must be kept as fallbacks');
assert(clientFn('loadLanIp').includes('lanip='), 'the launcher must be able to supply the address');
assert(clientFn('loadLanIp').includes('branchWarsLanIp'), 'the address must be remembered between sessions');
for (const fn of ['createOffer', 'createAnswer']) {
  assert(clientFn(fn).includes('rememberLanIp()'), `${fn}() must pick up the entered address`);
  assert(clientFn(fn).includes('withLocalAddress('), `${fn}() must publish the address it was given`);
}

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((item) => item[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML ids must be unique');
const missingIds = [...html.matchAll(/\$\('#([^']+)'\)/g)]
  .map((item) => item[1])
  .filter((id) => !ids.includes(id));
assert.deepEqual([...new Set(missingIds)], [], 'every fixed client selector must target a real element');
assert(html.includes('id="ghGuide"'), 'Repository Link must include its first-time setup guide');
assert(clientFn('setMode').includes("'#ghGuide'"), 'the Repository Link guide must appear only with that mode');
for (const instruction of ['organization member', 'contents → read and write', 'pending requests', 'api.github.com']) {
  assert(html.toLowerCase().includes(instruction), `Repository Link setup guide must explain: ${instruction}`);
}

const lanServer = fs.readFileSync(path.join(root, 'BRANCH_WARS_LAN_SERVER.ps1'), 'utf8');
assert(lanServer.includes('[int]$Port = 8765'), 'the LAN server default port must remain 8765');
assert(lanServer.includes('[Net.IPAddress]::Any'), 'the LAN server must listen on every IPv4 interface, not only localhost');
assert(lanServer.includes('clientId') && lanServer.includes('SeenIds'), 'the LAN relay must deduplicate retried client messages');
assert(lanServer.includes('Messages.Count -gt 256'), 'the LAN relay must bound its in-memory message history');
assert(lanServer.includes("Get-NetIPConfiguration"), 'the launcher must prefer an active adapter with a default gateway');
assert(lanServer.includes("'/api/health'"), 'the LAN relay must expose a remote health check');
assert(lanServer.includes('${lanUrl}api/health'), 'the LAN server window must print its exact remote health-check address');
const launcher = fs.readFileSync(path.join(root, 'OPEN_BRANCH_WARS.bat'), 'utf8');
assert(launcher.includes("AddressFamily IPv4"), 'the local launcher must discover an IPv4 address for direct P2P');
assert(launcher.includes('#lanip='), 'the local launcher must pass the discovered address to the game');

// Every dynamic CSS state the client can emit must be defined somewhere in the stylesheets.
for (const cls of ['signal watch', 'signal hot', 'signal safe']) {
  assert(html.includes(`.${cls.split(' ').join('.')}`), `stylesheet must define .${cls.split(' ').join('.')}`);
}

console.log('Branch Wars engine tests passed: 48 long-run campaigns plus open-ended endings, capability, validation, migration, rematch, AI-coverage, direct-link session and UI contract checks.');
