'use strict';
// Connected economic-domain control, not ordinary-AI or full-campaign balance.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {fixture,advance,M}=require('../tests/investment_corporate_market.test');
const {advice,brokerage,owned}=require('../tests/investment_clients.test');
const root=path.resolve(__dirname,'..'),files=['src/engine/group-accounting.js','src/engine/company-finance.js','src/engine/corporate-circulation.js',
 'src/engine/investment-institution.js','src/engine/investment-clients.js','src/engine/investment-settlement.js','src/engine/investment-corporate-market.js',
 'tests/investment_corporate_market.test.js','tools/balance_investment_corporate.js'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
const sourceSha256=hashes(),cases=[],started=performance.now();
const positions=Array.from({length:270},(_,i)=>({id:'declared-control-position:'+i,market:'market-0',service:i%3===0?'brokerage':'advice',units:i%3===0?4000:1500,custodian:i%2?'atlas':'harbor'}));
for(const [route,launch]of Object.entries({advice,brokerage,owned})){
 let w=fixture(positions),failure=null;const samples=[],begin=performance.now();
 try{for(let month=1;month<=120;month++){
  w=advance(w,[month===1?launch:{},{}]);
  const t=M.trade(w.company,w.world,w.entities,'buy',Math.floor(w.company.outside.accounts.cash/200));
  w={...w,company:t.company,world:t.world};M.validate(w.company,w.world,w.entities);
  if(month%12===0){const e=w.entities[0],r=w.world.reports[0];samples.push({month,status:e.status,closure:e.closure,
   clients:w.world.clients.filter(c=>c.owner==='a').length,aum:r.aum,cash:e.book.accounts.cash,
   retained:w.parents[0].retainedEarnings+e.book.retainedEarnings,fees:r.fees,unpaidFees:r.unpaidFees,
   monthlyMargin:r.fees-r.providerCost-(e.report?.recurring||0),dealerCash:w.world.dealer.accounts.cash,
   outsideCash:w.company.outside.accounts.cash,securityBasis:w.company.investmentMarket.basis,
   companyClosures:w.company.companies.filter(c=>c.resolution).length});}
 }}catch(error){failure=error.stack;}
 const result={route,months:w.world.month,elapsedMs:Math.round(performance.now()-begin),failure,samples};cases.push(result);
 console.log(JSON.stringify({route,months:result.months,failure,last:samples.at(-1)}));
}
const endSourceSha256=hashes(),report={sourceSha256,endSourceSha256,unchanged:JSON.stringify(sourceSha256)===JSON.stringify(endSourceSha256),
 elapsedMs:Math.round(performance.now()-started),scope:'Three fixed-policy 120-month connected economic controls. Existing CompanyFinance outside cash funds $2M dealer capital once and spends up to 0.5% of its actual remaining cash on available securities after company operations. Original company sales, expenses, debt and circulation continue. The 270 investment positions and parent capitals are declared fixtures, not mapped live campaign customers. No ordinary AI, bank deposit conversions, sweeps, multiplayer or release acceptance.',cases};
fs.mkdirSync(path.join(root,'output'),{recursive:true});
fs.writeFileSync(path.join(root,'output/investment-corporate-balance.json'),JSON.stringify(report,null,2)+'\n');
assert(report.unchanged,'Tested sources changed during the run');if(cases.some(c=>c.failure))process.exitCode=1;
