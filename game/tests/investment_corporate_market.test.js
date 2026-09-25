'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),context={},copy=x=>JSON.parse(JSON.stringify(x));
const sources=['src/engine/accounting.js','src/engine/group-accounting.js','src/engine/company-finance.js','src/engine/corporate-circulation.js',
 'src/engine/investment-institution.js','src/engine/investment-clients.js','src/engine/investment-settlement.js','src/engine/investment-corporate-market.js'];
vm.runInNewContext(sources.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n')+
 '\nthis.A=GroupAccounting;this.F=CompanyFinance;this.R=CorporateCirculation;this.I=InvestmentInstitution;this.C=InvestmentClients;this.S=InvestmentSettlement;this.M=InvestmentCorporateMarket;',context);
const {A,F,R,I,C,S,M}=context;let checks=0,months=0;
const profiles=Array.from({length:6},(_,i)=>({market:'market-'+i,baseFee:[18000,30000,50000][i%3]}));
const emptySources=()=>R.IDS.map(id=>A.opening(id));
const companies=()=>R.opening(F.withAgency(F.opening(profiles)));
function test(name,fn){if(require.main!==module)return;fn();checks++;console.log('PASS '+name);}
const same=(a,b)=>assert.deepEqual(copy(a),copy(b));
function fixture(positions=Array.from({length:9},(_,i)=>({id:'test-existing-position:'+i,market:'market-0',service:'advice',units:10000,custodian:'atlas'}))){
 const company=companies();
 const r=M.opening(company,positions,2000000);
 const parents=['a','b'].map(id=>A.post(A.opening(id+':parent'),'fixture.fixedParentCapital','fixture',{cash:2000000,equity:2000000}));
 return {company:r.company,world:r.world,parents,entities:['a','b'].map(id=>I.opening(id)),supplier:A.opening('investment:suppliers'),sources:emptySources(),openingCash:company.openingCash+4000000};
}
const cash=w=>F.validate(w.company).cash+w.world.dealer.accounts.cash+w.world.clients.reduce((n,c)=>n+c.cash,0)+w.parents.reduce((n,b)=>n+b.accounts.cash,0)+w.entities.reduce((n,e)=>n+e.book.accounts.cash,0)+w.supplier.accounts.cash;
function advance(w,changes=[{},{}],demand=1,price=100){
 const before=JSON.stringify(w),company=F.step(w.company,{demand}),flow=R.step(company,w.sources);
 const plans=w.entities.map((e,i)=>({...I.defaults(e),...changes[i]})),offers=w.entities.map((e,i)=>({owner:e.owner,market:'market-0',reputation:80,pursue:i===0}));
 const next=S.advance({...w,company:flow.world,sources:flow.sources},plans,offers,price);months++;
 M.validate(next.company,next.world,next.entities);assert.equal(JSON.stringify(w),before);
 // Company service fees leave this test boundary for the bank, rather than
 // being counted as vanished money or silently given back to the companies.
 assert.equal(cash(next)+next.company.bankCashPaid.reduce((a,b)=>a+b,0),next.openingCash);
 return next;
}
const advice={launch:true,capital:700000,roles:{adviser:1,broker:0,principal:0,operations:1}};
test('dealer capital comes out of the actual corporate customer pool only once',()=>{
 const original=companies(),before=JSON.stringify(original),r=M.opening(original,[],2000000);
 assert.equal(JSON.stringify(original),before);assert.equal(original.outside.accounts.cash-r.company.outside.accounts.cash,2000000);
 assert.equal(r.world.dealer.accounts.cash,2000000);assert.equal(r.company.outside.accounts.investments,2000000);
 assert.equal(r.company.openingCash,original.openingCash);assert.equal(F.validate(r.company).cash+r.world.dealer.accounts.cash,F.validate(original).cash);
 assert.throws(()=>F.fundInvestmentDealer(r.company,A.opening('investment:dealer'),2000000),/formation/);
 assert.throws(()=>M.opening(original,[],original.outside.accounts.cash+1),/formation/);
 assert.throws(()=>F.withInvestmentMarket(F.step(original,{demand:1})),/creation/);
});
test('existing company sales, debt and expenses use the same pool as securities trades',()=>{
 let w=advance(fixture(),[advice,{}]);for(let n=0;n<5;n++)w=advance(w);
 assert(w.world.dealerUnits>0);
 const before=JSON.stringify(w),available=w.company.outside.accounts.cash;
 const t=M.trade(w.company,w.world,w.entities,'buy',Math.floor(available/200));
 assert(t.paid>0);assert.equal(JSON.stringify(w),before);
 assert.equal(t.company.outside.accounts.cash,available-t.paid);assert.equal(t.company.investmentMarket.basis,t.paid);
 w={...w,company:t.company,world:t.world};assert.equal(cash(w)+w.company.bankCashPaid.reduce((a,b)=>a+b,0),w.openingCash);
 const untraded=F.step(JSON.parse(before).company,{demand:1});w=advance(w);
 assert.notEqual(w.company.outside.accounts.cash,untraded.outside.accounts.cash,'Trading cash must not be restored on the next company month');
 const holding=w.company.investmentMarket.units;
 w=advance(w,[{},{}],1,80);
 const sold=M.trade(w.company,w.world,w.entities,'sell',holding*80);
 assert.equal(sold.units,holding);assert.equal(sold.realized,-holding*20);assert.equal(sold.company.investmentMarket.basis,0);
 M.validate(sold.company,sold.world,w.entities);
 const next=advance({...w,company:sold.company,world:sold.world});same(next,advance(copy({...w,company:sold.company,world:sold.world})));
});
test('paired boundary rejects forged transfer metadata and mixing different snapshots',()=>{
 let w=advance(fixture(),[advice,{}]);for(let n=0;n<3;n++)w=advance(w);
 const t=M.trade(w.company,w.world,w.entities,'buy',100000),before=JSON.stringify(w);
 assert.throws(()=>M.validate(w.company,t.world,w.entities),/disagree/);
 assert.throws(()=>F.recordInvestmentTrade(w.company,'buy',t.units,100,w.company.outside),/paired/);
 assert.throws(()=>F.recordInvestmentTrade(w.company,'sell',1,100,w.company.outside),/securities/);
 const bad=copy(w.company);bad.investmentMarket.cashNet++;assert.throws(()=>F.validate(bad),/conserved/);
 const wrong=copy(w.world);wrong.outsideBasis++;assert.throws(()=>M.validate(w.company,wrong,w.entities));
 assert.equal(JSON.stringify(w),before);
});
test('corporate defaults do not write off unrelated owned securities',()=>{
 let w=advance(fixture(),[advice,{}]);for(let n=0;n<3;n++)w=advance(w);
 const bought=M.trade(w.company,w.world,w.entities,'buy',100000);
 w={...w,company:bought.company,world:bought.world};const basis=w.company.investmentMarket.basis;
 assert(basis>0);for(let n=0;n<60&&!w.company.companies.every(c=>c.resolution);n++)w=advance(w,[{},{}],0);
 assert(w.company.companies.every(c=>c.resolution));assert.equal(w.company.investmentMarket.basis,basis);
 assert.equal(w.company.outside.accounts.businessAssets,w.company.recoveredAssets+basis);
 M.validate(w.company,w.world,w.entities);
});
test('unfunded version-five boundary does not change version-four company economics',()=>{
 let old=companies(),next=F.withInvestmentMarket(old),sources=emptySources();
 for(let n=0;n<24;n++){
  const demand=n%8<4?.7:1.2,a=R.step(F.step(old,{demand}),sources),b=R.step(F.step(next,{demand}),sources);
  old=a.world;next=b.world;const comparable=copy(next);delete comparable.investmentMarket;comparable.version=4;same(comparable,old);months++;
 }
});
test('historical corporate versions match the immutable production engine exactly',()=>{
 const bytes=fs.readFileSync(path.join(root,'reports/reference-builds/BRANCH_WARS_suites1_5cc991f7.html'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'5cc991f75a30357f9d359f43410be3680f2011b8337211de2989eed8216602f7');
 const baseline={console},script=bytes.toString().match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
 assert(script.includes('root.BWEngine={'));
 // Expose private domains for differential testing only; source bytes above
 // remain pinned and unchanged. Do not replace their implementation.
 vm.runInNewContext(script.replace('root.BWEngine={','root.testCompany=CompanyFinance;root.testCirculation=CorporateCirculation;root.BWEngine={'),baseline);
 const old=baseline.testCompany,oldCirculation=baseline.testCirculation;
 for(const version of [2,3,4]){
  let a=old.opening(profiles),b=F.opening(profiles);
  if(version>=3){a=old.withAgency(a);b=F.withAgency(b);}
  if(version===4){a=oldCirculation.opening(a);b=R.opening(b);}
  same(a,b);
  for(let n=0;n<24;n++){const demand=n%6<3?.5:1.4;a=old.step(a,{demand});b=F.step(b,{demand});
   if(version===4){a=oldCirculation.step(a,emptySources()).world;b=R.step(b,emptySources()).world;}
   if(version>=3&&!a.companies[0].resolution){const carrier=A.opening('agency:carriers'),premium=Math.min(1000,a.companies[0].book.accounts.cash);a=old.payAgencyPremium(a,0,carrier,premium).world;b=F.payAgencyPremium(b,0,carrier,premium).world;}
   same(a,b);months++;}
 }
});
test('current campaigns cannot silently adopt the unfinished investment rules',()=>{
 const c={console},html=require('../tools/build_game').assemble().html;
 vm.runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],c);
 const E=c.BWEngine,g=E.createGame({...E.previewFeatureSelection({}, {field:'facilityExtensionsVersion',value:1}).options,seed:'investment-boundary',created:1});
 const before=JSON.stringify(g),bad=copy(g);bad.companyEconomy=F.withInvestmentMarket(bad.companyEconomy);
 assert.throws(()=>E.migrateCampaign(bad),/Company rules do not match/);
 assert.equal(JSON.stringify(g),before);assert.equal(g.companyEconomy.version,4);assert.equal(g.investmentServicesVersion,undefined);
});
if(require.main===module)console.log(JSON.stringify({status:'PASS',checks,months,scope:'Actual corporate pool and investment domain; existing campaign boundaries remain closed to the unfinished feature.'}));
module.exports={fixture,advance,M,F,C,I,cash};
