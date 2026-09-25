'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine;
function fresh(engine=E,income=true){return engine.createGame({...engine.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,investmentSweepVersion:1,investmentChoiceVersion:1,...(income?{investmentIncomeVersion:1}:{}),mode:'hotseat',seed:'funded-investment-income',created:1});}
function plans(g,engine=E){return g.players.map((p,i)=>({...engine.chooseBot(g,i),investmentPolicy:engine.defaultInvestmentPlan(p)}));}
function next(g,o,engine=E,reverse=false){const n=copy(g);engine.submit(n,reverse?1:0,copy(o[reverse?1:0]));const saved=engine.migrateCampaign(n);engine.submit(saved,reverse?0:1,copy(o[reverse?0:1]));engine.validatePilot(saved);engine.validateLedger(saved);for(const i of [0,1])engine.validateFinancialGroupView(engine.publicState(saved,i));return saved;}
function capital(g,engine=E){const p=g.players[0];p.financialGroup.parent=engine.GroupAccounting.post(p.financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:1000000,equity:1000000});return g;}
function launch(g,engine=E){const o=plans(g,engine);o[0].investmentPolicy.institution={...o[0].investmentPolicy.institution,launch:true,capital:700000,feeBp:60,roles:{adviser:1,broker:0,principal:0,operations:1}};o[0].investmentPolicy.pursue=true;return o;}

test('fractional income and limited cash are conserved over 480 ledger months, with stable proportional rounding',()=>{
 const I=E.InvestmentIncome,holdings=[{id:'$dealer',units:21},{id:'$fund',units:39},{id:'a',units:1},{id:'b',units:1}];
 let b=I.opening([{id:'a'},{id:'b'}]),cash=1000;
 for(let month=1;month<=480;month++){
  const input=JSON.stringify(b),n=I.prepare(b,holdings,month,625,cash),paid=n.paid-b.paid;
  assert.equal(JSON.stringify(b),input);assert.deepEqual(copy(n),copy(I.prepare(b,holdings.slice().reverse(),month,625,cash)));
  assert(paid<=cash);cash-=paid;b=n;assert.equal(cash+b.paid,1000);
 }
 assert.equal(cash,0);assert(b.report.some(r=>r.due>r.paid));assert.equal(b.accounts.find(a=>a.id==='a').carry,0);
 assert.throws(()=>I.prepare(b,holdings,480,625,10),/repeated/);
 const broken=copy(b);broken.report[0].due++;assert.throws(()=>I.validate(broken,holdings.map(h=>h.id)),/arithmetic/);
});

test('income creation is explicit, source-backed and refuses unsupported markers, snapshots and peers',()=>{
 const g=fresh(),old=fresh(E,false);assert.equal(g.version,'9.17');assert.equal(g.investmentEconomy.world.income.paid,0);
 assert.equal(g.companyEconomy.outside.accounts.cash,old.companyEconomy.outside.accounts.cash);assert.equal(g.investmentEconomy.world.issuedUnits,0);
 const v=E.publicState(g,0);assert.equal(v.investmentIncomeVersion,1);assert.deepEqual(copy(v.me.investmentSnapshot.income.accounts),[]);
 for(const change of [x=>delete x.investmentIncomeVersion,x=>x.version='9.16',x=>x.investmentIncomeVersion=2,x=>delete x.investmentEconomy.world.income,x=>x.companyEconomy.investmentMarket.incomePaid++,x=>x.investmentEconomy.world.cashRoutes.incomeReceived++]){const b=copy(g);change(b);assert.throws(()=>E.migrateCampaign(b));}
 const badView=copy(v);badView.me.investmentSnapshot.income.accounts.push({clientId:'foreign',totalPaid:0,lastPaid:0,lastDue:0,fundIncome:0});assert.throws(()=>E.validateFinancialGroupView(badView));
 const caps=E.campaignCapabilities();delete caps.investmentIncomeSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'investmentIncomeVersion');
 assert.equal(E.migrateCampaign(copy(old)).investmentIncomeVersion,undefined);
 g.gameOver=true;E.rematch(g,0);E.rematch(g,1);assert.equal(g.version,'9.17');assert.equal(g.investmentEconomy.world.income.paid,0);E.validatePilot(g);
});

