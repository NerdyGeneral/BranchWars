// Owner-only lifecycle desk. Versioned engine rules own prices, shared staff,
// authored proximity and licenses; UI only compares and stages complete plans.
let lifecycleUi={owner:null,campaign:null,cycle:null,signature:null,basePolicy:null,office:null,open:false,form:null,revision:0,notice:''};
function lifecycleMoney(n){return '$'+Math.round(Number(n)||0).toLocaleString();}
function lifecycleStaffTime(quarters){
 if(!Number.isFinite(quarters))return 'Unavailable';
 const whole=Math.floor(quarters/4),part=quarters%4*25;
 return whole?whole+' full '+(whole===1?'month':'months')+(part?' + '+part+'% of a month':''):part?part+'% of a month':'No time assigned';
}
function lifecycleCampaignIdentity(v){return typeof presentationCampaignIdentity==='function'?presentationCampaignIdentity(v):game||view;}
function lifecycleCaptureForm(v){
 if(typeof premisesCaptureForm==='function')premisesCaptureForm(v);
 if(!v?.me?.facilityLifecycle||!lifecycleUi.form||lifecycleUi.owner!==v.me.id||lifecycleUi.campaign!==lifecycleCampaignIdentity(v)||lifecycleUi.cycle!==v.cycle||lifecycleUi.signature!==JSON.stringify(draft))return;
 if(lifecycleUi.renderedOffice!==lifecycleUi.office)return;
 if($('#lifecycleStaff-service'))lifecycleUi.form=lifecycleReadForm();
}
// An office staffed below its model reference produces reduced capacity, and an
// office with an unstaffed required role produces none at all. Say so in front
// of the collapsed detail rather than inside it.
function lifecycleStarvationNotes(v,offices,measured){
  const p=v.me,notes=[];
  for(const o of offices){
    const design=p.facilityExtensions?E.facilityExtensionStaffReference(p,o):E.FacilityLifecycle.CATALOG[o.model]?.staffQuarters||{},
      record=p.facilityLifecycle.records[o.id],row=measured.find(x=>x.officeId===o.id);
    if(!record)continue;
    const short=E.FacilityLifecycle.ROLES.filter(role=>(design[role]||0)>0&&(record.staffQuarters[role]||0)<design[role]);
    if(!short.length)continue;
    const dead=E.FacilityLifecycle.ROLES.some(role=>(design[role]||0)>0&&!(record.staffQuarters[role]||0));
    const capacity=row?row.capacity:null;
    const noLoans=capacity?!(capacity.loanCapacity>0):dead;
    const noDeposits=capacity?!(capacity.depositCapacity>0):dead;
    const where=esc((v.territories[o.market]?.name||o.market)+' \u00b7 '+(E.FacilityLifecycle.CATALOG[o.model]?.name||o.model));
    const detail=short.map(role=>esc(lifecycleRole(role))+' '+Number(record.staffQuarters[role]||0)/4+'/'+Number(design[role])/4+' employee-months').join(' \u00b7 ');
    const effect=noLoans&&noDeposits?'This office is producing <b>no deposit or lending capacity</b>.'
      :noLoans?'This office is producing <b>no lending capacity</b>.'
      :noDeposits?'This office is producing <b>no deposit capacity</b>.'
      :'This office is producing reduced capacity.';
    notes.push('<li><b>'+where+'</b> \u2014 '+detail+'<br>'+effect+'</li>');
  }
  return notes;
}
function lifecycleRole(role){return E.ROLES[role]?.name||(role==='wealth'?'Wealth advisory':role);}
function lifecycleFresh(v,signature,campaign){const now=currentView();return !!(now?.me?.facilityLifecycle&&draft&&
  (game||view)===campaign&&now.me.id===v.me.id&&now.cycle===v.cycle&&draftOwner===now.me.id&&lastCycle===now.cycle&&
  !now.me.submitted&&!now.gameOver&&JSON.stringify(draft)===signature);}
