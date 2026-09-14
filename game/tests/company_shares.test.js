'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x));
function load(html){const c={Math:Object.assign(Object.create(Math),{random:()=>.375}),Date:class extends Date{static now(){return 123456;}}};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const E=load(require('../tools/build_game').assemble().html);
function fresh(funded=false){const g=E.createGame({...{...E.previewCampaignEdition({},'expanded').options,sharedPremisesVersion:0,companyControlStrategyVersion:0,companyConsolidationVersion:0,companyControlVersion:0},seed:5,created:1,mode:'hotseat'});
 if(funded)for(const p of g.players)p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:200000,equity:200000});return g;}
function step(g,orders=[]){const plans=g.players.map((p,i)=>E.chooseBot(g,i));for(let i=0;i<2;i++){plans[i].companyShareOrders=orders[i]||[];E.submit(g,i,plans[i]);}E.validatePilot(g);E.validateLedger(g);for(let i=0;i<2;i++)E.validateFinancialGroupView(E.publicState(g,i));return g;}
const buy=(shares=1000,issuer='company:0')=>({issuer,side:'buy',shares,limitCents:1500});

test('new ownership is explicit, funded from existing outside cash, peer gated and preserved on rematch',()=>{
 const g=fresh(),oldOptions={...{...E.previewCampaignEdition({},'expanded').options,sharedPremisesVersion:0,companyControlStrategyVersion:0,companyConsolidationVersion:0,companyControlVersion:0}};delete oldOptions.companySharesVersion;const old=E.createGame({...oldOptions,seed:5,created:1,mode:'hotseat'});
 assert.equal(g.version,'9.23');assert.equal(g.companyEconomy.version,6);assert.equal(old.companyEconomy.outside.accounts.cash-g.companyEconomy.outside.accounts.cash,g.companyShareMarket.capital);
 assert.deepEqual(copy(old.companyEconomy.companies),copy(g.companyEconomy.companies));assert.equal(g.companyShareMarket.outside.book.accounts.cash,g.companyShareMarket.capital);
 const caps=E.campaignCapabilities();delete caps.companySharesSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'companySharesVersion');
 for(const mutate of [n=>delete n.companySharesVersion,n=>n.companySharesVersion=2,n=>n.version='9.22',n=>n.companyShareMarket.capital++,n=>n.companyShareMarket.outside.positions['company:0'].shares--]){const bad=copy(g);mutate(bad);assert.throws(()=>E.migrateCampaign(bad));}
 g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.companySharesVersion,1);assert.equal(g.companyShareMarket.month,0);E.validatePilot(g);
});

test('whole-plan quote rejects malformed orders, unowned sales, control bypass and unsettled funding without mutation',()=>{
 const g=fresh(true),p=g.players[0],plan=E.chooseBot(g,0),before=JSON.stringify(g);
 for(const orders of [null,{},[null],[buy(0)],[buy(-1)],[buy(50001)],[{...buy(),holder:'outside'}],[{...buy(),side:'sell'}],[buy(),buy()]])assert.throws(()=>E.companyShareOrderReview(p,{...plan,companyShareOrders:orders},g));
 const overspent=copy(plan);overspent.agencyPolicy.capital=200000;overspent.companyShareOrders=[buy()];assert.throws(()=>E.companyShareOrderReview(p,overspent,g),/cash/);
 assert.throws(()=>E.companyShareOrderReview(fresh().players[0],{...plan,groupPolicy:{...plan.groupPolicy,bankDividend:200000},companyShareOrders:[buy()]},g),/cash/);
 assert.equal(JSON.stringify(g),before);
});

