// Expanded 9.38: one finite issuer book, explicit outside wallets and cash settlement.
// This deliberately small card market is separate from bank deposit customers.
const PartnerCards=(()=>{
 const RULES=Object.freeze({setup:25000,monthly:500,perAccount:10,maxMarketing:5000,maxAccounts:40,maxIntake:6,aprBp:2400,limit:5000,merchantBp:300,bankShareBp:150,interestShareBp:2500,chargeoffMonths:4});
 const ECONOMICS=Object.freeze({...RULES,setup:2500,monthly:100,perAccount:3,maxMarketing:1000,marketingStep:100,acquisitionUnit:200,baseWorkQuarters:.1,accountsPerWorkQuarter:200});
 // Expanded 9.40: the bank itself may issue, fund and own the card book. Same
 // customers and terms; the bank pays for purchases from protected cash, keeps
 // 2.2% of the 3% merchant discount (the processor keeps the rest), earns the
 // interest and bears provisions, disputes and charge-offs. Its own Risk and
 // Technology staff service the book, so the workload is heavier than Cedar's.
 const BANK=Object.freeze({...ECONOMICS,setup:15000,monthly:300,perAccount:4,issuerBp:220,baseWorkQuarters:.2,accountsPerWorkQuarter:80,minCapitalRatio:10});
 const bankCards=p=>p?.bankCardsVersion===1,routeOf=p=>bankCards(p)?p.cardProgram?.route||null:'partner';
 const bankRoute=p=>routeOf(p)==='bank',routeRules=route=>route==='bank'?BANK:ECONOMICS;
 const rules=p=>bankRoute(p)?BANK:p?.cardEconomicsVersion===1?ECONOMICS:RULES;
 const enabled=p=>p?.partnerCardsVersion===1,copy=x=>JSON.parse(JSON.stringify(x)),sum=xs=>xs.reduce((n,x)=>n+x,0),whole=n=>Number.isSafeInteger(n)&&n>=0;
 const exact=(o,ks)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===ks.slice().sort().join();
 const REPORT_FIELDS=['month','setup','costs','marketing','acquired','authorized','reversed','failedSettlement','purchases','refunds','disputed','disputeLoss','returnedPayments','principalPaid','interestAccrued','interestPaid','interchange','feesPaid','provision','chargeoffs','recoveries','coverageBp','suspended','contribution'];
 const defaults=p=>({action:'none',intake:p.cardProgram?.intake||false,marketing:p.cardProgram?.marketing||0,...(bankCards(p)?{route:routeOf(p)||'partner'}:{})});
 const active=p=>enabled(p)&&['active','paused'].includes(p.cardProgram.status);
 const debt=a=>a.principal+a.interest,net=a=>debt(a)-a.allowance;
 const claims=g=>enabled(g)?sum(g.players.filter(p=>!bankRoute(p)).flatMap(p=>p.cardProgram.accounts.map(net))):0;
 // The bank's own card receivables, carried net of their allowance.
 const bankReceivables=p=>bankRoute(p)?sum(p.cardProgram.accounts.map(net)):0;
 const live=p=>p.cardProgram.accounts.filter(a=>!a.closed&&!a.chargedOff);
 function initialize(g,o){
  if(o.partnerCardsVersion!==1)return;g.partnerCardsVersion=1;if(o.cardEconomicsVersion===1)g.cardEconomicsVersion=1;
  const funded=(id,amount)=>GroupAccounting.post(GroupAccounting.opening(id),'cards.opening','outside:card-market-owners',{cash:amount,equity:amount});
  g.cardMarket={version:1,lastCycle:0,openingCash:1000000,netFromLender:0,netFromBanks:0,merchant:funded('cards:merchants',200000),provider:GroupAccounting.opening('cards:processor'),prospects:[]};
  for(let i=0;i<80;i++)g.cardMarket.prospects.push({id:'cards:customer:'+i,profile:i%5===0?'stressed':i%3===0?'revolver':'full',wallet:funded('cards:customer:'+i,10000)});
  if(o.bankCardsVersion===1&&o.cardEconomicsVersion===1)g.bankCardsVersion=1;
  for(const p of g.players){p.partnerCardsVersion=1;p.cardProgram={version:1,status:'unlaunched',ready:0,intake:false,marketing:0,lastCycle:0,accounts:[],history:[]};if(g.cardEconomicsVersion===1){p.cardEconomicsVersion=1;p.cardProgram.totals={feesPaid:0,setup:0,costs:0,marketing:0};}
   if(g.bankCardsVersion===1){p.bankCardsVersion=1;p.cardProgram.route=null;p.cardProgram.totals.issuerIncome=0;}}

 }
 function policy(p,plan={}){
  const R=rules(p),q=plan.cardPolicy===undefined?defaults(p):plan.cardPolicy;
  if(!enabled(p)){if(plan.cardPolicy!==undefined)throw Error('Cards require a new Expanded 9.38 campaign.');return null;}
  if(!exact(q,['action','intake','marketing',...(bankCards(p)?['route']:[])])||bankCards(p)&&!['partner','bank'].includes(q.route)||!['none','launch','windDown'].includes(q.action)||typeof q.intake!=='boolean'||!whole(q.marketing)||q.marketing>R.maxMarketing||q.marketing%(R.marketingStep||500))throw Error('Choose a card instruction and a $0–$'+R.maxMarketing.toLocaleString()+' marketing budget in $'+(R.marketingStep||500)+' steps.');
  if(q.action==='launch'&&p.cardProgram.status!=='unlaunched')throw Error('This card program has already launched.');
  if(bankCards(p)&&routeOf(p)&&q.route!==routeOf(p))throw Error('This card program is '+(routeOf(p)==='bank'?'bank-issued':'partner-issued')+'; the route is fixed once launched.');
  if(q.action==='launch'&&q.route==='bank'&&capitalRatio(p)<BANK.minCapitalRatio)throw Error('Issuing your own cards needs a capital ratio of at least '+BANK.minCapitalRatio+'%: the card balances are your assets.');
  if(q.action==='launch'&&(!DigitalCommercial.has(p,'digitalArchitecture')||!DigitalCommercial.has(p,'relationshipPlanning')))throw Error('Complete Digital Architecture and Relationship Planning before '+(q.route==='bank'?'issuing your own cards':'licensing partner cards')+'.');
  if(q.action==='windDown'&&!['active','paused'].includes(p.cardProgram.status))throw Error('Only a deployed card program can wind down.');
  if((['unlaunched','windingDown','closed'].includes(p.cardProgram.status)||q.action==='windDown')&&(q.intake||q.marketing))throw Error('Launch first, or stop intake and marketing before winding down.');
  if(!q.intake&&q.marketing)throw Error('Marketing needs open card intake.');
  return copy(q);
 }
 // A running program the bank cannot pay for pauses at settlement instead of
 // charging, so its running costs are not a commitment then. Only states in
 // which the reserve already rejected every plan that kept the program change.
 const running=(p,q)=>active(p)&&q.action!=='windDown'?rules(p).monthly+live(p).length*rules(p).perAccount:0;
 const pauses=(p,q)=>{const cost=running(p,q);return cost>0&&!!p.accounting&&pilotSpendingLimit(p)<cost;};
 function commitment(p,plan={}){if(!enabled(p))return 0;const q=plan.cardPolicy||defaults(p),R=rules(p),cost=running(p,q);return (q.action==='launch'?(bankCards(p)?routeRules(q.route).setup:R.setup):0)+(cost&&!pauses(p,q)?cost+(q.marketing||0):0);}
 // Shared Technology and Risk tasks already serve all consumers proportionally.
 // Adding demand here consumes their existing finite dispatch, never idle time twice.
 function workload(p){return active(p)?bankRoute(p)?BANK.baseWorkQuarters+live(p).length/BANK.accountsPerWorkQuarter:p.cardEconomicsVersion===1?ECONOMICS.baseWorkQuarters+live(p).length/ECONOMICS.accountsPerWorkQuarter:1+live(p).length/20:0;}
 function coverage(p,delivery=departmentFunctionExecution(p)){
  if(!delivery)return 0;return Math.min(...['technology','risk'].map(id=>{const row=delivery.rows.find(r=>r.id===id);return row?row.workload?Math.min(1,row.delivered.served/row.workload):1:0;}));
 }
 function quote(g,p,plan={}){
  const q=policy(p,plan);if(!q)throw Error('Cards are unavailable in these rules.');
  const dq=departmentFunctionsQuote(g,p,plan),covered=coverage(p,dq.delivery),last=p.cardProgram.history.at(-1)||null;
  return {policy:q,route:bankCards(p)?q.route:'partner',pauses:pauses(p,q),status:p.cardProgram.status,ready:p.cardProgram.ready,cost:commitment(p,plan),coverage:covered,accounts:live(p).length,principal:sum(p.cardProgram.accounts.map(a=>a.principal)),interest:sum(p.cardProgram.accounts.map(a=>a.interest)),allowance:sum(p.cardProgram.accounts.map(a=>a.allowance)),chargedOff:sum(p.cardProgram.accounts.map(a=>a.chargedOff)),last};
 }
 function validatePlan(g,p,plan){policy(p,plan);}
 function payer(g,p,amount,source){
  if(!amount)return;const m=g.cardMarket;
  p.accounting=AccountingPrototype.post(p.accounting,source,{cash:-amount,equity:-amount},-amount);syncAccounts(p);
  m.provider=GroupAccounting.post(m.provider,source,p.id,{cash:amount,equity:amount},amount);m.netFromBanks+=amount;
 }
 function bankFee(g,p,amount,r){
  if(!amount)return;const m=g.cardMarket;
  g.companyControlMarket.lender=GroupAccounting.post(g.companyControlMarket.lender,'cards.bankShare',p.id,{cash:-amount,equity:-amount},-amount);
  p.accounting=AccountingPrototype.post(p.accounting,'cards.compensation',{cash:amount,equity:amount},amount);syncAccounts(p);r.feesPaid+=amount;
  m.netFromLender+=amount;m.netFromBanks-=amount;
 }
 // The card issuer's side of each posting. Cedar's ledger for partner cards; the
 // bank's own book for bank-issued cards, whose card cash moves count as bank flows.
 const issuerId=p=>bankRoute(p)?p.id:OutsideFunding.ID;
 function issuerPost(g,p,source,id,changes,earnings=0,cashFlow=0){
  if(bankRoute(p)){
   const book={};for(const [k,v] of Object.entries(changes))book[k==='businessAssets'?'receivables':k]=v;
   p.accounting=AccountingPrototype.post(p.accounting,source,book,earnings);syncAccounts(p);g.cardMarket.netFromBanks-=cashFlow;
  }else{g.companyControlMarket.lender=GroupAccounting.post(g.companyControlMarket.lender,source,id,changes,earnings);g.cardMarket.netFromLender-=cashFlow;}
 }
 function reserve(g,p,a,amount,r){
  const delta=amount-a.allowance;if(!delta)return;
  issuerPost(g,p,'cards.allowance',a.id,{businessAssets:-delta,equity:-delta},-delta);a.allowance=amount;r.provision+=delta;
 }
 function collect(g,p,a,amount,r,recovery=false){
  amount=Math.min(amount,a.wallet.accounts.cash,recovery?a.chargedOff:debt(a));if(!amount)return 0;
  if(!recovery)reserve(g,p,a,0,r);
  const interest=recovery?0:Math.min(amount,a.interest),principal=amount-interest;
  a.wallet=GroupAccounting.post(a.wallet,recovery?'cards.recovery':'cards.payment',issuerId(p),{cash:-amount,debt:-amount});
  issuerPost(g,p,recovery?'cards.recovery':'cards.payment',a.id,recovery?{cash:amount,equity:amount}:{cash:amount,businessAssets:-amount},recovery?amount:0,amount);
  if(recovery){a.chargedOff-=amount;r.recoveries+=amount;}else{a.interest-=interest;a.principal-=principal;r.interestPaid+=interest;r.principalPaid+=principal;if(!bankRoute(p))bankFee(g,p,Math.floor(interest*RULES.interestShareBp/10000),r);}
  return amount;
 }
 function merchantCredit(g,p,a,amount,r){
  amount=Math.min(amount,a.principal,g.cardMarket.merchant.accounts.cash);if(!amount)return 0;
  reserve(g,p,a,0,r);
  g.cardMarket.merchant=GroupAccounting.post(g.cardMarket.merchant,'cards.refund',a.id,{cash:-amount,equity:-amount},-amount);
  issuerPost(g,p,'cards.refund',a.id,{cash:amount,businessAssets:-amount},0,amount);
  a.wallet=GroupAccounting.post(a.wallet,'cards.refund','cards:merchants',{debt:-amount,equity:amount},amount);a.principal-=amount;r.refunds+=amount;return amount;
 }
 function settleAccount(g,p,a,r,canSpend,serviced,fundable){
  if(a.closed)return;
  const m=g.cardMarket,c=g.cycle,opening=debt(a),due=Math.min(a.statement,opening),minimum=Math.min(due,Math.max(25,Math.ceil(due*.05)));
  // Merchants' recycled sales receipts fund wages. No monthly money endowment.
  const wage=Math.min(m.merchant.accounts.cash,a.profile==='stressed'&&c%12>=6?100:1500);
  if(wage){m.merchant=GroupAccounting.post(m.merchant,'cards.wages',a.id,{cash:-wage,equity:-wage},-wage);a.wallet=GroupAccounting.post(a.wallet,'cards.wages','cards:merchants',{cash:wage,equity:wage},wage);}
  const bills=Math.min(1200,a.wallet.accounts.cash);if(bills){a.wallet=GroupAccounting.post(a.wallet,'cards.livingCosts','cards:merchants',{cash:-bills,equity:-bills},-bills);m.merchant=GroupAccounting.post(m.merchant,'cards.livingCosts',a.id,{cash:bills,equity:bills},bills);}
  if(a.dispute){const refunded=merchantCredit(g,p,a,a.dispute,r);if(refunded<a.dispute){const loss=Math.min(a.principal,a.dispute-refunded);reserve(g,p,a,0,r);if(loss){issuerPost(g,p,'cards.disputeLoss',a.id,{businessAssets:-loss,equity:-loss},-loss);a.wallet=GroupAccounting.post(a.wallet,'cards.disputeCredit',issuerId(p),{debt:-loss,equity:loss},loss);a.principal-=loss;r.disputeLoss+=loss;}}a.dispute=0;}
  if(a.chargedOff){collect(g,p,a,Math.min(100,Math.max(0,a.wallet.accounts.cash-1500)),r,true);a.closed=a.chargedOff===0;a.statement=0;return;}
  const currentDue=Math.min(due,debt(a)),wanted=a.profile==='full'?currentDue:a.profile==='revolver'?Math.max(minimum,Math.ceil(currentDue*.15)):minimum;
  // An attempted debit can be returned; no cash or loan posting until cleared.
  const returned=c%17===Number(a.id.split(':').at(-1))%17&&wanted>0;
  const payment=returned?0:collect(g,p,a,Math.min(wanted,Math.max(0,a.wallet.accounts.cash-(a.profile==='stressed'?2500:300))),r);
  if(returned)r.returnedPayments++;a.grace=payment>=currentDue;a.late=payment>=Math.min(minimum,currentDue)?0:a.late+1;
  if(a.late>=RULES.chargeoffMonths){reserve(g,p,a,debt(a),r);a.chargedOff=debt(a);r.chargeoffs+=a.chargedOff;a.principal=0;a.interest=0;a.allowance=0;a.statement=0;return;}
  // Monthly convention: 24% / 12 on unpaid opening principal only. No interest
  // on interest, current purchases or disputes; suspend accrual at two misses.
  if(!a.grace&&a.late<2){const interest=Math.ceil(a.principal*RULES.aprBp/120000);if(interest){a.interest+=interest;a.wallet=GroupAccounting.post(a.wallet,'cards.interest',issuerId(p),{debt:interest,equity:-interest},-interest);issuerPost(g,p,'cards.interest',a.id,{businessAssets:interest,equity:interest},interest);r.interestAccrued+=interest;}}
  if(canSpend&&serviced&&!a.late&&!a.closed){
   const wantedPurchase=1200+(Number(a.id.split(':').at(-1))%4)*300,amount=Math.min(wantedPurchase,Math.max(0,a.limit-debt(a))),reversed=(c+Number(a.id.split(':').at(-1)))%19===0;
   a.hold=amount;r.authorized+=amount;
   if(reversed){r.reversed+=amount;}else if(amount&&(bankRoute(p)?fundable(amount):g.companyControlMarket.lender.accounts.cash>=amount)){
    const fee=Math.floor(amount*RULES.merchantBp/10000);
    if(bankRoute(p)){
     // Your bank pays the merchant from protected cash and owns the balance.
     issuerPost(g,p,'cards.purchase',a.id,{cash:-amount,businessAssets:amount},0,-amount);
     m.merchant=GroupAccounting.post(m.merchant,'cards.purchase',a.id,{cash:amount,equity:amount},amount);
     a.wallet=GroupAccounting.post(a.wallet,'cards.purchase','cards:merchants',{debt:amount,equity:-amount},-amount);a.principal+=amount;r.purchases+=amount;
     // Of the merchant discount, the issuer keeps its interchange; the processor the rest.
     const kept=Math.floor(amount*BANK.issuerBp/10000),processing=fee-kept;
     m.merchant=GroupAccounting.post(m.merchant,'cards.interchange',p.id,{cash:-fee,equity:-fee},-fee);
     issuerPost(g,p,'cards.interchange','cards:merchants',{cash:kept,equity:kept},kept,kept);r.interchange+=kept;
     if(processing)m.provider=GroupAccounting.post(m.provider,'cards.interchange','cards:merchants',{cash:processing,equity:processing},processing);
    }else{
    g.companyControlMarket.lender=GroupAccounting.post(g.companyControlMarket.lender,'cards.purchase',a.id,{cash:-amount,businessAssets:amount});m.netFromLender+=amount;
    m.merchant=GroupAccounting.post(m.merchant,'cards.purchase',a.id,{cash:amount,equity:amount},amount);
    a.wallet=GroupAccounting.post(a.wallet,'cards.purchase','cards:merchants',{debt:amount,equity:-amount},-amount);a.principal+=amount;r.purchases+=amount;
    m.merchant=GroupAccounting.post(m.merchant,'cards.interchange',OutsideFunding.ID,{cash:-fee,equity:-fee},-fee);
    g.companyControlMarket.lender=GroupAccounting.post(g.companyControlMarket.lender,'cards.interchange','cards:merchants',{cash:fee,equity:fee},fee);m.netFromLender-=fee;r.interchange+=fee;
    bankFee(g,p,Math.floor(amount*RULES.bankShareBp/10000),r);
    }
    if((c+Number(a.id.split(':').at(-1)))%23===0){a.dispute=Math.min(200,amount);r.disputed+=a.dispute;}
    else if((c+Number(a.id.split(':').at(-1)))%13===0)merchantCredit(g,p,a,Math.min(100,amount),r);
   }else{r.failedSettlement+=amount;}
   a.hold=0;
  }
  reserve(g,p,a,Math.ceil(debt(a)*([0,.1,.5,1][Math.min(3,a.late)])),r);
  a.statement=Math.max(0,debt(a)-a.dispute);a.due=c+1;
  if(p.cardProgram.status==='windingDown'&&!debt(a)){a.closed=true;a.statement=0;}
 }
 function settle(g,plans){
  if(!enabled(g))return [];const m=g.cardMarket;if(m.lastCycle!==g.cycle-1)throw Error('Cards must settle exactly once per month.');const lines=[];
  const order=g.players.map((_,i)=>i).sort((a,b)=>((a+g.cycle)%2)-((b+g.cycle)%2));
  for(const i of order){const p=g.players[i],b=p.cardProgram,R=rules(p),q=policy(p,plans[i]),r={month:g.cycle,setup:0,costs:0,marketing:0,acquired:0,authorized:0,reversed:0,failedSettlement:0,purchases:0,refunds:0,disputed:0,disputeLoss:0,returnedPayments:0,principalPaid:0,interestAccrued:0,interestPaid:0,interchange:0,feesPaid:0,provision:0,chargeoffs:0,recoveries:0,coverageBp:Math.floor(coverage(p)*10000),suspended:false,...(bankCards(p)?{issuerIncome:0}:{})};
   const available=()=>Math.max(0,Math.min(pilotSpendingLimit(p),p.stats.cash-Math.ceil(p.stats.deposits*.02)-p.accounting.accounts.payables-(plans[i].departmentPolicy?.reserve||0)));
   if(q.action==='launch'){
    const L=bankCards(p)?routeRules(q.route):R,own=bankCards(p)&&q.route==='bank';
    if(own&&capitalRatio(p)<BANK.minCapitalRatio)lines.push(p.name+': card launch cancelled without charge; the capital ratio is below '+BANK.minCapitalRatio+'%.');
    else if(available()>=L.setup){payer(g,p,L.setup,own?'cards.platform':'cards.license');r.setup=L.setup;b.status='active';b.ready=g.cycle+1;if(bankCards(p))b.route=q.route;lines.push(own?p.name+' built its own card-issuing platform. Cards open for month '+b.ready+'.':p.name+' licensed Cedar Reserve partner cards. Deployment completes for month '+b.ready+'.');}
    else lines.push(p.name+': card launch cancelled without charge; protected cash is unavailable.');
   }
   if(q.action==='windDown'){b.status='windingDown';b.intake=false;b.marketing=0;lines.push(p.name+(bankRoute(p)?' began card wind-down. It keeps collecting its own card balances; no new purchases.':' began card wind-down. Cedar continues collecting existing debts; no new purchases.'));}
   let canSpend=false;
   if(active(p)&&g.cycle>=b.ready){
    b.intake=q.intake;b.marketing=q.marketing;const running=R.monthly+live(p).length*R.perAccount;
    if(available()>=running){payer(g,p,running,'cards.delivery');r.costs=running;canSpend=true;b.status='active';if(q.marketing&&available()>=q.marketing){payer(g,p,q.marketing,'cards.acquisition');r.marketing=q.marketing;}}
    else {b.status='paused';r.suspended=true;}
   }
   // Cedar's fixed servicing contract handles the bounded book's collections.
   // Local risk/technology coverage constrains purchases and new applications.
   // Bank-issued purchases draw on the same protected cash as every other outlay.
   const covered=Math.floor(live(p).length*r.coverageBp/10000),fundable=amount=>available()>=amount;let served=0;
   for(const a of b.accounts){const coveredAccount=!a.closed&&!a.chargedOff&&served++<covered;settleAccount(g,p,a,r,canSpend,coveredAccount,fundable);}
   if(canSpend&&b.intake&&r.coverageBp>=5000&&capitalRatio(p)>=(bankRoute(p)?BANK.minCapitalRatio:8)){
    const count=Math.min(RULES.maxAccounts-live(p).length,Math.floor((1+r.marketing/(R.acquisitionUnit||1000))*r.coverageBp/10000),RULES.maxIntake);
    for(let j=0;j<count;j++){const index=m.prospects.findIndex(x=>x.wallet.accounts.cash>=2500);if(index<0)break;const x=m.prospects.splice(index,1)[0];b.accounts.push({...x,limit:RULES.limit,principal:0,interest:0,allowance:0,chargedOff:0,statement:0,due:g.cycle+1,late:0,grace:true,dispute:0,hold:0,closed:false,opened:g.cycle});r.acquired++;}
   }
   if(b.status==='windingDown'&&b.accounts.every(a=>a.closed))b.status='closed';
   // The issuer's card earnings: interest earned, its interchange and recoveries,
   // less provisions (which already include charge-offs) and dispute losses.
   if(bankCards(p))r.issuerIncome=bankRoute(p)?r.interestAccrued+r.interchange+r.recoveries-r.provision-r.disputeLoss:0;
   r.contribution=(bankRoute(p)?r.issuerIncome:r.feesPaid)-r.setup-r.costs-r.marketing;
   if(b.totals)for(const key of Object.keys(b.totals))b.totals[key]+=r[key];
   b.lastCycle=g.cycle;b.history.push(r);if(b.history.length>12)b.history.shift();
   if(b.status!=='unlaunched')lines.push(p.name+' cards: '+r.acquired+' new accounts, $'+r.purchases.toLocaleString()+(bankRoute(p)?' bank-funded purchases; $'+r.issuerIncome.toLocaleString()+' card income after losses, $':' partner-funded purchases; $'+r.feesPaid.toLocaleString()+' fees received, $')+(r.setup+r.costs+r.marketing).toLocaleString()+' direct costs.'+(r.suspended?' New activity paused for insufficient protected cash.':''));
  }
  m.lastCycle=g.cycle;return lines;
 }
 function project(g,out,index){
  if(!enabled(g))return;out.partnerCardsVersion=1;out.me.partnerCardsVersion=1;if(g.cardEconomicsVersion===1){out.cardEconomicsVersion=1;out.me.cardEconomicsVersion=1;}if(g.bankCardsVersion===1){out.bankCardsVersion=1;out.me.bankCardsVersion=1;}out.me.cardProgram=copy(g.players[index].cardProgram);
  if(g.players[index].submitted?.cardPolicy)out.me.pendingCardPolicy=copy(g.players[index].submitted.cardPolicy);
  for(const[id,q]of Object.entries(out.lastPlans||{}))if(id!==out.me.id)delete q.cardPolicy;
 }
 function validate(s,context){
  const on=enabled(s),owners=context==='game'?s.players:[s.me],fail=()=>{throw Error('Invalid partner-card books or rule boundary.');},month=s.gameOver?s.cycle:s.cycle-1;
  if(s.partnerCardsVersion!==undefined&&!on||['9.38','9.39','9.40'].includes(s.version)&&!on||s.cardEconomicsVersion!==undefined&&s.cardEconomicsVersion!==1||s.version==='9.39'&&s.cardEconomicsVersion!==1||s.cardEconomicsVersion===1&&!on||s.bankCardsVersion!==undefined&&s.bankCardsVersion!==1||s.version==='9.40'&&s.bankCardsVersion!==1||s.bankCardsVersion===1&&s.cardEconomicsVersion!==1)fail();
  if(!on){if(s.cardMarket!==undefined||s.rival?.cardProgram!==undefined||owners.some(p=>p.cardProgram!==undefined||p.cardEconomicsVersion!==undefined||p.bankCardsVersion!==undefined||p.partnerCardsVersion!==undefined||p.submitted?.cardPolicy!==undefined||p.pendingCardPolicy!==undefined))fail();return;}
  const ids=new Set();let cash=0;
  for(const p of owners){const b=p.cardProgram,R=rules(p);
   if(p.cardEconomicsVersion!==s.cardEconomicsVersion||p.bankCardsVersion!==s.bankCardsVersion)fail();
   if(s.bankCardsVersion===1&&(b?.route!==null&&!['partner','bank'].includes(b?.route)||(b?.status==='unlaunched')!==(b?.route===null)))fail();
   // Bank-issued balances sit in the bank's own receivables, net of their allowance.
   if(bankRoute(p)&&p.accounting&&bankReceivables(p)>p.accounting.accounts.receivables)fail();
   if(p.partnerCardsVersion!==1||!exact(b,['version','status','ready','intake','marketing','lastCycle','accounts','history',...(s.cardEconomicsVersion===1?['totals']:[]),...(s.bankCardsVersion===1?['route']:[])])||b.version!==1||!['unlaunched','active','paused','windingDown','closed'].includes(b.status)||b.lastCycle!==month||!whole(b.ready)||b.ready>month+1||typeof b.intake!=='boolean'||!whole(b.marketing)||b.marketing>R.maxMarketing||b.marketing%(R.marketingStep||500)||!Array.isArray(b.accounts)||b.accounts.length>80||!Array.isArray(b.history)||b.history.length!==Math.min(12,month))fail();
   if(b.status==='unlaunched'&&(b.ready||b.accounts.length||b.intake||b.marketing)||b.status!=='unlaunched'&&!b.ready)fail();
   for(const a of b.accounts){
    if(!exact(a,['id','profile','wallet','limit','principal','interest','allowance','chargedOff','statement','due','late','grace','dispute','hold','closed','opened'])||ids.has(a.id)||!/^cards:customer:\d+$/.test(a.id)||!['stressed','revolver','full'].includes(a.profile)||a.wallet.entityId!==a.id||a.limit!==RULES.limit||!['principal','interest','allowance','chargedOff','statement','due','late','dispute','hold','opened'].every(k=>whole(a[k]))||typeof a.grace!=='boolean'||typeof a.closed!=='boolean'||a.hold||a.opened<1||a.opened>month||a.allowance>debt(a)||a.dispute>a.principal||a.statement>debt(a)||a.wallet.accounts.debt!==debt(a)+a.chargedOff||a.chargedOff&&debt(a)||a.closed&&(debt(a)||a.chargedOff))fail();
    GroupAccounting.validate(a.wallet);ids.add(a.id);cash+=a.wallet.accounts.cash;
   }
   if(['windingDown','closed'].includes(b.status)&&(b.intake||b.marketing)||b.status==='closed'&&b.accounts.some(a=>!a.closed)||live(p).length>RULES.maxAccounts)fail();
   for(let j=0;j<b.history.length;j++){const r=b.history[j];if(!exact(r,[...REPORT_FIELDS,...(s.bankCardsVersion===1?['issuerIncome']:[])])||r.month!==month-b.history.length+1+j||typeof r.suspended!=='boolean'||Object.entries(r).some(([k,v])=>!['suspended','provision','contribution','issuerIncome'].includes(k)&&!whole(v))||!Number.isSafeInteger(r.provision)||s.bankCardsVersion===1&&(!Number.isSafeInteger(r.issuerIncome)||!bankRoute(p)&&r.issuerIncome)||r.contribution!==(bankRoute(p)?r.issuerIncome:r.feesPaid)-r.setup-r.costs-r.marketing||r.coverageBp>10000||r.purchases+r.reversed+r.failedSettlement!==r.authorized)fail();}
   if(s.cardEconomicsVersion===1&&(!exact(b.totals,['feesPaid','setup','costs','marketing',...(s.bankCardsVersion===1?['issuerIncome']:[])])||Object.entries(b.totals).some(([k,v])=>k==='issuerIncome'?!Number.isSafeInteger(v):!whole(v)||v<sum(b.history.map(r=>r[k])))||b.totals.setup!==(b.ready?R.setup:0)))fail();
   if(context==='game'&&p.submitted)policy(p,p.submitted);
   if(p.pendingCardPolicy!==undefined){if(context!=='view'||!p.submitted)fail();policy(p,{cardPolicy:p.pendingCardPolicy});}
  }
  if(context==='game'){
   const m=s.cardMarket;if(!exact(m,['version','lastCycle','openingCash','netFromLender','netFromBanks','merchant','provider','prospects'])||m.version!==1||m.lastCycle!==month||m.openingCash!==1000000||!Number.isSafeInteger(m.netFromBanks)||!Number.isSafeInteger(m.netFromLender)||!Array.isArray(m.prospects))fail();
   for(const a of m.prospects){if(!exact(a,['id','profile','wallet'])||ids.has(a.id)||!/^cards:customer:\d+$/.test(a.id)||!['full','revolver','stressed'].includes(a.profile)||a.wallet.entityId!==a.id||a.wallet.accounts.debt)fail();GroupAccounting.validate(a.wallet);ids.add(a.id);cash+=a.wallet.accounts.cash;}
   GroupAccounting.validate(m.merchant);GroupAccounting.validate(m.provider);cash+=m.merchant.accounts.cash+m.provider.accounts.cash;
   if(ids.size!==80||[...ids].some(id=>Number(id.split(':').at(-1))>=80)||m.merchant.entityId!=='cards:merchants'||m.provider.entityId!=='cards:processor'||cash!==m.openingCash+m.netFromLender+m.netFromBanks)fail();
  }else if(s.cardMarket!==undefined)fail();
  if(s.rival?.bankCardsVersion!==undefined||s.rival?.cardEconomicsVersion!==undefined||s.rival?.cardProgram!==undefined||s.rival?.partnerCardsVersion!==undefined||s.rival?.pendingCardPolicy!==undefined||Object.entries(s.lastPlans||{}).some(([id,p])=>context==='view'&&id!==s.me.id&&p.cardPolicy!==undefined))fail();
 }
 function bot(g,i,plan){
  const p=g.players[i];if(!enabled(p))return plan;plan.cardPolicy=defaults(p);
  if(p.cardProgram.status==='unlaunched'&&DigitalCommercial.has(p,'digitalArchitecture')&&DigitalCommercial.has(p,'relationshipPlanning')&&p.stats.cash>800000){plan.cardPolicy.action='launch';
   // 9.40: a well-capitalised bank with spare cash issues its own cards.
   if(bankCards(p))plan.cardPolicy.route=capitalRatio(p)>=14&&p.stats.cash>1200000?'bank':'partner';
   // Never stage a launch the capital reserve would reject; such a plan could not be submitted.
   const setup=bankCards(p)?routeRules(plan.cardPolicy.route).setup:rules(p).setup;
   if(p.accounting&&pilotSpendingLimit(p)<setup)plan.cardPolicy=defaults(p);}
  if(active(p)){plan.cardPolicy.intake=p.stats.cash>400000;plan.cardPolicy.marketing=plan.cardPolicy.intake?(p.cardEconomicsVersion===1?(live(p).length<25&&coverage(p,departmentFunctionsQuote(g,p,plan).delivery)>=.8?200:0):1000):0;}
  return plan;
 }
 function performance(p){
  const b=p.cardProgram,r=b.history.at(-1),totals=b.totals||null;
  if(!r)return null;
  const earned=x=>bankRoute(p)?x.issuerIncome:x.feesPaid;
  const contribution=totals?earned(totals)-totals.setup-totals.costs-totals.marketing:null;
  const operating=earned(r)-r.costs-r.marketing,unrecovered=contribution===null?null:Math.max(0,-contribution);
  return {month:r.month,route:routeOf(p),launched:b.ready>0,operating,contribution,unrecovered,paybackMonths:unrecovered!==null&&operating>0?Math.ceil(unrecovered/operating):null,live:live(p).length,remaining:Math.max(0,rules(p).maxAccounts-live(p).length),unconvertedMarketing:r.marketing>0&&r.acquired===0,acquisitionCost:r.acquired?Math.ceil(r.marketing/r.acquired):null,totals:totals?copy(totals):null};
 }
 return Object.freeze({RULES,ECONOMICS,BANK,routeOf,bankReceivables,rules,performance,enabled,defaults,claims,initialize,policy,commitment,workload,coverage,quote,validatePlan,settle,project,validate,bot});
})();
