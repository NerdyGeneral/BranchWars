'use strict';
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
function officeHarness(){
 const h=harness(),panel=h.elements.get('#facilityLifecyclePanel')||h.c.document.querySelector('#facilityLifecyclePanel');let html='';
 // Retained component compatibility: these assertions own the original
 // lifecycle/premises DOM. Canonical Markets and real browser tests separately
 // cover Expanded's new inspectors, shared finite supply and return routing.
 h.run('expandedInterfaceEnabled=()=>false;');
 Object.defineProperty(panel,'innerHTML',{configurable:true,get:()=>html,set:markup=>{
  html=markup;
  for(const m of markup.matchAll(/<[a-z]+\b[^>]*\bid="([^"]+)"[^>]*>/g)){
   const el=h.c.document.querySelector('#'+m[1]);el.listeners={};el.disabled=/\sdisabled(?:\s|>)/.test(m[0]);
   if(m[0].startsWith('<input'))el.value=m[0].match(/\bvalue="([^"]*)"/)?.[1]||'';
  }
  for(const m of markup.matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g))h.c.document.querySelector('#'+m[1]).value=m[2].match(/<option value="([^"]*)" selected/)?.[1]||'';
 }});
 h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded').options,sharedPremisesVersion:1,mode:'hotseat',seed:'premises-ui50',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());draft.decision='b';notices=[];toast=m=>notices.push(m);renderReady=()=>{};renderFacilityLifecycle(currentView());`);
 h.click=(key,value)=>h.elements.get('#sharedPremisesDesk').listeners.click({target:{dataset:{[key]:value}}});
 return h;
}
test('office extension review is pure, displays complete costs and stages only its own draft',()=>{
 const h=officeHarness(),before=h.run('JSON.stringify(game)'),draftBefore=h.run('JSON.stringify(draft)');
 assert.match(h.elements.get('#facilityLifecyclePanel').innerHTML,/Shared service rooms/);
 assert.match(h.elements.get('#facilityLifecyclePanel').innerHTML,/<section[^>]+id="sharedPremisesDesk"/);
 assert.doesNotMatch(h.elements.get('#facilityLifecyclePanel').innerHTML,/<summary>(?:Add service space|Shared service rooms)/);
 h.click('premisesChoice','kind:visiting');
 let html=h.elements.get('#facilityLifecyclePanel').innerHTML;
 assert.match(html,/45,000/);assert.match(html,/900/);assert.match(html,/25% of a month/);assert.match(html,/Internal rent is not new group profit/);
 assert.equal(h.run('JSON.stringify(draft)'),draftBefore);assert.equal(h.run('JSON.stringify(game)'),before);
 h.click('premisesAction','discard');assert.equal(h.run('draft.sharedPremisesPolicy.build'),null);
 h.click('premisesChoice','kind:visiting');
 h.run(`document.querySelector('#lifecycleStaff-service').value='1.25'`);
 const stale=h.elements.get('#sharedPremisesDesk').listeners.click;
 h.click('premisesAction','stage');
 assert.equal(h.run('draft.sharedPremisesPolicy.build.kind'),'visiting');assert.equal(h.run('lifecycleUi.form.offices[lifecycleUi.office].staffQuarters.service'),5);
 assert.equal(h.run('JSON.stringify(game)'),before);assert.equal(h.run('draft.decision'),'b');
 assert.equal(h.run('monthlyChangeRows(currentView()).filter(r=>r.path[0]==="sharedPremisesPolicy").length'),1,'Space and allocations undo as one instruction');
 assert.match(h.run('monthlyChangeValue(currentView(),draft.sharedPremisesPolicy,["sharedPremisesPolicy"])'),/Visiting-adviser desk at Downtown/);
 assert.match(h.elements.get('#facilityLifecyclePanel').innerHTML,/Fit-out staged: Visiting-adviser desk at Downtown/);
 const next=h.run('JSON.stringify(draft)');stale({target:{dataset:{premisesAction:'reset'}}});assert.equal(h.run('JSON.stringify(draft)'),next);
 h.click('premisesAction','reset');assert.equal(h.run('draft.sharedPremisesPolicy.build'),null);
});
test('quote rejects unaffordable and foreign work, uses staged upkeep, and does not mutate owner or view',()=>{
 const h=officeHarness();
 h.run(`base=JSON.stringify(game);originalDraft=JSON.stringify(draft);proposal=JSON.parse(JSON.stringify(draft));proposal.sharedPremisesPolicy.build={office:game.players[0].facilityNetwork.offices[0].id,kind:'visiting'};q=E.sharedPremisesPlanReview(currentView(),currentView().me,proposal)`);
 assert(h.run('q.eligible'));assert.equal(h.run('q.budget.construction'),45000);
 assert.equal(h.run('JSON.stringify(game)'),h.run('base'));assert.equal(h.run('JSON.stringify(draft)'),h.run('originalDraft'));
 h.run(`proposal.sharedPremisesPolicy.build.office=game.players[1].facilityNetwork.offices[0].id;q=E.sharedPremisesPlanReview(currentView(),currentView().me,proposal)`);assert(!h.run('q.eligible'));
 h.run(`proposal.sharedPremisesPolicy.build.office=game.players[0].facilityNetwork.offices[0].id;game.players[0].stats.cash=0;q=E.sharedPremisesPlanReview(currentView(),currentView().me,proposal)`);assert(!h.run('q.eligible'));
});
test('actual room opens after settlement; staff remain qualified and finite, with reviewed removal and read-only inspection',()=>{
 const h=officeHarness();
 h.run(`p=game.players[0];const amount=350000;p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.capitalReturn',{cash:-amount,equity:-amount});p.stats.cash=p.accounting.accounts.cash;p.stats.capital=p.accounting.accounts.equity;p.stats.earnings=p.accounting.retainedEarnings;p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.capitalReturn',p.id,{cash:amount,investments:-amount});p.financialGroup.investmentBasis.bank-=amount;
  newDraft(currentView());draft.decision='b';Object.assign(draft.investmentPolicy.institution,{launch:true,capital:250000,roles:{adviser:1,broker:0,principal:0,operations:1}});draft.sharedPremisesPolicy.build={office:p.facilityNetwork.offices[0].id,kind:'visiting'};
  for(let n=0;n<2;n++){E.submit(game,0,draft);E.submit(game,1,E.chooseBot(game,1));E.validatePilot(game);newDraft(currentView());draft.decision='b';}renderFacilityLifecycle(currentView());`);
 h.run(`clashing=JSON.parse(JSON.stringify(draft));clashing.facilityExtensionPolicy={start:game.players[0].facilityNetwork.offices[0].id,cancel:null};clash=E.sharedPremisesPlanReview(currentView(),currentView().me,clashing)`);
 assert(!h.run('clash.eligible'));assert.match(h.run('clash.reason'),/excess service space/);
 const roomState=h.run('JSON.stringify(game)');assert.throws(()=>h.run('E.submit(game,0,clashing)'),/excess service space/);assert.equal(h.run('JSON.stringify(game)'),roomState);
 h.click('premisesChoice','room:1');
 assert.match(h.elements.get('#facilityLifecyclePanel').innerHTML,/Investment adviser/);
 const standing=h.run('JSON.stringify(draft.sharedPremisesPolicy)');
 h.run(`document.querySelector('#premisesRole-adviser').value='0.25'`);
 h.elements.get('#sharedPremisesDesk').listeners.input({target:{id:'premisesRole-adviser'}});
 assert.equal(h.run('premisesUi.form.allocations[0].quarters'),1);
 h.click('premisesAction','stage');assert.equal(h.run('JSON.stringify(draft.sharedPremisesPolicy)'),standing,'Input capture cannot bypass reviewing a changed staffing estimate');
 assert.match(h.run('notices.at(-1)'),/Estimate refreshed/);
 h.run(`draft.decision='a';renderFacilityLifecycle(currentView())`);
 assert.equal(h.elements.get('#premisesRole-adviser').value,'0.25','Unrelated draft changes retain working room time');
 h.click('premisesAction','investments');assert.equal(h.run('workspaceTab'),'group');
 h.run('returnBankingContext();renderFacilityLifecycle(currentView())');
 assert.equal(h.run('premisesUi.selection'),'room:1');assert.equal(h.elements.get('#premisesRole-adviser').value,'0.25','Subsidiary staffing and Return keep unfinished allocations');
 h.run(`document.querySelector('#premisesRole-adviser').value=''`);
 h.elements.get('#sharedPremisesDesk').listeners.input({target:{id:'premisesRole-adviser'}});h.run('renderFacilityLifecycle(currentView())');
 assert.equal(h.elements.get('#premisesRole-adviser').value,'','Unfinished input is retained without inventing a zero allocation');
 assert.match(h.elements.get('#facilityLifecyclePanel').innerHTML,/Enter non-negative employee-months/);
 h.click('premisesAction','discard');assert.equal(h.run('premisesUi.selection'),null);
 h.click('premisesChoice','room:1');
 h.run(`document.querySelector('#premisesRole-adviser').value='0.5'`);h.click('premisesAction','review');
 assert.match(h.elements.get('#facilityLifecyclePanel').innerHTML,/space limit|physical room seats/);
 h.run(`document.querySelector('#premisesRole-adviser').value='0.25'`);h.click('premisesAction','review');
 assert.match(h.elements.get('#facilityLifecyclePanel').innerHTML,/1 full month qualified/);
 const before=h.run('JSON.stringify(game)');h.click('premisesAction','stage');assert.equal(h.run('draft.sharedPremisesPolicy.allocations[0].quarters'),1);
 assert.equal(h.run('JSON.stringify(game)'),before);
 h.run(`draft.facilityLifecyclePolicy.offices[lifecycleUi.office].maintenance='off';q=E.sharedPremisesPlanReview(currentView(),currentView().me,draft)`);assert.equal(h.run('q.budget.outsideCost'),900);
 h.run(`draft.facilityLifecyclePolicy.offices[lifecycleUi.office].maintenance='full';q=E.sharedPremisesPlanReview(currentView(),currentView().me,draft)`);assert.equal(h.run('q.budget.outsideCost'),1008);
 h.click('premisesAction','remove');assert.match(h.elements.get('#facilityLifecyclePanel').innerHTML,/No sale proceeds or refund/);
 h.click('premisesAction','stage');assert.equal(h.run('draft.sharedPremisesPolicy.remove'),1);assert.equal(h.run('draft.sharedPremisesPolicy.allocations.length'),0);
 h.click('premisesAction','reset');assert.equal(h.run('draft.sharedPremisesPolicy.remove'),null);
 h.run(`E.submit(game,0,draft);renderFacilityLifecycle(currentView())`);h.click('premisesChoice','room:1');
 assert.match(h.elements.get('#facilityLifecyclePanel').innerHTML,/id="premisesRole-adviser"[^>]*disabled/);
 const locked=h.run('JSON.stringify(draft)');h.click('premisesAction','stage');assert.equal(h.run('JSON.stringify(draft)'),locked);
});

