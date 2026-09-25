'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),{createHash}=require('node:crypto');
const html=require('../tools/build_game').assemble().html,source=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const hash=x=>createHash('sha256').update(x).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
vm.runInNewContext(source.replace('root.BWEngine={','root.BWEngine={facilityLifecycleOperatingMetrics,facilityLifecycleLiveContext,facilityLifecycleStaff,validateFacilityLifecycleView,FacilitySettlement,syncAccounts,prepareFacilityLifecycle,advanceFacilityLifecycle,planFinalCashReserve,withCorporateForecast,'),ctx);
const E=ctx.BWEngine,options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options;
const smokeMonths=Number(process.argv.find(a=>a.startsWith('--months='))?.split('=')[1]||24);
assert([24,120].includes(smokeMonths),'Supported fresh smoke horizons are 24 or 120 months.');
let checks=0,months=0,staffedCampaign=null;
function test(label,fn){if(process.argv.includes('--smoke-only')&&!label.startsWith('Fresh Group5')||process.argv.includes('--targeted-only')&&label.startsWith('Fresh Group5'))return;fn();checks++;console.log('PASS '+label);}
function fresh(seed='lifecycle-integration'){return E.createGame({...options,mode:'hotseat',seed,created:1});}
function valid(g){E.validatePilot(g);E.validateLedger(g);const before=JSON.stringify(g);
 for(const i of [0,1]){const view=E.publicState(g,i);E.validateFinancialGroupView(view);E.validateFacilityLifecycleView(view);
  assert(view.me.facilityLifecycle);assert.equal(view.rival.facilityLifecycle,undefined);assert.equal(view.facilityEconomy,undefined);
  assert.equal(view.lastPlans?.[view.rival.id]?.facilityLifecyclePolicy,undefined);}
 assert.equal(JSON.stringify(g),before,'Owner projection and view validation must be pure.');}
function simple(g,i,mode='full'){
 const p=g.players[i],q=E.chooseBot(g,i);Object.assign(q,{newProjects:[],newProject:null,investments:{},hires:0,competitiveAction:'none',opportunity:null,contractBid:null,contractExit:null,capitalAction:false});
 for(const key of Object.keys(q.specialistHires))q.specialistHires[key]=0;
 for(const key of Object.keys(q.workforcePolicy.training))q.workforcePolicy.training[key]=0;
 q.facilityPolicy=E.defaultFacilityPolicy(p);q.groupPolicy.bankDividend=0;q.groupPolicy.bankSupport=0;
 q.agencyPolicy=E.defaultAgencyPlan(p);q.advertisingPolicy.budget=0;q.relationshipOfferPolicy.share=0;q.onboardingPolicy.share=0;
 q.departmentPolicy=copy(p.departmentOffice.policy);q.leaderOrders=E.defaultDepartmentPlan(p).leaderOrders;
 q.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);
 for(const row of Object.values(q.facilityLifecyclePolicy.offices))row.maintenance=mode;
 q.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,q).policy;return q;
}
function restaff(g,i,q){q.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,g.players[i],q).policy;return q;}
function turn(g,plans=g.players.map((p,i)=>simple(g,i))){for(const i of [0,1])try{E.submit(g,i,plans[i]);}catch(error){
 console.error(JSON.stringify({engineHash:hash(source),cycle:g.cycle,seat:i,budget:E.planBudget(g.players[i],plans[i]),
  reserve:plans[i].departmentPolicy?.reserve,maintenance:Object.values(plans[i].facilityLifecyclePolicy.offices).map(r=>r.maintenance)}));throw error;
 }valid(g);months++;}
