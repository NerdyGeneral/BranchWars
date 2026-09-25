function creditMoney(n) { return Math.abs(n)<10000 ? '$'+Number(n).toLocaleString() : money(n); }
let inspectedCreditMarket = null;
function creditContextCurrent(token,editable=false){
 const now=currentView();return !!(token&&now&&token.campaign===(game||view)&&token.owner===now.me.id&&token.cycle===now.cycle&&token.connection===featureConnectionGeneration&&token.link===linkSession&&token.repository===gh&&token.lan===lan&&
  (!editable||draft&&draftOwner===now.me.id&&!now.me.submitted&&!now.gameOver&&!(gh.active&&gh.paused)&&token.stamp===JSON.stringify(draft)));
}
function stageCollectionsPolicy(v, share, approach,token) {
  if(!draft || v.me.submitted || !v.me.creditPerformance||token&&!creditContextCurrent(token,true))return false;
  const next=JSON.parse(JSON.stringify(draft));next.collectionsPolicy={share,approach};
  try{E.normalizeCollectionsPlan(v.me,next);draft=next;renderReady(v);return true;}
  catch(e){toast(e.message);renderCollections(v);return false;}
}
function creditFlowRows(report){
 if(!report||!['loanGrowth','principalRepaid','creditRecovery','chargeoff'].every(k=>Number.isSafeInteger(report[k]??0))||!Number.isSafeInteger(report.loanGrowth)||!Number.isSafeInteger(report.principalRepaid))return null;
 const named=report.companyCredit||{};
 if(!['principalPaid','recoveredPrincipal','interestWrittenOff'].every(k=>Number.isSafeInteger(named[k]??0)&&(named[k]??0)>=0))return null;
 // Named borrower servicing is outside ordinary cohort amortization. Its
 // unpaid-interest writeoff is an income loss, never a principal movement.
 const repaid=report.principalRepaid+(named.principalPaid||0),recovered=(report.creditRecovery||0)+(named.recoveredPrincipal||0),loss=(report.chargeoff||0)-(named.interestWrittenOff||0),originations=report.loanGrowth+repaid+recovered+loss;
 if(Math.min(repaid,recovered,loss,originations)<0)return null;
 return [originations,-repaid,-recovered,-loss,report.loanGrowth];
}
function renderCreditFlow(v,review){
 const next=creditFlowRows(review.operating),actual=v.me.operatingReport,prior=actual?.cycle===(v.gameOver?v.cycle:v.cycle-1)?creditFlowRows(actual):null;
 if(!next)return '<p role="status">Loan movement forecast unavailable. Review the current plan.</p>';
 const signed=n=>(n<0?'−':n>0?'+':'')+creditMoney(Math.abs(n)),labels=['New loans funded','Scheduled principal repaid','Collections principal recovered','Principal written off','Net operating loan change'];
 return '<section class="credit-policy"><h3>LOAN BOOK MOVEMENT</h3><p class="small">'+(next[4]<0?'The draft loan book contracts. Repayments return money to cash; credit losses reduce earnings.':'The draft adds to the loan book after repayments and losses.')+'</p><div class="table-scroll"><table class="forecast-table"><caption>Whole bank · operating movements only</caption><thead><tr><th>Movement</th><th>Last completed month</th><th>This draft</th></tr></thead><tbody>'+labels.map((label,i)=>'<tr><th scope="row">'+label+'</th><td>'+(prior?signed(prior[i]):'Not yet available')+'</td><td>'+signed(next[i])+'</td></tr>').join('')+'</tbody></table></div><p class="small">'+review.staffing.origination.toFixed(2)+' employee-months remain for origination after shared work ('+review.staffing.effectiveOrigination.toFixed(2)+' effective with expertise). Credit administration coverage: '+(review.staffing.administrationCoverage*100).toFixed(0)+'%. Base lending capacity (central desk + offices): '+creditMoney(review.facilityLoanCapacity)+'.</p><div class="credit-controls"><button type="button" class="btn" id="creditWorkCoverage">Review credit work coverage</button><button type="button" class="btn" id="creditOfficeCapacity">Inspect local offices</button></div><p class="micro muted">Current economy and draft policies; not a promised closing balance. Executive events, rival actions, opportunity wins, project completions and separate regulatory/funding sales are excluded. More capacity does not guarantee borrowers or funding. New loans use cash; principal repayments are not income.</p></section>';
}
function renderCollections(v) {
  $('#creditNav').classList.toggle('hidden',!v.me.creditPerformance);
  if(!v.me.creditPerformance){$('#creditPanel').innerHTML='';if(workspaceTab==='credit')setWorkspaceTab('overview');return;}
  if(workspaceTab!=='credit')return;
  const p=v.me,policy=draft.collectionsPolicy||p.creditPerformance.policy;
  const token=workforceEditToken(v);let prepared=null,forecast,incomeStanding,incomeDraft;
  try{prepared=p.departmentFunctions?E.departmentCreditPreview(p,v,draft):null;forecast=prepared?prepared.collections:E.creditPerformanceForecast({...p,turnEffects:{}},v.economy,draft.allocation,policy);
   incomeStanding=E.operatingPreview(p,standingOperatingPlan(p),v.economy,v);incomeDraft=prepared?prepared.operating:E.operatingPreview(p,draft,v.economy,v);}
  catch(error){$('#creditPanel').innerHTML='<h2>CREDIT QUALITY &amp; COLLECTIONS</h2><p role="status">Credit forecast unavailable: '+esc(error.message)+'</p><button type="button" class="btn" id="creditWorkCoverage">Review credit work coverage</button><button type="button" class="btn" id="restoreCollectionsPolicy" '+(p.submitted?'disabled':'')+'>Restore standing collections policy</button><p class="micro">Restoring changes only this draft’s collections instructions. It does not undo other department commitments.</p>';$('#creditWorkCoverage').addEventListener('click',()=>{if(creditContextCurrent(token))setPeopleDesk('coverage',{focus:true});});$('#restoreCollectionsPolicy').addEventListener('click',()=>{if(creditContextCurrent(token,true))stageCollectionsPolicy(currentView(),p.creditPerformance.policy.share,p.creditPerformance.policy.approach,token);});return;}
  const actual=p.creditPerformance.report;
  const key=v.territories[inspectedCreditMarket]?inspectedCreditMarket:draft.focus,cohorts=p.creditBook.cohorts.filter(c=>c.market===key);
  const disabled=p.submitted?'disabled':'',pct=n=>(n*100).toFixed(0)+'%';
  const products=Object.entries(E.creditProductOptions(p)).map(([product,option])=>{
    const term=E.CREDIT_TERMS[product]||option.months;
    const rows=cohorts.filter(c=>c.product===product),principal=rows.reduce((n,c)=>n+c.principal,0);
    const late=[0,1,2].map(i=>rows.reduce((n,c)=>n+c.late[i],0));
    const performing=principal-late.reduce((n,x)=>n+x,0),risk=principal?rows.reduce((n,c)=>n+c.principal*c.risk,0)/principal/10000:0;
    return `<tr><th>${esc(v.productPortfolios.credit.options[product].name)}<small>${term}-month new term</small></th><td>${creditMoney(performing)}</td>${late.map(n=>'<td>'+creditMoney(n)+'</td>').join('')}<td>${risk.toFixed(2)}×<small>Retained origination risk</small></td></tr>`;
  }).join('');
  const row=forecast.rows[key];
  $('#creditPanel').innerHTML=renderIncomeReview(v,incomeStanding,incomeDraft)+`<div class="section-head"><div><h2>CREDIT QUALITY &amp; COLLECTIONS</h2><p class="small muted">Today's lending becomes tomorrow's servicing workload. Current choices do not rewrite old loan terms.</p></div></div>
    <div class="credit-summary"><div><span>Performing principal</span><b>${creditMoney(forecast.performing)}</b><small>Delinquent balances earn no interest in this preview.</small></div><div><span>Delinquent principal</span><b>${creditMoney(forecast.late.reduce((n,x)=>n+x,0))}</b><small>30 / 60 / 90+ day aging groups</small></div><div><span>Draft collections coverage</span><b>${pct(forecast.coverage)}</b><small>${forecast.capacity.toFixed(2)} effective Lending staff for ${forecast.demand.toFixed(2)} workload units</small></div></div>
    <section class="credit-policy"><h3>RECURRING COLLECTIONS MANDATE</h3><div class="credit-controls"><label for="collectionShare">Lending time reserved for collections<select id="collectionShare" ${disabled}>${[0,25,50,75,100].map(n=>`<option value="${n}" ${policy.share===n?'selected':''}>${n}% reserved for collections</option>`).join('')}</select></label><label for="collectionApproach">Resolution approach<select id="collectionApproach" ${disabled}>${Object.entries(E.COLLECTION_APPROACHES).map(([k,d])=>`<option value="${k}" ${policy.approach===k?'selected':''}>${esc(d.name)}</option>`).join('')}</select></label></div>
    <p class="small">${forecast.salesStaff.toFixed(2)} effective Lending bankers remain for new production. Specialists strengthen their assigned team; this split does not add staff or salary. One effective collections banker covers $1M of delinquent principal.</p>
    <div class="table-scroll"><table class="regional-table"><thead><tr><th>Approach</th><th>30 / 60 day cure at full coverage</th><th>90+ day monthly resolution</th><th>Resolved balance written off</th><th>Case costs / $1M handled</th></tr></thead><tbody>${Object.values(E.COLLECTION_APPROACHES).map(d=>`<tr><th>${esc(d.name)}</th><td>${pct(d.early)} / ${pct(d.late)}</td><td>${pct(d.resolve)}</td><td>${pct(d.severity)}</td><td>${creditMoney(d.cost)}</td></tr>`).join('')}</tbody></table></div>
    <p class="micro muted">Workouts cure more early arrears and preserve more value but leave defaults unresolved longer. Accelerated recovery removes defaults faster with larger losses. Understaffing reduces cures; 90+ day resolution runs at 25–100% of the selected rate. External case costs are real operating expenses, even for unavoidable automatic recovery.</p></section>
    <p class="small">Current whole-book forced-sale discount: ${(forecast.fundingHaircut/100).toFixed(2)}% for funding / ${(forecast.regulatoryHaircut/100).toFixed(2)}% for regulatory sales. These are separate from collections. The base 6% / 7% discounts add the portfolio-weighted 10 / 30 / 70 percentage-point penalties for 30 / 60 / 90+ day balances. Triggering a funding sale does not turn defaults into near-par cash.</p>
    <div class="credit-summary"><div><span>Opening-book recovery forecast</span><b>${creditMoney(forecast.recovered)}</b><small>Principal returned to cash, not income.</small></div><div><span>Opening-book loss forecast</span><b>${creditMoney(forecast.loss)}</b><small>Loan asset and equity reduction, not another cash payment.</small></div><div><span>Case expense forecast</span><b>${creditMoney(forecast.cost)}</b><small>Charged once; excluded from event profit multipliers.</small></div></div>
    <label for="creditMarket">INSPECT A MARKET<select id="creditMarket">${marketEntries(v).map(([k,t])=>`<option value="${k}" ${key===k?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label><p class="micro muted">Inspection does not change the plan target. These balances are owned loans, not loan demand or map influence.</p>
    <div class="table-scroll"><table class="regional-table"><thead><tr><th>Existing product</th><th>Performing</th><th>30 day</th><th>60 day</th><th>90+ day</th><th>Origination risk</th></tr></thead><tbody>${products}</tbody></table></div>
    <p class="small">Local opening-book forecast: ${creditMoney(row.entered)} enters arrears; ${creditMoney(row.cured)} cures; ${creditMoney(row.recovered)} recovers; ${creditMoney(row.loss)} is written off.</p>
    <p class="small">${actual?'Last completed month, whole bank: '+creditMoney(actual.entered)+' entered arrears; '+creditMoney(actual.cured)+' cured; '+creditMoney(actual.recovered)+' recovered; '+creditMoney(actual.loss)+' written off; '+creditMoney(actual.cost)+' case costs.':'No completed credit review yet. New arrears must age before default resolution.'}</p>
    <details><summary>Timing, accounting and forecast limits</summary><p class="small">New loans retain their product, rate and underwriting risk, with two monthly seasoning reviews before they can enter arrears. Existing opening loans are seasoned. Uncured balances move one group per month; new 90+ day balances cannot resolve until the following review. Delinquent principal stops scheduled payments and interest; cures resume normal payments without inventing back-interest. Scheduled maturity never deletes unpaid balances. Acquisition and funding sales preserve or proportionally remove every aging group.</p><p class="small">The economy and credit events affect new missed payments. Operations staff and risk research improve newly originated risk, not the old book. Portfolio product/underwriting controls remain in Operations. These are fictional principal-at-risk groups, not individual invoices, legal collection procedures or a full allowance/reserve model. Exceptional watchlist events can still cause additional direct losses outside the monthly aging report.</p><p class="micro muted">Forecast uses the opening book, current economy and draft staff/mandate. Executive events, funding sales and rival actions can change actual results. Case handling may force funding sales if cash is short. Research, collections and funding are not guaranteed protection from failure.</p></details>`;
  const update=()=>stageCollectionsPolicy(v,Number($('#collectionShare').value),$('#collectionApproach').value,token);
  $('#collectionShare').addEventListener('change',update);$('#collectionApproach').addEventListener('change',update);
  $('#creditMarket').addEventListener('change',e=>{if(!creditContextCurrent(token))return;inspectedCreditMarket=e.target.value;renderCollections(currentView());});
  if(p.creditPortfolio){$('#creditPanel').insertAdjacentHTML('afterbegin',groupCreditControls(v));bindGroupCreditControls(v);}
  if(prepared){$('#creditPanel').insertAdjacentHTML('afterbegin',renderCreditFlow(v,prepared));
   $('#creditWorkCoverage')?.addEventListener('click',()=>{if(!creditContextCurrent(token))return;setPeopleDesk('coverage',{focus:true});if(departmentFunctionsLive.controller){const c=departmentFunctionsLive.controller;c.select('credit',c.token());renderDepartments(currentView());}});
   $('#creditOfficeCapacity')?.addEventListener('click',()=>{if(!creditContextCurrent(token))return;const now=currentView();setWorkspaceTab('markets');inspectMarket(now,key);});
  }
}
