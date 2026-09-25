'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x)),html=require('../tools/build_game').assemble().html;
function engine(text){const c={};vm.runInNewContext(text.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);return c.BWEngine;}
const E=engine(html),options=edition=>({...E.previewCampaignEdition({},edition,{currentReporting:true}).options,commercialServiceVersion:1,mode:'hotseat',seed:'serviced-fees',created:1});
test('opening relationship fees require finite delivered service, with proportional partial capacity and no synthetic clients',()=>{
 const full=E.CommercialFeeEconomics.quote(80,150,2),half=E.CommercialFeeEconomics.quote(80,150,1),none=E.CommercialFeeEconomics.quote(80,150,0);
 assert.equal(full.workload,2);assert.equal(full.feeBase,80*760+150*650);assert.equal(half.feeBase,full.feeBase/2);assert.equal(none.feeBase,0);
 assert.deepEqual(copy(E.CommercialFeeEconomics.quote(80,150,200)),copy(full));assert.equal(E.CommercialFeeEconomics.quote(0,0,5).feeBase,0);
 for(const args of [[-1,0,0],[0,1.1,0],[1,1,NaN],[1,1,-1]])assert.throws(()=>E.CommercialFeeEconomics.quote(...args));
});
test('Core servicing consumes the same Business time and excludes this operating step\'s acquisitions',()=>{
 const g=E.createGame(options('core')),v=E.publicState(g,0),plan=E.chooseBot(copy(g),0),before=JSON.stringify({g,v,plan});
 const r=E.operatingPreview(v.me,plan,v.economy,v,true);
 assert.equal(r.commercialOpeningBusiness,v.me.stats.business);assert.equal(r.commercialOpeningMerchant,v.me.stats.merchant);
 assert(r.commercial.businessRelationships>=r.commercialOpeningBusiness);assert(r.commercialServiceDelivered>0);
 const noStaff=copy(plan);noStaff.allocation.service+=noStaff.allocation.business;noStaff.allocation.business=0;
 const empty=E.operatingPreview(v.me,noStaff,v.economy,v,true);assert.equal(empty.commercialIncome,0);assert.equal(empty.commercialServiceCoverage,0);
 assert.equal(JSON.stringify({g,v,plan}),before);assert(E.IncomeReview.reconciliation(r).reconciled);
});
test('Expanded fees follow the existing authorized task; purchased service is charged once and forecasts stay pure',()=>{
 const g=E.createGame(options('expanded')),v=E.publicState(g,0),plan=E.chooseBot(copy(g),0);
 for(const role of Object.keys(plan.departmentFunctionsPolicy.quotas.relationships))plan.departmentFunctionsPolicy.quotas.relationships[role]=0;
 plan.departmentFunctionsPolicy.vendors.relationships=0;
 const before=JSON.stringify({g,v,plan}),empty=E.operatingPreview(v.me,plan,v.economy,v,true);
 assert.equal(empty.commercialIncome,0);assert.equal(empty.commercialServiceCoverage,0);
 const served=copy(plan);served.departmentFunctionsPolicy.vendors.relationships=2;
 const quote=E.departmentFunctionsQuote(v,v.me,served);assert(quote.status.eligible);
 const result=E.operatingPreview(v.me,served,v.economy,v,true);
 assert(result.commercialIncome>0);assert.equal(result.commercialServiceCoverage,1);
 assert.equal(result.departmentFunctionExpense-empty.departmentFunctionExpense,6000);
 assert(E.IncomeReview.reconciliation(result).reconciled);assert.equal(JSON.stringify({g,v,plan}),before);
});
test('explicit servicing campaigns settle, resume and rematch with strict private rules',()=>{
 for(const edition of ['core','expanded']){
  const g=E.createGame(options(edition));assert.equal(g.version,edition==='core'?'8.17':'9.30');
  for(let month=0;month<3;month++){
   const plans=g.players.map((_,i)=>E.chooseBot(g,i));E.submit(g,0,plans[0]);const restored=E.migrateCampaign(copy(g));
   E.submit(g,1,plans[1]);E.submit(restored,1,copy(plans[1]));assert.deepEqual(copy(E.migrateCampaign(g)),copy(E.migrateCampaign(restored)));E.validatePilot(g);E.validateLedger(g);
   for(const seat of [0,1]){const v=E.publicState(g,seat);E.validateIncomeHistoryView(v);assert.equal(v.me.commercialServiceVersion,1);assert.equal(v.rival.commercialServiceVersion,undefined);assert(E.IncomeReview.reconciliation(v.me.operatingReport).reconciled);}
  }
  g.gameOver=true;g.cycle--;E.rematch(g,0);E.rematch(g,1);assert.equal(g.commercialServiceVersion,1);E.validatePilot(g);
  const bad=copy(g);delete bad.players[0].commercialServiceVersion;assert.throws(()=>E.migrateCampaign(bad),/servicing owner/);
  const stripped=copy(g);delete stripped.commercialServiceVersion;delete stripped.incomeHistoryVersion;for(const p of stripped.players){delete p.commercialServiceVersion;delete p.incomeHistory;}assert.throws(()=>E.migrateCampaign(stripped),/Missing commercial servicing/);
  const badView=E.publicState(g,0);delete badView.commercialServiceVersion;delete badView.me.commercialServiceVersion;assert.throws(()=>E.validateIncomeHistoryView(badView),/Missing commercial servicing/);
  const caps=E.campaignCapabilities();delete caps.commercialServiceSupported;assert.equal(E.peerRulesIssue(E.campaignRules(g,{context:'game'}),caps).field,'commercialServiceVersion');
 }
 const missing=options('core');delete missing.incomeHistoryVersion;assert.throws(()=>E.createGame(missing),/requires/);
 assert.throws(()=>E.createGame({...options('core'),commercialServiceVersion:2}),/servicing version/);
 const unchanged=E.createGame({...options('core'),commercialServiceVersion:0});assert.equal(unchanged.commercialServiceVersion,undefined);assert.equal(unchanged.version,'8.16');
});
test('the servicing proposal preserves existing instructions and buys only cash-funded, net-beneficial work',()=>{
 const g=E.createGame(options('expanded')),plan=E.chooseBot(copy(g),0);
 plan.newProjects=[];plan.newProject=null;plan.investments={};plan.hires=0;plan.specialistHires=E.emptySpecialistOrders();plan.opportunity=null;plan.contractBid=null;
 for(const role of Object.keys(plan.departmentFunctionsPolicy.quotas.relationships))plan.departmentFunctionsPolicy.quotas.relationships[role]=0;
 plan.departmentFunctionsPolicy.vendors.relationships=0;
 const before=JSON.stringify({g,plan}),q=E.commercialServicePlanReview(g,0,plan);
 assert(q.accepted,q.reason);assert(q.after.profit>q.before.profit);assert(q.additionalExpense>0);
 assert(q.after.commercialIncome>q.before.commercialIncome);assert.equal(JSON.stringify({g,plan}),before);
 const restored=copy(q.plan);restored.departmentFunctionsPolicy.vendors.relationships=0;assert.deepEqual(restored,copy(plan));
 const covered=E.commercialServicePlanReview(g,0,q.plan);assert.equal(covered.accepted,false);assert.match(covered.reason,/covered/);
});
test('existing reporting campaigns keep exact creation, AI/RNG, resolution and views against the preserved setup build',()=>{
 const prior=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_income_setup_5309a5ef.html'),'utf8');
 assert.equal(createHash('sha256').update(prior).digest('hex'),'5309a5ef04b75922979c97baa2dbe5852e6c7b3ca32a23e41de45e49f52ed8df');const old=engine(prior);
 for(const edition of ['core','expanded']){
  const o={...old.previewCampaignEdition({},edition,{currentReporting:true}).options,mode:'hotseat',seed:'service-legacy',created:1},a=old.createGame(o),b=E.createGame(o);assert.deepEqual(copy(b),copy(a));
  for(let month=0;month<2;month++){
   const x=a.players.map((_,i)=>old.chooseBot(a,i)),y=b.players.map((_,i)=>E.chooseBot(b,i));assert.deepEqual(copy(x),copy(y));
   for(const seat of [0,1]){old.submit(a,seat,x[seat]);E.submit(b,seat,y[seat]);}assert.deepEqual(copy(b),copy(a));
   for(const seat of [0,1])assert.deepEqual(copy(E.publicState(b,seat)),copy(old.publicState(a,seat)));
  }
 }
});
