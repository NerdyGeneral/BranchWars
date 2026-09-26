'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const copy=value=>JSON.parse(JSON.stringify(value));
function load(html){const context={};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);return context.BWEngine;}
const E=load(require('../tools/build_game').assemble().html);
const prior=fs.readFileSync(path.join(__dirname,'../../releases/v4-rc3/BRANCH_WARS.html'));
assert.equal(createHash('sha256').update(prior).digest('hex'),'a3c293cfe58ac21f97df256fe28bc06e35f14f14518015d2fd2cd26479052ccf');
const old=load(prior.toString('utf8')),editionOptions={currentReporting:true,currentEconomics:true,currentRivalry:true};
const options=(edition,research=false)=>({...E.previewCampaignEdition({},edition,{...editionOptions,currentResearch:research}).options,
  mode:'hotseat',seed:'research-bot',created:1,startingWorkforce:'covered'});

test('Core research AI replaces locked products and can submit its complete plan',()=>{
 const g=E.createGame({...options('core',true),scenario:'growth'});
 g.economy={...E.MACRO_REGIMES.steady};
 for(const p of g.players)p.doctrine='digital';
 const plans=g.players.map((p,index)=>{
  const plan=E.chooseBot(g,index);
  assert.deepEqual(copy(plan.products),{retail:'essential',business:'relationship',credit:'mortgage'});
  for(const [line,key]of Object.entries(plan.products))assert.equal(E.researchProductBarred(p,line,key),'');
  return plan;
 });
 for(const seat of [0,1])E.submit(g,seat,plans[seat]);
 assert.equal(g.cycle,2);
 E.validateLedger(g);E.validatePilot(g);
});

test('Core research AI keeps its preferred products once their requirements are met',()=>{
 const g=E.createGame({...options('core',true),scenario:'growth'});
 g.economy={...E.MACRO_REGIMES.steady};
 for(const p of g.players){
  p.doctrine='digital';
  for(const branch of ['network','digital','commercial','risk'])p.capability[branch]=E.CAPABILITY_TIERS[branch][0];
 }
 for(const [index,p]of g.players.entries()){
  const plan=E.chooseBot(g,index);
  assert.deepEqual(copy(plan.products),{retail:'rewards',business:'entrepreneur',credit:'consumer'});
  for(const [line,key]of Object.entries(plan.products))assert.equal(E.researchProductBarred(p,line,key),'');
 }
});

test('submit rejects every research-barred product without locking or changing the campaign',()=>{
 for(const [line,gates]of Object.entries(E.RESEARCH_PRODUCT_GATES)){
  const first=Object.keys(E.PRODUCT_PORTFOLIOS[line].options)[0];
  assert.equal(gates[first],undefined,line+' fallback must never require research');
  for(const key of Object.keys(gates)){
   const g=E.createGame(options('core',true)),p=g.players[0],plan=E.chooseBot(g,0);
   plan.products[line]=key;
   const missing=E.researchProductBarred(p,line,key),before=JSON.stringify(g);
   assert(missing,line+' '+key+' starts locked');
   assert.throws(()=>E.submit(g,0,plan),error=>error.message===E.PRODUCT_PORTFOLIOS[line].options[key].name+' requires '+missing+'.');
   assert.equal(JSON.stringify(g),before,line+' '+key+' rejected atomically');
  }
 }
});

test('submit accepts research products only after every prerequisite branch is earned',()=>{
 for(const [line,gates]of Object.entries(E.RESEARCH_PRODUCT_GATES))for(const [key,requirements]of Object.entries(gates)){
  const g=E.createGame(options('core',true)),p=g.players[0];
  for(const [branch,level]of Object.entries(requirements))p.capability[branch]=E.CAPABILITY_TIERS[branch][level-1];
  const plan=E.chooseBot(g,0);plan.products[line]=key;
  assert.equal(E.researchProductBarred(p,line,key),'');
  E.submit(g,0,plan);
  assert.equal(p.submitted.products[line],key);
 }
 const g=E.createGame(options('core',true)),p=g.players[0];
 p.capability.digital=E.CAPABILITY_TIERS.digital[0];
 const plan=E.chooseBot(g,0);plan.products.business='entrepreneur';
 assert.match(E.researchProductBarred(p,'business','entrepreneur'),/COMMERCIAL/);
 assert.throws(()=>E.submit(g,0,plan),/requires COMMERCIAL/);
});

