'use strict';
// Actual assembled Group6/9.5 creation and client. No injected feature books or
// experimental source replacements; live runtime quotes own all capacity/costs.
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js');let checks=0;
function test(name,fn){try{fn();checks++;}catch(error){error.message=name+': '+error.message;throw error;}}
function fresh(version=6){const h=harness();h.run(`const originalQuery=document.querySelector;document.querySelector=selector=>{const el=originalQuery(selector);el.remove=function(){this.innerHTML='';};el.insertAdjacentHTML=function(position,html){if(position==='beforeend'||position==='afterend')this.innerHTML+=html;else if(position==='afterbegin'||position==='beforebegin')this.innerHTML=html+this.innerHTML;else throw Error('Unexpected insertion');};return el;};
 const settings=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options;
 game=E.createGame({...settings,mode:'hotseat',seed:'functions-live-ui',created:1});seat=0;p2pRole='';gh.active=false;workspaceTab='workforce';uiErrors=[];toast=message=>uiErrors.push(message);newDraft(currentView());draft.decision='b';
 renderDepartments(currentView());`);return h;}
const readPolicy=h=>h.run('JSON.stringify(draft.departmentFunctionsPolicy)'),gameBytes=h=>h.run('JSON.stringify(game)');
test('actual Group6 default draft and compact alternative desks',()=>{const h=fresh();assert.equal(h.run('game.version'),'9.5');assert.equal(h.run('game.financialGroupVersion'),6);
 assert(h.run('!!currentView().me.departmentFunctions'));assert.equal(readPolicy(h),h.run('JSON.stringify(E.defaultDepartmentFunctionsPolicy(currentView().me))'));
 const nav=h.elements.get('#departmentPanel').innerHTML,html=h.elements.get('#departmentFunctionsMount').innerHTML;
 assert.match(nav,/Functions & workload/);assert.match(nav,/Leadership & budgets/);assert(!nav.includes('departmentLeader-service'));
 assert.match(html,/DEPARTMENT FUNCTIONS/);assert.match(html,/max-height:280px/);assert.match(html,/shared commitments and reserves/);
 assert.equal((html.match(/id="df-vendor"/g)||[]).length,1);const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
 const before=readPolicy(h);h.elements.get('#department-view-leadership').listeners.click();assert.equal(h.run('departmentFunctionsLive.tab'),'leadership');assert.match(h.elements.get('#departmentPanel').innerHTML,/departmentLeader-service/);
 h.elements.get('#department-view-functions').listeners.click();assert.equal(h.run('departmentFunctionsLive.tab'),'functions');assert.equal(readPolicy(h),before);
 let prevented=false;h.elements.get('#department-view-functions').listeners.keydown({key:'ArrowRight',preventDefault(){prevented=true}});
 assert(prevented);assert.equal(h.run('departmentFunctionsLive.tab'),'leadership');assert.equal(readPolicy(h),before);
});

