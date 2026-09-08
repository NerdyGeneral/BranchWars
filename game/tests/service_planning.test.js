'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'),ctx={console,Math,Date},copy=x=>JSON.parse(JSON.stringify(x));
for(const script of source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);const E=ctx.BWEngine;
const g=E.createGame({campaignRulesVersion:1,mode:'hotseat',seed:'planning-tools',created:1});
const plan=E.chooseBot(g,0),p=E.publicState(g,0).me;
const before=JSON.stringify(g),beforePlan=JSON.stringify(plan),beforePlayer=JSON.stringify(p);
const review=E.servicePlanReview(p,plan,g.economy),forecast=E.operatingPreview(p,plan,g.economy);
assert.equal(review.profit,forecast.profit);assert.equal(review.spend,E.planBudget(p,plan).total);
assert.equal(review.equityAfterPlan,forecast.closingEquity-review.spend);
assert.equal(review.netAfterSpend,forecast.profit-review.fundingLoss-review.spend);
assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(plan),beforePlan);assert.equal(JSON.stringify(p),beforePlayer);

// Forced funding sales are equity losses even when reported outside operating profit.
const illiquid=copy(p);illiquid.accounting=E.AccountingPrototype.transact(illiquid.accounting,'borrow',100000000);illiquid.stats.emergencyDebt+=100000000;illiquid.stats.cash+=100000000;
illiquid.accounting=E.AccountingPrototype.transact(illiquid.accounting,'buySecurities',illiquid.stats.cash);illiquid.stats.cash=0;
const illiquidPlan={...copy(plan),allocation:{service:0,business:0,lending:7,operations:1},servicePolicy:copy(illiquid.serviceDesk.policy),newProjects:[],newProject:null,investments:{},hires:0,competitiveAction:'none',depositPolicy:'margin',lendingPolicy:'growth'};
const fundingReview=E.servicePlanReview(illiquid,illiquidPlan,g.economy),fundingForecast=E.operatingPreview(illiquid,illiquidPlan,g.economy);
assert(fundingReview.fundingLoss>0);assert.equal(fundingReview.equityAfterPlan,fundingForecast.closingEquity);
assert.equal(fundingReview.netOperating,fundingForecast.profit-fundingForecast.fundingLoss);

// Hypothetical bids do not change ownership, post money, or rewrite signed fees.
const payroll=g.serviceAgreements.find(c=>c.kind==='payroll');
const quotePlan={...copy(plan),allocation:{service:2,business:4,lending:1,operations:1},servicePolicy:{...copy(p.serviceDesk.policy),pricing:{payroll:'discount',merchant:'standard',treasury:'standard'}}};
const options=E.serviceDeliveryOptions(p,quotePlan,g.economy,payroll);
assert.equal(options.length,2);assert(options.some(o=>o.staff===0&&o.outsourcing===1));assert(options.some(o=>o.staff===1&&o.outsourcing===0));
assert(options.every(o=>o.capacity>=o.demand&&o.policy.pricing.payroll==='discount'));
assert.equal(options.find(o=>o.staff===0).serviceNet,14400-3000-6000);
assert.equal(options.find(o=>o.staff===1).serviceNet,14400-3000);
assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(p),beforePlayer);
const treasury=g.serviceAgreements.find(c=>c.kind==='treasury');assert.equal(E.serviceDeliveryOptions(p,quotePlan,g.economy,treasury).length,0);
const deployed=copy(p);deployed.serviceDesk.applications.treasury='partner';quotePlan.servicePolicy.treasury=true;
const treasuryOptions=E.serviceDeliveryOptions(deployed,quotePlan,g.economy,treasury);assert(treasuryOptions.length>0);
assert.equal(treasuryOptions.find(o=>o.staff===0).serviceNet,50000-9000-18000-18000);
assert.equal(deployed.serviceDesk.contracts.length,0);
const full=copy(deployed);full.serviceDesk.contracts=g.serviceAgreements.map(c=>copy(c));
assert.equal(E.serviceDeliveryOptions(full,{...quotePlan,allocation:{service:5,business:1,lending:1,operations:1}},g.economy).length,0,'insufficient whole-book capacity has no fake recommendation');

// Low-equity, expensive-funded bank: policies can improve earnings without aid.
const stress=copy(p);stress.stats.capital=300000;stress.accounting.accounts.equity=300000;
// Keep the accounting equation balanced when creating a controlled stress fixture.
const diff=p.stats.capital-300000;stress.stats.cash-=diff;stress.accounting.accounts.cash-=diff;
const stressedPlan={...copy(plan),newProject:null,newProjects:[],investments:{},hires:0,capitalAction:false,competitiveAction:'none',depositPolicy:'aggressive',allocation:{service:5,business:1,lending:1,operations:1},servicePolicy:copy(stress.serviceDesk.policy)};
const snapshot=JSON.stringify(stress),intent=JSON.stringify(stressedPlan),recovered=E.serviceRecoveryPlan(stress,stressedPlan,g.economy);
assert(E.servicePlanReview(stress,recovered,g.economy).profit>=E.servicePlanReview(stress,stressedPlan,g.economy).profit);
assert.equal(JSON.stringify(stress),snapshot);assert.equal(JSON.stringify(stressedPlan),intent);
assert.equal(recovered.capitalAction,false);assert.equal(recovered.hires,0);

