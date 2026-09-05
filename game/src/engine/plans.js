function validatePlan(g,p,plan){
 if(!plan||!g.territories[plan.focus]||!unlocked(g,g.territories[plan.focus]))throw Error('Choose an open focus market.');
 if(regionalOperations(p))p={...p,focus:plan.focus};
 if(!DEPOSIT_POLICIES[plan.depositPolicy]||!LENDING_POLICIES[plan.lendingPolicy]||!CAPITAL_POLICIES[plan.capitalPolicy])throw Error('Choose valid operating policies.');
 if(!['a','b'].includes(plan.decision))throw Error('Answer the executive call.');
 plan.competitiveAction=plan.competitiveAction||'none';
 const actionStatus=competitiveActionStatus(p,plan.competitiveAction);if(!actionStatus.eligible)throw Error(actionStatus.reason);
 const alloc=plan.allocation;
 if(!alloc||Object.keys(ROLES).some(k=>!Number.isInteger(alloc[k])||alloc[k]<0)||Object.keys(ROLES).reduce((sum,k)=>sum+alloc[k],0)!==p.stats.staff)throw Error(`Allocate all ${p.stats.staff} staff members.`);
 if(plan.opportunity&&!g.opportunities.some(o=>o.id===plan.opportunity))throw Error('That opportunity has expired.');
 if(plan.capitalAction){
  const status=capitalRequestStatus(p);if(!status.eligible)throw Error(status.reason);
  if(planInitiatives(plan).some(key=>['branch','acquisition'].includes(PROJECTS[key]&&PROJECTS[key].kind)))throw Error('Board assistance cannot be combined with an expansion initiative.');
 }
 const investments=plan.investments&&typeof plan.investments==='object'?plan.investments:{};
 for(const key of Object.keys(investments)){
  if(!STRATEGY_BRANCHES[key])throw Error('That capability does not exist.');
  const amount=Number(investments[key]);
  if(!Number.isFinite(amount)||!Number.isInteger(amount))throw Error('Capability investment must be a whole dollar amount.');
  if(amount>0&&amount<1000)throw Error('Capability investment must be at least $1,000.');
  if(amount<0)throw Error('Capability investment cannot be negative.');
  if(amount>0&&capabilityNextCost(p,key)<=0)throw Error(STRATEGY_BRANCHES[key].name+' is already fully developed.');
  if(amount>CAPABILITY_CAP_PER_CYCLE)throw Error(`An institution can absorb at most $${CAPABILITY_CAP_PER_CYCLE.toLocaleString()} of investment per capability each cycle.`);
  if(amount>capabilityRemaining(p,key))throw Error('That investment exceeds the remaining capability cost.');
 }
 const hires=planHires(plan);if(hires>hireLimit(p))throw Error(`You may hire at most ${hireLimit(p)} bankers in one cycle.`);
 const projects=projectPlanStatus(p,plan);if(!projects.eligible)throw Error(projects.reason);
 if(plan.contractBid!=null){
  if(plan.opportunity)throw Error('Choose one relationship pursuit: a new opportunity or a service agreement.');
  const c=(g.serviceAgreements||[]).find(c=>c.id===plan.contractBid);
  if(g.contractRulesVersion!==1||!c||c.due!==g.cycle)throw Error('Choose a service agreement due this cycle.');
  if(plan.allocation.business<1)throw Error('Assign at least one Business banker to bid for a service agreement.');
 }
 if(!p.serviceDesk)return;
 const planned={...p,allocation:plan.allocation,serviceDesk:{...p.serviceDesk,policy:plan.servicePolicy}};
 if(plan.contractBid){
  const c=g.serviceAgreements.find(c=>c.id===plan.contractBid),status=serviceBidStatus(planned,c);
  if(!status.eligible)throw Error(status.reason);
  if(c.owner===p.id)throw Error('An incumbent renews automatically; do not select a second bid.');
 }
 if(plan.contractExit){
  const c=g.serviceAgreements.find(c=>c.id===plan.contractExit);
  if(!c||c.owner!==p.id||c.due!==g.cycle)throw Error('Only decline your own agreement at its renewal.');
  if(plan.contractBid===plan.contractExit)throw Error('Cannot bid and decline the same agreement.');
 }
}
