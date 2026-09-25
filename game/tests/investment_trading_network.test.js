'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test');
const copy=x=>JSON.parse(JSON.stringify(x));
const withNotes=process.argv.includes('--notes');
(async()=>{
 for(const transport of ['gh','lan','p2p']){
  const pair=peers(transport,10);
  pair.host.run(`Object.assign(p2pConfig,E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,{investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,investmentSweepVersion:1,investmentChoiceVersion:1,investmentIncomeVersion:1,investmentSuitabilityVersion:1,investmentTradingVersion:1})`);
  if(withNotes)pair.host.run('p2pConfig.investmentNotesVersion=1');
  await lobby(pair);await start(pair);
  // Explicit external fixture capital, not deposits or manufactured clients.
  // Authorizations, customers, funding and holdings arise through real turns.
  pair.host.run(`for(const p of game.players)p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:1000000,equity:1000000});E.validatePilot(game);syncPeers()`);await pair.drain();
  const developmentMarkets=copy(pair.host.run('game.players.map(p=>p.focus)'));
  let clients,bankCashNet;
  for(let month=1;month<=7;month++){
   const plans=copy(pair.host.run('game.players.map((p,i)=>({...E.chooseBot(game,i),investmentPolicy:E.defaultInvestmentPlan(p)}))'));
   if(month===5)clients=copy(pair.host.run('game.players.map(p=>game.investmentEconomy.world.clients.find(c=>c.owner===p.id&&game.investmentEconomy.links.accounts.some(a=>a.clientId===c.id&&a.bankId===p.id))?.id)'));
   for(const [i,plan]of plans.entries()){
    const policy=plan.investmentPolicy;
    // Hold the independently chosen service market while the bank AI changes
    // its ordinary monthly focus. This is a portfolio-transport fixture, not
    // a claim that either bank is guaranteed to win a contested acquisition.
    policy.market=developmentMarkets[i];
    if(month<=4)policy.pursue=true;
    if(month===1)Object.assign(policy.institution,{launch:true,capital:700000,feeBp:60,roles:{adviser:1,broker:0,principal:0,operations:1}});
    if(month===5){assert(clients[i],transport+' needs a genuinely acquired client for bank '+i);policy.funding=[{clientId:clients[i],amount:2000,destination:'cash'}];policy.inventorySale=10000;}
    if(month>=6)policy.trades=[{clientId:clients[i],side:month===6?'buy':'sell',amount:100}];
    if(withNotes&&month===6)policy.notes=[{clientId:clients[i],product:'short',amount:100}];
   }
   pair.host.c.instructions=copy(plans);
   pair.host.run('expected=E.migrateCampaign(JSON.parse(JSON.stringify(game)));E.submit(expected,0,instructions[0]);E.submit(expected,1,instructions[1]);E.submit(game,0,instructions[0]);game=E.migrateCampaign(JSON.parse(JSON.stringify(game)));syncPeers()');await pair.drain();
   assert.equal(pair.guest.state().view.rival.investmentSnapshot,undefined);
   assert.equal(pair.guest.state().view.rival.submitted,true,'Readiness is public, but the submitted instruction is not');
   assert.equal(pair.guest.state().view.rival.investmentPolicy,undefined,'A guest must not receive the sealed host policy');
   pair.guest.c.plan=copy(plans[1]);
   if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
   assert.equal(JSON.stringify(pair.host.state().game)===JSON.stringify(pair.host.run('expected')),true,transport+' month '+month+' differs from canonical settlement');
   assert.equal(pair.guest.state().view.cycle,month+1);
   const g=pair.host.state().game,w=g.investmentEconomy.world;
   if(month===5){bankCashNet=w.bankCashNet;assert(g.players.every(p=>p.investmentReport.transfers[0].paid===2000));}
   if(month>=6){
    assert.equal(w.bankCashNet,bankCashNet,'Portfolio orders must not withdraw deposits again');
    assert.equal(w.trading.receipts.length,2);assert(w.trading.receipts.every(r=>r.units===1&&r.gross===100&&r.fee===5&&r.work===5&&r.side===(month===6?'buy':'sell')));
    assert(clients.every(id=>w.clients.find(c=>c.id===id).units===(month===6?1:0)));
    const guest=pair.guest.state().view;assert.equal(guest.me.investmentSnapshot.trading.receipts.length,1);assert.equal(guest.me.investmentSnapshot.trading.receipts[0].clientId,clients[1]);
    for(const p of g.players){assert.equal(p.investmentSnapshot,undefined);assert.equal(p.investmentReport.transfers.length,0);}
   }
   if(withNotes&&month>=6){
    assert.equal(w.notes.positions.length,2);assert.equal(w.notes.positions.reduce((n,p)=>n+p.principal,0),200);assert.equal(w.dealer.accounts.debt,200);
    const notesView=pair.guest.state().view.me.investmentSnapshot.notes;assert.equal(notesView.positions.length,1);assert.equal(notesView.positions[0].clientId,clients[1]);
    if(month===6){assert.equal(w.notes.execution.length,2);assert(w.notes.execution.every(r=>r.filled===100&&r.work===5&&r.fee===5));assert.equal(notesView.execution.length,1);}
    else {assert.equal(w.notes.execution.length,0);assert.equal(notesView.execution.length,0);}
   }
   pair.host.run('E.validatePilot(game);E.validateLedger(game);E.validateFinancialGroupView(E.publicState(game,0));E.validateFinancialGroupView(E.publicState(game,1))');
   const settled=JSON.stringify(pair.host.state().game);
   for(const [,frame]of pair.frames.filter(([seat,f])=>seat===1&&['plan','gh_plan','gh_reveal'].includes(f.type))){pair.host.c.duplicate=frame;await pair.host.run('handleMessage(duplicate)');}await pair.drain();
   assert.equal(JSON.stringify(pair.host.state().game)===settled,true,'Delayed or duplicate orders must not trade or charge twice');
  }
  console.log('PASS '+transport+': two funded owners buy/sell'+(withNotes?' and subscribe to term notes':'')+', half-ready restore, canonical resolution, private receipts and exactly-once fees across seven months');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
