// Group10/save9.9: a paid operating entity is not itself a professional licence.
// Fictional compressed registration/education periods, not statutory fees or law.
const AGENCY_PROFESSIONAL_ROLES=Object.freeze({
 propertyProducer:Object.freeze({name:'Property & casualty producer',salary:6000,units:8,products:['property','liability'],credential:true}),
 benefitsProducer:Object.freeze({name:'Employee-benefits producer',salary:6500,units:12,products:['benefits'],credential:true}),
 servicing:Object.freeze({name:'Insurance servicing specialist',salary:4200,units:12,products:[],credential:false})
});
const AGENCY_PROFESSIONAL_RULES=Object.freeze({application:2500,registrationMonths:2,registrationRenewal:1500,credentialCheck:350,education:900,term:12,educationTime:.25});
function emptyAgencyProfessionals(){return {version:1,nextId:1,employees:[],registration:{appliedCycle:0,readyCycle:0,validThrough:0},maintainCredentials:true,report:null};}
function agencyRoleCounts(a){return Object.fromEntries(Object.keys(AGENCY_PROFESSIONAL_ROLES).map(role=>[role,a.professionals.employees.filter(e=>e.role===role).length]));}
function agencyProfessionalDefault(p){
 const roles=agencyRoleCounts(p.agency);if(!p.agency.professionals.employees.length)roles.propertyProducer=1;
 return {roles,maintainCredentials:p.agency.professionals.maintainCredentials};
}
function normalizeAgencyProfessionals(p,s){
 if(!agencyExact(s.roles,Object.keys(AGENCY_PROFESSIONAL_ROLES))||Object.values(s.roles).some(n=>!agencyWhole(n)||n>AGENCY_RULES.maxStaff)||Object.values(s.roles).reduce((n,x)=>n+x,0)!==s.staff||typeof s.maintainCredentials!=='boolean')
  throw Error('Agency professional roles must match its funded employee count. Ordinary bank staff cannot fill these roles.');
}
function agencyProfessionalCycle(p){return p.facilityLifecycle.lastActivatedCycle;}
function agencyProfessionalStatus(a,cycle,employees=a.professionals.employees,registration=a.professionals.registration,renewed=[]){
 const active=Object.fromEntries(Object.keys(AGENCY_PRODUCTS).map(k=>[k,0]));let units=0;
 for(const employee of employees){
  const role=AGENCY_PROFESSIONAL_ROLES[employee.role],valid=!role.credential||employee.credentialThrough>=cycle;
  const time=renewed.includes(employee.id)?1-AGENCY_PROFESSIONAL_RULES.educationTime:1;
  if(valid){units+=role.units*time;for(const product of role.products)active[product]+=time;}
 }
 const phase=!registration.appliedCycle?'not applied':cycle<registration.readyCycle?'registration pending':registration.validThrough<cycle?'registration expired':!Object.values(active).some(Boolean)?'no qualified producer':'authorized';
 return {phase,units:phase==='authorized'?units:0,producers:active,permitted:Object.keys(active).filter(k=>phase==='authorized'&&active[k]>0),readyCycle:registration.readyCycle,validThrough:registration.validThrough};
}
function agencyProfessionalQuote(p,s=defaultAgencyPlan(p),cycle=agencyProfessionalCycle(p)){
 normalizeAgencyProfessionals(p,s);
 const a=p.agency,state=agencyCopy(a.professionals),prior=state.employees;let hired=0,released=0,credentialChecks=0;
 const employees=[];
 for(const role of Object.keys(AGENCY_PROFESSIONAL_ROLES)){
  const count=s.roles[role];
  const existing=prior.filter(e=>e.role===role),retained=existing.slice(0,count);employees.push(...retained);released+=Math.max(0,existing.length-count);
  for(let i=retained.length;i<count;i++){
   const licensed=AGENCY_PROFESSIONAL_ROLES[role].credential;hired++;if(licensed)credentialChecks+=AGENCY_PROFESSIONAL_RULES.credentialCheck;
   employees.push({id:a.book.entityId+':employee:'+state.nextId++,role,credentialThrough:licensed?cycle+AGENCY_PROFESSIONAL_RULES.term-1:0});
  }
 }
 state.employees=employees;state.maintainCredentials=s.maintainCredentials;
 let registrationCost=0,educationCost=0;const renewed=[];
 if(s.launch){state.registration={appliedCycle:cycle,readyCycle:cycle+AGENCY_PROFESSIONAL_RULES.registrationMonths,validThrough:cycle+AGENCY_PROFESSIONAL_RULES.registrationMonths+AGENCY_PROFESSIONAL_RULES.term-1};registrationCost=AGENCY_PROFESSIONAL_RULES.application;}
 else if(a.status==='active'&&s.maintainCredentials&&state.registration.validThrough<cycle){state.registration.validThrough=cycle+AGENCY_PROFESSIONAL_RULES.term-1;registrationCost=AGENCY_PROFESSIONAL_RULES.registrationRenewal;}
 for(const employee of employees)if(AGENCY_PROFESSIONAL_ROLES[employee.role].credential&&employee.credentialThrough<cycle&&s.maintainCredentials){
  employee.credentialThrough=cycle+AGENCY_PROFESSIONAL_RULES.term-1;educationCost+=AGENCY_PROFESSIONAL_RULES.education;renewed.push(employee.id);
 }
 const salary=employees.reduce((n,e)=>n+AGENCY_PROFESSIONAL_ROLES[e.role].salary,0),fixedCost=AGENCY_RULES.overhead+salary;
 const status=agencyProfessionalStatus(a,cycle,employees,state.registration,renewed);
 return {cycle,state,hired,released,credentialChecks,registrationCost,educationCost,renewed,salary,fixedCost,
  monthlyExpense:fixedCost+s.outreach*AGENCY_RULES.outreachCost,recruitmentCost:hired*AGENCY_RULES.recruitment+credentialChecks,
  complianceExpense:registrationCost+educationCost,...status};
}
function applyAgencyProfessionals(g,p,s,q){
 const report={cycle:g.cycle,hired:q.hired,released:q.released,credentialChecks:q.credentialChecks,registrationCost:q.registrationCost,educationCost:q.educationCost,renewed:q.renewed,units:q.units,phase:q.phase};
 p.agency.professionals={...q.state,report};
 if(q.complianceExpense)agencyInvoice(g,p,q.complianceExpense,'agency.registrationEducation');
}
function agencyProfessionalOperatingCost(p,s){return p.agency?.version===2?AGENCY_RULES.overhead+Object.entries(s.roles).reduce((n,[key,count])=>n+count*AGENCY_PROFESSIONAL_ROLES[key].salary,0):agencyFixedCost(s.staff);}
function agencyDelivery(p,cycle){
 const a=p.agency;if(a.version!==2)return {units:a.staff*AGENCY_RULES.staffCapacity,permitted:Object.keys(AGENCY_PRODUCTS),producers:null};
 return agencyProfessionalStatus(a,cycle,a.professionals.employees,a.professionals.registration,a.professionals.report?.cycle===cycle?a.professionals.report.renewed:[]);
}
function validateAgencyProfessionals(p,cycle){
 const a=p.agency,s=a.professionals;
 if(!agencyExact(s,['version','nextId','employees','registration','maintainCredentials','report'])||s.version!==1||!Number.isSafeInteger(s.nextId)||s.nextId<1||typeof s.maintainCredentials!=='boolean'||!Array.isArray(s.employees)||s.employees.length!==a.staff)
  throw Error('Invalid qualified agency workforce.');
 const ids=new Set();for(const e of s.employees){
  const role=AGENCY_PROFESSIONAL_ROLES[e.role],prefix=a.book.entityId+':employee:',number=typeof e.id==='string'&&e.id.startsWith(prefix)?Number(e.id.slice(prefix.length)):0;
  if(!agencyExact(e,['id','role','credentialThrough'])||!Object.hasOwn(AGENCY_PROFESSIONAL_ROLES,e.role)||!Number.isSafeInteger(number)||number<1||number>=s.nextId||String(number)!==e.id.slice(prefix.length)||ids.has(e.id)||!agencyWhole(e.credentialThrough)||e.credentialThrough>cycle+AGENCY_PROFESSIONAL_RULES.term-1||(role.credential?e.credentialThrough<1:e.credentialThrough!==0))throw Error('Invalid agency employee identity, role or credential.');ids.add(e.id);
 }
 const r=s.registration;
 if(!agencyExact(r,['appliedCycle','readyCycle','validThrough'])||Object.values(r).some(n=>!agencyWhole(n))||r.appliedCycle>cycle||
  (a.status==='active'?(r.appliedCycle!==a.openedCycle||r.readyCycle!==r.appliedCycle+AGENCY_PROFESSIONAL_RULES.registrationMonths||r.validThrough<r.readyCycle||r.validThrough>Math.max(cycle,r.readyCycle)+AGENCY_PROFESSIONAL_RULES.term-1):Object.values(r).some(Boolean)))throw Error('Invalid agency operating registration.');
 if(s.report!==null){const q=s.report;if(!agencyExact(q,['cycle','hired','released','credentialChecks','registrationCost','educationCost','renewed','units','phase'])||!agencyWhole(q.cycle)||q.cycle<1||q.cycle>cycle||['hired','released','credentialChecks','registrationCost','educationCost','units'].some(k=>!agencyWhole(q[k]))||q.hired>4||q.released>4||!Array.isArray(q.renewed)||q.renewed.length>4||new Set(q.renewed).size!==q.renewed.length||q.renewed.some(id=>typeof id!=='string'||!id.startsWith(a.book.entityId+':employee:'))||q.units>48||!['not applied','registration pending','registration expired','no qualified producer','authorized'].includes(q.phase))throw Error('Invalid agency qualification report.');}
}
