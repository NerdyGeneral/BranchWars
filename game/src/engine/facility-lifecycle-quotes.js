// Group5 owner-only facility quotation adapter;
// shared prices/staff, no extra saved feature map or implicit upgrade.
// Six-market adjacency is explicit, symmetric and checked against actual regions.
const FACILITY_LIFECYCLE_NEIGHBORS=Object.freeze({
 downtown:Object.freeze(['northside','industrial']),northside:Object.freeze(['downtown','industrial']),
 industrial:Object.freeze(['downtown','northside']),suburbs:Object.freeze(['county_seat','university']),
 county_seat:Object.freeze(['suburbs','university']),university:Object.freeze(['suburbs','county_seat'])
});
function defaultFacilityLifecyclePlan(p) {
 return p.facilityLifecycle?FacilityLifecycle.defaultPlan(p):null;
}
function facilityLifecycleModelTerms(p,office,descriptor=FacilityLifecycle.CATALOG[office.model]) {
 const profile=REGIONAL_MARKETS[office.market],state=p.regionalOperations?.markets[office.market];
 if(!profile||!state||!descriptor)throw Error('Lifecycle requires an authored regional office profile.');
 if(FACILITY_PROJECT_KEYS[office.model]){
  // RAW metrics: FacilityLifecycle owns the single conversion/renovation factor.
  const raw=facilityRawOfficeMetrics(p,office);
  return {cost:facilityNewOfficeCost(p,office.market,office.model),upkeep:Math.round(raw.expense),
   capacity:{depositCapacity:raw.depositCapacity,loanCapacity:raw.loanCapacity,serviceCapacity:raw.serviceCapacity,advisoryCapacity:0}};
 }
 // New-model prices use the same branch strategy/operations/entry pricing path.
 // These catalog quotes do not grant construction permission or create offices.
 return {cost:projectCost({...p,focus:office.market},{kind:'branch',cost:descriptor.cost}),
  upkeep:Math.round(descriptor.upkeep*profile.rent*(1-state.automation*.12)+state.service*2000),
  capacity:{depositCapacity:descriptor.capacity.depositCapacity*profile.deposits*(1+state.service*.15),
   loanCapacity:descriptor.capacity.loanCapacity*profile.loans,serviceCapacity:descriptor.capacity.serviceCapacity,
   advisoryCapacity:descriptor.capacity.advisoryCapacity}};
}
function facilityLifecycleDraftCommitment(p,draft={}) {
 if(!p.facilityLifecycle)return {maintenance:0,renovation:0,total:0,capacity:0};
 const policy=draft.facilityLifecyclePolicy===undefined?defaultFacilityLifecyclePlan(p):draft.facilityLifecyclePolicy;
 if(!policy||!policy.offices||Array.isArray(policy.offices))throw Error('Facility lifecycle policy required.');
 let maintenance=0,renovation=0,capacity=0;
 for(const office of p.facilityNetwork.offices.filter(o=>o.closedCycle===null)){
  const order=policy.offices[office.id],record=p.facilityLifecycle.records[office.id],mode=FacilityLifecycle.modes[order?.maintenance];
  if(!mode||!record)throw Error('Choose a maintenance instruction for every active office.');
  const terms=facilityLifecycleModelTerms(p,office);
  maintenance+=Math.round(terms.upkeep*FacilityLifecycle.RULES.maintenanceShare*mode.spend);
  if(record.renovation&&policy.cancel!==office.id)capacity+=FacilityLifecycle.RULES.renovationCapacity;
  if(policy.renovate===office.id){renovation=Math.round(terms.cost*FacilityLifecycle.RULES.renovationCostShare);capacity+=FacilityLifecycle.RULES.renovationCapacity;}
 }
 const total=maintenance+renovation;
 if(!Number.isSafeInteger(total)||total<0)throw Error('Lifecycle commitments exceed safe accounting range.');
 return {maintenance,renovation,total,capacity};
}
function facilityLifecycleNearby(v,from,to) {
 const known=Object.hasOwn(FACILITY_LIFECYCLE_NEIGHBORS,from)&&Object.hasOwn(FACILITY_LIFECYCLE_NEIGHBORS,to);
 if(!known||!v.territories?.[from]||!v.territories?.[to])return false;
 const region=v.territories[from].region;
 return !!region&&region===v.territories[to].region&&!!v.regions?.[region]?.markets.includes(from)&&
  v.regions[region].markets.includes(to)&&(from===to||FACILITY_LIFECYCLE_NEIGHBORS[from].includes(to));
}
function facilityLifecycleStagedStaff(p,draft,base) {
 const plan=JSON.parse(JSON.stringify(draft));
 const prepared=p.departmentOffice?departmentPlanOperatingQuote(p,plan,base):null;
 const owner=prepared?.owner||JSON.parse(JSON.stringify(p));
 if(p.departmentFunctions&&!p._departmentFunctionsRaw&&!p._departmentFunctionExecution){
  const quote=departmentFunctionsQuote({cycle:p.facilityLifecycle.lastActivatedCycle},p,draft);
  if(!quote.status.eligible)throw Error(quote.status.reason);
  owner._departmentFunctionExecution=quote.delivery;
 }
 owner.allocation={...(plan.allocation||p.allocation)};
 for(const role of Object.keys(ROLES))if(!Number.isInteger(owner.allocation[role])||owner.allocation[role]<0)
  throw Error('Facility staffing requires valid physical department headcount.');
 if(Object.values(owner.allocation).reduce((n,x)=>n+x,0)>p.stats.staff)throw Error('Facility staffing exceeds employed bankers.');
 applyHouseholdPolicy(owner,plan.householdPolicy);applyWorkforcePolicy(owner,plan.workforcePolicy);
 if(owner.productPrograms&&plan.productProgramPolicy){
  owner.productPrograms.markets=JSON.parse(JSON.stringify(plan.productProgramPolicy.markets));
  for(const key of plan.productProgramPolicy.retire||[])owner.productDeployment.ready[key]=false;
 }
 applyRelationshipOfferPolicy(owner,plan.relationshipOfferPolicy);applyOnboardingPolicy(owner,plan.onboardingPolicy);
 applyServicePolicy(owner,plan.servicePolicy);applyCollectionsPolicy(owner,plan.collectionsPolicy);
 const productive=owner.departmentOffice?departmentProductiveAllocation(owner):owner.allocation;
 // Physical FTE only. Specialist productivity is not another employee.
 const staff={service:householdSalesStaff(owner,productive.service),business:departmentFunctionResidual(owner,'business',commercialSalesStaff(owner)),
  lending:creditSalesStaff(owner,productive.lending),operations:departmentFunctionResidual(owner,'operations',productive.operations),wealth:0};
 if(!owner.serviceDesk)staff.business=Math.max(0,staff.business-(owner.serviceContracts?.length||0));
 // There is currently no licensed wealth/brokerage entity. An agency, a research
 // level, or an invented `wealthLicensed` flag is NOT a license or staffing pool.
 const availableStaffQuarters=Object.fromEntries(FacilityLifecycle.ROLES.map(role=>[role,Math.floor(staff[role]*4)]));
 if(Object.values(availableStaffQuarters).some(n=>!Number.isSafeInteger(n)||n<0||n>400))throw Error('Facility staff pool exceeds supported bounds.');
 return {owner,availableStaffQuarters,training:prepared?.training};
}
function facilityLifecycleProtectedBudget(p,draft,budget=planBudget(p,draft)) {
 const reserve=Math.max(draft.workforcePolicy?.reserve??p.workforce?.policy.reserve??0,
  draft.departmentPolicy?.reserve??p.departmentOffice?.policy.reserve??0);
 const mandatory=budget.mandatoryObligations||0;
 const optional=Math.max(0,budget.total-mandatory);
 const limit=Math.min(Math.max(0,p.stats.cash-(p.accounting?.accounts.payables||0)-mandatory-reserve),
  Math.max(0,(budget.capitalBudget??p.stats.cash)-mandatory));
 return {reserve,mandatory,optional,limit,remaining:limit-optional};
}
function facilityLifecyclePlanningContext(v,p,draft,budget=planBudget(p,draft)) {
 if(!p.facilityLifecycle)throw Error('Facility lifecycle requires a new supported campaign.');
 if(!Number.isSafeInteger(budget.total)||budget.total<0||!Number.isFinite(budget.freeCapacity)||
  !Number.isSafeInteger(budget.remaining))throw Error('Invalid shared planning budget.');
 const commitment=facilityLifecycleDraftCommitment(p,draft),included=Object.hasOwn(budget,'facilityLifecycle');
 if(included&&budget.facilityLifecycle!==commitment.total)throw Error('Shared plan budget disagrees with facility commitments.');
 const capacityIncluded=Object.hasOwn(budget,'facilityLifecycleCapacity');
 if(capacityIncluded&&budget.facilityLifecycleCapacity!==commitment.capacity)throw Error('Shared plan budget disagrees with facility execution.');
 // planBudget may not yet include this experimental field. Once integrated,
 // its explicit quote field is authoritative, not inferred from a campaign flag.
 const otherBase=budget.total-(budget.training||0)-(included?commitment.total:0);
 const staged=facilityLifecycleStagedStaff(p,draft,otherBase+commitment.total),owner=staged.owner;
 const training=staged.training?.total??budget.training??0,otherSpend=otherBase+training;
 // Existing wages/payables may remain unfunded; they must not prevent a
 // no-spend turn. Only optional commitments consume the remaining protected
 // envelope, while still reserving every existing obligation ahead of them.
 const {mandatory,limit}=facilityLifecycleProtectedBudget(p,draft,budget);
 const optionalOther=Math.max(0,otherSpend-mandatory);
 const freeCash=Math.max(0,Math.floor(limit-optionalOther));
 const policy=draft.facilityLifecyclePolicy||defaultFacilityLifecyclePlan(p);
 const existingCapacity=commitment.capacity-(policy.renovate?FacilityLifecycle.RULES.renovationCapacity:0);
 const local=key=>PROJECTS[key]&&(PROJECTS[key].kind==='branch'||PROJECTS[key].regionalOnly);
 const occupiedMarkets=[...p.projects.filter(x=>local(x.key)).map(x=>x.target),
  ...planInitiatives(draft).filter(local).map(()=>draft.focus||p.focus)];
 if(draft.facilityPolicy?.convert){const target=p.facilityNetwork.offices.find(o=>o.id===draft.facilityPolicy.convert.officeId);if(target)occupiedMarkets.push(target.market);}
 let restriction='';
 if(tierRank(p)>=2||p.capitalRestriction>0||draft.capitalAction)restriction='Restore capital standing before committing to a renovation.';
 if(policy.renovate){const office=p.facilityNetwork.offices.find(o=>o.id===policy.renovate),territory=office&&v.territories?.[office.market];
  if(!territory||!unlocked(v,territory))restriction='Choose an open market.';}
 return {owner,commitment,remaining:limit-optionalOther-commitment.total,
  freeCapacity:budget.freeCapacity+(capacityIncluded?commitment.capacity:0)-commitment.capacity,context:{cycle:v.cycle,freeCash,
  freeExecution:Math.max(0,budget.freeCapacity+(capacityIncluded?commitment.capacity:0)-existingCapacity),
  availableStaffQuarters:staged.availableStaffQuarters,wealthLicensed:()=>false,
  nearby:(from,to)=>facilityLifecycleNearby(v,from,to),modelTerms:facilityLifecycleModelTerms,occupiedMarkets,restriction}};
}
function lifecycleInstructionQuote(v,p,draft={}) {
 const empty={policy:null,status:{eligible:false,reason:'Facility lifecycle requires a new supported campaign.'},quote:null,
  availableStaffQuarters:null,nearbyHubIds:{},currentMetrics:null,renovationComparisons:{}};
 if(!p.facilityLifecycle)return empty;
 try{
  const plan={...draft,facilityLifecyclePolicy:draft.facilityLifecyclePolicy===undefined?defaultFacilityLifecyclePlan(p):draft.facilityLifecyclePolicy};
  const budget=planBudget(p,plan),staged=facilityLifecyclePlanningContext(v,p,plan,budget),{owner,context}=staged;
  const currentMetrics=FacilityLifecycle.metrics(owner,context),nearbyHubIds={};
  const active=p.facilityNetwork.offices.filter(o=>o.closedCycle===null);
  for(const office of active)nearbyHubIds[office.id]=active.filter(h=>h.id!==office.id&&h.model==='regionalHub'&&office.model!=='regionalHub'&&
   context.nearby(h.market,office.market)).map(h=>h.id);
  const result={...empty,availableStaffQuarters:context.availableStaffQuarters,nearbyHubIds,currentMetrics,renovationComparisons:{}};
  try{
   const policy=FacilityLifecycle.normalize(owner,plan.facilityLifecyclePolicy,context),quote=FacilityLifecycle.quote(owner,policy,context);
   result.policy=policy;result.quote=quote;result.status={eligible:quote.eligible,reason:quote.reason};
   if(staged.remaining<0)result.status={eligible:false,reason:'Shared plan commitments exceed protected cash.'};
   if(staged.freeCapacity<0&&policy.renovate)result.status={eligible:false,reason:'Shared project and facility work exceeds execution capacity.'};
  }catch(error){result.status={eligible:false,reason:error.message};}
  // The selected new order already has exact main-quote metrics. Only existing
  // work needs extra rows; do not restage the full bank for every hypothetical
  // office alternative during each UI render in a long campaign.
  if(result.policy)for(const office of active.filter(o=>p.facilityLifecycle.records[o.id].renovation)){
    const during=JSON.parse(JSON.stringify(owner));
    for(const [id,settings]of Object.entries(result.policy.offices))Object.assign(during.facilityLifecycle.records[id],settings);
    const before=JSON.parse(JSON.stringify(during)),after=JSON.parse(JSON.stringify(during));
    before.facilityLifecycle.records[office.id].renovation=null;
    after.facilityLifecycle.records[office.id].renovation=null;after.facilityLifecycle.records[office.id].conditionBp=10000;
    const row=bank=>FacilityLifecycle.metrics(bank,context).rows.find(r=>r.officeId===office.id);
    result.renovationComparisons[office.id]={before:row(before),during:row(during),after:row(after)};
  }
  return result;
 }catch(error){return {...empty,status:{eligible:false,reason:error.message}};}
}
function facilityLifecycleStaffProposal(v,p,draft={}) {
 if([6,7].includes(v.financialGroupVersion)){
  const staged=facilityLifecyclePlanningContext(v,p,draft),current=draft.facilityLifecyclePolicy||defaultFacilityLifecyclePlan(p),proposal=facilityStaffAllocation(staged.owner,current,staged.context);
  return {policy:proposal.policy,availableStaffQuarters:staged.context.availableStaffQuarters,unused:proposal.unused,
   notes:['Productive quarter-FTE bundles only; existing maintenance, hub links and work orders are retained. No bankers are hired.']};
 }
 const staged=facilityLifecyclePlanningContext(v,p,draft),proposal=FacilityLifecycle.allocateStaff(staged.owner,staged.context.availableStaffQuarters);
 const current=draft.facilityLifecyclePolicy||defaultFacilityLifecyclePlan(p),policy=JSON.parse(JSON.stringify(current));
 for(const [id,row]of Object.entries(policy.offices))row.staffQuarters=proposal.plan.offices[id].staffQuarters;
 return {policy,availableStaffQuarters:staged.context.availableStaffQuarters,unused:proposal.unused,
  notes:['Quarter-FTE proposal only; existing maintenance, hub links and work orders are retained. No bankers are hired.']};
}
