'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{test}=require('node:test'),{createHash}=require('node:crypto'),path=require('node:path');
const copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine;
function fresh(engine=E,cash=true){return engine.createGame({...engine.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,investmentServicesVersion:1,investmentAssetsVersion:1,...(cash?{investmentCashVersion:1}:{}),mode:'hotseat',seed:'investment-cash-return',created:1});}
function plans(g){return g.players.map((p,i)=>({...E.chooseBot(g,i),investmentPolicy:E.defaultInvestmentPlan(p)}));}
function resolve(g,p,reverse=false,restore=false){g=copy(g);const first=reverse?1:0;E.submit(g,first,copy(p[first]));if(restore)g=E.migrateCampaign(copy(g));E.submit(g,1-first,copy(p[1-first]));E.validatePilot(g);E.validateLedger(g);assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(g));return g;}
test('actual customer cash returns to existing deposits without a new household, profit or repeated transfer',()=>{
 let g=fresh(),p=g.players[0],A=E.GroupAccounting,I=E.InvestmentInstitution;
 // Transparent external-shareholder launch fixture, not customer money.
 p.financialGroup.parent=A.post(p.financialGroup.parent,'fixture.shareholder','external-shareholder',{cash:1000000,equity:1000000});E.validatePilot(g);
 let orders=plans(g);orders[0].investmentPolicy.institution={...I.defaults(p.investmentBusiness),launch:true,capital:700000,roles:{adviser:1,broker:0,principal:0,operations:1}};orders[0].investmentPolicy.pursue=true;g=resolve(g,orders);
 for(let n=0;n<3;n++){orders=plans(g);orders[0].investmentPolicy.pursue=true;g=resolve(g,orders);}
 const client=g.investmentEconomy.world.clients.find(c=>c.owner===p.id&&g.investmentEconomy.links.accounts.some(a=>a.clientId===c.id&&a.bankId===p.id));assert(client);
 orders=plans(g);orders[0].investmentPolicy.funding=[{clientId:client.id,amount:1000,destination:'cash'}];g=resolve(g,orders);
 orders=plans(g);const control=resolve(g,orders);orders[0].investmentPolicy.funding=[{clientId:client.id,amount:1000,destination:'return'}];
 const a=resolve(g,orders),b=resolve(g,orders,true,true);assert.deepEqual(copy(a),copy(b));
 const paid=a.players[0].investmentReport.transfers[0].paid;assert(paid>0&&paid<=1000);
 assert.equal(a.investmentEconomy.world.bankCashNet,1000-paid);assert.equal(a.investmentEconomy.links.accounts.find(x=>x.clientId===client.id).funded,1000-paid);
 assert.equal(a.investmentEconomy.world.clients.find(c=>c.id===client.id).cash,0,'Full available cash requested, after fees');
 assert.deepEqual(copy(a.players[0].householdBook),copy(control.players[0].householdBook));
 assert.equal(a.players[0].accounting.accounts.deposits-control.players[0].accounting.accounts.deposits,paid);
 assert.equal(a.players[0].accounting.accounts.cash-control.players[0].accounting.accounts.cash,paid);
 assert.equal(a.players[0].accounting.accounts.equity,control.players[0].accounting.accounts.equity);
 for(const i of [0,1]){const v=E.publicState(a,i);E.validateFinancialGroupView(v);assert.equal(v.investmentCashVersion,1);assert.equal(v.rival.investmentCashVersion,undefined);}
 for(const mutation of [x=>delete x.investmentCashVersion,x=>x.investmentEconomy.links.version=2,x=>x.investmentEconomy.links.transfers.at(-1).amount++,x=>x.investmentEconomy.links.accounts.find(a=>a.clientId===client.id).funded++]){const bad=copy(a);mutation(bad);assert.throws(()=>E.migrateCampaign(bad));}
 const next=resolve(a,plans(a));assert.equal(next.investmentEconomy.links.transfers.length,2);
 next.gameOver=true;E.rematch(next,0);E.rematch(next,1);E.validatePilot(next);assert.equal(next.version,'9.14');assert.equal(next.investmentCashVersion,1);assert.equal(next.investmentEconomy.links.transfers.length,0);
});
test('9.13 frozen campaign remains unchanged without the new cash marker',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_assets1_8eb2011a.html'));assert.equal(createHash('sha256').update(bytes).digest('hex'),'8eb2011a5d6ec93c25df342c5051281d881be3b163029d1c1feefa1d1adc8467');
 const old={console};vm.runInNewContext(bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1],old);
 const a=fresh(old.BWEngine,false),b=fresh(E,false);assert.deepEqual(copy(a),copy(b));
 for(let n=0;n<2;n++){const pa=a.players.map((p,i)=>old.BWEngine.chooseBot(a,i)),pb=b.players.map((p,i)=>E.chooseBot(b,i));assert.deepEqual(copy(pa),copy(pb));old.BWEngine.submit(a,0,pa[0]);old.BWEngine.submit(a,1,pa[1]);E.submit(b,0,pb[0]);E.submit(b,1,pb[1]);assert.deepEqual(copy(a),copy(b));assert.deepEqual(copy(old.BWEngine.publicState(a,0)),copy(E.publicState(b,0)));}
 assert.equal(E.migrateCampaign(copy(b)).investmentCashVersion,undefined);
});
