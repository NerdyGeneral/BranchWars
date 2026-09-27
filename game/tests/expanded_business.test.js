'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const copy=x=>JSON.parse(JSON.stringify(x));
function load(html){const c={};vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={__validatePlan:validatePlan,__startProject:startProject,__marketReach:marketReach,__prepare:prepareDepartmentFunctionForecast,__operatingOwner:prepareOperatingForecast,'),c);return c.BWEngine;}
const html=process.argv.includes('--portable')?fs.readFileSync(path.join(__dirname,'../BRANCH_WARS.html'),'utf8'):require('../tools/build_game').assemble().html,E=load(html),X=E.ExpandedBusiness;
const flags={currentReporting:true,currentEconomics:true,currentRivalry:true,currentResearch:true,currentLending:true,currentMonetaryPolicy:true};
const options=(current=true,seed='expanded-business')=>({...E.previewCampaignEdition({},'expanded',{...flags,currentBusiness:current}).options,seed,mode:'hotseat',created:1,startingWorkforce:'covered'});
const create=(current=true,seed)=>E.createGame(options(current,seed));
function plan(g,seat=0,engine=E){const p=g.players[seat],q=engine.chooseBot(g,seat);return {...q,focus:p.focus,newProjects:[],newProject:null,...(q.projectTargets!==undefined?{projectTargets:{}}:{}),investments:{},hires:0,...(q.specialistHires?{specialistHires:Object.fromEntries(Object.keys(q.specialistHires).map(k=>[k,0]))}:{}),opportunity:null,contractBid:null,contractExit:null,capitalAction:false,competitiveAction:'none',decision:'b'};}
const same=(a,b,message)=>assert.deepEqual(copy(a),copy(b),message);

test('9.36 owns a strictly validated private platform; old campaigns gain no book or catalog entries',()=>{
 const g=create(),p=g.players[0];assert.equal(g.version,'9.36');same(p.expandedBusiness,{version:1,digital:{route:'none'}});assert.equal(X.available(p),false);
 E.validatePilot(g);same(E.migrateCampaign(copy(g)),g);
 const v=E.publicState(g,0);same(v.me.expandedBusiness,p.expandedBusiness);assert.equal(v.rival.expandedBusiness,undefined);X.validate(v,'view');
 const old=create(false);assert.equal(old.version,'9.35');assert.equal(old.players[0].expandedBusiness,undefined);for(const key of X.PROJECT_KEYS)assert.equal(E.projectCatalog(old.players[0],old)[key],undefined);
 for(const change of [x=>delete x.players[0].expandedBusiness,x=>x.players[0].expandedBusiness.digital.route='magic',x=>x.players[0].expandedBusiness.digital.bonus=1,x=>delete x.players[0].expandedBusinessVersion]){const invalid=copy(g);change(invalid);assert.throws(()=>E.migrateCampaign(invalid));}
 const leaked=copy(v);leaked.rival.expandedBusiness=copy(p.expandedBusiness);assert.throws(()=>X.validate(leaked,'view'),/owner/);
 const caps=E.campaignCapabilities();delete caps.expandedBusinessSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'expandedBusinessVersion');
});

test('digital build/license quote is pure, bank-wide, unique and capacity/budget guarded',()=>{
 const g=create(),p=g.players[0],q=plan(g),before=JSON.stringify(g),remote=Object.keys(p.branches).find(k=>p.branches[k]===0);assert(remote);
 const quote=X.digitalQuote(p,q,g);assert.equal(JSON.stringify(g),before);assert.equal(quote.scope,'bank-wide');assert(quote.markets.includes(remote));assert.equal(quote.centralCapacity,0);
 assert.match(E.projectTerms(p,'buildDigitalPlatform').barred,/tier 1/);assert.equal(E.projectTerms(p,'licenseDigitalPlatform').barred,'');
 same(['cost','cycles','capacity'].map(k=>E.projectTerms(p,'licenseDigitalPlatform')[k]),[90000,1,1]);
 const dual={...q,newProjects:['buildDigitalPlatform','licenseDigitalPlatform']};assert.throws(()=>E.__validatePlan(g,p,dual),/one bank-wide/);
 const dry=copy(p);dry.stats.cash=1;assert.equal(E.projectStartStatus(g,dry,'licenseDigitalPlatform').eligible,false);
 const busy=copy(p);for(let i=0;i<10;i++)busy.projects.push({key:'marketing',target:null,total:2,progress:0});assert.equal(E.projectStartStatus(g,busy,'licenseDigitalPlatform').eligible,false);
 const inherited=copy(p);inherited.capability.digital=E.CAPABILITY_TIERS.digital[0];assert.equal(E.projectTerms(inherited,'buildDigitalPlatform').barred,'');
 const stats=copy(p.stats),world=copy(g.marketEconomy),offices=copy(p.facilityNetwork);E.finishProject(g,p,{key:'licenseDigitalPlatform',target:null});same(p.stats,stats);same(g.marketEconomy,world);same(p.facilityNetwork,offices);assert.equal(X.monthlyCost(p),12000);
 assert.match(E.projectTerms(p,'licenseDigitalPlatform').barred,/already delivered/);assert.equal(X.digitalChannel(p,remote),true);
 const online=E.customerDemand(p,g,remote).segments.find(s=>s.key==='connected'),offline=E.customerDemand({...p,expandedBusiness:{version:1,digital:{route:'none'}}},g,remote).segments.find(s=>s.key==='connected');assert(Math.abs(online.fit-offline.fit-.1)<1e-10);
});

test('central digital processing shares finite staff, technology coverage and local outside audiences',()=>{
 const g=create(),p=g.players[0],q=plan(g);E.finishProject(g,p,{key:'licenseDigitalPlatform',target:null});
 // Paid-delivery fixtures isolate the capacity equation; they do not claim
 // these staff or vendor allocations were earned in a human campaign.
 const owner=copy(p);owner._departmentFunctionExecution={physical:{available:{service:16,business:0,lending:0,operations:8}},remainingPools:{service:16,business:0,lending:0,operations:0},rows:[{id:'technology',workload:4,delivered:{capacity:4,retained:{service:0,business:0,lending:0,operations:4},additional:{service:0,business:0,lending:0,operations:0},vendor:0}}]};
 owner.allocation.service=4;owner.workforce.departments.service.count=0;owner.workforce.departments.operations.count=0;
 for(const record of Object.values(owner.facilityLifecycle.records))record.staffQuarters.service=0;
 assert.equal(X.centralCapacity(owner),500000);
 Object.values(owner.facilityLifecycle.records)[0].staffQuarters.service=8;assert.equal(X.centralCapacity(owner),250000,'Two assigned local staff cannot also be the remote desk');
 owner._departmentFunctionExecution.rows[0].delivered.capacity=2;assert.equal(X.centralCapacity(owner),125000,'Half-delivered Technology halves actual central throughput');
 owner._departmentFunctionExecution.remainingPools.service=0;assert.equal(X.centralCapacity(owner),0);
 const remote=Object.keys(p.branches).find(k=>p.branches[k]===0),before=JSON.stringify(g);assert(X.digitalChannel(p,remote));assert(E.__marketReach(p,remote)>.02);const supply=E.marketSupply(g,p);assert(supply.deposits[remote]>0);assert.equal(JSON.stringify(g),before,'Eligibility, capacity and supply quotes never award customers');
 const empty=copy(g);empty.marketEconomy.markets[remote].community.deposits=0;empty.marketEconomy.markets[remote].union.deposits=0;assert.equal(E.marketSupply(empty,empty.players[0]).deposits[remote],0,'The platform does not create market stock');
 const none=copy(p);none.expandedBusiness.digital.route='none';assert.equal(X.centralCapacity(none),0);assert.equal(X.digitalChannel(none,remote),false);
 const prepared=X.digitalQuote(p,q,g);assert(Number.isFinite(prepared.centralCapacity));assert(prepared.centralCapacity<=500000);
 // The actual application consumer also accepts the remote market. A quote
 // only generates/activates requests on copies; finite local balances remain
 // the upper bound and the authoritative game stays unchanged.
 q.householdPolicy.retention=25;q.relationshipOfferPolicy.share=0;q.onboardingPolicy={market:remote,segment:'connected',product:'essential',share:50};
 for(const settings of Object.values(q.facilityLifecyclePolicy.offices))for(const role of Object.keys(settings.staffQuarters))settings.staffQuarters[role]=0;
 for(const row of Object.values(q.departmentFunctionsPolicy.quotas))for(const role of Object.keys(row))row[role]=0;
 for(const key of Object.keys(q.departmentFunctionsPolicy.vendors))q.departmentFunctionsPolicy.vendors[key]=0;q.departmentFunctionsPolicy.vendors.technology=4;
 const intakeOwner=E.__prepare(E.__operatingOwner(p,q,g),q,g);for(const [id,settings]of Object.entries(q.facilityLifecyclePolicy.offices))Object.assign(intakeOwner.facilityLifecycle.records[id],copy(settings));
 const intake=E.onboardingReview(intakeOwner,g);assert(intake.totals.generated.count>0);assert(intake.totals.generated.count<=intake.capacity);assert.equal(p.branches[remote],0);
 const next=copy(intakeOwner);next.onboarding.lastCycle=1;next.onboarding.pending=[copy(intake.generatedBatch)];delete next._onboardingBudget;const activated=E.onboardingReview(next,{...g,cycle:2});assert(activated.totals.activated.count>0,JSON.stringify({reason:activated.reason,budget:activated.budget,capacity:activated.capacity,rows:activated.rows}));assert(activated.totals.activated.principal<=activated.depositCapacity);assert.equal(JSON.stringify(g),before);
});

test('licensed platform costs enter the authoritative forecast once; owned platform keeps the same delivery',()=>{
 const a=create(),b=copy(a);a.players[0].expandedBusiness.digital.route='partner';b.players[0].expandedBusiness.digital.route='build';
 const q=plan(a),before=JSON.stringify({a,b}),av=E.publicState(a,0),bv=E.publicState(b,0),licensed=E.operatingPreview(av.me,q,av.economy,av),built=E.operatingPreview(bv.me,q,bv.economy,bv);
 assert.equal(licensed.digitalPlatformCost,12000);assert.equal(built.digitalPlatformCost,0);assert.equal(built.profit-licensed.profit,12000);assert.equal(licensed.expense-built.expense,12000);assert.equal(JSON.stringify({a,b}),before);
 const budget=E.planBudget(a.players[0],q,a),owned=E.planBudget(b.players[0],q,b);assert.equal(budget.digitalPlatform,12000);assert.equal(budget.total-owned.total,12000);
 const ar=E.bankRecoveryReview(av.me,q,av.economy,av.event,av),br=E.bankRecoveryReview(bv.me,q,bv.economy,bv.event,bv);assert.equal(br.netAfterSpend-ar.netAfterSpend,12000,'Recovery does not deduct the same monthly license twice');
 const quoted={expense:100,profit:900};X.adjustReport(a.players[0],quoted);same(quoted,{expense:12100,profit:-11100,digitalPlatformCost:12000});
 E.AccountingPrototype.check(a.players[0].accounting);E.AccountingPrototype.check(b.players[0].accounting);
});

test('new rules retire all obsolete launches through catalog, preview, submit and AI while paid work retains benefits',()=>{
 const g=create(),p=g.players[0],q=plan(g),keys=[...X.LEGACY,...Object.keys(E.PROJECTS).filter(k=>E.PROJECTS[k].strategy)];
 for(const key of keys){assert.equal(E.projectCatalog(p,g)[key],undefined,key);assert.equal(E.projectTerms(p,key).retired,true,key);assert.equal(E.projectStartStatus(g,p,key).eligible,false,key);assert.throws(()=>E.submit(copy(g),0,{...copy(q),newProjects:[key],newProject:key}),/retired/,key);}
 for(let seat=0;seat<2;seat++)assert(E.planInitiatives(E.chooseBot(g,seat)).every(k=>!keys.includes(k)));
 const before=copy(p.stats);p.stats.compliance=60;p.stats.attention=40;const result=E.finishProject(g,p,{key:'correctiveAction',target:null});assert.match(result,/corrective risk/);assert.equal(p.stats.compliance,36);assert.equal(p.stats.attention,26);assert.equal(p.stats.cash,before.cash);assert.equal(p.stats.customers,before.customers);
 const upgrades=copy(p.upgrades);E.finishProject(g,p,{key:'technology',target:null});assert.equal(p.upgrades.technology,upgrades.technology+1,'Already paid historical work still completes');
});

test('real funded license settles once, half-ready restore is identical and activation grants no immediate book',()=>{
 const g=create(),q=plan(g),other=plan(g,1);q.newProjects=['licenseDigitalPlatform'];q.newProject='licenseDigitalPlatform';
 E.submit(g,0,q);const resumed=E.migrateCampaign(copy(g));E.submit(g,1,other);E.submit(resumed,1,copy(other));same(resumed,g);assert.equal(g.players[0].expandedBusiness.digital.route,'partner');assert.equal(g.players[0].operatingReport.digitalPlatformCost,0,'Completion follows the operating step; license billing starts next month');
 E.validatePilot(g);E.validateLedger(g);assert.equal(g.players[0].projects.filter(x=>x.key==='licenseDigitalPlatform').length,0);
 const round=g.players.map((_,i)=>plan(g,i));E.submit(g,0,round[0]);E.submit(g,1,round[1]);assert.equal(g.players[0].operatingReport.digitalPlatformCost,12000);E.validatePilot(g);E.validateLedger(g);
 const invalid=copy(g);delete invalid.players[0].operatingReport.digitalPlatformCost;assert.throws(()=>E.migrateCampaign(invalid),/digital platform cost/);
 g.gameOver=true;g.endReason='receivership';g.cycle--;assert.equal(E.rematch(g,0),false);assert.equal(E.rematch(g,1),true);assert.equal(g.version,'9.36');assert.equal(g.cycle,1);assert(g.players.every(p=>p.expandedBusinessVersion===1&&p.expandedBusiness.digital.route==='none'));E.validatePilot(g);
});

test('earlier rule sets replay an independent preserved engine exactly, including pending legacy work',()=>{
 const latest=process.argv.includes('--local-baseline'),baseline=path.join(__dirname,latest?'../reports/local/expanded-consolidation-20260927/before-BRANCH_WARS.html':'../../releases/v4-rc4/BRANCH_WARS.html');
 assert(fs.existsSync(baseline),'The independently preserved baseline is required');const old=load(fs.readFileSync(baseline,'utf8'));
 const expanded={...old.previewCampaignEdition({},'expanded',flags).options,mode:'hotseat',seed:'legacy-expanded',created:1,startingWorkforce:'covered'};
 for(const o of [{mode:'hotseat',seed:'legacy-core',created:1},expanded]){
  const a=old.createGame(o),b=E.createGame(o);same(b,a,'Opening state');
  const x=a.players.map((_,i)=>plan(a,i,old)),y=b.players.map((_,i)=>plan(b,i));same(y,x,'AI and cleared intent');
  x[0].newProjects=['marketing'];x[0].newProject='marketing';y[0].newProjects=['marketing'];y[0].newProject='marketing';
  old.submit(a,0,x[0]);E.submit(b,0,y[0]);same(E.migrateCampaign(copy(b)),old.migrateCampaign(copy(a)),'Old unsubmitted/half-ready orders remain legitimate');
  old.submit(a,1,x[1]);E.submit(b,1,y[1]);same(b,a,'Complete legacy settlement');for(const seat of [0,1])same(E.publicState(b,seat),old.publicState(a,seat),'Legacy private projection');
 }
});
