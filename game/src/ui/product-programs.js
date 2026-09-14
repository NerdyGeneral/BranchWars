let productDeskView='development',inspectedProductMarket=null;
function stageProductProgramme(v,change,{allowDecommit=false}={}) {
 const live=currentView();if(!live||v.me.id!==live.me.id||v.cycle!==live.cycle||v.me.submitted||!v.me.productPrograms||!productContextCurrent(productContext(v)))return false;
 const next=JSON.parse(JSON.stringify(draft));
 try {
  change(next);E.normalizeProductProgramPlan(v.me,next);E.normalizeAdvertisingPlan(v.me,next);if(v.me.relationshipOffers)E.normalizeRelationshipOfferPlan(v.me,next);if(v.me.onboarding)E.normalizeOnboardingPlan(v.me,next);
  const status=E.projectPlanStatus(v.me,next,v);
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
 productSelection(v);
 if(productDeskView==='relationships'&&!v.me.relationshipOffers||productDeskView==='onboarding'&&!v.me.onboarding||
  productDeskView==='advertising'&&!v.me.advertising||productDeskView==='pricing'&&v.me.productPrograms.version!==2||
  productDeskView==='reports'&&v.me.productPrograms.version!==2)productDeskView='development';
 const p=v.me,policy=draft.productProgramPolicy,preview=JSON.parse(JSON.stringify(p)),token=productContext(v);
 E.applyProductProgramPolicy(preview,policy);
 preview.policies={...preview.policies,deposit:draft.depositPolicy};
 const vendor=E.productProgramCosts(preview),book=E.segmentDepositSummary(preview,v),catalogue=['development','pricing','targets'].includes(productDeskView);
 const tabs=[['development','Product catalogue'],...(p.advertising?[['advertising','Advertising']]:[]),...(p.relationshipOffers?[['relationships','Existing customers']]:[]),...(p.onboarding?[['onboarding','Applications']]:[]),...(p.productPrograms.version===2?[['reports','Statements']]:[])];
 const head='<div class="section-head"><div><h2>PRODUCTS & CUSTOMER GROWTH</h2><p class="small muted">Select a product to manage delivery, pricing and local sales. Changes are staged, never submitted here.</p></div></div><div class="product-desk-tabs" role="group" aria-label="Product views">'+tabs.map(([key,label])=>'<button type="button" class="btn" id="product-desk-'+key+'" aria-pressed="'+(productDeskView===key||key==='development'&&catalogue)+'">'+label+'</button>').join('')+'</div>';
 let content=catalogue?productCatalogueContent(v,preview,book,vendor,token):'';
 if(productDeskView==='advertising')content=advertisingDeskContent(v,preview);
 if(productDeskView==='relationships')content=relationshipOfferContent(v,preview);
 if(productDeskView==='onboarding')content=onboardingContent(v);
 if(productDeskView==='reports')content=productPricingReportContent(v);
 const summary='<details class="product-bank-summary"><summary>Bank-wide deposit costs · '+productPricingCash(book.interest+book.service-book.fees)+'/month on current balances</summary><p class="small">Current-book vendor charges '+productPricingCash(vendor.total)+'/month are included, not additional. Retirement costs staged: '+productPricingCash(policy.retire.length*E.PRODUCT_RETIRE_COST)+' once. These run rates exclude new intake, shared payroll, loan income and one-time development. The complete operating forecast is in Operations.</p></details>';
 $('#productProgramsPanel').innerHTML=head+content+summary;
 if(catalogue)bindProductCatalogue(v,token);
 if(productDeskView==='advertising')bindAdvertisingDesk(v);
 if(productDeskView==='relationships')bindRelationshipOfferDesk(v);
 if(productDeskView==='onboarding')bindOnboardingDesk(v);
 for(const [key] of tabs)$('#product-desk-'+key)?.addEventListener('click',()=>{if(!productContextCurrent(token,false))return;productDeskView=key;productWorkspace.pending=null;renderProductPrograms(currentView());$('#product-desk-'+key)?.focus?.({preventScroll:true});});
}
function productPricingCash(n){return (n<0?'-$':'$')+Math.abs(Math.round(n)).toLocaleString();}
function productPricingReportContent(v){
 const p=v.me,cash=productPricingCash;let content='<h3>Deposit statements</h3><p class="small">Actual settled costs and account movements. These are historical results, not the next plan.</p>';
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

function bindProductPricingDesk(v,token=productContext(v)){
 $('#compareProductPricing')?.addEventListener('click',()=>{
  if(!productContextCurrent(token,false))return;
  try{
   const comparison=E.productPricingComparison(v.me,draft,v.economy,v),cash=productPricingCash;
   $('#productPricingComparison').textContent='Same balances, staged mandate: monthly interest change '+cash(comparison.monthlyInterestChange)+
    '. Operating forecast — keep tariff: '+cash(comparison.keep.profit)+'; staged tariff: '+cash(comparison.staged.profit)+
    '. This forecast includes operating flows but cannot predict rival transfers, future regimes or guaranteed customer growth. '+
    'Existing-book six-month interest (keep / staged): '+comparison.schedule.keep.map((row,i)=>'M'+row.month+' '+cash(row.interest)+' / '+cash(comparison.schedule.staged[i].interest)).join('; ')+
    '. Schedule holds the economy and existing customer book constant except contractual maturities and known departure payouts; no new customers or term subscriptions.';
  }catch(e){$('#productPricingComparison').textContent=e.message;}
 });
}
