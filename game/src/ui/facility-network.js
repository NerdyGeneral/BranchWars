// Owner-only Markets desk for versioned, individually identified offices.
// The engine supplies all prices, impact metrics, shared-budget and capacity rules.
let facilityNetworkSelection={owner:null,office:null,model:null,open:false};
let facilityNetworkRenderRevision=0;
function facilityUiMoney(n){const amount=Math.round(Number(n)||0);return (amount<0?'−':'')+'$'+Math.abs(amount).toLocaleString();}
function facilityUiModel(key){return {retail:'Retail branch',commercial:'Commercial office',digital:'Digital office'}[key]||E.FacilityLifecycle?.CATALOG[key]?.name||key;}
function facilityUiModels(p){return E.FacilityNetwork.models?E.FacilityNetwork.models(p):E.FacilityNetwork.MODELS;}
function facilityUiCurrent(v,signature,campaign){
  const now=currentView();
  return !!(now?.me?.facilityNetwork&&draft&&(game||view)===campaign&&now.me.id===v.me.id&&now.cycle===v.cycle&&
    draftOwner===now.me.id&&lastCycle===now.cycle&&!now.me.submitted&&!now.gameOver&&signature===JSON.stringify(draft));
}
function facilityUiReview(v,policy){
  const next=JSON.parse(JSON.stringify(draft));next.facilityPolicy=JSON.parse(JSON.stringify(policy));
  return E.facilityInstructionQuote(v,v.me,next);
}
function stageFacilityPolicy(v,policy,signature=JSON.stringify(draft),campaign=game||view){
  if(!facilityUiCurrent(v,signature,campaign)){toast('The bank, month or plan changed. Reopen the Network desk before staging.');return false;}
  try{
    const now=currentView(),next=JSON.parse(JSON.stringify(draft));next.facilityPolicy=JSON.parse(JSON.stringify(policy));
    const review=E.facilityInstructionQuote(now,now.me,next);
    if(!review.status.eligible)throw Error(review.status.reason);
    next.facilityPolicy=JSON.parse(JSON.stringify(review.policy));draft=next;
    renderReady(now);renderFacilityNetwork(now);
    $('#facilityInstructionStatus').textContent=policy.cancel?'Cancellation staged. Settled conversion costs will not be refunded.':
      policy.convert?'Conversion staged. The office changes only through normal settlement and completed work.':'Unsubmitted facility order cleared. Existing conversion work is unchanged.';
    return true;
  }catch(error){toast(error.message);return false;}
}
function facilityImpactTable(before,during,after){
  const measures=[['expense','Recurring office upkeep',facilityUiMoney],['depositCapacity','Deposit capacity',facilityUiMoney],
    ['loanCapacity','Loan capacity',facilityUiMoney],['serviceCapacity','Service capacity',n=>Number(n).toLocaleString()]];
  return '<div class="table-scroll" tabindex="0" aria-label="Office impact before during and after conversion"><table class="regional-table"><thead><tr><th>Office contribution</th><th>Before</th><th>During work</th><th>After activation</th></tr></thead><tbody>'+
    measures.filter(([key])=>[before,during,after].every(m=>Number.isFinite(m[key]))).map(([key,label,format])=>
      '<tr><th>'+label+'</th><td>'+format(before[key])+'</td><td>'+format(during[key])+'</td><td>'+format(after[key])+'</td></tr>').join('')+'</tbody></table></div>'+
    '<p class="micro">These are attributed office costs and capacity, not guaranteed customer growth or profit. Existing deposits, loans, staff and contractual obligations do not disappear during a conversion.</p>';
}
function facilitySelectionContent(v,office){
  const p=v.me,sealed=!!p.submitted||v.gameOver,disabled=sealed?' disabled':'';
  const staffingNote=p.facilityLifecycle?'<p class="micro">Capacity retains your currently assigned office staff, condition and ramp-up. A new model does not hire or reassign bankers; missing required staff can reduce capacity to zero. Review Office condition &amp; staffing before committing.</p>':'';
  if(office.conversion){
    const work=office.conversion;let comparison;
    try{const metrics=E.facilityProgressComparison(v,p,office,draft);comparison=facilityImpactTable(metrics.before,metrics.during,metrics.after);}
    catch(error){comparison='<p class="notice" role="status">Capacity comparison unavailable: '+esc(error.message)+'</p>';}
    return '<h4>CONVERSION IN PROGRESS · '+esc(facilityUiModel(office.model))+' → '+esc(facilityUiModel(work.model))+'</h4>'+
      '<p class="small">'+Number(work.work).toLocaleString()+' / '+E.FacilityNetwork.RULES.work+' work units; '+
      (work.readyCycle===null?'activates the month after the remaining work completes.':'scheduled activation month '+integer(work.readyCycle)+'.')+
      ' '+facilityUiMoney(work.cost)+' already committed; cancellation refunds $0.</p>'+comparison+staffingNote+
      '<button type="button" class="btn danger" id="stageFacilityCancel"'+disabled+'>Stage cancellation · no refund</button>'+
      '<p class="micro">Cancellation ends unfinished conversion work at settlement and retains the current model. It does not close the office or repay its sunk conversion cost.</p>';
  }
  const request={officeId:office.id,model:facilityNetworkSelection.model},policy={convert:request,cancel:null};
  let review;
  try{review=facilityUiReview(v,policy);}catch(error){review={status:{eligible:false,reason:error.message},quote:null};}
  const quote=review.quote;
  return '<h4>Convert to</h4><input type="hidden" id="facilityDestination" value="'+esc(facilityNetworkSelection.model)+'"><div class="object-action-strip" role="group" aria-label="Destination office model">'+
    facilityUiModels(p).filter(model=>model!==office.model).map(model=>'<button type="button" class="btn" data-facility-model="'+esc(model)+'" aria-pressed="'+(model===facilityNetworkSelection.model)+'"'+disabled+'>'+esc(facilityUiModel(model))+'</button>').join('')+'</div>'+
    (quote?.before&&quote?.during&&quote?.after?'<p class="small">One-time conversion expense: '+facilityUiMoney(quote.cost)+
      ' · execution capacity reserved: '+Number(quote.capacity).toLocaleString()+' · work required: '+Number(quote.work).toLocaleString()+
      ' units. '+esc(quote.activation)+'</p>'+facilityImpactTable(quote.before,quote.during,quote.after):'')+
    staffingNote+'<p class="small" role="status">'+(review.status.eligible?'This proposal fits the current combined plan. Pricing, reserves, local projects and execution will be rechecked at settlement.':esc(review.status.reason))+'</p>'+
    '<button type="button" class="btn" id="stageFacilityConversion"'+(sealed||!review.status.eligible?' disabled':'')+'>Stage office conversion</button>'+
    '<p class="micro">Selecting an office or model only compares a proposal. Stage replaces any other unsubmitted facility instruction; it never cancels an already operating project for free. Work can stall if shared execution capacity is unavailable.</p>';
}
// The canonical office id is "<bank>:office:<serial>" and means nothing to a
// player. Show the serial and the month it opened instead; the id stays the
// value of the inspect selector, which is where it is actually needed.
function facilityUiOfficeLabel(office){
 const serial=String(office.id||'').split(':office:')[1];
 return 'Office '+(serial?'#'+serial:'')+(office.openedCycle?' · opened month '+office.openedCycle:'');
}
function renderFacilityNetwork(v){
  facilityNetworkRenderRevision++;
  const mount=$('#facilityNetworkPanel'),p=v.me;
  if(!p.facilityNetwork){mount.innerHTML='';mount.classList.add('hidden');facilityNetworkSelection={owner:null,office:null,model:null,open:false};return;}
  mount.classList.remove('hidden');
  if(facilityNetworkSelection.owner!==p.id)facilityNetworkSelection={owner:p.id,office:null,model:null,open:false};
  const offices=p.facilityNetwork.offices.filter(o=>o.closedCycle===null),closed=p.facilityNetwork.offices.filter(o=>o.closedCycle!==null);
  let selected=offices.find(o=>o.id===facilityNetworkSelection.office)||offices[0];
  facilityNetworkSelection.office=selected?.id||null;
  if(selected&&(!facilityUiModels(p).includes(facilityNetworkSelection.model)||facilityNetworkSelection.model===selected.model))
    facilityNetworkSelection.model=facilityUiModels(p).find(model=>model!==selected.model);
  if(selected)facilityNetworkSelection.models={...facilityNetworkSelection.models,[selected.id]:facilityNetworkSelection.model};
  const policy=draft.facilityPolicy||E.defaultFacilityPolicy(p),hasOrder=!!(policy.convert||policy.cancel);
  const staged=policy.cancel?'Cancel conversion at '+policy.cancel+' · no refund':policy.convert?
    'Convert '+policy.convert.officeId+' to '+facilityUiModel(policy.convert.model):'No new facility order staged.';
  const rows=offices.map(o=>{
    const metrics=E.facilityOfficeMetrics(p,o,draft),work=o.conversion;
    return '<tr><th>'+esc(v.territories[o.market]?.name||o.market)+'<br><small>'+esc(facilityUiOfficeLabel(o))+'</small></th><td>'+esc(facilityUiModel(o.model))+'</td><td>'+facilityUiMoney(metrics.expense)+'/month</td>'+
      '<td>'+facilityUiMoney(metrics.depositCapacity)+'</td><td>'+facilityUiMoney(metrics.loanCapacity)+'</td><td>'+
      (work?esc(facilityUiModel(work.model))+' · '+Number(work.work).toLocaleString()+'/'+E.FacilityNetwork.RULES.work+
        (work.readyCycle===null?' work':' · activates month '+integer(work.readyCycle)):'Operating · '+integer(o.conversions)+' prior conversions')+'</td></tr>';
  }).join('');
  const contextual=typeof marketOfficeContext==='function'&&!!marketOfficeContext(v,'convert');
  mount.innerHTML='<section id="facilityNetworkDesk"><header class="office-network-only"><h3>Office network · '+integer(offices.length)+' operating · '+integer(offices.filter(o=>o.conversion).length)+' converting</h3></header>'+
    '<section class="credit-policy group-credit-policy"><p class="small">Manage identified existing offices. Conversion changes one site, not every branch in a market. No office is created by opening this desk.</p>'+
    (offices.length?(!contextual?'<div class="table-scroll" tabindex="0" aria-label="Owned office network"><table class="regional-table"><thead><tr><th>Market / office</th><th>Current model</th><th>Upkeep</th><th>Deposit capacity</th><th>Loan capacity</th><th>Progress</th></tr></thead><tbody>'+rows+'</tbody></table></div>':''):
      '<p class="notice">No operating offices. Open a site through the normal funded project workflow before considering conversion.</p>')+
    '<p class="notice" id="facilityInstructionStatus" role="status">'+esc(staged)+'</p>'+
    (hasOrder?'<button type="button" class="btn" id="clearFacilityInstruction"'+(p.submitted||v.gameOver?' disabled':'')+'>Clear unsubmitted facility order</button>':'')+
    (selected?'<input type="hidden" id="facilityOffice" value="'+esc(selected.id)+'">'+(!contextual?'<nav class="facility-office-choices" aria-label="Choose an office">'+offices.map(o=>'<button type="button" class="btn" data-facility-office="'+esc(o.id)+'" aria-pressed="'+(o.id===selected.id)+'">'+esc((v.territories[o.market]?.name||o.market)+' · '+facilityUiOfficeLabel(o)+' · '+facilityUiModel(o.model))+'</button>').join('')+'</nav>':'')+facilitySelectionContent(v,selected):'')+
    (closed.length?'<details><summary>Closed-office history · '+integer(closed.length)+'</summary><ul>'+closed.map(o=>'<li>'+esc(o.id)+' · '+esc(facilityUiModel(o.model))+' · closed month '+integer(o.closedCycle)+'</li>').join('')+'</ul></details>':'')+
    '<p class="micro">Conversions share cash and execution resources with other initiatives. The office continues to incur upkeep during work.</p></section></section>';
  bindFacilityNetwork(v,selected);
}
function bindFacilityNetwork(v,office){
  const signature=JSON.stringify(draft),campaign=game||view,revision=facilityNetworkRenderRevision;
  const freshForm=()=>{if(revision===facilityNetworkRenderRevision)return true;toast('The office comparison changed. Use the current Network desk.');return false;};
  $('#facilityNetworkDesk').addEventListener('toggle',()=>{
    if(revision===facilityNetworkRenderRevision&&(game||view)===campaign&&currentView()?.me?.id===v.me.id)
      facilityNetworkSelection.open=!!$('#facilityNetworkDesk').open;
  });
  if(draft.facilityPolicy?.convert||draft.facilityPolicy?.cancel)
    $('#clearFacilityInstruction').addEventListener('click',()=>{if(freshForm())stageFacilityPolicy(v,E.defaultFacilityPolicy(v.me),signature,campaign);});
  if(!office)return;
  const stillOwner=()=>{const now=currentView();return now&&now.me.id===v.me.id&&now.cycle===v.cycle&&(game||view)===campaign;};
  $('#facilityOffice').addEventListener('change',()=>{
    if(!freshForm()||!stillOwner())return;
    const id=$('#facilityOffice').value;if(!v.me.facilityNetwork.offices.some(o=>o.id===id&&o.closedCycle===null))return;
    facilityNetworkSelection.office=id;facilityNetworkSelection.model=facilityNetworkSelection.models?.[id]||null;facilityNetworkSelection.open=true;renderFacilityNetwork(currentView());
  });
  document.querySelectorAll('[data-facility-office]').forEach(button=>button.addEventListener('click',()=>{
    if(!freshForm()||!stillOwner())return;
    const id=button.dataset.facilityOffice;if(!v.me.facilityNetwork.offices.some(o=>o.id===id&&o.closedCycle===null))return;
    if(typeof openMarketOffice==='function')openMarketOffice(currentView(),id,currentView().me.facilityLifecycle?'staff':'convert');
  }));
  if(!office.conversion){
    $('#facilityDestination').addEventListener('change',()=>{
      if(!freshForm()||!facilityUiCurrent(v,signature,campaign))return;
      const model=$('#facilityDestination').value;if(!facilityUiModels(v.me).includes(model)||model===office.model)return;
      facilityNetworkSelection.model=model;facilityNetworkSelection.open=true;renderFacilityNetwork(currentView());
    });
    document.querySelectorAll('[data-facility-model]').forEach(button=>button.addEventListener('click',()=>{
      if(!freshForm()||!facilityUiCurrent(v,signature,campaign))return;
      const model=button.dataset.facilityModel;if(!facilityUiModels(v.me).includes(model)||model===office.model)return;
      facilityNetworkSelection.model=model;renderFacilityNetwork(currentView());
    }));
    const model=facilityNetworkSelection.model;
    $('#stageFacilityConversion').addEventListener('click',()=>{if(freshForm())stageFacilityPolicy(v,{convert:{officeId:office.id,model},cancel:null},signature,campaign);});
  }else $('#stageFacilityCancel').addEventListener('click',()=>{if(freshForm())stageFacilityPolicy(v,{convert:null,cancel:office.id},signature,campaign);});
}
