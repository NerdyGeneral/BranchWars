'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const elements = new Map();
function element() {
 const classes = new Set();
 return { innerHTML: '', hidden: false, dataset: {}, classList: {
  toggle(key, on) { if (on) classes.add(key); else classes.delete(key); },
  contains(key) { return classes.has(key); }
 } };
}
elements.set('#regionalGrowthWorkspace', element());
elements.set('#regionalGrowthMount', element());
elements.set('#gameScreen', element());
elements.get('#regionalGrowthWorkspace').dataset.workspace = 'markets';
const context = { window: { BWEngine: {} }, document: { querySelector: key => elements.get(key) || null,
 querySelectorAll: key => key === '[data-workspace]' ? [elements.get('#regionalGrowthWorkspace')] : [] },
 console, Math: Object.create(Math) };
context.Math.random = () => { throw Error('A review cannot consume randomness'); };
vm.createContext(context);
vm.runInContext(read('src/ui/state.js') + '\n' + read('src/ui/draft.js') + '\n' + read('src/ui/regional-growth.js'), context);
const run = code => vm.runInContext(code, context);
const mount = elements.get('#regionalGrowthMount'), section = elements.get('#regionalGrowthWorkspace');
const grid = (customers, deposits) => ({ customers: { everyday: customers, connected: 0, reserve: 0 }, deposits: { everyday: deposits, connected: 0, reserve: 0 } });
function closing(cycle, regime, before = 0, arrivals = 0, departures = 0) {
 const fields = { before, arrivals, requestedDepartures: departures, departures, clippedDepartures: 0, after: before + arrivals - departures };
 const row = { region: 'heartland', ...Object.fromEntries(Object.entries(fields).map(([field, n]) => [field, grid(n, n * 100)])) };
 const totals = Object.fromEntries(Object.entries(fields).map(([field, n]) => [field, { customers: n, deposits: n * 100 }]));
 totals.net = { customers: arrivals - departures, deposits: (arrivals - departures) * 100 };
 return { cycle, regime, rows: { downtown: row }, totals };
}
const clone = x => JSON.parse(JSON.stringify(x));
function freeze(value) {
 if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); }
 return value;
}
function render(view) { context.testView = freeze(view); run('renderRegionalGrowth(testView)'); return mount.innerHTML; }
const base = { territories: { downtown: { name: 'Downtown' } }, regions: { heartland: { name: 'Heartland' } } };
run("draft={focus:'northside',advertisingPolicy:{budget:50000}};game={rng:{state:42},players:[{submitted:{focus:'northside'}}]}");
const untouched = run('JSON.stringify({draft,game})');

assert.equal(render(base), '');
assert(section.hidden && section.classList.contains('hidden'), 'older campaigns hide the whole section');
run("setWorkspaceTab('markets')");
assert(section.classList.contains('active'), 'test exercises the actual Markets activation');
assert(section.hidden && section.classList.contains('hidden'), 'workspace switching must not reveal feature-off content');
const initial = { ...clone(base), regionalGrowth: { version: 1, lastCycle: 0, report: null, forecast: { ...closing(1, 'steady'), conditional: true } } };
let html = render(initial);
assert(!section.hidden && !section.classList.contains('hidden'));
assert.match(html, /CURRENT OUTSIDE SUPPLY/);
assert.match(html, /<b>0 households<\/b><span>\$0 savings<\/span>/, 'zero supply must not become missing data');
assert.match(html, /REGIONAL HOUSEHOLDS &amp; SAVINGS/);
assert.doesNotMatch(html, /\bpeople\b/i, 'household-book counts must not be labeled population persons');
assert.match(html, /No completed closing/);
assert.doesNotMatch(html, /COMPLETED CLOSE/);
assert.match(html, /NEXT CLOSING · MONTH 1 · CONDITIONAL · Steady/);
assert.match(html, /Forecast at this month's close, using today's outside balances\. These arrivals become available next month\./);
assert.match(html, /arrivals do not automatically grow your bank/);
assert.match(html, /not national money creation/);
assert.doesNotMatch(html, /<(?:button|input|select|textarea)\b|data-market=/, 'review adds no spending or focus controls');
assert.match(html, /<details class="regional-growth-details"><summary>Region and market movements/);

const active = { ...clone(base), regionalGrowth: { version: 1, lastCycle: 7, report: closing(7, 'downturn', 100, 1, 6), forecast: { ...closing(8, 'recovery', 80, 10, 2), conditional: true } } };
html = render(active);
assert.match(html, /LAST ACTUAL · MONTH 7 CLOSE · Downturn/);
assert.match(html, /<b>−5 households<\/b><span>−\$500 savings<\/span>/);
assert.match(html, /CURRENT OUTSIDE SUPPLY<\/small><b>80 households/, 'current supply uses today\'s forecast baseline, not the prior close');
assert.match(html, /NEXT CLOSING · MONTH 8 · CONDITIONAL · Recovery/);
assert.match(html, /COMPLETED CLOSE · MONTH 7 · Downturn/);
assert.match(html, /PROJECTED CLOSE · MONTH 8 · CONDITIONAL · Recovery/);
assert.match(html, /Heartland · total/);
assert.match(html, /<th scope="row">Downtown<\/th>/);
assert.match(html, /tabindex="0" role="region"/);

const terminal = clone(active); terminal.gameOver = true; terminal.regionalGrowth.forecast = null;
html = render(terminal);
assert.match(html, /CURRENT OUTSIDE SUPPLY<\/small><b>95 households/, 'terminal supply uses the last actual closing balance');
assert.match(html, /Campaign complete\. No next closing is scheduled/);
assert.doesNotMatch(html, /NEXT CLOSING|PROJECTED CLOSE|CONDITIONAL/);
assert.match(html, /COMPLETED CLOSE · MONTH 7 · Downturn/);

const escaped = clone(active);
escaped.territories.downtown.name = '<img src=x onerror="alert(1)">';
escaped.regions.heartland.name = 'Region & <script>bad</script>';
escaped.regionalGrowth.report.regime = '<svg/onload=bad>';
html = render(escaped);
assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
assert.match(html, /Region &amp; &lt;script&gt;bad&lt;\/script&gt;/);
assert.match(html, /&lt;svg\/onload=bad&gt;/);
assert.doesNotMatch(html, /<img|<script|<svg/);
assert.equal(run('JSON.stringify({draft,game})'), untouched, 'rendering must leave draft focus, spending, sealed plans and RNG unchanged');
assert.equal(render(base), '', 'switching back to old rules clears stale content');
assert(section.hidden && section.classList.contains('hidden'));

// Use the actual dashboard entry point on a terminal view to exercise its hook.
vm.runInContext(read('src/ui/dashboard.js'), context);
context.testView = freeze(terminal);
run('currentView=()=>testView;renderBankIdentity=()=>{};renderFinal=()=>{};maybeResolution=()=>{};render()');
assert.match(mount.innerHTML, /COMPLETED CLOSE · MONTH 7/, 'dashboard refreshes review before the terminal return');
assert.equal(run('JSON.stringify({draft,game})'), untouched);
console.log('Regional growth UI passed: old-rule hiding, initial and terminal reviews, exact zero and signed flows, closing timing, escaped labels and no draft/world mutation.');
