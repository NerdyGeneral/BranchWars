'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test'),copy=x=>JSON.parse(JSON.stringify(x));
(async()=>{
 for(const transport of ['gh','lan','p2p']){
  const old=peers(transport,10);old.host.run('Object.assign(p2pConfig,{commercialAccountsVersion:1,facilityExtensionsVersion:1})');
  old.guest.run('const original=E.campaignCapabilities;E.campaignCapabilities=()=>{const caps=original();delete caps.facilityExtensionsSupported;return caps};send(makeFeatureHello())');await old.drain();
  assert(!old.host.state().game);assert(old.frames.some(([,f])=>f.type==='error'&&/office suites/i.test(f.message)));
  const pair=peers(transport,10);pair.host.run('Object.assign(p2pConfig,{commercialAccountsVersion:1,facilityExtensionsVersion:1})');await lobby(pair);await start(pair);
  assert.equal(pair.guest.state().view.version,'9.11');
  for(let month=0;month<3;month++){
   for(const peer of [pair.host,pair.guest])peer.run(`newDraft(currentView());draft.decision='b';draft.commercialAccountPolicy={target:null,staffQuarters:0};draft.facilityExtensionPolicy={start:${month===0?'currentView().me.facilityNetwork.offices[0].id':'null'},cancel:null};plan=JSON.parse(JSON.stringify(draft));`);
   pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
   const half=pair.host.run('E.migrateCampaign(JSON.parse(JSON.stringify(game)))');assert.equal(half.facilityExtensionsVersion,1);
   const expected=copy(half);pair.host.c.expected=expected;pair.host.c.guestPlan=copy(pair.guest.run('plan'));
   pair.host.run('E.submit(expected,1,guestPlan)');
   if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
   const actual=pair.host.state().game;assert.equal(actual.cycle,month+2);pair.host.run('E.validatePilot(game);E.validateLedger(game)');
   pair.host.c.actual=copy(actual);
   assert.deepEqual(copy(pair.host.run('E.migrateCampaign(actual)')),copy(pair.host.run('E.migrateCampaign(expected)')),'Canonical checkpoint settlement must match exactly; exclude only established migration-derived aliases');
   const v=pair.guest.state().view;assert(!v.rival.facilityExtensions);assert(!v.lastPlans?.[v.rival.id]?.facilityExtensionPolicy);
  }
  const g=pair.host.state().game;assert(g.players.every(p=>Object.values(p.facilityExtensions.offices).some(r=>r.readyCycle!==null)));
  const before=JSON.stringify(g);
  for(const [,frame]of pair.frames.filter(([i,f])=>i===1&&['plan','gh_plan','gh_reveal'].includes(f.type))){pair.host.c.replay=frame;await pair.host.run('handleMessage(replay)');}await pair.drain();
  assert.equal(JSON.stringify(pair.host.state().game),before,'Stale frames cannot repeat fit-out payment');
  console.log('PASS '+transport+' office suites: refusal, paid construction, private view, half-ready checkpoint and duplicate frames');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
