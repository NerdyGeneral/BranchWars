'use strict';

// Optional diagnostics for the existing release-balance runner, not game rules.
// Hooks observe only the two authoritative player objects during submission.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const copy = value => JSON.parse(JSON.stringify(value));
const sum = values => values.reduce((a, b) => a + b, 0);
const add = (row, key, amount) => { if (amount) row[key] = (row[key] || 0) + amount; };
const balance = p => ({ deposits: p.stats.deposits, customers: p.stats.customers, ...p.accounting.accounts });

function franchiseJournalEvidence(bank, residual) {
  const bought = bank.journal['acquisition.buyer']?.changes.deposits || 0, sold = bank.journal['acquisition.seller']?.changes.deposits || 0;
  const hookNet = bank.deposits.unattributedResidual || 0, journalNet = bought + sold, journalGross = bought - sold;
  return { hookNetDepositResidual: hookNet, hookAbsoluteMonthlyDepositResidual: residual.deposits, bought, sold, journalNet, journalGross,
    netDifference: hookNet - journalNet, absoluteDifference: residual.deposits - journalGross };
}
assert.deepEqual(franchiseJournalEvidence({ deposits: { unattributedResidual: -20 }, journal: {
  'acquisition.buyer': { changes: { deposits: 30 } }, 'acquisition.seller': { changes: { deposits: -50 } }
} }, { deposits: 80 }), { hookNetDepositResidual: -20, hookAbsoluteMonthlyDepositResidual: 80, bought: 30, sold: -50, journalNet: -20, journalGross: 80, netDifference: 0, absoluteDifference: 0 });

const hooks = `
const balanceAuditTrace={active:null,stage:'unscoped'};
const auditSeat=p=>balanceAuditTrace.active?.game.players.indexOf(p)??-1;
function auditMovement(p,resource,kind,amount){
 const seat=auditSeat(p);if(seat<0||!['deposits','customers'].includes(resource)||!amount)return;
 balanceAuditTrace.active.movements.push({seat,resource,kind,stage:balanceAuditTrace.stage,amount});
}
const auditRecordStage=recordLedgerStage;
recordLedgerStage=function(g,source,category,run){
 const prior=balanceAuditTrace.stage;balanceAuditTrace.stage=category;
 try{return auditRecordStage(g,source,category,run)}finally{balanceAuditTrace.stage=prior}
};
const auditMoveOutside=moveOutside;
moveOutside=function(p,resource,requested,target,limited){
 const amount=auditMoveOutside(p,resource,requested,target,limited),stage=balanceAuditTrace.stage;
 const kind=stage==='operations'?(amount>0&&limited?'ordinaryAcquisition':amount<0?'operatingRunoff':'otherOperationsOutside'):
  stage==='competition.deposits'&&amount<0?'outsideRecapture':stage==='relationships'?'opportunitiesOutside':'outside:'+stage;
 auditMovement(p,resource,kind,amount);return amount;
};
const auditTransferMarket=transferMarket;
transferMarket=function(g,from,to,key,resource,requested){
 const amount=auditTransferMarket(g,from,to,key,resource,requested);
 auditMovement(from,resource,'rivalTransferOut',-amount);auditMovement(to,resource,'rivalTransferIn',amount);return amount;
};
const auditWithdrawOwned=withdrawOwnedDeposits;
withdrawOwnedDeposits=function(g,p,key,segment,requested){
 const amount=auditWithdrawOwned(g,p,key,segment,requested);auditMovement(p,'deposits','retentionOutflow',-amount);return amount;
};
const auditTermDepartures=settleDepartedTermDeposits;
settleDepartedTermDeposits=function(g,p,preview){
 const amount=auditTermDepartures(g,p,preview);auditMovement(p,'deposits','departedTermPayout',-amount);return amount;
};
const auditRetention=settleHouseholdRetention;
settleHouseholdRetention=function(g,p,preview){
 const before=p.stats.customers,result=auditRetention(g,p,preview);
 auditMovement(p,'customers','retentionOutflow',p.stats.customers-before);return result;
};
const auditMonthlySteps=resolveMonthlySteps;
resolveMonthlySteps=function(g){
 const result=auditMonthlySteps(g),active=balanceAuditTrace.active;
 if(active?.game===g)g.players.forEach((p,seat)=>{active.journals[seat]=p.accounting.journal.filter(e=>e.id>active.sequences[seat]).map(e=>JSON.parse(JSON.stringify(e)))});
 return result;
};
root.balanceAuditTrace=balanceAuditTrace;
`;

