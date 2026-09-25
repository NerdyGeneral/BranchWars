// Versioned servicing/activation correction, not a second customer book.
// Preserve the original left-to-right sum, including the optional offer work.
// Department workload, task dispatch and fee coverage must use the same units.
function commercialRelationshipWork(business,merchant,initial=0){return initial+business/80+merchant/150;}
const CommercialFeeEconomics=Object.freeze({
 quote(business,merchant,capacityQuarters){
  if(!Number.isSafeInteger(business)||business<0||!Number.isSafeInteger(merchant)||merchant<0||!Number.isFinite(capacityQuarters)||capacityQuarters<0)throw Error('Invalid commercial servicing inputs.');
  const workload=commercialRelationshipWork(business,merchant),served=Math.min(workload,capacityQuarters),coverage=workload?served/workload:1;
  return {business,merchant,workload,served,coverage,feeBase:(business*760+merchant*650)*coverage};
 }
});
function commercialOperatingService(p,allocation){
 if(p.commercialServiceVersion!==1)return null;
 // Expanded uses the existing paid, dispatched relationship task. Core has
 // no department desk: servicing automatically reserves part of its same
 // Business allocation, leaving only the remainder for selling this month.
 const capacity=p.departmentFunctions?departmentFunctionTaskFte(p,'commercialRelationships',0)*4:allocation.business*4,
  review=CommercialFeeEconomics.quote(p.stats.business,p.stats.merchant,capacity);
 if(!p.departmentFunctions)allocation.business=Math.max(0,allocation.business-review.served/4);
 return review;
}
function initializeCommercialService(g,o){
 if(o.commercialServiceVersion!==1)return;
 g.commercialServiceVersion=1;for(const p of g.players)p.commercialServiceVersion=1;
}
function validateCommercialServiceCampaign(g){
 const enabled=g.commercialServiceVersion===1;
 if(['8.17','9.30'].includes(g.version)&&!enabled)throw Error('Missing commercial servicing rules.');
 if(g.commercialServiceVersion!==undefined&&!enabled)throw Error('Unsupported commercial servicing rules.');
 if(g.players.some(p=>p.commercialServiceVersion!==(enabled?1:undefined)))throw Error('Commercial servicing owner rules do not match the campaign.');
 if(enabled)validateCampaignRules(g,'game');
}
function projectCommercialService(g,out){
 if(g.commercialServiceVersion===1){out.commercialServiceVersion=1;out.me.commercialServiceVersion=1;}
}
function validateCommercialServiceView(v){
 if(['8.17','9.30'].includes(v.version)&&v.commercialServiceVersion!==1)throw Error('Missing commercial servicing view rules.');
 if(v.me?.commercialServiceVersion!==v.commercialServiceVersion||v.rival?.commercialServiceVersion!==undefined)throw Error('Invalid commercial servicing owner view.');
 if(v.commercialServiceVersion!==undefined)validateCampaignRules(v,'view');
}
function commercialServicePlanReview(g,index,input){
 const p=g.players[index],no=reason=>({accepted:false,reason,plan:input});
 if(p.commercialServiceVersion!==1||!p.departmentFunctions)return no('Current department-servicing rules required.');
 const before=departmentFunctionsQuote(g,p,input);
 if(!before.status.eligible)return no(before.status.reason);
 const row=before.delivery.rows.find(x=>x.id==='commercialRelationships'),missing=Math.ceil(Math.max(0,row.workload-row.delivered.served));
 if(!missing)return no('Existing relationship service is covered.');
 const candidate=departmentFunctionCopy(input),current=candidate.departmentFunctionsPolicy.vendors.relationships,
  extra=Math.min(missing,DepartmentProvider.ENTITLEMENT-current);
 if(extra<=0)return no('The existing provider has no further capacity.');
 candidate.departmentFunctionsPolicy.vendors.relationships+=extra;
 const after=departmentFunctionsQuote(g,p,candidate);
 if(!after.status.eligible)return no(after.status.reason);
 // Adding paid capacity must not resume unaffordable teaching, displace another
 // committed task, or use future fee receipts to pay this month's supplier.
 if(JSON.stringify(before.attribution.paidTeacherQuarters)!==JSON.stringify(after.attribution.paidTeacherQuarters))return no('Paid teaching changes.');
 for(const old of before.delivery.rows){const next=after.delivery.rows.find(x=>x.id===old.id);if(next.delivered.served+1e-8<old.delivered.served)return no('Existing work loses capacity.');}
 const budget=planBudget(p,candidate,g);
 if(budget.remaining<0||budget.freeCapacity<0||!projectPlanStatus(p,candidate,g).eligible||facilityLifecycleProtectedBudget(p,candidate,budget,g).remaining<0||!lifecycleInstructionQuote(g,p,candidate).status.eligible)return no('Protected current cash or work is insufficient.');
 const forecast=plan=>operatingPreview({...p,focus:plan.focus,marketSnapshot:g.marketEconomy},plan,g.economy,g),old=forecast(input),next=forecast(candidate),review=aiCashPlanningReview(g,index,candidate);
 if(budget.total>review.limit||next.profit-(next.fundingLoss||0)<=old.profit-(old.fundingLoss||0)||(next.emergencyDebt||0)>(old.emergencyDebt||0)||(next.fundingLoss||0)>(old.fundingLoss||0)||next.capitalRatio<10)return no('Servicing does not improve protected net earnings.');
 return {accepted:true,reason:'Funded service restores fee-earning coverage after its recurring cost.',plan:candidate,before:old,after:next,additionalExpense:extra*DepartmentFunctions.FUNCTIONS.relationships.vendorRate};
}
