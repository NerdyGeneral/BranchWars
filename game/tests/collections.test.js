'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.creditTest={creditTerms,compactCredit,takeCredit,repayCredit,settleCreditPerformance,performingCredit,creditSalesStaff,provideCash,creditSaleHaircut};root.BWEngine={'),ctx);
const E=ctx.BWEngine,H=ctx.creditTest,options={creditPerformanceVersion:1,customerOwnershipVersion:1,workforceVersion:1,customerDemandVersion:2,managementVersion:2,campaignRulesVersion:1,mode:'hotseat',seed:'credit-performance',created:1};
const fresh=extra=>E.createGame({...options,...extra});
const plan=(p,extra={})=>({focus:p.focus,allocation:{...p.allocation},decision:'b',depositPolicy:'balanced',lendingPolicy:'balanced',capitalPolicy:'balanced',products:{...p.products},newProjects:[],investments:{},hires:0,competitiveAction:'none',...extra});
function check(g){E.validatePilot(g);E.validateLedger(g);for(const p of g.players){E.AccountingPrototype.check(p.accounting);assert.equal(p.stats.loans,p.creditBook.cohorts.reduce((n,c)=>n+c.principal,0));}}
function turn(g,plans=g.players.map(p=>plan(p))){g.event={...E.EVENTS.find(e=>e.key==='quiet')};g.opportunities=[];E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);check(g);}
const g=fresh(),p=g.players[0];check(g);assert.equal(g.version,'8.7');
assert.throws(()=>fresh({creditPerformanceVersion:2}),/version/);assert.throws(()=>fresh({customerOwnershipVersion:0}),/requires/);
const old=fresh({creditPerformanceVersion:0});assert.equal(old.version,'8.6');assert.equal(old.players[0].creditPerformance,undefined);assert(!('late' in old.players[0].creditBook.cohorts[0]));
assert.throws(()=>E.submit(old,0,plan(old.players[0],{collectionsPolicy:E.defaultCollectionsPolicy()})),/requires/);
assert.throws(()=>E.validateCollectionsPolicy({share:40,approach:'balanced'}));assert.throws(()=>E.validateCollectionsPolicy({share:50,approach:'invented'}));

// Terms retain origination risk; changing the policy cannot cure the old book.
const conservative=copy(p),growth=copy(p);conservative.policies.lending='conservative';growth.policies.lending='growth';
assert(H.creditTerms(conservative,g).risk<H.creditTerms(growth,g).risk);assert.deepEqual(conservative.creditBook,growth.creditBook);
const expert=copy(p);expert.workforce.departments.lending={count:2,skill:100,trainingSpend:0};
const capacity=E.collectionsReview(expert);assert.equal(capacity.capacity+capacity.salesStaff,2.8);assert.equal(H.creditSalesStaff(expert,2.8),capacity.salesStaff);

// Aging is delayed, seasoning is real, previews are pure. No loans vanish at maturity.
const delayed=fresh(),dp=delayed.players[0];dp.creditPerformance.policy={share:0,approach:'balanced'};
for(const c of dp.creditBook.cohorts){c.seasoning=2;c.risk=20000;}
for(let t=1;t<=6;t++){
  delayed.cycle=t;const before=JSON.stringify(delayed),preview=E.creditPerformanceForecast(dp,delayed.economy);assert.equal(JSON.stringify(delayed),before);
  const r=H.settleCreditPerformance(delayed,dp);assert.equal(r.loss,preview.loss);
  if(t<=2)assert.equal(r.entered,0);if(t<=5)assert.equal(r.loss,0);
  if(t===6)assert(r.loss>0,'new missed payments age through all stages before writeoff');
  const settled=JSON.stringify(dp);H.settleCreditPerformance(delayed,dp);assert.equal(JSON.stringify(dp),settled);
}
const maturity=copy(p);for(const c of maturity.creditBook.cohorts){c.remaining=1;c.late=[0,0,c.principal];}
const unpaid=maturity.stats.loans;assert.equal(H.repayCredit(maturity),0);assert.equal(maturity.stats.loans,unpaid);assert(maturity.creditBook.cohorts.every(c=>c.remaining===1));
assert.equal(H.creditSaleHaircut(maturity,600),7600,'fully defaulted loans do not sell at near par');
assert.equal(H.creditSaleHaircut(maturity,700),7700,'regulatory sales also price distress');
assert.equal(H.creditSaleHaircut(old.players[0],600),600,'old campaigns retain flat funding pricing');
assert.equal(E.creditSummary(maturity).monthlyInterest,0,'fully delinquent principal accrues no interest');
assert.equal(E.creditSummary(maturity).nextPrincipal,0,'fully delinquent principal is not scheduled cash');

