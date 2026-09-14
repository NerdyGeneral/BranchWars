'use strict';
// Historical pre-credit fixture: select its named rules, not the latest edition.
const assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const copy=x=>JSON.parse(JSON.stringify(x));
function load(html,legacy=false){const c={},names='CompanyCreditBank,CompanyFinance,CorporateCirculation,withCorporateForecast,operate,settleCorporateEconomy,finishCorporateEconomy'+(legacy?'':',addCompanyCreditOperatingReport,prepareCompanyCreditOperatingForecast');vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('Object.assign(root.BWEngine,{CompanyCreditBank});','Object.assign(root.BWEngine,{'+names+'});'),c);return c.BWEngine;}
const E=load(require('../tools/build_game').assemble().html),F=E.CompanyFinance,B=E.CompanyCreditBank;
const reference=fs.readFileSync(path.join(__dirname,'../reports/reference-builds/BRANCH_WARS_creditorders59_1b4d0a59.html'));
assert.equal(createHash('sha256').update(reference).digest('hex'),'1b4d0a594e964ada574813fb88640c10cde2205c7a777cc5b4377b80d5e3b214');
const old=load(reference.toString(),true);
function fresh(seed='credit-forecast'){
 const g=E.createGame({...({...E.previewCampaignEdition({},'expanded').options,companyCreditVersion:0}),mode:'hotseat',seed,created:1});
 const plans=g.players.map((p,i)=>E.chooseBot(g,i));
 g.companyEconomy=F.withCredit(g.companyEconomy);g.players=g.players.map(p=>B.apply(p,g.companyEconomy,p.accounting));
 for(const [i,p]of g.players.entries()){
  const c=g.companyEconomy.companies[i],r=F.originateCredit(g.companyEconomy,g.players.map(p=>({id:p.id,book:p.accounting})),c.id,p.id,{principal:200000,months:48,annualRateBp:800,appetite:'balanced',product:E.CompanyCredit.assess(c).product});
  g.companyEconomy=r.world;g.players=g.players.map(p=>B.apply(p,r.world,r.banks.find(b=>b.id===p.id).book));
 }
 return {g,plans,sources:E.CorporateCirculation.IDS.map(id=>E.GroupAccounting.opening(id)),holder:E.GroupAccounting.opening('test:holder')};
}

test('owner-only advance scenarios preserve exact actual and historical origination postings across companies and terms',()=>{
 const g=E.createGame({...({...E.previewCampaignEdition({},'expanded').options,companyCreditVersion:0}),mode:'hotseat',seed:'advance-forecast',created:1}),world=F.withCredit(g.companyEconomy),banks=g.players.map(p=>({id:p.id,book:p.accounting})),before=JSON.stringify({world,banks});let checked=0;
 for(const c of world.companies)for(const months of [12,24,36,48]){
  const terms={principal:10000,months,annualRateBp:800,appetite:'balanced',product:E.CompanyCredit.assess(c).product};
  if(!E.CompanyCredit.quote(c,terms).eligible)continue;
  const actual=F.originateCredit(world,banks,c.id,banks[0].id,terms),prior=old.CompanyFinance.originateCredit(copy(world),copy(banks),c.id,banks[0].id,copy(terms)),preview=F.forecastCreditAdvance(world,c.id,banks[0].id,terms);
  assert.deepEqual(copy(actual),copy(prior));assert.deepEqual(copy(preview.world),copy(actual.world));
  assert.deepEqual(copy(preview.posting.changes),copy(actual.banks[0].book.journal.at(-1).changes));assert(!Object.hasOwn(preview,'banks'));checked++;
 }
 assert(checked>=12);assert.equal(JSON.stringify({world,banks}),before);
});

for(const demand of [1,.35])test('public-only forecasts match actual company/lender settlement and the preserved funding rules at demand '+demand,()=>{
 const s=fresh('forecast:'+demand);let {g,sources,holder}=s,closed=false;
 for(let month=1;month<=24;month++){
  const options={demand},before=JSON.stringify(g),banks=g.players.map(p=>({id:p.id,book:p.accounting})),
   actual=F.step(g.companyEconomy,{...options,banks}),prior=old.CompanyFinance.step(copy(g.companyEconomy),{...options,banks:copy(banks)}),
   forecast=F.forecast(g.companyEconomy,options);
  assert.equal(JSON.stringify(g),before);assert.deepEqual(copy(actual),copy(prior),'Extracting borrower settlement must not change paid claims, priority or prices');
  assert.deepEqual(copy(forecast.world),copy(actual.world));assert.deepEqual(copy(forecast.creditReport),copy(actual.creditReport));
  assert(!Object.hasOwn(forecast,'banks'),'No private lender ledgers in the public forecast');
  for(const p of g.players){
   const own=B.forecast(p,g.companyEconomy,options),book=actual.banks.find(b=>b.id===p.id).book;
   assert.deepEqual(copy(own.owner.accounting),copy(book));assert.deepEqual(copy(own.flow),copy(B.movements(p.accounting,book)));
   assert(own.report.every(r=>r.bankId===p.id));B.validate(own.owner,actual.world);
  }
  g.players=g.players.map(p=>B.apply(p,actual.world,actual.banks.find(b=>b.id===p.id).book));
  const circulated=E.CorporateCirculation.step(actual.world,sources),routed=F.payShareholder(circulated.world,holder,0);
  g.companyEconomy=routed.world;sources=circulated.sources;holder=routed.recipient;g.cycle++;
  closed||=g.companyEconomy.companies.some(c=>c.resolution?.creditWriteoff>0);
 }
 if(demand<1)assert(closed,'Stress must compare actual recovery and writeoff, not just healthy repayments');
});