test('six-month live purchases, sales, dividends, half-ready recovery and public ownership reconcile',()=>{
 let g=fresh(true),paid=0;
 for(let m=0;m<6;m++){
  const plans=g.players.map((p,i)=>E.chooseBot(g,i));plans[0].companyShareOrders=[m===4?{...buy(500),side:'sell',limitCents:1}:buy()];plans[1].companyShareOrders=[buy(500)];
  const before=copy(g);E.submit(g,0,plans[0]);g=E.migrateCampaign(copy(g));E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);
  for(let i=0;i<2;i++){
   const p=g.players[i],v=E.publicState(g,i),r=g.companyShareMarket.receipts.filter(r=>r.holder===p.id),income=g.companyShareMarket.distributions.filter(r=>r.holder===p.id).reduce((n,r)=>n+r.amount,0);
   E.validateFinancialGroupView(v);assert.equal(v.rival.companyShares,undefined);assert(v.companyShareSnapshot.receipts.every(r=>r.holder===p.id));
   const journals=p.financialGroup.parent.journal;assert(journals.some(j=>j.source==='company.distributionReceived'));paid+=income;
   assert.equal(p.financialGroup.parent.accounts.businessAssets,Object.values(p.companyShares.positions).reduce((n,x)=>n+x.basis,0));
   for(const fill of r)assert.equal(p.companyShares.positions[fill.issuer].shares,before.players[i].companyShares.positions[fill.issuer].shares+(fill.side==='buy'?fill.shares:-fill.shares));
  }
  const market=g.companyShareMarket;assert.equal(market.outside.book.accounts.cash+market.exchange.accounts.cash+market.parentCashNet,market.capital+g.companyEconomy.shareMarket.distributed);
  const bad=copy(g);bad.companyShareMarket.distributions[0].amount++;assert.throws(()=>E.migrateCampaign(bad),/distributions/);
 }
 assert(paid>0);assert.equal(g.companyShareMarket.month,6);assert.equal(g.companyShareMarket.history['company:0'].length,6);
});

test('public quotes, positions, receipts and rival privacy reject malformed snapshots',()=>{
 const g=step(fresh(true),[[buy()],[buy(500)]]),v=E.publicState(g,0);
 for(const mutate of [n=>n.companyShareSnapshot.issuers[0].referenceCents++,n=>n.companyShareSnapshot.ownership[0].outside++,n=>n.companyShareSnapshot.outsideQuotes[0].holder=n.me.id,n=>n.companyShareSnapshot.receipts[0].fee++,n=>n.companyShareSnapshot.distributions[0].holder=n.rival.id,n=>n.rival.companyShares=n.me.companyShares,n=>n.companyShareSnapshot.history['company:0'].push(0)]){const bad=copy(v);mutate(bad);assert.throws(()=>E.validateFinancialGroupView(bad));}
});

test('immutable checkpoint37 creation, human/AI resolution, half-ready saves, views and rematch stay exact',()=>{
 const bytes=fs.readFileSync(require('node:path').join(__dirname,'../reports/reference-builds/BRANCH_WARS_strategy1_37_b4351e85.html'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'b4351e85160586e72a63519a1eb2fe6fecdfe9cba1c94cbdd8577231f5c78561');const O=load(bytes.toString());
 for(const scenario of ['balanced','rate','regulatory','growth']){
  const options={...O.previewCampaignEdition({},'expanded').options,seed:67,scenario,mode:'hotseat',created:1};let a=O.createGame(options),b=E.createGame(options);assert.deepEqual(copy(a),copy(b));
  for(let m=0;m<2;m++){const pa=a.players.map((p,i)=>O.chooseBot(a,i)),pb=b.players.map((p,i)=>E.chooseBot(b,i));assert.deepEqual(copy(pa),copy(pb));if(m===1){pa[0].decision='b';pb[0].decision='b';}
   O.submit(a,0,pa[0]);E.submit(b,0,pb[0]);a=O.migrateCampaign(copy(a));b=E.migrateCampaign(copy(b));assert.deepEqual(copy(a),copy(b));O.submit(a,1,pa[1]);E.submit(b,1,pb[1]);assert.deepEqual(copy(a),copy(b));for(let i=0;i<2;i++)assert.deepEqual(copy(O.publicState(a,i)),copy(E.publicState(b,i)));}
  for(const [engine,g]of [[O,a],[E,b]]){g.gameOver=true;engine.rematch(g,0);engine.rematch(g,1);}assert.deepEqual(copy(a),copy(b));
 }
});
