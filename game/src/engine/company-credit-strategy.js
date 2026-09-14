// The rival board uses owner-visible statements and the human loan review.
// This is not delegation for a human bank, privileged funding, or a hidden bid.
function companyCreditStrategyReview(v,input){
 const p=v.me,plan=JSON.parse(JSON.stringify(input));
 if(v.companyCreditVersion!==1||!p.companyCredit)throw Error('Company lending strategy requires its campaign rules.');
 plan.companyCreditOrders=[];
 const empty=companyCreditOrderReview(v,p,plan,[]),declined=[],offered=[];
 const finish=reason=>({plan,offered,declined,reason});
 if(!empty.eligible||v.gameOver||p.submitted)return finish(empty.reason||'The month is closed for new lending.');
 const appetite=plan.lendingPolicy||p.policies.lending,months={conservative:24,balanced:36,growth:48}[appetite],
  share={conservative:.25,balanced:.5,growth:.75}[appetite],
  rate=Math.max(400,Math.min(1800,Math.round((v.economy.rate+({conservative:5,balanced:4.5,growth:4}[appetite]))*100))),
  budget=Math.floor(Math.min(empty.cashAvailable,empty.capitalAvailable,empty.capacity)*share/1000)*1000;
 if(!months||budget<1000||empty.availableQuarters<1)return finish('Retain liquidity and ordinary lending: no spare funded underwriting budget.');
 const companies=[...p.companySnapshot.world.companies].map(c=>({company:c,need:CompanyCredit.assess(c)}))
  .sort((a,b)=>b.need.cashAfterDebt-a.need.cashAfterDebt||a.company.id.localeCompare(b.company.id));
 let committed=0,profit=null;
 for(const {company:c,need}of companies){
  const principal=Math.floor(Math.min(need.requested,budget-committed)/1000)*1000;
  if(principal<1000)continue;
  const order={companyId:c.id,principal,months,annualRateBp:rate,appetite,product:need.product},candidate={...plan,companyCreditOrders:[...plan.companyCreditOrders,order]},
   quote=companyCreditOrderReview(v,p,candidate,candidate.companyCreditOrders);
  if(!quote.eligible){declined.push({companyId:c.id,reason:quote.reason});continue;}
  const forecast=companyCreditPlanForecast(v,p,candidate);
  if(profit===null)profit=forecast.baseline.profit;
  // Funding must beat using the same staff and cash in the existing plan. No
  // immediate principal-as-profit score or assumed future bailout/dividend.
  if(forecast.funded.profit<=profit||forecast.funded.companyCredit?.principalWrittenOff||forecast.funded.companyCredit?.interestWrittenOff){
   declined.push({companyId:c.id,reason:'The funded scenario does not improve operating earnings after displaced ordinary lending and current credit losses.'});continue;
  }
  plan.companyCreditOrders=candidate.companyCreditOrders;committed+=principal;
  offered.push({companyId:c.id,principal,annualRateBp:rate,months,incrementalProfit:forecast.funded.profit-profit});profit=forecast.funded.profit;
 }
 return finish(offered.length?'Offer qualified, cash-funded credit within shared underwriting and reserve limits; rival acceptance remains uncertain.':'No qualified company offer improves this funded plan; retain the ordinary portfolio.');
}
function planCompanyCredit(g,index,plan){
 if(g.companyCreditVersion!==1)return plan;
 const v=root.BWEngine.publicState(g,index);
 return companyCreditStrategyReview(v,plan).plan;
}
