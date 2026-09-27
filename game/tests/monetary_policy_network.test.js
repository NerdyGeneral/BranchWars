'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test'),copy=x=>JSON.parse(JSON.stringify(x));
function select(h){h.run(`{const control=document.querySelector('#lobbyFeature-facilityExtensionsVersion');control._editionRequest='expanded';control.checked=true;document.querySelector('#lobbyFeatureOptions').listeners.change({target:control});}confirmFeatureSelection();applyLobbySettings();`);}
(async()=>{for(const transport of ['gh','lan','p2p']){
 const limited=peers(transport,10);limited.guest.run('const priorCaps=E.campaignCapabilities;E.campaignCapabilities=()=>{const caps=priorCaps();delete caps.monetaryPolicySupported;return caps;}');
 await lobby(limited);const before=copy(limited.guest.state().lobby);select(limited.host);await assert.rejects(limited.drain(),/Federal Funds.*updated game/);assert.deepEqual(copy(limited.guest.state().lobby),before);assert(!limited.host.run('lobbyCompatibility().compatible'));
 const pair=peers(transport,10);await lobby(pair);select(pair.host);await pair.drain();await start(pair);
 assert.equal(pair.host.state().game.version,'9.39');assert.equal(pair.host.state().game.expandedBusinessVersion,1);assert.equal(pair.guest.state().view.expandedBusinessVersion,1);assert.equal(pair.guest.state().view.monetaryPolicyVersion,1);
 for(let month=1;month<=2;month++){
  const plans=copy(pair.host.run('game.players.map((p,i)=>E.chooseBot(game,i))'));plans[0].treasuryPolicy='fixed';plans[1].treasuryPolicy='liquid';plans[0].announcement={audience:'public',text:'Rate this bank.'};
  pair.host.c.plan=plans[0];pair.guest.c.plan=plans[1];pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
  assert.equal(pair.guest.state().view.rival.treasury,undefined);assert.equal(pair.guest.state().view.rival.pendingTreasuryPolicy,undefined);assert.equal(pair.guest.state().view.monetaryPolicy.rngState,undefined);
  pair.host.run('game=E.migrateCampaign(JSON.parse(JSON.stringify(game)));syncPeers()');await pair.drain();
  if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
  assert.equal(pair.host.state().game.cycle,month+1);assert.equal(pair.guest.state().view.me.treasury.policy,'liquid');
  const view=pair.guest.state().view;assert.equal(view.lastPlans[view.rival.id].treasuryPolicy,undefined);pair.guest.run('E.validateIncomeHistoryView(view)');
 }
 assert.match(pair.guest.state().view.resolution[0],/Rate this bank/);assert.match(pair.guest.state().view.resolution[1],/FEDERAL FUNDS/);
 const state=JSON.stringify(pair.host.state().game);pair.host.run('resetFeaturePeer();challengePeerFeatures()');await pair.drain();assert.equal(JSON.stringify(pair.host.state().game),state);
 const lastPlanFrame=pair.frames.filter(([seat,m])=>seat===1&&['plan','plan_commit','plan_reveal'].includes(m.type)).at(-1);
 if(lastPlanFrame){pair.host.c.duplicate=copy(lastPlanFrame[1]);await pair.host.run('handleMessage(duplicate)');await pair.drain();assert.equal(JSON.stringify(pair.host.state().game),state);}
 console.log('PASS '+transport+' Fed handshake, old-peer refusal, private policies/RNG, half-ready recovery, two turns, rehandshake and duplicate fence');
}})().catch(e=>{console.error(e);process.exitCode=1;});
