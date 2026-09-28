// Forecast drivers for Forecast & books: what limits growth this month, what a
// project changes once it is complete, and what each research branch and
// operating model contributes. Read-only. Every figure is the ordinary monthly
// forecast (operatingPreview) run on private copies, so it uses the same
// formulas as the forecast table and never touches the game or the draft.
// Each row answers "what changes without this one item"; rows can overlap where
// items work together, for example a combination that needs two branches.
const FORECAST_DRIVER_FIELDS=Object.freeze(['profit','depositGrowth','loanGrowth','commercialIncome','fundingCost','expense']);
// Set only while forecastDriverRun asks for limits; the monthly operations step
// records its own deposit and loan terms here, and never during a real month.
let forecastLimitCapture=null;
function captureForecastLimits(g,p,deposits){
 const loans={};loanProductionCapacity(g,p,loans);
 Object.assign(forecastLimitCapture,{deposits,loans,
  relationships:researchProgramRules(p)?{held:(p.stats.business||0)+(p.stats.merchant||0),capacity:researchRelationshipCapacity(p)}:null});
}
function forecastDriverRun(v,p,plan,captureLimits=false){
 const previous=forecastLimitCapture;forecastLimitCapture=captureLimits?{}:null;
 try{
  // Named-company offers run their own funded forecast; drivers describe the bank.
  const result=operatingPreview(p,{...plan,companyCreditOrders:[]},v.economy,v,false);
  return captureLimits?{result,limits:forecastLimitCapture}:{result};
 }finally{forecastLimitCapture=previous;}
}
function forecastDriverChange(after,before){
 return Object.fromEntries(FORECAST_DRIVER_FIELDS.map(key=>[key,Math.round((after[key]||0)-(before[key]||0))]));
}
function forecastDriverTerms(rows){
 const terms=rows.filter(([, ,amount])=>Number.isFinite(amount)).map(([key,label,amount])=>({key,label,amount:Math.max(0,Math.round(amount))}));
 return {terms,binding:terms.length?terms.reduce((a,b)=>b.amount<a.amount?b:a).key:null};
}
function forecastGrowthLimits(v,p,plan){
 const {limits}=forecastDriverRun(v,p,plan,true);
 if(!limits?.deposits)throw Error('The forecast did not report its growth limits.');
 const d=limits.deposits,l=limits.loans;
 return {
  deposits:{...forecastDriverTerms([['demand','What your bankers and branches can gather',d.demand],['market','Deposits still available in your markets',d.market],['office','Deposit capacity of your offices',d.office]]),gain:Math.round(d.gain)},
  loans:{...forecastDriverTerms([['staff','What your lending bankers can originate',l.staff],['funding','Spare cash above your liquidity reserve',l.funding],['office','Loan capacity of your offices',l.office]]),deployment:Math.round(l.central||0)},
  relationships:limits.relationships&&{...limits.relationships,saturated:limits.relationships.held>limits.relationships.capacity}
 };
}
// A game-shaped copy of the owner's view for completing one project privately.
// The rival is the owner's public projection, so completions that need the
// rival's private books fail and are reported as not estimated.
function forecastSandbox(v,p,seat){
 if(seat!==0&&seat!==1)throw Error('Unknown seat.');
 const g=JSON.parse(JSON.stringify(v)),owner=JSON.parse(JSON.stringify(p)),rival=JSON.parse(JSON.stringify(v.rival));
 g.players=seat===0?[owner,rival]:[rival,owner];g.log=g.log||[];
 return {g,owner};
}
function forecastProjectEffects(v,p,plan,seat){
 const base=forecastDriverRun(v,p,plan).result;
 const running=(p.projects||[]).map(project=>({project,staged:false}));
 const staged=planInitiatives(plan).map(key=>({project:{key,target:projectPlanTarget(plan,key),progress:0},staged:true}));
 return [...running,...staged].filter(({project})=>PROJECTS[project.key]).map(({project,staged})=>{
  const def=PROJECTS[project.key],row={key:project.key,name:def.name,target:project.target??null,
   targetName:v.territories?.[project.target]?.name||null,staged,progress:project.progress||0,total:project.total||null};
  try{
   const {g,owner}=forecastSandbox(v,p,seat),message=applyProjectEffects(g,owner,{...project});
   if(message===false||typeof message==='string'&&/could not complete/.test(message))return {...row,change:null,reason:message||'This project would not complete as things stand.'};
   return {...row,change:forecastDriverChange(forecastDriverRun(g,owner,plan).result,base)};
  }catch(error){return {...row,change:null,reason:'Not estimated here: '+error.message};}
 });
}
function forecastResearchEffects(v,p,plan){
 const base=forecastDriverRun(v,p,plan).result,branches=researchBranchTable(p),models=researchModelTable(p),rows=[];
 const without=mutate=>{const q=JSON.parse(JSON.stringify(p));mutate(q);return forecastDriverChange(base,forecastDriverRun(v,q,plan).result);};
 for(const branch of researchBranches(p)){
  const model=p.specializations?.[branch],name=branches[branch]?.name||branch;
  // Research tree campaigns credit a family's learned nodes; earlier ones its track spending.
  if(capabilitySpend(p,branch)>0)rows.push({kind:'research',branch,name,level:strategyLevel(p,branch),
   change:without(q=>{if(ResearchTree.enabled(q)){for(const [k,d] of Object.entries(ResearchTree.NODES))if(d.family===branch)q.researchTree.nodes[k]={funded:0,completed:0};}else q.capability={...q.capability,[branch]:0};})});
  if(model)rows.push({kind:'model',branch,name:models?.[branch]?.[model]?.name||model,branchName:name,
   change:without(q=>{q.specializations={...q.specializations};delete q.specializations[branch];})});
 }
 return rows;
}
// One call for the desk: each part fails on its own, never the whole view.
function forecastDrivers(v,p,plan,seat){
 const part=fn=>{try{return {value:fn()};}catch(error){return {error:error.message};}};
 return {limits:part(()=>forecastGrowthLimits(v,p,plan)),projects:part(()=>forecastProjectEffects(v,p,plan,seat)),research:part(()=>forecastResearchEffects(v,p,plan))};
}
