'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),ctx={};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
const options=()=>({...E.previewCampaignEdition({},'expanded').options,sharedPremisesVersion:0,companyControlVersion:1,companyConsolidationVersion:1,companyControlStrategyVersion:1,mode:'hotseat',seed:5,created:1});
function fresh(funded=false){const g=E.createGame(options());g.players[0].doctrine='commercial';g.players[1].doctrine='community';
 // Transparent mature-capital fixture for opponent behavior, not a claim of
 // first-month affordability or ordinary campaign balance. Transfers reconcile.
 if(funded)for(const p of g.players){p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.shareholders','external-test-shareholders',{cash:10000000,equity:10000000});const x=E.GroupAccounting.capitalizeBank(p.accounting,p.financialGroup.parent,5000000);p.accounting=x.bank;p.financialGroup.parent=x.parent;p.financialGroup.investmentBasis.bank+=5000000;p.stats.cash=p.accounting.accounts.cash;p.stats.capital=p.accounting.accounts.equity;}
 return g;}
function step(g,edit=()=>{}){const plans=g.players.map((p,i)=>E.chooseBot(g,i));edit(plans);for(let i=0;i<2;i++)E.submit(g,i,plans[i]);E.validatePilot(g);E.validateLedger(g);for(let i=0;i<2;i++)E.validateFinancialGroupView(E.publicState(g,i));return plans;}

test('explicit strategy boundary survives save/rematch and does not silently enable old campaigns',()=>{
 const g=fresh();assert.equal(g.version,'9.26');const old=options();delete old.companyControlStrategyVersion;assert.equal(E.createGame(old).version,'9.25');
 const caps=E.campaignCapabilities();delete caps.companyControlStrategySupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'companyControlStrategyVersion');
 for(const change of [x=>delete x.companyControlStrategyVersion,x=>x.companyControlStrategyVersion=2,x=>x.version='9.25']){const bad=copy(g);change(bad);assert.throws(()=>E.migrateCampaign(bad));}
 E.migrateCampaign(copy(g));g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.companyControlStrategyVersion,1);assert.equal(g.version,'9.26');
});

test('unfunded and community banks do not commission speculative diligence; review is private and pure',()=>{
 const g=fresh(),input=E.chooseBot(g,0),v=E.publicState(g,0),before=JSON.stringify({v,input}),a=E.companyControlStrategyReview(v,input);
 assert.equal(a.plan.companyControlPolicy.diligence,null);assert.equal(a.plan.companyControlPolicy.offer,null);assert.equal(JSON.stringify({v,input}),before);
 const changed=copy(v);changed.rival={id:v.rival.id,secretCash:999999999,submitted:{companyControlPolicy:{offer:'secret'}}};assert.deepEqual(copy(E.companyControlStrategyReview(changed,input)),copy(a));
 v.me.doctrine='community';assert.equal(E.companyControlStrategyReview(v,input).plan.companyControlPolicy.diligence,null);
});

