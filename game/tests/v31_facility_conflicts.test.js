'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const source=require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const make=code=>{const c={console};vm.runInNewContext(code.replace('root.BWEngine={','root.BWEngine={withCorporateForecast,planFacilityNetwork,normalizeFacilityPlan,facilityInvestmentReview,'),c);return c.BWEngine;};
const E=make(source),bytes=fs.readFileSync(path.join(__dirname,'fixtures/v31-group7-regulatory91.json.gz'));
assert.equal(hash(bytes),'d692c2e7839336b5c35a46314ab9bcc1f7ece56f95198bb72bcf926bd86bbcbf');
const saved=JSON.parse(zlib.gunzipSync(bytes)).game;
E.validatePilot(saved);E.validateLedger(saved);assert.equal(saved.cycle,92);assert.equal(saved.financialGroupVersion,7);
// Capture the exact otherwise legal draft just before the failing investment
// review. No grants, campaign migration, or replacement random decisions.
const boundary='return [7,8].includes(g.financialGroupVersion)?planFacilityInvestment(g,index,plan):plan;';
assert(source.includes(boundary));const P=make(source.replace(boundary,'return plan;'));
const prior=copy(saved),plan=P.chooseBot(prior,0),p=prior.players[0];
assert(E.lifecycleInstructionQuote(prior,p,plan).status.eligible);
assert(plan.facilityLifecyclePolicy.renovate,'The reproduced draft contains a new renovation');
const renovating=p.facilityNetwork.offices.find(o=>o.id===plan.facilityLifecyclePolicy.renovate);
const other=p.facilityNetwork.offices.find(o=>o.id!==renovating.id&&o.market===renovating.market&&o.closedCycle===null);
assert(other,'Two actual offices share the affected market');
const guards=[
 '  const lifecycle=lifecycleInstructionQuote(g,p,draft);\n  if(!lifecycle.status.eligible)return {...reject(stage+\': \'+lifecycle.status.reason),quote};\n',
 ' const lifecycle=lifecycleInstructionQuote(g,future.owner,future.plan);\n if(!lifecycle.status.eligible)return {...reject(\'activation: \'+lifecycle.status.reason),quote};\n'
];
let unguarded=source;for(const guard of guards){assert(unguarded.includes(guard));unguarded=unguarded.replace(guard,'');}
const B=make(unguarded);
assert.throws(()=>B.chooseBot(copy(saved),0),/Another local project occupies/,'Reproduce the actual pre-repair planning failure');
const before=JSON.stringify(prior),draft=JSON.stringify(plan);
const quote=E.withCorporateForecast(prior,()=>E.facilityInvestmentReview(prior,0,plan,{officeId:other.id,model:'atm'}));
assert.equal(quote.eligible,false);assert.match(quote.reason,/construction: Another local project/);
assert.equal(JSON.stringify(prior),before);assert.equal(JSON.stringify(plan),draft,'Do not cancel the renovation to make the forecast pass');
// Existing paid renovation wins over a newly proposed local branch initiative.
const occupied=p.facilityNetwork.offices.find(o=>p.facilityLifecycle.records[o.id].renovation),input=copy(plan);
input.focus=occupied.market;input.newProjects=['branchService','remediation'];input.newProject='branchService';
// This bank hits the existing capital check before local-site validation. Keep
// that error precedence, rather than gifting capital to manufacture a quote.
assert.throws(()=>E.normalizeFacilityPlan(prior,p,copy(input)),/8% post-spending capital reserve/);
const reconciled=E.planFacilityNetwork(prior,0,copy(input),false);
assert.deepEqual(copy(reconciled.newProjects),['remediation']);assert.equal(reconciled.newProject,'remediation');
assert.deepEqual(copy(reconciled.facilityLifecyclePolicy),copy(input.facilityLifecyclePolicy));
assert.equal(JSON.stringify(prior),before);
// A private planner call under the legacy selector retains its historical result.
// This is NOT a saved-game upgrade or valid Group6 campaign declaration.
const legacy=E.planFacilityNetwork({...prior,financialGroupVersion:6},0,copy(input),false);
assert.deepEqual(copy(legacy.newProjects),['branchService','remediation']);
const g=copy(saved),twin=copy(saved),plans=g.players.map((_,i)=>E.chooseBot(g,i)),again=twin.players.map((_,i)=>E.chooseBot(twin,i));
assert.deepEqual(copy(plans),copy(again));assert.deepEqual(copy(g.rng),copy(twin.rng));
E.submit(g,0,plans[0]);const restored=E.migrateCampaign(copy(g));E.submit(g,1,plans[1]);E.submit(restored,1,copy(plans[1]));
E.validatePilot(g);E.validateLedger(g);assert.equal(g.cycle,93);
assert.deepEqual(copy(E.migrateCampaign(g)),copy(E.migrateCampaign(restored)));
console.log(JSON.stringify({suite:'v31-facility-conflicts',status:'PASS',engineSha256:hash(source),fixtureSha256:hash(bytes),scope:'Actual month92 simultaneous renovation/conversion conflict, pure forecast rejection, paid local-work priority, unchanged older planner selection, legal complete AI month and exact half-ready replay.'}));
