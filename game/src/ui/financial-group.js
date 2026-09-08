function stageGroupPolicy(v, policy) {
  if(!draft||v.me.submitted||!v.me.financialGroup)return false;
  const next=JSON.parse(JSON.stringify(draft));next.groupPolicy=policy;
  try{E.normalizeGroupPlan(v.me,next);draft=next;renderReady(v);return true;}
  catch(error){toast(error.message);return false;}
}
function groupCreditControls(v) {
  if(!v.me.creditPortfolio)return '';
  const allocation=draft.groupPolicy.creditAllocation,disabled=v.me.submitted?' disabled':'';
  return '<section class="credit-policy group-credit-policy"><h3>NEW LENDING PORTFOLIO</h3>'+
    '<p class="small">Allocate one shared origination budget across lending families. Percentages allocate production capacity; product productivity determines actual dollars originated. Funding, capital and collections still constrain the combined bank. Existing loans retain their terms.</p>'+
    '<div class="credit-controls">'+Object.entries(allocation).map(([key,n])=>
      '<label for="creditAllocation-'+key+'">'+esc(v.productPortfolios.credit.options[key].name)+
      '<select id="creditAllocation-'+key+'" data-credit-allocation="'+key+'"'+disabled+'>'+
      E.CREDIT_ALLOCATION_STEPS.map(value=>'<option value="'+value+'"'+(value===n?' selected':'')+'>'+value+'%</option>').join('')+
      '</select></label>').join('')+'</div><p id="creditAllocationStatus" class="small" role="status">100% assigned. Changes persist after the month resolves.</p>'+
    '<button type="button" id="applyCreditAllocation" class="btn"'+disabled+'>Stage lending allocation</button>'+
    '<p class="micro">Zero stops new production, not servicing or collections. Staging changes only your draft. Pricing, fees and additional lending families will be expanded in subsequent group batches.</p>'+
    '<button type="button" id="compareGroupLending" class="btn"'+disabled+'>Compare lending mixes</button>'+
    '<div id="groupLendingComparison" aria-live="polite"></div></section>';
}
function bindGroupCreditControls(v) {
  if(!v.me.creditPortfolio)return;
  const inputs=$$('[data-credit-allocation]'),apply=$('#applyCreditAllocation');
  const read=()=>Object.fromEntries(inputs.map(input=>[input.dataset.creditAllocation,Number(input.value)]));
  const update=()=>{const total=Object.values(read()).reduce((n,x)=>n+x,0);
    $('#creditAllocationStatus').textContent=total+'% assigned'+(total===100?'. Ready to stage.':'. Adjust the other families to total 100%.');
    apply.disabled=!!v.me.submitted||total!==100;};
  inputs.forEach(input=>input.addEventListener('change',update));
  apply.addEventListener('click',()=>{const policy={...draft.groupPolicy,creditAllocation:read()};
    if(stageGroupPolicy(v,policy)){$('#creditAllocationStatus').textContent='Portfolio staged. Existing loans are unchanged.';renderProducts(v);}});
  $('#compareGroupLending').addEventListener('click',()=>{
    if(v.me.submitted)return;
    const signature=JSON.stringify(draft);
    try {
      const quote=E.groupLendingComparison(v.me,draft,v.economy),box=$('#groupLendingComparison');
      const dollars=n=>'$'+Math.round(n).toLocaleString();
      box.innerHTML='<h4>ONE SHARED ORIGINATION BUDGET</h4><p class="small">First-month figures use your operating forecast, excluding the executive call and rival actions. The 24-month credit scenario holds today’s economy, staffing and collections policy fixed; it is not a full-bank profit promise.</p>'+
        '<div class="table-scroll" tabindex="0"><table class="regional-table"><thead><tr><th>Mortgage / Commercial / Consumer</th><th>New principal</th><th>Bank operating profit</th><th>Capital ratio</th><th>New-loan monthly contribution*</th><th>New-loan 24-month losses*</th><th>Draft</th></tr></thead><tbody>'+
        quote.rows.map((row,i)=>'<tr><th>'+Object.values(row.allocation).join('% / ')+'%</th><td>'+dollars(row.originations)+'</td><td>'+dollars(row.profit)+'</td><td>'+row.capitalRatio.toFixed(1)+'%</td><td>'+dollars(row.futureContribution)+'</td><td>'+dollars(row.projectedLoss)+'</td><td><button type="button" class="btn" data-group-mix="'+i+'">Use mix '+Object.values(row.allocation).join('/')+'</button></td></tr>').join('')+
        '</tbody></table></div><p class="micro">*Discounted average interest less credit losses and attributed case costs on this month’s new loans only, using the actual aging and amortization rules. Principal repayment is not profit. Existing bank overhead and funding costs remain in the operating forecast, not a second charge in this contribution. Future funding, rate changes, defaults and staffing needs can differ. Mortgage loans remain committed beyond this 24-month window.</p>';
      $$('[data-group-mix]').forEach(button=>button.addEventListener('click',()=>{
        const now=currentView();
        if(signature!==JSON.stringify(draft)||now.cycle!==v.cycle||now.me.id!==v.me.id||now.me.submitted){
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
    '<p class="small">These companies pay for commercial services from their own finite cash. Winning a banking mandate does not buy ownership. Company shares and takeovers are not available yet.</p>'+
    '<div class="credit-summary"><div><span>Your unpaid company invoices</span><b>'+money(v.me.accounting.accounts.receivables)+'</b><small>Assets at risk, not spendable cash.</small></div>'+
    '<div><span>Last month: fees billed / paid</span><b>'+money(r?.billed||0)+' / '+money(r?.cash||0)+'</b><small>Unpaid billing increases receivables.</small></div>'+
    '<div><span>Old invoices collected / written off</span><b>'+money(r?.recovered||0)+' / '+money(r?.writtenOff||0)+'</b><small>Collection is cash, not new profit. Write-offs reduce bank earnings and capital.</small></div></div>'+
    '<div class="table-scroll" tabindex="0" aria-label="Company financial statements"><table class="regional-table"><thead><tr><th>Company / banking provider</th><th>Cash</th><th>Debt / unpaid bills</th><th>Equity</th><th>Monthly profit</th><th>Your unpaid invoices</th></tr></thead><tbody>'+
    world.companies.map((c,i)=>{
      const profile=E.ANCHOR_CLIENTS[c.clientIndex],contract=v.serviceAgreements[i],provider=contract.owner===v.me.id?'Your bank':contract.owner===v.rival.id?v.rival.name:'Outside providers';
      return '<tr><th>'+esc(profile.name)+'<br><small class="muted">'+esc(profile.sector)+' · '+(c.resolution?'Closed after month '+c.resolution.month:esc(provider))+'</small></th>'+
        '<td>'+money(c.book.accounts.cash)+'</td><td>'+money(c.book.accounts.debt)+' / '+money(c.book.accounts.payables)+'</td><td>'+money(c.book.accounts.equity)+'</td><td>'+money(c.report?.profit||0)+'</td><td>'+money(c.bankArrears[v.me.corporate.index])+'</td></tr>';
    }).join('')+'</tbody></table></div><details><summary>Cash, credit risk and forecasts</summary>'+
    '<p class="small">Sales are funded by a finite corporate customer/supplier pool, separate from retail deposits. Sales respond to the economy; wages, suppliers, debt, bank invoices and dividends all use the same company books. Historical unpaid invoices stay with the original bank even if a rival wins the next mandate.</p>'+
    '<p class="small">Insolvent firms liquidate: actual proceeds pay secured claims first and share remaining cash among unpaid service providers. Unrecovered bank invoices are written off. Closed firms cannot renew contracts. Public statements show company balances and bank claims, not a rival bank’s private orders, staffing or journals.</p>'+
    '<p class="micro">Operating forecasts assume the rival delivers its current public signed contracts; concealed staffing and next-month orders are not known. Contracted service-desk contribution is before company credit risk. This six-company economy is provisional; these are not national markets or insurance underwriting.</p></details></section>';
}
function renderFinancialGroup(v) {
  $('#financialGroupNav').classList.toggle('hidden',!v.me.financialGroup);
  if(!v.me.financialGroup){$('#financialGroupPanel').innerHTML='';if(workspaceTab==='group')setWorkspaceTab('overview');return;}
  if(workspaceTab!=='group')return;
  const p=v.me,book=p.financialGroup.parent,quote=E.groupCapitalQuote(p),summary=p.groupSummary,report=p.financialGroup.report;
  const disabled=p.submitted?' disabled':'';
  $('#financialGroupPanel').innerHTML='<div class="section-head"><div><h2>GROUP CAPITAL</h2>'+
    '<p class="small muted">One institution, separate bank and parent accounts. Internal transfers change where capital is held—not how much the group owns.</p></div></div>'+
    '<div class="credit-summary"><div><span>Parent operating cash</span><b>'+money(book.accounts.cash)+'</b><small>Not bank deposits or customer investments.</small></div>'+
    '<div><span>Consolidated equity</span><b>'+money(summary.equity)+'</b><small>Parent investment eliminated once.</small></div>'+
    '<div><span>Bank capital ratio</span><b>'+E.capitalRatio(p).toFixed(1)+'%</b><small>Parent cash does not satisfy bank capital until transferred.</small></div></div>'+
    '<section class="credit-policy"><h3>CAPITAL INSTRUCTIONS</h3><p class="small">These are explicit one-month orders, not automatic recurring dividends. Bank obligations settle first. The final eligible amount is rechecked and may be reduced; new income is not spendable in advance.</p>'+
    '<div class="credit-controls"><label for="groupBankDividend">Bank profit to parent ($)<input id="groupBankDividend" type="number" min="0" step="1" max="'+quote.dividendLimit+'" value="'+draft.groupPolicy.bankDividend+'"'+disabled+'></label>'+
    '<label for="groupBankSupport">Parent investment into bank ($)<input id="groupBankSupport" type="number" min="0" step="1" max="'+quote.supportLimit+'" value="'+draft.groupPolicy.bankSupport+'"'+disabled+'></label></div>'+
    '<p class="small">Current dividend ceiling: '+money(quote.dividendLimit)+'; parent investment ceiling: '+money(quote.supportLimit)+'. Choose one direction per month.</p>'+
    '<button type="button" id="stageGroupCapital" class="btn"'+disabled+'>Stage capital instruction</button>'+
    '<p id="groupCapitalStatus" role="status" class="small"></p><p class="micro">Dividend safeguards: retained earnings, '+(E.GROUP_SAFEGUARDS.capitalRatio*100)+'% bank capital and '+(E.GROUP_SAFEGUARDS.depositCash*100)+'% deposit cash; no emergency debt or recovery restriction. Parent injections occur at month end and do not finance earlier bank spending in the same plan.</p></section>'+
    (report?'<p class="small">Last settled month '+report.cycle+': bank dividend '+money(report.dividend)+' of '+money(report.requestedDividend)+' requested; bank support '+money(report.support)+' of '+money(report.requestedSupport)+' requested.</p>':'')+
    '<details><summary>Reconciled balance sheets</summary><div class="table-scroll" tabindex="0"><table class="regional-table"><thead><tr><th>Measure</th><th>Parent</th><th>Consolidated group</th></tr></thead><tbody>'+
    '<tr><th>Assets</th><td>'+money(E.GroupAccounting.validate(book).assets)+'</td><td>'+money(summary.assets)+'</td></tr>'+
    '<tr><th>Liabilities</th><td>'+money(E.GroupAccounting.validate(book).liabilities)+'</td><td>'+money(summary.liabilities)+'</td></tr>'+
    '<tr><th>Equity</th><td>'+money(book.accounts.equity)+'</td><td>'+money(summary.equity)+'</td></tr>'+
    '<tr><th>Investment eliminated</th><td>'+money(book.accounts.investments)+'</td><td>'+money(summary.eliminatedInvestment)+'</td></tr></tbody></table></div>'+
    '<p class="micro">Opening parent ownership creates no extra cash. Bank dividends are not group operating income. These totals do not yet represent completed insurance, brokerage, wealth or company-share systems; those remain in development.</p></details>'+corporateCompanyPanel(v);
  $('#stageGroupCapital').addEventListener('click',()=>{
    const policy={...draft.groupPolicy,bankDividend:Number($('#groupBankDividend').value),bankSupport:Number($('#groupBankSupport').value)};
    if(stageGroupPolicy(v,policy))$('#groupCapitalStatus').textContent='Capital instruction staged; final safeguards will be rechecked at settlement.';
  });
}