// Resolution is exact: recovered principal is cash, written-off principal is equity loss.
const stressed=fresh(),sp=stressed.players[0];for(const c of sp.creditBook.cohorts)c.late=[0,0,Math.floor(c.principal*.6)];
const start=copy(sp.stats), forecast=E.creditPerformanceForecast(sp,stressed.economy),r=H.settleCreditPerformance(stressed,sp);
assert(r.loss>0&&r.recovered>0);assert.equal(sp.stats.loans,start.loans-r.resolved);assert.equal(sp.stats.cash,start.cash+r.recovered);assert.equal(sp.stats.capital,start.capital-r.loss);
assert.equal(r.resolved,r.recovered+r.loss);assert.equal(r.loss,forecast.loss);E.AccountingPrototype.check(sp.accounting);
const withdrawn=copy(sp),key=sp.focus,original=copy(withdrawn.creditBook.cohorts.filter(c=>c.market===key));
const taken=H.takeCredit(withdrawn,key,123456);assert.equal(taken.reduce((n,c)=>n+c.principal,0),123456);
for(let i=0;i<3;i++)assert.equal(original.reduce((n,c)=>n+c.late[i],0),taken.reduce((n,c)=>n+c.late[i],0)+withdrawn.creditBook.cohorts.filter(c=>c.market===key).reduce((n,c)=>n+c.late[i],0));
const seller=stressed.players[1];for(const c of seller.creditBook.cohorts)c.late=[Math.floor(c.principal*.1),0,Math.floor(c.principal*.1)];
const combined=()=>stressed.players.reduce((n,p)=>n+p.creditBook.cohorts.reduce((a,c)=>a+c.late.reduce((x,y)=>x+y,0),0),0),beforeDeal=combined();
E.finishProject(stressed,sp,{key:'acquisition',target:seller.focus});assert.equal(combined(),beforeDeal,'acquisition preserves distressed principal');

// The real funding waterfall must remove sold arrears as well as loan assets.
const funding=fresh(),fp=funding.players[0];for(const c of fp.creditBook.cohorts)c.late=[Math.floor(c.principal*.1),0,Math.floor(c.principal*.2)];
const beforeFunding=copy(fp),arrears=x=>x.creditBook.cohorts.reduce((n,c)=>n+c.late.reduce((a,b)=>a+b,0),0);
const saleQuote=H.creditSaleHaircut(fp,600);assert.equal(saleQuote,2100);
H.provideCash(fp,fp.stats.cash+fp.accounting.accounts.securities+1000000);
assert(fp.stats.loans<beforeFunding.stats.loans);assert(arrears(fp)<arrears(beforeFunding));
assert(fp.accounting.journal.some(e=>e.source==='sell.loans'));check(funding);
const sale=fp.accounting.journal.find(e=>e.source==='sell.loans');assert.equal(-sale.earnings,Math.round((beforeFunding.stats.loans-fp.stats.loans)*saleQuote/10000));

// Workouts preserve value; faster recovery clears more old defaults. Staff is finite.
const quality=fresh().players[0];for(const c of quality.creditBook.cohorts)c.late=[Math.floor(c.principal*.1),Math.floor(c.principal*.1),Math.floor(c.principal*.1)];
const high={service:0,business:0,lending:8,operations:0},work=E.creditPerformanceForecast(quality,g.economy,high,{share:100,approach:'workout'}),fast=E.creditPerformanceForecast(quality,g.economy,high,{share:100,approach:'recovery'}),neglect=E.creditPerformanceForecast(quality,g.economy,high,{share:0,approach:'workout'});
assert(work.cured>fast.cured);assert(fast.resolved>work.resolved);assert(work.recovered/work.resolved>fast.recovered/fast.resolved);assert.equal(neglect.cured,0);assert(neglect.resolved<work.resolved);

