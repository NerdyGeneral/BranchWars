'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=require('../tools/build_game.js').assemble().html,read=fs.readFileSync,portable=path.resolve(__dirname,'../BRANCH_WARS.html');
let harness;
try{
 fs.readFileSync=function(file,...args){return path.resolve(String(file))===portable?html:read.call(this,file,...args)};
 ({harness}=require('./github_resilience.test.js'));
}finally{fs.readFileSync=read}
const options={campaignRulesVersion:1,serviceExpansionVersion:1,managementVersion:2,customerDemandVersion:2,
 workforceVersion:1,customerOwnershipVersion:1,creditPerformanceVersion:1,segmentDepositsVersion:1,productProgramsVersion:2,
 mode:'hotseat',seed:42,created:1};
const h=harness();h.c.options=options;
h.run("game=E.createGame(options);seat=0;workspaceTab='products';productDeskView='pricing';newDraft(E.publicState(game,0));draft.decision='b';"+
 "renderProducts=v=>renderProductPrograms(v);renderProjects=()=>{};renderReady=()=>{};renderProductPrograms(currentView());");
const markup=()=>h.elements.get('#productProgramsPanel').innerHTML;
assert.match(markup(),/Pricing &amp; funding|Pricing & funding/);
assert.match(markup(),/Annual adjustment/);assert.match(markup(),/Rival offers have not settled/);
assert.match(markup(),/id="pricing-rewards"[^>]*disabled/);
const original=h.run('JSON.stringify(game)');
assert(h.run("stageProductProgramme(currentView(),next=>{next.productProgramPolicy.pricingBp.essential=25})"));
assert.equal(h.run('draft.productProgramPolicy.pricingBp.essential'),25);
assert.equal(h.run('JSON.stringify(game)'),original,'Staging changed the committed bank.');
const before=h.run('JSON.stringify(draft)');
h.elements.get('#compareProductPricing').listeners.click();
assert.match(h.elements.get('#productPricingComparison').textContent,/monthly interest change/);
assert.equal(h.run('JSON.stringify(draft)'),before);assert.equal(h.run('JSON.stringify(game)'),original);
h.run("E.submit(game,0,draft);renderProductPrograms(currentView())");
assert.match(markup(),/id="pricing-essential"[^>]*disabled/);
assert.equal(h.run("stageProductProgramme(currentView(),next=>{next.productProgramPolicy.pricingBp.essential=-25})"),false);
h.run("E.submit(game,1,E.chooseBot(game,1));newDraft(currentView());draft.decision='b';renderProductPrograms(currentView())");
assert.match(markup(),/Actual billed month 1/);assert.match(markup(),/Rival transfers \(net\)/);
assert.match(markup(),/Last settled rival offers/);
h.run("seat=1;newDraft(currentView());renderProductPrograms(currentView())");
assert.equal(h.run('draft.productProgramPolicy.pricingBp.essential'),h.run('game.players[1].productPrograms.pricingBp.essential'));
assert.equal(h.elements.get('#productPricingComparison').innerHTML||'', '', 'No retained comparison cache belongs to the previous owner.');
const legacy=harness();legacy.c.options={...options,productProgramsVersion:1};
legacy.run("game=E.createGame(options);seat=0;workspaceTab='products';productDeskView='pricing';newDraft(E.publicState(game,0));renderProductPrograms(currentView())");
assert.equal(legacy.run('productDeskView'),'development');
assert(!legacy.elements.get('#productProgramsPanel').innerHTML.includes('data-product-view="pricing"'));
// Render-only servicing fixture: move an existing balance, never create money.
const retired=harness();retired.c.options=options;
retired.run("game=E.createGame(options);seat=0;workspaceTab='products';productDeskView='pricing';"+
 "game.players[0].productPrograms.products.rewards={route:'partner',retired:true};"+
 "game.players[0].productPrograms.pricingBp.rewards=25;game.players[0].depositBook.cohorts[0].product='rewards';"+
 "newDraft(currentView());renderProductPrograms(currentView());");
const retiredMarkup=retired.elements.get('#productProgramsPanel').innerHTML;
assert.match(retiredMarkup,/Retained variable rate/);
assert.match(retiredMarkup,/id="pricing-rewards"[^>]*disabled/);
assert.match(retiredMarkup,/Illustrative quote/,'Undeveloped savings still shows a hypothetical quote.');
assert(!markup().includes('Retained variable rate'),'Undeveloped Rewards must not imply existing serviced accounts.');
console.log('Pricing UI source harness PASS: version gating, staged versus committed prices, pure explicit comparison, sealed controls, billed review, owner switch and retained-rate labels. Real-browser layout acceptance is separate.');
