// Shared workload estimate: no morale grant, hiring rule or staffing mutation.
// Events, raids and later consequences are intentionally not forecast here.
function operatingWorkloadMorale(p,a=workforceAllocation(p)){
 const base=p.doctrine==='people'?4:2,serviceShortfall=Math.max(0,5-a.service),operationsShortfall=Math.max(0,2-a.operations);
 return {base,serviceShortfall,operationsShortfall,change:base-(serviceShortfall+operationsShortfall)};
}
// Shared gross origination capacity. A named-company underwriting reservation
// consumes this same capacity; it is not extra production on top of bank loans.
function loanProductionCapacity(g,p){
 const lending=creditSalesStaff(p,workforceAllocation(p).lending),lp=p.policies.lending,cp=p.policies.capital,
  macro=g.economy||MACRO_REGIMES.steady,commercial=strategyProgress(p,'commercial'),creditProduct=productOption(p,'credit'),
  training=(1+p.upgrades.training*.08)*(p.doctrine==='people'?1.1:1),capitalGrowth={liquid:.86,balanced:1,reinvest:1.13}[cp],
  multiplier={conservative:.72,balanced:1,growth:1.42}[lp]*(p.turnEffects.lending||1)*macro.demand*capitalGrowth*(p.doctrine==='commercial'?1.07:1)*(1+commercial*.045)*creditProduct.loans*(hasSpecialization(p,'commercial','specializedCredit')?1.12:1);
 return Math.min(lending*185000*multiplier*training*departmentFunctionCoverage(p,'creditAdministration'),regionalOperations(p)?regionalBranchMetrics(p).loanCapacity:Infinity);
}
function availableLoanProduction(g,p){
 const capacity=loanProductionCapacity(g,p);
 return p._companyCreditOrigination===undefined?capacity:Math.max(0,capacity-p._companyCreditOrigination);
}
function calculateLegacyOperations(g,p,preview=false){
 const s=p.stats,a={...workforceAllocation(p),lending:creditSalesStaff(p,workforceAllocation(p).lending),business:commercialSalesStaff(p)+specialistBusinessBonus(p)},u=p.upgrades,dp=p.policies.deposit,lp=p.policies.lending,cp=p.policies.capital,branch=p.facilityNetwork?effectiveFacilityBranches(p):branchLevels(p),macro=g.economy||MACRO_REGIMES.steady;
 const priorSensitive=Math.min(s.rateSensitiveDeposits||0,s.deposits),runoffPressure={expansion:.8,steady:1,tight:1.2,downturn:1.1,recovery:.9}[macro.key]||1,runoffRate={margin:.1,balanced:.03,aggressive:.01}[dp]*runoffPressure,depositRunoff=Math.round(priorSensitive*runoffRate);
 if(depositRunoff){delta(p,'rateSensitiveDeposits',-depositRunoff);delta(p,'deposits',-depositRunoff);p.fundingGap=(p.fundingGap||0)+depositRunoff}
 const network=strategyProgress(p,'network'),digital=strategyProgress(p,'digital'),commercial=strategyProgress(p,'commercial'),ops=strategyProgress(p,'operations'),retailProduct=productOption(p,'retail'),businessProduct=productOption(p,'business'),creditProduct=productOption(p,'credit'),facilities=effectiveFacilityTotals(p)||{retail:branch,commercial:0,digital:0},training=(1+u.training*.08)*(p.doctrine==='people'?1.1:1),tech=1+u.technology*.08+u.analytics*.035+digital*.045,prod=p.turnEffects.production||1,capitalGrowth={liquid:.86,balanced:1,reinvest:1.13}[cp],service=(householdSalesStaff(p,a.service)*training+branch*(.55+network*.05)+(facilities.retail||0)*.3+(facilities.digital||0)*.22+digital*.05)*prod*(p.turnEffects.service||1),regRank=tierRank(p),depMult={margin:.76,balanced:1,aggressive:1.25}[dp]*(p.turnEffects.deposit||1)*macro.deposits*capitalGrowth*(regRank>=2?.75:1)*(1+digital*.01+network*.025)*retailProduct.deposits*(businessProduct.deposits||1)*(hasSpecialization(p,'digital','customerExperience')?1.07:1),depGain=Math.min((service*125000+branch*85000)*depMult,marketAvailable(p,'deposits'),regionalOperations(p)?Math.max(0,regionalBranchMetrics(p).depositCapacity-(p.onboarding?.report?.totals.activated.principal||0)):Infinity),bizGain=Math.max(1,Math.round((a.business+(facilities.commercial||0)*.45)*(1.25+s.morale/120)*training*(p.doctrine==='commercial'?1.12:1)*(1+commercial*.08)*businessProduct.business)),merchantGain=Math.max(1,Math.round((a.business+(facilities.commercial||0)*.4)*(1.05+tech*.25)*(p.doctrine==='commercial'?1.1:1)*(1+commercial*.08)*businessProduct.merchant)),loanGain=availableLoanProduction(g,p);
 delta(p,'deposits',depGain);delta(p,'rateSensitiveDeposits',depGain*({margin:.01,balanced:.06,aggressive:.3}[dp]+(retailProduct.sensitive||0)));s.rateSensitiveDeposits=Math.min(s.rateSensitiveDeposits,s.deposits);s.depositRunoff=depositRunoff;delta(p,'customers',service*(preview?9.5:rint(7,12))*retailProduct.customers);delta(p,'business',bizGain);delta(p,'merchant',merchantGain);delta(p,'loans',loanGain);delta(p,'wealth',u.wealth*(1+a.service*.12)+commercial*.35);delta(p,'digital',(u.technology+u.analytics*.5+digital*.35+(facilities.digital||0)*.45)*(1+a.service*.15)*(p.turnEffects.digital||1)*(p.doctrine==='digital'?1.02:1)*(retailProduct.digital||1)*(businessProduct.digital||1));delta(p,'reputation',retailProduct.reputation||0);delta(p,'attention',creditProduct.attention||0);delta(p,'compliance',(lp==='growth'?5:lp==='conservative'?-2:2)+(cp==='reinvest'?2:cp==='liquid'?-1:0)-departmentFunctionTaskFte(p,'risk',a.operations)*1.55-u.training*1.2-u.operations*.9-ops*.45);
 const rateFactor=.75+macro.rate/10,depositIncome=s.deposits*.0028*rateFactor*({margin:1.35,balanced:1,aggressive:.45}[dp]),fundingCost=s.deposits*(macro.rate/2400)*({margin:.5,balanced:.8,aggressive:1.2}[dp])*retailProduct.funding+(p.fundingRulesVersion===2?(s.emergencyDebt||0)*.01:0),commercialIncome=(s.business*760+s.merchant*650)*(1+commercial*.075)*businessProduct.fees*(hasSpecialization(p,'commercial','treasury')?1.14:1),loanIncome=s.loans*.0047*(.8+macro.rate/12)*creditProduct.spread,revenue=(a.service+a.business+a.lending)*8000+depositIncome-fundingCost+loanIncome+commercialIncome+s.wealth*1450+u.technology*13000+u.wealth*18000+digital*4000,efficiency=(p.doctrine==='efficiency'?.94:1)*(1-u.operations*.06)*(1-ops*.035)*(hasSpecialization(p,'digital','automation')?.92:1)*(hasSpecialization(p,'operations','lean')?.9:1),facilityExpense=regionalOperations(p)?regionalBranchMetrics(p).expense:(facilities.retail||0)*22000+(facilities.commercial||0)*22000+(facilities.digital||0)*12000,expense=(s.staff*18000+facilityExpense)*efficiency+(p._workforceCosts?p._workforceCosts.payroll:0),creditGuard=Math.max(.28,1-(a.operations+u.training+u.operations+ops*.65)*.075)*(hasSpecialization(p,'operations','resilience')?.82:1),creditPolicy={conservative:.55,balanced:1,growth:1.45}[lp],chargeoff=Math.round(s.loans*.0025*macro.credit*creditPolicy*creditGuard*(p.turnEffects.credit||1)*creditProduct.credit*(businessProduct.risk||1)*(hasSpecialization(p,'commercial','specializedCredit')?1.08:1)),profit=(revenue-expense)*(p.turnEffects.profit||1)-chargeoff;
 p.operatingReport={cycle:g.cycle,depositIncome,fundingCost,loanIncome,commercialIncome,otherIncome:revenue+fundingCost-depositIncome-loanIncome-commercialIncome,expense,chargeoff,eventAdjustment:(revenue-expense)*((p.turnEffects.profit||1)-1),profit:Math.round(profit),depositGrowth:Math.round(depGain)-depositRunoff,loanGrowth:Math.round(loanGain)-chargeoff,depositRunoff};
 addWorkforceReport(p,p.operatingReport);
 s.fundingCost=Math.round(fundingCost);s.lastProfit=Math.round(profit);delta(p,'chargeoffs',chargeoff);delta(p,'loans',-chargeoff);const cashFlow=profit+(cp==='liquid'?35000:0);if(cashFlow<0&&s.cash< -cashFlow)p.fundingGap=(p.fundingGap||0)+(-cashFlow-s.cash);delta(p,'cash',cashFlow);delta(p,'capital',profit>0?profit*.25:profit);delta(p,'earnings',profit);delta(p,'morale',operatingWorkloadMorale(p,a).change);delta(p,'reputation',(service>=4?(p.doctrine==='community'?3:2):service<2?-3:0)-(regRank>=3?3:0));const profitText=profit<0?`-$${Math.abs(Math.round(profit)).toLocaleString()}`:`$${Math.round(profit).toLocaleString()}`;return`${p.name} produced ${Math.round(depGain).toLocaleString()} in deposits, ${Math.round(loanGain).toLocaleString()} in loans, paid $${Math.round(fundingCost).toLocaleString()} in funding cost, earned ${profitText}, and absorbed $${chargeoff.toLocaleString()} in credit losses${depositRunoff?`; $${depositRunoff.toLocaleString()} of rate-sensitive deposits also left`:''}.`}
