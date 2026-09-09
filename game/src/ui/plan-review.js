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
 if(functions?.rows){const uncovered=functions.rows.filter(row=>row.shortfall>0);if(uncovered.length)warnings.push({id:'coverage',title:'Allocated staff does not mean all work is covered',text:uncovered.map(row=>E.DepartmentFunctions.FUNCTIONS[row.id].name+': '+row.shortfall+' quarter-work units uncovered').join(' · '),tab:'workforce',target:'#departmentPanel'});}
 const action=check('action-quote','Review competitive action','competition',null,'#competitiveActions',()=>E.competitiveActionStatus(p,plan.competitiveAction||'none'));
 if(action&&!action.eligible)add('action','Competitive action unavailable',action.reason,'competition',null,'#competitiveActions');
 if(plan.contractBid){
  if((plan.allocation?.business||0)<1)add('bid-staff','Assign a banker to the service bid','A service bid requires at least one Business banker. Your bid has been retained; assign staff or explicitly remove it.','operations','monthly','#staffGrid');
  if(plan.opportunity)add('pursuit','Choose one relationship pursuit','Select either a service bid or a pipeline opportunity, not both.','markets',null,'#pipeline');
 }
 if(plan.opportunity&&!v.opportunities?.some(o=>o.id===plan.opportunity))add('opportunity','Review expired opportunity','This opportunity is no longer available. Choose another pursuit or clear it.','markets',null,'#pipeline');
 if(E.planHires(plan)>E.hireLimit(p))add('hires','Reduce combined recruitment','Generalists and specialists share the '+E.hireLimit(p)+'-banker monthly limit.','operations','projects','#hiringPanel');
 if(typeof pendingDepartmentForm==='function'&&pendingDepartmentForm(v))warnings.push({id:'unstaged-leaders',title:'Leadership form has unstaged edits',text:'These entries are not in your monthly plan. Preview and stage them, or explicitly discard them.',tab:'workforce',target:'#departmentPanel'});
 return {blockers,warnings,quote,project,lifecycle,functions,unallocated};
}
function navigatePlanReview(item){
 setWorkspaceTab(item.tab);
 if(item.desk)setOperationsDesk(item.desk);
 if(item.tab==='workforce'&&item.id==='unstaged-leaders'&&currentView().me.departmentFunctions){departmentFunctionsLive.tab='leadership';renderDepartments(currentView());}
 const target=$(item.target)||$('[data-workspace="'+item.tab+'"]');
 if(!target)return;
 for(let parent=target;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
 if(item.tab==='workforce'&&item.id==='unstaged-leaders'&&$('#departmentDesk'))$('#departmentDesk').open=true;
 target.setAttribute?.('tabindex','-1');target.focus?.({preventScroll:true});target.scrollIntoView?.({block:'center',behavior:'auto'});
}
function renderMonthlyPlanReview(v,review){
 const mount=$('#monthlyPlanReview');if(!mount)return;
 const locked=v.me.submitted||v.gameOver,items=[...review.blockers,...review.warnings];
 const list=(rows,kind)=>rows.map(item=>'<li class="plan-review-item '+kind+'"><div><b>'+esc(item.title)+'</b><p>'+esc(item.text)+'</p></div><button type="button" class="btn" data-plan-review="'+items.indexOf(item)+'">Go to '+esc(item.tab)+'</button></li>').join('');
 mount.innerHTML='<div class="plan-review-heading"><b>'+(locked?'Plan locked':review.blockers.length?review.blockers.length+' required action'+(review.blockers.length===1?'':'s'):'Required decisions complete')+'</b><span>Current policies → edited form → staged plan → active after resolution</span></div>'+
  (locked?'<p class="small">Inspection is available. Orders cannot change while locked; use Recall when available.</p>':review.blockers.length?'<ul class="plan-review-list">'+list(review.blockers,'is-blocker')+'</ul>':'<p class="small">No listed submission blockers. Headcount allocation is separate from service coverage; check warnings before locking.</p>')+
  (review.warnings.length?'<details><summary>'+review.warnings.length+' planning warning'+(review.warnings.length===1?'':'s')+' · review tradeoffs</summary><ul class="plan-review-list">'+list(review.warnings,'is-warning')+'</ul></details>':'')+
  '<details><summary>Optional opportunities · no action required</summary><p class="small">Hiring, research, new projects, relationship pursuits and special competitive actions are optional. Existing recurring commitments remain active until you change them. A quiet month is a valid choice.</p></details>';
 const campaign=game||view,owner=v.me.id,cycle=v.cycle;
 $$('[data-plan-review]').forEach(button=>button.addEventListener('click',()=>{const now=currentView();if((game||view)!==campaign||now?.me.id!==owner||now?.cycle!==cycle)return;const item=items[Number(button.dataset.planReview)];if(item)navigatePlanReview(item);}));
}
