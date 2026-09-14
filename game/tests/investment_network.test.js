'use strict';
if(!process.argv.includes('--portable'))process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test');
const copy=x=>JSON.parse(JSON.stringify(x));
(async()=>{
 for(const transport of ['gh','lan','p2p'])for(const assets of [false,true,'cash','sweeps','choices','income','suitability','trading','notes']){
  const pair=peers(transport,10);
  pair.host.run("Object.assign(p2pConfig,E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,{investmentServicesVersion:1"+(assets?",investmentAssetsVersion:1":"")+(['cash','sweeps','choices','income','suitability','trading','notes'].includes(assets)?",investmentCashVersion:1":"")+(['sweeps','choices','income','suitability','trading','notes'].includes(assets)?",investmentSweepVersion:1":"")+(['choices','income','suitability','trading','notes'].includes(assets)?",investmentChoiceVersion:1":"")+(['income','suitability','trading','notes'].includes(assets)?",investmentIncomeVersion:1":"")+(['suitability','trading','notes'].includes(assets)?",investmentSuitabilityVersion:1":"")+(['trading','notes'].includes(assets)?",investmentTradingVersion:1":"")+(assets==='notes'?",investmentNotesVersion:1":"")+"})");
  await lobby(pair);await start(pair);
  assert.equal(pair.host.state().game.investmentServicesVersion,1);assert.equal(pair.guest.state().view.investmentServicesVersion,1);
  const plans=pair.host.run('game.players.map((p,i)=>E.chooseBot(game,i))');
  if(assets){assert.equal(pair.guest.state().view.investmentAssetsVersion,1);const defaults=pair.host.run('game.players.map(p=>E.defaultInvestmentPlan(p))');for(const [i,plan]of plans.entries())plan.investmentPolicy={...copy(defaults[i]),inventorySale:100000};}
  pair.host.c.plan=copy(plans[0]);pair.guest.c.plan=copy(plans[1]);
  pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
  if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");
  await pair.drain();assert.equal(pair.host.state().game.cycle,2);assert.equal(pair.guest.state().view.cycle,2);
  const v=pair.guest.state().view;assert.equal(v.rival.investmentBusiness,undefined);assert.equal(v.investmentEconomy,undefined);
  if(assets==='notes'){
   assert.equal(v.investmentNotesVersion,1);assert.equal(v.me.investmentNotesVersion,1);assert.equal(pair.host.state().game.investmentEconomy.world.notes.month,1);
   assert.deepEqual(copy(v.me.investmentSnapshot.notes.positions),[]);
   const refusal=pair.host.run('const noteCaps=E.campaignCapabilities();delete noteCaps.investmentNotesSupported;E.peerRulesIssue(E.campaignRules(game,{context:"game"}),noteCaps)');assert.equal(refusal.field,'investmentNotesVersion');
   pair.host.run('restoredNotes=E.migrateCampaign(JSON.parse(JSON.stringify(game)));if(restoredNotes.investmentNotesVersion!==1)throw Error("Lost term-note rules");');
   console.log('PASS '+transport+' term-note marker, checkpoint, settlement, privacy and old-peer refusal');
  }
  if(assets==='trading'){
   assert.equal(v.investmentTradingVersion,1);assert.equal(v.me.investmentTradingVersion,1);assert.equal(pair.host.state().game.investmentEconomy.world.trading.month,1);
   assert.deepEqual(copy(v.me.investmentSnapshot.trading.receipts),[]);
   const outdatedTrading=pair.host.run('const tradingCaps=E.campaignCapabilities();delete tradingCaps.investmentTradingSupported;E.peerRulesIssue(E.campaignRules(game,{context:"game"}),tradingCaps)');assert.equal(outdatedTrading.field,'investmentTradingVersion');
   pair.host.run('restoredTrading=E.migrateCampaign(JSON.parse(JSON.stringify(game)));if(restoredTrading.investmentTradingVersion!==1)throw Error("Lost portfolio rules");');
   console.log('PASS '+transport+' portfolio orders marker, checkpoint, settlement, privacy and old-peer refusal');
  }
  if(assets==='suitability'){
   assert.equal(v.investmentSuitabilityVersion,1);assert.equal(pair.host.state().game.investmentEconomy.world.suitabilityVersion,1);
   const unsuitablePeer=pair.host.run('const fitCaps=E.campaignCapabilities();delete fitCaps.investmentSuitabilitySupported;E.peerRulesIssue(E.campaignRules(game,{context:"game"}),fitCaps)');assert.equal(unsuitablePeer.field,'investmentSuitabilityVersion');
   pair.host.run('restoredFit=E.migrateCampaign(JSON.parse(JSON.stringify(game)));if(restoredFit.investmentSuitabilityVersion!==1)throw Error("Lost suitability rules");');
   console.log('PASS '+transport+' suitability marker, checkpoint, settlement, privacy and old-peer refusal');
  }
  if(assets==='income'){
   assert.equal(v.investmentIncomeVersion,1);assert.equal(pair.host.state().game.investmentEconomy.world.income.month,1);assert.equal(v.me.investmentSnapshot.income.month,1);
   const incompatible=pair.host.run('const incomeCaps=E.campaignCapabilities();delete incomeCaps.investmentIncomeSupported;E.peerRulesIssue(E.campaignRules(game,{context:"game"}),incomeCaps)');assert.equal(incompatible.field,'investmentIncomeVersion');
   pair.host.run('restoredIncome=E.migrateCampaign(JSON.parse(JSON.stringify(game)));if(restoredIncome.investmentIncomeVersion!==1)throw Error("Lost income rules");');
  }
  if(assets==='choices'){
   assert.equal(v.investmentChoiceVersion,1);assert.equal(pair.host.state().game.investmentEconomy.world.choiceVersion,1);
   const incompatible=pair.host.run('const choiceCaps=E.campaignCapabilities();delete choiceCaps.investmentChoiceSupported;E.peerRulesIssue(E.campaignRules(game,{context:"game"}),choiceCaps)');assert.equal(incompatible.field,'investmentChoiceVersion');
   pair.host.run('restoredChoice=E.migrateCampaign(JSON.parse(JSON.stringify(game)));if(restoredChoice.investmentChoiceVersion!==1)throw Error("Lost customer choice rules");');
   console.log('PASS '+transport+' customer-choice handshake, owner projection, normal settlement, saved checkpoint and old-peer refusal');
  }
  if(assets){assert.equal(v.me.investmentAssetReport.paid,100000);assert.equal(v.rival.investmentAssetReport,undefined);}
  if(['cash','sweeps','choices','income','suitability','trading'].includes(assets)){assert.equal(v.investmentCashVersion,1);assert.equal(v.rival.investmentCashVersion,undefined);}
  pair.host.run('E.validatePilot(game);E.validateLedger(game)');
  const missing=pair.host.run('const caps=E.campaignCapabilities();delete caps.investmentServicesSupported;E.peerRulesIssue(E.campaignRules(game,{context:"game"}),caps)');
  assert.equal(missing.field,'investmentServicesVersion');
  if(assets){const unsupported=pair.host.run('const assetCaps=E.campaignCapabilities();delete assetCaps.investmentAssetsSupported;E.peerRulesIssue(E.campaignRules(game,{context:"game"}),assetCaps)');assert.equal(unsupported.field,'investmentAssetsVersion');}
  if(['cash','sweeps','choices','income','suitability','trading'].includes(assets)){const unsupported=pair.host.run('const cashCaps=E.campaignCapabilities();delete cashCaps.investmentCashSupported;E.peerRulesIssue(E.campaignRules(game,{context:"game"}),cashCaps)');assert.equal(unsupported.field,'investmentCashVersion');}
  if(assets==='sweeps'){
   assert.equal(v.investmentSweepVersion,1);assert.equal(v.rival.investmentSweepVersion,undefined);
   assert.deepEqual(copy(v.me.investmentSnapshot.cashPositions),[]);
   const unsupported=pair.host.run('const sweepCaps=E.campaignCapabilities();delete sweepCaps.investmentSweepSupported;E.peerRulesIssue(E.campaignRules(game,{context:"game"}),sweepCaps)');assert.equal(unsupported.field,'investmentSweepVersion');
   pair.host.run('restored=E.migrateCampaign(JSON.parse(JSON.stringify(game)));if(restored.investmentSweepVersion!==1)throw Error("Lost cash arrangements");');
  }
  console.log('PASS '+transport+' investment '+(assets==='income'?'funded-income':assets==='choices'?'customer-choice':assets==='sweeps'?'standing-sweeps':assets==='cash'?'cash-return':assets?'backed-assets':'cash-only')+' marker, normal turn, owner privacy and incompatible-peer refusal');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
