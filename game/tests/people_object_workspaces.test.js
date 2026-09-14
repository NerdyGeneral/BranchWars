'use strict';
// Real engine/client; inspection and employee-month presentation are UI only.
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js');let checks=0;
function test(name,fn){try{fn();checks++;}catch(error){throw Error(name+': '+error.stack);}}
function fresh(version=9){const h=harness();h.run(`const original=document.querySelector;document.querySelector=selector=>{const el=original(selector);el.querySelector=s=>document.querySelector(s);el.addEventListener=function(event,fn){this.listeners[event]=fn};el.remove=()=>{el.innerHTML=''};el.insertAdjacentHTML=(position,html)=>{el.innerHTML+=html};return el};
 const opts=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options;game=E.createGame({...opts,mode:'hotseat',seed:'people-object-workspaces',created:1});seat=0;p2pRole='';gh.active=false;workspaceTab='workforce';newDraft(currentView());draft.decision='b';uiErrors=[];toast=text=>uiErrors.push(text);setPeopleDesk('coverage');`);return h;}
const bytes=h=>h.run('JSON.stringify({game,draft})'),markup=h=>h.elements.get('#departmentFunctionsMount').innerHTML;
function input(h,id,value){const el=h.elements.get('#'+id);el.value=String(value);el.listeners.input();}
function fillFunction(h,staff={},vendor=0){for(const role of h.run('E.DepartmentFunctions.FUNCTIONS.people.roles'))h.elements.get('#df-staff-'+role).value=String(staff[role]??0);h.elements.get('#df-vendor').value=String(vendor);}

