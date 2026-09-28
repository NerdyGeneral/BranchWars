// Expanded 9.41 research tree. Six families of six nodes: a foundation, two
// two-node paths and a capstone that needs either path. A family's level (1-4)
// comes from how much of it is learned, so every earlier level-based effect keeps
// its consumer; each node adds one named effect of its own. Effects on the same
// term multiply (or add, for per-month drifts), so everything learned stacks.
// Earlier campaigns keep the five capability tracks and their funding rules.
const ResearchTree=(()=>{
 const enabled=p=>p?.researchTreeVersion===1,copy=x=>JSON.parse(JSON.stringify(x));
 // Research any one node can absorb in a month; each family funds one node at a time.
 // Costs are sized to Expanded banks (about $1.8M of opening equity): a foundation
 // is one month and $100K, a capstone three months and $260K, a family about $1M.
 const NODE_CAP=100000;
 const SLOTS=Object.freeze(['F','A1','A2','B1','B2','X']);
 // Family levels reuse the capability-track effects (see LEVEL_TEXT). Path A
 // and path B each reach level 3; the capstone gives level 4.
 const FAMILIES=Object.freeze({
  network:{name:'Network & Markets',promise:'Office reach, local service and a stable deposit franchise.',paths:{A:'Local service',B:'Office network'}},
  digital:{name:'Digital Systems',promise:'Onboarding, servicing and automation that scale without headcount.',paths:{A:'Customer channels',B:'Automation & analytics'}},
  commercial:{name:'Commercial Banking',promise:'Business relationships, treasury services and commercial credit.',paths:{A:'Treasury & payments',B:'Commercial credit & pricing'}},
  operations:{name:'Operations & Delivery',promise:'Delivery capacity, efficiency and operating control.',paths:{A:'Delivery capacity',B:'Controls & programmes'}},
  acquisition:{name:'Acquisitions & Integration',promise:'Deal diligence, valuation and integration of acquired books.',paths:{A:'Deal terms',B:'Integration'}},
  risk:{name:'Risk & Capital',promise:'Credit quality, supervision and capital efficiency.',paths:{A:'Credit risk',B:'Supervision & capital'}}
 });
 const LEVEL_TEXT=Object.freeze({
  network:'Each level: office projects cost 8% less, offices serve 5% more, deposit growth +2.5%. Level 2: offices build a month sooner. Level 4: new offices take local market share.',
  digital:'Each level: more service capacity and deposit growth, faster digital adoption and platform uptake, +$4K a month of digital income.',
  commercial:'Each level: loan origination +4.5%, commercial fees +7.5%, business relationship growth +8%, +1 service-bid point.',
  operations:'Each level: operating expense -3.5% and +1.5 execution capacity. Level 1: long projects finish a month sooner. Level 3: initiatives cost 15% less.',
  acquisition:'Each level: book acquisitions cost 10% less. Level 2: acquisitions close a month sooner.',
  risk:'Each level: lower losses on new loans and less compliance drift. In this edition loss control is Risk & Capital research, not Operations.'
 });
 // Terms each effect acts on, and the consumer that reads it. Multipliers
 // unless listed in ADDITIVE. Every term has exactly one authoritative reader.
 const TERMS=Object.freeze({
  service:'Household service capacity',deposits:'Deposit growth from bankers and offices',officeDeposits:'Office deposit capacity',
  loans:'Loan origination capacity',throughput:'Banker throughput',newLoanRisk:'Credit risk on new loans',newLoanRate:'Interest rate on new loans',
  fees:'Commercial fee income',relationships:'Business and merchant relationship growth',expense:'Recurring operating expense',
  officeExpense:'Office running costs',depositService:'Deposit servicing cost',runoff:'Rate-sensitive deposit runoff',reserve:'Liquidity reserve held back from lending',
  officeProjectCost:'Office project cost',projectCost:'Initiative cost',acquisitionCost:'Book acquisition cost',acquisitionTransfer:'Customers and balances won by book acquisitions',
  cure:'Late loans cured by collections',severity:'Loss on resolved defaults',
  execution:'Execution capacity',compliance:'Compliance drift per month',attention:'Corporate attention per month',acquisitionWork:'Book acquisition delivery'
 });
 const ADDITIVE=Object.freeze(['execution','compliance','attention','acquisitionWork']);
 const n=(family,slot,name,cost,effects,text,extra={})=>({family,slot,name,cost,effects,text,...extra});
 const NODES=Object.freeze({
  // Network & Markets
  marketPlanning:n('network','F','Market Planning',100000,{service:1.05},'Household service capacity +5%.'),
  localServiceDesign:n('network','A1','Local Service Design',140000,{deposits:1.06},'Deposit growth from bankers and offices +6%.'),
  relationshipRetention:n('network','A2','Relationship Retention',180000,{runoff:.75},'Rate-sensitive deposit runoff -25%.'),
  hubNetworkPlanning:n('network','B1','Hub Network Planning',140000,{officeDeposits:1.1},'Office deposit capacity +10%.'),
  standardOfficeRollout:n('network','B2','Standard Office Rollout',180000,{officeProjectCost:.9},'Office projects cost a further 10% less.'),
  integratedNetwork:n('network','X','Integrated Network',260000,{officeExpense:.9},'Office running costs -10%.'),
  // Digital Systems (Digital Architecture and Workflow Automation keep their 9.37 effects)
  digitalArchitecture:n('digital','F','Digital Architecture',100000,{},'Deposit administration in Technology uses 20% less employee time.',{named:'techWork'}),
  selfServiceOnboarding:n('digital','A1','Self-Service Onboarding',140000,{service:1.05},'Household service capacity +5%.'),
  omnichannelServicing:n('digital','A2','Omnichannel Servicing',180000,{depositService:.85},'Deposit servicing cost -15%.'),
  workflowAutomation:n('digital','B1','Workflow Automation',140000,{},'Active payroll and treasury applications use 15% less contract delivery time.',{named:'applicationWork'}),
  creditAnalytics:n('digital','B2','Validated Credit Analytics',180000,{newLoanRisk:.92},'Credit risk on new loans -8%.'),
  integratedDigitalBank:n('digital','X','Integrated Digital Bank',260000,{expense:.96},'Recurring operating expense -4%.'),
  // Commercial Banking (the first three keep their 9.37 effects)
  relationshipPlanning:n('commercial','F','Relationship Planning',100000,{},'Eligible service bids gain 1 matching point.',{named:'bid'}),
  cashManagementDesign:n('commercial','A1','Cash-Management Design',140000,{},'Treasury mandates use 10% less delivery time.',{named:'treasuryWork'}),
  paymentsIntegration:n('commercial','A2','Payments Integration',180000,{},'Direct payroll and treasury delivery costs -10% while active; merchant settlement cost -10% with an active treasury platform.',{named:'deliveryCost'}),
  sectorUnderwriting:n('commercial','B1','Sector Underwriting',140000,{newLoanRisk:.94},'Credit risk on new loans -6%.'),
  relationshipPricing:n('commercial','B2','Relationship Pricing',180000,{fees:1.06},'Commercial fee income +6%.'),
  corporateServiceDelivery:n('commercial','X','Corporate Service Delivery',260000,{relationships:1.1},'Business and merchant relationship growth +10%.'),
  // Operations & Delivery
  processMapping:n('operations','F','Process Mapping',100000,{expense:.98},'Recurring operating expense -2%.'),
  serviceQueueDesign:n('operations','A1','Service Queue Design',140000,{throughput:1.05},'Banker throughput +5%.'),
  standardizedDelivery:n('operations','A2','Standardized Delivery',180000,{execution:1},'+1 execution capacity.'),
  operationalControls:n('operations','B1','Operational Controls',140000,{compliance:-1},'Compliance drift -1 a month.'),
  programmeManagement:n('operations','B2','Programme Management',180000,{projectCost:.94},'Every initiative costs 6% less.'),
  scalableOperations:n('operations','X','Scalable Operations',260000,{expense:.95},'Recurring operating expense -5%.'),
  // Acquisitions & Integration
  dealDiligence:n('acquisition','F','Deal Diligence',100000,{acquisitionCost:.95},'Book acquisitions cost 5% less.'),
  acquisitionValuation:n('acquisition','A1','Acquisition Valuation',140000,{acquisitionCost:.93},'Book acquisitions cost a further 7% less.'),
  negotiationPreparation:n('acquisition','A2','Negotiation Preparation',180000,{acquisitionTransfer:1.1},'Book acquisitions win 10% more customers and balances.'),
  customerTransition:n('acquisition','B1','Customer Transition',140000,{acquisitionTransfer:1.08},'Book acquisitions keep 8% more of the customers and balances they win.'),
  operatingIntegration:n('acquisition','B2','Operating Integration',180000,{acquisitionWork:-1},'Book acquisitions close a further month sooner.'),
  repeatableAcquisition:n('acquisition','X','Repeatable Acquisition Programme',260000,{acquisitionCost:.9,attention:-.5},'Book acquisitions cost a further 10% less; corporate attention -0.5 a month.'),
  // Risk & Capital
  underwritingStandards:n('risk','F','Underwriting Standards',100000,{newLoanRisk:.94},'Credit risk on new loans -6%.'),
  creditMonitoring:n('risk','A1','Credit Monitoring',140000,{cure:1.2},'Collections cure 20% more late loans.'),
  workoutMethods:n('risk','A2','Workout Methods',180000,{severity:.85},'Loss on resolved defaults -15%.'),
  complianceProgramme:n('risk','B1','Compliance Programme',140000,{compliance:-1.5,attention:-.5},'Compliance drift -1.5 and corporate attention -0.5 a month.'),
  capitalPlanning:n('risk','B2','Capital Planning',180000,{reserve:.85},'Liquidity reserve held back from lending -15%. Capital rules are unchanged.'),
  integratedRiskControls:n('risk','X','Integrated Risk Controls',260000,{newLoanRisk:.92},'Credit risk on new loans -8%.')
 });
 const bySlot=(family,slot)=>Object.keys(NODES).find(k=>NODES[k].family===family&&NODES[k].slot===slot);
 // F opens both paths; each second node needs its first; the capstone needs either finished path.
 function requires(key){const {family,slot}=NODES[key];
  return slot==='F'?{all:[],any:[]}:slot==='X'?{all:[],any:[bySlot(family,'A2'),bySlot(family,'B2')]}:{all:[bySlot(family,slot[1]==='1'?'F':slot[0]+'1')],any:[]};}
 const COMBINATIONS=Object.freeze({
  digitalTreasury:{name:'Digital Treasury Services',requires:['paymentsIntegration','workflowAutomation'],effects:{fees:1.05},text:'Opens the internal treasury platform build and adds 5% to commercial fees.'},
  straightThrough:{name:'Straight-Through Processing',requires:['workflowAutomation','standardizedDelivery'],effects:{throughput:1.08},text:'Banker throughput +8%.'},
  stableFunding:{name:'Stable Funding Relationships',requires:['relationshipRetention','complianceProgramme'],effects:{runoff:.8,deposits:1.03},text:'Rate-sensitive runoff -20% and deposit growth +3%.'},
  integratedRollout:{name:'Integrated Office Rollout',requires:['standardOfficeRollout','operatingIntegration'],effects:{officeProjectCost:.92,acquisitionCost:.92},text:'Office projects and book acquisitions cost 8% less.'},
  disciplinedLending:{name:'Disciplined Specialist Lending',requires:['sectorUnderwriting','creditMonitoring'],effects:{newLoanRisk:.9,newLoanRate:1.03},text:'Credit risk on new loans -10% and new-loan rates +3%.'}
 });
 // Three permanent models per family. The first two keep their existing
 // Expanded effects in place; these are the added models' effects.
 const MODELS=Object.freeze({
  network:{retailDensity:{name:'Retail Density',desc:'Full-service offices produce more households, deposits and reputation.'},
   regionalHub:{name:'Regional Hubs',desc:'Office projects build a month sooner and reinforce surrounding market capacity.'},
   franchisePartners:{name:'Franchise Partners',desc:'Office running costs -25%, at 8% of commercial fees and 30% faster rate-sensitive runoff.',effects:{officeExpense:.75,fees:.92,runoff:1.3}}},
  digital:{customerExperience:{name:'Customer Experience',desc:'Digital adoption converts more directly into households and deposits.'},
   automation:{name:'Back-Office Automation',desc:'Technology lowers recurring operating expense.'},
   dataLedCredit:{name:'Data-Led Credit',desc:'Credit risk on new loans -15% and new-loan rates +4%, at +0.7 corporate attention a month.',effects:{newLoanRisk:.85,newLoanRate:1.04,attention:.7}}},
  commercial:{treasury:{name:'Treasury & Payments',desc:'Merchant services and operating-account fee income compound faster.'},
   specializedCredit:{name:'Specialized Credit',desc:'Loan production accelerates with a measured increase in underwriting risk.'},
   relationshipBanking:{name:'Relationship Banking',desc:'Deposit growth +12% and rate-sensitive runoff -25%, with 8% slower relationship growth.',effects:{deposits:1.12,runoff:.75,relationships:.92}}},
  operations:{lean:{name:'Lean Delivery',desc:'Staff and facility expense fall while initiatives cost less.'},
   resilience:{name:'Risk & Resilience',desc:'Controls and loss prevention become materially stronger.'},
   processRedesign:{name:'Process Redesign',desc:'Banker throughput +12% and +1 execution capacity, at 3% more operating expense.',effects:{throughput:1.12,execution:1,expense:1.03}}},
  acquisition:{dealmaker:{name:'Dealmaker',desc:'Acquisitions cost less and close with stronger market-share impact.'},
   integrator:{name:'Integration Discipline',desc:'Acquired customers and assets transfer more cleanly with less attention.'},
   consolidator:{name:'Consolidator',desc:'Business and merchant relationship growth +8%, at +0.8 corporate attention a month.',effects:{relationships:1.08,attention:.8}}},
  risk:{provisioning:{name:'Conservative Provisioning',desc:'Credit risk on new loans -22%, at 7% less loan origination and a 25% larger liquidity reserve.',effects:{newLoanRisk:.78,loans:.93,reserve:1.25}},
   capitalEfficiency:{name:'Capital Efficiency',desc:'Loan origination +12% and a 20% smaller liquidity reserve, at +6% new-loan risk and +1.2 compliance drift a month.',effects:{loans:1.12,reserve:.8,newLoanRisk:1.06,compliance:1.2}},
   standing:{name:'Regulatory Standing',desc:'Compliance drift -2 and corporate attention -1.2 a month, at 2% more operating expense.',effects:{compliance:-2,attention:-1.2,expense:1.02}}}
 });
 const book=p=>p.researchTree;
 function has(p,key){return enabled(p)&&!!book(p)?.nodes[key]?.completed;}
 function familyNodes(family){return Object.keys(NODES).filter(k=>NODES[k].family===family);}
 function learned(p,family){return familyNodes(family).filter(k=>has(p,k)).length;}
 function level(p,family){if(!enabled(p)||!FAMILIES[family])return 0;return has(p,bySlot(family,'X'))?4:Math.min(3,learned(p,family));}
 function spent(p,family){return enabled(p)&&FAMILIES[family]?familyNodes(family).reduce((t,k)=>t+(book(p)?.nodes[k]?.funded||0),0):0;}
 function combination(p,key){const d=COMBINATIONS[key];return enabled(p)&&!!d&&d.requires.every(k=>has(p,k));}
 function combinations(p){return Object.keys(COMBINATIONS).filter(k=>combination(p,k));}
 // Every active source of an effect: learned nodes, combinations and the added models.
 function sources(p){
  if(!enabled(p))return [];const out=[];
  for(const [k,d] of Object.entries(NODES))if(has(p,k))out.push({kind:'node',key:k,name:d.name,effects:d.effects});
  for(const k of combinations(p))out.push({kind:'combination',key:k,name:COMBINATIONS[k].name,effects:COMBINATIONS[k].effects});
  for(const [family,models] of Object.entries(MODELS)){const m=models[p.specializations?.[family]];if(m?.effects)out.push({kind:'model',key:family+':'+p.specializations[family],name:m.name,effects:m.effects});}
  return out;
 }
 function multiplier(p,term){return sources(p).reduce((m,s)=>m*(s.effects[term]??1),1);}
 function additive(p,term){return sources(p).reduce((t,s)=>t+(s.effects[term]||0),0);}
 function effect(p,term){return ADDITIVE.includes(term)?additive(p,term):multiplier(p,term);}
 // The model table in the shape researchModelTable returns.
 function modelTable(){return Object.fromEntries(Object.entries(MODELS).map(([f,ms])=>[f,Object.fromEntries(Object.entries(ms).map(([k,m])=>[k,{name:m.name,desc:m.desc}]))]));}
 function branchTable(){return Object.fromEntries(Object.entries(FAMILIES).map(([f,d])=>[f,{name:d.name,promise:d.promise,nodes:familyNodes(f).map(k=>({key:k,name:NODES[k].name,cost:NODES[k].cost,desc:NODES[k].text}))}]));}
 function initialize(g,o){
  if(o.researchTreeVersion!==1||o.digitalCommercialVersion!==1)return;g.researchTreeVersion=1;
  for(const p of g.players){p.researchTreeVersion=1;p.researchTree={version:1,nodes:Object.fromEntries(Object.keys(NODES).map(k=>[k,{funded:0,completed:0}]))};}
 }
 function issue(p,key){
  const d=NODES[key];if(!enabled(p)||!d)return 'This research requires Expanded 9.41.';if(has(p,key))return 'This research is already learned.';
  const r=requires(key),missing=r.all.filter(k=>!has(p,k));
  if(missing.length)return 'Learn '+missing.map(k=>NODES[k].name).join(' and ')+' in an earlier month.';
  if(r.any.length&&!r.any.some(k=>has(p,k)))return 'Learn '+r.any.map(k=>NODES[k].name).join(' or ')+' in an earlier month.';
  return '';
 }
 function spend(plan){return Object.values(plan?.nodeFunding||{}).reduce((t,x)=>t+(Number.isSafeInteger(x)&&x>0?x:0),0);}
 function remaining(p,key){return NODES[key].cost-(book(p)?.nodes[key]?.funded||0);}
 function validatePlan(p,plan){
  if(plan.nodeFunding===undefined)return;
  if(!enabled(p)||!plan.nodeFunding||Array.isArray(plan.nodeFunding)||typeof plan.nodeFunding!=='object')throw Error('Invalid research funding instruction.');
  const families=new Set();
  for(const [key,amount]of Object.entries(plan.nodeFunding)){
   const why=issue(p,key);if(why)throw Error(why);
   const left=remaining(p,key);
   if(!Number.isSafeInteger(amount)||amount<Math.min(1000,left)||amount>Math.min(left,NODE_CAP))throw Error('Fund '+NODES[key].name+' with at least $1,000 (or its smaller final remainder) and at most $'+NODE_CAP.toLocaleString()+' a month.');
   if(families.has(NODES[key].family))throw Error(FAMILIES[NODES[key].family].name+' researches one node at a time.');
   families.add(NODES[key].family);
  }
 }
 function quote(g,p,plan,key){
  const d=NODES[key];if(!d)throw Error('Unknown research.');const without=copy(plan);delete without.nodeFunding?.[key];
  const other=Object.keys(without.nodeFunding||{}).find(k=>NODES[k]?.family===d.family);
  const b=planBudget(p,without,g),envelope=(without.departmentPolicy?.envelopes.research??Infinity)-spend(without),funded=book(p).nodes[key].funded,left=d.cost-funded,
   reason=issue(p,key)||(other?'Staged funding for '+NODES[other].name+' uses this family\'s research slot this month.':''),
   maximum=reason?0:Math.max(0,Math.floor(Math.min(envelope,left,NODE_CAP,Number.isFinite(b.discretionaryRemaining)?b.discretionaryRemaining:b.remaining)));
  return {...d,key,funded,completed:book(p).nodes[key].completed,requires:requires(key),reason,maximum:maximum<Math.min(1000,left)?0:maximum,planned:plan.nodeFunding?.[key]||0,minimumMonths:Math.ceil(left/NODE_CAP),cap:NODE_CAP,
   level:level(p,d.family),familyName:FAMILIES[d.family].name};
 }
 function settle(g,p,plan){
  if(!enabled(p))return [];validatePlan(p,plan);const lines=[];
  for(const [key,amount]of Object.entries(plan.nodeFunding||{})){
   // No emergency borrowing or partial progress for unfunded research.
   if(p.stats.cash<amount){lines.push(p.name+': '+NODES[key].name+' funding cancelled because cash is unavailable.');continue;}
   p.accounting=AccountingPrototype.post(p.accounting,'research.capability',{cash:-amount,equity:-amount},-amount);syncAccounts(p);
   const row=book(p).nodes[key],before=level(p,NODES[key].family);row.funded+=amount;
   if(row.funded===NODES[key].cost){row.completed=g.cycle;const after=level(p,NODES[key].family);
    lines.push(p.name+' learned '+NODES[key].name+' in '+FAMILIES[NODES[key].family].name+(after>before?' (level '+after+')':'')+'. Benefits begin next month.');}
   else lines.push(p.name+' funded $'+amount.toLocaleString()+' of '+NODES[key].name+'.');
  }
  return lines;
 }
 function project(g,out,index){
  if(!enabled(g))return;const p=g.players[index];
  out.researchTreeVersion=1;out.me.researchTreeVersion=1;out.me.researchTree=copy(p.researchTree);
  out.researchTreeRules={families:copy(FAMILIES),levels:copy(LEVEL_TEXT),nodes:Object.fromEntries(Object.entries(NODES).map(([k,d])=>[k,{...copy(d),requires:requires(k)}])),
   combinations:copy(COMBINATIONS),models:copy(MODELS),terms:copy(TERMS),additive:[...ADDITIVE],cap:NODE_CAP};
  out.me.researchCombinations=combinations(p);
  out.strategyBranches=branchTable();out.strategySpecializations=modelTable();
  out.capabilityTiers=Object.fromEntries(Object.keys(FAMILIES).map(f=>{let t=0;return [f,['F','A1','A2','X'].map(s=>t+=NODES[bySlot(f,s)].cost)];}));
  if(p.submitted?.nodeFunding)out.me.pendingNodeFunding=copy(p.submitted.nodeFunding);
  for(const [id,plan]of Object.entries(out.lastPlans||{}))if(id!==out.me.id)delete plan.nodeFunding;
 }
 function validate(s,context){
  const active=enabled(s),owners=context==='game'?s.players:[s.me],exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===keys.slice().sort().join();
  if(s.researchTreeVersion!==undefined&&!active||s.version==='9.41'&&!active||active&&s.digitalCommercialVersion!==1)throw Error('Unsupported research tree rules.');
  if(active)validateCampaignRules(s,context);
  for(const p of owners){
   if(p.researchTreeVersion!==(active?1:undefined)||!active&&p.researchTree!==undefined)throw Error('Invalid research tree boundary.');if(!active)continue;
   if(p.digitalCommercial!==undefined)throw Error('A research tree campaign has no separate capability book.');
   const b=p.researchTree;if(!exact(b,['version','nodes'])||b.version!==1||!exact(b.nodes,Object.keys(NODES)))throw Error('Invalid research tree book.');
   for(const [key,row]of Object.entries(b.nodes)){
    if(!exact(row,['funded','completed'])||!Number.isSafeInteger(row.funded)||row.funded<0||row.funded>NODES[key].cost||!Number.isSafeInteger(row.completed)||row.completed<0||row.completed>(s.gameOver?s.cycle:s.cycle-1)||!!row.completed!==(row.funded===NODES[key].cost))throw Error('Invalid research progress.');
    // Funding may start only once prerequisites were learned in an earlier month.
    const r=requires(key),before=k=>b.nodes[k].completed&&(!row.completed||b.nodes[k].completed<row.completed);
    if(row.funded&&(!r.all.every(before)||r.any.length&&!r.any.some(before)))throw Error('Invalid research prerequisite timing.');
   }
   for(const [family,model]of Object.entries(p.specializations||{})){if(!MODELS[family]?.[model])throw Error('Unknown operating model in the research tree.');if(level(p,family)<1)throw Error('An operating model needs its research family\'s foundation.');}
   if(context==='game'&&p.submitted)validatePlan(p,p.submitted);
   if(p.pendingNodeFunding!==undefined){if(context!=='view'||!p.submitted)throw Error('Invalid pending research funding.');validatePlan(p,{nodeFunding:p.pendingNodeFunding});}
  }
  if(s.rival?.researchTree!==undefined||s.rival?.researchTreeVersion!==undefined||s.rival?.pendingNodeFunding!==undefined)throw Error('Private rival research exposed.');
 }
 // AI: the same sizing as the capability-track planner it replaces (55% of
 // spare cash, one family or two above $1.2M spare, one node each), ranked by how
 // well each family fits the bank, and always the next node on the family's path.
 function nextNode(p,family){
  const order=['F','A1','A2','X','B1','B2'].map(s=>bySlot(family,s));
  return order.find(k=>!has(p,k)&&!issue(p,k))||null;
 }
 function botFit(p){
  const s=p.stats,a=p.allocation,doctrine=typeof p.doctrine==='object'?p.doctrine.key:p.doctrine;
  const fit={network:branchLevels(p)*2+a.service,digital:s.digital/12+(doctrine==='digital'?2:0),commercial:(s.business+s.merchant)/22+a.business,
   operations:a.operations*1.6+p.projects.length,acquisition:s.influence/9,risk:s.loans/9e6+s.compliance/14+(s.chargeoffs||0)/6e6};
  if(doctrine==='community')fit.network+=1.5;if(doctrine==='commercial')fit.commercial+=1.5;if(doctrine==='efficiency')fit.operations+=1.5;if(doctrine==='people')fit.network+=1;
  return fit;
 }
 function bot(g,index,plan){
  const p=g.players[index];if(!enabled(p))return plan;
  plan.investments={};delete plan.nodeFunding;
  if(tierRank(p)>=2)return plan;
  const spare=p.stats.cash-planBudget(p,plan,g).total;if(spare<250000)return plan;
  const fit=botFit(p),ranked=Object.keys(fit).sort((a,b)=>fit[b]-fit[a]||a.localeCompare(b)).filter(f=>nextNode(p,f));
  // Research may use up to half of the AI's whole-plan spending limit, so the
  // final reserve pass does not cut it to nothing after other planners spend.
  const review=aiCashPlanningReview(g,index,plan);
  let budget=Math.floor(Math.min(spare*.55,review?review.limit*.5:Infinity));
  for(const family of ranked.slice(0,spare>1200000?2:1)){
   if(budget<25000)break;const key=nextNode(p,family),q=quote(g,p,plan,key),amount=Math.min(NODE_CAP,budget,q.maximum);
   if(amount>=Math.min(1000,remaining(p,key))){plan.nodeFunding={...(plan.nodeFunding||{}),[key]:amount};budget-=amount;}
  }
  return plan;
 }
 // Reserve passes reduce the last-staged research first, as they do for other spending.
 function trim(p,plan,excess){
  for(const key of Object.keys(plan.nodeFunding||{}).reverse()){
   if(!excess())break;const next=plan.nodeFunding[key]-Math.ceil(excess());
   if(next>=Math.min(1000,remaining(p,key))&&next>0)plan.nodeFunding[key]=next;else delete plan.nodeFunding[key];
  }
  if(plan.nodeFunding&&!Object.keys(plan.nodeFunding).length)delete plan.nodeFunding;
 }
 return Object.freeze({NODE_CAP,SLOTS,FAMILIES,LEVEL_TEXT,TERMS,ADDITIVE,NODES,COMBINATIONS,MODELS,enabled,has,level,spent,learned,requires,combination,combinations,sources,
  multiplier,additive,effect,modelTable,branchTable,initialize,issue,spend,remaining,validatePlan,quote,settle,project,validate,bot,trim,nextNode,bySlot});
})();
