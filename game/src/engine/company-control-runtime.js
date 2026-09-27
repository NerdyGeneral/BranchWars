function settleCompanyControl(g,plans){
 if(g.companyControlVersion!==1)return [];
 const m=g.companyControlMarket,market=g.companyShareMarket,lines=[],before=g.players.map(p=>p.financialGroup.parent.accounts.cash);
 if(m.month!==g.cycle-1)throw Error('Control transactions already settled for this month.');
 const policy=plans.map((plan,i)=>plan.companyControlPolicy||defaultCompanyControlPlan(g.players[i]));
 for(const [i,p]of g.players.entries()){
  p.companyControl.paused=[...policy[i].paused];
  for(const [j,d]of p.companyControl.deals.entries()){
   if(d.offer.id===policy[i].cancel)p.companyControl.deals[j]=CompanyControlSettlement.cancel(d);
   if(d.status==='closed'){
    const paid=CompanyControlSettlement.serviceDebt(p.financialGroup.parent,m.lender,d.loan,g.cycle,companyShareParentReserve(plans[i],g));
    p.financialGroup.parent=paid.parent;m.lender=paid.lender;d.loan=paid.loan;
    if(paid.arrears)lines.push(p.name+' has unpaid acquisition debt service. Parent obligations remain due; customer assets are not used.');
   }
  }
  if(policy[i].diligence){const paid=CompanyControl.startDiligence(p.financialGroup.parent,m.provider,companyControlCompany(g,policy[i].diligence),g.cycle,companyShareParentReserve(plans[i],g));p.financialGroup.parent=paid.parent;m.provider=paid.provider;m.expenses+=paid.record.fee;p.companyControl.diligence[paid.record.issuer]=paid.record;lines.push(p.name+' commissioned company diligence; the paid review becomes usable next month.');}
 }
 for(const [i,p]of g.players.entries())if(policy[i].defend){
  const owner=g.players.find(b=>b.companyControl.deals.some(d=>d.offer.id===policy[i].defend)),index=owner.companyControl.deals.findIndex(d=>d.offer.id===policy[i].defend),d=owner.companyControl.deals[index];
  const paid=CompanyControlSettlement.defend(d,p.financialGroup.parent,m.provider,companyControlCompany(g,d.offer.issuer),p.companyShares.positions[d.offer.issuer].shares,g.cycle,companyShareParentReserve(plans[i],g));
  owner.companyControl.deals[index]=paid.record;p.financialGroup.parent=paid.parent;m.provider=paid.provider;m.expenses+=paid.fee;lines.push(p.name+' funded a one-month independent review delay. No shares were diluted.');
 }
 const ids=market.issuers.map(i=>i.id).sort(),rotation=g.cycle%ids.length;
 for(const issuer of ids.slice(rotation).concat(ids.slice(0,rotation))){
  const eligible=[];
  for(const [index,p]of g.players.entries())for(const d of p.companyControl.deals.filter(d=>d.status==='review'&&d.offer.issuer===issuer&&d.reviewMonth<=g.cycle)){
   const postPaymentPlan={...plans[index],companyShareOrders:[],companyControlPolicy:{...policy[index],diligence:null,defend:null,offer:null}},reserved=companyShareParentReserve(postPaymentPlan,g)+companyControlReserve(p,postPaymentPlan,g,{exclude:d.offer.id});
   const consents=policy.flatMap(p=>p.consents).filter(c=>c.offerId===d.offer.id),context=companyControlContext(g,p,issuer,reserved,consents);
   try{eligible.push({offer:d.offer,quote:CompanyControl.review(context,d.offer,d.diligence),record:d,context,player:p});}
   catch(error){d.status='cancelled';lines.push(p.name+' control offer cancelled at review: '+error.message);}
  }
  const winner=CompanyControl.choose(eligible,g.cycle,ids.indexOf(issuer));
  for(const e of eligible){
   if(e.offer.id!==winner){e.record.status='cancelled';lines.push(e.player.name+' was outbid for company control. Unspent purchase funds were released.');continue;}
   const acquisition=captureCompanyConsolidation(g,e.player,e.offer,e.quote.purchase);
   const settled=CompanyControlSettlement.close(e.record,e.context,{holders:[...g.players.map(p=>({id:p.id,book:p.financialGroup.parent,positions:p.companyShares.positions})),{id:'outside',book:market.outside.book,positions:market.outside.positions}],lender:m.lender,exchange:market.exchange});
   for(const p of g.players){const holder=settled.holders.find(h=>h.id===p.id);p.financialGroup.parent=holder.book;p.companyShares.positions=holder.positions;}
   const outside=settled.holders.find(h=>h.id==='outside');market.outside={book:outside.book,positions:outside.positions};market.exchange=settled.exchange;market.feesPaid+=settled.fees;m.lender=settled.lender;
   const index=e.player.companyControl.deals.findIndex(d=>d.offer.id===e.offer.id);e.player.companyControl.deals[index]=settled.record;
   if(acquisition)e.player.companyConsolidation.acquisitions[issuer]=acquisition;
   lines.push(e.player.name+' completed a funded controlling purchase. Six integration stages remain; existing company liabilities and banking relationships are unchanged.');
  }
 }
 for(const [i,p]of g.players.entries())if(policy[i].offer){
  const order=companyControlOrder(g,p,policy[i].offer),withoutNew={...plans[i],companyShareOrders:[],companyControlPolicy:{...policy[i],diligence:null,defend:null,offer:null}};
  const context=companyControlContext(g,p,order.issuer,companyShareParentReserve(withoutNew,g)+companyControlReserve(p,withoutNew,g));
  try{p.companyControl.deals.push(CompanyControlSettlement.pending(context,order,p.companyControl.diligence[order.issuer]));lines.push(p.name+' submitted a reviewed company control offer. It cannot close before next month.');}
  catch(error){lines.push(p.name+' could not submit its control offer after current settlements: '+error.message);}
 }
 for(const [i,p]of g.players.entries()){
  const latest=new Map();for(const d of p.companyControl.deals)if(d.status==='closed'&&p.companyShares.positions[d.offer.issuer].shares>50000&&(!latest.has(d.offer.issuer)||latest.get(d.offer.issuer).closedMonth<=d.closedMonth))latest.set(d.offer.issuer,d);
  const keep=d=>d.status==='review'||d.status==='closed'&&(d.loan.principalPaid<d.loan.original||d.loan.interestDue||d.integration.workDone<6||latest.get(d.offer.issuer)===d);
  const completed=p.companyControl.deals.filter(d=>!keep(d)).slice(-6);p.companyControl.deals=p.companyControl.deals.filter(d=>keep(d)||completed.includes(d));
  market.parentCashNet+=p.financialGroup.parent.accounts.cash-before[i];
 }
 m.month=g.cycle;return lines;
}
function advanceCompanyControlIntegration(g){
 if(g.companyControlVersion!==1)return [];
 const m=g.companyControlMarket,lines=[];
 for(const p of g.players){const before=p.financialGroup.parent.accounts.cash;let used=0;
  for(const d of p.companyControl.deals.filter(d=>d.status==='closed')){
   if(d.closedMonth===g.cycle)continue;
   const step=CompanyControlSettlement.integrate(p.financialGroup.parent,m.provider,d.integration,g.cycle,Math.max(0,executionCapacity(p)-used),p.companyControl.paused.includes(d.offer.id));
   p.financialGroup.parent=step.parent;m.provider=step.provider;m.expenses+=step.paid;d.integration=step.integration;used+=step.workUsed;
   if(step.workUsed)lines.push(p.name+' company integration completed stage '+d.integration.workDone+'/6 with funded work.');
  }
  p._companyControlExecutionUsed=used;g.companyShareMarket.parentCashNet+=p.financialGroup.parent.accounts.cash-before;
  p.companyControl.paused=p.companyControl.paused.filter(id=>p.companyControl.deals.some(d=>d.offer.id===id&&d.status==='closed'&&d.integration.workDone<6));
 }
 return lines;
}
