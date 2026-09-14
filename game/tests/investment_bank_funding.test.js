'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
const engine=require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
vm.runInNewContext(engine.replace('root.BWEngine={','root.fundingTest={InvestmentInstitution,InvestmentClients,InvestmentSettlement,InvestmentBankFunding,GroupAccounting,productPrincipalGrid};root.BWEngine={'),ctx);
const E=ctx.BWEngine,{InvestmentInstitution:I,InvestmentClients:C,InvestmentSettlement:S,InvestmentBankFunding:F,GroupAccounting:A,productPrincipalGrid:grid}=ctx.fundingTest;
const {test}=require('node:test');
function fixture(units=10000){
 const g=E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,mode:'hotseat',seed:'investment-real-deposits',created:1});
 for(let n=0;n<3;n++){const plans=g.players.map((p,i)=>E.chooseBot(g,i));E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);}
 const id=g.players[0].id,market=g.players[0].focus;
 const dealer=A.post(A.opening('investment:dealer'),'fixture.existingDealer','fixture',{cash:2000000,equity:2000000});
 let w={parents:g.players.map(p=>A.post(A.opening(p.id+':parent'),'fixture.parent','fixture',{cash:2000000,equity:2000000})),
  entities:g.players.map(p=>I.opening(p.id)),world:C.opening([{id:'authorized-customer',market,service:'advice',units,custodian:'atlas'}],dealer),supplier:A.opening('investment:suppliers')};
 for(let cycle=1;cycle<=g.cycle;cycle++)w=S.advance(w,w.entities.map((e,i)=>({...I.defaults(e),...(cycle===1&&i===0?{launch:true,capital:700000,roles:{adviser:1,broker:0,principal:0,operations:1}}:{})})),w.entities.map((e,i)=>({owner:e.owner,market,reputation:80,pursue:i===0})),100);
 assert.equal(w.world.clients[0].owner,id);if(units)assert(w.world.dealerUnits>0);
 const links={version:2,accounts:[{clientId:'authorized-customer',bankId:id,market,segment:'reserve',limit:10000,lastCycle:0,funded:0}],transfers:[]};
 return {g,w,links,order:{clientId:'authorized-customer',amount:10000,cycle:g.cycle}};
}
const f=fixture();
test('purchase removes actual unlocked source cohorts and cash without creating deposits elsewhere',()=>{
 const {g,w,links,order}=f,before=JSON.stringify(f),p=g.players[0],client=w.world.clients[0];
 const q=F.review(g,w.world,w.entities,links,order),r=F.purchase(g,w.world,w.entities,links,order),after=r.campaign.players[0];
 assert(q.paid>0);assert.equal(JSON.stringify(f),before);assert.equal(p.accounting.accounts.cash-after.accounting.accounts.cash,q.paid);
 assert.equal(p.accounting.accounts.deposits-after.accounting.accounts.deposits,q.paid);assert.equal(after.accounting.accounts.equity,p.accounting.accounts.equity);
 assert.equal(after.stats.customers,p.stats.customers);assert.deepEqual(copy(after.householdBook),copy(p.householdBook));
 assert.equal(after.marketBook.markets[p.focus].deposits,p.marketBook.markets[p.focus].deposits-q.paid);
 const m=g.marketEconomy.markets[p.focus],n=r.campaign.marketEconomy.markets[p.focus];
 assert.deepEqual(copy(n.community),copy(m.community));assert.deepEqual(copy(n.union),copy(m.union));assert.equal(n.total.deposits,m.total.deposits-q.paid);
 assert.equal(r.world.clients[0].units-client.units,q.paid/w.world.price);assert.equal(r.world.bankCashNet-w.world.bankCashNet,q.paid);
 const a=grid(p),b=grid(after);assert.equal(Object.keys(a).reduce((sum,k)=>sum+a[k]-b[k],0),q.paid);
 for(const k of Object.keys(a))if(!k.startsWith(p.focus+'/reserve/'))assert.equal(a[k],b[k]);
 assert.deepEqual(copy(after.depositBook.cohorts.filter(c=>c.locked)),copy(p.depositBook.cohorts.filter(c=>c.locked)));
 F.validateLinks(r.links,r.world);
 assert.deepEqual(copy(r.campaign.regionalGrowth),copy(g.regionalGrowth),'Never rewrite opening savings, growth rates, carries or household departures');
 const resources=F.regionalResources(r.campaign,r.world,r.entities,r.links);
 assert.equal(resources.reduce((n,row)=>n+row.netOutflow,0),q.paid);
 for(const row of resources)assert.equal(row.supplied,row.deposited+row.netOutflow);
 assert.throws(()=>F.apply(g,w.world,w.entities,links,order),/ordered deposit closing/,'Preview cannot bypass the monthly settlement boundary');
});
test('an unversioned legacy campaign cannot silently adopt investment outflows',()=>{
 const r=F.purchase(f.g,f.w.world,f.w.entities,f.links,f.order);
 assert.throws(()=>E.migrateCampaign(r.campaign),/pricing|regional growth/i);
 // The former injected-closing experiment is now covered by the stronger
 // investment_campaign.test.js: real creation/formation/qualification/funding,
 // normal E.submit settlement, exact opposite-order replay and half-ready load.
 // No test replacement of finishProductPricingReview remains.
});
test('authorization, month, source ownership and liquidity failures preserve every input',()=>{
 const {g,w,links,order}=f,before=JSON.stringify(f);
 for(const invalid of [{...order,cycle:order.cycle-1},{...order,amount:10001},{...order,amount:0},{...order,clientId:'unknown'}])assert.throws(()=>F.purchase(g,w.world,w.entities,links,invalid));
 const wrong=copy(links);wrong.accounts[0].bankId=g.players[1].id;assert.throws(()=>F.purchase(g,w.world,w.entities,wrong,order),/relationship/);
 const noHousehold=copy(g);noHousehold.players[0].householdBook.markets[g.players[0].focus].reserve=0;assert.throws(()=>F.purchase(noHousehold,w.world,w.entities,links,order),/savings/);
 const r=F.purchase(g,w.world,w.entities,links,order);assert.throws(()=>F.purchase(r.campaign,r.world,r.entities,r.links,order),/already settled/);
 assert.equal(JSON.stringify(f),before);
});

