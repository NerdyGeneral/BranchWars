// Credit performance v1: principal-at-risk buckets, not individual borrower invoices.
const COLLECTION_APPROACHES = {
  workout: { name: 'Relationship workout', early: .55, late: .30, resolve: .12, severity: .30, cost: 2500 },
  balanced: { name: 'Balanced collections', early: .35, late: .18, resolve: .24, severity: .50, cost: 1800 },
  recovery: { name: 'Accelerated recovery', early: .15, late: .05, resolve: .50, severity: .70, cost: 1200 }
};
function defaultCollectionsPolicy() { return { share: 25, approach: 'balanced' }; }
function limitCreditHistoryView(out) {
  // Keep the authoritative retained journal and every owned loan intact. Only
  // the already-limited historical projection gets a UTF-8 byte budget.
  const events=out.causalEvents, maxBytes=256*1024;
  let bytes=2,first=events.length;
  for(let i=events.length-1;i>=0;i--){
    const size=encodeURIComponent(JSON.stringify(events[i])).replace(/%[0-9A-F]{2}/g,'x').length;
    const next=bytes+size+(first<events.length?1:0);if(next>maxBytes)break;
    bytes=next;first=i;
  }
  out.causalEvents=events.slice(first);
  out.causalView={maxBytes,omittedFromLatest200:first,firstIncludedId:out.causalEvents[0]?.id||null};
}
function validateCollectionsPolicy(policy) {
  if (!policy || Object.keys(policy).sort().join() !== 'approach,share' ||
      ![0,25,50,75,100].includes(policy.share) || !Object.hasOwn(COLLECTION_APPROACHES, policy.approach))
    throw Error('Choose a valid Lending time share and collections approach.');
  return policy;
}
function normalizeCollectionsPlan(p, plan) {
  if (!p.creditPerformance) {
    if (plan.collectionsPolicy !== undefined) throw Error('Collections requires a new credit performance campaign.');
    return;
  }
  plan.collectionsPolicy = JSON.parse(JSON.stringify(validateCollectionsPolicy(plan.collectionsPolicy || p.creditPerformance.policy)));
}
function applyCollectionsPolicy(p, policy) {
  if (p.creditPerformance) p.creditPerformance.policy = JSON.parse(JSON.stringify(validateCollectionsPolicy(policy || p.creditPerformance.policy)));
}
function initializeCreditPerformance(g, o) {
  if (o.creditPerformanceVersion !== 1) return g;
  if (g.customerOwnershipVersion !== 1) throw Error('Credit performance requires the household ownership preview and its prerequisites.');
  g.creditPerformanceVersion = 1; g.version = '8.7';
  for (const p of g.players) {
    p.creditPerformance = { version: 1, lastCycle: 0, policy: defaultCollectionsPolicy(), report: null };
    for (const c of p.creditBook.cohorts) {
      c.late = [0,0,0]; c.seasoning = 0;
      c.risk = Math.max(1, Math.round(c.risk * originationCreditGuard(p)));
    }
  }
  return g;
}
function originationCreditGuard(p) {
  return Math.max(.28, 1 - (workforceAllocation(p).operations + p.upgrades.training + p.upgrades.operations + strategyLevel(p,'operations')*.65)*.075) *
    (hasSpecialization(p,'operations','resilience') ? .82 : 1) * (productOption(p,'business').risk || 1) *
    (hasSpecialization(p,'commercial','specializedCredit') ? 1.08 : 1);
}
function performingCredit(c) { return c.principal - (c.late ? c.late.reduce((n,x) => n+x,0) : 0); }
function creditSaleHaircut(p, baseBps) {
  if(!p.creditPerformance)return baseBps;
  const principal=p.creditBook.cohorts.reduce((n,c)=>n+c.principal,0);
  // A proportional forced sale carries the old book's distress, not the current mandate.
  // Defaulted loans cannot be converted to near-par cash by triggering withdrawals.
  const distress=p.creditBook.cohorts.reduce((n,c)=>n+c.late[0]*1000+c.late[1]*3000+c.late[2]*7000,0);
  return baseBps+(principal?Math.round(distress/principal):0);
}
function creditSalesStaff(p, staff) { return p.creditPerformance ? staff * (1 - p.creditPerformance.policy.share/100) : staff; }
function collectionsReview(p, allocation = p.allocation, policy = p.creditPerformance?.policy) {
  if (!p.creditPerformance) return null;
  validateCollectionsPolicy(policy);
  const staff = allocation.lending + specialistBonus(p,'lending',allocation), capacity = staff * policy.share/100;
  const late = [0,1,2].map(i => p.creditBook.cohorts.reduce((n,c) => n+c.late[i],0)), demand = late.reduce((n,x) => n+x,0)/1000000;
  return { late, demand, capacity, coverage: demand ? Math.min(1,capacity/demand) : 1,
    salesStaff: staff-capacity, performing: p.creditBook.cohorts.reduce((n,c) => n+performingCredit(c),0),
    fundingHaircut:creditSaleHaircut(p,600),regulatoryHaircut:creditSaleHaircut(p,700) };
}
function creditPerformanceForecast(p, economy, allocation = p.allocation, policy = p.creditPerformance?.policy) {
  const review = collectionsReview(p,allocation,policy);
  if (!review) return null;
  const def = COLLECTION_APPROACHES[policy.approach], rows = Object.fromEntries(Object.keys(p.marketBook.markets).map(k =>
    [k,{ entered:0,cured:0,resolved:0,recovered:0,loss:0,cost:0 }]));
  const moves = p.creditBook.cohorts.map(c => {
    const [early,late,nonperforming] = c.late;
    const cured = [Math.floor(early*def.early*review.coverage), Math.floor(late*def.late*review.coverage)];
    const resolved = Math.min(nonperforming,Math.ceil(nonperforming*def.resolve*(.25+.75*review.coverage)));
    const loss = Math.round(resolved*def.severity), recovered = resolved-loss;
    const incidence = Math.min(.04, .006*c.risk/10000*(economy?.credit || 1)*(p.turnEffects.credit || 1));
    const entered = c.seasoning ? 0 : Math.floor(performingCredit(c)*incidence);
    const move = { entered,cured:cured[0]+cured[1],resolved,recovered,loss,
      late:[entered,early-cured[0],late-cured[1]+nonperforming-resolved] };
    const row=rows[c.market]; for(const k of ['entered','cured','resolved','recovered','loss'])row[k]+=move[k];
    return move;
  });
  // External case handling is an expense even when automatic recovery is needed.
  for(const r of Object.values(rows))r.cost=Math.ceil((r.cured+r.resolved)*def.cost/1000000);
  const totals=Object.fromEntries(['entered','cured','resolved','recovered','loss','cost'].map(k=>[k,Object.values(rows).reduce((n,r)=>n+r[k],0)]));
  return { ...review, ...totals, rows, moves };
}
function settleCreditPerformance(g,p) {
  if(!p.creditPerformance)return null;
  const state=p.creditPerformance, cycle=g.cycle || state.lastCycle+1;
  if(state.lastCycle>=cycle)return state.report;
  const forecast=creditPerformanceForecast(p,g.economy);
  p.creditBook.cohorts.forEach((c,i)=>{
    const move=forecast.moves[i]; c.principal-=move.resolved; c.late=move.late; c.seasoning=Math.max(0,c.seasoning-1);
    p.marketBook.markets[c.market].loans-=move.resolved;
  });
  compactCredit(p);
  if(forecast.resolved) {
    p.accounting=AccountingPrototype.post(p.accounting,'credit.resolution',
      {cash:forecast.recovered,loans:-forecast.resolved,equity:-forecast.loss},-forecast.loss);
    syncAccounts(p);
  }
  state.lastCycle=cycle;
  state.report={cycle,rows:forecast.rows,...Object.fromEntries(['entered','cured','resolved','recovered','loss','cost'].map(k=>[k,forecast[k]]))};
  return state.report;
}
function collectionsPlan(g,index,input) {
  const p=g.players[index];if(!p.creditPerformance)return input;
  const policy=defaultCollectionsPolicy(), late=collectionsReview(p).late;
  policy.approach=late[2]>p.stats.loans*.025?'recovery':late[0]+late[1]>p.stats.loans*.01?'workout':'balanced';
  for(const share of [0,25,50,75,100]){policy.share=share;if(collectionsReview(p,input.allocation,policy).coverage>=1)break;}
  return {...input,collectionsPolicy:policy};
}
function validateCreditPerformanceSave(g) {
  if(g.creditPerformanceVersion===undefined) {
    if(g.players.some(p=>p.creditPerformance!==undefined||p.submitted?.collectionsPolicy!==undefined||p.creditBook?.cohorts.some(c=>c.late!==undefined||c.seasoning!==undefined)))throw Error('Unversioned credit performance');
    return g;
  }
  if(g.creditPerformanceVersion!==1||g.customerOwnershipVersion!==1||g.version!=='8.7')throw Error('Unsupported credit performance save');
  const uint=n=>Number.isSafeInteger(n)&&n>=0, fields=['cost','cured','entered','loss','recovered','resolved'];
  for(const p of g.players) {
    const s=p.creditPerformance;
    if(!s||Object.keys(s).sort().join()!=='lastCycle,policy,report,version'||s.version!==1||s.lastCycle!==g.cycle-(g.gameOver?0:1))throw Error('Invalid credit performance state');
    validateCollectionsPolicy(s.policy);if(p.submitted)validateCollectionsPolicy(p.submitted.collectionsPolicy);
    for(const c of p.creditBook.cohorts)if(!Array.isArray(c.late)||c.late.length!==3||!c.late.every(uint)||c.late.reduce((n,x)=>n+x,0)>c.principal||!Number.isInteger(c.seasoning)||c.seasoning<0||c.seasoning>2)throw Error('Invalid credit aging buckets');
    if(!s.lastCycle){if(s.report!==null)throw Error('Unexpected opening credit report');continue;}
    const r=s.report;
    if(!r||Object.keys(r).sort().join()!=='cost,cured,cycle,entered,loss,recovered,resolved,rows'||r.cycle!==s.lastCycle||!fields.every(k=>uint(r[k]))||
      !r.rows||Object.keys(r.rows).sort().join()!==Object.keys(p.marketBook.markets).sort().join())throw Error('Invalid credit performance report');
    for(const row of Object.values(r.rows))if(!row||Object.keys(row).sort().join()!==fields.join()||!fields.every(k=>uint(row[k]))||row.loss+row.recovered!==row.resolved)throw Error('Invalid local credit resolution');
    for(const k of fields)if(Object.values(r.rows).reduce((n,row)=>n+row[k],0)!==r[k])throw Error('Credit performance totals disagree');
    if(p.operatingReport?.chargeoff!==r.loss||p.operatingReport?.creditRecovery!==r.recovered||p.operatingReport?.collectionsCost!==r.cost)throw Error('Credit operating report disagrees');
  }
  return g;
}
