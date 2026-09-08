// Group 4 integration. These adapters reuse the existing office prices,
// operating profiles and shared monthly plan rather than inventing a second economy.
function identifiedInstitution(g) { return [4,5,6].includes(g.financialGroupVersion); }
function validateFacilitySnapshot(p,cycle,gameOver,enabled) {
  FacilityNetwork.validate(p,cycle,enabled);
  if(p._facilityExecutionUsed!==undefined)throw Error('Unfinished facility execution cannot be restored.');
  if(!enabled)return;
  const month=gameOver?cycle:cycle-1,b=p.facilityNetwork;
  if(b.lastPreparedCycle!==month||b.lastAdvancedCycle!==month||b.lastActivatedCycle!==(cycle===1?0:cycle))
    throw Error('Facility settlement counters do not match the campaign.');
}
function validateFacilitySave(g) {
  const enabled=identifiedInstitution(g);
  for(const p of g.players){
    if(enabled&&p.facilityNetwork?.version!==([5,6].includes(g.financialGroupVersion)?2:1))throw Error('Facility catalog does not match campaign rules.');
    if(![5,6].includes(g.financialGroupVersion)&&(p.projects||[p.project].filter(Boolean)).some(x=>PROJECTS[x.key]?.institutionOnlyVersion===5))throw Error('Unversioned facility project.');
  }
  for(const p of g.players)validateFacilitySnapshot(p,g.cycle,g.gameOver,enabled);
  if(!enabled&&Object.values(g.lastPlans||{}).some(p=>p.facilityPolicy!==undefined))
    throw Error('Unversioned saved facility instructions.');
}
function validateFacilityView(view) {
  const enabled=identifiedInstitution(view);
  if(enabled&&view.me.facilityNetwork?.version!==([5,6].includes(view.financialGroupVersion)?2:1))throw Error('Facility view catalog does not match campaign rules.');
  FacilityNetwork.validateView(view,enabled);
  validateFacilitySnapshot(view.me,view.cycle,view.gameOver,enabled);
  if(!enabled&&Object.values(view.lastPlans||{}).some(p=>p.facilityPolicy!==undefined))
    throw Error('Unversioned facility view instructions.');
}
function initializeFacilityNetwork(g) {
  if(!identifiedInstitution(g))return;
  for(const p of g.players){p.accounting=AccountingPrototype.withPayables(p.accounting);syncAccounts(p);}
  FacilityNetwork.initialize(g,true);
}
function defaultFacilityPolicy() { return { convert: null, cancel: null }; }
const FACILITY_PROJECT_KEYS = Object.freeze({retail:'branch',commercial:'branchCommercial',digital:'branchDigital',atm:'branchAtm',wealth:'branchWealth',financialCenter:'branchFinancialCenter',regionalHub:'branchRegionalHub'});
function facilityNewOfficeCost(p, market, model) {
  const key=FACILITY_PROJECT_KEYS[model];
  if(!key||!REGIONAL_MARKETS[market])throw Error('Unknown facility model or market.');
  return projectCost({...p,focus:market},PROJECTS[key]);
}
function facilityRawOfficeMetrics(p,office) {
  const profile=REGIONAL_MARKETS[office.market],state=p.regionalOperations?.markets[office.market];
  if(!profile||!state||!FACILITY_PROJECT_KEYS[office.model])throw Error('Invalid facility operating profile.');
  const model=office.model;
  if(p.facilityNetwork?.version===2&&!FacilityNetwork.MODELS.includes(model)){
    const d=FacilityLifecycle.CATALOG[model];if(!d)throw Error('Unknown facility model.');
    return {expense:d.upkeep*profile.rent*(1-state.automation*.12)+state.service*2000,
      depositCapacity:d.capacity.depositCapacity*profile.deposits*(1+state.service*.15),
      loanCapacity:d.capacity.loanCapacity*profile.loans,serviceCapacity:d.capacity.serviceCapacity,advisoryCapacity:d.capacity.advisoryCapacity};
  }
  return {
    expense:(model==='digital'?12000:22000)*profile.rent*(1-state.automation*.12)+state.service*2000,
    depositCapacity:(model==='retail'?450000:model==='digital'?320000:230000)*profile.deposits*(1+state.service*.15),
    loanCapacity:(model==='commercial'?430000:model==='retail'?250000:150000)*profile.loans,
    // Existing passive local service contribution, not employee headcount.
    serviceCapacity:.55+strategyLevel(p,'network')*.05+(model==='retail'?.3:model==='digital'?.22:0)
  };
}
function facilityOfficeMetrics(p,office) {
  if(p.facilityLifecycle){const row=facilityLifecycleOperatingMetrics(p).rows.find(r=>r.officeId===office.id);if(!row)throw Error('Unknown operating office.');return {expense:row.upkeep,...row.capacity};}
  const metrics=facilityRawOfficeMetrics(p,office);
  if(office.conversion)for(const key of ['depositCapacity','loanCapacity','serviceCapacity'])metrics[key]*=FacilityNetwork.RULES.disruption;
  return metrics;
}
function facilityDraftSpend(p,plan) {
  const order=plan.facilityPolicy?.convert;
  if(!p.facilityNetwork||!order||!FACILITY_PROJECT_KEYS[order.model])return 0;
  const office=p.facilityNetwork.offices.find(o=>o.id===order.officeId&&o.closedCycle===null);
  return office?Math.round(facilityNewOfficeCost(p,office.market,order.model)*FacilityNetwork.RULES.costShare):0;
}
function facilityDraftCapacity(p,plan) {
  if(!p.facilityNetwork)return 0;
  const policy=plan.facilityPolicy;
  const cancelled=policy?.cancel&&p.facilityNetwork.offices.some(o=>o.id===policy.cancel&&o.conversion)?1:0;
  return (policy?.convert?1:0)-cancelled;
}
function facilityConversionMetrics(g,p,plan,budget) {
  // Stage the shared workforce/leadership reservations once, then measure each
  // hypothetical model on a private canonical office. Do not grant the staff
  // required by the destination: the player's retained instructions still own it.
  let staged;
  return (_owner,office)=>{
    staged=staged||facilityLifecyclePlanningContext(g,p,plan,budget);
    const owner=JSON.parse(JSON.stringify(staged.owner)),target=FacilityNetwork.office(owner,office.id);
    if(!target)throw Error('Unknown conversion office.');
    target.model=office.model;
    // The domain owns the one 50% conversion factor in its `during` row.
    // Department staging can already contain the proposed paid conversion.
    target.conversion=null;
    const policy=plan.facilityLifecyclePolicy||defaultFacilityLifecyclePlan(p);
    for(const [id,settings]of Object.entries(policy.offices)){
      if(!owner.facilityLifecycle.records[id])throw Error('Unknown facility operating instructions.');
      Object.assign(owner.facilityLifecycle.records[id],JSON.parse(JSON.stringify(settings)));
    }
    facilityLifecycleConvertedOffice(owner,office.id);
    const row=FacilityLifecycle.metrics(owner,staged.context).rows.find(r=>r.officeId===office.id);
    return {expense:row.upkeep,...row.capacity};
  };
}
function facilityContext(g,p,plan) {
  const budget=planBudget(p,plan),order=plan.facilityPolicy?.convert;
  const local=key=>PROJECTS[key]&&(PROJECTS[key].kind==='branch'||PROJECTS[key].regionalOnly);
  const occupiedMarkets=[...p.projects.filter(x=>local(x.key)).map(x=>x.target),
    ...planInitiatives(plan).filter(local).map(()=>plan.focus)];
  const target=order&&p.facilityNetwork?.offices.find(o=>o.id===order.officeId);
  let restriction='';
  if(target&&g.territories&&(!g.territories[target.market]||!unlocked(g,g.territories[target.market])))restriction='Choose an open market.';
  if(tierRank(p)>=2||p.capitalRestriction>0||plan.capitalAction)restriction='Restore capital standing before committing to a facility conversion.';
  return {cycle:g.cycle,newOfficeCost:facilityNewOfficeCost,
    officeMetrics:p.facilityLifecycle?facilityConversionMetrics(g,p,plan,budget):facilityRawOfficeMetrics,
    freeCash:budget.remaining+facilityDraftSpend(p,plan),
    freeExecution:budget.freeCapacity+(order?FacilityNetwork.RULES.capacity:0),
    occupiedMarkets:[...occupiedMarkets,...(p.facilityLifecycle?p.facilityNetwork.offices.filter(o=>p.facilityLifecycle.records[o.id].renovation&&o.id!==plan.facilityLifecyclePolicy?.cancel).map(o=>o.market):[])],restriction};
}
function facilityInstructionQuote(g,p,plan) {
  const context=facilityContext(g,p,plan);
  let attempted=null;
  try {
    attempted=plan.facilityPolicy?.convert?FacilityNetwork.quote(p,plan.facilityPolicy.convert,context):null;
    const policy=FacilityNetwork.policy(p,plan,context);
    const quote=policy?.convert?FacilityNetwork.quote(p,policy.convert,context):null;
    const projects=projectPlanStatus(p,plan);
    return {policy,status:{eligible:projects.eligible,reason:projects.reason},quote};
  } catch(error) { return {policy:null,status:{eligible:false,reason:error.message},quote:attempted}; }
}
function facilityProgressComparison(g,p,office,plan) {
  if(!office?.conversion)throw Error('Select an office with existing conversion work.');
  if(!p.facilityLifecycle)return {
    before:facilityOfficeMetrics(p,{...office,conversion:null}),
    during:facilityOfficeMetrics(p,office),
    after:facilityOfficeMetrics(p,{...office,model:office.conversion.model,conversion:null})
  };
  const metrics=facilityConversionMetrics(g,p,plan,planBudget(p,plan)),
    before=metrics(p,{...office,conversion:null}),
    after=metrics(p,{...office,model:office.conversion.model,conversion:null}),during={...before};
  for(const key of ['depositCapacity','loanCapacity','serviceCapacity','advisoryCapacity'])
    if(during[key]!==undefined)during[key]*=FacilityNetwork.RULES.disruption;
  return {before,during,after};
}
function normalizeFacilityPlan(g,p,plan) {
  if(!p.facilityNetwork){FacilityNetwork.policy(p,plan,{});return;}
  const result=facilityInstructionQuote(g,p,plan);
  if(!result.status.eligible)throw Error(result.status.reason);
  plan.facilityPolicy=result.policy;
}
function prepareFacilityInstructions(g,plans,openingContexts=null) {
  if(!identifiedInstitution(g))return [];
  if(openingContexts&&(![5,6].includes(g.financialGroupVersion)||openingContexts.length!==g.players.length))
    throw Error('Opening facility contexts do not match the campaign.');
  return recordLedgerStage(g,'prepareFacilityInstructions','facilities.instructions',()=>g.players.flatMap((p,i)=>{
    const context=openingContexts?{...openingContexts[i]}:facilityContext(g,p,plans[i]);
    context.payCost=(owner,amount)=>{
      // Explicit discretionary expense; never use delta/provideCash to borrow.
      owner.accounting=AccountingPrototype.post(owner.accounting,'facility.conversion',{cash:-amount,equity:-amount},-amount);
      syncAccounts(owner);owner.buildSpend+=amount;
    };
    return FacilityNetwork.prepare(p,plans[i],context).map(e=>e.type==='facility.conversion.cancelled'
      ?p.name+' cancelled an office conversion. Paid conversion costs are not refunded.'
      :p.name+' started converting '+g.territories[e.market].name+' office to '+e.to+' for $'+e.cost.toLocaleString()+'. Old capacity is halved during work; upkeep continues.');
  }));
}
function advanceInstitutionProjects(g) {
  if(!identifiedInstitution(g))return advanceProjects(g);
  const lines=[];
  try {
    recordLedgerStage(g,'advanceFacilityInstructions','facilities.progress',()=>{
      for(const p of g.players){
        const result=FacilityNetwork.advance(p,{cycle:g.cycle,freeExecution:executionCapacity(p),
          workRate:1+departmentFunctionResidual(p,'operations',p.departmentOffice?departmentProductiveAllocation(p).operations:p.allocation.operations)*.08+(p.doctrine==='efficiency'?.1:0)});
        p._facilityExecutionUsed=result.usedCapacity;
        for(const e of result.events)lines.push(p.name+' office '+e.officeId.split(':').at(-1)+
          (e.type==='facility.conversion.stalled'?' conversion stalled: insufficient staffed execution capacity.':
            e.readyCycle?' conversion work finished; the new office model activates next month.':
              ' conversion reached '+Math.round(e.work/FacilityNetwork.RULES.work*100)+'%.'));
      }
    });
    lines.push(...advanceFacilityLifecycle(g));
    lines.push(...advanceProjects(g));
  } finally { for(const p of g.players)delete p._facilityExecutionUsed; }
  return lines;
}
function activateFacilityInstructions(g) {
  if(!identifiedInstitution(g))return;
  recordLedgerStage(g,'activateFacilityInstructions','facilities.activation',()=>{
    for(const p of g.players)for(const e of FacilityNetwork.activate(p,g.cycle)){
      const disconnected=facilityLifecycleConvertedOffice(p,e.officeId);
      addLog(g,p.name+' activated the '+e.to+' office in '+g.territories[e.market].name+'.'+
        (disconnected.length?' '+disconnected.length+' hub support assignment(s) ended because an office changed roles.':''),'FACILITY');
    }
  });
}
function effectiveFacilityTotals(p) {
  if(p.facilityLifecycle){const out=Object.fromEntries(FacilityNetwork.models(p).map(m=>[m,0]));for(const row of facilityLifecycleInfluenceRows(p))out[row.model]+=row.weight;return out;}
  if(!p.facilityNetwork)return p.facilities;
  const counts=Object.fromEntries(FacilityNetwork.MODELS.map(m=>[m,0]));
  for(const market of Object.keys(p.branches))for(const [model,n]of Object.entries(FacilityNetwork.effectiveCounts(p,market)))counts[model]+=n;
  return counts;
}
// Planning-only clone. Settlement remains in prepareFacilityInstructions; a
// forecast must neither charge the live bank nor promise undisrupted capacity.
function facilityProspectiveOwner(p,plan) {
  if(!p.facilityNetwork)return p;
  const q=JSON.parse(JSON.stringify(p)),policy=plan.facilityPolicy;
  if(policy?.cancel){const office=FacilityNetwork.office(q,policy.cancel);if(office?.conversion)office.conversion=null;}
  if(policy?.convert){
    const office=FacilityNetwork.office(q,policy.convert.officeId),cost=facilityDraftSpend(q,plan);
    if(office&&office.closedCycle===null&&!office.conversion&&office.model!==policy.convert.model&&
        FACILITY_PROJECT_KEYS[policy.convert.model]&&cost<=q.stats.cash){
      q.accounting=AccountingPrototype.post(q.accounting,'facility.conversion',{cash:-cost,equity:-cost},-cost);
      syncAccounts(q);
      office.conversion={model:policy.convert.model,cost,work:0,startedCycle:q.facilityNetwork.lastPreparedCycle+1,readyCycle:null};
    }
  }
  return q;
}
function effectiveFacilityBranches(p,market) {
  if(p.facilityLifecycle)return facilityLifecycleInfluenceRows(p).filter(r=>!market||r.market===market).reduce((n,r)=>n+r.weight,0);
  if(!p.facilityNetwork)return market?p.branches[market]||0:branchLevels(p);
  return p.facilityNetwork.offices.filter(o=>o.closedCycle===null&&(!market||o.market===market))
    .reduce((n,o)=>n+(o.conversion?FacilityNetwork.RULES.disruption:1),0);
}
function planFacilityNetwork(g,index,plan) {
  const p=g.players[index];if(!p.facilityNetwork)return plan;
  plan.facilityPolicy=defaultFacilityPolicy();
  // Older initiative planners see branch projects but not identified-office
  // conversion work. Reconcile their AI-only proposals before selecting another
  // facility instruction. Existing work wins; retain the first compatible local
  // proposal and every unrelated initiative. Human submission stays strict.
  const local=key=>PROJECTS[key]&&(PROJECTS[key].kind==='branch'||PROJECTS[key].regionalOnly);
  let occupied=p.projects.some(project=>project.target===plan.focus&&local(project.key))||
    FacilityNetwork.pending(p).some(office=>office.market===plan.focus);
  plan.newProjects=planInitiatives(plan).filter(key=>{
    if(!local(key))return true;
    if(occupied)return false;
    occupied=true;return true;
  });
  plan.newProject=plan.newProjects[0]||null;
  if(p.stats.lastProfit<=0)return plan;
  const context=facilityContext(g,p,plan),review=aiCashPlanningReview(g,index,plan);
  context.freeCash=Math.min(context.freeCash,Math.max(0,review.limit-planBudget(p,plan).total));
  context.score=q=>{
    // Payback from actual current deposit/loan production constraints, not a free
    // model preference. Expanded role/catalog strategies can extend this later.
    const r=p.operatingReport||{},metrics=regionalBranchMetrics(p);
    const depositTight=(r.depositGrowth||0)>=metrics.depositCapacity*.85;
    // Group5 loanGrowth is net of repayment/recovery and losses. A shrinking
    // mature portfolio can still exhaust its origination channel this month.
    const loanProduction=(r.loanGrowth||0)+(p.facilityLifecycle?
      (r.principalRepaid||0)+(r.chargeoff||0)+(r.creditRecovery||0):0);
    const lendingTight=loanProduction>=metrics.loanCapacity*.85;
    const value=(depositTight?Math.max(0,q.after.depositCapacity-q.before.depositCapacity)*.002:0)+
      (lendingTight?Math.max(0,q.after.loanCapacity-q.before.loanCapacity)*.003:0)+q.before.expense-q.after.expense;
    const lost=Math.max(0,q.before.depositCapacity-q.after.depositCapacity)*.001+
      Math.max(0,q.before.loanCapacity-q.after.loanCapacity)*.001;
    return (value-lost)*24-q.cost;
  };
  plan.facilityPolicy=FacilityNetwork.choose(p,context);
  return plan;
}
