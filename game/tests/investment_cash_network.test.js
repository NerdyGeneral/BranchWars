'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test');
const copy=x=>JSON.parse(JSON.stringify(x));
(async()=>{
 for(const [transport,route]of [['gh','affiliated'],['lan','external'],['p2p','moneyMarket']]){
  const pair=peers(transport,10);
  pair.host.run(`Object.assign(p2pConfig,E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,{investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,investmentSweepVersion:1})`);
  await lobby(pair);await start(pair);
  // Transparent fixture capital, posted by an external shareholder; no client
  // money, employees or assets are inserted. All customer books below arise
  // from ordinary simultaneous settlement and actual household savings.
  pair.host.run(`game.players[0].financialGroup.parent=E.GroupAccounting.post(game.players[0].financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:1000000,equity:1000000});E.validatePilot(game);syncPeers()`);await pair.drain();
  let clientId;
  for(let month=1;month<=10;month++){
   const plans=copy(pair.host.run('game.players.map((p,i)=>({...E.chooseBot(game,i),investmentPolicy:E.defaultInvestmentPlan(p)}))'));
   const policy=plans[0].investmentPolicy;
   if(month<=4)policy.pursue=true;
   if(month===1)Object.assign(policy.institution,{launch:true,capital:700000,roles:{adviser:1,broker:0,principal:0,operations:1}});
   if(month===5){
    clientId=pair.host.run('game.investmentEconomy.world.clients.find(c=>c.owner===game.players[0].id&&game.investmentEconomy.links.accounts.some(a=>a.clientId===c.id&&a.bankId===game.players[0].id)).id');
    policy.funding=[{clientId,amount:2000,destination:'cash'}];policy.inventorySale=10000;
   }
   if(month===6)policy.cashOrders=[{clientId,mode:route,buffer:100}];
   if(month===7)policy.institution.provider='harbor';
   // Both comparison paths cross the explicit save boundary. Migration stamps
   // the supported ledger marker; do not confuse that with a network mutation.
   pair.host.c.instructions=copy(plans);pair.host.run('expected=E.migrateCampaign(JSON.parse(JSON.stringify(game)));E.submit(expected,0,instructions[0]);E.submit(expected,1,instructions[1]);E.submit(game,0,instructions[0]);game=E.migrateCampaign(JSON.parse(JSON.stringify(game)));syncPeers()');await pair.drain();
   assert.equal(pair.guest.state().view.rival.investmentSnapshot,undefined);
   pair.guest.c.plan=copy(plans[1]);
   if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
   assert.deepEqual(copy(pair.host.state().game),copy(pair.host.run('expected')),transport+' month '+month+' disagreed with canonical settlement');
   assert.equal(pair.guest.state().view.cycle,month+1);
   pair.host.run('E.validatePilot(game);E.validateLedger(game);E.validateFinancialGroupView(E.publicState(game,0));E.validateFinancialGroupView(E.publicState(game,1))');
   if(month===5)assert.equal(pair.host.state().game.players[0].investmentReport.transfers[0].paid,2000);
   if(month>=6){
    const g=pair.host.state().game,w=g.investmentEconomy.world,a=w.cashRoutes.accounts.find(a=>a.clientId===clientId);
    assert.equal(a.mode,route);assert(route==='moneyMarket'?a.shares>0:a.deposit>0);
    assert.equal(w.clients.find(c=>c.id===clientId).owner,g.players[0].id);
    assert(g.players[0].investmentReport.transfers.length===0,'A replay cannot re-fund the customer');
   }
   if(month===7)assert(pair.host.state().game.players[0].investmentBusiness.migration);
   if(month===9){
    assert.equal(pair.host.state().game.players[0].investmentBusiness.migration,null);
    assert.equal(pair.host.state().game.investmentEconomy.world.clients.find(c=>c.id===clientId).custodian,'atlas','Finishing implementation uses the last work slot; custody transfer requires another month');
   }
   const before=JSON.stringify(pair.host.state().game);
   for(const [,frame]of pair.frames.filter(([seat,f])=>seat===1&&['plan','gh_plan','gh_reveal'].includes(f.type))){pair.host.c.duplicate=frame;await pair.host.run('handleMessage(duplicate)');}await pair.drain();
   assert.equal(JSON.stringify(pair.host.state().game),before,'Duplicate/stale messages altered funded accounts');
  }
  const g=pair.host.state().game;
  assert.equal(g.investmentEconomy.world.clients.find(c=>c.id===clientId).custodian,'harbor');
  assert.equal(g.players[0].investmentBusiness.migration,null);
  console.log('PASS '+transport+' '+route+': ten real months, funded account, provider migration, half-ready recovery, canonical settlement and duplicate/privacy protection');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
