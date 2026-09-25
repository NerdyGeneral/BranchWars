// An agreement owns its inspection and delivery proposal. Engine quotes remain
// authoritative; there is no parallel workforce, fee model or saved UI state.
let serviceWorkspace={identity:null,owner:null,cycle:null,id:null,pending:null};
function selectedServiceAgreement(v){
 if(serviceWorkspace.identity!==(game||view)||serviceWorkspace.owner!==v.me.id||serviceWorkspace.cycle!==v.cycle)
  serviceWorkspace={identity:game||view,owner:v.me.id,cycle:v.cycle,id:null,pending:null};
 return v.serviceAgreements?.find(c=>c.id===serviceWorkspace.id)||null;
}
function serviceAgreementOptions(v,plan,id){
 const agreement=v.serviceAgreements?.find(c=>c.id===id);
 if(!agreement||agreement.companyClosed||!v.me.serviceDesk)throw Error('This service agreement is unavailable.');
 let candidate=JSON.parse(JSON.stringify(plan)),options=E.serviceDeliveryOptions(v.me,candidate,v.economy,agreement,v),technologyAdded=0;
 // A proposal may include missing paid platform support. Nothing is adopted
 // until the entire change is confirmed; lack of a treasury platform is not
 // "fixed" by buying generic capacity.
 if(!options.length&&v.me.departmentFunctions&&(agreement.kind!=='treasury'||v.me.serviceDesk.applications.treasury&&candidate.servicePolicy.treasury)){
  const current=candidate.departmentFunctionsPolicy.vendors.technology,limit=Math.min(32,E.DepartmentFunctions.RULES.maxVendorQuarters-current);
  for(let added=1;added<=limit;added++){
   const trial=JSON.parse(JSON.stringify(candidate));trial.departmentFunctionsPolicy.vendors.technology=current+added;
   try{const checked=departmentFunctionCandidate(v,trial,trial.departmentFunctionsPolicy),found=E.serviceDeliveryOptions(v.me,checked.candidate,v.economy,agreement,v);
    if(found.length){candidate=checked.candidate;options=found;technologyAdded=added;break;}
   }catch(error){break;}
  }
 }
 return {agreement,options,candidate,technologyAdded};
}
function serviceAgreementProposal(v,plan,id,mix){
 const review=serviceAgreementOptions(v,plan,id),choice=review.options.find(o=>o.staff===mix.staff&&o.outsourcing===mix.outsourcing);
 if(!choice)throw Error('That delivery mix no longer supports this book. Review current capacity and platform requirements.');
 return buildServiceAgreementProposal(v,plan,review,choice);
}
function buildServiceAgreementProposal(v,plan,review,choice){
 const {agreement}=review,id=agreement.id;let candidate=JSON.parse(JSON.stringify(review.candidate));candidate.servicePolicy=JSON.parse(JSON.stringify(choice.policy));
 const bid=agreement.owner!==v.me.id&&agreement.due===v.cycle;
 if(bid){candidate.contractBid=id;candidate.opportunity=null;}
 if(v.me.departmentFunctions)candidate=departmentFunctionCandidate(v,candidate,candidate.departmentFunctionsPolicy).candidate;
 const prepared=serviceDraftPlayer(v,candidate),status=E.serviceBidStatus(prepared,agreement);
 if(!status.eligible)throw Error(status.reason);
 const project=E.projectPlanStatus(v.me,candidate,v);if(!project.eligible)throw Error(project.reason);
 if(v.me.facilityLifecycle){const site=E.lifecycleInstructionQuote(v,v.me,candidate);if(!site.status.eligible)throw Error('Office staffing or work conflicts: '+site.status.reason);}
 const budget=E.planBudget(v.me,candidate,v),load=E.serviceLoad(prepared),effects=[
  'Reserve '+choice.staff+' existing Business banker'+(choice.staff===1?'':'s')+' and '+choice.outsourcing+' outsourced service points for the whole signed book'+(agreement.owner!==v.me.id?' plus this prospective agreement':'')+'. These are standing policies, not hires.',
  'The outsourcing bill is $'+load.outsourced.toLocaleString('en-US')+' per month; active platforms cost $'+load.platform.toLocaleString('en-US')+' per month. Shared payroll still applies. Costs start this month and continue until revised.',
  bid?'Pursue '+E.SERVICE_TYPES[agreement.kind].name+' for '+serviceClientPresentation(v,agreement).name+'. A new award earns fees from next month; a rival or outside provider may win.':agreement.owner===v.me.id?'Change delivery capacity only. Existing renewal or decline instructions remain unchanged.':'Prepare capacity only. This agreement is not open for bids until month '+agreement.due+'. No future bid is scheduled.',
  'The shared discretionary budget records $'+budget.total.toLocaleString('en-US')+' of commitments. Service delivery charges above are operating costs, not added to that budget total. No money is paid and no turn is submitted now.'
 ];
 if(review.technologyAdded)effects.splice(1,0,'Add '+review.technologyAdded+' contracted Technology work unit'+(review.technologyAdded===1?'':'s')+' for $'+(review.technologyAdded*E.DepartmentFunctions.FUNCTIONS.technology.vendorRate).toLocaleString('en-US')+' per month. This separate standing support is required for the proposed service capacity; no employee is hired.');
 if(bid&&plan.opportunity)effects.push('Replace the selected ordinary opportunity. Its standing staff and vendor instructions remain; revise them separately if no longer wanted.');
 if(bid&&plan.contractBid&&plan.contractBid!==id)effects.push('Replace the currently selected service-agreement bid.');
 if(choice.staff!==plan.servicePolicy.staff)effects.push('Changing reserved bankers also changes time available for sales and other work. The whole plan has been re-quoted.');
 return {candidate,agreement,choice,budget,load,effects,bid};
}
function inspectServiceAgreement(v,id){
 if(!opportunityCurrent(opportunityToken(v),false)||!v.serviceAgreements?.some(c=>c.id===id&&!c.companyClosed))return false;
 if(v.me.householdBook&&typeof selectCustomerSubject==='function')selectCustomerSubject('commercial');
 selectedServiceAgreement(v);serviceWorkspace.id=id;serviceWorkspace.pending=null;renderPipeline(currentView());
 focusWorkspaceTarget($('#serviceInspectorTitle'));return true;
}
function requestServiceAgreement(v,id,mix){
 const token=opportunityToken(v);if(!opportunityCurrent(token))return false;
 try{const proposal=serviceAgreementProposal(currentView(),draft,id,mix);serviceWorkspace.pending={token,id,mix:{...mix},proposal};renderPipeline(currentView());$('#confirmServiceAgreement')?.focus?.();return true;}
 catch(error){toast(error.message);return false;}
}
function confirmServiceAgreement(){
 const pending=serviceWorkspace.pending;if(!pending)return false;
 if(!opportunityCurrent(pending.token)){serviceWorkspace.pending=null;toast('The bank, month or connection changed, or planning is locked. Inspect the current agreement again.');return false;}
 try{
  const v=currentView(),proposal=serviceAgreementProposal(v,draft,pending.id,pending.mix);
  if(pending.token.stamp!==JSON.stringify(draft)){serviceWorkspace.pending={...pending,token:opportunityToken(v),proposal};renderPipeline(v);toast('The plan changed. Review the refreshed proposal and confirm again.');return false;}
  draft=proposal.candidate;serviceWorkspace.pending=null;renderReady(v);renderPipeline(v);$('#serviceInspectorTitle')?.focus?.({preventScroll:true});return true;
 }catch(error){serviceWorkspace.pending=null;toast(error.message);return false;}
}
function cancelServiceAgreement(){serviceWorkspace.pending=null;renderPipeline(currentView());$('#serviceInspectorTitle')?.focus?.({preventScroll:true});}
function renderServiceAgreementInspector(v,mount=$('#pipeline')){
 const c=selectedServiceAgreement(v);if(!c)return;
 const token=opportunityToken(v),locked=!opportunityCurrent(token),type=E.SERVICE_TYPES[c.kind],profile=serviceClientPresentation(v,c),own=c.owner===v.me.id;
 let review,options=[],issue='';try{review=serviceAgreementOptions(v,draft,c.id);options=review.options;}catch(error){issue=error.message;}
 const selected=draft.contractBid===c.id,rows=options.map(o=>{
  let proposal,reason='';try{proposal=buildServiceAgreementProposal(v,draft,review,o);}catch(error){reason=error.message;}
  return '<tr><td>'+o.staff+'</td><td>'+o.outsourcing+'</td><td>'+money(o.serviceNet)+'</td><td>'+money(o.bankProfit)+'</td><td><button type="button" class="btn" data-agreement-staff="'+o.staff+'" data-agreement-outsource="'+o.outsourcing+'" '+(locked||reason?'disabled':'')+'>Review '+(proposal?.bid?'capacity & bid':'capacity')+'</button>'+(reason?'<p class="micro warn">'+esc(reason)+'</p>':'')+'</td></tr>';
 }).join('');
 const pending=serviceWorkspace.pending;
 mount.insertAdjacentHTML('beforeend','<section id="serviceInspector" class="object-detail" aria-labelledby="serviceInspectorTitle"><div class="section-head"><div><h3 id="serviceInspectorTitle" tabindex="-1">'+esc(profile.name+' · '+type.name)+'</h3><p class="micro">'+esc(v.territories[c.market].name)+' · '+(selected?'BID STAGED':own?'YOUR SIGNED AGREEMENT':'INSPECTION ONLY')+'</p></div><button type="button" class="btn" id="closeServiceInspector">Close agreement</button></div><p>'+esc(profile.text)+'</p><p class="small">'+(own?'Your signed fee is '+money(c.fee)+'/month.':'Your current quote is '+money(Math.round(type.fee*E.SERVICE_PRICING[draft.servicePolicy.pricing[c.kind]].mult))+'/month if awarded.')+' Requires '+type.load+' service points. This mandate is a service relationship, not a purchase of the company or an automatic new loan or deposit.</p><p class="micro">'+(c.due===v.cycle?'Open for renewal this month.':'Next renewal: month '+c.due+'.')+' '+c.misses+'/2 missed service months. Two misses reopen competition; an unserved book loses fees while direct service costs continue.</p><h4>Delivery for this client and your existing book</h4><p class="micro">'+(own?'Current signed terms.':'Conditional on winning this agreement; no new revenue is guaranteed.')+' Capacity costs start now; new awards earn next month. These comparisons use current conditions, not a prediction of rival actions or next month\'s economy. Desk net is before shared payroll; bank profit includes payroll and the current sales tradeoff. Company credit risk can reduce realized collections.</p><div class="table-scroll"><table class="regional-table"><thead><tr><th>Existing bankers reserved</th><th>Outsourced points</th><th>Whole desk net / month</th><th>Bank profit estimate</th><th>Review change</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  (review?.technologyAdded?'<p class="notice">These proposals include '+review.technologyAdded+' additional contracted Technology work unit'+(review.technologyAdded===1?'':'s')+' for '+money(review.technologyAdded*E.DepartmentFunctions.FUNCTIONS.technology.vendorRate)+'/month. Review confirms this support together with service capacity.</p>':'')+
  (!rows?'<p class="notice warn">'+esc(issue||'No supported delivery mix. More Business capacity, technology coverage or an active treasury platform may be required. No orders were changed.')+'</p><button type="button" class="btn" id="serviceInspectorCoverage">Review work coverage</button>'+(c.kind==='treasury'?'<button type="button" class="btn" id="serviceInspectorPlatforms">Review treasury platform deployments</button>':''):'')+
  '<p class="micro muted">A capacity change applies to the entire desk, not just this client. It does not hire employees, activate a platform, change prices, or cancel other standing reservations.</p>'+
  '<details class="office-ledger"><summary>Current provider & bid factors</summary><p class="small">Current provider: '+esc(own?v.me.name:c.owner===v.rival.id?v.rival.name:'Outside providers')+'. Signed fee: '+money(c.fee)+'/month. Ownership of the company does not confer its banking relationship.</p><p class="small">'+esc(profile.text)+' Current client-preference adjustment: '+E.clientBidAdjustment(serviceDraftPlayer(v),c)+'. Earned relationship bonus: '+E.relationshipBonus(v,serviceDraftPlayer(v),c).toFixed(2)+'.</p><p class="micro">Available Business staff, delivery reservations, local branches, Commercial capability, reputation and renewal pricing affect bids. Staffed incumbents receive a defense bonus; each contender also has seeded uncertainty. Targeted Relationship Advertising adds +3 in its market for four future months, then expires; it never guarantees a win. Capacity and platform eligibility are checked first.</p></details>'+
  (own?'<button type="button" class="btn" id="serviceDecline" '+(locked||c.due!==v.cycle?'disabled':'')+'>'+(draft.contractExit===c.id?'Undo staged renewal decline':'Stage decline at renewal')+'</button><p class="micro">Declining stages no renewal bid for this client. It does not cancel staffing or change the current signed fee.</p>':selected?'<button type="button" class="btn" id="serviceRemoveBid" '+(locked?'disabled':'')+'>Remove bid only</button><p class="micro">Standing capacity remains until you revise it.</p>':'')+
  (pending?'<section class="notice" aria-label="Review service agreement changes"><h4>Review the whole change</h4><ul>'+pending.proposal.effects.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><button type="button" class="btn" id="confirmServiceAgreement" '+(locked?'disabled':'')+'>Confirm delivery plan</button> <button type="button" class="btn" id="cancelServiceAgreement">Cancel delivery change</button></section>':'')+'</section>');
 $('#closeServiceInspector')?.addEventListener('click',()=>{if(!opportunityCurrent(token,false))return;serviceWorkspace.id=null;serviceWorkspace.pending=null;renderPipeline(currentView());$('[data-service-inspect="'+c.id+'"]')?.focus?.();});
 $$('[data-agreement-staff]').forEach(el=>el.addEventListener('click',()=>{if(opportunityCurrent(token)&&token.stamp===JSON.stringify(draft))requestServiceAgreement(currentView(),c.id,{staff:Number(el.dataset.agreementStaff),outsourcing:Number(el.dataset.agreementOutsource)});}));
 $('#confirmServiceAgreement')?.addEventListener('click',confirmServiceAgreement);$('#cancelServiceAgreement')?.addEventListener('click',cancelServiceAgreement);
 $('#serviceDecline')?.addEventListener('click',()=>{if(!opportunityCurrent(token)||token.stamp!==JSON.stringify(draft)||!own||c.due!==v.cycle)return;draft={...draft,contractExit:draft.contractExit===c.id?null:c.id};serviceWorkspace.pending=null;renderReady(currentView());renderPipeline(currentView());});
 $('#serviceRemoveBid')?.addEventListener('click',()=>{if(!opportunityCurrent(token)||token.stamp!==JSON.stringify(draft))return;draft={...draft,contractBid:null};serviceWorkspace.pending=null;renderReady(currentView());renderPipeline(currentView());});
 $('#serviceInspectorCoverage')?.addEventListener('click',()=>{if(opportunityCurrent(token,false))setPeopleDesk('coverage',{focus:true});});
 $('#serviceInspectorPlatforms')?.addEventListener('click',()=>{if(opportunityCurrent(token,false)&&c.kind==='treasury')inspectStrategyCapability(currentView(),'commercial','applications');});
}
