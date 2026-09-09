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
function focusWorkspaceTarget(target){
 if(!target)return;
 const offset=typeof window!=='undefined'&&window.innerWidth>900?($('.workspace-nav')?.offsetHeight||0):0;
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
 if(typeof reconcileGameHelp==='function')reconcileGameHelp();
 const mount=$('#workspaceGroups');if(!mount)return;
 v=v||currentView();if(!v)return;
 // Hotseat banks do not inherit one another's navigation preferences. Nothing
 // here is added to public views, saves, or outgoing plans.
 if(workspaceNavigationState.owner!==v.me.id||workspaceNavigationState.campaign!==game){
  workspaceNavigationState={owner:v.me.id,campaign:game,remembered:{}};
 }
 const available=availableWorkspaces(v);
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
  const tab=button.dataset.workspaceTab,visible=selected.tabs.includes(tab)&&available.includes(tab),active=tab===workspaceTab;
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
