// Group6 actual-engine attribution adapter. Raw context reads are isolated
// from prepared delivery; no book, policy, payment or RNG changes occur here.
//
// Workloads below are provisional monthly quarter-work estimates, not actual
// borrower/account counts and not promises that staffing creates resources.
// Existing service demand is reused where possible. NEW proxy units are:
// relationships: eligible offered products at existing offer throughput, plus
// one quarter per80 business/150 merchant ties;
// credit: four quarters per$10M principal plus one per48 distinct vintages;
// technology: one per24 deposit vintages + two per deployed product/application
//             + one per4 offices; NOT project execution capacity;
// risk: one per$20M loans + one per$40M deposits + one per100 current risk points;
// treasury: two per$40M deposits + four per$1M emergency borrowing + one per48
//           locked-term vintages; no new borrowing or assumed liquidity;
// people: one per8 employed bankers + one per funded training role.
// collections: existing late-principal demand *4; onboarding/service: existing
// household demand *4 + queued applications/20*4 + one open-intake prospecting
// quarter + contract load/2*4. Disabled offer/intake policies retain no new demand.
// Round the SUM once per function, not each workload component.
// Opening-scale calibration: the first draft estimated59 quarters of ongoing
// work for32 employed quarters, before retaining7 office quarters. The revised
// unexpanded bank with closed offer/intake desks needs21 estimated quarters
// (including EXISTING customer service). The earlier household sales proxy
// counted23 even with offers disabled; live sales demand now comes from eligible
// offers instead. This leaves scope for offices/collections and is a workload
// feasibility calibration, not evidence of profitable or enjoyable live balance;
// role-specific shortages and later scale still require integration simulations.
//
// Physical attribution NEVER uses review.capacity/salesStaff, which contain
// specialist productivity and/or training bonuses. It calls the same physical
// sequential-share helpers used by facilityLifecyclePlanningContext instead.
// raw after-teaching quarters = exact retained quarters + whole facility pool
//                             + fractional residual rounding hold.
// Kernel-only quantization floors each retained FUNCTION total once; fractional
// retained time plus residual rounding becomes an explicit uncredited hold.
// employed headcount is unchanged; no fractional time is credited as output.
// kernel physical pool = whole retained reservations + exact facility pool.
// Runtime delivery restores exact retained fractions and keeps only the
// residual rounding hold idle. The physical consumer pool is never duplicated.
const DepartmentFunctionContext = (() => {
  const copy=x=>JSON.parse(JSON.stringify(x)),roles=()=>Object.fromEntries(DepartmentFunctions.ROLES.map(r=>[r,0]));
  const whole=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
  const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
  const sum=xs=>xs.reduce((a,b)=>a+b,0);
  function functionContextWorkloads(p,training){
    const households=sum(Object.values(p.householdBook?.markets||{}).flatMap(row=>Object.values(row))),
      loans=sum((p.creditBook?.cohorts||[]).map(c=>c.principal)),deposits=sum((p.depositBook?.cohorts||[]).map(c=>c.principal)),
      household=householdServiceReview(p),collections=collectionsReview(p),services=serviceLoad(p),
      pending=sum((p.onboarding?.pending||[]).map(row=>row.count)),
      activeProducts=Object.values(p.productDeployment?.ready||{}).filter(Boolean).length,
      activeApplications=Object.keys(p.serviceDesk?.applications||{}).filter(k=>serviceApplicationActive(p,k)).length,
      offices=(p.facilityNetwork?.offices||[]).filter(o=>o.closedCycle===null).length,
      // prepareTermFunding creates locked:true/highYield/remaining:6; the term
      // validator requires remaining>=1 while locked. Pending applications use
      // count (not principal as a count); credit cohorts use principal + late[3].
      termVintages=(p.depositBook?.cohorts||[]).filter(c=>c.locked===true&&c.remaining>0).length;
    const offers=p.relationshipOffers&&p.relationshipOffers.policy.share>0&&relationshipOfferOpen(p,p.relationshipOffers.policy)?relationshipOfferEligibility(p,p.relationshipOffers.policy).uptakeLimit:0;
    // An open intake desk has one quarter of prospecting work even before its
    // first queued application. Actual arrivals still use the finite outside
    // audience, response rate and paid activation rules in onboarding.js.
    const intakeProspecting=p.onboarding&&p.onboarding.policy.share>0&&onboardingOpen(p,p.onboarding.policy)?1:0;
    const sources={households,businessRelationships:p.stats.business,merchantRelationships:p.stats.merchant,eligibleOffers:offers,intakeProspecting,
      householdDemandFte:household?.demand||0,pendingApplications:pending,contractLoad:sum((services?.rows||[]).map(r=>r.load)),
      loanPrincipal:loans,loanVintages:p.creditBook?.cohorts.length||0,latePrincipal:sum(collections?.late||[]),
      depositPrincipal:deposits,depositVintages:p.depositBook?.cohorts.length||0,activeProducts,activeApplications,offices,
      riskPoints:p.stats.compliance,emergencyDebt:p.accounting.accounts.emergencyDebt,termVintages,employedBankers:p.stats.staff,
      paidTrainingRoles:training?.paused?0:(training?.rows||[]).filter(r=>r.spend>0).length};
    if(Object.values(sources).some(n=>!Number.isFinite(n)||n<0))throw Error('Invalid existing book workload inputs.');
    const raw={relationships:offers/RELATIONSHIP_OFFER_CAPACITY*4+sources.businessRelationships/80+sources.merchantRelationships/150,
      onboarding:sources.householdDemandFte*4+pending/ONBOARDING_CAPACITY*4+intakeProspecting+sources.contractLoad/2*4,
      credit:loans/10000000*4+sources.loanVintages/48,
      collections:sources.latePrincipal/1000000*4,
      technology:sources.depositVintages/24+activeProducts*2+activeApplications*2+offices/4,
      risk:loans/20000000+deposits/40000000+sources.riskPoints/100,
      treasury:deposits/40000000*2+sources.emergencyDebt/1000000*4+termVintages/48,
      people:p.stats.staff/8+sources.paidTrainingRoles};
    const workloads=Object.fromEntries(DepartmentFunctions.IDS.map(id=>[id,Math.ceil(raw[id])]));
    if(Object.values(workloads).some(n=>!whole(n,DepartmentFunctions.RULES.maxWorkload)))throw Error('Workload exceeds the prototype review range.');
    const taskWorkloads={
      offerSales:offers/RELATIONSHIP_OFFER_CAPACITY*4,commercialRelationships:sources.businessRelationships/80+sources.merchantRelationships/150,
      householdSupport:sources.householdDemandFte*4,applicationProcessing:pending/ONBOARDING_CAPACITY*4+intakeProspecting,commercialDelivery:sources.contractLoad/2*4,
      creditAdministration:raw.credit,collections:raw.collections,technology:raw.technology,risk:raw.risk,treasury:raw.treasury,people:raw.people};
    return {workloads,sources,raw,taskWorkloads};
  }
  function functionContextBuild(v,p,draft,options={}){
    if(!exact(options,[])&&!exact(options,['vendorSupply'])&&!exact(options,['vendorSupply','budget']))throw Error('Specify authored remaining vendor supply and optional precomputed budget.');
    const vendorSupply=options.vendorSupply===undefined?Object.fromEntries(DepartmentFunctions.IDS.map(id=>[id,0])):copy(options.vendorSupply);
    if(!exact(vendorSupply,DepartmentFunctions.IDS)||Object.values(vendorSupply).some(n=>!whole(n,DepartmentFunctions.RULES.maxVendorQuarters)))throw Error('Invalid finite vendor supply.');
    if(!p.departmentOffice||!p.facilityLifecycle)return {enabled:false,context:null,attribution:null,workloadSources:null};
    // Raw attribution is a private, non-recursive read of retained obligations.
    // Consumer adapters must not reuse an earlier month's dispatch here.
    p=copy(p);p._departmentFunctionsRaw=true;delete p._departmentFunctionExecution;
    const budget=options.budget||planBudget(p,draft),prepared=facilityLifecyclePlanningContext(v,p,draft,budget),owner=prepared.owner,
      productive=departmentProductiveAllocation(owner),physical=roles(),teachers=roles(),exactRetained=Object.fromEntries(DepartmentFunctions.IDS.map(id=>[id,roles()])),
      exactRetainedTasks=Object.fromEntries(['offerSales','commercialRelationships','householdSupport','applicationProcessing','commercialDelivery','creditAdministration','collections','technology','risk','treasury','people'].map(id=>[id,roles()]));
    for(const role of DepartmentFunctions.ROLES){
      physical[role]=productive[role]*4;teachers[role]=(owner.allocation[role]-productive[role])*4;
      if(!whole(physical[role],400)||!whole(teachers[role],4))throw Error('Teaching context is not a physical role pool.');
    }
    let retail=productive.service;
    if(owner.householdBook){
      const retention=retail*owner.householdBook.policy.retention/100;exactRetained.onboarding.service+=retention*4;exactRetainedTasks.householdSupport.service=retention*4;retail-=retention;
      const afterOffers=relationshipOfferSalesStaff(owner,retail);exactRetained.relationships.service+=(retail-afterOffers)*4;exactRetainedTasks.offerSales.service=(retail-afterOffers)*4;retail=afterOffers;
      const afterOnboarding=onboardingSalesStaff(owner,retail);exactRetained.onboarding.service+=(retail-afterOnboarding)*4;exactRetainedTasks.applicationProcessing.service=(retail-afterOnboarding)*4;retail=afterOnboarding;
    }
    let business=commercialSalesStaff(owner);
    if(!owner.serviceDesk)business=Math.max(0,business-(owner.serviceContracts?.length||0));
    exactRetained.onboarding.business=(productive.business-business)*4;
    exactRetainedTasks.commercialDelivery.business=exactRetained.onboarding.business;
    const lending=creditSalesStaff(owner,productive.lending);exactRetained.collections.lending=(productive.lending-lending)*4;
    exactRetainedTasks.collections.lending=exactRetained.collections.lending;
    const residualExact={service:retail*4,business:business*4,lending:lending*4,operations:productive.operations*4},
      retained=Object.fromEntries(DepartmentFunctions.IDS.map(id=>[id,roles()])),facilityPools=roles(),kernelPools=roles(),roundingHold=roles(),residualRoundingHold=roles();
    for(const role of DepartmentFunctions.ROLES){
      const retainedExact=sum(DepartmentFunctions.IDS.map(id=>exactRetained[id][role]));
      if(Math.abs(physical[role]-retainedExact-residualExact[role])>1e-8||retainedExact<0)throw Error('Physical reservation attribution does not conserve time.');
      facilityPools[role]=Math.floor(residualExact[role]);
      if(facilityPools[role]!==prepared.context.availableStaffQuarters[role])throw Error('Function attribution differs from actual facility staff availability.');
      for(const id of DepartmentFunctions.IDS)retained[id][role]=Math.floor(exactRetained[id][role]);
      kernelPools[role]=sum(DepartmentFunctions.IDS.map(id=>retained[id][role]))+facilityPools[role];
      roundingHold[role]=physical[role]-kernelPools[role];residualRoundingHold[role]=residualExact[role]-facilityPools[role];
      if(!whole(roundingHold[role])||roundingHold[role]>3)throw Error('Unexpected function quarter-time quantization hold.');
    }
    const workload=functionContextWorkloads(owner,owner._workforceCosts?.training),context={cycle:v.cycle,headcount:p.stats.staff,physicalQuarters:kernelPools,
      retainedQuarters:retained,workloads:workload.workloads,vendorSupply,freeCash:Math.max(0,Math.floor(prepared.remaining+(budget.departmentFunctions||0)))};
    // Validate against the same kernel schema without adding a book to the
    // real owner. Opening solely on this private clone has no gameplay effects.
    const trial=DepartmentFunctions.initialize({...owner,departmentFunctions:undefined},v.cycle,true);
    const checked=DepartmentFunctions.quote(trial,undefined,context);
    for(const role of DepartmentFunctions.ROLES)if(checked.remainingPools[role]!==facilityPools[role])throw Error('Quantized kernel changed the residual facility pool.');
    return {enabled:true,context,attribution:{employedHeadcount:p.stats.staff,assignedQuarters:Object.fromEntries(DepartmentFunctions.ROLES.map(r=>[r,owner.allocation[r]*4])),
      paidTeacherQuarters:teachers,rawAfterTeachingQuarters:physical,exactRetainedQuarters:exactRetained,exactRetainedTasks,residualExactQuarters:residualExact,
      facilityPools,residualRoundingHold,uncreditedQuantizationHold:roundingHold},workloadSources:workload.sources,rawWorkloads:workload.raw,
      taskWorkloads:workload.taskWorkloads,
      notes:['Diagnostic only: workload estimates grant no bonuses or resources.','Retained function fractions and facility rounding remain explicit uncredited time, not imaginary workers.']};
  }
  return Object.freeze({build:functionContextBuild});
})();
