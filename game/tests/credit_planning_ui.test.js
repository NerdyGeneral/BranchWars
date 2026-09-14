'use strict';
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),{harness}=require('./github_resilience.test');
const copy=x=>JSON.parse(JSON.stringify(x)),c={};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.creditPlanningProbe={creditSalesStaff,workforceAllocation};root.BWEngine={'),c);
const E=c.BWEngine;
test('Credit uses prepared finite work, truthful origination and the same operating forecast without mutating plans/world',()=>{
 const g=E.createGame({...E.previewCampaignEdition({},'expanded').options,mode:'hotseat',seed:'business-balance:1',created:1});
 const plans=g.players.map((_,i)=>E.chooseBot(g,i)),world=JSON.stringify(g),orders=JSON.stringify(plans);
 for(const i of [0,1]){
  const v=E.publicState(g,i),q=E.departmentCreditPreview(v.me,v,plans[i]),prepared=E.departmentCustomerPreview(v.me,v,plans[i]).owner;
  const raw=E.creditPerformanceForecast({...v.me,turnEffects:{}},v.economy,plans[i].allocation,plans[i].collectionsPolicy);
  assert(raw.salesStaff>q.collections.salesStaff,'Reproduce old overstatement after other department work');
  assert.equal(q.collections.salesStaff,c.creditPlanningProbe.creditSalesStaff(prepared,c.creditPlanningProbe.workforceAllocation(prepared).lending));
  const f=E.departmentFunctionsQuote(v,v.me,plans[i]);assert.equal(q.staffing.origination,f.remainingPools.lending/4);
  assert(q.staffing.origination<=q.staffing.available);assert.equal(q.facilityLoanCapacity,E.regionalBranchMetrics(prepared).loanCapacity);
  assert.deepEqual(copy(q.operating),copy(E.operatingPreview(v.me,plans[i],v.economy,v)));
  const corrupted=copy(plans[i]);corrupted.departmentFunctionsPolicy.quotas.credit.lending=999;assert.throws(()=>E.departmentCreditPreview(v.me,v,corrupted));
 }
 assert.equal(JSON.stringify(g),world);assert.equal(JSON.stringify(plans),orders);
 for(const i of [0,1])E.submit(g,i,plans[i]);E.validatePilot(g);E.validateLedger(g);
 for(const i of [0,1]){const v=E.publicState(g,i);assert.equal(v.departmentCreditPreview,undefined);assert.equal(v.rival.departmentCreditPreview,undefined);}
});
test('Credit flow is contextual, signed, actionable and stale controls cannot edit another owner or changed draft',()=>{
 const h=harness();h.run(`game=E.createGame({...E.previewCampaignEdition({},'expanded').options,mode:'hotseat',seed:'business-balance:1',created:1});seat=0;workspaceTab='credit';newDraft(currentView());renderReady=()=>renderCollections(currentView());document.querySelector('#creditPanel').insertAdjacentHTML=function(where,html){this.innerHTML=html+this.innerHTML;};renderCollections(currentView());`);
 let html=h.elements.get('#creditPanel').innerHTML;
 assert.match(html,/LOAN BOOK MOVEMENT/);assert.match(html,/Scheduled principal repaid/);assert.match(html,/employee-months remain/);assert.match(html,/Not yet available/);assert.doesNotMatch(html,/NaN|undefined/);
 h.run(`creditRoute=null;setPeopleDesk=(key)=>{creditRoute=key;};document.querySelector('#creditWorkCoverage').listeners.click();`);assert.equal(h.run('creditRoute'),'coverage');
 assert.deepEqual(copy(h.run('creditFlowRows({loanGrowth:-15,principalRepaid:20,creditRecovery:3,chargeoff:2})')),[10,-20,-3,-2,-15]);assert.equal(h.run('creditFlowRows({loanGrowth:5})'),null);
 const gameBytes=h.run('JSON.stringify(game)');h.run(`document.querySelector('#collectionShare').value='0';document.querySelector('#collectionApproach').value='balanced';document.querySelector('#collectionShare').listeners.change();`);assert.equal(h.run('draft.collectionsPolicy.share'),0);assert.equal(h.run('JSON.stringify(game)'),gameBytes);
 // A second edit uses freshly rendered controls, not an expired draft token.
 h.run(`document.querySelector('#collectionShare').value='25';document.querySelector('#collectionApproach').value='workout';document.querySelector('#collectionShare').listeners.change();`);assert.equal(h.run('draft.collectionsPolicy.share'),25);
 h.run(`staleCredit=document.querySelector('#collectionShare').listeners.change;draft.decision=draft.decision==='a'?'b':'a';unchangedDraft=JSON.stringify(draft);staleCredit();`);assert.equal(h.run('JSON.stringify(draft)'),h.run('unchangedDraft'));
 h.run(`renderCollections(currentView());staleCredit=document.querySelector('#collectionShare').listeners.change;seat=1;newDraft(currentView());unchangedDraft=JSON.stringify(draft);staleCredit();`);assert.equal(h.run('JSON.stringify(draft)'),h.run('unchangedDraft'));
 h.run(`renderCollections(currentView());staleCredit=document.querySelector('#collectionShare').listeners.change;featureConnectionGeneration++;unchangedDraft=JSON.stringify(draft);staleCredit();`);assert.equal(h.run('JSON.stringify(draft)'),h.run('unchangedDraft'));
 h.run(`renderCollections(currentView());staleCredit=document.querySelector('#collectionShare').listeners.change;gh.active=true;gh.paused=true;unchangedDraft=JSON.stringify(draft);staleCredit();`);assert.equal(h.run('JSON.stringify(draft)'),h.run('unchangedDraft'));h.run('gh.active=false;gh.paused=false;');
 h.run(`renderCollections(currentView());draft.departmentFunctionsPolicy.quotas.credit.lending=999;renderCollections(currentView());`);html=h.elements.get('#creditPanel').innerHTML;assert.match(html,/Credit forecast unavailable/);assert.match(html,/Restore standing collections policy/);assert.doesNotMatch(html,/LOAN BOOK MOVEMENT/);
});
