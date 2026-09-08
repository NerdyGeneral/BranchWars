let accountingSuppressed=false,accountingSource='transaction';
function pilot(g){return g.campaignRulesVersion===1}
const pilotAct=campaignAct,pilotUpdateAct=updateCampaignAct;
campaignAct=function(g){return pilot(g)?{key:'rivalry',roman:'PILOT',name:'REGIONAL RIVALRY',pressure:1.2,depositCap:.035,text:'Six markets in two regions. Retreat is reversible. Only institutional failure ends this pilot; scores never trigger a buyout.'}:pilotAct(g)};
updateCampaignAct=function(g){return pilot(g)?'':pilotUpdateAct(g)};
function syncAccounts(p){const a=p.accounting.accounts;Object.assign(p.stats,{cash:a.cash,loans:a.loans,deposits:a.deposits,emergencyDebt:a.emergencyDebt,capital:a.equity,earnings:p.accounting.retainedEarnings})}
function bookPost(p,type,amount){p.accounting=AccountingPrototype.transact(p.accounting,type,amount);syncAccounts(p)}
function provideCash(p,amount,reservedLoans=0){
 let gap=Math.max(0,amount-p.stats.cash);
 for(const [asset,baseBps] of [['securities',200],['loans',600]]){
  if(!gap)break;
  const bps=asset==='loans'?creditSaleHaircut(p,baseBps):baseBps;
  const face=Math.min(Math.max(0,p.accounting.accounts[asset]-(asset==='loans'?reservedLoans:0)),Math.ceil(gap/(1-bps/10000)));
  if(face){p.accounting=AccountingPrototype.sell(p.accounting,asset,face,bps);syncAccounts(p);gap=Math.max(0,amount-p.stats.cash)}
 }
 if(gap)bookPost(p,'borrow',gap);
}
const deltaBeforePilot=delta;
delta=function(p,k,n){
 if(!p.accounting)return deltaBeforePilot(p,k,n);
 if(!['cash','deposits','loans','capital','earnings','emergencyDebt'].includes(k))return deltaBeforePilot(p,k,n);
 if(accountingSuppressed)return;
 n=Math.round(n);if(!Number.isSafeInteger(n))throw Error('Invalid financial movement');if(!n)return;
 if(k==='capital'||k==='earnings'){if(k==='capital'&&['applyCapitalRequest','legacyCapital'].includes(accountingSource))return;throw Error('Unmapped equity movement in '+accountingSource)}
 if(k==='cash'){
  if(n<0){provideCash(p,-n);p.accounting=AccountingPrototype.post(p.accounting,accountingSource,{cash:n,equity:n},n)}
  else {const capital=['applyCapitalRequest','awardMilestones','legacyCapital'].includes(accountingSource);p.accounting=AccountingPrototype.post(p.accounting,accountingSource,{cash:n,equity:n},capital?0:n)}
 }else if(k==='deposits'){
  if(n<0){n=-Math.min(-n,p.stats.deposits);provideCash(p,-n)}
  p.accounting=AccountingPrototype.post(p.accounting,accountingSource,{cash:n,deposits:n});
 }else if(k==='loans'){
  if(n>0){provideCash(p,n);p.accounting=AccountingPrototype.post(p.accounting,accountingSource,{cash:-n,loans:n})}
  else {n=-Math.min(-n,p.stats.loans);p.accounting=AccountingPrototype.post(p.accounting,accountingSource,{loans:n,equity:n},n)}
 }else throw Error('Emergency debt must use an explicit funding transaction');
 syncAccounts(p);
};
function sourced(name,fn){return function(...args){const prev=accountingSource;accountingSource=name;try{return fn(...args)}finally{accountingSource=prev}}}
applyDecision=sourced('applyDecision',applyDecision);applyCapitalRequest=sourced('applyCapitalRequest',applyCapitalRequest);
resolveCompetitiveActions=sourced('resolveCompetitiveActions',resolveCompetitiveActions);startProject=sourced('startProject',startProject);
awardOpportunity=sourced('awardOpportunity',awardOpportunity);consequences=sourced('consequences',consequences);
applyInvestments=sourced('applyInvestments',applyInvestments);applyHiring=sourced('applyHiring',applyHiring);awardMilestones=sourced('awardMilestones',awardMilestones);

