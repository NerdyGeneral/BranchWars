'use strict';
process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test'),copy=x=>JSON.parse(JSON.stringify(x));
// Fix creation inputs, not company cash or underwriting. An unseeded macro
// downturn can correctly refuse this offer and is not a transport failure.
const configure=pair=>pair.host.run("Object.assign(p2pConfig,E.previewCampaignEdition({},'expanded').options,{companyCreditVersion:1});const creditCreate=E.createGame;E.createGame=o=>creditCreate({...o,seed:'credit-queue',created:1})");
(async()=>{for(const transport of ['gh','lan','p2p']){
 const old=peers(transport,10);configure(old);
 old.guest.run("const prior=E.campaignCapabilities;E.campaignCapabilities=()=>{const c=prior();delete c.companyCreditSupported;return c;};send(makeFeatureHello())");await old.drain();
 assert.equal(old.host.state().game,null);assert(old.frames.some(([,f])=>f.type==='error'&&/Named-company lending/.test(f.message)));
 const pair=peers(transport,10);configure(pair);await lobby(pair);await start(pair);
 assert.equal(pair.host.state().game.version,'9.28');assert.equal(pair.guest.state().view.companyCreditVersion,1);
 for(let month=1;month<=3;month++){
  const plans=copy(pair.host.run(`game.players.map((p,i)=>{
   const a=E.chooseBot(game,i);Object.assign(a,{newProjects:[],newProject:null,investments:{},hires:0,specialistHires:E.emptySpecialistOrders(),competitiveAction:'none',opportunity:null,contractBid:null,capitalAction:false});
   a.groupPolicy.bankDividend=0;a.groupPolicy.bankSupport=0;a.allocation={...p.allocation};a.servicePolicy=JSON.parse(JSON.stringify(p.serviceDesk.policy));a.servicePolicy.staff=0;
   a.departmentFunctionsPolicy=E.defaultDepartmentFunctionsPolicy(p);for(const row of Object.values(a.departmentFunctionsPolicy.quotas))for(const role of Object.keys(row))row[role]=0;
   for(const k of Object.keys(a.departmentFunctionsPolicy.vendors))a.departmentFunctionsPolicy.vendors[k]=0;
   a.departmentFunctionsPolicy.quotas.credit.operations=1;a.commercialAccountPolicy={target:i===0?'company:0':null,staffQuarters:i===0?2:0};
   a.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(game,p,a).policy;return a;
  })`));
  if(month===3)plans[0].companyCreditOrders=[{companyId:'company:0',principal:10000,months:48,annualRateBp:800,appetite:'balanced',product:'middleMarket'}];
  pair.host.c.plan=plans[0];pair.guest.c.plan=plans[1];pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
  pair.host.run('game=E.migrateCampaign(JSON.parse(JSON.stringify(game)));syncPeers()');await pair.drain();
  assert.equal(pair.guest.state().view.rival.companyCredit,undefined);
  if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
  assert.equal(pair.host.state().game.cycle,month+1,JSON.stringify(pair.frames.filter(([,f])=>f.type==='error')));
  pair.host.run('E.validatePilot(game);E.validateLedger(game)');pair.guest.run('E.validateFinancialGroupView(view)');
  assert.equal(pair.guest.state().view.lastPlans?.[pair.guest.state().view.rival.id]?.companyCreditOrders,undefined);
 }
 const game=pair.host.state().game;assert.equal(game.companyEconomy.credit.notes.length,1);assert.equal(game.companyEconomy.credit.notes[0].original,10000);
 assert.equal(game.players[0].operatingReport.companyCredit.advanced,10000);
 const before=JSON.stringify(game);for(const [,f]of pair.frames.filter(([i,f])=>i===1&&['plan','gh_plan','gh_reveal'].includes(f.type))){pair.host.c.delayed=f;await pair.host.run('handleMessage(delayed)');}await pair.drain();
 assert.equal(JSON.stringify(pair.host.state().game),before,'Delayed plans cannot repeat funding');
 console.log('PASS '+transport+' company credit: required capability, paid relationship and loan, half-ready restore, owner privacy, delayed-message protection');
}})().catch(error=>{console.error(error);process.exitCode=1;});
