'use strict';
// Core research programme (save 8.20). The contract this file defends:
//  - opting in is explicit; an un-opted Core campaign is untouched at 8.19
//  - Expanded and every earlier rule set are byte-identical, including AI plans
//  - the sixth branch and third operating models exist only under the marker
//  - the owner view never widens for a campaign that did not opt in
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const copy=x=>JSON.parse(JSON.stringify(x));
function load(html){const c={};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const E=load(require('../tools/build_game').assemble().html);
const BASE={currentReporting:true,currentEconomics:true,currentRivalry:true};
const core=(research=true)=>({...E.previewCampaignEdition({},'core',{...BASE,currentResearch:research}).options,
  mode:'hotseat',seed:'research-program',created:1,startingWorkforce:'covered'});
const expanded=()=>({...E.previewCampaignEdition({},'expanded',BASE).options,
  mode:'hotseat',seed:'research-program',created:1,startingWorkforce:'covered'});

test('opting in is explicit and versioned; Core without it is unchanged',()=>{
 assert.equal(E.previewCampaignEdition({},'core',BASE).rules.version,'8.19');
 assert.equal(E.previewCampaignEdition({},'core',{...BASE,currentResearch:true}).rules.version,'8.20');
 assert.equal(E.previewCampaignEdition({},'core',BASE).options.researchProgramVersion,undefined);
 assert.equal(E.previewCampaignEdition({},'expanded',{...BASE,currentResearch:true}).options.researchProgramVersion,undefined);
 assert.equal(E.createGame(core(true)).version,'8.20');
 assert.equal(E.createGame(core(false)).version,'8.19');
});

test('the marker is strictly validated and Core-only',()=>{
 for(const bad of [2,-1,'1',null,0.5])assert.throws(()=>E.createGame({...core(true),researchProgramVersion:bad}),/research programme/i);
 assert.throws(()=>E.createGame({...expanded(),researchProgramVersion:1}),/requires Core/);
 const g=E.createGame(core(true));
 assert.equal(g.researchProgramVersion,1);
 for(const p of g.players)assert.equal(p.researchProgramVersion,1);
});

test('research requires reporting even when the reporting preview flag is false',()=>{
 for(const currentReporting of [false,true])for(const currentEconomics of [false,true]){
  const proposal=E.previewCampaignEdition({},'core',{currentReporting,currentEconomics,currentResearch:true});
  assert.equal(proposal.rules.valid,true);
  const g=E.createGame({...proposal.options,mode:'hotseat',seed:'reporting-invariant',created:1});
  assert.equal(g.researchProgramVersion,currentEconomics?1:undefined);
  if(currentEconomics)assert.equal(g.incomeHistoryVersion,1,'Research economics always enables its reporting prerequisite');
 }
 for(const marker of [undefined,0]){
  const options={...core(true),incomeHistoryVersion:marker};
  for(const context of ['creation','lobby']){
   const rules=E.campaignRules(options,{context});
   assert.equal(rules.valid,false);
   assert(rules.issues.some(issue=>issue.field==='commercialServiceVersion'&&issue.code==='missing_dependency'));
  }
  assert.throws(()=>E.createGame(options),/requires Persistent income reporting/);
 }
 const g=E.createGame(core(true)),save=copy(g),view=copy(E.publicState(g,0));
 delete save.incomeHistoryVersion;delete view.incomeHistoryVersion;
 assert.throws(()=>E.migrateCampaign(save),/requires Persistent income reporting/);
 assert.throws(()=>E.validateIncomeHistoryView(view),/requires Persistent income reporting/);
});

test('Core research cannot enable either Product programmes ruleset',()=>{
 const g=E.createGame(core(true));
 assert.equal([1,2].includes(g.productProgramsVersion),false,'The recovery planner product-programme guard excludes current Core');
 for(const version of [1,2]){
  // Include every programme prerequisite, so refusal proves an incompatible
  // rules combination rather than merely an incomplete options object.
  const programmes=E.previewFeatureSelection({}, {field:'productProgramsVersion',value:version});
  assert.equal(programmes.rules.valid,true);
  const incompatible={...core(true),...programmes.options};
  assert.equal(incompatible.researchProgramVersion,1);
  assert.equal(incompatible.bankEconomicsVersion,2);
  assert.equal(incompatible.productProgramsVersion,version);
  for(const context of ['creation','lobby']){
   const rules=E.campaignRules(incompatible,{context});
   assert.equal(rules.valid,false);
   assert(rules.issues.some(issue=>issue.field==='bankEconomicsVersion'&&issue.code==='unsupported_combination'));
  }
  assert.throws(()=>E.createGame(incompatible),/Core balance-sheet economics requires Core/);
  const save=copy(g),view=copy(E.publicState(g,0));
  save.productProgramsVersion=version;view.productProgramsVersion=version;
  assert.throws(()=>E.migrateCampaign(save),/requires/);
  assert.throws(()=>E.validateIncomeHistoryView(view),/requires/);
 }
});

test('the sixth branch and third models exist only under the marker',()=>{
 const on=E.createGame(core(true)),off=E.createGame(core(false));
 assert.equal(E.researchBranches(on.players[0]).join(','),'network,digital,commercial,operations,acquisition,risk');
 assert.equal(E.researchBranches(off.players[0]).join(','),'network,digital,commercial,operations,acquisition');
 assert.equal(Object.keys(on.players[0].capability).sort().join(','),
   'acquisition,commercial,digital,network,operations,risk');
 assert.equal(off.players[0].capability.risk,undefined);
 assert.equal(Object.keys(E.researchModelTable(on.players[0]).network).length,3);
 assert.equal(Object.keys(E.researchModelTable(off.players[0]).network).length,2);
 for(const branch of E.researchBranches(on.players[0]))
  assert.equal(Object.keys(E.researchModelTable(on.players[0])[branch]).length,3,branch+' needs three operating models');
});

test('research tables retain every legacy branch milestone and operating model',()=>{
 for(const [branch,definition] of Object.entries(E.STRATEGY_BRANCHES))
  assert.deepEqual(copy(E.RESEARCH_PROGRAM_BRANCHES[branch]),copy(definition),branch+' legacy milestones must remain compatible');
 for(const [branch,models] of Object.entries(E.STRATEGY_SPECIALIZATIONS))
  for(const [key,definition] of Object.entries(models))
   assert.deepEqual(copy(E.RESEARCH_PROGRAM_SPECIALIZATIONS[branch]?.[key]),copy(definition),branch+'/'+key+' must remain a recognized earned model');
});

test('the owner view widens only for a campaign that opted in',()=>{
 for(const [label,options,expectRisk] of [['opted in',core(true),true],['not opted in',core(false),false],['expanded',expanded(),false]]){
  const g=E.createGame(options),v=E.publicState(g,0);
  assert.equal(v.researchProgramVersion,expectRisk?1:undefined,label);
  assert.equal(!!v.strategySpecializations.risk,expectRisk,label+' models');
  assert.equal(!!v.capabilityTiers.risk,expectRisk,label+' tiers');
  assert.equal(v.rival?.researchProgramVersion,undefined,label+' must not leak to the rival');
 }
});

test('an opted-in campaign resolves, validates and round-trips',()=>{
 const g=E.createGame(core(true));
 for(let month=0;month<6;month++){
  const plans=g.players.map((_,i)=>E.chooseBot(g,i));
  for(const seat of [0,1])E.submit(g,seat,plans[seat]);
  E.validateLedger(g);E.validatePilot(g);
 }
 assert.equal(g.version,'8.20');
 const restored=E.migrateCampaign(copy(g));
 assert.equal(restored.version,'8.20');
 assert.equal(restored.researchProgramVersion,1);
 E.validatePilot(restored);
 for(const [i,p] of restored.players.entries()){
  assert.equal(p.researchProgramVersion,1);
  assert.equal(JSON.stringify(p.capability),JSON.stringify(g.players[i].capability));
  assert.equal(JSON.stringify(p.specializations),JSON.stringify(g.players[i].specializations));
  assert.equal(JSON.stringify(p.stats),JSON.stringify(g.players[i].stats));
 }
});

test('research in the sixth branch accrues and locks one permanent model',()=>{
 const g=E.createGame(core(true)),p=g.players[0];
 assert.ok(E.capabilityNextCost(p,'risk')>0,'the sixth branch must have a fundable first tier');
 // Tier 1 costs more than the per-cycle cap, so locking takes more than one month.
 for(let month=0;month<4&&E.strategyLevel(p,'risk')<1;month++){
  const plans=g.players.map((_,i)=>E.chooseBot(g,i));
  const room=Math.min(E.capabilityNextCost(p,'risk'),E.CAPABILITY_CAP_PER_CYCLE,p.stats.cash);
  plans[0].investments=room>=1000?{risk:room}:{};
  plans[0].specializations={...(plans[0].specializations||{}),risk:'provisioning'};
  for(const seat of [0,1])E.submit(g,seat,plans[seat]);
  E.validateLedger(g);E.validatePilot(g);
 }
 assert.ok(p.capability.risk>0,'risk spend must be recorded');
 assert.equal(E.strategyLevel(p,'risk'),1,'tier 1 must be reachable');
 assert.equal(p.specializations.risk,'provisioning','the operating model must lock at tier 1');
 assert.ok(E.strategyTotal(p)>=1,'the sixth branch must count toward strategy total');
 // Permanent, and refused loudly rather than silently ignored.
 const after=g.players.map((_,i)=>E.chooseBot(g,i));
 after[0].specializations={...(after[0].specializations||{}),risk:'standing'};
 assert.throws(()=>E.submit(g,0,after[0]),/already operates a permanent model/);
 assert.equal(p.specializations.risk,'provisioning','the operating model must be permanent');
 // An unknown model must be refused outright.
 const bad=E.createGame(core(true)),bp=bad.players[0];
 const plan=bad.players.map((_,i)=>E.chooseBot(bad,i));
 plan[0].investments={risk:Math.min(E.CAPABILITY_CAP_PER_CYCLE,bp.stats.cash)};
 plan[0].specializations={risk:'notAModel'};
 assert.throws(()=>E.submit(bad,0,plan[0]),/./);
});

function acquireModel(options,branch,model){
 const g=E.createGame(options);
 for(let month=0;month<12&&!g.players[0].specializations[branch];month++){
  const plans=g.players.map((_,i)=>E.chooseBot(g,i)),p=g.players[0];
  Object.assign(plans[0],{newProjects:[],newProject:null,hires:0,competitiveAction:'none',investments:{}});
  const amount=Math.floor(Math.min(E.capabilityNextCost(p,branch),E.CAPABILITY_CAP_PER_CYCLE,E.planBudget(p,plans[0],g).remaining));
  plans[0].investments=amount>=1000?{[branch]:amount}:{};
  plans[0].specializations={...p.specializations,[branch]:model};
  for(const seat of [0,1])E.submit(g,seat,plans[seat]);
  E.validatePilot(g);E.validateLedger(g);
 }
 assert.equal(g.players[0].specializations[branch],model,'The model must be earned through legal monthly plans');
 return g;
}

const newModels=[['network','franchisePartners'],['digital','dataLedCredit'],
 ['commercial','relationshipBanking'],['operations','processRedesign'],['acquisition','consolidator'],
 ['risk','provisioning'],['risk','capitalEfficiency'],['risk','standing']];
for(const [branch,model] of newModels)test('save/reload preserves earned permanent model '+branch+'/'+model,()=>{
 const g=acquireModel(core(true),branch,model),restored=E.migrateCampaign(copy(g));
 E.validatePilot(restored);E.validateLedger(restored);
 const before=g.players[0],after=restored.players[0];
 assert.deepEqual(copy(after.specializations),copy(before.specializations));
 assert.deepEqual(copy(after.capability),copy(before.capability),'Reload must retain paid research');
 assert.deepEqual(copy(after.stats),copy(before.stats),'Reload must not change the financial result');
 const plan=E.chooseBot(restored,0),alternate=Object.keys(E.researchModelTable(after)[branch]).find(key=>key!==model);
 plan.specializations={...after.specializations,[branch]:alternate};
 assert.throws(()=>E.submit(restored,0,plan),/already operates a permanent model/,'Reload must not reopen a permanent choice');
 for(const seat of [0,1])E.validateIncomeHistoryView(E.publicState(restored,seat));
});

test('older Core saves retain their earned models and original model table',()=>{
 const g=acquireModel(core(false),'digital','automation'),restored=E.migrateCampaign(copy(g));
 assert.equal(restored.version,'8.19');
 assert.equal(restored.researchProgramVersion,undefined);
 assert.equal(restored.players[0].specializations.digital,'automation');
 assert.equal(E.researchModelTable(restored.players[0]).digital.dataLedCredit,undefined);
 E.validatePilot(restored);E.validateLedger(restored);
});

function finishNaturalCampaign(options){
 const g=E.createGame(options);
 for(let month=0;month<240&&!g.gameOver;month++){
  const plans=g.players.map((_,i)=>E.chooseBot(g,i));
  for(const seat of [0,1])E.submit(g,seat,plans[seat]);
 }
 assert.equal(g.gameOver,true,'The seeded campaign must reach an engine-resolved ending');
 E.validatePilot(g);E.validateLedger(g);
 return E.migrateCampaign(copy(g));
}

function campaignVersionMarkers(g){
 // Core's empty fresh event history omits ledgerVersion; validateLedger stamps
 // it lazily (ledger.js). This audit marker may reset, unlike gameplay rules.
 const resettable=new Set(['ledgerVersion']);
 const markers=source=>Object.fromEntries(Object.entries(source).filter(([key])=>key.endsWith('Version')&&!resettable.has(key)));
 return copy({campaign:markers(g),owners:g.players.map(markers)});
}

for(const enabled of [true,false])test('natural Core rematch preserves '+(enabled?'research programme':'older rules'),()=>{
 const options=enabled?{...E.previewCampaignEdition({},'core',{currentReporting:false,currentEconomics:true,currentResearch:true}).options,
  mode:'hotseat',seed:'research-program',created:1,startingWorkforce:'covered'}:core(false);
 const g=finishNaturalCampaign(options),version=g.version,markers=campaignVersionMarkers(g);
 assert.equal(version,enabled?'8.20':'8.19');
 assert(g.players.some(p=>Object.keys(p.specializations).length>0),'The ending must contain earned models so the rematch reset is exercised');
 assert.equal(E.rematch(g,0),false,'One hotseat vote must not restart the campaign');
 assert.equal(g.version,version);assert.equal(g.gameOver,true);
 assert.equal(E.rematch(g,1),true);
 assert.equal(g.gameOver,false);assert.equal(g.cycle,1);assert.equal(g.version,version);
 assert.deepEqual(campaignVersionMarkers(g),markers,'Every campaign and owner rules marker must survive rematch');
 assert.equal(g.researchProgramVersion,enabled?1:undefined);
 for(const p of g.players){
  assert.equal(p.researchProgramVersion,enabled?1:undefined);
  assert.equal(E.researchBranches(p).includes('risk'),enabled);
  assert.equal(p.capability.risk,enabled?0:undefined,'A rematch keeps the rules but resets paid research');
  assert(Object.values(p.capability).every(amount=>amount===0),'All paid capabilities reset');
  assert.deepEqual(copy(p.specializations),{},'Earned models must not survive a fresh campaign');
  assert.equal(!!E.researchProductBarred(p,'retail','highYield'),enabled);
 }
 E.validatePilot(g);E.validateLedger(g);
 assert.equal(g.ledgerVersion,1,'The reset event ledger must still validate to its supported schema');
 for(const seat of [0,1])E.validateIncomeHistoryView(E.publicState(g,seat));
 const restored=E.migrateCampaign(copy(g));assert.equal(restored.version,version);
});

test('a valid Expanded funding-resolution rematch never enables Core research',()=>{
 const g=E.createGame(expanded()),p=g.players[0],A=E.AccountingPrototype;
 // Debt-backed securities create a real funding breach; normal monthly
 // servicing and covenant settlement, not a forced gameOver flag, end play.
 p.accounting=A.transact(p.accounting,'borrow',6000000);
 p.accounting=A.transact(p.accounting,'buySecurities',p.accounting.accounts.cash);
 const a=p.accounting.accounts;
 Object.assign(p.stats,{cash:a.cash,loans:a.loans,deposits:a.deposits,emergencyDebt:a.emergencyDebt,capital:a.equity,earnings:p.accounting.retainedEarnings});
 E.validatePilot(g);E.validateLedger(g);
 for(let month=0;month<3&&!g.gameOver;month++){
  const plans=g.players.map((_,i)=>E.chooseBot(g,i));
  for(const seat of [0,1])E.submit(g,seat,plans[seat]);
 }
 assert.equal(g.gameOver,true);assert.equal(g.endReason,'funding_resolution');
 const restored=E.migrateCampaign(copy(g)),markers=campaignVersionMarkers(g);
 assert.equal(E.rematch(restored,0),false);assert.equal(E.rematch(restored,1),true);
 assert.deepEqual(campaignVersionMarkers(restored),markers,'Expanded must preserve all of its rules without gaining research');
 assert.equal(restored.version,'9.33');assert.equal(restored.bankRivalryVersion,1);
 assert.equal(restored.researchProgramVersion,undefined);
 assert(restored.players.every(owner=>owner.researchProgramVersion===undefined&&owner.capability.risk===undefined));
 E.validatePilot(restored);E.validateLedger(restored);
});
