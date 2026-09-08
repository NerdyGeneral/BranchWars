const SERVICE_TYPES={
 payroll:{name:'Employer Payroll',fee:18000,cost:3000,load:1},
 merchant:{name:'Merchant Settlement',fee:30000,cost:6000,load:2},
 treasury:{name:'Corporate Treasury',fee:50000,cost:9000,load:3}
};
const SERVICE_PRICING={discount:{name:'Relationship price',mult:.8,power:2},standard:{name:'Standard price',mult:1,power:0},premium:{name:'Premium price',mult:1.25,power:-2}};
const SERVICE_APPLICATIONS={
 deployPayrollDesk:{name:'Deploy Payroll Automation',app:'payroll',route:true,requires:['network','operations'],cost:160000,cycles:3,capacity:2,upkeep:4000,desc:'Network + Operations tier 1. Activate for $4K/turn: payroll bids +2 and payroll servicing costs $1.5K less per contract. No free customers.'},
 buildTreasuryDesk:{name:'Build Corporate Treasury',app:'treasury',route:'build',requires:['commercial','digital'],cost:220000,cycles:3,capacity:2,upkeep:6000,desc:'Commercial + Digital tier 1. Activate for $6K/turn to compete for treasury mandates. Requires dedicated service capacity; replaces a partner platform if present.'},
 partnerTreasuryDesk:{name:'Partner for Corporate Treasury',app:'treasury',route:'partner',requires:['commercial'],cost:60000,cycles:1,capacity:1,upkeep:18000,desc:'Commercial tier 1. Faster $60K setup, but $18K/turn while active. Treasury eligibility without a Digital build; a later internal build replaces the partner.'}
};
for(const [key,d]of Object.entries(SERVICE_APPLICATIONS))PROJECTS[key]={...d,kind:'serviceApplication',serviceOnly:true};
function defaultServicePolicy(){return {staff:0,outsourcing:0,payroll:false,treasury:false,pricing:{payroll:'standard',merchant:'standard',treasury:'standard'}}}
function serviceApplicationActive(p,key){return !!(p.serviceDesk&&p.serviceDesk.applications[key]&&p.serviceDesk.policy[key])}
function commercialSalesStaff(p){return departmentFunctionResidual(p,'business',p.departmentOffice?departmentDeliveryAllocation(p,p.serviceDesk?.policy.staff||0).sales:Math.max(0,p.allocation.business-(p.serviceDesk?Math.min(p.allocation.business,p.serviceDesk.policy.staff):0)))+departmentFunctionTaskFte(p,'commercialRelationships',0)}
function validateServicePolicy(p,policy,allocation=p.allocation){
 if(!policy||Array.isArray(policy)||Object.keys(policy).sort().join()!=='outsourcing,payroll,pricing,staff,treasury'||!Number.isInteger(policy.staff)||policy.staff<0||policy.staff>allocation.business||!Number.isInteger(policy.outsourcing)||policy.outsourcing<0||policy.outsourcing>4||typeof policy.payroll!=='boolean'||typeof policy.treasury!=='boolean')throw Error('Service desk: reserve available Business staff and 0–4 outsourced capacity points.');
 if(!policy.pricing||Object.keys(policy.pricing).sort().join()!=='merchant,payroll,treasury'||Object.values(policy.pricing).some(k=>!Object.hasOwn(SERVICE_PRICING,k)))throw Error('Choose a valid renewal price for each service.');
 for(const key of ['payroll','treasury'])if(policy[key]&&!p.serviceDesk.applications[key])throw Error('Deploy the '+key+' application before activation. New completions activate next planning cycle.');
}
function applyServicePolicy(p,policy){if(p.serviceDesk){const next=policy||{...p.serviceDesk.policy,staff:Math.min(p.serviceDesk.policy.staff,p.allocation.business)};validateServicePolicy(p,next);p.serviceDesk.policy=JSON.parse(JSON.stringify(next))}}
function serviceLoad(p){
 if(!p.serviceDesk)return null;
 const d=p.serviceDesk,staff=departmentFunctionTaskFte(p,'commercialDelivery',p.departmentOffice?departmentDeliveryAllocation(p,d.policy.staff).service:Math.min(p.allocation.business,d.policy.staff)),capacity=((staff+(departmentFunctionExecution(p)?0:specialistBusinessBonus(p,true)))*2+d.policy.outsourcing)*departmentFunctionCoverage(p,'technology');
 let free=capacity,fees=0,direct=0;
 const rows=[...d.contracts].sort((a,b)=>a.due-b.due||a.id.localeCompare(b.id)).map(c=>{
  const type=SERVICE_TYPES[c.kind],served=free>=type.load;if(served)free-=type.load;
  const cost=type.cost-(c.kind==='payroll'&&serviceApplicationActive(p,'payroll')?1500:0);
  const eligible=c.kind!=='treasury'||serviceApplicationActive(p,'treasury'),paid=served&&eligible;
  fees+=paid?c.fee:0;direct+=cost;
  return {...c,load:type.load,served:paid,cost,earned:paid?c.fee:0};
 });
 const outsourced=d.policy.outsourcing*6000,platform=(serviceApplicationActive(p,'payroll')?4000:0)+(serviceApplicationActive(p,'treasury')?(d.applications.treasury==='build'?6000:18000):0);
 return {count:rows.length,served:rows.filter(c=>c.served).length,fees,cost:direct+outsourced+platform,direct,outsourced,platform,capacity,used:capacity-free,staff,sales:commercialSalesStaff(p),rows};
}
function serviceBidStatus(p,c){
 if(c.companyClosed)return {eligible:false,reason:'This company has closed; its service contract is unavailable.'};
 if(!p.serviceDesk)return {eligible:false,reason:'Requires the expanded service pilot.'};
 if(c.kind==='treasury'&&!serviceApplicationActive(p,'treasury'))return {eligible:false,reason:'Activate a built or partnered Corporate Treasury platform.'};
 const load=serviceLoad(p),other=load.rows.filter(x=>x.id!==c.id).reduce((n,x)=>n+x.load,0);
 if(p.allocation.business<1)return {eligible:false,reason:'Assign at least one Business banker.'};
 if(load.capacity<other+SERVICE_TYPES[c.kind].load)return {eligible:false,reason:'Reserve enough service capacity for the entire book plus this mandate.'};
 return {eligible:true,reason:'Capacity available; bids remain uncertain.'};
}
function syncServiceBook(g){
 for(const p of g.players){p.serviceContracts=g.serviceAgreements.filter(c=>c.owner===p.id).map(c=>c.id);p.serviceDesk.contracts=g.serviceAgreements.filter(c=>c.owner===p.id).map(({id,kind,fee,due,misses})=>({id,kind,fee,due,misses}))}
}
function initializeServiceDesk(g,o){
 if(g.contractRulesVersion!==1||o.serviceExpansionVersion===0)return g;
 g.serviceExpansionVersion=1;
 g.serviceAgreements.forEach((c,i)=>Object.assign(c,{kind:['payroll','merchant','treasury'][i%3],fee:SERVICE_TYPES[['payroll','merchant','treasury'][i%3]].fee,misses:0}));
 for(const p of g.players)p.serviceDesk={version:1,policy:defaultServicePolicy(),applications:{payroll:false,treasury:null},contracts:[]};
 return g;
}
const serviceIncomeV1=contractIncome;
contractIncome=function(p){return p.serviceDesk?serviceLoad(p):serviceIncomeV1(p)};
const servicePowerV1=contractPower;
contractPower=function(g,p,c){
 if(!p.serviceDesk)return servicePowerV1(g,p,c);
 const pricing=SERVICE_PRICING[p.serviceDesk.policy.pricing[c.kind]],load=serviceLoad(p);
 return 5+(commercialSalesStaff(p)+specialistBusinessBonus(p))*1.5+load.staff+Math.min(3,p.branches[c.market]||0)*1.5+strategyLevel(p,'commercial')+p.stats.reputation/40+pricing.power+(c.owner===p.id?(load.served===load.count?2:-3):0)+(c.kind==='payroll'&&serviceApplicationActive(p,'payroll')?2:0)+(p.contractAds&&p.contractAds.market===c.market&&p.contractAds.expires>=g.cycle?3:0);
};
const serviceReport=adjustDepositReport;
adjustDepositReport=function(p,g,r){serviceReport(p,g,r);if(!p.serviceDesk)return;const s=serviceLoad(p);Object.assign(r,{serviceCapacity:s.capacity,serviceUsed:s.used,serviceStaff:s.staff,serviceOutsourcing:s.outsourced,servicePlatform:s.platform,serviceDirect:s.direct,commercialSalesStaff:s.sales})};
const serviceCatalog=projectCatalog;
projectCatalog=function(p){const out=serviceCatalog(p);if(!p.serviceDesk)for(const k of Object.keys(SERVICE_APPLICATIONS))delete out[k];return out};



