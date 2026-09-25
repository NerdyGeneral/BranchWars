// Advertising belongs beside offer development and local sales, not another
// Operations column. All controls stage the same sealed monthly plan.
function advertisingDeskContent(v, productPreview, scope='') {
 const p=JSON.parse(JSON.stringify(productPreview)),q=draft.advertisingPolicy,cash=n=>'$'+Math.round(n).toLocaleString();
 const controlId=name=>scope?scope+'-'+name:name;
 let quote,owner,forecastError;
 try{
 p.doctrine=typeof p.doctrine==='object'?p.doctrine.key:p.doctrine;p.allocation={...draft.allocation};
 p.householdBook.policy=JSON.parse(JSON.stringify(draft.householdPolicy));p.workforce.policy=JSON.parse(JSON.stringify(draft.workforcePolicy));
 if(p.relationshipOffers)E.applyRelationshipOfferPolicy(p,draft.relationshipOfferPolicy);
 if(p.onboarding)E.applyOnboardingPolicy(p,draft.onboardingPolicy);
 const budget=E.planBudget(v.me,draft,v);p._workforceReserved=budget.total-(budget.training||0)-(budget.advertising||0)-(budget.relationshipOffers||0)-(budget.onboarding||0);
 if(p.onboarding){p._relationshipOfferBudget=budget.relationshipOffers||0;p._onboardingBudget=budget.onboarding||0;}
 // Use the same authorized department dispatch as the customer/operations
 // forecast. Raw allocation alone can promise sales after all time is spent.
 owner=p.departmentFunctions?E.departmentCustomerPreview(v.me,v,draft).owner:p;
 quote=E.advertisingPreview(owner,v,q);
 }catch(error){forecastError=error.message;}
 const last=v.me.advertising.report,disabled=v.me.submitted||v.gameOver?'disabled':'';
 const select=(key,label,options)=>'<label>'+label+'<select id="'+controlId('advertising-'+key)+'" data-advertising-scope="'+scope+'" data-advertising-field="'+key+'" '+disabled+'>'+options.map(([value,text,unavailable])=>'<option value="'+value+'" '+(String(q[key])===String(value)?'selected':'')+' '+(unavailable?'disabled':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';
 const controls=select('market','Campaign market',marketEntries(v).map(([k,t])=>[k,t.name]))+
  select('segment','Customer audience',Object.entries(E.CUSTOMER_SEGMENTS).map(([k,s])=>[k,s.name]))+
  select('product','Advertised offer',Object.entries(v.productPortfolios.retail.options).map(([k,d])=>[k,d.name+(draft.productProgramPolicy.markets[q.market][q.segment][k]?'':' · sales closed'),!draft.productProgramPolicy.markets[q.market][q.segment][k]]))+
  select('budget','Monthly budget',E.ADVERTISING_BUDGETS.map(n=>[n,n?cash(n)+' / month':'Paused · $0']));
 if(!quote)return '<h3>LOCAL CAMPAIGN DESK</h3><div class="advertising-controls">'+controls+'</div>'+
  '<p class="notice bad" role="status"><b>Forecast unavailable.</b> '+esc(forecastError)+
  ' Review the shared instructions. You can still reduce or pause advertising without changing other commitments.</p>'+
  '<p class="micro">Standing budget: '+cash(v.me.advertising.policy.budget)+'/month. Draft budget: '+cash(q.budget)+
  '/month, active after resolution. No spending estimate is shown until the draft is valid.</p>'+
  '<button type="button" class="btn" id="'+controlId('advertisingCapacityReview')+'">Review people and work commitments</button>';
 const stat=(label,value)=>'<div><small>'+label+'</small><b>'+value+'</b></div>';
 const measured=(quote.staff<=0?'<p class="notice bad" role="status"><b>No retail sales capacity remains.</b> Awareness cannot improve ordinary intake targeting without remaining sales time. A separately staffed application desk can still respond to awareness; review both commitments below.</p>':'')+
  (quote.audience===0?'<p class="notice bad" role="status">No outside audience remains in this segment and market. A paid campaign cannot acquire customers who are not available.</p>':'')+
  '<button type="button" class="btn" id="'+controlId('advertisingCapacityReview')+'">Review people and work commitments</button>';
 let actual='<p class="notice">No resolved campaign yet. Stage a budget and complete a normal turn to see actual costs and intake.</p>';
 if(last){
  actual='<h3>LAST RESOLVED MONTH · '+last.cycle+'</h3><div class="product-desk-summary">'+stat('Actual advertising expense',cash(last.spent)+(last.paused?' · reserve pause':''))+stat('Intake in aware audiences',cash(last.depositIntake)+' deposits')+stat('Model-attributed assisted share',cash(last.assistedDeposits)+' deposits')+'</div>'+
   '<p class="micro">'+last.householdIntake.toLocaleString()+' household relationships arrived in aware audiences; '+last.assistedHouseholds.toLocaleString()+' are model-attributed to advertising. Counts and deposit balances are separate aggregate books, not matched individual accounts.</p>';
  const rows=last.rows.filter(r=>r.deposits||r.households||r.boost);
  if(rows.length)actual+='<details><summary>Audience attribution detail · '+rows.length+' rows</summary><div class="table-scroll"><table class="regional-table product-target-table"><thead><tr><th>Audience / offer</th><th>Awareness</th><th>Observed deposits</th><th>Assisted share</th><th>Households</th></tr></thead><tbody>'+rows.map(r=>'<tr><th>'+esc(v.territories[r.market].name)+'<br><span class="micro">'+esc(E.CUSTOMER_SEGMENTS[r.segment].name+' · '+v.productPortfolios.retail.options[r.product].name)+'</span></th><td>'+(r.awareness/100).toFixed(1)+'%</td><td>'+cash(r.deposits)+'</td><td>'+cash(r.assistedDeposits)+'</td><td>'+r.households.toLocaleString()+'</td></tr>').join('')+'</tbody></table></div></details>';
 }
 return (scope?'':'<h3>LOCAL CAMPAIGN DESK</h3>')+'<p class="small muted">One standing campaign per bank. Budgets recur until changed; pausing lets existing awareness fade.</p><div class="advertising-controls">'+controls+'</div>'+
  '<div class="product-desk-summary">'+stat('Draft campaign expense',cash(quote.spent)+'/month'+(quote.paused?' · reserve pause':''))+stat('Outside audience available',quote.audience.toLocaleString()+' relationship'+(quote.audience===1?'':'s'))+stat('Retail sales time',quote.staff.toFixed(2)+' banker equivalents')+'</div>'+
  '<div class="advertising-decision-grid"><section><div class="advertising-funnel" aria-label="Campaign awareness forecast"><div><small>Reach this month</small><b>'+quote.reached.toLocaleString()+'</b></div><span aria-hidden="true">→</span><div><small>Audience awareness</small><b>'+(quote.before/100).toFixed(1)+'% → '+(quote.after/100).toFixed(1)+'%</b><progress max="10000" value="'+quote.after+'" aria-label="Projected audience awareness"></progress></div><span aria-hidden="true">→</span><div><small>Targeting weight bonus</small><b>+'+(quote.boost*100).toFixed(1)+'%</b></div></div>'+
  measured+'<p class="notice"><b>Targeting is not extra production.</b> Advertising can change where or which products win a finite intake allowance without increasing total bank growth. Office capacity, outside supply and staff still limit delivery.</p></section><section>'+advertisingOutcomeContent(v,owner,quote,scope)+'</section></div>'+
  '<details class="advertising-method"><summary>How to interpret this forecast and attribution</summary><p class="micro">Offer suitability: '+(quote.fit*100).toFixed(0)+'%. Awareness loses 25% each month before new reach; it raises local intake preference, not the size of the economy. Closed offers or zero ordinary sales time receive no ordinary targeting bonus. Sales closures automatically pause that campaign.</p>'+
  '<p class="micro muted">The budget is recurring and shares the plan’s cash/capital limits. Quotes use today’s balances before executive events, competition and operating cash flows; costs may pause to protect reserves. Reach is modelled contacts, not guaranteed applications. Advertising cannot bypass market quotas, create deposits, or replace retention staffing.</p>'+
  '<p class="notice">Assisted is not incremental. The attributed share is calculated from actual ordinary intake and the model’s targeting weight. It is not a controlled comparison, conversion probability, profit or return on advertising. Rival transfers, acquisitions, term renewals and commercial mandates are excluded; their existing mechanics are unchanged.</p></details>'+actual;
}
// Shared proposal for both Products and the contextual market desk. No payment,
// focus change, peer message or turn submission happens here.
function advertisingChangeProposal(v,plan,key,value){
 if(!['market','segment','product','budget'].includes(key))throw Error('Unknown campaign instruction.');
 const next=JSON.parse(JSON.stringify(plan)),q=next.advertisingPolicy;
 q[key]=key==='budget'?Number(value):value;
 if(key==='market'||key==='segment'){
  const offers=next.productProgramPolicy.markets[q.market]?.[q.segment];
  if(!offers)throw Error('Choose an available market and audience.');
  if(!offers[q.product])q.product=Object.keys(offers).find(k=>offers[k]);
 }
 const decrease=key==='budget'&&q.budget<plan.advertisingPolicy.budget;
 if(!decrease)E.normalizeProductProgramPlan(v.me,next);
 E.normalizeAdvertisingPlan(v.me,next);
 if(!decrease){
  const status=E.projectPlanStatus(v.me,next,v);if(!status.eligible)throw Error(status.reason);
  if(v.me.departmentFunctions)E.departmentCustomerPreview(v.me,v,next);
 }
 return next;
}
function applyAdvertisingChange(v,key,value){
 if(!workforceEditCurrent(workforceEditToken(v)))return false;
 try{draft=advertisingChangeProposal(currentView(),draft,key,value);return true;}
 catch(error){toast(error.message);return false;}
}
function bindAdvertisingDesk(v,{scope='',refresh=null}={}) {
 const token=workforceEditToken(v);
 const controlId=name=>scope?scope+'-'+name:name;
 const rerender=refresh||(()=>{renderProducts(currentView());renderProductPrograms(currentView());renderReady(currentView());});
 $('#'+controlId('advertisingCapacityReview'))?.addEventListener('click',()=>{
  if(!workforceEditCurrent(token))return;
  navigatePlanReview({tab:'workforce',peopleDesk:'overview',target:'#peopleOverview'});
 });
 $('#'+controlId('advertisingApplicationsReview'))?.addEventListener('click',()=>{
  if(!workforceEditCurrent(token))return;
  openProductDesk('onboarding');
  focusWorkspaceTarget($('#onboarding-share'));
 });
 $$(scope?'[data-advertising-field][data-advertising-scope="'+scope+'"]':'[data-advertising-field][data-advertising-scope=""]').forEach(input=>input.addEventListener('change',()=>{
  if(!workforceEditCurrent(token))return;
  const key=input.dataset.advertisingField;applyAdvertisingChange(v,key,input.value);rerender();
  const target=$('#'+controlId('advertising-'+key));target?.focus?.({preventScroll:true});target?.scrollIntoView?.({block:'nearest'});
 }));
}

function advertisingOutcomeContent(v,owner,quote,scope=''){
 const cash=n=>'$'+Math.round(n).toLocaleString(),q=quote.policy;
 const rows=E.ADVERTISING_BUDGETS.map(budget=>E.advertisingPreview(owner,v,{...q,budget}));
 const cheaper=!quote.paused&&quote.spent>0&&rows.find(r=>r.policy.budget<q.budget&&!r.paused&&r.reached===quote.reached&&r.after===quote.after);
 const saturation=cheaper?'<p class="notice" role="status"><b>No additional reach at this budget.</b> '+cash(cheaper.policy.budget)+'/month gives the same reach and awareness as '+cash(q.budget)+' for this audience today. The extra '+cash(q.budget-cheaper.policy.budget)+' is still an expense. Compare before staging.</p>':'';
 let application='<p class="micro">This historical campaign has no separate application desk. Advertising affects ordinary intake targeting only.</p>';
 if(owner.onboarding){
  const policy=owner.onboarding.policy,matching=policy.market===q.market&&policy.segment===q.segment&&policy.product===q.product;
  const shadow=JSON.parse(JSON.stringify(owner));
  for(const row of Object.values(shadow.advertising.awareness))for(const mix of Object.values(row))for(const key of Object.keys(mix))mix[key]=Math.floor(mix[key]*.75);
  shadow.advertising.awareness[q.market][q.segment][q.product]=quote.after;
  const intake=E.onboardingReview(shadow,v),status=!policy.share?'Application desk paused':!matching?'Application desk targets a different audience / offer':intake.capacity===0?'Application desk has no whole unit of processing capacity':'Matching application desk';
  application='<section class="advertising-outcome"><h4>'+status+'</h4><p class="micro">'+intake.capacity+' application-work units available · '+intake.totals.generated.count+' new requests · '+intake.totals.activated.count+' activations from earlier requests, conditional on today’s books. New requests cannot activate until a later month.</p>'+
   (!policy.share?'<p class="small">Paying for awareness does not open this desk or assign its people. Ordinary intake can still shift toward your target, but there are no application-pipeline conversions while processing is paused.</p>':!matching?'<p class="small">This campaign does not increase the selected application desk’s awareness. Match the market, audience and product if that is your intended strategy.</p>':'')+
   '<button type="button" class="btn" id="'+(scope?scope+'-':'')+'advertisingApplicationsReview">Review application target &amp; staffing</button></section>';
 }
 return application+saturation+'<details class="advertising-comparison"><summary>Compare recurring budgets and diminishing returns</summary><p class="micro">Same audience, products and authorized staff; opening balances only. This compares contacts and awareness, not additional customers, deposits or profit. Unrelated training and other instructions are held fixed.</p><div class="table-scroll"><table class="regional-table"><thead><tr><th>Budget / month</th><th>Expected expense</th><th>Contacts</th><th>Awareness</th></tr></thead><tbody>'+rows.map(r=>'<tr'+(r.policy.budget===q.budget?' class="selected"':'')+'><th>'+cash(r.policy.budget)+(r.policy.budget===q.budget?' · draft':'')+'</th><td>'+cash(r.spent)+(r.paused?' · reserve pause':'')+'</td><td>'+r.reached.toLocaleString()+'</td><td>'+(r.after/100).toFixed(1)+'%</td></tr>').join('')+'</tbody></table></div></details>';
}