test('Branch Integration discounts branch quotes and the amount paid during settlement',()=>{
 const g=E.createGame(options('core',true)),p=g.players[0];
 p.capability.network=E.CAPABILITY_TIERS.network[1];
 p.capability.acquisition=E.CAPABILITY_TIERS.acquisition[0];
 assert.equal(E.researchCombination(p,'branchIntegration'),false);
 const undiscounted=E.projectCost(p,E.PROJECTS.branch);
 p.capability.acquisition=E.CAPABILITY_TIERS.acquisition[1];
 assert.equal(E.researchCombination(p,'branchIntegration'),true);
 const discounted=Math.round(undiscounted*.78);
 assert.equal(E.projectCost(p,E.PROJECTS.branch),discounted);
 assert.equal(E.projectStartTerms(g,p,'branch',p.focus).cost,discounted);
 const oldRules=E.createGame(options('core')).players[0];
 oldRules.capability.network=p.capability.network;oldRules.capability.acquisition=p.capability.acquisition;
 assert.equal(E.projectCost(oldRules,E.PROJECTS.branch),undiscounted,'Earlier Core has no combination discount');
 g.event=E.EVENTS.find(event=>event.key==='quiet');
 const plans=g.players.map((owner,index)=>({...E.chooseBot(g,index),focus:owner.focus,
  decision:'b',capitalAction:false,competitiveAction:'none',opportunity:null,
  newProject:index===0?'branch':null,newProjects:index===0?['branch']:[],investments:{},specializations:{},hires:0}));
 const before=p.buildSpend||0;
 for(const seat of [0,1])E.submit(g,seat,plans[seat]);
 assert.equal(p.buildSpend-before,discounted,'The quoted discount reaches paid project settlement');
 assert(p.projects.some(project=>project.key==='branch'),'The project actually started');
 E.validateLedger(g);E.validatePilot(g);
});

test('unopted Core and current Expanded retain rc3 AI plans and RNG',()=>{
 for(const edition of ['core','expanded'])for(const scenario of ['balanced','rate','growth','regulatory']){
  const o={...options(edition),scenario},a=old.createGame(o),b=E.createGame(o);
  assert.deepEqual(copy(b),copy(a),edition+' '+scenario+' opening');
  const expected=a.players.map((_,i)=>old.chooseBot(a,i)),actual=b.players.map((_,i)=>E.chooseBot(b,i));
  assert.deepEqual(copy(actual),copy(expected),edition+' '+scenario+' plans');
  assert.deepEqual(copy(b.rng),copy(a.rng),edition+' '+scenario+' RNG');
 }
});

// Earn the research in settled, affordable plans. These fixtures deliberately
// choose staffing and hold an authored macro regime, but never inject
// cash, capability credit or a model into the bank.
function modelFixture(branch,{allocation={service:3,business:2,lending:2,operations:1},regime='steady',remaining=0,seed='funded-model'}={}){
 const g=E.createGame({...options('core',true),seed}),p=g.players[0];
 const hold=index=>({...E.chooseBot(g,index),allocation:index===0?{...allocation}:{...g.players[index].allocation},decision:'b',
  newProject:null,newProjects:[],hires:0,competitiveAction:'none',capitalAction:false,opportunity:null,
  investments:{},specializations:{...g.players[index].specializations},lendingPolicy:'balanced',capitalPolicy:'balanced'});
 const settle=amount=>{
  g.economy={key:regime,...E.MACRO_REGIMES[regime]};g.event=E.EVENTS.find(event=>event.key==='quiet');
  const plans=g.players.map((_,i)=>hold(i)),before=p.capability[branch];
  if(amount)plans[0].investments={[branch]:amount};
  assert(E.planBudget(p,plans[0],g).remaining>=0,'Research fixture must fund its plan from existing resources');
  for(const seat of [0,1])E.submit(g,seat,plans[seat]);
  assert.equal(p.capability[branch]-before,amount||0,'Research must be purchased in settlement');
  assert.equal(p.specializations[branch],undefined,'No fixture plan requests a permanent model');
  E.validateLedger(g);E.validatePilot(g);
 };
 while(p.capability[branch]<E.CAPABILITY_TIERS[branch][0]-remaining){
  settle(Math.min(E.CAPABILITY_CAP_PER_CYCLE,E.CAPABILITY_TIERS[branch][0]-remaining-p.capability[branch]));
 }
 g.economy={key:regime,...E.MACRO_REGIMES[regime]};g.event=E.EVENTS.find(event=>event.key==='quiet');
 return {g,p,hold,settle};
}

