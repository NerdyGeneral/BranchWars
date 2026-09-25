'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const reference=fs.readFileSync(path.join(root,'reports/reference-builds/BRANCH_WARS_facility_group5_ba759abc.html'),'utf8');
assert.equal(hash(reference),'ba759abce19b84eb495307713a98db607746d85852fd63fe9199c8a6a931619c');
function load(text,extra=''){const c={console};vm.runInNewContext(text.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={'+extra),c);return c.BWEngine;}
const E=load(html,'facilityStaffAllocation,facilityLifecyclePlanningContext,facilityLifecycleModelTerms,planDepartmentFunctions,'),base=load(reference),L=E.FacilityLifecycle;
const same=(a,b)=>assert.deepEqual(copy(a),copy(b));let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:6}).options;
const initial=E.createGame({...options,mode:'hotseat',scenario:'balanced',seed:'viable-office-schema',created:1});
// Explicit domain-schema fixtures, not free constructed offices or playable
// imported campaigns. Actual whole-game prices and regional terms are retained.
function fixture(models,pool){
 const owner=copy(initial.players[0]);delete owner.facilityLifecycle;
 owner.facilityNetwork.offices=models.map((model,i)=>({id:owner.id+':office:'+(i+1),model,market:'downtown',openedCycle:1,closedCycle:null,conversion:null}));
 const p=L.initialize(owner,1,true),policy=L.defaultPlan(p);
 const context={cycle:1,freeCash:5000000,freeExecution:10,availableStaffQuarters:{service:0,business:0,lending:0,operations:0,wealth:0,...pool},wealthLicensed:()=>false,nearby:()=>true,modelTerms:E.facilityLifecycleModelTerms,occupiedMarkets:[],restriction:''};
 return {p,policy,context,ids:p.facilityNetwork.offices.map(o=>o.id)};
}
function allocate(f){const before=JSON.stringify(f),a=E.facilityStaffAllocation(f.p,f.policy,f.context);assert.equal(JSON.stringify(f),before);same(a,E.facilityStaffAllocation(f.p,f.policy,f.context));for(const role of L.ROLES){const used=Object.values(a.policy.offices).reduce((n,row)=>n+row.staffQuarters[role],0);assert.equal(used+a.unused[role],f.context.availableStaffQuarters[role]);}return a;}
test('Zero-Service ATMs release Operations; a productive partly staffed branch stays productive',()=>{
 const f=fixture(['atm','atm'],{operations:2}),a=allocate(f);assert.equal(a.unused.operations,2);assert.equal(a.released.length,2);
 const r=fixture(['retail'],{service:1,operations:1}),b=allocate(r);assert(b.metrics.rows[0].capacity.depositCapacity>0);assert.equal(b.unused.operations,0);assert.equal(b.policy.offices[r.ids[0]].staffQuarters.service,1);
});
test('Released roles refill a later viable office without funding an unlicensed wealth facility',()=>{
 const f=fixture(['wealth','atm'],{service:2,operations:3,wealth:8}),a=allocate(f);
 assert.equal(Object.values(a.policy.offices[f.ids[0]].staffQuarters).reduce((n,x)=>n+x,0),0);
 assert(a.metrics.rows[1].capacity.depositCapacity>0);assert.equal(a.unused.wealth,8);assert.equal(a.unused.operations,2);
});
test('Stable roster priority and no unnecessary withdrawal from already productive offices',()=>{
 const f=fixture(['atm','atm','atm'],{service:1,operations:3}),a=allocate(f);
 assert(a.metrics.rows[0].capacity.depositCapacity>0);assert.equal(a.metrics.rows[1].capacity.depositCapacity,0);assert.equal(a.unused.operations,2);
 same(a.policy.offices[f.ids[0]].staffQuarters,L.allocateStaff(f.p,f.context.availableStaffQuarters).plan.offices[f.ids[0]].staffQuarters);
});
test('Live hub transfers survive; links and maintenance are never silently rewritten',()=>{
 const f=fixture(['regionalHub','atm'],{service:8,operations:13,business:4,lending:4});
 f.policy.offices[f.ids[1]].hubId=f.ids[0];f.policy.offices[f.ids[0]].maintenance='basic';
 const a=allocate(f);assert(a.metrics.rows[0].supportSent>0);assert(a.metrics.rows[1].supportReceived>0);assert.equal(a.policy.offices[f.ids[1]].staffQuarters.operations,1);assert.equal(a.policy.offices[f.ids[1]].hubId,f.ids[0]);assert.equal(a.policy.offices[f.ids[0]].maintenance,'basic');
});
test('Hub redistribution that would reduce an already served office retains the complete original proposal',()=>{
 const f=fixture(['wealth','regionalHub','atm','atm','atm'],{service:10,operations:16,business:4,lending:4,wealth:8});
 for(const id of f.ids.slice(2))f.policy.offices[id].hubId=f.ids[1];
 const a=allocate(f),old=L.allocateStaff(f.p,f.context.availableStaffQuarters);assert.equal(a.fallback,true);
 for(const id of f.ids)same(a.policy.offices[id].staffQuarters,old.plan.offices[id].staffQuarters);
 assert.equal(a.released.length,0);same(a.unused,old.unused);
});
test('Condition, ramp, conversion and paid renovation are measured exactly, not guessed',()=>{
 const f=fixture(['retail','atm'],{service:8,lending:2,operations:3});
 f.p.facilityLifecycle.records[f.ids[0]].conditionBp=1000;
 const a=allocate(f);assert.equal(Object.values(a.policy.offices[f.ids[0]].staffQuarters).reduce((n,x)=>n+x,0),0);assert(a.metrics.rows[1].capacity.depositCapacity>0);
 for(const mode of ['ramp','conversion','renovation']){
  const g=fixture(['retail'],{service:1,lending:1,operations:1});
  if(mode==='ramp'){g.p.facilityLifecycle.records[g.ids[0]].rampMonths=0;g.p.facilityLifecycle.records[g.ids[0]].initialRampMonths=0;}
  if(mode==='conversion')g.p.facilityNetwork.offices[0].conversion={target:'commercial'};
  if(mode==='renovation'){g.p.facilityLifecycle.records[g.ids[0]].conditionBp=8000;g.policy.renovate=g.ids[0];}
  const b=allocate(g);assert(b.metrics.rows[0].capacity.depositCapacity>0);same(b.metrics,L.quote(g.p,b.policy,g.context).metrics);assert.equal(b.policy.renovate,g.policy.renovate);
 }
});
test('Malformed pools and invalid links fail; no fabricated staff or repaired instructions',()=>{
 const f=fixture(['atm'],{operations:1,service:1});f.context.availableStaffQuarters.service=-1;assert.throws(()=>allocate(f));
 f.context.availableStaffQuarters.service=1;f.policy.offices[f.ids[0]].hubId='missing';assert.throws(()=>allocate(f));
});
test('All seven models retain productive capacities across zero, partial and full physical pools',()=>{
 for(const [model,terms]of Object.entries(L.CATALOG))for(const scale of [0,.5,1]){
  const pool=Object.fromEntries(L.ROLES.map(role=>[role,Math.floor(terms.staffQuarters[role]*scale)])),f=fixture([model],pool),a=allocate(f);
  const old=copy(f.policy);old.offices[f.ids[0]].staffQuarters=L.allocateStaff(f.p,pool).plan.offices[f.ids[0]].staffQuarters;
  const before=L.quote(f.p,old,f.context).metrics.rows[0];
  for(const key of Object.keys(before.capacity))assert(a.metrics.rows[0].capacity[key]+1e-9>=before.capacity[key],model+' '+key);
 }
});
test('Actual Group5 creation, both-seat AI, staffing, RNG, half-ready resume and resolved public views remain exact',()=>{
 const opts=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options;
 const g=E.createGame({...opts,mode:'hotseat',scenario:'balanced',seed:'viable-legacy',created:1}),old=base.createGame({...opts,mode:'hotseat',scenario:'balanced',seed:'viable-legacy',created:1});same(g,old);
 for(let month=0;month<2;month++){const plans=[],oldPlans=[];for(let seat=0;seat<2;seat++){plans.push(E.chooseBot(g,seat));oldPlans.push(base.chooseBot(old,seat));same(plans[seat],oldPlans[seat]);same(E.facilityLifecycleStaffProposal(g,g.players[seat],plans[seat]),base.facilityLifecycleStaffProposal(old,old.players[seat],oldPlans[seat]));}
  E.submit(g,0,plans[0]);base.submit(old,0,oldPlans[0]);same(g,old);same(E.migrateCampaign(copy(g)),base.migrateCampaign(copy(old)));
  E.submit(g,1,plans[1]);base.submit(old,1,oldPlans[1]);same(g,old);for(let seat=0;seat<2;seat++)same(E.publicState(g,seat),base.publicState(old,seat));
 }
});
test('Supported 4096-record maximum uses at most three whole-network metric passes',()=>{
 for(const [kind,models,pool]of [['atm',Array(4096).fill('atm'),{operations:400}],['hubs',Array(4096).fill('regionalHub'),{operations:400}],['mixed',Array.from({length:4096},(_,i)=>Object.keys(L.CATALOG)[i%7]),{service:400,business:400,lending:400,operations:400,wealth:400}]]){
  const f=fixture(models,pool),started=performance.now(),a=E.facilityStaffAllocation(f.p,f.policy,f.context);assert(a.metricCalls<=3);assert(a.localMetricCalls<=6*models.length);
  for(const role of L.ROLES)assert.equal(a.unused[role]+Object.values(a.policy.offices).reduce((n,r)=>n+r.staffQuarters[role],0),f.context.availableStaffQuarters[role]);
  console.log(JSON.stringify({size:models.length,kind,ms:Math.round(performance.now()-started),fullMetricCalls:a.metricCalls,localMetricCalls:a.localMetricCalls}));
 }
});
test('Real Group6 plans preserve owner state and accept half-ready submit/resume without source injection or paid-state gifts',()=>{
 const bytes=require('node:zlib').gunzipSync(fs.readFileSync(path.join(root,'tests/fixtures/department-matrix192-second.json.gz')),{maxOutputLength:64*1024*1024});
 assert.equal(hash(bytes),'f961e016e5713579b7cc0c7fe2535c85de6ef53ee01e9143ee20589c1c84f7cc');
 const archived=JSON.parse(bytes),g=copy(archived.finalCheckpoints.find(x=>x.spec.scenario==='growth'&&x.spec.seed==='department-B').game);
 for(let seat=0;seat<2;seat++){
  const p=g.players[seat],q=E.chooseBot(g,seat),before=JSON.stringify(g),draft=JSON.stringify(q),a=E.facilityLifecycleStaffProposal(g,p,q),b=E.facilityLifecycleStaffProposal(g,p,q);
  same(a,b);assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(q),draft);
  const next={...copy(q),facilityLifecyclePolicy:a.policy},quote=E.lifecycleInstructionQuote(g,p,next);assert(quote.status.eligible,quote.status.reason);
  for(const key of ['renovate','cancel'])assert.equal(next.facilityLifecyclePolicy[key],q.facilityLifecyclePolicy[key]);
  for(const [id,row]of Object.entries(next.facilityLifecyclePolicy.offices)){assert.equal(row.maintenance,q.facilityLifecyclePolicy.offices[id].maintenance);assert.equal(row.hubId,q.facilityLifecyclePolicy.offices[id].hubId);}
  assert.equal(E.planBudget(p,next).total,E.planBudget(p,q).total);
  const pending=copy(g);E.submit(pending,seat,next);assert.equal(pending.cycle,g.cycle);E.validatePilot(pending);E.migrateCampaign(copy(pending));
 }
});
test('Actual Group6 both-seat plans resolve two months with valid ledgers, owner views and resume',()=>{
 const g=copy(initial);for(let month=0;month<2;month++){
  const plans=[E.chooseBot(g,0),E.chooseBot(g,1)];E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);
  assert.equal(g.cycle,month+2);E.validatePilot(g);E.validateLedger(g);E.migrateCampaign(copy(g));
  for(let seat=0;seat<2;seat++)assert.equal(E.publicState(g,seat).cycle,g.cycle);
 }
});
if(process.argv.includes('--recorded')){
 const report=JSON.parse(fs.readFileSync(path.join(root,'reports/qa/department-group6-ee80e569-balanced120.json'),'utf8'));
 const archived=require('node:child_process').execFileSync('git',['-c','safe.directory='+path.dirname(root),'show','8095eca:game/BRANCH_WARS.html'],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024});assert.equal(hash(archived),report.identity.portableSha256);
 const oldEngine=load(archived);