test('control labels exclude selector options and the before/after function budget is explicit',()=>{const h=fresh(),html=h.elements.get('#departmentFunctionsMount').innerHTML;
 for(const id of ['df-function','df-priority','df-vendor','df-staff-service','df-staff-business']){
  const label=html.match(new RegExp('<label id="'+id+'-label" for="'+id+'">([^<]+)</label>'));
  assert(label,'Explicit text-only label for '+id);assert(html.includes('id="'+id+'" aria-labelledby="'+id+'-label"'));
 }
 assert.match(html,/>Inspect or edit one function<\/label><select/);assert(!html.includes('available after current shared commitments'));
 h.run(`const priced=JSON.parse(JSON.stringify(draft.departmentFunctionsPolicy));priced.vendors.people=1;
 const costQuote=E.departmentFunctionsQuote(currentView(),currentView().me,{...draft,departmentFunctionsPolicy:priced});
 departmentFunctionsLive.controller.preview(priced,departmentFunctionsLive.controller.token());renderDepartments(currentView());`);
 const preview=h.elements.get('#departmentFunctionsMount').innerHTML;
 assert(preview.includes(h.run("'Function-order budget BEFORE these orders: $'+Math.round(costQuote.context.freeCash).toLocaleString('en-US')")));
 assert(preview.includes(h.run("'Remaining AFTER quoted function vendors: $'+Math.round(costQuote.context.freeCash-costQuote.vendorExpense).toLocaleString('en-US')")));
 assert.equal(h.run('draft.departmentFunctionsPolicy.vendors.people'),0);
});
test('owner-private canonical preview and adoption update only draft, cost and Ready',()=>{const h=fresh(),before=gameBytes(h),old=readPolicy(h);
 h.run(`const unchangedDraft=JSON.stringify(draft);const selectedPolicy=JSON.parse(JSON.stringify(draft.departmentFunctionsPolicy));
 selectedPolicy.vendors.people=1;const instruction=E.departmentFunctionsQuote(currentView(),currentView().me,{...draft,departmentFunctionsPolicy:selectedPolicy});
 if(!instruction.eligible)throw Error(instruction.reason);const ui=departmentFunctionsLive.controller;
 const previewAccepted=ui.preview(selectedPolicy,ui.token());renderDepartments(currentView());`);
 assert(h.run('previewAccepted'));assert.equal(readPolicy(h),old);assert.equal(gameBytes(h),before);assert.match(h.elements.get('#departmentFunctionsMount').innerHTML,/Preview only/);
 assert(h.run('departmentFunctionsLive.controller.adopt(departmentFunctionsLive.controller.token())'),h.run('JSON.stringify(uiErrors)'));
 assert.equal(h.run('draft.departmentFunctionsPolicy.vendors.people'),1);assert.equal(gameBytes(h),before);
 assert(h.run(`(()=>{const before=JSON.parse(unchangedDraft),after={...draft};delete before.departmentFunctionsPolicy;delete after.departmentFunctionsPolicy;return JSON.stringify(before)===JSON.stringify(after)})()`));
 assert.equal(h.run('E.departmentFunctionsQuote(currentView(),currentView().me,draft).vendorExpense'),h.run('E.DepartmentFunctions.FUNCTIONS.people.vendorRate'));
 assert.equal(h.elements.get('#readyBtn').disabled,false);assert.equal(h.run('currentView().rival.departmentFunctions'),undefined);
});

test('fractional retained work remains honest in shared-time and exact task previews',()=>{const h=fresh();h.run(`draft.householdPolicy.retention=25;draft.relationshipOfferPolicy.share=25;draft.onboardingPolicy.share=25;
 const fractional=E.departmentFunctionsQuote(currentView(),currentView().me,draft);if(!fractional.eligible)throw Error(fractional.reason);renderDepartments(currentView());`);
 const html=h.elements.get('#departmentFunctionsMount').innerHTML;
 assert.match(html,/exact retained fractions still serve their original tasks/);assert.match(html,/Exact task projection/);assert(!html.includes('uncredited fractional-time hold'));
 assert(h.run(`E.DepartmentFunctions.ROLES.every(role=>{const a=fractional.attribution,retained=E.DepartmentFunctions.IDS.reduce((n,id)=>n+a.exactRetainedQuarters[id][role],0);
 return Math.abs(a.assignedQuarters[role]-a.paidTeacherQuarters[role]-retained-fractional.allocatedPools[role]-a.residualRoundingHold[role]-fractional.remainingPools[role])<1e-8})`));
});
test('shared Ready and spending summary reject infeasible physical/vendor instructions',()=>{const h=fresh();h.run(`draft.departmentFunctionsPolicy.quotas.people.operations=400;renderReady(currentView());`);
 assert.equal(h.elements.get('#readyBtn').disabled,true);assert.match(h.elements.get('#submitMsg').textContent,/staff|quarter|capacity|overcommit/i);
 h.run(`draft.departmentFunctionsPolicy=E.defaultDepartmentFunctionsPolicy(currentView().me);draft.departmentFunctionsPolicy.vendors.people=1;renderReady(currentView());`);
 assert(h.elements.get('#planBudget').innerHTML.includes(h.run("'Department vendor work '+money(E.DepartmentFunctions.FUNCTIONS.people.vendorRate)")));
 h.run(`draft.departmentPolicy.reserve=10000000;renderReady(currentView());`);
 assert.equal(h.elements.get('#readyBtn').disabled,true);assert.match(h.elements.get('#submitMsg').textContent,/cash|budget|reserve|vendor|fund/i);
});

