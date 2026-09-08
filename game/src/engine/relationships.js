function relationshipBonus(g,p,c){const r=g.relationshipRecords&&g.relationshipRecords[c.id];return r&&c.owner===p.id&&r.owner===p.id?Math.min(2,r.streak*.25):0}
function initializeRelationships(g,o){
 if(g.managementVersion!==2)return g;
 g.relationshipRecords=Object.fromEntries(g.serviceAgreements.map(c=>[c.id,{owner:c.owner,streak:0,lastCycle:0,history:[]}]));
 return g;
}
const relationshipPower=contractPower;
contractPower=function(g,p,c){return relationshipPower(g,p,c)+relationshipBonus(g,p,c)};
const relationshipResolve=resolveOpportunities;
resolveOpportunities=function(g,plans){
 if(g.managementVersion!==2)return relationshipResolve(g,plans);
 const before=Object.fromEntries(g.serviceAgreements.map(c=>{
  const p=g.players.find(p=>p.id===c.owner),row=p&&serviceLoad(p).rows.find(r=>r.id===c.id);
  return [c.id,{owner:c.owner,fee:c.fee,served:p?!!(row&&row.served):null,renewal:c.due===g.cycle}];
 }));
 const lines=relationshipResolve(g,plans);
 for(const c of g.serviceAgreements){
  const a=before[c.id],r=g.relationshipRecords[c.id];
  r.streak=c.owner&&c.owner===a.owner&&a.served?Math.min(8,r.streak+1):0;r.owner=c.owner;r.lastCycle=g.cycle;
  r.history.push({cycle:g.cycle,from:a.owner,to:c.owner,fee:a.fee,served:a.served,renewal:a.renewal});
  r.history=r.history.slice(-12);
 }
 return lines;
};
// Owner-only scorecard. Desk net excludes shared payroll; never sum it with bank profit.
function departmentScorecard(p,plan,economy){
 const proposed={...p,allocation:plan.allocation,serviceDesk:p.serviceDesk?{...p.serviceDesk,policy:plan.servicePolicy||p.serviceDesk.policy}:undefined};
 const load=p.serviceDesk?serviceLoad(proposed):null,forecast=operatingPreview(p,plan,economy),budget=planBudget(p,plan);
 return {departments:Object.entries(ROLES).map(([key,role])=>({key,name:role.name,current:p.allocation[key],planned:plan.allocation[key]})),
 service:load?{demand:load.rows.reduce((n,r)=>n+r.load,0),capacity:load.capacity,served:load.served,count:load.count,fees:load.fees,direct:load.direct,vendors:load.outsourced,platforms:load.platform,net:load.fees-load.cost,sales:load.sales}:null,
 execution:{load:budget.load,capacity:budget.capacity},research:budget.research,recruiting:budget.recruiting,
 bankProfit:forecast.profit-(forecast.fundingLoss||0)};
}
// Bounded quote heuristic: own resources and public terms only, never rival intents.
function renewalPricingPlan(g,p,input){
 const plan=JSON.parse(JSON.stringify(input)),choices=[];
 if(g.managementVersion!==2)return {plan,choices};
 const due=g.serviceAgreements.filter(c=>c.due===g.cycle&&(c.owner===p.id||c.id===plan.contractBid)&&c.id!==plan.contractExit);
 for(const kind of Object.keys(SERVICE_TYPES)){
  const contracts=due.filter(c=>c.kind===kind);if(!contracts.length)continue;
  let best=plan.servicePolicy.pricing[kind],value=-Infinity;
  for(const key of Object.keys(SERVICE_PRICING)){
   const policy={...plan.servicePolicy,pricing:{...plan.servicePolicy.pricing,[kind]:key}},bank={...p,allocation:plan.allocation,serviceDesk:{...p.serviceDesk,policy}};
   const estimate=contracts.reduce((sum,c)=>{
    if(!serviceBidStatus(bank,c).eligible)return sum;
    const strength=contractPower(g,bank,c),proxy=Math.max(.05,Math.min(.95,(strength-8)/10));
    return sum+Math.round(SERVICE_TYPES[kind].fee*SERVICE_PRICING[key].mult)*proxy;
   },0);
   if(estimate>value){best=key;value=estimate}
  }
  plan.servicePolicy.pricing[kind]=best;choices.push({kind,price:best,estimatedFees:Math.round(value)});
 }
 return {plan,choices};
}



function validateRelationshipSave(g){
 if(g.managementVersion!==2){if(g.relationshipRecords!==undefined)throw Error('Unversioned relationship record');return g}
 if(g.version!=='8.2'&&!((['8.3','8.4','8.5','8.6','8.7','8.8','8.9','8.10','8.11','8.12','8.13'].includes(g.version)||(g.version==='8.14'&&g.featureRulesVersion===1)||(g.version==='8.15'&&g.productProgramsVersion===2)||(g.version==='9.0'&&g.financialGroupVersion===1)||(g.version==='9.1'&&g.financialGroupVersion===2)||(g.version==='9.2'&&g.financialGroupVersion===3))&&[1,2].includes(g.customerDemandVersion)))throw Error('Relationship operations requires a compatible save format');
 const records=g.relationshipRecords,ids=g.serviceAgreements.map(c=>c.id).sort();
 if(!records||Object.keys(records).sort().join()!==ids.join())throw Error('Invalid relationship roster');
 const owner=id=>id===null||g.players.some(p=>p.id===id);
 for(const c of g.serviceAgreements){
  const r=records[c.id];
  if(!r||Object.keys(r).sort().join()!=='history,lastCycle,owner,streak'||r.owner!==c.owner||!Number.isInteger(r.streak)||r.streak<0||r.streak>8||(!r.owner&&r.streak)||!Number.isSafeInteger(r.lastCycle)||r.lastCycle<0||r.lastCycle>g.cycle||!Array.isArray(r.history)||r.history.length>12)throw Error('Invalid service record');
  let previous=0;
  for(const e of r.history){if(!e||Object.keys(e).sort().join()!=='cycle,fee,from,renewal,served,to'||!Number.isSafeInteger(e.cycle)||e.cycle<=previous||e.cycle>g.cycle||!owner(e.from)||!owner(e.to)||![true,false,null].includes(e.served)||(e.from===null)!==(e.served===null)||typeof e.renewal!=='boolean'||!Object.values(SERVICE_PRICING).some(x=>e.fee===Math.round(SERVICE_TYPES[c.kind].fee*x.mult)))throw Error('Invalid relationship history');previous=e.cycle}
  if(r.history.length?(previous!==r.lastCycle||r.history.at(-1).to!==r.owner):r.lastCycle!==0||r.streak!==0)throw Error('Inconsistent relationship history');
  if(r.history.length!==Math.min(12,r.lastCycle)||r.history.some((e,i)=>e.cycle!==r.lastCycle-r.history.length+i+1))throw Error('Missing relationship history');
  let streak=0;for(const e of [...r.history].reverse()){if(!r.owner||e.from!==r.owner||e.to!==r.owner||e.served!==true)break;streak=Math.min(8,streak+1)}if(streak!==r.streak)throw Error('Inconsistent service streak');
 }
 return g;
}


// Customer demand v1: prospect-flow composition, not a second ownership/customer ledger.
