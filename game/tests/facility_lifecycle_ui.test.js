'use strict';
// Isolated UI/domain contract only. Explicit inherited-roster, staffed and worn
// fixtures do not prove live construction, adapter economics, licensing or saves.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),elements=new Map();
function element(selector){
  if(elements.has(selector))return elements.get(selector);
  const el={value:'',textContent:'',open:false,listeners:{},classList:{add(){},remove(){},toggle(){}},addEventListener(k,fn){this.listeners[k]=fn;}};let markup='';
  Object.defineProperty(el,'innerHTML',{get:()=>markup,set:html=>{
    markup=String(html);
    for(const tag of markup.matchAll(/<input\b[^>]*>/g)){const id=tag[0].match(/id="([^"]+)"/)?.[1];if(id)element('#'+id).value=tag[0].match(/value="([^"]*)"/)?.[1]||'';}
    for(const select of markup.matchAll(/<select\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){
      const options=[...select[2].matchAll(/<option\b([^>]*)>/g)],chosen=options.find(o=>/ selected/.test(o[1]))||options[0];element('#'+select[1]).value=chosen?.[1].match(/value="([^"]*)"/)?.[1]||'';
    }
  }});elements.set(selector,el);return el;
}
const context={console,document:{querySelector:element,querySelectorAll:()=>[]},setTimeout:()=>0,clearTimeout(){}};
vm.createContext(context);const run=code=>vm.runInContext(code,context);
run(read('src/engine/accounting.js')+'\n'+read('src/engine/group-accounting.js')+'\n'+read('src/engine/facility-lifecycle.js'));
run(`const E={FacilityLifecycle,ROLES:{service:{name:'Retail & Service'},business:{name:'Business Banking'},lending:{name:'Lending'},operations:{name:'Operations & Risk'}}};
const copy=x=>JSON.parse(JSON.stringify(x)),pool=Object.fromEntries(FacilityLifecycle.ROLES.map(r=>[r,40]));
function fixture(id){return FacilityLifecycle.initialize({id,accounting:AccountingPrototype.opening(3),provider:GroupAccounting.opening('external:facilities'),submitted:false,
 facilityNetwork:{offices:['retail','regionalHub','wealth'].map((model,i)=>({id:id+':office:'+(i+1),model,market:i===2?'far':'near'+i,openedCycle:1,closedCycle:null,conversion:null}))}},1,true);}
let game={cycle:1,players:[fixture('bank:0'),fixture('bank:1')],gameOver:false},view=null,seat=0,draftOwner='bank:0',lastCycle=1;
let draft={facilityLifecyclePolicy:FacilityLifecycle.defaultPlan(game.players[0]),manualBid:'preserve'},lastToast='';
const $=s=>document.querySelector(s),esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),integer=x=>Number(x).toLocaleString();
function currentView(){return {me:copy(game.players[seat]),rival:{id:game.players[1-seat].id,privateSecret:'NEVER-RENDER-RIVAL'},cycle:game.cycle,gameOver:game.gameOver,territories:{near0:{name:'Local'},near1:{name:'Neighbor'},far:{name:'Distant'}}};}
function renderReady(){}function toast(x){lastToast=x;}
function domainContext(){return {cycle:game.cycle,freeCash:2000000,freeExecution:1,workRate:1,availableStaffQuarters:copy(pool),wealthLicensed:()=>false,nearby:(a,b)=>a.startsWith('near')&&b.startsWith('near'),
 payCash(p,amount,source){const invoice=GroupAccounting.bankServiceInvoice(p.accounting,p.provider,amount,p.id,source),paid=GroupAccounting.settleBankPayable(invoice.bank,invoice.provider,amount,p.id);p.accounting=paid.bank;p.provider=paid.provider;}};}
function closeFixtureMonth(plans){
 const context=domainContext();game.players=game.players.map((p,i)=>{
  let q=FacilityLifecycle.prepare(p,plans[i],context).owner;
  q=FacilityLifecycle.advance(q,context).owner;q=FacilityLifecycle.settle(q,context).owner;
  q=FacilityLifecycle.activate(q,game.cycle+1).owner;FacilityLifecycle.validate(q,game.cycle+1,true);return q;
 });game.cycle++;lastCycle=game.cycle;
}
E.defaultFacilityLifecyclePlan=p=>FacilityLifecycle.defaultPlan(p);
E.lifecycleInstructionQuote=(v,p,plan)=>{
 const c=domainContext(),policy=plan.facilityLifecyclePolicy||E.defaultFacilityLifecyclePlan(p),currentMetrics=FacilityLifecycle.metrics(p,c),nearbyHubIds={},renovationComparisons={};
 for(const o of p.facilityNetwork.offices.filter(o=>o.closedCycle===null)){
  nearbyHubIds[o.id]=p.facilityNetwork.offices.filter(h=>h.id!==o.id&&h.model==='regionalHub'&&h.closedCycle===null&&o.model!=='regionalHub'&&c.nearby(h.market,o.market)).map(h=>h.id);
  if(p.facilityLifecycle.records[o.id].renovation){const before=copy(p),after=copy(p);before.facilityLifecycle.records[o.id].renovation=null;after.facilityLifecycle.records[o.id].renovation=null;after.facilityLifecycle.records[o.id].conditionBp=10000;
   const row=x=>FacilityLifecycle.metrics(x,c).rows.find(r=>r.officeId===o.id);renovationComparisons[o.id]={before:row(before),during:row(p),after:row(after)};}
 }
 let quote=null,status;try{quote=FacilityLifecycle.quote(p,policy,c);status={eligible:quote.eligible,reason:quote.reason};}catch(e){status={eligible:false,reason:e.message};}
 return {policy:copy(policy),quote,status,currentMetrics,availableStaffQuarters:copy(pool),nearbyHubIds,renovationComparisons};
};
E.facilityLifecycleStaffProposal=(v,p,plan)=>{const q=FacilityLifecycle.allocateStaff(p,pool);return {policy:q.plan,unused:q.unused};};
`);
run(read('src/ui/facility-lifecycle.js'));
// Build worn facilities through every real monthly phase, not fabricated age,
// phase counters or history. Off maintenance loses180bp/month:25months ->55%.
run("for(let month=0;month<25;month++){const plans=game.players.map(p=>{const plan=FacilityLifecycle.defaultPlan(p);for(const row of Object.values(plan.offices))row.maintenance='off';return plan;});closeFixtureMonth(plans);}draft.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(game.players[0]);renderFacilityLifecycle(currentView());");
const panel=element('#facilityLifecyclePanel'),state=()=>run('JSON.stringify(game)'),plan=()=>run('JSON.stringify(draft)'),initial=state(),original=plan();
assert.match(panel.innerHTML,/OFFICE CONDITION &amp; STAFFING/);assert.match(panel.innerHTML,/55.0%/);assert.match(panel.innerHTML,/1.80 points wear last month/);
assert.match(panel.innerHTML,/four quarters = one banker/);assert.match(panel.innerHTML,/Deferred|deferred wear/);assert.match(panel.innerHTML,/bank:0:office:1/);
assert(!panel.innerHTML.includes('NEVER-RENDER-RIVAL'));assert.equal(state(),initial);assert.equal(plan(),original);
// Actual authored proximity from the adapter, never map coordinates inferred by UI.
assert.match(element('#lifecycleHub').value,/^$/);assert.match(panel.innerHTML,/<option value="bank:0:office:2">bank:0:office:2/);
element('#lifecycleMaintenance').value='basic';element('#lifecycleHub').value='bank:0:office:2';
element('#prepareLifecycleStaff').listeners.click();
assert.equal(plan(),original);assert.equal(state(),initial);assert.equal(run("lifecycleUi.form.offices['bank:0:office:1'].maintenance"),'basic');
assert.equal(run("lifecycleUi.form.offices['bank:0:office:1'].hubId"),'bank:0:office:2');assert.match(panel.innerHTML,/Staffing proposal prepared/);
assert(run("lifecycleUi.form.offices['bank:0:office:1'].staffQuarters.service>0"));
element('#previewLifecycleRenovation').listeners.click();assert.equal(plan(),original);assert.equal(state(),initial);
assert.match(panel.innerHTML,/\$143,000/);assert.match(panel.innerHTML,/Before/);assert.match(panel.innerHTML,/During work/);assert.match(panel.innerHTML,/After activation/);
assert.match(panel.innerHTML,/does not create|does not.*grant/);assert.match(panel.innerHTML,/Renovation preview only/);
const oldStage=element('#stageLifecycleSettings').listeners.click;oldStage();
assert.equal(state(),initial);assert.equal(run('draft.facilityLifecyclePolicy.renovate'),'bank:0:office:1');assert.equal(run('draft.manualBid'),'preserve');
const staged=plan();oldStage();assert.equal(plan(),staged);assert.match(run('lastToast'),/view or plan changed/);
element('#clearLifecycleSettings').listeners.click();assert.equal(run('draft.facilityLifecyclePolicy.renovate'),null);assert.equal(state(),initial);
// Over-allocation and forged hub changes cannot replace the valid shared plan.
run("renderFacilityLifecycle(currentView());");element('#lifecycleStaff-service').value='401';element('#stageLifecycleSettings').listeners.click();
assert.equal(run("draft.facilityLifecyclePolicy.offices['bank:0:office:1'].staffQuarters.service"),0);assert.match(run('lastToast'),/quarter-FTE/);assert.equal(state(),initial);
run("renderFacilityLifecycle(currentView());");element('#lifecycleHub').value='not-owned';element('#stageLifecycleSettings').listeners.click();assert.match(run('lastToast'),/neighboring hub/);
// Explicit domain fixture for an in-progress paid renovation, not live campaign acceptance.
run("const id='bank:0:office:1',paidPlan=FacilityLifecycle.allocateStaff(game.players[0],pool).plan;paidPlan.renovate=id;const paidBefore=game.players[0].accounting.accounts.cash;closeFixtureMonth([paidPlan,E.defaultFacilityLifecyclePlan(game.players[1])]);if(paidBefore-game.players[0].accounting.accounts.cash!==143000)throw Error('Renovation must actually pay its paired supplier.');draft.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(game.players[0]);renderFacilityLifecycle(currentView());");
assert.match(panel.innerHTML,/\$143,000 already paid/);assert.match(panel.innerHTML,/After activation/);
const work=state();element('#cancelLifecycleRenovation').listeners.click();assert.equal(state(),work);assert.equal(run('draft.facilityLifecyclePolicy.cancel'),'bank:0:office:1');assert.match(element('#lifecycleStatus').textContent,/not refunded/);
element('#clearLifecycleSettings').listeners.click();assert.equal(run('draft.facilityLifecyclePolicy.cancel'),null);assert.equal(state(),work);
// Unlicensed advisory output stays visibly unavailable even in a broad roster fixture.
element('#lifecycleOffice').value='bank:0:office:3';element('#lifecycleOffice').listeners.change();assert.match(panel.innerHTML,/Advisory output unavailable/);
assert.equal(run('lifecycleUi.office'),'bank:0:office:3');
const signature=run('JSON.stringify(draft)'),campaign=run('game');run('game.players[0].submitted={};renderFacilityLifecycle(currentView());');
assert.match(panel.innerHTML,/id="stageLifecycleSettings" disabled/);assert.equal(run('stageFacilityLifecycle(currentView(),draft.facilityLifecyclePolicy)'),false);
assert.match(panel.innerHTML,/Plan submitted.*orders are locked/);
element('#lifecycleOffice').value='bank:0:office:1';element('#lifecycleOffice').listeners.change();assert.equal(run('lifecycleUi.office'),'bank:0:office:1','Sealed planning still permits read-only office inspection.');
run('game.players[0].submitted=false;renderFacilityLifecycle(currentView());');const replaced=element('#stageLifecycleSettings').listeners.click;
run('game=copy(game);');const replacement=plan();replaced();assert.equal(plan(),replacement);
// A real month can end with an identical persistent policy. Form-only edits
// from the prior month must not silently become the new month's preview.
run("renderFacilityLifecycle(currentView());lifecycleUi.form.offices['bank:0:office:1'].maintenance='full';const oldFormDraft=JSON.stringify(draft);closeFixtureMonth(game.players.map(p=>E.defaultFacilityLifecyclePlan(p)));draft=copy(draft);if(JSON.stringify(draft)!==oldFormDraft)throw Error('This regression requires unchanged draft bytes.');renderFacilityLifecycle(currentView());");
assert.equal(run("lifecycleUi.form.offices['bank:0:office:1'].maintenance"),run("draft.facilityLifecyclePolicy.offices['bank:0:office:1'].maintenance"));
run("game.gameOver={reason:'fixture-ended'};renderFacilityLifecycle(currentView());");assert.match(panel.innerHTML,/Campaign ended.*orders are locked/);
run('game.gameOver=false;');
run("seat=1;draftOwner=game.players[1].id;draft={facilityLifecyclePolicy:E.defaultFacilityLifecyclePlan(game.players[1])};renderFacilityLifecycle(currentView());");
assert.equal(run('lifecycleUi.owner'),'bank:1');assert(!panel.innerHTML.includes('bank:0:office:1'));
run('delete game.players[1].facilityLifecycle;renderFacilityLifecycle(currentView());');assert.equal(panel.innerHTML,'');
// Actual Group5 creation, API projection, canonical draft and Markets hooks.
// The previous detailed wear/renovation cases remain labeled domain fixtures.
if(!process.argv.includes('--source'))process.argv.push('--source');
const integrated=require('./github_resilience.test.js').harness();
integrated.run("const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options;game=E.createGame({...options,mode:'hotseat',seed:'lifecycle-source-ui',created:1});seat=0;newDraft(currentView());renderReady=()=>{};workspaceTab='markets';renderMarkets(currentView());");
assert.equal(integrated.run('game.version'),'9.4');assert.equal(integrated.run('game.financialGroupVersion'),5);
assert.equal(integrated.run('currentView().me.facilityNetwork.version'),2);
assert.equal(integrated.run('!!currentView().me.facilityLifecycle'),true);
assert.equal(integrated.run('JSON.stringify(draft.facilityLifecyclePolicy)'),integrated.run('JSON.stringify(E.defaultFacilityLifecyclePlan(currentView().me))'));
assert.match(integrated.elements.get('#facilityLifecyclePanel').innerHTML,/OFFICE CONDITION &amp; STAFFING/);
assert.match(integrated.elements.get('#facilityNetworkPanel').innerHTML,/ATM \/ micro service point/);
const actualState=integrated.run('JSON.stringify(game)');
assert(integrated.run('stageFacilityLifecycle(currentView(),draft.facilityLifecyclePolicy)'));
assert.equal(integrated.run('JSON.stringify(game)'),actualState,'Production lifecycle staging must not debit cash or change canonical offices.');
integrated.run('renderPlanBudget(currentView());');assert.match(integrated.elements.get('#planBudget').innerHTML,/Facility maintenance \+ renovation/);
// Actual browser regression: previewing a healthy office is invalid. Clearing
// it can produce an identical canonical draft, but must still reset form state.
integrated.run(`function hydrateHealthyOfficeControls(){const row=lifecycleUi.form.offices[lifecycleUi.office];$('#lifecycleMaintenance').value=row.maintenance;$('#lifecycleHub').value=row.hubId||'';for(const role of E.FacilityLifecycle.ROLES)$('#lifecycleStaff-'+role).value=String(row.staffQuarters[role]);}
 hydrateHealthyOfficeControls();const beforeHealthyPreview=JSON.stringify(draft);
 $('#previewLifecycleRenovation').listeners.click();`);
