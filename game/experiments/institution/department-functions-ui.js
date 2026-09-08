// Uncaptured UI candidate; not a manifest entry or live campaign feature.
// The integration owner supplies a current OWNER view and full shared draft.
// No book initialization, accounting mutation or draft-key inference occurs.
// snapshot={view,plan,policy,mandate,vendorSupply?,identity}; identity is an opaque
// campaign/connection token which must change on reconnect/reload/replacement.
// onAdopt({policy,proposalMandate,expected}) must synchronously compare expected
// and atomically merge only these approved function instructions into the draft;
// returning true acknowledges adoption. It must not submit or mutate game books.
const DepartmentFunctionsUI=(()=>{
 const clone=x=>JSON.parse(JSON.stringify(x)),esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
 const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 const dollars=x=>'$'+Math.round(x).toLocaleString('en-US'),roles={service:'Retail & service',business:'Business banking',lending:'Lending',operations:'Operations & risk'};
 function create({functions:D,contextBuilder:C,getSnapshot,onAdopt,onError=()=>{}}){
  let state={stamp:null,identity:null,selected:null,form:null,mandate:null,proposal:null,reviewed:false,formDirty:false,notice:'',revision:0};
  function capture(){
   const snapshot=getSnapshot(),view=snapshot.view,p=view?.me;
   const stamp=stable({owner:p,cycle:view?.cycle,ended:view?.gameOver,economy:view?.economy,regions:view?.regions,territories:view?.territories,
    plan:snapshot.plan,policy:snapshot.policy,mandate:snapshot.mandate,vendorSupply:snapshot.vendorSupply});
   return {snapshot,stamp,identity:snapshot.identity,p,locked:!!(view?.gameOver||p?.submitted)};
  }
  function sync(current){
   if(current.stamp!==state.stamp||current.identity!==state.identity)state={stamp:current.stamp,identity:current.identity,selected:D.IDS.includes(state.selected)?state.selected:D.IDS[0],
    form:current.p?.departmentFunctions?clone(current.snapshot.policy||D.defaultPlan(current.p)):null,mandate:current.snapshot.mandate?clone(current.snapshot.mandate):null,
    proposal:null,reviewed:false,formDirty:false,notice:'Review changes before adopting them into your plan.',revision:state.revision+1};
  }
  function expected(current){return {identity:current.identity,stamp:current.stamp,ownerId:current.p.id,cycle:current.snapshot.view.cycle,revision:state.revision};}
  function guard(token,write=true){
   const current=capture();
   if(!current.p?.departmentFunctions||token.stamp!==current.stamp||token.identity!==current.identity||token.revision!==state.revision||
     token.ownerId!==current.p.id||token.cycle!==current.snapshot.view.cycle||write&&current.locked){onError('The bank, month, shared plan or connection changed, or this plan is locked. Refresh the department desk.');return null;}
   return current;
  }
  function review(current,policy){
   const s=current.snapshot,built=C.build(s.view,current.p,s.plan,s.vendorSupply===undefined?{}:{vendorSupply:s.vendorSupply});
   if(!built.enabled)throw Error('Department function planning is unavailable in this campaign.');
   return {built,quote:D.quote(current.p,policy,built.context)};
  }
  function preview(policy,token){
   const current=guard(token);if(!current)return false;
   try{const result=review(current,policy);state.form=clone(result.quote.policy);state.proposal=null;state.reviewed=true;state.formDirty=false;
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
    state.stamp=null;state.proposal=null;state.reviewed=false;state.revision++;return true;
   }catch(error){state.notice=error.message;onError(error.message);return false;}
  }
  function cancel(token){const current=guard(token);if(!current)return false;state.form=clone(current.snapshot.policy||D.defaultPlan(current.p));state.mandate=current.snapshot.mandate?clone(current.snapshot.mandate):null;
   state.proposal=null;state.reviewed=false;state.formDirty=false;state.notice='Preview discarded. Your existing plan and bank are unchanged.';state.revision++;return true;}
  function select(id,token){if(!guard(token,false)||!D.IDS.includes(id))return false;if(state.formDirty){onError('Preview or discard edited function values before switching functions.');return false;}state.selected=id;state.revision++;return true;}
  function field(id,label,value,max,disabled){return '<label for="'+id+'">'+esc(label)+'<input id="'+id+'" type="number" min="0" step="1" max="'+max+'" value="'+esc(value)+'"'+(disabled?' disabled':'')+'></label>';}
  function render(){
   const current=capture();sync(current);state.revision++;
   if(!current.p?.departmentFunctions)return '';
   let built,q;try{const r=review(current,state.proposal?.policy||state.form);built=r.built;q=r.quote;if(state.mandate)D.propose(current.p,state.form,built.context,state.mandate);}catch(error){return '<section class="credit-policy"><h3>Department functions</h3><p class="bad" role="status">'+esc(error.message)+'</p></section>';}
   const selected=state.selected,row=q.rows.find(x=>x.id===selected),definition=D.FUNCTIONS[selected],locked=current.locked,disabled=locked?' disabled':'',a=built.attribution;
   const summary='<div class="credit-summary"><div><span>Estimated monthly workload</span><b>'+q.rows.reduce((n,r)=>n+r.workload,0)+' quarter-work units</b><small>One banker = four quarters; workload is an estimate, not a customer count.</small></div>'+
    '<div><span>Uncovered work</span><b>'+q.rows.reduce((n,r)=>n+r.shortfall,0)+'</b><small>Adding capacity does not promise revenue or create customers.</small></div><div><span>Quoted vendor expense / month</span><b>'+dollars(q.vendorExpense)+'</b><small>'+dollars(built.context.freeCash)+' available after current shared commitments and reserves. No charge for previews.</small></div></div>';
   const matrix='<div class="table-scroll" tabindex="0" aria-label="Eight department function workloads" style="max-height:280px;max-width:100%;overflow:auto"><table class="regional-table"><thead><tr><th>Function</th><th>Workload</th><th>Retained / extra staff</th><th>Vendor</th><th>Shortfall</th><th>Monthly vendor cost</th></tr></thead><tbody>'+q.rows.map(r=>'<tr><th>'+esc(D.FUNCTIONS[r.id].name)+'</th><td>'+r.workload+'</td><td>'+r.retained+' / '+r.allocated+'</td><td>'+r.vendor+'</td><td>'+r.shortfall+'</td><td>'+dollars(r.vendorExpense)+'</td></tr>').join('')+'</tbody></table></div>';
   const pool='<details><summary>Shared staff, teaching and protected time</summary><p class="micro">Retained reservations already belong to existing service/collection work. Extra quotas use only remaining physical time. Specialist productivity is not another employee.</p>'+D.ROLES.map(r=>'<p class="small"><b>'+esc(roles[r])+'</b>: '+a.assignedQuarters[r]+' assigned quarters − '+a.paidTeacherQuarters[r]+' teaching − '+q.retainedPools[r]+' retained − '+q.allocatedPools[r]+' extra − '+a.uncreditedQuantizationHold[r]+' uncredited fractional-time hold = '+(q.remainingPools[r]-q.overcommittedPools[r])+' remaining for facilities/sales.'+(q.overcommittedPools[r]?' '+q.overcommittedPools[r]+' quarters overcommitted; no extra bankers are available.':'')+'</p>').join('')+'</details>';
   const editor='<label for="df-function">Inspect or edit one function<select id="df-function">'+D.IDS.map(id=>'<option value="'+id+'"'+(id===selected?' selected':'')+'>'+esc(D.FUNCTIONS[id].name)+'</option>').join('')+'</select></label><section class="credit-policy"><h4>'+esc(definition.name)+'</h4><p class="small">'+row.workload+' estimated work · '+row.retained+' retained quarters · '+row.shortfall+' uncovered. Existing reservations are read-only here.</p><div class="credit-controls">'+definition.roles.map(role=>field('df-staff-'+role,roles[role]+' additional quarters',state.form.quotas[selected][role],D.RULES.maxQuarters,locked)).join('')+
    field('df-vendor','Vendor work units',state.form.vendors[selected],built.context.vendorSupply[selected],locked)+'</div><p class="micro">Vendor rate '+dollars(definition.vendorRate)+'/unit/month; '+built.context.vendorSupply[selected]+' units of authored supplier capacity available. Idle ordered vendor capacity is still charged.</p><button class="btn" type="button" id="df-preview"'+disabled+'>Preview function changes</button></section>';
   const m=state.mandate,limits=m?'<details><summary>Prepare a bounded staffing proposal</summary><p class="small">Limits apply to this review. Preserve residual staff for facilities/sales; no hires, borrowing or major strategic decisions are made.</p><p class="small" id="df-priority-list">'+m.priorities.map((id,i)=>(i+1)+'. '+esc(D.FUNCTIONS[id].name)).join(' → ')+'</p><label for="df-priority">Change proposal priority<select id="df-priority"'+disabled+'>'+m.priorities.map(id=>'<option value="'+id+'">'+esc(D.FUNCTIONS[id].name)+'</option>').join('')+'</select></label><button class="btn" type="button" id="df-up"'+disabled+'>Move priority up</button> <button class="btn" type="button" id="df-down"'+disabled+'>Move priority down</button><div class="credit-controls">'+field('df-max-staff','Maximum NEW quarters in this proposal',m.maxAdditionalQuarters,D.RULES.maxQuarters,locked)+field('df-max-vendor','TOTAL vendor envelope ($/month)',m.maxVendorExpense,D.RULES.maxCash,locked)+D.ROLES.map(r=>field('df-floor-'+r,roles[r]+' residual floor',m.floorQuarters[r],D.RULES.maxQuarters,locked)).join('')+'</div><button class="btn" type="button" id="df-prepare"'+disabled+'>Prepare proposal from reviewed form</button></details>':'<p class="notice">A proposal needs explicit priority, staff-floor and spending limits.</p>';
   const proposal=state.proposal?'<section class="credit-policy" aria-label="Allocation proposal review"><h4>Review proposed changes</h4><p class="small">'+state.proposal.additionalQuarters+' new staff quarters · '+dollars(state.proposal.additionalVendorExpense)+' added vendor cost · '+dollars(state.proposal.totalVendorExpense)+' total vendor cost/month.</p><ul>'+state.proposal.changes.map(c=>'<li>'+esc(D.FUNCTIONS[c.id].name)+' · '+esc(c.kind==='staff'?roles[c.role]:'Vendor')+': '+c.from+' → '+c.to+(c.kind==='vendor'?' · '+dollars(c.expense):'')+'. '+esc(c.reason)+'</li>').join('')+'</ul>'+state.proposal.reasons.map(reason=>'<p class="micro">'+esc(reason)+'</p>').join('')+'</section>':'';
   const canAdopt=state.reviewed&&q.eligible&&(!state.proposal||state.proposal.eligible)&&!locked;
   return '<details class="department-functions-desk" open><summary>DEPARTMENT FUNCTIONS · '+esc(current.p.name)+'</summary><section class="credit-policy group-credit-policy">'+
    (locked?'<p class="notice" role="status">'+(current.snapshot.view.gameOver?'Campaign ended.':'Plan submitted.')+' Instructions are locked; inspection remains available.</p>':'')+summary+matrix+pool+editor+limits+proposal+
    '<p id="df-status" class="'+(q.eligible?'small':'bad')+'" role="status">'+esc(q.eligible?state.notice:q.reason)+'</p><button class="btn" type="button" id="df-adopt"'+(canAdopt?'':' disabled')+'>'+(state.proposal?'Adopt reviewed proposal into draft':'Adopt reviewed function changes')+'</button> <button class="btn" type="button" id="df-cancel"'+disabled+'>Discard preview</button><p class="micro">Adopt changes only the planning draft. It cannot submit the turn, borrow, hire, close facilities, acquire businesses or pay vendors. Cash moves only in the engine’s later settlement.</p></section></details>';
  }
  function bind(mount){
   const current=capture();if(current.stamp!==state.stamp||current.identity!==state.identity){mount.innerHTML=render();bind(mount);return;}if(!current.p?.departmentFunctions)return;const token=expected(current),find=id=>mount.querySelector('#'+id);
   const redraw=()=>{mount.innerHTML=render();bind(mount);};
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
   for(const id of inputs)listen(id,'input',()=>{if(!guard(token))return;state.reviewed=false;state.proposal=null;if(id==='df-vendor'||id.startsWith('df-staff-'))state.formDirty=true;find('df-adopt').disabled=true;find('df-status').textContent='Inputs changed. The displayed comparison is the last review; preview function edits or prepare updated limits before adoption.';});
  }
  return Object.freeze({render,bind,preview,prepare,adopt,cancel,select,token:()=>{const c=capture();sync(c);return expected(c);}});
 }
 return Object.freeze({create});
})();
