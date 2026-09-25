'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{test}=require('node:test'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine;
function fresh(engine=E,assets=true){return engine.createGame({...engine.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,...(assets?{investmentAssetsVersion:1}:{}),mode:'hotseat',seed:'backed-assets',created:1});}
function plansFor(g,offers=[0,0]){return g.players.map((p,i)=>({...E.chooseBot(g,i),investmentPolicy:{...E.defaultInvestmentPlan(p),inventorySale:offers[i]}}));}
function resolve(g,plans,reverse=false,restore=false){
 g=copy(g);const first=reverse?1:0;E.submit(g,first,copy(plans[first]));
 if(restore)g=E.migrateCampaign(copy(g));
 E.submit(g,1-first,copy(plans[1-first]));E.validatePilot(g);E.validateLedger(g);
 assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(g));return g;
}

test('simultaneous inventory offers use real bank securities and funded dealer cash',()=>{
 const g=fresh();assert.equal(g.version,'9.13');assert.equal(g.companyEconomy.version,5);
 assert.equal(g.investmentEconomy.world.issuedUnits,0);
 const cash=g.investmentEconomy.world.dealer.accounts.cash,offers=[cash,cash*2],plans=plansFor(g,offers);
 const a=resolve(g,plans),b=resolve(g,plans,true),c=resolve(g,plans,false,true);
 assert.deepEqual(copy(a),copy(b));assert.deepEqual(copy(a),copy(c));
 const w=a.investmentEconomy.world,paid=a.players.map(p=>p.investmentAssetReport.paid);
 assert(paid[0]>0);assert.equal(paid[0],Math.floor(Math.floor(cash/100)/3)*100);
 assert.equal(paid[1],Math.floor(Math.floor(cash/100)*2/3)*100);
 assert.equal(w.bankSecuritiesNet,-paid.reduce((n,v)=>n+v,0));
 assert.equal(w.dealer.accounts.cash,cash+ w.bankSecuritiesNet);
 assert.equal(w.issuedUnits*100,-w.bankSecuritiesNet);
 for(const [i,p]of a.players.entries()){
  const entries=p.accounting.journal.filter(e=>e.source==='investment.inventorySale');assert.equal(entries.length,1);
  assert.equal(entries[0].changes.cash,paid[i]);assert.equal(entries[0].changes.securities,-paid[i]);
  assert.equal(entries[0].changes.equity,undefined);
  const v=E.publicState(a,i);E.validateFinancialGroupView(v);assert.equal(v.rival.investmentAssetReport,undefined);
 }
 for(const mutation of [bad=>bad.investmentEconomy.world.bankSecuritiesNet++,bad=>bad.investmentEconomy.world.securitySources[0].units++,bad=>bad.players[0].investmentAssetReport.paid++,bad=>delete bad.investmentAssetsVersion]){
  const bad=copy(a);mutation(bad);assert.throws(()=>E.migrateCampaign(bad));
 }
 const next=resolve(a,plansFor(a));assert.equal(next.investmentEconomy.world.issuedUnits,w.issuedUnits,'One-time offers must not recur');
 // Ending flag is a rematch fixture, not a simulated business failure.
 next.gameOver=true;E.rematch(next,0);E.rematch(next,1);E.validatePilot(next);
 assert.equal(next.version,'9.13');assert.equal(next.investmentAssetsVersion,1);
 assert.equal(next.investmentEconomy.world.issuedUnits,0);assert.equal(next.investmentEconomy.world.bankSecuritiesNet,0);
});

test('offering an entire bank portfolio remains restorable after partial dealer fills',()=>{
 const g=fresh(),offers=g.players.map(p=>p.accounting.accounts.securities),plans=plansFor(g,offers);
 const a=resolve(g,plans);assert(a.players.every(p=>p.investmentAssetReport.paid>0));
 for(const p of a.players)assert.equal(p.investmentAssetReport.requested,offers[g.players.findIndex(q=>q.id===p.id)]);
 const bad=plansFor(a);bad[0].investmentPolicy.inventorySale=a.players[0].accounting.accounts.securities+1;
 const before=JSON.stringify(a);assert.throws(()=>E.submit(a,0,bad[0]),/securities/);assert.equal(JSON.stringify(a),before);
});

