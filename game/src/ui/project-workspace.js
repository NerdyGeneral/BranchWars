// Browse first, inspect one proposal, then stage through the shared command.
// The catalogue no longer renders every project's full rulebook at once.
let projectWorkspace={identity:null,owner:null,category:'facilities',selected:null};
function projectCategory(p){return p.facility||/branch|office|hub/i.test(p.name)?'facilities':/risk|compliance|workflow|operations/i.test(p.name)?'operations':'growth';}
function renderProjectCatalogue(v,tactical){
 if(projectWorkspace.identity!==(game||view)||projectWorkspace.owner!==v.me.id)projectWorkspace={identity:game||view,owner:v.me.id,category:'facilities',selected:null};
 const categories={facilities:'Offices & network',growth:'Growth & marketing',operations:'Operations & controls',all:'All initiatives'};
 const items=tactical.filter(([,p])=>projectWorkspace.category==='all'||projectCategory(p)===projectWorkspace.category);
 const selected=items.find(([key])=>key===projectWorkspace.selected)||items[0];projectWorkspace.selected=selected?.[0]||null;
 const token=opportunityToken(v),chosen=E.planInitiatives(draft),budget=E.planBudget(v.me,draft,v);
 const list=items.map(([key,p])=>{const staged=chosen.includes(key),running=v.me.projects.some(x=>x.key===key),status=projectChoiceStatus(v,key);
  const target=E.projectPlanTarget(draft,key);
  return '<button type="button" class="object-row" data-project-inspect="'+esc(key)+'" aria-pressed="'+(selected?.[0]===key)+'"><span><b>'+esc(p.name)+'</b><small>'+money(E.projectStartTerms(v,v.me,key,target)?.cost??p.cost)+' · '+(p.target?esc(v.territories[target].name):'Bank-wide')+'</small></span><span class="object-tag">'+(staged?'Staged':running?'In progress':status.eligible?'Available':'Needs review')+'</span></button>';
 }).join('');
 let detail='<div class="workbench-empty">No initiatives in this category.</div>';
 if(selected){const [key,p]=selected,target=E.projectPlanTarget(draft,key),status=projectChoiceStatus(v,key),terms=E.projectStartTerms(v,v.me,key,target),staged=chosen.includes(key),effect=renderProjectEffect(v.me,key,target);
  detail='<section class="object-detail" aria-labelledby="projectDetailTitle"><span class="eyebrow">'+(staged?'STAGED THIS MONTH':'PROJECT REVIEW')+'</span><h3 id="projectDetailTitle" tabindex="-1">'+esc(p.name)+'</h3><p>'+esc(p.desc)+'</p><div class="decision-facts"><div><small>One-time cost</small><b>'+money(terms?.cost??p.cost)+'</b></div><div><small>Delivery work</small><b>'+(terms?.cycles??p.cycles)+' units</b></div><div><small>Execution required</small><b>'+(p.capacity||1.5).toFixed(1)+'</b></div><div><small>Remaining plan budget</small><b>'+money(budget.remaining)+'</b></div></div>'+
   '<p class="small">'+(p.target?'Location: <b>'+esc(v.territories[target].name)+'</b>. '+(staged&&draft.projectTargets?.[key]?'This order keeps its location when monthly focus changes.':'Open a market on the map to stage construction there.'):'This initiative applies bank-wide.')+'</p>'+projectEntryPriceNote(v,key,target)+(effect?'<div class="decision-outcome"><h4>What changes when it finishes</h4>'+effect+'</div>':'')+
   (!status.eligible?'<p class="notice warn">'+esc(status.reason)+'</p>':'')+'<button type="button" class="btn primary" data-project="'+esc(key)+'" '+(!status.eligible||!opportunityCurrent(token)?'disabled':'')+'>'+(staged?'Remove from this month':'Stage this initiative')+'</button><p class="micro muted">This edits the monthly plan only. Cash is not paid now. Work progresses over future months using available execution capacity.</p></section>';
 }
 $('#projectGrid').innerHTML='<div class="object-workspace"><div class="workbench-toolbar" role="group" aria-label="Initiative categories">'+Object.entries(categories).map(([key,name])=>'<button type="button" class="btn" data-project-category="'+key+'" aria-pressed="'+(projectWorkspace.category===key)+'">'+name+'</button>').join('')+'</div><div class="object-columns"><nav class="object-directory" aria-label="Project catalogue">'+list+'</nav>'+detail+'</div></div>';
 $$('[data-project-category]').forEach(el=>el.addEventListener('click',()=>{if(!opportunityCurrent(token,false))return;projectWorkspace.category=el.dataset.projectCategory;projectWorkspace.selected=null;renderProjects(currentView());$('[data-project-category="'+projectWorkspace.category+'"]')?.focus?.({preventScroll:true});}));
 $$('[data-project-inspect]').forEach(el=>el.addEventListener('click',()=>{if(!opportunityCurrent(token,false))return;projectWorkspace.selected=el.dataset.projectInspect;renderProjects(currentView());$('#projectDetailTitle')?.focus?.({preventScroll:true});}));
}
