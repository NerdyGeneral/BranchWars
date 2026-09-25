'use strict';
// Identified-build campaign lab. Distress/dominance are observations, not failures
// to hide; broken books, oversized owner views or drift are mechanical failures.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),
 assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),bytes=fs.readFileSync(path.join(root,'BRANCH_WARS.html')),
 hash=crypto.createHash('sha256').update(bytes).digest('hex'),ctx={console},copy=x=>JSON.parse(JSON.stringify(x));
// Expose the existing final reserve helper for forced-human-policy experiments;
// no simulation function is replaced or rewritten.
vm.runInNewContext(bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1]
 .replace('root.BWEngine={','root.BWEngine={planFinalCashReserve,creditTerms,creditProductionParts,'),ctx);
const E=ctx.BWEngine,groupRules=process.argv.includes('--companies')?2:1,
 options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:groupRules}).options;
const mode=process.argv[2]||'--quick';
assert(['--quick','--long','--stress','--portfolios','--mixed-long','--candidate','--company-downturn'].includes(mode),'Unsupported lab mode.');
if(mode==='--company-downturn')assert.equal(groupRules,2);
const cases=mode==='--company-downturn'?[{scenario:'regulatory',seed:0,months:120,companyDownturn:true}]:
 mode==='--candidate'?['balanced','regulatory'].map(scenario=>({scenario,seed:0,months:120,candidate:true})):
 mode==='--mixed-long'?['balanced','regulatory'].map(scenario=>({scenario,seed:0,months:120,family:'mixed'})):
 mode==='--portfolios'?['mortgage','middleMarket','consumer'].map(family=>({scenario:'balanced',seed:0,months:120,family})):
 mode==='--quick'?['balanced','rate','regulatory','growth'].map(scenario=>({scenario,seed:7,months:24})):
 [0,1].map(seed=>({scenario:mode==='--stress'?'regulatory':'balanced',seed,months:mode==='--stress'?480:120}));
const report={passed:true,sourceSha256:hash,mode,...(groupRules===2?{financialGroupVersion:2}:{}),candidatePlannerOnly:mode==='--candidate',months:0,maxViewBytes:0,earlyEnds:0,
 timing:{planningMs:0,settlementMs:0},runs:[],failures:[]};
for(const test of cases){
 let g=E.createGame({...options,mode:'hotseat',seed:'group-lab:'+test.seed,scenario:test.scenario,created:1});
 const run={...test,resolved:0,dividends:0,support:0,maxDepositShare:50,mixes:{},end:null};
 if(groupRules===2)run.companies={billed:0,paid:0,collected:0,writtenOff:0,maxBankReceivables:0,closed:0};
 try{
 for(let month=0;month<test.months&&!g.gameOver;month++){
   if(test.companyDownturn)g.economy.demand=.5; // Explicit exogenous stress, not a changed release rule.
   let started=performance.now();
   const plans=[0,1].map(seat=>{
     let plan=E.chooseBot(g,seat);const p=g.players[seat],quote=E.groupCapitalQuote(p);
     if(test.candidate&&seat===0)plan=require('./group_planning_candidate').chooseCandidate(E,g,seat,plan);
     if(test.family&&seat===0){plan.groupPolicy.creditAllocation=test.family==='mixed'?
       {mortgage:50,middleMarket:25,consumer:25}:Object.fromEntries(
       Object.keys(plan.groupPolicy.creditAllocation).map(key=>[key,key===test.family?100:0]));
       plan=E.planFinalCashReserve(g,seat,plan);}
     // One owner accumulates a small actual reserve, then can return it during
     // stress. Transfers never borrow or create a rescue grant.
     if(seat===0&&month%6===3&&E.capitalRatio(p)>12)plan.groupPolicy.bankDividend=Math.min(20000,quote.dividendLimit);
     if(seat===0&&E.capitalRatio(p)<10)plan.groupPolicy.bankSupport=Math.min(quote.supportLimit,20000);
     const key=Object.values(plan.groupPolicy.creditAllocation).join('/');
     run.mixes[key]=(run.mixes[key]||0)+1;
     return plan;
   });
   report.timing.planningMs+=performance.now()-started;started=performance.now();
   E.submit(g,0,plans[0]);
   const resumed=month%24===0?E.migrateCampaign(copy(g)):null;
   E.submit(g,1,plans[1]);
   if(resumed){E.submit(resumed,1,copy(plans[1]));
     assert.deepEqual(copy(E.migrateCampaign(g)),copy(E.migrateCampaign(resumed)),'Sealed save changed settlement.');}
   E.validatePilot(g);E.validateLedger(g);
   report.timing.settlementMs+=performance.now()-started;
   for(const seat of [0,1]){
     const p=g.players[seat],view=E.publicState(g,seat);E.validateFinancialGroupView(view);
     const size=Buffer.byteLength(JSON.stringify(view));report.maxViewBytes=Math.max(size,report.maxViewBytes);
     assert(size<=1048576,'Owner view exceeds the 1 MiB transport budget.');
     assert.equal(view.rival.financialGroup,undefined);assert.equal(view.rival.creditPortfolio,undefined);
     const summary=E.GroupAccounting.consolidate(p.financialGroup.parent,[],p.accounting);
     assert.equal(summary.residual,0);assert.equal(summary.equity,p.stats.capital+p.financialGroup.parent.accounts.cash);
     run.dividends+=p.financialGroup.report.dividend;run.support+=p.financialGroup.report.support;
     if(groupRules===2){
       const receipt=p.corporate.report,c=run.companies;
       c.billed+=receipt.billed;c.paid+=receipt.cash;c.collected+=receipt.recovered;c.writtenOff+=receipt.writtenOff;
       c.maxBankReceivables=Math.max(c.maxBankReceivables,p.accounting.accounts.receivables);
       c.closed=g.companyEconomy.companies.filter(company=>company.resolution).length;
     }
   }
   const total=g.players.reduce((n,p)=>n+p.stats.deposits,0);
   if(total)run.maxDepositShare=Math.max(run.maxDepositShare,...g.players.map(p=>100*p.stats.deposits/total));
   run.resolved++;report.months++;
 }
 if(run.resolved<test.months)report.earlyEnds++;
 run.end=g.players.map(p=>({capital:p.stats.capital,capitalRatio:E.capitalRatio(p),cash:p.stats.cash,
   parentCash:p.financialGroup.parent.accounts.cash,deposits:p.stats.deposits,
   cohorts:p.creditBook.cohorts.length,allocation:p.creditPortfolio.allocation}));
 }catch(error){report.passed=false;report.failures.push({test,month:run.resolved+1,error:error.message});}
 report.runs.push(run);
 console.log('Group campaign '+test.scenario+' seed '+test.seed+': '+run.resolved+'/'+test.months);
}
const dir=path.join(root,'reports/baselines');fs.mkdirSync(dir,{recursive:true});
const output=path.join(dir,'financial-group-balance-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,reportPath:output},null,2));
if(!report.passed)process.exitCode=1;
