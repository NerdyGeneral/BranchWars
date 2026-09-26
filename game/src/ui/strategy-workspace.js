// Capability selection is presentation only. Research, models and rollout orders
// retain the existing engine authority and canonical monthly-plan fields.
let strategyWorkspace={identity:null,owner:null,branch:'network',desk:'milestones',application:null,roadmaps:[]};
function strategyContext(v){return {...opportunityToken(v),attempt:connectionAttempt};}
function strategyContextCurrent(token,write=true){return opportunityCurrent(token,write)&&token.attempt===connectionAttempt&&token.stamp===JSON.stringify(draft);}
function strategyWriteAllowed(v){const now=currentView();return !!(now&&v?.me&&!v.me.submitted&&now.me.id===v.me.id&&now.cycle===v.cycle&&strategyContextCurrent(strategyContext(v)));}
function strategySelection(v){
 if(strategyWorkspace.identity!==(game||view)||strategyWorkspace.owner!==v.me.id){strategyWorkspace={identity:game||view,owner:v.me.id,branch:'network',desk:'milestones',application:null,roadmaps:[]};strategyModelProposal=null;}
 if(strategyModelProposal&&!strategyContextCurrent(strategyModelProposal.token))strategyModelProposal=null;
 return strategyWorkspace.branch;
}
function inspectStrategyCapability(v,branch,desk='milestones'){
 if(!v.strategyBranches[branch])return false;
 strategySelection(v);strategyWorkspace.branch=branch;strategyWorkspace.desk=desk;strategyWorkspace.application=null;strategyModelProposal=null;
 setWorkspaceTab('strategy',v);renderProjects(v);focusWorkspaceTarget($('#strategyDetailTitle'));return true;
}
function strategyApplications(v,branch){
 const list=[];
 if(v.me.productDeployment)for(const [key,d] of Object.entries(E.RETAIL_DEPLOYMENTS))if(d.branch===branch)list.push({key,kind:'product',name:d.name,definition:d});
 if(v.me.serviceDesk)for(const [key,d] of Object.entries(E.SERVICE_APPLICATIONS))if(d.requires.includes(branch))list.push({key,kind:'service',name:d.name,definition:d});
 return list;
}
function strategyServiceUseContent(v,app){
 const signed=v.me.serviceDesk.contracts.filter(c=>c.kind===app),fees=signed.reduce((n,c)=>n+c.fee,0);
 let use;
 try{
  const load=E.serviceLoad(serviceDraftPlayer(v)),rows=load.rows.filter(c=>c.kind===app);
  use='<div><small>Served under this draft</small><b>'+rows.filter(c=>c.served).length+' / '+signed.length+'</b></div><div><small>Fees before collection risk</small><b>'+money(rows.reduce((n,c)=>n+c.earned,0))+'/month</b></div>';
 }catch(error){
  use='<p class="notice warn">Service estimate unavailable: '+esc(error.message)+' Review activation and work commitments below.</p>';
 }
 return '<section aria-label="Application use"><h4>Use in your bank</h4><div class="decision-facts"><div><small>Existing signed agreements</small><b>'+signed.length+'</b></div><div><small>Signed fees, if fully served</small><b>'+money(fees)+'/month</b></div>'+use+'</div><p class="micro muted">Signed agreements are existing relationships, not customers granted by research. Draft fees exclude new bids, future renewals and company payment risk; they are not realized receipts or profit. Platform, servicing, vendor and payroll costs still apply.</p></section>';
}
function strategyMilestonesContent(v,branch,s,token){
 const info=v.strategyBranches[branch],tiers=v.capabilityTiers[branch],floor=s.level?tiers[s.level-1]:0,span=s.done?1:s.next-floor,pct=s.done?100:Math.max(0,Math.min(100,(s.spent-floor)/span*100)),pledgePct=s.done?0:Math.min(100-pct,s.pledged/span*100),writable=strategyContextCurrent(token);
 return '<div class="strategy-next">'+(s.done?'<h4>All research milestones complete</h4>':'<span class="eyebrow">NEXT MILESTONE</span><h4>'+esc(info.nodes[s.level].name)+'</h4><p class="small">'+esc(strategyMilestoneDescription(v,branch,s.level))+'</p>')+'</div><div class="capability-bar" role="img" aria-label="'+Math.round(pct)+' percent of current milestone paid; '+Math.round(pledgePct)+' percent staged"><span class="filled" style="width:'+pct+'%"></span><span class="pledged" style="width:'+pledgePct+'%"></span></div><div class="decision-facts"><div><small>Paid over the campaign</small><b>'+money(s.spent)+'</b></div><div><small>Staged this month</small><b>'+money(s.pledged)+'</b></div><div><small>'+(s.done?'Milestones complete':'Still needed after this draft')+'</small><b>'+(s.done?s.level+' / '+tiers.length:money(s.toNext))+'</b></div></div>'+
 (!s.done?'<div class="research-funding-actions"><button id="fund-'+branch+'-less" type="button" class="btn" '+(!writable||!s.pledged?'disabled':'')+'>− up to $50K</button><button id="fund-'+branch+'-more" type="button" class="btn" '+(!writable||s.reason?'disabled':'')+'>+ up to $50K</button><button id="fund-'+branch+'-max" type="button" class="btn primary" '+(!writable||s.reason?'disabled':'')+'>'+((s.maximum>=s.remaining)?'Stage to milestone':'Stage monthly maximum')+' · '+money(s.maximum)+'</button></div><p class="micro">'+esc(s.reason||(s.maximum<s.remaining?'The monthly limit and remaining cash/capital budget only fund part of this milestone.':'This stages the remaining cost; it does not pay or submit the plan.'))+'</p>':'<p class="small">No further research spending. You can still choose an operating model if none is permanent.</p>')+
 '<details id="strategyRoadmap" data-strategy-details="'+branch+'" '+(strategyWorkspace.roadmaps.includes(branch)?'open':'')+'><summary>Full roadmap · '+tiers.length+' milestones</summary><ol class="strategy-milestones">'+info.nodes.map((node,i)=>'<li class="capability-milestone '+(i<s.level?'reached':i===s.level?'next':'')+'"><b>'+esc(node.name)+'</b><span>'+(i<s.level?'COMPLETED · ':'')+money(tiers[i])+' cumulative</span><p class="micro">'+esc(strategyMilestoneDescription(v,branch,i))+'</p></li>').join('')+'</ol></details><p class="micro muted">Solid progress is paid; striped progress is only staged. Milestone effects begin next cycle. A related product or service may still require paid implementation, activation, staffing and maintenance.</p>';
}
function strategyModelsContent(v,branch,s,token){
 const locked=v.me.specializations[branch],picked=locked||draft.specializations[branch],canModel=strategyContextCurrent(token)&&!locked&&s.spent+s.pledged>=v.capabilityTiers[branch][0],pending=strategyModelProposal?.branch===branch?strategyModelProposal:null;
 const message=locked?'This operating model is permanent. Research and delivery choices remain available.':s.level>=1?'Choose a model for this draft, even without further research spending. It becomes permanent at turn resolution.':canModel?'Tier 1 is funded in this draft. You may stage a model; adoption requires tier 1 to be reached during resolution.':'Complete tier 1, or stage enough funding to reach it, before adopting a model.';
 const roadmap=({network:'roadmapNetwork',digital:'roadmapDigital',commercial:'roadmapCommercial',operations:'roadmapOperations',acquisition:'roadmapAcquisition'})[branch],removes=draft.newProjects?.includes(roadmap);
 return '<h4>Choose how this capability operates</h4><p class="small">'+message+'</p><div class="research-model-options">'+Object.entries(v.strategySpecializations[branch]).map(([key,def])=>'<button id="model-'+branch+'-'+key+'" type="button" class="specialization-option '+(picked===key?'selected':'')+'" aria-pressed="'+(picked===key)+'" '+(!canModel?'disabled':'')+'><b>'+esc(def.name)+'</b><p>'+esc(strategyModelDescription(v,branch,key))+'</p>'+(picked===key?'<span class="micro">'+(locked?'PERMANENT':'STAGED · NOT YET ADOPTED')+'</span>':'<span class="micro">Review this model</span>')+'</button>').join('')+'</div>'+
 (pending?'<section class="strategy-model-confirm" role="group" aria-labelledby="strategyModelTitle"><h4 id="strategyModelTitle" tabindex="-1">Stage '+esc(v.strategySpecializations[branch][pending.key].name)+'?</h4><p>This becomes permanent when both plans resolve if tier 1 is complete. It needs no additional research charge once eligible.</p><p>'+esc(strategyModelDescription(v,branch,pending.key))+'</p>'+(removes?'<p>This replaces the staged '+esc(v.projects[roadmap]?.name||roadmap)+' initiative; other commitments stay in the plan.</p>':'')+'<button id="confirmStrategyModel" type="button" class="btn">Confirm model</button><button id="cancelStrategyModel" type="button" class="btn">Keep current plan</button></section>':'')+
 (!locked&&draft.specializations[branch]?'<button id="removeStrategyModel" type="button" class="btn">Remove staged model</button>':'');
}
function strategyDeploymentContent(v,branch,token){
 const items=strategyApplications(v,branch);if(!items.length)return '<h4>Direct operating effects</h4><p>This capability currently changes the operating and acquisition rules described in its milestones and models. It has no separately deployable application in this campaign.</p><button type="button" class="btn" id="strategyProjectsLink">Inspect operating initiatives</button>';
 const selected=items.find(d=>d.key===strategyWorkspace.application)||items[0];strategyWorkspace.application=selected.key;
 let content='<div class="research-app-choices" role="group" aria-label="Related applications">'+items.map(d=>'<button type="button" class="btn" id="strategy-app-'+d.key+'" aria-pressed="'+(selected.key===d.key)+'">'+esc(d.name)+'</button>').join('')+'</div><h4>'+esc(selected.name)+'</h4>';
 const d=selected.definition,key=selected.key,project=selected.kind==='product'?d.project:key,matches=p=>p.key===project||(selected.kind==='product'&&E.PRODUCT_PROGRAM_PROJECTS[p.key]?.product===key),active=v.me.projects.find(matches),staged=E.planInitiatives(draft).some(key=>matches({key}));
 if(selected.kind==='product'){
  const state=v.me.productPrograms?.products[key],ready=v.me.productDeployment.ready[key],research=E.strategyLevel(v.me,d.branch)>=1;
  content+='<p class="small">'+esc(v.strategyBranches[d.branch].name)+' tier 1 enables in-house development. '+(v.me.productPrograms?'A licensed route is also available without research.':'A separate paid rollout is required.')+'</p><div class="decision-facts"><div><small>Completed research</small><b>'+(research?'Ready':'Tier 1 needed')+'</b></div><div><small>Delivery</small><b>'+(active?'In progress · '+Math.round(active.progress/active.total*100)+'%':staged?'Staged · not started':state?.retired?'Retired · servicing only':ready?state?.route==='partner'?'Licensed platform':'Delivered':'Not deployed')+'</b></div></div><p class="small">Implementation does not open sales or create deposits. Existing accounts retain their promises. Local sales and ongoing charges are managed with the product.</p>';
  if(v.me.productPrograms)content+='<button id="strategyProductLink" type="button" class="btn primary">Manage '+esc(d.name)+'</button>';
  else {const q=projectChoiceStatus(v,project),terms=E.projectStartTerms(v,v.me,project,draft.focus);content+='<p>'+money(terms.cost)+' once · '+terms.cycles+' work units · '+v.projects[project].capacity+' execution capacity.</p><p class="micro">'+esc(q.reason||'Fits the current plan')+'</p><button id="strategyDeployApplication" type="button" class="btn" '+(!strategyContextCurrent(token)||!q.eligible?'disabled':'')+'>'+(E.planInitiatives(draft).includes(project)?'Remove deployment':'Stage deployment')+'</button>';}
 }else{
  const ready=d.requires.every(k=>E.strategyLevel(v.me,k)>=1),owned=v.me.serviceDesk.applications[d.app],current=owned===d.route,enabled=!!draft.servicePolicy[d.app],status=projectChoiceStatus(v,project),terms=E.projectStartTerms(v,v.me,project,draft.focus),picked=E.planInitiatives(draft).includes(project);
  content+='<p class="small">'+esc(d.desc)+'</p><p class="small">Prerequisites: '+d.requires.map(k=>esc(v.strategyBranches[k].name)+' tier 1 '+(E.strategyLevel(v.me,k)>=1?'✓':'(needed)')).join(' + ')+'</p><div class="decision-facts"><div><small>Research</small><b>'+(ready?'Complete':'Not yet complete')+'</b></div><div><small>This delivery route</small><b>'+(active?'In progress · '+Math.round(active.progress/active.total*100)+'%':current?'Delivered':picked?'Staged':'Not deployed')+'</b></div><div><small>Selected route when active</small><b>'+money(d.upkeep)+'/month</b></div></div><p class="small">'+money(terms.cost)+' setup · '+terms.cycles+' work units · '+d.capacity+' shared execution capacity. '+(owned?'Existing '+(owned===true?'payroll':owned)+' platform: '+(enabled?'active in this draft.':'inactive in this draft.'):'No platform delivered for this service yet.')+'</p><p class="micro">'+esc(status.reason||'Fits the current plan')+'</p><div class="object-action-strip"><button id="strategyDeployApplication" type="button" class="btn primary" '+(!strategyContextCurrent(token)||!status.eligible?'disabled':'')+'>'+(picked?'Remove deployment':'Stage deployment')+'</button><button id="strategyServiceLink" type="button" class="btn">Activation, clients & service capacity</button></div><p class="micro muted">Research eligibility is not deployment, activation, new balances or guaranteed profit. Completed platforms may stay inactive without platform upkeep; once active, staffing, vendors and signed-account servicing are additional costs. Project completion uses shared Operations capacity. New completions activate next planning cycle.</p>';
 }
 if(selected.kind==='service')content+=strategyServiceUseContent(v,d.app);
 return content;
}
function renderStrategyWorkspace(v){
 const branch=strategySelection(v),token=strategyContext(v),s=strategyFundingStatus(v,branch),info=v.strategyBranches[branch],q=E.planBudget(v.me,draft,v),pledged=Object.values(draft.investments||{}).reduce((n,x)=>n+Math.max(0,Math.round(x||0)),0);
 const current=$('#strategyRoadmap');if(current?.dataset?.strategyDetails===branch){const set=new Set(strategyWorkspace.roadmaps);if(current.open)set.add(branch);else set.delete(branch);strategyWorkspace.roadmaps=[...set];}
 $('#strategySummary').innerHTML='<div class="strategy-budget"><span>Research staged <b>'+money(pledged)+'</b></span><span>Remaining plan budget <b>'+money(q.remaining)+'</b></span><span>Per capability / month <b>'+money(v.capabilityCap)+'</b></span></div>';
 $('#strategyTree').innerHTML='<div class="object-workspace research-workspace"><div class="object-columns"><nav class="object-directory" aria-label="Capabilities">'+Object.entries(v.strategyBranches).map(([key,d])=>{const state=strategyFundingStatus(v,key);return '<button type="button" class="object-row" id="strategy-select-'+key+'" aria-pressed="'+(key===branch)+'"><span><b>'+esc(d.name)+'</b><small>'+state.level+' / '+v.capabilityTiers[key].length+' milestones · '+money(state.spent)+' paid</small></span><span class="object-tag">'+(state.pledged?money(state.pledged)+' staged':state.done?'Complete':'Develop')+'</span></button>';}).join('')+'<p class="micro muted">All '+(v.researchProgramVersion===1?'six':'five')+' capabilities remain open. Inspecting a capability does not fund it or change your focus market. Permanent models retain their own tradeoffs.</p></nav><section class="object-detail" data-strategy-lane="'+branch+'" aria-labelledby="strategyDetailTitle"><h3 id="strategyDetailTitle" tabindex="-1">'+esc(info.name)+'</h3><p class="small">'+esc(info.promise)+'</p><div class="workbench-toolbar" role="group" aria-label="Capability actions">'+[['milestones','Fund research'],['model','Operating model'],['applications','Deployment & use']].map(([key,label])=>'<button type="button" class="btn" id="strategy-desk-'+key+'" aria-pressed="'+(strategyWorkspace.desk===key)+'">'+label+'</button>').join('')+'</div>'+(strategyWorkspace.desk==='model'?strategyModelsContent(v,branch,s,token):strategyWorkspace.desk==='applications'?strategyDeploymentContent(v,branch,token):strategyMilestonesContent(v,branch,s,token))+'</section></div></div>';
 renderResearchCombinations(v);
 bindStrategyWorkspace(v,token);
}
function renderResearchCombinations(v){
 if(!v.researchCombinations)return;
 const held=new Set(v.me.researchCombinations||[]);
 const descriptions=v.researchProgramVersion===1?{
  digitalTreasury:'Raises commercial fee income by 22%. Existing servicing capacity still limits the relationships that earn fees.',
  branchIntegration:'Reduces new branch project costs by another 22%, after Network research. Acquisition project costs are unchanged.',
  straightThrough:'Raises Retail & Service and Lending banker throughput by 18%. Funding and market capacity still limit actual growth.',
  structuredCredit:'Raises loan yield by a further 15% and multiplies modeled credit losses by 0.88, alongside any operating-model effects.',
  depositFranchise:'Reduces deposit funding cost by 10% and rate-sensitive deposit runoff by 28%.'
 }:{};
 const rows=Object.entries(v.researchCombinations).map(([key,def])=>{
  const need=Object.entries(def.requires).map(([branch,level])=>{
   const at=E.strategyLevel(v.me,branch),ok=at>=level;
   return '<span class="'+(ok?'combo-met':'combo-missing')+'">'+esc(v.strategyBranches[branch].name)+' '+at+'/'+level+'</span>';
  }).join(' + ');
  return '<li class="'+(held.has(key)?'combo-active':'combo-idle')+'"><b>'+(held.has(key)?'✓ ':'')+esc(def.name)+'</b>'+
   '<div class="micro muted">'+esc(descriptions[key]||def.desc)+'</div><div class="micro">'+need+'</div></li>';
 }).join('');
 $('#strategyTree').insertAdjacentHTML('beforeend',
  '<section class="research-combinations"><h3>COMBINED CAPABILITIES</h3>'+
  '<p class="small">Two branches together unlock what neither grants alone. These apply automatically once both tiers are funded.</p>'+
  '<ul class="combo-list">'+rows+'</ul></section>');
}
function bindStrategyWorkspace(v,token){
 const branch=strategyWorkspace.branch,application=strategyApplications(v,branch).find(d=>d.key===strategyWorkspace.application);
 const bind=(id,fn,write=false)=>$('#'+id)?.addEventListener('click',()=>{if(!strategyContextCurrent(token,write)){toast('The bank, month, connection or plan changed. Reopen Research to review current instructions.');return;}fn();});
 const redraw=id=>{const now=currentView();renderProjects(now);renderReady(now);if(id)restoreStrategyFocus(id);};
 for(const key of Object.keys(v.strategyBranches))bind('strategy-select-'+key,()=>inspectStrategyCapability(currentView(),key,strategyWorkspace.desk));
 for(const key of ['milestones','model','applications'])bind('strategy-desk-'+key,()=>{strategyWorkspace.desk=key;strategyModelProposal=null;redraw();focusWorkspaceTarget($('#strategyDetailTitle'));});
 for(const [key,amount] of [['less',-50000],['more',50000],['max',v.capabilityCap]])bind('fund-'+branch+'-'+key,()=>{if(stageStrategyFunding(currentView(),branch,amount))redraw('fund-'+branch+'-'+key);},true);
 for(const key of Object.keys(v.strategySpecializations[branch]))bind('model-'+branch+'-'+key,()=>{if(proposeStrategyModel(currentView(),branch,key)){redraw();focusWorkspaceTarget($('#strategyModelTitle'));}},true);
 bind('confirmStrategyModel',()=>{const pending=strategyModelProposal;if(confirmStrategyModel(currentView()))redraw('model-'+branch+'-'+pending.key);},true);
 bind('cancelStrategyModel',()=>{const pending=strategyModelProposal;strategyModelProposal=null;redraw(pending?'model-'+branch+'-'+pending.key:null);});
 bind('removeStrategyModel',()=>{if(v.me.specializations[branch])return;delete draft.specializations[branch];strategyModelProposal=null;redraw();},true);
 for(const app of strategyApplications(v,branch))bind('strategy-app-'+app.key,()=>{strategyWorkspace.application=app.key;redraw();$('#strategy-app-'+app.key)?.focus?.({preventScroll:true});});
 bind('strategyDeployApplication',()=>{if(application&&toggleInitiative(application.kind==='product'?application.definition.project:application.key,currentView()))redraw('strategyDeployApplication');},true);
 bind('strategyProductLink',()=>{if(application?.kind!=='product'||!v.me.productPrograms)return;const now=currentView();productSelection(now);productWorkspace.product=application.key;openProductDesk('development');focusWorkspaceTarget($('#productDetailTitle'));});
 bind('strategyServiceLink',()=>{const now=currentView();if(now.me.householdBook)selectCustomerSubject('commercial');else setWorkspaceTab('markets',now);const controls=$('#servicePricing');if(controls)controls.open=true;const input=$('[data-service-active="'+application?.definition.app+'"]'),panel=$('#commercialClientWorkspace');if(input&&!input.disabled)focusWorkspaceTarget(input);else if(panel){panel.setAttribute('tabindex','-1');focusWorkspaceTarget(panel);}});
 bind('strategyProjectsLink',()=>{setWorkspaceTab('operations');setOperationsDesk('projects');focusWorkspaceTarget($('#projectGrid'));});
}
