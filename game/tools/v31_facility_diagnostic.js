'use strict';
// Read-only comparison of retained-staff conversion quotes with the existing
// allocator on the same funded, post-servicing physical workforce.
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const copy=x=>JSON.parse(JSON.stringify(x));
const source=require('./build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const context={console};vm.runInNewContext(source.replace('root.BWEngine={','root.BWEngine={withCorporateForecast,facilityContext,facilityLifecyclePlanningContext,facilityStaffAllocation,facilityLifecycleConvertedOffice,'),context);
const E=context.BWEngine;
const input=process.argv[2]||'game/tests/fixtures/v31-group7-growth24.json.gz';
const capture=JSON.parse(zlib.gunzipSync(fs.readFileSync(input))),g=capture.game;
E.validatePilot(g);
for(const i of [0,1]){
 const plan=E.chooseBot(g,i),p=g.players[i];plan.facilityPolicy={convert:null,cancel:null};
 const before=JSON.stringify(g),instructions=JSON.stringify(plan);
 E.withCorporateForecast(g,()=>{
  const staged=E.facilityLifecyclePlanningContext(g,p,plan),ctx=E.facilityContext(g,p,plan),rows=[];
  for(const office of p.facilityNetwork.offices.filter(o=>o.closedCycle===null))for(const model of E.FacilityNetwork.models(p)){
   if(model===office.model)continue;
   const q=E.FacilityNetwork.quote(p,{officeId:office.id,model},ctx);
   const owner=copy(staged.owner),target=owner.facilityNetwork.offices.find(o=>o.id===office.id);
   target.model=model;target.conversion=null;
   E.facilityLifecycleConvertedOffice(owner,office.id);
   try{
    const policy=copy(plan.facilityLifecyclePolicy);
    for(const [id,row]of Object.entries(policy.offices))row.hubId=owner.facilityLifecycle.records[id].hubId;
    const proposal=E.facilityStaffAllocation(owner,policy,staged.context),row=proposal.metrics.rows.find(r=>r.officeId===office.id);
    rows.push({from:office.model,to:model,eligible:q.eligible,reason:q.reason,cost:q.cost,before:q.before,retained:q.after,
     reallocated:{expense:row.upkeep,...row.capacity},staff:proposal.policy.offices[office.id].staffQuarters,unused:proposal.unused});
   }catch(error){rows.push({from:office.model,to:model,error:error.message});}
  }
  console.log(JSON.stringify({input,cycle:g.cycle,bank:i,staff:p.stats.staff,allocation:plan.allocation,morale:p.stats.morale,
   profit:p.stats.lastProfit,available:staged.context.availableStaffQuarters,rows}));
 });
 assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(plan),instructions);
}
