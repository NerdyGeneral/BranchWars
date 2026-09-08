// Advertising belongs beside offer development and local sales, not another
// Operations column. All controls stage the same sealed monthly plan.
function advertisingDeskContent(v, productPreview) {
 const p=JSON.parse(JSON.stringify(productPreview)),q=draft.advertisingPolicy,cash=n=>'$'+Math.round(n).toLocaleString();
 p.doctrine=typeof p.doctrine==='object'?p.doctrine.key:p.doctrine;p.allocation={...draft.allocation};
 p.householdBook.policy=JSON.parse(JSON.stringify(draft.householdPolicy));p.workforce.policy=JSON.parse(JSON.stringify(draft.workforcePolicy));
 const budget=E.planBudget(v.me,draft);p._workforceReserved=budget.total-(budget.training||0)-(budget.advertising||0);
 const quote=E.advertisingPreview(p,v,q),last=v.me.advertising.report,disabled=v.me.submitted?'disabled':'';
 const select=(key,label,options)=>'<label>'+label+'<select data-advertising-field="'+key+'" '+disabled+'>'+options.map(([value,text,unavailable])=>'<option value="'+value+'" '+(String(q[key])===String(value)?'selected':'')+' '+(unavailable?'disabled':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';
 const controls=select('market','Campaign market',Object.entries(v.territories).map(([k,t])=>[k,t.name]))+
  select('segment','Customer audience',Object.entries(E.CUSTOMER_SEGMENTS).map(([k,s])=>[k,s.name]))+
  select('product','Advertised offer',Object.entries(v.productPortfolios.retail.options).map(([k,d])=>[k,d.name+(draft.productProgramPolicy.markets[q.market][q.segment][k]?'':' · sales closed'),!draft.productProgramPolicy.markets[q.market][q.segment][k]]))+
  select('budget','Monthly budget',E.ADVERTISING_BUDGETS.map(n=>[n,n?cash(n)+'/month':'Paused · $0']));
 const stat=(label,value)=>'<div><small>'+label+'</small><b>'+value+'</b></div>';
 let actual='<p class="notice">No resolved campaign yet. Stage a budget and complete a normal turn to see actual costs and intake.</p>';
 if(last){
  actual='<h3>LAST RESOLVED MONTH · '+last.cycle+'</h3><div class="product-desk-summary">'+stat('Actual advertising expense',cash(last.spent)+(last.paused?' · reserve pause':''))+stat('Intake in aware audiences',cash(last.depositIntake)+' deposits')+stat('Model-attributed assisted share',cash(last.assistedDeposits)+' deposits')+'</div>'+
   '<p class="micro">'+last.householdIntake.toLocaleString()+' household relationships arrived in aware audiences; '+last.assistedHouseholds.toLocaleString()+' are model-attributed to advertising. Counts and deposit balances are separate aggregate books, not matched individual accounts.</p>';
  const rows=last.rows.filter(r=>r.deposits||r.households||r.boost);
  if(rows.length)actual+='<details><summary>Audience attribution detail · '+rows.length+' rows</summary><div class="table-scroll"><table class="regional-table product-target-table"><thead><tr><th>Audience / offer</th><th>Awareness</th><th>Observed deposits</th><th>Assisted share</th><th>Households</th></tr></thead><tbody>'+rows.map(r=>'<tr><th>'+esc(v.territories[r.market].name)+'<br><span class="micro">'+esc(E.CUSTOMER_SEGMENTS[r.segment].name+' · '+v.productPortfolios.retail.options[r.product].name)+'</span></th><td>'+(r.awareness/100).toFixed(1)+'%</td><td>'+cash(r.deposits)+'</td><td>'+cash(r.assistedDeposits)+'</td><td>'+r.households.toLocaleString()+'</td></tr>').join('')+'</tbody></table></div></details>';
 }
 return '<h3>LOCAL CAMPAIGN DESK</h3><p class="small muted">One standing campaign per bank. Pause it whenever you need to protect cash; existing awareness fades rather than disappearing immediately.</p><div class="advertising-controls">'+controls+'</div>'+
  '<div class="product-desk-summary">'+stat('Draft campaign expense',cash(quote.spent)+'/month'+(quote.paused?' · reserve pause':''))+stat('Outside audience available',quote.audience.toLocaleString()+' relationships')+stat('Retail sales time',quote.staff.toFixed(2)+' banker equivalents')+'</div>'+
  '<div class="advertising-funnel" aria-label="Campaign awareness forecast"><div><small>Reach this month</small><b>'+quote.reached.toLocaleString()+'</b></div><span aria-hidden="true">→</span><div><small>Audience awareness</small><b>'+(quote.before/100).toFixed(1)+'% → '+(quote.after/100).toFixed(1)+'%</b><progress max="10000" value="'+quote.after+'" aria-label="Projected audience awareness"></progress></div><span aria-hidden="true">→</span><div><small>Targeting weight bonus</small><b>+'+(quote.boost*100).toFixed(1)+'%</b></div></div>'+
  '<p class="micro">Offer suitability: '+(quote.fit*100).toFixed(0)+'%. Awareness loses 25% each month before new reach; it raises local intake preference, not the size of the economy. Closed offers or zero sales time receive no conversion bonus. Sales closures automatically pause that campaign.</p>'+
  '<p class="micro muted">The budget is recurring and shares the plan’s cash/capital limits. Quotes use today’s balances before executive events, competition and operating cash flows; costs may pause to protect reserves. Reach is modelled contacts, not guaranteed applications. Advertising cannot bypass market quotas, create deposits, or replace retention staffing.</p>'+actual+
  '<p class="notice">Assisted is not incremental. The attributed share is calculated from actual ordinary intake and the model’s targeting weight. It is not a controlled comparison, conversion probability, profit or return on advertising. Rival transfers, acquisitions, term renewals and commercial mandates are excluded; their existing mechanics are unchanged.</p>';
}
function bindAdvertisingDesk(v) {
 $$('[data-advertising-field]').forEach(input=>input.addEventListener('change',()=>{
  if(v.me.submitted)return;
  const next=JSON.parse(JSON.stringify(draft)),q=next.advertisingPolicy,key=input.dataset.advertisingField;
  q[key]=key==='budget'?Number(input.value):input.value;
  if(key==='market'||key==='segment'){
   const offers=next.productProgramPolicy.markets[q.market][q.segment];
   if(!offers[q.product])q.product=Object.keys(offers).find(k=>offers[k]);
  }
  try{
   E.normalizeProductProgramPlan(v.me,next);E.normalizeAdvertisingPlan(v.me,next);
   const status=E.projectPlanStatus(v.me,next),decrease=key==='budget'&&q.budget<draft.advertisingPolicy.budget;
   if(!status.eligible&&!decrease)throw Error(status.reason);
   draft=next;renderProducts(v);renderReady(v);
  }catch(e){toast(e.message);renderProductPrograms(v);}
 }));
}
