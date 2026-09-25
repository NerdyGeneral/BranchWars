'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),ctx={console};
vm.runInNewContext(fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8').match(/<script id="engine">([\s\S]*?)<\/script>/)[1]
 .replace('root.BWEngine={','root.BWEngine={CompanyFinance,corporateServiceInstructions,settleCorporateEconomy,finishCorporateEconomy,operate,syncServiceBook,syncAccounts,riskAssets,withCorporateForecast,'),ctx);
const E=ctx.BWEngine,options=E.previewFeatureSelection({}, {field:'financialGroupVersion',value:2}).options;
const fresh=extra=>E.createGame({...options,mode:'hotseat',seed:'corporate-income',created:1,...extra});
const same=(a,b)=>assert.deepEqual(copy(a),copy(b));
let checks=0,months=0;const results=[];
function valid(g){E.validatePilot(g);E.validateLedger(g);for(const seat of [0,1])E.validateFinancialGroupView(E.publicState(g,seat));}
function signed(g){
 for(const [i,c]of g.serviceAgreements.entries()){
  // Fixture of a previously won public mandate; no financial resources added.
  c.owner=g.players[i%2].id;
  g.relationshipRecords[c.id].owner=c.owner;
 }
 for(const p of g.players){p.allocation={service:1,business:5,lending:1,operations:1};
  p.serviceDesk.policy.staff=5;p.serviceDesk.policy.outsourcing=4;
  p.serviceDesk.applications.treasury='partner';p.serviceDesk.policy.treasury=true;}
 E.syncServiceBook(g);
}
const created=fresh();valid(created);assert.equal(created.version,'9.1');
assert(created.players.every(p=>p.accounting.version===2&&p.accounting.accounts.receivables===0));
const old=E.createGame({...options,financialGroupVersion:1,seed:1,created:1});assert.equal(old.version,'9.0');
assert.equal(old.companyEconomy,undefined);assert(old.players.every(p=>p.accounting.version===1));checks++;
assert.equal(E.peerRulesIssue(E.validateCampaignRules(created,'game'),E.campaignCapabilities()),null);
assert.equal(E.peerRulesIssue(E.validateCampaignRules(created,'game'),{...E.campaignCapabilities(),financialGroupSupported:1}).field,'financialGroupVersion');checks++;
// Authoritative company settlement and real bank operations, with fixed signed
// books to isolate credit exposure independently from bidding outcomes.
for(const [name,demand]of [['normal',1],['stress',.5]]){
 const g=fresh();signed(g);let billed=0,paid=0,losses=0,recoveries=0,maxAR=0;
 for(let m=0;m<120;m++){
  g.economy.demand=demand;
  const before=g.players.map(p=>copy(p.accounting)),worldBefore=JSON.stringify(g.companyEconomy);
  const expected=E.CompanyFinance.step(g.companyEconomy,{demand,services:E.corporateServiceInstructions(g)});
  if(m%24===0){
   const plans=E.withCorporateForecast(g,()=>g.players.map((p,i)=>E.chooseBot(g,i)));
   const owner=E.publicState(g,0).me,pure=JSON.stringify(owner),campaignBefore=JSON.stringify(g);
   const quote=E.operatingPreview(owner,plans[0],g.economy);
   assert(Number.isFinite(quote.profit));assert.equal(JSON.stringify(owner),pure);assert.equal(JSON.stringify(g),campaignBefore);
  }
  E.settleCorporateEconomy(g);same(g.companyEconomy,expected);
  assert.throws(()=>E.settleCorporateEconomy(g),/already reserved/);
  for(const [i,p]of g.players.entries()){
   E.operate(g,p,false);
   const f=expected.bankFlows[i];billed+=f.billed;paid+=f.cash;losses+=f.writtenOff;recoveries+=f.recovered;
   assert.equal(p.operatingReport.contractFees,f.billed);
   assert.equal(p.operatingReport.corporateInvoiceLoss,f.writtenOff);
   assert.equal(p.accounting.accounts.receivables,before[i].accounts.receivables+f.receivable-f.recovered-f.writtenOff);
   assert.equal(p.accounting.accounts.receivables,expected.companies.reduce((n,c)=>n+c.bankArrears[i],0));
   maxAR=Math.max(maxAR,p.accounting.accounts.receivables);
   const receivableEntry=p.accounting.journal.findLast(e=>e.source==='corporate.receivables');
   if(f.receivable||f.recovered||f.writtenOff){
    assert.equal(receivableEntry.changes.cash||0,f.recovered);
    assert.equal(receivableEntry.earnings,f.receivable-f.writtenOff);
   }
   E.AccountingPrototype.restore(E.AccountingPrototype.snapshot(p.accounting,96));
   const noAR=copy(p);noAR.accounting.accounts.receivables=0;
   assert.equal(E.riskAssets(p)-E.riskAssets(noAR),p.accounting.accounts.receivables);
  }
  E.finishCorporateEconomy(g);g.cycle++;months++;
  for(const c of g.serviceAgreements)if(c.companyClosed)assert.equal(E.serviceBidStatus(g.players[0],c).eligible,false);
  assert.notEqual(JSON.stringify(g.companyEconomy),worldBefore);
  assert.equal(E.CompanyFinance.validate(g.companyEconomy).cash+g.companyEconomy.bankCashPaid.reduce((a,b)=>a+b,0),g.companyEconomy.openingCash);
 }
 results.push({name,months:120,billed,paid,losses,recoveries,maxAR,closed:g.companyEconomy.companies.filter(c=>c.resolution).length});checks++;
}
assert(results.find(r=>r.name==='normal').paid>0);
assert(results.find(r=>r.name==='stress').losses>0);
assert(results.find(r=>r.name==='stress').recoveries>0);checks++;
// Full monthly resolution, not just boundary helpers: simultaneous submission,
// all ordinary competition, private projections, ledger and resume/rematch.
for(const scenario of ['balanced','rate','regulatory','growth']){
 let g=fresh({scenario,seed:'live:'+scenario});let cash=0;
 for(let m=0;m<12&&!g.gameOver;m++){
  const before=copy(g),plans=g.players.map((p,i)=>E.chooseBot(g,i));
  // AI advances its documented planning RNG, but cannot mutate company books.
  same(g.companyEconomy,before.companyEconomy);
  same(g.players,before.players);
  const reversed=copy(g);E.submit(g,0,plans[0]);const resumed=E.migrateCampaign(copy(g));
  E.submit(g,1,plans[1]);E.submit(resumed,1,copy(plans[1]));
  E.submit(reversed,1,copy(plans[1]));E.submit(reversed,0,copy(plans[0]));
  valid(g);valid(resumed);valid(reversed);same(E.migrateCampaign(g),E.migrateCampaign(resumed));same(E.migrateCampaign(g),E.migrateCampaign(reversed));
  cash=g.companyEconomy.bankCashPaid.reduce((a,b)=>a+b,0);months++;
 }
 assert(g.eventLedger.some(e=>e.category==='companies.settlement'));
 const view=E.publicState(g,1);assert.equal(view.rival.corporate,undefined);assert.equal(view.rival.companySnapshot,undefined);
 assert(view.me.companySnapshot.world.companies.every(c=>c.book.journal.length===0));
 const clean=JSON.stringify(view),sealed=copy(g);
 sealed.players[0].submitted={secret:'unpublished plan'};
 same(E.publicState(sealed,1).me.companySnapshot,view.me.companySnapshot);
 assert.equal(JSON.stringify(view),clean);
 const again=copy(g);g.gameOver=true;E.rematch(g,0);E.rematch(g,1);valid(g);
 assert.equal(g.version,'9.1');assert.equal(g.companyEconomy.month,0);
 assert(g.players.every(p=>p.accounting.accounts.receivables===0));
 results.push({scenario,fullResolutionMonths:again.cycle-1,bankCashPaid:cash});checks++;
}
for(const damage of [
 g=>delete g.companyEconomy,g=>g.companyEconomy.month++,g=>g.companyEconomy.companies[0].market='unknown',
 g=>g.players[0].corporate.index=1,g=>g.players[0].companySnapshot={},g=>g.players[0]._corporatePayment={},
 g=>g.serviceAgreements[0].companyClosed=true,g=>g.financialGroupVersion=1,g=>g.version='9.0'
]){
 const bad=copy(created);damage(bad);const before=JSON.stringify(bad);assert.throws(()=>E.migrateCampaign(bad));assert.equal(JSON.stringify(bad),before);checks++;
}
for(const damage of [
 v=>v.me.companySnapshot.world.month++,v=>v.me.companySnapshot.services[0].provider=8,
 v=>v.rival.corporate=copy(v.me.corporate),v=>delete v.me.companySnapshot,v=>v.me.corporate.report={},
 v=>v.me.companySnapshot.world.companies[0].market='unknown'
]){
 const bad=E.publicState(created,0);damage(bad);assert.throws(()=>E.validateFinancialGroupView(bad));checks++;
}
console.log(JSON.stringify({passed:true,checks,months,results,scope:'Live rules-2 corporate fees, bank receivables and defaults; subsidiaries and shares not implemented by this batch.'}));
