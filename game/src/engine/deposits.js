let depositWorld=null,depositBypass=false;
const DEPOSIT_SERVICE={essential:{fee:6,cost:12},rewards:{fee:12,cost:20},highYield:{fee:0,cost:8}};
function depositRate(p,g,product){
 const option=PRODUCT_PORTFOLIOS.retail.options[product];
 return Math.round((g.economy.rate/2400)*{margin:.5,balanced:.8,aggressive:1.2}[p.policies.deposit]*option.funding*((typeof p.doctrine==='object'?p.doctrine.key:p.doctrine)==='community'?.9:1)*1000000);
}
function compactDeposits(p){
 const grouped=new Map();
 for(const c of p.depositBook.cohorts){if(!c.principal)continue;const k=[c.market,c.product,c.remaining,c.rate,c.quotedCycle,!!c.locked,c.segment||''].join('|');if(grouped.has(k)){grouped.get(k).principal+=c.principal;if(p.segmentDeposits)grouped.get(k).exiting+=c.exiting;}else grouped.set(k,{...c})}
 p.depositBook.cohorts=[...grouped.values()];
}
function takeDeposits(p,market,amount,includeLocked=false,segment=null){
 const rows=p.depositBook.cohorts.filter(c=>c.market===market&&(includeLocked||!c.locked)&&(!segment||c.segment===segment)),parts=marketSplit(amount,Object.fromEntries(rows.map((c,i)=>[i,c.principal]))),taken=[];
 for(const [i,n]of Object.entries(parts))if(n){const c=rows[i],exiting=p.segmentDeposits?Math.floor(c.exiting*n/c.principal):0;taken.push({...c,principal:n,...(p.segmentDeposits?{exiting}:{})});c.principal-=n;if(p.segmentDeposits)c.exiting-=exiting}
 compactDeposits(p);return taken;
}
function reconcileDeposits(p){
 if(!p.depositBook||depositBypass)return;
 const g=depositWorld||marketContext||{economy:{rate:3.75}};
 for(const [market,m]of Object.entries(p.marketBook.markets)){
  const held=p.depositBook.cohorts.filter(c=>c.market===market).reduce((n,c)=>n+c.principal,0),difference=m.deposits-held,product=p.products.retail;
  if(p.segmentDeposits&&difference)throw Error('Segment deposit books disagree with local balances');
  if(difference>0){const parts=p.retailLifecycle?marketSplit(difference,retailAcquisitionMix(p,g,market)):{[product]:difference};for(const [offered,n]of Object.entries(parts))if(n)p.depositBook.cohorts.push({market,product:offered,principal:n,remaining:offered==='highYield'?6:0,quotedCycle:g.cycle||p.depositBook.asOfCycle+1,rate:depositRate(p,g,offered)})}
  else if(difference<0)takeDeposits(p,market,-difference);
 }
 compactDeposits(p);
}
const depositSync=syncAccounts;
syncAccounts=function(p){depositSync(p);reconcileDeposits(p)};
function depositSummary(p,g){
 if(!p.depositBook)return null;
 if(p.segmentDeposits)return segmentDepositSummary(p,g);
 const rows=Object.fromEntries(Object.keys(DEPOSIT_SERVICE).map(k=>[k,{principal:0,interest:0,fees:0,service:0,guaranteed:0,renewing:0}]));
 if(p.termFunding)rows.term={principal:0,interest:0,fees:0,service:0,guaranteed:0,renewing:0};
 for(const c of p.depositBook.cohorts){const row=rows[c.locked?'term':c.product];row.principal+=c.principal;row.interest+=c.principal*(c.remaining>0?c.rate:depositRate(p,g,c.product))/1000000;if(c.remaining>0)row.guaranteed+=c.principal;if(c.remaining===1)row.renewing+=c.principal}
 for(const [k,r]of Object.entries(rows)){const customers=p.stats.customers*r.principal/Math.max(1,p.stats.deposits);r.fees=Math.round(customers*(DEPOSIT_SERVICE[k]||DEPOSIT_SERVICE.highYield).fee);r.service=Math.round(customers*(DEPOSIT_SERVICE[k]||DEPOSIT_SERVICE.highYield).cost+r.principal*.00006);r.interest=Math.round(r.interest);r.platform=p.retailLifecycle&&k!=='term'&&p.retailLifecycle.mix[k]>0?RETAIL_PLATFORM[k]:0;r.service+=r.platform;r.directCost=r.interest+r.service-r.fees}
 return {rows,interest:Object.values(rows).reduce((n,r)=>n+r.interest,0),fees:Object.values(rows).reduce((n,r)=>n+r.fees,0),service:Object.values(rows).reduce((n,r)=>n+r.service,0)};
}
function adjustDepositReport(p,g,r){
 if(!p.depositBook)return;
 const d=depositSummary(p,g),oldIncome=r.depositIncome,oldFunding=r.fundingCost;
 r.depositIncome=d.fees;r.fundingCost=d.interest+p.stats.emergencyDebt*.01;r.depositServiceCost=d.service;r.depositInterest=d.interest;r.retailPlatformCost=Object.values(d.rows).reduce((n,row)=>n+(row.platform||0),0);
 r.expense+=d.service;
 const change=r.depositIncome-oldIncome-(r.fundingCost-oldFunding)-d.service;
 r.eventAdjustment+=change*((p.turnEffects.profit||1)-1);r.profit=Math.round(r.profit+change*(p.turnEffects.profit||1));
}
function initializeDepositBooks(g,o){
 if(g.fundingCovenantVersion!==1||o.depositProductsVersion===0)return g;
 g.depositProductsVersion=1;
 for(const p of g.players)p.depositBook={version:1,asOfCycle:0,cohorts:Object.entries(p.marketBook.markets).map(([market,m])=>({market,product:p.products.retail,principal:m.deposits,remaining:0,quotedCycle:0,rate:depositRate(p,g,p.products.retail)}))};
 return g;
}

