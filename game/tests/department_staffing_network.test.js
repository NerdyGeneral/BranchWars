'use strict';
// Complete actual clients, with transports simulated in memory. No real GitHub I/O.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>createHash('sha256').update(x).digest('hex');
const portable=process.argv.includes('--portable'),html=portable?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const reference='reports/reference-builds/BRANCH_WARS_departments_group6_57cc519e.html',old=fs.readFileSync(path.join(root,reference),'utf8');
assert.equal(hash(old),'57cc519e39eb78be7c17c9792cb80bf754571eac452e155ee04001d98eef97e0');
const harnessFile=path.join(__dirname,'github_resilience.test.js'),harnessText=fs.readFileSync(harnessFile,'utf8');
function loader(document){
 const text=harnessText.replace(/^const html=.*;\r?$/m,'const html=module.candidateDocument;');assert.notEqual(text,harnessText);
 const owner=new Module(harnessFile,module);owner.filename=harnessFile;owner.paths=module.paths;owner.candidateDocument=document;owner._compile(text,harnessFile);return owner.exports.harness;
}
const modern=loader(html),legacy=loader(old),E=modern().c.window.BWEngine;
const campaignVersion=process.argv.includes('--v31')?7:6;
if(campaignVersion===7)assert.equal(E.campaignCapabilities().financialGroupSupported,8);
assert.equal(E.campaignCapabilities().departmentStaffingSupported,2);assert.equal(legacy().c.window.BWEngine.campaignCapabilities().financialGroupSupported,6);
assert.equal(legacy().c.window.BWEngine.campaignCapabilities().departmentStaffingSupported,undefined);
const same=(a,b,label)=>assert.deepEqual(copy(a),copy(b),label);
function pair(transport,version=campaignVersion,oldSide=null){
 const host=(oldSide==='host'?legacy:modern)('host'),guest=(oldSide==='guest'?legacy:modern)('guest'),queue=[],frames=[];
 for(const [i,p]of [host,guest].entries()){
  p.c.enqueue=m=>{queue.push([i,copy(m)]);frames.push([i,copy(m)]);};
  p.run("game=null;view=null;lobby=null;messages=[];toast=m=>messages.push(m);send=m=>enqueue(m);ghFlush=()=>{};p2pConfig={lobbyRequired:true,name:'Cedar',guestName:'Harbor',color:'#2878e0',scope:'regional',scenario:'balanced'};resetFeaturePeer()");
  if(transport!=='gh')p.run('gh.active=false;lan={...emptyLan(),active:'+(transport==='lan')+'}');
 }
 host.c.settings=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options;host.run('Object.assign(p2pConfig,settings)');
 const p={host,guest,queue,frames,transport};
 p.drain=async()=>{for(let n=0;queue.length;n++){assert(n<150,'Handshake loop');const [i,m]=queue.shift(),target=i?host:guest;target.c.frame=m;await target.run('handleMessage(frame)');}};
 return p;
}
async function open(p){p.guest.run('send(makeFeatureHello())');await p.drain();assert(p.host.state().lobby&&p.guest.state().lobby,'Shared lobby absent');}
async function start(p){p.host.run('editLobbyIdentity(true)');await p.drain();p.guest.run('editLobbyIdentity(true)');await p.drain();p.host.run('startLobbyCampaign()');await p.drain();assert(p.host.state().game&&p.guest.state().view,'Campaign did not start');}
async function submitUi(peer,plan){peer.c.input=copy(plan);await peer.run('draft=JSON.parse(JSON.stringify(input));submitPlan()');}
function freshPlans(p){return p.host.run('game.players.map((_,i)=>E.chooseBot(game,i))');}
async function turn(p){const plans=freshPlans(p),cycle=p.host.state().game.cycle;await submitUi(p.guest,plans[1]);await p.drain();await submitUi(p.host,plans[0]);await p.drain();assert.equal(p.host.state().game.cycle,cycle+1);}
async function checkpoint(p){
 for(const peer of [p.host,p.guest])peer.run('ghCheckpoint()');
 const next=pair('gh');next.queue.length=0;
 for(const [i,prior]of [p.host,p.guest].entries()){
  const target=i?next.guest:next.host,raw=prior.storage.get('branchWarsGhResume');assert(raw);assert(!raw.includes('PRIVATE_TEST_TOKEN'));
  target.storage.set('branchWarsGhResume',raw);target.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
  target.run('gh.active=false;ghPoll=()=>{};ghCheckRepo=async()=>{};ghRead=async()=>({missing:true})');await target.run('ghResume()');
  assert(target.state().gh.active);assert(target.run('departmentPeerStatus(game||view).pending'));
  const before=next.frames.length,submitted=JSON.stringify(target.state().game?.players.map(x=>x.submitted));
  await target.run('submitPlan()');assert.equal(next.frames.length,before,'Restored action sent before fresh handshake');
  assert.equal(JSON.stringify(target.state().game?.players.map(x=>x.submitted)),submitted,'Restored host resolved before handshake');
  assert(/handshake|confirm/i.test(target.elements.get('#submitMsg').textContent));
 }
 await next.drain();assert(next.guest.run('departmentPeerStatus(view).compatible'));assert(next.host.run('peerFeatureStatus(game).compatible'));return next;
}
async function main(){
 let mixed=0,months=0;
 for(const support of [undefined,null,0,1,3,'2']){
  const p=pair('gh');p.host.c.badSupport=support;
  p.host.run("send=m=>enqueue(m.type==='hello_request'?{...m,departmentStaffingSupported:badSupport}:m)");
  p.guest.run('send(makeFeatureHello())');await p.drain();assert.equal(p.guest.state().lobby,null);assert.equal(p.guest.state().view,null);
  assert(!p.guest.run('departmentPeerStatus(p2pConfig={...p2pConfig,financialGroupVersion:6}).compatible'));
 }
 for(const transport of ['gh','lan','p2p']){
  for(const side of ['host','guest']){
   const refused=pair(transport,6,side);refused.guest.run('send(makeFeatureHello())');await refused.drain();
   assert.equal(refused.host.state().game,null);assert.equal(refused.guest.state().view,null);assert.equal(refused.guest.state().lobby,null);
   assert(refused.frames.some(([,m])=>m.type==='error'&&/staffing/i.test(m.message))||refused.guest.run('messages.some(m=>/staffing/i.test(m))'));
   assert(!refused.guest.run('linkReady'),'Old host was painted connected');
   if(side==='host'){
    refused.guest.run("gh.peerFileSeen=true;ghPaintHealth('POLL SUCCEEDED')");assert.notEqual(refused.guest.state().linkCls,'good','Reachable repository repainted refused host green');
   }
   const retained=pair(transport,5,side);await open(retained);await start(retained);assert.equal(retained.host.state().game.version,'9.4');mixed++;
  }
  const p=pair(transport);await open(p);assert(p.guest.run('departmentPeerStatus(lobby.settings).compatible'));
  const challenge=p.frames.filter(([i,m])=>i===0&&m.type==='hello_request'&&m.turnGuestChallenge).at(-1)[1];
  const goodHello=p.frames.filter(([i,m])=>i===1&&m.type==='hello'&&m.featureChallenge).at(-1)[1];
  p.guest.c.late={...challenge,departmentStaffingSupported:1};p.guest.run('makeFeatureHello(late)');assert(p.guest.run('departmentPeerStatus(lobby.settings).compatible'),'Late host downgrade accepted');
  p.host.c.late={...goodHello,departmentStaffingSupported:1};p.host.run('capturePeerFeatures(late)');assert(p.host.run('peerFeatureStatus(lobby.settings).compatible'),'Late guest downgrade accepted');
  await start(p);await turn(p);months++;
  const g=p.host.state().game,v=p.guest.state().view;E.validatePilot(g);E.validateFinancialGroupView(v);
  assert.equal(v.me.departmentFunctionDelivery.expertise.version,1);
  for(const key of ['onboarding','relationshipOffers']){
   assert.equal(v.me[key].report.staffingVersion,2);
   const bad=copy(v);bad.me[key].report.staffingVersion=1;p.guest.c.bad=bad;
   assert.throws(()=>p.guest.run("validateIncomingFeatureRules(bad,'view')"),'Mixed report version adopted');
  }
  assert.equal(v.rival.departmentFunctions,undefined);assert.equal(v.rival.departmentFunctionDelivery,undefined);assert.equal(v.departmentFunctionEconomy,undefined);
  same(v.me.departmentFunctionDelivery,g.players[1].departmentFunctionDelivery,'Owner delivery mismatch');
  const privateBad=copy(v);privateBad.rival.departmentFunctionDelivery=g.players[0].departmentFunctionDelivery;
  p.guest.c.privateBad=privateBad;assert.throws(()=>p.guest.run("validateIncomingFeatureRules(privateBad,'view')"));
  // Received state cannot authenticate an old host or restore readiness itself.
  p.guest.run('resetFeaturePeer()');const savedView=JSON.stringify(p.guest.state().view),frames=p.frames.length;
  p.guest.run("setConnection('TRANSPORT OPEN','good')");assert.notEqual(p.guest.state().linkCls,'good','Open transport painted compatible before handshake');
  const lastState=p.frames.filter(([i,m])=>i===0&&m.type==='state').at(-1)[1];p.guest.c.stale=lastState;await p.guest.run('handleMessage(stale)');
  assert.equal(JSON.stringify(p.guest.state().view),savedView);assert(!p.guest.run('linkReady'));
  await submitUi(p.guest,freshPlans(p)[1]);assert.equal(p.frames.length,frames,'Unconfirmed guest sealed/sent a plan');
  p.guest.c.staleChallenge=challenge;p.guest.run('makeFeatureHello(staleChallenge)');assert(p.guest.run('departmentPeerStatus(view).pending'),'Previous connection nonce restored support');
  p.host.run('resetFeaturePeer()');p.guest.run('send(makeFeatureHello())');await p.drain();assert(p.guest.run('departmentPeerStatus(view).compatible'));
  assert.equal(p.guest.state().linkCls,'good');assert.equal(p.host.state().linkCls,'good');
  if(transport==='gh'){
   const pending=freshPlans(p);await submitUi(p.guest,pending[1]);await p.drain();const seal=copy(p.guest.state().ghPendingPlan);
   const restored=await checkpoint(p);same(restored.guest.state().ghPendingPlan.plan,seal.plan,'Restore changed sealed order');assert.equal(restored.guest.state().ghPendingPlan.hash,seal.hash);
   await submitUi(restored.host,pending[0]);await restored.drain();assert.equal(restored.host.state().game.cycle,3);months++;
  }
  console.log('PASS staffing bilateral '+transport);
 }
 const deferred=pair('gh');await open(deferred);await start(deferred);
 deferred.guest.c.input=freshPlans(deferred)[1];deferred.guest.run('ghPlanHash=()=>new Promise(resolve=>{releaseHash=resolve})');
 const frames=deferred.frames.length,sealing=deferred.guest.run('ghCommitPlan(input)'),rejected=assert.rejects(sealing,/handshake/);
 deferred.guest.run('resetFeaturePeer();releaseHash("a".repeat(64))');await rejected;
 assert.equal(deferred.guest.state().ghPendingPlan,null);assert.equal(deferred.frames.length,frames,'Reset during digest emitted commitment');
 // Offline creation/import and direct-invite rule validation need no remote capability.
 const oldPeer=legacy(),rules=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:6}).options;
 oldPeer.c.rules=rules;const oldGame=oldPeer.run("(()=>{const g=E.createGame({...rules,mode:'solo',name:'Old Cedar',guestName:'Old Harbor',scope:'regional',seed:'retained-staffing'});const plans=g.players.map((_,i)=>E.chooseBot(g,i));E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);return g;})()");
 const oldReports=oldGame.players.map(p=>[p.relationshipOffers.report,p.onboarding.report,p.departmentFunctionDelivery]);
 const migrated=E.migrateCampaign(oldGame);same(migrated.players.map(p=>[p.relationshipOffers.report,p.onboarding.report,p.departmentFunctionDelivery]),oldReports,'Legacy evidence was rewritten');
 const local=modern();local.c.rules=rules;assert.doesNotThrow(()=>local.run("validateIncomingFeatureRules(rules,'lobby')"));
 console.log(JSON.stringify({status:'PASS',campaignVersion,transports:3,mixedGroup5Cases:mixed,months,candidateSha256:hash(html),reference,scope:'Simulated complete clients, not physical multiplayer acceptance'}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
