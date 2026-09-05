function normalizePortfolioProducts(p,plan){
 if(p.retailLifecycle){plan.retailMix=plan.retailMix||{...p.retailLifecycle.mix};validateRetailMix(plan.retailMix)}else if(plan.retailMix)throw Error('Retail offer mix requires a new pilot campaign.');
 if(p.termFunding){plan.termPolicy=plan.termPolicy||{...p.termFunding.policy};validateTermPolicy(plan.termPolicy)}else if(plan.termPolicy)throw Error('Term funding requires a new pilot campaign.');
 plan.products={...p.products,...(plan.products||{})};
 for(const[line,group]of Object.entries(PRODUCT_PORTFOLIOS))if(!group.options[plan.products[line]])throw Error(`Choose a valid ${group.name.toLowerCase()} product.`);
 plan.specializations=plan.specializations&&typeof plan.specializations==='object'?plan.specializations:{};
 const def=PROJECTS[plan.newProject];
 if(def&&def.kind==='branch'&&p.branches[plan.focus]>=3)throw Error('That market already has maximum facility capacity.');
 if(def&&def.strategy&&strategyLevel(p,def.strategy)===1&&!p.specializations[def.strategy]){const choice=plan.specializations[def.strategy];if(!STRATEGY_SPECIALIZATIONS[def.strategy][choice])throw Error(`Choose an operating specialization for ${STRATEGY_BRANCHES[def.strategy].name}.`)}
}
