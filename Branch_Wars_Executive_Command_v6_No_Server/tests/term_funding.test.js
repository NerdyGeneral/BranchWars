'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
for(const s of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={operate,transferMarket,withdrawableDeposits,withMarket,delta,'),ctx);
const E=ctx.BWEngine,copy=x=>JSON.parse(JSON.stringify(x)),create=seed=>E.createGame({campaignRulesVersion:1,retailLifecycleVersion:0,seed,created:1,mode:'hotseat'});
const client={E,console};vm.runInNewContext(source.slice(source.indexOf('function repairGame'),source.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
const g=create('terms'),p=g.players[0];
p.termFunding.policy={offer:'six',maturity:'release'};
const initial=p.stats.deposits,plan={...E.chooseBot(g,0),termPolicy:{offer:'six',maturity:'release'}},snapshot=JSON.stringify(g);
const preview=E.operatingPreview(E.publicState(g,0).me,plan,g.economy);assert.equal(JSON.stringify(g),snapshot);assert.equal(preview.termOpened,Math.floor(initial*.1));
E.operate(g,p);delete p.marketSupply;E.validatePilot(g);assert.equal(E.termSummary(p).locked,2400000);
const promised=p.depositBook.cohorts.find(c=>c.locked).rate;
p.termFunding.policy.offer='off';p.policies.deposit='margin';
for(let month=2;month<=6;month++){g.cycle=month;E.operate(g,p);delete p.marketSupply;E.validatePilot(g);assert.equal(E.termSummary(p).locked,2400000);assert(p.depositBook.cohorts.filter(c=>c.locked).every(c=>c.rate===promised&&c.remaining===7-month))}
g.cycle=7;E.operate(g,p);delete p.marketSupply;E.validatePilot(g);assert.equal(E.termSummary(p).locked,0);assert.equal(p.operatingReport.termReleased,2400000);
// Locked liabilities cannot be withdrawn or raided; acquisition keeps their contract.
const lock=create('all-locked'),lp=lock.players[0];lp.depositBook.cohorts.forEach(c=>Object.assign(c,{locked:true,product:'highYield',remaining:1,rate:3000}));
const before=lp.stats.deposits;assert.equal(E.transferMarket(lock,lp,lock.players[1],'downtown','deposits',100000),0);
E.withMarket(lock,()=>E.delta(lp,'deposits',-100000));assert.equal(lp.stats.deposits,before);E.validatePilot(lock);
const buyer=lock.players[1],deal=E.acquisitionTerms(lock,buyer,'downtown');
E.finishProject(lock,buyer,{key:'acquisition',target:'downtown'});E.validatePilot(lock);
assert.equal(E.termSummary(buyer).locked,deal.depositTake);
lp.termFunding.policy={offer:'off',maturity:'renew'};lock.cycle=2;E.operate(lock,lp);delete lp.marketSupply;E.validatePilot(lock);assert(lp.operatingReport.termRenewed>0);assert(lp.depositBook.cohorts.filter(c=>c.locked).every(c=>c.remaining===6&&c.rate!==3000));
for(const change of [x=>delete x.termFundingVersion,x=>x.termFundingVersion=2,x=>x.players[0].termFunding.policy.offer='bogus',x=>x.players[0].depositBook.cohorts[0].locked='yes']){
 const bad=create('bad');change(bad);assert.throws(()=>client.migrate(bad),/term|Term|locked/);
}
const old=E.createGame({campaignRulesVersion:1,termFundingVersion:0,seed:1});assert.equal(client.migrate(copy(old)).termFundingVersion,undefined);old.gameOver=true;E.rematch(old,0);E.rematch(old,1);assert.equal(old.termFundingVersion,undefined);
const fresh=create('rematch');fresh.gameOver=true;E.rematch(fresh,0);E.rematch(fresh,1);assert.equal(fresh.termFundingVersion,1);
assert.equal(E.publicState(g,0).rival.termFunding,undefined);
const normal=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y};
function turn(game,seat){
 const plans=[E.chooseBot(game,0),E.chooseBot(game,1)];
 for(let i=0;i<2;i++)plans[i].termPolicy={offer:i===seat?'six':'off',maturity:i===seat?'renew':'release'};
 E.submit(game,0,plans[0]);E.submit(game,1,plans[1]);
}
let turns=0,maxBytes=0;const results=[];
for(let seed=0;seed<2;seed++)for(const seat of [0,1]){
 const game=create('term-pair-'+seed);
 for(let month=0;month<120&&!game.gameOver;month++){
  turn(game,seat);turns++;E.validatePilot(game);E.validateLedger(game);
  for(const player of game.players)E.AccountingPrototype.check(player.accounting);
  maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(E.publicState(game,0))));assert(maxBytes<1048576);
  if(month===5&&!game.gameOver){const resumed=client.migrate(copy(game));turn(game,seat);turn(resumed,seat);turns++;assert.deepEqual(normal(game),normal(resumed))}
 }
 results.push({seed,seat,cycle:game.cycle,reason:game.endReason,locked:game.players.map(p=>E.termSummary(p).locked),equity:game.players.map(p=>p.stats.capital),profit:game.players.map(p=>p.stats.lastProfit)});
}
console.log(JSON.stringify({passed:true,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),turns,maxBytes,results},null,2));
