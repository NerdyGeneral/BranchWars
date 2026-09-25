// Read-only reporting from owner-authorized operating results. No settlement,
// saved-rule changes, inferred historical yields or economic calculations.
const IncomeReview=(()=>{
 const number=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
 function change(value,baseline){
  value=number(value);baseline=number(baseline);
  if(value===null||baseline===null)return {amount:null,percent:null};
  return {amount:value-baseline,percent:baseline>0?(value-baseline)/baseline*100:null};
 }
 function metric(report,key){
  if(!report)return null;
  if(key==='loanAfterLosses')return number(report.loanIncome)===null||number(report.chargeoff)===null?null:report.loanIncome-report.chargeoff;
  return number(report[key]);
 }
 function history(view){
  const lastAllowed=view.gameOver?view.cycle:view.cycle-1,records=new Map();
  if(view.incomeHistoryVersion===1){
   validateIncomeHistoryView(view);
   for(const row of view.me.incomeHistory.records)records.set(row.cycle,row);
  }
  const accept=report=>report&&Number.isSafeInteger(report.cycle)&&report.cycle>0&&report.cycle<=lastAllowed;
  for(const event of view.incomeHistoryVersion===1?[]:view.operatingEvents||[]){
   if(event.category!=='operations.result'||event.visibility!=='owner'||event.target!==view.me.id||!accept(event.report)||event.cycle!==event.report.cycle)continue;
   records.set(event.cycle,event.report);
  }
  // The latest owner report remains usable when its older ledger was pruned.
  if(view.incomeHistoryVersion!==1&&accept(view.me.operatingReport))records.set(view.me.operatingReport.cycle,view.me.operatingReport);
  if(!records.size)return [];
  const latest=lastAllowed;
  return Array.from({length:Math.min(12,latest)},(_,i)=>{
   const cycle=Math.max(1,latest-11)+i,report=records.get(cycle);
   return {cycle,loanIncome:metric(report,'loanIncome'),commercialIncome:metric(report,'commercialIncome'),
    chargeoff:metric(report,'chargeoff'),loanAfterLosses:metric(report,'loanAfterLosses'),loanGrowth:metric(report,'loanGrowth'),
    contractFees:metric(report,'contractFees'),business:metric(report,'business'),merchant:metric(report,'merchant'),available:!!report};
  });
 }
 function compare(view,standing,draft,key){
  const points=history(view),last=points.at(-1),previous=points.at(-2);
  const actual=metric(last,key),prior=metric(previous,key),base=metric(standing,key),proposed=metric(draft,key);
  return {key,cycle:last?.cycle??null,actual,standing:base,draft:proposed,
   actualChange:change(actual,prior),standingChange:change(base,actual),forecastChange:change(proposed,actual),draftChange:change(proposed,base)};
 }
 function principalHistory(view){
  const lastAllowed=view.gameOver?view.cycle:view.cycle-1,records=new Map();
  if(view.incomeHistoryVersion===1){
   validateIncomeHistoryView(view);records.set(0,view.me.incomeHistory.opening.principal);
   for(const row of view.me.incomeHistory.records)records.set(row.cycle,row.principal);
  }else for(const row of view.trend||[])if(Number.isSafeInteger(row.cycle)&&row.cycle>=0&&row.cycle<=lastAllowed&&number(row.meLoans)!==null)records.set(row.cycle,row.meLoans);
  if(!records.size)return [];
  const first=Math.max(0,lastAllowed-11);
  return Array.from({length:lastAllowed-first+1},(_,i)=>{
   const cycle=first+i,principal=records.get(cycle)??null;
   return {cycle,principal,change:change(principal,records.get(cycle-1)??null)};
  });
 }
 function relationshipChange(view){
  if(view.incomeHistoryVersion!==1)return null;
  validateIncomeHistoryView(view);
  const book=view.me.incomeHistory,last=book.records.at(-1),before=book.records.at(-2)||(last?.cycle===1?book.opening:null);
  if(!last||!before)return null;
  return {cycle:last.cycle,business:last.business-before.business,merchant:last.merchant-before.merchant};
 }
 function reconciliation(report){
  if(!report)return null;
  const fields=['depositIncome','loanIncome','commercialIncome','otherIncome','fundingCost','expense','chargeoff','eventAdjustment','profit'];
  if(fields.some(k=>number(report[k])===null))return null;
  const invoiceLoss=number(report.corporateInvoiceLoss)??0;
  const calculated=report.depositIncome+report.loanIncome+report.commercialIncome+report.otherIncome-report.fundingCost-report.expense-report.chargeoff+report.eventAdjustment-invoiceLoss;
  const residual=report.profit-calculated;
  return {calculated,reported:report.profit,invoiceLoss,residual,reconciled:Math.abs(residual)<=2};
 }
 function statement(report){
  const unavailable=reason=>({available:false,reason}),prefix='incomeSource_',entries=Object.entries(report||{}).filter(([key])=>key.startsWith(prefix));
  if(!entries.length)return unavailable('Detailed income sources were not recorded for this result.');
  const c=Object.fromEntries(entries.map(([key,value])=>[key.slice(prefix.length),value]));
  const keys=['version','staffActivity','wealthRelationships','technologyBonus','wealthUpgradeBonus','digitalStrategyBonus','basePayroll','facilityUpkeep','securitiesInterest'];
  const bridge=reconciliation(report);
  if(!bridge||!bridge.reconciled||!c||Array.isArray(c)||c.version!==1||Object.keys(c).sort().join()!==keys.sort().join()||
   keys.some(k=>number(c[k])===null||c[k]<0)||number(report.depositInterest)===null)
   return unavailable('Recorded statement detail is incomplete or does not reconcile.');
  const optional=['contractFees','specialistPayroll','workforceTraining','depositServiceCost','contractServicing','collectionsCost',
   'customerAcquisitionCost','advertisingCost','relationshipOfferCost','onboardingCost','departmentExpense','departmentFunctionExpense','facilityMaintenance'];
  if(optional.some(k=>report[k]!==undefined&&(number(report[k])===null||report[k]<0)))return unavailable('Invalid recorded service income or operating expense.');
  const amount=k=>report[k]??0,abstract=c.staffActivity+c.wealthRelationships+c.technologyBonus+c.wealthUpgradeBonus+c.digitalStrategyBonus,
   unclassified=report.otherIncome-c.securitiesInterest-amount('contractFees')-abstract,
   fundingOther=report.fundingCost-report.depositInterest;
  if(unclassified< -2||fundingOther< -2)return unavailable('Recorded income or funding components exceed their totals.');
  const expenses=[['basePayroll','Base banker payroll',c.basePayroll],['facilityUpkeep','Facility operating upkeep',c.facilityUpkeep],
   ['specialistPayroll','Specialist compensation premiums',amount('specialistPayroll')],['workforceTraining','Staff training',amount('workforceTraining')],
   ['depositServiceCost','Deposit servicing and product platforms',amount('depositServiceCost')],['contractServicing','Commercial contract delivery',amount('contractServicing')],
   ['collectionsCost','Collections case costs',amount('collectionsCost')],['customerAcquisitionCost','Ordinary customer acquisition',amount('customerAcquisitionCost')],
   ['advertisingCost','Advertising campaigns',amount('advertisingCost')],['relationshipOfferCost','Relationship conversion',amount('relationshipOfferCost')],
   ['onboardingCost','Application activation',amount('onboardingCost')],['departmentExpense','Department leadership and budgets',amount('departmentExpense')],
   ['departmentFunctionExpense','Department purchased work',amount('departmentFunctionExpense')],['facilityMaintenance','Facility maintenance',amount('facilityMaintenance')]];
  const remainingExpense=report.expense-expenses.reduce((n,row)=>n+row[2],0);
  if(remainingExpense< -2)return unavailable('Recorded expense components exceed total operating expense.');
  // The residual stays explicit. Never relabel unknown income as service fees,
  // invent historic yields from current balances or allocate shared costs into
  // fictional product profits. Embedded platform costs are not counted twice.
  const rows=[['loanInterest','Loan interest',report.loanIncome],['securitiesInterest','Securities interest',c.securitiesInterest],
   ['depositInterest','Deposit interest expense',-report.depositInterest],['otherFunding','Other funding expense',-fundingOther],
   ['netInterest','Net interest income',report.loanIncome+c.securitiesInterest-report.fundingCost],
   ['depositFees','Deposit account fees',report.depositIncome],['commercialFees','Business and merchant fees',report.commercialIncome],
   ['contractFees','Service contract revenue (billed)',amount('contractFees')],['abstract','Legacy modeled bonuses (not verified service fees)',abstract],
   ['unclassified','Other unclassified income / source rounding',unclassified],['operatingExpense','Total operating expense',-report.expense],
   ['creditLoss','Modeled credit losses',-report.chargeoff],['invoiceLoss','Corporate invoice losses',-bridge.invoiceLoss],
   ['eventAdjustment','Operating event adjustment',report.eventAdjustment],['rounding','Report rounding',bridge.residual],['profit','Operating profit',report.profit]];
  return {available:true,rows,expenses:[...expenses,['unclassifiedExpense','Other operating expense / source rounding',remainingExpense]],
   bonuses:[['staffActivity','Legacy staff activity income',c.staffActivity],['wealthRelationships','Legacy wealth relationship income',c.wealthRelationships],
    ['technologyBonus','Technology upgrade income',c.technologyBonus],['wealthUpgradeBonus','Wealth upgrade income',c.wealthUpgradeBonus],['digitalStrategyBonus','Digital strategy income',c.digitalStrategyBonus]],
   netInterest:report.loanIncome+c.securitiesInterest-report.fundingCost,abstract,unclassified,remainingExpense};
 }
 return {change,history,compare,principalHistory,relationshipChange,reconciliation,statement};
})();