const modelCases=[
 ['network','retailDensity',{seed:'retail-model-0',allocation:{service:5,business:1,lending:1,operations:1}}],
 ['network','regionalHub',{allocation:{service:1,business:4,lending:2,operations:1}}],
 ['network','franchisePartners',{allocation:{service:1,business:1,lending:1,operations:5}}],
 ['digital','customerExperience',{allocation:{service:5,business:1,lending:1,operations:1}}],
 ['digital','automation',{allocation:{service:1,business:2,lending:1,operations:4}}],
 ['digital','dataLedCredit',{allocation:{service:1,business:1,lending:5,operations:1}}],
 ['commercial','treasury',{allocation:{service:1,business:5,lending:1,operations:1}}],
 ['commercial','specializedCredit',{allocation:{service:1,business:1,lending:5,operations:1}}],
 ['commercial','relationshipBanking',{allocation:{service:5,business:1,lending:1,operations:1}}],
 ['operations','lean',{allocation:{service:1,business:1,lending:1,operations:5}}],
 ['operations','resilience',{regime:'downturn'}],
 ['operations','processRedesign',{allocation:{service:4,business:1,lending:2,operations:1}}],
 ['acquisition','dealmaker',{allocation:{service:1,business:5,lending:1,operations:1}}],
 ['acquisition','integrator',{allocation:{service:4,business:0,lending:2,operations:2}}],
 ['acquisition','consolidator',{}],
 ['risk','provisioning',{regime:'downturn'}],
 ['risk','capitalEfficiency',{}],
 ['risk','standing',{regime:'tight'}]
];
for(const [branch,model,context]of modelCases)test('Core AI adopts paid model '+branch+'/'+model+' for its operating context',()=>{
 const {g,p,hold}=modelFixture(branch,context),before=copy(p),plan=E.chooseBot(g,0);
 assert.equal(E.strategyLevel(p,branch),1,'The current bank earned tier one with paid research');
 assert.equal(plan.specializations[branch],model,'The bot selects the model for this operating context');
 assert.deepEqual(copy(p),before,'Choosing a plan cannot adopt or pay for a model');
 E.submit(g,0,plan);assert.equal(p.specializations[branch],undefined,'A sealed plan is not settlement');
 E.submit(g,1,hold(1));
 assert.equal(p.capability[branch],before.capability[branch]+(plan.investments[branch]||0));
 assert.equal(p.specializations[branch],model,'The existing settlement adopts the choice for the paid tier');
 E.validateLedger(g);E.validatePilot(g);
 const next=E.chooseBot(g,0);assert.equal(next.specializations[branch],model,'A later bot plan keeps its permanent model');
});

test('all six first-tier crossings include a model in the funded plan, never before payment',()=>{
 for(const branch of E.researchBranches(E.createGame(options('core',true)).players[0])){
  const {g,p,hold}=modelFixture(branch,{remaining:1000}),before=p.capability[branch],plan=E.chooseBot(g,0),unfunded=copy(g);
  assert.equal(E.strategyLevel(p,branch),0,branch+' is still below its first tier');
  assert(plan.investments[branch]>=1000,branch+' must be funded by the complete bot plan');
  const model=plan.specializations[branch];assert(E.researchModelTable(p)[branch][model],branch+' includes a valid model choice');
  assert.equal(p.specializations[branch],undefined,'Planning changes no permanent model');
  // If the instruction's payment is removed, its proposed model cannot bypass
  // the paid tier prerequisite. No credits or cash are added to either bank.
  const revoked=copy(plan);delete revoked.investments[branch];
  E.submit(unfunded,0,revoked);E.submit(unfunded,1,E.chooseBot(unfunded,1));
  assert.equal(unfunded.players[0].capability[branch],before);
  assert.equal(unfunded.players[0].specializations[branch],undefined);
  E.submit(g,0,plan);assert.equal(p.capability[branch],before);assert.equal(p.specializations[branch],undefined);
  E.submit(g,1,hold(1));
  assert.equal(p.capability[branch],before+plan.investments[branch]);assert.equal(p.specializations[branch],model);
  E.validateLedger(g);E.validatePilot(g);E.validateLedger(unfunded);E.validatePilot(unfunded);
 }
});

