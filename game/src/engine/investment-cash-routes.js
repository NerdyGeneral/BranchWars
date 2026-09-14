// Client-owned cash placements. Cash, deposit claims and fund shares are distinct.
// The campaign adapter supplies actual client cash, bank books and dealer inventory;
// this pure boundary never opens an endowed provider or grants operating capital.
const InvestmentCashRoutes=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),uint=n=>Number.isSafeInteger(n)&&n>=0;
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 const modes=Object.freeze(['hold','affiliated','external','moneyMarket']);
 function cashRoutesEmptyBank(){
  const b=AccountingPrototype.opening(4);
  for(const key of Object.keys(b.accounts))b.accounts[key]=0;
  AccountingPrototype.check(b);return b;
 }
 function cashRoutesOpening(clients){
  if(!Array.isArray(clients)||clients.length>3000||new Set(clients.map(c=>c.id)).size!==clients.length)throw Error('Invalid cash-route client register.');
  return {version:1,month:0,external:cashRoutesEmptyBank(),fund:{book:GroupAccounting.opening('investment:cashFund'),shares:0,securities:0},
   received:0,returned:0,tradingNet:0,accounts:clients.map(c=>({clientId:c.id,mode:'hold',buffer:1000,affiliate:null,bankId:null,deposit:0,shares:0})),report:[]};
 }
 function cashRoutesNav(book,price){return book.fund.book.accounts.cash+book.fund.securities*price;}
 function cashRoutesValue(book,clientId,price){
  const r=book.accounts.find(r=>r.clientId===clientId);if(!r)return 0;
  return r.deposit+(book.fund.shares?Number(BigInt(cashRoutesNav(book,price))*BigInt(r.shares)/BigInt(book.fund.shares)):0);
 }
 function cashRoutesBankBalance(book,bankId){return book.accounts.filter(r=>r.bankId===bankId).reduce((n,r)=>n+r.deposit,0);}
 // Largest-remainder allocation uses stable account IDs, never submission order.
 function cashRoutesSplit(total,weights,ids){
  const sum=weights.reduce((n,x)=>n+BigInt(x),0n);if(!sum)return weights.map(()=>0);
  const result=weights.map(n=>Number(BigInt(total)*BigInt(n)/sum));
  const ordered=weights.map((n,i)=>({i,remainder:BigInt(total)*BigInt(n)%sum})).sort((a,b)=>a.remainder===b.remainder?(ids[a.i]<ids[b.i]?-1:ids[a.i]>ids[b.i]?1:0):a.remainder>b.remainder?-1:1);
  for(let n=total-result.reduce((a,b)=>a+b,0),i=0;n>0;n--,i++)result[ordered[i].i]++;
  return result;
 }
 function cashRoutesValidate(book,clients,banks,market,holdingsOnly=false){
  if(!exact(book,['version','month','external','fund','received','returned','tradingNet','accounts','report',...(book?.incomeReceived!==undefined?['incomeReceived']:[])])||book.version!==1||!uint(book.month)||book.incomeReceived!==undefined&&!uint(book.incomeReceived)||
   !uint(book.received)||!uint(book.returned)||!Number.isSafeInteger(book.tradingNet)||!Array.isArray(book.accounts)||book.accounts.length>3000||
   !Array.isArray(book.report)||!Array.isArray(clients)||!Array.isArray(banks)||banks.length!==2||new Set(banks.map(b=>b.id)).size!==2||banks.some(b=>!exact(b,holdingsOnly?['id']:['id','book','work'])||!holdingsOnly&&!uint(b.work)||typeof b.id!=='string'||!b.id||b.id==='external')||
   !exact(book.fund,['book','shares','securities'])||!uint(book.fund.shares)||!uint(book.fund.securities)||
   !market||!uint(market.price)||market.price<10||market.price>10000||!uint(market.units))throw Error('Invalid client cash placement books.');
  if(!holdingsOnly)for(const b of banks)AccountingPrototype.check(b.book);
  AccountingPrototype.check(book.external);GroupAccounting.validate(book.fund.book);GroupAccounting.validate(market.dealer);
  const f=book.fund.book.accounts,external=book.external.accounts;
  if(book.fund.book.entityId!=='investment:cashFund'||market.dealer.entityId!=='investment:dealer'||market.dealer.accounts.businessAssets!==market.units*market.price||
   f.businessAssets!==book.fund.securities*market.price||['investments','custodyAssets','custodyLiabilities','debt','payables'].some(k=>f[k])||
   (!book.fund.shares&&cashRoutesNav(book,market.price))||(book.fund.shares&&!cashRoutesNav(book,market.price))||external.cash!==external.deposits||Object.entries(external).some(([k,n])=>!['cash','deposits'].includes(k)&&n))throw Error('Cash providers do not reconcile with their assets and liabilities.');
  const ids=new Set(),clientMap=new Map(clients.map(c=>[c.id,c]));let shares=0,deposits=0;
  if(clientMap.size!==clients.length||clients.length!==book.accounts.length||clients.some(c=>!uint(c.cash)||typeof c.id!=='string'||!c.id||c.id.length>80||c.owner!==null&&!banks.some(b=>b.id===c.owner)))throw Error('Invalid cash placement client identities.');
  for(const a of book.accounts){
   if(!exact(a,['clientId','mode','buffer','affiliate','bankId','deposit','shares'])||!clientMap.has(a.clientId)||ids.has(a.clientId)||!modes.includes(a.mode)||
    !uint(a.buffer)||a.buffer>1000000||!uint(a.deposit)||!uint(a.shares)||
    (a.mode==='affiliated'?!banks.some(b=>b.id===a.affiliate):a.affiliate!==null)||
    (a.bankId!==null&&a.bankId!=='external'&&!banks.some(b=>b.id===a.bankId))||(a.bankId===null&&a.deposit)||(!a.deposit&&a.bankId!==null))throw Error('Invalid or duplicated client cash position.');
   ids.add(a.clientId);shares+=a.shares;deposits+=a.deposit;
  }
  if(!uint(shares)||!uint(deposits)||shares!==book.fund.shares||cashRoutesBankBalance(book,'external')!==external.deposits||
   !holdingsOnly&&banks.some(b=>cashRoutesBankBalance(book,b.id)>b.book.accounts.deposits))throw Error('Cash claims do not match fund shares or bank deposits.');
  if(BigInt(deposits)+BigInt(f.cash)+BigInt(book.tradingNet)!==BigInt(book.received)-BigInt(book.returned)+BigInt(book.incomeReceived||0))throw Error('Cash placements created or lost funding.');
  const reported=new Set();for(const r of book.report){
   if(!exact(r,['clientId','owner','mode','placed','released','blocked','work','reason'])||!ids.has(r.clientId)||reported.has(r.clientId)||r.owner!==null&&!banks.some(b=>b.id===r.owner)||r.work&&r.owner===null||!modes.includes(r.mode)||!uint(r.placed)||!uint(r.released)||typeof r.blocked!=='boolean'||![0,1].includes(r.work)||!['','capacity','liquidity','minimum subscription','suitability'].includes(r.reason))throw Error('Invalid cash placement report.');reported.add(r.clientId);
  }
  if(book.month&&reported.size!==ids.size||!book.month&&reported.size)throw Error('Cash placement reports do not cover the settled accounts.');
  return true;
 }
 // Custody validation has owner identities, not operating-bank books. It must
 // not fabricate placeholder bank balances. The campaign boundary additionally
 // calls the full validator against each actual bank liability ledger.
 function cashRoutesValidateHoldings(book,clients,owners,market){
  return cashRoutesValidate(book,clients,owners.map(id=>({id})),market,true);
 }
 function cashRoutesPolicy(input,orders,clients,bankIds){
  if(!Array.isArray(orders)||orders.length>3000)throw Error('Invalid cash instructions.');
  const next=copy(input),seen=new Set();
  for(const o of orders){
   const c=clients.find(c=>c.id===o.clientId),a=next.accounts.find(a=>a.clientId===o.clientId);
   if(!exact(o,['owner','clientId','mode','buffer'])||!c||!a||seen.has(c.id)||o.owner!==c.owner||!bankIds.includes(o.owner)||!modes.includes(o.mode)||!uint(o.buffer)||o.buffer>1000000)throw Error('Cash instructions require the owning relationship and valid limits.');
   a.mode=o.mode;a.buffer=o.buffer;a.affiliate=o.mode==='affiliated'?o.owner:null;seen.add(c.id);
  }
  return next;
 }
 function cashRoutesFundSell(w,needed){
  const units=Math.min(w.book.fund.securities,Math.floor(w.market.dealer.accounts.cash/w.market.price),Math.ceil(Math.max(0,needed-w.book.fund.book.accounts.cash)/w.market.price));
  if(!units)return;
  const paid=units*w.market.price;
  w.book.fund.book=GroupAccounting.post(w.book.fund.book,'cashFund.sell','investment:dealer',{cash:paid,businessAssets:-paid});
  w.market.dealer=GroupAccounting.post(w.market.dealer,'cashFund.buy','investment:cashFund',{cash:-paid,businessAssets:paid});
  w.book.fund.securities-=units;w.market.units+=units;w.book.tradingNet-=paid;
 }
 function cashRoutesStep(input,orders,cycle,minimumCash=[],suitabilityVersion=0,otherInvestments=[]){
  if(![0,1].includes(suitabilityVersion))throw Error('Unsupported cash suitability rules.');
  if(!input||!exact(input,['book','clients','banks','market']))throw Error('Cash arrangements require paired client, bank and dealer books.');
  cashRoutesValidate(input.book,input.clients,input.banks,input.market);
  if(!uint(cycle)||cycle!==input.book.month+1)throw Error('Cash arrangements settle once in month order.');
  const w=copy(input);w.book=cashRoutesPolicy(w.book,orders,w.clients,w.banks.map(b=>b.id));w.book.month=cycle;
  const rows=w.book.accounts,ids=rows.map(r=>r.clientId),clients=rows.map(r=>w.clients.find(c=>c.id===r.clientId));
  if(!Array.isArray(otherInvestments)||otherInvestments.length>clients.length||new Set(otherInvestments.map(r=>r.clientId)).size!==otherInvestments.length||otherInvestments.some(r=>!exact(r,['clientId','value'])||!ids.includes(r.clientId)||!uint(r.value))||otherInvestments.length&&suitabilityVersion!==1)throw Error('Invalid additional investment exposure.');
  if(!Array.isArray(minimumCash)||minimumCash.length>rows.length||new Set(minimumCash.map(r=>r.clientId)).size!==minimumCash.length||minimumCash.some(r=>!exact(r,['clientId','amount'])||!ids.includes(r.clientId)||!uint(r.amount)))throw Error('Invalid service-fee cash requirement.');
  // Reserve this month's quoted service fee without rewriting customer policy.
  // A zero selected buffer cannot shelter liquid holdings from billed fees.
  const buffers=rows.map(r=>Math.max(r.buffer,minimumCash.find(x=>x.clientId===r.clientId)?.amount||0));
  const requestedBuffers=buffers.slice();
  if(suitabilityVersion===1)for(const [i,r]of rows.entries())if(r.mode==='moneyMarket'){
   const fee=minimumCash.find(x=>x.clientId===r.clientId)?.amount||0;
   const q=InvestmentSuitability.assess(clients[i],w.market.price,{deposit:r.deposit,value:cashRoutesValue(w.book,r.clientId,w.market.price)+(otherInvestments.find(a=>a.clientId===r.clientId)?.value||0)});
   buffers[i]=Math.max(buffers[i],q.fundCashFloor+fee);
  }
  // Consent names the selected bank. Winning an advisory relationship must not
  // silently switch its separately owned deposit relationship to the winner.
  const desired=rows.map(r=>r.mode==='affiliated'?r.affiliate:r.mode==='external'?'external':null);
  const active=clients.map(c=>w.banks.some(b=>b.id===c.owner)),remaining=Object.fromEntries(w.banks.map(b=>[b.id,b.work]));
  w.book.report=rows.map((r,i)=>({clientId:r.clientId,owner:clients[i].owner,mode:r.mode,placed:0,released:0,blocked:false,work:0,reason:''}));
  for(const [i,r]of rows.entries())if(active[i]&&buffers[i]>requestedBuffers[i]&&clients[i].cash>requestedBuffers[i])Object.assign(w.book.report[i],{blocked:true,reason:'suitability'});
  // The institution adapter supplies residual qualified operations slots. Work
  // already promised to ordinary service or migration cannot be used twice.
  const priority=rows.map((r,i)=>i).sort((a,b)=>Number(!!(rows[b].deposit||rows[b].shares))-Number(!!(rows[a].deposit||rows[a].shares))||(ids[a]<ids[b]?-1:ids[a]>ids[b]?1:0));
  for(const i of priority){
   const r=rows[i],c=clients[i],needed=(r.deposit&&r.bankId!==desired[i])||(r.shares&&r.mode!=='moneyMarket')||
    (c.cash<buffers[i]&&(r.deposit||r.shares))||(c.cash>buffers[i]&&r.mode!=='hold');
   if(!active[i]||!needed){active[i]=false;continue;}
   if(!remaining[c.owner]){active[i]=false;Object.assign(w.book.report[i],{blocked:true,reason:'capacity'});continue;}
   remaining[c.owner]--;w.book.report[i].work=1;
  }
  // An owner may leave or fail; existing claims remain the customer's property.
  // No new movement is made on behalf of a departed investment relationship.
  const wanted=rows.map((r,i)=>!active[i]?0:r.bankId!==desired[i]?r.deposit:Math.min(r.deposit,Math.max(0,buffers[i]-clients[i].cash)));
  for(const id of [...w.banks.map(b=>b.id),'external']){
   const bank=id==='external'?w.book.external:w.banks.find(b=>b.id===id).book;
   const needs=rows.map((r,i)=>r.bankId===id?wanted[i]:0),total=needs.reduce((n,x)=>n+x,0),paid=Math.min(total,bank.accounts.cash);
   const fills=cashRoutesSplit(paid,needs,ids);if(!paid)continue;
   const changed=AccountingPrototype.post(bank,'client.cashSweepRedemption',{cash:-paid,deposits:-paid});
   if(id==='external')w.book.external=changed;else w.banks.find(b=>b.id===id).book=changed;
   for(const [i,n]of fills.entries())if(n){rows[i].deposit-=n;if(!rows[i].deposit)rows[i].bankId=null;clients[i].cash+=n;w.book.returned+=n;w.book.report[i].released+=n;}
  }
  const nav=cashRoutesNav(w.book,w.market.price),supply=w.book.fund.shares;
  const shares=rows.map((r,i)=>!active[i]?0:r.mode!=='moneyMarket'?r.shares:Math.min(r.shares,nav?Number((BigInt(Math.max(0,buffers[i]-clients[i].cash))*BigInt(supply)+BigInt(nav)-1n)/BigInt(nav)):0));
  const requested=shares.reduce((n,x)=>n+x,0);
  if(requested&&nav){
   cashRoutesFundSell(w,Number(BigInt(nav)*BigInt(requested)/BigInt(supply)));
   const redeemed=Math.min(requested,Number(BigInt(w.book.fund.book.accounts.cash)*BigInt(supply)/BigInt(nav)));
   const fills=cashRoutesSplit(redeemed,shares,ids),paid=Number(BigInt(nav)*BigInt(redeemed)/BigInt(supply)),payouts=cashRoutesSplit(paid,fills,ids);
   if(redeemed){w.book.fund.book=GroupAccounting.post(w.book.fund.book,'cashFund.redeem','clients',{cash:-paid,equity:-paid});w.book.fund.shares-=redeemed;}
   for(const [i,n]of fills.entries())if(n){rows[i].shares-=n;clients[i].cash+=payouts[i];w.book.returned+=payouts[i];w.book.report[i].released+=payouts[i];}
  }
  const entryNav=cashRoutesNav(w.book,w.market.price),entryShares=w.book.fund.shares;
  for(const [i,r]of rows.entries()){
   if(!active[i])continue;
   if(clients[i].cash<buffers[i]&&(r.deposit||r.shares))Object.assign(w.book.report[i],{blocked:true,reason:'liquidity'});
   // A partially redeemed old route must not be disguised as a completed move.
   if((r.deposit&&r.bankId!==desired[i])||(r.shares&&r.mode!=='moneyMarket')){Object.assign(w.book.report[i],{blocked:true,reason:'liquidity'});continue;}
   const amount=Math.max(0,clients[i].cash-buffers[i]);if(!amount||r.mode==='hold')continue;
   let paid=amount;
   if(r.mode==='moneyMarket'){
    const minted=entryShares?(entryNav?Number(BigInt(amount)*BigInt(entryShares)/BigInt(entryNav)):0):amount;
    if(!minted){Object.assign(w.book.report[i],{blocked:true,reason:'minimum subscription'});continue;}
    paid=entryShares?Number((BigInt(minted)*BigInt(entryNav)+BigInt(entryShares)-1n)/BigInt(entryShares)):amount;
    w.book.fund.book=GroupAccounting.post(w.book.fund.book,'cashFund.subscribe',r.clientId,{cash:paid,equity:paid});w.book.fund.shares+=minted;r.shares+=minted;
   }else{
    const id=desired[i],bank=id==='external'?w.book.external:w.banks.find(b=>b.id===id).book;
    const changed=AccountingPrototype.post(bank,'client.cashSweepDeposit',{cash:paid,deposits:paid});
    if(id==='external')w.book.external=changed;else w.banks.find(b=>b.id===id).book=changed;
    r.bankId=id;r.deposit+=paid;
   }
   clients[i].cash-=paid;w.book.received+=paid;w.book.report[i].placed+=paid;
  }
  // Provisional liquidity policy: at least 10% of fund NAV remains cash.
  // Units are bought from actual dealer inventory, never issued by this fund.
  const reserve=Math.ceil(cashRoutesNav(w.book,w.market.price)/10),budget=Math.max(0,w.book.fund.book.accounts.cash-reserve);
  const bought=Math.min(w.market.units,Math.floor(budget/w.market.price)),cost=bought*w.market.price;
  if(bought){
   w.book.fund.book=GroupAccounting.post(w.book.fund.book,'cashFund.invest','investment:dealer',{cash:-cost,businessAssets:cost});
   w.market.dealer=GroupAccounting.post(w.market.dealer,'cashFund.sell','investment:cashFund',{cash:cost,businessAssets:-cost});
   w.market.units-=bought;w.book.fund.securities+=bought;w.book.tradingNet+=cost;
  }
  cashRoutesValidate(w.book,w.clients,w.banks,w.market);return w;
 }
 function cashRoutesReprice(input,price){
  cashRoutesValidate(input.book,input.clients,input.banks,input.market);
  if(!uint(price)||price<10||price>10000)throw Error('Invalid cash fund market price.');
  const w=copy(input),cashRoutePriceChange=price-w.market.price;
  const fundMark=cashRoutePriceChange*w.book.fund.securities,dealerMark=cashRoutePriceChange*w.market.units;
  if(fundMark)w.book.fund.book=GroupAccounting.post(w.book.fund.book,'cashFund.valuation','security-market',{businessAssets:fundMark,equity:fundMark},fundMark);
  if(dealerMark)w.market.dealer=GroupAccounting.post(w.market.dealer,'cashFund.dealerMark','security-market',{businessAssets:dealerMark,equity:dealerMark},dealerMark);
  w.market.price=price;cashRoutesValidate(w.book,w.clients,w.banks,w.market);return w;
 }
 return Object.freeze({opening:cashRoutesOpening,validate:cashRoutesValidate,validateHoldings:cashRoutesValidateHoldings,step:cashRoutesStep,reprice:cashRoutesReprice,value:cashRoutesValue,bankBalance:cashRoutesBankBalance,nav:cashRoutesNav,modes});
})();
