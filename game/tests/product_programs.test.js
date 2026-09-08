'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const ctx={console};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.programTest={startProject,advanceProjects,withMarket,delta,repriceWithdrawableDeposits,prepareTermFunding,openSegmentDeposits,productProgramAcquisitionMix,planProductPrograms};root.BWEngine={'),ctx);
const E=ctx.BWEngine,H=ctx.programTest;
const options={productProgramsVersion:1,segmentDepositsVersion:1,creditPerformanceVersion:1,customerOwnershipVersion:1,workforceVersion:1,customerDemandVersion:2,managementVersion:2,serviceExpansionVersion:1,campaignRulesVersion:1,mode:'hotseat',seed:42,created:1};
const fresh=extra=>E.createGame({...options,...extra});
const plan=p=>({focus:p.focus,allocation:{...p.allocation},decision:'b',depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'balanced',products:{...p.products},newProjects:[],investments:{},hires:0,competitiveAction:'none'});
const normalized=(p,q=plan(p))=>{E.normalizeProductProgramPlan(p,q);return q;};
const g=fresh(),p=g.players[0];assert.equal(g.version,'8.9');E.validatePilot(g);
assert.throws(()=>fresh({productProgramsVersion:3}),/version/);assert.throws(()=>fresh({segmentDepositsVersion:0}),/requires/);
const old=fresh({productProgramsVersion:0});assert.equal(old.version,'8.8');assert.equal(old.players[0].productPrograms,undefined);
assert.equal(E.projectCatalog(old.players[0]).licenseRewards,undefined);
assert.throws(()=>E.submit(old,0,{...plan(old.players[0]),productProgramPolicy:{}}),/requires/);
assert(E.projectTerms(p,'deployRewards').barred.includes('tier 1'));
assert.equal(E.projectTerms(p,'licenseRewards').barred,'');
const before=copy(p.accounting.accounts),targets=JSON.stringify(p.productPrograms.markets);
assert(H.startProject(g,p,'licenseRewards').includes('began'));assert.equal(p.stats.cash,before.cash-90000);assert.equal(p.stats.capital,before.equity-90000);
assert.equal(p.productDeployment.ready.rewards,false);assert.equal(p.projects[0].total,1);
H.advanceProjects(g);assert.equal(p.productDeployment.ready.rewards,true);assert.equal(p.productPrograms.products.rewards.route,'partner');
assert.equal(p.stats.deposits,before.deposits);assert.equal(JSON.stringify(p.productPrograms.markets),targets);
assert.equal(E.productProgramCosts(p).total,12000);E.validatePilot(g);
// Targeting changes only prospective fit and allocations in the selected audience.
const q=normalized(p),originalBook=JSON.stringify(p.depositBook);
q.productProgramPolicy.markets.downtown.connected={essential:0,rewards:4,highYield:0};
E.normalizeProductProgramPlan(p,q);
const shadow=copy(p);E.applyProductProgramPolicy(shadow,q.productProgramPolicy);
assert(E.customerDemand(shadow,g,'downtown').segments.find(s=>s.key==='connected').fit>E.customerDemand(p,g,'downtown').segments.find(s=>s.key==='connected').fit);
assert.deepEqual(copy(E.customerDemand(shadow,g,'northside')),copy(E.customerDemand(p,g,'northside')));
assert.equal(JSON.stringify(shadow.depositBook),originalBook);assert.equal(p.products.retail,'essential');
// A single targeted segment cannot activate a product's acquisition effect bank-wide.
const weighted=H.productProgramAcquisitionMix(shadow,g),weightedTotal=Object.values(weighted).reduce((a,b)=>a+b,0);
assert(weighted.rewards>0&&weighted.rewards/weightedTotal<.5);
const unreachable=copy(shadow);unreachable.marketSupply={deposits:Object.fromEntries(Object.keys(shadow.productPrograms.markets).map(k=>[k,k==='northside'?1000000:0]))};
assert.equal(H.productProgramAcquisitionMix(unreachable,g).rewards,0);
const allRewards=copy(shadow);for(const row of Object.values(allRewards.productPrograms.markets))for(const s of Object.keys(row))row[s]={essential:0,rewards:4,highYield:0};
const everywhere=H.productProgramAcquisitionMix(allRewards,g);assert.equal(everywhere.essential,0);assert(everywhere.rewards>weighted.rewards);
const n=123456;
H.openSegmentDeposits(shadow,g,'downtown',{everyday:0,connected:n,reserve:0});
assert.equal(shadow.depositBook.cohorts.filter(c=>c.product==='rewards').reduce((a,c)=>a+c.principal,0),n);
assert.equal(E.productProgramCosts(shadow).rows.rewards.royalty,Math.round(n*.0001));
const costs=E.segmentDepositSummary(shadow,g),native=copy(shadow);native.productPrograms.products.rewards.route='build';
assert.equal(costs.service-E.segmentDepositSummary(native,g).service,E.productProgramCosts(shadow).total);
// Same product cannot be developed twice or retired while another route is staged.
p.capability.network=E.CAPABILITY_TIERS.network[0];
const double=normalized(p);double.newProjects=['deployRewards','licenseRewards'];assert.throws(()=>E.normalizeProductProgramPlan(p,double),/one development/);
assert.equal(E.projectPlanStatus(p,double).eligible,false);
// Converting the licensed platform takes shared execution capacity, not free time.
assert(H.startProject(g,p,'deployRewards').includes('began'));
const started=copy(p.projects[0]);p.allocation={service:7,business:1,lending:0,operations:0};H.advanceProjects(g);
assert.equal(p.projects[0].progress,started.progress);
p.allocation={service:3,business:2,lending:2,operations:1};H.advanceProjects(g);H.advanceProjects(g);H.advanceProjects(g);
assert.equal(p.productPrograms.products.rewards.route,'build');assert.equal(E.productProgramCosts(p).total,0);E.validatePilot(g);
// Retirement leaves old accounts untouched, removes open targets and charges once.
const retirement=fresh(),rp=retirement.players[0];
H.startProject(retirement,rp,'licenseHighYield');H.advanceProjects(retirement);
const promised=rp.depositBook.cohorts.find(c=>c.market==='downtown'&&c.segment==='reserve');
promised.product='highYield';promised.remaining=4;promised.rate=4321;
const rplan=normalized(rp);rplan.productProgramPolicy.retire=['highYield'];E.normalizeProductProgramPlan(rp,rplan);
assert.equal(E.planBudget(rp,rplan).productRetirement,25000);
const rpbook=JSON.stringify(rp.depositBook),money=copy(rp.accounting.accounts);
E.applyProductProgramPolicy(rp,rplan.productProgramPolicy,true);
assert.equal(rp.stats.cash,money.cash-25000);assert.equal(rp.stats.capital,money.equity-25000);
assert.equal(JSON.stringify(rp.depositBook),rpbook);assert.equal(rp.productDeployment.ready.highYield,false);
assert.equal(E.productProgramCosts(rp).rows.highYield.license,0);assert(E.productProgramCosts(rp).rows.highYield.royalty>0);
assert(E.projectTerms(rp,'licenseHighYield').barred==='');E.validatePilot(retirement);
retirement.cycle=2;H.repriceWithdrawableDeposits(retirement,rp);assert.equal(rp.depositBook.cohorts.find(c=>c.product==='highYield').remaining,3);assert.equal(rp.depositBook.cohorts.find(c=>c.product==='highYield').rate,4321);
for(const c of rp.depositBook.cohorts.filter(c=>c.product==='highYield'))c.remaining=1;
retirement.cycle=3;H.repriceWithdrawableDeposits(retirement,rp);assert(rp.depositBook.cohorts.every(c=>c.product==='essential'));assert.equal(E.productProgramCosts(rp).total,0);E.AccountingPrototype.check(rp.accounting);
// Reject inaccessible offers, unknown markets, all-closed audiences, malformed retirement.
for(const damage of [
 x=>x.productProgramPolicy.markets.downtown.connected.rewards=4,
 x=>x.productProgramPolicy.markets.fake=copy(x.productProgramPolicy.markets.downtown),
 x=>x.productProgramPolicy.markets.downtown.everyday={essential:0,rewards:0,highYield:0},
 x=>x.productProgramPolicy.retire=['essential'],x=>x.productProgramPolicy.retire=['rewards','rewards']
]){const world=fresh(),bad=normalized(world.players[0]);damage(bad);assert.throws(()=>E.submit(world,0,bad));assert.equal(world.players[0].submitted,null);}
const sealed=fresh(),s0=normalized(sealed.players[0]);s0.newProjects=['licenseRewards'];
const raw=JSON.stringify(sealed);E.operatingPreview(E.publicState(sealed,0).me,s0,sealed.economy);assert.equal(JSON.stringify(sealed),raw);
E.submit(sealed,0,s0);const imported=E.migrateCampaign(sealed),s1=plan(sealed.players[1]);E.submit(sealed,1,copy(s1));E.submit(imported,1,copy(s1));
const normal=x=>{const y=copy(x);delete y.ledgerVersion;y.players.forEach(p=>delete p.strategy);return y;};assert.deepEqual(normal(sealed),normal(imported));E.validatePilot(sealed);
const view=E.publicState(sealed,1);assert(view.me.productPrograms);assert.equal(view.rival.productPrograms,undefined);assert.equal(view.lastPlans[sealed.players[0].id].productProgramPolicy,undefined);
for(const damage of [x=>delete x.productProgramsVersion,x=>x.version='8.8',x=>x.productProgramsVersion=2,x=>delete x.players[0].productPrograms,
 x=>x.players[0].productPrograms.products.rewards.route='free',x=>x.players[0].productPrograms.products.rewards.retired=true,
 x=>delete x.players[0].productPrograms.markets.downtown.connected,x=>x.players[0].productPrograms.markets.downtown.connected.rewards=4]){
 const bad=copy(sealed);damage(bad);const before=JSON.stringify(bad);assert.throws(()=>E.migrateCampaign(bad));assert.equal(JSON.stringify(bad),before);
}
// A losing bank can stop an unused licensed platform rather than paying forever.
const loss=fresh(),lp=loss.players[0];H.startProject(loss,lp,'licenseRewards');H.advanceProjects(loss);lp.stats.lastProfit=-50000;
const retreat=H.planProductPrograms(loss,0,normalized(lp));assert(retreat.productProgramPolicy.retire.includes('rewards'));
E.submit(loss,0,retreat);E.submit(loss,1,plan(loss.players[1]));E.validatePilot(loss);E.validateLedger(loss);
assert(loss.resolution.some(x=>x.includes('retired')&&x.includes('Rewards')));
// Non-default local targets survive a sealed save and deterministic continuation.
const targeted=fresh();H.startProject(targeted,targeted.players[0],'licenseRewards');H.advanceProjects(targeted);
const targetPlan=normalized(targeted.players[0]);targetPlan.productProgramPolicy.markets.downtown.connected={essential:0,rewards:4,highYield:0};
E.submit(targeted,0,targetPlan);const restored=E.migrateCampaign(targeted);
E.submit(targeted,1,plan(targeted.players[1]));E.submit(restored,1,plan(restored.players[1]));assert.deepEqual(normal(targeted),normal(restored));E.validatePilot(restored);
assert.equal(restored.players[0].productPrograms.markets.downtown.connected.rewards,4);
const rematch=copy(sealed);rematch.gameOver=true;E.rematch(rematch,0);E.rematch(rematch,1);assert.equal(rematch.version,'8.9');E.validatePilot(rematch);
let turns=0,launches=0,targetedAudienceTurns=0;
for(const scenario of Object.keys(E.SCENARIOS)){
 const world=fresh({scenario,seed:'programme-'+scenario});
 for(let i=0;i<24&&!world.gameOver;i++){
  const plans=[E.chooseBot(world,0),E.chooseBot(world,1)];
  launches+=plans.reduce((n,q)=>n+E.planInitiatives(q).filter(k=>E.PRODUCT_PROGRAM_PROJECTS[k]).length,0);
  E.submit(world,0,plans[0]);E.submit(world,1,plans[1]);E.validatePilot(world);E.validateLedger(world);
  for(const p of world.players){E.AccountingPrototype.check(p.accounting);targetedAudienceTurns+=Object.values(p.productPrograms.markets).flatMap(row=>Object.values(row)).filter(mix=>mix.rewards||mix.highYield).length;}
  for(const seat of [0,1])assert(Buffer.byteLength(JSON.stringify(E.publicState(world,seat)))<1048576);turns++;
 }
}
assert(targetedAudienceTurns>0,'AI must open delivered products, not just pay for unused platforms');
const {harness}=require('./github_resilience.test.js'),ui=harness();ui.c.world=fresh();
ui.run("game=world;seat=0;workspaceTab='products';newDraft(E.publicState(game,0));renderReady=()=>{};renderProjects=()=>{};renderProducts=()=>{};renderProductPrograms(E.publicState(game,0))");
assert(ui.elements.get('#productProgramsPanel').innerHTML.includes('PRODUCT MANAGEMENT'));
assert(ui.run("toggleProductDevelopment(E.publicState(game,0),'licenseRewards')"));assert.deepEqual(copy(ui.run('draft.newProjects')),['licenseRewards']);
const focus=ui.run('draft.focus');ui.run("productDeskView='targets';inspectedProductMarket='university';renderProductPrograms(E.publicState(game,0))");assert.equal(ui.run('draft.focus'),focus);
assert(ui.elements.get('#productProgramsPanel').innerHTML.includes('target_connected_rewards'));
ui.run("view=E.publicState(game,0);view.me.submitted=true");assert.equal(ui.run("toggleProductDevelopment(view,'licenseHighYield')"),false);
console.log(JSON.stringify({passed:true,turns,launches,targetedAudienceTurns,checks:['paid rollout','shared capacity stalls','research gate','local fit and allocations','vendor cost reconciliation','retirement and guarantees','pure preview','sealed migration','corrupt saves','owner privacy','UI draft staging']},null,2));
