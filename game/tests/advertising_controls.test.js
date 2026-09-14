'use strict';
// Real client functions and engine; this inert DOM harness is not visual QA.
if (!process.argv.includes('--portable')) process.argv.push('--source');
const assert = require('node:assert/strict'), {test} = require('node:test');
const {harness} = require('./github_resilience.test.js');
function fresh(budget=40000) {
  const h=harness();
  h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:8}).options,mode:'hotseat',seed:'advertising-controls',created:1});
    seat=0;gh.active=false;p2pRole='';
    E.applyAdvertisingPolicy(game.players[0],{...game.players[0].advertising.policy,budget:${budget}});newDraft(currentView());
    renderProducts=()=>{};renderReady=()=>{};renderProductPrograms=()=>{};errors=[];toast=s=>errors.push(s);
    plainOrder=p=>({focus:p.focus,allocation:{...p.allocation},decision:'b',products:{...p.products},depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'balanced',newProjects:[],investments:{},hires:0,competitiveAction:'none',opportunity:null});`);
  return h;
}
function budgetInput(h,value) {
  const control={dataset:{advertisingField:'budget'},value:String(value),addEventListener(type,fn){this[type]=fn;}};
  h.c.document.querySelectorAll=s=>s==='[data-advertising-field][data-advertising-scope=""]'?[control]:[];
  h.run('bindAdvertisingDesk(currentView())'); return control;
}
test('Standing paid budget is visible and rendering never silently pauses it',()=>{
  const h=fresh(),before=h.run('JSON.stringify({game,draft})');
  const html=h.run('advertisingDeskContent(currentView(),currentView().me)');
  assert.match(html,/<option value="40000" selected/);
  for(const budget of [0,15000,40000,80000])assert(html.includes('<option value="'+budget+'"'));
  assert(!html.includes('Advertising is paused.'));
  assert.equal(h.run('JSON.stringify({game,draft})'),before);
});
test('Changing to zero stages a real pause; next ordinary resolution charges zero',()=>{
  const h=fresh();budgetInput(h,0).change();
  assert.equal(h.run('draft.advertisingPolicy.budget'),0);
  assert.equal(h.run('game.players[0].advertising.policy.budget'),40000,'Change is staged, not immediate');
  h.run(`draft.decision='b';const rival=plainOrder(game.players[1]);
    E.submit(game,0,draft);E.submit(game,1,rival);`);
  assert.equal(h.run('game.players[0].advertising.report.spent'),0);
  assert.equal(h.run('game.players[0].advertising.policy.budget'),0);
});
test('A paused campaign can resume and changed nonzero budgets survive to settlement',()=>{
  const h=fresh(0);budgetInput(h,15000).change();
  assert.equal(h.run('draft.advertisingPolicy.budget'),15000);
  h.run(`draft.decision='b';E.submit(game,0,draft);E.submit(game,1,plainOrder(game.players[1]));`);
  assert.equal(h.run('game.players[0].advertising.report.spent'),15000);
  assert.equal(h.run('game.players[0].operatingReport.advertisingCost'),15000);
});
test('Zero sales capacity is explained without claiming all advertising is broken',()=>{
  const h=fresh();h.run('draft.householdPolicy.retention=100');
  const html=h.run('advertisingDeskContent(currentView(),currentView().me)');
  assert.match(html,/No retail sales capacity/);
  assert.match(html,/id="advertisingCapacityReview"/);
  assert(!html.includes('Measured intake is zero at every budget'));
  assert.match(html,/Assisted is not incremental/);
});
test('Capacity remedy is informational and stale budget handlers cannot affect another draft',()=>{
  const h=fresh(),input=budgetInput(h,0),before=h.run('JSON.stringify({game,draft})');
  h.run('destination=null;navigatePlanReview=item=>destination=item');
  h.elements.get('#advertisingCapacityReview').listeners.click();
  assert.equal(h.run('destination.tab'),'workforce');
  assert.equal(h.run('JSON.stringify({game,draft})'),before);
  h.run('seat=1;newDraft(currentView())'); const guestBefore=h.run('JSON.stringify({game,draft})');
  input.change();assert.equal(h.run('JSON.stringify({game,draft})'),guestBefore);
});
test('An invalid shared-staffing draft keeps budget controls and permits a real pause',()=>{
  const h=fresh();h.run("draft.departmentFunctionsPolicy.quotas.risk.operations=400");
  const html=h.run('advertisingDeskContent(currentView(),currentView().me)');
  assert.match(html,/Forecast unavailable/);assert.match(html,/<option value="0"/);
  const before=h.run('JSON.stringify(draft.departmentFunctionsPolicy)');budgetInput(h,0).change();
  assert.equal(h.run('draft.advertisingPolicy.budget'),0);
  assert.equal(h.run('JSON.stringify(draft.departmentFunctionsPolicy)'),before,'Pausing must not repair other orders');
  budgetInput(h,15000).change();assert.equal(h.run('draft.advertisingPolicy.budget'),0,'Invalid shared orders block paid increases');
});

test('Budget comparisons disclose saturation and a paused application desk without changing instructions',()=>{
 const h=fresh(80000),before=h.run('JSON.stringify({game,draft})');
 const html=h.run('advertisingDeskContent(currentView(),currentView().me)');
 assert.match(html,/No additional reach at this budget/);assert.match(html,/\$40,000\/month gives the same reach/);
 assert.match(html,/Application desk paused/);assert.match(html,/no application-pipeline conversions/);
 assert.match(html,/Targeting is not extra production/);assert.match(html,/advertisingApplicationsReview/);
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
});

test('Product and market advertising editors use distinct IDs and one authoritative proposal',()=>{
 const h=fresh(40000),before=h.run('JSON.stringify({game,draft})');
 const local=h.run("advertisingDeskContent(currentView(),currentView().me,'market')"),products=h.run('advertisingDeskContent(currentView(),currentView().me)');
 const ids=s=>Array.from(s.matchAll(/ id="([^"]+)"/g),m=>m[1]);
 assert(!ids(local).some(id=>ids(products).includes(id)),'Hidden Products DOM must not steal market actions');
 h.run("candidate=advertisingChangeProposal(currentView(),draft,'budget',15000)");
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
 budgetInput(h,15000).change();assert.equal(h.run('JSON.stringify(draft)'),h.run('JSON.stringify(candidate)'));
});

test('Application remedy opens the exact control, preserves instructions and rejects a stale owner',()=>{
 const h=fresh();h.run("productDeskView='advertising';destination=null;setWorkspaceTab=tab=>destination=tab;focusWorkspaceTarget=target=>focusedControl=target.id");
 h.run('bindAdvertisingDesk(currentView())');const button=h.elements.get('#advertisingApplicationsReview'),before=h.run('JSON.stringify({game,draft})');
 button.listeners.click();assert.equal(h.run('productDeskView'),'onboarding');assert.equal(h.run('destination'),'products');
 assert.equal(h.run('focusedControl'),'onboarding-share');assert.equal(h.run('JSON.stringify({game,draft})'),before);
 h.run("seat=1;newDraft(currentView());productDeskView='development'");button.listeners.click();assert.equal(h.run('productDeskView'),'development');
});

test('A reserve-paused quote does not warn that uncharged spending is still an expense',()=>{
 const h=fresh(80000);h.run('quoteOwner=currentView().me;quoteOwner.stats.cash=0;quote=E.advertisingPreview(quoteOwner,currentView(),draft.advertisingPolicy)');
 assert.equal(h.run('quote.paused'),true);assert.equal(h.run('quote.spent'),0);
 const html=h.run('advertisingOutcomeContent(currentView(),quoteOwner,quote)');
 assert(!html.includes('The extra $80,000 is still an expense'));
 assert(html.includes('reserve pause'));
});