test('ordinary opponent planning uses funded diligence and closes a reviewed company acquisition',()=>{
 let g=fresh(true),firstClose=null;const actions=[];
 for(let month=1;month<=8;month++){const plans=step(g);actions.push({month,policy:copy(plans[0].companyControlPolicy),trades:copy(plans[0].companyShareOrders),shares:copy(g.players[0].companyShares.positions),profits:copy(g.companyShareMarket.history)});if(!firstClose&&g.players[0].companyControl.deals.some(d=>d.status==='closed'))firstClose=copy(g);}
 assert(firstClose,JSON.stringify(actions));console.log('AI ownership path '+JSON.stringify(actions.map(x=>({month:x.month,diligence:x.policy.diligence,offer:x.policy.offer?.issuer||null,trades:x.trades,controlled:Object.keys(x.shares).filter(id=>x.shares[id].shares>50000)}))));
 // The later economy may justify a sale; use the actual first completed close
 // for consent/retention tests rather than requiring ownership forever.
 g=E.migrateCampaign(firstClose);
 const completed=g.players[0].companyControl.deals.find(d=>d.status==='closed');
 assert(completed,JSON.stringify(actions));assert(actions.some(x=>x.policy.diligence));assert(actions.some(x=>x.policy.offer));assert(g.players[0].companyShares.positions[completed.offer.issuer].shares>50000);assert.equal(g.players[1].companyControl.deals.length,0,'A community bank should not be forced into control');
 assert(E.companyConsolidatedSummary(g,g.players[0]).controlledCompanies.length>0);E.migrateCampaign(copy(g));
 const v=E.publicState(g,0),plan=E.chooseBot(g,0),before=JSON.stringify({v,plan}),q=E.companyControlStrategyReview(v,plan);assert.equal(q.plan.companyControlPolicy.offer,null,'Finish integration first');assert.equal(JSON.stringify({v,plan}),before);
 // Published incoming offers are a pure decision fixture, not imported state.
 const issuer=completed.offer.issuer,ownership=v.companyShareSnapshot.ownership.find(x=>x.issuer===issuer),owned=v.me.companyShares.positions[issuer].shares,reference=E.companyControlCompany(v,issuer).referenceCents;
 const offered={id:v.rival.id+':control:'+v.cycle+':'+issuer,buyer:v.rival.id,issuer,shares:ownership.outside+2,priceCents:Math.ceil(reference*1.6),borrow:0,submittedMonth:v.cycle};v.companyControlSnapshot.offers=[{offer:offered,reviewMonth:v.cycle+1,defended:false}];
 const sell=E.companyControlStrategyReview(v,plan);assert.equal(sell.plan.companyControlPolicy.consents[0]?.shares,2);assert.equal(sell.plan.companyControlPolicy.consents[0]?.seller,v.me.id);assert.equal(sell.plan.companyControlPolicy.defend,null);assert.equal(v.me.companyShares.positions[issuer].shares,owned,'Decision must not sell before joint settlement');
 v.companyControlSnapshot.offers[0].offer.priceCents=reference;assert.equal(E.companyControlStrategyReview(v,plan).plan.companyControlPolicy.consents.length,0,'Retain control at a poor price without paying for a needless delay');
 // Existing obligations reduce the cash available to discretionary share trades.
 const trades=E.companyShareStrategyReview(v,plan);assert(!trades.plan.companyShareOrders.some(o=>o.issuer===issuer&&o.side==='sell'),'Do not churn healthy controlling ownership just to satisfy the minority portfolio limit');
 // Exercise a real second-board offer and both answers from the same checkpoint.
 step(g,plans=>{plans[1].companyControlPolicy=E.defaultCompanyControlPlan(g.players[1]);plans[1].companyControlPolicy.diligence=issuer;plans[1].companyShareOrders=[];});
 step(g,plans=>{plans[1].companyControlPolicy=E.defaultCompanyControlPlan(g.players[1]);plans[1].companyControlPolicy.offer={issuer,shares:50001-g.players[1].companyShares.positions[issuer].shares,priceCents:Math.ceil(E.companyControlCompany(g,issuer).referenceCents*1.6),borrow:0};plans[1].companyShareOrders=[];plans[0].companyShareOrders=[];});
 const pending=copy(g),responses=g.players.map((p,i)=>E.chooseBot(g,i));assert(responses[0].companyControlPolicy.consents.length,'Owner AI must explicitly tender a worthwhile offer');
 // Seat1 is the human bidder in this case. Its board deliberately keeps the
 // cash-funded offer despite recent losses; only the seller response is AI.
 responses[1].companyControlPolicy=E.defaultCompanyControlPlan(g.players[1]);responses[1].companyShareOrders=[];
 const refused=E.migrateCampaign(copy(pending)),no=copy(responses);no[0].companyControlPolicy.consents=[];for(let i=0;i<2;i++)E.submit(refused,i,no[i]);E.validatePilot(refused);E.validateLedger(refused);assert.equal(refused.players[1].companyControl.deals.at(-1).status,'cancelled');
 for(let i=0;i<2;i++)E.submit(g,i,responses[i]);E.validatePilot(g);E.validateLedger(g);assert.equal(g.players[1].companyControl.deals.at(-1).status,'closed',JSON.stringify(g.log.slice(0,20)));assert(g.players[1].companyShares.positions[issuer].shares>50000);assert(g.players[0].companyShares.positions[issuer].shares<=50000);assert.equal(g.players[0].companyConsolidation.acquisitions[issuer],undefined);E.migrateCampaign(copy(g));
});
