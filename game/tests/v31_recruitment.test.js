'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const html=require('../tools/build_game').assemble().html,code=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={console};
vm.runInNewContext(code.replace('root.BWEngine={','root.BWEngine={planHiring,pilotSpendingLimit,'),context);
const E=context.BWEngine,bytes=fs.readFileSync(path.join(__dirname,'fixtures/v31-v3-balanced120.json.gz'));
assert.equal(hash(bytes),'5585ca2e29dd747d6721a06d51f3d57ddda78c5bcbf23b16d46e37d4ccb1ae5b');
const report=JSON.parse(zlib.gunzipSync(bytes)),g=report.game;
assert.equal(report.resolved,120);E.validatePilot(g);const saved=JSON.stringify(g);
for(const p of g.players){
 assert.equal(p.stats.staff,5);assert(p.stats.morale<45);assert(p.stats.lastProfit>72000);
 assert.equal(E.planHiring(g,p,0),0,'Published campaign retains its historical decision');
 // Read-only planning counterfactual, NOT a campaign upgrade. No changed
 // version is serialized or submitted; the owner remains the preserved bank.
 const rules={financialGroupVersion:7},n=E.planHiring(rules,p,0);
 assert(n>=1&&n<=2,'Funded mature bank can recruit despite low morale');
 assert(p.stats.cash-E.hireCost(p,n)>=600000+6*n*18000);
 assert(p.stats.lastProfit>=2*n*18000);
 assert(E.pilotSpendingLimit(p,.10,200000+6*n*18000)>=E.hireCost(p,n));
 assert.equal(E.planHiring(rules,p,p.stats.cash),0,'Existing commitments have priority');
 for(const [field,value]of [['lastProfit',0],['emergencyDebt',100000],['cash',100000],['capital',0],['staff',22]]){
  // Adverse planner inputs only, not asserted valid saved campaigns.
  const owner=copy(p);owner.stats[field]=value;
  assert.equal(E.planHiring(rules,owner,0),0,'Refuse unsafe/unnecessary hire: '+field);
 }
}
assert.equal(JSON.stringify(g),saved,'Recruiting proposals cannot change cash, staff, RNG or books');
const modern=E.createGame({...E.previewFeatureSelection({}, {field:'financialGroupVersion',value:7}).options,
 mode:'hotseat',seed:'v31-recruitment',created:1});
// The normal shared submit/settlement gate, including hiring limit and full
// cash reserves, remains authoritative for all new campaigns.
const plans=modern.players.map((p,i)=>E.chooseBot(modern,i));
for(let i=0;i<2;i++)assert.equal(Object.values(plans[i].allocation).reduce((a,b)=>a+b,0),modern.players[i].stats.staff,'Never allocate a future recruit');
E.submit(modern,0,plans[0]);E.submit(modern,1,plans[1]);E.validatePilot(modern);E.validateLedger(modern);
console.log(JSON.stringify({suite:'v31-recruitment',status:'PASS',engineSha256:hash(code),
 scope:'Preserved month120 recruitment trap, paid hiring/cash/capital/payroll refusal and one-month modern settlement. Not long-run staffing acceptance.'}));
