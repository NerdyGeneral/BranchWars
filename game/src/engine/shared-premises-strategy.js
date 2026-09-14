// Owner-visible, deterministic rival decisions. Not manager delegation: this
// planner never runs against a human draft or creates staff/funding/permissions.
function sharedPremisesStrategyReview(v,input){
 if(v.sharedPremisesVersion!==1)return {plan:input,reason:'Historical premises behavior unchanged.'};
 const p=v.me,book=p.sharedPremises.book,plan=premisesCopy(input),notes=[];
 plan.sharedPremisesPolicy=SharedPremises.defaultPlan();
 const office=id=>FacilityNetwork.office(p,id),busy=new Set(book.rooms.filter(r=>r.ready===null&&office(r.office)?.closedCycle===null).map(r=>office(r.office).market));
 const local=k=>PROJECTS[k]&&(PROJECTS[k].kind==='branch'||PROJECTS[k].regionalOnly);
 // Existing paid fit-out wins over newly proposed local construction. Only
 // this AI's fresh orders are changed; completed buildings are never erased.
 plan.newProjects=planInitiatives(plan).filter(k=>!local(k)||!busy.has(projectPlanTarget(plan,k)||plan.focus||p.focus));plan.newProject=plan.newProjects[0]||null;
 if(plan.projectTargets)plan.projectTargets=Object.fromEntries(Object.entries(plan.projectTargets).filter(([key])=>plan.newProjects.includes(key)));
 const convert=plan.facilityPolicy?.convert;
 if(convert){const host=office(convert.officeId);if(host){const space=SharedPremises.space(book,{...host,model:convert.model,legacySpace:p.facilityExtensions.offices[host.id]?1:0},v.cycle);
  if(busy.has(host.market)||space.used>space.total){plan.facilityPolicy.convert=null;notes.push('Retain the building supporting paid service space.');}}}
 if(busy.has(office(plan.facilityLifecyclePolicy?.renovate)?.market))plan.facilityLifecyclePolicy.renovate=null;
 const suite=office(plan.facilityExtensionPolicy?.start);
 if(suite){const space=SharedPremises.space(book,{...suite,legacySpace:1},v.cycle);if(busy.has(suite.market)||space.used>space.total)plan.facilityExtensionPolicy.start=null;}
 const initial=sharedPremisesPlanReview(v,p,plan);
 if(!initial.quote)return {plan,reason:initial.reason};
 const context=initial.context,investment=p.investmentBusiness,agency=p.agency,
  clients=p.investmentSnapshot.clients,companies=p.companySnapshot.world.companies,
  covers=p.agencySnapshot.relationships,focus=plan.focus||p.focus,
  investmentMarket=plan.investmentPolicy?.market||focus,target=plan.agencyPolicy?.target||agency.policy.target;
 const roles=['adviser','broker','propertyProducer','benefitsProducer','servicing'];
 const entity=role=>['adviser','broker'].includes(role)?investment.book.entityId:agency.book.entityId;
 const permission={adviser:'advice',broker:'brokerage',propertyProducer:'insuranceProperty',benefitsProducer:'insuranceBenefits',servicing:'insuranceService'};
 const investmentCosts=InvestmentInstitution.quote(investment,plan.investmentPolicy?.institution||InvestmentInstitution.defaults(investment),v.cycle);
 const floors={investment:investmentCosts.minimumCapital+3*investmentCosts.recurring,agency:3*(agencyProfessionalOperatingCost(p,plan.agencyPolicy||defaultAgencyPlan(p))+(plan.agencyPolicy?.outreach||0)*AGENCY_RULES.outreachCost)};
 const income={investment:(p.investmentSnapshot.performance?.fees||0)-(p.investmentSnapshot.performance?.providerCost||0)-(investment.report?.recurring||0),agency:(agency.report?.commission||0)-(agency.report?.expense||0)};
 const desired=(market,role)=>{
  if(['adviser','broker'].includes(role)){
   if(plan.investmentPolicy?.close||investment.status!=='active')return 0;
   const service=role==='adviser'?'advice':'brokerage',owned=clients.filter(c=>c.market===market&&c.service===service).length;
   // Local capacity reaches a second market; central delivery already reaches
   // the chosen main market. Household relationships are a signal, not a win.
   const prospect=plan.investmentPolicy?.pursue&&market!==investmentMarket?Object.values(p.householdBook.markets[market]||{}).reduce((n,x)=>n+x,0):0;
   return owned||prospect?Math.min(4,Math.max(1,Math.ceil((owned+Math.min(10,prospect/20))*4/InvestmentInstitution.ROLES[role].capacity))):0;
  }
  if(agency.status!=='active')return 0;
  const products=AGENCY_PROFESSIONAL_ROLES[role].products;
  const relevant=covers.filter(r=>companies.some(c=>c.id===r.companyId&&c.market===market&&!c.resolution)&&
   (r.owner===p.id||(role!=='servicing'&&market!==focus&&plan.agencyPolicy?.outreach>0&&r.product===target&&(r.owner===null||r.remaining<=1))));
  if(role==='servicing')return relevant.some(r=>r.owner===p.id)?1:0;
  return relevant.some(r=>products.includes(r.product))?2:0;
 };
 // Keep at least half of each profession central for existing clients, trades,
 // renewals and the main pursuit. Every local quarter is checked against the
 // same finite protected tenant time and operating cash as a human order.
 const limit=Object.fromEntries(roles.map(role=>{const t=context.tenants[entity(role)];return [role,t.permissions.includes(permission[role])?Math.floor((t.available[role]||0)/2):0];}));
 const assign=(room,role,amount)=>{
  for(let quarters=amount;quarters>0;quarters--){
   const row={room:room.id,entity:entity(role),role,quarters},candidate=premisesCopy(plan);candidate.sharedPremisesPolicy.allocations.push(row);
   const quote=sharedPremisesPlanReview(v,p,candidate);
   if(quote.eligible&&quote.tenants.every(t=>t.invoice<=t.cash)&&!quote.notices.length){plan.sharedPremisesPolicy=candidate.sharedPremisesPolicy;limit[role]-=quarters;return true;}
  }return false;
 };
 for(const room of book.rooms.slice().sort((a,b)=>a.id-b.id)){
  const host=context.offices.find(o=>o.id===room.office);
  if(!host||host.closed||host.condition<6500||room.ready===null||room.ready>v.cycle)continue;
  for(const role of roles.filter(k=>SharedPremises.CATALOG[room.kind].roles.includes(k))){
   const used=plan.sharedPremisesPolicy.allocations.filter(a=>a.room===room.id).reduce((n,a)=>n+a.quarters,0);
   assign(room,role,Math.min(limit[role],desired(host.market,role),SharedPremises.CATALOG[room.kind].seats-used));
  }
 }
 const allocationReview=sharedPremisesPlanReview(v,p,plan);
 if(!allocationReview.eligible)return {plan,reason:allocationReview.reason};
 if(book.rooms.some(r=>r.ready===null)||v.cycle%6!==0||p.stats.lastProfit<=0||tierRank(p)>=1||plan.capitalAction)
  return {plan,reason:'Maintain affordable qualified local work; no new fit-out this month.'};
 const candidates=[];
 for(const host of context.offices.filter(o=>!o.closed&&!o.busy&&o.condition>=8000)){
  const wants=Object.fromEntries(roles.map(role=>[role,Math.min(limit[role],desired(host.market,role))]));
  if(book.rooms.some(r=>r.office===host.id&&r.kind!=='additionalPremises'))continue;
  const investmentNeed=wants.adviser+wants.broker,agencyNeed=wants.propertyProducer+wants.benefitsProducer;
  const key=investmentNeed&&agencyNeed?'advisoryWing':agencyNeed?'agency':wants.broker||wants.adviser>1?'wealth':wants.adviser?'visiting':null;
  if(!key)continue;const d=SharedPremises.CATALOG[key];
  if(investmentNeed&&context.tenants[investment.book.entityId].cash<floors.investment+d.upkeep*1.12*12||agencyNeed&&context.tenants[agency.book.entityId].cash<floors.agency+d.upkeep*1.12*12)continue;
  // Construction is justified only by recorded business earnings and a year's
  // outside upkeep remaining after all commitments. No expected deposits,
  // customer assets or proposed dividends are treated as available cash.
  const relevantIncome=(investmentNeed?income.investment:0)+(agencyNeed?income.agency:0);
  if(relevantIncome<d.upkeep*2)continue;
  const candidate=premisesCopy(plan);candidate.sharedPremisesPolicy.build={office:host.id,kind:key};
  const q=sharedPremisesPlanReview(v,p,candidate);
  if(!q.eligible||q.notices.length||q.budget.cashAvailable-q.budget.construction-q.budget.outsideCost<d.upkeep*1.12*12)continue;
  candidates.push({plan:candidate,value:investmentNeed+agencyNeed,cost:d.cost,office:host.id,kind:key});
 }
 candidates.sort((a,b)=>b.value-a.value||a.cost-b.cost||a.office.localeCompare(b.office));
 const chosen=candidates[0];
 return {plan:chosen?.plan||plan,reason:chosen?'Fund '+SharedPremises.CATALOG[chosen.kind].name+' from recorded earnings to extend existing qualified delivery.':notes.join(' ')||'Use existing rooms; no profitable, funded extension meets the current workload.'};
}
function planSharedPremises(g,index,plan){
 if(g.sharedPremisesVersion!==1)return plan;
 return sharedPremisesStrategyReview(root.BWEngine.publicState(g,index),plan).plan;
}
