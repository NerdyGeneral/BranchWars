'use strict';
// Derived owner-only bank earnings reconciliation; never saved or settled.
// Input must be the already-validated, owner-only publicState projection. Its
// causal history is prefix-pruned, never sampled: a surviving resolution root
// therefore establishes coverage through the final operations.result fence.
// This is not an import validator or an authenticity check for arbitrary JSON.
const BankEarningsBridge = (() => {
  const unavailable = reason => ({available:false,reason});
  const int = Number.isSafeInteger;
  const sources = {
    'departments.dispatch':'deliverDepartmentFunctions','departments.functions':'prepareDepartmentFunctions','departments.delivery':'finishDepartmentFunctions',
    'facilities.lifecycle':'prepareFacilityLifecycle','facilities.renovation':'advanceFacilityLifecycle','facilities.maintenance':'settleFacilityLifecycle','facilities.renewal':'activateFacilityLifecycle',
    'facilities.instructions':'prepareFacilityInstructions','facilities.progress':'advanceFacilityInstructions','facilities.activation':'activateFacilityInstructions',
    'departments.leadership':'settleDepartmentLeadership','departments.experience':'settleDepartmentExperience',
    'group.agency':'settleAgency','companies.settlement':'settleCorporateEconomy','companies.contracts':'finishCorporateEconomy','group.capital':'settleGroupCapital','group.portfolio':'applyGroupPortfolio',
    'customers.onboarding':'applyOnboardingPolicy','customers.offers':'applyRelationshipOfferPolicy','economy.external':'settleRegionalGrowth','advertising.policy':'applyAdvertisingPolicy','products.policy':'applyProductProgramPolicy',
    decision:'applyDecision','capital.assistance':'applyCapitalRequest','competition.actions':'resolveCompetitiveActions','project.start':'startProject',operations:'operate','funding.deleverage':'deleverage',
    'competition.deposits':'depositContest','funding.settlement':'settleFunding',relationships:'resolveOpportunities','markets.competition':'simulateMarkets','markets.exit':'resolveMarketExits','markets.dividend':'franchiseDividends',
    'project.advance':'advanceProjects','risk.consequences':'consequences','research.investment':'applyInvestments','staff.hiring':'applyHiring','staff.training':'settleWorkforceTraining',milestones:'awardMilestones','campaign.ending':'evaluateStrategicEnd'
  };
  function reviewBankEarningsBridge(v) {
    const p=v?.me, report=p?.operatingReport, cycle=report?.cycle;
    if(!p?.accounting)return unavailable('Bank accounting is not enabled for this campaign.');
    if(!int(cycle)||cycle<1)return unavailable('Complete a month to see the earnings bridge.');
    if(!int(v.cycle)||cycle!==(v.gameOver?v.cycle:v.cycle-1)||!int(v.resolutionId)||v.resolutionId<1)
      return unavailable('The completed report does not match this campaign snapshot.');
    const closing=p.accounting.retainedEarnings;
    if(!int(closing)||p.stats?.earnings!==closing||!int(report.profit))return unavailable('The bank report and retained-earnings balance do not reconcile.');
    const events=v.causalEvents, operating=v.operatingEvents;
    if(!Array.isArray(events)||!Array.isArray(operating))return unavailable('Complete owner history is unavailable for this month.');
    let previous=0;
    for(const e of events){
      if(!e||!int(e.id)||e.id<=previous||e.target!==p.id||e.visibility!=='owner'||!int(e.cycle)||e.cycle<1||e.cycle>cycle)
        return unavailable('Owner history is inconsistent; the bridge is unavailable.');
      previous=e.id;
    }
    if(v.causalView && v.causalView.firstIncludedId!==(events[0]?.id||null))return unavailable('Owner history coverage metadata does not match.');
    const current=events.filter(e=>e.cycle===cycle), roots=current.filter(e=>e.category==='resolution.start');
    if(roots.length!==1)return unavailable('This month’s opening marker is outside the retained owner history. No opening balance has been reconstructed.');
    const root=roots[0];
    if(current[0]!==root||root.source!=='resolveCycle'||root.resolutionId!==v.resolutionId||root.deltas||root.parentCause!==undefined||!int(v.ledgerPrunedThrough??0)||(v.ledgerPrunedThrough||0)>=root.id)
      return unavailable('This month’s opening marker does not match the completed resolution.');
    const fences=operating.filter(e=>e?.cycle===cycle);
    if(fences.length!==1)return unavailable('The completed operating report fence is unavailable.');
    const fence=fences[0];
    if(fence.target!==p.id||fence.visibility!=='owner'||fence.category!=='operations.result'||fence.source!=='operate'||!int(fence.id)||fence.id<=previous||fence.report?.cycle!==cycle||fence.report.profit!==report.profit)
      return unavailable('The completed operating report does not match owner history.');
    let change=0;
    for(const e of current.slice(1)){
      if(sources[e.category]!==e.source||e.parentCause!==root.id||!e.deltas||Array.isArray(e.deltas)||typeof e.deltas!=='object'||!Object.values(e.deltas).every(Number.isFinite)||!e.changes||Array.isArray(e.changes))
        return unavailable('A monthly earnings event is inconsistent; the bridge is unavailable.');
      const amount=e.deltas.earnings??0;
      if(!int(amount)||!int(change+amount))return unavailable('A monthly earnings amount is invalid.');
      change+=amount;
    }
    const openingEarnings=closing-change, otherNet=change-report.profit;
    if(!int(openingEarnings)||!int(otherNet))return unavailable('The earnings bridge exceeds supported amounts.');
    return {available:true,cycle,opening:openingEarnings,operatingProfit:report.profit,otherNet,change,closing,rootId:root.id,fenceId:fence.id};
  }
  // Engine-public projection. Call only after normal campaign
  // validation, before UI history byte pruning; no journal reconstruction,
  // new saved book, or resource/earnings calculation is introduced here.
  function projectBankEarningsBridge(g,seat){
    if(![6,7].includes(g?.financialGroupVersion))return null;
    const p=g.players?.[seat];
    if(!p?.accounting)return null;
    const ownerEvents=Array.isArray(g.eventLedger)?g.eventLedger.filter(e=>e?.target===p.id):[];
    const v={cycle:g.cycle,gameOver:g.gameOver,resolutionId:g.resolutionId,ledgerPrunedThrough:g.ledgerPrunedThrough,
      me:{id:p.id,accounting:{retainedEarnings:p.accounting.retainedEarnings},stats:{earnings:p.stats?.earnings},operatingReport:p.operatingReport},
      causalEvents:ownerEvents.filter(e=>e.deltas||e.category==='resolution.start'),
      operatingEvents:ownerEvents.filter(e=>e.category==='operations.result')};
    const b=reviewBankEarningsBridge(v);
    // Whitelist only identity, finite earnings amounts and a fixed explanation.
    // Never publish stage deltas, changes, parent books or rival information.
    return {version:1,ownerId:p.id,resolutionId:g.resolutionId,
      ...(b.available?{available:true,cycle:b.cycle,opening:b.opening,operatingProfit:b.operatingProfit,otherNet:b.otherNet,change:b.change,closing:b.closing}:{available:false,reason:b.reason})};
  }
  return Object.freeze({review:reviewBankEarningsBridge,project:projectBankEarningsBridge});
})();
