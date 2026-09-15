'use strict';
process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test');
const copy=x=>JSON.parse(JSON.stringify(x));
const rivalry=process.argv.includes('--bank-rivalry'),coreBalance=process.argv.includes('--core-balance'),bankEconomics=process.argv.includes('--bank-economics')||coreBalance||rivalry,creditWorkload=process.argv.includes('--credit-workload')||rivalry,serviced=process.argv.includes('--commercial')||creditWorkload||bankEconomics;
console.log(JSON.stringify({suite:'persistent-income-history-network',candidateSha256:require('node:crypto').createHash('sha256').update(require('../tools/build_game').assemble().html).digest('hex'),scope:(coreBalance?'Three Core':creditWorkload?'Three Expanded':'Six')+' simulated pairs and actual old-peer refusal; not physical two-computer acceptance.'}));
function configure(pair,edition){
 pair.host.c.edition=edition;
 pair.host.c.serviced=serviced;
 pair.host.c.creditWorkload=creditWorkload||(bankEconomics&&edition==='expanded');
 pair.host.c.bankEconomics=bankEconomics;
 pair.host.c.coreBalance=coreBalance;
 pair.host.c.rivalry= rivalry;
 // These cases intentionally cover historical reporting/economics profiles,
 // not the current UI defaults (covered by expanded_edition_network).
 pair.host.run("const selected=E.previewCampaignEdition({},edition,{currentReporting:true}).options;if(serviced)selected.commercialServiceVersion=1;if(creditWorkload)selected.creditWorkloadVersion=1;if(bankEconomics)selected.bankEconomicsVersion=coreBalance?2:1;if(rivalry)selected.bankRivalryVersion=1;for(const f of E.CAMPAIGN_FEATURES)delete p2pConfig[f.field];Object.assign(p2pConfig,selected);const historyCreate=E.createGame;E.createGame=o=>historyCreate({...o,seed:'income-network',created:1})");
}
(async()=>{
 for(const transport of ['gh','lan','p2p']){
  const old=peers(transport,10,false,true);configure(old,creditWorkload?'expanded':'core');
  old.guest.run('send(makeFeatureHello())');await old.drain();
  assert.equal(old.host.state().game,null);assert(old.frames.some(([,m])=>m.type==='error'&&(rivalry?/Persistent bank rivalry/:bankEconomics?/Service-based bank economics/:creditWorkload?/Portfolio-based credit administration/:serviced?/Serviced commercial income/:/income reporting/i).test(m.message)),'Actual old peer must be refused for the new rules');
  for(const edition of coreBalance?['core']:creditWorkload?['expanded']:['core','expanded']){
   const pair=peers(transport,10);configure(pair,edition);
   try{await lobby(pair);await start(pair);}catch(error){throw Error(transport+' '+edition+': '+error.message+' '+JSON.stringify(pair.frames.filter(([,m])=>m.type==='error')));}
   assert.equal(pair.host.state().game.version,rivalry?'9.33':coreBalance?'8.19':bankEconomics?(edition==='core'?'8.18':'9.32'):creditWorkload?'9.31':edition==='core'?(serviced?'8.17':'8.16'):(serviced?'9.30':'9.29'));assert.equal(pair.guest.state().view.incomeHistoryVersion,1);
   for(let month=1;month<=2;month++){
    const plans=copy(pair.host.run('game.players.map((p,i)=>E.chooseBot(game,i))'));
    pair.host.c.plan=plans[0];pair.guest.c.plan=plans[1];pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
    pair.host.run('game=E.migrateCampaign(JSON.parse(JSON.stringify(game)));syncPeers()');await pair.drain();
    if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
    assert.equal(pair.host.state().game.cycle,month+1,JSON.stringify(pair.frames.filter(([,m])=>m.type==='error')));
    const v=pair.guest.state().view;assert.equal(v.me.incomeHistory.records.length,month);assert.equal(v.me.incomeHistory.records.at(-1).cycle,month);assert.equal(v.rival.incomeHistory,undefined);
    if(serviced){assert.equal(v.commercialServiceVersion,1);assert.equal(v.me.commercialServiceVersion,1);assert.equal(v.rival.commercialServiceVersion,undefined);assert(Number.isFinite(v.me.operatingReport.commercialServiceCoverage));}
    if(creditWorkload||(bankEconomics&&edition==='expanded')){assert.equal(v.creditWorkloadVersion,1);assert.equal(v.me.creditWorkloadVersion,1);assert.equal(v.rival.creditWorkloadVersion,undefined);}
    if(bankEconomics){assert.equal(v.bankEconomicsVersion,coreBalance?2:1);assert.equal(v.me.bankEconomicsVersion,coreBalance?2:1);assert.equal(v.rival.bankEconomicsVersion,undefined);if(edition==='expanded'||coreBalance)assert.equal(pair.guest.run('E.IncomeReview.statement(view.me.operatingReport).abstract'),0);if(coreBalance){assert(v.me.accounting);assert.equal(v.rival.accounting,undefined);}}
    pair.guest.run('E.validateIncomeHistoryView(view)');pair.host.run('E.validatePilot(game);E.validateLedger(game)');
    if(rivalry){assert.equal(v.bankRivalryVersion,1);assert.equal(v.me.bankRivalryVersion,1);assert.equal(v.rival.bankRivalryVersion,undefined);}
   }
   const state=JSON.stringify(pair.host.state().game),view=JSON.stringify(pair.guest.state().view);
   for(const [,frame]of pair.frames.filter(([seat,f])=>seat===1&&['plan','gh_plan','gh_reveal'].includes(f.type))){pair.host.c.late=frame;await pair.host.run('handleMessage(late)');}await pair.drain();
   assert.equal(JSON.stringify(pair.host.state().game),state,'Delayed submissions duplicated history or economics');
   pair.host.run('resetFeaturePeer();challengePeerFeatures()');await pair.drain();assert(pair.host.run('featurePeerFresh'));assert.equal(JSON.stringify(pair.host.state().game),state);
   const invalid=copy(pair.guest.state().view);invalid.me.incomeHistory.records.push(copy(invalid.me.incomeHistory.records[0]));pair.guest.c.invalid=invalid;
   assert.throws(()=>pair.guest.run('validateIncomingFeatureRules(invalid,"view")'),/income history/);
   assert.equal(JSON.stringify(pair.guest.state().view),view,'Invalid snapshot replaced the current owner view');
   console.log('PASS '+transport+' '+edition+(bankEconomics?' bank-economics':serviced?' serviced-income':'')+': old-peer refusal, 2 completed months, half-ready checkpoint, reconnect, private records and delayed-frame protection');
  }
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
