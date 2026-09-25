'use strict';
// Deliberately constructed, conserved books test reachable quote-shape limits
// and contract migration. These are not naturally earned balance/fun samples.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const source=fs.readFileSync(path.join(root,'BRANCH_WARS.html'),'utf8'),ctx={console};
vm.runInNewContext(source.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('root.BWEngine={','root.pricingTransitions={validatePricedDepositShape,prepareTermFunding,repriceWithdrawableDeposits};root.BWEngine={'),ctx);
const E=ctx.BWEngine,H=ctx.pricingTransitions;
const options={campaignRulesVersion:1,serviceExpansionVersion:1,managementVersion:2,customerDemandVersion:2,
 workforceVersion:1,customerOwnershipVersion:1,creditPerformanceVersion:1,segmentDepositsVersion:1,
 productProgramsVersion:2,mode:'hotseat',seed:'pricing-transitions',created:1};
const fresh=extra=>E.createGame({...options,...extra});
const plan=p=>({focus:p.focus,allocation:{...p.allocation},decision:'b',depositPolicy:'balanced',
 lendingPolicy:'balanced',capitalPolicy:'balanced',products:{...p.products},newProjects:[],investments:{},
 hires:0,competitiveAction:'none',productProgramPolicy:E.productProgramPolicy(p),termPolicy:{offer:'off',maturity:'release'}});
function valid(g){E.validatePilot(g);E.validateLedger(g);E.validateCampaignRules(g,'game');for(let i=0;i<2;i++)E.validateProductPricingView(E.publicState(g,i));}
function turn(g){const requests=g.players.map(plan);requests[0].productProgramPolicy.pricingBp.essential=g.cycle%2?25:-25;
 E.submit(g,0,requests[0]);E.submit(g,1,requests[1]);valid(g);}
// The modular variant is gone with the pilot.
const variants=[{},
 {advertisingVersion:1,regionalGrowthVersion:1,relationshipOffersVersion:1,onboardingVersion:1}];
let months=0,bookMonths=0,transfers=0,maxCohorts=0;
for(const variant of variants)for(const seat of [0,1])for(const locked of [false,true]){
 const g=fresh(variant),seller=g.players[1-seat],buyer=g.players[seat],target=seller.focus;
 // Start-of-campaign six-month promises are valid and distinguishable. The
 // completion hook is isolated here; acquisition finance is tested elsewhere.
 seller.depositBook.cohorts.forEach(c=>Object.assign(c,{product:'highYield',rate:4321,remaining:6,...(locked?{locked:true}:{})}));
 valid(g);const total=g.players.reduce((n,p)=>n+p.stats.deposits,0),terms=E.acquisitionTerms(g,buyer,target);
 E.finishProject(g,buyer,{key:'acquisition',target});valid(g);
 assert(terms.depositTake>0);assert.equal(g.players.reduce((n,p)=>n+p.stats.deposits,0),total);
 const acquired=buyer.depositBook.cohorts.filter(c=>c.market===target&&c.rate===4321&&c.remaining===6&&!!c.locked===locked);
 assert.equal(acquired.reduce((n,c)=>n+c.principal,0),terms.depositTake);transfers++;
 const resumed=E.migrateCampaign(copy(g));
 for(let month=0;month<7&&!g.gameOver;month++){
  // Compare canonical saves: migration removes the obsolete derived strategy
  // cache, as in the existing pricing/replay tests; no economic field is ignored.
  turn(g);turn(resumed);months++;assert.deepEqual(copy(E.migrateCampaign(g)),copy(E.migrateCampaign(resumed)),'Acquired pricing books drifted after save/resume');
  const remaining=g.players.flatMap(p=>p.depositBook.cohorts).filter(c=>c.quotedCycle===0&&c.rate===4321);
  if(month<5)assert(remaining.every(c=>c.remaining===5-month&&!!c.locked===locked),'Transfer rewrote a promise');
  else assert.equal(remaining.length,0,'Expired original promise persisted beyond its six payments');
 }
}
// Fill every market/segment with all six guarantee ages, both permitted issuer
// rates, both guarantee classes, and both variable products/retained ages.
// This isolated deposit-stage envelope is not a forged full campaign history:
// all other modules keep their opening timestamps and are not settled here.
// Full campaign acquisition/continuation is exercised independently above.
for(const variant of variants){
 const g=fresh(variant);g.cycle=6;
 for(const p of g.players){p.depositBook.asOfCycle=5;p.depositBook.cohorts=p.depositBook.cohorts.flatMap(c=>{
  const templates=[];
  for(let age=0;age<6;age++)for(const locked of [false,true])for(const rate of [3210,4321])
   templates.push({...c,product:'highYield',quotedCycle:5-age,remaining:6-age,rate,...(locked?{locked:true}:{})});
  for(const product of ['essential','rewards'])for(const age of [0,1])for(const rate of [1000,2000])
   templates.push({...c,product,quotedCycle:5-age,remaining:0,rate});
  return templates.map((t,i)=>({...t,principal:Math.floor(c.principal/templates.length)+(i<c.principal%templates.length?1:0)}));
 });maxCohorts=Math.max(maxCohorts,p.depositBook.cohorts.length);}
 g.players.forEach(p=>H.validatePricedDepositShape(p));assert.equal(g.players[0].depositBook.cohorts.length,576);
 for(let month=0;month<7;month++){
  for(const p of g.players){const principal=p.depositBook.cohorts.reduce((n,c)=>n+c.principal,0);
   H.prepareTermFunding(g,p,true);H.repriceWithdrawableDeposits(g,p);p.depositBook.asOfCycle=g.cycle;
   H.validatePricedDepositShape(p);assert.equal(p.depositBook.cohorts.reduce((n,c)=>n+c.principal,0),principal);
   maxCohorts=Math.max(maxCohorts,p.depositBook.cohorts.length);assert(p.depositBook.cohorts.length<5000);
  }g.cycle++;bookMonths++;
 }
}
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'BRANCH_WARS.html'))).digest('hex'),crypto.createHash('sha256').update(source).digest('hex'));
console.log(JSON.stringify({passed:true,artifactSha256:crypto.createHash('sha256').update(source).digest('hex'),transfers,months,bookMonths,maxCohorts,
 limitations:'Constructed conservation/contract fixtures; completion-hook acquisition and isolated maximum-shape deposit stages, not paid deal or human balance evidence.'},null,2));
