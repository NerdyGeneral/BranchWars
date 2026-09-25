'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const fixtureOnly=process.argv.includes('--fixture'),test=fixtureOnly?()=>{}:require('node:test').test;
const copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine;
function fresh(engine=E,sweeps=true){return engine.createGame({...engine.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,investmentCashVersion:1,...(sweeps?{investmentSweepVersion:1}:{}),mode:'hotseat',seed:'investment-standing-cash',created:1});}
function plans(g){return g.players.map((p,i)=>({...E.chooseBot(g,i),investmentPolicy:E.defaultInvestmentPlan(p)}));}
function resolve(g,p,reverse=false,restore=false){
 g=copy(g);const opening=g.players.map(b=>b.accounting.retainedEarnings),first=reverse?1:0;
 E.submit(g,first,copy(p[first]));if(restore)g=E.migrateCampaign(copy(g));E.submit(g,1-first,copy(p[1-first]));
 E.validatePilot(g);E.validateLedger(g);assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(g));
 for(const i of [0,1]){
  const v=E.publicState(g,i);E.validateFinancialGroupView(v);
  assert(v.earningsBridge.available,v.earningsBridge.reason);
  assert.equal(v.earningsBridge.opening,opening[i],'Investment/cash/deposit stages must preserve a complete earnings reconciliation');
  assert.equal(v.earningsBridge.closing,g.players[i].accounting.retainedEarnings);
 }
 return g;
}
function launch(){
 let g=fresh(),p=g.players[0],A=E.GroupAccounting,I=E.InvestmentInstitution;
 // Explicit outside-shareholder test capital. The production path supplies no
 // extra launch grant; client cash below comes from existing household savings.
 p.financialGroup.parent=A.post(p.financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:1000000,equity:1000000});E.validatePilot(g);
 let orders=plans(g);orders[0].investmentPolicy.institution={...I.defaults(p.investmentBusiness),launch:true,capital:700000,roles:{adviser:1,broker:0,principal:0,operations:1}};orders[0].investmentPolicy.pursue=true;g=resolve(g,orders);
 for(let n=0;n<3;n++){orders=plans(g);orders[0].investmentPolicy.pursue=true;g=resolve(g,orders);}
 const client=g.investmentEconomy.world.clients.find(c=>c.owner===p.id&&g.investmentEconomy.links.accounts.some(a=>a.clientId===c.id&&a.bankId===p.id));assert(client);
 orders=plans(g);orders[0].investmentPolicy.funding=[{clientId:client.id,amount:2000,destination:'cash'}];orders[0].investmentPolicy.inventorySale=10000;g=resolve(g,orders);assert.equal(g.players[0].investmentReport.transfers[0].paid,2000);
 return {g,clientId:client.id};
}

test('standing cash campaign preserves rules, rejects foreign ownership and starts without endowed cash books',()=>{
 const g=fresh();assert.equal(g.version,'9.15');assert.equal(g.investmentEconomy.world.version,3);assert.equal(g.investmentEconomy.world.cashRoutes.fund.shares,0);assert.equal(g.investmentEconomy.world.cashRoutes.external.accounts.cash,0);E.validatePilot(g);
 const v=E.publicState(g,0);E.validateFinancialGroupView(v);assert.equal(v.investmentSweepVersion,1);assert.equal(v.rival.investmentSweepVersion,undefined);
 for(const mutation of [x=>delete x.investmentSweepVersion,x=>x.version='9.14',x=>x.investmentSweepVersion=2,x=>x.players[0].investmentSweepDeposits.downtown=1,x=>x.investmentEconomy.world.cashRoutes.month++]){const b=copy(g);mutation(b);assert.throws(()=>E.migrateCampaign(b));}
 const orders=plans(g);orders[0].investmentPolicy.cashOrders=[{clientId:g.investmentEconomy.world.clients[0].id,mode:'external',buffer:0}];assert.throws(()=>resolve(g,orders),/belong|owning/);
});

