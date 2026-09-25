'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,T=E.InvestmentTrading;
function fresh(engine=E,trading=true){return engine.createGame({...engine.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,investmentSweepVersion:1,investmentChoiceVersion:1,investmentIncomeVersion:1,investmentSuitabilityVersion:1,...(trading?{investmentTradingVersion:1}:{}),mode:'hotseat',seed:'portfolio-orders',created:1});}
function plans(g,engine=E){return g.players.map((p,i)=>({...engine.chooseBot(g,i),investmentPolicy:engine.defaultInvestmentPlan(p)}));}
function next(g,orders,engine=E,reverse=false){const n=copy(g);engine.submit(n,reverse?1:0,copy(orders[reverse?1:0]));const restored=engine.migrateCampaign(n);engine.submit(restored,reverse?0:1,copy(orders[reverse?0:1]));engine.validatePilot(restored);engine.validateLedger(restored);for(const i of [0,1])engine.validateFinancialGroupView(engine.publicState(restored,i));return restored;}
function capital(g,engine=E){g.players[0].financialGroup.parent=engine.GroupAccounting.post(g.players[0].financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:1000000,equity:1000000});return g;}
function launch(g,engine=E){const o=plans(g,engine);o[0].investmentPolicy.institution={...o[0].investmentPolicy.institution,launch:true,capital:700000,feeBp:60,roles:{adviser:1,broker:0,principal:0,operations:1}};o[0].investmentPolicy.pursue=true;return o;}
function owned(g){const p=g.players[0],ids=new Set(g.investmentEconomy.links.accounts.filter(a=>a.bankId===p.id).map(a=>a.clientId));return g.investmentEconomy.world.clients.filter(c=>c.owner===p.id&&ids.has(c.id));}

test('portfolio quotes reserve the paid execution fee and use held cash, holdings and the customer mandate',()=>{
 const c={id:'a',cash:1000,units:0},p={deposit:0,value:0},q=T.quote(c,100,p,'buy',1000000),fit=E.InvestmentSuitability.assess(c,100,p);
 assert(q.wanted>0);assert(q.wanted*100+q.fee<=1000);assert(q.wanted*100<=Math.floor(995*fit.maximumBp/10000));
 assert.equal(T.quote({...c,cash:104},100,p,'buy',100).wanted,0);
 const sold=T.quote({...c,units:3},100,p,'sell',500);assert.equal(sold.wanted,3);assert.equal(sold.cashChange,295);assert.equal(sold.reason,'holdings');
 assert.throws(()=>T.quote(c,100,p,'borrow',100));
});

test('simultaneous clearing uses opening dealer resources, stable proportional fills and finite qualified work',()=>{
 const clients=['a','b','c'].map((id,i)=>({id,owner:i===2?'bank:b':'bank:a',cash:10000,units:i===2?2:0,service:'advice',serviced:true,ownedCustody:false,position:{deposit:0,value:0}}));
 const capacity=['bank:a','bank:b'].map(owner=>({owner,advice:100,brokerage:0,operations:100,custody:0}));
 const input={clients,capacity,price:100,dealerCash:0,dealerUnits:3},orders=clients.map(c=>({owner:c.owner,clientId:c.id,side:c.id==='c'?'sell':'buy',amount:200})),before=JSON.stringify(input);
 const r=T.clear(input,orders);assert.equal(JSON.stringify(input),before);assert.deepEqual(copy(r),copy(T.clear(input,orders.slice().reverse())));
 assert.equal(r.receipts.filter(x=>x.side==='buy').reduce((n,x)=>n+x.units,0),3);assert.equal(r.receipts.find(x=>x.clientId==='c').units,0);assert.equal(r.receipts.find(x=>x.clientId==='c').reason,'dealer liquidity');assert.equal(r.receipts.find(x=>x.clientId==='c').fee,0);
 const constrained=copy(input);constrained.capacity[0].advice=5;const limited=T.clear(constrained,orders);assert.equal(limited.receipts.find(x=>x.clientId==='b').reason,'capacity');assert.equal(limited.capacity[0].advice,0);
 const changed=copy(input);changed.clients[0].serviced=false;assert.equal(T.clear(changed,orders).receipts[0].reason,'relationship');
 assert.throws(()=>T.clear(input,[orders[0],orders[0]]));assert.throws(()=>T.clear(input,[{...orders[0],owner:'foreign'}]));
});

