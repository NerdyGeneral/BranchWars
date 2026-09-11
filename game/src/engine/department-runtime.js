// Group6: one authorized physical pool, separately purchased vendor work.
const departmentFunctionCopy=value=>JSON.parse(JSON.stringify(value));
function defaultDepartmentFunctionsPolicy(p){return p.departmentFunctions?DepartmentFunctions.defaultPlan(p):null;}
function defaultDepartmentFunctionsMandate(p){return {priorities:DepartmentFunctions.IDS.slice(),maxAdditionalQuarters:0,maxVendorExpense:0,floorQuarters:Object.fromEntries(DepartmentFunctions.ROLES.map(r=>[r,(p.facilityNetwork?.offices||[]).filter(o=>o.closedCycle===null).reduce((n,o)=>n+(p.facilityLifecycle?.records[o.id]?.staffQuarters?.[r]||0),0)]))};}
function departmentFunctionDraftOperations(p,plan){
  if(!p.departmentFunctions||departmentFunctionExecution(p))return 0;
  const policy=DepartmentFunctions.validatePolicy(plan.departmentFunctionsPolicy??defaultDepartmentFunctionsPolicy(p));
  return DepartmentFunctions.IDS.reduce((n,id)=>n+policy.quotas[id].operations,0)/4;
}
function departmentFunctionDraftExecutionCapacity(p,plan){
  if(!p.departmentFunctions||departmentFunctionExecution(p))return executionCapacity(p,plan.allocation);
  const productive=departmentProductiveAllocation(p,plan.allocation),ops=Math.max(0,productive.operations-departmentFunctionDraftOperations(p,plan)),
    bonus=productive.operations?specialistBonus(p,'operations',plan.allocation)*ops/productive.operations:0;
  return Math.round((BASE_CAPACITY+(ops+bonus)*CAPACITY_PER_BANKER+operationsLevel(p)*1.5)*10)/10;
}
function departmentFunctionPlanningBudget(p,plan){
  if(p._departmentFunctionOpening){
    const shadow=departmentFunctionCopy(p),authorizedOpening=p._departmentFunctionOpening;
    shadow._departmentFunctionExecution=DepartmentDelivery.deliver(authorizedOpening.dispatch,authorizedOpening.attribution,{headcount:authorizedOpening.attribution.employedHeadcount,physicalQuarters:authorizedOpening.attribution.rawAfterTeachingQuarters,paidVendorQuarters:p.departmentFunctions.policy.vendors});
    shadow._departmentFunctionExpertise=departmentFunctionExpertise(p,authorizedOpening.attribution.rawAfterTeachingQuarters,authorizedOpening.attribution.paidTeacherQuarters);
    return planBudgetBase(shadow,plan);
  }
  const raw=departmentFunctionCopy(p);raw._departmentFunctionsRaw=true;delete raw._departmentFunctionExecution;
  let budget=planBudgetBase(raw,plan);
  const v={cycle:p.facilityLifecycle.lastActivatedCycle},policy=plan.departmentFunctionsPolicy??defaultDepartmentFunctionsPolicy(p);
  // This finite two-pass refinement has an explicit raw boundary. Changed
  // customer work can pause paid teaching; repeat until both monetary quotes
  // and resulting physical pool stabilize. No campaign/book is changed.
  for(let pass=0;pass<8;pass++){
    const built=DepartmentFunctionContext.build(v,raw,plan,{vendorSupply:DepartmentProvider.supply(),budget});
    const quote=DepartmentFunctions.quote(p,policy,{...built.context,freeCash:DepartmentFunctions.RULES.maxCash});
    if(!quote.eligible)return budget; // full instruction validation reports overcommit
    const dispatch=DepartmentDispatch.dispatch(quote,built.attribution,built.taskWorkloads),shadow=departmentFunctionCopy(raw);
    shadow._departmentFunctionsRaw=false;
    shadow._departmentFunctionExecution=DepartmentDelivery.deliver(dispatch,built.attribution,{headcount:p.stats.staff,physicalQuarters:built.attribution.rawAfterTeachingQuarters,paidVendorQuarters:quote.policy.vendors});
    shadow._departmentFunctionExpertise=departmentFunctionExpertise(p,built.attribution.rawAfterTeachingQuarters,built.attribution.paidTeacherQuarters);
    const next=planBudgetBase(shadow,plan);
    if(next.total===budget.total&&next.training===budget.training&&next.relationshipOffers===budget.relationshipOffers&&next.onboarding===budget.onboarding&&next.capacity===budget.capacity)return next;
    budget=next;
  }
  throw Error('Department customer-work budget has not stabilized; revise training or activity instructions.');
}
function departmentFunctionDraftCost(p,draft={}){
  if(!p.departmentFunctions)return 0;
  const policy=DepartmentFunctions.validatePolicy(draft.departmentFunctionsPolicy===undefined?defaultDepartmentFunctionsPolicy(p):draft.departmentFunctionsPolicy);
  return DepartmentFunctions.IDS.reduce((n,id)=>n+policy.vendors[id]*DepartmentFunctions.FUNCTIONS[id].vendorRate,0);
}
function initializeDepartmentFunctions(g){
  if(![6,7,8].includes(g.financialGroupVersion))return;
  g.departmentFunctionEconomy=DepartmentProvider.initialize(g.cycle);
  for(const p of g.players){p.departmentFunctions=DepartmentFunctions.initialize(p,g.cycle,true).departmentFunctions;p.departmentFunctionDelivery=null;}
}
function departmentFunctionsQuote(v,p,draft={}){
  if(!p.departmentFunctions)return {enabled:false,policy:null,status:{eligible:false,reason:'Department functions require a new supported campaign.'}};
  try{
    const budget=planBudget(p,draft),built=DepartmentFunctionContext.build(v,p,draft,{vendorSupply:DepartmentProvider.supply(),budget}),
      policy=draft.departmentFunctionsPolicy===undefined?defaultDepartmentFunctionsPolicy(p):draft.departmentFunctionsPolicy,
      quote=DepartmentFunctions.quote(p,policy,built.context),dispatch=quote.eligible?DepartmentDispatch.dispatch(quote,built.attribution,built.taskWorkloads):null;
    const delivery=dispatch?DepartmentDelivery.deliver(dispatch,built.attribution,{headcount:p.stats.staff,physicalQuarters:built.attribution.rawAfterTeachingQuarters,paidVendorQuarters:quote.policy.vendors}):null;
    const selectedOpportunity=draft.opportunity&&v.opportunities?.find(o=>o.id===draft.opportunity);
    return {...built,...quote,budget,status:{eligible:quote.eligible,reason:quote.reason},dispatch,delivery,
      ...(selectedOpportunity&&delivery?{opportunity:departmentOpportunityQuote(p,selectedOpportunity,delivery,true)}:{})};
  }catch(error){return {enabled:true,policy:draft.departmentFunctionsPolicy??defaultDepartmentFunctionsPolicy(p),eligible:false,reason:error.message,status:{eligible:false,reason:error.message}};}
}
function normalizeDepartmentFunctionsPlan(g,p,plan){
  if(!p.departmentFunctions){if(plan.departmentFunctionsPolicy!==undefined)throw Error('Unversioned department function instructions.');return;}
  const quote=departmentFunctionsQuote(g,p,plan);if(!quote.status.eligible)throw Error(quote.status.reason);
  plan.departmentFunctionsPolicy=quote.policy;
}
function departmentFunctionExecution(p){return !p._departmentFunctionsRaw&&p.departmentFunctions?p._departmentFunctionExecution:null;}
function departmentFunctionTask(p,id){const row=departmentFunctionExecution(p)?.rows.find(row=>row.id===id);return row?{...row.delivered,workload:row.workload}:null;}
function departmentFunctionExpertise(p,physical=departmentFunctionPhysical(p),teachers=null){
  return {version:1,roles:Object.fromEntries(DepartmentFunctions.ROLES.map(role=>{
    const row=p.workforce.departments[role],teaching=teachers?teachers[role]===4:departmentTeachingActive(p,role);
    return [role,{count:row.count,skill:row.skill,allocation:physical[role]/4+(teaching?1:0),teaching}];
  }))};
}
function departmentFunctionExpertBonus(expertise,physical,role){
  const row=expertise.roles[role];
  return Math.min(Math.max(0,row.count-(row.teaching?1:0)),physical[role]/4)*(.1+row.skill*.003);
}
function departmentFunctionFrozenBonus(p,role,allocation=p.allocation){
  const execution=departmentFunctionExecution(p),expertise=p._departmentFunctionExpertise;
  if(!execution||!expertise||DepartmentFunctions.ROLES.some(r=>allocation[r]!==p.allocation[r]))return null;
  return departmentFunctionExpertBonus(expertise,execution.physical.available,role);
}
function departmentFunctionTaskFte(p,id,fallback){
  const row=departmentFunctionTask(p,id);if(!row)return fallback;
  // Expertise improves delivered work, never the physical staffing pool or
  // purchased vendor count. Each role's bonus is apportioned once by task time.
  const physical=departmentFunctionExecution(p).physical.available;
  return row.capacity/4+DepartmentFunctions.ROLES.reduce((n,role)=>n+(physical[role]?specialistBonus(p,role)*(row.retained[role]+row.additional[role])/physical[role]:0),0);
}
// Physical task authorization, purchased work and expertise are different
// quantities. Vendor work can exceed local staffing, but cannot consume or
// manufacture the residual physical sales pool.
function departmentCustomerStaffingDetails(execution,expertise,id){
  const row=execution.rows.find(row=>row.id===id).delivered,physical=execution.physical.available;
  const physicalAssigned=DepartmentFunctions.ROLES.reduce((n,r)=>n+row.retained[r]+row.additional[r],0)/4;
  const taskBonus=DepartmentFunctions.ROLES.reduce((n,r)=>n+(physical[r]?departmentFunctionExpertBonus(expertise,physical,r)*(row.retained[r]+row.additional[r])/physical[r]:0),0);
  const physicalSales=execution.remainingPools.service/4;
  return {physicalAssigned,vendorStaff:row.vendor/4,expertise:taskBonus,physicalSales,
    assignedStaff:physicalAssigned+row.vendor/4+taskBonus,
    salesStaff:physicalSales+(physical.service?departmentFunctionExpertBonus(expertise,physical,'service')*execution.remainingPools.service/physical.service:0)};
}
function departmentCustomerStaffing(p,id,enabled,legacyAssigned,legacySales){
  const execution=departmentFunctionExecution(p);
  if(!execution)return {assignedStaff:legacyAssigned,salesStaff:legacySales};
  const expertise=p._departmentFunctionExpertise||departmentFunctionExpertise(p,execution.physical.available),
    details=departmentCustomerStaffingDetails(execution,expertise,id);
  return {staffingVersion:2,assignedStaff:enabled?details.assignedStaff:0,salesStaff:details.salesStaff};
}
function validateDepartmentCustomerStaffing(p,report,id,evidenceChecked=false){
  const saved=p.departmentFunctionDelivery,modern=report?.staffingVersion!==undefined;
  if(!modern){if(saved?.expertise!==undefined)throw Error('Department staffing report marker missing.');return false;}
  if(report.staffingVersion!==2||!p.departmentFunctions||!saved?.expertise||saved.cycle!==report.cycle)throw Error('Unsupported department staffing report.');
  if(!evidenceChecked)validateDepartmentFunctionOwner(p,report.cycle);
  const details=departmentCustomerStaffingDetails(saved.report,saved.expertise,id),
    assigned=report.policy.share>0?details.assignedStaff:0,
    retained=saved.attribution.rawAfterTeachingQuarters.service*(1-p.householdBook.policy.retention/100)*
      (id==='applicationProcessing'?(1-p.relationshipOffers.policy.share/100):1)*report.policy.share/100;
  if(Math.abs(saved.attribution.exactRetainedTasks[id].service-retained)>1e-8||
    Math.abs(report.assignedStaff-assigned)>1e-8||Math.abs(report.salesStaff-details.salesStaff)>1e-8)
    throw Error('Department customer staffing does not reconcile with authorized delivery.');
  return true;
}
function departmentFunctionCoverage(p,id,fallback=1){const row=departmentFunctionTask(p,id);return row?(row.workload===0?1:Math.min(1,departmentFunctionTaskFte(p,id,0)*4/row.workload)):fallback;}
function departmentFunctionResidual(p,role,fallback){const execution=departmentFunctionExecution(p);return execution?execution.remainingPools[role]/4:fallback;}
function departmentFunctionResidualProductivity(p,role,staff,fallback){const execution=departmentFunctionExecution(p);return execution?(execution.physical.available[role]?execution.remainingPools[role]*staff/execution.physical.available[role]:0):fallback;}
function departmentFunctionPhysical(p){const productive=departmentProductiveAllocation(p);return Object.fromEntries(DepartmentFunctions.ROLES.map(role=>[role,Math.max(0,productive[role]*4)]));}
function departmentOpportunityQuote(p,o,execution=departmentFunctionExecution(p),ignorePrevious=false){
  opportunityTerms(o);
  if(typeof o.id!=='string'||o.dept!==OPPORTUNITY_TYPES[o.type].dept||!p.marketBook?.markets[o.market])throw Error('Canonical local opportunity terms required.');
  const id=o.type==='loan'?'credit':o.type==='public'?'risk':'relationships',roles=o.type==='loan'?['lending','operations']:o.type==='public'?['operations','lending']:['business','payroll'].includes(o.type)?['business']:['service'],
    required=Math.max(1,Math.ceil(o.value/(o.type==='loan'?250000:1000000)));
  if(!p.departmentFunctions)return {enabled:false,eligible:true};
  const idle=execution?.idleByFunction[id]?.delivered,staffQuarters=Object.fromEntries(DepartmentFunctions.ROLES.map(role=>[role,0]));
  const available=idle?roles.reduce((n,r)=>n+idle.staff[r],idle.vendor):0;
  let left=required;for(const role of roles){const n=Math.min(left,idle?.staff[role]||0);staffQuarters[role]=n;left-=n;}
  const vendorQuarters=Math.min(left,idle?.vendor||0),already=!ignorePrevious&&p.departmentFunctionDelivery?.opportunity;
  const eligible=!!idle&&!already&&available+1e-8>=required;
  return {enabled:true,eligible,reason:already?'This month already used its pipeline pursuit.':!eligible?'Reserve '+required+' unused '+DepartmentFunctions.FUNCTIONS[id].name+' quarter-work units for this pursuit.':'Funded unused work is available; no win is guaranteed.',
    function:id,required,available,staffQuarters,vendorQuarters};
}
function reserveDepartmentOpportunity(g,p,o){
  const quote=departmentOpportunityQuote(p,o);if(!quote.eligible)return quote;
  p.departmentFunctionDelivery.opportunity={cycle:g.cycle,terms:{id:o.id,type:o.type,market:o.market,value:o.value,dept:o.dept},
    quote:departmentFunctionCopy(quote),result:'attempted',awarded:false};
  return quote;
}
function authorizeDepartmentOpportunityAward(p,o){
  if(!p.departmentFunctions)return true;
  const work=p.departmentFunctionDelivery?.opportunity;
  if(!work||work.awarded||work.result!=='won'||work.terms.id!==o.id||work.terms.type!==o.type||work.terms.market!==o.market||o.value>work.terms.value)return false;
  work.awarded=true;return true;
}
function prepareDepartmentFunctions(g,plans){
  if(![6,7,8].includes(g.financialGroupVersion))return [];
  const quotes=g.players.map((p,i)=>departmentFunctionsQuote(g,p,plans[i]));
  for(const q of quotes)if(!q.status.eligible)throw Error(q.status.reason);
  const result=DepartmentProvider.settle(g.departmentFunctionEconomy,g.players,quotes.map(q=>q.policy),quotes.map(q=>q.context));
  g.departmentFunctionEconomy=result.provider;
  g.players.forEach((p,i)=>{
    p.accounting=result.players[i].accounting;p.departmentFunctions=result.players[i].departmentFunctions;syncAccounts(p);
    p._departmentFunctionPaidCycle=g.cycle;p._departmentFunctionOpening={attribution:quotes[i].attribution,taskWorkloads:quotes[i].taskWorkloads,dispatch:quotes[i].dispatch,budgets:{relationshipOffers:quotes[i].budget.relationshipOffers,onboarding:quotes[i].budget.onboarding}};
  });
  return []; // Exact orders and payments remain in owner-only books/reports.
}
function deliverDepartmentFunctions(g){
  if(![6,7,8].includes(g.financialGroupVersion))return;
  for(const p of g.players){
    const authorizedOpening=p._departmentFunctionOpening;if(!authorizedOpening)throw Error('Opening department authorization missing.');
    const actual={headcount:p.stats.staff,physicalQuarters:departmentFunctionPhysical(p),paidVendorQuarters:p.departmentFunctions.policy.vendors},
      report=DepartmentDelivery.deliver(authorizedOpening.dispatch,authorizedOpening.attribution,actual);
    p._departmentFunctionExecution=report;
    p._departmentFunctionExpertise=departmentFunctionExpertise(p,actual.physicalQuarters);
    // Opening commitments are maxima, not a second bill. A late staffing loss
    // cannot increase the authorized rebate/activation cash allowance.
    p._relationshipOfferBudget=Math.min(authorizedOpening.budgets.relationshipOffers,relationshipOfferBudget(p,{}));
    p._onboardingBudget=Math.min(authorizedOpening.budgets.onboarding,onboardingBudget(p,{}));
    p.departmentFunctionDelivery={cycle:g.cycle,attribution:departmentFunctionCopy(authorizedOpening.attribution),taskWorkloads:departmentFunctionCopy(authorizedOpening.taskWorkloads),actual:departmentFunctionCopy(actual),report:departmentFunctionCopy(report),expertise:departmentFunctionCopy(p._departmentFunctionExpertise),opportunity:null};
  }
}
function finishDepartmentFunctions(g){
  if(![6,7,8].includes(g.financialGroupVersion))return [];
  for(const p of g.players){
    addDepartmentFunctionOperatingReport(p);
    delete p._departmentFunctionExecution;delete p._departmentFunctionExpertise;delete p._departmentFunctionOpening;delete p._departmentFunctionPaidCycle;
  }
  return [];
}
function addDepartmentFunctionOperatingReport(p){
  if(!p.departmentFunctions||!p.operatingReport||p.operatingReport.departmentFunctionExpense!==undefined)return;
  const expense=p._departmentFunctionForecastExpense??p.departmentFunctions.report?.vendorExpense??0;
  p.operatingReport.departmentFunctionExpense=expense;p.operatingReport.expense+=expense;p.operatingReport.profit-=expense;p.stats.lastProfit-=expense;
  if(p.marketReport){p.marketReport.central-=expense;p.marketReport.profit-=expense;}
}
function validateDepartmentFunctionOwner(p,month){
  DepartmentFunctions.validate(p);
  if(p.departmentFunctions.lastCycle!==month)throw Error('Department function campaign month mismatch.');
  for(const key of ['_departmentFunctionExecution','_departmentFunctionExpertise','_departmentFunctionOpening','_departmentFunctionPaidCycle','_departmentFunctionsRaw','_departmentFunctionForecastExpense'])if(p[key]!==undefined)throw Error('Unsettled department function transient.');
  const saved=p.departmentFunctionDelivery;
  if(month===p.departmentFunctions.startedCycle-1){if(saved!==null)throw Error('Unexpected opening department delivery.');return;}
  if(!saved||Object.keys(saved).filter(k=>k!=='opportunity').sort().join('|')!==['actual','attribution','cycle','report','taskWorkloads',...(saved.expertise!==undefined?['expertise']:[])].sort().join('|')||saved.cycle!==month)throw Error('Department delivery evidence missing.');
  if(JSON.stringify(saved.actual?.paidVendorQuarters)!==JSON.stringify(p.departmentFunctions.report.policy.vendors))throw Error('Department delivery claims unpaid vendor work.');
  const basis=p.departmentFunctions.report.basis;
  if(saved.attribution.employedHeadcount!==basis.headcount)throw Error('Opening department headcount does not reconcile.');
  for(const role of DepartmentFunctions.ROLES){
    let retained=0;for(const id of DepartmentFunctions.IDS){const quarter=Math.floor(saved.attribution.exactRetainedQuarters[id][role]);if(quarter!==basis.retainedQuarters[id][role])throw Error('Opening retained department work changed.');retained+=quarter;}
    if(retained+saved.attribution.facilityPools[role]!==basis.physicalQuarters[role])throw Error('Opening department physical pool changed.');
  }
  const dispatched=DepartmentDispatch.dispatch(p.departmentFunctions.report,saved.attribution,saved.taskWorkloads),expected=DepartmentDelivery.deliver(dispatched,saved.attribution,saved.actual);
  if(JSON.stringify(expected)!==JSON.stringify(saved.report))throw Error('Department delivery evidence does not reconcile.');
  if(saved.expertise!==undefined){
    const e=saved.expertise,exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
    if(!exact(e,['version','roles'])||e.version!==1||!exact(e.roles,DepartmentFunctions.ROLES))throw Error('Invalid department expertise evidence.');
    let assigned=0,specialists=0;
    for(const role of DepartmentFunctions.ROLES){
      const row=e.roles[role],leadership=p.departmentOffice?.report?.rows.find(r=>r.role===role);
      if(!exact(row,['count','skill','allocation','teaching'])||!Number.isSafeInteger(row.count)||row.count<0||row.count>saved.actual.headcount||
        !Number.isSafeInteger(row.skill)||row.skill<0||row.skill>100||(!row.count&&row.skill!==0)||
        !Number.isSafeInteger(row.allocation)||row.allocation<0||row.allocation>saved.actual.headcount||typeof row.teaching!=='boolean'||
        saved.actual.physicalQuarters[role]!==4*(row.allocation-(row.teaching?1:0))||
        (row.teaching&&(row.count<2||row.skill>=100||row.allocation<1||!leadership?.profile||leadership.paid!==leadership.expense+leadership.arrears)))
        throw Error('Department expertise exceeds the employed, paid productive role pool.');
      assigned+=row.allocation;specialists+=row.count;
      const recorded=p.operatingReport?.['specialistBonus_'+role];
      if(!Number.isFinite(recorded)||Math.abs(recorded-departmentFunctionExpertBonus(e,saved.actual.physicalQuarters,role))>1e-8)throw Error('Frozen department expertise disagrees with the operating report.');
    }
    if(assigned!==saved.actual.headcount||specialists>saved.actual.headcount)throw Error('Department expertise headcount does not reconcile.');
    if(p.relationshipOffers?.report?.staffingVersion!==2||p.onboarding?.report?.staffingVersion!==2)throw Error('Department expertise requires versioned customer staffing reports.');
  }
  for(const [field,id]of [['relationshipOffers','offerSales'],['onboarding','applicationProcessing']]){
    const customer=p[field]?.report;
    if(saved.expertise!==undefined||customer?.staffingVersion!==undefined){
      if(!customer||!Number.isFinite(customer.assignedStaff)||customer.assignedStaff<0||!Number.isFinite(customer.salesStaff)||customer.salesStaff<0)
        throw Error('Invalid owner customer staffing report.');
      validateDepartmentCustomerStaffing(p,customer,id,true);
    }
  }
  if(saved.opportunity!==undefined&&saved.opportunity!==null){
    const work=saved.opportunity;
    if(Object.keys(work).sort().join('|')!=='awarded|cycle|quote|result|terms'||work.cycle!==month||
      !['won','lost'].includes(work.result)||typeof work.awarded!=='boolean'||work.awarded&&work.result!=='won'||
      !work.terms||Object.keys(work.terms).sort().join('|')!=='dept|id|market|type|value'||typeof work.terms.id!=='string'||
      !p.marketBook.markets[work.terms.market]||!ROLES[work.terms.dept])throw Error('Invalid settled department pipeline work.');
    const required=departmentOpportunityQuote(p,work.terms,saved.report,true);
    if(!required.eligible||JSON.stringify(required)!==JSON.stringify(work.quote))throw Error('Pipeline work exceeds unused delivered capacity.');
  }
}
function validateStoredDepartmentFunctionPolicies(g){
  if(![6,7,8].includes(g.financialGroupVersion))return;
  for(const p of g.players){
    if(p.submitted)DepartmentFunctions.validatePolicy(p.submitted.departmentFunctionsPolicy);
    if(p.departmentFunctions?.lastCycle>=p.departmentFunctions?.startedCycle)DepartmentFunctions.validatePolicy(g.lastPlans?.[p.id]?.departmentFunctionsPolicy);
  }
}
function validateDepartmentFunctionsSave(g){
  for(const p of g.players)for(const key of ['_departmentFunctionExecution','_departmentFunctionExpertise','_departmentFunctionOpening','_departmentFunctionPaidCycle','_departmentFunctionsRaw','_departmentFunctionForecastExpense'])if(p[key]!==undefined)throw Error('Unsettled department function transient.');
  if(![6,7,8].includes(g.financialGroupVersion)){
    if(g.departmentFunctionEconomy!==undefined||g.players.some(p=>p.departmentFunctions!==undefined||p.departmentFunctionDelivery!==undefined||p.submitted?.departmentFunctionsPolicy!==undefined)||Object.values(g.lastPlans||{}).some(p=>p.departmentFunctionsPolicy!==undefined))throw Error('Unversioned department function state.');return;
  }
  const month=g.cycle-(g.gameOver?0:1);DepartmentProvider.validate(g.departmentFunctionEconomy);
  if(g.departmentFunctionEconomy.version!==([7,8].includes(g.financialGroupVersion)?2:1))throw Error('Department provider rules do not match the campaign.');
  if(g.departmentFunctionEconomy.month!==month||g.departmentFunctionEconomy.paid!==g.players.reduce((n,p)=>n+p.departmentFunctions.paid,0))throw Error('Department provider does not reconcile.');
  if(g.departmentFunctionEconomy.report)for(const row of g.departmentFunctionEconomy.report.owners){
    const owner=g.players.find(p=>p.id===row.id),report=owner?.departmentFunctions.report;
    if(!report||row.expense!==report.vendorExpense||JSON.stringify(row.vendors)!==JSON.stringify(report.policy.vendors))throw Error('Department supplier owner payment does not reconcile.');
  }
  for(const p of g.players){
    validateDepartmentFunctionOwner(p,month);
    if(p.departmentFunctions.lastCycle>=p.departmentFunctions.startedCycle)DepartmentFunctions.validatePolicy(g.lastPlans?.[p.id]?.departmentFunctionsPolicy);
    if(p.departmentFunctionDelivery?.opportunity&&g.lastPlans?.[p.id]?.opportunity!==p.departmentFunctionDelivery.opportunity.terms.id)throw Error('Pipeline work was not authorized by the settled plan.');
    if(p.submitted){
      // Interactive drafts may inherit a standing policy. A stored commitment
      // must already contain it: importing an omission must not change orders.
      DepartmentFunctions.validatePolicy(p.submitted.departmentFunctionsPolicy);
      normalizeDepartmentFunctionsPlan(g,p,departmentFunctionCopy(p.submitted));
    }
  }
}
function projectDepartmentFunctions(g,out,index){
  if(![6,7,8].includes(g.financialGroupVersion))return;
  const p=g.players[index];out.me.departmentFunctions=departmentFunctionCopy(p.departmentFunctions);out.me.departmentFunctionDelivery=departmentFunctionCopy(p.departmentFunctionDelivery);
  delete out.rival.departmentFunctions;delete out.rival.departmentFunctionDelivery;
  if(out.lastPlans?.[out.rival.id])delete out.lastPlans[out.rival.id].departmentFunctionsPolicy;
}
function validateDepartmentFunctionsView(v){
  for(const p of [v.me,v.rival])for(const key of ['_departmentFunctionExecution','_departmentFunctionExpertise','_departmentFunctionOpening','_departmentFunctionPaidCycle','_departmentFunctionsRaw','_departmentFunctionForecastExpense'])if(p?.[key]!==undefined)throw Error('Unsettled department function transient exposed.');
  if(v.departmentFunctionEconomy!==undefined||v.rival?.departmentFunctions!==undefined||v.rival?.departmentFunctionDelivery!==undefined||v.lastPlans?.[v.rival?.id]?.departmentFunctionsPolicy!==undefined)throw Error('Private department function data exposed.');
  if(![6,7,8].includes(v.financialGroupVersion)){if(v.me?.departmentFunctions!==undefined||v.me?.departmentFunctionDelivery!==undefined||v.me?.submitted?.departmentFunctionsPolicy!==undefined||Object.values(v.lastPlans||{}).some(p=>p.departmentFunctionsPolicy!==undefined))throw Error('Unversioned department function view.');return;}
  validateDepartmentFunctionOwner(v.me,v.cycle-(v.gameOver?0:1));
  if(v.me.departmentFunctions.lastCycle>=v.me.departmentFunctions.startedCycle)DepartmentFunctions.validatePolicy(v.lastPlans?.[v.me.id]?.departmentFunctionsPolicy);
  if(v.me.submitted&&typeof v.me.submitted==='object')DepartmentFunctions.validatePolicy(v.me.submitted.departmentFunctionsPolicy);
  if(v.me.departmentFunctionDelivery?.opportunity&&v.lastPlans?.[v.me.id]?.opportunity!==v.me.departmentFunctionDelivery.opportunity.terms.id)throw Error('Owner pipeline evidence does not match its settled instruction.');
}
function planDepartmentFunctionsCore(g,index,plan,originationFloor=false){
  const p=g.players[index];if(!p.departmentFunctions)return plan;
  // Preserve the player's canonical policy in human drafts. AI independently
  // rebuilds affordable orders; it cannot borrow, hire, close or submit here.
  plan.departmentFunctionsPolicy={quotas:Object.fromEntries(DepartmentFunctions.IDS.map(id=>[id,Object.fromEntries(DepartmentFunctions.ROLES.map(role=>[role,0]))])),vendors:Object.fromEntries(DepartmentFunctions.IDS.map(id=>[id,0]))};
  const quote=departmentFunctionsQuote(g,p,plan);if(!quote.status.eligible)return plan;
  const floorQuarters=Object.fromEntries(DepartmentFunctions.ROLES.map(role=>[role,Math.min(quote.remainingPools[role],Object.values(plan.facilityLifecyclePolicy?.offices||{}).reduce((n,row)=>n+(row.staffQuarters?.[role]||0),0))]));
  // Protect execution already committed to construction, conversion and
  // renovation, not just bankers stationed at the physical offices. Expertise
  // is included in the zero-function budget's per-quarter execution rate.
  const fixed=BASE_CAPACITY+operationsLevel(p)*1.5,perQuarter=quote.remainingPools.operations?(quote.budget.capacity-fixed)/quote.remainingPools.operations:0;
  const executionFloor=perQuarter>0?Math.ceil(Math.max(0,quote.budget.load-fixed)/perQuarter-1e-8):0;
  floorQuarters.operations=Math.max(floorQuarters.operations,Math.min(quote.remainingPools.operations,executionFloor));
  // A healthy bank can propose reserving two existing lending quarter-units for
  // funded originations. This does not override protected work: the wrapper
  // accepts it only after comparing actual, fully budgeted delivery outcomes.
  if(originationFloor&&[6,7,8].includes(g.financialGroupVersion)&&tierRank(p)<2&&p.stats.emergencyDebt===0&&
    fundingPosition(p).excess===0&&g.economy.demand>0&&quote.context.freeCash>=250000)
    floorQuarters.lending=Math.max(floorQuarters.lending,Math.min(2,quote.remainingPools.lending));
  const mandate={priorities:['risk','credit','technology','treasury','people','onboarding','collections','relationships'],maxAdditionalQuarters:400,
    maxVendorExpense:Math.max(0,Math.min(50000,Math.floor(quote.context.freeCash*.03))),floorQuarters};
  const proposal=DepartmentFunctions.propose(p,quote.policy,quote.context,mandate);
  if(proposal.eligible)plan.departmentFunctionsPolicy=proposal.policy;
  const selectedOpportunity=plan.opportunity&&g.opportunities.find(o=>o.id===plan.opportunity);
  if(selectedOpportunity){
    const current=departmentFunctionsQuote(g,p,plan),work=current.opportunity;
    if(work&&!work.eligible){
      const id=work.function,rate=DepartmentFunctions.FUNCTIONS[id].vendorRate,
        needed=Math.ceil(Math.max(0,work.required-work.available)),room=Math.min(DepartmentProvider.ENTITLEMENT-plan.departmentFunctionsPolicy.vendors[id],Math.floor(Math.max(0,mandate.maxVendorExpense-current.vendorExpense)/rate));
      if(needed<=room){plan.departmentFunctionsPolicy.vendors[id]+=needed;const next=departmentFunctionsQuote(g,p,plan);if(!next.status.eligible)plan.departmentFunctionsPolicy.vendors[id]-=needed;}
    }
  }
  return plan;
}
function departmentOriginationFloorAcceptance(g,p,beforePlan,afterPlan){
  const reject=reason=>({accepted:false,reason}),copy=departmentFunctionCopy;
  try{
    const originalBefore=copy(beforePlan),originalAfter=copy(afterPlan);
    delete originalBefore.departmentFunctionsPolicy;delete originalAfter.departmentFunctionsPolicy;
    if(JSON.stringify(originalBefore)!==JSON.stringify(originalAfter))return reject('Existing instructions changed.');
    // Both alternatives use the same final reserve pass. An unaffordable
    // baseline vendor is not compared against a finalized candidate order.
    const index=g.players.findIndex(owner=>owner.id===p.id);
    if(index<0)return reject('Unknown owner.');
    beforePlan=planFinalCashReserve(g,index,beforePlan);
    afterPlan=planFinalCashReserve(g,index,afterPlan);
    const a=copy(beforePlan),b=copy(afterPlan);delete a.departmentFunctionsPolicy;delete b.departmentFunctionsPolicy;
    if(JSON.stringify(a)!==JSON.stringify(b))return reject('Existing instructions changed.');
    const before=departmentFunctionsQuote(g,p,beforePlan),after=departmentFunctionsQuote(g,p,afterPlan);
    if(!before.status.eligible||!after.status.eligible)return reject('Function work is not feasible.');
    if(before.opportunity?.eligible&&!after.opportunity?.eligible)return reject('Selected pursuit lost its authorized unused work.');
    if(after.remainingPools.lending<=before.remainingPools.lending)return reject('No origination time gained.');
    if(JSON.stringify(before.attribution.paidTeacherQuarters)!==JSON.stringify(after.attribution.paidTeacherQuarters)||
      JSON.stringify(before.attribution.exactRetainedQuarters)!==JSON.stringify(after.attribution.exactRetainedQuarters))return reject('Paid teaching or retained work changed.');
    // Every existing task is protected, including service, contracts, credit
    // administration, technology and collections, not merely the Risk function.
    for(const row of before.delivery.rows){
      const next=after.delivery.rows.find(x=>x.id===row.id);
      if(!next||Math.abs(next.workload-row.workload)>1e-8||next.delivered.served+1e-8<row.delivered.served)return reject('Protected '+row.id+' coverage worsened.');
    }
    const budget=planBudget(p,afterPlan);
    if(budget.remaining<0||budget.freeCapacity<0||!projectPlanStatus(p,afterPlan).eligible)return reject('Existing funded work or execution is not feasible.');
    if(facilityLifecycleProtectedBudget(p,afterPlan,budget).remaining<0)return reject('Protected cash reserve is not funded.');
    if(!lifecycleInstructionQuote(g,p,afterPlan).status.eligible)return reject('Existing office instructions are not feasible.');
    const forecast=q=>operatingPreview({...p,marketSnapshot:g.marketEconomy},q,g.economy),oldForecast=forecast(beforePlan),nextForecast=forecast(afterPlan);
    const gross=r=>Math.round(r.loanGrowth+(r.principalRepaid||0)+(r.creditRecovery||0)+(r.chargeoff||0));
    if(gross(nextForecast)<=Math.max(0,gross(oldForecast)))return reject('No funded origination benefit.');
    if(nextForecast.fundingLoss>oldForecast.fundingLoss||(nextForecast.emergencyDebt||0)>(oldForecast.emergencyDebt||0)||
      nextForecast.capitalRatio<GROUP_SAFEGUARDS.capitalRatio*100)return reject('Funding or capital protection worsened.');
    return {accepted:true,reason:'More funded origination with protected work retained.',beforeGross:gross(oldForecast),afterGross:gross(nextForecast),plan:afterPlan};
  }catch(error){return reject(error.message);}
}
function planDepartmentFunctions(g,index,plan){
  // Historical campaigns retain the original call path, with no copied inputs
  // or additional forecasting/RNG. No policy or saved map is added here.
  if(![6,7,8].includes(g.financialGroupVersion))return planDepartmentFunctionsCore(g,index,plan);
  const input=departmentFunctionCopy(plan),baseline=planDepartmentFunctionsCore(g,index,plan),p=g.players[index],
    quote=departmentFunctionsQuote(g,p,baseline);
  if(!quote.status.eligible||quote.remainingPools.lending>=2||tierRank(p)>=2||p.stats.emergencyDebt||
    fundingPosition(p).excess||g.economy.demand<=0||quote.context.freeCash<250000)return baseline;
  try{
    const candidate=planDepartmentFunctionsCore(g,index,input,true),
      decision=withCorporateForecast(g,()=>departmentOriginationFloorAcceptance(g,p,baseline,candidate));
    if(decision.accepted)return decision.plan;
    return [7,8].includes(g.financialGroupVersion)?planFundedOriginationWork(g,index,baseline,quote):baseline;
  }catch{return baseline;}
}
// V3.1 only: buy the SAME administrative work from its real, finite provider
// rather than permanently starving originations to preserve that work. This
// changes a proposed order, not staffing, workload, borrower demand or cash.
// The existing guard checks all task coverage, cash, capital, funding and actual
// funded origination after the final reserve pass. It may reject the investment.
function planFundedOriginationWork(g,index,baseline,quote){
  const p=g.players[index],candidate=departmentFunctionCopy(baseline);
  let needed=Math.max(0,2-quote.remainingPools.lending),released=0;
  for(const id of DepartmentFunctions.IDS){
    const policy=candidate.departmentFunctionsPolicy;
    const count=Math.min(needed-released,policy.quotas[id].lending,
      DepartmentProvider.ENTITLEMENT-policy.vendors[id]);
    if(count<=0)continue;
    policy.quotas[id].lending-=count;policy.vendors[id]+=count;released+=count;
  }
  if(!released)return baseline;
  const expense=departmentFunctionDraftCost(p,candidate);
  // A bounded recurring purchase, not permission to consume all idle cash.
  if(expense>Math.min(50000,Math.floor(quote.context.freeCash*.05)))return baseline;
  const decision=withCorporateForecast(g,()=>departmentOriginationFloorAcceptance(g,p,baseline,candidate));
  return decision.accepted?decision.plan:baseline;
}
function prepareDepartmentFunctionForecast(p,plan){
  if(!p.departmentFunctions)return p;
  const quote=departmentFunctionsQuote({cycle:p.facilityLifecycle.lastActivatedCycle},p,plan);
  if(!quote.status.eligible)throw Error(quote.status.reason);
  const copy=departmentFunctionCopy(p);
  if(quote.vendorExpense){copy.accounting=AccountingPrototype.post(copy.accounting,'department.functions',{cash:-quote.vendorExpense,equity:-quote.vendorExpense},-quote.vendorExpense);syncAccounts(copy);}
  copy._departmentFunctionPaidCycle=copy.departmentFunctions.lastCycle;
  copy._departmentFunctionExecution=quote.delivery;
  copy._departmentFunctionExpertise=departmentFunctionExpertise(p,quote.delivery.physical.available,quote.attribution.paidTeacherQuarters);
  // A forecast is not a completed campaign: do not mutate chronological history.
  copy._departmentFunctionForecastExpense=quote.vendorExpense;
  return copy;
}
function departmentCustomerPreview(p,v,draft){
  if(!p.departmentFunctions)throw Error('Department customer preview requires the supported department campaign.');
  const plan=departmentFunctionCopy(draft);
  normalizeProductProgramPlan(p,plan);normalizeAdvertisingPlan(p,plan);
  normalizeRelationshipOfferPlan(p,plan);normalizeOnboardingPlan(p,plan);normalizeDepartmentPlan(p,plan);
  const authorized=departmentFunctionsQuote(v,p,plan);
  if(!authorized.status.eligible)throw Error(authorized.status.reason);
  const functionPrepared=prepareDepartmentFunctionForecast(p,plan),prepared=prepareOperatingForecast(functionPrepared,plan),
    facilityCost=facilityDraftSpend(prepared,plan),network=facilityProspectiveOwner(prepared,plan),
    owner=prepareFacilityLifecycleForecast(departmentPreparedOwner(network,plan),plan);
  owner.focus=plan.focus;
  owner._workforceReserved=Math.max(0,(owner._workforceReserved||0)-departmentLeadershipQuote(p,plan).total-facilityCost-facilityLifecycleDraftCommitment(prepared,plan).renovation);
  owner._workforceCosts=workforceOperatingCosts(owner);
  const staffing=id=>departmentCustomerStaffingDetails(owner._departmentFunctionExecution,owner._departmentFunctionExpertise,id);
  return {owner,plan,relationshipOffers:relationshipOfferReview(owner,v),onboarding:onboardingReview(owner,v),
    staffing:{relationshipOffers:staffing('offerSales'),onboarding:staffing('applicationProcessing')}};
}
