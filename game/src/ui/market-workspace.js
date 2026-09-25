// Inspection is owner-local UI state, never a saved rule or monthly instruction.
let marketWorkspace={owner:null,market:null,pending:null,advertisingOpen:false,advertisingPending:null};
function resetMarketWorkspace(v){marketWorkspace={owner:v.me.id,market:v.me.focus,pending:null,advertisingOpen:false,advertisingPending:null};}
function inspectedMarket(v){
 if(marketWorkspace.owner!==v.me.id)resetMarketWorkspace(v);
 if(!v.territories[marketWorkspace.market])marketWorkspace.market=draft.focus||Object.keys(v.territories)[0];
 return marketWorkspace.market;
}
function marketActionToken(v){return {owner:v.me.id,cycle:v.cycle,campaign:game||view,signature:JSON.stringify(draft)};}
function marketActionCurrent(token,editable=true){
 const now=currentView();return !!(now&&draft&&(game||view)===token.campaign&&now.me.id===token.owner&&now.cycle===token.cycle&&
  draftOwner===token.owner&&lastCycle===token.cycle&&(!editable||(!now.me.submitted&&!now.gameOver)));
}
function inspectMarket(v,key){
 const now=currentView();if(!now||now.me.id!==v.me.id||now.cycle!==v.cycle||!now.territories[key])return false;
 if(now.me.facilityLifecycle&&lifecycleUi.owner===now.me.id&&lifecycleUi.cycle===now.cycle&&lifecycleUi.signature===JSON.stringify(draft)&&lifecycleUi.form&&$('#lifecycleStaff-service'))lifecycleUi.form=lifecycleReadForm();
 marketWorkspace.owner=now.me.id;marketWorkspace.market=key;marketWorkspace.pending=null;marketWorkspace.advertisingPending=null;
 renderMarkets(now);$('button[data-market="'+key+'"]')?.focus?.({preventScroll:true});return true;
}
function marketFocusEffects(v,nextFocus,plan=draft){
 if(plan.focus===nextFocus)return [];
 const before=v.territories[plan.focus]?.name||'the previous market',after=v.territories[nextFocus]?.name||nextFocus;
 const effects=['Monthly focus changes from '+before+' to '+after+'; ordinary focus-dependent activity follows it.'];
 for(const key of E.planInitiatives(plan))if(E.PROJECTS[key]?.target)effects.push(plan.projectTargets?.[key]?E.PROJECTS[key].name+' stays in '+v.territories[plan.projectTargets[key]].name+'.':E.PROJECTS[key].name+' (staged) moves to '+after+'.');
 if(plan.competitiveAction&&plan.competitiveAction!=='none')effects.push((v.competitiveActions?.[plan.competitiveAction]?.name||'Competitive action')+' will target '+after+'.');
 effects.push('Existing construction, office orders and the separately targeted advertising campaign do not move.');
 return effects;
}
function marketActionProposal(v,market,key=null,plan=draft){
 const reject=reason=>({status:{eligible:false,reason},effects:[]});
 if(!plan||v.me.submitted||v.gameOver)return reject('Planning is locked. You can still inspect this market.');
 if(!v.territories[market]?.unlocked)return reject('This market opens in month '+(v.territories[market]?.unlock||'?')+'.');
 const issue=E.projectTargetIssue(v,v.me,{target:true},market);if(issue)return reject(issue);
 if(key&&(!E.PROJECTS[key]?.target||!E.projectCatalog(v.me,v)[key]))return reject('This is not an available local initiative.');
 const chosen=E.planInitiatives(plan);
 if(key&&chosen.includes(key)&&E.projectPlanTarget(plan,key)!==market)return reject('This initiative is already staged in '+v.territories[E.projectPlanTarget(plan,key)]?.name+'. Inspect that market to remove it. Other initiative types can be staged here.');
 const independent=v.financialGroupVersion===10&&!!key;
 const effects=independent?['This construction order keeps its own location. Monthly focus and other orders are unchanged.']:marketFocusEffects(v,market,plan),next=JSON.parse(JSON.stringify(plan));if(!independent)next.focus=market;
 let candidate=next,status;
 if(key){const result=initiativeCandidate(v,key,next,market);status=result.status;candidate=result.candidate;if(!status.eligible)return {status,effects};}
 // Recheck every staged target, not just the newly selected project.
 for(const staged of E.planInitiatives(candidate)){
  const target=E.projectTargetIssue(v,v.me,E.PROJECTS[staged],E.projectPlanTarget(candidate,staged));if(target)return reject(target);
 }
 const removing=key&&chosen.includes(key);
 // Removing an instruction remains possible when some other instruction is invalid.
 status=removing?{eligible:true,reason:''}:E.projectPlanStatus(v.me,candidate,v);
 if(!status.eligible)return {status,effects};
 if(plan.capitalAction&&!candidate.capitalAction)effects.push('The staged emergency board-capital request will be removed because it cannot accompany expansion.');
 if(key)effects.push((removing?'Remove ':'Stage ')+E.PROJECTS[key].name+' in '+v.territories[market].name+
  (removing?'.':' for $'+E.projectStartTerms(v,v.me,key,market).cost.toLocaleString()+' one time.'));
 if(status.quote)effects.push('Resulting whole-plan commitments: $'+status.quote.total.toLocaleString()+'. This is planned spending, not a payment or turn submission.');
 return {status,candidate,effects,needsConfirmation:(!independent&&plan.focus!==market)||!!(plan.capitalAction&&!candidate.capitalAction)};
}
function requestMarketAction(v,market,key=null){
 const token=marketActionToken(v);if(!marketActionCurrent(token))return false;
 const now=currentView(),proposal=marketActionProposal(now,market,key);
 if(!proposal.status.eligible){toast(proposal.status.reason);return false;}
 if(proposal.needsConfirmation){
  marketWorkspace.pending={token,market,key,proposal};renderMarketInspector(now);$('#confirmMarketAction')?.focus();return true;
 }
 draft=proposal.candidate;marketWorkspace.pending=null;refreshMarketActions(now);restoreMarketActionFocus(key);return true;
}
function confirmMarketAction(){
 const pending=marketWorkspace.pending;if(!pending)return false;
 if(!marketActionCurrent(pending.token)){marketWorkspace.pending=null;toast('The bank, month or connection changed. Review the current market again.');return false;}
 const now=currentView(),proposal=marketActionProposal(now,pending.market,pending.key);
 if(pending.token.signature!==JSON.stringify(draft)){
  marketWorkspace.pending={...pending,token:marketActionToken(now),proposal};renderMarketInspector(now);
  toast('Your plan changed. Review the refreshed effects and confirm again.');return false;
 }
 if(!proposal.status.eligible){marketWorkspace.pending=null;renderMarketInspector(now);toast(proposal.status.reason);return false;}
 draft=proposal.candidate;marketWorkspace.pending=null;refreshMarketActions(now);restoreMarketActionFocus(pending.key);return true;
}
function restoreMarketActionFocus(key){
 const target=key?$('button[data-local-project="'+key+'"]'):$('#inspectedMarketName');
 target?.focus?.({preventScroll:true});
 // The inspector may scroll independently. Keeping focus without revealing its
 // new node leaves keyboard users below the clipped panel after a re-render.
 target?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});
}
function cancelMarketAction(){const key=marketWorkspace.pending?.key;marketWorkspace.pending=null;const v=currentView();if(v)renderMarketInspector(v);restoreMarketActionFocus(key);}
function refreshMarketActions(v){renderMarkets(v);renderProjects(v);renderReady(v);}
function openMarketOffice(v,id,desk){
 const now=currentView(),office=now?.me?.facilityNetwork?.offices.find(o=>o.id===id&&o.closedCycle===null);
 if(!office||now.me.id!==v.me.id||now.cycle!==v.cycle)return false;
 marketWorkspace.market=office.market;marketWorkspace.owner=now.me.id;
 if(desk==='staff'&&now.me.facilityLifecycle){
  // Preserve edits at the previous office before moving the same editor.
  if(lifecycleUi.owner===now.me.id&&lifecycleUi.cycle===now.cycle&&lifecycleUi.form&&$('#lifecycleStaff-service'))lifecycleUi.form=lifecycleReadForm();
  lifecycleUi.office=id;lifecycleUi.open=true;renderFacilityLifecycle(now);
  focusWorkspaceTarget($('#officeDetailTitle'));
 }else{
  facilityNetworkSelection={...facilityNetworkSelection,owner:now.me.id,office:id,model:null,open:true};
  renderFacilityNetwork(now);focusWorkspaceTarget($('#facilityDestination')||$('#facilityNetworkDesk'));
 }
 return true;
}
function renderMarketInspector(v){
 const mount=$('#marketInspector');if(!mount||!draft)return;
 const market=inspectedMarket(v),t=v.territories[market],p=v.me,token=marketActionToken(v),locked=p.submitted||v.gameOver;
 const local=p.marketBook?.markets[market],offices=(p.facilityNetwork?.offices||[]).filter(o=>o.market===market&&o.closedCycle===null);
 const state=!t.unlocked?'Opens month '+t.unlock:t.exited?.[0]?'Withdrawn · review paid re-entry':draft.focus===market?'Current monthly focus':'Inspection only · your plan is unchanged';
 const catalog=E.projectCatalog({...p,focus:market},v),actions=Object.entries(catalog).filter(([,d])=>d.target&&!d.legacy&&!d.strategy&&!d.serviceOnly&&!d.programOnly&&(!d.regionalOnly||p.regionalOperations));
 const pending=marketWorkspace.pending,constructionOpen=mount.dataset.inspectedMarket===market&&!!$('#marketConstruction')?.open;
 // Do not use data-market here: that belongs exclusively to map buttons.
 mount.dataset.inspectedMarket=market;
 const rows=offices.map(o=>{const record=p.facilityLifecycle?.records[o.id];return '<li><div><b>'+esc(facilityUiModel(o.model))+'</b><span class="micro">'+esc(facilityUiOfficeLabel(o))+(record?' · condition '+(record.conditionBp/100).toFixed(1)+'%':'')+(o.conversion?' · converting':'')+'</span></div><div class="market-office-actions">'+(record?'<button type="button" class="btn" data-market-office="'+esc(o.id)+'" data-office-desk="staff">Staff &amp; maintain</button>':'')+'<button type="button" class="btn" data-market-office="'+esc(o.id)+'" data-office-desk="convert">Convert</button></div></li>';}).join('');
 mount.innerHTML='<header><span class="micro">MARKET INSPECTOR</span><h3 id="inspectedMarketName" tabindex="-1">'+esc(t.name)+'</h3><p class="small" role="status">'+esc(state)+'</p></header>'+
  '<label class="micro" for="marketInspectorSelect">Inspect another market</label><select id="marketInspectorSelect">'+Object.entries(v.territories).map(([key,entry])=>'<option value="'+key+'"'+(key===market?' selected':'')+'>'+esc(entry.name)+'</option>').join('')+'</select>'+
  '<dl class="market-local-metrics"><div><dt>Your influence</dt><dd>'+t.shares[0].toFixed(1)+'%</dd></div><div><dt>Rival influence</dt><dd>'+t.shares[1].toFixed(1)+'%</dd></div>'+(local?'<div><dt>Your local deposits</dt><dd>'+money(local.deposits)+'</dd></div><div><dt>Your local loans</dt><dd>'+money(local.loans)+'</dd></div>':'')+'</dl><p class="micro muted">Influence and deposit ownership are different measures.</p>'+
  '<button type="button" class="btn" id="useMarketFocus"'+(locked||!t.unlocked||draft.focus===market?' disabled':'')+'>Use as monthly focus</button>'+
  '<p class="micro market-construction-guidance">'+(v.financialGroupVersion===10?'Build across markets: stage an office here, then inspect another market and stage a different office type. Each order keeps its location; monthly focus does not move it. All orders share your cash and execution capacity.':'These saved rules tie new local projects to monthly focus. For independent construction across markets, start a new Expanded campaign; existing campaigns keep their original rules.')+'</p>'+
  (v.financialGroupVersion===10&&E.planInitiatives(draft).some(key=>E.PROJECTS[key]?.target)?'<section class="staged-market-orders"><h4>Local orders this month</h4><ul>'+E.planInitiatives(draft).filter(key=>E.PROJECTS[key]?.target).map(key=>'<li>'+esc(E.PROJECTS[key].name)+' · <b>'+esc(v.territories[E.projectPlanTarget(draft,key)].name)+'</b></li>').join('')+'</ul><p class="micro muted">Each order keeps its location. One initiative of each type per month; one office job per market. Cash and execution capacity are shared across all locations.</p></section>':'')+
  (pending?'<section class="market-action-confirm" role="group" aria-label="Confirm market instruction"><h4>Review the whole change</h4><ul>'+pending.proposal.effects.map(effect=>'<li>'+esc(effect)+'</li>').join('')+'</ul>'+(!pending.proposal.status.eligible?'<p class="notice bad">'+esc(pending.proposal.status.reason)+'</p>':'')+'<button type="button" class="btn primary" id="confirmMarketAction"'+(!pending.proposal.status.eligible?' disabled':'')+'>Confirm changes</button> <button type="button" class="btn" id="cancelMarketAction">Cancel</button></section>':'')+
  '<section><h4>Your offices · '+(p.facilityNetwork?offices.length:t.branches[0])+'</h4>'+(rows?'<ul class="market-office-list">'+rows+'</ul>':'<p class="small muted">'+(t.branches[0]?'This campaign manages facilities by market. Local upgrades are listed below.':'No operating office here. Compare funded construction below.')+'</p>')+'</section>'+
  '<details id="marketConstruction"'+(constructionOpen?' open':'')+'><summary>Build &amp; improve this market · '+actions.length+' options</summary><p class="micro">One-time project costs below. Staff, recurring upkeep and execution capacity remain separate commitments. Prices and the entire plan are checked before staging.</p><div class="market-local-projects">'+actions.map(([key,d])=>{
   const proposal=marketActionProposal(v,market,key),picked=E.planInitiatives(draft).includes(key)&&E.projectPlanTarget(draft,key)===market;
   return '<article><button type="button" class="btn" data-local-project="'+key+'"'+(!proposal.status.eligible?' disabled':'')+'>'+esc((picked?'Remove staged: ':'Stage: ')+d.name)+'</button><div class="micro"><b>'+money(d.cost)+'</b> one-time · '+d.cycles+' base work units · '+(d.capacity||1.5)+' execution</div>'+projectEntryPriceNote(v,key,market)+'<p class="micro">'+esc(proposal.status.eligible?d.desc:proposal.status.reason)+'</p>'+renderProjectEffect(p,key,market)+'</article>';
  }).join('')+'</div></details>'+
  (p.advertising?'<section><h4>Local customer acquisition</h4><p class="micro">One standing campaign per bank. Inspect its real target, recurring cost and application capacity here.</p><button type="button" class="btn" id="openMarketAdvertising">Manage local campaign</button></section>':'')+
  (p.householdBook&&v.serviceAgreements?'<section><h4>Local business relationships</h4><p class="micro">Inspect this market’s clients in Customers. Looking does not change monthly focus or place a bid.</p>'+v.serviceAgreements.filter(c=>c.market===market&&!c.companyClosed).map(c=>'<button type="button" class="btn" data-market-client="'+esc(c.id)+'">'+esc(serviceClientPresentation(v,c).name)+' · '+esc(E.SERVICE_TYPES[c.kind].name)+'</button>').join('')+'</section>':'')+
  '<p class="micro muted">Staging changes only your monthly plan. Nothing is built, paid or submitted by inspecting this market.</p>';
 const current=()=>marketActionCurrent(token,false)&&marketWorkspace.market===market;
 $('#marketInspectorSelect')?.addEventListener('change',()=>{if(current()){inspectMarket(v,$('#marketInspectorSelect').value);$('#marketInspectorSelect')?.focus();}});
 $('#useMarketFocus')?.addEventListener('click',()=>{if(current())requestMarketAction(v,market);});
 $$('[data-local-project]').forEach(button=>button.addEventListener('click',()=>{if(current())requestMarketAction(v,market,button.dataset.localProject);}));
 $$('[data-market-office]').forEach(button=>button.addEventListener('click',()=>{if(current())openMarketOffice(v,button.dataset.marketOffice,button.dataset.officeDesk);}));
 $('#confirmMarketAction')?.addEventListener('click',()=>{if(current())confirmMarketAction();});
 $('#cancelMarketAction')?.addEventListener('click',()=>{if(current())cancelMarketAction();});
 $('#openMarketAdvertising')?.addEventListener('click',()=>{if(current()){marketWorkspace.advertisingOpen=true;renderMarketAdvertising(currentView());focusWorkspaceTarget($('#marketCampaignHeading'));}});
 $$('[data-market-client]').forEach(button=>button.addEventListener('click',()=>{if(current())inspectServiceAgreement(currentView(),button.dataset.marketClient);}));
 renderMarketAdvertising(v);
}

