// Presentation-only workforce navigation and instruction previews. These objects
// stay out of saves and multiplayer payloads; settlement remains in the engine.
let peopleWorkspaceState={owner:null,campaign:null,desk:'overview'};
let workforceFormState=null;
const PEOPLE_DESKS={overview:'Overview',coverage:'Work coverage',recruitment:'Recruitment',development:'Development',leadership:'Leadership & budgets'};
function resetPeopleWorkspace(v){
 if(peopleWorkspaceState.owner!==v.me.id||peopleWorkspaceState.campaign!==(game||view))peopleWorkspaceState={owner:v.me.id,campaign:game||view,desk:'overview'};
 workforceFormState=null;
}
function peopleDesks(v){return Object.keys(PEOPLE_DESKS).filter(key=>key!=='coverage'||v.me.departmentFunctions).filter(key=>key!=='leadership'||v.me.departmentOffice);}
function workforceEditToken(v){return {campaign:game||view,owner:v.me.id,cycle:v.cycle,stamp:JSON.stringify(draft),connection:featureConnectionGeneration,link:linkSession,repository:gh,lan};}
function workforceEditCurrent(token){
 const v=currentView();return !!(token&&v?.me.workforce&&draft&&draftOwner===v.me.id&&lastCycle===v.cycle&&!v.me.submitted&&!v.gameOver&&!(gh.active&&gh.paused)&&
 token.campaign===(game||view)&&token.owner===v.me.id&&token.cycle===v.cycle&&token.stamp===JSON.stringify(draft)&&token.connection===featureConnectionGeneration&&token.link===linkSession&&token.repository===gh&&token.lan===lan);
}
function setPeopleDesk(key,{focus=false}={}){
 const v=currentView();if(!v?.me.workforce)return;
 const keys=peopleDesks(v);peopleWorkspaceState={owner:v.me.id,campaign:game||view,desk:keys.includes(key)?key:'overview'};
 if(v.me.departmentFunctions){
  // Initialize owner/session identity before choosing the new desk.
  departmentFunctionsIdentity();
  if(departmentFunctionsLive.owner!==v.me.id)renderDepartments(v);
  if(['coverage','leadership'].includes(peopleWorkspaceState.desk)){departmentFunctionsLive.tab=key==='coverage'?'functions':'leadership';renderDepartments(v);}
 }
 if(key==='leadership')departmentUiState.open=true;
 if(workspaceTab!=='workforce')setWorkspaceTab('workforce');else renderWorkforce(v);
 if(focus)$('#people-tab-'+peopleWorkspaceState.desk)?.focus();
}
function renderPeopleWorkspace(v){
 const nav=$('#peopleNavigation'),mount=$('#peopleWorkspace');if(!nav||!mount||!v.me.workforce)return;
 const keys=peopleDesks(v);
 if(peopleWorkspaceState.owner!==v.me.id||!keys.includes(peopleWorkspaceState.desk))peopleWorkspaceState={owner:v.me.id,campaign:game||view,desk:'overview'};
 const desk=peopleWorkspaceState.desk;
 mount.dataset.peopleDesk=desk;
 nav.innerHTML='<div role="tablist" aria-label="People and Operations desks" class="people-tabs">'+keys.map(key=>'<button type="button" id="people-tab-'+key+'" class="btn" role="tab" aria-selected="'+(key===desk)+'" tabindex="'+(key===desk?'0':'-1')+'" data-people-tab="'+key+'">'+PEOPLE_DESKS[key]+'</button>').join('')+'</div><p class="micro">One shared monthly plan. Changing desks never submits orders. Training and leadership forms require explicit staging.</p>';
 $('#peopleOverview').hidden=desk!=='overview';$('#peopleRecruitment').hidden=desk!=='recruitment';$('#workforcePanel').hidden=desk!=='development';$('#departmentPanel').hidden=!['coverage','leadership'].includes(desk);
 const panels={overview:'peopleOverview',recruitment:'peopleRecruitment',development:'workforcePanel',coverage:'departmentPanel',leadership:'departmentPanel'};
 for(const key of keys){$('#people-tab-'+key)?.setAttribute?.('aria-controls',panels[key]);const panel=$('#'+panels[key]);panel?.setAttribute?.('role','tabpanel');if(key===desk)panel?.setAttribute?.('aria-labelledby','people-tab-'+key);}
 const identity=game||view,owner=v.me.id,cycle=v.cycle;
 const current=()=>{const now=currentView();return (game||view)===identity&&now?.me.id===owner&&now?.cycle===cycle;};
 for(const key of keys){const button=$('#people-tab-'+key);button.addEventListener('click',()=>{if(current())setPeopleDesk(key,{focus:true});});button.addEventListener('keydown',event=>{
  if(!current())return;let target,index=keys.indexOf(key);
  if(['ArrowRight','ArrowDown'].includes(event.key))target=keys[(index+1)%keys.length];else if(['ArrowLeft','ArrowUp'].includes(event.key))target=keys[(index+keys.length-1)%keys.length];else if(event.key==='Home')target=keys[0];else if(event.key==='End')target=keys.at(-1);else return;
  event.preventDefault();setPeopleDesk(target,{focus:true});
 });}
 if(desk==='leadership'&&$('#departmentDesk'))$('#departmentDesk').open=true;
 if(desk==='recruitment')renderPeopleRecruitment(v);
}
function recruitmentOption(v,role,step){
 const next=JSON.parse(JSON.stringify(draft));
 if(role==='generalist')next.hires=(next.hires||0)+step;
 else{if(!E.SPECIALIST_ROLES[role])throw Error('Unknown specialist role.');next.specialistHires={...E.emptySpecialistOrders(),...next.specialistHires};next.specialistHires[role]+=step;}
 E.normalizeWorkforcePlan(v.me,next);
 const before=E.planBudget(v.me,draft),after=E.planBudget(v.me,next);
 return {next,before,after,extraSigning:after.recruiting-before.recruiting,reason:step>0&&after.remaining<0?'The combined plan exceeds cash or capital limits.':''};
}
function stagePeopleHire(role,step,token){
 if(!workforceEditCurrent(token)){toast('The plan or connection changed, or orders are locked. Review recruitment again.');return false;}
 const v=currentView();let next;
 try{if(![-1,1].includes(step))throw Error('Choose one recruit at a time.');const option=recruitmentOption(v,role,step);if(option.reason)throw Error(option.reason);next=option.next;
 }catch(error){toast(error.message);return false;}
 draft=next;
 try{renderProjects(v);renderReady(v);$('#people-hire-'+role+'-'+(step>0?'more':'less'))?.focus();}catch(error){toast('Recruitment was staged, but the screen could not refresh: '+error.message);}
 return true;
}
function renderPeopleRecruitment(v){
 const mount=$('#peopleRecruitment');if(!mount||!v.me.workforce)return;
 const token=workforceEditToken(v),locked=!workforceEditCurrent(token),cash=n=>'$'+Math.round(n).toLocaleString('en-US');
 let quote;try{quote=E.planBudget(v.me,draft);}catch(error){mount.innerHTML='<p class="bad">Recruitment quote unavailable: '+esc(error.message)+'</p>';return;}
 const cards=['generalist',...Object.keys(E.SPECIALIST_ROLES)].map(role=>{
  const definition=E.SPECIALIST_ROLES[role],name=definition?.name||'Generalist bankers',count=role==='generalist'?(draft.hires||0):(draft.specialistHires?.[role]||0);
  let plus,reason='';try{plus=recruitmentOption(v,role,1);reason=plus.reason;}catch(error){reason=error.message;}
  const premium=definition?.payroll||0;
  return '<article class="workforce-card"><h3>'+esc(name)+'</h3><p class="small">'+esc(definition?.effect||'Flexible base capacity in any department; no specialist skill bonus or salary premium.')+'</p><p><b>'+count+' staged</b> · arriving next month</p><p class="small">Next recruit: '+(plus?'<b>'+cash(plus.extraSigning)+'</b> added signing cost':'quote blocked')+'</p><p class="micro">Recurring contractual base pay $18,000/month'+(premium?' + '+cash(premium)+' specialty premium':'')+'. Existing efficiency discounts affect base payroll. '+(definition?'Enters at skill 20; joining can dilute the department average.':'No training specialization required.')+'</p><button class="btn" type="button" id="people-hire-'+role+'-less" aria-label="Remove one '+esc(name)+' recruit" '+(locked||!count?'disabled':'')+'>−</button> <button class="btn" type="button" id="people-hire-'+role+'-more" '+(locked||reason?'disabled':'')+'>Stage one '+esc(name)+' recruit</button><p class="micro '+(reason?'bad':'muted')+'">'+esc(locked?'Plan locked or connection paused.':reason||'Optional. Uses the shared hiring limit and spending room.')+'</p></article>';
 }).join('');
 mount.innerHTML='<h2>RECRUITMENT</h2><p class="small">Generalists and specialists belong to one employee pool. Compare their jobs and costs here; assigning existing employees is a separate instruction.</p><div class="people-summary"><div><span>Shared monthly recruitment</span><b>'+E.planHires(draft)+' / '+E.hireLimit(v.me)+'</b><small>All five recruit types use the same limit.</small></div><div><span>Combined signing cost</span><b>'+cash(quote.recruiting)+'</b><small>Included in the monthly plan budget—not another charge.</small></div><div><span>First productive month</span><b>'+(v.cycle+1)+'</b><small>No new recruit repairs current-month work coverage.</small></div></div><div class="people-recruit-grid">'+cards+'</div><p class="small">Recruitment can dilute morale and permanently increases payroll. Stage only changes this draft. Monthly changes provides individual undo; cash is charged when recruitment settles.</p><button class="btn" id="peopleRecruitmentAllocation" type="button">Review existing employee allocation</button>';
 for(const role of ['generalist',...Object.keys(E.SPECIALIST_ROLES)])for(const [suffix,step]of [['less',-1],['more',1]])$('#people-hire-'+role+'-'+suffix).addEventListener('click',()=>stagePeopleHire(role,step,token));
 $('#peopleRecruitmentAllocation').addEventListener('click',()=>{if(workforceEditCurrent(token))navigatePlanReview({tab:'operations',desk:'monthly',target:'#staffGrid'});});
}
function workforceForm(v){
 const policyStamp=JSON.stringify(draft.workforcePolicy),campaign=game||view,owner=v.me.id,cycle=v.cycle;
 if(!workforceFormState||workforceFormState.campaign!==campaign||workforceFormState.owner!==owner||workforceFormState.cycle!==cycle||workforceFormState.policyStamp!==policyStamp||v.me.submitted||v.gameOver){
  workforceFormState={campaign,owner,cycle,policyStamp,values:{},reserve:String(draft.workforcePolicy.reserve),dirty:false,preview:null,notice:''};
 }
 return workforceFormState;
}
function workforceFormPlan(v){
 const form=workforceForm(v),next=JSON.parse(JSON.stringify(draft));
 const numeric=raw=>{if(String(raw).trim()==='')throw Error('Enter a number; a blank field is not zero.');return Number(raw);};
 next.workforcePolicy.reserve=numeric(form.reserve);
 for(const [role,value]of Object.entries(form.values))next.workforcePolicy.training[role]=numeric(value);
 E.normalizeWorkforcePlan(v.me,next);return next;
}
function previewWorkforceForm(v,token){
 if(!workforceEditCurrent(token))return false;
 try{const form=workforceForm(v),next=workforceFormPlan(v),before=E.workforceReview(v.me,draft,v.economy),after=E.workforceReview(v.me,next,v.economy);
  const departments=v.me.departmentOffice?E.departmentBudgetQuote(v.me,next):null;
  form.preview={token,next,before,after,departments};form.notice='Preview only. Review costs, effective limits and teaching time before staging.';return true;
 }catch(error){const form=workforceForm(v);form.preview=null;form.notice=error.message;return false;}
}
function stageWorkforceForm(v){
 const form=workforceForm(v),preview=form.preview;
 if(!preview||!workforceEditCurrent(preview.token)){form.preview=null;form.notice='Preview is stale or the plan is locked. Preview the current form again.';return false;}
 let next;
 try{next=workforceFormPlan(v);if(JSON.stringify(next)!==JSON.stringify(preview.next))throw Error('The form changed. Preview it again.');
  E.workforceReview(v.me,next,v.economy);
 }catch(error){form.notice=error.message;form.preview=null;return false;}
 draft=next;workforceFormState=null;
 try{renderProjects(v);renderReady(v);}catch(error){toast('Training was staged, but the screen could not refresh: '+error.message);}
 return true;
}
function workforceTrainingPreviewHtml(v,form){
 const preview=form.preview;if(!preview)return '<p class="small">No reviewed form quote. Current draft values remain authoritative.</p>';
 const {before,after,departments}=preview,cash=n=>'$'+Math.round(n).toLocaleString('en-US');
 return '<h3>Training comparison · staged plan → form preview</h3><p class="small">Bank-wide forecast training '+cash(before.training.total)+' → '+cash(after.training.total)+'/month. '+(after.training.paused?'All training is paused by shared cash/capital protection.':'Quoted classes remain subject to actual settlement funding and business conditions.')+'</p><div class="table-scroll" tabindex="0" aria-label="Training before and after"><table class="regional-table"><thead><tr><th>Department</th><th>Requested ceiling</th><th>Department ceiling</th><th>Quoted spend before → after</th><th>Projected skill after</th><th>Teaching time</th></tr></thead><tbody>'+after.rows.map(row=>{
  const old=before.rows.find(x=>x.role===row.role),department=departments?.rows.find(x=>x.role===row.role),cap=preview.next.departmentPolicy?.envelopes.training[row.role];
  return '<tr><th>'+esc(row.name)+'</th><td>'+cash(row.budget)+'</td><td>'+(cap===undefined?'Not enabled':cash(cap))+'</td><td>'+cash(old.trainingSpend)+' → '+cash(row.trainingSpend)+'</td><td>'+row.skill+' → '+row.nextSkill+'</td><td>'+(department?.teaching?'One current banker reserved':'No paid leader teaching')+'</td></tr>';
 }).join('')+'</tbody></table></div><p class="micro">The lower applicable ceiling limits training; a ceiling alone does not spend cash. Eligibility, skill cap, compensated leaders, shared funding and the higher protected reserve also apply. New recruits do not train this month. Skill figures precede recruit dilution and later consequences.</p>';
}
function bindWorkforceForm(v,row){
 const form=workforceForm(v),token=workforceEditToken(v);
 if(form.preview&&!workforceEditCurrent(form.preview.token)){form.preview=null;form.notice='The shared plan changed. Unstaged fields are retained; preview again.';}
 $('#workforceBudget').value=Object.hasOwn(form.values,row.role)?form.values[row.role]:String(draft.workforcePolicy.training[row.role]);$('#workforceReserve').value=form.reserve;
 const status=$('#workforceFormStatus');status.textContent=form.notice||(form.dirty?'Unstaged training edits. Preview and stage, or discard.':'Showing staged policy. Editing a field does not apply it.');
 $('#workforceFormPreview').innerHTML=workforceTrainingPreviewHtml(v,form);
 $('#stageWorkforceForm').disabled=!form.preview||!workforceEditCurrent(token);
 const remember=()=>{if(!workforceEditCurrent(token))return;form.values[row.role]=$('#workforceBudget').value;form.reserve=$('#workforceReserve').value;form.dirty=true;form.preview=null;form.notice='Unstaged training edits. Preview before staging.';status.textContent=form.notice;$('#stageWorkforceForm').disabled=true;$('#workforceFormPreview').innerHTML='<p class="small">Form changed; old quote invalidated.</p>';};
 for(const id of ['#workforceBudget','#workforceReserve'])for(const event of ['input','change'])$(id).addEventListener(event,remember);
 $('#previewWorkforceForm').addEventListener('click',()=>{if(!workforceEditCurrent(token))return;previewWorkforceForm(v,token);renderWorkforce(v);$('#stageWorkforceForm').focus();});
 $('#stageWorkforceForm').addEventListener('click',()=>{if(workforceEditCurrent(token)){const applied=stageWorkforceForm(currentView());renderWorkforce(currentView());if(applied){$('#workforceFormStatus').textContent='Training instructions staged. Cash and skill change only during monthly resolution.';$('#previewWorkforceForm').focus();}}});
 $('#discardWorkforceForm').addEventListener('click',()=>{if(workforceEditCurrent(token)){workforceFormState=null;renderWorkforce(currentView());$('#workforceFormStatus').textContent='Unstaged training edits discarded; staged policies unchanged.';}});
}
