// Presentation-only navigation. No campaign field, draft copy or simulation hook.
const OPERATIONS_DESKS=['monthly','funding','projects','forecast'];
let operationsDesk='monthly',operationsDeskOwner=null;
const operationsBoundControls=new WeakSet();
function setOperationsDesk(key,{focus=false}={}){
 if(key==='funding'&&typeof subjectWorkspace!=='undefined'&&subjectWorkspace.productsEnabled&&typeof selectProductSubject==='function'){operationsDesk='monthly';selectProductSubject('policies');return;}
 operationsDesk=OPERATIONS_DESKS.includes(key)?key:'monthly';
 const mount=$('#operationsWorkspace');if(!mount)return;
 mount.dataset.operationsDesk=operationsDesk;
 $$('[data-operations-tab]').forEach(button=>{const active=button.dataset.operationsTab===operationsDesk;button.setAttribute('aria-selected',active?'true':'false');button.tabIndex=active?0:-1;button.classList.toggle('active',active);if(active&&focus)button.focus()});
 $$('[data-operations-panel]').forEach(panel=>{panel.hidden=panel.dataset.operationsPanel!==operationsDesk});
 const hints={monthly:'Answer the executive call and allocate all staff. Optional hiring, research and projects are not required to submit.',funding:'Your offers and pricing share the monthly draft with staff, projects and research. Existing balances retain their contractual terms.',projects:'New initiatives and recruits share your cash budget. Executive capacity constrains project delivery; new hires report next cycle.',forecast:'These books and estimates use your current draft. Review spending in the shared plan budget; projected income is not available cash.'};
 $('#operationsDeskHint').textContent=hints[operationsDesk];
 if(operationsDesk==='monthly'&&typeof subjectWorkspace!=='undefined'&&subjectWorkspace.workforceEnabled)$('#operationsDeskHint').textContent='Answer the executive call here. People owns staffing; This month opens required work inline. Optional spending is not required to submit.';
 const subtitle=$('#operationsTab-monthly')?.querySelector?.('span');if(subtitle)subtitle.textContent=typeof subjectWorkspace!=='undefined'&&subjectWorkspace.workforceEnabled?'Executive decision':'Executive decision & staff';
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
 if($('#operationsTab-funding'))$('#operationsTab-funding').hidden=!!products;
 if(products&&operationsDesk==='funding')operationsDesk='monthly';
 if(owner!==operationsDeskOwner){operationsDeskOwner=owner;operationsDesk='monthly'}
 $$('[data-operations-tab]').forEach(button=>{if(operationsBoundControls.has(button))return;operationsBoundControls.add(button);button.addEventListener('click',()=>setOperationsDesk(button.dataset.operationsTab));button.addEventListener('keydown',event=>operationsDeskKey(event,button.dataset.operationsTab))});
 const shortcut=$('#operationsDecisionShortcut');if(shortcut&&!operationsBoundControls.has(shortcut)){operationsBoundControls.add(shortcut);shortcut.addEventListener('click',()=>{setOperationsDesk('monthly');$('#decisionGrid')?.querySelector?.('button:not(:disabled)')?.focus()})}
 setOperationsDesk(operationsDesk);
}
