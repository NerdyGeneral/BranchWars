// Company-local order ticket; client assets and bank deposits are never funding.
function companyOrderForm(v,c){
 const key='shares:'+c.id;
 if(!groupWorkspace.forms[key]){const staged=draft.companyShareOrders?.find(o=>o.issuer===c.id),quote=v.companyShareSnapshot.issuers.find(i=>i.id===c.id),ask=v.companyShareSnapshot.outsideQuotes.find(q=>q.issuer===c.id&&q.side==='sell');
  groupWorkspace.forms[key]={shares:String(staged?.shares||100),price:((staged?.limitCents||ask?.limitCents||quote.referenceCents)/100).toFixed(2)};
 }
 return groupWorkspace.forms[key];
}
function companyOrderCandidate(v,c,side,form){
 const candidate=JSON.parse(JSON.stringify(draft));
 candidate.companyShareOrders=(candidate.companyShareOrders||[]).filter(o=>o.issuer!==c.id);
 if(side!=='remove'){
  const shares=groupWhole(form.shares,'Shares'),price=String(form.price).trim();
  if(!/^\d+(\.\d{1,2})?$/.test(price))throw Error('Limit price must be dollars with at most two decimal places.');
  candidate.companyShareOrders.push({issuer:c.id,side,shares,limitCents:Math.round(Number(price)*100)});
 }
 E.normalizeCompanySharePlan(v,v.me,candidate);
 return {candidate,quote:E.companyShareOrderReview(v.me,candidate,v)};
}
function companyShareWorkspaceContent(v,c){
 if(v.companySharesVersion!==1)return '';
 const s=v.companyShareSnapshot,i=s.issuers.find(i=>i.id===c.id),position=v.me.companyShares.positions[c.id],form=companyOrderForm(v,c),staged=draft.companyShareOrders?.find(o=>o.issuer===c.id);
 const ownership=s.ownership.find(o=>o.issuer===c.id),last=s.receipts.find(r=>r.issuer===c.id),dividend=s.distributions.find(r=>r.issuer===c.id);
 const quotes=s.outsideQuotes.filter(q=>q.issuer===c.id).map(q=>(q.side==='sell'?'Outside asking':'Outside bidding')+' $'+(q.limitCents/100).toFixed(2)+' for up to '+integer(q.shares)+' shares').join(' · ');
 let funding;try{const q=E.companyShareOrderReview(v.me,draft,v);funding=money(q.cash)+' reserved for all share orders; '+money(q.protectedCash)+' for other parent commitments; '+money(q.remaining)+' remains.';}catch(error){funding=error.message;}
 const disabled=v.me.submitted||v.gameOver?' disabled':'',closed=i.suspended?' disabled':disabled;
 return '<section class="credit-policy" aria-label="Company share ownership"><h4>Own a stake in '+esc(E.ANCHOR_CLIENTS[c.clientIndex].name)+'</h4><div class="decision-facts">'+
  '<div><small>Your parent owns</small><b>'+integer(position.shares)+' shares · '+(position.shares/1000).toFixed(1)+'%</b></div><div><small>Purchase cost basis</small><b>'+money(position.basis)+'</b></div><div><small>Indicative value · not cash</small><b>'+money(Math.floor(position.shares*i.referenceCents/100))+'</b></div></div>'+
  '<p class="small">Reference $'+(i.referenceCents/100).toFixed(2)+'/share · '+integer(ownership.outside)+' shares held outside the two groups. Parent cash: '+money(v.me.financialGroup.parent.accounts.cash)+'.</p><p class="small">'+esc(quotes||'No outside quotes available.')+'</p><p class="small">'+esc(funding)+'</p>'+
  '<p class="micro">A monthly auction matches both players and a finite outside book. Your limit is a maximum purchase price or minimum sale price—not a promised fill. Outside quotes are capped at 2,000 shares per side per company per month. Each filled side pays 0.25% in exchange fees, rounded up to a dollar.</p>'+
  (i.suspended?'<p class="notice">This company is closed. Trading is suspended; any liquidation payment is reported below.</p>':'<div class="credit-controls"><label for="companyOrderShares">Whole shares<input id="companyOrderShares" type="number" min="1" step="1" max="50000" value="'+esc(form.shares)+'"'+disabled+'></label><label for="companyOrderPrice">Limit price per share ($)<input id="companyOrderPrice" type="number" min="0.01" step="0.01" value="'+esc(form.price)+'"'+disabled+'></label></div>')+
  '<div class="workbench-actions"><button type="button" class="btn primary" id="companyOrderBuy"'+closed+'>Stage purchase</button><button type="button" class="btn" id="companyOrderSell"'+(position.shares?closed:' disabled')+'>Stage sale</button><button type="button" class="btn" id="companyOrderRemove"'+(staged?disabled:' disabled')+'>Remove staged order</button></div>'+
  '<p class="small" id="companyOrderStatus" role="status" tabindex="-1">'+(staged?esc(staged.side==='buy'?'Purchase staged':'Sale staged')+': '+integer(staged.shares)+' shares at $'+(staged.limitCents/100).toFixed(2)+' limit.':'No order staged for this company.')+'</p>'+
  '<p class="small">'+(last?'Last fill: '+esc(last.side)+' '+integer(last.shares)+' shares for '+money(last.consideration)+' + '+money(last.fee)+' fees.':'No fill last month.')+' '+(dividend?'Last shareholder payout: '+money(dividend.amount)+'.':'No shareholder payout last month.')+'</p>'+
  '<details><summary>Ownership, funding and risk</summary><p>Orders last one month and may fill partly or not at all. Unfilled quantities are not automatically repeated. Purchases reserve existing parent cash before settlement; bank dividends, client assets and proceeds from this month’s sales cannot fund them. Cost basis remains a parent asset; price changes are not cash or operating income.</p><p>Dividends use actual company earnings and available cash. Company failure can destroy your investment. Ownership does not award banking or insurance contracts. Ordinary orders stop at 50%; '+(v.companyControlVersion===1?'use Company control below for a reviewed offer.':'reviewed controlling acquisitions are not enabled in these saved rules.')+' Corporate ownership uses the game’s fictional charter, not a claim of unrestricted real-world bank investment powers.</p></details></section>';
}
function bindCompanyShareControls(v,guard){
 if(v.companySharesVersion!==1)return;
 const c=v.me.companySnapshot.world.companies.find(c=>c.id===groupWorkspace.company),form=companyOrderForm(v,c);
 for(const [id,key]of [['companyOrderShares','shares'],['companyOrderPrice','price']])$('#'+id)?.addEventListener('input',()=>{if(!guard())return;form[key]=$('#'+id).value;$('#companyOrderStatus').textContent='Unstaged ticket edits. Stage purchase or sale to add them to the monthly plan.';});
 for(const [id,side]of [['companyOrderBuy','buy'],['companyOrderSell','sell'],['companyOrderRemove','remove']])$('#'+id)?.addEventListener('click',()=>{
  if(!guard())return;
  try{const now=currentView(),{candidate}=companyOrderCandidate(now,c,side,form);draft=candidate;renderFinancialGroup(now);renderReady(now);$('#companyOrderStatus')?.focus?.({preventScroll:true});}
  catch(error){$('#companyOrderStatus').textContent=error.message;}
 });
}
