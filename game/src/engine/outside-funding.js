// A named outside bank reuses the already funded acquisition lender's ONE book.
// Advances are matched funding payables, never revenue or customer deposits.
const OutsideFunding=(()=>{
 const ID='company:acquisition-lender',NAME='Cedar Reserve Bank',LIMIT=250000,SPREAD_BP=100,PENALTY_BP=200;
 const enabled=p=>p?.digitalCommercialVersion===1,copy=x=>JSON.parse(JSON.stringify(x)),whole=n=>Number.isSafeInteger(n)&&n>=0;
 const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===keys.slice().sort().join();
 function liability(p){return enabled(p)&&p.outsideAdvance?p.outsideAdvance.principal+p.outsideAdvance.interestDue:0;}
 function claims(g){return enabled(g)?g.players.reduce((n,p)=>n+liability(p),0):0;}
 function initialize(g,o){if(o.digitalCommercialVersion!==1)return;if(g.companyControlMarket?.lender.entityId!==ID)throw Error('Outside funding requires the existing funded lender.');g.outsideFunding={version:1,id:ID,name:NAME,lastCycle:0,netCashToBanks:0,report:[]};for(const p of g.players)p.outsideAdvance=null;}
 function lender(g){return g.companyControlMarket?.lender||g.outsideFundingSnapshot?.book;}
 function quote(g,p,plan={}){
  if(!enabled(p))throw Error('Outside-bank funding requires Expanded 9.37.');
  const amount=plan.outsideAdvanceAmount??0,book=lender(g),available=book?.accounts.cash||0,rateBp=g.monetaryPolicy.upperBp+SPREAD_BP;
  if(!Number.isSafeInteger(amount)||amount<0||amount>LIMIT||amount%1000)throw Error('Choose $0 to $250,000 in $1,000 steps.');
  const reason=p.outsideAdvance?'Repay the existing advance before applying again. There is no automatic rollover.':capitalRatio(p)<8?'Restore the bank capital ratio to at least 8%.':p.accounting.accounts.payables?'Clear existing unpaid obligations before applying.':amount>available?'The lender lacks cash for this request; reduce it or wait.':'';
  return {id:ID,name:NAME,amount,available,limit:LIMIT,rateBp,interest:Math.ceil(amount*rateBp/120000),maturity:g.cycle+1,reason,eligible:!amount||!reason,advance:copy(p.outsideAdvance),book:copy(book),
   notes:['One month, not overnight. Fixed annual quote divided by 12; dollar interest rounds up.','Funding arrives at month end after other spending. It cannot finance simultaneous plan instructions.','Repayment uses actual cash above a 2% deposit reserve and other unpaid bills. Unpaid principal and interest persist; overdue principal accrues an extra 2% annual rate.','Each missed repayment adds 5 compliance risk and loses 3 reputation; new advances are blocked until repaid. No automatic rollover, write-off, share purchase or transfer of control.']};
 }
 function validatePlan(g,p,plan){if(plan.outsideAdvanceAmount===undefined)return;if(!enabled(p))throw Error('Outside-bank funding requires Expanded 9.37.');const q=quote(g,p,plan);if(!q.eligible)throw Error(q.reason);}
 function settle(g,plans){
  if(!enabled(g))return [];const s=g.outsideFunding;if(s.lastCycle===g.cycle)throw Error('Outside funding already settled this month.');const lines=[],report=[];let book=g.companyControlMarket.lender;
  // Repay both opening claims before deciding the cash available for new lending.
  for(const p of g.players){const a=p.outsideAdvance;if(!a)continue;
   if(g.cycle<=a.started)continue;if(a.servicedThrough!==g.cycle-1)throw Error('Outside advance settlement skipped a month.');
   const interest=Math.ceil(a.principal*(a.rateBp+(a.misses?PENALTY_BP:0))/120000);
   if(interest){p.accounting=AccountingPrototype.post(p.accounting,'outside.interest',{payables:interest,equity:-interest},-interest);book=GroupAccounting.post(book,'outside.interest',p.id,{businessAssets:interest,equity:interest},interest);a.interestDue+=interest;syncAccounts(p);}
   const other=p.accounting.accounts.payables-liability(p),available=Math.max(0,p.stats.cash-Math.ceil(p.stats.deposits*.02)-other),interestPaid=Math.min(available,a.interestDue),principalPaid=Math.min(a.principal,Math.max(0,available-interestPaid)),paid=principalPaid+interestPaid;
   if(paid){p.accounting=AccountingPrototype.post(p.accounting,'outside.repayment',{cash:-paid,payables:-paid});book=GroupAccounting.post(book,'outside.repayment',p.id,{cash:paid,businessAssets:-paid});a.principal-=principalPaid;a.interestDue-=interestPaid;s.netCashToBanks-=paid;syncAccounts(p);}
   a.servicedThrough=g.cycle;const unpaid=liability(p);if(unpaid){a.misses++;delta(p,'compliance',5);delta(p,'reputation',-3);}else p.outsideAdvance=null;
   report.push({bankId:p.id,kind:'repayment',principal:principalPaid,interestAccrued:interest,interestPaid,unpaid});
   lines.push(p.name+' paid '+NAME+' $'+paid.toLocaleString()+' ($'+principalPaid.toLocaleString()+' principal, $'+interestPaid.toLocaleString()+' interest).'+(unpaid?' $'+unpaid.toLocaleString()+' remains due; arrears penalties and a funding block apply.':' Advance repaid.'));
  }
  // Alternating priority is public. Recheck real shared cash after acquisition
  // commitments and earlier fills; quoting never reserves or creates cash.
  const order=g.players.map((_,i)=>i).sort((a,b)=>((a+g.cycle)%2)-((b+g.cycle)%2));
  for(const i of order){const p=g.players[i],amount=plans[i].outsideAdvanceAmount||0;if(!amount)continue;g.companyControlMarket.lender=book;const q=quote(g,p,plans[i]);
   if(!q.eligible){lines.push(p.name+': outside advance cancelled without a charge. '+q.reason);report.push({bankId:p.id,kind:'cancelled',principal:0,interestAccrued:0,interestPaid:0,unpaid:liability(p)});continue;}
   p.accounting=AccountingPrototype.post(p.accounting,'outside.advance',{cash:amount,payables:amount});book=GroupAccounting.post(book,'outside.advance',p.id,{cash:-amount,businessAssets:amount});syncAccounts(p);s.netCashToBanks+=amount;
   p.outsideAdvance={lender:ID,original:amount,principal:amount,interestDue:0,rateBp:q.rateBp,started:g.cycle,due:g.cycle+1,servicedThrough:g.cycle,misses:0};
   report.push({bankId:p.id,kind:'advance',principal:amount,interestAccrued:0,interestPaid:0,unpaid:amount});lines.push(p.name+' borrowed $'+amount.toLocaleString()+' from '+NAME+' at '+(q.rateBp/100).toFixed(2)+'% annually, due at the end of month '+(g.cycle+1)+'. Principal is a liability, not income.');
  }
  g.companyControlMarket.lender=book;s.lastCycle=g.cycle;s.report=report;return lines;
 }
 function project(g,out,index){if(!enabled(g))return;out.me.outsideAdvance=copy(g.players[index].outsideAdvance);out.outsideFundingSnapshot={version:1,id:ID,name:NAME,lastCycle:g.outsideFunding.lastCycle,book:{entityId:ID,accounts:copy(g.companyControlMarket.lender.accounts),retainedEarnings:g.companyControlMarket.lender.retainedEarnings},report:copy(g.outsideFunding.report.filter(r=>r.bankId===out.me.id))};if(g.players[index].submitted?.outsideAdvanceAmount!==undefined)out.me.pendingOutsideAdvanceAmount=g.players[index].submitted.outsideAdvanceAmount;for(const[id,q]of Object.entries(out.lastPlans||{}))if(id!==out.me.id)delete q.outsideAdvanceAmount;}
 function validate(s,context){
  const owners=context==='game'?s.players:[s.me],active=enabled(s),fail=()=>{throw Error('Invalid outside-bank funding state.');};
  if(!active){if(s.outsideFunding!==undefined||s.outsideFundingSnapshot!==undefined||owners.some(p=>p.outsideAdvance!==undefined||p.submitted?.outsideAdvanceAmount!==undefined))fail();return;}
  const month=s.gameOver?s.cycle:s.cycle-1,b=context==='game'?s.outsideFunding:s.outsideFundingSnapshot;
  if(!exact(b,context==='game'?['version','id','name','lastCycle','netCashToBanks','report']:['version','id','name','lastCycle','book','report'])||b.version!==1||b.id!==ID||b.name!==NAME||b.lastCycle!==month||!Array.isArray(b.report)||b.report.length>4)fail();
  const book=lender(s);if(context==='game')GroupAccounting.validate(book);else {if(!exact(book,['entityId','accounts','retainedEarnings'])||!Number.isSafeInteger(book.retainedEarnings))fail();const a=book.accounts;if(!exact(a,['cash','businessAssets','investments','custodyAssets','debt','payables','custodyLiabilities','equity'])||Object.values(a).some(n=>!whole(n))||a.cash+a.businessAssets+a.investments+a.custodyAssets!==a.debt+a.payables+a.custodyLiabilities+a.equity)fail();}if(book.entityId!==ID)fail();
  if(context==='game'&&!Number.isSafeInteger(b.netCashToBanks))fail();
  for(const p of owners){const a=p.outsideAdvance;if(a!==null){if(!exact(a,['lender','original','principal','interestDue','rateBp','started','due','servicedThrough','misses'])||a.lender!==ID||Object.entries(a).some(([k,v])=>k!=='lender'&&!whole(v))||a.original<1000||a.original>LIMIT||a.original%1000||a.principal>a.original||a.rateBp<125||a.rateBp>1100||a.started<1||a.started>month||a.due!==a.started+1||a.servicedThrough!==month||a.misses>month-a.started||!liability(p)||liability(p)>p.accounting.accounts.payables)fail();}if(context==='game'&&p.submitted)validatePlan(s,p,p.submitted);if(p.pendingOutsideAdvanceAmount!==undefined){if(context!=='view'||!p.submitted)fail();validatePlan(s,p,{outsideAdvanceAmount:p.pendingOutsideAdvanceAmount});}}
  for(const r of b.report)if(!exact(r,['bankId','kind','principal','interestAccrued','interestPaid','unpaid'])||typeof r.bankId!=='string'||!(context==='game'?s.players.some(p=>p.id===r.bankId):r.bankId===s.me.id)||!['advance','repayment','cancelled'].includes(r.kind)||['principal','interestAccrued','interestPaid','unpaid'].some(k=>!whole(r[k])))fail();
  if(s.rival?.outsideAdvance!==undefined||s.rival?.pendingOutsideAdvanceAmount!==undefined)fail();
 }
 return Object.freeze({ID,NAME,LIMIT,SPREAD_BP,PENALTY_BP,enabled,liability,claims,initialize,quote,validatePlan,settle,project,validate});
})();

