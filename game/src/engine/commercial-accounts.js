// Named-company operating accounts. CompanyFinance cash is the customer's total
// cash asset (including bank claims), not a second pile of physical currency.
// This subledger identifies its location. A bank receives spendable cash only
// against an equal deposit liability; neither party earns income from relocation.
const CommercialAccounts=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),uint=n=>Number.isSafeInteger(n)&&n>=0;
 const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join()===keys.slice().sort().join();
 const policy=()=>({target:null,staffQuarters:0});
 function checkPolicy(value,ids){
  if(!exact(value,['target','staffQuarters'])||!Number.isInteger(value.staffQuarters)||value.staffQuarters<0||value.staffQuarters>8||
   value.target!==null&&!ids.includes(value.target))throw Error('Choose an existing company and 0–8 quarters of commercial work.');
  return copy(value);
 }
 function opening(companies){return {version:1,cycle:0,rows:companies.map(c=>({id:c.id,market:c.market,owner:null,balance:0,progress:[0,0],misses:0})),report:[]};}
 function validate(book,companies,bankIds){
  if(!exact(book,['version','cycle','rows','report'])||book.version!==1||!uint(book.cycle)||!Array.isArray(book.rows)||book.rows.length!==companies.length||
   !Array.isArray(book.report)||book.report.length>companies.length)throw Error('Invalid commercial account register.');
  for(const [i,row]of book.rows.entries()){
   const c=companies[i];
   if(!exact(row,['id','market','owner','balance','progress','misses'])||row.id!==c.id||row.market!==c.market||
    row.owner!==null&&!bankIds.includes(row.owner)||!uint(row.balance)||row.balance>c.book.accounts.cash||row.owner!==null&&row.balance!==Math.floor(c.book.accounts.cash/2)||
    !Number.isInteger(row.misses)||row.misses<0||row.misses>2||!Array.isArray(row.progress)||row.progress.length!==2||
    row.progress.some(n=>!Number.isInteger(n)||n<0||n>2)||row.owner===null&&row.balance||c.resolution&&(row.owner!==null||row.balance))
    throw Error('Commercial cash ownership does not reconcile with the named company.');
  }
  for(const r of book.report)if(!exact(r,['id','previousOwner','owner','before','after','reason'])||!companies.some(c=>c.id===r.id)||
   [r.owner,r.previousOwner].some(id=>id!==null&&!bankIds.includes(id))||!uint(r.before)||!uint(r.after)||
   !['retained','won','withdrawn','closed','outside'].includes(r.reason))throw Error('Invalid commercial account activity.');
  if(new Set(book.report.map(r=>r.id)).size!==book.report.length)throw Error('Duplicate commercial account activity.');
  return book;
 }
 // The cash statements have already traded this month; old allocations may now
 // exceed closing customer cash. Only this transition accepts that intermediate
 // condition. Final validation must match the actual closing cash statements.
 function step(book,companies,banks,cycle){
  if(!Number.isInteger(cycle)||cycle!==book.cycle+1||banks.length!==2)throw Error('Commercial accounts must settle once in order.');
  const openingCompanies=companies.map((c,i)=>({...c,resolution:null,book:{...c.book,accounts:{...c.book.accounts,cash:book.rows[i].owner?book.rows[i].balance*2:c.book.accounts.cash}}}));
  validate(book,openingCompanies,banks.map(p=>p.id));
  const next=copy(book),remaining=banks.map(p=>p.quarters),served=new Set();
  for(const p of banks){checkPolicy(p.policy,companies.map(c=>c.id));if(!uint(p.quarters)||p.quarters>p.policy.staffQuarters||!Number.isFinite(p.score)||!Array.isArray(p.reachable)||!Array.isArray(p.treasury))throw Error('Invalid finite commercial work allocation.');}
  // Existing accounts have priority over acquisition. Uncovered accounts leave
  // after three consecutive misses, regardless of how attractive new work is.
  for(const row of next.rows){const i=banks.findIndex(p=>p.id===row.owner);if(i<0)continue;if(remaining[i]>=1){remaining[i]--;served.add(row.id);row.misses=0}else row.misses++;}
  for(const [n,row]of next.rows.entries()){
   const c=companies[n],old=book.rows[n];
   if(c.resolution){Object.assign(row,{owner:null,balance:0,progress:[0,0],misses:0});}
   else{
    if(row.misses>=3){row.owner=null;row.misses=0;}
    const offers=[];
    for(const [i,p]of banks.entries()){
     const pursuing=p.policy.target===row.id&&p.id!==row.owner&&remaining[i]>=1&&p.reachable.includes(row.market);
     row.progress[i]=pursuing?Math.min(2,row.progress[i]+1):Math.max(0,row.progress[i]-1);
     if(pursuing){remaining[i]--;if(row.progress[i]>=2)offers.push({i,score:p.score+(p.treasury.includes(row.id)?2:0)});}
    }
    if(row.owner&&served.has(row.id)){const i=banks.findIndex(p=>p.id===row.owner);offers.push({i,score:banks[i].score+2+(banks[i].treasury.includes(row.id)?2:0)});}
    offers.sort((a,b)=>b.score-a.score||((a.i+cycle+n)%2)-((b.i+cycle+n)%2));
    if(offers.length&&offers[0].score>=2){const selected=banks[offers[0].i].id;if(selected!==row.owner){row.owner=selected;row.misses=0;row.progress[offers[0].i]=0;}}
    // Non-interest-bearing transaction cash; customer retains half its cash
    // elsewhere. New balances are not capital, fees or household acquisition.
    row.balance=row.owner?Math.floor(c.book.accounts.cash/2):0;
   }
   next.report[n]={id:row.id,previousOwner:old.owner,owner:row.owner,before:old.balance,after:row.balance,
    reason:c.resolution?'closed':row.owner!==old.owner?(row.owner?'won':'withdrawn'):row.owner?'retained':'outside'};
  }
  next.cycle=cycle;validate(next,companies,banks.map(p=>p.id));return next;
 }
 return Object.freeze({policy,checkPolicy,opening,validate,step});
})();

