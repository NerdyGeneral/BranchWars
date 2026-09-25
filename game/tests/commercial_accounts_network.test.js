'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test'),copy=x=>JSON.parse(JSON.stringify(x));
(async()=>{
 for(const transport of ['gh','lan','p2p']){
  for(const support of [0,1]){
   const old=peers(transport,10);old.host.run('p2pConfig.commercialAccountsVersion=1');
   old.guest.c.oldSupport=support;
   old.guest.run(`const original=E.campaignCapabilities;E.campaignCapabilities=()=>{const caps=original();if(oldSupport)caps.commercialAccountsSupported=oldSupport;else delete caps.commercialAccountsSupported;return caps};send(makeFeatureHello())`);await old.drain();
   assert.equal(old.host.state().game,null);assert(old.frames.some(([,f])=>f.type==='error'&&/Business operating accounts/.test(f.message)),'Reject missing support and the old double-reservation client');
  }
  const pair=peers(transport,10);pair.host.run('p2pConfig.commercialAccountsVersion=1');await lobby(pair);await start(pair);
  assert.equal(pair.guest.state().view.version,'9.10');assert.equal(pair.guest.state().view.commercialAccountsVersion,1);
  assert.equal(pair.guest.run('E.campaignCapabilities().commercialAccountsSupported'),2);
  for(let month=0;month<3;month++){
   for(const [seat,p]of [pair.host,pair.guest].entries())p.run(`newDraft(currentView());draft.decision='b';draft.commercialAccountPolicy={target:'company:${seat}',staffQuarters:1};plan=JSON.parse(JSON.stringify(draft));`);
   pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
   assert(!pair.guest.state().view.rival.commercialAccounts);
   const restored=pair.host.run('E.migrateCampaign(JSON.parse(JSON.stringify(game)))');assert.equal(restored.players[0].submitted.commercialAccountPolicy.target,'company:0');
   if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
   assert.equal(pair.host.state().game.cycle,month+2);assert.equal(pair.guest.state().view.cycle,month+2);
   pair.host.run('E.validatePilot(game);E.validateLedger(game)');
   assert(!pair.guest.state().view.lastPlans[pair.guest.state().view.rival.id]?.commercialAccountPolicy);
  }
  assert(pair.host.state().game.players.every(p=>Object.keys(p.commercialAccounts.accounts).length===1),'Each ordinary bank must fund its own account');
  const before=JSON.stringify(pair.host.state().game);
  for(const [,frame]of pair.frames.filter(([i,f])=>i===1&&['plan','gh_plan','gh_reveal'].includes(f.type))){pair.host.c.replay=frame;await pair.host.run('handleMessage(replay)');}await pair.drain();
  assert.equal(JSON.stringify(pair.host.state().game),before,'Stale frames duplicated funding');
  const forged=copy(pair.guest.state().view);forged.commercialAccountMarket.rows[0].balance++;
  pair.guest.c.forged=forged;assert.throws(()=>pair.guest.run('E.validateFinancialGroupView(forged)'));
  pair.host.run(`for(const t of Object.values(game.territories)){t.shares=[95,5];t.exitStreak[1]=5;}E.resolveMarketExits(game);for(const t of Object.values(game.territories))t.exited[1]=true;E.validatePilot(game);syncPeers()`);await pair.drain();
  for(const p of [pair.host,pair.guest])p.run(`newDraft(currentView());draft.decision='b';plan=JSON.parse(JSON.stringify(draft));`);
  pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
  if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
  assert.equal(pair.host.state().game.gameOver,true);assert.equal(pair.host.state().game.endReason,'domination');
  assert.equal(pair.guest.state().view.gameOver,true);assert.equal(pair.guest.state().view.endReason,'domination');
  pair.host.run('E.validatePilot(E.migrateCampaign(JSON.parse(JSON.stringify(game))));E.validateLedger(game)');
  const final=JSON.stringify(pair.host.state().game);
  for(const [,frame]of pair.frames.filter(([i,f])=>i===1&&['plan','gh_plan','gh_reveal'].includes(f.type))){pair.host.c.replay=frame;await pair.host.run('handleMessage(replay)');}await pair.drain();
  assert.equal(JSON.stringify(pair.host.state().game),final,'Post-victory packets changed final account ownership');
  console.log('PASS '+transport+' business accounts: current rules, old-peer refusal, qualification, funded balances, private plans, terminal books/checkpoint and stale frames');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
