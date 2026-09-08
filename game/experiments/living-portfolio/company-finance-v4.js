'use strict';

// Isolated candidate, NOT in the game manifest. Inject the actual legacy modules.
// Canonical loan contracts remain caller-owned. Only externalDebt is retained
// here: bank principal/recognized interest are derived from those contracts.
// Returned bank books include corporate service-fee entries as well as loans;
// an eventual engine adapter must not post either a second time.
function createCompanyFinanceV4({GroupAccounting:G, AccountingPrototype:A, legacy, loans:L}) {
  const copy=x=>JSON.parse(JSON.stringify(x));
  const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
  const whole=(n,signed=false)=>Number.isSafeInteger(n)&&(signed||n>=0);
  function check(n,label,signed=false){if(!whole(n,signed))throw Error('Invalid '+label);return n;}
  const sum=xs=>xs.reduce((n,x)=>check(n+x,'aggregate',true),0);
  const shape=(x,keys,label)=>{if(!exact(x,keys))throw Error('Invalid '+label+' fields');};
  const split=(cash,weights,month)=>{
    const total=sum(weights),budget=Math.min(cash,total);if(!total)return weights.map(()=>0);
    const rows=weights.map((n,i)=>({i,n:Number(BigInt(n)*BigInt(budget)/BigInt(total)),rem:BigInt(n)*BigInt(budget)%BigInt(total)}));
    let left=budget-sum(rows.map(x=>x.n));
    rows.sort((a,b)=>a.rem>b.rem?-1:a.rem<b.rem?1:(a.i+month)%rows.length-(b.i+month)%rows.length);
    for(const r of rows)if(left>0){r.n++;left--;}
    return rows.sort((a,b)=>a.i-b.i).map(x=>x.n);
  };
  const emptyService=()=>({billed:0,cash:0,receivable:0,recovered:0,writtenOff:0});
  const loanFields=['advanced','fee','principalPaid','recognizedInterestPaid','suspendedInterestPaid','accruedInterest','principalWrittenOff','interestWrittenOff'];
  const emptyLoan=()=>Object.fromEntries(loanFields.map(k=>[k,0]));
  const reportFields=['month','salesRequested','sales','operatingCost','operatingPaid','interest','interestPaid','principalDue','principalPaid','serviceDue','servicePaid','profit','resolutionEarnings','dividend','arrears','cashLimited','agencyExpense','loanFee','loanInterest','loanPrincipalPaid','loanInterestPaid'];
  function claimRows(world,contracts){
    if(!Array.isArray(contracts)||contracts.length>20000)throw Error('Invalid canonical company contracts');
    const seen=new Set(),counts=[0,0],rows=world.companies.map(()=>({principal:0,interest:0,undrawn:0,suspended:0,contracts:[]}));
    for(const c of contracts){
      L.validateContract(c);const i=world.companies.findIndex(x=>x.id===c.borrowerId),bank=world.lending.bankIds.indexOf(c.bankId);
      if(i<0||bank<0||seen.has(c.id)||++counts[bank]>10000||L.catalog[c.offerProduct].segment!=='company'||c.market!==world.companies[i].market)
        throw Error('Invalid canonical corporate loan party');
      if(c.servicing.lastMonth!==world.month)throw Error('Corporate contract month disagrees');
      seen.add(c.id);const row=rows[i];row.principal+=c.principal;row.interest+=c.servicing.interestDue;row.suspended+=c.servicing.suspendedInterest;row.undrawn+=c.undrawn;row.contracts.push(c);
    }
    for(const row of rows)for(const k of ['principal','interest','undrawn','suspended'])check(row[k],'canonical claim');
    return rows;
  }
  function validate(world,contracts=[]){
    if(world?.version!==4){if(contracts.length)throw Error('Legacy companies cannot contain living loans');return legacy.validate(world);}
    shape(world,['version','month','outside','creditor','companies','openingCash','recoveredAssets','bankCashPaid','bankFlows','agencyCashNet','lending'],'lending company economy');
    check(world.month,'corporate month');check(world.openingCash,'opening cash');check(world.recoveredAssets,'recovered assets');check(world.agencyCashNet,'agency boundary',true);
    shape(world.lending,['version','bankIds','cashNet','flows','originatedMonth','activityMonth'],'corporate lending');
    const state=world.lending;
    if(state.version!==1||!Array.isArray(state.bankIds)||state.bankIds.length!==2||new Set(state.bankIds).size!==2||state.bankIds.some(x=>typeof x!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(x)))throw Error('Invalid lending bank identities');
    for(const k of ['originatedMonth','activityMonth'])if(!whole(state[k])||state[k]>world.month)throw Error('Invalid corporate loan fence');
    if(!Array.isArray(state.cashNet)||state.cashNet.length!==2||state.cashNet.some(n=>!whole(n,true))||!Array.isArray(state.flows)||state.flows.length!==2)throw Error('Invalid lending flows');
    for(const f of state.flows){shape(f,loanFields,'loan flow');if(Object.values(f).some(n=>!whole(n)))throw Error('Invalid loan flow amount');}
    if(!Array.isArray(world.companies)||world.companies.length!==6)throw Error('Six real companies required');
    if(!Array.isArray(world.bankCashPaid)||world.bankCashPaid.length!==2||world.bankCashPaid.some(n=>!whole(n))||!Array.isArray(world.bankFlows)||world.bankFlows.length!==2)throw Error('Invalid corporate fee boundary');
    for(const f of world.bankFlows){shape(f,Object.keys(emptyService()),'service flow');if(Object.values(f).some(n=>!whole(n))||f.billed!==f.cash+f.receivable)throw Error('Invalid service flow');}
    G.validate(world.outside);G.validate(world.creditor);
    if(world.outside.entityId!=='corporate:outside'||world.creditor.entityId!=='corporate:creditors')throw Error('Wrong corporate counterparty');
    const claims=claimRows(world,contracts),markets=new Set();let external=0,suppliers=0;
    for(const [i,c] of world.companies.entries()){
      shape(c,['id','market','clientIndex','baseFee','principalDue','principalArrears','interestArrears','book','report','resolution','bankArrears','externalDebt'],'company');
      if(c.id!=='company:'+i||c.clientIndex!==i||typeof c.market!=='string'||!c.market||markets.has(c.market)||!whole(c.baseFee)||!c.baseFee||c.baseFee>100000||c.baseFee%2||c.principalDue!==c.baseFee/2)throw Error('Invalid company profile');
      markets.add(c.market);G.validate(c.book);
      if(c.resolution!==null&&(typeof c.resolution!=='object'||Array.isArray(c.resolution)))throw Error('Invalid company resolution');
      if(c.book.entityId!==c.id||c.book.accounts.investments||c.book.accounts.custodyAssets||c.book.accounts.businessAssets!==(c.resolution?0:72*c.baseFee))throw Error('Invalid retained company assets');
      for(const k of ['externalDebt','principalArrears','interestArrears'])check(c[k],k);
      if(!Array.isArray(c.bankArrears)||c.bankArrears.length!==2||c.bankArrears.some(n=>!whole(n))||c.principalArrears>c.externalDebt)throw Error('Invalid external arrears');
      if(c.book.accounts.debt!==c.externalDebt+claims[i].principal)throw Error('Company debt and canonical lenders disagree');
      const supplier=c.book.accounts.payables-c.interestArrears-sum(c.bankArrears)-claims[i].interest;
      if(!whole(supplier))throw Error('Company payable attribution disagrees');
      external+=c.externalDebt+c.interestArrears;suppliers+=supplier;
      if(c.resolution){
        shape(c.resolution,['month','openingCash','cashAvailable','proceeds','assetLoss','creditorRecovery','creditorWriteoff','supplierRecovery','supplierWriteoff','equityDistribution','bankRecovery','bankWriteoff','loanRecovery','loanWriteoff'],'company resolution');
        if(!whole(c.resolution.month)||!c.resolution.month||c.resolution.month>world.month||Object.values(c.book.accounts).some(Boolean)||c.externalDebt||c.principalArrears||c.interestArrears||c.bankArrears.some(Boolean)||claims[i].undrawn||claims[i].suspended)throw Error('Unresolved company claims');
        for(const [k,v]of Object.entries(c.resolution)){
          if(['bankRecovery','bankWriteoff','loanRecovery','loanWriteoff'].includes(k)){if(!Array.isArray(v)||v.length!==2||v.some(x=>!whole(x)))throw Error('Invalid resolution lender totals');}
          else check(v,'resolution '+k);
        }
        if(c.resolution.proceeds>36*c.baseFee||c.resolution.assetLoss!==72*c.baseFee-c.resolution.proceeds)throw Error('Invalid asset liquidation');
        const r=c.resolution,distributed=sum([r.creditorRecovery,r.supplierRecovery,...r.bankRecovery,...r.loanRecovery,r.equityDistribution]);
        if(r.cashAvailable!==sum([r.openingCash,r.proceeds])||r.cashAvailable!==distributed)throw Error('Liquidation cash does not reconcile');
      }
      if(c.report===null){if(world.month)throw Error('Missing company report');}
      else{
        const r=c.report;shape(r,reportFields,'company report');
        if(r.month!==world.month||typeof r.cashLimited!=='boolean'||reportFields.filter(k=>!['cashLimited','profit','resolutionEarnings'].includes(k)).some(k=>!whole(r[k]))||!whole(r.profit,true)||!whole(r.resolutionEarnings,true))throw Error('Invalid company report values');
        if(r.sales>r.salesRequested||r.operatingPaid>r.operatingCost||r.interestPaid>r.interest||r.principalPaid>r.principalDue||r.servicePaid>r.serviceDue||r.arrears!==c.book.accounts.payables||r.profit!==r.sales-r.operatingCost-r.interest-r.serviceDue-r.agencyExpense-r.loanFee-r.loanInterest+r.resolutionEarnings)throw Error('Company profit does not reconcile');
        const release=c.resolution?.month===world.month?-c.resolution.assetLoss+c.resolution.creditorWriteoff+c.resolution.supplierWriteoff+sum(c.resolution.bankWriteoff)+sum(c.resolution.loanWriteoff):0;
        if(r.resolutionEarnings!==release)throw Error('Company resolution earnings disagree');
        if(c.resolution?.month<world.month&&(r.cashLimited||reportFields.some(k=>!['month','cashLimited'].includes(k)&&r[k]!==0)))throw Error('Closed company still operates');
      }
    }
    if(world.creditor.accounts.businessAssets!==external||world.outside.accounts.businessAssets!==suppliers+world.recoveredAssets||world.recoveredAssets!==sum(world.companies.map(c=>c.resolution?.proceeds||0)))throw Error('Corporate counterparty claims disagree');
    for(const b of [world.outside,world.creditor])if(b.accounts.debt||b.accounts.payables||b.accounts.investments||b.accounts.custodyAssets)throw Error('Unsupported outside accounts');
    const cash=sum([world.outside,world.creditor,...world.companies.map(c=>c.book)].map(b=>b.accounts.cash));
    if(cash+sum(world.bankCashPaid)+world.agencyCashNet+sum(state.cashNet)!==world.openingCash)throw Error('Corporate lending cash is not conserved');
    return {cash,debt:sum(world.companies.map(c=>c.book.accounts.debt)),payable:sum(world.companies.map(c=>c.book.accounts.payables)),companies:6};
  }
  function validateSettled(world,contracts=[]){
    const result=validate(world,contracts);
    if(world.version===4&&(world.lending.activityMonth!==world.month||world.lending.originatedMonth!==world.month))throw Error('Corporate lending month is not sealed');
    return result;
  }
  function withLending(input,bankIds){
    legacy.validate(input);if(![2,3].includes(input.version)||input.month!==0)throw Error('Living loans require explicit campaign creation');
    const w=copy(input.version===2?legacy.withAgency(input):input);w.version=4;
    w.lending={version:1,bankIds:copy(bankIds),cashNet:[0,0],flows:[emptyLoan(),emptyLoan()],originatedMonth:0,activityMonth:0};
    for(const c of w.companies)c.externalDebt=c.book.accounts.debt;
    validate(w,[]);return w;
  }
  function banksFor(world,contracts,banks){
    if(!Array.isArray(banks)||banks.length!==2)throw Error('Two actual bank books required');
    const ids=new Set();
    for(const b of banks){
      shape(b,['id','book','legacyPrincipal','otherReceivables'],'attributed bank');A.check(b.book);check(b.legacyPrincipal,'legacy principal');check(b.otherReceivables,'other receivables');
      const i=world.lending.bankIds.indexOf(b.id);if(i<0||ids.has(b.id)||![2,3,4].includes(b.book.version))throw Error('Unknown lending bank book');ids.add(b.id);
      const held=contracts.filter(c=>c.bankId===b.id),fees=sum(world.companies.map(c=>c.bankArrears[i]));
      if(b.book.accounts.loans!==b.legacyPrincipal+sum(held.map(c=>c.principal))||b.book.accounts.receivables!==b.otherReceivables+fees+sum(held.map(c=>c.servicing.interestDue)))throw Error('Actual bank and attributed claims disagree');
      const basis=sum(held.map(c=>c.basisAdjustment||0));
      if(b.book.version===4?b.book.accounts.loanBasisAdjustment!==basis:held.some(c=>(c.basisAdjustment||0)!==0))throw Error('Actual bank and canonical purchase basis disagree');
    }
    return copy(banks);
  }
  function collateralFor(w,contracts,input){
    if(!Array.isArray(input)||input.length>10000)throw Error('Invalid corporate collateral boundary');
    const ids=new Set(),totals=new Map();
    for(const p of input){
      shape(p,['id','borrowerId','value','pledgedValue','externalPledgedValue'],'corporate collateral');
      const c=w.companies.find(c=>c.id===p.borrowerId);if(!c||ids.has(p.id)||typeof p.id!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(p.id))throw Error('Invalid property owner');ids.add(p.id);
      for(const k of ['value','pledgedValue','externalPledgedValue'])check(p[k],k);
      const pledge=sum(contracts.filter(c=>c.collateral?.id===p.id&&c.collateral.releasedMonth===null).map(c=>c.collateral.pledgedValue));
      if(p.pledgedValue!==p.externalPledgedValue+pledge||p.externalPledgedValue&&!c.externalDebt)throw Error('Property pledges disagree');
      totals.set(c.id,(totals.get(c.id)||0)+p.value);
    }
    for(const c of contracts)if(c.collateral&&c.collateral.releasedMonth===null&&!input.some(p=>p.id===c.collateral.id&&p.borrowerId===c.borrowerId))throw Error('Missing actual collateral');
    for(const c of w.companies)if((totals.get(c.id)||0)>c.book.accounts.businessAssets)throw Error('Collateral duplicates unmodeled company assets');
    return copy(input);
  }
  function postBank(banks,id,source,entry){
    const b=banks.find(b=>b.id===id);if(!b)throw Error('Unknown funded bank');
    const changes=Object.fromEntries(Object.entries(entry).filter(([k])=>k!=='earnings'));
    b.book=A.post(b.book,source,changes,entry.earnings||0);
  }
  function postLoan(w,banks,posting,kind){
    const c=w.companies.find(c=>c.id===posting.borrowerId),i=w.lending.bankIds.indexOf(posting.bankId),flow=w.lending.flows[i];
    if(!c||c.resolution||!c.report)throw Error('Closed or unprepared funded borrower');
    const fee=kind==='originate'?posting.fee:0,expense=fee+(posting.borrower.interestExpense||0);
    c.book=G.post(c.book,'corporate.loan.'+kind,posting.bankId,{cash:posting.borrower.cash,debt:posting.borrower.debt,payables:posting.borrower.interestPayable||0,equity:-expense},-expense);
    postBank(banks,posting.bankId,'corporate.loan.'+kind,posting.bank);
    w.lending.cashNet[i]+=posting.bank.cash;
    flow.advanced+=Math.max(0,posting.borrower.debt);flow.fee+=fee;flow.principalPaid+=posting.principalPaid||0;
    flow.recognizedInterestPaid+=posting.recognizedInterestPaid||0;flow.suspendedInterestPaid+=posting.suspendedInterestPaid||0;flow.accruedInterest+=posting.accruedInterest||0;
    c.report.loanFee+=fee;c.report.loanInterest+=posting.borrower.interestExpense||0;c.report.profit-=expense;
    c.report.loanPrincipalPaid+=posting.principalPaid||0;c.report.loanInterestPaid+=(posting.recognizedInterestPaid||0)+(posting.suspendedInterestPaid||0);c.report.arrears=c.book.accounts.payables;
  }
  function originate(input,boundary){
    shape(boundary,['contracts','collateral','banks','snapshot','offers'],'corporate origination boundary');validate(input,boundary.contracts);
    if(input.version!==4||!input.month||input.lending.originatedMonth===input.month||input.lending.activityMonth!==input.month)throw Error('Corporate origination already resolved or activity is not sealed');
    const banks=banksFor(input,boundary.contracts,boundary.banks),collateral=collateralFor(input,boundary.contracts,boundary.collateral),s=boundary.snapshot;
    L.validateSnapshot(s);if(s.month!==input.month||s.banks.length!==2)throw Error('Origination month/banks mismatch');
    for(const b of s.banks){
      const actual=banks.find(x=>x.id===b.id);if(!actual||b.cash!==actual.book.accounts.cash||b.capital!==actual.book.accounts.equity||b.contractSlots!==10000-boundary.contracts.filter(c=>c.bankId===b.id).length)throw Error('Originations use stale bank balances');
      const rwa=actual.legacyPrincipal+Math.ceil(actual.book.accounts.securities*.2)+actual.book.accounts.receivables+sum(boundary.contracts.filter(c=>c.bankId===b.id).map(c=>Number((BigInt(c.commitment)*BigInt(c.originalTerms.riskWeightBps)+9999n)/10000n)));
      if(b.riskWeightedAssets!==rwa)throw Error('Originations omit retained risk assets');
      for(const sector of new Set(boundary.contracts.filter(c=>c.bankId===b.id).map(c=>c.sector))){
        const held=sum(boundary.contracts.filter(c=>c.bankId===b.id&&c.sector===sector).map(c=>c.commitment));
        if(!Object.hasOwn(b.sectorExposure,sector)||b.sectorExposure[sector]<held)throw Error('Originations omit retained sector exposure');
      }
    }
    for(const b of s.borrowers){
      const c=input.companies.find(x=>x.id===b.id),held=boundary.contracts.filter(x=>x.borrowerId===b.id);
      if(!c||c.resolution||b.segment!=='company'||b.market!==c.market||b.cash!==c.book.accounts.cash||b.existingDebt!==c.book.accounts.debt||b.existingUndrawn!==sum(held.map(x=>x.undrawn)))throw Error('Originations use invented borrower funds/debt');
      if(held.some(x=>x.sector!==b.sector))throw Error('Originations cannot relabel an existing borrower sector');
      const expected=collateral.filter(p=>p.borrowerId===b.id).map(p=>({id:p.id,value:p.value,pledgedValue:p.pledgedValue}));
      const byId=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;
      if(JSON.stringify(b.collateral.slice().sort(byId))!==JSON.stringify(expected.sort(byId)))throw Error('Originations use invented property');
    }
    const result=L.clearOriginations(s,boundary.offers),w=copy(input),contracts=copy(boundary.contracts).concat(result.contracts);
    for(const p of result.postings)postLoan(w,banks,p,'originate');
    for(const c of result.contracts)if(c.collateral)collateral.find(p=>p.id===c.collateral.id).pledgedValue+=c.collateral.pledgedValue;
    w.lending.originatedMonth=w.month;validate(w,contracts);banksFor(w,contracts,banks);collateralFor(w,contracts,collateral);
    return {world:w,contracts,collateral,banks,bankPostings:result.postings,decisions:result.decisions};
  }
  function payOutside(w,c,amount,source){
    const paid=Math.min(amount,c.book.accounts.cash),unpaid=amount-paid;
    if(paid){const t=G.servicePayment(c.book,w.outside,paid);c.book=t.payer;w.outside=t.provider;}
    if(unpaid){c.book=G.post(c.book,source+'.invoice',w.outside.entityId,{payables:unpaid,equity:-unpaid},-unpaid);w.outside=G.post(w.outside,source+'.claim',c.id,{businessAssets:unpaid,equity:unpaid},unpaid);}
    return paid;
  }
  function payService(w,c,i,amount){
    const paid=Math.min(amount,c.book.accounts.cash),unpaid=amount-paid;
    if(amount)c.book=G.post(c.book,'corporate.bankService',w.lending.bankIds[i],{cash:-paid,payables:unpaid,equity:-amount},-amount);
    c.bankArrears[i]+=unpaid;w.bankCashPaid[i]+=paid;w.bankFlows[i].billed+=amount;w.bankFlows[i].cash+=paid;w.bankFlows[i].receivable+=unpaid;return paid;
  }
  function payOldService(w,c,i,amount){if(!amount)return;c.book=G.settlePayable(c.book,amount,w.lending.bankIds[i]);c.bankArrears[i]-=amount;w.bankCashPaid[i]+=amount;w.bankFlows[i].recovered+=amount;}
  function resolve(w,c,contracts,collateral,banks,postings){
    // Provisional priority: collateral-backed share of the funded asset sale;
    // then the retained external creditor; then unsecured bank loans, supplier
    // and service-fee claims pari passu. No bailout or unfunded recovery.
    const openingCash=c.book.accounts.cash,assets=c.book.accounts.businessAssets,proceeds=Math.min(36*c.baseFee,w.outside.accounts.cash),assetLoss=assets-proceeds,cashAvailable=sum([openingCash,proceeds]);
    c.book=G.post(c.book,'resolution.assetSale',w.outside.entityId,{cash:proceeds,businessAssets:-assets,equity:-assetLoss},-assetLoss);
    if(proceeds)w.outside=G.post(w.outside,'resolution.assetPurchase',c.id,{cash:-proceeds,businessAssets:proceeds});w.recoveredAssets+=proceeds;
    const held=contracts.filter(x=>x.borrowerId===c.id),recoveries=new Map(held.map(x=>[x.id,0]));
    for(const property of collateral.filter(p=>p.borrowerId===c.id)){
      const loans=held.filter(x=>x.collateral?.id===property.id&&x.collateral.releasedMonth===null);
      const share=assets?Number(BigInt(proceeds)*BigInt(property.value)/BigInt(assets)):0;
      const claims=loans.map(x=>x.principal+x.servicing.interestDue+x.servicing.suspendedInterest);
      const external=property.externalPledgedValue,pledged=sum(loans.map(x=>x.collateral.pledgedValue));
      const loanShare=external+pledged?Number(BigInt(share)*BigInt(pledged)/BigInt(external+pledged)):0;
      split(loanShare,claims,w.month).forEach((n,i)=>recoveries.set(loans[i].id,n));
    }
    const secured=sum([...recoveries.values()]),externalClaim=c.externalDebt+c.interestArrears,externalRecovery=Math.min(externalClaim,c.book.accounts.cash-secured),externalLoss=externalClaim-externalRecovery;
    const recognized=sum(held.map(x=>x.servicing.interestDue)),supplier=c.book.accounts.payables-c.interestArrears-sum(c.bankArrears)-recognized;
    const unsecured=held.map(x=>x.principal+x.servicing.interestDue+x.servicing.suspendedInterest-recoveries.get(x.id));
    const distribution=split(c.book.accounts.cash-secured-externalRecovery,[supplier,...c.bankArrears,...unsecured],w.month);
    const supplierRecovery=distribution[0],bankRecovery=distribution.slice(1,3),bankWriteoff=c.bankArrears.map((n,i)=>n-bankRecovery[i]);
    held.forEach((x,i)=>recoveries.set(x.id,recoveries.get(x.id)+distribution[i+3]));
    if(externalClaim){c.book=G.post(c.book,'resolution.external',w.creditor.entityId,{cash:-externalRecovery,debt:-c.externalDebt,payables:-c.interestArrears,equity:externalLoss},externalLoss);w.creditor=G.post(w.creditor,'resolution.external',c.id,{cash:externalRecovery,businessAssets:-externalClaim,equity:-externalLoss},-externalLoss);}
    c.externalDebt=0;c.interestArrears=0;c.principalArrears=0;
    const supplierWriteoff=supplier-supplierRecovery;
    if(supplier){c.book=G.post(c.book,'resolution.supplier',w.outside.entityId,{cash:-supplierRecovery,payables:-supplier,equity:supplierWriteoff},supplierWriteoff);w.outside=G.post(w.outside,'resolution.supplier',c.id,{cash:supplierRecovery,businessAssets:-supplier,equity:-supplierWriteoff},-supplierWriteoff);}
    for(const i of [0,1]){payOldService(w,c,i,bankRecovery[i]);if(bankWriteoff[i]){c.book=G.post(c.book,'resolution.serviceFee',w.lending.bankIds[i],{payables:-bankWriteoff[i],equity:bankWriteoff[i]},bankWriteoff[i]);c.bankArrears[i]=0;w.bankFlows[i].writtenOff+=bankWriteoff[i];}}
    const loanRecovery=[0,0],loanWriteoff=[0,0];
    for(const x of held){
      const i=w.lending.bankIds.indexOf(x.bankId),cash=recoveries.get(x.id),interestPaid=Math.min(cash,x.servicing.interestDue),suspendedPaid=Math.min(cash-interestPaid,x.servicing.suspendedInterest),principalPaid=cash-interestPaid-suspendedPaid;
      const principalLoss=x.principal-principalPaid,interestLoss=x.servicing.interestDue-interestPaid,loss=principalLoss+interestLoss,basis=x.basisAdjustment||0;
      c.book=G.post(c.book,'resolution.bankLoan',x.bankId,{cash:-cash,debt:-x.principal,payables:-x.servicing.interestDue,equity:loss-suspendedPaid},loss-suspendedPaid);
      // The borrower still owes face principal. The purchasing bank carries the
      // claim at face plus remaining basis, so only that carrying loss is P&L.
      const entry={cash,loans:-x.principal,receivables:-x.servicing.interestDue,...(basis?{loanBasisAdjustment:-basis}:{}),equity:suspendedPaid-loss-basis,earnings:suspendedPaid-loss-basis};postBank(banks,x.bankId,'resolution.companyLoan',entry);
      postings.push({contractId:x.id,bankId:x.bankId,borrowerId:c.id,bank:entry,principalPaid,recognizedInterestPaid:interestPaid,suspendedInterestPaid:suspendedPaid,principalWrittenOff:principalLoss,interestWrittenOff:interestLoss,...(basis?{basisReleased:basis}:{}),unrecognizedInterestWaived:x.servicing.suspendedInterest-suspendedPaid});
      w.lending.cashNet[i]+=cash;loanRecovery[i]+=cash;loanWriteoff[i]+=loss;
      const f=w.lending.flows[i];f.principalPaid+=principalPaid;f.recognizedInterestPaid+=interestPaid;f.suspendedInterestPaid+=suspendedPaid;f.principalWrittenOff+=principalLoss;f.interestWrittenOff+=interestLoss;
      c.report.loanPrincipalPaid+=principalPaid;c.report.loanInterestPaid+=interestPaid+suspendedPaid;c.report.loanInterest+=suspendedPaid;c.report.profit-=suspendedPaid;
      x.principal=0;x.undrawn=0;x.commitment=0;if(Object.hasOwn(x,'basisAdjustment'))x.basisAdjustment=0;Object.assign(x.servicing,{principalDue:0,interestDue:0,suspendedInterest:0,missedMonths:0});
      if(x.collateral&&x.collateral.releasedMonth===null){x.collateral.releasedMonth=w.month;collateral.find(p=>p.id===x.collateral.id).pledgedValue-=x.collateral.pledgedValue;}
      L.validateContract(x);
    }
    // All modeled company assets have been sold; outside liens end in this same
    // liquidation, not a property grant. A zero-value registry tombstone remains.
    for(const p of collateral.filter(p=>p.borrowerId===c.id)){p.value=0;p.pledgedValue-=p.externalPledgedValue;p.externalPledgedValue=0;}
    const equityDistribution=c.book.accounts.cash;
    if(equityDistribution){c.book=G.post(c.book,'resolution.capital',w.outside.entityId,{cash:-equityDistribution,equity:-equityDistribution});w.outside=G.post(w.outside,'resolution.capital',c.id,{cash:equityDistribution,equity:equityDistribution});}
    c.resolution={month:w.month,openingCash,cashAvailable,proceeds,assetLoss,creditorRecovery:externalRecovery,creditorWriteoff:externalLoss,supplierRecovery,supplierWriteoff,equityDistribution,bankRecovery,bankWriteoff,loanRecovery,loanWriteoff};
    c.report.resolutionEarnings=-assetLoss+externalLoss+supplierWriteoff+sum(bankWriteoff)+sum(loanWriteoff);c.report.profit+=c.report.resolutionEarnings;c.report.arrears=0;
  }
  function step(input,options,boundary){
    if(input?.version!==4)return legacy.step(input,options);
    shape(boundary,['contracts','collateral','banks'],'monthly corporate loan boundary');validateSettled(input,boundary.contracts);
    if(!(exact(options,['demand'])||exact(options,['demand','services']))||typeof options.demand!=='number'||!Number.isFinite(options.demand)||options.demand<0||options.demand>3)throw Error('Invalid corporate demand');
    const services=options.services||input.companies.map(c=>({provider:-1,fee:c.baseFee,served:true}));
    if(!Array.isArray(services)||services.length!==6||services.some(s=>!exact(s,['provider','fee','served'])||![-1,0,1].includes(s.provider)||!whole(s.fee)||s.fee>100000||typeof s.served!=='boolean'))throw Error('Invalid corporate services');
    const banks=banksFor(input,boundary.contracts,boundary.banks),collateral=collateralFor(input,boundary.contracts,boundary.collateral),w=copy(input),claims=claimRows(input,boundary.contracts),postings=[];
    w.month++;w.bankFlows=[emptyService(),emptyService()];w.lending.flows=[emptyLoan(),emptyLoan()];
    const sensitivity=[1.3,1.2,.4,1.1,1,.8],requests=w.companies.map(c=>c.resolution?0:Math.round(12*c.baseFee*Math.max(.5,Math.min(1.5,1+sensitivity[c.clientIndex]*(options.demand-1))))),sales=split(w.outside.accounts.cash,requests,w.month);
    for(const [i,c]of w.companies.entries())if(sales[i]){const t=G.servicePayment(w.outside,c.book,sales[i]);w.outside=t.payer;c.book=t.provider;}
    for(const [i,c]of w.companies.entries()){
      c.report=Object.fromEntries(reportFields.map(k=>[k,k==='cashLimited'?false:0]));c.report.month=w.month;if(c.resolution)continue;
      const supplier=c.book.accounts.payables-c.interestArrears-sum(c.bankArrears)-claims[i].interest,old=split(c.book.accounts.cash,[supplier,...c.bankArrears],w.month);
      if(old[0]){c.book=G.settlePayable(c.book,old[0],w.outside.entityId);w.outside=G.post(w.outside,'invoice.settled',c.id,{cash:old[0],businessAssets:-old[0]});}
      for(const n of [0,1])payOldService(w,c,n,old[n+1]);
      const priorInterest=Math.min(c.interestArrears,c.book.accounts.cash);
      if(priorInterest){c.book=G.settlePayable(c.book,priorInterest,w.creditor.entityId);w.creditor=G.post(w.creditor,'interestInvoice.settled',c.id,{cash:priorInterest,businessAssets:-priorInterest});c.interestArrears-=priorInterest;}
      const operatingCost=Math.round(5*c.baseFee*(1+requests[i]/(12*c.baseFee))),operatingPaid=payOutside(w,c,operatingCost,'corporate.operations');
      const interest=Math.round(c.externalDebt*.005),interestPaid=Math.min(interest,c.book.accounts.cash);
      if(interestPaid){const t=G.servicePayment(c.book,w.creditor,interestPaid);c.book=t.payer;w.creditor=t.provider;}
      if(interest>interestPaid){const unpaid=interest-interestPaid;c.interestArrears+=unpaid;c.book=G.post(c.book,'external.interestInvoice',w.creditor.entityId,{payables:unpaid,equity:-unpaid},-unpaid);w.creditor=G.post(w.creditor,'external.interestClaim',c.id,{businessAssets:unpaid,equity:unpaid},unpaid);}
      const principalDue=Math.min(c.externalDebt,c.principalDue+c.principalArrears),principalPaid=Math.min(principalDue,c.book.accounts.cash);
      if(principalPaid){c.book=G.post(c.book,'external.principal',w.creditor.entityId,{cash:-principalPaid,debt:-principalPaid});w.creditor=G.post(w.creditor,'external.principal',c.id,{cash:principalPaid,businessAssets:-principalPaid});c.externalDebt-=principalPaid;}c.principalArrears=principalDue-principalPaid;
      const s=services[i],serviceDue=s.served?s.fee:0,servicePaid=s.provider===-1?payOutside(w,c,serviceDue,'corporate.bankingService'):payService(w,c,s.provider,serviceDue);
      Object.assign(c.report,{salesRequested:requests[i],sales:sales[i],operatingCost,operatingPaid,interest,interestPaid,principalDue,principalPaid,serviceDue,servicePaid,profit:sales[i]-operatingCost-interest-serviceDue,arrears:c.book.accounts.payables,cashLimited:sales[i]<requests[i]||operatingPaid<operatingCost||interestPaid<interest||principalPaid<principalDue||servicePaid<serviceDue});
    }
    for(const property of collateral){const c=w.companies.find(c=>c.id===property.borrowerId);if(!c.externalDebt&&!c.interestArrears){property.pledgedValue-=property.externalPledgedValue;property.externalPledgedValue=0;}}
    const serviced=L.serviceContracts({version:1,month:w.month,contracts:boundary.contracts,collateral,borrowers:w.companies.map(c=>({id:c.id,cash:c.book.accounts.cash,protectedCash:0}))});
    for(const p of serviced.postings){
      if(w.companies.find(c=>c.id===p.borrowerId).resolution){if(Object.values(p.bank).some(Boolean))throw Error('Closed borrower paid a live claim');continue;}
      postLoan(w,banks,p,'service');postings.push(p);
    }
    const contracts=serviced.contracts,property=serviced.collateral;
    for(const c of w.companies){if(c.resolution)continue;const overdue=contracts.some(x=>x.borrowerId===c.id&&x.servicing.missedMonths);
      c.report.cashLimited=c.report.cashLimited||overdue;
      const dividend=c.principalArrears||c.interestArrears||overdue?0:Math.min(Math.floor(Math.max(0,c.report.profit)*.3),G.distributionLimit(c.book,0,c.baseFee));
      if(dividend){const t=G.dividend(c.book,w.outside,dividend,{monthlyFixedCost:c.baseFee});c.book=t.entity;w.outside=t.parent;c.report.dividend=dividend;}
    }
    for(let j=0;j<6;j++){const c=w.companies[(j+w.month)%6];if(!c.resolution&&(c.book.accounts.payables>=33*c.baseFee||c.book.accounts.equity<=0))resolve(w,c,contracts,property,banks,postings);}
    for(const i of [0,1]){const f=w.bankFlows[i],entry={cash:f.cash+f.recovered,receivables:f.receivable-f.recovered-f.writtenOff,equity:f.billed-f.writtenOff,earnings:f.billed-f.writtenOff};if(Object.values(entry).some(Boolean)){postBank(banks,w.lending.bankIds[i],'corporate.service',entry);postings.push({bankId:w.lending.bankIds[i],kind:'serviceFees',bank:entry});}}
    validate(w,contracts);banksFor(w,contracts,banks);collateralFor(w,contracts,property);
    return {world:w,contracts,collateral:property,banks,bankPostings:postings};
  }
  function transact(input,boundary){
    shape(boundary,['contracts','collateral','banks','instructions','protectedCash','creditWork'],'borrower activity boundary');validate(input,boundary.contracts);
    if(input.version!==4||!input.month||input.lending.activityMonth===input.month)throw Error('Corporate activity already resolved');
    const banks=banksFor(input,boundary.contracts,boundary.banks),collateral=collateralFor(input,boundary.contracts,boundary.collateral);
    shape(boundary.protectedCash,[...input.lending.bankIds,...input.companies.map(c=>c.id)],'protected cash');shape(boundary.creditWork,input.lending.bankIds,'draw work');
    for(const n of Object.values(boundary.protectedCash))check(n,'protected cash');for(const n of Object.values(boundary.creditWork))check(n,'draw work');
    if(boundary.instructions.some(x=>input.companies.find(c=>c.id===x.borrowerId)?.resolution))throw Error('Closed company cannot transact');
    const result=L.transactContracts({version:1,month:input.month,contracts:boundary.contracts,collateral,instructions:boundary.instructions,
      banks:banks.map(b=>({id:b.id,cash:b.book.accounts.cash,protectedCash:boundary.protectedCash[b.id],creditWork:boundary.creditWork[b.id]})),
      borrowers:input.companies.map(c=>({id:c.id,cash:c.book.accounts.cash,protectedCash:boundary.protectedCash[c.id]}))});
    const w=copy(input);for(const p of result.postings)postLoan(w,banks,p,'activity');w.lending.activityMonth=w.month;
    validate(w,result.contracts);banksFor(w,result.contracts,banks);collateralFor(w,result.contracts,result.collateral);
    return {world:w,contracts:result.contracts,collateral:result.collateral,banks,bankPostings:result.postings,decisions:result.decisions};
  }
  function payAgencyPremium(input,index,carrier,amount,contracts=[]){
    if(input?.version!==4)return legacy.payAgencyPremium(input,index,carrier,amount);
    validate(input,contracts);G.validate(carrier);check(amount,'insurance premium');
    if(!Number.isInteger(index)||index<0||index>5)throw Error('Invalid company index');
    const w=copy(input),c=w.companies[index];if(c.resolution||!c.report||c.book.accounts.cash<amount)throw Error('Company cannot fund insurance');
    const t=G.servicePayment(c.book,carrier,amount);c.book=t.payer;c.report.agencyExpense+=amount;c.report.profit-=amount;w.agencyCashNet+=amount;
    validate(w,contracts);return {world:w,carrier:t.provider};
  }
  return Object.freeze({opening:legacy.opening,withAgency:legacy.withAgency,withLending,validate,validateSettled,step,originate,transact,payAgencyPremium,
    limitations:Object.freeze(['Isolated corporate-only candidate; not live gameplay.','Only commercial/CRE currently have company eligibility; five other offers require funded household/small-business counterparties.','Borrower wallets, acquisitions/loan participation transfers, and live UI/transport integration remain required.','Bank legacyPrincipal and otherReceivables are explicit attributed input boundaries, not inferred or overwritten.','Required order: monthly service, optional borrower activity, then new originations. New loans cannot be prepaid in their origination pass.','First-origination sector, deployed capability, workload and borrowing ceilings still require authoritative engine policy inputs.','Full contracts and bank books here are HOST-PRIVATE. Existing public companySnapshot cannot use this full validator: a separate aggregate public projection/validator and owner-safe forecast are mandatory. Never reveal rival terms, underwriting or bank books to satisfy validation.','Agency payments after monthly liquidation may create next-month stress; no automatic funding or same-month rescue.'])});
}
module.exports=createCompanyFinanceV4;
