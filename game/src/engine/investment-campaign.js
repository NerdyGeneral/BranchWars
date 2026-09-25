// Versioned investment lifecycle. Setup exposure follows the complete asset gate;
// historical campaigns never acquire this marker or these books on loading.
const investmentCopy=x=>JSON.parse(JSON.stringify(x));
const investmentWhole=n=>Number.isSafeInteger(n)&&n>=0;
const investmentExact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
function investmentSweepDeposits(p,market=null){return Object.entries(p.investmentSweepDeposits||{}).reduce((n,[k,v])=>n+(market===null||market===k?v:0),0);}
function nonHouseholdDepositBalance(p,market=null){return commercialAccountBalance(p,market)+investmentSweepDeposits(p,market);}
function nonHouseholdMarketDeposits(g,market){return (g.players||[]).reduce((n,p)=>n+nonHouseholdDepositBalance(p,market),0);}
function investmentSweepMarketBook(world,id,territories){
 const totals=Object.fromEntries(Object.keys(territories).map(k=>[k,0]));
 for(const a of world.cashRoutes.accounts)if(a.bankId===id){const market=world.clients.find(c=>c.id===a.clientId)?.market;if(!Object.hasOwn(totals,market))throw Error('Foreign sweep deposit market.');totals[market]+=a.deposit;}
 return totals;
}
function initializeInvestmentServices(g,o){
 if(o.investmentServicesVersion!==1)return;
 if(g.facilityExtensionsVersion!==1)throw Error('Investment services require the current Expanded foundation.');
 g.investmentServicesVersion=1;
 const positions=[],accounts=[];
 // These are representative accounts within existing reserve-household
 // cohorts, not new households or an endowed outside investment portfolio.
 for(const p of g.players){
  // Current capability spending is authoritative. Do not create the obsolete
  // pre-capability ladder that historical migration removes on first load.
  delete p.strategy;
  p.investmentBusiness=InvestmentInstitution.opening(p.id);
  p.investmentReport=null;
  for(const market of Object.keys(g.territories).sort()){
   const source=InvestmentBankFunding.source(p,market,'reserve'),count=Math.min(10,source.households);
   for(let i=0;i<count;i++){
    const id=p.id+':invest:'+market+':'+i;
    positions.push({id,market,service:i%3===0?'brokerage':'advice',units:0,custodian:'atlas'});
    accounts.push({clientId:id,bankId:p.id,market,segment:'reserve',limit:Math.max(1,Math.min(25000,Math.floor(source.unlocked/Math.max(1,source.households)/5))),lastCycle:0,funded:0});
   }
  }
 }
 g.investmentEconomy={version:1,world:InvestmentClients.opening(positions,GroupAccounting.opening('investment:dealer')),
  supplier:GroupAccounting.opening('investment:suppliers'),links:{version:2,accounts,transfers:[]},parentCashNet:0};
 if(o.investmentAssetsVersion===1){
  g.investmentAssetsVersion=1;
  const capital=Math.min(1000000,Math.floor(g.companyEconomy.outside.accounts.cash/10));
  const market=InvestmentCorporateMarket.opening(g.companyEconomy,positions,capital);
  g.companyEconomy=market.company;g.investmentEconomy.world=InvestmentClients.backedOpening(market.world);
  g.players.forEach(p=>p.investmentAssetReport=null);
 }
 if(o.investmentCashVersion===1){g.investmentCashVersion=1;g.investmentEconomy.links.version=3;g.players.forEach(p=>p.investmentCashVersion=1);}
 if(o.investmentSweepVersion===1){
  g.investmentSweepVersion=1;g.investmentEconomy.world=InvestmentClients.cashOpening(g.investmentEconomy.world,g.players.map(p=>p.investmentBusiness));
  g.players.forEach(p=>{p.investmentSweepVersion=1;p.investmentSweepDeposits=investmentSweepMarketBook(g.investmentEconomy.world,p.id,g.territories);});
 }
 if(o.investmentChoiceVersion===1){g.investmentChoiceVersion=1;g.investmentEconomy.world.choiceVersion=1;}
 if(o.investmentIncomeVersion===1){
  g.investmentIncomeVersion=1;g.investmentEconomy.world.income=InvestmentIncome.opening(g.investmentEconomy.world.clients);
  g.investmentEconomy.world.cashRoutes.incomeReceived=0;
  g.companyEconomy.investmentMarket={...g.companyEconomy.investmentMarket,version:2,incomePaid:0};
 }
 if(o.investmentSuitabilityVersion===1){g.investmentSuitabilityVersion=1;g.investmentEconomy.world.suitabilityVersion=1;}
 if(o.investmentTradingVersion===1){g.investmentTradingVersion=1;g.investmentEconomy.world.trading={version:1,month:0,receipts:[]};g.players.forEach(p=>p.investmentTradingVersion=1);}
 if(o.investmentNotesVersion===1){g.investmentNotesVersion=1;g.investmentEconomy.world.notes=InvestmentNotes.opening();g.players.forEach(p=>p.investmentNotesVersion=1);}
}
function defaultInvestmentPlan(p){
 return {...(p.investmentNotesVersion===1?{notes:[]}:{}),...(p.investmentTradingVersion===1?{trades:[]}:{}),institution:InvestmentInstitution.defaults(p.investmentBusiness),market:p.focus,pursue:false,close:false,funding:[],...(p.investmentAssetReport!==undefined?{inventorySale:0}:{}),...(p.investmentSweepVersion===1?{cashOrders:[]}:{})};
}
function investmentPlanReview(p,input,rules=null){
 const plan=investmentCopy(input);normalizeInvestmentPlan(p,plan,rules);normalizeGroupPlan(p,plan);normalizeAgencyPlan(p,plan);
 return {plan,quote:InvestmentInstitution.quote(p.investmentBusiness,plan.investmentPolicy.institution,p.investmentBusiness.month+1)};
}
function investmentViewPosition(p,client){
 const a=p.investmentSnapshot.cashPositions.find(a=>a.clientId===client.id);
 return {...a,value:a.value+(p.investmentSnapshot.notes?InvestmentNotes.claims(p.investmentSnapshot.notes,client.id):0)};
}
function normalizeInvestmentPlan(p,plan,g=null){
 if(!p.investmentBusiness){if(plan.investmentPolicy!==undefined)throw Error('Investment instructions require a versioned investment campaign.');return;}
 const s=plan.investmentPolicy===undefined?defaultInvestmentPlan(p):investmentCopy(plan.investmentPolicy);
 if(!investmentExact(s,[...(p.investmentNotesVersion===1?['notes']:[]),...(p.investmentTradingVersion===1?['trades']:[]),'institution','market','pursue','close','funding',...(p.investmentAssetReport!==undefined?['inventorySale']:[]),...(p.investmentSweepVersion===1?['cashOrders']:[])])||typeof s.market!=='string'||!Object.hasOwn(p.householdBook.markets,s.market)||
  typeof s.pursue!=='boolean'||typeof s.close!=='boolean'||!Array.isArray(s.funding)||s.funding.length>16)throw Error('Invalid investment instructions.');
 if(p.investmentAssetReport!==undefined&&(!investmentWhole(s.inventorySale)||s.inventorySale>p.accounting.accounts.securities))throw Error('Inventory offer exceeds current bank securities.');
 s.institution=InvestmentSettlement.prepareClosure(p.investmentBusiness,s.institution,s.close);
 const ids=new Set();
 for(const f of s.funding){
  if(!investmentExact(f,['clientId','amount','destination'])||typeof f.clientId!=='string'||f.clientId.length>80||ids.has(f.clientId)||
   !investmentWhole(f.amount)||!f.amount||f.amount>1000000||!['cash','securities',...(p.investmentCashVersion===1?['return']:[])].includes(f.destination))throw Error('Invalid or duplicated investment funding order.');
  ids.add(f.clientId);
  if(g?.investmentSuitabilityVersion===1&&f.destination==='securities'){
   const world=g.investmentEconomy?.world,accountView=p.investmentSnapshot;
   const client=(accountView?.clients||world?.clients||[]).find(c=>c.id===f.clientId&&c.owner===p.id);
   if(!client)throw Error('Securities funding requires your existing investment relationship.');
   const price=accountView?.price||world.price,position=accountView?investmentViewPosition(p,client):InvestmentSuitability.position(world,client);
   const fit=InvestmentSuitability.assess(client,price,position);
   if(Math.floor(f.amount/price)*price>fit.purchaseLimit)throw Error('This customer needs more liquid reserves. Review their investment mandate before buying securities.');
  }
 }
 if(s.close&&s.funding.length)throw Error('Do not fund new client assets while closing the business.');
 if(p.investmentTradingVersion===1){
  if(!Array.isArray(s.trades))throw Error('Portfolio instructions must be a list of account orders.');
  InvestmentTrading.orders(s.trades.map(o=>({...o,owner:p.id})));
  if(s.trades.length>16||s.trades.some(o=>!investmentExact(o,['clientId','side','amount'])))throw Error('Invalid portfolio instructions.');
  if(s.close&&s.trades.length)throw Error('Do not place portfolio orders while closing the business.');
  const clients=p.investmentSnapshot?.clients||g?.investmentEconomy?.world.clients;
  if(clients&&s.trades.some(o=>!clients.some(c=>c.id===o.clientId&&c.owner===p.id)))throw Error('Portfolio orders require your existing client relationship.');
  if(p.investmentSnapshot)for(const order of s.trades){const c=clients.find(c=>c.id===order.clientId),q=InvestmentTrading.quote(c,p.investmentSnapshot.price,investmentViewPosition(p,c),order.side,order.amount);
   if(!q.wanted)throw Error('No current portfolio fill: '+q.reason+'. Review this account’s cash, holdings and mandate.');
  }
 }
 if(p.investmentNotesVersion===1){
  if(!Array.isArray(s.notes)||s.notes.length>16||new Set(s.notes.map(o=>o.clientId)).size!==s.notes.length||s.notes.some(o=>!investmentExact(o,['clientId','product','amount'])||typeof o.clientId!=='string'||!o.clientId||o.clientId.length>80||!Object.hasOwn(InvestmentNotes.products,o.product)||!investmentWhole(o.amount)||o.amount<100||o.amount>1000000||o.amount%100))throw Error('Invalid fixed-term note orders.');
  if(s.close&&s.notes.length)throw Error('Do not subscribe to notes while closing the business.');
  const clients=p.investmentSnapshot?.clients||g?.investmentEconomy?.world.clients;
  if(clients&&s.notes.some(o=>!clients.some(c=>c.id===o.clientId&&c.owner===p.id)))throw Error('Note orders require your existing client relationship.');
  if(p.investmentSnapshot)for(const order of s.notes){const c=clients.find(c=>c.id===order.clientId),q=InvestmentNotes.quote(c,p.investmentSnapshot.price,investmentViewPosition(p,c),order.product,order.amount,Math.round((g?.economy?.rate||0)*100));if(!q.amount)throw Error('No current note subscription: '+q.reason+'. Review client cash and mandate.');}
 }
 if(p.investmentSweepVersion===1){
  if(!Array.isArray(s.cashOrders)||s.cashOrders.length>3000||new Set(s.cashOrders.map(x=>x.clientId)).size!==s.cashOrders.length||s.cashOrders.some(x=>!investmentExact(x,['clientId','mode','buffer'])||typeof x.clientId!=='string'||!x.clientId||x.clientId.length>80||!InvestmentCashRoutes.modes.includes(x.mode)||!investmentWhole(x.buffer)||x.buffer>1000000))throw Error('Invalid standing cash arrangements.');
  if(s.close&&s.cashOrders.length)throw Error('Do not change standing cash arrangements while closing.');
  const clients=p.investmentSnapshot?.clients||g?.investmentEconomy?.world.clients;
  if(clients&&s.cashOrders.some(o=>!clients.some(c=>c.id===o.clientId&&c.owner===p.id)))throw Error('Cash instructions belong to another investment provider.');
 }
 const other=(plan.groupPolicy?.bankSupport||0)+(plan.agencyPolicy?.capital||0)+(plan.agencyPolicy?.supportCap||0);
 if(s.institution.capital>Math.max(0,p.financialGroup.parent.accounts.cash-other))throw Error('Investment capital exceeds unreserved parent cash.');
 const q=InvestmentInstitution.quote(p.investmentBusiness,s.institution,p.investmentBusiness.month+1);
 if(s.institution.dividend>(q.dividendLimit||0))throw Error('Investment dividend exceeds retained earnings after operating bills and reserves.');
 if((s.institution.launch||q.hires||q.upfront)&&s.institution.capital<q.requiredFunding)throw Error('Investment commitments need funded operating and capital reserves.');
 plan.investmentPolicy=s;
}
function investmentSavingsOutflows(g){
 if(g.investmentServicesVersion===undefined){if(g.investmentEconomy!==undefined)throw Error('Unversioned investment resource books.');return null;}
 if(g.investmentServicesVersion!==1||!g.investmentEconomy)throw Error('Unsupported investment resource version.');
 InvestmentBankFunding.validateLinks(g.investmentEconomy.links,g.investmentEconomy.world);
 const totals=Object.fromEntries(Object.keys(g.territories).map(k=>[k,emptyDepositSegments()]));
 for(const t of g.investmentEconomy.links.transfers){if(!totals[t.market])throw Error('Foreign investment source market.');totals[t.market][t.segment]+=t.destination==='return'?-t.amount:t.amount;}
 return totals;
}
function validateInvestmentServices(g,settling=false){
 if(g.investmentNotesVersion===1){if(g.investmentTradingVersion!==1||g.investmentEconomy?.world?.notes?.version!==1||g.players.some(p=>p.investmentNotesVersion!==1))throw Error('Term notes require matching funded portfolio rules.');}
 else if(g.investmentNotesVersion!==undefined||g.investmentEconomy?.world?.notes!==undefined||g.players.some(p=>p.investmentNotesVersion!==undefined))throw Error('Unversioned investment notes.');
 if(g.investmentTradingVersion===1){
  if(g.investmentSuitabilityVersion!==1||g.investmentEconomy?.world?.trading?.version!==1||g.players.some(p=>p.investmentTradingVersion!==1))throw Error('Portfolio trading requires matching customer and investment rules.');
 }else if(g.investmentTradingVersion!==undefined||g.investmentEconomy?.world?.trading!==undefined||g.players.some(p=>p.investmentTradingVersion!==undefined))throw Error('Unversioned portfolio trading.');
 if(g.investmentSuitabilityVersion===1){
  if(g.investmentIncomeVersion!==1||g.investmentEconomy?.world?.suitabilityVersion!==1)throw Error('Suitability requires matching funded-income and customer rules.');
 }else if(g.investmentSuitabilityVersion!==undefined||g.investmentEconomy?.world?.suitabilityVersion!==undefined)throw Error('Unversioned investment suitability.');
 if(g.investmentIncomeVersion===1){
  const w=g.investmentEconomy?.world;
  if(g.investmentChoiceVersion!==1||!w?.income||w.income.month!==w.month||g.companyEconomy?.investmentMarket?.version!==2)throw Error('Investment income requires a completed matching distribution ledger.');
 }else if(g.investmentIncomeVersion!==undefined||g.investmentEconomy?.world?.income!==undefined||g.companyEconomy?.investmentMarket?.version===2)throw Error('Unversioned investment distributions.');
 if(g.investmentChoiceVersion===1){
  if(g.investmentSweepVersion!==1||g.investmentEconomy?.world.choiceVersion!==1)throw Error('Investment customer choice requires its matching cash and account rules.');
 }else if(g.investmentChoiceVersion!==undefined||g.investmentEconomy?.world.choiceVersion!==undefined)throw Error('Unversioned investment customer preferences.');
 if(g.investmentSweepVersion===1){
  if(g.investmentCashVersion!==1||g.investmentEconomy?.world.version!==3||g.players.some(p=>p.investmentSweepVersion!==1))throw Error('Invalid standing investment cash rules.');
  const w=g.investmentEconomy.world;
  InvestmentCashRoutes.validate(w.cashRoutes,w.clients,g.players.map(p=>({id:p.id,book:p.accounting,work:0})),{dealer:w.dealer,units:w.dealerUnits,price:w.price});
  for(const p of g.players){const balances=investmentSweepMarketBook(w,p.id,g.territories);
   if(!investmentExact(p.investmentSweepDeposits,Object.keys(balances))||Object.entries(balances).some(([k,n])=>p.investmentSweepDeposits[k]!==n))throw Error('Sweep claims disagree with bank market deposits.');
   if(p.submitted?.investmentPolicy?.cashOrders?.some(o=>!w.clients.some(c=>c.id===o.clientId&&c.owner===p.id)))throw Error('Cash instructions belong to another investment provider.');
  }
 }else if(g.investmentSweepVersion!==undefined||g.investmentEconomy?.world.version===3||g.players.some(p=>p.investmentSweepVersion!==undefined||p.investmentSweepDeposits!==undefined))throw Error('Unversioned standing investment cash rules.');
 if(g.investmentCashVersion===1){if(g.investmentAssetsVersion!==1||g.investmentEconomy?.links.version!==3||g.players.some(p=>p.investmentCashVersion!==1))throw Error('Invalid investment cash return rules.');}
 else if(g.investmentCashVersion!==undefined||g.investmentEconomy?.links.version===3||g.players.some(p=>p.investmentCashVersion!==undefined))throw Error('Unversioned investment cash return rules.');
 if(g.investmentServicesVersion===undefined){
  if(g.investmentAssetsVersion!==undefined||g.investmentEconomy!==undefined||g.players.some(p=>p.investmentBusiness!==undefined||p.investmentReport!==undefined||p.investmentAssetReport!==undefined))throw Error('Unversioned investment services.');return;
 }
 const e=g.investmentEconomy,month=g.cycle-(g.gameOver?0:1),entities=g.players.map(p=>p.investmentBusiness);
 if(g.investmentServicesVersion!==1||g.facilityExtensionsVersion!==1||!investmentExact(e,['version','world','supplier','links','parentCashNet'])||e.version!==1||
  !Number.isSafeInteger(e.parentCashNet)||(!settling&&e.world.month!==month)||(settling&&![g.cycle-1,g.cycle].includes(e.world.month)))throw Error('Invalid investment campaign lifecycle.');
 InvestmentClients.validate(e.world,entities);InvestmentBankFunding.validateLinks(e.links,e.world);GroupAccounting.validate(e.supplier);
 if(g.investmentAssetsVersion===1){
  if(e.world.version!==(g.investmentSweepVersion===1?3:2))throw Error('Backed investment assets require their source ledger.');
  InvestmentCorporateMarket.validate(g.companyEconomy,e.world,entities);
  for(const t of e.world.securitySources)if(!g.players.some(p=>p.id===t.bankId))throw Error('Foreign bank inventory source.');
 }else if(g.investmentAssetsVersion!==undefined||e.world.version!==1||e.world.openingCash!==0||e.world.issuedUnits!==0||e.world.outsideCashNet!==0||e.world.outsideUnits!==0||g.players.some(p=>p.investmentAssetReport!==undefined))throw Error('Unsupported investment opening assets or counterparties.');
 if(e.supplier.entityId!=='investment:suppliers')throw Error('Invalid investment supplier.');
 const routeCash=e.world.version===3?BigInt(e.world.cashRoutes.received)-BigInt(e.world.cashRoutes.returned)-BigInt(e.world.cashRoutes.tradingNet)+BigInt(e.world.cashRoutes.incomeReceived||0):0n;
 const cash=entities.reduce((n,b)=>n+BigInt(b.book.accounts.cash),0n)+BigInt(e.supplier.accounts.cash)+BigInt(e.world.dealer.accounts.cash)+e.world.clients.reduce((n,c)=>n+BigInt(c.cash),0n)+routeCash;
 if(cash+BigInt(sharedPremisesTotal(g,'investmentRent'))!==BigInt(e.parentCashNet)+BigInt(e.world.bankCashNet)+BigInt(e.world.openingCash)+BigInt(e.world.outsideCashNet)+BigInt([2,3].includes(e.world.version)?e.world.bankSecuritiesNet:0)||e.supplier.accounts.businessAssets!==entities.reduce((n,b)=>n+b.book.accounts.payables,0))throw Error('Investment operating funds and creditors do not reconcile.');
 for(const [i,p]of g.players.entries()){
  if(entities[i].owner!==p.id)throw Error('Investment business belongs to another bank.');
  validateInvestmentReport(p.investmentReport,e.world.month,g.investmentCashVersion===1);
  if(g.investmentAssetsVersion===1){
   validateInvestmentAssetReport(p.investmentAssetReport,e.world.month);
   const receipts=e.world.securitySources.filter(s=>s.bankId===p.id&&s.month===e.world.month),r=p.investmentAssetReport;
   if(receipts.reduce((n,t)=>n+t.paid,0)!==(r?.paid||0)||receipts.reduce((n,t)=>n+t.units,0)!==(r?.units||0))throw Error('Bank inventory report has no matching source.');
  }
  if(p.investmentReport){
   const receipts=e.links.transfers.filter(t=>t.bankId===p.id&&t.cycle===e.world.month),paid=p.investmentReport.transfers.filter(t=>t.paid>0);
   if(receipts.length!==paid.length||paid.some(t=>!receipts.some(r=>r.clientId===t.clientId&&r.amount===t.paid&&r.destination===t.destination)))throw Error('Investment funding report has no matching cash transfer.');
  }
  if(p.investmentSnapshot!==undefined)throw Error('Projected investment data cannot be saved as authoritative state.');
  if(p.submitted){
   normalizeInvestmentPlan(p,investmentCopy(p.submitted));
   if(p.submitted.investmentPolicy?.notes?.some(o=>!e.world.clients.some(c=>c.id===o.clientId&&c.owner===p.id)))throw Error('Note orders require your existing client relationship.');
  }
 }
 for(const a of e.links.accounts)if(!g.players.some(p=>p.id===a.bankId)||!g.territories[a.market])throw Error('Foreign investment funding source.');
 InvestmentBankFunding.regionalResources(g,e.world,entities,e.links);
}
function investmentSettlementRequest(g,plans){
 const before=g.investmentEconomy,parents=g.players.map(p=>p.financialGroup.parent),entities=g.players.map(p=>p.investmentBusiness);
 const policies=plans.map((plan,i)=>plan.investmentPolicy||defaultInvestmentPlan(g.players[i]));
 return {policies,input:{parents,entities,world:before.world,supplier:before.supplier,...(g.investmentSweepVersion===1?{banks:g.players.map(p=>({id:p.id,book:p.accounting}))}:{})},
  offers:policies.map((s,i)=>({owner:g.players[i].id,market:s.market,reputation:g.players[i].stats.reputation,pursue:s.pursue})),
  options:{...(g.investmentNotesVersion===1?{noteOrders:policies.flatMap((s,i)=>s.notes.map(o=>({...o,owner:g.players[i].id}))),noteAnnualBp:Math.round(g.economy.rate*100)}:{}),...(g.investmentTradingVersion===1?{trades:policies.flatMap((s,i)=>s.trades.map(o=>({...o,owner:g.players[i].id})))}:{}),reservedParentCash:[0,0],close:policies.map(s=>s.close),...(g.investmentSweepVersion===1?{cashOrders:policies.flatMap((s,i)=>s.cashOrders.map(o=>({...o,owner:g.players[i].id})))}:{})}};
}
function settleInvestmentServices(g,plans,prepared=null,premises,distress){
 if(g.investmentServicesVersion!==1)return [];
 const before=g.investmentEconomy,request=investmentSettlementRequest(g,plans),{policies}=request,parents=request.input.parents;
 const next=prepared===null?InvestmentSettlement.advance(request.input,policies.map(s=>s.institution),request.offers,before.world.price,request.options):
  InvestmentSettlement.finish({...prepared,parents,entities:request.input.entities,...(request.input.banks?{banks:request.input.banks}:{})},request.offers,before.world.price,request.options,premises,distress);
 if(g.investmentSweepVersion===1){
  // The entire paired settlement above is prepared before these balance-sheet
  // changes are adopted. Household cohorts and identities are not swept twice.
  for(const [i,p]of g.players.entries()){
   const balances=investmentSweepMarketBook(next.world,p.id,g.territories);
   for(const [k,n]of Object.entries(balances)){const sweepDepositChange=n-p.investmentSweepDeposits[k];p.marketBook.markets[k].deposits+=sweepDepositChange;g.marketEconomy.markets[k].total.deposits+=sweepDepositChange;}
   p.investmentSweepDeposits=balances;p.accounting=next.banks[i].book;syncAccounts(p);
  }
 }
 const parentNet=parents.reduce((n,b,i)=>n+b.accounts.cash-next.parents[i].accounts.cash,0),lines=[];
 g.investmentEconomy={...before,world:next.world,supplier:next.supplier,parentCashNet:before.parentCashNet+parentNet};
 g.players.forEach((p,i)=>{p.financialGroup.parent=next.parents[i];p.investmentBusiness=next.entities[i];p.investmentReport={cycle:g.cycle,transfers:[]};});
 if(g.investmentIncomeVersion===1){
  // Record-date holders are determined after servicing and cash placement, but
  // before this month's new bank inventory and one-time customer funding.
  const income=InvestmentCorporateMarket.distribute(g.companyEconomy,g.investmentEconomy.world,g.players.map(p=>p.investmentBusiness),Math.round(g.economy.rate*100));
  g.companyEconomy=income.company;g.investmentEconomy.world=income.world;g.players.forEach((p,i)=>p.investmentBusiness=income.entities[i]);
 }
 if(g.investmentAssetsVersion===1){
  // Equal-price offers share the dealer's existing cash pro rata. Neither seat
  // receives a first-mover advantage, and no current offer funds the other bank.
  const available=Math.floor(g.investmentEconomy.world.dealer.accounts.cash/100);
  const wanted=policies.map((s,i)=>Math.floor(Math.min(s.inventorySale,g.players[i].accounting.accounts.securities)/100)),total=wanted[0]+wanted[1];
  const quotas=wanted.map(n=>total>available?Number(BigInt(n)*BigInt(available)/BigInt(total)):n);
  for(const [i,p]of g.players.entries()){
   const r=InvestmentClients.stockFromBank(g.investmentEconomy.world,g.players.map(p=>p.investmentBusiness),p.accounting,p.id,quotas[i]*100);
   p.accounting=r.bank;syncAccounts(p);g.investmentEconomy.world=r.world;
   p.investmentAssetReport={cycle:g.cycle,requested:policies[i].inventorySale,units:r.units,paid:r.paid};
  }
 }
 for(const [i,s]of policies.entries())for(const order of s.funding){
  const e=g.investmentEconomy,live=g.players.map(p=>p.investmentBusiness),request={...order,cycle:g.cycle};
  const authorization=e.links.accounts.find(a=>a.clientId===order.clientId);
  const report=g.players[i].investmentReport.transfers;
  if(authorization?.bankId!==g.players[i].id){report.push({...order,paid:0,reason:'Source belongs to another bank.'});continue;}
  // Rival outcomes, current bank liquidity and service eligibility may change.
  // Invalid/delayed funding is refused, never funded by a new loan or gift.
  try{InvestmentBankFunding.review(g,e.world,live,e.links,request);}catch(error){report.push({...order,paid:0,reason:error.message});continue;}
  const clientFundingTransfer=InvestmentBankFunding.apply(g,e.world,live,e.links,request);
  g.investmentEconomy={...e,world:clientFundingTransfer.world,links:clientFundingTransfer.links};g.players.forEach((p,n)=>p.investmentBusiness=clientFundingTransfer.entities[n]);
  report.push({...order,paid:clientFundingTransfer.quote.paid,reason:order.destination==='return'?'Returned client cash to its original bank deposit account.':'Funded from existing unlocked savings.'});
 }
 validateInvestmentServices(g,true);return lines;
}
function validateInvestmentReport(r,month,cashReturns=false){
 if(month===0){if(r!==null)throw Error('Unexpected opening investment report.');return;}
 if(!investmentExact(r,['cycle','transfers'])||r.cycle!==month||!Array.isArray(r.transfers)||r.transfers.length>16)throw Error('Invalid investment funding report.');
 const ids=new Set();for(const t of r.transfers){
  if(!investmentExact(t,['clientId','amount','destination','paid','reason'])||typeof t.clientId!=='string'||t.clientId.length>80||ids.has(t.clientId)||
   !investmentWhole(t.amount)||!t.amount||!investmentWhole(t.paid)||t.paid>t.amount||!['cash','securities',...(cashReturns?['return']:[])].includes(t.destination)||typeof t.reason!=='string'||t.reason.length>240)throw Error('Invalid investment transfer result.');
  ids.add(t.clientId);
 }
}
function validateInvestmentAssetReport(r,month){
 if(month===0){if(r!==null)throw Error('Unexpected opening investment asset report.');return;}
 if(!investmentExact(r,['cycle','requested','units','paid'])||r.cycle!==month||!Object.values(r).every(investmentWhole)||r.paid>r.requested||r.paid!==r.units*100)throw Error('Invalid bank securities sale report.');
}
function projectInvestmentServices(g,out,index){
 if(g.investmentServicesVersion!==1)return;
 if(g.investmentStrategyVersion===1)out.investmentStrategyVersion=1;
 if(g.investmentNotesVersion===1){out.investmentNotesVersion=1;out.me.investmentNotesVersion=1;}
 if(g.investmentTradingVersion===1){out.investmentTradingVersion=1;out.me.investmentTradingVersion=1;}
 if(g.investmentSuitabilityVersion===1)out.investmentSuitabilityVersion=1;
 if(g.investmentChoiceVersion===1)out.investmentChoiceVersion=1;
 if(g.investmentIncomeVersion===1)out.investmentIncomeVersion=1;
 out.investmentServicesVersion=1;out.me.investmentBusiness=investmentCopy(g.players[index].investmentBusiness);
 out.me.investmentReport=investmentCopy(g.players[index].investmentReport);
 if(g.investmentCashVersion===1){out.investmentCashVersion=1;out.me.investmentCashVersion=1;}
 if(g.investmentAssetsVersion===1){out.investmentAssetsVersion=1;out.me.investmentAssetReport=investmentCopy(g.players[index].investmentAssetReport);}
 out.me.investmentSnapshot={price:g.investmentEconomy.world.price,performance:investmentCopy(g.investmentEconomy.world.reports.find(r=>r.owner===out.me.id)||null),clients:investmentCopy(g.investmentEconomy.world.clients.filter(c=>c.owner===out.me.id)),
  funding:investmentCopy(g.investmentEconomy.links.accounts.filter(a=>a.bankId===out.me.id))};
 if(g.investmentTradingVersion===1)out.me.investmentSnapshot.trading={...investmentCopy(g.investmentEconomy.world.trading),receipts:investmentCopy(g.investmentEconomy.world.trading.receipts.filter(r=>r.owner===out.me.id))};
 if(g.investmentNotesVersion===1){const w=g.investmentEconomy.world,n=w.notes,owned=new Set(out.me.investmentSnapshot.clients.map(c=>c.id)),a=w.dealer.accounts;
  out.me.investmentSnapshot.notes={month:n.month,positions:investmentCopy(n.positions.filter(p=>owned.has(p.clientId))),report:investmentCopy(n.report.filter(r=>owned.has(r.clientId))),execution:investmentCopy(n.execution.filter(r=>r.owner===out.me.id)),issuer:{cash:a.cash,securities:a.businessAssets,equity:a.equity,principal:a.debt,interestDue:a.payables,issueRoom:InvestmentNotes.room(w.dealer)}};
 }
 if(g.investmentSweepVersion===1){
  out.investmentSweepVersion=1;out.me.investmentSweepVersion=1;out.me.investmentSweepDeposits=investmentCopy(g.players[index].investmentSweepDeposits);
  const w=g.investmentEconomy.world,owned=new Set(out.me.investmentSnapshot.clients.map(c=>c.id));
  out.me.investmentSnapshot.cashPositions=w.cashRoutes.accounts.filter(a=>owned.has(a.clientId)).map(a=>{
   const r=w.cashRoutes.report.find(r=>r.clientId===a.clientId);
   return {...investmentCopy(a),value:InvestmentCashRoutes.value(w.cashRoutes,a.clientId,w.price),lastResult:r?{placed:r.placed,released:r.released,reason:r.reason}:null};
  });
 }
 if(out.lastPlans?.[out.rival.id])delete out.lastPlans[out.rival.id].investmentPolicy;
 if(g.investmentIncomeVersion===1){
  const income=g.investmentEconomy.world.income;
  out.me.investmentSnapshot.income={month:income.month,annualBp:income.annualBp,accounts:out.me.investmentSnapshot.clients.map(c=>{
   const a=income.accounts.find(a=>a.id===c.id),r=income.report.find(r=>r.id===c.id);
   const cash=g.investmentEconomy.world.cashRoutes,shares=cash.accounts.find(a=>a.clientId===c.id).shares,fundPaid=income.report.find(r=>r.id==='$fund')?.paid||0;
   const fundIncome=cash.fund.shares?Number(BigInt(fundPaid)*BigInt(shares)/BigInt(cash.fund.shares)):0;
   return {clientId:c.id,totalPaid:a.paid,lastPaid:r?.paid||0,lastDue:r?.due||0,fundIncome};
  })};
 }
}
function validateInvestmentServicesView(v){
 if(v.investmentNotesVersion===1){if(v.investmentTradingVersion!==1||v.me?.investmentNotesVersion!==1)throw Error('Invalid investment note view.');}
 else if(v.investmentNotesVersion!==undefined||v.me?.investmentNotesVersion!==undefined||v.me?.investmentSnapshot?.notes!==undefined)throw Error('Unversioned investment note view.');
 if(v.rival?.investmentNotesVersion!==undefined)throw Error('Private note instructions exposed.');
 if(v.investmentTradingVersion===1){if(v.investmentSuitabilityVersion!==1||v.me?.investmentTradingVersion!==1)throw Error('Invalid portfolio trading view.');}
 else if(v.investmentTradingVersion!==undefined||v.me?.investmentTradingVersion!==undefined||v.me?.investmentSnapshot?.trading!==undefined)throw Error('Unversioned portfolio trading view.');
 if(v.rival?.investmentTradingVersion!==undefined)throw Error('Private portfolio metadata exposed.');
 if(v.investmentSuitabilityVersion!==1&&v.me?.investmentSnapshot?.cashPositions?.some(a=>a.lastResult?.reason==='suitability'))throw Error('Unversioned suitability restriction in cash view.');
 if(v.investmentSuitabilityVersion!==undefined&&(v.investmentSuitabilityVersion!==1||v.investmentIncomeVersion!==1)||v.me?.investmentSuitabilityVersion!==undefined||v.rival?.investmentSuitabilityVersion!==undefined)throw Error('Invalid investment suitability view.');
 if(v.investmentIncomeVersion===1){
  if(v.investmentChoiceVersion!==1)throw Error('Investment income view lacks its campaign rules.');
 }else if(v.investmentIncomeVersion!==undefined||v.me?.investmentSnapshot?.income!==undefined)throw Error('Unversioned investment income view.');
 if(v.me?.investmentIncomeVersion!==undefined||v.rival?.investmentIncomeVersion!==undefined)throw Error('Private income metadata exposed.');
 if(v.investmentChoiceVersion!==undefined&&(v.investmentChoiceVersion!==1||v.investmentSweepVersion!==1)||v.rival?.investmentChoiceVersion!==undefined||v.me?.investmentChoiceVersion!==undefined)throw Error('Invalid investment customer choice view.');
 if(v.rival?.investmentSweepVersion!==undefined||v.rival?.investmentSweepDeposits!==undefined)throw Error('Private investment sweep metadata exposed.');
 if(v.investmentSweepVersion===1){if(v.investmentCashVersion!==1||v.me?.investmentSweepVersion!==1||!investmentExact(v.me.investmentSweepDeposits,Object.keys(v.territories))||!Object.values(v.me.investmentSweepDeposits).every(investmentWhole))throw Error('Invalid investment sweep view.');}
 else if(v.investmentSweepVersion!==undefined||v.me?.investmentSweepVersion!==undefined||v.me?.investmentSweepDeposits!==undefined||v.me?.investmentSnapshot?.cashPositions!==undefined)throw Error('Unversioned investment sweep view.');
 if(v.rival?.investmentCashVersion!==undefined)throw Error('Private investment cash metadata exposed.');
 if(v.investmentCashVersion===1){if(v.investmentAssetsVersion!==1||v.me?.investmentCashVersion!==1)throw Error('Invalid investment cash return view.');}
 else if(v.investmentCashVersion!==undefined||v.me?.investmentCashVersion!==undefined)throw Error('Unversioned investment cash return view.');
 if(v.rival?.investmentAssetReport!==undefined)throw Error('Private inventory sale report exposed.');
 if(v.investmentAssetsVersion===1){if(v.investmentServicesVersion!==1)throw Error('Investment assets lack their operating foundation.');validateInvestmentAssetReport(v.me.investmentAssetReport,v.cycle-(v.gameOver?0:1));}
 else if(v.investmentAssetsVersion!==undefined||v.me?.investmentAssetReport!==undefined)throw Error('Unversioned investment asset view.');
 if(v.investmentEconomy!==undefined||v.rival?.investmentBusiness!==undefined||v.rival?.investmentSnapshot!==undefined||v.rival?.investmentReport!==undefined)throw Error('Private investment information exposed.');
 if(v.investmentServicesVersion===undefined){if(v.me?.investmentBusiness!==undefined||v.me?.investmentSnapshot!==undefined||v.me?.investmentReport!==undefined)throw Error('Unversioned investment view.');return;}
 if(v.investmentServicesVersion!==1||v.facilityExtensionsVersion!==1||!v.me?.investmentBusiness||v.rival?.investmentBusiness!==undefined||v.rival?.investmentSnapshot!==undefined||
  v.lastPlans?.[v.rival.id]?.investmentPolicy!==undefined)throw Error('Invalid or private investment view.');
 InvestmentInstitution.validate(v.me.investmentBusiness);
 validateInvestmentReport(v.me.investmentReport,v.me.investmentBusiness.month,v.investmentCashVersion===1);
 if(v.me.investmentBusiness.owner!==v.me.id||v.me.investmentBusiness.month!==v.cycle-(v.gameOver?0:1))throw Error('Stale investment owner view.');
 const s=v.me.investmentSnapshot,month=v.me.investmentBusiness.month,ids=new Set(),fundingIds=new Set();
 if(v.investmentTradingVersion===1){
  if(!Array.isArray(s?.trading?.receipts)||s.trading.receipts.some(r=>typeof r.clientId!=='string'||!r.clientId||r.clientId.length>80||r.gross!==r.units*s.price))throw Error('Invalid portfolio receipt projection.');
  InvestmentTrading.validate(s.trading,month,s.trading.receipts.map(r=>({id:r.clientId})),[v.me.id]);
 }
 if(v.investmentIncomeVersion===1){
  const b=s?.income;
  if(!investmentExact(b,['month','annualBp','accounts'])||b.month!==month||!investmentWhole(b.annualBp)||b.annualBp>2000||!Array.isArray(b.accounts)||b.accounts.length!==s.clients.length||new Set(b.accounts.map(a=>a.clientId)).size!==b.accounts.length||b.accounts.some(a=>!investmentExact(a,['clientId','totalPaid','lastPaid','lastDue','fundIncome'])||!s.clients.some(c=>c.id===a.clientId)||a.fundIncome>0&&(!s.cashPositions?.find(p=>p.clientId===a.clientId)?.shares||a.fundIncome>s.cashPositions.find(p=>p.clientId===a.clientId).value)||!['totalPaid','lastPaid','lastDue','fundIncome'].every(k=>investmentWhole(a[k]))||a.lastPaid>a.lastDue||a.lastPaid>a.totalPaid))throw Error('Invalid or private investment income statement.');
 }
 if(!investmentExact(s,['price','performance','clients','funding',...(v.investmentSweepVersion===1?['cashPositions']:[]),...(v.investmentIncomeVersion===1?['income']:[]),...(v.investmentTradingVersion===1?['trading']:[]),...(v.investmentNotesVersion===1?['notes']:[])])||!investmentWhole(s.price)||s.price<10||s.price>10000||!Array.isArray(s.clients)||!Array.isArray(s.funding)||s.clients.length>3000||s.funding.length>3000)throw Error('Invalid investment account projection.');
 if(v.investmentSweepVersion===1){
  if(!Array.isArray(s.cashPositions)||s.cashPositions.length!==s.clients.length||new Set(s.cashPositions.map(a=>a.clientId)).size!==s.cashPositions.length||s.cashPositions.some(a=>!investmentExact(a,['clientId','mode','buffer','affiliate','bankId','deposit','shares','value','lastResult'])||!s.clients.some(c=>c.id===a.clientId)||!InvestmentCashRoutes.modes.includes(a.mode)||!['buffer','deposit','shares','value'].every(k=>investmentWhole(a[k]))||a.buffer>1000000||a.value<a.deposit||!a.shares&&a.value!==a.deposit||![null,v.me.id,v.rival.id].includes(a.affiliate)||![null,'external',v.me.id,v.rival.id].includes(a.bankId)||(a.mode==='affiliated'?a.affiliate===null:a.affiliate!==null)||(a.deposit?a.bankId===null:a.bankId!==null)||(!month?a.lastResult!==null:!investmentExact(a.lastResult,['placed','released','reason'])||!investmentWhole(a.lastResult.placed)||!investmentWhole(a.lastResult.released)||!['','capacity','liquidity','minimum subscription','suitability'].includes(a.lastResult.reason))))throw Error('Invalid or private cash position projection.');
 }
 let aum=0,held=0;
 if(v.investmentNotesVersion===1)InvestmentNotes.validateView(s.notes,month,s.clients,v.me.id);
 for(const c of s.clients){
  if(!investmentExact(c,['id','market','service','units','custodian','cash','owner','missed','acquired','fees'])||typeof c.id!=='string'||!c.id||c.id.length>80||ids.has(c.id)||
   !Object.hasOwn(v.territories,c.market)||!['advice','brokerage'].includes(c.service)||c.owner!==v.me.id||
   !['units','cash','missed','acquired','fees'].every(k=>investmentWhole(c[k]))||c.missed>2||c.acquired>month||
   (c.custodian!==v.me.id&&!Object.hasOwn(InvestmentInstitution.PROVIDERS,c.custodian)))throw Error('Invalid or private investment client projection.');
  const value=c.units*s.price+c.cash+(s.notes?InvestmentNotes.claims(s.notes,c.id):0)+(v.investmentSweepVersion===1?s.cashPositions.find(a=>a.clientId===c.id).value:0);
  if(!investmentWhole(value)||value>InvestmentInstitution.RULES.clientAssetLimit)throw Error('Invalid investment client assets.');
  aum+=value;if(c.custodian===v.me.id)held+=value;ids.add(c.id);
 }
 if(!investmentWhole(aum)||held!==v.me.investmentBusiness.book.accounts.custodyAssets)throw Error('Projected investment custody does not reconcile.');
 for(const a of s.funding){
  if(!investmentExact(a,['clientId','bankId','market','segment','limit','lastCycle','funded'])||typeof a.clientId!=='string'||!a.clientId||a.clientId.length>80||fundingIds.has(a.clientId)||
   a.bankId!==v.me.id||!Object.hasOwn(v.territories,a.market)||!Object.hasOwn(CUSTOMER_SEGMENTS,a.segment)||
   !['limit','lastCycle','funded'].every(k=>investmentWhole(a[k]))||!a.limit||a.lastCycle>month)throw Error('Invalid investment funding projection.');
  fundingIds.add(a.clientId);
 }
 const r=s.performance;
 if(v.investmentNotesVersion===1&&r&&(r.noteWork!==s.notes.execution.reduce((n,t)=>n+t.work,0)||r.noteFees!==s.notes.execution.reduce((n,t)=>n+t.fee,0)||r.noteFees+(r.tradingFees||0)>r.fees))throw Error('Note performance disagrees with owner receipts.');
 if(v.investmentTradingVersion===1&&r&&(r.tradeWork!==s.trading.receipts.reduce((n,t)=>n+t.work,0)||r.tradingFees!==s.trading.receipts.reduce((n,t)=>n+t.fee,0)||r.tradingFees>r.fees))throw Error('Portfolio performance disagrees with owner receipts.');
 if(!month){if(r!==null)throw Error('Unexpected opening investment performance.');}
 else if(!investmentExact(r,['owner','month','openingClients','serviced','won','lost','fees','unpaidFees','providerCost','aum','migrated','acquisitionWork','custodyWork',...(v.investmentSweepVersion===1?['cashWork']:[]),...(v.investmentTradingVersion===1?['tradeWork','tradingFees']:[]),...(v.investmentNotesVersion===1?['noteWork','noteFees']:[])])||r.owner!==v.me.id||r.month!==month||r.aum!==aum||Object.entries(r).some(([k,n])=>k!=='owner'&&!investmentWhole(n)))throw Error('Invalid investment performance projection.');
}
