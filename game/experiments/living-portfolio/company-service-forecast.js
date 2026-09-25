'use strict';

// Group7 integration prerequisite, NOT in the playable manifest. This is a
// current-book service-stage quote, not a counterfeit run of the private loan
// engine. Company loan servicing and liquidation happen AFTER this stage and
// require private contracts. Their uncertainty stays explicit in the result.
module.exports=function createCompanyServiceForecast({statement:P}){
  const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
  const integer=(n,label)=>{if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid forecast '+label);return n;};
  const sum=values=>values.reduce((n,x)=>integer(n+integer(x,'amount'),'sum'),0);
  const sensitivity=Object.freeze([1.3,1.2,.4,1.1,1,.8]);
  // Exact same funded Hamilton allocation and monthly remainder rotation as
  // CompanyFinanceV4. Test against actual paired-accounting settlement below.
  function split(cash,weights,month){
    const total=sum(weights),budget=Math.min(cash,total);if(!total)return weights.map(()=>0);
    const rows=weights.map((weight,i)=>({i,n:Number(BigInt(weight)*BigInt(budget)/BigInt(total)),r:BigInt(weight)*BigInt(budget)%BigInt(total)}));
    let left=budget-sum(rows.map(x=>x.n));
    rows.sort((a,b)=>a.r>b.r?-1:a.r<b.r?1:(a.i+month)%rows.length-(b.i+month)%rows.length);
    for(const row of rows)if(left>0){row.n++;left--;}
    return rows.sort((a,b)=>a.i-b.i).map(x=>x.n);
  }
  function quote(input,expected){
    if(!exact(input,['statement','outsideCash','ownerIndex','ownerServiceClaims','demand','ownerDelivery']))throw Error('Invalid company forecast boundary');
    // The live adapter supplies expected from its current owner/session view,
    // never from a draft or received quote request. This is a freshness and
    // cross-field fence, not a substitute for authenticating that network view.
    if(!exact(expected,['month','ownerIndex','outsideCash','ownerServiceClaims','profiles','services']))throw Error('Current owner snapshot fence required');
    const {statement:s,ownerIndex:owner,demand}=input;
    P.validate(s,{month:expected.month,profiles:expected.profiles,services:expected.services});
    integer(input.outsideCash,'outside settlement cash');
    if(![0,1].includes(owner)||typeof demand!=='number'||!Number.isFinite(demand)||demand<0||demand>3)throw Error('Invalid company forecast owner or demand');
    if(!Array.isArray(input.ownerServiceClaims)||input.ownerServiceClaims.length!==6||!Array.isArray(input.ownerDelivery)||input.ownerDelivery.length!==6)throw Error('Six owner claim and delivery rows required');
    if(owner!==expected.ownerIndex||input.outsideCash!==expected.outsideCash||!Array.isArray(expected.ownerServiceClaims)||expected.ownerServiceClaims.length!==6||input.ownerServiceClaims.some((n,i)=>n!==expected.ownerServiceClaims[i]))throw Error('Company forecast disagrees with current owner snapshot');
    const companies=s.world.companies,month=integer(s.world.month+1,'month');
    for(const [i,c]of companies.entries()){
      integer(input.ownerServiceClaims[i],'owner service claim');
      if(input.ownerServiceClaims[i]>c.bankServicePayables||c.resolution&&input.ownerServiceClaims[i])throw Error('Owner service claim exceeds public total');
      const delivered=input.ownerDelivery[i];
      if(typeof delivered!=='boolean'||s.services[i].provider!==owner&&delivered!==s.services[i].served||c.resolution&&delivered)throw Error('Forecast cannot change rival delivery or reopen a company');
    }
    const requests=companies.map(c=>c.resolution?0:Math.round(12*c.baseFee*Math.max(.5,Math.min(1.5,1+sensitivity[c.clientIndex]*(demand-1)))));
    const sales=split(input.outsideCash,requests,month),rows=[];
    for(const [i,c]of companies.entries()){
      const row={companyId:c.id,month,openingClaim:input.ownerServiceClaims[i],billed:0,cash:0,receivable:0,recoveredBeforeLoans:0,remainingClaim:0,salesRequested:requests[i],sales:sales[i],cashAfterService:0,operatingCost:0,externalInterest:0,externalPrincipalDue:0};
      if(c.resolution){rows.push(row);continue;}
      let cash=sum([c.book.accounts.cash,sales[i]]);
      const oldBank=[0,0];oldBank[owner]=row.openingClaim;oldBank[1-owner]=c.bankServicePayables-row.openingClaim;
      const old=split(cash,[c.supplierPayables,...oldBank],month);
      cash-=sum(old);row.recoveredBeforeLoans=old[1+owner];
      cash-=Math.min(cash,c.externalInterestArrears);
      row.operatingCost=Math.round(5*c.baseFee*(1+requests[i]/(12*c.baseFee)));
      cash-=Math.min(cash,row.operatingCost);
      row.externalInterest=Math.round(c.externalDebt*.005);cash-=Math.min(cash,row.externalInterest);
      row.externalPrincipalDue=Math.min(c.externalDebt,sum([c.principalDue,c.externalPrincipalArrears]));cash-=Math.min(cash,row.externalPrincipalDue);
      const service=s.services[i],delivered=service.provider===owner?input.ownerDelivery[i]:service.served;
      const due=delivered?service.fee:0,paid=Math.min(cash,due);cash-=paid;
      if(service.provider===owner){row.billed=due;row.cash=paid;row.receivable=due-paid;}
      row.remainingClaim=sum([row.openingClaim-row.recoveredBeforeLoans,row.receivable]);
      row.cashAfterService=cash;rows.push(row);
    }
    const totals=Object.fromEntries(['billed','cash','receivable','recoveredBeforeLoans','remainingClaim'].map(key=>[key,sum(rows.map(row=>row[key]))]));
    return {version:1,month,ownerIndex:owner,stage:'before-living-loan-service',rows,totals,
      uncertainty:{additionalRecovery:{min:0,max:totals.remainingClaim},writeoff:{min:0,max:totals.remainingClaim},jointClaimLimit:totals.remainingClaim},
      assumptions:['Current public signed services and current demand are held fixed. Only your own delivery can change.',
        'Sales draw once from the supplied public outside settlement cash; no supplier receipts are recycled into this sales pass.',
        'Cash and receivables above describe the service stage before private loan servicing and liquidation.',
        'Later recoveries and write-offs share the same remaining claim; their maxima cannot both be realized.',
        'This quote neither reads nor synthesizes rival loan contracts, private terms, staffing or sealed offers.']};
  }
  return Object.freeze({quote});
};
