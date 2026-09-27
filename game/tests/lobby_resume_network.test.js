'use strict';
// rc5 playtest report: a save could not be loaded or hosted in Repository Link
// multiplayer. The lobby can now resume a save; this defends what both players
// agree to when it does, over every transport, in Core and Expanded.
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test');
const copy=x=>JSON.parse(JSON.stringify(x));
function select(h,edition){h.c.requestedEdition=edition;h.run(`{const editionInput=document.querySelector('#lobbyFeature-facilityExtensionsVersion');editionInput._editionRequest=requestedEdition;editionInput.checked=requestedEdition==='expanded';document.querySelector('#lobbyFeatureOptions').listeners.change({target:editionInput});}`);}
async function room(transport,edition,names){
 const pair=peers(transport,10);
 // The shared harness stubs classList as a no-op; give the two resume controls a
 // real one so their visibility can be asserted.
 for(const peer of [pair.host,pair.guest])peer.run(`for(const id of ['#lobbyResumeLabel','#lobbyResumeClear']){const el=document.querySelector(id),set=new Set(['hidden']);el.classList={add:c=>set.add(c),remove:c=>set.delete(c),contains:c=>set.has(c),toggle:(c,on=!set.has(c))=>(on?set.add(c):set.delete(c),on)}}`);
 if(names){pair.host.run(`p2pConfig.name=${JSON.stringify(names[0])}`);pair.guest.run(`p2pConfig.guestName=${JSON.stringify(names[1])}`);}
 await lobby(pair);select(pair.host,edition);assert(pair.host.run('confirmFeatureSelection()'));pair.host.run('applyLobbySettings()');await pair.drain();
 return pair;
}
async function month(pair,transport){
 const {host,guest}=pair,plans=copy(host.run('game.players.map((p,i)=>E.chooseBot(game,i))'));host.c.plan=plans[0];guest.c.plan=plans[1];
 host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
 if(transport==='gh')await guest.run('ghCommitPlan(plan)');else guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
}
async function ready(pair){pair.host.run('editLobbyIdentity(true)');await pair.drain();pair.guest.run('editLobbyIdentity(true)');await pair.drain();}
// The browser hands the lobby a File; the harness reads the same text synchronously.
async function stage(pair,text){pair.host.c.saveText=text;pair.host.run("FileReader=class{readAsText(f){this.result=f.text;this.onload()}};stageLobbyResume({text:saveText})");await pair.drain();}
const text=peer=>peer.elements.get('#lobbyNote').textContent;

(async()=>{for(const [transport,edition] of [['gh','core'],['gh','expanded'],['lan','core'],['p2p','core']]){
 const first=await room(transport,edition);await start(first);
 for(let i=0;i<3;i++)await month(first,transport);
 const saved=copy(first.host.state().game),save=JSON.stringify(saved),banks=saved.players.map(p=>p.name);
 assert.equal(saved.cycle,4);

 // Staging after both players confirmed a new campaign is a shared change: the
 // guest sees the save and which bank each seat plays, and both confirm again.
 const pair=await room(transport,edition==='expanded'?'core':'expanded');await ready(pair);
 const before=pair.host.state().lobby.revision;
 await stage(pair,save);
 for(const peer of [pair.host,pair.guest]){
  const l=peer.state().lobby;assert.ok(l.resume,transport+' '+edition+': the staged save must be announced to both players');
  assert.deepEqual(copy(l.resume),{cycle:4,version:saved.version,rules:copy(first.host.run("E.campaignRules(game,{context:'game'}).options")),banks},transport+' '+edition+' resume rules reach both players independently of the new-game settings');
  assert.equal(l.revision,before+1);assert(l.players.every(p=>!p.ready),'staging a save withdraws earlier confirmations');
  assert.match(text(peer),new RegExp('Resuming a saved '+saved.version.replace('.','\\.')+' campaign at month 4'));
  assert.match(peer.elements.get('#lobbyBanks').innerHTML,new RegExp('Plays saved bank <strong>'+banks[0]));
 }
 assert(pair.host.elements.get('#lobbyStart').disabled,'the host cannot start before the guest confirms the save');
 assert(pair.guest.elements.get('#lobbyResumeLabel').classList.contains('hidden'),'only the host loads saves');
 assert(!pair.host.elements.get('#lobbyResumeClear').classList.contains('hidden'));
 await ready(pair);pair.host.run('startLobbyCampaign()');await pair.drain();
 const resumed=pair.host.state().game;
 assert.equal(resumed.cycle,4);assert.equal(pair.guest.state().view.cycle,4);assert.equal(resumed.version,saved.version);
 assert.deepEqual(copy(resumed.players.map(p=>p.name)),banks,'saved banks keep their names');
 assert.deepEqual(copy(resumed.players.map(p=>p.stats)),copy(saved.players.map(p=>p.stats)),'the saved banks are unchanged');
 await month(pair,transport);
 assert.equal(pair.host.state().game.cycle,5);assert.equal(pair.guest.state().view.cycle,5);
 pair.host.run('E.validatePilot(E.migrateCampaign(JSON.parse(JSON.stringify(game))));E.validateLedger(game)');

 if(transport==='gh'){
  // The original guest hosting would take the other bank: say so, and never
  // relabel the saved banks after whoever hosts today.
  const swapped=await room(transport,edition,[banks[1],banks[0]]);await stage(swapped,save);
  for(const peer of [swapped.host,swapped.guest])assert.match(text(peer),/banks look swapped/);
  await ready(swapped);swapped.host.run('startLobbyCampaign()');await swapped.drain();
  assert.deepEqual(copy(swapped.host.state().game.players.map(p=>p.name)),banks);

  // Withdrawing the save is shared too, and the lobby then starts a new campaign.
  const withdrawn=await room(transport,edition);await stage(withdrawn,save);await ready(withdrawn);
  withdrawn.host.run("document.querySelector('#lobbyResumeClear').listeners.click()");await withdrawn.drain();
  for(const peer of [withdrawn.host,withdrawn.guest]){assert.equal(peer.state().lobby.resume,undefined);assert(peer.state().lobby.players.every(p=>!p.ready))}
  await ready(withdrawn);withdrawn.host.run('startLobbyCampaign()');await withdrawn.drain();
  assert.equal(withdrawn.host.state().game.cycle,1,'a withdrawn save starts a new campaign');

  // A host that no longer holds the announced save (a reload) refuses to start
  // something else and withdraws the announcement.
  const lost=await room(transport,edition);await stage(lost,save);await ready(lost);
  lost.host.run('lobbyResumeCampaign=null;startLobbyCampaign()');await lost.drain();
  assert.equal(lost.host.state().game,null);assert.equal(lost.guest.state().lobby.resume,undefined);
  assert.match(lost.host.elements.get('#lobbyError').textContent,/no longer loaded/);

  // A malformed announcement is refused before the guest adopts it.
  const bad=await room(transport,edition);
  bad.guest.c.frame={type:'lobby',lobby:{...copy(bad.host.state().lobby),revision:bad.host.state().lobby.revision+1,resume:{cycle:0,version:'8.20',banks:['a']}}};
  await assert.rejects(async()=>bad.guest.run('handleMessage(frame)'),/Invalid lobby snapshot/);
  assert.equal(bad.guest.state().lobby.resume,undefined);
 }
 console.log('PASS '+transport+' '+edition+' '+saved.version+': shared save announcement, readiness reset, saved seats and names kept, resume and settlement'+(transport==='gh'?', swap warning, withdrawal, lost-save refusal and malformed announcement':''));
}})().catch(e=>{console.error(e);process.exitCode=1;});