test('resource transfers reject duplicates, unbacked cash and forged origin without changing the books',()=>{
 const r=F.purchase(f.g,f.w.world,f.w.entities,f.links,f.order),before=JSON.stringify(r);
 for(const mutate of [x=>x.transfers.push(copy(x.transfers[0])),x=>x.transfers[0].amount++,
  x=>x.transfers[0].segment='everyday',x=>x.transfers[0].bankId=f.g.players[1].id,
  x=>x.accounts[0].funded++,x=>x.accounts[0].lastCycle++,x=>x.transfers=[]]){
  const bad=copy(r.links);mutate(bad);assert.throws(()=>F.regionalResources(r.campaign,r.world,r.entities,bad));
 }
 const invalid=copy(r.campaign),market=f.g.players[0].focus;
 invalid.marketEconomy.markets[market].segmentDeposits.total.reserve++;
 assert.throws(()=>F.regionalResources(invalid,r.world,r.entities,r.links),/reconcile/);
 const capital=copy(r.world);capital.bankCashNet++;assert.throws(()=>F.regionalResources(r.campaign,capital,r.entities,r.links));
 assert.equal(JSON.stringify(r),before);
});

test('locked-only savings and unavailable liquidity cannot fund an investment',()=>{
 for(const type of ['locked','liquidity']){
  const g=copy(f.g),p=g.players[0];
  if(type==='locked')for(const c of p.depositBook.cohorts)if(c.market===p.focus&&c.segment==='reserve')c.locked=true;
  if(type==='liquidity'){
   const cash=p.accounting.accounts.cash;p.accounting.accounts.cash=0;p.accounting.accounts.securities+=cash;
  }
  const before=JSON.stringify(g);assert.throws(()=>F.purchase(g,f.w.world,f.w.entities,f.links,f.order),/savings|cash/);
  assert.equal(JSON.stringify(g),before);
 }
});

test('an empty investment account acquires real customer cash without a seeded portfolio',()=>{
 const empty=fixture(0),{g,w,links,order}=empty,before=JSON.stringify(empty);
 assert.equal(w.world.issuedUnits,0);assert.equal(w.world.clients[0].cash,0);assert.equal(w.world.feesPaid,0);
 assert.throws(()=>F.purchase(g,w.world,w.entities,links,order),/inventory/);
 const r=F.purchase(g,w.world,w.entities,links,{...order,destination:'cash'});
 assert.equal(r.world.issuedUnits,0);assert.equal(r.world.clients[0].cash,order.amount);
 assert.deepEqual(copy(r.world.dealer),copy(w.world.dealer),'Cash funding does not capitalize the dealer');
 assert.equal(r.entities[0].book.accounts.cash,w.entities[0].book.accounts.cash,'Client cash is not subsidiary spending cash');
 assert.equal(r.world.custodians.atlas.accounts.custodyAssets,order.amount);
 assert.equal(r.world.custodians.atlas.accounts.custodyLiabilities,order.amount);
 assert.equal(g.players[0].accounting.accounts.cash-r.campaign.players[0].accounting.accounts.cash,order.amount);
 assert.equal(F.regionalResources(r.campaign,r.world,r.entities,r.links).reduce((n,row)=>n+row.netOutflow,0),order.amount);
 assert.equal(JSON.stringify(empty),before);
});
