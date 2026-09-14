// Rival group development uses the same owner-visible books, funded instructions
// and delayed permissions as a human. It never assumes access to rival accounts.
function validateInvestmentStrategyRules(g){
 if(g.investmentStrategyVersion===undefined&&g.version!=='9.22')return;
 if(g.investmentStrategyVersion!==1||g.creditProductsVersion!==1||g.version!==campaignVersion(g))throw Error('Unsupported investment strategy campaign rules.');
}
function investmentStrategyReview(v,input){
 if(v.investmentStrategyVersion!==1)throw Error('Investment strategy requires the current integrated campaign rules.');
 const p=v.me,plan=investmentCopy(input),b=p.investmentBusiness,s=defaultInvestmentPlan(p),snap=p.investmentSnapshot;
 const doctrine=v.companyControlStrategyVersion===1?(p.doctrine?.key||p.doctrine):p.doctrine;
 const free=Math.max(0,p.financialGroup.parent.accounts.cash-(v.companyControlStrategyVersion===1?companyControlReserve(p,plan,v):0)-(plan.groupPolicy?.bankSupport||0)-(plan.agencyPolicy?.capital||0)-(plan.agencyPolicy?.supportCap||0));
 const clients=snap.clients,assets=clients.reduce((n,c)=>n+c.cash+c.units*snap.price+investmentViewPosition(p,c).value,0);
 const active=b.status==='active',closed=b.status==='closed',age=active?v.cycle-b.opened:0;
 let reason='',targetCapital=0;
 const reserve=groupCapitalQuote(p),bankSafe=!reserve.restricted&&p.stats.cash>p.stats.deposits*.08;
 if(!active){
  // A failed experiment is not immediately relaunched. Ordinary community-bank
  // identities wait longer; diversification remains optional, not a free tier.
  const interested=doctrine!=='community'||v.cycle>=36;
  s.institution={...s.institution,launch:true,advice:doctrine!=='commercial',brokerage:doctrine==='commercial',
   custody:'external',provider:doctrine==='digital'?'harbor':'atlas',feeBp:90,maintain:true,supportCap:0,
   roles:{adviser:doctrine==='commercial'?0:1,broker:doctrine==='commercial'?1:0,principal:doctrine==='commercial'?1:0,operations:1}};
  const q=InvestmentInstitution.quote(b,s.institution,v.cycle);
  // Fund two years of published fixed bills, plus the actual startup and
  // operating-capital floor. This is risk capital, not a profit forecast.
  targetCapital=Math.ceil((q.minimumCapital+q.upfront+q.recurring*24)/1000)*1000;
  if(!interested||closed&&v.cycle-b.closure.cycle<24||!bankSafe||snap.funding.length<12){
   reason='Keep banking focused; strategy, recovery or reachable client scale does not support a new investment business.';
   plan.investmentPolicy=defaultInvestmentPlan(p);return {plan,reason,targetCapital,assets,recurring:q.recurring};
  }
  if(free<targetCapital){
   if(!plan.groupPolicy.bankSupport)plan.groupPolicy.bankDividend=Math.max(plan.groupPolicy.bankDividend,Math.min(reserve.dividendLimit,targetCapital-free));
   reason='Accumulate actual retained bank profit in the parent before a funded launch; proposed dividends cannot pay this month’s launch.';
   plan.investmentPolicy=defaultInvestmentPlan(p);return {plan,reason,targetCapital,assets,recurring:q.recurring,...(v.companySharesVersion===1?{savingForLaunch:true}:{})};
  }
  s.institution.capital=targetCapital;reason='Fund a qualified external-provider business with a two-year fixed-cost runway.';
 }else{
  s.institution.maintain=true;s.institution.supportCap=0;
  let q=InvestmentInstitution.quote(b,s.institution,v.cycle);
  const cushion=Math.max(q.requiredFunding,q.minimumCapital+q.total+q.recurring*6-b.book.accounts.equity);
  if(cushion>0)s.institution.capital=Math.min(free,Math.ceil(cushion/1000)*1000);
  const operatingLoss=(snap.performance?.fees||0)-(snap.performance?.providerCost||0)-q.recurring;
  if(age>=18&&operatingLoss<0&&q.requiredFunding>s.institution.capital){
   plan.investmentPolicy={...defaultInvestmentPlan(p),close:true};
   plan.investmentPolicy.institution.supportCap=0;
   return {plan,reason:'Wind down an unsupported loss-making business through the normal client-release and capital-return process.',targetCapital:0,assets,recurring:q.recurring};
  }
  // Scale an existing permitted service only when workload and funded payroll
  // justify another real hire. Never hire into an unrelated licensed profession.
  for(const [role,service]of [['adviser','advice'],['broker','brokerage']]){
   const count=clients.filter(c=>c.service===service).length,held=s.institution.roles[role];
   if(held&&count>held*InvestmentInstitution.ROLES[role].capacity*.8&&Object.values(s.institution.roles).reduce((n,x)=>n+x,0)<InvestmentInstitution.RULES.maxEmployees){
    const candidate={...s.institution,roles:{...s.institution.roles,[role]:held+1}},hiring=InvestmentInstitution.quote(b,candidate,v.cycle);
    if(hiring.requiredFunding<=s.institution.capital&&b.book.accounts.cash+s.institution.capital>hiring.total+hiring.recurring*12)s.institution=candidate;
   }
  }
  q=InvestmentInstitution.quote(b,s.institution,v.cycle);
  // Owning carrying is an economic choice at scale, not an automatic upgrade.
  // Client migration and permissions still require their normal time and costs.
  if(doctrine==='commercial'&&s.institution.brokerage&&b.policy.custody==='external'&&!b.migration&&assets>100000000&&age>=24){
   const owned={...s.institution,custody:'owned'},ownQuote=InvestmentInstitution.quote(b,owned,v.cycle),externalVariable=assets*InvestmentInstitution.PROVIDERS[b.policy.provider].annualBp/120000,
    ownedVariable=assets*4/120000;
   if(q.recurring+externalVariable-ownQuote.recurring-ownedVariable>ownQuote.upfront/24&&free>=ownQuote.requiredFunding+ownQuote.recurring*6){
    owned.capital=Math.ceil((ownQuote.requiredFunding+ownQuote.recurring*6)/1000)*1000;
    if(owned.capital<=free)s.institution=owned;
   }
  }
  reason='Maintain permissions and service existing clients before pursuing funded growth.';
 }
 const q=InvestmentInstitution.quote(b,s.institution,v.cycle),eligibleMarkets=Object.keys(p.householdBook.markets).filter(m=>p.branches[m]>0);
 const markets=(eligibleMarkets.length?eligibleMarkets:[p.focus]).slice().sort((a,b)=>{
  const owned=m=>clients.filter(c=>c.market===m).length,possible=m=>snap.funding.filter(a=>a.market===m).length;
  return (possible(b)-owned(b))-(possible(a)-owned(a))||a.localeCompare(b);
 });
 s.market=markets[0];s.pursue=!!(q.permissions.advice||q.permissions.brokerage)&&!b.migration;
 if(active){
  const budget=planBudget(p,plan,v),due=p.accounting.accounts.payables||0;
  // Customer withdrawals exchange cash for an equal deposit liability. They
  // need liquidity, not discretionary equity-spending headroom. budget.remaining
  // includes the latter cap and must not stand in for actual available cash.
  let cash=Math.max(0,budget.cash-budget.total-Math.ceil(p.stats.deposits*.1)-due),orders=0;
  const sources=new Map();
  for(const a of snap.funding.slice().sort((a,b)=>a.lastCycle-b.lastCycle||a.clientId.localeCompare(b.clientId))){
   const c=clients.find(c=>c.id===a.clientId);
   if(!c||c.missed||!q.permissions[c.service]||orders>=16)continue;
   const key=a.market+'/'+a.segment;if(!sources.has(key))sources.set(key,InvestmentBankFunding.source(p,a.market,a.segment).unlocked);
   const amount=Math.min(a.limit,cash,sources.get(key),1000000);
   if(amount<100)continue;
   s.funding.push({clientId:c.id,amount,destination:'cash'});cash-=amount;sources.set(key,sources.get(key)-amount);orders++;
  }
  let wantedInventory=0;
  for(const c of clients.slice().sort((a,b)=>a.id.localeCompare(b.id))){
   if(c.missed||!q.permissions[c.service]||s.trades.length>=8)continue;
   const position=investmentViewPosition(p,c),fit=InvestmentSuitability.assess(c,snap.price,position);
   // Existing cash only. Today's staged contribution cannot fund a trade today.
   const amount=Math.min(1000000,Math.floor(Math.max(0,Math.min(fit.headroom,c.cash-1000)-5)/snap.price)*snap.price);
   if(amount>=snap.price){const quote=InvestmentTrading.quote(c,snap.price,position,'buy',amount);if(quote.wanted){s.trades.push({clientId:c.id,side:'buy',amount});wantedInventory+=quote.wanted*snap.price;}}
   else if(fit.excess>=snap.price&&c.units){const amount=Math.min(1000000,Math.ceil(fit.excess/snap.price)*snap.price,c.units*snap.price);s.trades.push({clientId:c.id,side:'sell',amount});}
  }
  // Inventory changes are an actual bank-security sale, not new securities or
  // subsidiary capital. It can supply next month's orders, never this month's.
  s.inventorySale=Math.floor(Math.min(p.accounting.accounts.securities,wantedInventory,100000)/100)*100;
  const recurringNet=(snap.performance?.fees||0)-(snap.performance?.providerCost||0)-q.recurring;
  if(!s.institution.capital&&recurringNet>0&&q.dividendLimit>q.recurring*6)s.institution.dividend=Math.floor((q.dividendLimit-q.recurring*6)/2);
 }
 plan.investmentPolicy=s;
 normalizeGroupPlan(p,plan);normalizeAgencyPlan(p,plan);normalizeInvestmentPlan(p,plan,v);
 return {plan,reason,targetCapital,assets,recurring:q.recurring};
}
function planInvestmentStrategy(g,index,plan){
 if(g.investmentStrategyVersion!==1)return plan;
 const v=root.BWEngine.publicState(g,index);
 return investmentStrategyReview(v,plan).plan;
}
