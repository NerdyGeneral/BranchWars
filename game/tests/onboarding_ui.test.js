'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
let harness;
if (process.argv.includes('--source')) {
 const html = require('../tools/build_game.js').assemble().html, read = fs.readFileSync;
 const portable = path.resolve(__dirname, '../BRANCH_WARS.html');
 try {
  fs.readFileSync = function(file, ...args) { return path.resolve(String(file)) === portable ? html : read.call(this, file, ...args); };
  ({ harness } = require('./github_resilience.test.js'));
 } finally { fs.readFileSync = read; }
} else ({ harness } = require('./github_resilience.test.js'));
const copy = value => JSON.parse(JSON.stringify(value));
const options = { onboardingVersion: 1, relationshipOffersVersion: 1, regionalGrowthVersion: 1, advertisingVersion: 1,
 productProgramsVersion: 1, segmentDepositsVersion: 1, creditPerformanceVersion: 1,
 customerOwnershipVersion: 1, workforceVersion: 1, customerDemandVersion: 2,
 managementVersion: 2, serviceExpansionVersion: 1, campaignRulesVersion: 1,
 mode: 'hotseat', seed: 42, created: 1 };
function setup(share = 25, enabled = true) {
 const h = harness(); h.c.options = { ...options, onboardingVersion: enabled ? 1 : 0 }; h.c.initialShare = share;
 const panel = h.c.document.querySelector('#productProgramsPanel'); let content = '';
 // Real innerHTML replacement discards listeners on removed descendants.
 Object.defineProperty(panel, 'innerHTML', { configurable: true, get: () => content, set(value) {
  content = value;
  for (const [selector, control] of h.elements) if (selector.startsWith('#onboarding-')) control.listeners = {};
 } });
 h.run("game=E.createGame(options);seat=0;workspaceTab='products';productDeskView='onboarding';" +
  "E.finishProject(game,game.players[0],{key:'licenseRewards'});" +
  "for(const row of Object.values(game.players[0].productPrograms.markets))row.connected={essential:1,rewards:4,highYield:0};" +
  "game.players[0].allocation={service:4,business:1,lending:1,operations:2};game.players[0].householdBook.policy.retention=25;" +
  "game.players[0].relationshipOffers.policy={market:'downtown',segment:'connected',product:'rewards',share:0};" +
  "if(game.players[0].onboarding)game.players[0].onboarding.policy={market:'downtown',segment:'connected',product:'rewards',share:initialShare};" +
  "newDraft(E.publicState(game,0));draft.decision='b';draft.management.research.enabled=false;draft.investments={};" +
  "renderProducts=v=>renderProductPrograms(v);renderProjects=()=>{};renderReady=()=>{};" +
  "const originalOnboardingReview=E.onboardingReview;onboardingCalls=0;seenOnboardingQuote=null;seenOnboardingDraft=null;" +
  "E.onboardingReview=(p,g,q)=>{onboardingCalls++;seenOnboardingDraft=JSON.parse(JSON.stringify(p));seenOnboardingQuote=originalOnboardingReview(p,g,q);return seenOnboardingQuote};" +
  "renderProductPrograms(currentView());");
 return h;
}
const html = h => h.elements.get('#productProgramsPanel').innerHTML;
function change(h, field, value) {
 const control = h.elements.get('#onboarding-' + field);
 assert(control?.listeners.change, 'actual rendered control has a handler: ' + field);
 return control.listeners.change({ target: { value: String(value) } });
}
function dueBatch(h) {
 h.run("game.cycle=2;game.players[0].onboarding.lastCycle=1;game.players[0].onboarding.pending=[{createdCycle:1,eligibleCycle:2,expiresCycle:4,market:'downtown',segment:'connected',product:'rewards',count:20,principal:100000,awareness:0}];newDraft(currentView());draft.decision='b';draft.management.research.enabled=false;draft.investments={};renderProductPrograms(currentView())");
}

const legacy = setup(0, false);
assert.equal(legacy.run('productDeskView'), 'development');
assert.equal(legacy.run('onboardingCalls'), 0);
assert.doesNotMatch(html(legacy), /data-product-view="onboarding"|APPLICATIONS &amp; ONBOARDING/);
assert.equal(legacy.run("stageOnboarding(currentView(),'share',25)"), false);
assert.equal(legacy.run('draft.onboardingPolicy'), undefined, 'older-rule drafts do not gain the new field');

