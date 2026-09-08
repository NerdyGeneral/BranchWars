'use strict';
// Isolated, lossless boundary codec. Not a second asset book or a game save
// schema. Both directions validate every canonical contract. No gzip dependency,
// dropped histories, rounded money or arbitrary JSON object serialization.
function createLivingLoanCodec(Loan){
 const compare=(a,b)=>a<b?-1:a>b?1:0;
 const shape=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 function validatePortfolio(cs){
  if(!Array.isArray(cs)||cs.length>20000)throw Error('Invalid encoded portfolio size');
  const ids=new Set(),banks=new Map();for(const c of cs){Loan.validateContract(c);if(ids.has(c.id))throw Error('Duplicate contract identity');ids.add(c.id);
   banks.set(c.bankId,(banks.get(c.bankId)||0)+1);if(banks.size>2||banks.get(c.bankId)>10000)throw Error('Encoded bank capacity exceeded');}
 }
 function encode(cs){
  validatePortfolio(cs);const strings=new Set(),terms=new Map();
  for(const c of cs){for(const k of ['applicationId','bankId','borrowerId','market','sector','offerProduct'])strings.add(c[k]);if(c.collateral)strings.add(c.collateral.id);
   const t=c.originalTerms,key=JSON.stringify([t.annualRateBps,t.feeBps,t.termMonths,t.underwriting]);terms.set(key,[t.annualRateBps,t.feeBps,t.termMonths,t.underwriting]);}
  const dictionary=[...strings].sort(compare),index=new Map(dictionary.map((s,i)=>[s,i])),termKeys=[...terms.keys()].sort(compare),termIndex=new Map(termKeys.map((s,i)=>[s,i]));
  const rows=cs.slice().sort((a,b)=>compare(a.id,b.id)).map(c=>{
   const t=c.originalTerms,s=c.servicing,p=c.collateral;
   return[index.get(c.applicationId),index.get(c.bankId),index.get(c.borrowerId),index.get(c.market),index.get(c.sector),index.get(c.offerProduct),
    c.principal,c.undrawn,c.remainingMonths,c.originatedMonth,c.originalPrincipal,c.originalCommitment,
    termIndex.get(JSON.stringify([t.annualRateBps,t.feeBps,t.termMonths,t.underwriting])),
    p?[index.get(p.id),p.originalValue,p.pledgedValue,p.originationLtvBps,p.releasedMonth]:null,
    s.lastMonth,s.activityMonth,s.principalDue,s.interestDue,s.suspendedInterest,s.missedMonths,s.interestCarry];
  });
  return{version:1,dictionary,terms:termKeys.map(k=>terms.get(k)),rows};
 }
 function decode(input){
  if(!shape(input,['version','dictionary','terms','rows'])||input.version!==1)throw Error('Unsupported loan codec');
  const {dictionary,terms,rows}=input;
  if(!Array.isArray(dictionary)||dictionary.length>120010||dictionary.some(s=>typeof s!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(s))||
    dictionary.some((s,i)=>i>0&&compare(dictionary[i-1],s)>=0))throw Error('Invalid loan dictionary');
  if(!Array.isArray(terms)||terms.length>20000||!Array.isArray(rows)||rows.length>20000)throw Error('Invalid loan codec bounds');
  let previousTerm=null;for(const t of terms){
   if(!Array.isArray(t)||t.length!==4||!t.slice(0,3).every(Number.isSafeInteger)||!['conservative','balanced','growth'].includes(t[3]))throw Error('Invalid encoded terms');
   const key=JSON.stringify(t);if(previousTerm!==null&&compare(previousTerm,key)>=0)throw Error('Duplicate or noncanonical encoded terms');previousTerm=key;
  }
  const usedStrings=new Set(),usedTerms=new Set();
  function word(i){if(!Number.isSafeInteger(i)||i<0||i>=dictionary.length)throw Error('Invalid dictionary reference');usedStrings.add(i);return dictionary[i];}
  const contracts=rows.map(row=>{
   if(!Array.isArray(row)||row.length!==21||row.some((n,i)=>i!==13&&(!Number.isSafeInteger(n)||n<0)))throw Error('Invalid loan row');
   const [ai,bi,ui,mi,si,pi,principal,undrawn,remainingMonths,originatedMonth,originalPrincipal,originalCommitment,ti,p,lastMonth,activityMonth,principalDue,interestDue,suspendedInterest,missedMonths,interestCarry]=row;
   const applicationId=word(ai),bankId=word(bi),borrowerId=word(ui),market=word(mi),sector=word(si),offerProduct=word(pi);
   if(ti>=terms.length)throw Error('Invalid terms reference');usedTerms.add(ti);const t=terms[ti];
   const originalTerms=Loan.terms(offerProduct,{annualRateBps:t[0],feeBps:t[1],termMonths:t[2],underwriting:t[3]});
   if(p!==null&&(!Array.isArray(p)||p.length!==5||p.some((n,i)=>!(i===4&&n===null)&&(!Number.isSafeInteger(n)||n<0))))throw Error('Invalid encoded collateral');
   return{id:'loan:'+originatedMonth+':'+applicationId.length+':'+applicationId+':'+bankId.length+':'+bankId,applicationId,bankId,borrowerId,market,sector,
    product:Loan.catalog[offerProduct].family,offerProduct,principal,undrawn,commitment:principal+undrawn,remainingMonths,originatedMonth,originalPrincipal,originalCommitment,originalTerms,
    collateral:p?{id:word(p[0]),originalValue:p[1],pledgedValue:p[2],originationLtvBps:p[3],releasedMonth:p[4]}:null,
    servicing:{lastMonth,activityMonth,principalDue,interestDue,suspendedInterest,missedMonths,interestCarry}};
  });
  validatePortfolio(contracts);
  if(usedStrings.size!==dictionary.length||usedTerms.size!==terms.length)throw Error('Unused loan dictionary content');
  if(contracts.some((c,i)=>i>0&&compare(contracts[i-1].id,c.id)>=0))throw Error('Noncanonical loan row order');
  return contracts;
 }
 return Object.freeze({encode,decode});
}
if(typeof module!=='undefined'&&module.exports)module.exports=createLivingLoanCodec;