test('Actual recorded ee80 owners: same real budget/staff, output preserved, and subsequent function planning is measured',()=>{
 const g=copy(report.finalCheckpoints[0].game);
 for(let index=0;index<2;index++){
  const p=g.players[index],q=oldEngine.chooseBot(g,index),before=JSON.stringify(g),draft=JSON.stringify(q),start=performance.now();
  const old=oldEngine.facilityLifecycleStaffProposal(g,p,q),candidate=E.facilityLifecycleStaffProposal(g,p,q),ms=performance.now()-start;
  assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(q),draft);
  const previous={...copy(q),facilityLifecyclePolicy:old.policy},next={...copy(q),facilityLifecyclePolicy:candidate.policy};
  const a=E.lifecycleInstructionQuote(g,p,previous),b=E.lifecycleInstructionQuote(g,p,next);
  assert(a.status.eligible,a.status.reason);assert(b.status.eligible,b.status.reason);assert.equal(a.quote.total,b.quote.total);
  same(old.availableStaffQuarters,candidate.availableStaffQuarters);assert(candidate.unused.operations>=old.unused.operations);
  for(let i=0;i<a.quote.metrics.rows.length;i++)for(const key of ['depositCapacity','loanCapacity','serviceCapacity','advisoryCapacity'])assert(b.quote.metrics.rows[i].capacity[key]+1e-9>=a.quote.metrics.rows[i].capacity[key]);
  const baselineFunctions=E.planDepartmentFunctions(g,index,copy(previous)),candidateFunctions=E.planDepartmentFunctions(g,index,copy(next));
  const qa=E.departmentFunctionsQuote(g,p,baselineFunctions),qb=E.departmentFunctionsQuote(g,p,candidateFunctions);
  assert(qa.status.eligible,qa.status.reason);assert(qb.status.eligible,qb.status.reason);
  for(const row of qa.delivery.rows){const after=qb.delivery.rows.find(r=>r.id===row.id);assert(after.delivered.served+1e-9>=row.delivered.served,'Released staffing must not worsen protected '+row.id);}
  if(index===1){assert.equal(qa.delivery.rows.find(r=>r.id==='technology').delivered.served,0);assert.equal(qb.delivery.rows.find(r=>r.id==='technology').delivered.served,2);}
  const pending=copy(g);E.submit(pending,index,candidateFunctions);assert.equal(pending.cycle,g.cycle);assert(pending.players[index].submitted);E.validatePilot(pending);E.migrateCampaign(copy(pending));
  const rows=x=>Object.fromEntries(x.delivery.rows.map(r=>[r.id,r.delivered.served]));
  console.log(JSON.stringify({seat:index,proposalMs:Math.round(ms),metricCalls:candidate.metricCalls,oldUnused:old.unused,newUnused:candidate.unused,released:candidate.released,beforeTasks:rows(qa),afterTasks:rows(qb),beforeResidual:qa.delivery.remainingPools,afterResidual:qb.delivery.remainingPools,beforeCost:E.planBudget(p,baselineFunctions).total,afterCost:E.planBudget(p,candidateFunctions).total}));
 }
});
}
console.log(JSON.stringify({status:'PASS',checks,assembledSha256:hash(html),scope:'Proposal/plan regression only; no broad balance claims.'}));
