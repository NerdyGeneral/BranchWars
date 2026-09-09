function projectChoiceStatus(v,key){
 if(v.me.submitted)return {eligible:false,reason:'Your plan is already locked.'};
 // Removal is always available, including after a focus or staffing change.
 const chosen=E.planInitiatives(draft);if(chosen.includes(key))return {eligible:true,reason:''};
 const terms=E.projectTerms(v.me,key,draft.focus);
 if(!terms)return {eligible:false,reason:'That strategic project does not exist.'};
 const def=E.PROJECTS[key],target=E.projectTargetIssue(v,v.me,def,draft.focus);
 if(target)return {eligible:false,reason:target};
 const newProjects=[...chosen,key],candidate={...draft,newProjects,newProject:newProjects[0]};
 // Choosing expansion cancels a staged board request, as the click handler does.
 if(['branch','acquisition'].includes(def.kind))candidate.capitalAction=false;
 return E.projectPlanStatus(v.me,candidate);
}
function toggleInitiative(key,v){
 if(!draft)return;
 if(v){const status=projectChoiceStatus(v,key);if(!status.eligible){toast(status.reason);return}}
 if(!Array.isArray(draft.newProjects))draft.newProjects=[];
 const i=draft.newProjects.indexOf(key);if(i>=0)draft.newProjects.splice(i,1);else draft.newProjects.push(key);
 draft.newProject=draft.newProjects[0]||null;
}
function capacityLine(budget,load,free){const pct=budget>0?Math.min(100,Math.round(load/budget*100)):0;const cls=free<0?'hot':free<1?'watch':'';return`<div class="capacity-readout ${cls}"><div class="micro"><b>EXECUTION CAPACITY</b> ${load.toFixed(1)} / ${budget.toFixed(1)} committed · <b>${free.toFixed(1)} free</b></div><div class="capacity-bar"><span style="width:${pct}%"></span></div><div class="micro muted">Your executive team carries 1.5 on its own; each Operations &amp; Risk banker adds 2.0 and operations infrastructure adds more. Move bankers into Operations to run more at once.</div></div>`}
function renderProjectEffect(p,key,target){
 const effect=E.regionalProjectPreview(p,key,target);if(!effect)return '';
 const signed=n=>(n>=0?'+':'')+money(n);
 return '<div class="micro">ON COMPLETION · facility cost '+signed(effect.expense)+'/month · deposit capacity '+signed(effect.depositCapacity)+' · loan capacity '+signed(effect.loanCapacity)+'<br>Before bank-wide efficiency; capacity is not guaranteed sales.</div>';
}
let strategyModelProposal=null;
// Presentation corrections only: the original content remains part of saved views.
// These descriptions follow the complete project/operation settlement chain.
function strategyMilestoneDescription(v,branch,index){
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
 const done=level>=tiers.length,next=done?spent:tiers[level],remaining=Math.max(0,next-spent),maximum=done?pledged:E.fundingStep(v.me,draft,branch,v.capabilityCap);
 return {spent,level,pledged,done,next,remaining,maximum,toNext:Math.max(0,remaining-pledged),reason:v.me.submitted?'Your plan is locked.':done?'All milestones completed.':maximum<=pledged?'No additional funding fits this milestone, monthly limit and remaining cash / capital budget.':''};
}
function stageStrategyFunding(v,branch,step){
 if(v.me.submitted||!v.strategyBranches[branch]||!Number.isFinite(step))return false;
 const amount=E.fundingStep(v.me,draft,branch,step);draft.investments[branch]=amount;if(!amount)delete draft.investments[branch];strategyModelProposal=null;return true;
}
function proposeStrategyModel(v,branch,key){
 if(!v.strategyBranches[branch])return false;
 const state=strategyFundingStatus(v,branch);
 if(v.me.submitted||v.me.specializations[branch]||!v.strategySpecializations[branch]?.[key]||state.spent+state.pledged<v.capabilityTiers[branch][0])return false;
 strategyModelProposal={draftKey:strategyDraftKey(v),branch,key};return true;
}
function confirmStrategyModel(v){
 const pending=strategyModelProposal;strategyModelProposal=null;
 if(!pending||pending.draftKey!==strategyDraftKey(v)||v.me.submitted||v.me.specializations[pending.branch])return false;
 draft.specializations[pending.branch]=pending.key;return true;
}
function strategyUnlocks(v,branch){
 const lines=[];
 if(v.me.productDeployment)for(const d of Object.values(E.RETAIL_DEPLOYMENTS))if(d.branch===branch)lines.push('<li><b>'+esc(d.name)+'</b>: tier 1 enables '+(v.me.productPrograms?'in-house development in Products. A licensed route is also available without research.':'a rollout initiative in Operations.')+'</li>');
 if(v.me.serviceDesk)for(const d of Object.values(E.SERVICE_APPLICATIONS))if(d.requires.includes(branch))lines.push('<li><b>'+esc(d.name)+'</b>: '+d.requires.map(k=>esc(v.strategyBranches[k].name)+' tier 1').join(' + ')+'. Deploy in Strategy; activate and staff in Markets.</li>');
 return lines.length?'<details class="strategy-unlocks"><summary>Related product & service applications</summary><ul>'+lines.join('')+'</ul><p class="micro muted">Research eligibility is not deployment, activation, new balances or guaranteed profit. Existing projects also share your cash and executive capacity.</p></details>':'';
}
function renderStrategy(v){
 const tree=$('#strategyTree'),open=new Set(Array.from(tree.querySelectorAll?.('details[open]')||[]).map(el=>el.dataset.strategyDetails));
 const focus=typeof document==='undefined'?null:document.activeElement?.closest?.('#strategyTree button')?.id;
 if(strategyModelProposal&&(strategyModelProposal.draftKey!==strategyDraftKey(v)||v.me.submitted))strategyModelProposal=null;
 const pledgedTotal=Object.values(draft.investments).reduce((sum,n)=>sum+Math.max(0,Math.round(n||0)),0),q=E.planBudget(v.me,draft),lead=E.leadCapability(v.me);
 $('#strategySummary').innerHTML='<div class="strategy-budget"><span>Research staged <b>'+money(pledgedTotal)+'</b></span><span>Remaining plan budget <b>'+money(q.remaining)+'</b></span><span>Per capability / month <b>'+money(v.capabilityCap)+'</b></span></div><p class="micro">'+(lead?'Largest completed investment share: <b>'+esc(v.strategyBranches[lead].name)+'</b>. ':'No leading capability yet. ')+'All five capabilities remain open. Funding is staged, not spent until resolution; benefits begin next cycle. Operating models become permanent at turn resolution once tier 1 is complete; no further investment is required.</p>';
 tree.innerHTML=Object.entries(v.strategyBranches).map(([branch,info])=>{
  const s=strategyFundingStatus(v,branch),tiers=v.capabilityTiers[branch],floor=s.level?tiers[s.level-1]:0,span=s.done?1:s.next-floor,pct=s.done?100:Math.max(0,Math.min(100,(s.spent-floor)/span*100)),pledgePct=s.done?0:Math.min(100-pct,s.pledged/span*100),locked=v.me.specializations[branch],picked=locked||draft.specializations[branch],canModel=!v.me.submitted&&!locked&&s.spent+s.pledged>=tiers[0],pending=strategyModelProposal?.branch===branch?strategyModelProposal:null;
  const milestones=info.nodes.map((node,i)=>'<li class="capability-milestone '+(i<s.level?'reached':i===s.level?'next':'')+'"><b>'+esc(node.name)+'</b><span>'+(i<s.level?'COMPLETED · ':'')+money(tiers[i])+' cumulative</span><div class="micro">'+esc(strategyMilestoneDescription(v,branch,i))+'</div></li>').join('');
  const modelMessage=locked?'Permanent operating model.':s.level>=1?'Choose a model for this draft, even without further research spending. It becomes permanent at turn resolution.':canModel?'Tier 1 is funded in this draft. You may stage a model; adoption requires tier 1 to be reached during resolution.':'Complete tier 1, or stage enough funding to reach it, to choose a model.';
  return '<article data-strategy-lane="'+branch+'" class="strategy-lane '+(s.done?'primary':'')+'"><header><h3>'+esc(info.name)+'</h3><span class="strategy-tier">'+s.level+' / '+tiers.length+' milestones completed</span><p class="micro">'+esc(info.promise)+'</p></header><div class="capability-bar" role="img" aria-label="'+Math.round(pct)+' percent of current milestone paid; '+Math.round(pledgePct)+' percent staged"><span class="filled" style="width:'+pct+'%"></span><span class="pledged" style="width:'+pledgePct+'%"></span></div><div class="strategy-next">'+(s.done?'<b>Fully developed</b>':'<span class="micro">NEXT MILESTONE</span><b>'+esc(info.nodes[s.level].name)+'</b><p class="micro">'+esc(strategyMilestoneDescription(v,branch,s.level))+'</p>')+'<div class="micro">'+money(s.spent)+' paid'+(!s.done?' · '+money(s.toNext)+' remaining after this draft':'')+'</div></div><div class="capability-fund">'+(!s.done?'<button id="fund-'+branch+'-less" type="button" class="stepper" aria-label="Reduce '+esc(info.name)+' funding by up to $50K" data-fund="'+branch+'" data-fund-step="-50000" '+(v.me.submitted||!s.pledged?'disabled':'')+'>−</button><span class="fund-amount">'+money(s.pledged)+'</span><button id="fund-'+branch+'-more" type="button" class="stepper" aria-label="Increase '+esc(info.name)+' funding by up to $50K" data-fund="'+branch+'" data-fund-step="50000" '+(s.reason?'disabled':'')+'>+</button><span class="micro">staged this month</span><button id="fund-'+branch+'-max" type="button" class="fund-next" data-fund="'+branch+'" data-fund-step="'+v.capabilityCap+'" '+(s.reason?'disabled':'')+'>'+((s.maximum>=s.remaining)?'Stage to milestone':'Stage monthly maximum')+' · '+money(s.maximum)+'</button><p class="micro muted">'+esc(s.reason||((s.maximum<s.remaining)?'This stages only part of the milestone; the monthly limit and your remaining plan budget apply.':'Staged funding remains editable until you lock the plan.'))+'</p>':'<p class="micro muted">No further research spending.</p>')+'</div><details data-strategy-details="'+branch+'" '+(open.has(branch)?'open':'')+'><summary>Full roadmap · '+tiers.length+' milestones</summary><ol class="strategy-milestones">'+milestones+'</ol></details>'+strategyUnlocks(v,branch)+'<section class="specialization-fork"><h4>Operating model'+(picked?' · '+esc(v.strategySpecializations[branch][picked].name):'')+'</h4><p class="micro">'+modelMessage+'</p><div class="specialization-options">'+Object.entries(v.strategySpecializations[branch]).map(([key,def])=>'<button id="model-'+branch+'-'+key+'" type="button" class="specialization-option '+(picked===key?'selected':'')+'" aria-pressed="'+(picked===key)+'" data-specialization-branch="'+branch+'" data-specialization-key="'+key+'" '+(!canModel?'disabled':'')+'><b>'+esc(def.name)+'</b><div>'+esc(strategyModelDescription(v,branch,key))+'</div>'+(picked===key?'<span class="micro">'+(locked?'PERMANENT':'STAGED · NOT YET ADOPTED')+'</span>':'')+'</button>').join('')+'</div>'+(pending?'<div class="strategy-model-confirm" role="group" aria-label="Confirm operating model"><p>Stage <b>'+esc(v.strategySpecializations[branch][pending.key].name)+'</b>? This becomes permanent at turn resolution if tier 1 is complete. No additional research spending is needed once tier 1 is reached.</p><button id="confirmStrategyModel" type="button" class="btn">Confirm model</button><button id="cancelStrategyModel" type="button" class="btn">Cancel</button></div>':'')+'</section></article>';
 }).join('');
 restoreStrategyFocus(focus);
}
function renderProjects(v){
 if(v.me.regionalOperations)v.projects=E.projectCatalog({...v.me,focus:draft.focus});
 if(!Array.isArray(draft.newProjects))draft.newProjects=[];
 if(!draft.investments||typeof draft.investments!=='object')draft.investments={};
 const active=v.me.projects||[],budget=E.executionCapacity(v.me,draft.allocation),chosenDefs=draft.newProjects.map(k=>v.projects[k]).filter(Boolean),load=E.usedCapacity(v.me,chosenDefs),free=Math.round((budget-load)*10)/10,hireMax=E.hireLimit(v.me),roadmapKeys={network:'roadmapNetwork',digital:'roadmapDigital',commercial:'roadmapCommercial',operations:'roadmapOperations',acquisition:'roadmapAcquisition'};
 draft.newProjects=draft.newProjects.filter(k=>v.projects[k]&&!active.some(x=>x.key===k));draft.newProject=draft.newProjects[0]||null;
 const quote=E.planBudget(v.me,draft),hireBill=quote.recruiting,investBill=quote.research,spentCash=quote.total;
 $('#activeProject').innerHTML=active.length?active.map(p=>{const def=v.projects[p.key],pct=Math.min(100,Math.round(p.progress/p.total*100));return`<div class="active-line"><b>${esc(def.name)}</b>${p.target?` // ${esc(v.territories[p.target].name)}`:''}<div class="progress"><span style="width:${pct}%"></span></div><span class="micro">${pct}% complete // ${p.total} work units required</span></div>`}).join('')+capacityLine(budget,load,free):`<b>NO ACTIVE INITIATIVE</b><br><span class="micro">Run as many initiatives at once as your bankers and cash allow.</span>`+capacityLine(budget,load,free);
 renderStrategy(v);
 const cap=v.me.capitalRequest,capDisabled=v.me.submitted||!cap.eligible;$('#capitalAction').classList.toggle('hidden',!cap.eligible&&!draft.capitalAction);$('#capitalAction').classList.toggle('selected',!!draft.capitalAction);$('#capitalAction').innerHTML=`<b>EMERGENCY BOARD CAPITAL</b><div class="micro">${esc(cap.reason)}</div><div class="micro muted">Permanent concessions: ${cap.concessions} · Current oversight: ${cap.restriction} cycles</div><button type="button" id="capitalActionBtn" class="btn ${draft.capitalAction?'active':''}" ${capDisabled?'disabled':''}>${draft.capitalAction?'[ BOARD REQUEST ADDED ]':'[ REQUEST EMERGENCY CAPITAL ]'}</button>`;
  const tactical=Object.entries(v.projects).filter(([,p])=>!p.strategy&&!p.legacy&&!p.serviceOnly&&!p.programOnly&&!(v.me.productPrograms&&p.deploymentProduct)&&(!p.contractOnly||v.me.serviceContracts)&&(!p.deploymentProduct||v.me.productDeployment)&&(!p.regionalOnly||v.me.regionalOperations));$('#projectGrid').innerHTML=tactical.map(([k,p])=>{const running=active.some(x=>x.key===k),picked=draft.newProjects.includes(k),status=projectChoiceStatus(v,k),poor=!picked&&['cash','capital-reserve'].includes(status.code),tooBig=!picked&&status.code==='capacity',blocked=status.reason,facilityLabel=p.facility?` · ${p.facility.toUpperCase()} MODEL`:'';return`<button type="button" class="project ${picked?'selected':''}" data-project="${k}" ${!status.eligible?'disabled':''}><span class="project-title">${esc(p.name)}</span><div class="micro">${money(p.cost)} // ${p.cycles} base work units // ${(p.capacity||1.5).toFixed(1)} cap${p.target?` // ${esc(v.territories[draft.focus].name)}`:''}${facilityLabel}${running?' // UNDER WAY':tooBig?' // NEEDS CAPACITY':poor?' // INSUFFICIENT CASH / CAPITAL':''}</div><div class="micro muted">${esc(blocked||p.desc)}</div>${renderProjectEffect(v.me,k,draft.focus)}</button>`}).join('');
  $$('[data-strategy-project]').forEach(b=>b.addEventListener('click',()=>{toggleInitiative(b.dataset.strategyProject,v);renderProjects(v);renderCompetitiveActions(v);renderReady(v)}));
  $$('[data-specialization-branch]').forEach(b=>b.addEventListener('click',()=>{if(proposeStrategyModel(v,b.dataset.specializationBranch,b.dataset.specializationKey)){renderProjects(v);$('#confirmStrategyModel')?.focus()}}));
 if(strategyModelProposal){$('#confirmStrategyModel').addEventListener('click',()=>{const pending=strategyModelProposal;if(confirmStrategyModel(v))draft.newProjects=draft.newProjects.filter(k=>k!==roadmapKeys[pending.branch]);renderProjects(v);renderReady(v);if(pending)restoreStrategyFocus('model-'+pending.branch+'-'+pending.key)});$('#cancelStrategyModel').addEventListener('click',()=>{const pending=strategyModelProposal;strategyModelProposal=null;renderProjects(v);if(pending)restoreStrategyFocus('model-'+pending.branch+'-'+pending.key)})}
  $$('[data-project]').forEach(b=>b.addEventListener('click',()=>{toggleInitiative(b.dataset.project,v);if(draft.newProjects.some(k=>['branch','acquisition'].includes(v.projects[k].kind)))draft.capitalAction=false;renderProjects(v);renderCompetitiveActions(v);renderReady(v)}));
 $('#capitalActionBtn').addEventListener('click',()=>{draft.capitalAction=!draft.capitalAction;if(draft.capitalAction)draft.newProjects=draft.newProjects.filter(k=>!['branch','acquisition'].includes(v.projects[k].kind));renderProjects(v);renderReady(v)});
 const initiativeSpend=draft.newProjects.reduce((s,k)=>s+(v.projects[k]?v.projects[k].cost:0),0);
 const committedSpend=E.planBudget(v.me,draft).total;

 const nextHireUnaffordable=E.planBudget(v.me,{...draft,hires:(draft.hires||0)+1}).remaining<0;
 $('#hiringPanel').innerHTML=v.me.workforce?'<b>SHARED RECRUITMENT</b><p class="small">'+E.planHires(draft)+' / '+hireMax+' bankers staged · '+money(hireBill)+' combined signing cost. Arrive next month; no production this month.</p><button type="button" class="btn" id="openPeopleRecruitment">Compare generalist and specialist recruitment</button>':`<b>${v.me.workforce?'GENERALIST RECRUITING':'RECRUITING'}</b><div class="micro muted">Hire directly. New bankers report next cycle, raise payroll permanently, and dilute morale when hired in bulk.</div><div class="hire-row"><button type="button" class="stepper" data-hire="-1" ${v.me.submitted||!draft.hires?'disabled':''}>−</button><span class="hire-count">${draft.hires||0}</span><button type="button" class="stepper" data-hire="1" ${v.me.submitted||E.planHires(draft)>=hireMax||nextHireUnaffordable?'disabled':''}>+</button><span class="micro">${draft.hires?`${money(hireBill)} combined signing cost · generalist payroll +${money(draft.hires*18000)}/cycle`:`up to ${hireMax} per cycle`}</span></div><div class="micro plan-spend ${committedSpend>v.me.stats.cash?'bad':''}" style="margin-top:7px">THIS PLAN COMMITS <b>${money(committedSpend)}</b> of ${money(v.me.stats.cash)} available${committedSpend>v.me.stats.cash?' — over budget':''}</div>`;
 if(v.me.workforce){const owner=v.me.id,cycle=v.cycle,campaign=game||view;$('#openPeopleRecruitment').addEventListener('click',()=>{const now=currentView();if((game||view)===campaign&&now?.me.id===owner&&now?.cycle===cycle)setPeopleDesk('recruitment',{focus:true});});}
 $$('[data-fund]').forEach(b=>b.addEventListener('click',()=>{if(stageStrategyFunding(v,b.dataset.fund,Number(b.dataset.fundStep))){renderProjects(v);renderReady(v)}}));
 $$('[data-hire]').forEach(b=>b.addEventListener('click',()=>{if(v.me.submitted)return;const step=Number(b.dataset.hire);draft.hires=Math.max(0,Math.min(hireMax-E.specialistHireCount(draft),(draft.hires||0)+step));renderProjects(v);renderReady(v)}));
 renderCampaignBuff(v);renderWorkforce(v)
}
function renderReady(v){
 const review=monthlyPlanReview(v),pool=review.unallocated;
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
}