test('the preserved 9.12 investment campaign retains exact creation, resolution and RNG',()=>{
 const bytes=fs.readFileSync(require('node:path').join(__dirname,'../reports/reference-builds/BRANCH_WARS_investment1_c8fcc78a.html'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'c8fcc78a5eb0daa0326e64dbaa6ecff4c5ef250068597defc67e1a003f53d572');
 const old={console};vm.runInNewContext(bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],old);
 let a=fresh(old.BWEngine,false),b=fresh(E,false);assert.deepEqual(copy(b),copy(a));
 for(let n=0;n<3;n++){
  const pa=a.players.map((p,i)=>old.BWEngine.chooseBot(a,i)),pb=b.players.map((p,i)=>E.chooseBot(b,i));
  assert.deepEqual(copy(pb),copy(pa));
  old.BWEngine.submit(a,0,pa[0]);old.BWEngine.submit(a,1,pa[1]);E.submit(b,0,pb[0]);E.submit(b,1,pb[1]);
  assert.deepEqual(copy(b),copy(a));assert.deepEqual(copy(E.publicState(b,0)),copy(old.BWEngine.publicState(a,0)));
  a=old.BWEngine.migrateCampaign(copy(a));b=E.migrateCampaign(copy(b));assert.deepEqual(copy(b),copy(a));
 }
});

test('qualified customers buy backed inventory with existing unlocked savings in normal resolution',()=>{
 let g=fresh();const p=g.players[0],A=E.GroupAccounting,I=E.InvestmentInstitution;
 // Explicit shareholder fixture funds a subsidiary launch. It is not customer
 // money, campaign income or an assertion about ordinary-start affordability.
 p.financialGroup.parent=A.post(p.financialGroup.parent,'fixture.shareholderContribution','external-shareholder',{cash:1000000,equity:1000000});
 E.validatePilot(g);
 let plans=plansFor(g,[100000,0]);
 plans[0].investmentPolicy.institution={...I.defaults(p.investmentBusiness),launch:true,capital:700000,roles:{adviser:1,broker:0,principal:0,operations:1}};
 plans[0].investmentPolicy.pursue=true;g=resolve(g,plans);
 for(let n=0;n<3;n++){plans=plansFor(g);plans[0].investmentPolicy.pursue=true;g=resolve(g,plans);}
 const client=g.investmentEconomy.world.clients.find(c=>c.owner===p.id&&g.investmentEconomy.links.accounts.some(a=>a.clientId===c.id&&a.bankId===p.id));
 assert(client,'Acquisition and maintained permissions must precede funding');
 const issued=g.investmentEconomy.world.issuedUnits,units=g.investmentEconomy.world.dealerUnits;
 plans=plansFor(g);plans[0].investmentPolicy.funding=[{clientId:client.id,amount:100,destination:'securities'}];
 const a=resolve(g,plans),b=resolve(g,plans,true,true);assert.deepEqual(copy(a),copy(b));
 const owned=a.investmentEconomy.world.clients.find(c=>c.id===client.id);
 assert.equal(owned.units,1);assert.equal(owned.cash,0);
 assert.equal(a.investmentEconomy.world.dealerUnits,units-1);assert.equal(a.investmentEconomy.world.issuedUnits,issued);
 assert.equal(a.investmentEconomy.world.bankCashNet,100);assert.equal(a.investmentEconomy.links.transfers.length,1);
 assert.equal(a.players[0].investmentReport.transfers[0].paid,100);
 const v=E.publicState(a,0);E.validateFinancialGroupView(v);assert(v.me.investmentSnapshot.clients.some(c=>c.id===owned.id&&c.units===1));
});
