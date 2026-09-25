'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), copy = x => JSON.parse(JSON.stringify(x)), ctx = {console};
const html = require('../tools/build_game').assemble().html;
vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={',
  'root.BWEngine={CompanyFinance,settleAgency,validateAgencySave,groupEntities,agencyWindDown,agencyInvoice,agencyPayBills,syncAccounts,'), ctx);
const E = ctx.BWEngine;
const options = E.previewFeatureSelection({}, {field:'financialGroupVersion', value:3}).options;
const fresh = scenario => E.createGame({...options, mode:'hotseat', seed:'agency:' + scenario, scenario:scenario || 'balanced', created:1});
const same = (a,b) => assert.deepEqual(copy(a),copy(b));
let checks = 0, months = 0;
function validate(g) {
  E.validatePilot(g); E.validateLedger(g);
  for (const i of [0,1]) E.validateFinancialGroupView(E.publicState(g,i));
}
function funded(g, amount = 240000) {
  // Test-only prior capital-return fixture. Move EXISTING bank cash/capital to
  // the parent and reduce its bank basis, preserving consolidated resources.
  // This fixture does not add a capital-return gameplay action or pretend an
  // opening bank has distributable earnings; actual dividend rules are tested
  // separately by the existing financial-group and group-accounting suites.
  for (const p of g.players) {
    const before = E.GroupAccounting.consolidate(p.financialGroup.parent,E.groupEntities(p),p.accounting);
    p.accounting = E.AccountingPrototype.post(p.accounting,'fixture.priorCapitalReturn',{cash:-amount,equity:-amount});
    E.syncAccounts(p);
    p.financialGroup.parent = E.GroupAccounting.post(p.financialGroup.parent,'fixture.priorCapitalReturn',p.id,
      {cash:amount,investments:-amount});
    p.financialGroup.investmentBasis.bank -= amount;
    const after=E.GroupAccounting.consolidate(p.financialGroup.parent,E.groupEntities(p),p.accounting);
    for(const k of ['assets','liabilities','equity','retainedEarnings','custodyAssets']) assert.equal(after[k],before[k]);
  }
  return g;
}
function resolve(g, tweak = () => {}) {
  const plans = g.players.map((p,i) => E.chooseBot(g,i));
  plans.forEach((plan,i) => { plan.groupPolicy.bankDividend=0; plan.groupPolicy.bankSupport=0; tweak(plan,i); });
  E.submit(g,0,plans[0]); E.submit(g,1,plans[1]); months++; validate(g);
}
const opening = fresh(); validate(opening);
assert.equal(opening.version,'9.2'); assert.equal(opening.companyEconomy.version,3);
assert.equal(opening.agencyEconomy.relationships.length,18);
assert.equal(opening.agencyEconomy.premiumPaid,0);
assert(opening.players.every(p => p.agency.status === 'unopened' && p.agency.book.accounts.cash === 0)); checks++;
for (const v of [1,2]) {
  const g = E.createGame({...options,financialGroupVersion:v,mode:'hotseat',seed:'old',created:1});
  assert.equal(g.agencyEconomy,undefined); assert.equal(g.players[0].agency,undefined);
  const before = JSON.stringify(g); same(E.settleAgency(g,[]),[]); assert.equal(JSON.stringify(g),before);
  assert.throws(() => E.normalizeAgencyPlan(g.players[0],{agencyPolicy:{}}),/require/); checks++;
}
const fundedGame = funded(fresh()); validate(fundedGame);
const beforeCash = fundedGame.players.map(p => p.financialGroup.parent.accounts.cash);
resolve(fundedGame, (plan,i) => Object.assign(plan.agencyPolicy,{launch:true,capital:120000,staff:1,outreach:2,target:i?'liability':'property'}));
assert(fundedGame.players.every(p => p.agency.status === 'active'));
for (const [i,p] of fundedGame.players.entries()) {
  assert.equal(p.agency.report.capital,120000); assert.equal(p.agency.report.setup,30000);
  assert.equal(p.agency.report.recruitment,7000);
  assert.equal(p.agency.report.expense,45000); assert.equal(p.agency.report.paid,45000);
  assert.equal(p.financialGroup.parent.accounts.cash,beforeCash[i]-120000);
  assert(p.agency.report.commission > 0); assert(p.agency.report.won > 0);
}
assert.equal(fundedGame.agencyEconomy.operatingPaid,90000); checks++;
assert.equal(fundedGame.companyEconomy.agencyCashNet,fundedGame.agencyEconomy.premiumPaid);
const totalCash = fundedGame.agencyEconomy.carrier.accounts.cash + fundedGame.agencyEconomy.supplier.accounts.cash +
  fundedGame.players.reduce((n,p) => n+p.agency.book.accounts.cash,0);