function prepareOperatingForecast(p,plan,g=null){
 const copy=JSON.parse(JSON.stringify(p));copy.doctrine=typeof copy.doctrine==='object'?copy.doctrine.key:copy.doctrine;
 copy.allocation={...plan.allocation};copy.policies={deposit:plan.depositPolicy,lending:plan.lendingPolicy,capital:plan.capitalPolicy};
 applyHouseholdPolicy(copy,plan.householdPolicy);
 applyCollectionsPolicy(copy,plan.collectionsPolicy);
 applyProductProgramPolicy(copy,plan.productProgramPolicy);
 applyAdvertisingPolicy(copy,plan.advertisingPolicy);
 applyRelationshipOfferPolicy(copy,plan.relationshipOfferPolicy);
 applyOnboardingPolicy(copy,plan.onboardingPolicy);
 applyGroupPortfolio(copy,plan);
 if(copy.commercialAccounts){const selection={commercialAccountPolicy:plan.commercialAccountPolicy};normalizeCommercialAccountPlan(copy,selection);copy.commercialAccounts.policy=selection.commercialAccountPolicy;}
 copy.products={...copy.products,...plan.products};if(copy.termFunding&&plan.termPolicy)copy.termFunding.policy={...plan.termPolicy};if(copy.retailLifecycle&&plan.retailMix&&!copy.productPrograms)applyRetailMix(copy,plan.retailMix);applyServicePolicy(copy,plan.servicePolicy);copy.turnEffects={};copy.fundingGap=0;
 if(copy.workforce){applyWorkforcePolicy(copy,plan.workforcePolicy);const q=planBudget(copy,plan,g);copy._workforceReserved=q.total-(q.training||0)-(q.advertising||0)-(q.relationshipOffers||0)-(q.onboarding||0)}
 if(copy.relationshipOffers)copy._relationshipOfferBudget=relationshipOfferBudget(copy,plan);
 if(copy.onboarding)copy._onboardingBudget=onboardingBudget(copy,plan);
 return copy;
}
function finishOperatingForecast(copy,economy){
 if(copy.commercialAccounts)copy._commercialAccountQuarters=commercialAccountWork(copy);
 operate({economy,cycle:0},copy,true);
 return copy;
}
function projectOperatingForecast(copy,forecastOpeningOwner=null){
 // Offer reports are part of the same operating estimate, not additive growth.
 const result={...copy.operatingReport,capitalRatio:capitalRatio(copy),rateSensitiveDeposits:copy.stats.rateSensitiveDeposits};
 if(forecastOpeningOwner){
  const loans=creditSummary(copy),prior=creditSummary(forecastOpeningOwner),named=companyCreditPrincipal(copy),priorNamed=companyCreditPrincipal(forecastOpeningOwner),services=serviceLoad(copy),treasury=services?.rows.filter(row=>row.kind==='treasury')||[];
  result.commercial={businessRelationships:copy.stats.business,businessGrowth:copy.stats.business-forecastOpeningOwner.stats.business,
   merchantRelationships:copy.stats.merchant,merchantGrowth:copy.stats.merchant-forecastOpeningOwner.stats.merchant,
   fees:copy.operatingReport.commercialIncome,
   businessLoans:loans?loans.products.middleMarket+(loans.products.smallBusiness||0)+(loans.products.commercialProperty||0)+named:null,businessLoanGrowth:loans?loans.products.middleMarket-prior.products.middleMarket+(loans.products.smallBusiness||0)-(prior.products.smallBusiness||0)+(loans.products.commercialProperty||0)-(prior.products.commercialProperty||0)+named-priorNamed:null,
   ...(copy.companyCredit?{companyLoans:named,companyLoanGrowth:named-priorNamed}:{}),
   ...(copy.commercialAccounts?{workQuarters:copy._commercialAccountQuarters,capacityQuarters:commercialAccountCapacity(copy)}:{}),
   businessDeposits:copy.commercialAccounts?commercialAccountBalance(copy):null,treasuryAvailable:!!copy.serviceDesk,treasuryContracts:treasury.length,
   treasuryServed:treasury.filter(row=>row.served).length,treasuryRunRate:treasury.reduce((sum,row)=>sum+row.earned,0)};
 }
 return result;
}
function operatingPreview(p,plan,economy,g=null,includeCommercial=false){
 if(p.departmentOffice){
  // Compensation is posted to a private owner copy, once, before production.
  // The normal forecast setup still owns every other policy and reservation.
  const normalized=departmentCopy(plan);normalizeDepartmentPlan(p,normalized,g);
  const functionPrepared=prepareDepartmentFunctionForecast(p,normalized,g),prepared=prepareOperatingForecast(functionPrepared,normalized,g),facilityCost=facilityDraftSpend(prepared,normalized),
   network=facilityProspectiveOwner(prepared,normalized),copy=prepareFacilityLifecycleForecast(departmentPreparedOwner(network,normalized),normalized);
  copy._workforceReserved=Math.max(0,(copy._workforceReserved||0)-departmentLeadershipQuote(p,plan).total-facilityCost-facilityLifecycleDraftCommitment(prepared,normalized).renovation);
  const facilityReserve=copy._workforceReserved;
  finishOperatingForecast(copy,economy);
  finishFacilityLifecycleForecast(copy,facilityReserve);
  addDepartmentOperatingReport(copy);
  addDepartmentFunctionOperatingReport(copy);
  return projectOperatingForecast(copy,includeCommercial?p:null);
 }
 return projectOperatingForecast(finishOperatingForecast(prepareOperatingForecast(p,plan,g),economy),includeCommercial?p:null);
}
function deleverage(g,p){if(tierRank(p)<2||p.stats.loans<250000)return'';const sold=Math.round(p.stats.loans*.03),haircut=Math.round(sold*.07);delta(p,'loans',-sold);delta(p,'cash',sold-haircut);delta(p,'capital',-haircut);return`${p.name} sold $${sold.toLocaleString()} of loans under its consent order at a $${haircut.toLocaleString()} loss.`}
