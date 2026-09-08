// The desk stages one recurring instruction. Pending requests remain outside
// the bank until the shared settlement quote actually activates them.
function onboardingReason(reason) {
 return {
  closed: 'The selected product is closed here; new applications and processing are paused.',
  disabled: 'Paused by your standing instruction. Existing applications still age and expire.',
  'no-capacity': 'No whole unit of application work fits the reserved Retail time.',
  'no-audience': 'No outside audience is available for this instruction.',
  'no-deposits': 'Outside deposit funds are unavailable for activation.',
  'cash-reserve': 'Cash or capital protection prevents the activation expense.',
  waiting: 'No activation or new application is forecast under this instruction.',
  expired: 'The application’s two eligible months have passed.',
  cancelled: 'The application’s product is now closed or retired.',
  ready: 'Available work and outside supply support this conditional quote.',
  'stock-capped': 'Outside households or deposit funds limit the quote.',
  'budget-capped': 'The draft expense ceiling or available funds limit activation.'
 }[reason] || reason;
}
function onboardingSourceKey(v) {
 return JSON.stringify([v.version, v.cycle, v.resolutionId, v.gameOver, v.economy, v.me, draft]);
}
function onboardingLive(v) {
 const live = currentView();
 return live && live.me.id === v.me.id ? live : null;
}
function onboardingDraftPreview(v) {
 const plan = JSON.parse(JSON.stringify(draft)), p = JSON.parse(JSON.stringify(v.me));
 E.normalizeProductProgramPlan(v.me, plan); E.normalizeAdvertisingPlan(v.me, plan);
 E.normalizeRelationshipOfferPlan(v.me, plan); E.normalizeOnboardingPlan(v.me, plan);
 p.doctrine = typeof p.doctrine === 'object' ? p.doctrine.key : p.doctrine;
 p.focus = plan.focus; p.allocation = { ...plan.allocation };
 p.policies = { deposit: plan.depositPolicy, lending: plan.lendingPolicy, capital: plan.capitalPolicy };
 p.householdBook.policy = JSON.parse(JSON.stringify(plan.householdPolicy || p.householdBook.policy));
 p.workforce.policy = JSON.parse(JSON.stringify(plan.workforcePolicy || p.workforce.policy));
 E.applyProductProgramPolicy(p, plan.productProgramPolicy); E.applyAdvertisingPolicy(p, plan.advertisingPolicy);
 E.applyRelationshipOfferPolicy(p, plan.relationshipOfferPolicy); E.applyOnboardingPolicy(p, plan.onboardingPolicy);
 // Retirement is a one-time command. Quote its budget from the untouched
 // owner, not the already-retired product preview, then apply it exactly once.
 const budget = E.planBudget(v.me, plan);
 p._workforceReserved = budget.total - (budget.training || 0) - (budget.advertising || 0) - (budget.relationshipOffers || 0) - (budget.onboarding || 0);
 p._onboardingBudget = E.onboardingBudget(v.me, plan);
 p._relationshipOfferBudget = E.relationshipOfferBudget(v.me, plan);
 return { p, policy: plan.onboardingPolicy };
}
function onboardingBatchOutcomes(v, rows, conditional) {
 if (!rows.length) return '';
 return '<h4>Opening application batches</h4><ul class="onboarding-batches">' + rows.map(row => {
  const target = (v.territories[row.market]?.name || row.market) + ' · ' + (E.CUSTOMER_SEGMENTS[row.segment]?.name || row.segment) + ' · ' + (v.productPortfolios.retail.options[row.product]?.name || row.product);
  return '<li><b>' + esc(target) + '</b><span>Generated M' + esc(row.createdCycle) + ' · eligible M' + esc(row.eligibleCycle) + '–M' + esc(row.expiresCycle - 1) + ' · expires M' + esc(row.expiresCycle) + '</span><span>' + integer(row.activated) + ' / ' + integer(row.count) + (conditional ? ' conditional activations' : ' activated') + ' · $' + row.cost.toLocaleString() + ' activation expense. ' + esc(onboardingReason(row.reason)) + '</span></li>';
 }).join('') + '</ul>';
}
function onboardingPendingContent(v) {
 const pending = v.me.onboarding.pending;
 if (!pending.length) return '<p class="micro muted">Your current application queue is empty.</p>';
 return '<details class="onboarding-details"><summary>Current pending requests · ' + integer(pending.reduce((n, row) => n + row.count, 0)) + '</summary><ul class="onboarding-batches">' + pending.map(row => {
  const target = (v.territories[row.market]?.name || row.market) + ' · ' + (E.CUSTOMER_SEGMENTS[row.segment]?.name || row.segment) + ' · ' + (v.productPortfolios.retail.options[row.product]?.name || row.product);
  return '<li><b>' + esc(target) + '</b><span>' + integer(row.count) + ' pending requests · $' + row.principal.toLocaleString() + ' requested principal; not deposits</span><span>Generated M' + esc(row.createdCycle) + ' · eligible M' + esc(row.eligibleCycle) + '–M' + esc(row.expiresCycle - 1) + ' · expires M' + esc(row.expiresCycle) + '</span><span>Source-month awareness: ' + (row.awareness / 100).toFixed(1) + '%. A recorded targeting input, not measured causal lift or a promise of activation.</span></li>';
 }).join('') + '</ul></details>';
}
function onboardingContent(v) {
 if (!v.me.onboarding || !draft) return '';
 const dollars = n => '$' + Math.round(n).toLocaleString();
 const stat = (label, value, detail = '') => '<div><small>' + label + '</small><b>' + value + '</b>' + (detail ? '<span>' + detail + '</span>' : '') + '</div>';
 const last = v.me.onboarding.report;
 let actual = '<p class="notice">No completed onboarding month yet. Applications and activations settle only with the monthly plan.</p>';
 if (last) {
  const t = last.totals;
  actual = '<h3>LAST ACTUAL · MONTH ' + esc(last.cycle) + '</h3><p class="micro">' + esc(onboardingReason(last.reason)) + '</p><div class="onboarding-summary">' +
   stat('Applications generated', integer(t.generated.count), dollars(t.generated.principal) + ' requested; not deposits') +
   stat('Activated relationships', integer(t.activated.count), dollars(t.activated.principal) + ' actual deposit inflow') +
   stat('Actual activation expense', dollars(last.cost)) +
   stat('Expired applications', integer(t.expired.count)) + stat('Cancelled applications', integer(t.cancelled.count), 'Closed or retired product') +
   stat('Eligible requests still waiting', integer(t.due.count - t.activated.count), 'Blocked or unprocessed; not accepted customers') +
   stat('Pending after settlement', integer(t.after.count), dollars(t.after.principal) + ' requested; not deposits') + '</div><details class="onboarding-details"><summary>Last actual application outcomes</summary>' + onboardingBatchOutcomes(v, last.rows, false) + '</details>';
 }
 const caveat = '<p class="notice onboarding-caveat">Pending applications are not owned households or deposits. They do not reserve outside customers or funds. Only activation transfers available outside relationships and deposits into your bank.</p>';
 if (v.gameOver) return '<section class="onboarding-desk"><h3>APPLICATIONS &amp; ONBOARDING</h3><p class="notice">Campaign complete. No further applications or activation work can be staged.</p>' + caveat + onboardingPendingContent(v) + actual + '</section>';
 let prepared, quote;
 try {
  prepared = onboardingDraftPreview(v);
  quote = E.onboardingReview(prepared.p, v, prepared.policy);
 } catch (error) {
  return '<section class="onboarding-desk"><h3>APPLICATIONS &amp; ONBOARDING</h3>' + caveat + '<p class="notice">Draft quote unavailable: ' + esc(error.message) + '</p>' + actual + '</section>';
 }
 const { p, policy } = prepared, t = quote.totals, disabled = v.me.submitted ? 'disabled' : '';
 const select = (field, label, options) => '<label for="onboarding-' + field + '">' + label + '<select id="onboarding-' + field + '" ' + disabled + '>' +
  options.map(([value, name, closed]) => '<option value="' + esc(value) + '" ' + (String(policy[field]) === String(value) ? 'selected' : '') + ' ' + (closed ? 'disabled' : '') + '>' + esc(name) + '</option>').join('') + '</select></label>';
 const controls = select('market', 'New application market', Object.entries(v.territories).map(([key, item]) => [key, item.name])) +
  select('segment', 'New application segment', Object.entries(E.CUSTOMER_SEGMENTS).map(([key, item]) => [key, item.name])) +
  select('product', 'New application product', Object.entries(v.productPortfolios.retail.options).map(([key, item]) => [key, item.name + (p.productPrograms.markets[policy.market][policy.segment][key] ? '' : ' · sales closed'), !p.productPrograms.markets[policy.market][policy.segment][key]])) +
  select('share', 'Share of remaining Retail sales time', [0, 25, 50].map(n => [n, n ? n + '% to onboarding' : 'Paused · 0%']));
 return '<section class="onboarding-desk"><h3>APPLICATIONS &amp; ONBOARDING</h3><p class="small muted">Generate outside-customer applications, then use later-month capacity to activate them. This instruction recurs until revised.</p>' + caveat +
  '<div class="onboarding-controls">' + controls + '</div><p class="micro">These target controls select new applications, not your plan’s focus. Queue counts are bank-wide: eligible requests for previous targets still activate oldest first. Closing or retiring a product cancels its pending applications at settlement. Pausing processing does not stop application expiry.</p>' +
  '<h3>CONDITIONAL CURRENT-MONTH QUOTE · MONTH ' + esc(quote.cycle) + '</h3><p class="micro ' + (quote.paused || quote.budgetLimited || quote.stockLimited ? 'warn' : '') + '">' + esc(onboardingReason(quote.reason)) + '</p><div class="onboarding-summary">' +
  stat('Pending before settlement', integer(t.before.count), dollars(t.before.principal) + ' requested; not deposits') +
  stat('Eligible-age applications', integer(t.due.count), 'Acceptance still depends on product, capacity and outside supply') +
  stat('Conditional activations', integer(t.activated.count), dollars(t.activated.principal) + ' potential deposit inflow') +
  stat('New applications forecast', integer(t.generated.count), dollars(t.generated.principal) + ' requested; cannot activate this month') +
  stat('Activation expense quote', dollars(quote.cost), dollars(quote.budget) + ' draft ceiling') +
  stat('Reserved / remaining Retail time', quote.assignedStaff.toFixed(2) + ' / ' + quote.salesStaff.toFixed(2), 'Effective bankers after retention and existing-customer offers') + '</div>' + onboardingPendingContent(v) +
  '<details class="onboarding-details"><summary>Timing, blocked applications and capacity</summary><div class="onboarding-summary">' +
  stat('Work used / capacity', integer(quote.workUsed) + ' / ' + integer(quote.capacity)) +
  stat('Expiring this settlement', integer(t.expired.count)) +
  stat('Cancelled this settlement', integer(t.cancelled.count)) +
  stat('Eligible requests still waiting', integer(t.due.count - t.activated.count), 'Blocked or unprocessed; not accepted customers') +
  stat('Pending after this quote', integer(t.after.count), dollars(t.after.principal) + ' requested; not deposits') + '</div>' +
  onboardingBatchOutcomes(v, quote.rows, true) +
  '<p class="micro">Applications generated in month M can activate in M+1 or M+2 and expire in M+3. No same-month activation. Oldest eligible applications use work first; remaining work generates new requests. Both generation and activation consume one work unit per relationship. Pending principal is a request, not escrow, guaranteed funding or income.</p>' +
  '<p class="micro">Only activated principal incurs onboarding expense: ' + Object.values(E.CUSTOMER_SEGMENTS).map(s => esc(s.name) + ' ' + (s.onboarding * 100).toFixed(2) + '%').join(' · ') + '. Application generation has no separate cash fee. Reserved staff are existing payroll, not new recruits; this time is unavailable for ordinary Retail acquisition and advertising-assisted intake.</p>' +
  '<p class="micro muted">This shared quote uses today’s outside supply and normalized draft policies. New-request counts use current audience awareness; this month’s advertising reach and decay apply at settlement. Rival activity, executive events and other monthly changes can block or reduce activation. Blocked requests can remain pending until expiry; actuals may differ. Onboarding is separate from ordinary intake, advertising attribution and existing-customer product switches.</p></details>' + actual + '</section>';
}
function stageOnboarding(v, field, value, sourceKey = onboardingSourceKey(v)) {
 const live = onboardingLive(v);
 if (!live || !draft || !live.me.onboarding || live.me.submitted || live.gameOver || !['market', 'segment', 'product', 'share'].includes(field) || sourceKey !== onboardingSourceKey(live)) return false;
 try {
  const next = JSON.parse(JSON.stringify(draft));
  next.onboardingPolicy = { ...(next.onboardingPolicy || live.me.onboarding.policy), [field]: field === 'share' ? Number(value) : value };
  E.normalizeProductProgramPlan(live.me, next); E.normalizeAdvertisingPlan(live.me, next);
  E.normalizeRelationshipOfferPlan(live.me, next); E.normalizeOnboardingPlan(live.me, next);
  const status = E.projectPlanStatus(live.me, next);
  const decrease = field === 'share' && next.onboardingPolicy.share < (draft.onboardingPolicy || live.me.onboarding.policy).share && E.onboardingBudget(live.me, next) <= E.onboardingBudget(live.me, draft);
  if (!status.eligible && !decrease) throw Error(status.reason);
  const fresh = onboardingLive(live);
  if (!fresh || fresh.me.submitted || fresh.gameOver || sourceKey !== onboardingSourceKey(fresh)) return false;
  draft = next; renderProducts(fresh); renderProjects(fresh); renderReady(fresh); return true;
 } catch (error) { toast(error.message); const fresh = onboardingLive(live); if (fresh) renderProductPrograms(fresh); return false; }
}
function bindOnboardingDesk(v) {
 const sourceKey = onboardingSourceKey(v);
 for (const field of ['market', 'segment', 'product', 'share']) $('#onboarding-' + field)?.addEventListener('change', event => stageOnboarding(v, field, event.target.value, sourceKey));
}
