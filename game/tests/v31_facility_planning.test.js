'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),crypto=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const html=require('../tools/build_game').assemble().html,code=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context={console};
vm.runInNewContext(code.replace('root.BWEngine={','root.BWEngine={withCorporateForecast,facilityContext,facilityAiConversionMetrics,facilityLifecyclePlanningContext,'),context);
const E=context.BWEngine,bytes=fs.readFileSync(path.join(__dirname,'fixtures/v31-group7-growth24.json.gz'));
assert.equal(hash(bytes),'a1e9ce1a09e8fa4717d46b5e18b829d5d5ec706cf59e915f0fd3036240c9c7e7');
const g=JSON.parse(zlib.gunzipSync(bytes)).game;E.validatePilot(g);
const p=g.players[1],plan=E.chooseBot(g,1);plan.facilityPolicy={convert:null,cancel:null};
const office=p.facilityNetwork.offices.find(o=>o.model==='atm'&&o.closedCycle===null);assert(office);
const saved=JSON.stringify(g),instructions=JSON.stringify(plan);
E.withCorporateForecast(g,()=>{
 const ctx=E.facilityContext(g,p,plan),ai=E.facilityAiConversionMetrics(g,p,plan),staged=E.facilityLifecyclePlanningContext(g,p,plan);
 const request={officeId:office.id,model:'commercial'},current=E.FacilityNetwork.quote(p,request,ctx),after=ai(p,{...office,model:'commercial'});
 assert.equal(current.after.loanCapacity,0,'Manual retained-staff quote is unchanged');
 assert(after.loanCapacity>0,'Actual spare lending staff can operate the destination');
 assert(staged.context.availableStaffQuarters.lending>=6);
 assert.deepEqual(copy(ai(p,office)),copy(current.before),'Current office uses its current staffed output');
 const proposed=E.FacilityNetwork.quote(p,request,{...ctx,officeMetrics:ai});
 assert.equal(proposed.eligible,current.eligible,'Staff estimate cannot bypass the actual conversion budget');
 assert.equal(proposed.reason,current.reason);assert.equal(proposed.cost,current.cost);
 assert.equal(proposed.after.loanCapacity,after.loanCapacity);
 assert.equal(E.FacilityNetwork.quote(p,{officeId:office.id,model:'wealth'},{...ctx,officeMetrics:ai}).eligible,false,'No phantom wealth license');
 const drained=copy(plan);drained.allocation={...plan.allocation,operations:plan.allocation.operations+plan.allocation.lending,lending:0};
 // This is an adverse quote input, not a forged save. Existing quotas may make
 // it ineligible; if the shared quote accepts it, it cannot create loan staff.
 let deprivedQuote,refusal;
 try{deprivedQuote=E.facilityAiConversionMetrics(g,p,drained)(p,{...office,model:'commercial'});}
 catch(error){refusal=error;}
 if(refusal)assert.match(refusal.message,/staff|quota|capacity|work|allocation/i);
 else assert.equal(deprivedQuote.loanCapacity,0);
 assert.deepEqual(copy(E.FacilityNetwork.quote(p,request,ctx)),copy(current),'AI proposal must not alter later manual quotes');
});
assert.equal(JSON.stringify(g),saved);assert.equal(JSON.stringify(plan),instructions);
console.log(JSON.stringify({suite:'v31-facility-planning',status:'PASS',engineSha256:hash(code),
 scope:'Actual ATM upgrade understating capacity, post-obligation physical staff, unchanged manual quotes, cash/licensing refusal and pure state. Payback/long-campaign viability still open.'}));
