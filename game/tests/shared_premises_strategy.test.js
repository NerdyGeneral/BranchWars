'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const context={};vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);
const E=context.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
function opening(){return E.createGame({...E.previewCampaignEdition({},'expanded').options,sharedPremisesVersion:1,mode:'hotseat',seed:'premises51',created:1});}
function quiet(g,i){const p=g.players[i],s=E.chooseBot(g,i);
 s.newProjects=[];s.newProject=null;s.investments={};s.hires=0;s.specialistHires=E.emptySpecialistOrders();s.competitiveAction='none';s.opportunity=null;s.contractBid=null;
 s.facilityPolicy=E.defaultFacilityPolicy();s.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);s.facilityExtensionPolicy={start:null,cancel:null};
 s.commercialAccountPolicy={target:null,staffQuarters:0};s.servicePolicy.staff=0;s.allocation={...p.allocation};
 s.investmentPolicy=E.defaultInvestmentPlan(p);s.agencyPolicy=E.defaultAgencyPlan(p);s.groupPolicy.bankDividend=0;s.groupPolicy.bankSupport=0;
 s.companyShareOrders=[];s.companyControlPolicy=E.defaultCompanyControlPlan(p);s.sharedPremisesPolicy=copy(p.sharedPremises.policy);
 for(const row of Object.values(s.departmentFunctionsPolicy.quotas))for(const role of Object.keys(row))row[role]=0;
 for(const k of Object.keys(s.departmentFunctionsPolicy.vendors))s.departmentFunctionsPolicy.vendors[k]=0;
 s.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,s).policy;return s;
}
function tick(g,a,b=quiet(g,1)){E.submit(g,0,a);E.submit(g,1,b);E.validatePilot(g);E.validateLedger(g);return E.migrateCampaign(copy(g));}
let prepared;
function funded(){
 if(prepared)return copy(prepared);
 let g=opening(),p=g.players[0],amount=500000;
 p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.capitalReturn',{cash:-amount,equity:-amount});p.stats.cash=p.accounting.accounts.cash;p.stats.capital=p.accounting.accounts.equity;p.stats.earnings=p.accounting.retainedEarnings;
 p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.capitalReturn',p.id,{cash:amount,investments:-amount});p.financialGroup.investmentBasis.bank-=amount;
 for(let m=1;m<6;m++){const a=quiet(g,0);if(m===1)Object.assign(a.investmentPolicy.institution,{launch:true,capital:450000,roles:{adviser:1,broker:0,principal:0,operations:1}});g=tick(g,a);}
 prepared=copy(g);return g;
}
function profitableView(g){const v=E.publicState(g,0);
 // Decision fixture: prescribe positive last-period earnings, not extra cash,
 // capital, clients or staff. Full-turn checks below use the real saved books.
 v.me.stats.lastProfit=100000;v.me.investmentSnapshot.performance={...(v.me.investmentSnapshot.performance||{}),fees:40000,providerCost:0};
 Object.defineProperty(v,'rival',{get(){throw Error('Private rival access');}});return v;
}
test('historical behavior and inactive groups remain unchanged; review is deterministic and owner-only',()=>{
 const g=opening(),input=quiet(g,0),v=E.publicState(g,0),before=JSON.stringify({g,input,v});
 const a=E.sharedPremisesStrategyReview(v,input),b=E.sharedPremisesStrategyReview(v,input);assert.deepEqual(copy(a),copy(b));assert.equal(a.plan.sharedPremisesPolicy.build,null);assert.equal(a.plan.sharedPremisesPolicy.allocations.length,0);assert.equal(JSON.stringify({g,input,v}),before);
 const legacy={...v};delete legacy.sharedPremisesVersion;assert.equal(E.sharedPremisesStrategyReview(legacy,input).plan,input);
});
test('funded positive-income secondary-market demand produces an affordable room; losses and scarce funding do not',()=>{
 const g=funded(),input=quiet(g,0),v=profitableView(g);input.investmentPolicy.market='northside';input.investmentPolicy.pursue=true;
 const before=JSON.stringify({g,input}),result=E.sharedPremisesStrategyReview(v,input),order=result.plan.sharedPremisesPolicy;
 assert.equal(order.build?.kind,'visiting',result.reason);assert.equal(order.build.office,v.me.facilityNetwork.offices[0].id);
 assert(E.sharedPremisesPlanReview(v,v.me,result.plan).eligible);assert.equal(JSON.stringify({g,input}),before);
 for(const change of [x=>x.me.investmentSnapshot.performance.fees=0,x=>x.me.stats.cash=0,x=>x.me.stats.lastProfit=-1,x=>x.me.facilityLifecycle.records[x.me.facilityNetwork.offices[0].id].conditionBp=1000]){
  const bad=profitableView(g);change(bad);assert.equal(E.sharedPremisesStrategyReview(bad,input).plan.sharedPremisesPolicy.build,null);
 }
 const central=copy(input);central.investmentPolicy.market='downtown';assert.equal(E.sharedPremisesStrategyReview(v,central).plan.sharedPremisesPolicy.build,null,'No second-market benefit from an unused main-market room');
});
test('real funded build, local allocation, staffing loss and saved replay remain valid through full turns',()=>{
 let g=funded(),input=quiet(g,0);input.investmentPolicy.market='northside';input.investmentPolicy.pursue=true;
 const chosen=E.sharedPremisesStrategyReview(profitableView(g),input).plan;g=tick(g,chosen);
 assert.equal(g.players[0].sharedPremises.totals.construction,45000);
 const actual=copy(g);input=quiet(g,0);input.investmentPolicy.market='northside';input.investmentPolicy.pursue=true;
 const decision=E.sharedPremisesStrategyReview(E.publicState(g,0),input),normal=decision.plan;assert.equal(normal.sharedPremisesPolicy.allocations[0]?.quarters,1,JSON.stringify({reason:decision.reason,rooms:g.players[0].sharedPremises.book.rooms,quote:E.sharedPremisesPlanReview(E.publicState(g,0),g.players[0],normal)}));
 const before=JSON.stringify(g);assert(E.sharedPremisesPlanReview(E.publicState(g,0),g.players[0],normal).eligible);assert.equal(JSON.stringify(g),before);
 g=tick(g,normal);assert(g.players[0].sharedPremises.totals.investmentRent>0);
 // Release the actual adviser through a normal funded institution instruction.
 const released=quiet(g,0);released.investmentPolicy.institution.roles.adviser=0;
 const revised=E.sharedPremisesStrategyReview(E.publicState(g,0),released).plan;assert.equal(revised.sharedPremisesPolicy.allocations.length,0);
 g=tick(g,revised);assert.equal(g.players[0].investmentBusiness.employees.filter(e=>e.role==='adviser').length,0);
 assert.equal(g.players[0].sharedPremises.book.report.delivery.length,0);
 const repeat=tick(copy(actual),copy(normal));assert.equal(repeat.players[0].sharedPremises.totals.investmentRent,g.players[0].sharedPremises.totals.investmentRent,'Clearing assignments does not invoice phantom adviser time');
});
test('new AI commercial construction cannot overbook already-paid shared rooms',()=>{
 let g=funded(),p=g.players[0],input=quiet(g,0);input.sharedPremisesPolicy.build={office:p.facilityNetwork.offices[0].id,kind:'visiting'};g=tick(g,input);
 input=quiet(g,0);input.facilityExtensionPolicy={start:g.players[0].facilityNetwork.offices[0].id,cancel:null};
 const result=E.sharedPremisesStrategyReview(E.publicState(g,0),input).plan;assert.equal(result.facilityExtensionPolicy.start,null);assert(E.sharedPremisesPlanReview(E.publicState(g,0),g.players[0],result).eligible);
});