// Complete operations settle losses and case expense once, including real forecasts.
const live=fresh(),lp=live.players[0];for(const c of lp.creditBook.cohorts)c.late=[0,0,Math.floor(c.principal*.3)];
const fullBefore=JSON.stringify(live),preview=E.operatingPreview(E.publicState(live,0).me,plan(lp),live.economy);assert.equal(JSON.stringify(live),fullBefore);assert(preview.chargeoff>0&&preview.collectionsCost>0&&preview.creditRecovery>0&&preview.interestForgone>0);
turn(live);const actual=lp.operatingReport;assert.equal(actual.chargeoff,lp.creditPerformance.report.loss);assert.equal(actual.collectionsCost,lp.creditPerformance.report.cost);
assert.equal(Object.values(lp.marketReport.rows).reduce((n,r)=>n+r.credit,0),actual.chargeoff);
assert.equal(lp.stats.chargeoffs,actual.chargeoff);assert.equal(actual.creditRecovery,lp.creditPerformance.report.recovered);
const noMultiplier=fresh(),withMultiplier=copy(noMultiplier);for(const world of [noMultiplier,withMultiplier])for(const c of world.players[0].creditBook.cohorts)c.late=[0,0,Math.floor(c.principal*.3)];
withMultiplier.players[0].turnEffects.profit=1.5;E.operate(noMultiplier,noMultiplier.players[0],true);E.operate(withMultiplier,withMultiplier.players[0],true);
assert.equal(noMultiplier.players[0].operatingReport.collectionsCost,withMultiplier.players[0].operatingReport.collectionsCost,'case costs are not multiplied by profit events');
const publicView=E.publicState(live,1);assert.equal(publicView.rival.creditPerformance,undefined);assert.equal(publicView.rival.creditBook,undefined);assert.equal(publicView.lastPlans[lp.id].collectionsPolicy,undefined);
publicView.me.creditPerformance.policy.share=100;assert.notEqual(live.players[1].creditPerformance.policy.share,100);
const half=copy(live);E.submit(half,0,plan(half.players[0]));const restored=E.migrateCampaign(half);const next=plan(half.players[1]);E.submit(half,1,copy(next));E.submit(restored,1,copy(next));
const normalized=x=>{x=copy(x);delete x.ledgerVersion;x.players.forEach(p=>delete p.strategy);return x;};assert.deepEqual(normalized(half),normalized(restored));
for(const damage of [x=>x.creditPerformanceVersion=2,x=>delete x.creditPerformanceVersion,x=>x.version='8.6',x=>x.players[0].creditPerformance.policy.share=-1,x=>x.players[0].creditBook.cohorts[0].late[0]=-1,x=>x.players[0].creditBook.cohorts[0].late[2]=1e12,x=>x.players[0].creditBook.cohorts[0].seasoning=3,x=>x.players[0].creditPerformance.report.loss++,x=>x.players[0].operatingReport.collectionsCost++]){const bad=copy(live);damage(bad);const unchanged=JSON.stringify(bad);assert.throws(()=>E.migrateCampaign(bad));assert.equal(JSON.stringify(bad),unchanged);}
const rematch=copy(live);rematch.gameOver=true;E.rematch(rematch,0);E.rematch(rematch,1);assert.equal(rematch.version,'8.7');check(rematch);

// Large history stays in the save; only the owner-only live detail window is bounded.
const verbose=copy(live),owner=verbose.players[0].id;
verbose.eventLedger=[{id:1,cycle:1,category:'resolution.start',source:'resolveCycle',target:owner,visibility:'owner',resolutionId:1}];
for(let id=2;id<=201;id++)verbose.eventLedger.push({id,cycle:1,category:'operations',source:'operate',target:owner,visibility:'owner',parentCause:1,deltas:{cash:1},changes:{turnEffects:{before:{note:'🙂'.repeat(200)},after:{note:'🙂'.repeat(200)}}}});
verbose.ledgerSequence=201;E.validateLedger(verbose);const retained=JSON.stringify(verbose),bounded=E.publicState(verbose,0);
assert.equal(JSON.stringify(verbose),retained);assert.deepEqual(copy(bounded.me.creditBook),copy(verbose.players[0].creditBook));
assert(Buffer.byteLength(JSON.stringify(bounded.causalEvents))<=256*1024);assert(bounded.causalView.omittedFromLatest200>0);
assert.equal(bounded.causalEvents.at(-1).id,201);assert.equal(bounded.causalView.firstIncludedId,bounded.causalEvents[0].id);
assert.equal(E.publicState(verbose,1).causalEvents.length,0);assert.equal(E.publicState(old,0).causalView,undefined);

const {harness}=require('./github_resilience.test.js'),ui=harness();ui.c.world=fresh();ui.run("game=world;seat=0;workspaceTab='credit';newDraft(E.publicState(game,0));renderReady=()=>{};toast=()=>{};renderCollections(E.publicState(game,0))");
assert(ui.elements.get('#creditPanel').innerHTML.includes('CREDIT QUALITY'));const untouched=JSON.stringify(ui.state().game),focus=ui.run('draft.focus');
assert(ui.run("stageCollectionsPolicy(E.publicState(game,0),50,'workout')"));assert.equal(JSON.stringify(ui.state().game),untouched);assert.equal(ui.run('draft.collectionsPolicy.share'),50);
ui.run("inspectedCreditMarket='university';renderCollections(E.publicState(game,0))");assert.equal(ui.run('draft.focus'),focus);
ui.run('game.players[0].submitted={}');assert.equal(ui.run("stageCollectionsPolicy(E.publicState(game,0),0,'recovery')"),false);
let turns=0;for(const scenario of Object.keys(E.SCENARIOS)){const g=fresh({scenario,seed:'credit-ai-'+scenario});for(let t=0;t<24&&!g.gameOver;t++){const plans=[E.chooseBot(g,0),E.chooseBot(g,1)];E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);check(g);turns++;assert(Buffer.byteLength(JSON.stringify(E.publicState(g,0)))<1048576);}}
console.log(JSON.stringify({passed:true,turns,checks:['seasoning and aging','retained origination risk','nonaccrual','maturity persistence','exact resolution accounting','transfer conservation','collections tradeoffs','pure previews','save/privacy/invalid imports','real UI staging','AI reachability']},null,2));
