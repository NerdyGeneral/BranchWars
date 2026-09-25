'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fs=require('node:fs'),{performance}=require('node:perf_hooks');
const reference=fs.readFileSync(path.join(root,'reports/reference-builds/BRANCH_WARS_departments_group6_57cc519e.html'),'utf8');
assert.equal(hash(reference),'57cc519e39eb78be7c17c9792cb80bf754571eac452e155ee04001d98eef97e0','Preserved pre-floor Group6 reference must not drift.');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html;
const source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const extra="applyHiring,departmentFunctionRaw:(g,i,plan,floor)=>withCorporateForecast(g,()=>planDepartmentFunctionsCore(g,i,plan,floor)),departmentFunctionGuarded:(g,i,plan)=>withCorporateForecast(g,()=>planDepartmentFunctions(g,i,plan)),floorAcceptance:(g,p,a,b)=>withCorporateForecast(g,()=>departmentOriginationFloorAcceptance(g,p,a,b)),";
const probe="floorProbe:(g,i,plan)=>withCorporateForecast(g,()=>({budget:planBudget(g.players[i],plan),functions:departmentFunctionsQuote(g,g.players[i],plan),forecast:operatingPreview({...g.players[i],marketSnapshot:g.marketEconomy},plan,g.economy)})),";
function load(candidate){let script=(candidate?html:reference).match(/<script id="engine">([\s\S]*?)<\/script>/)[1];const c={console};vm.runInNewContext(script.replace('root.BWEngine={','root.BWEngine={'+(candidate?extra:'')+probe),c);return c.BWEngine;}
const base=load(false),E=load(true),options=version=>base.previewFeatureSelection({}, {field:'financialGroupVersion',value:version}).options;
function create(engine,version=6){return engine.createGame({...options(version),mode:'hotseat',scenario:'balanced',seed:'floor-boundary',created:1});}
const started=performance.now(),timing={baseline:[],current:[]},comparisons=[];
console.log(JSON.stringify({suite:'production-department-ai-lending',identity:{assembled:hash(html),engine:hash(source)}}));
for(const version of [1,2,3,4,5]){
 const a=create(base,version),b=create(E,version),oldPlans=[],newPlans=[];assert.deepEqual(copy(a),copy(b));
 for(const seat of [0,1]){oldPlans.push(base.chooseBot(a,seat));newPlans.push(E.chooseBot(b,seat));assert.deepEqual(copy(oldPlans[seat]),copy(newPlans[seat]));}
 assert.deepEqual(copy(a),copy(b));
 base.submit(a,0,oldPlans[0]);E.submit(b,0,newPlans[0]);assert.deepEqual(copy(a),copy(b));
 const halfOld=copy(a),halfNew=copy(b);base.migrateCampaign(halfOld);E.migrateCampaign(halfNew);assert.deepEqual(halfOld,halfNew);
 base.submit(a,1,oldPlans[1]);E.submit(b,1,newPlans[1]);assert.deepEqual(copy(a),copy(b));
 for(const seat of [0,1])assert.deepEqual(copy(base.publicState(a,seat)),copy(E.publicState(b,seat)));
 base.validatePilot(a);E.validatePilot(b);base.validateLedger(a);E.validateLedger(b);
}
console.log('PASS old Group1-5 creation/both-seat AI/state/RNG/half-ready resume/resolution/public views exact');
// Required clean-checkout fixture: exact lossless archived evidence, not a
// dependency on ignored local reports or a newly generated golden campaign.
const recorded=require('node:zlib').gunzipSync(fs.readFileSync(path.join(root,'tests/fixtures/department-matrix192-second.json.gz')),{maxOutputLength:64*1024*1024});
assert.equal(hash(recorded),'f961e016e5713579b7cc0c7fe2535c85de6ef53ee01e9143ee20589c1c84f7cc','Recorded actual campaign evidence must not drift.');
const report=JSON.parse(recorded);
const checkpoint=report.finalCheckpoints.find(x=>x.spec.scenario==='growth'&&x.spec.seed==='department-B').game;
const g=copy(checkpoint),seat=1,p=g.players[seat];base.chooseBot(g,0);const input=base.chooseBot(g,seat),before=E.departmentFunctionRaw(g,seat,copy(input),false),after=E.departmentFunctionRaw(g,seat,copy(input),true);
assert(E.floorAcceptance(g,p,before,after).accepted,JSON.stringify(E.floorAcceptance(g,p,before,after)));
for(const field of ['collectionsPolicy','workforcePolicy','newProjects']){const changed=copy(after);if(field==='newProjects')changed.newProjects=['remediation'];else changed[field]={};assert(!E.floorAcceptance(g,p,before,changed).accepted);}
const malformed=copy(after);malformed.departmentFunctionsPolicy.quotas.risk.operations=400;assert(!E.floorAcceptance(g,p,before,malformed).accepted);
const riskLoss=copy(after);riskLoss.departmentFunctionsPolicy.quotas.risk={service:0,business:0,lending:0,operations:0};riskLoss.departmentFunctionsPolicy.vendors.risk=0;
assert(!E.floorAcceptance(g,p,before,riskLoss).accepted,'Do not buy growth with lost risk coverage');
console.log('PASS real quotes reject malformed work, changed commitments and worse risk coverage');
// Explicit accounting boundary fixtures use balanced, paid transactions, not
// fabricated source balance sheets. They are proposal tests, not save fixtures.
for(const kind of ['debt','capital','cash','reserve']){
 const world=copy(g),owner=world.players[seat],q=copy(input);
 if(kind==='debt')owner.accounting=E.AccountingPrototype.transact(owner.accounting,'borrow',10000);
 if(kind==='capital')owner.accounting=E.AccountingPrototype.transact(owner.accounting,'expense',Math.min(owner.stats.cash,owner.stats.capital-1));
 if(kind==='cash')owner.accounting=E.AccountingPrototype.transact(owner.accounting,'buySecurities',Math.max(0,owner.stats.cash-200000));
 if(kind==='reserve')q.departmentPolicy.reserve=Math.ceil(owner.stats.cash/50000)*50000;
 Object.assign(owner.stats,{cash:owner.accounting.accounts.cash,capital:owner.accounting.accounts.equity,earnings:owner.accounting.retainedEarnings,emergencyDebt:owner.accounting.accounts.emergencyDebt});
 E.AccountingPrototype.check(owner.accounting);
 const state=JSON.stringify(world),normal=E.departmentFunctionRaw(world,seat,copy(q),false),guarded=E.departmentFunctionGuarded(world,seat,copy(q));
 assert.equal(JSON.stringify(world),state);assert.deepEqual(copy(guarded),copy(normal),kind+' must retain baseline');
}
console.log('PASS debt, undercapitalized, low-cash and protected-reserve boundaries retain baseline');
// Same real portfolio, explicitly different prospective staff orders. These
// fixtures test scarce compatible time; they are not claimed historical turns.
for(const ops of [0,1]){
 const world=copy(g),owner=world.players[seat],q=copy(input);
 const total=Object.values(q.allocation).reduce((n,x)=>n+x,0);
 q.allocation={service:2,business:total-3-ops,lending:1,operations:ops};
 q.newProjects=[];q.newProject=null;q.investments={};q.opportunity=null;
 q.servicePolicy.staff=0;q.servicePolicy.outsourcing=0;q.servicePolicy.payroll=false;q.servicePolicy.treasury=false;
 q.collectionsPolicy.share=25;
 for(const office of Object.values(q.facilityLifecyclePolicy.offices))for(const role of Object.keys(office.staffQuarters))office.staffQuarters[role]=0;
 const state=JSON.stringify(world),normal=E.departmentFunctionRaw(world,seat,copy(q),false),raw=E.departmentFunctionRaw(world,seat,copy(q),true),guarded=E.departmentFunctionGuarded(world,seat,copy(q));
 const a=E.departmentFunctionsQuote(world,owner,normal),b=E.departmentFunctionsQuote(world,owner,raw),decision=E.floorAcceptance(world,owner,normal,raw);
 assert(a.status.eligible&&b.status.eligible);assert.equal(JSON.stringify(world),state);
 if(!decision.accepted)assert.deepEqual(copy(guarded),copy(normal));
 const final=E.departmentFunctionsQuote(world,owner,guarded);
 for(const row of a.delivery.rows){const next=final.delivery.rows.find(x=>x.id===row.id);assert(next.delivered.served+1e-8>=row.delivered.served,'Protected work '+row.id);}
 console.log(JSON.stringify({scarceOperations:ops,vendorLimit:Math.min(50000,Math.floor(a.context.freeCash*.03)),beforeVendors:a.vendorExpense,afterVendors:b.vendorExpense,accepted:decision.accepted,reason:decision.reason,beforeLending:a.remainingPools.lending,rawLending:b.remainingPools.lending}));
}
{
 const world=create(E),owner=world.players[0];E.applyHiring(world,owner,2,{operations:2});
 const q=base.chooseBot(world,0);q.allocation={service:3,business:2,lending:2,operations:3};q.newProjects=[];q.newProject=null;q.investments={};q.competitiveAction='none';
 q.workforcePolicy.training.operations=20000;q.leaderOrders.operations='mentor';q.departmentPolicy.envelopes.research=250000;
 const normal=E.departmentFunctionRaw(world,0,copy(q),false),guarded=E.departmentFunctionGuarded(world,0,copy(q));
 const a=E.departmentFunctionsQuote(world,owner,normal),b=E.departmentFunctionsQuote(world,owner,guarded);
 assert(a.status.eligible&&b.status.eligible);assert.equal(a.attribution.paidTeacherQuarters.operations,4);assert.deepEqual(copy(a.attribution.paidTeacherQuarters),copy(b.attribution.paidTeacherQuarters));
 assert.deepEqual(copy(a.attribution.exactRetainedQuarters.collections),copy(b.attribution.exactRetainedQuarters.collections));
 assert(E.projectPlanStatus(owner,guarded).eligible);
 console.log('PASS actually paid specialist hiring and active teacher preserved by guarded allocation');
}
// Actual preserved campaign endings, not reconstructed cash/portfolio fixtures.
const gross=r=>Math.round(r.loanGrowth+(r.principalRepaid||0)+(r.creditRecovery||0)+(r.chargeoff||0));
for(const spec of [{scenario:'growth',seed:'department-B',seat:1,gross:95261},{scenario:'regulatory',seed:'department-A',seat:1,gross:62353}]){
 const opening=report.finalCheckpoints.find(x=>x.spec.scenario===spec.scenario&&x.spec.seed===spec.seed).game;
 const worlds=[copy(opening),copy(opening)],engines=[base,E],plans=[],quotes=[];
 for(let variant=0;variant<2;variant++){
  const engine=engines[variant],world=worlds[variant],selected=[];
  for(const seat of [0,1]){const tick=performance.now();selected.push(engine.chooseBot(world,seat));timing[variant?'current':'baseline'].push(performance.now()-tick);}
  plans.push(selected);quotes.push(engine.floorProbe(world,spec.seat,selected[spec.seat]));
 }
 assert.deepEqual(copy(worlds[0]),copy(worlds[1]),'Planning must preserve exact world and RNG.');
 const a=quotes[0],b=quotes[1];
 assert(a.functions.status.eligible&&b.functions.status.eligible);assert.equal(a.functions.remainingPools.lending,0);assert.equal(b.functions.remainingPools.lending,2);
 assert.equal(gross(a.forecast),0);assert(gross(b.forecast)>0);assert.equal(a.functions.vendorExpense,b.functions.vendorExpense);
 for(const row of a.functions.delivery.rows){const next=b.functions.delivery.rows.find(x=>x.id===row.id);assert(next.delivered.served+1e-8>=row.delivered.served,'Existing task must not be traded for growth: '+row.id);}
 assert.deepEqual(copy(a.functions.attribution.paidTeacherQuarters),copy(b.functions.attribution.paidTeacherQuarters));
 assert.deepEqual(copy(a.functions.attribution.exactRetainedQuarters),copy(b.functions.attribution.exactRetainedQuarters));
 const instructionA=copy(plans[0][spec.seat]),instructionB=copy(plans[1][spec.seat]);delete instructionA.departmentFunctionsPolicy;delete instructionB.departmentFunctionsPolicy;
 // The separately approved Group6 facility allocator may release genuinely
 // unproductive office staffing. Reproduce that exact shared proposal using
 // the untouched frozen plan, not the new floor policy or an edited fixture.
 const frozenPlan=copy(plans[0][spec.seat]),currentPlan=copy(plans[1][spec.seat]),currentOwner=worlds[1].players[spec.seat];
 const sharedStaffing=E.facilityLifecycleStaffProposal(worlds[1],currentOwner,frozenPlan).policy;
 assert.deepEqual(copy(currentPlan.facilityLifecyclePolicy),copy(sharedStaffing),'Current office changes must be exactly the authoritative shared proposal on the frozen plan.');
 const oldOfficeQuote=E.lifecycleInstructionQuote(worlds[1],currentOwner,frozenPlan),newOfficeQuote=E.lifecycleInstructionQuote(worlds[1],currentOwner,currentPlan);
 assert(oldOfficeQuote.status.eligible,oldOfficeQuote.status.reason);assert(newOfficeQuote.status.eligible,newOfficeQuote.status.reason);
 assert.equal(newOfficeQuote.quote.total,oldOfficeQuote.quote.total,'Facility staffing cannot change maintenance or renovation funding.');
 const oldBudget=E.planBudget(currentOwner,frozenPlan),newBudget=E.planBudget(currentOwner,currentPlan);
 for(const key of ['total','remaining','mandatoryObligations','capitalBudget'])assert.equal(newBudget[key],oldBudget[key],'Shared funding must remain unchanged: '+key);
 for(const [id,order]of Object.entries(instructionA.facilityLifecyclePolicy.offices)){
  const normalized=copy(order);normalized.staffQuarters=copy(sharedStaffing.offices[id].staffQuarters);
  assert.deepEqual(normalized,instructionB.facilityLifecyclePolicy.offices[id],'Maintenance, hub links and all non-staff office instructions remain identical.');
  order.staffQuarters=normalized.staffQuarters;
 }
 assert.deepEqual(instructionA,instructionB,'Existing research/projects/office/service/training/collection instructions remain identical.');
 const actual=[];
 for(let variant=0;variant<2;variant++){
  const engine=engines[variant],world=worlds[variant],selected=copy(plans[0]);
  if(variant)selected[spec.seat]=copy(plans[1][spec.seat]);
  for(const seat of [0,1])engine.submit(world,seat,selected[seat]);
  engine.validatePilot(world);engine.validateLedger(world);engine.migrateCampaign(copy(world));
  const owner=world.players[spec.seat],r=owner.operatingReport;
  actual.push({gross:gross(r),profit:r.profit,loans:owner.stats.loans,fundingLoss:r.fundingLoss,vendors:owner.departmentFunctions.report.vendorExpense});
 }
 assert.equal(actual[0].gross,0);assert.equal(actual[1].gross,spec.gross);assert.equal(actual[0].fundingLoss,actual[1].fundingLoss);assert.equal(actual[0].vendors,actual[1].vendors);
 comparisons.push({...spec,actual});
 console.log(JSON.stringify({actualComparison:comparisons.at(-1)}));
}
console.log(JSON.stringify({status:'PASS',comparisons:comparisons.length,planningMilliseconds:timing,elapsedSeconds:(performance.now()-started)/1000,limits:'Two recorded next-month comparisons and explicit boundary fixtures, not a long-run balance/performance gate.'}));
