// Book-value acquisition reporting for the fictional game charter. This is a
// pure consolidation worksheet, never a transfer of spendable cash or client
// assets, and is not a representation of comprehensive financial-reporting law.
const CompanyConsolidation=(()=>{
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 const integer=(n,signed=false)=>{if(!Number.isSafeInteger(n)||!signed&&n<0)throw Error('Invalid consolidation amount.');return n;};
 const fraction=(n,numerator,denominator)=>{integer(n,true);integer(numerator);integer(denominator);if(!denominator)throw Error('Invalid ownership denominator.');return integer(Number(BigInt(n)*BigInt(numerator)/BigInt(denominator)),true);};
 function validate(a){
  if(!exact(a,['version','month','issued','shares','basis','netAssets','retainedEarnings','addedShares','purchase','carriedGoodwill','earningsOffset','continuedControl'])||a.version!==1||!Number.isSafeInteger(a.month)||a.month<1||a.issued!==100000||!Number.isSafeInteger(a.shares)||a.shares<=50000||a.shares>100000||!Number.isSafeInteger(a.addedShares)||a.addedShares<1||a.addedShares>a.shares||typeof a.continuedControl!=='boolean')throw Error('Invalid company acquisition worksheet.');
  for(const k of ['basis','netAssets','purchase','carriedGoodwill'])integer(a[k]);for(const k of ['retainedEarnings','earningsOffset'])integer(a[k],true);
  if(!a.netAssets||a.purchase>a.basis||a.carriedGoodwill>a.basis-a.purchase||a.continuedControl!==(a.shares-a.addedShares>50000)||!a.continuedControl&&(a.carriedGoodwill||a.earningsOffset))throw Error('Inconsistent company acquisition basis.');
 }
 function goodwill(a){validate(a);return a.continuedControl?a.carriedGoodwill+Math.max(0,a.purchase-fraction(a.netAssets,a.addedShares,a.issued)):Math.max(0,a.basis-fraction(a.netAssets,a.shares,a.issued));}
 function contribution(a,book,shares){validate(a);GroupAccounting.validate(book);integer(shares);if(shares>a.shares)throw Error('Ownership increased without a new acquisition worksheet.');
  return {goodwill:fraction(goodwill(a),shares,a.shares),earnings:fraction(a.earningsOffset,shares,a.shares)+fraction(book.retainedEarnings-a.retainedEarnings,shares,a.issued)};
 }
 function capture({month,book,sharesBefore,basisBefore,addedShares,purchase,previous=null}){
  GroupAccounting.validate(book);integer(sharesBefore);integer(basisBefore);integer(addedShares);integer(purchase);
  if(sharesBefore>50000&&!previous)throw Error('Existing control has no acquisition worksheet.');
  const continuedControl=sharesBefore>50000,prior=continuedControl?contribution(previous,book,sharesBefore):{goodwill:0,earnings:0};
  const a={version:1,month,issued:100000,shares:sharesBefore+addedShares,basis:basisBefore+purchase,netAssets:book.accounts.equity,retainedEarnings:book.retainedEarnings,addedShares,purchase,carriedGoodwill:prior.goodwill,earningsOffset:prior.earnings,continuedControl};validate(a);return a;
 }
 function summarize(base,entries){
  if(!base||base.assets!==base.liabilities+base.equity||base.residual!==0||!Array.isArray(entries)||entries.length>6)throw Error('Invalid starting group totals.');
  const result={...base,ownerEquity:base.equity,noncontrollingEquity:0,controlledBasisEliminated:0,internalBalancesEliminated:0,companyGoodwill:0,companyEarningsAdjustment:0,controlledCompanies:[]},seen=new Set();
  for(const entry of entries){
   if(!exact(entry,['issuer','shares','basis','book','acquisition','internalDeposits','internalFees'])||typeof entry.issuer!=='string'||!entry.issuer||seen.has(entry.issuer))throw Error('Invalid controlled company worksheet.');seen.add(entry.issuer);
   integer(entry.shares);integer(entry.basis);integer(entry.internalDeposits);integer(entry.internalFees);
   if(entry.shares<=50000||entry.shares>100000)throw Error('Only controlling stakes are consolidated.');
   const totals=GroupAccounting.validate(entry.book),a=entry.acquisition,c=contribution(a,entry.book,entry.shares);
   if(entry.internalDeposits>entry.book.accounts.cash||entry.internalFees>entry.book.accounts.payables)throw Error('Internal balances exceed company assets or obligations.');
   const ownedNetAssets=fraction(totals.equity,entry.shares,100000),outsideEquity=totals.equity-ownedNetAssets,elimination=entry.internalDeposits+entry.internalFees;
   result.assets+=totals.assets+c.goodwill-entry.basis-elimination;
   result.liabilities+=totals.liabilities-elimination;
   result.equity+=totals.equity+c.goodwill-entry.basis;
   result.noncontrollingEquity+=outsideEquity;result.controlledBasisEliminated+=entry.basis;result.internalBalancesEliminated+=elimination;result.companyGoodwill+=c.goodwill;result.companyEarningsAdjustment+=c.earnings;
   result.controlledCompanies.push({issuer:entry.issuer,shares:entry.shares,assets:totals.assets,liabilities:totals.liabilities,netAssets:totals.equity,ownedNetAssets,outsideEquity,costBasis:entry.basis,goodwill:c.goodwill,internalDeposits:entry.internalDeposits,internalFees:entry.internalFees,earningsAdjustment:c.earnings});
  }
  result.ownerEquity=result.equity-result.noncontrollingEquity;result.retainedEarnings+=result.companyEarningsAdjustment;
  result.eliminatedInvestment+=result.controlledBasisEliminated;result.operatingAssets=result.assets-result.custodyAssets;result.residual=result.assets-result.liabilities-result.equity;
  for(const k of ['assets','liabilities','equity','ownerEquity','noncontrollingEquity','retainedEarnings','operatingAssets','eliminatedInvestment'])integer(result[k],['equity','ownerEquity','noncontrollingEquity','retainedEarnings'].includes(k));
  if(result.residual!==0)throw Error('Controlled company consolidation does not balance.');return result;
 }
 return {capture,validate,goodwill,contribution,summarize};
})();

