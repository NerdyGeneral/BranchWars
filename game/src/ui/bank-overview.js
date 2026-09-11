// Owner-only explanations built from existing quotes and recorded outcomes.
// No settlement, invented history, private rival plan, or saved UI feature map.
const overviewDollars=n=>Number.isFinite(n)?(n<0?'−':'')+'$'+Math.round(Math.abs(n)).toLocaleString('en-US'):'Unavailable';
function bankFinancialOverview(v,review){
 const p=v.me,q=review.quote;
 let protection=null,quoteError=null,position=null,bookError=null;
 try{if(q&&p.facilityLifecycle)protection=E.facilityLifecycleProtectedBudget(p,draft,q);}catch(error){quoteError=error.message;}
 try{if(p.accounting){position=E.AccountingPrototype.check(p.accounting);if(position.residual!==0)bookError='Recorded bank accounts do not reconcile.';}}catch(error){bookError=error.message;}
 const room=quoteError?null:protection?protection.remaining:q?(q.discretionaryRemaining??q.remaining):null;
 const bridge=[6,7,8].includes(v.financialGroupVersion)&&typeof bankEarningsBridgeView!=='undefined'?bankEarningsBridgeView.review(v):null;
 return {cash:p.stats.cash,room,quoteError,quote:q,protection,position,bookError,
  equity:bookError?null:position?.equity??p.stats.capital,
  earnings:p.accounting?p.accounting.retainedEarnings:p.stats.earnings,
  operating:p.operatingReport||null,bridge,
  parentCash:p.financialGroup?.parent.accounts.cash,group:p.groupSummary||null};
}
function bankAttentionItems(v,review,financial){
 const p=v.me,rows=[],add=(id,kind,title,text,tab,target,extra={})=>rows.push({id,kind,title,text,tab,target,...extra});
 if(!p.submitted&&!v.gameOver)for(const row of review.blockers)add(row.id,'required',row.title,row.text,row.tab,row.target,{desk:row.desk});
 for(const row of review.warnings)add(row.id,'watch',row.title,row.text,row.tab,row.target,{desk:row.desk,peopleDesk:row.peopleDesk});
 if(p.capitalTier?.key!=='strong'&&p.capitalTier)add('capital','watch',p.capitalTier.name,
  'Current bank capital ratio '+Number(p.capitalRatio).toFixed(1)+'%. '+(p.capitalTier.text||'Review funding, capital and exposure before expanding.'),'operations','#operatingPreview',{desk:'forecast'});
 if(p.distress>0)add('distress','watch','Institutional failure risk',p.distress+' of '+v.receivershipCycles+' critical months recorded. A positive cash balance does not establish solvency.','overview','#bankRecoveryMount');
 if(financial.protection?.remaining<0&&!review.blockers.some(row=>row.id==='facilities'))add('protected-room','watch','Protected spending room is negative',overviewDollars(-financial.protection.remaining)+' exceeds the protected cash envelope. Review commitments and your explicit reserve settings.','operations','#planBudget',{desk:'forecast'});
 const payables=p.accounting?.accounts.payables;
 if(payables>0)add('payables','watch','Unpaid obligations remain owed',overviewDollars(payables)+' has already accrued as a liability. Paying it uses cash; it is not a second expense.','operations','#operatingPreview',{desk:'forecast'});
 if(financial.operating?.profit<0)add('operating-loss','watch','Last month had an operating loss','Month '+financial.operating.cycle+': '+overviewDollars(financial.operating.profit)+'. This excludes some other changes in retained earnings.','overview','#operatingReport');
 if(financial.bridge?.available&&financial.bridge.change<0&&financial.bridge.operatingProfit>=0)add('earnings-loss','watch','Positive operating profit, but earnings fell','Month '+financial.bridge.cycle+': operating profit '+overviewDollars(financial.bridge.operatingProfit)+'; total bank earnings change '+overviewDollars(financial.bridge.change)+'. Review non-operating movements before assuming the bank is profitable overall.','overview','#bankFinancialOverview');
 const prior=(v.trend||[]).filter(row=>row.cycle<v.cycle&&Number.isFinite(row.meDeposits)).slice(-2);
 if(prior.length===2&&prior[1].cycle===prior[0].cycle+1&&prior[1].meDeposits<prior[0].meDeposits)add('deposits-fell','watch','Recorded deposits declined',overviewDollars(prior[0].meDeposits-prior[1].meDeposits)+' lower from month '+prior[0].cycle+' to '+prior[1].cycle+'. This is an observed balance change, not proof of which action caused it.','markets','#marketMap');
 const short=review.functions?.delivery?.rows?.filter(row=>row.planned.shortfall>0)||[];
 if(short.length&&!review.warnings.some(row=>row.id==='coverage'))add('task-coverage','watch','The draft leaves '+short.length+' task'+(short.length===1?'':'s')+' short','Employees may all be allocated while service work remains uncovered. Review task coverage and displaced work before recruiting.','workforce','#peopleOverview',{peopleDesk:'overview'});
 if(review.quote?.freeCapacity<0&&p.projects?.length)add('execution','watch','Active initiatives compete for execution',p.projects.length+' active initiative'+(p.projects.length===1?'':'s')+'; quoted execution demand '+Number(review.quote.load).toFixed(1)+' versus '+Number(review.quote.capacity).toFixed(1)+' capacity. This warns of a bottleneck; it is not a promised completion date.','operations','#activeProject',{desk:'projects'});
 for(const contract of v.serviceAgreements||[]){
  if(contract.owner!==p.id||contract.companyClosed)continue;
  const label=E.SERVICE_TYPES?.[contract.kind]?.name||'Service agreement',market=v.territories[contract.market]?.name||contract.market;
  if(contract.misses>0)add('service-missed-'+contract.id,'watch',label+' missed service',market+': '+contract.misses+' recorded missed service month(s). Review delivery capacity; two misses reopen the mandate.','markets','#servicePricing');
  if(contract.due>=v.cycle&&contract.due<=v.cycle+1)add('renewal-'+contract.id,'upcoming',label+' renewal '+(contract.due===v.cycle?'this month':'next month'),market+' · month '+contract.due+'. Incumbents defend automatically unless you decline; review staffing and price.','markets','#servicePricing');
 }
 const pending=p.onboarding?.pending||[],expiring=pending.filter(row=>row.expiresCycle<=v.cycle+1);
 const requests=expiring.reduce((n,row)=>n+row.count,0);
 if(requests>0)add('applications','upcoming',requests+' pending application'+(requests===1?'':'s')+' near expiry','Requests expire at month '+Math.min(...expiring.map(row=>row.expiresCycle))+'. Activation still needs product eligibility, staff, funds and outside supply; requests are not owned deposits.','customers','#householdPanel',{householdDesk:'service'});
 const credit=p.creditPerformance?.report;
 if(credit&&credit.entered>credit.cured)add('arrears','watch','New arrears exceeded cures last month','Month '+credit.cycle+': '+overviewDollars(credit.entered)+' entered arrears; '+overviewDollars(credit.cured)+' cured. Recoveries and write-offs are separate movements, so this is not a net delinquency calculation.','credit','#creditPanel');
 if(p.facilityLifecycle)for(const office of p.facilityNetwork.offices){
  if(office.closedCycle!==null)continue;
  const record=p.facilityLifecycle.records[office.id];
  if(record.conditionBp<=E.FacilityLifecycle.RULES.criticalCondition)add('condition-'+office.id,'watch','Facility condition is critical',
   (E.FacilityLifecycle.CATALOG[office.model]?.name||office.model)+' in '+(v.territories[office.market]?.name||office.market)+' · '+(record.conditionBp/100).toFixed(1)+'% condition. Inspect maintenance, renovation and temporary capacity loss.','markets','#facilityLifecyclePanel',{officeId:office.id});
 }
 if(financial.quoteError||financial.bookError)add('financial-data','watch','Financial explanation unavailable',financial.quoteError||financial.bookError,'operations','#operatingPreview',{desk:'forecast'});
 return rows;
}
let bankOverviewState={owner:null,campaign:null,filter:'all',page:0};
function navigateBankOverview(item){
 const v=currentView();if(!v)return;
 if(item.householdDesk&&v.me.householdBook)householdWorkspace=item.householdDesk;
 if(item.officeId&&v.me.facilityLifecycle?.records[item.officeId]){
  // The existing desk owns its form. Inspecting a location stages no order.
  setWorkspaceTab('markets');lifecycleUi.office=item.officeId;lifecycleUi.open=true;renderFacilityLifecycle(v);
 }
 if(item.peopleDesk&&v.me.workforce){setPeopleDesk(item.peopleDesk);const target=$(item.target);if(typeof focusWorkspaceTarget==='function')focusWorkspaceTarget(target);else {target?.scrollIntoView?.({block:'center',behavior:'auto'});target?.setAttribute?.('tabindex','-1');target?.focus?.({preventScroll:true});}return;}
 navigatePlanReview(item);
}
function renderBankOverview(v,review){
 const mount=$('#attentionInbox'),finance=$('#bankFinancialOverview');if(!mount||!finance)return;
 if(workspaceTab!=='overview')return;
 if(bankOverviewState.owner!==v.me.id||bankOverviewState.campaign!==game)bankOverviewState={owner:v.me.id,campaign:game,filter:'all',page:0};
 const financial=bankFinancialOverview(v,review),items=bankAttentionItems(v,review,financial),selected=bankOverviewState.filter;
 const filters=[['all','All'],['required','Required'],['watch','Watch'],['upcoming','Upcoming']];
 const shown=selected==='all'?items:items.filter(row=>row.kind===selected);
 const pages=Math.max(1,Math.ceil(shown.length/10));bankOverviewState.page=Math.min(bankOverviewState.page,pages-1);
 const start=bankOverviewState.page*10,visible=shown.slice(start,start+10);
 mount.innerHTML='<header class="section-head"><div><h2>ATTENTION INBOX</h2><p class="small">Month '+v.cycle+' · decisions, recorded risks and upcoming commitments. These are reminders, not automatic orders.</p></div></header><div class="attention-filters" role="group" aria-label="Attention filters">'+filters.map(([key,label])=>'<button type="button" class="btn" data-attention-filter="'+key+'" aria-pressed="'+(key===selected)+'">'+label+' ('+(key==='all'?items.length:items.filter(row=>row.kind===key).length)+')</button>').join('')+'</div>'+
  (shown.length?'<ul class="attention-list">'+visible.map(item=>'<li class="attention-item is-'+item.kind+'"><div><span class="attention-kind">'+item.kind+'</span><b>'+esc(item.title)+'</b><p>'+esc(item.text)+'</p></div><button type="button" class="btn" data-attention-open="'+items.indexOf(item)+'" aria-label="Review '+esc(item.title)+'">Review</button></li>').join('')+'</ul>':'<p class="attention-clear">'+(v.me.submitted?'Your plan is locked.':v.gameOver?'Campaign ended.':'No '+(selected==='all'?'listed':selected)+' items in the checks shown here.')+' This is not a guarantee of future results or a complete risk assessment.</p>')+
  (pages>1?'<div class="attention-pagination"><button type="button" class="btn" data-attention-page="-1" '+(start===0?'disabled':'')+'>Previous</button><span>Items '+(start+1)+'–'+Math.min(start+10,shown.length)+' of '+shown.length+'</span><button type="button" class="btn" data-attention-page="1" '+(bankOverviewState.page===pages-1?'disabled':'')+'>Next</button></div>':'')+
  '<details><summary>What this inbox checks</summary><p class="small">Listed planning blockers, unstaged leadership/training, capital status, unpaid obligations, recorded operating/earnings losses, consecutive deposit snapshots, quoted task/execution shortages, your service renewals/misses, expiring applications, recorded credit flows and critically worn offices. Optional systems that are off contribute no alerts. Rival private plans and unrecorded history are never inferred.</p></details>';
 const campaign=game||view,owner=v.me.id,cycle=v.cycle,resolution=v.resolutionId;
 const fresh=()=>{const now=currentView();return (game||view)===campaign&&now?.me.id===owner&&now?.cycle===cycle&&now?.resolutionId===resolution;};
 const redraw=()=>{const now=currentView();renderBankOverview(now,monthlyPlanReview(now));};
 $$('[data-attention-filter]').forEach(button=>button.addEventListener('click',()=>{if(!fresh())return;bankOverviewState.filter=button.dataset.attentionFilter;bankOverviewState.page=0;redraw();$('[data-attention-filter="'+bankOverviewState.filter+'"]')?.focus?.();}));
 $$('[data-attention-page]').forEach(button=>button.addEventListener('click',()=>{if(!fresh())return;bankOverviewState.page=Math.max(0,Math.min(pages-1,bankOverviewState.page+Number(button.dataset.attentionPage)));redraw();mount.setAttribute?.('tabindex','-1');mount.focus?.({preventScroll:true});mount.scrollIntoView?.({block:'center',behavior:'auto'});}));
 $$('[data-attention-open]').forEach(button=>button.addEventListener('click',()=>{if(fresh()&&items[Number(button.dataset.attentionOpen)])navigateBankOverview(items[Number(button.dataset.attentionOpen)]);}));
 renderFinancialOverview(v,financial);
}
function renderFinancialOverview(v,f){
 const disclosures=['financialFundingDetails','financialEarningsDetails','financialGroupDetails'],open=Object.fromEntries(disclosures.map(id=>[id,!!$('#'+id)?.open]));
 const stat=(label,value,note)=>'<article><span>'+label+'</span><b>'+overviewDollars(value)+'</b><p>'+esc(note)+'</p></article>';
 $('#bankFinancialOverview').innerHTML='<header class="section-head"><div><h2>WHAT THE NUMBERS MEAN</h2><p class="small">Bank balances now, spending constraints on this draft, and last completed results are different measures.</p></div></header><div class="financial-overview-grid">'+
  stat('Bank cash · now',f.cash,'Liquid bank funds. Deposits and borrowing can add cash without creating profit or equity.')+
  stat('Optional spending room · draft',f.room,'After existing commitments and applicable capital/cash protections. Not the cash balance, future income or a promised month-end balance.')+
  stat('Bank equity · now',f.equity,'The bank’s loss-absorbing capital, not customer deposits. '+(f.position?'Assets minus liabilities.':'This legacy campaign retains its original capital rules.'))+
  stat('Bank operating profit · '+(f.operating?'month '+f.operating.cycle:'no completed month'),f.operating?.profit,'Operating stage only; other spending and transfers can still reduce retained earnings.')+'</div>'+
  '<details class="financial-explanation" id="financialFundingDetails"><summary>Cash, capital and funding constraints</summary><p>Customer deposits '+overviewDollars(v.me.stats.deposits)+' are funding owed to customers, not revenue. Bank equity '+overviewDollars(f.equity)+' is separate from bank cash '+overviewDollars(f.cash)+'. Current capital ratio '+Number(v.me.capitalRatio).toFixed(1)+'% · '+esc(v.me.capitalTier?.name||'status unavailable')+'.</p>'+
  (f.quote?'<p>Full-plan commitment '+overviewDollars(f.quote.total)+'. '+(f.quote.discretionaryCashAvailable!==undefined?'Before optional commitments, cash room '+overviewDollars(f.quote.discretionaryCashAvailable)+' and capital-safe room '+overviewDollars(f.quote.discretionaryCapitalAvailable)+'. Existing monthly obligations '+overviewDollars(f.quote.mandatoryObligations)+' and accrued payables '+overviewDollars(v.me.accounting?.accounts.payables??0)+' remain owed.':'Quoted remaining room '+overviewDollars(f.quote.remaining)+' follows this campaign’s funding rules.')+'</p>':'<p>The current draft cannot be quoted. Review the listed planning errors; no funds have been silently changed.</p>')+
  (f.protection?'<p>Protected cash reserve '+overviewDollars(f.protection.reserve)+' is the higher Workforce or department reserve. Raising or lowering a reserve changes permission to spend, not how much cash exists.</p>':'')+
  '<p>Forecast operating income does not finance earlier orders automatically. Construction, recruitment, decisions, competitive actions, funding sales and transfers may settle at different stages. See Operations → Forecast & books for the full existing calculation and its exclusions.</p></details>'+
  '<details class="financial-explanation" id="financialEarningsDetails"><summary>'+(v.me.accounting?'Retained bank earnings':'Cumulative bank earnings')+' · '+overviewDollars(f.earnings)+'</summary><p>This is the accumulated recorded bank result, not the latest operating profit and not available cash. Deposits, principal repayments and borrowing are not new earnings.</p>'+
  (f.bridge?.available?'<p>Month '+f.bridge.cycle+': opening '+overviewDollars(f.bridge.opening)+' + operating profit '+overviewDollars(f.bridge.operatingProfit)+' + other net changes '+overviewDollars(f.bridge.otherNet)+' = closing '+overviewDollars(f.bridge.closing)+'. Net change '+overviewDollars(f.bridge.change)+'.</p>':'<p>A complete monthly earnings bridge is '+(f.bridge?'unavailable for this snapshot':'not provided by this campaign version')+'. No missing history has been reconstructed here.</p>')+'</details>'+
  (f.group?'<details class="financial-explanation" id="financialGroupDetails"><summary>Financial Group · separate parent and consolidated position</summary><p>Parent cash '+overviewDollars(f.parentCash)+' is not bank spending room. Consolidated assets '+overviewDollars(f.group.assets)+' − liabilities '+overviewDollars(f.group.liabilities)+' = equity '+overviewDollars(f.group.equity)+'. Internal investment eliminated: '+overviewDollars(f.group.eliminatedInvestment)+'.</p><p>These are balance-sheet positions, not this month’s group profit. Do not add parent investments to bank/subsidiary equity a second time. A bank dividend moves resources within the group; a parent injection arrives at month end and cannot fund earlier bank orders. Review the Financial Group desks for actual subsidiary results and explicit transfers.</p></details>':'');
 for(const id of disclosures){const element=$('#'+id);if(element)element.open=open[id];}
}
