'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../BRANCH_WARS.html'), 'utf8');
const copy = x => JSON.parse(JSON.stringify(x)), context = { console };
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={',
  'root.cashTest={aiCashPlanningReview,planFinalCashReserve,applyDecision,startProject,syncAccounts,syncServiceBook,serviceLoad,serviceBidStatus,planHouseholdService};root.BWEngine={'), context);
const E = context.BWEngine, H = context.cashTest;
const options = { productProgramsVersion:1, segmentDepositsVersion:1, creditPerformanceVersion:1,
  customerOwnershipVersion:1, workforceVersion:1, customerDemandVersion:2, managementVersion:2,
  serviceExpansionVersion:1, campaignRulesVersion:1, mode:'hotseat', seed:'cash-reserve', created:1 };
const fresh = extra => E.createGame({ ...options, ...extra });
const plan = p => {
  const q = { focus:p.focus, allocation:{ ...p.allocation }, decision:'a', depositPolicy:'balanced',
    lendingPolicy:'balanced', capitalPolicy:'balanced', products:{ ...p.products }, newProjects:['remediation'],
    newProject:'remediation', investments:{}, hires:0, competitiveAction:'none' };
  E.normalizeProductProgramPlan(p, q);
  return q;
};
const cash = (p, amount) => {
  const moved = p.stats.cash - amount;
  p.accounting = E.AccountingPrototype.post(p.accounting, 'test.liquid-allocation', { cash:-moved, securities:moved });
  H.syncAccounts(p);
};
// Reproduce the actual boundary: the shared project quote is affordable, but
// the already-announced executive call settles first and consumes that cash.
const tight = fresh(), owner = tight.players[0];
tight.event = { ...tight.event, key:'audit' }; cash(owner, 200000);
const proposal = plan(owner), old = copy(tight);
assert(E.projectPlanStatus(owner, proposal).eligible);
H.applyDecision(old, old.players[0], 'a');
assert(H.startProject(old, old.players[0], 'remediation').includes('cash changed before execution'));
const frozen = JSON.stringify(tight), frozenPlan = JSON.stringify(proposal);
const review = H.aiCashPlanningReview(tight, 0, proposal), revised = H.planFinalCashReserve(tight, 0, proposal);
assert.equal(review.decisionExpense, 130000); assert.equal(review.limit, 0);
assert.deepEqual(copy(E.planInitiatives(revised)), []);
assert.equal(JSON.stringify(tight), frozen, 'review/planning must not mutate live accounts, ledgers, RNG or policies');
assert.equal(JSON.stringify(proposal), frozenPlan, 'final pass must not alter its caller proposal');
assert.deepEqual(copy(H.planFinalCashReserve(tight, 0, revised)), copy(revised), 'reserve pass is idempotent');
const concealed = copy(tight); concealed.players[1].submitted = { competitiveAction:'talentRaid', investments:{ network:250000 } };
assert.deepEqual(copy(H.planFinalCashReserve(concealed, 0, proposal)), copy(revised), 'concealed rival plans cannot inform cash planning');
const depleted = fresh(); depleted.event = { ...depleted.event, key:'audit' }; cash(depleted.players[0], 0);
const depletedBefore = JSON.stringify(depleted), depletedReview = H.aiCashPlanningReview(depleted, 0, plan(depleted.players[0]));
assert(depletedReview.decisionExpense >= 130000, 'forced-funding losses are not treated as spendable cash');
assert.equal(depletedReview.limit, 0); assert.equal(JSON.stringify(depleted), depletedBefore);
// Known costs include the paid B choices, not just a blanket assumption about A.
for (const [key, decision, expense] of [['succession','b',210000],['housing','b',50000],['vendor','b',90000],['expansion','a',0]]) {
  const g = fresh(); g.event = { ...g.event, key };
  const q = { ...plan(g.players[0]), decision };
  assert.equal(H.aiCashPlanningReview(g, 0, q).decisionExpense, expense);
}
// All late additions share one final ceiling. The guard removes spend, never
// switches to a cheaper pretend quote or depends on this month's hoped-for profit.
const late = fresh(), lp = late.players[0]; cash(lp, 600000);
late.event = { ...late.event, key:'quiet' };
const over = plan(lp); over.investments = { network:250000, digital:50000 }; over.hires = 1;
const cap = H.aiCashPlanningReview(late, 0, over), final = H.planFinalCashReserve(late, 0, over);
assert(E.planBudget(lp, over).total > cap.limit);
assert(E.planBudget(lp, final).total <= cap.limit);
assert(E.projectPlanStatus(lp, final).eligible);
assert(E.planBudget(lp, final).total < E.planBudget(lp, over).total);
assert.deepEqual(copy(final.allocation), copy(over.allocation));
const executing = copy(late); H.applyDecision(executing, executing.players[0], final.decision);
for (const key of E.planInitiatives(final)) assert(H.startProject(executing, executing.players[0], key).includes('began'));
// Funding may improve later: lack of cash never creates a permanent AI lockout.
const healthy = fresh(), funded = H.planFinalCashReserve(healthy, 0, plan(healthy.players[0]));
assert(E.planInitiatives(funded).includes('remediation'));
// Balanced seed20 reached this interaction at month286: a recovery allocation
// added generalists to Business, diluting delivery specialists' reserved share.
// The earlier bid covered nine points; the final unchanged reservation did not.
const bidding = fresh(), bp = bidding.players[0];
let merchant = false;
for (const c of bidding.serviceAgreements) {
  c.owner = c.kind === 'treasury' || c.kind === 'merchant' && !merchant ? bp.id : null;
  if (c.kind === 'merchant' && c.owner) merchant = true;
}
H.syncServiceBook(bidding);
bp.workforce.departments.business.count = 3; bp.workforce.departments.business.skill = 60;
bp.serviceDesk.applications.treasury = 'build';
bp.serviceDesk.policy = { ...bp.serviceDesk.policy, staff:2, outsourcing:4, treasury:true };
bp.allocation = { service:4, business:2, lending:1, operations:1 };
const bid = bidding.serviceAgreements.find(c => c.kind === 'payroll'); bid.due = bidding.cycle;
assert(Math.abs(H.serviceLoad(bp).capacity - 9.12) < 1e-9); assert(H.serviceBidStatus(bp,bid).eligible);
const bidPlan = plan(bp); Object.assign(bidPlan, { newProjects:[], newProject:null, contractBid:bid.id,
  servicePolicy:copy(bp.serviceDesk.policy), allocation:{ service:2, business:4, lending:1, operations:1 } });
