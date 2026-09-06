// Retail product programmes v1: delivery routes, planned retirement and local sales.
// No customer cash is created by development. Existing accounts retain their terms.
const PRODUCT_PROGRAM_ROYALTY = .0001, PRODUCT_RETIRE_COST = 25000, PRODUCT_LICENSE = 12000;
const PRODUCT_PROGRAM_PROJECTS = {
 deployRewards: { product: 'rewards', route: 'build' },
 deployHighYield: { product: 'highYield', route: 'build' },
 licenseRewards: { product: 'rewards', route: 'partner' },
 licenseHighYield: { product: 'highYield', route: 'partner' }
};
for (const [key,d] of Object.entries(PRODUCT_PROGRAM_PROJECTS)) if(d.route==='partner')
 PROJECTS[key]={name:'License '+RETAIL_DEPLOYMENTS[d.product].name,desc:'One-cycle vendor launch; no internal research gate. Shares execution capacity with other projects. Adds $12,000/month while available plus 0.01% of non-term product balances/month, including retired accounts. Sales open only when targeted next month.',cost:90000,cycles:1,capacity:1,kind:'productProgram',programOnly:true};
const productDefaultMix = () => ({essential:4,rewards:0,highYield:0});
function initializeProductPrograms(g,o) {
 if(o.productProgramsVersion!==1)return g;
 if(g.segmentDepositsVersion!==1)throw Error('Product programmes requires the segment deposits preview and its prerequisites.');
 g.productProgramsVersion=1;g.version='8.9';
 for(const p of g.players)p.productPrograms={version:1,products:{rewards:{route:'none',retired:false},highYield:{route:'none',retired:false}},
  markets:Object.fromEntries(Object.keys(p.marketBook.markets).map(k=>[k,Object.fromEntries(Object.keys(CUSTOMER_SEGMENTS).map(s=>[s,productDefaultMix()]))]))};
 return g;
}
function productTargetMix(p,market,segment) { return p.productPrograms?p.productPrograms.markets[market][segment]:p.retailLifecycle.mix; }
function productAggregateMix(markets) {
 const out={essential:0,rewards:0,highYield:0};
 for(const row of Object.values(markets))for(const mix of Object.values(row))for(const k of Object.keys(out))out[k]=Math.max(out[k],mix[k]);
 return out;
}
function productProgramAcquisitionMix(p,g) {
 const out={essential:0,rewards:0,highYield:0},productProspectSnapshot=g?.marketEconomy||marketContext?.marketEconomy||p.marketSnapshot;
 if(!productProspectSnapshot)return productDefaultMix();
 for(const [key,row]of Object.entries(p.productPrograms.markets)) {
  const market=productProspectSnapshot.markets[key],pool=market.segmentDeposits;
  const available=market.community.deposits+market.union.deposits;
  const weight=p.marketSupply?.deposits[key]??available*marketReach(p,key);
  if(!available||!weight)continue;
  for(const [s,mix]of Object.entries(row)){
   const total=Object.values(mix).reduce((n,w)=>n+w,0),share=(pool.community[s]+pool.union[s])/available;
   for(const k of Object.keys(out))out[k]+=weight*share*mix[k]/total;
  }
 }
 return Object.values(out).some(n=>n>0)?out:productDefaultMix();
}
function productProgramPolicy(p) { return {markets:JSON.parse(JSON.stringify(p.productPrograms.markets)),retire:[]}; }
function validateProductTargets(p,markets,retire=[]) {
 if(!markets||Object.keys(markets).sort().join()!==Object.keys(p.marketBook.markets).sort().join())throw Error('Choose product targets for every known market.');
 for(const row of Object.values(markets)) {
  if(!row||Object.keys(row).sort().join()!=='connected,everyday,reserve')throw Error('Choose each customer segment.');
  for(const mix of Object.values(row)) {
   validateRetailMix(mix);
   for(const k of Object.keys(RETAIL_DEPLOYMENTS))if(mix[k]&&(!p.productDeployment.ready[k]||retire.includes(k)))throw Error('Target only developed, non-retired products. Keep an available fallback for every segment.');
  }
 }
}
function normalizeProductProgramPlan(p,plan) {
 if(!p.productPrograms){if(plan.productProgramPolicy!==undefined)throw Error('Product programmes requires a new preview campaign.');return;}
 const policy=plan.productProgramPolicy||productProgramPolicy(p);
 if(Object.keys(policy).sort().join()!=='markets,retire'||!Array.isArray(policy.retire)||policy.retire.length>2||new Set(policy.retire).size!==policy.retire.length)throw Error('Invalid product retirement orders.');
 for(const key of policy.retire)if(!Object.hasOwn(RETAIL_DEPLOYMENTS,key)||!p.productDeployment.ready[key]||p.projects.some(x=>PRODUCT_PROGRAM_PROJECTS[x.key]?.product===key))throw Error('Retire only an available product without a rollout in progress.');
 validateProductTargets(p,policy.markets,policy.retire);
 const chosen=planInitiatives(plan).map(k=>PRODUCT_PROGRAM_PROJECTS[k]).filter(Boolean);
 if(new Set(chosen.map(x=>x.product)).size!==chosen.length||chosen.some(x=>policy.retire.includes(x.product)))throw Error('Choose one development route or retirement per product, not both.');
 plan.productProgramPolicy=JSON.parse(JSON.stringify(policy));
 // The old global mix is a derived compatibility projection, never a second authority.
 plan.retailMix=productAggregateMix(policy.markets);
}
function applyProductProgramPolicy(p,policy,settle=false) {
 if(!p.productPrograms)return;
 const input={productProgramPolicy:policy};normalizeProductProgramPlan(p,input);policy=input.productProgramPolicy;
 if(settle&&policy.retire.length)delta(p,'cash',-PRODUCT_RETIRE_COST*policy.retire.length);
 for(const k of policy.retire){p.productPrograms.products[k].retired=true;p.productDeployment.ready[k]=false;}
 p.productPrograms.markets=JSON.parse(JSON.stringify(policy.markets));
 p.retailLifecycle.mix=productAggregateMix(policy.markets);
 p.products.retail=Object.keys(p.retailLifecycle.mix).sort((a,b)=>p.retailLifecycle.mix[b]-p.retailLifecycle.mix[a])[0];
}
function productProgramBarred(p,key) {
 const d=PRODUCT_PROGRAM_PROJECTS[key];if(!d)return '';
 if(!p.productPrograms)return PROJECTS[key].programOnly?'Requires a new Product programmes campaign.':'';
 const state=p.productPrograms.products[d.product];
 if(p.projects.some(x=>PRODUCT_PROGRAM_PROJECTS[x.key]?.product===d.product))return 'This product already has a rollout in progress.';
 if(!state.retired&&(state.route==='build'||state.route===d.route))return 'Already delivered by this route. Manage local sales in Products.';
 if(d.route==='build'&&strategyLevel(p,RETAIL_DEPLOYMENTS[d.product].branch)<1)return 'Complete '+STRATEGY_BRANCHES[RETAIL_DEPLOYMENTS[d.product].branch].name+' tier 1 before in-house development.';
 return '';
}
function finishProductProgram(p,key) {
 const d=PRODUCT_PROGRAM_PROJECTS[key];if(!p.productPrograms||!d)return null;
 const replacement=p.productPrograms.products[d.product].route==='partner'&&d.route==='build';
 p.productPrograms.products[d.product]={route:d.route,retired:false};p.productDeployment.ready[d.product]=true;
 return p.name+' completed '+(d.route==='build'?'in-house development of ':'a licensed launch of ')+RETAIL_DEPLOYMENTS[d.product].name+'. '+(replacement?'Existing accounts now use the in-house platform; vendor charges end next month.':'No deposits were created. Set market and segment sales targets next planning month.');
}
function productProgramCosts(p) {
 const rows={};let total=0;
 for(const [k,state]of Object.entries(p.productPrograms?.products||{})) {
  const principal=p.depositBook.cohorts.filter(c=>!c.locked&&c.product===k).reduce((n,c)=>n+c.principal,0);
  const license=state.route==='partner'&&!state.retired?PRODUCT_LICENSE:0;
  const royalty=state.route==='partner'?Math.round(principal*PRODUCT_PROGRAM_ROYALTY):0;
  rows[k]={principal,license,royalty,total:license+royalty};total+=license+royalty;
 }
 return {rows,total};
}
function productProgramFallback(p,market,segment) {
 const mix=productTargetMix(p,market,segment);
 return Object.keys(mix).sort((a,b)=>mix[b]-mix[a])[0];
}
function validateProductProgramSave(g) {
 const has=p=>p.productPrograms!==undefined||p.submitted?.productProgramPolicy!==undefined||(Array.isArray(p.projects)&&p.projects.some(x=>PROJECTS[x.key]?.programOnly));
 if(g.productProgramsVersion===undefined){if(g.players.some(has))throw Error('Unversioned product programmes');return g;}
 if(g.productProgramsVersion!==1||g.segmentDepositsVersion!==1||g.version!==(g.regionalGrowthVersion===1?'8.11':g.advertisingVersion===1?'8.10':'8.9'))throw Error('Unsupported product programmes save');
 for(const p of g.players) {
  const state=p.productPrograms;
  if(!state||Object.keys(state).sort().join()!=='markets,products,version'||state.version!==1||!state.products||Object.keys(state.products).sort().join()!=='highYield,rewards')throw Error('Invalid product programme state');
  for(const [k,row]of Object.entries(state.products))if(!row||Object.keys(row).sort().join()!=='retired,route'||!['none','build','partner'].includes(row.route)||typeof row.retired!=='boolean'||(row.route==='none'&&row.retired)||p.productDeployment.ready[k]!==(!row.retired&&row.route!=='none'))throw Error('Invalid product delivery state');
  if(p.operatingReport&&(!Number.isSafeInteger(p.operatingReport.productProgramCost)||p.operatingReport.productProgramCost<0))throw Error('Invalid product programme cost report');
  validateProductTargets(p,state.markets);
  if(JSON.stringify(productAggregateMix(state.markets))!==JSON.stringify(p.retailLifecycle.mix))throw Error('Global and local product mix disagree');
  const running=p.projects.filter(x=>PRODUCT_PROGRAM_PROJECTS[x.key]),products=running.map(x=>PRODUCT_PROGRAM_PROJECTS[x.key].product);
  if(new Set(products).size!==products.length)throw Error('Duplicate product development');
  for(const x of running){const shadow={...p,projects:p.projects.filter(y=>y!==x)};if(x.target!==null||productProgramBarred(shadow,x.key))throw Error('Invalid product development project');}
  if(p.submitted){const q=JSON.parse(JSON.stringify(p.submitted));normalizeProductProgramPlan(p,q);if(JSON.stringify(q.retailMix)!==JSON.stringify(p.submitted.retailMix))throw Error('Submitted product mix disagrees');}
 }
 return g;
}
function planProductPrograms(g,index,plan) {
 const p=g.players[index];if(!p.productPrograms)return plan;
 const policy=productProgramPolicy(p);
 // Local fit drives targeting; no private rival customer information is used.
 for(const [key,row]of Object.entries(policy.markets))for(const s of Object.keys(row)) {
  const available=['essential',...Object.keys(RETAIL_DEPLOYMENTS).filter(k=>p.productDeployment.ready[k])];
  const best=available.sort((a,b)=>CUSTOMER_SEGMENTS[s].fit[b]-CUSTOMER_SEGMENTS[s].fit[a])[0];
  row[s]={essential:1,rewards:0,highYield:0,[best]:4};
 }
 plan.productProgramPolicy=policy;normalizeProductProgramPlan(p,plan);
 // Compare existing targets against fit targeting, including real vendor expenses.
 const current={...plan,productProgramPolicy:productProgramPolicy(p)};normalizeProductProgramPlan(p,current);
 const forecast=q=>operatingPreview({...p,marketSnapshot:g.marketEconomy},q,g.economy);
 const score=r=>r.profit-(r.fundingLoss||0)+Math.max(0,r.depositGrowth)*.005;
 let selectedReport=null;
 if(JSON.stringify(current.productProgramPolicy.markets)!==JSON.stringify(plan.productProgramPolicy.markets)){
  const stay=forecast(current),grow=forecast(plan);
  // Deliberate growth mandate: accept recurring launch costs only while at least
  // half of current forecast profit remains, without funding stress. Do not judge
  // an empty new platform solely by the first month's account fees.
  const affordableGrowth=p.stats.cash>=500000&&fundingPosition(p).excess<=0&&
   grow.profit>0&&grow.profit>=stay.profit*.5&&(grow.fundingLoss||0)<=(stay.fundingLoss||0)&&
   grow.depositGrowth>stay.depositGrowth+Math.max(5000,Math.abs(stay.depositGrowth)*.05);
  if(!affordableGrowth&&score(stay)>score(grow)){plan=current;selectedReport=stay;}else selectedReport=grow;
 }
 if(p.stats.lastProfit<0)for(const [product,state]of Object.entries(p.productPrograms.products)) {
  if(state.route!=='partner'||state.retired||p.projects.some(x=>PRODUCT_PROGRAM_PROJECTS[x.key]?.product===product)||planInitiatives(plan).some(k=>PRODUCT_PROGRAM_PROJECTS[k]?.product===product))continue;
  const retreat=JSON.parse(JSON.stringify(plan));retreat.productProgramPolicy.retire.push(product);
  for(const row of Object.values(retreat.productProgramPolicy.markets))for(const mix of Object.values(row)){mix[product]=0;if(!Object.values(mix).some(Boolean))mix.essential=4;}
  normalizeProductProgramPlan(p,retreat);
  if(projectPlanStatus(p,retreat).eligible){
   selectedReport=selectedReport||forecast(plan);const retiredReport=forecast(retreat);
   if(score(retiredReport)-score(selectedReport)>PRODUCT_RETIRE_COST/8){plan=retreat;selectedReport=retiredReport;}
  }
 }
 // Preserve a cash buffer for executive/rival effects instead of spending to zero.
 if(p.stats.lastProfit<=0||fundingPosition(p).excess>0)return plan;
 for(const product of (index===0?['rewards','highYield']:['highYield','rewards'])) {
  const state=p.productPrograms.products[product],d=RETAIL_DEPLOYMENTS[product];
  if(state.retired||plan.productProgramPolicy.retire.includes(product)||state.route==='build'||p.projects.some(x=>PRODUCT_PROGRAM_PROJECTS[x.key]?.product===product))continue;
  let key=strategyLevel(p,d.branch)>=1?d.project:state.route==='none'?product==='rewards'?'licenseRewards':'licenseHighYield':null;
  if(key){const next={...plan,newProjects:[...planInitiatives(plan),key]};next.newProject=next.newProjects[0];
   if(projectPlanStatus(p,next).eligible&&planBudget(p,next).remaining>=250000){plan=next;break;}}
  if(state.route==='partner'&&strategyLevel(p,d.branch)<1) {
   const room=Math.min(50000,CAPABILITY_CAP_PER_CYCLE-(plan.investments[d.branch]||0),capabilityNextCost(p,d.branch)-(plan.investments[d.branch]||0),planBudget(p,plan).remaining-250000);
   if(room>=1000)plan.investments[d.branch]=(plan.investments[d.branch]||0)+Math.floor(room);
  }
 }
 return plan;
}