test('Explicit Group5 creation preserves finite books and private owner lifecycle',()=>{
 const g=fresh();valid(g);assert.equal(g.version,'9.4');assert.equal(g.financialGroupVersion,5);
 assert.equal(g.facilityEconomy.supplier.accounts.cash,0);assert(g.players.every(p=>p.facilityNetwork.version===2));
});
for(const [mode,rate,wear] of [['off',0,180],['basic',.06,70],['full',.12,20]])test(mode+' maintenance posts to its supplier exactly once during an ordinary simultaneous month',()=>{
 const g=fresh(),plans=g.players.map((p,i)=>simple(g,i,mode));
 const expected=g.players.map(p=>E.facilityLifecycleOperatingMetrics(p).rows.reduce((n,r)=>n+Math.round(r.upkeep*rate),0));
 turn(g,plans);assert.equal(g.facilityEconomy.maintenancePaid,expected[0]+expected[1]);
 assert.equal(g.facilityEconomy.supplier.accounts.cash,expected[0]+expected[1]);
 for(const [i,p]of g.players.entries()){
  assert.equal(p.facilityLifecycle.report.paid,expected[i]);assert.equal(p.operatingReport.facilityMaintenance,expected[i]);
  assert.equal(p.accounting.journal.filter(e=>e.source==='facility.maintenance').reduce((n,e)=>n-(e.changes.cash||0),0),expected[i]);
  assert.equal(p.marketReport.profit,p.operatingReport.profit);
  const record=Object.values(p.facilityLifecycle.records)[0];assert.equal(record.conditionBp,10000-wear);assert.equal(record.ageMonths,1);
 }
 const before=JSON.stringify(g);
 assert.throws(()=>E.FacilitySettlement.settle(g,(_,p)=>E.facilityLifecycleLiveContext(p,g.cycle)));
 assert.equal(JSON.stringify(g),before,'An unprepared next-month settlement cannot mutate or charge the campaign.');
});
test('Paid ATM construction registers a new ramping office through ordinary project completion',()=>{
 const g=fresh('lifecycle-construction'),plans=g.players.map((p,i)=>simple(g,i));
 const p=g.players[0],before=p.facilityNetwork.offices.length,price=E.facilityNewOfficeCost(p,p.focus,'atm');
 plans[0].newProjects=['branchAtm'];plans[0].newProject='branchAtm';restaff(g,0,plans[0]);
 const budget=E.planBudget(p,plans[0]);assert(budget.total>=price);assert(E.projectPlanStatus(p,plans[0]).eligible);
 turn(g,plans);for(let j=0;j<4&&p.facilityNetwork.offices.length===before;j++)turn(g);
 assert.equal(p.facilityNetwork.offices.length,before+1);const office=p.facilityNetwork.offices.at(-1);
 assert.equal(office.model,'atm');const record=p.facilityLifecycle.records[office.id];
 assert.equal(record.initialRampMonths,0);assert.equal(record.rampMonths,record.ageMonths);assert(record.rampMonths<4);
 assert.equal(Object.values(record.staffQuarters).reduce((n,v)=>n+v,0),0,'New offices do not create or auto-assign employees.');
 assert.equal(E.facilityLifecycleOperatingMetrics(p).rows.find(r=>r.officeId===office.id).capacity.depositCapacity,0);
 assert(p.buildSpend>=price);assert.equal(g.facilityEconomy.renovationPaid,0);
});
test('Pure forecasts include selected maintenance once without inventing recurring upkeep',()=>{
 const g=fresh('lifecycle-forecast'),q=simple(g,0,'off'),owner=E.publicState(g,0).me,before=JSON.stringify(owner);
 const off=E.operatingPreview(owner,q,g.economy),fullPlan=copy(q);
 for(const row of Object.values(fullPlan.facilityLifecyclePolicy.offices))row.maintenance='full';
 const quoted=E.lifecycleInstructionQuote(g,owner,fullPlan);assert(quoted.status.eligible,quoted.status.reason);
 const full=E.operatingPreview(owner,fullPlan,g.economy),expected=quoted.quote.maintenance;
 assert.equal(off.facilityMaintenance,0);assert.equal(full.facilityMaintenance,expected);
 assert.equal(full.expense-off.expense,expected);assert.equal(off.profit-full.profit,expected);
 assert.equal(JSON.stringify(owner),before);valid(g);
});
test('Two-work renovation charges once, disrupts work, then activates after simultaneous resolution and survives import',()=>{
 const g=fresh('lifecycle-renovation');turn(g,g.players.map((p,i)=>simple(g,i,'off')));
 const p=g.players[0],id=p.facilityNetwork.offices[0].id,plans=g.players.map((p,i)=>simple(g,i,'off'));
 plans[0].facilityLifecyclePolicy.renovate=id;plans[0].householdPolicy.retention=25;restaff(g,0,plans[0]);
 const q=E.lifecycleInstructionQuote(g,p,plans[0]);assert(q.status.eligible,q.status.reason);
 const beforeCapacity=q.quote.beforeMetrics.rows[0].capacity.depositCapacity,duringCapacity=q.quote.metrics.rows[0].capacity.depositCapacity;
 assert(beforeCapacity>0);assert.equal(duringCapacity,beforeCapacity*.5,'Renovation disruption applies exactly once.');
 assert(q.quote.afterMetrics.rows[0].capacity.depositCapacity>beforeCapacity,'Repair restores genuinely conditioned capacity.');
 assert.equal(q.quote.metrics.rows[0].upkeep,q.quote.beforeMetrics.rows[0].upkeep,'Disruption does not waive base upkeep.');
 const cost=Math.round(E.facilityNewOfficeCost(p,p.focus,p.facilityNetwork.offices[0].model)*.22),inverse=copy(g);
 E.submit(g,0,plans[0]);const resumed=E.migrateCampaign(copy(g));E.submit(g,1,plans[1]);
 E.submit(resumed,1,copy(plans[1]));E.submit(inverse,1,copy(plans[1]));E.submit(inverse,0,copy(plans[0]));months++;
 valid(g);valid(resumed);valid(inverse);
 assert.deepEqual(copy(E.migrateCampaign(g)),copy(E.migrateCampaign(resumed)));assert.deepEqual(copy(E.migrateCampaign(g)),copy(E.migrateCampaign(inverse)));
 assert.equal(g.facilityEconomy.renovationPaid,cost);assert(p.facilityLifecycle.records[id].renovation.work>0);
 assert(p.facilityLifecycle.records[id].renovation.work<2);assert(p.facilityLifecycle.records[id].conditionBp<10000);
 turn(g,g.players.map((p,i)=>simple(g,i,'off')));
 assert.equal(p.facilityLifecycle.records[id].renovation,null);assert.equal(p.facilityLifecycle.records[id].conditionBp,10000);
 assert.equal(p.facilityLifecycle.records[id].renovations,1);assert.equal(g.facilityEconomy.renovationPaid,cost);
});
test('Strict imports and owner projections reject malformed, omitted and leaked lifecycle state',()=>{
 const g=fresh();turn(g);
 for(const damage of [x=>delete x.players[0].facilityLifecycle,x=>x.facilityEconomy.maintenancePaid++,
  x=>Object.values(x.players[0].facilityLifecycle.records)[0].conditionBp=10001,
  x=>Object.values(x.players[0].facilityLifecycle.records)[0].staffQuarters.service=401,
  x=>x.players[0].facilityLifecycle.lastSettledCycle++,x=>x.financialGroupVersion=4]){
  const bad=copy(g);damage(bad);assert.throws(()=>E.migrateCampaign(bad));}
 for(const damage of [v=>v.rival.facilityLifecycle=copy(v.me.facilityLifecycle),v=>v.facilityEconomy=copy(g.facilityEconomy),
  v=>v.lastPlans[v.rival.id].facilityLifecyclePolicy=copy(v.lastPlans[v.me.id].facilityLifecyclePolicy)]){
  const v=E.publicState(g,0);damage(v);assert.throws(()=>E.validateFacilityLifecycleView(v));}
});
test('Coordinator replay cannot consume renovation execution twice or discard existing conversion work',()=>{
 const g=fresh('lifecycle-coordinator');turn(g,g.players.map((p,i)=>simple(g,i,'off')));
 const p=g.players[0],id=p.facilityNetwork.offices[0].id,plans=g.players.map((p,i)=>simple(g,i,'off'));
 plans[0].facilityLifecyclePolicy.renovate=id;E.prepareFacilityLifecycle(g,plans);
 // Explicit intra-month execution-boundary fixture, not another resolved month:
 // half a unit has already been consumed by other conversion work this month.
 p._facilityExecutionUsed=.5;E.advanceFacilityLifecycle(g);
 const once=JSON.stringify(p.facilityLifecycle),used=p._facilityExecutionUsed;
 assert.equal(used,1.5);assert(p.facilityLifecycle.records[id].renovation.work>0);
 E.advanceFacilityLifecycle(g);assert.equal(JSON.stringify(p.facilityLifecycle),once);
 assert.equal(p._facilityExecutionUsed,used);
});
test('Paid teaching removes one physical facility banker and does not multiply specialist headcount',()=>{
 const g=fresh('lifecycle-teacher'),p=g.players[0];
 // Explicit qualified-employment boundary fixture: these two specialists are
 // part of the existing eight employees, not newly created additional staff.
 p.workforce.departments.service.count=2;p.workforce.departments.service.skill=20;valid(g);
 const plans=g.players.map((p,i)=>simple(g,i)),q=plans[0];
 q.allocation={service:3,business:2,lending:2,operations:1};
 q.leaderOrders.service='mentor';q.workforcePolicy.training.service=20000;q.householdPolicy.retention=25;
 restaff(g,0,q);const owner=E.publicState(g,0).me,before=JSON.stringify(owner);
 const teaching=E.departmentBudgetQuote(owner,q),facility=E.lifecycleInstructionQuote(g,owner,q);
 assert(facility.status.eligible,facility.status.reason);assert(teaching.training.total>0);
 assert.equal(teaching.productiveAllocation.service,2);
 const idle=copy(q);idle.workforcePolicy.training.service=0;restaff(g,0,idle);
 const noClass=E.lifecycleInstructionQuote(g,owner,idle);
 assert.equal(noClass.availableStaffQuarters.service-facility.availableStaffQuarters.service,3,'One teacher leaves three fewer acquisition quarter-FTE after 25% household retention.');
 const requested=Object.values(q.facilityLifecyclePolicy.offices).reduce((n,r)=>n+r.staffQuarters.service,0);
 assert(requested<=facility.availableStaffQuarters.service);
 const overloaded=copy(q);overloaded.facilityLifecyclePolicy.offices[p.facilityNetwork.offices[0].id].staffQuarters.service=facility.availableStaffQuarters.service+1;
 assert.equal(E.lifecycleInstructionQuote(g,owner,overloaded).status.eligible,false);
 E.operatingPreview(owner,q,g.economy);assert.equal(JSON.stringify(owner),before);
 const oldSkill=p.workforce.departments.service.skill;turn(g,plans);
 assert.equal(p.stats.staff,8);assert(p.workforce.departments.service.skill>oldSkill);
 assert(p.departmentOffice.report.paid>0);
 assert.equal(p._departmentTraining,undefined);assert.equal(p._departmentTeaching,undefined);
 staffedCampaign=copy(g);
});
test('Zero-cash boundary fixture permits explicit deferred maintenance without gifts or optional spending',()=>{
 const g=fresh('lifecycle-cash-boundary'),plans=g.players.map((p,i)=>simple(g,i,'off'));
 // Explicit liquidity-allocation fixture, not an earned campaign: every dollar
 // removed from bank cash remains in its securities asset; liabilities unchanged.
 for(const p of g.players){const amount=p.stats.cash;p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.liquidityAllocation',{cash:-amount,securities:amount});E.syncAccounts(p);}
 valid(g);for(const [i,p]of g.players.entries()){
  const ai=E.chooseBot(g,i);assert(Object.values(ai.facilityLifecyclePolicy.offices).every(x=>x.maintenance==='off'));
  const deferred=E.lifecycleInstructionQuote(g,p,plans[i]);assert(deferred.status.eligible,deferred.status.reason+' '+JSON.stringify(E.planBudget(p,plans[i])));
  const spend=copy(plans[i]);for(const row of Object.values(spend.facilityLifecyclePolicy.offices))row.maintenance='full';
  assert.equal(E.lifecycleInstructionQuote(g,p,spend).status.eligible,false);
 }
 turn(g,plans);assert.equal(g.facilityEconomy.maintenancePaid,0);assert.equal(g.facilityEconomy.renovationPaid,0);
});
test('Deferred maintenance cannot block existing leadership payables when cash is exhausted',()=>{
 const g=copy(staffedCampaign),plans=g.players.map((p,i)=>simple(g,i,'off')),p=g.players[0];
 // Same explicit cash-to-securities boundary, now retaining an ordinarily paid
 // appointment and its existing recurring obligation; no leader is waived.
 const amount=p.stats.cash;p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.liquidityAllocation',{cash:-amount,securities:amount});E.syncAccounts(p);valid(g);
 const leader=p.departmentOffice.leaders.service.id,budget=E.planBudget(p,plans[0]);
 assert(budget.mandatoryObligations>0);assert.equal(budget.discretionaryCommitments,0);
 const quote=E.lifecycleInstructionQuote(g,p,plans[0]);assert(quote.status.eligible,quote.status.reason);
 turn(g,plans);assert.equal(p.departmentOffice.leaders.service.id,leader);assert(p.departmentOffice.report.arrears>0);
 assert.equal(p.facilityLifecycle.report.paid,0);
 assert(p.departmentOffice.report.paid<p.departmentOffice.report.expense,'Only actual intervening event cash can fund a partial salary.');
 assert.equal(p.departmentOffice.report.arrears,p.departmentOffice.report.expense-p.departmentOffice.report.paid);
 assert.equal(g.departmentEconomy.supplier.accounts.businessAssets,p.accounting.accounts.payables);
});
test('AI final cleanup respects the common reserve for construction and research, with strict human rejection',()=>{
 const g=fresh('lifecycle-common-reserve'),plans=g.players.map((p,i)=>simple(g,i,'off')),p=g.players[0],q=plans[0];
 // Explicit liquidity-allocation boundary, retaining all assets: a raw-affordable
 // ATM and research cannot spend cash committed to the player's common reserve.
 const move=p.stats.cash-600000;p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.liquidityAllocation',{cash:-move,securities:move});E.syncAccounts(p);valid(g);
 q.workforcePolicy.reserve=500000;q.departmentPolicy.reserve=400000;
 q.newProjects=['branchAtm'];q.newProject='branchAtm';q.investments={network:20000};restaff(g,0,q);
 const budget=E.planBudget(p,q);assert(budget.discretionaryRemaining>0);assert(budget.total>100000);
 assert.equal(E.lifecycleInstructionQuote(g,p,q).status.eligible,false);
 const untouched=JSON.stringify(q);assert.throws(()=>E.submit(g,0,q),/protected cash/);
 const repaired=E.withCorporateForecast(g,()=>E.planFinalCashReserve(g,0,q));assert.equal(JSON.stringify(q),untouched);
 const quote=E.lifecycleInstructionQuote(g,p,repaired);assert(quote.status.eligible,quote.status.reason);
 assert(E.planBudget(p,repaired).total<=100000);assert.equal(repaired.departmentPolicy.reserve,400000);assert.equal(repaired.workforcePolicy.reserve,500000);
 plans[0]=repaired;turn(g,plans);
});
test('AI reconsiders affordable maintenance after an ordinary deferred month without rewriting human standing orders',()=>{
 const g=fresh('lifecycle-maintenance-recovery');turn(g,g.players.map((p,i)=>simple(g,i,'off')));
 const p=g.players[0],before=JSON.stringify(p),q=E.chooseBot(g,0),quote=E.lifecycleInstructionQuote(g,p,q);
 assert(Object.values(p.facilityLifecycle.records).every(r=>r.maintenance==='off'));
 assert(quote.status.eligible,quote.status.reason);
 assert(Object.values(q.facilityLifecyclePolicy.offices).some(r=>r.maintenance!=='off'),'Recovered AI cash must reconsider preventive care.');
 assert.equal(JSON.stringify(p),before,'AI may advance its existing random stream but may not rewrite owner policies or books before submission.');
});
test('Different-market renovation and conversion share one opening budget without reserving paid work twice',()=>{
 const g=fresh('lifecycle-combined-orders'),opening=g.players.map((p,i)=>simple(g,i,'off')),p=g.players[0];
 opening[0].focus='northside';opening[0].newProjects=['branchAtm'];opening[0].newProject='branchAtm';restaff(g,0,opening[0]);
 turn(g,opening);
 const existing=p.facilityNetwork.offices.find(o=>o.market==='downtown'),atm=p.facilityNetwork.offices.find(o=>o.market==='northside'&&o.model==='atm');
 assert(existing&&atm,'Ordinary funded construction must create the second-market office first.');
 const plans=g.players.map((p,i)=>simple(g,i,'off')),q=plans[0];
 q.facilityPolicy={convert:{officeId:atm.id,model:'digital'},cancel:null};q.facilityLifecyclePolicy.renovate=existing.id;
 q.departmentPolicy.reserve=0;q.workforcePolicy.reserve=0;restaff(g,0,q);
 const quotedTotal=E.planBudget(p,q).total;
 // Explicit near-cash-limit boundary: retained securities receive every dollar
 // released from cash. Both independent-market orders remain fully funded.
 const move=p.stats.cash-(quotedTotal+1);assert(move>0);
 p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.liquidityAllocation',{cash:-move,securities:move});E.syncAccounts(p);valid(g);
 const conversion=E.facilityInstructionQuote(g,p,q),renovation=E.lifecycleInstructionQuote(g,p,q);
 assert(conversion.status.eligible,conversion.status.reason);assert(renovation.status.eligible,renovation.status.reason);
 assert.equal(E.planBudget(p,q).remaining,1);
 const before=JSON.stringify(p);E.operatingPreview(E.publicState(g,0).me,q,g.economy);assert.equal(JSON.stringify(p),before);
 const inverse=copy(g);E.submit(g,0,plans[0]);const resumed=E.migrateCampaign(copy(g));
 E.submit(g,1,plans[1]);E.submit(resumed,1,copy(plans[1]));
 E.submit(inverse,1,copy(plans[1]));E.submit(inverse,0,copy(plans[0]));months++;
 valid(g);valid(resumed);valid(inverse);
 assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(E.migrateCampaign(copy(resumed))),'Combined orders survive half-ready import without new charges.');
 assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(E.migrateCampaign(copy(inverse))),'Combined orders are independent of which seat submits first.');
 assert(p.facilityLifecycle.records[existing.id].renovation);
 assert(atm.conversion||p.facilityNetwork.offices.find(o=>o.id===atm.id).conversion);
 assert.equal(g.facilityEconomy.renovationPaid,renovation.quote.renovationCost);
});
const checkpointArg=process.argv.find(a=>a.startsWith('--checkpoint='));
if(checkpointArg)test('Optional exact captured reserve-failure repair diagnostic',()=>{
 const fs=require('node:fs'),file=checkpointArg.slice('--checkpoint='.length),bytes=fs.readFileSync(file),saved=JSON.parse(bytes);
 assert.equal(saved.game.financialGroupVersion,5);assert(saved.pending&&Number.isInteger(saved.submittingSeat));
 const g=copy(saved.game),seat=saved.submittingSeat,original=saved.pending[seat];
 assert.equal(E.lifecycleInstructionQuote(g,g.players[seat],original).status.eligible,false);
 const repaired=E.withCorporateForecast(g,()=>E.planFinalCashReserve(g,seat,original));assert(E.lifecycleInstructionQuote(g,g.players[seat],repaired).status.eligible);
 E.submit(g,seat,repaired);valid(g);months++;
 console.log(JSON.stringify({diagnostic:'captured intermediate AI orders repaired, not a fresh campaign',checkpointSha256:hash(bytes),loadedEngineHash:hash(source),cycle:g.cycle}));
});
test('Fresh Group5 AI campaign validates '+smokeMonths+' ordinary months without interventions',()=>{
 const g=fresh('lifecycle-smoke-24');for(let n=0;n<smokeMonths&&!g.gameOver;n++){
  turn(g,g.players.map((p,i)=>E.chooseBot(g,i)));
  if(smokeMonths>24&&(n+1)%24===0)console.log(JSON.stringify({progressMonths:n+1,engineHash:hash(source)}));
 }
 assert.equal(g.cycle,smokeMonths+1);assert.equal(g.facilityEconomy.month,smokeMonths);
 console.log(JSON.stringify({campaign:'lifecycle-smoke-24',cycle:g.cycle,cash:g.players.map(p=>p.stats.cash),
  offices:g.players.map(p=>p.facilityNetwork.offices.length),maintenancePaid:g.facilityEconomy.maintenancePaid}));
});
console.log(JSON.stringify({suite:'facility-lifecycle-integration',checks,months,engineHash:hash(source),
 note:'Actual assembled Group5 engine; liquidity fixture explicitly reclassifies existing assets. No long-run balance or physical multiplayer acceptance claim.'}));
