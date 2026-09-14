'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const c={console};vm.runInNewContext(require('../tools/build_game').assemble().html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.BWEngine={agencyProfessionalQuote,agencyProfessionalStatus,agencyRoleCounts,agencyDelivery,groupEntities,syncAccounts,settleAgency,validateAgencySave,CompanyFinance,'),c);const E=c.BWEngine,copy=x=>JSON.parse(JSON.stringify(x));let checks=0,months=0;
function test(name,fn){try{fn();checks++;console.log('PASS '+name);}catch(error){throw Error(name+': '+error.stack);}}
const options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:10}).options;
const fresh=(scenario='balanced',seed='professional')=>E.createGame({...options,mode:'hotseat',scenario,seed,created:1});
function validate(g){E.validatePilot(g);E.validateLedger(g);for(const i of [0,1])E.validateFinancialGroupView(E.publicState(g,i));}
function funded(g,amount=240000){
 // Conserved prior-capital-return fixture, not opening income or a player action.
 for(const p of g.players){const before=E.GroupAccounting.consolidate(p.financialGroup.parent,E.groupEntities(p),p.accounting);
  p.accounting=E.AccountingPrototype.post(p.accounting,'fixture.priorCapitalReturn',{cash:-amount,equity:-amount});E.syncAccounts(p);
  p.financialGroup.parent=E.GroupAccounting.post(p.financialGroup.parent,'fixture.priorCapitalReturn',p.id,{cash:amount,investments:-amount});p.financialGroup.investmentBasis.bank-=amount;
  assert.deepEqual(copy(E.GroupAccounting.consolidate(p.financialGroup.parent,E.groupEntities(p),p.accounting)),{...copy(before),eliminatedInvestment:before.eliminatedInvestment-amount});
 }validate(g);return g;
}
function resolve(g,tweak=()=>{}){const plans=g.players.map((p,i)=>E.chooseBot(g,i));for(const [i,p]of plans.entries()){p.groupPolicy.bankDividend=0;p.groupPolicy.bankSupport=0;tweak(p,i);}E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);months++;validate(g);}
function launch(plan,role='propertyProducer'){Object.assign(plan.agencyPolicy,{launch:true,capital:120000,staff:1,roles:{propertyProducer:0,benefitsProducer:0,servicing:0},outreach:2,maintainCredentials:true,target:role==='benefitsProducer'?'benefits':'property'});plan.agencyPolicy.roles[role]=1;}
test('new creation is strict, legacy saves do not acquire qualifications and old peers refuse',()=>{
 const g=fresh();validate(g);assert.equal(g.version,'9.9');assert.equal(g.players[0].agency.version,2);assert.equal(g.players[0].agency.staff,0);assert.equal(g.players[0].agency.professionals.employees.length,0);
 const caps=E.campaignCapabilities();assert.equal(caps.financialGroupSupported,10);assert.equal(E.peerRulesIssue(E.validateCampaignRules(g,'game'),{...caps,financialGroupSupported:9}).field,'financialGroupVersion');
 for(const bad of [x=>x.version='9.8',x=>x.players[0].agency.version=1,x=>delete x.players[0].agency.professionals,x=>x.players[0].agency.professionals.employees.push({id:'foreign',role:'propertyProducer',credentialThrough:12})]){const q=copy(g);bad(q);const before=JSON.stringify(q);assert.throws(()=>E.migrateCampaign(q));assert.equal(JSON.stringify(q),before);}
 const old=E.createGame({...options,financialGroupVersion:9,mode:'hotseat',seed:'legacy',created:1}),before=JSON.stringify(old);E.migrateCampaign(copy(old));assert.equal(old.players[0].agency.professionals,undefined);assert.equal(JSON.stringify(old),before);
});
test('roles are finite and quotes neither qualify bank staff nor spend or mutate',()=>{
 const g=funded(fresh()),p=E.publicState(g,0).me,s=E.defaultAgencyPlan(p);launch({agencyPolicy:s});const before=JSON.stringify({g,p,s}),q=E.agencyProfessionalQuote(p,s);
 assert.equal(q.recruitmentCost,7350);assert.equal(q.registrationCost,2500);assert.equal(q.monthlyExpense,9500);assert.equal(q.units,0);assert.equal(q.phase,'registration pending');assert.equal(JSON.stringify({g,p,s}),before);
 assert.throws(()=>E.normalizeAgencyPlan(p,{agencyPolicy:{...s,roles:{propertyProducer:1,benefitsProducer:1,servicing:0}}}),/employee count/);
 assert.throws(()=>E.normalizeAgencyPlan(p,{agencyPolicy:{...s,roles:{business:1,benefitsProducer:0,servicing:0}}}),/employee count/);
 assert.throws(()=>E.normalizeAgencyPlan(p,{agencyPolicy:{...s,roles:{propertyProducer:1.5,benefitsProducer:0,servicing:0}}}),/employee count/);
});
const g=funded(fresh());
test('funded launch charges registration and qualified recruitment once, without instant selling',()=>{
 resolve(g,(p,i)=>launch(p,i?'benefitsProducer':'propertyProducer'));
 for(const [i,p]of g.players.entries()){assert.equal(p.agency.report.recruitment,7350);assert.equal(p.agency.professionals.report.registrationCost,2500);assert.equal(p.agency.report.expense,i?49850:49350);assert.equal(p.agency.report.clients,0);assert.equal(p.agency.staff,1);assert.equal(p.stats.staff,p.allocation.service+p.allocation.business+p.allocation.lending+p.allocation.operations);assert.equal(p.agency.professionals.registration.readyCycle,3);}
});
test('registration lead time and product-specific producers control actual covers',()=>{
 resolve(g,hold);for(const p of g.players){assert.equal(p.agency.report.clients,0);assert.equal(p.agency.professionals.report.phase,'registration pending');assert.equal(p.agency.professionals.report.registrationCost,0);}
});
// Dedicated continuation uses a stable manual subsidiary policy, not AI role tuning.
function hold(plan,i){plan.agencyPolicy={...E.defaultAgencyPlan(g.players[i]),outreach:2,target:i?'benefits':'property',capital:0,dividend:0};}
test('approved producers operate only in their own product lines and replays are exact',()=>{
 const plans=g.players.map((p,i)=>E.chooseBot(g,i));plans.forEach((p,i)=>{p.groupPolicy.bankDividend=0;p.groupPolicy.bankSupport=0;hold(p,i);});const reverse=copy(g);
 E.submit(g,0,plans[0]);const restored=E.migrateCampaign(copy(g));E.submit(g,1,plans[1]);E.submit(restored,1,copy(plans[1]));E.submit(reverse,1,copy(plans[1]));E.submit(reverse,0,copy(plans[0]));months++;validate(g);
 // Migration removes the obsolete pre-capability strategy cache for every
 // supported save. Compare complete canonical saves, not that retired cache.
 assert.deepEqual(copy(E.migrateCampaign(copy(g))),copy(E.migrateCampaign(copy(restored))));assert.deepEqual(copy(g),copy(reverse));
 for(const [i,p]of g.players.entries()){assert(p.agency.report.clients>0);assert.equal(p.agency.professionals.report.registrationCost,0);assert.equal(p.agency.report.recruitment,0);for(const r of g.agencyEconomy.relationships.filter(r=>r.owner===p.id))assert.equal(r.product,i?'benefits':'property');}
});
test('operations specialists cannot replace licensed producers; role conversion is paid recruitment',()=>{
 const p=E.publicState(g,0).me,s={...E.defaultAgencyPlan(p),roles:{propertyProducer:0,benefitsProducer:0,servicing:1}};const q=E.agencyProfessionalQuote(p,s);assert.equal(q.phase,'no qualified producer');assert.equal(q.units,0);assert.equal(q.hired,1);assert.equal(q.released,1);assert.equal(q.recruitmentCost,7000);assert.equal(q.salary,4200);
 const dual={...s,staff:2,roles:{propertyProducer:1,benefitsProducer:0,servicing:1}},d=E.agencyProfessionalQuote(p,dual);assert.equal(d.units,20);assert.deepEqual(copy(d.permitted),['property','liability']);assert.equal(d.hired,1);
});
test('credentials expire, education costs cash and staff time, and renewal is not free',()=>{
 const p=E.publicState(g,0).me,s=E.defaultAgencyPlan(p),expiry=p.agency.professionals.employees[0].credentialThrough;
 let q=E.agencyProfessionalQuote(p,{...s,maintainCredentials:false},expiry+1);assert.equal(q.phase,'no qualified producer');assert.equal(q.units,0);assert.equal(q.educationCost,0);
 q=E.agencyProfessionalQuote(p,s,expiry+1);assert.equal(q.educationCost,900);assert.equal(q.units,6);assert.equal(q.renewed.length,1);assert.equal(q.state.employees[0].credentialThrough,expiry+12);
 const expiredRegistration=p.agency.professionals.registration.validThrough+1;assert.equal(E.agencyProfessionalQuote(p,{...s,maintainCredentials:false},expiredRegistration).phase,'registration expired');assert.equal(E.agencyProfessionalQuote(p,s,expiredRegistration).registrationCost,1500);
});
test('professionals and budgets remain owner-private and malformed roles fail closed',()=>{
 const v=E.publicState(g,0);assert.equal(v.rival.agency,undefined);assert.equal(v.lastPlans[g.players[1].id].agencyPolicy,undefined);const bad=copy(g);bad.players[0].agency.professionals.employees[0].role='business';assert.throws(()=>E.migrateCampaign(bad),/employee|role|qualified/);
});
test('inherited role names cannot masquerade as qualified employees and role-key order is canonical',()=>{
 for(const name of ['toString','constructor','__proto__']){const bad=copy(g);bad.players[0].agency.professionals.employees[0].role=name;bad.players[0].agency.professionals.employees[0].credentialThrough=0;assert.throws(()=>E.migrateCampaign(bad),/employee|role|qualified/);}
 const p=E.publicState(g,0).me,s={...E.defaultAgencyPlan(p),staff:3,roles:{servicing:1,benefitsProducer:1,propertyProducer:1}};
 const before=JSON.stringify({p,s});assert.deepEqual(copy(E.agencyProfessionalQuote(p,s)),copy(E.agencyProfessionalQuote(p,{...s,roles:{propertyProducer:1,benefitsProducer:1,servicing:1}})));assert.equal(JSON.stringify({p,s}),before);
});
console.log(JSON.stringify({suite:'agency-professionals',checks,fullEngineMonths:months,scope:'Versioned role and authorization integration. Conserved capital-return fixtures are not normal-opening balance evidence.'}));
