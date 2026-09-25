'use strict';
// Candidate-only comparison. Not a replacement of the portable's current AI.
// Uses the real credit-aging forecast for a 24-month public-economy projection.
function futureCoupon(E,source,economy,plan,terms) {
 const p=JSON.parse(JSON.stringify(source)),market=Object.keys(p.marketBook.markets)[0];
 p.allocation={...plan.allocation};p.creditPerformance.policy={...plan.collectionsPolicy};
 const added={market,principal:1000000,...terms,late:[0,0,0],seasoning:2};
 p.creditBook.cohorts.push(added);
 let value=0;
 for(let month=0;month<24;month++){
   const forecast=E.creditPerformanceForecast(p,economy,p.allocation,plan.collectionsPolicy);
   const move=forecast.moves[p.creditBook.cohorts.indexOf(added)];
   for(const [i,c] of p.creditBook.cohorts.entries()){
     const m=forecast.moves[i];c.principal-=m.resolved;c.late=m.late;c.seasoning=Math.max(0,c.seasoning-1);
     const performing=c.principal-c.late.reduce((n,x)=>n+x,0);
     const repayment=Math.min(performing,Math.ceil(performing/c.remaining));
     c.principal-=repayment;c.remaining=Math.max(1,c.remaining-1);
   }
   const performing=added.principal-added.late.reduce((n,x)=>n+x,0);
   const caseCost=(move.cured+move.resolved)*E.COLLECTION_APPROACHES[plan.collectionsPolicy.approach].cost/1000000;
   const net=performing*added.rate/1000000-move.loss-caseCost;
   value+=net/(1+Math.max(0,economy.rate)/1200)**(month+1);
 }
 return value/24/1000000;
}
function chooseCandidate(E,g,index,input) {
 const p=g.players[index],plan=JSON.parse(JSON.stringify(input)),keys=Object.keys(E.CREDIT_TERMS);
 const owner={...p,allocation:plan.allocation,policies:{...p.policies,lending:plan.lendingPolicy},products:plan.products};
 const future=Object.fromEntries(keys.map(key=>[key,futureCoupon(E,owner,g.economy,plan,E.creditTerms(owner,g,key))]));
 const choices=[{...p.creditPortfolio.allocation}];
 for(const key of keys)choices.push(Object.fromEntries(keys.map(k=>[k,k===key?100:0])));
 for(const omitted of keys)choices.push(Object.fromEntries(keys.map(k=>[k,k===omitted?0:50])));
 choices.push({mortgage:50,middleMarket:25,consumer:25});
 let best=null;
 for(const allocation of choices){
   const candidate={...plan,groupPolicy:{...plan.groupPolicy,creditAllocation:allocation}};
   const forecast=E.operatingPreview(E.publicState(g,index).me,candidate,g.economy);
   const newLoans=Math.round(Math.max(0,forecast.loanGrowth+(forecast.principalRepaid||0)+(forecast.creditRecovery||0)));
   const parts=E.creditProductionParts({...owner,creditPortfolio:{version:1,allocation}},g,newLoans);
   const coupon=parts.reduce((n,c)=>n+c.principal*c.rate/1000000,0);
   const futureIncome=parts.reduce((n,c)=>n+c.principal*future[c.product],0);
   const utility=forecast.profit-coupon+futureIncome-Math.max(0,10-forecast.capitalRatio)*50000;
   if(!best||utility>best.utility+.01)best={allocation,utility};
 }
 plan.groupPolicy.creditAllocation=best.allocation;
 return E.planFinalCashReserve(g,index,plan);
}
module.exports={futureCoupon,chooseCandidate};
