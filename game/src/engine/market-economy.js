const MARKET_RESOURCES=['deposits','customers','business','merchant','wealth'];
let marketContext=null,marketTarget=null,marketBypass=false;
function withMarket(g,fn){const old=marketContext;marketContext=g;try{return fn()}finally{marketContext=old}}
function marketSplit(amount,weights){
 const keys=Object.keys(weights),total=keys.reduce((n,k)=>n+Math.max(0,weights[k]),0),out=Object.fromEntries(keys.map(k=>[k,0]));
 if(!total||!amount)return out;
 let left=amount;for(const k of keys){out[k]=Math.floor(amount*Math.max(0,weights[k])/total);left-=out[k]}
 for(const k of keys.filter(k=>weights[k]>0)){if(!left)break;out[k]++;left--}return out;
}
function marketReach(p,key){const service=p.regionalOperations.markets[key].service;return p.branches[key]>0?Math.min(1,.4+p.branches[key]*.2+service*.1+strategyLevel(p,'digital')*.03):.02+strategyLevel(p,'digital')*.015}
function marketSupply(g,p){
 const out={};for(const r of MARKET_RESOURCES){out[r]={};for(const [key,m]of Object.entries(g.marketEconomy.markets)){
  const available=m.community[r]+m.union[r],quota=p.marketQuota&&p.marketQuota[r]&&p.marketQuota[r][key];
  out[r][key]=Math.min(available,quota===undefined?Math.floor(available*.05*marketReach(p,key)):quota);
 }}return out;
}
function marketAvailable(p,r){return p.marketSupply?Object.values(p.marketSupply[r]||{}).reduce((a,b)=>a+b,0):Infinity}
function moveOutside(p,r,requested,target=null,limited=false){
 const g=marketContext;if(!g||!g.marketEconomy)throw Error('Missing market transaction context');
 const positive=requested>0,keys=Object.keys(p.marketBook.markets).filter(k=>!target||k===target),weights={};
 for(const k of keys){const m=g.marketEconomy.markets[k],available=positive?m.community[r]+m.union[r]:(r==='deposits'?withdrawableDeposits(p,k):p.marketBook.markets[k][r]);
  weights[k]=positive&&limited?Math.min(available,(p.marketSupply&&p.marketSupply[r][k])||0):available}
 const amount=Math.min(Math.abs(Math.round(requested)),Object.values(weights).reduce((a,b)=>a+b,0)),parts=marketSplit(amount,weights);
 for(const [k,n]of Object.entries(parts)){if(!n)continue;const m=g.marketEconomy.markets[k],outside=positive?marketSplit(n,{community:m.community[r],union:m.union[r]}):marketSplit(n,{community:3,union:2});
  if(r==='customers')moveOutsideHouseholds(p,k,outside,positive,limited);
  for(const institution of ['community','union'])m[institution][r]+=positive?-outside[institution]:outside[institution];
  p.marketBook.markets[k][r]+=positive?n:-n;
  if(positive&&limited&&p.marketQuota&&p.marketQuota[r])p.marketQuota[r][k]=Math.max(0,p.marketQuota[r][k]-n);
 }
 return positive?amount:-amount;
}
const marketDelta=delta;
delta=function(p,k,n){
 if(!p.marketBook||!p.accounting||marketBypass||!MARKET_RESOURCES.includes(k))return marketDelta(p,k,n);
 if(accountingSuppressed)return;
 n=moveOutside(p,k,n,marketTarget,accountingSource==='operate'&&n>0);
 return marketDelta(p,k,n);
};
const marketSync=syncAccounts;
syncAccounts=function(p){
 marketSync(p);if(!p.marketBook||marketBypass)return;
 const rows=p.marketBook.markets,total=Object.values(rows).reduce((n,m)=>n+m.loans,0),difference=p.stats.loans-total;
 if(!difference)return;
 const weights=Object.fromEntries(Object.keys(rows).map(k=>[k,difference<0?rows[k].loans:(marketTarget?k===marketTarget?1:0:1+(p.branches[k]||0)*4)]));
 for(const [k,n]of Object.entries(marketSplit(Math.abs(difference),weights)))rows[k].loans+=difference>0?n:-n;
};
function transferMarket(g,from,to,key,resource,requested){
 const n=Math.min(Math.max(0,Math.round(requested)),(resource==='deposits'?withdrawableDeposits(from,key):from.marketBook.markets[key][resource]));if(!n)return 0;
 const sensitive=resource==='deposits'?Math.min(from.stats.rateSensitiveDeposits||0,Math.round(n*(from.stats.rateSensitiveDeposits||0)/Math.max(1,from.stats.deposits))):0;
 const old=marketBypass;marketBypass=true;try{marketDelta(from,resource,-n);marketDelta(to,resource,n);if(sensitive){marketDelta(from,'rateSensitiveDeposits',-sensitive);marketDelta(to,'rateSensitiveDeposits',sensitive)}}finally{marketBypass=old}
 if(resource==='customers')transferHouseholds(from,to,key,n);
 from.marketBook.markets[key][resource]-=n;to.marketBook.markets[key][resource]+=n;return n;
}
function initializeMarketBooks(g,o){
 if(g.regionalEconomyVersion!==1||o.marketEconomyVersion===0)return g;
 g.marketEconomyVersion=1;g.marketEconomy={version:1,markets:{}};
 for(const p of g.players){
  const weights=Object.fromEntries(Object.keys(g.territories).map(k=>[k,k===p.focus?5:1]));
  p.marketBook={version:1,markets:Object.fromEntries(Object.keys(weights).map(k=>[k,{}]))};
  for(const r of [...MARKET_RESOURCES,'loans'])for(const [k,n]of Object.entries(marketSplit(p.stats[r],weights)))p.marketBook.markets[k][r]=n;
 }
 for(const key of Object.keys(g.territories)){
  const community={deposits:12000000,customers:2000,business:100,merchant:100,wealth:30},union={deposits:8000000,customers:2500,business:40,merchant:40,wealth:15};
  g.marketEconomy.markets[key]={community,union,total:Object.fromEntries(MARKET_RESOURCES.map(r=>[r,community[r]+union[r]+g.players.reduce((n,p)=>n+p.marketBook.markets[key][r],0)]))};
 }
 return g;
}
function marketContribution(p){
 const r=p.operatingReport,books=p.marketBook.markets,metrics=regionalBranchMetrics(p),rows=Object.fromEntries(Object.keys(books).map(k=>[k,{income:0,funding:0,credit:0,facility:0,contribution:0}]));
 const allocate=(amount,weights,field)=>{for(const [k,n]of Object.entries(marketSplit(Math.round(amount),weights)))rows[k][field]+=n};
 const weights=r=>Object.fromEntries(Object.entries(books).map(([k,b])=>[k,b[r]]));
 allocate(r.depositIncome,weights('deposits'),'income');allocate(r.loanIncome,weights('loans'),'income');
 allocate(r.commercialIncome,Object.fromEntries(Object.entries(books).map(([k,b])=>[k,b.business*760+b.merchant*650])),'income');
 allocate(r.fundingCost,weights('deposits'),'funding');allocate(r.chargeoff,weights('loans'),'credit');
 const efficiency=(r.expense-(r.depositServiceCost||0))/Math.max(1,p.stats.staff*18000+metrics.expense);
 for(const m of metrics.rows)rows[m.key].facility=Math.round(m.expense*efficiency);
 for(const row of Object.values(rows))row.contribution=row.income-row.funding-row.credit-row.facility;
 const total=Object.values(rows).reduce((n,row)=>n+row.contribution,0);
 return {cycle:r.cycle,rows,central:r.profit-total,profit:r.profit};
}
function marketOpportunityScore(g,p,o){
 if(!g.marketEconomy)return opportunityPower(p,o);
 const m=g.marketEconomy.markets[o.market],available=o.type==='loan'?o.value:Math.min(o.value,m.community.deposits+m.union.deposits);
 return opportunityPower(p,o)+available/250000-(p.branches[o.market]?0:(REGIONAL_MARKETS[o.market].entry*2));
}

