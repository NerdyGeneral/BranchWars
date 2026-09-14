'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test');
const copy=x=>JSON.parse(JSON.stringify(x));
function select(h){h.run(`{const editionInput=document.querySelector('#lobbyFeature-facilityExtensionsVersion');editionInput._editionRequest='expanded';editionInput.checked=true;document.querySelector('#lobbyFeatureOptions').listeners.change({target:editionInput});}`);}
(async()=>{for(const transport of ['gh','lan','p2p']){
 const pair=peers(transport,10);await lobby(pair);const original=copy(pair.host.state().lobby);
 select(pair.guest);assert.equal(pair.guest.run('featureSelectionPending()'),false);assert.deepEqual(copy(pair.guest.state().lobby),original);
 pair.host.run('editLobbyIdentity(true)');await pair.drain();pair.guest.run('editLobbyIdentity(true)');await pair.drain();
 const ready=copy(pair.host.state().lobby);select(pair.host);assert(pair.host.run('featureSelectionPending()'));assert(pair.host.elements.get('#lobbyStart').disabled);pair.host.run('cancelFeatureSelectionConfirmation()');assert.deepEqual(copy(pair.host.state().lobby),ready);
 select(pair.host);assert(pair.host.run('confirmFeatureSelection()'));assert(pair.host.run('lobbySettingsDirty'));assert.deepEqual(copy(pair.host.state().lobby),ready);assert.equal(pair.guest.state().lobby.settings.investmentNotesVersion,undefined);
 pair.host.run('applyLobbySettings()');await pair.drain();const updated=copy(pair.host.state().lobby);assert.equal(updated.settings.investmentNotesVersion,1);assert.equal(updated.revision,ready.revision+1);assert(updated.players.every(p=>!p.ready));assert.deepEqual(copy(pair.guest.state().lobby),updated);
 pair.host.c.stale={type:'lobby_update',id:'old-ready',revision:ready.revision,player:ready.players[1],ready:true};pair.host.run('handleMessage(stale)');await pair.drain();assert(!pair.host.state().lobby.players[1].ready);
 await start(pair);assert.equal(pair.host.state().game.version,'9.27');assert.equal(pair.guest.state().view.investmentNotesVersion,1);assert.equal(pair.guest.state().view.sharedPremisesVersion,1);
 const plans=copy(pair.host.run('game.players.map((p,i)=>E.chooseBot(game,i))'));pair.host.c.plan=plans[0];pair.guest.c.plan=plans[1];pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
 if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
 assert.equal(pair.host.state().game.cycle,2);assert.equal(pair.guest.state().view.rival.investmentBusiness,undefined);pair.host.run('E.validatePilot(E.migrateCampaign(JSON.parse(JSON.stringify(game))))');
 console.log('PASS '+transport+' Expanded host draft, guest authority, cancellation, atomic apply, readiness reset, stale ready, start and settlement');
}})().catch(e=>{console.error(e);process.exitCode=1;});
