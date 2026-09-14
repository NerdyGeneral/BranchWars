'use strict';
// Isolated design controls, not ordinary-AI or full-game release balance.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{performance}=require('node:perf_hooks');
const {fixture,tick,advice,brokerage,owned,A,C,totalCash}=require('../tests/investment_clients.test'),assert=require('node:assert/strict');
const outsideTrades=process.argv.includes('--outside-trades');
const closure=process.argv.includes('--closure'),advance=closure?require('../tests/investment_closure.test').advance:tick;
const root=path.resolve(__dirname,'..'),sources=['src/engine/investment-institution.js','src/engine/investment-clients.js','src/engine/investment-settlement.js','tests/investment_clients.test.js','tests/investment_closure.test.js','tools/balance_investment_services.js'];
const digests=()=>Object.fromEntries(sources.map(f=>[f,createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
const hashes=digests(),cases=[],started=performance.now();
for(const dealerCash of outsideTrades||closure?[2000000]:[2000000,8000000])for(const [route,launch]of Object.entries({advice,brokerage,owned})){
 let w=fixture(270,dealerCash),failure=null;const samples=[],begin=performance.now();
 let outside=A.post(A.opening('corporate:outside'),'fixture.fixedOutsideCapital','fixture',{cash:24000000,equity:24000000});
 try{for(let month=1;month<=120;month++){
  w=advance(w,[month===1?launch:{},{}]);
  if(outsideTrades){const traded=C.tradeOutside(w.world,w.entities,outside,'buy',Math.floor(outside.accounts.cash/200));
   w.world=traded.world;outside=traded.investor;assert.equal(totalCash(w)+outside.accounts.cash,w.openingCash+24000000);
   assert.equal(outside.accounts.businessAssets,w.world.outsideBasis);}
  if(month%12===0){const r=w.world.reports[0],e=w.entities[0];samples.push({month,clients:w.world.clients.filter(c=>c.owner==='a').length,aum:r.aum,
   status:e.status,closure:e.closure,cash:e.book.accounts.cash,equity:e.book.accounts.equity,payables:e.book.accounts.payables,retained:e.book.retainedEarnings,
   parentRetained:w.parents[0].retainedEarnings,combinedRetained:w.parents[0].retainedEarnings+e.book.retainedEarnings,
   fees:r.fees,unpaidFees:r.unpaidFees,providerCost:r.providerCost,fixedExpense:e.report?.recurring||0,margin:r.fees-r.providerCost-(e.report?.recurring||0),
   dealerCash:w.world.dealer.accounts.cash,outsideCash:outside.accounts.cash,outsideSecurityBasis:w.world.outsideBasis,served:r.serviced,permission:!!e.report?.permitted[route==='advice'?'advice':'brokerage']});}
 }}catch(error){failure=error.stack;}
 const result={route,dealerOpeningCash:dealerCash,months:w.world.month,elapsedMs:Math.round(performance.now()-begin),failure,samples};cases.push(result);
 console.log(JSON.stringify({route,dealerCash,completed:w.world.month,failure,last:samples.at(-1)}));
}
const report={sourceSha256:hashes,endSourceSha256:digests(),unchanged:JSON.stringify(hashes)===JSON.stringify(digests()),elapsedMs:Math.round(performance.now()-started),
 scope:outsideTrades?'Three 120-month pure-domain controls: the outside investor spends at most 0.5% of its remaining $24M opening cash per month on available existing securities. Its cash decreases and financial assets increase; total cash/securities are checked. No bank cash conversion, circulation, campaign economy, AI, multiplayer or release acceptance.':(closure?'Three closure-boundary':'Six')+' fixed-policy 120-month pure-domain runs at unchanged prices. Finite dealer liquidity is an explicit opening fixture, not a cash grant during play. No bank cash conversions, circulation, real campaign economy, AI, multiplayer or release acceptance is claimed. Includes every failure and depleted-liquidity result.',closureBoundary:closure,cases};
fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output','investment-services-domain-balance'+(outsideTrades?'-outside-trades':'')+(closure?'-closure':'')+'.json'),JSON.stringify(report,null,2)+'\n');
if(cases.some(c=>c.failure)||!report.unchanged)process.exitCode=1;
