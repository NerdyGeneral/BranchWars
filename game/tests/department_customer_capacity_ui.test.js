'use strict';
// Actual assembled client and Group6 engine facade. Draft-only staffing/vendor
// variations are explicit test instructions, never injected funds or books.
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test');let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function fresh(version=6){
 const h=harness();h.run(`const base=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options;const options=E.previewFeatureSelection(base,{field:'onboardingVersion',value:1}).options;
 game=E.createGame({...options,mode:'hotseat',seed:'customer-capacity-ui',created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='products';newDraft(currentView());draft.decision='b';
 draft.allocation={service:4,business:1,lending:1,operations:2};draft.householdPolicy.retention=25;draft.relationshipOfferPolicy.share=25;draft.onboardingPolicy.share=25;
 draft.management.research.enabled=false;draft.investments={};
 for(const office of Object.values(draft.facilityLifecyclePolicy.offices))for(const role of E.DepartmentFunctions.ROLES)office.staffQuarters[role]=0;
 if(draft.departmentFunctionsPolicy){for(const row of Object.values(draft.departmentFunctionsPolicy.quotas))for(const role of E.DepartmentFunctions.ROLES)row[role]=0;draft.departmentFunctionsPolicy.vendors.relationships=2;draft.departmentFunctionsPolicy.vendors.onboarding=2;}
 errors=[];toast=s=>errors.push(s);renderProducts=v=>renderProductPrograms(v);renderProjects=()=>{};renderReady=()=>{};
 const originalCustomerPreview=E.departmentCustomerPreview;customerCalls=0;E.departmentCustomerPreview=(...args)=>{customerCalls++;return originalCustomerPreview(...args);};
 `);return h;
}
const panel=h=>h.elements.get('#productProgramsPanel').innerHTML;
const bytes=h=>h.run('JSON.stringify(game)'),draftBytes=h=>h.run('JSON.stringify(draft)');
function desk(h,name){h.run(`productDeskView='${name}';renderProductPrograms(currentView());`);return panel(h);}
test('Both desks use authoritative preparation and distinguish physical from effective work',()=>{
 const h=fresh(),before=bytes(h),draftBefore=draftBytes(h);h.run('const quoted=E.departmentCustomerPreview(currentView().me,currentView(),draft);');
 const offers=desk(h,'relationships'),onboarding=desk(h,'onboarding');
 for(const content of [offers,onboarding]){assert.doesNotMatch(content,/Draft quote unavailable/);assert.match(content,/Bank staff assigned/);assert.match(content,/Remaining Retail sales staff/);assert.match(content,/banker-equivalents/);assert.match(content,/Vendor fees are already included once/);}
 assert.match(offers,/Purchased offer work/);assert.match(onboarding,/Purchased onboarding work/);
 for(const key of ['relationshipOffers','onboarding'])assert.equal(h.run('quoted.'+key+'.staffingVersion'),2);
 assert(h.run('customerCalls')>=3);assert.equal(bytes(h),before);assert.equal(draftBytes(h),draftBefore);
 assert.equal(h.run('game.players[0].stats.cash-quoted.owner.stats.cash'),h.run('quoted.owner._departmentFunctionForecastExpense'),'This no-project/no-leader fixture pays the quoted vendor amount once in its private preview copy.');
 assert(offers.includes(h.run('quoted.relationshipOffers.salesStaff.toFixed(2)')+' effective bankers after all reservations'));
 assert(onboarding.includes(h.run('quoted.onboarding.salesStaff.toFixed(2)')+' effective bankers after all reservations'));
});
test('Additional physical allocations are quoted through the same shared task execution',()=>{
 const h=fresh();h.run('const baselineCustomer=E.departmentCustomerPreview(currentView().me,currentView(),draft);draft.departmentFunctionsPolicy.quotas.relationships.service=1;draft.departmentFunctionsPolicy.quotas.onboarding.service=1;const additionalCustomer=E.departmentCustomerPreview(currentView().me,currentView(),draft);');
 for(const key of ['relationshipOffers','onboarding'])assert(h.run('additionalCustomer.staffing.'+key+'.physicalAssigned>=baselineCustomer.staffing.'+key+'.physicalAssigned'));
 assert.equal(h.run('baselineCustomer.staffing.onboarding.physicalSales-additionalCustomer.staffing.onboarding.physicalSales'),.5,'Two additional quarters leave the ordinary sales pool even when current customer work is already covered.');
 assert.doesNotMatch(desk(h,'relationships'),/Draft quote unavailable/);assert.doesNotMatch(desk(h,'onboarding'),/Draft quote unavailable/);
});
test('Offers do not deduct onboarding a second time from the final residual',()=>{
 const h=fresh();h.run('const previousSales=E.onboardingSalesStaff;E.onboardingSalesStaff=()=>{throw Error("double deduction");};');
 assert.doesNotMatch(desk(h,'relationships'),/double deduction|Draft quote unavailable/);
});
test('Vendor-funded work cannot manufacture physical staff or negative sales capacity',()=>{
 const h=fresh();h.run('draft.allocation={service:0,business:2,lending:2,operations:4};draft.departmentFunctionsPolicy.vendors.relationships=16;draft.departmentFunctionsPolicy.vendors.onboarding=16;const vendorQuote=E.departmentCustomerPreview(currentView().me,currentView(),draft);');
 for(const key of ['relationshipOffers','onboarding']){assert.equal(h.run('vendorQuote.staffing.'+key+'.physicalSales'),0);assert(h.run('vendorQuote.'+key+'.salesStaff')>=0);assert.equal(h.run('vendorQuote.staffing.'+key+'.physicalAssigned'),0);}
 assert(h.run('vendorQuote.staffing.relationshipOffers.vendorStaff>0||vendorQuote.staffing.onboarding.vendorStaff>0'));
 assert.doesNotMatch(desk(h,'relationships'),/Draft quote unavailable/);assert.doesNotMatch(desk(h,'onboarding'),/Draft quote unavailable/);
 assert.match(panel(h),/0\.00 FTE/);
});
test('Invalid shared staffing preserves controls and permits explicit pause without clearing other orders',()=>{
 for(const name of ['relationships','onboarding']){
  const h=fresh();h.run('draft.departmentFunctionsPolicy.quotas.credit.lending=999;');const before=bytes(h),draftBefore=JSON.parse(draftBytes(h)),html=desk(h,name);
  assert.match(html,/Draft quote unavailable/);assert.match(html,/Paused · 0%/);const id=name==='relationships'?'#relationshipOffer-share':'#onboarding-share';
  assert(h.elements.get(id)?.listeners.change,'Repair control stays bound');h.elements.get(id).listeners.change({target:{value:'0'}});
  const after=JSON.parse(draftBytes(h)),key=name==='relationships'?'relationshipOfferPolicy':'onboardingPolicy';assert.equal(after[key].share,0);draftBefore[key].share=0;assert.deepEqual(after,draftBefore);assert.equal(bytes(h),before);
  assert.match(panel(h),/Draft quote unavailable/);assert.equal(h.run('errors.length'),0);
 }
});
test('Invalid budget retains a pause control and never stages paid increases',()=>{
 const h=fresh();h.run('draft.departmentFunctionsPolicy.vendors.relationships=1000;');const before=draftBytes(h),html=desk(h,'relationships');assert.match(html,/Draft quote unavailable/);
 assert.equal(h.run("stageRelationshipOffer(currentView(),'share',50)"),false);assert.equal(draftBytes(h),before);
 assert.equal(h.run("stageRelationshipOffer(currentView(),'share',0)"),true);assert.equal(h.run('draft.departmentFunctionsPolicy.vendors.relationships'),1000);
});
test('Owner, replaced session, stale draft, paused connection, ended and sealed guards remain atomic',()=>{
 for(const name of ['relationships','onboarding'])for(const mutation of ['draft.depositPolicy="aggressive"','game=JSON.parse(JSON.stringify(game))','seat=1','game.players[0].submitted={}','game.gameOver=true','gh.active=true;gh.paused=true']){
  const h=fresh();desk(h,name);const id=name==='relationships'?'#relationshipOffer-share':'#onboarding-share',handler=h.elements.get(id).listeners.change;
  h.run(mutation);const before=draftBytes(h);handler({target:{value:'0'}});assert.equal(draftBytes(h),before,mutation);
 }
});
test('Legacy Group5 uses unchanged quotes and does not acquire modern capacity wording',()=>{
 const h=fresh(5);h.run('E.departmentCustomerPreview=()=>{throw Error("Modern facade forbidden");};');
 assert.match(desk(h,'relationships'),/Assigned Retail time/);assert.doesNotMatch(panel(h),/Purchased offer work|Modern facade forbidden/);
 assert.match(desk(h,'onboarding'),/Reserved \/ remaining Retail time/);assert.doesNotMatch(panel(h),/Purchased onboarding work|Modern facade forbidden/);
});
console.log(JSON.stringify({suite:'department-customer-capacity-ui',checks,scope:'Actual Group6 preview facade/owner-only client, precise residual and vendor labeling, pure drafts, error repair controls, lock/stale-session checks and historical Group5 UI path. No browser acceptance claim.'}));
