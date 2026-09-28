// Expanded 9.37. Learned knowledge is separate from paid platforms and staff.
// No implicit migration: previous campaigns retain their original research gates.
// From 9.41 these five nodes live in the research tree; the functions below read
// and fund them there, and every consumer of this module keeps its call sites.
const DigitalCommercial=(()=>{
 const enabled=p=>p?.digitalCommercialVersion===1,copy=x=>JSON.parse(JSON.stringify(x));
 const NODES=Object.freeze({
  digitalArchitecture:{name:'Digital Architecture',family:'Digital Systems',cost:100000,requires:[],effect:'Deposit administration in Technology uses 20% less employee time. Product support, offices and platform support remain.'},
  workflowAutomation:{name:'Workflow Automation',family:'Digital Systems',cost:100000,requires:['digitalArchitecture'],effect:'Active payroll and treasury applications use 15% less contract delivery time. Exception handling, Technology coverage and upkeep remain.'},
  relationshipPlanning:{name:'Relationship Planning',family:'Commercial Banking',cost:50000,requires:[],effect:'Eligible service bids gain 1 matching point. Staff, capacity, customer choice and competing bids still determine acceptance.'},
  cashManagementDesign:{name:'Cash-Management Design',family:'Commercial Banking',cost:75000,requires:['relationshipPlanning'],effect:'Treasury mandates use 10% less delivery time. Requires a deployed and active treasury platform to earn fees.'},
  paymentsIntegration:{name:'Payments Integration',family:'Commercial Banking',cost:125000,requires:['cashManagementDesign'],effect:'Direct payroll and treasury delivery costs fall 10% when their respective applications are active. Merchant settlement cost falls 10% with an active treasury platform.'}
 });
 const CAP=100000;
 const tree=s=>ResearchTree.enabled(s);
 function has(p,key){return tree(p)?ResearchTree.has(p,key):enabled(p)&&!!p.digitalCommercial?.nodes[key]?.completed;}
 function combined(p){return has(p,'paymentsIntegration')&&has(p,'workflowAutomation');}
 function initialize(g,o){if(o.digitalCommercialVersion!==1)return;g.digitalCommercialVersion=1;for(const p of g.players){p.digitalCommercialVersion=1;if(o.researchTreeVersion===1)continue;p.digitalCommercial={version:1,nodes:Object.fromEntries(Object.keys(NODES).map(k=>[k,{funded:0,completed:0}]))};}}
 function issue(p,key){if(tree(p))return ResearchTree.issue(p,key);const d=NODES[key];if(!enabled(p)||!d)return 'This capability requires Expanded 9.37.';if(has(p,key))return 'This capability is already completed.';const missing=d.requires.filter(k=>!has(p,k));return missing.length?'Complete '+missing.map(k=>NODES[k].name).join(' and ')+' in an earlier month.':'';}
 function spend(plan){return Object.values(plan?.nodeFunding||{}).reduce((n,x)=>n+(Number.isSafeInteger(x)&&x>0?x:0),0);}
 function validatePlan(p,plan){
  if(tree(p))return ResearchTree.validatePlan(p,plan);
  if(plan.nodeFunding===undefined)return;
  if(!enabled(p)||!plan.nodeFunding||Array.isArray(plan.nodeFunding)||typeof plan.nodeFunding!=='object')throw Error('Invalid capability funding instruction.');
  for(const [key,amount]of Object.entries(plan.nodeFunding)){const why=issue(p,key);if(why)throw Error(why);if(!Number.isSafeInteger(amount)||amount<Math.min(1000,NODES[key].cost-p.digitalCommercial.nodes[key].funded)||amount>NODES[key].cost-p.digitalCommercial.nodes[key].funded)throw Error('Fund at least $1,000 (or the smaller final remainder) without exceeding the remaining node cost.');}
  if(spend(plan)>CAP)throw Error('The five-node programme shares a $100,000 monthly funding cap.');
 }
 function quote(g,p,plan,key){
  if(tree(p))return ResearchTree.quote(g,p,plan,key);
  const d=NODES[key];if(!d)throw Error('Unknown capability.');const without=copy(plan);delete without.nodeFunding?.[key];
  const b=planBudget(p,without,g),envelope=(without.departmentPolicy?.envelopes.research??Infinity)-Object.values(without.investments||{}).reduce((n,x)=>n+x,0)-spend(without),funded=p.digitalCommercial.nodes[key].funded,reason=issue(p,key),maximum=reason?0:Math.max(0,Math.floor(Math.min(envelope,d.cost-funded,CAP-spend(without),Number.isFinite(b.discretionaryRemaining)?b.discretionaryRemaining:b.remaining)));
  return {...d,key,funded,completed:p.digitalCommercial.nodes[key].completed,reason,maximum:maximum<Math.min(1000,d.cost-funded)?0:maximum,planned:plan.nodeFunding?.[key]||0,minimumMonths:Math.ceil((d.cost-funded)/CAP),cap:CAP};
 }
 function settle(g,p,plan){
  if(tree(p))return ResearchTree.settle(g,p,plan);
  if(!enabled(p))return [];validatePlan(p,plan);const lines=[];
  for(const [key,amount]of Object.entries(plan.nodeFunding||{})){
   // No automatic emergency borrowing or partial progress for unfunded work.
   if(p.stats.cash<amount){lines.push(p.name+': '+NODES[key].name+' funding cancelled because cash is unavailable.');continue;}
   p.accounting=AccountingPrototype.post(p.accounting,'research.capability',{cash:-amount,equity:-amount},-amount);syncAccounts(p);
   const row=p.digitalCommercial.nodes[key];row.funded+=amount;
   if(row.funded===NODES[key].cost){row.completed=g.cycle;lines.push(p.name+' completed '+NODES[key].name+'. Benefits and dependent actions begin next month.');}
   else lines.push(p.name+' funded $'+amount.toLocaleString()+' of '+NODES[key].name+'.');
  }
  return lines;
 }
 function platformIssue(p,key){
  if(!enabled(p)||!['buildTreasuryDesk','partnerTreasuryDesk'].includes(key))return null;
  if(key==='buildTreasuryDesk'&&!combined(p))return 'Learn Payments Integration and Workflow Automation for Digital Treasury Services, or choose the partner route after Relationship Planning.';
  if(key==='partnerTreasuryDesk'&&!has(p,'relationshipPlanning'))return 'Complete Relationship Planning first. Partner delivery does not require the internal combination.';
  return '';
 }
 function load(p,kind){const active=kind==='merchant'?serviceApplicationActive(p,'treasury'):serviceApplicationActive(p,kind);return SERVICE_TYPES[kind].load*(has(p,'workflowAutomation')&&active?.85:1)*(has(p,'cashManagementDesign')&&kind==='treasury'?.9:1);}
 function cost(p,kind,base){const active=serviceApplicationActive(p,kind==='merchant'?'treasury':kind);return Math.round(base*(has(p,'paymentsIntegration')&&active?.9:1));}
 function technology(p,depositWork){return depositWork*(has(p,'digitalArchitecture')?.8:1);}
 function bid(p){return has(p,'relationshipPlanning')?1:0;}
 function project(g,out,index){if(tree(g)){out.digitalCommercialVersion=1;out.me.digitalCommercialVersion=1;return ResearchTree.project(g,out,index);}if(!enabled(g))return;out.digitalCommercialVersion=1;out.me.digitalCommercialVersion=1;out.me.digitalCommercial=copy(g.players[index].digitalCommercial);if(g.players[index].submitted?.nodeFunding)out.me.pendingNodeFunding=copy(g.players[index].submitted.nodeFunding);for(const [id,plan]of Object.entries(out.lastPlans||{}))if(id!==out.me.id)delete plan.nodeFunding;}
 function validate(s,context){
  // Tree campaigns keep this rule marker but hold their nodes in the research tree.
  ResearchTree.validate(s,context);if(tree(s)){if(!enabled(s)||(context==='game'?s.players:[s.me]).some(p=>p.digitalCommercialVersion!==1))throw Error('Invalid capability rule boundary.');return;}
  const active=enabled(s),owners=context==='game'?s.players:[s.me],exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===keys.slice().sort().join();
  if(s.digitalCommercialVersion!==undefined&&!active||s.version==='9.37'&&!active)throw Error('Unsupported Digital + Commercial rules.');
  if(active)validateCampaignRules(s,context);
  for(const p of owners){
   if(p.digitalCommercialVersion!==(active?1:undefined)||!active&&p.digitalCommercial!==undefined)throw Error('Invalid capability rule boundary.');if(!active)continue;
   const b=p.digitalCommercial;if(!exact(b,['version','nodes'])||b.version!==1||!exact(b.nodes,Object.keys(NODES)))throw Error('Invalid capability book.');
   for(const [key,row]of Object.entries(b.nodes)){if(!exact(row,['funded','completed'])||!Number.isSafeInteger(row.funded)||row.funded<0||row.funded>NODES[key].cost||!Number.isSafeInteger(row.completed)||row.completed<0||row.completed>(s.gameOver?s.cycle:s.cycle-1)||!!row.completed!==(row.funded===NODES[key].cost))throw Error('Invalid capability progress.');for(const prerequisite of NODES[key].requires)if(row.funded&&(!b.nodes[prerequisite].completed||row.completed&&b.nodes[prerequisite].completed>=row.completed))throw Error('Invalid capability prerequisite timing.');}
   if(context==='game'&&p.submitted)validatePlan(p,p.submitted);
   if(p.pendingNodeFunding!==undefined){if(context!=='view'||!p.submitted)throw Error('Invalid pending capability funding.');validatePlan(p,{nodeFunding:p.pendingNodeFunding});}
  }
  if(s.rival?.digitalCommercial!==undefined||s.rival?.digitalCommercialVersion!==undefined||s.rival?.pendingNodeFunding!==undefined)throw Error('Private rival capability book exposed.');
 }
 // Called before department budgets and the final legal-plan coordinator.
 function bot(g,index,plan){
  const p=g.players[index];if(tree(p))return ResearchTree.bot(g,index,plan);if(!enabled(p))return plan;
  const order=['relationshipPlanning','digitalArchitecture','cashManagementDesign','workflowAutomation','paymentsIntegration'];
  const key=order.find(k=>!has(p,k)&&!issue(p,k));
  if(key){plan.investments={};const q=quote(g,p,plan,key),amount=Math.min(50000,q.maximum);if(amount>=Math.min(1000,NODES[key].cost-p.digitalCommercial.nodes[key].funded))plan.nodeFunding={[key]:amount};}
  if(combined(p)&&!p.serviceDesk.applications.treasury&&!p.projects.some(x=>x.key==='buildTreasuryDesk')){
   // Finish the learned platform before proposing another expansion or research bill.
   plan.investments={};plan.newProjects=[];plan.newProject=null;
   const q=projectStartStatus(g,p,'buildTreasuryDesk');const b=planBudget(p,plan,g);
   if(q.eligible&&b.remaining>=projectCost(p,PROJECTS.buildTreasuryDesk)&&b.freeCapacity>=2&&!planInitiatives(plan).some(k=>SERVICE_APPLICATIONS[k]?.app==='treasury')){plan.newProjects=[...planInitiatives(plan),'buildTreasuryDesk'];plan.newProject=plan.newProjects[0];}
  }
  return plan;
 }
 return Object.freeze({NODES,CAP,enabled,has,combined,initialize,issue,spend,validatePlan,quote,settle,platformIssue,load,cost,technology,bid,project,validate,bot});
})();
