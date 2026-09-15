'use strict';
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js');let checks=0;
function test(name,fn){try{fn();checks++;}catch(e){throw Error(name+': '+e.stack);}}
function fresh(version=2){const h=harness();h.run(`const original=document.querySelector;document.querySelector=s=>{const el=original(s);el.addEventListener=function(event,fn){this.listeners[event]=fn};return el};
 const options=E.previewFeatureSelection({}, {field:'productProgramsVersion',value:${version}}).options;
 game=E.createGame({...options,mode:'hotseat',seed:'product-workspace',created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='products';newDraft(currentView());draft.decision='b';
 errors=[];toast=t=>errors.push(t);renderProducts=v=>renderProductPrograms(v);renderProjects=()=>{};renderReady=()=>{};renderProductPrograms(currentView());`);return h;}
const markup=h=>h.elements.get('#productProgramsPanel').innerHTML,bytes=h=>h.run('JSON.stringify({game,draft})');
const click=(h,id)=>h.elements.get('#'+id).listeners.click();
function delivered(h){h.run("E.finishProject(game,game.players[0],{key:'licenseRewards'});newDraft(currentView());draft.decision='b';renderProductPrograms(currentView())");click(h,'product-select-rewards');}

test('one inspector, no catalogue/pricing/target dropdowns, all products and actions remain reachable',()=>{
 const h=fresh(),before=bytes(h);
 for(const key of ['essential','rewards','highYield']){click(h,'product-select-'+key);for(const section of ['delivery','pricing','sales']){click(h,'product-section-'+section);assert.equal((markup(h).match(/id="productDetailTitle"/g)||[]).length,1);assert(!markup(h).includes('<select'));assert(markup(h).includes(h.run('productName(currentView(),"'+key+'")')));}}
 assert.equal(bytes(h),before);
});
test('pricing applies exactly one canonical adjustment; comparison and navigation remain pure',()=>{
 const h=fresh(),world=h.run('JSON.stringify(game)');click(h,'product-section-pricing');click(h,'product-price-more');assert.equal(h.run('draft.productProgramPolicy.pricingBp.essential'),25);
 const before=bytes(h);click(h,'compareProductPricing');assert.match(h.elements.get('#productPricingComparison').textContent,/monthly interest change/);assert.equal(bytes(h),before);assert.equal(h.run('JSON.stringify(game)'),world);
});
test('targets are scoped to one product, market and audience with a required fallback',()=>{
 const h=fresh();delivered(h);click(h,'product-section-sales');const market=h.run('marketEntries(currentView())[1][0]');click(h,'product-market-'+market);click(h,'product-audience-connected');const before=h.run('JSON.parse(JSON.stringify(draft.productProgramPolicy.markets))'),focus=h.run('draft.focus');click(h,'product-emphasis-3');
 before[market].connected.rewards=3;assert.deepEqual(JSON.parse(h.run('JSON.stringify(draft.productProgramPolicy.markets)')),JSON.parse(JSON.stringify(before)));assert.equal(h.run('draft.focus'),focus);
 click(h,'product-select-essential');click(h,'product-audience-everyday');const safe=bytes(h);click(h,'product-emphasis-0');assert.equal(bytes(h),safe);assert.match(h.run('errors.at(-1)'),/at least one/);
});
test('an unavailable offer cannot be opened through a detached disabled action',()=>{
 const h=fresh();click(h,'product-select-rewards');click(h,'product-section-sales');assert.match(markup(h),/id="product-emphasis-3"[^>]*disabled/);const before=bytes(h);click(h,'product-emphasis-3');assert.equal(bytes(h),before);
 click(h,'product-section-pricing');const priceBefore=bytes(h);click(h,'product-price-more');assert.equal(bytes(h),priceBefore);
});
test('retirement is a pure review, can cancel, then stages the exact fallback and cost once',()=>{
 const h=fresh();delivered(h);h.run("draft.productProgramPolicy.markets.downtown.everyday={essential:0,rewards:4,highYield:0};renderProductPrograms(currentView())");const before=bytes(h),world=h.run('JSON.stringify(game)');click(h,'productRetire');assert.equal(bytes(h),before);assert.match(markup(h),/1 audience instructions/);assert.match(markup(h),/25,000/);click(h,'cancelProductRetirement');assert.equal(bytes(h),before);
 click(h,'productRetire');const confirm=h.elements.get('#confirmProductRetirement').listeners.click;confirm();assert.deepEqual(JSON.parse(h.run('JSON.stringify(draft.productProgramPolicy.retire)')),['rewards']);assert.equal(h.run('draft.productProgramPolicy.markets.downtown.everyday.essential'),4);assert.equal(h.run('JSON.stringify(game)'),world);const staged=bytes(h);confirm();assert.equal(bytes(h),staged);
 click(h,'productRetire');assert.equal(h.run('draft.productProgramPolicy.retire.length'),0);assert.equal(h.run('draft.productProgramPolicy.markets.downtown.everyday.rewards'),0,'Cancellation does not silently restore targets');
});
test('detached controls reject owner/month/plan/session/reconnect changes and paused writes',()=>{
 for(const change of ['seat=1;newDraft(currentView())','game.cycle++','draft.depositPolicy="growth"','featureConnectionGeneration++','connectionAttempt++','linkSession="new-session"','gh={...gh}','lan={...lan}','gh.active=true;gh.paused=true']){
  const h=fresh();click(h,'product-section-pricing');const callback=h.elements.get('#product-price-more').listeners.click;h.run(change);const before=bytes(h);callback();assert.equal(bytes(h),before,change);
 }
 const h=fresh();delivered(h);click(h,'productRetire');const confirm=h.elements.get('#confirmProductRetirement').listeners.click;h.run('draft.hires=1');const before=bytes(h);confirm();assert.equal(bytes(h),before);h.run('renderProductPrograms(currentView())');assert(!markup(h).includes('id="confirmProductRetirement"'));
});
test('stale target handlers cannot retarget an inspected market after a new plan',()=>{
 const h=fresh();delivered(h);click(h,'product-section-sales');const callback=h.elements.get('#product-emphasis-3').listeners.click;h.run('seat=1;newDraft(currentView());renderProductPrograms(currentView())');const before=bytes(h);callback();assert.equal(bytes(h),before);assert.equal(h.run('productWorkspace.product'),'essential');
});
test('route cards use authoritative discounted costs and development removal remains possible',()=>{
 const h=fresh();click(h,'product-select-rewards');const quote=h.run('E.projectStartTerms(currentView(),currentView().me,"licenseRewards",draft.focus)');assert(markup(h).includes(h.run('productPricingCash('+quote.cost+')')));const world=h.run('JSON.stringify(game)');click(h,'product-route-licenseRewards');assert(h.run('draft.newProjects.includes("licenseRewards")'));click(h,'product-route-licenseRewards');assert.equal(h.run('draft.newProjects.length'),0);assert.equal(h.run('JSON.stringify(game)'),world);
});
test('old programme versions keep delivery and targets without invented pricing or statement rules',()=>{
 const h=fresh(1),before=bytes(h);assert(!markup(h).includes('id="product-section-pricing"'));assert(!markup(h).includes('id="product-desk-reports"'));click(h,'product-section-sales');assert(!markup(h).includes('<select'));h.run("productDeskView='advertising';renderProductPrograms(currentView())");assert.equal(h.run('productDeskView'),'development');assert.equal(bytes(h),before);
});
test('settled statements retain the full owner movement bridge independently of editing',()=>{
 const h=fresh();h.run('E.submit(game,0,draft);E.submit(game,1,E.chooseBot(game,1));newDraft(currentView());renderProductPrograms(currentView())');const before=bytes(h);h.run("selectProductSubject('reports')");assert.match(markup(h),/Actual billed month 1/);assert.match(markup(h),/Rival transfers \(net\)/);assert.match(markup(h),/Billed market and audience detail/);assert.equal(bytes(h),before);
});
console.log(JSON.stringify({suite:'product-workspace',checks,scope:'Object-owned delivery/pricing/targets, exact engine quotes, pure comparison and retirement review, explicit cancellation, legacy displays and stale-session guards. No simulation or balance changes.'}));
