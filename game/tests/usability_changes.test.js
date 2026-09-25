'use strict';
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js');
let checks=0;
function test(name,fn){try{fn();checks++;}catch(error){throw Error(name+': '+error.stack);}}
function fresh(version=0){const h=harness();h.run(`const settings=${version?`E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options`:'{}'};
game=E.createGame({...settings,mode:'hotseat',seed:'changes-review',created:1});seat=0;p2pRole='';gh.active=false;newDraft(currentView());`);return h;}
const bytes=h=>h.run('JSON.stringify({game,draft})');
function proposal(h,path){const index=h.run(`monthlyChangeRows(currentView()).findIndex(row=>JSON.stringify(row.path)===${JSON.stringify(JSON.stringify(path))})`);assert(index>=0,'Change exists: '+path);h.run(`proposeMonthlyUndo(currentView(),${index});`);}
test('all supported foundations begin with no edits; rendering is pure and owner-only',()=>{
 for(const version of [0,4,5,6,7]){const h=fresh(version),before=bytes(h);h.run('renderMonthlyChanges(currentView());');assert.equal(h.run('monthlyChangeRows(currentView()).length'),0);assert.equal(bytes(h),before);assert.match(h.elements.get('#monthlyChanges').innerHTML,/No edits relative/);assert.equal(h.run('JSON.stringify(E.publicState(game,1)).includes("monthlyChangesState")'),false);}
});
test('one research allocation can be undone without deleting unrelated research or decision',()=>{
 const h=fresh();h.run("draft.investments.network=50000;draft.investments.digital=50000;draft.decision='b';");const world=h.run('JSON.stringify(game)');proposal(h,['investments','network']);
 assert.equal(h.run('draft.investments.network'),50000,'Proposal does not mutate');assert(h.run('applyMonthlyUndo(currentView())'));
 assert.equal(h.run('draft.investments.network'),undefined);assert.equal(h.run('draft.investments.digital'),50000);assert.equal(h.run('draft.decision'),'b');assert.equal(h.run('JSON.stringify(game)'),world);
});
test('undo exposes newly uncovered allocation instead of reallocating other employees',()=>{
 const h=fresh();h.run('draft.allocation.service--;draft.allocation.business++;');proposal(h,['allocation','business']);
 assert(h.run('monthlyChangesState.proposal.conflicts.some(x=>x.id==="allocation")'));
 const service=h.run('draft.allocation.service');h.run('renderMonthlyChanges(currentView());');assert.match(h.elements.get('#monthlyChanges').innerHTML,/Other orders will not be removed/);
 assert(h.run('applyMonthlyUndo(currentView())'));assert.equal(h.run('draft.allocation.service'),service);assert(h.run('monthlyPlanReview(currentView()).blockers.some(x=>x.id==="allocation")'));
});
test('initiative undo updates the compatibility alias with no duplicate drawer entry',()=>{
 const h=fresh();h.run("draft.newProjects=['branch'];draft.newProject='branch';");assert.equal(h.run('monthlyChangeRows(currentView()).length'),1);proposal(h,['newProjects','branch']);
 assert(h.run('applyMonthlyUndo(currentView())'));assert.equal(h.run('draft.newProject'),null);assert.equal(h.run('draft.newProjects.length'),0);
});
test('undo removes only the selected initiative and preserves remaining order',()=>{
 const h=fresh();h.run("draft.newProjects=['branch','advertising'];draft.newProject='branch';");proposal(h,['newProjects','branch']);assert(h.run('applyMonthlyUndo(currentView())'));
 assert.equal(h.run('JSON.stringify(draft.newProjects)'),JSON.stringify(['advertising']));assert.equal(h.run('draft.newProject'),'advertising');
});
test('stale proposals refuse draft, month, owner, campaign, generation, sealed and terminal transitions',()=>{
 for(const change of ["draft.decision='a'",'game.cycle++','seat=1','game=E.createGame({mode:"hotseat",seed:"replacement",created:1})','resetMonthlyChanges(currentView())','game.players[0].submitted=JSON.parse(JSON.stringify(draft))','game.gameOver={reason:"test"}']){
  const h=fresh();h.run("draft.hires=1;savedView=currentView();");proposal(h,['hires']);h.run(change);const before=bytes(h);
  assert.equal(h.run('applyMonthlyUndo(savedView)'),false,change);assert.equal(bytes(h),before,change);
 }
});
test('confirmation cancellation and old delegated event handlers never change orders',()=>{
 const h=fresh();h.run('draft.hires=1;renderMonthlyChanges(currentView());');proposal(h,['hires']);h.run('renderMonthlyChanges(currentView());');
 const mount=h.elements.get('#monthlyChanges');mount.contains=()=>true;
 const button={hasAttribute:name=>name==='data-monthly-cancel'};const before=bytes(h);
 mount.onclick({target:{closest:()=>button}});assert.equal(bytes(h),before);assert.equal(h.run('monthlyChangesState.proposal'),null);assert.match(mount.innerHTML,/Undo cancelled/);
 proposal(h,['hires']);h.run('renderMonthlyChanges(currentView());');const oldClick=mount.onclick;h.run("draft.decision='b';");const updated=bytes(h);
 oldClick({target:{closest:()=>({hasAttribute:name=>name==='data-monthly-confirm'})}});assert.equal(bytes(h),updated);
});
test('current delegated confirmation applies once and locks disable controls',()=>{
 const h=fresh();h.run('draft.hires=1;');proposal(h,['hires']);h.run('renderMonthlyChanges(currentView());');const mount=h.elements.get('#monthlyChanges');mount.contains=()=>true;
 const click=mount.onclick,event={target:{closest:()=>({hasAttribute:name=>name==='data-monthly-confirm'})}};click(event);assert.equal(h.run('draft.hires'),0);const before=bytes(h);click(event);assert.equal(bytes(h),before);
 h.run('draft.hires=1;game.players[0].submitted=JSON.parse(JSON.stringify(draft));renderMonthlyChanges(currentView());');assert.match(mount.innerHTML,/data-monthly-undo="0" disabled/);assert.equal(h.run('proposeMonthlyUndo(currentView(),0)'),null);
});
test('nested policies are independently reversible and disabled systems are not synthesized',()=>{
 const h=fresh(7);h.run('draft.departmentFunctionsPolicy.quotas.people.operations++;draft.hires=1;');proposal(h,['departmentFunctionsPolicy','quotas','people','operations']);
 assert(h.run('applyMonthlyUndo(currentView())'));assert.equal(h.run('monthlyChangeRows(currentView()).length'),1);assert.equal(h.run('draft.hires'),1);
 const legacy=fresh();legacy.run('draft.hires=1;');proposal(legacy,['hires']);legacy.run('applyMonthlyUndo(currentView());');assert.equal(legacy.run('Object.hasOwn(draft,"departmentFunctionsPolicy")'),false);
});
test('drawer escapes player-facing values and only quotes whole-plan commitments on review',()=>{
 const h=fresh();h.run("draft.opportunity='<img src=x onerror=alert(1)>';renderMonthlyChanges(currentView());");assert(!h.elements.get('#monthlyChanges').innerHTML.includes('<img'));assert.match(h.elements.get('#monthlyChanges').innerHTML,/&lt;img/);
 proposal(h,['opportunity']);h.run('renderMonthlyChanges(currentView());');assert.match(h.elements.get('#monthlyChanges').innerHTML,/not a per-order price/);
});
console.log(JSON.stringify({suite:'usability-changes',checks,scope:'Production opening-draft diff, per-field undo, dependent conflicts, cancellation, stale/locked/session boundaries, rendering purity and supported optional foundations. Browser acceptance remains separate.'}));
