'use strict';

// Living-portfolio candidate. Not loaded by the playable build. These contracts
// are intended to extend the canonical credit cohorts, not shadow their principal.
// Money and capacity enter only through explicit opening snapshots. The engine
// adapter must post the returned paired movements atomically before adopting them.
const LivingLoanContracts = (() => {
  const catalog = Object.freeze(Object.fromEntries([
    ['installment', 'Consumer installment', 'consumer', 'household', [12,24,36,60], 'amortizing', 10000, 0, 250000, 1],
    ['auto', 'Secured auto', 'consumer', 'household', [24,36,48,60], 'amortizing', 8000, 8000, 200000, 1],
    ['businessTerm', 'Small-business term', 'middleMarket', 'business', [12,24,36,60], 'amortizing', 10000, 0, 250000, 2],
    ['businessLine', 'Small-business revolving line', 'middleMarket', 'business', [12,24], 'revolving', 10000, 0, 200000, 2],
    ['mortgage', 'Residential mortgage', 'mortgage', 'household', [120,180,240,360], 'amortizing', 5000, 8000, 500000, 2],
    ['commercial', 'Commercial and industrial', 'middleMarket', 'company', [24,36,48,60], 'amortizing', 10000, 0, 500000, 3],
    ['cre', 'Commercial property', 'middleMarket', 'company', [36,60,120], 'balloon', 15000, 7000, 500000, 4]
  ].map(([id,label,family,segment,terms,repayment,riskWeightBps,maxLtvBps,dollarsPerWork,workMinimum]) =>
    [id,Object.freeze({id,label,family,segment,terms:Object.freeze(terms),repayment,riskWeightBps,maxLtvBps,dollarsPerWork,workMinimum})])));
  const copy = value => JSON.parse(JSON.stringify(value));
  const compare = (a,b) => a<b?-1:a>b?1:0;
  const own = (o,k) => Object.hasOwn(o,k);
  const contractId = (month,application,bank) => 'loan:'+month+':'+application.length+':'+application+':'+bank.length+':'+bank;
  function integer(n,label,min=0,max=Number.MAX_SAFE_INTEGER) {
    if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('Invalid '+label);
    return n;
  }
  function id(s,label) {
    if(typeof s!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(s))throw Error('Invalid '+label);
    return s;
  }
  function shape(value,keys,label) {
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join()!==keys.slice().sort().join())throw Error('Invalid '+label+' fields');
  }
  function ratio(a,b,d,up=false) {
    integer(a,'ratio amount');integer(b,'ratio numerator');integer(d,'ratio denominator',1);
    const n=BigInt(a)*BigInt(b),den=BigInt(d),result=Number((n+(up?den-1n:0n))/den);
    return integer(result,'ratio result');
  }
  function sum(values) {return values.reduce((n,v)=>integer(n+v,'sum'),0);}
  function unique(rows,key,label) {
    if(!Array.isArray(rows)||rows.length>10000)throw Error('Invalid '+label);
    const seen=new Set();for(const row of rows){const k=id(row?.[key],label+' identity');if(seen.has(k))throw Error('Duplicate '+label);seen.add(k);}
  }
  function terms(product,selection) {
    if(!own(catalog,product))throw Error('Unsupported lending product');
    shape(selection,['annualRateBps','feeBps','termMonths','underwriting'],'contract terms');
    integer(selection.annualRateBps,'annual rate',0,5000);integer(selection.feeBps,'origination fee',0,500);
    if(!catalog[product].terms.includes(selection.termMonths))throw Error('Unsupported product maturity');
    if(!['conservative','balanced','growth'].includes(selection.underwriting))throw Error('Unsupported underwriting');
    return {...copy(selection),repayment:catalog[product].repayment,riskWeightBps:catalog[product].riskWeightBps,
      maxLtvBps:catalog[product].maxLtvBps,lossSensitivityBps:{conservative:6500,balanced:10000,growth:15000}[selection.underwriting]};
  }
  function validateSnapshot(s) {
    shape(s,['version','month','banks','borrowers','applications'],'origination snapshot');
    if(s.version!==1)throw Error('Unsupported origination snapshot');integer(s.month,'origination month',1);
    unique(s.banks,'id','banks');unique(s.borrowers,'id','borrowers');unique(s.applications,'id','applications');
    if(s.banks.length<1||s.banks.length>2)throw Error('Unsupported lending seats');
    for(const b of s.banks){
      shape(b,['id','cash','reserve','capital','minimumCapitalRatioBps','riskWeightedAssets','originationLimit','creditWork','sectorLimits','sectorExposure','deployments','contractSlots'],'bank snapshot');
      for(const k of ['cash','reserve','riskWeightedAssets','originationLimit','creditWork'])integer(b[k],k);
      integer(b.capital,'capital',-Number.MAX_SAFE_INTEGER);integer(b.minimumCapitalRatioBps,'minimum capital ratio',1,10000);
      integer(b.contractSlots,'remaining contract slots',0,10000);
      if(!b.sectorLimits||!b.sectorExposure||Array.isArray(b.sectorLimits)||Array.isArray(b.sectorExposure))throw Error('Invalid sector envelopes');
      if(Object.keys(b.sectorLimits).sort().join()!==Object.keys(b.sectorExposure).sort().join())throw Error('Sector envelopes disagree');
      for(const sector of Object.keys(b.sectorLimits)){id(sector,'sector');integer(b.sectorLimits[sector],'sector limit');integer(b.sectorExposure[sector],'sector exposure');}
      if(!Array.isArray(b.deployments)||b.deployments.length>1000)throw Error('Invalid lending deployments');
      const routes=new Set();for(const d of b.deployments){
        shape(d,['product','market','channel','status'],'lending deployment');if(!own(catalog,d.product))throw Error('Unsupported deployed product');id(d.market,'deployed market');
        if(!['physical','digital','partner'].includes(d.channel)||!['active','paused','retired'].includes(d.status))throw Error('Invalid deployment state');
        const key=[d.product,d.market,d.channel].join('|');if(routes.has(key))throw Error('Duplicate lending deployment');routes.add(key);
      }
    }
    for(const b of s.borrowers){
      shape(b,['id','market','segment','sector','cash','existingDebt','existingUndrawn','borrowingLimit','collateral'],'borrower snapshot');
      id(b.market,'market');id(b.sector,'sector');if(!['household','business','company'].includes(b.segment))throw Error('Invalid borrower segment');
      for(const k of ['cash','existingDebt','existingUndrawn','borrowingLimit'])integer(b[k],k);sum([b.existingDebt,b.existingUndrawn]);
      unique(b.collateral,'id','collateral');for(const c of b.collateral){shape(c,['id','value','pledgedValue'],'collateral');integer(c.value,'collateral value');integer(c.pledgedValue,'existing pledge');}
    }
    // Property cannot be pledged by two separate borrower identities.
    unique(s.borrowers.flatMap(b=>b.collateral),'id','global collateral');
    const borrowerById=new Map(s.borrowers.map(b=>[b.id,b]));
    for(const a of s.applications){
      shape(a,['id','borrowerId','product','amount','maxAnnualRateBps','minTermMonths','collateralId','initialDrawBps','channel'],'application');
      const b=borrowerById.get(a.borrowerId),p=catalog[a.product];
      if(!b||!own(catalog,a.product)||p.segment!==b.segment)throw Error('Invalid borrower/product application');
      integer(a.amount,'application amount',1);integer(a.maxAnnualRateBps,'customer rate ceiling',0,5000);integer(a.minTermMonths,'minimum maturity',1,360);
      integer(a.initialDrawBps,'initial utilization',p.repayment==='revolving'?0:10000,10000);
      if(!['physical','digital','partner'].includes(a.channel))throw Error('Invalid application channel');
      if(p.maxLtvBps){if(!b.collateral.some(c=>c.id===a.collateralId))throw Error('Missing applicant collateral');}
      else if(a.collateralId!==null)throw Error('Unexpected applicant collateral');
    }
    return s;
  }
  function validateOffers(s,offers) {
    if(!Array.isArray(offers)||offers.length>20000)throw Error('Invalid loan offers');
    const keys=new Set(),applications=new Map(s.applications.map(a=>[a.id,a]));
    for(const o of offers){
      shape(o,['bankId','applicationId','amount','terms'],'loan offer');
      const a=applications.get(o.applicationId);
      if(!s.banks.some(b=>b.id===o.bankId)||!a)throw Error('Unknown offer party');
      const k=o.bankId+'|'+o.applicationId;if(keys.has(k))throw Error('Duplicate lender offer');keys.add(k);
      integer(o.amount,'offered amount',1,a.amount);terms(a.product,o.terms);
    }
  }
  // Rotation gives an indivisible dollar alternating priority without engine RNG
  // draws or host/player array order. Economic price ranking is separate.
  function rotate(rows,month,key) {
    const sorted=rows.slice().sort((a,b)=>a[key]<b[key]?-1:a[key]>b[key]?1:0);
    if(!sorted.length)return sorted;const start=(month-1)%sorted.length;
    return sorted.slice(start).concat(sorted.slice(0,start));
  }
  function split(amount,weights,month) {
    const total=sum(weights.map(w=>w.amount)),result=new Map(weights.map(w=>[w.bankId,0]));
    if(!total)return result;
    const size=Math.min(amount,total),rows=weights.map(w=>({...w,n:ratio(size,w.amount,total),remainder:BigInt(size)*BigInt(w.amount)%BigInt(total)}));
    let left=size-sum(rows.map(r=>r.n));const order=new Map(rotate(rows,month,'bankId').map((r,i)=>[r.bankId,i]));
    rows.sort((a,b)=>a.remainder>b.remainder?-1:a.remainder<b.remainder?1:order.get(a.bankId)-order.get(b.bankId));
    for(const r of rows){if(left){r.n++;left--;}result.set(r.bankId,r.n);}
    return result;
  }
  function workFor(product,commitment) {
    const p=catalog[product];return commitment?Math.max(p.workMinimum,Math.ceil(commitment/p.dollarsPerWork)):0;
  }
  function clearOriginations(snapshot,offers) {
    validateSnapshot(snapshot);validateOffers(snapshot,offers);
    const banks=new Map(snapshot.banks.map(b=>[b.id,{...copy(b),remainingCash:Math.max(0,b.cash-b.reserve),remainingLimit:b.originationLimit,
      remainingRwa:Math.max(0,ratio(Math.max(0,b.capital),10000,b.minimumCapitalRatioBps)-b.riskWeightedAssets),remainingWork:b.creditWork,remainingSlots:b.contractSlots}]));
    const borrowers=new Map(snapshot.borrowers.map(b=>[b.id,{...copy(b),remainingBorrowing:Math.max(0,b.borrowingLimit-b.existingDebt-b.existingUndrawn)}]));
    const contracts=[],postings=[],decisions=[],offersByApplication=new Map(),borrowerCashChanges=new Map();
    for(const o of offers){if(!offersByApplication.has(o.applicationId))offersByApplication.set(o.applicationId,[]);offersByApplication.get(o.applicationId).push(o);}
    for(const a of rotate(snapshot.applications,snapshot.month,'id')) {
      const applicant=borrowers.get(a.borrowerId),p=catalog[a.product];let unfilled=a.amount;
      const candidates=(offersByApplication.get(a.id)||[]).map(o=>({...o,price:o.terms.annualRateBps+ratio(o.terms.feeBps,12,o.terms.termMonths,true)}));
      const prices=[...new Set(candidates.map(c=>c.price))].sort((a,b)=>a-b);
      for(const price of prices){
        if(!unfilled)break;
        const group=candidates.filter(c=>c.price===price),weights=[];
        const collateral=p.maxLtvBps?applicant.collateral.find(c=>c.id===a.collateralId):null;
        const borrowerCap=Math.min(unfilled,applicant.remainingBorrowing,collateral?ratio(Math.max(0,collateral.value-collateral.pledgedValue),p.maxLtvBps,10000):Number.MAX_SAFE_INTEGER);
        for(const o of group){
          const bank=banks.get(o.bankId),sectorRoom=Math.max(0,(bank.sectorLimits[applicant.sector]??0)-(bank.sectorExposure[applicant.sector]??0));
          let cap=Math.min(o.amount,bank.remainingCash,bank.remainingLimit,ratio(bank.remainingRwa,10000,p.riskWeightBps),sectorRoom,
            bank.remainingWork<p.workMinimum?0:bank.remainingWork*p.dollarsPerWork);
          // Gross commitments reserve funding, including undrawn revolving lines.
          // Fees and unused commitment cannot be recycled into this clearing pass.
          if(!bank.remainingSlots||o.terms.annualRateBps>a.maxAnnualRateBps||o.terms.termMonths<a.minTermMonths||
             !bank.deployments.some(d=>d.product===a.product&&d.market===applicant.market&&d.channel===a.channel&&d.status==='active'))cap=0;
          weights.push({bankId:o.bankId,amount:cap});
        }
        const fills=split(borrowerCap,weights,snapshot.month);
        for(const o of rotate(group,snapshot.month,'bankId')){
          // Each distinct pledge rounds to whole dollars. Recheck the remaining
          // actual property so two lenders cannot round the same last dollar up.
          const committed=Math.min(fills.get(o.bankId)||0,collateral?ratio(Math.max(0,collateral.value-collateral.pledgedValue),p.maxLtvBps,10000):Number.MAX_SAFE_INTEGER);if(!committed)continue;
          const bank=banks.get(o.bankId),originalTerms=terms(a.product,o.terms),principal=ratio(committed,a.initialDrawBps,10000),fee=ratio(principal,o.terms.feeBps,10000);
          const pledgedValue=collateral?ratio(committed,10000,p.maxLtvBps,true):0,work=workFor(a.product,committed),rwa=ratio(committed,p.riskWeightBps,10000,true);
          const contract={id:contractId(snapshot.month,a.id,o.bankId),applicationId:a.id,originatorBankId:o.bankId,bankId:o.bankId,basisAdjustment:0,borrowerId:a.borrowerId,market:applicant.market,sector:applicant.sector,
            product:p.family,offerProduct:a.product,principal,commitment:committed,undrawn:committed-principal,remainingMonths:o.terms.termMonths,
            originatedMonth:snapshot.month,originalPrincipal:principal,originalCommitment:committed,originalTerms,
            servicing:{lastMonth:snapshot.month,activityMonth:snapshot.month,principalDue:0,interestDue:0,suspendedInterest:0,missedMonths:0,interestCarry:0},
            collateral:collateral?{id:collateral.id,originalValue:collateral.value,pledgedValue,originationLtvBps:ratio(committed,10000,pledgedValue,true),releasedMonth:null}:null};
          contracts.push(contract);
          postings.push({contractId:contract.id,bankId:bank.id,borrowerId:applicant.id,bank:{cash:-principal+fee,loans:principal,equity:fee,earnings:fee},borrower:{cash:principal-fee,debt:principal},fee,commitment:committed,creditWork:work,riskWeightedAssets:rwa});
          borrowerCashChanges.set(applicant.id,integer((borrowerCashChanges.get(applicant.id)||0)+principal-fee,'borrower cash movements'));
          bank.remainingCash-=committed;bank.remainingLimit-=committed;bank.remainingRwa-=rwa;bank.remainingWork-=work;bank.remainingSlots--;
          bank.sectorExposure[applicant.sector]+=committed;applicant.remainingBorrowing-=committed;
          if(collateral)collateral.pledgedValue+=pledgedValue;unfilled-=committed;
        }
      }
      decisions.push({applicationId:a.id,requested:a.amount,committed:a.amount-unfilled,unfilled});
    }
    // Stable output ordering makes transport/seat order irrelevant to hashing.
    for(const borrower of snapshot.borrowers)integer(borrower.cash+(borrowerCashChanges.get(borrower.id)||0),'resulting borrower cash');
    contracts.sort((a,b)=>compare(a.id,b.id));postings.sort((a,b)=>compare(a.contractId,b.contractId));decisions.sort((a,b)=>compare(a.applicationId,b.applicationId));
    return {version:1,month:snapshot.month,contracts,postings,decisions,banks:[...banks.values()].sort((a,b)=>compare(a.id,b.id)).map(b=>({id:b.id,
      committed:b.originationLimit-b.remainingLimit,remainingCashReservation:b.remainingCash,remainingRiskWeightedAssets:b.remainingRwa,remainingCreditWork:b.remainingWork,remainingContractSlots:b.remainingSlots,
      cashChange:postings.filter(p=>p.bankId===b.id).reduce((n,p)=>n+p.bank.cash,0)}))};
  }
  function validateContract(c){
    shape(c,['id','applicationId','originatorBankId','bankId','basisAdjustment','borrowerId','market','sector','product','offerProduct','principal','commitment','undrawn','remainingMonths','originatedMonth','originalPrincipal','originalCommitment','originalTerms','collateral','servicing'],'loan contract');
    if(typeof c.id!=='string'||!/^[A-Za-z0-9_.:-]{1,350}$/.test(c.id))throw Error('Invalid contract identity');
    for(const k of ['applicationId','originatorBankId','bankId','borrowerId','market','sector'])id(c[k],k);
    if(c.id!==contractId(c.originatedMonth,c.applicationId,c.originatorBankId))throw Error('Loan identity does not match origination');
    if(!own(catalog,c.offerProduct)||c.product!==catalog[c.offerProduct].family)throw Error('Invalid retained product');
    const selection={annualRateBps:c.originalTerms?.annualRateBps,feeBps:c.originalTerms?.feeBps,termMonths:c.originalTerms?.termMonths,underwriting:c.originalTerms?.underwriting};
    const expected=terms(c.offerProduct,selection);
    shape(c.originalTerms,Object.keys(expected),'original contract terms');for(const k of Object.keys(expected))if(c.originalTerms[k]!==expected[k])throw Error('Inconsistent original terms');
    for(const k of ['principal','commitment','undrawn','remainingMonths','originalPrincipal','originalCommitment'])integer(c[k],k);
    integer(c.basisAdjustment,'loan purchase basis',-c.principal);
    integer(c.principal+c.basisAdjustment,'loan principal carrying value');
    if(!c.principal&&c.basisAdjustment)throw Error('Paid loan retains purchase basis');
    integer(c.originalCommitment,'original commitment',1);
    integer(c.originatedMonth,'vintage',1);if(c.remainingMonths>c.originalTerms.termMonths||c.principal+c.undrawn!==c.commitment||c.commitment>c.originalCommitment||c.originalPrincipal>c.originalCommitment||!c.remainingMonths&&c.undrawn)throw Error('Invalid retained loan balances');
    const p=catalog[c.offerProduct];if(p.repayment!=='revolving'&&(c.undrawn!==0||c.originalPrincipal!==c.originalCommitment))throw Error('Unexpected revolving balance');
    if(p.maxLtvBps){
      shape(c.collateral,['id','originalValue','pledgedValue','originationLtvBps','releasedMonth'],'retained collateral');id(c.collateral.id,'collateral identity');
      for(const k of ['originalValue','pledgedValue','originationLtvBps'])integer(c.collateral[k],k,1);
      if(c.collateral.pledgedValue>c.collateral.originalValue||c.collateral.originationLtvBps!==ratio(c.originalCommitment,10000,c.collateral.pledgedValue,true)||c.collateral.originationLtvBps>p.maxLtvBps)throw Error('Invalid original collateral pledge');
      if(c.collateral.releasedMonth!==null){integer(c.collateral.releasedMonth,'collateral release month',c.originatedMonth);if(c.principal||c.undrawn||c.servicing?.interestDue||c.servicing?.suspendedInterest||c.collateral.releasedMonth>c.servicing?.lastMonth)throw Error('Premature collateral release');}
    }else if(c.collateral!==null)throw Error('Unexpected retained collateral');
    shape(c.servicing,['lastMonth','activityMonth','principalDue','interestDue','suspendedInterest','missedMonths','interestCarry'],'loan servicing');
    for(const k of ['lastMonth','activityMonth','principalDue','interestDue','suspendedInterest','missedMonths','interestCarry'])integer(c.servicing[k],k);
    if(c.servicing.activityMonth<c.originatedMonth||c.servicing.activityMonth>c.servicing.lastMonth)throw Error('Invalid borrower activity fence');
    if(c.servicing.lastMonth<c.originatedMonth||c.servicing.principalDue>c.principal||c.servicing.interestCarry>=120000||c.servicing.missedMonths>c.servicing.lastMonth-c.originatedMonth)throw Error('Invalid retained servicing');
    if(c.remainingMonths!==Math.max(0,c.originalTerms.termMonths-(c.servicing.lastMonth-c.originatedMonth))||
      !!sum([c.servicing.principalDue,c.servicing.interestDue,c.servicing.suspendedInterest])!==!!c.servicing.missedMonths)throw Error('Loan maturity or delinquency was rewritten');
    return c;
  }
  // Purchase premiums/discounts belong to the holder, not the borrower. Release
  // basis only against real principal payments, with exact residual at payoff.
  // Draws at par do not realize any existing basis. This explicit provisional
  // proportional rule is not contractual interest or a borrower fee.
  function releaseBasis(c,principalPaid){
    integer(principalPaid,'basis principal payment',0,c.principal);
    const released=!principalPaid?0:principalPaid===c.principal?c.basisAdjustment:
      Number(BigInt(c.basisAdjustment)*BigInt(principalPaid)/BigInt(c.principal));
    c.basisAdjustment-=released;return released;
  }
  function contractBoundary(input,lastMonth){
    if(!Array.isArray(input.contracts)||input.contracts.length>20000)throw Error('Invalid servicing contracts');
    const bankCounts=new Map();for(const c of input.contracts){bankCounts.set(c.bankId,(bankCounts.get(c.bankId)||0)+1);if(bankCounts.size>2||bankCounts.get(c.bankId)>10000)throw Error('Servicing bank portfolio limit exceeded');}
    const contractIds=new Set();for(const c of input.contracts){validateContract(c);if(contractIds.has(c.id))throw Error('Duplicate serviced contract');contractIds.add(c.id);if(c.servicing.lastMonth!==lastMonth)throw Error('Nonsequential loan servicing');}
    unique(input.borrowers,'id','servicing borrowers');
    for(const b of input.borrowers){shape(b,['id','cash','protectedCash'],'servicing borrower');integer(b.cash,'borrower cash');integer(b.protectedCash,'borrower protected cash');}
    const borrowerIds=new Set(input.borrowers.map(b=>b.id));if(input.contracts.some(c=>!borrowerIds.has(c.borrowerId)))throw Error('Missing funded borrower');
    unique(input.collateral,'id','servicing collateral');const propertyById=new Map(input.collateral.map(p=>[p.id,copy(p)])),pledges=new Map();
    for(const property of propertyById.values()){
      shape(property,['id','borrowerId','value','pledgedValue','externalPledgedValue'],'servicing collateral');
      if(!borrowerIds.has(property.borrowerId))throw Error('Unknown collateral owner');for(const k of ['value','pledgedValue','externalPledgedValue'])integer(property[k],k);
      if(property.externalPledgedValue>property.pledgedValue)throw Error('Invalid outside pledge');
    }
    // A released pledge is historical evidence, not a perpetual ownership lock.
    // Only live claims require a current property and participate in its totals.
    for(const c of input.contracts)if(c.collateral&&c.collateral.releasedMonth===null){
      const property=propertyById.get(c.collateral.id);if(!property||property.borrowerId!==c.borrowerId)throw Error('Collateral ownership mismatch');
      pledges.set(property.id,integer((pledges.get(property.id)||0)+c.collateral.pledgedValue,'aggregate collateral pledges'));
    }
    for(const property of propertyById.values())if((pledges.get(property.id)||0)+property.externalPledgedValue!==property.pledgedValue)throw Error('Collateral claims do not reconcile');
    return propertyById;
  }
  function serviceContracts(input){
    shape(input,['version','month','contracts','borrowers','collateral'],'servicing request');
    if(input.version!==1)throw Error('Unsupported servicing request');integer(input.month,'servicing month',1);
    const propertyById=contractBoundary(input,input.month-1);
    const contracts=copy(input.contracts),postings=[],reports=[],contractsByBorrower=new Map();
    for(const c of contracts){if(!contractsByBorrower.has(c.borrowerId))contractsByBorrower.set(c.borrowerId,[]);contractsByBorrower.get(c.borrowerId).push(c);}
    for(const b of input.borrowers){
      const rows=contractsByBorrower.get(b.id)||[],claims=[],claimsById=new Map();
      for(const c of rows){
        // Contractual interest is an identified receivable/payable, not cash.
        // At 90+ days delinquent, stop new accrual. Loss allowances and collateral
        // recovery are a separate required adapter, not hidden cash generation.
        const numerator=BigInt(c.principal)*BigInt(c.originalTerms.annualRateBps)+BigInt(c.servicing.interestCarry);
        const contractual=integer(Number(numerator/120000n),'contractual interest'),accrued=c.servicing.missedMonths>=3?0:contractual,suspended=contractual-accrued;
        c.servicing.interestCarry=Number(numerator%120000n);
        c.servicing.interestDue=integer(c.servicing.interestDue+accrued,'unpaid interest');
        // Non-accrual changes recognition, not the contract. Unrecognized legal
        // interest remains a matched memorandum claim until paid or explicitly
        // waived in a future restructuring transaction.
        c.servicing.suspendedInterest=integer(c.servicing.suspendedInterest+suspended,'suspended contractual interest');
        const current=Math.max(0,c.principal-c.servicing.principalDue),newPrincipal=c.remainingMonths<=1?current:c.originalTerms.repayment==='amortizing'?Math.ceil(current/c.remainingMonths):0;
        c.servicing.principalDue=integer(c.servicing.principalDue+newPrincipal,'scheduled principal');
        const claim={bankId:c.id,amount:sum([c.servicing.principalDue,c.servicing.interestDue,c.servicing.suspendedInterest]),accrued,suspended};claims.push(claim);claimsById.set(c.id,claim);
      }
      const payments=split(Math.max(0,b.cash-b.protectedCash),claims,input.month);
      for(const c of rows){
        const claim=claimsById.get(c.id),paid=payments.get(c.id),recognizedInterestPaid=Math.min(paid,c.servicing.interestDue),suspendedInterestPaid=Math.min(paid-recognizedInterestPaid,c.servicing.suspendedInterest),
          interestPaid=recognizedInterestPaid+suspendedInterestPaid,principalPaid=paid-interestPaid;
        const basisReleased=releaseBasis(c,principalPaid);
        c.principal-=principalPaid;c.servicing.principalDue-=principalPaid;c.servicing.interestDue-=recognizedInterestPaid;c.servicing.suspendedInterest-=suspendedInterestPaid;
        c.remainingMonths=Math.max(0,c.remainingMonths-1);if(!c.remainingMonths){c.undrawn=0;c.commitment=c.principal;}else if(c.originalTerms.repayment!=='revolving')c.commitment=c.principal;
        c.servicing.missedMonths=c.servicing.principalDue+c.servicing.interestDue+c.servicing.suspendedInterest?c.servicing.missedMonths+1:0;c.servicing.lastMonth=input.month;
        const collateralReleaseValue=c.collateral&&c.collateral.releasedMonth===null&&!c.principal&&!c.undrawn&&!c.servicing.interestDue&&!c.servicing.suspendedInterest?c.collateral.pledgedValue:0;
        if(collateralReleaseValue){c.collateral.releasedMonth=input.month;propertyById.get(c.collateral.id).pledgedValue-=collateralReleaseValue;}
        postings.push({contractId:c.id,bankId:c.bankId,borrowerId:b.id,
          bank:{cash:paid,loans:-principalPaid,...(basisReleased?{loanBasisAdjustment:-basisReleased}:{}),receivables:claim.accrued-recognizedInterestPaid,equity:claim.accrued+suspendedInterestPaid-basisReleased,earnings:claim.accrued+suspendedInterestPaid-basisReleased},
          borrower:{cash:-paid,debt:-principalPaid,interestPayable:claim.accrued-recognizedInterestPaid,interestExpense:claim.accrued+suspendedInterestPaid},
          memorandumInterestChange:claim.suspended-suspendedInterestPaid,principalPaid,interestPaid,recognizedInterestPaid,suspendedInterestPaid,accruedInterest:claim.accrued,collateralReleaseValue});
        reports.push({contractId:c.id,principalDueBeforePayment:claim.amount-(c.servicing.interestDue+c.servicing.suspendedInterest+interestPaid),principalPaid,interestPaid,accruedInterest:claim.accrued,
          overduePrincipal:c.servicing.principalDue,overdueInterest:c.servicing.interestDue,suspendedInterest:c.servicing.suspendedInterest,missedMonths:c.servicing.missedMonths,remainingMonths:c.remainingMonths});
        validateContract(c);
      }
    }
    contracts.sort((a,b)=>compare(a.id,b.id));postings.sort((a,b)=>compare(a.contractId,b.contractId));reports.sort((a,b)=>compare(a.contractId,b.contractId));
    return{version:1,month:input.month,contracts,postings,reports,collateral:[...propertyById.values()].sort((a,b)=>compare(a.id,b.id))};
  }
  // One optional borrower transaction per contract after this month's mandatory
  // servicing. Cash is reserved from the opening boundary: a draw cannot fund a
  // same-pass repayment, and receipts cannot fund another borrower's draw.
  // This is NOT a player ability to create customer demand or appropriate cash;
  // the eventual borrower/economy adapter must own these instructions.
  function transactContracts(input){
    shape(input,['version','month','contracts','borrowers','collateral','banks','instructions'],'borrower transaction request');
    if(input.version!==1)throw Error('Unsupported borrower transaction request');integer(input.month,'transaction month',1);
    const propertyById=contractBoundary(input,input.month),contracts=copy(input.contracts),byId=new Map(contracts.map(c=>[c.id,c]));
    if(contracts.some(c=>c.servicing.activityMonth>=input.month))throw Error('Borrower activity already resolved');
    unique(input.banks,'id','transaction banks');if(input.banks.length<1||input.banks.length>2)throw Error('Invalid transaction banks');
    const bankById=new Map();for(const b of input.banks){
      shape(b,['id','cash','protectedCash','creditWork'],'transaction bank');for(const k of ['cash','protectedCash','creditWork'])integer(b[k],k);
      bankById.set(b.id,{...b,draws:[]});
    }
    if(contracts.some(c=>!bankById.has(c.bankId)))throw Error('Missing funded lender');
    if(!Array.isArray(input.instructions)||input.instructions.length>20000)throw Error('Invalid borrower instructions');
    const seen=new Set(),byBorrower=new Map(input.borrowers.map(b=>[b.id,{...b,repayments:[]}])) ,decisions=new Map(),fills=new Map();
    for(const action of input.instructions){
      shape(action,['contractId','borrowerId','kind','amount'],'borrower instruction');integer(action.amount,'requested transaction',1);
      const c=byId.get(action.contractId);if(!c||c.borrowerId!==action.borrowerId||!['draw','repay'].includes(action.kind)||seen.has(c.id))throw Error('Invalid or duplicate borrower instruction');
      seen.add(c.id);let amount=action.kind==='repay'?Math.min(action.amount,sum([c.principal,c.servicing.interestDue,c.servicing.suspendedInterest])):
        c.originalTerms.repayment==='revolving'&&c.remainingMonths&&!c.servicing.missedMonths?Math.min(action.amount,c.undrawn):0;
      decisions.set(c.id,{contractId:c.id,kind:action.kind,requested:action.amount,eligible:amount,filled:0});
      if(action.kind==='draw')bankById.get(c.bankId).draws.push({bankId:c.id,amount});
      else byBorrower.get(c.borrowerId).repayments.push({bankId:c.id,amount});
    }
    for(const b of byBorrower.values())for(const [key,amount]of split(Math.max(0,b.cash-b.protectedCash),b.repayments,input.month))fills.set(key,amount);
    for(const b of bankById.values()){
      // Each approved draw consumes real administrative work; shared work is
      // reserved before cash apportionment. Rotation affects only scarce ties.
      let work=b.creditWork;const eligible=[];
      for(const request of rotate(b.draws,input.month,'bankId')){
        const amount=Math.min(request.amount,ratio(work,250000,1)),used=amount?Math.ceil(amount/250000):0;
        work-=used;eligible.push({...request,amount});
      }
      for(const [key,amount]of split(Math.max(0,b.cash-b.protectedCash),eligible,input.month))fills.set(key,amount);
    }
    const postings=[],bankCashChanges=new Map(),borrowerCashChanges=new Map();
    for(const c of contracts){
      c.servicing.activityMonth=input.month;const action=decisions.get(c.id);if(!action)continue;
      const paid=fills.get(c.id)||0;action.filled=paid;
      let principalPaid=0,recognizedInterestPaid=0,suspendedInterestPaid=0,draw=0,basisReleased=0;
      if(action.kind==='draw'){draw=paid;c.principal+=draw;c.undrawn-=draw;}
      else{
        recognizedInterestPaid=Math.min(paid,c.servicing.interestDue);suspendedInterestPaid=Math.min(paid-recognizedInterestPaid,c.servicing.suspendedInterest);
        principalPaid=paid-recognizedInterestPaid-suspendedInterestPaid;basisReleased=releaseBasis(c,principalPaid);c.principal-=principalPaid;c.servicing.principalDue=Math.max(0,c.servicing.principalDue-principalPaid);
        c.servicing.interestDue-=recognizedInterestPaid;c.servicing.suspendedInterest-=suspendedInterestPaid;
        if(c.originalTerms.repayment==='revolving'&&c.remainingMonths)c.undrawn+=principalPaid;else c.commitment=c.principal;
        if(!sum([c.servicing.principalDue,c.servicing.interestDue,c.servicing.suspendedInterest]))c.servicing.missedMonths=0;
      }
      const collateralReleaseValue=c.collateral&&c.collateral.releasedMonth===null&&!c.principal&&!c.undrawn&&!c.servicing.interestDue&&!c.servicing.suspendedInterest?c.collateral.pledgedValue:0;
      if(collateralReleaseValue){c.collateral.releasedMonth=input.month;propertyById.get(c.collateral.id).pledgedValue-=collateralReleaseValue;}
      const bankCash=principalPaid+recognizedInterestPaid+suspendedInterestPaid-draw;
      bankCashChanges.set(c.bankId,(bankCashChanges.get(c.bankId)||0)+bankCash);
      borrowerCashChanges.set(c.borrowerId,(borrowerCashChanges.get(c.borrowerId)||0)-bankCash);
      postings.push({contractId:c.id,bankId:c.bankId,borrowerId:c.borrowerId,kind:action.kind,draw,principalPaid,recognizedInterestPaid,suspendedInterestPaid,
        bank:{cash:bankCash,loans:draw-principalPaid,...(basisReleased?{loanBasisAdjustment:-basisReleased}:{}),receivables:-recognizedInterestPaid,equity:suspendedInterestPaid-basisReleased,earnings:suspendedInterestPaid-basisReleased},
        borrower:{cash:-bankCash,debt:draw-principalPaid,interestPayable:-recognizedInterestPaid,interestExpense:suspendedInterestPaid},
        memorandumInterestChange:-suspendedInterestPaid,creditWork:draw?Math.ceil(draw/250000):0,collateralReleaseValue});
      validateContract(c);
    }
    for(const b of input.banks)integer(b.cash+(bankCashChanges.get(b.id)||0),'resulting lender cash');
    for(const b of input.borrowers)integer(b.cash+(borrowerCashChanges.get(b.id)||0),'resulting borrower cash');
    contracts.sort((a,b)=>compare(a.id,b.id));postings.sort((a,b)=>compare(a.contractId,b.contractId));
    return{version:1,month:input.month,contracts,postings,decisions:[...decisions.values()].sort((a,b)=>compare(a.contractId,b.contractId)),collateral:[...propertyById.values()].sort((a,b)=>compare(a.id,b.id))};
  }
  return Object.freeze({catalog,terms,validateSnapshot,clearOriginations,workFor,validateContract,serviceContracts,transactContracts});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=LivingLoanContracts;
