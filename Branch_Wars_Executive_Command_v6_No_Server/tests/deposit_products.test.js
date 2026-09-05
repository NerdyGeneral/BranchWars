'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
for(const s of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={operate,syncAccounts,transferMarket,'),ctx);
const E=ctx.BWEngine,A=E.AccountingPrototype,copy=x=>JSON.parse(JSON.stringify(x)),create=seed=>E.createGame({campaignRulesVersion:1,termFundingVersion:0,seed,created:1,mode:'hotseat',scenario:'balanced'});
const client={E,console};vm.runInNewContext(source.slice(source.indexOf('function repairGame'),source.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
const g=create('deposits'),p=g.players[0];assert.equal(g.depositProductsVersion,1);E.validatePilot(g);
assert.deepEqual(copy(E.depositSummary(E.publicState(g,0).me,g)),copy(E.depositSummary(p,g)));
const plan={allocation:{...p.allocation},products:{...p.products,retail:'highYield'},depositPolicy:'aggressive',lendingPolicy:'balanced',capitalPolicy:'balanced'};
const view=E.publicState(g,0),snapshot=JSON.stringify(g),forecast=E.operatingPreview(view.me,plan,g.economy);assert.equal(JSON.stringify(g),snapshot);assert(forecast.depositServiceCost>0);assert.equal(forecast.depositIncome,0);assert.equal(view.rival.depositBook,undefined);
p.products.retail='highYield';p.policies.deposit='aggressive';E.operate(g,p,false);delete p.marketSupply;E.validatePilot(g);assert(p.depositBook.cohorts.every(c=>c.remaining===6));
const locked=E.depositSummary(p,g).interest,changed=copy(p);changed.products.retail='essential';changed.policies.deposit='margin';
assert.equal(E.depositSummary(changed,{economy:{...g.economy,rate:1}}).interest,locked);
const holdings=copy(p.depositBook);const seller=g.players[1];seller.depositBook.cohorts.forEach(c=>{c.product='highYield';c.remaining=3;c.rate=4321});
// Deposits received before operations must not lose a month of the new guarantee.
const early=create('early guarantee'),ep=early.players[0];ep.products.retail='highYield';E.transferMarket(early,early.players[1],ep,'downtown','deposits',10000);E.operate(early,ep,false);delete ep.marketSupply;E.validatePilot(early);assert(ep.depositBook.cohorts.every(c=>c.remaining===6));
const terms=E.acquisitionTerms(g,p,'northside');E.finishProject(g,p,{key:'acquisition',target:'northside'});E.validatePilot(g);
assert.equal(p.depositBook.cohorts.filter(c=>c.market==='northside'&&c.remaining===3&&c.rate===4321).reduce((n,c)=>n+c.principal,0),terms.depositTake);
// Savings remain withdrawable: a contest moves liabilities/cash and respects finite market balances.
const total=p.stats.deposits+seller.stats.deposits;E.transferMarket(g,p,seller,'downtown','deposits',10000);E.validatePilot(g);assert.equal(p.stats.deposits+seller.stats.deposits,total);
// Expiring guarantees renew into the selected current product; no indefinite rate carry.
const renew=create('renew');renew.players[0].depositBook.cohorts.forEach(c=>{c.product='highYield';c.remaining=1;c.rate=4321});
renew.players[0].products.retail='essential';E.operate(renew,renew.players[0],false);delete renew.players[0].marketSupply;E.validatePilot(renew);assert(renew.players[0].depositBook.cohorts.every(c=>c.product==='essential'&&c.remaining===0));
for(const mutate of [x=>{delete x.depositProductsVersion},x=>{x.depositProductsVersion=2},x=>{x.players[0].depositBook.cohorts[0].principal++},x=>{x.players[0].depositBook.cohorts[0].remaining=8}]){const x=create('bad');mutate(x);assert.throws(()=>client.migrate(x),/deposit|Deposit/)}
const old=E.createGame({campaignRulesVersion:1,depositProductsVersion:0,seed:1});assert.equal(client.migrate(copy(old)).depositProductsVersion,undefined);old.gameOver=true;E.rematch(old,0);E.rematch(old,1);assert.equal(old.depositProductsVersion,undefined);
const fresh=create('rematch');fresh.gameOver=true;E.rematch(fresh,0);E.rematch(fresh,1);assert.equal(fresh.depositProductsVersion,1);
const normalized=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y};
function turn(game,serviceSeat){
 const plans=[E.chooseBot(game,0),E.chooseBot(game,1)];
 if(serviceSeat>=0){const plan=plans[serviceSeat];plan.allocation.service+=plan.allocation.lending;plan.allocation.lending=0}
 E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);
}
let turns=0,maxBytes=0;const results=[];
for(let seed=0;seed<2;seed++)for(const serviceSeat of [-1,0,1]){
 const game=create('deposit-pair-'+seed);
 for(let i=0;i<120&&!game.gameOver;i++){
  turn(game,serviceSeat);turns++;E.validatePilot(game);E.validateLedger(game);for(const p of game.players){A.check(p.accounting);assert(p.operatingReport.depositServiceCost>=0);assert.equal(Object.values(p.marketReport.rows).reduce((n,r)=>n+r.contribution,0)+p.marketReport.central,p.operatingReport.profit)}
  maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(E.publicState(game,0))));assert(maxBytes<1048576);
  if(i===1&&!game.gameOver){const resumed=client.migrate(copy(game));turn(game,serviceSeat);turn(resumed,serviceSeat);turns++;assert.deepEqual(normalized(game),normalized(resumed))}
 }
 results.push({seed,serviceSeat,cycle:game.cycle,ended:game.gameOver,reason:game.endReason,deposits:game.players.map(p=>p.stats.deposits),equity:game.players.map(p=>p.stats.capital),profits:game.players.map(p=>p.stats.lastProfit)});
}
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),sourceSha256=hash(source);assert.equal(sourceSha256,hash(fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8')));
const result={passed:true,sourceSha256,turns,maxBytes,results};
if(process.argv.includes('--report')){const dir=path.join(__dirname,'../reports/baselines');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'deposit-products-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'),JSON.stringify(result,null,2),{flag:'wx'})}
console.log(JSON.stringify(result,null,2));
