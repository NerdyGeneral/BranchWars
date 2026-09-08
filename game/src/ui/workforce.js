let selectedWorkforceRole = 'service';
function stageSpecialistHire(v, role, step) {
  if (!draft || v.me.submitted || !v.me.workforce) return false;
  const candidate = JSON.parse(JSON.stringify(draft));
  candidate.specialistHires = { ...E.emptySpecialistOrders(), ...candidate.specialistHires };
  candidate.specialistHires[role] = Math.max(0, candidate.specialistHires[role] + step);
  try {
    E.normalizeWorkforcePlan(v.me, candidate);
    if (step > 0 && E.planBudget(v.me, candidate).remaining < 0) throw Error('The combined plan exceeds cash or capital limits.');
    draft = candidate;
    renderProjects(v); renderReady(v);
    return true;
  } catch (e) { toast(e.message); return false; }
}
function stageWorkforcePolicy(v, role, budget, reserve) {
  if (!draft || v.me.submitted || !v.me.workforce) return false;
  const candidate = JSON.parse(JSON.stringify(draft));
  candidate.workforcePolicy = JSON.parse(JSON.stringify(candidate.workforcePolicy || v.me.workforce.policy));
  candidate.workforcePolicy.training[role] = budget;
  candidate.workforcePolicy.reserve = reserve;
  try {
    E.normalizeWorkforcePlan(v.me, candidate);
    draft = candidate;
    renderProjects(v); renderReady(v);
    return true;
  } catch (e) { toast(e.message); renderWorkforce(v); return false; }
}
function renderWorkforce(v) {
  renderHouseholds(v);
  $('#workforceNav').classList.toggle('hidden', !v.me.workforce);
  if (!v.me.workforce) {
    $('#workforcePanel').innerHTML = '';
    if (workspaceTab === 'workforce') setWorkspaceTab('overview');
    return;
  }
  if (workspaceTab !== 'workforce') return;
  let review;
  try { review = E.workforceReview(v.me, draft, v.economy); }
  catch (e) { $('#workforcePanel').innerHTML = '<p class="bad">' + esc(e.message) + '</p>'; return; }
  const row = review.rows.find(r => r.role === selectedWorkforceRole) || review.rows[0];
  const disabled = v.me.submitted ? 'disabled' : '';
  const candidate = JSON.parse(JSON.stringify(draft));
  candidate.specialistHires[row.role]++;
  const addBlocked = E.planHires(candidate) > E.hireLimit(v.me) || E.planBudget(v.me, candidate).remaining < 0;
  const actual = v.me.operatingReport, forecast = review.forecast;
  const table = review.rows.map(r => '<tr><th>' + esc(r.name) + '</th><td>' + r.count + ' / ' + r.assigned + '</td><td>' +
    (r.count ? r.skill + '/100' : 'Not hired') + '</td><td>+' + r.bonus.toFixed(2) + '</td><td>' + money(r.payroll) + '</td></tr>').join('');
  $('#workforcePanel').innerHTML = `
    <div class="section-head"><div><h2>WORKFORCE &amp; DEPARTMENT DEVELOPMENT</h2><p class="small muted">Build expertise without losing control of payroll. Changes are staged until both plans lock.</p></div><span class="small">${review.generalists} generalists · ${v.me.stats.staff - review.generalists} specialists</span></div>
    <div class="workforce-summary">
      <div><span>Existing salary premiums</span><b>${money(review.payroll)}/month</b><small>In addition to base payroll; paid even if reassigned.</small></div>
      <div><span>Forecast training spend</span><b>${money(review.training.total)}/month</b><small>${review.training.paused ? 'All department training paused by cash/capital protection.' : 'Only existing specialists below 100 skill can train.'}</small></div>
      <div><span>Combined recruiting</span><b>${E.planHires(draft)}/6 bankers · ${money(review.quote.recruiting)}</b><small>Generalists and specialists share this limit. Recruits arrive next month.</small></div>
    </div>
    <div class="table-scroll"><table class="regional-table"><thead><tr><th>Specialty</th><th>Qualified / assigned staff</th><th>Skill</th><th>Effective staff bonus</th><th>Salary premium/month</th></tr></thead><tbody>${table}</tbody></table></div>
    <p class="micro muted">Qualified specialists are part of total headcount, not additional bankers. A specialist outside their own department works as a generalist: no cross-department skill bonus. Business expertise is split between sales and reserved delivery; it is never counted twice.</p>
    <div class="workforce-grid">
      <section class="workforce-card"><label for="workforceDepartment">DEPARTMENT</label><select id="workforceDepartment">${review.rows.map(r => '<option value="' + r.role + '" ' + (r.role === row.role ? 'selected' : '') + '>' + esc(r.name) + '</option>').join('')}</select>
        <h3>${esc(row.name)}</h3><p class="small">${esc(row.effect)}</p>
        <p class="small">${row.active} of ${row.count} qualified bankers working in this department. Current effective capacity: <b>${row.assigned} + ${row.bonus.toFixed(2)}</b>.</p>
        <div class="workforce-skill" role="meter" aria-label="${esc(row.name)} skill" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${row.skill}"><span style="width:${row.skill}%"></span></div>
        <p class="micro">Skill ${row.skill}/100 → <b>${row.nextSkill}/100</b> after forecast training, before new recruits. Recruits enter at skill 20 and dilute the team average; they do not train or produce this month.</p>
        <div class="hire-row"><button type="button" class="stepper" id="specialistLess" aria-label="Remove one ${esc(row.name)} recruit" ${disabled || (!row.hires ? 'disabled' : '')}>−</button><b>${row.hires} staged</b><button type="button" class="stepper" id="specialistMore" aria-label="Recruit one ${esc(row.name)} specialist" ${disabled || (addBlocked ? 'disabled' : '')}>+</button></div>
        <p class="micro">Each hire costs the normal size-adjusted recruiting fee <b>plus ${money(row.premium)}</b>. Ongoing pay: $18K base plus ${money(E.SPECIALIST_ROLES[row.role].payroll)} premium/month. Existing efficiency discounts affect base pay, not specialist premiums.</p>
      </section>
      <section class="workforce-card"><h3>RECURRING TRAINING MANDATE</h3>
        <label for="workforceBudget">${esc(row.name)} monthly ceiling</label><select id="workforceBudget" ${disabled}>${E.WORKFORCE_TRAINING_BUDGETS.map(n => '<option value="' + n + '" ' + (n === row.budget ? 'selected' : '') + '>' + (n ? money(n) + '/month' : 'Paused · $0') + '</option>').join('')}</select>
        <label for="workforceReserve">Bank-wide cash reserve to protect ($)</label><input id="workforceReserve" type="number" min="0" max="10000000" step="1000" value="${draft.workforcePolicy.reserve}" ${disabled}>
        <p class="small">${money(row.trainingSpend)} forecast spend in this department. Each skill point costs $1K per specialist; at most four points per month. Training stops at skill 100. Unused ceilings are not spent.</p>
        <p class="micro ${review.training.paused ? 'bad' : 'muted'}">Training is reserved alongside the full plan and included in operating expenses—do not count it twice. If the combined training bill breaches the protected cash reserve or capital limit, every department pauses together. Events and rival actions can change actual affordability.</p>
      </section>
    </div>
    <div class="workforce-results"><h3>ECONOMICS &amp; TIMING</h3><p class="small">Current draft bank operating profit: <b>${money(forecast.profit - (forecast.fundingLoss || 0))}</b>, including existing specialist premiums and affordable training. This excludes executive events, rival moves, new project completions and recruiting expenditure. No immediate benefit from new hires or this month's training.</p>
    <p class="micro">${actual ? 'Last completed month ' + actual.cycle + ': specialist premiums ' + money(actual.specialistPayroll || 0) + '; paid training ' + money(actual.workforceTraining || 0) + (actual.workforceTrainingPaused ? ' — reserve protection paused training.' : '.') : 'Paid training and realized premiums appear after the first completed month.'}</p>
    <details><summary>How expertise changes capacity</summary><p class="micro">Each qualified specialist assigned to their own department contributes 0.10 + 0.003 × skill effective bankers (0.16 at entry, capped at 0.40). Retail expertise also improves workload coverage and therefore persistent goodwill. Relationship bankers support sales or service contracts according to the staff reservation. Credit analysts increase originations, not guaranteed profits. Risk expertise improves credit controls and project capacity. Generalists remain cheaper and fully flexible; training never upgrades every department at once.</p></details></div>`;
  $('#workforceDepartment').addEventListener('change', e => { selectedWorkforceRole = e.target.value; renderWorkforce(v); });
  $('#specialistLess').addEventListener('click', () => stageSpecialistHire(v, row.role, -1));
  $('#specialistMore').addEventListener('click', () => stageSpecialistHire(v, row.role, 1));
  const policy = () => stageWorkforcePolicy(v, row.role, Number($('#workforceBudget').value), Number($('#workforceReserve').value));
  $('#workforceBudget').addEventListener('change', policy);
  $('#workforceReserve').addEventListener('change', policy);
}
