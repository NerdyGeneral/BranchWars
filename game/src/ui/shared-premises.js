// One office, one extension editor. All money/time quotes come from the engine.
let premisesUi={campaign:null,owner:null,cycle:null,signature:null,basePolicy:null,attempt:null,office:null,selection:null,selections:{},form:null,inputs:{},reviewed:null,error:'',revision:0};
const premisesRoleNames={adviser:'Investment adviser',broker:'Brokerage representative',operations:'Investment operations',propertyProducer:'Property insurance producer',benefitsProducer:'Benefits insurance producer',servicing:'Insurance servicing'};
function premisesUiPolicy(v){return JSON.parse(JSON.stringify(draft.sharedPremisesPolicy||v.me.sharedPremises.policy));}
function premisesUiReview(v,policy){const candidate=JSON.parse(JSON.stringify(draft));candidate.sharedPremisesPolicy=JSON.parse(JSON.stringify(policy));return E.sharedPremisesPlanReview(v,v.me,candidate);}
function premisesContextCurrent(v){return !!(v?.me.sharedPremises&&premisesUi.campaign===presentationCampaignIdentity(v)&&premisesUi.owner===v.me.id&&premisesUi.cycle===v.cycle&&premisesUi.attempt===connectionAttempt);}
// Keep valid working allocations and raw unfinished input local to this editor.
// Capturing is not reviewing or staging; a changed amount still needs a quote.
function premisesCaptureForm(v=currentView()){
 if(!premisesContextCurrent(v)||premisesUi.signature!==JSON.stringify(draft)||!premisesUi.selection?.startsWith('room:'))return false;
 const id=Number(premisesUi.selection.slice(5)),room=v.me.sharedPremises.book.rooms.find(r=>r.id===id);
 if(!room||room.ready===null||room.ready>v.cycle)return false;
 const values={};for(const role of E.SharedPremises.CATALOG[room.kind].roles){const input=$('#premisesRole-'+role);if(input)values[role]=input.value;}
 premisesUi.inputs[id]={...premisesUi.inputs[id],...values};
 try{premisesUi.form=premisesUiRead(v);premisesUi.error='';return true;}catch(error){premisesUi.error=error.message;return false;}
}
function premisesUiRead(v){
 const policy=JSON.parse(JSON.stringify(premisesUi.form));
 if(!premisesUi.selection?.startsWith('room:'))return policy;
 const id=Number(premisesUi.selection.slice(5)),room=v.me.sharedPremises.book.rooms.find(r=>r.id===id);
 if(!room||room.ready===null||room.ready>v.cycle||policy.remove===id)return policy;
 policy.allocations=policy.allocations.filter(a=>a.room!==id);
 for(const role of E.SharedPremises.CATALOG[room.kind].roles){
  const input=$('#premisesRole-'+role),n=Number(input?.value);
  if(!input||!input.value.trim()||!Number.isSafeInteger(n*4)||n<0)throw Error('Enter non-negative employee-months in 0.25 steps.');
  if(n)policy.allocations.push({room:id,role,entity:['adviser','broker','operations'].includes(role)?v.me.investmentBusiness.book.entityId:v.me.agency.book.entityId,quarters:n*4});
 }
 return policy;
}
function premisesQuoteMarkup(review){
 if(!review.quote)return '<p class="notice bad" role="status">'+esc(review.reason)+'</p>';
 const b=review.budget;
 return '<div class="decision-facts"><div><small>Fit-out paid this month</small><b>'+lifecycleMoney(b.construction)+'</b></div><div><small>Network premises costs this month</small><b>'+lifecycleMoney(b.outsideCost)+'</b></div><div><small>Tenant reimbursements due</small><b>'+lifecycleMoney(b.tenantInvoices)+'</b></div><div><small>Bank cash available for premises</small><b>'+lifecycleMoney(b.cashAvailable)+'</b></div><div><small>Execution reserved / available</small><b>'+b.executionCommitted+' / '+b.executionAvailable+'</b></div><div><small>Unpaid outside invoices</small><b>'+lifecycleMoney(b.unpaidOutside)+'</b></div></div>'+
  '<p class="small">These costs cover all service rooms, not base-office upkeep. The bank funds fit-out and the outside invoice; occupying subsidiaries reimburse their actual share. Empty rooms remain the bank’s expense. Internal rent is not new group profit.</p>'+
  '<p class="micro">Planning estimate after proposed payroll, qualifications and commitments. New rooms open after completed work; future rent is shown with their design. Current condition and staged maintenance are used. Rival actions, events, funding changes and unfinished construction can change delivery.</p>'+
  review.tenants.map(t=>'<p class="small"><b>'+esc(t.name)+'</b> · '+lifecycleMoney(t.invoice)+' rent due · '+lifecycleMoney(t.cash)+' estimated operating cash after proposed staffing costs and contributions.</p>').join('')+
  review.notices.map(n=>'<p class="notice warn">'+esc(n)+'</p>').join('');
}
function sharedPremisesMarkup(v,office,disabled){
 if(!v.me.sharedPremises||!office)return '';
 const signature=JSON.stringify(draft),campaign=presentationCampaignIdentity(v),policy=premisesUiPolicy(v),basePolicy=JSON.stringify(policy),same=premisesContextCurrent(v);
 if(!same||premisesUi.basePolicy!==basePolicy){
  const selections=same?{...premisesUi.selections}:{};
  for(const [id,selection]of Object.entries(selections))if(selection.startsWith('kind:'))delete selections[id];
  if(policy.build)selections[policy.build.office]='kind:'+policy.build.kind;
  premisesUi={campaign,owner:v.me.id,cycle:v.cycle,signature,basePolicy,attempt:connectionAttempt,office:office.id,selection:selections[office.id]||null,selections,form:policy,inputs:{},reviewed:null,error:'',revision:premisesUi.revision+1};
 }
 if(premisesUi.office!==office.id){premisesUi.office=office.id;premisesUi.selection=premisesUi.selections[office.id]||null;premisesUi.error='';}
 premisesUi.signature=signature;
 premisesUi.revision++;
 const rooms=v.me.sharedPremises.book.rooms.filter(r=>r.office===office.id),review=premisesUiReview(v,premisesUi.form),staged=draft.sharedPremisesPolicy||v.me.sharedPremises.policy;
 premisesUi.reviewed=JSON.stringify(premisesUi.form);
 const host=review.context?.offices.find(o=>o.id===office.id),space=host?E.SharedPremises.space(v.me.sharedPremises.book,host,v.cycle):null;
 const location=id=>{const o=v.me.facilityNetwork.offices.find(x=>x.id===id);return o?(v.territories[o.market]?.name||o.market):'Unknown office';};
 const stagedText=staged.build?'Fit-out staged: '+E.SharedPremises.CATALOG[staged.build.kind]?.name+' at '+location(staged.build.office):staged.cancel?'Cancellation staged for room '+staged.cancel:staged.remove?'Removal staged for room '+staged.remove:'No construction instruction staged.';
 const choices=rooms.map(r=>'<button type="button" class="object-row" data-premises-choice="room:'+r.id+'" aria-pressed="'+(premisesUi.selection==='room:'+r.id)+'"><span><b>'+esc(E.SharedPremises.CATALOG[r.kind].name)+'</b><small>'+(r.ready===null?'Under construction · '+r.work+'/'+E.SharedPremises.CATALOG[r.kind].work+' work':r.ready>v.cycle?'Opens month '+r.ready:'Open · '+lifecycleStaffTime(premisesUi.form.allocations.filter(a=>a.room===r.id).reduce((n,a)=>n+a.quarters,0))+' in editor')+'</small></span></button>').join('');
 const catalog=Object.entries(E.SharedPremises.CATALOG).map(([key,d])=>'<button type="button" class="object-row" data-premises-choice="kind:'+key+'" aria-pressed="'+(premisesUi.selection==='kind:'+key)+'"'+disabled+'><span><b>'+esc(d.name)+'</b><small>'+lifecycleMoney(d.cost)+' fit-out · '+d.space+' space</small></span><span>Review</span></button>').join('');
 let editor='';
 if(premisesUi.selection?.startsWith('kind:')){
  const key=premisesUi.selection.slice(5),d=E.SharedPremises.CATALOG[key];
  if(d)editor='<h4 id="premisesEditorTitle" tabindex="-1">'+esc(d.name)+'</h4><div class="decision-facts"><div><small>Fit-out</small><b>'+lifecycleMoney(d.cost)+'</b></div><div><small>After opening / month</small><b>'+lifecycleMoney(d.upkeep)+' + 0–12% maintenance</b></div><div><small>Minimum build time</small><b>'+d.work+' month'+(d.work===1?'':'s')+' · '+d.execution+' execution</b></div><div><small>Local professional time</small><b>'+lifecycleStaffTime(d.seats)+'</b></div></div><p class="small">'+(key==='additionalPremises'?'Adds three service-space units after construction. It does not add employees or customer capacity by itself.':d.roles.map(role=>esc(premisesRoleNames[role])).join(' · ')+'. Assign qualified subsidiary employees after opening. Local work is taken from their existing central capacity.')+'</p><p class="small">The host retains its existing services, condition and maintenance. This is not a conversion or a new legal entity.</p>';
 }else if(premisesUi.selection?.startsWith('room:')){
  const room=rooms.find(r=>r.id===Number(premisesUi.selection.slice(5)));
  if(room){const d=E.SharedPremises.CATALOG[room.kind],open=room.ready!==null&&room.ready<=v.cycle;
   editor='<h4 id="premisesEditorTitle" tabindex="-1">'+esc(d.name)+'</h4><p class="small">'+(open?'Assign time from the business’s existing qualified employees. Enter months of work: 1 means one full month; 0.25 means 25% of a month. These allocations do not create employees.':'Fit-out '+room.work+'/'+d.work+' work. Paid construction is not refunded; staffing becomes available after opening.')+'</p>';
   if(open)editor+=d.roles.map(role=>{const entity=['adviser','broker','operations'].includes(role)?v.me.investmentBusiness.book.entityId:v.me.agency.book.entityId,
    time=premisesUi.form.allocations.find(a=>a.room===room.id&&a.role===role)?.quarters||0,tenant=review.tenants?.find(t=>t.id===entity),elsewhere=premisesUi.form.allocations.filter(a=>a.room!==room.id&&a.role===role&&a.entity===entity).reduce((n,a)=>n+a.quarters,0);
    const input=premisesUi.inputs[room.id]?.[role]??String(time/4);
    return '<div class="office-staff-row"><label for="premisesRole-'+role+'"><b>'+esc(premisesRoleNames[role])+'</b><small>'+esc(entity===v.me.agency.book.entityId?'Insurance agency':'Investment business')+' · staff time (months)</small></label><input type="number" id="premisesRole-'+role+'" min="0" step="0.25" value="'+esc(input)+'"'+disabled+'><small>'+(tenant?lifecycleStaffTime(tenant.available[role]):'Unavailable')+' qualified<br>'+lifecycleStaffTime(elsewhere)+' reserved at other rooms</small></div>';}).join('');
   editor+='<div class="workbench-actions">'+(room.ready===null?'<button type="button" class="btn danger" data-premises-action="cancel"'+disabled+'>Review cancellation · no refund</button>':open?'<button type="button" class="btn danger" data-premises-action="remove"'+disabled+'>Review removing this space</button>':'')+'</div>';
  }
 }
 const changed=JSON.stringify(staged)!==JSON.stringify(v.me.sharedPremises.policy);
 return '<section class="office-ledger" id="sharedPremisesDesk" aria-labelledby="sharedPremisesTitle"><h3 id="sharedPremisesTitle">Shared service rooms</h3><p class="small">'+rooms.length+' at this office'+(space?' · '+Math.max(0,space.total-space.used)+' / '+space.total+' space free':'')+'. Host investment and insurance services here without replacing the bank office.</p><p id="premisesNotice" tabindex="-1" class="notice" role="status">'+esc(stagedText)+' '+(changed?'There are staged premises changes.':'Standing allocations are unchanged.')+'</p>'+(choices?'<section aria-label="Existing service rooms"><h4>Existing rooms</h4>'+choices+'</section>':'')+'<section aria-label="Available service spaces"><h4>Add service space</h4><p class="micro">Choose a space to review its costs and staffing needs.</p>'+catalog+'</section>'+
  (editor?'<section class="object-detail">'+editor+(premisesUi.error?'<p class="notice bad" role="status">'+esc(premisesUi.error)+'</p>':'')+(premisesUi.form.cancel?'<p class="notice warn">Reviewing cancellation of room '+premisesUi.form.cancel+'. No fit-out refund.</p>':premisesUi.form.remove?'<p class="notice warn">Reviewing removal of room '+premisesUi.form.remove+'. Its local assignments will end. No sale proceeds or refund.</p>':'')+premisesQuoteMarkup(review)+'<div class="workbench-actions"><button type="button" class="btn" data-premises-action="review"'+disabled+'>Refresh estimate</button><button type="button" class="btn primary" data-premises-action="stage"'+(disabled||!review.eligible?' disabled':'')+'>Stage premises changes</button><button type="button" class="btn" data-premises-action="discard">Discard editor changes</button></div><p class="micro">Stage changes only your draft. Nothing is paid or assigned until the month resolves. One new shared fit-out, cancellation or removal instruction per month; selecting another replaces that pending instruction.</p></section>':'')+
  '<div class="workbench-actions"><button type="button" class="btn" data-premises-action="agency">Agency staffing &amp; funding</button><button type="button" class="btn" data-premises-action="investments">Investment staffing &amp; funding</button></div>'+
  (changed?'<button type="button" class="btn" data-premises-action="reset"'+disabled+'>Reset premises draft to standing policy</button>':'')+
  (v.me.sharedPremises.unavailable.length?'<details><summary>Last month: work not delivered</summary>'+v.me.sharedPremises.unavailable.map(n=>'<p class="notice warn">'+esc(n)+'</p>').join('')+'<p class="small">Inspect the affected room to reduce assignments. Staffing, qualifications and operating cash are managed by the employing subsidiary.</p></details>':'')+
  (v.me.sharedPremises.book.report?'<details><summary>Last settled network occupancy</summary><p class="small">Outside costs '+lifecycleMoney(v.me.sharedPremises.book.report.outsideCost)+' · paid '+lifecycleMoney(v.me.sharedPremises.book.report.externalPaid)+' · tenant rent actually received '+lifecycleMoney(v.me.sharedPremises.book.report.received)+'. These are recorded results, not this draft’s estimate.</p></details>':'')+'</section>';
}
function bindSharedPremises(v,office){
 if(!v.me.sharedPremises||!office)return;
 const mount=$('#sharedPremisesDesk'),revision=premisesUi.revision,signature=JSON.stringify(draft),campaign=game||view,attempt=connectionAttempt,
  token=typeof opportunityToken==='function'?opportunityToken(v):null;
 const sameView=()=>revision===premisesUi.revision&&connectionAttempt===attempt&&(game||view)===campaign&&currentView()?.me?.id===v.me.id&&currentView()?.cycle===v.cycle&&JSON.stringify(draft)===signature&&(!token||opportunityCurrent(token,false));
 const fresh=()=>sameView()&&lifecycleFresh(v,signature,campaign)&&(!token||opportunityCurrent(token));
 const redraw=()=>{lifecycleUi.form=lifecycleReadForm();lifecycleUi.signature=JSON.stringify(draft);renderReady(currentView());renderFacilityLifecycle(currentView());$('#premisesEditorTitle')?.focus?.({preventScroll:true});};
 mount.addEventListener('input',event=>{if(event.target.id?.startsWith('premisesRole-')&&sameView())premisesCaptureForm(currentView());});
 mount.addEventListener('click',event=>{
  const button=event.target.closest?.('button')||event.target,choice=button.dataset?.premisesChoice,action=button.dataset?.premisesAction;
  if(!choice&&!action)return;
  const readOnlyChoice=choice?.startsWith('room:')||['discard','agency','investments'].includes(action);
  if(!(readOnlyChoice?sameView():fresh())){toast('The office, connection or plan changed, or editing is locked. Reopen the current office.');return;}
  try{
   const current=currentView(),read=action==='discard'||action==='reset'?premisesUi.form:premisesUiRead(current),unreviewed=JSON.stringify(read)!==premisesUi.reviewed;
   premisesUi.form=read;premisesUi.error='';
   if(action==='agency'||action==='investments'){premisesCaptureForm(current);rememberBankingContext(current);setWorkspaceTab('group');setFinancialGroupDesk(action,{focus:true});return;}
   if(action==='stage'&&unreviewed){redraw();toast('Estimate refreshed for your staffing edits. Review the costs, then choose Stage premises changes.');return;}
   if(choice){premisesCaptureForm(current);premisesUi.selection=choice;premisesUi.selections[office.id]=choice;if(choice.startsWith('kind:')){const key=choice.slice(5);if(!E.SharedPremises.CATALOG[key])throw Error('Unknown service extension.');premisesUi.form={...premisesUi.form,build:{office:office.id,kind:key},cancel:null,remove:null};}}
   if(action==='discard'){premisesUi.form=premisesUiPolicy(current);premisesUi.selection=null;premisesUi.selections[office.id]=null;premisesUi.inputs={};}
   if(action==='cancel'||action==='remove'){
    const id=Number(premisesUi.selection?.slice(5));if(!premisesUi.selection?.startsWith('room:'))throw Error('Inspect the space first.');
    premisesUi.form={...premisesUi.form,build:null,cancel:action==='cancel'?id:null,remove:action==='remove'?id:null,allocations:premisesUi.form.allocations.filter(a=>a.room!==id)};
   }
   if(action==='stage'||action==='reset'){
    const policy=action==='reset'?JSON.parse(JSON.stringify(current.me.sharedPremises.policy)):premisesUi.form,review=premisesUiReview(current,policy);
    if(!review.eligible)throw Error(review.reason);
    const officeForm=lifecycleReadForm();draft={...draft,sharedPremisesPolicy:JSON.parse(JSON.stringify(review.policy))};
    lifecycleUi.form=officeForm;lifecycleUi.signature=JSON.stringify(draft);premisesUi.signature=JSON.stringify(draft);premisesUi.basePolicy=JSON.stringify(review.policy);premisesUi.form=JSON.parse(JSON.stringify(review.policy));premisesUi.inputs={};
    renderReady(current);renderFacilityLifecycle(current);$('#premisesNotice')?.focus?.({preventScroll:true});toast('Premises draft updated. Unstaged bank-office staffing edits remain separate; nothing is paid until resolution.');return;
   }
   redraw();
  }catch(error){toast(error.message);}
 });
}
