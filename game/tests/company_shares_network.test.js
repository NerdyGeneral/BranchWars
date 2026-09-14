'use strict';
process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test'),copy=x=>JSON.parse(JSON.stringify(x));
async function expanded(pair){await lobby(pair);pair.host.run(`{const input=document.querySelector('#lobbyFeature-facilityExtensionsVersion');input._editionRequest='expanded';input.checked=true;document.querySelector('#lobbyFeatureOptions').listeners.change({target:input});confirmFeatureSelection();applyLobbySettings();}`);await pair.drain();}
(async()=>{for(const transport of ['gh','lan','p2p']){
 const old=peers(transport,10);old.host.run("Object.assign(p2pConfig,E.previewCampaignEdition({},'expanded').options)");
 old.guest.run(`const originalCapabilities=E.campaignCapabilities;E.campaignCapabilities=()=>{const caps=originalCapabilities();delete caps.companySharesSupported;return caps;};send(makeFeatureHello())`);await old.drain();
 assert.equal(old.host.state().game,null);assert(old.frames.some(([,f])=>f.type==='error'&&/Company share ownership/i.test(f.message)),'Older peer must be refused for selected ownership rules');
 const pair=peers(transport,10);await expanded(pair);await start(pair);
 // Declared mature-parent capital fixture, not new-game or AI balance evidence.
 pair.host.run(`for(const p of game.players)p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:200000,equity:200000});syncPeers();`);await pair.drain();
 const plans=copy(pair.host.run('game.players.map((p,i)=>E.chooseBot(game,i))'));
 for(const p of plans)p.companyShareOrders=[{issuer:'company:0',side:'buy',shares:1500,limitCents:1500}];
 pair.host.c.plan=plans[0];pair.guest.c.plan=plans[1];pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
 assert.equal(pair.guest.state().view.rival.companyShares,undefined);assert(!JSON.stringify(pair.guest.state().view.rival).includes('companyShareOrders'));
 pair.host.run('game=E.migrateCampaign(JSON.parse(JSON.stringify(game)));syncPeers()');await pair.drain();
 if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
 const g=pair.host.state().game;assert.equal(g.cycle,2,JSON.stringify(pair.frames.filter(([,f])=>f.type==='error')));assert.deepEqual(copy(g.players.map(p=>p.companyShares.positions['company:0'].shares)),[1000,1000]);
 assert.equal(pair.guest.state().view.companySharesVersion,1);assert(pair.guest.state().view.companyShareSnapshot.receipts.every(r=>r.holder===g.players[1].id));
 pair.host.run('E.validatePilot(E.migrateCampaign(JSON.parse(JSON.stringify(game))));E.validateLedger(game)');
 const before=JSON.stringify(pair.host.state().game);
 for(const [,frame]of pair.frames.filter(([i,f])=>i===1&&['plan','gh_plan','gh_reveal'].includes(f.type))){pair.host.c.duplicate=frame;await pair.host.run('handleMessage(duplicate)');}await pair.drain();assert.equal(JSON.stringify(pair.host.state().game),before);
 console.log('PASS '+transport+' share ownership: old-peer refusal, simultaneous partial fills, checkpoint recovery, private orders and duplicate protection');
}})().catch(error=>{console.error(error);process.exitCode=1;});
