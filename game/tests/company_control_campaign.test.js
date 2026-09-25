'use strict';
// Historical pre-credit fixture: select its named rules, not the latest edition.
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),context={};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);
const E=context.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
function fresh(funded=false){const g=E.createGame({...{...({...E.previewCampaignEdition({},'expanded').options,companyCreditVersion:0}),sharedPremisesVersion:0,companyControlStrategyVersion:0,companyConsolidationVersion:0},mode:'hotseat',seed:5,created:1});
 if(funded)for(const p of g.players)p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.shareholders','external-test-shareholder',{cash:3000000,equity:3000000});return g;}
function plan(g,index){const p=g.players[index],x={...E.chooseBot(g,index),companyControlPolicy:E.defaultCompanyControlPlan(p),companyShareOrders:[],investmentPolicy:E.defaultInvestmentPlan(p),investments:{},newProjects:[],newProject:null};x.groupPolicy.bankSupport=0;x.groupPolicy.bankDividend=0;return x;}
function advance(g,edit=()=>{}){const plans=g.players.map((p,i)=>plan(g,i));edit(plans);for(let i=0;i<2;i++)E.submit(g,i,plans[i]);E.validatePilot(g);E.validateLedger(g);for(let i=0;i<2;i++)E.validateFinancialGroupView(E.publicState(g,i));return g;}

test('reviewed-control boundary moves existing outside capital and refuses unsupported or unversioned saves',()=>{
 const old=E.createGame({...{...({...E.previewCampaignEdition({},'expanded').options,companyCreditVersion:0}),sharedPremisesVersion:0,companyControlStrategyVersion:0,companyConsolidationVersion:0,companyControlVersion:0},seed:5,created:1,mode:'hotseat'}),g=fresh();assert.equal(g.version,'9.24');assert.equal(old.version,'9.23');
 assert.equal(old.companyShareMarket.outside.book.accounts.cash-g.companyShareMarket.outside.book.accounts.cash,g.companyControlMarket.capital);assert.equal(g.companyShareMarket.outside.book.accounts.investments,g.companyControlMarket.lender.accounts.cash);assert.deepEqual(copy(old.companyEconomy.companies),copy(g.companyEconomy.companies));
 const caps=E.campaignCapabilities();delete caps.companyControlSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'companyControlVersion');
 for(const change of [n=>delete n.companyControlVersion,n=>n.companyControlVersion=2,n=>n.version='9.23',n=>n.companyControlMarket.capital++,n=>n.companyControlMarket.lender.accounts.cash++]){const bad=copy(g);change(bad);assert.throws(()=>E.migrateCampaign(bad));}
 E.validateFinancialGroupView(E.publicState(g,0));g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.companyControlVersion,1);assert.equal(g.version,'9.24');
});

test('live funded diligence, reviewed acquisition and integration preserve books and recoverable plans',()=>{
 const g=fresh(true),parentStart=g.players[0].financialGroup.parent.accounts.cash;
 advance(g,plans=>{plans[0].companyControlPolicy.diligence='company:0';});assert(g.players[0].companyControl.diligence['company:0']);assert(g.players[0].financialGroup.parent.accounts.cash<parentStart);assert.equal(g.players[0].companyControl.deals.length,0);
 const target=E.companyControlCompany(g,'company:0');const offer={issuer:'company:0',shares:50001,priceCents:Math.ceil(target.referenceCents*1.5),borrow:5000};
 const plans=g.players.map((p,i)=>plan(g,i));plans[0].companyControlPolicy.offer=offer;const before=JSON.stringify(g);E.normalizeCompanyControlPlan(g,g.players[0],plans[0]);assert.equal(JSON.stringify(g),before);
 E.submit(g,0,plans[0]);const restored=E.migrateCampaign(copy(g));assert.deepEqual(copy(restored.players[0].submitted.companyControlPolicy),copy(plans[0].companyControlPolicy));assert.equal(E.publicState(g,1).rival.companyControl,undefined);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);assert.equal(g.players[0].companyControl.deals[0]?.status,'review',JSON.stringify(g.log.slice(0,10)));assert.equal(g.players[0].companyShares.positions['company:0'].shares,0);
 advance(g);assert.equal(g.players[0].companyControl.deals[0].status,'closed');assert.equal(g.players[0].companyShares.positions['company:0'].shares,50001);assert.equal(g.players[0].financialGroup.parent.accounts.debt,5000);assert.equal(g.players[0].companyControl.deals[0].integration.workDone,0);
 const id=g.players[0].companyControl.deals[0].offer.id;
 advance(g,plans=>{plans[0].companyControlPolicy.paused=[id];});assert.equal(g.players[0].companyControl.deals[0].integration.workDone,0);assert(g.players[0].financialGroup.parent.accounts.debt<5000);
 for(let month=0;month<6;month++)advance(g,plans=>{plans[0].companyControlPolicy.paused=[];});
 assert.equal(g.players[0].companyControl.deals[0].integration.workDone,6);assert.equal(g.players[0].companyControl.deals[0].integration.paid,g.players[0].companyControl.deals[0].integration.totalCost);E.migrateCampaign(copy(g));
});

test('simultaneous campaign offers clear by price and do not refund the losing diligence',()=>{
 const g=fresh(true);advance(g,plans=>{for(const p of plans)p.companyControlPolicy.diligence='company:0';});
 const reference=E.companyControlCompany(g,'company:0').referenceCents;
 advance(g,plans=>plans.forEach((p,i)=>{p.companyControlPolicy.offer={issuer:'company:0',shares:50001,priceCents:Math.ceil(reference*(i?1.6:1.5)),borrow:0};}));
 const paid=g.companyControlMarket.provider.accounts.cash;advance(g);
 assert.equal(g.players[0].companyControl.deals[0].status,'cancelled');assert.equal(g.players[1].companyControl.deals[0].status,'closed');assert.equal(g.players[0].companyShares.positions['company:0'].shares,0);assert.equal(g.players[1].companyShares.positions['company:0'].shares,50001);assert.equal(g.companyControlMarket.provider.accounts.cash,paid,'Diligence refunds must not appear');
});

test('shared parent reservations reject overcommitment and public pending offers do not reveal diligence',()=>{
 const g=fresh(true),p=g.players[0],intent=plan(g,0),before=JSON.stringify(g);intent.companyControlPolicy.diligence='company:0';intent.groupPolicy.bankSupport=2999000;
 assert.throws(()=>E.normalizeCompanyControlPlan(g,p,intent),/commitments/);assert.equal(JSON.stringify(g),before);
 const v=E.publicState(g,0);v.rival.companyControl=copy(v.me.companyControl);assert.throws(()=>E.validateFinancialGroupView(v),/Private control/);
 const policy=plan(g,0);policy.companyControlPolicy.consents=[{offerId:'stale',seller:p.id,shares:1}];assert.throws(()=>E.normalizeCompanyControlPlan(g,p,policy),/stale/);
});