test('successful adoption finishes controller reset before rebinding the live desk',()=>{const h=fresh(),cancel=h.elements.get('#df-cancel');
 // Real innerHTML replacement leaves only the new button listener. Capture that
 // latest listener here rather than the shared harness's accumulated old nodes.
 cancel.addEventListener=function(event,listener){this.listeners[event]=listener;};
 h.run(`const next=JSON.parse(JSON.stringify(draft.departmentFunctionsPolicy));next.vendors.people=1;
 departmentFunctionsLive.controller.preview(next,departmentFunctionsLive.controller.token());renderDepartments(currentView());
 if(!departmentFunctionsLive.controller.adopt(departmentFunctionsLive.controller.token()))throw Error(uiErrors.join(';'));uiErrors=[];`);
 cancel.listeners.click();assert.equal(h.run('uiErrors.length'),0);assert.match(h.elements.get('#departmentFunctionsMount').innerHTML,/Preview discarded/);
 assert.equal(h.run('draft.departmentFunctionsPolicy.vendors.people'),1);
});

test('changing role allocation blocks an obsolete quota and permits explicit repair',()=>{const h=fresh();h.run(`draft.departmentFunctionsPolicy.quotas.people.operations=1;
 if(!E.departmentFunctionsQuote(currentView(),currentView().me,draft).eligible)throw Error('Expected funded starting quota');
 draft.allocation.service+=draft.allocation.operations;draft.allocation.operations=0;renderReady(currentView());`);
 assert.equal(h.elements.get('#readyBtn').disabled,true);assert.match(h.elements.get('#submitMsg').textContent,/operations|staff|capacity/i);
 h.run(`const repair=JSON.parse(JSON.stringify(draft.departmentFunctionsPolicy));repair.quotas.people.operations=0;
 if(!departmentFunctionsLive.controller.preview(repair,departmentFunctionsLive.controller.token()))throw Error(uiErrors.join(';'));
 renderDepartments(currentView());if(!departmentFunctionsLive.controller.adopt(departmentFunctionsLive.controller.token()))throw Error(uiErrors.join(';'));`);
 assert.equal(h.run('draft.departmentFunctionsPolicy.quotas.people.operations'),0);
 // Repairing one subsystem must not erase the player's other staffing orders
 // or declare the whole plan ready while the retained office remains unstaffed.
 assert.equal(h.elements.get('#readyBtn').disabled,true);assert.match(h.elements.get('#submitMsg').textContent,/Facility staffing/);
 h.run('draft.allocation.service--;draft.allocation.operations=1;renderReady(currentView());');assert.equal(h.elements.get('#readyBtn').disabled,false);
});

