'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const source=require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const make=code=>{const c={console};vm.runInNewContext(code.replace('root.BWEngine={','root.BWEngine={withCorporateForecast,facilityInvestmentDraft,facilityInvestmentReview,'),c);return c.BWEngine;};
const E=make(source),bytes=fs.readFileSync(path.join(__dirname,'fixtures/v31-group7-regulatory57.json.gz'));
assert.equal(hash(bytes),'c0a2546bcc723c4f0553e0fe867b2db08df97bf2564c0de77461453a18bf3431');
const saved=JSON.parse(zlib.gunzipSync(bytes)).game;E.validatePilot(saved);E.validateLedger(saved);
assert.equal(saved.cycle,58);assert.equal(saved.financialGroupVersion,7);
// Reproduce the old failure by removing ONLY the newly added validation guards.
const futureGuard=' const authorized=departmentFunctionsQuote(g,owner,future);\n if(!authorized.status.eligible)return {owner,plan:future,status:authorized.status};\n';
const from=source.indexOf(' const duringPlan={...plan,facilityPolicy:{convert:{...request},cancel:null}};'),to=source.indexOf('\n for(const report of [during,after])',from);
assert(from>0&&to>from&&source.includes(futureGuard));
let old=source.slice(0,from)+' const forecast=(owner,draft)=>operatingPreview({...owner,focus:draft.focus,marketSnapshot:g.marketEconomy},draft,g.economy),\n  before=forecast(p,plan),duringPlan={...plan,facilityPolicy:{convert:{...request},cancel:null}},during=forecast(p,duringPlan),future=facilityInvestmentFutureOwner(g,p,plan,quote),after=forecast(future.owner,future.plan);'+source.slice(to);
old=old.replace(futureGuard,'');const B=make(old);
assert.throws(()=>B.chooseBot(copy(saved),0),/Vendor orders exceed funded cash/,'Actual pre-repair planning failure must remain reproducible');
const g=copy(saved),twin=copy(saved),plans=g.players.map((p,i)=>E.chooseBot(g,i)),again=twin.players.map((p,i)=>E.chooseBot(twin,i));
assert.deepEqual(copy(plans),copy(again));assert.deepEqual(copy(g.rng),copy(twin.rng));
const before=JSON.stringify(g),draft=JSON.stringify(plans[0]);
const p=g.players[0],office=p.facilityNetwork.offices.find(o=>o.closedCycle===null),assessment=E.withCorporateForecast(g,()=>E.facilityInvestmentReview(g,0,plans[0],{officeId:office.id,model:'commercial'}));
assert.equal(assessment.eligible,false);assert.match(assessment.reason,/construction: Vendor orders exceed funded cash/);
assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(plans[0]),draft,'Rejected scenarios cannot cancel instructions');
for(const [i,plan]of plans.entries()){assert(E.departmentFunctionsQuote(g,g.players[i],plan).status.eligible);assert(E.planBudget(g.players[i],plan).remaining>=0);}
E.submit(g,0,plans[0]);const restored=E.migrateCampaign(copy(g));E.submit(g,1,plans[1]);E.submit(restored,1,copy(plans[1]));
E.validatePilot(g);E.validateLedger(g);assert.equal(g.cycle,59);
assert.deepEqual(copy(E.migrateCampaign(g)),copy(E.migrateCampaign(restored)));
console.log(JSON.stringify({suite:'v31-facility-cash',status:'PASS',engineSha256:hash(source),fixtureSha256:hash(bytes),scope:'Actual month58 crash reproduction, legal full AI plans, pure rejection of unaffordable conversion, normal funded settlement and exact half-ready replay. No balance acceptance inferred.'}));
