function customerDemand(p,g,market,mix=p.retailLifecycle.mix){
 const macro=g&&g.economy||MACRO_REGIMES.steady,base=CUSTOMER_MARKETS[market];
 if(!base)throw Error('Unknown customer demand market');
 const raw={everyday:base.everyday*(macro.demand<1?1.15:1),connected:base.connected*macro.demand,reserve:base.reserve*(.8+macro.rate/20)};
 const total=Object.values(raw).reduce((a,b)=>a+b,0),emphasis=Object.values(mix).reduce((a,b)=>a+b,0);
 const models=marketFacilities(p,market),weights={essential:0,rewards:0,highYield:0},segments=[];
 let fit=0,cost=0;
 for(const [key,d]of Object.entries(CUSTOMER_SEGMENTS)){
  const share=raw[key]/total,channel=key==='everyday'&&models.includes('retail')?.08:key==='connected'&&models.includes('digital')?.1:0;
  let match=0;
  for(const product of Object.keys(weights)){const strength=d.fit[product]+channel;weights[product]+=share*mix[product]*strength;match+=mix[product]*strength/emphasis}
  fit+=share*match;cost+=share*match*d.onboarding;segments.push({key,name:d.name,share,fit:match,onboarding:d.onboarding});
 }
 return {market,segments,fit,onboardingRate:cost/fit,weights};
}
function customerBankFit(p,g,mix=p.retailLifecycle.mix){
 const snapshot=g&&g.marketEconomy||marketContext&&marketContext.marketEconomy||p.marketSnapshot,rows=Object.keys(p.marketBook.markets).map(key=>{
  const m=snapshot&&snapshot.markets[key],outside=m?m.community.deposits+m.union.deposits:0;
  return {key,weight:outside*marketReach(p,key),demand:customerDemand(p,g,key,mix)};
 });
 const total=rows.reduce((n,r)=>n+r.weight,0);
 return total?rows.reduce((n,r)=>n+r.weight*r.demand.fit,0)/total:1;
}
function retailAcquisitionMix(p,g,market){return p.customerDemandVersion>=1?customerDemand(p,g,market).weights:p.retailLifecycle.mix}
function initializeCustomerDemand(g,o){
 if(![1,2].includes(o.customerDemandVersion))return g;
 if(g.managementVersion!==2)throw Error('Customer needs requires Living institution relationship rules');
 g.customerDemandVersion=o.customerDemandVersion;g.version=o.customerDemandVersion===2?'8.4':'8.3';for(const p of g.players)p.customerDemandVersion=o.customerDemandVersion;return g;
}
const customerSupply=marketSupply;
marketSupply=function(g,p,freeze=false){
 const supply=customerSupply(g,p);if(![1,2].includes(p.customerDemandVersion)||freeze)return supply;
 for(const key of Object.keys(supply.deposits)){
  const fit=Math.min(1,customerDemand(p,g,key).fit);
  for(const r of ['deposits','customers'])supply[r][key]=Math.floor(supply[r][key]*fit);
 }
 return supply;
};
const customerOption=productOption;
productOption=function(p,line){
 const base=customerOption(p,line);if(line!=='retail'||![1,2].includes(p.customerDemandVersion))return base;
 const fit=customerBankFit(p,depositWorld||marketContext);
 return {...base,deposits:base.deposits*fit,customers:base.customers*fit};
};
const customerOutside=moveOutside;
moveOutside=function(p,r,requested,target=null,limited=false){
 const before=p._customerIntake&&r==='deposits'&&requested>0&&limited?Object.fromEntries(Object.entries(p.marketBook.markets).map(([k,m])=>[k,m.deposits])):null;
 const moved=customerOutside(p,r,requested,target,limited);
 if(before)for(const [key,m]of Object.entries(p.marketBook.markets)){
  const n=m.deposits-before[key];if(n<=0)continue;
  const row=p._customerIntake[key],d=customerDemand(p,marketContext,key);
  row.deposits+=n;row.cost+=Math.round(n*d.onboardingRate);
 }
 return moved;
};
const customerReport=adjustDepositReport;
adjustDepositReport=function(p,g,r){
 customerReport(p,g,r);if(!p._customerIntake)return;
 const rows=JSON.parse(JSON.stringify(p._customerIntake)),cost=Object.values(rows).reduce((n,row)=>n+row.cost,0);
r.customerAcquisitionCost=cost;r.customerAcquiredDeposits=Object.values(rows).reduce((n,row)=>n+row.deposits,0);
 r.expense+=cost;r.profit-=cost;
};


function customerMixPlan(g,p,input){
 if(![1,2].includes(p.customerDemandVersion))return input;
 const candidates=[input.retailMix,{essential:4,rewards:0,highYield:0}];
 for(const product of ['rewards','highYield'])if(p.productDeployment.ready[product])candidates.push({essential:1,rewards:0,highYield:0,[product]:3});
 let chosen=input,value=-Infinity;
 for(const mix of candidates){
  const plan={...input,retailMix:{...mix}},r=operatingPreview({...p,marketSnapshot:g.marketEconomy},plan,g.economy);
  // A bounded planning preference, not revenue: value new franchise balances at 0.5%.
  const score=r.profit-(r.fundingLoss||0)+Math.max(0,r.depositGrowth)*.005;
  if(score>value){value=score;chosen=plan}
 }
 return chosen;
}



function validateCustomerSave(g){
 if(g.customerDemandVersion===undefined){if(g.players.some(p=>p.customerDemandVersion!==undefined||p._customerIntake!==undefined))throw Error('Unversioned customer demand');return g}
 if(![1,2].includes(g.customerDemandVersion)||g.managementVersion!==2||g.version!==(g.creditPerformanceVersion===1?'8.7':g.customerOwnershipVersion===1?'8.6':g.workforceVersion===1?'8.5':g.customerDemandVersion===2?'8.4':'8.3'))throw Error('Unsupported customer demand rules');
 for(const p of g.players){
  if(p.customerDemandVersion!==g.customerDemandVersion||p._customerIntake!==undefined)throw Error('Invalid customer demand state');
  const report=p.operatingReport;
if(report&&(!['customerAcquisitionCost','customerAcquiredDeposits'].every(k=>Number.isSafeInteger(report[k])&&report[k]>=0)||report.customerAcquiredDeposits!==report.depositGrowth+report.depositRunoff))throw Error('Invalid customer acquisition report');
 }
 return g;
}


// Relationship quality v1: persistent service goodwill, not customer ownership.
