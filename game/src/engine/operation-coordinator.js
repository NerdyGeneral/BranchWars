function runLegacyOperations(g, p, preview = false) {
  return preview === true
    ? calculateLegacyOperations(g, p, preview)
    : withRandom(g, 'state', () => calculateLegacyOperations(g, p, preview));
}
function operate(g, p, preview = false) {
  return recordLedgerStage(g, 'operate', 'operations', () => {
    const intake = [1, 2].includes(p.customerDemandVersion);
    if (intake)
      p._customerIntake = Object.fromEntries(
        Object.keys(p.marketBook.markets).map((k) => [k, { deposits: 0, cost: 0 }])
      );
    let text;
    try {
      // Locked maturities precede promotion repricing; repayment precedes new lending.
      const term = prepareTermFunding(g, p),
        oldDepositWorld = depositWorld;
      if (p.depositBook) depositWorld = g;
      try {
        if (p.depositBook) repriceWithdrawableDeposits(g, p);
        const oldCreditWorld = creditWorld;
        if (p.creditBook) creditWorld = g;
        try {
          const repaid = p.creditBook ? repayCredit(p) : null;
          text = settleMonthlyProduction(g, p, preview);
          if (p.creditBook) {
            p.operatingReport.principalRepaid = repaid;
            p.operatingReport.loanGrowth -= repaid;
            text += ' Scheduled principal returned $' + repaid.toLocaleString() + ' to cash (not profit).';
          }
        } finally {
          if (p.creditBook) creditWorld = oldCreditWorld;
        }
        const funding = fundingPosition(p);
        if (funding) {
          p.operatingReport.emergencyDebt = funding.debt;
          p.operatingReport.fundingExcess = funding.excess;
        }
        if (p.depositBook) p.depositBook.asOfCycle = g.cycle || p.depositBook.asOfCycle + 1;
      } finally {
        if (p.depositBook) depositWorld = oldDepositWorld;
      }
      if (term) {
        const { opened, renewed, released } = term;
        Object.assign(p.operatingReport, {
          termOpened: opened,
          termRenewed: renewed,
          termReleased: released
        });
        if (opened || renewed || released)
          text +=
            ' Term funding: opened $' +
            opened.toLocaleString() +
            ', renewed $' +
            renewed.toLocaleString() +
            ', released to withdrawable savings $' +
            released.toLocaleString() +
            '.';
      }
    } finally {
      if (intake) delete p._customerIntake;
    }
    updateCustomerRelationships(g, p);
    return text;
  });
}

// The transaction owns all temporary book/context state. Cohorts move before
// accounting settlement; franchise quantities move afterward. Finally blocks
// unwind in reverse order even when completion fails.
