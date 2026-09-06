let productDeskView='development',inspectedProductMarket=null;
function stageProductProgramme(v,change,{allowDecommit=false}={}) {
 if(v.me.submitted||!v.me.productPrograms)return false;
 const next=JSON.parse(JSON.stringify(draft));
 try {
  change(next);E.normalizeProductProgramPlan(v.me,next);E.normalizeAdvertisingPlan(v.me,next);if(v.me.relationshipOffers)E.normalizeRelationshipOfferPlan(v.me,next);
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
 const p=v.me,policy=draft.productProgramPolicy,disabled=p.submitted?'disabled':'',cash=n=>'$'+Math.round(n).toLocaleString();
 const preview=JSON.parse(JSON.stringify(p));E.applyProductProgramPolicy(preview,policy);
 const vendor=E.productProgramCosts(preview),book=E.segmentDepositSummary(preview,v);
 const head='<div class="section-head"><div><h2>PRODUCT MANAGEMENT</h2><p class="small muted">Build a delivery platform. Choose who you sell to. Keep the promises already on your books.</p></div><span class="micro">Draft changes settle with both plans</span></div>'+
 '<div class="product-desk-tabs" role="group" aria-label="Product views">'+[['development','Development & retirement'],['targets','Local sales targets'],...(p.advertising?[['advertising','Advertising & attribution']]:[]),...(p.relationshipOffers?[['relationships','Existing customers']]:[])].map(([k,name])=>'<button type="button" class="btn '+(productDeskView===k?'primary':'')+'" data-product-view="'+k+'" aria-pressed="'+(productDeskView===k)+'">'+name+'</button>').join('')+'</div>'+
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
    return '<button type="button" class="product-route '+(picked?'selected':'')+'" data-product-development="'+key+'" '+(disabled||!picked&&!status.eligible?'disabled':'')+'><b>'+(d.route==='build'?'Develop in-house':'License a platform')+'</b><span>'+cash(def.cost)+' · '+def.cycles+' month(s) · '+def.capacity+' execution capacity</span><small>'+esc(reason)+'</small></button>';
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
 $('#productProgramsPanel').innerHTML=head+content+'<p class="micro muted">Run rates hold today’s account balances fixed; they exclude new intake, shared payroll, loan income and one-time development/retirement spend. Use Operations for the complete operating forecast and term-deposit policy. No order is submitted from this page.</p>';
 if(productDeskView==='advertising'&&p.advertising)bindAdvertisingDesk(v);
 if(productDeskView==='relationships'&&p.relationshipOffers)bindRelationshipOfferDesk(v);
 $$('[data-product-view]').forEach(b=>b.addEventListener('click',()=>{productDeskView=b.dataset.productView;renderProductPrograms(v);}));
 $$('[data-product-development]').forEach(b=>b.addEventListener('click',()=>toggleProductDevelopment(v,b.dataset.productDevelopment)));
 $$('[data-product-retire]').forEach(b=>b.addEventListener('click',()=>toggleProductRetirement(v,b.dataset.productRetire)));
 $('#productTargetMarket')?.addEventListener('change',e=>{inspectedProductMarket=e.target.value;renderProductPrograms(v);});
 $$('[data-target-segment]').forEach(input=>input.addEventListener('change',()=>{
  const market=v.territories[inspectedProductMarket]?inspectedProductMarket:draft.focus;
  stageProductProgramme(v,next=>{next.productProgramPolicy.markets[market][input.dataset.targetSegment][input.dataset.targetProduct]=Number(input.value);});
 }));
}
