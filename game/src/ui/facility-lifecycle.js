// Owner-only lifecycle desk. Versioned engine rules own prices, shared staff,
// authored proximity and licenses; UI only compares and stages complete plans.
let lifecycleUi={owner:null,campaign:null,cycle:null,signature:null,office:null,open:false,form:null,revision:0,notice:''};
function lifecycleMoney(n){return '$'+Math.round(Number(n)||0).toLocaleString();}
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
  const row=policy.offices[id];row.maintenance=$('#lifecycleMaintenance').value;
  row.hubId=$('#lifecycleHub').value||null;
  for(const role of E.FacilityLifecycle.ROLES)row.staffQuarters[role]=Number($('#lifecycleStaff-'+role).value);
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
    (office?lifecycleImpact(comparison?.before,comparison?.during,comparison?.after):'')+
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
      E.FacilityLifecycle.ROLES.map(role=>lifecycleRole(role)+' '+Number(proposed.unused[role])).join(' · ')+
      (review.status.eligible?'':'. Staging remains blocked: '+review.status.reason);
    renderFacilityLifecycle(v);return true;
  }catch(error){toast(error.message);return false;}
}
function renderFacilityLifecycle(v){
  const mount=$('#facilityLifecyclePanel'),p=v.me,campaign=game||view,signature=JSON.stringify(draft);
  if(!p.facilityLifecycle){mount.innerHTML='';mount.classList.add('hidden');lifecycleUi={owner:null,campaign:null,cycle:null,signature:null,office:null,open:false,form:null,revision:lifecycleUi.revision+1,notice:''};return;}
  mount.classList.remove('hidden');
  if(lifecycleUi.owner!==p.id||lifecycleUi.campaign!==campaign)lifecycleUi={owner:p.id,campaign,cycle:null,signature:null,office:null,open:false,form:null,revision:lifecycleUi.revision,notice:''};
  if(lifecycleUi.signature!==signature||lifecycleUi.cycle!==v.cycle){lifecycleUi.form=JSON.parse(JSON.stringify(draft.facilityLifecyclePolicy||E.defaultFacilityLifecyclePlan(p)));lifecycleUi.signature=signature;lifecycleUi.cycle=v.cycle;lifecycleUi.notice='Form changes remain unsubmitted until Stage.';}
  lifecycleUi.revision++;
  const offices=p.facilityNetwork.offices.filter(o=>o.closedCycle===null),office=offices.find(o=>o.id===lifecycleUi.office)||offices[0];lifecycleUi.office=office?.id||null;
  const record=office?p.facilityLifecycle.records[office.id]:null,disabled=p.submitted||v.gameOver?' disabled':'';
  let review;try{review=lifecycleReview(v,lifecycleUi.form);}catch(error){review={status:{eligible:false,reason:error.message},quote:null};}
  const measured=review.currentMetrics?.rows||review.quote?.metrics.rows||[],pool=review.availableStaffQuarters;
  const totals=Object.fromEntries(E.FacilityLifecycle.ROLES.map(role=>[role,Object.values(lifecycleUi.form.offices).reduce((n,row)=>n+row.staffQuarters[role],0)]));
  const rows=offices.map(o=>{const r=p.facilityLifecycle.records[o.id],m=measured.find(x=>x.officeId===o.id),wear=p.facilityLifecycle.report?.rows.find(x=>x.officeId===o.id)?.wear;
    return '<tr><th>'+esc(E.FacilityLifecycle.CATALOG[o.model].name)+'<br><small>'+esc(o.id)+'</small></th><td>'+Number(r.conditionBp/100).toFixed(1)+'%<br><small>'+(wear===undefined?'No settled wear yet':Number(wear/100).toFixed(2)+' points wear last month')+'</small></td><td>'+(m?Math.round(m.ramp*100)+'%':'—')+'</td><td>'+(m?lifecycleMoney(m.upkeep)+' + '+lifecycleMoney(m.maintenance):'Unavailable')+'</td><td>'+ (r.renovation?'Renovating '+Number(r.renovation.work)+'/'+E.FacilityLifecycle.RULES.renovationWork:o.conversion?'Converting':'Operating')+'</td></tr>';}).join('');
  const order=office?lifecycleUi.form.offices[office.id]:null,hubIds=office?review.nearbyHubIds?.[office.id]||[]:[];
  mount.innerHTML='<details id="facilityLifecycleDesk"'+(lifecycleUi.open?' open':'')+'><summary>OFFICE CONDITION &amp; STAFFING · '+integer(offices.length)+' operating site'+(offices.length===1?'':'s')+'</summary><section class="credit-policy group-credit-policy">'+
    '<p class="small">Each location uses the same bank staff, cash and identified office record. Paid maintenance slows wear; a renovation restores condition only after its work completes.</p>'+
    (v.gameOver?'<p class="notice" role="status">Campaign ended. Office records remain available for inspection; lifecycle orders are locked.</p>':p.submitted?'<p class="notice" role="status">Plan submitted. You can inspect offices, but lifecycle orders are locked until the next planning month.</p>':'')+
    '<div class="table-scroll" tabindex="0" style="max-height:250px;max-width:100%;overflow:auto" aria-label="Office condition and operating cost"><table class="regional-table"><thead><tr><th>Office</th><th>Condition / wear</th><th>Ramp</th><th>Upkeep + maintenance</th><th>Work</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<details><summary>Shared quarter-FTE budget · four quarters = one banker</summary><p class="micro">The available pool is calculated after teaching and retained service, collections, onboarding and contract commitments. Allocations across all sites share this pool; assigning an office never creates staff.</p><ul>'+
    E.FacilityLifecycle.ROLES.map(role=>'<li>'+esc(lifecycleRole(role))+': '+totals[role]+' allocated / '+(pool?Number(pool[role]):'unavailable')+' available quarters</li>').join('')+'</ul></details>'+
    (office?'<label for="lifecycleOffice">Inspect existing office<select id="lifecycleOffice">'+offices.map(o=>'<option value="'+esc(o.id)+'"'+(o.id===office.id?' selected':'')+'>'+esc((v.territories[o.market]?.name||o.market)+' · '+E.FacilityLifecycle.CATALOG[o.model].name+' · '+o.id)+'</option>').join('')+'</select></label>'+
      '<p class="micro">Age '+integer(record.ageMonths)+' month'+(record.ageMonths===1?'':'s')+' · deferred wear '+Number(record.deferredWearBp/100).toFixed(2)+' condition points · '+integer(record.renovations)+' completed renovations.</p>'+
      '<label for="lifecycleMaintenance">Persistent maintenance mode<select id="lifecycleMaintenance"'+disabled+'>'+Object.keys(E.FacilityLifecycle.modes).map(mode=>'<option value="'+mode+'"'+(mode===order.maintenance?' selected':'')+'>'+({off:'Off · fastest wear',basic:'Basic · reduced spending',full:'Full · slowest wear'}[mode]||mode)+'</option>').join('')+'</select></label>'+
      '<div class="credit-controls">'+E.FacilityLifecycle.ROLES.map(role=>'<label for="lifecycleStaff-'+role+'">'+esc(lifecycleRole(role))+' · quarter-FTE<input type="number" id="lifecycleStaff-'+role+'" min="0" step="1"'+(pool?' max="'+Number(pool[role])+'"':'')+' value="'+order.staffQuarters[role]+'"'+disabled+'><small>Model staffing reference: '+E.FacilityLifecycle.CATALOG[office.model].staffQuarters[role]+' quarters.</small></label>').join('')+'</div>'+
      '<label for="lifecycleHub">Authored nearby hub link<select id="lifecycleHub"'+disabled+'><option value="">No hub support</option>'+hubIds.map(id=>'<option value="'+esc(id)+'"'+(id===order.hubId?' selected':'')+'>'+esc(id)+'</option>').join('')+'</select></label><p class="micro">A link moves finite service throughput from its staffed hub; it does not multiply capacity. Only eligible authored neighbors are listed.</p>'+
      (measured.find(x=>x.officeId===office.id)?.licensedAdvisory===false&&E.FacilityLifecycle.CATALOG[office.model].capacity.advisoryCapacity?'<p class="notice">Advisory output unavailable: no applicable operating license. Paying upkeep or assigning staff does not grant one.</p>':'')+
      (record.renovation?'<p class="notice">Renovation: '+lifecycleMoney(record.renovation.cost)+' already paid · '+Number(record.renovation.work)+'/'+E.FacilityLifecycle.RULES.renovationWork+' work. '+(record.renovation.readyCycle===null?'Activation follows completed work.':'Activation month '+integer(record.renovation.readyCycle)+'.')+'</p><button type="button" class="btn danger" id="cancelLifecycleRenovation"'+disabled+'>Stage cancellation · no refund</button>':'<button type="button" class="btn" id="previewLifecycleRenovation"'+disabled+'>Preview renovation at this office</button>')+
      '<p class="small">'+(lifecycleUi.form.renovate?'Unsubmitted renovation: '+esc(lifecycleUi.form.renovate):lifecycleUi.form.cancel?'Unsubmitted cancellation: '+esc(lifecycleUi.form.cancel):'No new renovation instruction selected.')+'</p>':'<p class="notice">No operating offices to staff or renovate.</p>')+
    '<button type="button" class="btn" id="previewLifecycleSettings"'+disabled+'>Preview settings</button> <button type="button" class="btn" id="prepareLifecycleStaff"'+disabled+'>Prepare staffing proposal</button> '+
    '<button type="button" class="btn" id="stageLifecycleSettings"'+disabled+'>Stage settings and renovation order</button> <button type="button" class="btn" id="clearLifecycleSettings"'+disabled+'>Discard unsubmitted lifecycle changes</button>'+
    '<p class="small" id="lifecycleStatus" role="status">'+esc(lifecycleUi.notice)+'</p><div id="lifecycleQuote" aria-live="polite">'+lifecycleQuoteMarkup(review,office,record)+'</div></section></details>';
  bindFacilityLifecycle(v,office);
}
function bindFacilityLifecycle(v,office){
  const signature=JSON.stringify(draft),campaign=game||view,revision=lifecycleUi.revision;
  const sameView=()=>revision===lifecycleUi.revision&&(game||view)===campaign&&currentView()?.me?.id===v.me.id&&currentView()?.cycle===v.cycle&&JSON.stringify(draft)===signature;
  const fresh=()=>{if(revision===lifecycleUi.revision&&lifecycleFresh(v,signature,campaign))return true;toast('The lifecycle view or plan changed. Reopen the current desk.');return false;};
  $('#facilityLifecycleDesk').addEventListener('toggle',()=>{if(revision===lifecycleUi.revision&&(game||view)===campaign&&currentView()?.me?.id===v.me.id)lifecycleUi.open=!!$('#facilityLifecycleDesk').open;});
  if(office){
    $('#lifecycleOffice').addEventListener('change',()=>{if(!sameView())return;const id=$('#lifecycleOffice').value;if(!lifecycleUi.form.offices[id])return;lifecycleUi.form=lifecycleReadForm();lifecycleUi.office=id;lifecycleUi.open=true;renderFacilityLifecycle(currentView());});
    for(const selector of ['#lifecycleMaintenance','#lifecycleHub',...E.FacilityLifecycle.ROLES.map(role=>'#lifecycleStaff-'+role)])$(selector).addEventListener('change',()=>{
      if(!fresh())return;$('#lifecycleQuote').innerHTML='<p class="notice">Settings changed. Choose Preview settings to refresh the cost and capacity comparison before staging.</p>';
      $('#lifecycleStatus').textContent='Edited form only; no plan, staff or spending changes applied.';
    });
    if(office&&v.me.facilityLifecycle.records[office.id].renovation)$('#cancelLifecycleRenovation').addEventListener('click',()=>{if(!fresh())return;const policy=lifecycleReadForm();policy.renovate=null;policy.cancel=office.id;stageFacilityLifecycle(v,policy,signature,campaign);});
    else $('#previewLifecycleRenovation').addEventListener('click',()=>{if(!fresh())return;const policy=lifecycleReadForm();policy.renovate=office.id;policy.cancel=null;lifecycleUi.form=policy;lifecycleUi.notice='Renovation preview only. Review costs and disruption before Stage.';renderFacilityLifecycle(currentView());});
  }
  $('#previewLifecycleSettings').addEventListener('click',()=>{if(!fresh())return;lifecycleUi.form=lifecycleReadForm();lifecycleUi.notice='Preview only; your submitted plan and bank are unchanged.';renderFacilityLifecycle(currentView());});
  $('#prepareLifecycleStaff').addEventListener('click',()=>{if(fresh())prepareLifecycleStaff(v,signature,campaign);});
  $('#stageLifecycleSettings').addEventListener('click',()=>{if(fresh())stageFacilityLifecycle(v,lifecycleReadForm(),signature,campaign);});
  $('#clearLifecycleSettings').addEventListener('click',()=>{if(fresh())stageFacilityLifecycle(v,E.defaultFacilityLifecyclePlan(currentView().me),signature,campaign);});
}
