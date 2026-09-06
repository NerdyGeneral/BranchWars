const CREDIT_TERMS={mortgage:120,middleMarket:48,consumer:24};
let creditWorld=null,creditBypass=false;
function creditTerms(p,g){
 const product=p.products.credit,option=PRODUCT_PORTFOLIOS.credit.options[product];
 return {product,remaining:CREDIT_TERMS[product],rate:Math.round(.0047*(.8+(g&&g.economy?g.economy.rate:3.75)/12)*option.spread*1000000),risk:Math.max(1,Math.round(option.credit*{conservative:.55,balanced:1,growth:1.45}[p.policies.lending]*10000*(p.creditPerformance?originationCreditGuard(p):1))),...(p.creditPerformance?{late:[0,0,0],seasoning:2}:{})};
}
function compactCredit(p){
 const grouped=new Map();
 for(const c of p.creditBook.cohorts){if(!c.principal)continue;const key=[c.market,c.product,c.remaining,c.rate,c.risk,...(p.creditPerformance?[c.seasoning]:[])].join('|');if(grouped.has(key)){const held=grouped.get(key);held.principal+=c.principal;if(c.late)c.late.forEach((n,i)=>held.late[i]+=n)}else grouped.set(key,{...c,...(c.late?{late:[...c.late]}:{})})}
 p.creditBook.cohorts=[...grouped.values()];
}
function takeCredit(p,market,amount){
 const rows=p.creditBook.cohorts.filter(c=>c.market===market),parts=marketSplit(amount,Object.fromEntries(rows.map((c,i)=>[i,c.principal]))),taken=[];
 for(const [i,n]of Object.entries(parts)){if(n){const c=rows[i],moved={...c,principal:n};if(c.late){const parts=marketSplit(n,{current:performingCredit(c),early:c.late[0],late:c.late[1],nonperforming:c.late[2]});moved.late=[parts.early,parts.late,parts.nonperforming];c.late=c.late.map((v,j)=>v-moved.late[j])}taken.push(moved);c.principal-=n}}
 compactCredit(p);return taken;
}
function reconcileCredit(p){
 if(!p.creditBook||creditBypass)return;
 for(const [market,book]of Object.entries(p.marketBook.markets)){
  const held=p.creditBook.cohorts.filter(c=>c.market===market).reduce((n,c)=>n+c.principal,0),difference=book.loans-held;
  if(difference>0)p.creditBook.cohorts.push({market,principal:difference,...creditTerms(p,creditWorld||marketContext)});
  else if(difference<0)takeCredit(p,market,-difference);
 }
 compactCredit(p);
}
const creditSync=syncAccounts;
syncAccounts=function(p){creditSync(p);reconcileCredit(p)};
function initializeCreditBooks(g,o){
 if(!g.marketEconomy||o.creditLifecycleVersion===0)return g;
 g.creditLifecycleVersion=1;
 for(const p of g.players){
  p.creditBook={version:1,cohorts:[]};
  for(const [market,m]of Object.entries(p.marketBook.markets)){
   const terms=creditTerms(p,g),parts=marketSplit(m.loans,{12:1,24:1,36:1,48:1});
   for(const [remaining,principal]of Object.entries(parts))p.creditBook.cohorts.push({market,principal,...terms,remaining:Number(remaining)});
  }
 }
 return g;
}
function creditSummary(p){
 if(!p.creditBook)return null;
 const c=p.creditBook.cohorts,principal=c.reduce((n,x)=>n+x.principal,0);
 return {...(p.creditPerformance?{late:collectionsReview(p).late}:{}),principal,nextPrincipal:c.reduce((n,x)=>n+Math.ceil(performingCredit(x)/x.remaining),0),monthlyInterest:Math.round(c.reduce((n,x)=>n+performingCredit(x)*x.rate/1000000,0)),weightedMonths:principal?c.reduce((n,x)=>n+x.principal*x.remaining,0)/principal:0,products:Object.fromEntries(Object.keys(CREDIT_TERMS).map(k=>[k,c.filter(x=>x.product===k).reduce((n,x)=>n+x.principal,0)]))};
}
function repayCredit(p){
 let total=0;
 for(const c of p.creditBook.cohorts){const n=Math.ceil(performingCredit(c)/c.remaining);c.principal-=n;c.remaining=p.creditPerformance?Math.max(1,c.remaining-1):c.remaining-1;p.marketBook.markets[c.market].loans-=n;total+=n}
 compactCredit(p);
 if(total){p.accounting=AccountingPrototype.transact(p.accounting,'repayLoan',total);syncAccounts(p)}
 return total;
}


// Transfer the seller's actual remaining terms, then reconcile any separate funding sales.



function validateCreditSave(g){
 if(g.creditLifecycleVersion===undefined){if(g.players.some(p=>p.creditBook))throw Error('Unversioned credit lifecycle');return g}
 if(g.creditLifecycleVersion!==1||g.marketEconomyVersion!==1)throw Error('Unsupported credit lifecycle save');
 for(const p of g.players){
  const b=p.creditBook;
  if(!b||b.version!==1||!Array.isArray(b.cohorts)||b.cohorts.length>10000)throw Error('Invalid credit cohorts');
  for(const c of b.cohorts)if(!c||!p.marketBook.markets[c.market]||!CREDIT_TERMS[c.product]||!Number.isSafeInteger(c.principal)||c.principal<=0||!Number.isInteger(c.remaining)||c.remaining<1||c.remaining>120||!Number.isInteger(c.rate)||c.rate<0||c.rate>100000||!Number.isInteger(c.risk)||c.risk<1||c.risk>50000)throw Error('Invalid credit terms');
  for(const [k,m]of Object.entries(p.marketBook.markets))if(b.cohorts.filter(c=>c.market===k).reduce((n,c)=>n+c.principal,0)!==m.loans)throw Error('Credit cohorts disagree with local loans');
 }
 return g;
}

// Funding covenants v1: explicit resolution bridge, never a hidden balancing plug.
