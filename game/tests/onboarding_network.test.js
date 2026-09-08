'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { createHash } = require('node:crypto');
let harness;
const portable = path.resolve(__dirname, '../BRANCH_WARS.html');
const runtimeHtml = process.argv.includes('--source') ? require('../tools/build_game.js').assemble().html : fs.readFileSync(portable, 'utf8');
if (process.argv.includes('--source')) {
  const html = runtimeHtml, read = fs.readFileSync;
  try {
    fs.readFileSync = function(file, ...args) { return path.resolve(String(file)) === portable ? html : read.call(this, file, ...args); };
    ({ harness } = require('./github_resilience.test.js'));
  } finally { fs.readFileSync = read; }
} else ({ harness } = require('./github_resilience.test.js'));
const copy = value => JSON.parse(JSON.stringify(value));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const options = { mode:'hotseat', seed:77, created:1, campaignRulesVersion:1, relationshipOffersVersion:1,
  regionalGrowthVersion:1, advertisingVersion:1, productProgramsVersion:1, segmentDepositsVersion:1,
  creditPerformanceVersion:1, customerOwnershipVersion:1, workforceVersion:1, customerDemandVersion:2,
  managementVersion:2, serviceExpansionVersion:1 };
const prerequisites = ['#relationshipOffersPreview','#regionalGrowthPreview','#advertisingPreview','#productPrograms',
  '#segmentDeposits','#creditPerformance','#householdOwnership','#specialistWorkforce','#customerNeeds',
  '#institutionManagement','#serviceExpansion','#rivalryPilot'];
const planFor = p => ({ focus:p.focus, allocation:{...p.allocation}, depositPolicy:'balanced', lendingPolicy:'balanced',
  capitalPolicy:'balanced', products:{...p.products}, newProjects:[], investments:{}, hires:0, competitiveAction:'none', decision:'b' });
