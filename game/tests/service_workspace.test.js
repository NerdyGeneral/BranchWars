'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
const copy=x=>JSON.parse(JSON.stringify(x));
function fresh(version=9){
 const h=harness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options,mode:'hotseat',seed:'service-object-workflow',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());errors=[];toast=s=>errors.push(s);renderReady=()=>{};$('#pipeline').insertAdjacentHTML=function(position,html){this.innerHTML+=html};renderPipeline=v=>{$('#pipeline').innerHTML='';renderServiceAgreementInspector(v)};target=currentView().serviceAgreements.find(c=>c.kind==='payroll'&&c.due===1);`);return h;
}
test('Client inspection and whole-book options are pure and agree with the shared engine',()=>{
 const h=fresh(),before=h.run('JSON.stringify({game,draft})');assert(h.run('inspectServiceAgreement(currentView(),target.id)'));
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
 const options=copy(h.run('serviceAgreementOptions(currentView(),draft,target.id).options'));
 assert(options.length>0);assert.equal(h.run('serviceAgreementOptions(currentView(),draft,target.id).technologyAdded'),1);
 assert.deepEqual(options,copy(h.run('E.serviceDeliveryOptions(currentView().me,serviceAgreementOptions(currentView(),draft,target.id).candidate,currentView().economy,target,currentView())')));
 assert.match(h.elements.get('#pipeline').innerHTML,/not a purchase of the company or an automatic new loan or deposit/);
 assert.match(h.elements.get('#pipeline').innerHTML,/new awards earn next month/);
});
test('Review, cancel and confirm atomically stage standing capacity and replace the ordinary pursuit',()=>{
 const h=fresh();h.run('inspectServiceAgreement(currentView(),target.id);draft.opportunity=currentView().opportunities[0].id;draft.investments.network=1000;mix=serviceAgreementOptions(currentView(),draft,target.id).options[0];');
 const before=h.run('JSON.stringify({game,draft})');assert(h.run('requestServiceAgreement(currentView(),target.id,mix)'));assert.equal(h.run('JSON.stringify({game,draft})'),before);
 assert(h.run('serviceWorkspace.pending.proposal.effects.some(s=>s.includes("Replace the selected ordinary opportunity"))'));
 assert(h.run('serviceWorkspace.pending.proposal.effects.some(s=>s.includes("contracted Technology")&&s.includes("$3,500 per month"))'));
 h.run('cancelServiceAgreement()');assert.equal(h.run('JSON.stringify({game,draft})'),before);
 assert(h.run('requestServiceAgreement(currentView(),target.id,mix)'));assert(h.run('confirmServiceAgreement()'));
 assert.equal(h.run('draft.contractBid'),h.run('target.id'));assert.equal(h.run('draft.opportunity'),null);assert.equal(h.run('draft.investments.network'),1000);
 assert.equal(h.run('draft.servicePolicy.staff'),h.run('mix.staff'));assert.equal(h.run('draft.servicePolicy.outsourcing'),h.run('mix.outsourcing'));
 assert.equal(h.run('draft.departmentFunctionsPolicy.vendors.technology'),1);
 assert.equal(h.run('JSON.stringify(game)'),JSON.stringify(JSON.parse(before).game));
});
test('Changed plans re-quote; stale ownership, month, session, connection and sealed plans refuse writes',()=>{
 const h=fresh();h.run('inspectServiceAgreement(currentView(),target.id);mix=serviceAgreementOptions(currentView(),draft,target.id).options[0];requestServiceAgreement(currentView(),target.id,mix);draft.investments.network=1000;');
 const changed=h.run('JSON.stringify(draft)');assert.equal(h.run('confirmServiceAgreement()'),false);assert.equal(h.run('JSON.stringify(draft)'),changed);assert(h.run('confirmServiceAgreement()'));
 for(const change of ['seat=1;newDraft(currentView())','game.cycle++','game=JSON.parse(JSON.stringify(game))','featureConnectionGeneration++','game.players[0].submitted={}','gh.active=true;gh.paused=true']){
  const q=fresh();q.run('inspectServiceAgreement(currentView(),target.id);mix=serviceAgreementOptions(currentView(),draft,target.id).options[0];requestServiceAgreement(currentView(),target.id,mix);');q.run(change);
  const frozen=q.run('JSON.stringify({game,draft})');assert.equal(q.run('confirmServiceAgreement()'),false,change);assert.equal(q.run('JSON.stringify({game,draft})'),frozen);
 }
});
test('Future renewals stage capacity only; missing treasury platform and forged mixes remain blocked',()=>{
 const h=fresh();h.run("later=currentView().serviceAgreements.find(c=>c.kind==='payroll'&&c.due>1);mix=serviceAgreementOptions(currentView(),draft,later.id).options[0];");
 const quote=copy(h.run('serviceAgreementProposal(currentView(),draft,later.id,mix)'));assert.equal(quote.bid,false);assert.equal(quote.candidate.contractBid,null);
 assert(quote.effects.some(s=>s.includes('No future bid is scheduled')));
 const before=h.run('JSON.stringify({game,draft})');
 assert.throws(()=>h.run("serviceAgreementProposal(currentView(),draft,target.id,{staff:99,outsourcing:99})"),/no longer supports/);
 assert.throws(()=>h.run("serviceAgreementOptions(currentView(),draft,'forged')"),/unavailable/);
 assert.equal(h.run("serviceAgreementOptions(currentView(),draft,currentView().serviceAgreements.find(c=>c.kind==='treasury').id).options.length"),0);
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
});
test('An actual bid uses finite staff and pays its standing costs once through half-ready recovery',()=>{
 const h=fresh();h.run(`mix=serviceAgreementOptions(currentView(),draft,target.id).options[0];draft=serviceAgreementProposal(currentView(),draft,target.id,mix).candidate;draft.decision='b';first=JSON.parse(JSON.stringify(draft));staffBefore=game.players[0].stats.staff;
  seat=1;newDraft(currentView());draft.decision='b';second=JSON.parse(JSON.stringify(draft));E.submit(game,0,first);resumed=E.migrateCampaign(JSON.parse(JSON.stringify(game)));E.submit(game,1,second);E.submit(resumed,1,second);E.validatePilot(game);E.validateLedger(game);`);
 assert.deepEqual(copy(h.run('E.migrateCampaign(JSON.parse(JSON.stringify(game)))')),copy(h.run('E.migrateCampaign(JSON.parse(JSON.stringify(resumed)))')));
 assert.equal(h.run('game.players[0].stats.staff'),h.run('staffBefore'));
 assert.equal(h.run('game.players[0].serviceDesk.policy.staff'),h.run('mix.staff'));
 assert.equal(h.run('game.players[0].serviceDesk.policy.outsourcing'),h.run('mix.outsourcing'));
 assert.equal(h.run('game.players[0].operatingReport.contractServicing'),h.run('mix.outsourcing*6000'),'A new award earns next month; this month charges contracted capacity once');
 assert.equal(h.run('game.players[0].departmentFunctions.report.vendorExpense'),3500,'The agreed Technology support is paid exactly once');
 assert(h.run('game.serviceAgreements.filter(c=>c.id===target.id).length===1'));
 assert(h.run('E.publicState(game,1).rival.departmentFunctionDelivery===undefined'));
});
test('Earlier campaign inspection preserves its version and cannot mutate legacy staffing instructions',()=>{
 for(const version of [4,7,8]){
  const h=fresh(version);h.run('draft.servicePolicy.staff=2;draft.allocation.business=1;');
  const before=h.run('JSON.stringify({game,draft})');if(version>=7)assert.throws(()=>h.run('serviceDraftPlayer(currentView())'),/Service desk/);else h.run('serviceDraftPlayer(currentView())');assert.equal(h.run('JSON.stringify({game,draft})'),before);
  assert.equal(h.run('game.financialGroupVersion'),version);
 }
});
