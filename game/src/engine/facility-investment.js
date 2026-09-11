// Group7 AI capital budgeting. These are private, frozen-economy scenarios,
// not booked assets, promised customers, or additional spendable resources.
const FACILITY_INVESTMENT_HORIZON=60;
function facilityInvestmentDraft(input){const plan=departmentFunctionCopy(input);plan.facilityPolicy=defaultFacilityPolicy();plan.investments={};plan.newProjects=[];plan.newProject=null;return plan;}
function facilityInvestmentGross(report){return Math.max(0,Math.round((report.loanGrowth||0)+(report.principalRepaid||0)+(report.creditRecovery||0)+(report.chargeoff||0)));}
function facilityInvestmentCreditStream(source,economy,plan,flows,noncredit,upfront=0){
 const p=departmentFunctionCopy(source),market=plan.focus||p.focus,rows=[];
 p.allocation={...plan.allocation};p.policies={...p.policies,lending:plan.lendingPolicy};p.products={...plan.products};
 p.creditPortfolio.allocation={...plan.groupPolicy.creditAllocation};
 p.creditPerformance.policy={...plan.collectionsPolicy};p.turnEffects={};
 // Separate scenario cash/equity, never assigned back to a bank. Reserve the
 // ENTIRE current budget up front (conservative for recurring commitments),
 // keep the existing liquidity/capital buffers and never invent financing.
 const budget=planBudget(source,plan),otherRisk=riskAssets(source)-source.stats.loans,
  reserve=Math.max(600000,source.stats.deposits*({liquid:.02,reinvest:.08,balanced:.05}[plan.capitalPolicy]||.05));
 let cash=source.stats.cash-upfront-budget.total-(source.accounting.accounts.payables||0),
  capital=source.stats.capital-upfront-budget.total,value=0;
 for(let month=0;month<flows.length;month++){
  const flow=flows[month];if(!Number.isSafeInteger(flow)||flow<0)throw Error('Invalid projected loan production.');
  const credit=creditPerformanceForecast(p,economy,p.allocation,plan.collectionsPolicy);
  let repaid=0;
  for(const [i,c]of p.creditBook.cohorts.entries()){
   const move=credit.moves[i];c.principal-=move.resolved;c.late=move.late;c.seasoning=Math.max(0,c.seasoning-1);
   const payment=Math.min(performingCredit(c),Math.ceil(performingCredit(c)/c.remaining));
   c.principal-=payment;c.remaining=Math.max(1,c.remaining-1);repaid+=payment;
  }
  p.creditBook.cohorts=p.creditBook.cohorts.filter(c=>c.principal>0);
  cash+=repaid+credit.recovered;capital-=credit.loss;
  const held=p.creditBook.cohorts.reduce((n,c)=>n+c.principal,0),
   originated=Math.min(flow,Math.max(0,Math.floor(cash-reserve)),Math.max(0,Math.floor((capital-200000)/.10-otherRisk-held)));
  cash-=originated;
  for(const part of creditProductionParts(p,{economy},originated))if(part.principal)p.creditBook.cohorts.push({market,...part});
  const principal=p.creditBook.cohorts.reduce((n,c)=>n+c.principal,0),interest=p.creditBook.cohorts.reduce((n,c)=>n+performingCredit(c)*c.rate/1000000,0),
   net=interest-credit.loss-credit.cost+noncredit[month],discount=(1+Math.max(0,economy.rate)/1200)**(month+1);
  cash+=interest-credit.cost+noncredit[month];capital+=interest-credit.cost+noncredit[month];
  p.stats.loans=principal;value+=net/discount;
  rows.push({month:month+1,requested:flow,originations:originated,principal,repaid,recovered:credit.recovered,interest,loss:credit.loss,collectionsCost:credit.cost,noncredit:noncredit[month],net,discount,cash,capital,capitalRatio:100*capital/Math.max(1,principal+otherRisk)});
 }
 return {value,rows};
}
function facilityInvestmentFutureOwner(g,p,plan,quote){
 const owner=departmentFunctionCopy(p),future=departmentFunctionCopy(plan),target=FacilityNetwork.office(owner,quote.officeId);
 // Model activation is a private completed-work counterfactual. Use the domain
 // activation path so identity mirrors and hub consequences cannot drift.
 target.conversion={model:quote.to,cost:quote.cost,work:FacilityNetwork.RULES.work,startedCycle:g.cycle,readyCycle:g.cycle};
 owner.facilityNetwork.lastActivatedCycle=g.cycle-1;FacilityNetwork.activate(owner,g.cycle);
 facilityLifecycleConvertedOffice(owner,quote.officeId);
 owner.accounting=AccountingPrototype.post(owner.accounting,'forecast.conversion',{cash:-quote.cost,equity:-quote.cost},-quote.cost);syncAccounts(owner);
 future.facilityPolicy=defaultFacilityPolicy();
 const authorized=departmentFunctionsQuote(g,owner,future);
 if(!authorized.status.eligible)return {owner,plan:future,status:authorized.status};
 future.facilityLifecyclePolicy=facilityLifecycleStaffProposal(g,owner,future).policy;
 return {owner,plan:future};
}
function facilityInvestmentReview(g,index,input,request){
 const p=g.players[index],plan=facilityInvestmentDraft(input),reject=reason=>({eligible:false,reason});
 if(!p.facilityLifecycle||!p.creditPerformance||!p.creditPortfolio)return reject('Staffed facilities and persistent credit are required.');
 const draftAuthorized=departmentFunctionsQuote(g,p,plan);
 if(!draftAuthorized.status.eligible)return reject('deferred: '+draftAuthorized.status.reason);
 // Compare a conversion with deferring unstarted research/new projects, not
 // with cancelling existing work, staffing, vendors or emergency defenses.
 // The returned plan makes this opportunity cost explicit to the caller.
 const context=facilityContext(g,p,plan),quote=FacilityNetwork.quote(p,request,context);
 if(!quote.eligible)return {...reject(quote.reason),quote};
 const budget=planBudget(p,plan),review=aiCashPlanningReview(g,index,plan),ready=quote.cost<=review.limit-budget.total;
 const duringPlan={...plan,facilityPolicy:{convert:{...request},cancel:null}};
 for(const [stage,draft]of [['current',plan],['construction',duringPlan]]){
  const authorized=departmentFunctionsQuote(g,p,draft);
  if(!authorized.status.eligible)return {...reject(stage+': '+authorized.status.reason),quote};
  // A conversion and a new renovation can each quote successfully in
  // isolation but cannot occupy the same local market. Keep the selected
  // maintenance/work orders; reject the counterfactual before forecasting it.
  const lifecycle=lifecycleInstructionQuote(g,p,draft);
  if(!lifecycle.status.eligible)return {...reject(stage+': '+lifecycle.status.reason),quote};
 }
 const future=facilityInvestmentFutureOwner(g,p,plan,quote);
 if(future.status&&!future.status.eligible)return {...reject('activation: '+future.status.reason),quote};
 const authorized=departmentFunctionsQuote(g,future.owner,future.plan);
 if(!authorized.status.eligible)return {...reject('activation: '+authorized.status.reason),quote};
 const lifecycle=lifecycleInstructionQuote(g,future.owner,future.plan);
 if(!lifecycle.status.eligible)return {...reject('activation: '+lifecycle.status.reason),quote};
 const forecast=(owner,draft)=>operatingPreview({...owner,focus:draft.focus,marketSnapshot:g.marketEconomy},draft,g.economy),
  before=forecast(p,plan),during=forecast(p,duringPlan),after=forecast(future.owner,future.plan);
 for(const report of [during,after])if(report.capitalRatio<10||report.profit-(report.fundingLoss||0)<=0||
  (report.fundingLoss||0)>(before.fundingLoss||0)||(report.emergencyDebt||0)>(before.emergencyDebt||0))
  return {...reject('Construction or activation weakens protected funding/capital or produces an operating loss.'),quote,before,during,after};
 const months=FACILITY_INVESTMENT_HORIZON,constructionMonths=2,
  baseFlows=Array(months).fill(facilityInvestmentGross(before)),futureFlows=Array.from({length:months},(_,i)=>facilityInvestmentGross(i<constructionMonths?during:after)),
  recurring=r=>r.profit-r.loanIncome+(r.chargeoff||0)+(r.collectionsCost||0),
  baseStream=facilityInvestmentCreditStream(p,g.economy,plan,baseFlows,Array(months).fill(recurring(before))),
  futureStream=facilityInvestmentCreditStream(p,g.economy,plan,futureFlows,Array.from({length:months},(_,i)=>recurring(i<constructionMonths?during:after)),quote.cost);
 if(futureStream.rows.some(row=>row.cash<0||row.capitalRatio<10))return {...reject('The funded long-run scenario breaches cash or capital protection.'),quote,before,during,after,baseStream,futureStream};
 const value=futureStream.value-baseStream.value-quote.cost;
 return {eligible:true,ready,reason:ready?'':'Accumulate protected capital before committing this conversion.',quote,
  plan:{...plan,facilityPolicy:ready?{convert:{...request},cancel:null}:defaultFacilityPolicy()},before,during,after,horizon:months,constructionMonths,value,
  beforeOriginations:baseFlows.at(-1),afterOriginations:futureFlows.at(-1),beforePrincipal:baseStream.rows.at(-1).principal,afterPrincipal:futureStream.rows.at(-1).principal,
  baseStream,futureStream,
  assumption:'Frozen economy, staff, collections and non-credit operating earnings; projected loans capped by cash and 10% capital plus buffers. No borrowing, future hiring or deposit/customer growth. Unstarted research/projects deferred. Principal repayment is not profit; this is not a future earnings guarantee.'};
}
function planFacilityInvestment(g,index,input){
 if(![7,8].includes(g.financialGroupVersion))return input;
 const p=g.players[index];if(p.stats.lastProfit<=0||tierRank(p)>=2)return input;
 const draft=facilityInvestmentDraft(input),draftAuthorized=departmentFunctionsQuote(g,p,draft);
 // Deferring research can make previously paused training affordable. That
 // reserves a real teacher and may invalidate otherwise legal work quotas.
 // Keep the original funded plan rather than inventing capacity, cancelling
 // training or forecasting an impossible deferred-spending alternative.
 if(!draftAuthorized.status.eligible)return input;
 const context=facilityContext(g,p,draft),budget=planBudget(p,draft),
  metrics=facilityAiConversionMetrics(g,p,draft,budget),byModel=new Map(),
  current=operatingPreview({...p,focus:draft.focus,marketSnapshot:g.marketEconomy},draft,g.economy),
  gross=facilityInvestmentGross(current),capacity=regionalBranchMetrics(p).loanCapacity,
  owner={...p,allocation:draft.allocation,policies:{...p.policies,lending:draft.lendingPolicy},products:draft.products},
  coupon=Math.max(...creditProductionParts(owner,g,1000000).map(c=>c.rate/1000000)),horizon=FACILITY_INVESTMENT_HORIZON;
 context.officeMetrics=metrics;
 // Screen cheaply, then forecast at most two DISTINCT models. Do not let two
 // expensive financial centers crowd every commercial/retail alternative out.
 for(const office of p.facilityNetwork.offices.filter(o=>o.closedCycle===null))for(const model of FacilityNetwork.models(p)){
  const request={officeId:office.id,model},q=FacilityNetwork.quote(p,request,context);if(!q.eligible)continue;
  const gain=Math.max(0,q.after.loanCapacity-q.before.loanCapacity),lost=Math.max(0,gross-Math.max(0,capacity+q.after.loanCapacity-q.before.loanCapacity)),
   score=(q.before.expense-q.after.expense)*horizon+(gain-lost)*coupon*horizon*(horizon+1)/2-q.cost;
  const held=byModel.get(model);if(score>0&&(!held||score>held.score))byModel.set(model,{request,score});
 }
 const shortlist=[...byModel.values()].sort((a,b)=>b.score-a.score).slice(0,2);let best=null;
 for(const item of shortlist){
  const result=facilityInvestmentReview(g,index,input,item.request);
  if(result.eligible&&result.value>0&&(!best||result.value>best.value))best=result;
 }
 if(!best)return input;
 // A valuable but not yet protected-budget-affordable project only defers
 // unstarted growth spending. No queue/save field or early payment is created.
 const candidate=planFinalCashReserve(g,index,best.plan),before=departmentFunctionsQuote(g,p,input),after=departmentFunctionsQuote(g,p,candidate);
 if(!after.status.eligible||best.ready&&JSON.stringify(candidate.facilityPolicy)!==JSON.stringify(best.plan.facilityPolicy))return input;
 for(const row of before.delivery.rows){const next=after.delivery.rows.find(r=>r.id===row.id);if(next.workload>=row.workload&&next.delivered.served+1e-8<row.delivered.served)return input;}
 return candidate;
}
