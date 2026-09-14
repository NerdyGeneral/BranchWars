// UI-only adapter for already validated owner projections. Not a
// network validator or a reconstruction of total funding/cash movement.
function createFundingMovementUi(engine){
 const unavailable=reason=>({available:false,reason}),int=Number.isSafeInteger;
 function reviewFundingMovement(v){
  const p=v?.me,r=p?.operatingReport,cycle=v?.gameOver?v?.cycle:v?.cycle-1;
  if(!p?.id||!int(cycle)||cycle<1||r?.cycle!==cycle||!int(v.resolutionId)||v.resolutionId<1)
   return unavailable('Complete a month to see recorded funding movements.');
  const events=v.causalEvents,fences=v.operatingEvents;
  if(!Array.isArray(events)||!Array.isArray(fences))return unavailable('Recorded owner funding history is unavailable.');
  let previous=0;
  for(const e of events){
   if(!e||!int(e.id)||e.id<=previous||e.target!==p.id||e.visibility!=='owner'||!int(e.cycle)||e.cycle<1||e.cycle>cycle)
    return unavailable('Recorded funding history does not match this owner.');
   previous=e.id;
  }
  if(v.causalView&&v.causalView.firstIncludedId!==(events[0]?.id||null))return unavailable('Funding history coverage is inconsistent.');
  const currentFences=fences.filter(e=>e?.cycle===cycle);
  if(currentFences.length!==1)return unavailable('The completed funding report is unavailable.');
  const fence=currentFences[0];
  if(fence.target!==p.id||fence.visibility!=='owner'||fence.category!=='operations.result'||fence.source!=='operate'||!int(fence.id)||fence.id<=previous||fence.report?.cycle!==cycle||fence.report.profit!==r.profit)
   return unavailable('The completed funding report does not match this snapshot.');
  const rows=events.filter(e=>e.cycle===cycle&&e.category==='competition.deposits');
  if(rows.length>1)return unavailable('Duplicate competition movements cannot be displayed as a total.');
  let competition=null;
  if(rows.length){
   const e=rows[0];
   if(e.source!=='depositContest'||!int(e.parentCause)||e.parentCause<1||e.parentCause>=e.id||!e.deltas||Array.isArray(e.deltas)||!Object.values(e.deltas).every(Number.isFinite))
    return unavailable('The recorded competition movement is inconsistent.');
   // An existing stage may change other owner statistics but not deposits.
   const amount=e.deltas.deposits??0;
   if(!int(amount))return unavailable('The recorded deposit amount is invalid.');
   competition=amount;
  }else{
   // Absence means zero only when existing engine coverage proves a complete
   // month. Prefix-pruned history must never become an invented zero.
   try{if(engine.BankEarningsBridge.review(v).available)competition=0;}catch{}
  }
  const organic=int(r.depositGrowth)?r.depositGrowth:null;
  return {available:true,cycle,organic,competition,coverage:competition===null?'partial':'recorded-components'};
 }
 const dollars=n=>n===null?'Unavailable':(n<0?'−':n>0?'+':'')+'$'+Math.abs(n).toLocaleString('en-US');
 function renderFundingMovement(v){
  if(!v?.me?.operatingReport)return '';
  const q=reviewFundingMovement(v);
  if(!q.available)return '<details class="funding-movements"><summary>Latest funding movements · unavailable</summary><p>Complete owner history is unavailable or inconsistent. No deposit movement has been inferred.</p></details>';
  return '<details class="funding-movements"><summary>Funding movements · completed month '+q.cycle+'</summary><table class="forecast-table"><caption>Recorded deposit components · dollars, not income</caption><tbody><tr><th scope="row">Organic deposit flow · operating report</th><td>'+dollars(q.organic)+'</td></tr><tr><th scope="row">Recorded deposit competition</th><td>'+dollars(q.competition)+'</td></tr></tbody></table><p>These are separate recorded components, not total deposit change. Customer departures, company accounts and other stages may also change funding. Loan principal repayments release cash but are not earnings.</p><p>Standing-policy and draft organic forecasts exclude competition. Positive organic growth does not guarantee that total deposits will rise.</p>'+(q.competition===null?'<p>Competition history is incomplete in this view; unavailable does not mean zero.</p>':q.competition<0?'<p>Competition withdrew funding. Review deposit pricing, service capacity and market presence before committing more cash to loans, hiring or expansion.</p>':'')+'</details>';
 }
 return Object.freeze({review:reviewFundingMovement,render:renderFundingMovement});
}
const fundingMovementView=createFundingMovementUi(E);
function standingOperatingPlan(p){
 return {allocation:p.allocation,products:p.products,depositPolicy:p.policies.deposit,lendingPolicy:p.policies.lending,capitalPolicy:p.policies.capital};
}
function incomeAmount(value,signed=false){
 if(!Number.isFinite(value))return 'Not available';
 return (value<0?'−':signed&&value>0?'+':'')+'$'+Math.abs(value).toLocaleString(undefined,{maximumFractionDigits:2});
}
function incomeChange(change){
 if(change.amount===null)return 'Not available';
 return incomeAmount(change.amount,true)+(change.percent===null?' · % not meaningful': ' · '+(change.percent>0?'+':'')+change.percent.toFixed(1)+'%');
}
function renderBankIncomeStatement(v,before,after){
 const expected=v.gameOver?v.cycle:v.cycle-1,actual=v.me.operatingReport?.cycle===expected?v.me.operatingReport:null;
 if(![actual,before,after].some(r=>r?.incomeSource_version!==undefined))return '';
 const columns=[['Last completed month',E.IncomeReview.statement(actual)],['Standing policies',E.IncomeReview.statement(before)],['Your draft',E.IncomeReview.statement(after)]],
  template=columns.find(([,q])=>q.available)?.[1];
 const notices=columns.filter(([,q])=>!q.available).map(([label,q])=>'<p class="micro">'+esc(label)+': '+esc(q.reason)+'</p>').join('');
 if(!template)return '<p class="notice" role="status">Detailed income statement unavailable.</p>'+notices;
 const labelFor=(key,label)=>key==='depositFees'&&!v.me.depositBook?'Core deposit-linked contribution (modeled)':label;
 const table=(field,caption)=>'<div class="table-scroll"><table class="forecast-table"><caption>'+caption+'</caption><thead><tr><th>Bank operations</th>'+columns.map(([label])=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+template[field].map(([key,label])=>'<tr'+(['netInterest','operatingExpense','profit'].includes(key)?' class="statement-subtotal"':'')+'><th scope="row">'+esc(labelFor(key,label))+'</th>'+columns.map(([,q])=>'<td>'+incomeAmount(q.available?q[field].find(row=>row[0]===key)?.[2]:null)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 const depositNotice=v.me.depositBook?'':'<p class="micro">Core estimates its deposit-linked contribution from total deposits, deposit strategy and the economy; it does not model billed account fees. This simplified contribution is separate from interest on earning assets. Customer deposit balances remain liabilities, not income.</p>';
 return '<details class="bank-income-statement"><summary>Income statement · actual, standing &amp; draft</summary><p class="small">Bank operations only, not consolidated group earnings. Net interest income is a subtotal—not extra revenue. Costs below are already included in profit.</p>'+depositNotice+notices+table('rows','Monthly income and expenses · dollars')+
  '<details><summary>Where operating costs go</summary>'+table('expenses','Components of operating expense · not additional charges')+'<p class="micro">Deposit servicing includes its product platforms. Shared payroll is not allocated into invented product-level profits. Capital spending and other cycle stages remain in the earnings bridge.</p></details>'+
  '<details><summary>Legacy modeled bonuses · economic audit</summary>'+table('bonuses','Recorded abstract income · not attributed customer fees')+'<p class="micro">These older mechanics are shown separately rather than described as verified service revenue. Their long-run economics remain under review; displaying them does not add income.</p></details>'+
  '<p class="micro muted">Securities interest uses the recorded operating-stage amount, not today’s closing asset balance. Prior detailed components are unavailable when they were not saved. Loan principal, deposits and client investment assets are not income. Modeled credit losses are not a GAAP allowance or provision statement. Subsidiaries have their own operating statements.</p></details>'+fundingMovementView.render(v);
}
function incomeHistoryGraph(points,key,standing,draft,balanceOnly=false){
 const values=points.map(p=>p[key]).filter(Number.isFinite).concat([standing,draft].filter(Number.isFinite));
 if(!values.length)return '<p class="micro">'+(balanceOnly?'No retained principal balances in this period.':'No completed income history yet. Forecasts are estimates, not recorded results.')+'</p>';
 const lo=Math.min(0,...values),hi=Math.max(0,...values),span=hi-lo||1,width=620,height=140;
 const y=n=>20+(hi-n)/span*90,x=i=>75+i*(width-110)/Math.max(1,points.length-(balanceOnly?1:0)),zero=y(0);
 let previous=null;
 const actual=points.map((p,i)=>{
  const n=p[key];if(!Number.isFinite(n)){previous=null;return '';}
  const pos={x:x(i),y:y(n)},line=previous?'<line x1="'+previous.x+'" y1="'+previous.y+'" x2="'+pos.x+'" y2="'+pos.y+'" stroke="currentColor" stroke-width="2"/>':'';
  previous=pos;
  return line+'<circle cx="'+pos.x+'" cy="'+pos.y+'" r="3" fill="currentColor"><title>Month '+p.cycle+': '+incomeAmount(n)+'</title></circle>';
 }).join('');
 const forecast=[['Standing',standing,-5],['Draft',draft,5]].map(([label,n,offset])=>Number.isFinite(n)?'<circle cx="'+(x(points.length)+offset)+'" cy="'+y(n)+'" r="5" fill="white" stroke="currentColor" stroke-dasharray="2 2"><title>'+label+' forecast: '+incomeAmount(n)+'</title></circle>':'').join('');
 return '<figure class="income-history"><svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+(balanceOnly?'Actual outstanding principal in dollars, not income.':'Monthly income in dollars. Solid points are actual; hollow dashed points are forecasts.')+' Exact values in the table below."><line x1="70" y1="'+zero+'" x2="610" y2="'+zero+'" stroke="currentColor" opacity=".2"/><text x="2" y="16" font-size="11">'+esc(incomeAmount(hi))+'</text><text x="2" y="120" font-size="11">'+esc(incomeAmount(lo))+'</text>'+actual+forecast+'<text x="75" y="138" font-size="11">'+(points.length?'Month '+points[0].cycle:'No actuals')+'</text><text x="520" y="138" font-size="11">'+(balanceOnly?'Latest actual':'Forecast')+'</text></svg><figcaption class="micro">'+(balanceOnly?'Actual principal only; month 0 is the opening balance.':'Solid = actual · hollow/dashed = forecasts.')+' Missing months are gaps, not zero '+(balanceOnly?'balances.':'income. Dollar scale only; principal is not plotted as income.')+'</figcaption></figure>';
}
function renderPrincipalHistory(v){
 const points=E.IncomeReview.principalHistory(v);
 return '<details><summary>Loan principal history · separate from income</summary><p class="small">Current outstanding principal: <b>'+incomeAmount(v.me.stats.loans)+'</b>. Whole-bank balances include all settled movements, not just the operating stage.</p>'+
  (points.length?incomeHistoryGraph(points,'principal',null,null,true)+'<div class="table-scroll"><table class="forecast-table"><caption>Actual loan balances · month 0 is opening, later months are closing</caption><thead><tr><th>Month</th><th>Outstanding principal</th><th>Change vs previous month</th></tr></thead><tbody>'+points.map(p=>'<tr><th scope="row">'+p.cycle+'</th><td>'+incomeAmount(p.principal)+'</td><td>'+incomeChange(p.change)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="micro">No retained principal history. Old balances are not reconstructed from current income.</p>')+'</details>';
}
function bindIncomeServicingAction(v){
 const button=$('#incomeServicingAction');if(!button||v.commercialServiceVersion!==1)return;
 const campaign=game||view,owner=v.me.id,cycle=v.cycle;
 button.onclick=()=>{
  const now=currentView();
  if(!now||(game||view)!==campaign||now.me.id!==owner||now.cycle!==cycle||now.commercialServiceVersion!==1)return;
  // Navigation only. The existing department controller protects unstaged
  // inputs and performs its own review/adoption; this never buys capacity.
  if(now.me.departmentFunctions){
   navigatePlanReview({tab:'workforce',peopleDesk:'coverage',target:'#departmentPanel'});
   const controller=departmentFunctionsLive.controller;
   if(controller?.select('relationships',controller.token())){
    renderDepartments(currentView());focusWorkspaceTarget($('#df-detail-title'));
   }
  }else navigatePlanReview({tab:'operations',desk:'monthly',target:'#staffGrid'});
 };
}
function renderIncomeReview(v,before,after,kind='loan'){
 const loan=kind==='loan',key=loan?'loanIncome':'commercialIncome',title=loan?'Loan income · actual & outlook':'Business & merchant fees · actual & outlook';
 const points=E.IncomeReview.history(v),q=E.IncomeReview.compare(v,before,after,key);
 const rows=[['Last actual'+(q.cycle?' · month '+q.cycle:''),incomeAmount(q.actual)],['Actual vs previous month',incomeChange(q.actualChange)],
  ['Standing-policy forecast',incomeAmount(q.standing)],['Standing forecast vs last actual',incomeChange(q.standingChange)],['Draft forecast',incomeAmount(q.draft)],
  ['Draft forecast vs last actual',incomeChange(q.forecastChange)],['Effect of draft vs standing policies',incomeChange(q.draftChange)]];
 const net=loan?E.IncomeReview.compare(v,before,after,'loanAfterLosses'):null;
 const relationships=loan?null:E.IncomeReview.relationshipChange(v),count=n=>(n>0?'+':'')+n.toLocaleString();
 const provenance=v.incomeHistoryVersion===1?'Twelve-month owner-only records are retained in this campaign independently of diagnostic-log pruning.':'Uses retained owner-only operating reports. Unavailable history is not reconstructed. Earlier records may have been pruned from older saves.';
 const coverage=r=>Number.isFinite(r?.commercialServiceCoverage)?(r.commercialServiceCoverage*100).toFixed(1)+'%':'Not available';
 const servicing=!loan&&v.commercialServiceVersion===1?'<p class="small">Relationship servicing: standing <b>'+coverage(before)+'</b> · draft <b>'+coverage(after)+'</b>. Fees require serviced relationships present at the start of operations; customers acquired during that step start earning next month. '+(v.me.departmentFunctions?'Use Sales and relationships department staffing or its paid service provider to cover this work. Payroll and vendor costs remain included in bank expenses.':'Existing Business bankers service the book first; their remaining time wins new business. No additional servicing fee is charged on top of payroll.')+'</p>'+
  (Number.isFinite(after?.commercialServiceCoverage)&&after.commercialServiceCoverage<1?'<p class="warn" role="status">Your draft leaves existing relationships partly or wholly unserved. Their recurring fees fall even if customer counts grow. Reassign available time or review paid capacity before expanding.</p>':'')+
  '<button type="button" class="btn" id="incomeServicingAction">'+(v.me.departmentFunctions?'Review relationship servicing':'Review Business staffing')+'</button>':'';
 return '<section class="income-review" aria-label="'+title+'"><h4>'+title+'</h4><div class="decision-facts"><div><small>Last completed month</small><b>'+incomeAmount(q.actual)+'</b></div><div><small>Draft forecast</small><b>'+incomeAmount(q.draft)+'</b></div><div><small>Forecast vs last actual</small><b>'+incomeChange(q.forecastChange)+'</b></div></div>'+
  '<p class="micro">Zero draft effect means no change from standing policies—not zero growth. Forecasts exclude uncertain wins, rival decisions and executive events.</p>'+servicing+(loan&&v.creditWorkloadVersion===1?'<p class="small">Loan administration follows outstanding principal and active product portfolios by location, plus individual company loans—not the number of internal vintage records. Collections still require separate capacity as loans fall into arrears. Use Credit administration and Collections staffing to address shortfalls.</p>':'')+(loan?renderPrincipalHistory(v):'')+
  '<details><summary>Income history &amp; comparison details</summary>'+incomeHistoryGraph(points,key,q.standing,q.draft)+
  '<div class="table-scroll"><table class="forecast-table"><caption>Distinct comparisons · dollars per month</caption><tbody>'+rows.map(([label,value])=>'<tr><th scope="row">'+label+'</th><td>'+value+'</td></tr>').join('')+'</tbody></table></div>'+
  (loan?'<p class="small">After modeled credit losses: last actual <b>'+incomeAmount(net.actual)+'</b> · standing <b>'+incomeAmount(net.standing)+'</b> · draft <b>'+incomeAmount(net.draft)+'</b>. Before shared funding and operating costs; not net lending profit.</p>':'<p class="micro">Business/merchant fees are the engine’s aggregate relationship income. Treasury contracts and subsidiary earnings are separate; they are not added to this line. This is not transaction-level attribution.</p>')+
  (relationships?'<p class="small">Net relationship change in month '+relationships.cycle+': <b>'+count(relationships.business)+' business</b> · <b>'+count(relationships.merchant)+' merchant</b>. Includes all settled additions and losses, not just recruitment. These categories can overlap; do not add them as unique customers.</p>':'')+
  '<div class="table-scroll"><table class="forecast-table"><caption>Retained actual records · forecasts are not included</caption><thead><tr><th>Month</th><th>'+ (loan?'Loan interest':'Business/merchant fees')+'</th>'+(loan?'<th>Credit losses</th><th>Net operating principal change</th>':'<th>Service contract fees (all types)</th>')+'</tr></thead><tbody>'+points.map(p=>'<tr><th scope="row">'+p.cycle+'</th><td>'+incomeAmount(p[key])+'</td>'+(loan?'<td>'+incomeAmount(p.chargeoff)+'</td><td>'+incomeAmount(p.loanGrowth,true)+'</td>':'<td>'+incomeAmount(p.contractFees)+'</td>')+'</tr>').join('')+'</tbody></table></div><p class="micro muted">'+provenance+' '+(loan?'Principal change is a balance movement, not earnings; this table does not claim a historical closing balance.':'Contract fees may be billed but not yet collected.')+'</p></details></section>';
}
