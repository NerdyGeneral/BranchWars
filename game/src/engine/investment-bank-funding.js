// Explicit household-segment funding boundary for the versioned investment rules.
// This does not assign individual ownership to pooled deposits. The customer
// adapter supplies an authorized link to an existing household segment; a linked
// account does not create another household or make all segment savings its own.
const InvestmentBankFunding=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),whole=n=>Number.isSafeInteger(n)&&n>=0;
 const exact=(x,keys)=>{if(!x||typeof x!=='object'||Array.isArray(x))return false;const own=Object.keys(x);if(own.length!==keys.length)return false;const set=new Set(keys);if(set.size!==keys.length)return false;for(let i=0;i<own.length;i++)if(!set.has(own[i]))return false;return true;};
 function investmentFundingValidateLinks(links,world){
  if(!exact(links,['version','accounts','transfers'])||![2,3].includes(links.version)||!Array.isArray(links.accounts)||!Array.isArray(links.transfers))throw Error('Invalid investment funding links.');
  const ids=new Set(),accounts=new Map(),clients=new Map(world.clients.map(c=>[c.id,c]));
  for(const a of links.accounts){
   if(!exact(a,['clientId','bankId','market','segment','limit','lastCycle','funded'])||
    typeof a.clientId!=='string'||ids.has(a.clientId)||clients.get(a.clientId)?.market!==a.market||
    typeof a.bankId!=='string'||!a.bankId.length||!Object.hasOwn(CUSTOMER_SEGMENTS,a.segment)||
    !whole(a.limit)||!a.limit||!whole(a.lastCycle)||!whole(a.funded)||a.lastCycle>world.month)
    throw Error('Invalid or duplicated investment funding authorization.');
   ids.add(a.clientId);accounts.set(a.clientId,a);
  }
  const posted=new Set(),fundedTotals=new Map(),lastCycle=new Map();let cashNet=0;
  for(const t of links.transfers){
   if(!exact(t,['clientId','bankId','market','segment','cycle','amount','destination'])||!['cash','securities',...(links.version===3?['return']:[])].includes(t.destination)||!whole(t.cycle)||!t.cycle||t.cycle>world.month||!whole(t.amount)||!t.amount)
    throw Error('Invalid investment savings transfer.');
   const a=accounts.get(t.clientId),key=t.clientId+'/'+t.cycle;
   if(!a||posted.has(key)||['bankId','market','segment'].some(k=>t[k]!==a[k])||t.amount>a.limit||t.cycle>a.lastCycle)
    throw Error('Investment savings transfer has no unique source authorization.');
   const signed=t.destination==='return'?-t.amount:t.amount;
   posted.add(key);fundedTotals.set(t.clientId,(fundedTotals.get(t.clientId)||0)+signed);lastCycle.set(t.clientId,Math.max(lastCycle.get(t.clientId)||0,t.cycle));cashNet+=signed;
   if(!whole(fundedTotals.get(t.clientId)))throw Error('Investment withdrawals exceed this source’s funded principal.');
   if(!whole(cashNet))throw Error('Investment savings transfers exceed safe precision.');
  }
  for(const a of links.accounts){
   const last=lastCycle.get(a.clientId)||0;
   if(a.funded!==(fundedTotals.get(a.clientId)||0)||a.lastCycle!==last)throw Error('Investment funding history does not reconcile.');
  }
  if(cashNet!==world.bankCashNet)throw Error('Investment savings transfers do not match the funded investment cash.');
 }
 // A separate resource bridge, never an edit to historical growth anchors or
 // population departures. Net outflow is historical cash, not current AUM:
 // subsequent fees, price changes and custody moves do not recreate savings.
 // Full campaign adoption still needs a versioned
 // lifecycle; this check does not make an unmarked legacy save valid.
 function investmentFundingRegionalResources(g,world,entities,links){
  InvestmentClients.validate(world,entities);investmentFundingValidateLinks(links,world);
  if(!g.regionalGrowth||!g.marketEconomy)throw Error('Investment savings need the regional resource books.');
  const moved=regionalGrowthGrid(g),b=g.regionalGrowth;
  for(const t of links.transfers){
   if(!moved[t.market]||!g.players.some(p=>p.id===t.bankId))throw Error('Investment savings transfer belongs to another market or bank.');
   moved[t.market].deposits[t.segment]+=t.destination==='return'?-t.amount:t.amount;
  }
  const rows=[];
  for(const k of regionalGrowthKeys(g))for(const resource of ['customers','deposits'])for(const segment of Object.keys(CUSTOMER_SEGMENTS)){
   const pools=resource==='customers'?g.marketEconomy.markets[k].households:g.marketEconomy.markets[k].segmentDeposits;
   const owned=g.players.reduce((n,p)=>n+(resource==='customers'?p.householdBook.markets[k][segment]:
    p.depositBook.cohorts.filter(c=>c.market===k&&c.segment===segment).reduce((sum,c)=>sum+c.principal,0)),0);
   const supplied=b.openingWorld[k][resource][segment]+b.cumulativeIn[k][resource][segment]-b.cumulativeOut[k][resource][segment];
   const placed=moved[k][resource][segment],deposited=pools.community[segment]+pools.union[segment]+owned;
   if(!whole(supplied)||!whole(placed)||!whole(deposited)||supplied!==deposited+placed||pools.total[segment]!==deposited)
    throw Error('Investment savings and regional resources do not reconcile.');
   if(resource==='deposits')rows.push({market:k,segment,supplied,deposited,netOutflow:placed});
  }
  return rows;
 }
 function investmentFundingSource(p,market,segment){
  if(!p?.accounting||!p.depositBook||!p.householdBook?.markets[market]||!Object.hasOwn(CUSTOMER_SEGMENTS,segment))
   throw Error('An existing household deposit segment is required.');
  AccountingPrototype.check(p.accounting);
  const rows=p.depositBook.cohorts.filter(c=>c.market===market&&c.segment===segment&&!c.locked);
  return {households:p.householdBook.markets[market][segment],unlocked:rows.reduce((n,c)=>n+c.principal,0),cash:p.accounting.accounts.cash};
 }
 function investmentFundingReview(g,world,entities,links,order){
  InvestmentClients.validate(world,entities);investmentFundingValidateLinks(links,world);
  if(!exact(order,['clientId','amount','cycle',...(Object.hasOwn(order,'destination')?['destination']:[])])||
   Object.hasOwn(order,'destination')&&!['cash','securities',...(links.version===3?['return']:[])].includes(order.destination)||typeof order.clientId!=='string'||!whole(order.amount)||!order.amount||
   order.cycle!==g.cycle||world.month!==g.cycle)throw Error('Investment funding belongs to a different closing month.');
  const a=links.accounts.find(a=>a.clientId===order.clientId),client=world.clients.find(c=>c.id===order.clientId);
  if(!a||a.lastCycle>=order.cycle)throw Error('This investment funding authorization is missing or already settled this month.');
  const p=g.players.find(p=>p.id===a.bankId),institution=entities.find(e=>e.owner===a.bankId);
  if(order.destination==='return'){
   if(g.investmentCashVersion!==1||!p||client.owner!==p.id||!p.householdBook.markets[a.market][a.segment]||order.amount>a.limit||!Math.min(a.funded,client.cash))
    throw Error('Return requires this customer’s available cash and original funded bank account.');
   const paid=Math.min(order.amount,a.funded,client.cash);
   return {bankId:p.id,market:a.market,segment:a.segment,destination:'return',paid,requested:order.amount,remainingCash:p.accounting.accounts.cash+paid};
  }
  if(!p||client.owner!==p.id||client.missed!==0||!institution?.report?.permitted[client.service])throw Error('Funding requires this bank’s authorized, serviced investment relationship.');
  const funds=investmentFundingSource(p,a.market,a.segment);
  if(!funds.households||order.amount>a.limit||order.amount>funds.unlocked||order.amount>funds.cash)
   throw Error('Investment funding exceeds its authorized household savings or available bank cash.');
  const destination=order.destination||'securities',paid=destination==='cash'?order.amount:Math.min(Math.floor(order.amount/world.price),world.dealerUnits)*world.price;
  if(!paid)throw Error('No funded securities inventory is available.');
  if(world.suitabilityVersion===1&&destination==='securities')InvestmentSuitability.purchase(world,client,paid);
  return {bankId:p.id,market:a.market,segment:a.segment,destination,paid,requested:order.amount,remainingCash:funds.cash-paid,remainingSavings:funds.unlocked-paid};
 }
 function investmentFundingPurchase(g,world,entities,links,order){
  const q=investmentFundingReview(g,world,entities,links,order),next=copy(g),p=next.players.find(p=>p.id===q.bankId),authorizations=copy(links);
  const returning=q.destination==='return',sign=returning?-1:1;
  const r=(returning?InvestmentClients.returnCash:q.destination==='cash'?InvestmentClients.depositCash:InvestmentClients.depositPurchase)(world,entities,p.accounting,order.clientId,returning?q.paid:order.amount);
  if(r.paid!==q.paid)throw Error('Investment funding quote changed during settlement.');
  if(returning){p.depositBook.cohorts.push({market:q.market,segment:q.segment,principal:r.paid,product:'essential',exiting:0,remaining:0,quotedCycle:g.cycle,rate:depositRate(p,g,'essential')});compactDeposits(p);}
  else{const taken=takeDeposits(p,q.market,r.paid,false,q.segment);
   if(taken.reduce((n,c)=>n+c.principal,0)!==r.paid)throw Error('Investment funding did not remove matching deposit principal.');}
  const market=next.marketEconomy.markets[q.market];
  p.marketBook.markets[q.market].deposits-=sign*r.paid;
  // Investment funding crosses the deposit-system boundary; an explicit cash
  // return reverses that crossing. Neither direction credits an outside bank
  // or adds a household as ordinary competitive acquisition would do.
  market.total.deposits-=sign*r.paid;market.segmentDeposits.total[q.segment]-=sign*r.paid;
  if(!returning)p.stats.rateSensitiveDeposits=Math.max(0,p.stats.rateSensitiveDeposits-Math.floor(p.stats.rateSensitiveDeposits*r.paid/Math.max(1,p.stats.deposits)));
  p.accounting=r.bank;syncAccounts(p);
  const a=authorizations.accounts.find(a=>a.clientId===order.clientId);a.lastCycle=order.cycle;a.funded+=sign*r.paid;
  authorizations.transfers.push({clientId:a.clientId,bankId:a.bankId,market:a.market,segment:a.segment,cycle:order.cycle,amount:r.paid,destination:q.destination});
  investmentFundingValidateLinks(authorizations,r.world);
  investmentFundingRegionalResources(next,r.world,r.entities,authorizations);
  return {campaign:next,world:r.world,entities:r.entities,links:authorizations,quote:q};
 }
 function investmentFundingApply(g,world,entities,links,order){
  const q=investmentFundingReview(g,world,entities,links,order),p=g.players.find(p=>p.id===q.bankId),trace=productPricingTraces.get(p);
  if(!trace||trace.cycle!==g.cycle||trace.depth)throw Error('Investment funding may only commit during the ordered deposit closing.');
  // Prepare every fallible financial step first. Keep the actual player object
  // alive when committing so the current pricing trace is not detached.
  const r=investmentFundingPurchase(g,world,entities,links,order),next=r.campaign.players.find(p=>p.id===q.bankId);
  traceProductDeposits(p,q.destination==='return'?'outsideOther':'outsideWithdrawals',()=>{
   p.accounting=next.accounting;p.depositBook=next.depositBook;p.marketBook=next.marketBook;p.stats=next.stats;
   g.marketEconomy.markets[q.market]=r.campaign.marketEconomy.markets[q.market];
  });
  return {world:r.world,entities:r.entities,links:r.links,quote:r.quote};
 }
 return Object.freeze({source:investmentFundingSource,validateLinks:investmentFundingValidateLinks,regionalResources:investmentFundingRegionalResources,review:investmentFundingReview,purchase:investmentFundingPurchase,apply:investmentFundingApply});
})();
