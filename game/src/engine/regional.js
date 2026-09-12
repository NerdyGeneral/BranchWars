function regionalOperations(p){return !!(p.regionalOperations&&p.regionalOperations.version===1)}
function regionalBranchMetrics(p){
 const rows=Object.entries(REGIONAL_MARKETS).filter(([key])=>Object.prototype.hasOwnProperty.call(p.branches,key)).map(([key,profile])=>{
  const models=marketFacilities(p,key),state=p.regionalOperations.markets[key],offices=models.length;
  if(p.facilityNetwork?.version===2){
   const local=p.facilityNetwork.offices.filter(o=>o.closedCycle===null&&o.market===key),raw=local.map(o=>facilityRawOfficeMetrics(p,o));
   return {key,...profile,offices,service:state.service,automation:state.automation,
    baseExpense:local.reduce((n,o)=>n+(INSTITUTION_FACILITY_BASE[o.model]?.upkeep??(o.model==='digital'?12000:22000)),0),
    expense:Math.round(raw.reduce((n,r)=>n+r.expense,0)),depositCapacity:Math.round(raw.reduce((n,r)=>n+r.depositCapacity,0)),
    loanCapacity:Math.round(raw.reduce((n,r)=>n+r.loanCapacity,0))};
  }
  const baseExpense=models.reduce((n,m)=>n+(m==='digital'?12000:22000),0);
  const expense=Math.round(baseExpense*profile.rent*(1-state.automation*.12)+offices*state.service*2000);
  const deposits=Math.round(models.reduce((n,m)=>n+(m==='retail'?450000:m==='digital'?320000:230000),0)*profile.deposits*(1+state.service*.15));
  const loans=Math.round(models.reduce((n,m)=>n+(m==='commercial'?430000:m==='retail'?250000:150000),0)*profile.loans);
  return {key,...profile,offices,service:state.service,automation:state.automation,baseExpense,expense,depositCapacity:deposits,loanCapacity:loans};
 });
 const metrics={rows,expense:rows.reduce((n,r)=>n+r.expense,0),depositCapacity:100000+rows.reduce((n,r)=>n+r.depositCapacity,0),loanCapacity:100000+rows.reduce((n,r)=>n+r.loanCapacity,0)};
 return p.facilityLifecycle?facilityLifecycleRegionalMetrics(p,metrics):p.facilityNetwork?FacilityNetwork.adjustRegionalMetrics(p,metrics,facilityRawOfficeMetrics):metrics;
}
Object.assign(PROJECTS,{
 branchService:{name:'Relationship Service Upgrade',cost:140000,cycles:2,capacity:1,target:true,kind:'branchUpgrade',regionalOnly:true,desc:'Upgrade this market (max 2): +15% local deposit onboarding capacity and +0.8 competitive deposit pull per level; +$2K monthly per office.'},
 branchAutomation:{name:'Branch Workflow Automation',cost:180000,cycles:3,capacity:1.5,target:true,kind:'branchUpgrade',regionalOnly:true,desc:'Upgrade this market (max 2): cut local base facility expense by 12% per level. No free customer growth.'},
 branchClose:{name:'Consolidate One Office',cost:40000,cycles:1,capacity:.5,target:true,kind:'branchClosure',regionalOnly:true,desc:'Close the last-opened office in this market. Save its recurring costs, but lose its onboarding capacity and competitive pull. No asset-sale proceeds.'}
});
// Group5: new identified models use paid ordinary project execution. Catalog
// costs are provisional; no construction instantly creates customer balances.
const INSTITUTION_FACILITY_BASE=Object.freeze({
 atm:Object.freeze({cost:150000,upkeep:4500}),wealth:Object.freeze({cost:800000,upkeep:25000}),
 financialCenter:Object.freeze({cost:1400000,upkeep:48000}),regionalHub:Object.freeze({cost:1850000,upkeep:62000})
});
Object.assign(PROJECTS,{
 branchAtm:{name:'ATM / Micro Service Point',cost:150000,cycles:1,capacity:.5,target:true,kind:'branch',facility:'atm',institutionOnlyVersion:5,
  desc:'Small local deposit/service footprint. Requires staffed service and operations support; no lending or free customer book.'},
 branchWealth:{name:'Wealth Advisory Office',cost:800000,cycles:3,capacity:1.5,target:true,kind:'branch',facility:'wealth',institutionOnlyVersion:5,
  desc:'Specialized advisory location. Requires a licensed operating wealth subsidiary and dedicated qualified staff; unavailable until that business exists.'},
 branchFinancialCenter:{name:'Integrated Financial Center',cost:1400000,cycles:4,capacity:2,target:true,kind:'branch',facility:'financialCenter',institutionOnlyVersion:5,
  desc:'Large retail, commercial and lending facility with substantial staffing and upkeep. Advisory throughput remains unavailable without a licensed subsidiary.'},
 branchRegionalHub:{name:'Regional Operations Hub',cost:1850000,cycles:5,capacity:2.5,target:true,kind:'branch',facility:'regionalHub',institutionOnlyVersion:5,
  desc:'High-overhead service hub. Staff can transfer finite service throughput to explicitly linked nearby offices in the same region; it does not create customers.'}
});
function facilityProjectIssue(p,key){
 const def=PROJECTS[key];if(def?.institutionOnlyVersion!==5)return '';
 if(p.facilityNetwork?.version!==2)return 'Requires a new Group5 facility-lifecycle campaign.';
 if(def.facility==='wealth'){
  if(p.accounting?.version!==4)return 'A licensed operating wealth subsidiary is required; an insurance agency is not a wealth license.';
  if(!(p.branches[p.focus]>0))return 'Open a wealth office where you already operate: an existing office in the focus market is required.';
 }
 return '';
}
function regionalProjectPreview(p,key,target){
 if(!regionalOperations(p)||!REGIONAL_MARKETS[target])return null;
 const def=PROJECTS[key];if(!def||!(def.kind==='branch'||def.regionalOnly))return null;
 const q=JSON.parse(JSON.stringify(p)),before=regionalBranchMetrics(q),state=q.regionalOperations.markets[target];
 if(def.kind==='branch'){if((q.branches[target]||0)>=3||facilityProjectIssue(q,key))return null;if(q.facilityNetwork){const cycle=q.facilityLifecycle?.lastActivatedCycle||q.facilityNetwork.lastActivatedCycle||1,o=FacilityNetwork.open(q,target,def.facility,cycle);if(q.facilityLifecycle)facilityLifecycleRegisterOffice(q,o.id,cycle);}else{q.facilityMarkets[target]=q.facilityMarkets[target]||[];q.facilityMarkets[target].push(def.facility);q.branches[target]=(q.branches[target]||0)+1}}
 else if(key==='branchClose')closeRegionalOffice(q,target);
 else if(key==='branchService')state.service=Math.min(2,state.service+1);
 else if(key==='branchAutomation')state.automation=Math.min(2,state.automation+1);
 const after=regionalBranchMetrics(q);return {expense:after.expense-before.expense,depositCapacity:after.depositCapacity-before.depositCapacity,loanCapacity:after.loanCapacity-before.loanCapacity};
}

