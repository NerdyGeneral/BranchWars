// Candidate task dispatch for the same DepartmentFunctions policy/context.
// Existing exact reservations keep their original task. Additional staff are
// removed by the kernel from residual office time, then dispatched only once.
// Vendors are purchased throughput, never another physical employee pool.
const DepartmentDispatch=(()=>{
  const descriptor=(department,roles)=>Object.freeze({department,roles:Object.freeze(roles)});
  const TASKS=Object.freeze({
    offerSales:descriptor('relationships',['service']),commercialRelationships:descriptor('relationships',['business']),
    householdSupport:descriptor('onboarding',['service']),applicationProcessing:descriptor('onboarding',['service']),commercialDelivery:descriptor('onboarding',['business']),
    creditAdministration:descriptor('credit',['lending','operations']),collections:descriptor('collections',['lending','service']),
    technology:descriptor('technology',['operations']),risk:descriptor('risk',['operations','lending']),treasury:descriptor('treasury',['operations','business']),people:descriptor('people',['operations'])
  });
  const IDS=Object.freeze(Object.keys(TASKS)),roles=()=>Object.fromEntries(DepartmentFunctions.ROLES.map(r=>[r,0]));
  const finite=n=>Number.isFinite(n)&&n>=0,near=(a,b)=>Math.abs(a-b)<1e-8;
  function dispatch(result,attribution,workloads){
    if(!result?.enabled||!result.eligible)throw Error('Eligible function quote required for task dispatch.');
    if(!workloads||Object.keys(workloads).sort().join('|')!==IDS.slice().sort().join('|')||IDS.some(id=>!finite(workloads[id])))throw Error('Actual task workloads required.');
    const retained=attribution?.exactRetainedTasks;
    if(!retained||Object.keys(retained).sort().join('|')!==IDS.slice().sort().join('|'))throw Error('Exact retained task attribution required.');
    const rows=IDS.map(id=>{
      const task=TASKS[id],raw=retained[id];
      if(!raw||Object.keys(raw).sort().join('|')!==DepartmentFunctions.ROLES.slice().sort().join('|')||
        DepartmentFunctions.ROLES.some(r=>!finite(raw[r])||raw[r]>0&&!task.roles.includes(r)))throw Error('Invalid retained task discipline.');
      return {id,department:task.department,workload:workloads[id],retained:{...raw},additional:roles(),vendor:0};
    });
    for(const id of DepartmentFunctions.IDS){
      const tasks=rows.filter(r=>r.department===id);
      if(Math.ceil(tasks.reduce((n,r)=>n+r.workload,0))!==result.basis.workloads[id])throw Error('Task work does not reconcile to its function.');
      for(const role of DepartmentFunctions.ROLES)if(!near(tasks.reduce((n,r)=>n+r.retained[role],0),attribution.exactRetainedQuarters[id][role]))throw Error('Retained work was duplicated or lost across tasks.');
    }
    const total=row=>Object.values(row.retained).reduce((a,b)=>a+b,0)+Object.values(row.additional).reduce((a,b)=>a+b,0)+row.vendor;
    const idleByFunction=Object.fromEntries(DepartmentFunctions.IDS.map(id=>[id,{staff:roles(),vendor:0}]));
    // Work shares may be fractional even though orders are quarter-FTE units.
    // Deficit-first allocation uses exact remaining work and a stable task-ID
    // tie, never crediting one purchased unit to several consumers in full.
    function distribute(id,amount,role){
      const eligible=rows.filter(row=>row.department===id&&(role===null||TASKS[row.id].roles.includes(role)))
        .sort((a,b)=>(b.workload-total(b))-(a.workload-total(a))||(a.id<b.id?-1:a.id>b.id?1:0));
      let remaining=amount;
      for(const row of eligible){const used=Math.min(remaining,Math.max(0,row.workload-total(row)));if(role===null)row.vendor+=used;else row.additional[role]+=used;remaining-=used;}
      if(role===null)idleByFunction[id].vendor=remaining;else idleByFunction[id].staff[role]=remaining;
    }
    for(const id of DepartmentFunctions.IDS){
      for(const role of DepartmentFunctions.ROLES)distribute(id,result.policy.quotas[id][role],role);
      distribute(id,result.policy.vendors[id],null);
    }
    for(const row of rows){row.capacity=total(row);row.served=Math.min(row.workload,row.capacity);row.shortfall=row.workload-row.served;row.idle=Math.max(0,row.capacity-row.workload);}
    for(const id of DepartmentFunctions.IDS){
      const tasks=rows.filter(r=>r.department===id);
      for(const role of DepartmentFunctions.ROLES)if(!near(tasks.reduce((n,r)=>n+r.additional[role],0)+idleByFunction[id].staff[role],result.policy.quotas[id][role]))throw Error('Additional task staffing did not conserve.');
      if(!near(tasks.reduce((n,r)=>n+r.vendor,0)+idleByFunction[id].vendor,result.policy.vendors[id]))throw Error('Vendor task dispatch did not conserve.');
    }
    return {rows,idleByFunction,remainingPools:{...result.remainingPools},vendorExpense:result.vendorExpense};
  }
  return Object.freeze({TASKS,IDS,dispatch});
})();