test('actual securities and money-market holdings receive funded income once; new purchases wait and ownership stays separate',()=>{
 let g=capital(fresh());g=next(g,launch(g));
 for(let n=0;n<3;n++){const o=plans(g);o[0].investmentPolicy.pursue=true;g=next(g,o);}
 const owner=g.players[0].id,source=new Set(g.investmentEconomy.links.accounts.filter(a=>a.bankId===owner).map(a=>a.clientId));
 const clients=g.investmentEconomy.world.clients.filter(c=>c.owner===owner&&source.has(c.id));assert(clients.length>=2);
 const direct=clients[0].id,fund=clients[1].id;let o=plans(g);o[0].investmentPolicy.inventorySale=20000;
 o[0].investmentPolicy.funding=[{clientId:direct,amount:1000,destination:'securities'},{clientId:fund,amount:2000,destination:'cash'}];g=next(g,o);
 assert.equal(g.investmentEconomy.world.income.paid,0,'New month-end purchases cannot earn earlier in their purchase month');
 assert.equal(g.players[0].investmentReport.transfers.reduce((n,r)=>n+r.paid,0),3000);
 o=plans(g);o[0].investmentPolicy.cashOrders=[{clientId:fund,mode:'moneyMarket',buffer:100}];
 const input=JSON.stringify({g,o}),earned=next(g,o);assert.equal(JSON.stringify({g,o}),input);assert.deepEqual(copy(earned),copy(next(g,o,E,true)));
 const w=earned.investmentEconomy.world,r=w.income.report.find(r=>r.id===direct),fr=w.income.report.find(r=>r.id==='$fund');
 assert(r.paid>0);assert(fr.paid>0);assert.equal(w.cashRoutes.incomeReceived,fr.paid);assert.equal(w.cashRoutes.fund.book.retainedEarnings,fr.paid);
 assert.equal(w.clients.find(c=>c.id===direct).cash,r.paid,'Direct income is customer cash, not subsidiary revenue');
 assert.equal(earned.companyEconomy.investmentMarket.incomePaid,w.income.paid);
 const expense=earned.companyEconomy.outside.journal.findLast(r=>r.source==='investment.distribution');assert.equal(expense.earnings,-w.income.paid);assert.equal(expense.changes.cash,-w.income.paid);
 assert.equal(earned.players[0].investmentBusiness.book.retainedEarnings,g.players[0].investmentBusiness.book.retainedEarnings-earned.players[0].investmentBusiness.report.recurring-w.reports[0].providerCost+w.reports[0].fees);
 const v=E.publicState(earned,0);assert.equal(v.me.investmentSnapshot.income.accounts.find(a=>a.clientId===direct).lastPaid,r.paid);assert.equal(v.rival.investmentSnapshot,undefined);
 assert.equal(v.me.investmentSnapshot.income.accounts.find(a=>a.clientId===fund).fundIncome,fr.paid,'A sole fund investor sees all retained fund income without duplicating account cash');
 assert.throws(()=>E.InvestmentCorporateMarket.distribute(earned.companyEconomy,w,earned.players.map(p=>p.investmentBusiness),625),/unpaid completed month/);
 const prepared=E.InvestmentSettlement.advance({parents:earned.players.map(p=>p.financialGroup.parent),entities:earned.players.map(p=>p.investmentBusiness),world:w,supplier:earned.investmentEconomy.supplier,banks:earned.players.map(p=>({id:p.id,book:p.accounting}))},earned.players.map(p=>E.InvestmentInstitution.defaults(p.investmentBusiness)),earned.players.map(p=>({owner:p.id,market:p.focus,reputation:p.stats.reputation,pursue:false})),w.price,{reservedParentCash:[0,0],close:[false,false],cashOrders:[]});
 const zero=E.GroupAccounting.opening('corporate:outside'),dry=E.InvestmentClients.distributeIncome(prepared.world,prepared.entities,zero,625);
 assert.equal(dry.paid,0);assert(dry.world.income.report.some(r=>r.due>r.paid));assert.deepEqual(copy(dry.issuer),copy(zero));
 const small=E.GroupAccounting.post(zero,'fixture.issuerCash','external-shareholder',{cash:3,equity:3}),limited=E.InvestmentClients.distributeIncome(prepared.world,prepared.entities,small,625);
 assert.equal(limited.paid,3);assert.equal(limited.issuer.accounts.cash,0);assert.equal(limited.world.income.paid,prepared.world.income.paid+3);
 const liquidity=x=>x.dealer.accounts.cash+x.cashRoutes.fund.book.accounts.cash+x.clients.reduce((n,c)=>n+c.cash,0);
 assert.equal(liquidity(limited.world)-liquidity(prepared.world),3,'Partial issuer payments are the only new recipient cash');
 const corrupt=copy(earned);corrupt.investmentEconomy.world.income.month--;assert.throws(()=>E.migrateCampaign(corrupt),/completed matching/);
 // Disclosure: this QA campaign uses the explicit shareholder fixture above.
 if(process.argv.includes('--fixture'))fs.writeFileSync(path.join(__dirname,'../output/investment-income-browser-qa.json'),JSON.stringify(earned));
 o=plans(earned);o[0].investmentPolicy.cashOrders=[{clientId:fund,mode:'hold',buffer:0}];const redeemed=next(earned,o);
 assert.equal(redeemed.investmentEconomy.world.cashRoutes.accounts.find(a=>a.clientId===fund).shares,0);
 assert(redeemed.investmentEconomy.world.clients.find(c=>c.id===fund).cash>1900,'Fund income can be redeemed with its principal, after actual fees');
 console.log(JSON.stringify({month:w.month,directIncome:r.paid,fundIncome:fr.paid,issuerPaid:w.income.paid,scope:'funded integration fixture, not ordinary campaign balance'}));
});

test('9.16 funded creation, AI/RNG, servicing, save/resume and public views match the preserved build exactly',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_choice1_90d0d4e1.html'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'90d0d4e10075fb3f7a7f73f97856c4a6b3f24feec738d3fedb2b3a956138198e');
 const old={};vm.runInNewContext(bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],old);const O=old.BWEngine;
 let a=capital(fresh(O,false),O),b=capital(fresh(E,false));assert.deepEqual(copy(a),copy(b));
 for(let month=0;month<4;month++){const pa=month?plans(a,O):launch(a,O),pb=month?plans(b):launch(b);assert.deepEqual(copy(pa),copy(pb));a=next(a,pa,O);b=next(b,pb);assert.deepEqual(copy(a),copy(b));for(const i of [0,1])assert.deepEqual(copy(O.publicState(a,i)),copy(E.publicState(b,i)));}
});