test('selected public pursuit shows engine-owned unused capacity without changing orders or promising awards',()=>{const h=fresh(),world=gameBytes(h);h.run(`draft.opportunity=currentView().opportunities[0].id;
 const blockedPursuit=E.departmentFunctionsQuote(currentView(),currentView().me,draft).opportunity;renderDepartments(currentView());`);
 const before=readPolicy(h),selected=h.run('draft.opportunity'),blocked=h.elements.get('#departmentFunctionsMount').innerHTML;
 assert(h.run('!!blockedPursuit&&!blockedPursuit.eligible'));assert.match(blocked,/Pursuit paused/);assert.match(blocked,/Only work left after ordinary tasks/);assert.match(blocked,/capacity never guarantees a win/);
 assert(blocked.includes(h.run('E.DepartmentFunctions.FUNCTIONS[blockedPursuit.function].name')));assert.equal(gameBytes(h),world);
 h.run(`const fundedPursuitPolicy=JSON.parse(JSON.stringify(draft.departmentFunctionsPolicy));fundedPursuitPolicy.vendors[blockedPursuit.function]=16;
 const forecastPursuit=E.departmentFunctionsQuote(currentView(),currentView().me,{...draft,departmentFunctionsPolicy:fundedPursuitPolicy}).opportunity;
 if(!forecastPursuit?.eligible)throw Error('Expected sufficient purchased preview work');
 if(!departmentFunctionsLive.controller.preview(fundedPursuitPolicy,departmentFunctionsLive.controller.token()))throw Error(uiErrors.join(';'));renderDepartments(currentView());`);
 assert.match(h.elements.get('#departmentFunctionsMount').innerHTML,/Capacity available \(forecast\)/);assert.match(h.elements.get('#departmentFunctionsMount').innerHTML,/must be paid at settlement/);
 assert.equal(readPolicy(h),before);assert.equal(h.run('draft.opportunity'),selected);assert.equal(gameBytes(h),world);
 h.run('departmentFunctionsLive.controller.cancel(departmentFunctionsLive.controller.token());renderDepartments(currentView());');assert.match(h.elements.get('#departmentFunctionsMount').innerHTML,/Pursuit paused/);
 h.run('draft.opportunity=null;renderDepartments(currentView());');assert(!h.elements.get('#departmentFunctionsMount').innerHTML.includes('id="df-opportunity"'));
});