function normalizeServicePolicy(p,plan){
 if(p.serviceDesk){plan.servicePolicy=plan.servicePolicy||JSON.parse(JSON.stringify(p.serviceDesk.policy));validateServicePolicy(p,plan.servicePolicy,plan.allocation)}
 else if(plan.servicePolicy||plan.contractExit)throw Error('Service desk policies require a new expanded-service pilot.');
}

const serviceResolveV1=resolveOpportunities;
resolveOpportunities=function(g,plans){
 if(g.serviceExpansionVersion!==1)return serviceResolveV1(g,plans);
 // Dedicated bankers cannot simultaneously acquire ordinary commercial opportunities.
 const allocations=g.players.map(p=>p.allocation);let L;
 try{g.players.forEach(p=>p.allocation={...p.allocation,business:commercialSalesStaff(p)});L=contractResolve(g,plans)}finally{g.players.forEach((p,i)=>p.allocation=allocations[i])}
 for(const c of g.serviceAgreements){
  if(c.owner){const owner=g.players.find(p=>p.id===c.owner),row=serviceLoad(owner).rows.find(x=>x.id===c.id);c.misses=row&&row.served?0:Math.min(2,c.misses+1);
   if(c.misses===2&&c.due>g.cycle){c.due=g.cycle+1;L.push(SERVICE_TYPES[c.kind].name+' in '+g.territories[c.market].name+' will reopen next cycle after two missed service turns.')}}
 }
 syncServiceBook(g);
 for(const c of g.serviceAgreements){
  if(c.due!==g.cycle||c.companyClosed)continue;
  const order=[...g.players].sort((a,b)=>(b.id===c.owner)-(a.id===c.owner)||a.id.localeCompare(b.id));
  const outside=10+simulationRandom()*4;let winner=null,best=outside;
  for(const p of order){const i=g.players.indexOf(p);if(plans[i].contractExit===c.id||(c.owner!==p.id&&plans[i].contractBid!==c.id)||!serviceBidStatus(p,c).eligible)continue;
   const score=contractPower(g,p,c)+simulationRandom()*4;if(score>best){best=score;winner=p.id}}
  const prior=c.owner;c.owner=winner;c.due=g.cycle+CONTRACT_TERM;c.misses=0;
  c.fee=Math.round(SERVICE_TYPES[c.kind].fee*(winner?SERVICE_PRICING[g.players.find(p=>p.id===winner).serviceDesk.policy.pricing[c.kind]].mult:1));
  L.push((winner?g.players.find(p=>p.id===winner).name:'Outside providers')+(prior===winner?' renewed ':' won ')+SERVICE_TYPES[c.kind].name+' in '+g.territories[c.market].name+' at $'+c.fee.toLocaleString()+'/turn from next cycle. Next contest: cycle '+c.due+'.');
  syncServiceBook(g);
 }
 return L;
};

