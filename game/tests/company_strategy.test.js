'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const c={};vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);const E=c.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
function fresh(funded=false){const g=E.createGame({...{...E.previewCampaignEdition({},'expanded').options,sharedPremisesVersion:0,companyControlStrategyVersion:0,companyConsolidationVersion:0,companyControlVersion:0},seed:5,created:1,mode:'hotseat'});if(funded)for(const p of g.players)p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:1500000,equity:1500000});return g;}
function step(g){const plans=g.players.map((p,i)=>E.chooseBot(g,i));E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);return plans;}

test('public company strategy waits for earnings, buys with actual surplus and ignores rival private information',()=>{
 const g=fresh(true),first=g.players.map((p,i)=>E.chooseBot(g,i));assert(first.every(p=>p.companyShareOrders.length===0),'No speculative purchase before first operating statement');
 E.submit(g,0,first[0]);E.submit(g,1,first[1]);
 const v=E.publicState(g,0),input=E.chooseBot(g,0),before=JSON.stringify({v,input}),review=E.companyShareStrategyReview(v,input);
 assert(review.plan.companyShareOrders.length>0);assert.equal(review.plan.companyShareOrders[0].side,'buy');assert(review.plan.companyShareOrders[0].shares<=1000);
 assert(E.companyShareOrderReview(v.me,review.plan,v).remaining>=50000);assert.equal(JSON.stringify({v,input}),before);
 const privateChanged=copy(v);privateChanged.rival={id:v.rival.id,secretCash:999999999,submitted:{companyShareOrders:[{issuer:'company:0',side:'buy',shares:99999}]}};
 assert.deepEqual(copy(E.companyShareStrategyReview(privateChanged,input)),copy(review));
 const next=step(g);assert(next[0].companyShareOrders.length>0);assert(Object.values(g.players[0].companyShares.positions).some(p=>p.shares>0));
 const total=g.companyShareMarket.outside.book.accounts.cash+g.companyShareMarket.exchange.accounts.cash+g.companyShareMarket.parentCashNet;
 assert.equal(total,g.companyShareMarket.capital+g.companyEconomy.shareMarket.distributed);
});

test('strategy can liquidate an owned holding for parent liquidity without reusing expected proceeds',()=>{
 const g=fresh(true);step(g);step(g);const v=E.publicState(g,0),input=E.chooseBot(g,0);
 // Pure decision fixture: the consumed view is not imported as a valid campaign.
 // Cash withdrawal is balanced in the parent book; real ownership is retained.
 const parent=v.me.financialGroup.parent,amount=parent.accounts.cash-1000;
 v.me.financialGroup.parent=E.GroupAccounting.post(parent,'fixture.ownerWithdrawal','external-shareholder',{cash:-amount,equity:-amount});
 input.groupPolicy.bankSupport=0;input.agencyPolicy.capital=0;input.agencyPolicy.supportCap=0;input.investmentPolicy.institution.capital=0;input.investmentPolicy.institution.supportCap=0;
 const before=JSON.stringify({v,input}),q=E.companyShareStrategyReview(v,input);assert.equal(q.plan.companyShareOrders.length,1);assert.equal(q.plan.companyShareOrders[0].side,'sell');assert.equal(E.companyShareOrderReview(v.me,q.plan,v).cash,0);assert.equal(JSON.stringify({v,input}),before);
});

test('a chosen subsidiary savings goal defers new discretionary projects but preserves risk work and existing state',()=>{
 const g=fresh(),v=E.publicState(g,0),input=E.chooseBot(g,0);v.cycle=8;v.me.investmentBusiness.month=7;v.me.doctrine='digital';
 input.newProjects=['branch','marketing','remediation'];input.newProject='branch';input.investments={digital:100000};input.projectTargets={branch:v.me.focus};input.facilityExtensionPolicy={start:'test-office',cancel:null};
 const before=JSON.stringify({g,v,input}),q=E.groupDevelopmentReview(v,input);
 assert(q.targetCapital>0);assert.deepEqual(copy(q.plan.newProjects),['remediation']);assert.equal(q.plan.newProject,'remediation');assert.deepEqual(copy(q.plan.investments),{});assert.deepEqual(copy(q.plan.projectTargets),{});assert.equal(q.plan.facilityExtensionPolicy.start,null);
 assert.deepEqual(copy(q.plan.allocation),copy(input.allocation));assert.equal(q.plan.hires,input.hires);assert.equal(q.plan.competitiveAction,input.competitiveAction);assert.equal(JSON.stringify({g,v,input}),before);
 const legacy=copy(v);delete legacy.companySharesVersion;assert.deepEqual(copy(E.groupDevelopmentReview(legacy,input).plan),copy(input));
});