test('bounded proposal uses real owner context, requires review, and cancellation preserves exact draft',()=>{const h=fresh(),before=readPolicy(h),world=gameBytes(h);
 assert.equal(h.run('departmentFunctionsLive.controller.adopt(departmentFunctionsLive.controller.token())'),false);
 h.run(`const mandate=E.defaultDepartmentFunctionsMandate(currentView().me);mandate.maxAdditionalQuarters=4;mandate.maxVendorExpense=10000;
 const prepared=departmentFunctionsLive.controller.prepare(mandate,departmentFunctionsLive.controller.token());renderDepartments(currentView());`);
 assert(h.run('prepared'));assert.match(h.elements.get('#departmentFunctionsMount').innerHTML,/Review proposed changes/);assert.equal(readPolicy(h),before);
 assert(h.run('departmentFunctionsLive.controller.cancel(departmentFunctionsLive.controller.token())'));h.run('renderDepartments(currentView())');assert.equal(readPolicy(h),before);assert.equal(gameBytes(h),world);
});
test('same-byte clear removes invalid unaffordable preview instead of leaving stale orders',()=>{const h=fresh(),before=readPolicy(h);h.run(`const badPolicy=JSON.parse(JSON.stringify(draft.departmentFunctionsPolicy));badPolicy.vendors.people=16;
 draft.departmentPolicy.reserve=10000000;renderDepartments(currentView());const previewed=departmentFunctionsLive.controller.preview(badPolicy,departmentFunctionsLive.controller.token());renderDepartments(currentView());`);
 assert(h.run('previewed'));assert.equal(h.run('departmentFunctionsLive.controller.adopt(departmentFunctionsLive.controller.token())'),false);
 assert(h.run('departmentFunctionsLive.controller.cancel(departmentFunctionsLive.controller.token())'));h.run('renderDepartments(currentView())');assert.equal(readPolicy(h),before);
 assert(!h.elements.get('#departmentFunctionsMount').innerHTML.includes('value="16"'));
});
test('stale drafts, public pursuit terms, reconnect generations, replaced game and owner changes cannot adopt',()=>{for(const mutation of ["draft.servicePolicy.staff=1",'game.opportunities[0].value+=10000','featureConnectionGeneration++','game=JSON.parse(JSON.stringify(game))','seat=1']){
 const h=fresh();h.run(`const policy=JSON.parse(JSON.stringify(draft.departmentFunctionsPolicy));departmentFunctionsLive.controller.preview(policy,departmentFunctionsLive.controller.token());renderDepartments(currentView());const staleController=departmentFunctionsLive.controller,staleToken=staleController.token();`);
 const before=readPolicy(h);h.run(mutation);assert.equal(h.run('staleController.adopt(staleToken)'),false);assert.equal(readPolicy(h),before);
}});
test('submitted, ended and paused repository states are inspection-only',()=>{for(const state of ["game.players[0].submitted={}","game.gameOver={reason:'fixture'}","gh.active=true;gh.paused=true"]){const h=fresh();h.run(state+';renderDepartments(currentView());');
 assert.match(h.elements.get('#departmentFunctionsMount').innerHTML,/Instructions are locked/);assert.equal(h.run('departmentFunctionsLive.controller.adopt(departmentFunctionsLive.controller.token())'),false);
 assert(h.run("departmentFunctionsLive.controller.select('risk',departmentFunctionsLive.controller.token())"));
}});
test('owner switch resets proposal/mandate and never renders rival books',()=>{const h=fresh();h.run(`const oldOwner=currentView().me.id;departmentFunctionsLive.mandate=E.defaultDepartmentFunctionsMandate(currentView().me);departmentFunctionsLive.mandate.maxVendorExpense=77777;
 seat=1;newDraft(currentView());renderDepartments(currentView());`);
 assert.equal(h.run('departmentFunctionsLive.owner'),h.run('currentView().me.id'));assert.equal(h.run('departmentFunctionsLive.mandate'),null);assert.equal(h.run('currentView().rival.departmentFunctions'),undefined);
 assert(!h.elements.get('#departmentFunctionsMount').innerHTML.includes('77777'));
});
test('Group4/5 retain their original department UI and need no function renderer',()=>{for(const version of [4,5]){const h=fresh(version),markup=h.elements.get('#departmentPanel').innerHTML;
 assert.equal(h.run('draft.departmentFunctionsPolicy'),undefined);assert.match(markup,/DEPARTMENTS &amp; LEADERSHIP/);assert(!markup.includes('Functions & workload'));
 h.run('renderDepartmentFunctionsWorkspace=undefined;renderDepartments(currentView());');assert.equal(h.elements.get('#departmentPanel').innerHTML,markup);
}});

test('collapsed completed-month evidence shows actual paid vendors, delivery and pipeline results privately',()=>{for(const pursue of [false,true]){const h=fresh();h.run(`
 game.event=JSON.parse(JSON.stringify(E.EVENTS.find(event=>event.key==='quiet')));draft.decision='b';draft.departmentFunctionsPolicy.vendors.people=1;
 if(${pursue}){draft.opportunity=currentView().opportunities[0].id;const pursuit=E.departmentFunctionsQuote(currentView(),currentView().me,draft).opportunity;draft.departmentFunctionsPolicy.vendors[pursuit.function]=16;}
 const first=JSON.parse(JSON.stringify(draft));seat=1;newDraft(currentView());draft.decision='b';const second=JSON.parse(JSON.stringify(draft));seat=0;
 E.submit(game,0,first);E.submit(game,1,second);E.migrateCampaign(JSON.parse(JSON.stringify(game)));newDraft(currentView());
 const settledWorld=JSON.stringify(game),settledDraft=JSON.stringify(draft);renderDepartments(currentView());`);
 const html=h.elements.get('#departmentFunctionsMount').innerHTML;
 assert.match(html,/<details id="df-completed"><summary>Last completed month · 1/);assert(!html.includes('id="df-completed" open'));
 assert.match(html,/max-height:240px/);assert.match(html,/Requested<\/th><th>Delivered<\/th><th>Shortfall/);
 assert(html.includes(h.run("'Vendor cash paid: $'+currentView().me.departmentFunctionDelivery.report.vendors.paidExpense.toLocaleString('en-US')")));
 assert.match(html,/New loan origination/);assert.equal(h.run('JSON.stringify(game)'),h.run('settledWorld'));assert.equal(h.run('JSON.stringify(draft)'),h.run('settledDraft'));
 assert.equal(h.run('currentView().rival.departmentFunctions'),undefined);assert.equal(h.run('currentView().rival.departmentFunctionDelivery'),undefined);
 if(!pursue)assert.match(html,/Zero credit coverage pauses ordinary new loan origination/);
 else{assert.match(html,/Pipeline pursuit/);assert(html.includes(h.run('currentView().me.departmentFunctionDelivery.opportunity.result')));}
}});

