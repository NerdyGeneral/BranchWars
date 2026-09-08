let productDeskView='development',inspectedProductMarket=null;
function stageProductProgramme(v,change,{allowDecommit=false}={}) {
 if(v.me.submitted||!v.me.productPrograms)return false;
 const next=JSON.parse(JSON.stringify(draft));
 try {
  change(next);E.normalizeProductProgramPlan(v.me,next);E.normalizeAdvertisingPlan(v.me,next);if(v.me.relationshipOffers)E.normalizeRelationshipOfferPlan(v.me,next);if(v.me.onboarding)E.normalizeOnboardingPlan(v.me,next);
  const status=E.projectPlanStatus(v.me,next);
  if(!status.eligible&&!(typeof allowDecommit==='function'?allowDecommit(next):allowDecommit))throw Error(status.reason);
  draft=next;renderProducts(v);renderProjects(v);renderReady(v);return true;
 }catch(e){toast(e.message);renderProductPrograms(v);return false;}
}
function toggleProductDevelopment(v,key) {
 const removing=E.planInitiatives(draft).includes(key);
 return stageProductProgramme(v,next=>{const list=E.planInitiatives(next);next.newProjects=removing?list.filter(k=>k!==key):[...list,key];next.newProject=next.newProjects[0]||null;},{allowDecommit:removing});
}
function toggleProductRetirement(v,product) {
 return stageProductProgramme(v,next=>{
  const q=next.productProgramPolicy;
  if(q.retire.includes(product)){q.retire=q.retire.filter(k=>k!==product);return;}
  q.retire.push(product);
  for(const row of Object.values(q.markets))for(const mix of Object.values(row)){mix[product]=0;if(!Object.values(mix).some(Boolean))mix.essential=4;}
 },{allowDecommit:draft.productProgramPolicy.retire.includes(product)});
}
function renderProductPrograms(v) {
 $('#productProgramsNav').classList.toggle('hidden',!v.me.productPrograms);
 if(!v.me.productPrograms){$('#productProgramsPanel').innerHTML='';if(workspaceTab==='products')setWorkspaceTab('overview');return;}
 if(workspaceTab!=='products')return;
 if(productDeskView==='relationships'&&!v.me.relationshipOffers)productDeskView='development';
 if(productDeskView==='onboarding'&&!v.me.onboarding)productDeskView='development';
 if(productDeskView==='pricing'&&v.me.productPrograms.version!==2)productDeskView='development';
 const p=v.me,policy=draft.productProgramPolicy,disabled=p.submitted?'disabled':'',cash=n=>'$'+Math.round(n).toLocaleString();
 const preview=JSON.parse(JSON.stringify(p));E.applyProductProgramPolicy(preview,policy);
 const vendor=E.productProgramCosts(preview),book=E.segmentDepositSummary(preview,v);
 const head='<div class="section-head"><div><h2>PRODUCT MANAGEMENT</h2><p class="small muted">Build a delivery platform. Choose who you sell to. Keep the promises already on your books.</p></div><span class="micro">Draft changes settle with both plans</span></div>'+
'<div class="product-desk-tabs" role="group" aria-label="Product views">'+[['development','Development & retirement'],['targets','Local sales targets'],...(p.productPrograms.version===2?[['pricing','Pricing & funding']]:[]),...(p.advertising?[['advertising','Advertising & attribution']]:[]),...(p.relationshipOffers?[['relationships','Existing customers']]:[]),...(p.onboarding?[['onboarding','Applications & onboarding']]:[])].map(([k,name])=>'<button type="button" class="btn '+(productDeskView===k?'primary':'')+'" data-product-view="'+k+'" aria-pressed="'+(productDeskView===k)+'">'+name+'</button>').join('')+'</div>'+
 '<div class="product-desk-summary"><div><small>Current-book vendor run rate · draft</small><b>'+cash(vendor.total)+'/month</b></div><div><small>All deposit interest + service − fees · draft</small><b>'+cash(book.interest+book.service-book.fees)+'/month</b></div><div><small>One-time retirements staged</small><b>'+cash(policy.retire.length*E.PRODUCT_RETIRE_COST)+'</b></div></div>';
 let content='';
 if(productDeskView==='development'){
  content='<p class="micro">In-house development needs completed capability research and more launch capital. Licensing launches faster without that research, but costs '+cash(E.PRODUCT_LICENSE)+'/month while available plus 0.01% of existing non-term product balances/month. Both routes also pay ordinary offer-platform and account servicing costs. In-house conversion removes vendor charges next month without repricing accounts.</p><div class="product-development-grid">'+Object.keys(E.RETAIL_DEPLOYMENTS).map(product=>{
   const state=p.productPrograms.products[product],active=p.projects.find(x=>E.PRODUCT_PROGRAM_PROJECTS[x.key]?.product===product),retiring=policy.retire.includes(product),name=E.RETAIL_DEPLOYMENTS[product].name;
   const stateLabel=retiring?'RETIREMENT STAGED':active?'DELIVERY IN PROGRESS':state.retired?'RETIRED · SERVICING ONLY':state.route==='none'?'NOT DEVELOPED':state.route==='build'?'IN-HOUSE PLATFORM':'LICENSED PLATFORM';
   const routes=Object.entries(E.PRODUCT_PROGRAM_PROJECTS).filter(([,d])=>d.product===product).map(([key,d])=>{
    const def=v.projects[key],picked=E.planInitiatives(draft).includes(key),candidate={...draft,newProjects:picked?E.planInitiatives(draft).filter(k=>k!==key):[...E.planInitiatives(draft),key]};
    candidate.newProject=candidate.newProjects[0]||null;
    const status=E.projectPlanStatus(p,candidate),reason=picked?'Remove from this plan':status.eligible?'Stage this route':status.reason;
    return '<button type="button" class="product-route '+(picked?'selected':'')+'" data-product-development="'+key+'" '+(disabled||!picked&&!status.eligible?'disabled':'')+'><b>'+(d.route==='build'?'Develop in-house':'License a platform')+'</b><span>'+cash(def.cost)+' · '+def.cycles+' base work units · '+def.capacity+' execution capacity</span><small>'+esc(reason)+'</small></button>';
   }).join('');
   const current=book.rows[product],costs=vendor.rows[product];
   return '<article class="product-development-card"><span class="micro blue">'+stateLabel+'</span><h3>'+esc(name)+'</h3>'+
    (active?'<p class="micro">'+Math.min(100,Math.round(active.progress/active.total*100))+'% delivered. Shared Operations capacity is required each month; lost staffing stalls progress.</p>':'')+
    '<p class="micro">Existing balances: '+cash(current.principal)+' · guarantees outstanding: '+cash(current.guaranteed)+'.</p>'+routes+
    '<p class="micro">Draft vendor charge: '+cash(costs.license)+' availability + '+cash(costs.royalty)+' balance servicing/month.</p>'+
    '<button type="button" class="btn" data-product-retire="'+product+'" '+(disabled||!p.productDeployment.ready[product]||active?'disabled':'')+'>'+(retiring?'Cancel retirement · sales stay closed':'Retire product · '+cash(E.PRODUCT_RETIRE_COST))+'</button>'+
    '<p class="micro muted">Retirement closes this offer in every market and ends availability fees. Existing checking remains serviced; savings guarantees run to expiry before local fallback. Vendor balance charges continue. Reopening requires another paid rollout; there is no refund. Term deposits remain separate.</p></article>';
  }).join('')+'</div>';
 } else if(productDeskView==='targets') {
  const market=v.territories[inspectedProductMarket]?inspectedProductMarket:draft.focus,rows=policy.markets[market];
  const fits=E.customerDemand(preview,v,market);
  content='<div class="product-market-picker"><label for="productTargetMarket">Inspect market</label><select id="productTargetMarket">'+Object.entries(v.territories).map(([k,t])=>'<option value="'+k+'" '+(market===k?'selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select><span class="micro muted">Inspection does not change your focus or other markets.</span></div>'+
   '<p class="micro">0 closes new sales to this segment; 1–4 sets relative emphasis. Keep one available offer per row. Local suitability changes who responds; these settings do not create demand, staff or deposits. Retention is still managed in Customers.</p><div class="table-scroll"><table class="regional-table product-target-table"><thead><tr><th>Audience</th>'+Object.keys(E.RETAIL_PLATFORM).map(k=>'<th>'+esc(v.productPortfolios.retail.options[k].name)+'</th>').join('')+'<th>Draft local fit</th></tr></thead><tbody>'+
   Object.entries(E.CUSTOMER_SEGMENTS).map(([s,d])=>'<tr><th>'+esc(d.name)+'</th>'+Object.keys(E.RETAIL_PLATFORM).map(k=>'<td><label class="sr-only" for="target_'+s+'_'+k+'">'+esc(d.name+' '+v.productPortfolios.retail.options[k].name)+'</label><select id="target_'+s+'_'+k+'" data-target-segment="'+s+'" data-target-product="'+k+'" '+(disabled||k!=='essential'&&(!p.productDeployment.ready[k]||policy.retire.includes(k))?'disabled':'')+'>'+[0,1,2,3,4].map(n=>'<option value="'+n+'" '+(rows[s][k]===n?'selected':'')+'>'+['Closed','Low','Standard','High','Priority'][n]+'</option>').join('')+'</select></td>').join('')+'<td>'+(fits.segments.find(x=>x.key===s).fit*100).toFixed(0)+'%</td></tr>').join('')+
   '</tbody></table></div><p class="micro">100% is neutral acquisition strength, not a win probability. New deposits retain the acquiring segment and split by emphasis × fit. Existing account products and locked rates do not change when you edit this table. When savings sales are closed locally at guarantee expiry, or a term deposit is released, the highest-emphasis local offer is the fallback.</p>'+
   '<details class="product-target-overview"><summary>All market sales instructions</summary><div class="table-scroll"><table class="regional-table"><thead><tr><th>Market</th><th>Everyday</th><th>Connected</th><th>Reserve</th></tr></thead><tbody>'+Object.entries(policy.markets).map(([k,row])=>'<tr><th>'+esc(v.territories[k].name)+'</th>'+Object.values(row).map(mix=>'<td>'+Object.entries(mix).filter(([,w])=>w).map(([k,w])=>esc(v.productPortfolios.retail.options[k].name)+' '+w).join('<br>')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>';
 }
 if(productDeskView==='advertising'&&p.advertising)content=advertisingDeskContent(v,preview);
 if(productDeskView==='relationships'&&p.relationshipOffers)content=relationshipOfferContent(v,preview);
 if(productDeskView==='onboarding'&&p.onboarding)content=onboardingContent(v);
 if(productDeskView==='pricing')content=productPricingDeskContent(v);
 $('#productProgramsPanel').innerHTML=head+content+'<p class="micro muted">Run rates hold today’s account balances fixed; they exclude new intake, shared payroll, loan income and one-time development/retirement spend. Use Operations for the complete operating forecast and term-deposit policy. No order is submitted from this page.</p>';
 if(productDeskView==='advertising'&&p.advertising)bindAdvertisingDesk(v);
 if(productDeskView==='relationships'&&p.relationshipOffers)bindRelationshipOfferDesk(v);
 if(productDeskView==='onboarding'&&p.onboarding)bindOnboardingDesk(v);
 if(productDeskView==='pricing')bindProductPricingDesk(v);
 $$('[data-product-view]').forEach(b=>b.addEventListener('click',()=>{productDeskView=b.dataset.productView;renderProductPrograms(v);}));
 $$('[data-product-development]').forEach(b=>b.addEventListener('click',()=>toggleProductDevelopment(v,b.dataset.productDevelopment)));
 $$('[data-product-retire]').forEach(b=>b.addEventListener('click',()=>toggleProductRetirement(v,b.dataset.productRetire)));
 $('#productTargetMarket')?.addEventListener('change',e=>{inspectedProductMarket=e.target.value;renderProductPrograms(v);});
 $$('[data-target-segment]').forEach(input=>input.addEventListener('change',()=>{
  const market=v.territories[inspectedProductMarket]?inspectedProductMarket:draft.focus;
  stageProductProgramme(v,next=>{next.productProgramPolicy.markets[market][input.dataset.targetSegment][input.dataset.targetProduct]=Number(input.value);});
 }));
}
function productPricingCash(n){return (n<0?'-$':'$')+Math.abs(Math.round(n)).toLocaleString();}
function productPricingDeskContent(v){
 const p=v.me,quote=E.productPricingQuote(p,v,draft),cash=productPricingCash,rate=n=>(n*12/10000).toFixed(3)+'%';
 const current=E.productPricingQuote(p,v,{...draft,productProgramPolicy:{...draft.productProgramPolicy,pricingBp:{...p.productPrograms.pricingBp}}});
 const cards=Object.entries(quote.rows).map(([key,row])=>{
  const label=v.productPortfolios.retail.options[key].name;
  return '<article class="product-development-card"><h3>'+esc(label)+'</h3>'+
   (row.bp===null?'<p class="micro">Automatic savings guarantee · no new price control</p>':
    '<label for="pricing-'+key+'">Annual adjustment</label><select id="pricing-'+key+'" aria-label="'+esc(label)+' annual adjustment" data-pricing-product="'+key+'" '+(p.submitted||!row.editable?'disabled':'')+'>'+
    [-25,0,25].map(n=>'<option value="'+n+'" '+(row.bp===n?'selected':'')+'>'+(n>0?'+':'')+n+' basis points</option>').join('')+'</select>')+
   (!row.available?'<p class="micro">Not deployed for new sales. Develop or license the product first; retired accounts remain serviced at their retained tariff.</p>':'')+
   '<p class="small">Keep current tariff: '+rate(current.rows[key].rate)+'<br>'+(row.available?'Staged offer':row.bp!==null&&row.variable>0?'Retained variable rate':'Illustrative quote')+': <b>'+rate(row.rate)+'</b></p>'+
   '<p class="micro">Variable balances '+cash(row.variable)+' · protected non-term balances '+cash(row.protected)+'.</p>'+
   '<p class="micro">Fixed-book monthly interest '+cash(row.interest)+' · service/platform '+cash(row.service)+' · fees '+cash(row.fees)+'.</p>'+
   '<p class="micro">Direct cost after fees: <b>'+cash(row.directCost)+'</b>. Excludes shared bank expenses and loan income.</p></article>';
 }).join('');
 const rival=v.rival.productQuotes;
 const rivalText=rival?'Last settled rival offers · month '+rival.cycle+': '+Object.keys(rival.rates).map(k=>esc(v.productPortfolios.retail.options[k].name)+' '+rate(rival.rates[k])+(rival.available[k]?'':' (not open for new sales)')).join(' · '):'Rival offers have not settled yet';
 let content='<p class="small">Persistent bank-wide prices supplement the global deposit mandate. Higher rates cost money on your existing variable accounts. Their competitive pull requires service capacity and products both banks actually market. Guarantees and locked terms remain protected.</p>'+
  '<div class="product-pricing-grid">'+cards+'</div><p class="micro">Both quote columns use the same staged global deposit mandate; only the product adjustments differ. Quotes are annualized monthly rates, not compounded APY. Guaranteed accounts continue at their stamped rates.</p>'+
  '<p class="micro">Staged retention-service coverage: '+(quote.coverage*100).toFixed(0)+'%. Coverage above 100% does not amplify the new price signal. Locked term principal: '+cash(quote.term.principal)+'.</p>'+
  '<p class="micro">'+rivalText+'. Published quotes do not reveal local targets, private balances or the rival’s next plan.</p>'+
  '<div class="product-desk-tabs"><button type="button" class="btn" id="compareProductPricing">Compare this price plan</button>'+
  [['workforce','Workforce & training'],['markets','Branches & markets'],['credit','Credit & collections'],['operations','Funding desk']].map(([k,label])=>'<button type="button" class="btn" data-pricing-link="'+k+'">'+label+'</button>').join('')+'</div>'+
  '<div id="productPricingComparison" role="status" aria-live="polite"></div>';
 const review=p.productPrograms.review;
 if(!review)return content+'<p class="micro">No billed-month review yet. Submit both plans to resolve the first month.</p>';
 const bill=review.billed,flowName={ordinaryIntake:'Ordinary outside acquisition',onboarding:'Funded onboarding',rivalTransfers:'Rival transfers (net)',outsideWithdrawals:'Other outside withdrawals',outsideOther:'Other outside receipts',retention:'Retention departures',terms:'Term maturity and conversion (net)',productSwitches:'Product switching (net)',other:'Other changes / residual'};
 content+='<h3>Actual billed month '+review.cycle+'</h3><p class="micro">This snapshot was captured before the later competitive transfer. It is not a recomputation on ending balances.</p>'+
  '<div class="table-scroll" tabindex="0" aria-label="Actual billed product costs"><table class="regional-table"><thead><tr><th>Product</th><th>Billed principal</th><th>Interest</th><th>Service / platform</th><th>Fees</th><th>Direct cost</th></tr></thead><tbody>'+
  Object.entries(bill.rows).map(([k,r])=>'<tr><th>'+esc(k==='term'?'Locked terms':v.productPortfolios.retail.options[k].name)+'</th>'+['principal','interest','service','fees','directCost'].map(f=>'<td>'+cash(r[f])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
  '<details><summary>Deposit movement bridge and market detail</summary><p class="micro">Principal movements are not profit. Internal product and term switches net to zero bank-wide; the detailed owner book retains their individual movements.</p>'+
  '<ul><li>Opening deposits: '+cash(Object.values(review.opening).reduce((n,x)=>n+x,0))+'</li>'+
  Object.entries(review.flows).map(([k,row])=>'<li>'+flowName[k]+': '+cash(Object.values(row).reduce((n,x)=>n+x,0))+'</li>').join('')+
  '<li>Closing deposits: '+cash(Object.values(review.closing).reduce((n,x)=>n+x,0))+'</li></ul>'+
  '<div class="product-pricing-detail table-scroll" tabindex="0" aria-label="Billed market and audience detail"><table class="regional-table"><thead><tr><th>Market / audience</th><th>Product</th><th>Principal</th><th>Interest</th><th>Service</th><th>Fees</th></tr></thead><tbody>'+
  bill.cells.filter(c=>c.row.principal||c.row.service||c.row.fees).map(c=>'<tr><th>'+esc(v.territories[c.key].name+' / '+E.CUSTOMER_SEGMENTS[c.segment].name)+'</th><td>'+esc(c.product==='term'?'Locked terms':v.productPortfolios.retail.options[c.product].name)+'</td>'+['principal','interest','service','fees'].map(f=>'<td>'+cash(c.row[f])+'</td>').join('')+'</tr>').join('')+
  '</tbody></table></div><p class="micro">Central platform cost without an allocated balance: '+cash(bill.centralPlatform)+'. Product totals include it once. Shared payroll, loan income/losses, advertising, training and events remain in the bank operating report, not invented product profit.</p></details>';
 return content;
}
function bindProductPricingDesk(v){
 $$('[data-pricing-product]').forEach(input=>input.addEventListener('change',()=>{
  const key=input.dataset.pricingProduct;
  stageProductProgramme(v,next=>{next.productProgramPolicy.pricingBp[key]=Number(input.value);});
  $('#pricing-'+key)?.focus();
 }));
 $$('[data-pricing-link]').forEach(button=>button.addEventListener('click',()=>{
  setWorkspaceTab(button.dataset.pricingLink);
  if(button.dataset.pricingLink==='operations')setOperationsDesk('funding');
 }));
 $('#compareProductPricing')?.addEventListener('click',()=>{
  try{
   const comparison=E.productPricingComparison(v.me,draft,v.economy),cash=productPricingCash;
   $('#productPricingComparison').textContent='Same balances, staged mandate: monthly interest change '+cash(comparison.monthlyInterestChange)+
    '. Operating forecast — keep tariff: '+cash(comparison.keep.profit)+'; staged tariff: '+cash(comparison.staged.profit)+
    '. This forecast includes operating flows but cannot predict rival transfers, future regimes or guaranteed customer growth. '+
    'Existing-book six-month interest (keep / staged): '+comparison.schedule.keep.map((row,i)=>'M'+row.month+' '+cash(row.interest)+' / '+cash(comparison.schedule.staged[i].interest)).join('; ')+
    '. Schedule holds the economy and existing customer book constant except contractual maturities and known departure payouts; no new customers or term subscriptions.';
  }catch(e){$('#productPricingComparison').textContent=e.message;}
 });
}
