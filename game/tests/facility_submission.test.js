'use strict';
// Actual current client submitPlan, not a click-only disabled-button test.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const candidateSha256=createHash('sha256').update(html).digest('hex'),file=path.join(__dirname,'github_resilience.test.js');
const owner=new Module(file,module);owner.filename=file;owner.paths=module.paths;owner.candidateDocument=html;
const original=fs.readFileSync(file,'utf8'),source=original.replace(/^const html=.*;\r?$/m,'const html=module.candidateDocument;');
assert.notEqual(source,original);owner._compile(source,file);const {harness}=owner.exports;
let checks=0;
function guest(transport='gh',version=5){
 const h=harness('guest');h.c.version=version;
 h.run(`const fixtureOptions=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options;
 const fixture=E.createGame({...fixtureOptions,mode:'hotseat',scenario:'balanced',seed:'facility-submit',created:1});
 draft=E.chooseBot(fixture,1);const ownerBank=fixture.players[1];
 draft.newProjects=[];draft.newProject=null;draft.investments={};draft.hires=0;draft.specialistHires=E.emptySpecialistOrders();
 draft.competitiveAction='none';draft.groupPolicy.bankDividend=0;draft.groupPolicy.bankSupport=0;draft.agencyPolicy=E.defaultAgencyPlan(ownerBank);
 draft.facilityPolicy=E.defaultFacilityPolicy();Object.assign(draft,E.defaultDepartmentPlan(ownerBank));
 if(version===5){draft.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(ownerBank);draft.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(fixture,ownerBank,draft).policy;}
 view=E.publicState(fixture,1);game=null;frames=[];send=m=>frames.push(m);ghFlush=()=>{};
 hashCalls=0;const actualHash=ghPlanHash;ghPlanHash=(...args)=>{hashCalls++;return actualHash(...args)};
 `);
 if(transport!=='gh')h.run('gh.active=false;lan={...emptyLan(),active:'+(transport==='lan')+'}');
 assert(h.run('planReady(view)'));return h;
}
async function invalidPlans(){
 const variants=[
  ['maintenance',h=>h.run("Object.values(draft.facilityLifecyclePolicy.offices)[0].maintenance='invented'")],
  ['staff',h=>h.run('Object.values(draft.facilityLifecyclePolicy.offices)[0].staffQuarters.operations=401')],
  ['healthy renovation',h=>h.run('draft.facilityLifecyclePolicy.renovate=Object.keys(draft.facilityLifecyclePolicy.offices)[0]')],
  ['foreign renovation',h=>h.run("draft.facilityLifecyclePolicy.renovate='rival-office'")],
  ['optional spending',h=>h.run('draft.investments={network:5000000}')],
  ['conflicting construction',h=>h.run("draft.newProjects=['branchAtm','branchFinancialCenter'];draft.newProject='branchAtm'")],
  ['already submitted',h=>h.run('view.me.submitted=true')],
  ['ended',h=>h.run('view.gameOver=true')]
 ];
 for(const transport of ['gh','lan','p2p'])for(const [label,mutate]of variants){
  const h=guest(transport);mutate(h);const before=h.run('JSON.stringify({view,draft})');
  await h.run('submitPlan()');assert.equal(h.run('frames.length'),0,transport+' '+label+' sent a frame');
  assert.equal(h.run('hashCalls'),0,transport+' '+label+' began a seal');assert.equal(h.state().ghPendingPlan,null);
  assert.equal(h.run('planAckTimer'),null);assert.equal(h.run('JSON.stringify({view,draft})'),before,'Rejected draft changed bank/plan');
  assert(h.elements.get('#submitMsg').textContent,label+' needs a visible error');checks++;
 }
}
async function validPlans(){
 for(const transport of ['gh','lan','p2p']){
  const h=guest(transport),expected=copy(h.run('draft'));await h.run('submitPlan()');
  assert.equal(h.run('frames.length'),1);assert.equal(h.run('view.me.submitted'),true);
  assert.equal(h.run('frames[0].type'),transport==='gh'?'plan_commit':'plan');
  if(transport==='gh'){assert.equal(h.run('hashCalls'),1);assert.deepEqual(copy(h.state().ghPendingPlan.plan),expected);assert.equal(h.run('frames[0].plan'),undefined);}
  else assert.deepEqual(copy(h.run('frames[0].plan')),expected);
  checks++;
 }
 // Version4 keeps its established client behavior and transports; the stronger
 // facility review is not silently imposed on a retained historical campaign.
 const old=guest('gh',4);old.run('E.projectPlanStatus=()=>{throw Error("Group5 review reached old campaign")};E.lifecycleInstructionQuote=()=>{throw Error("Group5 review reached old campaign")}');
 await old.run('submitPlan()');assert.equal(old.run('frames.length'),1);assert(old.state().ghPendingPlan);checks++;
}
async function hashFences(){
 for(const change of [
  "resetLink();gh={...emptyGh(),active:true,room:'NEWROOM2'};view=null",
  'view=JSON.parse(JSON.stringify(view))',
  'view.cycle++'
 ]){
  const h=guest();h.run('ghPlanHash=()=>new Promise(resolve=>finishHash=resolve)');
  const pending=h.run('submitPlan()');assert(h.run('typeof finishHash===\'function\''),'Valid draft never began sealing');
  h.run(change);h.run("finishHash('b'.repeat(64))");await pending;
  assert.equal(h.run('frames.length'),0);assert.equal(h.state().ghPendingPlan,null);assert.equal(h.run('planAckTimer'),null);
  assert(!h.state().view||!h.state().view.me.submitted);checks++;
 }
}
(async()=>{await invalidPlans();await validPlans();await hashFences();console.log(JSON.stringify({status:'PASS',checks,candidateSha256,
 scope:'Actual Group5 guest pre-submit guard across three simulated transports, no mutation/hash/frame for invalid orders, valid sends, preserved Group4 behavior and async session fences.'}));})()
 .catch(error=>{console.error(error);process.exitCode=1});
