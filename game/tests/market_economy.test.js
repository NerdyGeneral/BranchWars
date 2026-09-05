'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
for(const script of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);const E=ctx.BWEngine,A=E.AccountingPrototype,copy=x=>JSON.parse(JSON.stringify(x));
const client={E,console};vm.runInNewContext(source.slice(source.indexOf('function repairGame'),source.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
const create=seed=>E.createGame({campaignRulesVersion:1,creditLifecycleVersion:0,seed,created:1,mode:'hotseat',scenario:'balanced'});
const totals=g=>copy(Object.fromEntries(Object.entries(g.marketEconomy.markets).map(([k,m])=>[k,m.total])));
const quiet=(g,i,extra={})=>({focus:g.players[i].focus,allocation:{...g.players[i].allocation},products:{...g.players[i].products},depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'balanced',newProjects:[],newProject:null,investments:{},hires:0,opportunity:null,competitiveAction:'none',capitalAction:false,decision:'b',...extra});
const turn=g=>{E.submit(g,0,E.chooseBot(g,0));E.submit(g,1,E.chooseBot(g,1))};
const g=create('market-foundation'),initial=totals(g);
E.validatePilot(g);
assert.equal(g.marketEconomyVersion,1);
for(const p of g.players)assert.equal(Object.values(p.marketBook.markets).reduce((n,m)=>n+m.deposits,0),24000000);
const view=E.publicState(g,1);assert(view.me.marketBook);assert.equal(view.rival.marketBook,undefined);assert.equal(view.marketOwnership.downtown.me,g.players[1].marketBook.markets.downtown.deposits);
const pure=JSON.stringify(g);const forecast=E.operatingPreview(view.me,quiet(g,1),g.economy);assert(Number.isFinite(forecast.profit));assert.equal(JSON.stringify(g),pure);
assert.throws(()=>client.migrate({...copy(g),marketEconomyVersion:7}),/market economy/);
const bad=copy(g);bad.players[0].marketBook.markets.downtown.deposits++;assert.throws(()=>client.migrate(bad),/disagree/);
const missing=copy(g);delete missing.marketEconomyVersion;assert.throws(()=>client.migrate(missing),/Unversioned/);
const counterparty=copy(g);counterparty.marketEconomy.markets.downtown.union.deposits++;assert.throws(()=>client.migrate(counterparty),/conservation/);
// An acquisition moves only the target market's existing franchise.
const deal=create('acquisition'),seller=deal.players[1],buyer=deal.players[0],target='industrial',terms=E.acquisitionTerms(deal,buyer,target);
const beforeBuyer=copy(buyer.marketBook),beforeSeller=copy(seller.marketBook),outside=copy(deal.marketEconomy);
E.finishProject(deal,buyer,{key:'acquisition',target});E.validatePilot(deal);A.check(buyer.accounting);A.check(seller.accounting);
assert.equal(buyer.marketBook.markets[target].deposits-beforeBuyer.markets[target].deposits,terms.depositTake);
assert.equal(beforeSeller.markets[target].deposits-seller.marketBook.markets[target].deposits,terms.depositTake);
assert.deepEqual(copy(deal.marketEconomy),outside);
for(const key of Object.keys(deal.territories))if(key!==target)assert.equal(buyer.marketBook.markets[key].deposits,beforeBuyer.markets[key].deposits);
// Local commercial raids are capped by actual relationships.
const raid=create('raid'),beforeRaid=totals(raid),victim=raid.players[1],key='downtown';
for(const resource of ['business','merchant','customers']){const count=victim.marketBook.markets[key][resource];victim.marketBook.markets.northside[resource]+=count;victim.marketBook.markets[key][resource]=0;raid.marketEconomy.markets[key].total[resource]-=count;raid.marketEconomy.markets.northside.total[resource]+=count}
const raidStats=copy(raid.players[0].stats);
E.resolveCompetitiveActions(raid,[quiet(raid,0,{competitiveAction:'commercialRaid'}),quiet(raid,1)]);
assert.equal(raid.players[0].stats.customers,raidStats.customers);E.validatePilot(raid);
// No outside deposits means no organic deposit creation in forecasts or operations.
const dry=create('saturated'),owner=dry.players[0];
for(const [key,m]of Object.entries(dry.marketEconomy.markets)){const amount=m.community.deposits+m.union.deposits;m.community.deposits=0;m.union.deposits=0;owner.marketBook.markets[key].deposits+=amount;owner.accounting=A.transact(owner.accounting,'deposit',amount)}
owner.stats.deposits=owner.accounting.accounts.deposits;owner.stats.cash=owner.accounting.accounts.cash;E.validatePilot(dry);
const dryView=E.publicState(dry,0);assert.equal(E.operatingPreview(dryView.me,quiet(dry,0),dry.economy).depositGrowth,0);
dry.event={...dry.event,key:'quiet'};E.submit(dry,0,quiet(dry,0));E.submit(dry,1,quiet(dry,1));assert.equal(owner.operatingReport.depositGrowth,0);E.validatePilot(dry);
const old=E.createGame({campaignRulesVersion:1,marketEconomyVersion:0,seed:1});assert.equal(old.marketEconomy,undefined);assert.equal(client.migrate(copy(old)).marketEconomy,undefined);
function normalized(x){const c=copy(x);delete c.ledgerVersion;c.players.forEach(p=>delete p.strategy);return c}
// Service improvements also raise accessible local recruitment, not only throughput.
const service=create('service access'),supplyBefore=E.marketSupply(service,service.players[0]).deposits.downtown;
E.finishProject(service,service.players[0],{key:'branchService',target:'downtown'});
assert(E.marketSupply(service,service.players[0]).deposits.downtown>supplyBefore);E.validatePilot(service);
// Finance a deal without selling the loans already promised in that deal.
const stressed=create('funded deal'),sp=stressed.players[1],spent=sp.stats.cash+sp.accounting.accounts.securities;
sp.accounting=A.post(sp.accounting,'test.expense',{cash:-sp.stats.cash,securities:-sp.accounting.accounts.securities,equity:-spent},-spent);
Object.assign(sp.stats,{cash:sp.accounting.accounts.cash,capital:sp.accounting.accounts.equity,earnings:sp.accounting.retainedEarnings});
E.finishProject(stressed,stressed.players[0],{key:'acquisition',target:'northside'});E.validatePilot(stressed);
assert(sp.accounting.journal.some(e=>e.source.startsWith('sell.loans')));
const rematch=create('rematch');rematch.gameOver=true;E.rematch(rematch,0);E.rematch(rematch,1);assert.equal(rematch.marketEconomyVersion,1);E.validatePilot(rematch);
let turns=0,maxViewBytes=0,results=[];
for(let seed=0;seed<8;seed++){
 const game=create('market-audit-'+seed),opening=totals(game);let withdrawn=0;
 for(let i=0;i<120&&!game.gameOver;i++){
  turn(game);turns++;E.validatePilot(game);E.validateLedger(game);assert.deepEqual(totals(game),opening);
  for(const p of game.players){A.check(p.accounting);const r=p.marketReport;assert.equal(Object.values(r.rows).reduce((n,row)=>n+row.contribution,0)+r.central,r.profit)}
  withdrawn+=game.resolution.filter(x=>x.includes('withdrew one office')).length;
  maxViewBytes=Math.max(maxViewBytes,Buffer.byteLength(JSON.stringify(E.publicState(game,0))));assert(maxViewBytes<1048576);
  if(i===12){const resumed=client.migrate(copy(game));assert.deepEqual(normalized(resumed),normalized(game));turn(game);turn(resumed);turns++;assert.deepEqual(normalized(game),normalized(resumed))}
 }
 results.push({seed,cycle:game.cycle,ended:game.gameOver,withdrawn,playerDeposits:game.players.map(p=>p.stats.deposits),outsideDeposits:Object.values(game.marketEconomy.markets).reduce((n,m)=>n+m.community.deposits+m.union.deposits,0)});
}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),sourceSha256=hash(source),sourceUnchanged=sourceSha256===hash(fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'));assert(sourceUnchanged);
const result={passed:true,sourceSha256,sourceUnchanged,turns,maxViewBytes,results};
if(process.argv.includes('--report')){const dir=path.join(__dirname,'../reports/baselines');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'market-economy-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'),JSON.stringify(result,null,2),{flag:'wx'})}
console.log(JSON.stringify(result,null,2));