assert.equal(totalCash,fundedGame.agencyEconomy.parentCashNet+fundedGame.agencyEconomy.premiumPaid); checks++;
// Owning an insurance relationship never changes the banking mandate.
const bankProviders = fundedGame.serviceAgreements.map(c => c.owner);
const owner = E.publicState(fundedGame,0), snapshot = JSON.stringify(owner);
const quote = E.agencyQuote(owner.me,E.defaultAgencyPlan(owner.me));
assert(quote.relationships > 0); assert(quote.serviceLoad > 0); assert(quote.estimatedCommission > 0);
assert.equal(JSON.stringify(owner),snapshot); same(fundedGame.serviceAgreements.map(c=>c.owner),bankProviders); checks++;
assert.equal(owner.rival.agency,undefined); assert.equal(owner.rival.agencySnapshot,undefined);
const privatePlan = copy(fundedGame); privatePlan.lastPlans[privatePlan.players[1].id].agencyPolicy.supportCap=98765;
assert.equal(E.publicState(privatePlan,0).lastPlans[privatePlan.players[1].id].agencyPolicy,undefined); checks++;
const invalidPlans = [
  s => s.staff=0, s => s.staff=5, s => s.capital=-1, s => s.capital=.5,
  s => s.supportCap=100001, s => s.target='underwriting', s => s.extra=true,
  s => s.dividend=1000000000, s => s.launch=true
];
for (const damage of invalidPlans) {
  const p = fundedGame.players[0], plan={agencyPolicy:E.defaultAgencyPlan(p),groupPolicy:E.defaultGroupPlan(p)};
  damage(plan.agencyPolicy); const unchanged = JSON.stringify(p);
  assert.throws(() => E.normalizeAgencyPlan(p,plan)); assert.equal(JSON.stringify(p),unchanged); checks++;
}
const overcommitted={agencyPolicy:{...E.defaultAgencyPlan(fundedGame.players[0]),capital:100000},
  groupPolicy:{...E.defaultGroupPlan(fundedGame.players[0]),bankSupport:100000}};
