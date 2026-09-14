'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test'),copy=x=>JSON.parse(JSON.stringify(x));
// A transparent external-shareholder fixture supplies a mature bank's capital
// envelope. It is not player income, AI behavior or starting-bank affordability.
const fixture=`for(const p of game.players){
 p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.ownerContribution','external-shareholder',{cash:3000000,equity:3000000});
 const moved=E.GroupAccounting.capitalizeBank(p.accounting,p.financialGroup.parent,3000000);
 p.accounting=moved.bank;p.financialGroup.parent=moved.parent;p.financialGroup.investmentBasis.bank+=3000000;
 p.stats.cash=p.accounting.accounts.cash;p.stats.capital=p.accounting.accounts.equity;
} E.validatePilot(game);`;
(async()=>{
 for(const transport of ['gh','lan','p2p']){
  const outdated=peers(transport,10);outdated.guest.run(`const originalCapabilities=E.campaignCapabilities;E.campaignCapabilities=()=>{const caps=originalCapabilities();delete caps.projectLocationsSupported;return caps;};send(makeFeatureHello())`);await outdated.drain();
  assert.equal(outdated.host.state().game,null);assert(outdated.frames.some(([,f])=>f.type==='error'&&/Independent construction/.test(f.message)),'Same Group10 ceiling alone must not authorize an older location-blind client');
  const pair=peers(transport,10);await lobby(pair);await start(pair);
  pair.host.run(fixture);pair.host.run('syncPeers()');await pair.drain();
  pair.host.run(`seat=0;newDraft(currentView());draft.decision='b';draft.newProjects=['branchFinancialCenter','branchCommercial'];draft.newProject=draft.newProjects[0];
   locations=Object.keys(game.territories);draft.projectTargets={branchFinancialCenter:locations[0],branchCommercial:locations[1]};
   plan=JSON.parse(JSON.stringify(draft));quote=E.projectPlanStatus(game.players[0],plan,game);`);
  assert(pair.host.run('quote.eligible'),pair.host.run('quote.reason'));
  const plan=copy(pair.host.run('plan')),g=copy(pair.host.state().game);
  pair.host.run('E.submit(game,0,plan)');
  const restored=pair.host.run('E.migrateCampaign(JSON.parse(JSON.stringify(game)))');assert.deepEqual(copy(restored.players[0].submitted.projectTargets),plan.projectTargets);
  const saved=JSON.stringify(pair.host.state().game);const bad=copy(restored);bad.players[0].submitted.projectTargets.branchCommercial='foreign-market';pair.host.c.bad=bad;assert.throws(()=>pair.host.run('E.migrateCampaign(bad)'));assert.equal(JSON.stringify(pair.host.state().game),saved);
  pair.host.run('syncPeers()');await pair.drain();assert.equal(pair.guest.state().view.rival.projects,undefined);
  pair.guest.run(`seat=1;newDraft(currentView());draft.decision='b';plan=JSON.parse(JSON.stringify(draft));`);
  if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
  assert.equal(pair.host.state().game.cycle,2);assert.equal(pair.guest.state().view.cycle,2);
  const player=pair.host.state().game.players[0];assert.equal(player.focus,g.players[0].focus);
  for(const [key,target]of Object.entries(plan.projectTargets))assert.equal(player.projects.find(p=>p.key===key)?.target,target,key+' started in wrong market');
  const entries=player.accounting.journal.filter(e=>e.source==='capitalisePremises');assert.equal(entries.length,2,'One capitalized cost per construction order');assert.equal(entries.reduce((n,e)=>n-e.changes.cash,0),pair.host.run('quote.quote.projects'));
  pair.host.run('E.validatePilot(game);E.validateLedger(game)');
  const final=JSON.stringify(pair.host.state().game);
  for(const [,frame]of pair.frames.filter(([i,f])=>i===1&&['plan','gh_plan','gh_reveal'].includes(f.type))){pair.host.c.duplicate=frame;await pair.host.run('handleMessage(duplicate)');}await pair.drain();assert.equal(JSON.stringify(pair.host.state().game),final,'Duplicate instructions charged again');
  console.log('PASS '+transport+' multi-market construction: submission, checkpoint, local pricing, paired costs, stale messages and owner privacy');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
