'use strict';
// Actual same-rule Group5 AI characterization. Never force survival, select
// alternative orders, grant funds, or repair a campaign to complete a horizon.
// Default: four authored scenarios x two seeds x24 months.
// Reproduce: --case=regulatory:facility-stress:480, or
// --scenario=regulatory --seed=facility-stress --turns=480 [--portable].
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash}=require('node:crypto'),root=path.resolve(__dirname,'..');
const hash=x=>createHash('sha256').update(x).digest('hex');
const assembled=require('../tools/build_game').assemble().html,portableFile=path.join(root,'BRANCH_WARS.html');
const portable=fs.existsSync(portableFile)?fs.readFileSync(portableFile,'utf8'):null;
const usingPortable=process.argv.includes('--portable');assert(!usingPortable||portable,'Portable build is missing.');
const selected=usingPortable?portable:assembled,source=selected.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={console};
vm.runInNewContext(source,context,{filename:'facility-balance-engine.js'});
const E=context.BWEngine,identity={execution:usingPortable?'portable':'assembled-source',engineHash:hash(source),htmlHash:hash(selected),
 assembledHash:hash(assembled),portableHash:portable===null?null:hash(portable),portableMatchesSource:portable===assembled};
const scenarios=['balanced','rate','regulatory','growth'],arg=k=>process.argv.find(x=>x.startsWith('--'+k+'='))?.slice(k.length+3);
let cases=scenarios.flatMap(scenario=>['facility-A','facility-B'].map(seed=>({scenario,seed,turns:24})));
if(arg('case')){const [scenario,seed,turns]=arg('case').split(':');cases=[{scenario,seed,turns:Number(turns)}];}
else if(arg('scenario')||arg('seed')||arg('turns'))cases=[{scenario:arg('scenario')||'balanced',seed:arg('seed')||'facility-A',turns:Number(arg('turns')||24)}];
for(const spec of cases){assert(scenarios.includes(spec.scenario),'Unknown authored scenario.');assert(typeof spec.seed==='string'&&/^[\w.-]{1,80}$/.test(spec.seed),'Use a reproducible plain seed.');assert(Number.isSafeInteger(spec.turns)&&spec.turns>=1&&spec.turns<=480);}
const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options,started=Date.now(),results=[];
function validate(g){E.validatePilot(g);E.validateLedger(g);const before=hash(JSON.stringify(g));
 for(const seat of [0,1]){
  const view=E.publicState(g,seat);E.validateFinancialGroupView(view);E.validateAgencyView(view);
  assert(view.me.facilityLifecycle&&view.me.facilityNetwork.version===2);E.FacilityLifecycle.validate(view.me,view.cycle,true);
  for(const key of ['facilityLifecycle','facilityNetwork','departmentOffice','agency'])assert.equal(view.rival[key],undefined);
  for(const key of ['facilityEconomy','departmentEconomy','agencyEconomy'])assert.equal(view[key],undefined);
  for(const key of ['facilityLifecyclePolicy','facilityPolicy','departmentPolicy','leaderOrders','agencyPolicy'])assert.equal(view.lastPlans?.[view.rival.id]?.[key],undefined);
 }
 assert.equal(hash(JSON.stringify(g)),before,'Public owner projection cannot change the saved game.');
}
function metrics(g){
 const totalDeposits=g.players.reduce((n,p)=>n+p.stats.deposits,0);
 return g.players.map(p=>{
  const offices=p.facilityNetwork.offices.filter(o=>o.closedCycle===null),rows=offices.map(o=>p.facilityLifecycle.records[o.id]);
  const modelCounts=Object.fromEntries(Object.keys(E.FacilityLifecycle.CATALOG).map(k=>[k,offices.filter(o=>o.model===k).length]));
  return {id:p.id,cash:p.stats.cash,capital:p.stats.capital,capitalRatio:E.capitalRatio(p),deposits:p.stats.deposits,
   depositShare:totalDeposits?p.stats.deposits/totalDeposits:0,profit:p.stats.lastProfit,loans:p.stats.loans,
   staff:p.stats.staff,offices:offices.length,modelCounts,conditionMinimumBp:rows.length?Math.min(...rows.map(r=>r.conditionBp)):null,
   conditionMeanBp:rows.length?Math.round(rows.reduce((n,r)=>n+r.conditionBp,0)/rows.length):null,
   maintenanceModes:Object.fromEntries(['off','basic','full'].map(k=>[k,rows.filter(r=>r.maintenance===k).length])),
   renovations:rows.reduce((n,r)=>n+r.renovations,0),pendingRenovations:rows.filter(r=>r.renovation).length,
   leaders:Object.values(p.departmentOffice.leaders).filter(Boolean).map(l=>({profile:l.profile,experience:l.experience})),
   leadershipArrears:Object.values(p.departmentOffice.arrears).reduce((n,x)=>n+x,0),
   agency:{status:p.agency.status,failures:p.agency.failures,cash:p.agency.book?.accounts.cash??null}};
 });
}
function assertNoCredentials(value){if(!value||typeof value!=='object')return;
 for(const [key,child]of Object.entries(value)){assert(!/^(authorization|password|githubToken|accessToken|refreshToken|sessionStorage|localStorage|gh|lan|p2pConfig)$/i.test(key),'Credential field in generated engine-only diagnostic: '+key);assertNoCredentials(child);}}
