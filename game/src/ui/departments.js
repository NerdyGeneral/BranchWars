// Owner-only Workforce desk. All economics and mandate proposals come
// from the versioned department engine; opening or previewing this desk spends nothing.
let departmentUiState={owner:null,open:false,revision:0,proposal:null,form:null};
function departmentFormSelectors(){
  const fields=['reserve','vendors','research','leadership','mode','staffLimit','vendorLimit','salesFloor','training','trainingTarget',...Object.keys(E.SPECIALIST_ROLES).map(role=>'training-'+role)];
  return [...fields.map(key=>'#department-'+key),...Object.keys(E.SPECIALIST_ROLES).map(role=>'#departmentLeader-'+role)];
}
function departmentFormScope(v){
  const defaults=E.defaultDepartmentPlan(v.me);
  return {campaign:game||view,owner:v.me.id,cycle:v.cycle,policy:JSON.stringify({policy:draft.departmentPolicy||defaults.departmentPolicy,orders:draft.leaderOrders||defaults.leaderOrders})};
}
function pendingDepartmentForm(v){
  const saved=departmentUiState.form;if(!saved)return null;
  if(!v.me.departmentOffice){departmentUiState.form=null;return null;}
  const scope=departmentFormScope(v);
  if(v.me.submitted||v.gameOver||Object.keys(scope).some(key=>scope[key]!==saved.scope[key])){departmentUiState.form=null;return null;}
  return saved;
}
function rememberDepartmentForm(v){
  // Preserve raw strings, including unfinished/invalid numbers. This is private
  // UI scratch state, not an accepted plan, save field or network message.
  departmentUiState.form={scope:departmentFormScope(v),values:Object.fromEntries(departmentFormSelectors().map(selector=>[selector,$(selector).value]))};
}
function refreshDepartmentWorkspace(v){
  if(typeof renderWorkforce==='function'&&workspaceTab==='workforce')renderWorkforce(v);
  else renderDepartments(v);
}
function departmentUiMoney(value){const n=Math.round(Number(value)||0);return (n<0?'−':'')+'$'+Math.abs(n).toLocaleString();}
function departmentUiRole(role){return E.ROLES[role].name;}
function departmentUiCurrent(v,signature,campaign){
  const now=currentView();return !!(now?.me?.departmentOffice&&draft&&(game||view)===campaign&&now.me.id===v.me.id&&now.cycle===v.cycle&&
    draftOwner===now.me.id&&lastCycle===now.cycle&&!now.me.submitted&&!now.gameOver&&JSON.stringify(draft)===signature);
}
function stageDepartmentPlan(v,policy,orders,signature=JSON.stringify(draft),campaign=game||view){
  if(!departmentUiCurrent(v,signature,campaign)){toast('The bank, month or plan changed. Reopen the Departments desk.');return false;}
  try{const next=JSON.parse(JSON.stringify(draft)),now=currentView();
    next.departmentPolicy=JSON.parse(JSON.stringify(policy));next.leaderOrders=JSON.parse(JSON.stringify(orders));
    E.normalizeDepartmentPlan(now.me,next);E.departmentBudgetQuote(now.me,next);
    draft=next;departmentUiState.proposal=null;departmentUiState.form=null;renderReady(now);refreshDepartmentWorkspace(now);
    $('#departmentInstructionStatus').textContent='Department limits and leader orders staged. No appointments or cash payments occur until the month resolves.';return true;
  }catch(error){toast(error.message);return false;}
}
function departmentQuoteMarkup(quote){
  const l=quote.leadership;
  return '<div class="credit-summary"><div><span>Proposed leadership expense</span><b>'+departmentUiMoney(l.total)+'</b><small>Salary '+departmentUiMoney(l.salary)+' · appointments '+departmentUiMoney(l.appointments)+' · demotion/replacement '+departmentUiMoney(l.severance)+'.</small></div>'+
    '<div><span>Quoted paid training</span><b>'+departmentUiMoney(quote.training.total)+'</b><small>'+(quote.training.paused?'Training paused by funding/reserve limits.':'Quoted instruction costs; envelopes alone do not purchase training.')+'</small></div>'+
    '<div><span>Cash after quoted compensation</span><b>'+departmentUiMoney(quote.projectedCash)+'</b><small>Not a full-month bank forecast. Department reserve (the effective shared reserve may be higher): '+departmentUiMoney(quote.reserve)+'.</small></div></div>'+
    '<p class="small">'+(quote.paused?'Compensation remains unpaid: affected leaders cannot teach. Existing liabilities are not erased by cutting an envelope.':'This compensation preview has no remaining arrears; teaching still requires eligible staff and funded classes.')+'</p>'+
    '<div class="table-scroll" tabindex="0" aria-label="Department training and staff opportunity cost"><table class="regional-table"><thead><tr><th>Department</th><th>Assigned / productive staff</th><th>Class spend / teaching potential</th><th>Leadership teaching</th><th>Unpaid after compensation</th></tr></thead><tbody>'+
    quote.rows.map(row=>'<tr><th>'+esc(departmentUiRole(row.role))+'</th><td>'+row.staff+' / '+quote.productiveAllocation[row.role]+'</td><td>'+departmentUiMoney(quote.training.paused?0:row.training?.spend||0)+' / '+(quote.training.paused?0:row.training?.gain||0)+'</td><td>'+
      (row.teaching&&!quote.training.paused?'One assigned banker reserved for teaching':'No leadership teaching')+'</td><td>'+departmentUiMoney(row.arrears)+'</td></tr>').join('')+'</tbody></table></div>'+
    '<p class="micro">Teaching needs an existing leader, eligible colleagues, paid compensation and funded training. The teaching banker is unavailable for productive sales/service work during that class. These skill figures are teaching potential before task-delivery limits. Development shows the operating forecast after those limits; actual skill benefits require settlement, not a preview. Ordinary workforce pay and training are not charged again here.</p>';
}
function departmentLeaderCard(v,role,orders){
  const office=v.me.departmentOffice,leader=office.leaders[role],profile=leader?E.DEPARTMENT_LEADERS[leader.profile]:null,locked=v.me.submitted||v.gameOver;
  return '<section class="credit-policy"><h4>'+esc(departmentUiRole(role))+'</h4><p class="small">'+(leader?
    esc(profile.name)+'<br><span class="micro">'+esc(leader.id)+' · appointed month '+integer(leader.appointed)+' · experience '+integer(leader.experience)+' · '+integer(leader.classes)+' taught classes</span>':'No department leader appointed.')+'</p>'+
    '<p class="micro">Unpaid compensation: '+departmentUiMoney(office.arrears[role])+'. '+(leader?'Recurring leadership compensation '+departmentUiMoney(profile.salary)+'/month; cumulative salary paid '+departmentUiMoney(leader.compensation)+'.':'Demotion does not erase prior department payables.')+'</p>'+
    (office.arrears[role]?'<p class="notice">Leadership teaching suspended until this department’s compensation is paid.</p>':'')+
    '<label for="departmentLeader-'+role+'">Explicit leader order<select id="departmentLeader-'+role+'"'+(locked?' disabled':'')+'><option value="retain"'+(orders[role]===null?' selected':'')+'>Retain current arrangement</option>'+
    '<option value="none"'+(orders[role]==='none'?' selected':'')+'>Demote current leader · severance owed</option>'+
    Object.entries(E.DEPARTMENT_LEADERS).map(([key,p])=>'<option value="'+key+'"'+(orders[role]===key?' selected':'')+'>'+esc(p.name)+' · '+departmentUiMoney(p.salary)+'/month</option>').join('')+'</select></label>'+
    '<details><summary>Profile strengths, costs and qualifications</summary>'+Object.entries(E.DEPARTMENT_LEADERS).map(([,p])=>'<p class="micro"><b>'+esc(p.name)+'</b> · appointment '+departmentUiMoney(p.appointment)+' · monthly '+departmentUiMoney(p.salary)+'. '+esc(p.description)+'</p>').join('')+
    '<p class="micro">Promote an existing specialist assigned to this department; appointment creates no employee. Changing profile replaces the leader and their individual experience, with appointment and severance expenses. Demotion is explicit and does not dismiss the employee.</p></details></section>';
}
function departmentUiField(key,label,value,disabled){
  const bound=key.startsWith('training-')?'training':({staffLimit:'staff',salesFloor:'staff',vendorLimit:'vendorPoints'}[key]||key),max=E.DEPARTMENT_POLICY_LIMITS?.[bound];
  return '<label for="department-'+key+'">'+label+'<input type="number" id="department-'+key+'" min="0" step="1"'+(max===undefined?'':' max="'+max+'"')+' value="'+value+'"'+disabled+'></label>';
}
function renderDepartments(v){
  if(v.me.departmentOffice)pendingDepartmentForm(v);else departmentUiState.form=null;
  if(v.me.departmentFunctions)return renderDepartmentFunctionsWorkspace(v);
  return renderDepartmentLeadership(v);
}
function renderDepartmentLeadership(v,navigation=''){
  const mount=$('#departmentPanel'),p=v.me;departmentUiState.revision++;
  if(!p.departmentOffice){mount.innerHTML='';mount.classList.add('hidden');departmentUiState={owner:null,open:false,revision:departmentUiState.revision,proposal:null,form:null};return;}
  mount.classList.remove('hidden');
  if(departmentUiState.owner!==p.id)departmentUiState={owner:p.id,open:false,revision:departmentUiState.revision,proposal:null,form:null};
  const pending=pendingDepartmentForm(v);
  const defaults=E.defaultDepartmentPlan(p),policy=draft.departmentPolicy||defaults.departmentPolicy,orders=draft.leaderOrders||defaults.leaderOrders;
  const disabled=p.submitted||v.gameOver?' disabled':'',m=policy.mandate;
  let quoteContent;
  try{quoteContent=departmentQuoteMarkup(E.departmentBudgetQuote(p,{...draft,departmentPolicy:policy,leaderOrders:orders}));}
  catch(error){quoteContent='<p class="notice">'+esc(error.message)+' Review conflicting instructions before staging.</p>';}
  mount.innerHTML=navigation+'<details id="departmentDesk"'+(departmentUiState.open?' open':'')+'><summary>DEPARTMENTS &amp; LEADERSHIP · four operating roles</summary><section class="credit-policy group-credit-policy">'+
    '<p class="small">Persistent spending ceilings and existing-staff leadership. Envelopes are limits, not prepaid funds or extra money. Appointments and demotions remain explicit monthly orders.</p>'+
    '<details><summary>Spending envelopes, common reserve and delegation limits</summary><div class="credit-controls">'+
    departmentUiField('reserve','Common discretionary cash reserve ($)',policy.reserve,disabled)+
    ['vendors','research','leadership'].map(key=>departmentUiField(key,key==='vendors'?'Shared vendor ceiling ($/month)':key==='research'?'Shared research ceiling ($/month)':'Leadership appointment/compensation ceiling ($/month)',policy.envelopes[key],disabled)).join('')+
    Object.keys(E.SPECIALIST_ROLES).map(role=>departmentUiField('training-'+role,departmentUiRole(role)+' training ceiling ($/month)',policy.envelopes.training[role],disabled)).join('')+'</div>'+
    '<p class="micro">These controls do not automatically rewrite existing research, vendor or workforce orders. A conflicting lower ceiling must be reconciled before it can be staged. Existing owed compensation survives reserve or budget changes.</p>'+
    '<label for="department-mode">Delivery proposal mandate<select id="department-mode"'+disabled+'><option value="manual"'+(m.mode==='manual'?' selected':'')+'>Manual · preserve current instructions</option><option value="maintain-service"'+(m.mode==='maintain-service'?' selected':'')+'>Prepare bounded service/research proposal</option></select></label>'+
    '<div class="credit-controls">'+departmentUiField('staffLimit','Maximum delegated delivery staff',m.staffLimit,disabled)+departmentUiField('vendorLimit','Maximum delegated vendor units',m.vendorLimit,disabled)+
    departmentUiField('salesFloor','Minimum commercial sales staff',m.salesFloor,disabled)+departmentUiField('trainingTarget','Delegated training skill target',m.trainingTarget,disabled)+
    '<label for="department-training">Training proposal<select id="department-training"'+disabled+'><option value="off"'+(!m.training?' selected':'')+'>Off · preserve training instructions</option><option value="on"'+(m.training?' selected':'')+'>Prepare training within ceilings</option></select></label></div></details>'+
    '<div class="credit-controls">'+Object.keys(E.SPECIALIST_ROLES).map(role=>departmentLeaderCard(v,role,orders)).join('')+'</div>'+
    '<button type="button" class="btn" id="previewDepartments"'+disabled+'>Preview form</button> <button type="button" class="btn" id="stageDepartments"'+disabled+'>Stage limits and leader orders</button>'+
    ' <button type="button" class="btn" id="discardDepartmentForm"'+disabled+'>Discard unstaged edits</button>'+
    '<p id="departmentInstructionStatus" class="small" role="status">Form changes are not staged until you choose Stage.</p><div id="departmentQuote" aria-live="polite">'+quoteContent+'</div>'+
    '<details><summary>Prepare a bounded operating proposal</summary><p class="small">Uses your staged mandate, not unstaged form edits. Prepare never applies a plan. Review exact changes before choosing Stage proposal. Managers cannot borrow, hire, close facilities, acquire, change products or submit a turn.</p>'+
    '<button type="button" class="btn" id="prepareDepartmentDraft"'+disabled+'>Prepare proposal from staged limits</button><div id="departmentProposal" aria-live="polite"></div></details>'+
    (p.departmentOffice.report?'<p class="small">Last settled month '+integer(p.departmentOffice.report.cycle)+': leadership expense '+departmentUiMoney(p.departmentOffice.report.expense)+
      ', compensation invoices paid '+departmentUiMoney(p.departmentOffice.report.paid)+', still owed '+departmentUiMoney(p.departmentOffice.report.arrears)+'. Payment of old invoices is not a second expense.</p>':'')+
    '<p class="micro">Departments share your bank’s cash and existing staff. Leaders can accelerate paid training but take a banker away from productive work while teaching; stronger skills must justify the compensation and lost capacity.</p></section></details>';
  bindDepartments(v);
  if(pending){
    for(const [selector,value]of Object.entries(pending.values))$(selector).value=value;
    $('#departmentInstructionStatus').textContent='Unstaged edits restored for this bank and month. Preview or Stage to use them; your monthly plan is unchanged.';
    $('#departmentQuote').innerHTML='<p class="notice">Unstaged form: preview these values to refresh costs. No instructions have been applied.</p>';
  }
}
function departmentUiRead(){
  const defaults=E.defaultDepartmentPlan(currentView().me),policy=JSON.parse(JSON.stringify(draft.departmentPolicy||defaults.departmentPolicy));
  const n=key=>{const raw=$('#department-'+key).value;if(String(raw).trim()==='')throw Error('Enter a number for '+key+'; a blank field is not zero.');return Number(raw);};
  policy.reserve=n('reserve');for(const key of ['vendors','research','leadership'])policy.envelopes[key]=n(key);
  const orders={};for(const role of Object.keys(E.SPECIALIST_ROLES)){policy.envelopes.training[role]=n('training-'+role);const raw=$('#departmentLeader-'+role).value;orders[role]=raw==='retain'?null:raw;}
  policy.mandate={mode:$('#department-mode').value,staffLimit:n('staffLimit'),vendorLimit:n('vendorLimit'),salesFloor:n('salesFloor'),training:$('#department-training').value==='on',trainingTarget:n('trainingTarget')};
  return {policy,orders};
}
function prepareDepartmentProposal(v,signature=JSON.stringify(draft),campaign=game||view){
  if(!departmentUiCurrent(v,signature,campaign))return false;
  try{
    const prepared=E.departmentDraft(v.me,JSON.parse(JSON.stringify(draft)),v.economy),next=JSON.parse(JSON.stringify(draft));
    // Strict UI allowlist: proposed service/research/training only. Preserve all
    // manually chosen bids, facility/leader orders, products and other strategies.
    const allowed=['servicePolicy','investments','workforcePolicy'],changes=[];
    for(const key of allowed)if(JSON.stringify(prepared.plan[key])!==JSON.stringify(draft[key])){
      if(prepared.plan[key]===undefined)throw Error('Prepared proposal omitted '+key+'.');
      next[key]=JSON.parse(JSON.stringify(prepared.plan[key]));changes.push({key,before:draft[key],after:next[key]});
    }
    const unrelated=key=>!allowed.includes(key);
    if(Object.keys(prepared.plan).some(key=>unrelated(key)&&JSON.stringify(prepared.plan[key])!==JSON.stringify(draft[key]))||
      Object.keys(draft).some(key=>unrelated(key)&&!Object.hasOwn(prepared.plan,key)))throw Error('Delegation proposed an unauthorized strategic change.');
    E.normalizeDepartmentPlan(v.me,next);E.departmentBudgetQuote(v.me,next);
    departmentUiState.proposal={signature,campaign,owner:v.me.id,cycle:v.cycle,next};
    $('#departmentProposal').innerHTML='<p class="small">'+(changes.length?changes.length+' instruction groups proposed. Your plan is unchanged.':'No changes proposed under the current mandate.')+'</p>'+
      departmentProposalComparison(v,changes,next)+
      '<p class="micro">'+(prepared.notes||[]).map(esc).join(' · ')+'</p>'+
      (changes.length?'<button type="button" class="btn" id="stageDepartmentProposal">Stage reviewed proposal</button>':'');
    const proposal=departmentUiState.proposal;
    if(changes.length)$('#stageDepartmentProposal').addEventListener('click',()=>{
      if(departmentUiState.proposal!==proposal){toast('This proposal was replaced. Review the current proposal.');return false;}
      return stageDepartmentProposal(v);
    });
    return true;
  }catch(error){departmentUiState.proposal=null;toast(error.message);return false;}
}
function departmentProposalComparison(v,changes,next){
  const rows=[],labels={servicePolicy:'Commercial delivery',investments:'Research funding',workforcePolicy:'Training policy',staff:'Reserved delivery employees',outsourcing:'Vendor work units',reserve:'Protected cash reserve',training:'Monthly training ceiling',service:'Retail & service',business:'Business banking',lending:'Lending',operations:'Operations & risk',network:'Branch network',digital:'Digital platform',commercial:'Commercial banking',acquisition:'Acquisitions'};
  const visit=(before,after,path)=>{if(JSON.stringify(before)===JSON.stringify(after))return;if(before&&after&&typeof before==='object'&&typeof after==='object'&&!Array.isArray(before)&&!Array.isArray(after)){for(const key of new Set([...Object.keys(before),...Object.keys(after)]))visit(before[key],after[key],[...path,key]);return;}
    const moneyField=path[0]==='investments'||path[0]==='workforcePolicy',format=value=>value===undefined?'Not set':moneyField&&typeof value==='number'?departmentUiMoney(value):String(value);
    rows.push('<tr><th>'+esc(path.map(key=>labels[key]||key).join(' · '))+'</th><td>'+esc(format(before))+'</td><td>'+esc(format(after))+'</td></tr>');};
  for(const change of changes)visit(change.before,change.after,[change.key]);
  if(!rows.length)return '';
  const before=E.planBudget(v.me,draft),after=E.planBudget(v.me,next);
  return '<h4>Before / after · exact instruction changes</h4><div class="table-scroll" tabindex="0" aria-label="Department proposal comparison"><table class="regional-table"><thead><tr><th>Instruction</th><th>Staged plan</th><th>Proposed plan</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div><p class="small">Whole-plan quoted commitments: '+departmentUiMoney(before.total)+' → '+departmentUiMoney(after.total)+'. This is not a second charge or a forecast of every cash flow. More delivery time leaves less for commercial sales and other shared work; additional vendor orders cost money even when unused.</p><p class="micro">Only the listed service, research and training instructions may change. The proposal cannot borrow, hire, close facilities, acquire, appoint leaders, change products or submit your turn.</p>';
}
function stageDepartmentProposal(v){
  const proposal=departmentUiState.proposal;
  if(!proposal||!departmentUiCurrent(v,proposal.signature,proposal.campaign)||proposal.owner!==v.me.id||proposal.cycle!==v.cycle){toast('The proposal is stale. Prepare the current plan again.');return false;}
  try{const next=JSON.parse(JSON.stringify(proposal.next)),now=currentView();E.normalizeDepartmentPlan(now.me,next);E.departmentBudgetQuote(now.me,next);
    draft=next;departmentUiState.proposal=null;renderReady(now);refreshDepartmentWorkspace(now);return true;
  }catch(error){toast(error.message);return false;}
}
function bindDepartments(v){
  const signature=JSON.stringify(draft),campaign=game||view,revision=departmentUiState.revision;
  const current=()=>revision===departmentUiState.revision&&departmentUiCurrent(v,signature,campaign);
  $('#departmentDesk').addEventListener('toggle',()=>{if(revision===departmentUiState.revision&&(game||view)===campaign&&currentView()?.me?.id===v.me.id)departmentUiState.open=!!$('#departmentDesk').open;});
  $('#stageDepartments').addEventListener('click',()=>{if(!current())return;try{const form=departmentUiRead();stageDepartmentPlan(v,form.policy,form.orders,signature,campaign);}catch(error){$('#departmentInstructionStatus').textContent=error.message;toast(error.message);}});
  $('#discardDepartmentForm').addEventListener('click',()=>{if(!current())return;departmentUiState.form=null;departmentUiState.proposal=null;refreshDepartmentWorkspace(v);$('#departmentInstructionStatus').textContent='Unstaged edits discarded. Your staged monthly plan is unchanged.';});
  $('#previewDepartments').addEventListener('click',()=>{if(!current())return;try{
    const form=departmentUiRead(),next=JSON.parse(JSON.stringify(draft));next.departmentPolicy=form.policy;next.leaderOrders=form.orders;
    E.normalizeDepartmentPlan(v.me,next);$('#departmentQuote').innerHTML=departmentQuoteMarkup(E.departmentBudgetQuote(v.me,next));
    $('#departmentInstructionStatus').textContent='Preview only. Your monthly plan is unchanged.';
  }catch(error){$('#departmentInstructionStatus').textContent=error.message;toast(error.message);}});
  $('#prepareDepartmentDraft').addEventListener('click',()=>{if(current())prepareDepartmentProposal(v,signature,campaign);});
  for(const selector of departmentFormSelectors())for(const event of ['input','change'])$(selector).addEventListener(event,()=>{
    if(!current())return;rememberDepartmentForm(v);departmentUiState.proposal=null;$('#departmentProposal').innerHTML='';
    $('#departmentQuote').innerHTML='<p class="notice">Form changed. Preview or stage the updated limits and orders.</p>';
    $('#departmentInstructionStatus').textContent='Form changed; the staged plan remains unchanged.';
  });
}