test('forecast rejects malformed metadata and cannot accept a private bank context as an alternative',()=>{
 const {g}=fresh(),before=JSON.stringify(g);
 assert.throws(()=>F.forecast(g.companyEconomy,{demand:1,banks:g.players.map(p=>({id:p.id,book:p.accounting}))}),/demand/);
 assert.throws(()=>F.forecast({...g.companyEconomy,version:6},{demand:1}),/explicit/);
 const stale=copy(g.companyEconomy);stale.credit.month++;
 assert.throws(()=>F.forecast(stale,{demand:1}));
 assert.throws(()=>F.step(g.companyEconomy,{demand:1}),/demand/,'Actual settlement still requires real lender ledgers');
 assert.equal(JSON.stringify(g),before);
});

test('the monthly company adapter posts loans once and the operating report bridge does not post cash again',()=>{
 const {g}=fresh(),before=copy(g.players),preview=g.players.map(p=>B.forecast(p,g.companyEconomy,{demand:g.economy.demand,services:E.corporateStatement(g).services}));
 E.settleCorporateEconomy(g);
 for(const [i,p]of g.players.entries()){
  assert.deepEqual(copy(p.accounting),copy(preview[i].owner.accounting));
  const book=JSON.stringify(p.accounting),r={loanIncome:100,chargeoff:20,profit:80,loanGrowth:500},f=p._companyCreditPayment;
  E.addCompanyCreditOperatingReport(p,r);
  assert.equal(JSON.stringify(p.accounting),book,'Reporting must not repost settled cash or equity');
  assert.equal(r.loanIncome,100+f.interest);assert.equal(r.profit,80+f.interest-f.principalWrittenOff-f.interestWrittenOff);
  assert.equal(r.loanGrowth,500-f.principalPaid-f.recoveredPrincipal-f.principalWrittenOff);
  assert.equal(p.stats.cash-before[i].stats.cash,f.principalPaid+f.interestPaid+f.recoveredPrincipal+f.recoveredInterest);
  const reported=JSON.stringify({p,r});assert.throws(()=>E.addCompanyCreditOperatingReport(p,r),/already included/);assert.equal(JSON.stringify({p,r}),reported);
 }
 assert.throws(()=>E.settleCorporateEconomy(g),/already reserved/);
});

test('operating forecasts prepare only the owner book and do not need the rival ledger or submitted plan',()=>{
 const {g}=fresh(),p=copy(g.players[0]),statement=E.corporateStatement(g);p.companySnapshot=statement;
 const before=JSON.stringify({g,p}),preview=copy(p);
 E.prepareCompanyCreditOperatingForecast({economy:g.economy},preview);
 const expected=B.forecast(p,statement.world,{demand:g.economy.demand,services:statement.services});
 assert.deepEqual(copy(preview.accounting),copy(expected.owner.accounting));
 assert.deepEqual(copy(preview._companyCreditPayment),copy(expected.flow));
 assert.equal(JSON.stringify({g,p}),before);
 assert.throws(()=>E.prepareCompanyCreditOperatingForecast({economy:g.economy},preview),/already prepared/);
});

test('the complete prepared operating forecast includes company coupons and repayments without mutating the campaign',()=>{
 const {g,plans}=fresh(),owner={...copy(g.players[0]),marketSnapshot:copy(g.marketEconomy),companySnapshot:E.corporateStatement(g)},before=JSON.stringify({g,plans,owner});
 // Explicit owner-view fixture until versioned public-state enablement lands.
 // These are the existing projection's public company and market statements.
 const forecast=E.operatingPreview(owner,plans[0],g.economy,g,true);
 assert.equal(forecast.companyCredit.interest,1333);assert.equal(forecast.companyCredit.principalPaid,4167);
 assert(forecast.loanIncome>=forecast.companyCredit.interest);
 assert.equal(forecast.commercial.companyLoans,195833);assert.equal(forecast.commercial.companyLoanGrowth,-4167);
 assert(forecast.commercial.businessLoans>=forecast.commercial.companyLoans,'The business-loan total must include named-company claims');
 assert(Number.isFinite(forecast.profit));assert(Number.isFinite(forecast.capitalRatio));
 assert.equal(JSON.stringify({g,plans,owner}),before);
 assert.deepEqual(copy(forecast),copy(E.operatingPreview(owner,plans[0],g.economy,g,true)));
});

test('actual monthly banking operations include posted company interest once and clear transient settlement state',()=>{
 const {g}=fresh(),before=g.players.map(p=>({earnings:p.accounting.retainedEarnings,sequence:p.accounting.sequence}));
 E.settleCorporateEconomy(g);
 for(const p of g.players)E.operate(g,p,false);
 for(const [i,p]of g.players.entries()){
  const r=p.operatingReport,entries=p.accounting.journal.filter(e=>e.id>before[i].sequence&&e.source==='companyCredit.interest');
  assert.equal(entries.length,1);assert.equal(entries[0].earnings,r.companyCredit.interest);
  assert.equal(Math.round(r.loanIncome-r.companyCredit.interest),E.creditSummary(p).monthlyInterest);
  const outsideLosses=(r.fundingLoss||0)+(r.householdFundingLoss||0)+(r.termDepartureFundingLoss||0);
  assert.equal(p.accounting.retainedEarnings-before[i].earnings,r.profit-outsideLosses,'Reported company earnings cannot be posted a second time as ordinary cash income');
  B.validate(p,g.companyEconomy);assert.equal(p.stats.lastProfit,r.profit);
 }
 E.finishCorporateEconomy(g);
 for(const p of g.players){assert.equal(p._companyCreditPayment,undefined);assert.equal(p._companyCreditOrigination,undefined);assert.equal(p._companyCreditFunded,undefined);assert.equal(p._companyCreditReportApplied,undefined);}
});
