'use strict';
// Whole Expanded delivery paths: normal opening resources and real submitted
// months. Never grant research, finish work directly or inject product accounts.
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const copy=x=>JSON.parse(JSON.stringify(x)),context={};
vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);
const E=context.BWEngine;
function fresh(seed){return E.createGame({...E.previewCampaignEdition({},'expanded').options,mode:'hotseat',scenario:'balanced',seed,created:1});}
function operatingPlan(g,i){
 const p=g.players[i],a=E.chooseBot(g,i);
 Object.assign(a,{allocation:{service:3,business:1,lending:1,operations:p.stats.staff-5},newProject:null,newProjects:[],investments:{},hires:0,specialistHires:E.emptySpecialistOrders(),
  competitiveAction:'none',opportunity:null,contractBid:null,capitalAction:false,facilityPolicy:E.defaultFacilityPolicy(),facilityLifecyclePolicy:E.defaultFacilityLifecyclePlan(p),
  facilityExtensionPolicy:{start:null,cancel:null},commercialAccountPolicy:{target:null,staffQuarters:0},companyShareOrders:[],companyControlPolicy:E.defaultCompanyControlPlan(p),
  investmentPolicy:E.defaultInvestmentPlan(p),agencyPolicy:E.defaultAgencyPlan(p),sharedPremisesPolicy:copy(p.sharedPremises.policy)});
 a.groupPolicy.bankDividend=0;a.groupPolicy.bankSupport=0;
 a.householdPolicy.retention=75;a.relationshipOfferPolicy.share=0;a.onboardingPolicy.share=0;a.advertisingPolicy.budget=0;
 a.servicePolicy={...copy(p.serviceDesk.policy),staff:0,outsourcing:0};
 a.departmentPolicy.envelopes.research=E.DEPARTMENT_POLICY_LIMITS.research;
 for(const r of Object.keys(a.workforcePolicy.training))a.workforcePolicy.training[r]=0;
 for(const row of Object.values(a.departmentFunctionsPolicy.quotas))for(const r of Object.keys(row))row[r]=0;
 for(const k of Object.keys(a.departmentFunctionsPolicy.vendors))a.departmentFunctionsPolicy.vendors[k]=0;
 a.productProgramPolicy=E.productProgramPolicy(p);
 for(const row of Object.values(a.productProgramPolicy.markets))for(const k of Object.keys(row))row[k]={essential:4,rewards:0,highYield:0};
 E.normalizeProductProgramPlan(p,a);
 a.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,a).policy;
 return a;
}
function advance(g,a){
 const cycle=g.cycle,b=operatingPlan(g,1);E.submit(g,0,a);E.submit(g,1,b);E.validatePilot(g);E.validateLedger(g);
 assert(!g.gameOver,'Ordinary delivery campaign ended at '+cycle);
 const recovered=E.migrateCampaign(copy(g));assert.deepEqual(copy(recovered),copy(g),'Save/recovery must preserve development and account books');
 return g.eventLedger.filter(e=>e.cycle===cycle&&e.target===g.players[0].id&&e.deltas);
}
function fundTier(g,branch,planner=()=>operatingPlan(g,0)){
 let paid=0,months=0;
 while(E.strategyLevel(g.players[0],branch)<1){
  const p=g.players[0],a=planner(),amount=Math.min(E.CAPABILITY_CAP_PER_CYCLE,E.CAPABILITY_TIERS[branch][0]-E.capabilitySpend(p,branch));
  a.investments={[branch]:amount};const events=advance(g,a);paid+=amount;
  assert.equal(events.filter(e=>e.source==='applyInvestments').reduce((n,e)=>n+(e.deltas.earnings||0),0),-amount);
  assert(++months<12,'First research milestone should be reachable without a grant');
 }
 return paid;
}
function launch(g,key,ready){
 const p=g.players[0],a=operatingPlan(g,0);a.newProjects=[key];a.newProject=key;
 const status=E.projectPlanStatus(p,a,g);assert(status.eligible,status.reason);
 const expected=E.projectStartTerms(g,p,key,null).cost,events=advance(g,a);
 assert.equal(events.filter(e=>e.source==='startProject').reduce((n,e)=>n+(e.deltas.earnings||0),0),-expected,'Launch charged exactly once');
 let months=1;
 while(!ready(g.players[0])){advance(g,operatingPlan(g,0));assert(++months<=10,'Paid delivery must progress with staffed capacity');}
 return {cost:expected,months};
}
for(const product of ['rewards','highYield'])for(const route of ['build','partner'])test('Expanded '+product+' '+route+': paid research/delivery, local adoption, recurring costs and retirement',()=>{
 const g=fresh('expanded-delivery:'+product+':'+route),branch=E.RETAIL_DEPLOYMENTS[product].branch,key=Object.keys(E.PRODUCT_PROGRAM_PROJECTS).find(k=>E.PRODUCT_PROGRAM_PROJECTS[k].product===product&&E.PRODUCT_PROGRAM_PROJECTS[k].route===route);
 const initial=g.players[0],early=operatingPlan(g,0);early.productProgramPolicy.markets.downtown.connected={essential:0,rewards:product==='rewards'?4:0,highYield:product==='highYield'?4:0};
 assert.throws(()=>E.normalizeProductProgramPlan(initial,early),/developed/);
 if(route==='build')assert.match(E.projectTerms(initial,key).barred,/tier 1/);
 const research=route==='build'?fundTier(g,branch):0;
 const launched=launch(g,key,p=>p.productDeployment.ready[product]);
 assert.equal(g.players[0].productPrograms.products[product].route,route);
 assert.equal(E.productProgramCosts(g.players[0]).rows[product].license,route==='partner'?E.PRODUCT_LICENSE:0);
 assert(!g.players[0].depositBook.cohorts.some(c=>c.product===product),'Implementation alone must not create accounts or deposits');
 const segment=product==='rewards'?'connected':'reserve';
 let adoption=0;
 for(let month=0;month<3;month++){
  const p=g.players[0],a=operatingPlan(g,0);a.productProgramPolicy.markets.downtown[segment]={essential:0,rewards:product==='rewards'?4:0,highYield:product==='highYield'?4:0};E.normalizeProductProgramPlan(p,a);
  const before=JSON.stringify(g),v=E.publicState(g,0),forecast=E.operatingPreview(v.me,a,v.economy,v);assert.equal(JSON.stringify(g),before);
  assert(forecast.productProgramCost>=(route==='partner'?E.PRODUCT_LICENSE:0));advance(g,a);
  const cohorts=p.depositBook.cohorts.filter(c=>c.product===product);adoption=cohorts.reduce((n,c)=>n+c.principal,0);
  assert(cohorts.every(c=>c.market==='downtown'&&c.segment===segment),'Targeting must not silently open another market/segment');
 }
 assert(adoption>0,'A reachable local offer should gain funded product accounts');
 const p=g.players[0],retire=operatingPlan(g,0);retire.productProgramPolicy.retire=[product];
 const events=advance(g,retire);assert.equal(events.filter(e=>e.source==='applyProductProgramPolicy').reduce((n,e)=>n+(e.deltas.earnings||0),0),-E.PRODUCT_RETIRE_COST);
 assert(p.productPrograms.products[product].retired);assert.equal(p.productDeployment.ready[product],false);
 assert.equal(E.productProgramCosts(p).rows[product].license,0);assert(p.depositBook.cohorts.some(c=>c.product===product),'Retirement does not erase customer contracts');
 const after=advance(g,operatingPlan(g,0));assert.equal(after.filter(e=>e.source==='applyProductProgramPolicy').reduce((n,e)=>n+(e.deltas.earnings||0),0),0,'Retirement not charged twice');
 console.log(JSON.stringify({product,route,research,launch:launched,adoptedPrincipal:adoption,months:g.cycle-1,earnings:p.stats.earnings}));
});
test('Expanded treasury: researched partner launch, explicit activation, funded mandate and in-house replacement',()=>{
 const g=fresh('expanded-delivery:treasury'),commercial=fundTier(g,'commercial');
 const partner=launch(g,'partnerTreasuryDesk',p=>p.serviceDesk.applications.treasury==='partner');
 assert.equal(g.players[0].serviceDesk.policy.treasury,false,'Completion does not activate a platform');
 advance(g,operatingPlan(g,0));assert.equal(g.players[0].operatingReport.servicePlatform,0,'Inactive platform has no upkeep');
 function activePlan(){
  const a=operatingPlan(g,0);a.allocation={service:2,business:3,lending:0,operations:g.players[0].stats.staff-5};
  a.servicePolicy.treasury=true;a.servicePolicy.staff=1;a.servicePolicy.outsourcing=2;a.servicePolicy.pricing.treasury='discount';
  a.departmentFunctionsPolicy.quotas.technology.operations=2;
  a.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,g.players[0],a).policy;
  // Technology demand grows with the institution. Buy only the support the
  // same prepared player quote says is needed; raw reserved headcount is not
  // proof that the desk can serve its three-point treasury mandate.
  const v=E.publicState(g,0),before=JSON.stringify(g);
  for(let units=0;units<=8;units++){
   a.departmentFunctionsPolicy.vendors.technology=units;
   const owner=E.departmentCustomerPreview(v.me,v,a).owner;
   if(E.serviceLoad(owner).capacity>=E.SERVICE_TYPES.treasury.load){assert.equal(JSON.stringify(g),before);return a;}
  }
  assert.fail('Cannot affordably support treasury delivery within the bounded operating plan');
 }
 let won=null;const attempts=[];
 for(let months=0;months<7&&!won;months++){
  const a=activePlan(),v=E.publicState(g,0),owner=E.departmentCustomerPreview(v.me,v,a).owner;
  const bid=g.serviceAgreements.find(c=>c.kind==='treasury'&&c.due===g.cycle&&E.serviceBidStatus(owner,c).eligible);
  attempts.push({cycle:g.cycle,capacity:E.serviceLoad(owner).capacity,bid:bid?.id||null,due:g.serviceAgreements.filter(c=>c.kind==='treasury'&&c.due===g.cycle).map(c=>({id:c.id,status:E.serviceBidStatus(owner,c)}))});
  if(bid)a.contractBid=bid.id;
  advance(g,a);assert.equal(g.players[0].operatingReport.servicePlatform,18000,'Active partner platform charged once');
  won=g.serviceAgreements.find(c=>c.kind==='treasury'&&c.owner===g.players[0].id);
 }
 assert(won,'Researched, staffed treasury service can win a real corporate mandate: '+JSON.stringify(attempts));
 const companyId=won.id;advance(g,activePlan());assert(g.players[0].operatingReport.contractFees>0,'Won mandate earns actual service revenue');
 const digital=fundTier(g,'digital',activePlan);
 // Keep servicing while building; no second platform or duplicated contract.
 const a=activePlan();a.newProjects=['buildTreasuryDesk'];a.newProject='buildTreasuryDesk';
 const status=E.projectPlanStatus(g.players[0],a,g);assert(status.eligible,status.reason);advance(g,a);
 for(let months=0;g.players[0].serviceDesk.applications.treasury!=='build';months++){assert(months<10);advance(g,activePlan());}
 const final=activePlan();advance(g,final);
 assert.equal(g.players[0].operatingReport.servicePlatform,6000,'Owned route replaces, not adds to, partner upkeep');
 assert.equal(g.serviceAgreements.filter(c=>c.id===companyId).length,1);
 assert.equal(g.serviceAgreements.find(c=>c.id===companyId).owner,g.players[0].id,'Continued service preserves the mandate through research and migration');
 console.log(JSON.stringify({service:'treasury',commercialResearch:commercial,digitalResearch:digital,partner,months:g.cycle-1,route:g.players[0].serviceDesk.applications.treasury,earnings:g.players[0].stats.earnings}));
});

