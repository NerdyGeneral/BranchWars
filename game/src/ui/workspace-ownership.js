// Presentation ownership only. Move existing controls, never clone a draft or
// change a campaign's rules. Core keeps its existing compact fallback desks.
let subjectWorkspace={campaign:null,owner:null,customers:'households',products:'catalogue',productsEnabled:false};
const subjectPanelHomes=new Map();
function subjectIdentity(v){
 const campaign=game||view;
 if(subjectWorkspace.campaign!==campaign||subjectWorkspace.owner!==v.me.id)
  subjectWorkspace={campaign,owner:v.me.id,customers:'households',products:'catalogue',productsEnabled:false};
 subjectWorkspace.productsEnabled=!!v.me.productPrograms;
 subjectWorkspace.workforceEnabled=!!v.me.workforce;
}
function placeSubjectPanel(id,target){
 const panel=$('#'+id),mount=target&&$('#'+target);if(!panel?.parentElement)return;
 if(!subjectPanelHomes.has(id))subjectPanelHomes.set(id,{parent:panel.parentElement,next:panel.nextSibling});
 // The monthly workbench temporarily borrows the same live editor.
 if(typeof monthlyEditorState!=='undefined'&&monthlyEditorState?.panel===panel)return;
 const home=subjectPanelHomes.get(id),destination=mount||home.parent;
 if(panel.parentElement!==destination)destination.insertBefore(panel,mount?null:home.next?.parentElement===destination?home.next:null);
}
function customerSubjectDesks(v){return ['households','commercial',...(v.me.relationshipOffers?['relationships']:[]),...(v.me.onboarding?['onboarding']:[])];}
function subjectRoute(item,v){
 if(!v?.me)return item;
 if(v.me.workforce&&['#staffGrid','#staffPool','#staffAllocationPanel'].includes(item.target))return {...item,tab:'workforce',desk:undefined,peopleDesk:'overview'};
 if(v.me.householdBook&&(item.serviceId||['#pipeline','#commercialClientWorkspace','#servicePricing'].includes(item.target)))return {...item,tab:'customers',desk:undefined,customerDesk:'commercial'};
 if(v.me.householdBook&&(item.productDesk==='relationships'||item.productDesk==='onboarding'))return {...item,tab:'customers',customerDesk:item.productDesk,target:'#customerGrowthPanel'};
 if(v.me.creditPerformance&&['#lendingPolicies','#lendingPolicyPanel','#productPortfolio-credit','#creditPanel'].includes(item.target))return {...item,tab:'credit',desk:undefined,productSubject:undefined};
 if(v.me.productPrograms&&(item.desk==='funding'||['#productPortfolio','#depositPolicies','#lendingPolicies','#capitalPolicies'].includes(item.target)))return {...item,tab:'products',desk:undefined,productSubject:'policies'};
 if(v.me.productPrograms&&item.target==='#productProgramsPanel')return {...item,productSubject:['advertising','reports'].includes(item.productDesk)?item.productDesk:'catalogue'};
 if(v.me.householdBook&&item.target==='#householdPanel')return {...item,customerDesk:'households'};
 return item;
}
function selectCustomerSubject(key){
 const v=currentView();if(!v?.me.householdBook)return;
 subjectIdentity(v);subjectWorkspace.customers=customerSubjectDesks(v).includes(key)?key:'households';
 setWorkspaceTab('customers',v);
}
function renderCustomerSubject(v){
 if(!v.me.householdBook||workspaceTab!=='customers')return;
 subjectIdentity(v);
 if(!customerSubjectDesks(v).includes(subjectWorkspace.customers))subjectWorkspace.customers='households';
 reconcileWorkspaceOwnership(v);
 if(subjectWorkspace.customers==='commercial')renderPipeline(v);
 renderCustomerGrowth(v);
}
function renderCustomerGrowth(v){
 const mount=$('#customerGrowthPanel');if(!mount)return;
 const key=subjectWorkspace.customers;
 if(workspaceTab!=='customers'||!['relationships','onboarding'].includes(key)){mount.innerHTML='';return;}
 if(!v.me[key==='relationships'?'relationshipOffers':'onboarding'])return;
 const p=JSON.parse(JSON.stringify(v.me));
 E.applyProductProgramPolicy(p,draft.productProgramPolicy);p.policies={...p.policies,deposit:draft.depositPolicy};
 mount.innerHTML=key==='relationships'?relationshipOfferContent(v,p):onboardingContent(v);
 if(key==='relationships')bindRelationshipOfferDesk(v);else bindOnboardingDesk(v);
 // These existing handlers still stage the single shared draft and re-quote
 // all department/funding commitments. This is not a second customer model.
}
function selectProductSubject(key){
 const v=currentView();if(!v?.me.productPrograms)return;
 if(key==='lending'){openBankingContext('portfolio');return;}
 subjectIdentity(v);subjectWorkspace.products=['policies','advertising','reports'].includes(key)?key:'catalogue';
 if(key!=='policies')productDeskView=['advertising','reports'].includes(key)?key:'development';
 setWorkspaceTab('products',v);
}
function openProductDesk(desk,options={}){
 const v=currentView();if(!v?.me.productPrograms)return;
 if(['pricing','development'].includes(desk))return openBankingContext(desk==='pricing'?'pricing':'product',options);
 if(options.remember!==false)rememberBankingContext(v);
 if(['relationships','onboarding'].includes(desk)){selectCustomerSubject(desk);return;}
 subjectIdentity(v);subjectWorkspace.products=['advertising','reports'].includes(desk)?desk:'catalogue';
 productDeskView=desk;setWorkspaceTab('products',v);
}
function renderSubjectNavigation(v){
 const labels={households:'Households & retention',commercial:'Businesses & opportunities',relationships:'Relationship offers',onboarding:'Applications',catalogue:'Deposit products',lending:'Lending portfolio',policies:'Bank policies',advertising:'Advertising',reports:'Deposit statements'};
 const products=['catalogue',...(v.me.creditPerformance?['lending']:[]),'policies',...(v.me.advertising?['advertising']:[]),...(v.me.productPrograms?.version===2?['reports']:[])];
 for(const [kind,mount,keys]of [['customers','customerSubjectNavigation',customerSubjectDesks(v)],['products','productSubjectNavigation',products]]){
  const el=$('#'+mount);if(!el)continue;
  el.innerHTML='<div class="subject-tabs" role="group" aria-label="'+kind+' desks">'+keys.map(key=>'<button type="button" class="btn" data-subject="'+kind+'" data-subject-desk="'+key+'" aria-pressed="'+(subjectWorkspace[kind]===key)+'">'+labels[key]+'</button>').join('')+'</div>';
  const token=opportunityToken(v);
  el.onclick=event=>{const button=event.target.closest?.('[data-subject-desk]');if(!button||!el.contains(button)||!opportunityCurrent(token,false))return;
   if(kind==='customers')selectCustomerSubject(button.dataset.subjectDesk);else selectProductSubject(button.dataset.subjectDesk);
   $('#'+mount)?.querySelector?.('[aria-pressed="true"]')?.focus?.({preventScroll:true});};
 }
}
function reconcileWorkspaceOwnership(v){
 if(typeof expandedInterfaceEnabled==='function'&&expandedInterfaceEnabled(v))return;
 if(!v?.me)return;subjectIdentity(v);
 placeSubjectPanel('staffAllocationPanel',v.me.workforce?'peopleAllocationMount':null);
 placeSubjectPanel('bankProductsPanel',v.me.productPrograms?'productPolicyMount':null);
 placeSubjectPanel('bankPricingPanel',v.me.productPrograms?'productPolicyMount':null);
 placeSubjectPanel('lendingPolicyPanel',v.me.creditPerformance?'creditPolicyMount':null);
 const clients=$('#customerPipelinePanel');
 placeSubjectPanel('customerPipelinePanel',v.me.householdBook?'customerCommercialMount':null);
 if(clients){clients.classList.toggle('workspace-view',!v.me.householdBook);if(v.me.householdBook)clients.removeAttribute('data-workspace');else clients.setAttribute('data-workspace','markets');}
 const shortcut=$('#peopleOwnershipShortcut');if(shortcut){shortcut.hidden=!v.me.workforce;shortcut.onclick=()=>navigatePlanReview({tab:'operations',target:'#staffGrid',peopleDesk:'overview'});}
 if($('#peopleAllocationMount'))$('#peopleAllocationMount').hidden=typeof peopleWorkspaceState!=='undefined'&&peopleWorkspaceState.desk!=='overview';
 for(const [id,visible]of [['customerHouseholdMount',subjectWorkspace.customers==='households'],['customerCommercialMount',subjectWorkspace.customers==='commercial'],['customerGrowthPanel',['relationships','onboarding'].includes(subjectWorkspace.customers)],['productPolicyMount',subjectWorkspace.products==='policies'],['productProgramsPanel',subjectWorkspace.products!=='policies']])if($('#'+id))$('#'+id).hidden=!visible;
 renderSubjectNavigation(v);
}
