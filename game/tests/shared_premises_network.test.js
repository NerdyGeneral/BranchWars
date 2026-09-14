'use strict';
process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test'),copy=x=>JSON.parse(JSON.stringify(x));
const configure=pair=>pair.host.run("Object.assign(p2pConfig,E.previewCampaignEdition({},'expanded').options,{sharedPremisesVersion:1})");
(async()=>{for(const transport of ['gh','lan','p2p']){
 const old=peers(transport,10);configure(old);
 old.guest.run("const capsBefore=E.campaignCapabilities;E.campaignCapabilities=()=>{const c=capsBefore();delete c.sharedPremisesSupported;return c;};send(makeFeatureHello())");await old.drain();
 assert.equal(old.host.state().game,null);assert(old.frames.some(([,f])=>f.type==='error'&&/Shared service premises/.test(f.message)));
 const pair=peers(transport,10);configure(pair);await lobby(pair);await start(pair);
 for(let month=1;month<=2;month++){
  const plans=copy(pair.host.run(`game.players.map((p,i)=>{const a=E.chooseBot(game,i);a.newProjects=[];a.newProject=null;a.investments={};a.hires=0;a.specialistHires=E.emptySpecialistOrders();a.competitiveAction='none';a.companyShareOrders=[];a.companyControlPolicy=E.defaultCompanyControlPlan(p);a.investmentPolicy=E.defaultInvestmentPlan(p);a.agencyPolicy=E.defaultAgencyPlan(p);a.groupPolicy.bankDividend=0;a.groupPolicy.bankSupport=0;a.facilityPolicy=E.defaultFacilityPolicy();a.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);a.facilityExtensionPolicy={start:null,cancel:null};a.sharedPremisesPolicy=JSON.parse(JSON.stringify(p.sharedPremises.policy));a.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(game,p,a).policy;return a;})`));
  if(month===1)plans[0].sharedPremisesPolicy.build={office:pair.host.state().game.players[0].facilityNetwork.offices[0].id,kind:'visiting'};
  pair.host.c.plan=plans[0];pair.guest.c.plan=plans[1];pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
  pair.host.run('game=E.migrateCampaign(JSON.parse(JSON.stringify(game)));syncPeers()');await pair.drain();
  assert.equal(pair.guest.state().view.sharedPremisesVersion,1);assert.equal(pair.guest.state().view.rival.sharedPremises,undefined);
  if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
  assert.equal(pair.host.state().game.cycle,month+1,JSON.stringify(pair.frames.filter(([,f])=>f.type==='error')));
  pair.host.run('E.validatePilot(game);E.validateLedger(game)');pair.guest.run('E.validateFinancialGroupView(view)');
  assert.equal(pair.guest.state().view.lastPlans?.[pair.guest.state().view.rival.id]?.sharedPremisesPolicy,undefined);
 }
 const g=pair.host.state().game;assert.equal(g.version,'9.27');assert.equal(g.players[0].sharedPremises.totals.construction,45000);assert(g.players[0].sharedPremises.totals.outsidePaid>0);
 const before=JSON.stringify(g);for(const [,f]of pair.frames.filter(([i,f])=>i===1&&['plan','gh_plan','gh_reveal'].includes(f.type))){pair.host.c.delayed=f;await pair.host.run('handleMessage(delayed)');}await pair.drain();assert.equal(JSON.stringify(pair.host.state().game),before);
 console.log('PASS '+transport+' shared premises: old-peer refusal, paid construction, half-ready restoration, owner privacy and duplicate protection');
}})().catch(error=>{console.error(error);process.exitCode=1;});
