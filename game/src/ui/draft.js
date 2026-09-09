function currentView(){return game?E.publicState(game,seat):view}
function newDraft(v){draft={...(v.me.departmentFunctions?{departmentFunctionsPolicy:E.defaultDepartmentFunctionsPolicy(v.me)}:{}),...(v.me.facilityLifecycle?{facilityLifecyclePolicy:E.defaultFacilityLifecyclePlan(v.me)}:{}),...(v.me.facilityNetwork?{facilityPolicy:E.defaultFacilityPolicy(v.me)}:{}),...(v.me.departmentOffice?E.defaultDepartmentPlan(v.me):{}),...(v.me.agency?{agencyPolicy:E.defaultAgencyPlan(v.me)}:{}),...(v.me.financialGroup?{groupPolicy:E.defaultGroupPlan(v.me)}:{}),...(v.me.onboarding?{onboardingPolicy:{...v.me.onboarding.policy}}:{}),...(v.me.relationshipOffers?{relationshipOfferPolicy:{...v.me.relationshipOffers.policy}}:{}),...(v.me.advertising?{advertisingPolicy:{...v.me.advertising.policy}}:{}),...(v.me.productPrograms?{productProgramPolicy:E.productProgramPolicy(v.me)}:{}),...(v.me.creditPerformance?{collectionsPolicy:JSON.parse(JSON.stringify(v.me.creditPerformance.policy))}:{}),...(v.me.householdBook?{householdPolicy:JSON.parse(JSON.stringify(v.me.householdBook.policy))}:{}),...(v.me.workforce?{specialistHires:E.emptySpecialistOrders(),workforcePolicy:JSON.parse(JSON.stringify(v.me.workforce.policy))}:{}),contractBid:null,contractExit:null,...(v.me.serviceDesk?{servicePolicy:JSON.parse(JSON.stringify(v.me.serviceDesk.policy))}:{}),...(v.me.retailLifecycle?{retailMix:{...v.me.retailLifecycle.mix}}:{}),...(v.me.termFunding?{termPolicy:{...v.me.termFunding.policy}}:{}),focus:v.me.focus,allocation:{...v.me.allocation},depositPolicy:v.me.policies.deposit,lendingPolicy:v.me.policies.lending,capitalPolicy:v.me.policies.capital,products:{...v.me.products},specializations:{...v.me.specializations},opportunity:null,newProject:null,newProjects:[],investments:{},hires:0,capitalAction:false,competitiveAction:'none',decision:null};if(v.me.management){draft.management=JSON.parse(JSON.stringify(v.me.management));const prepared=E.managementPlan(v.me,draft,v.economy);draft=prepared.plan;managementNotes=prepared.notes}draftOwner=v.me.id;lastCycle=v.cycle;if(typeof resetMonthlyChanges==='function')resetMonthlyChanges(v);if(typeof resetPeopleWorkspace==='function')resetPeopleWorkspace(v)}
function ensureDraft(v){if(!draft||draftOwner!==v.me.id||lastCycle!==v.cycle)newDraft(v)}
function setWorkspaceTab(tab,snapshot){
 reconcileOperationsWorkspace();
 const valid=['overview','markets','customers','credit','group','products','operations','workforce','competition','strategy','intelligence'];
 workspaceTab=valid.includes(tab)?tab:'overview';
 // Reuse one synchronous owner view throughout this navigation. Never cache it
 // across turns, owners or callbacks; mature histories can be tens of MB.
 let v=snapshot;const getView=()=>v===undefined?(v=currentView()):v;
 $('#gameScreen').dataset.tab=workspaceTab;
 $$('[data-workspace-tab]').forEach(b=>{const on=b.dataset.workspaceTab===workspaceTab;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false')});
 $$('[data-workspace]').forEach(x=>x.classList.toggle('active',x.dataset.workspace===workspaceTab));
 if(workspaceTab==='markets'&&draft&&getView()){renderFacilityNetwork(v);if(v.me.facilityLifecycle)renderFacilityLifecycle(v);}
 if(workspaceTab==='products'&&draft&&getView())renderProductPrograms(v);
 if(workspaceTab==='credit'&&draft&&getView())renderCollections(v);
 if(workspaceTab==='group'&&draft&&getView())renderFinancialGroup(v);
 if(workspaceTab==='customers'&&draft&&getView())renderHouseholds(v);
 if(workspaceTab==='workforce'&&draft&&getView())renderWorkforce(v);
 if(typeof reconcileWorkspaceNavigation==='function')reconcileWorkspaceNavigation(getView());
 if(workspaceTab==='overview'&&draft&&typeof renderBankOverview==='function'&&getView())renderBankOverview(v,monthlyPlanReview(v));
}