assert.match(integrated.elements.get('#facilityLifecyclePanel').innerHTML,/Choose a worn operating office/);
assert.notEqual(integrated.run('lifecycleUi.form.renovate'),null);
integrated.run("$('#clearLifecycleSettings').listeners.click();");
assert.equal(integrated.run('JSON.stringify(draft)'),integrated.run('beforeHealthyPreview'),'Clear must handle an unchanged canonical draft.');
assert.equal(integrated.run('lifecycleUi.form.renovate'),null,'Successful clear discards the invalid preview even with unchanged draft bytes.');
assert(!integrated.elements.get('#facilityLifecyclePanel').innerHTML.includes('Choose a worn operating office'));
integrated.run(`hydrateHealthyOfficeControls();$('#lifecycleMaintenance').value='off';$('#previewLifecycleSettings').listeners.click();hydrateHealthyOfficeControls();$('#stageLifecycleSettings').listeners.click();`);
assert.equal(integrated.run('draft.facilityLifecyclePolicy.offices[lifecycleUi.office].maintenance'),'off');
assert.equal(integrated.run('draft.facilityLifecyclePolicy.renovate'),null);
assert.equal(integrated.run('JSON.stringify(game)'),actualState,'Clear, replacement preview and staging remain non-authoritative.');
integrated.run('seat=1;newDraft(currentView());renderMarkets(currentView());');assert.equal(integrated.run('lifecycleUi.owner'),integrated.run('game.players[1].id'));
assert.equal(integrated.run('currentView().rival.facilityLifecycle'),undefined);
// Actual engine reserve/teaching rules and real readiness renderer. Specialist
// qualification below is an explicit within-headcount fixture, not earned AI.
const budgetUi=require('./github_resilience.test.js').harness();
budgetUi.run(`const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options;
 game=E.createGame({...options,mode:'hotseat',seed:'lifecycle-budget-ui',created:1});seat=0;
 game.event=JSON.parse(JSON.stringify(E.EVENTS.find(e=>e.key==='quiet')));
 game.players[0].workforce.departments.business.count=2;game.players[0].workforce.departments.business.skill=20;
 game.players[0].allocation={service:3,business:3,lending:1,operations:1};E.validatePilot(game);newDraft(currentView());draft.decision='b';
 renderOperatingPreview=()=>{};renderWorkforce=()=>{};renderProductPrograms=()=>{};renderPipeline=()=>{};
 function hydrateLifecycleControls(){const row=lifecycleUi.form.offices[lifecycleUi.office];$('#lifecycleMaintenance').value=row.maintenance;$('#lifecycleHub').value=row.hubId||'';for(const role of E.FacilityLifecycle.ROLES)$('#lifecycleStaff-'+role).value=String(row.staffQuarters[role]);}
 renderFacilityLifecycle(currentView());const businessBefore=E.lifecycleInstructionQuote(currentView(),currentView().me,draft).availableStaffQuarters.business;
 const staleTeachingHandler=$('#stageLifecycleSettings').listeners.click;
 draft.leaderOrders.business='mentor';draft.workforcePolicy.training.business=20000;
 const changedTeachingDraft=JSON.stringify(draft);staleTeachingHandler();
 if(JSON.stringify(draft)!==changedTeachingDraft)throw Error('Stale pre-teaching lifecycle handler changed the plan.');
 renderFacilityLifecycle(currentView());hydrateLifecycleControls();
 const taughtPool=E.lifecycleInstructionQuote(currentView(),currentView().me,draft).availableStaffQuarters.business;
`);
assert.equal(budgetUi.run('taughtPool'),budgetUi.run('businessBefore-4'),'Paid teaching removes exactly one physical banker from office availability.');
assert.match(budgetUi.elements.get('#facilityLifecyclePanel').innerHTML,new RegExp('id="lifecycleStaff-business" min="0" step="1" max="'+budgetUi.run('taughtPool')+'"'));
budgetUi.run(`draft.leaderOrders.business=null;draft.workforcePolicy.training.business=0;draft.departmentPolicy.reserve=10000000;
 renderFacilityLifecycle(currentView());hydrateLifecycleControls();const protectedState=JSON.stringify(game),protectedDraft=JSON.stringify(draft);
 const protectedReview=E.lifecycleInstructionQuote(currentView(),currentView().me,draft);
 const preparedBelowReserve=prepareLifecycleStaff(currentView());
`);
assert.equal(budgetUi.run('protectedReview.status.eligible'),false);
assert.equal(budgetUi.run('preparedBelowReserve'),true,'An unaffordable maintenance policy must not hide the pure staffing proposal.');
assert.match(budgetUi.elements.get('#facilityLifecyclePanel').innerHTML,/Staging remains blocked:.*(?:cash|reserves)/);
assert.equal(budgetUi.run('JSON.stringify(draft)'),budgetUi.run('protectedDraft'));
assert.equal(budgetUi.run('JSON.stringify(game)'),budgetUi.run('protectedState'));
assert.equal(budgetUi.run('stageFacilityLifecycle(currentView(),lifecycleUi.form)'),false);
budgetUi.run(`renderReady(currentView());`);assert.equal(budgetUi.elements.get('#readyBtn').disabled,true,'Optional maintenance cannot consume protected reserves.');
assert.match(budgetUi.elements.get('#submitMsg').textContent,/cash|reserves/,'The disabled Ready control explains the lifecycle constraint.');
budgetUi.run(`const noSpendPolicy=JSON.parse(JSON.stringify(draft.facilityLifecyclePolicy));for(const row of Object.values(noSpendPolicy.offices))row.maintenance='off';const stagedNoSpend=stageFacilityLifecycle(currentView(),noSpendPolicy);`);
assert.equal(budgetUi.run('stagedNoSpend'),true,'A zero-spend policy remains stageable below protected reserves.');
assert.equal(budgetUi.elements.get('#readyBtn').disabled,false);
assert.equal(budgetUi.run('JSON.stringify(game)'),budgetUi.run('protectedState'),'No quote, proposal or readiness update may debit the bank.');
budgetUi.run(`const validLifecycle=JSON.parse(JSON.stringify(draft.facilityLifecyclePolicy)),firstOffice=Object.keys(validLifecycle.offices)[0];draft.facilityLifecyclePolicy.offices[firstOffice].staffQuarters.service=401;renderReady(currentView());`);
assert.equal(budgetUi.elements.get('#readyBtn').disabled,true,'Shared lifecycle staffing validation also gates Ready.');
assert.match(budgetUi.elements.get('#submitMsg').textContent,/quarter-FTE/);
budgetUi.run('draft.facilityLifecyclePolicy=validLifecycle;renderReady(currentView());');assert.equal(budgetUi.elements.get('#readyBtn').disabled,false);
budgetUi.run('draft.decision=null;renderReady(currentView());');assert.equal(budgetUi.elements.get('#readyBtn').disabled,true,'Lifecycle affordability does not bypass a required executive decision.');
// Feature-off legacy harnesses do not need the new renderer or new exports.
const legacy=require('./github_resilience.test.js').harness();
legacy.run("const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:4}).options;game=E.createGame({...options,mode:'hotseat',seed:'lifecycle-disabled-ui',created:1});seat=0;newDraft(currentView());renderFacilityLifecycle=undefined;renderMarkets(currentView());setWorkspaceTab('markets');");
assert.equal(legacy.run('draft.facilityLifecyclePolicy'),undefined);
assert.equal(legacy.elements.get('#facilityLifecyclePanel').innerHTML,'');
assert(!legacy.elements.get('#facilityNetworkPanel').innerHTML.includes('ATM / micro service point'));
console.log('Facility lifecycle source UI PASS: real Group5 creation/public view/default draft/Markets hooks, versioned models, paid teaching pool, protected-reserve versus no-spend readiness, blocked-reason display, pure staffing repair previews, month reset and feature-off legacy; domain fixtures verify sequential wear, paired paid renovation, staff/hub/license boundaries and stale/sealed/cancel guards. Complete campaign, transport and browser acceptance remain separate.');
