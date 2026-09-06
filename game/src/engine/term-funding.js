function validateTermPolicy(policy){
 if(!policy||!['off','six'].includes(policy.offer)||!['release','renew'].includes(policy.maturity))throw Error('Invalid term funding policy');
}
function withdrawableDeposits(p,market){
 const balance=p.marketBook.markets[market].deposits;
 return p.termFunding?Math.max(0,balance-p.depositBook.cohorts.filter(c=>c.market===market&&c.locked).reduce((n,c)=>n+c.principal,0)):balance;
}
function termSummary(p){
 if(!p.termFunding)return null;
 const rows=p.depositBook.cohorts.filter(c=>c.locked);
 return {locked:rows.reduce((n,c)=>n+c.principal,0),maturing:rows.filter(c=>c.remaining===1).reduce((n,c)=>n+c.principal,0),interest:Math.round(rows.reduce((n,c)=>n+c.principal*c.rate/1000000,0))};
}
function initializeTermFunding(g,o){
 if(!g.depositProductsVersion||o.termFundingVersion===0)return g;
 g.termFundingVersion=1;for(const p of g.players)p.termFunding={version:1,policy:{offer:'off',maturity:'release'}};
 return g;
}

function prepareTermFunding(g,p,preview=false){
 if(!p.termFunding)return null;
 const cycle=g.cycle||p.depositBook.asOfCycle+1,policy=p.termFunding.policy;
 validateTermPolicy(policy);
 const rate=Math.round(depositRate(p,g,'highYield')*1.25);
 const departed=settleDepartedTermDeposits(g,p,preview);
 let released=0,renewed=0,opened=0;
 for(const c of p.depositBook.cohorts){
  if(!c.locked)continue;
  if(c.quotedCycle<cycle)c.remaining--;
  if(c.remaining===0){
   c.quotedCycle=cycle;
   if(policy.maturity==='renew'){c.remaining=6;c.rate=rate;renewed+=c.principal}
   else{delete c.locked;c.product=p.productPrograms?productProgramFallback(p,c.market,c.segment):p.products.retail;c.remaining=c.product==='highYield'?6:0;c.rate=depositRate(p,g,c.product);released+=c.principal}
  }
 }
 if(policy.offer==='six'){
  const eligible=p.depositBook.cohorts.filter(c=>!c.locked&&c.remaining===0&&c.quotedCycle<cycle);
  const available=eligible.reduce((n,c)=>n+c.principal,0);
  const amount=Math.min(Math.floor(available*.1),Math.max(0,Math.floor(p.stats.deposits*.3)-termSummary(p).locked));
  const parts=marketSplit(amount,Object.fromEntries(eligible.map((c,i)=>[i,c.principal])));
  for(const [i,n]of Object.entries(parts))if(n){const c=eligible[i];c.principal-=n;p.depositBook.cohorts.push({...c,principal:n,product:'highYield',locked:true,remaining:6,quotedCycle:cycle,rate});opened+=n}
 }
 compactDeposits(p);
 return {opened,renewed,released,...(p.segmentDeposits?{departed}:{})};
}

function planTermFunding(g,index,plan){
 const p=g.players[index];
 if(p.termFunding)plan.termPolicy={offer:p.stats.lastProfit>0&&p.policies.deposit!=='margin'?'six':'off',maturity:p.stats.lastProfit>0?'renew':'release'};
 return plan
}

function validateTermSave(g){
 if(g.termFundingVersion===undefined){if(g.players.some(p=>p.termFunding||p.depositBook&&p.depositBook.cohorts.some(c=>c.locked!==undefined)))throw Error('Unversioned term funding');return g}
 if(g.termFundingVersion!==1||g.depositProductsVersion!==1)throw Error('Unsupported term funding save');
 for(const p of g.players){
  if(!p.termFunding||p.termFunding.version!==1)throw Error('Invalid term funding state');
  validateTermPolicy(p.termFunding.policy);
  for(const c of p.depositBook.cohorts)if(c.locked!==undefined&&(c.locked!==true||c.product!=='highYield'||c.remaining<1))throw Error('Invalid locked deposit');
  if(p.submitted)validateTermPolicy(p.submitted.termPolicy);
 }
 return g;
}
// Retail lifecycle v1: concurrent offers; legacy portfolios are serviced, not rewritten.
