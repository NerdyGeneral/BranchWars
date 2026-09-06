let recoveryComparison = null, recoveryUndo = null;
function recoveryDraftKey(v) {
  return JSON.stringify([v.me.id, v.cycle, draft]);
}
function recoveryChanges(before, after) {
  const labels = { decision:'Executive response', allocation:'Department staffing', depositPolicy:'Deposit pricing',
    lendingPolicy:'Lending standards', capitalPolicy:'Treasury mandate', householdPolicy:'Household retention',
    collectionsPolicy:'Collections', servicePolicy:'Commercial delivery', investments:'Research budget',
    newProjects:'New initiatives', hires:'Recruiting', specialistHires:'Specialist recruiting',
    workforcePolicy:'Training and workforce', advertisingPolicy:'Advertising', competitiveAction:'Competitive action',
    productProgramPolicy:'Product instructions', termPolicy:'Term deposits', opportunity:'Opportunity pursuit',
    contractBid:'Service bid', capitalAction:'Board assistance', products:'Portfolio mix' };
  return Object.entries(labels).filter(([key])=>JSON.stringify(before[key])!==JSON.stringify(after[key])).map(([,label])=>label);
}
function stageBankRecovery(v, key) {
  if (!draft || v.me.submitted || !recoveryComparison || recoveryComparison.key !== recoveryDraftKey(v)) return false;
  const option = recoveryComparison.options.find(o=>o.key===key);
  if (!option) return false;
  const next = JSON.parse(JSON.stringify(option.plan));
  try {
    E.normalizeProductProgramPlan(v.me, next);
    const status = E.projectPlanStatus(v.me, next);
    if (!status.eligible) throw Error(status.reason);
    const before = JSON.parse(JSON.stringify(draft));
    draft = next;
    recoveryUndo = { owner:v.me.id, cycle:v.cycle, before, applied:recoveryDraftKey(v) };
    recoveryComparison = null;
    render();
    return true;
  } catch (e) { toast(e.message); return false; }
}
function undoBankRecovery(v) {
  if (v.me.submitted || !recoveryUndo || recoveryUndo.owner!==v.me.id || recoveryUndo.cycle!==v.cycle || recoveryUndo.applied!==recoveryDraftKey(v)) return false;
  draft = JSON.parse(JSON.stringify(recoveryUndo.before));
  recoveryUndo = null; recoveryComparison = null;
  render();
  return true;
}
function renderBankRecovery(v) {
  const previous = $('#bankRecovery');
  if (previous) previous.remove();
  $('#recoveryWorkspace').classList.toggle('hidden', !v.me.productPrograms);
  if (!v.me.productPrograms || !draft) return;
  const key = recoveryDraftKey(v), locked = v.me.submitted;
  const selected = recoveryComparison?.key===key ? recoveryComparison : null;
  const undoable = !locked && recoveryUndo?.applied===key;
  const ratios = v.me.capitalRatio;
  const header = ratios<10 ? 'Capital recovery needs attention' : 'Compare recovery tradeoffs';
  const cards = selected ? selected.options.map(o=>{
    const changes = recoveryChanges(draft,o.plan), r = o.review;
    return `<article class="recovery-option"><h4>${esc(o.label)}</h4><p class="small">${esc(o.description||'')}</p><p class="micro">Changes: ${esc(changes.join(', ')||'No draft changes')}.</p>
      ${o.changes?.length?`<p class="micro">${o.changes.map(esc).join('<br>')}</p>`:''}
      ${o.plan.decision!==draft.decision?`<p class="small"><b>Executive response:</b> ${esc(o.plan.decision==='a'?v.event.a:v.event.b)}</p>`:''}
      <div class="recovery-metrics"><span>Estimated equity change<b>${money(r.netAfterSpend)}</b></span><span>After-plan equity<b>${money(r.equityAfterPlan)}</b></span><span>Known decision expense<b>${money(r.decisionExpense)}</b></span></div>
      <button type="button" class="btn" data-recovery-option="${esc(o.key)}" ${locked?'disabled':''}>Stage this option</button></article>`;
  }).join('') : '';
  const current = selected?.current;
  $('#bankRecoveryMount').insertAdjacentHTML('afterbegin', `<section id="bankRecovery" class="recovery-panel">
    <h3>${header.toUpperCase()}</h3><p class="small">Cash is not equity. Your ${money(v.me.stats.deposits)} deposit book is customer funding, not a solvency buffer. Capital ratio: <b>${ratios.toFixed(1)}%</b>; equity: <b>${money(v.me.stats.capital)}</b>.</p>
    <p class="micro muted">Compare reversible operating choices using your own books. No free capital, debt forgiveness, guaranteed survival or automatic change to your plan.</p>
    <div class="recovery-controls"><button type="button" class="btn" id="compareRecovery" ${locked||!draft.decision?'disabled':''}>Compare recovery options</button>${undoable?'<button type="button" class="btn" id="undoRecovery">Undo staged recovery</button>':''}</div>
    ${!draft.decision?'<p class="micro">Choose an executive response first so its expense can be included.</p>':''}
    ${current?`<p class="small">Current draft estimated equity change: <b>${money(current.netAfterSpend)}</b> · after-plan equity: <b>${money(current.equityAfterPlan)}</b> · known decision expense: <b>${money(current.decisionExpense)}</b>.</p><div class="recovery-options">${cards}</div>${cards?'':'<p class="small">No qualifying improvement found among these limited recovery choices. Review staffing, product costs and signed commitments manually.</p>'}`:''}
    <details><summary>What the comparison does—and does not—predict</summary><p class="micro">One-month estimate under the current economy. Includes known executive expense and planned spending without counting advertising or training twice. Excludes uncertain executive effects, rival actions, opportunity awards, regulatory sales, future project benefits and changes in demand. Existing product guarantees and signed obligations remain. Moving staff may reduce future sales even when current profit improves. A larger deposit share alone does not mean a healthier bank.</p><p class="micro">Stage changes only your draft; review the affected departments and executive response before Mark Ready. Undo is available until you edit that staged draft or lock the turn. Not every failing bank has a viable recovery option.</p></details>
  </section>`);
  $('#compareRecovery').addEventListener('click',()=>{
    if (v.me.submitted || !draft.decision) return;
    try {
      const result = E.bankRecoveryOptions(v.me, draft, v.economy, v.event);
      recoveryComparison = { key:recoveryDraftKey(v), ...result };
      renderOperatingPreview(v);
    } catch(e) { toast(e.message); }
  });
  $$('[data-recovery-option]').forEach(el=>el.addEventListener('click',()=>stageBankRecovery(v,el.dataset.recoveryOption)));
  if (undoable) $('#undoRecovery').addEventListener('click',()=>undoBankRecovery(v));
}