const h = setup(), world = h.run('JSON.stringify(game)'), before = h.run('JSON.stringify(draft)');
h.run('view=currentView();sourceView=JSON.stringify(view);renderProductPrograms(view);renderProductPrograms(view)');
assert.equal(h.run('JSON.stringify(game)'), world, 'rendering cannot mutate accounts, pending requests, policies or RNG');
assert.equal(h.run('JSON.stringify(view)'), h.run('sourceView'));
assert.equal(h.run('JSON.stringify(draft)'), before);
assert.match(html(h), /data-product-view="onboarding"[^>]*>Applications & onboarding/);
assert.match(html(h), /Pending applications are not owned households or deposits/);
assert.match(html(h), /do not reserve outside customers or funds/);
assert.match(html(h), /No same-month activation/);
assert.match(html(h), /M\+1 or M\+2 and expire in M\+3/);
assert.match(html(h), /Eligible-age applications/);
assert.match(html(h), /Eligible requests still waiting/);
assert.match(html(h), /not accepted customers/);
assert.match(html(h), /No completed onboarding month yet/);
assert.match(html(h), /CONDITIONAL CURRENT-MONTH QUOTE/);
assert.equal(h.run('seenOnboardingQuote.assignedStaff'), .75);
assert.equal(h.run('seenOnboardingQuote.salesStaff'), 2.25);

// All residual time and spending inputs must come from the same staged plan.
const inputs = setup(0);
inputs.run("draft.allocation={service:2,business:2,lending:2,operations:2};draft.householdPolicy.retention=50;draft.relationshipOfferPolicy.share=50;draft.onboardingPolicy.share=50;draft.depositPolicy='margin';draft.advertisingPolicy.budget=15000;renderProductPrograms(currentView())");
assert.equal(inputs.run('seenOnboardingQuote.assignedStaff'), .25);
assert.equal(inputs.run('seenOnboardingQuote.salesStaff'), .25);
assert.equal(inputs.run('seenOnboardingDraft.policies.deposit'), 'margin');
assert.equal(inputs.run('seenOnboardingDraft.advertising.policy.budget'), 15000);
assert.equal(inputs.run('seenOnboardingDraft.relationshipOffers.policy.share'), 50);
assert.equal(inputs.run('seenOnboardingDraft.onboarding.policy.share'), 50);
assert.equal(inputs.run('seenOnboardingDraft._onboardingBudget'), inputs.run('E.onboardingBudget(seenOnboardingDraft,draft)'));
assert.equal(inputs.run('seenOnboardingDraft._relationshipOfferBudget'), inputs.run('E.relationshipOfferBudget(seenOnboardingDraft,draft)'));

// The same draft reservation must survive moving between all related desks.
const crossTab = setup(0);
crossTab.run("draft.allocation={service:2,business:2,lending:2,operations:2};draft.householdPolicy.retention=50;draft.relationshipOfferPolicy.share=50;draft.advertisingPolicy.budget=15000;renderProductPrograms(currentView())");
assert(change(crossTab, 'share', 50));
crossTab.run("const originalAdPreview=E.advertisingPreview,originalHouseholdReview=E.householdServiceReview,originalOfferReview=E.relationshipOfferReview;seenAdStaff=null;seenHouseholdStaff=null;seenOfferStaff=null;E.advertisingPreview=(...args)=>{const q=originalAdPreview(...args);seenAdStaff=q.staff;return q};E.householdServiceReview=(...args)=>{const q=originalHouseholdReview(...args);seenHouseholdStaff=q.salesStaff;return q};E.relationshipOfferReview=(...args)=>{const q=originalOfferReview(...args);seenOfferStaff=q.salesStaff;return q}");
const crossWorld = crossTab.run('JSON.stringify(game)'), crossDraft = crossTab.run('JSON.stringify(draft)');
crossTab.run("view=currentView();crossViewBefore=JSON.stringify(view);productDeskView='advertising';renderProductPrograms(view);productDeskView='relationships';renderProductPrograms(view);workspaceTab='customers';renderHouseholds(view)");
assert.equal(crossTab.run('seenAdStaff'), .25, 'Advertising uses post-retention, post-offer, post-onboarding Retail time');
assert.equal(crossTab.run('seenHouseholdStaff'), .25, 'Customers shows the same residual acquisition time');
assert.equal(crossTab.run('seenOfferStaff'), .5, 'the saved offer report retains its pre-onboarding residual contract');
assert.match(html(crossTab), /0\.25 bankers left for new customers/, 'Existing customers displays the post-onboarding acquisition residual');
assert.equal(crossTab.run('JSON.stringify(view)'), crossTab.run('crossViewBefore'));
assert.equal(crossTab.run('JSON.stringify(game)'), crossWorld); assert.equal(crossTab.run('JSON.stringify(draft)'), crossDraft);
crossTab.run("workspaceTab='products';productDeskView='onboarding';renderProductPrograms(view)");
assert(change(crossTab, 'share', 0));
crossTab.run("productDeskView='advertising';renderProductPrograms(view);productDeskView='relationships';renderProductPrograms(view);workspaceTab='customers';renderHouseholds(view)");
assert.equal(crossTab.run('seenAdStaff'), .5); assert.equal(crossTab.run('seenHouseholdStaff'), .5); assert.equal(crossTab.run('seenOfferStaff'), .5);
assert.match(html(crossTab), /0\.50 bankers left for new customers/, 'pausing onboarding restores the same acquisition time in Existing customers');