function requestMarketAdvertisingTarget(v){
 const market=inspectedMarket(v),token=marketActionToken(v);if(!marketActionCurrent(token))return false;
 try{advertisingChangeProposal(v,draft,'market',market);}
 catch(error){toast(error.message);return false;}
 marketWorkspace.advertisingPending={market,token};renderMarketAdvertising(v);$('#confirmMarketAdvertising')?.focus();return true;
}
function confirmMarketAdvertisingTarget(){
 const pending=marketWorkspace.advertisingPending;if(!pending||!marketActionCurrent(pending.token))return false;
 const v=currentView();
 if(pending.market!==inspectedMarket(v)){marketWorkspace.advertisingPending=null;return false;}
 if(pending.token.signature!==JSON.stringify(draft)){
  pending.token=marketActionToken(v);renderMarketAdvertising(v);toast('The plan changed. Review the campaign target and budget again.');return false;
 }
 if(!applyAdvertisingChange(v,'market',pending.market))return false;
 marketWorkspace.advertisingPending=null;renderMarketAdvertising(v);renderReady(v);focusWorkspaceTarget($('#market-advertising-market'));return true;
}
function renderMarketAdvertising(v){
 const mount=$('#marketCampaignPanel');if(!mount)return;
 const visible=!!v.me.advertising&&marketWorkspace.advertisingOpen&&marketWorkspace.owner===v.me.id;
 mount.classList.toggle('hidden',!visible);if(!visible){mount.innerHTML='';return;}
 const market=inspectedMarket(v),q=draft.advertisingPolicy,locked=v.me.submitted||v.gameOver,token=marketActionToken(v),pending=marketWorkspace.advertisingPending;
 const context='<div class="section-head"><div><h3 id="marketCampaignHeading" tabindex="-1">Customer campaign · '+esc(v.territories[market].name)+'</h3><p class="small">Inspecting this market does not move your campaign. Draft target: <b>'+esc(v.territories[q.market].name)+'</b>.</p></div><button type="button" class="btn" id="closeMarketAdvertising">Close campaign desk</button></div>'+
  (market!==q.market?'<button type="button" class="btn" id="targetInspectedMarket"'+(locked?' disabled':'')+'>Review moving campaign to '+esc(v.territories[market].name)+'</button>':'')+
  (pending?'<section class="market-action-confirm" role="group" aria-label="Confirm advertising target"><h4>Replace the one bank-wide campaign target?</h4><p>Move the draft campaign from '+esc(v.territories[q.market].name)+' to '+esc(v.territories[market].name)+'. Keep its $'+q.budget.toLocaleString()+' monthly budget; a closed offer falls back to an available product. Monthly focus, construction and application-desk targeting do not move. This stages instructions only.</p><button type="button" class="btn primary" id="confirmMarketAdvertising">Confirm campaign target</button> <button type="button" class="btn" id="cancelMarketAdvertising">Cancel</button></section>':'');
 try{
  const preview=JSON.parse(JSON.stringify(v.me));E.applyProductProgramPolicy(preview,draft.productProgramPolicy);
  mount.innerHTML=context+advertisingDeskContent(v,preview,'market');
 }catch(error){mount.innerHTML=context+'<p class="notice bad">Campaign view unavailable: '+esc(error.message)+'. Review the staged product instructions.</p>';}
 const current=()=>marketActionCurrent(token,false)&&inspectedMarket(currentView())===market;
 $('#closeMarketAdvertising')?.addEventListener('click',()=>{if(current()){marketWorkspace.advertisingOpen=false;marketWorkspace.advertisingPending=null;renderMarketAdvertising(currentView());focusWorkspaceTarget($('#openMarketAdvertising'));}});
 $('#targetInspectedMarket')?.addEventListener('click',()=>{if(current())requestMarketAdvertisingTarget(currentView());});
 $('#confirmMarketAdvertising')?.addEventListener('click',()=>{if(current())confirmMarketAdvertisingTarget();});
 $('#cancelMarketAdvertising')?.addEventListener('click',()=>{if(current()){marketWorkspace.advertisingPending=null;renderMarketAdvertising(currentView());focusWorkspaceTarget($('#targetInspectedMarket'));}});
 bindAdvertisingDesk(v,{scope:'market',refresh:()=>{marketWorkspace.advertisingPending=null;const now=currentView();renderMarketAdvertising(now);renderProducts(now);renderReady(now);}});
}
