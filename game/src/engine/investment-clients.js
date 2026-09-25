// Finite client portfolios and funded investment-service revenue. This domain
// is not a campaign initializer: the adapter must supply identified existing
// wealth relationships and an explicitly funded dealer, never per-turn grants.
const InvestmentClients=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),whole=n=>Number.isSafeInteger(n)&&n>=0;
 const exact=(x,keys)=>{if(!x||typeof x!=='object'||Array.isArray(x))return false;const own=Object.keys(x);if(own.length!==keys.length)return false;const set=new Set(keys);if(set.size!==keys.length)return false;for(let i=0;i<own.length;i++)if(!set.has(own[i]))return false;return true;};
 const PROVIDERS=Object.keys(InvestmentInstitution.PROVIDERS),MAX_CLIENTS=3000;
 const sum=(rows,key)=>rows.reduce((n,x)=>n+x[key],0);
 const value=(w,c)=>c.units*w.price+c.cash+(w.notes?InvestmentNotes.claims(w.notes,c.id):0)+(w.version===3?InvestmentCashRoutes.value(w.cashRoutes,c.id,w.price):0);
 function investmentClientsRefreshCustody(w,entities){
  const held={};for(const c of w.clients)held[c.custodian]=(held[c.custodian]||0)+value(w,c);
  for(const key of PROVIDERS){const b=w.custodians[key],change=(held[key]||0)-b.accounts.custodyAssets;
   if(change)w.custodians[key]=GroupAccounting.custody(b,change,'investment:client-ledger');}
  for(const e of entities){const change=(held[e.owner]||0)-e.book.accounts.custodyAssets;
   if(change)e.book=GroupAccounting.custody(e.book,change,'investment:client-ledger');
   if(e.report)e.report.permitted=InvestmentInstitution.permissionState(e,e.month,e.report.permitted.available);
  }
 }
 function investmentClientsOpening(positions,dealer){
  GroupAccounting.validate(dealer);
  if(!Array.isArray(positions)||positions.length>MAX_CLIENTS||dealer.entityId!=='investment:dealer'||
   Object.entries(dealer.accounts).some(([k,n])=>!['cash','equity'].includes(k)&&n))throw Error('Investment opening needs finite positions and a funded cash-only dealer.');
  const w={version:1,month:0,price:100,dealer:copy(dealer),dealerUnits:0,issuedUnits:0,
   openingCash:dealer.accounts.cash,bankCashNet:0,feesPaid:0,outsideUnits:0,outsideBasis:0,outsideCashNet:0,
   custodians:Object.fromEntries(PROVIDERS.map(k=>[k,GroupAccounting.opening('investment:custodian:'+k)])),clients:[],reports:[]};
  for(const p of positions){
   if(!exact(p,['id','market','service','units','custodian'])||typeof p.id!=='string'||!p.id.length||p.id.length>80||
    typeof p.market!=='string'||!p.market.length||!['advice','brokerage'].includes(p.service)||!whole(p.units)||!PROVIDERS.includes(p.custodian))throw Error('Invalid existing investment position.');
   w.clients.push({...copy(p),cash:0,owner:null,missed:0,acquired:0,fees:0});w.issuedUnits+=p.units;
  }
  investmentClientsRefreshCustody(w,[]);investmentClientsValidate(w,[]);return w;
 }
 function investmentClientsValidate(w,entities,prepared=false){
  if(!exact(w,['version','month','price','dealer','dealerUnits','issuedUnits','openingCash','bankCashNet','feesPaid','custodians','clients','reports','outsideUnits','outsideBasis','outsideCashNet',...([2,3].includes(w?.version)?['bankSecuritiesNet','securitySources']:[]),...(w?.version===3?['cashRoutes']:[]),...(w?.choiceVersion===1?['choiceVersion']:[]),...(w?.income?.version===1?['income']:[]),...(w?.suitabilityVersion===1?['suitabilityVersion']:[]),...(w?.trading?.version===1?['trading']:[]),...(w?.notes?.version===1?['notes']:[])])||![1,2,3].includes(w.version)||w.choiceVersion===1&&w.version!==3||
   !whole(w.month)||!whole(w.price)||w.price<10||w.price>10000||!whole(w.dealerUnits)||!whole(w.issuedUnits)||!whole(w.openingCash)||
   !Number.isSafeInteger(w.bankCashNet)||!whole(w.feesPaid)||!whole(w.outsideUnits)||!whole(w.outsideBasis)||!Number.isSafeInteger(w.outsideCashNet)||
   !w.outsideUnits&&w.outsideBasis||!exact(w.custodians,PROVIDERS)||!Array.isArray(w.clients)||w.clients.length>MAX_CLIENTS||
   !Array.isArray(w.reports)||!Array.isArray(entities)||entities.length>2)throw Error('Invalid investment client economy.');
  const owners=new Set(),ids=new Set(),held={};
  if(w.notes){if(!w.trading||w.notes.month!==w.month)throw Error('Term notes require matching portfolio rules and month.');InvestmentNotes.validate(w.notes,w.clients,w.dealer);if(w.notes.execution.some(r=>!entities.some(e=>e.owner===r.owner)))throw Error('Foreign note execution owner.');}
  if(w.suitabilityVersion===1&&!w.income)throw Error('Investment suitability requires funded income rules.');
  if(w.trading){
   if(w.suitabilityVersion!==1)throw Error('Portfolio trading requires customer mandates.');
   InvestmentTrading.validate(w.trading,w.month,w.clients,entities.map(e=>e.owner));
   if(w.trading.receipts.some(r=>r.gross!==r.units*w.price))throw Error('Portfolio receipt price does not reconcile.');
  }
  if(w.suitabilityVersion!==1&&w.cashRoutes?.report.some(r=>r.reason==='suitability'))throw Error('Unversioned suitability restriction.');
  if(w.income){
   if(w.version!==3||w.choiceVersion!==1||!Number.isSafeInteger(w.cashRoutes?.incomeReceived))throw Error('Income requires the current client and cash rules.');
   InvestmentIncome.validate(w.income,['$dealer','$fund',...w.clients.map(c=>c.id)]);
   if(![w.month,Math.max(0,w.month-1)].includes(w.income.month)||w.income.accounts.find(a=>a.id==='$fund').paid!==w.cashRoutes.incomeReceived)throw Error('Investment fund income or settlement month disagrees.');
  }else if(w.cashRoutes?.incomeReceived!==undefined)throw Error('Unversioned investment fund income.');
  for(const e of entities){InvestmentInstitution.validate(e);if(owners.has(e.owner)||PROVIDERS.includes(e.owner))throw Error('Duplicate investment owner.');
   if(e.month!==w.month+(prepared?1:0))throw Error('Investment client and institution months disagree.');owners.add(e.owner);}
  if(w.version===3){
   InvestmentCashRoutes.validateHoldings(w.cashRoutes,w.clients,[...owners],{dealer:w.dealer,units:w.dealerUnits,price:w.price});
   if(w.cashRoutes.month!==w.month)throw Error('Investment cash arrangements have a stale settlement month.');
  }
  GroupAccounting.validate(w.dealer);
  if(w.dealer.entityId!=='investment:dealer'||w.dealer.accounts.businessAssets!==w.dealerUnits*w.price||
   ['investments','custodyAssets','custodyLiabilities',...(w.notes?[]:['debt','payables'])].some(k=>w.dealer.accounts[k]))throw Error('Investment dealer inventory does not reconcile.');
  for(const c of w.clients){
   if(!exact(c,['id','market','service','units','custodian','cash','owner','missed','acquired','fees'])||typeof c.id!=='string'||!c.id.length||c.id.length>80||ids.has(c.id)||
    typeof c.market!=='string'||!c.market.length||!['advice','brokerage'].includes(c.service)||!['units','cash','missed','acquired','fees'].every(k=>whole(c[k]))||c.missed>2||c.acquired>w.month||
    (c.owner!==null&&(!owners.has(c.owner)||entities.find(e=>e.owner===c.owner).status!=='active'))||(!PROVIDERS.includes(c.custodian)&&!owners.has(c.custodian))||
    (owners.has(c.custodian)&&c.custodian!==c.owner)||c.owner===null&&(c.missed||c.acquired)||
    !whole(value(w,c))||value(w,c)>InvestmentInstitution.RULES.clientAssetLimit)throw Error('Invalid or duplicated investment client.');
   ids.add(c.id);held[c.custodian]=(held[c.custodian]||0)+value(w,c);
  }
  if(!whole(w.issuedUnits)||sum(w.clients,'units')+w.dealerUnits+w.outsideUnits+(w.version===3?w.cashRoutes.fund.securities:0)!==w.issuedUnits)throw Error('Investment securities were created or lost.');
  if([2,3].includes(w.version)){
   if(!Number.isSafeInteger(w.bankSecuritiesNet)||w.bankSecuritiesNet>0||!Array.isArray(w.securitySources))throw Error('Invalid investment inventory provenance.');
   const seenSources=new Set();let units=0,paid=0;
   for(const s of w.securitySources){
    const key=s.bankId+'/'+s.month;
    if(!exact(s,['bankId','month','units','paid'])||typeof s.bankId!=='string'||!s.bankId||s.bankId.length>50||!whole(s.month)||!s.month||s.month>w.month||
     !whole(s.units)||!s.units||!whole(s.paid)||s.paid!==s.units*100||seenSources.has(key))throw Error('Invalid or duplicated bank securities source.');
    seenSources.add(key);units+=s.units;paid+=s.paid;
   }
   if(!whole(units)||!whole(paid)||units!==w.issuedUnits||paid!==-w.bankSecuritiesNet)throw Error('Investment units are not backed by bank securities transfers.');
  }
  const routeCash=w.version===3?BigInt(w.cashRoutes.received)-BigInt(w.cashRoutes.returned)-BigInt(w.cashRoutes.tradingNet)+BigInt(w.cashRoutes.incomeReceived||0):0n;
  const cash=BigInt(w.dealer.accounts.cash)+w.clients.reduce((n,c)=>n+BigInt(c.cash),0n)+routeCash+BigInt(w.feesPaid)-BigInt(w.bankCashNet)-BigInt(w.outsideCashNet)-BigInt([2,3].includes(w.version)?w.bankSecuritiesNet:0);
  if(cash!==BigInt(w.openingCash)||sum(w.clients,'fees')!==w.feesPaid)throw Error('Investment cash or collected fees do not reconcile.');
  for(const key of PROVIDERS){const b=w.custodians[key];GroupAccounting.validate(b);
   if(b.entityId!=='investment:custodian:'+key||b.accounts.custodyAssets!==(held[key]||0)||Object.entries(b.accounts).some(([k,n])=>!['custodyAssets','custodyLiabilities'].includes(k)&&n))throw Error('Outside client custody does not reconcile.');}
  for(const e of entities)if(e.book.accounts.custodyAssets!==(held[e.owner]||0))throw Error('Owned client custody does not reconcile.');
  const seen=new Set();
  for(const r of w.reports){
   if(!exact(r,['owner','month','openingClients','serviced','won','lost','fees','unpaidFees','providerCost','aum','migrated','acquisitionWork','custodyWork',...(w.version===3?['cashWork']:[]),...(w.trading?['tradeWork','tradingFees']:[]),...(w.notes?['noteWork','noteFees']:[])])||!owners.has(r.owner)||seen.has(r.owner)||r.month!==w.month||
    Object.entries(r).some(([k,n])=>k!=='owner'&&!whole(n))||r.aum!==w.clients.filter(c=>c.owner===r.owner).reduce((n,c)=>n+value(w,c),0))throw Error('Invalid investment client report.');
   const institution=entities.find(e=>e.owner===r.owner),available=institution.report?.permitted.available||
    (institution.closure?.cycle===w.month?institution.closure.available:{adviser:0,broker:0,operations:0});
   if(w.version===3&&r.cashWork!==w.cashRoutes.report.filter(x=>x.owner===r.owner).reduce((n,x)=>n+x.work,0))throw Error('Cash processing work disagrees with its qualified provider.');
   if(w.trading){const receipts=w.trading.receipts.filter(x=>x.owner===r.owner);
    if(r.tradeWork!==receipts.reduce((n,x)=>n+x.work,0)||r.tradingFees!==receipts.reduce((n,x)=>n+x.fee,0)||r.tradingFees>r.fees)throw Error('Portfolio fees or qualified work do not reconcile.');
   }
   if(w.notes){const receipts=w.notes.execution.filter(x=>x.owner===r.owner);if(r.noteWork!==receipts.reduce((n,x)=>n+x.work,0)||r.noteFees!==receipts.reduce((n,x)=>n+x.fee,0)||r.noteFees+(r.tradingFees||0)>r.fees)throw Error('Note work and fees do not reconcile.');}
   // During preparation the new institution may have released employees or
   // reserved migration time. Do not apply that new budget to last month's
   // already completed report. Completed-state validation checks the same month.
   if(!prepared&&(r.custodyWork+(r.cashWork||0)+((r.tradeWork||0)+(r.noteWork||0))/5>available.operations/4*InvestmentInstitution.ROLES.operations.capacity||
    r.serviced+r.acquisitionWork+(r.tradeWork||0)+(r.noteWork||0)>available.adviser/4*InvestmentInstitution.ROLES.adviser.capacity+available.broker/4*InvestmentInstitution.ROLES.broker.capacity))throw Error('Investment client work duplicates qualified time.');
   seen.add(r.owner);
  }
  if(w.month>0&&w.reports.length!==entities.length)throw Error('Missing investment client report.');
  return true;
 }
 function investmentClientsSellForCash(w,c,requested){
  const units=Math.min(c.units,Math.floor(w.dealer.accounts.cash/w.price),Math.ceil(Math.max(0,requested-c.cash)/w.price));
  if(!units)return 0;
  const paid=units*w.price;c.units-=units;c.cash+=paid;w.dealerUnits+=units;
  w.dealer=GroupAccounting.post(w.dealer,'client.securitySale',c.id,{cash:-paid,businessAssets:paid});return paid;
 }
 function investmentClientsCollect(w,c,e,requested){
  investmentClientsSellForCash(w,c,requested);const paid=Math.min(requested,c.cash);
  if(paid){c.cash-=paid;c.fees+=paid;w.feesPaid+=paid;e.book=GroupAccounting.post(e.book,'investment.clientFee',c.id,{cash:paid,equity:paid},paid);}
  return paid;
 }
 function investmentClientsInvoiceProvider(e,vendor,amount){
  if(!amount)return vendor;
  e.book=GroupAccounting.post(e.book,'investment.assetService',vendor.entityId,{payables:amount,equity:-amount},-amount);
  let next=GroupAccounting.post(vendor,'investment.assetService',e.book.entityId,{businessAssets:amount,equity:amount},amount);
  const paid=Math.min(e.book.accounts.cash,e.book.accounts.payables);
  if(paid){e.book=GroupAccounting.settlePayable(e.book,paid,next.entityId);next=GroupAccounting.post(next,'investment.assetServicePaid',e.book.entityId,{cash:paid,businessAssets:-paid});}
  return next;
 }
 function investmentClientsNormalizeOffers(entities,offers){
  if(!Array.isArray(offers)||offers.length!==entities.length)throw Error('Investment offers require one instruction per institution.');
  return offers.map((o,i)=>{
   if(!exact(o,['owner','market','reputation','pursue'])||o.owner!==entities[i].owner||typeof o.market!=='string'||!o.market.length||
    !Number.isFinite(o.reputation)||o.reputation<0||o.reputation>100||typeof o.pursue!=='boolean')throw Error('Invalid investment client offer.');return copy(o);
  });
 }
 function investmentClientsStep(world,institutions,supplier,offers,price,cashInput,premises){
  investmentClientsValidate(world,institutions,true);GroupAccounting.validate(supplier);const orders=investmentClientsNormalizeOffers(institutions,offers);
  if(!whole(price)||price<10||price>10000||institutions.some(e=>e.month!==world.month+1))throw Error('Investment servicing requires one newly prepared institution month.');
  if(institutions.some(e=>e.book.entityId===supplier.entityId)||supplier.entityId===world.dealer.entityId)throw Error('Investment fees need a distinct operating supplier.');
  if(world.version===3?(!exact(cashInput,['banks','orders',...(world.trading?['trades']:[]),...(world.notes?['noteOrders','noteAnnualBp']:[])])||!Array.isArray(cashInput.banks)||cashInput.banks.length!==2||cashInput.banks.some((b,i)=>!exact(b,['id','book'])||b.id!==institutions[i].owner)):cashInput!==undefined)throw Error('Cash arrangements require actual paired banks and explicit versioned instructions.');
  const w=copy(world),entities=copy(institutions),cycle=world.month+1;let vendor=copy(supplier);
  const revaluation=(price-w.price)*w.dealerUnits;
  if(revaluation)w.dealer=GroupAccounting.post(w.dealer,'investment.unrealizedMark','security-market',{businessAssets:revaluation,equity:revaluation},revaluation);
  if(w.version===3){const mark=(price-w.price)*w.cashRoutes.fund.securities;
   if(mark)w.cashRoutes.fund.book=GroupAccounting.post(w.cashRoutes.fund.book,'cashFund.valuation','security-market',{businessAssets:mark,equity:mark},mark);}
  w.price=price;
  if(w.notes){const paid=InvestmentNotes.advance({book:w.notes,clients:w.clients,dealer:w.dealer},cycle);w.notes=paid.book;w.clients=paid.clients;w.dealer=paid.dealer;}
  const rows=entities.map(e=>({owner:e.owner,month:cycle,openingClients:w.clients.filter(c=>c.owner===e.owner).length,serviced:0,won:0,lost:0,fees:0,unpaidFees:0,providerCost:0,aum:0,migrated:0,acquisitionWork:0,custodyWork:0,...(w.version===3?{cashWork:0}:{}),...(w.trading?{tradeWork:0,tradingFees:0}:{}),...(w.notes?{noteWork:0,noteFees:0}:{})}));
  const slots=entities.map(e=>({total:e.report?.permitted.accountCapacity||0,advice:(e.report?.permitted.advice?e.report.permitted.available.adviser/4*InvestmentInstitution.ROLES.adviser.capacity:0),
   brokerage:(e.report?.permitted.brokerage?e.report.permitted.available.broker/4*InvestmentInstitution.ROLES.broker.capacity:0),custody:e.report?.permitted.custodyCapacity||0,
   operations:(e.report?.permitted.available.operations||0)/4*InvestmentInstitution.ROLES.operations.capacity}));
  const network=premises===undefined?null:SharedPremises.investmentDelivery(premises,entities,cycle);
  if(network)for(const [i,r]of network.entries())Object.assign(slots[i],r.central,{total:r.central.advice+r.central.brokerage});
  const localWork=(i,c)=>network?.[i].local.find(r=>r.market===c.market);
  const serviceWork=(i,c,acquiring=false)=>(localWork(i,c)?.[c.service]||0)+(!acquiring||orders[i].market===c.market?slots[i][c.service]:0);
  const takeService=(i,c,amount,acquiring=false)=>{
   if(!network){slots[i].total-=amount;slots[i][c.service]-=amount;return;}
   if(serviceWork(i,c,acquiring)<amount)throw Error('Local investment delivery overcommitted.');
   const local=localWork(i,c),used=Math.min(amount,local?.[c.service]||0);if(local)local[c.service]-=used;
   slots[i][c.service]-=amount-used;slots[i].total-=amount-used;
  };
  let cashBanks;
  if(w.version===3){
   // Preserve existing owned-custody service capacity before allocating cash
   // processing. Residual work is then unavailable to migration/acquisition.
   const banks=cashInput.banks.map((b,i)=>({...copy(b),work:Math.max(0,Math.floor(slots[i].operations-w.clients.filter(c=>c.owner===b.id&&c.custodian===b.id).length))}));
   const fees=w.clients.filter(c=>c.owner!==null).map(c=>({clientId:c.id,amount:Math.floor(value(w,c)*entities.find(e=>e.owner===c.owner).policy.feeBp/120000)}));
   const swept=InvestmentCashRoutes.step({book:w.cashRoutes,clients:w.clients,banks,market:{dealer:w.dealer,units:w.dealerUnits,price}},cashInput.orders,cycle,fees,w.suitabilityVersion||0,w.notes?w.clients.map(c=>({clientId:c.id,value:InvestmentNotes.claims(w.notes,c.id)})):[]);
   w.cashRoutes=swept.book;w.clients=swept.clients;w.dealer=swept.market.dealer;w.dealerUnits=swept.market.units;cashBanks=swept.banks.map(({id,book})=>({id,book}));
   for(const [i,e]of entities.entries()){
    rows[i].cashWork=w.cashRoutes.report.filter(r=>r.owner===e.owner).reduce((n,r)=>n+r.work,0);
    slots[i].operations-=rows[i].cashWork;slots[i].custody=Math.min(slots[i].custody,slots[i].operations);
   }
  }
  const available=(i,c)=>(network?serviceWork(i,c)>=1:slots[i].total>=1&&slots[i][c.service]>=1)&&(c.custodian!==entities[i].owner||slots[i].custody>=1);
  // Existing obligations consume staff before new acquisition. Fees cannot
  // retroactively finance a hire or permission earlier in the same month.
  for(const c of w.clients){if(c.owner===null)continue;const i=entities.findIndex(e=>e.owner===c.owner),e=entities[i],r=rows[i];
   if(!available(i,c))c.missed++;
   else{
    takeService(i,c,1);if(c.custodian===e.owner){slots[i].custody--;slots[i].operations--;r.custodyWork++;}
    r.serviced++;c.missed=0;const aum=value(w,c),due=Math.floor(aum*e.policy.feeBp/120000),paid=investmentClientsCollect(w,c,e,due);
    r.fees+=paid;r.unpaidFees+=due-paid;
    r.providerCost+=Math.floor(aum*(PROVIDERS.includes(c.custodian)?InvestmentInstitution.PROVIDERS[c.custodian].annualBp:4)/120000);
   }
   if(c.missed>=3){r.lost++;c.owner=null;c.acquired=0;c.missed=0;if(!PROVIDERS.includes(c.custodian))c.custodian=e.policy.provider;}
  }
  // A completed delivery project authorizes movement, not an instantaneous
  // whole-book conversion. Each migrated account uses five residual ops slots.
  for(const [i,e]of entities.entries()){
   const destination=e.policy.custody==='owned'?e.owner:e.policy.provider;
   let migration=Math.floor(Math.max(0,slots[i].operations)/5);
   if(e.migration||destination===e.owner&&!e.report?.permitted.custody)migration=0;
   for(const c of w.clients.filter(c=>c.owner===e.owner&&c.custodian!==destination)){
    if(!migration)break;if(destination===e.owner&&slots[i].custody<5)break;
    c.custodian=destination;migration--;rows[i].migrated++;slots[i].operations-=5;rows[i].custodyWork+=5;
    if(e.policy.custody==='owned')slots[i].custody=Math.max(0,slots[i].custody-5);
   }
  }
  if(w.trading){
   const clearing=InvestmentTrading.clear({price:w.price,dealerCash:w.dealer.accounts.cash,dealerUnits:w.dealerUnits,
    clients:w.clients.map(c=>({id:c.id,owner:c.owner,cash:c.cash,units:c.units,service:c.service,serviced:c.owner!==null&&c.missed===0&&!!entities.find(e=>e.owner===c.owner)?.report?.permitted[c.service],ownedCustody:c.custodian===c.owner,position:InvestmentSuitability.position(w,c)})),
    capacity:entities.map((e,i)=>({owner:e.owner,advice:Math.floor(slots[i].advice),brokerage:Math.floor(slots[i].brokerage),operations:Math.floor(slots[i].operations),custody:Math.floor(slots[i].custody)}))},cashInput.trades,network?{version:1,markets:w.clients.map(c=>({id:c.id,market:c.market})),local:network.map(r=>({owner:r.owner,markets:r.local}))}:undefined);
   w.trading={version:1,month:cycle,receipts:clearing.receipts};
   for(const receipt of clearing.receipts){
    const i=entities.findIndex(e=>e.owner===receipt.owner);rows[i].tradeWork+=receipt.work;rows[i].tradingFees+=receipt.fee;rows[i].fees+=receipt.fee;
    if(!receipt.units)continue;const c=w.clients.find(c=>c.id===receipt.clientId),direction=receipt.side==='buy'?1:-1;
    c.units+=direction*receipt.units;c.cash-=direction*receipt.gross+receipt.fee;c.fees+=receipt.fee;w.feesPaid+=receipt.fee;
    w.dealerUnits-=direction*receipt.units;w.dealer=GroupAccounting.post(w.dealer,'client.portfolioTrade',c.id,{cash:direction*receipt.gross,businessAssets:-direction*receipt.gross});
    entities[i].book=GroupAccounting.post(entities[i].book,'investment.executionFee',c.id,{cash:receipt.fee,equity:receipt.fee},receipt.fee);
   }
   for(const [i,budget]of clearing.capacity.entries())Object.assign(slots[i],{advice:budget.advice,brokerage:budget.brokerage,operations:budget.operations,custody:budget.custody});
   if(network)for(const [i,r]of clearing.local.entries()){network[i].local=r.markets;slots[i].total=slots[i].advice+slots[i].brokerage;}
  }
  if(w.notes){
   if(!Array.isArray(cashInput.noteOrders)||cashInput.noteOrders.length>32||new Set(cashInput.noteOrders.map(o=>o.clientId)).size!==cashInput.noteOrders.length)throw Error('Invalid note orders.');
   const execution=[],eligible=[];
   for(const o of cashInput.noteOrders.slice().sort((a,b)=>a.clientId<b.clientId?-1:1)){
    if(!exact(o,['owner','clientId','product','amount'])||!whole(o.amount)||o.amount<100||o.amount>1000000||o.amount%100||!Object.hasOwn(InvestmentNotes.products,o.product))throw Error('Invalid note subscription instruction.');
    const c=w.clients.find(c=>c.id===o.clientId),i=entities.findIndex(e=>e.owner===o.owner);if(!c||i<0)throw Error('Unknown note client or provider.');
    const r={...copy(o),filled:0,fee:0,work:0,reason:''};execution.push(r);
    if(c.owner!==o.owner||c.missed||!entities[i].report?.permitted[c.service]){r.reason='relationship';continue;}
    const q=InvestmentNotes.quote(c,w.price,InvestmentSuitability.position(w,c),o.product,o.amount,cashInput.noteAnnualBp);
    if(!q.amount){r.reason=q.reason;continue;}
    if((network?serviceWork(i,c):slots[i][c.service])<5||slots[i].operations<1||c.custodian===o.owner&&slots[i].custody<1){r.reason='capacity';continue;}
    takeService(i,c,5);slots[i].operations--;if(c.custodian===o.owner)slots[i].custody--;
    r.work=5;r.reason=q.reason;eligible.push({clientId:c.id,product:o.product,amount:q.amount});
   }
   const subscribed=InvestmentNotes.subscribe({book:w.notes,clients:w.clients,dealer:w.dealer},eligible,cashInput.noteAnnualBp);w.notes=subscribed.book;w.clients=subscribed.clients;w.dealer=subscribed.dealer;
   for(const r of execution){const i=entities.findIndex(e=>e.owner===r.owner),fill=w.notes.report.find(x=>x.kind==='subscription'&&x.clientId===r.clientId);r.filled=fill?.principal||0;r.fee=r.filled?5:0;if(r.work&&r.filled<(eligible.find(o=>o.clientId===r.clientId)?.amount||0))r.reason='issuer capacity';rows[i].noteWork+=r.work;rows[i].noteFees+=r.fee;rows[i].fees+=r.fee;
    if(r.fee){const c=w.clients.find(c=>c.id===r.clientId);c.cash-=r.fee;c.fees+=r.fee;w.feesPaid+=r.fee;entities[i].book=GroupAccounting.post(entities[i].book,'investment.noteExecutionFee',c.id,{cash:r.fee,equity:r.fee},r.fee);}
   }
   w.notes.execution=execution;
  }
  for(const [ordinal,c]of w.clients.entries()){
   const incumbent=c.owner;
   const candidates=entities.map((e,i)=>{
    const o=orders[i],isOwner=c.owner===e.owner,live=e.report?.permitted[c.service],cost=isOwner?0:5;
    if(!live||(!isOwner&&(!o.pursue||(!network&&o.market!==c.market)||e.migration||(network?serviceWork(i,c,true)<cost:slots[i].total<cost||slots[i][c.service]<cost)||
     e.policy.custody==='owned'&&slots[i].custody<cost)))return null;
    const score=w.choiceVersion===1?InvestmentCustomerChoice.assess(c,e,o.reputation,cycle).score:100-e.policy.feeBp/2+o.reputation/10+(isOwner?12:0);
    return score>=55?{i,score,tie:(i+ordinal)%Math.max(1,entities.length)}:null;
   }).filter(Boolean).sort((a,b)=>b.score-a.score||a.tie-b.tie);
   if(!candidates.length){
    // In the new rules a served customer may decline an unsuitable price/service
    // offer and keep the same assets with an outside provider. Permission failures
    // retain their existing three-month grace period, rather than bypassing it.
    if(w.choiceVersion===1&&incumbent){const i=entities.findIndex(e=>e.owner===incumbent),e=entities[i];
     if(e.report?.permitted[c.service]&&!InvestmentCustomerChoice.assess(c,e,orders[i].reputation,cycle).acceptable){
      rows[i].lost++;c.owner=null;c.acquired=0;c.missed=0;if(!PROVIDERS.includes(c.custodian))c.custodian=e.policy.provider;
     }
    }
    continue;
   }const i=candidates[0].i,e=entities[i];if(e.owner===incumbent)continue;
   if(incumbent)rows[entities.findIndex(e=>e.owner===incumbent)].lost++;
   c.owner=e.owner;c.acquired=cycle;c.missed=0;c.custodian=e.policy.custody==='owned'?e.owner:e.policy.provider;
   takeService(i,c,5,true);if(e.policy.custody==='owned'){slots[i].custody-=5;slots[i].operations-=5;rows[i].custodyWork+=5;}
   rows[i].won++;rows[i].acquisitionWork+=5;
  }
  for(const [i,e]of entities.entries())vendor=investmentClientsInvoiceProvider(e,vendor,rows[i].providerCost);
  investmentClientsRefreshCustody(w,entities);w.month=cycle;
  for(const r of rows)r.aum=w.clients.filter(c=>c.owner===r.owner).reduce((n,c)=>n+value(w,c),0);
  w.reports=rows;investmentClientsValidate(w,entities);
  return {world:w,entities,supplier:vendor,...(w.version===3?{banks:cashBanks}:{}),...(network?{localDelivery:network}:{})};
 }
 // Boundary transaction only. Campaign integration must also remove matching
 // unlocked household cohorts/local deposits and attribute the cash movement.
 // It must reject unrelated clients, locked terms or repeated settlement IDs.
 function investmentClientsDepositCash(world,institutions,bank,clientId,amount){
  investmentClientsValidate(world,institutions);AccountingPrototype.check(bank);
  if(!whole(amount)||!amount)throw Error('Choose a funded investment cash transfer.');
  const w=copy(world),entities=copy(institutions),client=w.clients.find(c=>c.id===clientId);
  if(!client)throw Error('Unknown investment client.');
  if(amount>bank.accounts.cash||amount>bank.accounts.deposits)throw Error('Investment cash transfer exceeds available bank cash or deposit liabilities.');
  // Cash is held for this customer. It is not dealer capital, subsidiary
  // operating cash, a security purchase, or an automatic affiliated-bank sweep.
  const b=AccountingPrototype.post(bank,'client.investmentCash',{cash:-amount,deposits:-amount});
  client.cash+=amount;w.bankCashNet+=amount;
  investmentClientsRefreshCustody(w,entities);for(const r of w.reports)r.aum=w.clients.filter(c=>c.owner===r.owner).reduce((n,c)=>n+value(w,c),0);
  investmentClientsValidate(w,entities);return {world:w,entities,bank:b,paid:amount};
 }
 function investmentClientsDepositPurchase(world,institutions,bank,clientId,amount){
  investmentClientsValidate(world,institutions);AccountingPrototype.check(bank);
  if(!whole(amount)||!amount)throw Error('Choose a funded investment purchase.');
  const w=copy(world),entities=copy(institutions),c=w.clients.find(c=>c.id===clientId);
  if(!c)throw Error('Unknown investment client.');
  if(amount>bank.accounts.cash||amount>bank.accounts.deposits)throw Error('Investment purchase exceeds available bank cash or deposit liabilities.');
  const units=Math.min(w.dealerUnits,Math.floor(amount/w.price));
  if(!units)throw Error('No funded securities inventory is available.');
  if(w.suitabilityVersion===1)InvestmentSuitability.purchase(w,c,units*w.price);
  const paid=units*w.price,b=AccountingPrototype.post(bank,'client.investmentPurchase',{cash:-paid,deposits:-paid});
  w.dealer=GroupAccounting.post(w.dealer,'client.securityPurchase',clientId,{cash:paid,businessAssets:-paid});w.dealerUnits-=units;c.units+=units;w.bankCashNet+=paid;
  investmentClientsRefreshCustody(w,entities);for(const r of w.reports)r.aum=w.clients.filter(c=>c.owner===r.owner).reduce((n,c)=>n+value(w,c),0);
  investmentClientsValidate(w,entities);return {world:w,entities,bank:b,paid};
 }
 function investmentClientsReturnCash(world,institutions,bank,clientId,amount){
  investmentClientsValidate(world,institutions);AccountingPrototype.check(bank);
  const client=world.clients.find(c=>c.id===clientId);
  if(!client||!whole(amount)||!amount||amount>client.cash)throw Error('Return exceeds available client cash.');
  const w=copy(world),entities=copy(institutions),c=w.clients.find(c=>c.id===clientId);
  const b=AccountingPrototype.post(bank,'client.investmentWithdrawal',{cash:amount,deposits:amount});
  c.cash-=amount;w.bankCashNet-=amount;
  investmentClientsRefreshCustody(w,entities);for(const r of w.reports)r.aum=w.clients.filter(c=>c.owner===r.owner).reduce((n,c)=>n+value(w,c),0);
  investmentClientsValidate(w,entities);return {world:w,entities,bank:b,paid:amount};
 }
 // The regional outside investor buys existing securities with its existing
 // cash. These are historical-cost financial assets, not supplier receivables.
 // The campaign adapter must distinguish that basis in CompanyFinance and
 // reconcile its signed cash crossing. This function never invents the payer.
 function investmentClientsTradeOutside(world,institutions,investor,direction,requested){
  investmentClientsValidate(world,institutions);GroupAccounting.validate(investor);
  if(investor.entityId!=='corporate:outside'||!['buy','sell'].includes(direction)||!whole(requested)||
   investor.accounts.businessAssets<world.outsideBasis)throw Error('Invalid funded outside investment order.');
  const w=copy(world),buy=direction==='buy';
  const units=Math.min(Math.floor(requested/w.price),buy?w.dealerUnits:w.outsideUnits,
   Math.floor((buy?investor.accounts.cash:w.dealer.accounts.cash)/w.price));
  if(!units)return {world:w,investor:copy(investor),units:0,paid:0,realized:0};
  const paid=units*w.price,basis=buy?paid:Number(BigInt(w.outsideBasis)*BigInt(units)/BigInt(w.outsideUnits)),realized=buy?0:paid-basis;
  w.dealer=GroupAccounting.post(w.dealer,buy?'market.outsidePurchase':'market.outsideSale',investor.entityId,
   {cash:buy?paid:-paid,businessAssets:buy?-paid:paid});
  const next=GroupAccounting.post(investor,buy?'investment.securityPurchase':'investment.securitySale',w.dealer.entityId,
   {cash:buy?-paid:paid,businessAssets:buy?basis:-basis,...(!buy?{equity:realized}:{})},realized);
  w.dealerUnits+=buy?-units:units;w.outsideUnits+=buy?units:-units;w.outsideBasis+=buy?basis:-basis;w.outsideCashNet+=buy?paid:-paid;
  investmentClientsValidate(w,institutions);return {world:w,investor:next,units,paid,realized};
 }
 function investmentClientsReleaseOwner(world,institutions,owner){
  investmentClientsValidate(world,institutions);const entities=copy(institutions),w=copy(world),e=entities.find(e=>e.owner===owner);
  if(!e||e.status!=='active')throw Error('Only an active investment provider can release its relationships.');
  let released=0;
  for(const c of w.clients)if(c.owner===owner){released++;c.owner=null;c.acquired=0;c.missed=0;if(c.custodian===owner)c.custodian=e.policy.provider;}
  investmentClientsRefreshCustody(w,entities);const r=w.reports.find(r=>r.owner===owner);if(r){r.lost+=released;r.aum=0;}
  investmentClientsValidate(w,entities);return {world:w,entities,released};
 }
 function investmentClientsBackedOpening(world){
  investmentClientsValidate(world,[]);
  if(world.version!==1||world.month||world.issuedUnits||world.bankCashNet||world.feesPaid||world.outsideCashNet)throw Error('Backed inventory requires an empty new-campaign asset book.');
  const next={...copy(world),version:2,bankSecuritiesNet:0,securitySources:[]};investmentClientsValidate(next,[]);return next;
 }
 function investmentClientsCashOpening(world,entities){
  investmentClientsValidate(world,entities);
  if(world.version!==2||world.month||world.clients.some(c=>c.cash||c.owner!==null)||world.issuedUnits)throw Error('Standing cash arrangements require a new backed campaign.');
  const next={...copy(world),version:3,cashRoutes:InvestmentCashRoutes.opening(world.clients)};investmentClientsValidate(next,entities);return next;
 }
 function investmentClientsStockFromBank(world,entities,bank,bankId,requested){
  investmentClientsValidate(world,entities);AccountingPrototype.check(bank);
  if(![2,3].includes(world.version)||!world.month||world.price!==100||!whole(requested)||typeof bankId!=='string'||!entities.some(e=>e.owner===bankId)||
   world.securitySources.some(s=>s.bankId===bankId&&s.month===world.month))throw Error('Invalid or repeated bank inventory offer.');
  const units=Math.min(Math.floor(requested/100),Math.floor(bank.accounts.securities/100),Math.floor(world.dealer.accounts.cash/100)),paid=units*100;
  if(!units)return {world:copy(world),bank:copy(bank),units:0,paid:0};
  const next=copy(world),book=AccountingPrototype.post(bank,'investment.inventorySale',{cash:paid,securities:-paid});
  next.dealer=GroupAccounting.post(next.dealer,'investment.bankInventory',bankId,{cash:-paid,businessAssets:paid});
  next.dealerUnits+=units;next.issuedUnits+=units;next.bankSecuritiesNet-=paid;next.securitySources.push({bankId,month:world.month,units,paid});
  investmentClientsValidate(next,entities);return {world:next,bank:book,units,paid};
 }
 function investmentClientsDistributeIncome(world,institutions,issuer,annualBp){
  investmentClientsValidate(world,institutions);GroupAccounting.validate(issuer);
  if(!world.income||world.income.month!==world.month-1||issuer.entityId!=='corporate:outside')throw Error('Income needs an unpaid completed month and the funded outside issuer pool.');
  const w=copy(world),entities=copy(institutions);
  const holdings=[{id:'$dealer',units:w.dealerUnits},{id:'$fund',units:w.cashRoutes.fund.securities},...w.clients.map(c=>({id:c.id,units:c.units}))];
  w.income=InvestmentIncome.prepare(w.income,holdings,w.month,annualBp,issuer.accounts.cash);
  const paid=w.income.paid-world.income.paid;
  const payer=paid?GroupAccounting.post(issuer,'investment.distribution','investment:record-holders',{cash:-paid,equity:-paid},-paid):copy(issuer);
  for(const r of w.income.report){if(!r.paid)continue;
   if(r.id==='$dealer')w.dealer=GroupAccounting.post(w.dealer,'investment.distribution',issuer.entityId,{cash:r.paid,equity:r.paid},r.paid);
   else if(r.id==='$fund'){
    w.cashRoutes.fund.book=GroupAccounting.post(w.cashRoutes.fund.book,'investment.distribution',issuer.entityId,{cash:r.paid,equity:r.paid},r.paid);
    w.cashRoutes.incomeReceived+=r.paid;
   }else w.clients.find(c=>c.id===r.id).cash+=r.paid;
  }
  w.outsideCashNet+=paid;investmentClientsRefreshCustody(w,entities);
  for(const r of w.reports)r.aum=w.clients.filter(c=>c.owner===r.owner).reduce((n,c)=>n+value(w,c),0);
  investmentClientsValidate(w,entities);return {world:w,entities,issuer:payer,paid};
 }
 return Object.freeze({opening:investmentClientsOpening,distributeIncome:investmentClientsDistributeIncome,validate:investmentClientsValidate,step:investmentClientsStep,depositCash:investmentClientsDepositCash,depositPurchase:investmentClientsDepositPurchase,returnCash:investmentClientsReturnCash,tradeOutside:investmentClientsTradeOutside,releaseOwner:investmentClientsReleaseOwner,backedOpening:investmentClientsBackedOpening,cashOpening:investmentClientsCashOpening,stockFromBank:investmentClientsStockFromBank,value,MAX_CLIENTS});
})();
