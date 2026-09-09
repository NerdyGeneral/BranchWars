'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const html=require('../tools/build_game').assemble().html,code=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={console};
vm.runInNewContext(code.replace('root.BWEngine={','root.BWEngine={planHiring,staffingActionAffordable,staffingProtectedDefense,'),context);
const E=context.BWEngine,bytes=fs.readFileSync(path.join(__dirname,'fixtures/v31-group7-staffing120.json.gz'));
assert.equal(hash(bytes),'63087e6e96a905c5bb0cfea5c699b174611dfed6d85b673a4e0781c93e208d23');
const capture=JSON.parse(zlib.gunzipSync(bytes)),g=capture.game;
assert.equal(capture.resolved,120);assert.equal(g.financialGroupVersion,7);E.validatePilot(g);
const p=g.players[1],original=JSON.stringify(g);
assert.equal(p.stats.staff,4);assert.equal(p.stats.morale,0);assert(p.stats.cash>9000000);
assert(E.planHiring(g,p,0)>=1);
assert.equal(E.staffingActionAffordable(g,1,'retentionDefense'),false,'A two-point morale package must not consume the funded replacement-hire budget');
assert.equal(E.staffingProtectedDefense(g,1,'takeoverDefense'),true);
assert.equal(E.staffingActionAffordable(g,1,'takeoverDefense'),true,'Emergency strategic protection is not stripped for staffing');
assert.equal(JSON.stringify(g),original);
const twin=copy(g),plans=g.players.map((p,i)=>E.chooseBot(g,i)),again=twin.players.map((p,i)=>E.chooseBot(twin,i));
assert.deepEqual(copy(plans),copy(again));assert.deepEqual(copy(g.rng),copy(twin.rng));
assert.equal(E.planHires(plans[1]),1,'Ordinary funded hire must survive the COMPLETE planning pipeline');
assert.equal(plans[1].competitiveAction,'none');
assert.equal(E.planHires(plans[0]),0,'Low-cash peer cannot use the wealthy bank\'s funds');
for(const [i,plan]of plans.entries()){
 const budget=E.planBudget(g.players[i],plan);
 assert(budget.remaining>=0);assert(budget.freeCapacity>=0);
 assert.equal(Object.values(plan.allocation).reduce((n,x)=>n+x,0),g.players[i].stats.staff,'No future staff used before recruitment');
}
const expectedStaff=p.stats.staff+1;
E.submit(g,0,plans[0]);const restored=E.migrateCampaign(copy(g));
E.submit(g,1,plans[1]);E.submit(restored,1,copy(plans[1]));
E.validatePilot(g);E.validateLedger(g);assert.deepEqual(copy(E.migrateCampaign(g)),copy(E.migrateCampaign(restored)));
assert.equal(g.players[1].stats.staff,expectedStaff,'Actual paid hire must arrive in normal month121 settlement');
assert(g.players[1].stats.emergencyDebt===0,'Recruitment must not borrow');
console.log(JSON.stringify({suite:'v31-staffing-priority',status:'PASS',engineSha256:hash(code),fixtureSha256:hash(bytes),
 scope:'Actual failing Group7 month120; funded hire retained through full AI and paid next-month settlement, low-cash refusal, emergency-defense protection, deterministic replay. Not long-campaign acceptance.'}));
