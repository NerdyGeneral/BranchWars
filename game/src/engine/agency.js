// Rules 3: a ring-fenced distributor of third-party insurance, not an underwriter.
// The six corporate identities are reused; ownership of these policies is
// independent of their banking mandates. All receipts have a funded payer.
const AGENCY_PRODUCTS = Object.freeze({
  property: Object.freeze({ name: 'Commercial property', premiumRate: .25, commissionRate: .18, load: 1 }),
  liability: Object.freeze({ name: 'Business liability', premiumRate: .15, commissionRate: .20, load: 1 }),
  benefits: Object.freeze({ name: 'Employee benefits', premiumRate: .35, commissionRate: .15, load: 2 })
});
const AGENCY_RULES = Object.freeze({ launchMinimum: 120000, setupCost: 30000,
  salary: 4500, overhead: 1500, recruitment: 7000, outreachCost: 1000,
  staffCapacity: 8, maxStaff: 4, maxSupport: 100000, term: 12 });
const agencyCopy = value => JSON.parse(JSON.stringify(value));
const agencyExact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join() === [...keys].sort().join();
const agencyWhole = n => Number.isSafeInteger(n) && n >= 0;
function groupEntities(p) { return p.agency?.status === 'active' ? [p.agency.book] : []; }
function agencyFixedCost(staff) { return AGENCY_RULES.overhead + staff * AGENCY_RULES.salary; }
function agencyRelationships(companies) {
  return companies.flatMap(c => Object.keys(AGENCY_PRODUCTS).map(product => ({
    id: c.id + ':' + product, companyId: c.id, product, owner: null, remaining: 0,
    quality: 0, renewals: 0
  })));
}
function initializeAgency(g) {
  if (![3,4,5,6,7].includes(g.financialGroupVersion)) return;
  if (!g.companyEconomy || g.agencyEconomy) throw Error('Agency requires an initialized company economy.');
  if (g.companyEconomy.version !== 3) throw Error('Agency requires versioned corporate premium accounting.');
  g.agencyEconomy = { version: 1, month: 0, carrier: GroupAccounting.opening('agency:carriers'),
    supplier: GroupAccounting.opening('agency:suppliers'),
    relationships: agencyRelationships(g.companyEconomy.companies),
    parentCashNet: 0, premiumPaid: 0, commissionPaid: 0, operatingPaid: 0, creditorLoss: 0 };
  for (const p of g.players) {
    p.financialGroup.version = 2;
    p.financialGroup.investmentBasis = { bank: p.financialGroup.parent.accounts.investments, agency: 0 };
    p.agency = { version: 1, status: 'unopened', book: GroupAccounting.opening(p.id + ':agency'),
      staff: 0, policy: { target: 'property', outreach: 0, supportCap: 0 },
      openedCycle: 0, failedCycle: 0, failures: 0, report: null };
  }
}
function defaultAgencyPlan(p) {
  const a = p.agency;
  return { launch: false, capital: 0, staff: a?.staff || 1, target: a?.policy.target || 'property',
    outreach: a?.policy.outreach || 0, supportCap: a?.policy.supportCap || 0, dividend: 0 };
}
function agencyQuote(p, input = defaultAgencyPlan(p), companies = p.companySnapshot?.world) {
  if (!p.agency) return null;
  const a = p.agency, monthlyExpense = agencyFixedCost(input.staff) + input.outreach * AGENCY_RULES.outreachCost;
  const relationships = (p.agencySnapshot?.relationships || []).filter(r => r.owner === p.id);
  let estimatedCommission = 0;
  for (const r of relationships) {
    const c = companies?.companies.find(c => c.id === r.companyId), product = AGENCY_PRODUCTS[r.product];
    if (c && !c.resolution) estimatedCommission += Math.floor(Math.round(c.baseFee * product.premiumRate) * product.commissionRate);
  }
  return { status: a.status, launchMinimum: AGENCY_RULES.launchMinimum, setupCost: AGENCY_RULES.setupCost,
    recruitmentCost: Math.max(0, input.staff - a.staff) * AGENCY_RULES.recruitment,
    monthlyExpense, fixedCost: agencyFixedCost(input.staff), capacity: input.staff * AGENCY_RULES.staffCapacity,
    committedCapital: input.capital, availableParentCash: p.financialGroup.parent.accounts.cash,
    distributionLimit: a.status === 'active' ? GroupAccounting.distributionLimit(a.book, 0, monthlyExpense) : 0,
    relationships: relationships.length, serviceLoad: relationships.reduce((n,r) => n + AGENCY_PRODUCTS[r.product].load, 0),
    reserveRequired: 3 * monthlyExpense, estimatedCommission, cash: a.book.accounts.cash,
    equity: a.book.accounts.equity, payables: a.book.accounts.payables };
}
function agencyReview(p) { return agencyQuote(p); }
function normalizeAgencyPlan(p, plan) {
  if (!p.agency) {
    if (plan.agencyPolicy !== undefined) throw Error('Agency instructions require Financial Group rules 3.');
    return;
  }
  if (plan.agencyPolicy === undefined) plan.agencyPolicy = defaultAgencyPlan(p);
  const s = plan.agencyPolicy;
  if (!agencyExact(s, ['launch','capital','staff','target','outreach','supportCap','dividend']) ||
      typeof s.launch !== 'boolean' || !agencyWhole(s.capital) || s.capital > 1000000000 ||
      !Number.isInteger(s.staff) || s.staff < 1 || s.staff > AGENCY_RULES.maxStaff ||
      !Object.hasOwn(AGENCY_PRODUCTS, s.target) || ![0,1,2].includes(s.outreach) ||
      !agencyWhole(s.supportCap) || s.supportCap > AGENCY_RULES.maxSupport || !agencyWhole(s.dividend))
    throw Error('Invalid insurance agency instructions.');
  const a = p.agency, reserved = plan.groupPolicy?.bankSupport || 0;
  if (s.launch && (a.status === 'active' || s.capital < AGENCY_RULES.launchMinimum))
    throw Error('A new agency requires its full funded launch capital.');
  if (!s.launch && a.status !== 'active' && (s.capital || s.dividend))
    throw Error('Launch the agency before funding or distributing it.');
  if (s.capital + reserved > p.financialGroup.parent.accounts.cash)
    throw Error('Agency funding exceeds parent cash after committed bank support.');
  if (s.capital && s.dividend) throw Error('Choose one agency capital direction per month.');
  if (s.dividend > agencyQuote(p, s).distributionLimit)
    throw Error('Agency distribution breaches retained earnings or its three-month reserve.');
}
function agencyEmptyReport(cycle) {
  return { cycle, expense: 0, paid: 0, commission: 0, premiums: 0, clients: 0,
    won: 0, lost: 0, dividend: 0, support: 0, capital: 0, setup: 0, recruitment: 0, failed: false };
}
function agencyInvest(g, p, amount) {
  if (!amount) return;
  const transferred = GroupAccounting.invest(p.financialGroup.parent, p.agency.book, amount);
  p.financialGroup.parent = transferred.parent; p.agency.book = transferred.entity;
  p.financialGroup.investmentBasis.agency += amount;
  g.agencyEconomy.parentCashNet += amount;
}
function agencyInvoice(g, p, amount, source) {
  if (!amount) return;
  const a = p.agency, e = g.agencyEconomy;
  a.book = GroupAccounting.post(a.book, source, e.supplier.entityId,
    { payables: amount, equity: -amount }, -amount);
  e.supplier = GroupAccounting.post(e.supplier, source, a.book.entityId,
    { businessAssets: amount, equity: amount }, amount);
  a.report.expense += amount;
}
function agencyPayBills(g, p) {
  const a = p.agency, e = g.agencyEconomy, amount = Math.min(a.book.accounts.cash, a.book.accounts.payables);
  if (!amount) return;
  a.book = GroupAccounting.settlePayable(a.book, amount, e.supplier.entityId);
  e.supplier = GroupAccounting.post(e.supplier, 'agency.invoicePaid', a.book.entityId,
    { cash: amount, businessAssets: -amount });
  a.report.paid += amount; e.operatingPaid += amount;
}
function agencyWindDown(g, p) {
  const a = p.agency, e = g.agencyEconomy;
  agencyPayBills(g, p);
  const unpaid = a.book.accounts.payables;
  if (unpaid) {
    a.book = GroupAccounting.post(a.book, 'agency.creditorRelease', e.supplier.entityId,
      { payables: -unpaid, equity: unpaid }, unpaid);
    e.supplier = GroupAccounting.post(e.supplier, 'agency.creditorLoss', a.book.entityId,
      { businessAssets: -unpaid, equity: -unpaid }, -unpaid);
    e.creditorLoss += unpaid;
  }
  // Residual business cash returns only after creditors. This is liquidation,
  // not a dividend or a new profit. The remaining parent basis is then impaired.
  const returned = a.book.accounts.cash, basis = p.financialGroup.investmentBasis.agency;
  if (returned) {
    a.book = GroupAccounting.post(a.book, 'agency.capitalReturned', p.financialGroup.parent.entityId,
      { cash: -returned, equity: -returned });
    p.financialGroup.parent = GroupAccounting.post(p.financialGroup.parent, 'agency.capitalRecovered', a.book.entityId,
      { cash: returned, investments: -Math.min(returned, basis), equity: Math.max(0, returned - basis) }, Math.max(0, returned - basis));
    e.parentCashNet -= returned;
  }
  const loss = Math.max(0, basis - returned);
  if (loss) p.financialGroup.parent = GroupAccounting.post(p.financialGroup.parent, 'agency.investmentLoss', a.book.entityId,
    { investments: -loss, equity: -loss }, -loss);
  p.financialGroup.investmentBasis.agency = 0;
  a.status = 'failed'; a.staff = 0; a.failedCycle = g.cycle; a.failures++;
  a.policy.outreach = 0; a.policy.supportCap = 0; a.report.failed = true;
  for (const r of e.relationships) if (r.owner === p.id) {
    r.owner = null; r.remaining = 0; r.quality = 0; a.report.lost++;
  }
}
function agencyPrepare(g, p, plan) {
  const a = p.agency, s = plan.agencyPolicy;
  a.report = agencyEmptyReport(g.cycle);
  // Revalidate against pre-settlement authority. Current parent cash may have
  // changed since submission; unmet capital requests are reduced, never borrowed.
  const free = Math.max(0, p.financialGroup.parent.accounts.cash - (plan.groupPolicy?.bankSupport || 0));
  if (s.launch) {
    if (free < s.capital || s.capital < AGENCY_RULES.launchMinimum) return;
    a.book = GroupAccounting.opening(p.id + ':agency'); a.status = 'active'; a.staff = 0;
    a.openedCycle = g.cycle; a.failedCycle = 0;
    agencyInvest(g, p, s.capital); a.report.capital = s.capital;
    agencyInvoice(g, p, AGENCY_RULES.setupCost, 'agency.setup'); a.report.setup = AGENCY_RULES.setupCost;
  } else if (a.status === 'active') {
    const amount = Math.min(s.capital, free); agencyInvest(g, p, amount); a.report.capital = amount;
  }
  if (a.status !== 'active') return;
  const hires = Math.max(0, s.staff - a.staff);
  a.staff = s.staff; a.policy = { target: s.target, outreach: s.outreach, supportCap: s.supportCap };
  a.report.recruitment = hires * AGENCY_RULES.recruitment;
  agencyInvoice(g, p, a.report.recruitment, 'agency.recruitment');
  agencyInvoice(g, p, agencyFixedCost(a.staff) + s.outreach * AGENCY_RULES.outreachCost, 'agency.operations');
  const shortfall = Math.max(0, a.book.accounts.payables - a.book.accounts.cash);
  const support = Math.min(shortfall, s.supportCap,
    Math.max(0, p.financialGroup.parent.accounts.cash - (plan.groupPolicy?.bankSupport || 0)));
  agencyInvest(g, p, support); a.report.support = support;
  agencyPayBills(g, p);
  // Obligations precede acquisition: a business must not sell policies to rescue
  // itself from an already unpaid payroll bill without authorized parent support.
  if (a.book.accounts.payables || a.book.accounts.equity < 0) agencyWindDown(g, p);
}
function agencyCandidateScore(p, company, relationship, incumbent) {
  const local = (p.facilityNetwork?effectiveFacilityBranches(p,company.market):(p.branches?.[company.market] || 0)) * 4;
  const service = Math.min(15, p.regionalOperations?.markets?.[company.market]?.service * 3 || 0);
  const digital = Math.min(12, strategyLevel(p, 'digital') * 3);
  return 50 + local + service + digital + p.agency.staff * 2 + p.agency.policy.outreach * 5 +
    (incumbent ? 8 + relationship.quality : 0);
}
function settleAgency(g, plans) {
  if (![3,4,5,6,7].includes(g.financialGroupVersion)) return [];
  const e = g.agencyEconomy;
  if (e.month !== g.cycle - 1 || g.companyEconomy.month !== g.cycle)
    throw Error('Agency settlement must occur once after company operations.');
  for (const [i,p] of g.players.entries()) agencyPrepare(g, p, plans[i]);
  const used = new Map(g.players.map(p => [p.id, 0])), won = new Map(g.players.map(p => [p.id, 0]));
  // Service existing obligations before new acquisition. Month-rotated ordering
  // resolves scarce staff and tied bids without giving one bank permanent priority.
  const order = [...e.relationships].sort((a,b) => Number(b.owner !== null) - Number(a.owner !== null) ||
    ((e.relationships.indexOf(a) + g.cycle) % 18) - ((e.relationships.indexOf(b) + g.cycle) % 18));
  for (const r of order) {
    const c = g.companyEconomy.companies.find(c => c.id === r.companyId), product = AGENCY_PRODUCTS[r.product];
    const old = g.players.find(p => p.id === r.owner);
    if (c.resolution) {
      if (old) old.agency.report.lost++;
      r.owner = null; r.remaining = 0; r.quality = 0; continue;
    }
    const renewal = r.remaining <= 1, candidates = g.players.filter(p => {
      const a = p.agency;
      if (a.status !== 'active' || used.get(p.id) + product.load > a.staff * AGENCY_RULES.staffCapacity) return false;
      if (p.id === r.owner && !renewal) return true;
      if (!renewal && r.owner !== null) return false;
      if (p.id === r.owner) return true;
      return a.policy.target === r.product && a.policy.outreach > 0 && won.get(p.id) < a.policy.outreach * 2;
    });
    candidates.sort((a,b) => agencyCandidateScore(b,c,r,b.id === r.owner) - agencyCandidateScore(a,c,r,a.id === r.owner) ||
      ((g.players.indexOf(a) + g.cycle + c.clientIndex) % 2) - ((g.players.indexOf(b) + g.cycle + c.clientIndex) % 2));
    const provider = candidates[0], premium = Math.round(c.baseFee * product.premiumRate);
    if (!provider || c.book.accounts.cash < premium) {
      if (old) old.agency.report.lost++;
      r.owner = null; r.remaining = 0; r.quality = 0; continue;
    }
    const paid = CompanyFinance.payAgencyPremium(g.companyEconomy, c.clientIndex, e.carrier, premium);
    g.companyEconomy = paid.world; e.carrier = paid.carrier; e.premiumPaid += premium;
    const commission = Math.floor(premium * product.commissionRate);
    if (commission) {
      const flow = GroupAccounting.servicePayment(e.carrier, provider.agency.book, commission);
      e.carrier = flow.payer; provider.agency.book = flow.provider; e.commissionPaid += commission;
    }
    provider.agency.report.commission += commission; provider.agency.report.premiums += premium;
    provider.agency.report.clients++; used.set(provider.id, used.get(provider.id) + product.load);
    if (r.owner !== provider.id) {
      if (old) old.agency.report.lost++;
      provider.agency.report.won++; won.set(provider.id, won.get(provider.id) + 1);
      r.quality = 0;
    } else r.quality = Math.min(20, r.quality + 1);
    if (renewal && old) r.renewals++;
    r.owner = provider.id; r.remaining = renewal ? AGENCY_RULES.term : r.remaining - 1;
  }
  for (const [i,p] of g.players.entries()) {
    const a = p.agency, s = plans[i].agencyPolicy;
    if (a.status !== 'active') continue;
    const amount = Math.min(s.dividend, GroupAccounting.distributionLimit(a.book, 0,
      agencyFixedCost(a.staff) + a.policy.outreach * AGENCY_RULES.outreachCost));
    if (amount) {
      const flow = GroupAccounting.dividend(a.book, p.financialGroup.parent, amount,
        { monthlyFixedCost: agencyFixedCost(a.staff) + a.policy.outreach * AGENCY_RULES.outreachCost });
      a.book = flow.entity; p.financialGroup.parent = flow.parent; e.parentCashNet -= amount;
      a.report.dividend = amount;
    }
  }
  e.month = g.cycle;
  // No sealed budgets, subsidiary cash, staff or profitability enter shared logs.
  return g.players.filter(p => p.agency.report.failed).map(p => p.name +
    ' insurance agency entered ring-fenced wind-down. The bank continues under its existing rules.');
}
function validateAgencyPlayer(p, cycle) {
  const a = p.agency, f = p.financialGroup;
  if (!agencyExact(a, ['version','status','book','staff','policy','openedCycle','failedCycle','failures','report']) ||
      a.version !== 1 || !['unopened','active','failed'].includes(a.status) ||
      !agencyWhole(a.staff) || a.staff > AGENCY_RULES.maxStaff ||
      (a.status === 'active' ? a.staff < 1 : a.staff !== 0) ||
      !agencyWhole(a.openedCycle) || a.openedCycle > cycle || !agencyWhole(a.failedCycle) || a.failedCycle > cycle ||
      !agencyWhole(a.failures) || !agencyExact(a.policy, ['target','outreach','supportCap']) ||
      !Object.hasOwn(AGENCY_PRODUCTS, a.policy.target) || ![0,1,2].includes(a.policy.outreach) ||
      !agencyWhole(a.policy.supportCap) || a.policy.supportCap > AGENCY_RULES.maxSupport)
    throw Error('Invalid insurance agency state.');
  GroupAccounting.validate(a.book);
  if (a.book.entityId !== p.id + ':agency' || ['businessAssets','investments','debt','custodyAssets','custodyLiabilities'].some(k => a.book.accounts[k]))
    throw Error('Agency cannot hold underwriting, investment, borrowed or customer assets.');
  if (a.status !== 'active' && Object.values(a.book.accounts).some(Boolean)) throw Error('Closed agency has unsettled assets or obligations.');
  if (a.status === 'active' && (a.book.accounts.payables || a.book.accounts.equity < 0))
    throw Error('An agency with unpaid due obligations must be in wind-down.');
  if (a.status === 'unopened' && (a.openedCycle || a.failedCycle || a.failures || a.book.retainedEarnings)) throw Error('Invalid unopened agency.');
  if (a.status === 'failed' && (!a.failedCycle || !a.failures) || a.status === 'active' && (!a.openedCycle || a.failedCycle))
    throw Error('Invalid agency lifecycle.');
  if (!f || f.version !== 2 || !agencyExact(f.investmentBasis, ['bank','agency']) ||
      Object.values(f.investmentBasis).some(n => !agencyWhole(n)) ||
      f.investmentBasis.bank + f.investmentBasis.agency !== f.parent.accounts.investments ||
      a.status !== 'active' && f.investmentBasis.agency !== 0 ||
      a.status === 'active' && a.book.accounts.equity !== f.investmentBasis.agency + a.book.retainedEarnings)
    throw Error('Agency investment basis does not reconcile.');
  if (a.report !== null) {
    const template = agencyEmptyReport(1);
    if (!agencyExact(a.report, Object.keys(template)) || typeof a.report.failed !== 'boolean' ||
        Object.keys(template).filter(k => k !== 'failed').some(k => !agencyWhole(a.report[k])) ||
        a.report.cycle < 1 || a.report.cycle > cycle || a.report.paid > a.report.expense || a.report.clients > 18 ||
        a.report.failed && a.status !== 'failed')
      throw Error('Invalid agency operating report.');
  }
}
function validateAgencyRelationships(relationships, companies, ids) {
  const expected = agencyRelationships(companies);
  if (!Array.isArray(relationships) || relationships.length !== expected.length) throw Error('Invalid insurance relationship roster.');
  for (const [i,r] of relationships.entries()) if (!agencyExact(r, Object.keys(expected[i])) ||
      r.id !== expected[i].id || r.companyId !== expected[i].companyId || r.product !== expected[i].product ||
      r.owner !== null && !ids.includes(r.owner) || !agencyWhole(r.remaining) || r.remaining > AGENCY_RULES.term ||
      !agencyWhole(r.quality) || r.quality > 20 || !agencyWhole(r.renewals) ||
      (r.owner === null ? r.remaining !== 0 || r.quality !== 0 : r.remaining === 0) ||
      companies[Math.floor(i/3)].resolution && r.owner !== null)
    throw Error('Invalid insurance relationship.');
}
function validateAgencySave(g) {
  if (![3,4,5,6,7].includes(g.financialGroupVersion)) {
    if (g.agencyEconomy !== undefined || g.players.some(p => p.agency !== undefined || p.submitted?.agencyPolicy !== undefined))
      throw Error('Unversioned insurance agency.');
    return;
  }
  const e = g.agencyEconomy, month = g.gameOver ? g.cycle : g.cycle - 1;
  if (!agencyExact(e, ['version','month','carrier','supplier','relationships','parentCashNet','premiumPaid','commissionPaid','operatingPaid','creditorLoss',...(g.financialGroupVersion===7?['circulated']:[])]) ||
      e.version !== (g.financialGroupVersion===7?2:1) || e.month !== month || !Number.isSafeInteger(e.parentCashNet) ||
      ['premiumPaid','commissionPaid','operatingPaid','creditorLoss'].some(k => !agencyWhole(e[k])))
    throw Error('Invalid agency economy.');
  const circulated=g.financialGroupVersion===7?e.circulated:{carrier:0,supplier:0};
  if(!agencyExact(circulated,['carrier','supplier'])||Object.values(circulated).some(n=>!agencyWhole(n)))throw Error('Invalid agency circulation.');
  GroupAccounting.validate(e.carrier); GroupAccounting.validate(e.supplier);
  if (e.carrier.entityId !== 'agency:carriers' || e.supplier.entityId !== 'agency:suppliers' ||
      ['businessAssets','investments','debt','payables','custodyAssets','custodyLiabilities'].some(k => e.carrier.accounts[k]) ||
      ['investments','debt','payables','custodyAssets','custodyLiabilities'].some(k => e.supplier.accounts[k]))
    throw Error('Invalid agency counterparty books.');
  validateAgencyRelationships(e.relationships, g.companyEconomy.companies, g.players.map(p => p.id));
  let cash = e.carrier.accounts.cash + e.supplier.accounts.cash, claims = 0;
  for (const p of g.players) {
    validateAgencyPlayer(p, g.cycle); cash += p.agency.book.accounts.cash; claims += p.agency.book.accounts.payables;
    if (p.agencySnapshot !== undefined) throw Error('Saved agency contains projected owner state.');
    if (p.submitted) normalizeAgencyPlan(p, agencyCopy(p.submitted));
    if (p.agency.status !== 'active' && e.relationships.some(r => r.owner === p.id)) throw Error('Closed agency owns live policies.');
    if (p.agency.report?.cycle !== (month || undefined) && !(month === 0 && p.agency.report === null))
      throw Error('Stale agency report.');
  }
  if (cash + circulated.carrier + circulated.supplier !== e.parentCashNet + e.premiumPaid || e.supplier.accounts.businessAssets !== claims ||
      e.carrier.accounts.cash + circulated.carrier !== e.premiumPaid - e.commissionPaid ||
      e.supplier.accounts.cash + circulated.supplier !== e.operatingPaid || g.companyEconomy.agencyCashNet !== e.premiumPaid)
    throw Error('Agency cash and counterparty resources do not reconcile.');
}
function projectAgency(g, out, index) {
  if (![3,4,5,6,7].includes(g.financialGroupVersion)) return;
  const p = g.players[index], rival = g.players[1-index];
  out.me.agency = agencyCopy(p.agency);
  out.me.agencySnapshot = { version: 1, month: g.agencyEconomy.month, relationships: agencyCopy(g.agencyEconomy.relationships) };
  delete out.rival.agency; delete out.rival.agencySnapshot;
  if (out.lastPlans?.[rival.id]) delete out.lastPlans[rival.id].agencyPolicy;
}
function validateAgencyView(view) {
  if (![3,4,5,6,7].includes(view.financialGroupVersion)) {
    if (view.agencyEconomy !== undefined || view.me?.agency !== undefined || view.me?.agencySnapshot !== undefined || view.rival?.agency !== undefined || view.rival?.agencySnapshot !== undefined)
      throw Error('Unversioned insurance agency view.');
    return;
  }
  validateAgencyPlayer(view.me, view.cycle);
  const s = view.me.agencySnapshot;
  if (!agencyExact(s, ['version','month','relationships']) || s.version !== 1 || s.month !== (view.gameOver ? view.cycle : view.cycle-1))
    throw Error('Invalid insurance agency public statement.');
  validateAgencyRelationships(s.relationships, view.me.companySnapshot.world.companies, [view.me.id,view.rival.id]);
  if (view.rival.agency !== undefined || view.rival.agencySnapshot !== undefined || view.lastPlans?.[view.rival.id]?.agencyPolicy !== undefined || view.agencyEconomy !== undefined)
    throw Error('Private insurance agency information exposed.');
}
function planAgency(g, index, plan) {
  if (![3,4,5,6,7].includes(g.financialGroupVersion)) return plan;
  const p = g.players[index], a = p.agency, s = defaultAgencyPlan(p);
  const free = p.financialGroup.parent.accounts.cash - (plan.groupPolicy?.bankSupport || 0);
  const open = g.companyEconomy.companies.filter(c => !c.resolution);
  // Fund the parent through the same explicit safe bank dividend instruction.
  // This month's proposed dividend is never counted as launch cash.
  if (a.status !== 'active') {
    if (open.length >= 3 && free >= AGENCY_RULES.launchMinimum) {
      s.launch = true; s.capital = AGENCY_RULES.launchMinimum; s.staff = 1; s.outreach = 2;
    } else if (open.length >= 3 && !plan.groupPolicy.bankSupport) {
      plan.groupPolicy.bankDividend = Math.min(groupCapitalQuote(p).dividendLimit,
        Math.max(0, AGENCY_RULES.launchMinimum - free));
    }
  } else {
    const relationships = g.agencyEconomy.relationships.filter(r => r.owner === p.id);
    const load = relationships.reduce((n,r) => n + AGENCY_PRODUCTS[r.product].load, 0);
    s.staff = Math.min(3, Math.max(1, Math.ceil((load + 2) / AGENCY_RULES.staffCapacity)));
    if (s.staff > a.staff && a.book.accounts.cash < 3 * agencyFixedCost(s.staff) + AGENCY_RULES.recruitment) s.staff = a.staff;
    const targets = Object.keys(AGENCY_PRODUCTS).map(product => ({ product,
      available: g.agencyEconomy.relationships.filter(r => r.product === product && r.owner !== p.id &&
        (r.owner === null || r.remaining <= 1) && open.some(c => c.id === r.companyId)).length }));
    targets.sort((a,b) => b.available - a.available);
    s.target = targets[0].product; s.outreach = targets[0].available && load < s.staff * AGENCY_RULES.staffCapacity ? 1 : 0;
    if (a.book.accounts.cash < agencyFixedCost(s.staff) * 2 && free > 0) s.capital = Math.min(50000, free);
    const limit = agencyQuote(p, s).distributionLimit;
    if (!s.capital && limit > 20000) s.dividend = Math.floor(limit / 2);
  }
  plan.agencyPolicy = s; normalizeAgencyPlan(p, plan); return plan;
}