function postMonthlyOperations(g,p,preview=false){
 if(!p.accounting)return runLegacyOperations(g,p,preview);
 const before=JSON.parse(JSON.stringify(p.accounting)),prev=accountingSuppressed;
 // Keep legacy demand/operational effects, but none of its financial mutations.
 // Work on a clone so income/loss formulas still see produced loans/deposits.
 const calculation=JSON.parse(JSON.stringify(p));delete calculation.accounting;
 const text=runLegacyOperations(g,calculation,preview),r={...calculation.operatingReport};
 const securitiesIncome=Math.round(before.accounts.securities*(g.economy.rate/1200));
 r.otherIncome+=securitiesIncome;r.profit+=securitiesIncome;
 // Apply funding in actual chronological order, not by borrowing an unexplained residual.
 const inflow=Math.round(r.depositGrowth+r.depositRunoff),originations=Math.round(r.loanGrowth+r.chargeoff);
 if(p.creditBook){
  const parts=p.creditPortfolio?creditProductionParts(p,g,originations):null;
  const terms=parts&&originations?{rate:parts.reduce((n,c)=>n+c.principal*c.rate,0)/originations,risk:parts.reduce((n,c)=>n+c.principal*c.risk,0)/originations}:creditTerms(p,g),oldInterest=r.loanIncome,oldLoss=r.chargeoff,total=p.stats.loans+originations;
  r.loanIncome=p.creditBook.cohorts.reduce((n,c)=>n+performingCredit(c)*c.rate/1000000,0)+originations*terms.rate/1000000;
  const weightedRisk=p.creditBook.cohorts.reduce((n,c)=>n+c.principal*c.risk/10000,0)+originations*terms.risk/10000;
  const ops=strategyLevel(p,'operations'),guard=Math.max(.28,1-(workforceAllocation(p).operations+p.upgrades.training+p.upgrades.operations+ops*.65)*.075)*(hasSpecialization(p,'operations','resilience')?.82:1);
  r.chargeoff=p.creditPerformance?p.creditPerformance.report.loss:Math.min(total,Math.round(weightedRisk*.0025*g.economy.credit*guard*(p.turnEffects.credit||1)*(productOption(p,'business').risk||1)*(hasSpecialization(p,'commercial','specializedCredit')?1.08:1)));
  const change=(r.loanIncome-oldInterest)*(p.turnEffects.profit||1)+oldLoss-r.chargeoff;
  r.eventAdjustment+=(r.loanIncome-oldInterest)*((p.turnEffects.profit||1)-1);
  r.profit=Math.round(r.profit+change);r.loanGrowth=originations-r.chargeoff;
  calculation.stats.chargeoffs+=r.chargeoff-oldLoss;
 }
 accountingSource='operate';
 try{
  delta(p,'deposits',inflow);const beforeRunoff=p.stats.deposits;delta(p,'deposits',-r.depositRunoff);if(p.termFunding){r.depositRunoff=beforeRunoff-p.stats.deposits;r.depositGrowth=inflow-r.depositRunoff;calculation.stats.depositRunoff=r.depositRunoff}delta(p,'loans',originations);
  adjustDepositReport(p,g,r);
  if(p.creditPortfolio){
   const actualInterest=p.creditBook.cohorts.reduce((n,c)=>n+performingCredit(c)*c.rate/1000000,0),difference=actualInterest-r.loanIncome;
   r.loanIncome=actualInterest;r.eventAdjustment+=difference*((p.turnEffects.profit||1)-1);
   r.profit=Math.round(r.profit+difference*(p.turnEffects.profit||1));
  }
  adjustAdvertisingReport(p,r);
  adjustRelationshipOfferReport(p,r);
  adjustOnboardingReport(p,r);
  if(p.creditPerformance){const credit=p.creditPerformance.report;r.collectionsCost=credit.cost;r.creditRecovery=credit.recovered;r.creditEntered=credit.entered;r.creditCured=credit.cured;r.interestForgone=p.creditBook.cohorts.reduce((n,c)=>n+(c.principal-performingCredit(c))*c.rate/1000000,0);r.expense+=credit.cost;r.profit-=credit.cost}
  settleWorkforceOperatingExpense(p,r);calculation.stats.fundingCost=Math.round(r.fundingCost);
  const corporate=adjustCorporateIncomeReport(g,p,r,preview);
  const grossIncome=Math.round(r.depositIncome+r.loanIncome+r.commercialIncome+r.otherIncome),income=grossIncome-(corporate?.receivable||0),expense=Math.round(r.fundingCost+r.expense),event=Math.round(r.eventAdjustment);
  const rounding=r.profit-(grossIncome-expense+event-Math.round(r.chargeoff)-(corporate?.writtenOff||0));
  if(Math.abs(rounding)>2)throw Error('Operating report does not reconcile');
  postCorporateReceivables(g,p,corporate,preview);
  delta(p,'cash',income+Math.max(0,event+rounding));delta(p,'cash',-(expense+Math.max(0,-event-rounding)));if(!p.creditPerformance)delta(p,'loans',-Math.round(r.chargeoff));
  for(const k of Object.keys(p.stats))if(!['cash','loans','deposits','capital','earnings','emergencyDebt'].includes(k))p.stats[k]=calculation.stats[k];
  r.closingCash=p.stats.cash;r.closingEquity=p.stats.capital;r.fundingLoss=p.accounting.journal.filter(e=>e.id>before.sequence&&e.source.startsWith('sell.')).reduce((n,e)=>n-e.earnings,0);p.operatingReport=r;p.stats.lastProfit=r.profit;p.fundingGap=0;
 }finally{accountingSuppressed=prev;accountingSource='transaction'}
 return p.name+' produced $'+inflow.toLocaleString()+' of deposits and $'+originations.toLocaleString()+' of loans; operating profit $'+r.profit.toLocaleString()+' includes $'+securitiesIncome.toLocaleString()+' securities income. Credit losses $'+r.chargeoff.toLocaleString()+'; funding-sale losses $'+r.fundingLoss.toLocaleString()+'.';
}
const pilotDeleverage=deleverage;
deleverage=function(g,p){
 if(!p.accounting)return pilotDeleverage(g,p);
 if(tierRank(p)<2||p.stats.loans<250000)return '';
 const sold=Math.round(p.stats.loans*.03),bps=creditSaleHaircut(p,700);p.accounting=AccountingPrototype.sell(p.accounting,'loans',sold,bps);syncAccounts(p);
 return p.name+' sold $'+sold.toLocaleString()+' of loans at a '+(bps/100)+'% regulatory haircut.';
};
const pilotSettle=settleFunding;
settleFunding=function(g,p,outflow){
 if(!p.accounting)return pilotSettle(g,p,outflow);
 if(outflow)throw Error('Pilot deposit outflows must settle at transfer');
 const reserve=Math.round(p.stats.deposits*({liquid:.1,balanced:.05,reinvest:.02}[p.policies.capital]||.05));
 const duePayables=p.accounting.version===3?p.accounting.accounts.payables:0;
 const amount=Math.min(p.stats.emergencyDebt,Math.max(0,p.stats.cash-reserve-duePayables));
 if(amount){bookPost(p,'repayDebt',amount);return[p.name+' repaid $'+amount.toLocaleString()+' of emergency debt.']}return [];
};


