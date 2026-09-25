// Servicing follows the portfolio, not its implementation-specific row count.
// Cohorts retain every vintage, rate and arrears balance; no loan is merged,
// forgiven or removed. Named-company claims remain separate servicing items.
const CreditWorkload=Object.freeze({
 quote(p){
  const cohorts=p.creditBook?.cohorts||[],claims=p.companyCredit?.claims||[],groups=new Set();let principal=0;
  for(const c of cohorts){
   if(!Number.isSafeInteger(c.principal)||c.principal<=0||typeof c.market!=='string'||typeof c.product!=='string')throw Error('Invalid credit workload exposure.');
   principal+=c.principal;groups.add(JSON.stringify([c.market,c.product]));
  }
  for(const c of claims){if(!Number.isSafeInteger(c.principal)||c.principal<0)throw Error('Invalid named-credit workload exposure.');principal+=c.principal;}
  const administrationGroups=groups.size+claims.length,principalQuarters=principal/10000000*4,portfolioQuarters=administrationGroups/48;
  return {principal,cohortRows:cohorts.length,namedClaims:claims.length,administrationGroups,principalQuarters,portfolioQuarters,workload:principalQuarters+portfolioQuarters};
 }
});
function initializeCreditWorkload(g,o){
 if(o.creditWorkloadVersion!==1)return;
 g.creditWorkloadVersion=1;for(const p of g.players)p.creditWorkloadVersion=1;
}
function validateCreditWorkloadCampaign(g){
 const enabled=g.creditWorkloadVersion===1;
 if(g.version==='9.31'&&!enabled)throw Error('Missing credit workload rules.');
 if(g.creditWorkloadVersion!==undefined&&!enabled)throw Error('Unsupported credit workload rules.');
 if(g.players.some(p=>p.creditWorkloadVersion!==(enabled?1:undefined)))throw Error('Credit workload owner rules do not match the campaign.');
 if(enabled)validateCampaignRules(g,'game');
}
function projectCreditWorkload(g,out){
 if(g.creditWorkloadVersion===1){out.creditWorkloadVersion=1;out.me.creditWorkloadVersion=1;}
}
function validateCreditWorkloadView(v){
 if(v.version==='9.31'&&v.creditWorkloadVersion!==1)throw Error('Missing credit workload view rules.');
 if(v.me?.creditWorkloadVersion!==v.creditWorkloadVersion||v.rival?.creditWorkloadVersion!==undefined)throw Error('Invalid credit workload owner view.');
 if(v.creditWorkloadVersion!==undefined)validateCampaignRules(v,'view');
}
