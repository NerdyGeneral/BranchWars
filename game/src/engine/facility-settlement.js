// Group5 paired facility supplier settlement.
// The real bank and its outside maintenance supplier settle as one transaction.
// Base office upkeep is still charged by existing bank operations, never here.
const FacilitySettlement=(()=>{
  const copy=x=>JSON.parse(JSON.stringify(x));
  const whole=n=>Number.isSafeInteger(n)&&n>=0;
  // Each book is bounded to safe integer dollars; the multi-bank sum can exceed
  // that range, so reconciliation must not round away a one-dollar difference.
  function facilitySettlementCash(g){return g.players.reduce((n,p)=>n+BigInt(p.accounting.accounts.cash),0n)+BigInt(g.facilityEconomy.supplier.accounts.cash);}
  function facilitySettlementInitialize(g){
    if(![5,6,7].includes(g.financialGroupVersion))return copy(g);
    if(g.facilityEconomy||g.players.some(p=>p.facilityLifecycle))throw Error('Facility lifecycle initializes only in an explicit new campaign.');
    const next=copy(g);
    next.facilityEconomy={version:1,month:0,supplier:GroupAccounting.opening('facility:suppliers'),renovationPaid:0,maintenancePaid:0};
    next.players=next.players.map(p=>FacilityLifecycle.initialize(p,g.cycle,true));
    return next;
  }
  function facilitySettlementContext(g,p,provided,kind){
    if(!provided||typeof provided!=='object')throw Error('Authoritative facility context required.');
    return {...provided,cycle:g.cycle,cashBalance:owner=>owner.accounting.accounts.cash,
      payCash:(owner,amount,source)=>{
        if(!whole(amount)||amount>owner.accounting.accounts.cash||source!==('facility.'+kind))throw Error('Invalid paired facility payment.');
        const bank=AccountingPrototype.post(owner.accounting,source,{cash:-amount,equity:-amount},-amount);
        const supplier=GroupAccounting.post(g.facilityEconomy.supplier,source,owner.id,{cash:amount,equity:amount},amount);
        owner.accounting=bank;syncAccounts(owner);
        g.facilityEconomy.supplier=supplier;
        g.facilityEconomy[kind==='renovation'?'renovationPaid':'maintenancePaid']+=amount;
        if(kind==='renovation')owner.buildSpend+=amount;
      }};
  }
  function facilitySettlementPrepare(g,plans,contextFactory){
    if(!g.facilityEconomy)return {game:copy(g),events:[]};
    const next=copy(g),before=facilitySettlementCash(next),events=[];
    for(let i=0;i<next.players.length;i++){
      const p=next.players[i],context=facilitySettlementContext(next,p,contextFactory(next,p,plans[i]),'renovation');
      const result=FacilityLifecycle.prepare(p,plans[i].facilityLifecyclePolicy,context);
      next.players[i]=result.owner;events.push(...result.events.map(e=>({...e,owner:p.id})));
    }
    if(facilitySettlementCash(next)!==before)throw Error('Facility renovation cash did not conserve.');
    return {game:next,events};
  }
  function facilitySettlementMaintenance(g,contextFactory){
    if(!g.facilityEconomy)return {game:copy(g),reports:[]};
    const next=copy(g),before=facilitySettlementCash(next),reports=[];
    if(next.facilityEconomy.month===next.cycle)return {game:next,reports:next.players.map(p=>copy(p.facilityLifecycle.report))};
    if(next.facilityEconomy.month!==next.cycle-1)throw Error('Facility maintenance requires sequential months.');
    for(let i=0;i<next.players.length;i++){
      const p=next.players[i],context=facilitySettlementContext(next,p,contextFactory(next,p),'maintenance');
      context.freeCash=Math.min(context.freeCash,p.accounting.accounts.cash);
      const result=FacilityLifecycle.settle(p,context),owner=result.owner,paid=result.report.paid;
      // The accounting entry above already records the expense. This block only
      // reconciles displayed monthly contribution; there is no second posting.
      if(!owner.operatingReport||!Number.isFinite(owner.operatingReport.profit)||owner.operatingReport.facilityMaintenance!==undefined)
        throw Error('Maintenance requires one unsettled bank operating report.');
      owner.operatingReport.facilityMaintenance=paid;
      owner.operatingReport.expense+=paid;owner.operatingReport.profit-=paid;owner.stats.lastProfit-=paid;
      if(owner.marketReport){
        for(const row of result.report.rows){
          const office=owner.facilityNetwork.offices.find(o=>o.id===row.officeId),local=owner.marketReport.rows[office.market];
          if(!local)throw Error('Maintenance attribution requires the actual local report.');
          local.facility+=row.paid;local.contribution-=row.paid;
        }
        owner.marketReport.profit-=paid;
      }
      next.players[i]=owner;reports.push(result.report);
    }
    next.facilityEconomy.month=next.cycle;
    if(facilitySettlementCash(next)!==before)throw Error('Facility maintenance cash did not conserve.');
    return {game:next,reports};
  }
  function facilitySettlementAdvance(g,contextFactory){
    if(!g.facilityEconomy)return {game:copy(g),events:[],usedCapacity:{}};
    const next=copy(g),events=[],capacityByOwner={};
    for(let i=0;i<next.players.length;i++){
      const p=next.players[i],context={...contextFactory(next,p),cycle:next.cycle};
      const result=FacilityLifecycle.advance(p,context);
      next.players[i]=result.owner;capacityByOwner[p.id]=result.usedCapacity;
      events.push(...result.events.map(e=>({...e,owner:p.id})));
    }
    // The coordinator reserves this returned capacity against ordinary projects.
    // It must replace its stage usage, never accumulate repeated-call usage.
    return {game:next,events,usedCapacity:capacityByOwner};
  }
  function facilitySettlementActivate(g){
    if(!g.facilityEconomy)return {game:copy(g),events:[]};
    const next=copy(g),events=[];
    for(let i=0;i<next.players.length;i++){
      const p=next.players[i],result=FacilityLifecycle.activate(p,next.cycle);
      next.players[i]=result.owner;events.push(...result.events.map(e=>({...e,owner:p.id})));
    }
    return {game:next,events};
  }
  function facilitySettlementValidate(g){
    const world=g.facilityEconomy;
    if(![5,6,7].includes(g.financialGroupVersion)){if(world!==undefined||g.players.some(p=>p.facilityLifecycle!==undefined))throw Error('Unversioned facility lifecycle.');return;}
    if(!world||Object.keys(world).sort().join()!==(g.financialGroupVersion===7?'circulated,maintenancePaid,month,renovationPaid,supplier,version':'maintenancePaid,month,renovationPaid,supplier,version')||world.version!==(g.financialGroupVersion===7?2:1)||
        !whole(world.month)||!whole(world.renovationPaid)||!whole(world.maintenancePaid)||world.month!==g.cycle-(g.gameOver?0:1))throw Error('Invalid facility economy boundary.');
    GroupAccounting.validate(world.supplier);
    const total=world.renovationPaid+world.maintenancePaid-(g.financialGroupVersion===7?world.circulated:0);
    if(g.financialGroupVersion===7&&!whole(world.circulated))throw Error('Invalid facility circulation.');
    if(!whole(total)||world.supplier.entityId!=='facility:suppliers'||world.supplier.accounts.cash!==total||world.supplier.accounts.equity!==total||
        world.supplier.retainedEarnings!==total||Object.entries(world.supplier.accounts).some(([k,n])=>!['cash','equity'].includes(k)&&n!==0))
      throw Error('Facility suppliers disagree with actual bank payments.');
    for(const p of g.players){
      AccountingPrototype.check(p.accounting);FacilityLifecycle.validate(p,g.cycle,true);
      const a=p.accounting.accounts,mirrors={cash:a.cash,loans:a.loans,deposits:a.deposits,emergencyDebt:a.emergencyDebt,capital:a.equity,earnings:p.accounting.retainedEarnings};
      if(Object.entries(mirrors).some(([key,n])=>p.stats[key]!==n))throw Error('Facility bank mirrors disagree with accounting.');
    }
  }
  return Object.freeze({initialize:facilitySettlementInitialize,prepare:facilitySettlementPrepare,advance:facilitySettlementAdvance,settle:facilitySettlementMaintenance,activate:facilitySettlementActivate,validate:facilitySettlementValidate});
})();
