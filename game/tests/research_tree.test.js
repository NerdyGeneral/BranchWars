'use strict';
// Expanded 9.41 research tree. Engine checks on the assembled source; --portable
// runs them on the built BRANCH_WARS.html. Learned nodes below are explicit
// fixtures written into the owner's research book.
if(!process.argv.includes('--portable')&&!process.argv.includes('--source'))process.argv.push('--source');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html,c={console};
// __mask switches off one source's term, so an effect is measured on the same bank state with and without it.
const MASK=["function multiplier(p,term){return sources(p).reduce((m,s)=>m*(s.effects[term]??1),1);}","function additive(p,term){return sources(p).reduce((t,s)=>t+(s.effects[term]||0),0);}"];
const masked=(src,fn,to)=>{assert(src.includes(fn),'Mask target moved');return src.replace(fn,to);};
let engine=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
engine=masked(engine,MASK[0],"function multiplier(p,term){return sources(p).reduce((m,s)=>m*(globalThis.__mask?.key===s.key&&globalThis.__mask.term===term?1:(s.effects[term]??1)),1);}");
engine=masked(engine,MASK[1],"function additive(p,term){return sources(p).reduce((t,s)=>t+(globalThis.__mask?.key===s.key&&globalThis.__mask.term===term?0:(s.effects[term]||0)),0);}");
vm.runInNewContext(engine.replace('root.BWEngine={','root.BWEngine={ResearchTree,strategyLevel,capabilitySpend,researchServiceMultiplier,researchDepositMultiplier,researchExpenseMultiplier,researchThroughputMultiplier,researchLoanMultiplier,researchFeeMultiplier,researchRelationshipMultiplier,researchRunoffMultiplier,researchReserveMultiplier,researchComplianceDelta,researchAttentionDelta,facilityRawOfficeMetrics,creditTerms,depositSummary,projectCost,projectCycles,executionCapacity,acquisitionTerms,originationCreditGuard,creditPerformanceForecast,validatePlan,'),c);
const E=c.BWEngine,T=E.ResearchTree,D=E.DigitalCommercial,copy=x=>JSON.parse(JSON.stringify(x));
const FLAGS={currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true,currentBusiness:true,currentDigitalCommercial:true,currentPartnerCards:true,currentCardEconomics:true,currentBankCards:true};
function create(tree=true,seed='research-tree'){return E.createGame({...E.previewCampaignEdition({},'expanded',{...FLAGS,currentResearchTree:tree}).options,mode:'hotseat',seed,scenario:'balanced',created:1,startingWorkforce:'covered'});}
function month(g,funding=[{},{}],models=[{},{}]){const plans=g.players.map((_,i)=>E.chooseBot(g,i));for(const i of [0,1]){plans[i].investments={};plans[i].nodeFunding=funding[i];if(!Object.keys(funding[i]).length)delete plans[i].nodeFunding;plans[i].specializations={...plans[i].specializations,...models[i]};}E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);}
const learn=(p,...keys)=>{for(const k of keys)p.researchTree.nodes[k]={funded:T.NODES[k].cost,completed:1};};
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}

