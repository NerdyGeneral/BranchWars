function resolveCycle(g) {
  const previous = ledgerContext,
    cycle = g.cycle;
  const parents = g.players.map((p) =>
    appendLedger(g, {
      cycle,
      category: 'resolution.start',
      source: 'resolveCycle',
      target: p.id,
      visibility: 'owner',
      resolutionId: g.resolutionId + 1
    })
  );
  ledgerContext = { g, cycle, parents };
  try {
    const resolve = () => {
      // Freeze both quotas before either bank operates. Market resolution and
      // retained accounting snapshots remain inside the same market context.
      if (g.marketEconomy)
        for (const p of g.players) {
          delete p.marketQuota;
          p.marketQuota = marketSupply(g, p, true);
        }
      try {
        for(const p of g.players)beginProductPricingReview(g,p);
        const result = resolveMonthlySteps(g);
        if (pilot(g))
          for (const p of g.players) {
            p.accounting = AccountingPrototype.restore(AccountingPrototype.snapshot(p.accounting, 96));
            syncAccounts(p);
          }
        return result;
      } finally {
        for(const p of g.players)productPricingTraces.delete(p);
        if (g.marketEconomy)
          for (const p of g.players) {
            p.stats.rateSensitiveDeposits = Math.min(p.stats.rateSensitiveDeposits, p.stats.deposits);
            delete p.marketQuota;
            delete p.marketSupply;
          }
      }
    };
    return g.marketEconomy ? withMarket(g, resolve) : resolve();
  } finally {
    ledgerContext = previous;
  }
}

// Intent preparation is ordered and uses the same policy rules as human plans.