test('pending service choices follow each office and reset only for changed premises authority or session',()=>{
 const h=officeHarness(),world=h.run('JSON.stringify(game)');h.click('premisesChoice','kind:visiting');
 const working=h.run('JSON.stringify(premisesUi.form)');
 // A second presentation target is enough to exercise selection ownership;
 // no synthetic office is added to the engine or ever staged.
 h.run(`const homeOffice=currentView().me.facilityNetwork.offices[0];sharedPremisesMarkup(currentView(),{...homeOffice,id:'comparison-only'},'')`);
 assert.equal(h.run('premisesUi.selection'),null);h.run(`sharedPremisesMarkup(currentView(),homeOffice,'')`);
 assert.equal(h.run('premisesUi.selection'),'kind:visiting');assert.equal(h.run('JSON.stringify(premisesUi.form)'),working);
 h.run(`draft.decision='a';renderFacilityLifecycle(currentView())`);
 assert.equal(h.run('JSON.stringify(premisesUi.form)'),working);assert.equal(h.run('premisesUi.selection'),'kind:visiting');
 assert.equal(h.run('JSON.stringify(game)'),world);assert.equal(h.run('draft.sharedPremisesPolicy.build'),null);
 h.run(`draft.sharedPremisesPolicy.build={office:homeOffice.id,kind:'agency'};renderFacilityLifecycle(currentView())`);
 assert.equal(h.run('premisesUi.form.build.kind'),'agency');assert.equal(h.run('premisesUi.selection'),'kind:agency','An externally revised premises plan owns the replacement editor');
 h.run(`connectionAttempt++;draft.sharedPremisesPolicy.build=null;renderFacilityLifecycle(currentView())`);
 assert.equal(h.run('premisesUi.selection'),null);assert.equal(h.run('premisesUi.form.build'),null);
 h.click('premisesChoice','kind:visiting');h.run(`game.cycle++;renderFacilityLifecycle(currentView())`);
 assert.equal(h.run('premisesUi.selection'),null);assert.equal(h.run('premisesUi.form.build'),null,'A new month cannot inherit an unreviewed fit-out');
 h.run('newDraft(currentView());renderFacilityLifecycle(currentView())');
 h.click('premisesChoice','kind:visiting');h.run(`seat=1;newDraft(currentView());renderFacilityLifecycle(currentView())`);
 assert.equal(h.run('premisesUi.selection'),null);assert.equal(h.run('premisesUi.form.build'),null,'Unstaged work does not cross hotseat owners');
});

