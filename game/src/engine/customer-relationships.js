function customerRelationshipReview(p,key,allocation=p.allocation){
 if(p.householdBook)return householdServiceReview(p,allocation).rows.filter(r=>r.market===key).map(r=>({...r,name:CUSTOMER_SEGMENTS[r.segment].name}));
 const book=p.depositBook.cohorts.filter(c=>c.market===key),total=book.reduce((n,c)=>n+c.principal,0);
 const coverage=(allocation.service+specialistBonus(p,'service',allocation)+(p.upgrades.training||0)*.3)/Math.max(1,p.stats.customers/700);
 const upgrade=p.regionalOperations.markets[key].service;
 return Object.entries(CUSTOMER_SEGMENTS).map(([segment,def])=>{
  const current=p.customerRelationships.markets[key][segment];
  const fit=total?book.reduce((n,c)=>n+c.principal*def.fit[c.product],0)/total:1;
  const change=!total?Math.sign(50-current):(coverage<.8?-3:coverage<1?-1:1)+(fit>=1.05?1:fit<.85?-1:0)+(upgrade>0?1:0);
  return {segment,name:def.name,current,fit,coverage,next:clamp(current+change,0,100),change:clamp(current+change,0,100)-current};
 });
}

function serviceWorkforceOptions(p,input,economy){
 if(!p.customerRelationships)return null;
 const base=JSON.parse(JSON.stringify(input)),roles=Object.keys(ROLES);
 const valid=a=>a&&roles.every(k=>Number.isSafeInteger(a[k])&&a[k]>=0)&&roles.reduce((n,k)=>n+a[k],0)===p.stats.staff;
 if(!valid(base.allocation))return {error:'Allocate every existing banker before comparing service plans.',options:[]};
 const candidates=[{id:'current',name:'Keep current draft',allocation:{...base.allocation}}];
 for(const role of ['business','lending','operations']){
  for(const direction of [1,-1]){
   const allocation={...base.allocation};allocation.service+=direction;allocation[role]-=direction;
   candidates.push({id:role+(direction===1?'-to-service':'-from-service'),name:direction===1?'Move one from '+ROLES[role].name+' to Retail & Service':'Move one from Retail & Service to '+ROLES[role].name,allocation});
  }
 }
 const options=candidates.map(c=>{
  const plan={...base,allocation:c.allocation},reasons=[];
  if(!valid(c.allocation))reasons.push('No banker available in the source department.');
  const desk=base.servicePolicy||p.serviceDesk?.policy;
  if(desk&&c.allocation.business<desk.staff)reasons.push('Would remove a banker reserved for signed commercial services.');
  if(base.contractBid&&c.allocation.business<Math.max(1,(desk?.staff||0)+1))reasons.push('Keep a Business sales banker for the explicit service bid.');
  const budget=planBudget(p,plan);
  if(budget.load>budget.capacity)reasons.push('Would leave active or planned initiatives above execution capacity.');
  const forecast=reasons.length?null:operatingPreview({...p,focus:base.focus},plan,economy);
  return {...c,blocked:reasons.length>0,reasons,budget,forecast,bankProfit:forecast?forecast.profit-(forecast.fundingLoss||0):null};
 });
 const hirePlan={...base,hires:(base.hires||0)+1},budget=planBudget(p,base),hireBudget=planBudget(p,hirePlan);
 const hireBlocked=planHires(hirePlan)>hireLimit(p)||hireBudget.remaining<0;
 return {options,customers:p.stats.customers,requiredService:p.householdBook?Math.max(0,Math.ceil((householdServiceReview(p,base.allocation,base.householdPolicy||p.householdBook.policy).demand-(p.upgrades.training||0)*.3)/((base.householdPolicy||p.householdBook.policy).retention/100)-specialistBonus(p,'service',base.allocation))):Math.max(0,Math.ceil(Math.max(1,p.stats.customers/700)-(p.upgrades.training||0)*.3-specialistBonus(p,'service',base.allocation))),
  hiring:{blocked:hireBlocked,total:planHires(hirePlan),incrementalCost:hireBudget.recruiting-budget.recruiting,basePayrollAdded:hireBudget.basePayrollAdded-budget.basePayrollAdded,
   reason:hireBlocked?'Hiring limit or current cash/capital commitments prevent another recruit.':'Recruit reports next cycle; allocate them then. No extra service capacity this turn.'}};
}

function customerRelationshipPressure(p,key){
 if(!p.customerRelationships)return 0;
 const owned=p.householdBook?.markets[key],total=owned?Object.values(owned).reduce((n,v)=>n+v,0):0;
 if(owned&&!total)return 0;
 const mix=owned?Object.fromEntries(Object.entries(owned).map(([k,n])=>[k,n/total*100])):CUSTOMER_MARKETS[key],values=p.customerRelationships.markets[key];
 return clamp(Object.keys(mix).reduce((n,k)=>n+(values[k]-50)*mix[k]/100,0)*.03,-1.5,1.5);
}
function initializeCustomerGoodwill(g,o){
 if(g.customerDemandVersion!==2)return g;
 for(const p of g.players)p.customerRelationships={version:1,lastCycle:0,markets:Object.fromEntries(Object.keys(g.territories).map(k=>[k,{everyday:50,connected:50,reserve:50}]))};
 return g;
}
const goodwillPull=depositPull;
depositPull=function(p,key,t){return goodwillPull(p,key,t)+customerRelationshipPressure(p,key)};

function updateCustomerRelationships(g,p,preview=false){
 if(!p.customerRelationships)return;
 const cycle=g.cycle||p.customerRelationships.lastCycle+1;
 if(p.customerRelationships.lastCycle!==cycle){
  for(const key of Object.keys(p.customerRelationships.markets))for(const row of customerRelationshipReview(p,key))p.customerRelationships.markets[key][row.segment]=row.next;
  p.customerRelationships.lastCycle=cycle;
 }
 p.operatingReport.relationshipCoverage=p.householdBook?householdServiceReview(p).coverage:(p.allocation.service+specialistBonus(p,'service')+(p.upgrades.training||0)*.3)/Math.max(1,p.stats.customers/700);
 p.operatingReport.relationshipPressure=customerRelationshipPressure(p,p.focus);

}

function validateGoodwillSave(g){
 if(g.customerDemandVersion!==2){if(g.players.some(p=>p.customerRelationships!==undefined))throw Error('Unversioned customer relationships');return g}
 for(const p of g.players){
  const r=p.customerRelationships,keys=Object.keys(g.territories).sort();
  if(!r||Object.keys(r).sort().join()!=='lastCycle,markets,version'||r.version!==1||!Number.isSafeInteger(r.lastCycle)||r.lastCycle<0||r.lastCycle>g.cycle||!r.markets||Object.keys(r.markets).sort().join()!==keys.join())throw Error('Invalid customer relationships');
  for(const row of Object.values(r.markets))if(!row||Object.keys(row).sort().join()!=='connected,everyday,reserve'||Object.values(row).some(n=>!Number.isInteger(n)||n<0||n>100))throw Error('Invalid relationship quality');
 }
 return g;
}
