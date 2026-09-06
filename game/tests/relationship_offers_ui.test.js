'use strict';
const assert = require('node:assert/strict');
const { harness } = require('./github_resilience.test.js');
const copy = x => JSON.parse(JSON.stringify(x));
const options = { relationshipOffersVersion: 1, regionalGrowthVersion: 1, advertisingVersion: 1,
 productProgramsVersion: 1, segmentDepositsVersion: 1, creditPerformanceVersion: 1,
 customerOwnershipVersion: 1, workforceVersion: 1, customerDemandVersion: 2,
 managementVersion: 2, serviceExpansionVersion: 1, campaignRulesVersion: 1,
 mode: 'hotseat', seed: 42, created: 1 };
function setup(share = 25, enabled = true) {
 const h = harness(); h.c.options = { ...options, relationshipOffersVersion: enabled ? 1 : 0 }; h.c.offerShare = share;
 const panel = h.c.document.querySelector('#productProgramsPanel'); let content = '';
 // Replacing innerHTML discards old descendant listeners in a real browser.
 Object.defineProperty(panel, 'innerHTML', { configurable: true, get: () => content, set(value) {
  content = value;
  for (const [selector, control] of h.elements) if (selector.startsWith('#relationshipOffer-')) control.listeners = {};
 } });
 h.run("game=E.createGame(options);seat=0;workspaceTab='products';productDeskView='relationships';" +
  "E.finishProject(game,game.players[0],{key:'licenseRewards'});" +
  "for(const row of Object.values(game.players[0].productPrograms.markets))row.connected={essential:1,rewards:4,highYield:0};" +
  "game.players[0].allocation={service:4,business:1,lending:1,operations:2};game.players[0].householdBook.policy.retention=25;" +
  "if(game.players[0].relationshipOffers)game.players[0].relationshipOffers.policy={market:'downtown',segment:'connected',product:'rewards',share:offerShare};" +
  "newDraft(E.publicState(game,0));draft.decision='b';draft.management.research.enabled=false;draft.investments={};" +
  "renderProducts=v=>renderProductPrograms(v);renderProjects=()=>{};renderReady=()=>{};" +
  "renderProductPrograms(E.publicState(game,0));");
 return h;
}
const html = h => h.elements.get('#productProgramsPanel').innerHTML;
function change(h, field, value) {
 const control = h.elements.get('#relationshipOffer-' + field);
 assert(control?.listeners.change, 'actual rendered control registers its change handler: ' + field);
 control.listeners.change({ target: { value: String(value) } });
}

const legacy = setup(0, false);
assert.equal(legacy.run('productDeskView'), 'development', 'a stale new subview falls back for older campaigns');
assert.doesNotMatch(html(legacy), /data-product-view="relationships"|EXISTING CUSTOMER OFFERS/);
assert.match(html(legacy), /Development & retirement/);
const legacyWorld = legacy.run('JSON.stringify(game)');
legacy.run("productDeskView='advertising';renderProductPrograms(E.publicState(game,0))");
assert.match(html(legacy), /3\.00 banker equivalents/, 'older campaigns keep their full post-retention advertising time');
legacy.run("workspaceTab='customers';renderHouseholds(E.publicState(game,0))");
assert.match(legacy.elements.get('#householdPanel').innerHTML, /Retention \/ sales capacity/);
assert.equal(legacy.run('JSON.stringify(game)'), legacyWorld);

const h = setup();
const world = h.run('JSON.stringify(game)'), draftBefore = h.run('JSON.stringify(draft)'), focus = h.run('draft.focus');
h.run('renderProductPrograms(E.publicState(game,0))');
assert.equal(h.run('JSON.stringify(game)'), world, 'review must not mutate accounts, policies or RNG');
assert.equal(h.run('JSON.stringify(draft)'), draftBefore, 'review must not mutate the draft');
assert.match(html(h), /data-product-view="relationships"[^>]*>Existing customers/);
assert.match(html(h), /Eligible existing balances|Locked \/ guaranteed balances excluded/);
assert.match(html(h), /conversion equivalents/);
assert.match(html(h), /CURRENT-BOOK QUOTE/);
assert.match(html(h), /No completed offer month yet/);
assert.match(html(h), /does not add multiple-product ownership, households or deposit funds/);
assert.match(html(h), /before retention, maturities, repricing/);
assert.match(html(h), /Positive means more recurring cost/);
const pricing = setup();
pricing.run("draft.depositPolicy='aggressive';const originalOfferReview=E.relationshipOfferReview;seenOfferPricing=null;E.relationshipOfferReview=(p,g,q)=>{seenOfferPricing=p.policies.deposit;return originalOfferReview(p,g,q)};renderProductPrograms(E.publicState(game,0))");
assert.equal(pricing.run('seenOfferPricing'), 'aggressive', 'the shared quote receives draft deposit pricing, not the previous policy');