test('9.41 is explicit, peer-gated, and older campaigns keep the capability tracks',()=>{
 const g=create(),old=create(false);
 assert.equal(g.version,'9.41');assert.equal(old.version,'9.40');assert.equal(g.researchTreeVersion,1);assert.equal(old.researchTreeVersion,undefined);
 assert(g.players.every(p=>p.researchTreeVersion===1&&p.digitalCommercialVersion===1&&p.digitalCommercial===undefined&&Object.keys(p.researchTree.nodes).length===36));
 assert(old.players.every(p=>p.researchTree===undefined&&p.digitalCommercial));
 assert.equal(Object.keys(T.FAMILIES).length,6);assert.equal(Object.keys(T.NODES).length,36);
 for(const f of Object.keys(T.FAMILIES))assert.deepEqual(Object.values(T.NODES).filter(n=>n.family===f).map(n=>n.slot).sort(),['A1','A2','B1','B2','F','X']);
 assert.equal(E.campaignVersionSupported('9.41'),true);const caps=E.campaignCapabilities();assert.equal(caps.researchTreeSupported,1);
 assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps),null);
 const older={...caps};delete older.researchTreeSupported;assert(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),older));
 assert.equal(E.peerRulesIssue(E.campaignRules(old,{context:'game'}),older),null,'A 9.40 campaign still links to an older peer');
 assert.equal(E.previewCampaignEdition({},'expanded',{...FLAGS,currentBankCards:false,currentResearchTree:true}).options.researchTreeVersion,undefined,'The tree follows the 9.40 rules');
 for(const i of [0,1]){const v=E.publicState(g,i);assert.equal(v.me.researchTreeVersion,1);assert(v.me.researchTree);assert.equal(v.rival.researchTree,undefined);assert.equal(Object.keys(v.strategyBranches).length,6);assert(v.researchTreeRules.nodes.integratedNetwork);}
});

test('funding follows the tree: prerequisites, one node per family, the monthly cap, and next-month benefits',()=>{
 const g=create(),p=g.players[0];
 assert.throws(()=>T.validatePlan(p,{nodeFunding:{localServiceDesign:100000}}),/Learn Market Planning/);
 assert.throws(()=>T.validatePlan(p,{nodeFunding:{marketPlanning:100001}}),/at most \$100,000/);
 assert.throws(()=>T.validatePlan(p,{nodeFunding:{marketPlanning:999}}),/at least \$1,000/);
 assert.throws(()=>E.validatePlan(g,p,{...E.chooseBot(copy(g),0),investments:{network:50000}}),/fund research nodes, not capability tracks/);
 learn(p,'marketPlanning');
 assert.throws(()=>T.validatePlan(p,{nodeFunding:{localServiceDesign:50000,hubNetworkPlanning:50000}}),/one node at a time/);
 T.validatePlan(p,{nodeFunding:{localServiceDesign:50000,underwritingStandards:50000}});
 assert.throws(()=>T.validatePlan(p,{nodeFunding:{integratedNetwork:50000}}),/Local Service Design|Relationship Retention|Standard Office Rollout/);
 const h=create(),q=()=>h.players[0];month(h,[{marketPlanning:100000},{}]);
 assert.equal(q().researchTree.nodes.marketPlanning.completed,1);assert.equal(E.strategyLevel(q(),'network'),1);assert.equal(E.capabilitySpend(q(),'network'),100000);
 assert.throws(()=>T.validatePlan(q(),{nodeFunding:{marketPlanning:1000}}),/already learned/);
 month(h,[{localServiceDesign:100000},{}]);assert.equal(q().researchTree.nodes.localServiceDesign.completed,0,'A partly funded node is not learned');assert.equal(E.strategyLevel(q(),'network'),1);
 month(h,[{localServiceDesign:40000},{}]);
 assert.equal(q().researchTree.nodes.localServiceDesign.completed,3);assert.equal(E.strategyLevel(q(),'network'),2);E.validatePilot(h);E.validateLedger(h);
});

test('family levels come from learned nodes; the capstone gives level 4',()=>{
 const g=create(),p=g.players[0];
 assert.equal(E.strategyLevel(p,'risk'),0);learn(p,'underwritingStandards');assert.equal(E.strategyLevel(p,'risk'),1);
 learn(p,'creditMonitoring','complianceProgramme');assert.equal(E.strategyLevel(p,'risk'),3);
 learn(p,'workoutMethods','capitalPlanning');assert.equal(E.strategyLevel(p,'risk'),3,'Both paths without the capstone stay at level 3');
 learn(p,'integratedRiskControls');assert.equal(E.strategyLevel(p,'risk'),4);
});