const finalOwner = q => ({ ...bp, allocation:q.allocation, serviceDesk:{ ...bp.serviceDesk, policy:q.servicePolicy } });
assert(Math.abs(H.serviceLoad(finalOwner(bidPlan)).capacity - 8.84) < 1e-9);
assert(!H.serviceBidStatus(finalOwner(bidPlan),bid).eligible);
const bidBefore = JSON.stringify(bidding), bidInput = JSON.stringify(bidPlan);
const supported = H.planFinalCashReserve(bidding,0,bidPlan);
assert.equal(supported.contractBid, bid.id); assert.equal(supported.servicePolicy.staff, 3);
assert.equal(supported.servicePolicy.outsourcing, 4); assert(H.serviceBidStatus(finalOwner(supported),bid).eligible);
assert.equal(JSON.stringify(bidding), bidBefore); assert.equal(JSON.stringify(bidPlan), bidInput);
const noBankers = copy(bidPlan); noBankers.allocation = { service:6, business:0, lending:1, operations:1 }; noBankers.servicePolicy.staff = 0;
assert.equal(H.planFinalCashReserve(bidding,0,noBankers).contractBid, null, 'an impossible bid must be unstaged, not granted free capacity');
E.submit(bidding,0,supported); // The real unchanged plan validator accepts the repaired bid.
// If cash planning withdraws the ad budget, restore the ordinary retention
// mandate and recalculate reserves; do not leave campaign sales time released.
const stopped = fresh({ advertisingVersion:1 }), ap = stopped.players[0]; cash(ap,200000);
stopped.event = { ...stopped.event, key:'audit' };
const adPlan = plan(ap); adPlan.newProjects = []; adPlan.newProject = null;
adPlan.advertisingPolicy = { market:ap.focus, segment:'everyday', product:'essential', budget:15000 };
adPlan.householdPolicy = { retention:25, priority:{ everyday:1, connected:1, reserve:1 } };
const expectedRetention = H.planHouseholdService(stopped,0,adPlan).householdPolicy;
const stoppedBefore = JSON.stringify(stopped), stoppedPlan = H.planFinalCashReserve(stopped,0,adPlan);
assert.equal(stoppedPlan.advertisingPolicy.budget,0);
assert.deepEqual(copy(stoppedPlan.householdPolicy),copy(expectedRetention));
assert(E.planBudget(ap,stoppedPlan).total <= H.aiCashPlanningReview(stopped,0,stoppedPlan).limit);
assert.equal(JSON.stringify(stopped),stoppedBefore);
// No behavior/version change to old campaigns, including the pre-programmes preview.
for (const settings of [{ productProgramsVersion:0 }, { productProgramsVersion:0, segmentDepositsVersion:0 }]) {
  const g = fresh(settings), q = plan(g.players[0]);
  assert.equal(H.aiCashPlanningReview(g, 0, q), null);
  assert.strictEqual(H.planFinalCashReserve(g, 0, q), q);
}
let turns = 0, initiatives = 0, competitiveActions = 0;
for (const scenario of Object.keys(E.SCENARIOS)) {
  const g = fresh({ scenario, seed:'cash-reserve-'+scenario });
  for (let month=0; month<24 && !g.gameOver; month++) {
    const plans = [E.chooseBot(g,0), E.chooseBot(g,1)];
    for (const [i,q] of plans.entries()) {
      const ceiling = H.aiCashPlanningReview(g,i,q);
      assert(E.planBudget(g.players[i],q).total <= ceiling.limit);
      initiatives += E.planInitiatives(q).length;
      competitiveActions += q.competitiveAction !== 'none';
    }
    E.submit(g,0,plans[0]); E.submit(g,1,plans[1]);
    E.validatePilot(g); E.validateLedger(g);
    assert(!g.resolution.some(x => x.includes('cancelled') && x.includes('cash changed before execution')));
    for (const p of g.players) E.AccountingPrototype.check(p.accounting);
    turns++;
  }
}
assert(initiatives > 0, 'cash reserve must not disable all expansion');
assert(competitiveActions > 0, 'cash reserve must not disable all competition');
console.log(JSON.stringify({ passed:true, turns, initiatives, competitiveActions,
  checks:['known-call cost regression','pure reserve review','late commitments','funded retry','legacy no-op','seeded settlement'] },null,2));