function initializeCompanyConsolidation(g,o){
 if(o.companyConsolidationVersion!==1)return;
 if(g.companyControlVersion!==1)throw Error('Company consolidation requires reviewed control.');
 g.companyConsolidationVersion=1;for(const p of g.players)p.companyConsolidation={version:1,acquisitions:{}};
}
function captureCompanyConsolidation(g,p,offer,purchase){
 if(g.companyConsolidationVersion!==1)return null;
 const position=p.companyShares.positions[offer.issuer],company=g.companyEconomy.companies.find(c=>c.id===offer.issuer);
 return CompanyConsolidation.capture({month:g.cycle,book:company.book,sharesBefore:position.shares,basisBefore:position.basis,addedShares:offer.shares,purchase,previous:p.companyConsolidation.acquisitions[offer.issuer]||null});
}
function companyConsolidatedSummary(g,p){
 const base=GroupAccounting.consolidate(p.financialGroup.parent,groupEntities(p),p.accounting);
 if(g.companyConsolidationVersion!==1)return base;
 const companies=companyControlCompanies(g),entries=[];
 for(const c of companies){const position=p.companyShares.positions[c.id];if(position.shares<=50000||c.resolution)continue;
  entries.push({issuer:c.id,shares:position.shares,basis:position.basis,book:c.book,acquisition:p.companyConsolidation.acquisitions[c.id],internalDeposits:p.commercialAccounts.accounts[c.id]?.balance||0,internalFees:c.bankArrears[p.corporate.index]});
 }
 return CompanyConsolidation.summarize(base,entries);
}
function validateCompanyConsolidationOwner(g,p){
 const s=p.companyConsolidation,companies=companyControlCompanies(g);
 if(!investmentExact(s,['version','acquisitions'])||s.version!==1||!s.acquisitions||Array.isArray(s.acquisitions)||Object.keys(s.acquisitions).some(id=>!companies.some(c=>c.id===id)))throw Error('Invalid company consolidation records.');
 for(const [id,a]of Object.entries(s.acquisitions)){CompanyConsolidation.validate(a);const c=companies.find(c=>c.id===id),deal=p.companyControl.deals.find(d=>d.status==='closed'&&d.offer.issuer===id&&d.closedMonth===a.month);
  if(p.companyShares.positions[id].shares<=50000||c.resolution)throw Error('Inactive control has a current consolidation worksheet.');
  if(a.month>g.cycle-(g.gameOver?0:1)||!deal||deal.settlement.purchase!==a.purchase||deal.offer.shares!==a.addedShares||a.netAssets-a.retainedEarnings!==c.book.accounts.equity-c.book.retainedEarnings)throw Error('Acquisition worksheet does not match the paid transaction or company capital.');
  const position=p.companyShares.positions[id];if(position.shares===a.shares&&!c.resolution&&position.basis!==a.basis)throw Error('Unchanged controlled ownership has different investment basis.');
 }
 for(const c of companies)if(p.companyShares.positions[c.id].shares>50000&&!c.resolution&&!s.acquisitions[c.id])throw Error('Controlling ownership has no acquisition-date basis.');
 companyConsolidatedSummary(g,p);
}
function validateCompanyConsolidation(g){
 if(g.companyConsolidationVersion===undefined){if(g.players.some(p=>p.companyConsolidation!==undefined))throw Error('Unversioned company consolidation.');return;}
 if(g.companyConsolidationVersion!==1||g.companyControlVersion!==1||g.version!==campaignVersion(g))throw Error('Invalid company consolidation boundary.');
 for(const p of g.players)validateCompanyConsolidationOwner(g,p);
}
function projectCompanyConsolidation(g,out,index){if(g.companyConsolidationVersion===1){out.companyConsolidationVersion=1;out.me.companyConsolidation=investmentCopy(g.players[index].companyConsolidation);}delete out.rival.companyConsolidation;}
function validateCompanyConsolidationView(v){
 if(v.rival?.companyConsolidation!==undefined)throw Error('Private acquisition basis exposed.');
 if(v.companyConsolidationVersion===undefined){if(v.me?.companyConsolidation!==undefined)throw Error('Unversioned company consolidation view.');return;}
 if(v.companyConsolidationVersion!==1||v.companyControlVersion!==1||v.version!==campaignVersion(v))throw Error('Invalid consolidation view boundary.');validateCompanyConsolidationOwner(v,v.me);
}