function closeRegionalOffice(p,key,cycle){
 if(p.facilityNetwork){const office=FacilityNetwork.lastOffice(p,key);if(!office)return false;FacilityNetwork.close(p,office.id,cycle||p.facilityLifecycle?.lastActivatedCycle||p.facilityNetwork.lastActivatedCycle||office.openedCycle);if(p.facilityLifecycle)facilityLifecycleCloseOffice(p,office.id);if(!p.branches[key])p.regionalOperations.markets[key]={service:0,automation:0};return true;}
 const models=p.facilityMarkets[key]||[],model=models.pop();if(!model)return false;
 p.facilities[model]=Math.max(0,p.facilities[model]-1);p.branches[key]=models.length;
 if(!models.length)p.regionalOperations.markets[key]={service:0,automation:0};
 return true;
}


const regionalPull=depositPull;
depositPull=function(p,key,t){const share=p.facilityNetwork&&p.branches[key]?effectiveFacilityBranches(p,key)/p.branches[key]:1;return regionalPull(p.facilityNetwork?{...p,branches:{...p.branches,[key]:effectiveFacilityBranches(p,key)}}:p,key,t)+(regionalOperations(p)&&p.branches[key]>0?p.regionalOperations.markets[key].service*.8*share:0)};
const regionalExits=resolveMarketExits;
resolveMarketExits=function(g){
 if(g.regionalEconomyVersion!==1)return regionalExits(g);
 const lines=[];
 // Group8 lets a full withdrawal stand, so total market domination can resolve.
 // Every earlier group clears the flag each cycle and can never reach that end.
 const enduring=g.financialGroupVersion===8;
 for(const [key,t]of activeTerritories(g))for(let i=0;i<2;i++){
  const p=g.players[i];t.exited=enduring&&Array.isArray(t.exited)?t.exited:[false,false];
  const rival=g.players[1-i],protectedNow=t.reentryUntil&&t.reentryUntil[i]>=g.cycle;
  const ceded=enduring&&!p.branches[key]&&rival.branches[key]>0;
  t.exitStreak[i]=(p.branches[key]>0||ceded)&&t.shares[i]<12&&!protectedNow?t.exitStreak[i]+1:0;
  if(t.exitStreak[i]===3)lines.push(p.name+' has a vulnerable office in '+t.name+': three more cycles below 12% share will close one office. Service upgrades and deposit defense can help.');
  if(t.exitStreak[i]>=6&&ceded&&!t.exited[i]){
   t.exitStreak[i]=0;t.exited[i]=true;delta(p,'reputation',-2);
   lines.push(p.name+' has conceded '+t.name+': no offices and under 12% share for six cycles. Paid re-entry stays open.');
  }
  else if(t.exitStreak[i]>=6&&closeRegionalOffice(p,key,g.cycle)){
   t.exitStreak[i]=0;delta(p,'reputation',-3);
   if(enduring&&!p.branches[key]){t.exited[i]=true;lines.push(p.name+' has left '+t.name+' entirely. Paid re-entry stays open while a rival holds the market.')}
   else lines.push(p.name+' withdrew one office from '+t.name+'. Remaining offices and paid re-entry are preserved.')
  }
 }
 return lines;
};
function initializeRegionalOffices(g,o){
 if(!pilot(g)||o.regionalEconomyVersion===0)return g;
 g.regionalEconomyVersion=1;
 for(const p of g.players)p.regionalOperations={version:1,markets:Object.fromEntries(Object.keys(g.territories).map(k=>[k,{service:0,automation:0}]))};
 return g;
}