// Every node, combination and added model must reach its consumer exactly as advertised.
function reader(g,p){
 const office=p.facilityNetwork.offices.find(o=>o.closedCycle===null),acquisitionTarget=Object.keys(g.territories).find(k=>g.territories[k].shares);
 const late=q=>{const x=copy(q);for(const c of x.creditBook.cohorts)c.late=[5000000,5000000,5000000];return E.creditPerformanceForecast(x,g.economy);};
 return {
  service:q=>E.researchServiceMultiplier(q),deposits:q=>E.researchDepositMultiplier(q),loans:q=>E.researchLoanMultiplier(q),throughput:q=>E.researchThroughputMultiplier(q),
  fees:q=>E.researchFeeMultiplier(q),relationships:q=>E.researchRelationshipMultiplier(q),expense:q=>E.researchExpenseMultiplier(q),runoff:q=>E.researchRunoffMultiplier(q),reserve:q=>E.researchReserveMultiplier(q),
  officeDeposits:q=>E.facilityRawOfficeMetrics(q,office).depositCapacity,officeExpense:q=>E.facilityRawOfficeMetrics(q,office).expense,
  newLoanRisk:q=>E.creditTerms(q,g).risk,newLoanRate:q=>E.creditTerms(q,g).rate,depositService:q=>E.depositSummary(q,g).service,
  officeProjectCost:q=>E.projectCost(q,E.PROJECTS.branch),projectCost:q=>E.projectCost(q,E.PROJECTS.correctiveAction),acquisitionCost:q=>E.projectCost(q,E.PROJECTS.acquisition),
  acquisitionTransfer:q=>E.acquisitionTerms({...g,players:[q,g.players[1]]},q,acquisitionTarget).depositTake,acquisitionWork:q=>E.projectCycles(q,E.PROJECTS.acquisition),
  execution:q=>E.executionCapacity(q),compliance:q=>E.researchComplianceDelta(q),attention:q=>E.researchAttentionDelta(q),
  cure:q=>late(q).cured,severity:q=>late(q).loss
 };
}
test('every advertised effect reaches its consumer in the stated direction',()=>{
 const g=create(),p=g.players[0],read=reader(g,p);
 const up=(term,value)=>T.ADDITIVE.includes(term)?value>0:value>1,moved=[];
 const check=(key,apply,effects)=>{
  const q=copy(p);apply(q);
  for(const [term,value] of Object.entries(effects)){
   const fn=read[term];assert(fn,key+': no reader for '+term);
   c.__mask={key,term};let before;try{before=fn(q);}finally{c.__mask=null;}const after=fn(q);
   const rises=up(term,value);assert(rises?after>before:after<before,key+' '+term+': '+before+' -> '+after);moved.push(term);
  }
 };
 for(const [k,d] of Object.entries(T.NODES))if(Object.keys(d.effects).length)check(k,q=>learn(q,k),d.effects);
 for(const [k,d] of Object.entries(T.COMBINATIONS))check(k,q=>learn(q,...d.requires),d.effects);
 for(const [f,models] of Object.entries(T.MODELS))for(const [k,m] of Object.entries(models))if(m.effects)check(f+':'+k,q=>{q.specializations={...q.specializations,[f]:k};},m.effects);
 assert(Object.keys(T.TERMS).every(t=>moved.includes(t)),'Every term has a live consumer: '+Object.keys(T.TERMS).filter(t=>!moved.includes(t)));
 // The five Digital & Commercial nodes keep their named 9.37 effects through the same module.
 const q=copy(p);learn(q,'digitalArchitecture','workflowAutomation','relationshipPlanning','cashManagementDesign','paymentsIntegration');
 assert(D.technology(q,100)<D.technology(p,100));assert.equal(D.bid(q),1);assert.equal(D.bid(p),0);assert.equal(D.combined(q),true);assert.equal(D.platformIssue(q,'buildTreasuryDesk'),'');
});

