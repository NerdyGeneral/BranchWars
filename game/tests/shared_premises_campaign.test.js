'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const context={};vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],context);
const E=context.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));
function opening(){return E.createGame({...E.previewCampaignEdition({},'expanded').options,sharedPremisesVersion:1,mode:'hotseat',seed:'premises49',created:1});}
function plan(g,i){const p=g.players[i],a=E.chooseBot(g,i);
 a.newProjects=[];a.newProject=null;a.investments={};a.hires=0;a.specialistHires=E.emptySpecialistOrders();a.competitiveAction='none';a.opportunity=null;a.contractBid=null;
 a.facilityPolicy=E.defaultFacilityPolicy();a.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(p);a.facilityExtensionPolicy={start:null,cancel:null};
 a.commercialAccountPolicy={target:null,staffQuarters:0};a.servicePolicy.staff=0;a.allocation={...p.allocation};
 a.investmentPolicy=E.defaultInvestmentPlan(p);a.agencyPolicy=E.defaultAgencyPlan(p);a.groupPolicy.bankDividend=0;a.groupPolicy.bankSupport=0;
 a.companyShareOrders=[];a.companyControlPolicy=E.defaultCompanyControlPlan(p);
 a.sharedPremisesPolicy=copy(p.sharedPremises.policy);
 for(const row of Object.values(a.departmentFunctionsPolicy.quotas))for(const role of Object.keys(row))row[role]=0;
 for(const k of Object.keys(a.departmentFunctionsPolicy.vendors))a.departmentFunctionsPolicy.vendors[k]=0;
 a.facilityLifecyclePolicy=E.facilityLifecycleStaffProposal(g,p,a).policy;return a;
}
function tick(g,orders){E.submit(g,0,orders[0]);E.submit(g,1,orders[1]);E.validatePilot(g);E.validateLedger(g);return g;}
test('new Expanded selects 9.27; historical 9.26 stays unchanged and premises rules remain strict and private',()=>{
 const g=opening();assert.equal(g.version,'9.27');E.validatePilot(g);
 assert.equal(E.createGame({...E.previewCampaignEdition({},'expanded').options,seed:1,created:1}).version,'9.27');
 const historical={...E.previewCampaignEdition({},'expanded').options};delete historical.sharedPremisesVersion;
 const old=E.createGame({...historical,seed:1,created:1});assert.equal(old.version,'9.26');assert(!E.migrateCampaign(copy(old)).sharedPremisesVersion);
 assert.throws(()=>E.createGame({sharedPremisesVersion:1}));
 for(const alter of [x=>x.version='9.26',x=>x.sharedPremisesVersion=2,x=>delete x.sharedPremisesVersion,x=>delete x.players[0].sharedPremises,x=>x.players[0].sharedPremises.totals.agencyRent=1,x=>x.players[0]._premisesExecutionAvailable=4]){const bad=copy(g);alter(bad);assert.throws(()=>E.migrateCampaign(bad));}
 for(const i of [0,1]){const v=E.publicState(g,i);E.validateFinancialGroupView(v);assert.equal(v.sharedPremisesVersion,1);assert(!v.rival.sharedPremises);
 const bad=copy(v);bad.rival.sharedPremises=copy(v.me.sharedPremises);assert.throws(()=>E.validateFinancialGroupView(bad),/Private/);}
 assert.equal(E.campaignCapabilities().sharedPremisesSupported,1);
});
test('actual monthly construction pays once, circulates supplier cash and survives half-ready save/replay',()=>{
 let g=opening(),p=g.players[0],id=p.facilityNetwork.offices[0].id;
 const count=p.facilityNetwork.offices.length,orders=[plan(g,0),plan(g,1)],before=E.planBudget(p,orders[0],g).total;
 orders[0].sharedPremisesPolicy.build={office:id,kind:'visiting'};
 assert.equal(E.planBudget(p,orders[0],g).total-before,45000);
 E.submit(g,0,orders[0]);const checkpoint=copy(g),replay=E.migrateCampaign(copy(checkpoint));E.submit(g,1,orders[1]);E.submit(replay,1,copy(orders[1]));assert.deepEqual(copy(g),copy(replay));
 for(let n=0;n<3;n++){E.validatePilot(g);const v=E.publicState(g,1);E.validateFinancialGroupView(v);assert(!v.lastPlans?.[v.rival.id]?.sharedPremisesPolicy);g=E.migrateCampaign(copy(g));tick(g,[plan(g,0),plan(g,1)]);}
 p=g.players[0];assert.equal(p.sharedPremises.totals.construction,45000);assert(p.sharedPremises.totals.outsidePaid>0);assert.equal(p.facilityNetwork.offices.length,count);
 assert.equal(p.sharedPremises.book.month,g.cycle-1);assert.equal(p.sharedPremises.book.rooms[0].ready,2);assert.equal(p.sharedPremises.policy.build,null);
 assert(g.facilityEconomy.circulated>0);assert.equal(p._premisesExecutionAvailable,undefined);
 const bad=copy(g);bad.players[0].sharedPremises.totals.outsidePaid++;assert.throws(()=>E.validatePilot(bad),/supplier/i);
});
test('shared-office instructions reject foreign hosts, phantom employees and competing construction without mutation',()=>{
 const g=opening(),p=g.players[0],orders=[plan(g,0),plan(g,1)];
 for(const build of [{office:g.players[1].facilityNetwork.offices[0].id,kind:'visiting'},{office:p.facilityNetwork.offices[0].id,kind:'unknown'}]){
  const candidate=copy(orders[0]);candidate.sharedPremisesPolicy.build=build;const before=JSON.stringify(g);assert.throws(()=>E.submit(g,0,candidate));assert.equal(JSON.stringify(g),before);
 }
 const invalid=copy(orders[0]);invalid.sharedPremisesPolicy.allocations=[{room:1,entity:p.agency.book.entityId,role:'adviser',quarters:4}];assert.throws(()=>E.submit(g,0,invalid));
 const conflict=copy(orders[0]);conflict.facilityExtensionPolicy.start=p.facilityNetwork.offices[0].id;conflict.sharedPremisesPolicy.build={office:p.facilityNetwork.offices[0].id,kind:'visiting'};assert.throws(()=>E.submit(g,0,conflict),/construction/);
});

