// Multi-entity premises domain. Explicit 9.27 campaign integration connects
// reservations to the actual service dispatchers; older rules remain unchanged.
// Buildings supply space, never licences, employees, customers or spendable AUM.
const SharedPremises=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),whole=n=>Number.isSafeInteger(n)&&n>=0;
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 const spec=(name,space,cost,work,execution,upkeep,seats,roles)=>Object.freeze({name,space,cost,work,execution,upkeep,seats,roles:Object.freeze(roles)});
 const CATALOG=Object.freeze({
  visiting:spec('Visiting-adviser desk',1,45000,1,.5,900,1,['adviser']),
  wealth:spec('Permanent wealth suite',1,160000,2,1,3500,4,['adviser','broker','operations']),
  agency:spec('Insurance agency office',1,110000,2,1,2600,4,['propertyProducer','benefitsProducer','servicing']),
  advisoryWing:spec('Shared advisory wing',2,280000,3,1.5,6000,8,['adviser','broker','operations','propertyProducer','benefitsProducer','servicing']),
  additionalPremises:spec('Additional multi-service premises',0,420000,4,1.5,5500,0,[])
 });
 const SPACE=Object.freeze({atm:0,retail:1,commercial:1,digital:1,wealth:2,financialCenter:3,regionalHub:3});
 const permission={adviser:'advice',broker:'brokerage',operations:'investmentOperations',propertyProducer:'insuranceProperty',benefitsProducer:'insuranceBenefits',servicing:'insuranceService'};
 // Investment operations also support externally custodied firms. Retain the
 // old explicit custody permission as an accepted domain-input alias.
 const authorized=(tenant,role)=>tenant.permissions.includes(permission[role])||(role==='operations'&&tenant.permissions.includes('custody'));
 const roles=Object.freeze(Object.keys(permission));
 function premisesOpening(){return {version:1,month:0,nextId:1,rooms:[],arrears:{},externalDue:0,report:null};}
 function premisesValidate(b){
  if(!exact(b,['version','month','nextId','rooms','arrears','externalDue','report'])||b.version!==1||!whole(b.month)||!whole(b.externalDue)||!whole(b.nextId)||b.nextId<1||!Array.isArray(b.rooms)||b.rooms.length>4096||!b.arrears||Array.isArray(b.arrears))throw Error('Invalid shared-premises book.');
  const ids=new Set();
  for(const r of b.rooms){
   const d=CATALOG[r?.kind];
   if(!exact(r,['id','office','kind','started','work','ready'])||!whole(r.id)||r.id<1||r.id>=b.nextId||ids.has(r.id)||typeof r.office!=='string'||!r.office.length||!d||!whole(r.started)||r.started<1||r.started>b.month||!Number.isFinite(r.work)||r.work<0||r.work>d.work||
    (r.ready===null?r.work===d.work:!whole(r.ready)||r.ready<=r.started||r.ready>b.month+1||r.work!==d.work))throw Error('Invalid shared service space.');
   ids.add(r.id);
  }
  for(const [id,n]of Object.entries(b.arrears))if(!id.length||!whole(n)||!n)throw Error('Invalid occupancy obligation.');
  if(b.report!==null&&(!exact(b.report,['month','construction','outsideCost','externalPaid','externalUnpaid','invoiced','received','unfunded','execution','delivery'])||b.report.month!==b.month||!['construction','outsideCost','externalPaid','externalUnpaid','invoiced','received','unfunded'].every(k=>whole(b.report[k]))||b.report.externalUnpaid!==b.externalDue||!Number.isFinite(b.report.execution)||b.report.execution<0||!Array.isArray(b.report.delivery)))throw Error('Invalid shared-premises report.');
  return b;
 }
 function premisesContext(c){
  if(!c||!whole(c.month)||c.month<1||!Array.isArray(c.offices)||!Number.isFinite(c.execution)||c.execution<0||!whole(c.cash)||!c.tenants||Array.isArray(c.tenants))throw Error('Current premises resources are required.');
  const ids=new Set();
  for(const o of c.offices){
   if(!exact(o,['id','model','market','closed','condition','maintenance','legacySpace','busy'])||typeof o.id!=='string'||!o.id.length||ids.has(o.id)||!Object.hasOwn(SPACE,o.model)||typeof o.market!=='string'||!o.market.length||typeof o.closed!=='boolean'||typeof o.busy!=='boolean'||!whole(o.condition)||o.condition>10000||!['off','basic','full'].includes(o.maintenance)||!whole(o.legacySpace))throw Error('Invalid current premises host.');
   ids.add(o.id);
  }
  for(const [id,t]of Object.entries(c.tenants)){
   if(!id.length||['__proto__','constructor','prototype'].includes(id)||!exact(t,['available','permissions','cash'])||!whole(t.cash)||!exact(t.available,roles)||Object.values(t.available).some(n=>!whole(n)||n>1600)||!Array.isArray(t.permissions)||new Set(t.permissions).size!==t.permissions.length||t.permissions.some(k=>k!=='custody'&&!Object.values(permission).includes(k)))throw Error('Qualified residual tenant time and protected cash are required.');
  }
 }
 function premisesActive(r,month){return r.ready!==null&&r.ready<=month;}
 function premisesSpace(b,o,month){
  const rooms=b.rooms.filter(r=>r.office===o.id),expansion=rooms.some(r=>r.kind==='additionalPremises'&&premisesActive(r,month));
  return {total:SPACE[o.model]+(expansion?3:0),used:o.legacySpace+rooms.reduce((n,r)=>n+CATALOG[r.kind].space,0)};
 }
 function premisesDefaultPlan(){return {build:null,cancel:null,remove:null,allocations:[]};}
 function premisesReview(b,plan,c){
  premisesValidate(b);premisesContext(c);
  if(c.month!==b.month+1)throw Error('Premises review belongs to a different month.');
  if(!exact(plan,['build','cancel','remove','allocations'])||!Array.isArray(plan.allocations)||plan.allocations.length>4096||[plan.cancel,plan.remove].some(n=>n!==null&&(!whole(n)||n<1))||[plan.build,plan.cancel,plan.remove].filter(x=>x!==null).length>1)throw Error('Choose one construction, cancellation or removal instruction.');
  const next=copy(b),find=id=>next.rooms.find(r=>r.id===id),host=id=>c.offices.find(o=>o.id===id);
  if(plan.cancel!==null){const r=find(plan.cancel);if(!r||r.ready!==null)throw Error('Only unfinished fit-out can be cancelled.');next.rooms=next.rooms.filter(x=>x.id!==r.id);}
  if(plan.remove!==null){const r=find(plan.remove);if(!r||!premisesActive(r,c.month))throw Error('Only open service space can be removed.');next.rooms=next.rooms.filter(x=>x.id!==r.id);}
  for(const o of c.offices){const s=premisesSpace(next,o,c.month);if(s.used>s.total)throw Error('Remove excess service space before reducing the host building or its additional premises.');}
  let construction=0,newExecution=0;
  if(plan.build!==null){
   if(!exact(plan.build,['office','kind'])||!Object.hasOwn(CATALOG,plan.build.kind))throw Error('Choose a known fit-out.');
   const o=host(plan.build.office),d=CATALOG[plan.build.kind];
   if(!o||o.closed||!SPACE[o.model])throw Error('Choose an operating staffed-office model; ATM sites cannot host service suites.');
   if(o.busy||next.rooms.some(r=>r.ready===null&&host(r.office)?.market===o.market))throw Error('Complete or cancel existing construction in this market first.');
   if(plan.build.kind==='additionalPremises'&&next.rooms.some(r=>r.office===o.id&&r.kind==='additionalPremises'))throw Error('This location already has additional premises.');
   const s=premisesSpace(next,o,c.month);if(s.used+d.space>s.total)throw Error('Not enough service space. Complete additional premises or remove another suite.');
   construction=d.cost;newExecution=d.execution;
   next.rooms.push({id:next.nextId++,office:o.id,kind:plan.build.kind,started:c.month,work:0,ready:null});
  }
  const committed=next.rooms.filter(r=>r.ready===null&&!host(r.office)?.closed).reduce((n,r)=>n+CATALOG[r.kind].execution,0);
  if(newExecution&&committed>c.execution)throw Error('Fit-out exceeds shared construction capacity.');
  const seen=new Set(),reserved={},used={},delivery=[];
  for(const a of plan.allocations){
   if(!exact(a,['room','entity','role','quarters'])||!whole(a.room)||!whole(a.quarters)||a.quarters<1||!roles.includes(a.role))throw Error('Assign qualified service time in quarter employee-months.');
   const r=find(a.room),t=c.tenants[a.entity],o=r&&host(r.office),key=a.room+'|'+a.entity+'|'+a.role;
   if(!r||!o||o.closed||!premisesActive(r,c.month)||!CATALOG[r.kind].roles.includes(a.role)||!t||!authorized(t,a.role)||seen.has(key))throw Error('An open, compatible room and currently authorized tenant are required.');
   seen.add(key);reserved[a.entity]??=Object.fromEntries(roles.map(k=>[k,0]));reserved[a.entity][a.role]+=a.quarters;
   if(reserved[a.entity][a.role]>t.available[a.role])throw Error('The same professional time cannot serve several offices or other commitments twice.');
   used[r.id]=(used[r.id]||0)+a.quarters;if(used[r.id]>CATALOG[r.kind].seats)throw Error('Local desk time exceeds the space limit.');
   // Condition reduces delivered time, not paid or reserved time. No licence or
   // employee is inferred from an office name. Dispatchers consume these routes.
   delivery.push({...copy(a),office:o.id,market:o.market,effectiveQuarters:a.quarters*(o.condition<1500?0:o.condition/10000)});
  }
  const charges=[],tenantInvoices={};let outsideCost=0;
  for(const r of next.rooms){
   const o=host(r.office);if(!o)throw Error('Service space lost its identified office.');
   if(o.closed||!premisesActive(r,c.month))continue;
   const d=CATALOG[r.kind],cost=d.upkeep+Math.round(d.upkeep*({off:0,basic:.06,full:.12}[o.maintenance]));outsideCost+=cost;
   // Reimburse actual incremental occupied cost. Unoccupied space and expanded
   // shell overhead remain the landlord bank's expense, not invented rent profit.
   const tenantTime={};for(const a of delivery.filter(a=>a.room===r.id))tenantTime[a.entity]=(tenantTime[a.entity]||0)+a.quarters;
   let billed=0;for(const entity of Object.keys(tenantTime).sort()){const amount=Math.floor(cost*tenantTime[entity]/d.seats);tenantInvoices[entity]=(tenantInvoices[entity]||0)+amount;billed+=amount;}
   charges.push({room:r.id,office:o.id,cost,billed});
  }
  if(construction&&construction+outsideCost+b.externalDue>c.cash)throw Error('Fund fit-out and recurring premises costs from existing bank cash. Tenant reimbursements are not advance funding.');
  if(outsideCost+b.externalDue>c.cash-construction)for(const row of delivery)row.effectiveQuarters=0;
  return {book:next,construction,outsideCost,committed,delivery,reserved,charges,tenantInvoices};
 }
 function premisesSettle(b,plan,c,bank,tenantBooks,supplier){
  premisesValidate(b);premisesContext(c);AccountingPrototype.check(bank);GroupAccounting.validate(supplier);
  if(c.month===b.month)return {book:copy(b),bank:copy(bank),tenants:copy(tenantBooks),supplier:copy(supplier),duplicate:true};
  if(c.cash>bank.accounts.cash)throw Error('Spendable premises cash exceeds the bank account.');
  const q=premisesReview(b,plan,c),next=q.book,tenants=copy(tenantBooks);let bankBook=copy(bank),outside=copy(supplier),received=0,invoiced=0;
  const tenantIds=new Set();for(const [id,t]of Object.entries(tenants)){
   GroupAccounting.validate(t);if(t.entityId!==id||t.entityId===supplier.entityId||tenantIds.has(t.entityId))throw Error('Outside supplier and occupying entities must have distinct matching identities.');tenantIds.add(t.entityId);
  }
  if(Object.values(next.arrears).reduce((n,v)=>n+v,0)>bankBook.accounts.receivables)throw Error('Internal occupancy obligations lost their bank claim.');
  const cash=()=>BigInt(bankBook.accounts.cash)+BigInt(outside.accounts.cash)+Object.values(tenants).reduce((n,t)=>n+BigInt(t.accounts.cash),0n),before=cash();
  if(next.externalDue>bankBook.accounts.payables||next.externalDue>outside.accounts.businessAssets)throw Error('Outside premises debt lost its matching claim.');
  if(q.construction){bankBook=AccountingPrototype.post(bankBook,'premises.fitout',{cash:-q.construction,equity:-q.construction},-q.construction);outside=GroupAccounting.post(outside,'premises.fitout','bank',{cash:q.construction,equity:q.construction},q.construction);}
  if(q.outsideCost){bankBook=AccountingPrototype.post(bankBook,'premises.outsideInvoice',{payables:q.outsideCost,equity:-q.outsideCost},-q.outsideCost);outside=GroupAccounting.post(outside,'premises.outsideInvoice','bank',{businessAssets:q.outsideCost,equity:q.outsideCost},q.outsideCost);next.externalDue+=q.outsideCost;}
  const externalPaid=Math.min(next.externalDue,Math.max(0,c.cash-q.construction));
  if(externalPaid){bankBook=AccountingPrototype.post(bankBook,'premises.outsidePaid',{cash:-externalPaid,payables:-externalPaid});outside=GroupAccounting.post(outside,'premises.outsidePaid','bank',{cash:externalPaid,businessAssets:-externalPaid});next.externalDue-=externalPaid;}
  for(const id of new Set([...Object.keys(next.arrears),...Object.keys(q.tenantInvoices)])){
   let t=tenants[id];if(!t||t.entityId!==id||!Object.hasOwn(c.tenants,id)||c.tenants[id].cash>t.accounts.cash||(next.arrears[id]||0)>t.accounts.payables)throw Error('Occupancy charges require the actual tenant entity book, protected cash and matching obligations.');GroupAccounting.validate(t);
   const amount=q.tenantInvoices[id]||0;invoiced+=amount;
   if(amount){t=GroupAccounting.post(t,'premises.invoice','bank',{payables:amount,equity:-amount},-amount);bankBook=AccountingPrototype.post(bankBook,'premises.invoice',{receivables:amount,equity:amount},amount);}
   const owed=(next.arrears[id]||0)+amount,paid=Math.min(owed,c.tenants[id].cash);received+=paid;
   if(paid){t=GroupAccounting.settlePayable(t,paid,'bank:premises');bankBook=AccountingPrototype.post(bankBook,'premises.receipt',{cash:paid,receivables:-paid});}
   if(owed>paid)next.arrears[id]=owed-paid;else delete next.arrears[id];tenants[id]=t;
  }
  let execution=0;
  for(const r of next.rooms){
   if(r.ready!==null||c.offices.find(o=>o.id===r.office).closed)continue;
   const d=CATALOG[r.kind];if(execution+d.execution>c.execution)continue;
   execution+=d.execution;r.work=Math.min(d.work,r.work+1);if(r.work===d.work)r.ready=c.month+1;
  }
  next.month=c.month;next.report={month:c.month,construction:q.construction,outsideCost:q.outsideCost,externalPaid,externalUnpaid:next.externalDue,invoiced,received,unfunded:Object.values(next.arrears).reduce((n,x)=>n+x,0),execution,delivery:q.delivery};
  premisesValidate(next);AccountingPrototype.check(bankBook);for(const t of Object.values(tenants))GroupAccounting.validate(t);GroupAccounting.validate(outside);
  if(cash()!==before)throw Error('Premises cash did not conserve.');
  return {book:next,bank:bankBook,tenants,supplier:outside,duplicate:false};
 }
 // Integration input, not a saved feature map. Only an explicit caller supplies
 // this contract; existing campaigns never acquire local delivery implicitly.
 // Recompute the premises quote, then cap it against the newly prepared REAL
 // institution workforce (after education and provider-migration reservations).
 function premisesInvestmentDelivery(input,entities,month){
  if(!exact(input,['version','month','sites'])||input.version!==1||input.month!==month||!Array.isArray(input.sites)||input.sites.length!==entities.length)throw Error('Invalid current investment premises delivery.');
  const result=entities.map(e=>{
   InvestmentInstitution.validate(e);if(e.month!==month)throw Error('Prepare investment staff before local delivery.');
   const p=e.report?.permitted,available=p?.available||{adviser:0,broker:0,operations:0};
   return {owner:e.owner,central:{advice:p?.advice?available.adviser/4*InvestmentInstitution.ROLES.adviser.capacity:0,brokerage:p?.brokerage?available.broker/4*InvestmentInstitution.ROLES.broker.capacity:0,
    operations:available.operations/4*InvestmentInstitution.ROLES.operations.capacity,custody:p?.custodyCapacity||0},local:[],reserved:{adviser:0,broker:0,operations:0}};
  });
  for(const [i,site]of input.sites.entries()){
   if(!exact(site,['book','plan','context'])||site.context?.month!==month)throw Error('Invalid investment premises source.');
   const q=premisesReview(site.book,site.plan,site.context);
   for(const a of q.delivery){
    const index=entities.findIndex(e=>e.book.entityId===a.entity);if(index<0)continue; // Other authorized tenants are settled by their own dispatcher.
    if(index!==i)throw Error('Premises may not dispatch the rival investment workforce.');
    const e=entities[index],p=e.report?.permitted,r=result[index],service={adviser:'advice',broker:'brokerage',operations:'operations'}[a.role];
    if(!service||(a.role==='operations'?e.status!=='active'||!p?.available.operations||e.book.accounts.payables>0:!p?.[service]))throw Error('Local investment delivery requires current qualified permission.');
    r.reserved[a.role]+=a.quarters;
    if(r.reserved[a.role]>p.available[a.role])throw Error('Local investment work duplicates prepared professional time.');
    const factor=InvestmentInstitution.ROLES[a.role].capacity/4,spent=a.quarters*factor,delivered=Math.floor(a.effectiveQuarters*factor);
    if(a.role==='operations'){
     r.central.operations-=spent-delivered;
     if(p.custody)r.central.custody=Math.max(0,r.central.custody-(spent-delivered));
    }else{
     r.central[service]-=spent;
     let local=r.local.find(x=>x.market===a.market);if(!local){local={market:a.market,advice:0,brokerage:0};r.local.push(local);}
     local[service]+=delivered;
    }
   }
  }
  for(const r of result){r.local.sort((a,b)=>a.market<b.market?-1:a.market>b.market?1:0);for(const k of Object.keys(r.central))r.central[k]=Math.floor(r.central[k]);}
  return result;
 }
 function premisesAgencyDelivery(input,players,month){
  if(!exact(input,['version','month','sites'])||input.version!==1||input.month!==month||!Array.isArray(input.sites)||input.sites.length!==players.length)throw Error('Invalid current agency premises delivery.');
  const result=players.map(p=>{
   const a=p.agency;if(a?.version!==2||a.report?.cycle!==month)throw Error('Prepare the qualified agency workforce before local delivery.');
   validateAgencyProfessionals(p,month);
   const status=agencyDelivery(p,month),available=Object.fromEntries(Object.keys(AGENCY_PROFESSIONAL_ROLES).map(k=>[k,0]));
   if(a.status==='active'&&status.phase==='authorized')for(const e of a.professionals.employees){
    if(!AGENCY_PROFESSIONAL_ROLES[e.role].credential||e.credentialThrough>=month)available[e.role]+=a.professionals.report?.renewed.includes(e.id)?3:4;
   }
   return {owner:p.id,central:{units:a.status==='active'?status.units:0,producers:{...status.producers}},local:[],available,reserved:Object.fromEntries(Object.keys(available).map(k=>[k,0]))};
  });
  for(const [i,site]of input.sites.entries()){
   if(!exact(site,['book','plan','context'])||site.context?.month!==month)throw Error('Invalid agency premises source.');
   const q=premisesReview(site.book,site.plan,site.context);
   for(const a of q.delivery){
    const index=players.findIndex(p=>p.agency.book.entityId===a.entity);if(index<0)continue;
    if(index!==i)throw Error('Premises may not dispatch the rival agency workforce.');
    const d=AGENCY_PROFESSIONAL_ROLES[a.role],r=result[index];
    if(!d||!Object.hasOwn(r.reserved,a.role)||players[index].agency.status!=='active')throw Error('Local insurance delivery requires a qualified agency role.');
    r.reserved[a.role]+=a.quarters;
    if(r.reserved[a.role]>r.available[a.role])throw Error('Local agency work duplicates prepared professional time.');
    r.central.units-=a.quarters/4*d.units;
    let local=r.local.find(x=>x.market===a.market);if(!local){local={market:a.market,units:0,producers:Object.fromEntries(Object.keys(AGENCY_PRODUCTS).map(k=>[k,0]))};r.local.push(local);}
    local.units+=a.effectiveQuarters/4*d.units;
    for(const product of d.products){r.central.producers[product]-=a.quarters/4;local.producers[product]+=a.effectiveQuarters/4;}
   }
  }
  for(const r of result){r.local.sort((a,b)=>a.market<b.market?-1:a.market>b.market?1:0);for(const pool of [r.central,...r.local]){
   pool.units=Math.floor(pool.units);pool.acquisitions=Object.fromEntries(Object.entries(pool.producers).map(([k,v])=>[k,Math.floor(v*2)]));
  }}
  return result;
 }
 // Settle the identified internal creditor BEFORE a subsidiary's existing
 // outside-creditor wind-down. Never send the landlord's claim to the supplier.
 // Cash is shared proportionately with other due payables; unpaid internal
 // claims are extinguished on both books, not turned into group income.
 function premisesReleaseTenant(b,bank,tenant){
  premisesValidate(b);AccountingPrototype.check(bank);GroupAccounting.validate(tenant);
  const next=copy(b),id=tenant.entityId,owed=next.arrears[id]||0;
  if(owed>bank.accounts.receivables||owed>tenant.accounts.payables)throw Error('Occupancy wind-down lost its matching claim.');
  if(!owed)return {book:next,bank:copy(bank),tenant:copy(tenant),paid:0,writtenOff:0};
  const paid=Number(BigInt(Math.min(tenant.accounts.cash,tenant.accounts.payables))*BigInt(owed)/BigInt(tenant.accounts.payables)),writtenOff=owed-paid;
  let bankBook=copy(bank),tenantBook=copy(tenant);
  if(paid){tenantBook=GroupAccounting.settlePayable(tenantBook,paid,'bank:premises');bankBook=AccountingPrototype.post(bankBook,'premises.closureReceipt',{cash:paid,receivables:-paid});}
  if(writtenOff){tenantBook=GroupAccounting.post(tenantBook,'premises.creditorRelease','bank',{payables:-writtenOff,equity:writtenOff},writtenOff);bankBook=AccountingPrototype.post(bankBook,'premises.creditorLoss',{receivables:-writtenOff,equity:-writtenOff},-writtenOff);}
  delete next.arrears[id];if(next.report){next.report.received+=paid;next.report.unfunded=Object.values(next.arrears).reduce((n,v)=>n+v,0);}
  premisesValidate(next);AccountingPrototype.check(bankBook);GroupAccounting.validate(tenantBook);
  if(BigInt(bankBook.accounts.cash)+BigInt(tenantBook.accounts.cash)!==BigInt(bank.accounts.cash)+BigInt(tenant.accounts.cash)||BigInt(bankBook.accounts.equity)+BigInt(tenantBook.accounts.equity)!==BigInt(bank.accounts.equity)+BigInt(tenant.accounts.equity))throw Error('Internal occupancy wind-down did not reconcile.');
  return {book:next,bank:bankBook,tenant:tenantBook,paid,writtenOff};
 }
 return Object.freeze({CATALOG,SPACE,roles,opening:premisesOpening,validate:premisesValidate,defaultPlan:premisesDefaultPlan,space:premisesSpace,review:premisesReview,settle:premisesSettle,investmentDelivery:premisesInvestmentDelivery,agencyDelivery:premisesAgencyDelivery,releaseTenant:premisesReleaseTenant});
})();
