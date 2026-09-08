let customerEffectsCache = null, customerEffectsUndo = null;
function customerEffectsKey(v) {
 return JSON.stringify([v.me.id, v.cycle, v.resolutionId, v.economy, v.me, draft]);
}
function customerEffectsLive(v) {
 const live = currentView();
 return live && live.me.id === v.me.id ? live : null;
}
function customerEffectsPatch(base, patch) {
 if (!patch || Array.isArray(patch) || Object.keys(patch).some(key => !['allocation', 'relationshipOfferPolicy'].includes(key))) throw Error('Unknown customer comparison patch.');
 const next = JSON.parse(JSON.stringify(base));
 for (const key of ['allocation', 'relationshipOfferPolicy']) if (patch[key]) next[key] = { ...next[key], ...patch[key] };
 return next;
}
function requestCustomerEffects(v) {
 const live = customerEffectsLive(v);
 if (!live || !draft || !live.me.relationshipOffers || live.me.submitted || live.gameOver) return false;
 const key = customerEffectsKey(live);
 try {
  // Full operating comparisons run only on an explicit request or stage click.
  const result = E.customerEffectsComparison(live.me, draft, live.economy);
  const fresh = customerEffectsLive(live);
  if (!fresh || fresh.me.submitted || fresh.gameOver || customerEffectsKey(fresh) !== key) return false;
  customerEffectsCache = { key, result }; renderProductPrograms(fresh); return true;
 } catch (e) { toast(e.message); return false; }
}
function stageCustomerEffects(v, key) {
 const live = customerEffectsLive(v);
 if (!live || !draft || !live.me.relationshipOffers || live.me.submitted || live.gameOver || !customerEffectsCache || customerEffectsCache.key !== customerEffectsKey(live)) return false;
 const shown = customerEffectsCache.result.rows.find(row => row.key === key);
 if (!shown?.eligible) return false;
 try {
  if (JSON.stringify(customerEffectsPatch(draft, shown.patch)) === JSON.stringify(draft)) return false;
  const sourceKey = customerEffectsKey(live);
  const result = E.customerEffectsComparison(live.me, draft, live.economy), row = result.rows.find(item => item.key === key);
  const fresh = customerEffectsLive(live);
  if (!row?.eligible || !fresh || fresh.me.submitted || fresh.gameOver || customerEffectsKey(fresh) !== sourceKey) return false;
  const checked = customerEffectsPatch(draft, row.patch);
  E.normalizeProductProgramPlan(live.me, checked); E.normalizeAdvertisingPlan(live.me, checked); E.normalizeRelationshipOfferPlan(live.me, checked);
  const status = E.projectPlanStatus(live.me, checked);
  if (!status.eligible) throw Error(status.reason);
  // Normalizers may repair unrelated derived fields. Validate those repairs,
  // but stage only the two fields explicitly offered by this comparison.
  const next = customerEffectsPatch(draft, Object.fromEntries(Object.keys(row.patch).map(field => [field, checked[field]])));
  if (JSON.stringify(next) === JSON.stringify(draft)) return false;
  const before = JSON.parse(JSON.stringify(draft)); draft = next;
  customerEffectsUndo = { before, applied: customerEffectsKey(live) }; customerEffectsCache = null;
  render(); return true;
 } catch (e) { toast(e.message); return false; }
}
function undoCustomerEffects(v) {
 const live = customerEffectsLive(v);
 if (!live || !draft || !live.me.relationshipOffers || live.me.submitted || live.gameOver || !customerEffectsUndo || customerEffectsUndo.applied !== customerEffectsKey(live)) return false;
 draft = JSON.parse(JSON.stringify(customerEffectsUndo.before)); customerEffectsUndo = null; customerEffectsCache = null;
 render(); return true;
}
function customerEffectsContent(v) {
 if (!v.me.relationshipOffers || v.gameOver || !draft) { customerEffectsCache = null; customerEffectsUndo = null; return ''; }
 const key = customerEffectsKey(v), locked = v.me.submitted;
 if (customerEffectsCache?.key !== key) customerEffectsCache = null;
 if (customerEffectsUndo?.applied !== key) customerEffectsUndo = null;
 const result = customerEffectsCache?.result;
 const dollars = n => (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString();
 const signed = n => (n > 0 ? '+' : '') + dollars(n), pct = n => (n * 100).toFixed(0) + '%';
 const pair = (before, after, format = integer) => format(before) + ' → ' + format(after);
 let comparison = '<p class="micro muted">Run a comparison for this exact draft. Changes to staffing, products, budgets or the customer book clear these results.</p>';
 if (result?.supported) {
  const target = result.target;
  const label = target ? esc((v.territories[target.market]?.name || target.market) + ' · ' + (E.CUSTOMER_SEGMENTS[target.segment]?.name || target.segment) + ' · ' + (v.productPortfolios.retail.options[target.product]?.name || target.product)) : 'Comparison unavailable for this draft';
  const rows = result.rows.map(row => {
   let unchanged = false;
   try { unchanged = JSON.stringify(customerEffectsPatch(draft, row.patch)) === JSON.stringify(draft); } catch { unchanged = true; }
   if (!row.metrics) return '<tr><th scope="row">' + esc(row.label) + '</th><td colspan="5">' + esc(row.reason || 'This reassignment is unavailable.') + '</td></tr>';
   const m = row.metrics, a = m.opening, b = m.closing;
   const action = unchanged ? '<span class="micro">Already in draft</span>' : '<button type="button" class="btn" id="customerEffectsStage-' + esc(row.key) + '" ' + (locked || !row.eligible ? 'disabled' : '') + '>Stage changes</button>';
   return '<tr><th scope="row">' + esc(row.label) + '</th><td><span>Fit ' + pair(a.fit, b.fit, pct) + '</span><span>Coverage ' + pair(a.coverage, b.coverage, pct) + '</span><span>Goodwill ' + pair(a.goodwill, b.goodwill) + '</span></td>' +
    '<td><b>' + integer(m.nextRetention.departures) + ' households</b><span>' + dollars(m.nextRetention.withdrawableOutflow) + ' withdrawable outflow</span></td>' +
    '<td><b>' + signed(m.bank.netOperating) + '</b><span>Loan change ' + signed(m.bank.loanGrowth) + '</span></td>' +
    '<td><b>' + integer(m.offer.converted) + ' equivalents · ' + dollars(m.offer.cost) + ' expense</b><span>' + dollars(m.offer.principal) + ' existing balances switched</span></td>' +
    '<td>' + action + (!row.eligible ? '<span>' + esc(row.reason || 'Not eligible to stage.') + '</span>' : '') + '</td></tr>';
  }).join('');
  const details = result.rows.filter(row => row.metrics).map(row => {
   const m = row.metrics, a = m.opening, b = m.closing;
   return '<div><h4>' + esc(row.label) + '</h4><p class="micro">Target households: ' + pair(a.households, b.households) + '. Withdrawable balances: ' + pair(a.withdrawablePrincipal, b.withdrawablePrincipal, dollars) + '. Locked balances: ' + pair(a.lockedPrincipal, b.lockedPrincipal, dollars) + '.</p>' +
    '<p class="micro">Current-month retention: ' + integer(m.currentRetention.departures) + ' departures / ' + dollars(m.currentRetention.withdrawableOutflow) + ' outflow. Bank deposit change: ' + signed(m.bank.depositGrowth) + '; funding-sale loss: ' + dollars(m.bank.fundingLoss) + '. Monthly direct-cost change from switching: ' + signed(m.offer.runRateDelta) + '.</p>' +
    '<p class="micro">Plan spend: ' + dollars(m.budget.total) + '; remaining within limits: ' + dollars(m.budget.remaining) + '. Execution capacity: ' + m.budget.load.toFixed(1) + ' / ' + m.budget.capacity.toFixed(1) + '.</p></div>';
  }).join('');
  comparison = '<p class="small"><b>' + label + '</b></p><p class="micro">Target metrics show opening → closing. Retention is a separate next-opening quote. Bank operating results cover the whole bank after funding-sale losses; switched principal is not income.</p>' +
   '<p class="micro">Conditional next-opening retention holds the estimated closing book, staffing and policies fixed. It excludes intervening rival actions, events, maturities, hiring and economic changes.</p>' +
   '<div class="customer-effects-scroll" tabindex="0" role="region" aria-label="Customer effects scenarios"><table class="customer-effects-table"><thead><tr><th scope="col">Scenario</th><th scope="col">Target fit / service</th><th scope="col">Conditional next-opening retention</th><th scope="col">Bank operating result</th><th scope="col">Product switch</th><th scope="col">Draft only</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
   '<p class="micro">Staffing alternatives move exactly one existing banker from Business to Retail. ' + esc(result.reassignment.eligible ? 'The Business donor and service checks pass; each scenario must also fit the full plan limits.' : result.reassignment.reason || 'The reassignment is unavailable.') + '</p>' +
   '<details class="customer-effects-detail"><summary>Balances, plan limits and comparison assumptions</summary>' + details +
   '<p class="micro muted">' + (result.assumptions || []).map(esc).join('<br>') + '</p></details>';
 } else if (result) comparison = '<p class="micro">This campaign does not support the comparison.</p>';
 return '<details class="customer-effects-panel"' + (result || customerEffectsUndo ? ' open' : '') + '><summary>Compare customer effects</summary><p class="micro">Compare offers paused, offers as staged, one Business banker reassigned to Retail, and both changes together. These are tradeoffs, not a recommendation or a measured return on investment.</p>' +
  '<div class="customer-effects-actions"><button type="button" class="btn" id="customerEffectsCompare" ' + (locked ? 'disabled' : '') + '>Run comparison</button>' +
  (customerEffectsUndo && !locked ? '<button type="button" class="btn" id="customerEffectsUndo">Undo staged changes</button>' : '') + '</div>' + comparison +
  '<p class="micro muted">Stage changes only the displayed staffing and offer instruction. Other draft choices remain yours. Undo is available until you edit the staged draft, its source books change or the turn locks.</p></details>';
}
function bindCustomerEffects(v) {
 $('#customerEffectsCompare')?.addEventListener('click', () => requestCustomerEffects(v));
 $('#customerEffectsUndo')?.addEventListener('click', () => undoCustomerEffects(v));
 for (const key of ['baseline', 'offers', 'staffing', 'combined']) $('#customerEffectsStage-' + key)?.addEventListener('click', () => stageCustomerEffects(v, key));
}
