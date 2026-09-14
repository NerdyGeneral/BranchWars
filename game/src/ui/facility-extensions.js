// Object-owned action: no new tab, feature checkbox or duplicate money rules.
let facilitySuiteUi={campaign:null,office:null,open:false};
function facilityExtensionMarkup(v,office,disabled){
 if(!v.me.facilityExtensions||!office)return '';
 const installed=v.me.facilityExtensions.offices[office.id],order=draft.facilityExtensionPolicy,
   staged=order?.start===office.id,cancel=order?.cancel===office.id,def=E.COMMERCIAL_SUITE;
 if(installed)return '<section class="notice"><h4>Commercial banking suite</h4><p class="small">'+
   (E.facilityExtensionActive(v.me,office.id)?'Operating inside this office. The staffing reference below includes both services. Shared role time is divided between them; it is never counted twice.':
     installed.readyCycle?'Construction finished; opens next month.':'Construction: '+Number(installed.work).toFixed(1)+' / '+def.work+' work units. Shared execution capacity can delay completion.')+
   ' Upkeep '+lifecycleMoney(def.upkeep)+'/month plus up to '+lifecycleMoney(def.upkeep*.12)+' maintenance. Uses this building’s condition and maintenance policy.</p>'+
   (installed.readyCycle===null?'<button type="button" class="btn" id="cancelOfficeSuite"'+disabled+'>'+(cancel?'Undo staged cancellation':'Cancel construction · no refund')+'</button>':'')+'</section>';
 if(!def.hosts.includes(office.model))return '<p class="small muted">This office model has no additional commercial-suite space. Its existing services remain unchanged.</p>';
 const quote=E.facilityExtensionQuote(v,v.me,draft,office.id);
 const open=staged||(facilitySuiteUi.campaign===(game||view)&&facilitySuiteUi.office===office.id&&facilitySuiteUi.open);
 return '<details class="office-ledger" id="officeSuiteOffer"'+(open?' open':'')+'><summary>Add a commercial banking suite · '+lifecycleMoney(def.cost)+'</summary><p class="small">Keep this office’s current service and use its one available suite space for business banking.</p><div class="decision-facts">'+
   '<div><small>One-time fit-out</small><b>'+lifecycleMoney(def.cost)+'</b></div><div><small>After opening / month</small><b>'+lifecycleMoney(def.upkeep)+' + maintenance</b></div><div><small>Construction</small><b>'+def.work+' work · '+def.execution+' execution</b></div></div>'+
   '<p class="small">Additional full-capacity time: 1 Business banker, 0.5 Lending and 0.25 Operations employee-months. Assign existing people below after opening. Up to '+lifecycleMoney(def.capacity.depositCapacity)+' deposit and '+lifecycleMoney(def.capacity.loanCapacity)+' lending throughput; actual business, credit approval and funding are still required.</p>'+
   (staged?'<p class="small">Construction staged at this office. Nothing is paid until the month resolves.</p><button type="button" class="btn" id="clearOfficeSuite"'+disabled+'>Remove staged suite</button>':
    '<button type="button" class="btn" id="stageOfficeSuite"'+(disabled||!quote.eligible?' disabled':'')+'>Stage commercial suite</button>'+(quote.eligible?'':'<p class="small bad">'+esc(quote.reason)+'</p>'))+'</details>';
}
function bindFacilityExtension(v,office){
 if(!v.me.facilityExtensions||!office)return;
 const signature=JSON.stringify(draft),campaign=game||view,token=typeof opportunityToken==='function'?opportunityToken(v):null;
 const stage=order=>{
  if(!lifecycleFresh(v,signature,campaign)||(token&&!opportunityCurrent(token))){toast('The bank, connection or plan changed. Reopen this office.');return;}
  try{
   const officeForm=lifecycleReadForm();
   const next=JSON.parse(JSON.stringify(draft));next.facilityExtensionPolicy=order;
   E.normalizeFacilityExtensionPlan(currentView(),currentView().me,next);
   draft=next;lifecycleUi.form=officeForm;lifecycleUi.signature=JSON.stringify(draft);
   renderReady(currentView());renderFacilityLifecycle(currentView());
   (order.start?$('#clearOfficeSuite'):$('#cancelOfficeSuite')||$('#stageOfficeSuite'))?.focus?.({preventScroll:true});
   toast(order.start?'Suite construction staged. Existing office form edits are not applied until you stage the office plan.':order.cancel?'Cancellation staged. Paid fit-out is not refunded.':'Suite instruction removed.');
  }catch(error){toast(error.message);}
 };
 $('#officeSuiteOffer')?.addEventListener('toggle',()=>{if((game||view)===campaign&&currentView()?.me?.id===v.me.id)facilitySuiteUi={campaign,office:office.id,open:!!$('#officeSuiteOffer').open};});
 $('#stageOfficeSuite')?.addEventListener('click',()=>stage({start:office.id,cancel:null}));
 $('#clearOfficeSuite')?.addEventListener('click',()=>stage({start:null,cancel:null}));
 $('#cancelOfficeSuite')?.addEventListener('click',()=>stage({start:null,cancel:draft.facilityExtensionPolicy?.cancel===office.id?null:office.id}));
}
