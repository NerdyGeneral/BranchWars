function projectEntryPriceNote(v,key,focus){
 if(![9,10].includes(v.financialGroupVersion)||E.PROJECTS[key]?.kind!=='branch')return '';
 const base=E.projectTerms(v.me,key,focus),actual=E.projectStartTerms(v,v.me,key,focus);
 if(!base||!actual||actual.cost<=base.cost)return '';
 const cash=n=>'$'+n.toLocaleString(),extra=actual.cost-base.cost;
 return '<p class="micro project-entry-price">Re-entry: '+cash(base.cost)+' base + '+cash(extra)+' rival-held entry premium = '+cash(actual.cost)+' one time.</p>';
}
function projectChoiceStatus(v,key,plan=draft,target=plan.focus){
 if(v.me.submitted||v.gameOver)return {eligible:false,reason:'Your plan is already locked.'};
 // Removal is always available, including after a focus or staffing change.
 const chosen=E.planInitiatives(plan);if(chosen.includes(key))return {eligible:true,reason:''};
 const terms=E.projectStartTerms(v,v.me,key,target);
 if(!terms)return {eligible:false,reason:'That strategic project does not exist.'};
 const def=E.PROJECTS[key],issue=E.projectTargetIssue(v,v.me,def,target);
 if(issue)return {eligible:false,reason:issue};
 const newProjects=[...chosen,key],candidate={...plan,newProjects,newProject:newProjects[0]};
 if(v.financialGroupVersion===10&&def.target)candidate.projectTargets={...(plan.projectTargets||{}),[key]:target};
 // Choosing expansion cancels a staged board request, as the click handler does.
 if(['branch','acquisition'].includes(def.kind))candidate.capitalAction=false;
 const status=E.projectPlanStatus(v.me,candidate,v);if(!status.eligible)return status;
 // Check staged office work here too, not only at Ready. Both object-local and
 // catalogue actions must use the same authoritative conversion/renovation
 // quotes; removal above remains available even with an invalid draft.
 if(v.financialGroupVersion===10){
  if(candidate.facilityPolicy?.convert){const review=E.facilityInstructionQuote(v,v.me,candidate);if(!review.status.eligible)return {...status,...review.status};}
  if(candidate.facilityLifecyclePolicy?.renovate){const review=E.lifecycleInstructionQuote(v,v.me,candidate);if(!review.status.eligible)return {...status,...review.status};}
 }
 return status;
}
// Shared staging command for the project catalogue and contextual market actions.
// The engine remains authoritative for targets, capacity and the combined budget.
function initiativeCandidate(v,key,plan=draft,target=plan.focus){
 const status=projectChoiceStatus(v,key,plan,target);if(!status.eligible)return {status};
 const next=JSON.parse(JSON.stringify(plan)),chosen=E.planInitiatives(plan),removing=chosen.includes(key);
 next.newProjects=removing?chosen.filter(k=>k!==key):[...chosen,key];next.newProject=next.newProjects[0]||null;
 if(v.financialGroupVersion===10&&E.PROJECTS[key]?.target){
  next.projectTargets={...(next.projectTargets||{})};
  if(removing)delete next.projectTargets[key];else next.projectTargets[key]=target;
  if(!Object.keys(next.projectTargets).length)delete next.projectTargets;
 }
 if(!removing&&['branch','acquisition'].includes(E.PROJECTS[key]?.kind))next.capitalAction=false;
 return {status,candidate:next};
}
function toggleInitiative(key,v){
 if(!draft)return false;
 const now=currentView();if(!now||!v||now.me.id!==v.me.id||now.cycle!==v.cycle||now.me.submitted||now.gameOver)return false;
 const result=initiativeCandidate(now,key);if(!result.status.eligible){toast(result.status.reason);return false;}
 draft=result.candidate;return true;
}
function capacityLine(budget,load,free){const pct=budget>0?Math.min(100,Math.round(load/budget*100)):0;const cls=free<0?'hot':free<1?'watch':'';return`<div class="capacity-readout ${cls}"><div class="micro"><b>EXECUTION CAPACITY</b> ${load.toFixed(1)} / ${budget.toFixed(1)} committed · <b>${free.toFixed(1)} free</b></div><div class="capacity-bar"><span style="width:${pct}%"></span></div><div class="micro muted">Your executive team carries 1.5 on its own; each Operations &amp; Risk banker adds 2.0 and operations infrastructure adds more. Move bankers into Operations to run more at once.</div></div>`}
// Lifecycle campaigns register a new office with zero staff quarters, and unstaffed
// throughput is zero, so the engine's pooled before/after delta reports that every
// model delivers no capacity on completion. Staffing is a separate Markets decision,
// so quote the office's own catalogue rating instead — the same figure pre-lifecycle
// campaigns already show. Presentation only: the reviewed engine is not touched.
function ratedOfficeCapacity(p,key,target){
 const def=E.PROJECTS[key],profile=E.REGIONAL_MARKETS?.[target];
 if(!p.facilityLifecycle||def?.kind!=='branch'||!profile)return null;
 const rated=E.FacilityLifecycle?.CATALOG?.[def.facility]?.capacity;
 if(!rated)return null;
 return {depositCapacity:Math.round(rated.depositCapacity*profile.deposits),
  loanCapacity:Math.round(rated.loanCapacity*profile.loans)};
}
function renderProjectEffect(p,key,target){
 const effect=E.regionalProjectPreview(p,key,target);if(!effect)return '';
 const signed=n=>(n>=0?'+':'')+money(n),rated=ratedOfficeCapacity(p,key,target);
 const deposit=rated?rated.depositCapacity:effect.depositCapacity,loan=rated?rated.loanCapacity:effect.loanCapacity;
 return '<div class="micro">ON COMPLETION · facility cost '+signed(effect.expense)+'/month · deposit capacity '+signed(deposit)+' · loan capacity '+signed(loan)+
  '<br>'+(rated?'This office\'s rated capacity once staffed and established. Assign its staff on Markets. ':'')+'Before bank-wide efficiency; capacity is not guaranteed sales.</div>';
}
let strategyModelProposal=null;
// Presentation corrections only: the original content remains part of saved views.
// These descriptions follow the complete project/operation settlement chain.
function strategyMilestoneDescription(v,branch,index){
 if(v.researchProgramVersion===1){
  if(branch==='digital')return 'Builds digital adoption, service production and deposit acquisition. At this milestone, Digital reduces the base operating-expense multiplier by '+((index+1)*4.5)+'% and raises Retail & Service and Lending banker throughput by '+((index+1)*5.5)+'%, before separate model and combined-capability effects. Funding and market capacity still limit actual growth.';
  if(branch==='risk')return 'Each effective Risk level reduces modeled credit losses and recurring compliance pressure. Completing this milestone also reduces compliance pressure by 6 and executive attention by 3, each with a floor of zero. Capital buffers and funding constraints still apply.';
  if(branch==='operations'&&index===3)return 'Operations strengthens expense efficiency and project execution. Recurring credit-loss and compliance benefits belong to Risk & Capital; completing this tier still grants compliance relief and morale.';
 }
 const corrections={
  'network:1':'Branch projects require one fewer work unit; this does not stack with Regional Hubs. Staffing and execution capacity still determine completion time.',
  'digital:1':'Builds digital adoption, service production and deposit acquisition. Operating-expense savings require the separate Back-Office Automation model; this tier alone does not reduce expense.',
  'commercial:2':'Expands loan production and business/merchant growth. This commercial tier does not reduce underwriting risk.',
  'operations:0':'Qualifying projects with at least three work units require one fewer unit. Staffing and execution capacity still determine completion time.',
  'operations:1':'Executive capacity gains 1.5 points per effective Operations level, using the higher of research tier and legacy Operations infrastructure, not their sum.',
  'acquisition:1':'Acquisition projects require one fewer work unit. Staffing and execution capacity still determine completion time.'
 };
 if(branch==='network'&&index===3&&v.me.regionalOperations)return 'Maximum network tier strengthens deposit pull and lowers branch costs. Entering a regional market preserves its existing share; additional offices in an already-served market retain the capstone share bonus.';
 return corrections[branch+':'+index]||v.strategyBranches[branch].nodes[index].desc;
}
function strategyModelDescription(v,branch,key){
 if(v.researchProgramVersion===1){
  const researchDescriptions={
   'network:retailDensity':'Raises service capacity and retail customer/deposit conversion, with stronger reputation benefits. Base staff and facility operating expense rises by 4%. Growth remains subject to funding and market limits.',
   'network:regionalHub':'Raises deposit conversion by 26%. Branch projects require one fewer work unit; that reduction does not stack with Network tier 2.',
   'network:franchisePartners':'Reduces base operating expense by 30% and raises service capacity by 15%. Commercial fees fall by 14%, deposit funding cost rises by 8%, and rate-sensitive deposit runoff rises by 60%.',
   'digital:customerExperience':'Raises service capacity by 18% and the deposit-conversion multiplier by 19.84% in total. Rate-sensitive deposit runoff also rises by 8%.',
   'digital:automation':'Reduces base staff and facility operating expense by 24.56% in total and raises Retail & Service and Lending banker throughput by 24%. Digital tier benefits apply separately. It does not directly reduce project cost or work units.',
   'digital:dataLedCredit':'Raises loan-production capacity and loan yield while reducing modeled credit losses. Executive attention rises by 0.7 each month; cash and reserve limits still constrain new lending.',
   'commercial:treasury':'Raises commercial fee income and business/merchant acquisition, subject to relationship capacity. Retail & Service and Lending banker throughput falls by 7%.',
   'commercial:specializedCredit':'Raises loan-production capacity and loan yield, with higher modeled credit losses and recurring compliance pressure. More capacity does not guarantee funded loans.',
   'commercial:relationshipBanking':'Raises deposit conversion and commercial fees and reduces rate-sensitive deposit runoff. Service capacity falls by 2%; it does not directly reduce relationship counts.',
   'operations:lean':'Reduces base staff and facility operating expense by 28% in total and project costs by 15%. The project discount does not stack with Operations tier 3. It does not add execution capacity.',
   'operations:resilience':'Reduces the modeled credit-loss multiplier by 36.04% in total. It does not directly improve deposit defense, talent retention or event resilience.',
   'operations:processRedesign':'Raises Retail & Service and Lending banker throughput by 34% and reduces base operating expense by 14%. Once tier 1 is funded, adopting this permanent model has no additional upfront charge.',
   'acquisition:dealmaker':'Reduces acquisition project cost by another 10 percentage points of its base cost, alongside Acquisition research, and pushes acquired-market share toward your bank. Other project discounts apply separately.',
   'acquisition:integrator':'Reduces attention by 3 after an acquisition and uses a commercial facility when the deal adds an office. It does not increase the quantity of transferred customers or assets.',
   'acquisition:consolidator':'Raises ongoing business and merchant relationship acquisition by 14%, subject to relationship capacity. Executive attention rises by 0.8 each month.',
   'risk:provisioning':'Reduces modeled credit losses and deposit runoff while holding a larger liquidity reserve. Deposit conversion, loan-production capacity and loan yield are lower.',
   'risk:capitalEfficiency':'Raises loan-production capacity by 26% and reduces the liquidity reserve held back from lending by 22%. Modeled credit losses, deposit funding cost and recurring compliance pressure rise; the capital gate still applies.',
   'risk:standing':'Reduces deposit funding cost by 18% and lowers compliance pressure and executive attention each month. Base operating expense rises by 2%. It does not directly lift capital restrictions.'
  };
  if(researchDescriptions[branch+':'+key])return researchDescriptions[branch+':'+key];
 }
 // 9.41 research tree: these discounts stack with the family levels.
 if(v.researchTreeVersion===1&&branch==='network'&&key==='regionalHub')return 'Office projects need one fewer work unit, on top of the one Network level 2 removes. This model does not increase regional deposit or loan capacity.';
 if(v.researchTreeVersion===1&&branch==='operations'&&key==='lean')return 'Reduces base staff and facility operating expense by 10% and project costs by 15%, on top of the Operations level 3 discount. This model does not add execution capacity.';
 const corrections={
  'network:regionalHub':'Branch projects require one fewer work unit, the same non-stacking reduction as Network tier 2. This model does not increase regional deposit or loan capacity.',
  'digital:customerExperience':'Raises the organic deposit-acquisition multiplier by 7%, subject to supply and capacity limits. It does not directly add a household-acquisition bonus.',
  'digital:automation':'Reduces base staff and facility operating expense by 8%. It does not directly change project cost or execution speed.',
  'operations:lean':'Reduces base staff and facility operating expense by 10% and project costs by 15%. The project discount does not stack with Operations level 3; this model does not add execution capacity.',
  'acquisition:integrator':'Reduces attention by 3 after an acquisition and uses a commercial facility when the deal adds an office. It does not increase the quantity of transferred customers or assets.'
 };
 if(branch==='operations'&&key==='resilience')return v.me.creditPerformance?'Reduces the risk assigned to new loans; existing loan cohorts retain their risk. It does not directly improve deposit defense, talent retention or event resilience.':'Reduces the modeled credit-loss multiplier by 18%. It does not directly improve deposit defense, talent retention or event resilience.';
 return corrections[branch+':'+key]||v.strategySpecializations[branch][key].desc;
}
function strategyDraftKey(v){return v.me.id+':'+v.cycle+':'+JSON.stringify(draft)}
function restoreStrategyFocus(id){
 if(!id)return;
 const previous=$('#'+id);if(previous&&!previous.disabled){previous.focus();return}
 const branch=id.match(/^(?:fund|model)-([a-z]+)-/)?.[1];
 if(branch){const reduce=$('#fund-'+branch+'-less');if(reduce&&!reduce.disabled){reduce.focus();return}}
 const lane=previous?.closest?.('.strategy-lane')||(branch?$('[data-strategy-lane="'+branch+'"]'):null),alternative=lane?.querySelector?.('button:not(:disabled), summary');
 alternative?.focus();
}
function strategyFundingStatus(v,branch){
 const tiers=v.capabilityTiers[branch],spent=E.capabilitySpend(v.me,branch),level=E.strategyLevel(v.me,branch),pledged=Math.max(0,Math.round(draft.investments?.[branch]||0));
 const done=level>=tiers.length,next=done?spent:tiers[level],remaining=Math.max(0,next-spent),maximum=done?pledged:E.fundingStep(v.me,draft,branch,v.capabilityCap,v);
 return {spent,level,pledged,done,next,remaining,maximum,toNext:Math.max(0,remaining-pledged),reason:v.me.submitted?'Your plan is locked.':done?'All milestones completed.':maximum<=pledged?'No additional funding fits this milestone, monthly limit and remaining cash / capital budget.':''};
}
function stageStrategyFunding(v,branch,step){
 if(!strategyWriteAllowed(v)||!v.strategyBranches[branch]||!Number.isFinite(step))return false;
 const amount=E.fundingStep(v.me,draft,branch,step,v);draft.investments[branch]=amount;if(!amount)delete draft.investments[branch];strategyModelProposal=null;return true;
}
function proposeStrategyModel(v,branch,key){
 if(!strategyWriteAllowed(v)||!v.strategyBranches[branch])return false;
 strategySelection(v);const state=strategyFundingStatus(v,branch);
 if(v.me.submitted||v.me.specializations[branch]||!v.strategySpecializations[branch]?.[key]||state.spent+state.pledged<v.capabilityTiers[branch][0])return false;
 strategyModelProposal={draftKey:strategyDraftKey(v),token:strategyContext(v),branch,key};return true;
}
function confirmStrategyModel(v){
 const pending=strategyModelProposal;strategyModelProposal=null;
 if(!pending||!strategyWriteAllowed(v)||!strategyContextCurrent(pending.token)||pending.draftKey!==strategyDraftKey(v)||v.me.specializations[pending.branch])return false;
 draft.specializations[pending.branch]=pending.key;
 const roadmap=({network:'roadmapNetwork',digital:'roadmapDigital',commercial:'roadmapCommercial',operations:'roadmapOperations',acquisition:'roadmapAcquisition'})[pending.branch];
 draft.newProjects=E.planInitiatives(draft).filter(k=>k!==roadmap);draft.newProject=draft.newProjects[0]||null;return true;
}
function renderStrategy(v){renderStrategyWorkspace(v);}
function renderProjects(v){
 // Rendering must not remove invalid or redundant instructions. The shared
 // validator reports them; the player can explicitly decommit them.
 if(v.me.regionalOperations)v={...v,projects:E.projectCatalog({...v.me,focus:draft.focus},v)};
 const projectIds=E.planInitiatives(draft),active=v.me.projects||[],budget=E.executionCapacity(v.me,draft.allocation),chosenDefs=projectIds.map(k=>v.projects[k]).filter(Boolean),load=E.usedCapacity(v.me,chosenDefs),free=Math.round((budget-load)*10)/10,hireMax=E.hireLimit(v.me);
 const quote=E.planBudget(v.me,draft,v),hireBill=quote.recruiting,investBill=quote.research,spentCash=quote.total;
 $('#activeProject').innerHTML=active.length?active.map(p=>{const def=v.projects[p.key],pct=Math.min(100,Math.round(p.progress/p.total*100));return`<div class="active-line"><b>${esc(def.name)}</b>${p.target?` // ${esc(v.territories[p.target].name)}`:''}<div class="progress"><span style="width:${pct}%"></span></div><span class="micro">${pct}% complete // ${p.total} work units required</span></div>`}).join('')+capacityLine(budget,load,free):`<b>NO ACTIVE INITIATIVE</b><br><span class="micro">Run as many initiatives at once as your bankers and cash allow.</span>`+capacityLine(budget,load,free);
 renderStrategy(v);
 const cap=v.me.capitalRequest,capDisabled=v.me.submitted||!cap.eligible;$('#capitalAction').classList.toggle('hidden',!cap.eligible&&!draft.capitalAction);$('#capitalAction').classList.toggle('selected',!!draft.capitalAction);$('#capitalAction').innerHTML=`<b>EMERGENCY BOARD CAPITAL</b><div class="micro">${esc(cap.reason)}</div><div class="micro muted">Permanent concessions: ${cap.concessions} · Current oversight: ${cap.restriction} cycles</div><button type="button" id="capitalActionBtn" class="btn ${draft.capitalAction?'active':''}" ${capDisabled?'disabled':''}>${draft.capitalAction?'[ BOARD REQUEST ADDED ]':'[ REQUEST EMERGENCY CAPITAL ]'}</button>`;
  const tactical=Object.entries(v.projects).filter(([,p])=>!p.strategy&&!p.legacy&&!p.serviceOnly&&!p.programOnly&&!(v.me.productPrograms&&p.deploymentProduct)&&(!p.contractOnly||v.me.serviceContracts)&&(!p.deploymentProduct||v.me.productDeployment)&&(!p.regionalOnly||v.me.regionalOperations));renderProjectCatalogue(v,tactical);
  $$('[data-strategy-project]').forEach(b=>b.addEventListener('click',()=>{toggleInitiative(b.dataset.strategyProject,v);renderProjects(v);renderCompetitiveActions(v);renderReady(v)}));
  const projectContext=opportunityToken(v);
  $$('[data-project]').forEach(b=>b.addEventListener('click',()=>{if(!opportunityCurrent(projectContext))return;const now=currentView();if(!toggleInitiative(b.dataset.project,now))return;renderProjects(now);renderCompetitiveActions(now);renderReady(now)}));
 $('#capitalActionBtn').addEventListener('click',()=>{draft.capitalAction=!draft.capitalAction;if(draft.capitalAction)draft.newProjects=draft.newProjects.filter(k=>!['branch','acquisition'].includes(v.projects[k].kind));renderProjects(v);renderReady(v)});
 const committedSpend=E.planBudget(v.me,draft,v).total;

 const nextHireUnaffordable=E.planBudget(v.me,{...draft,hires:(draft.hires||0)+1},v).remaining<0;
 $('#hiringPanel').innerHTML=v.me.workforce?'<b>SHARED RECRUITMENT</b><p class="small">'+E.planHires(draft)+' / '+hireMax+' bankers staged · '+money(hireBill)+' combined signing cost. Arrive next month; no production this month.</p><button type="button" class="btn" id="openPeopleRecruitment">Compare generalist and specialist recruitment</button>':`<b>${v.me.workforce?'GENERALIST RECRUITING':'RECRUITING'}</b><div class="micro muted">Hire directly. New bankers report next cycle, raise payroll permanently, and dilute morale when hired in bulk.</div><div class="hire-row"><button type="button" class="stepper" data-hire="-1" ${v.me.submitted||!draft.hires?'disabled':''}>−</button><span class="hire-count">${draft.hires||0}</span><button type="button" class="stepper" data-hire="1" ${v.me.submitted||E.planHires(draft)>=hireMax||nextHireUnaffordable?'disabled':''}>+</button><span class="micro">${draft.hires?`${money(hireBill)} combined signing cost · generalist payroll +${money(draft.hires*E.bankBasePayroll(v.me))}/cycle`:`up to ${hireMax} per cycle`}</span></div><div class="micro plan-spend ${committedSpend>v.me.stats.cash?'bad':''}" style="margin-top:7px">THIS PLAN COMMITS <b>${money(committedSpend)}</b> of ${money(v.me.stats.cash)} available${committedSpend>v.me.stats.cash?' — over budget':''}</div>`;
 if(v.me.workforce){const owner=v.me.id,cycle=v.cycle,campaign=game||view;$('#openPeopleRecruitment').addEventListener('click',()=>{const now=currentView();if((game||view)===campaign&&now?.me.id===owner&&now?.cycle===cycle)setPeopleDesk('recruitment',{focus:true});});}
 $$('[data-hire]').forEach(b=>b.addEventListener('click',()=>{if(v.me.submitted)return;const step=Number(b.dataset.hire);draft.hires=Math.max(0,Math.min(hireMax-E.specialistHireCount(draft),(draft.hires||0)+step));renderProjects(v);renderReady(v)}));
 renderCampaignBuff(v);renderWorkforce(v)
}
function renderReady(v){
 if(typeof expandedInterfaceEnabled==='function'&&expandedInterfaceEnabled(v)){const review=monthlyPlanReview(v);$('#readyBtn').disabled=!!v.me.submitted||!!v.gameOver||review.blockers.length>0;$('#recallBtn').classList.toggle('hidden',!v.me.submitted||v.rival.submitted||v.gameOver);$('#submitMsg').textContent=v.me.submitted?'Plan locked. Waiting for the other institution.':review.blockers.length?review.blockers[0].text:'Required decisions complete. Review your warnings, then mark Ready.';renderExpandedInterface(v,review);return;}
 const review=monthlyPlanReview(v),pool=review.unallocated;
 if(typeof renderCoreSpendable==='function')renderCoreSpendable(v);
 // Every spending edit changes the strategy action token and its available budget.
 // Refresh the visible controls while old detached callbacks remain invalid.
 renderStrategy(v);
 $('#planChecklist').innerHTML=`${draft.focus?'✓':'○'} Focus market &nbsp; ${draft.decision?'✓':'○'} Executive decision &nbsp; ${pool===0?'✓':'○'} Headcount allocated <span class="micro">(not a work-coverage guarantee)</span>`;
 // A missing target can reach this view during draft repair. Do not run
 // market-dependent forecasts with no market, or leave old estimates visible.
 if(!review.blockers.some(item=>item.id==='focus')){
  if(v.serviceAgreements)renderPipeline(v);
  renderPlanBudget(v);renderOperatingPreview(v);renderCompetitiveActions(v);renderWorkforce(v);renderProductPrograms(v);
 }else{
  $('#operatingPreview').innerHTML='<p class="notice">Choose a valid focus market before comparing operating forecasts. Your draft has not been changed.</p>';
  $('#planBudget').innerHTML='<span>Spending review paused · choose a valid focus market.</span>';
 }
 $('#readyBtn').disabled=!!v.me.submitted||!!v.gameOver||review.blockers.length>0;
 $('#recallBtn').classList.toggle('hidden',!v.me.submitted||v.rival.submitted||v.gameOver);
 const quote=review.quote,overBudget=quote&&(quote.discretionaryRemaining??quote.remaining)<0;
 $('#submitMsg').textContent=v.me.submitted?'PLAN LOCKED // WAITING FOR RIVAL':v.gameOver?'Campaign ended. Planning is read-only.':overBudget?
  (quote.discretionaryRemaining!==undefined?`Optional commitments ${money(quote.discretionaryCommitments)} exceed available cash or capital room. Existing obligations ${money(quote.mandatoryObligations)} remain owed; reduce optional spending.`:`This plan commits ${money(quote.total)} but ${v.campaignRulesVersion===1?money(quote.capitalBudget)+' is available within capital limits':'only '+money(quote.cash)+' is available'}. Reduce funding, initiatives, hiring or the competitive action.`):
  review.blockers.length?review.blockers[0].text:'Required decisions complete. Review optional warnings, then mark ready; the month waits for both institutions.';
 $('#submitMsg').className='small '+(review.blockers.length?'bad':'muted');
 renderMonthlyPlanReview(v,review);
 if(typeof reconcileWorkspaceNavigation==='function')reconcileWorkspaceNavigation(v);
 if(typeof renderBankOverview==='function')renderBankOverview(v,review);
 if(typeof renderMonetaryPolicy==='function')renderMonetaryPolicy(v);
}
