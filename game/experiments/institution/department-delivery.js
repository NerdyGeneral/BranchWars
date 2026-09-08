// QUARANTINED runtime capacity adapter. No campaign mutation, payment, hiring,
// reassignment, task reprioritization or implicit migration. Caller supplies the
// ACTUAL post-disruption physical pool after paid teaching, and vendor units
// confirmed by the paired provider settlement (a quote alone is not payment).
const DepartmentDelivery=(()=>{
  const ROLES=DepartmentFunctions.ROLES,IDS=DepartmentDispatch.IDS,FUNCTIONS=DepartmentFunctions.IDS;
  const copy=x=>JSON.parse(JSON.stringify(x)),sum=xs=>xs.reduce((a,b)=>a+b,0),near=(a,b)=>Math.abs(a-b)<1e-8;
  const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===keys.slice().sort().join('|');
  const whole=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
  const bounded=(n,max)=>Number.isFinite(n)&&n>=0&&n<=max;
  const roles=fn=>Object.fromEntries(ROLES.map(r=>[r,fn(r)]));
  function roleMap(o,integer=false){return exact(o,ROLES)&&ROLES.every(r=>integer?whole(o[r],400):bounded(o[r],400));}
  function validate(dispatch,a,actual){
    if(!exact(actual,['headcount','physicalQuarters','paidVendorQuarters'])||!whole(actual.headcount,100)||
      !roleMap(actual.physicalQuarters,true)||sum(Object.values(actual.physicalQuarters))>actual.headcount*4||
      !exact(actual.paidVendorQuarters,FUNCTIONS)||FUNCTIONS.some(id=>!whole(actual.paidVendorQuarters[id],16)))
      throw Error('Actual physical headcount/pool and paid vendor units are required.');
    if(!a||!whole(a.employedHeadcount,100)||!roleMap(a.assignedQuarters,true)||!roleMap(a.paidTeacherQuarters,true)||
      !roleMap(a.rawAfterTeachingQuarters,true)||!roleMap(a.facilityPools,true)||!roleMap(a.residualExactQuarters)||
      !roleMap(a.residualRoundingHold)||!roleMap(a.uncreditedQuantizationHold,true)||
      !exact(a.exactRetainedTasks,IDS)||!exact(a.exactRetainedQuarters,FUNCTIONS)||
      sum(Object.values(a.assignedQuarters))>a.employedHeadcount*4)throw Error('Exact planned physical attribution is required.');
    if(!exact(dispatch,['rows','idleByFunction','remainingPools','vendorExpense'])||!Array.isArray(dispatch.rows)||
      dispatch.rows.length!==IDS.length||new Set(dispatch.rows.map(r=>r.id)).size!==IDS.length||
      !exact(dispatch.idleByFunction,FUNCTIONS)||!roleMap(dispatch.remainingPools,true)||!whole(dispatch.vendorExpense))
      throw Error('A complete task dispatch is required.');
    const rows=Object.fromEntries(dispatch.rows.map(r=>[r.id,r]));
    for(const id of IDS){
      const row=rows[id],task=DepartmentDispatch.TASKS[id],raw=a.exactRetainedTasks[id];
      if(!exact(row,['id','department','workload','retained','additional','vendor','capacity','served','shortfall','idle'])||row.department!==task.department||
        !roleMap(row.retained)||!roleMap(row.additional)||!roleMap(raw)||!bounded(row.vendor,16)||
        !bounded(row.workload,DepartmentFunctions.RULES.maxWorkload)||
        ROLES.some(r=>!near(row.retained[r],raw[r])||!task.roles.includes(r)&&(row.retained[r]>0||row.additional[r]>0)))
        throw Error('Task dispatch has invalid identity, discipline or retained work.');
      const capacity=sum(Object.values(row.retained))+sum(Object.values(row.additional))+row.vendor;
      if(!near(row.capacity,capacity)||!near(row.served,Math.min(row.workload,capacity))||
        !near(row.shortfall,row.workload-row.served)||!near(row.idle,Math.max(0,capacity-row.workload)))
        throw Error('Task dispatch totals do not reconcile.');
    }
    const ordered=IDS.map(id=>rows[id]),plannedVendor={};
    for(const id of FUNCTIONS){
      const idle=dispatch.idleByFunction[id],retained=a.exactRetainedQuarters[id],tasks=ordered.filter(r=>r.department===id);
      if(!exact(idle,['staff','vendor'])||!roleMap(idle.staff)||!bounded(idle.vendor,16)||!roleMap(retained)||
        ROLES.some(role=>idle.staff[role]>0&&!DepartmentFunctions.FUNCTIONS[id].roles.includes(role)||
          !near(sum(tasks.map(r=>r.retained[role])),retained[role])))throw Error('Function dispatch attribution does not reconcile.');
      for(const role of ROLES)if(!near(sum(tasks.map(r=>r.additional[role]))+idle.staff[role],Math.round(sum(tasks.map(r=>r.additional[role]))+idle.staff[role])))
        throw Error('Additional work must reconcile to authorized whole-quarter orders.');
      plannedVendor[id]=sum(tasks.map(r=>r.vendor))+idle.vendor;
      if(!near(plannedVendor[id],Math.round(plannedVendor[id]))||plannedVendor[id]>16||actual.paidVendorQuarters[id]>plannedVendor[id]+1e-8)
        throw Error('Paid vendors exceed the authorized dispatch.');
      plannedVendor[id]=Math.round(plannedVendor[id]);
    }
    if(dispatch.vendorExpense!==sum(FUNCTIONS.map(id=>plannedVendor[id]*DepartmentFunctions.FUNCTIONS[id].vendorRate)))
      throw Error('Vendor dispatch expense does not reconcile.');
    for(const role of ROLES){
      const retained=sum(ordered.map(r=>r.retained[role])),additional=sum(ordered.map(r=>r.additional[role]))+
        sum(FUNCTIONS.map(id=>dispatch.idleByFunction[id].staff[role]));
      const quantizedRetained=sum(FUNCTIONS.map(id=>Math.floor(a.exactRetainedQuarters[id][role])));
      if(a.paidTeacherQuarters[role]>4||a.assignedQuarters[role]!==a.rawAfterTeachingQuarters[role]+a.paidTeacherQuarters[role]||
        !near(retained+a.residualExactQuarters[role],a.rawAfterTeachingQuarters[role])||
        a.facilityPools[role]!==Math.floor(a.residualExactQuarters[role])||
        !near(a.residualRoundingHold[role],a.residualExactQuarters[role]-a.facilityPools[role])||
        a.uncreditedQuantizationHold[role]!==a.rawAfterTeachingQuarters[role]-quantizedRetained-a.facilityPools[role]||
        !near(additional+dispatch.remainingPools[role],a.facilityPools[role])||
        !near(retained+additional+dispatch.remainingPools[role]+a.residualRoundingHold[role],a.rawAfterTeachingQuarters[role]))
        throw Error('Physical reservations, residual and rounding holds do not conserve.');
    }
    return {rows:ordered,plannedVendor};
  }
  function deliver(dispatch,attribution,actual){
    const checked=validate(dispatch,attribution,actual),planned=attribution.rawAfterTeachingQuarters;
    const ratio=roles(role=>planned[role]?Math.min(1,actual.physicalQuarters[role]/planned[role]):0);
    const scaled=row=>roles(role=>row[role]*ratio[role]);
    const vendorRatio=Object.fromEntries(FUNCTIONS.map(id=>[id,checked.plannedVendor[id]?actual.paidVendorQuarters[id]/checked.plannedVendor[id]:0]));
    const rows=checked.rows.map(row=>{
      const retained=scaled(row.retained),additional=scaled(row.additional),vendor=row.vendor*vendorRatio[row.department];
      const capacity=sum(Object.values(retained))+sum(Object.values(additional))+vendor,served=Math.min(row.workload,capacity);
      return {id:row.id,department:row.department,workload:row.workload,
        planned:copy(row),delivered:{retained,additional,vendor,capacity,served,shortfall:row.workload-served,idle:Math.max(0,capacity-row.workload)},
        lost:{physical:sum(ROLES.map(role=>row.retained[role]+row.additional[role]-retained[role]-additional[role])),
          vendor:row.vendor-vendor,served:Math.max(0,row.served-served)}};
    });
    const idleByFunction=Object.fromEntries(FUNCTIONS.map(id=>[id,{planned:copy(dispatch.idleByFunction[id]),
      delivered:{staff:scaled(dispatch.idleByFunction[id].staff),vendor:dispatch.idleByFunction[id].vendor*vendorRatio[id]}}]));
    const residualExact=scaled(dispatch.remainingPools),remainingPools=roles(role=>Math.floor(residualExact[role])),
      residualQuantizationHold=roles(role=>residualExact[role]-remainingPools[role]),plannedRoundingHold=copy(attribution.residualRoundingHold),
      deliveredRoundingHold=scaled(plannedRoundingHold),used=roles(role=>planned[role]*ratio[role]);
    for(const role of ROLES){
      const tasks=sum(rows.map(r=>r.delivered.retained[role]+r.delivered.additional[role])),idle=sum(FUNCTIONS.map(id=>idleByFunction[id].delivered.staff[role]));
      if(!near(tasks+idle+remainingPools[role]+residualQuantizationHold[role]+deliveredRoundingHold[role],used[role])||used[role]>actual.physicalQuarters[role]+1e-8)
        throw Error('Delivered physical capacity did not conserve.');
    }
    for(const id of FUNCTIONS)if(!near(sum(rows.filter(r=>r.department===id).map(r=>r.delivered.vendor))+idleByFunction[id].delivered.vendor,actual.paidVendorQuarters[id]))
      throw Error('Delivered vendor work did not conserve.');
    return {version:1,rows,idleByFunction,remainingPools,
      physical:{planned:copy(planned),available:copy(actual.physicalQuarters),ratio,delivered:used,
        shortfall:roles(role=>planned[role]-used[role]),unassigned:roles(role=>actual.physicalQuarters[role]-used[role]),
        residualExact,plannedRoundingHold,deliveredRoundingHold,residualQuantizationHold,
        // Kernel attribution floors retained function totals, but dispatch uses
        // their exact task fractions. Those fractions are ALREADY in rows, not
        // another physical hold to subtract a second time.
        retainedFractionsAlreadyDispatched:roles(role=>attribution.uncreditedQuantizationHold[role]-attribution.residualRoundingHold[role])},
      vendors:{planned:checked.plannedVendor,paid:copy(actual.paidVendorQuarters),plannedExpense:dispatch.vendorExpense,
        paidExpense:sum(FUNCTIONS.map(id=>actual.paidVendorQuarters[id]*DepartmentFunctions.FUNCTIONS[id].vendorRate))},
      notes:['Authorized task assignments are unchanged; delivery scales down within each affected physical role.',
        'Extra staff remain unassigned; paid vendor work is separate throughput, never headcount.',
        'No payment or saved-state mutation occurs here. Commit financial settlement and delivery under the coordinator transaction.']};
  }
  return Object.freeze({deliver});
})();
