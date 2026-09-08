// Immediate announced-call advisory. The real stage runs on the full private
// owner, including accounting and credit books, never a partial balance sheet.
// Current calls read no rival/world data and consume no RNG; deferred
// consequences and operating effects are deliberately not executed here.
function decisionQuote(p, event, choice) {
  const announced = EVENTS.find(x => x.key === event?.key);
  if (!announced || !['a', 'b'].includes(choice)) throw Error('Choose a known executive call and response.');
  const owner = JSON.parse(JSON.stringify(p));
  owner.doctrine = typeof owner.doctrine === 'object' ? owner.doctrine.key : owner.doctrine;
  const before = { ...owner.stats }, accounts = owner.accounting && { ...owner.accounting.accounts }, sequence = owner.accounting?.sequence || 0;
  // A fresh stage identity cannot append into the active campaign ledger.
  // Funding sales reconcile cloned books; no outside balances are transferred.
  applyDecision({ event: announced }, owner, choice);
  const entries = owner.accounting?.journal.filter(x => x.id > sequence) || [];
  const changes = Object.fromEntries(Object.keys(OPENING_STATS).map(k => [k, owner.stats[k] - before[k]]).filter(([, n]) => n));
  const paid = accounts ? Math.max(0, -entries.filter(x => x.source === 'applyDecision' && x.changes.cash < 0).reduce((n, x) => n + x.changes.cash, 0)) : Math.max(0, before.cash - owner.stats.cash);
  const received = accounts ? entries.filter(x => x.source === 'applyDecision' && x.changes.cash > 0).reduce((n, x) => n + x.changes.cash, 0) : Math.max(0, owner.stats.cash - before.cash);
  return { choice, paid, received, cashChange: owner.stats.cash - before.cash, equityChange: owner.stats.capital - before.capital,
    cashAfter: owner.stats.cash, spendingLimitAfter: pilotSpendingLimit(owner), accounting: !!accounts,
    securitiesSold: accounts ? accounts.securities - owner.accounting.accounts.securities : 0,
    loansSold: accounts ? accounts.loans - owner.accounting.accounts.loans : 0,
    borrowed: owner.stats.emergencyDebt - before.emergencyDebt,
    fundingLoss: Math.max(0, -entries.filter(x => x.source.startsWith('sell.')).reduce((n, x) => n + x.earnings, 0)),
    changes, deferred: Object.keys(owner.turnEffects).length > 0 };
}

