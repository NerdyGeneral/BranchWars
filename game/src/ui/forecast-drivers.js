// Forecast & books → Growth & limits. What holds growth back this month, what
// each project adds once complete, and what research and operating models
// contribute. Computed only while this view is open, and cached until the
// draft, the month or the owner changes.
let forecastDriverCache={key:null,result:null};
function forecastDriverSeat(){return game?seat:(p2pRole==='guest'?1:0)}
function forecastDriverResult(v){
 const key=JSON.stringify([v.me.id,v.cycle,forecastDriverSeat(),draft]);
 if(forecastDriverCache.key!==key){
  let result;try{result=E.forecastDrivers(v,v.me,draft,forecastDriverSeat());}catch(error){result={error:error.message};}
  forecastDriverCache={key,result};
 }
 return forecastDriverCache.result;
}
function forecastDriverSigned(n){return n?(n<0?'−':'+')+money(Math.abs(n)):'—'}
function forecastLimitTable(title,part,note){
 if(!part.terms.length)return '';
 return '<div class="forecast-limit"><table class="forecast-table forecast-limit-table"><thead><tr><th>'+esc(title)+'</th><th>This month</th></tr></thead><tbody>'+
  part.terms.map(t=>'<tr'+(t.key===part.binding?' class="forecast-limit-binding"':'')+'><td>'+esc(t.label)+(t.key===part.binding?' <b class="forecast-limit-badge">Limiting</b>':'')+'</td><td>'+money(t.amount)+'</td></tr>').join('')+
  '</tbody></table>'+(note?'<p class="micro muted">'+note+'</p>':'')+'</div>';
}
function renderForecastLimits(part){
 if(part.error)return '<p class="notice">Growth limits are unavailable for this draft: '+esc(part.error)+'</p>';
 const L=part.value,r=L.relationships;
 return '<h3>WHAT LIMITS GROWTH THIS MONTH</h3><p class="micro muted">Each month the bank grows by the smallest of these. Raising the limiting one is what speeds growth; raising the others does not.</p>'+
  '<div class="forecast-limit-grid">'+
  forecastLimitTable('New deposits',L.deposits,'Forecast deposit gain: '+money(L.deposits.gain)+'. More Retail &amp; Service bankers or another branch raise what you can gather.')+
  forecastLimitTable('New loans',L.loans,L.loans.deployment?'Includes '+money(L.loans.deployment)+' of central deployment from your balance sheet.':'More Lending bankers, spare cash or office capacity raise this, whichever is limiting.')+
  '</div>'+
  (r?'<p class="notice'+(r.saturated?' bad':'')+'"><b>Business &amp; merchant relationships:</b> '+integer(r.held)+' of '+integer(r.capacity)+' your branches can serve. '+(r.saturated?'New relationships now slow sharply; open branches to serve more.':'Past '+integer(r.capacity)+', new relationships slow sharply; open branches to add room.')+'</p>':'');
}
function renderForecastProjects(part){
 if(part.error)return '<p class="notice">Project effects are unavailable for this draft: '+esc(part.error)+'</p>';
 const rows=part.value;
 const body=rows.length?rows.map(r=>'<tr><td>'+esc(r.name)+(r.targetName?'<br><span class="micro muted">'+esc(r.targetName)+'</span>':'')+'</td><td>'+(r.staged?'Staged this month':'Under way · '+integer(r.progress)+' of '+integer(r.total||0)+' work')+'</td>'+
  (r.change?['profit','depositGrowth','loanGrowth','commercialIncome'].map(k=>'<td>'+forecastDriverSigned(r.change[k])+'</td>').join(''):'<td colspan="4" class="micro muted">'+esc(r.reason||'Not estimated.')+'</td>')+'</tr>').join(''):
  '<tr><td colspan="6" class="micro muted">No projects are under way or staged this month.</td></tr>';
 return '<h3>PROJECTS · MONTHLY EFFECT ONCE COMPLETE</h3><p class="micro muted">This month&#39;s forecast with each project finished, one at a time, compared with your draft as it stands. Construction cost is not included; upkeep is.</p>'+
  '<div class="table-scroll"><table class="forecast-table"><thead><tr><th>Project</th><th>Status</th><th>Profit</th><th>Deposit growth</th><th>Loan production</th><th>Fee income</th></tr></thead><tbody>'+body+'</tbody></table></div>';
}
function renderForecastResearch(part){
 if(part.error)return '<p class="notice">Research effects are unavailable for this draft: '+esc(part.error)+'</p>';
 const rows=part.value;
 const label=r=>r.kind==='model'?esc(r.name)+'<br><span class="micro muted">'+esc(r.branchName)+' operating model</span>':esc(r.name)+'<br><span class="micro muted">Research level '+integer(r.level)+'</span>';
 const body=rows.length?rows.map(r=>'<tr><td>'+label(r)+'</td>'+(Object.values(r.change).some(Boolean)?['profit','commercialIncome','depositGrowth','loanGrowth'].map(k=>'<td>'+forecastDriverSigned(r.change[k])+'</td>').join(''):'<td colspan="4" class="micro muted">'+(r.kind==='research'&&!r.level?'No effect until level 1.':'No effect on this month&#39;s forecast.')+'</td>')+'</tr>').join(''):
  '<tr><td colspan="5" class="micro muted">No research or operating model yet. Fund a capability in Strategy.</td></tr>';
 return '<h3>RESEARCH &amp; OPERATING MODELS · THIS MONTH&#39;S CONTRIBUTION</h3><p class="micro muted">This month&#39;s forecast with and without each item. Items that work together, such as a combination that needs two branches, share credit, so the rows do not add up to a total.</p>'+
  '<div class="table-scroll"><table class="forecast-table"><thead><tr><th>Research or model</th><th>Profit</th><th>Fee income</th><th>Deposit growth</th><th>Loan production</th></tr></thead><tbody>'+body+'</tbody></table></div>';
}
function renderForecastDrivers(v){
 const result=forecastDriverResult(v);
 if(result.error)return '<p class="notice">Growth drivers are unavailable: '+esc(result.error)+'</p>';
 return renderForecastLimits(result.limits)+renderForecastProjects(result.projects)+renderForecastResearch(result.research)+
  '<p class="micro muted">Same economy and staffing as your draft. Estimates exclude executive events, rival actions and market results.</p>';
}
function renderHiringImpact(v){
 let r;try{r=E.forecastHiringImpact(v,v.me,draft);}catch(error){return '<p class="notice" role="status">Hiring impact unavailable for this draft: '+esc(error.message)+'</p>';}
 const roleName={service:'Retail & service',business:'Business',lending:'Lending',operations:'Operations'},
  limitName={demand:'banker demand',market:'market supply',office:'office capacity',staff:'lending staff',funding:'spare cash'};
 const amount=(n,delta)=>money(n)+' <span class="micro muted">('+forecastDriverSigned(delta)+')</span>';
 const rows=r.rows.map(row=>row.error?'<tr><th scope="row">'+roleName[row.role]+'</th><td colspan="5" class="micro muted">Unavailable: '+esc(row.error)+'</td></tr>':
  '<tr><th scope="row">'+roleName[row.role]+'</th><td>'+amount(row.forecast.depositGrowth,row.change.depositGrowth)+'</td><td>'+amount(row.forecast.loanGrowth,row.change.loanGrowth)+'</td><td>'+amount(row.forecast.profit,row.change.profit)+'</td><td>'+money(row.forecast.expense)+'</td><td class="micro">Deposits: '+esc(limitName[row.depositLimit]||'no limit')+'; loans: '+esc(limitName[row.loanLimit]||'no limit')+'</td></tr>').join('');
 return '<h3>EXPECTED HIRING IMPACT</h3><p class="small"><b>'+integer(r.count)+' '+(r.staged?'staged recruit'+(r.count===1?'':'s'):'illustrative additional banker')+'</b> · '+(r.staged?'Joining after this month’s operations; the table assigns all staged recruits to one role at a time. They initially join Retail &amp; service; reassign them in next month’s plan to realize another row.':'No recruit staged; the table illustrates one additional generalist in each role.')+'</p>'+
  '<p class="micro muted">Current-month draft: net deposits '+money(r.current.depositGrowth)+', net loans '+money(r.current.loanGrowth)+', operating profit '+money(r.current.profit)+'. Parentheses in the table show change from this draft. Hires do not affect this month’s production.</p>'+
  '<div class="table-scroll"><table class="forecast-table"><caption>Estimated monthly run rate if recruits work in each role</caption><thead><tr><th>Assign arrivals to</th><th>Net deposit growth</th><th>Net loan production</th><th>Operating profit</th><th>Operating expense</th><th>Growth limits</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<p class="micro muted">Uses today’s balances, economy, offices, draft policies and existing staff assignments as a fixed starting point. Includes recurring payroll and recruited specialist skills. Excludes one-time signing cost, named company-loan offers, the current month’s changing book, future market moves, events, rivals and projects. A zero growth change can mean another limit is holding; see Growth &amp; limits.</p>';
}