test('funded campaign buys and sells client holdings once without another deposit withdrawal, and preserves rules on resume/rematch',()=>{
 let g=capital(fresh());assert.equal(g.version,'9.19');assert.equal(g.investmentEconomy.world.trading.receipts.length,0);
 for(const change of [x=>delete x.investmentTradingVersion,x=>x.version='9.18',x=>x.investmentTradingVersion=2,x=>delete x.investmentEconomy.world.trading,x=>delete x.players[0].investmentTradingVersion]){const b=copy(g);change(b);assert.throws(()=>E.migrateCampaign(b));}
 const caps=E.campaignCapabilities();delete caps.investmentTradingSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'investmentTradingVersion');
 g=next(g,launch(g));for(let n=0;n<3;n++){const o=plans(g);o[0].investmentPolicy.pursue=true;g=next(g,o);}
 const clients=owned(g).slice(0,2);assert.equal(clients.length,2);let o=plans(g);o[0].investmentPolicy.inventorySale=20000;o[0].investmentPolicy.funding=clients.map(c=>({clientId:c.id,amount:2000,destination:'cash'}));g=next(g,o);
 const bankCashNet=g.investmentEconomy.world.bankCashNet,transfers=g.investmentEconomy.links.transfers.length;
 o=plans(g);o[0].investmentPolicy.trades=clients.map(c=>({clientId:c.id,side:'buy',amount:100}));const unchanged=JSON.stringify(g),bought=next(g,o);assert.deepEqual(copy(bought),copy(next(g,o,E,true)));assert.equal(JSON.stringify(g),unchanged);g=bought;
 let w=g.investmentEconomy.world;assert.equal(w.bankCashNet,bankCashNet);assert.equal(g.investmentEconomy.links.transfers.length,transfers);assert.equal(w.trading.receipts.length,2);
 assert(w.trading.receipts.every(r=>r.units===1&&r.gross===100&&r.fee===5&&r.work===5));assert(clients.every(c=>w.clients.find(x=>x.id===c.id).units===1));
 assert.equal(w.reports[0].tradingFees,10);assert.equal(w.reports[0].tradeWork,10);
 const privateView=E.publicState(g,1);assert.equal(privateView.me.investmentSnapshot.trading.receipts.length,0);assert.equal(privateView.rival.investmentSnapshot,undefined);
 const bad=copy(E.publicState(g,0));bad.me.investmentSnapshot.trading.receipts[0].owner=bad.rival.id;assert.throws(()=>E.validateFinancialGroupView(bad));
 if(process.argv.includes('--fixture'))fs.writeFileSync(path.join(__dirname,'../output/investment-trading-browser-qa.json'),JSON.stringify(g));
 o=plans(g);o[0].investmentPolicy.trades=clients.map(c=>({clientId:c.id,side:'sell',amount:100}));g=next(g,o);w=g.investmentEconomy.world;
 assert(w.trading.receipts.every(r=>r.side==='sell'&&r.gross===100&&r.fee===5));assert(clients.every(c=>w.clients.find(x=>x.id===c.id).units===0));assert.equal(w.bankCashNet,bankCashNet);assert.equal(g.investmentEconomy.links.transfers.length,transfers);
 // Bot planning consumes campaign RNG. Prepare the invalid instruction before
 // capturing the submit boundary so this assertion isolates failed submission.
 const invalidPlan={...plans(g)[0],investmentPolicy:{...E.defaultInvestmentPlan(g.players[0]),trades:[{clientId:'foreign',side:'buy',amount:100}]}},original=JSON.stringify(g);
 assert.throws(()=>E.submit(g,0,invalidPlan),/existing client relationship/);assert.equal(JSON.stringify(g),original);
 g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'9.19');assert.equal(g.investmentEconomy.world.trading.month,0);E.validatePilot(g);
});

test('preserved 9.18 funded creation, AI/RNG, service, cash placements and both views remain exact',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_suitability1_078a2834.html'));assert.equal(createHash('sha256').update(bytes).digest('hex'),'078a283476209bc783c4e7baf37bdf6f1f858d407534ac84f09e552106ee1bd9');
 const old={};vm.runInNewContext(bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],old);const O=old.BWEngine;
 let a=capital(fresh(O,false),O),b=capital(fresh(E,false));assert.deepEqual(copy(a),copy(b));
 for(let month=0;month<6;month++){
  const pa=month?plans(a,O):launch(a,O),pb=month?plans(b):launch(b);
  for(const [g,p]of [[a,pa],[b,pb]]){
   if(month<4)p[0].investmentPolicy.pursue=true;
   if(month===4){p[0].investmentPolicy.inventorySale=20000;p[0].investmentPolicy.funding=[{clientId:owned(g)[0].id,amount:2000,destination:'cash'}];}
   if(month===5)p[0].investmentPolicy.cashOrders=[{clientId:owned(g)[0].id,mode:'moneyMarket',buffer:0}];
  }
  assert.deepEqual(copy(pa),copy(pb));a=next(a,pa,O);b=next(b,pb);assert.deepEqual(copy(a),copy(b));for(const i of [0,1])assert.deepEqual(copy(O.publicState(a,i)),copy(E.publicState(b,i)));
 }
});