const market = setup(), focus = market.run('draft.focus'), marketWorld = market.run('JSON.stringify(game)');
assert(change(market, 'market', 'university'));
assert.equal(market.run('draft.onboardingPolicy.market'), 'university');
assert.equal(market.run('draft.focus'), focus);
assert.equal(market.run('JSON.stringify(game)'), marketWorld);
assert(change(market, 'share', 50));
assert.equal(market.run('draft.onboardingPolicy.share'), 50);
assert(change(market, 'share', 0));
assert.equal(market.run('draft.onboardingPolicy.share'), 0);

const invalid = setup(), validDraft = invalid.run('JSON.stringify(draft)');
assert.equal(change(invalid, 'share', 17), false);
assert.equal(invalid.run('JSON.stringify(draft)'), validDraft);
assert.equal(invalid.run("stageOnboarding(currentView(),'unknown',25)"), false);

const poor = setup(0); dueBatch(poor);
assert.match(html(poor), /Current pending requests · 20/);
assert.match(html(poor), /20 pending requests · \$100,000 requested principal; not deposits/);
assert.match(html(poor), /eligible M2–M3 · expires M4/);
assert.match(html(poor), /Source-month awareness/);
assert.match(html(poor), /not measured causal lift/);
poor.run('game.players[0].stats.cash=1;renderProductPrograms(currentView())');
const poorDraft = poor.run('JSON.stringify(draft)'), poorWorld = poor.run('JSON.stringify(game)');
assert(poor.run('E.onboardingBudget(game.players[0],{...draft,onboardingPolicy:{...draft.onboardingPolicy,share:25}})>0'));
assert.equal(change(poor, 'share', 25), false);
assert.equal(poor.run('JSON.stringify(draft)'), poorDraft);
assert.equal(poor.run('JSON.stringify(game)'), poorWorld);

const decommit = setup(25); dueBatch(decommit);
decommit.run('game.players[0].stats.cash=1;draft.hires=1;renderProductPrograms(currentView())');
assert.equal(decommit.run('E.projectPlanStatus(game.players[0],draft).eligible'), false);
assert(change(decommit, 'share', 0));
assert.equal(decommit.run('draft.onboardingPolicy.share'), 0);
assert.equal(decommit.run('draft.hires'), 1);
assert.equal(decommit.run('E.projectPlanStatus(game.players[0],draft).eligible'), false, 'pause only repairs its own commitment');

const retirement = setup(25), retirementWorld = retirement.run('JSON.stringify(game)');
assert(retirement.run("toggleProductRetirement(currentView(),'rewards')"));
assert.equal(retirement.run('draft.onboardingPolicy.share'), 0);
assert.equal(retirement.run('JSON.stringify(game)'), retirementWorld);
assert.match(html(retirement), /selected product is closed/);
const closed = setup(25);
closed.run('draft.productProgramPolicy.markets.downtown.connected.rewards=0;renderProductPrograms(currentView())');
assert.equal(closed.run('seenOnboardingDraft.onboarding.policy.share'), 0);
assert.equal(closed.run('draft.onboardingPolicy.share'), 25, 'normalizing a quote cannot silently rewrite the draft');
const cancelled = setup(25); dueBatch(cancelled);
const cancellationWorld = cancelled.run('JSON.stringify(game)');
assert(cancelled.run("toggleProductRetirement(currentView(),'rewards')"));
assert.equal(cancelled.run('seenOnboardingQuote.totals.cancelled.count'), 20);
assert.equal(cancelled.run('game.players[0].onboarding.pending[0].count'), 20, 'a retirement quote cannot cancel the live queue before settlement');
assert.equal(cancelled.run('JSON.stringify(game)'), cancellationWorld);
assert.match(html(cancelled), /product is now closed or retired/);
const expiry = setup(0); dueBatch(expiry);
expiry.run('game.cycle=4;game.players[0].onboarding.lastCycle=3;renderProductPrograms(currentView())');
assert.equal(expiry.run('seenOnboardingQuote.totals.expired.count'), 20, 'expiry continues while processing is paused');
assert.equal(expiry.run('seenOnboardingQuote.totals.due.count'), 0, 'expired applications are not presented as age-eligible');
assert.match(html(expiry), /two eligible months have passed/);
const switched = setup(25); dueBatch(switched);
assert(change(switched, 'market', 'university'));
assert.equal(switched.run('seenOnboardingQuote.policy.market'), 'university');
assert.equal(switched.run('seenOnboardingQuote.rows[0].market'), 'downtown', 'old targets remain visible in the bank-wide queue');
assert(switched.run('seenOnboardingQuote.rows[0].activated>0'), 'switching the generation target does not abandon valid old requests');
assert.match(html(switched), /Queue counts are bank-wide/);

