'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date};
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);const E=ctx.BWEngine;
const copy=x=>JSON.parse(JSON.stringify(x)),create=seed=>E.createGame({campaignRulesVersion:1,marketEconomyVersion:0,seed,created:1,mode:'hotseat',scenario:'balanced'});
const client={E,console};vm.runInNewContext(source.slice(source.indexOf('function repairGame'),source.indexOf('function saveLocal'))+';globalThis.migrate=migrateGame;',client);
const g=create('regional operations'),p=g.players[0];
assert.equal(g.regionalEconomyVersion,1);
assert.equal(E.projectCost({...p,focus:'downtown'},E.PROJECTS.branch),644000);
assert.equal(E.projectCost({...p,focus:'county_seat'},E.PROJECTS.branch),476000);
let before=E.regionalBranchMetrics(p),row=before.rows.find(r=>r.key==='downtown');
assert.equal(row.expense,26400);assert.equal(row.depositCapacity,472500);
E.finishProject(g,p,{key:'branchAutomation',target:'downtown'});
assert(E.regionalBranchMetrics(p).expense<before.expense);
E.finishProject(g,p,{key:'branchService',target:'downtown'});
assert(E.regionalBranchMetrics(p).depositCapacity>before.depositCapacity);
const publicView=E.publicState(g,0);assert(publicView.me.regionalOperations);assert.equal(publicView.rival.regionalOperations,undefined);
const saved=JSON.stringify(g),plan=E.chooseBot(copy(g),0),forecast=E.operatingPreview(p,plan,g.economy);
assert(Number.isFinite(forecast.profit));assert.equal(JSON.stringify(g),saved);
const clone=copy(g),m=clone.territories.downtown;m.shares=[5,95];
for(let i=0;i<3;i++)E.resolveMarketExits(clone);
assert.equal(clone.players[0].branches.downtown,1);
for(let i=0;i<3;i++)E.resolveMarketExits(clone);
assert.equal(clone.players[0].branches.downtown,0);assert.equal(m.exited[0],false);
E.finishProject(clone,clone.players[0],{key:'branch',target:'downtown'});
assert.equal(m.shares[0],5);assert.equal(m.reentryUntil[0],clone.cycle+8);
const corrupt=copy(g);corrupt.players[0].regionalOperations.markets.downtown.service=4;assert.throws(()=>client.migrate(corrupt),/regional/);
const unversioned=copy(g);delete unversioned.regionalEconomyVersion;assert.throws(()=>client.migrate(unversioned),/Unversioned/);
const old=E.createGame({campaignRulesVersion:1,regionalEconomyVersion:0,seed:1});assert.equal(old.regionalEconomyVersion,undefined);assert.equal(client.migrate(copy(old)).regionalEconomyVersion,undefined);
// Paid projects use target-aware quotes, account expenses and real completion.
const paid=create('paid upgrade'),bank=paid.players[0];
const quiet=(game,seat,projects=[])=>({...E.chooseBot(copy(game),seat),focus:seat===0?'downtown':'northside',allocation:{...game.players[seat].allocation},newProject:projects[0]||null,newProjects:projects,investments:{},hires:0,opportunity:null,competitiveAction:'none',capitalAction:false,decision:'b'});
const pureBefore=JSON.stringify(paid);
assert.equal(E.regionalProjectPreview(bank,'branchService','downtown').expense,2000);
assert.equal(E.regionalProjectPreview(bank,'branchAutomation','downtown').expense,-3168);
assert.equal(JSON.stringify(paid),pureBefore);
const entry=quiet(paid,0,['branch']);entry.focus='county_seat';assert.equal(E.planBudget(bank,entry).projects,476000);
const conflict=quiet(paid,0,['branch','branchService']);assert.throws(()=>E.submit(paid,0,conflict),/one office/);
E.submit(paid,0,quiet(paid,0,['branchService']));E.submit(paid,1,quiet(paid,1));
assert(bank.accounting.journal.some(e=>e.source==='startProject'&&e.changes.equity===-140000));
for(let i=0;i<5&&bank.regionalOperations.markets.downtown.service===0;i++){E.submit(paid,0,quiet(paid,0));E.submit(paid,1,quiet(paid,1))}
assert.equal(bank.regionalOperations.markets.downtown.service,1);
E.submit(paid,0,quiet(paid,0,['branchClose']));E.submit(paid,1,quiet(paid,1));
for(let i=0;i<3&&bank.branches.downtown;i++){E.submit(paid,0,quiet(paid,0));E.submit(paid,1,quiet(paid,1))}
assert.equal(bank.branches.downtown,0);assert.equal(bank.regionalOperations.markets.downtown.service,0);
E.validatePilot(paid);E.validateLedger(paid);
let turns=0,withdrawals=0,results=[];
for(let seed=0;seed<8;seed++){
 const game=create('regional-'+seed);
 for(let i=0;i<100&&!game.gameOver;i++){
  for(let seat=0;seat<2;seat++){const bot=E.chooseBot(game,seat);try{E.submit(game,seat,bot)}catch(e){throw Error('seed '+seed+' cycle '+game.cycle+' seat '+seat+' '+JSON.stringify(bot)+' '+e.message)}}
  E.validatePilot(game);E.validateLedger(game);turns++;
  withdrawals+=game.resolution.filter(x=>x.includes('withdrew one office')).length;
  if(i===10){const restored=client.migrate(copy(game));for(let seat=0;seat<2;seat++){const next=E.chooseBot(game,seat),again=E.chooseBot(restored,seat);assert.deepEqual(copy(next),copy(again));E.submit(game,seat,next);E.submit(restored,seat,again)}assert.deepEqual(copy(game.players.map(p=>p.accounting)),copy(restored.players.map(p=>p.accounting)))}
 }
 results.push({seed,cycle:game.cycle,ended:game.gameOver});
}
const crypto=require('node:crypto'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const sourceSha256=hash(source),sourceUnchanged=sourceSha256===hash(fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'));assert(sourceUnchanged);
const result={passed:true,sourceSha256,sourceUnchanged,mainLoopTurns:turns,additionalResumeTurns:8,withdrawals,results};
if(process.argv.includes('--report')){const dir=path.join(__dirname,'../reports/baselines');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'regional-operations-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'),JSON.stringify(result,null,2),{flag:'wx'})}
console.log(JSON.stringify(result,null,2));
