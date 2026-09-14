// Agency controls stage one sealed instruction. They never move subsidiary cash.
function agencyDollars(n){const amount=Math.round(Number(n)||0);return (amount<0?'−':'')+'$'+Math.abs(amount).toLocaleString();}
function agencyDraftCurrent(v,signature,campaign,token=groupContext(v)){
  const now=currentView();
  return !!(now&&now.me.agency&&draft&&(game||view)===campaign&&now.cycle===v.cycle&&now.me.id===v.me.id&&
    draftOwner===now.me.id&&lastCycle===now.cycle&&!now.me.submitted&&signature===JSON.stringify(draft)&&groupContextCurrent(token));
}
function stageAgencyPolicy(v,policy,signature=JSON.stringify(draft),campaign=game||view){
  if(!agencyDraftCurrent(v,signature,campaign)){toast('The institution, month or plan changed. Reopen the agency desk before staging.');return false;}
  const now=currentView(),next=JSON.parse(JSON.stringify(draft));next.agencyPolicy=JSON.parse(JSON.stringify(policy));
  try{E.normalizeGroupPlan(now.me,next);E.normalizeAgencyPlan(now.me,next);if(now.companySharesVersion===1)E.normalizeCompanySharePlan(now,now.me,next);draft=next;groupResetForm('agency');renderReady(now);renderFinancialGroup(now);
    const status=$('#agencyInstructionStatus');if(status)status.textContent='Agency instruction staged. Cash and staffing change only when the month resolves.';return true;}
  catch(error){toast(error.message);return false;}
}
function agencyQuoteMarkup(quote){
  return '<div class="credit-summary"><div><span>'+(quote.status==='active'?'Proposed recurring operating expense':'If launched: recurring operating expense')+'</span><b>'+agencyDollars(quote.monthlyExpense)+'/month</b><small>'+(quote.status==='active'?'Paid by the agency, not a second bank expense.':'Not charged while closed. Setup and recruitment are additional launch costs.')+'</small></div>'+
    '<div><span>Service load / proposed capacity</span><b>'+integer(quote.serviceLoad)+' / '+integer(quote.capacity)+' units</b><small>Each cover uses capacity; employee benefits require more service.</small></div>'+
    '<div><span>Current-book commission estimate</span><b>'+agencyDollars(quote.estimatedCommission)+'/month</b><small>Not guaranteed revenue or profit; excludes speculative new wins.</small></div></div>'+
    '<p class="small">Parent cash now: '+agencyDollars(quote.availableParentCash)+'. Agency capital commitment: '+agencyDollars(quote.committedCapital)+'. Recruitment expense: '+agencyDollars(quote.recruitmentCost)+'. Required distribution reserve: '+agencyDollars(quote.reserveRequired)+'. Current distribution ceiling: '+agencyDollars(quote.distributionLimit)+'.</p>'+
    '<p class="micro">Preview uses current company books and your proposed instruction. Rival offers, customer cash, renewals and future settlement can change the result. Expected bank dividends cannot finance this month’s agency orders in advance.</p>'+agencyProfessionalQuoteMarkup(quote);
}
function agencyPanel(v){
  const p=v.me,a=p.agency;if(!a)return '';
  groupSelection(v);
  const quote=E.agencyQuote(p,draft.agencyPolicy),disabled=(!groupContextCurrent(groupContext(v)))?' disabled':'';
  const status=a.status==='active'?'OPEN':a.status==='failed'?'CLOSED · CAPITAL EXHAUSTED':'NOT LAUNCHED';
  return '<section class="credit-policy group-agency-workspace" id="agencyDesk"><h3 id="agencyWorkspaceTitle" tabindex="-1">INSURANCE AGENCY · '+status+'</h3>'+
    '<p class="small">Third-party insurance sales: earn commissions, not underwriting profit. Agency cash and employees are separate from the bank.</p>'+
    '<div class="group-business-strip" aria-label="Agency position now"><div><span>Agency cash · now</span><b>'+agencyDollars(a.book.accounts.cash)+'</b></div>'+
    '<div><span>Dedicated staff · now</span><b>'+integer(a.staff)+'</b></div>'+
    '<div><span>Current covers · not companies</span><b>'+integer(quote.relationships)+'</b></div></div>'+
    (a.status==='failed'?'<p class="notice">The agency closed after month '+integer(a.failedCycle)+'. Existing policies returned to outside providers. Relaunch requires fresh funded capital and setup costs; the prior loss remains part of group history. Failed ventures: '+integer(a.failures)+'.</p>':'')+
    agencySectionNavigation()+agencyWorkingContent(v,quote,disabled)+
    '<details><summary>Costs, downside and reserve safeguards</summary><p class="small">Arrange covers for the six corporate clients, separate from banking mandates. The agency earns commissions from paid premiums; it does not insure claims. Agency cash is separate from parent cash and bank deposits. Dedicated agency employees do not add to bank staff allocation.</p><p class="small">There is no guaranteed demand. Understaffing, weak outreach or unprofitable premiums can leave a costly agency with little business. Renewal service competes for limited capacity. Customers can move one cover without moving their bank relationship.</p>'+
    '<p class="small">Distributions are limited to earned profit and cash above the three-month operating-expense reserve. Staffing and outreach change that reserve. If operations exhaust funding, the subsidiary can fail and its investment can be lost; bank deposit balances are not an automatic bailout.</p></details></section>';
}
function agencyResultsMarkup(v){
  const p=v.me,a=p.agency,r=a.report,products=Object.entries(E.AGENCY_PRODUCTS);
  const settled=r?'<h4>LAST SETTLED MONTH · '+integer(r.cycle)+'</h4><div class="credit-summary">'+
    '<div><span>Commission / operating profit</span><b>'+agencyDollars(r.commission)+' / '+agencyDollars(r.commission-r.expense)+'</b><small>Profit deducts all invoiced expenses, including setup and recruitment.</small></div>'+
    '<div><span>Expenses invoiced / cash paid</span><b>'+agencyDollars(r.expense)+' / '+agencyDollars(r.paid)+'</b><small>Premiums passed to carriers are not agency revenue.</small></div>'+
    '<div><span>Covers won / lost</span><b>'+integer(r.won)+' / '+integer(r.lost)+'</b><small>'+integer(r.clients)+' covers serviced; '+agencyDollars(r.premiums)+' premiums funded by companies.</small></div></div>'+
    '<p class="small">Parent investment '+agencyDollars(r.capital)+'; automatic capped support '+agencyDollars(r.support)+'; agency distribution '+agencyDollars(r.dividend)+'. These transfers are not operating profit.</p>':
    '<p class="notice">No settled agency result yet. Staging an instruction does not open the business or earn commissions.</p>';
  const roster=p.companySnapshot.world.companies.map(c=>{
    const profile=E.ANCHOR_CLIENTS[c.clientIndex];
    return '<tr><th>'+esc(profile.name)+(c.resolution?'<br><small>Company closed</small>':'')+'</th>'+products.map(([key,product])=>{
      const relationship=p.agencySnapshot.relationships.find(r=>r.companyId===c.id&&r.product===key),owner=relationship.owner===p.id?'Your agency':relationship.owner===v.rival.id?v.rival.name+' agency':'Outside providers';
      const premium=Math.round(c.baseFee*product.premiumRate),commission=Math.floor(premium*product.commissionRate);
      return '<td>'+esc(owner)+'<br><small>'+(c.resolution?'Company closed · unavailable':relationship.owner===null?'Available to contest':integer(relationship.remaining)+' month'+(relationship.remaining===1?'':'s')+' to renewal')+
        '</small><br><small>'+agencyDollars(premium)+' premium · '+agencyDollars(commission)+' commission/month · '+integer(product.load)+' service units</small></td>';
    }).join('')+'</tr>';
  }).join('');
  return settled+(a.version===2?agencyProfessionalResults(v):'')+'<details><summary>Corporate cover roster · 18 independent relationships</summary><p class="small">Policies are contestable at renewal; service shortfalls or unpaid premiums can end them earlier. Focus applies to new acquisitions, not existing service. Local facilities, delivered service, digital capability and agency effort affect competition.</p>'+
    '<div class="table-scroll" tabindex="0" aria-label="Independent company insurance relationships"><table class="regional-table"><thead><tr><th>Company</th>'+products.map(([,product])=>'<th>'+esc(product.name)+'</th>').join('')+'</tr></thead><tbody>'+roster+'</tbody></table></div>'+
    '<p class="micro">Quoted premiums and commissions are monthly schedules, not promised receipts. Closed companies cannot buy cover. Banking mandates and company ownership are separate from this roster. Rival subsidiary staffing, cash and sealed orders are private.</p></details>';
}
function bindAgencyControls(v){
  if(!v.me.agency||groupWorkspace.agencySection==='results')return;
  const signature=JSON.stringify(draft),campaign=game||view,token=groupContext(v);
  const guard=()=>{if(agencyDraftCurrent(v,signature,campaign,token))return true;
    toast('The institution, month, plan or connection changed. Reopen the agency desk before staging.');return false;};
  if(groupWorkspace.agencySection==='funding')for(const key of ['capital','supportCap','dividend',...(v.me.agency.status!=='active'?['launch']:[])]){
    const changed=()=>{if(guard()){groupAgencyFormRead(v);groupFormChanged('agency');}};
    $('#agency-'+key)?.addEventListener('input',changed);
    $('#agency-'+key)?.addEventListener('change',changed);
  }
  $('#previewAgency')?.addEventListener('click',()=>{
    if(!guard())return;
    try{const now=currentView(),{quote}=groupFormProposal(now,'agency',groupAgencyFormRead(now));
      $('#agencyInstructionQuote').innerHTML=agencyQuoteMarkup(quote);
      $('#agencyInstructionStatus').textContent='Preview only. Your monthly plan is unchanged until you stage this instruction.';
    }catch(error){$('#agencyInstructionStatus').textContent=error.message;toast(error.message);}
  });
  $('#stageAgency')?.addEventListener('click',()=>{
    if(!guard())return;
    try{const now=currentView(),{candidate}=groupFormProposal(now,'agency',groupAgencyFormRead(now));stageAgencyPolicy(now,candidate.agencyPolicy,signature,campaign);}
    catch(error){$('#agencyInstructionStatus').textContent=error.message;toast(error.message);}
  });
}
