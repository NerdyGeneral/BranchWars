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
      if (p.workforce) p._workforceCosts = workforceOperatingCosts(p);
      const retention = settleHouseholdRetention(g, p, preview);
      // Locked maturities precede promotion repricing; repayment precedes new lending.
      const termSequence = p.accounting?.sequence || 0;
      const term = prepareTermFunding(g, p, preview),
        oldDepositWorld = depositWorld;
      const termFundingLoss = p.segmentDeposits ? p.accounting.journal.filter(e=>e.id>termSequence&&e.source.startsWith('sell.')).reduce((n,e)=>n-e.earnings,0) : 0;
      if (p.depositBook) depositWorld = g;
      try {
        if (p.depositBook) repriceWithdrawableDeposits(g, p);
        const oldCreditWorld = creditWorld;
        if (p.creditBook) creditWorld = g;
        try {
          const credit = settleCreditPerformance(g,p);
          const repaid = p.creditBook ? repayCredit(p) : null;
          text = settleMonthlyProduction(g, p, preview);
          if (p.creditBook) {
            p.operatingReport.principalRepaid = repaid;
            p.operatingReport.loanGrowth -= repaid + (credit ? credit.recovered : 0);
            if(credit)text += ' Collections recovered $' + credit.recovered.toLocaleString() + ' principal (not income).';
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
      if (retention) {
        Object.assign(p.operatingReport, { householdDepartures: retention.departed, householdDepositOutflow: retention.depositOutflow, householdFundingLoss: retention.fundingLoss });
        p.operatingReport.fundingLoss += retention.fundingLoss;
        text += ' Household retention: ' + retention.departed + ' relationships left with $' + retention.depositOutflow.toLocaleString() + ' in withdrawable deposits; funding-sale losses $' + retention.fundingLoss.toLocaleString() + '.';
      }
      if (term) {
        if(p.segmentDeposits){p.operatingReport.termDepartures=term.departed;p.operatingReport.termDepartureFundingLoss=termFundingLoss;p.operatingReport.fundingLoss+=termFundingLoss;text+=' Former-customer term maturities paid out $'+term.departed.toLocaleString()+' (not an expense).';}
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
      if (p.workforce) { delete p._workforceCosts; delete p._workforceReserved; }
    }
    updateCustomerRelationships(g, p);
    return text;
  });
}


// The transaction owns all temporary book/context state. Cohorts move before
// accounting settlement; franchise quantities move afterward. Finally blocks
// unwind in reverse order even when completion fails.
