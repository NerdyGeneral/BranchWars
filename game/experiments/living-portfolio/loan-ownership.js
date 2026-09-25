'use strict';

// Isolated full-contract ownership adapter. Canonical loan records are the only
// retained positions. Bank-accounting attributions below exist only for a call.
module.exports=function createLoanOwnership({accounting:A,loans:L}){
  const clone=x=>JSON.parse(JSON.stringify(x));
  const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
  const sum=values=>values.reduce((a,b)=>{const n=a+b;if(!Number.isSafeInteger(n))throw Error('Unsafe ownership total');return n;},0);
  function transfer(input){
    if(!exact(input,['contracts','institutions','trades'])||!Array.isArray(input.contracts)||input.contracts.length>20000||!Array.isArray(input.institutions)||input.institutions.length!==2||!Array.isArray(input.trades)||input.trades.length>20000)throw Error('Invalid ownership boundary');
    const owned=new Map();for(const c of input.contracts){L.validateContract(c);if(owned.has(c.id))throw Error('Duplicate canonical loan');owned.set(c.id,c);}
    const ids=new Set(),attributed=input.institutions.map(b=>{
      if(!exact(b,['id','book','legacyPrincipal','otherReceivables','protectedCash'])||ids.has(b.id)||!Number.isSafeInteger(b.protectedCash)||b.protectedCash<0)throw Error('Invalid ownership institution');ids.add(b.id);
      const positions=input.contracts.filter(c=>c.bankId===b.id).map(c=>({contractId:c.id,borrowerId:c.borrowerId,principal:c.principal,recognizedInterest:c.servicing.interestDue,basisAdjustment:c.basisAdjustment}));
      const {protectedCash,...bookAttribution}=clone(b),result={...bookAttribution,positions};A.institution(result);return result;
    });
    if(input.contracts.some(c=>!ids.has(c.bankId)))throw Error('Canonical owner is missing');
    // The purchase price and inherited undrawn commitments both need real
    // opening liquidity. Same-pass sales cannot release these reservations.
    for(const b of attributed){
      const buying=input.trades.filter(t=>t.buyerId===b.id);if(!buying.length)continue;
      const existing=sum(input.contracts.filter(c=>c.bankId===b.id).map(c=>c.undrawn));
      const newCommitments=sum(buying.map(t=>owned.get(t.contractId)?.undrawn||0));
      const prices=buying.map(t=>{if(!Number.isSafeInteger(t.price)||t.price<0)throw Error('Invalid ownership price');return t.price;});
      const protectedCash=input.institutions.find(x=>x.id===b.id).protectedCash;
      if(sum([protectedCash,existing,newCommitments,...prices])>b.book.accounts.cash)throw Error('Acquired loan commitments exceed protected opening liquidity');
    }
    const result=A.acquireLoansBatch(attributed,input.trades),contracts=clone(input.contracts),byId=new Map(contracts.map(c=>[c.id,c]));
    for(const posting of result.postings){const c=byId.get(posting.contractId);c.bankId=posting.buyerId;c.basisAdjustment=posting.basisAdjustment;L.validateContract(c);}
    for(const b of result.banks){
      const actual=contracts.filter(c=>c.bankId===b.id);
      if(actual.length>10000||actual.length!==b.positions.length)throw Error('Transferred contract limit exceeded');
      const lookup=new Map(actual.map(c=>[c.id,c]));
      for(const p of b.positions){const c=lookup.get(p.contractId);if(!c||c.principal!==p.principal||c.servicing.interestDue!==p.recognizedInterest||c.basisAdjustment!==p.basisAdjustment)throw Error('Transferred canonical claim disagrees');}
    }
    contracts.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
    return {contracts,institutions:result.banks.map(({positions,...b})=>({...b,protectedCash:input.institutions.find(x=>x.id===b.id).protectedCash})),postings:result.postings};
  }
  return Object.freeze({transfer,limitations:Object.freeze(['Host-private, isolated full-loan transfers only; no public loan terms or bank books.','Not wired into acquisition, fire-sale, company-world validation or live game rules.','Canonical originator, original terms, borrower obligations and collateral never change on sale.','Explicit protectedCash plus existing/acquired undrawn commitments reserve opening cash; the engine must supply its authoritative treasury policy, and minimum-capital policy is still pending.','Institution otherReceivables must include all non-contract receivables, including corporate service-fee claims; CompanyFinance has separate fee attribution that its adapter must reconcile.','No participation splits, fees, external buyer, allowance system or statutory-resolution authority.'])});
};
