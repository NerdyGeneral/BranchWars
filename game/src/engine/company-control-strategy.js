// The opponent acts as its own board, not as a delegated manager of the human
// bank. Inputs are owner-visible books and published offers only. No new RNG,
// automatic capital endowment, future proceeds or concealed rival plans.
function validateCompanyControlStrategy(g){
 if(g.companyControlStrategyVersion===undefined&&g.version!=='9.26')return;
 if(g.companyControlStrategyVersion!==1||g.companyConsolidationVersion!==1||g.version!==campaignVersion(g))throw Error('Unsupported company control strategy rules.');
}
function companyControlStrategyReview(v,input){
 if(v.companyControlStrategyVersion!==1)throw Error('Company control strategy requires its campaign rules.');
 const p=v.me,plan=investmentCopy(input),policy=defaultCompanyControlPlan(p),cash=p.financialGroup.parent.accounts.cash;
 plan.companyControlPolicy=policy;plan.companyShareOrders=[];
 const doctrine=p.doctrine?.key||p.doctrine;
 const reasons=[],s=v.companyShareSnapshot,own=p.companyControl.deals;
 const accept=candidate=>{try{normalizeCompanyControlPlan(v,p,candidate);return true;}catch{return false;}};
 const company=id=>companyControlCompany(v,id);
 // A controlling shareholder may simply withhold consent. Spending on a delay
 // adds no value when its refusal already prevents the purchase.
 for(const published of v.companyControlSnapshot.offers.filter(d=>d.offer.buyer!==p.id)){
  const o=published.offer,holding=p.companyShares.positions[o.issuer],c=company(o.issuer),ownership=s.ownership.find(x=>x.issuer===o.issuer),needed=Math.max(0,o.shares-ownership.outside);
  if(!needed||!holding.shares||needed>holding.shares)continue;
  const history=c.profits.slice(-3),declining=history.length===3&&history.every(n=>n<0),tight=cash<50000;
  const premium=holding.shares>50000&&!declining&&!tight?1.35:declining||tight?1.10:1.20;
  if(o.priceCents>=Math.ceil(c.referenceCents*premium)){
   const next=investmentCopy(plan);next.companyControlPolicy.consents.push({offerId:o.id,seller:p.id,shares:needed});
   if(accept(next)){policy.consents=next.companyControlPolicy.consents;reasons.push('Tender an explicitly priced holding; do not spend expected sale proceeds.');}
  }else reasons.push('Retain ownership: the published offer does not justify selling this stake.');
 }
 // Pause only unfinished integration that cannot currently be funded. Resuming
 // is deliberate in the next plan; debt service remains a real obligation.
 let free=Math.max(0,cash-companyShareParentReserve(plan));
 policy.paused=[];
 for(const d of own.filter(d=>d.status==='closed')){
  free=Math.max(0,free-companyControlDebtDue(d.loan,v.cycle));
  if(d.integration.workDone<6){const remaining=d.integration.totalCost-d.integration.paid;if(remaining>free)policy.paused.push(d.offer.id);else free-=remaining;}
 }
 const pending=own.filter(d=>d.status==='review');
 for(const d of pending){
  const next=investmentCopy(plan),c=company(d.offer.issuer),stale=v.cycle>d.diligence.expiresMonth,losses=c.profits.slice(-3);
  const protectedCash=companyShareParentReserve(plan)+companyControlReserve(p,plan,v,{exclude:d.offer.id});
  if(stale||c.suspended||losses.length===3&&losses.every(n=>n<0)||companyControlOfferReserve(d.offer)+protectedCash>cash){next.companyControlPolicy.cancel=d.offer.id;if(accept(next)){policy.cancel=d.offer.id;reasons.push('Withdraw an expired, deteriorating or no-longer-funded offer.');break;}}
 }
 const finish=reason=>{normalizeCompanyControlPlan(v,p,plan);return {plan,reason:[...reasons,reason].filter(Boolean).join(' ')};};
 if(pending.length||own.some(d=>d.status==='closed'&&(d.integration.workDone<6||d.loan.interestDue)))return finish('Complete current control work before another acquisition.');
 const expansionIdentity=['commercial','efficiency'].includes(doctrine)||strategyLevel(p,'acquisition')>=2;
 if(!expansionIdentity||groupCapitalQuote(p).restricted||p.stats.cash<p.stats.deposits*.08)return finish('Keep the bank safe; control acquisitions do not fit every institution.');
 const protectedCash=companyShareParentReserve(plan)+companyControlReserve(p,plan,v),available=Math.max(0,cash-protectedCash),budget=Math.floor(Math.max(0,available-100000)*(doctrine==='commercial'?.60:.45));
 if(budget<100000)return finish('Accumulate real parent surplus before commissioning diligence.');
 const candidates=[];
 for(const issuer of s.issuers){
  const holding=p.companyShares.positions[issuer.id],c=company(issuer.id),history=c.profits.slice(-3),world=p.companySnapshot.world.companies.find(x=>x.id===issuer.id);
  if(holding.shares>50000||c.suspended||history.length<3||history.some(n=>n<=0)||world.book.accounts.payables||c.distributableMonthly<=0)continue;
  if(own.some(d=>d.offer.issuer===issuer.id&&(d.status==='review'||d.status==='closed'&&(d.loan.original>d.loan.principalPaid||d.integration.workDone<6))))continue;
  // Failed or outbid diligence is not recommissioned every month.
  const prior=p.companyControl.diligence[issuer.id];if(prior&&v.cycle>prior.expiresMonth&&v.cycle-prior.commissionedMonth<12)continue;
  const shares=50001-holding.shares,priceCents=Math.ceil(c.referenceCents*1.25),purchase=Math.ceil(shares*priceCents/100),fee=CompanyControl.diligenceQuote(c,v.cycle).fee;
  // Retained operating earnings belong to shareholders too. Do not reject a
  // healthy firm merely because it retains most profits. Financing below still
  // uses only distributable cash, never retained paper earnings.
  const yieldMonthly=(history.reduce((n,x)=>n+x,0)/history.length)*shares/100000/Math.max(1,purchase);
  if(yieldMonthly<.0075||priceCents>1000000)continue;
  // Modest financing can bridge a shortfall, never substitute for positive
  // distributable cash or the funded lender. Both candidates use canonical review.
  const borrow=Math.min(Math.floor(purchase*.25),Math.max(0,Math.ceil((companyControlOfferReserve({shares,priceCents,borrow:0})+fee-budget)*1.15)));
  const raw={issuer:issuer.id,shares,priceCents,borrow},context=companyControlContext(v,p,issuer.id,protectedCash+fee,[]);
  const previewDiligence={...CompanyControl.diligenceQuote(c,Math.max(0,v.cycle-1)),owner:p.financialGroup.parent.entityId};
  try{const q=CompanyControl.review(context,companyControlOrder(v,p,raw),previewDiligence,{allowPendingConsent:true});
   if(q.parentRequired+fee>budget||borrow&&(q.targetCash+context.existingMonthlyCash)<2*(q.initialService+context.existingDebtService))continue;
   candidates.push({raw,yieldMonthly,prior});
  }catch{/* A candidate rejected by the same rules is not a strategic option. */}
 }
 const reviewed=c=>!!c.prior&&v.cycle>=c.prior.readyMonth&&v.cycle+1<=c.prior.expiresMonth;
 candidates.sort((a,b)=>Number(reviewed(b))-Number(reviewed(a))||b.yieldMonthly-a.yieldMonthly||a.raw.issuer.localeCompare(b.raw.issuer));
 for(const c of candidates){
  const next=investmentCopy(plan),ready=c.prior&&v.cycle>=c.prior.readyMonth&&v.cycle+1<=c.prior.expiresMonth;
  if(ready)next.companyControlPolicy.offer=c.raw;else if(c.prior&&v.cycle<=c.prior.expiresMonth)continue;else next.companyControlPolicy.diligence=c.raw.issuer;
  if(accept(next)){plan.companyControlPolicy=next.companyControlPolicy;return {plan,reason:[...reasons,ready?'Submit a paid-review control offer with protected parent reserves.':'Commission one affordable target review using observed profitable operations.'].join(' ')};}
 }
 return finish('No profitable, funded controlling offer currently fits the institution.');
}
