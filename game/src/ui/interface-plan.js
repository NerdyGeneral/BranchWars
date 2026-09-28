// Object-scoped review rows. Presentation diffs compare the one draft with its
// opening values; removing one order never restores a previously captured plan.
function interfacePlanRows(v){
 const baseline=monthlyChangesState.baseline;
 if(!baseline||monthlyChangesState.owner!==v.me.id||monthlyChangesState.cycle!==v.cycle)return [];
 const rows=[],copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const get=(o,path)=>path.reduce((a,k)=>a?.[k],o),different=(a,b)=>JSON.stringify(a)!==JSON.stringify(b);
 const addGroup=(paths,title,route)=>{
  const changed=paths.filter(path=>different(get(baseline,path),get(draft,path)));if(!changed.length)return;
  rows.push({path:paths[0],title,route,before:Object.fromEntries(changed.map(path=>[path.at(-1),copy(get(baseline,path))])),after:Object.fromEntries(changed.map(path=>[path.at(-1),copy(get(draft,path))])),patches:changed.map(path=>({path,before:copy(get(baseline,path))}))});
 };
 const array=(path,key,label,routeFor)=>{
  const before=get(baseline,path)||[],after=get(draft,path)||[],keys=[...new Set([...before,...after].map(key))];
  for(const id of keys){const old=before.filter(row=>key(row)===id),next=after.filter(row=>key(row)===id);if(!different(old,next))continue;
   rows.push({path,before:old,after:next,title:label(id,next[0]||old[0]),route:routeFor(id,next[0]||old[0]),array:{path,id,before:copy(old),key}});
  }
 };
 const officeName=id=>{const office=v.me.facilityNetwork?.offices.find(o=>o.id===id);return office?(v.territories[office.market]?.name||office.market)+' · '+(E.FacilityLifecycle?.CATALOG[office.model]?.name||office.model)+' · '+id:id;};
 const clientName=id=>v.me.investmentSnapshot?.clients?.find(c=>c.id===id)?.name||id;
 const companyName=id=>{const company=v.me.companySnapshot?.world?.companies.find(c=>c.id===id);return company?E.ANCHOR_CLIENTS[company.clientIndex]?.name||id:id;};
 const controlCompany=id=>[...(v.me.companyControl?.deals||[]),...(v.companyControlSnapshot?.offers||[])].find(row=>row.offer.id===id)?.offer.issuer;
 const walk=(before,after,path)=>{
  if(!different(before,after))return;
  if(before&&after&&typeof before==='object'&&typeof after==='object'&&!Array.isArray(before)&&!Array.isArray(after))for(const key of new Set([...Object.keys(before),...Object.keys(after)]))walk(before[key],after[key],[...path,key]);
  else rows.push({path,before:copy(before),after:copy(after),patches:[{path,before:copy(before)}]});
 };
 for(const key of new Set([...Object.keys(baseline),...Object.keys(draft)])){
  if(['newProject','projectTargets'].includes(key))continue;
  if(key==='newProjects'){
   for(const id of new Set([...(baseline.newProjects||[]),...(draft.newProjects||[])]))if((baseline.newProjects||[]).includes(id)!==(draft.newProjects||[]).includes(id)||baseline.projectTargets?.[id]!==draft.projectTargets?.[id])rows.push({path:[key,id],before:(baseline.newProjects||[]).includes(id),after:(draft.newProjects||[]).includes(id),initiative:true});
  }else if(key==='announcement'){
   if(different(baseline[key],draft[key]))rows.push({path:[key],before:copy(baseline[key]),after:copy(draft[key]),patches:[{path:[key],before:copy(baseline[key])}]});
  }else if(key==='cardPolicy'){
   addGroup([[key]],'Cedar Reserve partner cards',{workspace:'banking',view:'cards',context:{objectId:'program'}});
  }else if(key==='outsideAdvanceAmount'){
   addGroup([[key]],'Cedar Reserve Bank · one-month advance',{workspace:'banking',view:'treasury',context:{objectId:'outside-funding'}});
  }else if(key==='nodeFunding'){
   for(const node of new Set([...Object.keys(baseline[key]||{}),...Object.keys(draft[key]||{})]))addGroup([[key,node]],(E.ResearchTree.NODES[node]||E.DigitalCommercial.NODES[node])?.name||node,{workspace:'strategy',view:'research',context:{node}});
  }else if(key==='brandCampaignPolicy'){
   for(const kind of ['regular','sponsorship']){
    const count=rows.length;addGroup([[key,kind]],kind==='regular'?'Monthly advertising':'Sponsorship agreement',{workspace:'strategy',view:'campaigns',context:{campaignType:kind==='regular'?'advertising':'sponsorship'}});
    if(rows.length>count){try{const q=E.BrandCampaigns.quote(v,v.me,draft);rows.at(-1).description=kind==='regular'?(q.policy.regular.mode==='off'?'Paused':overviewDollars(q.regularRequested)+' per month · '+(q.policy.regular.scope==='served'?'one budget across served markets':v.territories[q.policy.regular.market]?.name)):(q.policy.sponsorship.action==='cancel'?'Cancel at settlement · ':q.policy.sponsorship.action==='start'?'Start agreement · ':'Continue · ')+overviewDollars(q.sponsorDue)+' this month · '+overviewDollars(q.futurePayments)+' future payments'+(q.endMonth?' · ends month '+q.endMonth:'');}catch(e){rows.at(-1).description=e.message;}}
   }
  }else if(key==='holdingCapitalOrders'){
   for(const kind of ['capital','rival']){
    const count=rows.length;addGroup([[key,kind]],kind==='capital'?'Holding company · capital instruction':'Rival holding company · voluntary share order',{workspace:'group',view:'ownership',context:{objectId:kind}});
    if(rows.length>count){const o=draft[key][kind];rows.at(-1).description=(o.action||o.side)+' · '+o.shares.toLocaleString()+' shares · limit '+financePrice(o.limitCents)+' per share. Parent cash; no bank deposits or custody funds.';}
   }
  }else if(key==='servicePolicy'){
   for(const kind of Object.keys(draft[key]?.pricing||{}))addGroup([[key,'pricing',kind]],(E.SERVICE_TYPES[kind]?.name||kind)+' · service pricing',{workspace:'banking',view:'services',context:{serviceKind:kind,mode:'pricing'}});
   for(const field of Object.keys(draft[key]||{}).filter(k=>k!=='pricing'))walk(baseline[key]?.[field],draft[key][field],[key,field]);
  }else if(key==='agencyPolicy'&&v.me.agency?.status!=='active'&&draft[key]?.launch){
   const n=rows.length;addGroup([[key]],'Open insurance agency expansion',{workspace:'group',view:'agency',context:{objectId:'funding'}});
   if(rows.length>n)rows.at(-1).description='Parent funding '+money(draft[key].capital)+' · launch, employee and operating setup are one expansion instruction.';
  }else if(key==='agencyPolicy'&&v.me.agency?.version===2){
   addGroup(['launch','capital','dividend','supportCap'].map(k=>[key,k]),'Insurance agency · funding and launch',{workspace:'group',view:'agency',context:{objectId:'funding'}});
   addGroup(['staff','roles','maintainCredentials'].map(k=>[key,k]),'Insurance agency · employees and credentials',{workspace:'people',view:'staff',context:{employer:'agency'}});
   addGroup(['target','outreach'].map(k=>[key,k]),'Insurance agency · sales activity',{workspace:'group',view:'agency',context:{objectId:'operations'}});
  }else if(key==='investmentPolicy'){
   const fields=draft[key]?.institution||{};
   if(v.me.investmentBusiness?.status!=='active'&&fields.launch){
    const n=rows.length;addGroup([[key,'institution']],'Open investment / brokerage expansion',{workspace:'group',view:'investment',context:{objectId:'funding'}});
    if(rows.length>n)rows.at(-1).description='Parent funding '+money(fields.capital)+' · launch, professional staff and permission applications are one expansion instruction.';
   }else{
    addGroup(['roles','maintain'].map(k=>[key,'institution',k]),'Investment services · employees and credentials',{workspace:'people',view:'staff',context:{employer:'investment'}});
    addGroup(['launch','capital','dividend','supportCap'].filter(k=>Object.hasOwn(fields,k)).map(k=>[key,'institution',k]),'Investment services · funding and launch',{workspace:'group',view:'investment',context:{objectId:'funding'}});
    addGroup(Object.keys(fields).filter(k=>!['roles','maintain','launch','capital','dividend','supportCap'].includes(k)).map(k=>[key,'institution',k]),'Investment services · business permissions and fees',{workspace:'group',view:'investment',context:{objectId:'operations'}});
   }
   for(const kind of ['funding','cashOrders','trades','notes'])array([key,kind],row=>row.clientId||row.id,id=>'Investment client '+clientName(id)+' · '+({funding:'account funding',cashOrders:'cash placement',trades:'portfolio order',notes:'fixed-term note'})[kind],id=>({workspace:'group',view:'investment',context:{clientId:id,mode:kind==='cashOrders'?'cash':kind}}));
   for(const field of Object.keys(draft[key]||{}).filter(k=>!['institution','funding','cashOrders','trades','notes'].includes(k)))walk(baseline[key]?.[field],draft[key][field],[key,field]);
  }else if(key==='companyCreditOrders')array([key],row=>row.companyId,id=>'Bank loan offer · '+companyName(id),id=>({workspace:'banking',view:'lending',context:{companyId:id,objectId:'company:'+id}}));
  else if(key==='companyShareOrders')array([key],row=>row.issuer,id=>'Company share order · '+companyName(id),id=>({workspace:'group',view:'companies',context:{issuerId:id,companyId:id,objectId:id,mode:'shares'}}));
  else if(key==='sharedPremisesPolicy'){
   addGroup(['build','cancel','remove'].map(k=>[key,k]),'Office service space · construction instruction',null);
   array([key,'allocations'],row=>row.room,id=>{const room=v.me.sharedPremises?.book.rooms.find(r=>r.id===id);return 'Local subsidiary time · '+officeName(room?.office||id);},id=>{const room=v.me.sharedPremises?.book.rooms.find(r=>r.id===id);return {workspace:'markets',view:'room',context:{office:room?.office,room:id}};});
  }else if(key==='groupPolicy'){
   for(const field of Object.keys(draft[key]||{}))if(field==='creditAllocation')addGroup([[key,field]],'Lending · origination portfolio',{workspace:'banking',view:'lending',context:{objectId:'portfolio'}});else walk(baseline[key]?.[field],draft[key][field],[key,field]);
  }else if(key==='productProgramPolicy'){
   for(const [market,segments]of Object.entries(draft[key].markets||{}))for(const [segment,mix]of Object.entries(segments)){
    const product=Object.keys(mix).find(k=>mix[k]!==baseline[key]?.markets?.[market]?.[segment]?.[k]);
    addGroup([[key,'markets',market,segment]],'Deposit sales · '+(v.territories[market]?.name||market)+' · '+segment,{workspace:'banking',view:'deposits',context:{productId:product,marketId:market,segment,mode:'sales'}});
   }
   for(const product of Object.keys(draft[key].pricingBp||{}))addGroup([[key,'pricingBp',product]],'Deposit pricing · '+(v.productPortfolios.retail.options[product]?.name||product),{workspace:'banking',view:'deposits',context:{productId:product,mode:'terms'}});
   array([key,'retire'],id=>id,id=>'Retire new sales · '+(v.productPortfolios.retail.options[id]?.name||id),id=>({workspace:'banking',view:'deposits',context:{productId:id,mode:'delivery',projectId:'retire'}}));
   for(const field of Object.keys(draft[key]).filter(k=>!['markets','pricingBp','retire'].includes(k)))walk(baseline[key]?.[field],draft[key][field],[key,field]);
  }else if(key==='companyControlPolicy'){
   for(const field of ['diligence','offer','cancel','defend']){
    const value=draft[key]?.[field]??baseline[key]?.[field],companyId=field==='diligence'?value:value?.companyId||value?.issuer||controlCompany(value);
    addGroup([[key,field]],'Company control · '+field+(companyId?' · '+companyName(companyId):''),{workspace:'group',view:'companies',context:{companyId,mode:'control',controlMode:field==='cancel'?'deal:'+value:field==='defend'?'incoming:'+value:field}});
   }
   array([key,'consents'],row=>row.offerId,id=>'Shareholder response · '+companyName(controlCompany(id)||id),id=>({workspace:'group',view:'companies',context:{companyId:controlCompany(id),mode:'control',controlMode:'incoming:'+id}}));
   array([key,'paused'],id=>id,id=>'Integration instruction · '+companyName(controlCompany(id)||id),id=>({workspace:'group',view:'companies',context:{companyId:controlCompany(id),mode:'control',controlMode:'deal:'+id}}));
  }else walk(baseline[key],draft[key],[key]);
 }
 for(const row of rows){
  if(row.path[0]==='facilityLifecyclePolicy'&&row.path[1]==='offices')row.title=officeName(row.path[2])+' · '+(row.path[3]==='staffQuarters'?'local '+row.path[4]+' time':row.path[3]==='hubId'?'hub support':'maintenance');
 }
 return rows;
}
function interfaceRestorePlanRow(v,row){
 if(!interfaceCurrent(interfaceToken(v)))return false;
 const next=JSON.parse(JSON.stringify(draft)),set=(path,value)=>{let obj=next;for(const key of path.slice(0,-1)){if(!obj[key]||typeof obj[key]!=='object')obj[key]={};obj=obj[key];}if(value===undefined)delete obj[path.at(-1)];else obj[path.at(-1)]=JSON.parse(JSON.stringify(value));};
 if(row.initiative){
  const key=row.path[1];next.newProjects=next.newProjects.filter(id=>id!==key);if(row.before)next.newProjects.push(key);next.newProject=next.newProjects[0]||null;
  if(next.projectTargets)delete next.projectTargets[key];if(row.before&&monthlyChangesState.baseline.projectTargets?.[key])next.projectTargets={...(next.projectTargets||{}),[key]:monthlyChangesState.baseline.projectTargets[key]};
  if(next.projectTargets&&!Object.keys(next.projectTargets).length)delete next.projectTargets;
 }else if(row.array){
  const a=row.array,current=a.path.reduce((o,k)=>o?.[k],next)||[];set(a.path,[...current.filter(item=>a.key(item)!==a.id),...a.before]);
 }else for(const patch of row.patches||[])set(patch.path,patch.before);
 const before=monthlyPlanReview(v,draft),after=monthlyPlanReview(v,next),prior=new Set(before.blockers.map(x=>x.id+'|'+x.text)),introduced=after.blockers.filter(x=>!prior.has(x.id+'|'+x.text));
 draft=next;interfaceState.message='Removed '+interfaceChangeTitle(v,row)+'. Other planned actions are retained.'+(introduced.length?' '+introduced.map(x=>x.text).join(' '):'');return true;
}
function interfacePendingEdits(v){
 const items=[];
 if(interfaceState.decision?.dirty)items.push({title:'Executive response has unstaged edits',text:'Add the selected response to your monthly plan, or discard its edits.',workspace:'month',view:'decision',context:{}});
 for(const name of ['pendingInterfaceMarketsEdits','pendingInterfaceFinanceEdits','pendingInterfacePeopleStrategyEdits']){
  const fn=name==='pendingInterfaceMarketsEdits'?(typeof pendingInterfaceMarketsEdits==='function'?pendingInterfaceMarketsEdits:null):name==='pendingInterfaceFinanceEdits'?(typeof pendingInterfaceFinanceEdits==='function'?pendingInterfaceFinanceEdits:null):(typeof pendingInterfacePeopleStrategyEdits==='function'?pendingInterfacePeopleStrategyEdits:null);
  if(fn)items.push(...fn(v));
 }
 return items.map((item,index)=>({id:'interface-unstaged-'+index,...item}));
}
// Existing engine reports supply every amount. Rows have different timing and
// owners; they must not be totalled into a second affordability calculation.
function interfaceRecurringCommitments(v,quote){
 const rows=[],add=(title,timing,read)=>{try{const value=read();rows.push({title,timing,value:Number.isFinite(value)?value:null,error:Number.isFinite(value)?'':'Quote unavailable'});}catch(error){rows.push({title,timing,value:null,error:error.message});}};
 if(v.digitalCommercialVersion===1){
  const a=v.me.outsideAdvance;
  if(a)add('Cedar Reserve Bank repayment','Due at end of month '+a.due+'; principal plus accrued interest, future interest additional',()=>E.OutsideFunding.liability(v.me));
  if(draft.outsideAdvanceAmount)add('Proposed one-month advance repayment','Principal and quoted interest due month '+(v.cycle+1)+' if funded',()=>{const x=E.OutsideFunding.quote(v,v.me,draft);return x.amount+x.interest;});
 }
 if(v.expandedBusinessVersion===1){
  let campaign=null,campaignError='';try{campaign=E.BrandCampaigns.quote(v,v.me,draft);}catch(e){campaignError=e.message;}
  const marketing=key=>{if(campaignError)throw Error(campaignError);return campaign[key];};
  add('Regular advertising','Bank pays this month; adjustable or pausable',()=>marketing('regularRequested'));
  add('Sponsorship payment / cancellation',(campaign?.endMonth?'Agreement ends month '+campaign.endMonth+'. ':'')+(campaign?'Future contracted payments '+overviewDollars(campaign.futurePayments):'Quote unavailable'),()=>marketing('sponsorDue'));
  add('Combined marketing this month','Regular advertising plus sponsorship; included in bank spending',()=>marketing('total'));
  add('Shared digital platform vendor','Bank pays monthly while licensed; included in operating costs',()=>E.ExpandedBusiness.monthlyCost(v.me));
  add('Holding-company share cash reserved','Parent funds only; separate from the bank spending budget',()=>E.HoldingCapital.quote(v,v.me,draft).spend);
 }
 let forecast=null,forecastError='';
 try{forecastError=departmentForecastIssue(v,draft)||'';if(!forecastError)forecast=E.operatingPreview(v.me,draft,v.economy,v,true);}catch(error){forecastError=error.message;}
 for(const [title,key]of [['Bank employee base payroll','incomeSource_basePayroll'],['Bank specialist premiums','specialistPayroll'],['Bank office upkeep','incomeSource_facilityUpkeep'],['Bank office maintenance','facilityMaintenance'],['Bank deposit / debt funding expense','fundingCost']])add(title,'Current-month operating estimate',()=>{if(forecastError)throw Error(forecastError);return forecast?.[key];});
 if(v.me.departmentOffice)add('Bank department leaders · salaries','Planned leaders; recurring compensation',()=>E.departmentBudgetQuote(v.me,draft,v)?.leadership.salary);
 if(E.planHires(draft)>0){add('New bank employees · base payroll','Additional from next month, before efficiency',()=>quote?.basePayrollAdded);if(v.me.workforce)add('New bank specialists · payroll premiums','Additional from next month, before efficiency',()=>quote?.specialistPayrollAdded);}
 for(const id of E.planInitiatives(draft))if(v.projects[id]?.kind==='branch'||v.projects[id]?.regionalOnly){const market=E.projectPlanTarget(draft,id)||draft.focus;add((v.projects[id]?.name||id)+' · '+(v.territories[market]?.name||market),'Individual upkeep change after completion',()=>E.regionalProjectPreview(v.me,id,market)?.expense);}
 if(draft.facilityPolicy?.convert)add('Office conversion · completed upkeep','After activation; replaces this office’s prior upkeep',()=>E.facilityInstructionQuote(v,v.me,draft).quote?.after?.expense);
 if(draft.facilityExtensionPolicy?.start)add('Commercial banking suite','Additional after opening, before maintenance',()=>E.COMMERCIAL_SUITE.upkeep);
 if(draft.sharedPremisesPolicy?.build){const kind=draft.sharedPremisesPolicy.build.kind;add(E.SharedPremises.CATALOG[kind]?.name||kind,'Additional after opening, before host maintenance',()=>E.SharedPremises.CATALOG[kind]?.upkeep);}
 if(v.me.agency&&(v.me.agency.status==='active'||draft.agencyPolicy?.launch))add('Insurance agency · operating costs','Agency pays; current planned employees and outreach',()=>E.agencyQuote(v.me,draft.agencyPolicy).monthlyExpense);
 if(v.me.investmentBusiness&&(v.me.investmentBusiness.status==='active'||draft.investmentPolicy?.institution?.launch))add('Investment business · recurring operating costs','Subsidiary pays; includes due credential upkeep',()=>E.InvestmentInstitution.quote(v.me.investmentBusiness,draft.investmentPolicy.institution,v.me.investmentBusiness.month+1).recurring);
 return rows;
}
function interfaceRecurringMarkup(v,quote){
 const rows=interfaceRecurringCommitments(v,quote);
 return '<p>Operating costs continue beyond this month’s setup and recruitment payments. These engine estimates have different timing and payers; they are not a second spending budget.</p><div class="table-wrap" tabindex="0" aria-label="Recurring commitments"><table><thead><tr><th>Commitment</th><th>Timing / payer</th><th>Monthly amount</th></tr></thead><tbody>'+rows.map(row=>'<tr><th>'+esc(row.title)+'</th><td>'+esc(row.timing)+(row.error?'<br><span class="bad">'+esc(row.error)+'</span>':'')+'</td><td>'+overviewDollars(row.value)+'</td></tr>').join('')+'</tbody></table></div><p class="small">Current-month estimates exclude uncertain wins and future project completions. New-site previews describe each project separately; staffing, maintenance, efficiency and other simultaneous changes can alter the eventual bill. Existing debt, deposits and customer commitments remain active. Removing a new instruction does not close an operating business.</p>';
}