assert.throws(()=>E.normalizeAgencyPlan(fundedGame.players[0],overcommitted),/parent cash/); checks++;
// Safe forecasts, deterministic simultaneous order and save/resume retain books.
const g = copy(fundedGame), plans=g.players.map((p,i)=>E.chooseBot(g,i));
const reversed=copy(g); E.submit(g,0,plans[0]); const restored=E.migrateCampaign(copy(g));
E.submit(g,1,plans[1]); E.submit(restored,1,copy(plans[1]));
E.submit(reversed,1,copy(plans[1])); E.submit(reversed,0,copy(plans[0]));
validate(g); same(E.migrateCampaign(copy(g)),E.migrateCampaign(copy(restored)));
same(E.migrateCampaign(copy(g)),E.migrateCampaign(copy(reversed))); months++; checks++;
// Exhaust business cash using a real matched supplier invoice. Failure writes
// off creditor claims and parent basis without deleting a liability or charging
// the consolidated group twice for losses already recorded by its subsidiary.
const failure = copy(fundedGame), p=failure.players[0], a=p.agency;
const bill=a.book.accounts.cash+12345;
E.agencyInvoice(failure,p,bill,'fixture.claim'); E.agencyPayBills(failure,p);
const consolidatedBefore=E.GroupAccounting.consolidate(p.financialGroup.parent,E.groupEntities(p),p.accounting);
const supplierBefore=failure.agencyEconomy.supplier.accounts.equity;
E.agencyWindDown(failure,p);
const consolidatedAfter=E.GroupAccounting.consolidate(p.financialGroup.parent,E.groupEntities(p),p.accounting);
assert.equal(a.status,'failed'); assert.equal(p.financialGroup.investmentBasis.agency,0);
assert(Object.values(a.book.accounts).every(n=>n===0));
assert.equal(failure.agencyEconomy.supplier.accounts.equity-supplierBefore,-12345);
assert.equal(consolidatedAfter.equity-consolidatedBefore.equity,12345);
assert.equal(consolidatedAfter.retainedEarnings-consolidatedBefore.retainedEarnings,12345);
assert.equal(E.groupEntities(p).length,0); assert.equal(failure.gameOver,false); checks++;
// Domain validation rejects ledger-independent schema corruption.
for (const damage of [
  x=>delete x.agencyEconomy, x=>x.agencyEconomy.premiumPaid++, x=>x.agencyEconomy.parentCashNet++,
  x=>x.agencyEconomy.relationships[0].owner='intruder', x=>x.agencyEconomy.relationships[0].remaining=99,
  x=>x.players[0].financialGroup.investmentBasis.agency++, x=>x.players[0].agency.staff=9,
  x=>x.players[0].agencySnapshot={}
]) { const bad=copy(fundedGame);damage(bad);assert.throws(()=>E.validateAgencySave(bad));checks++; }
// Standalone corporate/agency settlement is deliberately also exercised without
// unrelated bank AI work, allowing long accounting/capacity stress coverage.
function domainStep(g, tweak = () => {}, demand=1) {
  g.companyEconomy=E.CompanyFinance.step(g.companyEconomy,{demand});
  const plans=g.players.map((p,i)=>({groupPolicy:E.defaultGroupPlan(p),agencyPolicy:E.defaultAgencyPlan(p)}));
  plans.forEach((plan,i)=>tweak(plan,i));
  E.settleAgency(g,plans); g.cycle++;
  E.validateAgencySave(g); E.CompanyFinance.validate(g.companyEconomy);
}
const rivalry=funded(fresh());
domainStep(rivalry,(plan,i)=>Object.assign(plan.agencyPolicy,{launch:true,capital:120000,staff:1,target:'property',outreach:i?0:2}));
const contested=rivalry.agencyEconomy.relationships.find(r=>r.owner===rivalry.players[0].id);
assert(contested);
contested.remaining=1; contested.quality=20;
const challenger=rivalry.players[1],targetCompany=rivalry.companyEconomy.companies.find(c=>c.id===contested.companyId);
// A fixture of an already built, serviced local network; existing facility
// benefits are bid inputs, not resources granted by agency resolution.
challenger.branches[targetCompany.market]=3;
challenger.regionalOperations.markets[targetCompany.market].service=2;
assert(challenger.branches[targetCompany.market]<=3);
assert(challenger.regionalOperations.markets[targetCompany.market].service<=2);
domainStep(rivalry,(plan,i)=>Object.assign(plan.agencyPolicy,{staff:i?4:1,target:'property',outreach:i?2:0}));
assert.equal(contested.owner,challenger.id);
assert.equal(contested.remaining,12); assert.equal(contested.renewals,1);
assert(rivalry.players[0].agency.report.lost>0); checks++;
// Recurring support is opt-in and consumes only free parent cash; no emergency
// borrowing or automatic bank withdrawal is available to the subsidiary.
const supported=copy(fundedGame),supportOwner=supported.players[0];
const drain=supportOwner.agency.book.accounts.cash-1000;
E.agencyInvoice(supported,supportOwner,drain,'fixture.previousOperatingLoss'); E.agencyPayBills(supported,supportOwner);
const withoutSupport=copy(supported), bankCash=supportOwner.stats.cash, parentCash=supportOwner.financialGroup.parent.accounts.cash;
domainStep(supported,(plan,i)=>{if(!i)Object.assign(plan.agencyPolicy,{supportCap:10000,outreach:0});});
assert.equal(supportOwner.agency.status,'active'); assert.equal(supportOwner.agency.report.support,5000);
assert.equal(supportOwner.financialGroup.parent.accounts.cash,parentCash-5000); assert.equal(supportOwner.stats.cash,bankCash);
domainStep(withoutSupport,(plan,i)=>{if(!i)Object.assign(plan.agencyPolicy,{supportCap:0,outreach:0});});
assert.equal(withoutSupport.players[0].agency.status,'failed');
assert.equal(withoutSupport.players[0].stats.cash,bankCash); checks++;
const stressOutcomes=[];
for(const [label,demand,length] of [['normal',1,120],['regulatory stress',.5,480]]) {
  const campaign=funded(fresh());
  for(let i=0;i<length;i++) domainStep(campaign,(plan,seat)=>{
    if(!i)Object.assign(plan.agencyPolicy,{launch:true,capital:120000,staff:1,outreach:2,target:seat?'liability':'property'});
    else if(campaign.players[seat].agency.status==='active')Object.assign(plan.agencyPolicy,{outreach:1,target:i%3===0?'benefits':i%3===1?'property':'liability'});
  },demand);
  stressOutcomes.push({label,months:length,premiums:campaign.agencyEconomy.premiumPaid,
    commission:campaign.agencyEconomy.commissionPaid,failures:campaign.players.map(p=>p.agency.failures),
    closedCompanies:campaign.companyEconomy.companies.filter(c=>c.resolution).length});checks++;
}
const outcomes=[];
// Reachability uses an ordinary opening campaign, with no funding fixture.
// AI must earn distributable bank profit, fund its parent, and launch only on a
// subsequent turn from that parent's real cash using the player-visible rules.
const reachable=fresh(),launchMonths=[null,null];
for(let i=0;i<36&&!reachable.gameOver&&launchMonths.every(x=>x===null);i++) {
  const plans=reachable.players.map((p,seat)=>E.chooseBot(reachable,seat));
  E.submit(reachable,0,plans[0]);E.submit(reachable,1,plans[1]);months++;validate(reachable);
  reachable.players.forEach((p,seat)=>{if(p.agency.openedCycle&&!launchMonths[seat])launchMonths[seat]=p.agency.openedCycle;});
}
assert(launchMonths.some(x=>Number.isInteger(x)&&x>1),'An AI bank must reach agency launch through funded normal play');
for(const p of reachable.players)if(p.agency.openedCycle) {
  assert(p.financialGroup.parent.journal.some(e=>e.source==='dividend.bank'));
  assert.equal(p.financialGroup.investmentBasis.agency,120000);
}
checks++;
for (const scenario of ['balanced','rate','regulatory','growth']) {
  const campaign=funded(fresh(scenario));
  for(let i=0;i<24&&!campaign.gameOver;i++) resolve(campaign,(plan,seat)=>{
    if(i===0) Object.assign(plan.agencyPolicy,{launch:true,capital:120000,staff:1,outreach:2,target:seat?'liability':'property'});
  });
  outcomes.push({scenario,month:campaign.cycle-1,premiums:campaign.agencyEconomy.premiumPaid,
    commission:campaign.agencyEconomy.commissionPaid,failures:campaign.players.map(p=>p.agency.failures),
    closedCompanies:campaign.companyEconomy.companies.filter(c=>c.resolution).length});
  assert(campaign.agencyEconomy.premiumPaid>0);checks++;
}
console.log(JSON.stringify({suite:'staffed-insurance-agency',checks,fullEngineMonths:months,domainMonths:604,launchMonths,outcomes,stressOutcomes},null,2));