function planServiceDesk(g,index,plan){
 const p=g.players[index];
 if(!p.serviceDesk)return plan;
 const policy=JSON.parse(JSON.stringify(p.serviceDesk.policy));
 policy.outsourcing=0;
 policy.payroll=!!p.serviceDesk.applications.payroll&&p.serviceDesk.contracts.some(c=>c.kind==='payroll');
 policy.treasury=!!p.serviceDesk.applications.treasury;
 policy.pricing={payroll:'standard',merchant:'standard',treasury:'standard'};
 const due=g.serviceAgreements.filter(c=>!c.companyClosed&&c.due===g.cycle&&c.owner!==p.id&& (c.kind!=='treasury'||policy.treasury));
 const demand=p.serviceDesk.contracts.reduce((n,c)=>n+SERVICE_TYPES[c.kind].load,0);
 policy.outsourcing=Math.min(4,demand);
 policy.staff=Math.min(plan.allocation.business,Math.ceil(Math.max(0,demand-4)/2));
 plan.servicePolicy=policy;
 plan.contractBid=null;
 plan.contractExit=null;
 for(const c of due){
  const need=demand+SERVICE_TYPES[c.kind].load,bidPolicy={...policy,outsourcing:Math.min(4,need),staff:Math.min(plan.allocation.business,Math.ceil(Math.max(0,need-4)/2))};
  const proposed={...p,allocation:plan.allocation,serviceDesk:{...p.serviceDesk,policy:bidPolicy}};
  if(serviceBidStatus(proposed,c).eligible&&contractPower(g,proposed,c)>=10){policy.staff=bidPolicy.staff;policy.outsourcing=bidPolicy.outsourcing;plan.contractBid=c.id;plan.opportunity=null;break}
 }
 if(!p.serviceDesk.contracts.some(c=>c.kind==='treasury')&&!g.serviceAgreements.some(c=>c.id===plan.contractBid&&c.kind==='treasury'))policy.treasury=false;
 if(p.stats.lastProfit>100000&&fundingPosition(p).excess===0){
  const key=p.serviceDesk.contracts.some(c=>c.kind==='payroll')&&!p.serviceDesk.applications.payroll?'deployPayrollDesk':!p.serviceDesk.applications.treasury?'buildTreasuryDesk':null,d=SERVICE_APPLICATIONS[key];
  if(d){const missing=d.requires.find(k=>strategyLevel(p,k)<1);
   if(missing){const current=plan.investments[missing]||0,amount=Math.min(50000,CAPABILITY_CAP_PER_CYCLE-current,capabilityNextCost(p,missing)-current,planBudget(p,plan).remaining);if(amount>=1000)plan.investments[missing]=current+Math.floor(amount)}
   else if(!projectBarred(p,key)&&!planInitiatives(plan).some(k=>SERVICE_APPLICATIONS[k]&&SERVICE_APPLICATIONS[k].app===d.app)){const budget=planBudget(p,plan);if(budget.remaining>=projectCost(p,PROJECTS[key])&&budget.freeCapacity>=d.capacity){plan.newProjects=[...planInitiatives(plan),key];plan.newProject=plan.newProjects[0]}}
  }
 }
 return plan;
}
// Advisory planning tools share the real operating preview, not a second economy.
// No saved balances, quoted contract terms or human intents are changed here.
function servicePlanReview(p,plan,economy){
 const planned={...p,focus:plan.focus||p.focus},forecast=operatingPreview(planned,plan,economy),budget=planBudget(planned,plan),exposure=riskAssets(p);
 const fundingLoss=forecast.fundingLoss||0,netOperating=forecast.profit-fundingLoss,includedOperatingSpend=(budget.advertising||0)+(budget.training||0)+(budget.relationshipOffers||0)+(budget.onboarding||0)+(budget.departmentFunctions||0)+(p.departmentFunctions?(forecast.facilityMaintenance||0):0)+(p.departmentOffice?(budget.departmentLeadership||0):0),nonOperatingSpend=budget.total-includedOperatingSpend,equityAfterPlan=p.stats.capital+netOperating-nonOperatingSpend;
 const reserve=exposure*.10+200000,lossBuffer=Math.max(0,-netOperating)*2;
 return {profit:forecast.profit,fundingLoss,netOperating,spend:budget.total,includedOperatingSpend,nonOperatingSpend,netAfterSpend:netOperating-nonOperatingSpend,equityAfterPlan,reserve,
  headroom:equityAfterPlan-reserve,spendingLimit:Math.max(0,Math.min(budget.capitalBudget,p.stats.capital-reserve-lossBuffer)),
  loanGrowth:forecast.loanGrowth,depositGrowth:forecast.depositGrowth,serviceNet:(forecast.contractFees||0)-(forecast.contractServicing||0)};
}
function serviceDeliveryOptions(p,plan,economy,mandate=null){
 if(!p.serviceDesk)return [];
 const policy=plan.servicePolicy||p.serviceDesk.policy,contracts=p.serviceDesk.contracts.map(c=>({...c}));
 if(mandate&&!contracts.some(c=>c.id===mandate.id))contracts.push({...mandate,fee:Math.round(SERVICE_TYPES[mandate.kind].fee*SERVICE_PRICING[policy.pricing[mandate.kind]].mult)});
 const demand=contracts.reduce((n,c)=>n+SERVICE_TYPES[c.kind].load,0),out=[];
 for(let staff=0;staff<=Math.min(plan.allocation.business,Math.ceil(demand/2));staff++){
  const outsourcing=Math.max(0,demand-staff*2);if(outsourcing>4)continue;
  const delivery={...policy,staff,outsourcing,pricing:{...policy.pricing}},copy={...p,focus:plan.focus||p.focus,allocation:{...plan.allocation},serviceDesk:{...p.serviceDesk,contracts,policy:delivery}};
  if(p.departmentFunctions){
   const quote=departmentFunctionsQuote({cycle:p.facilityLifecycle.lastActivatedCycle},copy,{...plan,servicePolicy:delivery});
   if(!quote.status.eligible)continue;
   copy._departmentFunctionExecution=quote.delivery;
  }
  const load=serviceLoad(copy);
  if(load.served!==load.count)continue;
  const forecast=operatingPreview(copy,{...plan,servicePolicy:delivery},economy);
  out.push({staff,outsourcing,capacity:load.capacity,demand,serviceNet:load.fees-load.cost,bankProfit:forecast.profit-(forecast.fundingLoss||0),policy:delivery});
 }
 return out.sort((a,b)=>b.bankProfit-a.bankProfit||a.staff-b.staff);
}
function serviceRecoveryPlan(p,plan,economy){
 const initial=servicePlanReview(p,plan,economy),stressed=capitalRatio(p)<10||initial.netOperating<60000||fundingPosition(p).excess>0;
 if(!stressed)return plan;
 // Evaluate only standing, reversible policies. No event or concealed rival intent
 // is inspected, and a loss is never cancelled or repaid with invented capital.
 let best=plan,bestScore=initial.netOperating;
 const candidates=[plan];
 for(const deposit of ['margin','balanced']){
  const next={...plan,allocation:{...plan.allocation},depositPolicy:deposit,capitalPolicy:'liquid',lendingPolicy:'conservative',termPolicy:{offer:'off',maturity:'release'},retailMix:{essential:4,rewards:0,highYield:0}};
  candidates.push(next);
  if(next.allocation.service>2){const sales={...next,allocation:{...next.allocation}};const moved=Math.min(2,sales.allocation.service-2);sales.allocation.service-=moved;sales.allocation.business+=moved;candidates.push(sales)}
  if(capitalRatio(p)<8&&next.allocation.lending>0){const runoff={...next,allocation:{...next.allocation}};runoff.allocation.operations+=runoff.allocation.lending;runoff.allocation.lending=0;candidates.push(runoff)}
 }
 for(const candidate of candidates){const r=servicePlanReview(p,candidate,economy);if(r.netOperating>bestScore+1000){best=candidate;bestScore=r.netOperating}}
 return best;
}

