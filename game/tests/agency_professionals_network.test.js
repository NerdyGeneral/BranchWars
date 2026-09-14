'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {peers,lobby,start}=require('./agency_peer_compat.test'),copy=x=>JSON.parse(JSON.stringify(x));
const fixture=path.resolve(__dirname,'../reports/reference-builds/BRANCH_WARS_group9_1bb3e687.html'),bytes=fs.readFileSync(fixture);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'1bb3e6879b4b11abfc43b344a062429c14e5d5eff95fb49620573663f4dea273');
const file=path.join(__dirname,'github_resilience.test.js'),original=fs.readFileSync(file,'utf8'),modified=original.replace(/^const html=.*;\r?$/m,'const html=fs.readFileSync('+JSON.stringify(fixture)+',"utf8");');assert.notEqual(original,modified);
const m=new Module(file,module);m.filename=file;m.paths=module.paths;m._compile(modified,file);const old=m.exports.harness;
assert.equal(old().c.window.BWEngine.campaignCapabilities().financialGroupSupported,9);
let cases=0;
async function turn(p,transport){
 const plans=p.host.run('game.players.map((p,i)=>E.chooseBot(game,i))');p.host.c.policy=plans[0];p.guest.c.policy=plans[1];
 if(transport==='gh'){await p.guest.run('ghCommitPlan(policy)');await p.drain();assert.equal(p.host.state().game.players[1].submitted,null);p.host.run('E.submit(game,0,policy);syncPeers()');}
 else{p.host.run('E.submit(game,0,policy);syncPeers()');await p.drain();p.guest.run("send(turnMessage('plan',{plan:policy}))");}
 await p.drain();assert.equal(p.host.state().game.cycle,2);assert.equal(p.guest.state().view.cycle,2);
}
(async()=>{
 for(const transport of ['gh','lan','p2p']){
  const p=peers(transport,9);await lobby(p);p.host.run('editLobbyIdentity(true)');await p.drain();p.guest.run('editLobbyIdentity(true)');await p.drain();const rev=p.host.state().lobby.revision;
  p.host.run("stageLobbyFeatures(E.previewFeatureSelection(lobby.settings,{field:'financialGroupVersion',value:10}).options,lobby.revision);applyLobbySettings()");await p.drain();assert.equal(p.host.state().lobby.revision,rev+1);assert(p.host.state().lobby.players.every(x=>!x.ready));assert.equal(p.guest.state().lobby.settings.financialGroupVersion,10);
  await start(p);assert.equal(p.host.state().game.version,'9.9');assert.equal(p.guest.state().view.me.agency.version,2);assert.equal(p.guest.state().view.rival.agency,undefined);await turn(p,transport);
  const resolved=JSON.stringify(p.host.state().game);for(const [i,frame]of p.frames.filter(([i,f])=>i===1&&['plan','gh_plan','gh_reveal'].includes(f.type))){p.host.c.delayed=copy(frame);await p.host.run('handleMessage(delayed)');}await p.drain();assert.equal(JSON.stringify(p.host.state().game),resolved,'Duplicate/stale plan resolved twice');
  const previous=p.frames.find(([i,f])=>i===1&&f.type==='hello'&&f.featureChallenge)[1];p.host.run('resetFeaturePeer();challengePeerFeatures()');p.host.c.previous=copy(previous);await p.host.run('handleMessage(previous)');assert(p.host.run('peerFeatureStatus().pending'));await p.drain();assert(p.host.run('peerFeatureStatus().compatible'));assert.equal(JSON.stringify(p.host.state().game),resolved);
  const snapshot=copy(p.guest.state().view),before=JSON.stringify(snapshot);snapshot.me.agency.professionals.employees.push({id:'foreign',role:'business',credentialThrough:0});p.guest.c.bad=snapshot;assert.throws(()=>p.guest.run('E.validateFinancialGroupView(bad)'));assert.equal(JSON.stringify(p.guest.state().view),before);
  p.host.run('game=E.migrateCampaign(JSON.parse(JSON.stringify(game)));resetFeaturePeer()');assert(p.host.run('peerFeatureStatus().pending'));p.host.run('challengePeerFeatures()');await p.drain();assert(p.host.run('peerFeatureStatus().compatible'));assert.equal(p.host.state().game.version,'9.9');cases++;
  const refused=peers(transport,10,false,true,old);refused.guest.run('send(makeFeatureHello())');await refused.drain();assert.equal(refused.host.state().game,null);assert.equal(refused.host.state().lobby,null);assert(refused.frames.some(([,f])=>f.type==='error'&&/Financial Group/.test(f.message)));assert(refused.frames.every(([,f])=>f.type!=='state'));cases++;
  for(const oldHost of [true,false]){const mixed=peers(transport,9,oldHost,!oldHost,old);await lobby(mixed);await start(mixed);await turn(mixed,transport);assert.equal(mixed.host.state().game.version,'9.8');assert.equal(mixed.guest.state().view.me.agency.professionals,undefined);cases++;}
  console.log('PASS '+transport+' qualification compatibility / recovery');
 }
 console.log(JSON.stringify({suite:'agency-professionals-network',cases,transports:3,scope:'Simulated clients: actual prior Group9 peer, new Group10 authority/readiness/late messages/malformed views/restored handshake/privacy. No physical two-computer acceptance claim.'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