const pilotDividends=franchiseDividends;
franchiseDividends=function(g){return pilot(g)?[]:pilotDividends(g)};
const pilotEnd=evaluateStrategicEnd;
evaluateStrategicEnd=function(g){
 if(!pilot(g))return pilotEnd(g);
 g.buyoutPressure=[0,0];g.consolidationStalemate=0;
 const failed=g.players.filter(p=>(p.distress||0)>=RECEIVERSHIP_CYCLES);
 if(!failed.length)return '';
 g.gameOver=true;g.endReason='receivership';g.winnerId=failed.length===2?null:g.players.find(p=>p!==failed[0]).id;g.failedId=failed.length===1?failed[0].id:null;
 return 'RECEIVERSHIP // '+failed.map(p=>p.name).join(' and ')+' failed. Assets remain in resolution; no free franchise is awarded.';
};
const pilotExits=resolveMarketExits;
resolveMarketExits=function(g){
 if(!pilot(g))return pilotExits(g);
 const lines=[];
 for(const [key,t]of activeTerritories(g))for(let i=0;i<2;i++){
  t.exited=[false,false];t.exitStreak[i]=t.shares[i]<12?t.exitStreak[i]+1:0;
  if(t.exitStreak[i]>=3&&g.players[i].branches[key]>0&&!(t.reentryUntil&&t.reentryUntil[i]>=g.cycle)){
   const p=g.players[i],models=p.facilityMarkets[key]||[];
   for(const model of models)p.facilities[model]=Math.max(0,p.facilities[model]-1);
   p.facilityMarkets[key]=[];p.branches[key]=0;t.exitStreak[i]=0;delta(p,'reputation',-5);
   lines.push(p.name+' withdrew its offices from '+t.name+'. Paid re-entry remains available; rivals receive no free branch or dividend.');
  }
 }
 return lines;
};
function initializeRegionalPilot(g,o){
 if(o.campaignRulesVersion!==1)return g;
 g.campaignRulesVersion=1;
 g.regions={heartland:{name:'Heartland',markets:['downtown','northside','industrial']},growthCoast:{name:'Growth Coast',markets:['suburbs','county','university']}};
 // Stable existing market IDs; economic distinctiveness starts with existing specialties.
 const regionKeys=Object.keys(g.territories),left=regionKeys.slice(0,3),right=regionKeys.slice(3);
 g.regions.heartland.markets=left;g.regions.growthCoast.markets=right;
 for(const [i,key]of regionKeys.entries()){g.territories[key].region=i<3?'heartland':'growthCoast';g.territories[key].unlock=1;g.territories[key].exited=[false,false]}
 for(const p of g.players){
  p.accounting=AccountingPrototype.opening();syncAccounts(p);
  if(g.scenario==='rate'){bookPost(p,'deposit',1600000);bookPost(p,'issueEquity',250000)}
  if(g.scenario==='growth')bookPost(p,'issueEquity',450000);
 }
 g.trend=[];captureTrend(g,0);
 return g;
}