function planServiceReserve(g,index,plan){
 const original=g.players[index];
 if(!original.serviceDesk)return plan;
 const p={...original,focus:plan.focus,marketSnapshot:g.marketEconomy};
 plan=serviceRecoveryPlan(p,plan,g.economy);
 const limit=servicePlanReview(p,plan,g.economy).spendingLimit;
 for(const key of Object.keys(plan.investments||{})){const excess=Math.max(0,planBudget(p,plan).total-limit);plan.investments[key]=Math.max(0,plan.investments[key]-Math.ceil(excess));if(plan.investments[key]<1000)delete plan.investments[key]}
 if(planBudget(p,plan).total>limit)plan.hires=0;
 plan.newProjects=[...planInitiatives(plan)];
 while(plan.newProjects.length&&planBudget(p,plan).total>limit){plan.newProjects.pop();plan.newProject=plan.newProjects[0]||null}
 if(planBudget(p,plan).total>limit)plan.competitiveAction='none';
 return plan;
}
// An accepted initiative can lose cash/capacity between planning and execution.
// Preserve the cancellation rule, but never silently drop the player's order.


function validateServiceSave(g){
 if(g.serviceExpansionVersion===undefined){if(g.players.some(p=>p.serviceDesk||(p.projects||[]).some(x=>SERVICE_APPLICATIONS[x.key]))||(g.serviceAgreements||[]).some(c=>c.kind!==undefined||c.fee!==undefined||c.misses!==undefined))throw Error('Unversioned service expansion');return g}
 if(g.serviceExpansionVersion!==1||g.contractRulesVersion!==1)throw Error('Unsupported service expansion save');
 g.serviceAgreements.forEach((c,i)=>{if(c.kind!==['payroll','merchant','treasury'][i%3]||!Number.isInteger(c.misses)||c.misses<0||c.misses>2||!Object.values(SERVICE_PRICING).some(x=>c.fee===Math.round(SERVICE_TYPES[c.kind].fee*x.mult)))throw Error('Invalid service terms')});
 for(const p of g.players){
  const d=p.serviceDesk;if(!d||d.version!==1||!d.applications||Object.keys(d.applications).sort().join()!=='payroll,treasury'||typeof d.applications.payroll!=='boolean'||![null,'build','partner'].includes(d.applications.treasury))throw Error('Invalid service desk');
  // Loss of staff may reduce usable capacity; an accepted standing reservation is not rewritten.
  validateServicePolicy(p,d.policy);
  const expected=g.serviceAgreements.filter(c=>c.owner===p.id).map(({id,kind,fee,due,misses})=>({id,kind,fee,due,misses}));
  if(JSON.stringify(expected)!==JSON.stringify(d.contracts))throw Error('Service desk contract book mismatch');
  const seen=new Set();for(const x of p.projects){const def=SERVICE_APPLICATIONS[x.key];if(!def)continue;if(seen.has(def.app)||x.target!==null||def.requires.some(k=>strategyLevel(p,k)<1)||d.applications[def.app]===def.route||d.applications[def.app]==='build')throw Error('Invalid service deployment');seen.add(def.app)}
  if(p.submitted){validateServicePolicy(p,p.submitted.servicePolicy,p.submitted.allocation);validatePlan(g,p,p.submitted)}
 }
 return g;
}
const serviceNormalizeAllocation=normalizeAllocation;
normalizeAllocation=function(p){serviceNormalizeAllocation(p);if(p.serviceDesk)p.serviceDesk.policy.staff=Math.min(p.serviceDesk.policy.staff,p.allocation.business)};
// Living institution v1: bounded client differentiation and pre-lock delegation.
