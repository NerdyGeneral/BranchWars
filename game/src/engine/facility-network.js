// Group 4 foundation. Pure identified-office domain; coordinators provide the
// authoritative pricing, accounting and shared execution-capacity adapters.
// No global overrides and no automatic upgrade of historical campaigns.
const FacilityNetwork = (() => {
  const VERSION=1, MODELS=Object.freeze(['retail','commercial','digital']);
  const CATALOG_VERSION=2,ALL_MODELS=Object.freeze([...MODELS,'atm','wealth','financialCenter','regionalHub']);
  const RULES=Object.freeze({costShare:.35,work:2,capacity:1,disruption:.5,maxRecords:4096});
  const copy=x=>JSON.parse(JSON.stringify(x));
  const whole=n=>Number.isSafeInteger(n)&&n>=0;
  const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===keys.slice().sort().join();
  const active=o=>o.closedCycle===null;
  function facilityDomainModels(p){return p.facilityNetwork?.version===CATALOG_VERSION?ALL_MODELS:MODELS;}
  function identifiedOffice(p,id){return p.facilityNetwork?.offices.find(o=>o.id===id)||null;}
  function facilityDomainMirrors(p){
    const markets=Object.fromEntries(Object.keys(p.branches).map(k=>[k,[]]));
    const facilities=Object.fromEntries(facilityDomainModels(p).map(m=>[m,0]));
    for(const o of p.facilityNetwork.offices)if(active(o)){
      if(!Object.hasOwn(markets,o.market))throw Error('Facility belongs to an unknown market.');
      markets[o.market].push(o.model);facilities[o.model]++;
    }
    return {facilityMarkets:markets,facilities,branches:Object.fromEntries(Object.entries(markets).map(([k,v])=>[k,v.length]))};
  }
  function facilityDomainPublishMirrors(p){Object.assign(p,facilityDomainMirrors(p));}
  function facilityDomainInitialize(g,enabled){
    if(enabled!==true)return g;
    const version=[5,6,7].includes(g.financialGroupVersion)?CATALOG_VERSION:VERSION,models=version===CATALOG_VERSION?ALL_MODELS:MODELS;
    const staged=[];
    for(const p of g.players){
      if(p.facilityNetwork)throw Error('Facility identities are already initialized.');
      const offices=[],counts=Object.fromEntries(models.map(m=>[m,0]));let nextId=1;
      for(const [market,count]of Object.entries(p.branches)){
        const models=p.facilityMarkets?.[market]||[];
        if(!whole(count)||!Array.isArray(models)||models.length!==count||models.some(m=>!(version===CATALOG_VERSION?ALL_MODELS:MODELS).includes(m)))
          throw Error('Opening facility identities must match actual known offices; no inferred free offices.');
        for(const model of models){
          offices.push({id:p.id+':office:'+nextId++,market,model,openedCycle:g.cycle,
            closedCycle:null,conversions:0,conversion:null});counts[model]++;
        }
      }
      if(models.some(m=>counts[m]!==(!MODELS.includes(m)&&version===CATALOG_VERSION?(p.facilities[m]??0):p.facilities[m])))throw Error('Opening facility totals do not reconcile.');
      staged.push({p,book:{version,nextId,offices,lastPreparedCycle:0,lastAdvancedCycle:0,lastActivatedCycle:0}});
    }
    for(const {p,book}of staged){p.facilityNetwork=book;facilityDomainPublishMirrors(p);}
    return g;
  }
  function facilityDomainOpen(p,market,model,cycle){
    const b=p.facilityNetwork;
    if(!b||!whole(b.nextId)||b.nextId>=Number.MAX_SAFE_INTEGER||!facilityDomainModels(p).includes(model)||!Object.hasOwn(p.branches,market)||!whole(cycle)||cycle<1||b.offices.length>=RULES.maxRecords)
      throw Error('Invalid identified facility opening.');
    const o={id:p.id+':office:'+b.nextId++,market,model,openedCycle:cycle,closedCycle:null,conversions:0,conversion:null};
    b.offices.push(o);facilityDomainPublishMirrors(p);return copy(o);
  }
  function facilityDomainClose(p,id,cycle){
    const o=identifiedOffice(p,id);
    if(!o||!active(o)||!whole(cycle)||cycle<o.openedCycle)throw Error('Select an operating office to close.');
    const abandoned=o.conversion?copy(o.conversion):null;
    o.closedCycle=cycle;o.conversion=null;facilityDomainPublishMirrors(p);
    return {type:'facility.closed',officeId:id,market:o.market,model:o.model,abandoned,refund:0};
  }
  function facilityDomainLastOffice(p,market){return p.facilityNetwork?.offices.filter(o=>active(o)&&o.market===market).at(-1)||null;}
  function facilityDomainPending(p){return (p.facilityNetwork?.offices||[]).filter(o=>active(o)&&o.conversion);}
  function facilityDomainCommittedCapacity(p){return facilityDomainPending(p).length*RULES.capacity;}
  function facilityDomainEffectiveCounts(p,market){
    const totals=Object.fromEntries(facilityDomainModels(p).map(m=>[m,0]));
    for(const o of p.facilityNetwork.offices)if(active(o)&&o.market===market)totals[o.model]+=o.conversion?RULES.disruption:1;
    return totals;
  }
  function facilityDomainMeasured(p,o,provider){
    const m=provider(p,copy(o));
    if(!m||!['expense','depositCapacity','loanCapacity'].every(k=>Number.isFinite(m[k])&&m[k]>=0))
      throw Error('Facility metrics must come from authoritative nonnegative operating quotes.');
    return copy(m);
  }
  function facilityDomainCapacityDuring(metrics){
    const during={...metrics};
    for(const key of ['depositCapacity','loanCapacity','serviceCapacity','advisoryCapacity'])if(during[key]!==undefined)during[key]*=RULES.disruption;
    return during; // full original expense deliberately retained
  }
  function facilityDomainQuote(p,request,context){
    const fail=reason=>({eligible:false,reason});
    if(!p.facilityNetwork)return fail('Identified facilities require the new campaign rules.');
    if(!exact(request,['officeId','model'])||typeof request.officeId!=='string'||!facilityDomainModels(p).includes(request.model))return fail('Choose a known office and destination model.');
    const o=identifiedOffice(p,request.officeId);
    if(!o||!active(o))return fail('That office is not operating.');
    if(o.model===request.model)return fail('The office already uses that model.');
    if(o.conversion)return fail('That office already has a conversion in progress.');
    if(p.facilityNetwork.version===CATALOG_VERSION){
      const issue=typeof context.modelIssue==='function'?context.modelIssue(p,o.market,request.model):
        request.model==='wealth'?'A licensed operating wealth subsidiary is required.':'';
      if(issue)return fail(issue);
      if(p.facilityLifecycle?.records[o.id]?.renovation)return fail('That office already has a renovation in progress.');
    }
    if(facilityDomainPending(p).some(x=>x.market===o.market)||(context.occupiedMarkets||[]).includes(o.market))return fail('Only one local facility project may operate in this market.');
    const newCost=context.newOfficeCost(p,o.market,request.model);
    if(!whole(newCost))throw Error('Destination new-office quote is invalid.');
    const cost=Math.round(newCost*RULES.costShare),before=facilityDomainMeasured(p,o,context.officeMetrics);
    const after=facilityDomainMeasured(p,{...o,model:request.model},context.officeMetrics);
    const result={eligible:true,reason:'',officeId:o.id,market:o.market,from:o.model,to:request.model,
      cost,newOfficeCost:newCost,work:RULES.work,capacity:RULES.capacity,
      before,during:facilityDomainCapacityDuring(before),after,activation:'Next month after completed work; obligations persist.'};
    if(!Number.isFinite(context.freeCash)||context.freeCash<cost)return {...result,eligible:false,reason:'Conversion exceeds cash available after all commitments and reserves.'};
    if(!Number.isFinite(context.freeExecution)||context.freeExecution+1e-9<RULES.capacity)return {...result,eligible:false,reason:'Conversion requires one unreserved execution-capacity unit.'};
    if(context.restriction)return {...result,eligible:false,reason:context.restriction};
    return result;
  }
  function facilityDomainPolicy(p,plan,context){
    if(!p.facilityNetwork){if(plan.facilityPolicy!==undefined)throw Error('Unversioned facility instructions.');return null;}
    const s=plan.facilityPolicy===undefined?{convert:null,cancel:null}:copy(plan.facilityPolicy);
    if(!exact(s,['convert','cancel'])||s.cancel!==null&&typeof s.cancel!=='string'||s.convert!==null&&s.cancel!==null)
      throw Error('Choose one facility conversion or cancellation.');
    if(s.cancel!==null&&!identifiedOffice(p,s.cancel)?.conversion)throw Error('That office has no conversion to cancel.');
    if(s.convert!==null){const q=facilityDomainQuote(p,s.convert,context);if(!q.eligible)throw Error(q.reason);}
    return s;
  }
  function facilityDomainPrepare(p,plan,context){
    const b=p.facilityNetwork;if(!b){facilityDomainPolicy(p,plan,context);return [];}
    if(!whole(context.cycle)||context.cycle<1)throw Error('Invalid facility settlement month.');
    if(b.lastPreparedCycle===context.cycle)return [];
    if(b.lastPreparedCycle>context.cycle)throw Error('Stale facility preparation.');
    const s=facilityDomainPolicy(p,plan,context),events=[];
    if(s.convert){
      const q=facilityDomainQuote(p,s.convert,context),o=identifiedOffice(p,q.officeId);
      // The caller posts one real cash/expense journal and its causal event.
      // A failed charge must throw before any office state is changed.
      context.payCost(p,q.cost,{type:'facility.conversion',officeId:o.id,market:o.market});
      o.conversion={model:q.to,cost:q.cost,work:0,startedCycle:context.cycle,readyCycle:null};
      events.push({type:'facility.conversion.started',officeId:o.id,market:o.market,from:o.model,to:q.to,cost:q.cost});
    }else if(s.cancel!==null){
      const o=identifiedOffice(p,s.cancel);events.push({type:'facility.conversion.cancelled',officeId:o.id,market:o.market,refund:0});o.conversion=null;
    }
    b.lastPreparedCycle=context.cycle;return events;
  }
  function facilityDomainAdvance(p,{cycle,freeExecution,workRate}){
    const b=p.facilityNetwork;if(!b)return {usedCapacity:0,events:[]};
    if(!whole(cycle)||cycle<1||!Number.isFinite(freeExecution)||freeExecution<0||!Number.isFinite(workRate)||workRate<0)
      throw Error('Invalid shared facility execution budget.');
    if(b.lastAdvancedCycle===cycle)return {usedCapacity:0,events:[]};
    if(b.lastAdvancedCycle>cycle)throw Error('Stale facility progress.');
    let spentExecution=0;const events=[];
    for(const o of facilityDomainPending(p)){
      const c=o.conversion;if(c.readyCycle!==null)continue;
      if(spentExecution+RULES.capacity>freeExecution+1e-9){events.push({type:'facility.conversion.stalled',officeId:o.id,reason:'Shared execution capacity is unavailable.'});continue;}
      spentExecution+=RULES.capacity;c.work=Math.min(RULES.work,c.work+workRate);
      if(c.work===RULES.work)c.readyCycle=cycle+1;
      events.push({type:c.readyCycle?'facility.conversion.completed':'facility.conversion.progress',officeId:o.id,work:c.work,readyCycle:c.readyCycle});
    }
    b.lastAdvancedCycle=cycle;return {usedCapacity:spentExecution,events};
  }
  function facilityDomainActivate(p,cycle){
    const b=p.facilityNetwork;if(!b)return [];
    if(!whole(cycle)||cycle<1||b.lastActivatedCycle>cycle)throw Error('Invalid facility activation month.');
    if(b.lastActivatedCycle===cycle)return [];
    const events=[];
    for(const o of facilityDomainPending(p))if(o.conversion.readyCycle!==null&&o.conversion.readyCycle<=cycle){
      const from=o.model;o.model=o.conversion.model;o.conversion=null;o.conversions++;
      events.push({type:'facility.conversion.activated',officeId:o.id,market:o.market,from,to:o.model});
    }
    b.lastActivatedCycle=cycle;facilityDomainPublishMirrors(p);return events;
  }
  function facilityDomainAdjustRegionalMetrics(p,metrics,provider){
    if(!p.facilityNetwork)return metrics;
    const out=copy(metrics);
    for(const o of facilityDomainPending(p)){
      const m=facilityDomainMeasured(p,o,provider),row=out.rows.find(r=>r.key===o.market);
      if(!row)throw Error('Converting office is absent from regional metrics.');
      for(const key of ['depositCapacity','loanCapacity']){
        const reduction=m[key]*(1-RULES.disruption);row[key]-=reduction;out[key]-=reduction;
      }
    }
    for(const key of ['depositCapacity','loanCapacity']){
      const central=metrics[key]-metrics.rows.reduce((sum,row)=>sum+row[key],0);
      for(const row of out.rows)row[key]=Math.round(row[key]);
      out[key]=central+out.rows.reduce((sum,row)=>sum+row[key],0);
    }
    return out; // No expense or unrelated product/customer/capital mutation.
  }
  function facilityDomainChoose(p,context){
    const none={convert:null,cancel:null};if(!p.facilityNetwork)return null;
    if(typeof context.score!=='function')return none;
    let best=null;
    for(const o of p.facilityNetwork.offices)if(active(o))for(const model of facilityDomainModels(p)){
      const request={officeId:o.id,model},q=facilityDomainQuote(p,request,context);if(!q.eligible)continue;
      const value=context.score(q);
      if(Number.isFinite(value)&&value>0&&(!best||value>best.value))best={request,value};
    }
    return best?{convert:best.request,cancel:null}:none;
  }
  function facilityDomainProject(g,out,index,enabled){
    if(enabled!==true)return;
    out.me.facilityNetwork=copy(g.players[index].facilityNetwork);
    delete out.rival.facilityNetwork;
    if(out.lastPlans?.[g.players[1-index].id])delete out.lastPlans[g.players[1-index].id].facilityPolicy;
  }
  function facilityDomainValidateView(view,enabled){
    facilityDomainValidate(view.me,view.cycle,enabled);
    if(view.rival?.facilityNetwork!==undefined||view.lastPlans?.[view.rival?.id]?.facilityPolicy!==undefined)
      throw Error('Private facility information exposed.');
  }
  function facilityDomainValidate(p,cycle,enabled){
    if(enabled!==true){if(p.facilityNetwork!==undefined||p.submitted?.facilityPolicy!==undefined)throw Error('Unversioned identified facility state.');return;}
    const b=p.facilityNetwork;
    if(!exact(b,['version','nextId','offices','lastPreparedCycle','lastAdvancedCycle','lastActivatedCycle'])||![VERSION,CATALOG_VERSION].includes(b.version)||
      !whole(b.nextId)||b.nextId<1||!Array.isArray(b.offices)||b.offices.length>RULES.maxRecords||
      ['lastPreparedCycle','lastAdvancedCycle','lastActivatedCycle'].some(k=>!whole(b[k])||b[k]>cycle))throw Error('Invalid facility network.');
    const seen=new Set();
    for(const o of b.offices){
      const serial=typeof o?.id==='string'&&o.id.startsWith(p.id+':office:')?Number(o.id.slice((p.id+':office:').length)):NaN;
      if(!exact(o,['id','market','model','openedCycle','closedCycle','conversions','conversion'])||!whole(serial)||serial<1||serial>=b.nextId||
        o.id!==p.id+':office:'+serial||seen.has(o.id)||!Object.hasOwn(p.branches,o.market)||!facilityDomainModels(p).includes(o.model)||
        !whole(o.openedCycle)||o.openedCycle<1||o.openedCycle>cycle||!whole(o.conversions)||
        o.closedCycle!==null&&(!whole(o.closedCycle)||o.closedCycle<o.openedCycle||o.closedCycle>cycle))throw Error('Invalid stable office identity.');
      seen.add(o.id);
      if(o.conversion!==null){const c=o.conversion;
        if(!active(o)||!exact(c,['model','cost','work','startedCycle','readyCycle'])||!facilityDomainModels(p).includes(c.model)||c.model===o.model||!whole(c.cost)||
          !Number.isFinite(c.work)||c.work<0||c.work>RULES.work||!whole(c.startedCycle)||c.startedCycle<o.openedCycle||c.startedCycle>cycle||
          (c.readyCycle===null?c.work===RULES.work:!whole(c.readyCycle)||c.readyCycle<c.startedCycle+1||c.readyCycle>cycle+1||c.work!==RULES.work))
          throw Error('Invalid facility conversion obligation.');
      }
    }
    const markets=facilityDomainPending(p).map(o=>o.market);if(new Set(markets).size!==markets.length)throw Error('Conflicting local facility conversions.');
    const expected=facilityDomainMirrors(p);
    for(const key of ['branches','facilities','facilityMarkets']){
      const actual=p[key];if(!actual||Object.keys(actual).sort().join()!==Object.keys(expected[key]).sort().join()||
        Object.keys(expected[key]).some(k=>JSON.stringify(actual[k])!==JSON.stringify(expected[key][k])))throw Error('Facility identity and legacy mirror mismatch.');
    }
  }
  return Object.freeze({VERSION,CATALOG_VERSION,MODELS,ALL_MODELS,models:facilityDomainModels,RULES,initialize:facilityDomainInitialize,office:identifiedOffice,open:facilityDomainOpen,close:facilityDomainClose,lastOffice:facilityDomainLastOffice,pending:facilityDomainPending,committedCapacity:facilityDomainCommittedCapacity,effectiveCounts:facilityDomainEffectiveCounts,
    quote:facilityDomainQuote,policy:facilityDomainPolicy,prepare:facilityDomainPrepare,advance:facilityDomainAdvance,activate:facilityDomainActivate,adjustRegionalMetrics:facilityDomainAdjustRegionalMetrics,choose:facilityDomainChoose,project:facilityDomainProject,validateView:facilityDomainValidateView,validate:facilityDomainValidate});
})();
