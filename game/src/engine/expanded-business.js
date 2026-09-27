// Expanded 9.36: explicit new-campaign rules. Historical owners return their
// original channel, project and capacity values; importing never creates a book.
const ExpandedBusiness=(()=>{
 const VERSION=1,LEGACY=Object.freeze(['marketing','contractAdvertising','technology','training','analytics','wealthDesk','operationsCenter','remediation']);
 const RULES=Object.freeze({licenseMonthly:12000,technologyQuarters:2,depositPerStaff:125000,maxCentralStaff:4,correctiveRisk:24,correctiveAttention:14});
 const PROJECT_KEYS=Object.freeze(['buildDigitalPlatform','licenseDigitalPlatform','correctiveAction']);
 Object.assign(PROJECTS,{
  buildDigitalPlatform:{name:'Build bank-wide digital platform',cost:220000,cycles:3,capacity:2,kind:'digitalPlatform',expandedBusinessOnly:true,
   desc:'Digital research tier 1. Build once for the bank; shared Technology and customer staff serve eligible markets. No local digital office, free customers or deposits. Replaces a licensed platform after completion.'},
  licenseDigitalPlatform:{name:'License bank-wide digital platform',cost:90000,cycles:1,capacity:1,kind:'digitalPlatform',expandedBusinessOnly:true,
   desc:'License once for the bank without an internal research prerequisite. $12,000 each operating month after completion; finite shared Technology and customer staff still required.'},
  correctiveAction:{name:'Corrective risk action',cost:170000,cycles:2,capacity:1,kind:'correctiveAction',expandedBusinessOnly:true,
   desc:'A bounded paid recovery project: at completion reduce compliance risk by up to 24 and Corporate Attention by up to 14. Uses shared execution; does not repair capital, repay debt or create customers.'}
 });
 const copy=x=>JSON.parse(JSON.stringify(x)),enabled=p=>p?.expandedBusinessVersion===VERSION;
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
 const retired=(p,key)=>enabled(p)&&(LEGACY.includes(key)||!!PROJECTS[key]?.strategy);
 const available=p=>enabled(p)&&['build','partner'].includes(p.expandedBusiness?.digital?.route);
 const routeKey=key=>key==='buildDigitalPlatform'?'build':key==='licenseDigitalPlatform'?'partner':null;
 function initialize(g,o){
  if(o.expandedBusinessVersion!==VERSION)return;
  g.expandedBusinessVersion=VERSION;
  for(const p of g.players){if(p.expandedBusiness!==undefined)throw Error('Expanded business initialization cannot replace an existing book.');p.expandedBusinessVersion=VERSION;p.expandedBusiness={version:VERSION,digital:{route:'none'}};}
 }
 function validatePlan(p,plan){
  const keys=planInitiatives(plan),routes=keys.filter(k=>routeKey(k));
  if(routes.length>1)throw Error('Choose one bank-wide digital platform delivery route.');
  if(keys.some(k=>retired(p,k)))throw Error('Legacy Expanded initiatives are retired; use their focused Banking, People or Strategy controls.');
  if(!enabled(p)&&keys.some(k=>PROJECT_KEYS.includes(k)))throw Error('Bank-wide digital and corrective actions require Expanded 9.36.');
 }
 function validate(source,context='game'){
  const live=enabled(source),owners=context==='game'?source.players:[source.me];
  if(source.expandedBusinessVersion!==undefined&&!live||source.version==='9.36'&&!live)throw Error('Unsupported Expanded business rules.');
  if(live)validateCampaignRules(source,context);
  if(!Array.isArray(owners)||owners.some(p=>!p||p.expandedBusinessVersion!==(live?VERSION:undefined))||source.rival?.expandedBusinessVersion!==undefined||source.rival?.expandedBusiness!==undefined)throw Error('Invalid Expanded business owner rules.');
  for(const p of owners){
   if(!live){if(p.expandedBusiness!==undefined||(p.projects||[]).some(x=>PROJECT_KEYS.includes(x.key)))throw Error('Unversioned Expanded business state.');continue;}
   const b=p.expandedBusiness;
   if(!exact(b,['version','digital'])||b.version!==VERSION||!exact(b.digital,['route'])||!['none','build','partner'].includes(b.digital.route))throw Error('Invalid bank-wide digital platform.');
   const running=(p.projects||[]).filter(x=>routeKey(x.key));
   if(running.length>1||running.some(x=>x.target!==null||b.digital.route==='build'||b.digital.route===routeKey(x.key)||routeKey(x.key)==='build'&&strategyLevel(p,'digital')<1))throw Error('Invalid bank-wide digital deployment.');
   if(p.submitted)validatePlan(p,p.submitted);
   if(p.operatingReport&&(!Number.isSafeInteger(p.operatingReport.digitalPlatformCost)||![0,RULES.licenseMonthly].includes(p.operatingReport.digitalPlatformCost)))throw Error('Invalid digital platform cost report.');
  }
 }
 function project(g,out,index){if(!enabled(g))return;out.expandedBusinessVersion=VERSION;out.me.expandedBusinessVersion=VERSION;out.me.expandedBusiness=copy(g.players[index].expandedBusiness);}
 function barred(p,key){
  if(retired(p,key))return 'This legacy initiative is retired. Use the focused Banking, People or Strategy control; existing paid work and earned benefits are preserved.';
  if(!PROJECT_KEYS.includes(key))return '';
  if(!enabled(p))return 'Requires a new Expanded 9.36 campaign.';
  const route=routeKey(key);if(!route)return '';
  const current=p.expandedBusiness.digital.route;
  if(current==='build'||current===route)return 'The bank-wide digital platform is already delivered by this route.';
  if(p.projects.some(x=>routeKey(x.key)))return 'A bank-wide digital deployment is already in progress.';
  if(route==='build'&&strategyLevel(p,'digital')<1)return 'Complete Digital research tier 1 before building the bank-wide platform, or choose the licensed route.';
  return '';
 }
 function catalogVisible(p,key){return !(PROJECT_KEYS.includes(key)&&!enabled(p))&&!retired(p,key);}
 function finish(g,p,project){
  if(!project||!PROJECT_KEYS.includes(project.key))return null;
  if(!enabled(p))throw Error('Unversioned Expanded business project.');
  const route=routeKey(project.key);
  if(route){p.expandedBusiness.digital.route=route;return p.name+' completed the '+(route==='build'?'in-house':'licensed')+' bank-wide digital platform. Shared staff serve local audiences from next month; no customers or deposits were granted.';}
  delta(p,'compliance',-RULES.correctiveRisk);delta(p,'attention',-RULES.correctiveAttention);
  return p.name+' completed a corrective risk action: compliance risk reduced by up to '+RULES.correctiveRisk+' and Corporate Attention by up to '+RULES.correctiveAttention+'.';
 }
 function monthlyCost(p){return enabled(p)&&p.expandedBusiness.digital.route==='partner'?RULES.licenseMonthly:0;}
 function adjustReport(p,r){if(!enabled(p))return;const cost=monthlyCost(p);r.digitalPlatformCost=cost;r.expense+=cost;r.profit-=cost;}
 // A completed platform replaces the building prerequisite. Its fit/retention
 // channel is bank-wide, while actual new business still needs shared staff,
 // Technology delivery, local targeting and finite outside customer stock.
 function digitalChannel(p,market){return enabled(p)?available(p):marketFacilities(p,market).includes('digital');}
 function central(p){
  if(!available(p))return {technologyCoverage:0,serviceStaff:0,applicationStaff:0,centralCapacity:0};
  const technologyCoverage=departmentFunctionCoverage(p,'technology',0),physical=departmentFunctionResidual(p,'service',householdSalesStaff(p,p.allocation.service));
  const offices=(p.facilityNetwork?.offices||[]).filter(o=>o.closedCycle===null),reserved=offices.reduce((n,o)=>n+(p.facilityLifecycle?.records[o.id]?.staffQuarters.service||0)/4,0);
  // Office staff cannot simultaneously be the remote sales desk. Expertise
  // scales only the unreserved portion of the existing residual physical pool.
  const sales=householdSalesStaff(p,workforceAllocation(p).service),serviceStaff=physical>0?sales*Math.max(0,physical-reserved)/physical:0;
  const applicationStaff=p.onboarding?.policy.share>0&&onboardingOpen(p,p.onboarding.policy)?departmentFunctionTaskFte(p,'applicationProcessing',0):0;
  return {technologyCoverage,serviceStaff,applicationStaff,centralCapacity:Math.floor(Math.min(RULES.maxCentralStaff,serviceStaff+applicationStaff)*RULES.depositPerStaff*technologyCoverage)};
 }
 function centralCapacity(p){return central(p).centralCapacity;}
 function marketReach(p,market,legacy){
  if(!available(p)||!Object.hasOwn(p.marketBook?.markets||{},market))return legacy;
  // This changes access to the existing local pool, never its size or ownership.
  return Math.max(legacy,.12+strategyLevel(p,'digital')*.015);
 }
 function technologyWork(p){return available(p)?RULES.technologyQuarters:0;}
 function digitalQuote(p,plan=null,g=null){
  if(!enabled(p))return {enabled:false};
  let owner=p;
  if(plan&&g&&p.departmentFunctions){
   owner=prepareDepartmentFunctionForecast(prepareOperatingForecast(p,plan,g),plan,g);
   for(const [id,settings]of Object.entries(plan.facilityLifecyclePolicy?.offices||{}))if(owner.facilityLifecycle.records[id])Object.assign(owner.facilityLifecycle.records[id],copy(settings));
  }
  const detail=central(owner),route=p.expandedBusiness.digital.route;
  return {enabled:true,route,available:available(p),scope:'bank-wide',monthlyCost:monthlyCost(p),...detail,
   markets:Object.keys(p.marketBook.markets),projects:PROJECT_KEYS.filter(key=>routeKey(key)).map(key=>({...projectTerms(p,key),route:routeKey(key),name:PROJECTS[key].name})),
   effects:['Connected-customer product fit +0.10 across eligible markets.','Connected household servicing workload reduced by 20%.','Central deposit onboarding is limited by shared customer staff and delivered Technology coverage.'],
   notes:['Platform completion creates no customers, deposits, offices or staff. Local targeting and acquisition still apply.','A digital advisory studio is optional local premises with real staff, condition, capacity and upkeep; it does not unlock the bank-wide platform.','Licensed delivery costs $12,000 each operating month; an internal replacement ends this charge after completion.']};
 }
 function legacySummary(p){return {ongoing:(p.projects||[]).filter(x=>LEGACY.includes(x.key)||PROJECTS[x.key]?.strategy||PROJECTS[x.key]?.legacy).map(copy),upgrades:copy(p.upgrades),marketingTurns:p.marketingTurns||0};}
 return Object.freeze({VERSION,LEGACY,RULES,PROJECT_KEYS,enabled,available,initialize,validate,validatePlan,project,retired,barred,catalogVisible,finish,monthlyCost,adjustReport,digitalChannel,centralCapacity,marketReach,technologyWork,digitalQuote,legacySummary});
})();
