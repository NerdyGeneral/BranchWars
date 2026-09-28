// Presentation-only navigation. Existing workspace mounts and draft controls
// stay alive; changing a task group must never recreate their forms.
const WORKSPACE_GROUPS=[
 {id:'bank',label:'Bank & finance',tabs:['overview','credit','group']},
 {id:'customers',label:'Customers & markets',tabs:['markets','customers','products']},
 {id:'operate',label:'Run the bank',tabs:['operations','workforce']},
 {id:'grow',label:'Growth & competition',tabs:['strategy','competition','intelligence']}
];
let workspaceNavigationState={owner:null,campaign:null,remembered:{}};
const workspaceNavigationBound=new WeakSet();
// Contextual banking links remember presentation only. Returning must never
// restore an old draft over prices, office work or other instructions just edited.
let bankingContextTrail=[];
function bankingContextCurrent(context,v=currentView()){
 return !!(context&&v&&presentationCampaignIdentity(v)===context.campaign&&v.me.id===context.owner&&v.cycle===context.cycle&&
  connectionAttempt===context.attempt&&featureConnectionGeneration===context.connection&&linkSession===context.link&&gh===context.repository&&lan===context.lan);
}
function bankingLocationLabel(v){
 if(workspaceTab==='markets')return v.territories[marketWorkspace.market]?.name||'Markets';
 if(workspaceTab==='products')return subjectWorkspace.products==='policies'?'Bank policies':
  subjectWorkspace.products==='catalogue'?(v.productPortfolios.retail.options[productWorkspace.product]?.name||'Deposit products'):
  subjectWorkspace.products==='reports'?'Deposit statements':'Advertising';
 return {overview:'Overview',credit:'Lending',customers:'Customers',operations:'Operations',workforce:'People',strategy:'Research',group:'Financial Group',competition:'Competition',intelligence:'Intelligence'}[workspaceTab]||'Bank workspace';
}
function rememberBankingContext(v){
 if(!v)return null;
 if(typeof lifecycleCaptureForm==='function')lifecycleCaptureForm(v);
 if(bankingContextTrail.length&&!bankingContextCurrent(bankingContextTrail.at(-1),v))bankingContextTrail=[];
 const context={campaign:presentationCampaignIdentity(v),owner:v.me.id,cycle:v.cycle,attempt:connectionAttempt,connection:featureConnectionGeneration,
  link:linkSession,repository:gh,lan,label:bankingLocationLabel(v),tab:workspaceTab,
  subject:{...subjectWorkspace},market:{...marketWorkspace},product:{...productWorkspace},productDesk:productDeskView,productMarket:inspectedProductMarket,
  creditMarket:inspectedCreditMarket,householdMarket:selectedHouseholdMarket,householdDesk:householdWorkspace,
  operations:operationsDesk,groupDesk:financialGroupDesk,people:{...peopleWorkspaceState},strategy:{...strategyWorkspace},
  scrollX:Number(window.scrollX)||0,scrollY:Number(window.scrollY)||0,focusId:document.activeElement?.id||null};
 bankingContextTrail.push(context);if(bankingContextTrail.length>8)bankingContextTrail.shift();
 return context;
}
function renderBankingContext(v){
 const mount=$('#bankingContextBar');if(!mount)return;
 const context=bankingContextTrail.at(-1);
 if(!bankingContextCurrent(context,v)){bankingContextTrail=[];mount.hidden=true;mount.innerHTML='';return;}
 mount.hidden=false;
 mount.style?.setProperty?.('--banking-context-top',((window.innerWidth>900?$('.workspace-nav')?.offsetHeight||0:0)+12)+'px');
 mount.innerHTML='<nav class="panel workbench-toolbar" aria-label="Return to your previous banking task"><span class="small">From <b>'+esc(context.label)+'</b> · one shared monthly plan</span><button type="button" class="btn" id="bankingContextReturn">Return to '+esc(context.label)+'</button></nav>';
 $('#bankingContextReturn').onclick=()=>returnBankingContext(context);
}
function returnBankingContext(context=bankingContextTrail.at(-1)){
 const v=currentView();
 if(context!==bankingContextTrail.at(-1)||!bankingContextCurrent(context,v)){renderBankingContext(v);return false;}
 if(typeof lifecycleCaptureForm==='function')lifecycleCaptureForm(v);
 bankingContextTrail.pop();
 // The stable owner/session guard has passed. Rebind presentation selections
 // to the latest snapshot; nested instruction/preview tokens stay untouched.
 const snapshot=game||view;
 subjectWorkspace={...context.subject,campaign:snapshot};marketWorkspace={...context.market,campaign:presentationCampaignIdentity(v)};productWorkspace={...context.product,identity:snapshot};
 productDeskView=context.productDesk;inspectedProductMarket=context.productMarket;inspectedCreditMarket=context.creditMarket;
 selectedHouseholdMarket=context.householdMarket;householdWorkspace=context.householdDesk;
 operationsDesk=context.operations;financialGroupDesk=context.groupDesk;peopleWorkspaceState={...context.people,campaign:snapshot};strategyWorkspace={...context.strategy,identity:snapshot};
 setWorkspaceTab(context.tab,v);
 const restore=()=>{if(!bankingContextCurrent(context)||workspaceTab!==context.tab)return;
  if(context.focusId)$('#'+context.focusId)?.focus?.({preventScroll:true});
  window.scrollTo?.({left:context.scrollX,top:context.scrollY,behavior:'auto'});};
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(restore);else restore();
 renderBankingContext(v);return true;
}
function openBankingContext(kind,{product=null,market=null,remember=true}={}){
 const v=currentView();if(!v||!draft)return false;
 const supported=['pricing','product','portfolio','policies'].includes(kind);if(!supported)return false;
 if(product&&!v.productPortfolios.retail.options[product])return false;
 // Each link opens the editor it names: a product's own terms, bank-wide deposit
 // pricing, the lending portfolio, or the bank liquidity mandate.
 if(typeof expandedInterfaceEnabled==='function'&&expandedInterfaceEnabled(v)){
  const target=kind==='portfolio'?{view:'lending',context:{objectId:'portfolio'}}:kind==='policies'?{view:'treasury',context:{objectId:'liquidity'}}:
   product?{view:'deposits',context:{objectId:product,productId:product,mode:kind==='pricing'?'terms':'delivery'}}:{view:'deposits',context:{objectId:kind==='pricing'?'base':undefined}};
  return interfaceNavigate({workspace:'banking',view:target.view,context:{...target.context,marketId:market}},{remember});
 }
 if(remember)rememberBankingContext(v);
 let target;
 if(['pricing','product'].includes(kind)&&v.me.productPrograms&&(kind!=='pricing'||v.me.productPrograms.version===2)){
  subjectIdentity(v);productSelection(v);if(product)productWorkspace.product=product;
  if(market&&v.territories[market])inspectedProductMarket=market;
  subjectWorkspace.products='catalogue';productDeskView=kind==='pricing'&&v.me.productPrograms.version===2?'pricing':'development';
  setWorkspaceTab('products',v);target=$('#productDetailTitle');
 }else if(kind==='portfolio'&&v.me.creditPerformance){
  if(market&&v.territories[market])inspectedCreditMarket=market;
  setWorkspaceTab('credit',v);target=$('#creditPanel');
 }else if(['policies','pricing'].includes(kind)&&v.me.productPrograms){
  selectProductSubject('policies');target=$('#bankPricingPanel');
 }else{
  setWorkspaceTab('operations',v);setOperationsDesk('funding');
  target=$(kind==='portfolio'?'#productPortfolio-credit':kind==='product'?'#productPortfolio':'#bankPricingPanel');
 }
 renderBankingContext(v);focusWorkspaceTarget(target);return true;
}
function focusWorkspaceTarget(target){
 if(!target)return;
 const navigation=typeof window!=='undefined'&&window.innerWidth>900?($('.workspace-nav')?.offsetHeight||0):0;
 const returnBar=$('#bankingContextBar'),offset=navigation+(returnBar&&!returnBar.hidden?(returnBar.offsetHeight||0):0);
 if(target.style)target.style.scrollMarginTop=(offset+16)+'px';
 target.setAttribute?.('tabindex','-1');target.focus?.({preventScroll:true});target.scrollIntoView?.({block:'start',behavior:'auto'});
}
function availableWorkspaces(v){
 const requirements={credit:'creditPerformance',group:'financialGroup',customers:'householdBook',products:'productPrograms',workforce:'workforce'};
 return WORKSPACE_GROUPS.flatMap(group=>group.tabs).filter(tab=>!requirements[tab]||!!v?.me?.[requirements[tab]]);
}
function selectWorkspaceGroup(id){
 const v=currentView(),group=WORKSPACE_GROUPS.find(x=>x.id===id);
 if(!v||!group)return;
 reconcileWorkspaceNavigation(v);
 const available=availableWorkspaces(v),remembered=workspaceNavigationState.remembered[id];
 setWorkspaceTab(group.tabs.includes(remembered)&&available.includes(remembered)?remembered:group.tabs.find(tab=>available.includes(tab)),v);
 const selected=workspaceTab,owner=v.me.id,cycle=v.cycle,campaign=game||view,ownerSeat=seat;
 requestAnimationFrame(()=>{
  if(workspaceTab!==selected||(game||view)!==campaign||draftOwner!==owner||lastCycle!==cycle||seat!==ownerSeat)return;
  const target=selected==='strategy'?$('.game-layout'):$('[data-workspace="'+selected+'"].active');
  if(!target)return;
  target.style.scrollMarginTop=(window.innerWidth>900?$('.workspace-nav').offsetHeight+20:12)+'px';
  target.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 });
}
function reconcileWorkspaceNavigation(v){
 if(typeof expandedInterfaceEnabled==='function'&&expandedInterfaceEnabled(v||currentView())){renderExpandedInterface(v||currentView());return;}
 if(typeof reconcileGameHelp==='function')reconcileGameHelp();
 const mount=$('#workspaceGroups');if(!mount)return;
 v=v||currentView();if(!v)return;
 renderBankingContext(v);
 // Hotseat banks do not inherit one another's navigation preferences. Nothing
 // here is added to public views, saves, or outgoing plans.
 if(workspaceNavigationState.owner!==v.me.id||workspaceNavigationState.campaign!==game){
  workspaceNavigationState={owner:v.me.id,campaign:game,remembered:{}};
 }
 const available=availableWorkspaces(v),compact=available.length<=6;
 mount.hidden=compact;
 if(!available.includes(workspaceTab)){setWorkspaceTab('overview',v);return;}
 const selected=WORKSPACE_GROUPS.find(group=>group.tabs.includes(workspaceTab));
 workspaceNavigationState.remembered[selected.id]=workspaceTab;
 const groups=$$('[data-workspace-group]');
 groups.forEach(button=>{
  const active=button.dataset.workspaceGroup===selected.id;
  button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);
  if(workspaceNavigationBound.has(button))return;
  workspaceNavigationBound.add(button);
  button.addEventListener('click',()=>selectWorkspaceGroup(button.dataset.workspaceGroup));
  button.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const at=groups.indexOf(button),next=event.key==='Home'?0:event.key==='End'?groups.length-1:(at+(event.key==='ArrowRight'?1:-1)+groups.length)%groups.length;
   groups[next].focus(); // Focus only: Enter/Space chooses the group.
  });
 });
 const tabs=$$('[data-workspace-tab]');
 tabs.forEach(button=>{
  const tab=button.dataset.workspaceTab,visible=(compact||selected.tabs.includes(tab))&&available.includes(tab),active=tab===workspaceTab;
  button.hidden=!visible;button.classList.toggle('hidden',!available.includes(tab));
  button.setAttribute('role','tab');button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
  if(workspaceNavigationBound.has(button))return;
  workspaceNavigationBound.add(button);
  button.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const shown=tabs.filter(x=>!x.hidden),at=shown.indexOf(button);
   if(at<0)return;
   const next=event.key==='Home'?0:event.key==='End'?shown.length-1:(at+(event.key==='ArrowRight'?1:-1)+shown.length)%shown.length;
   setWorkspaceTab(shown[next].dataset.workspaceTab);shown[next].focus();
  });
 });
 $('#workspaceTabs')?.setAttribute('aria-label',selected.label+' workspaces');
}
