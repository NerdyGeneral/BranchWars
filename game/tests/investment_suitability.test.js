'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const routes={};vm.runInNewContext(['accounting','group-accounting','investment-suitability','investment-cash-routes'].map(f=>fs.readFileSync(path.join(__dirname,'../src/engine/'+f+'.js'),'utf8')).join('\n')+'\nthis.R=InvestmentCashRoutes;this.A=AccountingPrototype;',routes);
const E=ctx.BWEngine,S=E.InvestmentSuitability;
function fresh(engine=E,suitability=true){return engine.createGame({...engine.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,investmentSweepVersion:1,investmentChoiceVersion:1,investmentIncomeVersion:1,...(suitability?{investmentSuitabilityVersion:1}:{}),mode:'hotseat',seed:'suitable-investments',created:1});}
function plans(g,engine=E){return g.players.map((p,i)=>({...engine.chooseBot(g,i),investmentPolicy:engine.defaultInvestmentPlan(p)}));}
function next(g,orders,engine=E,reverse=false){const n=copy(g);engine.submit(n,reverse?1:0,copy(orders[reverse?1:0]));const restored=engine.migrateCampaign(n);engine.submit(restored,reverse?0:1,copy(orders[reverse?0:1]));engine.validatePilot(restored);engine.validateLedger(restored);for(const i of [0,1])engine.validateFinancialGroupView(engine.publicState(restored,i));return restored;}
function capital(g,engine=E){g.players[0].financialGroup.parent=engine.GroupAccounting.post(g.players[0].financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:1000000,equity:1000000});return g;}
function launch(g,engine=E){const o=plans(g,engine);o[0].investmentPolicy.institution={...o[0].investmentPolicy.institution,launch:true,capital:700000,feeBp:60,roles:{adviser:1,broker:0,principal:0,operations:1}};o[0].investmentPolicy.pursue=true;return o;}

test('stable mandates and integer purchase limits count fund risk, not deposits, without mutation',()=>{
 const seen=new Set();
 for(let i=0;i<50;i++){
  const c={id:'customer:'+i,cash:10000,units:0},p={deposit:5000,value:5000},before=JSON.stringify({c,p}),q=S.assess(c,100,p);seen.add(q.key);
  assert.equal(JSON.stringify({c,p}),before);assert.equal(q.exposure,0);assert.equal(q.total,15000);
  assert.equal(S.mandate({...c,owner:'rival'}).key,q.key);
  const bought=S.assess({...c,units:q.purchaseLimit/100},100,p);assert.equal(bought.excess,0);
  assert(S.assess({...c,units:q.purchaseLimit/100+1},100,p).excess>0);
  assert.equal(S.assess(c,100,{deposit:0,value:5000}).exposure,5000);
 }
 assert.equal(seen.size,3);assert.throws(()=>S.assess({id:'bad',cash:-1,units:0},100));
});

test('all mandates limit actual fund placements, retain consent, share finite work and preserve cash for 120 route months',()=>{
 const G=E.GroupAccounting,A=routes.A,R=routes.R,clients=[];
 for(let i=0;clients.length<3;i++){const c={id:'customer:'+i,owner:'bank:a',cash:10000,units:0};if(!clients.some(x=>S.mandate(x).key===S.mandate(c).key))clients.push(c);}
 const banks=['bank:a','bank:b'].map(id=>({id,book:A.opening(4),work:10}));banks[0].book=A.post(banks[0].book,'fixture.customerWithdrawal',{cash:-30000,deposits:-30000});
 const dealer=G.post(G.opening('investment:dealer'),'fixture.existingDealer','outside-shareholder',{cash:50000,businessAssets:100000,equity:150000});
 let w={book:R.opening(clients),clients,banks,market:{dealer,units:1000,price:100}};
 const cash=x=>x.clients.reduce((n,c)=>n+c.cash,0)+x.banks.reduce((n,b)=>n+b.book.accounts.cash,0)+x.book.external.accounts.cash+x.book.fund.book.accounts.cash+x.market.dealer.accounts.cash;
 const initial=cash(w),orders=clients.map(c=>({owner:c.owner,clientId:c.id,mode:'moneyMarket',buffer:0}));
 const before=JSON.stringify(w),first=R.step(w,orders,1,[],1);assert.equal(JSON.stringify(w),before);assert.deepEqual(copy(first),copy(R.step(w,orders.slice().reverse(),1,[],1)));
 assert(first.book.report.every(r=>r.reason==='suitability'));assert(first.book.accounts.every(r=>r.buffer===0));
 w=first;
 for(let month=2;month<=120;month++){
  w=R.step(w,[],month,[],1);assert.equal(cash(w),initial);assert.equal(w.market.units+w.book.fund.securities,1000);
  for(const c of w.clients){const a=w.book.accounts.find(a=>a.clientId===c.id);assert.equal(S.assess(c,100,{deposit:a.deposit,value:R.value(w.book,c.id,100)}).excess,0);}
 }
 const ending=R.step(w,clients.map(c=>({owner:c.owner,clientId:c.id,mode:'hold',buffer:0})),121,[],1);
 assert.equal(ending.book.fund.shares,0);assert.equal(cash(ending),initial);assert(ending.clients.every(c=>c.cash===10000));
});

