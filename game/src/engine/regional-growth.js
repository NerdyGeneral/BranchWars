// Fictional external household/savings flows. New supply arrives at month end;
// it never credits a player's accounts or changes an existing account promise.
const REGIONAL_GROWTH_RATES = {
  expansion: { arrivals: 70, departures: 15 }, steady: { arrivals: 50, departures: 20 },
  tight: { arrivals: 30, departures: 35 }, downturn: { arrivals: 20, departures: 60 },
  recovery: { arrivals: 60, departures: 20 }
};
const REGIONAL_GROWTH_DENOMINATOR = 100000;
const regionalGrowthCopy = value => JSON.parse(JSON.stringify(value));
const regionalGrowthUint = value => Number.isSafeInteger(value) && value >= 0;
function regionalGrowthKeys(g) { return Object.keys(g.territories).sort(); }
function regionalGrowthGrid(g, value = () => 0) {
  return Object.fromEntries(regionalGrowthKeys(g).map(k => [k, Object.fromEntries(['customers', 'deposits'].map(r =>
    [r, Object.fromEntries(Object.keys(CUSTOMER_SEGMENTS).map(s => [s, value(k, r, s)]))]))]));
}
function regionalGrowthOutside(g) {
  return regionalGrowthGrid(g, (k, r, s) => {
    const book = r === 'customers' ? g.marketEconomy.markets[k].households : g.marketEconomy.markets[k].segmentDeposits;
    return book.community[s] + book.union[s];
  });
}
function regionalGrowthWorld(g) {
  return regionalGrowthGrid(g, (k, r, s) => (r === 'customers' ? g.marketEconomy.markets[k].households : g.marketEconomy.markets[k].segmentDeposits).total[s]);
}
function regionalGrowthOpeningOutside(g) {
  // The v1 market initializer supplies these fixed outside books in every scenario.
  const owners = { community: { customers: 2000, deposits: 12000000 }, union: { customers: 2500, deposits: 8000000 } };
  const result = regionalGrowthGrid(g);
  for (const k of regionalGrowthKeys(g)) for (const owner of Object.values(owners)) {
    const counts = marketSplit(owner.customers, CUSTOMER_MARKETS[k]);
    const deposits = marketSplit(owner.deposits, Object.fromEntries(Object.keys(CUSTOMER_SEGMENTS).map(s => [s, counts[s] * SEGMENT_BALANCE_WEIGHTS[s]])));
    for (const s of Object.keys(CUSTOMER_SEGMENTS)) { result[k].customers[s] += counts[s]; result[k].deposits[s] += deposits[s]; }
  }
  return result;
}
function initializeRegionalGrowth(g, o) {
  if (o.regionalGrowthVersion !== 1) return g;
  if (g.advertisingVersion !== 1) throw Error('Regional growth requires the Advertising preview and its prerequisites.');
  if (g.regionalGrowth !== undefined || g.regionalGrowthVersion !== undefined) throw Error('Regional growth is already initialized.');
  g.regionalGrowthVersion = 1; g.version = '8.11';
  g.regionalGrowth = { version: 1, lastCycle: 0, openingOutside: regionalGrowthOutside(g), openingWorld: regionalGrowthWorld(g),
    cumulativeIn: regionalGrowthGrid(g), cumulativeOut: regionalGrowthGrid(g),
    carry: { arrivals: regionalGrowthGrid(g), departures: regionalGrowthGrid(g) },
    regimeCycles: Object.fromEntries(Object.keys(REGIONAL_GROWTH_RATES).map(k => [k, 0])), report: null };
  return g;
}
function regionalGrowthTotals(rows) {
  const fields = ['before', 'arrivals', 'requestedDepartures', 'departures', 'clippedDepartures', 'after'];
  const totals = Object.fromEntries(fields.map(f => [f, { customers: 0, deposits: 0 }]));
  for (const row of Object.values(rows)) for (const f of fields) for (const r of ['customers', 'deposits'])
    for (const n of Object.values(row[f][r])) totals[f][r] += n;
  totals.net = Object.fromEntries(['customers', 'deposits'].map(r => [r, totals.arrivals[r] - totals.departures[r]]));
  return totals;
}
function regionalGrowthQuote(g) {
  const state = g.regionalGrowth, regime = g.economy.key, rates = REGIONAL_GROWTH_RATES[regime];
  if (!rates) throw Error('Unknown regional growth regime.');
  const before = regionalGrowthOutside(g), carry = regionalGrowthCopy(state.carry), rows = {}, owners = {};
  for (const k of regionalGrowthKeys(g)) {
    const region = g.territories[k].region, multiplier = region === 'growthCoast' ? 12 : 10;
    const row = { region, before: before[k] };
    for (const f of ['arrivals', 'requestedDepartures', 'departures', 'clippedDepartures', 'after'])
      row[f] = { customers: emptyDepositSegments(), deposits: emptyDepositSegments() };
    owners[k] = {};
    for (const r of ['customers', 'deposits']) {
      const book = r === 'customers' ? g.marketEconomy.markets[k].households : g.marketEconomy.markets[k].segmentDeposits;
      owners[k][r] = { community: { ...book.community }, union: { ...book.union } };
      for (const s of Object.keys(CUSTOMER_SEGMENTS)) {
        for (const direction of ['arrivals', 'departures']) {
          const numerator = state.openingOutside[k][r][s] * rates[direction] * (direction === 'arrivals' ? multiplier : 10) + state.carry[direction][k][r][s];
          if (!regionalGrowthUint(numerator)) throw Error('Regional growth arithmetic exceeds safe precision.');
          row[direction === 'arrivals' ? 'arrivals' : 'requestedDepartures'][r][s] = Math.floor(numerator / REGIONAL_GROWTH_DENOMINATOR);
          carry[direction][k][r][s] = numerator % REGIONAL_GROWTH_DENOMINATOR;
        }
        const available = before[k][r][s], departed = Math.min(available, row.requestedDepartures[r][s]), arrived = row.arrivals[r][s];
        const outgoing = marketSplit(departed, { community: book.community[s], union: book.union[s] });
        const incoming = marketSplit(arrived, r === 'customers' ? { community: 4, union: 5 } : { community: 3, union: 2 });
        row.departures[r][s] = departed; row.clippedDepartures[r][s] = row.requestedDepartures[r][s] - departed;
        row.after[r][s] = available - departed + arrived;
        for (const owner of ['community', 'union']) owners[k][r][owner][s] += incoming[owner] - outgoing[owner];
      }
    }
    rows[k] = row;
  }
  return { report: { cycle: g.cycle, regime, rows, totals: regionalGrowthTotals(rows) }, carry, owners };
}
function regionalGrowthShape(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join() === [...keys].sort().join();
}
function regionalGrowthValidGrid(g, grid) {
  return regionalGrowthShape(grid, regionalGrowthKeys(g)) && Object.values(grid).every(row => regionalGrowthShape(row, ['customers', 'deposits']) &&
    Object.values(row).every(segments => regionalGrowthShape(segments, Object.keys(CUSTOMER_SEGMENTS)) && Object.values(segments).every(regionalGrowthUint)));
}
function validateRegionalGrowthState(g, settling = false) {
  const fail = message => { throw Error('Invalid regional growth ' + message); };
  const b = g.regionalGrowth;
  if (g.regionalGrowthVersion !== 1 || g.advertisingVersion !== 1 || g.version !== (g.relationshipOffersVersion === 1 ? '8.12' : '8.11')) fail('version or prerequisites.');
  if (!regionalGrowthShape(b, ['version', 'lastCycle', 'openingOutside', 'openingWorld', 'cumulativeIn', 'cumulativeOut', 'carry', 'regimeCycles', 'report']) ||
      b.version !== 1 || !regionalGrowthUint(b.lastCycle) || !Number.isSafeInteger(g.cycle) || g.cycle < 1 ||
      (settling ? ![g.cycle - 1, g.cycle].includes(b.lastCycle) : b.lastCycle !== g.cycle - (g.gameOver ? 0 : 1))) fail('lifecycle.');
  if (!['openingOutside', 'openingWorld', 'cumulativeIn', 'cumulativeOut'].every(k => regionalGrowthValidGrid(g, b[k])) ||
      !regionalGrowthShape(b.carry, ['arrivals', 'departures']) || !Object.values(b.carry).every(x => regionalGrowthValidGrid(g, x))) fail('books or carries.');
  if (!regionalGrowthShape(b.regimeCycles, Object.keys(REGIONAL_GROWTH_RATES)) || !Object.values(b.regimeCycles).every(regionalGrowthUint) ||
      Object.values(b.regimeCycles).reduce((a, n) => a + n, 0) !== b.lastCycle) fail('regime history.');
  const openingOutsideAnchor = regionalGrowthOpeningOutside(g), rateTotals = { arrivals: 0, departures: 0 };
  for (const [regime, n] of Object.entries(b.regimeCycles)) for (const direction of Object.keys(rateTotals)) rateTotals[direction] += n * REGIONAL_GROWTH_RATES[regime][direction];
  for (const k of regionalGrowthKeys(g)) {
    const m = g.marketEconomy?.markets?.[k], region = g.territories[k].region;
    if (!m || !['heartland', 'growthCoast'].includes(region)) fail('market or region.');
    for (const r of ['customers', 'deposits']) {
      const pools = r === 'customers' ? m.households : m.segmentDeposits;
      if (!regionalGrowthShape(pools, ['community', 'union', 'total']) || !Object.values(pools).every(x => regionalGrowthShape(x, Object.keys(CUSTOMER_SEGMENTS)) && Object.values(x).every(regionalGrowthUint))) fail('outside ownership.');
      for (const owner of ['community', 'union', 'total']) if (Object.values(pools[owner]).reduce((a, n) => a + n, 0) !== m[owner][r]) fail('aggregate ownership.');
      for (const s of Object.keys(CUSTOMER_SEGMENTS)) {
        const initial = b.openingOutside[k][r][s], owned = g.players.reduce((n, p) => n + (r === 'customers' ? p.householdBook.markets[k][s] : p.depositBook.cohorts.filter(c => c.market === k && c.segment === s).reduce((a, c) => a + c.principal, 0)), 0);
        if (initial !== openingOutsideAnchor[k][r][s] || initial > b.openingWorld[k][r][s]) fail('opening anchors.');
        const total = b.openingWorld[k][r][s] + b.cumulativeIn[k][r][s] - b.cumulativeOut[k][r][s];
        if (!regionalGrowthUint(total) || total !== pools.total[s] || pools.community[s] + pools.union[s] + owned !== total) fail('conservation.');
        for (const direction of ['arrivals', 'departures']) {
          const numerator = initial * rateTotals[direction] * (direction === 'arrivals' && region === 'growthCoast' ? 12 : 10);
          if (!regionalGrowthUint(numerator) || b.carry[direction][k][r][s] !== numerator % REGIONAL_GROWTH_DENOMINATOR) fail('fractional carry.');
          const scheduled = Math.floor(numerator / REGIONAL_GROWTH_DENOMINATOR);
          if (direction === 'arrivals' ? b.cumulativeIn[k][r][s] !== scheduled : b.cumulativeOut[k][r][s] > scheduled) fail('cumulative flows.');
        }
      }
    }
  }
  if (!b.lastCycle) { if (b.report !== null) fail('opening report.'); return g; }
  const report = b.report;
  if (!regionalGrowthShape(report, ['cycle', 'regime', 'rows', 'totals']) || report.cycle !== b.lastCycle || !Object.hasOwn(REGIONAL_GROWTH_RATES, report.regime) ||
      !b.regimeCycles[report.regime] || !regionalGrowthShape(report.rows, regionalGrowthKeys(g))) fail('report.');
  for (const [k, row] of Object.entries(report.rows)) {
    if (!regionalGrowthShape(row, ['region', 'before', 'arrivals', 'requestedDepartures', 'departures', 'clippedDepartures', 'after']) || row.region !== g.territories[k].region) fail('report market.');
    for (const f of ['before', 'arrivals', 'requestedDepartures', 'departures', 'clippedDepartures', 'after'])
      if (!regionalGrowthShape(row[f], ['customers', 'deposits']) || !Object.values(row[f]).every(x => regionalGrowthShape(x, Object.keys(CUSTOMER_SEGMENTS)) && Object.values(x).every(regionalGrowthUint))) fail('report balances.');
    for (const r of ['customers', 'deposits']) for (const s of Object.keys(CUSTOMER_SEGMENTS)) {
      for (const direction of ['arrivals', 'departures']) {
        const amount = row[direction === 'arrivals' ? 'arrivals' : 'requestedDepartures'][r][s];
        const lastNumerator = b.openingOutside[k][r][s] * REGIONAL_GROWTH_RATES[report.regime][direction] * (direction === 'arrivals' && row.region === 'growthCoast' ? 12 : 10);
        const priorCarry = b.carry[direction][k][r][s] + amount * REGIONAL_GROWTH_DENOMINATOR - lastNumerator;
        if (!regionalGrowthUint(priorCarry) || priorCarry >= REGIONAL_GROWTH_DENOMINATOR) fail('report scheduled flows.');
      }
      if (row.departures[r][s] !== Math.min(row.before[r][s], row.requestedDepartures[r][s]) ||
          row.clippedDepartures[r][s] !== row.requestedDepartures[r][s] - row.departures[r][s] ||
          row.after[r][s] !== row.before[r][s] + row.arrivals[r][s] - row.departures[r][s]) fail('report reconciliation.');
      const pools = r === 'customers' ? g.marketEconomy.markets[k].households : g.marketEconomy.markets[k].segmentDeposits;
      if ((!settling || b.lastCycle === g.cycle) && row.after[r][s] !== pools.community[s] + pools.union[s]) fail('closing outside report.');
    }
  }
  const totals = regionalGrowthTotals(report.rows);
  if (!regionalGrowthShape(report.totals, Object.keys(totals)) || Object.entries(totals).some(([field, row]) =>
      !regionalGrowthShape(report.totals[field], ['customers', 'deposits']) || Object.entries(row).some(([resource, n]) =>
        !Number.isSafeInteger(n) || report.totals[field][resource] !== n))) fail('report totals.');
  return g;
}
function validateRegionalGrowthSave(g) {
  if (g.regionalGrowthVersion === undefined) {
    if (g.regionalGrowth !== undefined) throw Error('Unversioned regional growth.');
    return g;
  }
  return validateRegionalGrowthState(g);
}
function regionalGrowthReview(g) {
  if (g.regionalGrowthVersion !== 1) return null;
  const b = g.regionalGrowth;
  return { version: 1, lastCycle: b.lastCycle, report: regionalGrowthCopy(b.report),
    forecast: g.gameOver ? null : { ...regionalGrowthQuote(g).report, conditional: true } };
}
function settleRegionalGrowth(g) {
  if (g.regionalGrowthVersion === undefined) return [];
  validateRegionalGrowthState(g, true);
  if (g.regionalGrowth.lastCycle === g.cycle) return [];
  const quote = regionalGrowthQuote(g), next = regionalGrowthCopy(g.regionalGrowth), markets = regionalGrowthCopy(g.marketEconomy.markets);
  next.lastCycle = g.cycle; next.report = quote.report; next.carry = quote.carry; next.regimeCycles[quote.report.regime]++;
  for (const k of regionalGrowthKeys(g)) for (const r of ['customers', 'deposits']) {
    const row = quote.report.rows[k], pools = r === 'customers' ? markets[k].households : markets[k].segmentDeposits;
    for (const owner of ['community', 'union']) {
      pools[owner] = quote.owners[k][r][owner];
      markets[k][owner][r] = Object.values(pools[owner]).reduce((a, n) => a + n, 0);
    }
    for (const s of Object.keys(CUSTOMER_SEGMENTS)) {
      const arrived = row.arrivals[r][s], departed = row.departures[r][s];
      next.cumulativeIn[k][r][s] += arrived; next.cumulativeOut[k][r][s] += departed;
      pools.total[s] += arrived - departed;
    }
    markets[k].total[r] = Object.values(pools.total).reduce((a, n) => a + n, 0);
  }
  // Validate the complete candidate before touching either authoritative object.
  validateRegionalGrowthState({ ...g, regionalGrowth: next, marketEconomy: { ...g.marketEconomy, markets } }, true);
  g.marketEconomy.markets = markets; g.regionalGrowth = next;
  return Object.entries(g.regions).map(([region, def]) => {
    const totals = regionalGrowthTotals(Object.fromEntries(Object.entries(quote.report.rows).filter(([, row]) => row.region === region)));
    return def.name + ' month-end external flows: ' + totals.arrivals.customers.toLocaleString() + ' household arrivals and $' + totals.arrivals.deposits.toLocaleString() +
      ' savings inflow; ' + totals.departures.customers.toLocaleString() + ' household departures and $' + totals.departures.deposits.toLocaleString() +
      ' savings outflow. Closing supply is available next month.';
  });
}
