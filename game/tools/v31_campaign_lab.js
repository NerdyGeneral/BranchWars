'use strict';
// Read-only engine characterization. Explicit source identity, ordinary AI
// plans, no resource grants, exclusive reports, and replay at saved checkpoints.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const copy=x=>JSON.parse(JSON.stringify(x)),sum=xs=>xs.reduce((a,b)=>a+b,0);
const arg=key=>process.argv.find(x=>x.startsWith('--'+key+'='))?.slice(key.length+3);
function metrics(E,g){
 const deposits=sum(g.players.map(p=>p.stats.deposits));
 return {cycle:g.cycle,companies:g.companyEconomy.companies.map(c=>({id:c.id,cash:c.book.accounts.cash,
  equity:c.book.accounts.equity,payables:c.book.accounts.payables,resolution:c.resolution,report:c.report})),
  corporate:{openingCash:g.companyEconomy.openingCash,outsideCash:g.companyEconomy.outside.accounts.cash,
   creditorCash:g.companyEconomy.creditor.accounts.cash,bankCashPaid:g.companyEconomy.bankCashPaid,
   agencyCashNet:g.companyEconomy.agencyCashNet,circulation:g.companyEconomy.circulation||null},
  players:g.players.map(p=>({id:p.id,cash:p.stats.cash,capital:p.stats.capital,capitalRatio:E.capitalRatio(p),
   doctrine:p.doctrine,primaryStrategy:p.primaryStrategy,capability:p.capability,strategy:p.strategy,products:p.products,
   deposits:p.stats.deposits,depositShare:deposits?p.stats.deposits/deposits:0,loans:p.stats.loans,
   profit:p.stats.lastProfit,emergencyDebt:p.stats.emergencyDebt,staff:p.stats.staff,allocation:p.allocation,
   morale:p.stats.morale,reputation:p.stats.reputation,attention:p.stats.attention,compliance:p.stats.compliance,
   loanFlows:p.operatingReport?{net:p.operatingReport.loanGrowth||0,principalRepaid:p.operatingReport.principalRepaid||0,
    creditRecovery:p.operatingReport.creditRecovery||0,chargeoffs:p.operatingReport.chargeoff||0,
    grossOriginations:Math.round((p.operatingReport.loanGrowth||0)+(p.operatingReport.principalRepaid||0)+(p.operatingReport.creditRecovery||0)+(p.operatingReport.chargeoff||0))}:null,
   cohorts:p.creditBook.cohorts.length,cohortPrincipal:sum(p.creditBook.cohorts.map(c=>c.principal)),
   loansByProduct:p.creditBook.cohorts.reduce((out,c)=>(out[c.product]=(out[c.product]||0)+c.principal,out),{}),
   arrears:sum(p.creditBook.cohorts.flatMap(c=>c.late||[])),chargeoffs:p.stats.chargeoffs,
   officeModels:p.facilityNetwork.offices.filter(o=>o.closedCycle===null).reduce((out,o)=>(out[o.model]=(out[o.model]||0)+1,out),{}),
   specialists:Object.fromEntries(Object.entries(p.workforce.departments).map(([k,d])=>[k,d.count])),
   leaders:Object.fromEntries(Object.entries(p.departmentOffice.leaders).map(([k,l])=>[k,l?.profile||null])),
   leadershipArrears:sum(Object.values(p.departmentOffice.arrears)),
   vendorExpense:p.departmentFunctions.report?.vendorExpense||0,
   tasks:(p.departmentFunctionDelivery?.report.rows||[]).map(t=>({id:t.id,department:t.department,workload:t.workload,
    served:t.delivered.served,shortfall:t.delivered.shortfall,capacity:t.delivered.capacity})),
   remainingPools:p.departmentFunctionDelivery?.report.remainingPools||null,
   parentCash:p.financialGroup.parent.accounts.cash,agency:{status:p.agency.status,failures:p.agency.failures,
    staff:p.agency.staff,cash:p.agency.book.accounts.cash,report:p.agency.report}}))};
}
function validate(E,g,views){
 E.validatePilot(g);E.validateLedger(g);
 for(const p of g.players){E.AccountingPrototype.check(p.accounting);E.DepartmentFunctions.validate(p);}
 E.DepartmentProvider.validate(g.departmentFunctionEconomy);
 if(!views)return;
 const before=hash(JSON.stringify(g));
 for(const seat of [0,1]){
  const v=E.publicState(g,seat);E.validateFinancialGroupView(v);E.validateAgencyView(v);E.validateCorporateView(v);
  for(const key of ['departmentFunctions','departmentFunctionDelivery','departmentOffice','facilityNetwork','facilityLifecycle','agency','financialGroup'])
   assert.equal(v.rival[key],undefined,'Private rival book: '+key);
  for(const key of ['departmentFunctionEconomy','departmentEconomy','facilityEconomy','agencyEconomy'])assert.equal(v[key],undefined);
  for(const key of ['departmentFunctionsPolicy','departmentPolicy','leaderOrders','facilityPolicy','facilityLifecyclePolicy','agencyPolicy'])
   assert.equal(v.lastPlans?.[v.rival.id]?.[key],undefined);
 }
 assert.equal(hash(JSON.stringify(g)),before,'Projection/validation must be pure.');
}
function run(){
 const sourcePath=path.resolve(arg('source')||path.join(root,'BRANCH_WARS.html'));
 const html=fs.readFileSync(sourcePath,'utf8'),source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)?.[1];
 assert(source,'Expected a portable Branch Wars engine.');
 const context={console};vm.runInNewContext(source,context,{filename:sourcePath});const E=context.BWEngine;
 const scenario=arg('scenario')||'balanced',seed=arg('seed')||'department-A',months=Number(arg('months')||24),version=Number(arg('version')||6);
 const difficulty=arg('difficulty')||'vp';assert(['analyst','vp','chairman'].includes(difficulty),'Unsupported AI strategy profile.');
 const name=arg('name');assert(name&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(name),'A unique plain --name is required.');
 assert(['balanced','growth','rate','regulatory'].includes(scenario));assert(Object.hasOwn(E.SCENARIOS,scenario));
 assert(/^[\w.-]{1,80}$/.test(seed));assert(Number.isSafeInteger(months)&&months>0&&months<=480);
 const directory=path.join(root,'reports','qa','v31'),reportPath=path.join(directory,name+'.json'),savePath=path.join(directory,name+'.save.json.gz');
 assert(!fs.existsSync(reportPath)&&!fs.existsSync(savePath),'Existing evidence must not be overwritten.');
 fs.mkdirSync(directory,{recursive:true});
 const identity={sourcePath,htmlSha256:hash(html),engineSha256:hash(source),harnessSha256:hash(fs.readFileSync(__filename))};
 const spec={scenario,seed,months,financialGroupVersion:version,difficulty};
 const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options;
 const g=E.createGame({...options,financialGroupVersion:version,mode:'hotseat',scenario,seed,difficulty,created:1});
 assert.equal(g.financialGroupVersion,version);const participantFlags=g.players.map(p=>p.isBot);
 const timeline=[],timings=[],started=performance.now();let resolved=0,replays=0,error=null,pending=null,submittingSeat=null;
 console.log(JSON.stringify({stage:'start',identity,spec,reportPath}));
 const opening=copy(metrics(E,g));
 try{
  validate(E,g,true);
  while(resolved<months&&!g.gameOver){
   const begin=performance.now();pending=g.players.map((p,i)=>E.chooseBot(g,i));const planned=performance.now();
   const choices=pending.map(q=>({allocation:q.allocation,hires:q.hires,specialistHires:q.specialistHires,
    projects:q.newProjects,competitiveAction:q.competitiveAction,products:q.products,creditAllocation:q.groupPolicy?.creditAllocation,
    leaderOrders:q.leaderOrders,facilityPolicy:q.facilityPolicy,facilityLifecyclePolicy:q.facilityLifecyclePolicy,
    departmentFunctionsPolicy:q.departmentFunctionsPolicy}));
   submittingSeat=0;E.submit(g,0,pending[0]);
   const replay=resolved===0||(resolved+1)%12===0;
   const resumed=replay?E.migrateCampaign(copy(g)):null;
   submittingSeat=1;E.submit(g,1,pending[1]);submittingSeat=null;resolved++;
   const settled=performance.now();validate(E,g,replay||resolved===months||!!g.gameOver);
   assert.deepEqual(g.players.map(p=>p.isBot),participantFlags);
   if(resumed){
    E.submit(resumed,1,copy(pending[1]));validate(E,resumed,false);
    assert.equal(hash(JSON.stringify(E.migrateCampaign(copy(g)))),hash(JSON.stringify(E.migrateCampaign(resumed))),'Exact saved-state replay');replays++;
   }
   timings.push({month:resolved,planningMs:planned-begin,settlementWithCheckpointMs:settled-planned,validationAndReplayMs:performance.now()-settled});
   timeline.push(copy({month:resolved,choices,...metrics(E,g)}));
   if(resolved%12===0)console.log(JSON.stringify({stage:'progress',spec,resolved,seconds:(performance.now()-started)/1000,
    companies:g.companyEconomy.companies.filter(c=>!c.resolution).length,loans:g.players.map(p=>Math.round(p.stats.loans))}));
  }
 }catch(e){error={message:e.message,stack:e.stack,submittingSeat};}
 const ending=copy(metrics(E,g));
 const snapshot=JSON.stringify({identity,spec,resolved,error,game:g,pending:error?pending:null});
 assert(!/"(?:authorization|password|githubToken|accessToken|refreshToken|localStorage|sessionStorage)"\s*:/i.test(snapshot),'Unexpected credential field');
 const compressed=zlib.gzipSync(snapshot);fs.writeFileSync(savePath,compressed,{flag:'wx'});
 const report={suite:'v31-campaign-lab',status:error?'FAIL':'PASS',identity,spec,resolved,replays,error,
  sourceUnchanged:hash(fs.readFileSync(sourcePath,'utf8'))===identity.htmlSha256,
  terminal:!!g.gameOver,endReason:g.endReason||null,seconds:(performance.now()-started)/1000,
  save:{path:savePath,sha256:hash(compressed),bytes:compressed.length,uncompressedBytes:Buffer.byteLength(snapshot)},
  opening,ending,timeline,timings,
  limits:'Unmodified engine, ordinary AI plans, no forced survival or resource grants. Command timings are not browser latency. Technical invariants do not establish fun or real two-computer acceptance.'};
 fs.writeFileSync(reportPath,JSON.stringify(report)+'\n',{flag:'wx'});
 console.log(JSON.stringify({stage:'finished',reportPath,status:report.status,resolved,replays,error,seconds:report.seconds,ending}));
 if(error)process.exitCode=1;
 return report;
}
module.exports={metrics,validate,run};
if(require.main===module)run();
