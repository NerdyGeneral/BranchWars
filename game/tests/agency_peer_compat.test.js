'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const released=path.resolve(root,'../V2 release/BRANCH_WARS.html');
assert.equal(createHash('sha256').update(fs.readFileSync(released)).digest('hex'),
 'b041ed53394575872e32888f542232225e15b61deef73a07e7f20b020f25e1e4','Actual old peer fixture changed');
// Use the current fake DOM/relay harness, but execute BOTH the engine and complete
// client scripts from actual immutable V2. Overriding only a modern hello is not
// backward interoperability: V2 validates capabilities differently.
const harnessFile=path.join(__dirname,'github_resilience.test.js');
const harnessText=fs.readFileSync(harnessFile,'utf8');
const oldHarnessText=harnessText.replace(/^const html=.*;\r?$/m,
 'const html=fs.readFileSync('+JSON.stringify(released)+',"utf8");');
assert.notEqual(oldHarnessText,harnessText,'Old peer source substitution did not occur');
const oldModule=new Module(harnessFile,module);oldModule.filename=harnessFile;oldModule.paths=module.paths;
oldModule._compile(oldHarnessText,harnessFile);
const oldHarness=oldModule.exports.harness,{harness:modernHarness}=require('./github_resilience.test.js');
const oldEngine=oldHarness().c.window.BWEngine,newEngine=modernHarness().c.window.BWEngine;
assert.equal(oldEngine.campaignCapabilities().financialGroupSupported,2);
assert.equal(newEngine.campaignCapabilities().financialGroupSupported,3);
for(const rules of [1,2]){
 const options=oldEngine.previewFeatureSelection({}, {field:'financialGroupVersion',value:rules}).options;
 const contract=oldEngine.campaignRules(options,{context:'lobby'});
 assert.equal(oldEngine.peerRulesIssue(contract,newEngine.campaignCapabilities()).field,'financialGroupVersion',
  'Regression control must reproduce V2 rejecting an otherwise supported campaign when the advertised maximum is 3');
 const fallback=modernHarness('guest').run('makeFeatureHello()');
 assert.equal(oldEngine.peerRulesIssue(contract,fallback),null,'V2-compatible hello is refused by the actual old engine');
}
function peers(transport,rules,oldHost=false,oldGuest=false){
 const host=(oldHost?oldHarness:modernHarness)('host'),guest=(oldGuest?oldHarness:modernHarness)('guest');
 const queue=[],frames=[],settings=newEngine.previewFeatureSelection({}, {field:'financialGroupVersion',value:rules}).options;
 for(const [i,p]of [host,guest].entries()){
  p.c.enqueue=m=>{frames.push([i,copy(m)]);queue.push([i,copy(m)]);};
  p.run("game=null;view=null;lobby=null;send=m=>enqueue(m);ghFlush=()=>{};p2pConfig={lobbyRequired:true,name:'Cedar Bank',guestName:'Harbor Bank',color:'#2878e0',scope:'regional',scenario:'balanced'};resetFeaturePeer()");
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
 assert(pair.host.state().game&&pair.guest.state().view,'Compatible peers failed campaign start');
}
async function mixedLegacy(){
 let cases=0;
 for(const transport of ['gh','lan','p2p'])for(const rules of [1,2])for(const oldHost of [false,true]){
  const pair=peers(transport,rules,oldHost,!oldHost),{host,guest}=pair;
  await lobby(pair);await start(pair);
  assert.equal(host.state().game.financialGroupVersion,rules);assert.equal(guest.state().view.financialGroupVersion,rules);
  assert.equal(host.state().game.version,rules===1?'9.0':'9.1');
  const plans=host.run('game.players.map((p,i)=>E.chooseBot(game,i))');
  host.c.legacyPlan=plans[0];guest.c.legacyPlan=plans[1];
  if(transport==='gh'){
   await guest.run('ghCommitPlan(legacyPlan)');await pair.drain();
   assert.equal(host.state().game.players[1].submitted,null);
   host.run('E.submit(game,0,legacyPlan);syncPeers()');await pair.drain();
  }else{
   host.run('E.submit(game,0,legacyPlan);syncPeers()');await pair.drain();
   guest.run("send({type:'plan',plan:legacyPlan})");await pair.drain();
  }
  assert.equal(host.state().game.cycle,2);assert.equal(guest.state().view.cycle,2);
  assert.equal(guest.state().view.rival.financialGroup,undefined);
  const before=JSON.stringify(host.state().game);
  host.run('resetFeaturePeer();challengePeerFeatures()');await pair.drain();
  assert(host.run('peerFeatureStatus().compatible'));assert(host.run('featurePeerFresh'));
  assert.equal(JSON.stringify(host.state().game),before,'Mixed-version rehandshake changed campaign');
  if(oldHost)assert(pair.frames.filter(([i,m])=>i===1&&m.type==='hello').every(([,m])=>m.financialGroupSupported===2),
   'Modern guest advertised an unsupported maximum to actual V2 host');
  cases++;
 }
 return cases;
}
async function modernBoundaries(){
 for(const transport of ['gh','lan','p2p']){
  // Bootstrap starts at capability 2, then learns the modern host ceiling from
  // its connection-bound challenge. No campaign downgrade is permitted.
  const pair=peers(transport,3);await lobby(pair);await start(pair);
  assert.equal(pair.host.state().game.version,'9.2');
  const hellos=pair.frames.filter(([i,m])=>i===1&&m.type==='hello').map(([,m])=>m);
  assert.equal(hellos[0].financialGroupSupported,2);
  assert(hellos.some(m=>m.financialGroupSupported===3&&m.featureChallenge));
  assert(pair.frames.some(([i,m])=>i===0&&m.type==='hello_request'&&m.financialGroupSupported===3));
  const before=JSON.stringify(pair.host.state().game),caps=copy(pair.host.run('featurePeerCapabilities'));
  pair.host.c.bootstrap=copy(hellos[0]);pair.host.run('handleMessage(bootstrap)');await pair.drain();
  assert.deepEqual(copy(pair.host.run('featurePeerCapabilities')),caps,'Late bootstrap replaced confirmed modern capability');
  assert(pair.host.run('featurePeerFresh'));assert.equal(JSON.stringify(pair.host.state().game),before);
  const previous=copy(hellos.find(m=>m.featureChallenge));
  pair.host.run('resetFeaturePeer();challengePeerFeatures()');pair.host.c.previousHello=previous;
  pair.host.run('handleMessage(previousHello)');assert(pair.host.run('peerFeatureStatus().pending'));
  await pair.drain();assert(pair.host.run('peerFeatureStatus().compatible'));

  const old=peers(transport,3,false,true);old.guest.run('send(makeFeatureHello())');await old.drain();
  assert.equal(old.host.state().lobby,null);assert.equal(old.host.state().game,null);
  assert.equal(old.guest.state().view,null);assert(old.frames.some(([,m])=>m.type==='error'&&/Financial Group/.test(m.message)));
  assert(old.frames.every(([,m])=>m.type!=='state'),'Incompatible V2 guest received Group 3 state');

  const edited=peers(transport,2);await lobby(edited);
  edited.host.run('editLobbyIdentity(true)');await edited.drain();edited.guest.run('editLobbyIdentity(true)');await edited.drain();
  const revision=edited.host.state().lobby.revision;
  edited.host.run("stageLobbyFeatures(E.previewFeatureSelection(lobby.settings,{field:'financialGroupVersion',value:3}).options,lobby.revision);applyLobbySettings()");
  await edited.drain();assert.equal(edited.host.state().lobby.revision,revision+1);
  assert(edited.host.state().lobby.players.every(p=>!p.ready));assert(edited.host.run('peerFeatureStatus().compatible'));
  assert.equal(edited.guest.state().lobby.settings.financialGroupVersion,3);
  await start(edited);assert.equal(edited.host.state().game.version,'9.2');
 }
}
(async()=>{
 const cases=await mixedLegacy();await modernBoundaries();
 console.log(JSON.stringify({passed:true,mixedLegacyCases:cases,transports:3,
  scope:'Actual immutable V2 engine/client on both host directions for Group 1/2; modern Group 3 bootstrap, refusal, lobby upgrade and delayed-message fences. Physical two-computer acceptance remains separate.'}));
})().catch(error=>{console.error(error);process.exitCode=1});