for (const mutation of ["draft.depositPolicy='margin'", 'game.players[0].stats.cash--', 'game.cycle++', 'seat=1']) {
 const stale = setup(), handler = stale.elements.get('#onboarding-share').listeners.change;
 stale.run(mutation); const staleDraft = stale.run('JSON.stringify(draft)'), staleWorld = stale.run('JSON.stringify(game)');
 assert.equal(handler({ target: { value: '50' } }), false, 'a removed/stale control cannot edit a new source: ' + mutation);
 assert.equal(stale.run('JSON.stringify(draft)'), staleDraft); assert.equal(stale.run('JSON.stringify(game)'), staleWorld);
}
const replaced = setup();
replaced.run("const originalOnboardingStatus=E.projectPlanStatus;E.projectPlanStatus=(...args)=>{const result=originalOnboardingStatus(...args);draft.depositPolicy='margin';return result}");
assert.equal(change(replaced, 'share', 50), false, 'recheck the source after shared validation');
assert.equal(replaced.run('draft.onboardingPolicy.share'), 25);
assert.equal(replaced.run('draft.depositPolicy'), 'margin');

for (const terminal of [false, true]) {
 const locked = setup(), handler = locked.elements.get('#onboarding-share').listeners.change;
 locked.run(terminal ? 'game.gameOver=true' : 'game.players[0].submitted=JSON.parse(JSON.stringify(draft))');
 const lockedDraft = locked.run('JSON.stringify(draft)'), lockedWorld = locked.run('JSON.stringify(game)');
 assert.equal(handler({ target: { value: '0' } }), false);
 locked.run('onboardingCalls=0;renderProductPrograms(currentView())');
 assert.equal(locked.run('JSON.stringify(draft)'), lockedDraft); assert.equal(locked.run('JSON.stringify(game)'), lockedWorld);
 if (terminal) {
  assert.equal(locked.run('onboardingCalls'), 0, 'completed campaigns show actuals, not a fictional future quote');
  assert.doesNotMatch(html(locked), /id="onboarding-|CONDITIONAL CURRENT-MONTH QUOTE/);
  assert.match(html(locked), /Campaign complete/);
 } else assert.match(html(locked), /id="onboarding-share" disabled/);
}

const escaped = setup();
escaped.run("view=currentView();view.territories.downtown.name='<img src=x onerror=bad>';renderProductPrograms(view)");
assert.match(html(escaped), /&lt;img src=x onerror=bad&gt;/); assert.doesNotMatch(html(escaped), /<img/);

const actual = setup(50);
actual.run('E.submit(game,0,JSON.parse(JSON.stringify(draft)));E.submit(game,1,E.chooseBot(game,1));newDraft(currentView());renderProductPrograms(currentView())');
assert(actual.run('game.players[0].onboarding.report.totals.generated.count>0'));
assert.equal(actual.run('game.players[0].onboarding.report.totals.activated.count'), 0);
assert.match(html(actual), /LAST ACTUAL · MONTH 1/); assert.match(html(actual), /Actual activation expense/);
assert.match(html(actual), /requested; not deposits/);
actual.run("draft.decision='b';draft.management.research.enabled=false;draft.investments={};E.submit(game,0,JSON.parse(JSON.stringify(draft)));E.submit(game,1,E.chooseBot(game,1));newDraft(currentView());renderProductPrograms(currentView())");
assert(actual.run('game.players[0].onboarding.report.totals.activated.count>0'));
assert.match(html(actual), /LAST ACTUAL · MONTH 2/);
assert(actual.run('E.validatePilot(game)'));
console.log('Onboarding UI passed: shared draft quotes, pending-not-deposit timing, actual controls, feature hiding, residual staff, budget/pause repair, retirement, stale and locked views, escaping, purity and real later-month activation.');
