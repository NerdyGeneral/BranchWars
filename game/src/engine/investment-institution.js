// Investment-service institutions: legal formation, funded qualified employees,
// maintained permissions and delivery are separate from buildings/client assets.
// Provisional compressed game costs/times, not statutory licensing requirements.
// Used by explicit investmentServicesVersion1 campaigns. Wider securities,
// provider-source and sweep integration remain in progress.
const InvestmentInstitution=(()=>{
 const ROLES=Object.freeze({
  adviser:Object.freeze({name:'Investment adviser',salary:6500,capacity:200,qualified:true}),
  broker:Object.freeze({name:'Brokerage representative',salary:6000,capacity:250,qualified:true}),
  principal:Object.freeze({name:'Securities principal',salary:8500,capacity:0,qualified:true}),
  operations:Object.freeze({name:'Investment operations',salary:4200,capacity:500,qualified:true})
 });
 const PROVIDERS=Object.freeze({
  atlas:Object.freeze({name:'Atlas Carrying & Custody',monthly:1500,annualBp:12,service:1}),
  harbor:Object.freeze({name:'Harbor Investment Services',monthly:600,annualBp:20,service:.9})
 });
 const RULES=Object.freeze({formation:18000,recruitment:6000,credentialCheck:500,
  adviceApplication:12000,brokerApplication:30000,custodyImplementation:180000,
  migration:25000,permissionMonths:12,renewal:3000,education:750,
  overhead:1200,externalControls:1500,ownedControls:9000,clearing:750,
  capitalExternal:120000,capitalOwned:500000,maxEmployees:16,maxSupport:100000,
  reserveMonths:3,clientAssetLimit:1000000000000});
 const copy=x=>JSON.parse(JSON.stringify(x));
 const exact=(x,keys)=>{if(!x||typeof x!=='object'||Array.isArray(x))return false;const own=Object.keys(x);if(own.length!==keys.length)return false;const set=new Set(keys);if(set.size!==keys.length)return false;for(let i=0;i<own.length;i++)if(!set.has(own[i]))return false;return true;};
 const whole=n=>Number.isSafeInteger(n)&&n>=0;
 const zeroRoles=()=>Object.fromEntries(Object.keys(ROLES).map(k=>[k,0]));
 const noPermission=()=>({applied:0,ready:0,validThrough:0});
 function investmentInstitutionOpening(id){
  if(typeof id!=='string'||!id.length||id.length>50)throw Error('Invalid investment institution owner.');
  return {version:1,owner:id,status:'unopened',book:GroupAccounting.opening(id+':investments'),
   month:0,opened:0,nextEmployee:1,employees:[],capitalBasis:0,
   permissions:{advice:noPermission(),brokerage:noPermission(),custody:noPermission()},
   policy:{advice:true,brokerage:false,custody:'external',provider:'atlas',maintain:true,feeBp:90,supportCap:0},
   migration:null,report:null,closure:null,closures:0};
 }
 function investmentInstitutionDefaults(entity){return {launch:false,capital:0,dividend:0,roles:investmentInstitutionCounts(entity),...entity.policy,...(entity.migration?entity.migration.to:{})};}
 function investmentInstitutionCounts(entity){const out=zeroRoles();for(const e of entity.employees)out[e.role]++;return out;}
 function investmentInstitutionNormalize(entity,input){
  const keys=['launch','capital','dividend','roles','advice','brokerage','custody','provider','maintain','feeBp','supportCap'];
  if(!exact(input,keys)||typeof input.launch!=='boolean'||!whole(input.capital)||input.capital>1000000000||!whole(input.dividend)||
   !exact(input.roles,Object.keys(ROLES))||Object.values(input.roles).some(n=>!whole(n)||n>RULES.maxEmployees)||
   Object.values(input.roles).reduce((n,x)=>n+x,0)>RULES.maxEmployees||
   !['advice','brokerage','maintain'].every(k=>typeof input[k]==='boolean')||
   !['external','owned'].includes(input.custody)||!Object.hasOwn(PROVIDERS,input.provider)||
   ![60,90,120].includes(input.feeBp)||!whole(input.supportCap)||input.supportCap>RULES.maxSupport)
   throw Error('Invalid investment-service instructions.');
  if(input.capital&&input.dividend)throw Error('Choose one investment-subsidiary capital direction.');
  if(input.launch&&entity.status==='active')throw Error('The investment subsidiary already exists.');
  if(entity.status!=='active'&&!input.launch&&(input.capital||input.dividend||Object.values(input.roles).some(Boolean)))
   throw Error('Form and fund the investment subsidiary before staffing it.');
  if(input.launch&&!input.advice&&!input.brokerage)throw Error('Choose the service the new institution will provide.');
  if(input.custody==='owned'&&!input.brokerage)throw Error('Owned carrying requires the brokerage permission, not merely an adviser or building.');
  if(entity.migration&&(input.custody!==entity.migration.to.custody||input.provider!==entity.migration.to.provider))
   throw Error('Finish the funded provider migration before ordering another delivery change.');
  return copy(input);
 }
 function investmentInstitutionCredentialStatus(entity,cycle,renewed=[]){
  const available=Object.fromEntries(Object.keys(ROLES).map(k=>[k,0]));
  for(const e of entity.employees)if(e.joined<=cycle&&e.credentialThrough>=cycle)
   available[e.role]+=renewed.includes(e.id)?3:4;
  return available;
 }
 function investmentInstitutionPermissionState(entity,cycle,available=investmentInstitutionCredentialStatus(entity,cycle)){
  const operatingFunded=entity.book.accounts.payables===0&&entity.book.accounts.equity>=
   (entity.policy.custody==='owned'?RULES.capitalOwned:RULES.capitalExternal);
  const live=key=>{const p=entity.permissions[key];return p.applied>0&&p.ready<=cycle&&p.validThrough>=cycle;};
  const advice=entity.status==='active'&&operatingFunded&&entity.policy.advice&&live('advice')&&available.adviser>0;
  const brokerage=entity.status==='active'&&operatingFunded&&entity.policy.brokerage&&live('brokerage')&&available.broker>0&&available.principal>=3;
  const carryingPermitted=brokerage&&entity.policy.custody==='owned'&&live('custody')&&available.operations>=3;
  const reasons=[];
  if(entity.status==='unopened')reasons.push('Subsidiary not formed');
  else if(entity.status==='closed')reasons.push('Investment operations are closed; a funded restart requires new staff and permissions');
  else if(!operatingFunded)reasons.push('Unpaid obligations or operating capital below its safeguard');
  if(entity.policy.advice&&!advice)reasons.push('Advice needs current registration and available qualified advisers');
  if(entity.policy.brokerage&&!brokerage)reasons.push('Brokerage needs current registration, representatives and a principal');
  if(entity.policy.custody==='owned'&&!carryingPermitted)reasons.push('Owned carrying needs funded controls and qualified custody operations');
  return {advice,brokerage,custody:carryingPermitted,available,reasons,
   accountCapacity:Math.floor((advice?available.adviser/4*ROLES.adviser.capacity:0)+(brokerage?available.broker/4*ROLES.broker.capacity:0)),
   custodyCapacity:carryingPermitted?Math.floor(available.operations/4*ROLES.operations.capacity):0};
 }
 function investmentInstitutionQuote(entity,input,cycle){
  if(!Number.isSafeInteger(cycle)||cycle!==entity.month+1)throw Error('Investment quote belongs to a different month.');
  const s=investmentInstitutionNormalize(entity,input),next=copy(entity),old=investmentInstitutionCounts(entity),renewed=[];
  let upfront=0,renewal=0,education=0,hires=0,releases=0;
  if(s.launch){next.status='active';next.opened=cycle;upfront+=RULES.formation;}
  if(next.status!=='active'){next.report=null;return {entity:next,policy:s,upfront:0,recurring:0,total:0,reserve:0,minimumCapital:0,requiredFunding:0,hires:0,releases:0,permissions:investmentInstitutionPermissionState(next,cycle)};}
  const employees=[];
  for(const role of Object.keys(ROLES)){
   const retained=next.employees.filter(e=>e.role===role).slice(0,s.roles[role]);employees.push(...retained);releases+=Math.max(0,old[role]-s.roles[role]);
   for(let n=retained.length;n<s.roles[role];n++){
    hires++;employees.push({id:next.owner+':investment-worker:'+next.nextEmployee++,role,joined:cycle+1,credentialThrough:cycle+RULES.permissionMonths});
   }
  }
  next.employees=employees;upfront+=hires*(RULES.recruitment+RULES.credentialCheck);
  for(const e of employees)if(s.maintain&&e.joined<=cycle&&e.credentialThrough<cycle){e.credentialThrough=cycle+RULES.permissionMonths-1;education+=RULES.education;renewed.push(e.id);}
  for(const [key,enabled,cost,delay]of [['advice',s.advice,RULES.adviceApplication,2],['brokerage',s.brokerage,RULES.brokerApplication,3],['custody',s.custody==='owned',RULES.custodyImplementation,4]]){
   const p=next.permissions[key];
   if(enabled&&!p.applied){next.permissions[key]={applied:cycle,ready:cycle+delay,validThrough:cycle+delay+RULES.permissionMonths-1};upfront+=cost;}
   else if(enabled&&s.maintain&&p.applied&&p.validThrough<cycle){p.validThrough=cycle+RULES.permissionMonths-1;renewal+=RULES.renewal;}
  }
  const changed=!s.launch&&!entity.migration&&(s.custody!==entity.policy.custody||s.provider!==entity.policy.provider);
  if(changed){
   next.migration={from:{custody:entity.policy.custody,provider:entity.policy.provider},to:{custody:s.custody,provider:s.provider},started:cycle,work:0,required:s.custody==='owned'?4:3};upfront+=RULES.migration;
  }
  // A proposed migration keeps the current live provider until its work finishes.
  next.policy={advice:s.advice,brokerage:s.brokerage,custody:entity.migration||changed?entity.policy.custody:s.custody,
   provider:entity.migration||changed?entity.policy.provider:s.provider,maintain:s.maintain,feeBp:s.feeBp,supportCap:s.supportCap};
  const carrying=next.policy.custody==='owned'||s.custody==='owned',salary=employees.reduce((n,e)=>n+ROLES[e.role].salary,0);
  const recurring=salary+RULES.overhead+(carrying?RULES.ownedControls+RULES.clearing:PROVIDERS[next.policy.provider].monthly+RULES.externalControls)+renewal+education;
  const minimumCapital=carrying?RULES.capitalOwned:RULES.capitalExternal,total=upfront+recurring;
  const reserve=recurring*RULES.reserveMonths;
  const requiredFunding=Math.max(0,total+minimumCapital-next.book.accounts.equity,total+reserve+next.book.accounts.payables-next.book.accounts.cash);
  // This is a quotation only. Incoming capital is not posted, fees are not
  // forecast as spendable funding, and client custody is excluded from reserves.
  const assumed=copy(next);
  if(s.capital)assumed.book=GroupAccounting.post(assumed.book,'quote.capital','quote',{cash:s.capital,equity:s.capital});
  assumed.book=GroupAccounting.post(assumed.book,'quote.operatingInvoice','quote',{payables:total,equity:-total},-total);
  const paid=Math.min(assumed.book.accounts.cash,assumed.book.accounts.payables);
  if(paid)assumed.book=GroupAccounting.settlePayable(assumed.book,paid,'quote');
  const available=investmentInstitutionCredentialStatus(assumed,cycle,renewed);
  const migrationWork=next.migration&&assumed.book.accounts.payables===0&&available.operations>=4&&next.migration.work<next.migration.required?1:0;
  if(migrationWork)available.operations-=4;
  return {entity:next,policy:s,upfront,recurring,total,reserve,minimumCapital,requiredFunding,hires,releases,renewal,education,
   dividendLimit:GroupAccounting.distributionLimit(assumed.book,0,recurring),
   migrationWork,permissions:investmentInstitutionPermissionState(assumed,cycle,available)};
 }
 function investmentInstitutionValidate(entity){
  if(!exact(entity,['version','owner','status','book','month','opened','nextEmployee','employees','capitalBasis','permissions','policy','migration','report','closure','closures'])||entity.version!==1||
   typeof entity.owner!=='string'||!entity.owner.length||entity.owner.length>50||
   !['unopened','active','closed'].includes(entity.status)||!whole(entity.month)||!whole(entity.opened)||entity.opened>entity.month||!whole(entity.closures)||
   !whole(entity.capitalBasis)||!whole(entity.nextEmployee)||entity.nextEmployee<1||!Array.isArray(entity.employees)||entity.employees.length>RULES.maxEmployees||
   !exact(entity.permissions,['advice','brokerage','custody']))throw Error('Invalid investment institution.');
  GroupAccounting.validate(entity.book);
  if(entity.book.entityId!==entity.owner+':investments'||entity.book.accounts.debt||entity.book.accounts.investments||entity.book.accounts.businessAssets||
   entity.book.accounts.equity!==entity.capitalBasis+entity.book.retainedEarnings)throw Error('Investment operating capital or ownership does not reconcile.');
  const ids=new Set();
  for(const e of entity.employees){
   if(!exact(e,['id','role','joined','credentialThrough'])||!Object.hasOwn(ROLES,e.role)||!whole(e.joined)||e.joined<1||e.joined>entity.month+1||
    !whole(e.credentialThrough)||e.credentialThrough<e.joined-1||typeof e.id!=='string'||!e.id.startsWith(entity.owner+':investment-worker:')||
    !/^[1-9][0-9]*$/.test(e.id.slice((entity.owner+':investment-worker:').length))||ids.has(e.id))throw Error('Invalid or duplicated qualified investment employee.');
   ids.add(e.id);if(Number(e.id.split(':').at(-1))>=entity.nextEmployee)throw Error('Investment employee sequence moved backwards.');
  }
  for(const p of Object.values(entity.permissions))if(!exact(p,['applied','ready','validThrough'])||!Object.values(p).every(whole)||
   (!p.applied?(p.ready||p.validThrough):p.applied>entity.month||p.ready<=p.applied||p.validThrough<p.ready))throw Error('Invalid investment permission history.');
  if(!exact(entity.policy,['advice','brokerage','custody','provider','maintain','feeBp','supportCap']))throw Error('Invalid investment standing policy.');
  if(entity.migration){const m=entity.migration;
   if(!exact(m,['from','to','started','work','required'])||!whole(m.started)||m.started<1||m.started>entity.month||!whole(m.work)||!whole(m.required)||m.work>m.required||m.required!==(m.to?.custody==='owned'?4:3)||
    !['from','to'].every(k=>exact(m[k],['custody','provider'])&&['external','owned'].includes(m[k].custody)&&Object.hasOwn(PROVIDERS,m[k].provider))||
    m.from.custody!==entity.policy.custody||m.from.provider!==entity.policy.provider||
    (m.from.custody===m.to.custody&&m.from.provider===m.to.provider))throw Error('Invalid pending investment provider migration.');
  }
  investmentInstitutionNormalize(entity,{...investmentInstitutionDefaults(entity),...(entity.migration?entity.migration.to:{})});
  if(entity.closure!==null){const c=entity.closure;
   if(!exact(c,['cycle','reason','paid','writtenOff','returned','basis','realized','available'])||!['voluntary','insolvent'].includes(c.reason)||
    !['cycle','paid','writtenOff','returned','basis'].every(k=>whole(c[k]))||!c.cycle||c.cycle>entity.month||
    !Number.isSafeInteger(c.realized)||c.realized!==c.returned-c.basis||!exact(c.available,Object.keys(ROLES))||
    Object.values(c.available).some(n=>!whole(n)||n>RULES.maxEmployees*4)||!entity.closures||
    entity.status==='unopened'||entity.status==='active'&&entity.opened<=c.cycle)throw Error('Invalid investment closure history.');
  }else if(entity.closures||entity.status==='closed')throw Error('Missing investment closure history.');
  if(entity.status==='closed'&&(entity.report!==null||entity.employees.length||entity.capitalBasis||entity.migration||
   Object.values(entity.book.accounts).some(Boolean)||entity.book.retainedEarnings||Object.values(entity.permissions).some(p=>p.applied)))throw Error('Closed investment operations retain assets, staff or permissions.');
  if(entity.status==='active'&&!entity.opened)throw Error('Active investment business lacks formation history.');
  if(entity.report!==null){const r=entity.report;
   if(!exact(r,['cycle','upfront','recurring','paid','capital','dividend','support','hires','releases','permitted','migrationCompleted'])||
    r.cycle!==entity.month||!['upfront','recurring','paid','capital','dividend','support','hires','releases'].every(k=>whole(r[k]))||
    r.support>RULES.maxSupport||r.hires>RULES.maxEmployees||r.releases>RULES.maxEmployees||
    !exact(r.permitted,['advice','brokerage','custody','available','reasons','accountCapacity','custodyCapacity'])||
    !exact(r.permitted.available,Object.keys(ROLES)))throw Error('Invalid investment operating report.');
   const ceiling=investmentInstitutionCredentialStatus(entity,entity.month);
   for(const role of Object.keys(ROLES))if(!whole(r.permitted.available[role])||r.permitted.available[role]>ceiling[role])throw Error('Investment report duplicates qualified staff time.');
   if(JSON.stringify(r.permitted)!==JSON.stringify(investmentInstitutionPermissionState(entity,entity.month,r.permitted.available)))throw Error('Investment report permissions do not reconcile.');
   if(r.migrationCompleted){const m=r.migrationCompleted;
    if(entity.migration||!exact(m,['from','to','started','work','required'])||!whole(m.started)||m.started<1||m.started>entity.month||m.work!==m.required||
     m.required!==(m.to?.custody==='owned'?4:3)||!['from','to'].every(k=>exact(m[k],['custody','provider'])&&['external','owned'].includes(m[k].custody)&&Object.hasOwn(PROVIDERS,m[k].provider))||
     m.to.custody!==entity.policy.custody||m.to.provider!==entity.policy.provider)throw Error('Invalid completed investment migration.');
   }
  }else if(entity.status==='active')throw Error('Active investment business lacks an operating report.');
  if(entity.status==='unopened'&&(entity.opened||entity.employees.length||Object.values(entity.book.accounts).some(Boolean)||entity.capitalBasis||entity.migration||Object.values(entity.permissions).some(p=>p.applied)))throw Error('Unopened investment business owns operating resources.');
  return true;
 }
 function investmentInstitutionStep(parent,entity,supplier,input,cycle,reservedParentCash=0){
  GroupAccounting.validate(parent);investmentInstitutionValidate(entity);GroupAccounting.validate(supplier);
  if(new Set([parent.entityId,entity.book.entityId,supplier.entityId]).size!==3)throw Error('Investment transfers require distinct counterparties.');
  if(parent.entityId!==entity.owner+':parent'||!whole(reservedParentCash)||reservedParentCash>parent.accounts.cash)throw Error('Invalid investment parent ownership or reserved cash.');
  if(cycle!==entity.month+1)throw Error('Investment month already prepared or out of sequence.');
  const s=investmentInstitutionNormalize(entity,input),q=investmentInstitutionQuote(entity,s,cycle);
  if(s.capital>parent.accounts.cash-reservedParentCash)throw Error('Investment capital exceeds current unreserved parent cash.');
  if((s.launch||q.hires||q.upfront)&&s.capital<q.requiredFunding)throw Error('New investment commitments must fund implementation and operating safeguards.');
  let next=q.entity,p=copy(parent),vendor=copy(supplier);
  if(s.capital){const t=GroupAccounting.invest(p,next.book,s.capital);p=t.parent;next.book=t.entity;next.capitalBasis+=s.capital;}
  // Standing support cannot finance new launch/hiring/project commitments.
  // The caller supplies parent cash after reserving the other entities' orders.
  const support=next.status==='active'&&!s.launch&&!q.hires&&!q.upfront&&!s.dividend?
   Math.min(s.supportCap,p.accounts.cash-reservedParentCash,Math.max(0,q.requiredFunding-s.capital)):0;
  if(support){const t=GroupAccounting.invest(p,next.book,support);p=t.parent;next.book=t.entity;next.capitalBasis+=support;}
  if(next.status==='active'){
   // All bills have an external creditor, including unpaid portions. No new
   // permission or staff throughput is inferred from an unpaid invoice.
   next.book=GroupAccounting.post(next.book,'investment.operatingInvoice',vendor.entityId,{payables:q.total,equity:-q.total},-q.total);
   vendor=GroupAccounting.post(vendor,'investment.operatingInvoice',next.book.entityId,{businessAssets:q.total,equity:q.total},q.total);
   const paid=Math.min(next.book.accounts.cash,next.book.accounts.payables);
   if(paid){next.book=GroupAccounting.settlePayable(next.book,paid,vendor.entityId);vendor=GroupAccounting.post(vendor,'investment.operatingPayment',next.book.entityId,{cash:paid,businessAssets:-paid});}
   if(s.dividend){const t=GroupAccounting.dividend(next.book,p,s.dividend,{monthlyFixedCost:q.recurring});next.book=t.entity;p=t.parent;}
   const permissions=investmentInstitutionPermissionState(next,cycle,q.permissions.available);
   let migrated=null;
   if(next.migration&&next.book.accounts.payables===0){
    next.migration.work=Math.min(next.migration.required,next.migration.work+q.migrationWork);
    if(next.migration.work>=next.migration.required&&
      (next.migration.to.custody!=='owned'||(next.book.accounts.equity>=RULES.capitalOwned&&next.permissions.custody.ready<=cycle&&next.permissions.custody.validThrough>=cycle&&permissions.brokerage&&permissions.available.operations>=3))){
     migrated=copy(next.migration);next.policy.custody=migrated.to.custody;next.policy.provider=migrated.to.provider;next.migration=null;
    }
   }
   next.report={cycle,upfront:q.upfront,recurring:q.recurring,paid,capital:s.capital,dividend:s.dividend,support,hires:q.hires,releases:q.releases,
    permitted:investmentInstitutionPermissionState(next,cycle,q.permissions.available),migrationCompleted:migrated};
  }
  next.month=cycle;investmentInstitutionValidate(next);
  const cash=book=>book.accounts.cash;
  if(cash(p)+cash(next.book)+cash(vendor)!==cash(parent)+cash(entity.book)+cash(supplier))throw Error('Investment cash transfer did not reconcile.');
  return {parent:p,entity:next,supplier:vendor,quote:q};
 }
 function investmentInstitutionClose(parent,entity,supplier,reason,releasedInternalDefault=null){
  investmentInstitutionValidate(entity);GroupAccounting.validate(parent);GroupAccounting.validate(supplier);
  if(entity.status!=='active'||!['voluntary','insolvent'].includes(reason)||parent.entityId!==entity.owner+':parent'||
   new Set([parent.entityId,entity.book.entityId,supplier.entityId]).size!==3)throw Error('Invalid investment closure.');
  if(entity.book.accounts.custodyAssets)throw Error('Transfer intact client assets to their continuing custodian before closing.');
  const release=releasedInternalDefault===null?null:entity.book.journal.find(j=>j.id===releasedInternalDefault);
  if(releasedInternalDefault!==null&&(!release||release.source!=='premises.creditorRelease'||release.counterparty!=='bank'||!(release.changes.payables<0)||release.changes.equity!==-release.changes.payables||release.earnings!==release.changes.equity))throw Error('Occupancy default requires its actual unpaid internal-creditor release.');
  if(reason==='insolvent'&&!entity.book.accounts.payables&&entity.book.accounts.equity>=0&&!release)throw Error('Solvent operations require an explicit closure instruction.');
  const e=copy(entity),available=copy(entity.report.permitted.available),basis=e.capitalBasis;
  let p=copy(parent),vendor=copy(supplier);
  const paid=Math.min(e.book.accounts.cash,e.book.accounts.payables);
  if(paid){e.book=GroupAccounting.settlePayable(e.book,paid,vendor.entityId);vendor=GroupAccounting.post(vendor,'investment.closingPayment',e.book.entityId,{cash:paid,businessAssets:-paid});}
  const writtenOff=e.book.accounts.payables;
  if(writtenOff){e.book=GroupAccounting.post(e.book,'investment.creditorRelease',vendor.entityId,{payables:-writtenOff,equity:writtenOff},writtenOff);
   vendor=GroupAccounting.post(vendor,'investment.creditorLoss',e.book.entityId,{businessAssets:-writtenOff,equity:-writtenOff},-writtenOff);}
  const returned=e.book.accounts.cash,realized=returned-basis;
  p=GroupAccounting.post(p,'investment.closedOwnership',e.book.entityId,{cash:returned,investments:-basis,equity:realized},realized);
  e.book=GroupAccounting.post(e.book,'investment.closingCapital',p.entityId,{cash:-returned,equity:-returned});
  // Transfer the disposed entity's retained result into the parent's realized
  // ownership result. This is not new income in the consolidated group.
  e.book=GroupAccounting.post(e.book,'investment.closedRetainedTransfer',p.entityId,{equity:0},-e.book.retainedEarnings);
  e.status='closed';e.closures++;e.capitalBasis=0;e.employees=[];e.migration=null;e.report=null;
  e.permissions={advice:noPermission(),brokerage:noPermission(),custody:noPermission()};
  e.closure={cycle:e.month,reason,paid,writtenOff,returned,basis,realized,available};investmentInstitutionValidate(e);
  const cash=b=>b.accounts.cash,earn=b=>b.retainedEarnings;
  if(cash(p)+cash(e.book)+cash(vendor)!==cash(parent)+cash(entity.book)+cash(supplier)||
   earn(p)+earn(e.book)+earn(vendor)!==earn(parent)+earn(entity.book)+earn(supplier))throw Error('Investment closure transfers do not reconcile.');
  return {parent:p,entity:e,supplier:vendor};
 }
 return Object.freeze({ROLES,PROVIDERS,RULES,opening:investmentInstitutionOpening,defaults:investmentInstitutionDefaults,counts:investmentInstitutionCounts,normalize:investmentInstitutionNormalize,quote:investmentInstitutionQuote,permissionState:investmentInstitutionPermissionState,credentialStatus:investmentInstitutionCredentialStatus,validate:investmentInstitutionValidate,step:investmentInstitutionStep,close:investmentInstitutionClose});
})();
