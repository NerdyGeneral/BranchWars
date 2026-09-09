let selectedWorkforceRole = 'service';
function stageSpecialistHire(v, role, step,token=workforceEditToken(v)) {
  return stagePeopleHire(role,step,token);
}
function stageWorkforcePolicy(v, role, budget, reserve,token=workforceEditToken(v)) {
  if (!workforceEditCurrent(token)) return false;
  const candidate = JSON.parse(JSON.stringify(draft));
  candidate.workforcePolicy = JSON.parse(JSON.stringify(candidate.workforcePolicy || v.me.workforce.policy));
  candidate.workforcePolicy.training[role] = budget;
  candidate.workforcePolicy.reserve = reserve;
  try {
    E.normalizeWorkforcePlan(v.me, candidate);
    draft = candidate;
    renderProjects(v); renderReady(v);
    return true;
  } catch (e) { toast(e.message); renderWorkforce(v); return false; }
}
function renderWorkforce(v) {
  if(workspaceTab==='workforce'){renderPeopleOverview(v);renderPeopleWorkspace(v);}
  if (!v.me.departmentOffice || workspaceTab === 'workforce') renderDepartments(v);
  renderHouseholds(v);
  renderCollections(v);
  renderFinancialGroup(v);
  $('#workforceNav').classList.toggle('hidden', !v.me.workforce);
  if (!v.me.workforce) {
    $('#workforcePanel').innerHTML = '';
    if (workspaceTab === 'workforce') setWorkspaceTab('overview');
    return;
  }
  if (workspaceTab !== 'workforce') return;
  let review;
  try {
    review = E.workforceReview(v.me, draft, v.economy);
    if(v.me.departmentOffice){
      const departments=E.departmentBudgetQuote(v.me,draft);
      review.rows=review.rows.map(r=>{
        const department=departments.rows.find(d=>d.role===r.role);
        return {...r,productive:departments.productiveAllocation[r.role],teaching:department.teaching,
          active:department.productiveSpecialists,bonus:department.bonus};
      });
    }
  }
  catch (e) { $('#workforcePanel').innerHTML = '<p class="bad">' + esc(e.message) + '</p>'; return; }
  const row = review.rows.find(r => r.role === selectedWorkforceRole) || review.rows[0];
  const disabled = v.me.submitted || v.gameOver || gh.active&&gh.paused ? 'disabled' : '';
  const actual = v.me.operatingReport, forecast = review.forecast;
  const morale = v.financialGroupVersion===7?E.operatingWorkloadMorale(v.me,Object.fromEntries(review.rows.map(r=>[r.role,(r.productive??r.assigned)+r.bonus]))):null;
  const table = review.rows.map(r => '<tr><th>' + esc(r.name) + '</th><td>' + r.count + ' / ' + r.assigned + (v.me.departmentOffice?' / '+r.productive:'') + '</td><td>' +
    (r.count ? r.skill + '/100' : 'Not hired') + '</td><td>+' + r.bonus.toFixed(2) + '</td><td>' + money(r.payroll) + '</td></tr>').join('');
  $('#workforcePanel').innerHTML = `
    <div class="section-head"><div><h2>WORKFORCE &amp; DEPARTMENT DEVELOPMENT</h2><p class="small muted">Build expertise without losing control of payroll. Changes are staged until both plans lock.</p></div><span class="small">${review.generalists} generalists · ${v.me.stats.staff - review.generalists} specialists</span></div>
    <div class="workforce-summary">
      <div><span>Existing salary premiums</span><b>${money(review.payroll)}/month</b><small>In addition to base payroll; paid even if reassigned.</small></div>
      <div><span>Forecast training spend</span><b>${money(review.training.total)}/month</b><small>${review.training.paused ? 'All department training paused by cash/capital protection.' : 'Only existing specialists below 100 skill can train.'}</small></div>
      <div><span>Combined recruiting</span><b>${E.planHires(draft)}/${E.hireLimit(v.me)} bankers · ${money(review.quote.recruiting)}</b><small>Generalists and specialists share this limit. Recruits arrive next month.</small></div>
    </div>
    <div class="table-scroll"><table class="regional-table"><thead><tr><th>Specialty</th><th>${v.me.departmentOffice?'Qualified / assigned / productive staff':'Qualified / assigned staff'}</th><th>Skill</th><th>Effective staff bonus</th><th>Salary premium/month</th></tr></thead><tbody>${table}</tbody></table></div>
    ${morale?`<div id="workforceMorale" class="workforce-card"><h3>WORKLOAD &amp; RETENTION</h3><p class="small">Morale: <b>${v.me.stats.morale}/100</b>. Draft workload-only change: <b>${morale.change>0?'+':''}${morale.change.toFixed(2)}/month</b>, before the 0–100 bounds, executive events, rival actions and consequences.</p><p class="micro">Base recovery ${morale.base}; Retail workload penalty ${morale.serviceShortfall.toFixed(2)}; Operations penalty ${morale.operationsShortfall.toFixed(2)}. Productive staff and specialist expertise count; a paid teacher is unavailable. Low morale does not prohibit hiring. Recruits cost cash, add recurring payroll and arrive next month. At 5 morale or less, a bank with more than five employees can lose a banker during consequences.</p></div>`:''}
    <p class="micro muted">Qualified specialists are part of total headcount, not additional bankers. A specialist outside their own department works as a generalist: no cross-department skill bonus. Business expertise is split between sales and reserved delivery; it is never counted twice.</p>
    <div class="workforce-grid">
      <section class="workforce-card"><label for="workforceDepartment">DEPARTMENT</label><select id="workforceDepartment">${review.rows.map(r => '<option value="' + r.role + '" ' + (r.role === row.role ? 'selected' : '') + '>' + esc(r.name) + '</option>').join('')}</select>
        <h3>${esc(row.name)}</h3><p class="small">${esc(row.effect)}</p>
        <p class="small">${v.me.departmentOffice?`${row.assigned} assigned · ${row.teaching?'1 reserved for paid teaching':'0 reserved for teaching'} · ${row.productive} productive bankers. ${row.active} of ${row.count} qualified bankers producing. Forecast effective capacity: <b>${row.productive} + ${row.bonus.toFixed(2)}</b>.`:`${row.active} of ${row.count} qualified bankers working in this department. Current effective capacity: <b>${row.assigned} + ${row.bonus.toFixed(2)}</b>.`}</p>
        <div class="workforce-skill" role="meter" aria-label="${esc(row.name)} skill" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${row.skill}"><span style="width:${row.skill}%"></span></div>
        <p class="micro">Skill ${row.skill}/100 → <b>${row.nextSkill}/100</b> after forecast training, before new recruits. Recruits enter at skill 20 and dilute the team average; they do not train or produce this month.</p>
        <p class="small">${row.hires} recruits staged for this specialty. Compare all five recruit types and their shared limit in Recruitment.</p><button type="button" class="btn" id="workforceRecruitment">Open recruitment</button>
        <p class="micro">Each hire costs the normal size-adjusted recruiting fee <b>plus ${money(row.premium)}</b>. Ongoing pay: $18K base plus ${money(E.SPECIALIST_ROLES[row.role].payroll)} premium/month. Existing efficiency discounts affect base pay, not specialist premiums.</p>
      </section>
      <section class="workforce-card"><h3>RECURRING TRAINING MANDATE</h3>
        <label for="workforceBudget">${esc(row.name)} monthly ceiling</label><select id="workforceBudget" ${disabled}>${E.WORKFORCE_TRAINING_BUDGETS.map(n => '<option value="' + n + '" ' + (n === row.budget ? 'selected' : '') + '>' + (n ? money(n) + '/month' : 'Paused · $0') + '</option>').join('')}</select>
        <label for="workforceReserve">Bank-wide cash reserve to protect ($)</label><input id="workforceReserve" type="number" min="0" max="10000000" step="1000" value="${draft.workforcePolicy.reserve}" ${disabled}>
        <p class="small">${money(row.trainingSpend)} forecast spend in this department. Each skill point costs $1K per specialist; ${v.me.departmentOffice ? 'ordinary classes cap at four points, while paid qualified leaders can raise the cap shown in Departments.' : 'at most four points per month.'} Training stops at skill 100. Unused ceilings are not spent.</p>
        <p class="micro ${review.training.paused ? 'bad' : 'muted'}">Training is reserved alongside the full plan and included in operating expenses—do not count it twice. If the combined training bill breaches the protected cash reserve or capital limit, every department pauses together. Events and rival actions can change actual affordability.</p>
      </section>
    </div>
    <section class="workforce-card"><p class="small" id="workforceFormStatus" role="status"></p><button class="btn" type="button" id="previewWorkforceForm" ${disabled}>Preview training changes</button> <button class="btn" type="button" id="stageWorkforceForm" disabled>Stage reviewed training</button> <button class="btn" type="button" id="discardWorkforceForm" ${disabled}>Discard unstaged training</button><div id="workforceFormPreview"></div></section>
    <div class="workforce-results"><h3>ECONOMICS &amp; TIMING</h3><p class="small">Current draft bank operating profit: <b>${money(forecast.profit - (forecast.fundingLoss || 0))}</b>, including existing specialist premiums and affordable training. This excludes executive events, rival moves, new project completions and recruiting expenditure. No immediate benefit from new hires or this month's training.</p>
    <p class="micro">${actual ? 'Last completed month ' + actual.cycle + ': specialist premiums ' + money(actual.specialistPayroll || 0) + '; paid training ' + money(actual.workforceTraining || 0) + (actual.workforceTrainingPaused ? ' — reserve protection paused training.' : '.') : 'Paid training and realized premiums appear after the first completed month.'}</p>
    <details><summary>How expertise changes capacity</summary><p class="micro">Each qualified specialist assigned to their own department contributes 0.10 + 0.003 × skill effective bankers (0.16 at entry, capped at 0.40). Retail expertise also improves workload coverage and therefore persistent goodwill. Relationship bankers support sales or service contracts according to the staff reservation. Credit analysts increase originations, not guaranteed profits. Risk expertise improves credit controls and project capacity. Generalists remain cheaper and fully flexible; training never upgrades every department at once.</p></details></div>`;
  const token=workforceEditToken(v);
  $('#workforceDepartment').addEventListener('change', e => { if(!workforceEditCurrent(token))return;selectedWorkforceRole = e.target.value; renderWorkforce(currentView()); });
  $('#workforceRecruitment').addEventListener('click',()=>{if(currentView()?.me.id===v.me.id)setPeopleDesk('recruitment',{focus:true});});
  bindWorkforceForm(v,row);
}

