// Financial Group entity books. No campaign opts in merely by loading this module.
// Amounts are integer dollars; custody is a matched asset/liability, never cash.
const GroupAccounting = (() => {
  const assets = ['cash', 'businessAssets', 'investments', 'custodyAssets'];
  const liabilities = ['debt', 'payables', 'custodyLiabilities'];
  const keys = [...assets, ...liabilities, 'equity'];
  const historyLimit = 64;
  const copy = value => JSON.parse(JSON.stringify(value));
  const integer = (n, signed = false) => {
    if (!Number.isSafeInteger(n) || (!signed && n < 0)) throw Error('Invalid group accounting amount.');
    return n;
  };
  const exact = (value, names) => value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === [...names].sort().join('|');
  function groupTotals(accounts) {
    if (!exact(accounts, keys)) throw Error('Invalid group accounts.');
    for (const key of keys) integer(accounts[key], key === 'equity');
    const a = integer(assets.reduce((n, k) => n + accounts[k], 0));
    const l = integer(liabilities.reduce((n, k) => n + accounts[k], 0));
    if (a !== integer(l + accounts.equity, true)) throw Error('Unbalanced group entity.');
    if (accounts.custodyAssets !== accounts.custodyLiabilities) throw Error('Customer custody does not reconcile.');
    return { assets: a, liabilities: l, equity: accounts.equity, spendableCash: accounts.cash,
      customerAssets: accounts.custodyAssets, residual: 0 };
  }
  function checkState(state) {
    if (!exact(state, ['accounts', 'retainedEarnings', 'sequence'])) throw Error('Invalid group checkpoint.');
    integer(state.retainedEarnings, true); integer(state.sequence); groupTotals(state.accounts);
  }
  function apply(state, entry) {
    if (!exact(entry, ['id', 'source', 'counterparty', 'changes', 'earnings']) ||
        entry.id !== state.sequence + 1 || !Number.isSafeInteger(entry.id) ||
        typeof entry.source !== 'string' || !entry.source.length || entry.source.length > 80 ||
        typeof entry.counterparty !== 'string' || !entry.counterparty.length || entry.counterparty.length > 100 ||
        !entry.changes || typeof entry.changes !== 'object' || Array.isArray(entry.changes) ||
        !Object.keys(entry.changes).length) throw Error('Invalid group journal entry.');
    integer(entry.earnings, true);
    const next = copy(state);
    for (const [key, amount] of Object.entries(entry.changes)) {
      if (!keys.includes(key)) throw Error('Unknown group account.');
      integer(amount, true); next.accounts[key] = integer(next.accounts[key] + amount, key === 'equity');
    }
    next.retainedEarnings = integer(next.retainedEarnings + entry.earnings, true);
    next.sequence = entry.id; checkState(next); return next;
  }
  function groupStateOf(book) {
    return { accounts: copy(book.accounts), retainedEarnings: book.retainedEarnings, sequence: book.sequence };
  }
  function validate(book) {
    if (!exact(book, ['version', 'entityId', 'accounts', 'retainedEarnings', 'sequence', 'checkpoint', 'journal']) ||
        book.version !== 1 || typeof book.entityId !== 'string' || !book.entityId.length || book.entityId.length > 80 ||
        !Array.isArray(book.journal) || book.journal.length > historyLimit) throw Error('Invalid group entity book.');
    checkState(groupStateOf(book)); checkState(book.checkpoint);
    let replay = copy(book.checkpoint);
    for (const entry of book.journal) replay = apply(replay, entry);
    const closing = groupStateOf(book);
    if (replay.sequence !== closing.sequence || replay.retainedEarnings !== closing.retainedEarnings ||
        keys.some(key => replay.accounts[key] !== closing.accounts[key])) throw Error('Group journal does not reconcile.');
    return groupTotals(book.accounts);
  }
  function opening(entityId) {
    const state = { accounts: Object.fromEntries(keys.map(key => [key, 0])), retainedEarnings: 0, sequence: 0 };
    const book = { version: 1, entityId, ...copy(state), checkpoint: copy(state), journal: [] };
    validate(book); return book;
  }
  function post(book, source, counterparty, changes, earnings = 0) {
    validate(book);
    const entry = { id: book.sequence + 1, source, counterparty, changes: copy(changes), earnings };
    const next = { ...copy(book), ...apply(groupStateOf(book), entry) };
    next.journal.push(entry);
    while (next.journal.length > historyLimit) next.checkpoint = apply(next.checkpoint, next.journal.shift());
    validate(next); return next;
  }
  function distinct(a, b) {
    validate(a); validate(b);
    if (a === b || a.entityId === b.entityId) throw Error('Group transfers require distinct entities.');
  }
  function invest(parent, entity, amount) {
    distinct(parent, entity); integer(amount);
    // Both computations finish before either result is returned. Failure is atomic.
    return {
      parent: post(parent, 'capital.invest', entity.entityId, { cash: -amount, investments: amount }),
      entity: post(entity, 'capital.received', parent.entityId, { cash: amount, equity: amount })
    };
  }
  function distributionLimit(entity, due, monthlyFixedCost, reserveMonths = 3) {
    validate(entity); integer(due); integer(monthlyFixedCost); integer(reserveMonths);
    const reserve = integer(Math.max(due, entity.accounts.payables) + integer(monthlyFixedCost * reserveMonths));
    return Math.max(0, Math.min(entity.retainedEarnings, entity.accounts.cash - reserve, entity.accounts.equity));
  }
  function payGroupDividend(entity, parent, amount, { due = 0, monthlyFixedCost = 0, reserveMonths = 3 } = {}) {
    distinct(entity, parent); integer(amount);
    if (amount > distributionLimit(entity, due, monthlyFixedCost, reserveMonths)) throw Error('Dividend exceeds available retained earnings or reserves.');
    return {
      entity: post(entity, 'dividend.paid', parent.entityId, { cash: -amount, equity: -amount }, -amount),
      parent: post(parent, 'dividend.received', entity.entityId, { cash: amount, equity: amount }, amount)
    };
  }
  function custody(book, amount, counterparty) {
    integer(amount, true);
    return post(book, amount < 0 ? 'custody.returned' : 'custody.received', counterparty,
      { custodyAssets: amount, custodyLiabilities: amount });
  }
  function servicePayment(payer, provider, amount) {
    distinct(payer, provider); integer(amount);
    return {
      payer: post(payer, 'service.paid', provider.entityId, { cash: -amount, equity: -amount }, -amount),
      provider: post(provider, 'service.received', payer.entityId, { cash: amount, equity: amount }, amount)
    };
  }
  function settlePayable(book, amount, creditor) {
    integer(amount);
    return post(book, 'payable.paid', creditor, { cash: -amount, payables: -amount });
  }
  // Paired external service claims. businessAssets here records the provider's
  // receivable, not new cash. Domain ledgers must also attribute each invoice.
  function bankServiceInvoice(bank, provider, amount, bankId, source = 'service.invoice') {
    AccountingPrototype.check(bank); validate(provider); integer(amount);
    if (bank.version !== 3 || typeof bankId !== 'string' || !bankId.length || bankId.length > 100 ||
        typeof source !== 'string' || !source.length || source.length > 80) throw Error('Invalid bank payable invoice.');
    return {
      bank: AccountingPrototype.post(bank, source, { payables: amount, equity: -amount }, -amount),
      provider: post(provider, source, bankId, { businessAssets: amount, equity: amount }, amount)
    };
  }
  function settleBankPayable(bank, provider, amount, bankId) {
    AccountingPrototype.check(bank); validate(provider); integer(amount);
    if (bank.version !== 3 || typeof bankId !== 'string' || !bankId.length || bankId.length > 100)
      throw Error('Invalid bank payable settlement.');
    // No auto-borrowing, sale, second expense or receipt from an unpaid invoice.
    return {
      bank: AccountingPrototype.transact(bank, 'settlePayable', amount),
      provider: post(provider, 'payable.received', bankId, { cash: amount, businessAssets: -amount })
    };
  }
  function writeOffBankPayable(bank, provider, amount, bankId) {
    AccountingPrototype.check(bank); validate(provider); integer(amount);
    if (bank.version !== 3 || typeof bankId !== 'string' || !bankId.length || bankId.length > 100)
      throw Error('Invalid bank creditor write-off.');
    // Resolution-only paired release: creditor loses its asset; debtor recognizes
    // a noncash liability-release gain. This is not payment or a free cash rescue.
    return {
      bank: AccountingPrototype.post(bank, 'resolution.payableRelease', { payables: -amount, equity: amount }, amount),
      provider: post(provider, 'resolution.creditorLoss', bankId, { businessAssets: -amount, equity: -amount }, -amount)
    };
  }
  function capitalizeBank(bank, parent, amount) {
    AccountingPrototype.check(bank); validate(parent); integer(amount);
    return {
      bank: AccountingPrototype.transact(bank, 'issueEquity', amount),
      parent: post(parent, 'capital.bank', 'bank', { cash: -amount, investments: amount })
    };
  }
  function bankDividend(bank, parent, amount, { minimumCapital, minimumCash, restricted = false } = {}) {
    AccountingPrototype.check(bank); validate(parent); integer(amount); integer(minimumCapital); integer(minimumCash);
    if (restricted || bank.accounts.emergencyDebt || amount > Math.max(0, bank.retainedEarnings) ||
        bank.accounts.cash - amount < minimumCash + (bank.version === 3 ? bank.accounts.payables : 0) || bank.accounts.equity - amount < minimumCapital)
      throw Error('Bank distribution breaches retained earnings, capital, cash or recovery safeguards.');
    return {
      bank: AccountingPrototype.post(bank, 'group.bankDividend', { cash: -amount, equity: -amount }, -amount),
      parent: post(parent, 'dividend.bank', 'bank', { cash: amount, equity: amount }, amount)
    };
  }
  function consolidate(parent, entities, bank = null) {
    validate(parent);
    if (!Array.isArray(entities) || entities.length > 16) throw Error('Invalid consolidated entity roster.');
    const ids = new Set([parent.entityId]); let assets = groupTotals(parent.accounts).assets, liabilities = groupTotals(parent.accounts).liabilities;
    let equity = parent.accounts.equity, custodyAssets = parent.accounts.custodyAssets, retainedEarnings = parent.retainedEarnings;
    for (const entity of entities) {
      validate(entity);
      if (ids.has(entity.entityId)) throw Error('Duplicate consolidated entity.');
      ids.add(entity.entityId);
      if (entity.accounts.investments) throw Error('Subsidiary cross-ownership is not supported.');
      const t = groupTotals(entity.accounts); assets += t.assets; liabilities += t.liabilities; equity += t.equity; custodyAssets += t.customerAssets;
      retainedEarnings += entity.retainedEarnings;
    }
    if (bank) { const t = AccountingPrototype.check(bank); assets += t.assets; liabilities += t.liabilities; equity += t.equity; retainedEarnings += bank.retainedEarnings; }
    // Parent investments in fully consolidated entities eliminate against their
    // equity. External/minority shares will use a separate non-eliminated account.
    const eliminatedInvestment = parent.accounts.investments;
    if (eliminatedInvestment && !entities.length && !bank) throw Error('No entity exists for the investment elimination.');
    assets -= eliminatedInvestment; equity -= eliminatedInvestment;
    integer(assets); integer(liabilities); integer(equity, true); integer(custodyAssets); integer(retainedEarnings, true);
    if (assets !== liabilities + equity) throw Error('Unbalanced consolidated group.');
    return { assets, liabilities, equity, retainedEarnings, custodyAssets, operatingAssets: assets - custodyAssets, eliminatedInvestment, residual: 0 };
  }
  return Object.freeze({ opening, validate, post, invest, dividend: payGroupDividend, distributionLimit, custody,
    servicePayment, settlePayable, bankServiceInvoice, settleBankPayable, writeOffBankPayable, capitalizeBank, bankDividend, consolidate, historyLimit });
})();
