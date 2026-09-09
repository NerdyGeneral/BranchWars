'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const released=path.join(root,'reports/reference-builds/BRANCH_WARS_agency_group3_c3af45b3.html');
assert.equal(createHash('sha256').update(fs.readFileSync(released)).digest('hex'),
 'c3af45b3aa4da99fa1333c260de90395552c56f6046735daf8615225e3e355ce','Actual old peer fixture changed');
// Use the current fake DOM/relay harness, but execute BOTH the engine and complete
// client scripts from actual immutable Group 3. Overriding only a modern hello is not
// backward interoperability: Group 3 validates capabilities differently.
const harnessFile=path.join(__dirname,'github_resilience.test.js');
const harnessText=fs.readFileSync(harnessFile,'utf8');
const oldHarnessText=harnessText.replace(/^const html=.*;\r?$/m,
 'const html=fs.readFileSync('+JSON.stringify(released)+',"utf8");');
assert.notEqual(oldHarnessText,harnessText,'Old peer source substitution did not occur');
const oldModule=new Module(harnessFile,module);oldModule.filename=harnessFile;oldModule.paths=module.paths;
oldModule._compile(oldHarnessText,harnessFile);
const oldHarness=oldModule.exports.harness,{harness:modernHarness}=require('./github_resilience.test.js');
const oldEngine=oldHarness().c.window.BWEngine,newEngine=modernHarness().c.window.BWEngine;
assert.equal(oldEngine.campaignCapabilities().financialGroupSupported,3);
assert.equal(newEngine.campaignCapabilities().financialGroupSupported,7);
for(const rules of [3]){
 const options=oldEngine.previewFeatureSelection({}, {field:'financialGroupVersion',value:rules}).options;
 const contract=oldEngine.campaignRules(options,{context:'lobby'});
 assert.equal(oldEngine.peerRulesIssue(contract,newEngine.campaignCapabilities()).field,'financialGroupVersion',
  'Regression control must reproduce Group 3 rejecting an otherwise supported campaign when the advertised maximum exceeds its supported range');
 const fallback=modernHarness('guest').run('makeFeatureHello({financialGroupSupported:3,featureChallenge:"group3-test"})');
 assert.equal(oldEngine.peerRulesIssue(contract,fallback),null,'Group 3-compatible hello is refused by the actual old engine');
}
function peers(transport,rules,oldHost=false,oldGuest=false){
 const host=(oldHost?oldHarness:modernHarness)('host'),guest=(oldGuest?oldHarness:modernHarness)('guest');
 const queue=[],frames=[],settings=newEngine.previewFeatureSelection({}, {field:'financialGroupVersion',value:rules}).options;
 for(const [i,p]of [host,guest].entries()){
  p.c.enqueue=m=>{frames.push([i,copy(m)]);queue.push([i,copy(m)]);};
  p.run("game=null;view=null;lobby=null;diagnostics=[];toast=m=>diagnostics.push(m);send=m=>enqueue(m);ghFlush=()=>{};p2pConfig={lobbyRequired:true,name:'Cedar Bank',guestName:'Harbor Bank',color:'#2878e0',scope:'regional',scenario:'balanced'};resetFeaturePeer()");
  if(transport!=='gh')p.run('gh.active=false;lan={...emptyLan(),active:'+(transport==='lan')+'}');
 }
 host.c.settings=settings;host.run('Object.assign(p2pConfig,settings)');
 const drain=async()=>{for(let n=0;queue.length;n++){
  assert(n<150,'Mixed-version handshake failed to converge');const[i,m]=queue.shift(),p=i?host:guest;
  p.c.frame=m;await p.run('handleMessage(frame)');
 }};
 return {host,guest,queue,frames,drain};
}
async function lobby(pair){
 pair.guest.run('send(makeFeatureHello())');await pair.drain();
 assert(pair.host.state().lobby&&pair.guest.state().lobby,'Compatible actual peers did not open shared lobby');
 assert(pair.host.run('peerFeatureStatus().compatible'));assert(pair.host.run('featurePeerFresh'));
}
async function start(pair){
 pair.host.run('editLobbyIdentity(true)');await pair.drain();
 pair.guest.run('editLobbyIdentity(true)');await pair.drain();
 assert(pair.host.state().lobby.players.every(p=>p.ready));
 pair.host.run('startLobbyCampaign()');await pair.drain();
 assert(pair.host.state().game&&pair.guest.state().view,'Compatible peers failed campaign start: '+JSON.stringify({errors:pair.frames.filter(([,m])=>m.type==='error'),lobbyError:pair.host.c.document.querySelector('#lobbyError').textContent,host:pair.host.run('diagnostics'),guest:pair.guest.run('diagnostics')}));
}
async function mixedLegacy(){
 let cases=0;
 for(const transport of ['gh','lan','p2p'])for(const rules of [3])for(const oldHost of [false,true]){
  const pair=peers(transport,rules,oldHost,!oldHost),{host,guest}=pair;
  await lobby(pair);await start(pair);
  assert.equal(host.state().game.financialGroupVersion,rules);assert.equal(guest.state().view.financialGroupVersion,rules);
  assert.equal(host.state().game.version,'9.2');
  const plans=host.run('game.players.map((p,i)=>E.chooseBot(game,i))');
  host.c.legacyPlan=plans[0];guest.c.legacyPlan=plans[1];
  if(transport==='gh'){
   await guest.run('ghCommitPlan(legacyPlan)');await pair.drain();
   assert.equal(host.state().game.players[1].submitted,null);
   host.run('E.submit(game,0,legacyPlan);syncPeers()');await pair.drain();
  }else{
   host.run('E.submit(game,0,legacyPlan);syncPeers()');await pair.drain();
   guest.run("send(typeof turnMessage==='function'?turnMessage('plan',{plan:legacyPlan}):{type:'plan',plan:legacyPlan})");await pair.drain();
  }
  assert.equal(host.state().game.cycle,2);assert.equal(guest.state().view.cycle,2);
  assert.equal(guest.state().view.rival.financialGroup,undefined);
  const before=JSON.stringify(host.state().game);
  host.run('resetFeaturePeer();challengePeerFeatures()');await pair.drain();
  assert(host.run('peerFeatureStatus().compatible'));assert(host.run('featurePeerFresh'));
  assert.equal(JSON.stringify(host.state().game),before,'Mixed-version rehandshake changed campaign');
  if(oldHost)assert(pair.frames.filter(([i,m])=>i===1&&m.type==='hello').every(([,m])=>m.financialGroupSupported<=3),
   'Modern guest advertised an unsupported maximum to actual Group 3 host');
  cases++;
 }
 return cases;
}
async function modernBoundaries(){
 for(const transport of ['gh','lan','p2p']){
  // Bootstrap starts at capability 2, then learns the modern host ceiling from
  // its connection-bound challenge. No campaign downgrade is permitted.
  const pair=peers(transport,4);await lobby(pair);await start(pair);
  assert.equal(pair.host.state().game.version,'9.3');
  const hellos=pair.frames.filter(([i,m])=>i===1&&m.type==='hello').map(([,m])=>m);
  assert.equal(hellos[0].financialGroupSupported,2);
  assert(hellos.some(m=>m.financialGroupSupported===7&&m.featureChallenge));
  assert(pair.frames.some(([i,m])=>i===0&&m.type==='hello_request'&&m.financialGroupSupported===7));
  const before=JSON.stringify(pair.host.state().game),caps=copy(pair.host.run('featurePeerCapabilities'));
  pair.host.c.bootstrap=copy(hellos[0]);pair.host.run('handleMessage(bootstrap)');await pair.drain();
  assert.deepEqual(copy(pair.host.run('featurePeerCapabilities')),caps,'Late bootstrap replaced confirmed modern capability');
  assert(pair.host.run('featurePeerFresh'));assert.equal(JSON.stringify(pair.host.state().game),before);
  const previous=copy(hellos.find(m=>m.featureChallenge));
  pair.host.run('resetFeaturePeer();challengePeerFeatures()');pair.host.c.previousHello=previous;
  pair.host.run('handleMessage(previousHello)');assert(pair.host.run('peerFeatureStatus().pending'));
  await pair.drain();assert(pair.host.run('peerFeatureStatus().compatible'));

  const old=peers(transport,4,false,true);old.guest.run('send(makeFeatureHello())');await old.drain();
  assert.equal(old.host.state().lobby,null);assert.equal(old.host.state().game,null);
  assert.equal(old.guest.state().view,null);assert(old.frames.some(([,m])=>m.type==='error'&&/Financial Group/.test(m.message)));
  assert(old.frames.every(([,m])=>m.type!=='state'),'Incompatible Group 3 guest received Group 4 state');

  const edited=peers(transport,3);await lobby(edited);
  edited.host.run('editLobbyIdentity(true)');await edited.drain();edited.guest.run('editLobbyIdentity(true)');await edited.drain();
  const revision=edited.host.state().lobby.revision;
  edited.host.run("stageLobbyFeatures(E.previewFeatureSelection(lobby.settings,{field:'financialGroupVersion',value:4}).options,lobby.revision);applyLobbySettings()");
  await edited.drain();assert.equal(edited.host.state().lobby.revision,revision+1);
  assert(edited.host.state().lobby.players.every(p=>!p.ready));assert(edited.host.run('peerFeatureStatus().compatible'));
  assert.equal(edited.guest.state().lobby.settings.financialGroupVersion,4);
  await start(edited);assert.equal(edited.host.state().game.version,'9.3');
 }
}
async function submitPair(pair,plans,transport){
 const {host,guest}=pair;host.c.testPlan=copy(plans[0]);guest.c.testPlan=copy(plans[1]);
 if(transport==='gh'){
  await guest.run('ghCommitPlan(testPlan)');await pair.drain();
  assert.equal(host.state().game.players[1].submitted,null,'Sealed guest instructions leaked early');
  host.run('E.submit(game,0,testPlan);syncPeers()');await pair.drain();
 }else{
  host.run('E.submit(game,0,testPlan);syncPeers()');await pair.drain();
  guest.run("send(typeof turnMessage==='function'?turnMessage('plan',{plan:testPlan}):{type:'plan',plan:testPlan})");await pair.drain();
 }
}
function modestPlans(host){return host.run(`game.players.map((p,i)=>{
 const q=E.chooseBot(game,i);q.newProjects=[];q.newProject=null;q.investments={};q.hires=0;
 q.specialistHires=E.emptySpecialistOrders();q.competitiveAction='none';
 q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;q.agencyPolicy=E.defaultAgencyPlan(p);
 q.facilityPolicy={convert:null,cancel:null};q.leaderOrders=Object.fromEntries(Object.keys(p.departmentOffice.leaders).map(k=>[k,null]));
 q.departmentPolicy=JSON.parse(JSON.stringify(p.departmentOffice.policy));
 return q;
})`);}
function assertPrivate(pair){
 const {host,guest}=pair,g=host.state().game,v=guest.state().view;
 assert.equal(v.departmentEconomy,undefined);assert.equal(v.rival.departmentOffice,undefined);assert.equal(v.rival.facilityNetwork,undefined);
 assert.deepEqual(copy(v.me.departmentOffice),copy(g.players[1].departmentOffice));
 assert.deepEqual(copy(v.me.facilityNetwork),copy(g.players[1].facilityNetwork));
 for(const field of ['departmentPolicy','leaderOrders','facilityPolicy'])assert.equal(v.lastPlans?.[g.players[0].id]?.[field],undefined);
}
async function reloadCheckpoint(pair){
 const restored=[modernHarness('host'),modernHarness('guest')],queue=[],frames=[];
 for(const [index,source]of [pair.host,pair.guest].entries()){
  source.run('ghCheckpoint()');const raw=source.storage.get('branchWarsGhResume');
  assert(!raw.includes('PRIVATE_TEST_TOKEN'));
  const saved=source.run(`(()=>{const s=JSON.parse(localStorage.getItem('branchWarsGhResume'));for(const k of ['connection','game','view'])s[k]=unpackStorageValue(s[k]);return s;})()`);
  assert.equal((saved.game||saved.view).version,'9.3');assert.equal(saved.featurePeerCapabilities,undefined);assert.equal(saved.featurePeerFresh,undefined);
  if(index===1){assert.equal(saved.view.departmentEconomy,undefined);assert.equal(saved.view.rival.departmentOffice,undefined);}
  const peer=restored[index];peer.storage.set('branchWarsGhResume',raw);peer.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
  peer.c.enqueue=m=>{queue.push([index,copy(m)]);frames.push([index,copy(m)]);};
  peer.run('gh.active=false;ghPoll=()=>{};ghFlush=()=>{};ghCheckRepo=async()=>{};ghRead=async()=>({missing:true});send=m=>enqueue(m)');
  await peer.run('ghResume()');assert(peer.state().gh.active);
 }
 const [host,guest]=restored;
 assert(host.run('peerFeatureStatus().pending'),'Checkpoint must obtain fresh capabilities');
 const drain=async()=>{for(let n=0;queue.length;n++){
  assert(n<150,'Institution checkpoint handshake did not converge');const[index,message]=queue.shift(),peer=restored[1-index];peer.c.frame=message;await peer.run('handleMessage(frame)');
 }};
 await drain();assert(host.run('featurePeerFresh'));assert(host.run('peerFeatureStatus().compatible'));
 return {host,guest,queue,frames,drain};
}
async function activeInstitutions(){
 for(const transport of ['gh','lan','p2p']){
  let pair=peers(transport,4);await lobby(pair);await start(pair);
  // Recruit a real qualified employee through the ordinary paid plan. No cash,
  // staff, retained earnings or eligibility is granted by a test-only fixture.
  let plans=modestPlans(pair.host);plans.forEach(q=>q.specialistHires.service=1);
  await submitPair(pair,plans,transport);
  assert.equal(pair.host.state().game.cycle,2);
  for(const p of pair.host.state().game.players)assert.equal(p.workforce.departments.service.count,1);
  plans=modestPlans(pair.host);
  for(const [i,q]of plans.entries()){
   q.leaderOrders.service='delivery';
   const office=pair.host.state().game.players[i].facilityNetwork.offices.find(o=>o.closedCycle===null);
   q.facilityPolicy.convert={officeId:office.id,model:office.model==='digital'?'commercial':'digital'};
  }
  for(const mutate of [q=>{q.facilityPolicy.convert.model='invented';},q=>{q.leaderOrders.service='invented';},q=>{q.departmentPolicy.envelopes.extra=1;}]){
   const malformed=copy(plans[1]);mutate(malformed);pair.host.c.bad=malformed;
   assert.throws(()=>pair.host.run('E.submit(E.migrateCampaign(JSON.parse(JSON.stringify(game))),1,bad)'));
  }
  const before=copy(pair.host.state().game);
  if(transport==='gh'){
   pair.guest.c.testPlan=copy(plans[1]);await pair.guest.run('ghCommitPlan(testPlan)');await pair.drain();
   pair=await reloadCheckpoint(pair);
   assert.deepEqual(copy(pair.guest.state().ghPendingPlan.plan.facilityPolicy),copy(plans[1].facilityPolicy));
   assert.deepEqual(copy(pair.guest.state().ghPendingPlan.plan.leaderOrders),copy(plans[1].leaderOrders));
   assert.equal(pair.host.state().game.players[1].submitted,null);
   pair.host.c.testPlan=copy(plans[0]);pair.host.run('E.submit(game,0,testPlan);syncPeers()');await pair.drain();
  }else await submitPair(pair,plans,transport);
  assert.equal(pair.host.state().game.cycle,3);assertPrivate(pair);
  for(const mutate of [v=>{v.rival.departmentOffice=copy(v.me.departmentOffice);},
    v=>{v.rival.facilityNetwork=copy(v.me.facilityNetwork);},v=>{v.me.facilityNetwork.offices[0].model='invented';},
    v=>{v.me.departmentOffice.arrears.service++;}]){
   const badView=copy(pair.guest.state().view);mutate(badView);pair.guest.c.badView=badView;
   assert.throws(()=>pair.guest.run("validateIncomingFeatureRules(badView,'view')"));
  }
  for(const [i,p]of pair.host.state().game.players.entries()){
   assert.equal(p.departmentOffice.leaders.service.profile,'delivery');
   assert(p.departmentOffice.paid>before.players[i].departmentOffice.paid,'Leadership did not charge actual cash');
   const office=p.facilityNetwork.offices.find(o=>o.id===plans[i].facilityPolicy.convert.officeId);
   assert(office.conversion||office.model===plans[i].facilityPolicy.convert.model,'Conversion order disappeared');
   assert(p.accounting.journal.some(e=>e.source==='facility.conversion'),'Paid conversion absent from bank journal');
  }
  const after=JSON.stringify(pair.host.state().game),reveals=pair.frames.filter(([i,m])=>i===1&&m.type==='plan_reveal');
  if(transport==='gh')for(const [,reveal]of reveals){pair.host.c.duplicate=reveal;await pair.host.run('handleMessage(duplicate)');await pair.drain();}
  assert.equal(JSON.stringify(pair.host.state().game),after,'Duplicate reveal repeated conversion or leader payment');
  pair.host.run('resetFeaturePeer();challengePeerFeatures()');await pair.drain();
  assert(pair.host.run('featurePeerFresh'));assert.equal(JSON.stringify(pair.host.state().game),after);
  if(transport==='gh'){pair=await reloadCheckpoint(pair);assert.equal(JSON.stringify(pair.host.state().game),after);assertPrivate(pair);}
  plans=modestPlans(pair.host);await submitPair(pair,plans,transport);assert.equal(pair.host.state().game.cycle,4);assertPrivate(pair);
 }
}
(async()=>{
 const cases=await mixedLegacy();await modernBoundaries();await activeInstitutions();
 console.log(JSON.stringify({passed:true,mixedLegacyCases:cases,transports:3,activeInstitutionPairs:3,
  scope:'Actual immutable Group 3 client both host directions; Group4 bootstrap/refusal/lobby upgrade, paid specialist-to-leader appointments and conversions, sealed-plan checkpoint reload, duplicate protection, owner privacy, malformed views and fresh handshakes. Physical two-computer acceptance remains separate.'}));
})().catch(error=>{console.error(error);process.exitCode=1});