// One read-only people overview, using the same physical reservations and
// delivery quotes as the detailed desks. No inferred customers or profit.
function peopleOverviewModel(v,plan=draft){
 if(!v.me.workforce)return null;
 plan=JSON.parse(JSON.stringify(plan));
 E.normalizeWorkforcePlan(v.me,plan);
 const w={generalists:v.me.stats.staff-Object.values(v.me.workforce.departments).reduce((sum,row)=>sum+row.count,0),quote:E.planBudget(v.me,plan)},f=v.me.departmentFunctions?E.departmentFunctionsQuote(v,v.me,plan):null;
 const assigned=Object.values(plan.allocation).reduce((sum,n)=>sum+n,0);
 const tasks=f?.delivery?.rows.map(row=>({id:row.id,workload:row.workload,served:row.planned.served,shortfall:row.planned.shortfall}))||[];
 const pools=f?Object.keys(f.attribution.assignedQuarters).map(role=>({role,assigned:f.attribution.assignedQuarters[role],teaching:f.attribution.paidTeacherQuarters[role],retained:Object.values(f.attribution.exactRetainedQuarters).reduce((n,row)=>n+row[role],0),extra:f.allocatedPools[role],rounding:f.attribution.residualRoundingHold[role],remaining:f.remainingPools[role]-f.overcommittedPools[role]})):[];
 return {w,f,tasks,pools,assigned,unallocated:v.me.stats.staff-assigned,headcount:v.me.stats.staff,hires:E.planHires(plan),hireLimit:E.hireLimit(v.me)};
}
function renderPeopleOverview(v){
 const mount=$('#peopleOverview');if(!mount)return;
 let model;try{model=peopleOverviewModel(v);}catch(error){mount.innerHTML='<p class="bad" role="status">People overview unavailable: '+esc(error.message)+'. Review your workforce instructions; no orders were changed.</p>';return;}
 if(!model){mount.innerHTML='';return;}
 const {w,f,tasks,pools}=model,short=tasks.filter(row=>row.shortfall>0),roles={service:'Retail & service',business:'Business banking',lending:'Lending',operations:'Operations & risk'},number=n=>Number(n.toFixed(3)).toLocaleString('en-US');
 const effects={offerSales:['Relationship offers','Less capacity to win additional customer products.'],commercialRelationships:['Commercial relationships','Less business and merchant acquisition capacity.'],householdSupport:['Household service','Service coverage and persistent customer goodwill can suffer.'],applicationProcessing:['Application processing','Fewer pending applications can activate; waiting customers can abandon.'],commercialDelivery:['Contract delivery','Signed service agreements receive less coverage.'],creditAdministration:['Credit administration','New lending is constrained; zero coverage pauses ordinary origination, not existing loan servicing.'],collections:['Collections','Delinquent loan servicing has less capacity.'],technology:['Technology','Platform service and disruption resilience are constrained.'],risk:['Risk & compliance','Credit controls and examination resilience are constrained.'],treasury:['Treasury','Locked-term deposit handling has less coverage.'],people:['People management','Paid training gains and management performance are constrained.']};
 const button=(key,label)=>'<button class="btn" type="button" data-people-desk="'+key+'">'+label+'</button>';
 mount.innerHTML='<header class="section-head"><div><h2>PEOPLE &amp; OPERATIONS</h2><p class="small">Who is available, which work is covered, and what needs your attention this month.</p></div><button type="button" class="btn" data-help-topic="coverage">How coverage works</button></header><div class="people-summary">'+
  '<div><span>Employees on payroll now</span><b>'+model.headcount+'</b><small>'+w.generalists+' generalists · '+(model.headcount-w.generalists)+' specialists. Specialists are included, not extra employees.</small></div>'+
  '<div><span>Headcount allocated</span><b>'+model.assigned+' / '+model.headcount+'</b><small>'+(model.unallocated===0?'All assigned. This does not guarantee work coverage.':number(Math.abs(model.unallocated))+(model.unallocated>0?' unassigned; allocate before submitting.':' over-allocated; reduce assignments.'))+'</small></div>'+
  '<div><span>Quoted task coverage</span><b>'+(f?short.length+' task'+(short.length===1?'':'s')+' short':'Detailed function model off')+'</b><small>'+(f?'Physical/vendor work before specialist effects and other business limits.':'Use the enabled workforce and operating forecasts; no function books were added.')+'</small></div>'+
  '<div><span>Recruits arriving next month</span><b>'+model.hires+' / '+model.hireLimit+' limit</b><small>'+money(w.quote.recruiting)+' combined signing cost. No new-hire production this month.</small></div></div>'+
  '<nav class="people-shortcuts" aria-label="People management shortcuts">'+button('allocation','Allocate employees')+button('functions','Review work coverage')+button('recruitment','Hire generalists')+button('development','Specialists & training')+button('leadership','Leaders & budgets')+'</nav>'+
  (f?'<section><h3>'+(short.length?'Work at risk this month':'Quoted tasks have coverage')+'</h3><p class="small">'+(short.length?'Start with the work you want to protect. More employees alone will not help unless their time is assigned to that task.':'Coverage is a capacity estimate, not guaranteed revenue or a guarantee against disruption.')+'</p>'+
  (short.length?'<div class="table-scroll" tabindex="0" aria-label="Work shortages and business consequences"><table class="regional-table"><thead><tr><th>Work</th><th>Covered / required</th><th>Uncovered</th><th>Why it matters</th></tr></thead><tbody>'+short.map(row=>'<tr><th>'+esc(effects[row.id]?.[0]||row.id)+'</th><td>'+number(row.served)+' / '+number(row.workload)+'</td><td>'+number(row.shortfall)+'</td><td>'+esc(effects[row.id]?.[1]||'Task delivery has less capacity.')+'</td></tr>').join('')+'</tbody></table></div>':'')+
  '<p class="micro">Units above are quarter-work units: four physical units equal one employee-month. Vendors supply task work, not employees. Fractions preserve the engine’s exact task forecast; display rounds to three decimals.</p>'+
  '<details><summary>Where the shared employee time goes</summary><p class="small">Reservations use the same employee pool. Time retained for existing work is not available again for new quotas. Remaining below is before facility/sales use—not idle staff. Specialist expertise can improve output but cannot be spent as another physical employee.</p><div class="table-scroll" tabindex="0" aria-label="Shared employee time accounting"><table class="regional-table"><thead><tr><th>Department</th><th>Assigned</th><th>Teaching</th><th>Retained work</th><th>Extra function work</th><th>Fraction held</th><th>Remaining before facilities/sales</th></tr></thead><tbody>'+pools.map(row=>'<tr><th>'+roles[row.role]+'</th>'+['assigned','teaching','retained','extra','rounding','remaining'].map(key=>'<td>'+number(row[key])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="micro">Assigned − teaching − retained − extra − held fraction = remaining. Negative remaining is an overcommitment, not additional capacity.</p></details></section>':'')+
  '<details><summary>Choose a remedy—not an automatic best plan</summary><ul class="small"><li>Reassign available time: no new hire required, but the work losing that time may deteriorate.</li><li>Order permitted vendor capacity: helps the supported task this month if paid; recurring costs and supplier limits apply.</li><li>Recruit: shared hiring limit, signing cost and permanent payroll; arrivals cannot repair this month’s shortage.</li><li>Train or improve leadership: consumes budget and sometimes teaching time now; qualified staff gain capability later.</li><li>Reduce optional demand or defer expansion: preserves capacity, at the cost of growth or commitments. Existing obligations do not disappear.</li></ul><p class="small">Use the detailed desks to compare and stage your choice. This overview never borrows, hires, closes facilities or submits a turn for you.</p></details><hr>';
 const campaign=game||view,owner=v.me.id,cycle=v.cycle;
 mount.onclick=event=>{
  const control=event.target.closest?.('[data-people-desk]');if(!control||!mount.contains(control))return;
  const now=currentView();if((game||view)!==campaign||now?.me.id!==owner||now?.cycle!==cycle)return;
  const key=control.dataset.peopleDesk;
  if(key==='allocation'){navigatePlanReview({tab:'operations',desk:'monthly',target:'#staffGrid'});return;}
  if(['recruitment','development','leadership','functions'].includes(key)){setPeopleDesk(key==='functions'?'coverage':key,{focus:true});return;}
  if(key==='leadership'&&now.me.departmentFunctions){departmentFunctionsLive.tab='leadership';renderDepartments(now);}
  if(key==='functions'&&now.me.departmentFunctions){departmentFunctionsLive.tab='functions';renderDepartments(now);}
  const target=$(key==='development'?'#workforcePanel':now.me.departmentOffice?'#departmentPanel':'#workforcePanel');
  if(target){for(const detail of target.querySelectorAll?.('details')||[])if(detail.id==='departmentDesk')detail.open=true;target.setAttribute?.('tabindex','-1');target.focus?.({preventScroll:true});target.scrollIntoView?.({block:'start',behavior:'auto'});}
 };
}