test('a real succession staff loss preserves persistent orders and reports manager exception on next draft',()=>{const h=fresh();h.run(`
 // Author the existing succession event as a deterministic adverse fixture;
 // the actual paid/settlement/consequence path, not a staff edit, loses a banker.
 game.event=JSON.parse(JSON.stringify(E.EVENTS.find(event=>event.key==='succession')));
 draft.decision='a';draft.householdPolicy.retention=25;draft.departmentFunctionsPolicy.quotas.relationships.service=7;
 Object.values(draft.facilityLifecyclePolicy.offices).forEach(office=>office.staffQuarters.service=2);
 draft.management.delivery.mode='profit';draft.management.research.enabled=true;const expectedFunctions=JSON.stringify(draft.departmentFunctionsPolicy),expectedOffices=JSON.stringify(draft.facilityLifecyclePolicy.offices);
 const originalStaff=game.players[0].stats.staff,firstPlan=JSON.parse(JSON.stringify(draft));
 seat=1;newDraft(currentView());draft.decision='a';const secondPlan=JSON.parse(JSON.stringify(draft));seat=0;
 E.submit(game,0,firstPlan);E.submit(game,1,secondPlan);
 if(game.players[0].stats.staff!==originalStaff-1)throw Error('Expected actual succession loss');
 E.migrateCampaign(JSON.parse(JSON.stringify(game)));newDraft(currentView());renderDepartments(currentView());`);
 assert.equal(h.run('game.cycle'),2);assert.equal(readPolicy(h),h.run('expectedFunctions'));assert.equal(h.run('JSON.stringify(draft.facilityLifecyclePolicy.offices)'),h.run('expectedOffices'));
 assert.match(h.run('managementNotes.join(" ")'),/paused|exception|staff|quota/i);
 h.run("document.querySelector('#prepareManagement').addEventListener=function(event,listener){this.listeners[event]=listener;};renderManagement(currentView());");const before=gameBytes(h);h.elements.get('#prepareManagement').listeners.click();
 assert.equal(readPolicy(h),h.run('expectedFunctions'));assert.equal(h.run('JSON.stringify(draft.facilityLifecyclePolicy.offices)'),h.run('expectedOffices'));assert.equal(gameBytes(h),before);
 assert.match(h.run('managementNotes.join(" ")'),/paused|exception|staff|quota/i);
 h.run(`draft.departmentFunctionsPolicy.quotas.relationships.service=4;const repaired=JSON.stringify(draft.departmentFunctionsPolicy);renderManagement(currentView());`);
 h.elements.get('#prepareManagement').listeners.click();assert.equal(readPolicy(h),h.run('repaired'));assert.equal(h.run('JSON.stringify(draft.facilityLifecyclePolicy.offices)'),h.run('expectedOffices'));assert.equal(gameBytes(h),before);
 assert(h.run('E.departmentFunctionsQuote(currentView(),currentView().me,draft).eligible'));
});
console.log(JSON.stringify({suite:'department-functions-live-ui',checks,scope:'Actual Group6 creation/API/default draft/Workforce hooks, canonical quote/adoption, compact desks, Ready refresh, owner/session locks and Group4/5 preservation. Browser and full transport acceptance separate.'}));
