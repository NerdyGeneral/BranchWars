// Market-owned presentation. The same live office editors and shared draft are
// used here and in the bank-wide comparison; no second plan or pricing model.
function marketOfficeContext(v,desk){
 if(typeof marketWorkspace==='undefined'||marketWorkspace.owner!==v.me.id||marketWorkspace.mode!=='office'||marketWorkspace.desk!==desk)return null;
 return v.me.facilityNetwork?.offices.find(o=>o.id===marketWorkspace.office&&o.market===marketWorkspace.market&&o.closedCycle===null)||null;
}
function marketSaveOfficeForm(v){
 if(typeof lifecycleCaptureForm==='function')lifecycleCaptureForm(v);
}
function restoreMarketPanels(){
 if(typeof placeSubjectPanel!=='function')return;
 for(const id of ['facilityLifecyclePanel','facilityNetworkPanel'])placeSubjectPanel(id,null);
}
function mountMarketPanels(v){
 const services=marketOfficeContext(v,'services'),life=marketOfficeContext(v,'staff')||services,network=marketOfficeContext(v,'convert'),compare=marketWorkspace.mode==='compare';
 for(const [id,active] of [['facilityLifecyclePanel',life],['facilityNetworkPanel',network||compare]]){
  const el=$('#'+id);if(!el)continue;
  if(typeof placeSubjectPanel==='function')placeSubjectPanel(id,active?'marketOfficeEditorMount':null);
  el.classList.toggle('hidden',!active);
  if(id==='facilityLifecyclePanel')el.classList.toggle('market-office-services',!!services);
 }
 if(life)renderFacilityLifecycle(v);
 else if(network||compare)renderFacilityNetwork(v);
}
function showMarketOverview(v){if(typeof expandedInterfaceEnabled==='function'&&expandedInterfaceEnabled(v))return interfaceMarketsGo('overview',{market:inspectedMarket(v)});marketSaveOfficeForm(v);marketWorkspace.mode='overview';marketWorkspace.pending=null;renderMarketInspector(v);focusWorkspaceTarget($('#inspectedMarketName'));}
function openMarketConstruction(v,market=inspectedMarket(v)){
 if(typeof expandedInterfaceEnabled==='function'&&expandedInterfaceEnabled(v))return interfaceMarketsGo('build',{market});
 const now=currentView();if(!now||now.me.id!==v.me.id||now.cycle!==v.cycle||!now.territories[market])return false;
 marketSaveOfficeForm(now);marketWorkspace.owner=now.me.id;marketWorkspace.market=market;marketWorkspace.mode='build';marketWorkspace.pending=null;
 // Selecting the destination is inspection only. The engine decides whether
 // these saved campaign rules require an explicit focus change at staging.
 if(workspaceTab!=='markets')setWorkspaceTab('markets',now);else renderMarkets(now);
 focusWorkspaceTarget($('#marketConstructionHeading'));return true;
}
function reviewMarketConstruction(v,market,key){
 if(typeof expandedInterfaceEnabled==='function'&&expandedInterfaceEnabled(v))return interfaceMarketsGo(Object.values(INTERFACE_OFFICE_PROJECTS).includes(key)?'build':'improve',{market,project:key});
 const token=marketActionToken(v);if(!marketActionCurrent(token))return false;
 const proposal=marketActionProposal(currentView(),market,key);
 if(!proposal.status.eligible){toast(proposal.status.reason);return false;}
 marketWorkspace.mode='build';marketWorkspace.pending={token,market,key,proposal};renderMarketInspector(currentView());
 focusWorkspaceTarget($('#confirmMarketAction'));return true;
}
function marketPresenceMarkup(v,market){
 const p=v.me,t=v.territories[market],offices=(p.facilityNetwork?.offices||[]).filter(o=>o.market===market&&o.closedCycle===null);
 const rows=offices.map(o=>{
  const r=p.facilityLifecycle?.records[o.id],quarters=r?Object.values(r.staffQuarters).reduce((a,b)=>a+b,0):null;
  let contribution='';try{const m=E.facilityOfficeMetrics(p,o,draft);contribution='<span class="micro">'+money(m.expense)+' upkeep / month · '+money(m.depositCapacity)+' deposit capacity · '+money(m.loanCapacity)+' loan capacity</span>';}catch(error){contribution='<span class="micro">Contribution unavailable: '+esc(error.message)+'</span>';}
  return '<li><button type="button" class="market-presence-office" data-market-office="'+esc(o.id)+'" data-office-desk="'+(r?'staff':'convert')+'"><span><b>'+esc(facilityUiModel(o.model))+'</b><span class="micro">'+esc(facilityUiOfficeLabel(o))+(r?' · '+(r.conditionBp/100).toFixed(0)+'% condition':'')+(o.conversion?' · converting':'')+'</span>'+(r?'<span class="micro">Monthly staff time: '+lifecycleStaffTime(quarters)+'</span>':'')+contribution+'</span><span aria-hidden="true">→</span></button></li>';
 }).join('');
 return '<section class="market-presence"><h4>Your presence in '+esc(t.name)+'</h4>'+(rows?'<ul class="market-office-list">'+rows+'</ul>':'<p class="small muted">'+(t.branches[0]?'This campaign manages '+integer(t.branches[0])+' local facilities by market.':'No operating offices here yet.')+'</p>')+
  '<button type="button" class="btn" id="buildInMarket">＋ Build here</button>'+
  (offices.length?'<p class="micro muted">Capacity supports customer activity; it is not office profit.</p>':'')+'</section>';
}
function marketConstructionMarkup(v,market){
 const p=v.me,catalog=E.projectCatalog({...p,focus:market},v),actions=Object.entries(catalog).filter(([,d])=>d.target&&!d.legacy&&!d.strategy&&!d.serviceOnly&&!d.programOnly&&(!d.regionalOnly||p.regionalOperations));
 const pending=marketWorkspace.pending;
 return '<section id="marketConstruction"><h4 id="marketConstructionHeading" tabindex="-1">Build &amp; improve '+esc(v.territories[market].name)+'</h4><p class="small">Review a local project, then stage it in your monthly plan.</p>'+
  (pending?'<section class="market-action-confirm" role="group" aria-label="Confirm market instruction"><h4>Review the whole change</h4><ul>'+pending.proposal.effects.map(effect=>'<li>'+esc(effect)+'</li>').join('')+'</ul>'+(!pending.proposal.status.eligible?'<p class="notice bad">'+esc(pending.proposal.status.reason)+'</p>':'')+'<button type="button" class="btn primary" id="confirmMarketAction"'+(!pending.proposal.status.eligible?' disabled':'')+'>Stage construction</button> <button type="button" class="btn" id="cancelMarketAction">Keep editing</button></section>':'')+
  '<div class="market-local-projects">'+actions.map(([key,d])=>{
   const proposal=marketActionProposal(v,market,key),picked=E.planInitiatives(draft).includes(key)&&E.projectPlanTarget(draft,key)===market,terms=E.projectStartTerms(v,p,key,market);
   return '<article><h4>'+esc(d.name)+'</h4><div class="micro"><b>'+money(terms.cost)+'</b> one time · '+d.cycles+' base work units · '+(d.capacity||1.5)+' execution</div>'+projectEntryPriceNote(v,key,market)+'<p class="small">'+esc(d.desc)+'</p>'+renderProjectEffect(p,key,market)+'<button type="button" class="btn" data-local-project="'+key+'"'+(!proposal.status.eligible?' disabled':'')+'>'+(picked?'Review removal':'Review project')+'</button>'+(!proposal.status.eligible?'<p class="micro" role="status">'+esc(proposal.status.reason)+'</p>':'')+'</article>';
  }).join('')+'</div><p class="micro muted">Work units are not a guaranteed opening date. Staff, ongoing upkeep and shared execution remain separate commitments.</p></section>';
}
function renderMarketInspector(v){
 if(typeof expandedInterfaceEnabled==='function'&&expandedInterfaceEnabled(v)){
  const route=interfaceCurrentRoute();if(route.workspace==='markets')renderInterfaceMarkets(v,route,$('#interfaceMarkets'));return;
 }
 const mount=$('#marketInspector');if(!mount||!draft)return;
 const market=inspectedMarket(v),t=v.territories[market],p=v.me,token=marketActionToken(v),locked=p.submitted||v.gameOver;
 const local=p.marketBook?.markets[market],state=!t.unlocked?'Opens month '+t.unlock:t.exited?.[0]?'Withdrawn · review paid re-entry':draft.focus===market?'Current monthly focus':'Inspection only · your plan is unchanged';
 marketSaveOfficeForm(v);restoreMarketPanels();mount.dataset.inspectedMarket=market;
 const mode=marketWorkspace.mode||'overview',office=(p.facilityNetwork?.offices||[]).find(o=>o.id===marketWorkspace.office&&o.market===market&&o.closedCycle===null);
 if(mode==='office'&&!office)marketWorkspace.mode='overview';
 const isOffice=marketWorkspace.mode==='office',isBuild=marketWorkspace.mode==='build',isCompare=marketWorkspace.mode==='compare';
 let body;
 if(isOffice||isCompare)body=(isOffice?'<div class="market-office-toolbar"><b>'+esc(facilityUiModel(office.model))+'</b><div class="object-action-strip">'+(p.facilityLifecycle?'<button type="button" class="btn" data-market-office="'+esc(office.id)+'" data-office-desk="staff" aria-pressed="'+(marketWorkspace.desk==='staff')+'">Staff &amp; maintenance</button>':'')+(p.facilityExtensions||p.sharedPremises?'<button type="button" class="btn" data-market-office="'+esc(office.id)+'" data-office-desk="services" aria-pressed="'+(marketWorkspace.desk==='services')+'">Expand &amp; services</button>':'')+'<button type="button" class="btn" data-market-office="'+esc(office.id)+'" data-office-desk="convert" aria-pressed="'+(marketWorkspace.desk==='convert')+'">Convert office</button></div></div>':'<h4>Compare all offices</h4>')+'<div id="marketOfficeEditorMount"></div>';
 else if(isBuild)body=marketConstructionMarkup(v,market);
 else body='<section><h4>Market conditions</h4><dl class="market-local-metrics"><div><dt>Your influence</dt><dd>'+t.shares[0].toFixed(1)+'%</dd></div><div><dt>Rival influence</dt><dd>'+t.shares[1].toFixed(1)+'%</dd></div><div><dt>Rival facilities</dt><dd>'+integer(t.branches[1])+'</dd></div><div><dt>Market value</dt><dd>'+integer(t.value)+'</dd></div>'+(local?'<div><dt>Your deposits</dt><dd>'+money(local.deposits)+'</dd></div><div><dt>Your loans</dt><dd>'+money(local.loans)+'</dd></div>':'')+'</dl><p class="micro muted">Influence and deposit ownership are different measures.</p><button type="button" class="btn" id="useMarketFocus"'+(locked||!t.unlocked||draft.focus===market?' disabled':'')+'>Use as monthly focus</button></section>'+marketPresenceMarkup(v,market)+
  (p.advertising?'<section><h4>Local customer acquisition</h4><button type="button" class="btn" id="openMarketAdvertising">Manage local campaign</button></section>':'')+
  (p.householdBook&&v.serviceAgreements?'<section><h4>Local business opportunities</h4>'+v.serviceAgreements.filter(c=>c.market===market&&!c.companyClosed).map(c=>'<button type="button" class="btn" data-market-client="'+esc(c.id)+'">'+esc(serviceClientPresentation(v,c).name)+' · '+esc(E.SERVICE_TYPES[c.kind].name)+'</button>').join('')+'</section>':'');
 const orders=E.planInitiatives(draft).filter(key=>E.PROJECTS[key]?.target),focusPending=marketWorkspace.pending&&!isBuild?marketWorkspace.pending:null;
 mount.innerHTML='<header class="market-context-heading"><div><span class="micro">SELECTED MARKET</span><h3 id="inspectedMarketName" tabindex="-1">'+esc(t.name)+'</h3></div>'+(mode==='overview'?'<button type="button" class="btn" id="compareMarketOffices">Compare offices</button>':'<button type="button" class="btn" id="returnMarketOverview">← Your presence</button>')+'</header><p class="small market-context-status" role="status">'+esc(locked?'Planning is locked. You can still inspect this market.':state)+'</p>'+
  (focusPending?'<section class="market-action-confirm"><h4>Review market instruction</h4><ul>'+focusPending.proposal.effects.map(effect=>'<li>'+esc(effect)+'</li>').join('')+'</ul><button type="button" class="btn primary" id="confirmMarketAction"'+(!focusPending.proposal.status.eligible?' disabled':'')+'>Confirm changes</button> <button type="button" class="btn" id="cancelMarketAction">Keep current plan</button></section>':'')+body+
  (orders.length?'<section class="staged-market-orders"><h4>Local orders this month</h4><ul>'+orders.map(key=>'<li>'+esc(E.PROJECTS[key].name)+' · <b>'+esc(v.territories[E.projectPlanTarget(draft,key)].name)+'</b></li>').join('')+'</ul></section>':'');
 const current=()=>marketActionCurrent(token,false)&&marketWorkspace.market===market;
 $('#useMarketFocus')?.addEventListener('click',()=>{if(current())requestMarketAction(v,market);});
 $('#buildInMarket')?.addEventListener('click',()=>{if(current())openMarketConstruction(v,market);});
 $('#returnMarketOverview')?.addEventListener('click',()=>{if(current())showMarketOverview(currentView());});
 $('#compareMarketOffices')?.addEventListener('click',()=>{if(current()){marketWorkspace.mode='compare';renderMarketInspector(currentView());}});
 $$('[data-local-project]').forEach(button=>button.addEventListener('click',()=>{if(current())reviewMarketConstruction(v,market,button.dataset.localProject);}));
 $$('[data-market-office]').forEach(button=>button.addEventListener('click',()=>{if(current())openMarketOffice(v,button.dataset.marketOffice,button.dataset.officeDesk);}));
 $('#confirmMarketAction')?.addEventListener('click',()=>{if(current())confirmMarketAction();});
 $('#cancelMarketAction')?.addEventListener('click',()=>{if(current())cancelMarketAction();});
 $('#openMarketAdvertising')?.addEventListener('click',()=>{if(current()){marketWorkspace.advertisingOpen=true;renderMarketAdvertising(currentView());focusWorkspaceTarget($('#marketCampaignHeading'));}});
 $$('[data-market-client]').forEach(button=>button.addEventListener('click',()=>{if(current())inspectServiceAgreement(currentView(),button.dataset.marketClient);}));
 mountMarketPanels(v);renderMarketAdvertising(v);
}
