// One live editor, moved rather than copied: IDs, listeners, draft validation
// and department form state remain owned by their existing implementation.
let monthlyEditorState=null,monthlyReviewIdentity=null;
function closeMonthlyEditor(){
 const state=monthlyEditorState;monthlyEditorState=null;
 if(state){state.home?.insertBefore(state.panel,state.next?.parentNode===state.home?state.next:null);state.panel.hidden=state.hidden;if(state.wasHidden)state.panel.classList.add('hidden');}
 const editor=$('#monthlyEditor');if(editor)editor.hidden=true;
}
function reconcileMonthlyEditor(v,review){
 const identity=game||view;
 if(monthlyEditorState&&(monthlyEditorState.identity!==identity||monthlyEditorState.owner!==v.me.id||monthlyEditorState.cycle!==v.cycle||v.me.submitted||v.gameOver))closeMonthlyEditor();
 if(!monthlyReviewIdentity||monthlyReviewIdentity.identity!==identity||monthlyReviewIdentity.owner!==v.me.id||monthlyReviewIdentity.cycle!==v.cycle){
  monthlyReviewIdentity={identity,owner:v.me.id,cycle:v.cycle};
  // Once per month only; explicit disclosure choices survive redraws.
  if($('#monthlyReviewDetails'))$('#monthlyReviewDetails').open=review.blockers.length>0;
 }
 if(monthlyEditorState){monthlyEditorState.panel.hidden=false;monthlyEditorState.panel.classList.remove('hidden');}
 if($('#monthlyEditorClose'))$('#monthlyEditorClose').onclick=()=>{closeMonthlyEditor();$('#monthlyReviewSummary')?.focus();};
}
function openMonthlyEditor(item){
 const v=currentView();if(!v||!draft)return false;
 closeMonthlyEditor();
 let panel;
 if(item.id==='decision'||item.target==='#decisionGrid')panel=$('#decisionGrid')?.parentElement;
 else if(item.id==='allocation'||item.target==='#staffGrid')panel=$('#staffGrid')?.parentElement;
 else if(['coverage','functions','functions-quote'].includes(item.id)||item.functionId){
  if(!v.me.departmentFunctions)return false;
  departmentFunctionsIdentity();departmentFunctionsLive.tab='functions';renderDepartments(v);
  const c=departmentFunctionsLive.controller;
  if(item.functionId&&c?.select(item.functionId,c.token()))renderDepartments(v);
  panel=$('#departmentPanel');
 }else if(item.target==='#facilityLifecyclePanel')panel=$('#facilityLifecyclePanel');
 if(!panel||!$('#monthlyEditorBody')?.appendChild){navigatePlanReview(item);return false;}
 monthlyEditorState={panel,home:panel.parentElement,next:panel.nextSibling,hidden:panel.hidden,wasHidden:panel.classList.contains('hidden'),identity:game||view,owner:v.me.id,cycle:v.cycle};
 $('#monthlyEditorBody').appendChild(panel);panel.hidden=false;panel.classList.remove('hidden');
 $('#monthlyEditorTitle').textContent=item.title||'Review work coverage';$('#monthlyEditor').hidden=false;$('#monthlyReviewDetails').open=true;
 $('#monthlyEditorClose').onclick=()=>{closeMonthlyEditor();$('#monthlyReviewSummary')?.focus();};
 focusWorkspaceTarget($('#monthlyEditorTitle'));return true;
}
function renderLoanProductionBreakdown(before,after,actual=false){
 const a=E.loanProductionBreakdown(before),b=E.loanProductionBreakdown(after);
 if(!a.available||!b.available)return '<p class="notice">Loan production components are unavailable for this report; unavailable does not mean zero.</p>';
 const labels=[['New ordinary loans','ordinary'],['Named-company advances','named'],['Scheduled principal repayments','scheduled'],['Principal recovered through collections','collections'],['Principal losses','losses'],['Net operating loan movement','net']];
 return '<section aria-label="Loan production and repayments"><h3>'+(actual?'Recorded operating loan movement · month '+esc(after.cycle):'Where the loan book changes')+'</h3>'+(!actual&&b.ordinary===0?'<p class="warn"><b>New ordinary lending forecast: $0.</b> Existing repayments continue. Check credit administration, available lending time, facility capacity and funding.</p>':'')+'<div class="table-scroll"><table class="regional-table"><thead><tr><th>Operations component / month</th>'+(actual?'<th>Actual</th>':'<th>Standing plan</th><th>Your draft</th>')+'</tr></thead><tbody>'+labels.map(([label,key])=>'<tr><th>'+label+'</th>'+(actual?'':'<td>'+money(a[key])+'</td>')+'<td>'+money(b[key])+'</td></tr>').join('')+'</tbody></table></div><p class="micro">'+(actual?'Recorded operations only, not the entire month-end portfolio bridge. ':'Forecast, not guaranteed results. ')+'Advances are assets, not income; principal repayments are not interest. Trades, forced asset sales and later awards are separate from this operating flow.</p></section>';
}
function renderFunctionEconomicImpact(built,selected){
 if(!built.view||!built.owner||!built.plan||!['credit','relationships'].includes(selected))return '';
 try{
  const v=built.view,p=built.owner,plan=built.plan;
  const r=p.companyCredit&&plan.companyCreditOrders?.length?E.companyCreditPlanForecast(v,p,plan).funded:E.operatingPreview(p,plan,v.economy,v,true),b=E.loanProductionBreakdown(r);
  if(!b.available)return '<p class="notice">Production forecast unavailable. No orders changed.</p>';
  return '<section class="function-economic-impact" aria-label="Reviewed work consequences"><h4>Expected results with this reviewed allocation</h4><div class="people-summary"><div><span>New ordinary loans</span><b>'+money(b.ordinary)+'</b></div><div><span>Scheduled principal repayments</span><b>'+money(b.scheduled)+'</b></div><div><span>Business & merchant fees</span><b>'+money(r.commercialIncome)+'</b></div><div><span>Operating profit</span><b>'+money(r.profit)+'</b></div></div><p class="small">'+(b.ordinary===0?'Ordinary lending is stopped under this forecast; existing repayments continue. ':'')+(r.commercialServiceCoverage===0?'Commercial servicing is uncovered: no recurring business/merchant fees are forecast. ':'')+'Use the controls below, then Preview to compare the effect. Reassigning time can reduce other work. Forecasts exclude the executive call, rival choices and future project completions; no money moves in this review.</p></section>';
 }catch(error){return '<p class="notice">Financial forecast unavailable: '+esc(error.message)+'. Review shared capacity and funding. No orders changed.</p>';}
}
