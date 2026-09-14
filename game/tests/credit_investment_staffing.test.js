'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const copy=x=>JSON.parse(JSON.stringify(x)),html=require('../tools/build_game').assemble().html,c={};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={',`root.BWEngine={facilityInvestmentGross,facilityInvestmentCreditOwner,facilityInvestmentCreditStream,withCorporateForecast,ordinaryCreditOriginations,prepareCreditScenarioOwner,groupFutureCreditValue,creditTerms,creditProductionParts,
 comparisonWithReport:(p,plan,economy,g,report)=>{const original=operatingPreview;operatingPreview=()=>report;try{return groupLendingComparison(p,plan,economy,g)}finally{operatingPreview=original;}},`),c);
const E=c.BWEngine;
test('ordinary investment originations exclude named advances, repayments and non-principal writeoffs',()=>{
 const report={loanGrowth:1090,principalRepaid:200,creditRecovery:50,chargeoff:47,companyCredit:{advanced:500,principalPaid:100,recoveredPrincipal:20,principalWrittenOff:30,interestWrittenOff:7}},before=JSON.stringify(report);
 assert.equal(E.facilityInvestmentGross(report,{creditWorkloadVersion:1}),1000);
 assert.equal(E.facilityInvestmentGross(report),1387,'Old valuations retain their original arithmetic');assert.equal(JSON.stringify(report),before);
});
function setup(){
 const g=E.createGame({...E.previewCampaignEdition({},'expanded',{currentReporting:true}).options,commercialServiceVersion:1,creditWorkloadVersion:1,mode:'hotseat',seed:'credit-investment-work',created:1});
 // Obtain actual arrears from an ordinary month; an opening debt-free queue
 // correctly leaves purchased collections slots idle rather than delivering it.
 const opening=g.players.map((_,i)=>E.chooseBot(g,i));opening.forEach((plan,i)=>E.submit(g,i,plan));
 const plan=E.chooseBot(copy(g),0);
 plan.newProjects=[];plan.newProject=null;plan.investments={};plan.hires=0;plan.specialistHires=E.emptySpecialistOrders();plan.companyCreditOrders=[];
 plan.facilityPolicy=E.defaultFacilityPolicy();plan.collectionsPolicy={share:0,approach:'balanced'};
 plan.departmentFunctionsPolicy.quotas.collections={service:0,business:0,lending:0,operations:0};plan.departmentFunctionsPolicy.vendors.collections=1;
 return {g,p:g.players[0],plan};
}
test('investment credit projections use paid department collections instead of an unstaffed fallback',()=>{
 const {g,p,plan}=setup(),before=JSON.stringify({g,plan}),q=E.departmentFunctionsQuote(g,p,plan);assert(q.status.eligible,q.status.reason);
 const view=E.publicState(g,0),actual=E.departmentCreditPreview(view.me,view,plan),old=E.collectionsReview(p,plan.allocation,plan.collectionsPolicy);assert.equal(old.capacity,0);assert(actual.collections.capacity>0);
 const prepared=E.facilityInvestmentCreditOwner(p,plan,g);prepared.allocation=copy(plan.allocation);prepared.creditPerformance.policy=copy(plan.collectionsPolicy);
 const review=E.collectionsReview(prepared,plan.allocation,plan.collectionsPolicy);assert.equal(review.capacity,actual.collections.capacity);
 assert.deepEqual(copy(prepared.accounting),copy(p.accounting),'Preparing scenario work must not charge providers a second time');
 const stream=E.withCorporateForecast(g,()=>E.facilityInvestmentCreditStream(p,g.economy,plan,[0,0,0],[0,0,0],0,g));
 assert.equal(stream.rows[0].collectionsCapacity,actual.collections.capacity);
 for(const row of stream.rows){assert(row.originations===0);assert(row.collectionsCapacity===actual.collections.capacity);assert.equal(row.net,row.interest-row.loss-row.collectionsCost);}
 assert.equal(JSON.stringify({g,plan}),before,'Scenario preparation changed the real bank or draft');
});
test('legacy scenarios keep their original owner preparation and overcommitted work cannot enter new projections',()=>{
 const {g,p,plan}=setup(),legacy=copy(p);delete legacy.creditWorkloadVersion;
 assert.deepEqual(copy(E.facilityInvestmentCreditOwner(legacy,plan,g)),legacy);
 const invalid=copy(plan);invalid.departmentFunctionsPolicy.quotas.collections.lending=400;
 assert.throws(()=>E.facilityInvestmentCreditOwner(p,invalid,g));
});

test('product comparisons use the shared ordinary principal bridge and authorized paid collection work',()=>{
 const {g,p,plan}=setup(),before=JSON.stringify({g,plan});
 const view=E.publicState(g,0),viewBefore=JSON.stringify(view),actualReview=E.groupLendingComparison(view.me,plan,view.economy,view);
 for(const row of actualReview.rows){
  const candidate={...plan,groupPolicy:{...plan.groupPolicy,creditAllocation:row.allocation}};
  const actual=E.operatingPreview(view.me,candidate,view.economy,view);
  assert.equal(row.originations,E.ordinaryCreditOriginations(actual));assert.equal(row.profit,actual.profit);
 }
 assert.equal(JSON.stringify(view),viewBefore,'The real owner-facing comparison must remain pure');
 // A unit-level operating report isolates simultaneous named movements. It is
 // not inserted into the game, a funded-loan fixture, or campaign evidence.
 const report={loanGrowth:1090,principalRepaid:200,creditRecovery:50,chargeoff:47,profit:10000,capitalRatio:15,
  companyCredit:{advanced:500,principalPaid:100,recoveredPrincipal:20,principalWrittenOff:30,interestWrittenOff:7}};
 const review=E.comparisonWithReport(p,plan,g.economy,g,report),prepared=E.prepareCreditScenarioOwner(p,plan,g);
 const owner={...prepared,allocation:plan.allocation,policies:{...prepared.policies,lending:plan.lendingPolicy},products:plan.products};
 let changedByWork=false;
 for(const row of review.rows){
  assert.equal(row.originations,1000,'Named advances must not become ordinary originations in product recommendations');
  const parts=E.creditProductionParts({...owner,creditPortfolio:{version:1,allocation:row.allocation}},{economy:g.economy},1000);
  const contribution=parts.reduce((sum,part)=>sum+part.principal*E.groupFutureCreditValue(owner,g.economy,plan,E.creditTerms(owner,{economy:g.economy},part.product)).monthlyPerDollar,0);
  assert.equal(row.futureContribution,contribution,'Products and office investment must consume the same paid collection work');
  const raw={...owner};delete raw._departmentFunctionExecution;delete raw._departmentFunctionExpertise;
  const fallback=parts.reduce((sum,part)=>sum+part.principal*E.groupFutureCreditValue(raw,g.economy,plan,E.creditTerms(raw,{economy:g.economy},part.product)).monthlyPerDollar,0);
  if(Math.abs(fallback-contribution)>1e-8)changedByWork=true;
 }
 assert(changedByWork,'Fixture must distinguish staffed from unstaffed collections');
 const legacy=copy(p);delete legacy.creditWorkloadVersion;
 assert(E.comparisonWithReport(legacy,plan,g.economy,g,report).rows.every(row=>row.originations===1387),'Historical recommendation arithmetic remains unchanged');
 assert.equal(JSON.stringify({g,plan}),before);
});
