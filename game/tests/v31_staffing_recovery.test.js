'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const html=require('../tools/build_game').assemble().html,code=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
function load(source){const c={console};vm.runInNewContext(source.replace('root.BWEngine={','root.BWEngine={staffingRecoveryReview,staffingRecoveryMorale,withCorporateForecast,'),c);return c.BWEngine;}
const gate='if(g.financialGroupVersion===7)plan=staffingRecoveryReview(g,index,plan).plan;',
 facilityGate='return g.financialGroupVersion===7?planFacilityInvestment(g,index,plan):plan;';
assert(code.includes(gate)&&code.includes(facilityGate));
// Isolate the staffing hook BEFORE the subsequent capital-budgeting stage in
// both engines. The full production pipeline is covered by staffing_priority
// and facility_investment; settlement here still uses the actual engine rules.
const scoped=code.replace(facilityGate,'return plan;'),E=load(scoped),B=load(scoped.replace(gate,''));
const raw=fs.readFileSync(path.join(__dirname,'fixtures/v31-group7-growth24.json.gz'));
assert.equal(hash(raw),'a1e9ce1a09e8fa4717d46b5e18b829d5d5ec706cf59e915f0fd3036240c9c7e7');
const capture=JSON.parse(zlib.gunzipSync(raw)),original=capture.game;
assert.equal(capture.resolved,24);assert.equal(original.financialGroupVersion,7);E.validatePilot(original);
let accepted=0,rejected=0;
for(const i of [0,1]){
 const g=copy(original),b=copy(original),plan=B.chooseBot(b,i),saved=JSON.stringify(b),instructions=JSON.stringify(plan);
 const result=E.withCorporateForecast(b,()=>E.staffingRecoveryReview(b,i,plan));
 assert.equal(JSON.stringify(b),saved,'Proposal changed the actual saved campaign');
 assert.equal(JSON.stringify(plan),instructions,'Proposal mutated the supplied plan');
 const selected=E.chooseBot(g,i);assert.deepEqual(copy(selected),copy(result.plan),'AI must adopt exactly the tested proposal');
 assert.deepEqual(copy(g.rng),copy(b.rng),'Reassignment search must not consume RNG');
 assert.equal(Object.values(selected.allocation).reduce((n,x)=>n+x,0),g.players[i].stats.staff);
 if(!result.accepted){rejected++;continue;}accepted++;
 assert.equal(result.move.count,1);assert(result.afterMorale.change>result.beforeMorale.change);
 assert(result.afterGross>=result.beforeGross);assert(result.profit>=0);
 const before=E.departmentFunctionsQuote(b,b.players[i],plan),after=E.departmentFunctionsQuote(g,g.players[i],selected);
 for(const row of before.delivery.rows){const next=after.delivery.rows.find(t=>t.id===row.id);assert.equal(next.workload,row.workload);assert(next.delivered.served+1e-8>=row.delivered.served);}
 assert.deepEqual(copy(after.attribution.paidTeacherQuarters),copy(before.attribution.paidTeacherQuarters));
 assert(E.planBudget(g.players[i],selected).remaining>=0);assert(E.lifecycleInstructionQuote(g,g.players[i],selected).status.eligible);
 const satisfied=copy(g);satisfied.players[i].stats.morale=80;
 const unchanged=E.withCorporateForecast(satisfied,()=>E.staffingRecoveryReview(satisfied,i,selected));
 assert.equal(unchanged.accepted,false);assert.deepEqual(copy(unchanged.plan),copy(selected));
}
assert(accepted>=1,'Actual operating bank must benefit, not just synthetic inputs');assert(rejected>=1,'Actual constrained bank must retain protected obligations');
const resolved=copy(original),plans=resolved.players.map((p,i)=>E.chooseBot(resolved,i));
E.submit(resolved,0,plans[0]);const resumed=E.migrateCampaign(copy(resolved));E.submit(resolved,1,plans[1]);E.submit(resumed,1,copy(plans[1]));
E.validatePilot(resolved);E.validateLedger(resolved);assert.deepEqual(copy(E.migrateCampaign(resolved)),copy(E.migrateCampaign(resumed)));
console.log(JSON.stringify({suite:'v31-staffing-recovery',status:'PASS',accepted,rejected,fixtureSha256:hash(raw),engineSha256:hash(code),
 scope:'Actual Group7 staffing, preserved task coverage, funded forecasts, stable RNG, normal settlement and half-ready replay. Not long-run acceptance.'}));
