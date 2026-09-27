// Expanded 9.36 holding-company shares. Ordinary bank assets and client custody
// remain separate. Outside money comes from the existing funded investor pool.
const HoldingCapital=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),enabled=x=>x?.expandedBusinessVersion===1;
 const whole=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 const RULES=Object.freeze({founderShares:100000,founderMinimumBp:5100,monthlyShares:20000,outsideMonthly:10000,parentReserve:50000,spreadBp:200,maxPriceCents:10000000});
 const cost=(shares,cents)=>Math.ceil(shares*cents/100);
 function basis(p){return p.holdingShares?.basis||0;}
 function outsideBasis(g){return g.holdingCapitalMarket?.issuers.reduce((n,i)=>n+i.outside.basis,0)||0;}
 function price(g,p,issued){const s=companyConsolidatedSummary(g,p);return Math.min(RULES.maxPriceCents,Math.max(1,Math.floor(Math.max(0,s.ownerEquity??s.equity)*100/issued)));}
 function initialize(g){
  if(!enabled(g))return;
  g.holdingCapitalMarket={version:1,month:0,issuers:g.players.map(p=>({id:p.id,issued:RULES.founderShares,founderShares:RULES.founderShares,referenceCents:price(g,p,RULES.founderShares),outside:{shares:0,basis:0}})),receipts:[]};
  for(const p of g.players)p.holdingShares={issuer:g.players.find(x=>x.id!==p.id).id,shares:0,basis:0};
 }
 function defaults(p){return {capital:{action:'none',shares:0,limitCents:1},rival:{side:'none',shares:0,limitCents:1}};}
 function reserve(p,plan){
  if(!enabled(p)||!plan?.holdingCapitalOrders)return 0;
  const {capital,rival}=plan.holdingCapitalOrders;
  let n=0;for(const [o,buy]of [[capital,capital?.action==='repurchase'],[rival,rival?.side==='buy']])if(buy){if(!whole(o.shares,RULES.monthlyShares)||!whole(o.limitCents,RULES.maxPriceCents)||!o.limitCents)throw Error('Invalid holding-company share reservation.');n+=cost(o.shares,o.limitCents);}
  return n;
 }
 function records(source){return source.holdingCapitalMarket?.issuers||source.holdingCapitalSnapshot?.issuers;}
 function capitalLimit(issuer){return Math.max(0,Math.min(RULES.monthlyShares,Math.floor(issuer.founderShares*10000/RULES.founderMinimumBp)-issuer.issued));}
 function quotes(issuer){return {issue:issuer.referenceCents,buy:Math.ceil(issuer.referenceCents*(10000+RULES.spreadBp)/10000),sell:Math.max(1,Math.floor(issuer.referenceCents*(10000-RULES.spreadBp)/10000))};}
 function protectedCash(source,p,plan){
  const without={...plan};delete without.holdingCapitalOrders;
  const q=companyShareOrderReview(p,without,source);
  return q.cash+q.protectedCash+Math.max(RULES.parentReserve,p.financialGroup.parent.accounts.payables);
 }
 function quote(source,p,plan){
  if(!enabled(p))throw Error('Holding-company shares require a new Expanded 9.36 campaign.');
  const rows=records(source),own=rows?.find(i=>i.id===p.id),rival=rows?.find(i=>i.id===p.holdingShares.issuer),policy=copy(plan.holdingCapitalOrders===undefined?defaults(p):plan.holdingCapitalOrders);
  if(!own||!rival||!exact(policy,['capital','rival']))throw Error('Current holding-company share quotes are required.');
  const a=policy.capital,b=policy.rival;
  if(!exact(a,['action','shares','limitCents'])||!['none','issue','repurchase'].includes(a.action)||!exact(b,['side','shares','limitCents'])||!['none','buy','sell'].includes(b.side))throw Error('Choose a supported holding-company share instruction.');
  for(const o of [a,b])if(!whole(o.shares,RULES.monthlyShares)||!whole(o.limitCents,RULES.maxPriceCents)||!o.limitCents)throw Error('Use whole shares and a valid price in cents.');
  if(a.action==='none'&&a.shares||b.side==='none'&&b.shares||a.action!=='none'&&!a.shares||b.side!=='none'&&!b.shares)throw Error('A share order needs a positive quantity; no order uses zero.');
  if(a.action==='issue'&&a.shares>capitalLimit(own))throw Error('Issuance is capped at 20,000 shares per month and preserves at least 51% founder control.');
  if(a.action==='repurchase'&&a.shares>own.issued-own.founderShares)throw Error('Only outstanding outside or rival shares may be repurchased; founders do not tender automatically.');
  if(b.side==='sell'&&b.shares>p.holdingShares.shares)throw Error('You cannot offer more rival holding-company shares than you own.');
  const spend=reserve(p,{holdingCapitalOrders:policy}),protectedAmount=protectedCash(source,p,plan),available=Math.max(0,p.financialGroup.parent.accounts.cash-protectedAmount);
  if(spend>available)throw Error('Share purchases exceed unreserved parent cash. Protect other Group commitments and the $50,000 parent reserve; unsettled issuance or sales cannot fund purchases.');
  if(a.action==='repurchase'&&spend>Math.max(0,p.financialGroup.parent.accounts.equity-RULES.parentReserve))throw Error('Repurchases must retain at least $50,000 of parent equity.');
  const ownPrices=quotes(own),rivalPrices=quotes(rival),ownCrosses=a.action==='issue'?a.limitCents<=ownPrices.issue:a.action==='repurchase'?a.limitCents>=ownPrices.buy:false;
  // Conditional full-fill effects use only public prices. A rival's pending
  // issuance or tender is private, so a primary-only crossing is identified,
  // never presented as an available guaranteed counterparty.
  const rivalPrice=b.side==='buy'?(b.limitCents>=rivalPrices.buy?rivalPrices.buy:b.limitCents>=rivalPrices.issue?rivalPrices.issue:null):b.side==='sell'?(b.limitCents<=rivalPrices.sell?rivalPrices.sell:b.limitCents<=rivalPrices.buy?rivalPrices.buy:null):null;
  const ownShares=ownCrosses?a.shares:0,rivalShares=rivalPrice===null?0:b.shares,issueCash=a.action==='issue'?cost(ownShares,ownPrices.issue):0,repurchaseCash=a.action==='repurchase'?cost(ownShares,ownPrices.buy):0,buyCash=b.side==='buy'?cost(rivalShares,rivalPrice):0,saleCash=b.side==='sell'?cost(rivalShares,rivalPrice):0;
  const basisReleased=b.side==='sell'&&rivalShares?(rivalShares===p.holdingShares.shares?p.holdingShares.basis:Math.floor(p.holdingShares.basis*rivalShares/p.holdingShares.shares)):0,realizedGain=saleCash-basisReleased;
  const maximumProceeds=issueCash,fullIssued=own.issued+(a.action==='issue'?ownShares:a.action==='repurchase'?-ownShares:0),rivalSharesAfter=p.holdingShares.shares+(b.side==='buy'?rivalShares:b.side==='sell'?-rivalShares:0);
  return {policy,own,rival,ownPrices,rivalPrices,spend,protectedCash:protectedAmount,available,remaining:available-spend,maximumProceeds,
   parentCash:p.financialGroup.parent.accounts.cash,parentEquity:p.financialGroup.parent.accounts.equity,
   founderBefore:100*own.founderShares/own.issued,founderAfter:100*own.founderShares/fullIssued,
   issuedAfter:fullIssued,maxIssue:capitalLimit(own),bankCash:p.stats.cash,bankCapital:p.stats.capital,
   parentCashAfter:p.financialGroup.parent.accounts.cash+issueCash-repurchaseCash-buyCash+saleCash,parentEquityAfter:p.financialGroup.parent.accounts.equity+issueCash-repurchaseCash+realizedGain,
   rivalSharesBefore:p.holdingShares.shares,rivalSharesAfter,rivalOwnershipBefore:100*p.holdingShares.shares/rival.issued,rivalOwnershipAfter:100*rivalSharesAfter/rival.issued,
   basisReleased,realizedGain,conditionalEffects:{ownCrosses,rivalCrosses:rivalPrice!==null,rivalPrice,issueCash,repurchaseCash,buyCash,saleCash,ownShares,rivalShares,
    rivalPrimaryOnly:b.side==='buy'&&rivalPrice===rivalPrices.issue&&b.limitCents<rivalPrices.buy||b.side==='sell'&&rivalPrice===rivalPrices.buy&&b.limitCents>rivalPrices.sell,
    note:'Conditional full-fill estimate at public quotes, before other Group actions. Outside liquidity and voluntary rival orders can produce partial or zero fills. Rival ownership uses the current issued-share count; simultaneous rival issuance or repurchases may change it.'},
   note:'Holding-company shares. Issuance raises parent capital, not earnings or bank deposits. Repurchases retire only voluntarily sold shares. Quotes and limited outside liquidity can produce partial or zero fills; the bank stays founder-controlled.'};
 }
 function normalize(source,p,plan){if(!enabled(p)){if(plan.holdingCapitalOrders!==undefined)throw Error('Holding-company orders are not enabled in this saved campaign.');return;}plan.holdingCapitalOrders=quote(source,p,plan).policy;}
 function settle(g,plans){
  if(!enabled(g))return [];
  const m=g.holdingCapitalMarket;if(m.month!==g.cycle-1)throw Error('Holding-company orders already settled.');
  const reviewed=g.players.map((p,i)=>quote(g,p,plans[i])),openingCash=g.players.reduce((n,p)=>n+p.financialGroup.parent.accounts.cash,0)+g.companyShareMarket.outside.book.accounts.cash;
  const outsideBefore=g.companyShareMarket.outside.book.accounts.cash;m.receipts=[];
  const sideBook=id=>id==='outside'?g.companyShareMarket.outside.book:g.players.find(p=>p.id===id).financialGroup.parent;
  const setBook=(id,b)=>{if(id==='outside')g.companyShareMarket.outside.book=b;else g.players.find(p=>p.id===id).financialGroup.parent=b;};
  const position=(id,issuer)=>id==='outside'?issuer.outside:g.players.find(p=>p.id===id).holdingShares;
  const available=id=>id==='outside'?sideBook(id).accounts.cash:Math.max(0,sideBook(id).accounts.cash-reviewed[g.players.findIndex(p=>p.id===id)].protectedCash);
  const record=(issuer,kind,buyer,seller,shares,cents,amount)=>m.receipts.push({cycle:g.cycle,issuer:issuer.id,kind,buyer,seller,shares,priceCents:cents,cash:amount});
  function buyPosition(buyer,issuer,n,cents,kind){
   const amount=cost(n,cents),pos=position(buyer,issuer),book=sideBook(buyer);
   setBook(buyer,GroupAccounting.post(book,'holding.'+kind,issuer.id,{cash:-amount,businessAssets:amount}));pos.shares+=n;pos.basis+=amount;return amount;
  }
  function sellPosition(seller,issuer,n,amount){
   const pos=position(seller,issuer),basisReleased=n===pos.shares?pos.basis:Math.floor(pos.basis*n/pos.shares),gain=amount-basisReleased;
   setBook(seller,GroupAccounting.post(sideBook(seller),'holding.sale',issuer.id,{cash:amount,businessAssets:-basisReleased,equity:gain},gain));pos.shares-=n;pos.basis-=basisReleased;
  }
  const used=g.players.map(()=>0),outsideUsed=new Map();
  for(const offset of [0,1]){
   const idx=(g.cycle+offset)%2,p=g.players[idx],otherIndex=1-idx,other=g.players[otherIndex],issuer=m.issuers.find(i=>i.id===p.id),a=reviewed[idx].policy.capital,b=reviewed[otherIndex].policy.rival,pr=quotes(issuer);let traded=0;
   if(a.action==='issue'&&a.limitCents<=pr.issue){
    let left=Math.min(a.shares,capitalLimit(issuer));
    for(const buyer of [other.id,'outside']){
     const demand=buyer==='outside'?RULES.outsideMonthly:b.side==='buy'&&b.limitCents>=pr.issue?b.shares-used[otherIndex]:0;
     const n=Math.min(left,demand,Math.floor(available(buyer)*100/pr.issue));if(!n)continue;
     const amount=buyPosition(buyer,issuer,n,pr.issue,'subscribe');setBook(p.id,GroupAccounting.post(sideBook(p.id),'holding.issue',buyer,{cash:amount,equity:amount}));issuer.issued+=n;left-=n;
     if(buyer===other.id)used[otherIndex]+=n;else traded+=n;record(issuer,'issue',buyer,p.id,n,pr.issue,amount);
    }
   }else if(a.action==='repurchase'&&a.limitCents>=pr.buy){
    let left=a.shares;
    for(const seller of [other.id,'outside']){
     const offer=seller==='outside'?Math.min(RULES.outsideMonthly,issuer.outside.shares):b.side==='sell'&&b.limitCents<=pr.buy?b.shares-used[otherIndex]:0;
     const n=Math.min(left,offer,Math.floor(available(p.id)*100/pr.buy),Math.floor(Math.max(0,sideBook(p.id).accounts.equity-RULES.parentReserve)*100/pr.buy));if(!n)continue;
     const amount=cost(n,pr.buy);setBook(p.id,GroupAccounting.post(sideBook(p.id),'holding.repurchase',seller,{cash:-amount,equity:-amount}));sellPosition(seller,issuer,n,amount);issuer.issued-=n;left-=n;
     if(seller===other.id)used[otherIndex]+=n;else traded+=n;record(issuer,'repurchase',p.id,seller,n,pr.buy,amount);
    }
   }
   outsideUsed.set(p.id,traded);
  }
  for(const idx of [g.cycle%2,1-g.cycle%2]){
   const p=g.players[idx],b=reviewed[idx].policy.rival,issuer=m.issuers.find(i=>i.id===p.holdingShares.issuer),pr=quotes(issuer),liquidity=Math.max(0,RULES.outsideMonthly-(outsideUsed.get(issuer.id)||0)),left=b.shares-used[idx];
   if(b.side==='buy'&&b.limitCents>=pr.buy){const n=Math.min(left,liquidity,issuer.outside.shares,Math.floor(available(p.id)*100/pr.buy));if(n){const amount=buyPosition(p.id,issuer,n,pr.buy,'buy');sellPosition('outside',issuer,n,amount);record(issuer,'trade',p.id,'outside',n,pr.buy,amount);}}
   if(b.side==='sell'&&b.limitCents<=pr.sell){const n=Math.min(left,liquidity,p.holdingShares.shares,Math.floor(available('outside')*100/pr.sell));if(n){const amount=buyPosition('outside',issuer,n,pr.sell,'buy');sellPosition(p.id,issuer,n,amount);record(issuer,'trade','outside',p.id,n,pr.sell,amount);}}
  }
  g.companyShareMarket.parentCashNet+=outsideBefore-g.companyShareMarket.outside.book.accounts.cash;
  const closingCash=g.players.reduce((n,p)=>n+p.financialGroup.parent.accounts.cash,0)+g.companyShareMarket.outside.book.accounts.cash;
  if(closingCash!==openingCash)throw Error('Holding-company trading failed cash conservation.');m.month=g.cycle;
  return m.receipts.map(r=>g.players.find(p=>p.id===r.issuer).name+' holding company: '+r.kind+' of '+r.shares.toLocaleString()+' shares at $'+(r.priceCents/100).toFixed(2)+' ($'+r.cash.toLocaleString()+'). Bank deposits and customer custody are unchanged.');
 }
 function finish(g){if(!enabled(g))return;for(const i of g.holdingCapitalMarket.issuers)i.referenceCents=price(g,g.players.find(p=>p.id===i.id),i.issued);}
 function project(g,out,index){
  if(!enabled(g))return;const p=g.players[index],m=g.holdingCapitalMarket;
  out.me.holdingShares=copy(p.holdingShares);
  out.holdingCapitalSnapshot={version:1,month:m.month,issuers:m.issuers.map(i=>({id:i.id,issued:i.issued,founderShares:i.founderShares,referenceCents:i.referenceCents,outsideShares:i.outside.shares,rivalShares:g.players.find(p=>p.id!==i.id).holdingShares.shares})),receipts:copy(m.receipts)};
  if(p.submitted?.holdingCapitalOrders)out.me.pendingHoldingCapitalOrders=copy(p.submitted.holdingCapitalOrders);
  delete out.rival.holdingShares;delete out.rival.pendingHoldingCapitalOrders;
  for(const [id,plan]of Object.entries(out.lastPlans||{}))if(id!==p.id)delete plan.holdingCapitalOrders;
 }
 function validate(source,context='game'){
  const owners=context==='game'?source.players:[source.me],active=enabled(source),s=context==='game'?source.holdingCapitalMarket:source.holdingCapitalSnapshot,fail=()=>{throw Error('Invalid holding-company ownership state.');};
  if(!['game','view'].includes(context)||context==='game'&&source.holdingCapitalSnapshot!==undefined||context==='view'&&source.holdingCapitalMarket!==undefined)fail();
  if(!active){if(s!==undefined||owners.some(p=>p?.holdingShares!==undefined||p?.pendingHoldingCapitalOrders!==undefined||p?.submitted?.holdingCapitalOrders!==undefined)||Object.values(source.lastPlans||{}).some(p=>p.holdingCapitalOrders!==undefined))fail();return;}
  const ids=context==='game'?source.players.map(p=>p.id):[source.me.id,source.rival.id],month=source.gameOver?source.cycle:source.cycle-1;
  if(!exact(s,['version','month','issuers','receipts'])||s.version!==1||s.month!==month||!Array.isArray(s.issuers)||s.issuers.length!==2||new Set(s.issuers.map(i=>i.id)).size!==2||!Array.isArray(s.receipts)||s.receipts.length>8)fail();
  for(const i of s.issuers){
   if(!ids.includes(i.id)||!whole(i.issued)||i.founderShares!==RULES.founderShares||i.issued<i.founderShares||i.issued>Math.floor(i.founderShares*10000/RULES.founderMinimumBp)||!whole(i.referenceCents,RULES.maxPriceCents)||!i.referenceCents)fail();
   const outside=context==='game'?i.outside.shares:i.outsideShares,rival=context==='game'?owners.find(p=>p.id!==i.id).holdingShares.shares:i.rivalShares;
   if(!whole(outside)||!whole(rival)||i.issued!==i.founderShares+outside+rival)fail();
   if(context==='game'&&(!exact(i,['id','issued','founderShares','referenceCents','outside'])||!exact(i.outside,['shares','basis'])||!whole(i.outside.basis)||!outside&&i.outside.basis))fail();
   if(context==='view'&&!exact(i,['id','issued','founderShares','referenceCents','outsideShares','rivalShares']))fail();
  }
  for(const p of owners){if(!exact(p.holdingShares,['issuer','shares','basis'])||!ids.includes(p.holdingShares.issuer)||p.holdingShares.issuer===p.id||!whole(p.holdingShares.shares)||!whole(p.holdingShares.basis)||!p.holdingShares.shares&&p.holdingShares.basis)fail();
   const i=s.issuers.find(i=>i.id===p.holdingShares.issuer);if(context==='view'&&i.rivalShares!==p.holdingShares.shares)fail();
   if(s.issuers.find(i=>i.id===p.id).referenceCents!==price(source,p,s.issuers.find(i=>i.id===p.id).issued))fail();
   if(p.pendingHoldingCapitalOrders!==undefined){if(context!=='view'||!p.submitted)fail();quote(source,p,{groupPolicy:defaultGroupPlan(p),holdingCapitalOrders:p.pendingHoldingCapitalOrders});}
  }
  const receiptKeys=new Set(),outsideVolume=new Map();
  for(const r of s.receipts){
   if(!exact(r,['cycle','issuer','kind','buyer','seller','shares','priceCents','cash'])||!month||r.cycle!==month||!ids.includes(r.issuer)||!['issue','repurchase','trade'].includes(r.kind)||![...ids,'outside'].includes(r.buyer)||![...ids,'outside'].includes(r.seller)||r.buyer===r.seller||!whole(r.shares,RULES.monthlyShares)||!r.shares||!whole(r.priceCents,RULES.maxPriceCents*2)||!r.priceCents||r.cash!==cost(r.shares,r.priceCents))fail();
   if(r.kind==='issue'&&(r.seller!==r.issuer||r.buyer===r.issuer)||r.kind==='repurchase'&&(r.buyer!==r.issuer||r.seller===r.issuer)||r.kind==='trade'&&(r.buyer===r.issuer||r.seller===r.issuer||![r.buyer,r.seller].includes('outside')))fail();
   const key=[r.issuer,r.kind,r.buyer,r.seller].join('/');if(receiptKeys.has(key))fail();receiptKeys.add(key);
   if([r.buyer,r.seller].includes('outside')){outsideVolume.set(r.issuer,(outsideVolume.get(r.issuer)||0)+r.shares);if(outsideVolume.get(r.issuer)>RULES.outsideMonthly)fail();}
  }
  if(context==='view'&&(source.rival.holdingShares!==undefined||source.rival.pendingHoldingCapitalOrders!==undefined||source.rival.submitted?.holdingCapitalOrders!==undefined||source.lastPlans?.[source.rival.id]?.holdingCapitalOrders!==undefined))fail();
 }
 return {RULES,enabled,basis,outsideBasis,initialize,defaults,reserve,quotes,quote,normalize,settle,finish,project,validate};
})();
