'use strict';
// Simulated transports only: execute actual assembled engine + complete client,
// and actual frozen Group4 client for refusal/backward compatibility. No GitHub I/O.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),sha=x=>createHash('sha256').update(x).digest('hex');
const reference='reports/reference-builds/BRANCH_WARS_institution_group4_7cd113e1.html',oldHtml=fs.readFileSync(path.join(root,reference),'utf8');
assert.equal(sha(oldHtml),'7cd113e1112b98ff639f2a2c9abd22d2dee8cf049ae89976d972e7c1b2061f7c');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const candidateSha256=sha(html),harnessFile=path.join(__dirname,'github_resilience.test.js'),harnessText=fs.readFileSync(harnessFile,'utf8');
function loadHarness(document){
 const text=harnessText.replace(/^const html=.*;\r?$/m,'const html=module.candidateDocument;');
 assert.notEqual(text,harnessText,'Harness must execute selected actual complete client');
 const owner=new Module(harnessFile,module);owner.filename=harnessFile;owner.paths=module.paths;owner.candidateDocument=document;
 owner._compile(text,harnessFile);return owner.exports.harness;
}
const modern=loadHarness(html),legacy=loadHarness(oldHtml),E=modern().c.window.BWEngine;
assert.equal(E.campaignCapabilities().financialGroupSupported,8);assert.equal(legacy().c.window.BWEngine.campaignCapabilities().financialGroupSupported,4);
const same=(a,b,label)=>assert.deepEqual(copy(a),copy(b),label);
function peers(transport,version=5,oldSide=null){
 const host=(oldSide==='host'?legacy:modern)('host'),guest=(oldSide==='guest'?legacy:modern)('guest'),queue=[],frames=[];
 for(const [i,p]of [host,guest].entries()){
  p.c.enqueue=m=>{queue.push([i,copy(m)]);frames.push([i,copy(m)]);};
  p.run("game=null;view=null;lobby=null;diagnostics=[];toast=m=>diagnostics.push(m);send=m=>enqueue(m);ghFlush=()=>{};p2pConfig={lobbyRequired:true,name:'Cedar Bank',guestName:'Harbor Bank',color:'#2878e0',scope:'regional',scenario:'balanced'};resetFeaturePeer()");
  if(transport!=='gh')p.run('gh.active=false;lan={...emptyLan(),active:'+(transport==='lan')+'}');
 }
 host.c.settings=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options;host.run('Object.assign(p2pConfig,settings)');
 const drain=async()=>{for(let n=0;queue.length;n++){
  assert(n<150,'Handshake/message loop did not converge');const [index,frame]=queue.shift(),peer=index?host:guest;peer.c.frame=frame;await peer.run('handleMessage(frame)');
 }};
 return {host,guest,queue,frames,drain};
}
async function open(pair){pair.guest.run('send(makeFeatureHello())');await pair.drain();
 assert(pair.host.state().lobby&&pair.guest.state().lobby);assert(pair.host.run('peerFeatureStatus().compatible'));}