test('a fully paid maximum branch adopts its missing model without inventing another investment',()=>{
 const branch='risk',{g,p,hold,settle}=modelFixture(branch),maximum=E.CAPABILITY_TIERS[branch].at(-1);
 for(let month=0;p.capability[branch]<maximum&&month<96&&!g.gameOver;month++){
  const available=E.planBudget(p,hold(0),g).remaining;
  const amount=Math.floor(Math.min(E.CAPABILITY_CAP_PER_CYCLE,maximum-p.capability[branch],available)/1000)*1000;
  settle(Math.max(0,amount));
 }
 assert.equal(p.capability[branch],maximum,'The bank must afford and settle every tier before this control');
 const before=copy(p),plan=E.chooseBot(g,0);
 assert.equal(plan.investments[branch],undefined,'The maximum branch cannot accept another payment');
 const model=plan.specializations[branch];assert(E.researchModelTable(p)[branch][model]);
 assert.deepEqual(copy(p),before);
 E.submit(g,0,plan);assert.equal(p.specializations[branch],undefined);
 E.submit(g,1,hold(1));
 assert.equal(p.capability[branch],maximum);assert.equal(p.specializations[branch],model);
 E.validateLedger(g);E.validatePilot(g);
});

test('unearned branches without a tier-crossing investment do not receive model choices',()=>{
 const g=E.createGame(options('core',true)),p=g.players[0],plan=E.chooseBot(g,0);
 for(const branch of E.researchBranches(p))if((plan.investments[branch]||0)<E.CAPABILITY_TIERS[branch][0])
  assert.equal(plan.specializations[branch],undefined,branch+' has no earned or funded prerequisite');
});

test('Core model decisions add no random draws or changes to the other bot instructions',()=>{
 const release=fs.readFileSync(path.join(__dirname,'../../releases/v4-rc4/BRANCH_WARS.html'));
 assert.equal(createHash('sha256').update(release).digest('hex'),'51ba02d13ad7bd8df9332b924e0be0beb20b3d972851ce7d32a0f0577b2e76d5');
 const originalCore=load(release.toString('utf8'));
 for(const [branch,,context]of modelCases){
  const {g}=modelFixture(branch,context),a=copy(g),b=copy(g),expected=originalCore.chooseBot(a,0),actual=E.chooseBot(b,0);
  delete expected.specializations;delete actual.specializations;
  assert.deepEqual(copy(actual),copy(expected),branch+' keeps the same funding, products, projects and staffing');
  assert.deepEqual(copy(b.rng),copy(a.rng),branch+' consumes exactly the prior AI random draws');
 }
});

test('older profiles retain the historical model chooser and RNG at earned-tier boundaries',()=>{
 const profiles=[{},E.previewCampaignEdition({},'core',{}).options,E.previewCampaignEdition({},'core',{currentReporting:true}).options,
  E.previewFeatureSelection({}, {field:'financialGroupVersion',value:1}).options,
  E.previewFeatureSelection({}, {field:'financialGroupVersion',value:5}).options];
 for(const [profile,rules]of profiles.entries())for(const point of ['crossing','earned','maximum']){
  const o={...rules,mode:'hotseat',seed:'legacy-model-boundary',created:1},a=old.createGame(o),b=E.createGame(o);
  for(const g of [a,b])for(const p of g.players)for(const branch of Object.keys(E.STRATEGY_BRANCHES))
   p.capability[branch]=point==='maximum'?E.CAPABILITY_TIERS[branch].at(-1):E.CAPABILITY_TIERS[branch][0]-(point==='crossing'?1000:0);
  const expected=a.players.map((_,i)=>old.chooseBot(a,i)),actual=b.players.map((_,i)=>E.chooseBot(b,i));
  assert.deepEqual(copy(actual),copy(expected),'Profile '+profile+' '+point+' plans');
  assert.deepEqual(copy(b.rng),copy(a.rng),'Profile '+profile+' '+point+' RNG');
 }
});