test('routine guest state refresh preserves the service editor while invalidating old action callbacks',()=>{
 const h=officeHarness();
 h.run(`view=E.publicState(game,0);game=null;p2pRole='guest';newDraft(currentView());renderFacilityLifecycle(currentView())`);
 h.click('premisesChoice','kind:visiting');
 const working=h.run('JSON.stringify(premisesUi.form)'),stale=h.elements.get('#sharedPremisesDesk').listeners.click,before=h.run('JSON.stringify(draft)');
 h.run(`view=JSON.parse(JSON.stringify(view));view.rival.submitted=true;renderFacilityLifecycle(currentView())`);
 assert.equal(h.run('premisesUi.selection'),'kind:visiting');assert.equal(h.run('JSON.stringify(premisesUi.form)'),working);
 stale({target:{dataset:{premisesAction:'stage'}}});assert.equal(h.run('JSON.stringify(draft)'),before,'An action quoted against the old view cannot stage after refresh');
 h.click('premisesAction','stage');assert.equal(h.run('draft.sharedPremisesPolicy.build.kind'),'visiting','The refreshed engine quote remains actionable');
});
test('closed and old-rule campaigns do not gain editable premises; connection and month changes refuse stale callbacks',()=>{
 const h=officeHarness();h.click('premisesChoice','kind:agency');const stale=h.elements.get('#sharedPremisesDesk').listeners.click,old=h.run('JSON.stringify(draft)');
 h.run('game.cycle++');stale({target:{dataset:{premisesAction:'stage'}}});assert.equal(h.run('JSON.stringify(draft)'),old);
 h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded').options,companyCreditVersion:0,sharedPremisesVersion:0,mode:'hotseat',seed:1,created:1});newDraft(currentView());renderFacilityLifecycle(currentView())`);
 assert(!h.run('draft.sharedPremisesPolicy'));assert.doesNotMatch(h.elements.get('#facilityLifecyclePanel').innerHTML,/id="sharedPremisesDesk"/);
 assert.match(h.elements.get('#facilityLifecyclePanel').innerHTML,/commercial banking suite/);
});
test('invalid room time blocks readiness and stale connections cannot apply an editor',()=>{
 const h=officeHarness();h.click('premisesChoice','kind:visiting');
 const stale=h.elements.get('#sharedPremisesDesk').listeners.click,old=h.run('JSON.stringify(draft)');
 h.run('connectionAttempt++');stale({target:{dataset:{premisesAction:'stage'}}});assert.equal(h.run('JSON.stringify(draft)'),old);
 h.run(`draft.sharedPremisesPolicy.allocations=[{room:777,entity:game.players[0].agency.book.entityId,role:'servicing',quarters:1}];r=monthlyPlanReview(currentView())`);
 assert(h.run('r.blockers.some(b=>b.id==="shared-premises")'));
});
