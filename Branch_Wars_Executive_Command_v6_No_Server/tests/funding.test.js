'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);const E=ctx.BWEngine;
const create=(fundingRulesVersion=2,seed='funding')=>E.createGame({seed,created:1,mode:'hotseat',scope:'national',scenario:'balanced',difficulty:'vp',fundingRulesVersion});
const copy=x=>JSON.parse(JSON.stringify(x));
const net=p=>p.stats.cash+p.stats.loans-p.stats.deposits-p.stats.emergencyDebt-p.stats.capital;
const g=create(),p=g.players[0],base=E.capitalRatio(p);p.stats.deposits+=1e6;assert.equal(E.capitalRatio(p),base);p.stats.loans+=1e6;assert(E.capitalRatio(p)<base);
assert.equal(E.createGame({mode:'hotseat',scope:'town'}).fundingRulesVersion,2,'new campaigns opt into corrected rules');
assert.throws(()=>create(99),/Unsupported funding/);
// Construct a predictable deposit contest with enough liquid cash to avoid sales.
for(const version of [1,2]){
 const game=create(version),[winner,loser]=game.players;game.cycle=30;game.act=2;
 winner.policies.deposit='aggressive';loser.policies.deposit='margin';winner.stats.reputation=100;winner.stats.digital=100;
 winner.allocation={service:8,business:0,lending:0,operations:0};loser.allocation={service:0,business:2,lending:2,operations:4};
 for(const key of Object.keys(game.territories)){winner.branches[key]=3;loser.branches[key]=0}
 loser.stats.cash=10e6;const equity=loser.stats.capital,cash=winner.stats.cash+loser.stats.cash,deposits=winner.stats.deposits+loser.stats.deposits,residual=net(loser);
 const contest=E.depositContest(game);assert(contest.outflow[1]>0);E.settleFunding(game,loser,contest.outflow[1]);
 assert.equal(winner.stats.cash+loser.stats.cash,cash);assert.equal(winner.stats.deposits+loser.stats.deposits,deposits);
 if(version===2){assert.equal(loser.stats.capital,equity);assert.equal(net(loser),residual)}else assert(loser.stats.capital<equity,'legacy saves keep old semantics');
}
// Dollar-sized gaps cannot be silently forgiven, and loan proceeds reconcile.
for(const amount of [1,9,999,1000,1001,100000]){
 const game=create(),bank=game.players[0];bank.stats.cash=0;const before=net(bank);E.settleFunding(game,bank,amount);assert.equal(net(bank),before-amount);assert(bank.stats.cash>=0);
}
const crisis=create(),bank=crisis.players[0];Object.assign(bank.stats,{cash:0,loans:100,capital:1});E.settleFunding(crisis,bank,100);
assert.equal(bank.stats.capital,-5,'realized haircut may create negative equity');assert.equal(bank.stats.emergencyDebt,6,'residual funding becomes an explicit liability');
const debtor=create(),d=debtor.players[0];d.stats.emergencyDebt=1e6;const clean=copy(d);clean.stats.emergencyDebt=0;
const plan=E.chooseBot(debtor,0),a=E.operatingPreview(d,plan,debtor.economy),b=E.operatingPreview(clean,plan,debtor.economy);
assert.equal(a.fundingCost-b.fundingCost,10000);assert.equal(b.profit-a.profit,10000);
const reserve=Math.round(d.stats.deposits*.05);d.stats.cash=reserve+12345;d.policies.capital='balanced';const residual=net(d);E.settleFunding(debtor,d,0);assert.equal(d.stats.emergencyDebt,1e6-12345);assert.equal(d.stats.cash,reserve);assert.equal(net(d),residual);
assert.equal(E.publicState(debtor,0).me.fundingRulesVersion,2);assert.equal(E.publicState(debtor,0).rival.stats.emergencyDebt,undefined);
const bad=copy(debtor),unchanged=JSON.stringify(bad);assert.throws(()=>E.settleFunding(bad,bad.players[0],NaN),/Invalid/);assert.equal(JSON.stringify(bad),unchanged);
const failed=create();failed.players.forEach((x,i)=>{x.distress=E.RECEIVERSHIP_CYCLES;x.stats.capital=i?1000:-1000});E.evaluateStrategicEnd(failed);assert.equal(failed.winnerId,null,'two failed banks cannot acquire one another');
// Exercise the modern rules beyond focused transactions. This is not a claim
// that every legacy operating flow now satisfies double-entry accounting.
let turns=0;
for(let i=0;i<24;i++){
 const game=create(2,'modern-'+i);game.mode='ai';game.players[1].isBot=true;
 while(!game.gameOver&&game.cycle<=300){E.submit(game,0,E.chooseBot(game,0));turns++;for(const x of game.players){assert(Object.values(x.stats).every(Number.isFinite));assert(x.stats.cash>=0&&x.stats.emergencyDebt>=0)}E.validateLedger(game)}
 assert(game.gameOver,'modern campaign must terminate in audit horizon');
}
console.log(`Funding rules tests passed: v1 compatibility, v2 transfer/settlement reconciliation, small outflows, signed losses, explicit debt/interest/repayment, dual failure and 24 modern campaigns (${turns} turns).`);