function localStorageHarness() {
  const h=harness();
  // The network harness stubs these two functions. Restore their actual bodies
  // from the tested artifact, never from a possibly newer source file.
  for(const name of ['saveLocal','enterGame']) {
    const body=runtimeHtml.match(new RegExp('^function '+name+'\\([^\\n]*$', 'm'));
    assert(body,'Missing real '+name+' function');h.run(body[0]);
  }
  for(const id of ['#continueBtn','#startScreen','#connectScreen','#lobbyScreen','#gameScreen','#gameOver','#privacyScreen']) {
    const el=h.c.document.querySelector(id),classes=new Set(['hidden']);
    el.classList={add(...names){names.forEach(n=>classes.add(n));},remove(...names){names.forEach(n=>classes.delete(n));},
      toggle(name,force){const on=force===undefined?!classes.has(name):!!force;if(on)classes.add(name);else classes.delete(name);return on;},contains(name){return classes.has(name);}};
  }
  h.run("gh.active=false;lan.active=false;p2pRole='';game=null;view=null;draft=null;renderedSeats=[];render=()=>{renderedSeats.push(seat);if(game&&!draft)newDraft(E.publicState(game,seat))}");
  const binding="$('#continueBtn').addEventListener('click',continueSave);";
  assert(runtimeHtml.includes(binding),'Continue must bind the real resume handler');h.run(binding);
  h.c.FileReader=class{readAsText(file){this.result=file.contents;this.onload()}};
  return h;
}
function localReload() {
  for(const localMode of ['ai','hotseat'])for(const halfReady of localMode==='hotseat'?[false,true]:[false]) {
    const saved=localStorageHarness(),E=saved.c.window.BWEngine,g=E.createGame({...options,onboardingVersion:1,mode:localMode});
    const instruction=p=>({...planFor(p),allocation:{service:4,business:2,lending:1,operations:1},
      householdPolicy:{retention:25,priority:{everyday:1,connected:1,reserve:1}},
      onboardingPolicy:{market:p.focus,segment:'connected',product:'essential',share:50}});
    E.submit(g,0,instruction(g.players[0]));if(g.cycle===1)E.submit(g,1,instruction(g.players[1]));
    assert(g.players[0].onboarding.pending.length>0,'Save fixture has an active application queue');
    if(halfReady)E.submit(g,0,{...instruction(g.players[0]),onboardingPolicy:{...g.players[0].onboarding.policy,share:25}});
    const rules=Object.fromEntries(Object.entries(g).filter(([key])=>key==='version'||key.endsWith('Version')));
    const onboarding=copy(g.players.map(p=>p.onboarding)),sealed=copy(g.players[0].submitted);
    saved.c.persisted=g;saved.run('game=persisted;saveLocal()');
    const raw=saved.storage.get('branchWarsV7Save');assert(raw,'Real saveLocal wrote the autosave');
    const reload=localStorageHarness();for(const[key,value]of saved.storage)reload.storage.set(key,value);
    reload.run('updateContinue()');
    assert.equal(reload.elements.get('#continueBtn').classList.contains('hidden'),false,'v8.13 Continue is visible after a fresh reload');
    reload.elements.get('#continueBtn').listeners.click();
    const resumed=reload.state().game;assert(resumed,'Continue resumed the local save');
    // Import may add ledger metadata; every saved campaign-rule version must remain exact.
    assert.deepEqual(Object.fromEntries(Object.keys(rules).map(key=>[key,resumed[key]])),rules);
    assert.deepEqual(copy(resumed.players.map(p=>p.onboarding)),onboarding);assert.deepEqual(copy(resumed.players[0].submitted),sealed);
    assert.equal(resumed.mode,localMode);assert.equal(resumed.cycle,g.cycle);
    if(halfReady) {
      assert.equal(reload.elements.get('#privacyScreen').classList.contains('hidden'),false,'A sealed half-ready hotseat resumes behind the privacy curtain');
      assert.match(reload.elements.get('#privacyText').textContent,/saved plan is sealed/);
      assert.equal(reload.run('renderedSeats.length'),0,'Do not render the sealed owner before the handoff');
      assert.equal(reload.run('draft'),null);reload.run('const resumePrivacy=privacyNext;privacyNext=null;resumePrivacy()');
      assert.equal(reload.run('seat'),1);assert.equal(reload.elements.get('#privacyScreen').classList.contains('hidden'),true);
      assert.deepEqual(copy(reload.run('draft.onboardingPolicy')),onboarding[1].policy,'Handoff drafts only the receiving bank policy');
      assert.deepEqual(copy(reload.state().game.players[0].submitted),sealed,'Privacy handoff cannot alter the sealed instruction');
    } else {
      assert.equal(reload.run('seat'),0);assert.deepEqual(copy(reload.run('renderedSeats')),[0]);
      assert.equal(reload.elements.get('#gameScreen').classList.contains('hidden'),false);
      assert.equal(reload.elements.get('#privacyScreen').classList.contains('hidden'),true);
    }
    const imported=localStorageHarness();imported.c.importedFile={contents:raw};imported.run('importSave(importedFile)');
    const importedGame=imported.state().game;assert(importedGame,'Actual import handler resumed the saved campaign');
    assert.deepEqual(Object.fromEntries(Object.keys(rules).map(key=>[key,importedGame[key]])),rules);
    assert.deepEqual(copy(importedGame.players.map(p=>p.onboarding)),onboarding);
    assert.deepEqual(copy(importedGame.players[0].submitted),sealed);E.validatePilot(importedGame);
    if(halfReady){
      assert.equal(imported.elements.get('#privacyScreen').classList.contains('hidden'),false,'Import must use the same sealed hotseat curtain as Continue');
      assert.match(imported.elements.get('#privacyText').textContent,/saved plan is sealed/);
      assert.equal(imported.run('renderedSeats.length'),0,'Import cannot render the sealed owner before handoff');
      assert.equal(imported.run('draft'),null);
      imported.run('const importHandoff=privacyNext;privacyNext=null;importHandoff()');
      assert.equal(imported.run('seat'),1);assert.equal(imported.run('draftOwner'),importedGame.players[1].id);
      assert.deepEqual(copy(imported.run('renderedSeats')),[1]);
      assert.equal(imported.elements.get('#privacyScreen').classList.contains('hidden'),true);
      assert.deepEqual(copy(imported.run('draft.onboardingPolicy')),onboarding[1].policy,'Import drafts only the receiving bank queue policy');
      assert.deepEqual(copy(importedGame.players[0].submitted),sealed,'Import handoff cannot alter the sealed owner instruction');
    }else{
      assert.equal(imported.run('seat'),0);assert.deepEqual(copy(imported.run('renderedSeats')),[0]);
      assert.equal(imported.elements.get('#privacyScreen').classList.contains('hidden'),true);
    }
  }
  const future=localStorageHarness();future.storage.set('branchWarsV7Save',JSON.stringify({version:'8.99',gameOver:false}));future.run('updateContinue()');
  assert(future.elements.get('#continueBtn').classList.contains('hidden'),'Unsupported future saves never expose Continue');
}
function lifecycle() {
  const h = harness(), E = h.c.window.BWEngine;
  const toggle = h.elements.get('#onboardingPreview');
  for (const id of prerequisites) {
    h.changeFeature('#onboardingPreview',true);assert(h.confirmFeatures());
    assert(prerequisites.every(key => h.elements.get(key).checked), 'Onboarding selects every prerequisite');
    h.changeFeature(id,false);assert(h.confirmFeatures());
    assert.equal(toggle.checked, false, 'Disabling a prerequisite disables onboarding: ' + id);
  }
  // Captured from frozen b21d3b7811725e9bc059c87ea879b0d09f9ee1d555be54131d5160fbb9546258,
  // before onboarding existed. These are expectations, not two current runs agreeing.
  for (const [config, opening, closing] of [
    [{mode:'hotseat',seed:77,created:1,campaignRulesVersion:1},'58d36dcb9d2accc37b34d6927d029eaad0a0c2ad63c4ac8d7411a99b32e378bb','84096b2b5c0d8d14fdeb1fda0a944f7ea9fc40a0490f7ab18ac9081f027fa03c'],
    [options,'0b11eb227f5db40463613d40e17b4659fe3001366fd65497286e58fa636b08df','5f8a47db80df39b575f529a3603188626236b8ba476ff6167b57d7243b4ce48c']
  ]) {
    const old = E.createGame(config); assert.equal(digest(old), opening);
    assert.equal(digest(E.createGame({...config,onboardingVersion:0})), opening);
    assert.equal(old.onboardingVersion, undefined); assert(old.players.every(p => p.onboarding === undefined));
    for (let month=0;month<3;month++) for (const seat of [0,1]) E.submit(old,seat,planFor(old.players[seat]));
    assert.equal(digest(old), closing, 'Opt-out monthly behavior differs from frozen v8.12 build');
    const saved=JSON.stringify(old);E.migrateCampaign(old);assert.equal(JSON.stringify(old),saved,'Import mutated the original legacy save');
  }
  assert.throws(() => E.createGame({...options,onboardingVersion:2}), /onboarding/i);
  assert.throws(() => E.createGame({...options,onboardingVersion:1,relationshipOffersVersion:0}), /onboarding|relationship offers/i);
  const g=E.createGame({...options,onboardingVersion:1});assert.equal(g.version,'8.13');E.validatePilot(g);
  assert.equal(g.onboardingVersion,1);assert(g.players.every(p=>p.onboarding.pending.length===0&&p.onboarding.report===null));
  const before=JSON.stringify(g), restored=E.migrateCampaign(g);assert.equal(JSON.stringify(g),before);
  assert.deepEqual(copy(restored.players.map(p=>p.onboarding)),copy(g.players.map(p=>p.onboarding)));
  for(const alter of [s=>s.version='8.12',s=>delete s.onboardingVersion,s=>s.onboardingVersion=0,
    s=>delete s.players[0].onboarding,s=>s.players[0]._onboardingBudget=1,s=>s.players[0].onboarding.pending.push({createdCycle:0})]) {
    const invalid=copy(g);alter(invalid);assert.throws(()=>E.migrateCampaign(invalid));
  }
  h.c.fresh=g;h.run('game=fresh;seat=0;newDraft(E.publicState(game,0))');
  assert.deepEqual(copy(h.run('draft.onboardingPolicy')),copy(g.players[0].onboarding.policy));
  h.run('draft.onboardingPolicy.share=25');assert.equal(g.players[0].onboarding.policy.share,0,'Draft policy aliases live policy');
  for(const localMode of ['ai','hotseat']) {
    const local=harness();local.changeFeature('#onboardingPreview',true);assert(local.confirmFeatures());
    for(const id of ['#aiName','#hotName1','#hotName2'])local.c.document.querySelector(id).value='Local bank';
    local.run("startLocal('"+localMode+"')");assert.equal(local.state().game.version,'8.15');assert.equal(local.state().game.onboardingVersion,1);
  }
  g.gameOver=true;g.rematchVotes=[];assert.equal(E.rematch(g,0),false);assert.equal(E.rematch(g,1),true);
  assert.equal(g.version,'8.13');assert.equal(g.onboardingVersion,1);assert(g.players.every(p=>p.onboarding.pending.length===0&&p.onboarding.report===null));
}
async function linked(transport) {
  const host=harness('host'),guest=harness('guest'),queue=[],frames=[];
  for(const [i,peer] of [host,guest].entries()) {
    peer.c.enqueue=message=>{frames.push([i,copy(message)]);queue.push([i,copy(message)]);};
    peer.c.rules=options;
    peer.run("game=null;view=null;send=m=>enqueue(m);ghFlush=()=>{};p2pConfig={lobbyRequired:true,name:'Cedar Bank',guestName:'Harbor Bank',color:'#2878e0',scope:'regional',scenario:'balanced'};const seededOnboardingCreate=E.createGame;E.createGame=o=>seededOnboardingCreate({...o,seed:77,created:1})");
    if(transport!=='gh')peer.run('gh.active=false;lan={...emptyLan(),active:'+(transport==='lan')+'}');
  }
  host.run('Object.assign(p2pConfig,rules,{onboardingVersion:1})');
  const drain=async()=>{for(let n=0;queue.length;n++){assert(n<100,'Transport frame loop');const[i,frame]=queue.shift(),receiver=i?host:guest;receiver.c.frame=frame;await receiver.run('handleMessage(frame)');}};
  const oldHello={type:'hello',lobbySupported:1,pilotSupported:11,managementSupported:1,relationshipSupported:1,
    customerDemandSupported:2,relationshipOffersSupported:1,regionalGrowthSupported:1,advertisingSupported:1,
    productProgramsSupported:1,segmentDepositsSupported:1,creditPerformanceSupported:1,customerOwnershipSupported:1,
    workforceSupported:1,name:'Version 8.12 guest',color:'#8642bc'};
  for(const support of [undefined,0,2]) {
    host.c.oldHello={...oldHello,...(support===undefined?{}:{onboardingSupported:support})};await host.run('handleMessage(oldHello)');
    assert.equal(host.state().game,null);assert.equal(host.state().lobby,null);
    assert(queue.some(([,m])=>m.type==='error'&&/onboarding/i.test(m.message)));queue.length=0;
  }
  await guest.run("handleMessage({type:'hello_request'})");assert.equal(queue[0][1].onboardingSupported,1);await drain();
  assert.equal(guest.state().lobby.settings.onboardingVersion,1);assert.match(guest.elements.get('#lobbyRules').textContent,/onboarding/i);
  host.run('editLobbyIdentity(true)');await drain();guest.run('editLobbyIdentity(true)');await drain();
  host.run('startLobbyCampaign()');await drain();assert.equal(host.state().game.version,'8.13');assert.equal(guest.state().view.onboardingVersion,1);
  const untouched=JSON.stringify(host.state().game);host.c.oldHello=oldHello;await host.run('handleMessage(oldHello)');
  assert.equal(JSON.stringify(host.state().game),untouched,'Old-peer reconnect changed live game');
  assert(queue.some(([,m])=>m.type==='error'&&/onboarding/i.test(m.message)));queue.length=0;
  let pendingSeen=0;
  for(let month=0;month<4;month++) {
    const plans=host.state().game.players.map(p=>({...planFor(p),allocation:{service:4,business:2,lending:1,operations:1},
      householdPolicy:{retention:25,priority:{everyday:1,connected:1,reserve:1}},
      onboardingPolicy:{market:p.focus,segment:'connected',product:'essential',share:50}}));
    if(transport==='gh') {
      guest.c.plan=plans[1];await guest.run('ghCommitPlan(plan)');await drain();
      assert(host.state().ghIncomingCommit);assert.equal(host.state().game.players[1].submitted,null,'A commitment cannot reveal onboarding intent');
      const seal=copy(guest.state().ghPendingPlan);guest.run('ghCheckpoint()');
      const checkpoint=guest.storage.get('branchWarsGhResume');assert(checkpoint&&!checkpoint.includes('PRIVATE_TEST_TOKEN'));
      assert.deepEqual(JSON.parse(checkpoint).ghPendingPlan,seal);
      host.c.plan=plans[0];host.run('E.submit(game,0,plan);syncPeers()');await drain();
      assert.equal(guest.state().ghPendingPlan,null);
      const reveal=frames.filter(([i,f])=>i===1&&f.type==='plan_reveal').at(-1)[1];host.c.duplicate=copy(reveal);
      await host.run('handleMessage(duplicate)');await drain();assert.equal(host.state().game.cycle,month+2,'Duplicate onboarding reveal settled again');
    } else {
      host.c.plan=plans[0];host.run('E.submit(game,0,plan);syncPeers()');await drain();
      guest.c.plan=plans[1];guest.run("send({type:'plan',plan})");await drain();
    }
    host.run('E.validatePilot(game);E.validateLedger(game)');
    const g=host.state().game,v=guest.state().view;assert.equal(g.cycle,month+2);
    assert.deepEqual(copy(v.me.onboarding),copy(g.players[1].onboarding));assert.equal(v.rival.onboarding,undefined);
    assert.equal(v.lastPlans[g.players[0].id].onboardingPolicy,undefined);
    for(const p of g.players){assert.equal(p.onboarding.lastCycle,month+1);assert.equal(p.onboarding.report.cycle,month+1);pendingSeen+=p.onboarding.pending.length;}
    for(const events of [v.causalEvents||[],v.operatingEvents||[]])assert(events.every(e=>e.target===v.me.id),'Rival private onboarding events leaked');
    assert.doesNotMatch(JSON.stringify([v.resolution,v.log]),/onboardingPolicy|"pending"|onboarding(?:Processed|Approved|Funded|Cost|Expense|Rejected)/i);
    const raw=JSON.stringify(g),migrated=host.run('E.migrateCampaign(game)');assert.equal(JSON.stringify(g),raw);assert.deepEqual(copy(migrated.players.map(p=>p.onboarding)),copy(g.players.map(p=>p.onboarding)));
    const publicCopy=host.run('E.publicState(game,1)');publicCopy.me.onboarding.policy.share=0;publicCopy.me.onboarding.pending.length=0;
    assert.equal(JSON.stringify(g),raw,'Public queue and policy aliases the host state');
  }
  assert(pendingSeen>0,'Active onboarding must create a pending queue through real monthly plans');
  if(transport==='gh') {
    host.run('ghCheckpoint()');const saved=host.storage.get('branchWarsGhResume');assert(saved&&!saved.includes('PRIVATE_TEST_TOKEN'));
    const reload=harness('host');reload.storage.set('branchWarsGhResume',saved);reload.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
    reload.run('gh.active=false;ghPoll=()=>{};ghFlush=()=>{};ghCheckRepo=async()=>{};ghRead=async()=>({missing:true})');
    await reload.run('ghResume()');assert(reload.state().gh.active);assert.equal(reload.state().game.version,'8.13');
    assert.deepEqual(copy(reload.state().game.players.map(p=>p.onboarding)),copy(host.state().game.players.map(p=>p.onboarding)));
  }
}
async function main(){lifecycle();localReload();for(const transport of ['gh','lan','p2p'])await linked(transport);console.log('Onboarding network PASS: frozen opt-out hashes, setup prerequisites, v8.13 create/import/rematch, real autosave/visible Continue reload and half-ready hotseat privacy, all three negotiated transports, strict old-peer refusal, private queues/reports, sealed intent and duplicate protection, token-free checkpoint/reload.');}
main().catch(error=>{console.error(error);process.exitCode=1;});
