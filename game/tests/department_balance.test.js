'use strict';
// Same-rule Group6 characterization, not an equal-share/survival target.
// node tests/department_balance.test.js [--scenario=regulatory --seed=department-A --turns=24]
// Optional --report=NAME.json writes an exclusive engine-only report/checkpoint
// under reports/qa; no file is written without that option. --create-only checks
// all selected opening configurations without planning or resolving a turn.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),hash=x=>createHash('sha256').update(x).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const assembled=require('../tools/build_game').assemble().html,portablePath=path.join(root,'BRANCH_WARS.html');
const portable=fs.existsSync(portablePath)?fs.readFileSync(portablePath,'utf8'):null;
const source=assembled.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={console};
vm.runInNewContext(source,context);const E=context.BWEngine;
const identity={execution:'assembled-source',engineSha256:hash(source),assembledSha256:hash(assembled),
 portableSha256:portable===null?null:hash(portable),portableMatchesSource:portable===assembled,testSha256:hash(fs.readFileSync(__filename))};
const option=key=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3),createOnly=process.argv.includes('--create-only');
const scenarioKeys=['balanced','growth','regulatory','rate'];
for(const key of scenarioKeys)assert(Object.hasOwn(E.SCENARIOS,key),'Missing authored scenario '+key);
// There is currently no authored "volatile" scenario. Do not silently pass an
// unknown name into createGame and accidentally benchmark its fallback instead.
let cases=scenarioKeys.flatMap(scenario=>['department-A','department-B'].map(seed=>({scenario,seed,turns:24})));
if(option('scenario')||option('seed')||option('turns'))cases=[{scenario:option('scenario')||'balanced',seed:option('seed')||'department-A',turns:Number(option('turns')||24)}];
for(const spec of cases){assert(Object.hasOwn(E.SCENARIOS,spec.scenario),'Use an actual E.SCENARIOS key.');assert(/^[\w.-]{1,80}$/.test(spec.seed),'Use a reproducible plain seed.');assert(Number.isSafeInteger(spec.turns)&&spec.turns>=1&&spec.turns<=480);}
const reportName=option('report'),reportRequested=reportName!==undefined||process.argv.includes('--report');
if(reportName!==undefined)assert(/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.json$/.test(reportName),'Report must be a plain .json filename, not a path.');
const reportDirectory=path.resolve(root,'reports','qa'),reportPath=reportRequested?path.resolve(reportDirectory,reportName||'department-balance-'+identity.engineSha256.slice(0,12)+'-'+Date.now()+'.json'):null;
if(reportPath){assert.equal(path.dirname(reportPath),reportDirectory);assert(!fs.existsSync(reportPath),'Refusing to overwrite existing evidence.');}
const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:6}).options;
const results=[],finalCheckpoints=[],started=Date.now();let failure=null,replayChecks=0;
const roles=E.DepartmentFunctions.ROLES,ids=E.DepartmentFunctions.IDS,sum=xs=>xs.reduce((n,x)=>n+x,0);
function close(a,b,label){assert(Math.abs(a-b)<1e-7,label+': '+a+' vs '+b);}
function same(a,b,label){assert.deepEqual(copy(a),copy(b),label);}
function validate(g){
 E.validatePilot(g);E.validateLedger(g);assert.equal(g.financialGroupVersion,6);assert.equal(g.version,'9.5');
 for(const p of g.players){E.AccountingPrototype.check(p.accounting);E.DepartmentFunctions.validate(p);}
 E.DepartmentProvider.validate(g.departmentFunctionEconomy);
 const before=hash(JSON.stringify(g));
 for(const seat of [0,1]){
  const v=E.publicState(g,seat);E.validateFinancialGroupView(v);E.validateAgencyView(v);E.validateCorporateView(v);
  for(const key of ['departmentFunctions','departmentFunctionDelivery','departmentOffice','facilityNetwork','facilityLifecycle','agency','financialGroup'])assert.equal(v.rival[key],undefined,key+' must remain private');
  for(const key of ['departmentFunctionEconomy','departmentEconomy','facilityEconomy','agencyEconomy'])assert.equal(v[key],undefined,key+' must remain private');
  for(const key of ['departmentFunctionsPolicy','departmentPolicy','leaderOrders','facilityPolicy','facilityLifecyclePolicy','agencyPolicy'])assert.equal(v.lastPlans?.[v.rival.id]?.[key],undefined,key+' must remain private');
  same(v.me.departmentFunctions,g.players[seat].departmentFunctions,'Exact owner function book');
  same(v.me.departmentFunctionDelivery,g.players[seat].departmentFunctionDelivery,'Exact owner delivery');
 }
 assert.equal(hash(JSON.stringify(g)),before,'Validation/projection changed the campaign.');
 for(const p of g.players){
  const d=p.departmentFunctionDelivery;if(!d)continue;const r=d.report;
  assert(sum(Object.values(d.actual.physicalQuarters))<=d.actual.headcount*4,'Paid vendors cannot create employees.');
  for(const role of roles){
   const tasks=sum(r.rows.map(t=>t.delivered.retained[role]+t.delivered.additional[role]));
   const idle=sum(ids.map(id=>r.idleByFunction[id].delivered.staff[role]));
   close(tasks+idle+r.remainingPools[role]+r.physical.residualQuantizationHold[role]+r.physical.deliveredRoundingHold[role],r.physical.delivered[role],'One conserved physical pool');
   assert(r.physical.delivered[role]<=d.actual.physicalQuarters[role]+1e-7);
  }
  for(const id of ids)close(sum(r.rows.filter(t=>t.department===id).map(t=>t.delivered.vendor))+r.idleByFunction[id].delivered.vendor,d.actual.paidVendorQuarters[id],'Finite paid vendor work');
  assert.equal(r.vendors.paidExpense,p.departmentFunctions.report.vendorExpense,'Delivery must use actual paid vendor bill.');
 }
}
function playerMetrics(g,p){
 const total=sum(g.players.map(x=>x.stats.deposits)),delivery=p.departmentFunctionDelivery?.report;
 const cohorts=p.creditBook.cohorts,loansByProduct={};for(const c of cohorts)loansByProduct[c.product]=(loansByProduct[c.product]||0)+c.principal;
 const offices=p.facilityNetwork.offices.filter(x=>x.closedCycle===null),conditions=offices.map(o=>p.facilityLifecycle.records[o.id].conditionBp);
 return {id:p.id,cash:p.stats.cash,capital:p.stats.capital,capitalRatio:E.capitalRatio(p),retainedEarnings:p.accounting.retainedEarnings,
  deposits:p.stats.deposits,depositShare:total?p.stats.deposits/total:0,loans:p.stats.loans,loansByProduct,
  loanCohorts:cohorts.length,arrears:sum(cohorts.flatMap(c=>c.late||[])),chargeoffs:p.stats.chargeoffs,
  emergencyDebt:p.stats.emergencyDebt,funding:E.fundingPosition(p),bankProfit:p.stats.lastProfit,staff:p.stats.staff,allocation:copy(p.allocation),
  leaders:Object.values(p.departmentOffice.leaders).filter(Boolean).map(l=>({profile:l.profile,experience:l.experience})),
  leadershipArrears:sum(Object.values(p.departmentOffice.arrears)),departmentPaid:p.departmentFunctions.paid,
  departmentPolicy:copy(p.departmentFunctions.policy),departmentVendorExpense:p.departmentFunctions.report?.vendorExpense||0,
  capacity:delivery?{physical:copy(delivery.physical),remainingPools:copy(delivery.remainingPools),vendorPaid:copy(delivery.vendors.paid),
   tasks:delivery.rows.map(t=>({id:t.id,department:t.department,workload:t.workload,capacity:t.delivered.capacity,served:t.delivered.served,shortfall:t.delivered.shortfall}))}:null,
  offices:offices.length,officeModels:Object.fromEntries(Object.keys(E.FacilityLifecycle.CATALOG).map(model=>[model,offices.filter(o=>o.model===model).length])),
  minimumConditionBp:conditions.length?Math.min(...conditions):null,
  parentCash:p.financialGroup.parent.accounts.cash,agency:{status:p.agency.status,failures:p.agency.failures,staff:p.agency.staff,cash:p.agency.book.accounts.cash,report:copy(p.agency.report)}};
}
function openingCounter(){return {bankProfit:0,lossMonths:0,minBankProfit:null,maxBankProfit:null,minCapitalRatio:null,maxShare:0,
 plannedVendorExpense:0,plannedAdditionalQuarters:0,monthsWithVendorOrders:0,monthsWithAdditionalQuotas:0,
 vendorByFunction:Object.fromEntries(ids.map(id=>[id,0])),additionalByRole:Object.fromEntries(roles.map(r=>[r,0])),
 allocationTotals:Object.fromEntries(roles.map(r=>[r,0])),workloadByTask:{},servedByTask:{},shortfallByTask:{}};}
