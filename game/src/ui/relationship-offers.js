function relationshipOfferReason(reason) {
 return {
  disabled: 'Paused by your standing instruction.', closed: 'Target product is closed here; the instruction is paused.',
  'no-households': 'No active households in this market and segment.',
  'no-better-fit': 'No eligible balances would move to a better-fitting product.',
  'no-capacity': 'No whole conversion equivalent fits the assigned Retail time.',
  'cash-reserve': 'Cash or capital protection prevents the conversion expense.',
  'budget-capped': 'Available cash and capital limit this month’s conversions.',
  ready: 'Eligible balances and available capacity support this quote.'
 }[reason] || reason;
}
function relationshipOfferUiLocked(v){return v.me.submitted||v.gameOver||[6,7,8].includes(v.financialGroupVersion)&&(draftOwner!==v.me.id||lastCycle!==v.cycle||gh.active&&gh.paused);}
function relationshipOfferRepairControls(v){
 const p=v.me,policy=draft.relationshipOfferPolicy||p.relationshipOffers.policy,disabled=relationshipOfferUiLocked(v)?'disabled':'';
 const select=(field,label,options)=>'<label for="relationshipOffer-'+field+'">'+label+'<select id="relationshipOffer-'+field+'" '+disabled+'>'+options.map(([value,name])=>'<option value="'+esc(value)+'" '+(String(policy[field])===String(value)?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label>';
 return select('market','Offer market',Object.entries(v.territories).map(([key,t])=>[key,t.name]))+
  select('segment','Existing customer segment',Object.entries(E.CUSTOMER_SEGMENTS).map(([key,s])=>[key,s.name]))+
  select('product','Better-fitting target product',Object.entries(v.productPortfolios.retail.options).map(([key,d])=>[key,d.name]))+
  select('share','Share of Retail sales time',E.RELATIONSHIP_OFFER_SHARES.map(n=>[n,n?n+'% to existing customers':'Paused · 0%']));
}
function relationshipOfferContent(v,productPreview){
 if(![6,7,8].includes(v.financialGroupVersion))return relationshipOfferDeskBody(v,productPreview);
 try{return relationshipOfferDeskBody(v,productPreview,v.gameOver?{owner:v.me,plan:draft,relationshipOffers:null}:E.departmentCustomerPreview(v.me,v,draft));}
 catch(error){
  const last=v.me.relationshipOffers.report;
  return '<section class="relationship-offer-desk"><h3>EXISTING CUSTOMER OFFERS</h3><p class="notice" role="status">Draft quote unavailable: '+esc(error.message)+'</p><div class="relationship-offer-controls">'+relationshipOfferRepairControls(v)+'</div><p class="micro">Pause this offer while repairing shared staffing or budget instructions. No orders were changed. Ready remains blocked until the whole plan is valid.</p>'+(last?'<p class="micro">Last actual · month '+integer(last.cycle)+': '+integer(last.converted)+' converted equivalents; $'+Number(last.cost).toLocaleString()+' conversion expense.</p>':'<p class="micro">No completed offer month yet.</p>')+'</section>';
 }
}
function relationshipOfferDeskBody(v, productPreview, prepared=null) {
 const p = JSON.parse(JSON.stringify(prepared?.owner||productPreview)), policy = prepared?.plan.relationshipOfferPolicy||draft.relationshipOfferPolicy||p.relationshipOffers.policy;
 if(!prepared){
 p.doctrine = typeof p.doctrine === 'object' ? p.doctrine.key : p.doctrine;
 p.allocation = { ...draft.allocation };
 p.policies = { deposit: draft.depositPolicy, lending: draft.lendingPolicy, capital: draft.capitalPolicy };
 p.householdBook.policy = JSON.parse(JSON.stringify(draft.householdPolicy || p.householdBook.policy));
 p.workforce.policy = JSON.parse(JSON.stringify(draft.workforcePolicy || p.workforce.policy));
 E.applyAdvertisingPolicy(p, draft.advertisingPolicy);
 E.applyRelationshipOfferPolicy(p, policy);
 if (p.onboarding) E.applyOnboardingPolicy(p, draft.onboardingPolicy);
 const budget = E.planBudget(p, draft);
 p._workforceReserved = budget.total - (budget.training || 0) - (budget.advertising || 0) - (budget.relationshipOffers || 0) - (budget.onboarding || 0);
 p._relationshipOfferBudget = E.relationshipOfferBudget(p, draft);
 if (p.onboarding) p._onboardingBudget = budget.onboarding || 0;
 }
 const quote = v.gameOver ? null : prepared?prepared.relationshipOffers:E.relationshipOfferReview(p, v, policy), last = v.me.relationshipOffers.report;
 const dollars = n => (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString();
 const signedDollars = n => (n > 0 ? '+' : '') + dollars(n);
 const stat = (label, value, detail = '') => '<div><small>' + label + '</small><b>' + value + '</b>' + (detail ? '<span>' + detail + '</span>' : '') + '</div>';
 const disabled = relationshipOfferUiLocked(v) ? 'disabled' : '';
 const select = (field, label, options) => '<label for="relationshipOffer-' + field + '">' + label + '<select id="relationshipOffer-' + field + '" ' + disabled + '>' + options.map(([value, name, closed]) => '<option value="' + esc(value) + '" ' + (String(policy[field]) === String(value) ? 'selected' : '') + ' ' + (closed ? 'disabled' : '') + '>' + esc(name) + '</option>').join('') + '</select></label>';
 const controls = select('market', 'Offer market', Object.entries(v.territories).map(([key, t]) => [key, t.name])) +
  select('segment', 'Existing customer segment', Object.entries(E.CUSTOMER_SEGMENTS).map(([key, s]) => [key, s.name])) +
  select('product', 'Better-fitting target product', Object.entries(v.productPortfolios.retail.options).map(([key, d]) => [key, d.name + (p.productPrograms.markets[policy.market][policy.segment][key] ? '' : ' · sales closed'), !p.productPrograms.markets[policy.market][policy.segment][key]])) +
  select('share', 'Share of Retail sales time', E.RELATIONSHIP_OFFER_SHARES.map(n => [n, n ? n + '% to existing customers' : 'Paused · 0%']));
 let actual = '<p class="notice">No completed offer month yet. A staged instruction settles with the monthly plan.</p>';
 if (last) {
  const target = esc((v.territories[last.policy.market]?.name || last.policy.market) + ' · ' + (E.CUSTOMER_SEGMENTS[last.policy.segment]?.name || last.policy.segment) + ' · ' + (v.productPortfolios.retail.options[last.policy.product]?.name || last.policy.product));
  actual = '<h3>LAST ACTUAL · MONTH ' + esc(last.cycle) + '</h3><p class="micro">' + target + ' · ' + esc(relationshipOfferReason(last.reason)) + '</p><div class="relationship-offer-summary">' +
   stat('Converted equivalents', integer(last.converted), dollars(last.principal) + ' existing balances switched') +
   stat('Actual conversion expense', dollars(last.cost)) +
   stat('Monthly direct-cost change', signedDollars(last.runRateDelta), 'Same book immediately before / after switching') + '</div>';
 }
 if (v.gameOver) return '<section class="relationship-offer-desk"><h3>EXISTING CUSTOMER OFFERS</h3><p class="notice">Campaign complete. No further offers can be staged.</p>' + customerEffectsContent(v) + actual + '</section>';
 const staffing=prepared?.staffing.relationshipOffers;
 const staffingSummary=quote.staffingVersion===2?
  stat('Bank staff assigned',staffing.physicalAssigned.toFixed(2)+' FTE','Existing shared staff; not new employees')+
  stat('Purchased offer work',staffing.vendorStaff.toFixed(2)+' banker-equivalents','Vendor work is capacity, not headcount')+
  stat('Effective offer throughput',quote.assignedStaff.toFixed(2)+' banker-equivalents',integer(quote.capacity)+' conversion capacity')+
  stat('Remaining Retail sales staff',staffing.physicalSales.toFixed(2)+' FTE',quote.salesStaff.toFixed(2)+' effective bankers after all reservations'):
  stat('Assigned Retail time',quote.assignedStaff.toFixed(2)+' effective bankers',integer(quote.capacity)+' conversion capacity · '+E.onboardingSalesStaff(p,quote.salesStaff).toFixed(2)+' bankers left for new customers');
 return '<section class="relationship-offer-desk"><h3>EXISTING CUSTOMER OFFERS</h3><p class="small muted">Offer an existing customer segment a better-fitting product. This switches eligible balances between products; it does not add multiple-product ownership, households or deposit funds.</p>' +
  '<div class="relationship-offer-controls">' + controls + '</div><p class="micro">Offer-market selection changes only this instruction, not your plan’s focus market. The instruction recurs until revised. Closing or retiring its target pauses it.</p>' +
  '<div class="relationship-offer-summary">' + stat('Eligible existing balances', dollars(quote.eligiblePrincipal), integer(quote.eligibleEquivalents) + ' conversion equivalents') +
  stat('Locked / guaranteed balances excluded', dollars(quote.excludedPrincipal)) +
  staffingSummary + '</div>' +
  '<h3>CURRENT-BOOK QUOTE · MONTH ' + esc(quote.cycle) + '</h3><p class="micro ' + (quote.paused || quote.budgetLimited ? 'warn' : '') + '">' + esc(relationshipOfferReason(quote.reason)) + '</p>' +
  '<div class="relationship-offer-summary">' + stat('Projected conversions', integer(quote.converted), dollars(quote.principal) + ' existing balances switched') +
  stat('Projected conversion expense', dollars(quote.cost), dollars(E.RELATIONSHIP_OFFER_COST) + ' per equivalent · ' + dollars(quote.budget) + ' draft ceiling') +
  stat('Monthly direct-cost change', signedDollars(quote.runRateDelta), 'Positive means more recurring cost') + '</div>' +
  '<p class="micro">'+(quote.staffingVersion===2?'This share reserves Retail time that remains after retention work. Remaining sales capacity shown here is the final figure, with onboarding and all other reservations applied. Vendor fees are already included once in the shared plan, separately from conversion expense. Function allocations, purchased work and expertise raise output without adding employees. ':'Assigned time comes from Retail sales time after the Customers retention reserve. It leaves less time to acquire outside customers. ')+'Existing staffing can process up to ' + integer(E.RELATIONSHIP_OFFER_CAPACITY) + ' equivalents per effective banker, capped at 10% of eligible equivalents each month. Cash and capital limits can reduce or pause conversion expense.</p>' +
  '<details><summary>Capacity, costs and account promises</summary><div class="relationship-offer-summary">' +
  stat('Monthly uptake ceiling', integer(quote.uptakeLimit)) + stat('Requested before funding limits', integer(quote.requested)) + stat('Direct monthly cost · before / after', dollars(quote.directCostBefore) + ' / ' + dollars(quote.directCostAfter)) + '</div>' +
  '<p class="micro">A conversion equivalent is an aggregate balance measure, not an identified individual household. Locked deposits and outstanding rate guarantees are excluded. Target terms begin when conversion settles; existing deposit totals stay unchanged.</p>' +
  '<p class="micro muted">Direct cost is deposit interest plus servicing minus fees across the same bank book. It excludes shared payroll, loan income and the one-time conversion expense. A better customer fit can cost the bank more to provide. The quote uses today’s balances and draft policies before retention, maturities, repricing and other monthly events; actual results may differ.</p></details>' + customerEffectsContent(v) + actual + '</section>';
}
function relationshipOfferViewStamp(v){return JSON.stringify([v.version,v.cycle,v.resolutionId,v.gameOver,v.me,draft]);}
function stageRelationshipOffer(v, field, value, sourceKey=relationshipOfferViewStamp(v),campaign=game||view) {
 if (!draft || v.me.submitted || v.gameOver || !v.me.relationshipOffers || !['market', 'segment', 'product', 'share'].includes(field)) return false;
 if([6,7,8].includes(v.financialGroupVersion)){
  const live=currentView();
  if(!live||campaign!==(game||view)||live.me.id!==v.me.id||live.me.submitted||live.gameOver||draftOwner!==live.me.id||lastCycle!==live.cycle||gh.active&&gh.paused||sourceKey!==relationshipOfferViewStamp(live))return false;
  try{
   const next=JSON.parse(JSON.stringify(draft));next.relationshipOfferPolicy={...(next.relationshipOfferPolicy||live.me.relationshipOffers.policy),[field]:field==='share'?Number(value):value};
   E.normalizeProductProgramPlan(live.me,next);E.normalizeAdvertisingPlan(live.me,next);E.normalizeRelationshipOfferPlan(live.me,next);if(live.me.onboarding)E.normalizeOnboardingPlan(live.me,next);
   const pauseRepair=field==='share'&&next.relationshipOfferPolicy.share===0&&(draft.relationshipOfferPolicy||live.me.relationshipOffers.policy).share>0;
   if(!pauseRepair){const status=E.projectPlanStatus(live.me,next);if(!status.eligible)throw Error(status.reason);E.departmentCustomerPreview(live.me,live,next);}
   const fresh=currentView();if(!fresh||fresh.me.submitted||fresh.gameOver||campaign!==(game||view)||sourceKey!==relationshipOfferViewStamp(fresh))return false;
   draft=next;renderProducts(fresh);renderProjects(fresh);renderReady(fresh);return true;
  }catch(error){toast(error.message);const fresh=currentView();if(fresh?.me.id===v.me.id)renderProductPrograms(fresh);return false;}
 }
 return stageProductProgramme(v, next => {
  next.relationshipOfferPolicy = { ...(next.relationshipOfferPolicy || v.me.relationshipOffers.policy), [field]: field === 'share' ? Number(value) : value };
 }, { allowDecommit: next => E.relationshipOfferBudget(v.me, next) <= E.relationshipOfferBudget(v.me, draft) });
}
function bindRelationshipOfferDesk(v) {
 bindCustomerEffects(v);
 const sourceKey=relationshipOfferViewStamp(v),campaign=game||view;
 for (const field of ['market', 'segment', 'product', 'share']) $('#relationshipOffer-' + field)?.addEventListener('change', event => {
  stageRelationshipOffer(v, field, event.target.value,sourceKey,campaign);
 });
}