test('all eight real functions are inspectable in one editor with no selector dropdown',()=>{
 const h=fresh(),before=bytes(h),ids=h.run('E.DepartmentFunctions.IDS');
 for(const id of ids){h.elements.get('#df-select-'+id).listeners.click();const html=markup(h);assert(html.includes('id="df-select-'+id+'" class="object-row" data-df-function="'+id+'" aria-pressed="true"'));assert(html.includes(h.run('E.DepartmentFunctions.FUNCTIONS["'+id+'"].name')));assert.equal((html.match(/id="df-vendor"/g)||[]).length,1);assert(!html.includes('id="df-function"'));}
 assert.equal(bytes(h),before);assert.match(markup(h),/Bank-wide workload, costs and shared staff/);
});
test('employee-month values convert exactly to canonical quarters and stage once',()=>{
 const h=fresh();h.elements.get('#df-select-people').listeners.click();const before=bytes(h),world=h.run('JSON.stringify(game)');
 fillFunction(h,{operations:0.25});input(h,'df-staff-operations',0.25);h.elements.get('#df-preview').listeners.click();assert.equal(bytes(h),before);assert(markup(h).includes('Preview only'),h.run('JSON.stringify(uiErrors)')+' '+markup(h).match(/id="df-status"[^>]*>([^<]*)/)?.[1]);assert.match(markup(h),/step="0.25"/);
 h.elements.get('#df-adopt').listeners.click();assert.equal(h.run('draft.departmentFunctionsPolicy.quotas.people.operations'),1);assert.equal(h.run('JSON.stringify(game)'),world);assert.equal(h.run('E.departmentFunctionsQuote(currentView(),currentView().me,draft).vendorExpense'),0);
});
test('invalid fractions and blank input cannot stage or disappear on function switch',()=>{
 for(const value of ['0.1','']){const h=fresh();h.elements.get('#df-select-people').listeners.click();fillFunction(h);const before=bytes(h);input(h,'df-staff-operations',value);h.elements.get('#df-select-risk').listeners.click();assert.match(h.run('uiErrors.at(-1)'),/Preview or discard/);h.elements.get('#df-preview').listeners.click();assert.match(h.run('uiErrors.at(-1)'),value? /0.25/ : /blank is not zero/);assert.equal(bytes(h),before);assert.equal(h.elements.get('#df-adopt').disabled,true);h.elements.get('#df-cancel').listeners.click();assert.equal(bytes(h),before);}
});
test('a work-at-risk action opens its engine-owned function without changing the plan',()=>{
 const h=fresh();h.run('setPeopleDesk("overview");selectedTask=peopleOverviewModel(currentView()).tasks.find(row=>row.shortfall>0);');const before=bytes(h),task=h.run('selectedTask');assert(task.department);
 const mount=h.elements.get('#peopleOverview');mount.contains=()=>true;mount.onclick({target:{closest:()=>({dataset:{peopleDesk:'functions',peopleFunction:task.department}})}});
 assert.equal(h.run('peopleWorkspaceState.desk'),'coverage');assert(markup(h).includes('data-df-function="'+task.department+'" aria-pressed="true"'));assert.equal(bytes(h),before);
});
test('stale function buttons cannot redirect another owner or apply detached previews',()=>{
 const h=fresh(),click=h.elements.get('#df-select-people').listeners.click;h.run('seat=1;newDraft(currentView());setPeopleDesk("coverage");');const before=bytes(h),html=markup(h);click();assert.equal(bytes(h),before);assert.equal(markup(h),html);assert.match(h.run('uiErrors.at(-1)'),/bank, month/);
});
test('function selection focuses the live inspector after its host replaces the old mount',()=>{
 const h=fresh();h.run(`const originalRender=renderDepartments;renderDepartments=v=>{originalRender(v);const mount=$('#departmentFunctionsMount'),find=mount.querySelector;mount.querySelector=s=>s==='#df-detail-title'?{id:'detached-heading'}:find(s);};focusWorkspaceTarget=element=>lastFocused=element.id;`);
 h.elements.get('#df-select-credit').listeners.click();assert.equal(h.run('lastFocused'),'df-detail-title');
});
test('leadership shows one department and preserves every raw field across selection',()=>{
 const h=fresh();h.run('setPeopleDesk("leadership");');const before=bytes(h),panel=h.elements.get('#departmentPanel').innerHTML;
 assert.equal((panel.match(/id="department-detail-[^"]+" aria-label="[^"]+" hidden/g)||[]).length,3);
 h.elements.get('#department-training-service').value='';h.elements.get('#department-training-service').listeners.input();h.elements.get('#department-select-business').listeners.click();
 assert.equal(h.elements.get('#department-detail-business').hidden,false);assert.equal(h.elements.get('#department-detail-service').hidden,true);assert.equal(h.elements.get('#department-training-service').value,'');assert.equal(bytes(h),before);
 h.elements.get('#department-select-service').listeners.click();assert.equal(h.elements.get('#department-training-service').value,'');assert.equal(bytes(h),before);
});
test('earlier supported leadership campaigns retain the same canonical fields and records',()=>{
 for(const version of [4,5]){const h=fresh(version);h.run('setPeopleDesk("leadership");');const before=bytes(h),html=h.elements.get('#departmentPanel').innerHTML;
 for(const role of h.run('Object.keys(E.SPECIALIST_ROLES)')){assert.equal((html.match(new RegExp('id="departmentLeader-'+role+'"','g'))||[]).length,1);assert.equal((html.match(new RegExp('id="department-training-'+role+'"','g'))||[]).length,1);h.elements.get('#department-select-'+role).listeners.click();}assert.equal(bytes(h),before);}
});
test('development directory keeps each raw training amount without silently staging',()=>{
 const h=fresh();h.run('setPeopleDesk("development");');const before=bytes(h);h.elements.get('#workforceBudget').value='20000';h.elements.get('#workforceBudget').listeners.input();
 h.elements.get('#workforce-select-business').listeners.click();assert.equal(h.run('selectedWorkforceRole'),'business');assert(!h.elements.get('#workforcePanel').innerHTML.includes('id="workforceDepartment"'));h.elements.get('#workforceBudget').value='40000';h.elements.get('#workforceBudget').listeners.change();
 h.elements.get('#workforce-select-service').listeners.click();assert.equal(h.elements.get('#workforceBudget').value,'20000');assert.equal(bytes(h),before);assert.equal(h.elements.get('#stageWorkforceForm').disabled,true);
});
test('leadership forms and reviewed proposals refuse paused or replaced connections',()=>{
 for(const change of ['featureConnectionGeneration++','linkSession="reconnected"','gh={...gh}','gh.active=true;gh.paused=true']){const h=fresh();h.run('setPeopleDesk("leadership");prepareDepartmentProposal(currentView());');const click=h.elements.get('#stageDepartments').listeners.click;h.run(change);const before=bytes(h);click();assert.equal(bytes(h),before);assert.equal(h.run('stageDepartmentProposal(currentView())'),false);assert.equal(bytes(h),before);}
 const h=fresh();h.run('gh.active=true;gh.paused=true;setPeopleDesk("leadership");');assert.match(h.elements.get('#departmentPanel').innerHTML,/id="stageDepartments" disabled/);assert.match(h.elements.get('#departmentPanel').innerHTML,/id="departmentLeader-service" disabled/);
});
console.log(JSON.stringify({suite:'people-object-workspaces',checks,scope:'All-function inspection, exact employee-month conversion, invalid input and cancellation, causal warning routing, owner guards and raw leadership-form preservation. No engine or save-schema changes.'}));