test('9.18 campaign enforces purchases and actual fund limits with private, persistent, compatible rules',()=>{
 let g=capital(fresh()),old=fresh(E,false);assert.equal(g.version,'9.18');assert.equal(old.version,'9.17');assert.equal(old.investmentSuitabilityVersion,undefined);
 for(const change of [x=>delete x.investmentSuitabilityVersion,x=>x.version='9.17',x=>x.investmentSuitabilityVersion=2,x=>delete x.investmentEconomy.world.suitabilityVersion]){const b=copy(g);change(b);assert.throws(()=>E.migrateCampaign(b));}
 const caps=E.campaignCapabilities();delete caps.investmentSuitabilitySupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'investmentSuitabilityVersion');
 g=next(g,launch(g));for(let n=0;n<3;n++){const o=plans(g);o[0].investmentPolicy.pursue=true;g=next(g,o);}
 const owner=g.players[0].id,sources=new Set(g.investmentEconomy.links.accounts.filter(a=>a.bankId===owner).map(a=>a.clientId)),owned=g.investmentEconomy.world.clients.filter(c=>c.owner===owner&&sources.has(c.id)),client=owned[0],direct=owned[1];assert(client&&direct);
 let o=plans(g);o[0].investmentPolicy.inventorySale=20000;o[0].investmentPolicy.funding=[{clientId:client.id,amount:1000,destination:'securities'}];
 const v=E.publicState(g,0),before=JSON.stringify(g);assert.throws(()=>E.investmentPlanReview(v.me,o[0],v),/liquid reserves/);assert.throws(()=>E.submit(copy(g),0,copy(o[0])),/liquid reserves/);assert.equal(JSON.stringify(g),before);
 o[0].investmentPolicy.funding[0].destination='cash';o[0].investmentPolicy.funding.push({clientId:direct.id,amount:1000,destination:'cash'});g=next(g,o);assert.equal(g.players[0].investmentReport.transfers.reduce((n,r)=>n+r.paid,0),2000);
 o=plans(g);o[0].investmentPolicy.cashOrders=[{clientId:client.id,mode:'moneyMarket',buffer:0}];
 o[0].investmentPolicy.funding=[{clientId:direct.id,amount:100,destination:'securities'}];
 const result=next(g,o);assert.deepEqual(copy(result),copy(next(g,o,E,true)));g=result;
 const w=g.investmentEconomy.world,c=w.clients.find(c=>c.id===client.id),fit=S.assess(c,w.price,S.position(w,c)),route=w.cashRoutes.accounts.find(a=>a.clientId===c.id);
 assert.equal(w.clients.find(c=>c.id===direct.id).units,1);assert.equal(g.players[0].investmentReport.transfers[0].paid,100,'A funded suitable direct purchase must still settle');
 assert(route.shares>0);assert.equal(route.buffer,0);
 // Record-date fund earnings arrive AFTER placement. Retained income may move
 // the ratio slightly above its limit; it is not forcibly sold or discarded.
 const statement=E.publicState(g,0).me.investmentSnapshot.income.accounts.find(a=>a.clientId===c.id),position=S.position(w,c);
 assert.equal(S.assess({...c,cash:c.cash-statement.lastPaid},w.price,{...position,value:position.value-statement.fundIncome}).excess,0,'Placement itself must fit before subsequent distributions');
 assert(fit.excess<=statement.fundIncome);assert.equal(w.cashRoutes.report.find(a=>a.clientId===c.id).reason,'suitability');
 assert.equal(E.publicState(g,1).rival.investmentSnapshot,undefined);const good=E.publicState(g,0);assert.equal(good.investmentSuitabilityVersion,1);
 const forged=copy(good);forged.me.investmentSuitabilityVersion=1;assert.throws(()=>E.validateFinancialGroupView(forged));
 if(process.argv.includes('--fixture'))fs.writeFileSync(path.join(__dirname,'../output/investment-suitability-browser-qa.json'),JSON.stringify(g));
 g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'9.18');assert.equal(g.investmentEconomy.world.suitabilityVersion,1);E.validatePilot(g);
});

test('preserved 9.17 creation, funded service, AI/RNG, half-ready saves and both owner views match exactly',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_income1_8d4a9fda.html'));assert.equal(createHash('sha256').update(bytes).digest('hex'),'8d4a9fdabd03cfffb3dc96eaf2e9c6e65f4c4a01f3a3e92ee5aa736632f4e4b6');
 const old={};vm.runInNewContext(bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],old);const O=old.BWEngine;
 let a=capital(fresh(O,false),O),b=capital(fresh(E,false));assert.deepEqual(copy(a),copy(b));
 for(let month=0;month<4;month++){const pa=month?plans(a,O):launch(a,O),pb=month?plans(b):launch(b);assert.deepEqual(copy(pa),copy(pb));a=next(a,pa,O);b=next(b,pb);assert.deepEqual(copy(a),copy(b));for(const i of [0,1])assert.deepEqual(copy(O.publicState(a,i)),copy(E.publicState(b,i)));}
});
