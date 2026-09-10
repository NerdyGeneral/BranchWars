// Owner-only versioned function workspace. All prices, availability, workload,
// reservations and adoption checks use the shared engine quote. No new books
// are initialized by rendering, and the older leadership desk is retained.
const DepartmentFunctionsUI=(()=>{
 const clone=x=>JSON.parse(JSON.stringify(x)),esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
 const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 const dollars=x=>'$'+Math.round(x).toLocaleString('en-US'),time=x=>Number(x.toFixed(3)).toLocaleString('en-US'),roles={service:'Retail & service',business:'Business banking',lending:'Lending',operations:'Operations & risk'};
 const taskNames={offerSales:'Relationship offers',commercialRelationships:'Commercial relationships',householdSupport:'Household service',applicationProcessing:'Application processing',commercialDelivery:'Contract delivery',creditAdministration:'Credit administration',collections:'Collections',technology:'Technology operations',risk:'Risk and compliance',treasury:'Treasury operations',people:'People management'};
 const consumers={offerSales:'Share-of-wallet offers',commercialRelationships:'Business and merchant acquisition',householdSupport:'Household service and retention',applicationProcessing:'Pending application activation',commercialDelivery:'Signed service agreements',creditAdministration:'New loan origination',collections:'Delinquency servicing',technology:'Service platforms and disruption resilience',risk:'Credit controls and examination resilience',treasury:'Locked-term deposit handling',people:'Paid training gains and management performance'};
 function create({functions:D,quotePolicy,getSnapshot,onAdopt,onChanged=()=>{},onRedraw=null,onError=()=>{}}){
  let state={stamp:null,identity:null,selected:null,form:null,mandate:null,proposal:null,reviewed:false,formDirty:false,inputs:{},notice:'',revision:0};
  function capture(){
   const snapshot=getSnapshot(),view=snapshot.view,p=view?.me;
   const stamp=stable({owner:p,cycle:view?.cycle,ended:view?.gameOver,economy:view?.economy,regions:view?.regions,territories:view?.territories,opportunities:view?.opportunities,
    plan:snapshot.plan,policy:snapshot.policy,mandate:snapshot.mandate,lockedReason:snapshot.lockedReason});
   return {snapshot,stamp,identity:snapshot.identity,p,locked:!!(view?.gameOver||p?.submitted||snapshot.lockedReason)};
  }
  function sync(current){
   if(current.stamp!==state.stamp||current.identity!==state.identity){
    const policy=current.p?.departmentFunctions?clone(current.snapshot.policy||D.defaultPlan(current.p)):null;
    const keep=!current.locked&&state.identity===current.identity&&state.owner===current.p?.id&&state.cycle===current.snapshot.view?.cycle&&state.policyStamp===stable(policy);
    state={stamp:current.stamp,identity:current.identity,owner:current.p?.id,cycle:current.snapshot.view?.cycle,policyStamp:stable(policy),selected:D.IDS.includes(state.selected)?state.selected:D.IDS[0],
     form:keep?state.form:policy,mandate:keep?state.mandate:current.snapshot.mandate?clone(current.snapshot.mandate):null,
     proposal:null,reviewed:false,formDirty:keep&&state.formDirty,inputs:keep?state.inputs:{},notice:keep?'Shared plan changed. Your unstaged values are retained; preview again before adoption.':'Review changes before adopting them into your plan.',revision:state.revision+1};
   }
  }
  function expected(current){return {identity:current.identity,stamp:current.stamp,ownerId:current.p.id,cycle:current.snapshot.view.cycle,revision:state.revision};}
  function guard(token,write=true){
   const current=capture();
   if(!current.p?.departmentFunctions||token.stamp!==current.stamp||token.identity!==current.identity||token.revision!==state.revision||
     token.ownerId!==current.p.id||token.cycle!==current.snapshot.view.cycle||write&&current.locked){onError('The bank, month, shared plan or connection changed, or this plan is locked. Refresh the department desk.');return null;}
   return current;
  }
  function review(current,policy){
   const s=current.snapshot;return quotePolicy(s.view,current.p,s.plan,policy);
  }
  function preview(policy,token){
   const current=guard(token);if(!current)return false;
   try{const result=review(current,policy);state.form=clone(result.quote.policy);state.proposal=null;state.reviewed=true;state.formDirty=false;
    for(const id of Object.keys(state.inputs))if(id==='df-vendor'||id.startsWith('df-staff-'))delete state.inputs[id];
    state.notice=result.quote.eligible?'Preview only. Review the shared staff and monthly cost before Adopt.':result.quote.reason;state.revision++;return true;
   }catch(error){state.reviewed=false;state.proposal=null;state.notice=error.message;state.revision++;onError(error.message);return false;}
  }
  function prepare(mandate,token){
   const current=guard(token);if(!current)return false;
   if(state.formDirty){onError('Preview the edited function values before preparing a staffing proposal.');return false;}
   try{const {built}=review(current,state.form),proposal=D.propose(current.p,state.form,built.context,mandate);
    state.mandate=clone(mandate);state.proposal=clone(proposal);state.reviewed=true;state.notice=proposal.eligible?'Proposal prepared, not adopted. Existing explicit allocations are retained.':proposal.reasons.join(' ');state.revision++;return true;
   }catch(error){state.proposal=null;state.reviewed=false;state.notice=error.message;state.revision++;onError(error.message);return false;}
  }
  function adopt(token){
   const current=guard(token);if(!current)return false;
   if(!state.reviewed){onError('Preview the current form before adopting it.');return false;}
   try{
    const policy=state.proposal?.policy||state.form,checked=review(current,policy);
    if(!checked.quote.eligible)throw Error(checked.quote.reason);
    if(state.proposal){const confirmed=D.propose(current.p,state.form,checked.built.context,state.mandate);if(!confirmed.eligible||stable(confirmed.policy)!==stable(policy))throw Error('The allocation proposal changed. Prepare it again.');}
    const request={policy:clone(policy),proposalMandate:state.proposal?clone(state.mandate):null,expected:expected(current)};
    if(onAdopt(request)!==true)throw Error('The current draft did not accept these instructions. Refresh and review again.');
    state.stamp=null;state.policyStamp=null;state.proposal=null;state.reviewed=false;state.inputs={};state.revision++;
    try{onChanged();}catch(error){onError('Instructions were staged, but the desk could not refresh: '+error.message);}return true;
   }catch(error){state.notice=error.message;onError(error.message);return false;}
  }
  function cancel(token){const current=guard(token);if(!current)return false;state.form=clone(current.snapshot.policy||D.defaultPlan(current.p));state.mandate=current.snapshot.mandate?clone(current.snapshot.mandate):null;
   state.proposal=null;state.reviewed=false;state.formDirty=false;state.inputs={};state.notice='Preview discarded. Your existing plan and bank are unchanged.';state.revision++;return true;}
  function select(id,token){if(!guard(token,false)||!D.IDS.includes(id))return false;if(state.formDirty){onError('Preview or discard edited function values before switching functions.');return false;}state.selected=id;state.revision++;return true;}
  function field(id,label,value,max,disabled){return '<div class="df-field"><label id="'+id+'-label" for="'+id+'">'+esc(label)+'</label><input id="'+id+'" aria-labelledby="'+id+'-label" type="number" min="0" step="1" max="'+max+'" value="'+esc(Object.hasOwn(state.inputs,id)?state.inputs[id]:value)+'"'+(disabled?' disabled':'')+'></div>';}
  function completed(p){
   const saved=p.departmentFunctionDelivery,ordered=p.departmentFunctions.report,report=saved?.report;
   if(!report||!ordered)return '<details id="df-completed"><summary>Last completed month</summary><p class="small">No completed department month yet.</p></details>';
   const credit=report.rows.find(r=>r.id==='creditAdministration'),pursuit=saved.opportunity;
   const pipeline=pursuit?'<p class="small">Pipeline pursuit · '+esc(pursuit.terms.type)+' in '+esc(pursuit.terms.market)+' · '+esc(pursuit.result)+'. '+time(pursuit.quote.required)+' previously unused work units reserved; '+(pursuit.awarded?'award applied.':'no award applied.')+'</p>':'<p class="micro">No funded pipeline pursuit was recorded this month.</p>';
   return '<details id="df-completed"><summary>Last completed month · '+saved.cycle+'</summary><p class="small"><b>Vendor cash paid: '+dollars(report.vendors.paidExpense)+'</b> · authorized order '+dollars(ordered.vendorExpense)+'. This is the settled month, not the draft forecast.</p>'+
    (credit&&credit.workload>0&&credit.delivered.served===0?'<p class="warn">Credit administration delivered zero work against '+time(credit.workload)+' required. Zero credit coverage pauses ordinary new loan origination; existing loans still remain on the books.</p>':'')+
    '<div class="table-scroll" tabindex="0" aria-label="Last completed department task delivery" style="max-height:240px;max-width:100%;overflow:auto"><table class="regional-table"><thead><tr><th>Task</th><th>Requested</th><th>Delivered</th><th>Shortfall</th><th>Affects</th></tr></thead><tbody>'+report.rows.map(r=>'<tr><th>'+esc(taskNames[r.id]||r.id)+'</th><td>'+time(r.workload)+'</td><td>'+time(r.delivered.served)+'</td><td>'+time(r.delivered.shortfall)+'</td><td>'+esc(consumers[r.id]||'Department delivery')+'</td></tr>').join('')+'</tbody></table></div>'+
    '<p class="micro">Quarter-work units retain exact task fractions, unlike rounded planning totals. These are physical/vendor work delivered before specialist productivity and other product, funding or market limits—not an allocation of bank profit.</p>'+pipeline+'</details>';
  }
  function renderDepartmentFunctionsController(){
   const current=capture();sync(current);state.revision++;
   if(!current.p?.departmentFunctions)return '';
   const history=completed(current.p);
   let built,q;try{const r=review(current,state.proposal?.policy||state.form);built=r.built;q=r.quote;if(state.mandate)D.propose(current.p,state.form,built.context,state.mandate);}catch(error){return '<section class="credit-policy"><h3>Department functions</h3><p class="bad" role="status">'+esc(error.message)+'</p>'+history+'</section>';}
   const selected=state.selected,row=q.rows.find(x=>x.id===selected),definition=D.FUNCTIONS[selected],locked=current.locked,disabled=locked?' disabled':'',a=built.attribution;
   const pursuit=built.opportunity,selectedPursuit=current.snapshot.view.opportunities?.find(o=>o.id===current.snapshot.plan.opportunity);
   const pursuitStatus=pursuit?'<div id="df-opportunity" class="notice" role="status"><b>Selected pursuit: '+esc(selectedPursuit?.name||'Pipeline opportunity')+'</b><p class="small">'+esc(D.FUNCTIONS[pursuit.function].name)+' · '+time(pursuit.required)+' quarter-work units required / '+time(pursuit.available)+' unused units quoted. <b>'+(pursuit.eligible?'Capacity available (forecast).':'Pursuit paused.')+'</b> '+esc(pursuit.reason)+'</p><p class="micro">Only work left after ordinary tasks can support this pursuit. Quoted vendor work must be paid at settlement; capacity never guarantees a win. The selected opportunity remains in your draft.</p></div>':'';
   const summary='<div class="credit-summary"><div><span>Estimated monthly workload</span><b>'+q.rows.reduce((n,r)=>n+r.workload,0)+' quarter-work units</b><small>One banker = four quarters; workload is an estimate, not a customer count.</small></div>'+
    '<div><span>Aggregate quota shortfall</span><b>'+q.rows.reduce((n,r)=>n+r.shortfall,0)+'</b><small>Zero means the grouped quotas are covered, not every task. Check task-level coverage in People & Operations; capacity is not guaranteed revenue.</small></div><div><span>Quoted vendor expense / month</span><b>'+dollars(q.vendorExpense)+'</b><small>Function-order budget BEFORE these orders: '+dollars(built.context.freeCash)+' (after other shared commitments and reserves). Remaining AFTER quoted function vendors: '+dollars(built.context.freeCash-q.vendorExpense)+'. No charge for previews.</small></div></div>';
   const matrix='<div class="table-scroll" tabindex="0" aria-label="Eight department function workloads" style="max-height:280px;max-width:100%;overflow:auto"><table class="regional-table"><thead><tr><th>Function</th><th>Workload</th><th>Retained / extra staff</th><th>Vendor</th><th>Shortfall</th><th>Monthly vendor cost</th></tr></thead><tbody>'+q.rows.map(r=>'<tr><th>'+esc(D.FUNCTIONS[r.id].name)+'</th><td>'+r.workload+'</td><td>'+r.retained+' / '+r.allocated+'</td><td>'+r.vendor+'</td><td>'+r.shortfall+'</td><td>'+dollars(r.vendorExpense)+'</td></tr>').join('')+'</tbody></table></div>';
   const pool='<details><summary>Shared staff, teaching and protected time</summary><p class="micro">Retained reservations already belong to existing service/collection work. Extra quotas use only remaining physical time. Specialist productivity is not another employee. Planning rounds workloads up and retained capacity down; exact retained fractions still serve their original tasks. Only the residual fraction below is unavailable for new quarter-time orders.</p>'+D.ROLES.map(r=>'<p class="small"><b>'+esc(roles[r])+'</b>: '+a.assignedQuarters[r]+' assigned quarters − '+a.paidTeacherQuarters[r]+' teaching − '+time(D.IDS.reduce((n,id)=>n+a.exactRetainedQuarters[id][r],0))+' retained − '+q.allocatedPools[r]+' extra − '+time(a.residualRoundingHold[r])+' residual fractional-time hold = '+(q.remainingPools[r]-q.overcommittedPools[r])+' remaining for facilities/sales.'+(q.overcommittedPools[r]?' '+q.overcommittedPools[r]+' quarters overcommitted; no extra bankers are available.':'')+'</p>').join('')+'</details>';
   const tasks=built.dispatch?.rows.filter(task=>task.department===selected)||[];
   const taskPreview=tasks.length?'<p class="micro">Exact task projection if staff remain available and ordered vendors are paid: '+tasks.map(task=>esc(taskNames[task.id]||task.id)+' '+time(task.served)+' / '+time(task.workload)+' work covered').join(' · ')+'. Disruption or unpaid capacity can reduce delivery.</p>':'';
   const editor='<div class="df-field"><label id="df-function-label" for="df-function">Inspect or edit one function</label><select id="df-function" aria-labelledby="df-function-label">'+D.IDS.map(id=>'<option value="'+id+'"'+(id===selected?' selected':'')+'>'+esc(D.FUNCTIONS[id].name)+'</option>').join('')+'</select></div><section class="credit-policy"><h4>'+esc(definition.name)+'</h4><p class="small">'+row.workload+' estimated work · '+row.retained+' retained quarters · '+row.shortfall+' uncovered. Existing reservations are read-only here.</p>'+taskPreview+'<div class="credit-controls">'+definition.roles.map(role=>field('df-staff-'+role,roles[role]+' additional quarters',state.form.quotas[selected][role],D.RULES.maxQuarters,locked)).join('')+
    field('df-vendor','Vendor work units',state.form.vendors[selected],built.context.vendorSupply[selected],locked)+'</div><p class="micro">Vendor rate '+dollars(definition.vendorRate)+'/unit/month; '+built.context.vendorSupply[selected]+' unit'+(built.context.vendorSupply[selected]===1?'':'s')+' of authored supplier capacity available. Idle ordered vendor capacity is still charged.</p><button class="btn" type="button" id="df-preview"'+disabled+'>Preview function changes</button></section>';
   const m=state.mandate,limits=m?'<details><summary>Prepare a bounded staffing proposal</summary><p class="small">Limits apply to this review. Preserve residual staff for facilities/sales; no hires, borrowing or major strategic decisions are made.</p><p class="small" id="df-priority-list">'+m.priorities.map((id,i)=>(i+1)+'. '+esc(D.FUNCTIONS[id].name)).join(' → ')+'</p><div class="df-field"><label id="df-priority-label" for="df-priority">Change proposal priority</label><select id="df-priority" aria-labelledby="df-priority-label"'+disabled+'>'+m.priorities.map(id=>'<option value="'+id+'">'+esc(D.FUNCTIONS[id].name)+'</option>').join('')+'</select></div><button class="btn" type="button" id="df-up"'+disabled+'>Move priority up</button> <button class="btn" type="button" id="df-down"'+disabled+'>Move priority down</button><div class="credit-controls">'+field('df-max-staff','Maximum NEW quarters in this proposal',m.maxAdditionalQuarters,D.RULES.maxQuarters,locked)+field('df-max-vendor','TOTAL vendor envelope ($/month)',m.maxVendorExpense,D.RULES.maxCash,locked)+D.ROLES.map(r=>field('df-floor-'+r,roles[r]+' residual floor',m.floorQuarters[r],D.RULES.maxQuarters,locked)).join('')+'</div><button class="btn" type="button" id="df-prepare"'+disabled+'>Prepare proposal from reviewed form</button></details>':'<p class="notice">A proposal needs explicit priority, staff-floor and spending limits.</p>';
   const proposal=state.proposal?'<section class="credit-policy" aria-label="Allocation proposal review"><h4>Review proposed changes</h4><p class="small">'+state.proposal.additionalQuarters+' new staff quarters · '+dollars(state.proposal.additionalVendorExpense)+' added vendor cost · '+dollars(state.proposal.totalVendorExpense)+' total vendor cost/month.</p><ul>'+state.proposal.changes.map(c=>'<li>'+esc(D.FUNCTIONS[c.id].name)+' · '+esc(c.kind==='staff'?roles[c.role]:'Vendor')+': '+c.from+' → '+c.to+(c.kind==='vendor'?' · '+dollars(c.expense):'')+'. '+esc(c.reason)+'</li>').join('')+'</ul>'+state.proposal.reasons.map(reason=>'<p class="micro">'+esc(reason)+'</p>').join('')+'</section>':'';
   const canAdopt=state.reviewed&&!state.formDirty&&q.eligible&&(!state.proposal||state.proposal.eligible)&&!locked;
   return '<details class="department-functions-desk" open><summary>DEPARTMENT FUNCTIONS · '+esc(current.p.name)+'</summary><section class="credit-policy group-credit-policy">'+
    (locked?'<p class="notice" role="status">'+(current.snapshot.lockedReason||(current.snapshot.view.gameOver?'Campaign ended.':'Plan submitted.'))+' Instructions are locked; inspection remains available.</p>':'')+summary+history+pursuitStatus+matrix+pool+editor+limits+proposal+
    '<p id="df-status" class="'+(q.eligible?'small':'bad')+'" role="status">'+esc(q.eligible?state.notice:q.reason)+'</p><button class="btn" type="button" id="df-adopt"'+(canAdopt?'':' disabled')+'>'+(state.proposal?'Adopt reviewed proposal into draft':'Adopt reviewed function changes')+'</button> <button class="btn" type="button" id="df-cancel"'+disabled+'>Discard preview</button><p class="micro">Adopt changes only the planning draft. It cannot submit the turn, borrow, hire, close facilities, acquire businesses or pay vendors. Cash moves only in the engine’s later settlement.</p></section></details>';
  }
  function bind(mount){
   const current=capture();if(current.stamp!==state.stamp||current.identity!==state.identity){mount.innerHTML=renderDepartmentFunctionsController();bind(mount);return;}if(!current.p?.departmentFunctions)return;const token=expected(current),find=id=>mount.querySelector('#'+id);
   const redraw=()=>{if(onRedraw){onRedraw();return;}mount.innerHTML=renderDepartmentFunctionsController();bind(mount);};
   const listen=(id,event,handler)=>find(id)?.addEventListener(event,handler);
   const number=id=>{const value=find(id).value;if(String(value).trim()==='')throw Error('Enter a whole number; blank is not zero.');return Number(value);};
   const attempt=fn=>{try{fn();}catch(error){onError(error.message);}};
   const form=()=>{const policy=clone(state.form);for(const role of D.FUNCTIONS[state.selected].roles)policy.quotas[state.selected][role]=number('df-staff-'+role);policy.vendors[state.selected]=number('df-vendor');return policy;};
   const limits=()=>({...clone(state.mandate),maxAdditionalQuarters:number('df-max-staff'),maxVendorExpense:number('df-max-vendor'),floorQuarters:Object.fromEntries(D.ROLES.map(r=>[r,number('df-floor-'+r)]))});
   listen('df-function','change',()=>{if(select(find('df-function').value,token))redraw();});
   listen('df-preview','click',()=>attempt(()=>{preview(form(),token);redraw();}));
   listen('df-prepare','click',()=>attempt(()=>{prepare(limits(),token);redraw();}));
   listen('df-adopt','click',()=>{adopt(token);redraw();});listen('df-cancel','click',()=>{cancel(token);redraw();});
   for(const [id,delta]of [['df-up',-1],['df-down',1]])listen(id,'click',()=>attempt(()=>{if(!guard(token))return;const next=limits(),index=next.priorities.indexOf(find('df-priority').value),to=index+delta;
    if(index<0||to<0||to>=next.priorities.length)return;[next.priorities[index],next.priorities[to]]=[next.priorities[to],next.priorities[index]];state.mandate=next;state.proposal=null;state.reviewed=false;state.notice='Proposal priority changed. Prepare again before adoption.';state.revision++;redraw();}));
   // DOM edits invalidate adoption immediately. Do not silently adopt an older
   // quote while a changed amount remains visible in the editor.
   const inputs=[...D.FUNCTIONS[state.selected].roles.map(r=>'df-staff-'+r),'df-vendor',...(state.mandate?['df-max-staff','df-max-vendor',...D.ROLES.map(r=>'df-floor-'+r)]:[])];
   for(const id of inputs)listen(id,'input',()=>{if(!guard(token))return;state.inputs[id]=find(id).value;state.reviewed=false;state.proposal=null;if(id==='df-vendor'||id.startsWith('df-staff-'))state.formDirty=true;state.notice='Inputs changed. Unstaged values retained. The displayed comparison is the last review; preview function edits or prepare updated limits before adoption.';find('df-adopt').disabled=true;find('df-status').textContent=state.notice;});
  }
  return Object.freeze({render:renderDepartmentFunctionsController,bind,preview,prepare,adopt,cancel,select,token:()=>{const c=capture();sync(c);return expected(c);}});
 }
 return Object.freeze({create});
})();
let departmentFunctionsLive={session:null,identity:null,owner:null,tab:'functions',controller:null,mandate:null};
function departmentFunctionsIdentity(){
 const session=[game||view,typeof connectionAttempt==='undefined'?0:connectionAttempt,featureConnectionGeneration,linkSession,pc,dc,gh,lan];
 if(!departmentFunctionsLive.session||session.some((x,i)=>x!==departmentFunctionsLive.session[i])){
  departmentFunctionsLive.session=session;departmentFunctionsLive.identity={};departmentFunctionsLive.owner=null;
  departmentFunctionsLive.controller=null;departmentFunctionsLive.mandate=null;departmentFunctionsLive.tab='functions';
 }
 return departmentFunctionsLive.identity;
}
function departmentFunctionsSnapshot(){
 const v=currentView(),identity=departmentFunctionsIdentity();
 return {view:v,plan:draft,policy:draft?.departmentFunctionsPolicy,identity,
  mandate:departmentFunctionsLive.mandate||(v?.me.departmentFunctions?E.defaultDepartmentFunctionsMandate(v.me):null),
  lockedReason:draftOwner!==v?.me.id||lastCycle!==v?.cycle?'The current owner draft is unavailable.':gh.active&&gh.paused?'Repository connection paused.':''};
}
function departmentFunctionsLiveQuote(v,p,plan,policy){
 const next=JSON.parse(JSON.stringify(plan));next.departmentFunctionsPolicy=JSON.parse(JSON.stringify(policy));
 const result=E.departmentFunctionsQuote(v,p,next);
 if(!result.context||!result.attribution)throw Error(result.reason||result.status?.reason||'Function planning context is unavailable.');
 const quote=E.DepartmentFunctions.quote(p,result.policy||policy,result.context);
 if(!result.eligible||result.status&&!result.status.eligible){quote.eligible=false;quote.reason=result.reason||result.status?.reason||'The shared plan conflicts with these function settings.';}
 return {built:{context:result.context,attribution:result.attribution,workloadSources:result.workloadSources,dispatch:result.dispatch,opportunity:result.opportunity},quote};
}
function adoptDepartmentFunctions(request){
 const controller=departmentFunctionsLive.controller;if(!controller)return false;
 const snapshot=departmentFunctionsSnapshot(),current=controller.token(),v=snapshot.view;
 if(request.expected.identity!==current.identity||request.expected.stamp!==current.stamp||request.expected.revision!==current.revision||
   request.expected.ownerId!==v.me.id||request.expected.cycle!==v.cycle||snapshot.lockedReason||v.me.submitted||v.gameOver)return false;
 const next=JSON.parse(JSON.stringify(draft));next.departmentFunctionsPolicy=JSON.parse(JSON.stringify(request.policy));
 const checked=E.departmentFunctionsQuote(v,v.me,next);if(!checked.eligible||checked.status&&!checked.status.eligible)throw Error(checked.reason||checked.status.reason);
 next.departmentFunctionsPolicy=JSON.parse(JSON.stringify(checked.policy));draft=next;
 if(request.proposalMandate)departmentFunctionsLive.mandate=JSON.parse(JSON.stringify(request.proposalMandate));
 return true;
}
function departmentFunctionsNavigation(){
 return '<div class="department-functions-nav" role="tablist" aria-label="Department management desks">'+
  [['functions','Functions & workload'],['leadership','Leadership & budgets']].map(([key,label])=>'<button type="button" class="btn" id="department-view-'+key+'" role="tab" aria-selected="'+(departmentFunctionsLive.tab===key)+'" tabindex="'+(departmentFunctionsLive.tab===key?'0':'-1')+'">'+label+'</button>').join('')+'</div>';
}
function bindDepartmentFunctionsNavigation(v){
 const identity=departmentFunctionsIdentity(),owner=v.me.id,cycle=v.cycle;
 const switchDesk=(key,focus=false)=>{
  const current=currentView();if(identity!==departmentFunctionsIdentity()||owner!==current?.me.id||cycle!==current?.cycle||!current.me.departmentFunctions)return;
  departmentFunctionsLive.tab=key;renderDepartments(current);
  if(focus)$('#department-view-'+key).focus();
 };
 for(const key of ['functions','leadership']){
  $('#department-view-'+key).addEventListener('click',()=>switchDesk(key));
  $('#department-view-'+key).addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();switchDesk(event.key==='Home'?'functions':event.key==='End'?'leadership':key==='functions'?'leadership':'functions',true);
  });
 }
}
function renderDepartmentFunctionsWorkspace(v){
 const identity=departmentFunctionsIdentity();
 if(departmentFunctionsLive.owner!==v.me.id){departmentFunctionsLive.owner=v.me.id;departmentFunctionsLive.controller=null;departmentFunctionsLive.mandate=null;departmentFunctionsLive.tab='functions';}
 const navigation=departmentFunctionsNavigation(),mount=$('#departmentPanel');
 if(departmentFunctionsLive.tab==='leadership')renderDepartmentLeadership(v,navigation);
 else{
  if(!departmentFunctionsLive.controller)departmentFunctionsLive.controller=DepartmentFunctionsUI.create({functions:E.DepartmentFunctions,quotePolicy:departmentFunctionsLiveQuote,getSnapshot:departmentFunctionsSnapshot,onAdopt:adoptDepartmentFunctions,onChanged:()=>renderReady(currentView()),onRedraw:()=>renderDepartments(currentView()),onError:toast});
  mount.classList.remove('hidden');mount.innerHTML=navigation+'<div id="departmentFunctionsMount"></div>';
  const content=$('#departmentFunctionsMount');content.innerHTML=departmentFunctionsLive.controller.render();departmentFunctionsLive.controller.bind(content);
 }
 if(identity===departmentFunctionsIdentity())bindDepartmentFunctionsNavigation(v);
}