// Owner-only, reversible recovery choices. These estimates use existing prices
// and accounting; they neither change failure thresholds nor award catch-up cash.
function bankRecoveryReview(p, plan, economy, event) {
  if (!p.productPrograms || !p.accounting) return { supported:false, stressed:false };
  const owner = JSON.parse(JSON.stringify(p));
  owner.doctrine = typeof owner.doctrine === 'object' ? owner.doctrine.key : owner.doctrine;
  // Announced call cost includes any required asset-sale loss on a private copy.
  // Do not assume an expansion-call windfall or an unapproved board rescue.
  if (event && ['a','b'].includes(plan.decision)) applyDecision({ event }, owner, plan.decision);
  const decisionExpense = Math.max(0, p.stats.capital - owner.stats.capital);
  const forecast = operatingPreview({ ...p, focus:plan.focus || p.focus }, plan, economy);
  const budget = planBudget(p, plan), operatingSpend = (budget.advertising || 0) + (budget.training || 0) + (budget.relationshipOffers || 0) + (budget.onboarding || 0);
  // Campaign/training expense is already inside operating profit. It must not
  // be subtracted for a second time alongside projects, hiring and research.
  const nonOperatingSpend = budget.total - operatingSpend;
  const fundingLoss = forecast.fundingLoss || 0, netOperating = forecast.profit - fundingLoss;
  const equityAfterPlan = forecast.closingEquity - decisionExpense - nonOperatingSpend;
  const exposure = Math.max(1, forecast.capitalRatio && forecast.closingEquity
    ? forecast.closingEquity / forecast.capitalRatio * 100 : riskAssets(p) + (forecast.loanGrowth || 0));
  const reserve = exposure * .10 + 200000, headroom = equityAfterPlan - reserve;
  const household = householdServiceReview(p, plan.allocation, plan.householdPolicy || p.householdBook.policy);
  const serviceOwner = { ...p, allocation:plan.allocation, serviceDesk:{ ...p.serviceDesk, policy:plan.servicePolicy || p.serviceDesk.policy } };
  const service = serviceLoad(serviceOwner), demand = service.rows.reduce((n,row)=>n+row.load,0);
  const serviceCoverage = demand ? Math.min(service.capacity / demand, service.served / service.count) : 1;
  const capital = capitalRatio(p), projectedCapitalRatio = equityAfterPlan / exposure * 100;
  return { supported:true, stressed:capital < 10 || headroom < 0 || (netOperating < 0 && headroom < -netOperating * 6),
    capitalRatio:capital, projectedCapitalRatio, equityAfterPlan, exposure, reserve, headroom,
    profit:forecast.profit, fundingLoss, netOperating, decisionExpense, spend:budget.total,
    nonOperatingSpend, operatingSpend, netAfterSpend:netOperating - decisionExpense - nonOperatingSpend,
    householdCoverage:household.coverage, serviceCoverage, loanGrowth:forecast.loanGrowth, depositGrowth:forecast.depositGrowth,
    warnings:['Estimate excludes executive-call operating multipliers, regulatory deleveraging, delayed consequences, rival actions, future opportunities and board assistance.',
      'Capital and cash are different: a large deposit-funded cash balance does not absorb an equity loss.'] };
}
function recoveryDecisionSafe(p, plan, decision, event) {
  if (!event) return false;
  const s=p.stats, a=plan.allocation, u=p.upgrades, digital=strategyLevel(p,'digital'), ops=strategyLevel(p,'operations');
  const resilience=u.technology+u.training+u.operations+a.operations+digital*.45+ops*.7;
  // Compare to the consequence AFTER known operating workload. Generalist
  // allocation is conservative when specialists improve effective coverage.
  const doctrine=typeof p.doctrine==='object'?p.doctrine.key:p.doctrine;
  const workload=Math.max(0,5-a.service)+Math.max(0,2-a.operations);
  const moraleFloor=s.morale+Math.min(0,(doctrine==='people'?4:2)-workload);
  const reputationFloor=Math.max(0,s.reputation-6); // low service plus critical-capital penalty
  if (decision === 'a') {
    if (event.key === 'succession') return u.training >= 2 || moraleFloor >= 78;
    if (event.key === 'vendor') return resilience >= 6;
    return false;
  }
  if (['ratewar','viral','merger','closure'].includes(event.key)) return true;
  if (event.key === 'community') return s.influence >= 15;
  if (['staffing','talent','coffee'].includes(event.key)) return s.morale >= 55 && s.reputation >= 45;
  // Compliance can rise by seven from a Growth/Reinvest operating plan before
  // the finding resolves. Leave that known-policy buffer and avoid relying on
  // a cheap choice when the paid call may avert Corporate intervention.
  if (event.key === 'audit') return s.compliance+7 <= 28+a.operations*4+ops*2 && s.attention<90;
  if (event.key === 'cyber') return resilience >= 6;
  if (event.key === 'outage') return resilience >= 5;
  if (event.key === 'fintech') return reputationFloor+a.service*5+digital*3 >= 85;
  if (event.key === 'manager') return moraleFloor+a.operations*7 > 80;
  if (event.key === 'losses') return a.operations+a.lending >= 5;
  if (event.key === 'storm') return u.technology+digital >= 2;
  return false;
}
function bankRecoveryOptions(p, input, economy, event) {
  const current=bankRecoveryReview(p,input,economy,event), options=[];
  if (!current.supported) return { current, options };
  const copy=x=>JSON.parse(JSON.stringify(x));
  const add=(key,label,description,changes,plan) => {
    if (JSON.stringify(plan)===JSON.stringify(input)) return null;
    const review=bankRecoveryReview(p,plan,economy,event);
    if (review.netAfterSpend <= current.netAfterSpend+1000 || review.householdCoverage+1e-9 < Math.min(1.05,current.householdCoverage) ||
      review.serviceCoverage+1e-9 < Math.min(1,current.serviceCoverage)) return null;
    const option={key,label,description,changes,plan,review};options.push(option);return option;
  };
  const decision=input.decision==='a'?'b':'a';
  let frugal=null;
  if (recoveryDecisionSafe(p,input,decision,event)) {
    const plan=copy(input);plan.decision=decision;
    frugal=add('executive','Lower-cost executive response','Keep the operating plan; change only the announced executive response where existing resilience supports it.',
      ['Executive response → '+decision.toUpperCase()],plan);
  }
  const paused=copy(input), pausedChanges=[];
  if (planInitiatives(paused).length) {paused.newProjects=[];paused.newProject=null;pausedChanges.push('Unstarted initiatives → none');}
  if (Object.values(paused.investments||{}).some(Boolean)) {paused.investments={};pausedChanges.push('This month research → $0');}
  if (planHires(paused)) {paused.hires=0;if(paused.specialistHires)for(const role of Object.keys(paused.specialistHires))paused.specialistHires[role]=0;pausedChanges.push('New hires → none');}
  if (paused.competitiveAction && paused.competitiveAction!=='none') {paused.competitiveAction='none';pausedChanges.push('Competitive action → Hold position');}
  if (paused.advertisingPolicy?.budget) {paused.advertisingPolicy.budget=0;pausedChanges.push('Paid advertising → paused');}
  if (paused.relationshipOfferPolicy?.share) {paused.relationshipOfferPolicy.share=0;pausedChanges.push('Existing-customer offers → paused');}
  if (paused.onboardingPolicy?.share) {paused.onboardingPolicy.share=0;pausedChanges.push('Customer onboarding → paused (applications still expire)');}
  if (Object.values(paused.workforcePolicy?.training||{}).some(Boolean)) {for(const role of Object.keys(paused.workforcePolicy.training))paused.workforcePolicy.training[role]=0;pausedChanges.push('Training spend → paused');}
  if (paused.productProgramPolicy?.retire.length) {paused.productProgramPolicy.retire=[];pausedChanges.push('Product retirement → postponed');}
  if (pausedChanges.length) add('commitments','Pause discretionary commitments','Existing projects and signed business continue. This postpones unstarted spending; it does not refund earlier costs.',pausedChanges,paused);
  if (pausedChanges.length && frugal) {const combined=copy(paused);combined.decision=decision;add('combined','Preserve capital this month','Combine the lower-cost executive response and a pause on discretionary commitments.',[...pausedChanges,...frugal.changes],combined);}
  // Reassign at most two existing bankers. Do not starve the household book,
  // signed mandates, collections or Operations to manufacture a profit estimate.
  let staffing=null;
  for(const retention of [75,100])for(const moved of [1,2]) {
    if(input.allocation.service-moved<2)continue;
    const plan=copy(input);plan.allocation.service-=moved;plan.allocation.business+=moved;plan.householdPolicy.retention=retention;
    const coverage=householdServiceReview(p,plan.allocation,plan.householdPolicy).coverage;if(coverage<1.05)continue;
    const review=bankRecoveryReview(p,plan,economy,event);
    if(review.netAfterSpend>current.netAfterSpend+1000 && review.serviceCoverage+1e-9>=Math.min(1,current.serviceCoverage) && (!staffing || review.netAfterSpend>staffing.review.netAfterSpend))
      staffing={key:'staffing',label:'Rebalance existing staff',description:'Redirect spare Retail capacity to Business while maintaining household and signed-service coverage.',
        changes:[moved+' Retail banker'+(moved===1?'':'s')+' → Business','Household retention time → '+retention+'%'],plan,review};
  }
  if(staffing)options.push(staffing);
  return { current, options };
}
function planBankRecovery(g, index, input) {
  if(![1,2].includes(g.productProgramsVersion))return input;
  const p={...g.players[index],focus:input.focus,marketSnapshot:g.marketEconomy};
  const current=bankRecoveryReview(p,input,g.economy,g.event);if(!current.stressed)return input;
  const choices=bankRecoveryOptions(p,input,g.economy,g.event).options;
  choices.sort((a,b)=>b.review.netAfterSpend-a.review.netAfterSpend || a.key.localeCompare(b.key));
  return choices[0]?.plan || input;
}