// An event may spend cash before a valid initiative executes. Cancel visibly,
// without charging the project; retain normal financial consequences of the event.
const cancellation=E.createGame({campaignRulesVersion:1,mode:'hotseat',seed:'cancel-cash',created:1}),bank=cancellation.players[0];
bank.accounting=E.AccountingPrototype.transact(bank.accounting,'buySecurities',bank.stats.cash-180000);bank.stats.cash=180000;
cancellation.event=copy(E.EVENTS.find(e=>e.key==='coffee'));
const cancelPlans=cancellation.players.map((p,i)=>({...E.chooseBot(cancellation,i),newProjects:i===0?['remediation']:[],newProject:i===0?'remediation':null,investments:{},hires:0,competitiveAction:'none',capitalAction:false,contractBid:null,opportunity:null,decision:i===0?'a':'b'}));
assert(E.planBudget(bank,cancelPlans[0]).remaining>=0);
const spentBefore=bank.buildSpend||0;E.submit(cancellation,0,cancelPlans[0]);E.submit(cancellation,1,cancelPlans[1]);
assert(cancellation.resolution.some(x=>x.startsWith(bank.name+' cancelled Compliance Remediation: cash changed before execution')));
assert(cancellation.resolution.includes(bank.name+' cancelled Compliance Remediation: cash changed before execution. No project cost was charged; select it again in a later plan.'),'public cancellation must not expose private cash');
assert(!bank.projects.some(p=>p.key==='remediation'));assert.equal(bank.buildSpend||0,spentBefore);E.validatePilot(cancellation);E.AccountingPrototype.check(bank.accounting);

// Every late-added department commitment respects the final advisory AI reserve.
let turns=0;
for(let i=0;i<35&&!g.gameOver;i++){
 const plans=g.players.map((bank,seat)=>E.chooseBot(g,seat));
 plans.forEach((pl,seat)=>{const view=E.publicState(g,seat).me,r=E.servicePlanReview({...view,focus:pl.focus},pl,g.economy);assert(E.planBudget({...view,focus:pl.focus},pl).total<=r.spendingLimit+1,'final AI reserve includes every department');});
 E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);E.validatePilot(g);E.validateLedger(g);turns++;
}
// Public previews must not alter fixed-intent resolution or the world RNG.
const a=copy(g),b=copy(g),intents=[E.chooseBot(a,0),E.chooseBot(a,1)];b.rng=copy(a.rng);
for(let i=0;i<2;i++){const pub=E.publicState(b,i).me;E.servicePlanReview(pub,intents[i],b.economy);E.serviceDeliveryOptions(pub,intents[i],b.economy)}
E.submit(a,0,copy(intents[0]));E.submit(a,1,copy(intents[1]));E.submit(b,0,copy(intents[0]));E.submit(b,1,copy(intents[1]));
const normalize=x=>{const y=copy(x);y.players.forEach(p=>delete p.strategy);return y};assert.deepEqual(normalize(a),normalize(b));
assert.match(source,/DELIVERY COMPARISON & PLAN RESILIENCE/);assert.match(source,/data-delivery-option/);assert.match(source,/planning=\$\('#servicePlanning'\)\?\.open/);
const setup=require('./github_resilience.test.js').harness(),setupBefore=setup.run('JSON.stringify(readSetupFeatureOptions())');
assert.match(setup.elements.get('#setupFeatureOptions').innerHTML,/data-feature-field="serviceExpansionVersion"/,'preview is rendered from shared feature rules');
assert.equal(setup.elements.get('#serviceExpansion').checked,false,'preview remains opt-in');
assert.equal(setup.elements.get('#rivalryPilot').checked,false,'loading setup does not enable prerequisites');
setup.changeFeature('#serviceExpansion',true);
assert(setup.run('featureSelectionPending()'),'prerequisites require explicit consent');
assert.equal(setup.run('JSON.stringify(readSetupFeatureOptions())'),setupBefore,'the clicked checkbox is restored until confirmation');
setup.run('cancelFeatureSelectionConfirmation()');assert.equal(setup.run('JSON.stringify(readSetupFeatureOptions())'),setupBefore);
setup.changeFeature('#serviceExpansion',true);assert(setup.confirmFeatures());
assert.equal(setup.elements.get('#serviceExpansion').checked,true);assert.equal(setup.elements.get('#rivalryPilot').checked,true);
assert.equal(setup.run('E.createGame({...readSetupFeatureOptions(),seed:1,created:1}).serviceExpansionVersion'),1);
setup.changeFeature('#serviceExpansion',false);
assert(!setup.run('featureSelectionPending()'),'a disable with no dependent systems needs no extra confirmation');
assert.equal(setup.elements.get('#serviceExpansion').checked,false);assert.equal(setup.elements.get('#rivalryPilot').checked,true,'turning off services preserves the selected base pilot');
console.log(JSON.stringify({passed:true,turns,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),checks:['pure advisory forecasts','capacity alternatives','hypothetical locked quotes','treasury prerequisites','whole-book capacity','recovery without free capital','final AI reserve','fixed-intent replay']},null,2));