function settleMonthlyProduction(g,p,preview=false){
 if(!p.marketBook)return postMonthlyOperations(g,p,preview);
 const availableWorld=g.marketEconomy?g:marketContext&&marketContext.marketEconomy?{...g,marketEconomy:marketContext.marketEconomy}:{...g,marketEconomy:p.marketSnapshot};
 const world=preview?{...availableWorld,marketEconomy:JSON.parse(JSON.stringify(availableWorld.marketEconomy||null))}:availableWorld;
 if(!world.marketEconomy)throw Error('Market preview has no supply snapshot');
 return withMarket(world,()=>{
  p.marketSupply=marketSupply(world,p);
  const before=Object.fromEntries(MARKET_RESOURCES.filter(k=>k!=='deposits').map(k=>[k,p.stats[k]]));
  const result=postMonthlyOperations(g,p,preview);
  // The accounting adapter copies nonfinancial calculation results; settle those against real franchises.
  const old=accountingSource;accountingSource='operate';
  try{for(const r of Object.keys(before)){const change=p.stats[r]-before[r];p.stats[r]=before[r];delta(p,r,change)}}finally{accountingSource=old}
  p.marketReport=marketContribution(p);
  return result;
 });
}
const marketOpportunity=awardOpportunity;
awardOpportunity=function(p,o){
 if(!p.marketBook)return marketOpportunity(p,o);
 const old=marketTarget;marketTarget=o.market;try{
  const m=marketContext.marketEconomy.markets[o.market];
  if(o.type!=='loan')o={...o,value:Math.min(o.value,m.community.deposits+m.union.deposits)};
  if(o.type!=='loan'&&o.value===0){p.marketOpportunityUnavailable=true;return}
  return marketOpportunity(p,o);
 }finally{marketTarget=old}
};
const marketAcquisition=acquisitionTerms;
acquisitionTerms=function(g,p,target){
 const terms=marketAcquisition(g,p,target);if(!g.marketEconomy)return terms;
 const book=g.players[terms.seller].marketBook.markets[target];
 return {...terms,depositTake:Math.min(terms.depositTake,book.deposits),loanTake:Math.min(terms.loanTake,book.loans),customerTake:Math.min(terms.customerTake,book.customers)};
};