// Advertising and Customers share the draft's residual sales time. Switching
// tabs must neither revert to the standing instruction nor mutate public state.
const crossTab = setup(0);
crossTab.run("draft.allocation={service:1,business:2,lending:2,operations:3};draft.advertisingPolicy.budget=15000;renderProductPrograms(E.publicState(game,0))");
change(crossTab, 'share', 50);
crossTab.run("const sharedAdQuote=E.advertisingPreview,sharedHouseholdReview=E.householdServiceReview;seenAdQuote=null;seenHouseholdReview=null;E.advertisingPreview=(p,g,q)=>{seenAdQuote={share:p.relationshipOffers?.policy.share,...sharedAdQuote(p,g,q)};return seenAdQuote};E.householdServiceReview=(p,a,q)=>{seenHouseholdReview={share:p.relationshipOffers?.policy.share,...sharedHouseholdReview(p,a,q)};return seenHouseholdReview}");
const crossWorld = crossTab.run('JSON.stringify(game)'), crossDraft = crossTab.run('JSON.stringify(draft)');
crossTab.run("view=E.publicState(game,0);crossViewBefore=JSON.stringify(view);productDeskView='advertising';renderProductPrograms(view);workspaceTab='customers';renderHouseholds(view)");
assert.equal(crossTab.run('seenAdQuote.share'), 50);
assert.equal(crossTab.run('seenAdQuote.staff'), .375, 'Advertising reserves the staged offer time after retention');
assert.equal(crossTab.run('seenHouseholdReview.salesStaff'), .375, 'Customers shows the same staged acquisition capacity');
const activeBoost = crossTab.run('seenAdQuote.boost');
assert(activeBoost > 0);
assert.equal(crossTab.run('JSON.stringify(view)'), crossTab.run('crossViewBefore'));
assert.equal(crossTab.run('JSON.stringify(game)'), crossWorld);
assert.equal(crossTab.run('JSON.stringify(draft)'), crossDraft);
crossTab.run("workspaceTab='products';productDeskView='relationships';renderProductPrograms(view)");
change(crossTab, 'share', 0);
crossTab.run("productDeskView='advertising';renderProductPrograms(view);workspaceTab='customers';renderHouseholds(view)");
assert.equal(crossTab.run('seenAdQuote.staff'), .75, 'Pausing restores draft advertising sales time');
assert.equal(crossTab.run('seenAdQuote.boost'), activeBoost * 2, 'Targeting boost uses residual time rather than the previous instruction');
assert.equal(crossTab.run('seenHouseholdReview.salesStaff'), .75);
crossTab.run("draft.relationshipOfferPolicy.share=50;view.me.submitted=true;crossViewBefore=JSON.stringify(view);workspaceTab='products';renderProductPrograms(view);workspaceTab='customers';renderHouseholds(view)");
assert.equal(crossTab.run('seenAdQuote.staff'), .375, 'Sealed draft previews retain the submitted offer split');
assert.equal(crossTab.run('seenHouseholdReview.salesStaff'), .375);
assert.equal(crossTab.run('JSON.stringify(view)'), crossTab.run('crossViewBefore'));
crossTab.run("view.gameOver=true;crossViewBefore=JSON.stringify(view);renderHouseholds(view)");
assert.equal(crossTab.run('JSON.stringify(view)'), crossTab.run('crossViewBefore'), 'Terminal customer review does not rewrite public policy');
assert.equal(crossTab.run('JSON.stringify(game)'), crossWorld);

const market = setup();
const marketWorld = market.run('JSON.stringify(game)'), marketFocus = market.run('draft.focus');
change(market, 'market', 'university');
assert.equal(market.run('draft.relationshipOfferPolicy.market'), 'university');
assert.equal(market.run('draft.focus'), marketFocus, 'offer-market selection must preserve plan focus');
assert.equal(market.run('JSON.stringify(game)'), marketWorld, 'a control stages only the draft');

