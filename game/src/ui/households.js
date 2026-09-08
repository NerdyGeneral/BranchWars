let selectedHouseholdMarket = null;
function stageHouseholdPolicy(v, retention, priority) {
  if (!draft || v.me.submitted || !v.me.householdBook) return false;
  const next = JSON.parse(JSON.stringify(draft));
  next.householdPolicy = { retention, priority: { ...priority } };
  try {
    E.normalizeHouseholdPlan(v.me, next);
    draft = next; renderHouseholds(v); renderReady(v); return true;
  } catch (e) { toast(e.message); renderHouseholds(v); return false; }
}
function renderHouseholds(v) {
  $('#householdNav').classList.toggle('hidden', !v.me.householdBook);
  if (!v.me.householdBook) {
    $('#householdPanel').innerHTML = '';
    if (workspaceTab === 'customers') setWorkspaceTab('overview');
    return;
  }
  if (workspaceTab !== 'customers') return;
  const p = v.me, policy = draft.householdPolicy || p.householdBook.policy;
  const review = E.householdServiceReview(p, draft.allocation, policy), report = p.householdBook.report;
  const key = v.territories[selectedHouseholdMarket] ? selectedHouseholdMarket : draft.focus;
  const rows = review.rows.filter(r => r.market === key), pool = p.marketSnapshot.markets[key].households;
  const disabled = p.submitted ? 'disabled' : '';
  const count = n => n.toLocaleString(), pct = n => (n * 100).toFixed(0) + '%';
  const total = review.rows.reduce((n, r) => n + r.count, 0), atRisk = review.rows.reduce((n, r) => n + r.departures, 0);
  const priorities = Object.entries(E.CUSTOMER_SEGMENTS).map(([s, def]) => `<label for="household-${s}">${esc(def.name)}<select id="household-${s}" ${disabled}>${[0, 1, 2, 3].map(n => `<option value="${n}" ${policy.priority[s] === n ? 'selected' : ''}>${['No retention time', 'Standard priority', 'Double priority', 'Triple priority'][n]}</option>`).join('')}</select></label>`).join('');
  const table = rows.map(r => {
    const outside = pool.community[r.segment] + pool.union[r.segment], rival = pool.total[r.segment] - outside - r.count;
    const width = pool.total[r.segment] ? r.count / pool.total[r.segment] * 100 : 0;
    return `<tr><th>${esc(E.CUSTOMER_SEGMENTS[r.segment].name)}<div class="household-share" role="img" aria-label="Your owned share ${width.toFixed(1)} percent"><span style="width:${width}%"></span></div><small>${width.toFixed(1)}% owned · not map influence</small></th><td>${count(r.count)}<small>Rival ${count(rival)}<br>Outside ${count(outside)}</small></td><td>${r.demand.toFixed(2)}<small>${E.HOUSEHOLD_SERVICE[r.segment]} workload units per 900 households, before local relief</small></td><td class="${r.coverage < 1 ? 'warn' : 'good'}">${pct(r.coverage)}<small>${r.assigned.toFixed(2)} effective bankers reserved</small></td><td>${r.current} → ${r.next}<small>Local product fit ${pct(r.fit)} · ${r.departures} opening-book departures forecast</small></td></tr>`;
  }).join('');
  const previous = report?.rows[key];
  $('#householdPanel').innerHTML = `
    <div class="section-head"><div><h2>CUSTOMERS &amp; RETENTION</h2><p class="small muted">Own relationships. Decide whom to serve. Keep enough capacity to win the next customer.</p></div><span class="small">${esc(p.name)} · private service mandate</span></div>
    <div class="household-summary"><div><span>Owned household relationships</span><b>${count(total)}</b><small>Every household belongs to one bank or outside institution.</small></div><div><span>Retention / sales capacity</span><b>${review.capacity.toFixed(2)} / ${review.salesStaff.toFixed(2)}</b><small>Effective Retail bankers. Training upgrades add retention capacity separately.</small></div><div><span>Opening-book departures forecast</span><b>${count(atRisk)}</b><small>${report ? 'Last month: ' + count(report.departed) + ' left; ' + money(report.depositOutflow) + ' deposit outflow.' : 'No completed month yet. Neglect erodes goodwill before customers leave.'}</small></div></div>
    <section class="household-mandate"><h3>RECURRING SERVICE MANDATE</h3><label for="householdRetention">Retail time reserved for existing households<select id="householdRetention" ${disabled}>${[25, 50, 75, 100].map(n => `<option value="${n}" ${policy.retention === n ? 'selected' : ''}>${n}% retention / ${100 - n}% acquisition</option>`).join('')}</select></label><p class="small">Changing this split adds no staff or salary. More retention leaves less banker-led acquisition. Offices still provide their existing sales reach. Current bank-wide demand: <b>${review.demand.toFixed(2)}</b> effective bankers; total coverage <b>${pct(review.coverage)}</b>. Coverage can differ sharply by segment.</p><div class="household-priorities">${priorities}</div><p class="micro muted">Priority allocates your limited retention time in proportion to workload; it does not add capacity. Zero priority abandons that segment's servicing. Unused time in an over-served segment is not automatically reassigned. Policies persist after submission; new recruits still arrive next month.</p></section>
    <div class="household-market"><label for="householdMarket">INSPECT A MARKET<select id="householdMarket">${Object.entries(v.territories).map(([k, t]) => `<option value="${k}" ${key === k ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label><p class="micro muted">Inspection does not change the plan's focus market. Retail offices ease Everyday workload; digital offices ease Connected workload; service upgrades help all local segments.</p></div>
    <div class="table-scroll"><table class="regional-table"><thead><tr><th>Segment &amp; owned share</th><th>Relationships</th><th>Service demand</th><th>Draft coverage</th><th>Goodwill / retention</th></tr></thead><tbody>${table}</tbody></table></div>
    <p class="small">${previous ? 'Last completed month in this market: ' + count(Object.values(previous.departures).reduce((a, b) => a + b, 0)) + ' service-related departures and ' + money(previous.depositOutflow) + ' withdrawable deposits returned to outside institutions.' : 'Actual local departures will appear after the first month.'}</p>
    <details><summary>What these numbers mean</summary><p class="small">The household counts above are conserved across both players, community banks and credit unions. Sales, raids and acquisitions transfer existing people; changing the offer mix never rewrites who you already serve. Goodwill below 45 triggers gradual departures, capped at 1.5% of a segment per month; adequate service reduces that rate by 60% while rebuilding trust.</p><p class="small">Deposit accounts are still pooled by market, not assigned to individual households or segments. Departures withdraw a local-average deposit estimate, capped to unlocked balances; term deposits stay locked. Outflows move cash and deposits together, not operating profit. Funding sales may realize losses. Product-fit figures use the existing local deposit mix, not the sales mix you just selected. This is not yet individual household finance, cross-selling or loan delinquency.</p><p class="micro muted">Forecasts use the current book and draft staffing. Executive events, rival moves and new customers can change the final month. Aggregate bank coverage is not a promise that every segment is adequately served.</p></details>`;
  $('#householdMarket').addEventListener('change', e => { selectedHouseholdMarket = e.target.value; renderHouseholds(v); });
  const update = () => stageHouseholdPolicy(v, Number($('#householdRetention').value), Object.fromEntries(Object.keys(E.CUSTOMER_SEGMENTS).map(s => [s, Number($('#household-' + s).value)])));
  $('#householdRetention').addEventListener('change', update);
  for (const s of Object.keys(E.CUSTOMER_SEGMENTS)) $('#household-' + s).addEventListener('change', update);
}