function recordPlan(p,plan,total){
 const policy=plan.departmentFunctionsPolicy;
 const cost=sum(ids.map(id=>policy.vendors[id]*E.DepartmentFunctions.FUNCTIONS[id].vendorRate));
 const quarters=sum(ids.flatMap(id=>roles.map(role=>policy.quotas[id][role])));
 total.plannedVendorExpense+=cost;total.plannedAdditionalQuarters+=quarters;total.monthsWithVendorOrders+=Number(cost>0);total.monthsWithAdditionalQuotas+=Number(quarters>0);
 for(const id of ids)total.vendorByFunction[id]+=policy.vendors[id];
 for(const role of roles){total.additionalByRole[role]+=sum(ids.map(id=>policy.quotas[id][role]));total.allocationTotals[role]+=plan.allocation[role];}
}
function recordClosing(p,total){
 const profit=p.stats.lastProfit;total.bankProfit+=profit;total.lossMonths+=Number(profit<0);
 total.minBankProfit=total.minBankProfit===null?profit:Math.min(total.minBankProfit,profit);total.maxBankProfit=total.maxBankProfit===null?profit:Math.max(total.maxBankProfit,profit);
 const ratio=E.capitalRatio(p);total.minCapitalRatio=total.minCapitalRatio===null?ratio:Math.min(total.minCapitalRatio,ratio);
 for(const task of p.departmentFunctionDelivery?.report.rows||[]){for(const [key,value]of [['workloadByTask',task.workload],['servedByTask',task.delivered.served],['shortfallByTask',task.delivered.shortfall]])total[key][task.id]=(total[key][task.id]||0)+value;}
}
console.log(JSON.stringify({suite:'department-balance',identity,cases,scenarioNames:E.SCENARIOS,createOnly,reportPath}));
for(const spec of cases){
 const g=E.createGame({...options,financialGroupVersion:6,mode:'hotseat',scenario:spec.scenario,seed:spec.seed,created:1}),begin=Date.now(),initialFlags=g.players.map(p=>p.isBot);
 const totals=g.players.map(openingCounter),actions={construction:0,conversions:0,renovations:0,appointments:0,specialistHires:0,agencyLaunches:0};
 let resolved=0,pending=null,submittingSeat=null,openingGame=null;
 try{
  validate(g);
  while(!createOnly&&resolved<spec.turns&&!g.gameOver){
   openingGame=JSON.stringify(g);pending=null;submittingSeat=null;
   pending=g.players.map((p,seat)=>E.chooseBot(g,seat));
   for(const [seat,q]of pending.entries()){
    recordPlan(g.players[seat],q,totals[seat]);const projects=q.newProjects||[q.newProject].filter(Boolean);
    actions.construction+=projects.filter(key=>key.startsWith('branch')).length;actions.conversions+=Number(!!q.facilityPolicy?.convert);actions.renovations+=Number(!!q.facilityLifecyclePolicy?.renovate);
    actions.appointments+=Object.values(q.leaderOrders||{}).filter(x=>x!==null&&x!=='none').length;actions.specialistHires+=sum(Object.values(q.specialistHires||{}));actions.agencyLaunches+=Number(!!q.agencyPolicy?.launch);
   }
   submittingSeat=0;E.submit(g,0,pending[0]);
   const replayThisMonth=resolved===0||(resolved+1)%12===0;let resumed=null;
   if(replayThisMonth){
    const half=copy(g);resumed=E.migrateCampaign(copy(half));validate(resumed);same(E.migrateCampaign(copy(resumed)),resumed,'Half-ready import must be stable');
   }
   submittingSeat=1;E.submit(g,1,pending[1]);resolved++;submittingSeat=null;
   validate(g);assert.deepEqual(g.players.map(p=>p.isBot),initialFlags);
   if(resumed){E.submit(resumed,1,copy(pending[1]));validate(resumed);same(E.migrateCampaign(copy(g)),E.migrateCampaign(copy(resumed)),'Exact half-ready replay including RNG and payment');replayChecks++;}
   const totalDeposits=sum(g.players.map(p=>p.stats.deposits));
   for(const [seat,p]of g.players.entries()){recordClosing(p,totals[seat]);totals[seat].maxShare=Math.max(totals[seat].maxShare,totalDeposits?p.stats.deposits/totalDeposits:0);}
   if(resolved%12===0)console.log(JSON.stringify({progress:spec,resolved,cycle:g.cycle,seconds:(Date.now()-begin)/1000,engineSha256:identity.engineSha256}));
  }
  const result={...spec,resolved,cycle:g.cycle,terminal:!!g.gameOver,endReason:g.endReason||null,winnerId:g.winnerId||null,
   seconds:(Date.now()-begin)/1000,actions,providerPaid:g.departmentFunctionEconomy.paid,companiesActive:g.companyEconomy.companies.filter(c=>!c.resolution).length,
   players:g.players.map((p,seat)=>({...playerMetrics(g,p),observed:totals[seat]}))};
  results.push(result);if(reportRequested)finalCheckpoints.push({spec,game:copy(g)});console.log(JSON.stringify({caseResult:result}));
 }catch(error){
  let budget=null;try{if(submittingSeat!==null&&pending)budget=E.planBudget(g.players[submittingSeat],pending[submittingSeat]);}catch{}
  failure={spec,resolved,cycle:g.cycle,submittingSeat,actions,budget,error:error.stack,openingGame:openingGame?JSON.parse(openingGame):null,game:copy(g),pending:copy(pending)};
  console.error(JSON.stringify({failedCase:spec,resolved,cycle:g.cycle,submittingSeat,actions,budget,error:error.stack,reportPath}));break;
 }
}
let endingSource=null,endingSourceError=null;try{endingSource=hash(require('../tools/build_game').assemble().html);}catch(error){endingSourceError=error.message;}
const endingPortable=fs.existsSync(portablePath)?hash(fs.readFileSync(portablePath,'utf8')):null;
const report={suite:'department-balance',status:failure?'FAIL':'PASS',identity,endingSourceSha256:endingSource,endingSourceError,
 sourceUnchanged:endingSource===identity.assembledSha256,portableUnchanged:endingPortable===identity.portableSha256,
 seconds:(Date.now()-started)/1000,campaigns:results.length,months:sum(results.map(r=>r.resolved)),failedCampaignMonths:failure?.resolved||0,
 createOnly,replayChecks,results,failure:failure?{spec:failure.spec,resolved:failure.resolved,error:failure.error}:null,
 limits:'Explicit Group6 same-rule AI with real events, finite resources and no interventions or forced survival. Bank operating profit is not whole-group shareholder return. Passing invariants/survival does not establish strategic variety, enjoyable balance or physical multiplayer acceptance.'};
if(reportPath){
 const artifact={...report,finalCheckpoints,failureCheckpoint:failure};
 const text=JSON.stringify(artifact)+'\n';
 assert(!/"(?:authorization|password|githubToken|accessToken|refreshToken|localStorage|sessionStorage)"\s*:/i.test(text),'Unexpected credentials/storage in engine-only diagnostic.');
 fs.mkdirSync(reportDirectory,{recursive:true});fs.writeFileSync(reportPath,text,{flag:'wx'});
 report.artifact={path:reportPath,sha256:hash(text),bytes:Buffer.byteLength(text)};
}
console.log(JSON.stringify(report));if(failure)process.exitCode=1;
