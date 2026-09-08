function stats(){return{deposits:24000000,emergencyDebt:0,rateSensitiveDeposits:0,fundingCost:0,depositRunoff:0,loans:9500000,capital:1800000,customers:2050,business:58,merchant:38,wealth:12,reputation:62,digital:42,morale:68,staff:8,cash:2400000,compliance:12,attention:5,influence:12,momentum:50,earnings:0,lastProfit:0,chargeoffs:0,opportunityWins:0}}
const OPENING_STATS=stats();
function player(name,isBot=false,doctrine='community'){return{id:'bank-'+Math.floor(simulationRandom()*0x100000000).toString(16),name:(String(name||'Unnamed Financial Empire').trim().replace(/\s+/g,' ').slice(0,36)||'Unnamed Financial Empire'),stats:stats(),upgrades:{technology:0,training:0,analytics:0,wealth:0,operations:0},strategy:{network:0,digital:0,commercial:0,operations:0,acquisition:0},specializations:{},facilities:{retail:1,commercial:0,digital:0},facilityMarkets:{},products:{retail:'essential',business:'relationship',credit:'mortgage'},primaryStrategy:null,boardConcessions:0,capitalRestriction:0,allocation:{service:3,business:2,lending:2,operations:1},policies:{deposit:'balanced',lending:'balanced',capital:'balanced'},doctrine:DOCTRINES[doctrine]?doctrine:'community',achievements:[],focus:'downtown',branches:{},projects:[],hiresTotal:0,payrollSpend:0,buildSpend:0,capability:{network:0,digital:0,commercial:0,operations:0,acquisition:0},distress:0,fundingGap:0,capitalRequests:0,marketingTurns:0,lastCompetitiveAction:'none',submitted:null,mandate:pick(Object.keys(MANDATES)),isBot,turnEffects:{}}}
function delta(p,k,n){if(p.marketSupply&&!p.accounting&&MARKET_RESOURCES.includes(k)&&n>0)n=Math.min(n,marketAvailable(p,k));p.stats[k]=(p.stats[k]||0)+n;if(['reputation','digital','morale','compliance','attention','influence','momentum'].includes(k))p.stats[k]=clamp(Math.round(p.stats[k]),0,100);else p.stats[k]=p.fundingRulesVersion===2&&['capital','earnings'].includes(k)?Math.round(p.stats[k]):Math.max(0,Math.round(p.stats[k]))}
function riskAssets(p){return Math.max(1,p.stats.loans+(p.accounting?p.accounting.accounts.securities*.2:0)+(p.fundingRulesVersion===2?0:p.stats.deposits*.2))}
function capitalRatio(p){return p.stats.capital/riskAssets(p)*100}
function capitalTier(p){const r=capitalRatio(p);return CAPITAL_TIERS.find(t=>r>=t.min)}
function tierRank(p){return CAPITAL_TIERS.indexOf(capitalTier(p))}
const CAPABILITY_TIERS=Object.fromEntries(Object.entries(STRATEGY_BRANCHES).map(([k,b])=>{let run=0;return[k,b.nodes.map(node=>(run+=node.cost))]}));
const CAPABILITY_CAP_PER_CYCLE=250000;
function capabilitySpend(p,key){return Math.max(0,Number(p.capability&&p.capability[key])||0)}
function leadCapability(p){let best=null,bestShare=0,tied=false;for(const k of Object.keys(STRATEGY_BRANCHES)){const tiers=CAPABILITY_TIERS[k],share=capabilitySpend(p,k)/tiers[tiers.length-1];if(share>bestShare+1e-9){best=k;bestShare=share;tied=false}else if(Math.abs(share-bestShare)<=1e-9&&share>0)tied=true}return bestShare>0&&!tied?best:null}
function strategyLevel(p,key){const tiers=CAPABILITY_TIERS[key];if(!tiers)return 0;const spent=capabilitySpend(p,key);let level=0;for(let i=0;i<tiers.length;i++)if(spent>=tiers[i])level=i+1;return level}
function capabilityNextCost(p,key){const tiers=CAPABILITY_TIERS[key],spent=capabilitySpend(p,key);for(const t of tiers)if(spent<t)return t-spent;return 0}
function capabilityBenefit(p,branch){const benefits={network:()=>{delta(p,'reputation',3);delta(p,'customers',40)},digital:()=>delta(p,'digital',8),commercial:()=>{delta(p,'business',4);delta(p,'merchant',4)},operations:()=>{delta(p,'compliance',-5);delta(p,'morale',2)},acquisition:()=>delta(p,'influence',3)};if(benefits[branch])benefits[branch]()}
function applyInvestments(g,p,investments,specializations){const L=[];if(!investments)return L;const picks=specializations&&typeof specializations==='object'?specializations:{};for(const key of Object.keys(STRATEGY_BRANCHES)){const room=CAPABILITY_TIERS[key][CAPABILITY_TIERS[key].length-1]-capabilitySpend(p,key);const amount=Math.min(room,CAPABILITY_CAP_PER_CYCLE,Math.max(0,Math.round(Number(investments[key])||0)));if(amount<1000||p.stats.cash<amount||room<=0)continue;const before=strategyLevel(p,key);delta(p,'cash',-amount);p.capability[key]=capabilitySpend(p,key)+amount;const after=strategyLevel(p,key);for(let lvl=before+1;lvl<=after;lvl++){capabilityBenefit(p,key);const node=STRATEGY_BRANCHES[key].nodes[lvl-1];L.push(`${p.name} reached ${node.name} in ${STRATEGY_BRANCHES[key].name}.`)}if(strategyLevel(p,key)>=1&&!p.specializations[key]){const pick=picks[key];if(pick&&STRATEGY_SPECIALIZATIONS[key]&&STRATEGY_SPECIALIZATIONS[key][pick]){p.specializations[key]=pick;L.push(`${p.name} adopted the ${STRATEGY_SPECIALIZATIONS[key][pick].name} operating model in ${STRATEGY_BRANCHES[key].name}.`)}}}return L}
function hasSpecialization(p,branch,key){return p.specializations&&p.specializations[branch]===key}
function productOption(p,line){const group=PRODUCT_PORTFOLIOS[line],key=p.products&&group.options[p.products[line]]?p.products[line]:Object.keys(group.options)[0],option=group.options[key];if(line==='retail'&&(p.doctrine==='community'||hasSpecialization(p,'network','retailDensity'))){const community=p.doctrine==='community'?1.15:1,density=hasSpecialization(p,'network','retailDensity')?1.06:1;return{...option,customers:option.customers*community*density,deposits:option.deposits*community*density,funding:option.funding*(p.doctrine==='community'?.9:1),reputation:(option.reputation||0)+(density>1?.5:0)}}return option}
function strategyTotal(p){return Object.keys(STRATEGY_BRANCHES).reduce((n,k)=>n+strategyLevel(p,k),0)}
function strategyCapstone(p){return Object.keys(STRATEGY_BRANCHES).find(k=>strategyLevel(p,k)>=4)||null}
function doctrineProfile(p){
 const s=p.stats,a=p.allocation,staff=Math.max(1,s.staff),base=OPENING_STATS,BASE_MIX={service:.375,business:.25,lending:.25,operations:.125},share=k=>{const s=(a[k]||0)/staff,b=BASE_MIX[k]||.25;return Math.max(0,(s-b)/(1-b))};
 const cap=(x,lo,hi)=>Math.max(0,Math.min(1,(x-lo)/(hi-lo))),f=p.facilities||{};
 const capTotal=Math.max(1,Object.keys(STRATEGY_BRANCHES).reduce((t,k)=>t+capabilitySpend(p,k),0));
 const capShare=k=>capabilitySpend(p,k)/capTotal;
 const facTotal=3+(f.retail||0)+(f.commercial||0)+(f.digital||0);const payroll=Math.max(0,Number(p.payrollSpend)||0),built=Math.max(0,Number(p.buildSpend)||0),spendTotal=payroll+built+capTotal,payrollShare=spendTotal>0?payroll/spendTotal:0;
 const facShare=k=>(f[k]||0)/facTotal;
 const invested=capTotal>1?1:0;
 const raw={
  community:share('service')*1.1+capShare('network')*invested*1.15+facShare('retail')*.8,
  commercial:share('business')*1.25+capShare('commercial')*invested*1.15+facShare('commercial')*.8,
  digital:capShare('digital')*invested*1.5+facShare('digital')*1.15+share('lending')*.35,
  efficiency:share('operations')*1.45+capShare('operations')*invested*1.25,
  people:cap(payrollShare,.15,.55)*1.5+cap(s.morale,base.morale,96)*.5+capShare('acquisition')*invested*.35
 };
 let total=0;for(const k of Object.keys(raw)){raw[k]=Math.max(0,raw[k])+.05;total+=raw[k]}
 const out={};for(const k of Object.keys(raw))out[k]=raw[k]/total;
 return out}
