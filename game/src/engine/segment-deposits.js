// Segment deposit ownership v1. Existing accounts keep their owner and terms.
// Relative opening balances are fictional scenario weights, not real-world data.
const SEGMENT_BALANCE_WEIGHTS = { everyday: 1, connected: 1.5, reserve: 4 };
const emptyDepositSegments = () => ({ everyday: 0, connected: 0, reserve: 0 });
function initializeSegmentDeposits(g, o) {
  if (o.segmentDepositsVersion !== 1) return g;
  if (g.creditPerformanceVersion !== 1) throw Error('Segment deposits requires the credit performance preview and its prerequisites.');
  g.segmentDepositsVersion = 1; g.version = '8.8';
  const split = (amount, counts) => marketSplit(amount, Object.fromEntries(Object.keys(CUSTOMER_SEGMENTS).map(s => [s, counts[s] * SEGMENT_BALANCE_WEIGHTS[s]])));
  for (const p of g.players) {
    p.segmentDeposits = { version: 1 };
    p.depositBook.cohorts = p.depositBook.cohorts.flatMap(c => Object.entries(split(c.principal, p.householdBook.markets[c.market])).filter(([,n]) => n).map(([segment, principal]) => ({ ...c, segment, principal, exiting: 0 })));
  }
  for (const [key, m] of Object.entries(g.marketEconomy.markets)) {
    const community = split(m.community.deposits, m.households.community), union = split(m.union.deposits, m.households.union);
    m.segmentDeposits = { community, union, total: Object.fromEntries(Object.keys(CUSTOMER_SEGMENTS).map(s =>
      [s, community[s] + union[s] + g.players.reduce((n,p) => n + p.depositBook.cohorts.filter(c => c.market === key && c.segment === s).reduce((a,c) => a + c.principal, 0), 0)])) };
  }
  return g;
}
function depositSegmentAmounts(cohorts) {
  const out = emptyDepositSegments();
  for (const c of cohorts) out[c.segment] += c.principal;
  return out;
}
function openSegmentDeposits(p, g, market, amounts, limited=false) {
  for (const [segment, amount] of Object.entries(amounts)) {
    const baseWeights = Object.fromEntries(Object.entries(productTargetMix(p,market,segment)).map(([product, emphasis]) => [product, emphasis * CUSTOMER_SEGMENTS[segment].fit[product]]));
    const weights = limited?advertisingProductWeights(p,market,segment,baseWeights):baseWeights;
    for (const [product, principal] of Object.entries(marketSplit(amount, weights))) if (principal) {
      if(limited)captureAdvertisingIntake(p,market,segment,product,'deposits',principal);
      p.depositBook.cohorts.push({ market, segment, principal, product, exiting: 0, remaining: product === 'highYield' ? 6 : 0, quotedCycle: g.cycle || p.depositBook.asOfCycle + 1, rate: depositRate(p,g,product) });
    }
  }
  compactDeposits(p);
}
function returnSegmentDeposits(m, amounts) {
  for (const [s,n] of Object.entries(amounts)) {
    const split = marketSplit(n, { community: 3, union: 2 });
    for (const owner of ['community','union']) { m.segmentDeposits[owner][s] += split[owner]; m[owner].deposits += split[owner]; }
  }
}
function moveOutsideSegmentDeposits(p, key, outside, positive, limited) {
 return traceProductDeposits(p,positive?(limited?'ordinaryIntake':'outsideOther'):'outsideWithdrawals',()=>{
  const g = marketContext, m = g.marketEconomy.markets[key];
  if (positive) {
    const amounts = emptyDepositSegments();
    for (const owner of ['community','union'])
      moveHouseholdCounts(m.segmentDeposits[owner], amounts, outside[owner], limited ? householdAcquisitionWeights(p,key) : null);
    openSegmentDeposits(p,g,key,amounts,limited);
    for (const owner of ['community','union']) m[owner].deposits -= outside[owner];
  } else {
    const taken = takeDeposits(p,key,outside.community + outside.union);
    returnSegmentDeposits(m,depositSegmentAmounts(taken));
  }
 });
}
function transferSegmentDeposits(g, from, to, key, requested) {
  const n = Math.min(Math.max(0,Math.round(requested)),withdrawableDeposits(from,key));
  if (!n) return 0;
  return traceProductDeposits(from,'rivalTransfers',()=>traceProductDeposits(to,'rivalTransfers',()=>withMarket(g, () => {
    const sensitive = Math.min(from.stats.rateSensitiveDeposits || 0, Math.round(n * (from.stats.rateSensitiveDeposits || 0) / Math.max(1,from.stats.deposits)));
    const taken = takeDeposits(from,key,n);
    to.depositBook.cohorts.push(...taken); compactDeposits(to);
    from.marketBook.markets[key].deposits -= n; to.marketBook.markets[key].deposits += n;
    marketDelta(from,'deposits',-n); marketDelta(to,'deposits',n);
    if (sensitive) { marketDelta(from,'rateSensitiveDeposits',-sensitive); marketDelta(to,'rateSensitiveDeposits',sensitive); }
    return n;
  })));
}
function withdrawOwnedDeposits(g, p, key, segment, requested) {
  const amount = Math.min(requested, p.depositBook.cohorts.filter(c => c.market === key && c.segment === segment && !c.locked).reduce((n,c) => n+c.principal,0));
  if (!amount) return 0;
  const taken = takeDeposits(p,key,amount,false,segment);
  returnSegmentDeposits(g.marketEconomy.markets[key],depositSegmentAmounts(taken));
  p.marketBook.markets[key].deposits -= amount;
  marketDelta(p,'deposits',-amount);
  return amount;
}
function segmentRetentionOutflow(g,p,key,departures) {
  let outflow = 0;
  for (const [segment,n] of Object.entries(departures)) {
    const count = p.householdBook.markets[key][segment];
    if (!count || !n) continue;
    const rows = p.depositBook.cohorts.filter(c => c.market === key && c.segment === segment);
    // A departure marks only the still-active portion of locked savings. Already
    // departing funds cannot be marked again and must not renew indefinitely.
    for (const c of rows.filter(c => c.locked)) c.exiting += Math.floor((c.principal-c.exiting)*n/count);
    const withdrawablePrincipal = rows.filter(c => !c.locked).reduce((a,c) => a+c.principal,0);
    outflow += withdrawOwnedDeposits(g,p,key,segment,Math.floor(withdrawablePrincipal*n/count));
  }
  return outflow;
}
function settleDepartedTermDeposits(g,p,preview=false) {
  if (!p.segmentDeposits) return 0;
  const depositSnapshot = g.marketEconomy || marketContext?.marketEconomy || p.marketSnapshot;
  if (!depositSnapshot) throw Error('Term departures require the local market snapshot.');
  const world = { ...g, marketEconomy: preview ? JSON.parse(JSON.stringify(depositSnapshot)) : depositSnapshot };
  const cycle = g.cycle || p.depositBook.asOfCycle+1;
  return withMarket(world, () => {
    const due = p.depositBook.cohorts.filter(c => c.locked && c.exiting && c.remaining === 1 && c.quotedCycle < cycle);
    let total = 0;
    // Settle the due part directly, without converting other accounts or changing
    // their guarantee. No renewal setting can keep a former customer's money.
    for (const c of due) {
      const n = c.exiting; c.principal -= n; c.exiting = 0;
      returnSegmentDeposits(world.marketEconomy.markets[c.market],{...emptyDepositSegments(),[c.segment]:n});
      p.marketBook.markets[c.market].deposits -= n;
      total += n;
    }
    compactDeposits(p);
    if(total)marketDelta(p,'deposits',-total);
    p.stats.rateSensitiveDeposits = Math.min(p.stats.rateSensitiveDeposits,p.stats.deposits);
    return total;
  });
}
function segmentDepositSummary(p,g) {
  if (!p.segmentDeposits) return null;
  const fields = () => ({principal:0,interest:0,fees:0,service:0,guaranteed:0,renewing:0,locked:0,exiting:0,platform:0});
  const products = [...Object.keys(DEPOSIT_SERVICE),'term'], rows = Object.fromEntries(products.map(k => [k,fields()])), markets = {};
  const cells = [];
  for (const key of Object.keys(p.marketBook.markets)) {
    markets[key] = {};
    for (const segment of Object.keys(CUSTOMER_SEGMENTS)) {
      const accounts = p.depositBook.cohorts.filter(c => c.market === key && c.segment === segment), row = fields();
      const local = Object.fromEntries(products.map(k => [k,fields()]));
      for (const c of accounts) {
        const r = local[c.locked?'term':c.product]; r.principal += c.principal;
        r.interest += c.principal * (c.remaining>0?c.rate:depositRate(p,g,c.product))/1000000;
        if(c.remaining>0)r.guaranteed+=c.principal;if(c.remaining===1)r.renewing+=c.principal;
        if(c.locked)r.locked+=c.principal;r.exiting+=c.exiting;
      }
      // One billable primary-account equivalent per active relationship, not one
      // fee per product. Empty segments do not create fee-paying customers.
      const counts = marketSplit(p.householdBook.markets[key][segment],Object.fromEntries(products.map(k => [k,Math.max(0,local[k].principal-local[k].exiting)])));
      for (const product of products) {
        const r=local[product],def=DEPOSIT_SERVICE[product]||DEPOSIT_SERVICE.highYield;
        r.interest=Math.round(r.interest);r.fees=counts[product]*def.fee;r.service=Math.round(counts[product]*def.cost+r.principal*.00006);
        cells.push({key,segment,product,row:r});
        for(const f of Object.keys(row))row[f]+=r[f];
      }
      row.directCost=row.interest+row.service-row.fees;markets[key][segment]=row;
    }
  }
  let centralPlatform=0;
  for(const product of products) {
    const selected=cells.filter(c=>c.product===product),platform=(product==='term'||!p.retailLifecycle.mix[product]?0:RETAIL_PLATFORM[product])+(p.productPrograms?(productProgramCosts(p).rows[product]?.total||0):0);
    const allocations=marketSplit(platform,Object.fromEntries(selected.map((c,i)=>[i,c.row.principal])));
    for(const [i,n]of Object.entries(allocations)){const c=selected[i],r=markets[c.key][c.segment];c.row.platform+=n;c.row.service+=n;r.platform+=n;r.service+=n;r.directCost+=n;}
    for(const c of selected)for(const f of Object.keys(rows[product]))rows[product][f]+=c.row[f];
    const remainder=platform-rows[product].platform;centralPlatform+=remainder;rows[product].platform+=remainder;rows[product].service+=remainder;
    rows[product].directCost=rows[product].interest+rows[product].service-rows[product].fees;
  }
  return {...(p.productPrograms?.version===2?{cells}:{}),rows,markets,centralPlatform,interest:Object.values(rows).reduce((n,r)=>n+r.interest,0),fees:Object.values(rows).reduce((n,r)=>n+r.fees,0),service:Object.values(rows).reduce((n,r)=>n+r.service,0)};
}
function validateSegmentDepositSave(g) {
  const has = p => p.segmentDeposits !== undefined || p.depositBook?.cohorts.some(c => c.segment!==undefined || c.exiting!==undefined);
  if(g.segmentDepositsVersion===undefined){if(g.players.some(has)||Object.values(g.marketEconomy?.markets||{}).some(m=>m.segmentDeposits!==undefined))throw Error('Unversioned segment deposits');return g;}
  if(g.segmentDepositsVersion!==1||g.creditPerformanceVersion!==1||g.version !== campaignVersion(g))throw Error('Unsupported segment deposit save');
  const uint=n=>Number.isSafeInteger(n)&&n>=0, valid=r=>r&&Object.keys(r).sort().join()==='connected,everyday,reserve'&&Object.values(r).every(uint);
  for(const p of g.players) {
    if(!p.segmentDeposits||Object.keys(p.segmentDeposits).join()!=='version'||p.segmentDeposits.version!==1)throw Error('Invalid segment deposit state');
    if(p.operatingReport&&(!uint(p.operatingReport.termDepartures)||!uint(p.operatingReport.termDepartureFundingLoss)))throw Error('Invalid term departure report');
    for(const c of p.depositBook.cohorts)if(!Object.hasOwn(CUSTOMER_SEGMENTS,c.segment)||!uint(c.exiting)||c.exiting>c.principal||(!c.locked&&c.exiting))throw Error('Invalid segment deposit owner or departure');
  }
  for(const [key,m]of Object.entries(g.marketEconomy.markets)) {
    const b=m.segmentDeposits;
    if(!b||Object.keys(b).sort().join()!=='community,total,union'||!Object.values(b).every(valid))throw Error('Invalid outside segment deposits');
    for(const owner of ['community','union','total'])if(Object.values(b[owner]).reduce((a,n)=>a+n,0)!==m[owner].deposits)throw Error('Outside segment deposits disagree');
    for(const segment of Object.keys(CUSTOMER_SEGMENTS))if(b.community[segment]+b.union[segment]+g.players.reduce((n,p)=>n+p.depositBook.cohorts.filter(c=>c.market===key&&c.segment===segment).reduce((a,c)=>a+c.principal,0),0)!==b.total[segment])throw Error('Segment deposit conservation failed');
  }
  return g;
}
