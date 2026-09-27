'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const {test}=require('node:test'),assert=require('node:assert/strict'),{harness}=require('./github_resilience.test');
function fresh(edition='expanded'){
 const h=harness();
 // This fixture asserts the retained desk's DOM and contextual legacy routes.
 // The canonical Expanded shell is exercised by interface and browser suites;
 // keep the real retained renderer, Ready validation and owner guards here.
 h.run('expandedInterfaceEnabled=()=>false;');h.c.edition=edition;
 h.run(`const originalQuery=document.querySelector,originalAll=document.querySelectorAll;
 document.querySelector=s=>{const e=originalQuery(s);e.addEventListener=function(k,fn){this.listeners[k]=fn};e.scrollIntoView=()=>{};e.insertAdjacentHTML=function(pos,text){this.innerHTML+=text};e.remove=()=>{};return e;};
 document.querySelectorAll=selector=>{
  const attribute={'[data-rate-scenario]':'rate-scenario','[data-rate-link]':'rate-link','[data-treasury-review]':'treasury-review'}[selector];if(!attribute)return originalAll(selector);
  const rx=new RegExp('data-'+attribute+'="([^"\\\\s]+)"','g');
  return Array.from(document.querySelector('#monetaryPolicyDesk').innerHTML.matchAll(rx),m=>{const e=document.querySelector('#test-'+attribute+'-'+m[1]);e.dataset[attribute.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=m[1];return e;});
 };
 game=E.createGame({...E.previewCampaignEdition({},edition,{currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true}).options,startingWorkforce:'covered',mode:'hotseat',seed:'fed-ui',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());draft.decision='a';workspaceTab='overview';renderMonetaryPolicy(currentView());`);
 return h;
}
const state=h=>h.run('JSON.stringify({game,draft})'),on=(h,id)=>h.elements.get('#'+id).onclick(),click=(h,id)=>h.elements.get('#'+id).listeners.click();
test('compact Fed card opens an inline desk; scenarios are pure and use engine amounts',()=>{
 const h=fresh(),before=state(h);assert.equal(h.run('monetaryDesk.open'),false);assert.match(h.elements.get('#monetaryPolicyDesk').innerHTML,/id="rateImpactWorkspace" hidden/);
 on(h,'inspectRateImpact');assert(h.run('monetaryDesk.open'));on(h,'test-rate-scenario-100');assert.equal(h.run('monetaryDesk.change'),100);assert.equal(state(h),before);
 const html=h.elements.get('#monetaryPolicyDesk').innerHTML;
 assert(html.includes(h.run('overviewDollars(E.MonetaryPolicy.quote(currentView().me,currentView(),100,draft).scenario.netInterest)')));
 assert.doesNotMatch(html,/<select|<details/);assert.match(html,/principal, not income/);assert.match(html,/Current-book sensitivity/);
});
test('review, cancel and stage change only the treasury instruction, then preserve it across contextual return',()=>{
 const h=fresh(),before=state(h);on(h,'inspectRateImpact');on(h,'test-treasury-review-fixed');assert.equal(state(h),before);assert.match(h.elements.get('#monetaryPolicyDesk').innerHTML,/Review: Longer fixed/);
 click(h,'cancelTreasuryPolicy');assert.equal(state(h),before);assert.equal(h.run('monetaryDesk.review'),null);
 on(h,'test-treasury-review-fixed');const original=JSON.parse(h.run('JSON.stringify(draft)'));click(h,'stageTreasuryPolicy');assert.equal(h.run('draft.treasuryPolicy'),'fixed');delete original.treasuryPolicy;
 const changed=JSON.parse(h.run('JSON.stringify(draft)'));delete changed.treasuryPolicy;assert.deepEqual(changed,original);
 on(h,'test-rate-link-pricing');assert.equal(h.run('workspaceTab'),'products');assert.equal(h.run('productDeskView'),'pricing');
 h.run('draft.productProgramPolicy.pricingBp.essential=25;returnBankingContext()');assert.equal(h.run('workspaceTab'),'overview');assert.equal(h.run('draft.treasuryPolicy'),'fixed');assert.equal(h.run('draft.productProgramPolicy.pricingBp.essential'),25);assert(h.run('monetaryDesk.open'));
});
test('old callbacks cannot stage for another owner, month, campaign, or locked plan',()=>{
 for(const change of ['seat=1;newDraft(currentView())','game.cycle++','game=JSON.parse(JSON.stringify(game))','connectionAttempt++','featureConnectionGeneration++','game.players[0].submitted={treasuryPolicy:"liquid"}']){
  const h=fresh();on(h,'test-treasury-review-fixed');const stale=h.elements.get('#stageTreasuryPolicy').listeners.click;h.run(change);const before=state(h);stale();assert.equal(state(h),before,change);
 }
 const core=fresh('core');assert.equal(core.elements.get('#monetaryPolicyDesk').hidden,true);assert.equal(core.elements.get('#monetaryPolicyDesk').innerHTML,'');
});
test('a restored ready owner sees its own staged policy while the rival does not',()=>{
 const h=fresh();h.run('game.players[0].submitted={treasuryPolicy:"fixed"};newDraft(currentView());renderMonetaryPolicy(currentView())');assert.equal(h.run('draft.treasuryPolicy'),'fixed');assert.match(h.elements.get('#monetaryPolicyDesk').innerHTML,/Staged: <b>Longer fixed/);
 h.run('seat=1;newDraft(currentView());renderMonetaryPolicy(currentView())');assert.equal(h.run('draft.treasuryPolicy'),'balanced');
});
