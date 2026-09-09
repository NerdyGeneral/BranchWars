'use strict';
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js');
let checks=0;
function test(name,fn){try{fn();checks++;}catch(error){throw Error(name+': '+error.stack.slice(0,2200));}}
function fresh(version=7){const h=harness();h.run(`const query=document.querySelector;document.querySelector=selector=>{const element=query(selector);element.insertAdjacentHTML=(position,html)=>element.innerHTML+=html;element.remove=()=>{element.innerHTML='';};return element;};const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options;game=E.createGame({...options,mode:'hotseat',seed:'people-workflows',created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='workforce';newDraft(currentView());renderWorkforce(currentView());`);return h;}
const bytes=h=>h.run('JSON.stringify({game,draft})');
test('five desks hide unrelated content and preserve the shared draft; earlier rules omit unavailable desks',()=>{
 const h=fresh(),before=bytes(h);for(const desk of ['overview','recruitment','development','coverage','leadership']){h.run(`setPeopleDesk('${desk}');`);assert.equal(h.run('peopleWorkspaceState.desk'),desk);assert.equal(h.elements.get('#peopleOverview').hidden,desk!=='overview');assert.equal(h.elements.get('#peopleRecruitment').hidden,desk!=='recruitment');assert.equal(h.elements.get('#workforcePanel').hidden,desk!=='development');assert.equal(h.elements.get('#departmentPanel').hidden,!['coverage','leadership'].includes(desk));assert.equal(bytes(h),before);}
 const old=fresh(4);assert(!old.run('peopleDesks(currentView()).includes("coverage")'));old.run('setPeopleDesk("coverage")');assert.equal(old.run('peopleWorkspaceState.desk'),'overview');
});
test('keyboard navigation wraps and detached bank controls cannot switch desks',()=>{
 const h=fresh();let prevented=false;h.elements.get('#people-tab-overview').listeners.keydown({key:'End',preventDefault(){prevented=true}});assert(prevented);assert.equal(h.run('peopleWorkspaceState.desk'),'leadership');
 const old=h.elements.get('#people-tab-recruitment').listeners.click;h.run('seat=1;newDraft(currentView());');old();assert.equal(h.run('peopleWorkspaceState.desk'),'overview');
});
test('recruitment compares actual marginal signing cost and shared limits without spending',()=>{
 const h=fresh();h.run('setPeopleDesk("recruitment");');const before=bytes(h),q=h.run('recruitmentOption(currentView(),"operations",1)');assert.equal(q.extraSigning,q.after.recruiting-q.before.recruiting);assert.equal(bytes(h),before);
 h.run('renderProjects=()=>{};renderReady=()=>{};');assert(h.run('stagePeopleHire("generalist",1,workforceEditToken(currentView()))'));assert(h.run('stagePeopleHire("operations",1,workforceEditToken(currentView()))'));assert.equal(h.run('E.planHires(draft)'),2);assert.equal(h.run('currentView().me.stats.staff'),8);
 h.run('draft.hires=5;');const limit=bytes(h);assert.equal(h.run('stagePeopleHire("service",1,workforceEditToken(currentView()))'),false);assert.equal(bytes(h),limit);
 assert(h.run('stagePeopleHire("generalist",-1,workforceEditToken(currentView()))'));assert.equal(h.run('draft.specialistHires.operations'),1);
});
test('recruitment rejects stale, sealed, paused, foreign and reconnected write tokens',()=>{
 for(const change of ['draft.hires=1','game.players[0].submitted=JSON.parse(JSON.stringify(draft))','game.gameOver={reason:"test"}','gh.active=true;gh.paused=true','seat=1','featureConnectionGeneration++','linkSession="replacement"','gh={...gh}','game=E.createGame({mode:"hotseat",seed:"replacement"})']){
  const h=fresh();h.run('oldToken=workforceEditToken(currentView());'+change);const before=bytes(h);assert.equal(h.run('stagePeopleHire("generalist",1,oldToken)'),false,change);assert.equal(bytes(h),before);
 }
});
test('raw training forms survive desk switches without staging; blanks are not zero',()=>{
 const h=fresh(4);h.run('setPeopleDesk("development");');const before=bytes(h);h.elements.get('#workforceReserve').value='';h.elements.get('#workforceReserve').listeners.input();
 h.run('setPeopleDesk("recruitment");setPeopleDesk("development");');assert.equal(h.elements.get('#workforceReserve').value,'');assert.equal(bytes(h),before);
 assert.equal(h.run('previewWorkforceForm(currentView(),workforceEditToken(currentView()))'),false);assert.match(h.run('workforceFormState.notice'),/blank field is not zero/);assert.equal(bytes(h),before);
});
test('training previews explain lower departmental ceilings and stage only after explicit review',()=>{
 const h=fresh(4);h.run('game.players[0].workforce.departments.service.count=2;game.players[0].workforce.departments.service.skill=20;draft.departmentPolicy.envelopes.training.service=5000;setPeopleDesk("development");');
 const world=h.run('JSON.stringify(game)'),before=bytes(h);h.elements.get('#workforceBudget').value='20000';h.elements.get('#workforceBudget').listeners.change();assert.equal(bytes(h),before);
 assert(h.run('previewWorkforceForm(currentView(),workforceEditToken(currentView()))'));h.run('renderWorkforce(currentView());');assert.match(h.elements.get('#workforceFormPreview').innerHTML,/Department ceiling/);assert.equal(h.run('workforceFormState.preview.after.training.total'),4000);assert.equal(h.run('draft.workforcePolicy.training.service'),0);
 assert(h.run('stageWorkforceForm(currentView())'));assert.equal(h.run('draft.workforcePolicy.training.service'),20000);assert.equal(h.run('JSON.stringify(game)'),world);
});
test('unrelated staged changes retain raw entries but invalidate their training quote',()=>{
 const h=fresh(4);h.run('setPeopleDesk("development");');const reserve=h.run('draft.workforcePolicy.reserve');h.elements.get('#workforceReserve').value='750000';h.elements.get('#workforceReserve').listeners.input();h.run('previewWorkforceForm(currentView(),workforceEditToken(currentView()));draft.decision="b";renderWorkforce(currentView());');
 assert.equal(h.elements.get('#workforceReserve').value,'750000');assert.equal(h.run('workforceFormState.preview'),null);assert.equal(h.elements.get('#stageWorkforceForm').disabled,true);assert.equal(h.run('draft.workforcePolicy.reserve'),reserve);
 h.elements.get('#discardWorkforceForm').listeners.click();assert.equal(h.elements.get('#workforceReserve').value,String(reserve));
});
test('training preview cannot be staged after form changes, a new month or a new campaign',()=>{
 for(const change of ['workforceFormState.reserve="999999"','game.cycle++','game.players[0].submitted=JSON.parse(JSON.stringify(draft))']){
  const h=fresh(4);h.run('setPeopleDesk("development");previewWorkforceForm(currentView(),workforceEditToken(currentView()));'+change);const before=bytes(h);assert.equal(h.run('stageWorkforceForm(currentView())'),false);assert.equal(bytes(h),before);
 }
 const h=fresh();h.run('setPeopleDesk("recruitment");game=E.createGame({...options,mode:"hotseat",seed:"second"});newDraft(currentView());');assert.equal(h.run('peopleWorkspaceState.desk'),'overview');assert.equal(h.run('workforceFormState'),null);
});
test('Operations exposes one recruitment destination instead of a second generalist editor',()=>{
 const h=fresh();h.run('renderProjects(currentView());');const html=h.elements.get('#hiringPanel').innerHTML;assert.match(html,/Compare generalist and specialist recruitment/);assert(!html.includes('data-hire='));
 h.elements.get('#openPeopleRecruitment').listeners.click();assert.equal(h.run('peopleWorkspaceState.desk'),'recruitment');
});
test('successful staging is not reported as rejected if a later redraw fails',()=>{
 const h=fresh(4);h.run('renderProjects=()=>{throw Error("test redraw failure")};toast=message=>lastUiNotice=message;');assert(h.run('stagePeopleHire("generalist",1,workforceEditToken(currentView()))'));assert.equal(h.run('draft.hires'),1);assert.match(h.run('lastUiNotice'),/Recruitment was staged/);
 h.run('workforceForm(currentView()).reserve="750000";previewWorkforceForm(currentView(),workforceEditToken(currentView()));');assert(h.run('stageWorkforceForm(currentView())'));assert.equal(h.run('draft.workforcePolicy.reserve'),750000);assert.match(h.run('lastUiNotice'),/Training was staged/);
});
test('standalone workforce uses only three available desks and remains playable',()=>{
 const h=fresh(4);h.run('game=E.createGame({...E.previewFeatureSelection({}, {field:"workforceVersion",value:1}).options,mode:"hotseat",seed:"workforce-only",created:1});seat=0;newDraft(currentView());renderWorkforce(currentView());');assert.equal(h.run('JSON.stringify(peopleDesks(currentView()))'),JSON.stringify(['overview','recruitment','development']));h.run('setPeopleDesk("development");');assert.match(h.elements.get('#workforcePanel').innerHTML,/Preview training changes/);assert.equal(h.run('!!currentView().me.departmentOffice'),false);
});
console.log(JSON.stringify({suite:'usability-people-workflows',checks,scope:'Production five-desk navigation, combined hiring costs/limits, owner and connection guards, retained training forms, explicit preview/stage/discard and actual departmental caps. Final browser/release gates remain separate.'}));
