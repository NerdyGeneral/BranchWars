'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const ctx={console};vm.runInNewContext(['accounting','group-accounting','company-finance','corporate-circulation'].map(name=>fs.readFileSync(path.join(root,'src/engine',name+'.js'),'utf8')).join('\n')+'\nthis.QA={G:GroupAccounting,C:CompanyFinance,R:CorporateCirculation};',ctx);
const {G,C,R}=ctx.QA,profiles=[18000,30000,50000,28000,40000,30000].map((baseFee,i)=>({market:'market-'+i,baseFee}));
const opening=C.withAgency(C.opening(profiles)),newOpening=R.opening(opening);
const outside=()=>R.IDS.map(id=>G.opening(id));
assert.equal(opening.version,3);assert.equal(newOpening.version,4);
assert.equal(C.validate(opening).cash,C.validate(newOpening).cash,'Opting in does not inject resources');
assert.throws(()=>R.opening(newOpening));assert.throws(()=>R.step(newOpening,outside()));
let month=C.step(newOpening,{demand:1}),sources=outside();
// An actual premium transfers existing company cash to the carrier before it
// can spend. The other four empty providers cannot manufacture any demand.
const premium=C.payAgencyPremium(month,0,sources[0],4500);month=premium.world;sources[0]=premium.carrier;
const saved=JSON.stringify([month,sources]),result=R.step(month,sources);
assert.equal(JSON.stringify([month,sources]),saved,'Pure atomic proposal');
assert.equal(result.payments[0],90);assert(result.payments.slice(1).every(n=>n===0));
assert.equal(result.sources[0].accounts.cash,4410);
assert.equal(result.world.outside.accounts.cash-month.outside.accounts.cash,result.external+result.creditor);
assert.equal(result.world.circulation.externalReturned,90);
assert.equal(result.world.bankCashPaid[0],month.bankCashPaid[0]);
assert.deepEqual(copy(result.world.companies),copy(month.companies),'No grants, customer creation, or company report rewrites');
assert.throws(()=>R.step(result.world,result.sources),'Duplicate settlement is refused');
const wrong=outside();wrong[0]=G.opening('bank:A');assert.throws(()=>R.step(month,wrong));
const broken=copy(result.world);broken.circulation.externalReturned++;assert.throws(()=>C.validate(broken));
const report=[];
for(const [scenario,demand]of Object.entries({balanced:()=>1,growth:()=>1.25,contraction:()=>.5,cycle:m=>m%48<12?.65:1.1})){
 const summaries=[];
 for(const modular of [false,true]){
  let world=copy(modular?newOpening:opening),books=outside(),paid=0,returned=0,limitedMonths=0;
  for(let m=1;m<=480;m++){
   world=C.step(world,{demand:demand(m)});
   limitedMonths+=Number(world.companies.some(c=>c.report.cashLimited));
   for(const [i,c]of world.companies.entries())if(!c.resolution){
    // Commercial covers have the existing combined .75F premium rate. Paying
    // them is conditional on actual company cash; no loan or hidden refill.
    const amount=Math.min(c.book.accounts.cash,Math.round(c.baseFee*.75));
    if(amount){const p=C.payAgencyPremium(world,i,books[0],amount);world=p.world;books[0]=p.carrier;paid+=amount;}
   }
   if(modular){const r=R.step(world,books);world=r.world;books=r.sources;returned+=r.external;}
   C.validate(world);books.forEach(G.validate);
   const total=[world.outside,world.creditor,...world.companies.map(c=>c.book),...books].reduce((n,b)=>n+BigInt(b.accounts.cash),0n);
   assert.equal(total,BigInt(world.openingCash),'All closing cash has an opening source');
   assert.equal(books[0].accounts.cash,paid-returned);
  }
  summaries.push({circulation:modular,active:world.companies.filter(c=>!c.resolution).length,
   outsideCash:world.outside.accounts.cash,premiums:paid,returned,carrierCash:books[0].accounts.cash,limitedMonths});
 }
 console.log(JSON.stringify({scenario,summaries}));
 if(scenario==='balanced'){
  // This isolated case has no fees exported to banks, unlike the full-game
  // Regulatory failure. Characterize constrained demand, not forced liquidation.
  assert(summaries[0].limitedMonths>0,'Baseline must expose finite demand constraints');
  assert(summaries[1].outsideCash>summaries[0].outsideCash);
  assert(summaries[1].premiums>summaries[0].premiums);
  assert.equal(summaries[1].active,6,'Funded recirculation sustains viable companies in this fixed-demand fixture');
 }
 if(scenario==='contraction')assert(summaries[1].active<6,'Real credit losses and company failures must remain possible');
 report.push({scenario,summaries});
}
console.log(JSON.stringify({suite:'v31-circulation',status:'PASS',months:3840,report,
 limits:'Pure six-company boundary scenarios with actual funded premiums; not full-bank AI, market or multiplayer acceptance.'}));