function instrument(engine) {
  assert.equal(engine.split('root.BWEngine={').length, 2, 'Attribution hook anchor must be unique');
  return engine.replace('root.BWEngine={', () => hooks + '\nroot.BWEngine={');
}

function verifyNoninterference(engine, options, months = 3) {
  const run = enabled => {
    const ctx = { console, Math, Date }; vm.runInNewContext(enabled ? instrument(engine) : engine, ctx);
    const E = ctx.BWEngine, g = E.createGame(options);
    for (let month = 0; month < months && !g.gameOver; month++) {
      const plans = [E.chooseBot(g, 0), E.chooseBot(g, 1)];
      if (enabled) ctx.balanceAuditTrace.active = { game: g, movements: [], journals: [null, null], sequences: g.players.map(p => p.accounting.sequence) };
      E.submit(g, 0, plans[0]); E.submit(g, 1, plans[1]);
      if (enabled) ctx.balanceAuditTrace.active = null;
    }
    return JSON.stringify(g);
  };
  assert.equal(run(true), run(false), 'Instrumentation changed authoritative state, plans or RNG');
  return { passed: true, months, comparison: 'Exact full-game JSON, including plans, ledgers and RNG' };
}

function createTracker(E, trace, g) {
  const opening = g.players.map(balance), totals = [0, 1].map(() => ({ deposits: {}, customers: {}, journal: {}, reports: {}, actions: {}, initiatives: {}, retentionShares: {} }));
  const checkpoints = [], stageNet = [{}, {}], residual = [{ deposits: 0, customers: 0 }, { deposits: 0, customers: 0 }];
  let samples = 0, before = null, startLedger = 0, lastLeader = null;
  const leadChanges = [];
  function begin(plans) {
    before = g.players.map(balance); startLedger = g.ledgerSequence || 0;
    trace.active = { game: g, movements: [], journals: [null, null], sequences: g.players.map(p => p.accounting.sequence) };
    plans.forEach((plan, seat) => {
      add(totals[seat].actions, plan.competitiveAction || 'none', 1);
      for (const key of E.planInitiatives(plan)) add(totals[seat].initiatives, key, 1);
      add(totals[seat].retentionShares, plan.householdPolicy?.retention ?? 'unavailable', 1);
    });
  }
  function observe() {
    const captured = trace.active; trace.active = null; samples++;
    const events = g.eventLedger.filter(e => e.id > startLedger && e.deltas);
    for (let seat = 0; seat < 2; seat++) {
      const p = g.players[seat], after = balance(p), own = events.filter(e => e.target === p.id), movements = captured.movements.filter(e => e.seat === seat);
      for (const resource of ['deposits', 'customers']) {
        const expected = after[resource] - before[seat][resource], ledger = sum(own.map(e => e.deltas[resource] || 0));
        assert.equal(ledger, expected, 'Monthly ledger must reconcile ' + resource);
        const actual = sum(movements.filter(e => e.resource === resource).map(e => e.amount));
        const remainder = expected - actual;
        add(totals[seat][resource], 'unattributedResidual', remainder); residual[seat][resource] += Math.abs(remainder);
        for (const event of movements.filter(e => e.resource === resource)) add(totals[seat][resource], event.kind, event.amount);
      }
      for (const event of own) {
        stageNet[seat][event.category] ||= {};
        for (const key of ['deposits', 'customers', 'cash', 'loans', 'capital', 'emergencyDebt']) add(stageNet[seat][event.category], key, event.deltas[key] || 0);
      }
      const journal = captured.journals[seat];
      assert(journal, 'Accounting journal captured before the normal 96-entry compaction');
      if (p.accounting.sequence > captured.sequences[seat]) assert.equal(journal[0]?.id, captured.sequences[seat] + 1, 'Monthly journal start is present');
      assert.equal(journal.at(-1)?.id ?? captured.sequences[seat], p.accounting.sequence, 'Monthly journal end is present');
      for (const key of ['cash', 'loans', 'securities', 'deposits', 'emergencyDebt', 'equity'])
        assert.equal(sum(journal.map(e => e.changes[key] || 0)), after[key] - before[seat][key], 'Journal reconciles ' + key);
      for (const entry of journal) {
        const row = totals[seat].journal[entry.source] ||= { entries: 0, earnings: 0, changes: {} }; row.entries++; row.earnings += entry.earnings;
        for (const [key, amount] of Object.entries(entry.changes)) add(row.changes, key, amount);
      }
      const r = p.operatingReport;
      for (const key of ['profit', 'depositGrowth', 'depositRunoff', 'householdDepartures', 'householdDepositOutflow', 'termDepartures', 'principalRepaid', 'creditRecovery', 'chargeoff', 'fundingLoss', 'loanIncome', 'depositIncome', 'depositInterest', 'depositServiceCost', 'commercialIncome', 'otherIncome', 'advertisingCost', 'relationshipOfferCost', 'relationshipOfferPrincipal', 'relationshipOfferConverted'])
        add(totals[seat].reports, key, r[key] || 0);
      add(totals[seat].reports, 'grossLoanOriginations', r.loanGrowth + r.chargeoff + (r.principalRepaid || 0) + (r.creditRecovery || 0));
      assert.equal(sum(Object.values(totals[seat].deposits)), after.deposits - opening[seat].deposits);
      assert.equal(sum(Object.values(totals[seat].customers)), after.customers - opening[seat].customers);
    }
    const deposits = g.players.map(p => p.stats.deposits), leader = deposits[0] === deposits[1] ? null : deposits[0] > deposits[1] ? 0 : 1;
    if (leader !== null) { if (lastLeader !== null && lastLeader !== leader) leadChanges.push({ month: samples, leader }); lastLeader = leader; }
    if (samples % 60 === 0 || g.gameOver) checkpoints.push({ month: samples, banks: g.players.map((p, seat) => ({ deposits: p.stats.deposits, combinedPlayerSharePercent: p.stats.deposits / sum(deposits) * 100, households: p.stats.customers,
      profit: p.stats.lastProfit, cumulativeOperatingProfit: totals[seat].reports.profit, equity: p.stats.capital, capitalRatioPercent: E.capitalRatio(p), loans: p.stats.loans, cash: p.stats.cash, emergencyDebt: p.stats.emergencyDebt,
      sources: copy(totals[seat].deposits) })) });
  }
  function report() {
    return { version: 1, samples, opening, closing: g.players.map(balance), leadChanges, checkpoints, banks: totals, stageNet, absoluteUnattributedResidual: residual,
      franchiseJournalEvidence: totals.map((bank, seat) => franchiseJournalEvidence(bank, residual[seat])),
      definitions: { monetaryFlows: 'Signed whole dollars. Gross transfers appear separately for each bank; do not add opposing entries as new supply.', ordinaryAcquisition: 'Actual positive quota-limited outside intake during operations, not advertising causal lift.', outsideRecapture: 'Actual bank-to-outside losses during deposit contests.', retention: 'Direct existing-household departures and their owned deposit withdrawals; former-customer term payouts are separate.', opportunities: 'Outside flows during opportunity settlement, including existing service/relationship rules; stage totals are descriptive rather than causal counterfactuals.', loanFunding: 'Journal sources show actual cash, lending, repayments, sales and debt. Deposits are funding liabilities, not operating revenue; a particular deposited dollar cannot be causally assigned to a particular loan.', residual: 'Any movement not observed by the named hooks is explicitly residual. Absolute residual sums cannot hide cancellation.', dominance: 'Concentration is descriptive, not a failure condition or proof of unfair advantage.' } };
  }
  return { begin, observe, report };
}

module.exports = { instrument, verifyNoninterference, createTracker, franchiseJournalEvidence };
