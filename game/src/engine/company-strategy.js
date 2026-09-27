// Current unpublished ownership campaigns only. Public issuer statements and
// the owner's actual cash determine orders; no rival draft or private books.
function companyShareStrategyReview(v,input){
 if(v.companySharesVersion!==1)throw Error('Company strategy requires ownership rules.');
 const plan=investmentCopy(input),p=v.me,s=v.companyShareSnapshot;
 plan.companyShareOrders=[];
 const protectedCash=companyShareParentReserve(plan)+(v.companyControlStrategyVersion===1?companyControlReserve(p,plan,v):0),available=Math.max(0,p.financialGroup.parent.accounts.cash-protectedCash);
 const positions=p.companyShares.positions,basis=Object.values(positions).reduce((n,x)=>n+x.basis,0);
 const cashFloor=50000,portfolioLimit=Math.floor((available+basis)*.25);
 const rows=p.companySnapshot.world.companies.map(c=>{
  const i=s.issuers.find(i=>i.id===c.id),history=s.history[c.id],recent=history.slice(-3),average=recent.length?recent.reduce((n,x)=>n+x,0)/recent.length:0;
  return {c,i,average,bad:recent.length===3&&recent.every(n=>n<0),position:positions[c.id],ask:s.outsideQuotes.find(q=>q.issuer===c.id&&q.side==='sell'),bid:s.outsideQuotes.find(q=>q.issuer===c.id&&q.side==='buy')};
 });
 // Raise liquidity or leave persistently deteriorating holdings. Sales are not
 // assumed to finance a buy, capital contribution or standing support today.
 const integrating=id=>p.companyControl?.deals.some(d=>d.status==='closed'&&d.offer.issuer===id&&d.integration.workDone<6);
 // A reviewed acquisition is a committed operating investment. Complete its
 // six integration stages before treating a short loss streak as a trading
 // exit, unless actual parent liquidity is already under pressure.
 const sell=rows.filter(r=>r.position.shares&&r.bid&&!r.i.suspended&&(v.companyControlStrategyVersion!==1||r.position.shares<=50000||r.bad&&!integrating(r.c.id)||available<cashFloor)&&(r.bad||available<cashFloor||basis>portfolioLimit*1.5))
  .sort((a,b)=>Number(b.bad)-Number(a.bad)||b.position.basis-a.position.basis||a.c.id.localeCompare(b.c.id))[0];
 if(sell){plan.companyShareOrders=[{issuer:sell.c.id,side:'sell',shares:Math.min(sell.position.shares,sell.bid.shares),limitCents:sell.bid.limitCents}];
  normalizeCompanySharePlan(v,p,plan);return {plan,reason:sell.bad?'Reduce a persistently loss-making holding.':'Restore parent liquidity or reduce concentrated portfolio risk.'};}
 const development=investmentStrategyReview(v,plan);
 const saving=development.savingForLaunch?development.targetCapital:0;
 let budget=Math.floor(Math.min(Math.max(0,available-cashFloor-saving),Math.max(0,portfolioLimit-basis),available*.1));
 if(budget<1000||groupCapitalQuote(p).restricted)return {plan,reason:'Keep parent liquidity and committed subsidiary capital available.'};
 const candidates=rows.filter(r=>r.average>0&&r.ask&&!r.i.suspended&&r.c.book.accounts.payables===0&&r.position.shares<5000&&r.ask.limitCents<=Math.ceil(r.i.referenceCents*1.03))
  .sort((a,b)=>b.average/Math.max(1,b.i.referenceCents)-a.average/Math.max(1,a.i.referenceCents)||a.c.id.localeCompare(b.c.id));
 const pick=candidates[0];
 if(!pick)return {plan,reason:'No affordable, profitable company quote fits the portfolio.'};
 let shares=Math.min(1000,pick.ask.shares,5000-pick.position.shares,Math.floor(budget*100/(pick.ask.limitCents*1.0025)));
 while(shares>0){const cost=Math.ceil(shares*pick.ask.limitCents/100);if(cost+Math.ceil(cost*.0025)<=budget)break;shares--;}
 if(shares)plan.companyShareOrders=[{issuer:pick.c.id,side:'buy',shares,limitCents:pick.ask.limitCents}];
 normalizeCompanySharePlan(v,p,plan);
 return {plan,reason:shares?'Buy a bounded minority stake using public earnings and existing parent cash.':'Preserve cash; the quoted lot is not affordable.'};
}
function planCompanyStrategy(g,index,plan){
 if(g.companySharesVersion!==1)return plan;
 const v=root.BWEngine.publicState(g,index);
 if(g.companyControlStrategyVersion===1){
  plan=companyControlStrategyReview(v,plan).plan;
  const policy=plan.companyControlPolicy;
  if(policy.diligence||policy.offer||policy.consents.length||v.me.companyControl.deals.some(d=>d.status==='review'))return plan;
 }
 return companyShareStrategyReview(v,plan).plan;
}
function groupDevelopmentReview(v,input){
 if(v.companySharesVersion!==1)return {plan:input,reason:'Historical bank-development policy unchanged.'};
 const review=investmentStrategyReview(v,input),p=v.me;
 if(!review.savingForLaunch||v.cycle<6)return {plan:input,reason:'No current investment-business savings target.'};
 const plan=investmentCopy(input);
 // Retained bank earnings, not its cash balance, authorize parent dividends.
 // Stop initiating discretionary capital consumption while saving for a chosen
 // business. Existing projects, hires, service work and risk remediation stay.
 plan.investments={};
 plan.newProjects=planInitiatives(plan).filter(key=>key==='remediation'||DigitalCommercial.enabled(p)&&key==='buildTreasuryDesk'&&DigitalCommercial.combined(p));
 plan.newProject=plan.newProjects[0]||null;
 if(plan.projectTargets)plan.projectTargets=Object.fromEntries(Object.entries(plan.projectTargets).filter(([key])=>plan.newProjects.includes(key)));
 if(plan.facilityExtensionPolicy)plan.facilityExtensionPolicy={...plan.facilityExtensionPolicy,start:null};
 return {plan,reason:'Retain bank profits for a funded investment business before starting more discretionary research or construction.',targetCapital:review.targetCapital,retainedEarnings:p.accounting.retainedEarnings};
}
function planGroupDevelopment(g,index,plan){
 if(g.companySharesVersion!==1)return plan;
 return groupDevelopmentReview(root.BWEngine.publicState(g,index),plan).plan;
}

