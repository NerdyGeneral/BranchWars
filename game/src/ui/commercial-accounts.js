function companyCreditNeedContent(company){
 const n=E.CompanyCredit.assess(company);
 return '<details class="office-ledger"><summary>Company financing needs · assessment only</summary><div class="decision-facts"><div><small>Company cash</small><b>'+money(n.cash)+'</b></div><div><small>Existing company debt</small><b>'+money(n.debt)+'</b></div><div><small>Unpaid obligations</small><b>'+money(n.unpaidBills)+'</b></div><div><small>Indicative operating-cash need</small><b>'+money(n.requested)+'</b></div></div><p class="small">'+esc(n.basis)+' Cash after estimated operations, services and scheduled debt payments: '+money(n.cashAfterDebt)+'/month. '+(n.closed?'This company has stopped trading.':n.requested?'A potential '+(n.product==='smallBusiness'?'small-business':'commercial')+' working-capital borrower; credit approval and funding are separate from winning its deposit account.':'No additional operating-cash advance is indicated at this cash level.')+'</p><p class="micro muted">This is a provisional assessment, not an application, approved loan or guaranteed demand. It uses a two-month operating buffer and bounded exposure. Named-company loan funding is not available in this build; bank ownership, service contracts and operating deposits do not automatically create it.</p></details>';
}
function renderCommercialAccountPanel(v,agreement,mount){
 if(!v.me.commercialAccounts||!agreement||!mount)return;
 const row=v.commercialAccountMarket.rows.find(r=>r.market===agreement.market),company=v.me.companySnapshot.world.companies.find(c=>c.id===row.id);
 let q;try{q=E.commercialAccountReview(v,v.me,draft);}catch(error){mount.insertAdjacentHTML('beforeend','<section class="notice"><h4>Business account planning unavailable</h4><p>'+esc(error.message)+'</p><p>Review the current staffing and department instructions. No orders were changed.</p></section>');return;}
 const token=opportunityToken(v),locked=!opportunityCurrent(token),own=row.owner===v.me.id,
  pursuing=q.policy.target===row.id,name=E.clientProfile(agreement).name,eligible=!!v.me.branches[row.market]&&!company.resolution;
 mount.insertAdjacentHTML('beforeend','<section class="notice" aria-labelledby="businessAccountTitle"><h4 id="businessAccountTitle">'+esc(name)+' · operating cash account</h4>'+
  '<p>Current provider: <b>'+esc(own?v.me.name:row.owner===v.rival.id?v.rival.name:'Outside bank')+'</b> · '+money(row.balance)+' held with a player bank. Qualification with you: '+row.progress+'/2.</p>'+
  '<p class="small">A non-interest-bearing transaction account holds half this company’s actual cash; the rest stays elsewhere. At today’s cash level that is '+money(Math.floor(company.book.accounts.cash/2))+', not a promised deposit. No deposit is created until the client selects you.</p>'+
  '<button type="button" class="btn" id="businessAccountPursue" '+(locked||(!eligible&&!pursuing)||own?'disabled':'')+'>'+(pursuing?'Stop this account pursuit':'Pursue operating account')+'</button>'+
  (!eligible?'<p class="small warn">An operating office in this market and a trading company are required.</p>':'')+
  '<h4>Shared business-account team · whole bank</h4><div class="office-controls-row"><button type="button" class="btn" id="businessWorkLess" '+(locked||!q.requested?'disabled':'')+' aria-label="Reduce business account work">−</button><span><b>'+(q.requested/4).toFixed(2)+' employee-months requested</b> · '+(q.quarters/4).toFixed(2)+' covered</span><button type="button" class="btn" id="businessWorkMore" '+(locked||q.requested>=8?'disabled':'')+' aria-label="Increase business account work">+</button></div>'+
  '<p class="small">'+(q.capacity/4).toFixed(2)+' employee-months eligible after other Business commitments. Each step reserves a quarter of one employee’s month (0.25). '+q.service+' existing account'+(q.service===1?'':'s')+' need 0.25 each; '+(q.development/4).toFixed(2)+' remains for development. This uses existing Business capacity and reduces ordinary sales, not a new employee pool. Existing payroll still applies.</p>'+
  (q.quarters<q.requested||q.quarters<q.service||pursuing&&!q.development?'<p class="small warn">'+(pursuing&&!q.development?'This pursuit cannot advance with the current covered time. ':'')+'Restore Business work capacity or reduce other commitments. Three missed service months cause account withdrawal.</p>':'')+
  '<button type="button" class="btn" id="businessAccountStaffing">Review Business work coverage</button>'+
  '<details><summary>Qualification, competition and timing</summary><p>One development quarter advances the selected company each month; two pursued months qualify an offer. A staffed incumbent receives a retention advantage. Reputation, Commercial capability and a delivered treasury mandate affect selection. No guaranteed win. Existing accounts receive work first. Stopping pursuit does not close an existing account; removing all service work can cause withdrawal after three misses.</p><p>Bank cash and deposit liabilities move together at month-end. Company payments change future balances. These funds are not profit, shareholder capital or household savings. Staffing and target are standing instructions; nothing is submitted by these controls.</p></details></section>');
 const stage=(change,focus)=>{
  if(!opportunityCurrent(token)||token.stamp!==JSON.stringify(draft))return;
  const candidate=JSON.parse(JSON.stringify(draft));candidate.commercialAccountPolicy={...q.policy,...change};
  try{E.normalizeCommercialAccountPlan(v.me,candidate);E.commercialAccountReview(v,v.me,candidate);}catch(error){toast(error.message);return;}
  draft=candidate;renderPipeline(currentView());renderReady(currentView());$(focus)?.focus?.({preventScroll:true});
 };
 $('#businessAccountPursue')?.addEventListener('click',()=>stage({target:pursuing?null:row.id},'#businessAccountPursue'));
 $('#businessWorkLess')?.addEventListener('click',()=>stage({staffQuarters:Math.max(0,q.requested-1)},'#businessWorkLess'));
 $('#businessWorkMore')?.addEventListener('click',()=>stage({staffQuarters:Math.min(8,q.requested+1)},'#businessWorkMore'));
 $('#businessAccountStaffing')?.addEventListener('click',()=>{if(currentView()?.me.id===v.me.id)navigatePlanReview({tab:'workforce',peopleDesk:'coverage',target:'#departmentPanel'});});
 if(v.me.companyCredit)renderCompanyCreditPanel(v,company,mount);
 else mount.insertAdjacentHTML('beforeend',companyCreditNeedContent(company));
}
