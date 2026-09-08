function emptySpecialistOrders() {
  return Object.fromEntries(Object.keys(SPECIALIST_ROLES).map(k => [k, 0]));
}
function defaultWorkforcePolicy() {
  return { reserve: 500000, training: emptySpecialistOrders() };
}
function initializeWorkforce(g, o) {
  if (o.workforceVersion !== 1) return g;
  if (g.customerDemandVersion !== 2) throw Error('Specialist workforce requires the customer relationships preview.');
  g.workforceVersion = 1;
  g.version = '8.5';
  for (const p of g.players) p.workforce = {
    version: 1, lastCycle: 0, policy: defaultWorkforcePolicy(),
    departments: Object.fromEntries(Object.keys(SPECIALIST_ROLES).map(k => [k, { count: 0, skill: 0, trainingSpend: 0 }]))
  };
  return g;
}
function validateWorkforcePolicy(policy) {
  const keys = Object.keys(SPECIALIST_ROLES).sort().join();
  if (!policy || Object.keys(policy).sort().join() !== 'reserve,training' ||
      !Number.isSafeInteger(policy.reserve) || policy.reserve < 0 || policy.reserve > 10000000 ||
      !policy.training || Object.keys(policy.training).sort().join() !== keys ||
      Object.values(policy.training).some(n => !WORKFORCE_TRAINING_BUDGETS.includes(n))) {
    throw Error('Choose valid department training ceilings and a cash reserve.');
  }
  return policy;
}
function validateSpecialistOrders(orders) {
  if (!orders || Array.isArray(orders) || Object.keys(orders).some(k => !Object.hasOwn(SPECIALIST_ROLES, k)) ||
      Object.values(orders).some(n => !Number.isSafeInteger(n) || n < 0 || n > MAX_HIRES_PER_CYCLE)) {
    throw Error('Choose whole specialist hire counts within the hiring limit.');
  }
  return orders;
}
function specialistHireCount(plan) {
  // Quotes stay finite on an incomplete UI draft; submission validates every field.
  return Object.values(plan?.specialistHires || {}).reduce((n, v) => n + (Number.isSafeInteger(v) && v > 0 && v <= MAX_HIRES_PER_CYCLE ? v : 0), 0);
}
function specialistHirePremium(plan) {
  return Object.entries(SPECIALIST_ROLES).reduce((n, [k, d]) => n + Math.max(0, Math.min(MAX_HIRES_PER_CYCLE, Number(plan?.specialistHires?.[k]) || 0)) * d.premium, 0);
}
function specialistPayroll(p) {
  return p.workforce ? Object.entries(SPECIALIST_ROLES).reduce((n, [k, d]) => n + p.workforce.departments[k].count * d.payroll, 0) : 0;
}
function specialistBonus(p, role, allocation = p.allocation) {
  const row = p.workforce?.departments[role];
  return row ? Math.min(row.count, Math.max(0, allocation[role] || 0)) * (.1 + row.skill * .003) : 0;
}
function workforceAllocation(p, allocation = p.allocation) {
  if (!p.workforce) return allocation;
  return Object.fromEntries(Object.keys(ROLES).map(k => [k, allocation[k] + specialistBonus(p, k, allocation)]));
}
function specialistBusinessBonus(p, delivery = false) {
  const total = p.allocation.business;
  if (!total) return 0;
  const reserved = Math.min(total, p.serviceDesk?.policy.staff || 0);
  // Each qualified banker is used once. No double claim on sales and delivery.
  return specialistBonus(p, 'business') * (delivery ? reserved : total - reserved) / total;
}
function normalizeWorkforcePlan(p, plan) {
  if (!p.workforce) {
    if (plan.workforcePolicy !== undefined || plan.specialistHires !== undefined) throw Error('Specialists require a new workforce campaign.');
    return;
  }
  if (plan.hires !== undefined && (!Number.isSafeInteger(plan.hires) || plan.hires < 0 || plan.hires > MAX_HIRES_PER_CYCLE)) throw Error('Choose a whole generalist hire count.');
  if (plan.hires === undefined) plan.hires = 0;
  plan.specialistHires = { ...emptySpecialistOrders(), ...validateSpecialistOrders(plan.specialistHires || {}) };
  plan.workforcePolicy = JSON.parse(JSON.stringify(validateWorkforcePolicy(plan.workforcePolicy || p.workforce.policy)));
  if (planHires(plan) > hireLimit(p)) throw Error('Generalist and specialist hires share the same six-banker monthly limit.');
}
function applyWorkforcePolicy(p, policy) {
  if (p.workforce) p.workforce.policy = JSON.parse(JSON.stringify(validateWorkforcePolicy(policy || p.workforce.policy)));
}
function workforceTrainingQuote(p, policy = p.workforce?.policy, reserved = 0) {
  if (!p.workforce) return { total: 0, requested: 0, rows: [], paused: false };
  validateWorkforcePolicy(policy);
  const rows = Object.keys(SPECIALIST_ROLES).map(role => {
    const d = p.workforce.departments[role], unit = d.count * SPECIALIST_TRAINING_COST;
    const gain = unit ? Math.min(SPECIALIST_MAX_GAIN, 100 - d.skill, Math.floor(policy.training[role] / unit)) : 0;
    return { role, count: d.count, skill: d.skill, gain, spend: gain * unit };
  });
  const requested = rows.reduce((n, r) => n + r.spend, 0);
  const available = Math.max(0, Math.min(p.stats.cash - policy.reserve, pilotSpendingLimit(p)) - Math.max(0, reserved));
  // All departments pause together: no hidden priority from object iteration order.
  const paused = requested > available;
  if (paused) for (const row of rows) { row.gain = 0; row.spend = 0; }
  return { total: paused ? 0 : requested, requested, rows, paused };
}
function workforceOperatingCosts(p) {
  const training = workforceTrainingQuote(p, p.workforce.policy, p._workforceReserved || 0);
  return { payroll: specialistPayroll(p), training };
}
function workforceLateReserve(p, plan) {
  const research = Object.values(plan.investments || {}).reduce((n, v) => n + Math.max(0, Number(v) || 0), 0);
  return research + hireCost(p, planHires(plan)) + specialistHirePremium(plan);
}
function addWorkforceReport(p, report) {
  if (!p.workforce) return;
  const costs = p._workforceCosts;
  report.specialistPayroll = costs.payroll;
  report.workforceTraining = costs.training.total;
  report.workforceTrainingRequested = costs.training.requested;
  report.workforceTrainingPaused = costs.training.paused ? 1 : 0;
  for (const row of costs.training.rows) {
    report['trainingSpend_' + row.role] = row.spend;
    report['trainingGain_' + row.role] = row.gain;
    report['specialistBonus_' + row.role] = specialistBonus(p, row.role);
  }
}
function settleWorkforceOperatingExpense(p, report) {
  if (!p.workforce) return;
  const before = p._workforceCosts.training;
  // Production/maturities may consume liquidity after the initial reservation.
  // Protect ordinary operating losses as well as later hiring/research. Training
  // never expands beyond the initial quote and is not multiplied by event profit.
  if (!before.paused) {
    const after = workforceTrainingQuote(p, p.workforce.policy, (p._workforceReserved || 0) + Math.max(0, -report.profit));
    if (after.paused) p._workforceCosts.training = after;
  }
  addWorkforceReport(p, report);
  report.expense += report.workforceTraining;
  report.profit -= report.workforceTraining;
}
function settleWorkforceTraining(g, p) {
  if (!p.workforce || p.workforce.lastCycle >= g.cycle) return '';
  return recordLedgerStage(g, 'settleWorkforceTraining', 'staff.training', () => {
    let spent = 0;
    for (const [role, row] of Object.entries(p.workforce.departments)) {
      const amount = p.operatingReport['trainingSpend_' + role] || 0;
      if (row.count) row.skill = Math.min(100, row.skill + (p.operatingReport['trainingGain_' + role] || 0));
      row.trainingSpend += amount;
      spent += amount;
    }
    p.workforce.lastCycle = g.cycle;
    return p.operatingReport.workforceTrainingPaused
      ? p.name + ' paused department training to protect its cash/capital reserve and later commitments.'
      : spent ? p.name + ' spent $' + spent.toLocaleString() + ' on department training; new skills apply next cycle.' : '';
  });
}
function addSpecialistRecruits(p, orders) {
  if (!p.workforce) return;
  for (const [role, n] of Object.entries(orders || {})) {
    const row = p.workforce.departments[role];
    if (!n) continue;
    row.skill = Math.floor((row.count * row.skill + n * SPECIALIST_ENTRY_SKILL) / (row.count + n));
    row.count += n;
  }
}
function reconcileSpecialistHeadcount(p) {
  if (!p.workforce) return;
  // Generic attrition consumes generalists first. A lost specialist never turns
  // into free expertise for another role; use deterministic largest-team removal.
  let count = Object.values(p.workforce.departments).reduce((n, d) => n + d.count, 0);
  while (count > p.stats.staff) {
    const role = Object.keys(SPECIALIST_ROLES).sort((a, b) => p.workforce.departments[b].count - p.workforce.departments[a].count)[0];
    const row = p.workforce.departments[role];
    row.count--; count--;
    if (!row.count) row.skill = 0;
  }
}
function transferSpecialistTalent(from, to) {
  if (!from.workforce || !to.workforce) return;
  const count = Object.values(from.workforce.departments).reduce((n, d) => n + d.count, 0);
  if (from.stats.staff > count) return; // The default raid takes a generalist first.
  const role = Object.keys(SPECIALIST_ROLES).sort((a, b) => from.workforce.departments[b].count - from.workforce.departments[a].count)[0];
  const source = from.workforce.departments[role], target = to.workforce.departments[role];
  if (!source.count) return;
  target.skill = Math.floor((target.count * target.skill + source.skill) / (target.count + 1));
  target.count++; source.count--;
  if (!source.count) source.skill = 0;
}
function workforceReview(p, input, economy) {
  if (!p.workforce) return null;
  const plan = JSON.parse(JSON.stringify(input));
  normalizeWorkforcePlan(p, plan);
  const quote = planBudget(p, plan), training = workforceTrainingQuote(p, plan.workforcePolicy, quote.total - (quote.training || 0));
  const forecast = operatingPreview({ ...p, focus: plan.focus }, plan, economy);
  training.total = forecast.workforceTraining;
  training.paused = !!forecast.workforceTrainingPaused;
  for (const row of training.rows) {
    row.spend = forecast['trainingSpend_' + row.role];
    row.gain = forecast['trainingGain_' + row.role];
  }
  const current = { ...p, allocation: plan.allocation };
  const rows = Object.entries(SPECIALIST_ROLES).map(([role, def]) => {
    const d = p.workforce.departments[role], t = training.rows.find(r => r.role === role);
    return { role, ...def, ...d, assigned: plan.allocation[role], active: Math.min(d.count, plan.allocation[role]),
      bonus: specialistBonus(current, role), hires: plan.specialistHires[role], nextSkill: d.count ? d.skill + t.gain : 0,
      trainingSpend: t.spend, budget: plan.workforcePolicy.training[role], payroll: d.count * def.payroll };
  });
  return { rows, training, quote, payroll: specialistPayroll(p), generalists: p.stats.staff - rows.reduce((n, r) => n + r.count, 0),
    forecast };
}
function planSpecialistWorkforce(g, index, input) {
  const p = g.players[index];
  if (!p.workforce) return input;
  const plan = JSON.parse(JSON.stringify(input));
  normalizeWorkforcePlan(p, plan);
  plan.workforcePolicy.reserve = 600000;
  for (const role of Object.keys(SPECIALIST_ROLES)) {
    const d = p.workforce.departments[role];
    plan.workforcePolicy.training[role] = d.count && d.skill < 60 && p.stats.lastProfit > 40000 ? 5000 : 0;
  }
  // Prefer upgrading an already-planned hire. Otherwise review one new specialist
  // every four months, preserving the existing initiatives and a capital cushion.
  if ((plan.hires > 0 || g.cycle % 4 === 2) && p.stats.lastProfit > 60000 && planHires(plan) < hireLimit(p)) {
    const roles = Object.keys(SPECIALIST_ROLES).filter(k => p.workforce.departments[k].count < plan.allocation[k]);
    roles.sort((a, b) => (plan.allocation[b] - p.workforce.departments[b].count) - (plan.allocation[a] - p.workforce.departments[a].count));
    const role = roles[0];
    if (role) {
      const candidate = JSON.parse(JSON.stringify(plan));
      if (candidate.hires > 0) candidate.hires--;
      candidate.specialistHires[role]++;
      if (planBudget(p, candidate).remaining >= 200000) return candidate;
    }
  }
  return plan;
}
function validateWorkforceSave(g) {
  if (g.workforceVersion === undefined) {
    if (g.players.some(p => p.workforce !== undefined || p.submitted?.workforcePolicy !== undefined || p.submitted?.specialistHires !== undefined)) throw Error('Unversioned specialist workforce');
    return g;
  }
  if (g.workforceVersion !== 1 || g.customerDemandVersion !== 2 || g.version !== (g.creditPerformanceVersion === 1 ? '8.7' : g.customerOwnershipVersion === 1 ? '8.6' : '8.5')) throw Error('Unsupported specialist workforce save');
  for (const p of g.players) {
    const w = p.workforce;
    if (!w || Object.keys(w).sort().join() !== 'departments,lastCycle,policy,version' || w.version !== 1 ||
        !Number.isSafeInteger(w.lastCycle) || w.lastCycle < 0 || w.lastCycle !== g.cycle - (g.gameOver ? 0 : 1) ||
        !w.departments || Object.keys(w.departments).sort().join() !== Object.keys(SPECIALIST_ROLES).sort().join() ||
        p._workforceCosts !== undefined || p._workforceReserved !== undefined) throw Error('Invalid specialist workforce state');
    validateWorkforcePolicy(w.policy);
    let total = 0;
    for (const row of Object.values(w.departments)) {
      if (!row || Object.keys(row).sort().join() !== 'count,skill,trainingSpend' || !Number.isSafeInteger(row.count) || row.count < 0 || row.count > 10000 ||
          !Number.isSafeInteger(row.skill) || row.skill < 0 || row.skill > 100 || (!row.count && row.skill !== 0) ||
          !Number.isSafeInteger(row.trainingSpend) || row.trainingSpend < 0) throw Error('Invalid specialist department');
      total += row.count;
    }
    if (total > p.stats.staff) throw Error('Specialists exceed bank headcount');
    const report = p.operatingReport;
    if (report) {
      const amounts = ['specialistPayroll', 'workforceTraining', 'workforceTrainingRequested', ...Object.keys(SPECIALIST_ROLES).map(k => 'trainingSpend_' + k)];
      if (amounts.some(k => !Number.isSafeInteger(report[k]) || report[k] < 0) || ![0, 1].includes(report.workforceTrainingPaused) ||
          report.workforceTraining > report.workforceTrainingRequested || (report.workforceTrainingPaused && report.workforceTraining !== 0) ||
          Object.keys(SPECIALIST_ROLES).reduce((n, k) => n + report['trainingSpend_' + k], 0) !== report.workforceTraining ||
          Object.keys(SPECIALIST_ROLES).some(k => !Number.isSafeInteger(report['trainingGain_' + k]) || report['trainingGain_' + k] < 0 || report['trainingGain_' + k] > SPECIALIST_MAX_GAIN ||
            !Number.isFinite(report['specialistBonus_' + k]) || report['specialistBonus_' + k] < 0)) throw Error('Invalid workforce operating report');
    }
    if (p.submitted) {
      validateWorkforcePolicy(p.submitted.workforcePolicy);
      validateSpecialistOrders(p.submitted.specialistHires);
      if (!Number.isSafeInteger(p.submitted.hires) || p.submitted.hires < 0 || planHires(p.submitted) > hireLimit(p)) throw Error('Invalid saved specialist hiring');
    }
  }
  return g;
}
