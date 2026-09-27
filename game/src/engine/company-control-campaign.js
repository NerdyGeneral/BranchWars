// Explicit campaign adapter for reviewed company control. Existing share-only
// campaigns keep their original saves and ordered settlement unchanged.
function initializeCompanyControl(g,o){
 if(o.companyControlVersion!==1)return;
 if(g.companySharesVersion!==1)throw Error('Reviewed control requires company ownership.');
 const m=g.companyShareMarket,capital=Math.floor(m.outside.book.accounts.cash/2);
 const funded=GroupAccounting.invest(m.outside.book,GroupAccounting.opening('company:acquisition-lender'),capital);m.outside.book=funded.parent;
 g.companyControlVersion=1;g.companyControlMarket={version:1,month:0,capital,lender:funded.entity,provider:GroupAccounting.opening('company:control-services'),expenses:0};
 for(const p of g.players)p.companyControl={version:1,diligence:{},deals:[],paused:[]};
}
function defaultCompanyControlPlan(p){return {diligence:null,offer:null,cancel:null,consents:[],defend:null,paused:[...(p.companyControl?.paused||[])]};}
function companyControlCompanies(g){return g.companyEconomy?.companies||g.me?.companySnapshot?.world.companies;}
function companyControlOffers(g){return g.players?g.players.flatMap(p=>p.companyControl.deals.filter(d=>d.status==='review').map(d=>({offer:d.offer,reviewMonth:d.reviewMonth,defended:d.defended}))):g.companyControlSnapshot.offers;}
function companyControlCompany(g,id){
 const c=companyControlCompanies(g)?.find(c=>c.id===id),m=g.companyShareMarket||g.companyShareSnapshot,i=m?.issuers.find(i=>i.id===id);
 if(!c||!i)throw Error('Unknown control target.');
 const profits=m.history[id],average=profits.length?profits.reduce((n,x)=>n+x,0)/profits.length:0;
 return {id,issued:i.issued,referenceCents:i.referenceCents,equity:c.book.accounts.equity,profits:[...profits],capitalRevision:c.resolution?1:0,suspended:i.suspended,distributableMonthly:Math.max(0,Math.min(Math.floor(average*.3),c.book.retainedEarnings,c.book.accounts.cash-c.book.accounts.payables-3*c.baseFee))};
}
function companyControlContext(g,p,id,protectedCash=0,consents=[]){
 const m=g.companyControlMarket||g.companyControlSnapshot,market=g.companyShareMarket||g.companyShareSnapshot;
 const ownership=g.players?[...g.players.map(p=>({id:p.id,shares:p.companyShares.positions[id].shares})),{id:'outside',shares:g.companyShareMarket.outside.positions[id].shares}]:market.ownership.find(i=>i.issuer===id).banks.concat({id:'outside',shares:market.ownership.find(i=>i.issuer===id).outside});
 // Actual cash payouts observed in the previous settled month, not bank cash,
 // unapproved dividends or the purchased target's entire operating income.
 const distributions=(market.distributions||[]).filter(r=>r.holder===p.id&&r.issuer!==id&&r.kind==='dividend').reduce((n,r)=>n+r.amount,0);
 const existingMonthlyCash=distributions+(p.financialGroup.report?.dividend||0);
 const existingDebtService=p.companyControl.deals.filter(d=>d.status==='closed').reduce((n,d)=>n+companyControlDebtDue(d.loan,Math.max(g.cycle,d.loan.servicedThrough+1)),0);
 return {company:companyControlCompany(g,id),month:g.cycle,buyerEntityId:p.financialGroup.parent.entityId,parentCash:p.financialGroup.parent.accounts.cash,protectedCash,lenderCash:m.lender?m.lender.accounts.cash:m.lenderCash,existingMonthlyCash,existingDebtService,ownership,consents};
}
function companyControlDebtDue(l,month){
 if(month<=l.servicedThrough)return 0;
 const remaining=l.original-l.principalPaid,interest=Math.ceil(remaining*CompanyControl.RULES.interestBp/10000),principal=Math.max(0,Math.floor(l.original*Math.min(36,Math.max(0,month-l.startedMonth))/36)-l.principalPaid);
 return l.interestDue+interest+principal;
}
function companyControlOfferReserve(o){const cost=Math.ceil(o.shares*o.priceCents/100),service=Math.ceil(o.borrow/36)+Math.ceil(o.borrow*.0075);return cost-o.borrow+Math.ceil(cost*.0025)+Math.ceil(cost*.01)+3*service;}
function companyControlExecution(p,plan){if(!p.companyControl)return 0;const paused=plan.companyControlPolicy?.paused||p.companyControl.paused;return p.companyControl.deals.filter(d=>d.status==='closed'&&d.integration.workDone<6&&!paused.includes(d.offer.id)).length;}
function companyControlReserve(p,plan,g,{exclude=null,skipNew=false}={}){
 if(!p.companyControl)return 0;
 const policy=plan.companyControlPolicy||defaultCompanyControlPlan(p),cash=p.financialGroup.parent.accounts.cash;
 let held=0;
 for(const d of p.companyControl.deals){if(d.offer.id===exclude||d.offer.id===policy.cancel)continue;
  if(d.status==='review')held+=companyControlOfferReserve(d.offer);
  if(d.status==='closed')held+=companyControlDebtDue(d.loan,g.cycle)+(policy.paused.includes(d.offer.id)?0:d.integration.totalCost-d.integration.paid);
 }
 // Existing liabilities may be unaffordable after losses; preserve a playable
 // no-spend plan, pay what cash permits and retain arrears at settlement.
 held=Math.min(cash,held);
 if(!skipNew){if(policy.diligence)held+=CompanyControl.diligenceQuote(companyControlCompany(g,policy.diligence),g.cycle).fee;if(policy.offer)held+=companyControlOfferReserve(policy.offer);
  if(policy.defend){const offer=companyControlOffers(g).find(d=>d.offer.id===policy.defend);if(offer)held+=Math.ceil(companyControlCompany(g,offer.offer.issuer).equity/100);}}
 return held;
}
function companyControlOrder(g,p,raw){return {...raw,id:p.id+':control:'+g.cycle+':'+raw.issuer,buyer:p.id,submittedMonth:g.cycle};}
function normalizeCompanyControlPlan(g,p,plan){
 if(!p.companyControl){if(plan.companyControlPolicy!==undefined)throw Error('Control instructions require reviewed-control campaign rules.');return;}
 const policy=plan.companyControlPolicy||defaultCompanyControlPlan(p),keys=['diligence','offer','cancel','consents','defend','paused'];
 if(!investmentExact(policy,keys)||!Array.isArray(policy.consents)||policy.consents.length>6||!Array.isArray(policy.paused)||policy.paused.length>6||new Set(policy.paused).size!==policy.paused.length)throw Error('Invalid controlling-company plan.');
 const own=p.companyControl.deals,offers=companyControlOffers(g),ids=new Set();
 for(const id of policy.paused)if(!own.some(d=>d.offer.id===id&&d.status==='closed'&&d.integration.workDone<6))throw Error('Only owned unfinished integration can be paused.');
 if(policy.cancel!==null&&!own.some(d=>d.offer.id===policy.cancel&&d.status==='review'))throw Error('Only an owned pending offer can be cancelled.');
 for(const consent of policy.consents){const target=offers.find(d=>d.offer.id===consent?.offerId);
  if(!investmentExact(consent,['offerId','seller','shares'])||consent.seller!==p.id||!target||target.offer.buyer===p.id||!investmentWhole(consent.shares)||consent.shares>p.companyShares.positions[target.offer.issuer].shares||ids.has(consent.offerId))throw Error('Invalid or stale offer consent.');ids.add(consent.offerId);}
 if(policy.defend!==null){const target=offers.find(d=>d.offer.id===policy.defend);if(!target||target.offer.buyer===p.id||target.defended||p.companyShares.positions[target.offer.issuer].shares<=50000)throw Error('Only an owned controlling stake can fund one offer delay.');}
 if(policy.diligence!==null){companyControlCompany(g,policy.diligence);if(own.some(d=>d.status==='review'&&d.offer.issuer===policy.diligence&&d.offer.id!==policy.cancel))throw Error('Cancel the pending offer before replacing its diligence.');}
 const held=companyControlReserve(p,{...plan,companyControlPolicy:policy},g,{skipNew:true}),base=companyShareParentReserve(plan,g),orders=(plan.companyShareOrders||[]).filter(o=>o.side==='buy').reduce((n,o)=>{const cost=Math.ceil(o.shares*o.limitCents/100);return n+cost+Math.ceil(cost*.0025);},0);
 if(policy.offer!==null){
  if(!investmentExact(policy.offer,['issuer','shares','priceCents','borrow']))throw Error('Invalid proposed control ticket.');
  if(own.some(d=>d.offer.issuer===policy.offer.issuer&&d.offer.id!==policy.cancel&&(d.status==='review'||d.status==='closed'&&(d.loan.principalPaid<d.loan.original||d.loan.interestDue||d.integration.workDone<6))))throw Error('Finish the existing transaction for this company first.');
  const order=companyControlOrder(g,p,policy.offer),review=companyControlContext(g,p,order.issuer,held+base+orders,[]);
  CompanyControl.review(review,order,p.companyControl.diligence[order.issuer],{allowPendingConsent:true});
 }
 if(companyControlReserve(p,{...plan,companyControlPolicy:policy},g)+base+orders>p.financialGroup.parent.accounts.cash)throw Error('Control work and all other parent commitments exceed available cash.');
 plan.companyControlPolicy=investmentCopy(policy);
}