function validateRegionalSave(g){
 if(g.regionalEconomyVersion===undefined){if(g.players.some(p=>p.regionalOperations))throw Error('Unversioned regional operations');return g}
 if(g.regionalEconomyVersion!==1||!pilot(g))throw Error('Unsupported regional operations save');
 for(const p of g.players){
  if(!regionalOperations(p)||Object.keys(p.regionalOperations.markets||{}).length!==6)throw Error('Invalid regional operations');
  for(const key of Object.keys(g.territories)){const state=p.regionalOperations.markets[key];if(!REGIONAL_MARKETS[key]||!state||Object.keys(state).length!==2||!['service','automation'].every(k=>Number.isInteger(state[k])&&state[k]>=0&&state[k]<=2))throw Error('Invalid regional branch upgrades')}
 }
 return g;
}


function planRegionalOffice(g,index,plan){
 const actual=g.players[index];
 if(!regionalOperations(actual))return plan;
 const p={...actual,focus:plan.focus},local=key=>PROJECTS[key]&&(PROJECTS[key].kind==='branch'||PROJECTS[key].regionalOnly);
 let occupied=p.projects.some(x=>x.target===plan.focus&&local(x.key));
 plan.newProjects=planInitiatives(plan).filter(key=>{if(!local(key))return true;if(occupied)return false;occupied=true;return !projectBarred(p,key)});
 plan.newProject=plan.newProjects[0]||null;
 if(!occupied&&p.branches[plan.focus]>0&&p.stats.lastProfit>50000){
  const state=p.regionalOperations.markets[plan.focus],key=state.automation<2?'branchAutomation':state.service<2?'branchService':null;
  if(key&&!p.projects.some(x=>x.key===key)&&!projectBarred(p,key)&&projectCost(p,PROJECTS[key])<=Math.max(0,pilotSpendingLimit(p,.10,300000)-planBudget(p,plan).total)&&usedCapacity(p,[...plan.newProjects.map(k=>PROJECTS[k]),PROJECTS[key]])<=executionCapacity(p,plan.allocation))plan.newProjects.push(key);
 }
 plan.newProject=plan.newProjects[0]||null;
 const limit=pilotSpendingLimit(p,.10,200000+Math.max(0,-operatingPreview(p,plan,g.economy).profit)*2);
 for(const key of Object.keys(plan.investments||{})){const over=Math.max(0,planBudget(p,plan).total-limit);plan.investments[key]=Math.max(0,plan.investments[key]-Math.ceil(over));if(plan.investments[key]<1000)delete plan.investments[key]}
 if(planBudget(p,plan).total>limit)plan.hires=0;
 while(plan.newProjects.length&&planBudget(p,plan).total>limit){plan.newProjects.pop();plan.newProject=plan.newProjects[0]||null}
 if(planBudget(p,plan).total>limit)plan.competitiveAction='none';
 return plan;
}
// Market economy v1: conserved deposit and relationship franchises.
// Supporting institutions are customer-book competitors, not full simulated balance sheets.
