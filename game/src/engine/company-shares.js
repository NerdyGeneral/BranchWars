// N-10 company ownership. Parent cash and cost-basis assets are canonical; no
// second saved copy of a parent's books or positions is stored in the market.
function initializeCompanyShares(g,options){
 if(options.companySharesVersion!==1)return;
 if(g.investmentStrategyVersion!==1||g.companyEconomy.version!==5)throw Error('Company shares require the integrated Expanded foundation.');
 const issuers=g.companyEconomy.companies.map(c=>({id:c.id,issued:100000,referenceCents:CompanyAuction.reference(c.book.accounts.equity,[]).referenceCents,suspended:false}));
 const positions=Object.fromEntries(g.companyEconomy.companies.map(c=>[c.id,{shares:100000,basis:c.book.accounts.equity}]));
 const basis=Object.values(positions).reduce((n,p)=>n+p.basis,0),capital=Math.floor(basis/4);
 // Recognize the founders' EXISTING issued ownership, not cash or new operating
 // assets. The trading cash is transferred from the existing corporate pool.
 const founder=GroupAccounting.post(GroupAccounting.opening('company:outside-shareholder'),'opening.existingCompanyVotes','existing-company-founders',{businessAssets:basis,equity:basis});
 const funded=CompanyFinance.withShares(g.companyEconomy,founder,capital);g.companyEconomy=funded.world;
 g.companySharesVersion=1;
 g.companyShareMarket={version:1,month:0,paidMonth:0,issuers,history:Object.fromEntries(issuers.map(i=>[i.id,[]])),outside:{book:funded.holder,positions},exchange:GroupAccounting.opening('company:exchange'),capital,parentCashNet:0,feesPaid:0,receipts:[],distributions:[]};
 for(const p of g.players)p.companyShares={version:1,positions:Object.fromEntries(issuers.map(i=>[i.id,{shares:0,basis:0}]))};
}
function companyShareState(g){
 const m=g.companyShareMarket,holders=g.players.map(p=>({id:p.id,book:p.financialGroup.parent,baseAssets:0,positions:p.companyShares.positions}));
 holders.push({id:'outside',book:m.outside.book,baseAssets:0,positions:m.outside.positions});
 return {version:1,month:m.month,issuers:m.issuers,holders,exchange:m.exchange,openingCash:holders.reduce((n,h)=>n+h.book.accounts.cash,0)+m.exchange.accounts.cash,feesPaid:m.feesPaid,receipts:m.receipts};
}
function companyShareParentReserve(plan){return (plan.groupPolicy?.bankSupport||0)+(plan.agencyPolicy?.capital||0)+(plan.agencyPolicy?.supportCap||0)+(plan.investmentPolicy?.institution?.capital||0)+(plan.investmentPolicy?.institution?.supportCap||0);}
function companyShareOrderReview(p,plan,rules){
 const orders=plan.companyShareOrders===undefined?[]:plan.companyShareOrders;
 if(!p.companyShares){if(plan.companyShareOrders!==undefined)throw Error('Company orders require the selected company-share rules.');return {cash:0,protectedCash:0,remaining:0};}
 if(!Array.isArray(orders))throw Error('Company orders must be a list of whole-share limit instructions.');
 const issuers=rules?.companyShareMarket?.issuers||rules?.companyShareSnapshot?.issuers;
 if(!issuers)throw Error('Current company quotes are required.');
 const full=orders.map(o=>({...o,holder:p.id}));
 // One parent cannot obtain control through ordinary portfolio orders; an
 // explicit reviewed control transaction is a separate approved action.
 for(const o of orders){if(!investmentExact(o,['issuer','side','shares','limitCents']))throw Error('Invalid company order fields.');if(o.side==='buy'&&(p.companyShares.positions[o.issuer]?.shares||0)+o.shares>50000)throw Error('Ordinary orders cannot exceed 50% ownership; control requires a reviewed offer.');}
 return CompanyAuction.orderQuote(issuers,{id:p.id,book:p.financialGroup.parent,positions:p.companyShares.positions},full,companyShareParentReserve(plan)+companyControlReserve(p,plan,rules));
}
function normalizeCompanySharePlan(g,p,plan){
 companyShareOrderReview(p,plan,g);if(p.companyShares)plan.companyShareOrders=investmentCopy(plan.companyShareOrders||[]);
}
function settleCompanyShareAuction(g,plans){
 if(g.companySharesVersion!==1)return [];
 const m=g.companyShareMarket;if(m.month!==g.cycle-1||m.paidMonth!==g.cycle-1)throw Error('Company auction is duplicate or unsettled.');
 for(const [i,p]of g.players.entries())normalizeCompanySharePlan(g,p,plans[i]);
 const orders=g.players.flatMap((p,i)=>(plans[i].companyShareOrders||[]).map(o=>({...o,holder:p.id}))),before=g.players.map(p=>p.financialGroup.parent.accounts.cash);
 const settled=CompanyAuction.settle(companyShareState(g),orders,g.cycle,Object.fromEntries(g.players.map((p,i)=>[p.id,companyShareParentReserve(plans[i])+companyControlReserve(p,plans[i],g)])));
 for(const [i,p]of g.players.entries()){const h=settled.holders.find(h=>h.id===p.id);p.financialGroup.parent=h.book;p.companyShares.positions=h.positions;m.parentCashNet+=h.book.accounts.cash-before[i];}
 const outside=settled.holders.find(h=>h.id==='outside');m.outside={book:outside.book,positions:outside.positions};m.exchange=settled.exchange;m.feesPaid=settled.feesPaid;m.receipts=settled.receipts;m.month=g.cycle;m.distributions=[];
 return settled.receipts.filter(r=>r.holder!=='outside').map(r=>g.players.find(p=>p.id===r.holder).name+' '+(r.side==='buy'?'bought ':'sold ')+r.shares.toLocaleString()+' shares in '+r.issuer+' for $'+r.consideration.toLocaleString()+' plus $'+r.fee.toLocaleString()+' exchange fees. Banking contracts are unchanged.');
}
function settleCompanyDistributions(g){
 if(g.companySharesVersion!==1)return [];
 const m=g.companyShareMarket;if(m.month!==g.cycle||m.paidMonth!==g.cycle-1)throw Error('Company distributions are duplicate or out of order.');
 for(const c of g.companyEconomy.companies){
  const liquidation=c.resolution?.month===g.cycle?c.resolution.equityDistribution:0,dividend=c.report.dividend,total=dividend+liquidation;
  const allocation=CompanyAuction.allocateDistribution(companyShareState(g),c.id,total);
  for(const [holder,amount]of Object.entries(allocation)){
   if(!amount)continue;
   const p=g.players.find(p=>p.id===holder),book=p?p.financialGroup.parent:m.outside.book;
   const paid=CompanyFinance.payShareholder(g.companyEconomy,book,amount);g.companyEconomy=paid.world;
   if(p){p.financialGroup.parent=paid.recipient;m.parentCashNet+=amount;}else m.outside.book=paid.recipient;
   m.distributions.push({issuer:c.id,holder,amount,kind:liquidation?'liquidation':'dividend'});
  }
  if(c.resolution)for(const holder of [...g.players.map(p=>({p,positions:p.companyShares.positions})),{p:null,positions:m.outside.positions}]){
   const position=holder.positions[c.id];if(!position.basis)continue;
   const book=holder.p?holder.p.financialGroup.parent:m.outside.book;
   const written=GroupAccounting.post(book,'company.resolutionLoss',c.id,{businessAssets:-position.basis,equity:-position.basis},-position.basis);
   if(holder.p)holder.p.financialGroup.parent=written;else m.outside.book=written;position.basis=0;
  }
 }
 // Advance a zero-payout month too; this does not create cash or a dividend.
 if(g.companyEconomy.shareMarket.paidMonth!==g.cycle){const zero=CompanyFinance.payShareholder(g.companyEconomy,m.outside.book,0);g.companyEconomy=zero.world;m.outside.book=zero.recipient;}
 m.paidMonth=g.cycle;
 return m.distributions.filter(r=>r.holder!=='outside').map(r=>g.players.find(p=>p.id===r.holder).name+' received $'+r.amount.toLocaleString()+' of company '+r.kind+' cash in its parent, not in bank deposits.');
}
function finishCompanyShares(g){
 if(g.companySharesVersion!==1)return [];
 const m=g.companyShareMarket;
 if(m.month!==g.cycle||m.paidMonth!==g.cycle)throw Error('Company payouts must settle before final valuation.');
 for(const c of g.companyEconomy.companies){
  m.history[c.id]=m.history[c.id].concat(c.report.profit).slice(-6);
  const quote=CompanyAuction.reference(c.book.accounts.equity,m.history[c.id]),issuer=m.issuers.find(i=>i.id===c.id);
  issuer.referenceCents=quote.referenceCents;issuer.suspended=!!c.resolution;
 }
 if(g.companyConsolidationVersion===1)for(const p of g.players)for(const id of Object.keys(p.companyConsolidation.acquisitions)){
  if(p.companyShares.positions[id].shares<=50000||m.issuers.find(i=>i.id===id).suspended)delete p.companyConsolidation.acquisitions[id];
 }
 return [];
}
function validateCompanyShareOwner(p,issuers){
 if(!investmentExact(p.companyShares,['version','positions'])||p.companyShares.version!==1||!investmentExact(p.companyShares.positions,issuers.map(i=>i.id)))throw Error('Invalid owned company portfolio.');
 let basis=0;for(const position of Object.values(p.companyShares.positions)){
  if(!investmentExact(position,['shares','basis'])||!investmentWhole(position.shares)||position.shares>(p.companyControl?100000:50000)||!investmentWhole(position.basis)||!position.shares&&position.basis)throw Error('Invalid company position.');basis+=position.basis;
 }
 if(basis!==p.financialGroup.parent.accounts.businessAssets)throw Error('Parent company assets and share basis do not reconcile.');
}
function validateCompanyShares(g){
 if(g.companySharesVersion===undefined){if(g.companyShareMarket!==undefined||g.players.some(p=>p.companyShares!==undefined||p.submitted?.companyShareOrders!==undefined)||Object.values(g.lastPlans||{}).some(p=>p.companyShareOrders!==undefined))throw Error('Unversioned company share state.');return;}
 const m=g.companyShareMarket,month=g.cycle-(g.gameOver?0:1);
 if(g.companySharesVersion!==1||g.investmentStrategyVersion!==1||g.version!==campaignVersion(g)||!investmentExact(m,['version','month','paidMonth','issuers','history','outside','exchange','capital','parentCashNet','feesPaid','receipts','distributions'])||m.version!==1||m.month!==month||m.paidMonth!==month||!investmentWhole(m.capital)||!Number.isSafeInteger(m.parentCashNet))throw Error('Invalid company ownership campaign boundary.');
 CompanyAuction.validate(companyShareState(g));
 if(!investmentExact(m.outside,['book','positions'])||!investmentExact(m.history,m.issuers.map(i=>i.id))||!Array.isArray(m.distributions)||m.distributions.length>18)throw Error('Invalid company market records.');
 const controlCash=g.companyControlVersion===1?g.companyControlMarket.lender.accounts.cash+g.companyControlMarket.provider.accounts.cash:0;
 if(m.capital!==g.companyEconomy.shareMarket.capital||m.outside.book.accounts.cash+m.exchange.accounts.cash+m.parentCashNet+controlCash!==m.capital+g.companyEconomy.shareMarket.distributed)throw Error('Company trading and parent cash flows do not reconcile.');
 for(const c of g.companyEconomy.companies){const issuer=m.issuers.find(i=>i.id===c.id),history=m.history[c.id];
  if(!Array.isArray(history)||history.length!==Math.min(6,month)||history.some(n=>!Number.isSafeInteger(n))||!issuer||issuer.suspended!==!!c.resolution||issuer.referenceCents!==CompanyAuction.reference(c.book.accounts.equity,history).referenceCents)throw Error('Stale or inconsistent issuer reference.');
 }
 const expected=[];
 if(month)for(const c of g.companyEconomy.companies){
  const liquidation=c.resolution?.month===month?c.resolution.equityDistribution:0;
  for(const [holder,amount]of Object.entries(CompanyAuction.allocateDistribution(companyShareState(g),c.id,c.report.dividend+liquidation)))if(amount)expected.push({issuer:c.id,holder,amount,kind:liquidation?'liquidation':'dividend'});
 }
 if(JSON.stringify(expected)!==JSON.stringify(m.distributions)||g.companyEconomy.shareMarket.paidMonth!==month||g.companyEconomy.shareMarket.paidAmount!==expected.reduce((n,r)=>n+r.amount,0))throw Error('Company shareholder distributions do not reconcile.');
 for(const p of g.players){validateCompanyShareOwner(p,m.issuers);if(p.submitted)normalizeCompanySharePlan(g,p,investmentCopy(p.submitted));}
}
function companyShareSnapshot(g,index){
 const m=g.companyShareMarket,p=g.players[index];
 return {version:1,month:m.month,issuers:investmentCopy(m.issuers),history:investmentCopy(m.history),outsideQuotes:CompanyAuction.outsideOrders(companyShareState(g)),
  ownership:m.issuers.map(i=>({issuer:i.id,outside:m.outside.positions[i.id].shares,banks:g.players.map(p=>({id:p.id,shares:p.companyShares.positions[i.id].shares}))})),
  receipts:investmentCopy(m.receipts.filter(r=>r.holder===p.id)),distributions:investmentCopy(m.distributions.filter(r=>r.holder===p.id))};
}
function projectCompanyShares(g,out,index){
 if(g.companySharesVersion!==1)return;
 out.companySharesVersion=1;out.companyShareSnapshot=companyShareSnapshot(g,index);out.me.companyShares=investmentCopy(g.players[index].companyShares);
 delete out.rival.companyShares;if(out.lastPlans?.[out.rival.id])delete out.lastPlans[out.rival.id].companyShareOrders;
}
function validateCompanySharesView(v){
 if(v.rival?.companyShares!==undefined||v.lastPlans?.[v.rival?.id]?.companyShareOrders!==undefined)throw Error('Private company order data exposed.');
 if(v.companySharesVersion===undefined){if(v.companyShareSnapshot!==undefined||v.me?.companyShares!==undefined||v.me?.submitted?.companyShareOrders!==undefined)throw Error('Unversioned company ownership view.');return;}
 const s=v.companyShareSnapshot;
 if(v.companySharesVersion!==1||v.version!==campaignVersion(v)||!investmentExact(s,['version','month','issuers','history','outsideQuotes','ownership','receipts','distributions'])||s.version!==1||s.month!==v.cycle-(v.gameOver?0:1)||!Array.isArray(s.issuers)||s.issuers.length!==6)throw Error('Invalid company ownership view.');
 validateCompanyShareOwner(v.me,s.issuers);
 validateCompanyShareSnapshot(v);
 if(!Array.isArray(s.receipts)||s.receipts.some(r=>r.holder!==v.me.id)||!Array.isArray(s.distributions)||s.distributions.some(r=>r.holder!==v.me.id))throw Error('Foreign company receipts exposed.');
 // Transport views can expose readiness as a boolean, not the private plan.
 if(v.me.submitted&&typeof v.me.submitted==='object')normalizeCompanySharePlan(v,v.me,investmentCopy(v.me.submitted));
}
function validateCompanyShareSnapshot(v){
 const s=v.companyShareSnapshot,companies=v.me.companySnapshot?.world.companies;
 if(!companies||!investmentExact(s.history,companies.map(c=>c.id))||!Array.isArray(s.ownership)||s.ownership.length!==6||!Array.isArray(s.outsideQuotes)||s.outsideQuotes.length>12)throw Error('Invalid public company market records.');
 const seen=new Set();
 for(const c of companies){
  const i=s.issuers.find(i=>i.id===c.id),history=s.history[c.id],o=s.ownership.find(o=>o.issuer===c.id);
  if(!investmentExact(i,['id','issued','referenceCents','suspended'])||i.issued!==100000||!Array.isArray(history)||history.length!==Math.min(6,s.month)||history.some(n=>!Number.isSafeInteger(n))||i.referenceCents!==CompanyAuction.reference(c.book.accounts.equity,history).referenceCents||i.suspended!==!!c.resolution)throw Error('Invalid public issuer quote.');
  if(!investmentExact(o,['issuer','outside','banks'])||!investmentWhole(o.outside)||!Array.isArray(o.banks)||o.banks.length!==2||new Set(o.banks.map(p=>p.id)).size!==2||o.banks.some(p=>!investmentExact(p,['id','shares'])||![v.me.id,v.rival.id].includes(p.id)||!investmentWhole(p.shares)||p.shares>(v.companyControlVersion===1?100000:50000))||o.outside+o.banks.reduce((n,p)=>n+p.shares,0)!==100000||o.banks.find(p=>p.id===v.me.id)?.shares!==v.me.companyShares.positions[c.id].shares)throw Error('Public ownership does not reconcile.');
 }
 for(const q of s.outsideQuotes){const i=s.issuers.find(i=>i.id===q.issuer),key=q.issuer+'/'+q.side;
  if(!investmentExact(q,['holder','issuer','side','shares','limitCents'])||q.holder!=='outside'||!i||i.suspended||!['buy','sell'].includes(q.side)||!investmentWhole(q.shares)||!q.shares||q.shares>2000||!investmentWhole(q.limitCents)||!q.limitCents||q.limitCents>CompanyAuction.RULES.maxPriceCents||seen.has(key))throw Error('Invalid public outside quote.');seen.add(key);
 }
 if(!Array.isArray(s.receipts)||s.receipts.length>6||!Array.isArray(s.distributions)||s.distributions.length>6)throw Error('Invalid public shareholder receipts.');
 const filled=new Set();
 for(const r of s.receipts){
  if(!investmentExact(r,['month','issuer','holder','side','shares','priceCents','consideration','fee','basisReleased','realized'])||r.holder!==v.me.id||r.month!==s.month||!s.month||!companies.some(c=>c.id===r.issuer)||filled.has(r.issuer)||!['buy','sell'].includes(r.side)||!investmentWhole(r.shares)||!r.shares||r.shares>100000||!investmentWhole(r.priceCents)||!r.priceCents||r.priceCents>CompanyAuction.RULES.maxPriceCents||!investmentWhole(r.consideration)||r.fee!==Math.ceil(r.consideration*25/10000)||!investmentWhole(r.basisReleased)||!Number.isSafeInteger(r.realized)||r.side==='buy'&&(r.basisReleased||r.realized)||r.side==='sell'&&r.realized!==r.consideration-r.basisReleased)throw Error('Invalid owner auction receipt.');filled.add(r.issuer);
 }
 const paid=new Set();for(const r of s.distributions){const c=companies.find(c=>c.id===r.issuer);
  if(!investmentExact(r,['issuer','holder','amount','kind'])||r.holder!==v.me.id||!c||paid.has(r.issuer)||!investmentWhole(r.amount)||!r.amount||!['dividend','liquidation'].includes(r.kind)||r.amount>(c.report?.dividend||0)+(c.resolution?.month===s.month?c.resolution.equityDistribution:0))throw Error('Invalid owner distribution receipt.');paid.add(r.issuer);
 }
}
