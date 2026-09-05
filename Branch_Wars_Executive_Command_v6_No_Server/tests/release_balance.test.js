'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const file=path.join(__dirname,'../BRANCH_WARS.html'),source=fs.readFileSync(file,'utf8'),ctx={console,Math,Date};
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const scenarios=Object.keys(E.SCENARIOS),results=[],skipped=[];let turns=0,maxViewBytes=0;
for(const scenario of scenarios)for(let seed=0;seed<4;seed++){
 const g=E.createGame({campaignRulesVersion:1,mode:'hotseat',scenario,seed:'release-'+scenario+'-'+seed,created:1});
 for(let month=0;month<120&&!g.gameOver;month++){
  const plans=[E.chooseBot(g,0),E.chooseBot(g,1)],cycle=g.cycle;
  E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);turns++;
  E.validatePilot(g);E.validateLedger(g);
  for(let i=0;i<2;i++){
   const p=g.players[i],a=p.accounting.accounts;E.AccountingPrototype.check(p.accounting);
   for(const key of ['cash','deposits','loans','capital','emergencyDebt'])assert.equal(p.stats[key],a[key==='capital'?'equity':key]);
   assert.equal(p.depositBook.cohorts.reduce((n,c)=>n+c.principal,0),a.deposits);
   assert.equal(p.creditBook.cohorts.reduce((n,c)=>n+c.principal,0),a.loans);
   assert.equal(Object.values(p.marketBook.markets).reduce((n,m)=>n+m.deposits,0),a.deposits);
   assert.equal(Object.values(p.marketReport.rows).reduce((n,r)=>n+r.contribution,0)+p.marketReport.central,p.marketReport.profit);
   for(const key of E.planInitiatives(plans[i]))if(!g.resolution.some(x=>x.startsWith(p.name+' began '+E.PROJECTS[key].name)))skipped.push({scenario,seed,cycle,seat:i,key,tier:E.capitalTier(p).key});
  }
  maxViewBytes=Math.max(maxViewBytes,Buffer.byteLength(JSON.stringify(E.publicState(g,0))));assert(maxViewBytes<1048576);
 }
 results.push({scenario,seed,cycle:g.cycle,ended:g.gameOver,reason:g.endReason||null,winner:g.players.findIndex(p=>p.id===g.winnerId),equity:g.players.map(p=>p.stats.capital),deposits:g.players.map(p=>p.stats.deposits),profit:g.players.map(p=>p.stats.lastProfit)});
}
assert.equal(hash(source),hash(fs.readFileSync(file,'utf8')));
assert.equal(skipped.length,0,'Every planned initiative must start or have an explicitly tested cancellation rule.');
const report={passed:true,sourceSha256:hash(source),turns,maxViewBytes,skippedInitiatives:skipped,results};
if(process.argv.includes('--report')){
 const dir=path.join(__dirname,'../reports/baselines');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'release-balance-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify(report,null,2));
