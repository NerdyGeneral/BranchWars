// Owner-only deposit attribution. Temporary tracing never enters a saved book
// or an operating forecast; only the latest reconciled review is retained.
const PRODUCT_PRICING_FLOWS = Object.freeze(['ordinaryIntake','onboarding','rivalTransfers','outsideWithdrawals','outsideOther','retention','terms','productSwitches','other']);
const productPricingTraces = new WeakMap();
function validatePricedDepositShape(p,quotes=new Map()){
 const book=p.depositBook,seen=new Set(),fail=()=>{throw Error('Invalid priced deposit provenance or duplicate cohorts.');};
 if(!book||Object.keys(book).sort().join()!=='asOfCycle,cohorts,version'||!Array.isArray(book.cohorts)||
  !Number.isSafeInteger(book.asOfCycle)||book.asOfCycle<0||book.version!==1)fail();
 for(const c of book.cohorts){
  if(!c||Object.keys(c).sort().join()!==(c.locked===true?'exiting,locked,market,principal,product,quotedCycle,rate,remaining,segment':'exiting,market,principal,product,quotedCycle,rate,remaining,segment'))fail();
  if(!Number.isSafeInteger(c.principal)||c.principal<=0||!Number.isInteger(c.rate)||c.rate<0||c.rate>100000||
   !Number.isInteger(c.remaining)||c.remaining<0||c.remaining>6||!Object.hasOwn(DEPOSIT_SERVICE,c.product)||
   !Object.hasOwn(CUSTOMER_SEGMENTS,c.segment)||!Object.hasOwn(p.marketBook.markets,c.market)||
   !Number.isSafeInteger(c.exiting)||c.exiting<0||c.exiting>c.principal||(!c.locked&&c.exiting)||
   ((c.remaining||c.locked)&&c.product!=='highYield')||(c.locked&&!c.remaining))fail();
  const age=book.asOfCycle-c.quotedCycle;
  if(!Number.isSafeInteger(age)||age<0||(c.remaining?age+c.remaining!==6:age>1))fail();
  const signature=[c.market,c.product,c.remaining,c.rate,c.quotedCycle,!!c.locked,c.segment].join('|');
  if(seen.has(signature))fail();seen.add(signature);
  // Two banks can originate at most two stamped rates for each monthly
  // product/contract class. Outside acquisitions quote the receiving bank's
  // current rate; transfers preserve their original stamps. Reject forged
  // unbounded vintages before adoption, never discard a promised account.
  const key=[c.product,!!c.locked,c.quotedCycle].join('|');
  if(!quotes.has(key))quotes.set(key,new Set());quotes.get(key).add(c.rate);
  if(quotes.get(key).size>2)fail();
 }
}
function productPricingQuote(p,g,plan) {
 if(p.productPrograms?.version!==2)return null;
 const staged=JSON.parse(JSON.stringify(p));
 if(plan){
  staged.policies={...staged.policies,deposit:plan.depositPolicy||staged.policies.deposit};
  staged.allocation={...(plan.allocation||staged.allocation)};
  applyHouseholdPolicy(staged,plan.householdPolicy);applyWorkforcePolicy(staged,plan.workforcePolicy);
  applyProductProgramPolicy(staged,plan.productProgramPolicy);
 }
 const summary=depositSummary(staged,g),rows={};
 for(const k of Object.keys(DEPOSIT_SERVICE)) {
  const held=staged.depositBook.cohorts.filter(c=>!c.locked&&c.product===k),product=summary.rows[k];
  rows[k]={bp:k==='highYield'?null:staged.productPrograms.pricingBp[k],rate:depositRate(staged,g,k),
   variable:held.filter(c=>c.remaining===0).reduce((n,c)=>n+c.principal,0),
   protected:held.filter(c=>c.remaining>0).reduce((n,c)=>n+c.principal,0),
   interest:product.interest,service:product.service,fees:product.fees,directCost:product.directCost,
   available:k==='essential'||!!staged.productDeployment.ready[k],
   editable:k==='essential'||k==='rewards'&&staged.productDeployment.ready.rewards&&!staged.productPrograms.products.rewards.retired};
 }
 return {rows,interest:summary.interest,directCost:summary.interest+summary.service-summary.fees,
  coverage:householdServiceReview(staged).coverage,term:summary.rows.term};
}
function productPricingComparison(p,plan,economy) {
 if(p.productPrograms?.version!==2)throw Error('Product pricing requires a new pricing-enabled campaign.');
 const current=JSON.parse(JSON.stringify(plan));
 current.productProgramPolicy.pricingBp={...p.productPrograms.pricingBp};
 const quote=input=>productPricingQuote(p,{economy},input),before=quote(current),after=quote(plan);
 return {before,after,monthlyInterestChange:after.interest-before.interest,
  schedule:{keep:productPricingSchedule(p,plan,economy,current.productProgramPolicy.pricingBp),staged:productPricingSchedule(p,plan,economy)},
  keep:operatingPreview(p,current,economy),staged:operatingPreview(p,plan,economy)};
}
function productPricingSchedule(p,plan,economy,pricingBp=plan.productProgramPolicy.pricingBp){
 const staged=JSON.parse(JSON.stringify(plan));staged.productProgramPolicy.pricingBp={...pricingBp};
 const fixed=prepareOperatingForecast(p,staged),schedule=[];
 // Existing contracts only: no new subscriptions, acquisition, loan production
 // or invented future regime. Known former-customer maturities still leave.
 fixed.termFunding.policy.offer='off';
 const world={economy,marketEconomy:JSON.parse(JSON.stringify(p.marketSnapshot||marketContext?.marketEconomy)),cycle:fixed.depositBook.asOfCycle+1};
 for(let month=1;month<=6;month++){
  const term=prepareTermFunding(world,fixed,true);
  repriceWithdrawableDeposits(world,fixed);
  const book=depositSummary(fixed,world);
  schedule.push({month,principal:fixed.stats.deposits,interest:book.interest,service:book.service,fees:book.fees,
   directCost:book.interest+book.service-book.fees,departed:term.departed,locked:book.rows.term.principal});
  fixed.depositBook.asOfCycle=world.cycle;world.cycle++;
 }
 return schedule;
}
function planProductPricing(g,index,input) {
 if(g.productProgramsVersion!==2)return input;
 const p={...g.players[index],marketSnapshot:g.marketEconomy},current=p.productPrograms.pricingBp;
 const rewards=p.productDeployment.ready.rewards&&!input.productProgramPolicy.retire.includes('rewards')?[-25,0,25]:[current.rewards];
 const effective=new Map(),same=(a,b)=>a.essential===b.essential&&a.rewards===b.rewards;
 const tie=(a,b)=>{
  const x=a.plan.productProgramPolicy.pricingBp,y=b.plan.productProgramPolicy.pricingBp;
  return Number(same(y,current))-Number(same(x,current))||
   Math.abs(x.essential)+Math.abs(x.rewards)-Math.abs(y.essential)-Math.abs(y.rewards)||
   x.essential-y.essential||x.rewards-y.rewards;
 };
 // Cache equivalent effective rates for this owner/plan only. Floor-clamped
 // tariffs can be identical economically; retain the specified policy tie-break
 // without repeating an operating forecast or sharing caches between owners.
 for(const essential of [-25,0,25])for(const reward of rewards){
  const plan=JSON.parse(JSON.stringify(input));plan.productProgramPolicy.pricingBp={essential,rewards:reward};
  normalizeProductProgramPlan(p,plan);
  const quote=productPricingQuote(p,g,plan),key=Object.values(quote.rows).map(r=>r.rate).join(','),candidate={plan,quote};
  const prior=effective.get(key);
  if(prior){if(tie(candidate,prior)<0)effective.set(key,{...candidate,forecast:prior.forecast});}
  else effective.set(key,{...candidate,forecast:operatingPreview(p,plan,g.economy)});
 }
 const candidates=[...effective.values()];
 candidates.sort((a,b)=>b.forecast.profit-a.forecast.profit||tie(a,b));
 const baseline=candidates[0],last=p.productPrograms.review;
 const outflow=last?Object.values(last.flows.rivalTransfers).reduce((n,x)=>n+Math.max(0,-x),0):0;
 if(!outflow||p.stats.lastProfit<=0||p.stats.cash<500000||fundingPosition(p).excess>0||
  bankRecoveryReview(p,baseline.plan,g.economy,g.event).stressed)return baseline.plan;
 // Only already-published quotes are visible here, never rival cohorts or plans.
 const rival=g.players[1-index].productPrograms.quotes;
 if(!rival)return baseline.plan;
 const strength=candidate=>{
  let value=0,principal=0;
  for(const c of p.depositBook.cohorts)if(!c.locked){
   principal+=c.principal;
   if(c.remaining||!rival.available[c.product]||!productPricingAvailable(p,c.market,c.segment,c.product))continue;
   const gap=candidate.quote.rows[c.product].rate-rival.rates[c.product];
   value+=c.principal*Math.sign(gap)*(gap>0?clamp(candidate.quote.coverage,0,1):1);
  }
  return principal?value/principal:0;
 };
 const baselineSchedule=productPricingSchedule(p,baseline.plan,g.economy);
 const affordable=candidates.filter(c=>{
  if(c.forecast.profit<=0||c.quote.interest-baseline.quote.interest>p.stats.lastProfit*.1||
   (c.forecast.fundingLoss||0)>(baseline.forecast.fundingLoss||0)||c.forecast.capitalRatio<8)return false;
  const schedule=c===baseline?baselineSchedule:productPricingSchedule(p,c.plan,g.economy);
  return schedule.every((row,i)=>row.interest-baselineSchedule[i].interest<=p.stats.lastProfit*.1&&
   c.forecast.profit-Math.max(0,row.directCost-schedule[0].directCost)>0);
 });
 affordable.sort((a,b)=>strength(b)-strength(a)||b.forecast.profit-a.forecast.profit||tie(a,b));
 return affordable[0]?.plan||baseline.plan;
}
function productPrincipalGrid(p) {
 const rows={};
 for(const market of Object.keys(p.marketBook.markets))for(const segment of Object.keys(CUSTOMER_SEGMENTS))
  for(const product of ['essential','rewards','highYield','term'])rows[market+'/'+segment+'/'+product]=0;
 for(const c of p.depositBook.cohorts)rows[c.market+'/'+c.segment+'/'+(c.locked?'term':c.product)]+=c.principal;
 return rows;
}
function beginProductPricingReview(g,p) {
 if(p.productPrograms?.version!==2)return;
 const pricingOpening=productPrincipalGrid(p);
 productPricingTraces.set(p,{cycle:g.cycle,opening:pricingOpening,flows:Object.fromEntries(PRODUCT_PRICING_FLOWS.map(k=>[k,Object.fromEntries(Object.keys(pricingOpening).map(key=>[key,0]))])),billed:null,depth:0});
}
function traceProductDeposits(p,category,action) {
 const trace=productPricingTraces.get(p);
 if(!trace||trace.depth)return action();
 if(!PRODUCT_PRICING_FLOWS.includes(category))throw Error('Unknown product flow category.');
 const before=productPrincipalGrid(p);trace.depth++;
 try{return action()}finally{
  trace.depth--;
  const after=productPrincipalGrid(p);
  for(const key of Object.keys(before))trace.flows[category][key]+=after[key]-before[key];
 }
}
function captureProductPricingBill(p,summary) {
 const trace=productPricingTraces.get(p);
 if(trace) {
  if(trace.billed)throw Error('Product interest was captured twice in one month.');
  trace.billed=JSON.parse(JSON.stringify(summary));
 }
}
function productPublicQuotes(g,p) {
 return {cycle:g.cycle,rates:Object.fromEntries(Object.keys(DEPOSIT_SERVICE).map(k=>[k,depositRate(p,g,k)])),
  available:Object.fromEntries(Object.keys(DEPOSIT_SERVICE).map(k=>[k,k==='essential'||!!p.productDeployment.ready[k]]))};
}
function finishProductPricingReview(g,p) {
 const trace=productPricingTraces.get(p);if(!trace)return;
 if(!trace.billed||trace.depth)throw Error('Incomplete product pricing review.');
 const closing=productPrincipalGrid(p),flows=trace.flows;
 for(const key of Object.keys(closing))flows.other[key]+=closing[key]-trace.opening[key]-Object.values(flows).reduce((n,row)=>n+row[key],0);
 p.productPrograms.review={version:1,cycle:trace.cycle,opening:trace.opening,closing,flows,billed:trace.billed};
 p.productPrograms.quotes=productPublicQuotes(g,p);
}
function validateProductPricingReview(g,p) {
 const fail=()=>{throw Error('Invalid product pricing review or published quotes.')};
 const shape=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 const uint=n=>Number.isSafeInteger(n)&&n>=0;
 const state=p.productPrograms,review=state.review,quotes=state.quotes;
 if(review===null&&quotes===null) {if(p.operatingReport)fail();return;}
 if(!shape(review,['version','cycle','opening','closing','flows','billed'])||review.version!==1||!uint(review.cycle)||review.cycle<1||
  review.cycle!==p.operatingReport?.cycle||review.cycle>g.cycle||g.cycle-review.cycle>1)fail();
 if(!shape(quotes,['cycle','rates','available'])||quotes.cycle!==review.cycle||
  !shape(quotes.rates,Object.keys(DEPOSIT_SERVICE))||!shape(quotes.available,Object.keys(DEPOSIT_SERVICE))||
  !Object.values(quotes.rates).every(n=>uint(n)&&n<=100000)||!Object.values(quotes.available).every(n=>typeof n==='boolean')||quotes.available.essential!==true)fail();
 const current=productPrincipalGrid(p),keys=Object.keys(current);
 if(!shape(review.opening,keys)||!shape(review.closing,keys)||!Object.values(review.opening).every(uint)||!Object.values(review.closing).every(uint)||
  !shape(review.flows,PRODUCT_PRICING_FLOWS)||Object.values(review.flows).some(row=>!shape(row,keys)||!Object.values(row).every(Number.isSafeInteger)))fail();
 for(const key of keys)if(review.closing[key]!==current[key]||review.closing[key]!==review.opening[key]+Object.values(review.flows).reduce((n,row)=>n+row[key],0))fail();
 const b=review.billed,summaryKeys=['rows','markets','centralPlatform','interest','fees','service','cells'];
 if(!shape(b,summaryKeys)||!uint(b.centralPlatform)||!['interest','fees','service'].every(k=>uint(b[k]))||
  !shape(b.rows,['essential','rewards','highYield','term'])||!shape(b.markets,Object.keys(p.marketBook.markets))||
  !Array.isArray(b.cells)||b.cells.length!==keys.length)fail();
 const fields=['principal','interest','fees','service','guaranteed','renewing','locked','exiting','platform','directCost'];
 for(const row of Object.values(b.rows))if(!shape(row,fields)||!fields.filter(k=>k!=='directCost').every(k=>uint(row[k]))||
  !Number.isSafeInteger(row.directCost)||row.directCost!==row.interest+row.service-row.fees)fail();
 const seen=new Set(),totals={interest:0,fees:0,service:0};
 for(const c of b.cells){
  if(!shape(c,['key','segment','product','row']))fail();
  const id=c.key+'/'+c.segment+'/'+c.product;
  if(!Object.hasOwn(current,id)||seen.has(id)||!shape(c.row,fields.filter(k=>k!=='directCost'))||!Object.values(c.row).every(uint))fail();
  seen.add(id);for(const k of Object.keys(totals))totals[k]+=c.row[k];
 }
 for(const k of Object.keys(totals)){
  if(b[k]!==Object.values(b.rows).reduce((n,row)=>n+row[k],0)||b[k]!==totals[k]+(k==='service'?b.centralPlatform:0))fail();
 }
 let central=0;
 for(const [product,row]of Object.entries(b.rows)){
  const cells=b.cells.filter(c=>c.product===product),sum=field=>cells.reduce((n,c)=>n+c.row[field],0);
  const remainder=row.platform-sum('platform');
  if(!uint(remainder))fail();central+=remainder;
  for(const field of fields.filter(k=>k!=='directCost'))if(row[field]!==sum(field)+(['service','platform'].includes(field)?remainder:0))fail();
 }
 if(central!==b.centralPlatform)fail();
 for(const [market,rows]of Object.entries(b.markets)){
  if(!shape(rows,Object.keys(CUSTOMER_SEGMENTS)))fail();
  for(const [segment,row]of Object.entries(rows)){
   if(!shape(row,fields)||!fields.filter(k=>k!=='directCost').every(k=>uint(row[k]))||row.directCost!==row.interest+row.service-row.fees)fail();
   for(const field of fields.filter(k=>k!=='directCost'))if(row[field]!==b.cells.filter(c=>c.key===market&&c.segment===segment).reduce((n,c)=>n+c.row[field],0))fail();
  }
 }
 if(b.interest!==p.operatingReport.depositInterest||b.fees!==p.operatingReport.depositIncome||b.service!==p.operatingReport.depositServiceCost)fail();
}
function validateProductPricingView(view){
 const p=view.me;
 if(view.productProgramsVersion!==2){
  if(p?.productPrograms?.version===2||p?.productPrograms?.pricingBp!==undefined)throw Error('Unversioned product pricing view.');
  return;
 }
 if(!p?.productPrograms||p.productPrograms.version!==2||view.rival?.productPrograms!==undefined)throw Error('Invalid product pricing owner view.');
 if(Object.keys(p.productPrograms).sort().join()!=='markets,pricingBp,products,quotes,review,version')throw Error('Invalid product pricing fields.');
 validateProductDeliveryState(p,p.productPrograms);
 validatePricedDepositShape(p);
 validateProductTargets(p,p.productPrograms.markets);
 validateProductPricing(p,p.productPrograms.pricingBp);
 validateProductPricingReview(view,p);
 const q=view.rival?.productQuotes;
 if(q===null){if(p.productPrograms.review!==null)throw Error('Missing settled rival product quotes.');return;}
 const keys=(x,list)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===list.slice().sort().join();
 if(!keys(q,['cycle','rates','available'])||q.cycle!==p.productPrograms.review?.cycle||!Number.isSafeInteger(q.cycle)||q.cycle<1||q.cycle>view.cycle||view.cycle-q.cycle>1||
  !keys(q.rates,Object.keys(DEPOSIT_SERVICE))||!keys(q.available,Object.keys(DEPOSIT_SERVICE))||
  !Object.values(q.rates).every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100000)||!Object.values(q.available).every(n=>typeof n==='boolean')||q.available.essential!==true)
  throw Error('Invalid rival product quote card.');
}