const marketCompetition=depositContest;
depositContest=function(g){
 if(!g.marketEconomy)return marketCompetition(g);
 return withMarket(g,()=>{
  const lines=[],outsideLoss=[0,0];for(const [key,t]of activeTerritories(g)){
   const edge=depositPull(g.players[0],key,t)-depositPull(g.players[1],key,t),win=edge>0?0:1,lose=1-win;
   if(Math.abs(edge)>=.5){
    const from=g.players[lose],to=g.players[win],request=Math.min(from.marketBook.markets[key].deposits*.025,Math.abs(edge)*t.value*3500);
    const n=transferMarket(g,from,to,key,'deposits',request);
    if(n){transferMarket(g,from,to,key,'customers',Math.round(n/9000));lines.push(to.name+' won $'+n.toLocaleString()+' of existing deposits from '+from.name+' in '+t.name+'.')}
   }
   const m=g.marketEconomy.markets[key],outsideShare=(m.community.deposits+m.union.deposits)/m.total.deposits,defense=outsideShare<.4?14:outsideShare<.65?11:8;
   for(const p of g.players){
    const gap=defense-depositPull(p,key,t);if(gap<=0)continue;
    const loss=Math.round(p.marketBook.markets[key].deposits*Math.min(.012,gap*.001));if(!loss)continue;
    const old=marketTarget;marketTarget=key;try{delta(p,'deposits',-loss);delta(p,'customers',-Math.round(loss/12000))}finally{marketTarget=old}
    outsideLoss[g.players.indexOf(p)]+=loss;
   }
  }
  for(const [i,p]of g.players.entries()){p.stats.rateSensitiveDeposits=Math.min(p.stats.rateSensitiveDeposits,p.stats.deposits);if(outsideLoss[i])lines.push('Community banks and credit unions won back $'+outsideLoss[i].toLocaleString()+' of local deposits from '+p.name+'. Their defense intensifies as outside ownership falls.');}
  return {lines,outflow:[0,0]};
 });
};
const marketOpportunities=resolveOpportunities;
resolveOpportunities=function(g,plans){
 if(!g.marketEconomy)return marketOpportunities(g,plans);
 const lines=withMarket(g,()=>marketOpportunities(g,plans));
 for(const p of g.players)if(p.marketOpportunityUnavailable){for(let i=0;i<lines.length;i++)if(lines[i].startsWith(p.name+' '))lines[i]=p.name+' found the selected local deposit book exhausted; no opportunity reward was issued.';delete p.marketOpportunityUnavailable}
 return lines;
};
const marketActions=resolveCompetitiveActions;
resolveCompetitiveActions=function(g,plans){
 if(!g.marketEconomy)return marketActions(g,plans);
 // Keep talent and deposit-policy mechanics. Settle commercial raids as capped, local transfers.
 const amended=plans.map(x=>x.competitiveAction==='commercialRaid'?{...x,competitiveAction:'none'}:x);
 const lines=marketActions(g,amended);
 for(let i=0;i<2;i++)if(plans[i].competitiveAction==='commercialRaid'){
  const p=g.players[i],rival=g.players[1-i],key=plans[i].focus,factor=plans[1-i].competitiveAction==='relationshipDefense'?(rival.turnEffects.relationshipDefense||.25):1;
  delta(p,'cash',-COMPETITIVE_ACTIONS.commercialRaid.cost);delta(p,'attention',2);p.lastCompetitiveAction='commercialRaid';
  const moved={};for(const [r,n]of Object.entries({business:4+strategyLevel(p,'commercial')*.8,merchant:4+strategyLevel(p,'commercial')*.6,customers:55+strategyLevel(p,'commercial')*12}))moved[r]=transferMarket(g,rival,p,key,r,Math.round(n*factor));
  lines.push(p.name+' transferred '+moved.business+' business, '+moved.merchant+' merchant and '+moved.customers+' household relationships from '+rival.name+' in '+g.territories[key].name+'.');
 }
 return lines;
};





