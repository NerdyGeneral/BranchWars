'use strict';
// Production assembled client/engine, not the frozen experimental UI fixture.
// DOM binding tests do not replace the real-browser acceptance gate.
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js');
let checks=0;
function test(name,fn){try{fn();checks++;}catch(error){throw Error(name+': '+error.message.slice(0,250)+'\n'+error.stack.split('\n').filter(line=>line.includes('usability_forms.test.js:')).slice(0,2).join('\n'));}}
function fresh(version=7){
 const h=harness();h.run(`const opts=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options;
 game=E.createGame({...opts,mode:'hotseat',seed:'usability-forms',created:1});seat=0;gh.active=false;p2pRole='';workspaceTab='workforce';newDraft(currentView());
 uiErrors=[];toast=message=>uiErrors.push(message);renderDepartments(currentView());`);return h;
}
function leadership(h){if(h.run('!!currentView().me.departmentFunctions'))h.elements.get('#department-view-leadership').listeners.click();else h.run('renderDepartments(currentView())');}
function fillLeadership(h){h.run(`const seedForm=()=>{const p=draft.departmentPolicy,m=p.mandate;
 $('#department-reserve').value=String(p.reserve);
 for(const key of ['vendors','research','leadership'])$('#department-'+key).value=String(p.envelopes[key]);
 for(const key of ['staffLimit','vendorLimit','salesFloor','trainingTarget'])$('#department-'+key).value=String(m[key]);
 $('#department-mode').value=m.mode;$('#department-training').value=m.training?'on':'off';
 for(const role of Object.keys(E.SPECIALIST_ROLES)){$('#department-training-'+role).value=String(p.envelopes.training[role]);$('#departmentLeader-'+role).value=draft.leaderOrders[role]===null?'retain':draft.leaderOrders[role];}};seedForm();`);}
const snapshot=h=>h.run('JSON.stringify({game,draft})');

test('leadership raw form survives actual desk navigation in Group6/7 without staging',()=>{
 for(const version of [6,7]){
  const h=fresh(version);leadership(h);fillLeadership(h);const before=snapshot(h);
  h.elements.get('#departmentLeader-service').value='mentor';h.elements.get('#departmentLeader-service').listeners.change();
  h.elements.get('#department-reserve').value='';h.elements.get('#department-reserve').listeners.input();
  h.elements.get('#department-view-functions').listeners.click();
  // Simulate detached DOM nodes losing their values; restoration must be explicit.
  h.elements.get('#departmentLeader-service').value='retain';h.elements.get('#department-reserve').value='500000';
  h.elements.get('#department-view-leadership').listeners.click();
  assert.equal(h.elements.get('#departmentLeader-service').value,'mentor');assert.equal(h.elements.get('#department-reserve').value,'');
  assert.match(h.elements.get('#departmentInstructionStatus').textContent,/Unstaged edits restored/);
  assert.equal(snapshot(h),before);
 }
});
test('legacy leadership redraw and explicit discard leave staged plans unchanged',()=>{
 for(const version of [4,5]){const h=fresh(version);leadership(h);fillLeadership(h);const before=snapshot(h);
  h.elements.get('#department-reserve').value='600000';h.elements.get('#department-reserve').listeners.input();
  h.elements.get('#department-reserve').value='500000';h.run('renderDepartments(currentView())');
  assert.equal(h.elements.get('#department-reserve').value,'600000');
  h.elements.get('#discardDepartmentForm').listeners.click();assert.equal(h.run('departmentUiState.form'),null);assert.equal(snapshot(h),before);
 }
});
test('leadership preview is pure and staging clears pending form only after acceptance',()=>{
 const h=fresh();leadership(h);fillLeadership(h);const game=h.run('JSON.stringify(game)');
 h.elements.get('#department-reserve').value='600000';h.elements.get('#department-reserve').listeners.input();
 h.elements.get('#previewDepartments').listeners.click();assert.equal(h.run('draft.departmentPolicy.reserve'),500000);
 assert.match(h.elements.get('#departmentInstructionStatus').textContent,/Preview only/);
 h.elements.get('#stageDepartments').listeners.click();assert.equal(h.run('draft.departmentPolicy.reserve'),600000);
 assert.equal(h.run('departmentUiState.form'),null);assert.equal(h.run('JSON.stringify(game)'),game);
});
test('leadership cache respects owner/month/campaign/sealed/related-policy boundaries',()=>{
 for(const alter of ['seat=1;newDraft(currentView());','game.cycle++;newDraft(currentView());','game=JSON.parse(JSON.stringify(game));',
  'game.players[0].submitted={};','draft.departmentPolicy.reserve=700000;']){
  const h=fresh();leadership(h);fillLeadership(h);h.elements.get('#department-reserve').value='600000';h.elements.get('#department-reserve').listeners.input();
  const late=h.elements.get('#stageDepartments').listeners.click;h.run(alter+'renderDepartments(currentView());');
  const before=snapshot(h);late();assert.equal(snapshot(h),before);assert.equal(h.run('departmentUiState.form'),null);
 }
});
test('function raw inputs survive redraw and invalid values cannot be adopted',()=>{
 const h=fresh(),before=snapshot(h);
 h.elements.get('#df-staff-service').value='';h.elements.get('#df-staff-service').listeners.input();
 h.elements.get('#df-vendor').value='1.5';h.elements.get('#df-vendor').listeners.input();h.run('renderDepartments(currentView());');
 const html=h.elements.get('#departmentFunctionsMount').innerHTML;
 assert.match(html,/id="df-staff-service"[^>]*value=""/);assert.match(html,/id="df-vendor"[^>]*value="1.5"/);
 assert.match(html,/id="df-adopt" disabled/);assert.equal(h.run('departmentFunctionsLive.controller.adopt(departmentFunctionsLive.controller.token())'),false);
 assert.equal(snapshot(h),before);h.run('departmentFunctionsLive.controller.cancel(departmentFunctionsLive.controller.token());renderDepartments(currentView());');
 assert.match(h.elements.get('#departmentFunctionsMount').innerHTML,/id="df-vendor"[^>]*value="0"/);
});
test('unrelated plan edits preserve raw function values but force a fresh review',()=>{
 const h=fresh();h.elements.get('#df-vendor').value='2';h.elements.get('#df-vendor').listeners.input();
 h.run('draft.hires=1;renderDepartments(currentView());');
 assert.match(h.elements.get('#departmentFunctionsMount').innerHTML,/id="df-vendor"[^>]*value="2"/);
 assert.match(h.elements.get('#departmentFunctionsMount').innerHTML,/preview again/);
 assert.equal(h.run('departmentFunctionsLive.controller.adopt(departmentFunctionsLive.controller.token())'),false);
});
test('function drafts clear across owner/month/session/lock/related-policy boundaries',()=>{
 for(const alter of ['seat=1;newDraft(currentView());','game.cycle++;newDraft(currentView());','game=JSON.parse(JSON.stringify(game));',
  'game.players[0].submitted={};','draft.departmentFunctionsPolicy.vendors.relationships=1;']){
  const h=fresh();h.elements.get('#df-vendor').value='2';h.elements.get('#df-vendor').listeners.input();
  h.run(alter+'renderDepartments(currentView());');assert.doesNotMatch(h.elements.get('#departmentFunctionsMount').innerHTML,/id="df-vendor"[^>]*value="2"/);
 }
});
console.log(JSON.stringify({suite:'usability-forms',checks,scope:'Assembled production UI; unstaged raw edits, explicit staging/discard, legacy desks and owner/month/session isolation. Browser and durable recovery remain separate.'}));