for(const business of ['agency','investment'])test(business+' occupancy reconciles through complete campaign turns and restored private views',()=>{
 let g=opening(),p=g.players[0];const A=E.AccountingPrototype,G=E.GroupAccounting,amount=business==='agency'?300000:350000;
 // Return existing bank equity to its actual parent; no outside endowment.
 p.accounting=A.post(p.accounting,'fixture.capitalReturn',{cash:-amount,equity:-amount});
 p.stats.cash=p.accounting.accounts.cash;p.stats.capital=p.accounting.accounts.equity;p.stats.earnings=p.accounting.retainedEarnings;
 p.financialGroup.parent=G.post(p.financialGroup.parent,'fixture.capitalReturn',p.id,{cash:amount,investments:-amount});p.financialGroup.investmentBasis.bank-=amount;E.validatePilot(g);
 const office=p.facilityNetwork.offices[0].id;
 for(let month=1;month<=4;month++){
  const orders=[plan(g,0),plan(g,1)];
  if(month===1){orders[0].sharedPremisesPolicy.build={office,kind:business==='agency'?'agency':'visiting'};
   if(business==='agency')Object.assign(orders[0].agencyPolicy,{launch:true,capital:200000,staff:2,roles:{propertyProducer:1,benefitsProducer:0,servicing:1}});
   else Object.assign(orders[0].investmentPolicy.institution,{launch:true,capital:250000,roles:{adviser:1,broker:0,principal:0,operations:1}});
  }
  p=g.players[0];
  if(month>=3){
   const entity=business==='agency'?p.agency.book.entityId:p.investmentBusiness.book.entityId;
   orders[0].sharedPremisesPolicy.allocations=business==='agency'?['propertyProducer','servicing'].map(role=>({room:1,entity,role,quarters:2})):[{room:1,entity,role:'adviser',quarters:1}];
   if(business==='agency')orders[0].agencyPolicy.outreach=2;else orders[0].investmentPolicy.pursue=true;
  }
  tick(g,orders);g=E.migrateCampaign(copy(g));E.validatePilot(g);
  for(const i of [0,1])E.validateFinancialGroupView(E.publicState(g,i));
 }
 p=g.players[0];assert(p.sharedPremises.totals[business+'Rent']>0);assert.equal(p.sharedPremises.book.report.unfunded,0);
 assert(p.eventLedger===undefined,'Owner ledger is projected from campaign history, not duplicated on the institution');
 assert(g.eventLedger.some(e=>e.category==='group.premises'&&e.changes.sharedPremises));
 const bad=copy(g);bad.players[0].sharedPremises.totals[business+'Rent']++;assert.throws(()=>E.migrateCampaign(bad),/reconcile/);
});
