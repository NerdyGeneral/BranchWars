// Owner-local working forms. No extra saved rules, accounts or resource pools.
let groupWorkspace={identity:null,owner:null,cycle:null,signature:null,revision:0,agencySection:'funding',company:null,forms:{},dirty:{}};
function groupContext(v){return {...opportunityToken(v),attempt:connectionAttempt,revision:groupWorkspace.revision};}
function groupContextCurrent(token,write=true,exact=true){return opportunityCurrent(token,write)&&token.attempt===connectionAttempt&&token.revision===groupWorkspace.revision&&(!exact||token.stamp===JSON.stringify(draft));}
function groupPolicyForm(kind){
 const policy=kind==='capital'?{bankDividend:draft.groupPolicy.bankDividend,bankSupport:draft.groupPolicy.bankSupport}:draft.agencyPolicy;
 return Object.fromEntries(Object.entries(policy||{}).map(([key,value])=>[key,typeof value==='boolean'?value:value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):String(value)]));
}
function groupSelection(v){
 const identity=game||view,signature=JSON.stringify(draft);
 if(groupWorkspace.identity!==identity||groupWorkspace.owner!==v.me.id){
  groupWorkspace={identity,owner:v.me.id,cycle:null,signature:null,revision:groupWorkspace.revision,agencySection:'funding',company:null,forms:{},dirty:{}};
  financialGroupDesk='capital';financialGroupDeskOwner=v.me.id;
 }
 if(groupWorkspace.cycle!==v.cycle){groupWorkspace.cycle=v.cycle;groupWorkspace.forms={};groupWorkspace.dirty={};}
 if(groupWorkspace.signature!==signature){
  for(const kind of ['capital','agency'])if(!groupWorkspace.dirty[kind])groupWorkspace.forms[kind]=groupPolicyForm(kind);
  groupWorkspace.signature=signature;
 }
 return groupWorkspace;
}
function groupWhole(value,label){
 if(String(value).trim()===''||!Number.isSafeInteger(Number(value))||Number(value)<0)throw Error(label+' must be a whole dollar amount of zero or more.');
 return Number(value);
}
function groupFormProposal(v,kind,form){
 const candidate=JSON.parse(JSON.stringify(draft));
 if(kind==='capital')candidate.groupPolicy={...candidate.groupPolicy,bankDividend:groupWhole(form.bankDividend,'Bank dividend'),bankSupport:groupWhole(form.bankSupport,'Bank support')};
 else candidate.agencyPolicy={launch:!!form.launch,capital:groupWhole(form.capital,'Agency capital'),staff:Number(form.staff),target:form.target,outreach:Number(form.outreach),supportCap:groupWhole(form.supportCap,'Parent support cap'),dividend:groupWhole(form.dividend,'Agency distribution'),...(v.me.agency.version===2?{roles:JSON.parse(JSON.stringify(form.roles)),maintainCredentials:!!form.maintainCredentials}:{})};
 E.normalizeGroupPlan(v.me,candidate);E.normalizeAgencyPlan(v.me,candidate);
 if(v.companySharesVersion===1)E.normalizeCompanySharePlan(v,v.me,candidate);
 return {candidate,quote:kind==='agency'?E.agencyQuote(v.me,candidate.agencyPolicy):E.groupCapitalQuote(v.me)};
}
function groupCapitalFormRead(){
 const form=groupWorkspace.forms.capital;
 for(const [key,id]of [['bankDividend','groupBankDividend'],['bankSupport','groupBankSupport']])if($('#'+id))form[key]=$('#'+id).value;
 return {...form};
}
function groupAgencyFormRead(v){
 const form=groupWorkspace.forms.agency;
 if(groupWorkspace.agencySection==='funding'){
  for(const key of ['capital','supportCap','dividend'])if($('#agency-'+key))form[key]=$('#agency-'+key).value;
  form.launch=v.me.agency.status!=='active'&&!!$('#agency-launch')?.checked;
 }
 return {...form};
}
function groupFormChanged(kind){
 groupWorkspace.dirty[kind]=true;
 const status=kind==='capital'?'groupCapitalStatus':'agencyInstructionStatus';
 $('#'+status).textContent='Unstaged edits. Preview or stage to apply this form; other instructions are unchanged.';
 if(kind==='agency')$('#agencyInstructionQuote').innerHTML='<p class="notice">The form changed. Preview the updated costs before staging.</p>';
}
function groupResetForm(kind){groupWorkspace.forms[kind]=groupPolicyForm(kind);groupWorkspace.dirty[kind]=false;}
function agencySectionNavigation(){
 return '<div class="workbench-toolbar" role="group" aria-label="Agency actions">'+[['funding','Funding & launch'],['operations','People & sales'],['results','Results & covers']].map(([key,label])=>'<button type="button" class="btn" id="agency-section-'+key+'" aria-pressed="'+(groupWorkspace.agencySection===key)+'">'+label+'</button>').join('')+'</div>';
}
function agencyChoiceControl(key,label,options,form,disabled){
 return '<fieldset class="group-choice"><legend>'+label+'</legend><div>'+options.map(([value,name,hint])=>'<button type="button" class="btn" id="agency-choice-'+key+'-'+value+'" aria-pressed="'+(String(form[key])===String(value))+'"'+disabled+'><b>'+esc(name)+'</b>'+(hint?'<small>'+esc(hint)+'</small>':'')+'</button>').join('')+'</div></fieldset>';
}
function agencyWorkingContent(v,quote,disabled){
 const a=v.me.agency,form=groupWorkspace.forms.agency;
 const number=(key,label,max)=>'<label for="agency-'+key+'">'+label+'<input id="agency-'+key+'" type="number" min="0" step="1" max="'+max+'" value="'+esc(form[key])+'"'+disabled+'></label>';
 if(groupWorkspace.agencySection==='results')return agencyResultsMarkup(v);
 const funding=groupWorkspace.agencySection==='funding';
 const content=funding?
  (a.version===2?agencyPermissionMarkup(v,quote):'')+(a.status!=='active'?'<label class="agency-launch-label" for="agency-launch"><input type="checkbox" id="agency-launch"'+(form.launch?' checked':'')+disabled+'> '+(a.status==='failed'?'Relaunch':'Launch')+' agency this month</label><p class="small">Launch requires at least '+agencyDollars(quote.launchMinimum)+' of existing parent cash, including '+agencyDollars(quote.setupCost)+' setup expense. Recruitment and monthly expenses also use that capital. New bank dividends cannot pay for this month’s launch.</p>':'<h4>Fund the agency or distribute earned profit</h4>')+
  '<div class="credit-controls">'+number('capital',a.status!=='active'?'Parent → agency: initial capital ($)':'Parent → agency: additional capital ($)',quote.availableParentCash)+number('dividend','Agency → parent: one-month distribution ($)',quote.distributionLimit)+'</div><p class="small">Choose one capital direction. These move existing cash; they are not operating earnings.</p>'+
  '<details class="group-support"><summary>Standing safety net · '+agencyDollars(form.supportCap)+'/month cap</summary>'+number('supportCap','Maximum monthly parent support ($)',E.AGENCY_RULES.maxSupport)+'<p class="micro">Permission to cover an operating shortfall, not a guaranteed payment. It uses remaining parent cash after other commitments and persists until revised. Bank deposits are not a subsidiary bailout.</p></details><button type="button" class="btn" id="agencyParentFunding">Inspect parent funding & limits</button>':
  (a.version===2?agencyProfessionalControls(v,form,disabled):'<p class="small">Hire dedicated employees using agency cash. Each new hire costs '+agencyDollars(E.AGENCY_RULES.recruitment)+', plus the salaries below.</p>'+agencyChoiceControl('staff','Staff after settlement',[1,2,3,4].map(n=>[n,n+' '+(n===1?'employee':'employees'),agencyDollars(n*E.AGENCY_RULES.salary)+'/month salaries · '+n*E.AGENCY_RULES.staffCapacity+' service units']),form,disabled))+
  agencyChoiceControl('target','Focus for new relationships',Object.entries(E.AGENCY_PRODUCTS).map(([key,p])=>[key,p.name,p.load+' service '+(p.load===1?'unit':'units')+' per cover']),form,disabled)+
  agencyChoiceControl('outreach','Recurring outreach',[[0,'None','$0 outreach cost'],[1,'Focused',agencyDollars(E.AGENCY_RULES.outreachCost)+'/month'],[2,'Intensive',agencyDollars(2*E.AGENCY_RULES.outreachCost)+'/month']],form,disabled)+
  '<p class="micro">Focus affects new acquisitions, not existing service. Paid outreach strengthens competition but cannot guarantee wins, premiums or profit. Staff, focus and outreach persist after settlement.</p>';
 return content+'<div class="workbench-actions"><button type="button" class="btn" id="previewAgency"'+disabled+'>Preview whole agency instruction</button><button type="button" class="btn primary" id="stageAgency"'+disabled+'>Stage agency instruction</button><button type="button" class="btn" id="discardAgencyForm">Discard unstaged edits</button></div><p class="small" id="agencyInstructionStatus" role="status">'+(groupWorkspace.dirty.agency?'Unstaged edits restored. Preview checks these against the current monthly plan.':'Controls show the staged plan. Editing changes only a working form until Stage.')+'</p><div id="agencyInstructionQuote" aria-live="polite">'+(groupWorkspace.dirty.agency?'<p class="notice">Preview the complete instruction, including changes on the other agency view.</p>':agencyQuoteMarkup(quote))+'</div>';
}
function bindGroupWorkingForms(v){
 const token=groupContext(v),guard=(write=true)=>{if(groupContextCurrent(token,write))return true;toast('The bank, month, plan or connection changed. Reopen Financial Group before editing.');return false;};
 bindCompanyShareControls(v,guard);
 bindCompanyControlControls(v,guard);
 for(const id of ['groupBankDividend','groupBankSupport'])$('#'+id)?.addEventListener('input',()=>{if(guard()){groupCapitalFormRead();groupFormChanged('capital');}});
 $('#discardGroupCapital')?.addEventListener('click',()=>{if(!guard(false))return;groupResetForm('capital');renderFinancialGroup(currentView());});
 $('#previewGroupCapital')?.addEventListener('click',()=>{if(!guard())return;try{
  const {candidate}=groupFormProposal(currentView(),'capital',groupCapitalFormRead()),q=candidate.groupPolicy;
  $('#groupCapitalStatus').textContent='Preview only: bank → parent '+agencyDollars(q.bankDividend)+'; parent → bank '+agencyDollars(q.bankSupport)+'. Existing parent cash also reserves '+agencyDollars(candidate.agencyPolicy?.capital||0)+' for agency capital. No transfer has occurred.';
 }catch(error){$('#groupCapitalStatus').textContent=error.message;}});
 if(v.me.corporate){
  for(const c of v.me.companySnapshot.world.companies)$('#group-company-'+c.clientIndex)?.addEventListener('click',()=>{if(guard(false)){groupWorkspace.company=c.id;renderFinancialGroup(currentView());focusWorkspaceTarget($('#groupCompanyTitle'));}});
  $('#groupCompanyMandate')?.addEventListener('click',()=>{if(!guard(false))return;const now=currentView(),company=now.me.companySnapshot.world.companies.find(c=>c.id===groupWorkspace.company),contract=now.serviceAgreements.find(c=>c.clientIndex===company?.clientIndex);if(company?.resolution||contract?.companyClosed)return;if(contract){setWorkspaceTab('markets',now);inspectServiceAgreement(now,contract.id);}});
 }
 if(!v.me.agency)return;
 if(v.me.agency.version===2)bindAgencyProfessionalControls(v,guard);
 for(const key of ['funding','operations','results'])$('#agency-section-'+key)?.addEventListener('click',()=>{
  if(!guard(false))return;groupWorkspace.agencySection=key;renderFinancialGroup(currentView());focusWorkspaceTarget($('#agencyWorkspaceTitle'));
 });
 $('#agencyParentFunding')?.addEventListener('click',()=>{if(guard(false)){setFinancialGroupDesk('capital');focusWorkspaceTarget($('#groupCapitalHeading'));}});
 $('#discardAgencyForm')?.addEventListener('click',()=>{if(guard(false)){groupResetForm('agency');renderFinancialGroup(currentView());focusWorkspaceTarget($('#agencyWorkspaceTitle'));}});
 for(const [key,values]of [['staff',[1,2,3,4]],['target',Object.keys(E.AGENCY_PRODUCTS)],['outreach',[0,1,2]]])for(const value of values)$('#agency-choice-'+key+'-'+value)?.addEventListener('click',()=>{
  if(!guard())return;groupWorkspace.forms.agency[key]=String(value);groupWorkspace.dirty.agency=true;renderFinancialGroup(currentView());$('#agency-choice-'+key+'-'+value)?.focus?.({preventScroll:true});
 });
}
function companyWorkspaceContent(v){
 const world=v.me.companySnapshot.world,c=world.companies.find(c=>c.id===groupWorkspace.company)||world.companies[0];groupWorkspace.company=c.id;
 const contract=v.serviceAgreements.find(r=>r.clientIndex===c.clientIndex),profile=E.ANCHOR_CLIENTS[c.clientIndex],provider=contract.owner===v.me.id?'Your bank':contract.owner===v.rival.id?v.rival.name:'Outside providers';
return '<div class="object-workspace"><div class="object-columns"><nav class="object-directory" aria-label="Operating companies">'+world.companies.map(row=>'<button type="button" class="object-row" id="group-company-'+row.clientIndex+'" aria-pressed="'+(row.id===c.id)+'"><span><b>'+esc(E.ANCHOR_CLIENTS[row.clientIndex].name)+'</b><small>'+esc(E.ANCHOR_CLIENTS[row.clientIndex].sector)+'</small></span><span class="object-tag">'+(row.resolution?'Closed':row.bankArrears[v.me.corporate.index]>0?'Unpaid invoices':'Operating')+'</span></button>').join('')+'</nav><section class="object-detail" aria-labelledby="groupCompanyTitle"><h3 id="groupCompanyTitle" tabindex="-1">'+esc(profile.name)+'</h3><p>'+esc(profile.sector)+' · '+esc(v.territories[c.market].name)+'</p><div class="decision-facts"><div><small>Company cash</small><b>'+money(c.book.accounts.cash)+'</b></div><div><small>Company equity</small><b>'+money(c.book.accounts.equity)+'</b></div><div><small>Owes your bank</small><b>'+money(c.bankArrears[v.me.corporate.index])+'</b></div></div><p class="small">'+(c.resolution?'Closed after month '+c.resolution.month+'. Claims are handled through company resolution.':'Current '+esc(E.SERVICE_TYPES[contract.kind].name)+' provider: '+esc(provider)+'. Next renewal: month '+contract.due+'.')+'</p><p class="small">'+(c.report?'Last company profit: '+money(c.report.profit)+'. Debt: '+money(c.book.accounts.debt)+'; unpaid bills: '+money(c.book.accounts.payables)+'.':'No settled company result yet.')+'</p><button type="button" class="btn" id="groupCompanyMandate"'+(c.resolution||contract.companyClosed?' disabled':'')+'>Inspect banking relationship</button><p class="micro">These are the client company’s funds, not cash available to your bank. Unpaid invoices are assets at risk. Ownership, banking mandates and insurance covers are separate relationships.</p>'+companyShareWorkspaceContent(v,c)+companyControlWorkspaceContent(v,c)+'</section></div></div>';
}
