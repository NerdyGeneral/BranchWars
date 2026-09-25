'use strict';

// Isolated Group7 prerequisite, not installed gameplay. These are provisional
// asset classifications and credit-demand assumptions, not additional wealth.
// Two months of observed operating/service cost plus the next retained debt
// payment form a liquidity target. Existing cash and undrawn commitments reduce
// that SAME target. Debt ceilings constrain new borrowing, never erase a claim.
// The CRE portion finances liquidity against existing commercial property; it
// does not purchase a second property or create a separate funding need.
module.exports=function createCompanyLendingDemand({companyFinance:V,loans:L,anchorClients}){
  const rows=[
    ['Foundry Works','Manufacturing','manufacturing',6000,5500,5000],
    ['Cornerstone Stores','Retail trade','retail-trade',4500,4500,5000],
    ['Civic Infrastructure','Public services','public-services',6500,4000,3500],
    ['Harbor Logistics','Distribution','distribution',5500,5000,5000],
    ['Campus Services','Local services','local-services',3500,4000,2500],
    ['Summit Advisors','Professional services','professional-services',1500,3500,2000]
  ];
  if(!Array.isArray(anchorClients)||anchorClients.length!==6||rows.some((r,i)=>anchorClients[i]?.name!==r[0]||anchorClients[i]?.sector!==r[1]))throw Error('Company lending requires the authored six-client roster');
  const catalog=Object.freeze(rows.map(([name,label,sector,propertyBps,debtBps,creShareBps],i)=>Object.freeze({id:'company:'+i,clientIndex:i,name,label,sector,propertyBps,debtBps,creShareBps})));
  const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
  const shape=(x,keys,label)=>{if(!exact(x,keys))throw Error('Invalid '+label+' fields');};
  const whole=(n,label)=>{if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid '+label);return n;};
  const sum=xs=>xs.reduce((a,b)=>whole(a+whole(b,'amount'),'total'),0);
  const fraction=(a,b)=>whole(Number(BigInt(whole(a,'fraction amount'))*BigInt(whole(b,'basis points'))/10000n),'fraction result');
  function institution(input){
    shape(input,['world','contracts'],'creation boundary');
    if(input.world?.version!==4)throw Error('Explicit company lending version4 required');
    V.validate(input.world,input.contracts);
  }
  function expectedRow(c){
    if(typeof c.market!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(c.market))throw Error('Unsupported company market identity');
    const profile=catalog[c.clientIndex],assets=whole(72*c.baseFee,'opening business assets');
    return {id:c.id,clientIndex:c.clientIndex,market:c.market,sector:profile.sector,openingAssets:assets,
      property:{id:'property:'+c.id+':premises',openingValue:fraction(assets,profile.propertyBps)}};
  }
  function create(input){
    institution(input);
    if(input.world.month!==0||input.world.lending.activityMonth!==0||input.world.lending.originatedMonth!==0||input.contracts.length)throw Error('Property identification requires explicit opening creation');
    return {version:1,startedMonth:0,companies:input.world.companies.map(expectedRow)};
  }
  function validate(input){
    shape(input,['world','contracts','book'],'company demand boundary');institution({world:input.world,contracts:input.contracts});
    const {world,contracts,book}=input;
    shape(book,['version','startedMonth','companies'],'company demand book');
    if(book.version!==1||book.startedMonth!==0||!Array.isArray(book.companies)||book.companies.length!==6)throw Error('Unsupported company demand book');
    for(const [i,c]of world.companies.entries()){
      const row=book.companies[i],expected=expectedRow(c);shape(row,Object.keys(expected),'identified company');shape(row.property,['id','openingValue'],'identified property');
      if(Object.keys(expected).filter(k=>k!=='property').some(k=>row[k]!==expected[k])||Object.keys(expected.property).some(k=>row.property[k]!==expected.property[k]))throw Error('Authored company/property identity changed');
      const held=contracts.filter(x=>x.borrowerId===c.id);
      for(const loan of held){
        if(loan.sector!==row.sector)throw Error('Canonical loan sector disagrees with company identity');
        if(loan.collateral&&(loan.collateral.id!==row.property.id||loan.collateral.originalValue!==row.property.openingValue))throw Error('Canonical collateral is not an identified company asset');
      }
      // This version has no property revaluation or transfer: an aggregate lien
      // above the identified value cannot be legitimate underwater history.
      // Released historical claims remain recorded but no longer encumber it.
      const pledged=sum(held.filter(x=>x.collateral&&x.collateral.releasedMonth===null).map(x=>x.collateral.pledgedValue));
      if(pledged>(c.resolution?0:row.property.openingValue))throw Error('Aggregate company property pledges exceed the retained asset');
    }
    return book;
  }
  function collateral(input){
    validate(input);
    return input.book.companies.map((row,i)=>({id:row.property.id,borrowerId:row.id,
      value:input.world.companies[i].resolution?0:row.property.openingValue,
      pledgedValue:sum(input.contracts.filter(c=>c.collateral?.id===row.property.id&&c.collateral.releasedMonth===null).map(c=>c.collateral.pledgedValue)),
      // Current corporate:creditors debt has no retained lien agreement. Debt
      // alone is not evidence of a property pledge. Future liens need a versioned
      // actual claim contract; never infer them here from debt/principal ratios.
      externalPledgedValue:0}));
  }
  function nextLoanPayment(loan){
    const s=loan.servicing,current=loan.principal-s.principalDue;
    const principal=loan.remainingMonths<=1?current:loan.originalTerms.repayment==='amortizing'?Math.ceil(current/loan.remainingMonths):0;
    const interest=whole(Number((BigInt(loan.principal)*BigInt(loan.originalTerms.annualRateBps)+BigInt(s.interestCarry))/120000n),'contractual next interest');
    // Recognized interest is already in company payables; suspended interest is
    // an additional legal memorandum claim, not booked company spending money.
    return sum([s.principalDue,principal,s.suspendedInterest,interest]);
  }
  function prepare(input){
    validate(input);const {world,contracts,book}=input;
    if(!world.month||world.lending.activityMonth!==world.month||world.lending.originatedMonth!==world.month-1)throw Error('Applications require serviced, activity-sealed, unoriginated company month');
    const property=collateral(input),borrowers=[],applications=[],needs=[];
    for(const [i,c]of world.companies.entries()){
      const row=book.companies[i],profile=catalog[i],held=contracts.filter(x=>x.borrowerId===c.id),undrawn=sum(held.map(x=>x.undrawn));
      const ceiling=Math.min(fraction(c.book.accounts.businessAssets,profile.debtBps),Math.max(0,c.book.accounts.equity));
      const room=Math.max(0,ceiling-sum([c.book.accounts.debt,undrawn]));
      const report=c.report,operatingBuffer=sum([report.operatingCost,report.serviceDue])*2;
      whole(operatingBuffer,'operating buffer');
      const outsideNext=sum([Math.min(c.externalDebt,sum([c.principalDue,c.principalArrears])),Math.round(c.externalDebt*.005)]);
      const debtPayments=sum([outsideNext,...held.map(nextLoanPayment)]);
      const target=sum([operatingBuffer,c.book.accounts.payables,debtPayments]);
      const need=c.resolution?0:Math.max(0,target-sum([c.book.accounts.cash,undrawn]));
      const request=Math.min(need,room),cre=Math.min(fraction(request,profile.creShareBps),fraction(Math.max(0,property[i].value-property[i].pledgedValue),L.catalog.cre.maxLtvBps));
      needs.push({id:c.id,month:world.month,sector:row.sector,operatingBuffer,debtPayments,targetCash:target,cash:c.book.accounts.cash,
        existingDebt:c.book.accounts.debt,existingUndrawn:undrawn,borrowingLimit:ceiling,borrowingRoom:room,liquidityGap:need,requested:request,
        commercial:request-cre,cre,blocked:c.resolution?'resolved':!room?'debt-limit':!need?'cash-sufficient':null});
      if(c.resolution)continue;
      borrowers.push({id:c.id,market:c.market,segment:'company',sector:row.sector,cash:c.book.accounts.cash,existingDebt:c.book.accounts.debt,
        existingUndrawn:undrawn,borrowingLimit:ceiling,collateral:[{id:property[i].id,value:property[i].value,pledgedValue:property[i].pledgedValue}]});
      for(const [product,amount]of [['commercial',request-cre],['cre',cre]])if(amount)applications.push({
        id:'application:'+world.month+':'+c.id+':'+product,borrowerId:c.id,product,amount,maxAnnualRateBps:product==='cre'?1100:1400,
        minTermMonths:L.catalog[product].terms[0],collateralId:product==='cre'?property[i].id:null,initialDrawBps:10000,channel:'physical'});
    }
    return {version:1,month:world.month,borrowers,applications,collateral:property,needs};
  }
  return Object.freeze({catalog,create,validate,collateral,prepare,limitations:Object.freeze([
    'Isolated company-only prerequisite; not a new campaign selection or an installed lending desk.',
    'Property shares, sector debt ceilings, two-month buffer, product split and rate ceilings are provisional authored balance values.',
    'Only existing six-company Commercial/CRE cash needs are covered; household and small-business funded wallets remain absent.',
    'Application amounts are requests, not funds. Both banks must clear one shared snapshot through actual CompanyFinanceV4.originate.',
    'The current outside-creditor debt is treated as unsecured because no lien contract exists. New external liens, property sale/revaluation and ownership transfer require a future explicit asset-history boundary.',
    'Physical channel only here. Actual deployed products, lender pricing/risk acceptance, shared bank funding/capital/work and concentration limits are supplied by the engine adapter.',
    'The buffer is a disclosed corporate liquidity objective, not a promise of future income or automatic refinancing. Repayments may reopen finite headroom; current debt and cash always constrain the next request.',
    'Validated source world/asset metadata is host-private. Public UI must use an explicit whitelisted borrower statement, not expose rival contract terms.'
  ])});
};
