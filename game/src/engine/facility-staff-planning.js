// Group6 proposal only. Existing orders and money are unchanged.
// Group5 retains the original allocator and exact historical call path.
function facilityStaffAllocation(owner, policy, context) {
 const L=FacilityLifecycle,copy=x=>JSON.parse(JSON.stringify(x)),roles=L.ROLES,keys=['depositCapacity','loanCapacity','serviceCapacity','advisoryCapacity'];
 const original=L.allocateStaff(owner,context.availableStaffQuarters),next=copy(policy),measuredOwner=copy(owner),active=owner.facilityNetwork.offices.filter(o=>o.closedCycle===null),byId=new Map(active.map(o=>[o.id,o]));
 for(const office of active){
  const row=next.offices?.[office.id];if(!row||!Object.hasOwn(L.modes,row.maintenance))throw Error('Facility operating instructions required.');
  const hub=row.hubId===null?null:byId.get(row.hubId);
  if(row.hubId!==null&&(!hub||hub.model!=='regionalHub'||office.model==='regionalHub'||hub.id===office.id))throw Error('Invalid persistent hub link.');
  row.staffQuarters=copy(original.plan.offices[office.id].staffQuarters);
  Object.assign(measuredOwner.facilityLifecycle.records[office.id],row);
 }
 if(policy.cancel){const record=measuredOwner.facilityLifecycle.records[policy.cancel];if(!record)throw Error('Unknown cancelled office.');record.renovation=null;}
 if(policy.renovate){const office=byId.get(policy.renovate);if(!office)throw Error('Unknown renovation office.');
  const terms=context.modelTerms?context.modelTerms(owner,office,L.CATALOG[office.model]):L.CATALOG[office.model];
  measuredOwner.facilityLifecycle.records[office.id].renovation={cost:Math.round(terms.cost*L.RULES.renovationCostShare),work:0,startedCycle:context.cycle,readyCycle:null};}
 let metricCalls=0,localMetricCalls=0;const measure=()=>{metricCalls++;return L.metrics(measuredOwner,context);};
 const baseline=measure(),baselinePolicy=copy(next),remaining=copy(original.unused),released=[];
 const productive=row=>keys.some(key=>row.capacity[key]>0)||row.supportSent>0;
 function facilityStaffPrune(rows){let changed=false;for(const row of rows){const order=next.offices[row.officeId];if(productive(row)||!Object.values(order.staffQuarters).some(Boolean))continue;
   for(const role of roles){remaining[role]+=order.staffQuarters[role];order.staffQuarters[role]=0;}
   measuredOwner.facilityLifecycle.records[row.officeId].staffQuarters=copy(order.staffQuarters);if(!released.includes(row.officeId))released.push(row.officeId);changed=true;}return changed;}
 facilityStaffPrune(baseline.rows);
 // One-office evaluation uses the real metric kernel. Its terms/license
 // callback still receives the FULL owner: no invented price/capacity formula,
 // no fake wealth license, and no whole-bank clone/quote per alternative.
 function facilityStaffIntrinsic(office,staff){localMetricCalls++;
  const local={...measuredOwner,facilityNetwork:{...measuredOwner.facilityNetwork,offices:[office]},facilityLifecycle:{...measuredOwner.facilityLifecycle,records:{[office.id]:{...measuredOwner.facilityLifecycle.records[office.id],staffQuarters:staff}}}};
  const localContext={...context,modelTerms:context.modelTerms?(_p,o,def)=>context.modelTerms(measuredOwner,o,def):undefined,wealthLicensed:()=>context.wealthLicensed?.(measuredOwner,office)===true};
  return L.metrics(local,localContext).rows[0];
 }
 if(released.length)for(let pass=0;pass<2;pass++)for(const office of active){
  const current=next.offices[office.id].staffQuarters,wanted=L.CATALOG[office.model].staffQuarters,trial={...current};let added=false;
  for(const role of roles){const n=Math.min(remaining[role],Math.max(0,wanted[role]-current[role]));trial[role]+=n;added||=n>0;}if(!added)continue;
  const before=facilityStaffIntrinsic(office,current),after=facilityStaffIntrinsic(office,trial);
  let useful=keys.some(key=>after.capacity[key]>before.capacity[key]+1e-9);
  const hubId=next.offices[office.id].hubId;
  if(!useful&&hubId&&trial.operations>current.operations){const hub=byId.get(hubId);useful=!!hub&&facilityStaffIntrinsic(hub,next.offices[hubId].staffQuarters).supportAvailable>0&&context.nearby?.(hub.market,office.market)===true;}
  if(!useful)continue;
  for(const role of roles)remaining[role]-=trial[role]-current[role];next.offices[office.id].staffQuarters=trial;measuredOwner.facilityLifecycle.records[office.id].staffQuarters=copy(trial);
 }
 let measured=released.length?measure():baseline;if(facilityStaffPrune(measured.rows))measured=measure();
 // Hub redistribution can reduce a previously served office despite increasing
 // network utility. This repair does not make that strategic trade-off: retain
 // the original proposal in full if ANY actual output is lower.
 const loss=baseline.rows.some((row,i)=>keys.some(key=>measured.rows[i].capacity[key]+1e-9<row.capacity[key]));
 return loss?{policy:baselinePolicy,unused:original.unused,metrics:baseline,released:[],metricCalls,localMetricCalls,fallback:true}:
  {policy:next,unused:remaining,metrics:measured,released,metricCalls,localMetricCalls,fallback:false};
}