test('Expanded payroll: two funded capabilities, paid automation and optional upkeep on a real mandate',()=>{
 const g=fresh('expanded-delivery:payroll'),network=fundTier(g,'network'),operations=fundTier(g,'operations');
 const deployment=launch(g,'deployPayrollDesk',p=>p.serviceDesk.applications.payroll===true);
 assert.equal(g.players[0].serviceDesk.policy.payroll,false);
 function payrollPlan(active=true){
  const a=operatingPlan(g,0);a.allocation={service:2,business:3,lending:0,operations:g.players[0].stats.staff-5};
  a.servicePolicy.payroll=active;a.servicePolicy.outsourcing=2;a.servicePolicy.pricing.payroll='discount';
  a.departmentFunctionsPolicy.vendors.technology=2;
  a.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,g.players[0],a).policy;return a;
 }
 let won;
 for(let months=0;months<7&&!won;months++){
  const a=payrollPlan(),v=E.publicState(g,0),owner=E.departmentCustomerPreview(v.me,v,a).owner;
  const bid=g.serviceAgreements.find(c=>c.kind==='payroll'&&c.due===g.cycle&&E.serviceBidStatus(owner,c).eligible);
  if(bid)a.contractBid=bid.id;
  advance(g,a);assert.equal(g.players[0].operatingReport.servicePlatform,4000);
  won=g.serviceAgreements.find(c=>c.kind==='payroll'&&c.owner===g.players[0].id);
 }
 assert(won,'Research plus supported competitive delivery can win a funded payroll mandate');
 const id=won.id;
 for(const active of [true,false]){
  const a=payrollPlan(active),v=E.publicState(g,0),before=JSON.stringify(g),load=E.serviceLoad(E.departmentCustomerPreview(v.me,v,a).owner),row=load.rows.find(c=>c.id===id);
  assert(row.served);assert.equal(row.cost,active?1500:3000);assert.equal(JSON.stringify(g),before);
  advance(g,a);assert.equal(g.players[0].operatingReport.servicePlatform,active?4000:0);
  assert(g.players[0].operatingReport.contractFees>0);assert.equal(g.serviceAgreements.find(c=>c.id===id).owner,g.players[0].id);
 }
 console.log(JSON.stringify({service:'payroll',networkResearch:network,operationsResearch:operations,deployment,months:g.cycle-1,earnings:g.players[0].stats.earnings}));
});
