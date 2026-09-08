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
const options = { relationshipOffersVersion:1, regionalGrowthVersion:1, advertisingVersion:1, productProgramsVersion:1,
 segmentDepositsVersion:1, creditPerformanceVersion:1, customerOwnershipVersion:1, workforceVersion:1, customerDemandVersion:2,
 managementVersion:2, serviceExpansionVersion:1, campaignRulesVersion:1, mode:'hotseat', seed:42, created:1 };
function setup(enabled = true) {
 const h = harness();h.c.options={...options,relationshipOffersVersion:enabled?1:0};
 let html='';const panel=h.c.document.querySelector('#productProgramsPanel');
 Object.defineProperty(panel,'innerHTML',{configurable:true,get:()=>html,set(value){html=value;for(const [selector,el]of h.elements)if(selector.startsWith('#customerEffects')||selector.startsWith('#relationshipOffer-'))el.listeners={};}});
 h.run("game=E.createGame(options);seat=0;workspaceTab='products';productDeskView='relationships';"+
  "E.finishProject(game,game.players[0],{key:'licenseRewards'});for(const row of Object.values(game.players[0].productPrograms.markets))row.connected={essential:1,rewards:4,highYield:0};"+
  "game.players[0].allocation={service:3,business:3,lending:1,operations:1};game.players[0].householdBook.policy.retention=50;"+
  "if(game.players[0].relationshipOffers)game.players[0].relationshipOffers.policy={market:'downtown',segment:'connected',product:'rewards',share:25};"+
  "newDraft(E.publicState(game,0));draft.decision='b';draft.management.research.enabled=false;draft.investments={};"+
  "renderProducts=v=>renderProductPrograms(v);renderProjects=()=>{};renderReady=()=>{};render=()=>renderProductPrograms(currentView());"+
  "const originalCustomerEffects=E.customerEffectsComparison;comparisonCalls=0;E.customerEffectsComparison=(...args)=>{comparisonCalls++;return originalCustomerEffects(...args)};renderProductPrograms(currentView());");
 return h;
}
const markup = h => h.elements.get('#productProgramsPanel').innerHTML;
function click(h,id){const el=h.elements.get(id);assert(el?.listeners.click,'actual control has a click handler: '+id);return el.listeners.click();}
function compare(h){click(h,'#customerEffectsCompare');assert(h.run('customerEffectsCache!==null'));}
const legacy=setup(false);
assert.equal(legacy.run('comparisonCalls'),0);assert.doesNotMatch(markup(legacy),/customerEffectsCompare|Compare customer effects/);

const h=setup(),world=h.run('JSON.stringify(game)'),before=h.run('JSON.stringify(draft)');
h.run('renderProductPrograms(currentView());renderProductPrograms(currentView())');
assert.equal(h.run('comparisonCalls'),0,'rendering must not run operating comparisons');
compare(h);assert.equal(h.run('comparisonCalls'),1);assert.equal(h.run('JSON.stringify(game)'),world);assert.equal(h.run('JSON.stringify(draft)'),before);
assert.deepEqual(copy(h.run('customerEffectsCache.result.rows.map(r=>r.key)')),['baseline','offers','staffing','combined']);
assert.match(markup(h),/opening → closing/);assert.match(markup(h),/Conditional next-opening retention/);assert.match(markup(h),/switched principal is not income/);
assert.match(markup(h),/holds the estimated closing book, staffing and policies fixed/);
assert.match(markup(h),/not a recommendation or a measured return on investment/);assert.match(markup(h),/Already in draft/);
assert.doesNotMatch(markup(h),/id="customerEffectsStage-offers"/,'current selected offer is a no-op');
h.run('renderProductPrograms(currentView())');assert.equal(h.run('comparisonCalls'),1,'cached rendering cannot reforecast');
assert.equal(h.run("stageCustomerEffects(currentView(),'offers')"),false);assert.equal(h.run('comparisonCalls'),1,'no-op staging does not reforecast');
assert.equal(h.run("stageCustomerEffects(currentView(),'unknown')"),false);
assert(h.run("customerEffectsCache.result.rows.find(r=>r.key==='combined').eligible"));
click(h,'#customerEffectsStage-combined');assert.equal(h.run('comparisonCalls'),2,'explicit staging rechecks the shared comparison');
assert.deepEqual(copy(h.run('draft.allocation')),{service:4,business:2,lending:1,operations:1});
const changed=JSON.parse(h.run('JSON.stringify(draft)')),original=JSON.parse(before);delete changed.allocation;delete original.allocation;
assert.deepEqual(changed,original,'only the engine-supplied allocation and offer-policy patch may change');
assert.equal(h.run('JSON.stringify(game)'),world);assert.equal(h.run('customerEffectsCache'),null);
assert.match(markup(h),/<details class="customer-effects-panel" open>/,'staging keeps the undo control visible');
click(h,'#customerEffectsUndo');assert.equal(h.run('JSON.stringify(draft)'),before);assert.equal(h.run('JSON.stringify(game)'),world);

