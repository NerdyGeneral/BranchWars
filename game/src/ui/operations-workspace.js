// Presentation-only navigation. No campaign field, draft copy or simulation hook.
// Operations carried four sub-tabs, but three of them -- the executive call and
// staffing, products and pricing, and projects -- are all parts of the SAME monthly
// submission, and the player had to cross tabs to finish one decision. They are now
// one desk with labelled sections; Forecast stays separate because it is what you
// read after deciding, not part of deciding.
const OPERATIONS_DESKS=['plan','forecast'];
const OPERATIONS_PANELS={plan:['monthly','funding','projects'],forecast:['forecast']};
// plan-review, facility-lifecycle and the decision shortcut still ask for the old
// desk names. Keep honouring them and route each to the desk holding its section.
const OPERATIONS_DESK_ALIAS={monthly:'plan',funding:'plan',projects:'plan',plan:'plan',forecast:'forecast'};
let operationsDesk='plan',operationsDeskOwner=null,operationsFundingSuppressed=false;
const operationsBoundControls=new WeakSet();
function setOperationsDesk(key,{focus=false}={}){
 if(key==='funding'&&typeof subjectWorkspace!=='undefined'&&subjectWorkspace.productsEnabled&&typeof selectProductSubject==='function'){operationsDesk='monthly';selectProductSubject('policies');return;}
 const requested=key;
 operationsDesk=OPERATIONS_DESK_ALIAS[key]||'plan';
 const mount=$('#operationsWorkspace');if(!mount)return;
 mount.dataset.operationsDesk=operationsDesk;
 $$('[data-operations-tab]').forEach(button=>{const active=button.dataset.operationsTab===operationsDesk;button.setAttribute('aria-selected',active?'true':'false');button.tabIndex=active?0:-1;button.classList.toggle('active',active);if(active&&focus)button.focus()});
 const shown=(OPERATIONS_PANELS[operationsDesk]||[]).filter(id=>id!=='funding'||!operationsFundingSuppressed);
 $$('[data-operations-panel]').forEach(panel=>{panel.hidden=!shown.includes(panel.dataset.operationsPanel)});
 // A caller that asked for one section by its old name gets it brought into view.
 if(requested&&requested!==operationsDesk&&OPERATIONS_PANELS[operationsDesk]?.includes(requested)){
  const section=$('#operationsPanel-'+requested);
  if(section&&!section.hidden&&focus)section.scrollIntoView({block:'start'});
 }
 const hints={plan:'Answer the executive call, allocate staff, set products and pricing, and commit projects -- all one monthly submission. Optional spending is not required to submit.',forecast:'These books and estimates use your current draft. Review spending in the shared plan budget; projected income is not available cash.'};
 $('#operationsDeskHint').textContent=hints[operationsDesk];
 if(operationsDesk==='plan'&&typeof subjectWorkspace!=='undefined'&&subjectWorkspace.workforceEnabled)$('#operationsDeskHint').textContent='Answer the executive call here. People owns staffing; This month opens required work inline. Optional spending is not required to submit.';
 const subtitle=$('#operationsTab-plan')?.querySelector?.('span');if(subtitle)subtitle.textContent=typeof subjectWorkspace!=='undefined'&&subjectWorkspace.workforceEnabled?'Decision, products & projects':'Decision, staff, products & projects';
}
function operationsDeskKey(event,key){
 const keys=OPERATIONS_DESKS.filter(id=>!$('#operationsTab-'+id)?.hidden),at=keys.indexOf(key);let next;
 if(event.key==='ArrowRight'||event.key==='ArrowDown')next=keys[(at+1)%keys.length];
 else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=keys[(at+keys.length-1)%keys.length];
 else if(event.key==='Home')next=keys[0];
 else if(event.key==='End')next=keys.at(-1);
 else return;
 event.preventDefault();setOperationsDesk(next,{focus:true});
}
function reconcileOperationsWorkspace(){
 const mount=$('#operationsWorkspace');if(!mount)return;
 const owner=typeof draftOwner==='undefined'?null:draftOwner;
 const products=typeof subjectWorkspace!=='undefined'&&subjectWorkspace.productsEnabled;
 operationsFundingSuppressed=!!products;
 if(products&&operationsDesk==='funding')operationsDesk='plan';
 if(owner!==operationsDeskOwner){operationsDeskOwner=owner;operationsDesk='monthly'}
 $$('[data-operations-tab]').forEach(button=>{if(operationsBoundControls.has(button))return;operationsBoundControls.add(button);button.addEventListener('click',()=>setOperationsDesk(button.dataset.operationsTab));button.addEventListener('keydown',event=>operationsDeskKey(event,button.dataset.operationsTab))});
 const shortcut=$('#operationsDecisionShortcut');if(shortcut&&!operationsBoundControls.has(shortcut)){operationsBoundControls.add(shortcut);shortcut.addEventListener('click',()=>{setOperationsDesk('plan');$('#decisionGrid')?.querySelector?.('button:not(:disabled)')?.focus()})}
 setOperationsDesk(operationsDesk);
}
