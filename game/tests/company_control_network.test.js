'use strict';
process.argv.push('--source');
const assert=require('node:assert/strict'),{peers,lobby,start}=require('./agency_peer_compat.test'),copy=x=>JSON.parse(JSON.stringify(x));
const strategy=process.argv.includes('--strategy'),consolidation=strategy||process.argv.includes('--consolidation');
const configure=pair=>pair.host.run("Object.assign(p2pConfig,E.previewCampaignEdition({},'expanded').options,{sharedPremisesVersion:0,companyControlVersion:1,companyConsolidationVersion:"+(consolidation?1:0)+",companyControlStrategyVersion:"+(strategy?1:0)+"})");
(async()=>{for(const transport of ['gh','lan','p2p']){
 const old=peers(transport,10);configure(old);old.guest.run(`const capsBefore=E.campaignCapabilities;E.campaignCapabilities=()=>{const c=capsBefore();delete c[\"${strategy?'companyControlStrategySupported':consolidation?'companyConsolidationSupported':'companyControlSupported'}\"];return c;};send(makeFeatureHello())`);await old.drain();assert.equal(old.host.state().game,null);assert(old.frames.some(([,f])=>f.type==='error'&&(strategy?/Competitive company strategy/:consolidation?/Controlled company reporting/:/Reviewed company control/).test(f.message)));
 const pair=peers(transport,10);configure(pair);await lobby(pair);await start(pair);
 // Explicit mature-parent shareholder fixture; this is transport/accounting
 // evidence, not ordinary-start acquisition affordability or AI balance.
 pair.host.run(`for(const p of game.players)p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.shareholder','external-test-shareholder',{cash:3000000,equity:3000000});syncPeers();`);await pair.drain();
 for(let month=1;month<=3;month++){
  const plans=copy(pair.host.run(`game.players.map((p,i)=>{const plan=E.chooseBot(game,i);plan.companyShareOrders=[];plan.companyControlPolicy=E.defaultCompanyControlPlan(p);plan.investmentPolicy=E.defaultInvestmentPlan(p);plan.groupPolicy.bankDividend=0;plan.groupPolicy.bankSupport=0;return plan;})`));
  if(month===1)plans[0].companyControlPolicy.diligence='company:0';
  if(month===2)plans[0].companyControlPolicy.offer={issuer:'company:0',shares:50001,priceCents:pair.host.run("Math.ceil(E.companyControlCompany(game,'company:0').referenceCents*1.5)"),borrow:0};
  pair.host.c.plan=plans[0];pair.guest.c.plan=plans[1];pair.host.run('E.submit(game,0,plan);syncPeers()');await pair.drain();
  assert.equal(pair.guest.state().view.rival.companyControl,undefined);assert(!JSON.stringify(pair.guest.state().view.rival).includes('companyControlPolicy'));
  if(month===2){assert.equal(pair.guest.state().view.companyControlSnapshot.offers.length,0,'An uncombined submitted offer must remain private');pair.host.run('game=E.migrateCampaign(JSON.parse(JSON.stringify(game)));syncPeers()');await pair.drain();}
  if(transport==='gh')await pair.guest.run('ghCommitPlan(plan)');else pair.guest.run("send(turnMessage('plan',{plan}))");await pair.drain();
  assert.equal(pair.host.state().game.cycle,month+1,JSON.stringify(pair.frames.filter(([,f])=>f.type==='error')));assert.equal(pair.guest.state().view.companyControlVersion,1);pair.host.run('E.validatePilot(game);E.validateLedger(game)');
 }
 const game=pair.host.state().game;assert.equal(game.players[0].companyShares.positions['company:0'].shares,50001);assert.equal(game.players[0].companyControl.deals[0].status,'closed');
 assert.equal(pair.guest.state().view.companyShareSnapshot.ownership.find(o=>o.issuer==='company:0').banks.find(p=>p.id===game.players[0].id).shares,50001);
 if(consolidation){assert.equal(game.version,strategy?'9.26':'9.25');assert.equal(pair.guest.state().view.rival.companyConsolidation,undefined);assert.equal(game.players[0].companyConsolidation.acquisitions['company:0'].month,3);pair.guest.run('E.validateFinancialGroupView(view)');}
 const before=JSON.stringify(game);for(const [,f]of pair.frames.filter(([i,f])=>i===1&&['plan','gh_plan','gh_reveal'].includes(f.type))){pair.host.c.delayed=f;await pair.host.run('handleMessage(delayed)');}await pair.drain();assert.equal(JSON.stringify(pair.host.state().game),before);
 console.log('PASS '+transport+' control: capability refusal, funded diligence/review/closing, half-ready restoration, private plans and stale-message protection');
}})().catch(error=>{console.error(error);process.exitCode=1;});