function captureFailure(spec,g,resolved,pending,seat,error,actions,openingSnapshot){
 const directory=path.resolve(root,'reports','qa');fs.mkdirSync(directory,{recursive:true});
 const stem='facility-failure-'+identity.engineHash.slice(0,12)+'-'+spec.scenario+'-'+spec.seed+'-'+g.cycle;
 const checkpoint={spec,resolved,submittingSeat:seat,identity,actions,error:error.stack,game:g,pending,
  openingGame:openingSnapshot?JSON.parse(openingSnapshot):null};assertNoCredentials(checkpoint);
 const bytes=JSON.stringify(checkpoint)+'\n',digest=hash(bytes),file=path.join(directory,stem+'-'+digest.slice(0,8)+'.json');
 if(!fs.existsSync(file))fs.writeFileSync(file,bytes,{flag:'wx'});
 return {file,sha256:digest,bytes:Buffer.byteLength(bytes)};
}
console.log(JSON.stringify({suite:'facility-lifecycle-balance',identity,cases}));
for(const spec of cases){
 const g=E.createGame({...options,mode:'hotseat',scenario:spec.scenario,seed:spec.seed,created:1}),caseStarted=Date.now();
 assert.equal(g.financialGroupVersion,5);assert.equal(g.version,'9.4');const flags=g.players.map(p=>p.isBot);
 const actions={construction:0,conversions:0,renovations:0,renovationCancellations:0,appointments:0,demotions:0,specialistHires:0,agencyLaunches:0};
 let resolved=0,pending=null,submittingSeat=null,openingSnapshot=null,minCapitalRatio=Infinity,maxShare=.5,maxArrears=0,minCondition=10000;
 const bankTotals=g.players.map(()=>({profit:0,lossMonths:0,minProfit:Infinity,maxProfit:-Infinity}));
 try{
  validate(g);
  while(resolved<spec.turns&&!g.gameOver){
   openingSnapshot=JSON.stringify(g);pending=null;submittingSeat=null;
   pending=g.players.map((p,i)=>E.chooseBot(g,i));
   for(const plan of pending){
    const projects=plan.newProjects||[plan.newProject].filter(Boolean);actions.construction+=projects.filter(k=>/^branch/.test(k)).length;
    actions.conversions+=Number(!!plan.facilityPolicy?.convert);actions.renovations+=Number(!!plan.facilityLifecyclePolicy?.renovate);
    actions.renovationCancellations+=Number(!!plan.facilityLifecyclePolicy?.cancel);
    for(const order of Object.values(plan.leaderOrders||{})){if(order==='none')actions.demotions++;else if(order!==null)actions.appointments++;}
    actions.specialistHires+=Object.values(plan.specialistHires||{}).reduce((n,x)=>n+x,0);actions.agencyLaunches+=Number(!!plan.agencyPolicy?.launch);
   }
   for(const seat of [0,1]){submittingSeat=seat;E.submit(g,seat,pending[seat]);}resolved++;submittingSeat=null;
   validate(g);assert.deepEqual(g.players.map(p=>p.isBot),flags);
   const current=metrics(g);for(const [i,p]of current.entries()){
    minCapitalRatio=Math.min(minCapitalRatio,p.capitalRatio);maxShare=Math.max(maxShare,p.depositShare);maxArrears=Math.max(maxArrears,p.leadershipArrears);
    if(p.conditionMinimumBp!==null)minCondition=Math.min(minCondition,p.conditionMinimumBp);
    bankTotals[i].profit+=p.profit;bankTotals[i].lossMonths+=Number(p.profit<0);bankTotals[i].minProfit=Math.min(bankTotals[i].minProfit,p.profit);bankTotals[i].maxProfit=Math.max(bankTotals[i].maxProfit,p.profit);
   }
   if(resolved%24===0)console.log(JSON.stringify({progress:spec,resolved,cycle:g.cycle,seconds:(Date.now()-caseStarted)/1000,engineHash:identity.engineHash}));
  }
  const result={...spec,resolved,cycle:g.cycle,terminal:!!g.gameOver,terminalReason:g.gameOver||null,
   seconds:(Date.now()-caseStarted)/1000,actions,minCapitalRatio,maxDepositShare:maxShare,maxLeadershipArrears:maxArrears,
   minimumFacilityConditionBp:minCondition,maintenancePaid:g.facilityEconomy.maintenancePaid,renovationPaid:g.facilityEconomy.renovationPaid,
   players:metrics(g).map((p,i)=>({...p,observedBankProfit:bankTotals[i]}))};
  results.push(result);console.log(JSON.stringify({caseResult:result}));
 }catch(error){
  const capture=captureFailure(spec,g,resolved,pending,submittingSeat,error,actions,openingSnapshot);
  let budget=null;try{if(submittingSeat!==null)budget=E.planBudget(g.players[submittingSeat],pending[submittingSeat]);}catch{}
  console.error(JSON.stringify({failedCase:spec,resolved,cycle:g.cycle,submittingSeat,identity,actions,budget,capture,error:error.stack}));throw error;
 }
}
const sourceUnchanged=hash(require('../tools/build_game').assemble().html)===identity.assembledHash;
const portableUnchanged=(fs.existsSync(portableFile)?hash(fs.readFileSync(portableFile,'utf8')):null)===identity.portableHash;
console.log(JSON.stringify({suite:'facility-lifecycle-balance',identity,sourceUnchanged,portableUnchanged,
 seconds:(Date.now()-started)/1000,campaigns:results.length,months:results.reduce((n,r)=>n+r.resolved,0),
 terminalCampaigns:results.filter(r=>r.terminal).length,results,
 limits:'Same-rule fresh campaigns without interventions or forced survival. Provisional economics are characterized, not tuned. Passing invariants is not proof of enjoyable balance or a physical two-computer multiplayer session.'}));
