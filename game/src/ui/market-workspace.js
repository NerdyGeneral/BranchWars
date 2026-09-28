// Inspection is owner-local UI state, never a saved rule or monthly instruction.
let marketWorkspace={owner:null,campaign:null,market:null,mode:'overview',office:null,desk:'staff',pending:null,advertisingOpen:false,advertisingPending:null};
function resetMarketWorkspace(v){marketWorkspace={owner:v.me.id,campaign:presentationCampaignIdentity(v),market:v.me.focus,mode:'overview',office:null,desk:'staff',pending:null,advertisingOpen:false,advertisingPending:null};}
function inspectedMarket(v){
 if(marketWorkspace.owner!==v.me.id||marketWorkspace.campaign!==presentationCampaignIdentity(v))resetMarketWorkspace(v);
 if(!v.territories[marketWorkspace.market])marketWorkspace.market=draft.focus||Object.keys(v.territories)[0];
 return marketWorkspace.market;
}
function marketActionToken(v){return {owner:v.me.id,cycle:v.cycle,campaign:game||view,signature:JSON.stringify(draft)};}
function marketActionCurrent(token,editable=true){
 const now=currentView();return !!(now&&draft&&(game||view)===token.campaign&&now.me.id===token.owner&&now.cycle===token.cycle&&
  draftOwner===token.owner&&lastCycle===token.cycle&&(!editable||(!now.me.submitted&&!now.gameOver)));
}
function inspectMarket(v,key){
 if(typeof expandedInterfaceEnabled==='function'&&expandedInterfaceEnabled(v)){const now=currentView();return now?.me.id===v.me.id&&now.cycle===v.cycle&&!!now.territories[key]?interfaceMarketsGo('overview',{market:key}):false;}
 const now=currentView();if(!now||now.me.id!==v.me.id||now.cycle!==v.cycle||!now.territories[key])return false;
 marketSaveOfficeForm(now);
 marketWorkspace.owner=now.me.id;marketWorkspace.campaign=presentationCampaignIdentity(now);marketWorkspace.market=key;marketWorkspace.mode='overview';marketWorkspace.pending=null;marketWorkspace.advertisingPending=null;
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
 draft=proposal.candidate;marketWorkspace.pending=null;keepMarketScroll(()=>refreshMarketActions(now));restoreMarketActionFocus(pending.key);return true;
}
// Re-rendering the Markets tab keeps the page and the inspector where they were.
function keepMarketScroll(render){
 const panel=$('#marketInspector'),y=typeof window!=='undefined'?window.scrollY:0,top=panel?.scrollTop||0;
 render();
 if(typeof window!=='undefined'&&window.scrollY!==y)window.scrollTo?.(window.scrollX||0,y);
 const next=$('#marketInspector');if(next&&next.scrollTop!==top)next.scrollTop=top;
}
function restoreMarketActionFocus(key){
 const target=key?$('button[data-local-project="'+key+'"]'):$('#inspectedMarketName');
 target?.focus?.({preventScroll:true});
 // The inspector may scroll independently. Keeping focus without revealing its
 // new node leaves keyboard users below the clipped panel after a re-render.
 target?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});
}
function cancelMarketAction(){const key=marketWorkspace.pending?.key;marketWorkspace.pending=null;const v=currentView();if(v)keepMarketScroll(()=>renderMarketInspector(v));restoreMarketActionFocus(key);}
function refreshMarketActions(v){renderMarkets(v);renderProjects(v);renderReady(v);}
function openMarketOffice(v,id,desk){
 if(typeof expandedInterfaceEnabled==='function'&&expandedInterfaceEnabled(v)){
  const now=currentView();if(!now||now.me.id!==v.me.id||now.cycle!==v.cycle)return false;const office=interfaceMarketsOffice(now,id);if(!office)return false;
  return interfaceMarketsGo(desk==='staff'?'staff':desk==='services'?'services':desk==='convert'?'convert':'office',{market:office.market,office:id});
 }
 const now=currentView(),office=now?.me?.facilityNetwork?.offices.find(o=>o.id===id&&o.closedCycle===null);
 if(!office||now.me.id!==v.me.id||now.cycle!==v.cycle)return false;
 marketSaveOfficeForm(now);
 marketWorkspace.market=office.market;marketWorkspace.owner=now.me.id;marketWorkspace.campaign=presentationCampaignIdentity(now);marketWorkspace.mode='office';marketWorkspace.office=id;marketWorkspace.desk=['staff','services'].includes(desk)&&now.me.facilityLifecycle?desk:'convert';
 if(['staff','services'].includes(desk)&&now.me.facilityLifecycle){
  // Preserve edits at the previous office before moving the same editor.
  lifecycleUi.office=id;lifecycleUi.open=true;renderMarketInspector(now);
  focusWorkspaceTarget($(desk==='services'?'#officeServicesTitle':'#officeDetailTitle'));
 }else{
  const models=facilityNetworkSelection.owner===now.me.id?{...facilityNetworkSelection.models,[facilityNetworkSelection.office]:facilityNetworkSelection.model}:{};
  facilityNetworkSelection={...facilityNetworkSelection,owner:now.me.id,office:id,model:models[id]||null,models,open:true};
  renderMarketInspector(now);focusWorkspaceTarget($('#facilityNetworkDesk'));
 }
 return true;
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
