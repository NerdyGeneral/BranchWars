'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test');
const copy=x=>JSON.parse(JSON.stringify(x));
function select(h,edition='expanded'){h.c.requestedEdition=edition;h.run(`{const editionInput=document.querySelector('#lobbyFeature-facilityExtensionsVersion');editionInput._editionRequest=requestedEdition;editionInput.checked=requestedEdition==='expanded';document.querySelector('#lobbyFeatureOptions').listeners.change({target:editionInput});}`);}
(async()=>{for(const transport of ['gh','lan','p2p']){
 const limited=peers(transport,10);
 limited.guest.run("const supportedBefore=E.campaignCapabilities;E.campaignCapabilities=()=>{const c=supportedBefore();delete c.companyCreditSupported;return c}");
 await lobby(limited);limited.host.run('editLobbyIdentity(true)');await limited.drain();limited.guest.run('editLobbyIdentity(true)');await limited.drain();
 const priorGuest=copy(limited.guest.state().lobby);assert(limited.host.state().lobby.players.every(p=>p.ready));
 select(limited.host);assert(limited.host.run('confirmFeatureSelection()'));limited.host.run('applyLobbySettings()');
 // The relay helper invokes the validator directly; real transports catch and
 // display this refusal. It must occur before the guest adopts the snapshot.
 await assert.rejects(limited.drain(),/Named-company lending requires the updated game/);
 assert.equal(limited.host.state().lobby.settings.companyCreditVersion,1);assert(limited.host.state().lobby.players.every(p=>!p.ready));
 assert(!limited.host.run('lobbyCompatibility().compatible'));assert.match(limited.host.run('lobbyCompatibility().reason'),/Named-company lending/);
 assert(limited.host.elements.get('#lobbyStart').disabled);assert.deepEqual(copy(limited.guest.state().lobby),priorGuest,'Guest must not adopt unsupported shared rules');
 limited.host.run('editLobbyIdentity(true);startLobbyCampaign()');await limited.drain();assert.equal(limited.host.state().game,null);
 assert(limited.host.state().lobby.players.every(p=>!p.ready),'Old confirmations cannot enable incompatible rules');
 const pair=peers(transport,10);await lobby(pair);const original=copy(pair.host.state().lobby);
 select(pair.guest);assert.equal(pair.guest.run('featureSelectionPending()'),false);assert.deepEqual(copy(pair.guest.state().lobby),original);
 pair.host.run('editLobbyIdentity(true)');await pair.drain();pair.guest.run('editLobbyIdentity(true)');await pair.drain();
 const ready=copy(pair.host.state().lobby);select(pair.host);assert(pair.host.run('featureSelectionPending()'));assert(pair.host.elements.get('#lobbyStart').disabled);pair.host.run('cancelFeatureSelectionConfirmation()');assert.deepEqual(copy(pair.host.state().lobby),ready);
 select(pair.host);assert(pair.host.run('confirmFeatureSelection()'));assert(pair.host.run('lobbySettingsDirty'));assert.deepEqual(copy(pair.host.state().lobby),ready);assert.equal(pair.guest.state().lobby.settings.investmentNotesVersion,undefined);
 pair.host.run('applyLobbySettings()');await pair.drain();const updated=copy(pair.host.state().lobby);assert.equal(updated.settings.investmentNotesVersion,1);assert.equal(updated.revision,ready.revision+1);assert(updated.players.every(p=>!p.ready));assert.deepEqual(copy(pair.guest.state().lobby),updated);
 pair.host.c.stale={type:'lobby_update',id:'old-ready',revision:ready.revision,player:ready.players[1],ready:true};pair.host.run('handleMessage(stale)');await pair.drain();assert(!pair.host.state().lobby.players[1].ready);
 await start(pair);assert.equal(pair.host.state().game.version,'9.41');assert.equal(pair.guest.state().view.expandedBusinessVersion,1);assert.equal(pair.guest.state().view.me.expandedBusiness.digital.route,'none');assert.equal(pair.guest.state().view.rival.expandedBusiness,undefined);assert.equal(pair.guest.state().view.bankRivalryVersion,1);assert.equal(pair.guest.state().view.balanceSheetLendingVersion,1);assert.equal(pair.guest.state().view.me.balanceSheetLendingVersion,1);assert.equal(pair.guest.state().view.incomeHistoryVersion,1);assert.equal(pair.guest.state().view.investmentNotesVersion,1);assert.equal(pair.guest.state().view.sharedPremisesVersion,1);assert.equal(pair.guest.state().view.companyCreditVersion,1);assert.equal(pair.guest.state().view.me.companyCredit.claims.length,0);assert.equal(pair.guest.state().view.rival.companyCredit,undefined);assert.equal(pair.guest.state().view.rival.incomeHistory,undefined);
 const plans=copy(pair.host.run('game.players.map((p,i)=>E.chooseBot(game,i))'));pair.host.c.plan=plans[0];pair.guest.c.plan=plans[1];pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
 if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
 assert.equal(pair.host.state().game.cycle,2);assert.equal(pair.guest.state().view.rival.investmentBusiness,undefined);pair.host.run('E.validatePilot(E.migrateCampaign(JSON.parse(JSON.stringify(game))))');
 console.log('PASS '+transport+' Expanded host draft, guest authority, cancellation, atomic apply, readiness reset, stale ready, start and settlement');
 const core=peers(transport,10);await lobby(core);
 core.host.run('editLobbyIdentity(true)');await core.drain();core.guest.run('editLobbyIdentity(true)');await core.drain();
 const coreBefore=copy(core.host.state().lobby);
 select(core.host,'core');assert(core.host.run('featureSelectionPending()'));
 core.host.run('cancelFeatureSelectionConfirmation()');assert.deepEqual(copy(core.host.state().lobby),coreBefore);
 select(core.host,'core');assert(core.host.run('confirmFeatureSelection()'));core.host.run('applyLobbySettings()');await core.drain();
 assert.equal(core.host.state().lobby.revision,coreBefore.revision+1);assert(core.host.state().lobby.players.every(p=>!p.ready));
 await start(core);assert.equal(core.host.state().game.version,'8.20');assert.equal(core.guest.state().view.bankEconomicsVersion,2);
 assert(core.guest.state().view.me.accounting);assert.equal(core.guest.state().view.rival.accounting,undefined);
 const cp=copy(core.host.run('game.players.map((p,i)=>E.chooseBot(game,i))'));core.host.c.plan=cp[0];core.guest.c.plan=cp[1];
 core.host.run('E.submit(game,0,plan);syncPeers()');await core.drain();
 if(transport==='gh')await core.guest.run('ghCommitPlan(plan)');else core.guest.run("send(turnMessage('plan',{plan}))");await core.drain();
 assert.equal(core.host.state().game.cycle,2);core.host.run('E.validatePilot(E.migrateCampaign(JSON.parse(JSON.stringify(game))))');
 console.log('PASS '+transport+' current Core choice, cancellation, atomic apply, readiness reset, private accounts and settlement');
}})().catch(e=>{console.error(e);process.exitCode=1;});
