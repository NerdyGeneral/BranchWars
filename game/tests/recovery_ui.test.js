'use strict';
const assert=require('node:assert/strict');
const {harness}=require('./github_resilience.test.js');
const h=harness(),copy=x=>JSON.parse(JSON.stringify(x));
h.run("game=E.createGame({advertisingVersion:1,productProgramsVersion:1,segmentDepositsVersion:1,creditPerformanceVersion:1,customerOwnershipVersion:1,workforceVersion:1,customerDemandVersion:2,managementVersion:2,serviceExpansionVersion:1,campaignRulesVersion:1,mode:'hotseat',seed:21,created:1});seat=0;newDraft(E.publicState(game,0));draft.decision='a';render=()=>{};");
const original=h.run('JSON.stringify(draft)'),world=h.run('JSON.stringify(game)');
h.run("const proposal=JSON.parse(JSON.stringify(draft));proposal.decision='b';recoveryComparison={key:recoveryDraftKey(E.publicState(game,0)),options:[{key:'decision',label:'Lower cost',plan:proposal}]}");
assert(h.run("stageBankRecovery(E.publicState(game,0),'decision')"));
assert.equal(h.run('draft.decision'),'b');
assert.equal(h.run('JSON.stringify(game)'),world,'staging changes no account, simulation, RNG, sealed plan or multiplayer state');
assert(h.run('undoBankRecovery(E.publicState(game,0))'));
assert.equal(h.run('JSON.stringify(draft)'),original);
// Reviews are tied to the exact draft; stale options cannot replace newer edits.
h.run("recoveryComparison={key:recoveryDraftKey(E.publicState(game,0)),options:[{key:'decision',plan:proposal}]};draft.capitalPolicy='liquid'");
const changed=h.run('JSON.stringify(draft)');
assert.equal(h.run("stageBankRecovery(E.publicState(game,0),'decision')"),false);
assert.equal(h.run('JSON.stringify(draft)'),changed);
// Unknown and overcommitted options still use the shared engine budget gate.
h.run("recoveryComparison={key:recoveryDraftKey(E.publicState(game,0)),options:[{key:'bad',plan:{...proposal,hires:1000}}]}");
assert.equal(h.run("stageBankRecovery(E.publicState(game,0),'missing')"),false);
assert.equal(h.run("stageBankRecovery(E.publicState(game,0),'bad')"),false);
assert.equal(h.run('JSON.stringify(draft)'),changed);
h.run("recoveryComparison={key:recoveryDraftKey(E.publicState(game,0)),options:[{key:'decision',plan:proposal}]}");
assert(h.run("stageBankRecovery(E.publicState(game,0),'decision')"));
h.run("draft.depositPolicy='margin'");
assert.equal(h.run('undoBankRecovery(E.publicState(game,0))'),false,'undo must not erase subsequent manual changes');
// Submitted turns remain sealed even with a previously displayed comparison.
h.run("view=E.publicState(game,0);view.me.submitted=true;recoveryComparison={key:recoveryDraftKey(view),options:[{key:'decision',plan:proposal}]}");
const sealed=h.run('JSON.stringify(draft)');
assert.equal(h.run("stageBankRecovery(view,'decision')"),false);
assert.equal(h.run('undoBankRecovery(view)'),false);
assert.equal(h.run('JSON.stringify(draft)'),sealed);
assert(copy(h.run("recoveryChanges({decision:'a',allocation:{service:1}},{decision:'b',allocation:{service:2}})" )).includes('Executive response'));
console.log('Recovery UI passed: draft-only staging, exact undo, stale quote protection, budget validation and sealed-turn locks.');