function repriceWithdrawableDeposits(g,p){
  for(const c of p.depositBook.cohorts){
   if(c.locked)continue;
   if(c.remaining>0&&c.quotedCycle<(g.cycle||p.depositBook.asOfCycle+1))c.remaining--;
   if(c.remaining===0){if(!p.retailLifecycle||(c.product==='highYield'&&!p.retailLifecycle.mix.highYield))c.product=p.products.retail;c.remaining=c.product==='highYield'?6:0;c.quotedCycle=g.cycle||p.depositBook.asOfCycle+1;c.rate=depositRate(p,g,c.product)}
  }
  compactDeposits(p);
}
const depositTransfer=transferMarket;
transferMarket=function(g,from,to,...args){
 if(from.segmentDeposits&&args[1]==='deposits')return transferSegmentDeposits(g,from,to,args[0],args[2]);
 const old=depositWorld;depositWorld=g;
 try{const n=depositTransfer(g,from,to,...args);reconcileDeposits(from);reconcileDeposits(to);return n}finally{depositWorld=old}
};



function validateDepositSave(g){
 if(g.depositProductsVersion===undefined){if(g.players.some(p=>p.depositBook))throw Error('Unversioned deposit products');return g}
 if(g.depositProductsVersion!==1||g.fundingCovenantVersion!==1)throw Error('Unsupported deposit products save');
 for(const p of g.players){
  const b=p.depositBook;
  if(!b||b.version!==1||!Array.isArray(b.cohorts)||b.cohorts.length>5000||!Number.isInteger(b.asOfCycle)||b.asOfCycle<0||b.asOfCycle>g.cycle)throw Error('Invalid deposit cohorts');
  for(const c of b.cohorts)if(!c||!p.marketBook.markets[c.market]||!DEPOSIT_SERVICE[c.product]||!Number.isSafeInteger(c.principal)||c.principal<=0||!Number.isInteger(c.remaining)||c.remaining<0||c.remaining>6||!Number.isInteger(c.quotedCycle)||c.quotedCycle<0||c.quotedCycle>g.cycle||!Number.isInteger(c.rate)||c.rate<0||c.rate>100000||(c.remaining>0&&c.product!=='highYield'))throw Error('Invalid deposit terms');
  for(const [k,m]of Object.entries(p.marketBook.markets))if(b.cohorts.filter(c=>c.market===k).reduce((n,c)=>n+c.principal,0)!==m.deposits)throw Error('Deposit cohorts disagree with local balances');
 }
 return g;
}

// Term funding v1: capped customer uptake, six fixed payments, no early redemption.
