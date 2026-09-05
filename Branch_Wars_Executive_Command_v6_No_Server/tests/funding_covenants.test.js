'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
for(const s of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={syncAccounts,depositPull,'),ctx);
const E=ctx.BWEngine,A=E.AccountingPrototype,copy=x=>JSON.parse(JSON.stringify(x));
const create=seed=>E.createGame({campaignRulesVersion:1,depositProductsVersion:0,seed,created:1,mode:'hotseat',scenario:'balanced'});
const client={E,console};vm.runInNewContext(source.slice(source.indexOf('function repairGame'),source.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
function stress(p){p.accounting=A.transact(p.accounting,'borrow',6000000);p.accounting=A.transact(p.accounting,'originate',p.accounting.accounts.cash);E.syncAccounts(p)}
const g=create('covenant'),p=g.players[0];assert.equal(g.fundingCovenantVersion,1);assert.equal(E.fundingPosition(p).limit,2100000);stress(p);E.validatePilot(g);
assert(E.fundingPosition(p).excess>0);
const workout=E.chooseBot(g,0);assert.equal(workout.capitalPolicy,'liquid');assert.equal(workout.allocation.lending,0);
const calm=copy(p);delete calm.fundingCovenant;assert(E.depositPull(p,p.focus,g.territories[p.focus])<E.depositPull(calm,p.focus,g.territories[p.focus]));
const quiet={focus:p.focus,allocation:{...p.allocation},products:{...p.products},depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'liquid',newProjects:[],newProject:null,investments:{},hires:0,opportunity:null,competitiveAction:'none',capitalAction:false,decision:'b'};
assert.equal(E.planBudget(p,quiet).capitalBudget,0);
const snap=JSON.stringify(g);E.operatingPreview(E.publicState(g,0).me,quiet,g.economy);assert.equal(JSON.stringify(g),snap);
E.evaluateStrategicEnd(g);assert.equal(p.fundingCovenant.streak,1);E.evaluateStrategicEnd(g);assert.equal(p.fundingCovenant.streak,1);
g.cycle++;E.evaluateStrategicEnd(g);assert(!g.gameOver);g.cycle++;E.evaluateStrategicEnd(g);assert(g.gameOver);assert.equal(g.endReason,'funding_resolution');assert.equal(g.winnerId,g.players[1].id);E.validatePilot(g);
assert.equal(client.migrate(copy(g)).endReason,'funding_resolution');assert.equal(client.migrate(copy(g)).players[0].fundingCovenant.streak,3);
// A borrower can cure without a gift: collect existing principal and repay the debt.
const recovery=create('recovery'),rp=recovery.players[0];stress(rp);E.evaluateStrategicEnd(recovery);
const equity=rp.stats.capital;rp.accounting=A.transact(rp.accounting,'repayLoan',5000000);E.syncAccounts(rp);rp.policies.capital='liquid';E.settleFunding(recovery,rp,0);
assert.equal(rp.stats.capital,equity);assert.equal(E.fundingPosition(rp).excess,0);recovery.cycle++;E.evaluateStrategicEnd(recovery);assert.equal(rp.fundingCovenant.streak,0);assert(!recovery.gameOver);E.validatePilot(recovery);
// Simultaneous failures are a draw, not a free acquisition.
const dual=create('dual');dual.players.forEach(stress);for(let i=0;i<3;i++){E.evaluateStrategicEnd(dual);if(i<2)dual.cycle++}assert(dual.gameOver);assert.equal(dual.winnerId,null);
for(const mutate of [x=>{delete x.fundingCovenantVersion},x=>{x.fundingCovenantVersion=4},x=>{x.players[0].fundingCovenant.streak=-1},x=>{x.players[0].fundingCovenant.lastCycle=x.cycle+1}]){const x=create('bad');mutate(x);assert.throws(()=>client.migrate(x),/covenant/)}
const old=E.createGame({campaignRulesVersion:1,fundingCovenantVersion:0,seed:1});assert.equal(client.migrate(copy(old)).fundingCovenantVersion,undefined);old.gameOver=true;E.rematch(old,0);E.rematch(old,1);assert.equal(old.fundingCovenantVersion,undefined);
const fresh=create('rematch');fresh.gameOver=true;E.rematch(fresh,0);E.rematch(fresh,1);assert.equal(fresh.fundingCovenantVersion,1);
assert(source.includes('pilotSupported:11'));assert(source.includes('m.pilotSupported!==11'));
const turn=x=>{E.submit(x,0,E.chooseBot(x,0));E.submit(x,1,E.chooseBot(x,1))},normalized=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y};
let turns=0,maxBytes=0;const results=[];
for(let seed=0;seed<2;seed++)for(const stressedSeat of [-1,0,1]){
 const game=create('covenant-pair-'+seed);if(stressedSeat>=0)stress(game.players[stressedSeat]);
 for(let i=0;i<120&&!game.gameOver;i++){
  turn(game);turns++;E.validatePilot(game);E.validateLedger(game);game.players.forEach(p=>A.check(p.accounting));
  maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(E.publicState(game,0))));assert(maxBytes<1048576);
  if(i===1&&!game.gameOver){const resumed=client.migrate(copy(game));turn(game);turn(resumed);turns++;assert.deepEqual(normalized(game),normalized(resumed))}
 }
 results.push({seed,stressedSeat,cycle:game.cycle,ended:game.gameOver,reason:game.endReason,winner:game.winnerId===null?null:game.players.findIndex(p=>p.id===game.winnerId),debts:game.players.map(p=>p.stats.emergencyDebt),streaks:game.players.map(p=>p.fundingCovenant.streak),deposits:game.players.map(p=>p.stats.deposits)});
}
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),sourceSha256=hash(source);assert.equal(sourceSha256,hash(fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8')));
const result={passed:true,sourceSha256,turns,maxBytes,results};
if(process.argv.includes('--report')){const dir=path.join(__dirname,'../reports/baselines');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'funding-covenants-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'),JSON.stringify(result,null,2),{flag:'wx'})}
console.log(JSON.stringify(result,null,2));
