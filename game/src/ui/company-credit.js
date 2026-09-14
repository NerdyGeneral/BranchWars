// A company owns its credit ticket. Local edits never become a submitted loan
// until the shared queue review accepts them and the player stages the offer.
let companyCreditWorkspace={token:null,forms:{}};
function companyCreditForm(v,company){
 const token=opportunityToken(v),old=companyCreditWorkspace.token;
 if(!old||!opportunityCurrent(old,false))companyCreditWorkspace={token,forms:{}};
 const staged=(draft.companyCreditOrders||[]).find(o=>o.companyId===company.id),key=JSON.stringify(staged||null);
 let form=companyCreditWorkspace.forms[company.id];
 if(!form||form.staged!==key){
  const need=E.CompanyCredit.assess(company);
  form={staged:key,principal:String(staged?.principal||Math.max(1000,Math.min(10000,need.requested))),rate:((staged?.annualRateBp||800)/100).toFixed(2),months:staged?.months||48,appetite:staged?.appetite||'balanced',dirty:false};
  companyCreditWorkspace.forms[company.id]=form;
 }
 return form;
}
function companyCreditCandidate(v,company,form){
 if(!/^\d+$/.test(form.principal)||!/^\d+(?:\.\d{1,2})?$/.test(form.rate))throw Error('Use whole dollars for the advance and an annual rate with at most two decimal places.');
 const need=E.CompanyCredit.assess(company),candidate=JSON.parse(JSON.stringify(draft));
 const order={companyId:company.id,principal:Number(form.principal),annualRateBp:Math.round(Number(form.rate)*100),months:form.months,appetite:form.appetite,product:need.product};
 candidate.companyCreditOrders=[...(candidate.companyCreditOrders||[]).filter(o=>o.companyId!==company.id),order];
 const forecast=E.companyCreditPlanForecast(v,v.me,candidate);
 return {candidate,forecast};
}
function companyCreditComparisonContent(q){
 const r=q.review,rows=[['Cash after operations','closingCash'],['Operating profit','profit'],['Net loan growth','loanGrowth']];
 return '<div class="decision-facts"><div><small>All queued advances · cash to assets</small><b>'+money(r.principal)+'</b></div><div><small>Available after spending &amp; reserve</small><b>'+money(r.cashAvailable)+'</b></div><div><small>Underwriting time reserved</small><b>'+(r.reservedQuarters/4).toFixed(2)+' employee-months</b></div><div><small>Ordinary origination capacity left</small><b>'+money(r.ordinaryCapacity)+'</b></div></div>'+
  '<p class="small">'+r.orders.length+' company offer'+(r.orders.length===1?'':'s')+' in this reviewed queue. Protected liquidity: '+money(r.liquidityReserve)+'. Current capital permits up to '+money(r.capitalAvailable)+' additional loan exposure after other commitments. Existing payroll still applies.</p>'+
  '<details><summary>Borrower payment and coverage review</summary>'+r.quotes.map(x=>'<p class="small">'+esc(E.ANCHOR_CLIENTS[Number(x.companyId.slice(-1))].name)+': initial monthly principal '+money(x.monthlyPrincipal)+' + interest '+money(x.monthlyInterest)+'. Observed cash-flow coverage '+x.coverage.toFixed(2)+'×; selected standard requires '+x.requiredCoverage.toFixed(2)+'×. Principal declines; future interest and payment capacity can change.</p>').join('')+'</details>'+
  '<table class="forecast-table"><caption>Same draft: no new company loans versus all offers funded</caption><thead><tr><th>Monthly estimate</th><th>No new offers</th><th>If all fund</th></tr></thead><tbody>'+rows.map(([label,key])=>'<tr><th scope="row">'+label+'</th><td>'+money(q.baseline[key])+'</td><td>'+money(q.funded[key])+'</td></tr>').join('')+'</tbody></table>'+
  '<p class="micro muted">'+esc(q.assumptions)+'</p>';
}
function renderCompanyCreditPanel(v,company,mount){
 if(!v.me.companyCredit)return;
 const token=opportunityToken(v),locked=!opportunityCurrent(token),need=E.CompanyCredit.assess(company),
  note=v.me.companySnapshot.world.credit.notes.find(n=>n.companyId===company.id),staged=(draft.companyCreditOrders||[]).some(o=>o.companyId===company.id),
  unavailable=!!company.resolution||note&&note.status!=='repaid',form=companyCreditForm(v,company);
 mount.insertAdjacentHTML('beforeend','<section class="credit-policy" aria-labelledby="companyLoanTitle"><h4 id="companyLoanTitle" tabindex="-1">Company working-capital loan</h4>'+
  '<p class="small">Indicative cash need: <b>'+money(need.requested)+'</b> · Existing debt: '+money(need.debt)+'. '+esc(need.basis)+' Winning an account does not automatically create a loan.</p>'+
  (note?'<div class="notice"><b>'+esc(note.bankId===v.me.id?'Your loan':v.rival.name+' loan')+' · '+esc(note.status)+'</b><p>'+money(note.principal)+' principal remaining · '+money(note.interestDue)+' unpaid interest · '+note.remaining+' payments remaining · '+note.misses+' missed months. Original advance: '+money(note.original)+'. Annual rate: '+(note.annualRateBp/100).toFixed(2)+'%.</p></div>':'')+
  (unavailable?'<p class="small">'+(company.resolution?'This company has stopped trading.':'An outstanding or written-off facility prevents another advance. Servicing and recovery continue through monthly settlement.')+'</p>':
  '<div class="decision-facts"><label>Advance · whole dollars<input id="companyLoanAmount" type="number" min="1000" step="1" value="'+esc(form.principal)+'" '+(locked?'disabled':'')+'></label><label>Annual interest · %<input id="companyLoanRate" type="number" min="4" max="18" step="0.01" value="'+esc(form.rate)+'" '+(locked?'disabled':'')+'></label></div>'+
  '<div class="office-controls-row" role="group" aria-label="Loan term">'+[12,24,36,48].map(n=>'<button type="button" class="btn" id="companyLoanTerm'+n+'" aria-pressed="'+(form.months===n)+'" '+(locked?'disabled':'')+'>'+n+' months</button>').join('')+'</div>'+
  '<div class="office-controls-row" role="group" aria-label="Underwriting standard">'+['conservative','balanced','growth'].map(a=>'<button type="button" class="btn" id="companyLoanRisk'+a+'" aria-pressed="'+(form.appetite===a)+'" '+(locked?'disabled':'')+'>'+esc(a[0].toUpperCase()+a.slice(1))+'</button>').join('')+'</div>'+
  '<p class="micro muted">A qualified operating account or delivered service mandate is required. Credit staff, cash and capital must cover the entire queue. Borrowers favor eligible larger advances, then lower rates and longer terms; a rival can win. Monthly repayments are not profit, and unpaid credit can deteriorate or be written off.</p>'+
  '<button type="button" class="btn" id="companyLoanReview" '+(locked?'disabled':'')+'>Review offer &amp; whole queue</button> <button type="button" class="btn" id="companyLoanCancel" '+(locked?'disabled':'')+'>Discard form edits</button>')+
  '<div id="companyLoanReviewResult" aria-live="polite"></div><p id="companyLoanStatus" role="status">'+(staged?'An offer for this company is staged, not yet submitted.':'No offer for this company is staged.')+'</p>'+
  '<button type="button" class="btn" id="companyLoanStage" disabled>Stage reviewed offer</button> '+(staged?'<button type="button" class="btn" id="companyLoanRemove" '+(locked?'disabled':'')+'>Remove staged offer</button>':'')+
  '<button type="button" class="btn" id="companyLoanStaffing">Review Credit work coverage</button></section>');
 const current=()=>opportunityCurrent(token)&&token.stamp===JSON.stringify(draft),status=text=>{$('#companyLoanStatus').textContent=text;};let reviewed=false;
 const changed=()=>{form.dirty=true;reviewed=false;$('#companyLoanStage').disabled=true;$('#companyLoanReviewResult').innerHTML='';status('Unstaged form edits. Review the whole queue before staging.');};
 for(const [id,key]of [['#companyLoanAmount','principal'],['#companyLoanRate','rate']])$(id)?.addEventListener('input',()=>{if(!current())return;form[key]=$(id).value;changed();});
 for(const n of [12,24,36,48])$('#companyLoanTerm'+n)?.addEventListener('click',()=>{if(!current())return;form.months=n;changed();for(const t of [12,24,36,48])$('#companyLoanTerm'+t).setAttribute('aria-pressed',String(n===t));});
 for(const a of ['conservative','balanced','growth'])$('#companyLoanRisk'+a)?.addEventListener('click',()=>{if(!current())return;form.appetite=a;changed();for(const t of ['conservative','balanced','growth'])$('#companyLoanRisk'+t).setAttribute('aria-pressed',String(a===t));});
 $('#companyLoanReview')?.addEventListener('click',()=>{
  if(!current()||unavailable)return;
  try{const {forecast}=companyCreditCandidate(v,company,form);$('#companyLoanReviewResult').innerHTML=companyCreditComparisonContent(forecast);reviewed=true;$('#companyLoanStage').disabled=false;status('Review complete. This does not move money or submit your turn.');}
  catch(error){reviewed=false;$('#companyLoanStage').disabled=true;$('#companyLoanReviewResult').innerHTML='';status(error.message);}
 });
 const redraw=()=>{renderReady(currentView());$('#companyLoanTitle')?.focus?.({preventScroll:true});};
 $('#companyLoanStage')?.addEventListener('click',()=>{if(!current()||!reviewed||unavailable)return;try{draft=companyCreditCandidate(v,company,form).candidate;form.dirty=false;redraw();}catch(error){status(error.message);}});
 $('#companyLoanRemove')?.addEventListener('click',()=>{if(!current()||!staged)return;draft={...draft,companyCreditOrders:draft.companyCreditOrders.filter(o=>o.companyId!==company.id)};delete companyCreditWorkspace.forms[company.id];redraw();});
 $('#companyLoanCancel')?.addEventListener('click',()=>{if(!current())return;delete companyCreditWorkspace.forms[company.id];redraw();});
 $('#companyLoanStaffing')?.addEventListener('click',()=>{if(opportunityCurrent(token,false))navigatePlanReview({tab:'workforce',peopleDesk:'coverage',target:'#departmentPanel'});});
}
