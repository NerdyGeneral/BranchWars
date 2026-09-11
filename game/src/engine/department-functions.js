// Group6 N-05 function policy and payment kernel. Version/save/UI coordination
// lives in department-runtime.js; this module remains pure and deterministic.
//
// Contract and provisional assumptions:
// - One work unit is one quarter of an ordinary banker's monthly function time,
//   NOT a customer, loan, deposit, productive-specialist multiplier or bonus.
// - physicalQuarters comes AFTER paid teaching. retainedQuarters attributes the
//   EXISTING service/onboarding/collections/contracts reservations to functions.
//   Manual policy quotas are ADDITIONAL time; retained time is subtracted ONCE.
// - Consumers must replace their old remaining-pool path with remainingPools;
//   they must not keep the old sales/facility pool as well. Workload is authored
//   externally from real books. This kernel does not invent workload or rewards.
// - Vendor work is finite purchased throughput, never hired staff or project
//   execution. Rates below are provisional dollars per quarter-work unit/month.
//   Supplier availability is a context input already net of other commitments.
// - No delegation, borrowing, facilities, acquisitions, automatic turn submission,
//   licensing, generic performance bonuses or default campaign upgrade here.
// - Settlement accepts ONLY a paired accounting adapter. The adapter gets cloned
//   bank/provider books; exact cash/equity/earnings deltas are checked. Caller
//   must commit BOTH returned books atomically and sync legacy stats afterward.
const DepartmentFunctions = (() => {
  const VERSION=1,ROLES=Object.freeze(['service','business','lending','operations']);
  const RULES=Object.freeze({maxHeadcount:Math.floor(Number.MAX_SAFE_INTEGER/4),maxQuarters:400,maxWorkload:1000000,maxVendorQuarters:16,maxCash:Number.MAX_SAFE_INTEGER,historyLimit:24});
  const descriptor=(name,roles,vendorRate)=>Object.freeze({name,roles:Object.freeze(roles),vendorRate});
  const FUNCTIONS=Object.freeze({
    relationships:descriptor('Sales and relationships',['service','business'],3000),
    onboarding:descriptor('Onboarding and customer service',['service','business'],2200),
    credit:descriptor('Credit administration',['lending','operations'],2800),
    collections:descriptor('Servicing and collections',['lending','service'],2600),
    technology:descriptor('Technology operations',['operations'],3500),
    risk:descriptor('Risk and compliance',['operations','lending'],3200),
    treasury:descriptor('Treasury operations',['operations','business'],3400),
    people:descriptor('People management',['operations'],2400)
  });
  const IDS=Object.freeze(Object.keys(FUNCTIONS)),copy=x=>JSON.parse(JSON.stringify(x));
  const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
  const whole=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
  const sum=xs=>xs.reduce((n,x)=>n+x,0),roles=()=>Object.fromEntries(ROLES.map(r=>[r,0]));
  const keyed=n=>Object.fromEntries(IDS.map(id=>[id,n instanceof Function?n(id):n]));
  const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  function functionPolicy(){return {quotas:keyed(()=>roles()),vendors:keyed(0)};}
  function functionValidatePolicy(policy){
    if(!exact(policy,['quotas','vendors'])||!exact(policy.quotas,IDS)||!exact(policy.vendors,IDS))throw Error('Invalid department function policy.');
    for(const id of IDS){
      const row=policy.quotas[id];if(!exact(row,ROLES)||ROLES.some(r=>!whole(row[r],RULES.maxQuarters)||row[r]>0&&!FUNCTIONS[id].roles.includes(r)))throw Error('Invalid physical-role quota for '+id+'.');
      if(!whole(policy.vendors[id],RULES.maxVendorQuarters))throw Error('Invalid finite vendor quota for '+id+'.');
    }
    return copy(policy);
  }
  function functionValidateContext(context){
    if(!exact(context,['cycle','headcount','physicalQuarters','retainedQuarters','workloads','vendorSupply','freeCash'])||!whole(context.cycle)||context.cycle<1||
      !whole(context.headcount,RULES.maxHeadcount)||!whole(context.freeCash,RULES.maxCash)||!exact(context.physicalQuarters,ROLES)||!exact(context.retainedQuarters,IDS)||!exact(context.workloads,IDS)||!exact(context.vendorSupply,IDS))throw Error('Invalid department function planning context.');
    if(ROLES.some(r=>!whole(context.physicalQuarters[r],RULES.maxQuarters))||sum(Object.values(context.physicalQuarters))>context.headcount*4)throw Error('Physical pool exceeds actual headcount after teaching.');
    for(const id of IDS){
      const row=context.retainedQuarters[id];if(!exact(row,ROLES)||ROLES.some(r=>!whole(row[r],RULES.maxQuarters)||row[r]>0&&!FUNCTIONS[id].roles.includes(r)))throw Error('Invalid retained function reservation.');
      if(!whole(context.workloads[id],RULES.maxWorkload)||!whole(context.vendorSupply[id],RULES.maxVendorQuarters))throw Error('Invalid function workload or finite vendor supply.');
    }
    if(ROLES.some(r=>sum(IDS.map(id=>context.retainedQuarters[id][r]))>context.physicalQuarters[r]))throw Error('Retained work already exceeds the physical pool.');
    return copy(context);
  }
  function functionCalculate(policy,context){
    const retainedPools=roles(),allocatedPools=roles(),remainingPools=roles(),overcommittedPools=roles();
    for(const r of ROLES){retainedPools[r]=sum(IDS.map(id=>context.retainedQuarters[id][r]));allocatedPools[r]=sum(IDS.map(id=>policy.quotas[id][r]));
      const remaining=context.physicalQuarters[r]-retainedPools[r]-allocatedPools[r];remainingPools[r]=Math.max(0,remaining);overcommittedPools[r]=Math.max(0,-remaining);}
    const rows=IDS.map(id=>{const retained=sum(Object.values(context.retainedQuarters[id])),allocated=sum(Object.values(policy.quotas[id])),vendor=policy.vendors[id],capacity=retained+allocated+vendor,workload=context.workloads[id],served=Math.min(workload,capacity);
      return {id,retained,allocated,vendor,capacity,workload,served,shortfall:workload-served,idle:Math.max(0,capacity-workload),vendorExpense:vendor*FUNCTIONS[id].vendorRate};});
    const vendorExpense=sum(rows.map(r=>r.vendorExpense)),overStaff=ROLES.find(r=>overcommittedPools[r]>0),overSupply=IDS.find(id=>policy.vendors[id]>context.vendorSupply[id]);
    const reason=overStaff?'Function quotas exceed remaining '+overStaff+' staff.':overSupply?'Finite vendor capacity exceeded for '+overSupply+'.':vendorExpense>context.freeCash?'Vendor orders exceed funded cash after existing commitments and reserves.':'';
    const remainingVendorSupply=Object.fromEntries(IDS.map(id=>[id,Math.max(0,context.vendorSupply[id]-policy.vendors[id])]));
    return {enabled:true,eligible:!reason,reason,policy:copy(policy),basis:copy(context),retainedPools,allocatedPools,remainingPools,overcommittedPools,remainingVendorSupply,vendorExpense,rows};
  }
  function functionValidate(p){
    const book=p.departmentFunctions;if(book===undefined)return false;
    if(!whole(p.stats?.staff,RULES.maxHeadcount))throw Error('Existing physical workforce required for department functions.');
    if(!exact(book,['version','startedCycle','lastCycle','policy','paid','historyBasePaid','history','report'])||book.version!==VERSION||!whole(book.startedCycle)||book.startedCycle<1||
      !whole(book.lastCycle)||book.lastCycle<book.startedCycle-1||!whole(book.paid)||!whole(book.historyBasePaid)||!Array.isArray(book.history)||book.history.length>RULES.historyLimit)throw Error('Invalid persistent department function book.');
    functionValidatePolicy(book.policy);
    if(book.history.length!==Math.min(RULES.historyLimit,book.lastCycle-book.startedCycle+1))throw Error('Missing function settlement history.');
    let prior=book.lastCycle-book.history.length,paid=book.historyBasePaid;
    for(const report of book.history){
      const policy=functionValidatePolicy(report?.policy),context=functionValidateContext(report?.basis),expected=functionCalculate(policy,context);
      if(context.cycle!==++prior||!expected.eligible||stable(expected)!==stable(report))throw Error('Invalid function workload/expense report.');
      paid+=report.vendorExpense;if(!whole(paid))throw Error('Function expenses exceed accounting range.');
    }
    if(book.paid!==paid||!book.history.length&&book.historyBasePaid!==0||stable(book.report)!==stable(book.history.at(-1)||null)||
      book.report&&stable(book.policy)!==stable(book.report.policy))throw Error('Function report or paid totals do not reconcile.');
    return true;
  }
  function functionInitialize(p,cycle,enabled){
    if(enabled!==true){if(p.departmentFunctions!==undefined)throw Error('Disabled function rules cannot discard an existing book.');return copy(p);}
    if(!whole(cycle)||cycle<1||p.departmentFunctions!==undefined)throw Error('Function book initialization requires a fresh versioned owner.');
    const next=copy(p);next.departmentFunctions={version:VERSION,startedCycle:cycle,lastCycle:cycle-1,policy:functionPolicy(),paid:0,historyBasePaid:0,history:[],report:null};functionValidate(next);return next;
  }
  function functionDefault(p){return functionValidate(p)?copy(p.departmentFunctions.policy):null;}
  function functionQuote(p,policy,context){
    if(!functionValidate(p)){if(policy!==undefined&&policy!==null)throw Error('Department function rules are disabled.');return {enabled:false,eligible:true,reason:'',policy:null,remainingPools:null,vendorExpense:0,rows:[]};}
    const basis=functionValidateContext(context);if(basis.headcount!==p.stats.staff)throw Error('Context headcount must match employed physical bankers.');
    if(basis.cycle!==p.departmentFunctions.lastCycle+1)throw Error('Use the next unsettled department function month.');
    return functionCalculate(functionValidatePolicy(policy===undefined?functionDefault(p):policy),basis);
  }
  // Explicit review-only mandate. maxAdditionalQuarters caps NEW staff time in
  // this proposal, while maxVendorExpense caps TOTAL monthly vendor orders,
  // including the supplied manual policy. Existing orders are never deleted to
  // make a proposal fit. Fixed compatible-role order makes ties reproducible;
  // function priority is entirely supplied by the player, not an AI strategy.
  function functionPropose(p,policy,context,mandate){
    if(!exact(mandate,['priorities','maxAdditionalQuarters','maxVendorExpense','floorQuarters'])||
      !Array.isArray(mandate.priorities)||mandate.priorities.length!==IDS.length||new Set(mandate.priorities).size!==IDS.length||
      mandate.priorities.some(id=>typeof id!=='string'||!Object.hasOwn(FUNCTIONS,id))||!whole(mandate.maxAdditionalQuarters,RULES.maxQuarters)||
      !whole(mandate.maxVendorExpense,RULES.maxCash)||!exact(mandate.floorQuarters,ROLES)||
      ROLES.some(r=>!whole(mandate.floorQuarters[r],RULES.maxQuarters)))throw Error('Invalid explicit department allocation mandate.');
    const before=functionQuote(p,policy,context),next=before.policy===null?null:copy(before.policy),changes=[],reasons=[];
    const result=(after,eligible=after.eligible)=>({enabled:before.enabled,eligible,policy:copy(next),changes:copy(changes),reasons:copy(reasons),
      additionalQuarters:sum(changes.filter(c=>c.kind==='staff').map(c=>c.quarters)),additionalVendorExpense:sum(changes.filter(c=>c.kind==='vendor').map(c=>c.expense)),
      totalVendorExpense:after.vendorExpense,remainingPools:copy(after.remainingPools),remainingVendorSupply:after.remainingVendorSupply?copy(after.remainingVendorSupply):null,
      shortfalls:after.rows.map(row=>({id:row.id,before:before.rows.find(r=>r.id===row.id).shortfall,after:row.shortfall}))});
    if(!before.enabled){reasons.push('Department function rules are disabled; no proposal made.');return result(before);}
    if(!before.eligible){reasons.push('Existing policy must be repaired explicitly: '+before.reason);return result(before,false);}
    const floorConflict=ROLES.find(r=>before.remainingPools[r]<mandate.floorQuarters[r]);
    if(floorConflict){reasons.push('Existing '+floorConflict+' allocations already leave less than the protected floor; no orders were removed.');return result(before,false);}
    if(before.vendorExpense>mandate.maxVendorExpense){reasons.push('Existing vendor orders exceed this mandate envelope; no orders were removed.');return result(before,false);}
    const available=copy(before.remainingPools);let staffLeft=mandate.maxAdditionalQuarters,
      vendorCash=Math.min(context.freeCash,mandate.maxVendorExpense)-before.vendorExpense;
    for(const id of mandate.priorities){
      let deficit=before.rows.find(row=>row.id===id).shortfall;
      for(const role of FUNCTIONS[id].roles){
        const amount=Math.min(deficit,staffLeft,available[role]-mandate.floorQuarters[role]);if(amount<=0)continue;
        const from=next.quotas[id][role];next.quotas[id][role]+=amount;available[role]-=amount;staffLeft-=amount;deficit-=amount;
        changes.push({kind:'staff',id,role,from,to:next.quotas[id][role],quarters:amount,reason:'Fill measured shortfall using compatible staff above the protected '+role+' floor.'});
      }
      const rate=FUNCTIONS[id].vendorRate,amount=Math.min(deficit,context.vendorSupply[id]-next.vendors[id],Math.floor(vendorCash/rate));
      if(amount>0){const from=next.vendors[id];next.vendors[id]+=amount;vendorCash-=amount*rate;deficit-=amount;
        changes.push({kind:'vendor',id,from,to:next.vendors[id],quarters:amount,expense:amount*rate,reason:'Fill remaining measured shortfall within finite supplier capacity and the total funded vendor envelope.'});}
      if(deficit>0)reasons.push(FUNCTIONS[id].name+': '+deficit+' quarter-work units remain uncovered; compatible staff, protected floors, proposal limits or funded vendor capacity are exhausted.');
    }
    const after=functionQuote(p,next,context);
    if(!after.eligible||ROLES.some(r=>after.remainingPools[r]<mandate.floorQuarters[r])||after.vendorExpense>mandate.maxVendorExpense)throw Error('Proposed allocation failed shared constraints.');
    if(!changes.length)reasons.push('No changes proposed; existing allocations are retained.');
    reasons.push('Preview only. Review and explicitly adopt the policy before a future settlement can reserve staff or pay vendors.');
    return result(after);
  }
  function functionSettle(p,policy,context,payment){
    const report=functionQuote(p,policy,context);if(!report.enabled)return {owner:copy(p),supplier:payment?.supplier===undefined?null:copy(payment.supplier),report};
    if(!report.eligible)throw Error(report.reason);
    const next=copy(p);let supplier=payment?.supplier===undefined?null:copy(payment.supplier);
    if(report.vendorExpense){
      if(typeof payment?.pay!=='function'||!supplier||![3,4].includes(next.accounting?.version))throw Error('Funded paired vendor payment adapter required.');
      AccountingPrototype.check(next.accounting);GroupAccounting.validate(supplier);
      if(next.accounting.accounts.cash<report.vendorExpense)throw Error('Vendor payment exceeds actual bank cash.');
      const beforeBank=copy(next.accounting),beforeSupplier=copy(supplier),result=payment.pay(copy(beforeBank),copy(beforeSupplier),report.vendorExpense,next.id,'department.functions');
      if(!exact(result,['bank','provider']))throw Error('Vendor adapter must return both reconciled books.');
      AccountingPrototype.check(result.bank);GroupAccounting.validate(result.provider);
      if(result.provider.entityId!==beforeSupplier.entityId)throw Error('Vendor identity changed during payment.');
      for(const [key,value]of Object.entries(beforeBank.accounts))if(result.bank.accounts[key]!==value-(['cash','equity'].includes(key)?report.vendorExpense:0))throw Error('Bank vendor payment failed exact expense conservation.');
      for(const [key,value]of Object.entries(beforeSupplier.accounts))if(result.provider.accounts[key]!==value+(['cash','equity'].includes(key)?report.vendorExpense:0))throw Error('Supplier vendor payment failed exact expense conservation.');
      if(result.bank.retainedEarnings!==beforeBank.retainedEarnings-report.vendorExpense||result.provider.retainedEarnings!==beforeSupplier.retainedEarnings+report.vendorExpense)throw Error('Vendor earnings do not reconcile.');
      next.accounting=copy(result.bank);supplier=copy(result.provider);
    }
    const book=next.departmentFunctions;book.policy=copy(report.policy);book.lastCycle=context.cycle;book.paid+=report.vendorExpense;book.report=copy(report);book.history.push(copy(report));
    while(book.history.length>RULES.historyLimit)book.historyBasePaid+=book.history.shift().vendorExpense;
    functionValidate(next);return {owner:next,supplier,report:copy(report)};
  }
  return Object.freeze({VERSION,ROLES,IDS,FUNCTIONS,RULES,initialize:functionInitialize,validate:functionValidate,defaultPlan:functionDefault,validatePolicy:functionValidatePolicy,quote:functionQuote,propose:functionPropose,settle:functionSettle});
})();
