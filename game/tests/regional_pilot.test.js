'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);const E=ctx.BWEngine,A=E.AccountingPrototype,copy=x=>JSON.parse(JSON.stringify(x));
const client={E,console};vm.runInNewContext(html.slice(html.indexOf('function repairGame'),html.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
// Preserve coverage of the original pilot save rules; regional_operations tests cover new pilots.
const create=seed=>E.createGame({campaignRulesVersion:1,regionalEconomyVersion:0,seed,created:1,mode:'hotseat',scope:'national',scenario:'balanced'});
const turn=g=>{E.submit(g,0,E.chooseBot(g,0));E.submit(g,1,E.chooseBot(g,1))};
const g=create('pilot');
assert.equal(Object.keys(g.territories).length,6);assert.equal(Object.keys(g.regions).length,2);assert(Object.values(g.territories).every(t=>t.unlock===1));
for(const p of g.players){assert.equal(A.check(p.accounting).assets,25800000);assert.equal(p.stats.cash,2400000)}
assert.equal(E.publicState(g,0).rival.accounting,undefined);
for(let i=0;i<8&&!g.gameOver;i++){turn(g);E.validatePilot(g);E.validateLedger(g)}
const restored=client.migrate(copy(g));
function normalized(x){const c=copy(x);delete c.ledgerVersion;c.players.forEach(p=>delete p.strategy);return c}
assert.deepEqual(normalized(restored),normalized(g));
for(let i=0;i<8&&!g.gameOver;i++){turn(g);turn(restored);assert.deepEqual(normalized(restored),normalized(g))}
const takeover=create('no buyout');takeover.act=2;takeover.players[0].stats.influence=100;
for(const t of Object.values(takeover.territories)){t.shares=[95,5];t.exited=[false,false]}
for(let i=0;i<20;i++)assert.equal(E.evaluateStrategicEnd(takeover),'');
assert.equal(takeover.gameOver,false);
const retreat=create('retreat'),market=retreat.territories.downtown;market.shares=[5,95];
for(let i=0;i<3;i++)E.resolveMarketExits(retreat);
assert.equal(retreat.players[0].branches.downtown,0);assert.equal(market.exited[0],false);assert.equal(retreat.players[1].branches.downtown,0);
E.finishProject(retreat,retreat.players[0],{key:'branch',target:'downtown'});assert.equal(retreat.players[0].branches.downtown,1);assert.equal(market.shares[0],15);
const bad=copy(g);bad.players[0].stats.cash++;assert.throws(()=>client.migrate(bad),/disagree/);
const corrupt=copy(g);corrupt.campaignRulesVersion=8;assert.throws(()=>client.migrate(corrupt));
// A real paid re-entry must book project expense, not conjure an office.
const paid=create('paid reentry');paid.event={...paid.event,key:'quiet'};paid.players[0].branches.downtown=0;paid.players[0].facilityMarkets.downtown=[];paid.players[0].facilities.retail=0;
const plan={...E.chooseBot(paid,0),focus:'downtown',allocation:{...paid.players[0].allocation},decision:'b',newProjects:['branch'],newProject:'branch',investments:{},hires:0,competitiveAction:'none',capitalAction:false,opportunity:null};
const price=E.projectCost(paid.players[0],E.PROJECTS.branch);E.submit(paid,0,plan);E.submit(paid,1,E.chooseBot(paid,1));
assert(paid.players[0].accounting.journal.some(e=>e.source==='startProject'&&e.changes.cash===-price&&e.changes.equity===-price));
const bankrupt=create('dual failure');bankrupt.players.forEach(p=>p.distress=E.RECEIVERSHIP_CYCLES);const intact=copy(bankrupt.players.map(p=>p.accounting));E.evaluateStrategicEnd(bankrupt);assert.equal(bankrupt.winnerId,null);assert.deepEqual(copy(bankrupt.players.map(p=>p.accounting)),intact);
const pure=create('preview'),pureBefore=JSON.stringify(pure);E.operatingPreview(pure.players[0],E.chooseBot(copy(pure),0),pure.economy);assert.equal(JSON.stringify(pure),pureBefore);
let turns=0,results=[];
for(let seed=0;seed<12;seed++){const game=create('audit-'+seed);let withdrawals=0,reentries=0,depositContests=0,maxViewBytes=0;for(let i=0;i<160&&!game.gameOver;i++){turn(game);turns++;E.validatePilot(game);E.validateLedger(game);for(const p of game.players){A.check(p.accounting);assert.equal(p.stats.capital,p.accounting.accounts.equity)}withdrawals+=game.resolution.filter(x=>x.includes('withdrew its offices')).length;reentries+=game.resolution.filter(x=>x.includes('Re-entry secured')).length;depositContests+=game.resolution.filter(x=>x.includes('of deposits away from')).length;maxViewBytes=Math.max(maxViewBytes,Buffer.byteLength(JSON.stringify(E.publicState(game,0))));assert(maxViewBytes<1048576)}results.push({seed,cycle:game.cycle,ended:game.gameOver,reason:game.endReason||null,withdrawals,reentries,depositContests,maxViewBytes})}
const crypto=require('node:crypto'),sha=x=>crypto.createHash('sha256').update(x).digest('hex'),sourceUnchanged=sha(html)===sha(fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'));
assert(sourceUnchanged,'source changed while audit was running');const result={passed:true,sourceSha256:sha(html),sourceUnchanged,turns,results};
if(process.argv.includes('--report')){const dir=path.join(__dirname,'../reports/baselines');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'regional-pilot-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'),JSON.stringify(result,null,2),{flag:'wx'})}
console.log(JSON.stringify(result,null,2));
