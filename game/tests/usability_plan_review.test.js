'use strict';
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),{harness}=require('./github_resilience.test.js');
let checks=0;
function test(name,fn){try{fn();checks++;}catch(error){throw Error(name+': '+error.stack.slice(0,1600));}}
function fresh(version=7){const h=harness();h.run(`const query=document.querySelector;document.querySelector=selector=>{const element=query(selector);element.insertAdjacentHTML=(position,html)=>element.innerHTML+=html;element.remove=()=>{element.innerHTML='';};return element;};
 const settings=${version?`E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options`:'{}'};
 game=E.createGame({...settings,mode:'hotseat',seed:'plan-review',created:1});seat=0;p2pRole='';gh.active=false;newDraft(currentView());`);return h;}
const bytes=h=>h.run('JSON.stringify({game,draft})');
test('all independent required decisions appear together without rewriting the plan',()=>{
 const h=fresh();h.run('draft.focus=null;draft.allocation.service--;');const before=bytes(h);
 const ids=h.run('monthlyPlanReview(currentView()).blockers.map(x=>x.id)');for(const id of ['focus','decision','allocation'])assert(ids.includes(id),id);
 assert.equal(bytes(h),before);h.run('renderReady(currentView());');assert.equal(bytes(h),before);
 assert.equal(h.elements.get('#readyBtn').disabled,true);assert.match(h.elements.get('#operatingPreview').innerHTML,/Choose a valid focus market/);
 const html=h.elements.get('#monthlyPlanReview').innerHTML;
 assert.match(html,/Choose a focus market/);assert.match(html,/Answer the executive call/);assert.match(html,/Allocate your employees/);
 assert.match(html,/Optional opportunities · no action required/);
});
test('physical function conflict, spending and unanswered call are all reported',()=>{
 const h=fresh();h.run('draft.departmentFunctionsPolicy.quotas.people.operations=400;draft.hires=6;draft.investments.operations=250000;draft.workforcePolicy.reserve=10000000;');
 const before=bytes(h),ids=h.run('monthlyPlanReview(currentView()).blockers.map(x=>x.id)');
 assert(ids.includes('decision'));assert(ids.includes('functions'));assert(ids.includes('facilities'));assert.equal(bytes(h),before);
});
test('rendering never silently deletes a service bid when staff are reassigned',()=>{
 const h=fresh();h.run("draft.contractBid='explicit-choice';draft.allocation.service+=draft.allocation.business;draft.allocation.business=0;");const before=bytes(h);
 h.run('renderReady(currentView());');assert.equal(bytes(h),before);assert.equal(h.run('draft.contractBid'),'explicit-choice');
 assert.match(h.elements.get('#monthlyPlanReview').innerHTML,/Your bid has been retained/);assert.equal(h.elements.get('#readyBtn').disabled,true);
});
test('quiet plans remain submit-ready for original and supported group versions',()=>{
 for(const version of [0,4,5,6,7]){const h=fresh(version);h.run("draft.decision='b';renderReady(currentView());");
  assert.equal(h.elements.get('#readyBtn').disabled,false,'rules '+version);assert.match(h.elements.get('#monthlyPlanReview').innerHTML,/quiet month is a valid choice/);
  assert.equal(h.run('JSON.stringify(currentView().rival)').includes('departmentFunctionsPolicy'),false);
 }
});
test('sealed and terminal campaigns do not offer submission',()=>{
 for(const alter of ['game.players[0].submitted=JSON.parse(JSON.stringify(draft));','game.gameOver={reason:"test terminal"};']){
  const h=fresh();h.run("draft.decision='b';"+alter+'renderReady(currentView());');assert.equal(h.elements.get('#readyBtn').disabled,true);
 }
});
test('required decisions use contextual targets that exist in the assembled page',()=>{
 const h=fresh(),html=require('../tools/build_game.js').assemble().html;
 h.run('draft.focus=null;draft.allocation.service--;');
 for(const item of h.run('monthlyPlanReview(currentView()).blockers'))assert(html.includes('id="'+item.target.slice(1)+'"'),item.target);
});
test('fresh campaign entry opens Overview and resets scrolling without changing the draft',()=>{
 const h=fresh();h.run("workspaceTab='operations';window.scrollTo=options=>{entryScroll=options};render=()=>{};");
 // The common transport harness stubs enterGame. Load its real definition.
 const fs=require('node:fs'),path=require('node:path'),source=fs.readFileSync(path.join(__dirname,'../src/ui/local-game.js'),'utf8');
 h.run(source.slice(source.indexOf('function enterGame('),source.indexOf('function leaveGame(')));
 const before=bytes(h);h.run('enterGame(true);');assert.equal(h.run('workspaceTab'),'overview');assert.equal(h.run('entryScroll.top'),0);assert.equal(bytes(h),before);
 h.run("workspaceTab='operations';entryScroll=null;enterGame(false);");assert.equal(h.run('workspaceTab'),'operations');assert.equal(h.run('entryScroll'),null);
});
console.log(JSON.stringify({suite:'usability-plan-review',checks,scope:'Production quotes, simultaneous blockers, optional quiet plans, preserved bids, original/Group4-7, read-only world and draft. Browser navigation and all-validator completeness remain separate.'}));
