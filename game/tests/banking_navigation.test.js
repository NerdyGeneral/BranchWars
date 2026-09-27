'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./github_resilience.test');
const copy=x=>JSON.parse(JSON.stringify(x));
function fresh(edition='expanded'){
 const h=harness();h.c.edition=edition;
 h.run(`game=E.createGame({...E.previewCampaignEdition({},edition,{currentReporting:true,currentEconomics:true,currentResearch:true,currentRivalry:true,currentLending:true}).options,startingWorkforce:'covered',mode:'hotseat',seed:'banking-return',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());draft.decision='b';
  const originalQuery=document.querySelector;document.querySelector=selector=>{const el=originalQuery(selector);el.insertAdjacentHTML=function(position,html){this.innerHTML+=html};el.scrollIntoView=()=>{};return el;};
  window.scrollX=0;window.scrollY=380;window.scrollTo=position=>{restoredScroll=position};requestAnimationFrame=fn=>fn();document.activeElement={id:'office-origin'};
  // Router and shared plan tests. Real DOM staging is covered in the domain
  // suites and the isolated browser acceptance runner.
  renderExpandedInterface=()=>{};interfaceIdentity(currentView());openInterfaceWorkspace('markets','staff',{market:'downtown',office:game.players[0].facilityNetwork?.offices[0]?.id});`);
 return h;
}
const state=h=>h.run('JSON.stringify({game,draft})');
const route=h=>copy(h.run('interfaceCurrentRoute()'));
test('pricing opens exact terms and return restores only the office route, retaining new plan edits',()=>{
 const h=fresh(),initial=route(h),before=state(h),world=h.run('JSON.stringify(game)');
 assert(h.run("openBankingContext('pricing',{product:'essential',market:'uptown'})"));
 assert.deepEqual(route(h),{workspace:'banking',view:'deposits',context:{productId:'essential',marketId:'uptown',mode:'pricing'}});assert.equal(state(h),before);
 h.run("draft.productProgramPolicy.pricingBp.essential=25;draft.depositPolicy='growth'");const changed=state(h);
 assert(h.run('interfaceReturn()'));assert.deepEqual(route(h),initial);assert.equal(state(h),changed);assert.equal(h.run('JSON.stringify(game)'),world);assert.equal(h.run('restoredScroll.top'),380);
});
test('each pricing route names its exact product; invalid requests neither navigate nor stage',()=>{
 const h=fresh(),before=state(h);
 for(const product of ['essential','rewards','highYield']){h.c.product=product;assert(h.run("openBankingContext('pricing',{product})"));assert.equal(route(h).context.productId,product);assert.equal(route(h).context.mode,'pricing');assert(h.run('interfaceReturn()'));}
 const r=route(h);assert.equal(h.run("openBankingContext('pricing',{product:'not-a-product'})"),false);assert.equal(h.run("openBankingContext('unknown')"),false);assert.deepEqual(route(h),r);assert.equal(state(h),before);
});
test('portfolio has a distinct canonical home and nested return restores product and office selections',()=>{
 const h=fresh(),before=state(h),office=route(h);h.run("openBankingContext('pricing',{product:'rewards'});openBankingContext('portfolio',{market:'downtown'})");
 assert.equal(route(h).view,'lending');assert.equal(route(h).context.mode,'portfolio');
 assert(h.run('interfaceReturn()'));assert.equal(route(h).view,'deposits');assert.equal(route(h).context.productId,'rewards');assert(h.run('interfaceReturn()'));assert.deepEqual(route(h),office);assert.equal(state(h),before);
});
test('Core and historical non-Expanded programmes keep their supported original routes',()=>{
 const h=fresh('core'),before=state(h);h.run("renderProducts(currentView());openBankingContext('portfolio')");assert.equal(h.run('workspaceTab'),'operations');assert.match(h.elements.get('#productPortfolio').innerHTML,/id="productPortfolio-credit"/);
 h.run("returnBankingContext();openBankingContext('pricing',{product:'essential'})");assert.equal(h.run('workspaceTab'),'operations');assert.equal(h.run('game.productProgramsVersion'),undefined);assert.equal(state(h),before);
 const legacy=fresh();legacy.run("game=E.createGame({...E.previewFeatureSelection({}, {field:'productProgramsVersion',value:1}).options,mode:'hotseat',seed:1,created:1});newDraft(currentView());");const old=state(legacy);legacy.run("openBankingContext('pricing',{product:'essential'})");assert.equal(legacy.run('subjectWorkspace.products'),'policies');assert.equal(state(legacy),old);
});
test('return frames reject another bank, month, campaign or connection without restoring an old draft',()=>{
 for(const change of ['seat=1;newDraft(currentView())','game.cycle++','game=JSON.parse(JSON.stringify(game))','connectionAttempt++','featureConnectionGeneration++','linkSession="replacement"','gh={...gh}','lan={...lan}']){
  const h=fresh();h.run("openBankingContext('pricing',{product:'essential'})");h.run(change);const before=state(h);assert.equal(h.run('interfaceReturn()'),false,change);assert.equal(state(h),before,change);assert.equal(h.run('interfaceState.trail.length'),0);
 }
});
test('guest refresh preserves route and private working edits while rejecting stale write callbacks',()=>{
 const h=fresh();h.run("view=E.publicState(game,1);game=null;p2pRole='guest';newDraft(view);interfaceIdentity(view);openInterfaceWorkspace('markets','staff',{market:'university',office:view.me.facilityNetwork.offices[0].id});openBankingContext('pricing',{product:'essential'});savedToken=interfaceToken(view);interfaceState.decision={value:'a',dirty:true};view=JSON.parse(JSON.stringify(view));view.rival.submitted=true;ensureDraft(view);interfaceIdentity(view)");
 assert.equal(h.run('interfaceState.trail.length'),1);assert.equal(route(h).context.productId,'essential');assert.equal(h.run('interfaceState.decision.value'),'a');assert.equal(h.run('interfaceCurrent(savedToken)'),false);assert.equal(h.run('interfaceCurrent(savedToken,false)'),true);
 h.run('draft.productProgramPolicy.pricingBp.essential=25');const changed=state(h);assert(h.run('interfaceReturn()'));assert.equal(route(h).context.market,'university');assert.equal(state(h),changed);
});
test('presentation identity ignores rival secrets and resets on guest rematch or new session',()=>{
 const owner=fresh();owner.run("view=E.publicState(game,1);game=null;p2pRole='guest';ownerToken=presentationCampaignIdentity(view);Object.defineProperty(view,'rival',{get(){throw Error('Rival secrets must not be read')}})");assert(owner.run('presentationCampaignIdentity(view)===ownerToken'));
 for(const change of ['view.me.id="new-bank"','view.cycle=1;view.resolutionId=0','view.gameOver=false','connectionAttempt++','featureConnectionGeneration++','linkSession="replacement"','gh={...gh}','lan={...lan}']){
  const h=fresh();h.run("view=E.publicState(game,1);game=null;p2pRole='guest';view.cycle=3;view.resolutionId=2;view.gameOver=true;newDraft(view);beforeToken=presentationCampaignIdentity(view);view=JSON.parse(JSON.stringify(view))");assert(h.run('presentationCampaignIdentity(view)===beforeToken'));h.run(change);assert.equal(h.run('presentationCampaignIdentity(view)===beforeToken'),false,change);
 }
});
test('locked plans remain inspectable but write guards reject mutation',()=>{
 const h=fresh(),office=route(h);h.run('game.players[0].submitted=JSON.parse(JSON.stringify(draft))');const before=state(h);h.run("openBankingContext('pricing',{product:'essential'});lockedToken=interfaceToken(currentView())");assert.equal(h.run('interfaceCurrent(lockedToken)'),false);assert.equal(h.run('interfaceCurrent(lockedToken,false)'),true);assert(h.run('interfaceReturn()'));assert.deepEqual(route(h),office);assert.equal(state(h),before);
});
