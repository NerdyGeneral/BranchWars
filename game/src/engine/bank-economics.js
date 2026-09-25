// Explicit prospective economics. Existing campaigns keep their exact revenue
// terms and salary. This marker is never inferred from a save or default setup.
function bankBasePayroll(p){return [1,2].includes(p.bankEconomicsVersion)?12000:18000;}
function bankAbstractIncome(p,legacyAmount){return [1,2].includes(p.bankEconomicsVersion)?0:legacyAmount;}
function initializeBankEconomics(g,o){
 if(![1,2].includes(o.bankEconomicsVersion))return;
 g.bankEconomicsVersion=o.bankEconomicsVersion;
 for(const p of g.players){
  p.bankEconomicsVersion=o.bankEconomicsVersion;
  if(o.bankEconomicsVersion===2){
   // New opening only. Represent the existing balance sheet; do not grant cash,
   // change opening equity, or invent backdated transactions on a saved bank.
   const s=p.stats,b=AccountingPrototype.opening();
   Object.assign(b.accounts,{cash:s.cash,loans:s.loans,deposits:s.deposits,equity:s.capital,emergencyDebt:s.emergencyDebt||0});
   b.accounts.securities=s.deposits+(s.emergencyDebt||0)+s.capital-s.cash-s.loans;
   b.journalBase={accounts:{...b.accounts},retainedEarnings:0,sequence:0};
   AccountingPrototype.check(b);p.accounting=b;syncAccounts(p);
  }
 }
}
function validateBankEconomicsCampaign(g){
 const enabled=[1,2].includes(g.bankEconomicsVersion);
 if(['8.18','8.19','9.32'].includes(g.version)&&!enabled)throw Error('Missing bank economics rules.');
 if(g.bankEconomicsVersion!==undefined&&!enabled)throw Error('Unsupported bank economics rules.');
 if(g.players.some(p=>p.bankEconomicsVersion!==(enabled?g.bankEconomicsVersion:undefined)))throw Error('Bank economics owner rules do not match the campaign.');
 if(enabled)validateCampaignRules(g,'game');
}
function projectBankEconomics(g,out){
 if([1,2].includes(g.bankEconomicsVersion)){
  out.bankEconomicsVersion=g.bankEconomicsVersion;out.me.bankEconomicsVersion=g.bankEconomicsVersion;
  if(g.bankEconomicsVersion===2)out.me.accounting=JSON.parse(JSON.stringify(g.players.find(p=>p.id===out.me.id).accounting));
 }
}
function validateBankEconomicsView(v){
 if(['8.18','8.19','9.32'].includes(v.version)&&![1,2].includes(v.bankEconomicsVersion))throw Error('Missing bank economics view rules.');
 if(v.me?.bankEconomicsVersion!==v.bankEconomicsVersion||v.rival?.bankEconomicsVersion!==undefined)throw Error('Invalid bank economics owner view.');
 if(v.bankEconomicsVersion!==undefined)validateCampaignRules(v,'view');
 if(v.bankEconomicsVersion===2){
  validateCoreBalanceOwner(v.me);
  if(v.rival?.accounting!==undefined)throw Error('Private rival accounting exposed.');
 }
}
function validateCoreBalanceOwner(p){
 if(p.bankEconomicsVersion!==2||p.fundingRulesVersion!==2||p.accounting?.version!==1||p.accounting.journal.length>192)throw Error('Invalid Core balance sheet.');
 const b=AccountingPrototype.restore(AccountingPrototype.snapshot(p.accounting,96));
 for(const [stat,key]of Object.entries({cash:'cash',loans:'loans',deposits:'deposits',capital:'equity',emergencyDebt:'emergencyDebt'}))
  if(p.stats[stat]!==b.accounts[key])throw Error('Core statistics disagree with accounts.');
 if(p.stats.earnings!==b.retainedEarnings)throw Error('Core retained earnings disagree with accounts.');
}
function coreBalanceTransfer(buyer,seller,deposits,loans){
 // Preserve the sold loan book while raising the backing settlement cash.
 const settlement=deposits-loans;
 if(settlement>0)provideCash(seller,settlement,loans);
 else if(settlement<0)provideCash(buyer,-settlement);
 const result=AccountingPrototype.acquisition(buyer.accounting,seller.accounting,{deposits,loans,premium:0});
 buyer.accounting=result.buyer;seller.accounting=result.seller;syncAccounts(buyer);syncAccounts(seller);
}
function coreBookAcquisition(g,p,project){
 const terms=acquisitionTerms(g,p,project.target),rival=g.players[terms.seller],previous=accountingSuppressed;
 let result;
 // Retain the authored customer/branch/market effects, replacing only their
 // four financial deltas with one conserved, backed book transfer.
 try{accountingSuppressed=true;result=applyBaseProjectEffects(g,p,project);}
 finally{accountingSuppressed=previous;}
 coreBalanceTransfer(p,rival,terms.depositTake,terms.loanTake);return result;
}
function coreBookAbsorption(g,winner,loser){
 const w=winner.stats?winner:g.players[winner],l=loser.stats?loser:g.players[loser],
  deposits=Math.round(l.stats.deposits*.72),loans=Math.round(l.stats.loans*.55),
  customers=Math.round(l.stats.customers*.65),business=Math.round(l.stats.business*.5),previous=accountingSuppressed;
 try{accountingSuppressed=true;absorbFranchise(g,w,l);}
 finally{accountingSuppressed=previous;}
 delta(l,'customers',-customers);delta(l,'business',-business);
 coreBalanceTransfer(w,l,deposits,loans);
}
