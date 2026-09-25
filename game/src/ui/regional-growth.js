// Public outside-supply review only: no draft preparation or simulation calls.
function regionalGrowthNumber(value, savings = false, signed = false) {
 const sign = value < 0 ? '−' : signed && value > 0 ? '+' : '';
 return sign + (savings ? '$' : '') + Math.abs(value).toLocaleString();
}
function regionalGrowthPair(value, signed = false) {
 return '<b>' + regionalGrowthNumber(value.customers, false, signed) + ' households</b>' +
  '<span>' + regionalGrowthNumber(value.deposits, true, signed) + ' savings</span>';
}
function regionalGrowthRowTotals(row, field) {
 return Object.fromEntries(['customers', 'deposits'].map(resource =>
  [resource, Object.values(row[field][resource]).reduce((sum, n) => sum + n, 0)]));
}
function regionalGrowthRegime(key) {
 const labels = { expansion: 'Expansion', steady: 'Steady', tight: 'Tight credit', downturn: 'Downturn', recovery: 'Recovery' };
 return esc(labels[key] || key);
}
function regionalGrowthTable(v, closing) {
 const fields = ['before', 'arrivals', 'departures', 'after'];
 const groups = new Map();
 for (const [market, row] of Object.entries(closing.rows)) {
  if (!groups.has(row.region)) groups.set(row.region, []);
  groups.get(row.region).push([market, row]);
 }
 const cells = values => {
  const net = { customers: values.after.customers - values.before.customers, deposits: values.after.deposits - values.before.deposits };
  return ['before', 'arrivals', 'departures', 'net', 'after'].map(field =>
   '<td>' + regionalGrowthPair(field === 'net' ? net : values[field], field === 'net') + '</td>').join('');
 };
 let rows = '';
 for (const [region, markets] of groups) {
  const total = Object.fromEntries(fields.map(field => [field, { customers: 0, deposits: 0 }]));
  const marketRows = markets.map(([market, row]) => {
   const values = Object.fromEntries(fields.map(field => [field, regionalGrowthRowTotals(row, field)]));
   for (const field of fields) for (const resource of ['customers', 'deposits']) total[field][resource] += values[field][resource];
   return '<tr><th scope="row">' + esc(v.territories?.[market]?.name ?? market) + '</th>' + cells(values) + '</tr>';
  }).join('');
  rows += '<tr class="regional-growth-region"><th scope="row">' + esc(v.regions?.[region]?.name ?? region) + ' · total</th>' + cells(total) + '</tr>' + marketRows;
 }
 return '<div class="regional-growth-scroll" tabindex="0" role="region" aria-label="Outside supply by region and market, closing month ' + esc(closing.cycle) + '"><table class="regional-growth-table"><thead><tr><th scope="col">Region / market</th><th scope="col">Before close</th><th scope="col">Arrivals</th><th scope="col">Departures</th><th scope="col">Net change</th><th scope="col">After close</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
  '<p class="micro muted">Requested departures: ' + regionalGrowthNumber(closing.totals.requestedDepartures.customers) + ' households / ' + regionalGrowthNumber(closing.totals.requestedDepartures.deposits, true) + ' savings. Limited by available outside supply: ' + regionalGrowthNumber(closing.totals.clippedDepartures.customers) + ' households / ' + regionalGrowthNumber(closing.totals.clippedDepartures.deposits, true) + ' savings could not depart.</p>';
}
function regionalGrowthContent(v) {
 const review = v.regionalGrowth, last = review.report, next = review.forecast;
 const supply = next ? next.totals.before : last ? last.totals.after : null;
 const stat = (label, value) => '<div><small>' + label + '</small>' + value + '</div>';
 const actualLabel = last ? 'LAST ACTUAL · MONTH ' + esc(last.cycle) + ' CLOSE · ' + regionalGrowthRegime(last.regime) : 'LAST ACTUAL';
 const actual = last ? regionalGrowthPair(last.totals.net, true) : '<b>No completed closing</b><span>Actual movement appears after the first month.</span>';
 let forecast = '<p class="micro muted">Campaign complete. No next closing is scheduled.</p>';
 if (next) forecast = '<div class="regional-growth-forecast"><h3>NEXT CLOSING · MONTH ' + esc(next.cycle) + ' · CONDITIONAL · ' + regionalGrowthRegime(next.regime) + '</h3><div class="regional-growth-summary">' +
  stat('Projected arrivals', regionalGrowthPair(next.totals.arrivals)) + stat('Projected departures', regionalGrowthPair(next.totals.departures)) + stat('Projected net change', regionalGrowthPair(next.totals.net, true)) + '</div>' +
  '<p class="micro">Forecast at this month\'s close, using today\'s outside balances. These arrivals become available next month.</p><p class="micro muted">Activity before closing can change available outside supply and limit departures; this quote is conditional.</p></div>';
 const detail = last || next ? '<details class="regional-growth-details"><summary>Region and market movements</summary>' +
  (last ? '<h3>COMPLETED CLOSE · MONTH ' + esc(last.cycle) + ' · ' + regionalGrowthRegime(last.regime) + '</h3>' + regionalGrowthTable(v, last) : '') +
  (next ? '<h3>PROJECTED CLOSE · MONTH ' + esc(next.cycle) + ' · CONDITIONAL · ' + regionalGrowthRegime(next.regime) + '</h3>' + regionalGrowthTable(v, next) : '') + '</details>' : '';
 return '<h2>REGIONAL HOUSEHOLDS &amp; SAVINGS</h2><p class="small muted">Households and savings arrive from or leave the modeled area through community banks and credit unions. Banks must compete for this outside supply; arrivals do not automatically grow your bank.</p>' +
  '<div class="regional-growth-summary">' + stat('CURRENT OUTSIDE SUPPLY', supply ? regionalGrowthPair(supply) : '<b>Unavailable</b>') + stat(actualLabel, actual) + '</div>' + forecast + detail +
  '<p class="micro muted">This tracks flows across the modeled area\'s boundary, not national money creation. Households and savings are separate aggregate resources, not individual linked accounts.</p>';
}
function renderRegionalGrowth(v) {
 const section = $('#regionalGrowthWorkspace'), mount = $('#regionalGrowthMount');
 if (!section || !mount) return;
 const enabled = v.regionalGrowth?.version === 1;
 section.hidden = !enabled;
 section.classList.toggle('hidden', !enabled);
 mount.innerHTML = enabled ? regionalGrowthContent(v) : '';
}