function validateMarketSave(g){
 if(g.marketEconomyVersion===undefined){if(g.marketEconomy||g.players.some(p=>p.marketBook))throw Error('Unversioned market economy');return g}
 if(g.marketEconomyVersion!==1||g.regionalEconomyVersion!==1||!g.marketEconomy||g.marketEconomy.version!==1)throw Error('Unsupported market economy save');
 const uint=n=>Number.isSafeInteger(n)&&n>=0,keys=Object.keys(g.territories);
 if(Object.keys(g.marketEconomy.markets||{}).length!==keys.length)throw Error('Invalid market pools');
 for(const p of g.players){
  if(!p.marketBook||p.marketBook.version!==1||Object.keys(p.marketBook.markets||{}).length!==keys.length)throw Error('Invalid market book');
  if(p.marketQuota||p.marketSupply)throw Error('Transient market quotas cannot be imported');
  if(p.marketReport){const r=p.marketReport;if(!r.rows||Object.keys(r.rows).length!==keys.length||!Number.isInteger(r.cycle)||r.cycle<1||r.cycle>g.cycle||!Number.isSafeInteger(r.central)||r.profit!==p.operatingReport.profit)throw Error('Invalid regional contribution report');
   for(const k of keys){const row=r.rows[k];if(!row||!['income','funding','credit','facility'].every(f=>uint(row[f]))||!Number.isSafeInteger(row.contribution)||row.contribution!==row.income-row.funding-row.credit-row.facility)throw Error('Invalid regional contribution row')}
   if(keys.reduce((n,k)=>n+r.rows[k].contribution,0)+r.central!==r.profit)throw Error('Regional contribution does not reconcile');
  }
  for(const r of [...MARKET_RESOURCES,'loans']){
   if(!keys.every(k=>p.marketBook.markets[k]&&uint(p.marketBook.markets[k][r])))throw Error('Invalid market balance');
   if(keys.reduce((n,k)=>n+p.marketBook.markets[k][r],0)!==p.stats[r])throw Error('Market balances disagree with bank totals');
  }
 }
 for(const k of keys){const m=g.marketEconomy.markets[k];if(!m)throw Error('Missing market pool');
  for(const r of MARKET_RESOURCES)if(!m.community||!m.union||!m.total||![m.community[r],m.union[r],m.total[r]].every(uint)||m.community[r]+m.union[r]+g.players.reduce((n,p)=>n+p.marketBook.markets[k][r],0)!==m.total[r])throw Error('Market franchise conservation failed');
 }
 return g;
}
// Credit lifecycle v1: fixed origination terms, scheduled principal, local book reconciliation.