test('all three standing routes settle actual cash, fees, bank liabilities and custody over saved simultaneous turns',()=>{
 const {g:base,clientId}=launch();
 for(const mode of ['affiliated','external','moneyMarket']){
  let g=copy(base),orders=plans(g);orders[0].investmentPolicy.cashOrders=[{clientId,mode,buffer:0}];
  const controlOrders=copy(orders);controlOrders[0].investmentPolicy.cashOrders=[];const control=resolve(g,controlOrders);
  const input=g,before=JSON.stringify({g:input,orders});g=resolve(input,orders);assert.equal(JSON.stringify({g:input,orders}),before,'Input game and instructions remain pure');
  assert.deepEqual(copy(g),copy(resolve(input,orders,true,true)));
  const w=g.investmentEconomy.world,r=w.cashRoutes.accounts.find(a=>a.clientId===clientId),c=w.clients.find(c=>c.id===clientId);
  assert.equal(r.mode,mode);assert.equal(r.buffer,0);assert(w.reports[0].cashWork>0);assert(w.reports[0].fees>0);assert.equal(w.reports[0].unpaidFees,0);
  assert.equal(c.cash,0,'Current quoted fee is left liquid and charged once, even with a zero chosen buffer');
  assert.deepEqual(copy(g.players[0].householdBook),copy(control.players[0].householdBook));
  assert.equal(g.players[0].accounting.accounts.equity,control.players[0].accounting.accounts.equity);
  assert.equal(g.players[0].accounting.accounts.deposits-control.players[0].accounting.accounts.deposits,mode==='affiliated'?r.deposit:0);
  if(mode==='moneyMarket')assert(r.shares>0&&w.cashRoutes.fund.securities>0);else assert(r.deposit>0);
  const owned=E.publicState(g,0).me.investmentSnapshot;assert(owned.cashPositions.find(x=>x.clientId===clientId).value>0);
  orders=plans(g);const next=resolve(g,orders);assert.equal(next.investmentEconomy.world.reports[0].unpaidFees,0,'Standing placements release the next fee without a second purchase order');
  assert.equal(next.investmentEconomy.links.transfers.length,1,'Sweeps do not withdraw a household twice');
  const corrupt=copy(next);corrupt.investmentEconomy.world.reports[0].cashWork=0;assert.throws(()=>E.migrateCampaign(corrupt),/processing work/);
  if(mode==='affiliated'){
   const closingOrders=plans(next);closingOrders[0].investmentPolicy.close=true;const closed=resolve(next,closingOrders);
   assert.equal(closed.players[0].investmentBusiness.status,'closed');assert.equal(closed.investmentEconomy.world.clients.find(x=>x.id===clientId).owner,null);
   const claim=closed.investmentEconomy.world.cashRoutes.accounts.find(x=>x.clientId===clientId);assert(claim.deposit>0);assert.equal(claim.bankId,closed.players[0].id,'Ending advice must not transfer or erase the customer deposit claim');
   const continuing=resolve(closed,plans(closed));assert.equal(continuing.investmentEconomy.world.cashRoutes.accounts.find(x=>x.clientId===clientId).deposit,claim.deposit);
  }
  orders=plans(next);orders[0].investmentPolicy.cashOrders=[{clientId,mode:'hold',buffer:0}];const held=resolve(next,orders);
  const a=held.investmentEconomy.world.cashRoutes.accounts.find(x=>x.clientId===clientId);assert.equal(a.deposit,0);assert.equal(a.shares,0);assert(held.investmentEconomy.world.clients.find(x=>x.id===clientId).cash>0);
  held.gameOver=true;E.rematch(held,0);E.rematch(held,1);E.validatePilot(held);assert.equal(held.version,'9.15');assert.equal(held.investmentEconomy.world.cashRoutes.received,0);assert(held.investmentEconomy.world.cashRoutes.accounts.every(x=>x.mode==='hold'));
 }
});

test('9.14 frozen creation and ordinary AI resolution remain exact without a sweep marker',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_cash1_2f0a92c3.html'));assert.equal(createHash('sha256').update(bytes).digest('hex'),'2f0a92c33af10d4cef329a904e285397efcdcb766e7efa6c73ff5cff08d1807f');
 const old={console};vm.runInNewContext(bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],old);
 const a=fresh(old.BWEngine,false),b=fresh(E,false);assert.deepEqual(copy(a),copy(b));
 for(let n=0;n<2;n++){const pa=a.players.map((p,i)=>old.BWEngine.chooseBot(a,i)),pb=b.players.map((p,i)=>E.chooseBot(b,i));assert.deepEqual(copy(pa),copy(pb));for(const i of [0,1]){old.BWEngine.submit(a,i,pa[i]);E.submit(b,i,pb[i]);}assert.deepEqual(copy(a),copy(b));assert.deepEqual(copy(old.BWEngine.publicState(a,0)),copy(E.publicState(b,0)));}
 assert.equal(E.migrateCampaign(copy(b)).investmentSweepVersion,undefined);
});

