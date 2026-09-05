'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
for(const s of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={operate,applyRetailMix,transferMarket,productOption,'),ctx);
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x)),create=seed=>E.createGame({campaignRulesVersion:1,productDeploymentVersion:0,mode:'hotseat',seed,created:1});
const client={E,console};vm.runInNewContext(source.slice(source.indexOf('function repairGame'),source.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
const g=create('mix'),p=g.players[0],opening=p.stats.deposits;
assert.equal(g.retailLifecycleVersion,1);
const plan={...E.chooseBot(g,0),retailMix:{essential:0,rewards:2,highYield:2}};
const snapshot=JSON.stringify(g),forecast=E.operatingPreview(E.publicState(g,0).me,plan,g.economy);
assert.equal(snapshot,JSON.stringify(g));assert.equal(forecast.retailPlatformCost,22000);
E.applyRetailMix(p,plan.retailMix);E.operate(g,p);delete p.marketSupply;E.validatePilot(g);
let summary=E.depositSummary(p,g);assert.equal(summary.rows.essential.principal,opening,'new offers cannot rewrite the opening book');
assert(summary.rows.rewards.principal>0&&summary.rows.highYield.principal>0);
assert(Math.abs(summary.rows.rewards.principal-summary.rows.highYield.principal)<=6,'whole-dollar mix splits conserve local balances');
assert.equal(summary.rows.rewards.platform,12000);assert.equal(summary.rows.highYield.platform,10000);
assert.equal(summary.service,Object.values(summary.rows).reduce((n,r)=>n+r.service,0));
assert.equal(summary.rows.highYield.directCost,summary.rows.highYield.interest+summary.rows.highYield.service-summary.rows.highYield.fees);
// Closed high-yield pays its original six coupons, then rolls to the leading open offer.
const guaranteed=summary.rows.highYield.principal;
E.applyRetailMix(p,{essential:0,rewards:4,highYield:0});
for(let month=2;month<=6;month++){g.cycle=month;E.operate(g,p);delete p.marketSupply;E.validatePilot(g);summary=E.depositSummary(p,g);assert(summary.rows.highYield.principal>0&&summary.rows.highYield.principal<=guaranteed);assert(p.depositBook.cohorts.filter(c=>c.product==='highYield').every(c=>c.remaining===7-month));assert.equal(summary.rows.highYield.platform,0);assert(summary.rows.highYield.service>0)}
g.cycle=7;E.operate(g,p);delete p.marketSupply;E.validatePilot(g);assert.equal(E.depositSummary(p,g).rows.highYield.principal,0);
// Acquired closed-product contracts retain terms, rather than adopting the buyer's offer.
const deal=create('acquired');const buyer=deal.players[0],seller=deal.players[1];
seller.depositBook.cohorts.forEach(c=>Object.assign(c,{product:'highYield',remaining:3,rate:4567}));
const terms=E.acquisitionTerms(deal,buyer,'northside');E.finishProject(deal,buyer,{key:'acquisition',target:'northside'});E.validatePilot(deal);
assert.equal(buyer.depositBook.cohorts.filter(c=>c.rate===4567&&c.remaining===3).reduce((n,c)=>n+c.principal,0),terms.depositTake);
assert.equal(E.publicState(deal,0).rival.retailLifecycle,undefined);
// Invalid offer maps fail before locking a plan.
for(const mix of [{essential:0,rewards:0,highYield:0},{essential:5,rewards:0,highYield:0},{essential:1.5,rewards:0,highYield:0},{essential:4,rewards:0,highYield:0,hidden:1}]){
 const bad=create('bad');assert.throws(()=>E.submit(bad,0,{...E.chooseBot(bad,0),retailMix:mix}),/retail|emphasis/);assert.equal(bad.players[0].submitted,null);
}
const badSave=create('invalid flag');delete badSave.retailLifecycleVersion;assert.throws(()=>client.migrate(badSave),/retail/);
const old=E.createGame({campaignRulesVersion:1,retailLifecycleVersion:0,seed:1});assert.equal(client.migrate(copy(old)).retailLifecycleVersion,undefined);old.gameOver=true;E.rematch(old,0);E.rematch(old,1);assert.equal(old.retailLifecycleVersion,undefined);
const fresh=create('rematch');fresh.gameOver=true;E.rematch(fresh,0);E.rematch(fresh,1);assert.equal(fresh.retailLifecycleVersion,1);
const normal=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y};
function turn(game,mixedSeat){
 const plans=[E.chooseBot(game,0),E.chooseBot(game,1)];
 plans[mixedSeat].retailMix={essential:2,rewards:1,highYield:1};plans[1-mixedSeat].retailMix={essential:4,rewards:0,highYield:0};
 E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);
}
let turns=0,maxBytes=0;const results=[];
for(let seed=0;seed<2;seed++)for(const seat of [0,1]){
 const game=create('retail-pair-'+seed);
 for(let month=0;month<120&&!game.gameOver;month++){
  turn(game,seat);turns++;E.validatePilot(game);E.validateLedger(game);
  for(const bank of game.players){E.AccountingPrototype.check(bank.accounting);assert.equal(bank.operatingReport.retailPlatformCost,bank===game.players[seat]?22000:0)}
  maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(E.publicState(game,0))));assert(maxBytes<1048576);
  if(month===6&&!game.gameOver){const resumed=client.migrate(copy(game));turn(game,seat);turn(resumed,seat);turns++;assert.deepEqual(normal(game),normal(resumed))}
 }
 results.push({seed,mixedSeat:seat,cycle:game.cycle,ending:game.endReason||null,deposits:game.players.map(p=>p.stats.deposits),equity:game.players.map(p=>p.stats.capital),profit:game.players.map(p=>p.stats.lastProfit)});
}
console.log(JSON.stringify({passed:true,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),turns,maxBytes,results},null,2));
