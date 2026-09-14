'use strict';
// Actual engine + client commands. Inert DOM is not browser/layout acceptance.
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
const copy=x=>JSON.parse(JSON.stringify(x));
function fresh(version=9){
 const h=harness();h.run(`game=E.createGame({...${version?`E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options`:'{}'},mode:'hotseat',seed:'opportunity-desk',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());errors=[];toast=s=>errors.push(s);
  originalOpportunityPipeline=renderOpportunityPipeline;renderPipeline=v=>renderOpportunityPipeline(v);renderReady=()=>{};
  target=currentView().opportunities.find(o=>o.dept==='business')||currentView().opportunities[0];`);return h;
}
test('Inspecting a pursuit is read-only and explains financial principal versus income',()=>{
 const h=fresh(),before=h.run('JSON.stringify({game,draft})');assert(h.run('inspectOpportunity(currentView(),target.id)'));
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
 const html=h.elements.get('#pipeline').innerHTML;assert.match(html,/INSPECTION ONLY/);assert.match(html,/not revenue/);assert.match(html,/Existing customer work is served first/);assert.match(html,/Review Business Banking reservation/);
 assert(!html.includes('Review Retail &amp; Service reservation'),'Irrelevant physical role is not offered for this business pursuit');
});
test('Normal-start business pursuit becomes reachable using existing staff without inventing headcount',()=>{
 const h=fresh(),before=h.run('JSON.stringify({game,draft})');
 const q=copy(h.run("opportunityProposal(currentView(),draft,target.id,'business')"));
 assert.equal(q.added,2);assert.equal(q.work.required,1);assert(q.work.eligible);assert(q.needsConfirmation);
 assert.equal(q.candidate.departmentFunctionsPolicy.quotas.relationships.business,2);assert.equal(q.candidate.hires,0);
 assert.equal(q.budget.total,h.run('E.planBudget(currentView().me,draft,currentView()).total'));
 assert(q.effects.some(s=>s.includes('standing department instruction')));assert(q.effects.some(s=>s.includes('0.5 banker-months')));
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
});
test('Preparation, cancellation and atomic confirmation preserve the bank and unrelated draft orders',()=>{
 const h=fresh();h.run("inspectOpportunity(currentView(),target.id);draft.contractBid=currentView().serviceAgreements[0].id;draft.investments.network=1000");
 const before=h.run('JSON.stringify({game,draft})');assert(h.run("requestOpportunity(currentView(),target.id,'vendor')"));assert.equal(h.run('JSON.stringify({game,draft})'),before);
 assert(h.run('opportunityWorkspace.pending.proposal.effects.some(s=>s.includes("Replace the selected commercial"))'));
 assert(h.run('opportunityWorkspace.pending.proposal.effects.some(s=>s.includes("no employee is hired or reassigned"))'));
 assert(!h.run('opportunityWorkspace.pending.proposal.effects.some(s=>s.includes("Other unreserved activity has less capacity"))'));
 h.run('cancelOpportunityProposal()');assert.equal(h.run('JSON.stringify({game,draft})'),before);
 h.run("requestOpportunity(currentView(),target.id,'vendor')");assert(h.run('confirmOpportunity()'));
 assert.equal(h.run('draft.opportunity'),h.run('target.id'));assert.equal(h.run('draft.contractBid'),null);
 assert.equal(h.run('draft.investments.network'),1000);assert.equal(h.run('draft.departmentFunctionsPolicy.vendors.relationships'),2);
 assert.equal(h.run('JSON.stringify(game)'),JSON.stringify(JSON.parse(before).game));
 const policy=h.run('JSON.stringify(draft.departmentFunctionsPolicy)');assert(h.run('clearOpportunity(opportunityToken(currentView()))'));
 assert.equal(h.run('draft.opportunity'),null);assert.equal(h.run('JSON.stringify(draft.departmentFunctionsPolicy)'),policy,'Removal does not silently cancel standing work');
});
test('Changed draft requires refreshed confirmation; stale owner/month/session/connection and sealed plans refuse writes',()=>{
 const h=fresh();h.run("inspectOpportunity(currentView(),target.id);requestOpportunity(currentView(),target.id,'business');draft.investments.network=1000");
 const changed=h.run('JSON.stringify(draft)');assert.equal(h.run('confirmOpportunity()'),false);assert.equal(h.run('JSON.stringify(draft)'),changed);assert(h.run('confirmOpportunity()'));
 for(const change of ['seat=1;newDraft(currentView())','game.cycle++','game=JSON.parse(JSON.stringify(game))','featureConnectionGeneration++','game.players[0].submitted={}', 'gh.active=true;gh.paused=true']){
  const q=fresh();q.run("inspectOpportunity(currentView(),target.id);requestOpportunity(currentView(),target.id,'business')");q.run(change);
  const frozen=q.run('JSON.stringify({game,draft})');assert.equal(q.run('confirmOpportunity()'),false,change);assert.equal(q.run('JSON.stringify({game,draft})'),frozen);
 }
});
test('Forged targets, unaffordable vendors and double-booked office staff are rejected without repair',()=>{
 const h=fresh();assert.throws(()=>h.run("opportunityProposal(currentView(),draft,'forged','vendor')"),/no longer available/);
 assert.throws(()=>h.run("opportunityProposal(currentView(),draft,target.id,'nonexistent')"),/cannot supply/);
 const before=h.run('JSON.stringify({game,draft})');assert.throws(()=>h.run("opportunityProposal(currentView(),draft,currentView().opportunities.find(o=>o.type==='public').id,'operations')"),/Office staffing/);assert.equal(h.run('JSON.stringify({game,draft})'),before);
 h.run('draft.investments.network=900000000');const invalid=h.run('JSON.stringify({game,draft})');
 assert.equal(h.run("requestOpportunity(currentView(),target.id,'vendor')"),false);assert.equal(h.run('JSON.stringify({game,draft})'),invalid);
});
test('One actual simultaneous month consumes authorized work once and survives half-ready restore',()=>{
 const h=fresh();h.run("const chosen=opportunityProposal(currentView(),draft,target.id,'business');draft=chosen.candidate;draft.decision='b';first=JSON.parse(JSON.stringify(draft));seat=1;newDraft(currentView());draft.decision='b';second=JSON.parse(JSON.stringify(draft));seat=0;beforeStaff=game.players[0].stats.staff;beforeVendor=game.players[0].departmentFunctions.policy.vendors.relationships;E.submit(game,0,first);game=E.migrateCampaign(JSON.parse(JSON.stringify(game)));E.submit(game,1,second);E.validatePilot(game);E.validateLedger(game);");
 assert.equal(h.run('game.players[0].stats.staff'),h.run('beforeStaff'));
 assert.equal(h.run('game.players[0].departmentFunctionDelivery.opportunity.terms.id'),h.run('target.id'));
 assert(['won','lost'].includes(h.run('game.players[0].departmentFunctionDelivery.opportunity.result')));
 assert.equal(h.run('game.players[0].departmentFunctions.policy.vendors.relationships'),h.run('beforeVendor'));
 assert(h.run('E.migrateCampaign(JSON.parse(JSON.stringify(game))).cycle===game.cycle'));
 assert(h.run('E.publicState(game,1).rival.departmentFunctionDelivery===undefined'));
});
test('Core and earlier Group campaigns retain their own rules and inspection does not initialize new systems',()=>{
 for(const version of [0,4,8]){
  const h=fresh(version),before=h.run('JSON.stringify({game,draft})');h.run('inspectOpportunity(currentView(),target.id)');assert.equal(h.run('JSON.stringify({game,draft})'),before);
  if(version===0)assert(h.run("opportunityProposal(currentView(),draft,target.id).eligible"));
  assert.equal(h.run('game.financialGroupVersion'),version||undefined);
 }
});
test('The service desk uses the same consumed workforce as the contextual pursuit, without mutating the draft',()=>{
 const h=fresh();h.run("draft=opportunityProposal(currentView(),draft,target.id,'business').candidate");
 const before=h.run('JSON.stringify({game,draft})');
 const shown=copy(h.run('E.serviceLoad(serviceDraftPlayer(currentView()))'));
 const expected=copy(h.run('E.serviceLoad(E.departmentCustomerPreview(currentView().me,currentView(),draft).owner)'));
 assert.deepEqual(shown,expected);assert(shown.sales<h.run('draft.allocation.business'),'Reserved pursuit time cannot remain fully available to sales');
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
});