function commercialAccountBalance(p,market=null){
 return p.commercialAccounts?Object.values(p.commercialAccounts.accounts).filter(r=>market===null||r.market===market).reduce((n,r)=>n+r.balance,0):0;
}
function commercialMarketDeposits(g,market){return (g.players||[]).reduce((n,p)=>n+commercialAccountBalance(p,market),0);}
function initializeCommercialAccounts(g,o){
 if(o.commercialAccountsVersion!==1)return;
 if(g.financialGroupVersion!==10)throw Error('Business operating accounts require the current Expanded foundation.');
 g.commercialAccountsVersion=1;g.commercialAccounts=CommercialAccounts.opening(g.companyEconomy.companies);
 for(const p of g.players)p.commercialAccounts={version:1,policy:CommercialAccounts.policy(),accounts:{},report:null};
}
function normalizeCommercialAccountPlan(p,plan){
 if(!p.commercialAccounts){if(plan.commercialAccountPolicy!==undefined)throw Error('Unversioned commercial account instructions.');return;}
 // Company IDs are the six existing, stable corporate identities, never a
 // user-supplied customer name or arbitrary bank/account identifier.
 plan.commercialAccountPolicy=CommercialAccounts.checkPolicy(plan.commercialAccountPolicy===undefined?p.commercialAccounts.policy:plan.commercialAccountPolicy,
  Array.from({length:6},(_,i)=>'company:'+i));
}
function commercialAccountCapacity(p){
 // Account officers use residual physical Business time after teaching and
 // authorized departmental work. Purchased throughput/expertise is not staff.
 const execution=departmentFunctionExecution(p);
 return Math.max(0,Math.floor((execution?execution.remainingPools.business:commercialSalesCapacity(p)*4)+1e-9));
}
function commercialAccountWork(p){
 // Raw attribution belongs to the departmental dispatcher. Reserving here
 // would mislabel account work as treasury delivery, then subtract it again.
 if(!p.commercialAccounts||p._departmentFunctionsRaw)return 0;
 return Math.min(p.commercialAccounts.policy.staffQuarters,commercialAccountCapacity(p));
}
function commercialAccountReview(v,p,plan){
 if(!p.commercialAccounts)return null;
 const staged=JSON.parse(JSON.stringify(plan||{}));normalizeCommercialAccountPlan(p,staged);
 const prepared=departmentCustomerPreview(p,v,staged).owner;
 const quarters=commercialAccountWork(prepared),accounts=Object.values(p.commercialAccounts.accounts),service=accounts.length;
 return {policy:staged.commercialAccountPolicy,quarters,capacity:commercialAccountCapacity(prepared),requested:staged.commercialAccountPolicy.staffQuarters,
  service,development:Math.max(0,quarters-service),balance:commercialAccountBalance(p),accounts};
}
function planCommercialAccounts(g,index,plan){
 if(g.commercialAccountsVersion!==1)return plan;
 const p=g.players[index],current=p.commercialAccounts.policy;
 plan.commercialAccountPolicy={...current};
 let quote=commercialAccountReview(g,{...p,companySnapshot:corporateStatement(g),marketSnapshot:g.marketEconomy},plan);
 const choice=g.commercialAccounts.rows.filter(r=>r.owner!==p.id&&p.branches[r.market]>0&&!g.companyEconomy.companies.find(c=>c.id===r.id).resolution)
  .sort((a,b)=>b.progress[index]-a.progress[index]||a.id.localeCompare(b.id))[0];
 // New integrated lending rules protect acquired accounts before assigning
 // every remaining Business quarter to fresh household/client acquisition.
 // This reallocates real time, never purchases or duplicates account officers.
 if(p.creditProductsVersion===1&&plan.departmentFunctionsPolicy){
  const wanted=Math.min(8,quote.service+(choice?1:0));
  for(const task of ['relationships','onboarding']){
   const row=plan.departmentFunctionsPolicy.quotas[task],released=Math.min(row.business,Math.max(0,wanted-quote.capacity));
   if(released){row.business-=released;quote=commercialAccountReview(g,{...p,companySnapshot:corporateStatement(g),marketSnapshot:g.marketEconomy},plan);}
  }
 }
 plan.commercialAccountPolicy={target:choice?.id||null,staffQuarters:Math.min(8,quote.capacity,quote.service+(choice?1:0))};
 return plan;
}
function settleCommercialAccounts(g){
 if(g.commercialAccountsVersion!==1)return [];
 const next=JSON.parse(JSON.stringify(g)),banks=next.players.map(p=>({id:p.id,policy:p.commercialAccounts.policy,
  quarters:p._commercialAccountQuarters||0,score:p.stats.reputation/20+strategyLevel(p,'commercial'),
  reachable:Object.keys(next.territories).filter(k=>p.branches[k]>0),
  treasury:p.serviceDesk.contracts.filter(c=>c.kind==='treasury'&&serviceApplicationActive(p,'treasury')&&serviceLoad(p).rows.find(r=>r.id===c.id)?.served)
   .map(c=>'company:'+next.companyEconomy.companies.findIndex(x=>'service-'+x.market===c.id))}));
 const result=CommercialAccounts.step(next.commercialAccounts,next.companyEconomy.companies,banks,next.cycle),lines=[];
 withMarket(next,()=>{
  for(const p of next.players){
   const before=commercialAccountBalance(p),accounts=Object.fromEntries(result.rows.filter(r=>r.owner===p.id).map(r=>[r.id,{market:r.market,balance:r.balance}]));
   // Withdraw first, then deposits. Each payment reconciles the bank's actual
   // cash/obligation, household subledger and finite corporate allocation.
   for(const market of Object.keys(p.marketBook.markets)){
    const prior=commercialAccountBalance(p,market),after=Object.values(accounts).filter(r=>r.market===market).reduce((n,r)=>n+r.balance,0),change=after-prior;
    if(change<0)provideCash(p,-change);
    for(const [id,r]of Object.entries(p.commercialAccounts.accounts))if(r.market===market)delete p.commercialAccounts.accounts[id];
    for(const [id,r]of Object.entries(accounts))if(r.market===market)p.commercialAccounts.accounts[id]=r;
    if(change){
     p.marketBook.markets[market].deposits+=change;next.marketEconomy.markets[market].total.deposits+=change;
     p.accounting=AccountingPrototype.post(p.accounting,'commercial.cashLocation',{cash:change,deposits:change});syncAccounts(p);
    }
   }
   p.commercialAccounts.report={cycle:next.cycle,before,after:commercialAccountBalance(p),quarters:p._commercialAccountQuarters||0};
   delete p._commercialAccountQuarters;
   lines.push(p.name+' business operating deposits: $'+commercialAccountBalance(p).toLocaleString()+'. These are company cash liabilities, not income.');
  }
 });
 for(const row of result.report)if(row.before!==row.after||row.previousOwner!==row.owner){
  const company=next.companyEconomy.companies.find(c=>c.id===row.id);
  company.book=GroupAccounting.post(company.book,'commercial.cashLocation',row.owner||'outside-bank',{cash:0});
 }
 next.commercialAccounts=result;validateCommercialAccounts(next,true);
 // Settlement retains legitimate frozen quotas until resolveCycle finishes.
 // Check the financial boundary here, not the saved-game ban on transients.
 for(const [market,m]of Object.entries(next.marketEconomy.markets)){
  const held=next.players.reduce((n,p)=>n+p.marketBook.markets[market].deposits,0);
  if(!Number.isSafeInteger(m.total.deposits)||m.total.deposits<0||held+m.community.deposits+m.union.deposits!==m.total.deposits)throw Error('Business account funding did not reconcile with local deposits.');
 }
 for(const p of next.players){AccountingPrototype.check(p.accounting);if(Object.values(p.marketBook.markets).reduce((n,m)=>n+m.deposits,0)!==p.accounting.accounts.deposits)throw Error('Business account liabilities did not reconcile with the bank.');}
 validateDepositSave(next);validateSegmentDepositSave(next);CompanyFinance.validate(next.companyEconomy);
 for(const key of ['players','companyEconomy','marketEconomy','commercialAccounts'])g[key]=next[key];
 return lines;
}
function validateCommercialAccounts(g,settling=false){
 if(g.commercialAccountsVersion===undefined){if(g.commercialAccounts||g.players.some(p=>p.commercialAccounts||p.submitted?.commercialAccountPolicy!==undefined))throw Error('Unversioned business operating accounts.');return;}
 if(g.commercialAccountsVersion!==1||g.financialGroupVersion!==10)throw Error('Unsupported business operating account rules.');
 const world=g.commercialAccounts;CommercialAccounts.validate(world,g.companyEconomy.companies,g.players.map(p=>p.id));
 if(world.cycle!==g.cycle-(g.gameOver?0:1)&&!(settling&&world.cycle===g.cycle))throw Error('Commercial accounts have an invalid settlement month.');
 for(const p of g.players){
  const b=p.commercialAccounts;
  if(!b||b.version!==1||Object.keys(b).sort().join()!=='accounts,policy,report,version'||!b.accounts||Array.isArray(b.accounts))throw Error('Invalid bank commercial account book.');
  CommercialAccounts.checkPolicy(b.policy,world.rows.map(r=>r.id));
  const expected=Object.fromEntries(world.rows.filter(r=>r.owner===p.id).map(r=>[r.id,{market:r.market,balance:r.balance}]));
  if(JSON.stringify(Object.entries(b.accounts).sort())!==JSON.stringify(Object.entries(expected).sort()))throw Error('Bank business deposits disagree with company cash allocations.');
  if(b.report!==null&&(Object.keys(b.report).sort().join()!=='after,before,cycle,quarters'||Object.values(b.report).some(n=>!Number.isSafeInteger(n)||n<0)||
   b.report.cycle!==world.cycle||b.report.after!==commercialAccountBalance(p)||b.report.quarters>8))throw Error('Invalid business deposit report.');
  if(world.cycle>0&&b.report===null)throw Error('Missing settled business deposit report.');
  if(p.submitted)normalizeCommercialAccountPlan(p,JSON.parse(JSON.stringify(p.submitted)));
 }
}
function projectCommercialAccounts(g,out,index){
 if(g.commercialAccountsVersion!==1)return;
 out.commercialAccountsVersion=1;
 out.me.commercialAccounts=JSON.parse(JSON.stringify(g.players[index].commercialAccounts));
 out.commercialAccountMarket={version:1,cycle:g.commercialAccounts.cycle,
  rows:g.commercialAccounts.rows.map(r=>({id:r.id,market:r.market,owner:r.owner,balance:r.balance,progress:r.progress[index],misses:r.misses}))};
 if(out.lastPlans?.[out.rival.id])delete out.lastPlans[out.rival.id].commercialAccountPolicy;
}
function validateCommercialAccountView(v){
 if(v.commercialAccountsVersion===undefined){if(v.commercialAccountMarket||v.me?.commercialAccounts||v.rival?.commercialAccounts)throw Error('Unversioned commercial account view.');return;}
 if(v.commercialAccountsVersion!==1||v.financialGroupVersion!==10||v.rival.commercialAccounts||v.lastPlans?.[v.rival.id]?.commercialAccountPolicy)throw Error('Invalid or private commercial account view.');
 const market=v.commercialAccountMarket,companies=v.me.companySnapshot?.world.companies;
 if(!market||Object.keys(market).sort().join()!=='cycle,rows,version'||market.version!==1||market.cycle!==v.cycle-(v.gameOver?0:1)||!Array.isArray(market.rows)||!companies||market.rows.length!==6)throw Error('Missing commercial customer view.');
 for(const [i,r]of market.rows.entries()){
  if(!r||Object.keys(r).sort().join()!=='balance,id,market,misses,owner,progress'||r.id!==companies[i].id||r.market!==companies[i].market||
   !Number.isInteger(r.progress)||r.progress<0||r.progress>2)throw Error('Invalid commercial qualification view.');
 }
 const world={version:1,cycle:market.cycle,rows:market.rows.map(r=>({...r,progress:[r.progress,0]})),report:[]};
 CommercialAccounts.validate(world,companies,[v.me.id,v.rival.id]);
 const own=Object.fromEntries(market.rows.filter(r=>r.owner===v.me.id).map(r=>[r.id,{market:r.market,balance:r.balance}]));
 if(!v.me.commercialAccounts||v.me.commercialAccounts.version!==1||JSON.stringify(Object.entries(own).sort())!==JSON.stringify(Object.entries(v.me.commercialAccounts.accounts||{}).sort()))throw Error('Owner business deposits do not match the customer register.');
 CommercialAccounts.checkPolicy(v.me.commercialAccounts.policy,companies.map(c=>c.id));
}
