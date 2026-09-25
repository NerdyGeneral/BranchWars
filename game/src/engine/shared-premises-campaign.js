// Explicit 9.27 campaign boundary. Historical campaigns acquire no new books.
// The existing facility supplier receives outside payments and circulates them.
const PREMISES_TOTALS=Object.freeze(['construction','outsidePaid','agencyRent','investmentRent','agencyLoss','investmentLoss']);
const premisesCopy=x=>JSON.parse(JSON.stringify(x));
function initializeSharedPremises(g,o){
 if(o.sharedPremisesVersion!==1)return;
 if(g.companyControlStrategyVersion!==1)throw Error('Shared premises require the complete Expanded foundation.');
 g.sharedPremisesVersion=1;
 g.ledgerVersion=1;
 for(const p of g.players)p.sharedPremises={book:SharedPremises.opening(),policy:SharedPremises.defaultPlan(),totals:Object.fromEntries(PREMISES_TOTALS.map(k=>[k,0])),unavailable:[]};
}
function sharedPremisesTotal(g,key){
 if(g.sharedPremisesVersion!==1)return 0;
 const n=g.players.reduce((n,p)=>n+(p.sharedPremises?.totals?.[key]??NaN),0);
 if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid shared-premises transfer total.');return n;
}
function sharedPremisesCommitment(p,plan={}){
 if(!p.sharedPremises)return {cost:0,capacity:0};
 const s=p.sharedPremises,o=plan.sharedPremisesPolicy||s.policy;
 const build=o.build&&SharedPremises.CATALOG[o.build.kind];
 return {cost:build?.cost||0,capacity:(build?.execution||0)+s.book.rooms.filter(r=>r.ready===null&&r.id!==o.cancel&&FacilityNetwork.office(p,r.office)?.closedCycle===null).reduce((n,r)=>n+SharedPremises.CATALOG[r.kind].execution,0)};
}
function sharedPremisesOffices(p,plan={}){
 const local=k=>PROJECTS[k]&&(PROJECTS[k].kind==='branch'||PROJECTS[k].regionalOnly);
 const busy=new Set([...facilityExtensionBusyMarkets(p,plan),...p.projects.filter(x=>local(x.key)).map(x=>x.target),...planInitiatives(plan).filter(local).map(k=>projectPlanTarget(plan,k)||plan.focus||p.focus)]);
 for(const id of [plan.facilityPolicy?.convert?.officeId,plan.facilityLifecyclePolicy?.renovate]){const o=FacilityNetwork.office(p,id);if(o)busy.add(o.market);}
 return p.facilityNetwork.offices.map(o=>{const r=p.facilityLifecycle.records[o.id];return {id:o.id,model:o.model,market:o.market,closed:o.closedCycle!==null,condition:r.conditionBp,maintenance:plan.facilityLifecyclePolicy?.offices?.[o.id]?.maintenance??r.maintenance,
  legacySpace:p.facilityExtensions?.offices[o.id]||plan.facilityExtensionPolicy?.start===o.id?1:0,busy:busy.has(o.market)||!!o.conversion||!!r.renovation};});
}
function sharedPremisesTenants(p,plan,cycle,prepared=false){
 const a=p.agency,e=p.investmentBusiness,ap=plan.agencyPolicy||defaultAgencyPlan(p),ip=plan.investmentPolicy?.institution||InvestmentInstitution.defaults(e);
 const aq=prepared?null:agencyProfessionalQuote(p,ap,cycle),status=prepared?agencyDelivery(p,cycle):aq;
 const staff=prepared?a.professionals.employees:aq.state.employees,renewed=prepared?a.professionals.report?.renewed||[]:aq.renewed;
 const agencyAvailable=Object.fromEntries(SharedPremises.roles.map(k=>[k,0]));
 if((a.status==='active'||!prepared&&ap.launch)&&status.phase==='authorized')for(const worker of staff){const d=AGENCY_PROFESSIONAL_ROLES[worker.role];if(!d.credential||worker.credentialThrough>=cycle)agencyAvailable[worker.role]+=renewed.includes(worker.id)?3:4;}
 const iq=prepared?null:InvestmentInstitution.quote(e,ip,cycle),permissions=prepared?e.report?.permitted:iq.permissions;
 const allowed=[];if(permissions?.advice)allowed.push('advice');if(permissions?.brokerage)allowed.push('brokerage');if(permissions?.available.operations&&e.status==='active'&&!e.book.accounts.payables)allowed.push('investmentOperations');
 const agencyPermissions=[];if(agencyAvailable.propertyProducer)agencyPermissions.push('insuranceProperty');if(agencyAvailable.benefitsProducer)agencyPermissions.push('insuranceBenefits');if(agencyAvailable.servicing)agencyPermissions.push('insuranceService');
 return {
  [a.book.entityId]:{cash:prepared?a.book.accounts.cash:Math.max(0,a.book.accounts.cash+ap.capital-aq.monthlyExpense-aq.recruitmentCost-aq.complianceExpense),available:agencyAvailable,permissions:agencyPermissions},
  [e.book.entityId]:{cash:prepared?e.book.accounts.cash:Math.max(0,e.book.accounts.cash+ip.capital-iq.total),available:Object.fromEntries(SharedPremises.roles.map(k=>[k,permissions?.available[k]||0])),permissions:allowed}
 };
}
function sharedPremisesContext(g,p,plan,prepared=false){
 const own=sharedPremisesCommitment(p,plan),budget=prepared?null:planBudget(p,plan,g),protectedBudget=prepared?null:facilityLifecycleProtectedBudget(p,plan,budget,g);
 const reserve=Math.max(plan.workforcePolicy?.reserve??p.workforce?.policy.reserve??0,plan.departmentPolicy?.reserve??p.departmentOffice?.policy.reserve??0);
 return {month:g.cycle,cash:prepared?Math.max(0,Math.floor(p.accounting.accounts.cash-reserve)):Math.max(0,Math.floor(protectedBudget.remaining+own.cost)),
  execution:prepared?Math.max(0,p._premisesExecutionAvailable??0):Math.max(0,budget.freeCapacity+own.capacity),offices:sharedPremisesOffices(p,plan),tenants:sharedPremisesTenants(p,plan,g.cycle,prepared)};
}
function sharedPremisesPolicyShape(p,o){
 if(!o||Object.keys(o).sort().join()!=='allocations,build,cancel,remove'||!Array.isArray(o.allocations)||o.allocations.length>4096)throw Error('Invalid shared-office instructions.');
 const seen=new Set(),seats={};
 for(const a of o.allocations){
  const room=p.sharedPremises.book.rooms.find(r=>r.id===a?.room),key=a?.room+'|'+a?.entity+'|'+a?.role;
  if(!a||Object.keys(a).sort().join()!=='entity,quarters,role,room'||!Number.isSafeInteger(a.quarters)||a.quarters<1||!SharedPremises.roles.includes(a.role)||![p.agency.book.entityId,p.investmentBusiness.book.entityId].includes(a.entity)||!room||room.ready===null||!SharedPremises.CATALOG[room.kind].roles.includes(a.role)||seen.has(key)||
   (a.entity===p.agency.book.entityId?!Object.hasOwn(AGENCY_PROFESSIONAL_ROLES,a.role):!['adviser','broker','operations'].includes(a.role)))throw Error('Shared office staffing must reference your own identified room and qualified entity.');
  seen.add(key);seats[a.room]=(seats[a.room]||0)+a.quarters;if(seats[a.room]>SharedPremises.CATALOG[room.kind].seats)throw Error('Standing office time exceeds physical room seats.');
 }
}
function normalizeSharedPremisesPlan(g,p,plan){
 if(!p.sharedPremises){if(plan.sharedPremisesPolicy!==undefined)throw Error('Unversioned shared-office instruction.');return;}
 const o=premisesCopy(plan.sharedPremisesPolicy||p.sharedPremises.policy);sharedPremisesPolicyShape(p,o);
 const c=sharedPremisesContext(g||{cycle:p.facilityLifecycle.lastActivatedCycle},p,plan);
 const standing=JSON.stringify(o.allocations)===JSON.stringify(p.sharedPremises.policy.allocations);
 // A saved staffing policy can outlive an employee or operating permission.
 // New allocations must be feasible now; standing work is rechecked at delivery.
 const quoteOrder={...o,allocations:standing?[]:o.allocations};SharedPremises.review(p.sharedPremises.book,quoteOrder,c);
 if(o.build&&(tierRank(p)>=2||p.capitalRestriction>0||plan.capitalAction))throw Error('Restore bank capital standing before adding service premises.');
 const conversion=plan.facilityPolicy?.convert;
 if(conversion){const host=c.offices.find(x=>x.id===conversion.officeId);if(host){const changed={...host,model:conversion.model};const space=SharedPremises.space(p.sharedPremises.book,changed,c.month);if(space.used>space.total)throw Error('Remove excess service space before converting this office.');}}
 for(const r of p.sharedPremises.book.rooms)if(r.ready===null&&r.id!==o.cancel&&c.offices.find(x=>x.id===r.office)?.busy)throw Error('Complete or cancel shared fit-out before other construction in this market.');
 plan.sharedPremisesPolicy=o;
}
// Pure owner-facing quote. Uses the same protected budget, professional preparation
// and validation as submission. Unavailable standing work is reported, not repaired.
function sharedPremisesPlanReview(g,p,plan){
 if(!p.sharedPremises)return {eligible:false,reason:'Shared premises are not enabled in this saved campaign.'};
 const candidate=premisesCopy(plan),unavailable=[];
 try{
  normalizeSharedPremisesPlan(g,p,candidate);
  const context=sharedPremisesContext(g,p,candidate),policy=candidate.sharedPremisesPolicy,
    feasible={...policy,allocations:[]};
  for(const row of policy.allocations){try{SharedPremises.review(p.sharedPremises.book,{...feasible,allocations:[...feasible.allocations,row]},context);feasible.allocations.push(row);}
   catch(error){unavailable.push({room:row.room,entity:row.entity,role:row.role,reason:error.message});}}
  const quote=SharedPremises.review(p.sharedPremises.book,feasible,context),budget=planBudget(p,candidate,g);
  const tenants=Object.entries(context.tenants).map(([id,t])=>({id,name:id===p.agency.book.entityId?'Insurance agency':'Investment business',
   cash:t.cash,available:t.available,reserved:quote.reserved[id]||Object.fromEntries(SharedPremises.roles.map(k=>[k,0])),invoice:quote.tenantInvoices[id]||0}));
  const notices=unavailable.map(x=>'Room '+x.room+' · '+x.role+': '+x.reason);
  for(const t of tenants)if(t.invoice>t.cash)notices.push(t.name+' cannot fund the estimated occupancy invoice after its planned payroll and setup costs. Fund the business or reduce local assignments; unpaid rent can trigger wind-down.');
  if(quote.outsideCost+p.sharedPremises.book.externalDue>context.cash-quote.construction)notices.push('Bank cash cannot cover current premises costs. Local delivery will be suspended until the outside invoice can be funded.');
  return {eligible:!p.submitted&&!g.gameOver,reason:p.submitted?'Plan already submitted.':g.gameOver?'Campaign ended.':'',policy:premisesCopy(policy),context,quote,tenants,notices,
   budget:{construction:quote.construction,outsideCost:quote.outsideCost,unpaidOutside:p.sharedPremises.book.externalDue,
    tenantInvoices:tenants.reduce((n,t)=>n+t.invoice,0),bankExpense:quote.outsideCost-tenants.reduce((n,t)=>n+t.invoice,0),
    cashAvailable:context.cash,executionAvailable:context.execution,executionCommitted:quote.committed,totalPlanSpend:budget.total}};
 }catch(error){return {eligible:false,reason:error.message};}
}
function validateSharedPremisesOwner(p,cycle,ended){
 if(p._premisesExecutionAvailable!==undefined)throw Error('Unfinished shared-premises execution cannot be restored.');
 const s=p.sharedPremises,month=cycle-(ended?0:1);
 if(!s||Object.keys(s).sort().join()!=='book,policy,totals,unavailable'||!s.totals||Object.keys(s.totals).sort().join()!==PREMISES_TOTALS.slice().sort().join()||Object.values(s.totals).some(n=>!Number.isSafeInteger(n)||n<0)||!Array.isArray(s.unavailable)||s.unavailable.length>4097||s.unavailable.some(x=>typeof x!=='string'||x.length>300))throw Error('Invalid shared-premises ownership or transfer counters.');
 SharedPremises.validate(s.book);if(s.book.month!==month)throw Error('Shared-premises settlement clock does not match this campaign.');
 sharedPremisesPolicyShape(p,s.policy);if(s.policy.build!==null||s.policy.cancel!==null||s.policy.remove!==null)throw Error('Construction is a one-time instruction, not a standing shared-office policy.');
 for(const r of s.book.rooms)if(!FacilityNetwork.office(p,r.office))throw Error('Shared premises lost their owning office.');
 if(Object.keys(s.book.arrears).length)throw Error('Unpaid subsidiary rent requires paired wind-down before saving.');
 if(s.book.externalDue>p.accounting.accounts.payables)throw Error('Unpaid premises costs lost their bank liability.');
 for(const row of s.book.report?.delivery||[])if(!row||!s.book.rooms.some(r=>r.id===row.room&&r.office===row.office)||FacilityNetwork.office(p,row.office)?.market!==row.market||![p.agency.book.entityId,p.investmentBusiness.book.entityId].includes(row.entity)||!SharedPremises.roles.includes(row.role)||!Number.isSafeInteger(row.quarters)||row.quarters<1||!Number.isFinite(row.effectiveQuarters)||row.effectiveQuarters<0||row.effectiveQuarters>row.quarters)throw Error('Invalid private premises delivery receipt.');
}
function validateSharedPremises(g){
 if(g.sharedPremisesVersion!==1){if(g.sharedPremisesVersion!==undefined||g.players.some(p=>p.sharedPremises!==undefined||p.submitted?.sharedPremisesPolicy!==undefined)||Object.values(g.lastPlans||{}).some(p=>p.sharedPremisesPolicy!==undefined))throw Error('Unversioned shared premises.');return;}
 if(g.companyControlStrategyVersion!==1)throw Error('Shared premises lack their matching campaign foundation.');
 for(const p of g.players){validateSharedPremisesOwner(p,g.cycle,g.gameOver);if(p.submitted)normalizeSharedPremisesPlan(g,p,premisesCopy(p.submitted));}
}
function projectSharedPremises(g,out,index){
 if(g.sharedPremisesVersion!==1)return;
 out.sharedPremisesVersion=1;out.me.sharedPremises=premisesCopy(g.players[index].sharedPremises);delete out.rival.sharedPremises;
 if(out.lastPlans?.[out.rival.id])delete out.lastPlans[out.rival.id].sharedPremisesPolicy;
}
function validateSharedPremisesView(v){
 if(v.rival?.sharedPremises!==undefined||v.rival?.submitted?.sharedPremisesPolicy!==undefined||v.lastPlans?.[v.rival?.id]?.sharedPremisesPolicy!==undefined)throw Error('Private rival premises data exposed.');
 if(v.sharedPremisesVersion===1){if(v.companyControlStrategyVersion!==1)throw Error('Shared premises view lacks matching rules.');validateSharedPremisesOwner(v.me,v.cycle,v.gameOver);}
 else if(v.sharedPremisesVersion!==undefined||v.me?.sharedPremises!==undefined||v.me?.submitted?.sharedPremisesPolicy!==undefined||Object.values(v.lastPlans||{}).some(p=>p.sharedPremisesPolicy!==undefined))throw Error('Unversioned shared premises view.');
}
function settleSharedPremisesGroup(g,plans){
 if(g.sharedPremisesVersion!==1)throw Error('Shared-premises settlement requires its explicit campaign version.');
 if(g.players.some(p=>p.sharedPremises.book.month!==g.cycle-1))throw Error('Shared premises must settle once per month.');
 const lines=[];prepareAgencySettlement(g,plans);lines.push(...settleGroupCapital(g,plans));
 const request=investmentSettlementRequest(g,plans),prepared=InvestmentSettlement.prepare(request.input,request.policies.map(s=>s.institution),request.offers,request.options);
 g.investmentEconomy.parentCashNet+=request.input.parents.reduce((n,b,i)=>n+b.accounts.cash-prepared.parents[i].accounts.cash,0);
 g.players.forEach((p,i)=>{p.financialGroup.parent=prepared.parents[i];p.investmentBusiness=prepared.entities[i];});
 const sites=[],distress=[false,false];
 for(const [i,p]of g.players.entries()){
  const s=p.sharedPremises,requested=premisesCopy(plans[i].sharedPremisesPolicy||s.policy);s.policy={...SharedPremises.defaultPlan(),allocations:premisesCopy(requested.allocations)};s.unavailable=[];
  const c=sharedPremisesContext(g,p,plans[i],true),order={...requested,allocations:[]};
  try{const quote=SharedPremises.review(s.book,order,c);if(quote.construction>pilotSpendingLimit(p)||quote.construction&&(tierRank(p)>=2||p.capitalRestriction>0))throw Error('Current bank capital no longer supports new fit-out.');}catch(error){s.unavailable.push(('Fit-out not started: '+error.message).slice(0,300));order.build=null;order.cancel=null;order.remove=null;SharedPremises.review(s.book,order,c);}
  for(const a of requested.allocations){try{SharedPremises.review(s.book,{...order,allocations:[...order.allocations,a]},c);order.allocations.push(a);}catch(error){s.unavailable.push(('Room '+a.room+' '+a.role+': '+error.message).slice(0,300));}}
  // A removed room cannot retain a dangling standing instruction.
  if(order.remove!==null)s.policy.allocations=s.policy.allocations.filter(a=>a.room!==order.remove);
  const q=SharedPremises.review(s.book,order,c),oldBook=premisesCopy(s.book),a=p.agency,e=p.investmentBusiness;
  const paid=SharedPremises.settle(s.book,order,c,p.accounting,{[a.book.entityId]:a.book,[e.book.entityId]:e.book},g.facilityEconomy.supplier);
  s.book=paid.book;p.accounting=paid.bank;a.book=paid.tenants[a.book.entityId];e.book=paid.tenants[e.book.entityId];g.facilityEconomy.supplier=paid.supplier;
  s.totals.construction+=q.construction;s.totals.outsidePaid+=s.book.report.externalPaid;p.buildSpend=(p.buildSpend||0)+q.construction;
  delete p._premisesExecutionAvailable;
  for(const [tenant,key]of [[a,'agency'],[e,'investment']]){
   const id=tenant.book.entityId,owed=s.book.arrears[id]||0;s.totals[key+'Rent']+=(q.tenantInvoices[id]||0)+(oldBook.arrears[id]||0)-owed;
   if(owed){const exit=SharedPremises.releaseTenant(s.book,p.accounting,tenant.book);s.book=exit.book;p.accounting=exit.bank;tenant.book=exit.tenant;s.totals[key+'Rent']+=exit.paid;s.totals[key+'Loss']+=exit.writtenOff;
    if(key==='agency')agencyWindDown(g,p);else distress[i]=exit.writtenOff>0;
   }
  }
  if(e.report)e.report.permitted=InvestmentInstitution.permissionState(e,g.cycle,e.report.permitted.available);
  // Permission loss/default after the invoice suspends service, not the invoice.
  const delivery={...order,allocations:order.allocations.filter(x=>x.entity===a.book.entityId?a.status==='active':!distress[i]&&(x.role==='operations'?e.report?.permitted.available.operations:e.report?.permitted[x.role==='adviser'?'advice':'brokerage']))};
  sites.push({book:oldBook,plan:delivery,context:c});syncAccounts(p);
 }
 const network={version:1,month:g.cycle,sites};
 lines.push(...finishAgencySettlement(g,plans,network));
 lines.push(...settleInvestmentServices(g,plans,prepared,network,distress));
 return lines;
}
