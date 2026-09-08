const RETAIL_DEPLOYMENTS={
 rewards:{project:'deployRewards',branch:'network',name:'Rewards Checking',cost:180000},
 highYield:{project:'deployHighYield',branch:'digital',name:'High-Yield Savings',cost:220000}
};
for(const [product,d]of Object.entries(RETAIL_DEPLOYMENTS))PROJECTS[d.project]={name:'Deploy '+d.name,desc:'Requires completed '+STRATEGY_BRANCHES[d.branch].name+' tier 1. Uses 2 execution capacity; staff shortages stall delivery. Unlocks sales next planning cycle without creating balances or opening the offer automatically.',cost:d.cost,cycles:3,capacity:2,kind:'productDeployment',deploymentProduct:product};
function validateDeployedMix(p,mix){
 validateRetailMix(mix);
 if(p.productDeployment)for(const key of Object.keys(RETAIL_DEPLOYMENTS))if(mix[key]>0&&!p.productDeployment.ready[key])throw Error('Deploy '+RETAIL_DEPLOYMENTS[key].name+' in Operations initiatives before opening sales.');
}
function initializeProductDeployments(g,o){
 if(g.retailLifecycleVersion!==1||o.productDeploymentVersion===0)return g;
 g.productDeploymentVersion=1;for(const p of g.players)p.productDeployment={version:1,ready:{rewards:false,highYield:false}};
 return g;
}
const deploymentCatalog=projectCatalog;
projectCatalog=function(p){const out=deploymentCatalog(p);if(!p.productPrograms)for(const [k,d]of Object.entries(PROJECTS))if(d.programOnly)delete out[k];if(!p.productDeployment)for(const d of Object.values(RETAIL_DEPLOYMENTS))delete out[d.project];return out};


const deploymentMix=applyRetailMix;
applyRetailMix=function(p,mix){validateDeployedMix(p,mix);return deploymentMix(p,mix)};

function validateDeploymentPolicy(p,plan){
 if(p.productDeployment)validateDeployedMix(p,plan.retailMix)
}

function planProductDeployment(g,index,plan){
 const p=g.players[index];
 if(!p.productDeployment)return plan;
 for(const key of Object.keys(RETAIL_DEPLOYMENTS))if(!p.productDeployment.ready[key])plan.retailMix[key]=0;
 if(!Object.values(plan.retailMix).some(Boolean))plan.retailMix.essential=4;
 if(p.productPrograms)return plan;
 const key=index===0?'rewards':'highYield',d=RETAIL_DEPLOYMENTS[key];
 if(p.productDeployment.ready[key]||p.stats.lastProfit<=0||fundingPosition(p).excess>0)return plan;
 if(strategyLevel(p,d.branch)<1){
  const current=plan.investments[d.branch]||0,room=Math.min(50000,capabilityNextCost(p,d.branch)-current,CAPABILITY_CAP_PER_CYCLE-current,planBudget(p,plan).remaining);
  if(room>=1000)plan.investments[d.branch]=current+Math.floor(room);
 }else if(!projectBarred(p,d.project)&&!p.projects.some(x=>x.key===d.project)){
  const q=planBudget(p,plan),def=PROJECTS[d.project];
  if(q.remaining>=projectCost(p,def)&&q.freeCapacity>=projectCapacity(def)){plan.newProjects=[...planInitiatives(plan),d.project];plan.newProject=plan.newProjects[0]}
 }
 return plan;
}

function validateDeploymentSave(g){
 if(g.productDeploymentVersion===undefined){if(g.players.some(p=>p.productDeployment||(p.projects||[]).some(x=>PROJECTS[x.key]&&PROJECTS[x.key].deploymentProduct)))throw Error('Unversioned product deployment');return g}
 if(g.productDeploymentVersion!==1||g.retailLifecycleVersion!==1)throw Error('Unsupported product deployment save');
 for(const p of g.players){
  const state=p.productDeployment;
  if(!state||state.version!==1||!state.ready||Object.keys(state.ready).length!==2||Object.keys(RETAIL_DEPLOYMENTS).some(k=>typeof state.ready[k]!=='boolean'))throw Error('Invalid product deployment');
  validateDeployedMix(p,p.retailLifecycle.mix);if(p.submitted)validateDeployedMix(p,p.submitted.retailMix);
  const seen=new Set();for(const x of p.projects){const def=PROJECTS[x.key];if(!def||!def.deploymentProduct||p.productPrograms)continue;if(seen.has(x.key)||state.ready[def.deploymentProduct]||strategyLevel(p,RETAIL_DEPLOYMENTS[def.deploymentProduct].branch)<1||x.target!==null)throw Error('Invalid deployment project');seen.add(x.key)}
 }
 return g;
}
// Renewable service agreements v1. Fees are revenue, never invented deposit balances.
