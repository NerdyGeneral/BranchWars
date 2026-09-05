'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const file=path.join(__dirname,'../BRANCH_WARS.html'),source=fs.readFileSync(file,'utf8'),ctx={console,Math,Date};
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.BWEngine,hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const serviceExpansionVersion=process.argv.includes('--previous-services')?0:1;
const workforceVersion=process.argv.includes('--workforce')?1:0;
const customerDemandVersion=workforceVersion||process.argv.includes('--customer-relationships')?2:process.argv.includes('--customer-needs')?1:0;
const managementVersion=customerDemandVersion||process.argv.includes('--relationships')?2:process.argv.includes('--management')?1:0;
const numberArg=(key,fallback)=>{const i=process.argv.indexOf(key),n=i<0?fallback:Number(process.argv[i+1]);assert(Number.isSafeInteger(n)&&n>=0,'Invalid '+key);return n};
const seedStart=numberArg('--seed-start',0),seedCount=numberArg('--seeds',4),turnLimit=numberArg('--turns',120);
const scenarios=Object.keys(E.SCENARIOS),results=[],activity=[],skipped=[],cancelled=[];let turns=0,maxViewBytes=0;
for(const scenario of scenarios)for(let seed=seedStart;seed<seedStart+seedCount;seed++){
 const g=E.createGame({workforceVersion,customerDemandVersion,campaignRulesVersion:1,serviceExpansionVersion,managementVersion,mode:'hotseat',scenario,seed:'release-'+scenario+'-'+seed,created:1});
 const actions={scenario,seed,providerChanges:0,lateProviderChanges:0,initiatives:0,competitiveActions:0};
 if(workforceVersion)Object.assign(actions,{stagedSpecialists:0,trainingSpend:0,trainingPaused:0,maxSpecialists:0,maxSkill:0,maxPremiumPayroll:0});
 for(let month=0;month<turnLimit&&!g.gameOver;month++){
  const plans=[E.chooseBot(g,0),E.chooseBot(g,1)],cycle=g.cycle;
  const owners=g.serviceAgreements.map(c=>c.owner);
  if(workforceVersion)actions.stagedSpecialists+=plans.reduce((n,p)=>n+E.specialistHireCount(p),0);
  actions.initiatives+=plans.reduce((n,p)=>n+E.planInitiatives(p).length,0);actions.competitiveActions+=plans.filter(p=>p.competitiveAction!=='none').length;
  E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);turns++;
  const changes=g.serviceAgreements.filter((c,i)=>c.owner!==owners[i]).length;actions.providerChanges+=changes;if(month>=60)actions.lateProviderChanges+=changes;
  E.validatePilot(g);E.validateLedger(g);
  for(let i=0;i<2;i++){
   const p=g.players[i],a=p.accounting.accounts;E.AccountingPrototype.check(p.accounting);
   if(workforceVersion){
    const rows=Object.values(p.workforce.departments);
    actions.trainingSpend+=p.operatingReport.workforceTraining;
    actions.trainingPaused+=p.operatingReport.workforceTrainingPaused;
    actions.maxSpecialists=Math.max(actions.maxSpecialists,rows.reduce((n,r)=>n+r.count,0));
    actions.maxSkill=Math.max(actions.maxSkill,...rows.map(r=>r.skill));
    actions.maxPremiumPayroll=Math.max(actions.maxPremiumPayroll,p.operatingReport.specialistPayroll);
   }
   for(const key of ['cash','deposits','loans','capital','emergencyDebt'])assert.equal(p.stats[key],a[key==='capital'?'equity':key]);
   assert.equal(p.depositBook.cohorts.reduce((n,c)=>n+c.principal,0),a.deposits);
   assert.equal(p.creditBook.cohorts.reduce((n,c)=>n+c.principal,0),a.loans);
   assert.equal(Object.values(p.marketBook.markets).reduce((n,m)=>n+m.deposits,0),a.deposits);
   assert.equal(Object.values(p.marketReport.rows).reduce((n,r)=>n+r.contribution,0)+p.marketReport.central,p.marketReport.profit);
   for(const key of E.planInitiatives(plans[i]))if(!g.resolution.some(x=>x.startsWith(p.name+' began '+E.PROJECTS[key].name))){
    const notice=g.resolution.find(x=>x.startsWith(p.name+' cancelled '+E.PROJECTS[key].name+': cash changed before execution')&&x.endsWith('No project cost was charged; select it again in a later plan.'));
    if(notice){cancelled.push({scenario,seed,cycle,seat:i,key,notice});continue;}
    const failure={scenario,seed,cycle,seat:i,key,tier:E.capitalTier(p).key,resolution:[...g.resolution]};skipped.push(failure);console.error(JSON.stringify({skippedInitiative:failure}));
   }
  }
  maxViewBytes=Math.max(maxViewBytes,Buffer.byteLength(JSON.stringify(E.publicState(g,0))));assert(maxViewBytes<1048576);
 }
 results.push({scenario,seed,cycle:g.cycle,ended:g.gameOver,reason:g.endReason||null,winner:g.players.findIndex(p=>p.id===g.winnerId),equity:g.players.map(p=>p.stats.capital),deposits:g.players.map(p=>p.stats.deposits),profit:g.players.map(p=>p.stats.lastProfit)});
 activity.push(actions);
}
assert.equal(hash(source),hash(fs.readFileSync(file,'utf8')));
const report={passed:skipped.length===0,sourceSha256:hash(source),...(workforceVersion?{workforceVersion}:{}),campaignRulesVersion:1,serviceExpansionVersion,managementVersion,customerDemandVersion,seedStart,seedCount,turnLimit,turns,maxViewBytes,skippedInitiatives:skipped,cancelledInitiatives:cancelled,results,activity};
if(process.argv.includes('--report')){
 const dir=path.join(__dirname,'../reports/baselines');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'release-balance-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify(report,null,2));
assert.equal(skipped.length,0,'Every planned initiative must start or have an explicitly tested cancellation rule.');
