'use strict';
if(!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict');
const {harness}=require('./github_resilience.test.js');
const h=harness(),copy=x=>JSON.parse(JSON.stringify(x));
h.run("game=E.createGame({advertisingVersion:1,productProgramsVersion:1,segmentDepositsVersion:1,creditPerformanceVersion:1,customerOwnershipVersion:1,workforceVersion:1,customerDemandVersion:2,managementVersion:2,serviceExpansionVersion:1,campaignRulesVersion:1,mode:'hotseat',seed:21,created:1});seat=0;newDraft(E.publicState(game,0));draft.decision='a';render=()=>{};");
const original=h.run('JSON.stringify(draft)'),world=h.run('JSON.stringify(game)');
h.run("const proposal=JSON.parse(JSON.stringify(draft));proposal.decision='b';recoveryComparison={token:recoveryContext(currentView()),key:recoveryDraftKey(E.publicState(game,0)),options:[{key:'decision',label:'Lower cost',plan:proposal}]}");
assert(h.run("stageBankRecovery(E.publicState(game,0),'decision')"));
assert.equal(h.run('draft.decision'),'b');
assert.equal(h.run('JSON.stringify(game)'),world,'staging changes no account, simulation, RNG, sealed plan or multiplayer state');
assert(h.run('undoBankRecovery(E.publicState(game,0))'));
assert.equal(h.run('JSON.stringify(draft)'),original);
// Reviews are tied to the exact draft; stale options cannot replace newer edits.
h.run("recoveryComparison={token:recoveryContext(currentView()),key:recoveryDraftKey(E.publicState(game,0)),options:[{key:'decision',plan:proposal}]};draft.capitalPolicy='liquid'");
const changed=h.run('JSON.stringify(draft)');
assert.equal(h.run("stageBankRecovery(E.publicState(game,0),'decision')"),false);
assert.equal(h.run('JSON.stringify(draft)'),changed);
// Unknown and overcommitted options still use the shared engine budget gate.
h.run("recoveryComparison={token:recoveryContext(currentView()),key:recoveryDraftKey(E.publicState(game,0)),options:[{key:'bad',plan:{...proposal,hires:1000}}]}");
assert.equal(h.run("stageBankRecovery(E.publicState(game,0),'missing')"),false);
assert.equal(h.run("stageBankRecovery(E.publicState(game,0),'bad')"),false);
assert.equal(h.run('JSON.stringify(draft)'),changed);
h.run("recoveryComparison={token:recoveryContext(currentView()),key:recoveryDraftKey(E.publicState(game,0)),options:[{key:'decision',plan:proposal}]}");
assert(h.run("stageBankRecovery(E.publicState(game,0),'decision')"));
h.run("draft.depositPolicy='margin'");
assert.equal(h.run('undoBankRecovery(E.publicState(game,0))'),false,'undo must not erase subsequent manual changes');
// Submitted turns remain sealed even with a previously displayed comparison.
h.run("view=E.publicState(game,0);view.me.submitted=true;recoveryComparison={token:recoveryContext(view),key:recoveryDraftKey(view),options:[{key:'decision',plan:proposal}]}");
const sealed=h.run('JSON.stringify(draft)');
assert.equal(h.run("stageBankRecovery(view,'decision')"),false);
assert.equal(h.run('undoBankRecovery(view)'),false);
assert.equal(h.run('JSON.stringify(draft)'),sealed);
assert(copy(h.run("recoveryChanges({decision:'a',allocation:{service:1}},{decision:'b',allocation:{service:2}})" )).includes('Executive response'));
console.log('Recovery UI passed: draft-only staging, exact undo, stale quote protection, budget validation and sealed-turn locks.');

for(const mutation of ['gh.active=true;gh.paused=true','connectionAttempt++','featureConnectionGeneration++','linkSession="replacement"','gh={...gh}','lan={...lan}','game=JSON.parse(JSON.stringify(game))','seat=1','game.gameOver=true','game.players[0].submitted=JSON.parse(JSON.stringify(draft))']){
 for(const action of ['stage','undo']){
  const x=harness();x.run("game=E.createGame({campaignRulesVersion:1,productProgramsVersion:1,segmentDepositsVersion:1,creditPerformanceVersion:1,customerOwnershipVersion:1,workforceVersion:1,customerDemandVersion:2,managementVersion:2,serviceExpansionVersion:1,mode:'hotseat',seed:21,created:1});seat=0;newDraft(currentView());draft.decision='a';render=()=>{};heldView=currentView();const option=JSON.parse(JSON.stringify(draft));option.decision='b';recoveryComparison={token:{...opportunityToken(heldView),attempt:connectionAttempt},key:recoveryDraftKey(heldView),options:[{key:'change',plan:option}]};");
  if(action==='undo')assert(x.run("stageBankRecovery(heldView,'change')"));
  x.run(mutation);const before=x.run('JSON.stringify({game,draft,gh,lan})');
  assert.equal(x.run(action==='stage'?"stageBankRecovery(heldView,'change')":"undoBankRecovery(heldView)"),false,action+' must reject '+mutation);
  assert.equal(x.run('JSON.stringify({game,draft,gh,lan})'),before);
 }
}
console.log('Recovery connection checks passed: stage and undo refuse paused, stale, replaced, ended or locked contexts.');

for(const mutation of ['gh.active=true;gh.paused=true','connectionAttempt++','seat=1','game=JSON.parse(JSON.stringify(game))']){
 const x=harness();x.run("document.querySelector('#bankRecovery').remove=()=>{};document.querySelector('#bankRecoveryMount').insertAdjacentHTML=function(position,html){this.innerHTML=html};game=E.createGame({campaignRulesVersion:1,productProgramsVersion:1,segmentDepositsVersion:1,creditPerformanceVersion:1,customerOwnershipVersion:1,workforceVersion:1,customerDemandVersion:2,managementVersion:2,serviceExpansionVersion:1,mode:'hotseat',seed:21,created:1});seat=0;newDraft(currentView());draft.decision='a';render=()=>{};renderOperatingPreview=()=>{};comparisonCalls=0;E.bankRecoveryOptions=()=>{comparisonCalls++;return {options:[]}};renderBankRecovery(currentView());");
 const click=x.elements.get('#compareRecovery').listeners.click;x.run(mutation);
 const before=x.run('JSON.stringify({game,draft,gh,lan})');click();
 assert.equal(x.run('comparisonCalls'),0,'A detached comparison button must not calculate under '+mutation);
 assert.equal(x.run('JSON.stringify({game,draft,gh,lan})'),before);
 if(mutation.includes('paused')){x.run('renderBankRecovery(currentView());');assert.match(x.elements.get('#bankRecoveryMount').innerHTML,/id="compareRecovery" disabled/,'Paused recovery comparison must look disabled');assert.match(x.elements.get('#bankRecoveryMount').innerHTML,/Reconnect, then compare recovery options again/);}
}
console.log('Recovery rendered controls passed: detached comparison handlers refuse changed contexts and paused controls are disabled.');

const repeated=harness();repeated.run("game=E.createGame({campaignRulesVersion:1,mode:'hotseat',seed:21,created:1});seat=0;newDraft(currentView());draft.decision='a';render=()=>{};heldView=currentView();const candidate=JSON.parse(JSON.stringify(draft));candidate.decision='b';recoveryComparison={token:recoveryContext(heldView),key:recoveryDraftKey(heldView),options:[{key:'same',plan:candidate}]};oldReviewToken=recoveryComparison.token;recoveryComparison={...recoveryComparison,token:recoveryContext(heldView)};");
assert.equal(repeated.run("stageBankRecovery(heldView,'same',oldReviewToken)"),false,'An old card cannot adopt a recomputed proposal with the same option key');
assert(repeated.run("stageBankRecovery(heldView,'same')"));repeated.run('oldUndoToken=recoveryUndo.token;recoveryUndo={...recoveryUndo,token:recoveryContext(heldView)};');
assert.equal(repeated.run('undoBankRecovery(heldView,oldUndoToken)'),false,'An old undo control cannot target a newer staging instance');
assert.equal(repeated.run('draft.decision'),'b');assert(repeated.run('undoBankRecovery(heldView)'));
