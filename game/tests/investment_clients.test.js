'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),c={};
vm.runInNewContext(['src/engine/accounting.js','src/engine/group-accounting.js','src/engine/investment-institution.js','src/engine/investment-clients.js','src/engine/investment-settlement.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n')+'\nthis.A=GroupAccounting;this.I=InvestmentInstitution;this.C=InvestmentClients;this.B=AccountingPrototype;this.S=InvestmentSettlement;',c);
const {A,I,C,B,S}=c,copy=x=>JSON.parse(JSON.stringify(x));let checks=0,months=0;
function test(name,fn){if(require.main!==module)return;fn();checks++;console.log('PASS '+name);}
function fixture(count=270,dealerCash=2000000){
 const parent=id=>A.post(A.opening(id+':parent'),'fixture.fixedOpeningCapital','fixture',{cash:5000000,equity:5000000});
 const positions=Array.from({length:count},(_,i)=>({id:'existing-wealth:'+i,market:'downtown',service:i%3===0?'brokerage':'advice',units:i%3===0?4000:1500,custodian:i%2?'atlas':'harbor'}));
 const dealer=A.post(A.opening('investment:dealer'),'fixture.fixedDealerCapital','fixture',{cash:dealerCash,equity:dealerCash});
 return {parents:[parent('a'),parent('b')],entities:[I.opening('a'),I.opening('b')],world:C.opening(positions,dealer),supplier:A.opening('investment:suppliers'),openingCash:10000000+dealerCash};
}
function totalCash(w){return w.parents.reduce((n,p)=>n+p.accounts.cash,0)+w.entities.reduce((n,e)=>n+e.book.accounts.cash,0)+w.supplier.accounts.cash+w.world.dealer.accounts.cash+w.world.clients.reduce((n,c)=>n+c.cash,0);}
function tick(original,plans=[{},{}],offering=[true,false],price=100){
 const before=JSON.stringify(original),w=copy(original),cycle=w.world.month+1;
 for(const i of [0,1]){const result=I.step(w.parents[i],w.entities[i],w.supplier,{...I.defaults(w.entities[i]),...plans[i]},cycle);
  w.parents[i]=result.parent;w.entities[i]=result.entity;w.supplier=result.supplier;}
 const result=C.step(w.world,w.entities,w.supplier,w.entities.map((e,i)=>({owner:e.owner,market:'downtown',reputation:80,pursue:offering[i]})),price);
 w.world=result.world;w.entities=result.entities;w.supplier=result.supplier;months++;
 assert.equal(JSON.stringify(original),before);assert.equal(totalCash(w)-w.world.outsideCashNet-w.world.bankCashNet,w.openingCash);
 for(const [i,e]of w.entities.entries()){assert.equal(e.capitalBasis,w.parents[i].accounts.investments);I.validate(e);}C.validate(w.world,w.entities);return w;
}
const advice={launch:true,capital:700000,roles:{adviser:1,broker:0,principal:0,operations:1}};
const brokerage={launch:true,capital:900000,advice:false,brokerage:true,roles:{adviser:0,broker:1,principal:1,operations:0}};
const owned={launch:true,capital:1600000,advice:true,brokerage:true,custody:'owned',roles:{adviser:1,broker:1,principal:1,operations:1}};
test('opening portfolios are finite identified assets, not subsidiary cash or bank deposits',()=>{
 const w=fixture();C.validate(w.world,w.entities);assert.equal(w.world.issuedUnits,630000);assert.equal(w.world.clients.length,270);
 assert.equal(w.world.custodians.atlas.accounts.custodyAssets+w.world.custodians.harbor.accounts.custodyAssets,63000000);
 assert.equal(w.entities[0].book.accounts.cash,0);assert.equal(w.world.dealer.accounts.cash,2000000);
 const bad=copy(w.world);bad.clients[0].units++;assert.throws(()=>C.validate(bad,w.entities),/securities/);
 const duplicate=copy(w.world);duplicate.clients[1].id=duplicate.clients[0].id;assert.throws(()=>C.validate(duplicate,w.entities),/duplicated/);
});
test('registration and qualified staff precede acquisition, then client-funded fees begin next month',()=>{
 let w=tick(fixture(),[advice,{}]);assert.equal(w.world.reports[0].won,0);assert.equal(w.world.feesPaid,0);
 w=tick(w);assert.equal(w.world.reports[0].won,0);
 w=tick(w);assert.equal(w.world.reports[0].won,40);assert.equal(w.world.reports[0].fees,0);
 assert.equal(w.entities[0].book.accounts.custodyAssets,0,'External custody is not the adviser balance sheet');
 const before=w.world.dealer.accounts.cash;w=tick(w);
 assert(w.world.reports[0].fees>0);assert(w.world.reports[0].providerCost>0);assert(w.world.dealer.accounts.cash<before);
 assert.equal(w.world.reports[0].serviced,40);assert(w.world.reports[0].serviced+w.world.reports[0].acquisitionWork<=200);
 assert(w.world.clients.filter(c=>c.owner==='a').every(c=>c.service==='advice'));
});
test('a brokerage can serve execution clients without pretending to have advisory permission',()=>{
 let w=tick(fixture(),[brokerage,{}]);for(let n=0;n<5;n++)w=tick(w);
 assert.equal(w.entities[0].report.permitted.advice,false);assert.equal(w.entities[0].report.permitted.brokerage,true);
 assert(w.world.reports[0].fees>0);assert(w.world.clients.filter(c=>c.owner==='a').every(c=>c.service==='brokerage'));
 assert.equal(w.entities[0].book.accounts.custodyAssets,0);
});
test('simultaneous offers select one provider, consume finite time and can win separate existing accounts',()=>{
 let w=tick(fixture(),[advice,advice],[true,true]);w=tick(w,[{},{}],[true,true]);w=tick(w,[{},{}],[true,true]);
 assert(w.world.reports.every(r=>r.won>0));assert.equal(w.world.reports.reduce((n,r)=>n+r.won,0),w.world.clients.filter(c=>c.owner!==null).length);
 for(let n=0;n<8;n++)w=tick(w,[{},{}],[true,true]);
 const a=w.world.clients.filter(c=>c.owner==='a').length;
 w=tick(w,[{feeBp:60},{}],[true,true]);assert(w.world.clients.filter(c=>c.owner==='a').length>a);
 assert(w.world.reports[1].lost>0);assert.equal(w.world.clients.length,270);
 const replay=tick(copy(w),[{},{}],[true,true]);assert.deepEqual(replay,tick(w,[{},{}],[true,true]));
});
test('a cash-limited dealer does not pay fees using unrealized portfolio value',()=>{
 let w=tick(fixture(270,0),[advice,{}]);for(let n=0;n<4;n++)w=tick(w);
 assert.equal(w.world.feesPaid,0);assert(w.world.reports[0].unpaidFees>0);assert.equal(w.world.dealerUnits,0);
 assert.equal(w.entities[0].book.accounts.cash,700000-43000-5*14900- // All billed service costs below are funded by the subsidiary, not the client.
  w.supplier.journal.filter(e=>e.source==='investment.assetService'&&e.counterparty===w.entities[0].book.entityId).reduce((n,e)=>n+e.earnings,0));
});
test('owned carrying safeguards assets separately while continuing to pay external clearing',()=>{
 let w=tick(fixture(),[owned,{}]);for(let n=0;n<12;n++)w=tick(w);
 assert.equal(w.entities[0].report.permitted.custody,true);assert(w.entities[0].book.accounts.custodyAssets>0);
 assert.equal(w.entities[0].book.accounts.custodyAssets,w.world.clients.filter(c=>c.custodian==='a').reduce((n,c)=>n+C.value(w.world,c),0));
 assert(w.entities[0].book.accounts.cash<w.entities[0].book.accounts.custodyAssets);
 assert.equal(w.entities[0].report.recurring,6500+6000+8500+4200+1200+9000+750);
 w=tick(w);assert.equal(w.entities[0].report.recurring,6500+6000+8500+4200+1200+9000+750+4*750);
});
test('provider projects preserve accounts and move the live book gradually after readiness',()=>{
 let w=tick(fixture(),[advice,{}]);for(let n=0;n<11;n++)w=tick(w);
 const clients=w.world.clients.filter(c=>c.owner==='a').map(c=>c.id);assert(clients.length>100);
 w=tick(w,[{provider:'harbor'},{}]);assert.equal(w.entities[0].policy.provider,'atlas');
 for(let n=0;n<2;n++)w=tick(w);
 // Education can consume the first migration month, so wait for the actual
 // funded work rather than assuming a calendar-only project completion.
 while(w.entities[0].migration)w=tick(w);
 const moved=w.world.clients.filter(c=>c.owner==='a'&&c.custodian==='harbor').length;
 assert(moved>0&&moved<clients.length,'One completion must not teleport the entire book');
 for(let n=0;n<4;n++)w=tick(w);
 assert(w.world.clients.filter(c=>clients.includes(c.id)).every(c=>c.owner==='a'&&c.custodian==='harbor'));
});
test('securities purchases consume actual deposits/cash and dealer inventory, without creating assets',()=>{
 let w=tick(fixture(),[advice,{}]);for(let n=0;n<5;n++)w=tick(w);
 const bank=B.opening(4),id=w.world.clients.find(c=>c.owner==='a').id,before=JSON.stringify(w),n=w.world.dealerUnits;
 assert(n>0);const r=C.depositPurchase(w.world,w.entities,bank,id,10000);
 assert.equal(bank.accounts.deposits-r.bank.accounts.deposits,r.paid);assert.equal(bank.accounts.cash-r.bank.accounts.cash,r.paid);
 assert.equal(r.world.bankCashNet-w.world.bankCashNet,r.paid);assert.equal(r.world.issuedUnits,w.world.issuedUnits);
 assert.equal(JSON.stringify(w),before);assert.throws(()=>C.depositPurchase(w.world,w.entities,bank,id,bank.accounts.cash+1),/exceeds/);
});
test('loss of permission gives three missed service months, not an asset seizure',()=>{
 let w=tick(fixture(),[advice,{}]);for(let n=0;n<4;n++)w=tick(w);const ids=w.world.clients.filter(c=>c.owner==='a').map(c=>c.id);
 w=tick(w,[{roles:{adviser:0,broker:0,principal:0,operations:1}},{}]);assert(w.world.clients.some(c=>c.owner==='a'));
 w=tick(w);w=tick(w);assert(w.world.clients.filter(c=>ids.includes(c.id)).every(c=>c.owner===null));
 assert.equal(w.world.reports[0].fees,0);assert.equal(w.world.issuedUnits,630000);
});
test('outside buyers finance dealer liquidity with real cash and receive existing securities',()=>{
 let w=tick(fixture(),[advice,{}]);for(let n=0;n<4;n++)w=tick(w);
 const investor=A.post(A.opening('corporate:outside'),'fixture.outsideCapital','fixture',{cash:10000,equity:10000}),before=JSON.stringify({w,investor});
 const buy=C.tradeOutside(w.world,w.entities,investor,'buy',10000);
 assert(buy.paid>0);assert.equal(buy.world.dealer.accounts.cash-w.world.dealer.accounts.cash,buy.paid);
 assert.equal(investor.accounts.cash-buy.investor.accounts.cash,buy.paid);assert.equal(buy.world.outsideUnits,buy.units);
 assert.equal(buy.world.dealerUnits+buy.world.outsideUnits,w.world.dealerUnits);
 assert.equal(buy.investor.accounts.businessAssets,buy.world.outsideBasis);assert.equal(JSON.stringify({w,investor}),before);
 w.world=buy.world;w=tick(w,[{},{}],[true,false],80);
 const sale=C.tradeOutside(w.world,w.entities,buy.investor,'sell',10000);
 assert.equal(sale.units,buy.units);assert.equal(sale.paid,buy.units*80);assert.equal(sale.realized,-buy.units*20);
 assert.equal(sale.world.outsideBasis,0);assert.equal(sale.world.outsideUnits,0);assert.equal(sale.investor.retainedEarnings,sale.realized);
 assert.equal(buy.investor.accounts.cash,0);assert.equal(C.tradeOutside(w.world,w.entities,buy.investor,'buy',10000).paid,0);
 assert.throws(()=>C.tradeOutside(w.world,w.entities,A.opening('foreign'),'buy',10000),/Invalid/);
});
if(require.main===module)console.log(JSON.stringify({status:'PASS',checks,months,scope:'Connected institution/client pure domain; finite counterparties and input purity checked. Not yet production campaign/UI integration or long-campaign balance acceptance.'}));
module.exports={fixture,tick,advice,brokerage,owned,A,I,C,S,totalCash};
