// Presentation-only desks: changing desks neither stages nor discards a plan.
const FINANCIAL_GROUP_DESKS=Object.freeze({capital:['Capital','Funding and group statements'],agency:['Insurance agency','Staff, sales and client covers'],companies:['Companies','Cash, invoices and credit exposure'],investments:['Investment services','Qualified teams and client assets']});
let financialGroupInvestmentAvailable=false;
function financialGroupDeskKeys(){return Object.keys(FINANCIAL_GROUP_DESKS).filter(k=>k!=='investments'||financialGroupInvestmentAvailable);}
let financialGroupDesk='capital',financialGroupDeskOwner=null;
function setFinancialGroupDesk(key,{focus=false}={}){
  financialGroupDesk=financialGroupDeskKeys().includes(key)?key:'capital';
  for(const name of financialGroupDeskKeys()){
    const active=name===financialGroupDesk,button=$('#groupTab-'+name),panel=$('#groupDesk-'+name);
    button.ariaSelected=active?'true':'false';button.tabIndex=active?0:-1;button.classList.toggle('active',active);
    panel.hidden=!active;if(active&&focus)button.focus();
  }
}
function financialGroupDeskKey(event,key){
  const keys=financialGroupDeskKeys(),at=keys.indexOf(key);let next;
  if(event.key==='ArrowRight'||event.key==='ArrowDown')next=keys[(at+1)%keys.length];
  else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=keys[(at+keys.length-1)%keys.length];
  else if(event.key==='Home')next=keys[0];
  else if(event.key==='End')next=keys.at(-1);
  else return;
  event.preventDefault();setFinancialGroupDesk(next,{focus:true});
}
function financialGroupDeskNavigation(v){
  financialGroupInvestmentAvailable=!!v.me.investmentBusiness;
  if(!financialGroupDeskKeys().includes(financialGroupDesk))financialGroupDesk='capital';
  if(financialGroupDeskOwner!==v.me.id){financialGroupDeskOwner=v.me.id;financialGroupDesk='capital';}
  return '<div class="section-head"><div><h2>FINANCIAL GROUP</h2><p class="small muted">One shared monthly plan. Switch desks without changing staged instructions.</p></div></div>'+
    '<div class="operations-tabs" role="tablist" aria-label="Financial Group desks" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">'+
    financialGroupDeskKeys().map(key=>{const [label,hint]=FINANCIAL_GROUP_DESKS[key];return '<button type="button" role="tab" id="groupTab-'+key+'" aria-controls="groupDesk-'+key+'" aria-selected="'+(financialGroupDesk===key?'true':'false')+'" tabindex="'+(financialGroupDesk===key?'0':'-1')+'">'+label+'<span>'+hint+'</span></button>';}).join('')+'</div>';
}
function financialGroupDeskPanel(key,html){
  return '<section class="operations-pane" id="groupDesk-'+key+'" role="tabpanel" aria-labelledby="groupTab-'+key+'"'+(financialGroupDesk===key?'':' hidden')+'>'+html+'</section>';
}
function bindFinancialGroupDesks(){
  const token=groupContext(currentView());
  for(const key of financialGroupDeskKeys()){
    const button=$('#groupTab-'+key);
    button.addEventListener('click',()=>{if(groupContextCurrent(token,false))setFinancialGroupDesk(key);});
    button.addEventListener('keydown',event=>{if(groupContextCurrent(token,false))financialGroupDeskKey(event,key);});
  }
  setFinancialGroupDesk(financialGroupDesk);
}
function stageGroupPolicy(v, policy, {resetCapital=false}={}) {
  if(!draft||v.me.submitted||!v.me.financialGroup||!groupContextCurrent(groupContext(v)))return false;
  const next=JSON.parse(JSON.stringify(draft)),changedCapital=policy.bankDividend!==draft.groupPolicy.bankDividend||policy.bankSupport!==draft.groupPolicy.bankSupport;next.groupPolicy=policy;
  try{E.normalizeGroupPlan(v.me,next);E.normalizeAgencyPlan(v.me,next);if(v.companySharesVersion===1)E.normalizeCompanySharePlan(v,v.me,next);draft=next;if(resetCapital||changedCapital)groupResetForm('capital');renderReady(v);
    if(workspaceTab==='group')renderFinancialGroup(v);return true;}
  catch(error){toast(error.message);return false;}
}
function groupCreditControls(v) {
  if(!v.me.creditPortfolio)return '';
  const allocation=draft.groupPolicy.creditAllocation,disabled=v.me.submitted?' disabled':'',expanded=v.me.creditProductsVersion===1;
  return '<section class="credit-policy group-credit-policy"><h3>NEW LENDING PORTFOLIO</h3>'+
    '<p class="small">Allocate one shared origination budget across lending families. Percentages allocate production capacity; product productivity determines actual dollars originated. Funding, capital and collections still constrain the combined bank. Existing loans retain their terms.</p>'+
    '<div class="credit-controls'+(expanded?' credit-allocation-expanded':'')+'">'+Object.entries(allocation).map(([key,n])=>
      '<label for="creditAllocation-'+key+'">'+esc(v.productPortfolios.credit.options[key].name)+
      (expanded?'<span class="credit-allocation-value"><input type="number" min="0" max="100" step="25" id="creditAllocation-'+key+'" data-credit-allocation="'+key+'" value="'+n+'"'+disabled+'> %</span>':
      '<select id="creditAllocation-'+key+'" data-credit-allocation="'+key+'"'+disabled+'>'+
      E.CREDIT_ALLOCATION_STEPS.map(value=>'<option value="'+value+'"'+(value===n?' selected':'')+'>'+value+'%</option>').join('')+
      '</select>')+'</label>').join('')+'</div><p id="creditAllocationStatus" class="small" role="status">100% assigned. Changes persist after the month resolves.</p>'+
    '<button type="button" id="applyCreditAllocation" class="btn"'+disabled+'>Stage lending allocation</button>'+
    '<p class="micro">Zero stops new production, not servicing or collections. Staging changes only your draft.</p>'+
    (expanded?'<details><summary>Loan terms, existing exposure &amp; arrears</summary><p class="micro">Illustrative new-loan rates under today’s economy; existing vintages retain their coupons. A family above 40% of the book increases future distress. Property risk and collateral recoveries worsen in a credit downturn. Collateral is not spendable bank cash.</p><div class="table-scroll"><table><thead><tr><th>Family</th><th>Term</th><th>Annual rate</th><th>Recovery protection</th><th>Existing loans</th><th>Share</th><th>Arrears</th></tr></thead><tbody>'+E.creditProductReview(v.me,v).map(row=>'<tr><th>'+esc(row.name)+'</th><td>'+row.months+' months</td><td>'+(row.annualRateBp/100).toFixed(2)+'%</td><td>'+(row.collateralBp/100)+'% loss reduction before stress</td><td>'+money(row.principal)+'</td><td>'+(row.share*100).toFixed(1)+'%</td><td>'+money(row.arrears)+'</td></tr>').join('')+'</tbody></table></div></details>':'')+
    '<button type="button" id="compareGroupLending" class="btn"'+disabled+'>Compare lending mixes</button>'+
    '<div id="groupLendingComparison" aria-live="polite"></div></section>';
}
function bindGroupCreditControls(v) {
  if(!v.me.creditPortfolio)return;
  const inputs=$$('[data-credit-allocation]'),apply=$('#applyCreditAllocation'),token=groupContext(v);
  const read=()=>Object.fromEntries(inputs.map(input=>[input.dataset.creditAllocation,Number(input.value)]));
  const update=()=>{const total=Object.values(read()).reduce((n,x)=>n+x,0);
    $('#creditAllocationStatus').textContent=total+'% assigned'+(total===100?'. Ready to stage.':'. Adjust the other families to total 100%.');
    apply.disabled=!!v.me.submitted||total!==100||Object.values(read()).some(n=>!E.CREDIT_ALLOCATION_STEPS.includes(n));};
  inputs.forEach(input=>{input.addEventListener('change',update);input.addEventListener('input',update);});
  apply.addEventListener('click',()=>{if(!groupContextCurrent(token))return;const policy={...draft.groupPolicy,creditAllocation:read()};
    if(stageGroupPolicy(v,policy)){$('#creditAllocationStatus').textContent='Portfolio staged. Existing loans are unchanged.';renderProducts(v);}});
  $('#compareGroupLending').addEventListener('click',()=>{
    if(v.me.submitted||!groupContextCurrent(token,true,false))return;
    const signature=JSON.stringify(draft),quoteToken=groupContext(currentView());
    try {
      const quote=E.groupLendingComparison(v.me,draft,v.economy,v),box=$('#groupLendingComparison');
      const dollars=n=>'$'+Math.round(n).toLocaleString();
      box.innerHTML='<h4>ONE SHARED ORIGINATION BUDGET</h4><p class="small">First-month figures use your operating forecast, excluding the executive call and rival actions. The 24-month credit scenario holds today’s economy, staffing and collections policy fixed; it is not a full-bank profit promise.</p>'+
        '<div class="table-scroll" tabindex="0"><table class="regional-table"><thead><tr><th>Mortgage / Commercial / Consumer</th><th>New principal</th><th>Bank operating profit</th><th>Capital ratio</th><th>New-loan monthly contribution*</th><th>New-loan 24-month losses*</th><th>Draft</th></tr></thead><tbody>'+
        quote.rows.map((row,i)=>'<tr><th>'+Object.values(row.allocation).join('% / ')+'%</th><td>'+dollars(row.originations)+'</td><td>'+dollars(row.profit)+'</td><td>'+row.capitalRatio.toFixed(1)+'%</td><td>'+dollars(row.futureContribution)+'</td><td>'+dollars(row.projectedLoss)+'</td><td><button type="button" class="btn" data-group-mix="'+i+'">Use mix '+Object.values(row.allocation).join('/')+'</button></td></tr>').join('')+
        '</tbody></table></div><p class="micro">*Discounted average interest less credit losses and attributed case costs on this month’s new loans only, using the actual aging and amortization rules. Principal repayment is not profit. Existing bank overhead and funding costs remain in the operating forecast, not a second charge in this contribution. Future funding, rate changes, defaults and staffing needs can differ. Mortgage loans remain committed beyond this 24-month window.</p>';
      $$('[data-group-mix]').forEach(button=>button.addEventListener('click',()=>{
        const now=currentView();
        if(signature!==JSON.stringify(draft)||now.cycle!==v.cycle||now.me.id!==v.me.id||now.me.submitted||!groupContextCurrent(quoteToken)){
          toast('The plan or month changed. Compare the current lending mixes again.');return;
        }
        const row=quote.rows[Number(button.dataset.groupMix)];
        if(row&&stageGroupPolicy(now,{...draft.groupPolicy,creditAllocation:{...row.allocation}})){
          renderCollections(now);renderProducts(now);
        }
      }));
    }catch(error){toast(error.message);}
  });
}
function corporateCompanyPanel(v) {
  if(!v.me.corporate)return '';
  const world=v.me.companySnapshot.world,r=v.me.corporate.report;
  return '<section class="credit-policy" id="corporateCompanyStatements"><h3>CORPORATE CLIENTS · OPERATING COMPANIES</h3>'+
    '<p class="small">These companies pay for commercial services from their own finite cash. Winning a banking mandate does not buy ownership. '+(v.companyControlVersion===1?'Select a company below to trade shares or plan a reviewed controlling offer.':v.companySharesVersion===1?'Select a company below to trade minority shares. These saved rules do not enable takeovers.':'These saved rules do not enable company ownership.')+'</p>'+
    (world.circulation?'<div id="corporateCirculationSummary" class="notice"><strong>FUNDED LOCAL CIRCULATION</strong><p class="small">Outside customer cash: '+money(world.outside.accounts.cash)+
      '. Last month’s local spending by outside counterparties: '+money(world.circulation.lastExternal+world.circulation.lastCreditor)+
      '.</p><p class="micro">Third-party carriers, paid suppliers and outside creditors spend 2% of existing cash locally each month. The money funds future company sales through this finite pool; it does not create bank deposits, guarantee sales or rescue insolvent firms. Rival staffing and supplier books remain private.</p></div>':'')+
    '<div class="credit-summary"><div><span>Your unpaid company invoices</span><b>'+money(v.me.accounting.accounts.receivables)+'</b><small>Assets at risk, not spendable cash.</small></div>'+
    '<div><span>Last month: fees billed / paid</span><b>'+money(r?.billed||0)+' / '+money(r?.cash||0)+'</b><small>Unpaid billing increases receivables.</small></div>'+
    '<div><span>Old invoices collected / written off</span><b>'+money(r?.recovered||0)+' / '+money(r?.writtenOff||0)+'</b><small>Collection is cash, not new profit. Write-offs reduce bank earnings and capital.</small></div></div>'+
    companyWorkspaceContent(v)+'<details><summary>All company statements</summary><div class="table-scroll" tabindex="0" aria-label="Company financial statements"><table class="regional-table"><thead><tr><th>Company / banking provider</th><th>Cash</th><th>Debt / unpaid bills</th><th>Equity</th><th>Monthly profit</th><th>Your unpaid invoices</th></tr></thead><tbody>'+
    world.companies.map((c,i)=>{
      const profile=E.ANCHOR_CLIENTS[c.clientIndex],contract=v.serviceAgreements[i],provider=contract.owner===v.me.id?'Your bank':contract.owner===v.rival.id?v.rival.name:'Outside providers';
      return '<tr><th>'+esc(profile.name)+'<br><small class="muted">'+esc(profile.sector)+' · '+(c.resolution?'Closed after month '+c.resolution.month:esc(provider))+'</small></th>'+
        '<td>'+money(c.book.accounts.cash)+'</td><td>'+money(c.book.accounts.debt)+' / '+money(c.book.accounts.payables)+'</td><td>'+money(c.book.accounts.equity)+'</td><td>'+money(c.report?.profit||0)+'</td><td>'+money(c.bankArrears[v.me.corporate.index])+'</td></tr>';
    }).join('')+'</tbody></table></div></details><details><summary>Cash, credit risk and forecasts</summary>'+
    '<p class="small">Sales are funded by a finite corporate customer/supplier pool, separate from retail deposits. Sales respond to the economy; wages, suppliers, debt, bank invoices and dividends all use the same company books. Historical unpaid invoices stay with the original bank even if a rival wins the next mandate.</p>'+
    '<p class="small">Insolvent firms liquidate: actual proceeds pay secured claims first and share remaining cash among unpaid service providers. Unrecovered bank invoices are written off. Closed firms cannot renew contracts. Public statements show company balances and bank claims, not a rival bank’s private orders, staffing or journals.</p>'+
    '<p class="micro">Operating forecasts assume the rival delivers its current public signed contracts; concealed staffing and next-month orders are not known. Contracted service-desk contribution is before company credit risk. This six-company economy is provisional; these are not national markets or insurance underwriting.</p></details></section>';
}
function renderFinancialGroup(v) {
  $('#financialGroupNav').classList.toggle('hidden',!v.me.financialGroup);
  if(!v.me.financialGroup){$('#financialGroupPanel').innerHTML='';if(workspaceTab==='group')setWorkspaceTab('overview');return;}
  if(workspaceTab!=='group')return;
  groupSelection(v);groupWorkspace.revision++;
  const p=v.me,book=p.financialGroup.parent,quote=E.groupCapitalQuote(p),summary=p.groupSummary,report=p.financialGroup.report;
  const disabled=groupContextCurrent(groupContext(v))?'':' disabled',capitalForm=groupWorkspace.forms.capital;
  const capitalContent='<div class="section-head"><div><h2 id="groupCapitalHeading" tabindex="-1">GROUP CAPITAL</h2>'+
    '<p class="small muted">Separate bank and parent accounts. Internal transfers change where capital is held—not how much the group owns.</p></div></div>'+
    '<div class="credit-summary"><div><span>Parent operating cash</span><b>'+money(book.accounts.cash)+'</b><small>Not bank deposits or customer investments.</small></div>'+
    '<div><span>'+(v.companyConsolidationVersion===1?'Your group’s equity':'Consolidated equity')+'</span><b>'+money(summary.ownerEquity??summary.equity)+'</b><small>'+(v.companyConsolidationVersion===1?'Excludes outside shareholders. Acquisition goodwill is not cash.':'Parent investment eliminated once.')+'</small></div>'+
    '<div><span>Bank capital ratio</span><b>'+E.capitalRatio(p).toFixed(1)+'%</b><small>Parent cash does not satisfy bank capital until transferred.</small></div></div>'+
    '<section class="credit-policy"><h3>CAPITAL INSTRUCTIONS</h3><p class="small">These are explicit one-month orders, not automatic recurring dividends. Bank obligations settle first. The final eligible amount is rechecked and may be reduced; new income is not spendable in advance.</p>'+
    '<div class="credit-controls"><label for="groupBankDividend">Bank → parent: profit distribution ($)<input id="groupBankDividend" type="number" min="0" step="1" max="'+quote.dividendLimit+'" value="'+esc(capitalForm.bankDividend)+'"'+disabled+'></label>'+
    '<label for="groupBankSupport">Parent → bank: capital investment ($)<input id="groupBankSupport" type="number" min="0" step="1" max="'+quote.supportLimit+'" value="'+esc(capitalForm.bankSupport)+'"'+disabled+'></label></div>'+
    '<p class="small">Current dividend ceiling: '+money(quote.dividendLimit)+'; parent investment ceiling: '+money(quote.supportLimit)+'. Choose one direction per month.</p>'+
    '<div class="workbench-actions"><button type="button" id="previewGroupCapital" class="btn"'+disabled+'>Preview transfer</button><button type="button" id="stageGroupCapital" class="btn primary"'+disabled+'>Stage capital instruction</button><button type="button" id="discardGroupCapital" class="btn">Discard unstaged edits</button></div>'+
    '<p id="groupCapitalStatus" role="status" class="small">'+(groupWorkspace.dirty.capital?'Unstaged edits restored. Preview checks current limits.':'Controls show the staged plan. Editing does not move money.')+'</p><p class="micro">Dividend safeguards: retained earnings, '+(E.GROUP_SAFEGUARDS.capitalRatio*100)+'% bank capital and '+(E.GROUP_SAFEGUARDS.depositCash*100)+'% deposit cash; no emergency debt or recovery restriction. Parent injections occur at month end and do not finance earlier bank spending in the same plan.</p></section>'+
    (report?'<p class="small">Last settled month '+report.cycle+': bank dividend '+money(report.dividend)+' of '+money(report.requestedDividend)+' requested; bank support '+money(report.support)+' of '+money(report.requestedSupport)+' requested.</p>':'')+
    '<details><summary>Reconciled balance sheets</summary>'+(p.agency?'<p class="micro">These totals include the operating insurance agency’s separate accounts, including any balances retained while it is closed. Internal parent investments are eliminated once; agency cash is not bank deposit funding.</p>':'')+'<div class="table-scroll" tabindex="0"><table class="regional-table"><thead><tr><th>Measure</th><th>Parent</th><th>Consolidated group</th></tr></thead><tbody>'+
    '<tr><th>Assets</th><td>'+money(E.GroupAccounting.validate(book).assets)+'</td><td>'+money(summary.assets)+'</td></tr>'+
    '<tr><th>Liabilities</th><td>'+money(E.GroupAccounting.validate(book).liabilities)+'</td><td>'+money(summary.liabilities)+'</td></tr>'+
    '<tr><th>Equity</th><td>'+money(book.accounts.equity)+'</td><td>'+money(summary.equity)+'</td></tr>'+
    '<tr><th>Investment eliminated</th><td>'+money(book.accounts.investments)+'</td><td>'+money(summary.eliminatedInvestment)+'</td></tr></tbody></table></div>'+
    '<p class="micro">Opening parent ownership creates no extra cash. Bank dividends are not group operating income. '+(p.agency?'Operating subsidiaries are included with their parent investment eliminated. The insurance agency uses outside carriers; it does not underwrite insurance.':'These saved rules include the bank and parent only.')+(p.companyShares?' Minority company shares remain at their recorded purchase basis, not a spendable market-value gain.':'')+'</p>'+companyConsolidationDisclosure(v)+'</details>';
  const navigation=p.agency?financialGroupDeskNavigation(v):'';
  $('#financialGroupPanel').innerHTML=p.agency?navigation+financialGroupDeskPanel('capital',capitalContent)+
    financialGroupDeskPanel('agency',agencyPanel(v))+financialGroupDeskPanel('companies',corporateCompanyPanel(v))+(p.investmentBusiness?financialGroupDeskPanel('investments',investmentPanel(v)):''):
    capitalContent+corporateCompanyPanel(v);
  const groupToken=groupContext(v);
  $('#stageGroupCapital').addEventListener('click',()=>{
    if(!groupContextCurrent(groupToken)){
      toast('The institution, month or plan changed. Reopen the capital desk before staging.');return;
    }
    try{const now=currentView(),{candidate}=groupFormProposal(now,'capital',groupCapitalFormRead());
    if(stageGroupPolicy(now,candidate.groupPolicy,{resetCapital:true}))$('#groupCapitalStatus').textContent='Capital instruction staged; final safeguards will be rechecked at settlement.';}
    catch(error){$('#groupCapitalStatus').textContent=error.message;toast(error.message);}
  });
  bindGroupWorkingForms(v);
  if(v.me.agency){
    bindFinancialGroupDesks();
    bindAgencyControls(v);
    if(p.investmentBusiness)bindInvestmentWorkspace(v);
  }
}
function companyConsolidationDisclosure(v){
 if(v.companyConsolidationVersion!==1)return '';
 const s=v.me.groupSummary;
 return '<section aria-label="Controlled company reconciliation"><h3>What belongs to your group?</h3><p class="small">A controlled company’s whole balance sheet is included, but outside shareholders still own their portion. Only your share of post-acquisition earnings belongs to your group. Paid dividends are not counted a second time.</p>'+
  '<dl class="decision-facts"><div><dt>Total equity including outside shareholders</dt><dd>'+money(s.equity)+'</dd></div><div><dt>Outside shareholders’ equity</dt><dd>'+money(s.noncontrollingEquity)+'</dd></div><div><dt>Your group’s equity</dt><dd>'+money(s.ownerEquity)+'</dd></div><div><dt>Acquisition goodwill</dt><dd>'+money(s.companyGoodwill)+'</dd></div><div><dt>Company investment basis eliminated</dt><dd>'+money(s.controlledBasisEliminated)+'</dd></div><div><dt>Internal deposits and unpaid service claims eliminated</dt><dd>'+money(s.internalBalancesEliminated)+'</dd></div></dl>'+
  (s.controlledCompanies.length?'<div class="table-scroll" tabindex="0"><table class="regional-table"><caption>Controlled operating companies</caption><thead><tr><th>Company</th><th>Your ownership</th><th>Company net assets</th><th>Outside equity</th><th>Goodwill</th></tr></thead><tbody>'+s.controlledCompanies.map(c=>{const company=v.me.companySnapshot.world.companies.find(x=>x.id===c.issuer);return '<tr><th>'+esc(E.ANCHOR_CLIENTS[company?.clientIndex]?.name||c.issuer)+'</th><td>'+(c.shares/1000).toFixed(3)+'%</td><td>'+money(c.netAssets)+'</td><td>'+money(c.outsideEquity)+'</td><td>'+money(c.goodwill)+'</td></tr>';}).join('')+'</tbody></table></div>':'<p class="small">No controlled companies. Minority holdings remain in parent assets at cost.</p>')+
  '<p class="micro">This is a fictional book-value consolidation worksheet, not a cash transfer or a full legal accounting standard. It does not increase bank regulatory capital, borrowing capacity or spendable parent cash. Customer custody is never operating money. Goodwill is reduced when shares are sold and removed when control is lost or the company closes.</p></section>';
}
