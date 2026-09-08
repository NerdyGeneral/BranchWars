'use strict';
// Construct explicit conserved boundary books, not claims that ordinary AI play
// naturally reaches these positions. No production economics are changed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=process.argv.includes('--source')?require('../tools/build_game.js').assemble().html:fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8');
const ctx={console};vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.pricingBoundary={withMarket,delta,transferMarket,compactDeposits,depositRate,productPricingEdges};root.BWEngine={'),ctx);
const E=ctx.BWEngine,H=ctx.pricingBoundary,copy=x=>JSON.parse(JSON.stringify(x));
const flags={campaignRulesVersion:1,serviceExpansionVersion:1,managementVersion:2,customerDemandVersion:2,workforceVersion:1,
 customerOwnershipVersion:1,creditPerformanceVersion:1,segmentDepositsVersion:1,productProgramsVersion:2,mode:'hotseat',seed:17,created:1};
const records=[];let months=0;
function valid(g){E.validatePilot(g);E.validateLedger(g);E.validateCampaignRules(g,'game');}
function fixture(kind,seat){
 const g=E.createGame(flags);
 if(kind==='mature80'||kind==='mature95'){
  // Deplete existing outside supply with matched owned-book/accounting entries,
  // then redistribute player deposits to the requested leader share.
  for(const resource of ['deposits','customers'])for(const p of g.players)
   H.withMarket(g,()=>H.delta(p,resource,resource==='deposits'?100000000000:100000000));
  const share=kind==='mature80'?.8:.95,target=Math.floor(g.players.reduce((n,p)=>n+p.stats.deposits,0)*share),leader=g.players[seat],rival=g.players[1-seat];
  const from=leader.stats.deposits>target?leader:rival,to=from===leader?rival:leader;
  let remaining=Math.abs(leader.stats.deposits-target);
  for(const key of Object.keys(g.territories))remaining-=H.transferMarket(g,from,to,key,'deposits',remaining);
  assert.equal(remaining,0);assert.equal(leader.stats.deposits,target);
  assert(Object.values(g.marketEconomy.markets).every(m=>m.community.deposits+m.union.deposits===0));
  // These are constructed OPENING variable books, not a partially resolved
  // first month. withMarket stamps live intake at cycle 1; backdate only these
  // unpromised opening balances to the existing as-of boundary and compact.
  // No guarantee rate, remaining term, principal or ownership is changed.
  for(const p of g.players){for(const c of p.depositBook.cohorts){assert.equal(c.remaining,0);c.quotedCycle=p.depositBook.asOfCycle;}H.compactDeposits(p);}
 }
 if(['locked','tinyVariable','tinyGuaranteed'].includes(kind))for(const p of g.players){
  p.depositBook.cohorts=p.depositBook.cohorts.flatMap(c=>{
   const variable=kind.startsWith('tiny')?Math.min(c.principal,1):0;
   return [...(variable?[{...c,principal:variable}]:[]),{...c,principal:c.principal-variable,product:'highYield',...(kind==='tinyGuaranteed'?{}:{locked:true}),remaining:6,quotedCycle:0,rate:H.depositRate(p,g,'highYield')}].filter(row=>row.principal>0);
  });H.compactDeposits(p);
 }
 valid(g);return g;
}
for(const kind of ['mature80','mature95','locked','tinyVariable','tinyGuaranteed'])for(const seat of [0,1]){
 const opening=fixture(kind,seat),openingBytes=JSON.stringify(opening);
 for(const pricing of ['neutral','pressure','cycling']){
  const g=copy(opening),interest=[0,0],rivalFlows=[0,0];let count=0;
  for(;count<6&&!g.gameOver;count++){
   const plans=g.players.map((p,i)=>E.chooseBot(g,i));
   plans[seat].productProgramPolicy.pricingBp.essential=pricing==='neutral'?0:pricing==='cycling'&&count%2?-25:25;
   if(count===0){
    const prices=copy(g);prices.players[seat].productPrograms.pricingBp.essential=25;
    const edges=H.productPricingEdges(prices);
    if(kind==='locked')assert(Object.values(edges).every(row=>row.edge===0));
    if(kind==='tinyGuaranteed')assert(Object.values(edges).every(row=>Math.abs(row.edge)<.0001),'Guaranteed withdrawable balances dilute the eligible price signal');
    if(kind==='tinyVariable'){
     // Locked funds are deliberately excluded from the price denominator. A
     // tiny remaining pool may have full relative pressure, never access to locks.
     const protectedBefore=prices.players.map(p=>p.depositBook.cohorts.filter(c=>c.locked).reduce((n,c)=>n+c.principal,0));
     E.depositContest(prices);
     assert.deepEqual(copy(prices.players.map(p=>p.depositBook.cohorts.filter(c=>c.locked).reduce((n,c)=>n+c.principal,0))),copy(protectedBefore));
     valid(prices);
    }
   }
   E.submit(g,0,plans[0]);E.submit(g,1,plans[1]);valid(g);months++;
   for(const [i,p]of g.players.entries()){
    interest[i]+=p.operatingReport.depositInterest;
    rivalFlows[i]+=Object.values(p.productPrograms.review.flows.rivalTransfers).reduce((n,v)=>n+v,0);
    E.validateProductPricingView(E.publicState(g,i));
   }
   assert.equal(rivalFlows[0]+rivalFlows[1],0,'Paired rival principal must conserve exactly');
  }
  records.push({kind,seat,pricing,months:count,ended:g.gameOver,endReason:g.endReason||null,interest,rivalFlows,
   finalDeposits:g.players.map(p=>p.stats.deposits),minimumEndingCapital:Math.min(...g.players.map(p=>E.capitalRatio(p)))});
 }
 assert.equal(JSON.stringify(opening),openingBytes,'Controller comparisons must share an unchanged opening state');
}
console.log(JSON.stringify({passed:true,artifactSha256:crypto.createHash('sha256').update(source).digest('hex'),cases:records.length,months,
 records,limitations:'Artificial conserved boundary fixtures; six-month smoke, not a claim of organic maturity, balanced human strategies or long-run safety. No tuning.'},null,2));