function lifecycleReview(v,policy){const next=JSON.parse(JSON.stringify(draft));next.facilityLifecyclePolicy=JSON.parse(JSON.stringify(policy));return E.lifecycleInstructionQuote(v,v.me,next);}
function stageFacilityLifecycle(v,policy,signature=JSON.stringify(draft),campaign=game||view){
  if(!lifecycleFresh(v,signature,campaign)){toast('The bank, month or plan changed. Reopen the office lifecycle desk.');return false;}
  try{const now=currentView(),review=lifecycleReview(now,policy);if(!review.status.eligible)throw Error(review.status.reason);
    const next=JSON.parse(JSON.stringify(draft));next.facilityLifecyclePolicy=JSON.parse(JSON.stringify(review.policy));draft=next;
    // A clear may restore bytes already present in the draft. Reset the form
    // explicitly instead of relying on a changed serialized plan to discard it.
    lifecycleUi.form=JSON.parse(JSON.stringify(review.policy));lifecycleUi.signature=JSON.stringify(draft);lifecycleUi.cycle=now.cycle;lifecycleUi.notice='Form changes remain unsubmitted until Stage.';
    renderReady(now);renderFacilityLifecycle(now);
    $('#lifecycleStatus').textContent=policy.cancel?'Cancellation staged; already paid renovation costs are not refunded.':'Lifecycle settings staged. Cash, staff assignments and office work change only at settlement.';return true;
  }catch(error){toast(error.message);return false;}
}
function lifecycleReadForm(){
  const policy=JSON.parse(JSON.stringify(lifecycleUi.form)),id=lifecycleUi.office;
  if(!id||!policy.offices[id])return policy;
  const row=policy.offices[id];if($('#lifecycleMaintenance'))row.maintenance=$('#lifecycleMaintenance').value;
  if($('#lifecycleHub'))row.hubId=$('#lifecycleHub').value||null;
  for(const role of E.FacilityLifecycle.ROLES)if($('#lifecycleStaff-'+role))row.staffQuarters[role]=Number($('#lifecycleStaff-'+role).value)*4;
  return policy;
}
function lifecycleImpact(before,during,after){
  if(!before||!during||!after)return '<p class="small">No complete renovation comparison is available for this selection.</p>';
  const rows=[['upkeep','Office upkeep',lifecycleMoney],['maintenance','Maintenance',lifecycleMoney],
    ['depositCapacity','Deposit capacity',lifecycleMoney],['loanCapacity','Loan capacity',lifecycleMoney],
    ['serviceCapacity','Service capacity',n=>Number(n).toFixed(2)],['advisoryCapacity','Licensed advisory capacity',n=>Number(n).toFixed(2)]];
  const value=(row,key)=>['upkeep','maintenance'].includes(key)?row[key]:row.capacity[key];
  return '<div class="table-scroll" tabindex="0" style="max-width:100%;overflow:auto" aria-label="Renovation before during and after"><table class="regional-table"><thead><tr><th>Monthly office contribution</th><th>Before</th><th>During work</th><th>After activation</th></tr></thead><tbody>'+
    rows.map(([key,label,format])=>'<tr><th>'+label+'</th>'+[before,during,after].map(row=>'<td>'+format(value(row,key))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
    '<p class="micro">Potential capacity is not promised customers or revenue. Restoration does not create deposits or lending, supply staff, reset existing contracts or grant an advisory license.</p>';
}
function lifecycleQuoteMarkup(review,office,record){
  const q=review.quote;if(!q)return '<p class="bad">'+esc(review.status.reason||'The engine cannot quote these instructions.')+'</p>';
  const find=(book)=>book?.rows.find(row=>row.officeId===office?.id);
  const comparison=record?.renovation?review.renovationComparisons?.[office.id]:
    {before:find(q.beforeMetrics),during:find(q.metrics),after:find(q.afterMetrics)};
  return '<div class="credit-summary"><div><span>Network maintenance / month</span><b>'+lifecycleMoney(q.maintenance)+'</b><small>In addition to normal office upkeep '+lifecycleMoney(q.metrics.totals.upkeep)+'.</small></div>'+
    '<div><span>New renovation expense</span><b>'+lifecycleMoney(q.renovationCost)+'</b><small>'+Number(q.execution)+' shared execution unit(s) reserved by this instruction.</small></div>'+
    '<div><span>Combined lifecycle commitment</span><b>'+lifecycleMoney(q.total)+'</b><small>Shared plan and protected cash are checked by the engine.</small></div></div>'+
    '<p class="small" role="status">'+(review.status.eligible?'These settings fit the current shared plan.':esc(review.status.reason))+'</p>'+
    (office&&(record?.renovation||review.policy?.renovate||review.policy?.cancel)?lifecycleImpact(comparison?.before,comparison?.during,comparison?.after):'')+
    '<p class="micro">'+esc(q.activation)+'</p>';
}
function prepareLifecycleStaff(v,signature=JSON.stringify(draft),campaign=game||view){
  if(!lifecycleFresh(v,signature,campaign))return false;
  try{const policy=lifecycleReadForm(),candidate=JSON.parse(JSON.stringify(draft));candidate.facilityLifecyclePolicy=policy;
    const proposed=E.facilityLifecycleStaffProposal(v,v.me,candidate),next=JSON.parse(JSON.stringify(policy)),changes=[];
    if(Object.keys(proposed.policy.offices).sort().join()!==Object.keys(next.offices).sort().join())throw Error('Staffing proposal changed the identified office roster.');
    for(const id of Object.keys(next.offices)){
      const staff=proposed.policy.offices[id].staffQuarters;
      if(JSON.stringify(staff)!==JSON.stringify(next.offices[id].staffQuarters))changes.push(id);
      next.offices[id].staffQuarters=JSON.parse(JSON.stringify(staff));
    }
    const review=lifecycleReview(v,next);
    lifecycleUi.form=next;lifecycleUi.notice='Staffing proposal prepared for '+changes.length+' office'+(changes.length===1?'':'s')+'; no hiring or plan changes applied. Review the allocations, then Stage. Unused quarter-FTE: '+
      E.FacilityLifecycle.ROLES.filter(role=>E.FacilityLifecycle.staffPoolRole(v.me,role)===role).map(role=>lifecycleRole(role)+' '+Number(proposed.unused[role])).join(' · ')+
      (review.status.eligible?'':'. Staging remains blocked: '+review.status.reason);
    renderFacilityLifecycle(v);return true;
  }catch(error){toast(error.message);return false;}
}
function renderFacilityLifecycle(v){
  const mount=$('#facilityLifecyclePanel'),p=v.me,campaign=lifecycleCampaignIdentity(v),signature=JSON.stringify(draft);
  if(!p.facilityLifecycle){mount.innerHTML='';mount.classList.add('hidden');lifecycleUi={owner:null,campaign:null,cycle:null,signature:null,office:null,open:false,form:null,revision:lifecycleUi.revision+1,notice:''};return;}
  mount.classList.remove('hidden');
  if(lifecycleUi.owner!==p.id||lifecycleUi.campaign!==campaign)lifecycleUi={owner:p.id,campaign,cycle:null,signature:null,office:null,open:false,form:null,revision:lifecycleUi.revision,notice:''};
  const activePolicy=draft.facilityLifecyclePolicy||E.defaultFacilityLifecyclePlan(p);
  if(lifecycleUi.signature!==signature||lifecycleUi.cycle!==v.cycle){
   const keep=lifecycleUi.form&&lifecycleUi.cycle===v.cycle&&JSON.stringify(lifecycleUi.basePolicy)===JSON.stringify(activePolicy);
   if(!keep)lifecycleUi.form=JSON.parse(JSON.stringify(activePolicy));
   lifecycleUi.signature=signature;lifecycleUi.cycle=v.cycle;lifecycleUi.notice=keep?'Office edits retained. Review them against the updated monthly plan.':'Form changes remain unsubmitted until Stage.';
  }
  lifecycleUi.basePolicy=JSON.parse(JSON.stringify(activePolicy));
  lifecycleUi.revision++;
  const offices=p.facilityNetwork.offices.filter(o=>o.closedCycle===null),office=offices.find(o=>o.id===lifecycleUi.office)||offices[0];lifecycleUi.office=office?.id||null;
  const record=office?p.facilityLifecycle.records[office.id]:null,disabled=p.submitted||v.gameOver?' disabled':'';
  let review;try{review=lifecycleReview(v,lifecycleUi.form);}catch(error){review={status:{eligible:false,reason:error.message},quote:null};}
  const measured=review.currentMetrics?.rows||review.quote?.metrics.rows||[],pool=review.availableStaffQuarters;
  const totals=E.FacilityLifecycle.staffTotals(p,lifecycleUi.form.offices);
  const rows=offices.map(o=>{const r=p.facilityLifecycle.records[o.id],m=measured.find(x=>x.officeId===o.id),wear=p.facilityLifecycle.report?.rows.find(x=>x.officeId===o.id)?.wear;
    return '<tr><th>'+esc(E.FacilityLifecycle.CATALOG[o.model].name)+'<br><small>'+esc(o.id)+'</small></th><td>'+Number(r.conditionBp/100).toFixed(1)+'%<br><small>'+(wear===undefined?'No settled wear yet':Number(wear/100).toFixed(2)+' points wear last month')+'</small></td><td>'+(m?Math.round(m.ramp*100)+'%':'—')+'</td><td>'+(m?lifecycleMoney(m.upkeep)+' + '+lifecycleMoney(m.maintenance):'Unavailable')+'</td><td>'+ (r.renovation?'Renovating '+Number(r.renovation.work)+'/'+E.FacilityLifecycle.RULES.renovationWork:o.conversion?'Converting':'Operating')+'</td></tr>';}).join('');
  const order=office?lifecycleUi.form.offices[office.id]:null,hubIds=office?review.nearbyHubIds?.[office.id]||[]:[];
  const starved=lifecycleStarvationNotes(v,offices,measured);
  const selectedMetric=measured.find(x=>x.officeId===office?.id),design=office?{...E.FacilityLifecycle.CATALOG[office.model],staffQuarters:p.facilityExtensions?E.facilityExtensionStaffReference(p,office):E.FacilityLifecycle.CATALOG[office.model].staffQuarters}:null;
  const officeButtons=offices.map(o=>{const r=p.facilityLifecycle.records[o.id];return '<button type="button" class="object-row" data-office-inspect="'+esc(o.id)+'" aria-pressed="'+(o.id===office?.id)+'"><span><b>'+esc(v.territories[o.market]?.name||o.market)+'</b><small>'+esc(E.FacilityLifecycle.CATALOG[o.model].name)+'</small></span><span class="object-tag">'+(r.conditionBp/100).toFixed(0)+'% condition</span></button>';}).join('');
  const staffRow=role=>'<div class="office-staff-row"><label for="lifecycleStaff-'+role+'"><b>'+esc(lifecycleRole(role))+'</b><small>Monthly staff time</small></label><input type="number" id="lifecycleStaff-'+role+'" min="0" step="0.25"'+(pool?' max="'+Number(pool[E.FacilityLifecycle.staffPoolRole(p,role)])/4+'"':'')+' value="'+order.staffQuarters[role]/4+'"'+disabled+'><small class="office-time-readout"><span id="lifecycleTime-'+role+'">'+lifecycleStaffTime(order.staffQuarters[role])+'</span><br>Full-capacity reference: '+lifecycleStaffTime(design.staffQuarters[role])+'</small></div>';
  const mainRoles=office?E.FacilityLifecycle.ROLES.filter(role=>design.staffQuarters[role]>0||order.staffQuarters[role]>0):[];
  const otherRoles=office?E.FacilityLifecycle.ROLES.filter(role=>!mainRoles.includes(role)):[];
  const staffRows=mainRoles.concat(otherRoles).map(staffRow).join('');
  mount.innerHTML='<section id="facilityLifecycleDesk"><header class="office-network-only"><h3>Office condition &amp; staffing · '+integer(offices.length)+' sites</h3></header><section class="object-workspace"><div class="workbench-toolbar office-network-only"><button type="button" class="btn" id="openOfficeConstruction">Build another office</button><span class="small muted">Choose a location. Staff, maintain and improve it here.</span></div>'+
    (v.gameOver?'<p class="notice">Campaign ended. Office records remain available for inspection; lifecycle orders are locked.</p>':p.submitted?'<p class="notice">Plan submitted. You can inspect offices, but lifecycle orders are locked until the next planning month.</p>':'')+
    '<div class="object-columns"><nav class="object-directory" aria-label="Your offices">'+officeButtons+'</nav><section class="object-detail" aria-labelledby="officeDetailTitle">'+
    (office?'<div class="office-main-controls"><span class="eyebrow">'+esc(v.territories[office.market]?.name||office.market)+'</span><h3 id="officeDetailTitle" tabindex="-1">'+esc(design.name)+'</h3><div class="decision-facts"><div><small>Condition</small><b>'+(record.conditionBp/100).toFixed(1)+'%</b></div><div><small>Operating + maintenance / month</small><b>'+(selectedMetric?lifecycleMoney(selectedMetric.upkeep+selectedMetric.maintenance):'Unavailable')+'</b></div></div><p class="small muted">Age '+integer(record.ageMonths)+' months · deferred wear '+(record.deferredWearBp/100).toFixed(2)+' points · '+integer(record.renovations)+' completed renovations.</p>'+
      (lifecycleStarvationNotes(v,[office],measured).length?'<div class="notice warn"><b>Current staffing limits this office</b><ul class="small">'+lifecycleStarvationNotes(v,[office],measured).join('')+'</ul><span class="micro">The form below is a proposal. Existing staffing changes only at settlement.</span></div>':'')+
      '<h4>Staff time</h4><p class="small">'+(Number.isInteger(p.stats?.staff)?'Your bank employs '+integer(p.stats.staff)+' people. ':'')+'One full month means one employee working here all month. A 0.25 step assigns 25% of an employee’s month; it does not hire a fraction of a person.</p>'+staffRows+
      '<div class="office-controls-row"><div><h4>Maintenance</h4><input type="hidden" id="lifecycleMaintenance" value="'+order.maintenance+'"><div class="office-maintenance-options" role="group" aria-label="Maintenance">'+Object.keys(E.FacilityLifecycle.modes).map(mode=>'<button type="button" class="btn" data-maintenance-mode="'+mode+'" aria-pressed="'+(mode===order.maintenance)+'"'+disabled+'>'+({off:'Off',basic:'Basic',full:'Full'}[mode]||mode)+'</button>').join('')+'</div></div>'+
      (hubIds.length?'<label for="lifecycleHub">Nearby hub support<select id="lifecycleHub"'+disabled+'><option value="">No hub support</option>'+hubIds.map(id=>'<option value="'+esc(id)+'"'+(id===order.hubId?' selected':'')+'>'+esc(typeof facilityUiOfficeLabel==='function'?facilityUiOfficeLabel(p.facilityNetwork.offices.find(o=>o.id===id)||{id}):id)+'</option>').join('')+'</select></label>':'<input type="hidden" id="lifecycleHub" value=""><span class="micro muted">No nearby hub support available.</span>')+'</div>'+
      (selectedMetric?.licensedAdvisory===false&&design.capacity.advisoryCapacity?'<p class="notice">Advisory output unavailable: no applicable operating license. Paying upkeep or assigning staff does not grant one.</p>':'')+
      '<div class="workbench-actions"><button type="button" class="btn" id="prepareLifecycleStaff"'+disabled+'>Propose network staffing</button><button type="button" class="btn" id="previewLifecycleSettings"'+disabled+'>Review changes</button><button type="button" class="btn primary" id="stageLifecycleSettings"'+disabled+'>Stage office plan</button><button type="button" class="btn" id="clearLifecycleSettings" title="Restore all office instructions to their currently active settings. This also removes staged office changes."'+disabled+'>Reset network plan</button></div>'+
      '<p class="small" id="lifecycleStatus" role="status">'+esc(lifecycleUi.notice)+'</p><div id="lifecycleQuote" aria-live="polite">'+lifecycleQuoteMarkup(review,office,record)+'</div>'+
      '<section class="office-ledger"><h4>Renovation</h4>'+
      (record.renovation?'<p class="notice">Renovation: '+lifecycleMoney(record.renovation.cost)+' already paid · '+Number(record.renovation.work)+'/'+E.FacilityLifecycle.RULES.renovationWork+' work.</p><button type="button" class="btn danger" id="cancelLifecycleRenovation"'+disabled+'>Stage cancellation · no refund</button>':'<button type="button" class="btn" id="previewLifecycleRenovation"'+disabled+'>Preview renovation at this office</button>')+
      '<p class="small">'+(lifecycleUi.form.renovate?'Unsubmitted renovation: '+esc(lifecycleUi.form.renovate):lifecycleUi.form.cancel?'Unsubmitted cancellation: '+esc(lifecycleUi.form.cancel):'No new renovation instruction selected.')+'</p><p class="micro">A renovation restores condition only after completion. Hub links move finite capacity; they do not multiply it.</p></section></div><div class="office-capability-controls"><h3 id="officeServicesTitle" tabindex="-1">Expand &amp; services</h3>'+facilityExtensionMarkup(v,office,disabled)+(p.sharedPremises?sharedPremisesMarkup(v,office,disabled):'')+'</div>':'<p class="workbench-empty">No operating offices. Build a location to begin.</p>')+'</section></div>'+
    '<section class="office-ledger office-staff-ledger"><h4>Shared staff time</h4>'+
    (starved.length?'<p class="notice"><b>UNDERSTAFFED OFFICES</b></p><ul class="small">'+starved.join('')+'</ul>':'')+
    '<p class="micro">Monthly time available after teaching and retained servicing; shared across all offices.</p><ul>'+
    E.FacilityLifecycle.ROLES.map(role=>E.FacilityLifecycle.staffPoolRole(p,role)!==role?'<li>Wealth advisory shares the Business pool.</li>':'<li>'+esc(lifecycleRole(role))+': '+lifecycleStaffTime(totals[role])+' assigned / '+(pool?lifecycleStaffTime(Number(pool[role])):'unavailable')+' available</li>').join('')+'</ul><div class="table-scroll office-network-only"><table class="regional-table"><thead><tr><th>Office ID</th><th>Condition / wear</th><th>Ramp</th><th>Upkeep + maintenance</th><th>Work</th></tr></thead><tbody>'+rows+'</tbody></table></div></section></section></section>';
  lifecycleUi.renderedOffice=office?.id||null;
  bindFacilityLifecycle(v,office);
  bindFacilityExtension(v,office);
  if(v.me.sharedPremises)bindSharedPremises(v,office);
}
function bindFacilityLifecycle(v,office){
  const signature=JSON.stringify(draft),campaign=game||view,revision=lifecycleUi.revision;
  const construct=$('#openOfficeConstruction');
  if(construct)construct.addEventListener('click',()=>{
    if(revision!==lifecycleUi.revision||(game||view)!==campaign)return;
    if(typeof openMarketConstruction==='function')openMarketConstruction(currentView(),office?.market||inspectedMarket(currentView()));
  });
  const transport=typeof opportunityToken==='function'?opportunityToken(v):null;
  const sameView=()=>revision===lifecycleUi.revision&&(game||view)===campaign&&currentView()?.me?.id===v.me.id&&currentView()?.cycle===v.cycle&&JSON.stringify(draft)===signature&&(!transport||opportunityCurrent(transport,false));
  const fresh=()=>{if(revision===lifecycleUi.revision&&lifecycleFresh(v,signature,campaign)&&(!transport||opportunityCurrent(transport)))return true;toast('The lifecycle view or plan changed. Reopen the current desk.');return false;};
  $('#facilityLifecycleDesk').addEventListener('toggle',()=>{if(revision===lifecycleUi.revision&&(game||view)===campaign&&currentView()?.me?.id===v.me.id)lifecycleUi.open=!!$('#facilityLifecycleDesk').open;});
  if(office){
    document.querySelectorAll('[data-office-inspect]').forEach(el=>el.addEventListener('click',()=>{if(!sameView())return;inspectLifecycleOffice(el.dataset.officeInspect);}));
    const edited=()=>{
      if(!fresh())return;$('#lifecycleQuote').innerHTML='<p class="notice">Settings changed. Choose Review changes to refresh the cost and capacity comparison before staging.</p>';
      lifecycleUi.form=lifecycleReadForm();
      for(const role of E.FacilityLifecycle.ROLES){const out=$('#lifecycleTime-'+role);if(out)out.textContent=lifecycleStaffTime(lifecycleUi.form.offices[office.id].staffQuarters[role]);}
      $('#lifecycleStatus').textContent='Edited form only; no plan, staff or spending changes applied.';
    };
    for(const selector of ['#lifecycleMaintenance','#lifecycleHub',...E.FacilityLifecycle.ROLES.map(role=>'#lifecycleStaff-'+role)])$(selector).addEventListener('change',edited);
    document.querySelectorAll('[data-maintenance-mode]').forEach(button=>button.addEventListener('click',()=>{
      if(!fresh())return;$('#lifecycleMaintenance').value=button.dataset.maintenanceMode;edited();
      document.querySelectorAll('[data-maintenance-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.maintenanceMode===$('#lifecycleMaintenance').value)));
    }));
    if(office&&v.me.facilityLifecycle.records[office.id].renovation)$('#cancelLifecycleRenovation').addEventListener('click',()=>{if(!fresh())return;const policy=lifecycleReadForm();policy.renovate=null;policy.cancel=office.id;stageFacilityLifecycle(v,policy,signature,campaign);});
    else $('#previewLifecycleRenovation').addEventListener('click',()=>{if(!fresh())return;const policy=lifecycleReadForm();policy.renovate=office.id;policy.cancel=null;lifecycleUi.form=policy;lifecycleUi.notice='Renovation preview only. Review costs and disruption before Stage.';renderFacilityLifecycle(currentView());});
  }
  $('#previewLifecycleSettings')?.addEventListener('click',()=>{if(!fresh())return;lifecycleUi.form=lifecycleReadForm();lifecycleUi.notice='Preview only; your submitted plan and bank are unchanged.';renderFacilityLifecycle(currentView());});
  $('#prepareLifecycleStaff')?.addEventListener('click',()=>{if(fresh())prepareLifecycleStaff(v,signature,campaign);});
  $('#stageLifecycleSettings')?.addEventListener('click',()=>{if(fresh())stageFacilityLifecycle(v,lifecycleReadForm(),signature,campaign);});
  $('#clearLifecycleSettings')?.addEventListener('click',()=>{if(fresh())stageFacilityLifecycle(v,E.defaultFacilityLifecyclePlan(currentView().me),signature,campaign);});
}
function inspectLifecycleOffice(id){
 const v=currentView();if(!v?.me.facilityLifecycle||lifecycleUi.campaign!==lifecycleCampaignIdentity(v)||lifecycleUi.owner!==v.me.id||lifecycleUi.cycle!==v.cycle||lifecycleUi.signature!==JSON.stringify(draft)||!lifecycleUi.form?.offices[id])return false;
 lifecycleUi.form=lifecycleReadForm();lifecycleUi.office=id;lifecycleUi.open=true;renderFacilityLifecycle(v);$('#officeDetailTitle')?.focus?.({preventScroll:true});return true;
}
