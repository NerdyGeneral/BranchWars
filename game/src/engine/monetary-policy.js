// Expanded 9.35 only. The public calendar and owner treasury are authoritative;
// no historical campaign is upgraded and no forecast advances either RNG.
const MonetaryPolicy=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x));
 const choices=Object.freeze({liquid:{name:'Liquid',fixed:0,description:'New funds stay liquid and reprice each month.'},balanced:{name:'Balanced',fixed:.5,description:'Target 50% fixed holdings as cash becomes available; keep the rest liquid.'},fixed:{name:'Longer fixed',fixed:.8,description:'Target 80% fixed holdings. More stable coupons, more early-sale risk.'}});
 const weights=Object.freeze({expansion:[0,5,55,35,5],steady:[0,15,70,15,0],tight:[0,5,25,55,15],downturn:[15,55,30,0,0],recovery:[5,20,65,10,0]});
 const moves=[-50,-25,0,25,50],enabled=s=>s?.monetaryPolicyVersion===1;
 const whole=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===keys.slice().sort().join();
 const fail=()=>{throw Error('Invalid Federal Funds or private treasury state.');};
 const spread=term=>term===6?25:75;
 function initialize(g,o){
  if(o.monetaryPolicyVersion!==1)return;
  g.monetaryPolicyVersion=1;
  const upperBp=Math.round(g.economy.rate*100);
  g.monetaryPolicy={version:1,upperBp,nextDecision:3,history:[],rngState:(g.rng.seed^0x6d2b79f5)>>>0};
  for(const p of g.players){
   p.monetaryPolicyVersion=1;
   const principal=p.accounting.accounts.securities,half=Math.floor(principal/2),short=Math.floor(half/2),long=half-short;
   p.treasury={version:1,anchorBp:upperBp,asOfCycle:0,openingDebt:p.stats.emergencyDebt,policy:'balanced',liquid:principal-half,holdings:[]};
   for(const [amount,term,count]of [[short,6,6],[long,24,4]])for(let i=1;i<=count;i++){
    const face=Math.floor(amount*i/count)-Math.floor(amount*(i-1)/count);
    if(face)p.treasury.holdings.push({principal:face,couponBp:upperBp+spread(term),term,remaining:i*term/count});
   }
  }
 }
 function validate(source,context){
  const owners=context==='game'?source.players:[source.me],active=enabled(source);
  if(source.version==='9.35'&&!active||source.monetaryPolicyVersion!==undefined&&!active)fail();
  if(!active){if(source.monetaryPolicy!==undefined||owners.some(p=>p?.treasury!==undefined||p?.monetaryPolicyVersion!==undefined||p?.pendingTreasuryPolicy!==undefined||p?.submitted?.treasuryPolicy!==undefined)||source.rival?.treasury!==undefined||Object.values(source.lastPlans||{}).some(p=>p.treasuryPolicy!==undefined))fail();return;}
  validateCampaignRules(source,context);
  const m=source.monetaryPolicy,keys=['version','upperBp','nextDecision','history'];
  if(context==='game')keys.push('rngState');
  if(!exact(m,keys)||m.version!==1||!whole(m.upperBp,25,1000)||m.upperBp%25||source.economy?.rate!==m.upperBp/100||!whole(source.cycle,1)||!whole(m.nextDecision,3)||m.nextDecision%2!==1||m.nextDecision!==Math.max(3,source.cycle+(source.cycle%2?2:1)))fail();
  if(context==='game'&&!whole(m.rngState,0,0xffffffff))fail();
  const decisions=Math.max(0,Math.floor((source.cycle-1)/2));
  if(!Array.isArray(m.history)||m.history.length!==Math.min(12,decisions))fail();
  for(const [i,row]of m.history.entries()){
   if(!exact(row,['cycle','beforeBp','upperBp','changeBp','regime'])||row.cycle!==3+2*(decisions-m.history.length+i)||!whole(row.beforeBp,25,1000)||row.beforeBp%25||!whole(row.upperBp,25,1000)||row.upperBp%25||!moves.includes(row.changeBp)||row.upperBp-row.beforeBp!==row.changeBp||!Object.hasOwn(weights,row.regime))fail();
   if(i&&row.beforeBp!==m.history[i-1].upperBp)fail();
  }
  if(m.history.length&&m.history.at(-1).upperBp!==m.upperBp)fail();
  const completed=source.gameOver?source.cycle:source.cycle-1;
  for(const p of owners){
   const b=p.treasury;
   if(p.monetaryPolicyVersion!==1||!exact(b,['version','anchorBp','asOfCycle','openingDebt','policy','liquid','holdings'])||b.version!==1||b.anchorBp!==m.upperBp||b.asOfCycle!==completed||!whole(b.openingDebt)||!Object.hasOwn(choices,b.policy)||!whole(b.liquid)||!Array.isArray(b.holdings)||b.holdings.length>60)fail();
   let total=b.liquid;const seen=new Set();
   for(const h of b.holdings){
    if(!exact(h,['principal','couponBp','term','remaining'])||!whole(h.principal,1)||![6,24].includes(h.term)||!whole(h.remaining,1,h.term)||!whole(h.couponBp,25+spread(h.term),1000+spread(h.term))||h.couponBp%25)fail();
    const key=[h.term,h.remaining,h.couponBp].join(':');if(seen.has(key))fail();seen.add(key);total+=h.principal;
   }
   if(!whole(total)||total!==p.accounting?.accounts.securities)fail();
   if(context==='game'&&p.submitted)validatePlan(p,p.submitted);
   if(p.pendingTreasuryPolicy!==undefined&&(context!=='view'||!p.submitted||!Object.hasOwn(choices,p.pendingTreasuryPolicy)))fail();
  }
  for(const plan of Object.values(source.lastPlans||{}))if(plan.treasuryPolicy!==undefined&&!Object.hasOwn(choices,plan.treasuryPolicy))fail();
  if(context==='view'&&(source.rival?.treasury!==undefined||source.rival?.monetaryPolicyVersion!==undefined||source.rival?.pendingTreasuryPolicy!==undefined||Object.entries(source.lastPlans||{}).some(([id,p])=>id!==source.me.id&&p.treasuryPolicy!==undefined)))fail();
 }
 function project(g,out,index){
  if(!enabled(g))return;
  out.monetaryPolicyVersion=1;
  const {rngState,...publicPolicy}=g.monetaryPolicy;out.monetaryPolicy=copy(publicPolicy);
  out.me.monetaryPolicyVersion=1;out.me.treasury=copy(g.players[index].treasury);
  if(g.players[index].submitted?.treasuryPolicy!==undefined)out.me.pendingTreasuryPolicy=g.players[index].submitted.treasuryPolicy;
  out.lastPlans=copy(out.lastPlans);for(const [id,p]of Object.entries(out.lastPlans||{}))if(id!==out.me.id)delete p.treasuryPolicy;
 }
 function validatePlan(p,plan){
  if(plan.treasuryPolicy!==undefined&&(!enabled(p)||!Object.hasOwn(choices,plan.treasuryPolicy)))throw Error('Choose a valid treasury policy for this campaign.');
 }
 function advance(g){
  if(!enabled(g))return null;
  const m=g.monetaryPolicy;let row=null;
  if(g.cycle===m.nextDecision){
   m.rngState=(Math.imul(m.rngState,1664525)+1013904223)>>>0;
   let draw=m.rngState/4294967296*100,index=0;
   while(index<4&&draw>=weights[g.economy.key][index])draw-=weights[g.economy.key][index++];
   const beforeBp=m.upperBp; m.upperBp=Math.max(25,Math.min(1000,beforeBp+moves[index]));
   row={cycle:g.cycle,beforeBp,upperBp:m.upperBp,changeBp:m.upperBp-beforeBp,regime:g.economy.key};
   m.history.push(row);m.history=m.history.slice(-12);m.nextDecision+=2;
  }
  g.economy.rate=m.upperBp/100;
  for(const p of g.players){p.treasury.anchorBp=m.upperBp;p.treasury.openingDebt=p.stats.emergencyDebt;}
  return row?`FEDERAL FUNDS // Month ${row.cycle}: ${row.changeBp===0?'held':row.changeBp>0?'raised':'cut'} the target range to ${((row.upperBp-25)/100).toFixed(2)}–${(row.upperBp/100).toFixed(2)}%. New quotes use this rate; existing fixed contracts keep their terms.`:null;
 }
 function holdingValue(h,anchorBp){
  // One simplified yield curve: policy anchor + fixed term spread. Values are
  // memo estimates until an actual sale; amortized-cost accounts remain intact.
  const yieldRate=(anchorBp+spread(h.term))/120000,coupon=h.principal*h.couponBp/120000;
  let value=0;for(let month=1;month<=h.remaining;month++)value+=coupon/Math.pow(1+yieldRate,month);
  return value+h.principal/Math.pow(1+yieldRate,h.remaining);
 }
 function income(p,anchorBp=p.treasury.anchorBp){return Math.round(p.treasury.liquid*anchorBp/120000+p.treasury.holdings.reduce((n,h)=>n+h.principal*h.couponBp/120000,0));}
 function debtInterest(p,anchorBp=p.treasury.anchorBp){return p.treasury.openingDebt*(anchorBp+825)/120000;}
 function liquid(p){return enabled(p)?p.treasury.liquid:p.accounting.accounts.securities;}
 function consumeLiquid(p,amount){if(!enabled(p))return;if(!whole(amount)||amount>p.treasury.liquid)fail();p.treasury.liquid-=amount;}
 function sellForCash(p,needed){
  if(!enabled(p))return false;
  const b=p.treasury;
  const floating=Math.min(b.liquid,Math.ceil(needed));
  if(floating){b.liquid-=floating;p.accounting=AccountingPrototype.post(p.accounting,'sell.securities',{cash:floating,securities:-floating});syncAccounts(p);needed-=floating;}
  // Liquid first, then earliest maturity. Holdings never disappear by a
  // reconciliation guess; every principal reduction has a funded journal.
  b.holdings.sort((a,c)=>a.remaining-c.remaining||a.term-c.term||a.couponBp-c.couponBp);
  for(const h of b.holdings){
   if(needed<=0)break;
   const price=holdingValue(h,b.anchorBp)/h.principal,face=Math.min(h.principal,Math.ceil(needed/price));
   const proceeds=Math.round(face*price),gain=proceeds-face;
   p.accounting=AccountingPrototype.post(p.accounting,'sell.securities',{cash:proceeds,securities:-face,equity:gain},gain);
   h.principal-=face;needed-=proceeds;syncAccounts(p);
  }
  b.holdings=b.holdings.filter(h=>h.principal>0);return true;
 }
 function finish(g,p){
  if(!enabled(p))return '';
  const b=p.treasury;if(b.asOfCycle!==g.cycle-1)throw Error('Treasury already settled this month.');
  let matured=0;
  for(const h of b.holdings){h.remaining--;if(!h.remaining)matured+=h.principal;}
  b.holdings=b.holdings.filter(h=>h.remaining>0);
  if(matured){p.accounting=AccountingPrototype.post(p.accounting,'treasury.maturity',{cash:matured,securities:-matured});syncAccounts(p);}
  // Keep a 15% deposit reserve plus all current payables. Never invest while
  // emergency borrowing remains, or buy with fresh emergency funding.
  const reserve=Math.ceil(p.stats.deposits*.15)+(p.accounting.accounts.payables||0);
  const purchase=p.stats.emergencyDebt?0:Math.max(0,p.stats.cash-reserve);
  if(purchase){bookPost(p,'buySecurities',purchase);b.liquid+=purchase;}
  const fixed=b.holdings.reduce((n,h)=>n+h.principal,0),target=Math.floor((b.liquid+fixed)*choices[b.policy].fixed),toFix=Math.max(0,Math.min(b.liquid,target-fixed));
  if(toFix){
   const short=Math.floor(toFix*(b.policy==='fixed' ? .25 : .5));
   for(const [principal,term]of [[short,6],[toFix-short,24]])if(principal){
    const couponBp=b.anchorBp+spread(term),found=b.holdings.find(h=>h.term===term&&h.remaining===term&&h.couponBp===couponBp);
    if(found)found.principal+=principal;else b.holdings.push({principal,term,remaining:term,couponBp});
   }
   b.liquid-=toFix;
  }
  b.asOfCycle=g.cycle;
  return matured||purchase?`${p.name} treasury: $${matured.toLocaleString()} matured to cash (principal, not income); $${purchase.toLocaleString()} of surplus cash invested after retaining its cash reserve. New holdings earn from next month.`:'';
 }
 function quote(p,g,changeBp=0,plan=null){
  if(!enabled(p)||!enabled(g)||![-50,0,50,100].includes(changeBp))throw Error('Invalid rate comparison.');
  const anchor=g.monetaryPolicy.upperBp,scenario=Math.max(25,Math.min(1000,anchor+changeBp)),owner=copy(p);
  if(typeof owner.doctrine==='object')owner.doctrine=owner.doctrine.key;
  if(plan){owner.policies={...owner.policies,deposit:plan.depositPolicy};applyProductProgramPolicy(owner,plan.productProgramPolicy);}
  const fixed=p.treasury.holdings.reduce((n,h)=>n+h.principal,0),loans=creditSummary(owner);
  const named=(g.companyEconomy||owner.companySnapshot?.world)?.credit?.notes||[];
  const companyInterest=named.filter(n=>n.bankId===p.id&&['performing','arrears'].includes(n.status)).reduce((sum,n)=>sum+Math.floor((n.principal*n.annualRateBp+n.interestCarry)/120000),0);
  const calc=bp=>{
   const deposits=depositSummary(owner,{economy:{...g.economy,rate:bp/100}}),loanInterest=(loans?.monthlyInterest||0)+companyInterest;
   const securitiesInterest=income(owner,bp),depositExpense=deposits.interest,borrowingExpense=Math.round(debtInterest(owner,bp));
   return {loanInterest:Math.round(loanInterest),securitiesInterest,depositExpense,borrowingExpense,netInterest:Math.round(loanInterest)+securitiesInterest-depositExpense-borrowingExpense};
  };
  const current=calc(anchor),stressed=calc(scenario);
  // Value is deliberately separate from earned interest and book equity.
  current.securitiesValue=Math.round(owner.treasury.liquid+owner.treasury.holdings.reduce((n,h)=>n+holdingValue(h,anchor),0));
  stressed.securitiesValue=Math.round(owner.treasury.liquid+owner.treasury.holdings.reduce((n,h)=>n+holdingValue(h,scenario),0));
  const loanSchedule=copy(owner.creditBook.cohorts).map(c=>({principal:performingCredit(c),remaining:c.remaining}));
  const companySchedule=copy(named.filter(n=>n.bankId===p.id&&['performing','arrears'].includes(n.status))).map(n=>({principal:n.principal,remaining:Math.max(1,n.remaining),pastDue:n.principalPastDue}));
  const maturities=Array.from({length:6},(_,i)=>({cycle:g.cycle+i,
   securities:p.treasury.holdings.filter(h=>h.remaining===i+1).reduce((n,h)=>n+h.principal,0),
   loans:[...loanSchedule,...companySchedule].reduce((sum,c)=>{const past=c.pastDue||0,due=Math.min(c.principal,past+Math.ceil((c.principal-past)/Math.max(1,c.remaining)));c.principal-=due;c.remaining--;c.pastDue=0;return sum+due;},0),
   deposits:p.depositBook.cohorts.filter(c=>c.remaining===i+1).reduce((n,c)=>n+c.principal,0)}));
  return {anchorBp:anchor,scenarioBp:scenario,current,scenario:stressed,difference:Object.fromEntries(Object.keys(current).map(k=>[k,stressed[k]-current[k]])),
   exposure:{liquid:p.treasury.liquid,fixed,protectedDeposits:p.depositBook.cohorts.filter(c=>c.remaining>0).reduce((n,c)=>n+c.principal,0),floatingDeposits:p.depositBook.cohorts.filter(c=>c.remaining===0).reduce((n,c)=>n+c.principal,0),openingDebt:p.treasury.openingDebt},maturities,
   policy:plan?.treasuryPolicy||p.treasury.policy};
 }
 function bot(g,index,plan){
  if(!enabled(g))return plan;
  // Public macro conditions and the bank's own funding only. No future draw,
  // RNG state or rival private holdings enter the decision.
  const p=g.players[index];plan.treasuryPolicy=p.stats.emergencyDebt?'liquid':['tight','expansion'].includes(g.economy.key)?'liquid':['downturn','recovery'].includes(g.economy.key)?'fixed':'balanced';return plan;
 }
 return Object.freeze({choices,weights,enabled,initialize,validate,project,validatePlan,advance,holdingValue,income,debtInterest,liquid,consumeLiquid,sellForCash,finish,quote,bot});
})();
