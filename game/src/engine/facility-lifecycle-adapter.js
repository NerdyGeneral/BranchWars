// Group5 lifecycle coordination. Preserve player identities: pricing traces and
// other monthly coordinators use owner-keyed maps across these transactions.
function facilityLifecycleCommit(g,next) {
  for(let i=0;i<g.players.length;i++)Object.assign(g.players[i],next.players[i]);
  g.facilityEconomy=next.facilityEconomy;
}
function facilityLifecycleStaff(p) {
  const productive=p.departmentOffice?departmentProductiveAllocation(p):p.allocation;
  const physical={service:householdSalesStaff(p,productive.service),business:departmentFunctionResidual(p,'business',commercialSalesStaff(p)),
    lending:creditSalesStaff(p,productive.lending),operations:departmentFunctionResidual(p,'operations',productive.operations),wealth:0};
  if(!p.serviceDesk)physical.business=Math.max(0,physical.business-(p.serviceContracts?.length||0));
  return Object.fromEntries(FacilityLifecycle.ROLES.map(role=>[role,Math.min(400,Math.max(0,Math.floor(physical[role]*4)))]));
}
function facilityLifecycleLiveContext(p,cycle) {
  return {cycle:cycle||p.facilityLifecycle.lastActivatedCycle,freeCash:Math.max(0,p.stats.cash),
    freeExecution:Math.max(0,executionCapacity(p)-(p._facilityExecutionUsed||0)),
    workRate:1+departmentFunctionResidual(p,'operations',departmentProductiveAllocation(p).operations)*.08+(p.doctrine==='efficiency'?.1:0),
    availableStaffQuarters:facilityLifecycleStaff(p),wealthLicensed:()=>false,
    nearby:(a,b)=>a===b||!!FACILITY_LIFECYCLE_NEIGHBORS[a]?.includes(b),modelTerms:facilityLifecycleModelTerms};
}
function initializeFacilityLifecycle(g) {
  if(![5,6,7].includes(g.financialGroupVersion))return;
  facilityLifecycleCommit(g,FacilitySettlement.initialize(g));
  for(const p of g.players){
    const proposal=FacilityLifecycle.allocateStaff(p,facilityLifecycleStaff(p));
    for(const [id,settings]of Object.entries(proposal.plan.offices))Object.assign(p.facilityLifecycle.records[id],settings);
  }
}
function facilityLifecycleRegisterOffice(p,id,cycle) {
  const next=FacilityLifecycle.register(p,id,cycle);p.facilityLifecycle=next.facilityLifecycle;
}
function facilityLifecycleCloseOffice(p,id) {
  const next=FacilityLifecycle.close(p,id);p.facilityLifecycle=next.facilityLifecycle;
}
function facilityLifecycleConvertedOffice(p,id) {
  if(!p.facilityLifecycle)return [];
  const office=FacilityNetwork.office(p,id),disconnected=[];
  if(!office||office.closedCycle!==null)throw Error('An activated conversion requires an operating office.');
  // This is an explicit model-change consequence, never save/import repair.
  // A new hub cannot remain another hub's recipient; an old hub that changed
  // roles cannot retain recipients. All unrelated support assignments survive.
  for(const [recipient,record]of Object.entries(p.facilityLifecycle.records)){
    if(record.hubId!==null&&((recipient===id&&office.model==='regionalHub')||
      (record.hubId===id&&office.model!=='regionalHub'))){record.hubId=null;disconnected.push(recipient);}
  }
  return disconnected;
}
function facilityLifecycleOperatingMetrics(p) {
  return FacilityLifecycle.metrics(p,facilityLifecycleLiveContext(p));
}
function facilityLifecycleRegionalMetrics(p,original) {
  if(!p.facilityLifecycle)return original;
  const measured=facilityLifecycleOperatingMetrics(p),rows=original.rows.map(row=>{
    const offices=measured.rows.filter(o=>o.market===row.key);
    return {...row,expense:offices.reduce((n,o)=>n+o.upkeep,0),
      depositCapacity:Math.round(offices.reduce((n,o)=>n+o.capacity.depositCapacity,0)),
      loanCapacity:Math.round(offices.reduce((n,o)=>n+o.capacity.loanCapacity,0))};
  });
  // Retain the existing central online capacity; local offices replace, rather
  // than add to, the old unstaffed local throughput.
  return {...original,rows,expense:rows.reduce((n,r)=>n+r.expense,0),
    depositCapacity:100000+rows.reduce((n,r)=>n+r.depositCapacity,0),
    loanCapacity:100000+rows.reduce((n,r)=>n+r.loanCapacity,0)};
}
function facilityLifecycleInfluenceRows(p) {
  return facilityLifecycleOperatingMetrics(p).rows.map(row=>{
    const office=FacilityNetwork.office(p,row.officeId),raw=facilityRawOfficeMetrics(p,office);
    return {...row,weight:raw.serviceCapacity?row.capacity.serviceCapacity/raw.serviceCapacity:0};
  });
}
function normalizeFacilityLifecyclePlan(g,p,plan) {
  if(!p.facilityLifecycle){if(plan.facilityLifecyclePolicy!==undefined)throw Error('Unversioned facility lifecycle instructions.');return;}
  const result=lifecycleInstructionQuote(g,p,plan);
  if(!result.status.eligible)throw Error(result.status.reason);
  plan.facilityLifecyclePolicy=result.policy;
}
function prepareFacilityLifecycle(g,plans,openingContexts=null) {
  if(![5,6,7].includes(g.financialGroupVersion))return [];
  return recordLedgerStage(g,'prepareFacilityLifecycle','facilities.lifecycle',()=>{
    const result=FacilitySettlement.prepare(g,plans,(world,p,plan)=>openingContexts?openingContexts[g.players.findIndex(x=>x.id===p.id)]:facilityLifecyclePlanningContext(world,p,plan).context);
    facilityLifecycleCommit(g,result.game);
    return result.events.map(e=>g.players.find(p=>p.id===e.owner).name+' '+e.type+' at '+e.officeId+'.'+(e.cost?' Paid $'+e.cost.toLocaleString()+'.':''));
  });
}
function advanceFacilityLifecycle(g) {
  if(![5,6,7].includes(g.financialGroupVersion))return [];
  return recordLedgerStage(g,'advanceFacilityLifecycle','facilities.renovation',()=>{
    const alreadyAdvanced=new Set(g.players.filter(p=>p.facilityLifecycle.lastAdvancedCycle===g.cycle).map(p=>p.id));
    const result=FacilitySettlement.advance(g,(_,p)=>facilityLifecycleLiveContext(p,g.cycle));
    facilityLifecycleCommit(g,result.game);
    for(const p of g.players)if(!alreadyAdvanced.has(p.id))
      p._facilityExecutionUsed=(p._facilityExecutionUsed||0)+(result.usedCapacity[p.id]||0);
    return result.events.map(e=>e.officeId+' '+e.type+(e.readyCycle?'; restored capacity activates next month.':'.'));
  });
}
function settleFacilityLifecycle(g,plans) {
  if(![5,6,7].includes(g.financialGroupVersion))return [];
  return recordLedgerStage(g,'settleFacilityLifecycle','facilities.maintenance',()=>{
    const result=FacilitySettlement.settle(g,(_,p)=>{
      const context=facilityLifecycleLiveContext(p,g.cycle),plan=plans[g.players.findIndex(x=>x.id===p.id)];
      // Paid construction/closure can change the roster after the opening plan.
      // New offices use their actual registered policy, not a stale plan ID set.
      const closingPlan={...plan,facilityLifecyclePolicy:defaultFacilityLifecyclePlan(p)};
      const maintenance=facilityLifecycleDraftCommitment(p,closingPlan).maintenance;
      const remaining=Math.max(0,workforceLateReserve(p,closingPlan)-maintenance);
      const reserve=Math.max(p.workforce.policy.reserve,p.departmentOffice.policy.reserve);
      return {...context,freeCash:Math.max(0,p.stats.cash-remaining-reserve)};
    });
    facilityLifecycleCommit(g,result.game);
    return result.reports.map((r,i)=>g.players[i].name+' paid $'+r.paid.toLocaleString()+
      ' in incremental facility maintenance.'+(r.unfunded?' $'+r.unfunded.toLocaleString()+' unfunded; condition deteriorated faster.':''));
  });
}
function activateFacilityLifecycle(g) {
  if(![5,6,7].includes(g.financialGroupVersion))return;
  recordLedgerStage(g,'activateFacilityLifecycle','facilities.renewal',()=>{
    const result=FacilitySettlement.activate(g);facilityLifecycleCommit(g,result.game);
    for(const e of result.events)addLog(g,e.officeId+' renovation activated; condition restored.','FACILITY');
  });
}
function validateFacilityLifecycleSave(g) {
  FacilitySettlement.validate(g);
  for(const p of g.players){
    if(p.facilityLifecycle)validateFacilityLifecycleBoundary(p,g.cycle,g.gameOver);
    if(p.submitted)normalizeFacilityLifecyclePlan(g,p,JSON.parse(JSON.stringify(p.submitted)));
  }
  if(![5,6,7].includes(g.financialGroupVersion)&&Object.values(g.lastPlans||{}).some(p=>p.facilityLifecyclePolicy!==undefined))
    throw Error('Unversioned saved lifecycle orders.');
}
function validateFacilityLifecycleBoundary(p,cycle,gameOver) {
  FacilityLifecycle.validate(p,cycle,true);
  const b=p.facilityLifecycle,month=cycle-(gameOver?0:1);
  if(b.lastPreparedCycle!==month||b.lastAdvancedCycle!==month||b.lastSettledCycle!==month||b.lastActivatedCycle!==cycle)
    throw Error('Facility lifecycle does not match the planning boundary.');
  for(const office of p.facilityNetwork.offices){
    const hub=p.facilityLifecycle.records[office.id].hubId;
    if(hub){const source=FacilityNetwork.office(p,hub);
      if(!source||!(source.market===office.market||FACILITY_LIFECYCLE_NEIGHBORS[source.market]?.includes(office.market)))
        throw Error('Unsupported saved facility hub link.');}
  }
}
function projectFacilityLifecycle(g,out,index) {
  if(![5,6,7].includes(g.financialGroupVersion))return;
  out.me.facilityLifecycle=JSON.parse(JSON.stringify(g.players[index].facilityLifecycle));
  delete out.rival.facilityLifecycle;
  if(out.lastPlans?.[out.rival.id])delete out.lastPlans[out.rival.id].facilityLifecyclePolicy;
}
function validateFacilityLifecycleView(v) {
  if(v.facilityEconomy!==undefined||v.rival?.facilityLifecycle!==undefined||v.lastPlans?.[v.rival?.id]?.facilityLifecyclePolicy!==undefined)
    throw Error('Private facility lifecycle data exposed.');
  if(![5,6,7].includes(v.financialGroupVersion)){
    if(v.me?.facilityLifecycle!==undefined||v.me?.submitted?.facilityLifecyclePolicy!==undefined||
      Object.values(v.lastPlans||{}).some(p=>p.facilityLifecyclePolicy!==undefined))throw Error('Unversioned facility lifecycle view.');
    return;
  }
  validateFacilityLifecycleBoundary(v.me,v.cycle,v.gameOver);
}
function planFacilityLifecycle(g,index,plan) {
  const p=g.players[index];if(!p.facilityLifecycle)return plan;
  plan.facilityLifecyclePolicy=defaultFacilityLifecyclePlan(p);
  const proposal=facilityLifecycleStaffProposal(g,p,plan);
  plan.facilityLifecyclePolicy=proposal.policy;
  // Maintenance is a discretionary cash purchase, not an unconditional payable.
  // Reconsider care after recovery: last month's emergency deferral is not a
  // permanent AI strategy. Human standing instructions are never rewritten.
  for(const row of Object.values(plan.facilityLifecyclePolicy.offices))row.maintenance='full';
  for(const mode of ['basic','off'])if(facilityLifecycleProtectedBudget(p,plan).remaining<0)
    for(const row of Object.values(plan.facilityLifecyclePolicy.offices))row.maintenance=mode;
  let best=null;
  for(const office of p.facilityNetwork.offices.filter(o=>o.closedCycle===null)){
    if(p.facilityLifecycle.records[office.id].conditionBp>=6500)continue;
    const candidate=JSON.parse(JSON.stringify(plan));candidate.facilityLifecyclePolicy.renovate=office.id;
    const quote=lifecycleInstructionQuote(g,p,candidate);
    if(quote.status.eligible&&(!best||p.facilityLifecycle.records[office.id].conditionBp<best.condition))
      best={plan:candidate,condition:p.facilityLifecycle.records[office.id].conditionBp};
  }
  return best?.plan||plan;
}
// Counterfactual operations are not plan authorization. Exploratory AI drafts
// can temporarily request more office staff than the new department allocation;
// the live metric scales their output to actual FTE, while submit stays strict.
function prepareFacilityLifecycleForecast(p,plan) {
  if(!p.facilityLifecycle)return p;
  const policy=plan.facilityLifecyclePolicy||defaultFacilityLifecyclePlan(p),context=facilityLifecycleLiveContext(p);
  const requested=Object.fromEntries(FacilityLifecycle.ROLES.map(role=>[role,
    Object.values(policy.offices||{}).reduce((n,row)=>n+(row.staffQuarters?.[role]||0),0)]));
  const normalizationPool=Object.fromEntries(FacilityLifecycle.ROLES.map(role=>[role,Math.max(context.availableStaffQuarters[role],requested[role])]));
  const result=FacilityLifecycle.prepare(p,policy,{...context,availableStaffQuarters:normalizationPool,
    payCash:(owner,amount,source)=>{
      owner.accounting=AccountingPrototype.post(owner.accounting,source,{cash:-amount,equity:-amount},-amount);syncAccounts(owner);
    }},true);
  return result.owner;
}
function finishFacilityLifecycleForecast(p,reserved=0) {
  if(!p.facilityLifecycle)return p;
  const context=facilityLifecycleLiveContext(p),advanced=FacilityLifecycle.advance(p,context).owner;
  const maintenance=facilityLifecycleDraftCommitment(p).maintenance,
    reserve=Math.max(p.workforce.policy.reserve,p.departmentOffice.policy.reserve);
  const settled=FacilityLifecycle.settle(advanced,{...context,freeCash:Math.max(0,advanced.stats.cash-reserve-Math.max(0,reserved-maintenance)),
    payCash:(owner,amount,source)=>{
      owner.accounting=AccountingPrototype.post(owner.accounting,source,{cash:-amount,equity:-amount},-amount);syncAccounts(owner);
    }});
  Object.assign(p,settled.owner);
  const paid=settled.report.paid;
  p.operatingReport.facilityMaintenance=paid;p.operatingReport.expense+=paid;p.operatingReport.profit-=paid;p.stats.lastProfit-=paid;
  if(p.marketReport){
    for(const row of settled.report.rows){const market=FacilityNetwork.office(p,row.officeId).market;
      p.marketReport.rows[market].facility+=row.paid;p.marketReport.rows[market].contribution-=row.paid;}
    p.marketReport.profit-=paid;
  }
  p.operatingReport.closingCash=p.stats.cash;p.operatingReport.closingEquity=p.stats.capital;
  return p;
}
