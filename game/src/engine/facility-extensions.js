// Extensions occupy an existing bank office; they are not new branches, legal
// entities or licenses. Version 1 installs one commercial suite per eligible
// host. Existing office time is divided between the two services, never copied.
const COMMERCIAL_SUITE=Object.freeze({name:'Commercial banking suite',cost:180000,work:2,execution:1,upkeep:6000,
  hosts:Object.freeze(['retail','digital','financialCenter','regionalHub']),
  staffQuarters:Object.freeze({service:0,business:4,lending:2,operations:1,wealth:0}),
  capacity:Object.freeze({depositCapacity:120000,loanCapacity:220000,serviceCapacity:.6,advisoryCapacity:0})});
function initializeFacilityExtensions(g,options){
  if(options.facilityExtensionsVersion!==1)return;
  if(g.commercialAccountsVersion!==1)throw Error('Office extensions require business operating accounts.');
  g.facilityExtensionsVersion=1;
  for(const p of g.players)p.facilityExtensions={version:1,prepared:0,advanced:0,offices:{}};
}
function facilityExtensionActive(p,id){
  const r=p.facilityExtensions?.offices[id];
  return !!(r&&r.readyCycle!==null&&r.readyCycle<=p.facilityLifecycle.lastActivatedCycle);
}
function facilityExtensionUpkeep(p,office){return facilityExtensionActive(p,office.id)?COMMERCIAL_SUITE.upkeep:0;}
function facilityExtensionBusyMarkets(p,plan={}){
  if(!p.facilityExtensions)return [];
  const ids=Object.entries(p.facilityExtensions.offices).filter(([id,r])=>r.readyCycle===null&&id!==plan.facilityExtensionPolicy?.cancel).map(([id])=>id);
  if(plan.facilityExtensionPolicy?.start)ids.push(plan.facilityExtensionPolicy.start);
  return ids.map(id=>FacilityNetwork.office(p,id)).filter(o=>o&&o.closedCycle===null).map(o=>o.market);
}
function facilityExtensionStaffReference(p,office){
  const base=FacilityLifecycle.CATALOG[office.model].staffQuarters;
  return Object.fromEntries(FacilityLifecycle.ROLES.map(role=>[role,base[role]+(facilityExtensionActive(p,office.id)?COMMERCIAL_SUITE.staffQuarters[role]:0)]));
}
function facilityExtensionStaffSplit(p,office,staff){
  if(!facilityExtensionActive(p,office.id))return {base:staff,suite:0};
  const required=facilityExtensionStaffReference(p,office),base=FacilityLifecycle.CATALOG[office.model].staffQuarters;
  return {base:Object.fromEntries(FacilityLifecycle.ROLES.map(role=>[role,required[role]?staff[role]*base[role]/required[role]:staff[role]])),
    suite:Math.min(1,...FacilityLifecycle.ROLES.filter(role=>COMMERCIAL_SUITE.staffQuarters[role]>0).map(role=>staff[role]/required[role]))};
}
function facilityExtensionCommitment(p,plan={}){
  if(!p.facilityExtensions)return {cost:0,capacity:0};
  const order=plan.facilityExtensionPolicy||{start:null,cancel:null};
  const live=Object.entries(p.facilityExtensions.offices).filter(([id,r])=>FacilityNetwork.office(p,id)?.closedCycle===null&&r.readyCycle===null&&id!==order.cancel);
  const paid=p.facilityExtensions.prepared===p.facilityLifecycle.lastActivatedCycle;
  return {cost:order.start&&!paid?COMMERCIAL_SUITE.cost:0,capacity:(live.length+(order.start&&!paid?1:0))*COMMERCIAL_SUITE.execution};
}
function normalizeFacilityExtensionPlan(g,p,plan){
  const raw=plan.facilityExtensionPolicy;
  if(!p.facilityExtensions){if(raw!==undefined)throw Error('Unversioned office extension instruction.');return;}
  const order=raw===undefined?{start:null,cancel:null}:raw;
  if(!order||Array.isArray(order)||Object.keys(order).sort().join()!=='cancel,start'||
    [order.start,order.cancel].some(id=>id!==null&&typeof id!=='string')||order.start&&order.cancel)
    throw Error('Choose one suite construction or cancellation instruction.');
  if(order.cancel){const r=p.facilityExtensions.offices[order.cancel];
    if(!r||r.readyCycle!==null||FacilityNetwork.office(p,order.cancel)?.closedCycle!==null)throw Error('Only unfinished suite construction can be cancelled.');}
  if(order.start){
    const o=FacilityNetwork.office(p,order.start);
    if(!o||o.closedCycle!==null||!COMMERCIAL_SUITE.hosts.includes(o.model))throw Error('Choose a retail, digital, financial-center or hub office with one available suite space.');
    if(p.facilityExtensions.offices[o.id])throw Error('This office already has a commercial suite or construction in progress.');
    if(o.conversion||p.facilityLifecycle.records[o.id].renovation)throw Error('Complete existing office work before adding a suite.');
    if(tierRank(p)>=2||p.capitalRestriction>0||plan.capitalAction)throw Error('Restore capital standing before adding a suite.');
    if(g&&(!g.territories?.[o.market]||!unlocked(g,g.territories[o.market])))throw Error('Choose an open market.');
    const local=key=>PROJECTS[key]&&(PROJECTS[key].kind==='branch'||PROJECTS[key].regionalOnly);
    const busy=[...p.projects.filter(x=>local(x.key)).map(x=>x.target),...planInitiatives(plan).filter(local).map(k=>projectPlanTarget(plan,k)||plan.focus||p.focus)];
    for(const [id,r]of Object.entries(p.facilityExtensions.offices))if(r.readyCycle===null&&FacilityNetwork.office(p,id)?.closedCycle===null)busy.push(FacilityNetwork.office(p,id).market);
    for(const id of [plan.facilityPolicy?.convert?.officeId,plan.facilityLifecyclePolicy?.renovate]){const other=FacilityNetwork.office(p,id);if(other)busy.push(other.market);}
    if(busy.includes(o.market))throw Error('Only one office construction job can occupy a market at once.');
    const budget=planBudget(p,plan,g);
    if(budget.freeCapacity<0)throw Error('Suite construction exceeds shared execution capacity.');
    if(facilityLifecycleProtectedBudget(p,plan,budget,g).remaining<0)throw Error('Suite construction exceeds protected cash or capital.');
  }
  // Conversion must not silently erase an installed service or its usable space.
  const conversion=plan.facilityPolicy?.convert;
  if(conversion&&p.facilityExtensions.offices[conversion.officeId]&&
    (p.facilityExtensions.offices[conversion.officeId].readyCycle===null||!COMMERCIAL_SUITE.hosts.includes(conversion.model)))
    throw Error('Complete suite construction and choose a conversion model with compatible commercial-suite space.');
  for(const [id,r]of Object.entries(p.facilityExtensions.offices)){
    if(r.readyCycle!==null||id===order.cancel||FacilityNetwork.office(p,id)?.closedCycle!==null)continue;
    const market=FacilityNetwork.office(p,id).market;
    if(FacilityNetwork.office(p,plan.facilityLifecyclePolicy?.renovate)?.market===market||FacilityNetwork.office(p,conversion?.officeId)?.market===market||planInitiatives(plan).some(k=>(PROJECTS[k]?.kind==='branch'||PROJECTS[k]?.regionalOnly)&&(projectPlanTarget(plan,k)||plan.focus||p.focus)===market))
      throw Error('Finish or cancel suite construction before other office work in this market.');
  }
  plan.facilityExtensionPolicy={...order};
}
function facilityExtensionQuote(g,p,plan,officeId){
  const candidate=JSON.parse(JSON.stringify(plan));candidate.facilityExtensionPolicy={start:officeId,cancel:null};
  try{normalizeFacilityExtensionPlan(g,p,candidate);return {eligible:true,reason:'',plan:candidate,...COMMERCIAL_SUITE};}
  catch(error){return {eligible:false,reason:error.message,...COMMERCIAL_SUITE};}
}
function prepareFacilityExtensions(g,plans){
  if(g.facilityExtensionsVersion!==1)return [];
  const lines=[];
  for(const [i,p]of g.players.entries()){
    const book=p.facilityExtensions;if(book.prepared===g.cycle)continue;
    if(book.prepared!==g.cycle-1||book.advanced!==g.cycle-1)throw Error('Suite preparation skipped a month.');
    const order=plans[i].facilityExtensionPolicy||{start:null,cancel:null};
    if(order.cancel){delete book.offices[order.cancel];lines.push(p.name+' cancelled commercial suite construction; paid fit-out expense is not refunded.');}
    if(order.start){
      if(book.offices[order.start]||p.stats.cash<COMMERCIAL_SUITE.cost)throw Error('Suite construction is already present or unfunded.');
      const cost=COMMERCIAL_SUITE.cost;
      p.accounting=AccountingPrototype.post(p.accounting,'facility.extension',{cash:-cost,equity:-cost},-cost);syncAccounts(p);
      g.facilityEconomy.supplier=GroupAccounting.post(g.facilityEconomy.supplier,'facility.extension',p.id,{cash:cost,equity:cost},cost);
      g.facilityEconomy.renovationPaid+=cost;p.buildSpend=(p.buildSpend||0)+cost;
      book.offices[order.start]={kind:'commercial',cost,startedCycle:g.cycle,work:0,readyCycle:null};
      lines.push(p.name+' started a commercial banking suite at '+FacilityNetwork.office(p,order.start).market+' for $'+cost.toLocaleString()+'.');
    }
    book.prepared=g.cycle;
  }
  return lines;
}
function advanceFacilityExtensions(g){
  if(g.facilityExtensionsVersion!==1)return [];
  const lines=[];
  for(const p of g.players){
    const b=p.facilityExtensions;if(b.advanced===g.cycle)continue;
    if(b.prepared!==g.cycle||b.advanced!==g.cycle-1)throw Error('Prepare suite construction before advancing.');
    for(const [id,r]of Object.entries(b.offices)){
      if(r.readyCycle!==null||FacilityNetwork.office(p,id).closedCycle!==null)continue;
      if(executionCapacity(p)-(p._facilityExecutionUsed||0)<COMMERCIAL_SUITE.execution){lines.push(p.name+' commercial suite construction is waiting for execution capacity.');continue;}
      p._facilityExecutionUsed=(p._facilityExecutionUsed||0)+COMMERCIAL_SUITE.execution;
      r.work=Math.min(COMMERCIAL_SUITE.work,r.work+facilityLifecycleLiveContext(p,g.cycle).workRate);
      if(r.work===COMMERCIAL_SUITE.work){r.readyCycle=g.cycle+1;lines.push(p.name+' completed a commercial suite. Staffing and monthly upkeep activate next month.');}
    }
    b.advanced=g.cycle;
  }
  return lines;
}
function validateFacilityExtensionOwner(p,cycle,ended){
  const b=p.facilityExtensions,month=cycle-(ended?0:1);
  if(!b||Object.keys(b).sort().join()!=='advanced,offices,prepared,version'||b.version!==1||b.prepared!==month||b.advanced!==month||!b.offices||Array.isArray(b.offices))throw Error('Invalid office extension boundary.');
  for(const [id,r]of Object.entries(b.offices)){
    const o=FacilityNetwork.office(p,id);
    if(!o||!COMMERCIAL_SUITE.hosts.includes(o.model)||!r||Object.keys(r).sort().join()!=='cost,kind,readyCycle,startedCycle,work'||r.kind!=='commercial'||r.cost!==COMMERCIAL_SUITE.cost||
      !Number.isSafeInteger(r.startedCycle)||r.startedCycle<1||r.startedCycle>month||!Number.isFinite(r.work)||r.work<0||r.work>COMMERCIAL_SUITE.work||
      (r.readyCycle===null?r.work===COMMERCIAL_SUITE.work:!Number.isSafeInteger(r.readyCycle)||r.readyCycle<=r.startedCycle||r.readyCycle>month+1||r.work!==COMMERCIAL_SUITE.work))throw Error('Invalid saved commercial suite.');
  }
}
function validateFacilityExtensions(g){
  for(const p of g.players){
    if(g.facilityExtensionsVersion===1){validateFacilityExtensionOwner(p,g.cycle,g.gameOver);if(p.submitted)normalizeFacilityExtensionPlan(g,p,JSON.parse(JSON.stringify(p.submitted)));}
    else if(p.facilityExtensions!==undefined||p.submitted?.facilityExtensionPolicy!==undefined||g.lastPlans?.[p.id]?.facilityExtensionPolicy!==undefined)throw Error('Unversioned office extension book.');
  }
}
function projectFacilityExtensions(g,out,index){
  if(g.facilityExtensionsVersion!==1)return;
  out.facilityExtensionsVersion=1;out.me.facilityExtensions=JSON.parse(JSON.stringify(g.players[index].facilityExtensions));
  delete out.rival.facilityExtensions;if(out.lastPlans?.[out.rival.id])delete out.lastPlans[out.rival.id].facilityExtensionPolicy;
}
function validateFacilityExtensionsView(v){
  if(v.rival?.facilityExtensions!==undefined||v.lastPlans?.[v.rival?.id]?.facilityExtensionPolicy!==undefined)throw Error('Private office extension data exposed.');
  if(v.facilityExtensionsVersion===1)validateFacilityExtensionOwner(v.me,v.cycle,v.gameOver);
  else if(v.me?.facilityExtensions!==undefined||v.me?.submitted?.facilityExtensionPolicy!==undefined||Object.values(v.lastPlans||{}).some(p=>p.facilityExtensionPolicy!==undefined))throw Error('Unversioned office extension view.');
}
function planFacilityExtensions(g,index,input){
  const p=g.players[index];if(!p.facilityExtensions)return input;
  const plan=JSON.parse(JSON.stringify(input));plan.facilityExtensionPolicy={start:null,cancel:null};
  // Account selection is the preceding planner's final reservation. Reassign
  // office time against THAT draft, not its earlier standing account policy.
  // This affects only the new extension rules; human forms are never rewritten.
  plan.facilityLifecyclePolicy=facilityLifecycleStaffProposal(g,p,plan).policy;
  // A profitable bank with an actual operating-account customer can choose a
  // commercial suite. No forced progression or automatic player construction.
  if(g.cycle%6!==0||p.stats.lastProfit<COMMERCIAL_SUITE.upkeep*2||commercialAccountBalance(p)<=0||
    Object.values(p.facilityExtensions.offices).some(r=>r.readyCycle===null))return plan;
  for(const o of p.facilityNetwork.offices.filter(o=>o.closedCycle===null&&!p.facilityExtensions.offices[o.id]&&COMMERCIAL_SUITE.hosts.includes(o.model))){
    if(p.facilityLifecycle.records[o.id].conditionBp<6500)continue;
    const quote=facilityExtensionQuote(g,p,plan,o.id);if(!quote.eligible)continue;
    const budget=planBudget(p,quote.plan,g),margin=facilityLifecycleProtectedBudget(p,quote.plan,budget,g).remaining;
    if(margin<12*COMMERCIAL_SUITE.upkeep)continue;
    const pool=lifecycleInstructionQuote(g,p,quote.plan).availableStaffQuarters;
    if(!pool||pool.business<4||pool.lending<2||pool.operations<1)continue;
    return quote.plan;
  }
  return plan;
}
