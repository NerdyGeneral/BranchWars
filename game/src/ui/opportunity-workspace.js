// Object-centred pursuit desk. No saved state, outcome formula or second workforce.
let opportunityWorkspace={identity:null,owner:null,cycle:null,id:null,pending:null};
function revealOpportunity(selector='#opportunityInspectorTitle'){$(selector)?.focus?.({preventScroll:true});$('#opportunityInspector')?.scrollIntoView?.({block:'start',behavior:'instant'});}
function opportunityToken(v){return {identity:game||view,owner:v.me.id,cycle:v.cycle,stamp:JSON.stringify(draft),connection:featureConnectionGeneration,link:linkSession,repository:gh,lan};}
function opportunityCurrent(token,write=true){
 const v=currentView();return !!(token&&v&&token.identity===(game||view)&&token.owner===v.me.id&&token.cycle===v.cycle&&
  token.connection===featureConnectionGeneration&&token.link===linkSession&&token.repository===gh&&token.lan===lan&&
  (!write||draftOwner===v.me.id&&lastCycle===v.cycle&&!v.me.submitted&&!v.gameOver&&!(gh.active&&gh.paused)));
}
function opportunitySelection(v){
 if(opportunityWorkspace.identity!==(game||view)||opportunityWorkspace.owner!==v.me.id||opportunityWorkspace.cycle!==v.cycle)
  opportunityWorkspace={identity:game||view,owner:v.me.id,cycle:v.cycle,id:null,pending:null};
 return v.opportunities.find(o=>o.id===opportunityWorkspace.id)||null;
}
function opportunityPlanQuote(v,plan,id){
 const o=v.opportunities.find(o=>o.id===id);if(!o)throw Error('This opportunity is no longer available.');
 const candidate=JSON.parse(JSON.stringify(plan));candidate.opportunity=id;candidate.contractBid=null;
 const result=v.me.departmentFunctions?departmentFunctionCandidate(v,candidate,candidate.departmentFunctionsPolicy):{candidate,quote:null};
 const work=result.quote?.opportunity,budget=E.planBudget(v.me,result.candidate,v);
 let credit=null;
 if(o.type==='loan'){
  const owner=v.me.departmentFunctions?E.departmentCustomerPreview(v.me,v,result.candidate).owner:
   {...v.me,allocation:{...candidate.allocation},policies:{...v.me.policies,lending:candidate.lendingPolicy},products:{...v.me.products,...candidate.products},
    ...(v.me.creditPortfolio?{creditPortfolio:{...v.me.creditPortfolio,allocation:{...candidate.groupPolicy.creditAllocation}}}:{})};
  credit=E.opportunityCreditReview(owner,o,v);
 }
 return {...result,opportunity:o,work,budget,credit,eligible:!work||work.eligible,reason:work?.reason||'Historical rules use assigned staff in the bid strength; they do not reserve a separate pursuit workload.'};
}
function opportunityProposal(v,plan,id,approach='current'){
 const base=opportunityPlanQuote(v,plan,id),candidate=JSON.parse(JSON.stringify(base.candidate));
 let result=base,added=0,resource=null;
 if(approach!=='current'){
  if(!v.me.departmentFunctions||!base.work)throw Error('This campaign does not use department pursuit reservations.');
  const fn=base.work.function,roles=E.DepartmentFunctions.FUNCTIONS[fn].roles;
  if(approach!=='vendor'&&!roles.includes(approach))throw Error('That role cannot supply this function.');
  const cap=approach==='vendor'?E.DepartmentFunctions.RULES.maxVendorQuarters-candidate.departmentFunctionsPolicy.vendors[fn]:
   Math.max(0,(base.quote.remainingPools?.[approach]??0));
  if(!base.eligible){
   for(let units=1;units<=Math.min(32,cap);units++){
    const policy=JSON.parse(JSON.stringify(candidate.departmentFunctionsPolicy));
    if(approach==='vendor')policy.vendors[fn]+=units;else policy.quotas[fn][approach]+=units;
    try{
     const next={...candidate,departmentFunctionsPolicy:policy},trial=opportunityPlanQuote(v,next,id);
     if(trial.eligible){result=trial;added=units;resource=approach;break;}
    }catch(error){if(units===Math.min(32,cap))throw error;}
   }
   if(!result.eligible)throw Error('No supported amount of '+(approach==='vendor'?'contracted work':(v.roles[approach]?.name||approach)+' time')+' can cover this pursuit in the current plan. Review existing commitments in Work coverage.');
  }
 }
 if(!result.eligible)throw Error(result.reason);
 const status=E.projectPlanStatus(v.me,result.candidate,v);if(!status.eligible)throw Error(status.reason);
 if(v.me.facilityLifecycle){const office=E.lifecycleInstructionQuote(v,v.me,result.candidate);if(!office.status.eligible)throw Error('Office staffing or work conflicts: '+office.status.reason);}
 const effects=['Pursue '+base.opportunity.name+' this month. The rival may compete; selection never guarantees an award.'];
 if(plan.contractBid)effects.push('Replace the selected commercial service-agreement bid. Its existing staffing instructions remain.');
 if(plan.opportunity&&plan.opportunity!==id)effects.push('Replace the previous ordinary opportunity.');
 if(added){const fn=E.DepartmentFunctions.FUNCTIONS[base.work.function].name;
  effects.push(approach==='vendor'?'Add '+added+' contracted work units to '+fn+' for $'+(added*E.DepartmentFunctions.FUNCTIONS[base.work.function].vendorRate).toLocaleString('en-US')+' per month. The shared plan is re-quoted below.':
   'Move '+(added/4)+' banker-months of '+v.roles[approach].name+' into '+fn+'. This is existing employee time, not a new hire or extra payroll.');
  effects.push('This is a standing department instruction: it continues after the pursuit ends until you revise it in Work coverage. '+(approach==='vendor'?'The recurring vendor bill continues; no employee is hired or reassigned.':'Other unreserved activity has less capacity.'));
 }
 effects.push('Total plan commitments: $'+result.budget.total.toLocaleString('en-US')+'. No money is paid and no turn is submitted now.');
 return {...result,added,resource,effects,needsConfirmation:!!added||!!plan.contractBid||!!(plan.opportunity&&plan.opportunity!==id)};
}
function inspectOpportunity(v,id){
 const token=opportunityToken(v);if(!opportunityCurrent(token,false)||!v.opportunities.some(o=>o.id===id))return false;
 opportunitySelection(v);opportunityWorkspace.id=id;opportunityWorkspace.pending=null;renderPipeline(currentView());
 revealOpportunity();return true;
}
function requestOpportunity(v,id,approach='current'){
 const token=opportunityToken(v);if(!opportunityCurrent(token))return false;
 try{const proposal=opportunityProposal(currentView(),draft,id,approach);
  if(proposal.needsConfirmation){opportunityWorkspace.pending={token,id,approach,proposal};renderPipeline(currentView());$('#confirmOpportunity')?.focus?.();return true;}
  draft=proposal.candidate;opportunityWorkspace.pending=null;renderReady(currentView());renderPipeline(currentView());return true;
 }catch(error){toast(error.message);return false;}
}
function confirmOpportunity(){
 const pending=opportunityWorkspace.pending;if(!pending)return false;
 if(!opportunityCurrent(pending.token)){opportunityWorkspace.pending=null;toast('The owner, month or connection changed, or planning is locked. Inspect the current opportunity again.');return false;}
 try{const v=currentView(),proposal=opportunityProposal(v,draft,pending.id,pending.approach);
  if(pending.token.stamp!==JSON.stringify(draft)){opportunityWorkspace.pending={...pending,token:opportunityToken(v),proposal};renderPipeline(v);toast('The plan changed. Review the refreshed proposal and confirm again.');return false;}
  draft=proposal.candidate;opportunityWorkspace.pending=null;renderReady(v);renderPipeline(v);revealOpportunity('#opportunityPursue');return true;
 }catch(error){opportunityWorkspace.pending=null;toast(error.message);return false;}
}
function cancelOpportunityProposal(){opportunityWorkspace.pending=null;renderPipeline(currentView());$('#opportunityPursue')?.focus?.();}
function clearOpportunity(token){
 if(!opportunityCurrent(token)||token.stamp!==JSON.stringify(draft))return false;
 draft={...draft,opportunity:null};opportunityWorkspace.pending=null;renderReady(currentView());renderPipeline(currentView());return true;
}
function renderOpportunityInspector(v,o){
 if(!o)return '';let q,issue='';try{q=opportunityPlanQuote(v,draft,o.id);}catch(error){issue=error.message;}
 const terms=E.opportunityTerms(o),work=q?.work,locked=v.me.submitted||v.gameOver||gh.active&&gh.paused,selected=draft.opportunity===o.id;
 const outcome=terms.loans?money(terms.loans)+' proposed loan principal, not profit. Your lending standards set its risk; ongoing credit performance and collections apply.':
  money(terms.deposits)+' potential deposit balance, not revenue. Actual intake is limited by the outside market book.';
 const resources=work?'<p class="small"><b>'+esc(E.DepartmentFunctions.FUNCTIONS[work.function].name)+'</b></p><p class="small">'+Number((work.available/4).toFixed(3))+' effective employee-months available / '+(work.required/4)+' needed. Existing customer work is served first.</p><p class="micro muted">Effective work includes skills, coverage and paid providers; it is not a headcount of free employees.</p>':'';
 const capacityNotice=work?(work.eligible?'Enough effective capacity is reserved. An award is still uncertain.':'Reserve existing staff time or review paid contracted capacity below. An employee-month is one full month of work; actual delivery can differ with skills and coverage.'):q?.reason;
 const description=o.type==='business'?'Operating deposits and business/merchant relationships. This award does not open a separate commercial loan or treasury contract.':o.desc;
 const roles=work?E.DepartmentFunctions.FUNCTIONS[work.function].roles.filter(role=>work.function!=='relationships'||role===o.dept):[];
 const buttons=work&&!work.eligible&&!issue?roles.map(role=>'<button type="button" class="btn" data-opportunity-resource="'+role+'" '+(locked?'disabled':'')+'>Review '+esc(v.roles[role].name)+' reservation</button>').join('')+'<button type="button" class="btn" data-opportunity-resource="vendor" '+(locked?'disabled':'')+'>Review contracted capacity</button>':'';
 const credit=q?.credit,creditDetails=credit?'<div class="notice"><b>'+(credit.dedicated?'Commercial loan mandate':'Historical portfolio routing')+'</b>'+credit.parts.map(c=>'<p class="small">'+
  esc(v.productPortfolios.credit.options[c.product].name)+' · '+money(c.principal)+' · '+c.months+' months · '+Number((c.rate*12/10000).toFixed(2))+'% nominal annualized interest.</p>').join('')+
  '<p class="micro">'+(credit.dedicated?'The '+money(credit.fee)+' origination fee is withheld from the advance. '+money(credit.netAdvance)+' is disbursed; the borrower owes the full principal. This mandate does not change your ordinary lending allocation.':'This historical campaign routes the award through your ordinary lending allocation, even though the opportunity is named commercial.')+'</p>'+
  '<p class="micro">Opening cash '+money(q.budget.cash)+'; other staged commitments '+money(q.budget.total)+'. Funding happens after monthly operations. A shortfall can trigger the existing asset-sale or emergency-funding rules. Terms shown assume current conditions; this is not a borrower-specific credit assessment.</p></div>':'';
 const pending=opportunityWorkspace.pending;
 return '<section id="opportunityInspector" class="opportunity-inspector" aria-labelledby="opportunityInspectorTitle"><div class="section-head"><div><h3 id="opportunityInspectorTitle" tabindex="-1">'+esc(o.name)+'</h3><p class="micro">'+esc(v.territories[o.market].name)+' · '+(selected?'PURSUIT STAGED':'INSPECTION ONLY')+'</p></div><button type="button" class="btn" id="closeOpportunity">Close</button></div><div class="opportunity-detail-grid"><div><h4>What this can win</h4><p>'+esc(description)+'</p><p class="small">'+esc(outcome)+'</p>'+
  (terms.feeIncome&&!credit?.dedicated?'<p class="micro">On award, the current rules also record '+money(terms.feeIncome)+' of fee income. This is separate from principal.</p>':'')+creditDetails+'</div><div><h4>People & delivery</h4>'+resources+
  '<p class="notice '+(issue||work&&!work.eligible?'warn':'')+'">'+esc(issue||capacityNotice)+'</p><div class="opportunity-actions"><button type="button" class="btn" id="opportunityPursue" '+(locked||issue||!q?.eligible?'disabled':'')+'>Pursue with current capacity</button>'+buttons+
  (selected?'<button type="button" class="btn" id="clearOpportunity">Remove pursuit only</button>':'')+(work?'<button type="button" class="btn" id="opportunityCoverage">Review all work commitments</button>':'')+'</div>'+
  '</div></div><details><summary>How this fits your monthly plan</summary><p class="micro muted">Inspecting or pursuing does not move monthly focus, hire staff, change product terms or submit a turn. A service-agreement bid and an ordinary opportunity use the same pursuit slot. Removing a pursuit does not cancel standing staff or vendor instructions.</p></details>'+
  (pending?'<section class="notice opportunity-confirm" aria-label="Review pursuit changes"><h4>Review the whole change</h4><ul>'+pending.proposal.effects.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><button type="button" class="btn" id="confirmOpportunity" '+(locked?'disabled':'')+'>Confirm & stage</button> <button type="button" class="btn" id="cancelOpportunity">Cancel</button></section>':'')+'</section>';
}
function renderOpportunityPipeline(v){
 const selected=opportunitySelection(v),token=opportunityToken(v);
 $('#pipeline').innerHTML=v.opportunities.map(o=>'<button type="button" class="opportunity '+(draft.opportunity===o.id?'selected':'')+'" data-opp="'+esc(o.id)+'" aria-expanded="'+(selected?.id===o.id)+'"><div class="micro">'+esc(v.territories[o.market].name)+' · '+esc(v.roles[o.dept].name)+'</div><b>'+esc(o.name)+'</b><div class="opp-value">'+money(o.value)+'</div><div class="micro">'+(draft.opportunity===o.id?'Pursuit staged · ':'')+'Inspect needs & resources</div></button>').join('')+renderOpportunityInspector(v,selected);
 $$('[data-opp]').forEach(b=>b.addEventListener('click',()=>{if(opportunityCurrent(token,false))inspectOpportunity(currentView(),b.dataset.opp);}));
 $('#closeOpportunity')?.addEventListener('click',()=>{if(!opportunityCurrent(token,false))return;opportunityWorkspace.id=null;opportunityWorkspace.pending=null;renderPipeline(currentView());$('button[data-opp="'+selected.id+'"]')?.focus?.();});
 $('#opportunityPursue')?.addEventListener('click',()=>{if(opportunityCurrent(token)&&token.stamp===JSON.stringify(draft))requestOpportunity(currentView(),selected.id);});
 $$('[data-opportunity-resource]').forEach(b=>b.addEventListener('click',()=>{if(opportunityCurrent(token)&&token.stamp===JSON.stringify(draft))requestOpportunity(currentView(),selected.id,b.dataset.opportunityResource);}));
 $('#confirmOpportunity')?.addEventListener('click',confirmOpportunity);$('#cancelOpportunity')?.addEventListener('click',cancelOpportunityProposal);
 $('#clearOpportunity')?.addEventListener('click',()=>clearOpportunity(token));
 $('#opportunityCoverage')?.addEventListener('click',()=>{if(!opportunityCurrent(token,false))return;setPeopleDesk('coverage',{focus:true});if(departmentFunctionsLive.controller){const c=departmentFunctionsLive.controller;c.select(selected.type==='loan'?'credit':selected.type==='public'?'risk':'relationships',c.token());renderDepartments(currentView());}});
}