for(const mutation of ["draft.depositPolicy='margin'","draft.advertisingPolicy.budget=15000","draft.householdPolicy.retention=75","draft.relationshipOfferPolicy.share=50","draft.hires=1"]){
 const stale=setup();compare(stale);stale.run(mutation);const edited=stale.run('JSON.stringify(draft)');
 assert.equal(stale.run("stageCustomerEffects(currentView(),'combined')"),false,'cross-workspace draft change invalidates cached action');
 assert.equal(stale.run('comparisonCalls'),1);stale.run('renderProductPrograms(currentView())');
 assert.equal(stale.run('customerEffectsCache'),null);assert.equal(stale.run('JSON.stringify(draft)'),edited);
}
const book=setup();compare(book);book.run('game.players[0].stats.cash--');
assert.equal(book.run("stageCustomerEffects(currentView(),'combined')"),false,'same-cycle owner book change invalidates cached action');
assert.equal(book.run('comparisonCalls'),1);
const economy=setup();compare(economy);economy.run('game.economy={...game.economy,rate:game.economy.rate+.25}');
assert.equal(economy.run("stageCustomerEffects(currentView(),'combined')"),false);
const seat=setup();compare(seat);seat.run('seat=1');assert.equal(seat.run("stageCustomerEffects(currentView(),'combined')"),false,'owner switches cannot stage the previous owner\'s patch');

const undo=setup();compare(undo);click(undo,'#customerEffectsStage-combined');undo.run("draft.depositPolicy='margin'");
const edited=undo.run('JSON.stringify(draft)');assert.equal(undo.run('undoCustomerEffects(currentView())'),false);assert.equal(undo.run('JSON.stringify(draft)'),edited);
const undoBook=setup();compare(undoBook);click(undoBook,'#customerEffectsStage-combined');undoBook.run('game.players[0].stats.cash--');
assert.equal(undoBook.run('undoCustomerEffects(currentView())'),false);

const guarded=setup();guarded.run('draft.allocation={service:5,business:1,lending:1,operations:1};renderProductPrograms(currentView())');compare(guarded);
assert.equal(guarded.run('customerEffectsCache.result.reassignment.eligible'),false);
assert.equal(guarded.run("customerEffectsCache.result.rows.find(r=>r.key==='staffing').metrics"),null);
assert.match(markup(guarded),/Keep at least one Business banker/);assert.doesNotMatch(markup(guarded),/id="customerEffectsStage-staffing"/);
const malformed=setup();malformed.run('draft.allocation.service=0;renderProductPrograms(currentView())');compare(malformed);
assert.match(markup(malformed),/Allocate every existing banker/,'invalid drafts render their shared reason even when target is absent');

const changedGuard=setup();compare(changedGuard);
changedGuard.run("E.customerEffectsComparison=(...args)=>{comparisonCalls++;const r=originalCustomerEffects(...args);r.rows.find(x=>x.key==='combined').eligible=false;return r}");
assert.equal(changedGuard.run("stageCustomerEffects(currentView(),'combined')"),false,'stage uses fresh engine eligibility');
assert.equal(changedGuard.run('customerEffectsUndo'),null);
const replacedStage=setup();compare(replacedStage);
replacedStage.run('E.customerEffectsComparison=(...args)=>{comparisonCalls++;const result=originalCustomerEffects(...args);draft.depositPolicy="margin";return result}');
assert.equal(replacedStage.run("stageCustomerEffects(currentView(),'combined')"),false,'stage cannot attach a patch to a changed source draft');
assert.deepEqual(copy(replacedStage.run('draft.allocation')),{service:3,business:3,lending:1,operations:1});
assert.equal(replacedStage.run('customerEffectsUndo'),null);

for(const terminal of [false,true]){
 const locked=setup();compare(locked);click(locked,'#customerEffectsStage-combined');
 locked.run(terminal?'game.gameOver=true':'game.players[0].submitted=JSON.parse(JSON.stringify(draft))');
 const lockedDraft=locked.run('JSON.stringify(draft)'),lockedWorld=locked.run('JSON.stringify(game)');
 assert.equal(locked.run('requestCustomerEffects(currentView())'),false);
 assert.equal(locked.run("stageCustomerEffects(currentView(),'baseline')"),false);
 assert.equal(locked.run('undoCustomerEffects(currentView())'),false);
 locked.run('renderProductPrograms(currentView())');assert.equal(locked.run('JSON.stringify(draft)'),lockedDraft);assert.equal(locked.run('JSON.stringify(game)'),lockedWorld);
 if(terminal)assert.doesNotMatch(markup(locked),/customerEffectsCompare|Compare customer effects/);
}
const replaced=setup();replaced.run('E.customerEffectsComparison=(...args)=>{comparisonCalls++;const result=originalCustomerEffects(...args);draft.depositPolicy="margin";return result}');
click(replaced,'#customerEffectsCompare');assert.equal(replaced.run('customerEffectsCache'),null,'results cannot attach to a changed draft');

const escaped=setup();compare(escaped);escaped.run("customerEffectsCache.result.rows[0].label='<img src=x onerror=bad>';customerEffectsCache.result.assumptions=['<script>bad</script>'];renderProductPrograms(currentView())");
assert.match(markup(escaped),/&lt;img src=x onerror=bad&gt;/);assert.match(markup(escaped),/&lt;script&gt;bad&lt;\/script&gt;/);assert.doesNotMatch(markup(escaped),/<img|<script>/);
console.log('Customer effects UI passed: request-only real handlers, four scenarios, patch-only stage and exact undo, fresh shared guards, cross-tab/book/economy/owner invalidation, sealed/terminal guards, unsupported drafts and escaped labels.');