function pilotSpendingLimit(p,buffer=.08,reserve=0){return p.accounting?Math.max(0,Math.min(p.stats.cash-(p.accounting.version===3?p.accounting.accounts.payables:0),Math.floor(p.stats.capital-riskAssets(p)*buffer-reserve))):p.stats.cash}


function planPilotReserve(g,index,plan){
 if(!pilot(g))return plan;
 const p=g.players[index],forecast=operatingPreview(p,plan,g.economy),limit=pilotSpendingLimit(p,.10,200000+Math.max(0,-forecast.profit)*2);
 if(plan.competitiveAction==='takeoverDefense')plan.competitiveAction='none';
 let available=limit-(COMPETITIVE_ACTIONS[plan.competitiveAction]||COMPETITIVE_ACTIONS.none).cost;
 if(available<0){plan.competitiveAction='none';available=limit}
 plan.hires=0;
 const projects=[];
 if(!(p.branches[plan.focus]||0)&&!p.projects.some(x=>x.key==='branch')&&!projectBarred(p,'branch')&&projectCost(p,PROJECTS.branch)<=available&&usedCapacity(p,[PROJECTS.branch])<=executionCapacity(p,plan.allocation)){
  projects.push('branch');available-=projectCost(p,PROJECTS.branch);
 }else for(const key of planInitiatives(plan)){const cost=projectCost(p,PROJECTS[key]);if(cost<=available){projects.push(key);available-=cost}}
 plan.newProjects=projects;
 plan.newProject=projects[0]||null;
 for(const key of Object.keys(plan.investments||{})){const amount=Math.min(plan.investments[key],Math.floor(available));plan.investments[key]=amount>=1000?amount:0;available-=plan.investments[key]}
 if(forecast.profit>60000&&hireCost(p,1)<=available&&hireLimit(p)>0)plan.hires=1;
 return plan;
}
function validateAccountingSave(g){
 if(g.campaignRulesVersion===undefined){if(g.players.some(p=>p.accounting))throw Error('Unversioned accounting save');return g}
 if(g.campaignRulesVersion!==1||g.fundingRulesVersion!==2)throw Error('Unsupported pilot save');
 if(!g.regions||Object.keys(g.territories).length!==6)throw Error('Invalid pilot geography');
 for(const [key,t]of Object.entries(g.territories))if(!g.regions[t.region]||!g.regions[t.region].markets.includes(key)||t.exited.some(Boolean))throw Error('Invalid pilot market');
 for(const p of g.players){
  if(!p.accounting||p.accounting.journal.length>192)throw Error('Invalid pilot accounts');
  if(p.accounting.version!==([4,5,6].includes(g.financialGroupVersion)?3:[2,3].includes(g.financialGroupVersion)?2:1))throw Error('Invalid accounting book');
  const checked=AccountingPrototype.restore(AccountingPrototype.snapshot(p.accounting,96));
  const a=checked.accounts;
  for(const [stat,account]of Object.entries({cash:'cash',loans:'loans',deposits:'deposits',capital:'equity',emergencyDebt:'emergencyDebt'}))if(p.stats[stat]!==a[account])throw Error('Bank statistics disagree with accounts');
  if(p.stats.earnings!==checked.retainedEarnings)throw Error('Retained earnings disagree with accounts');
 }
 return g;
}
// Regional operations v1: new pilots only. Existing campaigns retain their rules.
