function defaultManagement(){return {version:1,research:{enabled:false,budget:50000,reserve:500000,priority:Object.keys(STRATEGY_BRANCHES),targets:Object.fromEntries(Object.keys(STRATEGY_BRANCHES).map(k=>[k,1]))},delivery:{mode:'manual',staffLimit:2,vendorLimit:4,salesFloor:1}}}
function validateManagement(m){
 const keys=Object.keys(STRATEGY_BRANCHES).sort().join(),integer=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
 if(!m||Object.keys(m).sort().join()!=='delivery,research,version'||m.version!==1)throw Error('Invalid management mandate');
 const r=m.research,d=m.delivery;
 if(!r||Object.keys(r).sort().join()!=='budget,enabled,priority,reserve,targets'||typeof r.enabled!=='boolean'||!integer(r.budget,0,250000)||r.budget%1000||!integer(r.reserve,0,10000000)||!Array.isArray(r.priority)||r.priority.length!==5||[...r.priority].sort().join()!==keys||!r.targets||Object.keys(r.targets).sort().join()!==keys||Object.values(r.targets).some(t=>!integer(t,0,4)))throw Error('Invalid recurring research limits');
 if(!d||Object.keys(d).sort().join()!=='mode,salesFloor,staffLimit,vendorLimit'||!['manual','profit','inhouse'].includes(d.mode)||!integer(d.staffLimit,0,100)||!integer(d.vendorLimit,0,4)||!integer(d.salesFloor,0,100))throw Error('Invalid service manager limits');
 return m;
}
function applyManagementPolicy(p,m){if(p.management)p.management=JSON.parse(JSON.stringify(validateManagement(m||p.management)))}
function clientProfile(c){return Number.isInteger(c.clientIndex)?ANCHOR_CLIENTS[c.clientIndex]||null:null}
function clientBidAdjustment(p,c){
 const f=clientProfile(c);if(!p.management||!f)return 0;
 if(f.priority==='price')return SERVICE_PRICING[p.serviceDesk.policy.pricing[c.kind]].power;
 if(f.priority==='controls')return Math.min(2,strategyLevel(p,'operations'));
 const load=serviceLoad(p),demand=load.rows.filter(x=>x.id!==c.id).reduce((n,x)=>n+x.load,0)+SERVICE_TYPES[c.kind].load;
 return (load.staff+specialistBusinessBonus(p,true))*2>=demand?2:0;
}
function initializeManagement(g,o){
 if(![1,2].includes(o.managementVersion))return g;
 if(g.serviceExpansionVersion!==1)throw Error('Living institution requires the expanded commercial services preview.');
 g.managementVersion=o.managementVersion;g.version='8.2';g.serviceAgreements.forEach((c,i)=>c.clientIndex=i);
 for(const p of g.players)p.management=defaultManagement();
 return g;
}
const institutionPower=contractPower;
contractPower=function(g,p,c){return institutionPower(g,p,c)+clientBidAdjustment(p,c)};

function normalizeManagementPolicy(p,plan){
 if(p.management){plan.management=JSON.parse(JSON.stringify(validateManagement(plan.management||p.management)))}
 else if(plan.management)throw Error('Management mandates require a Living institution campaign.');
}
// This is a pure DRAFT preparer, never called after a human locks a plan.
// Existing explicit bids, offers, projects, hires and manual investments are preserved.
function managementPlan(p,input,economy){
 const plan=JSON.parse(JSON.stringify(input)),notes=[];if(!p.management)return {plan,notes};
 const m=validateManagement(plan.management||p.management);plan.management=JSON.parse(JSON.stringify(m));
 const d=m.delivery;
 if(d.mode!=='manual'){
  const options=serviceDeliveryOptions(p,plan,economy).filter(o=>o.staff<=d.staffLimit&&o.outsourcing<=d.vendorLimit&&plan.allocation.business-o.staff>=d.salesFloor);
  if(d.mode==='inhouse')options.sort((a,b)=>a.outsourcing-b.outsourcing||b.bankProfit-a.bankProfit);
  const best=options[0],bid=plan.contractBid;
  if(best){
   const proposed={...p,allocation:plan.allocation,serviceDesk:{...p.serviceDesk,policy:best.policy}};
   // Do not invalidate an explicit bid. Without its public terms, leave the mix alone.
   if(!bid){plan.servicePolicy=best.policy;notes.push('Service manager staged '+best.staff+' bankers and '+best.outsourcing+' vendor points for the signed book.')}
   else notes.push('Service manager paused: explicit bid capacity remains under your control.');
  }else notes.push('Service manager paused: no fully supported mix fits the staff, vendor and sales limits. Existing capacity is unchanged.');
 }
 const r=m.research;
 if(r.enabled){
  let remaining=Math.max(0,r.budget-Object.values(plan.investments||{}).reduce((n,v)=>n+v,0));
  plan.investments=plan.investments||{};
  for(const key of r.priority){
   const target=r.targets[key],already=plan.investments[key]||0;if(!target)continue;
   const room=Math.max(0,CAPABILITY_TIERS[key][target-1]-capabilitySpend(p,key)-already);
   const budget=planBudget(p,plan),reserveRoom=p.stats.cash-r.reserve-budget.total;
   const advisory=servicePlanReview(p,plan,economy).spendingLimit-budget.total;
   const amount=Math.floor(Math.min(remaining,room,CAPABILITY_CAP_PER_CYCLE-already,budget.remaining,reserveRoom,advisory)/1000)*1000;
   if(amount>=1000){plan.investments[key]=already+amount;remaining-=amount;notes.push('Recurring research staged $'+amount.toLocaleString()+' for '+STRATEGY_BRANCHES[key].name+'.')}
  }
  if(remaining===r.budget)notes.push('Recurring research paused: targets reached, less than $1K remains, or cash/capital reserves prevent spending.');
 }
 return {plan,notes};
}

function planInstitutionManagement(g,index,plan){
 let p=g.players[index];
 if(!p.management)return plan;
 plan.management=JSON.parse(JSON.stringify(p.management));
 plan.management.research.enabled=true;
 plan.management.research.budget=25000;
 plan.management.delivery.mode='profit';
 return managementPlan({...p,focus:plan.focus,marketSnapshot:g.marketEconomy},plan,g.economy).plan;
}

function validateManagementSave(g){
 if(g.managementVersion===undefined){if(g.players.some(p=>p.management)||(g.serviceAgreements||[]).some(c=>c.clientIndex!==undefined))throw Error('Unversioned institution management');return g}
 if(![1,2].includes(g.managementVersion)||g.serviceExpansionVersion!==1)throw Error('Unsupported institution management save');
 if(g.serviceAgreements.length!==ANCHOR_CLIENTS.length)throw Error('Invalid anchor client roster');
 g.serviceAgreements.forEach((c,i)=>{if(c.clientIndex!==i)throw Error('Invalid anchor client identity')});
 for(const p of g.players){validateManagement(p.management);if(p.submitted)validateManagement(p.submitted.management)}
 return g;
}

// Relationship operations v1 (management v2): public delivery record, not free assets.
