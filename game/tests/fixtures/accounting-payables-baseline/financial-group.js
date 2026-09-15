// Versioned group capital and bank portfolio boundary. Never upgrades old games.
const GROUP_SAFEGUARDS = Object.freeze({ capitalRatio: .10, depositCash: .05, subsidiaryReserveMonths: 3 });
const CREDIT_ALLOCATION_STEPS = Object.freeze([0,25,50,75,100]);
function initializeFinancialGroup(g, options) {
  if (![1,2,3].includes(options.financialGroupVersion)) return;
  g.financialGroupVersion = options.financialGroupVersion;
  for (const p of g.players) {
    const parent = GroupAccounting.post(GroupAccounting.opening(p.id + ':parent'), 'opening.bankOwnership',
      p.id, { investments: p.stats.capital, equity: p.stats.capital });
    p.financialGroup = { version: 1, parent, report: null };
    p.creditPortfolio = { version: 1, allocation: Object.fromEntries(Object.keys(CREDIT_TERMS).map(k=>[k,k===p.products.credit?100:0])) };
  }
}
function validateCreditAllocation(allocation) {
  if (!allocation || Array.isArray(allocation) || Object.keys(allocation).sort().join() !== Object.keys(CREDIT_TERMS).sort().join() ||
      Object.values(allocation).some(n=>!CREDIT_ALLOCATION_STEPS.includes(n)) ||
      Object.values(allocation).reduce((sum,n)=>sum+n,0)!==100) throw Error('Lending allocations must total 100% in 25-point steps.');
}
function groupCapitalQuote(p) {
  if (!p.financialGroup) return null;
  const minimumCapital = Math.ceil(riskAssets(p)*GROUP_SAFEGUARDS.capitalRatio);
  const minimumCash = Math.ceil(p.stats.deposits*GROUP_SAFEGUARDS.depositCash);
  const restricted = p.stats.emergencyDebt>0 || p.capitalRestriction>0 || tierRank(p)>=2 ||
    (p.fundingCovenant && (p.fundingCovenant.streak>0||fundingPosition(p).excess>0));
  return { minimumCapital, minimumCash, restricted,
    dividendLimit: restricted?0:Math.max(0,Math.min(p.accounting.retainedEarnings,p.stats.cash-minimumCash,p.stats.capital-minimumCapital)),
    supportLimit: p.financialGroup.parent.accounts.cash };
}
function defaultGroupPlan(p) {
  return { bankDividend: 0, bankSupport: 0, creditAllocation: {...p.creditPortfolio.allocation} };
}
function normalizeGroupPlan(p, plan) {
  if (!p.financialGroup) {
    if (plan.groupPolicy!==undefined) throw Error('Financial Group instructions require the preview campaign.');
    return;
  }
  if (plan.groupPolicy===undefined) plan.groupPolicy=defaultGroupPlan(p);
  const policy=plan.groupPolicy;
  if (!policy || Array.isArray(policy) || Object.keys(policy).sort().join()!=='bankDividend,bankSupport,creditAllocation' ||
      !Number.isSafeInteger(policy.bankDividend)||policy.bankDividend<0||
      !Number.isSafeInteger(policy.bankSupport)||policy.bankSupport<0 ||
      (policy.bankDividend>0&&policy.bankSupport>0)) throw Error('Choose one funded bank/parent capital direction per month.');
  validateCreditAllocation(policy.creditAllocation);
  const quote=groupCapitalQuote(p);
  if(policy.bankDividend>quote.dividendLimit||policy.bankSupport>quote.supportLimit)
    throw Error('Group transfer exceeds current unreserved cash, retained earnings or capital safeguards.');
}
function applyGroupPortfolio(p, plan) {
  if(p.financialGroup&&plan.groupPolicy)p.creditPortfolio.allocation={...plan.groupPolicy.creditAllocation};
}
function settleGroupCapital(g, plans) {
  if(![1,2,3].includes(g.financialGroupVersion))return [];
  const lines=[];
  for(const [index,p] of g.players.entries()) {
    const policy=plans[index].groupPolicy,quote=groupCapitalQuote(p);
    const dividend=Math.min(policy.bankDividend,quote.dividendLimit),support=Math.min(policy.bankSupport,quote.supportLimit);
    const before=GroupAccounting.consolidate(p.financialGroup.parent,groupEntities(p),p.accounting);
    if(dividend) {
      const moved=GroupAccounting.bankDividend(p.accounting,p.financialGroup.parent,dividend,quote);
      p.accounting=moved.bank;p.financialGroup.parent=moved.parent;syncAccounts(p);
    }
    if(support) {
      const moved=GroupAccounting.capitalizeBank(p.accounting,p.financialGroup.parent,support);
      p.accounting=moved.bank;p.financialGroup.parent=moved.parent;syncAccounts(p);
      if(p.agency)p.financialGroup.investmentBasis.bank+=support;
      // Consequences assessed critical capital earlier in the month. A paid
      // injection that actually cures it must update that same failure streak
      // before the final resolution check. Funding-covenant debt is not forgiven.
      if(p.distress&&capitalTier(p).key!=='failing'){
        p.distress=0;
        lines.push(p.name+' restored non-critical bank capital with funded parent support before the final resolution check.');
      }
    }
    const after=GroupAccounting.consolidate(p.financialGroup.parent,groupEntities(p),p.accounting);
    if(after.equity!==before.equity||after.retainedEarnings!==before.retainedEarnings)throw Error('Group capital transfer created earnings.');
    p.financialGroup.report={cycle:g.cycle,requestedDividend:policy.bankDividend,dividend,requestedSupport:policy.bankSupport,support};
    if(dividend||support)lines.push(p.name+' moved $'+(dividend||support).toLocaleString()+
      (dividend?' from retained bank profit to its parent.':' from parent cash into bank equity.')+' This is not group profit.');
    if(dividend!==policy.bankDividend||support!==policy.bankSupport)lines.push(p.name+' group transfer was reduced after current obligations and safeguards were rechecked.');
  }
  return lines;
}
function validateFinancialGroupPlayer(p, cycle, validateIntent = false) {
  const f=p.financialGroup,c=p.creditPortfolio;
  if(!f||Object.keys(f).sort().join()!==(p.agency?'investmentBasis,parent,report,version':'parent,report,version')||f.version!==(p.agency?2:1)||
      !c||c.version!==1||Object.keys(c).sort().join()!=='allocation,version')throw Error('Invalid Financial Group state.');
  GroupAccounting.validate(f.parent);validateCreditAllocation(c.allocation);
  if(f.parent.entityId!==p.id+':parent')throw Error('Financial Group parent belongs to another institution.');
  if(['businessAssets','custodyAssets','debt','payables','custodyLiabilities'].some(key=>f.parent.accounts[key]!==0))
    throw Error('Unsupported parent assets or obligations for this group rules version.');
  if(f.report!==null) {
    const r=f.report;
    if(!r||Object.keys(r).sort().join()!=='cycle,dividend,requestedDividend,requestedSupport,support'||
      !Number.isSafeInteger(r.cycle)||r.cycle<1||r.cycle>cycle||
      ['requestedDividend','dividend','requestedSupport','support'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)||
      r.dividend>r.requestedDividend||r.support>r.requestedSupport)throw Error('Invalid group capital report.');
  }
  if(validateIntent&&p.submitted){if(!p.submitted.groupPolicy)throw Error('Saved group plan has no portfolio instructions.');normalizeGroupPlan(p,JSON.parse(JSON.stringify(p.submitted)));}
}
function validateFinancialGroupSave(g) {
  if(g.financialGroupVersion===undefined) {
    if(g.players.some(p=>p.financialGroup!==undefined||p.creditPortfolio!==undefined))throw Error('Unversioned Financial Group state.');
    return;
  }
  if(![1,2,3].includes(g.financialGroupVersion))throw Error('Unsupported Financial Group version.');
  for(const p of g.players) {
    if(p.financialGroup?.version!==(g.financialGroupVersion===3?2:1))throw Error('Group entity rules do not match the campaign.');
    validateFinancialGroupPlayer(p,g.cycle,true);
    GroupAccounting.consolidate(p.financialGroup.parent,groupEntities(p),p.accounting);
  }
}
function projectFinancialGroup(g,out,index) {
  if(![1,2,3].includes(g.financialGroupVersion))return;
  out.financialGroupVersion=g.financialGroupVersion;
  const me=g.players[index],rival=g.players[1-index];
  out.me.financialGroup=JSON.parse(JSON.stringify(me.financialGroup));
  out.me.creditPortfolio=JSON.parse(JSON.stringify(me.creditPortfolio));
  out.me.groupCapitalQuote=groupCapitalQuote(me);
  out.me.groupSummary=GroupAccounting.consolidate(me.financialGroup.parent,groupEntities(me),me.accounting);
  const publicTotals=GroupAccounting.consolidate(rival.financialGroup.parent,groupEntities(rival),rival.accounting);
  out.rival.groupSummary={equity:publicTotals.equity,assets:publicTotals.assets,customerAssets:publicTotals.custodyAssets};
  if(out.lastPlans?.[rival.id])delete out.lastPlans[rival.id].groupPolicy;
  projectCorporateEconomy(g,out,index);
  projectAgency(g,out,index);
}
function validateFinancialGroupView(view) {
  validateCorporateView(view);
  validateAgencyView(view);
  if(view.me?.accounting&&view.me.accounting.version!==([2,3].includes(view.financialGroupVersion)?2:1))
    throw Error('Unsupported bank accounting view for the current campaign rules.');
  if(![1,2,3].includes(view.financialGroupVersion)) {
    if(view.me?.financialGroup!==undefined||view.me?.creditPortfolio!==undefined||view.rival?.groupSummary!==undefined)
      throw Error('Unversioned Financial Group view.');
    return;
  }
  validateFinancialGroupPlayer(view.me,view.cycle);
  if(view.rival.financialGroup!==undefined||view.rival.creditPortfolio!==undefined)throw Error('Private rival group state exposed.');
  if(view.lastPlans?.[view.rival.id]?.groupPolicy!==undefined)throw Error('Private rival capital instructions exposed.');
  const expected=GroupAccounting.consolidate(view.me.financialGroup.parent,groupEntities(view.me),view.me.accounting);
  if(!view.me.groupSummary||Object.keys(view.me.groupSummary).sort().join()!==Object.keys(expected).sort().join()||
      Object.keys(expected).some(key=>view.me.groupSummary[key]!==expected[key]))throw Error('Owner group totals do not reconcile.');
  const summary=view.rival.groupSummary;
  if(!summary||Object.keys(summary).sort().join()!=='assets,customerAssets,equity'||
      !Number.isSafeInteger(summary.equity)||!Number.isSafeInteger(summary.assets)||summary.assets<0||
      !Number.isSafeInteger(summary.customerAssets)||summary.customerAssets<0)throw Error('Invalid public group totals.');
}
function creditProductionParts(p,g,amount) {
  if(!p.creditPortfolio)return [{principal:amount,...creditTerms(p,g)}];
  const weights=Object.fromEntries(Object.entries(p.creditPortfolio.allocation).map(([k,n])=>[k,n*PRODUCT_PORTFOLIOS.credit.options[k].loans]));
  return Object.entries(marketSplit(amount,weights)).filter(([,n])=>n>0).map(([product,principal])=>({principal,...creditTerms(p,g,product)}));
}
function portfolioCreditOption(p) {
  const result={};
  for(const [product,allocation] of Object.entries(p.creditPortfolio.allocation))for(const [key,value]of Object.entries(PRODUCT_PORTFOLIOS.credit.options[product]))
    if(typeof value==='number')result[key]=(result[key]||0)+value*allocation/100;
  return result;
}
// This is a scenario, not a second loan book or a promise of future returns.
// Reuse the existing aging/cure/loss rules and scheduled amortization; assume
// today's economy, staff, collections mandate and fixed origination terms for
// 24 months, without future new production or speculative event benefits.
function groupFutureCreditValue(source,economy,plan,terms) {
  const p=JSON.parse(JSON.stringify(source)),market=Object.keys(p.marketBook.markets)[0];
  p.allocation={...plan.allocation};p.creditPerformance.policy={...plan.collectionsPolicy};p.turnEffects={};
  const added={market,principal:1000000,...terms,late:[0,0,0],seasoning:2};
  p.creditBook.cohorts.push(added);
  let value=0,loss=0,interest=0;
  for(let month=0;month<24;month++) {
    const forecast=creditPerformanceForecast(p,economy,p.allocation,plan.collectionsPolicy);
    const move=forecast.moves[p.creditBook.cohorts.indexOf(added)];
    for(const [i,c] of p.creditBook.cohorts.entries()) {
      const m=forecast.moves[i];c.principal-=m.resolved;c.late=m.late;c.seasoning=Math.max(0,c.seasoning-1);
      const repayment=Math.min(performingCredit(c),Math.ceil(performingCredit(c)/c.remaining));
      c.principal-=repayment;c.remaining=Math.max(1,c.remaining-1);
    }
    const coupon=performingCredit(added)*added.rate/1000000;
    const caseCost=(move.cured+move.resolved)*COLLECTION_APPROACHES[plan.collectionsPolicy.approach].cost/1000000;
    interest+=coupon;loss+=move.loss;
    value+=(coupon-move.loss-caseCost)/(1+Math.max(0,economy.rate)/1200)**(month+1);
  }
  return {monthlyPerDollar:value/24/1000000,interestPerDollar:interest/1000000,lossPerDollar:loss/1000000};
}
function groupLendingComparison(p,input,economy) {
  if(!p.financialGroup)throw Error('Lending comparison requires Financial Group rules.');
  const plan=JSON.parse(JSON.stringify(input));normalizeGroupPlan(p,plan);
  const keys=Object.keys(CREDIT_TERMS),owner={...p,allocation:plan.allocation,
    policies:{...p.policies,lending:plan.lendingPolicy},products:plan.products};
  const future=Object.fromEntries(keys.map(key=>[key,groupFutureCreditValue(owner,economy,plan,creditTerms(owner,{economy},key))]));
  const candidates=[{...plan.groupPolicy.creditAllocation},{...p.creditPortfolio.allocation}];
  for(const key of keys)candidates.push(Object.fromEntries(keys.map(k=>[k,k===key?100:0])));
  for(const omitted of keys)candidates.push(Object.fromEntries(keys.map(k=>[k,k===omitted?0:50])));
  candidates.push(Object.fromEntries(keys.map(k=>[k,k===plan.products.credit?50:25])));
  const rows=[],seen=new Set();
  for(const allocation of candidates) {
    const signature=keys.map(k=>allocation[k]).join();if(seen.has(signature))continue;seen.add(signature);
    const candidate={...plan,groupPolicy:{...plan.groupPolicy,creditAllocation:allocation}};
    const forecast=operatingPreview(p,candidate,economy);
    const originations=Math.round(Math.max(0,forecast.loanGrowth+(forecast.principalRepaid||0)+
      (forecast.creditRecovery||0)+(forecast.chargeoff||0)));
    const parts=creditProductionParts({...owner,creditPortfolio:{version:1,allocation}},{economy},originations);
    const currentCoupon=parts.reduce((n,c)=>n+c.principal*c.rate/1000000,0);
    const futureContribution=parts.reduce((n,c)=>n+c.principal*future[c.product].monthlyPerDollar,0);
    const projectedLoss=parts.reduce((n,c)=>n+c.principal*future[c.product].lossPerDollar,0);
    rows.push({allocation:{...allocation},originations,profit:forecast.profit,capitalRatio:forecast.capitalRatio,
      futureContribution,projectedLoss,utility:forecast.profit-currentCoupon+futureContribution-
        Math.max(0,10-forecast.capitalRatio)*50000});
  }
  return {horizon:24,rows};
}
function planFinancialGroup(g,index,plan) {
  const p=g.players[index];if(!p.financialGroup)return plan;
  plan.groupPolicy=defaultGroupPlan(p);
  const comparison=groupLendingComparison({...p,marketSnapshot:g.marketEconomy},plan,g.economy);
  let best=null;
  for(const row of comparison.rows)if(best===null||row.utility>best.utility+.01)best=row;
  plan.groupPolicy.creditAllocation={...best.allocation};
  return plan;
}