test('effects stack: nodes on one term multiply, and the old OR cases combine',()=>{
 const g=create(),p=g.players[0];
 const a=copy(p);learn(a,'digitalArchitecture','selfServiceOnboarding');const b=copy(a);learn(b,'marketPlanning');
 assert.equal(E.researchServiceMultiplier(a),1.05);assert(Math.abs(E.researchServiceMultiplier(b)-1.05*1.05)<1e-12);
 const lean=copy(p);lean.specializations={...lean.specializations,operations:'lean'};const both=copy(lean);learn(both,'processMapping','serviceQueueDesign','standardizedDelivery');
 const cost=q=>E.projectCost(q,E.PROJECTS.correctiveAction);
 assert(cost(both)<cost(lean),'Operations level 3 adds to the Lean discount instead of replacing it');
 const older=create(false).players[0];older.specializations={...older.specializations,operations:'lean'};older.capability.operations=5e6;
 const olderLean=copy(older);delete olderLean.capability;olderLean.capability={...older.capability,operations:0};
 assert.equal(cost(older),cost(olderLean),'9.40 keeps its original rule: level 3 or Lean, not both');
});

test('Risk & Capital carries loss control in the tree; models are permanent and need level 1',()=>{
 const g=create(),p=g.players[0],base=E.originationCreditGuard(p);
 const ops=copy(p);learn(ops,'processMapping','serviceQueueDesign','standardizedDelivery');assert.equal(E.originationCreditGuard(ops),base,'Operations research no longer lowers new-loan risk');
 const risk=copy(p);learn(risk,'underwritingStandards');assert(E.originationCreditGuard(risk)<base);
 month(g,[{},{}],[{risk:'standing'},{}]);assert.equal(g.players[0].specializations.risk,undefined,'A model waits for the family\'s foundation');
 const early=copy(g);early.players[0].specializations.risk='standing';assert.throws(()=>E.migrateCampaign(early),/operating model/i);
 learn(g.players[0],'underwritingStandards');month(g,[{},{}],[{risk:'standing'},{}]);assert.equal(g.players[0].specializations.risk,'standing');
 const next=E.chooseBot(copy(g),0);assert.throws(()=>E.validatePlan(copy(g),copy(g.players[0]),{...next,specializations:{...next.specializations,risk:'capitalEfficiency'}}),/permanent|already/i);
});

test('save, restore and rematch keep the 9.41 book and rules',()=>{
 const g=create();month(g,[{marketPlanning:100000},{underwritingStandards:100000}]);const p=g.players[0];
 const restored=E.migrateCampaign(copy(g));assert.deepEqual(copy(restored.players.map(x=>x.researchTree)),copy(g.players.map(x=>x.researchTree)));
 const a=copy(g);month(a);month(restored);assert.equal(JSON.stringify(E.migrateCampaign(copy(a))),JSON.stringify(E.migrateCampaign(copy(restored))));
 const done=copy(g);done.gameOver=true;E.rematch(done,0);E.rematch(done,1);
 assert.equal(done.version,'9.41');assert(done.players.every(x=>x.researchTreeVersion===1&&Object.values(x.researchTree.nodes).every(n=>!n.funded)));
 const tampered=copy(g);tampered.players[0].researchTree.nodes.integratedNetwork={funded:260000,completed:1};assert.throws(()=>E.migrateCampaign(tampered),/prerequisite|research/i);
 const v=E.publicState(g,0);v.rival.researchTree=copy(p.researchTree);assert.throws(()=>E.validateIncomeHistoryView(v),/rival research/i);
});

test('the AI funds foundations first and stages a legal plan',()=>{
 const g=create(),p=g.players[1],plan=E.chooseBot(copy(g),1);assert(Object.keys(plan.nodeFunding||{}).length,'The AI stages research at the start');
 E.validatePlan(copy(g),copy(p),copy(plan));
 for(const key of Object.keys(plan.nodeFunding||{}))assert.equal(T.NODES[key].slot,'F');
 const poor=copy(g);poor.players[1].stats.cash=200000;assert.equal(E.chooseBot(poor,1).nodeFunding,undefined,'No research without spare cash');
});

console.log('Research tree passed: '+checks+' checks on the 9.41 boundary, funding, levels, effect consumers, stacking, risk and models, persistence and AI.');