test('funded provider migration and outside reacquisition preserve securities, sweep claims and customer identity',()=>{
 const launched=launch(),clientId=launched.clientId;let g=launched.g,orders=plans(g);
 const client=()=>g.investmentEconomy.world.clients.find(c=>c.id===clientId);
 const position=()=>g.investmentEconomy.world.cashRoutes.accounts.find(a=>a.clientId===clientId);
 const owner=g.players[0].id;
 // A chosen buffer pays fees while the only operations employee works on the
 // migration. Zero buffer legitimately sells securities for those fees.
 orders[0].investmentPolicy.cashOrders=[{clientId,mode:'affiliated',buffer:100}];
 orders[0].investmentPolicy.funding=[{clientId,amount:1000,destination:'securities'}];
 g=resolve(g,orders);assert.equal(client().units,10);assert(position().deposit>0);
 const units=client().units,count=g.investmentEconomy.world.clients.length,sourceFunding=g.investmentEconomy.world.bankCashNet;
 orders=plans(g);orders[0].investmentPolicy.institution.provider='harbor';
 const beforeCash=g.players[0].investmentBusiness.book.accounts.cash;
 g=resolve(g,orders,true,true);
 assert(g.players[0].investmentBusiness.migration);assert.equal(client().custodian,'atlas');
 assert.equal(g.players[0].investmentBusiness.migration.to.provider,'harbor');
 assert(g.players[0].investmentBusiness.book.accounts.cash<beforeCash,'Provider implementation must be paid');
 let months=0;
 while(client().custodian!=='harbor'&&months++<8){
  const before=g.investmentEconomy.world.clients.filter(c=>c.owner===owner&&c.custodian==='harbor').length;
  g=resolve(g,plans(g),months%2===0,true);
  const entity=g.players[0].investmentBusiness,r=g.investmentEconomy.world.reports[0];
  if(entity.migration)assert.equal(client().custodian,'atlas','Pending implementation cannot transfer custody');
  assert.equal(client().units,units);assert.equal(position().bankId,owner);
  assert.equal(g.investmentEconomy.world.bankCashNet,sourceFunding,'Custody migration is not another bank-funded purchase');
  assert(r.migrated*5+r.cashWork<=entity.report.permitted.available.operations/4*E.InvestmentInstitution.ROLES.operations.capacity);
  assert.equal(g.investmentEconomy.world.clients.filter(c=>c.owner===owner&&c.custodian==='harbor').length-before,r.migrated);
 }
 assert.equal(client().custodian,'harbor');assert(months>=2,'Not an instantaneous delivery change');
 // Withdraw the advice service deliberately. Three missed service months must
 // release the relationship, not delete its source-funded assets or bank claim.
 for(let n=0;n<3;n++){orders=plans(g);orders[0].investmentPolicy.institution.advice=false;g=resolve(g,orders);}
 assert.equal(client().owner,null);assert.equal(client().custodian,'harbor');assert.equal(client().units,units);assert.equal(position().bankId,owner);
 const outsideValue=E.InvestmentClients.value(g.investmentEconomy.world,client()),deposit=position().deposit;
 orders=plans(g);orders[0].investmentPolicy.institution.advice=true;orders[0].investmentPolicy.pursue=true;orders[0].investmentPolicy.market=client().market;
 g=resolve(g,orders,true,true);
 assert.equal(client().owner,owner);assert.equal(client().custodian,'harbor');assert.equal(client().units,units);
 assert.equal(E.InvestmentClients.value(g.investmentEconomy.world,client()),outsideValue,'Winning the existing outside account cannot mint or destroy assets');
 assert.equal(position().deposit,deposit);assert.equal(position().affiliate,owner);
 assert.equal(g.investmentEconomy.world.clients.length,count);assert.equal(g.investmentEconomy.world.bankCashNet,sourceFunding);
 assert.equal(g.players[0].investmentReport.transfers.length,0);
 assert(g.investmentEconomy.world.reports[0].won>0);
});
test('funded owned carrying requires maintained professionals and preserves accounts through closure',()=>{
 const started=launch(),clientId=started.clientId;let g=started.g,orders=plans(g);
 const owner=g.players[0].id,client=()=>g.investmentEconomy.world.clients.find(c=>c.id===clientId),position=()=>g.investmentEconomy.world.cashRoutes.accounts.find(a=>a.clientId===clientId);
 orders[0].investmentPolicy.cashOrders=[{clientId,mode:'affiliated',buffer:100}];
 orders[0].investmentPolicy.funding=[{clientId,amount:1000,destination:'securities'}];g=resolve(g,orders);
 // Additional disclosed outside-shareholder test capital buys the expensive
 // owned model. This is not an ordinary-starting-bank viability assertion.
 g.players[0].financialGroup.parent=E.GroupAccounting.post(g.players[0].financialGroup.parent,'fixture.carryingCapital','external-shareholder',{cash:1000000,equity:1000000});E.validatePilot(g);
 orders=plans(g);Object.assign(orders[0].investmentPolicy.institution,{capital:900000,custody:'owned',brokerage:true,roles:{adviser:1,broker:1,principal:1,operations:2}});
 const q=E.InvestmentInstitution.quote(g.players[0].investmentBusiness,orders[0].investmentPolicy.institution,g.cycle);
 assert.equal(q.minimumCapital,E.InvestmentInstitution.RULES.capitalOwned);assert(q.upfront>=E.InvestmentInstitution.RULES.custodyImplementation+E.InvestmentInstitution.RULES.brokerApplication);
 assert.equal(q.permissions.custody,false,'Paying implementation does not grant immediate carrying permission');
 g=resolve(g,orders,true,true);assert.equal(client().custodian,'atlas');assert(g.players[0].investmentBusiness.migration);
 const sourceFunding=g.investmentEconomy.world.bankCashNet,units=client().units;let months=0;
 while(client().custodian!==owner&&months++<9){
  g=resolve(g,plans(g),months%2===0,true);
  const b=g.players[0].investmentBusiness;
  if(!b.report.permitted.custody)assert.notEqual(client().custodian,owner);
  assert.equal(client().units,units);assert.equal(position().bankId,owner);assert.equal(g.investmentEconomy.world.bankCashNet,sourceFunding);
 }
 assert.equal(client().custodian,owner);assert(months>=4,'Permission and migration take actual months');
 let b=g.players[0].investmentBusiness,w=g.investmentEconomy.world;
 assert(b.report.permitted.custody);assert(b.book.accounts.custodyAssets>0);
 assert.equal(b.book.accounts.custodyAssets,w.clients.filter(c=>c.custodian===owner).reduce((n,c)=>n+E.InvestmentClients.value(w,c),0));
 assert.equal(b.book.accounts.custodyAssets,b.book.accounts.custodyLiabilities);
 assert(b.report.recurring>=E.InvestmentInstitution.RULES.ownedControls+E.InvestmentInstitution.RULES.clearing,'Owned custody continues to buy external clearing');
 const bad=plans(g);bad[0].investmentPolicy.institution.dividend=b.book.accounts.cash+b.book.accounts.custodyAssets;assert.throws(()=>resolve(g,bad),'Customer assets cannot finance a parent dividend');
 // Losing the securities principal removes operating permission even though
 // the organization owns its platform. A paid replacement arrives later.
 orders=plans(g);orders[0].investmentPolicy.institution.roles.principal=0;g=resolve(g,orders);
 assert.equal(g.players[0].investmentBusiness.report.permitted.custody,false);assert.equal(client().missed,1);assert.equal(client().owner,owner);
 orders=plans(g);orders[0].investmentPolicy.institution.roles.principal=1;g=resolve(g,orders);assert.equal(client().missed,2);
 g=resolve(g,plans(g));assert(g.players[0].investmentBusiness.report.permitted.custody);assert.equal(client().missed,0);
 const claim=position().deposit,identities=w.clients.map(c=>c.id),accountValue=E.InvestmentClients.value(g.investmentEconomy.world,client()),paidFees=client().fees;
 orders=plans(g);orders[0].investmentPolicy.close=true;g=resolve(g,orders,true,true);
 assert.equal(g.players[0].investmentBusiness.status,'closed');assert.equal(g.players[0].investmentBusiness.book.accounts.custodyAssets,0);
 assert.equal(client().owner,null);assert.equal(client().custodian,'atlas');assert.equal(client().units,units);
 assert.equal(E.InvestmentClients.value(g.investmentEconomy.world,client()),accountValue-(client().fees-paidFees));
 assert(position().deposit>0&&position().deposit<=claim);assert.equal(position().bankId,owner);
 assert.deepEqual(g.investmentEconomy.world.clients.map(c=>c.id),identities);assert.equal(g.investmentEconomy.world.bankCashNet,sourceFunding);
});
if(fixtureOnly){
 const {g,clientId}=launch(),orders=plans(g);orders[0].investmentPolicy.cashOrders=[{clientId,mode:'external',buffer:250}];
 const candidate=resolve(g,orders),destination=path.join(__dirname,'../output/investment-sweep-browser-qa.json');
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(candidate,null,2));
 console.log(JSON.stringify({fixture:destination,version:candidate.version,cycle:candidate.cycle,note:'Generated QA campaign with disclosed outside-shareholder launch capital; not a player save or balance result.'}));
}
