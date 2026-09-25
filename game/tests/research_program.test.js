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