function syncDoctrine(p){
 const profile=doctrineProfile(p);
 const ranked=Object.keys(profile).sort((x,y)=>profile[y]-profile[x]);
 const leader=ranked[0],current=DOCTRINES[p.doctrine]?p.doctrine:leader;
 if(leader!==current&&profile[leader]-profile[current]>.05)p.doctrine=leader;
 else p.doctrine=current;
 return p.doctrine}
function syncPrimaryStrategy(p){p.primaryStrategy=leadCapability(p);return p.primaryStrategy}
function strategyBarred(){return''}
function projectBarred(p,key){
 const def=PROJECTS[key];
 // Preserve legacy precedence: contract availability, local-office rules,
 // regulatory restrictions, retail deployment, then service applications.
 if(def&&def.contractOnly&&!p.serviceContracts)return 'Requires a new service-contract pilot.';
 if(def&&def.regionalOnly){
  if(!regionalOperations(p))return 'Available only in new Regional Operations pilots.';
  if(!(p.branches[p.focus]>0))return 'Requires an operating office in the focus market.';
  const field=key==='branchService'?'service':key==='branchAutomation'?'automation':null;
  if(field&&p.regionalOperations.markets[p.focus][field]>=2)return 'This market is already fully upgraded.';
 }
 const rank=tierRank(p);
 if(rank>=3)return 'All new projects are barred while undercapitalized.';
 if(rank>=1&&def&&['branch','acquisition'].includes(def.kind))return 'Expansion projects are suspended under regulatory supervision.';
 if((p.capitalRestriction||0)>0&&def&&['branch','acquisition'].includes(def.kind))return `Board assistance suspends expansion for ${p.capitalRestriction} more cycle${p.capitalRestriction===1?'':'s'}.`;
 const strategy=strategyBarred(p,key);if(strategy)return strategy;
 if(def&&(def.programOnly||p.productPrograms&&PRODUCT_PROGRAM_PROJECTS[key]))return productProgramBarred(p,key);
 if(def&&def.deploymentProduct){
  if(!p.productDeployment)return 'Requires a new product-deployment pilot.';
  if(p.productDeployment.ready[def.deploymentProduct])return 'Already deployed. Manage sales in Operations.';
  const d=RETAIL_DEPLOYMENTS[def.deploymentProduct];
  if(strategyLevel(p,d.branch)<1)return 'Complete '+STRATEGY_BRANCHES[d.branch].name+' tier 1 first. Research benefits apply next cycle.';
 }
 const app=SERVICE_APPLICATIONS[key];if(!app)return '';
 if(!p.serviceDesk)return 'Requires a new expanded-service pilot.';
 const current=p.serviceDesk.applications[app.app];
 if(current===app.route||current==='build')return 'Already deployed. Activation is managed in Markets > Service Desk.';
 if(app.requires.some(k=>strategyLevel(p,k)<1))return 'Complete tier 1 in '+app.requires.map(k=>STRATEGY_BRANCHES[k].name).join(' + ')+'.';
 if(p.projects.some(x=>SERVICE_APPLICATIONS[x.key]&&SERVICE_APPLICATIONS[x.key].app===app.app))return 'This application already has a deployment in progress.';
 return '';
}
function upgradeLevel(p,key){const def=PROJECTS[key];return def&&def.upgrade?(p.upgrades[def.upgrade]||0):0}
function operationsLevel(p){return Math.max(strategyLevel(p,'operations'),p.upgrades.operations||0)}
const CAPACITY_PER_BANKER=2,BASE_CAPACITY=1.5,MAX_HIRES_PER_CYCLE=6,HIRE_BASE_COST=110000;
function executionCapacity(p,allocation=p.allocation){const ops=allocation&&Number.isFinite(allocation.operations)?allocation.operations:0;return Math.round((BASE_CAPACITY+(ops+specialistBonus(p,'operations',allocation))*CAPACITY_PER_BANKER+operationsLevel(p)*1.5)*10)/10}
function projectCapacity(def){return def&&Number.isFinite(def.capacity)?def.capacity:1.5}
function usedCapacity(p,extra=[]){return Math.round(([...p.projects.map(x=>PROJECTS[x.key]),...extra].reduce((s,d)=>s+projectCapacity(d),0))*10)/10}
function projectSlots(p,allocation=p.allocation){return Math.max(1,Math.floor(executionCapacity(p,allocation)/1.5))}
function hireCost(p,count){let total=0;const staff=p.stats.staff;for(let i=0;i<count;i++)total+=Math.round(HIRE_BASE_COST*(1+(staff+i)/45));return total}
function hireLimit(p){return MAX_HIRES_PER_CYCLE}
function planInitiatives(plan){if(!plan)return[];const list=Array.isArray(plan.newProjects)?plan.newProjects:(plan.newProject?[plan.newProject]:[]);const seen=new Set();return list.filter(k=>typeof k==='string'&&!seen.has(k)&&(seen.add(k),true))}
function planHires(plan){const n=Math.floor(Number(plan&&plan.hires)||0);return (n>0?n:0)+specialistHireCount(plan)}
function planBudget(p,plan){
 if(regionalOperations(p))p={...p,focus:plan.focus||p.focus};
 const initiatives=planInitiatives(plan),action=(COMPETITIVE_ACTIONS[plan.competitiveAction]||COMPETITIVE_ACTIONS.none).cost;
 const projects=initiatives.reduce((sum,key)=>sum+(projectDefinition(key)?projectCost(p,projectDefinition(key)):0),0);
 const research=Object.values(plan.investments||{}).reduce((sum,n)=>sum+Math.max(0,Math.round(Number(n)||0)),0);
 const hires=planHires(plan),recruiting=(hires?hireCost(p,hires):0)+(p.workforce?specialistHirePremium(plan):0);
 const productRetirement=p.productPrograms?(plan.productProgramPolicy?.retire?.length||0)*PRODUCT_RETIRE_COST:0;
 const advertising=p.advertising?(plan.advertisingPolicy||p.advertising.policy).budget:0;
 const base=action+projects+research+recruiting+productRetirement+advertising,training=p.workforce?workforceTrainingQuote(p,plan.workforcePolicy||p.workforce.policy,base).total:0,total=base+training;
 const capacity=executionCapacity(p,plan.allocation),load=usedCapacity(p,initiatives.map(projectDefinition).filter(Boolean));
 const quote={action,projects,research,recruiting,total,cash:p.stats.cash,remaining:p.stats.cash-total,capacity,load,freeCapacity:Math.round((capacity-load)*10)/10,basePayrollAdded:hires*18000};
 if(p.productPrograms)quote.productRetirement=productRetirement;
 if(p.advertising)quote.advertising=advertising;
 if(p.workforce){quote.training=training;quote.specialistPayrollAdded=Object.entries(SPECIALIST_ROLES).reduce((n,[k,d])=>n+(Number(plan.specialistHires?.[k])||0)*d.payroll,0)}
 if(p.accounting){quote.capitalBudget=pilotSpendingLimit(p);quote.remaining=Math.min(quote.remaining,quote.capitalBudget-quote.total)}
 return quote;
}
function fundingStep(p,plan,key,step){
 const spent=capabilitySpend(p,key),tiers=CAPABILITY_TIERS[key];if(!tiers)return 0;
 const next=tiers.find(x=>x>spent),limit=next?Math.min(CAPABILITY_CAP_PER_CYCLE,next-spent):0;
 const current=Math.max(0,Math.round(Number((plan.investments||{})[key])||0));
 if(step<0)return Math.max(0,current+step);
 const amount=Math.max(0,Math.min(limit,current+step,current+Math.max(0,planBudget(p,plan).remaining)));
 return amount>0&&amount<1000?0:amount;
}
function strategyCostMultiplier(){return 1}
function projectCycles(p,def){if(def.strategy){const node=STRATEGY_BRANCHES[def.strategy].nodes[strategyLevel(p,def.strategy)];return node?node.cycles:1}let cycles=def.cycles;if(def.kind==='branch'&&(strategyLevel(p,'network')>=2||hasSpecialization(p,'network','regionalHub')))cycles--;if(def.kind==='acquisition'&&strategyLevel(p,'acquisition')>=2)cycles--;if(operationsLevel(p)>=1&&cycles>=3)cycles--;return Math.max(1,cycles)}
function projectCost(p,def){
 let cost;
 if(def.strategy){
  const node=STRATEGY_BRANCHES[def.strategy].nodes[strategyLevel(p,def.strategy)];
  cost=node?Math.round(node.cost*strategyCostMultiplier(p,def.strategy)):0;
 }else{
  cost=def.cost;
  if(def.kind==='branch')cost*=1-strategyLevel(p,'network')*.08;
  if(def.kind==='acquisition')cost*=1-strategyLevel(p,'acquisition')*.1-(hasSpecialization(p,'acquisition','dealmaker')?.1:0);
  if(operationsLevel(p)>=3||hasSpecialization(p,'operations','lean'))cost*=.85;
  cost=Math.max(0,Math.round(cost));
 }
 // Local entry pricing applies after the existing whole-dollar rounding.
 return regionalOperations(p)&&def.kind==='branch'?Math.round(cost*(REGIONAL_MARKETS[p.focus]||{entry:1}).entry):cost;
}
function projectDefinition(key){return Object.prototype.hasOwnProperty.call(PROJECTS,key)?PROJECTS[key]:null}
function projectTerms(p,key,focus=p.focus){
 const def=projectDefinition(key);if(!def)return null;
 const owner=focus===p.focus?p:{...p,focus};
 return {key,cost:projectCost(owner,def),cycles:projectCycles(owner,def),capacity:projectCapacity(def),
  barred:projectBarred(owner,key),running:p.projects.some(x=>x.key===key),
  retired:!!def.legacy,atMaximum:!!(def.max&&upgradeLevel(p,key)>=def.max),
  branchFull:!!(def.kind==='branch'&&p.branches[focus]>=3)};
}
function projectPlanStatus(p,plan){
 const owner=regionalOperations(p)?{...p,focus:plan.focus}:p,chosen=planInitiatives(plan),quote=planBudget(owner,plan);
 const fail=(code,reason)=>({eligible:false,code,reason,quote});
 let load=usedCapacity(owner);
 for(const key of chosen){
  const def=PROJECTS[key],terms=projectTerms(owner,key,plan.focus);
  if(!terms)return fail('unknown','That strategic project does not exist.');
  if(key==='capital')return fail('capital-action','Capital requests are now an emergency board action.');
  if(terms.retired)return fail('retired',def.name+' is retired and can no longer be started.');
  if(terms.running)return fail('running',def.name+' is already under way.');
  load+=terms.capacity;
  if(load>quote.capacity+1e-9)return fail('capacity',`This plan needs ${load.toFixed(1)} execution capacity but staffs only ${quote.capacity.toFixed(1)}. Assign more bankers to Operations & Risk or start fewer initiatives.`);
  if(terms.branchFull)return fail('branch-full','That market already has maximum branch capacity.');
  if(terms.atMaximum)return fail('maximum','That capability is already at maximum level.');
  if(terms.barred)return fail('barred',terms.barred);
 }
 if(owner.stats.cash<quote.total)return fail('cash',`This plan commits $${quote.total.toLocaleString()} but only $${Math.round(owner.stats.cash).toLocaleString()} is available.`);
 if(owner.accounting&&quote.remaining<0)return fail('capital-reserve','This plan breaches the 8% post-spending capital reserve. Reduce initiatives, hiring, research or competitive spend.');
 if(regionalOperations(owner)){
  const local=key=>PROJECTS[key]&&(PROJECTS[key].kind==='branch'||PROJECTS[key].regionalOnly);
  const projects=chosen.filter(local),active=owner.projects.filter(x=>x.target===plan.focus&&local(x.key));
  if(projects.length>1||(projects.length&&active.length))return fail('office-conflict','Choose one office construction, upgrade or closure per market at a time.');
 }
 if(plan.capitalAction&&chosen.some(key=>['branch','acquisition'].includes(PROJECTS[key].kind)))return fail('board-expansion','Board assistance cannot be combined with an expansion initiative.');
 if(p.productPrograms){const products=chosen.filter(key=>PRODUCT_PROGRAM_PROJECTS[key]).map(key=>PRODUCT_PROGRAM_PROJECTS[key].product);if(new Set(products).size!==products.length||products.some(k=>plan.productProgramPolicy?.retire?.includes(k)))return fail('product-conflict','Choose one development route or retirement per product.');}
 if(p.serviceDesk){
  const apps=chosen.filter(key=>SERVICE_APPLICATIONS[key]).map(key=>SERVICE_APPLICATIONS[key].app);
  if(new Set(apps).size!==apps.length)return fail('application-conflict','Choose one deployment route per service application.');
 }
 return {eligible:true,code:null,reason:'',quote};
}
function projectTargetIssue(g,p,def,focus){
 if(!def.target)return '';
 const territory=g.territories[focus],index=g.players?g.players.findIndex(x=>x.id===p.id):g.me&&g.me.id===p.id?0:1;
 if(!territory||!unlocked(g,territory))return 'Choose an open focus market.';
 if(territory.exited&&territory.exited[index])return 'Your institution permanently exited that market. Choose an operating market.';
 return '';
}
function projectStartStatus(g,p,key){
 const terms=projectTerms(p,key),def=PROJECTS[key];
 const fail=code=>({eligible:false,code,terms});
 if(!terms)return fail('unknown');
 if(usedCapacity(p,[def])>executionCapacity(p))return fail('capacity');
 if(terms.running)return fail('running');
 if(projectTargetIssue(g,p,def,p.focus)||terms.branchFull)return fail('target');
 if(terms.atMaximum)return fail('maximum');
 if(terms.barred)return fail('barred');
 if(key==='capital'&&p.stats.influence<8)return fail('influence');
 if(p.stats.cash<terms.cost)return fail('cash');
 // The capital reserve is a planning constraint. Rechecking it here after
 // executive/rival effects would change already accepted campaign rules.
 return {eligible:true,code:null,terms};
}
function projectCatalog(p){return Object.fromEntries(Object.entries(PROJECTS).map(([k,d])=>{if(d.strategy){const branch=STRATEGY_BRANCHES[d.strategy],level=strategyLevel(p,d.strategy),node=branch.nodes[level];return[k,{...d,name:node?node.name:`${branch.name} Complete`,desc:node?node.desc:branch.promise,cost:projectCost(p,d),cycles:projectCycles(p,d),level,max:4,branchName:branch.name,barred:projectBarred(p,k)}]}return[k,{...d,cost:projectCost(p,d),cycles:projectCycles(p,d),barred:projectBarred(p,k)}]}))}
function capitalRequestStatus(p){const liquidity=p.stats.deposits?p.stats.cash/p.stats.deposits*100:100,requests=p.capitalRequests||0,rank=tierRank(p),eligible=requests<2&&(rank>=2||(rank>=1&&liquidity<.5))&&p.stats.influence>=10&&(p.capitalRestriction||0)===0;let reason='Emergency board assistance unlocks only at critical capital, or under supervision with severe liquidity stress.';if(requests>=2)reason='The board will not authorize a third rescue in this campaign.';else if(p.stats.influence<10)reason='Board assistance requires 10 executive influence.';else if((p.capitalRestriction||0)>0)reason=`Board oversight remains in force for ${p.capitalRestriction} cycle${p.capitalRestriction===1?'':'s'}.`;else if(eligible)reason='Immediate capital, but with oversight, expansion restrictions, and a permanent value concession.';return{eligible,reason,liquidity:Math.round(liquidity*10)/10,restriction:p.capitalRestriction||0,concessions:p.boardConcessions||0,requests}}
function networkGoal(g){return{town:3,regional:4,state:5,national:6}[g.scope]||6}
function branchGoal(g){return{town:4,regional:5,state:6,national:8}[g.scope]||8}
function milestoneDefinitions(g){return{...MILESTONES,builder:{...MILESTONES.builder,desc:`Operate ${branchGoal(g)} branch levels.`}}}
