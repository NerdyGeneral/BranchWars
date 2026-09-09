// Owner-only presentation model. Quotes are read-only; never repair a plan or
// normalize authoritative state merely to render an explanation.
function monthlyPlanReview(v,plan=draft){
 const blockers=[],warnings=[];
 const cash=value=>'$'+Math.round(value).toLocaleString('en-US');
 const add=(id,title,text,tab,desk,target)=>{if(!blockers.some(x=>x.id===id))blockers.push({id,title,text,tab,desk,target});};
 const check=(id,title,tab,desk,target,read)=>{try{return read();}catch(error){add(id,title,error.message,tab,desk,target);return null;}};
 const p=v.me,assigned=Object.values(plan.allocation||{}).reduce((n,x)=>n+Number(x||0),0),unallocated=p.stats.staff-assigned;
 if(!plan.focus||!v.territories[plan.focus])add('focus','Choose a focus market','Select an open market for market-dependent orders.','markets',null,'#marketMap');
 if(!['a','b'].includes(plan.decision))add('decision','Answer the executive call','Choose a response before submitting this month.','operations','monthly','#decisionGrid');
 if(unallocated!==0||Object.values(plan.allocation||{}).some(x=>!Number.isInteger(x)||x<0))add('allocation','Allocate your employees',unallocated>0?unallocated+' employees remain unallocated.':unallocated<0?Math.abs(unallocated)+' employees are over-allocated.':'Staff allocations must be non-negative whole numbers.','operations','monthly','#staffGrid');
 const project=check('project-quote','Review project instructions','operations','projects','#projectGrid',()=>E.projectPlanStatus(p,plan));
 const quote=project?.quote||check('budget-quote','Review shared spending','operations','forecast','#planBudget',()=>E.planBudget(p,plan));
 if(quote&&(quote.discretionaryRemaining??quote.remaining)<0)add('budget','Reduce optional commitments','Optional spending exceeds available cash or capital room by '+cash(-(quote.discretionaryRemaining??quote.remaining))+'. Existing obligations remain owed.','operations','projects','#planBudget');
 if(project&&!project.eligible)add('projects','Resolve initiative conflict',project.reason,'operations','projects','#projectGrid');
 const lifecycle=p.facilityLifecycle?check('facility-quote','Review office instructions','markets',null,'#facilityLifecyclePanel',()=>E.lifecycleInstructionQuote(v,p,plan)):null;
 if(lifecycle&&!lifecycle.status.eligible)add('facilities','Resolve office staffing or funding',lifecycle.status.reason,'markets',null,'#facilityLifecyclePanel');
 const functions=p.departmentFunctions?check('functions-quote','Review department instructions','workforce',null,'#departmentPanel',()=>E.departmentFunctionsQuote(v,p,plan)):null;
 if(functions&&!functions.status.eligible)add('functions','Resolve department capacity or funding',functions.status.reason,'workforce',null,'#departmentPanel');
 if(functions?.delivery?.rows){const uncovered=functions.delivery.rows.filter(row=>row.planned.shortfall>0);if(uncovered.length)warnings.push({id:'coverage',title:'Allocated staff does not mean all work is covered',text:uncovered.map(row=>row.id.replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/^./,c=>c.toUpperCase())+': '+Number(row.planned.shortfall.toFixed(3))+' quarter-work units uncovered').join(' · ')+'. Four physical units equal one employee-month; this is task delivery, not unused headcount.',tab:'workforce',target:'#peopleOverview',peopleDesk:'overview'});}
 const action=check('action-quote','Review competitive action','competition',null,'#competitiveActions',()=>E.competitiveActionStatus(p,plan.competitiveAction||'none'));
 if(action&&!action.eligible)add('action','Competitive action unavailable',action.reason,'competition',null,'#competitiveActions');
 if(plan.contractBid){
  if((plan.allocation?.business||0)<1)add('bid-staff','Assign a banker to the service bid','A service bid requires at least one Business banker. Your bid has been retained; assign staff or explicitly remove it.','operations','monthly','#staffGrid');
  if(plan.opportunity)add('pursuit','Choose one relationship pursuit','Select either a service bid or a pipeline opportunity, not both.','markets',null,'#pipeline');
 }
 if(plan.opportunity&&!v.opportunities?.some(o=>o.id===plan.opportunity))add('opportunity','Review expired opportunity','This opportunity is no longer available. Choose another pursuit or clear it.','markets',null,'#pipeline');
 if(E.planHires(plan)>E.hireLimit(p))add('hires','Reduce combined recruitment','Generalists and specialists share the '+E.hireLimit(p)+'-banker monthly limit.','operations','projects','#hiringPanel');
 if(typeof pendingDepartmentForm==='function'&&pendingDepartmentForm(v))warnings.push({id:'unstaged-leaders',title:'Leadership form has unstaged edits',text:'These entries are not in your monthly plan. Preview and stage them, or explicitly discard them.',tab:'workforce',target:'#departmentPanel'});
 if(p.workforce&&typeof workforceForm==='function'&&workforceForm(v).dirty)warnings.push({id:'unstaged-training',title:'Training form has unstaged edits',text:'Training and reserve entries are not yet in your monthly plan. Preview and stage them, or discard them.',tab:'workforce',target:'#workforcePanel'});
 return {blockers,warnings,quote,project,lifecycle,functions,unallocated};
}
function navigatePlanReview(item){
 setWorkspaceTab(item.tab);
 if(item.desk)setOperationsDesk(item.desk);
 if(item.tab==='workforce'&&typeof setPeopleDesk==='function')setPeopleDesk(item.peopleDesk||(item.id==='unstaged-training'?'development':item.id==='unstaged-leaders'?'leadership':currentView().me.departmentFunctions?'coverage':'leadership'));
 const target=$(item.target)||$('[data-workspace="'+item.tab+'"]');
 if(!target)return;
 for(let parent=target;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
 if(item.tab==='workforce'&&item.id==='unstaged-leaders'&&$('#departmentDesk'))$('#departmentDesk').open=true;
 target.setAttribute?.('tabindex','-1');target.focus?.({preventScroll:true});target.scrollIntoView?.({block:'center',behavior:'auto'});
}
function renderMonthlyPlanReview(v,review){
 const mount=$('#monthlyPlanReview');if(!mount)return;
 const locked=v.me.submitted||v.gameOver,items=[...review.blockers,...review.warnings];
 const summary=$('#monthlyReviewSummary');
 if(summary)summary.textContent='Review this month · '+(locked?'plan locked':review.blockers.length+' required')+' · '+review.warnings.length+' warning'+(review.warnings.length===1?'':'s')+' · '+monthlyChangeRows(v).length+' edited instructions';
 const list=(rows,kind)=>rows.map(item=>'<li class="plan-review-item '+kind+'"><div><b>'+esc(item.title)+'</b><p>'+esc(item.text)+'</p></div><button type="button" class="btn" data-plan-review="'+items.indexOf(item)+'">Go to '+esc(item.tab)+'</button></li>').join('');
 mount.innerHTML='<div class="plan-review-heading"><b>'+(locked?'Plan locked':review.blockers.length?review.blockers.length+' required action'+(review.blockers.length===1?'':'s'):'Required decisions complete')+'</b><span>Current policies → edited form → staged plan → active after resolution</span></div>'+
  (locked?'<p class="small">Inspection is available. Orders cannot change while locked; use Recall when available.</p>':review.blockers.length?'<ul class="plan-review-list">'+list(review.blockers,'is-blocker')+'</ul>':'<p class="small">No listed submission blockers. Headcount allocation is separate from service coverage; check warnings before locking.</p>')+
  (review.warnings.length?'<details><summary>'+review.warnings.length+' planning warning'+(review.warnings.length===1?'':'s')+' · review tradeoffs</summary><ul class="plan-review-list">'+list(review.warnings,'is-warning')+'</ul></details>':'')+
  '<details><summary>Optional opportunities · no action required</summary><p class="small">Hiring, research, new projects, relationship pursuits and special competitive actions are optional. Existing recurring commitments remain active until you change them. A quiet month is a valid choice.</p></details><div id="monthlyChanges"></div>';
 renderMonthlyChanges(v);
 const campaign=game||view,owner=v.me.id,cycle=v.cycle;
 $$('[data-plan-review]').forEach(button=>button.addEventListener('click',()=>{const now=currentView();if((game||view)!==campaign||now?.me.id!==owner||now?.cycle!==cycle)return;const item=items[Number(button.dataset.planReview)];if(item)navigatePlanReview(item);}));
}

// Owner-only UI baseline: never serialized into a campaign or sent to a peer.
// Captured after management has prepared the opening draft, so delegated
// defaults are not mislabeled as manual edits. Undo means restore that draft.
let monthlyChangesState={generation:0,baseline:null,owner:null,cycle:null,proposal:null,open:false,message:''};
function resetMonthlyChanges(v){
 monthlyChangesState={generation:monthlyChangesState.generation+1,baseline:JSON.parse(JSON.stringify(draft)),owner:v.me.id,cycle:v.cycle,proposal:null,open:false,message:''};
}
function monthlyChangeRows(v){
 const state=monthlyChangesState;
 if(!state.baseline||state.owner!==v.me.id||state.cycle!==v.cycle)return [];
 const rows=[],walk=(before,after,path)=>{
  if(JSON.stringify(before)===JSON.stringify(after))return;
  if(path.length===1&&path[0]==='newProjects'&&Array.isArray(before)&&Array.isArray(after)){
   for(const key of new Set([...before,...after]))if(before.includes(key)!==after.includes(key))rows.push({path:['newProjects',key],before:before.includes(key),after:after.includes(key),initiative:true});
   return;
  }
  if(before&&after&&typeof before==='object'&&typeof after==='object'&&!Array.isArray(before)&&!Array.isArray(after)){
   for(const key of new Set([...Object.keys(before),...Object.keys(after)]))walk(before[key],after[key],[...path,key]);
  }else rows.push({path,before,after});
 };
 walk(state.baseline,draft,[]);
 // newProject is a compatibility alias for the first newProjects entry.
 return rows.filter(row=>row.path[0]!=='newProject');
}
function monthlyChangeName(path){
 const names={allocation:'Staff allocation',hires:'Generalist recruitment',specialistHires:'Specialist recruitment',investments:'Research funding',newProjects:'New initiatives',focus:'Action target',decision:'Executive response',competitiveAction:'Competitive action',capitalAction:'Emergency board request',departmentFunctionsPolicy:'Department delivery',facilityLifecyclePolicy:'Facility instructions',departmentPolicy:'Department budgets',leaderOrders:'Leader instructions',workforcePolicy:'Workforce policy',specializations:'Operating model',products:'Product settings',contractBid:'Service bid',contractExit:'Contract exit',opportunity:'Relationship pursuit'};
 const words=value=>String(value).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ');
 return path.map((part,i)=>i===0?(names[part]||words(part)):words(part)).join(' · ');
}
function monthlyChangeValue(v,value,path){
 if(value===undefined||value===null||value==='none'||value==='')return 'None';
 if(typeof value==='boolean')return value?'Requested':'Not requested';
 if(Array.isArray(value))return value.length?value.map(x=>monthlyChangeValue(v,x,path)).join(', '):'None';
 if(typeof value==='object')return Object.entries(value).map(([k,x])=>monthlyChangeName([k])+': '+monthlyChangeValue(v,x,path)).join('; ');
 if(path[0]==='focus')return v.territories[value]?.name||String(value);
 if(path[0]==='newProjects')return v.projects[value]?.name||String(value);
 if(path[0]==='decision')return 'Response '+String(value).toUpperCase();
 if(path[0]==='investments')return '$'+Number(value).toLocaleString('en-US');
 return String(value).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ');
}
function monthlyChangeTiming(path){
 switch(path[0]){
  case 'hires':case 'specialistHires':return 'Reports next month; recurring payroll follows. Shared recruitment limit applies.';
  case 'investments':return 'Funding settles this month; completed capability benefits begin next month.';
  case 'newProjects':return 'Starts at resolution if eligible; completion depends on project workload and execution capacity.';
  case 'specializations':return 'Becomes permanent at resolution when its capability prerequisite is met.';
  case 'focus':return 'Changes the target used by market-dependent instructions. Review those orders together.';
  case 'allocation':return 'Shared employee pool this month; delivery, training and facility work also reserve capacity.';
  default:return 'Staged, not yet active. Resolution applies eligibility checks; existing commitments are not cancelled by editing this draft.';
 }
}
function monthlyUndoIsCurrent(v,proposal){
 return !!proposal&&(game||view)===proposal.campaign&&monthlyChangesState.generation===proposal.generation&&v?.me.id===proposal.owner&&v?.cycle===proposal.cycle&&!v.me.submitted&&!v.gameOver&&JSON.stringify(draft)===proposal.stamp;
}
function proposeMonthlyUndo(v,index){
 v=currentView();if(!v)return null;
 if(v.me.submitted||v.gameOver)return null;
 const row=monthlyChangeRows(v)[index];if(!row)return null;
 const next=JSON.parse(JSON.stringify(draft));let parent=next;
 if(row.initiative){const key=row.path[1];next.newProjects=next.newProjects.filter(x=>x!==key);if(row.before)next.newProjects.push(key);}
 else{
  for(const part of row.path.slice(0,-1)){if(!parent||typeof parent!=='object')return null;parent=parent[part];}
  const key=row.path.at(-1);if(row.before===undefined)delete parent[key];else parent[key]=JSON.parse(JSON.stringify(row.before));
 }
 if(row.path[0]==='newProjects')next.newProject=next.newProjects[0]||null;
 const before=monthlyPlanReview(v,draft),after=monthlyPlanReview(v,next);
 const previous=new Set(before.blockers.map(x=>x.id+'|'+x.text));
 const conflicts=after.blockers.filter(x=>!previous.has(x.id+'|'+x.text));
 const proposal={campaign:game||view,generation:monthlyChangesState.generation,owner:v.me.id,cycle:v.cycle,stamp:JSON.stringify(draft),row,next,conflicts,before:before.quote,after:after.quote};
 monthlyChangesState.proposal=proposal;monthlyChangesState.open=true;monthlyChangesState.message='';return proposal;
}
function applyMonthlyUndo(v){
 v=currentView();
 const proposal=monthlyChangesState.proposal;
 if(!monthlyUndoIsCurrent(v,proposal)){monthlyChangesState.proposal=null;monthlyChangesState.message='The plan or session changed. Review a fresh undo proposal.';return false;}
 draft=JSON.parse(JSON.stringify(proposal.next));monthlyChangesState.proposal=null;
 monthlyChangesState.message='Restored '+monthlyChangeName(proposal.row.path)+'. Other instructions were retained; review any remaining blockers.';return true;
}
function renderMonthlyChanges(v){
 const mount=$('#monthlyChanges');if(!mount)return;
 const state=monthlyChangesState,rows=monthlyChangeRows(v),locked=v.me.submitted||v.gameOver;
 if(state.proposal&&!monthlyUndoIsCurrent(v,state.proposal)){state.proposal=null;state.message='The plan or session changed. Review a fresh undo proposal.';}
 const proposal=state.proposal;
 const quoteText=quote=>quote?'$'+Math.round(quote.total).toLocaleString('en-US'):'Unavailable';
 mount.innerHTML='<details id="monthlyChangesDrawer" '+(state.open?'open':'')+'><summary>Monthly changes · '+rows.length+' edited instruction'+(rows.length===1?'':'s')+'</summary><p class="small">Compared with your opening draft, including delegated defaults. Undo restores that opening value, not necessarily last month’s policy. Unstaged form entries are excluded. Recurring commitments remain active.</p>'+
  (rows.length?'<ol class="plan-change-list">'+rows.map((row,index)=>'<li><div><b>'+esc(monthlyChangeName(row.path))+'</b><p>'+esc(monthlyChangeValue(v,row.before,row.path))+' → <strong>'+esc(monthlyChangeValue(v,row.after,row.path))+'</strong></p><p class="micro">'+esc(monthlyChangeTiming(row.path))+'</p></div><button type="button" class="btn" data-monthly-undo="'+index+'" '+(locked?'disabled':'')+'>Review undo</button></li>').join('')+'</ol>':'<p class="small">No edits relative to the opening draft. Optional action is not required.</p>')+
  (proposal?'<section class="monthly-undo-confirm" role="group" aria-label="Confirm instruction undo"><b>Restore '+esc(monthlyChangeName(proposal.row.path))+'?</b><p class="small">Whole-plan quoted commitments: '+quoteText(proposal.before)+' → '+quoteText(proposal.after)+'. This is not a per-order price or a forecast of every cash flow.</p>'+(proposal.conflicts.length?'<p class="bad">Undo introduces these submission conflicts. Other orders will not be removed:</p><ul>'+proposal.conflicts.map(x=>'<li>'+esc(x.text)+'</li>').join('')+'</ul>':'<p class="small">No additional conflicts found by the monthly review. Final eligibility checks still apply.</p>')+'<button class="btn" type="button" data-monthly-confirm>Confirm undo</button> <button class="btn" type="button" data-monthly-cancel>Cancel</button></section>':'')+
  '<p role="status" class="small">'+esc(state.message)+'</p></details>';
 const campaign=game||view,owner=v.me.id,cycle=v.cycle,stamp=JSON.stringify(draft),generation=state.generation;
 const fresh=()=>{const now=currentView();return (game||view)===campaign&&now?.me.id===owner&&now?.cycle===cycle&&monthlyChangesState.generation===generation&&JSON.stringify(draft)===stamp&&!now.me.submitted&&!now.gameOver?now:null;};
 $('#monthlyChangesDrawer')?.addEventListener('toggle',event=>{if(monthlyChangesState.generation===generation)monthlyChangesState.open=event.target.open;});
 mount.onclick=event=>{
  const button=event.target.closest?.('button');if(!button||!mount.contains(button))return;
  const now=fresh();if(!now)return;
  if(button.hasAttribute('data-monthly-undo')){proposeMonthlyUndo(now,Number(button.dataset.monthlyUndo));renderMonthlyChanges(now);mount.querySelector('[data-monthly-confirm]')?.focus();}
  else if(button.hasAttribute('data-monthly-cancel')){const path=state.proposal?.row.path;state.proposal=null;state.message='Undo cancelled. Your staged plan is unchanged.';renderMonthlyChanges(now);const index=monthlyChangeRows(now).findIndex(row=>JSON.stringify(row.path)===JSON.stringify(path));mount.querySelector('[data-monthly-undo="'+index+'"]')?.focus();}
  else if(button.hasAttribute('data-monthly-confirm')&&applyMonthlyUndo(now)){render();$('#monthlyChangesDrawer')?.querySelector('summary')?.focus();}
 };
}
