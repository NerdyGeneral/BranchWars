// Group 4 departmental envelopes and persistent leadership. This module does
// not replace workforce, existing management mandates, or their accounting.
const DEPARTMENT_LEADERS = Object.freeze({
  mentor: Object.freeze({ name: 'Development mentor', salary: 7000, appointment: 30000,
    gains: Object.freeze({service:6,business:6,lending:6,operations:6}),
    description: 'Accelerated paid classes across disciplines, with the highest compensation.' }),
  delivery: Object.freeze({ name: 'Service delivery leader', salary: 4000, appointment: 22000,
    gains: Object.freeze({service:5,business:5,lending:3,operations:3}),
    description: 'Strong retail and commercial instruction; weaker credit and risk instruction.' }),
  controls: Object.freeze({ name: 'Credit and controls leader', salary: 4500, appointment: 25000,
    gains: Object.freeze({service:3,business:3,lending:5,operations:5}),
    description: 'Strong credit and risk instruction; weaker customer-service instruction.' })
});
const DEPARTMENT_POLICY_LIMITS=Object.freeze({reserve:10000000,training:80000,vendors:24000,
  research:1250000,leadership:200000,staff:100,vendorPoints:4,trainingTarget:100});
const departmentRoles = () => Object.keys(SPECIALIST_ROLES);
const departmentCopy = value => JSON.parse(JSON.stringify(value));
const departmentWhole = value => Number.isSafeInteger(value) && value >= 0;
const departmentExact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join() === [...keys].sort().join();
function defaultDepartmentPolicy() {
  return { reserve: 500000, envelopes: { training: Object.fromEntries(departmentRoles().map(k=>[k,80000])),
    vendors: 24000, research: 250000, leadership: 40000 },
    mandate: { mode:'manual', staffLimit:2, vendorLimit:4, salesFloor:1, training:false, trainingTarget:60 } };
}
function defaultDepartmentPlan(p) {
  return { departmentPolicy: departmentCopy(p.departmentOffice?.policy || defaultDepartmentPolicy()),
    leaderOrders: Object.fromEntries(departmentRoles().map(k=>[k,null])) };
}
function validateDepartmentPolicy(policy) {
  if (!departmentExact(policy,['reserve','envelopes','mandate']) || !departmentWhole(policy.reserve) || policy.reserve>10000000 ||
      !departmentExact(policy.envelopes,['training','vendors','research','leadership']) ||
      !departmentExact(policy.envelopes.training,departmentRoles()) ||
      Object.values(policy.envelopes.training).some(n=>!departmentWhole(n)||n>80000) ||
      !departmentWhole(policy.envelopes.vendors) || policy.envelopes.vendors>24000 ||
      !departmentWhole(policy.envelopes.research) || policy.envelopes.research>1250000 ||
      !departmentWhole(policy.envelopes.leadership) || policy.envelopes.leadership>200000)
    throw Error('Invalid departmental envelopes or common cash reserve.');
  const m=policy.mandate;
  if (!departmentExact(m,['mode','staffLimit','vendorLimit','salesFloor','training','trainingTarget']) ||
      !['manual','maintain-service'].includes(m.mode) || !departmentWhole(m.staffLimit) || m.staffLimit>100 ||
      !departmentWhole(m.vendorLimit) || m.vendorLimit>4 || !departmentWhole(m.salesFloor) || m.salesFloor>100 ||
      typeof m.training!=='boolean' || !departmentWhole(m.trainingTarget) || m.trainingTarget>100)
    throw Error('Invalid bounded departmental mandate.');
  return policy;
}
function initializeDepartments(g) {
  if(![4,5].includes(g.financialGroupVersion))return;
  g.departmentEconomy={version:1,month:0,supplier:GroupAccounting.opening('department:providers'),paid:0};
  for(const p of g.players) {
    if(p.accounting.version!==3)p.accounting=AccountingPrototype.withPayables(p.accounting);
    syncAccounts(p);
    p.departmentOffice={version:1,lastCycle:0,sequence:0,policy:defaultDepartmentPolicy(),
      leaders:Object.fromEntries(departmentRoles().map(k=>[k,null])),
      arrears:Object.fromEntries(departmentRoles().map(k=>[k,0])),paid:0,history:[],report:null};
  }
}
function departmentLeadershipQuote(p, plan) {
  if(!p.departmentOffice)return {salary:0,appointments:0,severance:0,total:0,rows:[]};
  const orders=plan.leaderOrders || defaultDepartmentPlan(p).leaderOrders;
  const rows=departmentRoles().map(role=>{
    const old=p.departmentOffice.leaders[role],order=orders[role];
    const changing=order!==null && (order==='none'?!!old:old?.profile!==order);
    const next=changing?(order==='none'?null:order):old?.profile || null;
    return {role,profile:next,salary:next?DEPARTMENT_LEADERS[next].salary:0,
      appointment:changing&&next?DEPARTMENT_LEADERS[next].appointment:0,
      severance:changing&&old?DEPARTMENT_LEADERS[old.profile].salary:0,
      arrears:p.departmentOffice.arrears[role]};
  });
  const salary=rows.reduce((n,r)=>n+r.salary,0),appointments=rows.reduce((n,r)=>n+r.appointment,0),severance=rows.reduce((n,r)=>n+r.severance,0);
  return {salary,appointments,severance,total:salary+appointments+severance,rows};
}
function normalizeDepartmentPlan(p, plan) {
  if(!p.departmentOffice) {
    if(plan.departmentPolicy!==undefined||plan.leaderOrders!==undefined)throw Error('Department offices require Group 4 rules.');
    return;
  }
  const defaults=defaultDepartmentPlan(p);
  if(plan.departmentPolicy===undefined)plan.departmentPolicy=defaults.departmentPolicy;
  if(plan.leaderOrders===undefined)plan.leaderOrders=defaults.leaderOrders;
  validateDepartmentPolicy(plan.departmentPolicy);
  if(!departmentExact(plan.leaderOrders,departmentRoles()) || Object.values(plan.leaderOrders).some(k=>
    k!==null && k!=='none' && !Object.hasOwn(DEPARTMENT_LEADERS,k)))throw Error('Invalid department leader instructions.');
  for(const [role,order]of Object.entries(plan.leaderOrders))if(order!==null&&order!=='none'&&order!==p.departmentOffice.leaders[role]?.profile) {
    if(!p.workforce?.departments[role]?.count || (plan.allocation||p.allocation)[role]<1)
      throw Error('Promote an existing qualified banker assigned to that department; leaders do not create staff.');
  }
  const quote=departmentLeadershipQuote(p,plan),policy=plan.departmentPolicy;
  const planned=planBudget(p,plan),otherCommitments=Math.max(0,planned.total-(planned.departmentLeadership||0));
  // Existing compensation obligations survive budget cuts. A new appointment
  // requires protected cash/capital; demotion may accrue its explicit severance.
  if(quote.appointments && (quote.total>policy.envelopes.leadership ||
      quote.total+otherCommitments>Math.max(0,Math.min(p.stats.cash-policy.reserve,pilotSpendingLimit(p)))))
    throw Error('Leadership appointment exceeds its envelope or protected bank funds.');
  const research=Object.values(plan.investments||{}).reduce((n,x)=>n+x,0);
  if(research>policy.envelopes.research)throw Error('Research instructions exceed the departmental envelope.');
  if((plan.servicePolicy?.outsourcing||0)*6000>policy.envelopes.vendors)
    throw Error('Service outsourcing exceeds the departmental envelope.');
}
function departmentHistory(p, item) {
  p.departmentOffice.history.push(item);
  if(p.departmentOffice.history.length>24)p.departmentOffice.history.shift();
}
function departmentInvoice(p, supplier, role, amount, source) {
  if(!amount)return supplier;
  p.accounting=AccountingPrototype.post(p.accounting,source,{payables:amount,equity:-amount},-amount);
  p.departmentOffice.arrears[role]+=amount;
  return GroupAccounting.post(supplier,source,p.id+':'+role,{businessAssets:amount,equity:amount},amount);
}
function departmentSettlePlayer(p, plan, cycle, supplier) {
  const office=p.departmentOffice,policy=plan.departmentPolicy;
  office.policy=departmentCopy(policy);
  // Submission is not a promise of post-event liquidity. A discretionary new
  // appointment may be deferred; existing wages and instructed severance remain
  // contractual claims and are never waived or financed by manager borrowing.
  const proposed=departmentLeadershipQuote(p,plan);
  if(proposed.appointments){
    const appointmentFunded=proposed.total<=policy.envelopes.leadership&&
      proposed.total<=Math.max(0,Math.min(p.stats.cash-policy.reserve,pilotSpendingLimit(p)));
    const orders={...plan.leaderOrders};
    for(const role of departmentRoles())if(orders[role]!==null&&orders[role]!=='none'&&orders[role]!==office.leaders[role]?.profile&&
        (!appointmentFunded||!p.workforce.departments[role].count||(plan.allocation||p.allocation)[role]<1))orders[role]=null;
    plan={...plan,leaderOrders:orders};
  }
  const quote=departmentLeadershipQuote(p,plan),rows=[];
  for(const row of quote.rows) {
    const old=office.leaders[row.role],order=plan.leaderOrders[row.role];
    const change=order!==null && (order==='none'?!!old:old?.profile!==order);
    if(change) {
      if(old)departmentHistory(p,{cycle,role:row.role,id:old.id,profile:old.profile,experience:old.experience,event:'demoted'});
      office.leaders[row.role]=row.profile?{id:p.id+':leader:'+ ++office.sequence,profile:row.profile,
        appointed:cycle,experience:0,classes:0,compensation:0}:null;
      if(row.profile)departmentHistory(p,{cycle,role:row.role,id:office.leaders[row.role].id,profile:row.profile,experience:0,event:'appointed'});
    }
    supplier=departmentInvoice(p,supplier,row.role,row.appointment,'department.appointment');
    supplier=departmentInvoice(p,supplier,row.role,row.severance,'department.severance');
    supplier=departmentInvoice(p,supplier,row.role,row.salary,'department.compensation');
    rows.push({...row,expense:row.appointment+row.severance+row.salary,paid:0,teaching:false,trainingGain:0,trainingSpend:0});
  }
  // All old/new due claims rank equally. Pro-rata integer settlement and rotating
  // remainders avoid silently favoring the first department when cash is scarce.
  const claims=departmentRoles().map(k=>office.arrears[k]),total=claims.reduce((a,b)=>a+b,0);
  const available=Math.min(p.accounting.accounts.cash,total),payments=claims.map(n=>total?Math.floor(n*available/total):0);
  let remainder=available-payments.reduce((a,b)=>a+b,0);
  const order=departmentRoles().map((_,i)=>i).sort((a,b)=>(claims[b]*available%total)-(claims[a]*available%total)||((a+cycle)%4)-((b+cycle)%4));
  for(const i of order)if(remainder-->0)payments[i]++;
  p._departmentTeaching={};
  for(const [i,role]of departmentRoles().entries()) {
    const amount=payments[i];
    if(amount) {
      p.accounting=AccountingPrototype.post(p.accounting,'department.invoicePaid',{cash:-amount,payables:-amount});
      supplier=GroupAccounting.post(supplier,'department.invoicePaid',p.id+':'+role,{cash:amount,businessAssets:-amount});
      office.arrears[role]-=amount;office.paid+=amount;
    }
    rows[i].paid=amount;
    const leader=office.leaders[role];
    if(leader)leader.compensation+=Math.min(rows[i].salary,Math.max(0,amount-rows[i].arrears-rows[i].appointment-rows[i].severance));
    p._departmentTeaching[role]=!!leader && office.arrears[role]===0;
  }
  syncAccounts(p);
  office.report={cycle,expense:quote.total,paid:available,arrears:office.arrears&&Object.values(office.arrears).reduce((a,b)=>a+b,0),rows};
  return supplier;
}
function settleDepartmentLeadership(g, plans) {
  if(![4,5].includes(g.financialGroupVersion))return [];
  const e=g.departmentEconomy;
  if(e.month!==g.cycle-1)throw Error('Department compensation already settled.');
  for(const [i,p]of g.players.entries()) {
    e.supplier=departmentSettlePlayer(p,plans[i],g.cycle,e.supplier);
    e.paid+=p.departmentOffice.report.paid;
  }
  e.month=g.cycle;
  return []; // Detailed costs/instructions remain in owner-only reports/ledger.
}
function departmentProspectiveOwner(p, input) {
  if(!p.departmentOffice)return departmentCopy(p);
  const plan=departmentCopy(input);
  normalizeDepartmentPlan(p,plan);
  return departmentPreparedOwner(p,plan);
}
// Internal forecast composition: the complete draft was validated against its
// opening owner before other proposed transactions consumed their cash. Do not
// reserve those same transactions again against this already-debited clone.
function departmentPreparedOwner(p, plan) {
  const owner=departmentCopy(p);
  const arrears=Object.values(owner.departmentOffice.arrears).reduce((a,b)=>a+b,0);
  let supplier=GroupAccounting.opening('department:providers');
  if(arrears)supplier=GroupAccounting.post(supplier,'projection.openingClaims',p.id,{businessAssets:arrears,equity:arrears});
  departmentSettlePlayer(owner,plan,owner.departmentOffice.lastCycle+1,supplier);
  if(plan.allocation)owner.allocation={...plan.allocation};
  if(plan.workforcePolicy)owner.workforce.policy=departmentCopy(plan.workforcePolicy);
  return owner;
}
function departmentPlanOperatingQuote(p,input,base) {
  const plan={...defaultDepartmentPlan(p),...input};
  validateDepartmentPolicy(plan.departmentPolicy);
  if(!departmentExact(plan.leaderOrders,departmentRoles())||Object.values(plan.leaderOrders).some(k=>
      k!==null&&k!=='none'&&!Object.hasOwn(DEPARTMENT_LEADERS,k)))throw Error('Invalid department leader instructions.');
  const cost=p.facilityNetwork?facilityDraftSpend(p,plan):0,
    owner=departmentPreparedOwner(p.facilityNetwork?facilityProspectiveOwner(p,plan):p,plan);
  const training=workforceTrainingQuote(owner,plan.workforcePolicy||p.workforce.policy,
    Math.max(0,base-cost-departmentLeadershipQuote(p,plan).total));
  owner._workforceCosts={training};
  return {owner,training};
}
function departmentPlanTrainingQuote(p,input,base) {
  return departmentPlanOperatingQuote(p,input,base).training;
}
function departmentTeacherEligible(p, role, policy=p.workforce?.policy, allocation=p.allocation) {
  if(!p.departmentOffice||!p._departmentTeaching?.[role]||!p.departmentOffice.leaders[role])return false;
  const row=p.workforce?.departments[role];
  return !!row && row.count>=2 && row.skill<100 && allocation[role]>=1 &&
    Math.min(policy.training[role],p.departmentOffice.policy.envelopes.training[role])>=row.count*SPECIALIST_TRAINING_COST;
}
function departmentTeachingActive(p, role, policy=p.workforce?.policy, allocation=p.allocation) {
  if(!departmentTeacherEligible(p,role,policy,allocation))return false;
  // Early service/credit calculations can precede the operating coordinator's
  // cached quote. Compute the same funded classes then, rather than withdrawing
  // a teacher for a class that liquidity has already paused. Training-row
  // construction uses physical eligibility only, so this cannot recurse.
  const training=p._departmentTraining||p._workforceCosts?.training||workforceOperatingCosts(p).training;
  return !training.paused&&training.rows.some(row=>row.role===role&&row.spend>0);
}
function departmentTrainingRows(p, policy, original) {
  if(!p.departmentOffice)return original;
  return original.map(row=>{
    const unit=row.count*SPECIALIST_TRAINING_COST,leader=p.departmentOffice.leaders[row.role];
    const teaching=departmentTeacherEligible(p,row.role,policy);
    const maximum=teaching?Math.min(8,DEPARTMENT_LEADERS[leader.profile].gains[row.role]+Math.floor(leader.experience/40)):SPECIALIST_MAX_GAIN;
    const gain=unit?Math.max(0,Math.min(maximum,100-row.skill,
      Math.floor(Math.min(policy.training[row.role],p.departmentOffice.policy.envelopes.training[row.role])/unit))):0;
    return {...row,gain,spend:gain*unit};
  });
}
function departmentProductiveAllocation(p, allocation=p.allocation) {
  if(!p.departmentOffice)return allocation;
  return Object.fromEntries(Object.entries(allocation).map(([role,count])=>
    [role,Math.max(0,count-(departmentTeachingActive(p,role,p.workforce.policy,allocation)?1:0))]));
}
function departmentDeliveryAllocation(p, staff) {
  const total=p.allocation.business,rawService=Math.min(total,staff),rawSales=Math.max(0,total-rawService);
  const teacher=departmentTeachingActive(p,'business')?1:0;
  return {total:total-teacher,sales:Math.max(0,rawSales-teacher),service:rawService-Math.max(0,teacher-rawSales)};
}
function settleDepartmentExperience(g, p) {
  if(!p.departmentOffice)return;
  const office=p.departmentOffice;
  if(office.lastCycle>=g.cycle)return;
  for(const row of office.report.rows) {
    const role=row.role,leader=office.leaders[role],spend=p.operatingReport?.['trainingSpend_'+role]||0;
    const gain=p.operatingReport?.['trainingGain_'+role]||0;
    // Workforce settlement may already have brought the team's skill to 100.
    // Do not erase that final delivered class by re-evaluating its future need.
    row.teaching=!!leader&&!!p._departmentTeaching?.[role]&&p.workforce.departments[role].count>=2&&
      p.allocation[role]>=1&&spend>0&&gain>0;
    row.trainingGain=gain;row.trainingSpend=spend;
    if(leader&&row.teaching){leader.experience=Math.min(1000,leader.experience+gain);leader.classes++;}
  }
  office.lastCycle=g.cycle;delete p._departmentTeaching;delete p._departmentTraining;
}
function addDepartmentOperatingReport(p) {
  if(!p.departmentOffice||!p.operatingReport||p.operatingReport.departmentExpense!==undefined)return;
  // These obligations already reduced bank retained earnings when invoiced.
  // Only reconcile the displayed monthly result here; do not post them again.
  const expense=p.departmentOffice.report.expense;
  p.operatingReport.departmentExpense=expense;
  p.operatingReport.expense+=expense;
  p.operatingReport.profit-=expense;
  p.stats.lastProfit-=expense;
  if(p.marketReport){p.marketReport.central-=expense;p.marketReport.profit-=expense;}
}
function departmentBudgetQuote(p,input) {
  if(!p.departmentOffice)return null;
  const plan=departmentCopy(input);normalizeDepartmentPlan(p,plan);
  const network=p.facilityNetwork?facilityProspectiveOwner(p,plan):p,
    prospective=departmentPreparedOwner(network,plan),leadership=departmentLeadershipQuote(p,plan),budget=planBudget(p,plan);
  const remaining=Math.max(0,budget.total-(budget.training||0)-leadership.total-(p.facilityNetwork?facilityDraftSpend(p,plan):0));
  const training=workforceTrainingQuote(prospective,plan.workforcePolicy||p.workforce.policy,remaining);
  prospective._workforceCosts={training};
  const research=Object.values(plan.investments||{}).reduce((n,x)=>n+x,0),vendors=(plan.servicePolicy?.outsourcing||0)*6000;
  return {policy:departmentCopy(plan.departmentPolicy),leadership,training,research,vendors,
    productiveAllocation:departmentProductiveAllocation(prospective,plan.allocation||p.allocation),
    reserve:plan.departmentPolicy.reserve,projectedCash:prospective.stats.cash,
    paused:prospective.departmentOffice.report.arrears>0,
    rows:departmentRoles().map(role=>({role,staff:(plan.allocation||p.allocation)[role],specialists:p.workforce.departments[role].count,
      leader:departmentCopy(prospective.departmentOffice.leaders[role]),arrears:prospective.departmentOffice.arrears[role],
      teaching:departmentTeachingActive(prospective,role),
      productiveSpecialists:Math.min(Math.max(0,p.workforce.departments[role].count-(departmentTeachingActive(prospective,role)?1:0)),
        departmentProductiveAllocation(prospective)[role]),
      bonus:specialistBonus(prospective,role),training:training.rows.find(r=>r.role===role)}))};
}
function departmentDraft(p,input,economy) {
  const plan=departmentCopy(input),notes=[];
  if(!p.departmentOffice)return {plan,notes};
  if(plan.departmentPolicy===undefined)plan.departmentPolicy=defaultDepartmentPlan(p).departmentPolicy;
  if(plan.leaderOrders===undefined)plan.leaderOrders=defaultDepartmentPlan(p).leaderOrders;
  validateDepartmentPolicy(plan.departmentPolicy);
  const policy=plan.departmentPolicy,m=policy.mandate;
  if(m.mode==='maintain-service') {
    const delegated=departmentCopy(plan);
    delegated.management.delivery={mode:'inhouse',staffLimit:m.staffLimit,
      vendorLimit:Math.min(m.vendorLimit,Math.floor(policy.envelopes.vendors/6000)),salesFloor:m.salesFloor};
    delegated.management.research.reserve=Math.max(delegated.management.research.reserve,policy.reserve);
    delegated.management.research.budget=Math.min(delegated.management.research.budget,policy.envelopes.research);
    const prepared=managementPlan(p,delegated,economy);
    // Retain only permitted proposals, never rewrite the player's persistent
    // management preferences, manual bids, borrowing, hires or facility orders.
    plan.servicePolicy=prepared.plan.servicePolicy;plan.investments=prepared.plan.investments;
    notes.push(...prepared.notes);
  }
  if(m.training)for(const role of departmentRoles()) {
    const d=p.workforce.departments[role];
    const ceiling=d.count&&d.skill<m.trainingTarget?policy.envelopes.training[role]:0;
    plan.workforcePolicy.training[role]=Math.max(...WORKFORCE_TRAINING_BUDGETS.filter(n=>n<=ceiling));
    plan.workforcePolicy.reserve=Math.max(plan.workforcePolicy.reserve,policy.reserve);
  }
  normalizeDepartmentPlan(p,plan);
  return {plan,notes};
}
function planDepartments(g,index,input) {
  if(![4,5].includes(g.financialGroupVersion))return input;
  const p=g.players[index],plan=departmentCopy(input);
  Object.assign(plan,defaultDepartmentPlan(p));
  plan.departmentPolicy.envelopes.research=Math.max(plan.departmentPolicy.envelopes.research,
    Object.values(plan.investments||{}).reduce((a,b)=>a+b,0));
  plan.departmentPolicy.envelopes.vendors=Math.max(plan.departmentPolicy.envelopes.vendors,(plan.servicePolicy?.outsourcing||0)*6000);
  if(g.cycle%6===0&&p.stats.lastProfit>120000) {
    const role=departmentRoles().find(k=>!p.departmentOffice.leaders[k]&&p.workforce.departments[k].count>=3&&plan.allocation[k]>=2&&p.workforce.departments[k].skill<70);
    if(role) {
      const profile=['service','business'].includes(role)?'delivery':'controls';
      const quote=DEPARTMENT_LEADERS[profile];
      if(p.stats.cash-plan.departmentPolicy.reserve>quote.appointment+quote.salary+100000)plan.leaderOrders[role]=profile;
    }
  }
  const proposed=departmentLeadershipQuote(p,plan),budget=planBudget(p,plan);
  const otherCommitments=Math.max(0,budget.total-(budget.departmentLeadership||0));
  const available=Math.max(0,Math.min(p.stats.cash-plan.departmentPolicy.reserve,pilotSpendingLimit(p)));
  if(proposed.appointments&&(proposed.total>plan.departmentPolicy.envelopes.leadership||proposed.total+otherCommitments>available))
    for(const role of departmentRoles())if(plan.leaderOrders[role]!==null&&plan.leaderOrders[role]!=='none'&&
        plan.leaderOrders[role]!==p.departmentOffice.leaders[role]?.profile)plan.leaderOrders[role]=null;
  normalizeDepartmentPlan(p,plan);return plan;
}
function validateDepartmentPlayer(p,month) {
  const d=p.departmentOffice;
  if(!departmentExact(d,['version','lastCycle','sequence','policy','leaders','arrears','paid','history','report']) || d.version!==1 ||
      d.lastCycle!==month || !departmentWhole(d.sequence) || !departmentWhole(d.paid) ||
      !departmentExact(d.leaders,departmentRoles()) || !departmentExact(d.arrears,departmentRoles()) ||
      Object.values(d.arrears).some(n=>!departmentWhole(n)) || !Array.isArray(d.history)||d.history.length>24 || p._departmentTeaching!==undefined||p._departmentTraining!==undefined)
    throw Error('Invalid persistent department office.');
  validateDepartmentPolicy(d.policy);
  if(p.accounting.version!==3||p.accounting.accounts.payables!==Object.values(d.arrears).reduce((a,b)=>a+b,0))
    throw Error('Department liabilities disagree with bank accounts.');
  const ids=new Set();
  for(const leader of Object.values(d.leaders))if(leader!==null) {
    if(!departmentExact(leader,['id','profile','appointed','experience','classes','compensation']) ||
        !Object.hasOwn(DEPARTMENT_LEADERS,leader.profile) || typeof leader.id!=='string'||!leader.id.startsWith(p.id+':leader:')||ids.has(leader.id)||
        !/^[1-9]\d*$/.test(leader.id.slice((p.id+':leader:').length))||Number(leader.id.slice((p.id+':leader:').length))>d.sequence||
        !departmentWhole(leader.appointed)||leader.appointed<1||leader.appointed>month||
        !departmentWhole(leader.experience)||leader.experience>1000||!departmentWhole(leader.classes)||!departmentWhole(leader.compensation))
      throw Error('Invalid department leader.');
    ids.add(leader.id);
  }
  for(const h of d.history)if(!departmentExact(h,['cycle','role','id','profile','experience','event'])||
      !departmentWhole(h.cycle)||h.cycle<1||h.cycle>month||!departmentRoles().includes(h.role)||
      typeof h.id!=='string'||!h.id.startsWith(p.id+':leader:')||!Object.hasOwn(DEPARTMENT_LEADERS,h.profile)||
      !departmentWhole(h.experience)||h.experience>1000||!['appointed','demoted'].includes(h.event))throw Error('Invalid department leadership history.');
  if(month===0){if(d.report!==null)throw Error('Unexpected opening department report.');}
  else {
    const r=d.report;
    if(!departmentExact(r,['cycle','expense','paid','arrears','rows']) || r.cycle!==month ||
        ['expense','paid','arrears'].some(k=>!departmentWhole(r[k])) || !Array.isArray(r.rows)||r.rows.length!==4 ||
        r.arrears!==Object.values(d.arrears).reduce((a,b)=>a+b,0))throw Error('Invalid department report.');
    for(const [i,row]of r.rows.entries())if(!departmentExact(row,['role','profile','salary','appointment','severance','arrears','expense','paid','teaching','trainingGain','trainingSpend']) ||
        row.role!==departmentRoles()[i]||row.profile!==null&&!Object.hasOwn(DEPARTMENT_LEADERS,row.profile)||
        ['salary','appointment','severance','arrears','expense','paid','trainingGain','trainingSpend'].some(k=>!departmentWhole(row[k]))||
        typeof row.teaching!=='boolean'||row.expense!==row.salary+row.appointment+row.severance)
      throw Error('Invalid departmental expense attribution.');
    if(r.expense!==r.rows.reduce((n,row)=>n+row.expense,0)||r.paid!==r.rows.reduce((n,row)=>n+row.paid,0))throw Error('Department totals do not reconcile.');
  }
}
function validateDepartmentSave(g) {
  if(![4,5].includes(g.financialGroupVersion)) {
    if(g.departmentEconomy!==undefined||g.players.some(p=>p.departmentOffice!==undefined||p._departmentTeaching!==undefined||p._departmentTraining!==undefined||p.submitted?.departmentPolicy!==undefined||p.submitted?.leaderOrders!==undefined)||
        Object.values(g.lastPlans||{}).some(plan=>plan?.departmentPolicy!==undefined||plan?.leaderOrders!==undefined))
      throw Error('Unversioned department offices.');
    return;
  }
  const e=g.departmentEconomy,month=g.gameOver?g.cycle:g.cycle-1;
  if(!departmentExact(e,['version','month','supplier','paid'])||e.version!==1||e.month!==month||!departmentWhole(e.paid))throw Error('Invalid department counterparties.');
  GroupAccounting.validate(e.supplier);
  if(e.supplier.entityId!=='department:providers'||['investments','debt','payables','custodyAssets','custodyLiabilities'].some(k=>e.supplier.accounts[k]))throw Error('Invalid department supplier accounts.');
  for(const p of g.players) {
    validateDepartmentPlayer(p,month);
    if(p.submitted)normalizeDepartmentPlan(p,departmentCopy(p.submitted));
  }
  if(e.supplier.accounts.cash!==e.paid||e.paid!==g.players.reduce((n,p)=>n+p.departmentOffice.paid,0)||
      e.supplier.accounts.businessAssets!==g.players.reduce((n,p)=>n+p.accounting.accounts.payables,0))throw Error('Department cash and claims do not reconcile.');
}
function projectDepartments(g,out,index) {
  if(![4,5].includes(g.financialGroupVersion))return;
  out.me.departmentOffice=departmentCopy(g.players[index].departmentOffice);
  delete out.rival.departmentOffice;
  const rival=g.players[1-index].id;
  if(out.lastPlans?.[rival]){delete out.lastPlans[rival].departmentPolicy;delete out.lastPlans[rival].leaderOrders;}
}
function validateDepartmentView(view) {
  if(![4,5].includes(view.financialGroupVersion)) {
    if(view.departmentEconomy!==undefined||view.me?.departmentOffice!==undefined||view.rival?.departmentOffice!==undefined||
        view.me?._departmentTeaching!==undefined||view.rival?._departmentTeaching!==undefined||view.me?._departmentTraining!==undefined||view.rival?._departmentTraining!==undefined||
        Object.values(view.lastPlans||{}).some(plan=>plan?.departmentPolicy!==undefined||plan?.leaderOrders!==undefined))throw Error('Unversioned department view.');
    return;
  }
  validateDepartmentPlayer(view.me,view.gameOver?view.cycle:view.cycle-1);
  if(view.departmentEconomy!==undefined||view.rival.departmentOffice!==undefined||view.rival._departmentTeaching!==undefined||view.rival._departmentTraining!==undefined||
      view.lastPlans?.[view.rival.id]?.departmentPolicy!==undefined||view.lastPlans?.[view.rival.id]?.leaderOrders!==undefined)
    throw Error('Private department instructions or counterparties exposed.');
}
