'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const html=require('../tools/build_game').assemble().html,code=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={console};
vm.runInNewContext(code.replace('root.BWEngine={','root.BWEngine={planFundedOriginationWork,withCorporateForecast,departmentOriginationFloorAcceptance,'),context);
const E=context.BWEngine;
const raw=zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'fixtures/department-matrix192-second.json.gz')));
assert.equal(hash(raw),'f961e016e5713579b7cc0c7fe2535c85de6ef53ee01e9143ee20589c1c84f7cc');
const checkpoints=JSON.parse(raw).finalCheckpoints;let accepted=0,rejected=0;
for(const checkpoint of checkpoints)for(const seat of [0,1]){
 const g=copy(checkpoint.game),p=g.players[seat];E.validatePilot(g);
 const plan=E.chooseBot(g,seat),quote=E.departmentFunctionsQuote(g,p,plan);
 if(!quote.status.eligible||quote.remainingPools.lending>=2)continue;
 const saved=JSON.stringify(g),input=JSON.stringify(plan);
 // A direct read-only proposal on a preserved Group6 snapshot diagnoses the
 // helper; only the Group7 coordinator may choose it in production.
 const selected=E.withCorporateForecast(g,()=>E.planFundedOriginationWork(g,seat,plan,quote));
 assert.equal(JSON.stringify(g),saved);assert.equal(JSON.stringify(plan),input);
 if(JSON.stringify(selected)===input){rejected++;continue;}
 const decision=E.withCorporateForecast(g,()=>E.departmentOriginationFloorAcceptance(g,p,plan,selected));
 assert(decision.accepted,decision.reason);accepted++;
 const after=E.departmentFunctionsQuote(g,p,selected);
 assert(after.vendorExpense>quote.vendorExpense,'Real outsourcing must cost cash');
 assert(after.remainingPools.lending>quote.remainingPools.lending);
 for(const row of quote.delivery.rows){const next=after.delivery.rows.find(t=>t.id===row.id);assert(next.delivered.served+1e-8>=row.delivered.served);}
 assert(after.vendorExpense<=Math.min(50000,Math.floor(quote.context.freeCash*.05)));
 // No funded opportunity in an empty budget; the helper must not conjure one.
 const noRoom={...quote,context:{...quote.context,freeCash:0}};
 assert.deepEqual(copy(E.planFundedOriginationWork(g,seat,plan,noRoom)),copy(plan));
 const slots=copy(plan);for(const id of E.DepartmentFunctions.IDS)slots.departmentFunctionsPolicy.vendors[id]=E.DepartmentProvider.ENTITLEMENT;
 assert.deepEqual(copy(E.planFundedOriginationWork(g,seat,slots,quote)),copy(slots),'Exhausted finite suppliers cannot sell more slots');
}
assert(accepted>0,'At least one actual preserved campaign must reach funded origination replacement');
console.log(JSON.stringify({suite:'v31-funded-origination',status:'PASS',accepted,rejected,engineSha256:hash(code),
 scope:'Actual archived states, pure proposals, paid finite work, protected service and resource refusal. Not a 120/480-month balance claim.'}));
