// Group5 facility lifecycle. Identity, ordinary construction/conversion and
// closure remain owned by FacilityNetwork; this book stores lifecycle metadata.
// Monetary settlement is injected and always runs on a private owner clone.
const FacilityLifecycle = (() => {
  const VERSION=1, ROLES=Object.freeze(['service','business','lending','operations','wealth']);
  const RULES=Object.freeze({conditionMax:10000,criticalCondition:1500,rampMonths:4,
    renovationCostShare:.22,renovationWork:2,renovationCapacity:1,renovationDisruption:.5,
    maintenanceShare:.12,maxOffices:4096,historyLimit:48});
  const modes=Object.freeze({off:{spend:0,wear:180},basic:{spend:.5,wear:70},full:{spend:1,wear:20}});
  const descriptor=(name,cost,upkeep,staff,capacity,support=0)=>Object.freeze({name,cost,upkeep,
    staffQuarters:Object.freeze(Object.fromEntries(ROLES.map((r,i)=>[r,staff[i]]))),
    capacity:Object.freeze({depositCapacity:capacity[0],loanCapacity:capacity[1],serviceCapacity:capacity[2],advisoryCapacity:capacity[3]}),support});
  const CATALOG=Object.freeze({
    atm:descriptor('ATM / micro service point',150000,4500,[1,0,0,1,0],[70000,0,.35,0]),
    retail:descriptor('Retail branch',650000,22000,[8,0,2,2,0],[450000,250000,1.5,0]),
    commercial:descriptor('Commercial banking office',700000,22000,[0,8,6,2,0],[230000,430000,1,0]),
    digital:descriptor('Digital advisory studio',520000,12000,[4,2,0,4,0],[320000,150000,1.2,0]),
    wealth:descriptor('Licensed wealth advisory office',800000,25000,[2,0,0,2,8],[80000,0,.5,4]),
    financialCenter:descriptor('Financial center',1400000,48000,[8,8,8,4,4],[700000,600000,3,2]),
    regionalHub:descriptor('Regional operations hub',1850000,62000,[8,4,4,12,0],[200000,300000,5,0],3)
  });
  const copy=x=>JSON.parse(JSON.stringify(x)),whole=n=>Number.isSafeInteger(n)&&n>=0;
  const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
  const active=o=>o.closedCycle===null;
  function lifecycleOffices(p){
    const list=p.facilityNetwork?.offices;if(typeof p.id!=='string'||!p.id.length||!Array.isArray(list)||list.length>RULES.maxOffices)throw Error('Identified office roster required.');
    const seen=new Set(),prefix=p.id+':office:';
    for(const o of list){const serial=typeof o?.id==='string'&&o.id.startsWith(prefix)?Number(o.id.slice(prefix.length)):NaN;
      if(!whole(serial)||serial<1||o.id!==prefix+serial||seen.has(o.id)||typeof o.market!=='string'||!o.market.length||
        !whole(o.openedCycle)||o.openedCycle<1||o.closedCycle!==null&&(!whole(o.closedCycle)||o.closedCycle<o.openedCycle))throw Error('Malformed canonical facility identity.');
      seen.add(o.id);
    }
    return list;
  }
  function lifecycleById(p,id){return lifecycleOffices(p).find(o=>o.id===id);}
  function lifecycleEntry(cycle,inherited){return {conditionBp:10000,deferredWearBp:0,ageMonths:0,initialRampMonths:inherited?4:0,rampMonths:inherited?4:0,
    maintenance:'full',staffQuarters:Object.fromEntries(ROLES.map(r=>[r,0])),hubId:null,
    renovation:null,renovations:0,registeredCycle:cycle};}
  function lifecycleInitialize(p,cycle,enabled){
    if(enabled!==true)return copy(p);
    if(p.facilityLifecycle||!whole(cycle)||cycle<1)throw Error('Lifecycle initialization is an explicit new-campaign operation.');
    const next=copy(p),records={};
    for(const o of lifecycleOffices(next)){if(!CATALOG[o.model]||Object.hasOwn(records,o.id))throw Error('Invalid opening facility model or duplicate identity.');records[o.id]=lifecycleEntry(cycle,true);}
    next.facilityLifecycle={version:VERSION,startedCycle:cycle,records,lastPreparedCycle:0,lastSettledCycle:0,lastAdvancedCycle:0,lastAdvanceCapacity:0,lastActivatedCycle:cycle,report:null,history:[]};
    lifecycleValidate(next,cycle,true);return next;
  }
  function lifecycleRegister(p,id,cycle){
    const next=copy(p),o=lifecycleById(next,id),b=next.facilityLifecycle;
    if(!b||!whole(cycle)||cycle!==lifecycleNext(b)||!o||!active(o)||!CATALOG[o.model]||Object.hasOwn(b.records,id)||cycle!==o.openedCycle)throw Error('Register only a newly paid identified office in the unsettled month.');
    b.records[id]=lifecycleEntry(cycle,false);return next;
  }
  function lifecycleClose(p,id){
    const next=copy(p),o=lifecycleById(next,id),row=next.facilityLifecycle?.records[id];
    if(!o||active(o)||!row)throw Error('Close the canonical identity before lifecycle cleanup.');
    row.renovation=null;row.hubId=null;row.staffQuarters=Object.fromEntries(ROLES.map(r=>[r,0]));
    for(const other of Object.values(next.facilityLifecycle.records))if(other.hubId===id)other.hubId=null;
    return next; // sunk construction, maintenance and renovation are never refunded
  }
  function lifecycleDefaultPlan(p){return {offices:Object.fromEntries(lifecycleOffices(p).filter(active).map(o=>{const r=p.facilityLifecycle.records[o.id];return[o.id,{maintenance:r.maintenance,staffQuarters:copy(r.staffQuarters),hubId:r.hubId}];})),renovate:null,cancel:null};}
  function lifecycleValidateStaff(staff){if(!exact(staff,ROLES)||Object.values(staff).some(n=>!whole(n)||n>400))throw Error('Facility staff use bounded quarter-FTE allocations.');}
  function lifecycleAvailable(context){lifecycleValidateStaff(context.availableStaffQuarters);return context.availableStaffQuarters;}
  function lifecycleNext(book){return book.lastSettledCycle?book.lastSettledCycle+1:book.startedCycle;}
  function lifecycleContext(context,kind){
    if(!context||!whole(context.cycle)||context.cycle<1)throw Error('Lifecycle context requires a positive integer month.');
    if(['plan','settle'].includes(kind)&&!whole(context.freeCash))throw Error('Lifecycle cash budget must be a nonnegative integer.');
    if(['plan','advance'].includes(kind)&&(!Number.isFinite(context.freeExecution)||context.freeExecution<0||context.freeExecution>RULES.maxOffices))throw Error('Invalid shared execution capacity.');
    if(kind==='advance'&&(!Number.isFinite(context.workRate)||context.workRate<0||context.workRate>100))throw Error('Invalid renovation work rate.');
    if(context.extraWearBp!==undefined&&(!whole(context.extraWearBp)||context.extraWearBp>200))throw Error('Invalid external wear exposure.');
    if(context.occupiedMarkets!==undefined&&(!Array.isArray(context.occupiedMarkets)||context.occupiedMarkets.some(k=>typeof k!=='string')))throw Error('Invalid occupied market list.');
    if(context.restriction!==undefined&&typeof context.restriction!=='string')throw Error('Invalid facility restriction.');
  }
  function lifecycleTerms(p,o,context){
    const def=CATALOG[o.model];if(!def)throw Error('Unsupported facility model.');
    const result=typeof context.modelTerms==='function'?context.modelTerms(p,copy(o),def):{cost:def.cost,upkeep:def.upkeep,capacity:copy(def.capacity)};
    if(!result||!whole(result.cost)||!whole(result.upkeep)||!exact(result.capacity,Object.keys(def.capacity))||Object.values(result.capacity).some(n=>!Number.isFinite(n)||n<0||n>Number.MAX_SAFE_INTEGER))throw Error('Invalid authoritative facility economics.');
    return copy(result);
  }
  function lifecycleNormalize(p,plan,context){
    lifecycleContext(context,'plan');lifecycleValidate(p,context.cycle,true);
    if(!p.facilityLifecycle)throw Error('Facility lifecycle requires explicit campaign rules.');
    const ids=lifecycleOffices(p).filter(active).map(o=>o.id);
    if(!exact(plan,['offices','renovate','cancel'])||!exact(plan.offices,ids)||plan.renovate!==null&&typeof plan.renovate!=='string'||plan.cancel!==null&&typeof plan.cancel!=='string'||plan.renovate&&plan.cancel)
      throw Error('Invalid lifecycle orders.');
    const totals=Object.fromEntries(ROLES.map(r=>[r,0]));
    for(const id of ids){
      const order=plan.offices[id],o=lifecycleById(p,id);
      if(!exact(order,['maintenance','staffQuarters','hubId'])||!Object.hasOwn(modes,order.maintenance)||order.hubId!==null&&typeof order.hubId!=='string')throw Error('Invalid facility operating instructions.');
      lifecycleValidateStaff(order.staffQuarters);for(const r of ROLES)totals[r]+=order.staffQuarters[r];
      if(order.hubId!==null){const hub=lifecycleById(p,order.hubId);
        if(!hub||!active(hub)||hub.id===id||hub.model!=='regionalHub'||o.model==='regionalHub'||
          typeof context.nearby!=='function'||!context.nearby(hub.market,o.market))throw Error('Hub support requires an operating authored neighboring hub.');
      }
    }
    const pool=lifecycleAvailable(context);for(const r of ROLES)if(totals[r]>pool[r])throw Error('Facility staffing exceeds the same shared department pool.');
    if(plan.cancel&&(!ids.includes(plan.cancel)||!p.facilityLifecycle.records[plan.cancel].renovation))throw Error('No active renovation to cancel.');
    if(plan.renovate){
      const o=lifecycleById(p,plan.renovate),r=p.facilityLifecycle.records[plan.renovate];
      if(!o||!active(o)||!r||r.renovation||o.conversion||r.conditionBp===10000)throw Error('Choose a worn operating office without existing work.');
      if(lifecycleOffices(p).some(x=>active(x)&&x.market===o.market&&(x.conversion||p.facilityLifecycle.records[x.id]?.renovation))||(context.occupiedMarkets||[]).includes(o.market))throw Error('Another local project occupies this market.');
      if(context.restriction)throw Error(context.restriction);
      if(!Number.isFinite(context.freeExecution)||context.freeExecution<RULES.renovationCapacity)throw Error('Renovation requires one shared execution-capacity unit.');
    }
    return copy(plan);
  }
  function lifecycleAllocateStaff(p,pool){
    lifecycleValidateStaff(pool);const remaining=copy(pool),result=lifecycleDefaultPlan(p);
    // Deterministic bounded proposal only; does not alter policies or hire staff.
    for(const o of lifecycleOffices(p).filter(active))for(const role of ROLES){const n=Math.min(remaining[role],CATALOG[o.model].staffQuarters[role]);result.offices[o.id].staffQuarters[role]=n;remaining[role]-=n;}
    return {plan:result,unused:remaining};
  }
  function lifecycleMetrics(p,context){
    lifecycleContext(context,'metrics');
    const pool=lifecycleAvailable(context),requested=Object.fromEntries(ROLES.map(role=>[role,lifecycleOffices(p).filter(active).reduce((n,o)=>n+p.facilityLifecycle.records[o.id].staffQuarters[role],0)]));
    const rows=[],serviceScale=1000000;
    for(const o of lifecycleOffices(p).filter(active)){
      const r=p.facilityLifecycle.records[o.id],def=CATALOG[o.model],t=lifecycleTerms(p,o,context);
      lifecycleValidateStaff(r.staffQuarters);
      if(!whole(r.conditionBp)||r.conditionBp>10000||!whole(r.rampMonths)||r.rampMonths>4||!Object.hasOwn(modes,r.maintenance))throw Error('Invalid facility operating inputs.');
      const effectiveStaffQuarters=Object.fromEntries(ROLES.map(role=>[role,r.staffQuarters[role]*Math.min(1,requested[role]?pool[role]/requested[role]:1)]));
      const soften=p?.accounting?.version===4,
        ratio=role=>def.staffQuarters[role]?(n=>soften?.25+.75*n:n)(Math.min(1,effectiveStaffQuarters[role]/def.staffQuarters[role])):1;
      const ops=ratio('operations'),condition=r.conditionBp<=RULES.criticalCondition?0:.25+.75*r.conditionBp/10000;
      const ramp=Math.min(1,(r.rampMonths+1)/RULES.rampMonths),disruption=(o.conversion||r.renovation)?RULES.renovationDisruption:1;
      const factor=condition*ramp*disruption*ops;
      const licensed=typeof context.wealthLicensed==='function'&&context.wealthLicensed(p,copy(o))===true;
      const sales=def.staffQuarters.service?ratio('service'):ratio('business');
      const lending=def.staffQuarters.lending?ratio('lending'):sales;
      const capacity={depositCapacity:t.capacity.depositCapacity*factor*sales,loanCapacity:t.capacity.loanCapacity*factor*lending,
        serviceCapacity:t.capacity.serviceCapacity*factor*sales,advisoryCapacity:licensed?t.capacity.advisoryCapacity*factor*ratio('wealth'):0};
      if(capacity.serviceCapacity>1000000)throw Error('Service throughput exceeds fixed-point range.');
      capacity.serviceCapacity=Math.floor(capacity.serviceCapacity*serviceScale)/serviceScale;
      if(o.model==='wealth'&&!licensed)for(const key of Object.keys(capacity))capacity[key]=0;
      rows.push({officeId:o.id,market:o.market,model:o.model,conditionBp:r.conditionBp,deferredWearBp:r.deferredWearBp,
        ramp,staffQuarters:copy(r.staffQuarters),effectiveStaffQuarters,upkeep:t.upkeep,maintenance:Math.round(t.upkeep*RULES.maintenanceShare*modes[r.maintenance].spend),
        licensedAdvisory:licensed,capacity,supportSent:0,supportReceived:0,supportAvailable:Math.min(def.support*factor,capacity.serviceCapacity),hubId:r.hubId});
    }
    // Links MOVE finite service throughput from a staffed hub, never multiply it.
    for(const hub of rows.filter(r=>r.model==='regionalHub')){
      const receivers=rows.filter(r=>r.hubId===hub.officeId&&r.conditionBp>RULES.criticalCondition&&r.effectiveStaffQuarters.operations>0&&(r.model!=='wealth'||r.licensedAdvisory)&&context.nearby?.(hub.market,r.market));
      if(!receivers.length)continue;
      const sourceUnits=Math.round(hub.capacity.serviceCapacity*serviceScale),usableUnits=Math.min(Math.floor(hub.supportAvailable*serviceScale),sourceUnits);
      hub.capacity.serviceCapacity=(sourceUnits-usableUnits)/serviceScale;hub.supportSent=usableUnits/serviceScale;
      let allocated=0;for(const [i,r]of receivers.entries()){
        const target=Math.floor(usableUnits*(i+1)/receivers.length),units=target-allocated;allocated=target;
        r.capacity.serviceCapacity=(Math.round(r.capacity.serviceCapacity*serviceScale)+units)/serviceScale;r.supportReceived=units/serviceScale;
      }
    }
    const totals={upkeep:rows.reduce((n,r)=>n+r.upkeep,0),maintenance:rows.reduce((n,r)=>n+r.maintenance,0),
      capacity:Object.fromEntries(Object.keys(CATALOG.retail.capacity).map(k=>[k,k==='serviceCapacity'?rows.reduce((n,r)=>n+Math.round(r.capacity[k]*serviceScale),0)/serviceScale:rows.reduce((n,r)=>n+r.capacity[k],0)]))};
    if(!whole(totals.upkeep)||!whole(totals.maintenance)||Object.values(totals.capacity).some(n=>!Number.isFinite(n)||n<0||n>Number.MAX_SAFE_INTEGER))throw Error('Facility totals exceed safe simulation range.');
    return {rows,totals};
  }
  function lifecycleQuote(p,plan,context){
    const valid=lifecycleNormalize(p,plan,context),next=copy(p);
    for(const [id,settings]of Object.entries(valid.offices))Object.assign(next.facilityLifecycle.records[id],settings);
    const cost=valid.renovate?Math.round(lifecycleTerms(p,lifecycleById(p,valid.renovate),context).cost*RULES.renovationCostShare):0;
    const beforeMetrics=lifecycleMetrics(next,context);
    if(valid.cancel)next.facilityLifecycle.records[valid.cancel].renovation=null;
    if(valid.renovate)next.facilityLifecycle.records[valid.renovate].renovation={cost,work:0,startedCycle:context.cycle,readyCycle:null};
    const measured=lifecycleMetrics(next,context),after=copy(next);
    if(valid.renovate){after.facilityLifecycle.records[valid.renovate].renovation=null;after.facilityLifecycle.records[valid.renovate].conditionBp=10000;}
    const afterMetrics=lifecycleMetrics(after,context),spend=cost+measured.totals.maintenance;
    if(!whole(spend))throw Error('Facility commitments exceed safe accounting range.');
    return {eligible:Number.isFinite(context.freeCash)&&context.freeCash>=spend,reason:context.freeCash>=spend?'':'Maintenance and renovation exceed cash after other commitments and reserves.',
      plan:valid,renovationCost:cost,maintenance:measured.totals.maintenance,total:spend,execution:valid.renovate?1:0,beforeMetrics,metrics:measured,afterMetrics,
      activation:'Renovation restores condition only next month after completed work; full upkeep remains due.'};
  }
  function lifecyclePay(next,amount,source,context){
    if(!amount)return;
    if(typeof context.payCash!=='function')throw Error('A paired real-cash accounting adapter is required.');
    const cash=typeof context.cashBalance==='function'?context.cashBalance:x=>x.accounting?.accounts.cash;
    const before=cash(next);if(!whole(before)||before<amount)throw Error('Facility spending cannot borrow or create cash.');
    context.payCash(next,amount,source);
    if(cash(next)!==before-amount)throw Error('Facility accounting must pay exactly once from existing cash.');
  }
  function lifecyclePrepare(p,plan,context,forecast=false){
    lifecycleContext(context,'plan');lifecycleValidate(p,context.cycle,true);
    const b=p.facilityLifecycle;if(!b||!whole(context.cycle)||context.cycle<1)throw Error('Invalid lifecycle preparation.');
    if(b.lastPreparedCycle===context.cycle)return {owner:copy(p),events:[]};
    if(context.cycle!==lifecycleNext(b)||b.lastActivatedCycle!==context.cycle)throw Error('Prepare the activated unsettled month, without skipping a closing.');
    const q=lifecycleQuote(p,plan,context);
    // A forecast may show unfunded maintenance deteriorating; that is not
    // authorization to stage it. Upfront renovation still requires real cash.
    if(!q.eligible&&(!forecast||q.renovationCost>context.freeCash))throw Error(q.reason);
    const next=copy(p),book=next.facilityLifecycle,events=[];
    for(const [id,settings]of Object.entries(q.plan.offices))Object.assign(book.records[id],settings);
    if(q.plan.cancel){book.records[q.plan.cancel].renovation=null;events.push({type:'renovation.cancelled',officeId:q.plan.cancel,refund:0});}
    if(q.plan.renovate){lifecyclePay(next,q.renovationCost,'facility.renovation',context);book.records[q.plan.renovate].renovation={cost:q.renovationCost,work:0,startedCycle:context.cycle,readyCycle:null};events.push({type:'renovation.started',officeId:q.plan.renovate,cost:q.renovationCost});}
    book.lastPreparedCycle=context.cycle;return {owner:next,events};
  }
  function lifecycleAdvance(p,context){
    lifecycleContext(context,'advance');lifecycleValidate(p,context.cycle,true);
    const next=copy(p),b=next.facilityLifecycle,events=[];if(!b||!whole(context.cycle)||context.cycle<1||!Number.isFinite(context.freeExecution)||context.freeExecution<0||!Number.isFinite(context.workRate)||context.workRate<0)throw Error('Invalid renovation progress.');
    if(b.lastAdvancedCycle===context.cycle)return {owner:next,events,usedCapacity:b.lastAdvanceCapacity};
    if(context.cycle!==lifecycleNext(b)||b.lastPreparedCycle!==context.cycle)throw Error('Prepare the current month before advancing renovation.');
    let lifecycleCapacityUsed=0;
    for(const o of lifecycleOffices(next).filter(active)){const r=b.records[o.id].renovation;if(!r||r.readyCycle!==null)continue;
      if(lifecycleCapacityUsed+1>context.freeExecution){events.push({type:'renovation.stalled',officeId:o.id});continue;}
      lifecycleCapacityUsed++;r.work=Math.min(RULES.renovationWork,r.work+context.workRate);if(r.work===RULES.renovationWork)r.readyCycle=context.cycle+1;
      events.push({type:'renovation.progress',officeId:o.id,work:r.work,readyCycle:r.readyCycle});
    }
    b.lastAdvancedCycle=context.cycle;b.lastAdvanceCapacity=lifecycleCapacityUsed;return {owner:next,events,usedCapacity:lifecycleCapacityUsed};
  }
  function lifecycleSettle(p,context){
    lifecycleContext(context,'settle');lifecycleValidate(p,context.cycle,true);
    const next=copy(p),b=next.facilityLifecycle;
    if(!b||!whole(context.cycle)||context.cycle<1||!whole(context.freeCash)||!whole(context.extraWearBp||0)||(context.extraWearBp||0)>200)throw Error('Invalid facility maintenance settlement.');
    if(b.lastSettledCycle===context.cycle)return {owner:next,report:copy(b.report)};
    if(context.cycle!==lifecycleNext(b)||b.lastPreparedCycle!==context.cycle||b.lastAdvancedCycle!==context.cycle)throw Error('Maintenance must close the prepared and advanced month exactly once.');
    const requested=lifecycleMetrics(next,context),total=requested.totals.maintenance,budget=Math.min(total,context.freeCash);
    if(!whole(total))throw Error('Facility maintenance exceeds safe accounting range.');
    let allocated=0,cumulative=0;const rows=[];
    for(const [i,row]of requested.rows.entries()){
      const r=b.records[row.officeId];cumulative+=row.maintenance;
      const share=total?Number(BigInt(budget)*BigInt(cumulative)/BigInt(total)):0,cost=share-allocated;allocated=share;
      lifecyclePay(next,cost,'facility.maintenance',context);
      const coverage=row.maintenance?cost/row.maintenance:1;
      const wear=Math.round(modes[r.maintenance].wear+(180-modes[r.maintenance].wear)*(1-coverage))+(context.extraWearBp||0);
      const before=r.conditionBp;r.conditionBp=Math.max(0,before-wear);r.deferredWearBp=Math.min(10000,r.deferredWearBp+Math.max(0,wear-20));r.ageMonths++;r.rampMonths=Math.min(4,r.rampMonths+1);
      rows.push({officeId:row.officeId,requested:row.maintenance,paid:cost,conditionBefore:before,conditionAfter:r.conditionBp,wear});
    }
    b.report={cycle:context.cycle,requested:total,paid:budget,unfunded:total-budget,rows};b.lastSettledCycle=context.cycle;
    b.history.push(copy(b.report));if(b.history.length>RULES.historyLimit)b.history.shift();return {owner:next,report:copy(b.report)};
  }
  function lifecycleActivate(p,cycle){
    lifecycleValidate(p,cycle,true);
    const next=copy(p),b=next.facilityLifecycle,events=[];if(!b||!whole(cycle)||cycle<1||b.lastActivatedCycle>cycle)throw Error('Invalid renovation activation.');
    if(b.lastActivatedCycle===cycle)return {owner:next,events};
    if(cycle!==lifecycleNext(b)||b.lastPreparedCycle!==b.lastSettledCycle||b.lastAdvancedCycle!==b.lastSettledCycle)throw Error('Activate the next planning month only after the completed closing.');
    for(const o of lifecycleOffices(next).filter(active)){const r=b.records[o.id],job=r.renovation;
      if(job&&job.readyCycle!==null&&job.readyCycle<=cycle){r.conditionBp=10000;r.deferredWearBp=0;r.renovations++;r.renovation=null;events.push({type:'renovation.activated',officeId:o.id});}
    }
    b.lastActivatedCycle=cycle;return {owner:next,events};
  }
  function lifecycleAttribute(p,context,localBooks){
    const measured=lifecycleMetrics(p,context),fields=['customers','deposits','loans','revenue','expense'];
    if(!localBooks||typeof localBooks!=='object'||Array.isArray(localBooks)||fields.some(field=>!whole(Object.values(localBooks).reduce((n,b)=>n+(b?.[field]||0),0))))throw Error('Local attribution totals exceed safe accounting range.');
    const rows=measured.rows.map(r=>({officeId:r.officeId,market:r.market,...Object.fromEntries(fields.map(k=>[k,0]))})),unattributed={};
    for(const [market,book]of Object.entries(localBooks)){
      if(!exact(book,fields)||Object.values(book).some(n=>!whole(n)))throw Error('Attribution requires actual reconciled local books.');
      const eligible=measured.rows.filter(r=>r.market===market);unattributed[market]=Object.fromEntries(fields.map(k=>[k,0]));
      for(const field of fields){const key=field==='deposits'?'depositCapacity':field==='loans'?'loanCapacity':'serviceCapacity',weights=eligible.map(r=>field==='expense'?r.upkeep+r.maintenance:r.capacity[key]),sum=weights.reduce((a,b)=>a+b,0);
        if(!sum){unattributed[market][field]=book[field];continue;}
        let allocated=0,cumulative=0;eligible.forEach((r,i)=>{cumulative+=weights[i];const target=Math.min(book[field],Math.floor(book[field]*(cumulative/sum))),amount=target-allocated;allocated=target;rows.find(x=>x.officeId===r.officeId)[field]+=amount;});
      }
    }
    for(const r of rows)r.contribution=r.revenue-r.expense;
    return {rows,unattributed}; // presentation attribution only; no cash or book posting
  }
  function lifecycleValidate(p,cycle,enabled){
    const b=p.facilityLifecycle;if(enabled!==true){if(b!==undefined)throw Error('Unversioned facility lifecycle.');return;}
    if(!whole(cycle)||cycle<1||!exact(b,['version','startedCycle','records','lastPreparedCycle','lastSettledCycle','lastAdvancedCycle','lastAdvanceCapacity','lastActivatedCycle','report','history'])||b.version!==VERSION||
      !whole(b.startedCycle)||b.startedCycle<1||b.startedCycle>cycle||!whole(b.lastAdvanceCapacity)||b.lastAdvanceCapacity>RULES.maxOffices||
      !exact(b.records,lifecycleOffices(p).map(o=>o.id))||!Array.isArray(b.history)||b.history.length>48||
      ['lastPreparedCycle','lastSettledCycle','lastAdvancedCycle','lastActivatedCycle'].some(k=>!whole(b[k])||b[k]>cycle))throw Error('Invalid facility lifecycle book.');
    const next=lifecycleNext(b);
    if(b.lastPreparedCycle>b.lastSettledCycle&&b.lastPreparedCycle!==next||b.lastPreparedCycle<b.lastSettledCycle||
      b.lastAdvancedCycle>b.lastPreparedCycle||b.lastAdvancedCycle<b.lastSettledCycle||
      ![b.lastSettledCycle||b.startedCycle,next].includes(b.lastActivatedCycle)||
      b.lastAdvancedCycle===0&&b.lastAdvanceCapacity!==0||
      ['lastPreparedCycle','lastSettledCycle','lastAdvancedCycle'].some(k=>b[k]!==0&&b[k]<b.startedCycle))throw Error('Facility lifecycle phases disagree.');
    for(const o of lifecycleOffices(p)){const r=b.records[o.id];
      if(o.openedCycle>cycle||o.closedCycle!==null&&o.closedCycle>cycle||!CATALOG[o.model]||!exact(r,['conditionBp','deferredWearBp','ageMonths','initialRampMonths','rampMonths','maintenance','staffQuarters','hubId','renovation','renovations','registeredCycle'])||
        !whole(r.conditionBp)||r.conditionBp>10000||!whole(r.deferredWearBp)||r.deferredWearBp>10000||!whole(r.ageMonths)||!whole(r.rampMonths)||r.rampMonths>4||
        ![0,4].includes(r.initialRampMonths)||r.rampMonths!==Math.min(4,r.initialRampMonths+r.ageMonths)||
        !whole(r.renovations)||!whole(r.registeredCycle)||r.registeredCycle<b.startedCycle||r.registeredCycle>cycle||r.registeredCycle<o.openedCycle||
        r.initialRampMonths===4&&r.registeredCycle!==b.startedCycle||r.initialRampMonths===0&&r.registeredCycle!==o.openedCycle||!Object.hasOwn(modes,r.maintenance))throw Error('Invalid lifecycle record.');
      const upperAge=Math.max(0,Math.min(b.lastSettledCycle,o.closedCycle??b.lastSettledCycle)-r.registeredCycle+1),
        lowerAge=active(o)?upperAge:Math.max(0,Math.min(b.lastSettledCycle,o.closedCycle-1)-r.registeredCycle+1);
      if(r.ageMonths<lowerAge||r.ageMonths>upperAge)throw Error('Facility age does not match registered closing history.');
      lifecycleValidateStaff(r.staffQuarters);
      if(r.hubId!==null){const hub=lifecycleById(p,r.hubId);if(!hub||!active(hub)||hub.model!=='regionalHub'||hub.id===o.id||o.model==='regionalHub')throw Error('Invalid persistent hub link.');}
      if(!active(o)&&(r.renovation||r.hubId||Object.values(r.staffQuarters).some(Boolean)))throw Error('Closed facility retains active resources.');
      if(r.renovation!==null){const j=r.renovation;
        if(o.conversion||!active(o)||!exact(j,['cost','work','startedCycle','readyCycle'])||!whole(j.cost)||!Number.isFinite(j.work)||j.work<0||j.work>2||
          !whole(j.startedCycle)||j.startedCycle<r.registeredCycle||j.startedCycle>cycle||(j.readyCycle===null?j.work===2:!whole(j.readyCycle)||j.readyCycle<j.startedCycle+1||j.readyCycle>cycle+1||j.work!==2))throw Error('Invalid renovation work record.');
      }
    }
    if((b.lastSettledCycle===0)!==(b.report===null))throw Error('Invalid lifecycle report boundary.');
    const expectedHistory=b.lastSettledCycle?Math.min(48,b.lastSettledCycle-b.startedCycle+1):0;
    if(b.history.length!==expectedHistory)throw Error('Missing facility closing history.');
    let previousCycle=b.lastSettledCycle?b.lastSettledCycle-b.history.length:0;
    for(const report of b.history){if(!exact(report,['cycle','requested','paid','unfunded','rows'])||!whole(report.cycle)||report.cycle!==previousCycle+1||report.cycle>cycle||!whole(report.requested)||!whole(report.paid)||!whole(report.unfunded)||report.requested!==report.paid+report.unfunded||!Array.isArray(report.rows))throw Error('Invalid maintenance history.');
      previousCycle=report.cycle;
      const seen=new Set();let requested=0,paid=0;for(const row of report.rows){if(!exact(row,['officeId','requested','paid','conditionBefore','conditionAfter','wear'])||!b.records[row.officeId]||seen.has(row.officeId)||['requested','paid','conditionBefore','conditionAfter','wear'].some(k=>!whole(row[k]))||row.paid>row.requested||row.conditionBefore>10000||row.conditionAfter!==Math.max(0,row.conditionBefore-row.wear))throw Error('Invalid maintenance settlement row.');seen.add(row.officeId);requested+=row.requested;paid+=row.paid;}
      if(requested!==report.requested||paid!==report.paid)throw Error('Maintenance rows do not reconcile.');
    }
    if(b.report&&(b.report.cycle!==b.lastSettledCycle||JSON.stringify(b.report)!==JSON.stringify(b.history.at(-1))))throw Error('Maintenance report/history mismatch.');
  }
  return Object.freeze({VERSION,ROLES,RULES,CATALOG,modes,initialize:lifecycleInitialize,register:lifecycleRegister,close:lifecycleClose,defaultPlan:lifecycleDefaultPlan,allocateStaff:lifecycleAllocateStaff,normalize:lifecycleNormalize,metrics:lifecycleMetrics,quote:lifecycleQuote,prepare:lifecyclePrepare,advance:lifecycleAdvance,settle:lifecycleSettle,activate:lifecycleActivate,attribute:lifecycleAttribute,validate:lifecycleValidate});
})();