test('two real offices share finite advisers; closing one ends its delivery without erasing the other',()=>{
 let g=funded(),a=quiet(g,0);
 a.newProjects=['branch'];a.newProject='branch';a.projectTargets={branch:'northside'};
 g=tick(g,a);
 for(let n=0;n<6&&!g.players[0].facilityNetwork.offices.some(o=>o.market==='northside'&&o.closedCycle===null);n++)g=tick(g,quiet(g,0));
 let p=g.players[0];const hosts=['downtown','northside'].map(m=>p.facilityNetwork.offices.find(o=>o.market===m&&o.closedCycle===null));
 assert(hosts.every(Boolean),'Paid branch construction must complete in the second market');
 for(const host of hosts){a=quiet(g,0);a.sharedPremisesPolicy.build={office:host.id,kind:'visiting'};g=tick(g,a);}
 p=g.players[0];assert.equal(p.sharedPremises.book.rooms.length,2);
 a=quiet(g,0);a.investmentPolicy.pursue=true;
 a.sharedPremisesPolicy.allocations=p.sharedPremises.book.rooms.map(r=>({room:r.id,entity:p.investmentBusiness.book.entityId,role:'adviser',quarters:1}));
 const quote=E.sharedPremisesPlanReview(g,p,a);assert(quote.eligible,quote.reason);
 assert.equal(quote.tenants.find(t=>t.id===p.investmentBusiness.book.entityId).reserved.adviser,2);
 g=tick(g,a);assert.equal(g.players[0].sharedPremises.book.report.delivery.length,2);
 a=quiet(g,0);a.newProjects=['branchClose'];a.newProject='branchClose';a.projectTargets={branchClose:'northside'};
 // Capture after both AI decisions: choosing a plan advances the separate AI
 // stream. Replay the same two orders, rather than asking the rival again.
 const rival=quiet(g,1),preClose=copy(g);
 g=tick(g,a,rival);const replay=tick(copy(preClose),copy(a),copy(rival));assert.deepEqual(copy(g),copy(replay));
 assert.notEqual(g.players[0].facilityNetwork.offices.find(o=>o.id===hosts[1].id).closedCycle,null);
 a=quiet(g,0);a.investmentPolicy.market='northside';a.investmentPolicy.pursue=true;
 const chosen=E.sharedPremisesStrategyReview(E.publicState(g,0),a).plan;
 const closedRoom=g.players[0].sharedPremises.book.rooms.find(r=>r.office===hosts[1].id);
 assert(chosen.sharedPremisesPolicy.allocations.every(r=>r.room!==closedRoom.id));
 g=tick(g,chosen);const report=g.players[0].sharedPremises.book.report;
 assert(report.delivery.every(r=>r.room!==closedRoom.id));
 assert.equal(g.players[0].sharedPremises.totals.construction,90000,'Closing never refunds or rebuilds paid rooms');
 assert.equal(g.players[0].facilityNetwork.offices.find(o=>o.id===hosts[0].id).closedCycle,null);
});
