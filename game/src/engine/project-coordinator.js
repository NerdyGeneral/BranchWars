function finishProject(g, p, project) {
  const programme = project && finishProductProgram(p, project.key);
  if(programme)return programme;
  const service = project && SERVICE_APPLICATIONS[project.key];
  if (service) {
    if (!p.serviceDesk) throw Error('Unversioned service application');
    p.serviceDesk.applications[service.app] = service.route;
    return (
      p.name +
      ' completed ' +
      service.name +
      '. Manage activation in Markets next planning cycle; recurring costs apply only while active.'
    );
  }
  if (project && project.key === 'contractAdvertising') {
    if (!p.serviceContracts || !g.territories[project.target]) throw Error('Invalid contract advertising');
    p.contractAds = { market: project.target, expires: g.cycle + 4 };
    return (
      p.name +
      ' launched targeted relationship advertising in ' +
      g.territories[project.target].name +
      ' through cycle ' +
      p.contractAds.expires +
      '. Replaces any earlier targeted campaign.'
    );
  }
  const def = project && PROJECTS[project.key];
  if (def && def.deploymentProduct) {
    if (!p.productDeployment) throw Error('Unversioned product deployment');
    p.productDeployment.ready[def.deploymentProduct] = true;
    return (
      p.name +
      ' deployed ' +
      RETAIL_DEPLOYMENTS[def.deploymentProduct].name +
      '. Sales remain closed until selected in the next Retail Offer Mix.'
    );
  }
  const depositTransfer = p.depositBook && project.key === 'acquisition',
    oldDepositBypass = depositBypass;
  let depositSeller, taken;
  if (depositTransfer) {
    depositSeller = g.players.find((x) => x.id !== p.id);
    const terms = acquisitionTerms(g, p, project.target);
    taken = takeDeposits(depositSeller, project.target, terms.depositTake, true);
    depositBypass = true;
  }
  try {
    const creditTransfer = p.creditBook && project.key === 'acquisition',
      oldCreditBypass = creditBypass;
    let creditSeller, transferred;
    if (creditTransfer) {
      creditSeller = g.players.find((x) => x.id !== p.id);
      const terms = acquisitionTerms(g, p, project.target);
      transferred = takeCredit(creditSeller, project.target, terms.loanTake);
      creditBypass = true;
    }
    let result;
    try {
      const settle = () => {
        const oldTarget = marketTarget;
        if (g.marketEconomy) marketTarget = project.target;
        try {
          const marketTransfer = g.marketEconomy && project.key === 'acquisition';
          let terms, seller;
          const oldBypass = marketBypass;
          if (marketTransfer) {
            terms = acquisitionTerms(g, p, project.target);
            seller = g.players[terms.seller];
            marketBypass = true;
          }
          let message;
          try {
            message = completeProjectSettlement(g, p, project);
          } finally {
            if (marketTransfer) marketBypass = oldBypass;
          }
          if (marketTransfer) {
            transferHouseholds(seller, p, project.target, terms.customerTake);
            for (const [resource, amount] of Object.entries({
              deposits: terms.depositTake,
              loans: terms.loanTake,
              customers: terms.customerTake
            })) {
              seller.marketBook.markets[project.target][resource] -= amount;
              p.marketBook.markets[project.target][resource] += amount;
            }
            syncAccounts(p);
            syncAccounts(seller);
          }
          return message;
        } finally {
          if (g.marketEconomy) marketTarget = oldTarget;
        }
      };
      result = g.marketEconomy ? withMarket(g, settle) : settle();
      if (creditTransfer) p.creditBook.cohorts.push(...transferred);
    } finally {
      if (creditTransfer) {
        creditBypass = oldCreditBypass;
        reconcileCredit(creditSeller);
        reconcileCredit(p);
      }
    }
    if (depositTransfer) p.depositBook.cohorts.push(...taken);
    return result;
  } finally {
    if (depositTransfer) {
      depositBypass = oldDepositBypass;
      reconcileDeposits(depositSeller);
      reconcileDeposits(p);
    }
  }
}
function completeProjectSettlement(g, p, project) {
  const regional = regionalOperations(p),
    def = project && PROJECTS[project.key];
  if (regional && def && def.regionalOnly) {
    if (!(p.branches[project.target] > 0))
      return (
        p.name + ' could not complete ' + def.name + ': no office remains; committed costs are not refunded.'
      );
    const state = p.regionalOperations.markets[project.target];
    if (project.key === 'branchClose') {
      closeRegionalOffice(p, project.target, g.cycle);
      delta(p, 'reputation', -2);
    } else {
      const key = project.key === 'branchService' ? 'service' : 'automation';
      state[key] = Math.min(2, state[key] + 1);
    }
    return p.name + ' completed ' + def.name + ' in ' + g.territories[project.target].name + '.';
  }
  const regionalEntry = regional && def && def.kind === 'branch' && !p.branches[project.target];
  const shares = regionalEntry ? [...g.territories[project.target].shares] : null;
  let result;
  if (p.accounting && project.key === 'acquisition') {
    const terms = acquisitionTerms(g, p, project.target),
      seller = g.players[terms.seller];
    const settlement = terms.depositTake - terms.loanTake;
    if (settlement > 0) provideCash(seller, settlement, terms.loanTake);
    else provideCash(p, -settlement);
    const books = AccountingPrototype.acquisition(p.accounting, seller.accounting, {
      deposits: terms.depositTake,
      loans: terms.loanTake,
      premium: 0
    });
    const oldSuppressed = accountingSuppressed;
    accountingSuppressed = true;
    try {
      result = applyProjectEffects(g, p, project);
    } finally {
      accountingSuppressed = oldSuppressed;
    }
    p.accounting = books.buyer;
    seller.accounting = books.seller;
    syncAccounts(p);
    syncAccounts(seller);
    result += ' Cash settlement: $' + settlement.toLocaleString() + '.';
  } else if (p.accounting) {
    const oldSource = accountingSource;
    accountingSource = project.key === 'capital' ? 'legacyCapital' : 'finishProject';
    try {
      const reentry = def && def.kind === 'branch' && !(p.branches[project.target] || 0);
      result = applyProjectEffects(g, p, project);
      if (reentry) {
        const territory = g.territories[project.target],
          index = g.players.indexOf(p);
        territory.exitStreak[index] = 0;
        territory.reentryUntil = territory.reentryUntil || [0, 0];
        territory.reentryUntil[index] = g.cycle + 4;
        if (territory.shares[index] < 15) {
          territory.shares[index] = 15;
          territory.shares[1 - index] = 85;
        }
        result += ' Re-entry secured 15% minimum launch share and four cycles to establish service.';
      }
    } finally {
      accountingSource = oldSource;
    }
  } else result = applyProjectEffects(g, p, project);
  if (regionalEntry) {
    const territory = g.territories[project.target],
      index = g.players.indexOf(p);
    territory.shares = shares;
    territory.reentryUntil[index] = g.cycle + 8;
    return (
      result.replace(/ Re-entry secured.*$/, '') +
      ' Eight-cycle establishment window; market share must be earned, not granted.'
    );
  }
  return result;
}