const invalid = setup();
const validDraft = invalid.run('JSON.stringify(draft)');
change(invalid, 'share', 17);
assert.equal(invalid.run('JSON.stringify(draft)'), validDraft, 'invalid shares pass through the shared normalizer and preserve the draft');
assert.equal(invalid.run("stageRelationshipOffer(E.publicState(game,0),'unknown',25)"), false);

const poor = setup(0);
poor.run('game.players[0].stats.cash=1;renderProductPrograms(E.publicState(game,0))');
const poorDraft = poor.run('JSON.stringify(draft)'), poorWorld = poor.run('JSON.stringify(game)');
assert(poor.run('E.relationshipOfferBudget(game.players[0],{...draft,relationshipOfferPolicy:{...draft.relationshipOfferPolicy,share:25}})>0'));
change(poor, 'share', 25);
assert.equal(poor.run('JSON.stringify(draft)'), poorDraft, 'increasing offer spending must pass projectPlanStatus');
assert.equal(poor.run('JSON.stringify(game)'), poorWorld);

const decommit = setup(25);
decommit.run('game.players[0].stats.cash=1;draft.hires=1;renderProductPrograms(E.publicState(game,0))');
assert.equal(decommit.run('E.projectPlanStatus(game.players[0],draft).eligible'), false);
assert(decommit.run('E.relationshipOfferBudget(game.players[0],draft)>0'));
change(decommit, 'share', 0);
assert.equal(decommit.run('draft.relationshipOfferPolicy.share'), 0, 'pausing remains available during partial budget repair');
assert.equal(decommit.run('draft.hires'), 1, 'pausing does not remove other commitments');
assert.equal(decommit.run('E.projectPlanStatus(game.players[0],draft).eligible'), false, 'partial repair does not pretend the rest of the draft is affordable');

const retirement = setup(25);
assert(retirement.run("toggleProductRetirement(E.publicState(game,0),'rewards')"));
assert.deepEqual(copy(retirement.run('draft.productProgramPolicy.retire')), ['rewards']);
assert.equal(retirement.run('draft.relationshipOfferPolicy.share'), 0, 'retirement normalizes the recurring offer to paused');

const sealed = setup(25);
sealed.run('view=E.publicState(game,0);view.me.submitted=true;renderProductPrograms(view)');
const sealedDraft = sealed.run('JSON.stringify(draft)'), sealedWorld = sealed.run('JSON.stringify(game)');
assert.match(html(sealed), /id="relationshipOffer-share" disabled/);
change(sealed, 'share', 0);
assert.equal(sealed.run('JSON.stringify(draft)'), sealedDraft, 'even an invoked disabled handler cannot edit a sealed plan');
assert.equal(sealed.run('JSON.stringify(game)'), sealedWorld);

const escaped = setup();
escaped.run("view=E.publicState(game,0);view.territories.downtown.name='<img src=x onerror=bad>';renderProductPrograms(view)");
assert.match(html(escaped), /&lt;img src=x onerror=bad&gt;/);
assert.doesNotMatch(html(escaped), /<img/);

const resolved = setup(25);
resolved.run('E.submit(game,0,JSON.parse(JSON.stringify(draft)));E.submit(game,1,E.chooseBot(game,1));newDraft(E.publicState(game,0));renderProductPrograms(E.publicState(game,0))');
assert(resolved.run('game.players[0].relationshipOffers.report!==null'));
assert.match(html(resolved), /LAST ACTUAL · MONTH 1/);
assert.match(html(resolved), /Actual conversion expense/);
assert.doesNotMatch(html(resolved), /No completed offer month yet/);
resolved.run('view=E.publicState(game,0);view.gameOver=true;renderProductPrograms(view)');
const terminalDraft = resolved.run('JSON.stringify(draft)');
assert.match(html(resolved), /Campaign complete\. No further offers can be staged/);
assert.match(html(resolved), /LAST ACTUAL · MONTH 1/);
assert.doesNotMatch(html(resolved), /CURRENT-BOOK QUOTE|id="relationshipOffer-/);
assert.equal(resolved.run("stageRelationshipOffer(view,'share',0)"), false);
assert.equal(resolved.run('JSON.stringify(draft)'), terminalDraft);
assert.equal(h.run('draft.focus'), focus);
console.log('Relationship offers UI passed: real control handlers, old-rule compatibility, shared quotes, cross-tab residual sales capacity, focus isolation, spending gates and pause repair, retirement auto-pause, sealed plans, escaping and actual monthly results.');
