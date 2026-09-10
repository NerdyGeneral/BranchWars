// Agency controls stage one sealed instruction. They never move subsidiary cash.
function agencyDollars(n){const amount=Math.round(Number(n)||0);return (amount<0?'−':'')+'$'+Math.abs(amount).toLocaleString();}
function agencyDraftCurrent(v,signature,campaign){
  const now=currentView();
  return !!(now&&now.me.agency&&draft&&(game||view)===campaign&&now.cycle===v.cycle&&now.me.id===v.me.id&&
    draftOwner===now.me.id&&lastCycle===now.cycle&&!now.me.submitted&&signature===JSON.stringify(draft));
}
function stageAgencyPolicy(v,policy,signature=JSON.stringify(draft),campaign=game||view){
  if(!agencyDraftCurrent(v,signature,campaign)){toast('The institution, month or plan changed. Reopen the agency desk before staging.');return false;}
  const now=currentView(),next=JSON.parse(JSON.stringify(draft));next.agencyPolicy=JSON.parse(JSON.stringify(policy));
  try{E.normalizeGroupPlan(now.me,next);E.normalizeAgencyPlan(now.me,next);draft=next;renderReady(now);renderFinancialGroup(now);
    $('#agencyInstructionStatus').textContent='Agency instruction staged. Cash and staffing change only when the month resolves.';return true;}
  catch(error){toast(error.message);return false;}
}
function agencyQuoteMarkup(quote){
  return '<div class="credit-summary"><div><span>'+(quote.status==='active'?'Proposed recurring operating expense':'If launched: recurring operating expense')+'</span><b>'+agencyDollars(quote.monthlyExpense)+'/month</b><small>'+(quote.status==='active'?'Paid by the agency, not a second bank expense.':'Not charged while closed. Setup and recruitment are additional launch costs.')+'</small></div>'+
    '<div><span>Service load / proposed capacity</span><b>'+integer(quote.serviceLoad)+' / '+integer(quote.capacity)+' units</b><small>Each cover uses capacity; employee benefits require more service.</small></div>'+
    '<div><span>Current-book commission estimate</span><b>'+agencyDollars(quote.estimatedCommission)+'/month</b><small>Not guaranteed revenue or profit; excludes speculative new wins.</small></div></div>'+
    '<p class="small">Parent cash now: '+agencyDollars(quote.availableParentCash)+'. Agency capital commitment: '+agencyDollars(quote.committedCapital)+'. Recruitment expense: '+agencyDollars(quote.recruitmentCost)+'. Required distribution reserve: '+agencyDollars(quote.reserveRequired)+'. Current distribution ceiling: '+agencyDollars(quote.distributionLimit)+'.</p>'+
    '<p class="micro">Preview uses current company books and your proposed instruction. Rival offers, customer cash, renewals and future settlement can change the result. Expected bank dividends cannot finance this month’s agency orders in advance.</p>';
}
function agencyPanel(v){
  const p=v.me,a=p.agency;if(!a)return '';
  const policy=draft?.agencyPolicy||E.defaultAgencyPlan(p),quote=E.agencyQuote(p,policy),disabled=p.submitted?' disabled':'';
  const number=(key,label,value,max)=>'<label for="agency-'+key+'">'+label+'<input id="agency-'+key+'" type="number" min="0" step="1"'+(max===undefined?'':' max="'+max+'"')+' value="'+value+'"'+disabled+'></label>';
  const status=a.status==='active'?'OPEN':a.status==='failed'?'CLOSED · CAPITAL EXHAUSTED':'NOT LAUNCHED';
  const select=(key,label,options)=>'<label for="agency-'+key+'">'+label+'<select id="agency-'+key+'"'+disabled+'>'+options.map(([value,text])=>'<option value="'+value+'"'+(String(policy[key])===String(value)?' selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';
  return '<section class="credit-policy" id="agencyDesk"><h3>INSURANCE AGENCY · '+status+'</h3>'+
    '<p class="small">A separately funded operating subsidiary. Arrange third-party cover for the six corporate clients; earn commissions from paid premiums. Insurance relationships are separate from banking mandates. Your agency does not insure claims.</p>'+
    '<div class="credit-summary"><div><span>Agency cash</span><b>'+agencyDollars(a.book.accounts.cash)+'</b><small>Separate from parent cash and bank deposits.</small></div>'+
    '<div><span>Current agency staff</span><b>'+integer(a.staff)+'</b><small>Dedicated agency employees, not bank staff allocation.</small></div>'+
    '<div><span>Current relationships</span><b>'+integer(quote.relationships)+'</b><small>Up to three independent covers per company.</small></div></div>'+
    (a.status==='failed'?'<p class="notice">The agency closed after month '+integer(a.failedCycle)+'. Existing policies returned to outside providers. Relaunch requires fresh funded capital and setup costs; the prior loss remains part of group history. Failed ventures: '+integer(a.failures)+'.</p>':'')+
    '<details'+(a.status!=='active'?' open':'')+'><summary>Agency instruction · capital, staffing and sales</summary>'+
    (a.status!=='active'?'<label class="agency-launch-label" for="agency-launch"><input type="checkbox" id="agency-launch"'+(policy.launch?' checked':'')+disabled+'> '+(a.status==='failed'?'Relaunch':'Launch')+' agency this month</label><p class="small">Launch requires at least '+agencyDollars(quote.launchMinimum)+' of existing parent cash, including a '+agencyDollars(quote.setupCost)+' setup expense. Fund the parent from eligible bank profits in an earlier month. Proposed operating expenses below are not charged while the agency remains unopened.</p>':'')+
    '<div class="credit-controls">'+number('capital',a.status!=='active'?'Initial agency capital ($)':'Additional parent investment ($)',policy.capital,quote.availableParentCash)+
    select('staff','Agency staff after settlement',[1,2,3,4].map(n=>[n,n+(n===1?' employee':' employees')]))+
    select('target','New-business focus',Object.entries(E.AGENCY_PRODUCTS).map(([key,product])=>[key,product.name]))+
    select('outreach','Recurring acquisition effort',[[0,'No outreach'],[1,'Focused outreach'],[2,'Intensive outreach']])+
    number('supportCap','Standing monthly parent support cap ($)',policy.supportCap,100000)+
    number('dividend','One-month agency distribution ($)',policy.dividend,quote.distributionLimit)+'</div>'+
    '<p class="micro">Staff, focus, outreach and the support cap persist after settlement. Capital and distributions are one-month orders. Support is permission to cover a shortfall, not free income or a guarantee of rescue; it shares existing parent cash with other group commitments.</p>'+
    '<button type="button" class="btn" id="previewAgency"'+disabled+'>Preview instruction</button> '+
    '<button type="button" class="btn" id="stageAgency"'+disabled+'>Stage agency instruction</button>'+
    '<p class="small" id="agencyInstructionStatus" role="status">Controls are a working form. Only Stage changes your monthly plan.</p></details>'+
    '<div id="agencyInstructionQuote" aria-live="polite">'+agencyQuoteMarkup(quote)+'</div>'+
    '<details><summary>Costs, downside and reserve safeguards</summary><p class="small">There is no guaranteed demand. Understaffing, weak outreach or unprofitable premiums can leave a costly agency with little business. Renewal service competes for limited capacity. Customers can move one cover without moving their bank relationship.</p>'+
    '<p class="small">Distributions are limited to earned profit and cash above the three-month operating-expense reserve. Staffing and outreach change that reserve. If operations exhaust funding, the subsidiary can fail and its investment can be lost; bank deposit balances are not an automatic bailout.</p></details>'+
    agencyResultsMarkup(v)+'</section>';
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
  return settled+'<details><summary>Corporate cover roster · 18 independent relationships</summary><p class="small">Policies are contestable at renewal; service shortfalls or unpaid premiums can end them earlier. Focus applies to new acquisitions, not existing service. Local facilities, delivered service, digital capability and agency effort affect competition.</p>'+
    '<div class="table-scroll" tabindex="0" aria-label="Independent company insurance relationships"><table class="regional-table"><thead><tr><th>Company</th>'+products.map(([,product])=>'<th>'+esc(product.name)+'</th>').join('')+'</tr></thead><tbody>'+roster+'</tbody></table></div>'+
    '<p class="micro">Quoted premiums and commissions are monthly schedules, not promised receipts. Closed companies cannot buy cover. Banking mandates and company ownership are separate from this roster. Rival subsidiary staffing, cash and sealed orders are private.</p></details>';
}
function bindAgencyControls(v){
  if(!v.me.agency)return;
  const signature=JSON.stringify(draft),campaign=game||view;
  const read=()=>({launch:v.me.agency.status!=='active'?!!$('#agency-launch').checked:false,
    capital:Number($('#agency-capital').value),staff:Number($('#agency-staff').value),target:$('#agency-target').value,
    outreach:Number($('#agency-outreach').value),supportCap:Number($('#agency-supportCap').value),dividend:Number($('#agency-dividend').value)});
  const guard=()=>{if(agencyDraftCurrent(v,signature,campaign))return true;
    toast('The institution, month or plan changed. Reopen the agency desk before staging.');return false;};
  for(const key of ['capital','staff','target','outreach','supportCap','dividend',...(v.me.agency.status!=='active'?['launch']:[])]){
    $('#agency-'+key).addEventListener('change',()=>{
      if(!guard())return;
      $('#agencyInstructionStatus').textContent='Form changed. Preview or stage the updated instruction; the monthly plan is unchanged.';
      $('#agencyInstructionQuote').innerHTML='<p class="notice">The form changed. Preview the updated costs before staging.</p>';
    });
  }
  $('#previewAgency').addEventListener('click',()=>{
    if(!guard())return;
    try{const now=currentView(),next=JSON.parse(JSON.stringify(draft));next.agencyPolicy=read();
      E.normalizeGroupPlan(now.me,next);E.normalizeAgencyPlan(now.me,next);
      $('#agencyInstructionQuote').innerHTML=agencyQuoteMarkup(E.agencyQuote(now.me,next.agencyPolicy));
      $('#agencyInstructionStatus').textContent='Preview only. Your monthly plan is unchanged until you stage this instruction.';
    }catch(error){$('#agencyInstructionStatus').textContent=error.message;toast(error.message);}
  });
  $('#stageAgency').addEventListener('click',()=>{if(guard())stageAgencyPolicy(v,read(),signature,campaign);});
}
