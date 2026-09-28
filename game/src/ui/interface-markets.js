// Expanded physical network workspace. Working inputs are presentation only;
// every quote starts from the current shared draft and patches the selected object.
const INTERFACE_OFFICE_PROJECTS=Object.freeze({retail:'branch',commercial:'branchCommercial',digital:'branchDigital',atm:'branchAtm',wealth:'branchWealth',financialCenter:'branchFinancialCenter',regionalHub:'branchRegionalHub'});
let interfaceMarketsState={identity:null,owner:null,cycle:null,attempt:null,forms:{},revision:0};
function interfaceMarketsCopy(value){return JSON.parse(JSON.stringify(value));}
function interfaceMarketsContext(v){
 const identity=presentationCampaignIdentity(v),s=interfaceMarketsState;
 if(s.identity!==identity||s.owner!==v.me.id||s.cycle!==v.cycle||s.attempt!==connectionAttempt)
  interfaceMarketsState={identity,owner:v.me.id,cycle:v.cycle,attempt:connectionAttempt,forms:{},revision:s.revision+1};
 return interfaceMarketsState;
}
function interfaceMarketsForm(v,key){const s=interfaceMarketsContext(v);return s.forms[key]||(s.forms[key]={values:{},notice:''});}
function pendingInterfaceMarketsEdits(v){
 const s=interfaceMarketsState;if(!v||s.identity!==presentationCampaignIdentity(v)||s.owner!==v.me.id||s.cycle!==v.cycle||s.attempt!==connectionAttempt)return [];
 const rows=[];
 for(const [key,form]of Object.entries(s.forms)){
  const officeMatch=key.match(/^office:(.+):(staff|maintenance|renovate)$/),roomMatch=key.match(/^room:(.+):([^:]+)$/);
  let changed=Object.keys(form.values||{}).length>0,view='overview',context={},label='Market';
  if(officeMatch){
   const office=interfaceMarketsOffice(v,officeMatch[1]);if(!office)continue;view=officeMatch[2];context={office:office.id,market:office.market};label=facilityUiModel(office.model)+' · '+facilityUiOfficeLabel(office);
   changed=Object.entries(form.values).some(([path,raw])=>{const parts=JSON.parse(path),value=interfaceMarketsGet(draft,parts);return parts.includes('staffQuarters')?String(raw).trim()===''||Number(raw)*4!==value:raw!==value;});
  }else if(roomMatch){
   const office=interfaceMarketsOffice(v,roomMatch[1]);if(!office)continue;const id=Number(roomMatch[2]),room=v.me.sharedPremises?.book.rooms.find(r=>r.id===id&&r.office===office.id);view='room';context={office:office.id,market:office.market,...(room?{room:id}:{kind:roomMatch[2]})};label=E.SharedPremises.CATALOG[room?.kind||roomMatch[2]]?.name||'Service room';
   changed=!!form.action||Object.entries(form.values).some(([role,raw])=>String(raw).trim()===''||Number(raw)*4!==((draft.sharedPremisesPolicy||v.me.sharedPremises.policy).allocations.find(a=>a.room===id&&a.role===role)?.quarters||0));
  }else if(key==='network'){view='compare';label='Network staffing';changed=!!form.mode;}
  else if(key==='premises-network'){view='premises';label='Premises network';changed=!!form.reset;}
  else if(key.startsWith('focus:')){context={market:key.slice(6)};label='Monthly market focus';changed=!!form.focus&&draft.focus!==context.market;}
  else continue;
  if(changed)rows.push({title:label+' has working edits',text:'These changes are not in the monthly plan. Return to the focused editor to add them or discard them.',workspace:'markets',view,context});
 }
 return rows;
}
function interfaceMarketsGet(object,path){return path.reduce((o,k)=>o?.[k],object);}
function interfaceMarketsSet(object,path,value){let o=object;for(const key of path.slice(0,-1))o=o[key];o[path[path.length-1]]=value;}
function interfaceMarketsValue(form,path,fallback){const key=JSON.stringify(path);return Object.hasOwn(form.values,key)?form.values[key]:fallback;}
function interfaceMarketsNumber(raw){if(String(raw).trim()===''||!Number.isSafeInteger(Number(raw)*4)||Number(raw)<0)throw Error('Use non-negative staff time in steps of 0.25 months.');return Number(raw)*4;}
function interfaceMarketsPlan(v,form){
 const next=interfaceMarketsCopy(draft);
 if(v.me.facilityLifecycle&&!next.facilityLifecyclePolicy)next.facilityLifecyclePolicy=E.defaultFacilityLifecyclePlan(v.me);
 for(const [key,raw]of Object.entries(form.values||{})){
  const path=JSON.parse(key),value=path.includes('staffQuarters')?interfaceMarketsNumber(raw):raw;
  interfaceMarketsSet(next,path,value);
 }
 return next;
}
function interfaceMarketsToken(v){return {campaign:game||view,identity:presentationCampaignIdentity(v),owner:v.me.id,cycle:v.cycle,attempt:connectionAttempt,revision:interfaceMarketsState.revision,route:typeof interfaceCurrentRoute==='function'?interfaceCurrentRoute():null};}
function interfaceMarketsCurrent(token,writable=true){const v=currentView();return !!(v&&draft&&(game||view)===token.campaign&&presentationCampaignIdentity(v)===token.identity&&v.me.id===token.owner&&v.cycle===token.cycle&&connectionAttempt===token.attempt&&interfaceMarketsState.revision===token.revision&&(!token.route||interfaceCurrentRoute()===token.route)&&draftOwner===v.me.id&&lastCycle===v.cycle&&(!writable||!v.me.submitted&&!v.gameOver&&!(gh.active&&gh.paused)));}
function interfaceMarketsOffice(v,id){return v.me.facilityNetwork?.offices.find(o=>o.id===id&&o.closedCycle===null);}
function interfaceMarketsOfficeName(v,id){const o=interfaceMarketsOffice(v,id);return o?facilityUiModel(o.model)+' · '+facilityUiOfficeLabel(o)+' · '+(v.territories[o.market]?.name||o.market):'Unavailable office';}
function interfaceMarketsGo(view='overview',context={}){
 const opened=openInterfaceWorkspace('markets',view,context);
 if(opened)interfaceMarketsReveal();return opened;
}
// Moving within Markets keeps the page where it is. The inspector title takes
// focus without scrolling; the page scrolls only when the inspector's top is out
// of view (the stacked layout on narrower windows).
function interfaceMarketsReveal(){
 const title=$('#imInspectorTitle'),inspector=title?.closest?.('.im-inspector');if(!title)return;
 title.focus?.({preventScroll:true});
 const box=inspector?.getBoundingClientRect?.(),head=(typeof getComputedStyle==='function'?parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--interface-header-height')):0)||100;
 if(box&&(box.top<head||box.top>window.innerHeight-120))window.scrollTo?.({top:Math.max(0,window.scrollY+box.top-head-12)});
}
// One row of tabs replaces the lists of links that used to open each office or
// market task as a further page.
function interfaceMarketsTabs(tabs,selected,context){return '<nav class="im-tabs" aria-label="'+esc(context.office?'Office tasks':'Market tasks')+'">'+tabs.map(([label,view])=>'<button type="button" class="btn" data-im-view="'+esc(view)+'" data-im-context="'+esc(JSON.stringify(context))+'" aria-pressed="'+(view===selected)+'">'+esc(label)+'</button>').join('')+'</nav>';}
function interfaceMarketsOfficeTabs(v,o){const record=v.me.facilityLifecycle?.records[o.id];return [['Overview','office'],...(record?[['Staff time','staff'],['Maintenance & hubs','maintenance'],['Renovate','renovate']]:[]),['Convert','convert'],...(v.me.facilityExtensions||v.me.sharedPremises?[['Services & expansion','services']]:[])];}
function interfaceMarketsRefresh(){const v=currentView();if(v){renderReady(v);if(typeof renderExpandedInterface==='function')renderExpandedInterface(v);}}
function interfaceMarketsStage(token,proposal,formKey){
 if(!interfaceMarketsCurrent(token)){toast('This office, month or connection changed. Use the current inspector.');return false;}
 try{
  const v=currentView(),result=proposal(v);
  if(!result.eligible)throw Error(result.reason||'These instructions are unavailable.');
  draft=result.plan;if(formKey)delete interfaceMarketsState.forms[formKey];
  interfaceMarketsRefresh();toast('Monthly plan updated. Nothing is paid or assigned until resolution.');return true;
 }catch(error){toast(error.message);return false;}
}
function interfaceMarketsBudget(v,plan){
 try{const b=E.planBudget(v.me,plan,v),protectedCash=E.facilityLifecycleProtectedBudget(v.me,plan,b,v);
  return '<div class="im-quote-facts"><div><span>Whole-plan commitments</span><b>'+lifecycleMoney(b.total)+'</b></div><div><span>Available after protected commitments</span><b>'+lifecycleMoney(protectedCash.remaining)+'</b></div><div><span>Shared execution remaining</span><b>'+Number(b.freeCapacity).toFixed(2)+'</b></div></div>';
 }catch(error){return '<p class="im-status bad">'+esc(error.message)+'</p>';}
}
function interfaceMarketsStatus(result){return '<p class="im-status '+(result.eligible?'':'warn')+'" role="status">'+esc(result.eligible?'Fits the current monthly plan.':result.reason||'Unavailable in this campaign.')+'</p>';}
function interfaceMarketsButton(label,action,{disabled=false,primary=false,danger=false}={}){return '<button type="button" class="btn'+(primary?' primary':'')+(danger?' danger':'')+'" data-im-action="'+esc(action)+'"'+(disabled?' disabled':'')+'>'+esc(label)+'</button>';}
function interfaceMarketsLink(label,view,context={},note=''){return '<button type="button" class="im-row" data-im-view="'+esc(view)+'" data-im-context="'+esc(JSON.stringify(context))+'"><span><b>'+esc(label)+'</b>'+(note?'<small>'+esc(note)+'</small>':'')+'</span><span aria-hidden="true">→</span></button>';}
function interfaceMarketsFacts(rows){return '<dl class="im-facts">'+rows.map(([name,value])=>'<div><dt>'+esc(name)+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl>';}
function interfaceMarketsMetric(v,o){try{return E.facilityOfficeMetrics(v.me,o,draft);}catch(error){return null;}}
function interfaceMarketsCrossLink(label,workspace,view,context){return '<button type="button" class="btn" data-im-cross="'+esc(JSON.stringify({workspace,view,context}))+'">'+esc(label)+' →</button>';}
function interfaceMarketsCrossRow(label,note,workspace,view,context){return '<button type="button" class="im-row" data-im-cross="'+esc(JSON.stringify({workspace,view,context}))+'"><span><b>'+esc(label)+'</b><small>'+esc(note)+'</small></span><span aria-hidden="true">→</span></button>';}
function interfaceMarketsMap(v,market){
 // Reuse the original city's authored geography and isometric district art.
 // Only the presentation/click adapter belongs to this Expanded workspace.
 const entries=Object.entries(v.territories),roads=MAP_LINKS.filter(([a,b])=>v.territories[a]&&v.territories[b]).map(([a,b])=>{
  const A=mapPosition(a,v.territories[a]),B=mapPosition(b,v.territories[b]),fade=v.territories[a].unlocked&&v.territories[b].unlocked?1:.45;
  return '<g opacity="'+fade+'"><line class="city-road-edge" x1="'+A[0]*10+'" y1="'+A[1]*6.5+'" x2="'+B[0]*10+'" y2="'+B[1]*6.5+'"/><line class="city-road" x1="'+A[0]*10+'" y1="'+A[1]*6.5+'" x2="'+B[0]*10+'" y2="'+B[1]*6.5+'"/></g>';
 }).join(''),districts=entries.map(([key,t])=>districtArt(key,t)).join('');
 const nodes=entries.map(([key,t])=>{
  const [x,y]=mapPosition(key,t),[label,owner]=ownerLabel(t.shares[0]),withdrawn=!!t.exited?.[0],streak=t.exitStreak?.[0]||0;
  const status=!t.unlocked?'Opens month '+t.unlock:withdrawn?'Withdrawn':streak?'At risk':label;
  const description=t.name+', '+status+', your influence '+t.shares[0].toFixed(1)+' percent, rival influence '+t.shares[1].toFixed(1)+' percent, facilities '+t.branches[0]+' to '+t.branches[1];
  return '<button type="button" class="im-map-point '+owner+(key===market?' selected':'')+(!t.unlocked?' locked':'')+(withdrawn?' withdrawn':streak?' at-risk':'')+'" style="--x:'+x+'%;--y:'+Math.min(91,y+7)+'%" data-im-market="'+esc(key)+'" aria-label="'+esc(description)+'" title="'+esc(description)+'" aria-pressed="'+(key===market)+'"><span>'+esc(t.name)+'</span><small>'+(!t.unlocked?'Opens '+t.unlock:withdrawn?'Withdrawn':Number(t.shares[0]).toFixed(0)+'% influence')+'</small><small>Offices: You '+t.branches[0]+' · Rival '+t.branches[1]+'</small></button>';
 }).join('');
 return '<section class="im-map" aria-label="City map · select a market to inspect"><div class="im-city-board"><svg class="im-city-art" viewBox="0 0 1000 650" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path class="city-water" d="M690,0 H1000 V650 H820 C875,535 760,446 806,342 846,251 752,151 690,0Z"/><polygon class="city-ground" points="55,275 330,46 825,116 950,408 710,620 190,572"/><polygon class="city-block" points="120,286 336,86 525,113 320,305"/><polygon class="city-block" points="339,322 548,126 768,157 565,350"/><polygon class="city-block" points="594,364 786,182 900,405 715,574"/><polygon class="city-block" points="148,324 310,340 538,555 207,531"/>'+roads+districts+'<ellipse cx="505" cy="362" rx="230" ry="118" fill="none" stroke="#91b7aa" stroke-width="2" stroke-dasharray="7 8" opacity=".65"/></svg>'+nodes+'</div></section><div class="im-map-legend"><span><i class="me"></i>Your influence</span><span><i class="rival"></i>Rival influence</span><span><i class="contested"></i>Contested</span><span>Building pins = bank facilities</span></div><p class="im-caption">Select a district to inspect it. Influence is not deposit ownership. Monthly focus stays <b>'+esc(v.territories[draft.focus]?.name||draft.focus)+'</b>.</p>';
}
function interfaceMarketsProjectProposal(v,market,key){return marketActionProposal(v,market,key);}
function interfaceMarketsOrderWarning(v,oldOrder,newOrder,label){
 if(!oldOrder||JSON.stringify(oldOrder)===JSON.stringify(newOrder))return '';
 return '<p class="im-status warn">'+esc('Replace the existing '+label+' instruction: '+oldOrder+'. Only one such instruction fits this monthly order slot.')+'</p>';
}
function interfaceMarketsProjectView(v,c,view){
 const market=c.market,catalog=E.projectCatalog({...v.me,focus:market},v),keys=view==='build'?Object.values(INTERFACE_OFFICE_PROJECTS):['branchService','branchAutomation','branchClose'];
 const choices=keys.filter(k=>catalog[k]),key=choices.includes(c.project)?c.project:choices[0],def=catalog[key];
 const nav='<nav class="im-options" aria-label="'+(view==='build'?'New office types':'Market improvements')+'">'+choices.map(k=>interfaceMarketsLink(catalog[k].name,view,{market,project:k},lifecycleMoney(E.projectStartTerms(v,v.me,k,market).cost))).join('')+'</nav>';
 if(!def)return {html:'<p class="im-status">No projects of this type are enabled in this campaign.</p>',actions:{}};
 const proposal=interfaceMarketsProjectProposal(v,market,key),terms=E.projectStartTerms(v,v.me,key,market),model=def.facility,rating=E.FacilityLifecycle?.CATALOG[model],picked=E.planInitiatives(draft).includes(key)&&E.projectPlanTarget(draft,key)===market;
 const existing=v.me.projects.filter(p=>p.target===market),closed=key==='branchClose';
 let h='<div class="im-selection">'+nav+'<section><h3>'+esc(def.name)+'</h3><p>'+esc(def.desc)+'</p>'+interfaceMarketsFacts([['Upfront',lifecycleMoney(terms.cost)],['Work required',String(terms.cycles??def.cycles)+' units'],['Shared execution',String(def.capacity||1.5)]])+projectEntryPriceNote(v,key,market)+renderProjectEffect(v.me,key,market);
 if(rating)h+='<h4>Staff time at full capacity</h4><ul class="im-time-list">'+Object.entries(rating.staffQuarters).filter(([,n])=>n).map(([r,n])=>'<li><span>'+esc(lifecycleRole(r))+'</span><b>'+esc(lifecycleStaffTime(n))+'</b></li>').join('')+'</ul><p class="im-caption">Employees are hired through People. Opening this office creates no employees or automatic assignments. Local staff time comes from your finite bank workforce.</p>';
 if(closed){const last=(v.me.facilityNetwork?.offices||[]).filter(o=>o.market===market&&o.closedCycle===null).at(-1);h+='<p class="im-status warn">Closes the last-opened active office in this market'+(last?': '+esc(facilityUiOfficeLabel(last)):'')+'. It does not let you select an arbitrary office. No sale proceeds; ongoing obligations remain.</p>';}
 if(proposal.effects?.length)h+='<ul class="im-effects">'+proposal.effects.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>';
 h+=interfaceMarketsStatus(proposal.status)+(proposal.candidate?interfaceMarketsBudget(v,proposal.candidate):'')+'<div class="im-actions">'+interfaceMarketsButton(picked?'Remove from plan':'Add to plan','project',{primary:true,disabled:!proposal.status.eligible})+'</div><p class="im-caption">Work progresses through settlement and can stall when execution is unavailable. Work units are not a guaranteed opening date.</p></section></div>';
 if(existing.length)h+='<section class="im-running"><h4>Already underway in this market</h4>'+existing.map(p=>'<p>'+esc(E.PROJECTS[p.key]?.name||p.key)+' · '+Number(p.progress)+' / '+Number(p.total)+' work completed</p>').join('')+'<p class="im-caption">Paid ordinary projects have no general cancellation action.</p></section>';
 return {html:h,actions:{project:()=>{const q=interfaceMarketsProjectProposal(currentView(),market,key);return {eligible:q.status.eligible,reason:q.status.reason,plan:q.candidate};}}};
}
function interfaceMarketsLifecycleProposal(v,office,form,action='settings'){
 const plan=interfaceMarketsPlan(v,form),policy=plan.facilityLifecyclePolicy;
 if(action==='renovate'){policy.renovate=office.id;policy.cancel=null;}
 if(action==='cancel'){policy.renovate=null;policy.cancel=office.id;}
 if(action==='clear'){policy.renovate=null;policy.cancel=null;}
 const review=E.lifecycleInstructionQuote(v,v.me,plan);
 if(review.policy)plan.facilityLifecyclePolicy=interfaceMarketsCopy(review.policy);
 return {eligible:review.status.eligible,reason:review.status.reason,plan,review};
}
function interfaceMarketsOfficeControls(v,o,view){
 if(!v.me.facilityLifecycle)return {html:'<p class="im-status">This saved campaign does not track individual office condition or assignments.</p>',actions:{}};
 const formKey='office:'+o.id+':'+view,form=interfaceMarketsForm(v,formKey),record=v.me.facilityLifecycle.records[o.id],base=draft.facilityLifecyclePolicy||E.defaultFacilityLifecyclePlan(v.me),row=base.offices[o.id],locked=v.me.submitted||v.gameOver;
 const path=k=>['facilityLifecyclePolicy','offices',o.id,k],value=(p,fallback)=>interfaceMarketsValue(form,p,fallback),action=view==='renovate'?(form.action||(record.renovation?'cancel':'renovate')):'settings';
 let result;try{result=interfaceMarketsLifecycleProposal(v,o,form,action);}catch(error){result={eligible:false,reason:error.message};}
 const review=result.review||{},design=v.me.facilityExtensions?E.facilityExtensionStaffReference(v.me,o):E.FacilityLifecycle.CATALOG[o.model].staffQuarters;
 let h='';
 if(view==='staff'){
  h+='<h3>Assign bank staff time</h3><p>Your bank employs <b>'+integer(v.me.stats.staff)+' whole people</b>. Assign months of their time here; 0.25 is one quarter of a person’s month. Local time does not hire people.</p><div class="im-staff-table">';
  for(const role of E.FacilityLifecycle.ROLES){const p=path('staffQuarters').concat(role),pool=E.FacilityLifecycle.staffPoolRole(v.me,role),available=review.availableStaffQuarters?.[pool],all=result.plan?.facilityLifecyclePolicy?.offices||base.offices;
   const elsewhere=Object.entries(all).filter(([id])=>id!==o.id).reduce((sum,[,r])=>sum+E.FacilityLifecycle.ROLES.filter(k=>E.FacilityLifecycle.staffPoolRole(v.me,k)===pool).reduce((n,k)=>n+(r.staffQuarters[k]||0),0),0);
   h+='<label class="im-staff-row"><span><b>'+esc(lifecycleRole(role))+'</b><small>Reference '+esc(lifecycleStaffTime(design[role]))+'</small></span><input type="number" min="0" step="0.25" data-im-field="'+esc(JSON.stringify(p))+'" value="'+esc(value(p,row.staffQuarters[role]/4))+'"'+(locked?' disabled':'')+' aria-label="'+esc(lifecycleRole(role))+' time in months"><small>'+(available===undefined?'Pool unavailable':esc(lifecycleStaffTime(available))+' in shared '+esc(lifecycleRole(pool))+' pool')+'<br>'+esc(lifecycleStaffTime(elsewhere))+' at other offices</small></label>';
  }
  h+='</div><p class="im-caption">Business and wealth may draw from the same pool. Customer service, credit and department duties can reserve time before it reaches these offices.</p>'+interfaceMarketsCrossLink('Manage employment and bank allocations','people','staff',{market:o.market,office:o.id});
 }else if(view==='maintenance'){
  h+='<h3>Maintenance &amp; hub support</h3><div class="im-options horizontal" role="group" aria-label="Maintenance level">'+Object.entries(E.FacilityLifecycle.modes).map(([key,d])=>'<button type="button" class="btn" data-im-value="'+esc(key)+'" data-im-path="'+esc(JSON.stringify(path('maintenance')))+'" aria-pressed="'+(value(path('maintenance'),row.maintenance)===key)+'"'+(locked?' disabled':'')+'>'+esc(key[0].toUpperCase()+key.slice(1))+' · '+Math.round(d.spend*12)+'% upkeep</button>').join('')+'</div><p>Basic and full maintenance reduce ongoing wear. Renovation is a separate paid project that restores condition after completion.</p><h4>Nearby support hub</h4>';
  const hubs=review.nearbyHubIds?.[o.id]||[];
  h+='<div class="im-options">'+[null,...hubs].map(id=>'<button type="button" class="im-row" data-im-path="'+esc(JSON.stringify(path('hubId')))+'" data-im-value="'+esc(id||'')+'" aria-pressed="'+(value(path('hubId'),row.hubId)===id)+'"'+(locked?' disabled':'')+'>'+esc(id?interfaceMarketsOfficeName(v,id):'No hub support')+'</button>').join('')+'</div><p class="im-caption">Support transfers finite regional hub capacity; it does not duplicate employees or capacity.</p>';
 }else{
  h+='<h3>'+esc(record.renovation?'Renovation in progress':'Renovate this office')+'</h3>'+(record.renovation?'<p>'+lifecycleMoney(record.renovation.cost)+' already paid · '+record.renovation.work+'/'+E.FacilityLifecycle.RULES.renovationWork+' work. Cancellation refunds $0 and stops unfinished work at settlement.</p>':'<p>Restore this office’s condition after funded work completes. Its existing customer contracts and obligations continue; capacity is reduced during work.</p>');
  const old=base.renovate||base.cancel;if(old&&old!==o.id)h+=interfaceMarketsOrderWarning(v,interfaceMarketsOfficeName(v,old),o.id,'renovation/cancellation');
 }
 const label=view==='renovate'?(record.renovation?'Add cancellation · no refund':base.renovate&&base.renovate!==o.id||base.cancel&&base.cancel!==o.id?'Replace renovation order':'Add renovation to plan'):'Update office plan';
 h+='<div id="imQuote" aria-live="polite">'+interfaceMarketsStatus(result)+(review.quote?lifecycleQuoteMarkup(review,o,record):'')+(result.plan?interfaceMarketsBudget(v,result.plan):'')+'</div><div class="im-actions">'+interfaceMarketsButton(label,'save',{primary:true,disabled:locked||!result.eligible})+interfaceMarketsButton('Discard working edits','discard')+(view==='renovate'&&(base.renovate||base.cancel)?interfaceMarketsButton('Remove staged renovation order','clear',{disabled:locked}):'')+'</div>';
 return {html:h,formKey,actions:{save:now=>interfaceMarketsLifecycleProposal(now,interfaceMarketsOffice(now,o.id),interfaceMarketsForm(now,formKey),action),clear:now=>interfaceMarketsLifecycleProposal(now,interfaceMarketsOffice(now,o.id),{values:{}},'clear')},quote:()=>interfaceMarketsLifecycleProposal(currentView(),o,form,action)};
}
function interfaceMarketsConversion(v,o,c){
 const key='convert:'+o.id,form=interfaceMarketsForm(v,key),models=facilityUiModels(v.me).filter(m=>m!==o.model),model=models.includes(form.model)?form.model:models.includes(c.model)?c.model:models[0],locked=v.me.submitted||v.gameOver;
 form.model=model;
 const proposed={convert:o.conversion?null:{officeId:o.id,model},cancel:o.conversion?o.id:null};
 const make=(now,policy=proposed)=>{const plan=interfaceMarketsCopy(draft);plan.facilityPolicy=policy;const review=E.facilityInstructionQuote(now,now.me,plan);if(review.policy)plan.facilityPolicy=review.policy;return {plan,review,eligible:review.status.eligible,reason:review.status.reason};};
 let result;try{result=make(v);}catch(error){result={eligible:false,reason:error.message};}
 const q=result.review?.quote,existing=draft.facilityPolicy?.convert?.officeId||draft.facilityPolicy?.cancel;
 let h='<h3>'+esc(o.conversion?'Conversion in progress':'Convert this office')+'</h3>';
 if(o.conversion){h+='<p>'+esc(facilityUiModel(o.model))+' → '+esc(facilityUiModel(o.conversion.model))+' · '+o.conversion.work+'/'+E.FacilityNetwork.RULES.work+' work · '+lifecycleMoney(o.conversion.cost)+' already paid. '+(o.conversion.readyCycle?'Activates month '+o.conversion.readyCycle+'.':'Activates the month after work completes.')+'</p>';try{const m=E.facilityProgressComparison(v,v.me,o,draft);h+=facilityImpactTable(m.before,m.during,m.after);}catch(error){h+='<p>'+esc(error.message)+'</p>';}}
 else h+='<nav class="im-options horizontal" aria-label="Destination office type">'+models.map(m=>'<button type="button" class="btn" data-im-model="'+esc(m)+'" aria-pressed="'+(m===model)+'">'+esc(facilityUiModel(m))+'</button>').join('')+'</nav>'+(q?interfaceMarketsFacts([['One-time conversion expense',lifecycleMoney(q.cost)],['Work',q.work+' units'],['Execution',q.capacity]])+esc(q.activation||'')+(q.before&&q.during&&q.after?facilityImpactTable(q.before,q.during,q.after):''):'');
 if(existing&&existing!==o.id)h+=interfaceMarketsOrderWarning(v,interfaceMarketsOfficeName(v,existing),o.id,'conversion/cancellation');
 h+='<p class="im-caption">Conversion keeps the identified site and its obligations. It supplies no employees. Installed services must fit the destination; the engine checks compatibility and shared construction conflicts.</p>'+interfaceMarketsStatus(result)+(result.plan?interfaceMarketsBudget(v,result.plan):'')+'<div class="im-actions">'+interfaceMarketsButton(o.conversion?'Add cancellation · no refund':existing&&existing!==o.id?'Replace conversion order':'Add conversion to plan','save',{primary:true,disabled:locked||!result.eligible})+(existing?interfaceMarketsButton('Remove staged conversion order','clear',{disabled:locked}):'')+'</div>';
 return {html:h,formKey:key,actions:{save:now=>make(now),clear:now=>make(now,E.defaultFacilityPolicy(now.me))}};
}
function interfaceMarketsSuite(v,o){
 const d=E.COMMERCIAL_SUITE,installed=v.me.facilityExtensions?.offices[o.id],active=installed&&E.facilityExtensionActive(v.me,o.id),order=draft.facilityExtensionPolicy||{start:null,cancel:null},proposed={start:installed?null:o.id,cancel:installed?o.id:null},locked=v.me.submitted||v.gameOver;
 const make=(now,policy=proposed)=>{const plan=interfaceMarketsCopy(draft);plan.facilityExtensionPolicy=policy;try{E.normalizeFacilityExtensionPlan(now,now.me,plan);return {eligible:true,plan};}catch(error){return {eligible:false,reason:error.message,plan};}};
 const result=make(v),old=order.start||order.cancel;
 let h='<h3>Commercial banking suite</h3>'+interfaceMarketsFacts([['Fit-out',lifecycleMoney(d.cost)],['Upkeep after opening',lifecycleMoney(d.upkeep)+' / month + maintenance'],['Construction',d.work+' work · '+d.execution+' execution'],['Rated deposit capacity',lifecycleMoney(d.capacity.depositCapacity)],['Rated loan capacity',lifecycleMoney(d.capacity.loanCapacity)],['Rated service capacity',d.capacity.serviceCapacity]]);
 h+=installed?'<p class="im-status">'+(active?'Operating':installed.readyCycle?'Opens month '+installed.readyCycle:'Under construction · '+installed.work+'/'+d.work+' work')+'</p>':'<p>Keep the office’s existing services and add local commercial banking capacity. This consumes one host service-space unit.</p>';
 h+='<h4>Additional bank staff time at full capacity</h4><ul class="im-time-list">'+Object.entries(d.staffQuarters).filter(([,n])=>n).map(([r,n])=>'<li><span>'+esc(lifecycleRole(r))+'</span><b>'+esc(lifecycleStaffTime(n))+'</b></li>').join('')+'</ul><p class="im-caption">The host and suite share finite role time. The engine splits time between their services; it never duplicates a banker. They share condition and maintenance.</p>'+interfaceMarketsLink('Manage office staff time','staff',{market:o.market,office:o.id});
 if(installed&&installed.readyCycle!==null)h+='<p class="im-caption">An installed suite has no separate removal instruction in this campaign.</p>';
 else{if(old&&old!==o.id)h+=interfaceMarketsOrderWarning(v,interfaceMarketsOfficeName(v,old),o.id,'suite construction/cancellation');h+=interfaceMarketsStatus(result)+interfaceMarketsBudget(v,result.plan)+'<div class="im-actions">'+interfaceMarketsButton(installed?'Add cancellation · no refund':old&&old!==o.id?'Replace suite order':'Add suite to plan','save',{primary:true,disabled:locked||!result.eligible})+'</div>';}
 if(old)h+=interfaceMarketsButton('Remove staged suite order','clear',{disabled:locked});
 return {html:h,actions:{save:now=>make(now),clear:now=>make(now,{start:null,cancel:null})}};
}
function interfaceMarketsPremisesProposal(v,o,c,form){
 const plan=interfaceMarketsCopy(draft),policy=interfaceMarketsCopy(plan.sharedPremisesPolicy||v.me.sharedPremises.policy),room=v.me.sharedPremises.book.rooms.find(r=>r.office===o.id&&r.id===Number(c.room));
 if(c.kind){policy.build={office:o.id,kind:c.kind};policy.cancel=null;policy.remove=null;}
 if(room&&Object.keys(form.values).length){
  // Replace only this room's assignments. Other rooms may have changed since
  // these working fields were opened; never replay a stored bank-wide policy.
  const existing=policy.allocations.filter(a=>a.room===room.id),changed=E.SharedPremises.CATALOG[room.kind].roles.map(role=>{
   const quarters=Object.hasOwn(form.values,role)?interfaceMarketsNumber(form.values[role]):existing.find(a=>a.role===role)?.quarters||0;
   return {room:room.id,role,entity:['adviser','broker','operations'].includes(role)?v.me.investmentBusiness.book.entityId:v.me.agency.book.entityId,quarters};
  }).filter(a=>a.quarters);
  policy.allocations=policy.allocations.filter(a=>a.room!==room.id).concat(changed);
 }
 if(form.action==='cancel'||form.action==='remove'){
  if(!room)throw Error('Select an existing room first.');
  policy.build=null;policy.cancel=form.action==='cancel'?room.id:null;policy.remove=form.action==='remove'?room.id:null;policy.allocations=policy.allocations.filter(a=>a.room!==room.id);
 }
 if(form.action==='clear'){policy.build=null;policy.cancel=null;policy.remove=null;}
 if(form.action==='standing')Object.assign(policy,interfaceMarketsCopy(v.me.sharedPremises.policy));
 plan.sharedPremisesPolicy=policy;const review=E.sharedPremisesPlanReview(v,v.me,plan);
 if(review.policy)plan.sharedPremisesPolicy=interfaceMarketsCopy(review.policy);
 return {plan,review,eligible:review.eligible,reason:review.reason};
}
function interfaceMarketsRoom(v,o,c){
 const room=v.me.sharedPremises?.book.rooms.find(r=>r.office===o.id&&r.id===Number(c.room)),kind=room?.kind||c.kind,d=E.SharedPremises?.CATALOG[kind];
 if(!d)return {html:'<p class="im-status">Select an installed room or an available service space.</p>',actions:{}};
 const key='room:'+o.id+':'+(room?.id||kind),form=interfaceMarketsForm(v,key),open=room&&room.ready!==null&&room.ready<=v.cycle,locked=v.me.submitted||v.gameOver;
 let result;try{result=interfaceMarketsPremisesProposal(v,o,c,form);}catch(error){result={eligible:false,reason:error.message};}
 const policy=result.plan?.sharedPremisesPolicy||draft.sharedPremisesPolicy||v.me.sharedPremises.policy,review=result.review||{},standing=draft.sharedPremisesPolicy||v.me.sharedPremises.policy,old=standing.build?'Build '+E.SharedPremises.CATALOG[standing.build.kind].name+' at '+interfaceMarketsOfficeName(v,standing.build.office):standing.cancel?'Cancel room '+standing.cancel:standing.remove?'Remove room '+standing.remove:null;
 let h='<h3>'+esc(d.name)+'</h3>'+interfaceMarketsFacts([['Fit-out',lifecycleMoney(d.cost)],['Upkeep',lifecycleMoney(d.upkeep)+' / month + host maintenance'],['Construction',d.work+' work · '+d.execution+' execution'],['Service-space required',d.space],['Maximum local staff time',lifecycleStaffTime(d.seats)]]);
 if(room)h+='<p class="im-status">'+(open?'Operating':room.ready?'Opens month '+room.ready:'Construction '+room.work+'/'+d.work+' work')+'</p>';
 if(kind==='additionalPremises')h+='<p>Adds three service-space units after completion. It has no staffed service of its own and continues to incur upkeep when empty.</p>';
 else h+='<p>Compatible professional roles: <b>'+d.roles.map(role=>esc(premisesRoleNames[role])).join(' · ')+'</b>. Qualified employees remain employed by the investment business or insurance agency. Work assigned here is removed from their central pool; the room creates no employees or licences.</p>';
 if(!room&&v.me.sharedPremises&&kind!=='additionalPremises')h+=interfaceMarketsLink('Review additional premises space','room',{market:o.market,office:o.id,kind:'additionalPremises'},'Adds three service-space units after funded construction completes.');
 if(open&&d.roles.length){
  h+='<h4>Assign professional staff time</h4><div class="im-staff-table">';
  for(const role of d.roles){const entity=['adviser','broker','operations'].includes(role)?v.me.investmentBusiness.book.entityId:v.me.agency.book.entityId,tenant=review.tenants?.find(t=>t.id===entity),q=policy.allocations.find(a=>a.room===room.id&&a.role===role)?.quarters||0,elsewhere=policy.allocations.filter(a=>a.room!==room.id&&a.role===role&&a.entity===entity).reduce((n,a)=>n+a.quarters,0),value=Object.hasOwn(form.values,role)?form.values[role]:q/4;
   h+='<label class="im-staff-row"><span><b>'+esc(premisesRoleNames[role])+'</b><small>Monthly time, not headcount</small></span><input type="number" min="0" step="0.25" data-im-room-role="'+esc(role)+'" value="'+esc(value)+'"'+(locked?' disabled':'')+' aria-label="'+esc(premisesRoleNames[role])+' time in months"><small>'+(tenant?esc(lifecycleStaffTime(tenant.available[role]))+' qualified':'Qualified pool unavailable')+'<br>'+esc(lifecycleStaffTime(elsewhere))+' in other rooms</small></label>';
  }h+='</div>';
 }
 if(old&&(c.kind||form.action==='remove'||form.action==='cancel'))h+='<p class="im-status warn">Existing construction instruction: '+esc(old)+'. The action below replaces that one order; other rooms’ staffing stays in your plan.</p>';
 if(form.action==='cancel'||form.action==='remove')h+='<p class="im-status warn">'+(form.action==='cancel'?'Cancel unfinished construction.':'Remove this service space and release its assignments.')+' No refund or sale proceeds.</p>';
 h+='<div id="imQuote" aria-live="polite">'+interfaceMarketsStatus(result)+(review.quote?premisesQuoteMarkup(review):'')+(result.plan?interfaceMarketsBudget(v,result.plan):'')+'</div><div class="im-actions">';
 const changes=!!c.kind||!!form.action||open&&d.roles.length;
 if(changes)h+=interfaceMarketsButton(form.action==='cancel'?'Add cancellation · no refund':form.action==='remove'?'Add removal · no proceeds':c.kind&&old?'Replace premises order':c.kind?'Add fit-out to plan':'Update room plan','save',{primary:true,disabled:locked||!result.eligible});
 h+=interfaceMarketsButton('Discard working edits','discard');
 if(room&&room.ready===null&&form.action!=='cancel')h+=interfaceMarketsButton('Cancel unfinished fit-out','prepare-cancel',{danger:true,disabled:locked});
 if(open&&form.action!=='remove')h+=interfaceMarketsButton('Remove this service space','prepare-remove',{danger:true,disabled:locked});
 if(old)h+=interfaceMarketsButton('Remove staged premises order','clear',{disabled:locked});
 h+='</div><p class="im-caption">The host retains its existing services and condition. Bank fit-out and outside costs are real expenses; subsidiary reimbursements are internal transfers, not new group profit.</p><div class="im-actions">'+interfaceMarketsCrossLink('Investment employees','people','staff',{employer:'investment',market:o.market,office:o.id,room:room?.id})+interfaceMarketsCrossLink('Insurance employees','people','staff',{employer:'agency',market:o.market,office:o.id,room:room?.id})+interfaceMarketsCrossLink('Investment funding & permissions','group','investment',{market:o.market,office:o.id,room:room?.id})+interfaceMarketsCrossLink('Insurance funding & permissions','group','agency',{market:o.market,office:o.id,room:room?.id})+'</div>';
 const delivered=v.me.sharedPremises.book.report?.delivery?.filter(r=>r.room===room?.id)||[];
 if(delivered.length)h+='<h4>Last settled local work</h4><ul class="im-time-list">'+delivered.map(r=>'<li><span>'+esc(premisesRoleNames[r.role])+'</span><b>'+Number(r.effectiveQuarters/4).toFixed(2)+' months delivered</b></li>').join('')+'</ul>';
 return {html:h,formKey:key,actions:{save:now=>interfaceMarketsPremisesProposal(now,interfaceMarketsOffice(now,o.id),c,interfaceMarketsForm(now,key)),clear:now=>interfaceMarketsPremisesProposal(now,interfaceMarketsOffice(now,o.id),{room:c.room},{values:{},action:'clear'})},quote:()=>interfaceMarketsPremisesProposal(currentView(),o,c,form)};
}
function interfaceMarketsServices(v,o){
 const rooms=v.me.sharedPremises?.book.rooms.filter(r=>r.office===o.id)||[],suite=v.me.facilityExtensions?.offices[o.id];
 let h='<h3>Installed services &amp; expansion</h3><p>Manage each installed service or choose one improvement. These use this office’s finite space and the existing staff pools.</p><div class="im-services"><section><h4>Installed here</h4>';
 if(suite)h+=interfaceMarketsLink('Commercial banking suite','suite',{market:o.market,office:o.id},E.facilityExtensionActive(v.me,o.id)?'Operating · bank staff time':suite.readyCycle?'Opens month '+suite.readyCycle:'Construction '+suite.work+'/'+E.COMMERCIAL_SUITE.work);
 for(const r of rooms)h+=interfaceMarketsLink(E.SharedPremises.CATALOG[r.kind].name,'room',{market:o.market,office:o.id,room:r.id},r.ready===null?'Construction '+r.work+'/'+E.SharedPremises.CATALOG[r.kind].work:r.ready>v.cycle?'Opens month '+r.ready:'Operating · manage staff time');
 if(!suite&&!rooms.length)h+='<p class="muted">No additional services installed at this office.</p>';
 h+='</section><section><h4>Add service or space</h4>';
 if(v.me.facilityExtensions&&!suite)h+=interfaceMarketsLink('Commercial banking suite','suite',{market:o.market,office:o.id},lifecycleMoney(E.COMMERCIAL_SUITE.cost)+' · host compatibility checked in quote');
 if(v.me.sharedPremises){let review;try{review=E.sharedPremisesPlanReview(v,v.me,draft);}catch(error){}const host=review?.context?.offices.find(x=>x.id===o.id);if(host){const space=E.SharedPremises.space(v.me.sharedPremises.book,host,v.cycle);h+='<p class="im-status">'+Math.max(0,space.total-space.used)+' / '+space.total+' service-space units free</p>';}
  h+=Object.entries(E.SharedPremises.CATALOG).map(([kind,d])=>interfaceMarketsLink(d.name,'room',{market:o.market,office:o.id,kind},lifecycleMoney(d.cost)+' · '+d.space+' space')).join('');
 }
 return {html:h+'</section></div>'+interfaceMarketsLink('Premises network costs & standing allocations','premises',{market:o.market,office:o.id}),actions:{}};
}
function interfaceMarketsPremisesNetwork(v,c){
 if(!v.me.sharedPremises)return {html:'<p>This campaign has no shared service premises.</p>',actions:{}};
 const key='premises-network',form=interfaceMarketsForm(v,key),make=now=>{
  const plan=interfaceMarketsCopy(draft);if(form.reset)plan.sharedPremisesPolicy=interfaceMarketsCopy(now.me.sharedPremises.policy);
  const review=E.sharedPremisesPlanReview(now,now.me,plan);return {eligible:review.eligible,reason:review.reason,review,plan};
 },result=make(v),record=v.me.sharedPremises.book.report;
 let h='<h3>Premises network</h3><p>These totals cover all subsidiary service spaces. Base-office upkeep is separate. Room assignments stay attached to their installed location.</p>';
 h+=result.review.quote?premisesQuoteMarkup(result.review):interfaceMarketsStatus(result);
 if(record)h+='<h4>Last settled occupancy costs</h4>'+interfaceMarketsFacts([['Outside invoice',lifecycleMoney(record.outsideCost)],['Outside invoice paid',lifecycleMoney(record.externalPaid)],['Tenant reimbursements received',lifecycleMoney(record.received)]]);
 const notices=v.me.sharedPremises.unavailable||[];if(notices.length)h+='<h4>Last month: work not delivered</h4><ul>'+notices.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>';
 h+='<h4>Installed spaces</h4>'+v.me.sharedPremises.book.rooms.map(r=>interfaceMarketsLink(E.SharedPremises.CATALOG[r.kind].name,'room',{market:interfaceMarketsOffice(v,r.office)?.market,office:r.office,room:r.id},interfaceMarketsOfficeName(v,r.office))).join('');
 h+='<h4>Restore standing premises settings</h4><p>Removes all staged premises construction, cancellation, removal and room-time changes. Your previously active allocations remain. Already paid construction is unaffected.</p>';
 if(form.reset)h+='<p class="im-status warn">The estimate above now previews the active premises policy, replacing all staged premises changes across the bank.</p>'+interfaceMarketsButton('Reset premises plan to standing policy','save',{primary:true,disabled:!result.eligible||v.me.submitted||v.gameOver})+' '+interfaceMarketsButton('Keep current plan','discard');
 else h+=interfaceMarketsButton('Preview standing premises policy','prepare-premises-reset',{disabled:v.me.submitted||v.gameOver});
 return {html:h,formKey:key,actions:{save:make}};
}
function interfaceMarketsOfficeOverview(v,o){
 const record=v.me.facilityLifecycle?.records[o.id],m=interfaceMarketsMetric(v,o),staff=record?Object.values(record.staffQuarters).reduce((a,b)=>a+b,0):0;
 let h='<h3>'+esc(facilityUiModel(o.model))+'</h3><p>'+esc(facilityUiOfficeLabel(o))+'</p>'+interfaceMarketsFacts([['Condition',record?(record.conditionBp/100).toFixed(1)+'%':'Not tracked'],['Assigned bank staff time',record?lifecycleStaffTime(staff):'Pooled by market'],['Operating upkeep',m?lifecycleMoney(m.expense)+' / month':'Unavailable'],['Deposit capacity',m?lifecycleMoney(m.depositCapacity):'Unavailable'],['Loan capacity',m?lifecycleMoney(m.loanCapacity):'Unavailable']]);
 if(record)h+='<p class="im-caption">Age '+record.ageMonths+' months · '+(record.deferredWearBp/100).toFixed(2)+' points deferred wear. Capacity is a service limit, not attributed office profit.</p>';
 if(o.conversion||record?.renovation)h+='<p class="im-status warn">'+esc(o.conversion?'Conversion in progress':'Renovation in progress')+' · inspect that action for work and cancellation terms.</p>';
 return {html:h,actions:{}};
}
function interfaceMarketsOverview(v,market){
 const t=v.territories[market],book=v.me.marketBook?.markets[market],offices=(v.me.facilityNetwork?.offices||[]).filter(o=>o.closedCycle===null&&o.market===market),form=interfaceMarketsForm(v,'focus:'+market),focus=marketActionProposal(v,market,null);
 let h='<h3>'+esc(t.name)+'</h3>'+interfaceMarketsFacts([['Your influence',t.shares[0].toFixed(1)+'%'],['Rival influence',t.shares[1].toFixed(1)+'%'],['Operating offices · you / rival',t.branches[0]+' / '+t.branches[1]],['Your offices under construction',v.me.projects.filter(p=>v.projects[p.key]?.kind==='branch'&&p.target===market).length],['Market value',t.value],...(book?[['Your deposits',lifecycleMoney(book.deposits)],['Your loans',lifecycleMoney(book.loans)]]:[])]);
 h+=[v.me,v.rival].filter(bank=>bank.sponsorship?.market===market).map(bank=>'<div class="brand-market-sponsor">'+bankIdentityMarkup(bank,{showName:true})+brandSponsorshipBadge(bank)+'</div>').join('');
  h+='<p class="im-status">'+esc(!t.unlocked?'Opens month '+t.unlock:t.exited?.[0]?'Withdrawn. Paid re-entry is quoted when you build here.':draft.focus===market?'This is your monthly focus.':'Inspecting only. Your monthly focus remains '+v.territories[draft.focus]?.name+'.')+'</p>';
 if(draft.focus!==market)h+=interfaceMarketsButton(form.focus?'Keep current monthly focus':'Change monthly focus','prepare-focus',{disabled:v.me.submitted||v.gameOver||!t.unlocked});
 if(form.focus&&draft.focus!==market)h+='<section class="im-focus"><h4>Change monthly focus to '+esc(t.name)+'</h4><ul>'+focus.effects.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>'+interfaceMarketsStatus(focus.status)+interfaceMarketsButton('Update monthly focus','focus',{primary:true,disabled:!focus.status.eligible})+'</section>';
 h+='<h4>Your offices here</h4>'+(offices.length?offices.map(o=>interfaceMarketsLink(facilityUiModel(o.model),'office',{market,office:o.id},facilityUiOfficeLabel(o))).join(''):'<p>No identified operating offices in this market.</p>');
 const agreements=(v.serviceAgreements||[]).filter(a=>a.market===market&&!a.companyClosed),opportunities=(v.opportunities||[]).filter(a=>a.market===market);
 if(agreements.length||opportunities.length){
  h+='<h4>Local business &amp; relationship opportunities</h4>';
  h+=agreements.map(a=>interfaceMarketsCrossRow(serviceClientPresentation(v,a).name,E.SERVICE_TYPES[a.kind].name,'banking','services',{marketId:market,agreementId:a.id})).join('');
  h+=opportunities.map(a=>{const route=financeOpportunityRoute(v,a.id);return interfaceMarketsCrossRow(a.name,'Monthly '+(a.type==='loan'?'lending':'relationship')+' opportunity',route.workspace,route.view,{...route.context,marketId:market});}).join('');
 }
 h+='<div class="im-actions">'+interfaceMarketsCrossLink('Local customer campaign','strategy','campaigns',{campaignType:'advertising',market})+interfaceMarketsCrossLink('Customer relationships','banking','services',{market})+(v.projects?.acquisition?interfaceMarketsCrossLink('Acquire customer book','banking','lending',{marketId:market,objectId:'acquisition'}):'')+'</div><p class="im-caption">Influence, deposits and facility capacity measure different things. Rival details are limited to the public market view.</p>';
 return {html:h,formKey:'focus:'+market,actions:{focus:now=>{const q=marketActionProposal(now,market,null);return {eligible:q.status.eligible,reason:q.status.reason,plan:q.candidate};}}};
}
function interfaceMarketsCompare(v){
 const offices=(v.me.facilityNetwork?.offices||[]).filter(o=>o.closedCycle===null),form=interfaceMarketsForm(v,'network');
 let h='<h3>Office network</h3><div class="im-table-scroll"><table><thead><tr><th>Office</th><th>Condition</th><th>Upkeep / month</th><th>Deposit capacity</th><th>Loan capacity</th></tr></thead><tbody>'+offices.map(o=>{const m=interfaceMarketsMetric(v,o),r=v.me.facilityLifecycle?.records[o.id];return '<tr><th>'+interfaceMarketsLink(facilityUiModel(o.model),'office',{market:o.market,office:o.id},v.territories[o.market]?.name+' · '+facilityUiOfficeLabel(o))+'</th><td>'+(r?(r.conditionBp/100).toFixed(0)+'%':'—')+'</td><td>'+(m?lifecycleMoney(m.expense):'—')+'</td><td>'+(m?lifecycleMoney(m.depositCapacity):'—')+'</td><td>'+(m?lifecycleMoney(m.loanCapacity):'—')+'</td></tr>';}).join('')+'</tbody></table></div>';
 const actions={};
 if(v.me.facilityLifecycle){h+='<h4>Network staffing</h4><p>Prepare an allocation across all offices using the existing bank workforce. This does not hire employees. Inspect proposed assignments before applying them.</p><div class="im-actions">'+interfaceMarketsButton('Prepare staffing proposal','prepare-network',{disabled:v.me.submitted||v.gameOver})+interfaceMarketsButton('Prepare reset to active settings','prepare-reset',{disabled:v.me.submitted||v.gameOver})+'</div>';
  if(form.mode){try{
   const plan=interfaceMarketsCopy(draft),proposal=form.mode==='reset'?{policy:E.defaultFacilityLifecyclePlan(v.me)}:E.facilityLifecycleStaffProposal(v,v.me,plan);plan.facilityLifecyclePolicy=proposal.policy;
   const q=E.lifecycleInstructionQuote(v,v.me,plan),result={eligible:q.status.eligible,reason:q.status.reason,plan};
   h+='<h4>'+esc(form.mode==='reset'?'Reset all network instructions':'Proposed office assignments')+'</h4><div class="im-table-scroll"><table><thead><tr><th>Office</th>'+E.FacilityLifecycle.ROLES.map(role=>'<th>'+esc(lifecycleRole(role))+' time</th>').join('')+'</tr></thead><tbody>'+offices.map(o=>'<tr><th>'+esc(interfaceMarketsOfficeName(v,o.id))+'</th>'+E.FacilityLifecycle.ROLES.map(role=>'<td>'+esc(lifecycleStaffTime(proposal.policy.offices[o.id].staffQuarters[role]))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
    (form.mode==='reset'?'<p class="im-status warn">This restores all office assignments, maintenance and hub links to active settings and removes staged renovation/cancellation orders throughout the bank.</p>':'<p class="im-caption">Maintenance, hub links and existing work instructions are retained. Each row shares the same finite bank role pools.</p>')+interfaceMarketsStatus(result)+interfaceMarketsBudget(v,plan)+interfaceMarketsButton('Update network plan','network',{primary:true,disabled:!result.eligible||v.me.submitted||v.gameOver})+' '+interfaceMarketsButton('Discard proposal','discard');
   actions.network=now=>{const plan=interfaceMarketsCopy(draft),q=form.mode==='reset'?{policy:E.defaultFacilityLifecyclePlan(now.me)}:E.facilityLifecycleStaffProposal(now,now.me,plan);plan.facilityLifecyclePolicy=q.policy;const r=E.lifecycleInstructionQuote(now,now.me,plan);return {eligible:r.status.eligible,reason:r.status.reason,plan};};
  }catch(error){h+='<p class="im-status warn">'+esc(error.message)+'</p>';}}
 }
 const closed=v.me.facilityNetwork?.offices.filter(o=>o.closedCycle!==null)||[];if(closed.length)h+='<h4>Closed offices</h4><ul>'+closed.map(o=>'<li>'+esc(facilityUiModel(o.model)+' · '+v.territories[o.market]?.name+' · '+facilityUiOfficeLabel(o)+' · closed month '+o.closedCycle)+'</li>').join('')+'</ul>';
 return {html:h,actions,formKey:'network'};
}
function renderInterfaceMarkets(v,route,mount){
 if(!v||!draft||!mount)return;if(typeof mount==='string')mount=$(mount.startsWith('#')?mount:'#'+mount);if(!mount)return;
 const state=interfaceMarketsContext(v);state.revision++;
 const context={...(route?.context||{})};context.office=context.office||context.officeId;context.market=context.market||context.marketId;
 const office=interfaceMarketsOffice(v,context.office),market=office?.market||(v.territories[context.market]?context.market:v.territories[marketWorkspace.market]?marketWorkspace.market:draft.focus),view=route?.view||'overview';context.market=market;
 marketWorkspace.owner=v.me.id;marketWorkspace.campaign=presentationCampaignIdentity(v);marketWorkspace.market=market;marketWorkspace.office=office?.id||null;marketWorkspace.mode=office?'office':view==='build'?'build':view==='compare'?'compare':'overview';
 const token=interfaceMarketsToken(v),name=v.territories[market]?.name||market;
 let content;
 try{
  if(view==='compare'||view==='network')content=interfaceMarketsCompare(v);
  else if(view==='premises')content=interfaceMarketsPremisesNetwork(v,context);
  else if(['build','improve'].includes(view))content=interfaceMarketsProjectView(v,context,view);
  else if(office&&['staff','maintenance','renovate'].includes(view))content=interfaceMarketsOfficeControls(v,office,view);
  else if(office&&view==='convert')content=interfaceMarketsConversion(v,office,context);
  else if(office&&view==='suite'&&v.me.facilityExtensions)content=interfaceMarketsSuite(v,office);
  else if(office&&view==='room'&&v.me.sharedPremises)content=interfaceMarketsRoom(v,office,context);
  else if(office&&view==='services')content=interfaceMarketsServices(v,office);
  else if(office)content=interfaceMarketsOfficeOverview(v,office);
  else content=interfaceMarketsOverview(v,market);
 }catch(error){content={html:'<p class="im-status bad">This selection is unavailable: '+esc(error.message)+'</p>',actions:{}};}
 const offices=(v.me.facilityNetwork?.offices||[]).filter(o=>o.closedCycle===null&&o.market===market);
 mount.innerHTML='<div class="interface-markets"><aside class="im-directory"><div class="im-directory-heading"><h2>Markets</h2>'+interfaceMarketsButton('Compare offices','compare')+'</div>'+interfaceMarketsMap(v,market)+'<nav aria-label="Markets">'+Object.entries(v.territories).map(([key,t])=>'<button type="button" class="im-market-row" data-im-market="'+esc(key)+'" aria-pressed="'+(key===market)+'"><span><b>'+esc(t.name)+'</b><small>'+(!t.unlocked?'Opens month '+t.unlock:t.exited?.[0]?'Withdrawn':key===draft.focus?'Monthly focus':'Inspect')+'</small></span><span>'+t.branches[0]+' offices</span></button>').join('')+'</nav><h3>Your offices · '+esc(name)+'</h3>'+offices.map(o=>interfaceMarketsLink(facilityUiModel(o.model),'office',{market,office:o.id},facilityUiOfficeLabel(o))).join('')+'</aside><section class="im-inspector" aria-labelledby="imInspectorTitle"><header class="im-inspector-head"><div><span class="eyebrow">'+esc(name)+(office?' · '+esc(facilityUiOfficeLabel(office)):'')+'</span><h2 id="imInspectorTitle" tabindex="-1">'+esc(office?facilityUiModel(office.model):view==='build'?'Build an office':view==='improve'?'Improve this market':view==='compare'?'Network comparison':'Market details')+'</h2></div>'+(office||view!=='overview'?interfaceMarketsButton('Market overview','back'):'')+'</header>'+(office?interfaceMarketsTabs(interfaceMarketsOfficeTabs(v,office),['suite','room','premises'].includes(view)?'services':['staff','maintenance','renovate','convert','services'].includes(view)?view:'office',{market,office:office.id}):['overview','build','improve'].includes(view)?interfaceMarketsTabs([['Overview','overview'],['Build an office','build'],['Improve network','improve']],view,{market}):'')+(v.me.submitted||v.gameOver?'<p class="im-status">Planning is locked. You can inspect existing offices and their records.</p>':'')+content.html+'</section></div>';
 if(typeof interfaceSetLocation==='function')interfaceSetLocation(['Markets',name,...(office?[facilityUiModel(office.model)]:[]),...(view!=='overview'&&view!=='office'?[{staff:'Staff time',maintenance:'Maintenance & hubs',renovate:'Renovate',convert:'Convert',services:'Services & expansion',suite:'Commercial banking suite',room:'Service space',build:'Build an office',improve:'Improve network',compare:'Office network',network:'Office network',premises:'Premises network'}[view]||view]:[])]);
 const refresh=()=>{
  const source=document.activeElement,keys=['imAction','imModel','imPath','imValue'].filter(key=>source?.dataset?.[key]!==undefined),identity=Object.fromEntries(keys.map(key=>[key,source.dataset[key]]));
  renderInterfaceMarkets(currentView(),route,mount);
  if(keys.length){const replacement=[...mount.querySelectorAll('button')].find(button=>keys.every(key=>button.dataset[key]===identity[key]));(replacement||mount.querySelector('#imInspectorTitle'))?.focus?.();}
 },safe=()=>interfaceMarketsCurrent(token,false);
 mount.querySelectorAll('[data-im-market]').forEach(el=>el.addEventListener('click',()=>{if(safe())interfaceMarketsGo('overview',{market:el.dataset.imMarket});}));
 mount.querySelectorAll('[data-im-view]').forEach(el=>el.addEventListener('click',()=>{if(safe())interfaceMarketsGo(el.dataset.imView,JSON.parse(el.dataset.imContext));}));
 mount.querySelectorAll('[data-im-cross]').forEach(el=>el.addEventListener('click',()=>{if(safe())interfaceNavigate(JSON.parse(el.dataset.imCross),{remember:true});}));
 const reQuote=()=>{
  if(!content.quote)return;
  let result;try{result=content.quote();}catch(error){result={eligible:false,reason:error.message};}
  const q=mount.querySelector('#imQuote');if(q)q.innerHTML=interfaceMarketsStatus(result)+(result.review?.quote?(view==='room'?premisesQuoteMarkup(result.review):lifecycleQuoteMarkup(result.review,office,v.me.facilityLifecycle.records[office.id])):'')+(result.plan?interfaceMarketsBudget(currentView(),result.plan):'');
  const save=mount.querySelector('[data-im-action="save"]');if(save)save.disabled=!result.eligible||currentView().me.submitted||currentView().gameOver;
 };
 mount.querySelectorAll('[data-im-field]').forEach(el=>el.addEventListener('input',()=>{if(!interfaceMarketsCurrent(token))return;interfaceMarketsForm(currentView(),content.formKey).values[el.dataset.imField]=el.value;reQuote();}));
 mount.querySelectorAll('[data-im-room-role]').forEach(el=>el.addEventListener('input',()=>{if(!interfaceMarketsCurrent(token))return;interfaceMarketsForm(currentView(),content.formKey).values[el.dataset.imRoomRole]=el.value;reQuote();}));
 mount.querySelectorAll('[data-im-path]').forEach(el=>el.addEventListener('click',()=>{if(!interfaceMarketsCurrent(token))return;const p=JSON.parse(el.dataset.imPath);interfaceMarketsForm(currentView(),content.formKey).values[el.dataset.imPath]=p.at(-1)==='hubId'?(el.dataset.imValue||null):el.dataset.imValue;refresh();}));
 mount.querySelectorAll('[data-im-model]').forEach(el=>el.addEventListener('click',()=>{if(!safe())return;interfaceMarketsForm(currentView(),content.formKey).model=el.dataset.imModel;refresh();}));
 mount.querySelectorAll('[data-im-action]').forEach(el=>el.addEventListener('click',()=>{
  if(!safe())return;const action=el.dataset.imAction;
  if(action==='compare'){interfaceMarketsGo('compare',{market});return;}
  if(action==='back'){interfaceMarketsGo('overview',{market});return;}
  if(action==='discard'){if(content.formKey)delete interfaceMarketsState.forms[content.formKey];refresh();return;}
  if(!interfaceMarketsCurrent(token))return;
  if(['prepare-focus','prepare-cancel','prepare-remove','prepare-network','prepare-reset','prepare-premises-reset'].includes(action)){
   const form=interfaceMarketsForm(currentView(),content.formKey);
   if(action==='prepare-focus')form.focus=!form.focus;
   else if(action==='prepare-premises-reset')form.reset=true;
   else if(action==='prepare-network'||action==='prepare-reset')form.mode=action==='prepare-network'?'proposal':'reset';
   else form.action=action.slice(8);refresh();return;
  }
  const proposal=content.actions[action];if(proposal)interfaceMarketsStage(token,proposal,content.formKey);
 }));
}
