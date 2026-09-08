'use strict';
const assert=require('node:assert/strict');
const {harness}=require('./github_resilience.test.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function peers(transport='gh',preview=false){
 const host=harness('host'),guest=harness('guest'),queue=[];
 for(const [i,p] of [host,guest].entries()){
  p.c.enqueue=message=>queue.push([i,copy(message)]);
  p.run("game=null;view=null;ghFlush=()=>{};send=m=>enqueue(m);p2pConfig={lobbyRequired:true,name:'Host Bank',guestName:'Guest Bank',color:'#2878e0',scope:'national',scenario:'balanced'}");
  if(transport==='lan')p.run("gh.active=false;lan={...emptyLan(),active:true,room:'ABC123'}");
  if(transport==='p2p')p.run("gh.active=false;lan.active=false");
 }
 if(preview)host.run('Object.assign(p2pConfig,{campaignRulesVersion:1,serviceExpansionVersion:1,managementVersion:2,customerDemandVersion:2})');
 return {host,guest,queue,async drain(){
  for(let n=0;queue.length;n++){
   assert(n<40,'handshake must not loop indefinitely');
   const [sender,message]=queue.shift(),receiver=sender?host:guest;
   receiver.c.frame=message;await receiver.run('handleMessage(frame)');
  }
 }};
}
function click(peer,id){const element=peer.c.document.querySelector(id);assert(!element.disabled,id+' is enabled');element.listeners.click()}
async function main(){
 for(const transport of ['gh','lan','p2p']){
  const pair=peers(transport),{host,guest}=pair;
  await guest.run("handleMessage({type:'hello_request'})");await pair.drain();
  assert.equal(host.state().game,null,'hello opens a lobby, not a campaign');
  assert.equal(guest.state().view,null);
  assert.deepEqual(copy(host.state().lobby),copy(guest.state().lobby));
  assert.notEqual(host.state().lobby.players[0].color,host.state().lobby.players[1].color,'two default blue picks are separated');
  assert(host.elements.get('#lobbyBanks').innerHTML.includes('HOST · INSTITUTION 1'));
  assert(guest.elements.get('#lobbyBanks').innerHTML.includes('GUEST · INSTITUTION 2 · YOU'));
  assert(host.elements.get('#lobbyStart').disabled);
  assert(guest.elements.get('#lobbyScope').disabled);
  host.run('startLobbyCampaign()');assert.equal(host.state().game,null);
  click(guest,'#lobbyReady');assert(guest.state().lobbyPending);
  assert(guest.elements.get('#lobbyReady').disabled,'one in-flight update at a time');
  await pair.drain();assert(host.state().lobby.players[1].ready);
  assert(guest.elements.get('#lobbyName').disabled,'unconfirm before editing identity');
  // Duplicate hello cannot replace a confirmed identity or reset readiness.
  const initial=copy(host.state().lobby);
  await guest.run("handleMessage({type:'hello_request'})");await pair.drain();
  assert.deepEqual(copy(host.state().lobby),initial);
  host.elements.get('#lobbyName').value='Cedar & Co';
  host.elements.get('#lobbyName').listeners.input();click(host,'#lobbySave');await pair.drain();
  assert.equal(host.state().lobby.revision,2);
  assert(host.state().lobby.players.every(p=>!p.ready),'identity edit clears both confirmations');
  host.c.stale={type:'lobby_update',id:'stale',revision:1,player:copy(initial.players[1]),ready:true};
  await host.run('handleMessage(stale)');await pair.drain();
  assert(!host.state().lobby.players[1].ready,'stale ready cannot approve a different setup');
  assert(guest.elements.get('#lobbyError').textContent.includes('Setup changed'));
  // A peer-supplied seat or settings field cannot modify the host seat or rules.
  host.c.forged={type:'lobby_update',id:'seat',revision:2,seat:0,settings:{scenario:'growth'},player:{name:'Guest Bank',color:'#8642bc'},ready:true};
  await host.run('handleMessage(forged)');await pair.drain();
  assert.equal(host.state().lobby.players[0].name,'Cedar & Co');assert.equal(host.state().lobby.settings.scenario,'balanced');
  assert(!host.state().lobby.players[1].ready,'editing and confirming must be separate');
  host.elements.get('#lobbyScenario').value='rate';host.elements.get('#lobbyScenario').listeners.change();
  assert(host.elements.get('#lobbyReady').disabled,'unapplied host settings cannot be confirmed');
  click(host,'#lobbySettings');await pair.drain();
  assert.equal(guest.state().lobby.settings.scenario,'rate');
  // Too-similar colors and unsafe color strings cannot become a shared identity.
  guest.elements.get('#lobbyColor').value=host.state().lobby.players[0].color;
  click(guest,'#lobbySave');assert(guest.elements.get('#lobbyError').textContent.includes('too similar'));
  guest.elements.get('#lobbyColor').value='#8642bc';
  host.c.invalid={type:'lobby_update',id:'invalid',revision:host.state().lobby.revision,player:{name:'Bad',color:'url(x)'},ready:true};
  const validColor=host.state().lobby.players[1].color;
  await host.run('handleMessage(invalid)');await pair.drain();
  assert.equal(host.state().lobby.players[1].color,validColor);
  click(host,'#lobbyReady');await pair.drain();click(guest,'#lobbyReady');await pair.drain();
  assert(host.state().lobby.players.every(p=>p.ready));
  assert(!host.elements.get('#lobbyStart').disabled);
  const confirmed=copy(host.state().lobby);
  guest.run('startLobbyCampaign()');assert.equal(guest.state().game,null,'only host starts');
  click(host,'#lobbyStart');await pair.drain();
  assert.equal(host.state().game.cycle,1);assert.equal(guest.state().view.cycle,1);
  assert.equal(host.state().game.scenario,'rate');
  assert.equal(host.state().game.mode,transport==='p2p'?'p2p':'lan');
  assert.deepEqual(copy(host.state().game.players.map(p=>({name:p.name,color:p.color}))),confirmed.players.map(({name,color})=>({name,color})));
  assert.equal(guest.state().view.me.color,confirmed.players[1].color);
  assert.equal(guest.state().view.rival.color,confirmed.players[0].color);
  const game=host.state().game;host.run('startLobbyCampaign()');assert.equal(host.state().game,game,'double start cannot create a second campaign');
  guest.c.late={type:'lobby',lobby:initial};await guest.run('handleMessage(late)');assert.equal(guest.state().view.cycle,1,'late snapshots cannot rewind play');
  // Older compatible peers may still reconnect to an already-created campaign.
  host.c.hello={type:'hello',name:'Do not rename',color:'#ffffff'};
  await host.run('handleMessage(hello)');await pair.drain();
  assert.equal(host.state().game,game);assert.equal(game.players[1].name,confirmed.players[1].name);
 }
 const old=peers();await old.host.run("handleMessage({type:'hello',name:'Old guest',color:'#2878e0'})");
 assert.equal(old.host.state().game,null);assert(old.queue.some(([,m])=>m.code==='lobby_required'));
 const oldHost=peers();oldHost.guest.c.frame={type:'state',state:oldHost.host.run('E.publicState(E.createGame({scope:"town"}),1)')};
 await oldHost.guest.run('handleMessage(frame)');assert.equal(oldHost.guest.state().view,null);assert(oldHost.guest.state().linkText.includes('LOBBY REQUIRED'));
 assert(oldHost.guest.elements.get('#connectHint').textContent.includes('Both players'),'version mismatch remains visible after the next healthy repository poll');
 const preview=peers('gh',true);await preview.guest.run("handleMessage({type:'hello_request'})");await preview.drain();
 assert.equal(preview.guest.state().lobby.settings.customerDemandVersion,2);assert(preview.host.elements.get('#lobbyScope').disabled);
 click(preview.host,'#lobbyReady');await preview.drain();click(preview.guest,'#lobbyReady');await preview.drain();
 preview.host.run('startLobbyCampaign()');await preview.drain();assert.equal(preview.guest.state().view.customerDemandVersion,2);
 // Reload a lobby without starting a campaign or embedding credentials in the checkpoint.
 const savedPair=peers();await savedPair.guest.run("handleMessage({type:'hello_request'})");await savedPair.drain();
 click(savedPair.guest,'#lobbyReady');
 const saved=savedPair.guest.storage.get('branchWarsGhResume');
 assert(saved&&!saved.includes('PRIVATE_TEST_TOKEN'));
 const reload=harness('guest');reload.storage.set('branchWarsGhResume',saved);
 reload.c.document.querySelector('#ghToken').value='PRIVATE_TEST_TOKEN';
 reload.run('gh.active=false;ghPoll=()=>{};ghFlush=()=>{};ghCheckRepo=async()=>{};ghRead=async()=>({missing:true})');
 await reload.run('ghResume()');assert(reload.state().lobby);assert(reload.state().lobbyPending);assert.equal(reload.state().view,null);
 assert.equal(reload.state().gh.sendFailures,0,'idle resume does not invent a send failure');
 // The request is retained and the original acknowledgement unlocks the resumed UI.
 await savedPair.drain();reload.c.frame={type:'lobby',lobby:copy(savedPair.host.state().lobby)};
 await reload.run('handleMessage(frame)');assert.equal(reload.state().lobbyPending,null);assert(reload.state().lobby.players[1].ready);
 // Poll the actual idle path: 200 then repeated 304, then a missing file and recovery.
 const poll=harness();poll.run('ghRead=async()=>packet');poll.c.packet={etag:'one',data:{seq:0,ack:0,messages:[]}};
 const polling=poll.run('ghPoll()');await tick();assert.equal(poll.state().linkCls,'good');
 function advance(){const entry=[...poll.timers.entries()].find(([,t])=>t.ms===5000);assert(entry);poll.timers.delete(entry[0]);entry[1].fn()}
 poll.c.packet={unchanged:true};
 for(let n=0;n<3;n++){advance();await tick();assert.equal(poll.state().linkCls,'good');assert(poll.state().linkText.includes('no new messages'))}
 poll.run("ghPaintHealth('UPDATE STORED')");assert.equal(poll.state().linkCls,'good');
 poll.c.packet={missing:true};advance();await tick();assert.equal(poll.state().linkCls,'warn');
 poll.c.packet={etag:'two',data:{seq:0,ack:0,messages:[]}};advance();await tick();assert.equal(poll.state().linkCls,'good');
 poll.run("gh.sendFailures=1;ghPaintHealth('idle')");assert.equal(poll.state().linkCls,'bad');
 poll.run("gh.sendFailures=0;gh.cooldownUntil=Date.now()+10000;ghPaintHealth('idle')");assert.equal(poll.state().linkCls,'warn');
 poll.run("gh.cooldownUntil=0;gh.paused=true;ghPaintHealth('idle')");assert.equal(poll.state().linkCls,'bad');
 poll.run('gh.active=false');advance();await polling;
 // Compaction keeps the newest acknowledged lobby snapshot, without dropping commands.
 const compact=harness();compact.c.frames=[{seq:1,msg:{type:'lobby'}},{seq:2,msg:{type:'lobby_update'}},{seq:3,msg:{type:'lobby',lobby:{guestAck:'ack'}}}];
 assert.deepEqual(copy(compact.run('ghCompact(frames).map(e=>e.seq)')),[2,3]);
 console.log('Multiplayer lobby/status checks passed: all three transports, identities, readiness, authority, revisions, reconnects, preview rules, reload, idle polling and failure states.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
