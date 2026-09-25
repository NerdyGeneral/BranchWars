'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{test}=require('node:test'),{harness}=require('./github_resilience.test');
function fresh(version=9){const h=harness();h.run(`game=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:${version}}).options,mode:'hotseat',seed:'object-workspaces',created:1});seat=0;gh.active=false;p2pRole='';newDraft(currentView());catalogue=Object.entries(E.projectCatalog(currentView().me,currentView())).filter(([,p])=>!p.strategy&&!p.legacy&&!p.serviceOnly&&!p.programOnly);renderProjectCatalogue(currentView(),catalogue);`);return h;}
test('Project catalogue preserves all choices but shows only one detailed decision and no selector wall',()=>{
 const h=fresh(),before=h.run('JSON.stringify({game,draft})');h.run("projectWorkspace.category='all';renderProjectCatalogue(currentView(),catalogue)");
 const html=h.elements.get('#projectGrid').innerHTML;
 assert.equal((html.match(/data-project-inspect=/g)||[]).length,h.run('catalogue.length'));
 assert.equal((html.match(/data-project="/g)||[]).length,1);
 assert.equal((html.match(/id="projectDetailTitle"/g)||[]).length,1);assert(!html.includes('<select'));
 assert.equal(h.run('JSON.stringify({game,draft})'),before);
});
test('Browsing blocked initiatives explains the cause without disabling inspection or changing plans',()=>{
 const h=fresh();h.run("projectWorkspace.category='all';projectWorkspace.selected=catalogue.find(([k])=>!projectChoiceStatus(currentView(),k).eligible)[0]");
 const before=h.run('JSON.stringify({game,draft})');h.run('renderProjectCatalogue(currentView(),catalogue)');
 assert.match(h.elements.get('#projectGrid').innerHTML,/Needs review/);assert.match(h.elements.get('#projectGrid').innerHTML,/class="notice warn"/);
 assert.match(h.elements.get('#projectGrid').innerHTML,/data-project="[^"]+" disabled/);assert.equal(h.run('JSON.stringify({game,draft})'),before);
});
test('Selections reset across campaign ownership; older supported rules remain untouched',()=>{
 for(const version of [4,7,8,9]){const h=fresh(version);h.run("projectWorkspace.category='growth'");h.run('seat=1;newDraft(currentView());');
  const before=h.run('JSON.stringify({game,draft})');h.run('renderProjectCatalogue(currentView(),catalogue)');assert.equal(h.run('projectWorkspace.owner'),h.run('game.players[1].id'));
  assert.equal(h.run('projectWorkspace.category'),'facilities');assert.equal(h.run('JSON.stringify({game,draft})'),before);
 }
});
test('Commercial clients use a compact directory; desk-wide selectors are disclosed separately',()=>{
 const h=fresh();h.run("$('#pipeline').insertAdjacentHTML=function(position,html){this.innerHTML+=html};$('#pipeline').innerHTML='';renderExpandedServices(currentView())");
 const html=h.elements.get('#pipeline').innerHTML;
 assert.equal((html.match(/data-service-inspect=/g)||[]).length,6);assert(html.includes('Choose a client'));
 const index=html.indexOf('<details id="servicePricing"');assert(index>0);assert(!html.slice(0,index).includes('<select'));
 assert(!html.includes('data-service-bid='),'No disconnected one-click bid buttons remain on the directory');
});

test('Project and office callbacks refuse replaced connections, paused repositories and locked plans',()=>{
 for(const change of ['featureConnectionGeneration++','gh={...gh}','gh.active=true;gh.paused=true','game.players[0].submitted=true','seat=1;newDraft(currentView())']){
  const h=fresh();h.run(`projectButton=document.querySelector('#testProjectButton');projectButton.dataset.project='branchDigital';
   realSelectAll=document.querySelectorAll;document.querySelectorAll=s=>s==='[data-project]'?[projectButton]:realSelectAll(s);
   serviceProjectsUI(currentView());oldProjectClick=projectButton.listeners.click;
   renderFacilityLifecycle(currentView());oldOfficeClick=$('#stageLifecycleSettings').listeners.click;`);
  h.run(change);const before=h.run('JSON.stringify({game,draft})');h.run('oldProjectClick();oldOfficeClick()');
  assert.equal(h.run('JSON.stringify({game,draft})'),before,change);
 }
});

test('Required review remains discoverable without reopening itself over every workspace',()=>{
 const h=fresh();h.run("renderMonthlyPlanReview(currentView(),monthlyPlanReview(currentView()));$('#monthlyReviewDetails').open=false;renderMonthlyPlanReview(currentView(),monthlyPlanReview(currentView()))");
 assert.equal(h.elements.get('#monthlyReviewDetails').open,false);
 assert.match(h.elements.get('#monthlyReviewSummary').textContent,/1 required/);assert.equal(h.run('monthlyPlanReview(currentView()).blockers.length'),1);
 h.run("$('#monthlyReviewDetails').open=true;renderMonthlyPlanReview(currentView(),monthlyPlanReview(currentView()))");assert.equal(h.elements.get('#monthlyReviewDetails').open,true,'Explicit player inspection stays open');
});