async function start(pair){
 pair.host.run('editLobbyIdentity(true)');await pair.drain();pair.guest.run('editLobbyIdentity(true)');await pair.drain();
 assert(pair.host.state().lobby.players.every(p=>p.ready));pair.host.run('startLobbyCampaign()');await pair.drain();
 assert(pair.host.state().game&&pair.guest.state().view,'Start failed: '+JSON.stringify(pair.frames.filter(([,m])=>m.type==='error')));
}
function privateState(pair){
 const g=pair.host.state().game,v=pair.guest.state().view;
 assert.equal(g.version,'9.4');assert.equal(v.version,'9.4');assert.equal(v.financialGroupVersion,5);
 for(const key of ['facilityLifecycle','facilityNetwork','departmentOffice','financialGroup','agency'])assert.equal(v.rival[key],undefined,key+' leaked');
 assert.equal(v.facilityEconomy,undefined);assert.equal(v.departmentEconomy,undefined);
 same(v.me.facilityLifecycle,g.players[1].facilityLifecycle);same(v.me.facilityNetwork,g.players[1].facilityNetwork);
 assert.equal(v.lastPlans?.[g.players[0].id]?.facilityLifecyclePolicy,undefined);
}
function plans(pair){return pair.host.run(`game.players.map((p,i)=>{
 const q=E.chooseBot(game,i);q.newProjects=[];q.newProject=null;q.investments={};q.hires=0;q.specialistHires=E.emptySpecialistOrders();
 q.competitiveAction='none';q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;q.agencyPolicy=E.defaultAgencyPlan(p);
 q.facilityPolicy=E.defaultFacilityPolicy();Object.assign(q,E.defaultDepartmentPlan(p));
 q.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);
 for(const row of Object.values(q.facilityLifecyclePolicy.offices))row.maintenance='full';
 q.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(game,p,q).policy;return q;
})`);}
async function submit(pair,input,transport){
 pair.host.c.plan=copy(input[0]);pair.guest.c.plan=copy(input[1]);
 if(transport==='gh'){
  await pair.guest.run('ghCommitPlan(plan)');await pair.drain();assert.equal(pair.host.state().game.players[1].submitted,null);
  pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
 }else{
  pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();pair.guest.run("send(typeof turnMessage==='function'?turnMessage('plan',{plan}):{type:'plan',plan})");await pair.drain();
 }
}
async function reload(pair){
 const restored=[modern('host'),modern('guest')],queue=[],frames=[];
 for(const [index,source]of [pair.host,pair.guest].entries()){
  source.run('ghCheckpoint()');const raw=source.storage.get('branchWarsGhResume');assert(!raw.includes('PRIVATE_TEST_TOKEN'));
  const saved=source.run("(()=>{const s=JSON.parse(localStorage.getItem('branchWarsGhResume'));for(const k of ['connection','game','view'])s[k]=unpackStorageValue(s[k]);return s;})()");
  assert.equal((saved.game||saved.view).version,'9.4');assert.equal(saved.featurePeerCapabilities,undefined);assert.equal(saved.featurePeerFresh,undefined);
  if(index===1){assert.equal(saved.view.rival.facilityLifecycle,undefined);assert.equal(saved.view.facilityEconomy,undefined);}
  const peer=restored[index];peer.storage.set('branchWarsGhResume',raw);peer.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
  peer.c.enqueue=m=>{queue.push([index,copy(m)]);frames.push([index,copy(m)]);};
  peer.run('gh.active=false;ghPoll=()=>{};ghFlush=()=>{};ghCheckRepo=async()=>{};ghRead=async()=>({missing:true});send=m=>enqueue(m)');
  await peer.run('ghResume()');assert(peer.state().gh.active,'Valid lifecycle checkpoint refused');
 }
 const [host,guest]=restored;assert(host.run('peerFeatureStatus().pending'),'Capabilities must be discarded on reload');
 const drain=async()=>{for(let n=0;queue.length;n++){
  assert(n<150,'Checkpoint handshake did not converge');const [index,frame]=queue.shift(),p=restored[1-index];p.c.frame=frame;await p.run('handleMessage(frame)');
 }};
 await drain();assert(host.run('featurePeerFresh'));assert(host.run('peerFeatureStatus().compatible'));
 return {host,guest,queue,frames,drain};
}
async function corruptCheckpoint(pair){
 for(const [side,source]of [['host',pair.host],['guest',pair.guest]]){
  source.run('ghCheckpoint()');
  const saved=source.run("(()=>{const s=JSON.parse(sessionStorage.getItem('branchWarsGhResume'));for(const k of ['connection','game','view'])s[k]=unpackStorageValue(s[k]);s.version=1;return s;})()");
  // Version1 is the supported uncompressed envelope; contents still carry strict
  // Group5 campaign rules. Corrupt only the inner lifecycle boundary metadata.
  const target=side==='host'?saved.game.players[0]:saved.view.me;target.facilityLifecycle.lastSettledCycle++;
  const peer=modern(side);peer.c.saved=saved;peer.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
  peer.run("game=null;view=null;gh.active=false;errors=[];setStartMessage=m=>errors.push(m);sessionStorage.setItem('branchWarsGhResume',JSON.stringify(saved));ghCheckRepo=async()=>{throw Error('Corrupt checkpoint reached external repository check')}");
  await peer.run('ghResume()');assert.equal(peer.state().gh.active,false);assert.equal(peer.state().game,null);assert.equal(peer.state().view,null);
  assert(peer.run('errors.length>0'));assert(peer.run("errors.every(m=>!m.includes('external repository check'))"));
 }
}
async function boundaries(){
 let mixed=0;
 for(const transport of ['gh','lan','p2p']){
  const refused=peers(transport,5,'guest');refused.guest.run('send(makeFeatureHello())');await refused.drain();
  assert.equal(refused.host.state().game,null);assert.equal(refused.host.state().lobby,null);assert.equal(refused.guest.state().view,null);
  assert(refused.frames.some(([,m])=>m.type==='error'&&/Financial Group/i.test(m.message)));
  assert(refused.frames.every(([,m])=>m.type!=='state'),'Actual Group4 peer received unsupported Group5 state');
  for(const side of ['host','guest']){
   const pair=peers(transport,4,side);await open(pair);await start(pair);assert.equal(pair.host.state().game.version,'9.3');
   assert.equal(pair.guest.state().view.me.facilityLifecycle,undefined);mixed++;
  }
  const pair=peers(transport,4);await open(pair);
  pair.host.run('editLobbyIdentity(true)');await pair.drain();pair.guest.run('editLobbyIdentity(true)');await pair.drain();
  const revision=pair.host.state().lobby.revision;
  pair.host.run("stageLobbyFeatures(E.previewFeatureSelection(lobby.settings,{field:'financialGroupVersion',value:5}).options,lobby.revision);applyLobbySettings()");
  await pair.drain();assert.equal(pair.host.state().lobby.revision,revision+1);assert(pair.host.state().lobby.players.every(p=>!p.ready));
  assert.equal(pair.guest.state().lobby.settings.financialGroupVersion,5);await start(pair);privateState(pair);
 }
 return mixed;
}
async function activePairs(){
 let months=0;
 for(const transport of ['gh','lan','p2p']){
  let pair=peers(transport);await open(pair);await start(pair);privateState(pair);
  const oldHello=copy(pair.frames.find(([i,m])=>i===1&&m.type==='hello'&&m.featureChallenge)[1]);
  assert.equal(oldHello.financialGroupSupported,8);
  const opening=copy(pair.host.state().game);await submit(pair,plans(pair),transport);months++;
  assert.equal(pair.host.state().game.cycle,2);privateState(pair);
  for(const [i,p]of pair.host.state().game.players.entries()){
   assert(p.facilityLifecycle.report.paid>0,'Actual maintenance cash must be paid');
   assert(p.facilityLifecycle.records[p.facilityNetwork.offices[0].id].conditionBp<10000,'Wear must come from actual month, not fixture');
   assert(p.accounting.journal.some(e=>e.source==='facility.maintenance'));assert.equal(opening.players[i].facilityLifecycle.report,null);
  }
  let input=plans(pair),staleCommit=null;
  for(const [i,q]of input.entries())q.facilityLifecyclePolicy.renovate=pair.host.state().game.players[i].facilityNetwork.offices[0].id;
  for(const mutate of [q=>{q.facilityLifecyclePolicy.offices={};},q=>{q.facilityLifecyclePolicy.renovate='foreign-office';},q=>{Object.values(q.facilityLifecyclePolicy.offices)[0].staffQuarters.operations=401;}]){
   const bad=copy(input[1]);mutate(bad);pair.host.c.bad=bad;const frozen=JSON.stringify(pair.host.state().game);
   assert.throws(()=>pair.host.run('E.submit(E.migrateCampaign(JSON.parse(JSON.stringify(game))),1,bad)'));
   assert.equal(JSON.stringify(pair.host.state().game),frozen);
  }
  if(transport==='gh'){
   pair.guest.c.plan=copy(input[1]);await pair.guest.run('ghCommitPlan(plan)');await pair.drain();
   const commit=copy(pair.frames.findLast(([i,m])=>i===1&&m.type==='plan_commit')[1]);
   staleCommit=copy(commit);
   pair.host.c.duplicate=commit;await pair.host.run('handleMessage(duplicate)');await pair.drain();
   assert.equal(pair.host.state().game.players[1].submitted,null);
   pair=await reload(pair);same(pair.guest.state().ghPendingPlan.plan.facilityLifecyclePolicy,input[1].facilityLifecyclePolicy);
   pair.host.c.plan=copy(input[0]);pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
  }else await submit(pair,input,transport);
  months++;assert.equal(pair.host.state().game.cycle,3);privateState(pair);
  for(const [i,p]of pair.host.state().game.players.entries()){
   const record=p.facilityLifecycle.records[input[i].facilityLifecyclePolicy.renovate];assert(record.renovation&&record.renovation.work>0);
   assert.equal(p.accounting.journal.filter(e=>e.source==='facility.renovation').length,1,'Renovation paid once');
  }
  const before=JSON.stringify(pair.host.state().game);
  if(transport==='gh')for(const [i,frame]of [...pair.frames,[1,staleCommit]])if(i===1&&['plan_commit','plan_reveal'].includes(frame.type)){
   pair.host.c.duplicate=copy(frame);await pair.host.run('handleMessage(duplicate)');await pair.drain();
  }
  assert.equal(JSON.stringify(pair.host.state().game),before,'Stale/duplicate seals charged another month');
  for(const mutate of [v=>{v.rival.facilityLifecycle=copy(v.me.facilityLifecycle);},v=>{v.facilityEconomy=copy(pair.host.state().game.facilityEconomy);},
   v=>{delete v.me.facilityLifecycle;},v=>{v.me.facilityLifecycle.lastSettledCycle++;},
   v=>{v.lastPlans[v.rival.id].facilityLifecyclePolicy=copy(input[0].facilityLifecyclePolicy);},v=>{v.financialGroupVersion=4;}]){
   const bad=copy(pair.guest.state().view);mutate(bad);pair.guest.c.bad=bad;
   assert.throws(()=>pair.guest.run("validateIncomingFeatureRules(bad,'view')"));
   const displayed=JSON.stringify(pair.guest.state().view);
   assert.throws(()=>pair.guest.run("handleMessage({type:'state',state:bad})"));
   assert.equal(JSON.stringify(pair.guest.state().view),displayed,'Malformed received view replaced the displayed bank');
  }
  pair.host.run('resetFeaturePeer();challengePeerFeatures()');pair.host.c.oldHello=oldHello;await pair.host.run('handleMessage(oldHello)');
  assert(pair.host.run('peerFeatureStatus().pending'),'Old handshake restored readiness');
  await pair.drain();assert(pair.host.run('featurePeerFresh'));assert.equal(JSON.stringify(pair.host.state().game),before);
  if(transport==='gh'){await corruptCheckpoint(pair);pair=await reload(pair);assert.equal(JSON.stringify(pair.host.state().game),before);privateState(pair);}
  input=plans(pair);
  for(const [i,q]of input.entries())q.facilityLifecyclePolicy.cancel=pair.host.state().game.players[i].facilityNetwork.offices[0].id;
  const spent=pair.host.state().game.players.map(p=>p.buildSpend);await submit(pair,input,transport);months++;
  assert.equal(pair.host.state().game.cycle,4);privateState(pair);
  for(const [i,p]of pair.host.state().game.players.entries()){
   const r=p.facilityLifecycle.records[input[i].facilityLifecyclePolicy.cancel];assert.equal(r.renovation,null);assert(r.conditionBp<10000,'Cancellation must not renovate for free');
   assert.equal(p.buildSpend,spent[i]);assert.equal(p.accounting.journal.filter(e=>e.source==='facility.renovation').length,1);
  }
  console.log('PASS Group5 '+transport+' maintenance, renovation/cancel, privacy, reconnect and duplicate protections');
 }
 return months;
}
(async()=>{
 const mixedGroup4Cases=await boundaries(),months=await activePairs();
 console.log(JSON.stringify({status:'PASS',transports:3,mixedGroup4Cases,activePairs:3,months,candidateSha256,reference,
  scope:'Actual source Group5 clients and immutable Group4 peer; simulated transports only. Physical two-computer acceptance remains separate.'}));
})().catch(error=>{console.error(error);process.exitCode=1});
